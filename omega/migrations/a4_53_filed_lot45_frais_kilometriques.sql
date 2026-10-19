-- FILED, lot 45 (a4_53) — les notes de frais : les indemnités kilométriques au barème (Teo, 18/10 ; chiffrage n° 13).
--
-- a4_35 fait des notes de frais à justificatif (ticket, facture). Manquait le trajet fait avec son propre véhicule,
-- remboursé au barème fiscal : il n'a pas de facture. Ce lot pose :
--   · public.filed_baremes_km : le barème par année, véhicule (voiture, moto, cyclomoteur), puissance et tranche de
--     distance annuelle (d × coef + fixe), majoré de 20 % pour un véhicule électrique. Source vérifiée le
--     19/10/2026, coefficient par coefficient : BOFiP BOI-BAREME-000001, version du 20/07/2023, barèmes « revenus
--     2022 » (§ 10 automobiles, § 20 cyclomoteurs, § 30 motocyclettes ; § 5 majoration de 20 % des véhicules
--     électriques, CGI ann. IV art. 6 B), https://bofip.impots.gouv.fr/bofip/2185-PGP.html/identifiant=BOI-BAREME-000001-20230720
--     — le dernier barème publié que j'ai pu lire ; il est posé sous l'année 2022. Un trajet prend le barème de son
--     année, sinon le plus récent posé : l'opérateur pose chaque nouveau barème quand il paraît (filed_regler_bareme_km) ;
--   · public.filed_trajets_km : chaque trajet déclaré (date, départ, arrivée, motif, km, véhicule) ; son montant est
--     la part du barème annuel qu'il ajoute : barème(cumul de l'année + km) − barème(cumul de l'année) — le changement
--     de tranche en cours d'année est ainsi juste ;
--   · l'approbation par une autre personne que le bénéficiaire (gérant, admin, valideur), comme a4_35 ;
--   · filed_etat_frais_km : l'état mensuel du bénéficiaire (trajets, barème appliqué, total approuvé), en CSV : c'est
--     le justificatif à déposer comme pièce (puis public.filed_declarer_note_frais, a4_35) pour qu'il soit écrit au
--     compte du personnel et passe au FEC ; filed_rembourser_frais_km marque les trajets remboursés.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_baremes_km (
  annee      integer not null check (annee between 2000 and 2100),
  vehicule   text not null check (vehicule in ('voiture', 'moto', 'cyclomoteur')),
  cv_min     integer not null,
  cv_max     integer not null,
  km_min     numeric not null,
  km_max     numeric,                       -- nul : sans limite haute
  coef       numeric(8,4) not null,
  fixe       numeric(10,2) not null default 0,
  source     text not null,
  primary key (annee, vehicule, cv_min, km_min)
);
comment on table public.filed_baremes_km is
  'Lot 45 (a4_53) : le barème kilométrique fiscal (d × coef + fixe), par année, véhicule, puissance et tranche annuelle. Opérateur.';
insert into public.filed_baremes_km (annee, vehicule, cv_min, cv_max, km_min, km_max, coef, fixe, source)
select 2022, v, cmin, cmax, kmin, kmax, coef, fixe, 'BOFiP BOI-BAREME-000001 du 20/07/2023, barème revenus 2022 (§ 10, 20, 30), https://bofip.impots.gouv.fr/bofip/2185-PGP.html/identifiant=BOI-BAREME-000001-20230720 ; vérifié le 19/10/2026'
from (values
  ('voiture', 0, 3, 0, 5000, 0.529, 0), ('voiture', 0, 3, 5000, 20000, 0.316, 1065), ('voiture', 0, 3, 20000, null, 0.370, 0),
  ('voiture', 4, 4, 0, 5000, 0.606, 0), ('voiture', 4, 4, 5000, 20000, 0.340, 1330), ('voiture', 4, 4, 20000, null, 0.407, 0),
  ('voiture', 5, 5, 0, 5000, 0.636, 0), ('voiture', 5, 5, 5000, 20000, 0.357, 1395), ('voiture', 5, 5, 20000, null, 0.427, 0),
  ('voiture', 6, 6, 0, 5000, 0.665, 0), ('voiture', 6, 6, 5000, 20000, 0.374, 1457), ('voiture', 6, 6, 20000, null, 0.447, 0),
  ('voiture', 7, 99, 0, 5000, 0.697, 0), ('voiture', 7, 99, 5000, 20000, 0.394, 1515), ('voiture', 7, 99, 20000, null, 0.470, 0),
  ('moto', 0, 2, 0, 3000, 0.395, 0), ('moto', 0, 2, 3000, 6000, 0.099, 891), ('moto', 0, 2, 6000, null, 0.248, 0),
  ('moto', 3, 5, 0, 3000, 0.468, 0), ('moto', 3, 5, 3000, 6000, 0.082, 1158), ('moto', 3, 5, 6000, null, 0.275, 0),
  ('moto', 6, 99, 0, 3000, 0.606, 0), ('moto', 6, 99, 3000, 6000, 0.079, 1583), ('moto', 6, 99, 6000, null, 0.343, 0),
  ('cyclomoteur', 0, 99, 0, 3000, 0.315, 0), ('cyclomoteur', 0, 99, 3000, 6000, 0.079, 711), ('cyclomoteur', 0, 99, 6000, null, 0.198, 0)
) b(v, cmin, cmax, kmin, kmax, coef, fixe)
on conflict (annee, vehicule, cv_min, km_min) do nothing;

create table if not exists public.filed_trajets_km (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  entite_id        uuid references public.entites(id) on delete cascade,
  beneficiaire     uuid not null,
  beneficiaire_nom text not null check (char_length(btrim(beneficiaire_nom)) between 1 and 120),
  le               date not null,
  depart           text check (depart is null or char_length(depart) <= 200),
  arrivee          text check (arrivee is null or char_length(arrivee) <= 200),
  motif            text not null check (char_length(btrim(motif)) between 1 and 300),
  km               numeric(8,1) not null check (km > 0 and km <= 5000),
  vehicule         text not null check (vehicule in ('voiture', 'moto', 'cyclomoteur')),
  cv               integer not null check (cv between 1 and 99),
  electrique       boolean not null default false,
  bareme_annee     integer not null,
  cumul_avant      numeric(10,1) not null,
  montant          numeric(10,2) not null check (montant >= 0),
  statut           text not null default 'a_valider' check (statut in ('a_valider', 'validee', 'refusee', 'remboursee')),
  declare_par      uuid,
  decide_par       uuid,
  decide_le        timestamptz,
  motif_decision   text,
  rembourse_le     date,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now()
);
comment on table public.filed_trajets_km is
  'Lot 45 (a4_53) : les trajets faits avec un véhicule personnel, remboursés au barème kilométrique ; approuvés par une autre personne.';
create index if not exists filed_trajets_km_benef on public.filed_trajets_km (client_id, beneficiaire, le);

do $$
declare t text;
begin
  alter table public.filed_baremes_km enable row level security;
  revoke all on table public.filed_baremes_km from anon, authenticated;
  grant select on public.filed_baremes_km to authenticated;
  grant all on public.filed_baremes_km to service_role;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_baremes_km' and policyname = 'filed_baremes_km_lecture') then
    create policy filed_baremes_km_lecture on public.filed_baremes_km for select to authenticated using (true);
  end if;
  alter table public.filed_trajets_km enable row level security;
  revoke all on table public.filed_trajets_km from anon, authenticated;
  grant select on public.filed_trajets_km to authenticated;
  grant all on public.filed_trajets_km to service_role;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_trajets_km' and policyname = 'filed_trajets_km_lecture') then
    create policy filed_trajets_km_lecture on public.filed_trajets_km for select to authenticated
      using (beneficiaire = (select auth.uid())
             or exists (select 1 from public.comptes c where c.client_id = filed_trajets_km.client_id and c.user_id = (select auth.uid())
                         and c.role in ('gerant', 'admin', 'valideur')));
  end if;
end $$;
create or replace trigger filed_trajets_km_maj_le before update on public.filed_trajets_km for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_trajets_km', 38, 'FILED, lot 45' where not exists (select 1 from private.tables_locataires where nom = 'filed_trajets_km');

-- Le barème annuel pour une distance annuelle (avant majoration électrique).
create or replace function private.filed_bareme_km(p_annee integer, p_vehicule text, p_cv integer, p_km numeric)
returns numeric language plpgsql stable security definer set search_path to '' as $$
declare b public.filed_baremes_km;
begin
  if coalesce(p_km, 0) <= 0 then return 0; end if;
  select * into b from public.filed_baremes_km x
   where x.annee = p_annee and x.vehicule = p_vehicule and p_cv between x.cv_min and x.cv_max
     and p_km > x.km_min and (x.km_max is null or p_km <= x.km_max)
   limit 1;
  if not found then
    raise exception 'Pas de barème kilométrique % pour ce véhicule (%, % CV).', p_annee, p_vehicule, p_cv using errcode = '22023';
  end if;
  return round(p_km * b.coef + b.fixe, 2);
end $$;
revoke all on function private.filed_bareme_km(integer, text, integer, numeric) from public, anon, authenticated;
grant execute on function private.filed_bareme_km(integer, text, integer, numeric) to service_role;

create or replace function private.filed_declarer_trajet(p_client uuid, p_entite uuid, p_le date, p_km numeric, p_vehicule text, p_cv integer,
  p_motif text, p_depart text default null, p_arrivee text default null, p_electrique boolean default false, p_beneficiaire uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_benef uuid; v_nom text; v_annee integer; v_bareme integer; v_cumul numeric; v_montant numeric; v_id uuid;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'], p_entite);
  v_benef := coalesce(p_beneficiaire, v_uid);
  if v_benef is null then raise exception 'Le bénéficiaire du trajet est à nommer.' using errcode = '22023'; end if;
  if v_uid is not null and v_benef <> v_uid then
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  end if;
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = v_benef) then
    raise exception 'Le bénéficiaire n''est pas membre de l''organisation.' using errcode = '22023';
  end if;
  if p_le is null or p_le > current_date then raise exception 'Un trajet a une date passée ou du jour.' using errcode = '22023'; end if;
  v_annee := extract(year from p_le)::integer;
  -- Le barème de l'année, sinon le plus récent publié (l'opérateur met l'année à jour quand il paraît).
  select max(b.annee) into v_bareme from public.filed_baremes_km b where b.annee <= v_annee and b.vehicule = p_vehicule;
  if v_bareme is null then raise exception 'Aucun barème kilométrique pour %.', p_vehicule using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('filed_trajets_km|' || v_benef::text || '|' || v_annee, 0));
  select coalesce(sum(t.km), 0) into v_cumul from public.filed_trajets_km t
   where t.client_id = p_client and t.beneficiaire = v_benef and t.vehicule = p_vehicule and t.statut <> 'refusee'
     and extract(year from t.le) = v_annee;
  v_montant := private.filed_bareme_km(v_bareme, p_vehicule, p_cv, v_cumul + p_km) - private.filed_bareme_km(v_bareme, p_vehicule, p_cv, v_cumul);
  if coalesce(p_electrique, false) then v_montant := round(v_montant * 1.2, 2); end if;
  select split_part(u.email, '@', 1) into v_nom from auth.users u where u.id = v_benef;   -- comme a4_35
  insert into public.filed_trajets_km (client_id, entite_id, beneficiaire, beneficiaire_nom, le, depart, arrivee, motif, km, vehicule, cv, electrique,
                                       bareme_annee, cumul_avant, montant, declare_par)
  values (p_client, p_entite, v_benef, left(coalesce(v_nom, 'Bénéficiaire'), 120), p_le, left(nullif(btrim(p_depart), ''), 200), left(nullif(btrim(p_arrivee), ''), 200),
          left(btrim(p_motif), 300), p_km, p_vehicule, p_cv, coalesce(p_electrique, false), v_bareme, v_cumul, greatest(v_montant, 0), v_uid)
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.trajet_km.declare', 'filed_trajet_km', v_id::text,
    jsonb_build_object('km', p_km, 'montant', v_montant, 'beneficiaire', v_benef, 'bareme', v_bareme), p_entite);
  return v_id;
