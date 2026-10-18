-- c3_13 — REPUT : le « modèle 2 » — envoi automatique par défaut, retenue sur le doute et le sujet (session C3, 18/10/2026)
--
-- DÉCISION (Teo, 18/10 21 h 20 Z) : une réponse REPUT part seule PAR DÉFAUT ; elle est retenue pour une personne quand
-- l'IA doute (hors base, chiffre non sourcé, urgence) ou quand le sujet n'est pas autorisé ; réglable par organisation.
--
-- CE QUE LE SOCLE PERMET, ET DONC CE QUE ÇA FAIT. Un envoi ne part sans validation que couvert par un accord permanent
-- (public.politiques), et un accord ne s'active que par la décision d'une personne (demande politique.activer, ou le
-- gérant seul décideur). Le serveur ne s'autorise donc jamais lui-même. Le modèle 2 devient :
--   · public.reput_reglages.envoi_auto (vrai par défaut) : l'intention de l'organisation ;
--   · public.reput_envoi_automatique(p_client, p_actif, p_motif) — gérant ou administrateur, UN geste :
--       vrai  → propose l'accord de TOUS les sujets autorisables et actifs ; si le gérant est le seul décideur, il les
--               active dans le même geste ; sinon un autre décideur les active dans « À valider » ;
--       faux  → révoque ces accords : tout redevient relu.
--   · la retenue sur le doute : hors base et chiffre non sourcé partaient déjà en reput.transferer (jamais couvert) ;
--     une URGENCE l'est désormais aussi, même tirée de la base sur un sujet autorisé (reput_deposer_reponse, ci-dessous,
--     repris de c3_07 avec ce seul changement) ;
--   · la retenue sur le sujet : réclamation, urgence, parler à quelqu'un, hors sujet et litige ne sont jamais autorisables
--     (garde de c3_03), et un sujet que l'organisation désactive ne reçoit pas d'accord.
-- Les modes d'envoi ne changent pas : sur la recette et le banc, reglages_envois reste en essai ; rien ne part pour de vrai.
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists envoi_auto boolean not null default true;

