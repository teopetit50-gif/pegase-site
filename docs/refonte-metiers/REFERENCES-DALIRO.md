# DALIRO — sous-page → référence → relevé → comparaisons → écarts (02/11/2026)

Refonte faite dans le conteneur cloud (consigne `docs/refonte-metiers/cloud/COMMUN.md` et `DALIRO.md`), branche
`claude/copie-daliro-056765`. Relevés : `/tmp/refs-linear/docs/refonte-metiers/releves/` (branche
`claude/refs-linear-49bf64`) et `/tmp/refs-plain/docs/refonte-metiers/releves/` (`claude/refs-plain-attio-cal-a3a72b`).
Comparaisons : `docs/refonte-metiers/comparaisons/daliro/` — pour chaque page, `<page>-1440-{sombre,clair}.png` et
`<page>-390-{sombre,clair}.png` (nos captures), `<page>-{sombre,clair}-cote.png` (référence à gauche, nous à droite),
`-diff.png` (différence ×4) et `-fusion.png` (superposition à 50 %).

## Méthode

- `node outils/dal-capture.mjs <route> <préfixe>` : Chromium headless, 1440×900 et 390×844, `deviceScaleFactor` 1,
  `colorScheme` sombre et clair, données d'exemple.
- `python3 outils/dal-superpose.py <capture> <référence 1440-reel-*> <préfixe> [--dx N]` : carte contre carte
  (Linear 244,8 ; coquille d'espace2 304,56). Notre carte fait 1128 de large au lieu de 1187 (barres de l'espace 2 :
  304 contre 244) : le contenu centré se compare avec `--dx -30`, le contenu calé à droite avec `--dx -60`.
- `node outils/dal-mesure.mjs <route> "<sélecteur>"…` : boîtes et styles calculés, origine ramenée sur celle de Linear.

Écart moyen et part des pixels qui diffèrent de plus de 40/255 (1440, sombre / clair). Ce qui reste est du **texte
différent** (contenu du métier), pas de la géométrie : chaque page a été vérifiée au style calculé et en recadrant
les zones (voir les colonnes « vérifié »).

## Tableau

