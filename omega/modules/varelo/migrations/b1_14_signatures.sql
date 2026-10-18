-- b1_14 — VARELO : des signatures d'exports qui ne se recouvrent plus (06/10/2026, B1)
--
-- CE QUE ÇA CORRIGE : essai du choix de jeu du lecteur d'exports (A1, lire_export.ts, choisirJeu : d'abord le
-- motif du nom de fichier, puis la signature d'en-têtes si un seul jeu la couvre) sur les modèles de b1_10. Un
-- export au nom quelconque (« BALAGEE.txt », envoyé tel quel par courriel) n'était pas reconnu :
--   · balance_agee_clients et balance_agee_fournisseurs avaient la même signature (« Non échu », « Total ») ;
--   · une balance âgée avec « Code client » et « Raison sociale » couvrait aussi la signature de clients.
-- Désormais :
--   · balance_agee_clients : « Code client », « Non échu », « Total » (et sa colonne code n'accepte plus
--     « Code fournisseur ») ; balance_agee_fournisseurs : « Code fournisseur », « Non échu », « Total » (sans
--     « Code client ») ;
--   · fournisseurs et clients : + « Code postal », qu'une balance âgée n'a jamais.
-- Aucun jeu ne couvre plus la signature d'un autre, sur tous les alias de ses colonnes (test b1_17).
--
-- Idempotent : ne réécrit que ce qui porte encore la déclaration de b1_10 ; les branchements déjà déclarés
-- (branchements_jeux recopie le modèle) suivent, sauf ceux réglés à la main. Aucune suppression.

with nouvelles(code, avant, apres) as (values
  ('fournisseurs',              array['Code fournisseur', 'Raison sociale'], array['Code fournisseur', 'Raison sociale', 'Code postal']),
  ('clients',                   array['Code client', 'Raison sociale'],      array['Code client', 'Raison sociale', 'Code postal']),
  ('balance_agee_clients',      array['Non échu', 'Total'],                  array['Code client', 'Non échu', 'Total']),
  ('balance_agee_fournisseurs', array['Non échu', 'Total'],                  array['Code fournisseur', 'Non échu', 'Total'])
), modeles as (
  update public.modeles_jeux m
     set entetes = n.apres,
         colonnes = case m.code
           when 'balance_agee_clients' then jsonb_set(m.colonnes, '{code,entetes}',
             '["Code client", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb)
           when 'balance_agee_fournisseurs' then jsonb_set(m.colonnes, '{code,entetes}',
             '["Code fournisseur", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb)
           else m.colonnes end
    from nouvelles n
   where m.module = 'varelo' and m.code = n.code and m.version = 1 and m.entetes = n.avant
  returning m.id
)
select count(*) as modeles_mis_a_jour from modeles;

with nouvelles(code, avant, apres) as (values
  ('fournisseurs',              array['Code fournisseur', 'Raison sociale'], array['Code fournisseur', 'Raison sociale', 'Code postal']),
  ('clients',                   array['Code client', 'Raison sociale'],      array['Code client', 'Raison sociale', 'Code postal']),
  ('balance_agee_clients',      array['Non échu', 'Total'],                  array['Code client', 'Non échu', 'Total']),
  ('balance_agee_fournisseurs', array['Non échu', 'Total'],                  array['Code fournisseur', 'Non échu', 'Total'])
), jeux as (
  update public.branchements_jeux j
     set entetes = n.apres,
         colonnes = case j.code
           when 'balance_agee_clients' then jsonb_set(j.colonnes, '{code,entetes}',
             '["Code client", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb)
           when 'balance_agee_fournisseurs' then jsonb_set(j.colonnes, '{code,entetes}',
             '["Code fournisseur", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb)
           else j.colonnes end,
         maj_le = now()
    from nouvelles n, public.branchements b
   where b.id = j.branchement_id and b.module = 'varelo' and j.code = n.code and j.entetes = n.avant
  returning j.id
)
select count(*) as branchements_mis_a_jour from jeux;

-- Contrôle : 30 modèles, chacun avec sa nouvelle signature.
select code, entetes, count(*) as logiciels from public.modeles_jeux
 where module = 'varelo' and version = 1 group by code, entetes order by code;
