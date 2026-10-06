-- c3_07 — REPUT : une même demande sur deux canaux = un seul dossier ; le routage entre services (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT (lib/produits/capacites/accueil.ts) :
--   · « Une même demande reçue sur deux canaux est reconnue comme un seul dossier. » et le cas tordu « Le client
--     reçoit une réponse, pas deux, sur le canal qu'il a utilisé en dernier. »
--       - Chaque demande porte ses clés de contact (empreintes SHA-256 de l'adresse courriel en minuscules et des neuf
--         derniers chiffres du téléphone ; un formulaire qui donne les deux porte les deux). Une demande dont une clé
--         recoupe celle d'une demande des sept derniers jours rejoint son dossier (reput_demandes.dossier_id).
--       - Le dossier préparé (reput_commencer) joint les messages précédents du dossier (trois au plus) : la réponse
--         préparée couvre tout, sur le canal du DERNIER message.
--       - L'ouvrier de base annule les réponses plus anciennes du dossier encore en attente (demande de validation
--         « annulee » par le serveur, son envoi se clôt avec elle ; la demande passe « ignoree », motif « regroupée »).
--   · « Chaque demande est aiguillée selon sa catégorie, d'après les règles posées à l'installation. » et « Une demande
--     qui relève de deux services est orientée vers le premier concerné. »
--       - reput_router_sujet(p_client, p_sujet, p_equipe) : le sujet va à une équipe du socle (public.equipes). La
--         porte pose les règles de validation du socle (regles_validation, module reput) sur « reput.repondre.<sujet> »
--         et « reput.transferer.<sujet> », avec cette équipe : seuls ses membres décident (exiger_decideur du socle).
--       - La file porte désormais le sujet dans le type d'action, aussi pour le « à relire »
--         (« reput.transferer.<sujet> ») ; la garde des politiques (c3_03) les refuse toujours à l'envoi seul.
--       - Le sujet retenu par le modèle est le premier concerné (consigne) : la demande va à son service.
--
--   · Correctif de c3_05 : le message « demandes d'avis » prend le code « demande_avis » (il masquait le sujet « avis »).
--
-- Règles de pose : alter … if not exists / create or replace ; ni DROP ni DELETE.

alter table public.reput_demandes add column if not exists cles_contact text[] not null default '{}';
alter table public.reput_demandes add column if not exists dossier_id uuid;
alter table public.reput_demandes add column if not exists regroupee_avec uuid;
alter table public.reput_sujets add column if not exists equipe_id uuid;
create index if not exists reput_demandes_cles_idx on public.reput_demandes using gin (cles_contact);
create index if not exists reput_demandes_dossier_idx on public.reput_demandes (dossier_id, recu_le);
update public.reput_demandes d set dossier_id = d.id where d.dossier_id is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Aides
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_cles_contact(p_canal text, p_de text, p_detail jsonb)
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$
  with brut as (
    select x from unnest(array[p_de, p_detail ->> 'email', p_detail ->> 'telephone', p_detail ->> 'tel']) x
    where nullif(btrim(x), '') is not null
  ), cles as (
    select case when btrim(x) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'm:' || lower(btrim(x))
                when length(regexp_replace(x, '\D', '', 'g')) >= 9 then 't:' || right(regexp_replace(x, '\D', '', 'g'), 9)
           end as c
    from brut
  )
  select coalesce(array_agg(distinct encode(extensions.digest(c, 'sha256'), 'hex')) filter (where c is not null), '{}')
  from cles
$function$;

create or replace function private.reput_dossier_de(p_client uuid, p_demande uuid, p_cles text[], p_recu_le timestamptz)
 returns uuid
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(d.dossier_id, d.id)
  from public.reput_demandes d
  where d.client_id = p_client and d.id <> p_demande and cardinality(p_cles) > 0 and d.cles_contact && p_cles
    and d.recu_le >= p_recu_le - interval '7 days' and d.recu_le <= p_recu_le
  order by d.recu_le desc
  limit 1
$function$;

create or replace function private.reput_precedents(p_client uuid, p_dossier uuid, p_sauf uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(x.m order by x.recu_le), '[]'::jsonb)
  from (
    select d.recu_le, jsonb_build_object('canal', r.canal, 'recu_le', d.recu_le, 'sujet', left(r.sujet, 300),
                                         'corps', left(coalesce(r.corps, ''), 2000), 'statut', d.statut) as m
    from public.reput_demandes d join public.receptions r on r.id = d.reception_id
    where d.client_id = p_client and d.dossier_id = p_dossier and d.id <> p_sauf
    order by d.recu_le desc limit 3
  ) x
