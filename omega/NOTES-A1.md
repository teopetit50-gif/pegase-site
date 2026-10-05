# NOTES-A1 — ouvrier LECTEUR (session worker A1)

Branche `worker-a1`. Périmètre : `omega/functions/lecteur/` et `omega/functions/_partage/`.
Dernière mise à jour : 05/10/2026.

## Fait

- **Code** : la fonction Edge `lecteur` (Deno) et le socle `_partage`, tout en français, aucun secret, aucune donnée réelle.
  - `_partage/portes.ts` : les neuf portes par RPC PostgREST avec la clé de service (`prendre_travaux`, `finir_travail`, `echouer_travail`, `commencer_lecture`, `enregistrer_lecture`, `battre_ouvrier`, et depuis le lot 19 du socle `piece_a_lire`, `consommation_ia_jour`, `lire_parametre`). **Plus aucune lecture directe de table** ; un test vérifie que tout passe par `/rest/v1/rpc/`.
  - `_partage/depot.ts` : téléchargement depuis le bucket `omega-clients` ; un 404 est une pièce illisible, pas une panne.
  - `_partage/aws_sigv4.ts` + `_partage/bedrock.ts` : signature SigV4 maison (Web Crypto, vérifiée sur le vecteur public d'AWS) et client Converse de Claude sur Bedrock, région `eu-central-1` par défaut, prix par famille de modèle et conversion en euros.
  - `lecteur/index.ts` → `passage.ts` → `lire_piece.ts` : prise de cinq travaux, lecture séquentielle dans un budget de 110 s, battement systématique en `finally`.
  - Lectures : PDF natif (texte + position des mots → `boite`), Factur-X / ZUGFeRD (CII) et UBL **sans IA** (`source: xml`, `methode: xml`), scanné (OCR Mistral si branché, sinon lecture visuelle par Claude : `methode` de page `vision` ou `ocr_manuscrit`), image (png/jpeg/webp/gif), tableur (CSV natif, XLSX par SheetJS), texte.
  - `verifier.ts` : chaque citation est recherchée dans le texte de la page citée (sans accents, sans casse, espaces près) ; clés SIREN/SIRET/TVA/IBAN, dates et nombres contrôlés ; `verifiee` n'est vraie qu'à ces conditions. Les lignes et la ventilation sont une valeur `lignes` / `tva.ventilation` (tableau jsonb), vérifiées libellé par libellé.
  - `schemas/facture.ts` : les champs **exactement** lus par `private.filed_integrer_facture` et `private.filed_valeurs` (relues le 05/10) : `numero`, `date`, `echeance`, `devise`, `montant_ht`, `montant_tva`, `montant_ttc`, `net_a_payer`, `montant_prepaye`, `type_code`, `cadre_facturation`, `fournisseur.{nom,siren,siret,tva,id_legal,pays,iban}`, `acheteur.{nom,siren,siret,tva,pays,reference}`, `commande.reference`, `livraison.{reference,date}`, `contrat.reference`, `facture_origine.{reference,date}`, `mention.{autoliquidation,franchise_293b}`, `lignes[]`, `tva.ventilation[]`. Le schéma d'outil Converse en découle.
  - Plafond : réglage `plafond_ia_jour_client` lu par `lire_parametre` (posé à 5 € sur la recette), sinon `PLAFOND_IA_JOUR_CLIENT_EUR`, sinon 5 € ; estimation du coût avant appel, `PLAFOND_IA` non définitif.
- **Banc** : `lecteur/banc/` — dix pièces fictives engendrées par `deno task banc` (un écrivain PDF/PNG minimal, sans dépendance) et leurs attendus JSON : natif, scanné, deux factures dans un fichier, Factur-X, UBL, ticket manuscrit, illisible, avoir, tableur, pièce chiffrée.
- **Gros documents et boîtes** (demandés par le coordinateur) : un PDF sans texte au-delà de 20 pages ou de 4,5 Mo est découpé par pdf-lib en morceaux (`pdf_decouper.ts`), chaque morceau transcrit par Claude (outil `transcrire_pages`, numéros de page du document complet), puis **une seule extraction** sur le texte réuni ; les morceaux entièrement natifs ne sont pas transcrits ; le plafond se contrôle une fois sur le coût total ; `finir_travail` rend `appels_ia`, jetons et coût cumulés. En lecture visuelle, le modèle peut rendre une `boite` approximative par valeur : gardée si plausible (dans la page, surface non nulle), marquée « boîte estimée par le modèle » dans `controle` ; jamais sur un PDF natif, où la boîte vient des mots du PDF.
- **Tests** : `deno task test` → **42 tests verts** (10 cas du banc + 25 règles : IA non branchée, plafond, fichier absent, format inconnu, citation fausse, SIREN à clé fausse, OCR branché, pannes IA/porte, battement à vide, outils, SigV4 ; 3 tests des portes RPC avec un faux `fetch` ; 4 tests des gros PDF et des boîtes estimées).
- **Recette** (`omega-recette`) : FILED installé sur l'organisation du banc `Groupe Sogexal (banc)` (`cccccccc-0000-4000-8000-00000000000c`) par `filed_installer` en rôle de service ; une pièce de test déposée par `filed_deposer_piece` (document `a1a1a1a1-0000-4000-8000-000000000001`, fichier `01_facture_native.pdf`, sha256 `a38514ce…58aa9`) → pièce `0e8d16cf-b2bd-48fe-9397-b579bca0c0fc`, travail **2138** `lecteur.lire` en `a_faire`. La chaîne socle (dépôt → `pieces` → trigger `pieces_demander_lecture` → `travaux`) est donc vérifiée.
- **Déploiement** : voir la section « Déploiement » en bas (mise à jour à la fin de la session).

## Bloqué

1. **Le secret `cle_service` du Vault.** Le coordinateur a posé le cron `omega-lecteur` (chaque minute, `net.http_post` vers `/functions/v1/lecteur`, délai 120 s, `Authorization` lu dans `vault.decrypted_secrets` sous le nom `cle_service`). Tant que Teo n'a pas posé ce secret, le cron ne fait rien. Je ne lis volontairement aucune clé du projet.
2. **L'essai réel de bout en bout s'arrête donc avant le passage de l'ouvrier** : le travail 2138 attend. Dès le premier appel (sans Bedrock), le résultat attendu et testé est `echouer_travail` → `repris`, erreur `IA_NON_BRANCHEE : …`, pièce laissée en `recue` (ni téléchargée ni passée en lecture quand l'IA manque).
3. ~~`public.parametres`~~ : réglé par le lot 19 (porte `lire_parametre` sur `private.reglages`, `plafond_ia_jour_client = '5'`).
4. **Le fichier de la pièce de test n'est pas dans le bucket** : je ne peux pas écrire dans Storage sans clé. Conséquence maîtrisée : quand Bedrock sera branché, cette pièce finira en `echec` motivé « Fichier absent du dépôt », travail `fait`, sans alerte critique. Pour un essai complet, redéposer une pièce avec son fichier (voir « Demain »).

