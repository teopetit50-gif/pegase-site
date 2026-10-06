-- b1_06 — VARELO : les comptes réciproques intragroupe à la clôture (session B1, vague 3, manque n° 3, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_04 (elle lit ses balances âgées).
--
-- CE QUE ÇA CORRIGE (omega/NOTES-B1.md, « Vague 3 », n° 3). En consolidation, les créances et dettes
-- réciproques entre sociétés du groupe s'éliminent (règlement ANC 2020-01) : il faut donc qu'elles soient
-- ÉGALES des deux côtés. Aujourd'hui l'écart se cherche par tableur et courriel à chaque clôture.
-- Varelo a déjà tout ce qu'il faut : le référentiel marque un tiers « intragroupe » et dit quelle société
-- il est (grp_ref_objets.intragroupe_entite_id) ; b1_04 porte les balances âgées de chaque société.
--
-- CE QUI EST POSÉ.
--   · vue public.grp_reciproques (security_invoker) : une ligne par paire (créancier, débiteur) de sociétés
--     du groupe — la créance que le créancier porte sur le débiteur (sa balance CLIENTS, codes intragroupe
--     du débiteur), la dette que le débiteur reconnaît envers le créancier (sa balance FOURNISSEURS, codes
--     intragroupe du créancier), les deux dates d'arrêté, l'écart, et l'état : concorde (écart < 1 €, même
--     arrêté) | ecart | justifie | dates_differentes | manque_creancier | manque_debiteur.
--   · public.grp_reciproques_justifs : l'explication d'un écart (en transit, change, litige, décalage de
--     période, erreur de saisie, autre), attachée à l'écart ET aux deux arrêtés du moment : un nouveau dépôt
--     qui change l'écart rend la justification caduque, l'écart redevient à expliquer. Rien ne s'efface.
--   · portes : grp_justifier_ecart (gérant, admin, valideur de la direction financière) ;
--     grp_exporter_reciproques (gérant, admin, valideur) : le tableau des réciproques pour la consolidation
--     et les commissaires aux comptes, en CSV protégé contre l'injection tableur.
--   · journal opposable : varelo.reciproques.justification, varelo.reciproques.export.
--
-- Périmètre : la vue suit la RLS des balances ; une personne au périmètre partiel ne voit que le côté de
-- ses sociétés (l'autre côté lui apparaît « manquant »). Le tableau de clôture se lit au périmètre total.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de suppression. Nouvelle table :
-- revoke all puis SELECT. Fonctions de private : EXECUTE retiré à PUBLIC et anon ; rendu à authenticated
-- pour les deux appelées par les portes publiques.

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Correction de b1_04 : deux dépôts d'une même transaction (une reprise, un script) avaient la même heure
--    now() et le même arrêté : le « dépôt courant » était tiré au hasard. L'heure réelle les départage.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.grp_encours_depots alter column depose_le set default clock_timestamp();

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les justifications d'écart
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_reciproques_justifs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  creancier_id uuid not null,
  debiteur_id uuid not null,
  arrete_creancier date,
  arrete_debiteur date,
  creance numeric(16,2),
  dette numeric(16,2),
  ecart numeric(16,2) not null,
  categorie text not null,
  motif text not null,
  justifie_par uuid,
  justifie_le timestamptz not null default now(),
  constraint grp_reciproques_justifs_creancier_fkey foreign key (client_id, creancier_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_reciproques_justifs_debiteur_fkey foreign key (client_id, debiteur_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_reciproques_justifs_paire check (creancier_id <> debiteur_id),
  constraint grp_reciproques_justifs_categorie_check check (categorie in ('en_transit', 'change', 'litige', 'decalage_periode', 'erreur_saisie', 'autre')),
  constraint grp_reciproques_justifs_motif_check check (char_length(btrim(motif)) between 1 and 500)
);
comment on table public.grp_reciproques_justifs is 'VARELO — l''explication d''un écart entre la créance d''une société du groupe et la dette réciproque de l''autre, valable pour cet écart et ces deux arrêtés. Écrite par grp_justifier_ecart seulement.';

create index if not exists grp_reciproques_justifs_paire_idx on public.grp_reciproques_justifs (client_id, creancier_id, debiteur_id, justifie_le desc);

create or replace trigger grp_reciproques_justifs_tracer after insert or update on public.grp_reciproques_justifs
  for each row execute function private.tracer();

alter table public.grp_reciproques_justifs enable row level security;
revoke all on public.grp_reciproques_justifs from anon, authenticated;
grant select on public.grp_reciproques_justifs to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_reciproques_justifs'
                 and policyname = 'membres lisent les justifications de leur perimetre') then
    create policy "membres lisent les justifications de leur perimetre" on public.grp_reciproques_justifs
      for select to authenticated
      using (client_id in (select private.mes_clients())
             and (private.voit_entite(client_id, creancier_id) or private.voit_entite(client_id, debiteur_id)));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La vue des réciproques
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.grp_reciproques with (security_invoker = true) as
  with cotes as (
    -- une ligne de balance courante dont le tiers est une autre société du groupe
    select p.client_id,
           case when p.nature = 'client' then p.entite_id else o.intragroupe_entite_id end as creancier_id,
           case when p.nature = 'client' then o.intragroupe_entite_id else p.entite_id end as debiteur_id,
           p.nature, p.total, p.arrete_le
    from public.grp_encours_par_code p
    join public.grp_ref_objets o on o.client_id = p.client_id and o.id = p.objet_id
    where o.intragroupe and o.intragroupe_entite_id is not null and o.intragroupe_entite_id <> p.entite_id
  ), paires as (
    select c.client_id, c.creancier_id, c.debiteur_id,
           sum(c.total) filter (where c.nature = 'client') as creance,
           sum(c.total) filter (where c.nature = 'fournisseur') as dette,
           max(c.arrete_le) filter (where c.nature = 'client') as arrete_creancier,
           max(c.arrete_le) filter (where c.nature = 'fournisseur') as arrete_debiteur,
           (count(*) filter (where c.nature = 'client'))::integer as codes_creancier,
           (count(*) filter (where c.nature = 'fournisseur'))::integer as codes_debiteur
    from cotes c
    group by c.client_id, c.creancier_id, c.debiteur_id
  ), calcul as (
    select p.*, coalesce(p.creance, 0) - coalesce(p.dette, 0) as ecart from paires p
  )
  select k.client_id, k.creancier_id, ec.nom as creancier, k.debiteur_id, ed.nom as debiteur,
         k.creance, k.dette, k.ecart, k.arrete_creancier, k.arrete_debiteur, k.codes_creancier, k.codes_debiteur,
         j.id as justification_id, j.categorie, j.motif, j.justifie_le, j.justifie_par,
         case
           when k.creance is null then 'manque_creancier'
           when k.dette is null then 'manque_debiteur'
           when j.id is not null then 'justifie'
           when k.arrete_creancier <> k.arrete_debiteur then 'dates_differentes'
           when abs(k.ecart) < 1 then 'concorde'
           else 'ecart'
         end as etat
  from calcul k
  join public.entites ec on ec.client_id = k.client_id and ec.id = k.creancier_id
  join public.entites ed on ed.client_id = k.client_id and ed.id = k.debiteur_id
  left join lateral (
    select x.* from public.grp_reciproques_justifs x
    where x.client_id = k.client_id and x.creancier_id = k.creancier_id and x.debiteur_id = k.debiteur_id
      and x.ecart = k.ecart
      and x.arrete_creancier is not distinct from k.arrete_creancier
      and x.arrete_debiteur is not distinct from k.arrete_debiteur
    order by x.justifie_le desc
    limit 1
  ) j on true;
comment on view public.grp_reciproques is 'VARELO — les comptes réciproques intragroupe : pour chaque paire (créancier, débiteur) de sociétés du groupe, la créance vue du créancier (balance clients), la dette vue du débiteur (balance fournisseurs), l''écart et son état. Une justification ne vaut que pour l''écart et les arrêtés où elle a été donnée.';

revoke all on public.grp_reciproques from anon, authenticated;
grant select on public.grp_reciproques to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les portes
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_justifier_ecart(p_client uuid, p_creancier uuid, p_debiteur uuid, p_categorie text, p_motif text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  r record;
  v_id uuid;
begin
  if v_uid is not null and not (
       private.a_un_role(p_client, array['gerant', 'admin'])
       or (private.a_un_role(p_client, array['valideur'])
           and exists (select 1 from public.equipes e
                       where e.client_id = p_client and e.cle = 'direction_financiere' and private.dans_equipe(v_uid, e.id)))) then
    raise exception 'Un écart intragroupe se justifie par le gérant, l''administrateur ou la direction financière.' using errcode = '42501';
  end if;
  if p_categorie is null or p_categorie not in ('en_transit', 'change', 'litige', 'decalage_periode', 'erreur_saisie', 'autre') then
    raise exception 'Catégorie inconnue : % (en_transit, change, litige, decalage_periode, erreur_saisie, autre).', coalesce(p_categorie, 'vide') using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) not between 1 and 500 then
    raise exception 'Une justification dit pourquoi, en 1 à 500 caractères.' using errcode = '22023';
  end if;
  select g.* into r from public.grp_reciproques g
  where g.client_id = p_client and g.creancier_id = p_creancier and g.debiteur_id = p_debiteur;
  if r.client_id is null then
    raise exception 'Aucun compte réciproque entre ces deux sociétés dans les balances courantes.' using errcode = 'P0002';
  end if;
  if r.etat not in ('ecart', 'dates_differentes') then
    raise exception 'Rien à justifier : cette paire est « % ».', r.etat using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  insert into public.grp_reciproques_justifs (client_id, creancier_id, debiteur_id, arrete_creancier, arrete_debiteur,
                                              creance, dette, ecart, categorie, motif, justifie_par)
  values (p_client, p_creancier, p_debiteur, r.arrete_creancier, r.arrete_debiteur, r.creance, r.dette, r.ecart,
          p_categorie, btrim(p_motif), v_uid)
  returning id into v_id;
  perform private.grp_journal(p_client, 'varelo.reciproques.justification', 'grp_reciproques_justifs', v_id::text,
    jsonb_build_object('creancier', r.creancier, 'debiteur', r.debiteur, 'creance', r.creance, 'dette', r.dette,
                       'ecart', r.ecart, 'arrete_creancier', r.arrete_creancier, 'arrete_debiteur', r.arrete_debiteur,
                       'categorie', p_categorie, 'motif', btrim(p_motif)), p_creancier);
  return v_id;
end $function$;

create or replace function private.grp_exporter_reciproques(p_client uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_csv text;
  n integer;
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
    raise exception 'Le tableau des réciproques s''exporte par un gérant, un administrateur ou un valideur.' using errcode = '42501';
  end if;
  perform private.grp_exiger_installation(p_client);
  perform set_config('omega.module', 'varelo', true);
  select count(*),
         'creancier;debiteur;creance;arrete_creancier;dette;arrete_debiteur;ecart;etat;categorie;motif' || coalesce(E'\n' || string_agg(
           concat_ws(';', private.grp_csv(g.creancier), private.grp_csv(g.debiteur),
                     coalesce(replace(g.creance::text, '.', ','), ''), coalesce(to_char(g.arrete_creancier, 'DD/MM/YYYY'), ''),
                     coalesce(replace(g.dette::text, '.', ','), ''), coalesce(to_char(g.arrete_debiteur, 'DD/MM/YYYY'), ''),
                     replace(g.ecart::text, '.', ','), g.etat, coalesce(g.categorie, ''), private.grp_csv(coalesce(g.motif, ''))),
           E'\n' order by g.creancier, g.debiteur), '')
    into n, v_csv
  from public.grp_reciproques g
  where g.client_id = p_client;
  perform private.grp_journal(p_client, 'varelo.reciproques.export', 'clients', p_client::text, jsonb_build_object('paires', n));
  return v_csv;
end $function$;

create or replace function public.grp_justifier_ecart(p_client uuid, p_creancier uuid, p_debiteur uuid, p_categorie text, p_motif text)
 returns uuid language sql set search_path to ''
as $function$ select private.grp_justifier_ecart(p_client, p_creancier, p_debiteur, p_categorie, p_motif) $function$;

create or replace function public.grp_exporter_reciproques(p_client uuid)
 returns text language sql set search_path to ''
as $function$ select private.grp_exporter_reciproques(p_client) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Droits d'exécution
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_justifier_ecart(uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function private.grp_exporter_reciproques(uuid) from public, anon;
grant execute on function private.grp_justifier_ecart(uuid, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function private.grp_exporter_reciproques(uuid) to authenticated, service_role;

revoke execute on function public.grp_justifier_ecart(uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.grp_exporter_reciproques(uuid) from public, anon;
grant execute on function public.grp_justifier_ecart(uuid, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.grp_exporter_reciproques(uuid) to authenticated, service_role;
