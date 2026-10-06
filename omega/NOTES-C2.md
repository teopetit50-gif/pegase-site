# Session C2 — CASHD, la relance des impayés des clients de nos clients

Branche `worker-c2`. Coordinateur : session `session_01BCGFdpRKBvXKjouC75sYBg`. Ouverte le 06/10/2026.
Commande : `omega/AUDIT-PROMESSES.md` § 1 (CASHD absent) ; promesses : `app/page.tsx` (accroche « À 7 h, vos relances
sont déjà écrites », capture « qui doit de l'argent, où en est la relance, et l'encours échu au total »),
`app/offres/relances-impayes/page.tsx`, `lib/produits/relances.ts`, `lib/produits/capacites/relances.ts` (50 lignes).

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (pgTAP sur la recette) | paliers 1 et 2 écrits, **111/111 verts en local** (Postgres 16 jetable + socle réduit ; trois passes, ordre des travaux aléatoire), à poser | c2_01 et c2_02 posés et `^test_c2_` vert sur la recette ; puis palier 4 |
| **Livrable client** (/espace/cashd) | écran écrit sur worker-c2 : **recette 67/67 aux cinq largeurs** (exemple) ; pas encore en ligne | fusion par le coordinateur ; lien de menu (C1) ; relecture réelle avec le compte du banc après la pose |

## Paliers

1. **Données** — `c2_01_donnees.sql` (écrit, à poser). Comptes clients, factures / acomptes / avoirs / devis, règlements,
   lettrage simple ; balance âgée ; deux voies d'entrée (export du facturier par la chaîne de relevés du socle, dépôt
   CSV depuis l'écran) ; saisie à la main.
2. **Moteur de relance** — `c2_02_moteur.sql` (écrit, à poser). Voir plus bas.
3. **Écran** — `app/espace/cashd/page.tsx`, `components/espace/cashd/` (écrit). Voir plus bas.
4. **Les autres lignes de `capacites/relances.ts`**, une à une.

## Ordre de pose

1. `omega/modules/cashd/migrations/c2_01_donnees.sql` (palier 1 ; rejouable).
2. `omega/modules/cashd/migrations/c2_02_moteur.sql` (palier 2 ; rejouable ; redéfinit `cashd_importer` et
   `cashd_traiter_travaux` de c2_01 en y ajoutant le relettrage et la relecture des relances).
3. Tests : `omega/tests/cashd/c2_00_jeu.sql` (aides, à rejouer : `tests.c2_plat` ajoutée), puis `c2_01_donnees.sql`,
   `c2_02_export.sql`, `c2_03_moteur.sql` ; `select * from runtests('^test_c2_')` ; puis les tests du socle 44, 46 et 51.

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

## Ce que pose c2_02 (palier 2, le moteur)

- **Paliers, ceux que le site promet** (`lib/produits/relances.ts`, PROTOCOLE et CHIFFRES) : facture — rappel courtois
  à J+7 de l'échéance, relance ferme à J+21, mise en demeure à J+30 ; devis — J+3 puis J+10. Réglables
  (`cashd_regler_relances` : scénario de l'organisation ; `cashd_regler_compte` : scénario d'un compte). Un palier
  manqué n'est pas sauté : un cran à la fois, cinq jours au moins entre deux paliers d'une même facture.
- **Un message par compte et par jour** (`cashd_relances`), qui reprend chaque facture arrivée à un palier de SA séquence
  (`cashd_relances_pieces`, un palier par facture une seule fois). Une relance plus ferme remplace celle encore en
  attente pour le même compte.
