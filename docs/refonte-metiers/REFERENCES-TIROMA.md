# TIROMA — sous-pages et pages de référence (02/11/2026)

Consigne : `docs/refonte-metiers/cloud/COMMUN.md` et `cloud/TIROMA.md` (branche `refonte-metiers/aiguillage`) ; règles de Teo :
`REGLES.md`. Inventaire (contrat) : `tiroma.md`. Ancien écran : `/espace2/tiroma?ancien=1` (EcranTiroma, inchangé).

| Sous-page | Route | Référence | Relevé | Comparaisons (`comparaisons/tiroma/`) | État |
|---|---|---|---|---|---|
| Aujourd'hui | `/espace2/tiroma` | Linear, My issues | `linear-my-issues.md` | `aujourdhui-*` | faite : en-tête, onglets, colonnes, lignes, puces, avatar et date superposés au pixel (sombre et clair) ; 390 conforme |
| Créneaux et appels | `/espace2/tiroma/creneaux` | Plain, Threads | `plain-threads.md` | `creneaux-*`, `creneaux-fil-*` | faite : liste (en-tête, groupes, lignes de 67, colonnes) et fil ouvert (en-tête, messages, volet) superposés ; gestes testés |
| Fauteuils | `/espace2/tiroma/fauteuils` | Cal.com, Bookings | `calcom-bookings.md` | `fauteuils-*` | à faire |
| Plans et devis | `/espace2/tiroma/plans` | Linear, Board | `linear-board.md` | `plans-*` | faite : en-tête, colonnes de 324 au pas de 348, têtes de 50, cartes (identifiant, titre, puces, pied) superposées ; gestes testés |
| Pilotage | `/espace2/tiroma/pilotage` | Plain, Insights | `plain-insights.md` | `pilotage-*` | à faire |
| Réglages | `/espace2/tiroma/reglages` | Linear, Settings › Team | `linear-team-settings.md` | `reglages-*` | à faire |

## Fichiers communs (préfixe `tir-`, propres à Tiroma)

- `components/espace2/tiroma/donnees.tsx` : la lecture et les gestes de l'écran d'avant, posés une fois dans le layout
  (`app/espace2/tiroma/layout.tsx`) ; portes inchangées, aucune migration ; bascule Exemple / Réel gardée.
- `exemplesPlus.ts` : l'exemple d'avant complété (3 créneaux libérés, 11 plans) pour avoir autant de lignes que la
  référence remplie.
- `tir.css` : jetons Linear sombre et clair (repris du socle de Daliro, valeurs des relevés), carte, ronds, onglets, menu.
- `TirIcone.tsx` : icônes du sprite de Linear, générées par `outils/tir-icones.mjs` depuis `linear-commun/`.
- `TirCadre.tsx` : carte, menu de Linear (sous-menus, cases), avatar.

## Méthode de preuve

`outils/tir-preuve.sh` (serveur `npx next dev -p 3100`, Playwright chromium, `deviceScaleFactor: 1`) :
1. fenêtres 1440×900 et 390×844, sombre et clair, côte à côte avec la capture de référence (`*-1440-*-cote.png`,
   `*-390-*-cote.png`) ;
2. carte contre carte : la coquille de l'espace 2 (barre 48, rail et sous-menu jusqu'à x 304) n'est pas la barre latérale
   de Linear (244) ; on prend une fenêtre où notre carte a la taille de celle de Linear (1188×856 → 1500×920) et on
   compare les deux cartes en différence (`*-diff.png`, ×4) et en fondu (`*-fusion.png`) — `outils/tir-superpose.py`.

Écart commun assumé : le cadre de l'espace 2 (barre du haut, rail, sous-menu) n'appartient pas à la page copiée.

## Aujourd'hui ← Linear, My issues

