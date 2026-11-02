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
