# DALIRO — inventaire de l'écran Chantiers avant refonte

Relevé du 29/10/2026 sur le worktree `refonte-metiers` (commencé sur 45c3aa89 ; HEAD est passé à 479f9d88
« l'aiguillage des repères », commité par une autre session pendant le relevé — pris en compte). Lecture seule. Ce
document est un **contrat** : tout ce qui est listé ici doit exister après le redécoupage en sous-pages.

**Conventions de chemin.** Sans dossier, un fichier est sous `components/espace/daliro/` (ex. `ChantierVue.tsx:330`).
`CV` = `ChantierVue.tsx`, `ED` = `EcranDaliro.tsx`. Les migrations sont sous `omega/modules/daliro/migrations/`
(ex. `b6_23:520` = `b6_23_appro_suite.sql`, ligne 520). Les rpc sont des fonctions `public.*` appelées par `portes.ts`.

**À savoir avant de lire.**
- `/espace2/daliro` (`app/espace2/daliro/page.tsx:12-17`) rend `EcranDaliro` dans `Habille`, comme `/espace/daliro`
  (`app/espace/daliro/page.tsx:19-21`). `proxy.ts:57-64` redirige `/espace/daliro` vers `/espace2/daliro` (307, query conservée sauf `ancien`).
- `portes.ts` cite des portes de b6_26 à b6_36 (`portes.ts:30-33`) dont les migrations **ne sont pas dans le dépôt**
  (le dossier `migrations/` s'arrête à `b6_25b`). Elles existent en base. Une redéfinition plus récente du point du matin
  pourrait donc y exister sans que le dépôt la montre.
- Le commit 479f9d88 ajoute `components/espace2/aiguillage.ts` : le point du matin envoie désormais une ligne
  `btp_chantiers` vers `/espace2/daliro?objet=btp_chantiers:<id>` (`aiguillage.ts:42,86`, `Point.tsx:50`). **L'écran
  DALIRO ne lit pas encore ce paramètre** (§ 1.3) ; `lireObjet` (`aiguillage.ts:135-139`) n'est appelé par aucune page.

---

## 1. Entrées

### 1.1 Liens écrits en base vers l'écran (point du matin)

Les lignes sont fabriquées par `private.btp_point_matin_lignes(p_client, p_jour)` et déposées par
`private.btp_deposer_points` (`b6_15:120-160`, cron `daliro-matin` toutes les 30 min dès 5 h, `b6_15:166`) dans la section
**« Chantiers : réceptions et retenues »** (`b6_15:131`), pour les rôles `gerant` et `valideur` (`b6_15:140`), au plus 50
lignes. La fonction a été redéfinie 7 fois (`create or replace`) ; **la version active est `b6_23:491-740`**. Toutes les
lignes portent `lien '/espace/daliro'`, `objet_type 'btp_chantiers'`, `objet_id` = id du chantier. Une même ligne SQL
peut porter plusieurs gabarits (CASE) : on compte ici les gabarits.

| # | fichier SQL:ligne | objet_type | objet désigné | Gabarit / sujet (gravité) | Où atterrir pour traiter |
|---|---|---|---|---|---|
| E01 | b6_23:520 | btp_chantiers | chantier de la situation | « <chantier> : situation n° N impayée depuis X jours, reste dû Y € (indemnité de 40 € due) : relancez » (critique ≥ 30 j, sinon attention) | B22 Situations, tableau des situations validées, colonne Paiement + « Noter un paiement » (`SituationsCarte.tsx:311-345`, `:336`) |
| E02 | b6_23:544 | btp_chantiers | chantier de l'avenant | « avenant n° N « objet » (X € HT) validé, pas encore signé : faites-le signer par le maître d'ouvrage avant d'exécuter (C. civ. art. 1793) » (critique si soumis depuis ≥ 14 j) | B20 Avenants, « Signer » / « Faire signer sur place » (`CV:566-567`) |
| E03 | b6_23:551 | btp_chantiers | chantier de l'avenant | « avenant n° N … en attente de validation depuis le … : décidez dans « À valider » » (attention ≥ 7 j, sinon info) | Le texte renvoie à « À valider » (`/espace2/validations`), le lien mène ici : B20, pastille « Dans « À valider » » (`CV:531`) |
| E04 | b6_23:558 | btp_chantiers | chantier de l'avenant | « avenant n° N … en préparation depuis le … : chiffrez-le et soumettez-le, ou abandonnez-le » (info) | B20, « Chiffrer une ligne », « Soumettre », « Abandonner » (`CV:561-563`) |
| E05 | b6_23:584 | btp_chantiers | chantier du passage | « « tâche » (intervenant) devait finir le … et n'est pas noté fait : notez-le fait ou recalez la suite (n passages en aval) » (attention s'il y a de l'aval) | B17 Planning, pastille « En retard » (`CV:489`), « Noter fait » / « Recaler » (`CV:496-497`) |
| E06 | b6_23:594 | btp_chantiers | `x->>'chantier_id'` du risque | Texte de `private.btp_risques_meteo` (`b6_21b:239`) : « <chantier>, <jour> JJ/MM : pluie X mm (seuil 5)… sur « tâche » (extérieur) — décalez ou protégez » (attention si ≤ J+2) | B16 Météo, avis de risque + « Échanger » (`MeteoCarte.tsx:155-170`) ; ou B17 « Recaler » |
| E07 | b6_23:624 (cas `commande_en_retard`) | btp_chantiers | chantier de la commande | « « objet » chez F devait être commandé avant le … — commandez aujourd'hui ou recalez le passage » (attention) | B19 Appro, « Noter commandée » (`ApproCarte.tsx:303`) |
| E08 | b6_23:624 (cas `a_commander_vite`) | btp_chantiers | idem | « commandez « objet » chez F avant le … (livraison avant le …) » (info) | B19, « Noter commandée » (`ApproCarte.tsx:303`) |
| E09 | b6_23:624 (cas `livraison_attendue`) | btp_chantiers | idem | « « objet » attendu le … chez F n'est pas noté reçu — relancez le fournisseur » (attention) | B19, « Noter reçue » (`ApproCarte.tsx:304`) |
| E10 | b6_23:624 (cas `livraison_tardive`) | btp_chantiers | idem | « « objet » promis le … par F, après le … où il le faut — relancez ou recalez » (attention) | B19, « Changer la date promise » (`ApproCarte.tsx:303`) ; ou B17 « Recaler » |
| E11 | b6_23:643 | btp_chantiers | chantier de la commande | « « objet » (F) devait repartir le … et reste sur le chantier — rendez-le, chaque jour se paie » (attention) | B19, pastille « À rendre » + « Noter rendu » (`ApproCarte.tsx:301`, `:305`, formule `retours`) |
| E12 | b6_23:652 | btp_chantiers | chantier de la commande | « « objet » chez F — il manque Q u au bon de livraison : relancez » (attention si date dépassée, sinon info) | B19, colonne Livraison, pastille « manque … » (`ApproCarte.tsx:298-299`) + « Noter reçue » (`:304`) |
| E13 | b6_23:672 | btp_chantiers | chantier de la réception | « <chantier> : retenue de garantie de X € due (depuis) le … : réclamez-la » (attention si due, sinon info) | B24 Réception, bloc retenue (`ReceptionCarte.tsx:222-233`) |
| E14 | b6_23:688 | btp_chantiers | chantier de la réception | « <chantier> : décompte final à envoyer avant/depuis le … » (attention à J+30, sinon info) | B24, bloc décompte (`ReceptionCarte.tsx:235-252`) |
| E15 | b6_23:708 | btp_chantiers | chantier de la réception | « <chantier> : N réserves encore ouvertes depuis la réception du … » (attention à J+60) | B24, liste des réserves, « Lever la réserve » / « Hors devis » (`ReceptionCarte.tsx:206-220`) |
| E16 | b6_23:730 | btp_chantiers | chantier (`r.id`) | « <chantier> : travaux facturés à 100 % par les situations — prononcez la réception » (attention) | B24, « Prononcer la réception » (`ReceptionCarte.tsx:97`) |
| E17 | b6_23:736 | btp_chantiers | chantier (`r.id`) | « <chantier> : fin prévue le … dépassée — réception à prononcer ou planning à recaler » (info) | B24 « Prononcer la réception » ; B17 « Recaler » ; B11 ligne Dates (`CV:342`) |

**Versions remplacées** (mêmes gabarits, rien n'a été retiré d'une version à la suivante) :
b6_15 : 49, 65, 85, 107, 113 · b6_16 : 238, 257, 273, 293, 315, 321 · b6_18 : 44, 68, 75, 82, 102, 118, 138, 160, 166 ·
b6_19 : 245, 269, 276, 283, 309, 328, 344, 364, 386, 392 · b6_21 : 328, 352, 359, 366, 392, 402, 421, 437, 457, 479, 485 ·
b6_22 : 385, 409, 416, 423, 449, 459, 489, 508, 524, 544, 566, 572. Les tests `omega/tests/daliro/b6_09_point_matin.sql:52`
et `b6_12_relance_avenants.sql:46` vérifient que chaque ligne mène à `/espace/daliro` avec son chantier.

**Constat clé :** l'écran ne lit pas `objet_id`. Depuis 479f9d88 l'adresse porte `?objet=btp_chantiers:<id>` (espace2),
mais l'écran ouvre toujours le **premier chantier de la liste triée** (`ED:137`), pas le chantier de la ligne ; l'ancien
point du matin (`PointDuMatin.tsx:243-246`) envoie `/espace/daliro` nu.

### 1.2 Alertes levées pour DALIRO (sans lien)

`private.lever_alerte_module` écrit dans `public.alertes` sans champ lien (signature : `omega/tests/filed/souche_locale/02_fonctions.sql:61-66`).
**Aucun écran du dépôt ne lit `public.alertes`** (la cloche d'espace2 calcule ses alertes à part, `components/espace2/Coquille.tsx:116-133`).

| # | fichier SQL:ligne | module | Sujet | detail (objet) | Endroit de l'écran concerné |
|---|---|---|---|---|---|
| A01 | b6_02:187 | daliro_referentiel | « X n'a pas confirmé son passage du JJ/MM sur <chantier> » | passage, chantier, tiers, remplaçants | B17 Planning, « Remplaçants » (`CV:495`) |
| A02 | b6_02:252 | daliro_referentiel | « X a décliné son passage du JJ/MM sur <chantier> » | passage, chantier, remplaçants | B17, « Remplaçants » |
| A03 | b6_02:280 · b6_08:273 · b6_13:476 | daliro_referentiel | « La demande des confirmations à J-2 a échoué » (critique) | erreur | aucun |
| A04 | b6_07:126 | daliro_referentiel | « Réponse à vérifier : … réponse d'une autre adresse que … » | passage, chantier, réception | B17, « Noter la réponse » (`CV:494`) |
| A05 | b6_07:136 | daliro_referentiel | « X a répondu sur son passage du … : à lire » | passage, chantier | B17, « Noter la réponse » |
| A06 | b6_07:149 | daliro_referentiel | « La réponse de X … n'a pas pu être notée » | passage, chantier | B17 |
| A07 | b6_08:181 | daliro_referentiel | « L'accord permanent des confirmations J-2 prend fin le … : renouvelez-le » | politique | B04, « Renouveler l'accord » (`AccordJ2.tsx:143-146`) |
| A08 | b6_13:424 | daliro_referentiel | « <chantier> : le décompte final est à envoyer avant le … » | réception, chantier | B24 décompte |
| A09 | b6_13:432 | daliro_referentiel | « <chantier> : la retenue de garantie (…) est due depuis le …, réclamez-la » | réception, chantier | B24 retenue |
| A10 | b6_13:441 | daliro_referentiel | « <chantier> : N réserve(s) encore ouverte(s) deux mois après la réception » | réception, chantier | B24 réserves |
| A11 | b6_15:151 | daliro_referentiel | « Le point du matin des chantiers n'a pas pu être déposé. » | erreur | aucun |
| A12 | b6_21:123 · b6_21b:110 | daliro_meteo | « La prévision météo n'a pas pu être demandée. » | chantier | B16 |
| A13 | b6_21:255 | daliro_meteo | « Météo — <texte du risque> » (attention ≤ J+2) | chantier, passage, jour | B16 |
| A14 | b6_24b:182 | daliro_terrain | « <chantier> : <problème> (signalé par X) » | chantier, message | B21 Fil du chantier |

### 1.3 Paramètres d'adresse lus par l'écran

| Source | Lu ? | Preuve |
|---|---|---|
| `URLSearchParams` / `useSearchParams` / `searchParams` | **Non**, nulle part dans `components/espace/daliro/`, `app/espace/daliro/`, `app/espace2/daliro/` | grep vide |
| `location.hash` | Non | grep vide |
| Choix du chantier | État local `choix` (`ED:80`), défaut = premier visible (`ED:137`) | — |
| `/signer/[jeton]` | Paramètre de chemin `jeton` (`app/signer/[jeton]/page.tsx:21-22`) ; `jeton === "exemple"` = démonstration (`SignatureSurPlace.tsx:55`) | page à part (P01) |
| Contrat posé par 479f9d88 | `components/espace2/aiguillage.ts:86` envoie `btp_chantiers` vers `/espace2/daliro?objet=btp_chantiers:<id>` ; `aiguillage.ts:135-139` (`lireObjet`) sait le lire. **L'écran ne l'appelle pas** : le paramètre arrive et est ignoré | `aiguillage.ts:18-20` (« la page racine … accepte ?objet= ») |

### 1.4 Autres écrans qui mènent ici

| # | Fichier:ligne | Comment |
|---|---|---|
| R01 | `components/espace/ecrans.ts:14` | Onglet « Chantiers » de l'ancien espace → `/espace/daliro` |
| R02 | `components/espace2/modules.ts:102` (+ `:48-57`) | Module DALIRO « Chantiers », onglet unique « Vue d'ensemble » → `/espace2/daliro` ; ancien design `/espace/daliro?ancien=1` |
| R03 | `components/espace2/modules.ts:120-124` + `Coquille.tsx:399,442` | Module métier montré dans la barre : démo sans compte et secteur `btp` → daliro |
| R04 | `components/espace2/Coquille.tsx:223,280` · `Palette.tsx:56` | Listes « tous les modules » |
| R05 | `components/espace2/Point.tsx:50,250-262,335-348` + `aiguillage.ts:115-128` | Point du matin espace2 : `aiguiller` envoie la ligne vers `/espace2/daliro?objet=btp_chantiers:<id>`, bouton « Examiner/Ouvrir » |
| R06 | `components/espace/point/PointDuMatin.tsx:243-246` | Ancien point du matin, bouton « Ouvrir » |
| R07 | `proxy.ts:57-64` | Redirection 307 `/espace/daliro` → `/espace2/daliro` |
| R08 | `components/espace2/DetailDemande.tsx` (479f9d88, lien « Ouvrir dans Daliro ») | Détail d'une demande « À valider » hors FILED → `aiguiller` → règle de l'objet, sinon `/espace2/daliro` (§ 1.5) |

### 1.5 Demandes « À valider » écrites par DALIRO (objets qui reviennent vers l'écran)

| # | fichier SQL:ligne | objet_type | objet | Sujet de la demande | Page atteinte aujourd'hui (`aiguillage.ts`) | Endroit de l'écran pour la suite |
|---|---|---|---|---|---|---|
| D01 | b6_01:478-484 | `btp_avenant` | avenant | `daliro.signer_avenant` « Avenant n° N — <chantier> : objet », montant, lignes | Pas de règle → `/espace2/daliro` (module) | B20 « Signer » / « Faire signer sur place » |
| D02 | b6_12:355-356 | `btp_situation` | situation | `daliro.valider_situation` | Pas de règle → `/espace2/daliro` | B22 « Valider la situation » |
| D03 | b6_06:99 | `btp_passages` | passage | Envoi de la demande de confirmation J-2 (`private.preparer_envoi`), en attente tant qu'il n'y a pas d'accord permanent | Pas de règle → `/espace2/daliro` | B17 colonne Confirmation (état « Demande à valider », `etats.ts:142`), B04 |

Ces trois types ne sont pas dans `REGLES` (`aiguillage.ts:65-116` au commit 479f9d88) : la refonte devra leur donner une cible (avenant,
situation, passage), sinon ils atterrissent sur le premier chantier.

Sorties de l'écran : le lien de signature `/signer/<jeton>` (`SignatureLienDialog.tsx:54`), les URL signées des médias
(`app/espace/daliro/actions.ts:18-34`), le relevé imprimable en Blob (`ReleveDialog.tsx:17-22`), la mention « À valider »
dans les textes (pas de lien cliquable vers `/validations` sur l'écran).

---

## 2. Blocs

Emplacements : **Haut** (au-dessus de la grille), **Liste** (colonne gauche), **Dossier** (colonne droite,
`ED:319-327`, `ChantierVue`), **Fenêtre** (Dialog), **Page** (hors écran). Source « tableau » = `chargerTableau`
(`portes.ts:61`) → rpc `btp_tableau_chantier` (dernière définition `b6_16:329`).

### 2.1 Haut de page et liste

| N° | Titre affiché | Composant fichier:ligne | Empl. | Données affichées | Source | Condition d'affichage |
|---|---|---|---|---|---|---|
| B01 | « Chantiers » + sous-titre (promesse) + « Nouveau chantier » + ruban source | `ED:234-245` | Haut | Titre, phrase de promesse (`ED:238`), bouton, ruban « Données d'exemple / Base réelle » (`../ui.tsx:57-64`) | — | Toujours |
| B02 | Avis « C'est fait. » (création) | `ED:247` | Haut | Message après création | état local | Après G01 |
| B03 | Compteurs-filtres : Bloqués · Avenants à signer · Passages à confirmer · Chantiers ouverts (x / quota) | `ED:249-257` | Haut | 4 compteurs cliquables (`aria-pressed`) | liste (`chargerListe`, `portes.ts:56` → `btp_liste_chantiers`, `b6_04:56`) ; quota = `reglages.quota_chantiers` du 1er tableau chargé (`ED:230`) | Toujours |
| B04 | « Accord permanent des confirmations J-2 » | `AccordJ2.tsx:118-177` (monté `ED:259`) | Haut | État (aucun / à valider / actif / partiel / révoqué), dates, auteur, demandes du mois, fin proche | `btp_accord_j2` (`portes.ts:150`) → `public.politiques` | Rôle `gerant` ou `admin` en réel ; toujours en exemple (`AccordJ2.tsx:52,70`) |
| B05 | « Messages du terrain à ranger (N) » | `ARangerCarte.tsx:71-104` (monté `ED:260`) | Haut | Expéditeur, texte, date, pièces ; sélecteur de chantier ouvert | `btp_messages_a_ranger` (`portes.ts:305`) → `btp_messages` | Masqué s'il n'y a rien à ranger (`ARangerCarte.tsx:56`) |
| B06 | « Point du mois — travaux repérés, signés, facturés » | `PointMensuelCarte.tsx:90-130` (monté `ED:261-262`) | Haut | Totaux du mois + tableau par chantier (repérés, signés, à relancer, signé/facturé, reste à facturer, perdus) ; bascule Mois dernier / Ce mois | `btp_point_mensuel` (`portes.ts:323`) ; exemple `pointExemple` (`:29-63`) | Masqué sans `voit_prix` ou sans client réel (`:88`) ; texte de formule si `point_mensuel` fermé (`:99`) |
| B07 | Avis « La base réelle n'a pas répondu. » | `ED:264-268` | Haut | Erreur de lecture | — | Sur erreur |
| B08 | Liste « Tous les chantiers » / nom du filtre + « N chantiers » | `ED:271-317` | Liste | Par chantier : nom, statut, nb bloquants, nb avenants en cours, % avancement, commune (CP), MO, lot de l'étape, nb lots, marché vérifié/à vérifier, prochain passage + intervenant + confirmation (`ED:296-310`) ; états chargement / vide (`ED:276-280`) | `btp_liste_chantiers` | Toujours |
| B09 | Dossier vide « Choisissez un chantier » / « Lecture du chantier… » | `ED:322-326` | Dossier | Placeholder | — | Sans tableau chargé |

### 2.2 Dossier du chantier (ordre d'affichage)

| N° | Titre affiché | Composant fichier:ligne | Données affichées | Source | Condition d'affichage |
|---|---|---|---|---|---|
| B10 | Avis « C'est fait. » / erreur du dossier | `CV:326-327` | Résultat de la dernière action du dossier | état local | Après une action |
| B11 | En-tête : nom du chantier, réf., adresse, statut, « Marché vérifié / à vérifier », « Relevé du chantier » ; Maître d'ouvrage, Notre place, TVA, Dates, Étape, Avancement ; boutons statut, « Ouvrir un avenant », « Rattacher une facture » | `CV:330-353` | Champs du chantier, étape (`btp_chantiers_etape`) | tableau | Toujours ; boutons selon statut (`CV:347-350`) |
| B12 | « Contrôles — N bloquant(s), N à voir » + « Voir les N contrôle(s) de l'organisation (annuaire, vigilance) » | `CV:356-378` | Contrôles du chantier triés par gravité, famille (`etats.ts:100-107`) ; contrôles d'organisation dépliables (`CV:367-377`) | tableau (`controles`, `controles_organisation`, vue `btp_controle`) | Toujours ; orga si présents |
| B13 | « Lots et déboursé — engagé au marché et par avenants signés, facturé, reste » | `CV:381-404` | Lot, corps d'état, exécutant, pastille d'acceptation du sous-traitant, état ; Marché HT, Avenants, Facturé (nb), Reste | tableau (`lots`, `debourse`, `acceptations` via `lot.acceptation`) | Montants si `voit_prix` (`CV:386,395,403`) ; avis si aucun lot (`CV:402`) |
| B14 | « Marché <réf.> » + pastille « Vérifié, figé / À vérifier ligne à ligne » | `CV:407-462` | Objet, mode de prix, date de signature, total vs devis, vérifié le/par, retenue ; contrôles du marché (`CV:428-432`) ; lignes (N°, désignation, lot, qté, unité, PU, montant, contrôle, motif d'écart) ; « N autre(s) marché(s) » (`CV:459`) | tableau (`marches`, `btp_lignes_marche_chiffrees`, `btp_controle_marches`) | Toujours ; boutons selon statut du marché (`CV:411-417`) ; prix si `voit_prix` |
| B15 | « Questions sur le chantier » | `QuestionsCarte.tsx:109-160` (monté `CV:465`) | 3 questions proposées, champ libre, réponses (statut, sources lues, « À vérifier ») | `btp_questions_du_chantier` (`portes.ts:378`), relu toutes les 5 s si une question attend (`:87-91`) | Fonction `questions` de la formule (`:74,114`) |
| B16 | « Météo des 7 jours — passages extérieurs » | `MeteoCarte.tsx:130-178` (monté `CV:468`) | Prévision 7 j (pluie, rafales ou vent, températures), risques par passage, « Nouvel ordre proposé pour la semaine » + « Échanger », source MET Norway | `btp_meteo_chantier` (`portes.ts:259`) → `btp_meteo` ; `btp_ordre_meteo` (`portes.ts:367`) | Chantier ouvert ou suspendu (`:128`) ; messages si non localisé / formule fermée / pas de prévision (`:136-138`) |
| B17 | « Planning — passages à venir et confirmation à J-2 » + « Proposer les dépendances » | `CV:471-505` | Dates, extérieur, tâche, fait / En retard, lot, qui (À ranger, « lu … »), confirmation + dernière réponse + état de l'envoi (`etats.ts:137-145`) ; actions par ligne | tableau (`passages`, `btp_confirmations`, envoi) | Avis si aucun passage (`CV:505`) ; actions selon statut, formule (`remplacants`, `ordre_lots`) et date (`CV:494-497`) |
| B18 | « Dépendances — N à confirmer » | `CV:506-515` | Amont avant aval, délai, origine (gabarit / import / main), confirmée | tableau (`dependances`) | S'il y a des dépendances |
| B19 | « Approvisionnement — N commandes, N à surveiller » | `ApproCarte.tsx:266-313` (monté `CV:519`) | Quoi (qté, du devis, à rendre/rendu), fournisseur (délai, réf.), pour (passage, besoin le), commander avant, livraison (reçue/promise, à livrer le, reçu x sur y, manque/trop, bons), état (`ApproCarte.tsx:33-44`) | `btp_appro_chantier` (`portes.ts:265`) → `btp_commandes`, `btp_livraisons` | Toujours ; boutons si chantier en préparation/ouvert/suspendu (`:261`) ; liste si devis vérifié + formule `liste_cadencee` (`:273`) |
| B20 | « Travaux supplémentaires — N avenant(s), N signé(s) » | `CV:522-576` (+ `ChiffrageLu.tsx:24-45` à `CV:536`) | Par avenant : n°, statut, état de la validation, montant HT, objet, origine (canal, auteur, date, texte), chiffrage lu par Daliro, lignes (désignation, moins-value, lot, qté, unité, PU, montant, prix bibliothèque/saisi), signé le / par / sur place, motif | tableau (`avenants`, `btp_avenants_lignes_chiffrees`, `demandes_validation.statut`) | Toujours ; montants si `voit_prix` ; actions selon statut (`CV:560-570`) |
| B21 | « Fil du chantier — photos, vocaux et messages du terrain (N) » | `FilCarte.tsx:148-207` (monté `CV:579`) | Expéditeur, texte, photos/vocaux (URL signée 10 min), transcription, « Lu : » résumé, demandes lues (nature, quantité, vérifié / à confirmer), date, canal, mode de rangement, « Avenant ouvert » | `btp_fil_chantier` (`portes.ts:300`, 50 messages) → `btp_messages` ; médias `urlSigneeMedia` (`app/espace/daliro/actions.ts:18`) | Toujours (texte vide sinon `:207`) ; seulement les messages `range` (`:117`) |
| B22 | « Situations de travaux — N validée(s), X nets » | `SituationsCarte.tsx:218-345` (monté `CV:582`) | Situation en cours (lignes : base HT, précédent, cumul saisi, période), « Lu dans les photos du chantier » (propositions + non rattachés, `:270-291`), totaux (cumul, précédent, période, TVA, retenue, net), mentions ; tableau des validées (période, TVA, retenue, net, validée, échéance, encaissé, état de paiement, indemnité 40 €) | tableau (`situations`, `btp_situations_lignes`, `btp_situations_paiements`) ; `btp_avancement_photos` (`portes.ts:180`) | `voit_prix` sinon texte (`:77-84`) ; « Nouvelle situation » si marché vérifié, aucune en cours, chantier ouvert/suspendu/réceptionné (`:226`) |
| B23 | « Heures et rentabilité — X pointées » + « Rentabilité à date » | `HeuresCarte.tsx:183-307` (monté `CV:585`) | Semaine (navigation, lot pointé), grille intervenant × jour, autres lots, totaux ; alertes Code du travail ; rentabilité : vendu, facturé, main-d'œuvre, achats, marge (+ taux), heures sans coût, par lot | `btp_heures_chantier` (`portes.ts:213`) → `btp_pointages`, `btp_couts_horaires` | Pointage fermé si chantier en préparation/annulé (`:77,205`) ; rentabilité et « Coût horaire » si `voit_prix` (`:194,273,307`) |
| B24 | « Réception des travaux — pas encore prononcée / prononcée le … » | `ReceptionCarte.tsx:84-284` (monté `CV:588`) | Réserves (ouverte/levée, avenant hors devis), retenue (due le, à réclamer, opposée, libérée), décompte final (statut, marché+avenants, facturé, reste, retenues, motif de contestation) | tableau (`reception` → `btp_receptions`, `btp_reserves`) | Masqué sauf réception existante ou chantier ouvert/suspendu/réceptionné/clos (`:58`) ; « Prononcer » si `voit_prix` (`:97`) |
| B25 | « Factures fournisseurs rattachées — N » | `CV:591-613` | Document, n°, fournisseur, SIREN, lot, émise le, HT, état FILED | tableau (`factures` → `btp_factures_chantier` + `filed_factures`) | Toujours ; HT si `voit_prix` |
| B26 | « Annuaire — N tiers · Bibliothèque — N prix validé(s) » + « Poser un prix » | `CV:616-645` | Tiers (rôles, commune, tél., courriel, vigilance) ; bibliothèque (désignation, unité, PU, origine, date, statut validé/proposé) | tableau (`tiers` → `btp_tiers`, `bibliotheque` → `btp_bibliotheque_chiffree`) | Toujours ; PU si `voit_prix` |
| B27 | « Disponibilités des sous-traitants, du … au … » (30 jours) | `DisponibilitesBloc.tsx:73-105` (monté `CV:626`, dans B26) | Par sous-traitant : passages prévus (tous chantiers), absences, « libre sur la période » ; formulaire inline d'absence (`:88-100`) | `btp_disponibilites` (`portes.ts:328`) | Masqué en exemple sans sous-traitant (`:72`) ; rpc réservée gérant/admin/valideur (`portes.ts:327`) |

### 2.3 Fenêtres

| N° | Titre affiché | Composant fichier:ligne | Ouverte depuis | Données affichées / saisies | Source |
|---|---|---|---|---|---|
| F01 | « Nouveau chantier » | `ED:330-381` | B01 | Nom*, réf., CP*, commune*, adresse, type de MO, notre place, qui signe (tiers MO) | tiers du 1er tableau chargé (`ED:179`) |
| F02 | « Révoquer l'accord permanent » | `AccordJ2.tsx:158-176` | B04 | Motif | — |
| F03 | « Ouvrir / Suspendre le chantier / Changer le statut » | `CV:823-829` | B11 | Texte de conséquence | — |
| F04 | « Ouvrir un avenant » | `CV:744-755` | B11 | Objet*, origine (vocal/photo/visite/courriel/autre), de qui, ce qui a été dit | — |
| F05 | « Rattacher une facture au chantier » | `CV:793-804` | B11 | Facture FILED non rattachée, lot, note | `chargerFacturesCandidates` (`portes.ts:77-92`) → tables `filed_factures`, `filed_fournisseurs` |
| F06 | « Relevé du chantier <nom> » | `ReleveDialog.tsx:23-52` (`CV:718`) | B11 | Sections Le marché, Les travaux en plus, La facturation, Le planning, À reprendre (`releve.ts:39-82`) ; « Imprimer ou enregistrer en PDF » | calcul local sur le tableau |
| F07 | « Saisir le marché signé » | `CV:678-689` | B14 | Référence, signé le, objet, mode de prix, total HT du devis | — |
| F08 | « Ajouter une ligne au marché » | `CV:664-677` | B14 | N°, nature, désignation*, lot, quantité, unité, PU, montant | — |
| F09 | « Importer le devis » | `ImportDevisDialog.tsx:128-201` (`CV:719-728`) | B14 | Tableau collé, CSV, ou PDF lu par Daliro ; aperçu 8 lignes, lots inconnus, refus de la base | `devis.ts` (lecture locale) ; `btp_devis_lu` (`portes.ts:359`) relu toutes les 4 s, 45 fois (`:61-74`) |
| F10 | « Vérifier le marché » | `CV:690-696` | B14 | Nb lignes, total | — |
| F11 | « Rouvrir le marché » | `CV:697-703` | B14 | Motif* (texte « Réservé au gérant ») | — |
| F12 | « Rattacher la ligne N à un lot » | `CV:657-663` | B14 | Lot | — |
| F13 | « Accepter l'écart de la ligne N » | `CV:650-656` | B14 | Calcul q × PU vs devis, motif* | — |
| F14 | « Noter la réponse de … » | `CV:704-714` | B17 | Confirme / décline, ce qu'il a dit | — |
| F15 | « Remplaçants possibles » | `CV:733-743` | B17 | Sous-traitants libres (tél., courriel, canal, vigilance, hors département) — **lecture seule** | `btp_proposer_remplacants` (`portes.ts:119`) |
| F16 | « Recaler « tâche » » | `RecalageDialog.tsx:116-173` (`CV:729-732`) | B17 | Nouvelle fin*, motif, aperçu des passages déplacés (après/avant/qui/à reconfirmer), dernier passage vs fin prévue | `btp_proposer_recalage` (`portes.ts:231`) |
| F17 | « Noter « tâche » fait » | `RecalageDialog.tsx:93-113` | B17 | Fini le | — |
| F18 | Appro : « Nouvelle commande » / « Commandé : … » / « Reçu : … » / « Rendu : … » / « Annuler : … » | `ApproCarte.tsx:315-377` | B19 | Quoi, qté, délai, fournisseur (annuaire ou en clair), à rendre, passage ou date de besoin ; commandé le, livraison promise, n° ; reçu le, qté ou complète/partielle, n° du bon, note ; rendu le ; motif | fournisseurs de `btp_appro_chantier` |
| F19 | « Chiffrer une ligne de l'avenant n° N » | `CV:756-771` | B20 | Prix bibliothèque ou saisi, désignation, unité, PU, quantité, sens (plus/moins-value), lot | — |
| F20 | « Soumettre l'avenant n° N à la signature » | `CV:772-778` | B20 | Montant, règle des deux personnes | — |
| F21 | « Signer l'avenant n° N » | `CV:779-785` | B20 | Signé le | — |
| F22 | « Faire signer l'avenant n° N sur place » | `SignatureLienDialog.tsx:106-147` (`CV:715-717`) | B20 | Validité 24 h / 72 h / 7 j ; lien, expiration, « Copier le lien » | — |
| F23 | « Preuve de signature — avenant n° N » | `SignatureLienDialog.tsx:75-104` | B20 | Signataire, qualité, date, appareil, 3 empreintes, image du tracé | `btp_preuve_signature` (`portes.ts:254`) |
| F24 | « Abandonner l'avenant n° N » | `CV:786-792` | B20 | Motif* | — |
| F25 | « Ouvrir un avenant depuis ce message » | `FilCarte.tsx:209-228` | B21 | Ce qui est demandé en plus* (pré-rempli) | — |
| F26 | « Nouvelle situation de travaux » | `SituationsCarte.tsx:347-376` | B22 | Fin de période*, taux de TVA (si régime normal) | — |
| F27 | « Paiement reçu — situation n° N » | `SituationsCarte.tsx:378-405` | B22 | Montant*, reçu le, référence | — |
| F28 | « Annuler la situation n° N » | `SituationsCarte.tsx:407-426` | B22 | Motif | — |
| F29 | « Pointer une équipe » | `HeuresCarte.tsx:309-338` | B23 | Équipe, jour, heures chacun | — |
| F30 | « Coût horaire chargé » | `HeuresCarte.tsx:340-370` | B23 | Pour (entreprise ou intervenant), €/h*, depuis le | — |
| F31 | « Prononcer la réception » | `ReceptionCarte.tsx:101-123` | B24 | Date du PV*, réserves (une par ligne) | — |
| F32 | « Opposition du maître d'ouvrage » / « Retenue libérée / Caution levée » / « Décompte contesté » | `ReceptionCarte.tsx:254-284` | B24 | Date, motif*, accord de libération anticipée | — |
| F33 | « Détacher la facture du chantier » | `CV:805-811` | B25 | Motif* | — |
| F34 | « Poser un prix dans la bibliothèque » | `CV:812-822` | B26 | Désignation*, unité, PU* | — |

### 2.4 Page hors écran

| N° | Titre | Composant | Données | Source | Condition |
|---|---|---|---|---|---|
| P01 | « Avenant n° N — <chantier> » (signature sans compte) | `app/signer/[jeton]/page.tsx:21-32` → `SignatureSurPlace.tsx:54-243` | Entreprise, MO, adresse, objet, lignes, total HT, TVA, expiration ; nom, qualité, tracé, « Lu et approuvé » | `btp_lire_a_signer` (`SignatureSurPlace.tsx:70`) | Jeton valide ; `exemple` = démonstration sans écriture |

---

## 3. Gestes (tout ce qui écrit ou envoie)

« Après » : en base réelle, `agir` appelle la porte puis relit (`CV:124-142` → `relireReel` `ED:168-171` : liste +
tableau). En exemple : 250 ms puis modification en mémoire (`onLocal`). Il n'y a **pas de toast** : le retour est un
`Avis` vert « C'est fait. » ou rouge dans la carte concernée. Rôle : la base tranche toujours ; la colonne dit ce que
l'écran montre ou annonce.

| # | Libellé | Bloc | Déclencheur fichier:ligne | Fonction → rpc / table | Fenêtre | Rôle / condition | Après |
|---|---|---|---|---|---|---|---|
| G01 | Créer le chantier | B01 | `ED:378` (logique `:186-228`) | INSERT direct `btp_chantiers` (`ED:194-198`) | F01 | Bureau (politique RLS) ; CP 5 chiffres + commune + nom (`ED:185`) | `charger()` + sélection du nouveau chantier + Avis (`ED:200-221`) |
| G02 | Donner l'accord permanent / Renouveler l'accord | B04 | `AccordJ2.tsx:144` (`:72-83`) | `donnerAccordJ2` → `btp_donner_accord_j2` (`portes.ts:153`) | non | gérant / admin ; aucun, révoqué, ou fin < 30 j | État de l'accord remplacé |
| G03 | Activer moi-même (vous êtes le seul décideur) | B04 | `AccordJ2.tsx:149` (`:85-96`) | `btp_activer_accord_j2_seul` (`portes.ts:159`) | non | Accord à valider + seul décideur | idem ; relit sur erreur |
| G04 | Révoquer → Révoquer l'accord | B04 | `AccordJ2.tsx:154`, `:173` (`:98-111`) | `btp_revoquer_accord_j2` (`portes.ts:156`) | F02 | Accord actif / partiel / à valider | idem |
| G05 | Ranger | B05 | `ARangerCarte.tsx:94-95` | `btp_ranger_message` (`portes.ts:310`) | non (sélecteur inline) | Chantier choisi | relit la file + la liste (`:62`) |
| G06 | Écarter (message à ranger) | B05 | `ARangerCarte.tsx:96-97` | `btp_ecarter_message` (`portes.ts:314`), motif null | non | — | idem |
| G07 | Ouvrir le chantier / Suspendre / Reprendre → Confirmer | B11 | `CV:347-349`, `:827` (`:315-319`) | `changerStatutChantier` → UPDATE direct `btp_chantiers.statut` (`portes.ts:132-136`) | F03 | Ouvrir : MO désigné (sauf sous-traitant), quota de formule | relecture ; message selon statut |
| G08 | Ouvrir un avenant → Ouvrir l'avenant | B11 | `CV:350`, `:753` (`:244-248`) | `btp_ouvrir_avenant` (`portes.ts:109`) | F04 | Chantier ouvert ou suspendu | relecture |
| G09 | Rattacher une facture → Rattacher | B11 / B25 | `CV:351`, `:802` (`:286-299`) | `btp_rattacher_facture` (`portes.ts:122`) | F05 | Fournisseur = tiers du lot (SIREN) | relecture, déboursé à jour |
| G10 | Saisir le marché | B14 | `CV:411`, `:687` (`:203-210`) | `btp_ecrire_marche` (`portes.ts:95`) | F07 | Aucun marché | relecture |
| G11 | Ajouter une ligne → Ajouter la ligne | B14 | `CV:413`, `:675` (`:184-202`) | `btp_ecrire_ligne` (`portes.ts:96`) | F08 | Marché à vérifier | relecture |
| G12 | Déposer le devis PDF (champ « Ou le devis en PDF ») | B14 | `ImportDevisDialog.tsx:148` (`:76-82`) | `deposerDevis` : upload Storage `omega-clients/<client>/btp_marche/<marche>/…` + `btp_deposer_devis` (`portes.ts:348-358`) | F09 | Réel seulement (`:78`) | Lecture relue toutes les 4 s (`btp_devis_lu`) |
| G13 | Importer N lignes | B14 | `ImportDevisDialog.tsx:196` (`:94-126`) | `btp_importer_lignes` (`portes.ts:98`) | F09 | Marché à vérifier | `relire` + Avis ; fenêtre gardée ouverte si refus |
| G14 | Vérifier le marché → Vérifier et figer | B14 | `CV:415`, `:694` (`:211-223`) | `btp_verifier_marche` (`portes.ts:101`) | F10 | Aucun contrôle bloquant (`CV:415`) | relecture ; prix proposés à la bibliothèque |
| G15 | Rouvrir (gérant) → Rouvrir | B14 | `CV:417`, `:701` (`:224-228`) | `btp_rouvrir_marche` (`portes.ts:102`) | F11 | Gérant (annoncé) ; motif ≥ 3 car. | relecture |
| G16 | Rattacher à un lot → Rattacher | B14 | `CV:443`, `:661` (`:175-183`) | `btp_ecrire_ligne` avec `lot_id` | F12 | Ligne sans lot, marché à vérifier | relecture |
| G17 | Accepter l'écart avec un motif → Accepter l'écart | B14 | `CV:449`, `:654` (`:166-174`) | `btp_accepter_ecart` (`portes.ts:100`) | F13 | Ligne `montant_faux`, marché à vérifier | relecture |
| G18 | Questions proposées (×3) / Demander | B15 | `QuestionsCarte.tsx:121`, `:128` (`:93-107`) | `btp_poser_question` (`portes.ts:375`) | non | Formule `questions` ; ≥ 3 car. | relit la liste, puis toutes les 5 s |
| G19 | Échanger | B16 | `MeteoCarte.tsx:165` (`:116-127`) | `btp_echanger_passages` (`portes.ts:370`), motif « Pluie annoncée » | non | Proposition présente | relit tableau + météo, Avis |
| G20 | Proposer les dépendances | B17 | `CV:475` (`:239-243`) | `btp_proposer_dependances` (`portes.ts:106`) | non | Au moins un passage | relecture |
| G21 | confirmer (dépendance) | B18 | `CV:511` (`:234-238`) | UPDATE direct `btp_dependances.confirmee` (`portes.ts:126-130`) | non | Dépendance non confirmée | relecture |
| G22 | Noter la réponse → Noter | B17 | `CV:494`, `:712` (`:229-233`) | `btp_repondre_confirmation` (`portes.ts:118`), canal téléphone | F14 | Passage d'un tiers, prévu, J-2 demandé non confirmé | relecture ; décliné → remplaçants + conducteur prévenu |
| G23 | Recaler → Voir ce qui bouge → Recaler N passages | B17 | `CV:496` ; `RecalageDialog.tsx:170`, `:168` (`:48-73`) | aperçu `btp_proposer_recalage` puis `btp_recaler` (`portes.ts:235`) | F16 | Formule `ordre_lots`, chantier ouvert/suspendu, passage prévu | relecture ; reconfirmation J-2 |
| G24 | Noter fait | B17 | `CV:497` ; `RecalageDialog.tsx:110` (`:75-84`) | `btp_terminer_passage` (`portes.ts:239`) | F17 | Chantier ouvert/suspendu, début ≤ aujourd'hui | relecture ; recalage si fin tardive |
| G25 | Préparer la liste depuis le devis | B19 | `ApproCarte.tsx:273` (`:195-202`) | `btp_preparer_liste` (`portes.ts:287`) | non | Formule `liste_cadencee`, devis vérifié, chantier en cours | relit l'appro |
| G26 | Nouvelle commande → Ajouter la commande | B19 | `ApproCarte.tsx:277`, `:372` (`:174-193`) | `btp_ecrire_commande` (`portes.ts:270`) | F18 | Chantier en cours | relit l'appro |
| G27 | Noter commandée / Changer la date promise | B19 | `ApproCarte.tsx:303`, `:372` (`:204-221`) | `btp_ecrire_commande` (fournisseur si absent) + `btp_noter_commande` (`portes.ts:274`) | F18 | Statut à commander ou commandée | relit l'appro |
| G28 | Noter reçue | B19 | `ApproCarte.tsx:304`, `:372` (`:223-241`) | `btp_recevoir` (`portes.ts:291`) si formule `bons_livraison`, sinon `btp_noter_livraison` (`portes.ts:278`) | F18 | Commandée ou livrée en partie | relit l'appro |
| G29 | Noter rendu | B19 | `ApproCarte.tsx:305`, `:372` (`:243-250`) | `btp_noter_retour` (`portes.ts:295`) | F18 | Formule `retours`, matériel à rendre livré | relit l'appro |
| G30 | Annuler (commande) → Annuler la commande | B19 | `ApproCarte.tsx:306`, `:372` (`:252-259`) | `btp_annuler_commande` (`portes.ts:282`) | F18 | Pas livrée ni annulée ; motif | relit l'appro |
| G31 | Chiffrer une ligne → Chiffrer | B20 | `CV:561`, `:769` (`:249-265`) | `btp_chiffrer_ligne_avenant` (`portes.ts:110`) | F19 | Avenant brouillon | relecture ; prix saisi proposé à la bibliothèque |
| G32 | Retirer (ligne d'avenant) | B20 | `CV:550` (`:266-270`) | `btp_retirer_ligne_avenant` (`portes.ts:112`) | **non** | Avenant brouillon | relecture |
| G33 | Soumettre à la signature / Resoumettre → Soumettre | B20 | `CV:562`, `:570`, `:776` (`:271-275`) | `btp_soumettre_avenant` (`portes.ts:113`) | F20 | Brouillon avec ≥ 1 ligne, ou refusé | relecture ; demande dans « À valider » |
| G34 | Signer → Signer | B20 | `CV:566`, `:783` (`:276-280`) | `btp_signer_avenant` (`portes.ts:114`) | F21 | Demande approuvée/exécutée | relecture ; engagé du lot |
| G35 | Faire signer sur place → Préparer le lien (→ Copier le lien) | B20 | `CV:567` ; `SignatureLienDialog.tsx:144`, `:142` (`:48-73`) | `btp_preparer_signature` (`portes.ts:244`) ; copie presse-papiers | F22 | Demande approuvée + `voit_prix` | lien affiché ; un nouveau lien annule le précédent |
| G36 | Abandonner → Abandonner | B20 | `CV:563`, `:568`, `:790` (`:281-285`) | `btp_abandonner_avenant` (`portes.ts:115`) | F24 | Brouillon ou soumis ; motif ≥ 3 car. | relecture |
| G37 | Ouvrir un avenant / Ouvrir l'avenant (demande lue « à confirmer ») | B21 | `FilCarte.tsx:199`, `:186`, `:225` (`:133-140`) | `btp_avenant_depuis_message` (`portes.ts:318`) | F25 | Message sans avenant | relit le fil + tableau |
| G38 | Écarter (message du fil) | B21 | `FilCarte.tsx:200` (`:142-146`) | `btp_ecarter_message` (`portes.ts:314`) | **non** | — | relit le fil + tableau |
| G39 | Nouvelle situation → Ouvrir la situation | B22 | `SituationsCarte.tsx:225`, `:373` (`:116-124`) | `btp_ouvrir_situation` (`portes.ts:164`) | F26 | `voit_prix`, marché vérifié, aucune en cours | relecture |
| G40 | Avancement cumulé (champ, à la sortie du champ) | B22 | `SituationsCarte.tsx:255-261` (`:126-145`) | `btp_avancer_situation` (`portes.ts:167`) | non | Situation brouillon ou refusée | relecture |
| G41 | Reprendre (avancement lu sur photo) | B22 | `SituationsCarte.tsx:280` (`:202-210`) | `btp_avancer_situation` | non | Proposition rattachée à une ligne | relecture |
| G42 | Soumettre à la validation | B22 | `SituationsCarte.tsx:302` (`:147-154`) | `btp_soumettre_situation` (`portes.ts:170`) | non | Modifiable, aucune saisie en cours | relecture ; « À valider » |
| G43 | Valider la situation | B22 | `SituationsCarte.tsx:303` (`:156-163`) | `btp_valider_situation` (`portes.ts:173`) | non | Demande approuvée | relecture |
| G44 | Annuler → Annuler la situation | B22 | `SituationsCarte.tsx:304`, `:423` (`:165-174`) | `btp_annuler_situation` (`portes.ts:176`) | F28 | Situation en cours | relecture |
| G45 | Noter un paiement → Noter le paiement | B22 | `SituationsCarte.tsx:336`, `:402` (`:176-200`) | `btp_noter_paiement` (`portes.ts:208`) | F27 | Situation validée non payée | relecture |
| G46 | Heures d'une case (à la sortie du champ) | B23 | `HeuresCarte.tsx:245-252` (`:110-125`) | `btp_pointer` (`portes.ts:218`) | non | Chantier ouvert, jour ≤ aujourd'hui | relit les heures ; alertes L3121 affichées |
| G47 | Pointer une équipe → Pointer l'équipe | B23 | `HeuresCarte.tsx:190`, `:335` (`:127-144`) | `btp_pointer_equipe` (`portes.ts:222`) | F29 | Équipes présentes, chantier ouvert | idem |
| G48 | Coût horaire → Poser le coût | B23 | `HeuresCarte.tsx:195`, `:367` (`:146-160`) | `btp_poser_cout_horaire` (`portes.ts:226`) | F30 | `voit_prix` | relit les heures |
| G49 | Prononcer la réception | B24 | `ReceptionCarte.tsx:97`, `:120` (`:60-82`) | `btp_prononcer_reception` (`portes.ts:185`) | F31 | `voit_prix`, chantier ouvert/suspendu | relecture ; chantier « réceptionné » |
| G50 | Lever la réserve | B24 | `ReceptionCarte.tsx:213` (`:134-138`) | `btp_lever_reserve` (`portes.ts:188`) | **non** | Réserve ouverte | relecture |
| G51 | Hors devis : ouvrir un avenant | B24 | `ReceptionCarte.tsx:215` (`:139-155`) | `btp_avenant_depuis_reserve` (`portes.ts:339`) | **non** | Réserve ouverte sans avenant | relecture |
| G52 | Noter une opposition → Noter l'opposition | B24 | `ReceptionCarte.tsx:231`, `:279` (`:156-164`) | `btp_opposer_retenue` (`portes.ts:191`) | F32 | Retenue bloquée avant terme ; motif | relecture |
| G53 | Noter la retenue libérée / la caution levée → Confirmer | B24 | `ReceptionCarte.tsx:232`, `:279` (`:165-173`) | `btp_liberer_retenue` (`portes.ts:194`) | F32 | Retenue non libérée | relecture |
| G54 | Préparer le décompte / Recalculer le décompte | B24 | `ReceptionCarte.tsx:246` (`:174-186`) | `btp_preparer_decompte` (`portes.ts:197`) | **non** | Décompte à préparer ou projet | relecture |
| G55 | Noter le décompte envoyé | B24 | `ReceptionCarte.tsx:247` (`:187`) | `btp_envoyer_decompte` (`portes.ts:200`) | **non** | Projet | relecture |
| G56 | Accepté par le maître d'ouvrage | B24 | `ReceptionCarte.tsx:249` (`:188-195`) | `btp_repondre_decompte(true)` (`portes.ts:203`) | **non** | Envoyé | relecture |
| G57 | Contesté → Noter la contestation | B24 | `ReceptionCarte.tsx:250`, `:279` | `btp_repondre_decompte(false, motif)` | F32 | Envoyé ; motif | relecture |
| G58 | Détacher → Détacher | B25 | `CV:606`, `:809` (`:300-304`) | `btp_detacher_facture` (`portes.ts:123`) | F33 | Motif ≥ 3 car. | relecture |
| G59 | Poser un prix → Poser et valider | B26 | `CV:619`, `:820` (`:310-314`) | `btp_poser_prix` (`portes.ts:103`) | F34 | « qui a le droit de valider les prix » (`CV:814`) | relecture ; ancien prix retiré |
| G60 | Valider (prix proposé) | B26 | `CV:638` (`:305-309`) | `btp_valider_prix` (`portes.ts:104`) | **non** | Prix proposé | relecture |
| G61 | Noter une absence → Noter l'absence | B27 | `DisponibilitesBloc.tsx:86`, `:96` (`:52-62`) | `btp_noter_indisponibilite` (`portes.ts:331`) | formulaire inline | gérant/admin/valideur | relit les disponibilités |
| G62 | Annuler (absence) | B27 | `DisponibilitesBloc.tsx:85` (`:63-70`) | `btp_annuler_indisponibilite` (`portes.ts:334`) | **non** | idem | idem |
| G63 | Signer l'avenant (page de signature) | P01 | `SignatureSurPlace.tsx:235` (`:138-163`) | `btp_signer_sur_place` (`:150-153`) | non (case « Lu et approuvé ») | Sans compte, jeton valide | message + empreinte de preuve |

**Actions sans écriture (à garder aussi)** : filtres B03 (`ED:251`) ; choix d'un chantier + défilement mobile < 1024 px
(`ED:291-294`) ; « Relevé du chantier » (`CV:336`) et « Imprimer ou enregistrer en PDF » (`ReleveDialog.tsx:49`) ;
« Voir/Masquer les contrôles de l'organisation » (`CV:369`) ; « Remplaçants » (`CV:495`) ; « Voir la preuve » (`CV:557`) ;
« Voir ce qui bouge » (`RecalageDialog.tsx:170`) ; « Mois dernier / Ce mois » (`PointMensuelCarte.tsx:95-96`) ; semaine
précédente/suivante et « Lot pointé » (`HeuresCarte.tsx:208-220`) ; photos/vocaux du fil (`FilCarte.tsx:55-86`) ;
« Voir la photo » (`SituationsCarte.tsx:432-444`) ; « Fermer » absence (`DisponibilitesBloc.tsx:97`) ; lecture d'un CSV
(`ImportDevisDialog.tsx:87-92`) ; « Effacer » et « Signer avec mon nom saisi » (`SignatureSurPlace.tsx:226-227`).

---

## 4. Liste et filtres

| Élément | Fait | fichier:ligne |
|---|---|---|
| Familles | `bloque` (≥ 1 contrôle bloquant) > `a_signer` (avenant brouillon/soumis) > `a_confirmer` (prochain passage demandé / sans réponse / décliné) > `ouvert` (ouvert ou suspendu) > aucune | `ED:37-44` ; libellés `etats.ts:110-116` |
| Compteurs | **Non exclusifs** : un chantier compte dans chaque famille qui le concerne | `ED:125-135` |
| Filtre | **Exclusif** : `famille(c) === filtre` (la famille de plus haute priorité). Un chantier bloqué qui a aussi un avenant compte dans « Avenants à signer » mais n'y apparaît pas quand on filtre | `ED:115` |
| Bascule du filtre | Un clic sur un compteur actif l'enlève | `ED:251` |
| Tri | Ordre de famille puis nom (`localeCompare` fr) ; sans famille (préparation, réceptionné, clos, annulé) en dernier | `ED:113-123` |
| Recherche | **Aucune** | — |
| Filtre par statut | Aucun ; les chantiers en préparation / réceptionnés / clos n'apparaissent que dans « Tous » | — |
| Quota | « Chantiers ouverts : x / quota » quand le quota est connu | `ED:253`, `:230` |
| Sélection | Défaut = premier visible ; un chantier filtré hors liste est désélectionné | `ED:137-138` |
| Temps réel | Relecture de la liste sur `btp_chantiers`, `btp_marches`, `btp_passages`, `btp_avenants`, `btp_factures_chantier` ; vide le cache des tableaux | `ED:102-110` |

**États des objets (`etats.ts`)** : statut chantier `preparation / ouvert / suspendu / receptionne / clos / annule`
(`:6-13`) ; gravité `bloquant / attention / info` (`:15-19`) ; contrôle de ligne `ok / incomplet / montant_faux` (`:21-25`) ;
confirmation `non_demandee / demandee / confirmee / declinee / sans_reponse` (`:27-33`) ; avenant `brouillon / soumis /
signe / refuse / abandonne` (`:35-41`) ; vigilance `sans_objet / absente / echue / a_verifier / a_renouveler / a_jour`
(`:43-50`) ; exécution `client / sous_traitant / autre_titulaire` (`:52-56`) ; acceptation `a_demander / demandee /
acceptee / refusee / caduque` (`:58-64`) ; rôles de tiers (`:66-75`) ; unités (`:77-91`) ; famille de contrôle
(`:100-107`) ; statut de facture FILED (`:121-134`) ; état d'envoi J-2 (`:137-145`).
**États locaux hors `etats.ts`** : situation `brouillon / soumise / refusee / validee / annulee` (`SituationsCarte.tsx:29-35`) ;
encaissement `payee / en_retard / partielle / à échoir` (`:327-336`) ; commande, 10 états (`ApproCarte.tsx:33-44`) ;
rangement d'un message (`FilCarte.tsx:29-34`) ; accord J-2 `aucun / a_valider / actif / partiel / revoque`
(`AccordJ2.tsx:113,123-127`) ; retenue `bloquee / liberable / opposee / liberee` (`ReceptionCarte.tsx:129,224-227`) ;
décompte `a_preparer / projet / envoye / accepte / conteste` (`:235`) ; question `en_attente / echec / repondue (+ couverte)`
(`QuestionsCarte.tsx:139-142`) ; passage « En retard » calculé (`CV:489`).
**Fonctions par formule** (`fonctions.ts:7-19`) : `demarrage` ⊂ `chantiers` ⊂ `entreprise`. Gardes de l'écran :
`remplacants` (`CV:495`), `ordre_lots` (`CV:496`), `questions` (`QuestionsCarte.tsx:74`), `point_mensuel`
(`PointMensuelCarte.tsx:73`), `bons_livraison`, `retours`, `liste_cadencee` (`ApproCarte.tsx:121-123`). La météo lit
`m.ouverte` de la base (`MeteoCarte.tsx:137`). `situations` n'est **pas** gardée à l'écran (`SituationsCarte.tsx` n'appelle pas `ouverte`).

---

## 5. Exemple vs réel

| Point | Fait | fichier:ligne |
|---|---|---|
| Choix | `useSource()` : `reelle` seulement si mémorisé dans `localStorage` (`espace.source`) **et** connecté ; premier rendu serveur toujours `exemple` | `components/espace/source.tsx:13-21,72-90` |
| Fournisseur en espace2 | `SourceFournisseur` dans la coquille, ruban d'exemple en haut | `components/espace2/Coquille.tsx:103-111,236,338-340` |
| Ruban à l'écran | `<Ruban source>` dans l'en-tête | `ED:243` |
| Données d'exemple | `TABLEAUX_EXEMPLE` (2 chantiers : Résidence Les Tilleuls ouvert, Maison Rolland en préparation), copié en état local et modifié par les actions | `exemples.ts:174-254`, `ED:76`, `ED:167` |
| Liste d'exemple | Recalculée depuis les tableaux | `ED:47-61`, `:112` |
| Lecture réelle | `chargerListe` + `monClient` au montage ; `chargerTableau` à la sélection, mis en cache | `ED:83-100`, `:146-165` |
| Écriture | `agir` : réel = porte puis relecture ; exemple = 250 ms puis calcul local | `CV:124-142` |
| Création en exemple | Contrôles fabriqués localement (sans lots, sans MO, sans coordonnées) | `ED:202-220` |
| Exemples par carte | AccordJ2 `exemple()` (`AccordJ2.tsx:36-43`) ; À ranger (`ARangerCarte.tsx:23-29`) ; Point du mois (`PointMensuelCarte.tsx:29-63`) ; Questions (`QuestionsCarte.tsx:35-64`) ; Météo (`MeteoCarte.tsx:32-80`) ; Appro (`ApproCarte.tsx:85-116`) ; Fil + photo dessinée (`FilCarte.tsx:37-53`) ; Situations (`situations.ts`) ; Heures (`heures.ts`, `HeuresCarte.tsx:39`) ; Recalage (`recalage.ts`) ; Disponibilités depuis le tableau (`DisponibilitesBloc.tsx:43-50`) ; factures candidates (`exemples.ts:257-260`) | — |
| Refus en exemple | PDF du devis non envoyé (`ImportDevisDialog.tsx:78`) ; preuve de signature absente (`SignatureLienDialog.tsx:84`) ; lien `/signer/exemple` (`:56`) ; page de signature sans écriture (`SignatureSurPlace.tsx:146-149`) | — |
| Mémoire des cartes | En exemple, l'état local des cartes (appro, fil, heures, absences, à ranger) vit dans le composant, remis à zéro au changement de chantier (clés par chantier, `CV:465-585`) | — |

---

## 6. Objets métier

| Objet | Table (identifiant) | Blocs / fenêtres / gestes |
|---|---|---|
| Chantier | `btp_chantiers` (id) — **seul `objet_type` des liens** | B03, B08, B11, F01, F03, G01, G07 ; tous les blocs du dossier |
| Étape / avancement | vue `btp_chantiers_etape` | B08, B11 |
| Réglages / formule / quota | `btp_reglages` (client_id) | B03 quota, gardes de formule (`fonctions.ts`) |
| Lot | `btp_lots` (id) | B13, B14 (rattachement), B17, B19, B23 ; **aucun geste de création** |
| Déboursé | calculé (`debourse`) | B13 |
| Acceptation de sous-traitant | `btp_acceptations` | pastille de B13 seulement ; `noterAcceptation` (`portes.ts:138-147`) **jamais appelée** |
| Marché | `btp_marches` (id) | B14, F07, F09, F10, F11 ; G10, G12-G15 |
| Ligne de marché | `btp_lignes_marche` (vue `_chiffrees`) | B14, F08, F12, F13 ; G11, G16, G17 |
| Contrôles | vues `btp_controle`, `btp_controle_marches` | B12, B14, B08 (compteurs), F06 |
| Passage | `btp_passages` (id) | B08 (prochain), B16, B17, B19, B27, F14-F17 ; G19, G22-G24 ; **aucun geste de création ni d'import** (`importerPassages`, `portes.ts:105`, jamais appelée) |
| Confirmation J-2 | `btp_confirmations` + envoi du socle | B17, F14 ; G22 |
| Dépendance | `btp_dependances` (id) | B18 ; G20, G21 |
| Accord J-2 | `public.politiques` | B04, F02 ; G02-G04 |
| Avenant | `btp_avenants` (id) | B03 (compteur), B08, B20, B21, B24, F04, F19-F25, P01 ; G08, G31-G37, G51, G63 |
| Ligne d'avenant | `btp_avenants_lignes` (vue `_chiffrees`) | B20, F19 ; G31, G32 |
| Demande de validation | `public.demandes_validation` | B20 (pastilles), B22 |
| Signature sur place | `btp_signatures` | F22, F23, P01 ; G35, G63 |
| Facture rattachée | `btp_factures_chantier` (+ `filed_factures`, `filed_fournisseurs`) | B13, B25, F05, F33 ; G09, G58 |
| Tiers (annuaire) | `btp_tiers` (id) | B26, F01 (MO), F15, F18 (fournisseurs) ; **aucun geste d'écriture** |
| Disponibilité / absence | rpc `btp_disponibilites` (table de b6_31, absente du dépôt) | B27 ; G61, G62 |
| Prix | `btp_bibliotheque_chiffree` (id) | B26, F19, F34 ; G59, G60 |
| Équipe / intervenant | `btp_equipes`, intervenants du socle | B13, B17, B23, F29 ; **aucun geste de création** |
| Pointage / coût horaire | `btp_pointages`, `btp_couts_horaires` | B23, F29, F30 ; G46-G48 |
| Commande / livraison | `btp_commandes`, `btp_livraisons` | B19, F18 ; G25-G30 |
| Météo | `btp_meteo` | B16 ; G19 |
| Message du terrain | `btp_messages` (id) | B05, B21, F25 ; G05, G06, G37, G38 |
| Situation / paiement | `btp_situations`, `_lignes`, `_paiements` | B06, B22, F26-F28 ; G39-G45 |
| Réception / réserve | `btp_receptions`, `btp_reserves` | B24, F31, F32 ; G49-G57 |
| Question | rpc `btp_questions_du_chantier` (table de b6_36, absente du dépôt) | B15 ; G18 |
| Devis PDF | Storage `omega-clients` + pièce (`btp_deposer_devis`) | F09 ; G12 |
| Point du mois | rpc `btp_point_mensuel` | B06 |

---

## 7. Promesses

Croisement de `omega/CHIFFRAGE/daliro.md` (52 promesses, numéros de ligne de la page au commit c0494b4) et de
`lib/en-preparation.ts:99-102`. **Le CHIFFRAGE date du 06/10 et est en retard sur le code** : les cartes b6_26 à b6_36
ont depuis couvert des promesses notées C ou D (signalé « depuis » ci-dessous).

| Promesse (n° CHIFFRAGE) | Bloc(s) qui la prouvent à l'écran |
|---|---|
| Description de la page (`app/espace2/daliro/page.tsx:9`) : marché vérifié, avenants chiffrés et signés, passages J-2, factures rattachées | B01 (phrase `ED:238`), B14, B20, B17, B25 |
| 1, 7, 14, 15, 19, 20, 28 — Repère dans les photos et vocaux | B21 (transcription, demandes lues, « Ouvrir l'avenant »), B05 |
| 2, 26, 29 — Chiffre sur vos prix unitaires | B20 + `ChiffrageLu` (depuis b6_26), F19, B26 bibliothèque |
| 3, 30 — Prépare l'avenant, signé avant exécution, signature sur place | B20, F21, F22, F23, P01 |
| 4, 6, 10, 33 — Confirmation J-2 | B17 (colonne Confirmation, état d'envoi), F14, B04 (accord permanent), B03 « Passages à confirmer » |
| 5, 11, 27 — Point du matin (« trois listes ») | Écran Point du matin (R05/R06), pas cet écran ; ses 17 gabarits mènent ici (§ 1.1) |
| 8 — Code civil art. 1793 | Texte cité dans E02 ; aucun bloc |
| 9 — Démonstration « questions » (D au CHIFFRAGE) | B15 (depuis b6_36), 3 questions identiques (`QuestionsCarte.tsx:25`) |
| 12, 44, 52 (devis) — Import du devis | F09 (depuis b6_28 / b6_33) |
| 13 — « 1 clic » pour signer | F22 (un clic côté bureau) + P01 |
| 16, 24, 34 — Remplaçants proposés | F15, ouverte par B17 |
| 17, 38, 39, 22 — Livraisons calées sur devis et planning | B19, G25 |
| 40 — Suivi des retours | B19, G29 |
| 41 — Bons de livraison rapprochés | B19, F18 « Reçu », G28 |
| 18, 42 — Avancement lu dans les photos (**pastille « En préparation »**, `lib/en-preparation.ts:101`) | B22, sous-bloc « Lu dans les photos du chantier » (`SituationsCarte.tsx:270-291`) |
| « Lecture des photos et vocaux » (**pastille « En préparation »**, `lib/en-preparation.ts:100`) | B21, B05 |
| 21, 35 — Recalage des lots | B17 « Recaler », F16 |
| 23 — Reprises hors devis à la réception | B24 « Hors devis : ouvrir un avenant » (depuis b6_32) |
| 25, 36 — Nouvel ordre sur pluie | B16 « Nouvel ordre proposé » + « Échanger » (depuis b6_35) |
| 31 — Chantiers ouverts 5 / 20 / sur mesure | B03 « x / quota », F03 (ouverture comptée) |
| 32 — Relance des avenants non signés | E02-E04 (point du matin), B03 « Avenants à signer » |
| 37 — Annuaire avec disponibilités | B26, B27 (depuis b6_31) |
| 43 — Comptes bureau | aucun bloc ici |
| 45 — Rôles et droits (qui voit les prix) | Effet visible : montants masqués (`voit_prix`) dans B13, B14, B20, B22-B26 ; réglage hors écran |
| 46 — Journal des validations | Mentionné dans les textes (« reste au journal ») ; aucun bloc |
| 47 — Fonctions par formule | Textes « compris dans la formule … » (B06, B15, B16, B19) |
| 48, 49 — UE, services humains | aucun bloc (T) |
| 50 — Point mensuel (D au CHIFFRAGE) | B06 (depuis b6_30) |
| 51 — Rien sans votre accord | F20/F21 (deux personnes), B04, P01 |
| 52 (audit) — « Vous repartez avec ce que nous y avons relevé » | F06 Relevé du chantier (`releve.ts:1-9`) |

---

## 8. Regroupements naturels et observations

### 8.1 Taille des blocs (lignes de code)

| Bloc | Lignes | Bloc | Lignes |
|---|---|---|---|
| `EcranDaliro.tsx` entier | 384 | `ChantierVue.tsx` entier | 834 |
| B01-B03 en-tête + compteurs | 24 (`ED:234-257`) | B08 liste | 47 (`ED:271-317`) |
| F01 Nouveau chantier | 52 (`ED:330-381`) + logique 56 (`ED:173-228`) | Logique des actions du dossier | 155 (`CV:165-319`) |
| B04 AccordJ2 | 179 | B05 À ranger | 106 |
| B06 Point du mois | 132 | B11 En-tête du chantier | 24 |
| B12 Contrôles | 23 | B13 Lots et déboursé | 24 |
| B14 Marché | 56 | B15 Questions | 162 |
| B16 Météo | 180 | B17 Planning | 35 |
| B18 Dépendances | 10 | B19 Appro | 380 |
| B20 Avenants | 55 + ChiffrageLu 45 | B21 Fil | 231 |
| B22 Situations | 444 (+ `situations.ts` 94) | B23 Heures | 373 (+ `heures.ts` 140) |
| B24 Réception | 287 | B25 Factures | 23 |
| B26 Annuaire + bibliothèque | 30 | B27 Disponibilités | 107 |
| Fenêtres du dossier (F03-F17, F19-F24, F33, F34) | 184 (`CV:648-831`) | F09 Import devis | 202 (+ `devis.ts` 120) |
| F16-F17 Recalage | 175 (+ `recalage.ts` 119) | F22-F23 Signature | 149 |
| F06 Relevé | 53 (+ `releve.ts` 102) | P01 Signature sur place | 243 |

Le dossier empile **17 cartes** (B11-B27) sous un seul chantier.

### 8.2 Regroupements par sujet (constat)

| Sujet | Blocs | Remarque |
|---|---|---|
| Contrat (avant travaux) | B14 Marché, F07-F13, B13 Lots et déboursé, B26 bibliothèque | Le marché vérifié conditionne avenants (B20), situations (B22), liste d'appro (G25), décompte |
| Planning et terrain | B17, B18, B16 Météo, B19 Appro, B27 Disponibilités, F14-F17 | Le recalage (G23) déplace les dates de l'appro (`ApproCarte.tsx:6-9`) ; la météo propose des échanges de passages |
| Travaux en plus | B20, F19-F24, P01 ; entrées depuis B11 (G08), B21 (G37), B24 (G51) | Trois portes d'entrée pour créer un avenant |
| Messages du terrain | B05 (organisation) + B21 (chantier) | Même table `btp_messages`, même geste « Écarter » (G06, G38) |
| Argent | B22 Situations, B25 Factures, B13 déboursé, B23 rentabilité, B24 retenue + décompte, B06 Point du mois | « Facturé / reste » calculé à 4 endroits avec 3 bases différentes (B13 : factures fournisseurs ; B23 : dernière situation validée ; B24 : décompte ; B06 : avenants signés vs situation) |
| Fin de chantier | B24 | Seul moyen de passer « réceptionné » ; aucun bouton pour « clos » ou « annulé » |
| Synthèse / aide | B12 Contrôles, B15 Questions, F06 Relevé, B06 | Le relevé et la question « Préparer la réunion » recomposent les contrôles |
| Organisation (pas propres au chantier) | B04 Accord J-2, B05 À ranger, B06 Point du mois, B26 Annuaire + bibliothèque, B27 Disponibilités (30 j, tous chantiers), contrôles d'organisation (B12), Coût horaire (G48, défaut entreprise) | B26, B27, G48 et les contrôles d'organisation sont **rangés dans le dossier d'un chantier** alors qu'ils valent pour toute l'entreprise |

### 8.3 Fréquence d'usage (constat tiré des textes et des moteurs)

| Rythme | Blocs | Indice |
|---|---|---|
| Quotidien | B17 (J-2, noter fait, recaler), B21 + B05 (messages), B16 (prévision 2×/jour), B19 (à commander vite), B23 (pointage du jour), B20 (avenants à signer) | Gabarits du point du matin E02-E12 ; cron J-2 17 h |
| Hebdomadaire | B23 (semaine), B16 (7 jours), B27 (30 jours) | Navigation par semaine |
| Mensuel | B22 (situation de fin de mois), B06 (point du mois), B25 | E01 relance de paiement |
| Ponctuel (début / fin) | F01, F03, B14 + F07-F13 (au démarrage), B24 + F31-F32 (réception, un an de retenue, 45 j de décompte) | E13-E17 |
| Réglage | B04, F30 Coût horaire, B26 (prix), B27 (absences), formule (`fonctions.ts`) | Rôles gérant/admin/valideur |

### 8.4 Doublons, manques et rangements à décider

1. **Les entrées n'ouvrent pas le bon chantier** : 17 gabarits portent `objet_id`, l'aiguillage (479f9d88) le met dans
   `?objet=btp_chantiers:<id>`, mais l'écran ne lit aucun paramètre et montre le premier chantier trié (`ED:137`). La
   redirection `proxy.ts:57-64` conserve la query.
2. **E03 contredit son lien** : le texte dit « décidez dans « À valider » », le lien mène à DALIRO (`b6_23:551`).
3. **14 alertes DALIRO** (`public.alertes`, § 1.2) ne sont lues par aucun écran ; certaines doublent le point du matin
   (A08 = E14, A09 = E13, A10 = E15, A13 = E06).
4. **Compteurs non exclusifs, filtre exclusif** (`ED:125-135` vs `ED:115`) : le nombre d'un compteur peut dépasser la
   longueur de la liste filtrée.
5. **Pas de recherche**, pas de filtre par statut ; les chantiers réceptionnés, clos ou en préparation n'ont pas de famille.
6. **Gestes absents bien que l'écran y renvoie** : créer des lots (le message de création dit « posez ses lots », `ED:221`),
   poser ou importer des passages (avis « importez le planning (tableur) », `CV:505`, mais `importerPassages` n'est
   appelée nulle part), gérer tiers / équipes / intervenants, noter une acceptation (`noterAcceptation` jamais appelée).
7. **« Ouvrir un avenant » à trois endroits** (G08 en-tête, G37 fil, G51 réserve) et « Écarter » à deux (G06, G38).
8. **« Rattacher une facture »** est dans l'en-tête B11 (`CV:351`), la liste des factures 240 lignes plus bas (B25).
9. **Organisation dans le dossier** : B26 Annuaire + bibliothèque, B27 Disponibilités, coût horaire par défaut et contrôles
   d'organisation changent quand on change de chantier alors que leurs données ne dépendent pas du chantier (`btp_disponibilites`
   prend `client_id`, `DisponibilitesBloc.tsx:34`).
10. **Dépendance au premier tableau chargé** : le quota (`ED:230`), le choix du maître d'ouvrage dans F01 (`ED:179`) et la
    formule de B06 (`PointMensuelCarte.tsx:72-74`) lisent `Object.values(tableaux)[0]` ; en réel le cache est vidé à chaque
    relecture temps réel (`ED:105`), donc F01 peut proposer une liste de MO vide.
11. **Gestes sans fenêtre de confirmation** : G20, G21, G32, G38, G40-G43, G46, G50, G51, G54-G56, G60, G62 écrivent au
    premier clic (ou à la sortie du champ).
12. **Pas de toast** : chaque carte a son propre `Avis` « C'est fait » / erreur (≈ 14 zones de retour : `ED:247`, `CV:326`,
    et une par carte).
13. **`situations` non gardée par formule** à l'écran, alors que `fonctions.ts:9` ne l'ouvre qu'à la formule Entreprise.
14. **Remplaçants en lecture seule** (F15) : aucun geste pour réaffecter le passage à un remplaçant.
15. **Migrations b6_26 à b6_36 absentes du dépôt** alors que l'écran appelle leurs portes (`portes.ts:30-33`).

---

**Totaux** : 62 blocs (27 blocs d'écran B01-B27, 34 fenêtres F01-F34, 1 page P01) · 63 gestes qui écrivent (G01-G63) ·
20 entrées écrites en base (17 gabarits actifs du point du matin sur 14 lignes SQL `b6_23` + 3 types de demandes
« À valider »), plus 14 alertes sans lien, 0 paramètre d'adresse lu, 8 accès depuis d'autres écrans.
