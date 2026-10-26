-- 20261026005907 c4_37_reprise_apres_refus
-- Source : dépôt : 679f0db39af3c073f4e20cea60c64ec912653c51 omega/modules/offload/migrations/c4_37_reprise_apres_refus.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_37_reprise_apres_refus.sql @ 679f0db39af3c073f4e20cea60c64ec912653c51 ; c4_08 cité comme test : ignoré.
-- ═══ omega/modules/offload/migrations/c4_37_reprise_apres_refus.sql @ 679f0db39af3c073f4e20cea60c64ec912653c51
-- c4_37 — OFFLOAD : la reprise après refus (session C4, 25/10/2026 — décision de Teo du 23/10, socle 19az ; sur le
-- modèle de FILED a4_86 et de CASHD c2_41).
--
-- Quand un valideur refuse un message d'OFFLOAD avec une consigne (son commentaire), le socle (19az) la dépose dans
-- private.reprises. OFFLOAD la traite au plus tard dans la minute (cron offload-reprises) :
--   · ce qu'il reprend : le message d'une reprise de contact (rang 1 ou relance) et la relance de retrait d'une
--     affaire en plan (rang 1 ou 2) ; une autre demande d'OFFLOAD (échéance d'un contrat…) → reprise impossible ;
--   · sans consigne, ou consigne « doublon / déjà relancé », ou si l'objet a avancé entre-temps (réponse, commande,
--     compte arrêté, affaire retirée ou décidée par une personne) → reprise impossible tout de suite ;
--   · sinon il réécrit le message sur les données du jour (fiche du compte, réglages, règles du client) et le compare
--     au message refusé (objet, corps, destinataire). Si quelque chose change, il propose UNE demande liée à la refusée,
--     au nom du moteur (private.proposer_reprise, jamais au nom du valideur), avec la liste des corrections ; un nouvel
--     envoi lui est adossé et la reprise ou l'affaire repasse « à valider » sur ce nouvel envoi ;
--   · rien n'a changé : la reprise attend qu'une personne corrige la fiche ou les réglages, au plus 24 heures, puis
--     « reprise impossible : aucune correction », avec la consigne, au journal de la refusée et en avis au client.
-- Rien ne part sans une nouvelle validation humaine ; une reprise refusée ne relance rien (socle). L'événement du
-- message refusé, s'il arrive après la reprise, n'a plus d'effet : il ne porte plus sur le message en cours.
-- Sans le lot 19az, rien n'est fait (rejouer c4_37 après 19az pour poser le cron).
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public sur toute fonction nouvelle.

