# Notes : Suivi de chantier (Construction Administration), étapes 11 et 12

Date de vérification : 2026-11-07. Fichier de données : `02_frag_chantier.jsonl` (21 outils).

## 1. Nombre d'outils documentés

21 outils dans le JSONL. Les 9 outils prioritaires demandés sont tous couverts (Part3, ArchiSnapper, Fieldwire, Procore, Autodesk Build devenu Forma Build, Submittal Exchange, Newforma Konekt, OpenSpace, Bluebeam), plus 12 outils de second rang (Aconex, Kahua, Trimble Unity Construct ex e-Builder, Dalux Field, PlanRadar, DroneDeploy Ground ex StructionSite, Revizto, SubmittalLink, Cogram, SKYSITE, ArchitAI Field, Matterport).

Coordination avec l'agent « collaboration » : Newforma Konekt est documenté ici sous l'angle chantier uniquement (CA Track : RFIs, submittals, classement d'emails, Procore Connector). L'angle gestion documentaire, Project Center on-premise et TonicDM restent à cet agent. Bluebeam est documenté ici en une ligne chantier (punch, RFIs, submittals, Studio) ; la revue de plans reste à l'agent concerné. Revizto est traité ici sous l'angle issues terrain seulement.

## 2. Outils écartés et pourquoi

| Outil | Raison |
|---|---|
| RForm (rform.ca) | Outil CA conçu pour les architectes, mais canadien : la page ne dit rien d'une disponibilité US, références RAIC et UPEI uniquement. Données utiles si le périmètre s'élargit : prix par projet « Core CA Project : 39,95 $/mois », utilisateurs illimités, essai 14 jours, modules submittals, RFIs, changements, certificats de paiement, rapports de visite (relevé 2026-11-07, https://rform.ca/ et https://raic.org/rform). Attention : rform.com est une autre société. |
| Fonn | Désormais « Access Fonn », rattaché à The Access Group (Royaume-Uni), page « Built for UK&I contractors », aucun bureau ni client US cité (https://www.theaccessgroup.com/en-gb/construction/products/fonn/). Hors présence US. |
| Fieldlens | Devenu « Fieldlens by RedTeam » (lien de connexion fieldlens.redteam.com dans le pied de page de https://redteam.com/fieldlens-the-solution/), outil de terrain pour contractors, aucune page produit lisible ; historique WeWork non retrouvé. Écarté comme outil contractor absorbé. |
| Buildertrend et CoConstruct | Logiciels de gestion pour builders résidentiels, pas de cas d'usage architecte repéré dans les discussions AIA ou Archinect ; site buildertrend.com inaccessible (403). CoConstruct a été absorbé par Buildertrend (non revérifié dans cette session). |
| Houzz Pro | Orienté designers et builders résidentiels (CRM, devis, suivi client) ; redirection en boucle sur la page tarifs. À laisser à la catégorie relation client. |
| UDA ConstructionOnline, Contractor Foreman, Raken, Trimble ProjectSight, Knowify | Outils contractors (daily reports, estimation, planning) ; aucun usage architecte documenté. Page ConstructionOnline non rendue (contenu vide). |
| Projectmates (Systemates) | Plateforme owner recommandée dans deux forums anciens (4specs 2008) ; site non rendu (contenu vide) ; pas assez de données sourcées pour une fiche. |
| HoloBuilder (FARO) | Site holobuilder.com renvoie un contenu vide, faro.com en boucle de redirection ; impossible de confirmer le statut (intégration dans FARO Sphere XG) ni les prix. |
| ArchiTrac | Outil maison d'un cabinet membre de l'AIA (Arthur / Blake Middleton, AIA, AIA Community Hub 2025-05-06), proposé aux confrères ; site architrac.com non rendu. Signal intéressant : un cabinet a préféré développer son outil plutôt que payer Newforma ou Procore. |
| SiteDocs, Bridgit, Nialli, Fulcrum | Hors périmètre CA (sécurité, planification de main d'oeuvre, lean planning, formulaires génériques). Non vérifiés dans cette session. |
| Builderstorm, Snagr, Letsbuild, Finalcad, Novade | Éditeurs européens ou asiatiques sans présence US documentée dans cette session. Non vérifiés. |
| Buildots, Doxel, Spot (Boston Dynamics), drones DJI | Suivi d'avancement par IA ou robotique vendu aux GC et owners, usage architecte marginal ; non vérifiés. Spot apparaît comme intégration citée par DroneDeploy (robots) et Revizto (Buildots en logo). |
| Excel, email, Smartsheet, Airtable | Pas des SaaS de la catégorie mais le contournement dominant, voir section 5. |

## 3. Sites inaccessibles et limites de la session

- Budget WebSearch épuisé après 16 requêtes (limite partagée entre agents) : la suite a été faite uniquement par lecture directe d'URL.
- reddit.com : bloqué pour le crawler, aucune discussion r/Architects lue. Les signaux communautaires viennent d'Archinect, AIA Community Hub, 4specs et Eng-Tips (ce dernier via extraits de recherche).
- g2.com, capterra.com, capterra.ca, trustradius.com, softwareadvice.com, getapp.com : 403 en lecture directe. Les notes G2 et Capterra citées proviennent des extraits affichés par le moteur de recherche (URL des pages citées dans `sources`).
- autodesk.com (page Forma Build, 403), oracle.com (Aconex et communiqué Textura, 403), buildertrend.com (403), eng-tips.com (403), newforma.com/about (404), fieldwire.com/about (404), part3.io/press (404), matterport.com/pricing (404), plusieurs pages Wikipedia (Fieldwire, Bluebeam, Newforma, Buildertrend, DroneDeploy, PlanRadar, Dalux : 404).
- Pages à contenu vide (rendu JavaScript) : holobuilder.com, constructiononline.com, projectmates.com, architrac.com.
- Vérifications de sécurité de domaine limitées pendant plusieurs minutes, ce qui a bloqué une partie des pages secondaires.

## 4. Les 7 outils les plus importants de la catégorie

1. **Procore** : la plateforme que l'architecte subit plutôt que choisit. Omniprésente chez les GC US (4 167 avis G2, 4.6/5, 1,32 Md$ de CA 2025), utilisateurs illimités donc l'architecte y est invité gratuitement ; c'est le standard de fait pour RFIs, submittals et punch lists.
2. **Autodesk Forma Build (ex Build, PlanGrid, BIM 360 Field)** : second standard GC et owner, continuité Revit et Autodesk Docs, repackagé en mars 2026 (Essentials 67 $/mois, par utilisateur 117 $/mois selon relevé tiers).
3. **Part3** : seul SaaS CA construit pour l'architecte avec une vraie traction (100+ cabinets revendiqués, partenariat AIA Cornerstone, note G2 4.9 sur 15 avis), IA sur les submittals, 150 à 200 $/utilisateur/mois ; jeune et cher par siège, mais c'est la réponse directe au « procoring » de la CA.
4. **Bluebeam** : brique quasi universelle de revue et tampon de submittals et de réponses aux RFIs, 260 à 590 $/utilisateur/an ; pas un outil de log, d'où la cohabitation avec Excel.
5. **Newforma Konekt** : l'outil historique des cabinets moyens et grands pour tenir leur propre log et classer les emails, connecteur Procore ; critiqué comme lourd et cher par des membres AIA, IA seulement annoncée pour 2026.
6. **Deltek ArchiSnapper** : le rapport de visite et la punch list mobile des petits cabinets, 4.5/5 sur 46 avis Capterra, intégré à Vantagepoint et Ajera ; périmètre étroit et prix désormais sur devis.
7. **Fieldwire by Hilti** : alternative gratuite ou bon marché pour punch lists et plans sur le terrain (4.5/5, 531 avis G2), mais RFIs et submittals réservés à 89 $/utilisateur/mois.

Mentions : OpenSpace (capture 360, 200 M$ levés, cible GC) ; Submittal Exchange (historique mais score TrustRadius 3.2/10) ; Cogram et SubmittalLink (nouvelle vague IA et prix fixe, sans avis).

## 5. Signaux de douleur utilisateur les plus fréquents

1. **La CA se fait dans l'outil du GC, pas dans celui de l'architecte.** « It wasn't my decision to use Procore » ; « He who writes the minutes writes the history of the project » (Proto, Archinect, 2018-01-21). Les cabinets tiennent un log parallèle : « we don't rely on it for the official record of submittals or RFIs » (David Mentzer, AIA, 2025-05-02). https://archinect.com/forum/thread/150045798/architect-responsible-for-updating-contractor-management-program et https://communityhub.aia.org/discussion/submittal-management-tools
2. **Transfert de charge et de coût vers l'architecte.** « The contractor can easily burry the costs of the system in there general conditions » (CAEMANN, Archinect, 2024-05-13) ; submittals envoyés en catalogues complets non triés ; GC qui ne révise pas avant de transmettre. https://archinect.com/forum/thread/150135996/construction-administration-has-the-procoring-of-ca-fucked-ca-for-architects
3. **Excel et email restent la norme des petits cabinets.** « I cannot afford specialty programs that large firms can amortize over larger and greater numbers of projects » (Mark Baum, AIA, 2025-05-01) ; logiciels de punch list jugés « exorbitant » pour 1 à 3 punch lists par an (Lee Calisti, AIA, 2025-05-04). https://communityhub.aia.org/discussion/submittal-management-tools
4. **Incohérence d'un projet à l'autre.** « The bigger issue is that we are all doing it differently » (Thesla Collier, AIA, 2025-05-01) : chaque GC et owner impose sa plateforme (Procore, e-Builder, ACC, Submittal Exchange), l'architecte s'adapte. https://communityhub.aia.org/discussion/submittal-management-tools-1
5. **Perte d'accès et de propriété des données.** « With Procore, the information lives on the cloud and is only accessible to people with logins » (Andrew Malanowski, AIA, 2025-05-05) ; le GC peut révoquer l'accès ; conditions d'utilisation jugées incompatibles (Archinect, 2018). https://communityhub.aia.org/discussion/submittal-management-tools-1
6. **Surcharge de notifications et vocabulaire imposé.** « I despise getting tons of emails » (Archinect, 2019-05-13) ; ingénieurs tagués sur chaque submittal et obligés d'employer « approve » malgré leurs avocats (Eng-Tips, fil submittal-review, https://eng-tips.com/threads/submittal-review.507845).
7. **Newforma jugé lourd et cher.** « Too big, too clunky, and too expensive for our needs » (Daniel Audette, AIA, 2025-05-02). https://communityhub.aia.org/discussion/submittal-management-tools-1
8. **Outils de terrain limités en markup ou en performance.** ArchiSnapper : « lack of arrows, callouts, bubbles, colors » (Capterra, https://www.capterra.ca/reviews/146596/archisnapper) ; Fieldwire : lenteurs signalées par 14 avis G2 (https://g2.com/products/fieldwire-by-hilti/reviews).
9. **Procore trop cher et trop long à apprendre pour un cabinet.** « By far, the most expensive solution that we reviewed » (Capterra) ; 104 avis G2 citent la courbe d'apprentissage, 79 le prix (https://g2.com/sellers/procore-technologies).

## 6. Observations utiles pour la suite

- Le marché se structure en trois couches : plateformes GC ou owner où l'architecte est invité (Procore, Forma Build, Aconex, Kahua, e-Builder, Submittal Exchange), outils que le cabinet paie pour garder son propre dossier (Part3, Newforma, Bluebeam, ArchiSnapper, Fieldwire, SKYSITE), et capture de réalité (OpenSpace, DroneDeploy, Matterport, Dalux).
- Espace ouvert pour un outil CA à prix fixe par cabinet, avec log indépendant, classement d'emails et connecteur Procore ou ACC : c'est exactement la demande exprimée sur l'AIA Community Hub et ce que Part3, Cogram et SubmittalLink attaquent chacun par un angle différent.
- Les prix par siège (Part3 150 à 200 $, Fieldwire 89 $ pour les RFIs) sont le premier frein cité par les petits cabinets ; les modèles à volume (Procore, OpenSpace, SubmittalLink) excluent de fait l'architecte comme acheteur.
