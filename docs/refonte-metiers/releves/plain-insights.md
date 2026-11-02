# Relevé — Plain, Insights (Reporting et chaque rapport)

Relevé le 01/11/2026 (1440×900 et 390×844, clair et sombre). Entrée : menu **Insights** de la barre latérale →
https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/insights/ redirige vers `insights/reporting/`.
Jetons et briques : `plain-commun.md`. Les graphiques sont des **Recharts** (classes `recharts-*`) — la recopie peut utiliser Recharts.

## Ce qui a été créé pour remplir les graphiques

- 51 fils importés étalés sur 42 jours (`importThread` avec `createdAt`), 8 étiquettes, 4 tiers, priorités 0 à 3.
- 22 fils « vivants » créés le 01/11 (`createThread`, canaux API et CHAT, T-7 à T-28), puis statuts changés : 5 Done, 2 Done puis rouverts,
  5 en Snooze 3 jours ; 12 fils importés passés Done le 01/11, dont 3 rouverts.
- **Limite** : les réponses d'agent sont refusées par Plain (« Emails are not enabled for this workspace ») — je n'ai pas activé le
  courriel (réglage du compte). Donc **Median first response time, Next response time, SLA compliance et les colonnes
  First/Next response des tableaux restent N/A**. Les messages importés ne comptent pas dans ces métriques.
- Les métriques de statut (Resolution time, Threads moved to Done, re-opened) se calculent en différé : au moment du relevé elles
  affichaient encore « No data » ; Queue size (27), New threads (31), la carte de chaleur et les répartitions étaient remplies.
- **Top issues** demande une intégration de suivi de tickets (non branchée, interdit) → reste vide. **Themes** est généré par l'IA
  chaque jour à 5 h UTC sur les 7 derniers jours → vide le 01/11, devrait se remplir le 02/11.

## Mise à jour du 01/11 au soir

