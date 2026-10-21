-- RECETTE seulement — un jeu de factures émises par le banc (client cccccccc-0000-4000-8000-00000000000c), façon négoce
-- de matériaux du bâtiment en Guadeloupe, pour éprouver CASHD (décision de Teo, 21/10/2026 : « 5 factures identiques mais
-- chacune contenant une erreur, et une bonne »). Session C2. Mode essai : rien ne part chez personne.
-- Tous les clients sont fictifs (sociétés « Démo »), aucune personne physique, aucune adresse réelle.
-- Rejouable : un second passage ne crée rien (mêmes comptes, mêmes numéros, même règlement — dédoublonné par CASHD).
--
-- La facture type (identique pour toutes, à l'erreur près) — CASHD ne lit pas les lignes d'un facturier, seulement
-- l'en-tête (numéro, dates, HT, TTC) ; les lignes sont jointes à chaque pièce (clé « lignes », ignorée par CASHD) pour
-- la traçabilité :
--   Ciment CEM II 42,5 R, sac 35 kg ........ 40 × 11,20 =   448,00 HT  TVA 8,5 %
--   Fer à béton HA 10, barre 6 m ........... 60 ×  7,85 =   471,00 HT  TVA 8,5 %
--   Tôle bac acier 0,63 mm, 4 m ............ 25 × 38,40 =   960,00 HT  TVA 8,5 %
--   Article au taux réduit (exemple) ........  2 × 120,00 =  240,00 HT  TVA 2,1 %
--   Consignation palettes bois ..............  4 × 15,00 =    60,00 HT  hors champ de la TVA
--   Octroi de mer et octroi de mer régional : inclus dans les prix unitaires (marchandises importées).
--   Total HT 2 179,00 — TVA 8,5 % sur 1 879,00 = 159,72 — TVA 2,1 % sur 240,00 = 5,04 — TOTAL TTC 2 343,76 €
--   Émise il y a 45 jours, échéance à 30 jours (donc échue depuis 15 jours) ; chantier en référence de commande.
--
-- Sept lignes : une juste, cinq erreurs, et une seconde pièce juste (NB-1002) sans laquelle le doublon n'existerait
-- pas. L'erreur de chacune (cinq choisies parmi les six candidates du coordinateur) :
--   NB-1001  Démo Bâti Grande-Terre SAS ...... JUSTE : la référence.
--   NB-1002  Démo Charpente Basse-Terre SARL . juste aussi : c'est la pièce dont le numéro va être réutilisé.
--   NB-1002  Démo Maçonnerie Sainte-Rose SAS . ERREUR 1 — numéro en doublon (même numéro que la pièce précédente, autre
--            client). Le cas le plus courant d'un facturier mal tenu, et le plus dangereux : une créance peut disparaître.
--   NB-1004  Démo Rénovation Le Gosier SAS ... ERREUR 2 — total faux : TTC 2 443,76 € au lieu de 2 343,76 € (HT + TVA).
--            La relance réclamerait 100 € de trop : c'est le contrôle que l'on attend d'un outil de relance.
--   NB-1005  Démo Second Œuvre Lamentin SARL . ERREUR 3 — échéance (il y a 50 jours) antérieure à l'émission (il y a 45).
--   NB-1006  Démo Carrelage Petit-Bourg SAS .. ERREUR 4 — client sans adresse de relance (aucun courriel de facturation).
--   NB-1007  Démo Menuiserie Capesterre SARL . ERREUR 5 — un règlement partiel de 1 000 € reçu du client, sans numéro de
--            facture (« VIR ACOMPTE CHANTIER »), donc non lettré.
--   Écartée : « avoir sur une facture inconnue » — l'export lu par CASHD ne relie pas un avoir à une facture (l'avoir se
--   déduit sur le compte, des factures échues les plus anciennes) : l'erreur n'est pas représentable dans ce format.
--
-- Ce que CASHD devrait en faire (à vérifier par le relevé, en bas) :
--   NB-1001, NB-1002 (Charpente) : relance « rappel » préparée, dans la file de validation.
--   NB-1002 (Maçonnerie) : la ligne met à jour la pièce NB-1002 existante (même numéro) au lieu de créer celle de la
--            Maçonnerie : ce compte n'a aucune facture, aucune relance — ÉCART attendu (pas d'alerte de doublon).
--   NB-1004 : importée et relancée pour 2 443,76 € — ÉCART attendu (aucun contrôle HT / TVA / TTC).
--   NB-1005 : ligne écartée à l'import, motif « échéance antérieure à l'émission » (rendu par cashd_importer).
--   NB-1006 : relance écrite mais statut « sans_adresse », alerte « ne peut pas partir ».
--   NB-1007 : le règlement reste « à imputer » ; la relance du compte attend le lettrage (aucune relance préparée).

