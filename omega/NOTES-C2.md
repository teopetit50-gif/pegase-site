# Session C2 — CASHD, la relance des impayés des clients de nos clients

Branche `worker-c2`. Coordinateur : session `session_01BCGFdpRKBvXKjouC75sYBg`. Ouverte le 06/10/2026.
Commande : `omega/AUDIT-PROMESSES.md` § 1 (CASHD absent) ; promesses : `app/page.tsx` (accroche « À 7 h, vos relances
sont déjà écrites », capture « qui doit de l'argent, où en est la relance, et l'encours échu au total »),
`app/offres/relances-impayes/page.tsx`, `lib/produits/relances.ts`, `lib/produits/capacites/relances.ts` (50 lignes).

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (pgTAP sur la recette) | **100 %** — c2_01 → c2_03 posés ; ^test_c2_ vert (lot de 1120 ok, 0 not ok) et socle 44/46/51/55 verts, 06/10 17 h 25 Z | — |
| ~~Mécanique, avant la pose~~ | paliers 1, 2 et 4 écrits, **150/150 verts en local** (Postgres 16 jetable + socle réduit ; pose neuve c2_01→c2_03 puis rejeu des trois, dans le désordre compris), à poser | c2_01 à c2_03 posés et `^test_c2_` vert sur la recette |
| **Livrable client** (/espace/cashd) | **en ligne** : worker-c2 fusionnée dans main (7399f41), build vert, /espace/cashd 200 aux cinq largeurs (coordinateur) ; lien de menu chez C1 ; banc_cashd.sql à jouer | relecture réelle avec le compte du banc |
| ~~Livrable, avant la fusion~~ | écran écrit sur worker-c2 : **recette 76/76 aux cinq largeurs** (exemple) ; pas encore en ligne | fusion par le coordinateur ; lien de menu (C1) ; relecture réelle avec le compte du banc après la pose |

## Paliers

1. **Données** — `c2_01_donnees.sql` (écrit, à poser). Comptes clients, factures / acomptes / avoirs / devis, règlements,
   lettrage simple ; balance âgée ; deux voies d'entrée (export du facturier par la chaîne de relevés du socle, dépôt
   CSV depuis l'écran) ; saisie à la main.
2. **Moteur de relance** — `c2_02_moteur.sql` (écrit, à poser). Voir plus bas.
3. **Écran** — `app/espace/cashd/page.tsx`, `components/espace/cashd/` (écrit). Voir plus bas.
4. **Les autres lignes de `capacites/relances.ts`** — `c2_03_capacites.sql` (écrit) et l'écran ; tableau ci-dessous.

## Ordre de pose

1. `omega/modules/cashd/migrations/c2_01_donnees.sql` (palier 1 ; rejouable).
2. `omega/modules/cashd/migrations/c2_02_moteur.sql` (palier 2 ; redéfinit `cashd_importer` et
   `cashd_traiter_travaux` de c2_01 en y ajoutant le relettrage et la relecture des relances).
3. `omega/modules/cashd/migrations/c2_03_capacites.sql` (palier 4 ; étend les vues de c2_01, redéfinit plusieurs
   fonctions de c2_01 et c2_02 en gardant leur signature).
4. Tests : `omega/tests/cashd/c2_00_jeu.sql` (aides), puis `c2_01_donnees.sql`, `c2_02_export.sql`, `c2_03_moteur.sql`,
   `c2_04_capacites.sql` ; `select * from runtests('^test_c2_')` ; puis les tests du socle 44, 46 et 51.

**Rejouer** : toujours la suite c2_01 → c2_03 dans l'ordre, jusqu'à la dernière. Une migration plus ancienne rejouée seule
après une plus récente ne casse plus (ses vues sont gardées si une plus récente les a étendues), mais elle remettrait
l'ancien corps des fonctions que la plus récente redéfinit.

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

## Les 50 lignes de `lib/produits/capacites/relances.ts`, une à une

