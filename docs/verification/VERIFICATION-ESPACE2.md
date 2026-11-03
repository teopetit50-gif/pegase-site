# Vérification complète d'Espace 2 — 03/11/2026

Demande de Teo : parcourir tout `/espace2` comme un vrai utilisateur, cliquer partout, remplir les
formulaires, relever les « petites conneries » et corriger ce qui est simple. Tout s'est fait en
**Données d'exemple**, sans connexion, sans « Base réelle », sans écriture en base ni envoi réel
(les requêtes autres que GET étaient coupées pendant les parcours).

## Totaux

| | |
|---|---|
| Pages parcourues | 90 pages au chargement × 5 largeurs (390 / 768 / 1024 / 1440 / 1700) × 2 thèmes, soit 900 vues sondées automatiquement ; puis environ 300 adresses ouvertes en interaction (pages, sous-pages, fiches `[id]`, `?id=`, `?verif=`, `?avis=`, `?element=`, `?vue=`…), à 390 sombre et 1440 clair, et à 768 / 1024 quand c'était fragile |
| Boutons cliqués | ≈ 7 900 (dont ≈ 700 premiers éléments de menus ouverts), plus ≈ 300 clics ciblés à la main |
| Formulaires validés | ≈ 85 (valeurs plausibles, vides, très longues, 2 000 caractères sans espace, adresses fausses, double envoi), plus ≈ 30 saisies invalides |
| Défauts trouvés | **79** lignes de défaut (une ligne regroupe parfois le même défaut sur plusieurs pages : les menus hors écran, par exemple, en couvrent une trentaine) |
| Corrigés et en ligne | **60** (7 commits, voir plus bas), dont 2 corrigés en partie avec un reste à décider |
| À décider par Teo | **14** (dont 12 sans correction) |
| Laissés en l'état ou écartés après vérification (conformes à la référence, sans conséquence, non reproduits) | **7** |

Erreurs de console : aucune exception, aucun écran blanc, aucun chargement sans fin, aucun lien en 404
(≈ 500 liens internes appelés, les 27 cibles de `aiguillage.ts` comprises ;
`node outils/verifier-aiguillage.mjs` : « Chaque repère a sa page. »). Seule erreur relevée :
React #418 (hydratation) sur Tamila Arrivées, corrigée, et une fois, non reproduite, sur Tiroma
Créneaux à 1024 clair (notée ci-dessous). Aucun « undefined », « NaN », « [object Object] » ni date
invalide affiché.

