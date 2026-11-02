# Relevé — Cal.com, Bookings (Upcoming, Unconfirmed, Recurring, Past, Canceled, détail)

URL : https://app.cal.com/bookings/upcoming (onglets `/unconfirmed`, `/recurring`, `/past`, `/cancelled` ; vue `?view=list|calendar` ;
détail `?uid=<uid>`). Relevé le 01/11/2026, complété le même soir après remplissage. Coque, polices, jetons et briques :
`calcom-availability.md` (mêmes composants « coss ui », Cal Sans, couleurs converties en hex).

## Ce qui a été créé

Cal.com refuse les invités `@example.com` (`400 email_domain_cannot_receive_mail`). Teo a choisi le 01/11 l'alias
**teopetit50+test@gmail.com** : toutes les réservations utilisent cette adresse (noms d'invités fictifs). Chaque réservation et chaque
annulation a envoyé un courriel à cette adresse et à l'organisateur (Teo).

Types d'événements créés et **masqués** de la page publique : Visite de chantier 60 min (7733608), Rendez-vous devis 30 (7733612),
Point d'avancement 15 (7733613), Consultation technique 45 sur confirmation (7733614), Suivi hebdomadaire 30 récurrent ×4 (7733615),
Appel rapide 15 (7733616, horaire « Permanence téléphonique 24 h/24 » 2584199, préavis 0).
Réservations (API `/api/book/event`, `/api/book/recurring-event`, `/api/cancel` avec jeton CSRF) :
- 5 appels rapides le 01/11 de 21 h 45 à 23 h 00 (heure de Guadeloupe) → passent dans **Past** au fil de la soirée ;
- 13 à venir du 02/11 au 13/11 (visites, devis, points) ; une 14e (Léa Laurent, 5/11 8 h) refusée car hors horaires ;
- 3 **Unconfirmed** (Consultation technique : Inès Morel, Maxime Fournier, Sarah Girard) ;
- 2 séries **Recurring** de 4 (Olivier Faure mardi 11 h, Nadia Boyer jeudi 15 h) ;
- 5 **Canceled** (Romain Bonnet, Clara Dupont, Mathieu Lambert, Laura Fontaine, Kévin Rousseau ; motif « Annulé par le client »).

## Liste — ligne de réservation (1440×900, clair)

```
CARTE (coss) 297,79 1094 · bg #fff · bd 1px #0d0d0d a0.08 · r 16px · ombre 0 1px 2px #0000000d
├─ tête de groupe « Today » / « Next » 1092×44 · p 12px 24px 12px 16px · texte 14/500/20 #696969 · fond = ::before de la carte (#000 a0.03)
└─ panneau intérieur bg #fff, lignes séparées par un filet 1px #0d0d0d a0.08
    LIGNE p 16px 24px 16px 16px · gap 16 (hauteur 68 à 108 selon le contenu)
    ├─ case à cocher 16×16 (bg #fff · bd 1px #141414 a0.10 · r 4px · ombre 0 1px 2px #0000000d)
    ├─ colonne date 160 (x 340) gap 8 : « Sun, 1 Nov » 14/500/20 #262626 · « 10:00pm - 10:15pm » 14/400/20 #696969 ·
    │   pastille « 🎥 Join Cal Video » 113×24 (bg #fff · bd 1px #141414 a0.10 · r 8px · p 0 7px · gap 4 · 12/500/16 #262626 · logo 16)
    ├─ colonne contenu (x 516) : titre bouton « Appel rapide between Wizyy and Murielle Garnier » **14/600/20 #262626** ;
    │   « You and Murielle Garnier » 14/400/20 #696969 (le nom est un bouton) ; mention « in 4 minutes » **#00a63e** (sombre #05df72) quand c'est imminent ;
    │   note entre guillemets « "Question sur le devis de la terrasse." » 14/400/20 #696969
    └─ à droite bouton ⋯ 32×32 (bg #fff · bd #141414 a0.10 · r 10px)
ligne ouverte (détail affiché) : bg #fafafa
```

Variantes par onglet :
- **Unconfirmed** : pas de groupe ; pastille « Unconfirmed » 12/500/16 **#bb4d00 sur #ff9900 a0.08** · r 6px · p 0 3px ; à droite « Reject » (53×24,
  bouton clair r 8px 12/500) · « Confirm » (63×24, bg #262626 texte #fafafa) · drapeau rouge 32×32 (#c10007) · ⋯ ;
  la barre latérale affiche un compteur « 3 » à côté de Bookings. Pied de pagination : sélecteur « 10 ↕ » + « rows per page » 14/400 #3c3e44 …
  « 1-3 of 3 » + ‹ › 28×28.
- **Recurring** : sous la note, « ↻ 4 events remaining » 12/400/16 #696969 (icône refresh-ccw 16, gap 4) ; pagination « 1-8 of 8 ».
- **Canceled** : titre **barré** (line-through #262626), lignes de 68 sans mention de temps ; drapeau + ⋯ à droite.
- **Past** (après 22 h, le premier appel rapide) : pas de tête de groupe ; date au format long **« 1 November 2026 »** (14/500/20 #262626)
  au lieu de « Sun, 1 Nov » ; pas de mention « in N minutes » ; « Join Cal Video » conservé ; pagination « 1-10 » avec ‹ › à **opacité 0,64**
  (désactivés). La barre latérale garde le compteur « 3 » (pastille 18×18 bg #fff, 12/500, pour les non confirmées).
  À 1024 de large la bascule liste/calendrier passe sous les onglets (2e ligne).

## Détail d'une réservation (clic sur une ligne → `?uid=…`)

Panneau flottant (pas de voile) 512×836 à x 912, y 16 · bg #fff · bd 1px #0d0d0d a0.08 · **r 16px** · ombre `0 10px 15px -3px #0000000d, 0 4px 6px -4px #0000000d` :
- tête 64 : pastille « Confirmed » (12/500 #007a55 sur #00bf80 a0.08, r 6px) · à droite ⌃ ⌄ (réservation précédente/suivante) et × (28×28, r 10px) ;
- titre Cal Sans **20/700/25** #262626 ;
- sections titrées 12/500/16 **#6b7280** : « When » (« Sunday, November 1, 2026 » 14/500 + « 10:00pm - 10:15pm (Atlantic Standard Time) ») ·
  « Who » (avatar + « Wizyy » 14/500 + pastille « Host » 10/500 #1447e6 sur #2680ff a0.08 r 4px, courriel 14/400 #696969) ·
  « Attendees » (avatar initiales « MG », nom, courriel, fuseau « America/Guadeloupe (GMT-4) ») ·
  « Where » (« Cal Video: » + lien 14/500 #155dfc) · « Additional notes » ;
- pied 65 : bouton groupé « 🎥 Join Cal Video | ⧉ » (170×32) + ⋯ 32×32.
Menu ⋯ du détail (183×447, r 10px, items 28 p 4px 8px r 6px 14/400, icônes Lucide 16), groupes titrés :
« Edit event » : Reschedule booking (clock) · Request reschedule (send) · Edit location (map-pin) · Add guests (user-plus) —
Add to calendar › (calendar) — « After event » : View recordings (video) · Check for transcripts (file-text) · View session details (info) ·
Mark as no-show (eye-off) — Report booking (flag, #c10007) — Cancel event (circle-x, #c10007) — Delete booking (trash, #c10007).

## Menu « Filter »

Popover sous le bouton : champ « Search filters… » (loupe) puis « ✦ AI filter », séparateur, Link · Attendee's name · Attendee email ·
Date range · Created at · Booking UID · Routing trace step · Fuzzy confidence · Match method · Tiebreaker rule… (liste défilante).
(Styles du popover non mesurés : il se fermait avant la mesure ; voir la capture.)

## Barre d'outils (1440×900, clair)

```
carte <main> (comme Availability) ; pas de titre de page : la barre d'outils est en haut @y 33
├─ CONTRÔLE SEGMENTÉ nav 408×30 @297 · bg #1a1a1a a0.04 · r 10px · p 2px · gap 2
│   onglets a h 26 · p 0 7px · r 8px · 14/500/20 : Upcoming (actif #262626 + indicateur blanc) · Unconfirmed · Recurring · Past · Canceled (#696969 a0.72)
├─ « ⫶ Filter » bouton combobox 72×28 · bg #fff · bd 1px #141414 a0.10 · r 10px · p 0 9px · gap 6 · ombre `0 1px 2px #0000000d` · icône lucide list-filter 16
└─ à droite : « Saved filters ↕ » 119×28 (même bouton, texte 14/400) + bascule de vue radiogroup 58×30 (bg #1a1a1a a0.04, r 10px, p 2px) :
    liste (icône menu) | calendrier (icône calendar), items 26×26 r 8px
```

## État vide (identique pour les 5 onglets)

Encadré 1094×294 @297,79 · **bd 1px #0d0d0d a0.08 · r 14px · p 80px 24px** · centré, gap 24 :
pastille d'icône 36×36 (bg #fff · bd 1px a0.08 · r 8px · ombre `0 1px 3px #0000000d, 0 1px 2px -1px #0000000d`, icône calendar 16) ;
titre Cal Sans **20/700/28** #000 ; texte 14/400/20 #696969 sur 384 de large. Textes exacts :

- Upcoming : « No upcoming bookings » / « You have no upcoming bookings. As soon as someone books a time with you it will show up here. »
- Unconfirmed : « No unconfirmed bookings » / « You have no unconfirmed bookings. Your unconfirmed bookings will show up here. »
- Recurring : « No recurring bookings » / « You have no recurring bookings. As soon as someone books a recurring meeting with you it will show up here. »
- Past : « No past bookings » / « You have no past bookings. Your past bookings will show up here. »
- Canceled : « No canceled bookings » / « You have no canceled bookings. Your canceled bookings will show up here. »

## Vue calendrier (`?view=calendar`)

```
barre : ‹ › (boutons) · « Today » 60×28 (bouton bordé) · « November 2026 ↕ » · « Link  Select… ↕ ✕ » ; à droite segmenté « Day · Week · Month » 165×30 + bascule liste/calendrier
grille semaine dans une carte bordée r 14px :
  colonne des heures 64 de large : « AST » 10/500/14 ls .25 #696969 ; heures « 8 AM » 11/400/16 #696969 (p-right 10)
  ligne « All day » 31 (11/400/16), filet bas a0.08
  en-têtes de jour 146 de large · p 8px 10px · gap 6 : « Mon » 12/400/16 #696969 + numéro 20×20 ; aujourd'hui = pastille ronde #262626, chiffre #fafafa 12/500
  **64 px par heure** (1536 px pour 24 h), filets horaires a0.08 ; bouton flottant « ↓ Now » en bas au centre ; ligne de l'heure courante (« Current time, 9:25 PM »)
```

## Sombre

Comme Availability : page #111111, main #141414, bords #ffffff a0.06 ; onglet actif sur indicateur #ffffff a0.08 ; état vide : titre #fafafa,
texte #818181, pastille d'icône sombre.

## Captures (`captures/calcom-bookings/`)

`1440-clair-upcoming.png` · `1440-sombre-upcoming.png` · `390-clair-upcoming.png` · `1440-clair-unconfirmed.png` · `1440-clair-recurring.png` ·
`1440-clair-canceled.png` · `1000-clair-past.png` (fenêtre réelle du panneau, 1024×768) · `1440-clair-detail-reservation.png` ·
`1440-clair-detail-menu.png` · `1440-clair-menu-filter.png` · `1440-clair-vue-calendrier.png` · `1440-clair-upcoming-vide.png` · `1440-sombre-past-vide.png`.

Limite des captures : l'outil de capture du navigateur intégré rend toute page en 800 px de large (1440 → ×0,556 ; 1024 → ×0,78) ;
`zoom` à `scale: 1` renvoie les mêmes pixels réduits (vérifié : région 200×150 → 200×150 px), donc un recollage par tuiles ne donne pas
de 1440 réel. Les mesures, elles, sont toutes au style calculé.
