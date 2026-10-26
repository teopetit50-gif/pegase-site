-- 20261019142844 a4_51_a4_55
-- Source : dépôt : f6cb6207 omega/migrations/a4_51_filed_lot43_plusieurs_boites.sql ; f6cb6207 omega/migrations/a4_52_filed_lot44_vue_cabinet.sql ; f6cb6207 omega/migrations/a4_53_filed_lot45_frais_kilometriques.sql ; f6cb6207 omega/migrations/a4_54_filed_lot46_historique_par_palier.sql ; f6cb6207 omega/migrations/a4_55_filed_lot47_tickets_de_caisse.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_51_filed_lot43_plusieurs_boites.sql @ f6cb6207, a4_52_filed_lot44_vue_cabinet.sql @ f6cb6207, a4_53_filed_lot45_frais_kilometriques.sql @ f6cb6207, a4_54_filed_lot46_historique_par_palier.sql @ f6cb6207, a4_55_filed_lot47_tickets_de_caisse.sql @ f6cb6207 ; a4_39..a4_43 cités comme tests : ignorés.
-- ═══ omega/migrations/a4_51_filed_lot43_plusieurs_boites.sql @ f6cb6207
-- FILED, lot 43 (a4_51) — plusieurs boîtes de réception par organisation, et la limite du palier (Teo, 18/10 ;
-- chiffrage n° 23 : « une boîte mail connectée » / « deux boîtes » / « boîtes mail illimitées »).
--
-- Les boîtes sont celles du socle (public.expediteurs, canal email, module filed ; A2 les crée et les active) : le socle
-- en admet déjà plusieurs par organisation. FILED tient la sienne :
--   · public.filed_boites : chaque boîte FILED déclarée, la société où ses factures sont rangées, un libellé ;
--   · la limite du palier (filed_paliers.boites, a4_50) s'applique à la déclaration ; sans abonnement, pas de limite ;
--   · le rattachement d'un courriel (private.filed_rattacher_reception, a4_20) range les pièces dans la société de la
--     boîte qui l'a reçu (une société donnée par la réception elle-même passe avant ; sinon la société principale) ;
--   · une boîte non déclarée continue de recevoir comme avant : aucune facture n'est perdue, l'état le signale.
-- Portes : filed_declarer_boite, filed_retirer_boite (gérant, admin) ; filed_boites_etat (gérant, admin, valideur).
-- Branchement par repère. Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_boites (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  expediteur_id uuid not null unique references public.expediteurs(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete set null,
  libelle       text check (libelle is null or char_length(libelle) <= 120),
  actif         boolean not null default true,
  declaree_par  uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
comment on table public.filed_boites is
  'Lot 43 (a4_51) : les boîtes de réception FILED de l''organisation (expéditeurs du socle, canal email) et la société où leurs factures sont rangées.';
alter table public.filed_boites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_boites' and policyname = 'filed_boites_lecture') then
    create policy filed_boites_lecture on public.filed_boites for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on table public.filed_boites from anon, authenticated;
grant select on public.filed_boites to authenticated;
grant all on public.filed_boites to service_role;
create or replace trigger filed_boites_maj_le before update on public.filed_boites for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_boites', 36, 'FILED, lot 43' where not exists (select 1 from private.tables_locataires where nom = 'filed_boites');

-- La société d'une boîte déclarée, par son adresse (comme le socle résout une boîte).
create or replace function private.filed_entite_de_boite(p_client uuid, p_boite text)
returns uuid language sql stable security definer set search_path to '' as $$
  select b.entite_id from public.filed_boites b join public.expediteurs e on e.id = b.expediteur_id
   where b.client_id = p_client and b.actif and lower(e.identite) = lower(p_boite) limit 1
$$;
revoke all on function private.filed_entite_de_boite(uuid, text) from public, anon, authenticated;
grant execute on function private.filed_entite_de_boite(uuid, text) to service_role;

create or replace function private.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_e public.expediteurs; v_p public.filed_paliers; v_n integer; v_id uuid;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select * into v_e from public.expediteurs e where e.id = p_expediteur and e.client_id = p_client;
  if not found or v_e.canal <> 'email' or v_e.module is distinct from 'filed' then
    raise exception 'Cette boîte n''est pas une boîte de réception FILED de l''organisation.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites x where x.id = p_entite and x.client_id = p_client) then
    raise exception 'La société n''est pas à cette organisation.' using errcode = '22023';
  end if;
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif and b.expediteur_id <> p_expediteur;
  if v_p.boites is not null and v_n >= v_p.boites then
    raise exception 'Le palier % permet % boîte(s) ; retirez-en une ou changez de palier.', v_p.libelle, v_p.boites using errcode = '55000';
  end if;
  insert into public.filed_boites (client_id, expediteur_id, entite_id, libelle, declaree_par)
  values (p_client, p_expediteur, p_entite, left(nullif(btrim(p_libelle), ''), 120), v_par)
  on conflict (expediteur_id) do update set entite_id = excluded.entite_id, libelle = excluded.libelle, actif = true, declaree_par = excluded.declaree_par
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.boite.declaree', 'filed_boite', v_id::text,
    jsonb_build_object('adresse', v_e.identite, 'entite', p_entite));
  return v_id;
end $$;
revoke all on function private.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function private.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;
create or replace function public.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_declarer_boite(p_client, p_expediteur, p_entite, p_libelle) $$;
comment on function public.filed_declarer_boite(uuid, uuid, uuid, text) is
  'Lot 43 (a4_51) : déclare une boîte de réception FILED (expéditeur du socle) et la société où ranger ses factures, dans la limite du palier. Gérant ou admin.';
revoke all on function public.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;

create or replace function private.filed_retirer_boite(p_boite uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_b public.filed_boites;
begin
  select * into v_b from public.filed_boites where id = p_boite for update;
  if not found then raise exception 'Boîte introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_b.client_id, array['gerant', 'admin']);
  update public.filed_boites set actif = false where id = p_boite;
  perform private.filed_journaliser(v_b.client_id, 'filed.boite.retiree', 'filed_boite', v_b.id::text, jsonb_build_object('expediteur', v_b.expediteur_id));
end $$;
revoke all on function private.filed_retirer_boite(uuid) from public, anon;
grant execute on function private.filed_retirer_boite(uuid) to authenticated, service_role;
create or replace function public.filed_retirer_boite(p_boite uuid)
returns void language sql set search_path to '' as $$ select private.filed_retirer_boite(p_boite) $$;
comment on function public.filed_retirer_boite(uuid) is
  'Lot 43 (a4_51) : retire une boîte de la liste FILED (elle compte de nouveau hors limite ; ses courriels sont rangés dans la société principale). Gérant ou admin.';
revoke all on function public.filed_retirer_boite(uuid) from public, anon;
grant execute on function public.filed_retirer_boite(uuid) to authenticated, service_role;

create or replace function private.filed_boites_etat(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_n integer; v_liste jsonb;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif;
  select coalesce(jsonb_agg(jsonb_build_object('expediteur', e.id, 'adresse', e.identite, 'statut', e.statut,
           'declaree', coalesce(b.actif, false), 'boite', b.id, 'societe', b.entite_id,
           'societe_nom', (select x.nom from public.entites x where x.id = b.entite_id), 'libelle', b.libelle) order by e.cree_le), '[]'::jsonb)
    into v_liste
    from public.expediteurs e left join public.filed_boites b on b.expediteur_id = e.id
   where e.client_id = p_client and e.module = 'filed' and e.canal = 'email';
  return jsonb_build_object('palier', v_p.code, 'limite', v_p.boites, 'declarees', v_n,
    'non_declarees', (select count(*) from jsonb_array_elements(v_liste) x where not (x ->> 'declaree')::boolean),
    'boites', v_liste);
end $$;
revoke all on function private.filed_boites_etat(uuid) from public, anon;
grant execute on function private.filed_boites_etat(uuid) to authenticated, service_role;
create or replace function public.filed_boites_etat(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_boites_etat(p_client) $$;
comment on function public.filed_boites_etat(uuid) is
  'Lot 43 (a4_51) : les boîtes FILED de l''organisation (déclarées ou non, statut, société), la limite du palier. Gérant, admin, valideur.';
revoke all on function public.filed_boites_etat(uuid) from public, anon;
grant execute on function public.filed_boites_etat(uuid) to authenticated, service_role;

-- Le rattachement d'un courriel range ses pièces dans la société de la boîte (texte d'a4_20, par repère).
do $do$
declare
  v_def text;
  v_ancien text := $o$(case when r.entite_id is null then x.principale else x.id = r.entite_id end)$o$;
  v_nouveau text := $n$(case when coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) is null then x.principale   -- a4_51 : la société de la boîte
                else x.id = coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) end)$n$;
begin
  v_def := pg_get_functiondef('private.filed_rattacher_reception(bigint)'::regprocedure);
  if position('private.filed_entite_de_boite(r.client_id, r.boite)' in v_def) > 0 then
    raise notice 'a4_51 : private.filed_rattacher_reception déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_51 : le repère attendu n''est pas une fois et une seule dans private.filed_rattacher_reception. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_51 : private.filed_rattacher_reception branchée.';
end $do$;


-- ═══ omega/migrations/a4_52_filed_lot44_vue_cabinet.sql @ f6cb6207
-- FILED, lot 44 (a4_52) — l'espace multi-dossiers d'un cabinet : la vue d'ensemble de tous ses dossiers (Teo, 18/10 ;
-- chiffrage n° 33, 34 : « un espace par dossier client », « vue d'ensemble sur tous les dossiers »).
--
-- Un dossier est une organisation du socle ; un cabinet y travaille par les comptes du socle (une personne a un rôle
-- dans chaque organisation qu'elle suit) : les droits restent ceux du socle, FILED n'en crée aucun. FILED donne :
--   · public.filed_vue_ensemble() : une ligne par organisation où la personne a un rôle FILED (gérant, admin,
--     valideur, collaborateur) et où FILED est installé — pièces du mois et quota (a4_50), bloquées, en attente
--     d'approbation, à compléter, en litige, à payer sous 30 jours, en retard, dernière pièce reçue. Chaque chiffre
--     passe par les portes de pilotage existantes, donc par le périmètre de la personne dans ce dossier ;
--   · public.filed_epingler_dossier(organisation, épinglé, rang) : l'ordre et les favoris de la personne
--     (public.filed_dossiers_preferes, à elle seule).
-- La bascule d'un dossier à l'autre est celle de l'application (choix de l'organisation) : rien à poser ici.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_dossiers_preferes (
  user_id    uuid not null,
  client_id  uuid not null references public.clients(id) on delete cascade,
  epingle    boolean not null default true,
  rang       integer not null default 100,
  maj_le     timestamptz not null default now(),
  primary key (user_id, client_id)
);
comment on table public.filed_dossiers_preferes is
  'Lot 44 (a4_52) : les dossiers qu''une personne épingle, et leur ordre, dans la vue d''ensemble FILED. À elle seule.';
alter table public.filed_dossiers_preferes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_dossiers_preferes' and policyname = 'filed_dossiers_preferes_soi') then
    create policy filed_dossiers_preferes_soi on public.filed_dossiers_preferes for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
revoke all on table public.filed_dossiers_preferes from anon, authenticated;
grant select on public.filed_dossiers_preferes to authenticated;
grant all on public.filed_dossiers_preferes to service_role;
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_dossiers_preferes', 37, 'FILED, lot 44' where not exists (select 1 from private.tables_locataires where nom = 'filed_dossiers_preferes');

create or replace function private.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); c record; v_q jsonb; v_e record;
begin
  if v_uid is null then return; end if;   -- une vue de personne : le serveur n'en a pas
  for c in
    select k.client_id, cl.nom, k.role, coalesce(p.epingle, false) as epingle, coalesce(p.rang, 100) as rang
      from public.comptes k join public.clients cl on cl.id = k.client_id
      left join public.filed_dossiers_preferes p on p.user_id = v_uid and p.client_id = k.client_id
     where k.user_id = v_uid and k.role in ('gerant', 'admin', 'valideur', 'collaborateur')
       and exists (select 1 from public.filed_reglages g where g.client_id = k.client_id and g.entite_id is null and g.actif)
     order by coalesce(p.epingle, false) desc, coalesce(p.rang, 100), cl.nom
  loop
    client_id := c.client_id; organisation := c.nom; role := c.role; epingle := c.epingle; rang := c.rang;
    pieces_mois := null; quota := null; etat_quota := null; bloquees := 0; attente := 0; a_completer := 0; litiges := 0;
    a_payer_30j := 0; en_retard := 0; dernier_recu_le := null; erreur := null;
    begin
      if c.role in ('gerant', 'admin', 'valideur') then
        v_q := private.filed_compteur(c.client_id, null);
        pieces_mois := (v_q ->> 'pieces')::integer; quota := (v_q ->> 'quota')::integer; etat_quota := v_q ->> 'etat';
      end if;
      for v_e in select * from private.filed_pieces_en_cours(c.client_id, null) loop
        case v_e.categorie
          when 'bloquees' then bloquees := v_e.nombre;
          when 'attente' then attente := v_e.nombre;
          when 'a_completer' then a_completer := v_e.nombre;
          when 'litige' then litiges := v_e.nombre;
          else null;
        end case;
      end loop;
      select coalesce(sum(x.reste_a_payer) filter (where x.echeance <= current_date + 30), 0), count(*) filter (where x.en_retard)
        into a_payer_30j, en_retard
        from private.filed_echeancier(c.client_id, null, null) x;
      select max(d.recu_le) into dernier_recu_le from public.filed_documents d
       where d.client_id = c.client_id and private.perimetre_couvre(v_uid, d.client_id, d.entite_id);
    exception when others then
      erreur := left(sqlerrm, 200);   -- un dossier illisible n'empêche pas la vue des autres
    end;
    return next;
  end loop;
