# Relevé — Linear, Inbox

URL : https://linear.app/omegaaii/inbox — relevé le 01/11/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900, **sombre et clair**. Barre latérale et carte `main` : `linear-home.md` ; ticket ouvert à droite : mêmes composants que `linear-ticket.md` ; icônes : `linear-commun/`.

## Remplissage et limite

L'Inbox ne reçoit que des notifications ; l'espace n'a qu'un membre (Wizyy) et on n'invite personne, donc pas de mentions, d'assignations ni de commentaires « d'autres personnes ». Seule source utilisable : les **rappels** (« Remind me », raccourci **⇧ H** sur un ticket, champ « Remind me at… », propositions « An hour from now / In 3 hours / Tomorrow / Next week / A month from now / Next cycle / Custom… », la saisie libre « in 2 minutes » est comprise). Créés le 01/11 sur mes tickets OME-24, OME-28, OME-31, OME-47, OME-52 → 5 notifications **non lues** ; les 6 existantes (OME-1, 2, 3, 5, 6 et « Welcome to Linear ») sont lues. Ouvrir OME-3 l'a affiché à droite (déjà lu, rien modifié). 11 lignes au total : la page montre les états non lu / lu, l'icône de statut, la priorité, l'heure relative. Les types « mention », « assigned », « status changed », « comment » ne peuvent pas être produits sans un deuxième compte : **non relevés** (même ligne, autre avatar et autre phrase).

## Structure (1440×900, sombre)

```
main @244,8 1188×856 — deux volets
├ volet liste @245 400 de large (filet droit 0.5px)
│  ├ en-tête 44 : « Inbox » 13px/500 + « … » 28×28 · à droite : « Snooze / archives » (icône boîte), Filter, Display options (28×28)
│  └ lignes `a` 399.5×55 (r 8px, transition color 0.15s), marges 8px → contenu @261 367.5 de large :
│      ├ avatar 32×32 rond : rappel = réveil 20×20 sur fond lch(52.418 61.103 288.421 / 0.133) + bd 1px lch(52.418 61.103 288.421 / 0.267) ; « Welcome » = logo Linear
│      └ texte @305 323.5 de large, 2 lignes :
│          ligne 1 (17px) : pastille non lu 8×8 ronde (sombre lch(47.918 59.303 288.421), clair lch(53 52.26 286.91), m-top 1px) · « OME-24 » 13px/500 ls −0.26px · titre 13px/500 (tronqué « … ») · icône de statut 14×14 à droite
│          ligne 2 (16px) : « You asked to be reminded about this issue » 12px/450 tertiaire · icône de priorité 14×14 (si priorité) · heure « 3min / now / 4d » 12px/450 tertiaire à droite
└ volet droit @645 787 de large : vide = icône boîte de réception (illustration) + « 5 unread notifications » ; sinon le ticket complet (en-tête avec fil « OME-3 Import your data », étoile, « … », puis à droite cloche, réveil, « Archive »)
```

## Styles

| Élément | Typo | Sombre | Clair |
|---|---|---|---|
| Titre + identifiant, non lu | 13px / 500 (id ls −0.26px) | lch(90.451 1.2 272) | lch(19.588 1.25 282) |
| Titre, lu | 13px / 500 · **opacity 0.7** | lch(61.803 1.2 272) | lch(18.588 1.25 282) à 0.7 |
| Sous-ligne et heure | 12px / 450 | lch(61.803 1.2 272) | lch(39.176 1.25 282) |
| Pastille non lu | 8×8 r 50% | lch(47.918 59.303 288.421) | lch(53 52.26 286.91) |
| Ligne sélectionnée (élément ouvert) | — | fond plus clair (capture `1440-sombre-notification-ouverte`) | lch(94.44 0.5 282) environ (capture claire) |
| Compteur dans la barre latérale « Inbox 5 » | 11px / 450 | — | — |

Le titre de l'onglet du navigateur devient « Inbox (5) ».

## Paliers

390×844 : une seule colonne (liste pleine largeur, lignes 55px, marges 8px) ; ouvrir une notification affiche le ticket en plein écran ; boutons d'en-tête conservés (archives, filtre, affichage).

## Captures (`captures/linear-inbox/`)

`1440-sombre-liste.png` (une info-bulle « Go to my issues G then M » traîne en haut à gauche, souris sur la barre latérale), `1440-sombre-notification-ouverte.png`, `1440-clair-notification-ouverte.png`, `390-sombre.png`, `390-clair.png`.
