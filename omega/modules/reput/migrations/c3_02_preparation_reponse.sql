-- c3_02 — REPUT : la réponse préparée dans la minute, déposée dans la file de validation (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT. Une demande reçue (public.receptions, module reput) reçoit dans la minute une réponse
-- RÉDIGÉE par le modèle à partir de la base de connaissances du client (c3_01), classée par sujet, dans la
-- langue de la demande, sourcée (les fiches citées), ou un « je ne sais pas, nous revenons vers vous »
-- quand la base ne couvre pas la question. Elle est déposée en envoi « a_valider », sur le même canal que
-- la demande. Elle ne part seule que si une politique (accord permanent) du socle couvre son sujet (c3_03).
--
-- LE CIRCUIT.
--   reception.nouvelle → travail reput.preparer (c3_01) → fonction Edge reput-reponse :
--     1. public.reput_commencer(p_reception)            → la demande REPUT, la réception, la base en vigueur
--     2. le modèle rédige (outil rediger_reponse)
--     3. public.reput_deposer_reponse(p_demande, p_resultat, p_version)
--          · contrôle le résultat (sujet connu, sources = fiches validées en vigueur, langue couverte) ;
--          · assemble le message : formule d'appel, corps, formule de politesse, signature, mention de la
--            réponse automatisée — ceux des réglages de l'entité (c3_01) ;
--          · dépose une demande de validation du socle, type_action « reput.repondre.<sujet> » si la réponse
--            est couverte par la base et le sujet autorisable, sinon « reput.transferer » (jamais couvert par
--            un accord permanent, c3_03) ; objet reput_demandes / <id> ;
--          · prépare l'envoi ADOSSÉ à cette demande (public.preparer_envoi du socle, option demande) :
--            l'envoi naît « a_valider » ; si une politique couvre la demande, il est validé aussitôt et
--            passe par les verrous du socle (heures, santé 19ab, D6, consentement…).
--          · lève une alerte au client quand la demande doit être traitée par une personne (hors base,
--            réclamation, urgence, sans adresse de réponse, envoi bloqué).
--     4. public.reput_marquer_echec(p_demande, p_motif) si le travail échoue définitivement.
--   private.reput_synchroniser() (cron reput-synchro, chaque minute) : recopie la décision de la file
--   (approuvée, rejetée, expirée) et le sort de l'envoi (envoyé, bloqué…) sur la réponse et la demande ;
--   la réception passe « traitee » quand la réponse est partie.
--
-- AUCUN CONTENU AU JOURNAL : le journal opposable reçoit les identifiants, le sujet, l'état, jamais le texte.
--
-- Règles de pose : create … if not exists / create or replace / on conflict ; ni DROP ni DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reput_demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  reception_id bigint not null references public.receptions(id) on delete cascade,
  canal text not null,
  canal_reponse text,
  adresse_reponse text,
  de_nom text,
  objet text,
  statut text not null default 'a_preparer',
  sujet text,
  langue text,
  urgence boolean not null default false,
  couverte boolean,
  motif text,
  recu_le timestamptz not null,
  preparee_le timestamptz,
  decidee_le timestamptz,
  envoyee_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_demandes_reception_key unique (client_id, reception_id),
  constraint reput_demandes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_demandes_canal_check check (canal in ('email', 'whatsapp', 'sms', 'formulaire')),
  constraint reput_demandes_canal_reponse_check check (canal_reponse is null or canal_reponse in ('email', 'whatsapp', 'sms')),
  constraint reput_demandes_adresse_check check ((canal_reponse is null) = (adresse_reponse is null)),
  constraint reput_demandes_statut_check check (statut in ('a_preparer', 'a_valider', 'a_traiter', 'validee', 'envoyee', 'refusee', 'bloquee', 'ignoree')),
  constraint reput_demandes_langue_check check (langue is null or langue ~ '^[a-z]{2}$'),
  constraint reput_demandes_motif_check check (motif is null or char_length(motif) <= 500),
  constraint reput_demandes_objet_check check (objet is null or char_length(objet) <= 300)
);
create index if not exists reput_demandes_statut_idx on public.reput_demandes (client_id, statut, recu_le desc);