end $$;
revoke all on function private.filed_vue_ensemble() from public, anon;
grant execute on function private.filed_vue_ensemble() to authenticated, service_role;

create or replace function public.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language sql stable set search_path to '' as $$ select * from private.filed_vue_ensemble() $$;
comment on function public.filed_vue_ensemble() is
  'Lot 44 (a4_52) : la vue d''ensemble de tous les dossiers (organisations) où la personne a un rôle FILED : pièces du mois et quota, en cours, à payer, retards. Droits et périmètres du socle.';
revoke all on function public.filed_vue_ensemble() from public, anon;
grant execute on function public.filed_vue_ensemble() to authenticated, service_role;

create or replace function private.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Une personne épingle ses dossiers.' using errcode = '42501'; end if;
  if not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = p_client) then
    raise exception 'Vous ne suivez pas ce dossier.' using errcode = '42501';
  end if;
  insert into public.filed_dossiers_preferes (user_id, client_id, epingle, rang)
  values (v_uid, p_client, coalesce(p_epingle, true), coalesce(p_rang, 100))
  on conflict (user_id, client_id) do update
    set epingle = excluded.epingle, rang = coalesce(p_rang, public.filed_dossiers_preferes.rang), maj_le = now();
end $$;
revoke all on function private.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function private.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;
create or replace function public.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language sql set search_path to '' as $$ select private.filed_epingler_dossier(p_client, p_epingle, p_rang) $$;
comment on function public.filed_epingler_dossier(uuid, boolean, integer) is
  'Lot 44 (a4_52) : épingle (ou non) un dossier et fixe son rang dans la vue d''ensemble de la personne.';
