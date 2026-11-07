# Notes : Gestion de cabinet (temps, facturation, rentabilité, ressources, gestion de projet interne)

Relevés du 2026-11-07. Fichier JSONL associé : `02_frag_gestion_cabinet.jsonl` (54 outils, 6 sous-catégories).

## Nombre d'outils trouvés

54 lignes, réparties ainsi : ERP et PSA spécialisés A&E 15 ; Temps et facturation 9 ; Planification des
ressources 6 ; Gestion de projet généraliste 11 ; Comptabilité 4 ; Propositions et contrats 9.
La cible était 35 à 45 : le dépassement vient de la liste de départ, longue, dont presque tout a pu être
documenté avec au moins une source primaire (page tarifaire éditeur).

## Outils écartés et pourquoi

- Workamajig : tarif relevé (49 $/utilisateur/mois, 10 utilisateurs minimum) mais produit explicitement
  conçu pour les agences de publicité et équipes marketing internes ; aucune trace d'usage par des
  architectes dans les forums consultés. Hors périmètre.
- Function Point : même cible (agences créatives) ; page tarifaire non consultée (vérification de domaine
  limitée). Hors périmètre.
- Archdesk : outil de gestion d'entreprise de construction (UK) ; page non consultée. Hors périmètre
  (entreprises de construction).
- Abtrac : éditeur néo-zélandais ; présence commerciale US non vérifiée (page non consultée). Écarté.
- Rapport3 (Cubic Interactive, UK) et Core Practice (Australie) : aucune présence US établie, non
  recherchés faute de budget de recherche. Écartés.
- Saviom : PSA enterprise sur devis, aucune trace d'usage A&E repérée ; non documenté.
- Cosential : devenu Unanet CRM, laissé à la catégorie CRM.
- Practice Panther : logiciel juridique, exclu d'office.
- Studio Designer, Ivy / Houzz Pro : décoration et design d'intérieur, à traiter en annexe par la
  catégorie concernée.
