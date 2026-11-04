-- 20261011143142 a4_34b_v2_b1_16
-- Source : dépôt : c5a99da omega/migrations/a4_34b_filed_lot26_retrait_ancien_nom.sql ; e96a659 omega/modules/varelo/migrations/b1_16_regles_groupe.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_34b_filed_lot26_retrait_ancien_nom.sql @ c5a99da, b1_16_regles_groupe.sql @ e96a659 ; b1_19 cité comme test : ignoré.
-- ═══ omega/migrations/a4_34b_filed_lot26_retrait_ancien_nom.sql @ c5a99da
-- FILED, lot 26 (a4_34b) — à poser après a4_34 (version de bfdbfe7 ou suivante).
--
-- La première pose d'a4_34 nommait la porte de décision filed_rapprocher_ligne(uuid, uuid). Ce nom est déjà celui du
-- moteur de rapprochement à trois voies d'a4_08 (private.filed_rapprocher_ligne(filed_factures, …)) : le contrôle des
-- droits (socle 44) ne peut pas les distinguer. La porte s'appelle désormais filed_regler_par_releve(uuid, uuid).
-- L'ancienne paire n'est pas supprimée (règle de pose : aucun DROP) : elle est renommée et fermée aux membres
-- (la version private reste exécutable par service_role, comme toute fonction de private). Seule la
-- signature (uuid, uuid) est touchée ; le moteur d'a4_08 reste. Idempotent.
do $$
begin
  if to_regprocedure('public.filed_rapprocher_ligne(uuid, uuid)') is not null then
    alter function public.filed_rapprocher_ligne(uuid, uuid) rename to filed_rapprocher_ligne_retiree_a4_34;
  end if;
  if to_regprocedure('private.filed_rapprocher_ligne(uuid, uuid)') is not null then
    alter function private.filed_rapprocher_ligne(uuid, uuid) rename to filed_rapprocher_ligne_retiree_a4_34;
  end if;
  if to_regprocedure('public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid)') is not null then
    revoke all on function public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) from public, anon, authenticated, service_role;
    comment on function public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) is 'Retirée (a4_34b) : remplacée par public.filed_regler_par_releve(uuid, uuid). Fermée à tous.';
  end if;
  if to_regprocedure('private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid)') is not null then
    revoke all on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) from public, anon, authenticated, service_role;
    -- Le socle (test 44) veut que service_role exécute toute fonction de private : on le lui rend, et à lui seul.
    grant execute on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) to service_role;
    comment on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) is 'Retirée (a4_34b) : remplacée par private.filed_regler_par_releve(uuid, uuid). Fermée aux membres ; service_role seul (règle du socle).';
  end if;
end $$;


-- ═══ omega/modules/varelo/migrations/b1_16_regles_groupe.sql @ e96a659
-- b1_16 — VARELO : les règles écrites une fois pour le groupe ; les sources branchées avec l'accord de la DSI
-- (11/10/2026, B1)
--
-- CE QUE ÇA CORRIGE (omega/CHIFFRAGE/varelo.md, lignes 9, 23, 25). La page promet « Une règle s'écrit une fois
-- pour le groupe et s'applique dans chaque filiale, qu'il s'agisse d'un délai de réserve, d'un préavis de contrat
-- ou d'un seuil d'encours » et « Chaque source se branche avec l'accord de la DSI et se débranche de la même
-- façon ». Jusqu'ici, ces trois réglages se posaient contrat par contrat ou client par client, et le gérant
-- branchait seul ; débrancher n'existait pas.
--
-- CE QUE ÇA POSE (après b1_15) :
--   · public.grp_reglages (une ligne par groupe), porte grp_regler_groupe (gérant, administrateur) :
--       preavis_valeur / preavis_unite  → préavis d'un contrat enregistré sans préavis (grp_enregistrer_contrat) ;
--       contrat_jours_decision          → la dénonciation est proposée d'office N jours avant la date limite (15) ;
--       plafond_defaut                  → plafond d'encours de tout client du groupe qui n'a pas le sien
--                                         (vue grp_encours_groupe : colonne plafond_source « objet » | « groupe ») ;
--       reserve_jours                   → délai interne de réserve : la protestation est due au plus tard N jours
--                                         après la livraison, si c'est plus tôt que le délai légal (le calcul garde
--                                         l'échéance légale et la règle du groupe).
--   · L'équipe « dsi » (Direction des systèmes d'information) dans chaque groupe installé.
--   · public.grp_sources_demandes et la porte grp_demander_source(client, genre brancher|debrancher, …) : la
--     demande part dans la file du socle (types varelo.brancher, varelo.debrancher), routée vers l'équipe dsi ;
--     à l'accord, le travail varelo.decision branche (private.brancher, ou réactive un branchement débranché) ou
--     débranche (statut « debranche ») ; journal varelo.source.*.
-- Remplace grp_enregistrer_contrat (b1_05), grp_proposer_du_jour et grp_executer_decision (b1_15), la vue
-- grp_encours_groupe (b1_04, colonne ajoutée en dernier).
--
-- Règles de pose : create … if not exists ; create or replace ; on conflict do nothing ; aucune suppression.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les règles du groupe
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_reglages (
  client_id uuid primary key references public.clients(id) on delete cascade,
  preavis_valeur smallint,
  preavis_unite text,
  contrat_jours_decision smallint not null default 15,
  plafond_defaut numeric(16,2),
  reserve_jours smallint,
  regle_par uuid,
  regle_le timestamptz not null default now(),
  constraint grp_reglages_preavis_check check (preavis_valeur between 0 and 730),
  constraint grp_reglages_preavis_unite_check check (preavis_unite in ('jours', 'mois')),
  constraint grp_reglages_preavis_ensemble check ((preavis_valeur is null) = (preavis_unite is null)),
  constraint grp_reglages_jours_decision_check check (contrat_jours_decision between 1 and 120),
  constraint grp_reglages_plafond_check check (plafond_defaut > 0),
  constraint grp_reglages_reserve_check check (reserve_jours between 1 and 30)
);
comment on table public.grp_reglages is 'VARELO — les règles écrites une fois pour le groupe et appliquées dans chaque société : préavis par défaut des contrats, délai de proposition de la dénonciation, plafond d''encours par défaut, délai interne de réserve. Écrite par grp_regler_groupe.';