| Sous-page | Route | Référence | Relevé | Comparaisons | Superposition (sombre / clair) | Vérifié |
|---|---|---|---|---|---|---|
| Vue d'ensemble | `/espace2/daliro` | Linear, accueil d'une équipe | `linear-home.md` | `vue-*` | 3.4 · 2.1 % / 3.5 · 2.1 % (`--dx -30`) | lignes de ressources à 0,5 px (bord de 0,5), colonne droite, 390 |
| Chantiers | `/espace2/daliro/chantiers` | Linear, Projects en Timeline | `linear-projects.md` + `linear-timeline.md` | `chantiers-*` | 5.3 · 3.1 % / 4.7 · 2.9 % | colonne gauche au pixel (icône 13, nom 45, ronds 173), lignes 72, règle 32, barres 24, 390 |
| Fiche d'un chantier, Aperçu | `/espace2/daliro/chantiers/[id]` | Linear, page d'une Initiative (Overview) | `linear-initiative.md` | `fiche-*` | 5.5 · 3.6 % / 5.5 · 3.4 % (`--dx -30`) | tuile 64, titre 112, résumé 144, rangées 191 et 231, carte 275 (relatif à l'en-tête), comme Linear |
| Fiche, volet ⌘ I | idem, bouton ou ⌘ I | Initiative, « Initiative details » | `linear-initiative.md` | `fiche-volet-*` | côte à côte (capture de référence à 0,556) | cartes 388, libellés 90, lignes 36, segments |
| Fiche, Activité | `?onglet=fil` | Initiative, onglet Activity | `linear-initiative.md` | `fiche-activite-*` | côte à côte (référence à 0,556) | colonne 813, mois, cartes, événements |
| À ranger | `/espace2/daliro/a-ranger` | Linear, Triage | `linear-triage.md` | `a-ranger-*` | 6.1 · 4.4 % / 6.1 · 4.5 % | lignes 253,61+59n, titre 267,71 ; volet droit à `--dx -30 --dy -10` |
| À faire | `/espace2/daliro/a-faire` | Linear, My issues | `linear-my-issues.md` | `a-faire-*` | 11.0 · 7.3 % / 11.3 · 7.3 % | groupes 36, lignes 44, colonnes 287/311/375/398 ; avatar et date à `--dx -60` |
| Avenants et situations | `/espace2/daliro/avenants` | Linear, Board | `linear-board.md` | `avenants-*` | 12.5 · 8.7 % / 13.5 · 8.9 % | carte 262,154.5 (Linear 262,154), colonnes 340 au pas de 348, en-tête de colonne 50 |
| Équipes | `/espace2/daliro/equipes` (+ `?intervenant=`) | Cal.com, Availability (+ page d'un horaire) | `calcom-availability.md` | `equipes-*`, `equipes-fiche-*` | 7.4 · 5 % / 7.6 ; fiche 6.9 · 3.8 % / 7.8 | titre, segmenté, carte de liste, plages, menu ⋯ ; semaine, boutons + et ⧉ |
| Annuaire | `/espace2/daliro/annuaire` (+ `?entreprise=`) | Attio, People et fiche d'un contact | `attio-people.md` (après import) | `annuaire-*`, `annuaire-fiche-*` | 11.6 · 7 % / 11.3 ; fiche 7.9 · 5.5 % / 7.6 | barres, colonnes 250/215/288/310, pied ; fiche : avatar, actions, onglets, 3×2 |
| Réglages | `/espace2/daliro/reglages` | Linear, Settings › Labels puis Templates | `linear-labels-templates.md` | `reglages-*`, `reglages-organisation-*` | Labels 7.1 · 5.2 % ; Templates 3.5–3.8 · 2.1 % | titre 73, en-tête du tableau 161, lignes 193 |

## Où sont passés les gestes de l'inventaire (`docs/refonte-metiers/daliro.md`)

- **Fiche d'un chantier** : ouvrir / suspendre / reprendre, ouvrir un avenant, rattacher une facture, relevé du chantier
  → menu « … » de l'en-tête (Initiative actions) et « + » (avenant), par les fenêtres de `ChantierVue` (prop `demande`) ;
  rattacher une facture et le relevé aussi dans le « + » des Ressources. Propriétés (statut, priorité, maître
  d'ouvrage, fin prévue, début, étape, notre place, TVA) → rangée Propriétés et volet ⌘ I. Contrôles (B12) →
  Description (en phrase) et vue Terrain › Points à régler. Lots et déboursé (B13) → tableau « Projects » (santé du
  déboursé, priorité des contrôles du lot, exécutant, fin du dernier passage, avancement) et vue Argent. Fil (B21) →
  onglet Activité (ouvrir un avenant depuis un message, écarter avec confirmation). Terrain, Argent, Réception :
  vues ajoutées à l'initiative (« Add new view »), en listes de Linear, inchangées.
- **Chantiers** : planning (glisser un passage, Maj pour l'étirer, poser ses heures) sur les jalons de la Timeline ;
  quota « x / y ouverts » dans l'en-tête ; nouveau chantier ; filtres par famille ; échelle.
- **À ranger** : ranger dans un chantier → Accept ; écarter → Decline (avec motif) ; ouvrir un avenant → « … ».
- **À faire** : tâches du jour (passages à confirmer ou noter faits, avenants à signer, situations) en lignes ; le
  geste mène à la fiche du chantier (volet de détails ⌘ I).
- **Avenants et situations** : tous les gestes dans le détail ouvert au clic (ou `?avenant=` / `?situation=`).
- **Équipes** : le planning façon Float quitte la page ; glisser (« Déplacer vers… »), étirer (+, ×), poser des heures
  et absences (« Date overrides ») sont sur la page d'un intervenant ; rien ne part avant « Enregistrer ».
- **Annuaire** : lecture seule (B26), vues par rôle, filtre « À surveiller ».
- **Réglages** : bibliothèque de prix (poser, valider, trier, filtrer, regrouper) ; accord J-2 (donner, renouveler,
  activer seul, révoquer, chacun confirmé) ; contrôles d'organisation vers l'annuaire.

Portes inchangées, aucune migration. `node outils/verifier-aiguillage.mjs /tmp/releve-prod/omega/prod/migrations` :
« Chaque repère a sa page. » Ancien écran : `/espace2/daliro?ancien=1`. Bascule Exemple / Réel gardée.

## Écarts restants, avec leur raison

Motif admis (geste du métier sans place dans la référence) :
- Chantiers : « x / y ouverts » (quota de la formule) dans l'en-tête ; jalons de passage dans les barres.
- Fiche : vues Terrain, Argent, Réception (ajoutées comme vues de l'initiative) ; lignes Début, Étape, Notre place,
  TVA dans les propriétés du volet ; la lecture de Daliro (transcription, demandes) dans les cartes d'Activité.
- Annuaire : colonne « Rôles » ; Équipes : nom du chantier après chaque plage horaire.
- À faire : le volet de détails remplace la page d'un ticket (une tâche n'a pas de page à elle).

Éléments de la référence sans geste Daliro derrière (non dessinés, **à trancher par Teo**) :
- Étoile « Add to favorites » (Vue d'ensemble, Fiche, À ranger, Avenants) : l'espace 2 n'a pas de favoris.
- Fiche : cloche « Notifications » ; onglet « Projects » en Timeline (le planning des lots reste dans Terrain) ;
  composeur « Comment | Update » de l'onglet Activity (le fil se remplit par WhatsApp et courriel) ; flèche de tri
  remplacée par « ↓ » (le tracé n'est relevé qu'en partie).
- À faire : « New issue », « + » de groupe, case à cocher au survol, puce de cycle.
- À ranger : Duplicate, Snooze, « Copy as prompt », boîte de commentaire.
- Équipes : « Set as default », corbeille, crayon de renommage, crayon d'une absence.
- Annuaire : « View settings », « Import / Export », « + New Person », cases à cocher, épingles et automatisations
  de colonne, « Add column », « Add calculation », repli de la barre latérale d'Attio, onglets Emails / Calls / Files.
- Réglages : case à cocher de ligne (aucune action groupée sur les prix) ; Labels et Templates empilés sur une
  route (pas de barre latérale de réglages).

Autres :
- Couleurs prises sur les captures faute de relevé : carte du volet de la fiche en sombre (26/255 = lch(9.232), la
  palette du relevé dit 12.72), segments du volet ; À ranger et À faire : couleur « Todo », chevron de groupe en
  sombre, surbrillance de la ligne ouverte, bord de l'illustration.
- Annuaire : icônes d'Attio non relevées → Lucide de même taille et même place.
- Contenu : 6 chantiers d'exemple contre 13 projets chez Linear (Chantiers) ; 13 entreprises contre 77 contacts
  (Annuaire) ; plages horaires des intervenants (Équipes). La géométrie est vérifiée sur les lignes présentes.
- Barres de défilement : celles de Linear sont les barres flottantes de macOS (absentes de Chromium headless).
- L'exemple étendu d'Avenants, de Réglages et d'À faire se pose dans les données partagées à la première visite de
  la page qui le porte.