« Tenue » : la preuve passe sur la recette — lot ^test_c2_ (avec c3, a4_30, b1, b5, b6, c4) 1120 ok / 0 not ok, socle
44/46/51/55 34 ok, le 06/10 à 17 h 25 Z (coordinateur, après pose de c2_01 → c2_03 depuis 8b8fbb4). Tests : t1 = test_c2_01_donnees, t2 = test_c2_02_export,
t3 = test_c2_03_moteur, t4 = test_c2_04_capacites ; R = recette de l'écran (omega/recette-c2/recette-cashd.mjs).

### Suivi de l'encours
| # | Ligne | État | Preuve |
|---|---|---|---|
| 1 | Le système relit votre facturier chaque matin, avant d'écrire la moindre relance. | tenue | chaîne de relevés (t2) ; `cashd_passage` relit avant d'écrire (t3) |
| 2 | Chaque devis porte le nombre de jours écoulés depuis son envoi. | tenue | `jours_ecoules` (t1) ; R « 5 j sans réponse » |
| 3 | Chaque facture porte son montant dû, son retard et le compte concerné. | tenue | `cashd_factures_etat` (t1) ; R |
| 4 | Un règlement encaissé la veille sort de la liste du jour. | tenue | t2 « absente de l'export… soldée », « reste dû lu dans l'export » |
| 5 | La balance âgée range l'encours par tranche d'ancienneté, compte par compte. | tenue | `cashd_balance_agee` (t1) ; R (barre, 5 tranches) |
| 6 | Chaque ligne indique l'état de la relance et le palier suivant. | tenue | `cashd_suivi` (t3) ; R « Suivant : relance ferme » |
| 7 | Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes. | tenue | `cashd_poser_echeancier` (t4 : refus du total faux, échéance suivie, payée → suivante) ; R |
| 8 | Les devis sans réponse sont suivis au même titre que les factures échues. | tenue | t3 « Le devis de 5 jours est relancé » |

### Relance et escalade
| # | Ligne | État | Preuve |
|---|---|---|---|
| 9 | Une facture échue suit trois paliers : deux relances, puis la mise en demeure. | tenue | t3 (rappel J+7, relance J+21, mise en demeure J+30, puis rien) |
| 10 | Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel. | tenue | scénario devis 3 / 10 (t3) |
| 11 | La fermeté du message suit le palier atteint, du rappel à la mise en demeure. | tenue | `cashd_ecrire_texte` (t3, trois textes) |
| 12 | Chaque message reprend le secteur du compte, sa référence, son montant et son retard. | tenue | t3 « Le message reprend… » |
| 13 | Les relances partent par courriel, depuis la boîte de votre entreprise. | **moitié** | courriel par le socle (`preparer_envoi`, canal email) ; « depuis la boîte de votre entreprise » attend Gmail / Microsoft 365 (A2) |
| 14 | Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi. | tenue | `seuil_direction` → `regles_validation` (t3) |
| 15 | Chaque facture suit sa propre séquence, avec son palier et son échéance. | tenue | `cashd_relances_pieces` (t3) |
| 16 | Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires. | tenue | passage seulement un jour ouvré du territoire (calendrier du socle, t4 « un samedi ») ; heure réglée (t3) ; fenêtres d'envoi : réglages d'envoi du socle |
| 17 | Les comptes export reçoivent leur relance dans leur langue de facturation. | **moitié** | français et anglais (`cashd_comptes.langue`) ; d'autres langues : textes à écrire |

