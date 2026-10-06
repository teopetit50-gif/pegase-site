# Le contrat de l'ouvrier

> Posé par le coordinateur le 4 octobre 2026. Un worker ne modifie pas ce
> document : il demande au coordinateur dans son `NOTES-*.md`.

Un **ouvrier** est un service qui tourne hors de Postgres (fonction Edge Deno,
sur Supabase). Il ne voit la base que par des **portes** : des fonctions du
schéma `public` réservées au rôle `service_role`, appelées par RPC avec la clé
de service lue en variable d'environnement. Jamais de lecture ou d'écriture
directe dans une table.

Projets Supabase : recette `ygwbgpowzlbdaajlsqkn` (les ouvriers s'y déploient),
production `noepmkkplxshjbmqqxft` (le coordinateur seul y pousse).

## 1. La file des travaux

Table `public.travaux` (id **bigint**, client_id, module, genre, charge jsonb,
cle, etat `a_faire | en_cours | fait | echec`, priorite, essais, essais_max,
prochain_le, verrou_jusqu_au, pris_par, resultat, erreur).

| Porte | Signature | Ce qu'elle fait |
|---|---|---|
| `prendre_travaux` | `(p_genres text[], p_nombre int = 5, p_bail interval = '10 min', p_ouvrier text) → setof travaux` | Prend sous bail jusqu'à n travaux des genres donnés, par priorité puis date. Un bail expiré est repris par le prochain passage. |
| `finir_travail` | `(p_id bigint, p_resultat jsonb) → void` | Clôt un travail en cours. |
| `echouer_travail` | `(p_id bigint, p_erreur text, p_reprendre bool = true) → text` | `repris` : reprise à délai croissant (1, 2, 4… min, plafond 6 h) jusqu'à `essais_max` ; `echec` : définitif, alerte critique levée chez le client. |
| `deposer_travail` | `(p_client uuid, p_module text, p_genre text, p_charge jsonb, p_cle text, p_priorite smallint) → bigint` | Dépose un travail ; idempotent sur (genre, cle) tant qu'il est à faire ou en cours. |
| `publier_evenement` | `(p_client uuid, p_evenement text, p_charge jsonb, p_cle text) → int` | Dépose un travail chez chaque module abonné (`private.abonnements`). |
| `battre_ouvrier` | `(p_module text, p_genres text[], p_detail jsonb, p_attendu interval = '15 min') → int` | Bat le battement du module chez chaque organisation qui a eu du travail de ces genres dans la journée. À appeler à chaque passage, même à vide. |

Chaque passage d'un ouvrier : `prendre_travaux` → traiter chaque travail dans
un `try` → `finir_travail` ou `echouer_travail` → `battre_ouvrier`. Jamais
d'exception qui sort du passage sans avoir rendu le travail.

## 2. L'ouvrier LECTEUR (session A1)

Le socle dépose lui-même le travail à la réception d'une pièce rattachée à un
objet (trigger `pieces_demander_lecture`) :

- genre : **`lecteur.lire`**
- module : celui de la pièce (`filed`, `tavaro`, `lorani`, `tamila`…)
- charge : `{"piece": "<uuid>"}`
- clé : `piece:<uuid>`

Le lecteur prend `['lecteur.lire']`. Pour chaque travail :

1. `commencer_lecture(p_piece uuid) → boolean` : passe la pièce en
   `en_lecture`. `false` = la pièce n'est plus à lire (déjà lue, rejetée,
   effacée) : `finir_travail` avec `{"ignore": "…"}`.
2. Lire `public.pieces` **par une requête RPC de lecture à ajouter si besoin**
   (demande au coordinateur) ou, en attendant, par la charge : le chemin du
   fichier est `pieces.chemin` dans le bucket Storage `omega-clients`, le
   `mime`, le `module`, le `type_piece` attendu et `chiffrement`.
   Posée au lot 19 : `piece_a_lire(p_piece uuid) → jsonb`, la ligne entière
   de `public.pieces` (`chemin`, `mime`, `module`, `objet_type`, `statut`,
   `chiffrement`…), `null` si absente. Avec elle : `consommation_ia_jour
   (p_client uuid) → numeric` (euros d'IA dépensés aujourd'hui, heure de
   Paris) et `lire_parametre(p_cle text) → text` (réglages globaux, dont
   `plafond_ia_jour_client`).
3. Lire le fichier, puis `enregistrer_lecture(p_piece uuid, p_resultat jsonb,
   p_version text)`. **Le format du résultat est celui du socle, pas un autre** :

```json
{
  "statut": "lue | a_verifier | a_classer | rejetee | echec",
  "type_piece": "facture",
  "confiance_type": 0.96,
  "methode": "natif | ocr | mixte | xml | tableur",
  "nb_pages": 2,
  "motif": "texte libre, 500 car. max, obligatoire si rejetee / echec / a_classer",
  "pages": [
    {"n": 1, "methode": "natif | ocr | ocr_manuscrit | vision", "texte": "…", "confiance": 0.98, "largeur": 595, "hauteur": 842}
  ],
  "valeurs": [
    {"champ": "fournisseur.nom", "valeur": "Société X", "texte": "SOCIETE X SAS", "page": 1,
     "boite": {"x": 0.08, "y": 0.11, "l": 0.3, "h": 0.02}, "source": "ia | xml | regle",
     "confiance": 0.93, "verifiee": true, "controle": "citation retrouvée page 1"}
  ]
}
```

   - `champ` : `^[a-z][a-z0-9_.]{1,79}$`. Les champs attendus par module sont
     dans `omega/CHAMPS-LECTURE.md` (le coordinateur l'écrit ; FILED d'abord).
   - `verifiee = true` seulement si `texte` est retrouvé dans le texte de la
     page citée. Une valeur sans citation retrouvée est `verifiee = false`.
   - **Une pièce chiffrée** (`chiffrement = 'dossier:v1'`, Tamila) exige
     `texte_chiffre` et `chiffre` en base64 et **aucun clair** : hors périmètre
     de la vague 1, `echouer_travail` non définitif avec motif
     `CHIFFREMENT_NON_PRIS_EN_CHARGE`.
   - Plusieurs factures dans un fichier : lire la première comme pièce, et
     rendre dans le résultat `"decoupage": [{"pages": [3,4]}, …]` ; le
     coordinateur ajoute la porte qui crée les pièces filles
     (`pieces.piece_mere_id`).
   - La version du lecteur (`p_version`) : `lecteur/<date>/<modèle>`.