revoke all on function public.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function public.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;


-- ═══ omega/migrations/a4_53_filed_lot45_frais_kilometriques.sql @ f6cb6207
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


-- ═══ omega/migrations/a4_54_filed_lot46_historique_par_palier.sql @ f6cb6207
-- FILED, lot 46 (a4_54) — la durée d'historique consultable par palier (Teo, 18/10, n° 7 du chantier ; chiffrage n° 26).
--
-- Le site promettait « trois mois / douze mois / historique complet ». Décision de Teo du 17/10 : historique complet
-- pour tous. Ce lot en fait un réglage technique, sans rien retirer :
--   · filed_paliers.historique_mois (a4_50) : nul = complet ; c'est la valeur des trois paliers, conformément au 17/10 ;
--     l'opérateur peut la régler (filed_regler_palier) ;
--   · public.filed_fenetre_historique(organisation) : la date à partir de laquelle l'écran montre les pièces de
--     l'organisation, selon son palier (nulle : tout) ;
--   · ce que la fenêtre ne touche JAMAIS : la conservation légale (registre, archives, écritures, FEC : dix ans),
--     le dossier de sortie (toujours complet, a4_33, a4_49), l'échéancier (une facture ancienne non réglée reste due),
--     les contrôles et la piste d'audit. Rien n'est effacé ni masqué en base : c'est une borne d'affichage.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create or replace function private.filed_fenetre_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_depuis date;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  v_p := private.filed_palier_du(p_client, current_date);
  if v_p.historique_mois is not null then
    v_depuis := (date_trunc('month', (now() at time zone 'Europe/Paris')) - make_interval(months => v_p.historique_mois - 1))::date;
  end if;
  return jsonb_build_object('palier', v_p.code, 'historique_mois', v_p.historique_mois, 'depuis', v_depuis,
    'complet', v_depuis is null,
    'texte', case when v_depuis is null then 'Historique complet.'
                  else format('Historique des %s derniers mois (depuis le %s) ; tout reste conservé et exportable.', v_p.historique_mois, to_char(v_depuis, 'DD/MM/YYYY')) end);
