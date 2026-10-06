# Session C2 — CASHD, la relance des impayés des clients de nos clients

Branche `worker-c2`. Coordinateur : session `session_01BCGFdpRKBvXKjouC75sYBg`. Ouverte le 06/10/2026.
Commande : `omega/AUDIT-PROMESSES.md` § 1 (CASHD absent) ; promesses : `app/page.tsx` (accroche « À 7 h, vos relances
sont déjà écrites », capture « qui doit de l'argent, où en est la relance, et l'encours échu au total »),
`app/offres/relances-impayes/page.tsx`, `lib/produits/relances.ts`, `lib/produits/capacites/relances.ts` (50 lignes).

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (pgTAP sur la recette) | palier 1 écrit, **69/69 vert en local** (Postgres 16 jetable + socle réduit), à poser | c2_01 posé et `^test_c2_` vert sur la recette ; puis paliers 2 et 4 |
| **Livrable client** (/espace/cashd en ligne) | 0 % | palier 3 (écran), après la pose |

## Paliers

1. **Données** — `c2_01_donnees.sql` (écrit, à poser). Comptes clients, factures / acomptes / avoirs / devis, règlements,
   lettrage simple ; balance âgée ; deux voies d'entrée (export du facturier par la chaîne de relevés du socle, dépôt
   CSV depuis l'écran) ; saisie à la main.
2. **Moteur de relance** — à faire : scénarios par compte (J+0, J+7, J+15, mise en demeure), textes écrits à 7 h dans la
   file de validation (`preparer_envoi` du socle, `reglages_envois` cashd, mode essai), pénalités et indemnité de 40 €
   (règles de b6_16), plafond d'encours, compte en litige suspendu, point du matin « qui doit quoi, où en est la relance ».
3. **Écran** — à faire : `components/espace/cashd/`, `app/espace/cashd/`.
4. **Les autres lignes de `capacites/relances.ts`**, une à une.

## Ordre de pose (palier 1)

1. `omega/modules/cashd/migrations/c2_01_donnees.sql` (rejouable ; posé deux fois de suite en local sans écart).
2. Tests : `omega/tests/cashd/c2_00_jeu.sql` (aides), puis `c2_01_donnees.sql` et `c2_02_export.sql` ;
   `select * from runtests('^test_c2_')` ; puis les tests du socle 44, 46 et 51.

## Ce que pose c2_01 (palier 1)

