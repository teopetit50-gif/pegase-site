-- 20261021201315 c2_22b_fiche_suspension
-- Source : dépôt : 9ac33a42 omega/modules/cashd/migrations/c2_22b_fiche_suspension.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_22b_fiche_suspension.sql @ 9ac33a42.
-- ═══ omega/modules/cashd/migrations/c2_22b_fiche_suspension.sql @ 9ac33a42
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_22b : la fiche, une règle unique pour toute suspension (21/10/2026, session C2 — TCASHD-04b, 05b)
-- ═══════════════════════════════════════════════════════════════════════════
-- 04b : une facture suspendue parce qu'un règlement reste à imputer montrait reste_relancable 1 085, quand une
-- suspension pour incohérence donnait 0 (recette, A-C15). Désormais, tant que relance_suspendue porte une raison, quelle
-- qu'elle soit, reste_relancable vaut 0 ; le montant dû reste lisible dans reste_du.
-- 05b : une facture sous le seuil de relance n'en disait rien sur sa fiche tant qu'aucune relance n'avait été préparée
-- puis coupée (A-C16 à 5 €, A-C17). relance_suspendue dit désormais « reste dû 5,00 €, sous le seuil de relance de
-- 10,00 € : il reste dans l'encours, à abandonner ou à réclamer », sans attendre (seuil de l'entité, sinon de
-- l'organisation ; un solde déjà décidé — abandonné ou réclamé — garde sa propre mention).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE.

-- La fiche du compte (c2_24) : toute suspension rend la pièce non relançable ; le seuil est dit d'emblée.
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
                 'relance_suspendue', sp.motif)
                 -- c2_22b : une règle unique — tant que la relance est suspendue, quelle qu'en soit la raison, rien n'est
                 -- relançable (le reste dû reste lisible à part, dans reste_du) ; un avoir ne l'est jamais
                 || case when sp.motif is not null or z.nature = 'avoir' then jsonb_build_object('reste_relancable', 0) else '{}'::jsonb end
                 from public.cashd_factures z
                 cross join lateral (select case
                   when z.incoherence is not null and z.statut = 'ouverte'
                   then 'total incohérent (' || z.incoherence || ') : relance suspendue jusqu''à l''export corrigé ou la marque levée'
                   -- c2_24 : la mise en demeure retenue, aucun palier précédent n'étant parti
                   when z.relance_retenue is not null and z.statut = 'ouverte' then z.relance_retenue
                   -- c2_22 : un règlement du compte reste à lettrer — la séquence attend son imputation
                   when z.nature in ('facture', 'acompte') and z.statut = 'ouverte' and f.reste_du > 0 and ra.n > 0
                   then 'un règlement reçu reste à imputer sur ce compte (' || ra.detail || ') : la relance attend son lettrage'
                   -- c2_22b : sous le seuil de relance, dit sur la fiche même si aucune relance n'a jamais été préparée
                   when z.nature in ('facture', 'acompte') and z.statut = 'ouverte' and f.reste_du > 0
                        and z.solde_decision is null and f.reste_relancable <= sl.seuil and sl.seuil > 0
                   then 'reste dû ' || replace(to_char(f.reste_relancable, 'FM999999990.00'), '.', ',') || ' €, sous le seuil de relance de '
                        || replace(to_char(sl.seuil, 'FM999999990.00'), '.', ',') || ' € : il reste dans l''encours, à abandonner ou à réclamer'
                   end as motif
                   from (select coalesce((select y.seuil_relance from public.cashd_reglages_entites y where y.entite_id = z.entite_id),
                                         (select g.seuil_relance from public.cashd_reglages g where g.client_id = z.client_id), 0) as seuil) sl) sp
                 where z.id = f.id)
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

revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
