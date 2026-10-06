# Session C5 — la vitrine exactement vraie

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