create or replace trigger grp_reglages_tracer after insert or update on public.grp_reglages
  for each row execute function private.tracer();

alter table public.grp_reglages enable row level security;
revoke all on public.grp_reglages from anon, authenticated;
grant select on public.grp_reglages to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_reglages'
                 and policyname = 'membres lisent les regles du groupe') then
    create policy "membres lisent les regles du groupe" on public.grp_reglages
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $$;

create or replace function private.grp_regler_groupe(p_client uuid, p_champs jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_avant public.grp_reglages;
  v_apres public.grp_reglages;
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les règles du groupe se posent par le gérant ou l''administrateur.' using errcode = '42501';
  end if;
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les règles se donnent en objet JSON.' using errcode = '22023';
  end if;
  select * into v_avant from public.grp_reglages where client_id = p_client;
  perform set_config('omega.module', 'varelo', true);
  begin
    insert into public.grp_reglages as r (client_id, preavis_valeur, preavis_unite, contrat_jours_decision, plafond_defaut, reserve_jours, regle_par, regle_le)
    values (p_client,
            case when f ? 'preavis_valeur' then nullif(f ->> 'preavis_valeur', '')::smallint else v_avant.preavis_valeur end,
            case when f ? 'preavis_unite' then nullif(f ->> 'preavis_unite', '') else v_avant.preavis_unite end,
            case when f ? 'contrat_jours_decision' then coalesce(nullif(f ->> 'contrat_jours_decision', '')::smallint, 15) else coalesce(v_avant.contrat_jours_decision, 15) end,
            case when f ? 'plafond_defaut' then round(nullif(f ->> 'plafond_defaut', '')::numeric, 2) else v_avant.plafond_defaut end,
            case when f ? 'reserve_jours' then nullif(f ->> 'reserve_jours', '')::smallint else v_avant.reserve_jours end,
            v_uid, now())
    on conflict (client_id) do update set preavis_valeur = excluded.preavis_valeur, preavis_unite = excluded.preavis_unite,
      contrat_jours_decision = excluded.contrat_jours_decision, plafond_defaut = excluded.plafond_defaut,
      reserve_jours = excluded.reserve_jours, regle_par = excluded.regle_par, regle_le = now()
    returning * into v_apres;
  exception
    when check_violation then
      raise exception 'Règles refusées : %', case
        when sqlerrm like '%preavis_ensemble%' then 'un préavis se donne avec son unité (jours ou mois).'
        when sqlerrm like '%preavis_unite%' then 'un préavis se compte en jours ou en mois.'
        when sqlerrm like '%preavis_check%' then 'un préavis va de 0 à 730.'
        when sqlerrm like '%jours_decision%' then 'la dénonciation se propose de 1 à 120 jours avant la date limite.'
        when sqlerrm like '%plafond%' then 'un plafond par défaut est un montant positif (vide : aucun).'
        when sqlerrm like '%reserve%' then 'un délai interne de réserve va de 1 à 30 jours (vide : le délai légal seul).'
        else sqlerrm end using errcode = '22023';
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Règles refusées : un nombre est illisible.' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.reglages', 'grp_reglages', p_client::text,
    jsonb_build_object('avant', case when v_avant.client_id is not null then to_jsonb(v_avant) - 'client_id' - 'regle_par' - 'regle_le' end,
                       'apres', to_jsonb(v_apres) - 'client_id' - 'regle_par' - 'regle_le'));
  perform private.grp_controler_encours(p_client);
  return to_jsonb(v_apres) - 'client_id';
