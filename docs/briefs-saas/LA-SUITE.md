# Briefs SaaS v2 — décisions à prendre et la suite

Écrit le 08/11/2026 à partir des deux « PROMPT PRODUIT » (avocat, architecte) de Teo et de ce que
le site vend déjà (Tamila sur `/secteurs/avocats`, Lorani sur `/secteurs/architectes`, espaces
`/espace2/tamila` et `/espace2/lorani`).

L'idée : prendre les trois plus gros SaaS américains de chaque métier, les fondre en un seul
produit français, et le faire mieux. L'idée tient. Les deux briefs v1 avaient chacun une
contradiction interne et quelques points calqués sur les États-Unis qui ne collent pas à la
procédure française ; les v2 (`tamila-v2.md`, `lorani-v2.md`) les corrigent et gardent tout le
reste.

## Les corrections, en une ligne chacune

**Tamila (avocats)**
1. Le Module 4 ne produit plus d'actes : il vérifie des dossiers répétitifs contre les modèles du
   cabinet. La v1 promettait de rédiger et de ne pas rédiger.
2. La cible primaire est le cabinet de contentieux de 3 à 30 avocats ; le contentieux de masse
   devient un plan de volume.
3. Les conflits d'intérêts sortent du MVP : les détecter oblige à lire toute la base clients, ce
   que Tamila promet de ne pas faire.
4. « Jurisprudence renversée » devient une vérification en trois niveaux (existe, en vigueur, dit
   ce qu'on lui fait dire) plus un signal prudent. Légifrance et Judilibre sont gratuits : le coût
   n'est pas la donnée.
5. Les trois SaaS US repris sont ceux du contentieux : Clearbrief, CoCounsel, Harvey. Luminance et
   Spellbook (contrats) sortent.
6. La « recommandation CNB de mars 2026 » est à sourcer avant d'être citée.

**Lorani (architectes)**
1. Le Module 2 n'est plus un fil de « commentaires de permis » (procédure américaine) mais le
   calendrier français du permis : complétude, demande de pièces unique, délais, décision,
   affichage, recours.
2. Le MVP devient le croisement planches ↔ CCTP ↔ DPGF (déjà vendu) plus le visa de chantier, qui
   réutilise le même moteur. La v1 mettait le cœur du produit hors MVP.
3. La plateforme de dépôt nommée dans la v1 est remplacée par « GNAU de la commune, Plat'AU », à
   vérifier.
4. DWG sort du MVP ; PDF natif seul.
5. Le PLU se limite aux articles chiffrés sur six villes ; le qualitatif est annoncé hors périmètre.
6. Les trois SaaS US repris : Part3, PermitFlow + GreenLite, UpCodes + CodeComply.

**Commun aux deux**
- Une définition du « point valide » et une règle de remboursement, identiques pour les deux
  produits, à écrire dans les CGV (`docs/CGV-brouillon.md` ne les prévoit pas).
- La section « ce que le prompt doit produire » est séquencée : PRD du MVP d'abord, le reste après
  les premiers dossiers pilotes.

## Ce que Teo doit trancher avant de lancer les PRD

| # | Décision | Ce que je recommande |
|---|---|---|
| 1 | Tamila rédige-t-elle, oui ou non, même pour les dossiers répétitifs ? | Non. Moins de responsabilité, et c'est ce qui la distingue d'AVOCAT+. |
| 2 | Conflits d'intérêts : hors MVP, puis module opt-in sur une liste fournie par le cabinet ? | Oui. |
| 3 | Cible primaire = contentieux 3 à 30, contentieux de masse = plan de volume ? | Oui. |
| 4 | Lorani MVP = DCE + visa, permis ensuite ? | Oui. |
| 5 | Module permis = délais et recours, pas de fil de commentaires ? | Oui, après vérification du guichet réel. |
| 6 | DWG hors MVP ? | Oui. |
| 7 | N (nombre minimal de points valides) et le seuil de remboursement | N = 3 et 80 % de points confirmés, à ajuster après les pilotes. |
| 8 | Les noms Tamila et Lorani restent ? | Oui. Ils sont en ligne, la v1 architecte demandait un nom distinct d'Omega : c'est déjà fait. |

## La suite, dans l'ordre

1. **Trancher les huit décisions** ci-dessus. Si une réponse diffère de la recommandation, je
   reprends le brief concerné dans la journée.
2. **Lancer les deux PRD du MVP seul**, à partir de la section 15 de chaque brief v2, point 1
   uniquement. Un PRD par produit, pas un document commun. Chaque PRD part des écrans de
   `/espace2` déjà construits plutôt que de wireframes neufs.
3. **Banc d'essai avant toute promesse chiffrée** : trois dossiers réels clos par produit (un
   dossier plaidé pour Tamila, un DCE attribué et un lot de fiches techniques visées pour Lorani),
   anonymisés, passés dans le moteur actuel. On compte les points confirmés. C'est ce chiffre, pas
   90 %, qui s'écrit ensuite sur le site et dans les CGV.
4. **Architecture du MVP** (section 15, point 2), une fois le PRD figé : connecteurs Légifrance
   (PISTE) et Judilibre pour Tamila, Géoportail de l'urbanisme pour Lorani plus tard, journal
   scellé commun aux deux.
5. **Plan pilotes** (section 15, point 3) : 10 cabinets de contentieux, 10 agences de 3 à 30 ;
   message, questions d'entretien, protocole de mesure des points confirmés.
6. **Site** : les pages `/secteurs/avocats` et `/secteurs/architectes` ne bougent pas tant que le
   PRD du MVP n'est pas figé et que le banc d'essai n'a pas donné son chiffre. Ensuite seulement,
   mise à jour des formules et des promesses, avec la recette aux cinq largeurs et la mise en
   ligne habituelle.
7. **CGV** : ajouter la définition du point valide et la clause de remboursement au brouillon,
   à faire relire avec le reste.

## Ce qui n'est pas réglé par les v2

- La « recommandation CNB de mars 2026 » : à lire. Si elle n'existe pas sous cette forme, le
  Module 2 de Tamila s'appuie sur le RIN seul.
- Le guichet de dépôt réel des communes visées : à vérifier commune par commune pour les six villes.
- Le texte intégral des DTU et Avis Techniques est payant : Lorani vérifie les références, pas le
  contenu, tant qu'un accord d'accès n'existe pas.
- Le prix de l'abonnement par taille reste à fixer après les pilotes, dans les deux briefs.