4. `enregistrer_lecture` publie lui-même l'événement `piece_lue.<module>` ;
   le lecteur ne le publie pas.
5. `finir_travail(id, {"pages": n, "valeurs": n, "statut": "…", "modele": "…",
   "tokens_entree": n, "tokens_sortie": n, "cout_eur": x})`.
6. Illisible : `enregistrer_lecture` avec `statut = 'echec'` et le motif, puis
   `finir_travail` (le travail est fait, la pièce est en échec). Panne d'IA ou
   de fournisseur : `echouer_travail` non définitif, motif `IA_NON_BRANCHEE`
   ou `FOURNISSEUR_INDISPONIBLE`.
7. Fin de passage : `battre_ouvrier('lecteur', ['lecteur.lire'], {…})`.

Plafond : réglage `plafond_ia_jour_client` lu par `lire_parametre` (5 € par
défaut), consommation du jour par `consommation_ia_jour`. Au-delà,
`echouer_travail` non définitif, motif `PLAFOND_IA`.

## 3. L'ouvrier EXPÉDITEUR (session A2)

Le socle dépose un travail pour chaque envoi `pret` chez un fournisseur
`branche` (`private.tache_envois`, toutes les 5 min) :

- genre : **`envois.<fournisseur>`** (`envois.brevo`, `envois.brevo_sms`…)
- clé : `envoi:<uuid>`
- charge : lire `private.confier_envoi` pour le détail exact (le coordinateur
  le recopie ici dès que A2 le demande).

Clôture : `finir_travail(id, {"fournisseur_id": "…", "remis_a": "…"})`. Les
événements de remise (remis, rebond, plainte) reviennent par webhook et
s'écrivent par la porte `noter_remise`, **idempotente sur la clé** :

| Porte | Signature |
|---|---|
| `noter_remise` | `(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb, p_survenu_le timestamptz, p_cle text) → boolean` |

`p_evenement` : `remis | rebond_temporaire | rebond | plainte | refuse` ;
`p_detail` : `{code, raison}` ; `p_cle` : l'identifiant de l'événement chez le
fournisseur (un même événement rejoué rend `true` sans rien réécrire) ;
`false` si l'envoi (fournisseur, référence) est inconnu. (Lot 18c.)

Un fournisseur ne devient `branche = true` que par une migration du
coordinateur, après un envoi réel réussi.

## 4. La RÉCEPTION (session A2)

Posée au lot 18 (table `public.receptions` : id bigint, client_id, entite_id,
module, canal, boite, identifiant_externe, de_adresse, de_empreinte, de_nom,
sujet, corps, corps_html, pieces, detail, en_reponse_a → envois, fil, langue,
statut `nouvelle | lue | traitee | ignoree | indesirable`, traite_par, recu_le).

| Porte | Signature | Ce qu'elle fait |
|---|---|---|
| `resoudre_boite` | `(p_canal text, p_boite text) → jsonb` | Retrouve l'expéditeur dont `identite` = boîte (courriel) ou `parametres.phone_number_id` = boîte (WhatsApp). Rend `{client_id, entite_id, module, expediteur_id}`, ou `null` : boîte inconnue, on ignore. |
| `deposer_reception` | `(p_client uuid, p_canal text, p_boite text, p_identifiant text, p_de text, p_de_nom text, p_sujet text, p_corps text, p_corps_html text, p_pieces jsonb = '[]', p_detail jsonb = '{}', p_recu_le timestamptz) → jsonb {id, nouvelle}` | Idempotente sur (client, canal, identifiant externe). Rattache à l'envoi d'origine (`detail.envoi_id` ou `detail.en_reponse_a` = référence externe citée). Publie elle-même `reception.nouvelle`. |

- `canal` : `email | whatsapp | sms | formulaire`.
- `p_pieces` : `[{nom, mime, taille, chemin}]` ; les fichiers sont déposés
  **avant** dans le bucket `omega-clients` sous
  `<client_id>/receptions/<identifiant externe>/<nom>`.
- `p_detail` : clés consommées `module`, `entite_id`, `envoi_id`,
  `en_reponse_a`, `fil`, `langue` ; le reste est gardé tel quel.

## 5. Ce qu'un ouvrier ne fait jamais

- Lire ou écrire une table directement.
- Publier un événement à la place du socle.
- Marquer un fournisseur branché.
- Garder un secret ailleurs que dans les variables d'environnement de la
  fonction ou dans le coffre (Vault).
- Écrire du contenu de pièce dans un journal ou un log.
- Donner au coordinateur du SQL avec `DROP` ou `DELETE` : l'outil de pose
  bloque dessus. `create or replace`, `if not exists`, `on conflict`.
