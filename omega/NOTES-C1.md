# NOTES-C1 — l'espace client, nouveau design (ouvrier C1)

Branche : `tableau-de-bord-v2` (jamais main). Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg.

## REPRISE (pause demandée par Teo, 06/10/2026, 21 h Z)

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
