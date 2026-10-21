-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_22 : la raison exacte d'une relance retenue ou coupée (21/10/2026, session C2 — TCASHD-04, TCASHD-05)
-- ═══════════════════════════════════════════════════════════════════════════
-- TCASHD-04 : un règlement reçu sans référence suspend la séquence du compte tant qu'il n'est pas lettré (c2_02),
-- mais la fiche ne le disait pas (compte actif, pièce ouverte, aucun motif). La fiche porte désormais, sur chaque
-- facture ouverte du compte, relance_suspendue : « un règlement reçu reste à imputer sur ce compte (500,00 € du
-- 18/10/2026, VIR-C05-0001) : la relance attend son lettrage ».
-- TCASHD-05 : une relance coupée parce que le reste dû est passé sous le seuil portait « réglée ou sortie de
-- l'export ». Le motif dit désormais la vraie raison : sortie de l'export, réglée, annulée… ou « reste dû 3,00 €,
-- sous le seuil de relance de 10,00 € ; elle reste dans l'encours, à abandonner ou à réclamer ».
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Vérifier les relances en attente (c2_18) : le motif exact.
create or replace function private.cashd_verifier_relances(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  g public.cashd_reglages;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  for r in
    select distinct x.id, x.compte_id,
      case when c.statut <> 'actif' or c.reciproque then 'compte ' || replace(c.statut, '_', ' ')
           else 'facture ' || f.numero || case when f.statut = 'litige' then ' en litige'
                                                when f.nature = 'devis' and f.statut <> 'en_attente' then ' : devis ' || f.statut
                                                when f.solde_decision = 'abandonne' then ' : solde abandonné'
                                                when f.attente_commande_le is not null then ' : en attente d''un bon de commande'
                                                when f.incoherence is not null then ' : total incohérent (' || f.incoherence || ')'
                                                -- c2_22 : la raison exacte — sortie de l'export, réglée, ou sous le seuil (elle reste due)
                                                when f.statut <> 'ouverte' and f.statut_motif like 'absente de l''export%' then ' sortie de l''export'
                                                when f.statut = 'soldee' or private.cashd_reste(f.id) <= 0.005 then ' réglée'
                                                when f.statut <> 'ouverte' then ' ' || case f.statut when 'annulee' then 'annulée' when 'abandonnee' then 'abandonnée'
                                                                                                     else replace(f.statut, '_', ' ') end
                                                else ' : reste dû ' || private.cashd_eur(private.cashd_reste(f.id), 'fr') || ', sous le seuil de relance de '
                                                     || private.cashd_eur(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 'fr')
                                                     || ' ; elle reste dans l''encours, à abandonner ou à réclamer' end end as motif,
      p.facture_id
    from public.cashd_relances x
    join public.cashd_comptes c on c.id = x.compte_id
    join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
    join public.cashd_factures f on f.id = p.facture_id
    where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and (c.statut <> 'actif' or c.reciproque
           or (f.nature = 'devis' and f.statut <> 'en_attente')
           or (f.nature <> 'devis' and (f.statut <> 'ouverte' or f.solde_decision = 'abandonne' or f.attente_commande_le is not null
                                        or f.incoherence is not null   -- c2_18
                                        or (private.cashd_reste(f.id) <= greatest(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 0.005)
                                            and f.solde_decision is distinct from 'reclame'))))
  loop
    n := n + private.cashd_couper(p_client, null, r.facture_id, 'avant l''envoi : ' || r.motif);
  end loop;
  return n;
end $function$;

-- La fiche du compte (c2_21) : la séquence suspendue par un règlement à lettrer, dite sur la pièce.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || (select jsonb_build_object('solde_decision', z.solde_decision, 'solde_decision_motif', z.solde_decision_motif,
                 'accord_oral_le', z.accord_oral_le, 'accord_note', z.accord_note, 'attente_commande_le', z.attente_commande_le,
                 'attente_commande_email', z.attente_commande_email, 'attente_commande_nom', z.attente_commande_nom,
                 'attente_commande_motif', z.attente_commande_motif,
                 -- c2_21 : ce que le moteur retient, dit sur la pièce ; un avoir et une pièce suspendue ne sont pas relançables
                 'incoherence', z.incoherence, 'facture_visee', z.facture_visee,
                 'relance_suspendue', case when z.incoherence is not null and z.statut = 'ouverte'
                                           then 'total incohérent (' || z.incoherence || ') : relance suspendue jusqu''à l''export corrigé ou la marque levée'
                                           -- c2_22 : un règlement du compte reste à lettrer — la séquence attend son imputation
                                           when z.nature in ('facture', 'acompte') and z.statut = 'ouverte' and f.reste_du > 0 and ra.n > 0
                                           then 'un règlement reçu reste à imputer sur ce compte (' || ra.detail || ') : la relance attend son lettrage' end)
                 || case when (z.incoherence is not null and z.statut = 'ouverte') or z.nature = 'avoir' then jsonb_build_object('reste_relancable', 0) else '{}'::jsonb end
                 from public.cashd_factures z where z.id = f.id)
               order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f
               cross join (select count(*) as n,
                                  string_agg(replace(to_char(e.a_imputer, 'FM999999990.00'), '.', ',') || ' € du ' || to_char(e.recu_le, 'DD/MM/YYYY')
                                             || coalesce(', ' || e.reference, ''), ' ; ' order by e.recu_le) as detail
                           from public.cashd_reglements_etat e where e.compte_id = c.id and e.a_imputer > 0) ra
               where f.compte_id = c.id),
    'reponses_lues', (select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) from public.cashd_reponses_lues x
                      where x.compte_id = c.id and x.statut = 'proposee'),
    'pieces_jointes', (select coalesce(jsonb_agg(to_jsonb(p) order by p.cree_le), '[]'::jsonb) from public.cashd_pieces_jointes p
                       join public.cashd_factures f on f.id = p.facture_id where f.compte_id = c.id and p.actif),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

revoke execute on function private.cashd_verifier_relances(uuid) from public, anon, authenticated;
revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
