# TAMILA — chaque sous-page et sa page de référence (refonte du 02/11/2026)

Règles : `REGLES.md` (Teo, 01/11) et `cloud/COMMUN.md`, `cloud/TAMILA.md`. Branche `claude/copie-tamila`.
Code : `app/espace2/tamila/*`, `components/espace2/tamila/*` (préfixes `tam-` pour Linear, `tamp-` pour Plain).
Relevés : branche `claude/refs-linear-49bf64` (Linear, `plain-tasks`, `plain-tenants`) et
`claude/refs-plain-attio-cal-a3a72b` (`plain-commun`, `plain-insights`, `plain-tasks`, `plain-tenants`).

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
