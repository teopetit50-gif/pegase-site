-- 20260929023244 daliro_m0c_planning
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
-- ═══════════════════════════════════════════════════════════════════════════
-- Daliro (BTP), M0 RÉFÉRENTIEL, partie c — le planning des passages et
-- leurs dépendances, les acceptations des sous-traitants, l'étape d'un
-- chantier, la veille quotidienne du référentiel.
--
-- Plan : OMEGA/moteurs/btp.md (M0, étapes 5, 6 et 8 ; §3.3 ; battement).
-- Preuves : supabase/tests/database/daliro_m0c_planning.test.sql
--
--  · un passage : qui intervient (une équipe du client, ou un tiers de
--    l'annuaire), sur quel lot, de quand à quand ; l'import garde le nom lu
--    et le rapproche de l'annuaire, à l'identique puis par ressemblance ; ce
--    qui reste ambigu va « à ranger », jamais deviné ;
--  · chaque changement de dates, de lot ou d'intervenant fait une version
--    de plus, et défait la confirmation obtenue : un passage déplacé se
--    reconfirme (M3) ;
--  · une dépendance relie deux passages du même chantier ; la base refuse
--    dès la saisie toute boucle, sous verrou par chantier ; un gabarit de
--    séquence des corps d'état les propose, le conducteur confirme ;
--  · l'acceptation d'un sous-traitant par le maître d'ouvrage (loi
--    n° 75-1334 du 31 décembre 1975, art. 3) se tient par chantier ; en
--    marché public elle passe par un acte spécial, et le paiement direct
--    est la règle ;
--  · l'étape d'un chantier, « x sur n » : le rang du lot en cours sur le
--    nombre de lots ;
--  · chaque jour, la veille lève au client ce qui dort : un planning
--    inchangé depuis sept jours, un sous-traitant planifié sous quinze jours
--    sans attestation de vigilance ; puis elle bat (daliro_referentiel).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Outils : rapprocher un nom de l'annuaire ──────────────────────────

-- Les mots d'un nom d'entreprise ou d'équipe, sans les formes juridiques ni
-- les mots vides ; un pluriel simple est ramené au singulier.
create function private.btp_mots(p text) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_agg(distinct m order by m), '{}')
  from (select case when length(m) > 3 then regexp_replace(m, 's$', '') else m end as m
        from unnest(string_to_array(coalesce(private.btp_normaliser(p), ''), ' ')) m) x
  where m <> '' and m not in ('sarl', 'sas', 'sasu', 'eurl', 'sa', 'snc', 'sci', 'ei', 'ets', 'etablissement',
                              'entreprise', 'societe', 'ste', 'cie', 'compagnie', 'groupe', 'et', 'fil', 'frere',
                              'le', 'la', 'les', 'de', 'du', 'des', 'l', 'd', 'equipe')
$$;

-- La ressemblance de deux noms : la part des mots du plus court que l'autre
-- contient. « Dupont » ressemble entièrement à « SARL Dupont Électricité ».
create function private.btp_ressemblance(a text, b text) returns numeric
language sql immutable parallel safe set search_path = '' as $$
  select case when cardinality(ma) = 0 or cardinality(mb) = 0 then 0
              else round((select count(*) from unnest(ma) x where x = any (mb))::numeric
                         / least(cardinality(ma), cardinality(mb)), 3) end
  from (select private.btp_mots(a) as ma, private.btp_mots(b) as mb) x
$$;

-- Qui, dans l'annuaire et les équipes, ressemble à ce nom ; du plus proche
-- au plus lointain. Lisible par les membres de l'organisation et le serveur.
create function private.btp_rapprocher(p_client uuid, p_nom text)
returns table (genre text, id uuid, nom text, score numeric, mode text)
language sql stable security definer set search_path = '' as $$
  with cibles as (
    select 'tiers'::text as genre, t.id, t.nom from public.btp_tiers t where t.client_id = p_client and t.actif
    union all
    select 'equipe', e.id, e.nom from public.btp_equipes e where e.client_id = p_client and e.actif
  ), notes as (
    select c.genre, c.id, c.nom,
           private.btp_normaliser(c.nom) is not distinct from private.btp_normaliser(p_nom) as identique,
           private.btp_ressemblance(c.nom, p_nom) as score
    from cibles c
    where private.btp_est_serveur() or p_client in (select private.mes_clients())
  )
  select genre, id, nom, case when identique then 1 else score end,
         case when identique then 'identique' else 'ressemblance' end
  from notes
  where identique or score >= 0.5
  order by 4 desc, nom collate "C"
$$;
revoke all on function private.btp_rapprocher(uuid, text) from public;
grant execute on function private.btp_rapprocher(uuid, text) to authenticated, service_role;

create function public.btp_rapprocher(p_client uuid, p_nom text)
returns table (genre text, id uuid, nom text, score numeric, mode text)
language sql stable security invoker set search_path = '' as $$
  select * from private.btp_rapprocher(p_client, p_nom)
$$;
revoke all on function public.btp_rapprocher(uuid, text) from public, anon;
grant execute on function public.btp_rapprocher(uuid, text) to authenticated, service_role;

