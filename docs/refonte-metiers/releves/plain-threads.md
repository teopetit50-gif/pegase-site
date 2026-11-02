# Relevé — Plain, Threads (liste « All threads » et fil ouvert)

Relevé le 01/11/2026 au `getComputedStyle`. Liste : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/threads/all/
(aussi « My threads », « Not assigned », même composant). Fil ouvert : …/thread/th_01M6CV70SZ10599GP14S8FDGB4/
(« Import des clients depuis Excel », API-omega-fx-th-018). Jetons, coque, briques : `plain-commun.md`.

## Ce qui a été créé

51 fils importés (`importThread`, externalId `omega-fx-th-000` à `-050`, 42 derniers jours) avec leurs messages importés (client INBOUND,
réponse de l'équipe OUTBOUND signée « L'équipe Omega », note interne NOTE, relance du client) ; 22 fils vivants T-7 à T-28 (API et CHAT).
Statuts : à traiter, en cours (« Investigating »), en attente du client, en pause, faits, ignorés ; priorités Urgent/High/Normal/Low ;
8 étiquettes ; assignés à Teo ou non assignés. Clients `prénom.nom@example.com`. **Aucun message n'est parti** : le courriel est
désactivé dans le workspace, l'ouverture du composeur « Reply » affiche « Something went wrong » (rien envoyé, rien réglé).
Les 6 « Test threads » (T-1 à T-6, Emily Johnson…) sont les fils de démonstration de Plain, pas les miens.

## Liste — arbre (1440×900, clair)

```
CARTE <main> 353,8 1079×884 (défilement interne, contenu 2564)
├─ en-tête : icône 18 + h1 « All threads » Whyte 20/400/28 @409,32 ; à droite « Filters F » et « Display V » (boutons fantômes + kbd)
├─ [filtre actif] barre de puces sous le titre (voir États)
└─ groupes, dans l'ordre : Needs first response 7 · Needs next response 6 · Investigating 15 · Test threads 6
    tête de groupe 1073×32 · p 0 32px 12px · icône de statut 18 #448bff + libellé 14/550/20 #1f1f28 + compteur 14/400/20 #636370 (gap 8)
    « Test threads » : sous-titre « Created with dummy data for testing. Only visible to you. » + bouton « Delete all » à droite
    LIGNE (a plein cadre) 1073×67 · p 8px 0 · filet bas **0,5 px #e0e0e9**
       grid-template-columns : **32px 18px 300px 355.5px 76px 84px 113.5px 94px**
       1 · 32 : case de sélection (invisible au repos, apparaît au survol : 18×18 bg #fff bd 1px #e0e0e9 r 4px ; cochée = coche blanche 14 sur fond)
       2 · 18 : icône de statut 18 #448bff (première réponse = étincelle ; réponse suivante = flèche retour ; Investigating = « … → »)
       3 · 300 (p-left 12) : ligne 1 vignette compte 18 + **compte 14/550/20** + client 14/400/20 (gap 4, ellipsis) ;
                            ligne 2 (y +24) pastille du tier (losange couleur + nom 12/400/20)
       4 · 355 (p 0 12px) : ligne 1 **réf. « T-8 » 14/550/20 #636370** + titre 14/550/20 #1f1f28 + aperçu 14/400/20 #636370 (ellipsis) ;
                            ligne 2 pastilles d'étiquettes (icône étiquette 14 + nom 12/400/20, contour #e7e7ef)
       5 · 76 : priorité = icône 18 + libellé 14/400/20 (gap 4)
       6 · 84 (p 0 12px 0 4px) : SLA (vide ici)
       7 · 113 (p-right 12, gap 4) : icône de canal 18 #8e8e9c (`<>` API, bulle CHAT) + temps relatif « 11min ago » 14/400/20 #636370
       8 · 94 (p-right 16) : assigné — avatar 18 r 4px (+ point de présence) ou icône « non assigné » 18 #8e8e9c
```

## Icônes (SVG exacts)