## Demain

- Dès l'appel branché : lire les journaux (`query_logs`, source `function_edge_logs`), vérifier `travaux` 2138 (`repris`, `IA_NON_BRANCHEE`) et `battements` (`lecteur`).
- Dès Bedrock branché : déposer une vraie pièce du banc **avec** son fichier dans `omega-clients` (chemin `<client>/filed_document/<document>/<nom>`), suivre `pieces_pages`, `pieces_valeurs`, puis `filed.integrer` → `filed_factures`.
- Essayer Mistral OCR sur le scanné et comparer avec la lecture visuelle de Claude (qualité, coût).
- `boite` sur les pages passées par **Mistral OCR** : l'API ne rend pas de position par mot ; voir si une passe de mise en page vaut son coût.
- Une image seule au-delà de 3,75 Mo : la réduire sans canvas (aujourd'hui : échec motivé).

## Décisions prises

- **OCR.** Choix : **Mistral OCR** (`https://api.mistral.ai/v1/ocr`, modèle `mistral-ocr-latest`), appelable en un POST depuis Deno, PDF multipages et images acceptés en base64, hébergé en Union européenne, **1 $ les 1 000 pages (≈ 0,0009 € la page)**. Il n'est **pas obligatoire** : sans `MISTRAL_API_KEY`, les pages sans texte partent en **lecture visuelle par Claude sur Bedrock** (document PDF ou image dans Converse) qui transcrit chaque page (`pages[]`) puis extrait ; coût d'une page ≈ 1 600 jetons d'entrée, soit ≈ 0,005 € par page avec Sonnet, et ce chemin lit mieux les manuscrits et tickets. Écartés : Textract (synchrone limité à une page, asynchrone exige S3), Azure Document Intelligence (un fournisseur et un contrat de plus), Tesseract en Wasm (trop lent dans une fonction Edge).
- **Bedrock.** Modèle en variable `BEDROCK_MODEL_ID` ; un seul appel par pièce, en *tool use* forcé (`lire_piece`), température 0, 16 000 jetons de sortie au plus. Prix par défaut : Sonnet 3/15 $, Haiku 1/5 $, Opus 5/25 $ (15/75 $ pour 4.0/4.1) par million de jetons ; surcharge par `BEDROCK_PRIX_ENTREE_USD_MTOK`, `BEDROCK_PRIX_SORTIE_USD_MTOK`, `TAUX_USD_EUR` (0,92).
- **Ordre des contrôles.** Chiffrement → avant `commencer_lecture` (la pièce reste `recue`). IA absente → avant tout téléchargement, sauf pour une pièce XML qui se lit sans IA. Fichier absent du dépôt → `echec` définitif (ce n'est pas transitoire). Pannes réseau / 5xx / 429 → `FOURNISSEUR_INDISPONIBLE`, repris.
- **Statuts.** `lue` : type facture/avoir et les champs clés (`numero`, `date`, `montant_ht`, `montant_tva`, `montant_ttc`, `fournisseur.nom`) tous vérifiés ; `a_verifier` sinon, avec la liste en `motif` ; `a_classer` : type `autre` ou confiance < 0,6 ; `rejetee` : format non pris en charge ; `echec` : illisible, vide, absent.
- **Aucune lecture directe de table.** Les deux lectures tolérées de la première version (`public.pieces`, `public.travaux`) ont été remplacées le jour même par les portes `piece_a_lire` et `consommation_ia_jour` du lot 19.
- **`p_version`** : `lecteur/<AAAA-MM-JJ>/<modèle court>` (ex. `lecteur/2026-10-05/claude-sonnet-4-5`), tronqué à 40 caractères comme la colonne.
- **Plusieurs factures** dans un fichier : la première est lue comme la pièce ; `decoupage: [{pages:[…]}, …]` dans le résultat de `finir_travail`.
- **Pages XML / tableur** : `pieces_pages.methode` n'admet que natif/ocr/ocr_manuscrit/vision ; une pièce XML nue a une page `natif` portant le XML, un tableur une page `natif` par feuille.
- **Déploiement** : les imports passent par l'alias `@partage/` ; `outils/preparer_deploiement.ts` copie `_partage` sous la fonction et réécrit l'alias, pour que le dépôt garde un seul socle partagé.

## Demandes au coordinateur

Toutes réglées le 05/10 (lot 19) : portes `piece_a_lire`, `consommation_ia_jour`, `lire_parametre` ; cron `omega-lecteur` posé (délai 120 s, cohérent avec le budget de 110 s du passage) ; sémantique confirmée (`rejetee` = format non pris en charge ou pièce refusée par règle, `a_classer` = type autre ou confiance < 0,6, `echec` = illisible/vide/absent) ; priorité 0 conservée.

Reste ouvert : rien côté socle. Le coordinateur redéploie lui-même la fonction à partir de la branche ; je ne redéploie plus de mon côté.

## Ce que Teo doit poser

Secrets de la fonction Edge `lecteur` sur la recette (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`) :

| Variable | Rôle |
|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Identifiants IAM avec `bedrock:InvokeModel` sur le modèle choisi |
| `AWS_REGION` | `eu-central-1` (défaut si absent) |
| `BEDROCK_MODEL_ID` | ex. `eu.anthropic.claude-sonnet-4-5-20250929-v1:0` (profil d'inférence européen) |
| `MISTRAL_API_KEY` | facultatif : OCR classique des pages scannées |
| `PLAFOND_IA_JOUR_CLIENT_EUR` | facultatif, 5 € par défaut |

Sans ces variables la fonction tourne, bat, et reprend chaque travail avec `IA_NON_BRANCHEE` ; aucune exception ne sort.

Puis le secret Vault **`cle_service`** (la clé de service du projet) : c'est lui que lit le cron `omega-lecteur` déjà posé.

## Déploiement

- Fonction Edge **`lecteur`** déployée sur `omega-recette` (`ygwbgpowzlbdaajlsqkn`) le 05/10/2026 : id `bf04c3c1-7764-4baf-9320-b9262cbcb000`, version 1, statut ACTIVE, `verify_jwt = true`, import map `deno.json`, 20 fichiers (le lecteur, `schemas/`, `_partage/` copié sous la fonction).
- Source servie relue par `get_edge_function` et comparée au paquet local : **les 20 fichiers sont identiques** au commit `15156cf` de `worker-a1`.
- Pas encore appelée : le cron attend le secret `cle_service` (voir « Bloqué »). Rejouer le déploiement après une modification : `deno task deployer` produit `outils/paquet.json`, à passer tel quel à l'outil de déploiement.
- Le coordinateur a déployé une **version 2** à 16:43 UTC ; relue par `get_edge_function`, elle précède le commit des portes (`portes.ts` y lit encore `public.pieces`). La version à déployer est celle du dernier commit de `worker-a1` ; le coordinateur redéploie lui-même.