-- Le seul intervenant que ce nom désigne, ou rien : un nom identique unique ;
-- sinon le plus ressemblant, s'il l'est assez (0,6) et nettement plus que le
-- suivant (0,2). Deux candidats aussi proches : rien, c'est « à ranger ».
create function private.btp_choisir_intervenant(p_client uuid, p_nom text, out genre text, out id uuid, out mode text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_premier record;
  v_second record;
  v_identiques integer;
begin
  if coalesce(btrim(p_nom), '') = '' then
    return;
  end if;
  select count(*) into v_identiques from private.btp_rapprocher(p_client, p_nom) x where x.mode = 'identique';
  if v_identiques = 1 then
    select x.genre, x.id, x.mode into genre, id, mode
    from private.btp_rapprocher(p_client, p_nom) x where x.mode = 'identique';
    return;
  elsif v_identiques > 1 then
    return;
  end if;
  select * into v_premier from private.btp_rapprocher(p_client, p_nom) x limit 1;
  if not found or v_premier.score < 0.6 then
    return;
  end if;
  select * into v_second from private.btp_rapprocher(p_client, p_nom) x offset 1 limit 1;
  if found and v_second.score > v_premier.score - 0.2 then
    return;
  end if;
  genre := v_premier.genre;
  id := v_premier.id;
  mode := 'ressemblance';
end $$;
revoke all on function private.btp_choisir_intervenant(uuid, text) from public;

-- Qui tient le planning : le serveur d'Omega, ou le bureau (gérant, admin,
-- valideur) qui voit le chantier.
create function private.btp_exiger_planning(p_client uuid, p_entite uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.btp_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null
     or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Le planning de ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
end $$;
revoke all on function private.btp_exiger_planning(uuid, uuid) from public;

-- ── 2. Les passages ──────────────────────────────────────────────────────

create table public.btp_passages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  equipe_id uuid,
  tiers_id uuid,
  intervenant_type text not null check (intervenant_type in ('equipe', 'tiers', 'inconnu')),
  intervenant_lu text check (char_length(intervenant_lu) <= 200),
  rapprochement text check (rapprochement in ('identique', 'ressemblance', 'manuel')),
  tache text check (char_length(tache) <= 300),
  debut date not null,
  fin date not null,
  exterieur boolean not null,
  seuil_pluie_mm numeric(5,1) check (seuil_pluie_mm >= 0),
  seuil_vent_kmh smallint check (seuil_vent_kmh between 0 and 300),
  seuil_temp_min smallint check (seuil_temp_min between -50 and 60),
  seuil_temp_max smallint check (seuil_temp_max between -50 and 60),
  statut text not null default 'prevu' check (statut in ('prevu', 'fait', 'annule')),
  confirmation text not null default 'non_demandee'
    check (confirmation in ('non_demandee', 'demandee', 'confirmee', 'declinee', 'sans_reponse')),
  confirmation_le timestamptz,
  remplace_par_id uuid,
  source text not null default 'saisie' check (source in ('saisie', 'tableur', 'alobees', 'api')),
  source_ref text check (char_length(source_ref) <= 120),
  version integer not null default 1 check (version >= 1),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_passages_client_id_id_key unique (client_id, id),
  constraint btp_passages_chantier_id_id_key unique (chantier_id, id),
  constraint btp_passages_chantier_fkey foreign key (client_id, chantier_id)
    references public.btp_chantiers (client_id, id) on delete cascade,
  constraint btp_passages_lot_fkey foreign key (chantier_id, lot_id)
    references public.btp_lots (chantier_id, id) on delete set null (lot_id),
  constraint btp_passages_equipe_fkey foreign key (client_id, equipe_id)
    references public.btp_equipes (client_id, id) on delete set null (equipe_id),
  constraint btp_passages_tiers_fkey foreign key (client_id, tiers_id)
    references public.btp_tiers (client_id, id) on delete set null (tiers_id),
  constraint btp_passages_remplace_fkey foreign key (chantier_id, remplace_par_id)
    references public.btp_passages (chantier_id, id) on delete set null (remplace_par_id),
  constraint btp_passages_dates check (fin >= debut),
  constraint btp_passages_un_intervenant check (equipe_id is null or tiers_id is null),
  constraint btp_passages_type_intervenant check (
    intervenant_type = case when equipe_id is not null then 'equipe' when tiers_id is not null then 'tiers' else 'inconnu' end),
  constraint btp_passages_temperatures check (seuil_temp_min is null or seuil_temp_max is null or seuil_temp_min < seuil_temp_max),
  constraint btp_passages_confirmation_datee check (confirmation = 'non_demandee' or confirmation_le is not null),
  constraint btp_passages_pas_soi_meme check (remplace_par_id is null or remplace_par_id <> id)
);
comment on table public.btp_passages is
  'Le planning : qui intervient sur quel lot, de quand à quand. version monte à chaque déplacement ; la confirmation (M3) retombe alors.';
comment on column public.btp_passages.intervenant_lu is 'Le nom tel que l''import l''a lu, gardé même une fois rapproché.';
comment on column public.btp_passages.rapprochement is
  'Comment l''intervenant a été trouvé : identique (même nom), ressemblance (assez proche et sans concurrent), manuel.';
comment on column public.btp_passages.exterieur is
  'Tâche exposée aux intempéries (M4) ; à défaut, celle du lot ou du corps d''état.';
create index btp_passages_chantier_idx on public.btp_passages (client_id, chantier_id, debut);
create index btp_passages_tiers_idx on public.btp_passages (client_id, tiers_id, debut);
create index btp_passages_equipe_idx on public.btp_passages (client_id, equipe_id, debut);
create index btp_passages_lot_idx on public.btp_passages (chantier_id, lot_id);
create unique index btp_passages_source_ref_idx on public.btp_passages (client_id, source, source_ref)
  where source_ref is not null;

