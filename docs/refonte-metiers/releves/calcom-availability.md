# Relevé — Cal.com, Availability (liste des horaires et page d'un horaire)

Relevé le 01/11/2026 au `getComputedStyle` (couleurs lab/oklab converties en hex par un canevas ; `a0.08` = alpha 0,08).
Liste : https://app.cal.com/availability — horaire : https://app.cal.com/availability/2584173 (« Équipe chantier — après-midi »).
Cal.com **suit le thème du système** (classe `dark` sur `<html>`) : les deux thèmes ont été relevés par émulation.

## Ce qui a été créé

Par l'API tRPC de l'application (`availability/schedule.create` puis `schedule.update`, même session) — le bouton « Continue » du
dialogue « Add a new schedule » ne réagissait pas dans le navigateur intégré. 10 horaires (fuseau America/Guadeloupe sauf mention) :
Équipe chantier — matin (2584171 : lun–ven 7 h–12 h, sam 8 h–11 h) · Équipe chantier — après-midi (2584173) · Bureau d'études (2584174,
plages coupées) · Astreinte week-end (2584175) · Rendez-vous clients Martinique (2584176, America/Martinique) · Conducteur de travaux
(2584177) · Réunions hebdomadaires (2584178) · Visites de chantier (2584179) · Siège Paris (coordination) (2584180, Europe/Paris) ·
Saison cyclonique (réduit) (2584181). Exceptions de dates (11/11 indisponible, 20/11, 27/11, 24/12) sur 7 d'entre eux.
« Working hours » (Default) est l'horaire d'origine de Teo, non modifié. « Team availability » non rempli (pas d'équipe, aucune invitation).

## Polices et jetons

- **Cal Sans** variable (`CalSansVF`, licence OFL) pour tout : `fontSans` et `fontHeading` pointent sur le même fichier. Repli Arial.
- Titres h3 **20/700/28, interlettre 0,5 px**, #070a0d ; texte 14/400/20.
- Les composants récents (« coss ui » : classes `bg-card`, `shadow-xs/5`) utilisent des couleurs Tailwind directes plutôt que les
  variables `--cal-*`. Valeurs calculées sur les éléments (clair · sombre) :
  fond de page #fafafa · #111111 ; carte principale `<main>` #ffffff · #141414, bord 1px #111111 a0.06 · #ffffff a0.05, **r 16px** ;
  texte fort #262626 · #f5f5f5 ; texte secondaire #696969 · #818181 ; titre #070a0d · #fafafa ; sous-titre de page #3c3e44 · #d4d4d4.
- Variables `--cal-*` (clair · sombre), pour mémoire : bg #fff · #0f0f0f ; bg-muted #f6f7f9 · #171717 ; bg-subtle #eeeff2 · #262626 ;
  bg-emphasis #e5e7eb · #404040 ; text #3c3e44 · #d4d4d4 ; text-subtle #6b7280 · #a3a3a3 ; text-muted #9ca3b0 · #a3a3a3 ;
  text-emphasis #070a0d · #fafafa ; border #d1d5db · #4d4d4d ; border-subtle #e5e7eb · #262626 ; brand #111827 · #ffffff ;
  bg-success #e4fbed · #285231 ; text-success #285239 · #e4fbe9 ; bg-error #f9e3e1 · #772522 ; text-error #811d1d · #f9e3e1.
- Icônes : **Lucide** (trait 2, `stroke-linecap/linejoin round`, 16 px) repérées par `data-testid` : clock, globe, star, copy, trash,
  pencil, plus, ellipsis. Une recopie peut utiliser lucide-react aux mêmes noms.

## Coque (1440×900)

```
page #fafafa
├─ BARRE LATÉRALE 0..256 (sans fond propre) : logo « Cal.com » + loupe + avatar (haut) ;
│   liens 232×32 @x 12 · p 8px (8px 32px 8px 8px quand il y a un chevron) · r 10px · gap 8 · icône 16 · 14/500/20
│     repos #505050 (sombre #c7c7c7) · actif bg #1a1a1a a0.04 (sombre #ffffff a0.04) texte #262626 (#f5f5f5)
│   ordre : Home · Links · Events · Bookings · Availability · Teams · Apps › · Routing · Workflows · Insights ›
│   bas : View public page · Copy public page link · Settings · « © 2026 Cal.com, Inc. v.… » ; en bas à droite « Agent » + historique
└─ CARTE <main> 256,8 1176×852 · bg #fff · bd 1px #111111 a0.06 · r 16px · ombre `0 10px 15px -3px #0000000d, 0 4px 6px -4px #0000000d`
    contenu @x 297 (p ≈ 40 / 24), défilement interne (barre 6 px à droite)
```

## Liste — arbre

```
en-tête : h3 « Availability » 20/700/28 ls .5 @297,33 + p « Configure times when you are available for bookings. » 14/400/20 #3c3e44
  à droite : CONTRÔLE SEGMENTÉ nav 253×34 · bg #1a1a1a a0.04 · r 10px · p 2px · gap 2
     items a h 30 · p 0 9px · r 8px · 14/500/20 : « My availability » #262626 (actif) · « Team availability » `oklab(0.522 0 0 / 0.72)`
     indicateur glissant span bg #fff r 8px ombre `0 1px 2px #0000000d` · transition width/height .2s cubic-bezier(.4,0,.2,1)
  + bouton « + New » 75×32 · bg #262626 · texte #fafafa 14/500/20 · r 10px · p 0 11px · ombres `inset 0 1px 0 #ffffff29, 0 1px 2px #26262640`
CARTE DE LISTE 297,113 1094×1432 · bg #fff · bd 1px #0d0d0d a0.08 · r 16px · ombre `0 1px 2px #0000000d`
  ul 11 lignes ; li p 16px 24px · filet bas 1px #0d0d0d a0.08 · hauteur selon le nombre de plages (105 à 129)
    nom a 14/600/20 #262626 + badge « Default » (12/500/16 #007a55 · bg #00bf80 a0.08 · r 6px · p 0 3px · h 18) gap 8
    une ligne par plage « Mon - Fri, 7:00 AM - 12:00 PM » 14/400/20 #696969 (les jours consécutifs fusionnés « Mon - Thu »)
    fuseau : icône globe 16 + « America/Guadeloupe » 14/400/20 #262626, gap 6, 12 px sous les plages
    à droite bouton ⋯ 32×32 · bg #fff · bd 1px #141414 a0.10 · r 10px · ombre `0 1px 2px #0000000d`
  pied 52 · p 16px 24px : « Temporarily out-of-office? Add a redirect » 14/400/20 #696969 (lien souligné)
```

États : **survol d'une ligne** bg #fafafa ; **menu ⋯** `role=menu` 136×94 aligné à droite sous le bouton · bg #fff · bd 1px #0d0d0d a0.08 ·
r 10px · ombre `0 10px 15px -3px #0000000d, 0 4px 6px -4px #0000000d` · items 28 · p 4px 8px · r 6px · gap 8 · 14/400/20 :
« ☆ Set as default » · « ⧉ Duplicate » · « 🗑 Delete » (#c10007).

## Page d'un horaire — arbre (1440×900)

```
en-tête : ← (bouton) · nom éditable (input sans bord, Cal Sans 20/700/28 ls .5 #070a0d) + crayon 16 ;
  à droite « Set as default » (texte 14/500 + interrupteur) · bouton poubelle 32×32 (icône #c10007, bd #141414 a0.10, r 10px) ·
  « Save » 56×32 bg #262626 texte #fafafa r 10px (désactivé tant que rien n'a changé ; état désactivé non mesuré au style calculé, visible grisé sur la capture)
COLONNE GAUCHE 297..1111 (814) :
  CARTE « Weekly hours » 814×444 · bg #fff · bd 1px #0d0d0d a0.08 · r 16px · **::before inset 0 bg #000 a0.03 r 15px** (le haut paraît gris)
    tête p 16px 24px : « Weekly hours » 14/600/20 #262626 + « Set the times you are available each day » 14/400/20 #696969
    PANNEAU intérieur 814×372 · bg #fff · bd 1px · r 14px 14px 16px 16px — 7 lignes de 53 (p 12px 24px, filet bas, grid subgrid gap 8px 24px)
      interrupteur 30×18 (actif bg #262626 / pastille 16 #fff ombre) + jour 14/500/16 #262626 (colonne ≈ 104)
      jour actif : champ heure (group 100×28, input combobox 98×26 · 14/400/26 · p 0 9px · r 10px · bd 1px #141414 a0.10) « 1:00pm » – « 5:30pm » + × (28×28)
      jour inactif : « Unavailable » 14/400/20 #696969
      à droite : + (ajouter une plage) et ⧉ (copier vers…) 28×28 · bg #fff · bd 1px #141414 a0.10 · r 10px · ombre `0 1px 2px #0000000d`
  CARTE « Date overrides ⓘ » (même gabarit) : « Add dates when your availability changes from your daily hours. » + bouton « + Add an override »
    lignes 77 (p 16px 24px) : date « Friday, November 20 » 14/500/20 #262626 + plage « 10:00 AM - 3:00 PM » 14/400/20 #696969 ;
    à droite crayon et poubelle (#c10007) 28×28
COLONNE DROITE 1135..1391 (256) :
  « Timezone » label 14/500/16 + select 256×32 (bg #fff · bd #141414 a0.10 · r 10px · p 0 11px · chevrons ↕)
  filet ; carte 256×94 r 16px : « Something doesn't look right? » 14/500/16 + bouton « Launch troubleshooter » (p 4px 11px, r 10px)
```

États : **liste des heures** (clic sur un champ) : `listbox` 88 de large sous le champ, p 4px, 97 options par quart d'heure
« 12:00am … 11:45pm », option 80×28 · p 4px 8px · r 6px · 14/400/20, défilement interne (~12 visibles).

## Sombre (mesuré)

Page #111111 · main #141414 bd #ffffff a0.05 · cartes #191919 bd #ffffff a0.06 (::before #191919, l'effet gris disparaît) ·
filets de ligne #ffffff a0.06 · titre #fafafa · sous-titre #d4d4d4 · nom #f5f5f5 · plages #818181 · fuseau #f5f5f5 ·
bouton ⋯ bg #ffffff a0.03 bd #ffffff a0.08 · badge Default #00d492 sur #00bb7c a0.16 · segmenté bg #ffffff a0.04, indicateur #ffffff a0.08,
« Team availability » #818181 a0.72 · « New » inversé (bg #f5f5f5, texte #262626) · interrupteur actif #f5f5f5 · champs d'heure sans fond, bd #ffffff a0.08 ·
lien actif de la barre latérale #ffffff a0.04, autres liens #c7c7c7.

## 390×844

Barre latérale remplacée par : **barre du haut 390×56** (logo, loupe, avatar) et **barre d'onglets flottante en bas** (footer fixe 390×70 :
bouton rond « Agent » 54×54 à x 24 ; pilule 198×54 à x 96, bg #fff, bd 1px a0.08, `backdrop-filter: blur(8px)`, ombre `0 10px 15px -3px`,
4 icônes 44×44 : Links, Events, Bookings, ⋯ ; bouton rond « + » 48×48 bg #262626 à x 326). Le titre et le segmenté disparaissent de la liste ;
carte pleine largeur 358 (x 16), lignes p 16px 24px. Page d'un horaire : nom tronqué, ⋯ et Save en haut ; chaque jour sur 2–3 lignes
(interrupteur + jour, puis champs, puis + et ⧉).

## Captures (`captures/calcom-availability/`)

`1440-clair.png` · `1440-sombre.png` · `1440-clair-menu-ligne.png` (menu ⋯ + survol) · `1440-clair-horaire.png` · `1440-sombre-horaire.png` ·
`1440-clair-horaire-liste-heures.png` · `390-clair.png` · `390-sombre.png` · `390-sombre-horaire.png`.
