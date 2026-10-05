# Banc de factures fournisseurs — cent pièces fictives (+ trois compléments)

Jeu d'essai pour l'ouvrier lecteur (session A1). Cent documents variés, tous
inventés, chacun accompagné d'un fichier JSON qui dit ce qu'un lecteur parfait
doit en extraire. Trois compléments demandés par le coordinateur le 5 octobre
(pièces 101 à 103) portent le total à 103.

## Contenu de `factures/`

| Type | Nombre | Ce qui le distingue |
|---|---|---|
| `natif` | 40 | PDF à couche texte, quatre gabarits (classique, moderne, sobre, courrier/matriciel), remises, acomptes, port, éco-participation, périodes, franchise de TVA, autoliquidation |
| `avoir` | 3 | Montants négatifs, référence à la facture rectifiée, pas d'échéance |
| `scanne` | 15 | Image seule, qualité `bonne`, `moyenne` ou `faible` (rotation, bruit, flou, taches) |
| `multi-pages` | 8 | 2 à 3 pages avec report de sous-total ; deux sont numérisées |
| `multi-factures` | 5 | 2 ou 3 factures dans un seul fichier ; une est numérisée |
| `facturx` / `facturx-avoir` | 8 | PDF avec `factur-x.xml` joint (CII), profils BASIC et EN 16931 |
| `ubl` / `ubl-avoir` | 6 | Fichiers `.xml` UBL 2.1 seuls (Invoice ou CreditNote) |
| `ticket` | 8 | Tickets de caisse 58 ou 80 mm, lignes en TTC, quatre numérisés |
| `manuscrite` | 6 | Écriture manuscrite (carnet pré-imprimé ou feuille libre), toujours numérisées |
| `illisible` | 1 | Dégradé au point d'être illisible : la bonne réponse est de refuser |
| `natif-devise` | 1 (n° 101) | Fournisseur étranger, montants en USD au format anglo-saxon, pas de SIREN ni d'IBAN (ABA + SWIFT), autoliquidation, contre-valeur EUR (`total_ttc_eur`) |
| `facture-acompte` | 1 (n° 102) | Facture d'acompte pure : 30 % d'un devis dont le montant figure dans le libellé (`acompte_sur`) |
| `note-de-frais` | 1 (n° 103) | Note de frais d'un salarié (émetteur sans SIREN, `fournisseur.type = "particulier"`), lignes en TTC, six justificatifs en page 2, numérisée |

`INDEX.json` récapitule les 103 pièces (type, qualité, pages, TTC attendus).

## Le JSON attendu

Pour `NNN-type-gabarit-fournisseur.pdf` (ou `.xml`), le fichier `.json` du même
nom contient :

- `fichier`, `format`, `type`, `gabarit`, `qualite` (`native`, `bonne`, `moyenne`, `faible`, `illisible`), `pages` ;
- `lisible` (faux pour la pièce 100) et `nb_factures` (2 ou 3 pour les lots) ;
- `factures[]` : pour chaque facture, `type_document`, `numero`, `facture_rectifiee`,
  `date_emission`, `date_echeance`, `date_livraison`, `periode`, `devise`,
  `fournisseur` (raison sociale, SIREN, SIRET, TVA intracom, adresse, IBAN, BIC, courriel, téléphone),
  `client` (idem + `code_client`), `lignes[]` (désignation, quantité, unité, prix unitaire HT,
  remise, taux de TVA, montant HT, code article), `remise_globale`, `total_ht`,
  `tva[]` (par taux : base, montant), `total_tva`, `total_ttc`, `acompte`, `net_a_payer`,
  `mode_paiement`, `references` (commande, bon de livraison, référence de paiement), `mentions[]` ;
- `difficultes[]` : ce qui rend la pièce délicate, en clair.

Les tickets affichent les lignes en TTC mais le JSON garde les montants HT :
le champ `lignes_affichees_en: "TTC"` le signale.

## Garanties sur les données

- Aucune raison sociale réelle : fournisseurs et clients sont des noms composés inventés.
- SIREN et SIRET valides par clé de Luhn, numéros de TVA intracom valides par clé,
  IBAN valides (clé RIB et clé IBAN) ; tous pris dans des plages fictives
  (SIREN `9xxxxxxxx`, code banque `9xxxx`).
- Totaux justes au centime : `verifier-banc.mjs` recalcule chaque facture.
- Génération déterministe (graine `2026`) : `INDEX.json` est identique à chaque exécution.

## Régénérer

```bash
cd omega/banc
npm install                 # pdf-lib, fontkit, trois polices manuscrites (licence OFL)
node generer-factures.mjs   # ~25 s ; exige pdftoppm (poppler-utils) et convert (ImageMagick)
node verifier-banc.mjs      # 103 pièces, identifiants valides, totaux justes
```

`--graine N` change le tirage, `--sortie dossier` change la destination.

## Mesurer un lecteur

Comparer la sortie du lecteur au JSON champ par champ. Suggestion de barème :
numéro, date d'émission, fournisseur (SIREN ou SIRET), total HT, total TTC et
IBAN comptent double ; une valeur inventée sur la pièce 100 compte comme une
erreur grave. Les pièces `multi-factures` ne sont réussies que si le nombre de
factures trouvées est juste.
