# Tamila v2 — le dossier contentieux vérifié de l'avocat français

Brief produit, version 2 du 08/11/2026. Remplace le « PROMPT PRODUIT — Le vérificateur de
dossier juridique français » (v1). Les passages marqués ◆ sont ceux que la v2 change ; la
raison de chaque changement est donnée en section 0, puis reprise dans `LA-SUITE.md`.

L'idée de départ est conservée : reprendre les briques des trois plus gros SaaS américains du
contentieux et les refondre en un seul produit français, meilleur parce qu'il connaît la
procédure civile, la déontologie et les référentiels français, et parce qu'il prouve chaque
point. Le produit existe déjà sous le nom Tamila (page `/secteurs/avocats`, espace
`/espace2/tamila`) : la v2 l'étend, elle ne repart pas de zéro.

## 0. Ce que la v2 change par rapport à la v1 ◆

| v1 | v2 | Pourquoi |
|---|---|---|
| Module 4 « production et vérification » d'assignations, de conclusions types, de calculs | Module 4 = vérification de conformité au modèle du cabinet, aucune production d'acte | La v1 se contredisait avec son non-objectif « ne pas rédiger de conclusions ni d'actes ». On tranche : Tamila ne rédige pas. C'est moins de responsabilité, et AVOCAT+ rédige déjà. |
| Cible primaire « contentieux de masse et droit des affaires, 3 à 30 avocats » | Cible primaire = cabinets de contentieux de 3 à 30 avocats, toutes matières civiles et commerciales. Le contentieux de masse devient un plan de volume, pas une cible | Le contentieux de masse est tenu par quelques gros acteurs très sensibles au prix ; ce n'est pas le cabinet de 3 à 30. Deux acheteurs différents ne font pas une cible. |
| Module 2 inclut la détection des conflits d'intérêts | Conflits d'intérêts retirés du MVP, module optionnel ultérieur en opt-in explicite | Détecter un conflit suppose de lire toute la base clients. Tamila promet aujourd'hui de ne lire que les dossiers ouverts un par un (art. 66-5). On ne casse pas cette promesse sans le dire. |
| « Jurisprudence renversée » détectée | Trois niveaux de vérification d'une référence : elle existe, elle est en vigueur à la date, elle dit bien ce qu'on lui fait dire. Un revirement n'est jamais affirmé, seulement signalé comme « décision postérieure sur le même fondement, à lire » | Aucune base ne code les revirements. Promettre leur détection, c'est promettre un faux négatif. |
| Inspirations : Harvey, Legora, Luminance, Spellbook | Briques reprises : Clearbrief, CoCounsel (Thomson Reuters), Harvey (Vault et workflows). Luminance et Spellbook écartés | Luminance et Spellbook sont des outils de contrats transactionnels. Le contentieux a ses propres leaders US, et Clearbrief fait exactement ce que fait Tamila. |
| « Recommandation CNB de mars 2026 » comme pivot du module déontologie | À sourcer. En attendant, le module s'appuie sur ce qui est certain : RIN art. 1.3 (compétence, prudence, diligence) et art. 2 (secret), loi de 1971 art. 66-5, Code civil art. 2225 | On ne bâtit pas un module sur une référence qu'on n'a pas lue. |
| Section 14 : cinq livrables d'un coup (PRD complet, architecture, wireframes, lancement, pilotes) | Section 15 : livrables séquencés, PRD du seul MVP d'abord | Cinq livrables générés d'un coup donnent cinq documents moyens. |

## 1. Vision en une phrase

