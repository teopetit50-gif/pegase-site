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


## 11/11/2026 — les trois autres logiciels ont leur brief v2

Teo (11/11) : « pour tous les autres SaaS, sauf BTP, va chercher les trois ou quatre plus gros
SaaS américains du domaine, regarde ce qu'ils font, et crée-moi un seul produit à vendre ».
Lorani et Tamila vendent déjà le produit v2 en ligne (commit a1be36b du 08/11 : « le dossier
vérifié de bout en bout »). Les trois suivants sont écrits sur le même modèle, à partir de ce que
chaque page vend aujourd'hui :

| Brief | Les briques US | Le fil « de A à Z » |
|---|---|---|
| `tiroma-v2.md` | Dental Intelligence (huddle, suivis), Weave (liste d'attente, textos), NexHealth (prise de rendez-vous, rappel) | de la demande de rendez-vous au dernier soin et au dernier règlement |
| `tavaro-v2.md` | UVeye / ProovStation (inspection photo), RentWorks / TSD (dossier de location et réclamation), Samsara / Geotab (télématique) | du départ au retour et jusqu'à la sortie de flotte |
| `varelo-v2.md` | Glean (sources et droits), Palantir Foundry (référentiel, actions), OneStream / Workiva (consolidation) | de la source branchée à la décision et à la page présidence |

Daliro (BTP) ne bouge pas, à la demande de Teo. Ostelo (hôtellerie, nom de travail, page
`/secteurs/hotellerie`) n'a pas de logiciel en ligne ; son brief `ostelo-v2.md` est écrit en plus,
sur le même modèle (Canary, SiteMinder, Duetto → le séjour suivi de la demande au dernier euro
encaissé), pour le jour où le produit se construit. Sa page n'a pas été touchée.

Les pages `/secteurs/dentaire`, `/secteurs/location-automobile` et `/secteurs/groupes` vendent le
produit v2 depuis le 11/11 (commit « Tiroma, Tavaro, Varelo : les pages vendent le produit v2, de
A à Z »), sans changer de dessin.

Décisions à trancher, en plus des huit ci-dessus : (9) Tiroma lit-il Doctolib, ou seulement la
liste d'attente du cabinet ? (10) Tavaro impose-t-il l'état des lieux de départ dans l'outil,
même aux agences qui ont déjà une application de photos ? (11) Varelo rapproche-t-il la page
présidence des comptes de société dès le MVP ? Recommandations dans chaque brief (section 11).

## 11/11/2026 — Varelo face au marché américain

Teo (11/11) : « fais la même recherche que pour les avocats et les architectes, mais pour notre
SaaS groupe, et dis-nous si ce qu'on propose est obsolète ». La recherche est dans
`varelo-marche-us.md`. En une ligne : le fil de Varelo (source → référentiel → règle → décision
→ page présidence) n'est vendu par personne aux US à un groupe de 3 à 30 sociétés, et le
référentiel validé par une personne est devenu la norme 2026 sous le nom d'ontologie ; ce qui
est dépassé, c'est le titre « Une seule IA pour tout le groupe » (promesse standard de Glean,
Copilot, ChatGPT Enterprise, Gemini et Mistral à 20 à 75 $ le siège), le branchement par export,
et le « jamais d'action ». Décisions 12 à 16 en section 9 de ce document.

## 11/11/2026 (soir) — Varelo v3 : le plan du groupe et ses agents

Teo : « je ne veux pas que tu te bases sur ce qu'on propose ; dis-moi ce qu'eux font aux US et
qu'on reproduise la même chose ; explique-le plus facilement ; refais la page complètement ».
`varelo-v3.md` remplace `varelo-v2.md` : on reproduit le modèle de Palantir Foundry à l'échelle
d'une ETI (le plan du groupe, les sources en lecture seule, les actions, les agents qui
proposent, les trois jours chez le client, le prix par cas d'usage). La page `/secteurs/groupes`
vend ce produit depuis le commit « Varelo v3 », même dessin, tous les textes neufs ; la fiche de
`lib/secteurs.ts` et les deux cartes de l'accueil disent la même chose.

## 11/11/2026 (soir) — toutes les pages vendent le produit complet

Teo : « vérifie sur les autres sites, Daliro, les architectes, les avocats, etc., qu'on a bien
le produit de ouf qu'on vend ; le premier titre de Daliro, ce n'est pas vraiment l'outil qu'on
vend, regarde ce qu'on a fait avec Corail BTP ». Relevé page par page :

| Page | Avant | Après |
|---|---|---|
| Tamila `/secteurs/avocats` | « Le dossier entier, vérifié de la première pièce à l'audience » | inchangé, vend la v2 |
| Lorani `/secteurs/architectes` | « Chaque pièce de l'opération, vérifiée du permis à la réception » | inchangé, vend la v2 |
| Tiroma `/secteurs/dentaire` | titre tournant « de la demande de rendez-vous au dernier soin » | inchangé, vend la v2 |
| Varelo `/secteurs/groupes` | « Le plan du groupe, et ses agents. » | inchangé, vend la v3 |
| Tavaro `/secteurs/location-automobile` | titre « Un dommage non relevé au retour se facture rarement. », chapô v2 | titre « Chaque véhicule suivi du départ au retour, jusqu'à la sortie de flotte. » |
| Daliro `/secteurs/btp` | « Les travaux hors devis se perdent entre le chantier et la facture », aucun brief | **brief `daliro-v2.md`** (Procore, Buildertrend, ServiceTitan / Jobber), héros « Chaque chantier suivi du premier appel au décompte final », deux groupes de formules en plus (appels, mails et devis ; situation, réception et argent), les sections réécrites |
| Ostelo `/secteurs/hotellerie` | « L'argent qui se perd entre vos logiciels, Ostelo le récupère », brief v2 écrit mais page intacte | héros « Chaque séjour suivi de la demande au dernier euro encaissé », question « Qu'est-ce qu'Ostelo », appel final |

Les fiches de `lib/secteurs.ts` et les cartes de l'accueil disent la même chose. Décision 17 à
trancher : Daliro ne bouge plus (consigne du matin) ou suit son brief v2 (ce commit).
