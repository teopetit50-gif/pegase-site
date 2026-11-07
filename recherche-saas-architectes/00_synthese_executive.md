# 00. Synthèse exécutive : les SaaS pour architectes aux États-Unis

Date : 2026-11-07. Périmètre : cabinets d'architecture US, du solo à l'agence de 50+, résidentiel et
commercial. Base : 300 outils documentés (`02_base_saas.csv`, `base_saas.xlsx`), 33 fiches
détaillées (`03_fiches_saas/`), 396 avis, posts et extraits de rapports analysés
(`04_problemes_architectes.md`), une matrice de couverture (`05`), des opportunités (`06`), des
limites (`07`) et 1 000+ sources datées (`sources.md`). Étiquettes : [vérifié] source primaire ;
[déclaratif] chiffre d'éditeur ; [estimé] calcul expliqué ; [secondaire] relayé par un tiers.

## Le marché en six chiffres

| Chiffre | Valeur | Source et étiquette |
|---|---|---|
| Cabinets d'architecture US | environ 19 000 à 20 000 [estimé, déduit des 14 459 à 14 895 petits cabinets qui en représentent 74 à 75 %] ; 75 % ont moins de 10 personnes ; ils captent 7,4 % des honoraires | AIA Firm Survey 2024 via AIA Small Firm Exchange [vérifié pour les parts] |
| Honoraires bruts 2023 | 104,1 Md$ ; rentabilité 13,2 % ; 143 000 $ par salarié | AIA 2024 [vérifié] |
| Architectes licenciés | 123 398 (2025) ; 12,9 ans pour la licence ; 36 à 38 % d'abandon | NCARB 2025, 2026 [vérifié] |
| Conjoncture | ABI sous 50 depuis fin 2022 ; 10 % des cabinets A&E prévoient de croître en 2026 | AIA, Deltek Clarity 2026 [vérifié] / [déclaratif] |
| Budget technologique | 3,5 % du revenu net ; logiciels 36,7 % de ce budget ; formation 0,8 % | Zweig 2026 [vérifié] |
| Encaissement | délai médian de recouvrement 72 jours ; 15 % des cabinets < 250 k$ suivent l'utilisation | Zweig 2026, ABI mai 2025 [vérifié] |

Un marché en nombre fait de très petites structures, en valeur concentré chez les grands ; en
contraction depuis trois ans ; qui achète pour protéger la marge, pas pour grandir.

## Ce que les architectes disent vraiment (396 items)

1. **Le temps et l'argent avant le design.** Les cinq problèmes les mieux notés sont des problèmes
   de gestion et de coordination : temps et facturation (19/20), suivi de chantier subi dans l'outil
   de l'entrepreneur (17), coût et licences des éditeurs dominants (17), coordination des consultants
   (17), gestion de projet interne (17). Aucun problème de conception n'entre dans le top 10.
