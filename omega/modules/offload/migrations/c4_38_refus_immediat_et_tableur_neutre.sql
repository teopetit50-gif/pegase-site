-- c4_38 — OFFLOAD : correctifs de la recette du testeur des modules (26/10/2026, session C4 ; rapport
-- omega/RECETTE-TESTEUR-MODULES-2026-10-26.md, branche testeur-modules 157b506f) et la note ouverte des CSV.
--
--   · TMOD-06 (important) — un message refusé restait « à valider » jusqu'à l'événement de l'envoi (asynchrone), et sans
--     fin après le refus d'une reprise. Désormais, dès qu'une demande d'OFFLOAD passe « rejetee » (déclencheur
--     demandes_validation_zz_offload_refus, après la clôture de l'envoi par le socle) :
--       - la reprise de contact dont c'était le message se clôt « refusée », avec le motif (la consigne, ou « sans
--         consigne ») ; elle sort de « à valider » ; seule une reprise proposée par c4_37 la rouvre, sur un NOUVEAU
--         message à valider ;
--       - la relance de retrait refusée renvoie l'affaire « à décider », avec le motif ;
--       - le refus d'une reprise (second refus) clôt pour de bon : « reprise refusée à son tour », aucune autre reprise.
--   · c4_37 : sur une affaire, seule une décision prise APRÈS le refus empêche la reprise (une affaire relancée par
--     décision porte une decide_le plus ancienne).
--   · TMOD-07 (mineur) — le résumé de la demande de reprise cite le contact en vigueur, et l'ancien s'il a changé
--     (« Courriel à Mme Durand (au lieu de Martin) : … »), au lieu de reprendre le résumé de la demande refusée.
--   · Restitution en tableur (c4_36) : une cellule de texte qui commence par = + - @, une tabulation ou un retour
--     chariot est neutralisée par une apostrophe (injection de formule). Les nombres restent des nombres : un nombre
--     ne porte pas de formule, et un avoir négatif doit rester calculable.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public sur toute fonction nouvelle.

-- Le refus d'une demande d'OFFLOAD, appliqué tout de suite à son objet.
create or replace function private.offload_au_refus() returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  e public.envois;
  r public.offload_reprises;
  a public.offload_affaires;
  v_consigne text;
  v_motif text;
  v_reprise boolean := new.payload ? 'reprise_de';
begin
  if new.module <> 'offload' or new.statut <> 'rejetee' or old.statut is not distinct from new.statut then
    return null;
  end if;
  if new.objet_type not in ('offload_reprises', 'offload_affaires') then
    return null;
  end if;
  select * into e from public.envois y
   where y.client_id = new.client_id and (y.demande_id = new.id or y.id::text = new.payload ->> 'envoi')
   order by y.cree_le desc limit 1;
  if e.id is null then
    return null;
  end if;
  select nullif(btrim(regexp_replace(coalesce(p.commentaire, ''), '^\[seul décideur\]', '')), '') into v_consigne
    from public.approbations p where p.demande_id = new.id and p.decision = 'rejete' order by p.decide_le desc nulls last limit 1;
  v_motif := left(case
    when v_reprise then 'Reprise refusée à son tour' || coalesce(' (consigne : ' || v_consigne || ')', '') || ' : OFFLOAD n''en propose pas d''autre.'
    when v_consigne is not null then 'Message refusé en validation (consigne : ' || v_consigne
                                     || ') : OFFLOAD le repropose si la fiche ou les réglages sont corrigés dans les 24 heures.'
    else 'Message refusé en validation, sans consigne.' end, 440);
  if new.objet_type = 'offload_reprises' then
    select * into r from public.offload_reprises where id = new.objet_id::uuid;
    if r.id is not null and e.id in (r.envoi1_id, r.envoi2_id) and r.statut not in ('repondue', 'close') then
      perform private.offload_clore(r.id, 'refusee', v_motif);
    end if;
  else
    select * into a from public.offload_affaires where id = new.objet_id::uuid;
    if a.id is not null and e.id in (a.envoi1_id, a.envoi2_id) and a.statut in ('relancee_1', 'relancee_2') then
      update public.offload_affaires set statut = 'decision', maj_le = now(), motif = left('Relance de retrait refusée. ' || v_motif || ' À décider.', 500)
       where id = a.id;
    end if;
  end if;
  return null;
end $function$;
revoke execute on function private.offload_au_refus() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.demandes_validation'::regclass and tgname = 'demandes_validation_zz_offload_refus') then
    create trigger demandes_validation_zz_offload_refus after update of statut on public.demandes_validation
      for each row execute function private.offload_au_refus();
  end if;
end $do$;

