# TAVARO — sous-pages, références, preuves

Refonte du 02/11/2026 dans le cloud (consignes `docs/refonte-metiers/cloud/COMMUN.md` et `TAVARO.md`,
règles `REGLES.md`). Code : `app/espace2/tavaro/*`, `components/espace2/tavaro/*` (préfixe `tav-`).
Données partagées : `components/espace2/tavaro/donnees.tsx` (le code des gestes d'`EcranTavaro`, ligne pour
ligne ; même portes `components/espace/tavaro/portes.ts`, aucune migration). Ancien écran : `?ancien=1` sur
la racine. Bascule Exemple / Réel : celle de la coquille d'espace 2, lue par `useSource()`.

## Méthode de preuve

- `npx next dev`, puis `node outils/tav-capture.mjs <url> <préfixe> 1440,390 sombre,clair` : Chromium
  headless, fenêtre 1440×900 (390×844), `deviceScaleFactor: 1`, `colorScheme` sombre / clair, source exemple.
- `python3 outils/tav-superpose.py nous.png ref.png <préfixe> [--dx N]` : carte contre carte (la nôtre est à
  304,56 dans la coquille d'espace 2 ; celle de Linear à 245,9), côte à côte (`-cote`), différence ×4
  (`-diff`) et fondu à 50 % (`-fusion`). Référence : `captures/<page>/1440-reel-*.png` des relevés.
- Notre carte fait 1128 de large (coquille : barre du haut 48, barres latérales 304), celle de Linear 1187 :
  une colonne centrée est décalée de 29,5 px ; `--dx -30` aligne le contenu, `--dx 0` l'en-tête.
- Images : `docs/refonte-metiers/comparaisons/tavaro/`.

## Sous-pages

| Sous-page | Route | Référence | Relevé | Comparaisons | État |
|---|---|---|---|---|---|
| Vue d'ensemble | `/espace2/tavaro` | Linear, accueil d'une équipe | `linear-home.md` | `vue-1440-{sombre,clair}-{cote,diff,fusion}.png` (contenu, `--dx -30`), `vue-1440-*-entete-*` (en-tête), `vue-390-sombre-cote.png` | superposé ; écarts ci-dessous |

## Écarts restants, avec leur raison

### Vue d'ensemble

- **Étoile « Add to favorites »** absente de la ligne 1 : Tavaro n'a pas de favoris ; aucun geste du métier ne s'y range.
- **Plusieurs sections de ressources** (Véhicules inactifs, Réservations à risque, Contrats à risque, Montée en
  gamme) au lieu d'une : ce sont les « sections » de Team resources de Linear (bouton « Add section »), une par
  analyse du matin (B39-B42) ; la page est donc plus longue que la référence (4 rangées chez Linear). Mêmes
  mesures de section et de rangée.
- **Complément tertiaire en bout de rangée** (agence, échéance, état du contrôle) : les rangées de Linear n'ont que
  le titre et, pour un lien, la flèche ↗ tertiaire ; le complément prend sa couleur et sa taille. Masqué à 768 et moins.
- **Compte à côté des liens « Aller à »** (B02, B03) : les compteurs-filtres de l'écran d'avant, sans place dans la
  référence ; même typo que le libellé, graisse 450, tertiaire.
- **Puce « Agences »** au lieu de « Members » : le filtre d'agence (B07, § 8.3-5), avatar 18 + chevron dans la
  puce de 26 ; le menu est celui de « … » (Team actions).
- **Onglets** : Vue d'ensemble, Questions (B33), Retours, Parc ; Questions s'ouvre dans la même page
  (`?vue=questions`), les deux autres mènent aux sous-pages.
- **Fenêtres** F26 (contrôle des pièces), poser une question (G43) et lire une réponse : la fenêtre de l'espace 2
  (`components/ui/dialog`), Linear n'en a pas sur cette page.

## Inventaire : où va chaque bloc (au fil des sous-pages)

| Bloc / geste | Sous-page | Place dans la référence |
|---|---|---|
| B01 titre et phrase | Vue d'ensemble | nom de l'équipe et description |
| B02 compteurs-filtres, B03 à encaisser | Vue d'ensemble (liens) ; Retours à facturer (filtres) | « Go to » |
| B04, B05 (base muette, sans compte) | toutes | texte d'aide |
| B07 filtre d'agence | toutes (état partagé) | puce « Members » |
| B33 Questions, G43 | Vue d'ensemble, onglet Questions | section de ressources, « + » |
| B38-B42 analyses du matin, G56 / F26 | Vue d'ensemble | sections de ressources |
| B49 mention de l'exemple | coquille (ruban « Données d'exemple ») | — |
