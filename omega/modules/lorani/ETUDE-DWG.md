# Lire les DWG des architectes — étude de faisabilité (B5, 06/10/2026)

N° 6 du carnet : « DWG : étudier la conversion (ODA / LibreDWG) et dire si c'est faisable ». Réponse courte : **oui
pour lire les valeurs exactes d'un DWG côté serveur ; non pour l'afficher tel quel avec ce qui existe en JavaScript.**
Ce qui suit vient d'un essai réel dans le conteneur, pas d'une lecture de documentation.

## 1. L'essai

- Fichiers : les trois DWG d'exemple publics du projet LibreDWG (`test/test-data/example_r14.dwg`, `example_2000.dwg`,
  `example_2018.dwg` — formats AC1014, AC1015, AC1032 ; AC1032 est encore le format courant d'AutoCAD 2018 à 2025).
- Outil : LibreDWG compilé en WebAssembly, paquet npm `@mlightcad/libredwg-web` 0.7.15 (licence **GPL-3.0**), sous
  Node 22. Script rejouable : `omega/recette-b5/dwg/lire-dwg.mjs` (la bibliothèque n'est pas installée dans le site).

| | R14 | 2000 | 2018 |
|---|---|---|---|
| Lecture | 208 ms | 224 ms | 175 ms |
| Entités reconnues | 67 | 67 | 67 |
| Types | lignes, polylignes, arcs, splines, textes, MTEXT, blocs (INSERT), attributs, cotes, 3DFACE, VIEWPORT… | idem | idem + tableau, multileader, MLINE |
| Cotes (DIMENSION) | 9, **valeur mesurée à 0** (à recalculer depuis les points) | 9, valeurs exactes (ex. 4 630,52) | 9, valeurs exactes |
| Textes, attributs de bloc | lus (codes MTEXT `\P` à nettoyer ; attribut = objet `{ text }`) | lus | lus |
| Calques, blocs, unités | 5 calques, 16 blocs ; `INSUNITS` absent | `INSUNITS = 4` (mm) | `INSUNITS = 4` (mm) |
| Export SVG fourni | **plante** (tableau ACAD_TABLE) | **plante** (tableau dans un bloc) | produit 3 Mo en 1,5 s, **inexploitable** : emprise faussée par une droite infinie, traits hors d'échelle |

Conclusion de l'essai : la **lecture des données** est fiable et rapide sur les trois générations de format ; le
**rendu** proposé par la bibliothèque ne l'est pas.

## 2. Ce que Lorani en ferait

Le contrôle du dossier (b5_16, b5_21) consomme des valeurs `mesure.<grandeur>.<objet>` avec page et boîte. Un DWG
apporte ce qu'un PDF n'a pas : la **valeur exacte** de chaque cote, sans lecture d'image.

Chemin proposé, en trois marches :

1. **Accepter le DWG au dépôt** (type `application/acad`, `image/vnd.dwg`), le ranger comme une pièce, et demander le
   PDF de la même planche à côté (c'est l'usage : on dépose les deux).
2. **Lire le DWG côté serveur** (une fonction du lecteur d'A1 ou une Edge Function) : cotes (valeur mesurée, texte
   forcé, calque, position), textes et attributs du cartouche (référence « PC2 », indice), polylignes fermées des
   calques de surfaces, blocs comptés (places de stationnement, portes). Sortie : des `pieces_valeurs` au contrat, boîte
   = position de la cote rapportée à l'emprise du dessin ; la `source` est à convenir avec A1 (le socle admet xml,
   regle, ia, tableur, humain : « xml » est la plus proche d'une valeur structurée, exacte).
3. **Recaler la lecture du PDF sur le DWG** : le lecteur d'A1 lit la planche PDF comme aujourd'hui (il sait ce qu'est
   « la hauteur au faîtage ») ; pour chaque mesure lue, on prend la cote du DWG la plus proche et on remplace la
   valeur lue par la valeur exacte. Le DWG ne sait pas ce qu'une cote mesure ; le PDF lu le dit ; l'un corrige l'autre.

Le rendu (afficher un DWG sans PDF, annoter ses pages) viendrait après, avec un rendu écrit par nous (entités →
SVG/PDF, emprise calculée sur l'espace objet en ignorant droites infinies et rayons, épaisseurs à l'échelle) ou par
un convertisseur côté serveur.

## 3. Licences — le point qui décide de l'architecture

- **LibreDWG est sous GPL-3.0.** Mettre le WebAssembly dans le paquet JavaScript du site, c'est distribuer du code GPL
  aux visiteurs : le code qui l'appelle devrait être sous licence compatible. **À exclure pour le navigateur.** Côté
  serveur, sans distribution, la GPL (qui n'est pas l'AGPL) n'impose rien au service : **c'est là qu'il faut le
  faire tourner.**
- **ODA File Converter** (Open Design Alliance) convertit tous les formats DWG ↔ DXF et existe sous Linux ; c'est un
  logiciel propriétaire gratuit dont les conditions d'usage dans un service hébergé sont **à lire avant toute
  décision** (le kit de développement commercial, lui, demande une adhésion payante à l'ODA). Non essayé ici : son
  téléchargement passe par l'acceptation de conditions, ce n'est pas à moi de les accepter.
- `ezdxf` (Python, MIT) lit et rend très bien le **DXF** ; pour le DWG il passe par ODA File Converter. Utile si l'on
  choisit ODA, ou si les agences exportent en DXF.

## 4. Risques et inconnues

- Les fonds de plan BET arrivent souvent en **xréf** (références externes) : un DWG qui pointe vers d'autres DWG ;
  il faudra les lire ensemble.
- Polices SHX, entités proxy (objets d'applications métier, ex. Revit / ArchiCAD exportés), hachures complexes : sans
  effet sur la lecture des cotes, gênants pour le rendu.
- Les cotes d'un fichier R14 n'ont pas de valeur mesurée enregistrée : il faut la recalculer depuis les points de
  définition (aligné, linéaire, angulaire) — simple, mais à écrire.
- Rien n'a été essayé sur un **vrai DWG d'agence** : avant de s'engager, en demander cinq (un plan de masse, une
  façade, une coupe, un plan de niveau, un fond de plan BET) et rejouer `lire-dwg.mjs`.

## 5. Estimation

| Marche | Charge | Dépend de |
|---|---|---|
| Accepter et ranger le DWG au dépôt | ½ jour | — |
| Lecture serveur (cotes, textes, cartouche, polylignes, blocs) → `pieces_valeurs` | 2 à 3 jours | où tourne le lecteur (A1) |
| Recalage des mesures PDF sur les cotes DWG | 1 à 2 jours | contrat de lecture (déjà prêt) |
| Rendu SVG/PDF fiable écrit par nous | 4 à 6 jours | — |

**Recommandation : GO pour les marches 1 à 3 côté serveur, avec LibreDWG**, après l'essai sur cinq DWG réels ; le
rendu attend que les agences en aient besoin (elles déposent déjà le PDF).