Les métriques différées sont arrivées : **New threads created per day 53 total** (moyenne 2, pic du jour avec la pastille verte
« ⓘ Investigate this spike »), **Threads re-opened per day 6 total** (moyenne 6), Queue size 28. Median first response time et
Median resolution time restent « N/A / No data » (icône fantôme 16 + « No data »). Captures à taille réelle : `1440-reel-clair.png`,
`1440-reel-sombre.png` (1440×900, tuiles à l'échelle 1 recollées — méthode dans `linear-home.md` de la branche refs-linear).

## Navigation Insights (panneau latéral, remplace celui de Support)

```
« Insights » titre de section 14/550
Reporting        a 267×24 @66,100 · 14/400/24 #636370 · icône 18 #8e8e9c (choisi : bg #e7e7ef, texte #1f1f28)
  Team · Accounts · Tiers · Labels · Groups · Channels · Priorities   liens 281×33 @x 60, sans icône, 14/400/20 #1f1f28, retrait du texte à x 96
  Account fields ›  (bouton : ouvre à droite un menu 140×116 — « Contrat actif », « MRR (€) », « Ville », items 36 p 8px, icône 14 par type)
Top issues       a 267×24 · icône 18
Themes           a 267×24 · icône 18
```

## Reporting — arbre (1440×900)

```
CARTE <main> 353,8 1079×884
├─ barre de titre 1079×86 : h1 « Reporting » Whyte 24/400/32 @377,38
│   à droite (gap 8, @y 40, h 30) : « ⚙ Filter » 81 · « ⊕ Group by » 105 · « Timeframe  Past month ⌄ » 181 · « Granularity  Daily ⌄ » 146
│   boutons bordés : bg #fff · bd 1px #e7e7ef · r 6px · p 6px 12px · gap 8 · libellé 12/550/16 #1f1f28 · valeur 12/400/16 #636370 · chevron 14
└─ zone défilante 353,94 1079×798 · bd-top 1px #e0e0e9 · p 0 24px 120px · hauteur de contenu 5455
    sections (flex-col gap 12) ; titre de section **sticky** (top −12px) : div 1031×60 p 24px 0 12px, span cliquable p 12px 16px
    « Overview ⌄ » h2 14/550/20 #1f1f28 (chevron 14 ; le titre replie la section)
    grille de cartes : `grid-template-columns: repeat(3, 315.66px)` · **gap 42px** (2 colonnes pour Support volume : 494,5 chacune)
```

Ordre exact des sections et cartes :

1. **Overview** — Queue size (« 27 » + « in todo right now ») · Median first response time (« N/A » + « last 30 days ») · Median resolution time.
2. **Support volume** — New threads created per day (« 31 total », barres + repère « Average 1 ») · Threads re-opened per day ·
   Threads moved to Done per day · New thread volume by time and day (carte de chaleur) ·
   Volume breakdown by account · by tier · by label (3 colonnes).
3. **First response time** — Median first response time (2 colonnes de large) · SLA compliance + « Breached threads  View all »
   (encadré « No active breached threads » / « Nice work, go team! ») · breakdown by account / tier / label type.
4. **Next response time** — même schéma (Median next response time, SLA compliance, Breached threads, 3 breakdowns).
5. **Resolution time** — Median resolution time + 3 breakdowns.
6. **Customer waiting time** — Median customer waiting time + 3 breakdowns (« 2m ↗2m »).
7. **Customer survey responses** — Percentage of positive survey responses (« 0% last 30 days ») · Recent responses (« View all »,
   encadré « No recent responses » / « Nice work, go team! »).
8. Pied : « All time » 12/400 + h3 **« Customers helped »** Whyte 20/400/28 + compteur à volets « 9 0 1 » (chiffres Whyte 20/20 dans des
   demi-cases 28×17,5 : haut r 4px 4px 0 0, bas bg #fff r 0 0 4px 4px, bd 1px #e7e7ef, joint 0,5px) — p 24px 0, centré.

## Briques de carte

| Brique | Valeurs |
|---|---|
| Carte | p 12px · r 8px · **aucun fond ni bordure** (ombre de focus transparente `0 0 0 1.5px`, `0 0 0 5px`) · flex-col gap 24 |
| En-tête de carte | titre 12/550/16 **#636370** + icône info 14 #adadb7 (gap 6) ; à droite bouton « Ask Agent » 26×26 (icône verte, libellé 12/475 #074022 visible au survol) |
| Valeur principale | **Whyte 24/400/36** #1f1f28 + suffixe 14/400/20 #636370 (« in todo right now », « last 30 days », « total ») — gap 4 |
| Graphique courbe (Queue size) | SVG 316×155 · aire `fill=url(gradient)` opacité 0,6, dégradé #5c67f4 0,3 → 0,05 → … ; fond rayé vertical : rects alternés transparent / dégradé #fff → #f9f9fc ; lignes verticales 1px #e0e0e9 ; axe Y à droite (0 · 15 · 30), axe X « Oct 18 · Today » 12/400 #636370 (ticks Y 14/400) |
| Graphique barres (volume/jour) | barres de 15 px, `rx 2`, couleur selon la valeur : faible #8a94ed, max #4252e1, très faible #d2d6f8 ; ligne de moyenne pointillée `stroke-dasharray 3` #cdcddb ; étiquette « Average 1 » : bg #fff · bd 1px #e0e0e9 · r 4px · p 0 4px 2px · 10/400/12 (« Average » #636370, valeur #1f1f28) |
| Carte de chaleur | grille 24 colonnes (heures 12am … 9pm, une étiquette toutes les 3 h) × 7 jours (Mon … Sun) + ligne « All » ; cellule 17,8×18,8 · r 2px · gap 1,48 ; vide = bg #fff bd 1px #e0e0e9 ; plein = mélange oklab de #5c67f4 (5 paliers, légende « Lower ▢▢▢▢▢ Higher » cases 10×10 gap 2, de #fff à #5c67f4) |
| Répartition (breakdown) | 5 lignes ; chaque ligne : icône 18 (couleur du tier/compte) + nom 12/400/16 (p-right 64) au-dessus d'une barre **8 px, radius 2** (couleur du tier ; gris pour comptes/labels) ; à droite valeur 12/550/16 + badge d'évolution |
| Badge d'évolution | hausse : bg #fff7f7 · texte #651818 · r 4px · p 1px 4px 1px 1px · flèche ↗ 12 ; baisse : vert (↘1) ; stable : gris (« ● 0 ») |
| État vide (graphique) | icône 14 + « No data » 12/400/16 #636370 centré sur la grille vide |
| État vide (breakdown sans données) | encadré bd 1px #e7e7ef r 8px : « No data » 14/550 + « No threads created in this period with account » 14/400 #636370 centrés |
| Chargement | valeurs et axes floutés (`filter: blur(7px)` sur la valeur, `blur(3px)` sur les axes) + animation d'opacité `0.45 → 0.8 → 0.45` en **1,8 s ease-in-out infinite** |

## Menus (tous `role=menu`, r 10px, p 4px 0, ombre de menu commune, items **36 px**, p 8px, 14/400/20, r 6px)

- **Timeframe** (199×358) : Custom · Past 24 hours · Past week · Past month · Past two months · Past four months · Past six months · Past year —
  chaque préréglage sur 2 lignes (54 px) avec la plage en dessous (« Oct 3, 2026 – Nov 2, 2026 »).
- **Granularity** (146×224) : Hourly · Daily · Weekly · Monthly · Quarterly · Yearly (indisponibles en #636370 : Hourly, Quarterly, Yearly pour « Past month »).
- **Group by** (235×332) : None · Label · Tier · Group · Priority · Assignee · Account · Channel · Account field ›.
- **Filter** (235×296) : Assignee · Label · Account · Tier · Priority · Group · Channel · Account field (chaque item ouvre un sous-menu).

## Rapports (Team, Accounts, Tiers, Labels, Groups, Channels, Priorities, champs de compte)

Même gabarit pour tous :

```
titre h1 Whyte 24 + « Filter » + « Timeframe Past month ⌄ » (pas de Group by ni Granularity)
├─ BARRE EMPILÉE 100 % (sauf Team) : segments h 16, r 2px (extrémités r 4px), couleurs : #5c67f4, #1bd379, #ab4aba, #ffcb14, #e33d3d, « Other » #636370
│   (Priorities, mesuré : Urgent #f14e4b, High #e79d00, Normal #8e8e9c, Low #cdcddb) ; légende sous chaque segment
│   « icône + nombre + nom » 10/550/12 ; graduations 0% · 25% · 50% · 75% · 100% ; marge basse 36
├─ recherche « Search accounts » / « Search team member » / « Search priorities »… + bouton télécharger 24×24 à droite
└─ TABLEAU en grille CSS (pas de <table>) : ligne `grid-template-columns: 200px 150px 180px 180px 180px 200px` · gap 0 16 · p 4px 20px · h 42
    en-têtes (icône 14 + libellé 12/550/16 + flèche de tri ↕ 14) ; en-tête trié = bouton bg #f0f0f5 r 4px p 3px 4px
    1re cellule = lien (a) p 8px 8px 8px 12px, icône 14 + nom 12/550/16 #1f1f28, retour à la ligne si long
    valeurs 12/400/16 ; « N/A » ; pied « TOTAL 31 »
    colonnes : <Objet> · Volume · First response · Next response · Resolution time · Customer wait time
    (Team : Team Member · Messages sent · Assigned · Resolved · First response · Next response · Resolution time · Customer wait time)
```

Contenu relevé : Accounts (example.com 31, Agence Immobilière Créole 4, Garage Duval Auto 2, …) · Tiers (Entreprise 9, Business 7, Pilote 6,
Essentiel 5, TOTAL 27) · Labels (Bug 11, Facturation 7, Contrat 7, Urgent 6, Question 4, Other 6) · Priorities (Normal 13, High 9, Urgent 5,
Low 4, TOTAL 31) · Team, Groups, Channels : « No data available », TOTAL 0.

Top issues : encadré centré 250×105 « No tracked issues » / « Link Plain threads to your issue tracker to track your customers' requests.
Linked issues will appear here. » / bouton « Learn more ».
Themes : sous-titre « Themes show AI-detected clusters in your threads. A new set of themes is generated every day at 5am (UTC) based on
threads from the last 7 days. Get these as a Slack digest ↗ » ; « Display V » à droite ; encadré « No themes found » / « New themes are generated daily. »

## Sombre

Variables des graphiques : grille #323035 (clair #e0e0e9), fond rayé #1a191b → #121113 (clair #fff → #f9f9fc), texte d'axe #b5b2bc,
ligne de moyenne #49474e, accent #5c67f4 inchangé, barres identiques (#8a94ed / #4252e1 / #d2d6f8). Boutons du haut bg #1a191b bd #2b292d ;
étiquette Average bg #1a191b bd #323035 ; filet de la zone défilante #323035.

## 390×844

Titre seul sur la 1re ligne ; boutons sur 2 lignes alignés à droite (Filter 81 + Group by 105, puis Timeframe 181 + Granularity 147) ;
filet sous la barre ; grille de cartes **1 colonne de 358** (gap 42) ; carte de chaleur à 24 colonnes de 12,5 px (gap 1,07).

## Captures (`captures/plain-insights/`)

`1440-clair-1-overview.png` · `1440-clair-2-volume.png` (carte de chaleur, répartitions, titre sticky) · `1440-clair-3-premiere-reponse.png` ·
`1440-clair-4-reponse-suivante.png` · `1440-clair-5-resolution.png` (chargement flouté) · `1440-clair-6-attente-enquetes.png` (Customers helped) ·
`1440-clair-chargement.png` · `1440-clair-team.png` · `1440-clair-accounts.png` · `1440-clair-priorities.png` · `1440-clair-top-issues.png` ·
`1440-clair-themes-sous-menu-account-fields.png` · `1440-sombre-1-overview.png` · `390-clair-chargement.png` · `390-sombre-chargement.png`.
À 390 les données mettaient plus de 18 s à arriver : les deux captures montrent l'état de chargement (flou animé), qui fait partie du relevé.
