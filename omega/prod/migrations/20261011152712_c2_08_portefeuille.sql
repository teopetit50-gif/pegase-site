-- 20261011152712 c2_08_portefeuille
-- Source : dépôt : 0615c80 omega/modules/cashd/migrations/c2_08_portefeuille.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_08_portefeuille.sql @ 0615c80.
-- ═══ omega/modules/cashd/migrations/c2_08_portefeuille.sql @ 0615c80
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_08 : le portefeuille du chargé de recouvrement (11/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- « Une direction financière lit le consolidé, un chargé de recouvrement ne voit que son portefeuille. » (G10)
--
-- Quand l'organisation l'active (cashd_reglages.portefeuille_par_charge, porte cashd_regler_portefeuille, gérant
-- seulement), un compte de l'organisation qui n'est ni gérant, ni administrateur, ni valideur ne lit plus que les comptes
-- clients dont il est le chargé (cashd_comptes.commercial_id), et ce qui en dépend : leurs factures, règlements,
-- imputations, relances. La direction, l'administration et les valideurs lisent toujours le consolidé.
--
-- Comment : des politiques RESTRICTIVES de lecture, ajoutées aux politiques existantes (rien n'est retiré). Elles
-- n'appellent que private.a_un_role (la fonction de rôle du socle, déjà employée par ses propres politiques) et des
-- sous-requêtes sur cashd_reglages et cashd_comptes, elles-mêmes sous RLS. Chaque table porte une politique
-- « portefeuille du charge ». Les portes de lecture de CASHD (cashd_tableau, cashd_fiche_compte, cashd_relances_du_jour, cashd_prevision,
-- cashd_dossier) et ses vues sont SECURITY INVOKER : elles suivent ces politiques — le tableau d'un chargé est celui de
-- son portefeuille. Les portes d'écriture exigent déjà la gestion.
--
-- Règles de pose : alter … add column if not exists ; politiques créées si absentes ; jamais de DROP ni de DELETE ;
-- revoke execute de public sur la porte.

alter table public.cashd_reglages add column if not exists portefeuille_par_charge boolean not null default false;

do $do$
declare
  -- Le lecteur est restreint : l'organisation a activé le portefeuille, et il n'y est ni gérant, ni administrateur, ni valideur.
  v_restreint text := $q$(exists (select 1 from public.cashd_reglages g where g.client_id = %1$s.client_id and g.portefeuille_par_charge)
                         and not private.a_un_role(%1$s.client_id, array['gerant', 'admin', 'valideur']))$q$;
  t record;
begin
  for t in select * from (values
      ('cashd_comptes', 'portefeuille du charge', 'commercial_id = (select auth.uid())'),
      ('cashd_factures', 'portefeuille du charge', 'exists (select 1 from public.cashd_comptes c where c.id = cashd_factures.compte_id)'),
      ('cashd_reglements', 'portefeuille du charge', 'cashd_reglements.compte_id is null or exists (select 1 from public.cashd_comptes c where c.id = cashd_reglements.compte_id)'),
      ('cashd_imputations', 'portefeuille du charge', 'exists (select 1 from public.cashd_factures f where f.id = cashd_imputations.facture_id)'),
      ('cashd_relances', 'portefeuille du charge', 'exists (select 1 from public.cashd_comptes c where c.id = cashd_relances.compte_id)'),
      ('cashd_relances_pieces', 'portefeuille du charge', 'exists (select 1 from public.cashd_relances r where r.id = cashd_relances_pieces.relance_id)'),
      ('cashd_arretes', 'portefeuille du charge', 'false')
    ) x(tbl, pol, cond)
  loop
    if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tbl and p.policyname = t.pol) then
      execute format('create policy %I on public.%I as restrictive for select to authenticated using (not %s or %s)',
                     t.pol, t.tbl, format(v_restreint, t.tbl), t.cond);
    end if;
  end loop;
end $do$;

-- Activer ou couper le portefeuille par chargé. Gérant seulement ; le changement reste daté.
create or replace function public.cashd_regler_portefeuille(p_client uuid, p_actif boolean)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid; g public.cashd_reglages;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  if v_uid is not null and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant décide qui voit quel portefeuille.' using errcode = '42501';
  end if;
  if p_actif is null then
    raise exception 'Activer ou couper.' using errcode = '22023';
  end if;
  update public.cashd_reglages set portefeuille_par_charge = p_actif, maj_le = now() where client_id = p_client returning * into g;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', p_client::text,
    jsonb_build_object('portefeuille_par_charge', p_actif), null);
  return jsonb_build_object('portefeuille_par_charge', g.portefeuille_par_charge,
    'comptes_sans_charge', (select count(*) from public.cashd_comptes c where c.client_id = p_client and c.commercial_id is null));
end $function$;

revoke execute on function public.cashd_regler_portefeuille(uuid, boolean) from public, anon;
grant execute on function public.cashd_regler_portefeuille(uuid, boolean) to authenticated, service_role;