do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  j date := (now() at time zone 'Europe/Paris')::date;
  v_lignes jsonb := '[
    {"article": "Ciment CEM II 42,5 R, sac 35 kg", "quantite": 40, "prix_ht": 11.20, "montant_ht": 448.00, "tva": 8.5},
    {"article": "Fer à béton HA 10, barre 6 m", "quantite": 60, "prix_ht": 7.85, "montant_ht": 471.00, "tva": 8.5},
    {"article": "Tôle bac acier 0,63 mm, 4 m", "quantite": 25, "prix_ht": 38.40, "montant_ht": 960.00, "tva": 8.5},
    {"article": "Article au taux réduit (exemple)", "quantite": 2, "prix_ht": 120.00, "montant_ht": 240.00, "tva": 2.1},
    {"article": "Consignation palettes bois", "quantite": 4, "prix_ht": 15.00, "montant_ht": 60.00, "tva": null},
    {"article": "Octroi de mer et OMR", "mention": "inclus dans les prix unitaires"}]'::jsonb;
  r jsonb;
begin
  perform public.cashd_installer(v_client, 'essai');

  -- 1. Les clients (fictifs). NB-C6 n'a pas d'adresse de facturation (erreur 4).
  r := public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'NB-C1', 'nom', 'Démo Bâti Grande-Terre SAS', 'email', 'compta@demo-bati-gt.test', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C2', 'nom', 'Démo Charpente Basse-Terre SARL', 'email', 'compta@demo-charpente-bt.test', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C3', 'nom', 'Démo Maçonnerie Sainte-Rose SAS', 'email', 'compta@demo-maconnerie-sr.test', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C4', 'nom', 'Démo Rénovation Le Gosier SAS', 'email', 'compta@demo-renovation-lg.test', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C5', 'nom', 'Démo Second Œuvre Lamentin SARL', 'email', 'compta@demo-second-oeuvre.test', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C6', 'nom', 'Démo Carrelage Petit-Bourg SAS', 'pays', 'FR', 'delai_paiement', 30),
    jsonb_build_object('code', 'NB-C7', 'nom', 'Démo Menuiserie Capesterre SARL', 'email', 'compta@demo-menuiserie-cap.test', 'pays', 'FR', 'delai_paiement', 30)),
    false, null, 'cashd_nobat.sql — clients');
  raise notice 'clients : %', r;

  -- 2. Les factures : la même pièce sept fois, à l'erreur près.
  r := public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'NB-1001', 'compte_ref', 'NB-C1', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : villa, Le Moule', 'lignes', v_lignes),
    jsonb_build_object('numero', 'NB-1002', 'compte_ref', 'NB-C2', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : hangar, Basse-Terre', 'lignes', v_lignes),
    -- erreur 1 : même numéro que la ligne précédente, autre client
    jsonb_build_object('numero', 'NB-1002', 'compte_ref', 'NB-C3', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : école, Sainte-Rose', 'lignes', v_lignes),
    -- erreur 2 : TTC faux (HT + TVA = 2 343,76)
    jsonb_build_object('numero', 'NB-1004', 'compte_ref', 'NB-C4', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2443.76,
                       'reste_du', 2443.76, 'commande_ref', 'Chantier démo : immeuble, Le Gosier', 'lignes', v_lignes),
    -- erreur 3 : échéance antérieure à l'émission
    jsonb_build_object('numero', 'NB-1005', 'compte_ref', 'NB-C5', 'date_emission', j - 45, 'echeance', j - 50, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : entrepôt, Lamentin', 'lignes', v_lignes),
    -- erreur 4 : le client NB-C6 n'a pas d'adresse de relance
    jsonb_build_object('numero', 'NB-1006', 'compte_ref', 'NB-C6', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : commerce, Petit-Bourg', 'lignes', v_lignes),
    -- erreur 5 : la pièce est juste ; c'est le règlement partiel (plus bas) qui n'est pas lettré
    jsonb_build_object('numero', 'NB-1007', 'compte_ref', 'NB-C7', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 2179.00, 'montant_ttc', 2343.76,
                       'reste_du', 2343.76, 'commande_ref', 'Chantier démo : logements, Capesterre', 'lignes', v_lignes)),
    false, null, 'cashd_nobat.sql — factures');
  raise notice 'factures : %', r;

  -- 3. Le règlement partiel de NB-C7, sans numéro de facture (erreur 5).
  r := public.cashd_importer(v_client, 'reglements', jsonb_build_array(
    jsonb_build_object('date', j - 5, 'montant', 1000.00, 'mode', 'VIR', 'compte_ref', 'NB-C7', 'reference', 'VIR-DEMO-0001',
                       'libelle', 'VIR ACOMPTE CHANTIER')),
    false, null, 'cashd_nobat.sql — règlements');
  raise notice 'règlements : %', r;
end $$;

-- Pour faire écrire les relances tout de suite (sinon : le passage de 7 h) :
--   select private.cashd_passage(now());                      -- le passage du matin, toutes organisations
--   select private.cashd_preparer_relances('cccccccc-0000-4000-8000-00000000000c', (now() at time zone 'Europe/Paris')::date, null);

-- ═══ LE RELEVÉ — ce que CASHD a fait de chaque pièce (à jouer après le passage) ═══
with attendu(rang, numero, compte_ref, erreur) as (values
  (1, 'NB-1001', 'NB-C1', 'aucune (référence)'),
  (2, 'NB-1002', 'NB-C2', 'aucune'),
  (3, 'NB-1002', 'NB-C3', 'numéro en doublon'),
  (4, 'NB-1004', 'NB-C4', 'TTC faux (+100 €)'),
  (5, 'NB-1005', 'NB-C5', 'échéance avant émission'),
  (6, 'NB-1006', 'NB-C6', 'client sans adresse'),
  (7, 'NB-1007', 'NB-C7', 'règlement partiel non lettré'))
select a.rang, a.numero, a.compte_ref, a.erreur,
       case when c.id is null then 'compte absent' when f.id is null then 'AUCUNE PIÈCE pour ce compte' else 'importée' end as import,
       f.montant_ttc, e.reste_du, e.retard_jours,
       (select coalesce(sum(x.a_imputer), 0) from public.cashd_reglements_etat x where x.compte_id = c.id) as a_imputer_compte,
       s.etat_sequence, s.palier_suivant,
       r.palier as relance_palier, r.statut as relance_statut, r.montant as relance_montant, left(r.motif, 120) as relance_motif,
       case
         when c.id is not null and f.id is null and a.erreur = 'échéance avant émission' then 'attrapée : ligne écartée à l''import (échéance antérieure à l''émission)'
         when c.id is not null and f.id is null then 'ÉCART : la pièce n''existe pas pour ce compte (le numéro a mis à jour une autre pièce)'
         when f.id is not null and f.montant_ht is not null and abs(f.montant_ttc - 2343.76) > 0.005 and f.montant_ht = 2179.00 then 'ÉCART : TTC incohérent avec HT + TVA, relancé tel quel'
         when r.statut = 'sans_adresse' then 'attrapée : relance écrite, ne part pas (sans adresse)'
         when r.id is null and (select coalesce(sum(x.a_imputer), 0) from public.cashd_reglements_etat x where x.compte_id = c.id) > 0 then 'traitée : la relance attend le lettrage du règlement'
         when r.statut in ('a_valider', 'non_reglee') then 'relance préparée, dans la file'
         else coalesce(r.statut, 'rien de préparé') end as lecture
from attendu a
left join public.cashd_comptes c on c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.reference = a.compte_ref
left join public.cashd_factures f on f.compte_id = c.id and f.numero = a.numero and f.nature = 'facture'
left join public.cashd_factures_etat e on e.id = f.id
left join public.cashd_suivi s on s.facture_id = f.id
left join lateral (select x.* from public.cashd_relances x join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
                   where p.facture_id = f.id order by x.jour desc, x.cree_le desc limit 1) r on true
order by a.rang;

-- Et la ligne écartée à l'import (erreur 3), relue au journal :
select j.survenu_le, j.donnees ->> 'jeu' as jeu, j.donnees ->> 'creees' as creees, j.donnees ->> 'modifiees' as modifiees,
       j.donnees ->> 'inchangees' as inchangees, j.donnees ->> 'ecartees' as ecartees
from public.journal_opposable j
where j.client_id = 'cccccccc-0000-4000-8000-00000000000c' and j.action = 'cashd.import' and j.donnees ->> 'origine' like 'cashd_nobat.sql%'
order by j.id desc limit 6;
