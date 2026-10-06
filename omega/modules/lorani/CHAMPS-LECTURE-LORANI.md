# Ce que le lecteur doit rendre pour LORANI — les courriers de la mairie

> Écrit par B5 le 06/10/2026 après le premier dépôt réel : un récépissé de dépôt PDF déposé par /espace/lorani
> sur le banc a été lu par le lecteur (A1, `lecteur/2026-10-05/claude-sonnet-5-5`) en 35 secondes… et rendu
> `a_classer`, type `autre`, motif « document administratif, sans montant ni caractère de pièce comptable ». Le
> lecteur ne connaît que les pièces de FILED. Sans les types ci-dessous, aucune date n'est jamais proposée :
> `private.lorani_lire_piece` ne traite que les pièces `lue` ou `a_verifier` dont `type_piece` est l'un des six.
> À reprendre dans `omega/CHAMPS-LECTURE.md` (coordinateur) et dans le lecteur (A1).

Règle générale du contrat (omega/CONTRAT-OUVRIER.md, § 2) : `champ` en `^[a-z][a-z0-9_.]{1,79}$`, `valeur` au format
canonique, `texte` = la citation telle qu'elle est écrite sur la page, `verifiee = true` seulement si la citation est
retrouvée dans le texte de la page, `boite` en fractions {x, y, l, h} (y depuis le haut : l'ordre des pièces réclamées
en dépend, b5_04). Une pièce d'un projet Lorani se reconnaît à `pieces.module = 'lorani'` et
`objet_type = 'lorani_projet'` ; `type_piece` du dépôt, quand le membre l'a donné, est une indication.