end $function$;

create or replace function public.grp_regler_groupe(p_client uuid, p_champs jsonb)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_regler_groupe(p_client, p_champs) $function$;

-- Le délai interne de réserve : posé à l'enregistrement d'une livraison à examiner, s'il tombe avant le délai légal.
create or replace function private.grp_receptions_regle_groupe()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jours smallint;
begin
  if new.statut <> 'a_examiner' or new.echeance is null then
    return new;
  end if;
  select r.reserve_jours into v_jours from public.grp_reglages r where r.client_id = new.client_id;
  if v_jours is null or new.date_reception + v_jours >= new.echeance then
    return new;
  end if;
  new.calcul := coalesce(new.calcul, '{}'::jsonb) || jsonb_build_object(
    'echeance_legale', new.echeance, 'regle_groupe', v_jours,
    'detail', coalesce(new.calcul ->> 'detail', '') || format(' ; règle du groupe : %s jour%s après la livraison, soit le %s', v_jours,
                                                           case when v_jours > 1 then 's' else '' end, to_char(new.date_reception + v_jours, 'DD/MM/YYYY')));
  new.echeance := new.date_reception + v_jours;
  return new;
end $function$;

create or replace trigger grp_receptions_regle_groupe before insert on public.grp_receptions
  for each row execute function private.grp_receptions_regle_groupe();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les sources, branchées et débranchées avec l'accord de la DSI
-- ─────────────────────────────────────────────────────────────────────────

insert into public.equipes (client_id, cle, nom)
select i.client_id, 'dsi', 'Direction des systèmes d''information' from public.grp_installations i
on conflict (client_id, cle) do nothing;

create table if not exists public.grp_sources_demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  genre text not null,
  logiciel text not null,
  jeux text[],
  libelle text not null,
  branchement_id uuid,
  demande_id uuid,
  statut text not null default 'en_attente',
  resultat jsonb,
  motif text,
  propose_par uuid,
  propose_le timestamptz not null default now(),
  decide_le timestamptz,
  constraint grp_sources_demandes_client_id_id_key unique (client_id, id),
  constraint grp_sources_demandes_demande_key unique (demande_id),
  constraint grp_sources_demandes_genre_check check (genre in ('brancher', 'debrancher')),
  constraint grp_sources_demandes_statut_check check (statut in ('en_attente', 'executee', 'rejetee', 'expiree', 'echec')),
  constraint grp_sources_demandes_libelle_check check (char_length(btrim(libelle)) between 1 and 200),
  constraint grp_sources_demandes_motif_check check (char_length(motif) <= 2000)
);
comment on table public.grp_sources_demandes is 'VARELO — une demande de branchement ou de débranchement d''une source (logiciel d''une société), validée par la DSI dans la file du socle, puis exécutée. Écrite par grp_demander_source et grp_executer_source.';

create unique index if not exists grp_sources_demandes_une_ouverte on public.grp_sources_demandes (client_id, logiciel, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where statut = 'en_attente';

create or replace trigger grp_sources_demandes_tracer after insert or update on public.grp_sources_demandes
  for each row execute function private.tracer();

alter table public.grp_sources_demandes enable row level security;
revoke all on public.grp_sources_demandes from anon, authenticated;
grant select on public.grp_sources_demandes to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_sources_demandes'
                 and policyname = 'membres lisent les demandes de sources') then
    create policy "membres lisent les demandes de sources" on public.grp_sources_demandes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and (entite_id is null or private.voit_entite(client_id, entite_id)));
  end if;
end $$;