create or replace function public.reput_envoi_automatique(p_client uuid, p_actif boolean, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  s record;
  v_proposes int := 0;
  v_actives int := 0;
  v_revoques int := 0;
  v_seul boolean;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''envoi automatique se règle par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_actif is null then
    raise exception 'Envoi automatique : vrai ou faux.' using errcode = '22023';
  end if;
  update public.reput_reglages r set envoi_auto = p_actif where r.client_id = p_client and r.entite_id is null;
  v_seul := private.reput_seul_decideur(p_client, v_uid);
  for s in select x.code from public.reput_sujets x
           where x.client_id = p_client and x.autorisable and x.actif order by x.ordre, x.code
  loop
    if p_actif then
      if (public.reput_donner_accord(p_client, s.code) ->> 'proposee') is not null then
        v_proposes := v_proposes + 1;
      end if;
      if v_seul then
        v_actives := v_actives + coalesce((public.reput_activer_accord_seul(p_client, s.code) ->> 'activees')::int, 0);
      end if;
    else
      v_revoques := v_revoques + coalesce((public.reput_revoquer_accord(p_client, s.code,
        coalesce(nullif(btrim(p_motif), ''), 'Envoi automatique coupé par l''organisation')) ->> 'revoquees')::int, 0);
    end if;
  end loop;
  perform private.journaliser_module(p_client, 'reput', 'reput.envoi_automatique', 'clients', p_client::text,
    jsonb_build_object('actif', p_actif, 'proposes', v_proposes, 'actives', v_actives, 'revoques', v_revoques,
                       'seul_decideur', v_seul, 'par', v_uid), null);
  return jsonb_build_object('actif', p_actif, 'proposes', v_proposes, 'actives', v_actives, 'revoques', v_revoques,
                            'a_activer_par_un_autre', p_actif and not v_seul, 'sujets', private.reput_accords_etat(p_client));
end $function$;

revoke execute on function public.reput_envoi_automatique(uuid, boolean, text) from public, anon;
grant execute on function public.reput_envoi_automatique(uuid, boolean, text) to authenticated, service_role;

create or replace function public.reput_deposer_reponse(p_demande uuid, p_resultat jsonb, p_version text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  r public.receptions;
  v_base jsonb;
  v_sujet text;
  v_autorisable boolean;
  v_langue text;
  v_langues text[];
  v_sources uuid[];
  v_couverte boolean;
  v_raison text;
  v_corps text;
  v_objet text;
  v_type text;
  v_rep public.reput_reponses;
  v_dv uuid;
  v_dv_statut text;
  v_politique uuid;
  v_envoi uuid;
  v_e public.envois;
  v_statut_rep text;
  v_statut_dem text;
  v_erreur text;
  v_libelle text;
  v_urgence boolean := coalesce((p_resultat ->> 'urgence')::boolean, false);
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  if p_resultat is null or jsonb_typeof(p_resultat) <> 'object' then
    raise exception 'Le résultat forme un objet JSON.' using errcode = '22023';
  end if;
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null then
    raise exception 'Demande REPUT introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'a_preparer' then
    return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
  end if;
  select * into r from public.receptions x where x.id = d.reception_id;
  v_base := private.reput_base(d.client_id, d.entite_id, now());

  -- Le sujet : un sujet actif de l'organisation, sinon « autre ».
  v_sujet := lower(btrim(p_resultat ->> 'sujet'));
  select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
  from public.reput_sujets s where s.client_id = d.client_id and s.code = v_sujet and s.actif;
  if v_sujet is null then
    select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
    from public.reput_sujets s where s.client_id = d.client_id and s.code = 'autre';
  end if;
  v_autorisable := coalesce(v_autorisable, false) and not (v_sujet = any (private.reput_sujets_proteges()));

  v_langue := lower(btrim(p_resultat ->> 'langue'));
  if v_langue is null or v_langue !~ '^[a-z]{2}$' then
    v_langue := coalesce(d.langue, 'fr');
  end if;
  select array_agg(x) into v_langues from jsonb_array_elements_text(coalesce(v_base -> 'reglages' -> 'langues', '["fr"]'::jsonb)) x;

  -- Les sources : seulement des fiches validées et en vigueur de cette base ; le reste est écarté.
  select coalesce(array_agg(distinct (f ->> 'id')::uuid), '{}') into v_sources
  from jsonb_array_elements(coalesce(v_base -> 'fiches', '[]'::jsonb)) f
  where jsonb_typeof(p_resultat -> 'sources') = 'array' and (p_resultat -> 'sources') ? (f ->> 'id');

  v_raison := nullif(left(btrim(p_resultat ->> 'raison'), 500), '');
  v_couverte := coalesce((p_resultat ->> 'couverte')::boolean, false);
  if v_couverte and cardinality(v_sources) = 0 then
    v_couverte := false;
    v_raison := coalesce(v_raison, 'Aucune fiche de la base citée : la réponse n''est pas sourcée.');
  end if;
  if v_couverte and not (v_langue = any (v_langues)) then
    v_couverte := false;
    v_raison := format('Langue « %s » non couverte par les réglages (%s) : transférée.', v_langue, array_to_string(v_langues, ', '));
  end if;
  if nullif(btrim(p_resultat ->> 'corps'), '') is null then
    raise exception 'Le résultat porte un corps (même un « je ne sais pas »).' using errcode = '22023';
  end if;
  -- c3_06 : un contact en litige ouvert ne reçoit jamais de réponse automatisée.
  -- c3_13 : une urgence n'est jamais envoyée seule, même tirée de la base sur un sujet autorisé.
  v_type := case when v_couverte and v_autorisable and not coalesce(d.litige, false) and not v_urgence
                 then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
  v_corps := private.reput_assembler(v_base -> 'reglages', v_langue, p_resultat);
  v_objet := case when d.canal_reponse = 'email'
                  then left(coalesce('Re : ' || nullif(btrim(r.sujet), ''), nullif(btrim(p_resultat ->> 'objet'), ''), 'Votre demande'), 300) end;

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(p_resultat ->> 'corps'), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', private.reput_type_file(v_type, v_sujet), 'reput_demandes', d.id::text,
            left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, v_sujet), case when v_couverte then '' else ' (hors base : à compléter)' end), 500),
            jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps),
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    if d.canal_reponse is not null then
      v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
        jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', v_langue, 'professionnel', false),
        null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:envoi:' || v_rep.id::text, d.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : à traiter par une personne.' end),
         maj_le = now()
  where x.id = v_rep.id returning * into v_rep;
  update public.reput_demandes x set statut = v_statut_dem, sujet = v_sujet, langue = v_langue, urgence = v_urgence,
         couverte = v_couverte, preparee_le = now(),
         decidee_le = case when v_statut_dem in ('validee', 'envoyee') then now() end,
         envoyee_le = case when v_statut_dem = 'envoyee' then now() end,
         motif = case when v_statut_dem in ('a_traiter', 'bloquee') then left(coalesce(v_rep.raison, v_e.motif, v_e.verrou), 500) end,
         maj_le = now()
  where x.id = d.id returning * into d;
  update public.receptions x set statut = 'lue' where x.id = r.id and x.statut = 'nouvelle';

  perform private.journaliser_module(d.client_id, 'reput', 'reput.reponse_preparee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue, 'couverte', v_couverte, 'urgence', v_urgence,
                       'sources', to_jsonb(v_sources), 'type_action', v_type, 'demande_validation', v_dv, 'politique', v_politique,
                       'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'statut', d.statut,
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur), d.entite_id);

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur);
end $function$;
