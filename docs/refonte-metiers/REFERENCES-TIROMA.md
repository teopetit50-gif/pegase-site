# TIROMA — sous-pages et pages de référence (02/11/2026)

Consigne : `docs/refonte-metiers/cloud/COMMUN.md` et `cloud/TIROMA.md` (branche `refonte-metiers/aiguillage`) ; règles de Teo :
`REGLES.md`. Inventaire (contrat) : `tiroma.md`. Ancien écran : `/espace2/tiroma?ancien=1` (EcranTiroma, inchangé).

| Sous-page | Route | Référence | Relevé | Comparaisons (`comparaisons/tiroma/`) | État |
|---|---|---|---|---|---|
| Aujourd'hui | `/espace2/tiroma` | Linear, My issues | `linear-my-issues.md` | `aujourdhui-*` | faite : en-tête, onglets, colonnes, lignes, puces, avatar et date superposés au pixel (sombre et clair) ; 390 conforme |
| Créneaux et appels | `/espace2/tiroma/creneaux` | Plain, Threads | `plain-threads.md` | `creneaux-*` | à faire |
| Fauteuils | `/espace2/tiroma/fauteuils` | Cal.com, Bookings | `calcom-bookings.md` | `fauteuils-*` | à faire |
| Plans et devis | `/espace2/tiroma/plans` | Linear, Board | `linear-board.md` | `plans-*` | à faire |
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