### Litiges et exceptions
| # | Ligne | État | Preuve |
|---|---|---|---|
| 18 | Une contestation écrite bascule la facture en litige et la sort du cycle. | **moitié** | la sortie du cycle : `cashd_litige` (t3) ; la réponse reçue est signalée (`cashd_suivre_reception`) mais la bascule reste une décision humaine (lecture de la contestation non automatisée) |
| 19 | Le commercial en charge du compte est notifié dès l'ouverture du litige. | tenue | alerte nominative au commercial (t4) |
| 20 | Une facture contestée sur une seule ligne laisse le reste en relance. | tenue | `cashd_litige_partiel` (t4 : 1 000 € contestés, le reste relancé et dit) ; R |
| 21 | La reprise des relances demande une décision, jamais un simple délai écoulé. | tenue | motif obligatoire (t3) |
| 22 | Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes. | tenue | relances au contact de facturation ; alertes du compte au commercial (`cashd_alerter_commercial`, t4) |
| 23 | Un compte se met en pause ou sort du périmètre à tout moment. | tenue | `cashd_statut_compte` (t3) ; R |
| 24 | La mise en demeure est préparée, puis elle attend une validation explicite. | tenue | t3 (commentaire exigé, jamais d'accord permanent) |
| 25 | Le dossier de litige réunit les pièces, les envois et les accusés de réception. | tenue | `cashd_dossier` (pièces, imputations, relances + remise, réponses, journal) (t4) ; R « Dossier » |
| 26 | Le courrier recommandé électronique est préparé quand la créance l'exige. | tenue (préparé) ; **départ : tiers AR24** | mise en demeure en canal `lre` au-delà de `seuil_lre` (t4) |

### Encaissement et rapprochement
| # | Ligne | État | Preuve |
|---|---|---|---|
| 27 | Un règlement enregistré interrompt la séquence avant le prochain envoi. | tenue | t3 « Le règlement… coupe la relance prête » ; R |
| 28 | Les règlements partiels sont imputés, et le solde dû continue d'être suivi. | tenue | t1 |
| 29 | Le lettrage rapproche chaque encaissement de la facture qu'il solde. | tenue | t1, t2 (y compris journal arrivé avant les factures) |
| 30 | Les écritures bancaires sont rapprochées de l'encours, jour après jour. | tenue (par export) | jeu `reglements` (relevé bancaire filtré sur les crédits) + relettrage à chaque export ; un flux bancaire direct serait un tiers (agrégateur DSP2) |
| 31 | Un virement sans référence est proposé au rapprochement avec les factures probables. | tenue | `cashd_propositions` (t1) ; la séquence du compte attend (t3) ; R |
| 32 | Les avoirs et les acomptes sont déduits avant tout calcul du solde dû. | tenue | t1 ; avoirs imputés avant d'écrire (t3) |
| 33 | Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées. | tenue | `cashd_penalites` (t3) |
| 34 | Un lien de paiement accompagne la relance et s'éteint dès le règlement. | contrat d'interface tenu ; **tiers : prestataire de paiement** | `cashd_poser_lien`, `cashd_lien_paye`, extinction au règlement (t4) ; le lien entre dans le texte |
| 35 | Les factures en devise étrangère sont suivies dans leur devise et en euros. | tenue | `cashd_taux_change`, `reste_du_eur`, balance en euros (t4) ; le chargement quotidien des taux BCE est à brancher (ouvrier serveur, source publique) |

### Risque client
| # | Ligne | État | Preuve |
|---|---|---|---|
| 36 | Un plafond d'encours se fixe par compte, à partir de son historique. | tenue | `cashd_proposer_plafond` / `cashd_fixer_plafond` (t4) ; R |
| 37 | Le dépassement du plafond déclenche une alerte avant toute nouvelle commande. | tenue | `cashd_alerter_plafonds` (t4) ; point du matin |
| 38 | Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable. | tenue (porte) ; raccord au logiciel de commandes : contrat d'interface | `cashd_verifier_commande` → demande `cashd.commande_hors_plafond` (t4) |
| 39 | Vos règles de communication et vos interdits sont repris dans chaque message. | tenue | formule, signature, interdits (t3) |
| 40 | Un compte qui se dégrade est signalé avant que le retard s'installe. | tenue | vue `cashd_delais_reglement.se_degrade` ; alerte au commercial et point du matin (c2_03) ; assertion `test_c2_04` (30 j de retard contre 5 d'habitude) |
| 41 | Un compte se met en pause, et il n'y revient que sur votre décision. | tenue | t3 |
| 42 | Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées. | tenue (avec les pièces que CASHD détient) | `cashd_dossier(…, 'assurance_credit')` (t4) ; les PDF des factures restent dans le facturier |
| 43 | Le dossier de recouvrement judiciaire est remis complet à qui vous désignez. | tenue | `cashd_remettre_dossier` : compte en recouvrement, relances coupées, envoi du récapitulatif par la file (t4) |