create table if not exists public.reput_reponses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  demande_id uuid not null references public.reput_demandes(id) on delete cascade,
  version integer not null default 1,
  sujet text not null,
  langue text not null,
  couverte boolean not null,
  objet text,
  brouillon text not null,
  corps text not null,
  sources uuid[] not null default '{}',
  raison text,
  type_action text not null,
  demande_validation_id uuid references public.demandes_validation(id) on delete set null,
  envoi_id uuid references public.envois(id) on delete set null,
  statut text not null default 'a_valider',
  redigee_par uuid,
  modele text,
  version_ouvrier text,
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  cout_eur numeric(12,6) not null default 0,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_reponses_version_key unique (demande_id, version),
  constraint reput_reponses_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_reponses_statut_check check (statut in ('a_valider', 'approuvee', 'envoyee', 'refusee', 'bloquee', 'remplacee', 'sans_envoi')),
  constraint reput_reponses_langue_check check (langue ~ '^[a-z]{2}$'),
  constraint reput_reponses_corps_check check (char_length(btrim(corps)) between 1 and 5000),
  constraint reput_reponses_brouillon_check check (char_length(brouillon) <= 4000),
  constraint reput_reponses_objet_check check (objet is null or char_length(objet) <= 300),
  constraint reput_reponses_raison_check check (raison is null or char_length(raison) <= 500),
  constraint reput_reponses_type_action_check check (type_action ~ '^reput\.(repondre\.[a-z][a-z0-9_]{1,39}|transferer)$'),
  constraint reput_reponses_jetons_check check (jetons_entree >= 0 and jetons_sortie >= 0 and cout_eur >= 0)
);
create index if not exists reput_reponses_demande_idx on public.reput_reponses (demande_id, version desc);
create index if not exists reput_reponses_envoi_idx on public.reput_reponses (envoi_id);
create index if not exists reput_reponses_dv_idx on public.reput_reponses (demande_validation_id);

alter table public.reput_demandes enable row level security;
alter table public.reput_reponses enable row level security;
revoke all on public.reput_demandes from authenticated, anon;
revoke all on public.reput_reponses from authenticated, anon;
grant select on public.reput_demandes to authenticated;
grant select on public.reput_reponses to authenticated;
grant all on public.reput_demandes, public.reput_reponses to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_demandes'
                 and policyname = 'membres lisent les demandes reput de leur perimetre') then
    create policy "membres lisent les demandes reput de leur perimetre" on public.reput_demandes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_reponses'
                 and policyname = 'membres lisent les reponses reput de leur perimetre') then
    create policy "membres lisent les reponses reput de leur perimetre" on public.reput_reponses
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Aides privées
-- ─────────────────────────────────────────────────────────────────────────

-- Le canal et l'adresse de la réponse : le même canal que la demande ; un formulaire répond par courriel.
create or replace function private.reput_canal_reponse(r public.receptions)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  v_de text := nullif(btrim(r.de_adresse), '');
  v_courriel text := coalesce(case when v_de ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(v_de) end,
                              case when btrim(r.detail ->> 'email') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(btrim(r.detail ->> 'email')) end);
begin
  if r.canal in ('email', 'formulaire') then
    return case when v_courriel is null then jsonb_build_object('canal', null, 'adresse', null)
                else jsonb_build_object('canal', 'email', 'adresse', v_courriel) end;
  elsif r.canal in ('whatsapp', 'sms') then
    return case when v_de is null then jsonb_build_object('canal', null, 'adresse', null)
                else jsonb_build_object('canal', r.canal, 'adresse', v_de) end;
  end if;
  return jsonb_build_object('canal', null, 'adresse', null);
end $function$;

