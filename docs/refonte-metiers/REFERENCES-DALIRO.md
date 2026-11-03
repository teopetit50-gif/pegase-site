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
| Équipes (03/11) | `/espace2/daliro/equipes` (+ `?onglet=`, `?intervenant=`, `?passage=`, `?vue=calendrier`) | Cal.com, Bookings (liste, détail d'une réservation, vue calendrier) | `calcom-bookings.md` | `equipes-*` (1440 sombre et clair, 390 clair) | 8.7 · 5.0 % / 8.3 · 5.3 % ; 390 clair 14.6 · 9.9 % | barre à 25 du bord, carte 16 dessous, tête de groupe 44, case 17 / date 43 / contenu 219 du bord de la carte (Cal.com : 17 / 43 / 219), ⋯ à 24 du bord droit, ligne de 3 lignes 108 ; 390 : segmenté défilant, titre 16/24, date sous le contenu, ⋯ 36 |
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
- **Équipes** (03/11, Cal.com Bookings à la place d'Availability, que Teo n'aimait pas : « trouve un autre truc ») :
  un passage = une réservation (date, heures ou demi-journée, pastille du chantier, tâche « avec » l'intervenant, lot,
  réponse J-2) ; une absence = une ligne à ses jours, et un passage qui tombe sur une absence le dit en ambre.
  Onglets : À venir (« Aujourd'hui » / « À suivre ») · Non confirmés (J-2 sans réponse ou déclinée : « Décliné » et
  « Confirmé » notent la réponse, le drapeau ouvre les remplaçants) · Plusieurs jours (« ↻ N jours restants ») · Passés
  · Annulés. Filtrer : intervenant, sous-traitants ou équipes internes, chantier. Détail flottant (`?passage=`,
  `?absence=`), ⌃ ⌄ pour passer d'une ligne à l'autre. Menu ⋯ (celui du détail de Cal.com, mêmes groupes et icônes) :
  Recaler la suite (F16, G23) · Relancer le sous-traitant · Changer les jours et les heures (déplacer, étirer,
  raccourcir, poser des heures : `btp_deplacer_passage`, comme l'ancienne fiche) · Remplaçants · Ajouter au calendrier
  › (.ics, texte) · Noter fait (F17, G24) · Noter la réponse (F14) · Ouvrir dans le planning · Noter une absence (G61) ·
  Annuler l'absence de ces jours (G62) · Noter le passage décliné · Masquer cet intervenant. Une absence : changer les
  jours (noter la nouvelle puis annuler l'ancienne), noter une autre absence, l'annuaire, l'annuler (G62, confirmée).
  **La page d'un intervenant (`?intervenant=`) ne reste pas** : Bookings n'a pas de page par personne, il a un filtre
  par participant. `?intervenant=` (le lien « Disponibilités » de l'annuaire) filtre donc la liste, et chaque geste de
  l'ancienne fiche passe au détail d'un passage ou d'une absence : la page d'un horaire de Cal.com était la partie
  qui ne se lisait pas comme un planning.
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
- Annuaire : colonne « Rôles ».
- Équipes : « Annulés » n'a pas de geste de base (aucune porte n'annule un passage ; portes inchangées) : « Cancel
  event » devient « Noter le passage décliné » (réponse J-2 déclinée, confirmée par une fenêtre) ; le drapeau rouge
  (« Report booking ») ouvre les remplaçants dans Non confirmés et Annulés, et « Annuler l'absence de ces jours » dans
  le menu ⋯ ; « Join Cal Video » est la pastille du chantier (ouvre sa fiche) ; « Host » = « Donneur d'ordre » ; la
  section « Additional notes » = « Lot et confirmation » + « Réponses » (fil J-2). Les lignes d'absence, la mention
  ambre « Absent … : passage à revoir » et la barre de sélection (cases cochées : copier, .ics) n'ont pas d'équivalent
  dessiné dans le relevé ; leurs couleurs sont celles de la pastille « Unconfirmed ». « Noter une absence » n'a pas de
  bouton dans la barre (Bookings n'a pas de « + New ») : il est dans chaque menu ⋯, dans le détail et dans l'état vide
  d'un intervenant filtré.
- À faire : le volet de détails remplace la page d'un ticket (une tâche n'a pas de page à elle).

Éléments de la référence sans geste Daliro derrière : **plus aucun** depuis le 02/11 au soir (décision de Teo,
« trouve une utilité aux boutons ») — chacun est dessiné et utile, voir la section suivante.

Autres :
- Couleurs prises sur les captures faute de relevé : carte du volet de la fiche en sombre (26/255 = lch(9.232), la
  palette du relevé dit 12.72), segments du volet ; À ranger et À faire : couleur « Todo », chevron de groupe en
  sombre, surbrillance de la ligne ouverte, bord de l'illustration.
- Annuaire : icônes d'Attio tirées de ses fichiers publics (jeu 16 px ; « Activité » du jeu 12 px agrandi) ; l'icône de personnes de l'en-tête est redessinée dans le même carré bleu, l'épingle de colonne est l'épingle simple (la barrée n'est pas dans le jeu).
- Fiche, onglet Lots : la capture de Linear montre l'onglet Projects en liste, le relevé (29/10) en Timeline ; la Timeline est gardée.
- Contenu : 6 chantiers d'exemple contre 13 projets chez Linear (Chantiers) ; 13 entreprises contre 77 contacts
  (Annuaire) ; passages des intervenants (Équipes : titres plus courts que « … between Wizyy and … », 4e ligne
  « En cours, jusqu'au … » à la place de « in 2 minutes »). La géométrie est vérifiée sur les lignes présentes.
- Équipes (Bookings) : la coquille de l'espace 2 donne une carte <main> de 1128 au lieu de 1176 : tout ce qui est
  aligné à droite (⋯, filtres enregistrés, bascule) est 48 px plus à gauche ; « Saved filters » = « Filtres
  enregistrés » (plus long), segmenté de 422 au lieu de 408 (libellés français). Sombre : pastilles ambre / rouge,
  ligne ouverte (blanc à 3 %) et titres de section du détail (#9ca3af) pris hors relevé (Cal.com ne les donne qu'en
  clair). Non confirmés, détail et vue calendrier : les captures de référence sont à l'échelle 0,556
  (`1440-clair-unconfirmed.png`, `1440-clair-detail-*.png`), la comparaison est côte à côte, pas en superposition
  (`equipes-nonconf-1440-clair.png`, `equipes-detail-1440-*.png`, `equipes-calendrier-1440-clair.png`). Le menu
  « Filter » de Cal.com n'a pas été mesuré (relevé) : popover repris du menu ⋯. Le compteur « 3 » de la barre
  latérale (non confirmées) n'a pas sa place dans la coquille de l'espace 2.
- Barres de défilement : celles de Linear sont les barres flottantes de macOS (absentes de Chromium headless).
- L'exemple étendu d'Avenants, de Réglages et d'À faire se pose dans les données partagées à la première visite de
  la page qui le porte.

## Boutons de la référence et leur utilité (02/11/2026)

Décision de Teo : chaque élément des pages de référence est dessiné 1:1 et fait une chose réelle — d'abord un geste
existant (portes inchangées, aucune migration), sinon une utilité côté navigateur. Les gestes qui envoient ou
qu'on ne défait pas demandent une confirmation. Utilités communes : `components/espace2/daliro/navigateur.ts`
(localStorage `espace2:favoris:daliro`, `espace2:suivis:daliro`, `espace2:reportes:daliro` ; export CSV ; presse-papier).

| Page | Bouton de la référence | Ce qu'il fait | Par quoi |
|---|---|---|---|
| Vue d'ensemble | étoile « Add to favorites » | épingle la vue ouverte (Vue d'ensemble ou Point du mois) ; étoile pleine de Linear (yellowBase) | localStorage |
| Vue d'ensemble | section de ressources (« Add section ») | « Épinglés » en tête : chantiers, avenants, vues, messages, entreprises épinglés ailleurs | localStorage |
| Fiche | étoile | épingle le chantier dans « Épinglés » | localStorage |
| Fiche | cloche « Notifications » | suit le chantier : ses nouveaux messages en tête d'À ranger, marqués « suivi » | localStorage |
| Fiche | « + » (Add project) | fenêtre « Ouvrir un avenant » | porte (fenêtre de ChantierVue) |
| Fiche | menu « … » | ouvrir / suspendre / reprendre, avenant, facture, relevé, détails, fil, avenants | portes (fenêtres de ChantierVue) |
| Fiche | onglet « Projects » | « Lots » : frise de Chantiers, une ligne par lot, passages qu'on glisse ou étire ; filtre par état et échelle | porte `btp_deplacer_passage` ; adresse (`?lots=`, `?zoom=`) |
| Fiche | composeur « Comment / Update » | « Question » posée au chantier (réponse dans Terrain › Questions) ; « Avenant » ouvre la fenêtre pré-remplie ; trombone = rattacher une facture | portes `poserQuestion`, `btp_ouvrir_avenant`, rattachement |
| Fiche | flèche de tri | tri des lots (nom, santé, priorité, fin, statut) ; tracé de Linear (AnimatedArrowUpDownIcon) | page |
| À ranger | étoile (liste / message) | épingle la page / le message | localStorage |
| À ranger | Accept / Decline | ranger dans un chantier / écarter avec motif (confirmation) | portes `rangerMessage`, `ecarterMessage` |
| À ranger | Mark as duplicate | choisir l'original, puis écarter celui-ci avec un motif qui le nomme (confirmation) | porte `ecarterMessage` |
| À ranger | Snooze, puce de cycle | reporter (demain, 3 jours, lundi, une semaine, date) ; « Afficher les reportés » | localStorage, adresse (`?reportes=1`) |
| À ranger | Copy URL / ID / git branch / as prompt | lien, « canal de X, reçu le … », texte, résumé pour l'assistant | presse-papier |
| À ranger | Subscribe, « … » | suivre l'expéditeur ; ouvrir un avenant ; copier le lien | localStorage ; porte `avenantDepuisMessage` |
| À ranger | Add sub-issues | « Ajouter un avenant » | porte `avenantDepuisMessage` |
| À ranger | boîte de commentaire | répondre par le canal du message : WhatsApp, SMS ou courriel s'ouvre avec le texte (confirmation, rien ne part de Daliro) ; sinon copie | lien `wa.me` / `sms:` / `mailto:`, presse-papier |
| À faire | « New issue », « + » de groupe | « Nouvelle tâche » : ouvrir une situation (fin de période pré-remplie avec la semaine ou le chantier du groupe) | porte `ouvrirSituation` |
| À faire | cases à cocher | barre d'actions : noter faits (confirmation), reporter, exporter, copier | porte `terminerPassage` ; localStorage ; CSV ; presse-papier |
| À faire | puce de cycle | semaine de la tâche (« S45 ») ; un clic filtre sur cette semaine | adresse (`?semaine=`) |
| Avenants | étoile / cloche | épingle la vue (onglet, filtre) / suit les chantiers montrés | localStorage |
| Avenants | « Nouvel avenant », « + » de colonne | fenêtre d'ouverture, de soumission, de signature ou d'abandon selon la colonne | portes (fenêtres de ChantierVue) |
| Avenants | troisième onglet, « … » de colonne, filtre, affichage | « Tous » ; masquer une colonne ; chantier et recherche ; tri et colonnes | adresse |
| Réglages | case à cocher de ligne | barre : valider les prix choisis (confirmation), exporter | porte `btp_valider_prix` ; CSV |
| Réglages | « New group » | « Nouveau corps d'état » : nommer le groupe et poser son premier prix | porte `btp_poser_prix` |
| Réglages | barre latérale Labels / Templates | bascule Bibliothèque / Organisation | adresse (`?page=organisation`) |
| Équipes (Bookings) | onglets Upcoming … Canceled | À venir, Non confirmés, Plusieurs jours, Passés, Annulés | adresse (`?onglet=`) |
| Équipes (Bookings) | Filter | intervenant, sous-traitants / équipes internes, chantier ; puces retirables | adresse (`?intervenant=`, `?type=`, `?chantier=`) |
| Équipes (Bookings) | Saved filters | filtres gardés (appliquer, oublier, enregistrer l'actuel) ; copier le planning affiché ; remettre les intervenants masqués (remplace « Set as default » et « les remettre » d'Availability) | localStorage ; presse-papier |
| Équipes (Bookings) | liste / calendrier | vue calendrier jour, semaine (64 px par heure, ligne « Journée »), mois | adresse (`?vue=`, `?echelle=`, `?jour=`) |
| Équipes (Bookings) | case à cocher | barre : copier la sélection, l'ajouter au calendrier (.ics) | presse-papier ; fichier .ics |
| Équipes (Bookings) | Reject / Confirm | noter la réponse « décliné » / « confirmé » (fenêtre, texte facultatif) | porte `btp_repondre_confirmation` |
| Équipes (Bookings) | drapeau rouge | remplaçants possibles (fenêtre de ChantierVue) | porte `btp_proposer_remplacants` |
| Équipes (Bookings) | menu ⋯ du détail | voir « Où sont passés les gestes » ; Request reschedule = relancer : WhatsApp, SMS ou courriel s'ouvre avec le texte relu (rien ne part de Daliro) | portes `btp_recaler`, `btp_deplacer_passage`, `btp_terminer_passage`, `btp_noter_indisponibilite`, `btp_annuler_indisponibilite` ; `wa.me` / `sms:` / `mailto:` ; localStorage (masquer) |
| Équipes (Bookings) | Join Cal Video ‖ ⧉, ⌃ ⌄ × | ouvrir le chantier ‖ copier le passage ; ligne précédente / suivante ; fermer | adresse ; presse-papier |
| Équipes (Bookings) | nom du participant | filtre sur l'intervenant ; dans le détail, « Ouvrir dans l'annuaire » ou « Renommer » (une de nos équipes, ce navigateur) | adresse ; localStorage |
| Équipes (Bookings) | « 10 ↕ rows per page », ‹ › | 10, 25 ou 50 lignes ; pages | adresse (`?n=`, `?page=`) |
| Annuaire | repli de la barre, View settings, Add column, épingle, éclair | colonnes, regroupement par rôle, colonne fixée, tri | localStorage ; adresse (`?cols=`, `?groupe=`, `?epingle=`, `?tri=`) |
| Annuaire | Import / Export | exporter la liste affichée (il n'y a pas d'import : l'annuaire se remplit par les chantiers) | CSV |
| Annuaire | « + New Person », « + » d'en-tête | nouvelle entreprise dans les Entreprises de l'espace (aucune porte ne crée un tiers, la fenêtre le dit) | localStorage |
| Annuaire | cases à cocher | exporter, copier les courriels, écrire à tous (mailto en copie cachée), épingler | CSV ; presse-papier ; mailto ; localStorage |
| Annuaire | Add calculation | décompte rempli / vide, % rempli, valeurs distinctes, date la plus proche, sur les lignes affichées | adresse (`?calc=`) |
| Annuaire, fiche | étoile, crayon, actions | épingler ; description locale ; écrire, appeler, note, disponibilités | localStorage ; mailto / tel ; liens |
| Annuaire, fiche | onglets Emails / Calls / Files / Notes / Tasks | coordonnées et échanges J-2 par ce canal ; factures de ses lots ; notes et tâches locales | données lues ; localStorage |

Superpositions refaites après ces ajouts (1440, sombre / clair) : vue d'ensemble 3.4 / 3.5 ; fiche 5.5 / 5.5 ;
À ranger 6.1 ; À faire 11.0 / 11.5 ; Avenants 12.5 / 13.6 ; Réglages 7.4 (bibliothèque), 3.7 / 4.1 (organisation) ;
Équipes (Bookings, 03/11) 8.7 / 8.3, 390 14.6 ; Annuaire 12.0 / 12.5, fiche 7.0 / 7.4.
Restent : sur Réglages, la bascule Bibliothèque / Organisation est posée dans la carte (la barre latérale de
réglages de Linear est la place de celle de l'espace 2) ; sur À faire à 390, la case à cocher est masquée (Linear
lui donne une largeur nulle) ; couleur de la case cochée (violet de l'espace) et du champ de commentaire en sombre
prises hors relevé.

## Approvisionnement — `/espace2/daliro/approvisionnement` (page nouvelle, 02/11/2026)

Lot « pages manquantes » (`PAGES-MANQUANTES.md`), branche `claude/pages-daliro` tirée de `main`. Choix faits en autonomie
(Teo absent), à valider.

- **Référence** : Plain, Tasks (liste + détail), comme proposé par le plan ; DALIRO ne l'avait pas encore prise.
  **Relevés** : `plain-tasks.md`, `plain-commun.md`. Captures `plain-tasks/1440-reel-{sombre,clair}.png`, `1440-sombre-detail.png`,
  `390-{sombre,clair}.png`. Aucun nouveau relevé.
- **Code** : `components/espace2/daliro/Approvisionnement.tsx`, `approvisionnement.ts` (échéances et exemple), `DalPlainIcone.tsx`,
  `dalp.css` (préfixe `dalp-` : le socle Plain déjà superposé pour TAMILA, `tamp.css` + `tamp-taches.css`, recopié sous le
  préfixe de DALIRO pour ne dépendre d'aucun fichier d'un autre métier), `app/espace2/daliro/approvisionnement/page.tsx`.
  Entrée de menu après « Avenants et situations » (`components/espace2/modules.ts`).
- **Correspondance** : My tasks · Todo · Done → **À commander · À livrer · Reçu** (les annulées, comme les CANCELLED de Plain,
  ne sont dans aucun onglet). TASK-n → la phrase d'échéance (« En retard depuis le 22 oct. », « Commander avant le 3 nov. »,
  « Promise le 4 déc., à décaler », « Manque 25 m² au bon », « À rendre depuis le 1 nov. ») ; titre → l'objet ; pastille du
  compte → le chantier ; avatar carré → le fournisseur. Last updated · Priority → **Échéance · Urgence** (+ « Exporter la liste
  (CSV) » sous un séparateur). Add new task T → **Nouvelle commande T** (chantier, objet, quantité, délai, fournisseur, passage
  ou date de besoin, matériel à rendre) ; dans la fenêtre, « Préparer la liste depuis le devis » (`preparerListe`, si la formule
  l'ouvre). Dans Reçu, la case est cochée (vert) quand plus rien n'est à faire, bleue s'il reste un retour ou un écart de bon.
- **Volet** (`?commande=`) : en-tête n° de commande (ou lot) + ⋯ + × ; case « To do » → l'étape suivante (Noter commandée
  `noterCommande`, Noter reçue `recevoir` ou `noterLivraison` selon la formule, Noter rendu `noterRetour`), chacune dans sa
  fenêtre ; « Assigned to me » → le fournisseur, choisi dans l'annuaire (`ecrireCommande`) ; « Handle with Agent » → **Copier pour
  l'assistant** (résumé de la commande et question, dans le presse-papier) ; titre et description → objet et note, modifiables
  tant que la commande n'est ni livrée ni annulée (`ecrireCommande`, à la sortie du champ) ; « Created … » → commandée le / à
  commander avant le / reçue le ; Account · Threads · Knowledge gap → Chantier (lien vers la fiche, Terrain › Appro), Passage,
  Quantité, Échéance, Commander, Livrer, Livraisons (bons, quantités, écart), Retour. Menu ⋯ : Reporter la livraison
  (`noterCommande` avec la nouvelle date promise), Reporter le retour (`noterRetour` avec `retour_prevu`), Ouvrir la fiche du
  chantier, Copier le lien, **Annuler la commande…** (motif obligatoire, confirmé : geste irréversible).
- **Données** : `chargerAppro` (`btp_appro_chantier`) pour chaque chantier en préparation, ouvert, suspendu ou réceptionné ;
  échéances calculées par la base. Exemple : 24 commandes sur les chantiers d'exemple (`approvisionnement.ts`), modifiées en
  mémoire, mêmes règles que `ApproCarte` (recopiées : la carte n'exporte pas ses fonctions et n'a pas été touchée).
  Portes inchangées, aucune migration, `portes.ts` intact.
- **Aiguillage** : les lignes d'approvisionnement du point du matin (b6_23, E07 à E12) portent `objet_type = btp_chantiers` ;
  elles mènent désormais à `/espace2/daliro/approvisionnement?chantier=<id>` (reconnues à leur texte, nouveau champ facultatif
  `texte` du repère, que `Point.tsx` passe déjà), les autres lignes du chantier à sa fiche. `?chantier=` filtre la page et
  s'affiche en pastille avec sa croix dans la barre d'onglets. `verifier-aiguillage.mjs` : « Chaque repère a sa page. »
- **Comparaisons** (`docs/refonte-metiers/comparaisons/daliro/`) : `appro-1440-{sombre,clair}.png`, `appro-{sombre,clair}-{cote,diff,fusion}.png`
  (`--ref-origine 353,8`) : 9.6 · 5.9 % / 8.5 · 5.8 % ; `appro-droite-*` (`--dx 49`, contenu calé à droite : carte de 1128 contre 1079)
  9.1 · 5.7 % / 8.0 · 5.7 % ; `appro-390-{sombre,clair}-{cote,diff,fusion}.png` (`--nous-origine 0,48`) 12.5 · 8.2 % / 13.3 · 8.9 % ;
  `appro-volet-1440-{sombre,clair}.png` et `appro-volet-sombre-cote.png` (côte à côte, référence agrandie depuis 800×500).
  Titre, barre d'onglets (49), ligne d'ajout (48), lignes de 49 tombent sur celles de Plain ; ce qui reste est du texte différent.
- **Recette** : pas de défilement de côté à 390, 768, 1024, 1440, 1700 (liste et volet ouvert) ; gestes joués sur l'exemple
  (commander, copier, annuler refusé sans motif puis accepté, export CSV, touche T), sans erreur de page.

Écarts restants :
- Motif admis (geste du métier) : pastille du chantier filtré dans la barre d'onglets ; lignes Passage, Quantité, Échéance,
  Commander, Livrer, Livraisons, Retour dans le volet (Plain en a trois) ; « Exporter la liste (CSV) » dans le menu de tri ;
  le statut « To do » porte l'état de la commande (« Livraison attendue »…).
- La pastille de présence verte de l'avatar est gardée (dessin de la référence) mais ne dit rien d'un fournisseur.
- Le plan proposait des groupes (à commander, en retard, livraisons de la semaine, à décaler, bons avec écart, matériel à
  rendre) : Plain Tasks n'a pas de groupes. Ces états sont dans la phrase d'échéance et le tri « Urgence » ; « Quoi livrer cette
  semaine ? » se lit dans À livrer trié par échéance.
- Non dessinés, faute de place dans la référence : sélection et actions groupées (Plain Tasks n'a ni cases de sélection ni
  barre d'actions).
- Sans back-end, non maquettés : aucun (toutes les fonctions du plan ont leur porte). La pièce jointe du bon (`p_piece`) n'est
  pas proposée : aucun envoi de fichier n'existe pour elle côté écran (même choix que la carte du chantier).
- Les rangées de Plain à 390 ont leur avatar sur la rangée du titre : repris ; à 390 Plain montre « Syncing » en haut à droite,
  propre à son application.

## Sections ajoutées après l'audit des promesses (02/11/2026, `PAGES-MANQUANTES.md`)

Accord de Teo (« oui fais-les »). Portes existantes seulement, aucune migration ; chaque ajout prend une brique de la
page de référence, sans dessin inventé.

| Page | Ajout | Brique de la référence | Ce qu'il fait | Par quoi |
|---|---|---|---|---|
| Vue d'ensemble | « Météo de la semaine » (`MeteoSemaine.tsx`) | une section de ressources de l'accueil d'équipe (comme « Vos chantiers ») | une ligne par échange proposé pour toute l'entreprise : passage extérieur menacé (pluie, rafales, gel) contre un passage intérieur de la même équipe un jour sec ; un clic ouvre la confirmation, puis l'échange | portes `ordreMeteo(client)` (`btp_ordre_meteo`), `echangerPassages` (`btp_echanger_passages`) ; en exemple, la règle de la carte Météo |
| À faire | tâches de commande et de livraison | lignes de My issues (même grille, puces « Commande », « Livraison », « Matériel à rendre ») | motifs E07 à E12 du point du matin : commander (en retard ou bientôt), livraison attendue ou tardive, matériel à rendre, manque au bon de livraison ; le geste mène à la fiche, Terrain › Approvisionnement | porte `chargerAppro` (`btp_appro_chantier`) par chantier ouvert, échéances de `btp_echeances_commande` (reprises de la carte Appro) |
| Réglages, Organisation | « Journal des validations » | une ligne de modèle (Issue templates) | ouvre l'activité de l'espace filtrée sur Daliro (avenants, situations, prix demandés, validés ou refusés) | adresse `/espace2/activite?modules=daliro` |
| Fiche, planning | « Affecter ce remplaçant » | — | **manque** : aucune porte ne change l'intervenant d'un passage (`btp_proposer_remplacants` ne fait que lister les candidats ; aucune fonction `btp_*` n'écrit `btp_passages.tiers_id`). La fenêtre « Remplaçants possibles » reste une liste avec téléphone et courriel. À décider par Teo : une porte `btp_affecter_remplacant` (migration) | — |

Exemple : Villa Duret reçoit deux passages de l'Équipe A (« Lames de rive », dehors le jour de l'averse ; « Habillage du
local technique », dedans un jour sec) pour que la météo de la semaine ait un échange à proposer ; les tâches de
commande d'exemple sont celles de la carte Appro, écrites pour les Tilleuls.
