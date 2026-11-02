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
| Retours à facturer | `/espace2/tavaro/retours` | Linear, Inbox | `linear-inbox.md` | `retours-1440-{sombre,clair}-{cote,diff,fusion}.png`, `retours-ouvert-1440-*.png` (contrat ouvert à droite), `retours-390-sombre-cote.png` | superposé : liste, lignes, avatars, pastilles, icônes de statut, en-tête alignés au pixel ; écarts ci-dessous |
| Parc et atelier | `/espace2/tavaro/parc` | Linear, Board | `linear-board.md` | `parc-1440-{sombre,clair}-{cote,diff,fusion}.png`, `parc-390-sombre-cote.png` | superposé : colonnes (x, pas de 348), en-têtes de colonne, cartes (id, statut, titre, puces, pied) alignés ; écarts ci-dessous |
| Amendes, péages, contestations | `/espace2/tavaro/amendes` | Linear, Triage | `linear-triage.md` | `amendes-1440-{sombre,clair}-{cote,diff,fusion}.png`, `amendes-ouvert-1440-sombre.png` | superposé : lignes de 59, titre et référence, 2ᵉ ligne (sujet, date, priorité, âge), en-tête alignés ; écarts ci-dessous |
| Incidents | `/espace2/tavaro/incidents` | Plain, Tasks | `plain-tasks.md`, `plain-commun.md` (relevés Plain) | `incidents-1440-{sombre,clair}-{cote,diff,fusion}.png` (`--ref-origine 353,8`), `incidents-390-*.png` | superposé : titre, contrôle segmenté, ligne d'ajout, lignes de 49 alignés ; écarts ci-dessous |
| Contrat | `/espace2/tavaro/contrats/[id]` | Linear, page d'un ticket | `linear-ticket.md` | `contrat-1440-{sombre,clair}-{cote,diff,fusion}.png`, `contrat-390-{sombre,clair}-cote.png` | superposé : fil, titre, description, ronds, blocs et rangées, propriétés alignés ; écarts ci-dessous |

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

### Retours à facturer

