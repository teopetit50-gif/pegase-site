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
| Réseau et flotte | `/espace2/tavaro/reseau` | Linear, liste des Initiatives | `linear-initiatives-liste.md` | `reseau-1440-{sombre,clair}-{cote,diff,fusion}.png`, `reseau-390-*.png` | superposé : lignes de 57, icône, nom et résumé, en-tête de colonnes alignés ; colonnes de droite décalées de 59 px (carte plus étroite, colonne titre variable comme chez Linear) |
| Réglages | `/espace2/tavaro/reglages` (Barème), `?vue=regles` | Linear, Settings › Labels et Templates | `linear-labels-templates.md` | `reglages-1440-{sombre,clair}-*` (Labels), `reglages-regles-1440-{sombre,clair}-*` (Templates, `--dx -30`), `reglages-390-*` | superposé : titre, boutons, filtre, en-tête, lignes de 44 ; colonne, en-tête, carte et lignes de 64 alignés ; écarts ci-dessous |
| Contrat | `/espace2/tavaro/contrats/[id]` | Linear, page d'un ticket | `linear-ticket.md` | `contrat-1440-{sombre,clair}-{cote,diff,fusion}.png`, `contrat-390-{sombre,clair}-cote.png` | superposé : fil, titre, description, ronds, blocs et rangées, propriétés alignés ; écarts ci-dessous |
| Pilotage (page nouvelle, 02/11) | `/espace2/tavaro/pilotage` | Plain, Insights › Reporting | `plain-insights.md`, `plain-commun.md` | `pilotage-1440-{sombre,clair}-{cote,diff,fusion}.png` (`--ref-origine 353,8`), `pilotage-390-{sombre,clair}-cote.png` | superposé : barre de titre, boutons, titres de section, en-têtes de carte, valeurs, cadres des graphiques et axes alignés ; écart moyen 7,7 (sombre) et 7,0 (clair) /255 ; écarts ci-dessous |

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

### Réseau et flotte

- **Quatre onglets** (Flotte, Plan de flotte, Transferts, Audit et 2027) au lieu de trois (Active, Planned, All) : un
  par sujet de décision de la direction.
- **Colonnes** : celles de Linear, aux valeurs du sujet ; leur titre suit l'onglet (Échéance, Canal, Cote…). Owner
  reste vide (aucun responsable par sujet dans Tavaro). La santé est un disque vert ou rouge (marge, utilisation,
  cote notée) ou le cercle pointillé de Linear quand rien n'est mesuré.
- **Texte d'aide sous l'en-tête** : les totaux du plan de flotte (B43) et l'avis des transferts ; Linear n'en a pas.
- **Doublon tranché (§ 8.3-3)** : la cote de revente se note à un seul endroit — la fiche du véhicule (F28) quand il
  en a une, la cote du plan (F27) sinon ; « vendre / renouveler » : la ligne du véhicule porte la décision du plan,
  la fiche porte l'avis économique.
- **Fenêtres** : F17, F18, F27-F30 de l'écran d'avant ; une mise en vente, une tournée, un audit et la préparation
  2027 s'ouvrent dans la fenêtre de l'espace 2.
- **G26, G46, G60, G63** : demandent désormais une confirmation (G28 se décide dans la fenêtre de la tournée).

### Réglages

- **Choix de la page** (Barème / Règles et responsables) en onglets dans la bande vide de 64 px du haut : Linear le
  range dans sa barre latérale de réglages, que la coquille d'espace 2 n'a pas.
- **Barème** : chaque barème est un groupe (chevron, icône de dossier) et ses postes en sont les enfants, avec le
  trait de liaison ; les colonnes Used in / Issues / Last applied / Created → Catégorie / TVA / Prix / Effet ; pas
  de case à cocher ni de « … » (aucun geste par poste). « New group » → Retirer le barème (F32), « New label » →
  Publier un barème (F31).
- **Règles et responsables** : trois cartes-listes au lieu d'une ; la carte des responsables porte un choix
  (G13) à la place du « … » ; la carte des règles du loueur donne enfin un écran à `loc_reglages`
  (`poserReglages`, porte existante, sans migration).