**Installation** : `npm ci` échoue (le `package-lock.json` n'est plus en phase avec `package.json`) ;
installé avec `npm install --legacy-peer-deps --package-lock=false`, rien du verrou n'est commité.
Le verrou mérite d'être régénéré un jour.

**Commits** (tous sur `main`, en ligne sur omegaai.fr, vérifiés sur la page servie) :

| Repère | Commit | Contenu |
|---|---|---|
| C | `4f3e74a` | Coquille : thème du tiroir, recalage des menus (`recaler.ts`), `habillage.css` chargé par la coquille, ruban, rail à requête, « Systèmes », toasts de copie |
| S | `d72caba` | Socle : Équipe, Contacts, Entreprises, Tâches, Carte, menus d'options, Réglages, listes de fils |
| Y | `012add2` | Systèmes : copies, validations de REPUT |
| A | `0f7fac1` | Daliro, Lorani, Tamila |
| B | `886765a` | Tavaro, Tiroma, Varelo |
| R | `6caa109` | Réseau |
| F | `5ca2e9e` | Retours relayés par la coordination : « Gérer l'équipe », texte d'Opportunités, poignées des composeurs sans bord |

Captures : `docs/verification/captures/` (avant / après).

---

## Coquille et socle

| Adresse | Largeur, thème | Défaut | Gravité | Capture | Statut |
|---|---|---|---|---|---|
| tout `/espace2`, tiroir mobile | < 768, sombre | Refermer le tiroir effaçait `data-v2-theme` : tout Espace 2 repassait en clair jusqu'au rechargement | gênant | — | corrigé C (`theme.ts` compte les montages) |
| 13 pages ouvertes directement (`/activite`, `/taches`, `/contacts`, `/notes`, `/point`, `/formation`…) | toutes, deux thèmes | Ruban « Données d'exemple » en texte nu ; à 390 sur deux lignes par-dessus le sélecteur de module, titre de la barre réduit à 0 px | gênant | avant-ruban-barre-390-clair.jpg | corrigé C (règles déplacées dans `espace2.css`) |
| `/espace2/equipe` | 768 à 900, deux thèmes | Colonnes écrasées : avatars sur les adresses, « Nom » sur « E-mail », rôles en colonne d'une lettre, page qui défile de côté (830 px) | gênant | avant-equipe-768-sombre.jpg | corrigé S |
| `/espace2/equipe` | 390 | Filtre « Tous » coupé (« Administrate… ») ; « Nom ↓ » sort de 6 px à gauche | gênant | — | corrigé C (recalage) + S |
| `/espace2/equipe` | toutes | Clés brutes « gerant », « admin », « valideur »… sous la colonne E-mail de « Ce que chaque rôle permet » | cosmétique | — | **à décider** : voulu par le commentaire d'`Equipe.tsx` (« la clé ») ; les retirer ? |
| `/espace2/contacts`, `/espace2/entreprises` | ≥ 1024 | La page défilait de 4 px de côté (case vide de l'en-tête) | cosmétique | — | corrigé S |
| `/espace2/contacts`, `/espace2/entreprises` | toutes | Les 3–4 dernières lignes ne répondaient pas au clic (le fondu de « Voir plus » passait dessus) | gênant | — | corrigé S |
| `/espace2/taches` | toutes | Échap ne fermait pas « Options d'affichage » | gênant | — | corrigé S |
| `/espace2/carte`, `/espace2/filed/circuit` | toutes | Échap ne fermait pas « Raccourcis clavier » (que la bulle annonce) | cosmétique | — | corrigé S |
| `/espace2/activite` | 390 | Le « ⋯ » d'un événement sortait de l'écran, la page glissait de côté (625 px) | gênant | — | corrigé C (recalage, vérifié 83→381 px) |
| `/espace2/utilisation` | 390 | Menu Période coupé à droite, page à 428 px | gênant | — | corrigé C (vérifié) |
| `/espace2/reglages` (exemple) | toutes | « Télécharger l'archive (zip) » téléchargeait la page `reglages.html` | gênant | — | corrigé S |
| barre du haut | ≥ 768 | « Moteurs : raccourcis vers chaque moteur » | cosmétique | — | corrigé C (« Systèmes ») |
| coquille | — | L'organisation d'exemple s'appelle « CAMA » dans le menu, « Atelier Bertin » dans le menu du compte, l'aide et Réglages | cosmétique | — | **à décider** : quel nom garder |
| `/notes`, `/activite`, `/carte` | toutes | Retour du navigateur après avoir ouvert une note / un événement / un bloc : quitte la page au lieu de refermer (`router.replace`) | gênant | — | **à décider** (règle commune : `push` à l'ouverture d'un élément, `replace` pour filtres et tris — même question sur les listes des systèmes et Opportunités) |
| `/taches`, `/contacts`, `/entreprises` | toutes | « Créer » actif sur un formulaire vide | cosmétique | — | corrigé S (grisé, comme Linear) |
| `/espace2/ecosysteme` | toutes | Barre du haut « Espace client », aucune entrée du volet allumée | cosmétique | — | titre corrigé C ; **à décider** : une entrée dans le rail pour cette page interne ? |
| palette ⌘K | 390 | Invite coupée net (« …un modul ») | cosmétique | — | corrigé C |
| volet Réglages | toutes | « Accessibilité » et « Données » (ancres `#`) ne s'allument jamais | cosmétique | — | laissé : demande de revoir le volet des réglages (ancres) |
| `/espace2/reglages` | toutes | « Gérer l'équipe » menait à l'ancien `/espace/equipe` (relevé par la session Formation) | gênant | — | corrigé F |
| `/espace2/point` « Prochaine édition » | toutes | « Personnaliser » mène aux Réglages, qui ne contiennent ni l'heure ni le canal du point (relevé par la session Formation) | gênant | — | **à décider** : aucun écran ne règle l'heure et le canal du point ; en créer un, ou retirer le lien |
| composeurs sans bord (Tiroma fils, Membres, Plain fil, Contacts, Nouvelle tâche, volet des parties, volet Supabase) | toutes | Poignée de redimensionnement dans un champ sans bord (demande de Teo relayée) | cosmétique | — | corrigé F |
| `/espace2/formation/<inconnue>` | — | Affiche la 404 mais répond 200 (`notFound()` après le début du flux) | sans conséquence | — | noté (page en `noindex`) |

## Les quatre systèmes

| Adresse | Largeur, thème | Défaut | Gravité | Capture | Statut |
|---|---|---|---|---|---|
| `/filed`, `/cashd`, `/reput`, `/offload` (+ `?objet=`, `?compte=`, `?demande=`, « ··· » de `/filed/fournisseurs`, `/reput/sujets`, `/offload/affaires`, `/reput/base`) | 390 et 768 | Menus des propriétés hors de l'écran à droite, page jusqu'à 561 px | gênant | — | corrigé C (recalage ; vérifié `/cashd` 25→343 px) |
| `/cashd/balance`, `/cashd/risque`, `/offload/groupes` | 390 | « Filtres » commence à −101 / −154 px | gênant | — | corrigé C (vérifié 8→248 px) |
| `/filed/comptabilite` | toutes, sombre | Fenêtre « Modifier le compte » blanche | gênant | — | corrigé C (vérifié, fond 23,23,23) |
| `/cashd/suivi?vue=relances&textes=1` | 1440 | « Les variables » sur 5 colonnes écrasées, volet qui déborde ; champ « Corps » de 144 px | gênant | avant/apres-cashd-textes-1440-sombre.jpg | corrigé C |
| `/cashd/suivi` (toutes les vues) | toutes | Aucune entrée du volet allumée (adresses à `?vue=`) | gênant | — | corrigé C (vérifié débiteurs / relances / envois) |
| menus d'options (`Lin.tsx`) | toutes | Après Échap ou un choix, le focus retombait sur `<body>` | gênant (accessibilité) | — | corrigé S |
| `/filed?objet=`, `/cashd?compte=`, `/reput?demande=`, `/reput/base?fiche=`, `/offload` | toutes | « Copier… » sans aucun retour visible | cosmétique à gênant | — | corrigé Y (toast « copié » / « refusé ») |
| `/reput/reglages?section=programmes` | toutes | Demande d'avis acceptée avec l'adresse « abc » ; formulaire pas vidé, doublon au second clic | gênant | — | corrigé Y |
| `/reput/reglages?section=avis` | toutes | « pas un lien » enregistré comme page d'avis | gênant | — | corrigé Y (https exigé) |
| `/reput/reglages?section=sites` | 390 | Pastille « Réglages propres » coupée à −63 px | gênant | — | corrigé S |
| listes de fils (`/cashd/litiges`, `/cashd/devis`, `/filed/boite`, `/filed/refusees`, `/filed/controles`, `/reput/urgences`, `/offload/garde-fous`) | 390 | Boutons-icônes Filtres / Affichage sans nom accessible | gênant (accessibilité) | — | corrigé S |
| `/offload/groupes?id=Groupe%20Ouest%20Froid` | toutes | « Froid Services Vannes » mène à `?compte=x` → « Ce compte n'est pas dans la liste » | cosmétique | — | **à décider** : ajouter ce compte aux données d'exemple d'OFFLOAD ou retirer la ligne |
| `/filed`, `/filed/comptabilite`, `/cashd?compte=<inconnu>` | — | Petits textes : « 3 documents : bloquées », « 7 factures à reprendre » pour 5 lignes, « Nouveau · arrivés… » dans la fiche d'un seul courriel, « 3  0 avoir », « plus d'encours » pour un identifiant inconnu | cosmétique | — | laissés : le code a changé depuis le relevé (lignes déplacées), à revoir avec la session FILED/CASHD |
| `/reput?demande=…c3d04` | 390 | Défilement de 3 px de côté, élément non trouvé | cosmétique | — | non reproduit après les correctifs |
| `/filed/controles`, blocs du circuit, listes | toutes | Onglets et filtres en `replace` : Retour quitte la page | gênant | — | **à décider** (même règle que pour le socle) |
| `/filed/circuit` | 1024 à 1700 | Blocs du canevas hors champ au chargement | — | — | écarté : canevas déplaçable, comportement voulu |

## Les six métiers

| Adresse | Largeur, thème | Défaut | Gravité | Capture | Statut |
|---|---|---|---|---|---|
| Daliro `/chantiers` « Nouveau chantier », `/annuaire` « Nouvelle entreprise », `/reglages` « Poser un prix » ; Lorani `/honoraires` « Marquer facturé », `/questions` « Nouvelle question » | toutes, sombre, page ouverte directement | Fenêtres blanches | gênant | avant-daliro-reglages-fenetre-blanche-1440-sombre.jpg | corrigé C |
| Tavaro `/parc` (rappel, immobiliser, entretien, contrôle), `/contrats/[id]` (état de retour, chiffrage, conditions), `/reseau`, `/amendes`, `/incidents` ; Varelo `/contrats` « Ajouter un contrat » | toutes | Fenêtres blanches en sombre, champs bruts (« Choose Files », textes collés) | bloquant pour l'état des lieux et le chiffrage | avant-tavaro-parc-fenetre-blanche-1440-sombre.jpg | corrigé C + B (vérifié) |
| Menus « … » : Daliro fiche chantier, À ranger ; Lorani permis, projet, courrier ; Tamila dossier, faits, Honoraires, Arrivées ; Tavaro parc, amendes, retours, contrat, réglages, **Incidents « Agence » (agence impossible à choisir)** ; Tiroma Avant, Pilotage, Fauteuils ; Varelo Ce matin, Contrats, Finance, Référentiel | 390 (Arrivées aussi à 1440) | Menus hors de l'écran, page qui défile de côté | gênant, bloquant pour l'agence | — | corrigé C (recalage ; vérifié Incidents 8→183 px, Parc 115→382 px) |
| Varelo `/referentiel` | 1024 | « Lancer un passage » coupé net par la carte | gênant | avant-varelo-referentiel-1024-sombre.jpg | corrigé B (la barre passe à la ligne) |
| Varelo `/referentiel` | 390 | Menus « Import / Export », « Réglages de la vue » invisibles (coupés par la barre qui défile) ; fil d'Ariane sous « Partager » | gênant | avant-varelo-referentiel-menu-390-sombre.jpg | corrigé B |
| Tiroma `/creneaux?vue=attente&inscrire=1` | 390 | Fenêtre d'inscription coupée à gauche (−66 px) | gênant | avant-tiroma-inscription-390-sombre.jpg | corrigé C (vérifié 8→368 px) |
| Tiroma `/creneaux?fil=…` | toutes | « Noter l'appel » / « Rappeler plus tard » ouvraient le composeur sous l'écran (clic qui semblait mort) | gênant | — | corrigé B |
| Tiroma `/fauteuils?vue=equipe` | toutes | « Noter une absence » doublait l'absence au second clic ; Échap ne fermait pas | gênant | — | corrigé B |
| Tavaro `/parc` « Enregistrer un rappel » vide | 1440 | L'erreur de validation tombait sous la zone visible | gênant | — | corrigé B |
| Varelo `/contrats`, `/groupe` ; Tiroma `/pilotage`, `/fauteuils`, Aujourd'hui « 2 de plus » | toutes | Menus qui ne se fermaient ni par Échap ni par un clic dehors | gênant | — | corrigé B |
| Tiroma `/fauteuils` ; Daliro `/annuaire`, `/reglages` ; Tamila `/conformite` | 390 | Barres de sélection plus larges que l'écran (« Épingler » inaccessible dans l'Annuaire) | gênant | apres-daliro-annuaire-selection-390-sombre.jpg | corrigé A + B |
| Daliro `/avenants?avenant=…` | 390 | Volet sous la barre du haut (titre à moitié caché) | gênant | — | corrigé A (le volet couvre l'écran, barre comprise) |
| Lorani `/honoraires?element=…` | toutes | « Ouvrir le projet » coupé net | gênant | apres-lorani-honoraires-1440-clair.jpg | corrigé A (icônes seules après le premier bouton, comme Attio) |
| Tamila `/arrivees` | toutes | Erreur React #418 à chaque ouverture (heure relative) | gênant | — | corrigé A |
| Tamila Arrivées, dossier, Pilotage | toutes | Copies sans retour visible | gênant | — | corrigé A |
| Daliro `/annuaire` « Nouvelle entreprise » | toutes | Courriel et téléphone faux acceptés | gênant | — | corrigé A |
| Tamila `/arrivees`, `/conformite` | toutes | Échap ne refermait pas l'avis / la tâche | cosmétique | — | corrigé A |
| Daliro `/a-faire` | 1440 | « VEN-26-03 » coupé net | cosmétique | — | corrigé A |
| Tiroma `/pilotage` | 4 sections | Titres en bouton sans effet | cosmétique | — | corrigé B (se replient) |
| Tiroma `/pilotage` | 1024 | « Devis à relancer » coupé (« Expire le », « Noter l'appel » inatteignables) ; « Cette semaine » coupé net | gênant | — | corrigé B (le tableau défile de côté) |
| Tiroma `/fauteuils` | toutes | Bouton « Filter » en anglais | cosmétique | — | corrigé B |
| Tavaro `/reseau` | 1440 clair | « à valider par la direction » coupé net | cosmétique | — | corrigé B |
| Varelo `/` | — | Titre d'onglet « Référentiel du groupe » sur Ce matin | cosmétique | — | corrigé B |
| Tiroma `/avant?verif=labo:w-1` | — | Relance copiée « Bonjour (Laboratoire Corail), » | cosmétique | — | corrigé B |
| Tiroma inscription en liste d'attente | — | Rien ne dit quand la recherche ne trouve personne | cosmétique | — | corrigé B (« Aucun patient trouvé ») ; les patients cherchables en exemple restent 5 : **à décider** si on élargit l'exemple |
| Tiroma fil d'un créneau | — | « : » et « ; » seuls en début de ligne (espace non insécable manquant dans le texte généré) | cosmétique | — | laissé (texte généré par les données) |
| Tavaro `/contrats/[id]` ; Tamila `/dossiers/[id]` (et `/faits`) | toutes | Aucune entrée du volet des pages allumée | gênant / cosmétique | — | **à décider** : une entrée accepte plusieurs adresses (`racines`) ou la fiche déménage sous sa page |
| Tiroma Aujourd'hui, Daliro À faire, Lorani À viser | ≤ 1024, volet ouvert | Pilules écrasées et coupées sans « … » | — | — | écarté : relevé de Linear (« se compriment et se tronquent sans « … » ») ; **à décider** seulement si Teo veut le masquage progressif |
| Tiroma `/creneaux` | 1024 clair | Erreur React #418 une fois sur dix vues | cosmétique | — | non reproduite ; à surveiller |
| Daliro `/approvisionnement?commande=` | — | Les identifiants d'exemple changent à chaque chargement (un lien copié n'ouvre plus rien) | cosmétique | — | **à décider** (exemple seulement) |

## Le Réseau

| Adresse | Largeur, thème | Défaut | Gravité | Capture | Statut |
|---|---|---|---|---|---|
| `/reseau`, `?pub=…` ; Opportunités | 390 et 768 | Le « … » d'une carte poussait toute la page de côté (604 px pour 390) | gênant, presque bloquant | avant/apres-reseau-fil-menu-390-sombre.jpg | corrigé C (recalage, page ramenée à gauche ; vérifié en ligne) |
| `/reseau/membres` | toutes | La recherche n'entrait jamais dans l'adresse, perdue au retour d'une fiche | gênant | — | corrigé R |
| `/reseau/opportunites?id=` | toutes | Retour quitte la page au lieu de fermer la carte | gênant | — | **à décider** (même règle `push`/`replace`) |
| `/reseau` « Je peux aider » | toutes | « Solelek Antilles et vous peuvent aider » | cosmétique | — | corrigé R (« pouvez ») |
| `/reseau?ile=martinique&type=alertes` | — | Une publication faite sous un filtre disparaît malgré « Demande publiée » | gênant | — | **à décider** : lever le filtre ou lien « Voir » dans le message |
| `/reseau/membres/inconnu` | toutes | 404 du site vitrine, hors d'Espace 2 | gênant | — | **à décider** : un `not-found.tsx` sous `app/espace2` |
| `/reseau/messages` | 390 | Titre de sujet sans espace coupé net | cosmétique | — | corrigé R |
| `/reseau/opportunites` | 390 | Pastille de recherche longue de milliers de pixels | cosmétique | — | corrigé R ; bouton « Effacer les filtres » dans l'état vide non fait |
| `/reseau/opportunites` | toutes | « Accepter envoie une intro… » alors que rien ne part (gestes notés sur l'écran) | gênant | — | corrigé F (le texte dit que l'intro partira à l'ouverture du réseau) |
| `/reseau/messages` Récentes | toutes | État vide faux quand c'est la recherche qui ne trouve rien | cosmétique | — | corrigé R |

---

## Compte rendu pour Teo

**Corrigé et en ligne** (7 commits du 03/11, vérifiés sur omegaai.fr) :
- le thème sombre ne saute plus en refermant le tiroir sur téléphone ;
- plus aucun menu « … », filtre ou petite fenêtre ne sort de l'écran à 390 : la coquille les recale
  (une quinzaine de cas, dont le filtre d'agence de Tavaro Incidents qu'on ne pouvait pas choisir et le
  « … » du Fil qui faisait glisser toute la page) ;
- les fenêtres reprises de l'ancien espace ne sortent plus blanches en thème sombre (Tavaro, Daliro,
  Lorani, Varelo, FILED) ; le ruban « Données d'exemple » est le même sur toutes les pages ;
- Équipe lisible entre 768 et 900 ; Contacts et Entreprises sans défilement de côté et toutes leurs
  lignes cliquables ; écran des textes de relance CASHD remis d'aplomb ; rail CASHD allumé ;
- Échap, clic dehors, focus et copies réparés un peu partout (les « Copier » disent maintenant
  qu'ils ont copié) ; formulaires qui acceptaient « abc » comme courriel ou doublaient au second clic ;
- une série de textes coupés net, de barres de sélection trop larges, de volets cachés sous la barre,
  et quelques mots (« Filtrer », « Systèmes », « vous pouvez aider »).

**Ce qui attend ta décision :**
1. **Retour du navigateur** : ouvrir une note, un événement, un bloc, une carte d'opportunité ou un
   onglet de liste remplace l'adresse, donc Retour quitte la page. Faut-il que l'ouverture d'un élément
   crée une étape dans l'historique (et les filtres non) ?
2. **Nom de l'organisation d'exemple** : « CAMA » ou « Atelier Bertin » ? Les deux coexistent.
3. **Clés brutes dans Équipe** (« gerant », « admin »…) : on les retire ?
4. **Fiches sans entrée allumée** dans le volet (Tavaro contrat, Tamila dossier et faits) : une entrée
   peut-elle couvrir plusieurs adresses ?
5. **Écosystème** : une entrée dans le rail ?
5 bis. **Point du matin** : « Personnaliser » mène aux Réglages, qui ne règlent ni l'heure ni le canal du point. Un écran pour ça, ou on retire le lien ?
6. **Réseau** : fiche de membre inconnue qui tombe sur la 404 du site vitrine (une page « introuvable »
   propre à Espace 2 ?) ; publication faite sous un filtre qui disparaît (lever le filtre ?).
7. **Données d'exemple** : le compte « Froid Services Vannes » d'OFFLOAD manque ; seuls 5 patients
   cherchables dans Tiroma ; les commandes d'approvisionnement de Daliro changent d'identifiant à chaque
   chargement.
8. **Pilules coupées sans « … »** dans les listes façon Linear (Tiroma, Daliro, Lorani) : c'est la
   copie de Linear ; veux-tu plutôt que les moins utiles disparaissent quand la place manque ?
9. Le `package-lock.json` est à régénérer (`npm ci` échoue).