2. **Les outils dédiés déçoivent.** BQE CORE (« a total disaster »), Deltek Vantagepoint (« one of the
   worst UX I've ever encountered »), Monograph (factures « unreliable » après migration), Harvest
   (« from $99/month (...) to more than $700/month ») : les avis 1 étoile de 2025-2026 sont massivement
   des avis de clients installés.
3. **Le chantier appartient à l'entrepreneur.** « It wasn't my decision to use Procore » ; « we don't
   rely on it for the official record » ; le cabinet tient un log Excel parallèle ; Newforma est « too
   big, too clunky, too expensive » ; Part3, seul outil pensé pour l'architecte, coûte 150 à 200 $
   par utilisateur et par mois.
4. **L'abonnement a tout contaminé.** Revit 3 005 $/an, +70 % de coût de possession entre 2015 et
   2019, audits de licences ; Bluebeam, Chaos, Trimble, Vectorworks, SoftPlan, Chief Architect ont
   supprimé le perpétuel ; Rhino (995 $) est le dernier.
5. **L'IA est partout et ne sert presque à rien.** 48 % des cabinets s'y « engagent », 7 % forment,
   76 % des utilisateurs ne voient pas de gain ; « AI isn't currently capable of doing a decent job in
   REVIT » ; les clients attendent des livrables « on an AI schedule ».
6. **Les petits cabinets sont exclus.** Suites A&E sur devis, CA à 9 000 $/an minimum, coworking
   cloud Revit à environ 1 000 $ par siège ; ils vivent avec QuickBooks, Harvest, Excel et Bluebeam
   Basics.

## Zones blanches (problèmes forts, sans solution satisfaisante)

- Le dossier de chantier indépendant de l'architecte (RFIs, submittals, visites, décisions) à prix
  fixe par cabinet.
- Le suivi des décisions et de la coordination dans la gestion de projet (« I just spent two hours
  on a set of drawings that had already been revised in a conversation I wasn't part of »).
- Le savoir interne et la version en vigueur des détails et procédures (« 40 years of files »).
- Les spécifications des petits cabinets et du résidentiel, entre MasterSpec dans Word et rien.
- Le dépôt de permis et le suivi des cycles de commentaires (« each set of comments adds another
  12-16 weeks »).
- La facturation par phase pour les cabinets de 1 à 9 personnes.

## Marchés à éviter

Rendu temps réel (saturé, gratuits de qualité, Chaos et Epic), BIM cloud « Revit killer » (100 M$+
levés sans adoption US démontrée), faisabilité et test fits (dense, clients promoteurs), suites
tout-en-un pour les 50+ (Deltek et Unanet verrouillent par le coût de sortie), gestion de contenu
Revit (gratuite chez Autodesk depuis 2023).

## Cinq opportunités (détail dans `06_opportunites.md`)

| Opportunité | Cible | Prix acceptable [estimé] | Risque principal |
|---|---|---|---|
| 1. Dossier de chantier de l'architecte, à prix fixe, connecté à Procore et ACC | cabinets de 3 à 30 personnes | 60 à 150 $/mois par cabinet, ou 30 à 50 $ par projet | Procore ou Autodesk ouvrent un espace architecte ; Part3 baisse ses prix |
| 2. Gestion de projet « phase et décisions » | 5 à 50 personnes | 15 à 30 $/utilisateur/mois | Monograph (29 M$) ; réflexe « nanny software » |
| 3. Spécifications pour petits cabinets et résidentiel | 1 à 20 personnes | 30 à 60 $/mois ou 100 à 300 $/projet | MasterSpec sous licence exclusive Deltek ; responsabilité |
| 4. Dépôt de permis et suivi des commentaires | 1 à 20 personnes, villes denses | 40 à 80 $/mois ou 50 à 150 $/dépôt | fragmentation des juridictions ; PermitFlow |
| 5. Temps et facturation par phase pour 1 à 9 personnes | 75 % des cabinets | 20 à 40 $/mois solo, 60 à 120 $/mois cabinet | panier minuscule ; Monograph descend en gamme |

## Ce qui rend ce marché difficile

Budgets minuscules et en baisse ; dépendance à Revit et aux formats Autodesk ; l'architecte n'est
pas toujours l'acheteur (GC, maître d'ouvrage, ville, promoteur) ; méfiance après des migrations
traumatisantes et des rachats qui dégradent les conditions ; responsabilité professionnelle sur
tout ce qui touche aux codes, aux specs et aux documents tamponnés ; fragmentation géographique ;
sensibilité au cycle immobilier ; niche peu attractive pour les investisseurs (Monograph : 29 M$
pour 2 000 cabinets déclarés).

## Décision recommandée

Entrer par la gestion du quotidien (chantier, décisions, facturation par phase) pour les cabinets de
3 à 30 personnes, à prix fixe par cabinet, avec l'IA en coulisse pour supprimer la saisie, et une
intégration native à ce que le cabinet subit déjà (Procore, ACC, QuickBooks, Bluebeam). Ne pas
vendre « de l'IA », ne pas attaquer Revit, ne pas viser les 50+ en premier.

## Limites à connaître

G2, Capterra et Reddit n'étaient pas lisibles en direct (403 ou blocage) : leurs données viennent
d'extraits de recherche et de sites miroirs d'avis (Trustpilot, Slashdot, SourceForge, App Store) ;
les prix Autodesk viennent de sources tierces (autodesk.com en 403) ; les étapes amont (faisabilité,
esquisse, estimation) sont sous-représentées dans les témoignages ; les enquêtes d'éditeurs sont
marquées [déclaratif]. Détail dans `07_limites.md`.
