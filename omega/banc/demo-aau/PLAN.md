# Démo Lorani pour un architecte de Guadeloupe — plan (B5, 18/10/2026)

Demande de la session bureau (18/10, 17 h 13 Z, par le coordinateur) : Teo rencontre la semaine prochaine un architecte de
Guadeloupe. On ne cherche rien sur lui et on ne le contacte pas. Il faut un client de démo sur la recette, un chemin de
démo en six écrans au plus, avec une capture par écran, le temps réel de lecture, et la liste honnête de ce qui ne marche
pas encore. Rien sur omegaai.fr public, pas de prix, aucun nom d'éditeur d'IA à l'écran.

## 1. Le DCE public de Guadeloupe : pas trouvé en téléchargement libre

Recherche du 18/10, 17 h 20 Z, comme demandé, sans contourner quoi que ce soit :
- **Services de l'État en Guadeloupe** (guadeloupe.gouv.fr, rubrique « Marchés publics ») : la page annonce un
  téléchargement direct des pièces (avis, RC, CCTP, DPGF). La meilleure piste est le « Marché de travaux de confortement
  parasismique et réhabilitation des deux bâtiments » (mis à jour le 21/03/2022). Mais le site refuse cet environnement
  (réponse vide, puis 503) : **à télécharger par Teo**, depuis un navigateur.
- **Communes, Région, Département, Cap Excellence, bailleurs** : leurs DCE sont sur des plateformes avec compte ou
  acceptation des conditions (Marchés Sécurisés, profils d'acheteur). Le Département demande de s'identifier. A1 était
  arrivé au même constat. **Je ne contourne pas.**
- Ce qu'il faut à Teo, dans un dossier par consultation : **le CCTP, la DPGF et les plans du même lot** (sans les plans,
  le croisement planches/CCTP/DPGF ne tourne pas). Formats PDF ; une DPGF en .xlsx ne se lit pas encore (à imprimer en PDF).
  Ensuite : `node omega/banc/dce_lorani.mjs <dossier>` (manifeste et sha256 comme pour les DCE d'A1).

## 2. Le client de démo (SQL du coordinateur : `omega/banc/demo_aau.sql`)

- `clients` : « Atelier d'Architecture et d'Urbanisme (démo) », `secteur = 'archi'` (la barre de /espace2 montre alors
  Lorani comme module du métier), commune Baie-Mahault.
- `entites` : l'entité principale, `fuseau = 'America/Guadeloupe'`, `territoire = 'GP'` (code ISO ; les délais du permis
  suivent le territoire : le moteur du calendrier connaît la Guadeloupe).
- `comptes` : un gérant de démo. Le compte de connexion (auth) se crée d'abord par l'administration de la recette (adresse
  `demo-aau@banc-varelo.test`) ; le SQL le rattache.
- `reglages_envois` : Lorani en mode essai (tout part à l'adresse d'essai de Teo, rien vers un tiers).
- Rien n'est supprimé ; le SQL est rejouable.

## 3. Les dossiers du client

- **(a) Le DCE réel** (après le téléchargement de Teo) : un projet, ses pièces déposées comme le ferait l'agence, le
  contrôle « DCE réel » qui passe seul à la dernière lecture ; la liste des incohérences avec la page, l'article et la
  correction proposée (rapport PDF annoté et Excel).