-- La suite d'un envoi de retrait : un envoi qui n'est plus celui de l'affaire (remplacé par une reprise) est sans effet.
create or replace function private.offload_suivre_envoi_affaire(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
begin
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into a from public.offload_affaires where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or a.id is null or a.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  -- c4_37 : le message refusé a été remplacé par sa reprise ; son refus ne décide plus de l'affaire.
  if e.id is distinct from a.envoi1_id and e.id is distinct from a.envoi2_id then
    return jsonb_build_object('statut', 'sans_effet', 'affaire', a.statut);
  end if;
  if v_issue = 'envoye' then
    perform private.journaliser_module(a.client_id, 'offload', 'offload.message_retrait_envoye', 'offload_affaires', a.id::text,
      jsonb_build_object('envoi', e.id, 'rang', case when a.envoi2_id = e.id then 2 else 1 end, 'mode', e.mode), a.entite_id);
    return jsonb_build_object('statut', 'envoye');
  elsif v_issue = 'refuse' then
    update public.offload_affaires set statut = 'decision', maj_le = now(), motif = 'Relance de retrait refusée en validation : à décider.'
     where id = a.id and statut in ('relancee_1', 'relancee_2');
    return jsonb_build_object('statut', 'decision');
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') and a.statut in ('relancee_1', 'relancee_2') then
    -- Le message n'est pas parti : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    select a.client_id, a.entite_id, a.compte_id, 'appel',
           left(format('Prévenir %s : %s %s en attente de retrait', c.nom, a.type, a.reference), 200),
           left(format('Le message de retrait n''est pas parti (%s%s).%s', v_issue, coalesce(', ' || e.verrou, ''),
                       coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
           c.commercial, (now() at time zone private.offload_fuseau(e.client_id))::date
    from public.offload_comptes c where c.id = a.compte_id;
    return jsonb_build_object('statut', v_issue);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- Déclarer la reprise impossible, et appliquer le refus à l'objet (idempotent : l'événement du refus a pu le faire).
create or replace function private.offload_reprise_refus_impossible(p_refusee uuid, p_objet_type text, p_objet uuid, p_envoi uuid, p_motif text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reprise_impossible(p_refusee, p_motif);
  if p_objet_type = 'offload_reprises' then
    perform private.offload_clore(p_objet, 'refusee', 'Message refusé en validation ; reprise impossible : ' || p_motif);
  elsif p_objet_type = 'offload_affaires' then
    update public.offload_affaires set statut = 'decision', maj_le = now(),
           motif = left('Relance de retrait refusée en validation ; reprise impossible : ' || p_motif || ' À décider.', 500)
     where id = p_objet and statut in ('relancee_1', 'relancee_2', 'decision') and decide_le is null
       and p_envoi is not null and p_envoi in (envoi1_id, envoi2_id);
  end if;
  return 'impossible';
end $function$;

-- Traiter une reprise : rend 'proposee', 'impossible', 'attente' (rien n'a encore changé) ou null (pas OFFLOAD).
create or replace function private.offload_reprendre_refus(p_refusee uuid, p_consigne jsonb, p_delai interval default interval '24 hours')
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.demandes_validation;
  x private.reprises;
  e public.envois;
  r public.offload_reprises;
  a public.offload_affaires;
  c public.offload_comptes;
  v_type text;
  v_objet uuid;
  v_rang integer;
  v_consigne text := nullif(btrim(concat_ws(' · ', p_consigne ->> 'motif', p_consigne ->> 'commentaire')), '');
  v_msg jsonb;
  v_corr jsonb := '[]'::jsonb;
  v_adresse text;
  v_nom text;
  v_nouvelle uuid;
  v_envoi uuid;
  v_ne public.envois;
  v_echu boolean;
begin
  select * into d from public.demandes_validation where id = p_refusee;
  if d.id is null or d.module <> 'offload' then
    return null;
  end if;
  select * into x from private.reprises where demande_id = p_refusee;
  v_echu := coalesce(x.cree_le, now()) <= now() - p_delai;
  v_type := d.objet_type;
  if v_type not in ('offload_reprises', 'offload_affaires') then
    perform private.reprise_impossible(p_refusee, 'OFFLOAD ne repropose que ses messages de reprise et ses relances de retrait');
    return 'impossible';
  end if;
  v_objet := d.objet_id::uuid;
  -- Le message refusé : celui de la demande (validation de l'envoi, ou lecture d'un message retenu).
  select * into e from public.envois y
   where y.client_id = d.client_id and (y.demande_id = d.id or y.id::text = d.payload ->> 'envoi')
   order by y.cree_le desc limit 1;
  if e.id is null then
    perform private.reprise_impossible(p_refusee, 'le message refusé est introuvable');
    return 'impossible';
  end if;
  if v_consigne is null then
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      'refusé sans consigne : OFFLOAD ne repropose un message que si le refus dit quoi corriger');
  end if;
  if v_consigne ~* '(doublon|d[ée]j[àa] (relanc|contact|envoy|écrit|ecrit|appel))' then
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      'refusé comme doublon : OFFLOAD ne repropose pas ce message (consigne : ' || v_consigne || ')');
  end if;

  -- L'objet n'a pas avancé entre-temps.
  if v_type = 'offload_reprises' then
    select * into r from public.offload_reprises where id = v_objet for update;
    v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
    if r.id is null or v_rang is null then
      perform private.reprise_impossible(p_refusee, 'le message refusé n''est plus celui de la reprise');
      return 'impossible';
    end if;
    if not (r.statut in ('a_valider', 'relance_a_valider') or (r.statut = 'close' and r.issue = 'refusee')) then
      return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
        format('la reprise a avancé entre-temps (%s)', replace(coalesce(r.issue, r.statut), '_', ' ')));
    end if;
    if exists (select 1 from public.offload_reprises y where y.compte_id = r.compte_id and y.id <> r.id
                 and y.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')) then
      return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id, 'une autre reprise du compte est ouverte');
    end if;
    select * into c from public.offload_comptes where id = r.compte_id;
  else
    select * into a from public.offload_affaires where id = v_objet for update;
    v_rang := case when a.envoi1_id = e.id then 1 when a.envoi2_id = e.id then 2 end;
    if a.id is null or v_rang is null then
      perform private.reprise_impossible(p_refusee, 'le message refusé n''est plus celui de l''affaire');
      return 'impossible';
    end if;
    if a.statut not in ('relancee_1', 'relancee_2', 'decision') or a.decide_le is not null then
      return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
        format('l''affaire a avancé entre-temps (%s)', replace(a.statut, '_', ' ')));
    end if;
    select * into c from public.offload_comptes where id = a.compte_id;
  end if;
  if c.id is null or c.statut <> 'suivi' or c.efface_le is not null then
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      format('le compte n''est plus suivi (%s)', coalesce(c.statut, 'introuvable')));
  end if;
  v_adresse := nullif(btrim(c.email), '');
  if v_adresse is null then
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      'le compte n''a plus de courriel : une personne le prévient');
  end if;
  if private.offload_suspendu(d.client_id) or private.offload_essai_contre_reel(d.client_id) then
    if v_echu then
      return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id, 'OFFLOAD est arrêté depuis le refus');
    end if;
    return 'attente';
  end if;

  -- Le message sur les données du jour, comparé au refusé.
  if v_type = 'offload_reprises' then
    v_msg := private.offload_regles_appliquer(d.client_id, private.offload_message(c.id, v_rang, r.envoye1_le, null));
  else
    v_msg := private.offload_regles_appliquer(d.client_id, private.offload_message_retrait(a.id, v_rang));
  end if;
  if v_msg ->> 'retenu' is not null then
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      format('le message réécrit est retenu par votre règle « %s »', v_msg ->> 'retenu'));
  end if;
  v_nom := coalesce(c.contact, c.nom);
  if v_adresse is distinct from e.destinataire_adresse then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'destinataire', 'avant', e.destinataire_adresse, 'apres', v_adresse));
  end if;
  if (v_msg ->> 'sujet') is distinct from e.sujet then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'sujet', 'avant', e.sujet, 'apres', v_msg ->> 'sujet'));
  end if;
  if (v_msg ->> 'corps') is distinct from e.corps then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'corps', 'avant', e.corps, 'apres', v_msg ->> 'corps'));
  end if;
  if jsonb_array_length(v_corr) = 0 then
    if not v_echu then
      return 'attente';
    end if;
    return private.offload_reprise_refus_impossible(p_refusee, v_type, v_objet, e.id,
      'aucune correction en 24 heures — consigne : ' || v_consigne
      || '. Corrigez la fiche du compte (contact, courriel) ou vos réglages (signature, règles) : le message suivant en tiendra compte');
  end if;

  -- Une demande liée à la refusée, au nom du moteur, et le message corrigé qui lui est adossé.
  v_nouvelle := private.proposer_reprise(p_refusee, null,
    (d.payload - 'envoi') || jsonb_build_object('sujet', v_msg ->> 'sujet', 'corps', v_msg ->> 'corps',
                                                'destinataire', jsonb_build_object('nom', v_nom, 'adresse', v_adresse),
                                                'envoi_refuse', e.id),
    v_corr, null);
  perform private.offload_assurer_consentement(c.id);
  v_envoi := private.preparer_envoi(d.client_id, 'offload', v_type, v_objet::text, 'email',
    jsonb_build_object('adresse', v_adresse, 'nom', v_nom, 'ref', c.ref,
                       'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
    null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
    case v_type when 'offload_reprises' then 'offload:reprise:' else 'offload:affaire:' end || v_objet::text || ':' || v_rang || ':reprise',
    d.entite_id, false, false, null::timestamptz, jsonb_build_object('demande', v_nouvelle));
  select * into v_ne from public.envois where id = v_envoi;
  if v_ne.statut = 'bloque' then
    -- Le socle arrête le message corrigé (opposition, consentement…) : la demande n'a plus d'objet.
    update public.demandes_validation set statut = 'annulee' where id = v_nouvelle and statut = 'en_attente';
    if v_type = 'offload_reprises' then
      perform private.offload_clore(r.id, 'refusee', format('Message refusé ; sa reprise est arrêtée par le socle (%s).', v_ne.verrou));
    else
      update public.offload_affaires set statut = 'decision', maj_le = now(),
             motif = left(format('Relance de retrait refusée ; sa reprise est arrêtée par le socle (%s). À décider.', v_ne.verrou), 500)
       where id = a.id;
    end if;
  elsif v_type = 'offload_reprises' then
    update public.offload_reprises
       set statut = case v_rang when 1 then 'a_valider' else 'relance_a_valider' end, issue = null, close_le = null,
           envoi1_id = case v_rang when 1 then v_envoi else envoi1_id end,
           envoi2_id = case v_rang when 2 then v_envoi else envoi2_id end,
           motif = 'Reprise après refus : message corrigé, à valider de nouveau.', maj_le = now()
     where id = r.id;
  else
    update public.offload_affaires
       set statut = case v_rang when 1 then 'relancee_1' else 'relancee_2' end,
           envoi1_id = case v_rang when 1 then v_envoi else envoi1_id end,
           envoi2_id = case v_rang when 2 then v_envoi else envoi2_id end,
           motif = 'Reprise après refus : relance corrigée, à valider de nouveau.', maj_le = now()
     where id = a.id;
  end if;
  perform private.journaliser_module(d.client_id, 'offload', 'offload.message_repris', v_type, v_objet::text,
    jsonb_build_object('refusee', p_refusee, 'reprise', v_nouvelle, 'envoi', v_envoi, 'rang', v_rang,
                       'corrections', (select jsonb_agg(z ->> 'champ') from jsonb_array_elements(v_corr) z)), d.entite_id);
  return 'proposee';
end $function$;

-- Le passage du cron : toutes les reprises OFFLOAD à faire. Rend le nombre de reprises tranchées.
create or replace function private.offload_traiter_reprises()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare x record; n integer := 0; v text;
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    return 0;
  end if;
  for x in select * from private.reprises_a_faire('offload') loop
    begin
      v := private.offload_reprendre_refus(x.demande_id, x.consigne);
      if v in ('proposee', 'impossible') then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(x.client_id, 'offload', 'attention', 'Un message refusé n''a pas pu être repris : il reste refusé.',
        jsonb_build_object('demande', x.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'reprise:echec:' || x.demande_id::text, true, null);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.offload_suivre_envoi_affaire(jsonb) from public, anon, authenticated;
grant execute on function private.offload_suivre_envoi_affaire(jsonb) to service_role;
revoke execute on function private.offload_reprise_refus_impossible(uuid, text, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function private.offload_reprendre_refus(uuid, jsonb, interval) from public, anon, authenticated;
revoke execute on function private.offload_traiter_reprises() from public, anon, authenticated;
grant execute on function private.offload_traiter_reprises() to service_role;

-- Le cron, chaque minute, quand le lot 19az et pg_cron sont là.
do $cron$
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    raise notice 'c4_37 : le lot socle 19az n''est pas posé — cron non posé. Rejouer c4_37 après 19az.';
    return;
  end if;
  if to_regnamespace('cron') is null then
    raise notice 'c4_37 : pg_cron absent — cron non posé.';
    return;
  end if;
  perform cron.schedule('offload-reprises', '* * * * *', 'select private.offload_traiter_reprises()');
end $cron$;