end $$;
revoke all on function private.filed_fenetre_historique(uuid) from public, anon;
grant execute on function private.filed_fenetre_historique(uuid) to authenticated, service_role;

create or replace function public.filed_fenetre_historique(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_fenetre_historique(p_client) $$;
comment on function public.filed_fenetre_historique(uuid) is
  'Lot 46 (a4_54) : la borne d''affichage de l''historique selon le palier (nulle : complet, la règle du 17/10). Ne masque ni n''efface rien en base. Membres de l''organisation.';
revoke all on function public.filed_fenetre_historique(uuid) from public, anon;
grant execute on function public.filed_fenetre_historique(uuid) to authenticated, service_role;


-- ═══ omega/migrations/a4_55_filed_lot47_tickets_de_caisse.sql @ f6cb6207
-- FILED, lot 47 (a4_55) — le ticket de caisse sans fournisseur identifié (chiffrage n° 10 : « ticket de caisse
-- froissé » ; « rattachement d'un ticket à une dépense sans fournisseur identifié : à préciser »).
--
-- Un ticket se lit comme une facture, mais n'a souvent ni SIREN, ni TVA, ni numéro lisibles : il restait bloqué
-- (« à compléter : le fournisseur, le numéro »). Désormais, avant les contrôles :
--   · une pièce est un ticket si le lecteur l'a dit (pieces.type_piece : ticket, ticket_caisse, ticket_de_caisse,
--     recu) ou si, sans fournisseur identifié, son montant ne dépasse pas le seuil des mentions (150 € HT par défaut,
--     filed_reglages.seuil_mentions_ht — le seuil de la facture simplifiée) ; un avoir n'en est jamais un ;
--   · le ticket est rangé chez le fournisseur « Tickets de caisse » de l'organisation (code TICKETS, actif, créé au
--     premier ticket) ; le nom du commerçant lu reste sur la facture (fournisseur_lu) ; sans numéro lisible, il prend
--     le numéro de réception (TICKET-R2026-000123) ;
--   · le doublon « probable » (même fournisseur, même montant, à quelques jours) ne vaut pas entre tickets : deux cafés
--     à 3,50 € ne sont pas une même facture ; le doublon exact (même numéro) vaut toujours ;
--   · une personne peut dire qu'une pièce est ou n'est pas un ticket (filed_marquer_ticket) ; la facture est recontrôlée.
-- Le reste ne change pas : catégorie (a4_47), note de frais (a4_35), contrôles des montants et de la TVA.
-- Branchements par repère dans private.filed_controler_facture (texte d'a4_11). Migration idempotente ; aucun DROP,
-- aucune suppression ; aucun envoi.

alter table public.filed_factures add column if not exists est_ticket boolean not null default false;
alter table public.filed_factures add column if not exists ticket_force boolean;   -- le choix d'une personne : vrai, faux, ou nul

-- Le fournisseur « Tickets de caisse » de l'organisation, créé au besoin.
create or replace function private.filed_fournisseur_tickets(p_client uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  select f.id into v_id from public.filed_fournisseurs f where f.client_id = p_client and f.code = 'TICKETS';
  if v_id is null then
    insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
    values (p_client, 'TICKETS', 'Tickets de caisse', 'tickets de caisse', 'FR', 'actif', 'saisie')
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select f.id into v_id from public.filed_fournisseurs f where f.client_id = p_client and f.code = 'TICKETS';
    end if;
  end if;
  return v_id;
end $$;
revoke all on function private.filed_fournisseur_tickets(uuid) from public, anon, authenticated;
grant execute on function private.filed_fournisseur_tickets(uuid) to service_role;

-- Reconnaître un ticket et le ranger. Rend vrai si la facture a changé.
create or replace function private.filed_reconnaitre_ticket(p_facture uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_doc public.filed_documents; v_type text; v_seuil numeric; v_ticket boolean; v_four uuid;
        v_tickets uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.nature <> 'facture' then return false; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select lower(p.type_piece) into v_type from public.pieces p where p.id = v_doc.piece_id;
  v_seuil := coalesce((private.filed_reglage(v_f.client_id, v_f.entite_id)).seuil_mentions_ht, 150);
  v_tickets := (select f.id from public.filed_fournisseurs f where f.client_id = v_f.client_id and f.code = 'TICKETS');
  v_ticket := case
    when v_f.ticket_force is not null then v_f.ticket_force
    when v_f.fournisseur_id is not null and v_f.fournisseur_id is distinct from v_tickets then false   -- un fournisseur identifié l'emporte
    when v_type in ('ticket', 'ticket_caisse', 'ticket_de_caisse', 'recu') then true
    when coalesce(v_f.montant_ht, v_f.montant_ttc) is not null and coalesce(v_f.montant_ht, v_f.montant_ttc) <= v_seuil then true
    else false end;
  if v_ticket = v_f.est_ticket and (not v_ticket or v_f.fournisseur_id is not null) then return false; end if;
  if v_ticket then
    v_four := coalesce(case when v_f.fournisseur_id is distinct from v_tickets and v_f.ticket_force then v_f.fournisseur_id end,
                       case when v_f.fournisseur_id is null or v_f.fournisseur_id = v_tickets then private.filed_fournisseur_tickets(v_f.client_id) end,
                       v_f.fournisseur_id);
    update public.filed_factures
       set est_ticket = true, fournisseur_id = v_four,
           numero = coalesce(numero, 'TICKET-' || v_doc.reference),
           numero_normalise = coalesce(numero_normalise, upper(regexp_replace('TICKET-' || v_doc.reference, '[^A-Za-z0-9]', '', 'g')))
     where id = v_f.id;
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ticket',
      format('Ticket de caisse%s : rangé chez « Tickets de caisse »%s.',
             coalesce(' (' || nullif(v_f.fournisseur_lu ->> 'nom', '') || ')', ''),
             case when v_f.numero is null then ', numéroté par sa réception' else '' end),
      jsonb_build_object('type_lu', v_type, 'seuil_ht', v_seuil, 'force', v_f.ticket_force));
  else
    update public.filed_factures
       set est_ticket = false, fournisseur_id = case when fournisseur_id = v_tickets then null else fournisseur_id end
     where id = v_f.id;
  end if;
  return true;
end $$;
revoke all on function private.filed_reconnaitre_ticket(uuid) from public, anon, authenticated;
grant execute on function private.filed_reconnaitre_ticket(uuid) to service_role;

-- Une personne dit qu'une pièce est (ou n'est pas) un ticket ; nul rend la main à la machine.
create or replace function private.filed_marquer_ticket(p_facture uuid, p_ticket boolean)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if v_f.statut not in ('a_completer', 'bloquee', 'a_valider') then
    raise exception 'Cette facture est % : elle ne change plus de nature.', v_f.statut using errcode = '55000';
  end if;
  update public.filed_factures set ticket_force = p_ticket where id = v_f.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ticket',
    case when p_ticket is null then 'Une personne rend à FILED le choix ticket / facture.'
         when p_ticket then 'Une personne dit : c''est un ticket de caisse.'
         else 'Une personne dit : ce n''est pas un ticket de caisse.' end, jsonb_build_object('force', p_ticket));
  return private.filed_controler_facture(v_f.id);
