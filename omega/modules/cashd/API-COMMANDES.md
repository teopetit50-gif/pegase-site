# CASHD — raccorder un logiciel de commandes au plafond d'encours

Contrat d'intégration du raccord posé par `c2_50_raccord_commandes.sql` (27/10/2026). Il sert à tenir la promesse C38 :
« Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable. » CASHD décide ; le logiciel de
commandes retient la commande tant que CASHD ne dit pas qu'elle est livrable.

## 1. La clé

Le gérant (ou l'administrateur) crée une clé de raccord par logiciel, depuis l'espace client (CASHD → Risque client →
« Raccorder un logiciel de commandes »), ou par `public.cashd_creer_cle_commandes(client, libellé)`.

- La clé (`cashd_cmd_` + 48 caractères hexadécimaux) n'est montrée qu'une fois. CASHD n'en garde que l'empreinte
  SHA-256 ; la liste des clés affiche son préfixe (12 caractères), sa date de création et sa dernière utilisation.
- Cinq clés actives au plus par organisation. Une clé se révoque à tout moment ; une clé révoquée est refusée.
- La clé ne donne accès qu'aux deux appels ci-dessous, pour les comptes de son organisation.

## 2. Vérifier une commande

`POST https://<projet>.supabase.co/rest/v1/rpc/cashd_commande`, avec l'en-tête `apikey: <clé publique du projet>`
(la clé publique, pas une clé de service) et le corps :

```json
{ "p_cle": "cashd_cmd_…", "p_compte": "C-LEFEVRE", "p_montant": 900.00, "p_reference": "BC-2026-0412" }
```

- `p_compte` : la référence du compte client, telle qu'elle figure dans le facturier (casse indifférente).
- `p_montant` : le montant TTC de la commande, supérieur à 0.
- `p_reference` : le numéro de la commande chez vous. Recommandé : une commande rejouée avec la même référence ET le
  même montant rend la même décision, sans en créer une seconde (90 jours). Rejouée avec un autre montant, elle est
  refusée (`23505`) : une commande modifiée se vérifie sous une nouvelle référence (c2_54).

Le plafond porte sur le **cumul** (c2_54) : l'encours du compte, plus les commandes déjà autorisées (ou débloquées) pour
ce compte dans la fenêtre réglée par l'organisation (30 jours par défaut), plus la commande. Découper une commande ne
contourne donc pas le plafond.

Une commande sort de l'engagé dès qu'elle est **facturée** (c2_56) : une facture (ou un acompte) du même compte porte sa
référence, dans la colonne « commande » de l'export du facturier ou comme numéro de pièce. Chaque engagement compte donc
une seule fois : la commande, ou sa facture. Une commande que rien ne cite reste engagée jusqu'à la fin de la fenêtre :
pour ne pas bloquer à tort, faites porter la référence de la commande sur la facture.

Réponse :

```json
{ "commande": "uuid", "reference": "BC-2026-0412", "montant": 900.00, "encours": 1000.00, "engage": 300.00,
  "fenetre_jours": 30, "plafond": 1500.00, "decision": "en_attente", "livrable": false, "decide_le": null,
  "deja_verifiee": false }
```

`decision` vaut :

| decision | sens | livrable |
|---|---|---|
| `autorisee` | l'encours plus la commande reste sous le plafond (ou pas de plafond) | oui |
| `en_attente` | au-delà du plafond : une demande attend la décision d'un responsable | non |
| `debloquee` | un responsable l'a acceptée | oui |
| `refusee` | un responsable l'a refusée | non |
| `expiree` | personne n'a tranché à temps (3 jours) : elle reste bloquée | non |

## 3. Suivre une commande bloquée

`POST …/rest/v1/rpc/cashd_commande_etat` avec `{ "p_cle": "cashd_cmd_…", "p_commande": "<uuid rendu>" }` : même
réponse. Interroger toutes les 15 minutes au plus ; la décision tombe dans la file de validation de l'espace client.

## 4. Erreurs

| code | cas |
|---|---|
| `28000` | clé absente, mal formée, inconnue ou révoquée |
| `P0002` | compte inconnu de CASHD, ou commande inconnue pour cette clé |
| `21000` | plusieurs comptes portent cette référence |
| `23505` | référence de commande déjà vérifiée pour un autre montant |
| `22023` | montant nul ou négatif, référence de compte vide |

## 5. Ce que CASHD fait de son côté

Chaque vérification est journalisée (`cashd.commande_verifiee`, avec la source `raccord:<préfixe>`). Une commande
bloquée ouvre une demande `cashd.commande_hors_plafond` et alerte le commercial du compte. Aucune donnée d'un autre
client n'est lisible avec la clé.