- **Le texte** (`private.cashd_ecrire_texte`) : le ton suit le palier, le montant, l'ancienneté et l'historique de
  paiement (un compte qui a déjà payé en retard n'a pas le « simple oubli ») ; il reprend le secteur du compte, sa
  référence, chaque facture (numéro, date, TTC, échéance, retard, reste dû) ; la relance ferme récapitule, fixe une
  échéance et rappelle l'indemnité et les pénalités ; la mise en demeure cite L441-10 et D441-5. Formule et signature
  de l'organisation ; ses mots interdits bloquent le message. Français et anglais (`cashd_comptes.langue`).
- **Pénalités et indemnité** (règles de b6_16, L441-10) : indemnité de 40 € par facture en retard (sauf compte
  `particulier`), pénalités au taux réglé sur le reste dû, de l'échéance au jour du calcul.
- **La file de validation** : chaque relance dépose une `demandes_validation` (module cashd ; type `cashd.relance`,
  `cashd.mise_en_demeure` ou `cashd.devis` ; objet `cashd_relances` ; **montant** ; payload : sujet, corps,
  destinataire), puis `private.preparer_envoi` ADOSSÉ à cette demande. Le seuil de la direction
  (`seuil_direction`) pose une `regles_validation` cashd (gérant, admin) au-delà du montant. La mise en demeure exige un
  commentaire, et si un accord permanent l'approuvait d'office, elle n'est pas préparée (alerte).
- **Ce qui suspend** : compte en pause / litige / recouvrement / hors périmètre / attente de contact / réciproque ;
  facture en litige ; règlement du compte non lettré ; reste dû sous le seuil ; sans adresse (« sans_adresse »).
- **Ce qui coupe ce qui est prêt** : un règlement, une sortie de l'export, un devis accepté, un litige, une pause — la
  demande en attente passe « annulee » (le socle annule l'envoi adossé), la relance « coupee ».
- **Avoirs** : les avoirs ouverts du compte sont imputés sur ses factures échues avant d'écrire.
- **Relettrage** : chaque intégration retente le lettrage des règlements arrivés avant leurs factures.
- **7 h** : cron `cashd-matin` (toutes les 10 min) → `private.cashd_passage` : à l'heure réglée (Paris), une fois par
  jour et par organisation, relire, écrire, déposer la section « Impayés : qui doit quoi » du point du matin (gérant,
  admin, valideur) : ce qui attend la validation, le facturier non relu, les dix comptes les plus en retard avec leur
  palier et le suivant, les règlements à rapprocher, les plafonds dépassés.
- **Vues** `cashd_relances_etat` (état vu de la file : à valider, validée, refusée, envoyée, coupée) et `cashd_suivi`
  (chaque pièce : palier atteint, palier suivant et sa date, état de la séquence).
- **Portes** : `cashd_preparer_maintenant`, `cashd_statut_compte` (toute reprise exige un motif ; remettre un compte hors
  périmètre : gérant ou admin), `cashd_litige`, `cashd_regler_relances`, `cashd_regler_compte`,
  `cashd_relances_du_jour`.

## L'écran /espace/cashd (palier 3)

- **En haut** : l'encours échu au total (et l'encours total), les retards de plus de 90 jours, les relances à valider,
  les comptes hors cycle — trois compteurs filtrent la liste. **Balance âgée** de tout l'encours (barre empilée,
  cinq tranches), date du dernier export lu, crédits à déduire. Avis « mode essai ».
- **Débiteurs** (qui doit quoi, depuis quand) et **fiche du compte** : contact de facturation, plafond, échu,
  encours, crédits ; chaque pièce avec reste dû, retard, palier atteint et palier suivant (vue `cashd_suivi`) ;
  règlements. Gestes : noter un règlement (sur une facture ou non), mettre en pause / reprendre (motif obligatoire),
  litige ouvrir / clore.
- **Relances écrites** : compte, palier, état dans la file (à valider, partie, coupée…), objet, montant, indemnité,
  pénalités, motif ; le texte complet se déplie ; lien vers la file de validation (`/espace/validations`).
- **Règlements à rapprocher** : « factures probables » (`cashd_propositions`) et « Lettrer ».
- **Déposer un export** : CSV choisi ou collé, lu dans le navigateur (`lireTableau` de Varelo + synonymes identiques au
  modèle cashd/tableur), compte des lignes et colonnes reconnues / ignorées avant l'envoi à `cashd_importer` ; case
  « export complet ». L'XLSX passe par la chaîne de relevés.
- Deux sources (interrupteur de la coquille) : l'exemple joué en mémoire (`exemples.ts`, `calcul.ts`, mêmes règles que
  les vues) ; la base réelle (`portes.ts`, sous RLS ; temps réel sur cashd_factures, cashd_reglements, cashd_relances,
  cashd_comptes). Aucune table écrite en direct.