- Statut « Needs first response » (18, #448bff, viewBox 24) : `<path d="M3.818 12.818a.818.818 0 1 1 0-1.636h3.273a.818.818 0 1 1 0 1.636zm5.277-3.723a.81.81 0 0 1-1.145 0l-.573-.572a.81.81 0 0 1 1.146-1.146l.572.573a.81.81 0 0 1 0 1.145M12 7.91a.82.82 0 0 1-.818-.818V3.818a.818.818 0 1 1 1.636 0v3.273a.82.82 0 0 1-.818.818m4.05 1.186a.81.81 0 0 1-1.146-1.145l.573-.573a.81.81 0 1 1 1.146 1.146zm.86 3.723a.818.818 0 1 1 0-1.636h3.272a.818.818 0 1 1 0 1.636zM12 14.454a2.37 2.37 0 0 1-1.739-.715A2.37 2.37 0 0 1 9.545 12q.001-1.023.716-1.739A2.37 2.37 0 0 1 12 9.545q1.023.001 1.739.716.715.716.715 1.739t-.715 1.739a2.37 2.37 0 0 1-1.739.715m4.623 2.169a.81.81 0 0 1-1.146 0l-.572-.573a.81.81 0 0 1 1.145-1.146l.573.573a.81.81 0 0 1 0 1.146m-8.1 0a.81.81 0 0 1-1.146-1.146l.573-.572a.81.81 0 1 1 1.145 1.145zM12 21a.82.82 0 0 1-.818-.818v-3.273a.818.818 0 1 1 1.636 0v3.273A.82.82 0 0 1 12 21"/>`
- Statut « Needs next response » (18, #448bff) : `<path d="M19.302 18.39a.88.88 0 0 1-.648-.261.88.88 0 0 1-.262-.649V14.75q0-1.139-.797-1.935a2.63 2.63 0 0 0-1.934-.796H7.285l2.663 2.663q.25.25.25.614a.87.87 0 0 1-.273.637.86.86 0 0 1-.637.25.86.86 0 0 1-.637-.25l-4.188-4.187a.8.8 0 0 1-.194-.296 1 1 0 0 1-.056-.342q0-.182.056-.341a.8.8 0 0 1 .194-.296l4.21-4.21a.84.84 0 0 1 .615-.25q.364 0 .637.272.25.25.25.638 0 .387-.25.637l-2.64 2.64h8.376q1.889 0 3.22 1.332 1.332 1.33 1.331 3.22v2.731a.88.88 0 0 1-.261.649.88.88 0 0 1-.649.261"/>`
- Statut « Investigating » (18, #448bff) : `<path d="M4.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0M8.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0M12.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0"/><path d="M13.438 7.425a.95.95 0 0 1 .287-.725q.3-.3.713-.3.412 0 .687.275l4.6 4.6q.15.15.212.325.063.176.063.375 0 .2-.062.375a.9.9 0 0 1-.213.325L15.15 17.25q-.3.3-.713.3a.97.97 0 0 1-.712-.3q-.3-.3-.3-.713 0-.412.3-.712l3.85-3.85L13.75 8.15q-.3-.3-.312-.725"/>`
- Priorité (viewBox 0 0 18 18, trois barres `rect width=12 height=2 x=3 y=4|8|12 rx=0.5`) : **High** 3 barres #e79d00 ; **Normal** haut #cdcddb, milieu et bas #8e8e9c ;
  **Low** haut et milieu #cdcddb, bas #8e8e9c. **Urgent** : carré arrondi #f14e4b avec « ! » évidé :
  `<path fill="#f14e4b" fill-rule="evenodd" clip-rule="evenodd" d="M2.674 3.778C2 4.787 2 6.19 2 9c0 2.809 0 4.213.674 5.222.292.437.667.812 1.104 1.104C4.787 16 6.19 16 9 16c2.809 0 4.213 0 5.222-.674a4.003 4.003 0 0 0 1.104-1.104C16 13.213 16 11.81 16 9c0-2.809 0-4.213-.674-5.222a4.002 4.002 0 0 0-1.104-1.104C13.213 2 11.81 2 9 2c-2.809 0-4.213 0-5.222.674a4 4 0 0 0-1.104 1.104ZM9 10c.283 0 .52-.096.713-.287A.968.968 0 0 0 10 9V6a.968.968 0 0 0-.287-.713A.968.968 0 0 0 9 5a.968.968 0 0 0-.713.287A.968.968 0 0 0 8 6v3c0 .283.096.52.287.713.192.191.43.287.713.287Zm0 3c.283 0 .52-.096.713-.287A.968.968 0 0 0 10 12a.968.968 0 0 0-.287-.713A.967.967 0 0 0 9 11a.967.967 0 0 0-.713.287A.968.968 0 0 0 8 12c0 .283.096.52.287.713.192.191.43.287.713.287Z"/>`
- Canal CHAT (bulle, 18 #8e8e9c) : `<path fill-rule="evenodd" clip-rule="evenodd" d="M6.34 5.792C4.94 6.955 4 8.756 4 11.38c0 2.002.55 3.515 1.41 4.627.46.594.73 1.5.324 2.367q-.204.435-.423.826c-.086.155-.088.402.033.615a.43.43 0 0 0 .152.167c.027.015.05.021.095.012 1.226-.245 2.547-.603 3.617-1.11a2.42 2.42 0 0 1 1.342-.215c.47.06.956.09 1.45.09 2.232 0 4.235-.606 5.66-1.791C19.06 15.804 20 14.003 20 11.38s-.941-4.425-2.34-5.588C16.235 4.606 14.232 4 12 4s-4.235.606-5.66 1.792M5.06 4.254C6.937 2.694 9.434 2 12 2s5.064.695 6.94 2.254C20.84 5.836 22 8.224 22 11.38c0 3.155-1.16 5.543-3.06 7.125-1.876 1.56-4.373 2.254-6.94 2.254q-.864 0-1.702-.106a.42.42 0 0 0-.235.04c-1.283.606-2.783 1.003-4.08 1.263-1.1.22-1.96-.417-2.378-1.152-.41-.721-.52-1.718-.041-2.576q.186-.335.359-.702c.005-.012.014-.036.005-.088a.5.5 0 0 0-.1-.207C2.663 15.724 2 13.765 2 11.38c0-3.156 1.16-5.544 3.06-7.126"/>` ;
  canal API = icône `<>` de `plain-tenants.md`.
- Non assigné (18 #8e8e9c) : `<path d="M5.85 17.1q1.275-.975 2.85-1.538A9.7 9.7 0 0 1 12 15q1.725 0 3.3.563t2.85 1.537a7.7 7.7 0 0 0 1.363-2.325A7.8 7.8 0 0 0 20 12q0-3.325-2.337-5.662Q15.325 4 12 4T6.338 6.338 4 12q0 1.474.487 2.775.488 1.3 1.363 2.325M12 13q-1.474 0-2.488-1.012Q8.5 10.975 8.5 9.5q0-1.474 1.012-2.487T12 6t2.488 1.013Q15.5 8.026 15.5 9.5t-1.012 2.488Q13.475 13 12 13m0 9a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137q-1.35-1.35-2.137-3.175A9.7 9.7 0 0 1 2 12q0-2.075.788-3.9a10.1 10.1 0 0 1 2.137-3.175q1.35-1.35 3.175-2.137A9.7 9.7 0 0 1 12 2q2.075 0 3.9.788a10.1 10.1 0 0 1 3.175 2.137q1.35 1.35 2.137 3.175A9.7 9.7 0 0 1 22 12a9.7 9.7 0 0 1-.788 3.9 10.1 10.1 0 0 1-2.137 3.175q-1.35 1.35-3.175 2.137A9.7 9.7 0 0 1 12 22m0-2q1.325 0 2.5-.387a7.5 7.5 0 0 0 2.15-1.113 7.5 7.5 0 0 0-2.15-1.113A8 8 0 0 0 12 17q-1.325 0-2.5.387A7.5 7.5 0 0 0 7.35 18.5a7.5 7.5 0 0 0 2.15 1.113A8 8 0 0 0 12 20m0-9q.65 0 1.075-.425T13.5 9.5t-.425-1.075T12 8t-1.075.425T10.5 9.5t.425 1.075T12 11"/>`
- Coche de sélection (14, blanche) : `<path d="M9.55 17.575q-.2 0-.375-.063a.9.9 0 0 1-.325-.212L4.55 13q-.274-.274-.263-.713.014-.437.288-.712a.95.95 0 0 1 .7-.275q.425 0 .7.275L9.55 15.15l8.475-8.475q.274-.275.713-.275.437 0 .712.275.275.274.275.712t-.275.713l-9.2 9.2q-.15.15-.325.212a1.1 1.1 0 0 1-.375.063"/>`

## États de la liste

- **Survol d'une ligne** : bg **#f9f9fc** (sombre **#121113**) ; la case de sélection apparaît dans la 1re colonne.
- **Menu Filters (F)** : `role=menu` 235×548 aligné à droite sous le bouton, items 36 (p 0 4px, icône 18 + libellé + chevron ›) :
  Assignee · Participant · Label · Status · Account · Tier · SLA policy · Priority · Group · Channel · Thread field · Linked issue ·
  Created at · CSAT sentiment · Account field. Chaque item ouvre à gauche un sous-menu (211 de large, bd 1px #e0e0e9) : champ de
  recherche (icône 18 + input, p 12px, filet bas) puis `listbox` p 4px 8px d'options cochables.
- **Filtre actif** : sous le titre, puce bordée 208×30 (bg #fff · bd 1px #e7e7ef · **r 10px**) découpée en 3 : « Priority » (p 0 8px) |
  « is ⌄ » (bouton, filet gauche #e7e7ef) | « (!) Urgent » (bouton) | « × » ; puis bouton fantôme « × Clear all » 87×34 ;
  le titre devient « All threads (8) », les groupes se recomptent.
- **Display (V)** : popover de présentation (non relevé en détail).

## Fil ouvert — arbre (1440×900, clair)

```
fond #f9f9fc ; la barre latérale se réduit au RAIL 56 (icônes : logo, ↑, ↓ pour fil précédent/suivant, réduire)
├─ COLONNE LISTE 56,8 400×884 (carte)
│   tête 398×56 · p 6px 10px 6px 16px · filet bas #e7e7ef : « Threads » 14/550 + « Todo 28 » (12/400 #636370) · « Display V » à droite
│   CARTE DE FIL a 398×153 · p 12px 16px · gap 8 · filet bas 1px #e7e7ef
│     l.1 vignette 18 + compte 12/550/16 + client 12/400/16 … icône de statut 18 à droite
│     l.2 réf. « API-omega-fx-th-018 » 14/550/20 #636370 + titre 14/550/20 ; l.3 aperçu « No preview » 14/400/20 #636370
│     l.4 pastilles (tier, étiquettes) ; l.5 priorité (icône + libellé) … canal + « 29min ago » 12/400/16 + avatar 18
│     **fil ouvert** : bg **#eef2ff** + `box-shadow: inset 3px 0 0 #525cdb` (sombre : #1c214e + inset #5159e5)
└─ CARTE DU FIL 462,8 970×884 · bg #fff · **bd 1px #e7e7ef · r 12px** · grid `584px 384px`
    ├─ header 968×56 · filet bas #e7e7ef : vignette compte · statut → · « API-omega-fx-th-018 » 14/475/20 #636370 · h1 titre 14/550/20 ·
    │   canal + « 29min ago » 12/400 · à droite 2 boutons segmentés (vue compacte / timeline complète « Show full timeline ») + volet
    ├─ FIL 584×826 · bg #fff
    │   séparateur de date « Mon, Sep 21, 2026 » 12/550/16 (x 515) · « Today »
    │   MESSAGE (client ou équipe) : avatar 24×24 r 6px à gauche (x 475) ; carte 528 de large · **bg #f9f9fc · r 8px · p 12px 16px 16px · gap 6**
    │     en-tête : nom + courriel « Fabrice Guérin (fabrice.guerin@example.com) » 14/550/20 + date « Sep 21, 2026 » 12/400/16 #636370 + ⋯
    │     corps 14/400/20 #1f1f28 (sauts de ligne conservés) ; la carte client porte en plus un petit logo de canal sur l'avatar
    │   NOTE INTERNE : carte **bg #fffae9** (background-yellow-2) · même gabarit ; en-tête « (W) You left a note » 12/550 #453a1e +
    │     date 12/400 **#987100** ; corps 14/400 ; pied « 👁‍🗨 Not visible to Fabrice » 12/550 #987100
    │   ÉVÉNEMENT : ligne 560×21 « • You added labels [Bug] [Onboarding] … 29min ago » (« You » 12/550 #636370, pastilles, temps à droite)
    │   BANDEAU D'ÉTAT : 560×38 bg fill-blue-1 (sombre mesuré #1c214e → clair #eef2ff par le jeton) r 8px « → You are investigating » 12/400/16
    ├─ poignée 6 px (x 1041) entre fil et détails
    └─ DÉTAILS 384×826 · bg #fff · blocs repliables (chevron) séparés par des filets :
        « Thread details » 12/550/16 + titre du fil 14/550 ; lignes 28 : libellé 144 (p 6px 16px 6px 0, 12/400/20) + valeur 216
          (p 4px 6px r 8px, survol bg #f0f0f5) : Account · Customer · Status (« → Investigating ») · Assignee (« W Wizyy » + « + Assign »)
          · Priority · Labels (pastilles × + « + ») · Thread tier « Not set » · SLA policy « Not set »
        « Customer details » : avatar 24 r 6 + nom 14/550 ; Email (bouton p 6px r 10px) · Created at · Updated at
        « Links » : encadré « Bring in outside context / Link a Linear issue, GitHub PR, or thread so nothing gets lost outside this one. » + « + Add link »
        « Tasks » : « + Add task » 12/475 #636370
BARRE D'ACTION FLOTTANTE (centrée sur le fil, y 825, 550×66, p 8px 0 16px, gap 12) :
  [statut « Y »] 56×32 · groupe bordé (bg #fff · bd 1px #e7e7ef · **r 12px** · p 4px · gap 4 · ombre `rgba(0,0,0,.05) 0 1px 12px, rgba(0,0,0,.05) 0 .5px 4px`) :
  « ↩ Reply R » 96 · « 📄 Note N » 92 · « ⋯ More » 64 ; puis groupe « Sidekick Agent B » 145 + bouton 32 ; boutons r 8px h 32,
  libellés 12/550/20, kbd 11/550/20 #636370 sur #fff. Au survol « Reply » s'allonge en « Reply to Fabrice Guérin ».
```

## Raccourcis relevés

F (Filters) · V (Display) · R (Reply) · N (Note) · Y (changer le statut) · B (Sidekick Agent) · Échap ferme le composeur · flèches ↑/↓ du rail = fil précédent/suivant.

## Sombre

Corps #121113 ; cartes #1a191b ; message #232225 ; note #2c2207 (fill-yellow-1 sombre), date de note #b5b2bc ; fil choisi #1c214e +
inset #5159e5 ; textes #eeeef0 / #b5b2bc.

## 390×844

Liste : chaque fil devient une **carte de 153 px** (même gabarit que la colonne liste du fil ouvert, sans grille), tête de groupe conservée,
« Filters » réduit à l'icône. Fil ouvert : plein écran, barre du haut (← · vignette · réf. tronquée · canal · temps · ⋯ · volet · ⌄),
messages pleine largeur sans avatar à gauche (avatar dans l'en-tête de la carte), barre du bas réduite à « ↩ Reply to Fabrice Guérin · 📄 · ⋯ ».

## Captures (`captures/plain-threads/`)

`1440-clair.png` · `1440-sombre.png` · `1440-clair-survol-ligne.png` · `1440-clair-menu-filters.png` · `1440-clair-filtre-actif.png` ·
`1440-clair-fil-ouvert.png` · `1440-sombre-fil-ouvert.png` · `1440-clair-composeur-reply.png` (erreur d'envoi : courriel désactivé) ·
`390-clair.png` · `390-sombre.png` · `390-clair-fil-ouvert.png`.
Note : les captures du fil montrent l'adresse de Teo (auteur des réponses importées) telle que Plain l'affiche.