create or replace function private.grp_demander_source(p_client uuid, p_genre text, p_entite uuid, p_logiciel text,
                                                       p_jeux text[] default null::text[], p_motif text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  b public.branchements;
  v_dsi uuid;
  v_nom text;
  v_libelle text;
  v_id uuid := gen_random_uuid();
  v_demande uuid;
  v_statut text;
  v_existe public.grp_sources_demandes;
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null and not (private.a_un_role(p_client, array['gerant', 'admin'])
       or (private.a_un_role(p_client, array['valideur'])
           and exists (select 1 from public.equipes e where e.client_id = p_client and e.cle = 'dsi' and private.dans_equipe(v_uid, e.id)))) then
    raise exception 'Un branchement se demande par le gérant, l''administrateur ou la DSI.' using errcode = '42501';
  end if;
  if p_genre not in ('brancher', 'debrancher') then
    raise exception 'Demande inconnue : brancher ou debrancher (%).', p_genre using errcode = '22023';
  end if;
  if p_logiciel is null or p_logiciel !~ '^[a-z][a-z0-9_]{1,39}$' then
    raise exception 'Logiciel illisible (%).', p_logiciel using errcode = '22023';
  end if;
  if p_entite is not null then
    if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
      raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
    end if;
    if v_uid is not null and not private.voit_entite(p_client, p_entite) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  select * into b from public.branchements x
  where x.client_id = p_client and x.module = 'varelo' and x.logiciel = p_logiciel and x.entite_id is not distinct from p_entite;
  if p_genre = 'brancher' then
    if b.id is not null and b.statut = 'actif' then
      raise exception 'Ce logiciel est déjà branché pour cette société.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.modeles_jeux m where m.module = 'varelo' and m.logiciel = p_logiciel) then
      raise exception 'Aucun modèle d''export Varelo pour « % ».', p_logiciel using errcode = 'P0002';
    end if;
  elsif b.id is null or b.statut = 'debranche' then
    raise exception 'Ce logiciel n''est pas branché pour cette société.' using errcode = '22023';
  end if;
  select * into v_existe from public.grp_sources_demandes d
  where d.client_id = p_client and d.logiciel = p_logiciel and d.entite_id is not distinct from p_entite and d.statut = 'en_attente';
  if v_existe.id is not null then
    return jsonb_build_object('source', v_existe.id, 'demande', v_existe.demande_id, 'deja', true);
  end if;
  select e.nom into v_nom from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_libelle := left(format('%s — %s', p_logiciel, coalesce(v_nom, 'groupe')), 200);
  insert into public.equipes (client_id, cle, nom) values (p_client, 'dsi', 'Direction des systèmes d''information')
  on conflict (client_id, cle) do nothing;
  select e.id into v_dsi from public.equipes e where e.client_id = p_client and e.cle = 'dsi';
  perform private.grp_regle_decision(p_client, 'varelo.' || p_genre, 'dsi');
  perform set_config('omega.module', 'varelo', true);
  insert into public.grp_sources_demandes (id, client_id, entite_id, genre, logiciel, jeux, libelle, branchement_id, motif, propose_par)
  values (v_id, p_client, p_entite, p_genre, p_logiciel, p_jeux, v_libelle, b.id, left(nullif(btrim(p_motif), ''), 2000), v_uid);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
  values (p_client, p_entite, 'varelo', 'varelo.' || p_genre, 'grp_sources_demandes', v_id::text,
          left(case p_genre when 'brancher' then format('Brancher en lecture seule %s : ses exports (%s) entreront dans Varelo.', v_libelle,
                                                        coalesce(array_to_string(p_jeux, ', '), 'tous les jeux du modèle'))
                            else format('Débrancher %s : plus aucun export ne sera lu.', v_libelle) end, 500),
          jsonb_build_object('source', v_id, 'genre', p_genre, 'logiciel', p_logiciel, 'jeux', to_jsonb(p_jeux), 'motif', p_motif),
          'varelo:source:' || v_id::text)
  returning id, statut into v_demande, v_statut;
  update public.grp_sources_demandes set demande_id = v_demande where id = v_id;
  perform private.grp_journal(p_client, 'varelo.source.demandee', 'grp_sources_demandes', v_id::text,
    jsonb_build_object('genre', p_genre, 'logiciel', p_logiciel, 'jeux', to_jsonb(p_jeux), 'demande', v_demande), p_entite);
  return jsonb_build_object('source', v_id, 'demande', v_demande, 'statut', v_statut, 'deja', false);
end $function$;

create or replace function public.grp_demander_source(p_client uuid, p_genre text, p_entite uuid, p_logiciel text,
                                                      p_jeux text[] default null::text[], p_motif text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_demander_source(p_client, p_genre, p_entite, p_logiciel, p_jeux, p_motif) $function$;

create or replace function private.grp_executer_source(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.grp_sources_demandes;
  v_statut text := p_charge ->> 'statut';
  v_motif text;
  v_b uuid;
  v_res jsonb;
  v_final text;
begin
  select * into d from public.grp_sources_demandes where demande_id = nullif(p_charge ->> 'demande', '')::uuid for update;
  if d.statut <> 'en_attente' then
    return jsonb_build_object('source', d.id, 'deja', d.statut);
  end if;
  select a.commentaire into v_motif from public.approbations a where a.demande_id = d.demande_id order by a.decide_le desc limit 1;
  perform set_config('omega.module', 'varelo', true);
  if v_statut = 'approuvee' then
    begin
      if d.genre = 'brancher' then
        select b.id into v_b from public.branchements b
        where b.client_id = d.client_id and b.module = 'varelo' and b.logiciel = d.logiciel and b.entite_id is not distinct from d.entite_id;
        if v_b is not null then
          update public.branchements set statut = 'actif', maj_le = now() where id = v_b;
        else
          v_b := private.brancher(d.client_id, 'varelo', d.logiciel, 'exports', d.libelle, d.entite_id, null, d.jeux);
        end if;
        v_res := jsonb_build_object('branchement', v_b, 'statut', 'actif');
      else
        update public.branchements set statut = 'debranche', maj_le = now()
        where id = d.branchement_id and client_id = d.client_id and module = 'varelo';
        v_b := d.branchement_id;
        v_res := jsonb_build_object('branchement', v_b, 'statut', 'debranche');
      end if;
      v_final := 'executee';
      update public.demandes_validation set statut = 'executee' where id = d.demande_id and statut = 'approuvee';
    exception when others then
      v_res := jsonb_build_object('erreur', left(sqlerrm, 480));
      v_final := 'echec';
      update public.demandes_validation set statut = 'echec_execution', motif_echec = left('Varelo : ' || sqlerrm, 480)
      where id = d.demande_id and statut = 'approuvee';
    end;
  elsif v_statut = 'rejetee' then
    v_final := 'rejetee';
    v_res := jsonb_build_object('source', 'inchangée');
  else
    v_final := 'expiree';
    v_res := jsonb_build_object('demande', v_statut);
  end if;
  update public.grp_sources_demandes
     set statut = v_final, resultat = v_res, branchement_id = coalesce(v_b, branchement_id), motif = coalesce(left(v_motif, 2000), motif),
         decide_le = coalesce(nullif(p_charge ->> 'decide_le', '')::timestamptz, now())
   where id = d.id;
  perform private.grp_journal(d.client_id, 'varelo.source.' || case when v_final = 'executee' then d.genre else v_final end,
    'grp_sources_demandes', d.id::text, jsonb_build_object('logiciel', d.logiciel, 'demande', d.demande_id, 'resultat', v_res), d.entite_id);
  return jsonb_build_object('source', d.id, 'statut', v_final, 'resultat', v_res);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les fonctions et la vue remplacées (b1_05, b1_15, b1_04)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_enregistrer_contrat(p_client uuid, p_entite uuid, p_champs jsonb, p_contrat uuid default null::uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant public.grp_contrats;
  v_objet public.grp_ref_objets;
  v_id uuid;
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_texte text;
  v_date date;
  v_nombre numeric;
  v_entite uuid := p_entite;
  v_reg public.grp_reglages;
begin
  select * into v_reg from public.grp_reglages r where r.client_id = p_client;
  perform private.grp_exiger_installation(p_client);
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les champs d''un contrat se donnent en objet JSON.' using errcode = '22023';
  end if;
  if p_contrat is not null then
    select * into v_avant from public.grp_contrats k where k.id = p_contrat and k.client_id = p_client;
    if v_avant.id is null then
      raise exception 'Contrat introuvable.' using errcode = 'P0002';
    end if;
    if v_avant.statut = 'archive' then
      raise exception 'Ce contrat est archivé : il ne se corrige plus.' using errcode = '22023';
    end if;
    v_entite := coalesce(p_entite, v_avant.entite_id);
  end if;
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Un contrat s''enregistre par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, v_entite) or (v_avant.id is not null and not private.voit_entite(p_client, v_avant.entite_id)) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = v_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  -- le tiers : un objet du référentiel (fournisseur ou client du groupe), sinon un libellé
  if f ? 'objet_id' and nullif(f ->> 'objet_id', '') is not null then
    begin
      select * into v_objet from public.grp_ref_objets o where o.id = (f ->> 'objet_id')::uuid and o.client_id = p_client;
    exception when invalid_text_representation then
      raise exception 'Identifiant d''objet illisible.' using errcode = '22023';
    end;
    if v_objet.id is null or v_objet.nature not in ('fournisseur', 'client') or v_objet.statut <> 'actif' then
      raise exception 'Le tiers d''un contrat est un fournisseur ou un client actif du référentiel du groupe.' using errcode = '22023';
    end if;
  end if;
  perform set_config('omega.module', 'varelo', true);
  begin
    if p_contrat is null then
      insert into public.grp_contrats (client_id, entite_id, nature, objet_id, tiers, intitule, reference, categorie, date_debut,
        date_echeance, reconduction, duree_reconduction_mois, preavis_valeur, preavis_unite, montant_annuel, notes, cree_par)
      values (p_client, v_entite, v_objet.nature, v_objet.id,
        left(nullif(btrim(f ->> 'tiers'), ''), 200),
        btrim(coalesce(f ->> 'intitule', '')),
        left(nullif(btrim(f ->> 'reference'), ''), 80),
        coalesce(nullif(f ->> 'categorie', ''), 'autre'),
        nullif(f ->> 'date_debut', '')::date,
        nullif(f ->> 'date_echeance', '')::date,
        coalesce(nullif(f ->> 'reconduction', ''), 'tacite'),
        coalesce(nullif(f ->> 'duree_reconduction_mois', '')::smallint, 12),
        coalesce(nullif(f ->> 'preavis_valeur', '')::smallint, v_reg.preavis_valeur, 3),
        coalesce(nullif(f ->> 'preavis_unite', ''), v_reg.preavis_unite, 'mois'),
        round(nullif(f ->> 'montant_annuel', '')::numeric, 2),
        nullif(btrim(f ->> 'notes'), ''),
        v_uid)
      returning id into v_id;
    else
      update public.grp_contrats k set
        entite_id = v_entite,
        nature = case when f ? 'objet_id' then v_objet.nature else k.nature end,
        objet_id = case when f ? 'objet_id' then v_objet.id else k.objet_id end,
        tiers = case when f ? 'tiers' then left(nullif(btrim(f ->> 'tiers'), ''), 200) else k.tiers end,
        intitule = case when f ? 'intitule' then btrim(coalesce(f ->> 'intitule', '')) else k.intitule end,
        reference = case when f ? 'reference' then left(nullif(btrim(f ->> 'reference'), ''), 80) else k.reference end,
        categorie = case when f ? 'categorie' then coalesce(nullif(f ->> 'categorie', ''), 'autre') else k.categorie end,
        date_debut = case when f ? 'date_debut' then nullif(f ->> 'date_debut', '')::date else k.date_debut end,
        date_echeance = case when f ? 'date_echeance' then nullif(f ->> 'date_echeance', '')::date else k.date_echeance end,
        reconduction = case when f ? 'reconduction' then coalesce(nullif(f ->> 'reconduction', ''), 'tacite') else k.reconduction end,
        duree_reconduction_mois = case when f ? 'duree_reconduction_mois' then coalesce(nullif(f ->> 'duree_reconduction_mois', '')::smallint, 12) else k.duree_reconduction_mois end,
        preavis_valeur = case when f ? 'preavis_valeur' then coalesce(nullif(f ->> 'preavis_valeur', '')::smallint, v_reg.preavis_valeur, 3) else k.preavis_valeur end,
        preavis_unite = case when f ? 'preavis_unite' then coalesce(nullif(f ->> 'preavis_unite', ''), v_reg.preavis_unite, 'mois') else k.preavis_unite end,
        montant_annuel = case when f ? 'montant_annuel' then round(nullif(f ->> 'montant_annuel', '')::numeric, 2) else k.montant_annuel end,
        notes = case when f ? 'notes' then nullif(btrim(f ->> 'notes'), '') else k.notes end,
        maj_le = now()
      where k.id = p_contrat
      returning k.id into v_id;
    end if;
  exception
    when not_null_violation then
      raise exception 'Un contrat a une date d''échéance (la fin de la période en cours).' using errcode = '22023';
    when check_violation then
      raise exception 'Contrat refusé : %', case
        when sqlerrm like '%tiers_present%' then 'il faut un tiers (un objet du référentiel ou un libellé).'
        when sqlerrm like '%intitule%' then 'l''intitulé fait 1 à 200 caractères.'
        when sqlerrm like '%categorie%' then 'catégorie inconnue.'
        when sqlerrm like '%reconduction_check%' then 'reconduction tacite, expresse ou aucune.'
        when sqlerrm like '%duree%' then 'une reconduction dure de 1 à 120 mois.'
        when sqlerrm like '%preavis_check%' then 'un préavis va de 0 à 730.'
        when sqlerrm like '%preavis_unite%' then 'un préavis se compte en jours ou en mois.'
        when sqlerrm like '%montant%' then 'le montant annuel est positif.'
        when sqlerrm like '%debut_avant%' then 'le début est avant l''échéance.'
        else sqlerrm end using errcode = '22023';
    when invalid_datetime_format or datetime_field_overflow or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Contrat refusé : une date ou un nombre est illisible (dates au format AAAA-MM-JJ).' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.contrat.enregistre', 'grp_contrats', v_id::text,
    jsonb_build_object('creation', p_contrat is null, 'champs', f - 'notes'), v_entite);
  perform private.grp_controler_contrats(p_client);
  return v_id;
end $function$;

create or replace function private.grp_proposer_du_jour(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v jsonb;
  n integer := 0;
begin
  for x in
    select 'denoncer_contrat' as genre, c.id from public.grp_contrats_echeancier c
    where c.client_id = p_client and c.statut = 'actif' and c.reconduction = 'tacite' and c.jours_restants between 0 and coalesce((select r.contrat_jours_decision from public.grp_reglages r where r.client_id = p_client), 15)
    union all
    select 'protester_reception', r.id from public.grp_reserves r
    where r.client_id = p_client and r.statut = 'a_examiner'
  loop
    begin
      v := private.grp_proposer_decision(p_client, x.genre, x.id, '{}'::jsonb, true);
      if not (v ->> 'deja')::boolean then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(p_client, 'varelo', 'attention', 'Une décision n''a pas pu être proposée d''office.',
        jsonb_build_object('genre', x.genre, 'objet', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'decision:' || x.id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

create or replace function private.grp_executer_decision(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.grp_decisions;
  v_statut text := p_charge ->> 'statut';
  v_motif text;
  v_res jsonb;
  v_final text;
begin
  if exists (select 1 from public.grp_sources_demandes s where s.demande_id = nullif(p_charge ->> 'demande', '')::uuid) then
    return private.grp_executer_source(p_charge);
  end if;
  select * into d from public.grp_decisions where demande_id = nullif(p_charge ->> 'demande', '')::uuid for update;
  if d.id is null then
    return jsonb_build_object('ignore', 'pas une décision Varelo');
  end if;
  if d.statut <> 'en_attente' then
    return jsonb_build_object('decision', d.id, 'deja', d.statut);
  end if;
  select a.commentaire into v_motif from public.approbations a where a.demande_id = d.demande_id order by a.decide_le desc limit 1;
  perform set_config('omega.module', 'varelo', true);
  if v_statut = 'approuvee' then
    begin
      if d.genre = 'relever_plafond' then
        v_res := private.grp_regler_plafond(d.objet_id, (d.details ->> 'plafond')::numeric, null,
                                            left('Validé par la direction financière' || coalesce(' : ' || v_motif, ''), 500));
        v_final := 'executee';
      elsif d.genre = 'denoncer_contrat' then
        v_res := jsonb_build_object('a_faire', format('Envoyer la dénonciation avant le %s, puis la noter sur le contrat.', to_char(d.echeance, 'DD/MM/YYYY')));
        v_final := 'approuvee';
      else
        v_res := jsonb_build_object('a_faire', format('Envoyer la lettre de protestation avant le %s, puis la noter sur la livraison.', to_char(d.echeance, 'DD/MM/YYYY')));
        v_final := 'approuvee';
      end if;
      update public.demandes_validation set statut = 'executee' where id = d.demande_id and statut = 'approuvee';
    exception when others then
      v_res := jsonb_build_object('erreur', left(sqlerrm, 480));
      v_final := 'echec';
      update public.demandes_validation set statut = 'echec_execution', motif_echec = left('Varelo : ' || sqlerrm, 480)
      where id = d.demande_id and statut = 'approuvee';
    end;
  elsif v_statut = 'rejetee' then
    v_final := 'rejetee';
    if d.genre = 'protester_reception' then
      begin
        perform private.grp_classer_reception(d.objet_id, left('Protestation refusée par la direction' || coalesce(' : ' || v_motif, '.'), 500));
        v_res := jsonb_build_object('reception', 'classee sans suite');
      exception when others then
        v_res := jsonb_build_object('reception', left(sqlerrm, 300));
      end;
    elsif d.genre = 'denoncer_contrat' then
      v_res := jsonb_build_object('contrat', 'reconduction acceptée');
    else
      v_res := jsonb_build_object('plafond', 'inchangé');
    end if;
  else
    v_final := case when v_statut in ('expiree', 'annulee') then v_statut else 'expiree' end;
    v_res := jsonb_build_object('demande', v_statut);
  end if;
  update public.grp_decisions
     set statut = v_final, resultat = v_res, motif = left(v_motif, 2000), decide_le = coalesce(nullif(p_charge ->> 'decide_le', '')::timestamptz, now()),
         execute_le = case when v_final in ('executee', 'approuvee', 'rejetee') then now() end
   where id = d.id;
  perform private.grp_journal(d.client_id, 'varelo.decision.' || v_final, 'grp_decisions', d.id::text,
    jsonb_build_object('genre', d.genre, 'objet', d.objet_id, 'demande', d.demande_id, 'resultat', v_res, 'motif', left(v_motif, 500)), d.entite_id);
  return jsonb_build_object('decision', d.id, 'statut', v_final, 'resultat', v_res);
end $function$;

create or replace view public.grp_encours_groupe with (security_invoker = true) as
  select p.client_id, p.nature, p.objet_id, p.code_groupe, p.nom_groupe, p.intragroupe,
         count(distinct p.entite_id)::integer as societes,
         count(*)::integer as codes,
         sum(p.total) as total, sum(p.non_echu) as non_echu, sum(p.echu) as echu,
         sum(p.echu_plus) as echu_plus_90,
         min(p.arrete_le) as plus_ancien_arrete,
         bool_or(p.etat = 'propose') as provisoire,
         coalesce(f.plafond, case when p.nature = 'client' and not p.intragroupe then rg.plafond_defaut end)::numeric(16,2) as plafond, f.plafond_echu,
         coalesce(sum(p.total) > coalesce(f.plafond, case when p.nature = 'client' and not p.intragroupe then rg.plafond_defaut end)
                  or (f.plafond_echu is not null and sum(p.echu) > f.plafond_echu), false) as depasse,
         case when f.plafond is not null then 'objet' when p.nature = 'client' and not p.intragroupe and rg.plafond_defaut is not null then 'groupe' end as plafond_source
  from public.grp_encours_par_code p
  left join public.grp_encours_plafonds f on f.client_id = p.client_id and f.objet_id = p.objet_id and f.actif
  left join public.grp_reglages rg on rg.client_id = p.client_id
  where p.objet_id is not null
  group by p.client_id, p.nature, p.objet_id, p.code_groupe, p.nom_groupe, p.intragroupe, f.plafond, f.plafond_echu, rg.plafond_defaut;

comment on view public.grp_encours_groupe is 'VARELO — l''encours d''un client ou d''un fournisseur du groupe, toutes sociétés confondues (celles du périmètre de la personne), avec son plafond (le sien, sinon celui du groupe : plafond_source) et le dépassement. provisoire : un des codes n''est que proposé sur cet objet, en attente du référent.';
revoke all on public.grp_encours_groupe from anon, authenticated;
grant select on public.grp_encours_groupe to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Droits
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_receptions_regle_groupe() from public, anon, authenticated;
revoke execute on function private.grp_executer_source(jsonb) from public, anon, authenticated;
revoke execute on function private.grp_executer_decision(jsonb) from public, anon, authenticated;
revoke execute on function private.grp_proposer_du_jour(uuid) from public, anon, authenticated;
grant execute on function private.grp_executer_source(jsonb) to service_role;
grant execute on function private.grp_executer_decision(jsonb) to service_role;
grant execute on function private.grp_proposer_du_jour(uuid) to service_role;

revoke execute on function private.grp_regler_groupe(uuid, jsonb) from public, anon;
revoke execute on function private.grp_demander_source(uuid, text, uuid, text, text[], text) from public, anon;
grant execute on function private.grp_regler_groupe(uuid, jsonb) to authenticated, service_role;
grant execute on function private.grp_demander_source(uuid, text, uuid, text, text[], text) to authenticated, service_role;
revoke execute on function public.grp_regler_groupe(uuid, jsonb) from public, anon;
revoke execute on function public.grp_demander_source(uuid, text, uuid, text, text[], text) from public, anon;
grant execute on function public.grp_regler_groupe(uuid, jsonb) to authenticated, service_role;
grant execute on function public.grp_demander_source(uuid, text, uuid, text, text[], text) to authenticated, service_role;