create function private.btp_preparer_passage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_entite uuid;
  v_lot_tiers uuid;
  v_lot_equipe uuid;
  v_lot_exterieur boolean := false;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.source := old.source;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id into v_entite from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if v_entite is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.entite_id := v_entite;
  new.tache := nullif(btrim(new.tache), '');
  new.intervenant_lu := nullif(btrim(new.intervenant_lu), '');
  new.source_ref := nullif(btrim(new.source_ref), '');

  if new.lot_id is not null then
    select l.tiers_id, l.equipe_id, l.exterieur or coalesce(ce.exterieur, false)
    into v_lot_tiers, v_lot_equipe, v_lot_exterieur
    from public.btp_lots l left join public.btp_corps_etat ce on ce.code = l.corps_etat
    where l.chantier_id = new.chantier_id and l.id = new.lot_id;
    -- Sans intervenant ni nom lu, le passage revient à qui exécute le lot.
    if tg_op = 'INSERT' and new.equipe_id is null and new.tiers_id is null and new.intervenant_lu is null then
      new.tiers_id := v_lot_tiers;
      new.equipe_id := v_lot_equipe;
    end if;
  end if;
  if new.exterieur is null then
    new.exterieur := coalesce(v_lot_exterieur, false);
  end if;
  new.intervenant_type := case when new.equipe_id is not null then 'equipe'
                               when new.tiers_id is not null then 'tiers' else 'inconnu' end;
  if new.intervenant_type = 'inconnu' then
    new.rapprochement := null;
  elsif new.rapprochement is null then
    new.rapprochement := 'manuel';
  end if;

  if tg_op = 'INSERT' then
    new.version := 1;
    new.confirmation_le := case when new.confirmation = 'non_demandee' then null
                                else coalesce(new.confirmation_le, now()) end;
  else
    new.version := old.version;
    if (new.debut, new.fin, new.lot_id, new.equipe_id, new.tiers_id, new.tache, new.statut)
       is distinct from (old.debut, old.fin, old.lot_id, old.equipe_id, old.tiers_id, old.tache, old.statut) then
      new.version := old.version + 1;
    end if;
    -- Un passage déplacé, ou confié à quelqu'un d'autre, se reconfirme.
    if (new.debut, new.fin, new.equipe_id, new.tiers_id) is distinct from (old.debut, old.fin, old.equipe_id, old.tiers_id)
       and new.confirmation is not distinct from old.confirmation and old.confirmation <> 'non_demandee' then
      new.confirmation := 'non_demandee';
    end if;
    if new.confirmation is distinct from old.confirmation then
      new.confirmation_le := case when new.confirmation = 'non_demandee' then null
                                  when new.confirmation_le is not distinct from old.confirmation_le then now()
                                  else new.confirmation_le end;
    elsif new.confirmation = 'non_demandee' then
      new.confirmation_le := null;
    end if;
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_passage() from public;

create trigger btp_passages_preparer before insert or update on public.btp_passages
  for each row execute function private.btp_preparer_passage();

-- ── 3. Les dépendances entre passages ────────────────────────────────────

create table public.btp_dependances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  amont_id uuid not null,
  aval_id uuid not null,
  delai_min_jours smallint not null default 0 check (delai_min_jours between 0 and 365),
  origine text not null default 'saisie' check (origine in ('saisie', 'gabarit', 'import')),
  confirmee boolean not null default true,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_dependances_client_id_id_key unique (client_id, id),
  constraint btp_dependances_un_lien unique (amont_id, aval_id),
  constraint btp_dependances_pas_soi_meme check (amont_id <> aval_id),
  constraint btp_dependances_chantier_fkey foreign key (client_id, chantier_id)
    references public.btp_chantiers (client_id, id) on delete cascade,
  constraint btp_dependances_amont_fkey foreign key (chantier_id, amont_id)
    references public.btp_passages (chantier_id, id) on delete cascade,
  constraint btp_dependances_aval_fkey foreign key (chantier_id, aval_id)
    references public.btp_passages (chantier_id, id) on delete cascade
);
comment on table public.btp_dependances is
  'L''aval ne commence qu''après l''amont, plus delai_min_jours jours ouvrés. Sans boucle : la base refuse la dépendance qui en fermerait une.';
comment on column public.btp_dependances.delai_min_jours is
  'Jours ouvrés entre la fin de l''amont et le début de l''aval ; 0 : dès le jour ouvré suivant.';
create index btp_dependances_amont_idx on public.btp_dependances (chantier_id, amont_id);
create index btp_dependances_aval_idx on public.btp_dependances (chantier_id, aval_id);

-- Relier amont → aval fermerait-il une boucle ? On descend depuis l'aval :
-- si l'on retombe sur l'amont, oui. VOLATILE, pour lire ce que d'autres
-- viennent de valider une fois le verrou du chantier obtenu.
create function private.btp_cree_cycle(p_chantier uuid, p_amont uuid, p_aval uuid) returns boolean
language sql volatile security definer set search_path = '' as $$
  with recursive suite as (
    select d.aval_id from public.btp_dependances d where d.chantier_id = p_chantier and d.amont_id = p_aval
    union
    select d.aval_id from public.btp_dependances d join suite s on d.amont_id = s.aval_id
    where d.chantier_id = p_chantier
  )
  select p_amont = p_aval or exists (select 1 from suite where aval_id = p_amont)
$$;
revoke all on function private.btp_cree_cycle(uuid, uuid, uuid) from public;

create function private.btp_preparer_dependance() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_client_amont uuid;
  v_chantier_amont uuid;
  v_client_aval uuid;
  v_chantier_aval uuid;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.amont_id := old.amont_id;
    new.aval_id := old.aval_id;
    new.cree_le := old.cree_le;
    new.maj_le := now();
    return new;
  end if;
  select p.client_id, p.chantier_id into v_client_amont, v_chantier_amont from public.btp_passages p where p.id = new.amont_id;
  select p.client_id, p.chantier_id into v_client_aval, v_chantier_aval from public.btp_passages p where p.id = new.aval_id;
  if v_chantier_amont is null or v_chantier_aval is null then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  if v_chantier_amont <> v_chantier_aval or v_client_amont <> new.client_id then
    raise exception 'Une dépendance relie deux passages du même chantier.' using errcode = '23514';
  end if;
  new.chantier_id := v_chantier_amont;
  perform pg_advisory_xact_lock(hashtextextended('daliro.dependances:' || new.chantier_id::text, 0));
  if private.btp_cree_cycle(new.chantier_id, new.amont_id, new.aval_id) then
    raise exception 'Dépendance refusée : elle fermerait une boucle dans le planning.' using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_dependance() from public;