Correspondance : groupes de Linear = les compteurs de l'écran d'avant (B2) — Créneaux à sauver (créneaux libres, plage
de l'horizon à la place des dates du cycle), Plans sans rendez-vous, Avant les rendez-vous (« N critique(s) »),
Demi-journées vides (titulaire ; sinon « — » et « réservé au titulaire »), Réponses des patients, Faits (créneau repris,
travail revenu du laboratoire, confirmation). Ligne : priorité = gravité ou ancienneté du plan, identifiant (CR-, D-,
AV-, DJ-, RP-), statut, titre, puces (étiquette, fauteuil ou montant, cycle = candidats / jours, échéance avec le
calendrier barré rouge quand elle est dépassée), avatar du praticien, date. Une ligne mène à la sous-page qui porte
ses gestes. Onglets : Point du matin · Créneaux · Plans · Activité (derniers appels notés, par jour, comme Activity).
« New issue » → « Liste d'attente » (inscription, page Créneaux). Filtre (praticien), Affichage (faits, étiquettes),
Détails (volet : sélecteur de cabinet en réel, état, logiciel, point du matin, dernier relevé, source).

Superposition (carte, 1500×920) : écart moyen 9,5/255 ; toutes les lignes de structure confondues (filet à 44, onglets
à 52, en-têtes de groupe 36 à 88, lignes de 44 à 2 px sous l'en-tête, 2 px entre groupes, colonnes 8/18/16/55/16/1fr/60/18,
puces de 24, avatar 18, date alignée à droite). Restent, expliqués :
- textes, nombre de puces et icônes de groupe : contenu du cabinet (le groupe « Urgent issues » de Linear n'a pas
  d'icône ; nos groupes suivent leur nature) ;
- avatar : Linear montre la photo du compte, nous les initiales du praticien (aucune photo en base) ;
- anneau « Todo » sombre : lu sur la capture (le relevé ne le donne qu'en clair, #a6a6a6) ;
- 390 : nos libellés d'onglets sont plus longs que « Assigned · Created » ; le second se tronque pour garder
  « 2 de plus » et les trois ronds.

## Créneaux et appels ← Plain, Threads

Un fil = un patient à appeler ou à suivre. Groupes (icônes de statut de Plain) : Créneaux à sauver (B8, un fil par
créneau, candidats dans l'ordre en message, « hors préférences » / « ne pas contacter » en note jaune), Appels à
reprendre (B12, bilan des trente jours dans la tête de groupe ; montant des plans pour le titulaire seul), Absences
probables (B10), Réponses des patients (B24), Liste d'attente (B25), Contrôles dus (B23, sans « Noter l'appel »,
comme avant). Colonnes de Plain : compte = fauteuil ou patient, client = praticien ou motif, tier = famille de soin ou
issue, réf. + titre + aperçu, étiquettes, priorité, canal (`<>` = relevé du logiciel, bulle = appel noté) + temps,
assigné.
Gestes : « Reply » (R) = « Noter l'appel » (F3/G2, choix du patient parmi les candidats, six issues, date si « À
rappeler » ; « Ne plus contacter » demande une confirmation) ; « Nouveau fil » = « Liste d'attente » (F6/G9,
recherche de patients) ; « Retirer de la liste » (F7/G10, motif puis confirmation) dans la barre du fil ;
F (Filtres : groupes, puce de filtre actif + « Tout effacer »), V (Affichage : fils faits, vues), Échap, ↑/↓.
Adresses : `?fil=<clé>` (ouvert depuis la liste : colonne de 400 + carte du fil) ; `?creneau=<id>` (point du matin,
aiguillage : sans la colonne liste, comme Plain ouvert par son adresse) ; `?vue=attente|appels|reponses|…` ;
`?inscrire=1`.

Superpositions : liste carte contre carte (fenêtre 1391×948 = carte de 1079×884) écart moyen 12,9/255 ; fil ouvert
par son adresse (1688×948 = carte de 1376×884) 8,8/255 ; en-tête, séparateur de date, cartes de message (avatar 40,
p 12 16 16), volet de 385 (lignes de 32, libellé 144) confondus. Restent, expliqués :
- « Ask Sidekick Agent » (assistant IA de Plain) et « Add note » : fonctions de Plain sans équivalent dans Tiroma,
  absentes ; la barre se recentre donc sur deux groupes (statut, Noter l'appel · Plus) ;
- « Assign », « Thread tier », « SLA policy » : sans objet (aucune assignation dans Tiroma) ;
- Whyte (titre de page, licence payante) remplacée par Inter 400 à la même taille ;
- textes et nombre de lignes par groupe : contenu du cabinet ; en-tête de liste : un bouton « Liste d'attente » de plus.

## Plans et devis ← Linear, Board

Colonnes (statut de Linear) : Devis à relancer (B15, icône Triage), Mutuelle à obtenir (B9, Backlog), Prêts à poser
(B9, Todo), Un créneau trouvé (B22, In Progress), Mutuelle refusée (affichée si un refus est noté, ou par Affichage).
Carte : n° de devis, avatar du praticien, statut + « patient — séance », puces (priorité = ancienneté du plan : rouge
dès 42 j, haute dès 21 j ; échéance = expiration, calendrier barré rouge quand elle est passée ; cycle = jours depuis la
signature ; montant ; famille, mutuelle, « À vérifier », « Ne pas contacter », « Famille : N proches à planifier »),
« Signé le » / « Présenté le ». Onglets Tous · Sans rendez-vous · Devis (Active · Backlog · All issues). Filtre
(praticien), Affichage (colonnes vides, pastille bleue quand l'option est changée, comme Linear).
Gestes : la carte ouverte (clic, `?plan=<id>` depuis le point du matin et l'aiguillage) ouvre le volet de droite
(« Open details ») : propriétés, créneaux trouvés, « Noter la mutuelle » (F1/G3 : état, date, note de 200 caractères),
« Noter l'appel » (F3/G2, « Ne plus contacter » confirmé) ; clic droit sur une carte : menu contextuel (Ouvrir, Noter
la mutuelle, Noter l'appel).

Superposition (carte, 1500×920) : en-tête, onglets, ronds, têtes de colonne, colonnes et cartes alignées ; dans la
carte, identifiant, titre, puces et pied confondus. Restent, expliqués :
- « New issue » et la cloche : Tiroma ne crée pas de plan (lecture seule du logiciel du cabinet) ; absents ;
- le « + » d'une colonne mène à Créneaux et appels (pas de création de plan) ;
- le glisser-déposer entre colonnes : une colonne est un état calculé (mutuelle, créneau), pas un champ qu'on change ;
  on change la mutuelle dans le volet ;
- nombre de cartes et de rangées de puces : contenu du cabinet.
