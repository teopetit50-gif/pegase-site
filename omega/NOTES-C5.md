# Session C5 — la vitrine exactement vraie

## REPRISE (pause demandée par Teo, 06/10/2026, 21 h Z)

**Règle de Teo (06/10, 19 h 25 Z puis 19 h 40 Z) : le site public omegaai.fr reste inchangé.** Aucune pastille
« En préparation », aucune reformulation sans son accord. main est revenu à la vitrine de 15 h 55 (c0494b4c), sauf
trois phrases corrigées avec son accord (Tamila hébergé dans l'UE ; Tiroma point du matin dans l'espace sécurisé ;
Tiroma ne contacte un patient qu'avec un message validé). **Ne modifier aucun fichier de vitrine sans un ordre écrit
du coordinateur qui cite l'accord de Teo.**

**Fait :**
- Passes 1 à 8 (reformulations, pastilles, REPUT, OFFLOAD, métré, appels manqués) : écrites et recettées, détail
  ci-dessous phrase par phrase. Les passes 1 à 7 ont été fusionnées puis retirées de main par la remise du site ; la
  passe 8 (972ccfda, b2f01678) n'a jamais été fusionnée. **Aucune n'est à fusionner** (décision de Teo) ; la branche
  est gardée comme trace.
- Chiffrage des pages transversales (lecture seule) : `omega/CHIFFRAGE/transversal.md`, commit f8c9ff9d. 220 promesses
  (29 A, 67 B, 76 C, 33 D, 15 T), ≈ 135–160 j pour tout amener à B, ≈ 80 j + 4 j communs de B à A. À reprendre
  seul : `git checkout f8c9ff9d -- omega/CHIFFRAGE/transversal.md` (ne pas fusionner la branche).

**Prochaine étape exacte :** attendre le réveil du coordinateur. Si Teo accepte de corriger les phrases fausses
relevées sans code (synthèse du chiffrage, point 5), repartir d'une branche neuve sur origin/main, corriger ces
phrases seulement, recette aux 5 largeurs, et rendre le SHA sans pousser sur main.


Branche `worker-c5`. Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg.
Source : `omega/AUDIT-PROMESSES.md` (06/10/2026, 16 h Z), § 0, § 1, § 2 et § 3.
Dernière mise à jour : 06/10/2026.

Règle de Teo : « livrer tout ce qu'on promet, pas une chose de moins ». **Aucune promesse n'est retirée.**
Une phrase fausse aujourd'hui ou contraire à une décision est reformulée (§ 3, points 1 à 12) ; une promesse
dont le code n'existe pas encore garde sa ligne et porte la pastille « En préparation » (point 13).

Non touchés : `/espace` et la coquille (C1).

## Comment retirer une pastille quand un ouvrier livre

| Où vit la promesse | Ce qu'on fait à la livraison |
|---|---|
| Catalogue des quatre pages produit (`lib/produits/capacites/*.ts`) | le coordinateur bascule la ligne à `atteste: true` ; la pastille tombe d'elle-même (`components/produits/capacites/Capacites.tsx`) |
| Pages métiers (`components/secteurs/*`) | retirer la phrase de `lib/en-preparation.ts`, dans la liste du module ; la pastille tombe partout où `<SiEnPreparation pour="…" t={…} />` la rend |
| Intégrations (`lib/integrations.ts`) | retirer `statut: "preparation"` ou `statut: "demande"` de la fiche de l'outil |
| /vos-donnees (garanties, « ce que vous obtenez ») | retirer `preparation: true` (garantie) ou remettre la ligne en simple chaîne (`obtenez`) |
| Tamila, section « Secret professionnel » | retirer `preparation: true` de l'engagement dans `components/secteurs/avocats/textes.ts` |
| Lorani, bandeau DWG | retirer `<EnPreparation />` de `components/secteurs/architectes/Metiers.tsx` |

La pastille : `components/ui/en-preparation.tsx` (style en ligne, couleur héritée, point ambre ; variante « Sur
demande » à point gris pour les intégrations).

## § 3, points 1 à 12 — les reformulations

Lignes données sur `worker-c5` après modification.

### 1. Point du matin dentaire « sur WhatsApp » (décision D6)

Fait : NOTES-B3 § 2-3 et 19ab — un contenu de santé ne part ni par SMS ni par WhatsApp ; aucun fournisseur agréé HDS ;
le point nominatif reste derrière l'authentification, le courriel `tiroma.point_matin` ne porte que des compteurs et un lien.
Ouvrier : B3 (+ A2 pour un fournisseur agréé santé). Retour à l'ancienne phrase : jamais pour WhatsApp tant que D6 tient ;
« par e-mail » nominatif possible seulement avec un fournisseur HDS agréé et une décision de Teo.

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/dentaire/Formules.tsx:167 | « Chaque jour ouvré à 7 h, par WhatsApp ou par e-mail, sur le téléphone du titulaire et de l'assistante. Rien à ouvrir, rien à installer. » | « Chaque jour ouvré à 7 h, dans votre espace sécurisé ; un courriel prévient le titulaire et l'assistante, sans nom de patient. Rien à installer. » |
| components/secteurs/dentaire/textes.ts:192 | « Point du matin par WhatsApp ou e-mail » (comparatif) | « Point du matin dans un espace sécurisé » |
| components/secteurs/dentaire/textes.ts:212 | « Point du matin sur WhatsApp » | « Point du matin dans votre espace sécurisé » |
| components/secteurs/dentaire/Schema.tsx:157 | nœud « WhatsApp » | nœud « Espace sécurisé » (icône ShieldCheck) |
| components/secteurs/dentaire/textes.ts:24 (commentaire) | « WhatsApp et l'e-mail sont les canaux où le CABINET reçoit son point du matin » | la règle D6 écrite pour la prochaine session |

### 2. Tamila « hébergé en France »

Faits : chiffrement dans le navigateur, AES-256-GCM, une clé par dossier (NOTES-B4 § 1) ; base et stockage à Francfort
(/vos-donnees, eu-central-1) ; clé maître du cabinet chez Scaleway Key Manager, région `fr-par` (NOTES-B4 § 10 ; secrets
Scaleway encore à poser par Teo, d'ici là la clé de dossier est enveloppée par la phrase du cabinet, donc chez lui).
Ouvrier : B4 / A5. Retour à « hébergé en France » : seulement si la base et le stockage de Tamila déménagent chez un
hébergeur en France (décision de Teo du 24/09 à réaliser par A5).

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/avocats/textes.ts:65 | « L'éditeur est français, et vos pièces sont hébergées en France. » | « L'éditeur est français, et vos pièces sont chiffrées sur votre poste avant d'être conservées dans l'UE. » |
| components/secteurs/avocats/textes.ts:138 | « Tamila les stocke en France, chez un hébergeur français, et les lit en Europe, sans rien en conserver. » | « Tamila les chiffre dossier par dossier avant qu'elles quittent votre poste, les conserve dans l'Union européenne et confie les clés à un prestataire français. » |
| components/secteurs/avocats/textes.ts:139 | badge « Français, hébergé en France » | « Éditeur français, clés en France » |
| components/secteurs/avocats/textes.ts:144-145 | « Hébergement : France, hébergeur français » | « Hébergement : Francfort, Union européenne » + nouvelle ligne « Clés de chiffrement : Prestataire français » |
| components/secteurs/avocats/textes.ts:153 | « Stockées en France, lues en Europe » + « Elles sont conservées en France. Leur lecture se fait dans l'Union européenne, et aucune copie n'y est gardée. » | « Chiffrées sur votre poste » + « Chaque pièce est chiffrée, dossier par dossier, avant de quitter votre poste, puis conservée dans l'Union européenne. Les clés sont chez un prestataire français. Le modèle qui la lit est interrogé hors d'Europe, sans entraînement sur vos pièces. » |
| components/secteurs/avocats/textes.ts:174 | formule Pré-lecture : « Hébergement en France » | « Chiffré sur votre poste, conservé dans l'UE » |
| textes.ts:25-31, Secret.tsx:42 (commentaires) | décisions des 24 et 28/09 | les faits du code et le renvoi ici |

### 3. « Lecture des pièces : en Europe » contre « modèles interrogés hors d'Europe »

Fait : MISE-EN-PRODUCTION § secrets — `ANTHROPIC_API_KEY` sur la recette (hors UE), Bedrock eu-central-1 prévu en
production, pas encore posé. La phrase vraie partout est celle de l'accueil (« Interrogés hors d'Europe »,
app/page.tsx:574, inchangée) ; Tamila s'y aligne. « Sans conservation » retiré aussi : /vos-donnees dit « rétention
30 jours max » chez le fournisseur de modèles. Ouvrier : A5 (Bedrock en production). Retour à « lues en Europe » :
quand le lecteur de production tourne sur Bedrock eu-central-1 sans `ANTHROPIC_API_KEY`, sur toutes les pages à la fois
(accueil app/page.tsx:574, components/accueil/CartesPreuve.tsx, Tamila).

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/avocats/textes.ts:146 | « Lecture des pièces : En Europe, sans conservation » | « Lecture des pièces : Modèle interrogé hors d'Europe » |
| components/secteurs/avocats/textes.ts:153 | voir point 2 | idem |

### 4. « jamais l'intégralité d'un fichier »

Fait : le lecteur envoie la pièce entière au modèle ; ce qui est vrai, c'est qu'il ne reçoit rien d'autre de l'espace.
Ouvrier : aucun (fait d'architecture). Retour : jamais, sauf si le lecteur découpe un jour les pièces avant l'envoi.

| Fichier:ligne | Avant | Après |
|---|---|---|
| app/page.tsx:600 (FAQ) | « reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier » | « ne reçoivent que la pièce à lire, jamais le reste de votre espace » |
| components/Machine.tsx:50 | « n'accèdent qu'aux éléments requis par chaque tâche, jamais à l'intégralité d'un fichier » | « ne reçoivent que la pièce à lire, jamais le reste de votre espace » |
| lib/services-detail.ts:154 | idem | idem |
| lib/content.ts:396 | idem | idem |

### 5. « Aucune réplication hors UE »

Fait : la base n'est répliquée nulle part hors UE ; les sauvegardes d'A5 (workflow `omega-sauvegarde`) iraient en
artefacts GitHub, hors UE, et leurs secrets ne sont pas posés. Ouvrier : A5 (Scaleway Object Storage, Paris).
Retour à « Aucune réplication n'est effectuée hors de l'Union européenne » : quand les sauvegardes chiffrées sont sur
un stockage UE et que le workflow ne pose plus d'artefact GitHub.

| Fichier:ligne | Avant | Après |
|---|---|---|
| app/vos-donnees/page.tsx:132 | « … à Francfort, en Allemagne. Aucune réplication n'est effectuée hors de l'Union européenne. » | « … à Francfort, en Allemagne, et n'est répliquée nulle part hors de l'Union européenne. Nos sauvegardes chiffrées y auront aussi leur stockage. » |
| app/vos-donnees/page.tsx:173 | « Francfort, Allemagne : aucune réplication hors de l'Union européenne » | « Francfort, Allemagne : la base n'est répliquée nulle part hors de l'Union européenne » |
| app/vos-donnees/page.tsx:367 (h2) | « Vos données sont hébergées à Francfort, sans réplication ailleurs » | « …, sans réplication hors de l'UE » |

### 6. Daliro « WhatsApp, SMS »

Fait : aucun fournisseur SMS en lecture ; la lecture visée est le numéro WhatsApp professionnel (A2) et le courriel.
Ouvrier : B6 avec A1 et A2. Retour à « SMS » : si A2 branche la réception de SMS et que Teo le décide.

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/btp/textes.ts:158 | « … envoient déjà par WhatsApp, SMS ou courriel. » | « … envoient au numéro WhatsApp professionnel de l'entreprise ou par courriel. » |
| components/secteurs/btp/textes.ts:203 (FAQ) | « … là où ils arrivent : WhatsApp, SMS ou courriel. » | « … là où ils arrivent : au numéro WhatsApp professionnel de l'entreprise ou par courriel. » |
| components/secteurs/btp/Chiffres.tsx:24 | « … par WhatsApp, SMS ou courriel. » | « … au numéro WhatsApp professionnel de l'entreprise ou par courriel. » |
| components/secteurs/btp/textes.ts:138 | bandeau « SMS » | « Courriel » |
| components/secteurs/btp/Fonctions.tsx:40 | maquette « SMS envoyé » | « Courriel envoyé » |

### 7. Tiroma « dans les minutes »

Fait : Tiroma lit des exports (chaîne de relevé, NOTES-B3) ; aucune lecture en continu de l'agenda. Ouvrier : B3 + A1
(ouvrier d'export). Retour à « dans les minutes » : si un connecteur lit l'agenda du logiciel en continu.

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/dentaire/textes.ts:144 | « Tout au long de la journée, Tiroma lit … Une annulation saisie à 8 h remonte dans les minutes qui suivent, en lecture seule. » | « À chaque export de votre logiciel, Tiroma lit … Une annulation saisie à 8 h remonte au premier export qui la contient, en lecture seule. » |
| components/secteurs/dentaire/textes.ts:504 (FAQ) | « Tiroma lit l'agenda tout au long de la journée : … dans les minutes qui suivent » | « Tiroma lit l'agenda à chaque export de votre logiciel : … au premier export qui la contient » |

### 8. REPUT « répond dans la minute » contre « rien ne part sans vous »

Fait : la réception existe (A2), la réponse non (C3) ; un envoi sans validation n'existe que sous une politique
d'accord permanent. Ouvrier : C3. Retour : la phrase nouvelle reste vraie après C3 ; « répond dans la minute » seul
contredirait « rien ne part sans vous » et ne revient pas.

| Fichier:ligne | Avant | Après |
|---|---|---|
| app/page.tsx:697 | « Une demande reçue à 21 h obtient sa réponse à 21 h. » | « Une demande reçue à 21 h a sa réponse prête à 21 h. » |
| app/page.tsx:699 | « Lit le message dès son arrivée et répond dans la minute. » | « Réponse prête dans la minute ; seule sur les sujets autorisés. » |
| lib/produits/accueil.ts:177 | « REPUT lit le message dès qu'il arrive, puis répond dans la minute à partir de la base … » | « REPUT lit le message dès qu'il arrive et sa réponse est prête dans la minute, tirée de la base … Elle part seule seulement sur les sujets autorisés d'avance ; vos équipes relisent l'échange le lendemain. » |
| components/offres/HeroBento.tsx:341 | « La réponse part dans la minute, la pièce chiffrée attend votre accord au matin. » | « La réponse est prête dans la minute et part seule sur un sujet autorisé d'avance ; la pièce chiffrée attend votre accord au matin. » |

Seule la ligne de l'accueil est servie aujourd'hui. `lib/produits/accueil.ts` (bloc `CAPACITES`, remplacé le 14/09 par
le catalogue) et `components/offres/HeroBento.tsx` (plus importé nulle part) sont du code mort : corrigés quand même,
pour qu'une remise en service ne ramène pas la phrase fausse. Non touchés, code mort aussi : `lib/fiches.ts` (fiche REPUT
de `/offres/[system]`, route qui ne sert plus que PULSE et VAULT) et `lib/services-detail.ts:121` (ANSWR). Sur
/offres/demandes-clients, « REPUT répond » reste écrit (« Le service est fermé, REPUT répond ») : c'est la promesse de
C3, couverte par les pastilles du catalogue et par la mention « ne répond jamais hors de la base validée ».

### 9. Varelo « branche la même IA sur vos logiciels »

Fait : Varelo lit les exports déposés (modèle `modeles_jeux` à venir) ; aucun connecteur logiciel. Ouvrier : B1 avec A1.
Retour : quand la lecture automatique des sources existe (§ 2 Varelo, « modèle `modeles_jeux` »).

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/groupes/textes.ts:61 | « Varelo branche la même IA sur les logiciels et les tableurs de chaque société, en lecture seule. Chaque matin, elle dit … » | « Chaque société dépose l'export de son logiciel et de ses tableurs ; Varelo le lit sans rien y écrire. Chaque matin, la même IA dit … » |
| components/secteurs/groupes/textes.ts:103 | « La même IA lit les logiciels et les tableurs de toutes les sociétés, en lecture seule, et range … » | « Chaque société dépose l'export de son logiciel ; la même IA le lit sans rien y écrire et range les données de toutes les sociétés … » |
| components/secteurs/groupes/textes.ts:237 | « Varelo lit vos logiciels de gestion, vos caisses et vos tableurs sans jamais rien y écrire. Chaque source se branche avec l'accord de la DSI et se débranche de la même façon. » | « Chaque société dépose l'export de son logiciel de gestion, de ses caisses et de ses tableurs ; Varelo le lit sans jamais rien y écrire. La lecture automatique des sources, avec l'accord de la DSI, est en préparation. » |

### 10. « brouillon dans votre outil »

Fait : fournisseurs gmail/microsoft non branchés ; le brouillon vit dans la file de validation. Ouvrier : A2 (Gmail,
puis Microsoft 365). Retour à « brouillon dans votre outil / dans la messagerie » : quand A2 dépose les brouillons
dans Gmail et Microsoft 365.

| Fichier:ligne | Avant | Après |
|---|---|---|
| app/vos-donnees/page.tsx:150 | « … le message reste un brouillon dans votre outil. » | « … le message reste un brouillon dans votre file de validation Omega. » |
| lib/integrations.ts:57 (Gmail) | « … et les dépose en brouillon dans la messagerie. » | « … et les dépose en brouillon dans votre file de validation Omega. » + `statut: "preparation"` |

### 11. Installation sur vos serveurs

Fait : rien n'existe. Ouvrier : aucun désigné ; reformulé « sur étude ». Retour : quand une installation locale a été
faite et documentée.

| Fichier:ligne | Avant | Après |
|---|---|---|
| app/vos-donnees/page.tsx:122 (meta) | « … à Francfort, ou sur vos propres serveurs. » | « … à Francfort, ou, sur étude, sur vos propres serveurs. » |
| app/vos-donnees/page.tsx:258 | onglet « Installation locale · vos serveurs » | « Installation locale · sur étude » |
| app/vos-donnees/page.tsx:261 | « Ce dispositif s'adresse aux organisations dont la politique interne … » | « Sur étude, pour les organisations qui l'exigent : ce dispositif s'adresse à celles dont la politique interne … » |
| app/vos-donnees/page.tsx:348 (chapô) | « … ou sur une machine installée dans vos locaux … » | « … ou, sur étude, sur une machine installée dans vos locaux … » |
| components/secteurs/groupes/textes.ts:273 | « … dans l'Union européenne ou sur vos propres serveurs … » | « … dans l'Union européenne ou, sur étude, sur vos propres serveurs … » |

### 12. Tiroma « ne contacte jamais un patient à votre place »

Fait : b3_14 envoie des rappels validés par le cabinet. Ouvrier : B3. Retour : sans objet (la phrase nouvelle est vraie).

| Fichier:ligne | Avant | Après |
|---|---|---|
| components/secteurs/dentaire/textes.ts:488 | « … il ne contacte jamais un patient à votre place. » | « … il ne contacte un patient qu'avec un message que vous avez validé. » |

## § 3, point 13 — « En préparation »

### Catalogues des pages produit — 125 lignes

Toutes les lignes `atteste: false` de `lib/produits/capacites/{accueil,factures,relances,reprise}.ts`
(30 + 31 + 31 + 33) portent la pastille sur /offres/demandes-clients, /offres/factures-fournisseurs,
/offres/relances-impayes et /offres/nouvelles-affaires. Ouvriers : C3 (REPUT), A1/A4 (FILED), C2 (CASHD), C4 (OFFLOAD).
Retrait : bascule `atteste: true` par le coordinateur.

### Pages métiers — `lib/en-preparation.ts`

| Module | Lignes | Ouvrier | Où |
|---|---|---|---|
| Tiroma | assistante absente, demi-journées vides, absences probables, synthèse de la semaine / pour la direction, objectifs par fauteuil, taux de réinscription, point du matin par centre / par site, plusieurs sites (14 libellés) | B3 | PourQui.tsx, Formules.tsx (points et détail) |
| Tamila | les 4 cartes « fonctionnalités », la section point du matin, toute la formule Pré-lecture (sauf l'hébergement), la formule Cabinet sauf « délais d'appel lus dans l'avis RPVA » et « lecture seule » (37 libellés) | B4 avec A1 | Sections.tsx, Formules.tsx |
| Tamila (Secret) | « Effacement à la clôture », « Chaque accès est journalisé » (export du journal) | B4 / A3 | textes.ts `preparation: true` |
| Lorani | 30 lignes des formules sur 38 ; seules restent sans pastille : calendrier du permis, « Tout ce que contient … » (×3), utilisateurs sans supplément, hébergement dans l'UE, bureaux d'études invités, accès sans limite d'équipe ; plus le bandeau « lus en PDF ou en DWG » | B5 avec A1 | Formules.tsx, Metiers.tsx |
| Daliro | lecture des photos et vocaux, signature sur place, relance des avenants, ordre des lots recalé, alerte météo, les cinq lignes d'approvisionnement (10 libellés) | B6 avec A1/A2 | Formules.tsx |
| Varelo | le groupe sur une page, les réserves à émettre, les reportings dus | B1 avec A1 | Survol.tsx, Carrousel.tsx |
| Tavaro | modules 02 à 11, 13, 15 à 20 (17 sur 20) | B2 | GrilleModules.tsx |

### Intégrations — `lib/integrations.ts`

Gmail : « En préparation » (A2). WhatsApp : sans pastille (le code existe, secrets à poser). Les 26 autres :
« Sur demande ». Compteur : « 28 outils raccordés à ce jour » → « 28 outils au catalogue, raccordés à la demande »
(app/integrations/page.tsx:138). Retour : retirer le statut outil par outil ; « raccordés à ce jour » seulement
quand tous le sont.

### /vos-donnees

« Tout est journalisé » (journal exportable : A3), « Les sauvegardes et la supervision comprises » (A5),
« Un export complet en un clic, à tout moment » (A3 écran + A5 Storage).

## Questions ouvertes au coordinateur

1. **Accueil, cartes CASHD / OFFLOAD / REPUT** (app/page.tsx, ACCROCHES_VITRINE) : CASHD et OFFLOAD sont absents en
   entier, la réponse REPUT aussi. Je n'ai pas posé de pastille sur les cartes de l'accueil (trois sur quatre l'auraient).
   À trancher : pastille sur la carte, ou seulement sur le catalogue de la page produit (fait).
2. **Varelo, point du matin par direction** (chapô du héros) : pas de pastille dans un héros ; à trancher de même.
3. **Tavaro 01, 12, 14** : laissés sans pastille, avec deux manques connus (photo floue refusée, frais de dossier
   refacturés). À basculer si tu juges que le module n'est pas livré.
4. **Tavaro, section « Solutions »** (onglets Remise en location, Assistance, Sortie de flotte, avec maquettes) : pas
   de pastille sur les onglets ; la grille des modules juste dessous la porte. À trancher de même que le point 1.

## Recette

`npx tsc --noEmit` vert ; eslint sur les fichiers touchés : 0 erreur (1 avertissement préexistant sur main,
`FlecheCoin` inutilisé dans app/vos-donnees/page.tsx) ; `npm run build` vert. Captures aux cinq largeurs
(390 / 768 / 1024 / 1440 / 1700) dans `omega/recette-c5/` (`<page>-<largeur>-<n>.jpg`), sur `next start` du build.

Bilan (Chromium, mouvement réduit, page défilée entière ; les `<details>` de Daliro ouverts) : **aucun débordement
horizontal** sur les 13 pages × 5 largeurs ; phrases nouvelles présentes et anciennes absentes du HTML servi
(accueil, /vos-donnees, /integrations, dentaire, avocats, btp, groupes). Pastilles visibles : catalogues 30 à 32 par
page (6 à 8 sous 768 px, où chaque famille se replie à deux lignes), intégrations 27 (une famille affichée à la fois),
Tiroma 12, Tamila 31, Lorani 31, Daliro 10, Varelo 4, Tavaro 34 (grille + fiches de survol ; 17 sous 768 px).
Relu à l'œil : la pastille passe à la ligne proprement dans les listes étroites (Lorani et Tiroma à 390), ne casse pas
les rangées à hauteur fixe du comparatif Daliro, et reste lisible sur les titres de cartes Tamila.

## Passe 2 — réponses du coordinateur (06/10, après 16 h 27 Z)

Base : `worker-c5` (a803fd1) avec `origin/main` 959f115 fusionné (dbf427c). Chaque livraison a été vérifiée par
son commit sur la branche de l'ouvrier avant de retirer la pastille.

### Questions tranchées

| Question | Décision | Fait |
|---|---|---|
| 1. Accueil, cartes CASHD / OFFLOAD / REPUT | pastille sur la carte (C2, C4, C3 construisent) | `app/page.tsx` : `EN_PREPARATION = ["CASHD", "OFFLOAD", "REPUT"]` ; `components/accueil/TuilesCatalogue.tsx` : champ `preparation`, pastille à côté du nom. Retrait : enlever le sigle du tableau. |
| 2. Varelo, point du matin par direction | livré (b1_07, 7512a38) ; pas de pastille dans le héros | aucune pastille n'existait pour lui |
| 3. Tavaro 01, 12, 14 | livrés (b2_07 0e2cc89 ; b2_08 8c928e4) | sans pastille, inchangé |
| 4. Tavaro, onglets « Solutions » | pastille | `components/secteurs/location/Solutions.tsx` : onglet et titre du panneau pour Remise en location, Assistance, Sortie de flotte (même liste `tavaro`) ; « Facturation des retours » et « Le point du matin » sans pastille |

### Pastilles retirées (livraisons vérifiées)

| Module | Libellés retirés de `lib/en-preparation.ts` | Preuve |
|---|---|---|
| Tiroma | Synthèse de la semaine (pour la direction), Synthèse pour la direction | b3_15, 72ec683 (test 16) |
| Tiroma | Taux de réinscription (×3 libellés) | b3_16, 3dd4b88 (test 17) |
| Tiroma | Absences probables | b3_17, ea1a91f (test 18) — **réserve du coordinateur** : b3_16/17, compte « daf2 direction » refusé, renvoyé à B3 (NOTES-COORDINATEUR) |
| Tamila | Effacement à la clôture (liste et `preparation: true` de l'engagement) | b4_11, 814adee (test 20) |
| Tamila | Temps passé proposé à la saisie, Forfaits dépassés, Conventions et forfaits | b4_12, 385e77c (test 21) et 4736d71 (écran) |
| Lorani | Permis : PC1 à PC8 et PLU ; Revérification à chaque indice | b5_16, a05f77c (test b5_07) |
| Lorani | Situations et décomptes ; Visa des fiches techniques ; Visas calés sur les délais de commande ; Registre daté des visas | b5_13 à b5_15 (53bc500, b9cd972, d9000ea ; tests b5_04 à b5_06) |
| Daliro | Relance des avenants non signés | b6_18, c3ab533 |
| Daliro | Ordre des lots recalé | b6_19, 9ad8930 |
| Varelo | Le groupe sur une page | b1_08, fdd8e5c (tests b1_11) |
| Varelo | Les reportings dus | b1_09, 68f7d46 (tests b1_12) |

Gardés, faute de preuve : Lorani « Plans croisés, rapport PDF annoté » (b5_16 croise les planches, mais le rapport
PDF annoté n'existe pas), « Fonds de plan BET croisés », « Analyse des offres sur DPGF » (b5_16 contrôle les planches
contre la DPGF, pas les offres), DWG, export Excel, DOE, comptes rendus, réserves et GPA, décennales, RE2020/ERP/Cerfa ;
Daliro : pointage des heures et rentabilité (b6_17) n'avaient pas de pastille ; Varelo : comptes réciproques (b1_06)
n'avaient pas de pastille, « Les réserves à émettre » reste.

Restent : Tiroma 7, Tamila 33, Lorani 24, Daliro 8, Varelo 1, Tavaro 17.

### FILED — lignes de `lib/produits/capacites/factures.ts` pour la bascule `atteste: true` (au coordinateur)

Numéros à dbf427c (identiques à ceux de NOTES-A4 sur worker-a4). Condition commune posée par A4 : migration posée
en production et tests verts là-bas ; aujourd'hui la recette seulement.

| Ligne | Texte | Preuve | À basculer ? |
|---|---|---|---|
| 31 | « Un fichier qui contient plusieurs factures est découpé pièce par pièce. » | a4_21 f184edc (`test_a4_21_01`, `02`) + `lecteur/decoupage.ts` d'A1 | **oui**, quand le lecteur d'A1 avec le découpage est déployé (sinon la porte reste `porte_absente`) |
| 35 | « Un historique de plusieurs exercices se reprend en une fois à l'installation. » | a4_24 e3eaac3 (`test_a4_24_01` à `03`) | **oui**, quand l'écran d'installation (A3) envoie les FEC ; la reprise porte sur les FEC, pas sur les PDF |
| 44 | « La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits. » | a4_22 30d3991 (autoliquidation à 20 %) | **non** : la TVA sur les débits (A1) manque encore |
| 45 | « La devise, le taux de change et la contre-valeur en euros au jour d'émission. » | a4_22 30d3991 (contre-valeur, écart de change) | **oui avec réserve** : les taux BCE attendent un ouvrier qui les pose chaque jour (B7 ou A2) |
| 59 | « La commande, la réception et la facture sont rapprochées avant toute validation. » | a4_08 + a4_23 11c1f8b (`test_a4_23_01` à `03`) | **oui avec réserve** : vrai seulement si l'organisation règle `reception_exigee` ou `commande_exigee` |
| 81 | « L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur. » | a4_02 (test a4_01) + a4_24 (`test_a4_24_02`) | **oui** (déjà dans la liste « dès la production » de NOTES-A4) |

La réception par courriel (a4_20, e749aa5) prouve la ligne 28, déjà à `true`. L'extourne (a4_22) n'a pas de ligne
propre. Le reste de la liste « dès la production posée » de NOTES-A4 (lignes 60, 62, 69, 70, 72 à 74, 82, 85, 86,
94 à 98) est à basculer dans le même geste.

## Passe 3 — 06/10, après 16 h 45 Z (main e197172)

### Décision du coordinateur sur `atteste`

**Aucune ligne de catalogue ne passe à `atteste: true` avant la production.** « En préparation » reste vrai pour le
client tant qu'il ne peut pas s'en servir. Le coordinateur bascule tout au palier de mise en production, avec la liste
ci-dessus (passe 2, FILED) tenue à jour ici. Ajouts depuis a4_27 (467f423, lecteur v24) :

| Ligne de factures.ts | Texte | Preuve | État |
|---|---|---|---|
| 44 | « La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits. » | a4_11, a4_22, a4_27 (mention `tva.debits` lue et signalée) | passe à **oui** (était « non ») |
| 45 | « La devise, le taux de change et la contre-valeur en euros au jour d'émission. » | a4_22 + a4_27 (`test_a4_27_03`, `04`) | oui, une fois que l'ouvrier BCE de B7 pose les cours |
| 48 | « Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire. » | a4_27 (`test_a4_27_01`, `02`) | oui |

REPUT (`lib/produits/capacites/accueil.ts`) : lignes tenues d'après NOTES-C3 § « Lignes de capacité » (base versionnée,
réponse tirée de la base, transfert hors base, classement, langue, plusieurs langues, mention automatisée,
réclamation, demande de parler à quelqu'un, hors périmètre, archive) ; à basculer au même palier.

### Corrections

| Fichier:ligne | Avant | Après | Raison |
|---|---|---|---|
| lib/produits/capacites/factures.ts:132 | « Les montants sont lus tels qu'ils figurent sur la pièce, sans conversion. La contre-valeur en euros reste à la charge de votre comptabilité. » | « … avec la devise et le taux. L'écriture porte la contre-valeur en euros, au taux de la pièce ou au cours BCE du jour d'émission, et l'écart de change ; sans taux connu, la pièce attend au lieu d'être comptabilisée. » | a4_22 30d3991, a4_27 467f423 (NOTES-A4 § lecteur v24) |
| lib/produits/accueil.ts:85 (héros /offres/demandes-clients) | « Une demande reçue à 21 h obtient sa réponse à 21 h » | « … a sa réponse prête à 21 h » | C3 : réponse préparée, envoi seul sur sujet autorisé |
| lib/produits/accueil.ts (chapô du héros) | « … votre client reçoit sa réponse, et elle ne dit rien que vous n'ayez validé. » | « … la réponse est préparée dans la minute à partir de la base que vous avez validée. Elle part seule sur les sujets que vous avez autorisés, et attend votre accord sur tous les autres. » | C3 paliers 2 et 3 |
| lib/produits/accueil.ts (ÉTAPES 02) | « Nous connectons WhatsApp Business, votre messagerie et votre agenda … » | « Nous connectons WhatsApp Business et votre messagerie … Le raccordement de votre agenda est en préparation. » | rendez-vous : C3 palier 5, pas construit |
| lib/produits/accueil.ts (ÉTAPES 03) | « Une semaine en double » ; « Vos équipes reçoivent copie de chaque réponse la première semaine … sur les postes que vous ouvrez. » | « Une semaine sous votre contrôle » ; « La première semaine, chaque réponse attend votre validation, et nous corrigeons la base sur des cas réels. Vous autorisez ensuite, sujet par sujet, les réponses qui partent seules. » | C3 : file de validation, accord par sujet |
| lib/produits/accueil.ts (CANAUX, chapô) | « … puis répond à partir de votre base. » | « … puis prépare la réponse à partir de votre base. » | idem |
| lib/produits/accueil.ts (FAQ « même créneau ») | « La réservation s'écrit directement dans votre agenda … » | « La prise de rendez-vous dans votre agenda est en préparation. Une fois raccordée, la réservation s'écrit en temps réel … » | palier 5 |
| lib/produits/accueil.ts (FAQ « qui décide ») | « … vous décidez poste par poste ce qui part seul … » | « … vous autorisez sujet par sujet les réponses qui partent seules ; les réclamations, les urgences et les demandes de parler à quelqu'un restent toujours relues par vos équipes. » | C3 c3_01 (sujets jamais autorisables), c3_03 (garde) |
| lib/produits/accueil.ts (FAQ avis) | « La demande part dans les trois jours … » | « La demande d'avis est en préparation. Elle partira dans les trois jours … » | palier 5 |
| lib/produits/accueil.ts (JOURNÉE, 23 h 05) | « Transféré : l'astreinte est appelée » | « Transféré : alerte urgente à vos équipes » | C3 : alerte critique ; l'appel d'astreinte est au palier 5 |
| app/offres/demandes-clients/page.tsx:72 (meta) | « … obtiennent une réponse à toute heure … » | « … ont leur réponse prête à toute heure …, et validée par vous. » | idem |
| lib/content.ts:127 (benefit REPUT) | « … reçoit sa réponse à 21 h, sur son canal. » | « … a sa réponse prête à 21 h, sur son canal. » | idem |

Laissés tels quels, mais à signaler : la conversation d'exemple du haut de la page (« Je peux vous réserver samedi
9 h 30 ? », « Rendez-vous créé dans l'agenda ») et les issues d'exemple « Créneau réservé, rappel la veille »
(MÉTIERS, JOURNÉE) montrent la prise de rendez-vous, qui n'est pas construite ; les tuiles « Fiche Google Business »
et « Google Agenda » de CANAUX (positionnées en absolu, pas de place pour une pastille). Les catalogues portent la
pastille sur ces lignes. Retour aux anciennes phrases : quand C3 livre le palier 5 (rendez-vous, avis, astreinte).

## Passe 4 — 06/10, après 16 h 54 Z : les exemples REPUT ne montrent que ce qui est construit

Décision du coordinateur : remplacer tout de suite les exemples qui montrent une prise de rendez-vous (C3 palier 5,
pas construit) par des issues construites, et ne garder que les canaux de réception existants (A2 : courriel,
formulaire, WhatsApp). Retour aux anciens exemples : quand C3 livre le palier 5 (rendez-vous, rappel, avis) et A2
les fournisseurs Gmail / Microsoft.

| Fichier | Avant | Après |
|---|---|---|
| lib/produits/accueil.ts, CONVERSATION (panneau du haut) | « … Je peux vous réserver samedi 9 h 30 ? » / « Parfait pour 9h30 » / « C'est réservé, samedi 9 h 30. Vous recevrez un rappel vendredi soir. » ; issue « Rendez-vous créé dans l'agenda du service · client confirmé » | « … Votre demande de créneau est transmise à l'atelier, qui vous le confirme dès l'ouverture. » / « Parfait, merci » ; issue « Répondu depuis la base · créneau transféré à l'équipe » |
| lib/produits/accueil.ts, MÉTIERS (Après-vente) | issue « Créneau réservé, rappel la veille » | « Réponse prête, en attente de votre accord » |
| lib/produits/accueil.ts, JOURNÉE (21 h 47) | « Rendez-vous posé samedi 9 h 30 » | « Réponse prête, en attente de votre accord » |
| lib/produits/accueil.ts, JOURNÉE (dimanche) | « Créneau réservé, rappel la veille » | « Répondu : ouvert lundi jusqu'à 19 h » |
| lib/produits/accueil.ts, CANAUX.tuiles | WhatsApp Business, Fiche Google Business, Google Agenda, Gmail / Outlook | WhatsApp Business, Courriel, Formulaire de votre site |
| components/produits/accueil/Canaux.tsx | quatre tuiles flottantes en absolu (xl) et deux filets décoratifs | la rangée de tuiles sous le texte, à toutes les largeurs (trois tuiles ne tiennent pas une constellation à quatre places) |
| components/produits/accueil/Icones.tsx | — | icône `formulaire` (même trait) |

Restent (code mort, non servi) : `CAPACITES.titreFin` « son rappel la veille » dans lib/produits/accueil.ts.

## Passe 5 — 06/10, 17 h 10 Z : balayage final du § 3 sur main 23a5bd9

Les 13 points du § 3 sont traités (passes 1 à 4). Balayage de tout le code servi (hors /espace, hors code mort
`lib/fiches.ts` et `lib/services-detail.ts`) pour les phrases des points 1 à 12 : une seule restait, dans
`lib/secteurs.ts` (cartes de /secteurs et de /offres, et bloc « Se combine avec » des pages métiers). Les lignes
Tiroma déjà retirées par B3 (d091f77) ne sont pas touchées.

| Fichier:ligne | Avant | Après | Raison |
|---|---|---|---|
| lib/secteurs.ts:156 (Varelo) | « Varelo branche la même IA sur les logiciels et les tableurs de chaque société, en lecture seule, et range … » | « Chaque société dépose l'export de son logiciel et de ses tableurs ; Varelo le lit sans rien y écrire et range … » | point 9 |
| lib/secteurs.ts:85 (Tamila → REPUT) | « … qualifiées et le premier rendez-vous proposé, à toute heure. » | « … qualifiées, leur réponse prête à toute heure. » | passe 4 : prise de rendez-vous non construite (C3 palier 5) |
| lib/secteurs.ts:114 (Tavaro → REPUT) | « Les demandes de réservation traitées à toute heure, y compris agence fermée. » | « … reçues à toute heure, leur réponse prête même agence fermée. » | point 8 |
| lib/secteurs.ts:136 (Tiroma → REPUT) | « Les demandes de rendez-vous des patients traitées à toute heure, hors des heures du secrétariat. » | « Les demandes des patients reçues à toute heure, transmises au secrétariat pour son retour. » | passe 4 et D6 (pas de réponse automatique sur un contenu de santé) |

Non touchés, signalés : `lib/pub.ts` (page /p/appels-manques, « Chaque appel manqué vous revient par SMS ») — hors
des 13 points de l'audit, à vérifier avec A2 (fournisseur `brevo_sms`) ; la maquette Tavaro « Assistance » (« Je vous
envoie le résumé par SMS ») porte déjà la pastille du module.

## Passe 6 — 06/10, 17 h 25 Z : REPUT et OFFLOAD hors catalogue

Base : worker-c5 (533da96) + origin/main 7399f41 fusionné (59f9396).

### REPUT — lignes non tenues d'après C3, cherchées hors du catalogue

Messagerie instantanée du site, réseaux sociaux, appel non décroché transcrit, contrat et interventions du client,
demande sur deux canaux = un dossier, routage entre services, appel d'astreinte, rendez-vous, tableau à date fixe.
Hors du catalogue (qui porte déjà `atteste: false`), seules deux traces restaient sur des pages servies :

| Fichier | Avant | Après |
|---|---|---|
| app/offres/page.tsx (fiche REPUT de /offres) | « Prise de rendez-vous » | même ligne, pastille « En préparation » (liste `reput` de lib/en-preparation.ts) |
| lib/produits/accueil.ts, MÉTIERS (Industrie) | « Demande qualifiée, transmise au commercial » (routage) | « Demande qualifiée, transférée à l'équipe » |

Le reste avait déjà été traité aux passes 3 et 4 (astreinte, rendez-vous, avis, tuiles de canaux). `components/produits/accueil/Capacites.tsx`
(« le téléphone de l'astreinte sonne ») n'est plus monté. La page /p/appels-manques (VOCAL v0, autre produit)
reste en question ouverte.

### OFFLOAD — 45 lignes (NOTES-C4 f9bf72d : 18 prouvées recette, 1 locale, 4 partielles, 22 non construites)

| Fichier:ligne | Avant | Après | Ligne C4 |
|---|---|---|---|
| lib/produits/reprise.ts:157 | « OFFLOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan. » | « … le compte qui n'a plus commandé. L'entretien redevenu dû et l'affaire restée en plan s'y ajoutent ensuite : leur lecture est en préparation. » | 17–32 non construites |
| lib/produits/reprise.ts:173-174 (maquette) | « Entretien sauté deux fois », « Pièce arrivée, jamais posée » | « Sans commande depuis la révision », « Rythme de commande rompu » | 2, 3 prouvées |
| lib/produits/reprise.ts, cartePalette | « RDV Entretien annuel redevenu dû », « PCE Pièce arrivée, jamais reprise » | inchangées, pastille « En préparation » (liste `offload`) | 17, 25 |
| idem | « 1/T Un message par trimestre au plus » | « 2× Deux messages au plus par compte » | 12 (deux messages en tout) |
| idem | « @ Par courriel, depuis votre adresse » | « @ Par courriel, après votre validation » | 15 partielle (boîte de l'entreprise : A2) |
| idem | « 1× Jamais deux fois le même compte » | « 1× Un seul cycle par compte » | 10 |
| lib/produits/reprise.ts:208 (citation) | « Vos règles de ton, vos interdits et vos tournures sont écrits … et il s'arrête au premier doute. » | « Vos interdits sont posés avant la première vague : comptes en litige, comptes suivis par un commercial, secteurs écartés. Le système n'en sort pas, et un import douteux n'est jamais appliqué. » | 11 partielle, 37 prouvée, 38 partielle |
| lib/produits/reprise.ts:217 | « Vous n'avez aucune case à cocher : une phrase suffit … » | « Vous n'aurez aucune case à cocher … Ces règles écrites en français sont en préparation ; vos exclusions … s'appliquent déjà. » | 11 |
| lib/produits/reprise.ts:241 (message d'exemple) | « … l'entretien annuel qui va avec est à refaire. Je vous garde un créneau ? » | « … cela fait un an. Voulez-vous que nous en reparlions ? » | 9 prouvée ; entretien et rendez-vous non construits |
| lib/produits/reprise.ts:308 (Garage) | « OFFLOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises. » | « OFFLOAD repère les comptes silencieux. Le suivi des entretiens … et des commandes que personne n'a reprises est en préparation. » | 17, 25 |
| lib/produits/reprise.ts:332 (Maintenance) | « OFFLOAD tient la liste de vos installations … puis il écrit au client la semaine d'avant. » | « OFFLOAD repère les clients dont le dernier passage dépasse le délai que vous fixez. La liste de vos installations … est en préparation. » | 19, 22 |
| lib/produits/reprise.ts:377 (FAQ) | trois listes ; « ce message part de votre adresse » ; « tout vous arrive dans votre messagerie » | une liste (comptes sans commande), message validé avant envoi ; les deux autres listes en préparation | 1–4 prouvées ; 15 partielle ; 17–32 |
| lib/produits/reprise.ts:381 (FAQ) | « un message par compte et par trimestre, un seul canal à la fois » | « deux messages au plus par compte, espacés d'au moins trois jours, par courriel seulement » | 12 |
| lib/produits/reprise.ts:393 (FAQ) | « Vous posez les règles en français … et elles s'appliquent à chaque message … jamais de tutoiement. » | « Aucun prix ni aucun délai n'est avancé sans que vous l'ayez écrit, et vos exclusions s'appliquent à chaque vague. Les règles de ton écrites en français … sont en préparation. » | 35 prouvée, 11 partielle |
| lib/produits/reprise.ts:397 (FAQ) | « Un compte ne reçoit jamais deux relances … au premier doute la coupure est automatique … reçoit deux messages. » | « … jamais plus de deux messages … un import douteux n'est jamais appliqué … reçoit un message de trop. » | 10, 12, 38 |
| app/offres/page.tsx (fiche OFFLOAD de /offres) | « Un message par trimestre » | « Deux messages au plus » | 12 |

Laissés : « La base clients est relue chaque matin » et « À 7 h 30, votre liste de relances est prête » (cycle
quotidien, C4) ; les cas BTP et cabinets (silence au-delà du délai : prouvé). Billets de blog (lib/content.ts, garage)
non touchés : éditoriaux, à trancher.

Recette : /offres et /offres/nouvelles-affaires aux 5 largeurs, aucun débordement ; anciennes phrases absentes.
Eslint : une erreur préexistante sur main dans app/offres/page.tsx:635 (« où qu'elles soient », apostrophe non
échappée), hors de mon diff.

## Passe 7 — 06/10, 18 h 25 Z : OFFLOAD c4_07 livré (échéances et renouvellements)

c4_07 (5f2cc7e, `^test_c4_07_` vert sur la recette d'après le coordinateur) rend vraies les lignes 8 et 17 à 24 de
NOTES-C4. Seules les « affaires restées en plan » (25 à 32) restent en préparation.

| Fichier:ligne | Passe 6 | Passe 7 |
|---|---|---|
| lib/produits/reprise.ts:157 | « … le compte qui n'a plus commandé. L'entretien redevenu dû et l'affaire restée en plan s'y ajoutent ensuite : leur lecture est en préparation. » | « … le compte qui n'a plus commandé et l'entretien redevenu dû. L'affaire restée en plan s'y ajoutera ensuite : sa lecture est en préparation. » |
| lib/produits/reprise.ts:173 (maquette) | « Sans commande depuis la révision » | « Entretien sauté deux fois » (texte d'origine) |
| lib/produits/reprise.ts:241 (message) | « … cela fait un an. Voulez-vous que nous en reparlions ? » | « … l'entretien annuel qui va avec est à refaire. Voulez-vous que nous le planifiions ? » (la prise de rendez-vous reste hors d'OFFLOAD) |
| lib/produits/reprise.ts:308 (Garage) | entretiens et commandes non reprises en préparation | « OFFLOAD suit les entretiens qui arrivent à échéance et repère les comptes silencieux. Le suivi des commandes que personne n'a reprises est en préparation. » |
| lib/produits/reprise.ts:332 (Maintenance) | liste des installations en préparation | « OFFLOAD tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû, puis il prépare le message au client la semaine d'avant. Un contrat qui s'éteint faute de reconduction vous est signalé. » |
| lib/produits/reprise.ts:377 (FAQ) | une liste, deux en préparation | deux listes (comptes sans commande, entretiens dus), la troisième (affaires restées en plan) en préparation |
| lib/en-preparation.ts, `offload` | « Entretien annuel redevenu dû », « Pièce arrivée, jamais reprise » | « Pièce arrivée, jamais reprise » seule |

Pour la bascule `atteste: true` au palier de production : lib/produits/capacites/reprise.ts lignes 49 (contrats et
équipements, n° 8 de C4) et 71 à 78 (n° 17 à 24), preuve c4_07 5f2cc7e, tests `test_c4_07_echeances`,
`test_c4_07_contrats_et_parc`, `test_c4_07_import_et_groupe`.

## Passe 8 — 06/10, 19 h 05 Z : OFFLOAD c4_08, métré Lorani, appels manqués sans SMS

| Fichier | Avant | Après | Raison |
|---|---|---|---|
| lib/produits/reprise.ts:157 | « … et l'entretien redevenu dû. L'affaire restée en plan s'y ajoutera ensuite : sa lecture est en préparation. » | « OFFLOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan. » | c4_08 (e4365bfb), lignes C4 25 à 32, vert sur la recette |
| lib/produits/reprise.ts:174 (maquette) | « Rythme de commande rompu » | « Pièce arrivée, jamais reprise » | idem |
| lib/produits/reprise.ts:308 (Garage) | « … Le suivi des commandes que personne n'a reprises est en préparation. » | « OFFLOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises. » | idem |
| lib/produits/reprise.ts:377 (FAQ) | deux listes, la troisième en préparation | trois listes, chaque message validé avant de partir | idem |
| lib/en-preparation.ts, `offload` | « Pièce arrivée, jamais reprise » | liste vide | idem |
| components/secteurs/architectes/Questions.tsx:73 (FAQ « metre ») | « Oui. Il mesure les surfaces et les longueurs sur les plans, puis les compare aux quantités de la DPGF, lot par lot. » | « Oui. Le métré que vous déposez, ou les quantités écrites sur les planches, est comparé aux quantités de la DPGF, lot par lot. » | b5_16 amendé (3c838eb8) : rôle `metre`, nature `metre_dpgf` ; le lecteur ne mesure pas le dessin |
| components/secteurs/architectes/Formules.tsx:411 | « Métré des plans contre la DPGF » + pastille | « Métré déposé contre la DPGF », sans pastille (retiré de la liste `lorani`) | idem |
| components/secteurs/architectes/Fonctionnement.tsx:554 | « Métré des plans contre les quantités » | « Métré déposé contre les quantités » | idem |
| lib/pub.ts + components/pub/PagePub.tsx (/p/appels-manques) | « Chaque appel manqué vous revient par SMS, avec le numéro. » sans réserve | même promesse, pastille « En préparation » sur le surtitre et, sous le chapô : « L'envoi par SMS est en préparation : cette page décrit le service tel qu'il ouvrira. Le diagnostic, lui, est disponible dès aujourd'hui. » (champ `preparation` de l'accroche) | aucun SMS ne part aujourd'hui (recommandation du coordinateur, décision de Teo attendue sur le coût des crédits ; la pastille reste juste quoi qu'il décide). Toute la page repose sur le SMS : une reformulation sans SMS ne tenait pas. Retour : retirer `preparation` quand l'envoi SMS est ouvert |

Pour la bascule au palier de production : lib/produits/capacites/reprise.ts, lignes « Affaires restées en plan »
(n° 25 à 32 de C4), preuve c4_08 e4365bfb.