create trigger btp_dependances_preparer before insert or update on public.btp_dependances
  for each row execute function private.btp_preparer_dependance();

-- Proposer les dépendances d'un chantier depuis le gabarit de séquence des
-- corps d'état : chaque passage dépend des passages du corps d'état
-- présent juste avant lui. Proposées, non confirmées ; jamais en double, ni
-- contre une dépendance saisie, ni en boucle.
create function private.btp_proposer_dependances(p_chantier uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_client uuid;
  v_entite uuid;
  r record;
  n integer := 0;
begin
  select c.client_id, c.entite_id into v_client, v_entite from public.btp_chantiers c where c.id = p_chantier;
  if v_client is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(v_client, v_entite);
  for r in
    with pas as (
      select p.id, ce.rang_sequence as rang
      from public.btp_passages p
      join public.btp_lots l on l.chantier_id = p.chantier_id and l.id = p.lot_id
      join public.btp_corps_etat ce on ce.code = l.corps_etat
      where p.chantier_id = p_chantier and p.statut = 'prevu'
    ), rangs as (select distinct rang from pas)
    select a.id as amont, b.id as aval
    from pas b
    join lateral (select max(x.rang) as rang from rangs x where x.rang < b.rang) prec on prec.rang is not null
    join pas a on a.rang = prec.rang
    where not exists (select 1 from public.btp_dependances d
                      where (d.amont_id = a.id and d.aval_id = b.id) or (d.amont_id = b.id and d.aval_id = a.id))
    order by a.id, b.id
  loop
    if not private.btp_cree_cycle(p_chantier, r.amont, r.aval) then
      insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id, origine, confirmee)
      values (v_client, p_chantier, r.amont, r.aval, 'gabarit', false);
      n := n + 1;
    end if;
  end loop;
  if n > 0 then
    perform private.journaliser(v_client, 'daliro.dependances_proposees', 'btp_chantiers', p_chantier::text,
      jsonb_build_object('proposees', n), v_entite);
  end if;
  return n;
end $$;
revoke all on function private.btp_proposer_dependances(uuid) from public;
grant execute on function private.btp_proposer_dependances(uuid) to authenticated, service_role;

create function public.btp_proposer_dependances(p_chantier uuid) returns integer
language sql volatile security invoker set search_path = '' as $$ select private.btp_proposer_dependances(p_chantier) $$;
revoke all on function public.btp_proposer_dependances(uuid) from public, anon;
grant execute on function public.btp_proposer_dependances(uuid) to authenticated, service_role;

-- ── 4. L'import du planning ──────────────────────────────────────────────
-- Une relève : des lignes {ref, intervenant, lot, tache, debut, fin,
-- exterieur} d'une source. Même ref, même source : le passage est mis à
-- jour (sa version monte si quelque chose a bougé) ; une ref disparue de
-- la source est annulée quand la relève est complète. Le nom lu est
-- rapproché de l'annuaire ; l'ambigu reste « à ranger ».

create function private.btp_importer_passages(p_chantier uuid, p_source text, p_lignes jsonb, p_complet boolean default true)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_client uuid;
  v_entite uuid;
  l jsonb;
  v_ref text;
  v_lot uuid;
  v_choix record;
  v_equipe uuid;
  v_tiers uuid;
  v_rapprochement text;
  v_id uuid;
  v_version_avant integer;
  v_version_apres integer;
  v_refs text[] := '{}';
  v_crees integer := 0;
  v_mis_a_jour integer := 0;
  v_inchanges integer := 0;
  v_annules integer := 0;
  v_a_ranger integer := 0;
  v_sans_lot integer := 0;
