# NOTES-C1 — l'espace client, nouveau design (ouvrier C1)

Branche : `tableau-de-bord-v2` (jamais main). Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg.

## REPRISE (pause demandée par Teo, 11/10/2026, 15 h 40 Z)

### Priorité en cours : /espace2 sur le dessin de /omega
- **Posé (e5198b7, branche tableau-de-bord-v2)** :
  - `components/espace2/client.css` : la finition de /omega copiée sous la portée `.v2.oc` et `html.oc-actif` (Geist, liens 28 px, cartes 12 px sans liseré, tableaux, menus 12 px), plus des contrastes AA.
  - Coquille : classe `oc`, choix Sombre/Clair dans le menu du compte (`theme.ts` avec useStockage, clé `espace2.theme`, amorce dans `amorce.ts`), logo selon le thème.
  - Liens vers l'ancien espace retirés du menu du compte et de la palette.
  - La recette C1 règle le thème par localStorage.
- **Règle** : ne jamais importer ni modifier components/omega ou app/omega (une autre session y travaille) ; on recopie.
- **À poser** :
  1. La vue d'ensemble client à la manière de AccueilOmega (carte « Activité » à 4 petits graphiques, « Aujourd'hui », « Prochaines échéances »). Question posée au coordinateur : retirer « Bonjour » et la rangée de chiffres comme /omega ?
  2. Passer chaque module (Tiroma, Tamila, Lorani, Daliro, Varelo, Tavaro, REPUT, CASHD, OFFLOAD, FILED, validations, utilisation, réglages) aux 5 largeurs en clair, pour repérer les écarts de contraste (le clair n'avait jamais été recetté).
  3. Comparer de près avec /omega : rendre CoquilleOmega par une route temporaire locale (app/zz-…, à supprimer, et `rm -rf .next/dev` après) en bloquant *supabase.co*.
- **Reste à d'autres** : axe tavaro td[data-negatif] (contraste).
- **15/10, lot 2a** (main fusionné, dont ad51268, le logo seul en haut de la barre) : la vue d'ensemble client est allégée comme celle de /omega (e432eeb) : une ligne par élément, la date à droite (rouge si dépassée), la flèche au survol, plus d'icônes, d'avatars, de colonne « État » ni de bandeau de l'assistant ; les noms de fournisseur sont des liens (axe : un tableau qui défile doit contenir un élément focalisable). « Bonjour » et les quatre chiffres restent en attendant la réponse de Teo. Recette C1 : 0 échec.
- **15/10, lot 2b** : À valider allégé comme /omega (oc-val-simple) : une ligne par demande, le montant et le délai à droite (rouge si dépassé), la flèche au survol ; plus de filtres catégorie et échéance. On garde la vue, le module, la recherche et le circuit d'approbation, qui est la vraie chaîne des approbateurs du client et pas la frise de statut de /omega. Recette C1 : 0 échec.
- **En attente** : l'écran Équipe d'A3 (worker-a3 2340dd1, /espace2/equipe). Dès qu'il est dans main, faire pointer l'entrée « Équipe » du sous-menu Réglages (Coquille) vers /espace2/equipe.
- **15/10, lot 2c** : Point du matin allégé comme /omega (oc-pm-simple). Une ligne par élément, le détail à droite, l'action au survol. Le titre de chaque carte mène à la page (plus de ⋮ ni de lien en pied). La barre ne garde que la date et « Exemple ». Plus de filtre module, d'heure, de mention de remise ni de « Recevoir par ». La carte « Équipe & continuité » garde sa mise en page. Recette C1 : 0 échec.
- **15/10, Équipe** : main est fusionné (dont l'écran d'A3). L'entrée « Équipe » du sous-menu Réglages mène à /espace2/equipe, la page a son titre dans la barre du haut et elle est dans la recette C1. axe trouve 4 écarts label-content-name-mismatch dans EcranEquipe (.esp-lien-bouton des lignes), signalés à A3.
- **15/10, lot 2d** : les collections (Tâches, Notes, Appels, Entreprises, Contacts) sur le modèle de Tâches et Appels de /omega (1a2d759, 999c87f). Une barre fine (recherche toujours là, « Ajouter » à droite), puis une ligne par fiche : le titre, un détail gris, une seule date à droite (rouge si une tâche ouverte est en retard), la corbeille au survol. Les textes longs passent en infobulle et l'intro va dans l'état vide. Recette C1 : 0 échec sur mes écrans (restent les 4 écarts d'EcranEquipe, signalés à A3).
- **Prochain pas** : comparer Activité, Utilisation et Réglages à /omega ; attendre la réponse de Teo sur « Bonjour » et les 4 chiffres de la vue d'ensemble.

## REPRISE précédente (06/10/2026, 21 h Z)

### Fait
- **Coquille /espace2** (palier 1 + retour Teo 366b75f) : barre latérale de 255 px (organisation, « Rechercher » touche F / ⌘K, trois groupes, compte, cloche), barre du haut (portée, titre centré, « Nouveau… », « Assistant » bientôt), tiroir sous 768 px, clair/sombre, palette, toasts. Jetons Geist relevés sur vercel.com (espace2.css).
- **Phase 2** : tous les écrans de /espace repris TELS QUELS dans /espace2 (`components/espace2/Habille.tsx` + `habillage.css` ; liens /espace/… réécrits vers /espace2/…, `?ancien=1` garde l'ancien). FILED « À payer » redessiné (components/espace2/filed/APayer.tsx).
- **Bascule** (proxy.ts) : sur main depuis 2977fb8 ; /espace/* → /espace2/* en 307, `?ancien=1` + témoin `espace_ancien` (7 j) garde l'ancien. `PAS_ENCORE_DANS_ESPACE2` vidée (aa78ad7).
- **main contient la branche jusqu'à 09a02c7.**
- **Après 09a02c7, sur la branche, pas encore sur main** :
  - df5b4b2 fusion de main (corrections du coordinateur dans habillage.css/dialog.css, 36d475b) ;
  - modèle « vue d'ensemble » (aperçu de projet de la référence) appliqué à /espace2 : en-tête, grand bloc « Dernier document reçu » avec l'aperçu de la pièce, blocs compacts (activité récente, indicateurs, en attente) ;
  - modèle « Usage » : composant réutilisable `components/espace2/Suivi.tsx` (`ChoixPeriode`, `CarteSuivi`, `DetailBarres`) et première page `/espace2/utilisation` (entrée « Utilisation » dans la barre latérale) ;
  - `evenements.ts` (activité partagée), `organisation.ts` (nom affiché), correctifs CSS : liens-boutons primaires lisibles, détails repliés vraiment repliés.
- Vérifications au dernier état : voir le commit de recette en tête de branche (non-régression A3, recette C1 21+ écrans × 5 largeurs × clair/sombre).

### Attend le coordinateur
- Fusionner `tableau-de-bord-v2` (tête : voir le dernier message C1) dans main ; la bascule est déjà sur main, rien à exclure.
- Transmettre à C4 (OFFLOAD) : `components/espace/offload/Courbe.tsx:66`, `<rect>` focalisable avec `aria-label` sans rôle (axe aria-prohibited-attr, grave, 24 nœuds, aussi sur /espace/offload) → `role="img"`.
- Relancer la prévisualisation Vercel quand le quota revient.

### Attend Teo
- Avis sur la vue d'ensemble « aperçu de projet » et sur la page « Utilisation » (modèle Usage).

### Prochaine étape exacte
1. **Table des lignes de facture FILED à 390 px** (/espace2/filed, dossier ouvert : #, Désignation, Qté, P.U. HT, Montant HT, TVA, Commande ; 528 px de large). Aujourd'hui elle est dans un `.esp-tableau-cadre` qui défile, atteignable au clavier : la page ne déborde pas (mesuré 0 px), mais le coordinateur l'a relevée. Option retenue à faire : la passer en cartes sous 640 px de colonne, par CSS dans `habillage.css` (`@container principale (max-width: 639px)` sur la table des lignes du dossier — la viser par `#esp-dossier .esp-tableau`), sans toucher DossierVue.tsx.
2. Brancher d'autres pages de suivi sur `Suivi.tsx` (temps économisé, relances CASHD) dès que leurs modules rendent ces chiffres.
3. Retirer l'ancien design une semaine après la bascule (sur ordre du coordinateur) : app/espace → redirection permanente, puis supprimer le témoin `espace_ancien`.

### Outils
- Recette : `node omega/recette-c1/recette.mjs http://localhost:<port> omega/recette-c1/captures` (build de production + `next start`).
- Non-régression A3 : `node omega/recette-a3/non-regression.mjs /espace2 http://localhost:<port>` ; scénarios et accessibilité d'A3 : `PREFIXE=/espace2 node omega/recette-a3/recette-espace.mjs …` et `accessibilite.mjs` (versions à préfixe sur worker-a3 fa23419).
- Quota Vercel : 2 à 3 poussées par jour au plus, par paliers montrables.
