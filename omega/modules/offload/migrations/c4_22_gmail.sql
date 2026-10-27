-- c4_22 — OFFLOAD : la branche Gmail (session C4, 19/10/2026)
--
-- Décision du bureau (19/10, délégation de Teo) : « Branche Gmail : OUI sur la recette, sur la boîte de test déjà
-- branchée, en mode essai, sans aucun envoi réel. » Tout le branchement est au socle (19al, A2) : la boîte connectée
-- devient l'expéditeur préféré du module, l'ouvrier y dépose le message en BROUILLON (statut « brouillon_depose ») et
-- relève les réponses dans public.receptions. Ce lot fait la part d'OFFLOAD :
--   · l'abonnement à « envoi.brouillon_depose.offload » ;
--   · un brouillon déposé compte comme parti (le socle le compte ainsi pour les doublons et les plafonds) : la reprise,
--     l'échéance ou l'affaire avance comme pour « envoye », et le journal dit « offload.brouillon_depose » ;
--   · public.offload_messagerie(p_client) : par quelle boîte partent les messages d'OFFLOAD, en brouillon ou en envoi
--     (selon les droits accordés à la boîte), et dans quel mode (essai : rien ne part pour de vrai).
-- Les réponses relevées dans la boîte arrivent par « reception.nouvelle », déjà lues par OFFLOAD (lien à l'envoi, ou
-- adresse du compte). Aucun mode d'envoi n'est changé ici.
--
-- Règles de pose : insert … where not exists, create or replace. Aucun DROP, aucun DELETE.

insert into private.abonnements (evenement, module, genre)
select 'envoi.brouillon_depose.offload', 'offload', 'offload.envoi'
where not exists (select 1 from private.abonnements a where a.evenement = 'envoi.brouillon_depose.offload' and a.module = 'offload'
                    and a.genre = 'offload.envoi');

-- Le suivi d'un envoi : le brouillon déposé avance comme un message parti.
create or replace function private.offload_suivre_envoi(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_rang integer;
begin
  -- Un brouillon déposé dans la boîte connectée (Gmail, 19al) compte comme parti : le client l'envoie de sa boîte.
  if v_issue = 'brouillon_depose' then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' then
      perform private.journaliser_module(e.client_id, 'offload', 'offload.brouillon_depose', e.objet_type, e.objet_id,
        jsonb_build_object('envoi', e.id, 'mode', e.mode), e.entite_id);
    end if;
    p_charge := jsonb_set(p_charge, '{evenement}', to_jsonb('envoi.envoye.' || split_part(p_charge ->> 'evenement', '.', 3)))
                || jsonb_build_object('brouillon', true);
    v_issue := 'envoye';
    e := null;
  end if;
  -- Un message non remis : le compte passe « à vérifier », et la surveillance juge s'il faut s'arrêter (c4_10).
  if v_issue in ('echec', 'non_remis') and p_charge ->> 'envoi' is not null then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' and private.offload_compte_de_envoi(e.id) is not null then
      perform private.offload_a_verifier(private.offload_compte_de_envoi(e.id), 'echec',
        left(format('Le message du %s n''a pas été remis (%s%s) : l''adresse est à vérifier.', private.offload_le((e.cree_le at time zone 'Europe/Paris')::date),
                    v_issue, coalesce(', ' || e.verrou, '')), 500));
      perform private.offload_surveiller(e.client_id);
    end if;
  end if;
  if p_charge ->> 'objet_type' = 'offload_affaires' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_affaire(p_charge);
  end if;
  if p_charge ->> 'objet_type' = 'offload_echeances' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_echeance(p_charge);
  end if;
  if p_charge ->> 'objet_type' is distinct from 'offload_reprises' or p_charge ->> 'envoi' is null then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into r from public.offload_reprises where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or r.id is null or r.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
  if v_rang is null or r.statut in ('repondue', 'close') then
    return jsonb_build_object('statut', 'sans_effet', 'reprise', r.statut);
  end if;

  if v_issue = 'envoye' then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'envoyee', envoye1_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut in ('a_valider', 'appel');
    else
      update public.offload_reprises set statut = 'relancee', envoye2_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut = 'relance_a_valider';
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_envoye', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('statut', 'envoye', 'rang', v_rang);
  elsif v_issue = 'refuse' then
    -- Refusé en validation : une personne a dit non, la reprise s'arrête là.
    perform private.offload_clore(r.id, 'refusee', 'Le message de rang ' || v_rang || ' a été refusé en validation.');
    return jsonb_build_object('statut', 'refusee', 'rang', v_rang);
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'appel', maj_le = now(),
             motif = left(format('Le message n''est pas parti (%s%s) : la reprise passe par l''appel.', v_issue,
                                 coalesce(', ' || e.verrou, '')), 500)
       where id = r.id;
      -- Le message ne part pas : l'appel prend le relais (un seul canal à la fois, c4_12).
      insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
      select r.client_id, r.entite_id, k.id, r.id, 'appel', left('Appeler ' || k.nom, 200),
             left(format('Le message de reprise n''est pas parti (%s%s) : appelez le client.%s', v_issue, coalesce(', ' || e.verrou, ''),
                         coalesce(E'\nTéléphone : ' || k.telephone, '')), 4000),
             k.commercial, (now() at time zone 'Europe/Paris')::date + 1
      from public.offload_comptes k where k.id = r.compte_id
      on conflict do nothing;
    else
      -- La relance ne part pas : le compte sort du cycle, l'appel reste.
      perform private.offload_clore(r.id, 'sans_reponse', format('La relance n''est pas partie (%s%s).', v_issue, coalesce(', ' || e.verrou, '')));
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_non_parti', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'issue', v_issue, 'verrou', e.verrou), r.entite_id);
    return jsonb_build_object('statut', v_issue, 'rang', v_rang);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- Par où partent les messages d'OFFLOAD : la boîte connectée (brouillon ou envoi), le mode.
create or replace function public.offload_messagerie(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_mode text;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'lire la messagerie d''OFFLOAD');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  v_mode := coalesce(private.reglages_envois_effectifs(p_client, 'offload') ->> 'mode', 'essai');
  return jsonb_build_object(
    'mode', v_mode,
    'boites', (select coalesce(jsonb_agg(jsonb_build_object(
                 'adresse', m.adresse, 'fournisseur', m.fournisseur, 'etat', m.etat, 'releve_le', m.releve_le,
                 'depot', case when exists (select 1 from unnest(m.portees) p where p ~ '(gmail\.send|mail\.google\.com|Mail\.Send)') then 'envoi'
                               else 'brouillon' end) order by m.connecte_le), '[]'::jsonb)
               from public.messageries m where m.client_id = p_client and m.etat in ('active', 'a_reconnecter')),
    'phrase', case when v_mode = 'essai' then 'Mode essai : aucun message ne part pour de vrai ; les essais vont à l''adresse d''essai du socle.'
                   when exists (select 1 from public.messageries m where m.client_id = p_client and m.etat = 'active')
                     then 'Les messages d''OFFLOAD passent par votre boîte connectée.'
                   else 'Les messages d''OFFLOAD partent par l''expéditeur partagé d''Omega.' end);
end $function$;

revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;
grant execute on function private.offload_suivre_envoi(jsonb) to service_role;
revoke execute on function public.offload_messagerie(uuid) from public, anon;
grant execute on function public.offload_messagerie(uuid) to authenticated, service_role;