begin
  if p_source not in ('tableur', 'alobees', 'api') then
    raise exception 'Source d''import inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes du planning forment un tableau.' using errcode = '22023';
  end if;
  select c.client_id, c.entite_id into v_client, v_entite from public.btp_chantiers c where c.id = p_chantier;
  if v_client is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(v_client, v_entite);

  for l in select * from jsonb_array_elements(p_lignes) loop
    v_ref := nullif(btrim(l ->> 'ref'), '');
    if v_ref is null then
      raise exception 'Chaque ligne du planning porte une ref, celle de la source.' using errcode = '22023';
    end if;
    v_refs := v_refs || v_ref;
    select lo.id into v_lot from public.btp_lots lo
    where lo.chantier_id = p_chantier and lo.code = btrim(l ->> 'lot');
    if v_lot is null then
      v_sans_lot := v_sans_lot + 1;
    end if;
    v_equipe := (l ->> 'equipe_id')::uuid;
    v_tiers := (l ->> 'tiers_id')::uuid;
    v_rapprochement := case when v_equipe is not null or v_tiers is not null then 'manuel' end;
    if v_equipe is null and v_tiers is null and nullif(btrim(l ->> 'intervenant'), '') is not null then
      select * into v_choix from private.btp_choisir_intervenant(v_client, l ->> 'intervenant');
      if v_choix.genre = 'equipe' then v_equipe := v_choix.id; end if;
      if v_choix.genre = 'tiers' then v_tiers := v_choix.id; end if;
      v_rapprochement := v_choix.mode;
    end if;
    if v_equipe is null and v_tiers is null then
      v_a_ranger := v_a_ranger + 1;
    end if;

    select p.id, p.version into v_id, v_version_avant from public.btp_passages p
    where p.client_id = v_client and p.source = p_source and p.source_ref = v_ref;
    if v_id is null then
      insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tiers_id, intervenant_lu, rapprochement,
                                       tache, debut, fin, exterieur, source, source_ref)
      values (v_client, p_chantier, v_lot, v_equipe, v_tiers, l ->> 'intervenant', v_rapprochement,
              l ->> 'tache', (l ->> 'debut')::date, (l ->> 'fin')::date, (l ->> 'exterieur')::boolean, p_source, v_ref);
      v_crees := v_crees + 1;
    else
      update public.btp_passages p
      set lot_id = coalesce(v_lot, p.lot_id),
          equipe_id = coalesce(v_equipe, case when v_tiers is null then p.equipe_id end),
          tiers_id = coalesce(v_tiers, case when v_equipe is null then p.tiers_id end),
          intervenant_lu = coalesce(l ->> 'intervenant', p.intervenant_lu),
          rapprochement = coalesce(v_rapprochement, p.rapprochement),
          tache = coalesce(l ->> 'tache', p.tache),
          debut = (l ->> 'debut')::date, fin = (l ->> 'fin')::date,
          exterieur = coalesce((l ->> 'exterieur')::boolean, p.exterieur),
          statut = case when p.statut = 'annule' then 'prevu' else p.statut end
      where p.id = v_id
      returning p.version into v_version_apres;
      if v_version_apres > v_version_avant then
        v_mis_a_jour := v_mis_a_jour + 1;
      else
        v_inchanges := v_inchanges + 1;
      end if;
    end if;
  end loop;

  if p_complet then
    update public.btp_passages p set statut = 'annule'
    where p.client_id = v_client and p.chantier_id = p_chantier and p.source = p_source
      and p.source_ref is not null and not (p.source_ref = any (v_refs))
      and p.statut = 'prevu' and p.fin >= current_date;
    get diagnostics v_annules = row_count;
  end if;

  perform private.journaliser(v_client, 'daliro.planning_releve', 'btp_chantiers', p_chantier::text,
    jsonb_build_object('source', p_source, 'lignes', jsonb_array_length(p_lignes), 'crees', v_crees,
                       'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges, 'annules', v_annules,
                       'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot), v_entite);
  if v_crees + v_mis_a_jour + v_annules > 0 then
    perform private.publier_evenement(v_client, 'daliro.planning_releve',
      jsonb_build_object('chantier', p_chantier, 'source', p_source, 'crees', v_crees, 'mis_a_jour', v_mis_a_jour,
                         'annules', v_annules),
      'planning:' || p_chantier::text || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'));
  end if;
  return jsonb_build_object('crees', v_crees, 'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges,
                            'annules', v_annules, 'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot);
end $$;
revoke all on function private.btp_importer_passages(uuid, text, jsonb, boolean) from public;
grant execute on function private.btp_importer_passages(uuid, text, jsonb, boolean) to authenticated, service_role;

create function public.btp_importer_passages(p_chantier uuid, p_source text, p_lignes jsonb, p_complet boolean default true)
returns jsonb
language sql volatile security invoker set search_path = '' as $$
  select private.btp_importer_passages(p_chantier, p_source, p_lignes, p_complet) $$;
revoke all on function public.btp_importer_passages(uuid, text, jsonb, boolean) from public, anon;
grant execute on function public.btp_importer_passages(uuid, text, jsonb, boolean) to authenticated, service_role;

-- ── 5. Les acceptations des sous-traitants ───────────────────────────────
-- Loi n° 75-1334 du 31 décembre 1975, art. 3 : l'entrepreneur principal
-- fait accepter chaque sous-traitant, et agréer ses conditions de paiement,
-- par le maître de l'ouvrage. En marché public, par un acte spécial
-- (formulaire DC4), avec paiement direct du sous-traitant de premier rang
-- (code de la commande publique, art. L2193-10 et suivants).

create table public.btp_acceptations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  tiers_id uuid not null,
  mode text not null default 'lettre' check (mode in ('acte_special', 'lettre', 'avenant', 'autre')),
  statut text not null default 'a_demander' check (statut in ('a_demander', 'demandee', 'acceptee', 'refusee', 'caduque')),
  paiement_direct boolean not null,
  conditions_paiement text check (char_length(conditions_paiement) <= 500),
  demandee_le date,
  decidee_le date,
  piece_id uuid,
  note text check (char_length(note) <= 2000),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_acceptations_client_id_id_key unique (client_id, id),
  constraint btp_acceptations_chantier_fkey foreign key (client_id, chantier_id)
    references public.btp_chantiers (client_id, id) on delete cascade,
  constraint btp_acceptations_tiers_fkey foreign key (client_id, tiers_id)
    references public.btp_tiers (client_id, id) on delete cascade,
  constraint btp_acceptations_piece_fkey foreign key (client_id, piece_id)
    references public.pieces (client_id, id) on delete set null (piece_id),
  constraint btp_acceptations_demande_datee check (statut = 'a_demander' or demandee_le is not null),
  constraint btp_acceptations_decision_datee check (statut not in ('acceptee', 'refusee', 'caduque') or decidee_le is not null)
);
comment on table public.btp_acceptations is
  'L''acceptation d''un sous-traitant par le maître d''ouvrage, chantier par chantier (loi n° 75-1334, art. 3). Une seule en cours par sous-traitant et par chantier.';
comment on column public.btp_acceptations.paiement_direct is
  'Le maître d''ouvrage paie le sous-traitant directement : la règle en marché public (CCP L2193-10) ; sur option en privé.';
create index btp_acceptations_chantier_idx on public.btp_acceptations (client_id, chantier_id);
create index btp_acceptations_tiers_idx on public.btp_acceptations (client_id, tiers_id);
create unique index btp_acceptations_une_en_cours_idx on public.btp_acceptations (chantier_id, tiers_id)
  where statut in ('a_demander', 'demandee', 'acceptee');

create function private.btp_preparer_acceptation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_entite uuid;
  v_nature text;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.tiers_id := old.tiers_id;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id, c.nature_marche into v_entite, v_nature from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if v_entite is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.entite_id := v_entite;
  perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'sous_traitant', 'Le sous-traitant à faire accepter');
  if new.paiement_direct is null then
    new.paiement_direct := (v_nature = 'public');
  end if;
  if tg_op = 'UPDATE' and new.statut is distinct from old.statut and not (
       (old.statut = 'a_demander' and new.statut in ('demandee', 'acceptee', 'refusee'))
    or (old.statut = 'demandee' and new.statut in ('acceptee', 'refusee', 'a_demander'))
    or (old.statut = 'acceptee' and new.statut = 'caduque')
    or (old.statut in ('refusee', 'caduque') and new.statut = 'a_demander')) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  if new.statut <> 'a_demander' then
    new.demandee_le := coalesce(new.demandee_le, current_date);
  end if;
  if new.statut in ('acceptee', 'refusee', 'caduque') then
    new.decidee_le := coalesce(new.decidee_le, current_date);
  elsif new.statut = 'a_demander' then
    new.decidee_le := null;
    new.demandee_le := null;
  end if;
  if new.statut = 'acceptee' and v_nature = 'public' and new.mode <> 'acte_special' then
    raise exception 'En marché public, un sous-traitant est accepté par un acte spécial (DC4).' using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_acceptation() from public;

create trigger btp_acceptations_preparer before insert or update on public.btp_acceptations
  for each row execute function private.btp_preparer_acceptation();

-- ── 6. L'étape d'un chantier ─────────────────────────────────────────────
-- « x sur n » : le rang du lot en cours (le dernier, s'il y en a plusieurs)
-- sur le nombre de lots ; sans lot en cours, le nombre de lots terminés.

create view public.btp_chantiers_etape with (security_invoker = true) as
  with l as (
    select l.client_id, l.chantier_id, l.id, l.libelle, l.statut,
           row_number() over (partition by l.chantier_id order by l.rang, l.code collate "C") as rn
    from public.btp_lots l
  ), e as (
    select client_id, chantier_id, count(*)::int as etapes,
           coalesce(max(rn) filter (where statut = 'en_cours'), count(*) filter (where statut = 'termine'))::int as etape
    from l group by client_id, chantier_id
  )
  select c.client_id, c.id as chantier_id, coalesce(e.etape, 0) as etape, coalesce(e.etapes, 0) as etapes,
         lc.id as lot_id, lc.libelle as lot_libelle,
         case when coalesce(e.etapes, 0) = 0 then 0
              else round(100.0 * e.etape / e.etapes) end::smallint as avancement_pct
  from public.btp_chantiers c
  left join e on e.chantier_id = c.id
  left join l lc on lc.chantier_id = c.id and lc.rn = e.etape;
comment on view public.btp_chantiers_etape is 'L''étape « x sur n » d''un chantier : le rang du lot en cours sur le nombre de lots.';

-- ── 7. L'écran de contrôle reçoit le planning et les acceptations ────────

create or replace view public.btp_controle with (security_invoker = true) as
  select c.client_id, c.id as chantier_id, 'btp_chantiers'::text as objet_type, c.id as objet_id,
         'chantier_sans_maitre_ouvrage'::text as code, 'bloquant'::text as gravite,
         format('%s : aucun maître d''ouvrage désigné ; personne ne peut signer ses avenants.', c.nom) as message
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client <> 'sous_traitant' and c.maitre_ouvrage_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_donneur_ordre', 'bloquant',
         format('%s : l''entreprise principale n''est pas désignée ; elle signe les avenants du sous-traitant.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client = 'sous_traitant' and c.donneur_ordre_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_conducteur', 'attention',
         format('%s : aucun conducteur de travaux ; ses listes du matin n''ont pas de destinataire.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('ouvert', 'suspendu') and c.conducteur_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_lots', 'attention',
         format('%s : aucun lot ; le planning et les passages ne peuvent pas s''y rattacher.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu')
    and not exists (select 1 from public.btp_lots l where l.client_id = c.client_id and l.chantier_id = c.id)
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_planning', 'attention',
         format('%s : aucun passage planifié ; rien à confirmer à J-2, rien à recaler.', c.nom)
  from public.btp_chantiers c
  where c.statut = 'ouvert'
    and not exists (select 1 from public.btp_passages p where p.chantier_id = c.id and p.statut = 'prevu')
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_coordonnees', 'info',
         format('%s : adresse non localisée ; pas de météo, ni de rattachement par la position.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.latitude is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_hors_champ_tva', 'info',
         format('%s : collectivité d''outre-mer, hors du champ de la TVA française ; les montants sont préparés hors taxe.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.regime_tva = 'hors_champ'
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_marche_verifie', 'attention',
         format('%s : aucun marché vérifié ; les avenants et les situations ne peuvent pas être chiffrés.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('ouvert', 'suspendu')
    and not exists (select 1 from public.btp_marches m
                    where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie')
  union all
  select m.client_id, m.chantier_id, 'btp_marches', m.id, 'marche_a_verifier', 'bloquant',
         format('Marché %s : à vérifier ligne à ligne avant tout chiffrage.', coalesce(m.reference, 'sans référence'))
  from public.btp_marches m
  where m.statut = 'a_verifier'
  union all
  select l.client_id, l.chantier_id, 'btp_lots', l.id, 'lot_sans_executant', 'attention',
         format('Lot %s %s : l''entreprise qui l''exécute n''est pas désignée.', l.code, l.libelle)
  from public.btp_lots l
  join public.btp_chantiers c on c.client_id = l.client_id and c.id = l.chantier_id
  where c.statut in ('preparation', 'ouvert', 'suspendu') and l.statut <> 'termine'
    and ((l.execution <> 'client' and l.tiers_id is null) or (l.execution = 'client' and l.equipe_id is null))
  union all
  select l.client_id, l.chantier_id, 'btp_lots', l.id, 'sous_traitant_non_accepte', 'attention',
         format('Lot %s %s : %s n''a pas été accepté par le maître d''ouvrage (loi n° 75-1334, art. 3).',
                l.code, l.libelle, t.nom)
  from public.btp_lots l
  join public.btp_chantiers c on c.client_id = l.client_id and c.id = l.chantier_id
  join public.btp_tiers t on t.client_id = l.client_id and t.id = l.tiers_id
  where c.statut in ('preparation', 'ouvert', 'suspendu') and l.statut <> 'termine' and l.execution = 'sous_traitant'
    and not exists (select 1 from public.btp_acceptations a
                    where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id and a.statut = 'acceptee')
  union all
  select p.client_id, p.chantier_id, 'btp_passages', p.id, 'passage_a_ranger', 'attention',
         format('Passage du %s au %s : « %s » ne désigne personne de l''annuaire, ou plusieurs.',
                to_char(p.debut, 'DD/MM'), to_char(p.fin, 'DD/MM'), coalesce(p.intervenant_lu, p.tache, 'sans nom'))
  from public.btp_passages p
  where p.statut = 'prevu' and p.fin >= current_date and p.intervenant_type = 'inconnu'
  union all
  select p.client_id, p.chantier_id, 'btp_passages', p.id, 'passage_sans_lot', 'attention',
         format('Passage du %s au %s (%s) : rattaché à aucun lot.',
                to_char(p.debut, 'DD/MM'), to_char(p.fin, 'DD/MM'), coalesce(p.tache, p.intervenant_lu, 'sans nom'))
  from public.btp_passages p
  where p.statut = 'prevu' and p.fin >= current_date and p.lot_id is null
  union all
  select d.client_id, d.chantier_id, 'btp_dependances', d.id, 'dependance_non_respectee', 'attention',
         format('« %s » commence le %s, avant le %s : « %s » finit le %s.',
                coalesce(b.tache, 'aval'), to_char(b.debut, 'DD/MM'),
                to_char(public.ajouter_jours(a.fin, d.delai_min_jours + 1, 'ouvres', c.territoire), 'DD/MM'),
                coalesce(a.tache, 'amont'), to_char(a.fin, 'DD/MM'))
  from public.btp_dependances d
  join public.btp_passages a on a.id = d.amont_id
  join public.btp_passages b on b.id = d.aval_id
  join public.btp_chantiers c on c.id = d.chantier_id
  where a.statut = 'prevu' and b.statut = 'prevu' and b.fin >= current_date
    and b.debut < public.ajouter_jours(a.fin, d.delai_min_jours + 1, 'ouvres', c.territoire)
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'intervenant_non_informe', 'bloquant',
         format('%s n''a pas été informé que ses messages sont lus (C. trav. L1222-4) : Daliro ne lit rien de lui.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.informe_le is null
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'chef_sans_telephone', 'attention',
         format('%s, chef d''équipe, n''a pas de numéro : ses messages ne peuvent pas être reconnus.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.role_terrain = 'chef_equipe' and i.telephone is null
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id,
         'vigilance_' || public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le),
         case when public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) = 'a_renouveler'
              then 'info' else 'attention' end,
         format('%s : attestation de vigilance %s (C. trav. D8222-5).', t.nom,
                case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                  when 'absente' then 'absente'
                  when 'echue' then 'de plus de six mois'
                  when 'a_verifier' then 'non vérifiée auprès de l''Urssaf'
                  else 'à renouveler dans les quinze jours' end)
  from public.btp_tiers t
  where t.actif and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                    in ('absente', 'echue', 'a_verifier', 'a_renouveler')
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id, 'sous_traitant_injoignable', 'attention',
         format('%s : ni téléphone ni courriel ; ses passages ne peuvent pas être confirmés.', t.nom)
  from public.btp_tiers t
  where t.actif and 'sous_traitant' = any (t.roles) and t.telephone is null and t.email is null;

-- ── 8. La veille quotidienne et le battement ─────────────────────────────

-- Pour une organisation : les alertes au client, puis la preuve de vie.
-- Une alerte par sujet, tant qu'elle n'est pas acquittée.
create function private.btp_veiller_client(p_client uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r record;
  v_id uuid;
  v_immobiles integer := 0;
  v_vigilances integer := 0;
  v_ouverts integer;
begin
  for r in
    select c.id, c.nom, c.conducteur_id,
           greatest(c.ouvert_le, (select max(p.maj_le) from public.btp_passages p where p.chantier_id = c.id)) as bouge_le
    from public.btp_chantiers c
    where c.client_id = p_client and c.statut = 'ouvert'
  loop
    if r.bouge_le < now() - interval '7 days' then
      v_id := private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
        format('%s : le planning n''a pas bougé depuis sept jours', left(r.nom, 150)),
        jsonb_build_object('chantier', r.id, 'depuis', r.bouge_le),
        'planning_immobile:' || r.id::text, true, r.conducteur_id);
      if v_id is not null then
        v_immobiles := v_immobiles + 1;
      end if;
    end if;
  end loop;

  for r in
    select distinct t.id, t.nom,
           public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) as etat
    from public.btp_tiers t
    join public.btp_passages p on p.client_id = t.client_id and p.tiers_id = t.id
    where t.client_id = p_client and t.actif and 'sous_traitant' = any (t.roles)
      and p.statut = 'prevu' and p.debut between current_date and current_date + 15
      and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) in ('absente', 'echue')
  loop
    v_id := private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
      format('%s passe sous quinze jours sans attestation de vigilance %s', left(r.nom, 140),
             case r.etat when 'absente' then 'connue' else 'de moins de six mois' end),
      jsonb_build_object('tiers', r.id, 'etat', r.etat), 'vigilance:' || r.id::text, true, null);
    if v_id is not null then
      v_vigilances := v_vigilances + 1;
    end if;
  end loop;

  select count(*) into v_ouverts from public.btp_chantiers c where c.client_id = p_client and c.statut in ('ouvert', 'suspendu');
  perform public.signaler_battement(p_client, 'daliro_referentiel',
    jsonb_build_object('chantiers_ouverts', v_ouverts, 'alertes', v_immobiles + v_vigilances), interval '1 day');
  return jsonb_build_object('chantiers_ouverts', v_ouverts, 'plannings_immobiles', v_immobiles, 'vigilances', v_vigilances);
end $$;
revoke all on function private.btp_veiller_client(uuid) from public;
grant execute on function private.btp_veiller_client(uuid) to service_role;

create function public.btp_veiller(p_client uuid) returns jsonb
language sql volatile security invoker set search_path = '' as $$ select private.btp_veiller_client(p_client) $$;
revoke all on function public.btp_veiller(uuid) from public, anon, authenticated;
grant execute on function public.btp_veiller(uuid) to service_role;

-- La tâche du matin, pour chaque organisation où Daliro est installé. Une
-- organisation qui échoue n'arrête pas les autres : alerte interne critique.
create function private.btp_tache_referentiel() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat', private.btp_veiller_client(r.client_id));
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La veille du référentiel a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'veille_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $$;
revoke all on function private.btp_tache_referentiel() from public;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daliro-referentiel') then
    perform cron.unschedule('daliro-referentiel');
  end if;
  perform cron.schedule('daliro-referentiel', '20 6 * * *', 'select private.btp_tache_referentiel()');
end $$;

-- ── 9. Droits ────────────────────────────────────────────────────────────

alter table public.btp_passages enable row level security;
alter table public.btp_dependances enable row level security;
alter table public.btp_acceptations enable row level security;

revoke all on table public.btp_passages, public.btp_dependances, public.btp_acceptations, public.btp_chantiers_etape
  from anon, authenticated;
grant all on table public.btp_passages, public.btp_dependances, public.btp_acceptations to service_role;
grant select on table public.btp_passages, public.btp_dependances, public.btp_acceptations, public.btp_chantiers_etape
  to authenticated, service_role;

grant insert (client_id, chantier_id, lot_id, equipe_id, tiers_id, intervenant_lu, rapprochement, tache, debut, fin,
              exterieur, seuil_pluie_mm, seuil_vent_kmh, seuil_temp_min, seuil_temp_max, statut, confirmation,
              confirmation_le, remplace_par_id, source, source_ref),
      update (lot_id, equipe_id, tiers_id, intervenant_lu, rapprochement, tache, debut, fin, exterieur, seuil_pluie_mm,
              seuil_vent_kmh, seuil_temp_min, seuil_temp_max, statut, confirmation, confirmation_le, remplace_par_id,
              source_ref),
      delete
  on table public.btp_passages to authenticated;
grant insert (client_id, amont_id, aval_id, delai_min_jours, origine, confirmee),
      update (delai_min_jours, confirmee), delete
  on table public.btp_dependances to authenticated;
grant insert (client_id, chantier_id, tiers_id, mode, statut, paiement_direct, conditions_paiement, demandee_le,
              decidee_le, piece_id, note),
      update (mode, statut, paiement_direct, conditions_paiement, demandee_le, decidee_le, piece_id, note), delete
  on table public.btp_acceptations to authenticated;

create policy "membres lisent les passages de leurs chantiers" on public.btp_passages
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
create policy "le bureau pose les passages" on public.btp_passages
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
              and private.voit_entite(client_id, (select c.entite_id from public.btp_chantiers c where c.id = chantier_id)));
create policy "le bureau deplace les passages" on public.btp_passages
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));
create policy "le bureau retire les passages" on public.btp_passages
  for delete to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));

create policy "membres lisent les dependances de leurs chantiers" on public.btp_dependances
  for select to authenticated
  using (client_id in (select private.mes_clients())
         and private.voit_entite(client_id, (select c.entite_id from public.btp_chantiers c where c.id = chantier_id)));
create policy "le bureau pose les dependances" on public.btp_dependances
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
              and private.voit_entite(client_id, (select p.entite_id from public.btp_passages p where p.id = amont_id)));
