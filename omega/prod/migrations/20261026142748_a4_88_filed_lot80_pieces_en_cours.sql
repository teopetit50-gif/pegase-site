-- 20261026142748 a4_88_filed_lot80_pieces_en_cours
-- Source : dépôt : 98d5a93bcad0dddd8ac6620f5a5f413f814be6ff omega/migrations/a4_88_filed_lot80_pieces_en_cours.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_88_filed_lot80_pieces_en_cours.sql @ 98d5a93bcad0dddd8ac6620f5a5f413f814be6ff ; fichiers de tests ignorés : omega/tests/filed/a4_76_pieces_en_cours.sql.
-- ═══ omega/migrations/a4_88_filed_lot80_pieces_en_cours.sql @ 98d5a93bcad0dddd8ac6620f5a5f413f814be6ff
-- a4_88 (FILED lot 80) : TFILED-29 — les pièces en cours ne comptent ni une facture refusée comme « imputation à
-- valider », ni une même facture deux fois.
--
-- Avant (a4_06) : la catégorie « Imputation proposée, à valider » comptait toute facture qui portait une imputation
-- « proposee », quel que soit son statut ; une facture refusée y restait (F3, 928,20 €), et une facture « à valider »
-- y était comptée en plus de « En attente d'approbation » (F13, 146,48 €), d'où 2 lignes pour 1 074,68 €.
-- Maintenant :
--   · une facture refusée ou écartée n'est pas comptée comme imputation à valider (son imputation proposée reste
--     écrite, rien n'est annulé : si la reprise après refus la fait revenir, elle la retrouve) ;
--   · chaque facture n'est comptée qu'une fois, dans la première catégorie qui la décrit, dans l'ordre affiché :
--     bloquée, en litige, en attente d'approbation, à compléter, imputation à valider. La somme des catégories est
--     le nombre de pièces en cours.
-- Signature, colonnes et libellés inchangés (export « en_cours », vue cabinet a4_52). Rejouable ; aucune suppression.

create or replace function private.filed_pieces_en_cours(p_client uuid, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ttc numeric)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (select * from private.filed_factures_visibles(p_client, p_entite)),
    c as (
      select 'bloquees' as categorie, 'Bloquées par un contrôle' as libelle, 1 as rang, f.id, f.montant_ttc from f where f.statut = 'bloquee'
      union all
      select 'litige', 'En litige avec le fournisseur', 2, f.id, f.montant_ttc from f where exists (select 1 from public.filed_litiges l where l.facture_id = f.id and l.clos_le is null)
      union all
      select 'attente', 'En attente d''approbation', 3, f.id, f.montant_ttc from f where f.statut = 'a_valider'
      union all
      select 'a_completer', 'À compléter (lecture incomplète)', 4, f.id, f.montant_ttc from f where f.statut = 'a_completer'
      union all
      select 'imputation', 'Imputation proposée, à valider', 5, f.id, f.montant_ttc from f
       where f.statut not in ('refusee', 'ecartee')
         and exists (select 1 from public.filed_imputations i where i.facture_id = f.id and i.statut = 'proposee')
    ),
    u as (select distinct on (c.id) c.* from c order by c.id, c.rang)   -- a4_88 : une facture, une catégorie
    select u.categorie, u.libelle, count(*), round(coalesce(sum(u.montant_ttc), 0), 2) from u group by u.categorie, u.libelle, u.rang order by u.rang;
end $$;

comment on function public.filed_pieces_en_cours(uuid, uuid) is 'Les pièces en cours, comptées à l''instant, chacune une fois : bloquées, en litige, en attente d''approbation, à compléter, imputation à valider (hors factures refusées ou écartées).';