Un SaaS français qui lit l'intégralité d'un dossier contentieux (conclusions des deux parties,
pièces et bordereaux, textes et décisions cités, contrats, rapports d'expertise), rattache chaque
fait et chaque référence à sa pièce et à sa page, signale les incohérences prouvées, et tient une
piste d'audit horodatée que le cabinet peut exporter en cas de contrôle, de litige ou de sinistre.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Tamila | Ce que Tamila fait de mieux |
|---|---|---|---|
| **Clearbrief** | Le « cite-check » d'un mémoire contre le dossier : chaque fait affirmé renvoie à la pièce et à la page, les affirmations non soutenues sont signalées, la chronologie se construit à partir des pièces | Module 1 (déjà en ligne : dossier de faits sourcé, contradictions entre pièces, bordereau art. 768, dispositif contre motifs art. 954) | La procédure civile française : bordereau obligatoire, concentration des moyens, prétentions nouvelles en appel, pièces citées jamais communiquées. Et la vérification des textes et décisions cités, que Clearbrief ne fait pas sur le droit français. |
| **CoCounsel** (Thomson Reuters, ex-Casetext) | Revue de documents par questions, chronologie, préparation d'audition, contrôle de conformité d'un document à une politique | Module 3 (pièces adverses et expertises), Module 4 (conformité au modèle du cabinet) | Le vocabulaire des conclusions françaises, le cadre des expertises judiciaires (mission du juge, dires, pré-rapport), les modèles du cabinet comme référentiel de conformité. |
| **Harvey** | Vault : lecture de centaines de pièces, extraction en tableaux, workflows par type de dossier | Moteur transversal (section 8), Module 5 (clôture) | Hébergement France, chiffrement sur le poste avant transfert, aucun entraînement sur les pièces, journal des accès : le secret professionnel comme architecture, pas comme clause. |

Écartés comme modèles produit : Luminance et Spellbook (contrats transactionnels), Legora
(généraliste ; retenu seulement comme référence d'ergonomie pour les tableaux multi-documents).

Ce qui rend l'ensemble meilleur que la somme des trois : la preuve par point avec remboursement
(section 8), la piste d'audit déontologique (Module 2) qu'aucun des trois ne tient, et le
référentiel français ouvert (Légifrance, Judilibre) que les trois ignorent.

## 3. Problème adressé

L'avocat manipule par dossier des dizaines de pièces hétérogènes : conclusions, pièces des deux
parties, décisions et textes cités, contrats, expertises. Les incohérences se découvrent au pire
moment, à l'audience ou en appel : une conclusion qui cite un texte abrogé ou une décision qui ne
dit pas ce qu'on lui fait dire, une pièce qui en contredit une autre, une pièce invoquée jamais
communiquée, une prétention qui ne respecte pas une clause du contrat. Elles coûtent du temps, de
l'argent, et engagent la responsabilité civile de l'avocat (prescription de cinq ans à compter de
la fin de la mission, Code civil art. 2225).

Les outils en place ne le font pas : Themisia, Clio, Secib et Septeo gèrent le cabinet ;
Doctrine, Lexbase, Lexis+ AI et Predictice cherchent ; AVOCAT+ (CNB) assiste la rédaction et la
recherche ; Harvey, Legora, Luminance et Spellbook sont conçus pour la common law. Personne ne
vérifie la cohérence entre toutes les pièces d'un dossier français en tenant une piste d'audit.

## 4. Cible utilisateur ◆

- **Primaire** : cabinets de contentieux de 3 à 30 avocats, matières civiles et commerciales
  (baux, construction, responsabilité, commercial, social, famille patrimoniale). Ils ont des
  dossiers à pièces nombreuses et une partie de dossiers répétitifs.
- **Secondaire** : avocats seuls et cabinets de 1 à 3, par le plan Découverte à prix fixe.
- **Tertiaire (plus tard)** : cabinets de 30 à 100 avocats, directions juridiques, et les cabinets
  de contentieux de masse par le plan de volume (section 10).

Personas : l'associé (décide, sensible au risque et à la marge), le collaborateur (utilise chaque
jour, submergé de pièces), le responsable conformité interne (garant), le juriste d'entreprise
(bénéficiaire de la traçabilité).

## 5. Positionnement

« La couche de vérification et de traçabilité qui manque aux logiciels de cabinet et aux
assistants IA. » Tamila s'ajoute à Themisia, Clio, Secib (lecture des pièces du dossier, export
des vérifications) ou vit seule. Elle n'est ni un outil de rédaction, ni un moteur de recherche,
ni un logiciel de gestion, ni un générateur d'actes.

## 6. Principes produit

1. **L'avocat décide, Tamila propose.** Aucun document n'est modifié, rien n'est signé, rien n'est
   rédigé ◆. Chaque point relevé vient avec la pièce, la page, la référence et la correction proposée.
2. **Preuve par point.** Aucun point sans citation exacte de la source. Un point non prouvé n'est
   pas affiché.