### Pilotage
| # | Ligne | État | Preuve |
|---|---|---|---|
| 44 | Le délai moyen de règlement se mesure compte par compte. | tenue | `cashd_delais_reglement` (t4 : 35 jours sur dix factures) |
| 45 | La prévision d'encaissement est établie à trente et à soixante jours. | tenue | `cashd_prevision` (t4) ; R |
| 46 | Chaque relance partie est datée et consignée, avec son objet et son destinataire. | tenue | `envois` du socle + journal ; R (« partie le… ») |
| 47 | Le taux de réponse aux relances se suit palier par palier. | tenue | vue `cashd_reponses` ; R (carte Pilotage) |
| 48 | Les créances en litige, en pause et en recouvrement sont comptées en continu. | tenue | `cashd_tableau.par_statut`, `factures_en_litige` (t4) |
| 49 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | tenue | à la demande : boutons « Tableur » (R) ; à date fixe : `cashd_arretes`, arrêté mensuel (t4) |
| 50 | Les seuils et les cadences se modifient, et chaque changement reste daté. | tenue | `cashd_historique_reglages` (t4) |

Bilan : 45 lignes tenues ; 3 à moitié (13 boîte de l'entreprise → A2 ; 17 autres langues ; 18 lecture
automatique d'une contestation) ; 2 attendent un tiers pour partir vraiment (26 LRE, 34 lien de paiement), leur côté
CASHD étant vert.

## Ce que Teo doit savoir (tiers)

1. **Lettre recommandée électronique (ligne 26)** : prestataire **AR24** (déjà au registre des fournisseurs du socle,
   non branché). Il faut un contrat AR24 et ses clés d'API ; A2 (expéditeur) le branche ; CASHD prépare déjà la mise en
   demeure en LRE au-delà du seuil réglé par l'organisation.
2. **Lien de paiement (ligne 34)** : le prestataire de paiement **de chaque organisation cliente** (Stripe, GoCardless,
   Qonto…) : il faut son compte (Stripe Connect par exemple) et un ouvrier qui crée le lien et reçoit le webhook ; le
   contrat d'interface est posé (`cashd_poser_lien`, `cashd_lien_paye`, réservés au serveur).
3. **Taux de change (ligne 35)** : aucun contrat ; les taux de référence de la BCE sont publics et gratuits ; il manque
   l'ouvrier qui les charge chaque jour (`cashd_poser_taux` côté serveur). En attendant, l'organisation saisit ses taux.
4. **Boîte de l'entreprise (ligne 13)** : dépend du branchement Gmail / Microsoft 365 d'A2 (OAuth de l'organisation).

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

- 06/10, 17 h 25 Z (coordinateur) : c2_02 et c2_03 reposés depuis 8b8fbb4 ; lot ^test_(c2_|c3_|…) 1120 ok, 0 not ok ; 44/46/51/55
  34 ok ; worker-c2 fusionnée dans main (7399f41), /espace/cashd 200 aux cinq largeurs. 45 lignes « tenues ». banc_cashd.sql
  inchangé depuis 6c29b77, à jouer.

- 06/10, soir : seconde demande de C3 : `private.cashd_contact_en_litige(p_client, p_adresse)` (serveur seul) — vrai si
  l'adresse (facturation ou commerciale, en minuscules) ou le téléphone (9 derniers chiffres) est celui d'un compte en
  litige ou portant une facture en litige, entière ou contestée en partie. REPUT ne répond jamais automatiquement à ce
  contact. Test c2_04 (42) vert.

- 06/10, soir : à la demande de C3 (REPUT, via le coordinateur), une facture soldée par lettrage publie l'événement du
  socle `cashd.facture_reglee` (facture, numero, compte, entite, regle_le, email, telephone, nom, particulier, langue ;
  clé `facture:<id>`) — REPUT s'y abonne pour la demande d'avis après règlement. Aucun module ne lit les tables de l'autre.
  Test c2_04 (40) vert avec et sans abonné.

- 06/10, soir : c2_01 → c2_03 POSÉS sur la recette (6c29b77) ; ^test_c2_ 3/4, 44/46/51 verts. Rouge : test_c2_03 « Préparations
  et coupures sont au journal ». Cause : sans réglage d'envoi cashd (banc_cashd pas encore posé), la relance passe
  « non_reglee » et sortait de la boucle avant sa ligne de journal. Reproduit en local, corrigé (journal juste après le dépôt
  de la demande, dans c2_02 et c2_03) ; 150/150 avec et sans réglage d'envoi.

- 06/10, nuit : **c2_01 refusé à la pose** par le coordinateur (modeles_jeux_coherent : une clé de jeu ne peut pas être
  une colonne facultative ; factures avait {nature, numero} avec nature facultative, règlements {date, montant,
  reference, facture_numero}). Corrigé : factures {numero}, règlements {date, montant, libelle} (libellé rendu attendu).
  Le socle réduit local porte désormais la même contrainte : l'ancien c2_01 y est refusé, le nouveau passe ; 150/150.
  garder_demande lu (SOCLE-EXTRAITS-ENVOIS, main) : une fonction SECURITY DEFINER passe en_attente → annulee. Ajout de
  `omega/recette-c2/banc_cashd.sql` (CASHD en essai sur le banc + reglages_envois cashd en essai, adresse d'essai).

- 06/10, nuit : palier 4, `c2_03_capacites.sql` + test `c2_04_capacites` (39) + écran (échéancier, contestation
  partielle, plafond proposé, dossier, prévision, pilotage, tableur). Défaut trouvé en local et corrigé : rejouer c2_01
  ou c2_02 après c2_03 échouait (vues étendues par c2_03 : « cannot drop columns from view ») → vues de c2_01 et c2_02
  posées dans un bloc qui garde la version plus récente. 150/150 sur pose neuve et rejeux ; recette 76/76.

- 06/10, nuit : palier 3, l'écran. Recette 67/67 (un défaut trouvé : après un geste, la liste se réordonnait et la
  fiche changeait de compte, l'avis « C'est fait » disparaissait → le geste fige le compte ouvert).

- 06/10, nuit : palier 2 écrit, `c2_02_moteur.sql`, test `c2_03_moteur` (42). Défaut trouvé en local et corrigé : quand
  le journal des encaissements arrive avant l'export des factures (ordre des travaux non garanti), le règlement restait
  sans lettrage → `private.cashd_relettrer` après chaque intégration. 111/111 sur trois passes.

- 06/10, soir : lecture (audit, promesses, socle commun, b2_02, b6_16, a4_15, b1_04, lecteur d'exports d'A1). Palier 1
  écrit : `c2_01_donnees.sql`, tests `c2_00_jeu`, `c2_01_donnees` (39), `c2_02_export` (30). Exécutés sur un Postgres 16
  local jetable avec un socle réduit (mêmes signatures que la photographie du 05/10) : 69/69. La migration se rejoue sans
  écart.
- 06/10, 18 h Z : rouge au rejeu de `test_c2_04` (n° 38, arrêté de la balance) après `banc_cashd.sql`. Cause : CASHD
  désormais installé pour de bon sur le banc, le cron `cashd-matin` y arrête la balance du mois courant ; le test
  attendait un arrêté le lundi suivant du même mois. Le test vise maintenant le premier jour ouvré du mois suivant.
  Même cause latente dans `test_c2_01` (« avant l'installation ») : il vise une organisation sans CASHD. Les quatre
  tests passent (154/154) sur base vierge comme avec CASHD installé, un arrêté et un passage du jour déjà posés.
