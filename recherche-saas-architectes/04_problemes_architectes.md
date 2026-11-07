# 04. La voix des architectes : problèmes classés par score

Date de rédaction : 2026-11-07. Corpus : 396 items (avis, posts, témoignages, extraits de rapports)
collectés en phase 4, fichiers bruts dans `_travail/04_voix_*.jsonl`. Un item = une source, une
citation exacte en anglais, une URL, une étape du workflow, un segment, un contournement.

## 1. Méthode

### 1.1 Corpus

| Lot | Items | Sources principales |
|---|---|---|
| Avis sites d'avis, CAD / BIM / visualisation | 70 | Trustpilot, SourceForge, FinancesOnline, SoftwareSuggest, App Store (flux RSS), forums éditeurs (Chaos, D5, SketchUp, McNeel, Graphisoft, Chief Architect) |
| Avis sites d'avis, gestion de cabinet | 101 | Trustpilot, Slashdot, SourceForge, App Store, Archinect, témoignages éditeurs (Monograph, marqués déclaratifs) |
| Avis sites d'avis, collaboration, chantier, specs | 70 | Trustpilot, App Store, 4specs, Archinect, AIA Community Hub, Eng-Tips |
| Forums, YouTube, LinkedIn, podcasts | 83 | Archinect (92 items au total sur le corpus), Life of an Architect, Archispeak, AEC Magazine, lettres ouvertes |
| Rapports et études sectorielles | 60 | AIA/ABI, NCARB, Deltek Clarity, Zweig, PSMJ, Monograph, AIA Trust, ACEC, ARCHITECT |
| Reddit | 12 | extraits de recherche uniquement (reddit.com bloqué en lecture) |

Répartition par étape (étape principale) : 13 temps et facturation 91 ; 0 transversal 33 ;
11 suivi de chantier 33 ; 15 gestion de projet 30 ; 19 RH 18 ; 16 documents 16 ; 5 documents de
construction 16 ; 7 specs 13 ; 9 visualisation 10 ; 17 CRM 9 ; 1 honoraires 8 ; 6 permis 8 ;
14 ressources 8 ; 18 connaissances 3 ; 10 appel d'offres 2 ; 12 clôture 1 ; 2, 3, 4, 8 : moins de 5
chacune. Les étapes de production amont (2, 3, 4, 8, 10, 12) sont sous-représentées : les
architectes s'y plaignent peu en ligne, ou les outils y sont moins présents. Cela se lit comme une
information en soi (voir 05 et 07).

Limites : G2 et Capterra n'étaient pas lisibles en direct (HTTP 403), leurs avis n'apparaissent que
via extraits de recherche ; Reddit n'a été exploité que via extraits ; les témoignages publiés par
les éditeurs (pages « customers ») sont marqués [déclaratif] et n'ont jamais servi seuls à noter un
problème. Voir `07_limites.md`.

### 1.2 Barème (chaque critère de 1 à 5, score total sur 20)

- Fréquence : nombre de sources indépendantes qui en parlent dans le corpus (1 = une seule source ;
  3 = cinq à dix ; 5 = plus de quinze, ou présence dans les rapports sectoriels et les forums).
- Intensité : temps ou argent perdus, risque juridique, stress, tels que décrits par les sources.
- Insatisfaction : à quel point les solutions existantes le résolvent mal (5 = très mal résolu ou
  pas de solution ; 1 = bien résolu, plaintes marginales).
