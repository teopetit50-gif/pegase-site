# 00. Synthèse exécutive : les SaaS pour avocats aux États-Unis et la place de Tamila

Étude réalisée pour Omega AI, le 2026-11-07. 141 outils recensés (`02_base_saas.csv`, `base_saas.xlsx`), 40 fiches, plus de 300 avis et fils de discussion analysés, 519 sources. Chiffres étiquetés [vérifié], [estimé] ou [déclaratif] dans les livrables détaillés.

## Le marché en six chiffres

| Chiffre | Valeur | Source |
|---|---|---|
| Avocats actifs (2025) | 1 374 720, dont environ la moitié des avocats de cabinet privé exercent seuls | ABA [vérifié] |
| Chiffre d'affaires des cabinets (2025) | 404 à 427 milliards USD | IBISWorld, MarketLine [déclaratif] |
| Heures facturables par jour | 3,0 (2025), 3,4 (2026) ; réalisation 88 %, recouvrement 93 % | Clio [vérifié / déclaratif] |
| Cabinets de 100+ avocats dont les write-offs augmentent | 72 % (2025), 89 % (2026) | BigHand [déclaratif] |
| Décisions de justice recensant des citations inventées par l'IA | 712 fin 2025, plus de 1 300 en avril 2026 | base Charlotin via Bloomberg Law [vérifié] |
| Financement legaltech 2025 | 3,2 à 6 milliards USD ; Harvey valorisé 11 Md USD (mars 2026), Legora 8,8 Md USD, Clio 5 Md USD | presse [vérifié, divergent] |

## Ce qui existe déjà pour ce que fait Tamila

1. **La chronologie citée est devenue standard chez les grands.** Relativity (aiR for Case Strategy, janvier 2026 : chronologie, faits favorables ou défavorables, outlines de dépositions), DISCO (timelines et dépositions incluses dans un prix au Go unique, février 2026), Everlaw et Harvey (« create chronologies » sur Vault) la proposent, mais à qui a déjà ses pièces chez eux.
2. **En personal injury, trois acteurs très financés** (EvenUp 385 M USD, Eve 150 M USD, Supio 93 M USD) vendent chronologies médicales, résumés et demandes avec revue humaine, intégrés à Filevine, Litify et CASEpeer.
3. **Pour le cabinet moyen hors PI, l'offre est mince** : CaseFleet (30 ou 140 USD par utilisateur, manuel ou IA récente), CaseMap+ AI (LexisNexis, migration jugée « a disaster », Capterra 3,7/5), Clearbrief (vérification des citations et des faits dans Word, 150 à 300 USD par utilisateur, 8 M USD levés), Callidus (13 M USD).
4. **Les délais et les notifications des tribunaux sont un marché à part** : CompuLaw (Aderant), LawToolBox, CalendarRules (intégré à Clio, MyCase), ECFX et PacerPro (notices ECF). Bien couvert au fédéral et chez les grands ; bricolé chez les petits (tableurs, dossiers papier).
5. **La rentabilité par dossier et les forfaits dépassés** sont pilotés chez les grands (BigHand, Aderant, Intapp) et presque absents chez les petits : les rapports sont le premier motif de départ de Clio, PracticePanther, LEAP et Centerbase.

## Ce que les avocats disent vraiment

- Ils n'achètent pas une IA, ils achètent l'absence d'hallucination : « I have never had a single hallucinated case... you can limit its source data » (Harvey) ; « anyone who ever relies on AI... without separately checking on westlaw will be fired immediately ». Les Am Law 200 interdisent tout sauf Westlaw et Copilot.
- La confidentialité des pièces est la ligne rouge : « you can't just feed it medical records or discovery attachments » (paralegal).
- Les petits cabinets rejettent les prix cachés : « If the website doesn't give me pricing up front... I just chalk it up as a non-option » (81 pts). Ils détestent les hausses, les sièges payants pour les assistants et les contrats de 3 ans.
- Les paralegals, utilisateurs réels, parlent de volume : 150 à 300 courriels de signification par jour, 60 dossiers dès la première semaine, chronologies et résumés de dépositions à la main (4 à 8 heures par transcript selon les éditeurs).
- Les cinq problèmes les mieux notés (score sur 20) : vérifier faits et citations avant de signer (18), temps non saisi (18), délais et notifications (17), transformer des milliers de pages en chronologie sourcée (17), rentabilité et forfaits invisibles (16).

## Zones blanches

Le rapprochement des pièces citées par l'adversaire avec les pièces produites, la liste des pièces attendues, les contradictions entre pièces présentées côte à côte, le forfait suivi contre la convention pour un cabinet de moins de 100 avocats, et un point du matin unique : aucun des 141 outils ne les fait. Le segment délaissé est le cabinet de contentieux de 5 à 50 avocats hors PI (commercial, employment, construction, assurance), trop petit pour Relativity ou Harvey, trop « contentieux » pour Clio, sans volume répétitif pour les verticaux PI.

## Tamila : ce qu'il faut en retenir

**Pour la France (à faire maintenant).** Tamila couvre cinq des six zones blanches identifiées aux États-Unis ; ses principes (chaque fait renvoie à sa page, validation humaine, pas d'entraînement, effacement à la clôture) sont exactement ce qui fait adopter Harvey et rejeter les autres. Priorités tirées du marché US : (1) rendre la vérification visible et mesurable (taux de faits validés sans correction) ; (2) contrôler les conclusions dans Word, phrase par phrase, contre les pièces (modèle Clearbrief) ; (3) publier une fourchette de prix par cabinet, sans siège pour les assistants, avec un engagement résiliable ; (4) une page de confiance répondant aux six questions des avocats, et un audit externe (ISO 27001 ou SOC 2) à moyen terme ; (5) questions au dossier en tableau multi-pièces et préparation d'audition par personne ; (6) connecteurs nommés (Outlook, RPVA, logiciels de cabinet) ; (7) option de revue humaine facturée au dossier, et prix par livrable pour le dommage corporel. Repère de prix US : 1 500 à 5 000 USD par mois par cabinet de 5 à 20 utilisateurs [estimé].

**Pour les États-Unis (verdict).** Ne pas y aller maintenant ; préparer une entrée conditionnelle dans 18 à 36 mois. Le coût de transposition est élevé (discovery, exhibits, Bates, notices ECF et portails d'État, moteur de délais par juridiction, hébergement US, SOC 2, vente locale) et la fenêtre se referme (les plateformes d'e-discovery descendent en gamme, Clio intègre l'IA, Harvey et Legora peuvent descendre). Conditions : une dizaine de clients français payants avec une précision publiée, un audit SOC 2, un produit réduit à ce qui se transpose sans procédure (pré-lecture, chronologie citée, contradictions, pièces citées non produites, questions au dossier, Word), une intégration de lancement (Clio App Directory, NetDocuments, add-in Word), un prix public et un essai self-service, un relais de vente local, et un angle étroit : commercial litigation ou insurance defense dans un ou deux États.

## Ce qui rend le marché difficile

Aversion au risque et interdictions internes, confidentialité et questionnaires de sécurité, coût de migration et poids de Clio (5 Md USD, 36 barreaux, 250 intégrations), levées massives des concurrents, exercice illégal du droit et responsabilité de l'avocat (Rule 5.3), fragmentation de cinquante États, et saturation des catégories voisines (practice management, intake, PI, assistants Am Law, CLM).

Détail dans `01` (marché), `04` (douleurs), `05` (matrice), `06` (opportunités), `07` (Tamila), `08` (limites).