-- Le message final : les formules et la signature des réglages, jamais celles du modèle en français.
create or replace function private.reput_assembler(p_reglages jsonb, p_langue text, p_resultat jsonb)
 returns text
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  v_appel text;
  v_politesse text;
  v_mention text := nullif(btrim(p_reglages ->> 'mention_automatisee'), '');
begin
  if p_langue = 'fr' then
    v_appel := nullif(btrim(p_reglages ->> 'formule_appel'), '');
    v_politesse := nullif(btrim(p_reglages ->> 'formule_politesse'), '');
  else
    v_appel := nullif(left(btrim(p_resultat ->> 'appel'), 200), '');
    v_politesse := nullif(left(btrim(p_resultat ->> 'politesse'), 200), '');
  end if;
  return concat_ws(E'\n\n', v_appel, btrim(p_resultat ->> 'corps'),
                   concat_ws(E'\n', v_politesse, nullif(btrim(p_reglages ->> 'signature'), '')),
                   v_mention);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Portes du serveur (fonction Edge reput-reponse, clé de service)
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Commencer : la demande REPUT de la réception (créée une fois), la réception et la base en vigueur.
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
  insert into public.reput_demandes (client_id, entite_id, reception_id, canal, canal_reponse, adresse_reponse, de_nom, objet, recu_le, langue)
  values (r.client_id, r.entite_id, r.id, r.canal, v_rep ->> 'canal', v_rep ->> 'adresse', left(r.de_nom, 200), left(r.sujet, 300),
          r.recu_le, case when r.langue ~ '^[a-z]{2}$' then r.langue end)
  on conflict (client_id, reception_id) do nothing
  returning * into d;
  if d.id is null then
    select * into d from public.reput_demandes x where x.client_id = r.client_id and x.reception_id = r.id;
    if d.statut <> 'a_preparer' then
      return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
    end if;
  else
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
    'base', v_base);
end $function$;

