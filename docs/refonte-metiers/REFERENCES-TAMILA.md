# TAMILA — chaque sous-page et sa page de référence (refonte du 02/11/2026)

Règles : `REGLES.md` (Teo, 01/11) et `cloud/COMMUN.md`, `cloud/TAMILA.md`. Branche `claude/copie-tamila`.
Code : `app/espace2/tamila/*`, `components/espace2/tamila/*` (préfixes `tam-` pour Linear, `tamp-` pour Plain).
Relevés : branche `claude/refs-linear-49bf64` (Linear, `plain-tasks`, `plain-tenants`) et
`claude/refs-plain-attio-cal-a3a72b` (`plain-commun`, `plain-insights`, `plain-tasks`, `plain-tenants`).

## En bref (sous-page → référence → relevé → superposition 1440, écart moyen sombre / clair)

| Sous-page | Référence | Relevé | Superposition |
|---|---|---|---|
| Vue d'ensemble `/espace2/tamila` | Linear, My issues | `linear-my-issues.md` | 11,6 / 12,1 sur 255 (contenu) ; géométrie au pixel |
| Arrivées `/arrivees` | Linear, Triage | `linear-triage.md` | 6,0 / 6,0 |
| Dossier `/dossiers/[id]` | Linear, Initiative | `linear-initiative.md` | 5,9 / 6,0 |
| Honoraires du cabinet `/honoraires` | Plain, Accounts | `plain-tenants.md` | 9,2 / 8,2 |
| Pilotage `/pilotage` | Plain, Insights | `plain-insights.md` | 9,5 / 9,5 |
| Conformité du cabinet `/conformite` | Plain, Tasks | `plain-tasks.md` | 9,2 / 8,0 |
| Réglages `/reglages` | Linear, Settings › Team | `linear-team-settings.md` | 3,6 / 4,1 |
| Dossier de faits `/dossiers/[id]/faits` (pages manquantes, 02/11) | Linear, page d'un ticket | `linear-ticket.md` | 7,6 / 7,6 |

Ce qui reste dans l'écart moyen est le contenu (textes, nombres, longueurs) : les positions, tailles, couleurs et rayons mesurés
(`tam-mesure.mjs`) tombent sur ceux des relevés, à 1 px près, sauf les écarts écrits page par page ci-dessous.

## Outils de preuve

- `outils/tam-capture.mjs <url> <largeur> <sombre|clair> <sortie>` : Playwright, `deviceScaleFactor: 1`, 1440×900 ou 390×844,
  thème d'espace2 et `colorScheme` posés avant le chargement, données d'exemple.