- Vérifié : `npx tsc --noEmit`, `npx eslint components/espace/cashd app/espace/cashd`, `npm run build` (route
  `ƒ /espace/cashd`) ; `node omega/recette-c2/recette-cashd.mjs` : **67/67** — cinq largeurs (pas de débordement, pas de
  mot anglais, échu 17 810 €, 4 tranches, 5 débiteurs, 5 relances, fiche à 3 pièces), puis règlement (F-2026-101
  soldée, relance coupée, échu 5 810 €), pause (mise en demeure coupée), rapprochement (échu 3 960 €), dépôt collé
  (2 lignes, colonne ignorée dite), relance dépliée à 390. Captures dans `omega/recette-c2/`.

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
| Le système relit votre facturier chaque matin, avant d'écrire la moindre relance. | écrite, verte en local | `cashd_passage` relit (`cashd_verifier_relances`) avant d'écrire ; point du matin « facturier non relu » ; test_c2_03 |
| Chaque ligne indique l'état de la relance et le palier suivant. | écrite, verte en local | vue `cashd_suivi` ; test_c2_03 « palier atteint et palier suivant » |
| Les devis sans réponse sont suivis au même titre que les factures échues. | écrite, verte en local | test_c2_03 « Le devis de 5 jours est relancé » |
| Une facture échue suit trois paliers : deux relances, puis la mise en demeure. | écrite, verte en local | test_c2_03 (rappel, relance ferme, mise en demeure, puis plus rien) |
| Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel. | écrite, verte en local | scénario devis 3 / 10 ; test_c2_03 |
| La fermeté du message suit le palier atteint, du rappel à la mise en demeure. | écrite, verte en local | `cashd_ecrire_texte` ; test_c2_03 (trois textes) |
| Chaque message reprend le secteur du compte, sa référence, son montant et son retard. | écrite, verte en local | test_c2_03 « Le message reprend… » |
| Les relances partent par courriel, depuis la boîte de votre entreprise. | écrite (courriel) ; la boîte de l'entreprise attend Gmail / Microsoft (A2) | `preparer_envoi` canal email |
| Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi. | écrite, verte en local | `seuil_direction` → `regles_validation` ; test_c2_03 « de la direction (3 000 € > 2 000 €) » |
| Chaque facture suit sa propre séquence, avec son palier et son échéance. | écrite, verte en local | `cashd_relances_pieces` (palier par facture) ; `cashd_suivi` |
| Un compte se met en pause ou sort du périmètre à tout moment. | écrite, verte en local | `cashd_statut_compte` ; test_c2_03 « pause coupe la mise en demeure prête » |
| La mise en demeure est préparée, puis elle attend une validation explicite. | écrite, verte en local | type `cashd.mise_en_demeure`, commentaire exigé, jamais d'accord permanent ; test_c2_03 |
| Un règlement enregistré interrompt la séquence avant le prochain envoi. | écrite, verte en local | `cashd_suivre_solde` → `cashd_couper` ; test_c2_03 « Le règlement de F-2026-101 coupe la relance prête » |
| Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées. | écrite, verte en local | `cashd_penalites` ; test_c2_03 (40 € ; 3 000 × 105 j × 12,15 % / 365) |
| Vos règles de communication et vos interdits sont repris dans chaque message. | écrite, verte en local | formule, signature, interdits ; test_c2_03 « mot interdit… bloqué » |
| Un compte se met en pause, et il n'y revient que sur votre décision. | écrite, verte en local | reprise motivée, journalisée ; test_c2_03 |
| Chaque relance partie est datée et consignée, avec son objet et son destinataire. | écrite (socle) | `envois` du socle + journal `cashd.relance_preparee` |
| Une contestation écrite bascule la facture en litige et la sort du cycle. | écrite, verte en local (la bascule se fait par `cashd_litige` ; la lecture de la contestation écrite reçue viendra avec la réception d'A2) | test_c2_03 « Une facture en litige sort du cycle » |
| La reprise des relances demande une décision, jamais un simple délai écoulé. | écrite, verte en local | `cashd_statut_compte` / `cashd_litige` exigent un motif |
| Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes. | moitié : les relances vont au contact de facturation ; l'alerte au commercial reste à faire | — |
| Les comptes export reçoivent leur relance dans leur langue de facturation. | écrite (fr, en) | `cashd_ecrire_texte` |
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

- 06/10, nuit : palier 3, l'écran. Recette 67/67 (un défaut trouvé : après un geste, la liste se réordonnait et la
  fiche changeait de compte, l'avis « C'est fait » disparaissait → le geste fige le compte ouvert).

- 06/10, nuit : palier 2 écrit, `c2_02_moteur.sql`, test `c2_03_moteur` (42). Défaut trouvé en local et corrigé : quand
  le journal des encaissements arrive avant l'export des factures (ordre des travaux non garanti), le règlement restait
  sans lettrage → `private.cashd_relettrer` après chaque intégration. 111/111 sur trois passes.

- 06/10, soir : lecture (audit, promesses, socle commun, b2_02, b6_16, a4_15, b1_04, lecteur d'exports d'A1). Palier 1
  écrit : `c2_01_donnees.sql`, tests `c2_00_jeu`, `c2_01_donnees` (39), `c2_02_export` (30). Exécutés sur un Postgres 16
  local jetable avec un socle réduit (mêmes signatures que la photographie du 05/10) : 69/69. La migration se rejoue sans
  écart.