- **(b) Un PCMI à Baie-Mahault** : un projet de maison individuelle à une adresse publique de la commune, son permis
  PCMI, un courrier de mairie déposé et lu (récépissé, puis demande de pièces), les échéances calculées et les pièces
  manquantes (bordereau PCMI, #23).
  **Le courrier ne peut pas être un vrai courrier de la mairie de Baie-Mahault** : un vrai courrier appartient à un
  pétitionnaire. Il sera fabriqué (`fabriquer-courrier.mjs`) et portera en pied « Document d'essai, fabriqué pour la
  démonstration », sans logo ni signature de la mairie. Si Teo a un vrai courrier anonymisé, il le remplace.
- **(c) « Il dépose son propre permis pendant la réunion »** : l'architecte choisit ses PDF (planches PCMI), ils sont
  déposés sur un projet neuf, lus, puis le contrôle passe. Objectif : moins de 10 minutes. **À chronométrer au retour du
  crédit IA**, sur un jeu de planches public ou fabriqué de même taille. Repère de coût : environ 0,04 € la page, soit
  environ 0,60 € pour un PCMI de 15 pages.

## 4. Le chemin de démo, six écrans

| # | Écran | Ce qu'on montre | Ce qu'il faut (IA ?) |
|---|---|---|---|
| 1 | /espace2 → Lorani, liste des projets | Les dossiers de l'agence : le DCE, le PCMI, et le projet de la réunion | Le client de démo (non) |
| 2 | Le projet PCMI, PLU, servitudes et risques | Zone du PLU de Baie-Mahault, servitudes, sismicité 5, risques de la commune, lus depuis l'adresse | Le relevé réel par l'adresse (non, à faire maintenant) |
| 3 | Le permis : calendrier et pièces | Le courrier lu, sa date proposée et confirmée, le délai jusqu'à la purge, les pièces manquantes du bordereau PCMI | Lecture du courrier (oui) |
| 4 | Le contrôle du DCE | Les constats planches/CCTP/DPGF avec la page, l'extrait lu, l'article, la correction proposée | Lecture du DCE (oui) |
| 5 | Le rapport | Le PDF annoté (cadre sur la valeur citée) et l'Excel, téléchargés | Le contrôle (4) |
| 6 | Le dépôt pendant la réunion | Ses PDF déposés, la lecture qui avance, puis ses constats, chronométrés | Lecture (oui) |

### Écran 2, prouvé en vrai le 18/10 à 17 h 35 Z, sans IA

Sur le banc, projet BANC-GPE-BAIE-MAHAULT (« Rue Jean Jaurès, 97122 Baie-Mahault », INSEE 97103), par les portes de
l'écran (`lorani_chercher_plu` puis `lorani_suivre_plu`, au nom du gérant du banc) : **réponse complète en 4 s**.
- Territoire déduit : `guadeloupe`. Adresse géocodée : « Rue jean jaurès 97122 Baie-Mahault », score 0,969.
- PLU de Baie-Mahault (`97103_PLU_20170523`), **zone UCa**.
- Servitudes : deux AC1, abords de monument historique (église Saint-Jean-Baptiste, monument aux morts). Le terrain est
  donc en **secteur protégé** : avis de l'architecte des Bâtiments de France, délai majoré.
- Risques : **sismicité 5, forte** ; risques de la commune : inondation (par submersion marine), mouvement de terrain,
  séisme, cyclone ou ouragan, risque industriel, transport de matières dangereuses ; radon 1. Argiles : non renseignées
  pour la commune.

## 5. Ce qui ne marche pas encore (à dire à Teo)

- **Aucune planche réelle n'a encore été lue** de bout en bout. Le crédit IA de la recette est épuisé depuis le 18/10,
  17 h Z ; une DPGF réelle (Luzarches) est lue, son CCTP est bloqué.
- Les plans **scannés** ne sont pas prouvés (boîte estimée).
- La **mesure sur le dessin** n'existe pas : Lorani lit les cotes écrites.
- Les pièces PC1, PC6, PC7 et PC8 (situation, insertion, photos) ne sont pas contrôlées sur le fond.
- La sécurité incendie de l'**habitation** n'est pas couverte (l'ERP l'est).
- Les règles **propres à la Guadeloupe** (règles paracycloniques, PPRN de la commune lu en entier, règlement du PLU de
  Baie-Mahault lu article par article) ne sont pas contrôlées. Le PLU et les servitudes sont trouvés par l'adresse, mais
  le règlement n'est lu que s'il est déposé.
- Une DPGF en **.xlsx** n'est pas lue (PDF seulement).

## 6. Ordre de préparation

1. Sans IA, maintenant : PLU, servitudes et risques par l'adresse à Baie-Mahault (relevé réel), puis le SQL du client de
   démo, le PCMI (projet, permis, bordereau) et le courrier d'essai fabriqué.
2. Après le téléchargement de Teo : le DCE déposé (sans le lire tant que le crédit manque).
3. Au retour du crédit : lecture du courrier et du DCE, chronométrage du dépôt (c), captures des six écrans, temps réels.