- **Illustration du volet vide** : celle de Linear (boîte de réception, SVG de l'app) n'est pas dans le relevé ;
  l'icône « Inbox » du sprite de Linear, à 96 px, en tient lieu. Le libellé suit (« N retours à facturer »).
- **Couleur de la ligne ouverte (sombre)** : le relevé dit « fond plus clair » sans valeur ; prise au pixel sur
  `1440-sombre-notification-ouverte.png` (≈ rgb 32,32,32, soit lch(12.4 1.2 272)) ; en clair, la valeur relevée
  sur Triage, lch(92.94 0.5 282).
- **Avatar** : le réveil des rappels de Linear devient le véhicule (même pastille violette 32, icône 20) ; une
  notification de Linear est un rappel, une ligne ici est un contrat.
- **Menus** : Filtre = les quatre familles (B02, `?famille=`), Options d'affichage = les agences (B07), boîte
  d'archives = « Le reste » ; « … » porte « À encaisser » (B03).
- **Âge de la 2ᵉ ligne** : l'âge du retour (« 1 j », « 12 j ») ou « retour imminent » pour un contrat en location.

### Contrat

- **Boutons d'en-tête** « Accept / Decline » → « Chiffrer le retour » (G03), « Prolonger » (G02) ; les deux ronds →
  Compléter les conditions (G01), file « À valider » (L6). Pas de bouton double « Copy as prompt » dans la barre
  d'outils (aucun geste Tavaro) ; les deux ronds restants copient le lien et le numéro.
- **Réactions / pièce jointe** (deux ronds sous la description) → faire l'état des lieux (G09) et chiffrer avec
  photos (F01).
- **Blocs « Sub-issues »** : États des lieux (B12), Chiffrage du retour (B13), Factures (B14), Avoirs (B15) ; le
  compteur « 0/5 » devient « 1/2 », « v1 · 173,00 € »… ; la jauge circulaire n'est pas reprise ; le montant prend
  la place de l'avatar à droite. Une facture se déplie sur son détail (carte de commentaire de Linear) et ses gestes
  en pilules (G04-G08) : Linear n'a pas de geste sur une rangée de sous-ticket.
- **Activité** : le journal opposable (B16), un événement par ligne ; pas de « Unsubscribe » ni de champ « Leave a
  comment… » (Tavaro n'a pas de commentaires) ; la demande devant l'agence (B13) est la seule carte de commentaire.
- **Propriétés** : statut, chiffrage, franchise, tarif, forfait ; « Labels » → Étiquettes (Hors barème, Litige,
  Réglé, Impayé, Professionnel) ; « Project » → Agence (agence, véhicule, courriel, source). Cinq pilules au lieu
  de quatre : la colonne est plus longue.
- **G12 Lever la caution** : demande désormais une confirmation (DECOUPAGES.md, règle 5).
- **Fenêtres** F01-F09 : celles de l'écran d'avant (`components/ui/dialog`), code repris ligne pour ligne.

### Parc et atelier

- **Fond de colonne** : le relevé le dit transparent en sombre ; la capture montre un fond un peu plus sombre que la
  carte (rgb 15 contre 18) sur 340 px de large, 8 px de marge : valeur prise au pixel (lch(4.6 0.4 272) ; clair
  lch(96.6 0.5 282)).
- **Colonnes** : une par état du véhicule (À remettre en location, Immobilisés, Entretien à planifier, Entretien
  planifié, Rappels du constructeur, Crit'Air et contrôle technique) au lieu des statuts de ticket ; « Hidden rows »
  n'a pas d'équivalent.
- **Puces** : délai, étapes de la remise (cliquables : G14), anomalies, échéances, durée, « Fait » (G22) ; Linear n'a
  pas de puce cliquable sur une carte : ces gestes du métier n'ont pas d'autre place sur la carte.
- **Avatar** : la personne à qui la remise est confiée (initiales) ; personne : l'icône « non assigné » de Linear.
- **Chiffres du parc (B18)** : comptes des colonnes et menu « … » de la première colonne (médiane, prêtes à temps).
- **Onglets** : Remises, Atelier, Tout le parc (Active, Backlog, All issues) ; à droite Filtre = agences, le rond
  « Open details » = contrôle avant de donner les clés (B24) ; pas de rond « Display options ».
- **En-tête** : « Location › Parc et atelier », menu « … » (immobiliser, prévoir un entretien, enregistrer un rappel,
  contrôle au départ, responsables des remises → Réglages) ; la cloche mène aux amendes ; « New issue » → « Prévoir
  un entretien ».
- **G24 Rappel fait** : demande désormais une confirmation (règle 5).

### Amendes, péages, contestations

- **Une seule file** pour trois sujets (avis B36, contestations B37, péages B28), la plus urgente d'abord ; l'avatar et
  l'auteur de la 2ᵉ ligne deviennent l'icône du sujet et son statut.
- **Priorité** : « urgent » (carré orange) sous 3 jours, barres grises sous 10 jours ; Linear l'affiche selon la
  priorité du ticket.
- **En-tête de l'élément** : les ronds Accept / Decline / Duplicate / Snooze → les gestes de l'objet (désigner,
  rattacher, classer ; envoyer, télécharger, refaire, issue ; payer, rattacher, à notre charge, refacturer). Les
  mêmes gestes sont repris en toutes lettres sous la description : un rond sans libellé ne suffit pas à un geste
  qui engage l'entreprise. Pas de « Add sub-issues » ni de boîte de commentaire.
- **Menu « … »** de la liste (l'étoile de Linear) : créer (avis F19, contestation F23, passage G29, import G30) et
  les chiffres des péages (à payer, hors délai, contrats à refacturer, G31).
- **Volet vide** : l'icône Triage du sprite à 96 px au lieu de l'illustration de Linear (absente du relevé) ;
  « Create triage issue » → « Enregistrer un avis ».
- **G31, G51, G54** : demandent désormais une confirmation (règle 5).

### Incidents

- **Police des titres** : Whyte (Dinamo, licence payante) chez Plain ; Inter 400 à la même taille (24/32) ici, faute
  de licence — le relevé le prévoit (« substitut à choisir par la session métier »).
- **Carte** : 1128 de large dans la coquille (1079 chez Plain) : les éléments calés à droite (pastille du compte,
  avatar) sont décalés de 49 px dans la superposition.
- **Onglets** : Sinistres, Assistance, Caution à la place de My tasks, Todo, Done, avec la même case bleue ; le tri
  « Last updated » devient le filtre d'agence.
- **Ligne d'ajout** (« Add new task ») : « Déclarer un sinistre » (G35) ou « Demander une préautorisation » (G40) ; pas
  de raccourci « T ». L'onglet Assistance n'en a pas (les appels arrivent par le fournisseur de voix).
- **Avis** « fournisseur de voix » et « prestataire de paiement » (B30, B32) : une ligne de texte sous les onglets.
- **Détail** : « Handle with Agent » et « Assigned to me » → les gestes de l'objet (faire avancer, recours, clore,
  capturer, libérer) ; « Account / Threads / Knowledge gap » → les propriétés de l'objet. Le recours se déplie dans
  la description.
- **G42 Libérer** : demande désormais une confirmation (règle 5).

## Inventaire : où va chaque bloc (au fil des sous-pages)

| Bloc / geste | Sous-page | Place dans la référence |
|---|---|---|
| B01 titre et phrase | Vue d'ensemble | nom de l'équipe et description |
| B02 compteurs-filtres, B03 à encaisser | Vue d'ensemble (liens) ; Retours à facturer (filtres) | « Go to » |
| B04, B05 (base muette, sans compte) | toutes | texte d'aide |
| B07 filtre d'agence | toutes (état partagé) | puce « Members » |
| B33 Questions, G43 | Vue d'ensemble, onglet Questions | section de ressources, « + » |
| B38-B42 analyses du matin, G56 / F26 | Vue d'ensemble | sections de ressources |
| B06, B08 liste des contrats, B09, L1 | Retours à facturer | lignes de l'Inbox, volet vide |
| B10 « C'est fait » | toutes | toast |
| B11 en-tête du contrat, G01-G03, F01-F03 | Contrat (et volet des Retours) | fil, titre, description, propriétés, boutons d'en-tête |
| B12 états des lieux, G09-G12, F08 | Contrat | bloc « Sub-issues », rondes sous la description |
| B13 chiffrage, L6 | Contrat | bloc « Sub-issues », carte de commentaire |
| B14 factures, G04-G08, F04-F07, F09, L3-L5 | Contrat | bloc « Sub-issues », rangée dépliée |
| B15 avoirs, L4 | Contrat | bloc « Sub-issues » |
| B16 journal opposable | Contrat | « Activity » |
| B17 parc, B18 chiffres | Parc et atelier | tableau, comptes de colonne, menu « … » |
| B20 remises, G14-G17, F10 | Parc et atelier | colonne « À remettre en location », fenêtre de la remise |
| B21 immobilisations, G18, G19, F11, F12 | Parc et atelier | colonne « Immobilisés », « + » |
| B22 entretien, G20-G22, F13-F15 | Parc et atelier | colonnes « Entretien à planifier / planifié » |
| B24 contrôle au départ, L7 | Parc et atelier | rond de la ligne 2, menu « … » |
| B25 rappels, G23, G24 | Parc et atelier | colonne « Rappels du constructeur », « + » |
| B26 Crit'Air et CT, G25 | Parc et atelier | colonne « Crit'Air et contrôle technique » |
| B28 péages, G29-G34 | Amendes, péages, contestations | lignes, élément ouvert, menu « … » |
| B36 avis, G47-G51, F19-F22 | Amendes, péages, contestations | lignes, élément ouvert |
| B37 contestations, G52-G55, L8, F23-F25 | Amendes, péages, contestations | lignes, élément ouvert |
| B29 sinistres, G35-G37 | Incidents | onglet Sinistres, ligne d'ajout, détail |
| B30 assistance, G38 | Incidents | onglet Assistance, détail |
| B32 caution, G40-G42 | Incidents | onglet Caution, ligne d'ajout, détail |
| B49 mention de l'exemple | coquille (ruban « Données d'exemple ») | — |