-- 2. Déposer la réponse rédigée. p_resultat :
--    {sujet, langue, urgence, couverte, sources: [uuid], objet, corps, appel, politesse, raison,
--     modele, tokens_entree, tokens_sortie, cout_eur}
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
  v_type := case when v_couverte and v_autorisable then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
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
    values (d.client_id, d.entite_id, 'reput', v_type, 'reput_demandes', d.id::text,
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
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
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

-- 3. Le travail a échoué pour de bon : la demande revient à une personne.
create or replace function public.reput_marquer_echec(p_demande uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  update public.reput_demandes x set statut = 'a_traiter', motif = left(coalesce(nullif(btrim(p_motif), ''), 'Préparation impossible'), 500),
         maj_le = now()
  where x.id = p_demande and x.statut = 'a_preparer'
  returning * into d;
  if d.id is null then
    return jsonb_build_object('statut', 'inchange');
  end if;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.preparation_echouee', 'reput_demandes', d.id::text,
    jsonb_build_object('motif', left(d.motif, 120)), d.entite_id);
  perform private.lever_alerte_module(d.client_id, 'reput', 'attention',
    left('Réponse non préparée, à traiter vous-même : ' || coalesce(nullif(btrim(d.de_nom), ''), 'un client'), 150),
    jsonb_build_object('demande', d.id), 'demande:' || d.id::text, true, null);
  return jsonb_build_object('statut', d.statut, 'demande', d.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La décision de la file et le sort de l'envoi, recopiés (cron chaque minute)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_synchroniser(p_client uuid default null)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_rep text;
  v_dem text;
  v_n integer := 0;
begin
  for x in
    select p.id as reponse, p.statut as rep_statut, p.client_id, p.entite_id, p.demande_id,
           dv.statut as dv_statut, dv.decide_le, e.statut as e_statut, e.verrou, e.motif as e_motif, e.envoye_le,
           d.statut as dem_statut, d.reception_id
    from public.reput_reponses p
    join public.reput_demandes d on d.id = p.demande_id
    left join public.demandes_validation dv on dv.id = p.demande_validation_id
    left join public.envois e on e.id = p.envoi_id
    where p.statut in ('a_valider', 'approuvee') and (p_client is null or p.client_id = p_client)
    for update of p skip locked
  loop
    v_rep := case
      when x.e_statut = 'envoye' then 'envoyee'
      when x.dv_statut in ('rejetee') then 'refusee'
      when x.dv_statut in ('expiree', 'annulee') then 'refusee'
      when x.e_statut in ('bloque', 'refuse', 'expire', 'echec') then 'bloquee'
      when x.e_statut = 'annule' then 'refusee'
      when x.dv_statut in ('approuvee', 'executee') or x.e_statut in ('pret', 'differe', 'en_cours') then 'approuvee'
      else x.rep_statut end;
    continue when v_rep = x.rep_statut;
    v_dem := case v_rep when 'envoyee' then 'envoyee' when 'refusee' then case when x.dv_statut = 'expiree' then 'a_traiter' else 'refusee' end
                        when 'bloquee' then 'bloquee' when 'approuvee' then 'validee' else x.dem_statut end;
    update public.reput_reponses p set statut = v_rep, maj_le = now() where p.id = x.reponse;
    update public.reput_demandes d set statut = v_dem,
           decidee_le = coalesce(d.decidee_le, x.decide_le, case when v_rep in ('approuvee', 'envoyee', 'refusee') then now() end),
           envoyee_le = case when v_rep = 'envoyee' then coalesce(x.envoye_le, now()) else d.envoyee_le end,
           motif = case when v_rep = 'bloquee' then left(coalesce(x.e_motif, x.verrou), 500)
                        when v_dem = 'a_traiter' then 'Réponse non validée à temps (expirée) : à traiter vous-même.'
                        else d.motif end,
           maj_le = now()
    where d.id = x.demande_id and d.statut in ('a_valider', 'validee');
    if v_rep = 'envoyee' then
      update public.receptions r set statut = 'traitee' where r.id = x.reception_id and r.statut in ('nouvelle', 'lue');
    end if;
    perform private.journaliser_module(x.client_id, 'reput', 'reput.reponse_' || v_rep, 'reput_demandes', x.demande_id::text,
      jsonb_build_object('reponse', x.reponse, 'decision', x.dv_statut, 'envoi_statut', x.e_statut, 'verrou', x.verrou), x.entite_id);
    if v_rep = 'bloquee' or v_dem = 'a_traiter' then
      perform private.lever_alerte_module(x.client_id, 'reput', 'attention',
        case when v_rep = 'bloquee' then 'Réponse bloquée par une règle d''envoi : à traiter vous-même'
             else 'Réponse non validée à temps : à traiter vous-même' end,
        jsonb_build_object('demande', x.demande_id, 'reponse', x.reponse, 'verrou', x.verrou), 'demande:' || x.demande_id::text, true, null);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_canal_reponse(public.receptions) from public, anon, authenticated;
revoke execute on function private.reput_assembler(jsonb, text, jsonb) from public, anon, authenticated;
revoke execute on function private.reput_synchroniser(uuid) from public, anon, authenticated;
grant execute on function private.reput_canal_reponse(public.receptions) to service_role;
grant execute on function private.reput_assembler(jsonb, text, jsonb) to service_role;
grant execute on function private.reput_synchroniser(uuid) to service_role;

revoke execute on function public.reput_commencer(bigint) from public, anon, authenticated;
revoke execute on function public.reput_deposer_reponse(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.reput_marquer_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.reput_commencer(bigint) to service_role;
grant execute on function public.reput_deposer_reponse(uuid, jsonb, text) to service_role;
grant execute on function public.reput_marquer_echec(uuid, text) to service_role;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_demandes', 'reput_reponses']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

select cron.schedule('reput-synchro', '* * * * *', $cron$select private.reput_synchroniser()$cron$)
where not exists (select 1 from cron.job where jobname = 'reput-synchro');