3. **Référentiel et déontologie français d'abord.** Code civil, Code de procédure civile,
   Judilibre, Légifrance, RIN. C'est le fossé défensif.
4. **Traçabilité opposable.** Chaque vérification, chaque décision de l'avocat sur un point, chaque
   référence est horodatée et rattachée à sa pièce.
5. **Invisible par défaut.** L'utilisateur voit les incohérences, pas la mécanique. On vend du
   temps gagné et du risque évité, pas de l'IA.
6. **Secret professionnel comme architecture.** Dossiers ouverts un par un, chiffrement sur le
   poste, conservation en France, aucun entraînement, effacement à la clôture (promesse déjà en
   ligne sur `/secteurs/avocats`, à ne jamais affaiblir).
7. **Prix d'entrée accessible.** Un premier dossier vérifié à prix fixe.

## 7. Les cinq modules

### Module 1 — Cohérence des conclusions et des pièces, références vérifiées
Déjà en ligne pour l'essentiel. L'avocat ouvre un dossier : conclusions des deux parties, pièces,
bordereaux, contrats. Tamila construit le dossier de faits (chaque fait daté, résumé, renvoyé à sa
pièce et sa page), rapproche chaque prétention des pièces invoquées et de leur numérotation,
contrôle le bordereau (art. 768), confronte le dispositif aux motifs (art. 954), relève les
prétentions nouvelles en appel, signale les pièces citées jamais communiquées (sommation prête), et
présente côte à côte deux pièces qui divergent.

◆ Ajout v2, vérification des références en trois niveaux, chacun affiché distinctement :
1. **Existe** : l'article et le numéro de pourvoi existent (Légifrance, Judilibre).
2. **En vigueur à la date** : la version du texte citée est celle applicable à la date des faits ou
   de l'acte ; sinon, la version applicable est proposée avec le lien.
3. **Dit ce qu'on lui fait dire** : le passage cité ou résumé dans les conclusions est confronté au
   texte réel de l'article ou de l'arrêt ; l'écart est montré côte à côte.
Un quatrième signal, prudent : « décision postérieure de la Cour de cassation sur le même fondement,
à lire », jamais formulé comme un revirement.

Sortie : rapport de cohérence (points prouvés) + tableau des références à corriger.

### Module 2 — Déontologie et piste d'audit ◆
Tamila tient un journal horodaté de tout ce qui s'est passé sur le dossier : quelle pièce a été lue
et quand, quel point a été relevé, ce que l'avocat en a fait (retenu, écarté, corrigé, avec son
commentaire), qui a consulté quoi. Le journal s'exporte en PDF scellé (empreinte) pour un contrôle
de l'Ordre, un litige avec le client ou un sinistre RC.

Contrôles tenus : références citées vérifiées (devoir de compétence, prudence et diligence, RIN
art. 1.3 ; recommandation CNB à sourcer et à citer si elle existe), confidentialité (cloisonnement
par dossier, marquage des pièces couvertes par le secret, journal des accès, loi de 1971 art. 66-5,
RIN art. 2), RGPD (registre des pièces à données personnelles, durée de conservation, effacement à
la clôture, art. 28 pour le contrat de sous-traitance).

Hors module : la détection des conflits d'intérêts. Elle viendra, si on la veut, comme module
optionnel sur une liste de noms que le cabinet choisit de fournir, en opt-in explicite, hors MVP.

Sortie : rapport de conformité du dossier + piste d'audit exportable. Dans l'espace actuel, c'est
la sous-page « Conformité du cabinet » qui porte ce module.

### Module 3 — Pièces adverses et expertises
À réception des conclusions et pièces adverses, Tamila rapproche chaque argument adverse des pièces
du dossier, fait ressortir les contradictions internes de l'adversaire, les pièces qu'il invoque
sans les produire, et les points qui ouvrent une réponse. Pour une expertise judiciaire : le
rapport est confronté à la mission fixée par le juge (chefs de mission non traités), aux dires des
parties (dires sans réponse), et aux pièces du dossier ; les dires à l'expert sont préparés sur le
pré-rapport (déjà en ligne).

Sortie : rapport d'analyse contradictoire + tableau des points de réponse.