-- Reprise impossible : l'objet, déjà sorti de « à valider » au refus, prend le motif définitif.
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
    update public.offload_reprises set motif = left('Message refusé en validation ; reprise impossible : ' || p_motif, 500), maj_le = now()
     where id = p_objet and statut = 'close' and issue = 'refusee' and p_envoi is not null and p_envoi in (envoi1_id, envoi2_id);
  elsif p_objet_type = 'offload_affaires' then
    update public.offload_affaires set statut = 'decision', maj_le = now(),
           motif = left('Relance de retrait refusée en validation ; reprise impossible : ' || p_motif || ' À décider.', 500)
     where id = p_objet and statut in ('relancee_1', 'relancee_2', 'decision')
       and coalesce(decide_le, '-infinity') < coalesce((select x.decide_le from public.demandes_validation x where x.id = p_refusee), now())
       and p_envoi is not null and p_envoi in (envoi1_id, envoi2_id);
  end if;
  return 'impossible';
end $function$;
revoke execute on function private.offload_reprise_refus_impossible(uuid, text, uuid, uuid, text) from public, anon, authenticated;

-- La reprise d'un message refusé (c4_37), avec le résumé au contact en vigueur et la décision comparée au refus.
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
  v_refus timestamptz;
  v_resume text;
begin
  select * into d from public.demandes_validation where id = p_refusee;
  if d.id is null or d.module <> 'offload' then
    return null;
  end if;
  select * into x from private.reprises where demande_id = p_refusee;
  v_echu := coalesce(x.cree_le, now()) <= now() - p_delai;
  v_refus := coalesce(d.decide_le, x.cree_le, now());
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
    -- c4_38 : seule une décision prise APRÈS le refus compte (une affaire relancée par décision en porte une plus ancienne).
    if a.statut not in ('relancee_1', 'relancee_2', 'decision') or a.decide_le >= v_refus then
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

  -- Une demande liée à la refusée, au nom du moteur, et le message corrigé qui lui est adossé. Le résumé cite le
  -- contact en vigueur, et l'ancien s'il a changé (c4_38, TMOD-07).
  v_resume := case when e.mode = 'essai' then 'Essai — ' else '' end
    || format('Courriel à %s', v_nom)
    || case when e.destinataire_nom is not null and e.destinataire_nom is distinct from v_nom
            then format(' (au lieu de %s)', e.destinataire_nom) else '' end
    || case when v_adresse is distinct from e.destinataire_adresse then format(', %s', v_adresse) else '' end
    || ' : ' || coalesce(v_msg ->> 'sujet', 'sans objet');
  v_nouvelle := private.proposer_reprise(p_refusee, v_resume,
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
revoke execute on function private.offload_reprendre_refus(uuid, jsonb, interval) from public, anon, authenticated;

-- Une valeur de texte pour un tableur : neutralisée si elle commencerait une formule.
create or replace function private.offload_csv_neutre(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p ~ '^[=+@\t\r-]' then '''' || p else p end
$function$;
revoke execute on function private.offload_csv_neutre(text) from public, anon, authenticated;
grant execute on function private.offload_csv_neutre(text) to service_role;

create or replace function private.offload_restitution_tableur(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d jsonb;
  f text;
  v_lignes jsonb;
  v_cles text[];
  v_csv text;
  r jsonb;
  v_fichiers jsonb := '{}'::jsonb;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'restituer les données OFFLOAD en tableur');
  d := private.offload_restitution(p_client) -> 'donnees';   -- contrôle des droits et journal (c4_17)
  for f in select k from jsonb_object_keys(d) k order by k loop
    v_lignes := d -> f;
    continue when jsonb_typeof(v_lignes) <> 'array' or jsonb_array_length(v_lignes) = 0;
    select array_agg(k order by k) into v_cles from (select distinct jsonb_object_keys(x) as k from jsonb_array_elements(v_lignes) x) z;
    v_csv := array_to_string(array(select private.offload_csv_cellule(k) from unnest(v_cles) k), ';');
    for r in select x from jsonb_array_elements(v_lignes) x loop
      v_csv := v_csv || E'\n' || array_to_string(array(
        select private.offload_csv_cellule(case jsonb_typeof(r -> k) when 'string' then private.offload_csv_neutre(r ->> k) when 'null' then null
                                                                       else (r -> k)::text end)
        from unnest(v_cles) k), ';');
    end loop;
    v_fichiers := v_fichiers || jsonb_build_object('offload-' || replace(f, '_', '-') || '.csv', v_csv);
  end loop;
  return jsonb_build_object('format', 'csv ; séparateur « ; » ; UTF-8', 'fichiers', v_fichiers);
end $function$;
revoke execute on function private.offload_restitution_tableur(uuid) from public, anon;
grant execute on function private.offload_restitution_tableur(uuid) to authenticated, service_role;