- Disposition à payer : signaux concrets (budgets déjà alloués, outils déjà payés pour cela,
  plaintes sur les prix qui prouvent qu'on paie, abonnements empilés).

## 2. Classement

| Rang | Problème | Étapes | Segments | F | I | Ins | Pay | Total |
|---|---|---|---|---|---|---|---|---|
| 1 | Temps, facturation et rentabilité : le besoin est universel, les outils dédiés déçoivent | 13 | tous | 5 | 5 | 4 | 5 | 19 |
| 2 | Le suivi de chantier se fait dans l'outil de l'entrepreneur, le cabinet tient un double dossier | 11, 12 | tous, surtout petits et moyens | 5 | 4 | 5 | 3 | 17 |
| 3 | Coût et politique de licences des éditeurs dominants (Autodesk en tête, puis Bluebeam, Chaos, Trimble) | 0 | tous | 5 | 4 | 5 | 3 | 17 |
| 4 | Coordination des consultants et échange de modèles : cher, lent, exclusif | 15, 16 | tous | 5 | 4 | 4 | 4 | 17 |
| 5 | Gestion de projet interne : décisions perdues, outils génériques inadaptés | 15 | petits et moyens | 5 | 4 | 5 | 3 | 17 |
| 6 | Honoraires sous pression, dérive de périmètre, impayés de fin de projet | 1, 13 | solos et petits | 5 | 5 | 4 | 2 | 16 |
| 7 | Spécifications : monopole lourd d'un côté, Word recyclé de l'autre | 7 | tous | 4 | 4 | 5 | 3 | 16 |
| 8 | Permis et conformité : portails, cycles de revue, règles mouvantes, IA peu fiable | 6 | tous | 4 | 5 | 4 | 3 | 16 |
| 9 | IA : adoptée sans bénéfice ni formation, incapable dans Revit, pression des clients | 0, 5, 9 | tous | 5 | 3 | 4 | 4 | 16 |
| 10 | Documents de construction : productivité, automatisation promise, Revit LT bridé | 5 | tous | 4 | 4 | 4 | 4 | 16 |
| 11 | Fragmentation de la stack et double saisie | 0, 13, 15 | tous | 5 | 4 | 4 | 3 | 16 |
| 12 | Petits cabinets exclus par les prix par siège et les contrats au volume | 0, 11 | solos et petits | 4 | 4 | 5 | 3 | 16 |
| 13 | Facturation par phase, forfaits et avancement mal gérés par les outils généralistes | 13 | solos et petits | 4 | 4 | 4 | 3 | 15 |
| 14 | Planification de la charge et des ressources à la main | 14 | tous | 4 | 4 | 4 | 3 | 15 |
| 15 | Savoir interne enfoui dans des fichiers : détails introuvables, standards en PDF, versions multiples | 18, 16 | moyens et grands | 4 | 3 | 5 | 3 | 15 |
| 16 | Recrutement, rétention, licence et épuisement | 19 | tous | 5 | 4 | 3 | 3 | 15 |
| 17 | Applications mobiles des suites A&E inutilisables pour saisir le temps et les notes de frais | 13 | tous | 4 | 3 | 5 | 3 | 15 |
| 18 | Performance et stabilité des outils BIM et CAD | 3, 4, 5 | tous | 5 | 4 | 3 | 2 | 14 |
| 19 | CRM et marketing : outils trop lourds, pipeline suivi dans un tableur | 17 | solos et petits | 4 | 3 | 4 | 3 | 14 |
| 20 | Annotation et revue sur le chantier : les apps mobiles régressent, retour au papier | 11 | tous | 4 | 3 | 4 | 3 | 14 |
| 21 | Rupture entre esquisse et BIM : remodelage, mise en page lente | 3, 4, 5 | petits | 4 | 3 | 4 | 3 | 14 |
| 22 | Rendu temps réel : licences nommées, renouvellements forcés, offres gratuites qui disparaissent | 9 | tous | 4 | 3 | 3 | 3 | 13 |
| 23 | Estimation des coûts en conception : pas d'outil pensé pour l'architecte | 8 | petits et moyens | 3 | 4 | 4 | 2 | 13 |
| 24 | Cybersécurité et sinistres | 16, 11 | tous | 3 | 4 | 3 | 3 | 13 |
| 25 | Gestion du contenu Revit (familles, bibliothèques) | 18 | moyens et grands | 3 | 3 | 3 | 3 | 12 |
| 26 | Support client des grands éditeurs | 0 | tous | 4 | 3 | 4 | 1 | 12 |
| 27 | Le dirigeant de petit cabinet comme amortisseur financier | 0, 13 | solos et petits | 3 | 4 | 3 | 1 | 11 |
| 28 | Relevé de l'existant : paliers tarifaires et conversions payantes | 2, 3 | résidentiel | 3 | 2 | 3 | 3 | 11 |
| 29 | Clôture et archivage : données verrouillées, fichiers sans structure | 12 | tous | 2 | 3 | 4 | 2 | 11 |
| 30 | Préparation à la licence et formation continue : coûteuses, peu intégrées au cabinet | 19 | tous | 3 | 2 | 3 | 3 | 11 |

## 3. Fiches par problème

Format : étapes ; segments ; ce que disent les sources (citations exactes, URL, date) ;
contournement actuel ; notes et justification.

### P1. Temps, facturation et rentabilité : le besoin est universel, les outils dédiés déçoivent (19/20)

Étapes 13 (et 14, 15). Segments : tous ; le petit cabinet souffre le plus faute de personnel
administratif, le cabinet moyen souffre de ses outils.

Ce que disent les sources :
- Le besoin : « the median collection period increased from 67 days to 72 days » (Zweig 2026,
  https://zweiggroup.com/blogs/the-zweig-letter/aec-firms-billing-faster-collecting-slower) ; « On
  Monday morning, a project manager (PM) fills out Friday's timesheet from memory » (Monograph,
  https://monograph.com/blog/tracking-billable-hours-architects, [déclaratif]) ; « I've worked as an
  advisor to an architecture firm that forgot to invoice one of their bigger clients for over 6
  months » (BQE, https://www.bqe.com/blog/billing-and-invoicing-workload-solutions-for-architecture-and-engineering-firm-owners, [déclaratif]) ;
  seuls 15 % des cabinets de moins de 250 k$ suivent l'utilisation (ABI mai 2025).
- Les outils dédiés : « We implemented BQE Core last year and it's been a total disaster »
  (Archinect, 2026-09, https://archinect.com/forum/thread/150543762/is-there-a-project-management-tool-that-actually-works-for-architecture-firms) ;
  « I don't really trust it except for the very basics, but that's on me - it has a ton of
  functionality, but he interface is absolute dogshit » (même fil, six ans d'usage de BQE Core) ;
  « VantagePoint is a software with one of the worst UX I've ever encountered, which clearly has never
  been user tested » (Trustpilot, 2023-05, https://www.trustpilot.com/reviews/646366deb413f00c8613328a) ;
  « Takes a Ph.D just to figure out how to submit a time sheet » (App Store, app Vantagepoint, 2024-04) ;
  « Migration to Monograph has been one of the worst software experiences I've had » et « Invoices are
  unreliable, previously issued invoices will randomly change without explanation » (Trustpilot,
  2026-02, https://www.trustpilot.com/reviews/697fb5e0a46c4a5cae7ea061) ; « Invoices show up as paid
  that are not paid » (BigTime, Trustpilot, 2026-03) ; « What once cost us $99/month for a team of 10
  is now more than $700/month » (Harvest, Trustpilot, 2026-09, https://www.trustpilot.com/reviews/6abbb5cdf05d39e287115186).
- Le piège de l'utilisation : « staff pressured to achieve high utilization can figure out ways to
  be highly utilized on a time card while not necessarily doing what is in the best interest »
  (PSMJ, https://go.psmj.com/blog/rethink-is-utilization-the-best-way-to-profitability).

Contournement : feuilles de temps de mémoire, Excel pour le WIP, relances manuelles, QuickBooks +
Harvest ou Toggl, ou maintien d'un outil détesté parce que migrer coûte des mois.

Justification des notes : fréquence 5 (91 items, tous les rapports) ; intensité 5 (revenu perdu
chiffré, DSO, stress) ; insatisfaction 4 (des outils existent et sont installés partout, mais les
avis 1 à 3 étoiles sont les plus nombreux du corpus) ; disposition à payer 5 (Deltek, BQE,
Monograph, Harvest, QuickBooks sont déjà payés, et les plaintes de prix prouvent des budgets).

### P2. Le suivi de chantier se fait dans l'outil de l'entrepreneur (17/20)

Étapes 11 et 12. Segments : tous ; le petit cabinet ne peut rien acheter, le moyen paie Newforma
ou Part3 pour garder son dossier.

Ce que disent les sources :
- « It wasn't my decision to use Procore » et « He who writes the minutes writes the history of
  the project » (Archinect, 2018, https://archinect.com/forum/thread/150045798/architect-responsible-for-updating-contractor-management-program).
- « 75% of the time the contractor has their own system and occasionally a large owner will have
  their own system » (4specs, 2015, https://forum.4specs.com/t/digital-ca-procedures/2808).
- « we don't rely on it for the official record of submittals or RFIs » ; « I cannot afford
  specialty programs that large firms can amortize over larger and greater numbers of projects » ;
  « The bigger issue is that we are all doing it differently » ; « With Procore, the information lives
  on the cloud and is only accessible to people with logins » ; Newforma « Too big, too clunky, and too
  expensive for our needs » (AIA Community Hub, mai 2025, https://communityhub.aia.org/discussion/submittal-management-tools
  et https://communityhub.aia.org/discussion/submittal-management-tools-1).
- « Digital submittals, in general, have made contractors lazy. When they had to print everything,
  they only picked the relevant information » et « I do hate the email notification for every item »
  (Archinect, 2019, https://archinect.com/forum/thread/150135996/construction-administration-has-the-procoring-of-ca-fucked-ca-for-architects) ;
  « Recently I've been encountering GC's submitting individual items separately. Their reasoning is
  that it's easier to do in Procore » (Archinect, 2024, https://archinect.com/forum/thread/150441560/submittal-packages) ;
  « it kills me how much we bend over for the contractor to the detriment of our fee and sanity
  during CA » (même fil).
- « The constriction administration log is something that you'll need to make yourself regardless
  if you use BB or not » (Archinect, 2026-11, https://archinect.com/forum/thread/150573204/how-does-your-firm-split-and-name-drawing-sets-for-e-permit-submittals).
- « CMs and GCs are now overloading them with submittal schedules generated by AI that are
  disorganized and inaccurate » (4specs, 2023-12, https://forum.4specs.com/t/document-control-software/4025).
- Risque : gravité moyenne des sinistres +62 % entre 2006-2015 et 2016-2025 (AIA Trust / CNA,
  https://theaiatrust.com/the-cost-of-risk-has-changed-what-architects-should-know/).

Contournement : log Excel parallèle, dossiers email, Bluebeam pour tamponner, formulaires maison ;
un cabinet a codé son propre outil (ArchiTrac, AIA Hub 2025).

Justification : fréquence 5 (33 items étape 11, trois forums différents sur dix ans) ; intensité 4
(honoraires grignotés, responsabilité, « sanity ») ; insatisfaction 5 (les outils existent pour
l'entrepreneur, pas pour le cabinet ; Part3 reste jeune et cher) ; disposition à payer 3 (le petit
cabinet dit explicitement qu'il ne peut pas payer, le moyen paie déjà Newforma ou Procore sans le
vouloir).

### P3. Coût et politique de licences des éditeurs dominants (17/20)

Étape 0. Segments : tous, les petits sont les plus touchés en proportion.

Ce que disent les sources :
- Autodesk : « Have seen a 70%+ increase in cost of ownership of Revit licences up to the end of
  2019 (with more coming) » (lettre ouverte, https://aecmag.com/bim/letter-to-autodesk-aec-customers-demand-better-value/) ;
  « We have examples of Autodesk hiking up prices by 30% annually with only a few months warning »
  (lettre nordique, 2022, http://aecmag.s3.amazonaws.com/Nordic-Letter-aecmag.com.pdf) ; « several
  Open Letter signatories have been audited, with no compliance issues found but requiring substantial
  non-productive effort » (https://aecmag.com/bim/the-open-letter-two-years-on/) ; « Year on year price
  increases for zero innovation » (Trustpilot, 2023-04) ; « rather than be charged 17k for more seats
  that I need, I turned off the auto renew » (Trustpilot, 2022-09) ; « Revit costs about $3k per year
  to have a subscription. That's not counting the cost of the computer system to run it » (Archinect,
  2024-08, https://archinect.com/forum/thread/150440845/software-selection#arc_comment_1148051).
- Contagion : Bluebeam, « the $330/user subscription truly an insult » (community.bluebeam.com,
  https://community.bluebeam.com/discussion/363/give-revu-21-to-revu-20-owners-with-maintence-for-the-same-price-as-they-have-been-paying) ;
  SketchUp, « Pro is going up from $237 a year to $346 a year! » (forums.sketchup.com, 2023-06) ;
  Chaos, « This adds up to over €5000 every year just to keep the base going » (forums.chaos.com,
  2025-05) ; Chief Architect, « I can no longer afford to pay over $2,000 a year for a subscription
  service » (chieftalk, 2026-02, https://chieftalk.chiefarchitect.com/topic/48252-subscription-service/) ;
  Rhino, hausse d'environ 75 % des upgrades perpétuelles (discourse.mcneel.com, 2022-07) ; SoftPlan
  et Vectorworks ont supprimé les licences perpétuelles ; Twinmotion payant à 1 M$ de CA ; Lumion
  Standard supprimé.

Contournement : rester sur d'anciennes versions, Revit LT, Archicad ou Vectorworks (moins cher
mais base US étroite), licences partagées, piratage (cité comme concurrence déloyale), ou subir.

Justification : fréquence 5 ; intensité 4 ; insatisfaction 5 (aucun contre-pouvoir réel, Revit
reste le standard de fait) ; disposition à payer 3 (les cabinets veulent payer moins ; ils paient
pourtant Archicad à 2 414 $/an ou Vectorworks à 1 530 $/an pour sortir d'Autodesk, ce qui prouve
un budget de substitution).

### P4. Coordination des consultants et échange de modèles (17/20)

Étapes 15, 16. Segments : tous ; critique pour les cabinets qui travaillent avec des consultants
hors Autodesk.

Ce que disent les sources :
- « about $925/year » pour BIM Collaborate Pro par utilisateur en plus de Revit (r/Revit, 2025-01,
  https://www.reddit.com/r/Revit/comments/1i3j7ql/switching_from_onedrive_to_acc/) ; licence ACC
  nécessaire pour recevoir un RFI (https://cogram.com/blog/evaluating-newforma-alternatives).
- Consultants sans abonnement : « architecture staff is using Collaborate Pro, but consultants such
  as Civil and Mechanical are not using BIM 360 » (groups.google.com, via extrait) ; fil Autodesk
  « Share cloud model with consultant not using BIM 360 Design »
  (https://forums.autodesk.com/t5/bim-360-support-forum/share-cloud-model-with-consultant-not-using-bim-360-design/m-p/9330084).
- Lenteur : « BIM 360 model open & sync slow even without linked models »
  (https://forums.autodesk.com/t5/revit-architecture-forum/bim-360-model-open-amp-sync-slow-even-without-linked-models/m-p/13003443).
- Hors Revit : « It lacks third-party integrations because there aren't a lot of users in the
  United States » (Archicad, FinancesOnline, 2021) ; « It's difficult to share projects and there
  are bugs in the system » (Vectorworks, 2021) ; « I will have to remodel everything in Revit and
  just be using the Sketchup Model as a guide » (Archinect, 2023, https://archinect.com/forum/thread/150404174/sketchup-to-revit-workflow) ;
  « Man if I can just use Sketchup importer then I save myself the $500 easily » (forums.sketchup.com, 2023).
- Humain : « making consultant coordination nearly impossible to achieve, creating burnout for all
  employees » (Archinect, 2024, https://archinect.com/forum/thread/150440134/trend-of-unrealistic-timelines-from-clients) ;
  « I've seen too many bottom barrel MEP Engineers use Revit as a 2D drafting tool »
  (https://archinect.com/forum/thread/150205703/quality-assurance-of-drawings).

Contournement : OneDrive ou Dropbox (inadaptés au worksharing), transferts de fichiers, Egnyte ou
NAS cloud (Panzura, Nasuni) pour les plus grands, Speckle pour les équipes techniques.

Justification : fréquence 5 ; intensité 4 (coût direct, retards, erreurs de coordonnées) ;
insatisfaction 4 (ACC fonctionne mais cher et fermé ; Speckle change de modèle en 2026) ;
disposition à payer 4 (ACC, Egnyte, Newforma, Revizto sont payés).

### P5. Gestion de projet interne : décisions perdues, outils génériques inadaptés (17/20)

Étape 15. Segments : petits et moyens surtout ; grands cabinets via chefs de projet « déconnectés ».

Ce que disent les sources (fil Archinect 2026, 30 réponses, https://archinect.com/forum/thread/150543762/is-there-a-project-management-tool-that-actually-works-for-architecture-firms) :
- « I just spent two hours on a set of drawings that had already been revised in a conversation I
  wasn't part of » ; « one of the most exhausting parts of my day has nothing to do with design. It's
  just trying to figure out who is working on what, what has changed » ; « littered across a Word doc,
  Excel sheet, emails, or people's memories ».
- « Generic tools like Asana, Monday, or Teams often require too much forced customization to map to
  how our projects actually run » ; « Monograph, Asana, Monday, Notion, Microsoft Teams, but none of
  them really meet the needs of the office in developing a project » ; « project management tools are
  usually too complex and generic to be truly useful, especially for small and mid firms ».
- Résistance : « you don't need more nanny softwares, you just need more competent team members who
  can schedule and communicate » ; et la réponse par l'outil maison : « Just give Claude a screenshot
  of what you want, how you want it to work and have it build it for you ».
- Chiffres : « Nearly 60% of firms say projects were delivered ahead or on schedule » (Deltek,
  https://info.deltek.com/Clarity-AE, [déclaratif]) ; « most firms aren't sure or don't track if
  their projects are on time or on budget » (Monograph 2021, 89 cabinets, [déclaratif]) ; « one of
  the top initiatives was to get project managers better educated on financial metrics » (Deltek
  recap, 2026-11).

Contournement : Excel et Google Sheets (« solid when someone knows how to set it up well »),
Microsoft Planner, réunions et email, Notion, outils codés par IA.

Justification : fréquence 5 ; intensité 4 ; insatisfaction 5 (aucun outil cité ne convient, y
compris Monograph) ; disposition à payer 3 (les cabinets essaient tout, mais le réflexe « nanny
software » et le retour à Excel limitent le budget).

### P6. Honoraires sous pression, dérive de périmètre, impayés (16/20)

Étapes 1, 13. Segments : solos et petits, résidentiel.

Ce que disent les sources :
- « 80% of AEC firms remain trapped in a price war » (PSMJ, 2025-12) ; « some firms are raising
  rates on paper while still conceding margins in practice » (Zweig 2026).
- « this is the second project I lost out on this month to a lower bidder » et « I am literally
  embarassed to provide a realistic fee for what we should charge so typically say no to the project »
  (Archinect, 2022, https://archinect.com/forum/thread/150304570/reasonable-architect-s-fee-for-a-small-coffee-shop) ;
  « It is obscene what people think our fees should be » (Archinect, 2026-08).
- « Cost per sqm or sqft is basically percentage of construction cost in a different costume »
  (r/Architects, 2025-02) ; « if a client gets too far off the rails I'll tell them we are going
  hourly » (r/Architects, 2026-04, via instantané).
- Impayés : « His rationale for not paying is that since he can't afford to build the project, the
  drawings are useless to him » et « Lots shady owners know that they can pocket free money by
  stiffing people on smaller invoices » (Archinect, 2024-10, https://archinect.com/forum/thread/150451456/client-refusing-to-pay).
- « 96% of respondents said scope creep created unplanned work in the last 12 months »
  (discourse.mcneel.com relayant une enquête, https://discourse.mcneel.com/t/96-of-architects-experienced-scope-creep-last-year-thoughts/216507, [déclaratif]).

Contournement : facturation horaire pour être payé au fil de l'eau, clauses contractuelles
maison, acompte relevé, email comme journal de décisions, refus de projets.

Justification : fréquence 5 ; intensité 5 ; insatisfaction 4 (outils de proposition et contrats
existent, aucun ne traite le suivi de la dérive en temps réel) ; disposition à payer 2 (c'est un
problème de marché plus que d'outil ; AIA Contract Documents à 2 199 $/an est le seul budget avéré).

### P7. Spécifications : monopole lourd d'un côté, Word recyclé de l'autre (16/20)

Étape 7. Segments : tous ; les moyens et grands subissent Specpoint, les petits n'ont rien.

Ce que disent les sources :
- Specpoint : « I don't know anyone who uses SpecPoint effectively » et « they export the sections
  out from Deltek SpecPoint, to Word to edit them » (4specs, 2026-08, https://forum.4specs.com/t/spec-writing-platforms/4263) ;
  « what they have out of the box frankly sucks; you have to completely reconfigure it to suit your
  company's Revit system » (4specs, 2022-04) ; « They told me it is still a hot mess otherwise »
  (4specs, 2026-06) ; devis « plus de 5x ce que nous payons pour MasterSpec » (eng-tips) ; retrait
  de SpecBuilder Cloud fin 2025 (FAQ Deltek).
- SpecLink : « SpecLink is the same, no backend support, OOB specs suck donkeys » (Archinect, 2026-09).
- Petits cabinets : « small firm architects often say they don't have time for specs or that the big
  software packages are too complicated and expensive » (EntreArchitect) ; « we have typically been
  editing the E-Spec for project types, and then re-using that spec for new projects » (4specs,
  2022) ; « If I were to issue a commercial-style spec manual of 450+ A4 size pages, I would likely
  scare potential residential contractors away » (Life of an Architect).
- Qualité : « there is a HIGH probability of there being a conflict between the Drawings and the
  Specifications » (4specs, 2023-12) ; les outils IA de revue « flag a lot of issues, some, perhaps
  many, are false positives » (4specs, 2026-10).

Contournement : Word et specs de projets précédents, MasterSpec Small Project, spécifieur
indépendant, specs sur plans (sheet specs) en résidentiel.

Justification : fréquence 4 ; intensité 4 (responsabilité, conflits plans/specs) ; insatisfaction 5
(le monopole Deltek est détesté, rien pour les petits) ; disposition à payer 3 (Specpoint est payé
cher par les moyens et grands ; les petits ne paient rien).

### P8. Permis et conformité (16/20)

Étape 6. Segments : tous, douleur maximale en résidentiel et petit commercial (volume de permis).

Ce que disent les sources :
- « Many city e-permit portals want every sheet uploaded as its own PDF with the sheet number and
  title in the file name » et « If your office can't afford $500 a year on a BB license then you're
  going to have to change names by hand » (Archinect, 2026-11, https://archinect.com/forum/thread/150573204/how-does-your-firm-split-and-name-drawing-sets-for-e-permit-submittals).
- « each set of comments adds another 12-16 weeks of review time » (r/Architects, 2026-04, via
  instantané) ; « several jurisdictions are requiring a signed contract before they'll even allow the
  submittal of a permit » et « the community development department keeps adding to the rules and
  requirements every 6 months » (Archinect, 2026, https://archinect.com/forum/thread/150562146/jurisdictions-requiring-circular-submittal-req-s) ;
  « wasted too much of my design career on permitting » (même fil).
- Fiabilité des outils de code : « we found at least 2 discrepancies between it and the actual code
  reference » (UpCodes, Archinect, 2024-04, https://archinect.com/forum/thread/150424370/upcodes#arc_comment_1143993) ;
  ChatGPT « usually just sends me on a tangent that I have to correct » (Archinect, 2024-09) ;
  COMcheck sans catégorie pour les rives de dalle (Archinect, 2026-08).
- Résidentiel : « Residential clients do this as often as they jaywalk. Their contractors do too.
  Codes, ha, not in THIS kingdom » (Archinect, 2024-02).

Contournement : expéditeur de permis, renommage manuel, Bluebeam pour découper, resoumissions,
cycles isolés dans l'arborescence projet.

Justification : fréquence 4 ; intensité 5 (mois de délai, carrière « gaspillée ») ; insatisfaction 4
(UpCodes aide la recherche mais pas le dépôt ; PermitFlow et Symbium ciblent d'abord les villes ou
les gros volumes) ; disposition à payer 3 (UpCodes 39 à 68 $/mois est payé ; les expéditeurs sont payés).

### P9. IA : adoptée sans bénéfice ni formation (16/20)

Étapes 0, 5, 9. Segments : tous, écart énorme par taille.

Ce que disent les sources :
- « At firms that are currently using AI, slightly more than one in five (22%) report that it has
  substantially increased their firm's productivity » (ABI août 2026) ; « Just 7% of responding firms
  overall have a formal AI training program » (idem) ; « Only 6% of firms have fully embedded AI into
  operations » (Zweig 2026) ; « Not a single survey respondent who uses AI less than daily reports
  transformational productivity gains » (EMI 2026, [déclaratif]) ; « leadership is holding them back
  and nobody is providing training » (Zweig Letter, 2026-07).
- « AI isn't currently capable of doing a decent job in REVIT » et « you'll still spend a much time
  guiding the AI as you would a fresh intern » (Archinect, 2026-11, https://archinect.com/forum/thread/150572729/ai-enabled-revit-modeling) ;
  « AI produces a set of details in record time, 30 sheets, do you stamp it? » (Archinect, 2026-10).
- Pression client : « clients are starting to expect deliverables on an AI schedule, rather than a
  design schedule » et « It's putting pressure on architects to 1) produce "free" concept renderings »
  (Archinect, 2026-08, https://archinect.com/forum/thread/150556328/when-will-ai-become-more-viable).
- « AI-generated outputs require rigorous verification and professional review » (ACEC, 2026-08) ;
  crainte de vol de conceptions (enquête Archinect, 2026-11).

Contournement : ChatGPT et Copilot pour les textes (« presque tous » les grands cabinets, AIA
Aspire 2024), usage individuel sans politique, abstention.

Justification : fréquence 5 ; intensité 3 (argent investi sans retour, risque) ; insatisfaction 4
(les outils métier n'ont pas convaincu) ; disposition à payer 4 (79 % prévoient d'investir, deux
tiers d'augmenter le budget).

### P10. Documents de construction : productivité, automatisation promise, Revit LT bridé (16/20)

Étape 5. Segments : tous.

Ce que disent les sources :
- « archicad demands a shitton of time to produce quality docs » (Archinect, 2024-08) ; « Then open
  Layout and be prepared to go back to dial-up speeds » et « SketchUp is heavily marketed as a BIM
  competitor and Layout is the single biggest problem in making that so » (forums.sketchup.com, 2021) ;
  « Revit can still be improved by having the 2D drawing tools that AutoCAD has » (FinancesOnline, 2021) ;
  « It's a bit challenging to do architectural details in this platform » (Chief Architect, 2021).
- « Revit LT will work for residential and small commercial (I started with it), but it does not
  allow plug-ins » (Archinect, 2024-12) ; « We use LT syncing over Dropbox but are very disciplined
  about never working on the same file » (r/Revit, 2023).
- Automatisation : SWAPP, ArchiLabs, Glyph vendent l'automatisation des annotations et feuilles ;
  Autodesk annonce des agents Forma « sans date » (notes CAD/BIM) ; « my comments in Bluebeam Studio
  Markup sessions are placed so low on the priority scale as to effectively be ignored » (4specs, 2023).

Contournement : heures supplémentaires, templates maison, pyRevit et Dynamo (gratuits), Glyph
(600 $/an), stagiaires.

Justification : fréquence 4 ; intensité 4 (la CD est la phase la plus consommatrice d'heures) ;
insatisfaction 4 ; disposition à payer 4 (plugins payés, SWAPP vendu par projet à de grands cabinets).

### P11. Fragmentation de la stack et double saisie (16/20)

Étapes 0, 13, 15. Segments : tous.

Ce que disent les sources :
- « Cormac spent twelve hours trying to send one email. Evan has seventeen apps open at all times »
  (Archispeak, 2026-03, https://archispeakpodcast.com/episodes/385).
- « everything seems to do one thing really well » (Archinect, https://archinect.com/forum/thread/150198677/project-management-and-project-financial-software/0) ;
  « The finance module is not integrated with third party accounting softwares due to which the data
  has be entered manually » (BigTime, SourceForge) ; « Core sends out one separate invoice per phase
  to QBO rather than one invoice that includes all phases » (BQE, Slashdot) ; « Hundreds of incorrect
  customers started appearing in QBTime » (Trustpilot, 2022).
- « Data lives in silos: one worksheet for scheduling, another for timesheets, a third for fees »
  (Monograph, [déclaratif]) ; « This makes it harder to justify licensing multiple software packages »
  (4specs, 2026-07).

Contournement : Excel comme colle, ressaisie, un employé « intégrateur » informel, QuickBooks
comme pivot.

Justification : fréquence 5 ; intensité 4 ; insatisfaction 4 ; disposition à payer 3 (les suites
« tout-en-un » existent et sont rejetées pour leur lourdeur, ce qui plafonne le budget).

### P12. Petits cabinets exclus par les prix par siège et les contrats au volume (16/20)

Étapes 0, 11. Segments : solos et petits (75 % des cabinets).

Ce que disent les sources :
- « I cannot afford specialty programs that large firms can amortize » ; logiciels de punch list
  jugés « exorbitant » pour 1 à 3 punch lists par an (AIA Hub, 2025).
- Part3 : 150 à 200 $/utilisateur/mois ou « dès 9 000 $/an » (part3.io) ; Fieldwire : RFIs et
  submittals réservés à 89 $/utilisateur/mois ; Procore, OpenSpace, Revizto : au volume ou sur devis
  (notes chantier et collaboration) ; HubSpot « goes from $12 a month and the next lowest plan is
  $800 a month! » (Trustpilot, 2026-09) ; « The pricing structure can be a bit steep for small
  businesses or freelancers » (BigTime, SourceForge).
- « As a small business every € counts, so anything that costs more is negative per se »
  (forums.sketchup.com, 2025) ; « I came to Monograph and asked, is this something that costs as much
  as a person's salary? » (AMB Architects, [déclaratif]).
- « Some of these systems are expensive and can charge fees for each project on the system »
  (4specs, 2014, Submittal Exchange).

Contournement : Excel, outils gratuits (Fieldwire Basic, HubSpot Free, Twinmotion), licences
partagées, abstention.

Justification : fréquence 4 ; intensité 4 ; insatisfaction 5 (segment délaissé par les éditeurs
dédiés) ; disposition à payer 3 (budgets réels mais plafonnés : 45 $/mois Monograph, 399 $/an
SketchUp, 260 $/an Bluebeam Basics donnent l'ordre de grandeur accepté).

### P13. Facturation par phase, forfaits et avancement mal gérés par les généralistes (15/20)

Étape 13. Segments : solos et petits qui vivent sur QuickBooks + Harvest ou Toggl.

Ce que disent les sources :
- QuickBooks pour le job costing : « pour un vrai reporting des coûts par projet il faut faire la
  paie dans QB » (Archinect, 2018, https://archinect.com/forum/thread/150087216/accounting-software-recommendations) ;
  « My business is based on projects and if I cannot see my projects quickly on my phone » (App Store
  QuickBooks, 2026-11) ; « I didn't like how I couldn't customize the invoices » (SourceForge).
- Harvest : « Harvest is for time tracking and invoicing but it lacked the ability to plan and manage
  resources » ([déclaratif] Monograph) ; « There doesn't seem to be a way to review all expenses, time,
  and tasks by project in the app » (App Store, 2025-03) ; « you can't even export an invoice as PDF
  anymore without either a paid account or connecting Stripe » (Trustpilot, 2026-05).
- Toggl : « Lacks basic functionality for a freelancer like me », impossible de « marquer les
  entrées de temps déjà facturées » (Trustpilot, 2024-02).
- Mavenlink « ne gérait pas les forfaits » (Archinect, fil 150198677).

Contournement : Excel pour le pourcentage d'avancement par phase, factures AIA G702/G703 faites à
la main ou dans BQE.

Justification : fréquence 4 ; intensité 4 ; insatisfaction 4 ; disposition à payer 3.

### P14. Planification de la charge et des ressources à la main (15/20)

Étape 14. Segments : tous.

Ce que disent les sources :
- « Resource management lands second on AE firms' list of biggest project-management challenges,
  right behind forecasting » (Unanet via PSMJ, [déclaratif]).
- « is there a best practice of "when staff utilization exceeds XX%, you should consider hiring"? »
  et « The forecast is in tiers: 1) Real work 2) Possible stuff » (Archinect, 2024-08,
  https://archinect.com/forum/thread/150444037/when-to-hire-more-employees).
- « Management has no clue what the skills and abilities are of the staff that are assigned to the
  project » (Archinect, 2024-08) ; « The facts in the system weren't real » (Woodhull via Monograph,
  [déclaratif]) ; « as we keep adding new information excel is getting a little cumbersome »
  (Archinect, 2022, https://archinect.com/forum/thread/150316894/pm-software) ; « Filtering on our
  forecasting reports need to be flexible » (BQE, Slashdot, 2021).
- « New update took away my ability to see my schedule for the week » (Float, App Store, 2020).

Contournement : tableur partagé, jugement du principal, embauche tardive.

Justification : fréquence 4 ; intensité 4 (burnout et retards) ; insatisfaction 4 (Float, Mosaic,
Monograph le proposent, mais la donnée n'est pas tenue à jour) ; disposition à payer 3.

### P15. Savoir interne enfoui dans des fichiers (15/20)

Étapes 18, 16. Segments : moyens et grands surtout.

Ce que disent les sources :
- « The biggest challenge seems to be finding the right detail as the library grows » (Archinect,
  2026-11, https://archinect.com/forum/thread/150572713/organizing-revit-detail-library).
- « Multiple documents claiming to be the current version of the same procedure » (Zweig Letter,
  2026-09) ; « Most firms don't have 40 years of data. They have 40 years of files » (AIA AI Firm
  Toolkit) ; « Poor documentation costs AEC firms millions annually in repeated mistakes and knowledge
  loss » (PSMJ, [déclaratif]).
- « it requires us to add meta data label on every one of our standard details » pour que l'IA
  puisse les réutiliser (Archinect, 2026-07) ; standards de dessin dans un « style book » PDF sur
  intranet fermé (r/Architects, 2025-04).

Contournement : mémoire des anciens, réorganisation manuelle des arborescences, Notion ou
SharePoint sans structure.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 5 (zone blanche : aucun outil courant ne
dit quelle est la version en vigueur d'un détail ou d'une procédure) ; disposition à payer 3
(budgets IA en hausse, mais pas de ligne « KM »).

### P16. Recrutement, rétention, licence et épuisement (15/20)

Étape 19. Segments : tous.

Ce que disent les sources : « 80% of firms cite availability of good candidates as a top challenge »
(Deltek, [déclaratif]) ; « The average time to fill a position is 54 days, increasing to 128 days
for the most critical positions » (Zweig 2026) ; « They lost 7 employees in about 2 years (about half
their workforce), resulting in over 100k in turnover costs » (Archinect, 2024-08) ; « I tried for
years to hire architects and drafters but they all wanted to be subcontractors » (Archinect,
2024-03) ; « Typically, 36-38% of candidates stop pursuing licensure over a 10-year period » et « 1 in
5 fell off the path while working to complete the AXP » (NCARB 2025) ; « the lack of reward for this
added weight is ultimately what drove me to a different firm with a 20k salary bump » (r/Architects,
2026, via instantané) ; « That causes principals that are chasing the work to agree to deadlines that
aren't suitable to the practice of architecture and actively burn out project teams » (AIA Architect,
2022).

Contournement : HRIS et ATS généralistes (71 % selon Zweig), job boards payants (Archinect
« Wider & Prolonged »), rémunération au cas par cas.

Justification : fréquence 5 ; intensité 4 ; insatisfaction 3 (outils RH généralistes corrects) ;
disposition à payer 3 (budgets RH en hausse, mais rien de spécifique au suivi AXP ou à la charge).

### P17. Applications mobiles des suites A&E inutilisables (15/20)

Étape 13. Segments : tous les clients de Deltek, BQE, Unanet.

Ce que disent les sources (App Store US, flux RSS officiel) : « It takes me multiple hours to submit
my time card for less than two weeks worth of work » (BQE CORE, 2021) ; « When I create entries on
the web, they often do not show on the app or show incorrectly » (BQE, 2022) ; « It was slow, glitchy
and cumbersome a year ago and has gotten significantly worse » (Ajera, 2018) ; « Constant server
issues. Receipt scan won't work whatsoever » (Ajera, 2026-04) ; « On average it takes 15-20 minutes to
do a time sheet for a week » (Vantagepoint, 2024) ; « why is there still no timesheet and expense line
item approvals? » (Vantagepoint, 2026-09) ; « now you cannot even open a timesheet or an expense sheet »
(Unanet AE, 2023) ; « it displays horribly and does not allw you to actually navigate time sheets or
enter time » (Deltek site mobile, Trustpilot, 2026-09).

Contournement : saisie de mémoire au bureau le lundi, photos de reçus envoyées par email.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 5 (les apps existent et sont notées
1 étoile) ; disposition à payer 3 (incluses dans des suites déjà payées).

### P18. Performance et stabilité des outils BIM et CAD (14/20)

Étapes 3 à 5. Segments : tous.

Ce que disent les sources : « Every action in revit results to an "Autodesk revit is not responding" »
(Trustpilot, 2025-08) ; « Revit constantly crashes on me wasting so much time » (2023) ; « Revit can
slow down with large, complex models or projects, particularly in multi-user environments »
(SoftwareSuggest, 2024) ; « We have lost 3 days work » (2024) ; « Moving things around on layout (set
to update on demand only) takes 10-15 seconds each » (Chief Architect sur M3 Max, 2024) ; Vectorworks
« stability issues » (G2 via extrait) ; « Enscape Asset Library crashes Revit and unsaved work is
lost » (forums.chaos.com, 2021) ; « VisualArq which only works on Windows, and which disappointed me
with its bugs and its slowness » (McNeel, 2020).

Contournement : stations plus puissantes, découpage des modèles, sauvegardes compulsives.

Justification : fréquence 5 ; intensité 4 ; insatisfaction 3 (pas d'alternative crédible au
standard) ; disposition à payer 2 (on paie déjà le maximum).

### P19. CRM et marketing pour petits cabinets (14/20)

Étape 17. Segments : solos et petits.

Ce que disent les sources : HubSpot « quite complicated with too many features for my needs »,
Pipedrive « pricing too high » (AIA Hub, 2024, https://communityhub.aia.org/discussion/crm-for-architectural-firms) ;
« we were forced to hire an expensive external partner just to handle the basic system setup »
(HubSpot, Trustpilot, 2026-10) ; « Marketing is done the 'old' way with partners knowing people,
public events, spreadsheets » (Archinect, 2024) ; « my phone just isn't ringing with real projects »
(Archinect, 2025-07) ; « project managers account for 59% of total business development effort »
(Zweig 2026) ; Houzz : leads taris sans Houzz Pro, « most leads were small remodels » (AIA Hub) ;
Unanet CRM « hard to use » (G2 via extrait) ; « Weak OCR, requires a lot of manual input » (Deltek
CRM app, 2025).

Contournement : Excel, Google Sheets, Less Annoying CRM, Monday, mémoire des associés.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 4 ; disposition à payer 3 (HubSpot Free,
puis rien ; OpenAsset et Unanet chez les 50+).

### P20. Annotation et revue sur le chantier : les apps mobiles régressent (14/20)

Étape 11. Segments : tous.

Ce que disent les sources (App Store US) : « Since Jan 1 Bluebeam has closed Bluebeam Revu and forced
Bluebeam Cloud which has fewer tools, worse interface » (2026-09) ; « Have to go paper to field. As I
have no way to take any notes with this application » (Bluebeam, 2026-07) ; « I (Arch) just used
BIM360 for iPad on a punch walk, and man, that was the slowing and most awkward punch ever » (2021) ;
« Sometimes it syncs, sometimes not. Zero visibility into a solution from the "help" menu. Just use
Bluebeam » (BIM 360, 2022) ; « When I letter free hand, it interprets this as tapping and zooms in and
out » (Autodesk Build, 2026-02) ; « you try to create a simple RFI and the app crashes » (Procore,
2026-07) ; ArchiSnapper « lack of arrows, callouts, bubbles, colors » (Capterra via extrait) ;
Revizto « I can only view my drawings in portrait orientation » (2026-02).

Contournement : papier et photos, Bluebeam sur PC portable, GoodNotes ou Procreate.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 4 ; disposition à payer 3.

### P21. Rupture entre esquisse et BIM (14/20)

Étapes 3 à 5. Segments : petits cabinets, résidentiel.

Ce que disent les sources : « I will have to remodel everything in Revit and just be using the
Sketchup Model as a guide » (Archinect, 2023) ; « Revit doesn't downscale very smoothly » (Archinect,
2021) ; Revit « overkill » pour les petites rénovations (Archinect, 2020) ; « After using Revit I
found Sketch Up shockingly under advanced and ETREMELY TIME CONSUMING » (Trustpilot, 2024) ; « I've
been on AutocadLT/Sketchup for 22 years, and in analysis paralysis about getting on the BIM train »
(Archinect, 2024-08) ; « The 3D section is very poor » (AutoCAD, 2021) ; « Progress can be stunted
because of Archicad's lack of ability to lock down items » (2019).

Contournement : double modélisation, AutoCAD LT + SketchUp à vie, Revit LT.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 4 (Snaptrude, Arcol, Rayon visent ce
trou, sans adoption démontrée) ; disposition à payer 3.

### P22. Rendu temps réel : licences et offres gratuites qui disparaissent (13/20)

Étape 9. Segments : tous.

Ce que disent les sources : « Instead of 10 floating seats we would need roughly 45? » et « this
will end up pushing us over the hill in to using twinmotion » (forums.chaos.com, 2024-07) ; « I
adamantly disagree that a monthly price should be 43% MORE expensive » (2021) ; « raising our annual
cost over $100 while still not delivering on the same features as PC » (Enscape Mac, 2023) ; « Be
very careful with this company's billing practices » (Chaos, Trustpilot, 2026-04) ; « Do we have to
buy it full price now?? » (Twinmotion, forums.unrealengine.com, 2024) ; « However, as a Mac user, it's
frustrating not being able to access it » (D5, 2025) ; « clients now want enscape for everything »
(Archinect, 2025).

Contournement : Twinmotion gratuit sous 1 M$, D5 Community, Blender, Archicad AI Visualizer.

Justification : fréquence 4 ; intensité 3 ; insatisfaction 3 (marché concurrentiel, outils bons) ;
disposition à payer 3.

### P23. Estimation des coûts en conception (13/20)

Étape 8. Segments : petits et moyens.

Ce que disent les sources : « even modest cost increases can cause projects to stall » (ARCHITECT,
2026-05) ; litige sur le budget, « in three different places in my contract I added language that
says I can't design to a specific budget » (Archinect, 2024-10) ; Kreo « it can automeasure but then
you are left figuring out formulas » (Trustpilot, 2023) ; RSMeans 408 à 5 973 $/an, outils de métré
orientés entrepreneurs (notes conformité). Peu d'items : les architectes externalisent ou évitent.

Contournement : ratios au pied carré, estimateur externe, entrepreneur consulté tôt, silence.

Justification : fréquence 3 ; intensité 4 (litiges, projets morts) ; insatisfaction 4 ; disposition
à payer 2.

### P24. Cybersécurité et sinistres (13/20)

Étapes 16, 11. « average claim severity increased approximately 62% » (AIA Trust / CNA, 2026-10) ;
93 % des cabinets ont subi une tentative d'attaque, 1 sur 5 une attaque réussie (Deltek, [déclaratif]) ;
« It took a further 3 days for Autodesk to resolve this problem » (licence bloquée, Trustpilot, 2024).
Contournement : assurance, revue humaine, IT externalisée. F3 I4 Ins3 Pay3.

### P25. Gestion du contenu Revit (12/20)

Étape 18. Autodesk Content Catalog (ex UNIFI) gratuit mais « sans contenu fabricants, API ni
analytics » (https://aecmag.com/data-management/autodesk-content-catalog/) ; question de prix par
siège sans réponse sur AUGI dès 2018 (https://forums.augi.com/archive/index.php/t-172763.html) ;
AVAIL 250 $/an, Kinship 10 à 14 $/siège/mois ; familles de fabricants hétérogènes (BIMobject, ARCAT).
Contournement : dossier réseau, « Revit content manager » informel. F3 I3 Ins3 Pay3.

### P26. Support client des grands éditeurs (12/20)

Étape 0. « they do not have a call center » (Autodesk, Trustpilot, 2026-07) ; « Autodesk support is
absolutely atrocious, spending a couple hundred grand a year to get ignored » (2023) ; « Company
ghosted me for over a year » (Bluebeam, 2026-03) ; « During every call I made to the tech support
(...) I was routed to paid classes » (ArchiOffice, Archinect, 2024) ; « Poor Support, Outdated
Systems, and Endless Delays » (Deltek, 2025-10) ; « they have had an authentication issue with gmail
going on 4 months » (BQE, 2024-12). Contournement : forums d'utilisateurs, revendeurs. F4 I3 Ins4 Pay1.

### P27. Le dirigeant de petit cabinet comme amortisseur financier (11/20)

Étapes 0, 13. « Together, these firms account for 74 percent of all architectural businesses »
(ARCHITECT, 2026-02, sur la baisse de la paie des dirigeants) ; carnet de 3,8 mois chez les < 250 k$
(ABI sept. 2026) ; « I can't afford the subscription right now because my drawing time is more
limited » (Chief Architect, 2026-06). Contournement : sacrifice personnel. F3 I4 Ins3 Pay1.

### P28. Relevé de l'existant (11/20)

Étapes 2, 3. Polycam : plans et mesures réservés au Business, « le Pro ne sert pas à grand-chose »,
essai facturé 400 $ (App Store, 2025) ; magicplan « encore un peu dépouillé » (2022) ; Twindo
0,14 à 0,44 $/pi² par conversion (notes résidentiel). Contournement : mètre laser et croquis.
F3 I2 Ins3 Pay3.

### P29. Clôture et archivage (11/20)

Étape 12. « When trying to migrate to files to other places they deliberately make it hard for you »
(Egnyte, Trustpilot, 2026-05) ; « They have 40 years of files » (AIA AI Firm Toolkit) ; « We have had
to be very rigorous about sequestering different resubmission cycles in the project folder »
(Archinect, 2026-11). Contournement : arborescences maison, disques. F2 I3 Ins4 Pay2.

### P30. Préparation à la licence et formation continue (11/20)

Étape 19. « OVER $200 a month for ONE exam » et renouvellement automatique (Black Spectacles,
Trustpilot) ; 1 578 $ de frais NCARB pour six divisions (https://www.ncarb.org/fees) ; « I wish there
are more tech and community support, plus video tutorial options » (BricsCAD, 2021) ; formation IA
absente (7 %). Contournement : le candidat paie lui-même. F3 I2 Ins3 Pay3.

## 4. Ce que ce classement dit

1. Les cinq premiers problèmes sont tous des problèmes de gestion et de coordination, pas de
   conception : le quotidien de l'architecte se joue entre le temps, l'argent, le chantier et les
   consultants, et c'est là que les outils déçoivent le plus.
2. Les deux segments les plus mal servis sont le petit cabinet (exclu par le prix, P12) et le
   cabinet moyen (coincé entre des suites lourdes et des outils génériques, P1, P5).
3. Les problèmes de conception (P18, P21) sont fréquents mais acceptés : le standard de fait
   (Revit) n'a pas de rival crédible et les cabinets ne cherchent pas vraiment à payer pour en sortir.
4. Trois problèmes n'ont aujourd'hui aucune solution satisfaisante : la CA côté architecte (P2), le
   suivi des décisions et de la coordination en gestion de projet (P5), le savoir interne (P15).