end $$;
revoke all on function private.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) from public, anon;
grant execute on function private.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) to authenticated, service_role;
create or replace function public.filed_declarer_trajet(p_client uuid, p_entite uuid, p_le date, p_km numeric, p_vehicule text, p_cv integer,
  p_motif text, p_depart text default null, p_arrivee text default null, p_electrique boolean default false, p_beneficiaire uuid default null)
returns uuid language sql set search_path to '' as $$
  select private.filed_declarer_trajet(p_client, p_entite, p_le, p_km, p_vehicule, p_cv, p_motif, p_depart, p_arrivee, p_electrique, p_beneficiaire) $$;
comment on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) is
  'Lot 45 (a4_53) : déclare un trajet fait avec un véhicule personnel ; le montant suit le barème kilométrique sur le cumul de l''année. Soi-même ; pour un autre : gérant, admin, valideur.';
revoke all on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) to authenticated, service_role;

create or replace function private.filed_decider_trajet(p_trajet uuid, p_approuve boolean, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare t public.filed_trajets_km; v_uid uuid;
begin
  select * into t from public.filed_trajets_km where id = p_trajet for update;
  if not found then raise exception 'Trajet introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(t.client_id, array['gerant', 'admin', 'valideur'], t.entite_id);
  if v_uid is not null and v_uid = t.beneficiaire then
    raise exception 'Le bénéficiaire n''approuve pas son propre trajet.' using errcode = '42501';
  end if;
  if t.statut <> 'a_valider' then raise exception 'Ce trajet est déjà décidé (%).', t.statut using errcode = '55000'; end if;
  if not coalesce(p_approuve, false) and nullif(btrim(p_motif), '') is null then
    raise exception 'Un refus porte son motif.' using errcode = '22023';
  end if;
  update public.filed_trajets_km set statut = case when p_approuve then 'validee' else 'refusee' end, decide_par = v_uid, decide_le = now(),
         motif_decision = left(nullif(btrim(p_motif), ''), 300)
   where id = p_trajet;
  perform private.filed_journaliser(t.client_id, case when p_approuve then 'filed.trajet_km.approuve' else 'filed.trajet_km.refuse' end,
    'filed_trajet_km', t.id::text, jsonb_build_object('montant', t.montant, 'motif', left(nullif(btrim(p_motif), ''), 300)), t.entite_id);
end $$;
revoke all on function private.filed_decider_trajet(uuid, boolean, text) from public, anon;
grant execute on function private.filed_decider_trajet(uuid, boolean, text) to authenticated, service_role;
create or replace function public.filed_decider_trajet(p_trajet uuid, p_approuve boolean, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_decider_trajet(p_trajet, p_approuve, p_motif) $$;
comment on function public.filed_decider_trajet(uuid, boolean, text) is
  'Lot 45 (a4_53) : approuve ou refuse (avec motif) un trajet kilométrique. Gérant, admin, valideur ; jamais le bénéficiaire.';
revoke all on function public.filed_decider_trajet(uuid, boolean, text) from public, anon;
grant execute on function public.filed_decider_trajet(uuid, boolean, text) to authenticated, service_role;

-- L'état mensuel : le justificatif à déposer, et son total.
create or replace function private.filed_etat_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); v_du date := date_trunc('month', p_mois)::date; v_lignes text[]; r record; v_total numeric := 0;
        v_nom text; v_crlf text := chr(13) || chr(10); n integer := 0;
begin
  if v_uid is null or v_uid <> p_beneficiaire then
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  else
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  end if;
  v_lignes := array['date;depart;arrivee;motif;km;vehicule;cv;electrique;bareme;cumul_avant;montant;statut'];
  for r in select * from public.filed_trajets_km t
            where t.client_id = p_client and t.beneficiaire = p_beneficiaire and t.le >= v_du and t.le < (v_du + interval '1 month')::date
              and t.statut <> 'refusee'
            order by t.le, t.cree_le loop
    v_nom := r.beneficiaire_nom; n := n + 1;
    v_lignes := v_lignes || concat_ws(';', to_char(r.le, 'DD/MM/YYYY'), private.filed_csv_cellule(r.depart), private.filed_csv_cellule(r.arrivee),
      private.filed_csv_cellule(r.motif), private.filed_csv_cellule(r.km), r.vehicule, r.cv, case when r.electrique then 'oui' else 'non' end,
      r.bareme_annee, private.filed_csv_cellule(r.cumul_avant), private.filed_csv_cellule(r.montant), r.statut);
    if r.statut in ('validee', 'remboursee') then v_total := v_total + r.montant; end if;
  end loop;
  return jsonb_build_object('beneficiaire', p_beneficiaire, 'nom', v_nom, 'mois', v_du, 'trajets', n, 'total_approuve', v_total,
    'nom_fichier', 'frais_km_' || to_char(v_du, 'YYYY-MM') || '_' || private.filed_nom_sur(coalesce(v_nom, 'beneficiaire')) || '.csv',
    'contenu', array_to_string(v_lignes, v_crlf) || v_crlf
      || 'Total approuvé;' || replace(v_total::text, '.', ',') || v_crlf
      || 'Barème kilométrique fiscal (d × coef + fixe, sur le cumul annuel ; +20 % électrique) ; à déposer comme pièce de note de frais.' || v_crlf);
end $$;
revoke all on function private.filed_etat_frais_km(uuid, uuid, date) from public, anon;
grant execute on function private.filed_etat_frais_km(uuid, uuid, date) to authenticated, service_role;
create or replace function public.filed_etat_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_etat_frais_km(p_client, p_beneficiaire, p_mois) $$;
comment on function public.filed_etat_frais_km(uuid, uuid, date) is
  'Lot 45 (a4_53) : l''état mensuel des frais kilométriques d''une personne (CSV et total approuvé), le justificatif à déposer. Soi-même, ou gérant, admin, valideur.';
revoke all on function public.filed_etat_frais_km(uuid, uuid, date) from public, anon;
grant execute on function public.filed_etat_frais_km(uuid, uuid, date) to authenticated, service_role;

create or replace function private.filed_rembourser_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date, p_le date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_du date := date_trunc('month', p_mois)::date; n integer;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  update public.filed_trajets_km t set statut = 'remboursee', rembourse_le = coalesce(p_le, current_date)
   where t.client_id = p_client and t.beneficiaire = p_beneficiaire and t.statut = 'validee'
     and t.le >= v_du and t.le < (v_du + interval '1 month')::date;
  get diagnostics n = row_count;
  perform private.filed_journaliser(p_client, 'filed.trajet_km.rembourse', 'filed_trajet_km', p_beneficiaire::text,
    jsonb_build_object('mois', v_du, 'trajets', n, 'le', coalesce(p_le, current_date)));
  return n;
end $$;
revoke all on function private.filed_rembourser_frais_km(uuid, uuid, date, date) from public, anon;
grant execute on function private.filed_rembourser_frais_km(uuid, uuid, date, date) to authenticated, service_role;
create or replace function public.filed_rembourser_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date, p_le date default current_date)
returns integer language sql set search_path to '' as $$ select private.filed_rembourser_frais_km(p_client, p_beneficiaire, p_mois, p_le) $$;
comment on function public.filed_rembourser_frais_km(uuid, uuid, date, date) is
  'Lot 45 (a4_53) : marque remboursés les trajets approuvés du mois d''une personne. Gérant, admin, valideur.';
revoke all on function public.filed_rembourser_frais_km(uuid, uuid, date, date) from public, anon;
grant execute on function public.filed_rembourser_frais_km(uuid, uuid, date, date) to authenticated, service_role;

-- L'opérateur met le barème à jour chaque année (une ligne par tranche).
create or replace function public.filed_regler_bareme_km(p_annee integer, p_vehicule text, p_cv_min integer, p_cv_max integer,
  p_km_min numeric, p_km_max numeric, p_coef numeric, p_fixe numeric, p_source text)
returns void language sql security definer set search_path to '' as $$
  insert into public.filed_baremes_km (annee, vehicule, cv_min, cv_max, km_min, km_max, coef, fixe, source)
  values (p_annee, p_vehicule, p_cv_min, p_cv_max, p_km_min, p_km_max, p_coef, coalesce(p_fixe, 0), p_source)
  on conflict (annee, vehicule, cv_min, km_min) do update
    set cv_max = excluded.cv_max, km_max = excluded.km_max, coef = excluded.coef, fixe = excluded.fixe, source = excluded.source
$$;
comment on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) is
  'Lot 45 (a4_53) : pose ou corrige une tranche du barème kilométrique. Opérateur (service_role).';
revoke all on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) to service_role;
