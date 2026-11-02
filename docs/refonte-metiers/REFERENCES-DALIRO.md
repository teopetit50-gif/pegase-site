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

Éléments de la référence sans geste Daliro derrière : **plus aucun** depuis le 02/11 au soir (décision de Teo,
« trouve une utilité aux boutons ») — chacun est dessiné et utile, voir la section suivante.

Autres :
- Couleurs prises sur les captures faute de relevé : carte du volet de la fiche en sombre (26/255 = lch(9.232), la
  palette du relevé dit 12.72), segments du volet ; À ranger et À faire : couleur « Todo », chevron de groupe en
  sombre, surbrillance de la ligne ouverte, bord de l'illustration.
- Annuaire : icônes d'Attio tirées de ses fichiers publics (jeu 16 px ; « Activité » du jeu 12 px agrandi) ; l'icône de personnes de l'en-tête est redessinée dans le même carré bleu, l'épingle de colonne est l'épingle simple (la barrée n'est pas dans le jeu).
- Fiche, onglet Lots : la capture de Linear montre l'onglet Projects en liste, le relevé (29/10) en Timeline ; la Timeline est gardée.
- Contenu : 6 chantiers d'exemple contre 13 projets chez Linear (Chantiers) ; 13 entreprises contre 77 contacts
  (Annuaire) ; plages horaires des intervenants (Équipes). La géométrie est vérifiée sur les lignes présentes.
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
| Équipes | Set as default | l'intervenant passe en tête, badge « Par défaut », présélectionné pour les absences | localStorage |
| Équipes | Duplicate, corbeille | copier le planning de 30 jours ; retirer de la liste (confirmation, « les remettre ») | presse-papier ; localStorage |
| Équipes | crayons | renommer une équipe (localStorage) ; ouvrir la fiche d'un sous-traitant ; modifier une absence | localStorage ; adresse ; portes `btp_noter_indisponibilite`, `btp_annuler_indisponibilite` |
| Annuaire | repli de la barre, View settings, Add column, épingle, éclair | colonnes, regroupement par rôle, colonne fixée, tri | localStorage ; adresse (`?cols=`, `?groupe=`, `?epingle=`, `?tri=`) |
| Annuaire | Import / Export | exporter la liste affichée (il n'y a pas d'import : l'annuaire se remplit par les chantiers) | CSV |
| Annuaire | « + New Person », « + » d'en-tête | nouvelle entreprise dans les Entreprises de l'espace (aucune porte ne crée un tiers, la fenêtre le dit) | localStorage |
| Annuaire | cases à cocher | exporter, copier les courriels, écrire à tous (mailto en copie cachée), épingler | CSV ; presse-papier ; mailto ; localStorage |
| Annuaire | Add calculation | décompte rempli / vide, % rempli, valeurs distinctes, date la plus proche, sur les lignes affichées | adresse (`?calc=`) |
| Annuaire, fiche | étoile, crayon, actions | épingler ; description locale ; écrire, appeler, note, disponibilités | localStorage ; mailto / tel ; liens |
| Annuaire, fiche | onglets Emails / Calls / Files / Notes / Tasks | coordonnées et échanges J-2 par ce canal ; factures de ses lots ; notes et tâches locales | données lues ; localStorage |

Superpositions refaites après ces ajouts (1440, sombre / clair) : vue d'ensemble 3.4 / 3.5 ; fiche 5.5 / 5.5 ;
À ranger 6.1 ; À faire 11.0 / 11.5 ; Avenants 12.5 / 13.6 ; Réglages 7.4 (bibliothèque), 3.7 / 4.1 (organisation) ;
Équipes 7.5 / 7.4, fiche d'intervenant 7.9 / 7.0 ; Annuaire 12.0 / 12.5, fiche 7.0 / 7.4.
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
