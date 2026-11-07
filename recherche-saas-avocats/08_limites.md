# 08. Contrôle qualité, limites et incertitudes

Date : 2026-11-07.

## 1. Contrôle d'un échantillon de 25 affirmations chiffrées contre leurs sources

Méthode : relecture automatique de la page source (curl, sans contournement de protection) et recherche du chiffre exact dans le texte de la page. Script : `_travail/qc.py` (copie dans le dossier de travail de la session). Résultat : 21 confirmées, 1 non confirmée par lecture directe, 3 sources inaccessibles au lecteur automatique mais confirmées par des reprises.

| # | Affirmation | Source | Résultat |
|---|---|---|---|
| 1 | 1 374 720 avocats actifs (ABA 2025) | 2civility.org | confirmé |
| 2 | CaseFleet 30 et 140 USD par utilisateur et par mois | casefleet.com/pricing | confirmé |
| 3 | MyCase 50 / 100 / 130 USD, Accounting 39 USD | mycase.com/pricing | confirmé |
| 4 | Smith.ai 300 USD pour 30 appels | smith.ai/pricing | confirmé |
| 5 | Docket Alarm 99 USD flat, 39,99 USD PAYG | docketalarm.com/pricing | confirmé |
| 6 | LawPay 19 USD par mois, 2,99 % | lawpay.com/pricing | confirmé |
| 7 | Xakia 100 / 125 / 155 / 230 USD | xakia.com/pricing | confirmé |
| 8 | Family Law Software 39,95 et 79,95 USD | familylawsoftware.com/pricing | confirmé |
| 9 | GoldFynch 27 USD (3 Go), 76 USD (10 Go) | goldfynch.com/pricing | confirmé |
| 10 | Digital WarRoom 500 USD minimum, 2 000 USD cloud privé | digitalwarroom.com/pricing | confirmé |
| 11 | Intapp exercice 2025 : 504,1 M USD, ARR 485,4 M USD | businesswire.com | page inaccessible au lecteur automatique ; chiffres confirmés par Nasdaq et Motley Fool (résumés de recherche) |
| 12 | DISCO 2025 : T4 41,2 M USD, prévision 167 à 177 M USD | businesswire.com | page inaccessible ; confirmé par AOL et MarketBeat |
| 13 | Supio série B 60 M USD, Sapphire | lawnext.com | confirmé |
| 14 | EvenUp série E 150 M USD à 2 Md USD | businesswire.com | page inaccessible ; confirmé par Bloomberg Law et Built In |
| 15 | Eve série B 103 M USD | lawnext.com | confirmé |
| 16 | Legora série D 550 M USD à 5,55 Md USD | legora.com | confirmé |
| 17 | Laurel série C 100 M USD, IVP | lawnext.com | confirmé |
| 18 | Relativity aiR for Case Strategy : chronologie, 650 faits réduits à 50 | lawnext.com | confirmé |
| 19 | LawToolBox 35 et 42 USD sur la page éditeur | lawtoolbox.com/pricing | non confirmé : la page affiche ses prix en JavaScript ; chiffre conservé comme [déclaratif, résumé de recherche] et complété par l'annuaire LawNext 2024 |
| 20 | Clio : vLex 1 Md USD, série G 500 M USD à 5 Md USD | legaltechnology.com | confirmé |
| 21 | Brightflag racheté 425 M EUR | sacra.com | confirmé |
| 22 | AffiniPay 2025 : 31 %, 21 %, 43 % | lawnext.com | confirmé |
| 23 | Devoir de compétence technologique : 40 États | lawnext.com/tech-competence | confirmé |
| 24 | CASEpeer 90 / 130 / 160 USD | casepeer.com/pricing | confirmé |
| 25 | Docketwise 80 / 100 / 120 USD | docketwise.com/pricing | confirmé |

## 2. Contrôle du CSV

- 141 lignes ; chaque ligne a au moins une URL dans `sources` et la date `2026-11-07` dans `date_verification` (vérifié par script, zéro ligne en défaut).
- 45 lignes ont une note G2 ou Capterra relevée ; les autres portent « non trouvé ».
- 23 outils sont marqués concurrents directs ou partiels de Tamila.