- Deltek Costpoint : ERP pour sous-traitants fédéraux, mentionné ici seulement pour mémoire (Deltek le
  réserve aux contractants gouvernementaux, pas aux cabinets d'architecture classiques).
- Bill.com, Stripe Invoicing : briques de paiement, pas des outils de gestion de cabinet ; non
  documentés.
- ArchiOffice et Deltek Vision : produits historiques absorbés respectivement par BQE CORE et
  Vantagepoint ; cités dans les lignes de leurs successeurs (plusieurs témoignages Archinect et AIA les
  concernent encore).

## Sites inaccessibles ou limités

- G2, Capterra (toutes extensions), TrustRadius, Software Advice, GetApp : HTTP 403 systématique sur
  toute lecture directe. Les notes G2 et le nombre d'avis n'ont pu être relevés que via les extraits de
  recherche (Monograph, BQE CORE, Deltek Ajera, Deltek Vantagepoint, CMap, Unanet via Capterra). Pour
  les 48 autres outils, `note_g2` vaut « non trouvé ». Les plaintes 1-3 étoiles ont été reconstituées à
  partir des extraits de recherche G2/Capterra et des forums Archinect et AIA Community Hub.
- Reddit (www et old) : bloqué pour l'outil de lecture. Les requêtes « r/Architects time tracking »,
  « Monograph vs BQE » et « Ajera alternatives » n'ont renvoyé aucun fil Reddit, uniquement des pages
  vendeurs. Un seul fil Reddit a pu être lu, via un miroir retourné par le moteur de recherche
  (r/graphic_design, « Small studio project management tools », mai 2025), utile pour les outils
  généralistes mais pas spécifique aux architectes. Les forums Archinect et AIA Community Hub ont servi
  de substitut (quatre fils lus en entier).
- Le budget de recherche web partagé entre agents a été épuisé après la première vague ; le reste a été
  fait par lecture directe de pages éditeur. Une seconde limite (vérification de sécurité des domaines)
  a bloqué une vingtaine de domaines pendant plusieurs minutes ; une seule nouvelle tentative a été faite.
- Pages éditeur en erreur le 2026-11-07 : bqe.com/about et /company (404), unanet.com/about-us (404),
  mosaicapp.com/about-us (404), aiacontracts.com/pricing (404), netsuite.com/portal/products/erp.shtml
  (404), sage.com Sage Intacct (403), microsoft.com Planner compare-plans (503), zoho.com/invoice/pricing
  (404), zoho.com/projects/pricing (page sans montants).

## Les 8 outils les plus importants de la catégorie

1. Deltek Vantagepoint : « le standard par défaut dans presque tous les cabinets » de taille moyenne à
   grande (Archinect), 2 000+ entreprises, 98 % du Top 500 A&E chez Deltek [déclaratif], 645 avis G2 ;
   référence incontournable malgré complexité et coût.
2. BQE CORE : la suite tout-en-un la plus répandue chez les cabinets de 5 à 50 personnes (3 000+ cabinets
   A&E déclarés, 783 avis Capterra, 449 G2), avec le volume de plaintes le plus élevé sur les bugs.
3. Monograph : le challenger natif A&E qui aspire les clients de BQE et Ajera (16 000 utilisateurs, 2 000
   cabinets déclarés, 236 avis Capterra, levées de 29 M$), avec le roadmap IA le plus concret (import de
   contrat, timesheets depuis l'agenda, Ask Monograph).
4. Deltek Ajera : l'ERP « petit cabinet » de Deltek, encore massivement installé (202 avis G2) mais perçu
   comme daté ; c'est la base de clients que Monograph et Mosaic ciblent.
5. QuickBooks Online : la comptabilité par défaut de presque tous les petits cabinets US et le point
   d'intégration de tous les outils de temps ; hausses de prix 2026 (Advanced 340 $/mois) et faiblesse
   du job costing sans paie QB.
6. Harvest : le duo Harvest + QuickBooks reste le stack le plus cité par les cabinets de 2 à 10 personnes
   (Archinect, AIA, Reddit) ; sa refonte tarifaire 2026 (sièges + usage) est un signal de rupture.
7. AIA Contract Documents : passage obligé pour B101, A201, G702/G703 ; Unlimited 2 199 $/an, hausse
   brutale du papier (+200 %) et bascule au tout-digital en 2026.
8. Mosaic et CMap (ex aequo) : les deux acteurs « ressources et rentabilité » qui se superposent à un ERP
   existant ; Mosaic mise sur l'IA (Chello à 50-200 $/utilisateur/mois), CMap sur l'édition A&E et son
   bureau d'Orlando après son rachat par ECI (2024).

## Signaux de douleur utilisateur les plus fréquents

- Bugs et lenteurs BQE CORE : « presque rien ne fonctionne correctement, plein de bugs », 71 % d'avis
  négatifs sur les 107 avis Capterra tagués « glitches » ; lenteurs sur données complexes (G2, 2026).
  https://www.capterra.com/p/141096/BQE-Software/reviews/
- Deltek : complexité, coût total, implémentation longue et dépendante des partenaires (Vantagepoint,
  facilité d'usage 3,4/5 Capterra) ; interface « moche et alambiquée » et reporting peu flexible (Ajera).
  https://www.capterra.com/p/82750/Deltek-Ajera/reviews/ et https://rfp.wiki/erp/deltek-vantagepoint
- Monograph : fonctions manquantes (pas d'app mobile, pas d'avoirs, rapports et dépenses limités), pas de
  calendrier des demandes de fonctions, prix. https://www.capterra.com/p/178124/Monograph/reviews/
- QuickBooks pour le job costing : « pour un vrai reporting des coûts par projet il faut faire la paie
  dans QB », « lourd et encombrant » (cabinet de 3-4 personnes, 2018), « tout simplement affreux ».
  https://archinect.com/forum/thread/150087216/accounting-software-recommendations
- Fragmentation du stack : « tout semble faire une seule chose vraiment bien », impossible de trouver
  gestion de projet + temps + facturation + honoraires forfaitaires dans un seul outil (Mavenlink ne
  gérait pas les forfaits). https://archinect.com/forum/thread/150198677/project-management-and-project-financial-software/0
- Tableurs et réconciliation manuelle : « quelques heures à la fin de chaque mois », « chronophage et
  complexe », encore très présent chez les petits cabinets.
  https://archinect.com/forum/thread/94256/what-does-your-office-use-to-track-timesheets-and-project-billings
- Intégrations manquantes avec QuickBooks Desktop (Harvest, ArchiOffice), reporting « pas assez robuste »
  (ArchiOffice). https://communityhub.aia.org/discussion/project-management-software-for-a-small-firm
- Hausses de prix 2026 : Harvest (sièges + frais à l'usage, factures en forte hausse au renouvellement
  selon des blogs concurrents), QuickBooks Online (Essentials 85 $, Plus 140 $, Advanced 340 $), AIA
  papier (39,99 $ vers 119,97 $). https://www.avaza.com/?p=27837 et
  https://wm.aiacontracts.com/hubfs/2026%20Paper%20Price%20Increase%20-%20Reseller%20FAQ.pdf
- Facturation selon l'effectif total et non par siège chez Deltek, vécu comme un frein par la compta d'un
  cabinet de 100 personnes (Archinect, 2016).
  https://archinect.com/forum/thread/145647373/fast-growth-firm-need-new-financial-time-management-software-ideas
- Outils généralistes jugés « overkill » ou « trop lourds » (Asana, ClickUp, WorkflowMax) par les solos,
  qui retombent sur Basecamp, Notion ou un tableur.
  https://reddit.sentinel-team.org/posts/1qunfl6/snapshots/2026-02-03T21%3A30%3A43.417545Z

## Points de vigilance pour la synthèse

- Toutes les notes G2 présentes viennent d'extraits de recherche (pages G2 non lues directement) ; les
  compteurs d'avis varient d'une page G2 à l'autre (Vantagepoint 462 ou 645, Monograph 27 ou 28, CMap 291
  ou 292). La valeur retenue est indiquée dans chaque ligne avec sa page source.
- Les témoignages Archinect sont parfois anciens (2009-2021) ; la date est donnée à chaque citation.
- Les blogs de Monograph, Toggl, TimeCamp, Avaza et Productive sont des sources concurrentes ; ils ne sont
  cités que pour des faits vérifiables ou marqués « à lire avec prudence ».
