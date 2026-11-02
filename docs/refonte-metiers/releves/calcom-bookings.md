# Relevé — Cal.com, Bookings — **INCOMPLET : page restée vide**

URL : https://app.cal.com/bookings/upcoming (onglets `/unconfirmed`, `/recurring`, `/past`, `/cancelled` ; vue `?view=list|calendar`).
Relevé le 01/11/2026. Coque, polices, jetons et briques : voir `calcom-availability.md` (mêmes composants).

## Pourquoi la page est vide (règle 2 non satisfaite)

Cal.com **refuse toute réservation dont l'invité est en `@example.com`** : `POST /api/book/event` répond
`400 {"message":"email_domain_cannot_receive_mail"}` (le domaine réservé n'a pas de serveur de courrier). La consigne n'autorise que
`@example.com` ; je n'ai utilisé aucune autre adresse. **Ce relevé ne couvre donc que les états vides, les onglets, la barre d'outils
et la vue calendrier.** Les lignes de réservation (Upcoming, Past, Canceled, Unconfirmed, Recurring) restent à relever quand Teo aura
choisi une adresse de test acceptable (par exemple un alias « +test » de sa propre boîte : à lui de décider, chaque réservation
envoie aussi un courriel à l'organisateur, c'est-à-dire à lui).

Préparé pour ce remplissage (tout **masqué** de la page publique) : 6 types d'événements — Visite de chantier 60 min (7733608),
Rendez-vous devis 30 (7733612), Point d'avancement 15 (7733613), Consultation technique 45 **sur confirmation** (7733614, pour
l'onglet Unconfirmed), Suivi hebdomadaire 30 **récurrent ×4** (7733615, pour Recurring), Appel rapide 15 (7733616) sur un horaire
« Permanence téléphonique 24 h/24 » (2584199) et préavis 0, pour pouvoir créer des réservations qui deviennent « Past » dans l'heure.

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

`1440-clair-upcoming-vide.png` · `1440-sombre-past-vide.png` · `1440-clair-vue-calendrier.png`.
Non capturé (page vide) : lignes de réservation, menus d'une réservation, volet de détail, 390.
