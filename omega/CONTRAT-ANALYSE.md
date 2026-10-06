# CONTRAT-ANALYSE — les lectures longues d'un dossier (lecteur.analyser)

Écrit par A1 le 06/10/2026, d'accord avec B4 (Tamila). B5 (Lorani) a choisi la lecture pièce par pièce
(b5_16) et n'en a pas besoin pour l'instant. Le lecteur est prêt (`omega/functions/lecteur/analyse/`) ;
il manque **le socle** : la table et deux portes, à poser par le coordinateur ou A5. Tant qu'elles
n'existent pas, le lecteur ne prend aucun travail d'analyse (il faut aussi `LECTEUR_ANALYSES=1` dans
les secrets de la fonction).

## Le parcours

1. Le module dépose une analyse (Tamila : `tamila_demander_analyse(dossier, type)`, écrite par B4) :
   une ligne `analyses` et un travail `lecteur.analyser` `{"analyse": "<uuid>"}`.
2. Le lecteur appelle `commencer_analyse(p_analyse)`, analyse dans le temps de son passage, puis
   `terminer_analyse(p_analyse, p_resultat, p_version)`.
3. Si le temps manque, `statut = en_cours` avec l'état : le socle remet un travail `lecteur.analyser`
   pour le passage suivant, qui reprend là où l'autre s'est arrêté.

## La table `public.analyses` (proposition)

`id uuid`, `client_id`, `module`, `objet_type`, `objet_id`, `type` (`tamila.chronologie`…),
`statut` (`demandee`, `en_cours`, `finie`, `partielle`, `echec`), `pieces uuid[]` (le périmètre),
`resultat jsonb` (module en clair), `resultat_chiffre bytea` (module chiffré), `etat jsonb` /
`etat_chiffre bytea` (entre deux paliers), `comptes jsonb` (`{info, attention, critique}`),
`sans_source int`, `pieces_non_lues uuid[]`, `cout_eur numeric`, `appels_ia int`, `modele text`,
`version text`, `motif text`, `demandee_par`, `demandee_le`, `finie_le`.
**Contrainte demandée par B4** : pour `module = 'tamila'`, `resultat is null and etat is null`
(seuls `resultat_chiffre` et `etat_chiffre` peuvent porter le contenu). RLS : celle du module
(Tamila : `private.tamila_voit_dossier_pour`).

## `commencer_analyse(p_analyse uuid) → jsonb` (serveur)

Passe l'analyse `demandee` ou `en_cours` en `en_cours` et rend, ou `null` s'il n'y a plus rien à faire :

```json
{"analyse": "uuid", "client": "uuid", "module": "tamila", "type": "tamila.chronologie",
 "chiffrement": "dossier:v1",
 "pieces": [{"piece": "uuid", "nom": "conclusions.pdf", "role": null, "chiffrement": "dossier:v1",
             "pages": [{"n": 1, "texte": "", "texte_chiffre": "<base64 de pieces_pages.texte_chiffre>"}]}],
 "etat": null, "etat_chiffre": "<base64 ou null>"}
```

Les pages sont celles que le lecteur a déjà lues (`pieces_pages`) : une pièce pas encore lue n'entre pas
(ou l'analyse attend). `texte_chiffre` en base64 (`encode(texte_chiffre, 'base64')`) ; le lecteur
accepte aussi l'hexadécimal `\x…`.

## `terminer_analyse(p_analyse uuid, p_resultat jsonb, p_version text) → jsonb` (serveur)

```json
{"statut": "finie | partielle | en_cours | echec", "type": "tamila.chronologie",
 "comptes": {"info": 3, "attention": 1, "critique": 0}, "sans_source": 2,
 "pieces_lues": 12, "pieces_non_lues": ["uuid"], "cout_eur": 0.84, "appels_ia": 13, "modele": "claude-sonnet-5-5",
 "motif": "…(échec seulement)…",
 "resultat": {…} | "resultat_chiffre": "<base64>",
 "etat": {…} | "etat_chiffre": "<base64>"}
```

- `finie` / `partielle` : ranger le résultat ; `partielle` = plafond de coût atteint, `pieces_non_lues` dit
  lesquelles manquent.
- `en_cours` : ranger l'état et **déposer un nouveau travail** `lecteur.analyser` pour la même analyse.
- `echec` : `motif` (type inconnu, dossier chiffré sans coffre serveur…).
- Pour un module chiffré, refuser tout `resultat` / `etat` en clair (22023), comme `enregistrer_lecture`.

## Le résultat (une fois déchiffré)

```json
{"type": "tamila.chronologie", "statut": "finie", "resume": "…",
 "constats": [{"code": "evenement", "titre": "…", "texte": "…", "gravite": "info",
               "donnees": {"date": "2026-03-03", "precision": "jour", "evenement": "…", "acteur": "client", "nature": "fait"},
               "citations": [{"piece": "uuid", "page": 1, "lignes": [2, 2], "extrait": "…", "verifiee": true,
                              "controle": "extrait retrouvé page 1, lignes 2-2"}],
               "source": true}],
 "pieces_lues": 2, "pages_lues": 2, "sans_source": 0, "couts": {…}}
```

Seuls les constats dont au moins une citation est vérifiée sont rendus. Une citation est vérifiée si
l'extrait se retrouve dans les lignes citées, à deux lignes près (lignes = texte de la page découpé
par fins de ligne, numérotées à partir de 1).

## Chiffrement (Tamila)

Clé du dossier rendue par le coffre (`cle_piece` sur l'une de ses pièces) ; format Tamila
`01 ‖ nonce 12 ‖ chiffré ‖ étiquette 16`, AES-256-GCM, **sans donnée associée** (comme les lectures et
`aesgcm.ts` de B4), sur le JSON UTF-8, en base64. Un cabinet sans coffre serveur (mode local) : l'analyse
finit en `echec` motivé, sans reprise.

## Les types (lecteur/analyse/types_tamila.ts)

| type | codes | `donnees` | limites |
|---|---|---|---|
| `tamila.prelecture` | fait, pretention, moyen, piece_visee | partie, date?, montant_cents?, fondement?, piece_visee? {numero?, intitule} | 60 pièces |
| `tamila.chronologie` | evenement | date, precision, evenement, acteur, acteur_libelle?, nature ; triés par date | 200 pièces |
| `tamila.contradictions` | contradiction | sujet, portee, affirmation_a, piece_a, affirmation_b, piece_b ; « critique » seulement si les deux citations sont vérifiées | 200 pièces |
| `tamila.bordereau` | piece | numero (continu, ordre chronologique), intitule, date?, nature, piece, pages, deja_communiquee?, observations? | 200 pièces |

Toutes : 3 000 pages, 400 pages par pièce, 15 € par analyse (sous `plafond_ia_jour_client`).