## 3. Sources inaccessibles au lecteur automatique

americanbar.org, clio.com (hors mycase.com), bls.gov, sec.gov, g2.com, trustradius.com, reddit.com (lu via le site de snapshots reddit.sentinel-team.org), fishbowlapp.com, businesswire.com, legaltechnologyhub.com (429), rocketmatter.com, cosmolex.com, bill4time.com, trustbooks.com, caretlegal.com, tabs3.com, lawcus.com, knackly.io, ruby.com, wealthcounsel.com, altlegal.com, lollylaw.com, cloudlex.com, lawvu.com, brightflag.com, centerbase.com (certificat). Pour ces sites, les chiffres viennent de reprises (LawNext, Law360, ABA Journal, 2civility, annuaires) ou de résumés de recherche citant la page ; ils sont étiquetés en conséquence.

Décision de méthode : aucune usurpation d'identité de navigateur n'a été utilisée pour lire ces sites (la classification de sécurité de la session l'a refusé) ; seules les pages accessibles à un client HTTP ordinaire ont été lues directement.

## 4. Ce qui n'a pas pu être vérifié ou reste incertain

- Les prix de Harvey, Legora, CoCounsel, Lexis+ Protégé, Smokeball, Clio (paliers supérieurs), Filevine, Litify (au-delà du prix d'entrée), Supio, EvenUp, Eve, Everlaw, Relativity, DISCO, ECFX, PacerPro, CompuLaw, Opus 2, Trellis : sur devis ; les fourchettes citées viennent de sites tiers et sont marquées [non vérifié].
- La répartition exacte des avocats par taille de cabinet dans le Profile of the Legal Profession 2025 (ABA inaccessible).
- Le pourcentage de sinistres RC pro liés aux délais (22 % à 25 % selon la source et la définition).
- La part des avocats en contentieux (25 % à 46 % selon la méthode).
- Les chiffres de l'ILTA Technology Survey 2025 (réservés aux membres) et du CLOC State of the Industry (membres).
- La valorisation de Harvey à 15,5 Md USD (septembre 2026, source unique) et la série F d'Ironclad à 4,5 Md USD (tracker, non confirmée).
- Le total levé par Everlaw (300 à 517 M USD selon la source) et par Filevine (545 à 776 M USD).
- Les notes G2 de Relativity, Harvey, CaseFleet, Supio, EvenUp, Eve, Opus 2, ECFX, PacerPro (absentes ou trop peu d'avis).
- Le subreddit d'origine de certains fils Reddit lus via snapshots (marqué « probable » quand déduit du contexte).
- Le nombre de cabinets d'insurance defense aux États-Unis (non trouvé) ; le nombre de cabinets PI : 50 435 selon IBISWorld 2025, 135 000 à 165 000 avocats PI selon Clio et IBISWorld [déclaratif].
- Le salaire médian des paralegals de contentieux (Robert Half 2026 : litigation and eDiscovery specialist 76 000 USD ; paralegal non trouvé).
- Les chiffres de traction de Tamila (clients, prix pratiqués) : « à compléter » dans le brief, non disponibles.

## 5. Biais connus du corpus

- Les avis Capterra sont majoritairement positifs (notes moyennes de 3,7 à 4,9) ; les reproches ont été cherchés dans les avis à 1 à 3 étoiles et les sections « Cons ».
- Reddit sur-représente les solos, les petits cabinets et les paralegals, et sous-représente les grands cabinets (r/biglaw peu couvert par les snapshots).
- Les chiffres d'éditeurs (Clio, AffiniPay, BigHand, Thomson Reuters) portent sur leurs propres clients ou enquêtes ; ils sont marqués [déclaratif].
- Les comparatifs de prix tiers (CostBench, Vaquill, Spellbook, Lawxy) sont souvent rédigés par des concurrents ; ils ne servent qu'en l'absence de prix public et sont marqués [non vérifié].
- Les sites de snapshots Reddit ne capturent que 10 à 15 commentaires par fil.