Les dates se rendent **`AAAA-MM-JJ`** (`private.lorani_date_lue` n'accepte que cette forme). Les numéros de dossier
tels qu'écrits (le socle les normalise : `PC 044109 26 A0042` → `PC04410926A0042`).

| `type_piece` | Le courrier | Champs attendus (`valeur`) | Ce que le socle en fait |
|---|---|---|---|
| `lorani_recepisse_depot` | Récépissé de dépôt d'une demande de permis ou d'une déclaration préalable (formulaire Cerfa remis par la mairie, cachet « déposé le ») **ou, pour un dépôt en ligne, l'accusé de réception électronique (ARE) ou l'accusé d'enregistrement électronique (AEE) du guichet numérique** : l'ARE tient lieu de récépissé (art. L.112-11 CRPA, R*423-3) ; `date_depot` = la date de réception qu'il indique (celle de l'AEE) | `date_depot` (AAAA-MM-JJ, obligatoire) ; `numero_dossier` (texte) ; facultatifs : `type_autorisation` (`pc`, `pcmi`, `pa`, `pd`, `dp`), `commune`, `demandeur` | proposition « depot » : date de dépôt et numéro du permis |
| `lorani_lettre_delai` | Lettre de la mairie notifiant un délai d'instruction majoré ou modifié (« le délai d'instruction de votre demande est porté à … mois ») | `delai_mois` (entier 1–24, obligatoire) ; `date_lettre` (AAAA-MM-JJ) ; `numero_dossier` ; facultatif : `motif_majoration` (texte libre : ABF, ERP, enquête publique…) | proposition « delai_notifie » : fin d'instruction notifiée |
| `lorani_demande_pieces` | Lettre de demande de pièces manquantes ou complémentaires (« votre dossier est incomplet ») | `date_lettre` (AAAA-MM-JJ, obligatoire) ; `pieces` : **une seule ligne, dont la valeur est un tableau jsonb** des codes tels qu'écrits, dans l'ordre de la lettre (`["PCMI 3", "PCMI 6"]` ; codes `PC5`, `PC 8`, `PCMI2`, `DPMI1`, `DP3`, `PA10-1`, `CU…`) — règle commune « Une ligne par champ, jamais deux » de `omega/CHAMPS-LECTURE.md` ; `texte` = la citation de la liste ; `numero_dossier` ; facultatif : `delai_reponse_mois` (3 par défaut dans le code) | proposition « demande_pieces » : date et liste des codes, dans l'ordre de la lettre |
| `lorani_arrete` | Arrêté du maire accordant ou refusant le permis, ou décision de non-opposition / d'opposition à une déclaration préalable, ou sursis à statuer | `decision` ∈ `accorde`, `refuse`, `non_opposition`, `opposition`, `sursis` (obligatoire) ; `date_decision` (AAAA-MM-JJ, date de signature de l'arrêté, obligatoire) ; `numero_dossier` ; facultatifs : `prescriptions` (texte), `date_notification` | proposition « decision » (favorable / défavorable) ; `sursis` → alerte « à voir avec votre conseil » |
| `lorani_certificat_tacite` | Certificat de permis tacite (ou de non-opposition tacite) délivré par la mairie sur demande (art. R*424-13) | `date_tacite` (AAAA-MM-JJ, date à laquelle le permis est réputé accordé, obligatoire) ; `numero_dossier` ; `date_certificat` | proposition « decision_tacite » : le certificat date le permis tacite, le socle signale l'écart avec son calcul |
| `lorani_constat_affichage` | Constat d'affichage du permis sur le terrain (huissier / commissaire de justice), généralement en trois passages | `date_constat` (AAAA-MM-JJ, date du passage, obligatoire) ; `passage` (`1`, `2` ou `3` ; seul le premier compte) ; `numero_dossier` ; facultatif : `commissaire` | proposition « affichage » : premier jour d'affichage, départ du recours des tiers |
| `lorani_situation_travaux` | Situation (état d'acompte, projet de décompte mensuel) d'une **entreprise de travaux** pendant le chantier : le cumul des travaux exécutés depuis le début de son marché, envoyé chaque mois à l'architecte pour visa (b5_13, b5_14) | `cumul_ht` (montant HT cumulé des travaux exécutés à ce jour, **obligatoire**, nombre canonique `72500.00`) ; `numero_situation` (entier, « Situation n° 3 ») ; `mois` (`AAAA-MM`, mois des travaux) ; `titulaire` (raison sociale de l'entreprise, telle qu'écrite) ; `lot` (numéro du lot, « 02 », « 08.1 ») ; facultatifs : `montant_marche_ht`, `cumul_precedent_ht`, `montant_periode_ht` (le socle les recalcule, ils servent au contrôle) | pose une situation « à viser » sur le marché du lot et du titulaire (`private.lorani_poser_situation_lue`) : date limite, comparaison au marché et à la précédente, alertes ; marché introuvable → « à ranger » |

Un courrier de la mairie qui n'entre dans aucun de ces six cas (avis de la commission, courrier
d'information ; l'accusé de réception électronique est un récépissé, voir plus haut) se rend `lue` avec `type_piece = 'lorani_courrier_autre'` et, s'il porte une date,
`date_lettre` : le socle ne propose rien, l'écran le montre dans « Courriers du dossier ». Un document qui n'est pas
un courrier de mairie (plan, CCTP, photo) se rend `a_classer` avec son motif, comme aujourd'hui.

Citations : pour chaque champ, le `texte` est la phrase du courrier qui porte la valeur (« Dossier déposé le
15/09/2026 », « PC5 — plan des façades »). L'écran les montre telles quelles sous la date proposée, et un membre
confirme ou écarte en les lisant.

Exemple attendu pour le récépissé déposé le 06/10 (`omega/recette-b5/courrier-reel.mjs`) :

```json
{"statut": "lue", "type_piece": "lorani_recepisse_depot", "confiance_type": 0.97, "methode": "natif", "nb_pages": 1,
 "valeurs": [
   {"champ": "date_depot", "valeur": "2026-09-15", "texte": "Le dossier a ete depose le 15/09/2026.", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.98},
   {"champ": "numero_dossier", "valeur": "PC 044109 26 A0042", "texte": "Dossier n° PC 044109 26 A0042", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.98},
   {"champ": "type_autorisation", "valeur": "pcmi", "texte": "maison individuelle et/ou ses annexes (PCMI)", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.9}
 ]}
```

## Le contrôle du dossier : planches, CCTP, DPGF, règlement du PLU (b5_16, avec A1)