- `outils/tam-superpose.py nous.png ref.png prefixe [--ref plain] [--dx N]` : carte contre carte (la nôtre à 304,56 sous la coquille
  d'espace2 ; Linear à 244,8 ; Plain à 353,8), côte à côte, différence ×4, fusion à 50 %.
- `outils/tam-preuve.sh <nom> <url> <captures de référence> [linear|plain]` : les deux thèmes à 1440 et à 390, images dans
  `comparaisons/tamila/<nom>-*`.
- `outils/tam-mesure.mjs <url> <largeur> <sélecteurs…>` : positions et styles calculés, relatifs à la carte, à comparer aux relevés.
- `outils/tam-icones.mjs` : génère `TamIcone.tsx` à partir du sprite de Linear et des tracés de Plain relevés (aucune icône dessinée).

## Écarts communs à toutes les sous-pages (seuls admis, avec leur raison)

| Écart | Raison |
|---|---|
| La carte commence à 304,56 et fait 1128 de large (Linear : 244,8 et 1188 ; Plain : 353,8 et 1079) | La coquille d'espace2 (barre du haut 48, rail et volet 304) tient la place de la barre latérale du SaaS, qui n'appartient pas à la page copiée. Les éléments alignés à droite sont décalés d'autant ; la superposition se fait carte contre carte. |
| Marge basse de la carte 8 (Linear 36) | Les 28 px de plus portent chez Linear la barre « Agent », absente ici. |
| À 390 : pas de bouton « Menu » de Linear dans l'en-tête de la carte | Le bouton qui ouvre la navigation est déjà dans la barre du haut d'espace2. |
| Textes (titres, noms, dates en français, références « 2026-0412 » au lieu de « OME-21 ») | Seul le contenu change (règle 1). La colonne « identifiant » de Linear prend la largeur de l'identifiant le plus long (`max-content`) : elle passe de 55 à 69 px, et ce qui suit se décale de 14 px. |
| Avatars : initiales sur une teinte | Les personnes du cabinet n'ont pas de photo ; même taille, même place, même rayon. |
| Les gestes du métier sans place dans la référence passent par une fenêtre (`TamFenetre.tsx`) habillée des jetons du menu de Linear | La fenêtre de Linear (« Add link to initiative ») est nommée dans le relevé mais pas mesurée ; ses jetons de menu (fond, bord 0,5, ombre, r 12) le sont. |
| Whyte (titres de Plain) → Manrope (`--v2-titre`) | Whyte est une police commerciale (Dinamo) ; même substitut que les autres copies Plain d'espace2. |

## Vue d'ensemble — `/espace2/tamila`

- **Référence** : Linear, My issues (Assigned). **Relevé** : `linear-my-issues.md`. Captures `linear-my-issues/1440-reel-*.png`, `390-*.png`.
- **Correspondance** : onglets Assigned · Created · Subscribed · Activity → Échéances · Dossiers · Clos · À décider ;
  « New issue » → « Nouveau dossier » (B16, G2) ; groupes Urgent issues / Cycle 1 / Cycle 2 → Délais à confirmer / Sous 15 jours
  (dates) / Au-delà (dates) ; colonnes priorité (temps qui reste : dépassé ou ≤ 2 j Urgent, ≤ 7 High, ≤ 15 Medium, sinon Low),
  identifiant (référence du dossier), statut, titre (échéance), puces (genre, dossier, J-n, date d'échéance barrée en rouge si
  dépassée), avatar (responsable), date de création. Filtre → les cinq compteurs-filtres (B9, L3) ; Affichage → grouper par
  statut ou par responsable ; « Open details » → volet « Compteurs » (B9). Onglet Dossiers = liste B10 groupée par statut.
  Bandeaux B3-B6 (réel : installation, coffre, phrase, hors vue) en tête de liste ; « La phrase du cabinet » (B15) en fenêtre.
- **Adresse** : `?vue=dossiers&filtre=a_confirmer|proches|audiences|ouverts|clos` (atterrissage E1-E3, E6, E10).
- **Comparaisons** : `comparaisons/tamila/vue-ensemble-1440-{sombre,clair}-{cote,diff,fusion}.png`, `vue-ensemble-390-{sombre,clair}-cote.png`.
  Mesures (`tam-mesure.mjs`) : titre, onglets, en-tête de groupe, lignes, case, priorité, identifiant tombent aux mêmes coordonnées
  que le relevé (relatives à la carte : 9/52, 9/88,5, lignes 44, priorité 43, identifiant 67).
- **Écarts restants** : le contenu (textes, nombre de puces par ligne) ; couleurs du cercle « Todo » et du triangle de repli en
  sombre lues sur la capture (217 et 51), le relevé ne donnant que le clair.

## Arrivées — `/espace2/tamila/arrivees`

- **Référence** : Linear, Triage (liste + élément ouvert). **Relevé** : `linear-triage.md`. Captures `linear-triage/1440-reel-*.png`,
  `1440-sombre-element-ouvert.png`, `390-*.png`.
- **Correspondance** : la file = les avis RPVA reçus par courriel à rattacher (B7) ; ligne : sujet, n° RG cité (identifiant),
  expéditeur, priorité tirée de l'effacement de la copie en clair (7 jours), « il y a ». Élément ouvert (`?avis=<id>`) : fil, titre,
  pilules (À rattacher, type supposé, dossier proposé par le même n° RG, pièces jointes, effacement), texte du courriel, Activité
  (envoi, avertissement de transit en clair), et le rattachement (B8, G7) à la place de la boîte de commentaire. Barre de triage
  Accept · Decline · Duplicate · Snooze → Rattacher · Écarter · Écarter comme doublon · Écarter, déjà saisi à la main (G8 ; chaque
  écart passe par une fenêtre de confirmation, motif modifiable). Filtre : tous / dossier proposé / sans dossier lisible ; Affichage :
  les plus récents / effacés le plus tôt. Étoile : favori gardé dans ce navigateur. État vide : l'illustration de Linear, prise telle
  quelle sur les captures de référence (`public/espace2/tamila/triage-vide-*.png`), « N avis à rattacher ».
- **Comparaisons** : `arrivees-1440-{sombre,clair}-{cote,diff,fusion}.png` (moitié droite vide, écart moyen 6/255),
  `arrivees-1440-sombre-ouvert-cote.png` (élément ouvert, côte à côte avec `1440-sombre-element-ouvert.png`),
  `arrivees-390-{sombre,clair}-cote.png`. Mesures : titre 19/14,5, lignes 9/53 384×59, titre de ligne 23/63, deuxième ligne 85,
  titre de l'élément ouvert (bloc) à 98, pilules à 170, description à 219 — ceux du relevé.
- **Écarts restants** : pas de sous-tickets, de réactions ni de bouton double « Copy as prompt | Choose coding tool » (rien de tel dans
  le métier) ; la barre flottante garde deux boutons ronds (ouvrir le dossier proposé, copier le n° RG) ; icônes de la barre de triage :
  `Resolved`, `StatusCanceled`, `StatusDuplicate`, `AlarmClock` du sprite (les icônes exactes Accept/Decline/Snooze ne sont pas
  relevées) ; l'état vide est centré dans une carte plus basse de 20 px (illustration 8 px plus haut).

## Réglages — `/espace2/tamila/reglages`

- **Référence** : Linear, Settings › Team. **Relevé** : `linear-team-settings.md`. Captures `linear-team-settings/1440-reel-*.png`, `390-*.png`.
- **Correspondance** : « ‹ Teams » → « ‹ Dossiers » ; « Omega » → nom du cabinet (en-tête des factures) ; « Team overview › » → « Vue
  d'ensemble › ». Cartes : (sans titre) Installation (B3, G1), Personnes du cabinet, Phrase du cabinet (B15, L1) · « Clés et
  chiffrement » : Coffre à clés (B14, G3, G4), Clé d'index du cabinet (G57), Clé de chaque dossier, Journal des lectures · « Factures et
  bordereaux » : En-tête des factures et Délai de paiement (B32, G56) · « Conservation » (aide, comme « Team hierarchy ») : effacement
  après clôture, exports, audit (lecture seule : rangées verrouillées comme « Available on Business ») · « Zone sensible » (Danger
  zone) : Passer au coffre…, Ré-envelopper…, Oublier… (fenêtres de confirmation). Une rangée hors des droits de la personne est
  verrouillée avec sa raison (« Réservé au gérant »…).
- **Comparaisons** : `reglages-1440-{sombre,clair}-{cote,diff,fusion}.png` (superposées avec `--dx -30` : la colonne de 640 est centrée
  dans une carte plus étroite de 60), `reglages-390-{sombre,clair}-cote.png`. Mesures : lien retour 9/11, titre 65, sous-titre 102,
  première carte 157 (rangées 65), h3 suivant 400, carte 439 — ceux du relevé.
- **Écarts restants** : survol d'une rangée en sombre non relevé (pas suivant du fond de carte) ; à 390, descriptions plus longues
  sur trois lignes (contenu).

## Honoraires du cabinet — `/espace2/tamila/honoraires`

- **Référence** : Plain, Accounts (ex-Tenants), liste. **Relevés** : `plain-tenants.md` + `plain-commun.md`. Captures
  `plain-tenants/1440-reel-*.png`, `1440-clair-menu-colonne.png`, `1440-clair-menu-display.png`, `390-*.png`.
- **Correspondance** : B12 (une fenêtre dans l'écran d'avant) devient la page. Colonnes Name · Open threads · Tier · Source · Ville ·
  MRR · Renouvellement · Contrat actif · Modules · ⋯ → Dossier (intitulé) · À facturer HT (tri par défaut, décroissant) · Convention
  (pastille losanges, couleurs des tiers) · Référence · Responsable · Temps non facturé · Provisions disponibles · Convention signée
  (Oui/Non) · À faire (pastilles empilées : sans convention, impayée > 30 j, forfait ≥ 80 %, clos avec du temps non facturé) ; « ⋯ »
  et Display montrent Reste dû, Facturé et Encaissé de l'année. Menu de colonne (Tri croissant / décroissant / Masquer), « Trié par … ×».
  Filters (touche F) : tous / à facturer / à traiter (L6, `?filtre=a_facturer|signaux`, atterrissage E8, E9). « Create account » →
  « Exporter (CSV) » (L7). Toute la ligne mène à la page du dossier, onglet Honoraires (L5). Le pied (« Load more ») porte les totaux
  du cabinet. Lecture : `chargerHonorairesCabinet` (via `chargerPilotage`), aucun dossier ouvert.
- **Comparaisons** : `honoraires-1440-{sombre,clair}-{cote,diff,fusion}.png`, `honoraires-390-{sombre,clair}-cote.png`. Mesures : titre
  24/30, recherche 20/94, en-têtes 146 (32), lignes de 59,5 avec une pastille, nom à 32/194 — ceux du relevé.
- **Écarts restants** : icônes des colonnes de champs (texte, nombre, date, booléen) non relevées chez Plain → icônes du sprite de
  Linear à 14 ; œil de Display non relevé → cercle Todo/Done de Linear ; les intitulés longs sont tronqués comme les noms de Plain à 390.

## Conformité du cabinet — `/espace2/tamila/conformite`

- **Référence** : Plain, Tasks (liste + détail). **Relevé** : `plain-tasks.md`. Captures `plain-tasks/1440-reel-*.png`, `1440-sombre-detail.png`,
  `390-*.png`.
- **Correspondance** : les deux vues cabinet qui manquaient (§ 8.5-2) en tâches : conflit d'intérêts sans décision (E7), parties jamais
  contrôlées, vigilance LCB-FT à faire, temps proposé à la saisie (E4, pour la personne qui regarde) ; « Faits » : vigilances revues.
  Onglets My tasks · Todo · Done → À moi · À traiter · Faits ; tri Last updated · Priority → Dernière date · Priorité ; « Add new task T »
  → « Ouvrir un dossier (contrôle à l'entrée) T » (B16). Ligne : case, référence (ID), titre, pastille du dossier (compte), avatar carré
  du responsable avec pastille de présence. Tâche ouverte (`?tache=…`) : liste à deux étages, volet de 360 (référence, « À faire »,
  « Assigné à … », « Traiter dans le dossier » à la place de « Handle with Agent », titre, depuis, description, Dossier / Origine / Règle).
  Les décisions (G59), la vigilance (G60) et la saisie du temps (G44-G46) se font dans la page du dossier, avec leurs fenêtres.
  Lecture : `tamila_conformite` par dossier vivant (sans trace) ; aucun dossier ouvert. Le journal des accès (B38) reste dans la page de
  chaque dossier : le lire est lui-même tracé, on ne le lit pas pour tout le cabinet sans le demander.
- **Comparaisons** : `conformite-1440-{sombre,clair}-{cote,diff,fusion}.png`, `conformite-1440-sombre-ouvert-cote.png` (côte à côte avec
  `1440-sombre-detail.png`), `conformite-390-{sombre,clair}-cote.png`. Mesures : titre 24/24, barre d'onglets 80 (49), ajout 129 (48),
  première tâche 177 (49), ID à 54 — ceux du relevé.
- **Écarts restants** : piste des onglets à 14 du bord (mesurée sur l'onglet actif) au lieu des 24 du padding relevé ; en exemple, l'état
  de conformité des dix dossiers ajoutés est tiré de leur rang (vigilance un sur deux, une partie non contrôlée un sur trois).

## Pilotage du cabinet — `/espace2/tamila/pilotage`

- **Référence** : Plain, Insights › Reporting. **Relevé** : `plain-insights.md` (+ `plain-commun.md`). Captures `plain-insights/1440-reel-*.png`,
  `1440-clair-1-overview.png` à `6`, `390-*-chargement.png` (à 390, Plain n'a montré que son état de chargement).
- **Correspondance** : B13 (une fenêtre à cinq vues dans l'écran d'avant), calculé par `pilotage.ts` inchangé. Filter · Group by ·
  Timeframe · Granularity → Filtre (un responsable) · Grouper par (responsable, matière, juridiction) · Période (7, 30, 60, 90 jours :
  fenêtre des graphiques et seuil « sans diligence ») · Coût horaire (L8, gardé dans ce navigateur, `omega.tamila.cout_horaire`).
  Sections : Overview → Vue d'ensemble (dossiers vivants en courbe, marge du cabinet, sans diligence) ; Support volume → Charge (temps
  saisi par jour avec la moyenne en pointillés et le signal « Investigate this spike » → « Un jour chargé à regarder », échéances par jour ;
  répartitions par personne et « Dossiers par … ») ; Marge par dossier (marge, taux réalisé, temps passé) ; Séries, diligence et pièces
  attendues. Une ligne de répartition qui nomme un dossier mène à sa page (L5). Pied « Customers helped » → « Dossiers suivis » (compteur
  à volets).
- **Comparaisons** : `pilotage-1440-{sombre,clair}-{cote,diff,fusion}.png`, `pilotage-390-{sombre,clair}-cote.png`. Mesures : titre 24/30,
  boutons 30 à y 32, zone à 86, titre de section à 111, première carte à 146 (titre 158, valeur 189, graphique 249) — ceux du relevé.
- **Écarts restants** : graphiques en SVG dessinés ici aux couleurs et mesures relevées (barres 15 rx 2, #8a94ed / #4252e1 / #d2d6f8, grille
  bord-2, moyenne pointillée) plutôt que Recharts ; pas de bouton « Ask Agent » sur les cartes (aucun agent dans Tamila) ; à 390, les
  quatre boutons passent sur trois lignes (libellés plus longs) ; le deuxième titre de section tombe 6 px plus haut.

## Dossier — `/espace2/tamila/dossiers/[id]`

- **Référence** : Linear, page d'une Initiative (Overview, Projects, volet « Initiative details »). **Relevé** : `linear-initiative.md`.
  Captures `linear-initiative/1440-reel-*.png`, `1440-sombre-volet-details.png`, `1440-sombre-onglet-projects-volet.png`, `390-*.png`.
- **Correspondance** : fil « Initiatives › nom » → « Dossiers › référence · intitulé » ; étoile ; « … » = gestes du dossier (exporter G10,
  clôturer G11, annuler la clôture G12, convertir l'audit G13, membre G62, muraille G63, agenda L11, bordereau L12, journal L17) ; copier
  l'adresse ; notifications → journal des accès ; « + » = ajouter (partie G14, appel G17, délai G18, date fixée G19, audience G25, avis
  G61, pièce G43, et selon l'onglet pièce attendue G27, temps G44). Onglets Overview · Activity · Projects (+ vue) → Vue d'ensemble ·
  Procédure · Pièces · Honoraires · Conformité (+ agenda .ics) ; « Open Initiative details » (⌘ I) → volet : la ligne choisie (propriétés
  et gestes), Propriétés du dossier (B18), Activité (journal, B38).
  Vue d'ensemble : tuile, intitulé, résumé (RG, matière, mode, juridiction), Properties (statut, priorité tirée de la prochaine échéance,
  responsable, date clé), Resources (archives prêtes, G66 ; « + » = exporter), Latest update → « Prochaine échéance » (santé : dans les
  temps / à confirmer / en retard ; décisions en attente avec Approuver / Refuser, G9 ; Confirmer G20 ; Acte déposé G23), Description →
  Parties (B19), Projects → Échéances (délais B20 et audiences B21 dans le tableau de Linear).
  Procédure : Appel, Délais (Confirmer, Corriger, Interrompre, Acte déposé, Annuler : G20-G24), Audiences (G26), Avis RPVA (B35),
  Expertise (B24 : dates G31-G32, étapes G33-G36). Pièces : pièces (B28), pièces attendues (B22 : G27-G30), lectures (B26 : G37-G41
  avec confirmation, Lire L13 → la fenêtre B27 avec Word/PDF L14 et « Réclamer au confrère » G42), bordereau (B29). Honoraires : B30-B32
  (convention, proposé à la saisie, temps, provisions, factures ; G44-G55, impression L16). Conformité : conflits et vigilance en
  premier (B33-B34, G57-G60), parties (G14-G16), qui voit le dossier et murailles (B36, G62-G65), exports (B37, G66), journal (B38, L17).
- **Comment** : les composants de l'écran d'avant (`DossierTamila`, `HonorairesTamila`, `ConformiteTamila`, `AttentesTamila`,
  `ExpertiseTamila`, `AnalysesTamila`) prennent un `rendu` : avec lui, ils ne rendent plus leurs cartes, seulement leurs fenêtres, et
  donnent leurs données et leurs gestes au dessin de l'espace 2. Sans `rendu`, rien ne change (`/espace/tamila`, `?ancien=1`). Les gestes
  sans fenêtre qui écrivent (retirer une partie ou un membre, demander une levée, annuler une clôture, convertir un audit, noter une étape
  d'expertise ou une pièce attendue, ignorer une proposition, annuler un temps, demander une lecture) passent par une confirmation.
- **Comparaisons** : `dossier-1440-{sombre,clair}-{cote,diff,fusion}.png` (`--dx -31` : colonne de 805 centrée dans une carte plus
  étroite), `dossier-1440-sombre-volet-cote.png` (ligne choisie et volet, à côté de `1440-sombre-volet-details.png`),
  `dossier-1440-sombre-procedure-cote.png` (tableau, à côté de `1440-sombre-onglet-projects-volet.png`), `dossier-390-{sombre,clair}-cote.png`.
  Mesures : tuile 152, titre 200, résumé 232 (texte 236), Propriétés 279 (pilules à +81), Ressources 319, carte « Latest update » 363
  (méta 412, texte 448, actions 512, fin 557), Description 569, section suivante 92 plus bas — celles du relevé.
- **Écarts restants** : les fenêtres des gestes (B39, B31, B34, B23, B25, B27) gardent l'habillage de l'écran d'avant (Linear n'a pas
  ces formulaires) ; l'onglet Projects de Linear est une frise (Timeline) — ici, Procédure est le tableau de la vue d'ensemble, que
  Linear montre lui-même à 390 à la place de la frise ; pas de réactions ni de commentaires sous la carte (rien de tel dans le métier).

## Dossier de faits — `/espace2/tamila/dossiers/[id]/faits` (pages manquantes, 02/11/2026)

- **Pourquoi** : `PAGES-MANQUANTES.md` — « Chronologie sourcée », « Dossier de faits daté et sourcé », « Contradictions relevées…
  côte à côte », « Dossier de plaidoirie et renvois cliquables », « L'ensemble de la pré-lecture » n'avaient qu'une fenêtre « Lire »
  (B27). Branche `claude/pages-tamila`, tirée de `main`. Code : `components/espace2/tamila/DossierFaits.tsx`, `faitsExemple.ts`,
  `tam-ticket.css` (préfixe `tk-`), route `app/espace2/tamila/dossiers/[id]/faits/page.tsx` (`?ancien=1` : l'écran d'avant).
- **Référence** : Linear, page d'un ticket en plein écran (OME-19). **Relevé** : `linear-ticket.md`. Captures `linear-ticket/1440-reel-*-OME-19.png`,
  `390-*-OME-19.png`, `1024-sombre-OME-19.png`, `768-sombre-OME-19.png`. Libre pour Tamila (prise par Lorani permis et Tavaro contrat,
  jamais par Tamila).
- **Choix de la référence (le plan proposait Timeline ou ticket)** : le ticket. Un dossier de faits se lit comme un document — titre,
  résumé, liste de faits, puis chaque fait avec ses sources — ce que la page d'un ticket porte telle quelle (description, Sub-issues,
  Activity en cartes). La Timeline de Linear ne montre ni texte ni citation : une chronologie de 5 à 30 faits datés au jour, au mois ou à
  l'année y deviendrait des barres sans extrait ni renvoi, et les contradictions, les pièces citées et la pré-lecture n'y auraient pas de
  place. Tamila a aussi déjà pris l'Initiative, dont l'onglet Projects est une frise.
- **Correspondance** : fil « Initiatives › OME-19 titre » → « Dossiers › 2026-0412 Dossier de faits » ; étoile → ouvrir d'office ce dossier de
  faits sur cette lecture (gardé dans ce navigateur, `omega.tamila.faits.lecture`) ; « … » → Word, Imprimer ou PDF, Copier pour l'assistant,
  Copier les renvois, Redemander cette lecture, Ouvrir la fiche ; Accept · Decline · Mark as duplicate · Snooze → Word · PDF · Redemander
  (confirmation) · Lectures du dossier (menu) ; barre d'outils Copy issue URL · Copy issue ID · Copy branch name · « Copy as prompt | Choose
  coding tool » → copier l'adresse · la référence du dossier · les renvois · « Copier pour l'assistant | format » (Markdown, texte brut,
  renvois seuls). Titre → « Dossier de faits · chronologie : intitulé (RG …) » ; description → le résumé du lecteur (avis « partielle » sous le
  résumé) ; réaction · pièce jointe → copier le résumé · pièces lues (menu, ouvertes déchiffrées). Sub-issues → Faits / Contradictions / Pièces
  citées : jauge = faits dont toutes les citations sont retrouvées, filtre (tous, à vérifier, citation non retrouvée, par acteur), « + » =
  demander une lecture (G37-G41, avec confirmation : coût facturé) ; ligne : icône de gravité (fait vérifié, à vérifier, critique, citation
  non retrouvée), date du fait, titre, avatar de l'acteur ; un clic mène à sa carte. Activity → Sources : « Unsubscribe » → Replier / Déplier
  les sources ; rond d'avatars → les acteurs (filtre) ; l'événement « created the issue » → « Le lecteur a rendu N constats · il y a » ; une
  carte de commentaire = un fait (tête : acteur, date ; corps : titre et texte ; au survol : copier, « … » ouvrir chaque pièce, réclamer,
  filtrer) ; le pied « Leave a reply… » = le renvoi « extrait » — pièce, p., l. cliquable (la pièce déchiffrée ouverte à la page), trombone
  (ouvrir), flèche (copier le renvoi) ; une contradiction met ses deux pieds côte à côte ; une pièce citée absente porte « Réclamer au
  confrère » (G42, confirmation). Properties → Lecture (type : menu des lectures, état, pièces lues, date) ; Labels → Acteurs (pastilles
  9×9, filtre) ; Project → Dossier (lien vers la fiche).
- **Données** : `portes.chargerAnalyses` (b4_15), résultat déchiffré exactement comme la fenêtre « Lire » (`lireResultat(dechiffrer(cle,
  resultat_chiffre))`), clé du trousseau du layout ouvert par `useTamila().ouvrir` (consultation tracée, comme la fiche) ; pièces citées
  comparées aux pièces attendues déchiffrées (`chargerAttentes`) ; Word et impression par `htmlAnalyse`. Aucune migration, `portes.ts`
  inchangé. En exemple : `faitsExemple.ts` (dossier 2026-0412 : chronologie 5 faits, contradictions 2, pièces citées 3, pré-lecture en cours).
- **Lien** : fiche du dossier, menu « … » → « Dossier de faits » (seule ligne ajoutée à `PageDossier.tsx`). **Aiguillage** : aucune règle
  ajoutée (les lectures ne produisent aucun lien en base ; `tamila_dossier` mène toujours à la fiche) ; `verifier-aiguillage.mjs` vert.
- **Comparaisons** : `comparaisons/tamila/faits-1440-{sombre,clair}-{cote,diff,fusion}.png` (`--dx -30` : colonnes de 667,5 et 375,7 centrées
  dans une carte plus étroite de 60), `faits-1440-sombre-contradictions-cote.png` (contradictions côte à côte), `faits-390-{sombre,clair}-cote.png`.
  Mesures (`tam-mesure.mjs`, relatives à la carte) : titre 105, description 183, réactions 266, en-tête des faits 308, lignes 344 (36), filet 540,
  « Sources » 559, événement 608, première carte 643 (tête +16, texte +41, pied +80), « Lecture » 119, pilules toutes les 32 — celles du relevé
  à 1 px près. Recette sans défilement de côté : 390, 768, 1024, 1440, 1700.
- **Écarts restants** : pas de « Leave a comment… » ni de réponse sous les cartes, pas de réactions (aucun commentaire en base pour une
  lecture : non maquetté) ; icônes « Copy issue ID », « Copy branch name », « Add reaction » et le sélecteur d'outil non relevés → `Page`,
  `Link`, `Comment`, `Agent` et un triangle du sprite de Linear ; la flèche d'envoi du pied est tracée ici (non relevée) ; la date du fait
  s'ajoute avant le titre de ligne (rien de tel dans les sous-tickets) ; couleurs des pastilles d'acteur autres que le vert « Client » non
  relevées ; la fenêtre de confirmation est `TamFenetre` (écart commun). En exemple, les pièces ne s'ouvrent pas (aucune pièce chiffrée).
- **Sans back-end, non construit** : « Dispositif contre motifs (art. 954) », « Prétentions nouvelles », « sommation prête », « Index des
  personnes », « Premier jet de l'exposé » (déjà notés dans `PAGES-MANQUANTES.md`).