create policy "le bureau corrige les dependances" on public.btp_dependances
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
         and private.voit_entite(client_id, (select c.entite_id from public.btp_chantiers c where c.id = chantier_id)))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']));
create policy "le bureau retire les dependances" on public.btp_dependances
  for delete to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
         and private.voit_entite(client_id, (select c.entite_id from public.btp_chantiers c where c.id = chantier_id)));

create policy "membres lisent les acceptations de leurs chantiers" on public.btp_acceptations
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
create policy "le bureau tient les acceptations" on public.btp_acceptations
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
              and private.voit_entite(client_id, (select c.entite_id from public.btp_chantiers c where c.id = chantier_id)));
create policy "le bureau met a jour les acceptations" on public.btp_acceptations
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));
create policy "gerants et admins retirent les acceptations" on public.btp_acceptations
  for delete to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin']) and private.voit_entite(client_id, entite_id));

-- ── 10. Traçage, registre, objets ────────────────────────────────────────

create trigger btp_passages_tracer after insert or update or delete on public.btp_passages
  for each row execute function private.tracer('maj_le');
create trigger btp_dependances_tracer after insert or update or delete on public.btp_dependances
  for each row execute function private.tracer('maj_le');
create trigger btp_acceptations_tracer after insert or update or delete on public.btp_acceptations
  for each row execute function private.tracer('maj_le');

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('btp_dependances', 3, 'daliro, M0'),
  ('btp_passages', 4, 'daliro, M0'),
  ('btp_acceptations', 5, 'daliro, M0')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('btp_dependances', 'btp_chantier', 'chantier_id', 3),
  ('btp_passages', 'btp_chantier', 'chantier_id', 4),
  ('btp_acceptations', 'btp_chantier', 'chantier_id', 5)
on conflict (nom) do update
  set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;