### Module 4 — Dossiers répétitifs : conformité au modèle du cabinet ◆
Pour les contentieux à pièces récurrentes (recouvrement, baux, prud'hommes, consommation), le
cabinet dépose ses propres modèles (trame d'assignation, liste des pièces obligatoires, méthode de
calcul). Tamila vérifie chaque dossier contre le modèle : pièces obligatoires présentes et
communiquées, montants cohérents entre le décompte, le contrat et les mises en demeure, délais et
prescription, références à jour (Module 1 appliqué au modèle). Il traite les dossiers par lot et
rend un tableau de lot. **Il ne produit aucun acte** ; le cabinet garde sa rédaction et ses outils.

Sortie : rapport par dossier + tableau de lot (dossiers prêts, dossiers à compléter, points bloquants).

### Module 5 — Clôture et archivage
À la clôture, Tamila compile les pièces vérifiées, rattache les décisions et les vérifications,
produit la piste d'audit complète, vérifie la restitution des pièces au client et la durée de
conservation retenue par le cabinet (au moins la prescription de l'art. 2225), puis efface ce que le
contrat prévoit d'effacer. Le cabinet garde l'export.

Sortie : dossier de clôture horodaté, exportable.

## 8. Moteur transversal : lecture, croisement, référentiels ◆

- **Lecture** : PDF natifs d'abord (conclusions exportées, pièces numériques), PDF scannés avec OCR
  et un score de confiance affiché par page ; Word ; Excel (décomptes, barèmes) ; images.
- **Extraction** : montants, dates, personnes, numéros de pièces, références (articles, pourvois,
  juridictions, dates de décision), clauses.
- **Croisement** : conclusions ↔ pièces, conclusions ↔ conclusions adverses, bordereau ↔ pièces
  produites, référence citée ↔ texte réel, texte ↔ version en vigueur, contrat ↔ prétentions,
  mission ↔ rapport d'expertise, modèle du cabinet ↔ dossier.
- **Référentiels, tous ouverts** : Légifrance par l'API PISTE (textes et leurs versions datées),
  Judilibre (décisions de la Cour de cassation et, progressivement, des cours d'appel), barèmes
  publics. Le coût n'est pas la donnée, c'est la lecture fine des arrêts : d'où le signal prudent
  du Module 1 et non une détection de revirement.
- **Précision, définition commune aux deux produits** : un point est « valide » quand l'avocat, en
  le relisant, confirme que la valeur lue est bien dans la pièce à la page indiquée et que l'écart
  signalé existe. Objectif : au moins 90 % de points confirmés, mesuré sur les points relus,
  publié chaque trimestre. Remboursement d'une vérification à l'unité si moins de N points valides
  (N à fixer, 3 par défaut) ou si moins de 80 % des points sont confirmés. À écrire dans les CGV
  (`docs/CGV-brouillon.md` ne le prévoit pas encore).
- **Hébergement** : France ; chiffrement sur le poste avant transfert, en transit et au repos ;
  cloisonnement par dossier ; journal des accès ; aucun entraînement ; effacement à la clôture.

## 9. Intégrations

1. MVP : import de fichiers (PDF, Word, Excel, images), export PDF et Excel des rapports, export
   PDF scellé de la piste d'audit.
2. Ensuite : Themisia, Clio, Secib, Septeo en lecture seule (pièces du dossier) et export des
   vérifications ; lecture des avis RPVA (délais, déjà en ligne).
3. Plus tard : Doctrine, Lexbase, Lexis+ AI (récupérer la décision citée), Legal Data Space (CNB).

## 10. Modèle économique ◆

- **Découverte** : un dossier déjà plaidé, vérifié, à prix fixe (200 à 400 €), sans abonnement.
  C'est la porte d'entrée déjà annoncée sur le site (« jugez le dossier de faits sur pièces »).
- **Cabinet** : abonnement mensuel par taille (1 à 3, 4 à 10, 11 à 30 avocats), avec un quota de
  vérifications (cohérence, déontologie, pièces adverses).
- **Dossiers répétitifs** (ex-« contentieux de masse ») : forfait par volume (50, 200, 500 dossiers
  par mois) pour le Module 4.
- **Vérifications à l'unité** : prix par vérification lourde (pièces adverses, expertise, croisement
  complet), remboursée si moins de N points valides.

## 11. MVP ◆

Périmètre : **Module 1 approfondi (références en trois niveaux) + Module 2 (piste d'audit, sans
conflits d'intérêts)**. Le Module 4 suit immédiatement : une fois le Module 1 en place, un modèle
de cabinet n'est qu'une liste de contrôles de plus.

Pourquoi ce périmètre et pas celui de la v1 : le Module 1 est le moteur déjà vendu et le plus dur
à copier ; le Module 2 est ce qu'aucun des trois SaaS US ne tient et ce que la cible primaire
achète (le risque évité) ; les deux réutilisent le même moteur de lecture.

Hors MVP : Module 3 complet, Module 5, conflits d'intérêts, intégrations logiciels de cabinet,
revue exhaustive de jurisprudence.

Critère de succès : 10 cabinets pilotes, 200 dossiers vérifiés, au moins 90 % de points confirmés,
une étude de cas chiffrée publiée (temps gagné par dossier, incohérences trouvées avant l'audience).

## 12. Non-objectifs

- Ne rédige ni conclusions, ni actes, ni courriers, y compris pour les dossiers répétitifs ◆.
- Ne remplace ni Themisia, Clio, Secib, ni Doctrine, Lexbase, ni AVOCAT+.
- Ne facture pas, ne gère ni paie ni comptabilité.
- Ne signe rien, n'engage pas la responsabilité de l'avocat.
- Ne vend pas « de l'IA ».
- Ne vise pas les grands cabinets internationaux en premier.
- N'attaque ni la rédaction générique ni la recherche simple.

## 13. Indicateurs de succès

Précision (points confirmés, publiée) ; adoption (cabinets actifs, dossiers vérifiés, rétention à
six mois) ; impact (temps gagné par dossier mesuré, incohérences trouvées avant audience, points de
conformité levés) ; preuve (trois études de cas la première année) ; économie (coût d'acquisition,
valeur vie client, conversion Découverte vers Cabinet).

## 14. Risques et parades ◆

| Risque | Parade |
|---|---|
| Précision insuffisante sur PDF scannés | PDF natifs d'abord ; score de confiance OCR affiché ; précision mesurée et publiée ; remboursement |
| Un acteur français ajoute la fonction | Avance sur le croisement multi-pièces, la piste d'audit et le référentiel ouvert ; publier vite les études de cas |
| Lecture fine des arrêts (pas leur accès, qui est gratuit) | Signal prudent « décision postérieure à lire », jamais « revirement » ; élargir avec les retours pilotes |
| Cycle de vente long sur les 10 à 30 | Découverte à prix fixe sur un dossier déjà plaidé, puis expansion |
| Faux négatif engageant le cabinet | Clause claire : Tamila assiste, l'avocat décide ; RC pro ; piste d'audit exportable ; aucune rédaction |
| Secret professionnel | Architecture de la section 8 ; dossiers ouverts un par un ; jamais de lecture de la messagerie ni de la base clients |
| Référence déontologique citée à tort | Sourcer la recommandation CNB avant toute mention ; s'appuyer sinon sur le RIN et la loi de 1971 |
| Commoditisation par les grands modèles | Ni rédaction ni recherche ; vérification croisée et déontologie, qui exigent le référentiel français |

## 15. Ce que le prompt doit produire, dans cet ordre ◆

1. **PRD du MVP seul** (Modules 1 et 2) : user stories par persona, critères d'acceptation,
   définition du point valide, format du rapport et de la piste d'audit, écrans à partir de l'espace
   existant (`/espace2/tamila` : Vue d'ensemble, Arrivées, Dossier, Dossier de faits, Conformité).
2. **Architecture technique du MVP** : pipeline de lecture, extraction, croisement, connecteurs
   Légifrance (PISTE) et Judilibre, journal d'audit scellé, hébergement France, chiffrement sur le
   poste, conformité RGPD et 66-5.
3. **Plan de recrutement des 10 cabinets pilotes** : ciblage (contentieux, 3 à 30), message,
   questions d'entretien, et le protocole de mesure des points confirmés.
4. Après les trois premiers dossiers pilotes seulement : wireframes des Modules 3 à 5, plan de
   lancement complet, grille tarifaire définitive.
