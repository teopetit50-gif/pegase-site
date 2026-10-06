# Chiffrage — le lecteur (A1), 06/10/2026

**Synthèse**
1. Deux lectures sont **prouvées sur de vrais documents**, une seule pièce chacune : une facture PDF (13 valeurs justes sur 13, 0,0145 €) et un Factur-X (17 valeurs, sans IA, 0 €). Aucune mesure de qualité sur un corpus.
2. Tout le reste est **B** : construit et testé sur des doubles et des exemples (136 tests du lecteur, 16 de lecteur-exports), jamais passé sur un vrai document de client.
3. Trois chemins **dépendent d'un compte ou d'une décision (T)** : le coffre Tamila (aucun dossier n'a sa clé chez Scaleway), la transcription des vocaux (clé Mistral non posée, refusée pour l'instant) et WhatsApp (application Meta), ainsi qu'un vrai export Logos_w (Teo).
4. **Pas construit (D)** : documents médicaux (ordonnances, comptes rendus), DWG, attestations d'assurance FILED avec leurs champs, mesures prises sur le dessin d'un plan.
5. Passer de B à A, c'est d'abord **un corpus réel par famille** (20 à 30 pièces, fournies par Teo ou les clients pilotes) et une mesure champ par champ : environ **17 jours** côté lecteur (16 jours de lignes + 1 jour pour l'outil de mesure), plus le temps des modules.
6. **Coût IA** mesuré ou estimé : 0 € pour Factur-X, UBL et les exports ; environ 0,015 € pour une facture PDF d'une page ; 0,02 à 0,03 € par page scannée ; 0,01 à 0,02 € pour un message avec photo ; de 1 à 5 € pour une lecture longue de dossier, plafonnée à 15 €.

Légende : **A** prouvé sur de vrais documents en recette ; **B** testé sur doubles ou exemples ; **C** partiel ; **D** pas construit ; **T** dépend d'un compte ou d'un achat. Jours = jours de travail du lecteur (A1), hors modules et hors attente des documents.

## Le tableau

| Ce que le site promet de lire | État | Qualité mesurée | Ce qui manque | Jours actuel → B | Jours B → A | Coût IA par pièce |
|---|---|---|---|---|---|---|
| Facture PDF natif (FILED) | **A** (1 pièce) | 13/13 valeurs justes, boîtes posées (travail 2152) | Corpus de 30 vraies factures de fournisseurs variés, mesure champ par champ | — | 1 | 0,0145 € mesuré (1 page) ; + 0,003 € par page de plus |
| Factur-X (PDF/A-3 + XML) | **A** | 17/17, sans IA, TTC « concorde » avec le PDF page 2 (R2026-000005) | Factures Factur-X de vrais émetteurs français (profils BASIC/EN16931) | — | 0,5 | 0 € |
| UBL / CII (XML nus, Chorus Pro, PDP) | B | exemples publics FeRD/XRechnung : justes | Un vrai flux PDP ou Chorus Pro | — | 0,5 | 0 € |
| Avoirs et factures rectificatives | B | exemple public (code 384) | Vrais avoirs, PDF et XML | — | 0,5 | comme une facture |
| Factures scannées, photos de tickets, manuscrits | B (lecture visuelle Claude) / T (Mistral OCR, clé non posée) | banc fictif seulement | Corpus de scans réels ; comparer OCR Mistral et lecture visuelle | — | 1 | 0,02–0,03 € par page (vision) ; 0,001 € par page avec Mistral OCR + extraction |
| Plusieurs factures dans un fichier (pièces filles) | B, prêt à prouver | — | Jouer `omega/banc/decoupage_reel.mjs` (fichier de trois factures prêt) | — | 0,5 | ≈ 0,02 € pour la mère + 0,015 € par fille |
| Bons de livraison (FILED) et réception Varelo | B | — | Vrais bons et lettres de voiture, souvent manuscrits ; dépôt par B1 sur la société | — | 1 | 0,015–0,03 € |
| Autres pièces FILED (devis, bon de commande, relevé, contrat) | C | — | Classées, champs génériques de facture seulement ; pas de champs propres | 1 | 1 | ≈ 0,015 € |
| Attestation d'assurance (FILED) | C | — | Pas de champs propres (assureur, période, garanties) | 0,5 | 0,5 | ≈ 0,015 € |
| Pièces juridiques Tamila (avis RPVA, 10 types) | B / **T** | — | Coffre Scaleway pour un vrai dossier ; vrais avis RPVA (exemples anonymisés de B4) | — | 1 | ≈ 0,015 € par avis |
| Lecture longue d'un dossier Tamila (pré-lecture, chronologie, contradictions, bordereau) | B / **T** | — | Même coffre ; un dossier réel ; mesurer les citations vérifiées et les constats sans source | — | 1,5 | 1 à 5 € par dossier (≈ 0,005 € par page lue + synthèse), plafond 15 € |
| Courriers d'urbanisme Lorani (récépissé, ARE, arrêté, délais, pièces, affichage) | B | — | Vrais courriers de mairie et vrais ARE | — | 1 | ≈ 0,015 € |
| Situation de travaux (Lorani) | B | — | Vraies situations | — | 0,5 | ≈ 0,02 € |
| Plans et planches, CCTP, DPGF, métré, plan BET, notice, Cerfa, RE2020 (contrôle du dossier) | B | — | Un vrai dossier de permis ou de DCE ; mesurer les objets rapprochés entre pièces. Seules les cotes écrites sont lues | — | 2 | planche : 0,02–0,05 € ; CCTP ou DPGF de 30 pages : 0,1–0,3 € |
| Règlement de PLU / PLUi (zone du terrain) | B | — | Un vrai PLUi de 300 pages : vérifier qu'il ne rend que la zone | — | 0,5 | 0,3–1,5 € pour un PLUi entier (à découper par zone si besoin) |
| Attestation décennale | B | — | Vraies attestations (modèle de l'arrêté de 2016) | — | 0,5 | ≈ 0,015 € |
| Exports de logiciels (Logos_w, tableurs Varelo, CSV) — lecteur-exports | B / **T** | — | Un vrai export (Teo) ; modèles de colonnes ajustés par B3 | — | 1 | 0 € (sans IA) |
| Photos de chantier (Daliro) : travaux en plus, problèmes, avancement | B | — | B6 dépose `lecteur.media` ; WhatsApp branché (Meta, Teo) ; vraies photos | — | 1 | 0,01–0,02 € par message avec une photo |
| Vocaux (Daliro) | B / **T** | — | Clé Mistral et accord de Teo (refusé pour l'instant) ; WhatsApp | — | 0,5 | ≈ 0,002 € la minute + 0,01 € |
| Documents médicaux (ordonnances, comptes rendus) | **D** | — | Aucun type ; à cadrer (hébergement de données de santé, HDS) avant tout code | 3 | 2 | ≈ 0,015–0,03 € |
| DWG (plans natifs) | **D** | — | Étude de B5 : LibreDWG lit, rendu inexploitable ; chemin côté serveur à choisir | 5+ | 2 | — |
| Mesures prises sur le dessin d'un plan | **D** | — | Non promis honnêtement aujourd'hui (seules les cotes écrites) | — | — | — |

## Ce qui vaut pour toutes les lignes
- Chaque valeur cite sa page et son texte ; elle n'est « vérifiée » que si la citation se retrouve dans la pièce. Une pièce passe « à vérifier » dès qu'une clé manque.
- Plafond par client et par jour (`plafond_ia_jour_client`, 5 € sur la recette) : au-delà, la lecture attend le lendemain.
- Prix utilisés : Claude Sonnet 5.5 (≈ 3 $ et 15 $ par million de jetons en entrée et en sortie), 1 $ = 0,92 €. Une facture d'une page coûte ≈ 3 800 jetons en entrée et 800 en sortie.
- La qualité n'est **mesurée** que sur 2 pièces réelles. Le premier chantier pour passer en A : un corpus par famille, avec un tableur « attendu / lu / juste » par champ. Il faut 1 jour pour l'outil de mesure (comparer `pieces_valeurs` à un attendu), puis environ 0,5 jour par famille.

## Total
Il faut **1,5 jour** pour amener les deux lignes C à B (autres pièces FILED, attestation d'assurance). Il faut **16 jours** pour passer en A toutes les lignes, hors médical et DWG, une fois les documents réels reçus, plus **1 jour** pour l'outil de mesure. Le médical (3 + 2 jours) et le DWG (5 jours et plus, puis 2) sont à décider.