$function$;

-- Le type d'action de la file : le « à relire » porte aussi son sujet (pour le routage par service).
create or replace function private.reput_type_file(p_type text, p_sujet text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p_type = 'reput.transferer' and p_sujet ~ '^[a-z][a-z0-9_]{1,39}$' then 'reput.transferer.' || p_sujet else p_type end
$function$;

-- Un dossier, une réponse : les réponses plus anciennes encore en attente cèdent la place à la plus récente.
create or replace function private.reput_regrouper()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_n integer := 0;
begin
  for x in
    select a.id, a.client_id, a.entite_id, a.dossier_id, n.id as recente
    from public.reput_demandes a
    join lateral (select b.id from public.reput_demandes b
                  where b.dossier_id = a.dossier_id and b.id <> a.id and (b.recu_le, b.reception_id) > (a.recu_le, a.reception_id)
                    and b.statut in ('a_valider', 'validee', 'envoyee', 'a_traiter', 'bloquee')
                  order by b.recu_le desc, b.reception_id desc limit 1) n on true
    where a.statut = 'a_valider' and a.dossier_id is not null
    limit 100
  loop
    update public.demandes_validation v set statut = 'annulee'
    where v.statut = 'en_attente' and v.id in (select p.demande_validation_id from public.reput_reponses p
                                                where p.demande_id = x.id and p.statut = 'a_valider');
    update public.reput_reponses p set statut = 'remplacee', raison = coalesce(p.raison, 'Regroupée : une réponse plus récente couvre le dossier.'),
           maj_le = now()
    where p.demande_id = x.id and p.statut = 'a_valider';
    update public.reput_demandes d set statut = 'ignoree', regroupee_avec = x.recente,
           motif = 'Regroupée avec le message suivant du même client : une seule réponse, sur son dernier canal.', maj_le = now()
    where d.id = x.id and d.statut = 'a_valider';
    perform private.journaliser_module(x.client_id, 'reput', 'reput.demande_regroupee', 'reput_demandes', x.id::text,
      jsonb_build_object('dossier', x.dossier_id, 'avec', x.recente), x.entite_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

-- Un sujet → une équipe du socle : ses membres décident des réponses de ce sujet.
create or replace function public.reput_router_sujet(p_client uuid, p_sujet text, p_equipe uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.reput_sujets;
  v_type text;
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le routage des demandes se pose par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  select * into s from public.reput_sujets x where x.client_id = p_client and x.code = lower(btrim(p_sujet)) for update;
  if s.id is null then
    raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
  end if;
  if p_equipe is not null and not exists (select 1 from public.equipes e where e.client_id = p_client and e.id = p_equipe) then
    raise exception 'Équipe introuvable dans cette organisation.' using errcode = '22023';
  end if;
  update public.reput_sujets x set equipe_id = p_equipe where x.id = s.id;
  foreach v_type in array array['reput.repondre.' || s.code, 'reput.transferer.' || s.code] loop
    update public.regles_validation r set actif = false
    where r.client_id = p_client and r.module = 'reput' and r.type_action = v_type and r.entite_id is null and r.actif
      and r.equipe_id is distinct from p_equipe;
    if p_equipe is not null and not exists (select 1 from public.regles_validation r
                                            where r.client_id = p_client and r.module = 'reput' and r.type_action = v_type
                                              and r.entite_id is null and r.actif and r.equipe_id = p_equipe) then
      insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, equipe_id, actif)
      values (p_client, null, 'reput', v_type, 1, array['gerant', 'admin', 'valideur'], p_equipe, true);
    end if;
  end loop;
  perform private.journaliser_module(p_client, 'reput', 'reput.sujet_route', 'reput_sujets', s.id::text,
    jsonb_build_object('sujet', s.code, 'equipe', p_equipe), null);
  return jsonb_build_object('sujet', s.code, 'equipe', p_equipe);
end $function$;

create or replace function public.reput_commencer(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  d public.reput_demandes;
  v_base jsonb;
  v_rep jsonb;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  select * into r from public.receptions x where x.id = p_reception;
  if r.id is null then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception introuvable');
  end if;
  if r.module is distinct from 'reput' then
    return jsonb_build_object('statut', 'ignore', 'motif', format('réception du module %s', coalesce(r.module, 'aucun')));
  end if;
  if r.statut in ('ignoree', 'indesirable') then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception ' || r.statut);
  end if;
  perform private.reput_installer(r.client_id, null);
  v_base := private.reput_base(r.client_id, r.entite_id, now());
  if not coalesce((v_base -> 'reglages' ->> 'actif')::boolean, false) then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réponses désactivées dans les réglages');
  end if;
  v_rep := private.reput_canal_reponse(r);
  insert into public.reput_demandes (client_id, entite_id, reception_id, canal, canal_reponse, adresse_reponse, de_nom, objet, recu_le, langue,
                                     de_empreinte, litige, cles_contact)
  values (r.client_id, r.entite_id, r.id, r.canal, v_rep ->> 'canal', v_rep ->> 'adresse', left(r.de_nom, 200), left(r.sujet, 300),
          r.recu_le, case when r.langue ~ '^[a-z]{2}$' then r.langue end,
          r.de_empreinte, private.reput_en_litige(r.client_id, coalesce(v_rep ->> 'adresse', r.de_adresse)),
          private.reput_cles_contact(r.canal, r.de_adresse, r.detail))
  on conflict (client_id, reception_id) do nothing
  returning * into d;
  if d.id is null then
    select * into d from public.reput_demandes x where x.client_id = r.client_id and x.reception_id = r.id;
    if d.statut <> 'a_preparer' then
      return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
    end if;
  else
    -- c3_07 : la même personne sur un autre canal (ou le même) dans les sept jours → le même dossier.
    update public.reput_demandes x set dossier_id = coalesce(private.reput_dossier_de(d.client_id, d.id, d.cles_contact, d.recu_le), d.id)
    where x.id = d.id returning * into d;
    perform private.journaliser_module(r.client_id, 'reput', 'reput.demande_recue', 'reput_demandes', d.id::text,
      jsonb_build_object('reception', r.id, 'canal', r.canal, 'canal_reponse', d.canal_reponse), r.entite_id);
  end if;
  return jsonb_build_object(
    'statut', 'a_preparer',
    'demande', d.id,
    'client', r.client_id,
    'reception', jsonb_build_object('id', r.id, 'canal', r.canal, 'de_nom', r.de_nom, 'sujet', left(r.sujet, 300),
                                    'corps', left(coalesce(r.corps, ''), 8000), 'langue', r.langue, 'recu_le', r.recu_le,
                                    'pieces', jsonb_array_length(coalesce(r.pieces, '[]'::jsonb)),
                                    'en_reponse_a', r.en_reponse_a is not null),
    'canal_reponse', d.canal_reponse,
    -- c3_06 : le client reconnu à son adresse (ses demandes précédentes, sans leur texte) et son litige éventuel.
    'client_connu', private.reput_historique(d.client_id, d.de_empreinte, d.id),
    'litige', d.litige,
    -- c3_07 : les messages précédents du même dossier, pour une seule réponse qui couvre tout.
    'precedents', private.reput_precedents(d.client_id, d.dossier_id, d.id),
    'base', v_base);
end $function$;

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
  v_type := case when v_couverte and v_autorisable and not coalesce(d.litige, false) then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
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

create or replace function private.reput_redeposer(p_reponse uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_reponses;
  d public.reput_demandes;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_erreur text;
  v_libelle text;
begin
  select * into p from public.reput_reponses x where x.id = p_reponse for update;
  if p.id is null or p.statut <> 'a_valider' or p.demande_validation_id is not null then
    return jsonb_build_object('ignore', 'réponse absente, déjà déposée ou plus à valider');
  end if;
  select * into d from public.reput_demandes x where x.id = p.demande_id;
  select s.libelle into v_libelle from public.reput_sujets s where s.client_id = p.client_id and s.code = p.sujet;
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (p.client_id, p.entite_id, 'reput', private.reput_type_file(p.type_action, p.sujet), 'reput_demandes', d.id::text,
            left(format('Réponse corrigée à %s — %s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, p.sujet)), 500),
            jsonb_build_object('reponse', p.id, 'demande', d.id, 'sujet', p.sujet, 'couverte', p.couverte, 'version', p.version,
                               'canal', d.canal_reponse, 'langue', p.langue, 'objet', p.objet, 'corps', p.corps,
                               'redigee_par', p.redigee_par),
            now() + interval '7 days', 'reput:reponse:' || p.id::text)
    returning id into v_dv;
    if d.canal_reponse is not null then
      v_envoi := private.preparer_envoi(p.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
        jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', p.langue, 'professionnel', false),
        null, '{}'::jsonb, p.objet, p.corps, null::uuid[], 'reput:envoi:' || p.id::text, p.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_envoi := null; v_e := null;
  end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi,
         statut = case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee' else 'a_valider' end,
         raison = case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur else x.raison end, maj_le = now()
  where x.id = p.id returning * into p;
  update public.reput_demandes x set statut = case p.statut when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee' else 'a_valider' end,
         motif = case when p.statut in ('sans_envoi', 'bloquee') then left(coalesce(p.raison, v_e.motif, v_e.verrou), 500) end, maj_le = now()
  where x.id = d.id;
  perform private.journaliser_module(p.client_id, 'reput', 'reput.reponse_redeposee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', p.id, 'version', p.version, 'demande_validation', v_dv, 'envoi', v_envoi,
                       'envoi_statut', v_e.statut, 'erreur', v_erreur), p.entite_id);
  return jsonb_build_object('reponse', p.id, 'statut', p.statut, 'demande_validation', v_dv, 'envoi', v_envoi, 'erreur', v_erreur);
end $function$;

create or replace function private.reput_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  x record;
  v_r jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_accuses integer := 0;
  v_avis integer := 0;
  v_erreurs integer := 0;
  v_synchro integer;
  v_avis_reglement integer := 0;
  v_escalades integer := 0;
begin
  for t in select * from private.prendre_travaux(array['reput.redeposer'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_redeposer((t.charge ->> 'reponse')::uuid);
      perform private.finir_travail(t.id, v_r);
      v_faits := v_faits + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- Les accusés de réception des demandes qui attendent (déposées depuis moins d'un jour).
  for x in select d.id, d.client_id from public.reput_demandes d
           where d.statut in ('a_valider', 'a_traiter') and d.accuse_le is null and d.canal_reponse is not null
             and d.preparee_le > now() - interval '1 day'
           order by d.recu_le limit 50 loop
    begin
      v_r := private.reput_accuser(x.id);
      if v_r ? 'envoi' then v_accuses := v_accuses + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_demandes d set accuse_le = now() where d.id = x.id;   -- jamais deux fois, jamais en boucle
      perform private.lever_alerte_module(x.client_id, 'reput', 'info', 'Un accusé de réception n''a pas pu être préparé.',
        jsonb_build_object('demande', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'accuse:' || x.id::text, false, null);
    end;
  end loop;
  -- Les demandes d'avis arrivées à échéance.
  for x in select a.id, a.client_id from public.reput_avis a
           where a.statut in ('programme', 'sollicite') and a.prochain_le <= now()
           order by a.prochain_le limit 50 loop
    begin
      v_r := private.reput_solliciter_avis(x.id);
      if v_r ? 'envoi' then v_avis := v_avis + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_avis a set statut = 'termine', motif = left('Envoi impossible : ' || sqlerrm, 300), prochain_le = null where a.id = x.id;
    end;
  end loop;
  -- c3_06 : les règlements lettrés publiés par CASHD (cashd.facture_reglee) → demande d'avis, si le client l'a voulu.
  for t in select * from private.prendre_travaux(array['reput.avis_reglement'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_avis_depuis_reglement(t.client_id, t.charge);
      perform private.finir_travail(t.id, v_r);
      if v_r ? 'avis' then v_avis_reglement := v_avis_reglement + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- c3_06 : le délai de traitement dépassé fait remonter la demande au responsable.
  v_escalades := private.reput_escalader(now());
  -- c3_07 : un dossier, une réponse : les réponses plus anciennes encore en attente sont annulées.
  perform private.reput_regrouper();
  v_synchro := private.reput_synchroniser(null);
  begin
    perform private.battre_ouvrier('reput', array['reput.redeposer', 'reput.avis_reglement'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                         'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                            'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Correctif de c3_05 : le message « demandes d'avis » s'appelait « avis », comme le SUJET « avis » (avis et retours) ;
-- l'accord du sujet était impossible (il devenait celui du message). Le message s'appelle désormais « demande_avis ».
-- Une politique déjà donnée sur « reput.avis » reste valable (même type d'action).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_type_accord(p_code text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case lower(btrim(p_code)) when 'accuse' then 'reput.accuser' when 'demande_avis' then 'reput.avis'
              else 'reput.repondre.' || lower(btrim(p_code)) end
$function$;

create or replace function private.reput_accords_etat(p_client uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with p as (
    select p.*, row_number() over (partition by p.type_action
                                   order by (p.statut = 'active' and now() >= p.debut and now() < p.fin) desc,
                                            (p.statut = 'a_valider') desc, p.cree_le desc) as rang
    from public.politiques p
    where p.client_id = p_client and p.module = 'reput'
  ), s as (
    select x.code, x.libelle, x.autorisable, x.actif, x.ordre, 'reput.repondre.' || x.code as type_action, 'sujet' as genre
    from public.reput_sujets x where x.client_id = p_client
    union all select 'accuse', 'Accusés de réception', true, true, (-2)::smallint, 'reput.accuser', 'message'
    union all select 'demande_avis', 'Demandes d''avis', true, true, (-1)::smallint, 'reput.avis', 'message'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sujet', s.code, 'libelle', s.libelle, 'genre', s.genre, 'autorisable', s.autorisable, 'actif', s.actif,
           'politique', p.id,
           'statut', case when p.id is null then 'aucun'
                          when p.statut = 'active' and p.fin <= now() then 'expire'
                          else p.statut end,
           'debut', p.debut, 'fin', p.fin, 'entite', p.entite_id, 'active_le', p.active_le,
           'donne_par_libelle', (select u.email from auth.users u where u.id = p.cree_par),
           'demande_activation', p.demande_id,
           'demande_activation_statut', (select d.statut from public.demandes_validation d where d.id = p.demande_id),
           'revoquee_le', p.revoquee_le, 'motif_revocation', p.motif_revocation,
           'envoyees_seules_mois', (select count(*) from public.demandes_validation d
                                    where d.politique_id = p.id
                                      and d.cree_le >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'),
           'nombre_mensuel', p.nombre_mensuel)
         order by s.ordre, s.code), '[]'::jsonb)
  from s
  left join p on p.type_action = s.type_action and p.rang = 1
$function$;

create or replace function public.reput_donner_accord(p_client uuid, p_sujet text, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_code text := lower(btrim(p_sujet));
  v_libelle text;
  v_ok boolean;
  v_ref text;
  v_type text;
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Un accord permanent se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if v_code in ('accuse', 'demande_avis') then
    v_libelle := case v_code when 'accuse' then 'accusés de réception' else 'demandes d''avis' end;
    v_ok := true;
    v_ref := p_client::text;
  else
    select s.libelle, s.autorisable and s.actif, s.id::text into v_libelle, v_ok, v_ref
    from public.reput_sujets s where s.client_id = p_client and s.code = v_code;
    if v_libelle is null then
      raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
    end if;
  end if;
  if not v_ok then
    raise exception 'Le sujet « % » ne peut pas partir sans relecture.', v_libelle using errcode = '42501';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  v_type := private.reput_type_accord(v_code);
  perform pg_advisory_xact_lock(hashtextextended('reput.accord:' || p_client::text || ':' || v_code, 0));
  insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, actif)
  select p_client, null, 'reput', 'politique.activer', 1, array['gerant', 'admin', 'valideur'], true
  where not exists (select 1 from public.regles_validation r
                    where r.client_id = p_client and r.module = 'reput' and r.type_action = 'politique.activer'
                      and r.entite_id is null and r.actif);
  if not exists (select 1 from public.politiques p
                 where p.client_id = p_client and p.module = 'reput' and p.type_action = v_type
                   and p.entite_id is not distinct from p_entite
                   and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days'))) then
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, p_entite, 'reput', v_type,
            left('Accord permanent : ' || case when v_code in ('accuse', 'demande_avis') then v_libelle || ' envoyés sans relecture'
                                               else 'réponses « ' || v_libelle || ' » envoyées sans relecture' end, 200),
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_donne', 'reput_sujets', v_ref,
      jsonb_build_object('sujet', v_code, 'type_action', v_type, 'politique', v_id, 'entite', p_entite, 'par', v_uid), p_entite);
  end if;
  return jsonb_build_object('sujet', v_code, 'proposee', v_id, 'sujets', private.reput_accords_etat(p_client));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_cles_contact(text, text, jsonb) from public, anon, authenticated;
revoke execute on function private.reput_dossier_de(uuid, uuid, text[], timestamptz) from public, anon, authenticated;
revoke execute on function private.reput_precedents(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function private.reput_type_file(text, text) from public, anon, authenticated;
revoke execute on function private.reput_regrouper() from public, anon, authenticated;
grant execute on function private.reput_cles_contact(text, text, jsonb) to service_role;
grant execute on function private.reput_dossier_de(uuid, uuid, text[], timestamptz) to service_role;
grant execute on function private.reput_precedents(uuid, uuid, uuid) to service_role;
grant execute on function private.reput_type_file(text, text) to service_role;
grant execute on function private.reput_regrouper() to service_role;
revoke execute on function public.reput_router_sujet(uuid, text, uuid) from public, anon;
grant execute on function public.reput_router_sujet(uuid, text, uuid) to authenticated, service_role;