end $$;
revoke all on function private.filed_marquer_ticket(uuid, boolean) from public, anon;
grant execute on function private.filed_marquer_ticket(uuid, boolean) to authenticated, service_role;
create or replace function public.filed_marquer_ticket(p_facture uuid, p_ticket boolean)
returns text language sql set search_path to '' as $$ select private.filed_marquer_ticket(p_facture, p_ticket) $$;
comment on function public.filed_marquer_ticket(uuid, boolean) is
  'Lot 47 (a4_55) : dit qu''une pièce est un ticket de caisse (vrai), n''en est pas un (faux), ou laisse FILED juger (nul) ; la facture est recontrôlée. Membres (hors lecteur).';
revoke all on function public.filed_marquer_ticket(uuid, boolean) from public, anon;
grant execute on function public.filed_marquer_ticket(uuid, boolean) to authenticated, service_role;

-- Les branchements dans private.filed_controler_facture (texte d'a4_11, par repère).
do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  for r in select * from (values
    ($o1$  if private.filed_completer_fournisseur_lu(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$o1$,
     $n1$  if private.filed_completer_fournisseur_lu(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
  -- a4_55 : un ticket de caisse sans fournisseur identifié est rangé chez « Tickets de caisse ».
  if private.filed_reconnaitre_ticket(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$n1$),
    ($o2$      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
$o2$,
     $n2$      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and not v_f.est_ticket   -- a4_55 : deux tickets au même montant ne sont pas une même facture
$n2$)
  ) t(ancien, nouveau)
  loop
    if position(r.nouveau in v_def) > 0 then continue; end if;
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n <> 1 then
      raise exception 'a4_55 : repère trouvé % fois au lieu d''une dans private.filed_controler_facture. Rien n''est posé.', v_n;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_55 : private.filed_controler_facture branchée.';
  else
    raise notice 'a4_55 : private.filed_controler_facture déjà branchée.';
  end if;
end $do$;