- Tables (RLS, `revoke all … from anon, authenticated`, `grant select` à authenticated ; écriture par les portes seules) :
  `cashd_reglages` (mode **essai** à l'installation, délai par défaut 30 j, plafonné à 60 j — L441-10 —, taux de
  pénalités, indemnité 40 €, seuil de relance), `cashd_comptes` (un compte par client débiteur et par entité ; groupe ;
  contact de facturation et contact commercial séparés ; plafond d'encours ; réciproque ; statut actif | pause | litige |
  recouvrement | hors_perimetre | attente_contact), `cashd_factures` (facture | acompte | avoir | devis ; reste dû lu dans
  l'export), `cashd_reglements`, `cashd_imputations` (une imputation s'annule avec son motif, ne s'efface jamais).
- Vues `security_invoker` : `cashd_factures_etat` (réglé, avoirs imputés, reste dû, jours écoulés, retard, tranche),
  `cashd_reglements_etat` (imputé, à imputer), `cashd_balance_agee` (non échu, 1-30, 31-60, 61-90, > 90, litige,
  crédits, encours, retard max).
- Portes (authenticated + service_role, jamais anon ; gérant, admin ou droit `cashd.gerer`) : `cashd_installer`
  (gérant ou serveur), `cashd_regler` (le passage en mode réel : gérant seul), `cashd_ecrire_compte`,
  `cashd_ecrire_facture`, `cashd_noter_reglement`, `cashd_lettrer`, `cashd_imputer_avoir`, `cashd_annuler_imputation`,
  `cashd_annuler_reglement`, `cashd_importer` (lignes CSV lues dans le navigateur), `cashd_brancher` (facturier),
  `cashd_deposer_export`. Lectures sous RLS : `cashd_tableau`, `cashd_fiche_compte`, `cashd_propositions`.
- Modèle `modeles_jeux` cashd / tableur v1 : jeux `factures` (complet : une pièce absente est soldée), `reglements`
  (journal, non complet), `devis`, `clients` ; en-têtes des facturiers courants (Sage, EBP, Cegid, Pennylane, Sellsy,
  Axonaut, QuickBooks) — **hypothèses à confirmer sur le premier export réel**.
- Abonnement `releve.pret.cashd → cashd.appliquer_releve`, cron `cashd-releves` (chaque minute) :
  `private.cashd_traiter_travaux` → `cashd_appliquer_releve` (acquitte l'instantané, puis intègre l'état du jour).
- Lecture des montants et dates tels que les facturiers les écrivent (`1 234,56`, `(12,00)`, `12,00-`, `JJ/MM/AA`,
  numéro de série de tableur), vérifiée en local.

## Lignes de `lib/produits/capacites/relances.ts` tenues (preuve)

Une ligne est « tenue » quand sa preuve passe sur la recette ; d'ici là, « écrite, verte en local ».

| Ligne | État | Preuve |
|---|---|---|
| Chaque facture porte son montant dû, son retard et le compte concerné. | écrite, verte en local | `cashd_factures_etat` ; test_c2_01 « SCI : 12 000 € échus… retard 45 jours » |
| Un règlement encaissé la veille sort de la liste du jour. | écrite, verte en local | test_c2_02 « La facture absente de l'export complet est soldée » et « reste dû lu dans l'export » |
| La balance âgée range l'encours par tranche d'ancienneté, compte par compte. | écrite, verte en local | `cashd_balance_agee` ; test_c2_01 (31-60, > 90, crédits) |
| Chaque devis porte le nombre de jours écoulés depuis son envoi. | écrite, verte en local | `cashd_factures_etat.jours_ecoules` ; test_c2_01 « 5 jours écoulés » |
| Les règlements partiels sont imputés, et le solde dû continue d'être suivi. | écrite, verte en local | test_c2_01 « Règlement partiel : 7 000 € restent dus » |
| Le lettrage rapproche chaque encaissement de la facture qu'il solde. | écrite, verte en local | test_c2_01 (numéro cité, montant exact, lettrage manuel, annulation) |
| Un virement sans référence est proposé au rapprochement avec les factures probables. | écrite, verte en local | `cashd_propositions` ; test_c2_01 « La facture probable est proposée » (la suspension de la séquence viendra au palier 2) |
| Les avoirs et les acomptes sont déduits avant tout calcul du solde dû. | écrite, verte en local | `cashd_imputer_avoir` ; crédits de la balance ; test_c2_01 « L'avoir de 600 € est déduit » |
| Deux filiales du même groupe client relancées séparément (cas tordu) | écrite | un compte par entité juridique, `groupe` pour le consolidé |
| Le client est aussi l'un de vos fournisseurs (cas tordu) | écrite | `reciproque` met le compte en pause à la saisie |

## Pour le coordinateur

- **Rien à ajouter à la liste figée d'A5** : aucune fonction de `private` créée par c2_01 n'est appelée par une politique,
  une vue ou une fonction SECURITY INVOKER ; toutes sont fermées à public, anon et authenticated.
- **Stockage** : `cashd_deposer_export` attend des fichiers déjà mis dans `omega-clients` sous
  `<client>/branchement/<id>/…`. La politique Storage permet-elle à un gérant d'y écrire depuis le navigateur (comme
  FILED sous `<client>/filed_document/…`) ? Sinon l'écran passera par `cashd_importer` (CSV lu dans le navigateur)
  seulement, et l'XLSX par la boîte de dépôt du lecteur d'A1.
- **Lecteur d'exports (A1)** : le modèle cashd / tableur est générique (synonymes d'en-têtes) ; à lui faire lire au
  premier export réel.
- **Lien de menu** (quand l'écran existera) : `{ cle: "cashd", href: "/espace/cashd", libelle: "Relances", court: "CASHD" }`
  dans `components/espace/ecrans.ts` (fichier de la coquille, à C1).

## Journal de session

- 06/10, soir : lecture (audit, promesses, socle commun, b2_02, b6_16, a4_15, b1_04, lecteur d'exports d'A1). Palier 1
  écrit : `c2_01_donnees.sql`, tests `c2_00_jeu`, `c2_01_donnees` (39), `c2_02_export` (30). Exécutés sur un Postgres 16
  local jetable avec un socle réduit (mêmes signatures que la photographie du 05/10) : 69/69. La migration se rejoue sans
  écart.
