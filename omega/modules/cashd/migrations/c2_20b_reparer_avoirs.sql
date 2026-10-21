-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_20b : réparer les imputations d'avoir faites avant c2_20 (21/10/2026, session C2 — TCASHD-03, suite)
-- ═══════════════════════════════════════════════════════════════════════════
-- c2_20 empêche le passage du matin d'imputer un avoir ailleurs qu'à la facture qu'il vise, mais l'existant restait :
-- sur la recette, AV-2026-0006 (« avoir sur FB-2026-0999 ») avait été déduit de FB-2026-0106 le 21/10, qui restait à
-- 885 €, l'avoir « soldée ». Cette reprise, rejouable sans effet une fois faite :
--   1. relève la facture visée des avoirs déjà importés (depuis commande_ref), quand elle n'est pas encore connue ;
--   2. annule chaque imputation automatique d'un avoir vers une autre facture que celle qu'il vise (journal
--      cashd.imputation_annulee, motif daté), et coupe la relance en file qui portait le montant faux ;
--   3. ré-impute l'avoir selon la règle de c2_20 : à la facture visée, si elle est au compte, ouverte et échue ;
--   4. porte sur l'avoir resté sans cible le motif « avoir sur …, facture inconnue de ce compte : non imputé ».
-- Les imputations faites par une personne ne sont jamais touchées.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

create or replace function private.cashd_reparer_avoirs(p_client uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  x record;
  n_visees integer := 0;
  n_annulees integer := 0;
  n_reimputees integer := 0;
  n_coupees integer := 0;
begin
  -- 1. La facture visée des avoirs importés avant c2_20.
  update public.cashd_factures a
     set facture_visee = private.cashd_facture_visee(jsonb_build_object('commande_ref', a.commande_ref), a.numero), maj_le = now()
   where (p_client is null or a.client_id = p_client) and a.nature = 'avoir' and a.facture_visee is null
     and private.cashd_facture_visee(jsonb_build_object('commande_ref', a.commande_ref), a.numero) is not null;
  get diagnostics n_visees = row_count;

  -- 2. Les imputations automatiques faites à tort.
  for x in
    select i.id, i.client_id, i.facture_id, i.avoir_id, i.montant, a.numero as avoir, a.facture_visee, f.numero as facture, f.entite_id
    from public.cashd_imputations i
    join public.cashd_factures a on a.id = i.avoir_id
    join public.cashd_factures f on f.id = i.facture_id
    where (p_client is null or i.client_id = p_client) and i.annulee_le is null and i.auto
      and a.facture_visee is not null and f.numero is distinct from a.facture_visee
    order by i.cree_le
  loop
    update public.cashd_imputations
       set annulee_le = now(), annulee_motif = left(format('reprise c2_20b : l''avoir %s vise %s, il avait été déduit de %s', x.avoir, x.facture_visee, x.facture), 500)
     where id = x.id;
    perform private.cashd_suivre_solde(x.facture_id);
    perform private.cashd_suivre_solde(x.avoir_id);
    n_coupees := n_coupees + private.cashd_couper(x.client_id, null, x.facture_id,
      format('montant revu : l''avoir %s (sur %s) ne se déduit pas de %s', x.avoir, x.facture_visee, x.facture));
    perform private.journaliser_module(x.client_id, 'cashd', 'cashd.imputation_annulee', 'cashd_factures', x.facture_id::text,
      jsonb_build_object('imputation', x.id, 'montant', x.montant, 'avoir', x.avoir_id, 'reprise', 'c2_20b',
                         'motif', format('l''avoir %s vise %s', x.avoir, x.facture_visee)), x.entite_id);
    n_annulees := n_annulees + 1;
  end loop;

  -- 3. Ré-imputer à la facture visée, quand elle est là, ouverte et échue (règle de c2_20).
  for x in
    select a.id as avoir_id, y.id as facture_id
    from public.cashd_factures a
    join public.cashd_factures_etat y on y.compte_id = a.compte_id and y.numero = a.facture_visee and y.nature in ('facture', 'acompte')
    where (p_client is null or a.client_id = p_client) and a.nature = 'avoir' and a.statut = 'ouverte' and a.facture_visee is not null
      and y.statut = 'ouverte' and y.reste_du > 0 and y.echeance < (now() at time zone 'Europe/Paris')::date
  loop
    continue when private.cashd_reste(x.avoir_id) <= 0.005 or private.cashd_reste(x.facture_id) <= 0.005;
    perform private.cashd_imputer(x.facture_id, null, x.avoir_id, least(private.cashd_reste(x.avoir_id), private.cashd_reste(x.facture_id)), true,
                                  'avoir imputé à la facture qu''il vise (reprise c2_20b)');
    n_reimputees := n_reimputees + 1;
  end loop;

  -- 4. L'avoir sans cible connue le dit.
  update public.cashd_factures a
     set statut_motif = left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500), maj_le = now()
   where (p_client is null or a.client_id = p_client) and a.nature = 'avoir' and a.statut = 'ouverte' and a.facture_visee is not null
     and not exists (select 1 from public.cashd_factures y where y.compte_id = a.compte_id and y.nature in ('facture', 'acompte') and y.numero = a.facture_visee)
     and a.statut_motif is distinct from left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500);

  return jsonb_build_object('visees_relevees', n_visees, 'imputations_annulees', n_annulees, 'reimputees', n_reimputees, 'relances_coupees', n_coupees);
end $function$;

revoke execute on function private.cashd_reparer_avoirs(uuid) from public, anon, authenticated;

-- La reprise, une fois, pour toutes les organisations (sans effet quand il n'y a plus rien à reprendre).
select private.cashd_reparer_avoirs(null);