Un **contrôle** rassemble N pièces d'un projet (un dossier de permis, un DCE) à un indice donné. Le lecteur lit chaque
pièce et rend ce qu'il y mesure ; le socle (`private.lorani_controler`) croise les mesures entre elles et contre les
règles, et pose des **constats** avec la page, la valeur, l'article et la correction proposée. Le lecteur ne juge rien :
il cite.

| `type_piece` | La pièce | Champs rendus (une ligne par champ, règle commune) |
|---|---|---|
| `lorani_planche` | Une planche graphique : plan de masse, plans de niveaux, coupes, façades, notice (PC1 à PC8, PCMI1 à PCMI8, planches de DCE) | `reference` (« PC2 », « A-102 ») ; `indice` ; et une ligne **par mesure lue** : `mesure.<grandeur>.<objet>` |
| `lorani_cctp` | Le cahier des clauses techniques particulières (par lot) | `lot` ; une ligne par poste décrit : `poste.<référence>` (valeur = intitulé du poste, texte = la citation) ; et les mesures écrites : `mesure.<grandeur>.<objet>` |
| `lorani_dpgf` | La décomposition du prix global et forfaitaire (par lot) | `lot` ; une ligne par poste chiffré : `poste.<référence>` (valeur = quantité canonique, texte = la ligne) |
| `lorani_metre` | Le métré d'un lot (quantités mesurées sur les plans, par l'économiste ou le lecteur) | `lot` ; par poste : `quantite.<référence>` (quantité canonique), `unite.<référence>` (« m2 », « ml », « m3 », « u ») |
| `lorani_plu_reglement` | Le règlement écrit du PLU (zone du terrain) | `zone` (« UB ») ; par règle chiffrée : `regle.<grandeur>.max` ou `regle.<grandeur>.min` (valeur canonique), et `regle.<grandeur>.article` (« UB 10 ») |

- `<grandeur>` (vocabulaire fermé, l'unité fait partie du nom) : `hauteur_faitage_m`, `hauteur_egout_m`,
  `hauteur_acrotere_m`, `recul_voie_m`, `recul_limite_m`, `distance_batiments_m`, `emprise_sol_m2`,
  `emprise_sol_pct`, `surface_plancher_m2`, `surface_taxable_m2`, `espaces_verts_pct`, `pleine_terre_pct`,
  `stationnement_nb`, `logements_nb`, `niveaux_nb`, `pente_toiture_pct`, `longueur_m`, `largeur_m`,
  `cote_altimetrique_m` (NGF). Une grandeur hors liste est ignorée par le socle (à demander au coordinateur).
- `<objet>` : ce que la mesure qualifie, en minuscules sans accent : `projet` (le tout), `batiment_a`, `facade_sud`,
  `niveau_r1`, `limite_nord`, `voie_rue_x`… Deux pièces qui mesurent la même chose doivent rendre le **même objet** :
  c'est la clé du croisement. Pour une grandeur du projet entier (`surface_plancher_m2`), `projet`.
- `<référence>` d'un poste : le numéro d'article tel qu'écrit, normalisé (`2.3.1` → `2_3_1`, `GO.04` → `go_04`).
- Valeurs canoniques : nombre avec un point (`9.85`, `312.40`), sans unité. `page` et `boite` obligatoires sur
  chaque mesure : le constat renvoie l'architecte à l'endroit exact.
- Métré contre DPGF : une DPGF rend aussi `unite.<référence>` ; une planche peut rendre `quantite.<référence>` (surface,
  longueur, volume mesuré pour ce poste sur cette planche) — le socle additionne les planches quand il n'y a pas de
  métré. Écart de plus de 5 % = constat ; DPGF sous le métré de plus de 10 % = majeur.
- La zone du terrain est connue avant la lecture du règlement (b5_17) : `public.lorani_plu` (une ligne par projet,
  `zone` = « UMa », `zones` si la parcelle en touche plusieurs, `document`, `reglement_url`), trouvée par la base au
  Géoportail de l'urbanisme. Un règlement de PLUi couvre toutes les zones : ne rendre que les `regle.*` de la zone de
  `lorani_plu.zone` (ou de chaque zone de `zones`), et `zone` = cette zone. Sans ligne `lorani_plu`, lire la zone
  écrite sur la pièce.