- **B26 (Crit'Air et contrôle technique)** : gardé au Parc et atelier, pas répété ici.

## Entrées (aiguillage, `components/espace2/aiguillage.ts`)

| objet_type ou lien | Page |
|---|---|
| `loc_contrats` | `/espace2/tavaro/contrats/<id>` |
| `loc_propositions`, `loc_factures`, `loc_avoirs` (demandes à valider) | Retours à facturer, contrat ouvert (`?proposition=`, `?facture=`, `?avoir=`) |
| `loc_remises`, `loc_immobilisations`, `loc_entretiens`, `loc_rappels_vehicules` | Parc et atelier, carte visée (`?remise=`…) |
| `loc_vehicules` (lien `/espace2`, contrôle technique) | Parc et atelier (`?vehicule=`) |
| `loc_vehicules` (lien `/espace`, véhicule inactif), `loc_reservations` | Vue d'ensemble, ancres `#tavaro-inactifs`, `#tavaro-reservations-risque` |
| `loc_avis_contravention`, `loc_contestations`, `loc_passages_peage` | Amendes, élément ouvert (`?element=avis:<id>`…) |
| `loc_sinistres` | Incidents, onglet Sinistres, élément ouvert |
| `/tavaro/facturation`, `/tavaro/factures`, `/tavaro/avoirs` (socle, E13-E19) | Retours à facturer (À valider), Retours à facturer, file « À valider » |

`node outils/verifier-aiguillage.mjs /tmp/releve-prod/omega/prod/migrations` : « Chaque repère a sa page. »

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
| B27 transferts, G26-G28 | Réseau et flotte | onglet Transferts |
| B34, B35 audit, G44-G46, F17, F18 | Réseau et flotte | onglet Audit et 2027 |
| B43, B44 plan de flotte, G57, F27 | Réseau et flotte | onglet Plan de flotte |
| B45, B46 flotte, G58-G63, F28-F30 | Réseau et flotte | onglet Flotte |
| B47 préparation 2027 | Réseau et flotte | onglet Audit et 2027 |
| B19 responsables des remises, G13 | Réglages, Règles et responsables | carte-liste, choix |
| B31 grille d'assistance, G39 | Réglages, Règles et responsables | carte-liste, « + », « … » |
| B48 barème, G64, G65, F31, F32 | Réglages, Barème | tableau des étiquettes, boutons « New label / New group » |
| `loc_reglages` (sans écran jusqu'ici) | Réglages, Règles et responsables | carte-liste, « … » |
| B23 carte « Opérations » et ses 6 onglets | dissoute : ses sujets vont au Parc (départ et rappels), aux Amendes (péages), aux Incidents (sinistres, assistance, caution), au Réseau (transferts) ; le compteur « péages hors délai » est dans le menu « … » des Amendes | — |
| B49 mention de l'exemple | coquille (ruban « Données d'exemple ») | — |

## Pilotage (page nouvelle, 02/11/2026, branche `claude/pages-tavaro`)

Plan : `docs/refonte-metiers/PAGES-MANQUANTES.md` (promesse du site « Quatre indicateurs suivis : la part facturée
des retours, le délai de remise en location, celui de la dépanneuse et les véhicules à sortir »). Référence proposée
par le plan et gardée : **Plain, Insights › Reporting** — c'est la page d'indicateurs des SaaS relevés, et aucune
autre sous-page de Tavaro ne la prend (Incidents a Plain, Tasks). Tiroma et Tamila l'ont prise pour leur propre
Pilotage : autre métier, la règle « une référence par sous-page dans un même métier » est tenue.

Fichiers (nouveaux) : `app/espace2/tavaro/pilotage/page.tsx`, `components/espace2/tavaro/Pilotage.tsx`,
`components/espace2/tavaro/tav-insights.css` (socle Plain et Insights recopiés de `tir-plain.css` / `tir-insights.css`
sous le préfixe `tav-pi`, pour que les deux métiers évoluent séparément), `components/espace2/tavaro/TavPlainIcone.tsx`
(les sept tracés de Plain utiles, repris de `tiroma/PlainIcone.tsx`). Menu : « Pilotage » entre Réseau et flotte et
Réglages (`components/espace2/modules.ts`). Aucune page existante de Tavaro n'est modifiée.

### D'où vient chaque chiffre (aucune migration, `portes.ts` inchangé)

| Indicateur | Source | Calcul |
|---|---|---|
| Part facturée | contrats, propositions, factures du layout (`chargerMonde`) | retours (retour réel) des 30 derniers jours facturés ou « rien à facturer », sur les retours ; courbe cumulée par jour ou par semaine |
| Facturé pour 100 retours | rpc `loc_indicateur_mois` via `chargerAudits()` (direction et valideurs) ; même calcul que `AuditVue` sur l'exemple | € TTC facturés, avoirs déduits, pour 100 retours du mois ; « Avant Tavaro » = l'audit clos, badge d'évolution |
| Délai de remise | `loc_remises` (parc du layout) | médiane prete_le − retour_le (calcul de `ParcAtelier.tsx`) ; prêtes à temps (prete_le ≤ limite_le) |
| Délai de la dépanneuse | `loc_incidents` et `loc_grille_assistance` (`chargerOperations`, déjà lus) — **aucune rpc** | calculé dans le navigateur : médiane arrivee_estimee_le − recu_le des incidents « dépanneuse » ; comparé au `delai_cible_min` de la grille. **L'heure d'arrivée réelle n'existe pas en base** : c'est le délai annoncé, dit dans l'aide de la carte |
| Véhicules à sortir | rpc `loc_fiches_flotte` (`monde.flotte`, direction large) | fiches à l'avis « sortir » ; marge, utilisation, km, canal |

Le filtre d'agence est celui de toutes les sous-pages ; **la fiche de flotte et l'indicateur du mois ne portent pas
d'agence en base** : ils restent sur toute l'entreprise (dit dans l'aide et le suffixe « toutes agences »).

### Les boutons de la référence et leur utilité

| Bouton de Plain | Ici | Effet |
|---|---|---|
| Filter | Filtre : agence | filtre partagé de Tavaro (`setAgence`) |
| Group by | Grouper par : Agence / Catégorie de véhicule | regroupe les répartitions « Part facturée par… » et « Remise par… » |
| Timeframe | Période : 30 derniers jours (plage datée) ; Mois en cours (mène à la carte de l'indicateur) | les horizons sont ceux des données (30 jours ; mois de la rpc) |
| Granularity | Pas : Quotidien / Hebdomadaire (Mensuel grisé) | 30 seaux d'un jour ou 5 semaines pour les courbes et les barres |
| titre de section ⌄ | replie la section | — |
| Ask Agent (chaque carte) | Copier pour l'assistant | le chiffre et sa série dans le presse-papier |
| Investigate this spike | « 3 à facturer », « N en retard », « N hors délai », « N mises en vente ouvertes » | liens vers Retours (`?famille=a_chiffrer`), Parc (`?vue=remises`), Incidents (`?onglet=assistance`), Réseau (`?onglet=flotte`) |
| (ajout) étoile | Épingler une carte, une agence ou un véhicule | section « Épinglés » en haut de la page (`espace2:epingles:tavaro-pilotage`, navigateur) |
| Search … + téléchargement | Chercher une agence / un véhicule ; CSV | filtre les lignes ; télécharge le tableau filtré |
| (rapports) | cases à cocher du tableau « Véhicules à sortir » | barre : Épingler, Copier pour l'assistant, Exporter en CSV, Vider |
| Ask Sidekick Agent (B), ⟳, ≫ | Copier pour l'assistant le résumé des quatre indicateurs ; relire ; replier | presse-papier, `relire()` |
| nom d'une ligne de rapport | agence : filtre la page sur l'agence ; véhicule : Réseau et flotte | — |
| Customers helped (pied) | « Retours facturés », depuis le début | compteur à volets |

Aucun geste de cette page n'envoie ni n'efface quoi que ce soit en base : aucune confirmation n'est donc nécessaire
(les épingles se retirent d'un clic).

### Écarts restants, avec leur raison

- **Cartes** : leur contenu est celui de Tavaro ; la 2ᵉ carte de « Retours et facturation » est une répartition
  (facturé, avoirs, avant Tavaro) là où Plain a des barres « Threads re-opened » : l'indicateur du mois n'a qu'une
  valeur par mois. Les sections suivent l'ordre de Plain (Vue d'ensemble, volume, répartitions sur 3 colonnes,
  rapports en tableau, pied « Customers helped »).
- **Étoile d'épingle** dans l'en-tête de carte, à gauche de « Ask Agent » (même rond 26) : geste demandé, sans place
  dans la référence.
- **Données d'exemple** : peu de retours, deux remises finies, une dépanneuse : les graphiques sont plus creux que la
  référence remplie ; aucun historique fictif n'est ajouté.
- **Police des titres** : Whyte (licence payante) remplacée par Inter 400 à la même taille, comme Incidents.
- **Carte** de 1128 (coquille) contre 1079 chez Plain : éléments calés à droite décalés de 49 px.
- **390** : les seules captures 390 de Plain montrent le chargement (flou) ; comparaison côte à côte sur la barre de
  titre et les boutons (deux lignes alignées à droite), la grille à une colonne.
- **Cotes corrigées** sur la superposition (dans `tav-insights.css`, pas chez Tiroma) : en-tête de carte −4 px,
  valeur −4 px de plus, pour tomber sur 1440-reel-*.png.

### Ce qui n'a pas pu être fait

- **Délai réel de la dépanneuse** : pas d'heure d'arrivée en base ; seul le délai annoncé est mesuré.
- **Flotte et indicateur par agence** : pas d'agence dans `loc_fiches_flotte` ni dans `loc_indicateur_mois`.
- **Historique de l'indicateur mois par mois** : la rpc prend `p_mois`, mais `chargerAudits()` ne lit que le mois
  courant et `portes.ts` reste inchangé.
- **Aiguillage** : aucun repère en base ne vise ces indicateurs ; aucune règle ajoutée, `verifier-aiguillage` vert.
  À signaler à la session Refonte : les lignes de journal `loc_incidents` (b2_12 à b2_16) tombent encore sur
  `/espace2/tavaro?objet=` faute de règle vers Incidents › Assistance.

Recette : aucun défilement de côté à 390, 768, 1024, 1440, 1700 (sombre et clair) ; gestes passés au navigateur
(menus, pas, regroupement, filtre, épingles, sélection, CSV, copie, B, relire, replier), aucune erreur console.
