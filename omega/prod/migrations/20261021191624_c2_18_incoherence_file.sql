-- 20261021191624 c2_18_incoherence_file
-- Source : dépôt : 6e661e1e omega/modules/cashd/migrations/c2_18_incoherence_file.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_18_incoherence_file.sql @ 6e661e1e.
-- ═══ omega/modules/cashd/migrations/c2_18_incoherence_file.sql @ 6e661e1e
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_18 : une pièce marquée incohérente coupe sa relance déjà en file (21/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- c2_17 suspend la relance d'une pièce au total incohérent, mais seulement pour les relances à venir : une relance
-- écrite avant la marque (à valider, ou validée et pas encore partie) restait dans la file avec le mauvais montant
-- (recette du 21/10, NB-1004). La vérification des relances — jouée après chaque import et chaque matin avant d'écrire —
-- coupe désormais, avant l'envoi, toute relance qui porte une pièce marquée, avec le motif « total incohérent (…) ».
-- La relance revient d'elle-même quand la marque est levée (export corrigé ou cashd_lever_incoherence).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Vérifier les relances en attente (c2_04), pièce incohérente comprise.
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
                                                else ' réglée ou sortie de l''export' end end as motif,
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

revoke execute on function private.cashd_verifier_relances(uuid) from public, anon, authenticated;
