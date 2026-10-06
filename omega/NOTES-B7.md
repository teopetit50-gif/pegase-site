# NOTES — session B7 (identité des tiers)

Branche `worker-b7`. Mise à jour : 6 octobre 2026, 3 h 35 Paris. **B7 terminé** (en attente seulement de la clé Sirene chez Teo).

| Jauge | % | Ce que ça veut dire |
|---|---|---|
| **Mécanique** | 100 | Trois lots posés sur la recette, dix fichiers pgTAP et le scénario verts, ouvrier v2 déployé (e77fabb), cron chaque minute, **premier passage réel réussi le 6/10 à 0 h 43 Z** (facture Orange SA : VIES valide + Sirene en complément, 1 travail, 1 recontrôle). Seul manque, hors de ma main : `SIRENE_API_KEY` (repli annuaire en attendant). |
| **Livrable client** | 70 | Sur la recette, la facture Orange porte dans ses contrôles « Identité confirmée par VIES le 06/10/2026 », sans geste humain, et la fiche fournisseur son verdict ; ce qui manque est ailleurs : la production (coordinateur), le bouton « revérifier » et l'affichage « vérifié le … par … » sur la fiche (A3, contrat en section 9 b), la clé Sirene (Teo). |

## 1. Le scénario

Ce qui existe déjà (lot 4d d'A4, posé sur la recette le 5/10) :

- `private.filed_controles_identite(p_facture)` est appelée par `filed_controler_facture` et pose
  quatre contrôles : `identite.tva_intracom` (format + clé, en SQL), `identite.siren` (clé de Luhn, en
  SQL), `identite.coherence` (le SIREN que porte la TVA FR = le SIREN lu) et `identite.registre`.
- Pour `identite.registre`, le contrôle lit `private.filed_verification_recente(client, registre,
  identifiant, 90 jours)` dans `public.filed_verifications_tiers`. S'il n'y a rien, il **demande** une
  vérification (`private.filed_demander_verification` → une ligne `repondu_le is null`) et pose
  « attention : vérification demandée ». Un seul registre par facture : VIES si le numéro de TVA tient,
  Sirene sinon.
- La porte de réponse existe : `public.filed_repondre_verification(id, 'valide'|'invalide'|'indisponible',
  preuve)` (service_role). **Mais rien ne lit les demandes ouvertes** : aucun travail n'est déposé dans
  `travaux`, aucun ouvrier ne les prend. C'est le trou que B7 bouche.

Le scénario complet, de bout en bout :

1. Une facture est lue (lecteur A1) → `filed.integrer` crée ou rattache le fournisseur → `filed_controler_facture`
   → `filed_controles_identite` → ligne ouverte dans `filed_verifications_tiers` (registre `vies` ou `sirene`).
2. **Nouveau (B7)** : un déclencheur sur `filed_verifications_tiers` dépose un travail
   `identite.verifier` (module `filed`, charge `{verification, registre, identifiant, fournisseur}`,
   clé `verification:<uuid>`). Les lignes déjà ouvertes (dont celle de la facture de ce soir) sont
   rattrapées par la migration.
3. L'ouvrier `identite` (fonction Edge, cron chaque minute comme le lecteur) prend `['identite.verifier']`,
   lit la demande par la porte `identite_a_verifier`, et :
   - **cache** : si le même (registre, identifiant) a été vérifié il y a moins de 30 jours (table globale
     `public.identites_registre`, les registres sont publics donc le cache n'est pas par client) et que la
     charge ne porte pas `"force": true`, il répond depuis le cache, source `cache`, sans appel réseau ;
   - **Sirene** (registre `sirene`) : `GET https://api.insee.fr/api-sirene/3.11/siren/{siren}` avec la clé
     `SIRENE_API_KEY` → unité légale active (`A`) = `valide` ; cessée (`C`) ou 404 = `invalide` avec le motif
     dans la preuve ; 429/5xx/réseau = indisponible (voir 5) ;
   - **VIES** (registre `vies`) : `POST https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`
     `{countryCode, vatNumber}` → `valid` = `valide`/`invalide` ; `MS_UNAVAILABLE`, `SERVICE_UNAVAILABLE`,
     `TIMEOUT`, `*_MAX_CONCURRENT_REQ` = indisponible ;
   - **cohérence** (TVA FR) : la clé `(12 + 3 × (SIREN mod 97)) mod 97` est recalculée côté ouvrier, et pour un
     numéro FR l'ouvrier interroge **aussi Sirene** sur le SIREN porté : la réponse s'écrit comme
     vérification complémentaire (registre `sirene`, même client, même fournisseur) ; la preuve VIES note si
     les deux registres désignent la même entreprise (nom VIES ≈ dénomination Sirene).
4. L'ouvrier écrit par la porte `noter_identite` : la réponse (via `private.filed_repondre_verification`),
   le cache global, les compléments, puis **recontrôle les factures du fournisseur** en `a_valider` /
   `bloquee` (`private.filed_recontroler_fournisseur`, ou `filed_controler_facture` facture par facture).
   `filed_controler_facture` efface et repose les contrôles : `identite.registre` passe à `ok` avec le
   message d'A4 « SIREN confirmé par Sirene le JJ/MM/AAAA » / « Numéro de TVA confirmé par VIES le … » — c'est
   le « vérifié le … par … » que voit le client. Une réponse `invalide` le rend `bloquant`.
5. Indisponibilité (VIES tombe souvent) : `echouer_travail` non définitif (`FOURNISSEUR_INDISPONIBLE`,
   reprise à délai croissant) tant qu'il reste des essais ; au dernier essai, l'ouvrier écrit
   `indisponible` (le travail est fait, pas d'alerte critique chez le client) et la porte
   `identite_relancer` (appelée à chaque passage) rouvre après 2 h toute vérification `indisponible` sans
   réponse plus récente → nouveau travail. Rien n'est définitif.
6. Fin de passage : `battre_ouvrier('identite', ['identite.verifier'], {…})`.

## 2. Les portes demandées au coordinateur (migration `omega/modules/identite/migrations/b7_01_portes.sql`)

| Porte | Signature | Rôle |
|---|---|---|
| déclencheur `identite_demander_travail` | AFTER INSERT sur `public.filed_verifications_tiers` (quand `repondu_le is null`) | `private.deposer_travail(client, 'filed', 'identite.verifier', {verification, registre, identifiant, fournisseur}, 'verification:<id>', 0)`. La migration rattrape les lignes déjà ouvertes. |
| `public.identite_a_verifier` | `(p_verification uuid) → jsonb` | La demande (`id, client_id, fournisseur_id, registre, identifiant, demande_le, repondu_le`), le fournisseur (`id, pays, siren, tva`) et le `cache` (dernière entrée de `identites_registre` pour (registre, identifiant) : `resultat, preuve, verifie_le, source, age_jours`), ou `null`. |
| `public.noter_identite` | `(p_verification uuid, p_resultat text, p_preuve jsonb, p_source text, p_complements jsonb = '[]') → jsonb {verification, deja_repondue, complements, recontrolees}` | Réponse + cache + compléments `[{registre, identifiant, resultat, preuve}]` (lignes répondues d'office) + recontrôle des factures. Idempotente : une vérification déjà répondue rend `deja_repondue = true` sans rien réécrire. |
| `public.identite_relancer` | `(p_heures int = 2) → int` | Rouvre les vérifications `indisponible` plus vieilles que p_heures sans réponse plus récente pour le même (client, registre, identifiant) ; rend le nombre rouvert. |
| table `public.identites_registre` | `(registre, identifiant) unique, resultat, preuve, source, version, verifie_le` | Le cache global, sans `client_id` (données publiques). RLS activée, aucune politique : service seul. |

Toutes `security definer`, `set search_path = ''`, `revoke … from public, anon, authenticated`,
`grant execute … to service_role`. Aucun `DROP`, aucun `DELETE`.

**Questions au coordinateur**

1. La facture bloquée ce soir : les deux anomalies citées (`identite.siren`, `identite.tva_intracom`) sont
   les contrôles **de forme** d'A4 (clé de Luhn, clé de TVA) — ils ne dépendent pas d'un registre. Si elles
   sont `bloquant`, c'est que la clé ne tombe pas juste (valeur mal lue : SIRET dans `siren` ? espace ?) ;
   si elles sont `attention`, c'est qu'il n'y a ni SIREN ni TVA sur la pièce. Peux-tu me coller les lignes
   `filed_controles` de cette facture où `code like 'identite.%'` (code, gravite, resultat, message, preuve) ?
   Selon la réponse, la correction est chez A1 (lecture) ou chez A4 (normalisation), pas chez moi — mais
   `identite.registre` est à moi dans tous les cas.
2. `private.filed_verification_recente` rend aussi une réponse `indisponible` pendant 90 jours, et le
   contrôle ne redemande pas tant qu'elle est là. Ma porte `identite_relancer` contourne ça en rouvrant une
   demande ; proposition pour A4 : ignorer les `indisponible` de plus de 2 h dans `filed_verification_recente`.
3. Pour « servir tous les modules », la table de vérification est aujourd'hui `filed_*`. Je propose de la
   garder (FILED est le seul demandeur) et de n'exposer, pour les autres modules, qu'une porte
   `identite_demander(p_client, p_registre, p_identifiant, p_module, p_objet_type, p_objet_id)` plus tard.
4. `_partage/portes.ts` garde `rpc()` privé : mes trois portes recopient 25 lignes d'appel RPC dans
   `identite/portes.ts`. Proposition : exporter une fonction `rpc(cfg, fetch, nom, params)` depuis
   `_partage/portes.ts` (je ne touche pas à `_partage`).

## 3. Les sources exactes

### API Sirene (INSEE) — secret `SIRENE_API_KEY`

- Depuis septembre 2024, l'INSEE sert Sirene par son portail `https://portail-api.insee.fr` (l'ancien
  `api.insee.fr` à jeton OAuth est fermé). Ce que Teo fait, une fois :
  1. Créer un compte sur https://portail-api.insee.fr (adresse courriel, gratuit).
  2. Catalogue → **API Sirene** → « Souscrire » (offre gratuite : 30 requêtes par minute, suffisant :
     un fournisseur n'est vérifié qu'une fois par mois).
  3. Mes applications → créer une application (nom libre, « Omega identité ») → onglet « Clés » →
     copier la **clé d'intégration**.
  4. Supabase → projet recette `ygwbgpowzlbdaajlsqkn` → Edge Functions → Secrets → `SIRENE_API_KEY` = la clé.
     (La console ne montre la clé entière qu'à la création : la copier d'un bloc, cf. le piège d'A1.)
- Appel : `GET https://api.insee.fr/api-sirene/3.11/siren/{siren}`, en-tête `X-INSEE-Api-Key-Integration: <clé>`,
  `Accept: application/json`. 200 → `uniteLegale` (`statutDiffusionUniteLegale`, `dateCreationUniteLegale`,
  `periodesUniteLegale[0]` : `etatAdministratifUniteLegale` A/C, `denominationUniteLegale`,
  `categorieJuridiqueUniteLegale`, `activitePrincipaleUniteLegale` ; `nomUniteLegale` / `prenom1UniteLegale`
  pour une personne physique). 404 → SIREN inconnu. 401/403 → clé absente ou refusée. 429 → quota.
- **Sans clé** (ou clé refusée) : repli sur l'annuaire public `https://recherche-entreprises.api.gouv.fr/search?q=<siren>`
  (DINUM, sans clé, 7 requêtes/s, pas de garantie de service). La preuve porte `source: "recherche-entreprises"`
  et le battement signale `sirene: "repli"`. C'est pour voir la chaîne tourner avant la clé, pas pour durer.

### VIES (Commission européenne) — sans clé

- `POST https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`, corps JSON
  `{"countryCode": "FR", "vatNumber": "12345678901"}` → `{valid, name, address, requestDate, userError}`.
- `userError` : `VALID`, `INVALID`, `MS_UNAVAILABLE` (l'État membre ne répond pas), `SERVICE_UNAVAILABLE`,
  `TIMEOUT`, `MS_MAX_CONCURRENT_REQ`, `GLOBAL_MAX_CONCURRENT_REQ`, `INVALID_INPUT`. Tout sauf VALID/INVALID
  = indisponible → report non définitif.
- Horaires : VIES s'appuie sur les bases nationales, dont certaines sont coupées la nuit ou le week-end ;
  d'où la reprise automatique et la relance après 2 h.

### Cohérence SIREN ↔ TVA FR (en local, sans réseau)

- `FR` + clé (2 chiffres) + SIREN (9 chiffres) ; clé = `(12 + 3 × (SIREN mod 97)) mod 97`.
- L'ouvrier recalcule la clé, compare le SIREN porté par la TVA à celui de la demande, et vérifie que le
  nom rendu par VIES ressemble à la dénomination Sirene (comparaison sans accents ni forme juridique).

### IBAN (à terme)

- Structure ISO 13616 : pays (2 lettres), clé (2 chiffres), BBAN selon la longueur du pays, contrôle mod 97
  des caractères déplacés ; côté ouvrier, `iban.ts` (pur, testé). Aucun registre public ne confirme un IBAN
  gratuitement : la vérification « ce compte appartient à ce fournisseur » reste humaine (contrôle
  `iban.nouveau` d'A4).

## 4. Les limites

- **Tiers étrangers** : pas de SIREN. Un numéro de TVA de l'Union passe par VIES ; hors Union (CH, GB, US…)
  rien n'est vérifiable → le contrôle d'A4 reste « attention ». Même chose pour un particulier.
- **SIREN radié** (`C`) : `invalide`, preuve avec la date de cessation. Une facture d'une entreprise
  cessée est bloquée : c'est voulu.
- **TVA non assujetti** : une entreprise en franchise en base (art. 293 B) ou un auto-entrepreneur a un SIREN
  valide mais **VIES répond `invalid`** (numéro jamais activé pour l'intracommunautaire). L'ouvrier le dit
  dans la preuve (« SIREN actif à Sirene, numéro de TVA non reconnu par VIES : non assujetti probable ») ;
  le contrôle d'A4 le pose quand même en `bloquant`. À adoucir chez A4 quand on aura vu de vrais cas.
- **Unités non diffusibles** (`statutDiffusionUniteLegale = 'P'`) : l'INSEE ne rend presque rien ; on
  garde `valide` si l'état est actif, preuve « diffusion partielle », sans nom.
- **Données personnelles** : un entrepreneur individuel est une personne. Le journal (logs) ne porte jamais
  d'identifiant ni de nom : seulement l'id de la vérification, le registre, l'issue et la durée. La preuve
  en base garde le nom rendu par le registre (donnée publique du registre, nécessaire au « vérifié : X »).
- **Cache** : 30 jours, global. `"force": true` dans la charge d'un travail l'ignore (pour une demande
  humaine « revérifier maintenant », porte à prévoir).

## 5. Ce que Teo doit fournir

1. La clé d'intégration Sirene (section 3) posée en secret Edge `SIRENE_API_KEY` sur la recette.
2. Rien pour VIES.
3. Le coordinateur : poser `b7_01_portes.sql`, déployer la coquille `identite` (verify_jwt true, cron
   `omega-identite` chaque minute comme le lecteur), poser `IDENTITE_VERSION` si on veut tracer le commit.

## 6. Réponses du coordinateur (5/10, 22 h 34 Z)

- **La facture de ce soir** (df280c36) : `identite.siren` et `identite.tva_intracom` sont en `attention`
  « absent » : le SIREN d'essai (842115763) a une clé de Luhn fausse, le lecteur l'a lu avec `verifiee = false`,
  `filed_integrer_facture` ne remonte pas une valeur non sûre, le contrôle dit « absent ». Ni A1 ni A4 ne se
  trompent ; `identite.registre` n'a pas été posé faute d'identifiant valide. Le test réel se fera avec une
  pièce portant un vrai SIREN (le coordinateur la refait).
- A4 pose en **a4_10** la remontée siren/tva/iban vers `fournisseur_lu` et trois colonnes de verdict sur
  `filed_fournisseurs` : `identite_verifiee_le`, `identite_source`, `identite_verdict`. `noter_identite` les
  remplit **si elles existent** (test `pg_attribute`, rien sinon) : la pose de b7_01 ne dépend pas d'a4_10.
- `filed_verification_recente` : « ignorer les indisponible de plus de 2 h » transmis à A4 ; `identite_relancer`
  reste.
- `rpc()` exporté depuis `_partage/portes.ts` : demandé à A1 ; je bascule quand il est là.
- Déploiement en coquille : aucun import relatif ne sort de `omega/functions/` (seulement `./` et `@partage/`).
  **`_partage/` n'est pas sur `worker-b7`** (il est à A1) : le `deno.json` de la coquille mappe `@partage/` sur le
  SHA d'A1 (`e483a22`, ou `main` une fois fusionné) et `index.ts` importe
  `…/<sha de worker-b7>/omega/functions/identite/index.ts`.

## 7. Ce qui est fait (6/10, 0 h 50)

- `omega/modules/identite/migrations/b7_01_portes.sql` : table `identites_registre`, déclencheur
  `identite_demander_travail` (+ rattrapage des demandes ouvertes), portes `identite_a_verifier`,
  `noter_identite` (réponse, cache, compléments, verdict fournisseur, recontrôle des factures
  `a_completer`/`bloquee`/`a_valider`, 500 au plus), `identite_relancer`. Rejouable (vérifié deux fois).
- `omega/functions/identite/` : `index.ts`, `passage.ts`, `verifier.ts`, `portes.ts`, `sirene.ts` (INSEE 3.11 +
  repli annuaire), `vies.ts`, `coherence.ts`, `iban.ts` ; `deno task verifier` = check + lint + fmt + **43 tests**.
- `omega/tests/identite/b7_01_portes.sql` : **8 tests pgTAP** (déclencheur, lecture, réponse, cache, compléments,
  relance, droits, verdict fournisseur) ; `b7_02_scenario.sql` : le parcours complet (contrôle A4 → demande →
  travail → `noter_identite` → `identite.registre` ok « Numéro de TVA confirmé par VIES le 05/10/2026 » → seconde
  facture servie par la réponse récente).
- Vérifié localement sur un Postgres 16 jetable : souche d'A4 + `a4_01..09` + pgTAP d'A5 + `b7_01` : 8/8 verts,
  scénario vert. (Souche alignée sur le contrat : `travaux.etat`, dépôt idempotent sur la clé.)

### Vérifié en réel le 5/10 à 22 h 42 Z (sondages à la main, hors tests : les tests restent sur doubles)

- **Coquille** : un `index.ts` qui importe `…/e4fd65f/omega/functions/identite/index.ts` avec `@partage/` mappé sur
  `…/e483a22/omega/functions/_partage/` passe `deno check` : tout se résout depuis GitHub.
- **VIES** (SIREN public de l'INSEE, 120 027 016, TVA calculée FR85120027016) : `valid: true`, `name` avec un espace
  en tête (rogné), `address` sur deux lignes (repliées), `traderName: "---"`, **pas de `userError` quand c'est
  valide** (le code lit `valid` quand le code manque). Format conforme à `vies.ts`.
- **Annuaire des entreprises** : `results[0]` porte `siren`, `nom_raison_sociale`, `nom_complet`,
  `nature_juridique`, `activite_principale`, `date_creation`, `etat_administratif: "A"`. Conforme à `sirene.ts`.
- **INSEE sans clé** : HTTP 401 → `PORTE_REFUSEE` → repli sur l'annuaire, comme prévu.

### Lot b7_02 — demander une vérification soi-même (6/10, 1 h 55)

- `omega/modules/identite/migrations/b7_02_demander.sql` : `public.identite_demander(p_client, p_registre, p_identifiant,
  p_fournisseur = null, p_force = false) → uuid`, pour une personne de l'organisation (gérant, admin, valideur,
  collaborateur, par `private.filed_exiger_acteur`) ou le service (un autre module). Normalise l'identifiant, refuse
  un registre inconnu ou une forme fausse, rend la demande déjà ouverte s'il y en a une. `p_force` : la ligne ouverte
  porte `{"force": true}` dans sa preuve, le déclencheur (remplacé) le recopie dans la charge du travail, et l'ouvrier
  ignore le cache de trente jours (« revérifier maintenant »). Grant : authenticated et service_role.
- `omega/tests/identite/b7_03_demander.sql` : test_b7_09, 16 assertions vertes en local (service, membre endossé,
  personne étrangère refusée 42501, force sur un travail existant et sur une demande neuve, formes refusées).
- À brancher côté écran (A3) : un bouton « revérifier » sur la fiche fournisseur appelle
  `identite_demander(client, 'sirene', siren, fournisseur, true)` (ou `'vies'`, tva).

## 8. À faire par le coordinateur

1. ~~Poser `b7_01_portes.sql`, `b7_02_demander.sql`, `b7_03_balayer.sql`~~ (posés).
2. ~~Jouer les dix fichiers pgTAP et le scénario~~ (verts sur la recette, 6/10 2 h 29 Z).
3. ~~Déployer la coquille `identite`~~ (v2 à e77fabb). Secrets : `SIRENE_API_KEY` (quand
   Teo l'a ; sans elle, repli annuaire et le battement dit `sirene: "repli"`), facultatifs `IDENTITE_VERSION`,
   `IDENTITE_CACHE_JOURS` (30), `SIRENE_REPLI` (`non` pour couper le repli), `IDENTITE_NOM`.
4. Cron `omega-identite` chaque minute, comme le lecteur (`Authorization: Bearer <cle_service>` du Vault).
5. Une pièce d'essai avec un vrai SIREN et sa TVA ; puis me coller `battements.identite`, le travail
   `identite.verifier` (resultat), la ligne `filed_verifications_tiers` et le contrôle `identite.registre`.

## 9. Lot 3 proposé (scénario d'abord, rien de codé)

**a. Balayage périodique : « vérifié le … » ne vieillit pas.** — GO du coordinateur à 2 h 26 Z ; **fait** à 3 h 05 :
`b7_03_balayer.sql` (porte, VIES si la TVA est valide sinon Sirene, SIREN à clé fausse et fournisseurs refusés
ignorés, demande marquée `{"origine": "balayage"}`), `b7_04_balayer.sql` (test_b7_10, 16 assertions vertes en local),
ouvrier : `balayer(jours, max)` appelé après la relance, `IDENTITE_BALAYAGE_JOURS` (90) et `IDENTITE_BALAYAGE_MAX`
(**5 par passage** par défaut, soit 5 par minute, pour laisser place aux demandes à la volée ; 0 coupe), compteur
`balayees` dans `battements.detail` ; 44 tests Deno verts. Reste : pose par le coordinateur, redéploiement de la
coquille. Scénario d'origine : Aujourd'hui une vérification n'est demandée qu'au
contrôle d'une facture, et elle vaut 90 jours (`filed_verification_recente`). Un fournisseur qui n'envoie rien
pendant six mois, puis cesse son activité, n'est pas revu avant sa prochaine facture. Scénario :
`public.identite_balayer(p_jours int = 90, p_max int = 50) → int` : pour chaque fournisseur FILED `actif` ou
`a_confirmer` qui porte un SIREN ou une TVA, si la dernière réponse `valide`/`invalide` pour (client, registre,
identifiant) date de plus de p_jours (ou n'existe pas) et qu'aucune demande n'est ouverte → ouvre une demande
(→ déclencheur → travail), p_max fournisseurs par appel pour lisser (INSEE : 30 requêtes/min). L'ouvrier l'appelle à
chaque passage, après `identite_relancer`. Le cache global (30 jours) absorbe les SIREN communs à plusieurs clients.
Effet client : la ligne « confirmé le … » a toujours moins de 90 jours ; une entreprise radiée bloque ses prochaines
factures (`identite.registre` bloquant) et le verdict d'A4 (`identite_verdict`) sur la fiche passe `invalide`. Test
pgTAP : fournisseur sans vérification → demande ouverte ; vérification de 10 jours → rien ; de 100 jours → demande ;
demande déjà ouverte → rien ; p_max respecté. Coût : une porte SQL + 15 lignes d'ouvrier + tests. **À faire si le
coordinateur confirme.**

**b. Bouton « revérifier » et affichage (côté A3, pas moi).** Contrat pour l'écran fournisseur : lire
`filed_fournisseurs.identite_verifiee_le`, `identite_source`, `identite_verdict` (a4_10) → « Vérifié le JJ/MM/AAAA
par Sirene » / « VIES » / « Non vérifié » / « Invalide : <preuve.motif> » ; bouton « Revérifier » →
`identite_demander(client, 'sirene', siren, fournisseur, true)` (ou `'vies'`, tva) ; la réponse arrive en une à
deux minutes (cron), l'écran se relit par Realtime sur `filed_fournisseurs`. Rien à coder chez moi.

**c. IBAN : je ne propose pas de lot.** La forme (ISO 13616, longueur par pays, clé mod 97) est déjà contrôlée en
SQL par A4 (`iban.invalide`, `iban.pays`, `iban.partage`, `iban.nouveau`) et `iban.ts` est prêt côté ouvrier ; aucun
registre public gratuit ne dit à qui appartient un compte, la seule vérification qui vaille (« cet IBAN est bien
celui de ce fournisseur ») est humaine, et FILED la porte déjà (`filed.valider_iban`). Une table des codes banque
français (nom de l'établissement dans la preuve) serait un confort, pas une vérification : à plus tard.

**d. SIREN ↔ TVA sur la fiche fournisseur.** Déjà couvert : `identite.coherence` (A4, en SQL) sur chaque facture, et
l'ouvrier, pour une TVA FR, consulte Sirene en complément et note `coherence.noms_concordent` dans la preuve. Rien à
ajouter sans cas réel.

## 10. Le premier passage réel (6/10, 0 h 43 Z, relevé par le coordinateur)

Pièce déposée par l'écran d'A3 : facture **Orange SA** (FAC-2026-10-0471, SIREN 380 129 866, TVA FR89380129866,
240 € HT / 288 € TTC), reçu R2026-000004, lue par le lecteur en ~80 s, facture `bloquee` (« Fournisseur nouveau
(ORANGE SA) », le contrôle humain d'A4). Puis, sans geste humain :

- `battements.identite` : `{"pris":1,"valide":1,"balayees":0,"version":"identite/2026-10-06","sirene":"repli"}` ;
- travail 3214 `identite.verifier` : `fait`, 1 essai, résultat `{"source":"vies","resultat":"valide","complements":1,"recontrolees":1}` ;
- `filed_verifications_tiers` : VIES `FR89380129866` → `valide` (nom « SA ORANGE », adresse du siège,
  `coherence.siren_cle_ok` et `noms_concordent` vrais) ; complément Sirene `380129866` → `valide` (source
  `recherche-entreprises`, repli sans clé INSEE, dénomination « ORANGE », état actif) ;
- `filed_controles` `identite.registre` : **ok**, « Identité confirmée par VIES le 06/10/2026. » ;
- `filed_fournisseurs` : `identite_source = vies`, verdict `{resultat: valide, registre: vies, identifiant, preuve}` ;
- `identites_registre` : deux entrées (VIES et Sirene), valables trente jours pour tous les clients.

Rien à corriger. Avec `SIRENE_API_KEY` posée, la source du complément passera de `recherche-entreprises` à `sirene`
sans redéploiement (la clé est lue à chaque passage).

## 12. Fournisseurs étrangers (point 8 de la liste « PME » d'A4) — 6/10, sans code

**Union européenne : déjà couvert.** Un numéro de TVA qui a la forme d'un des 27 États ou de XI (Irlande du Nord)
passe le contrôle de forme d'A4 (`filed_tva_intracom_analyser`, clé vérifiée pour FR, BE, DE, IT, LU, NL, PT, DK, FI,
SE, PL, AT, SI, HU), puis `identite.registre` demande VIES, et l'ouvrier interroge VIES pour tout préfixe de deux
lettres. Depuis b7_04, une panne de VIES (MS_UNAVAILABLE, MS_MAX_CONCURRENT_REQ…) n'est plus lue comme un refus.
Limites connues, sans code pour l'instant :
- la Grèce est `EL` chez VIES ; un numéro écrit `GR…` sur une facture serait refusé par VIES. Correctif simple
  côté ouvrier (`GR` → `EL` avant l'appel) si A4 accepte `GR` en forme ; à faire quand un vrai cas arrive ;
- certains États ne rendent ni nom ni adresse (Allemagne notamment) : la preuve est alors « numéro reconnu » sans
  nom, `coherence.noms_concordent` reste nul. Ce n'est pas un refus ;
- seul le numéro FR est recoupé avec un second registre (Sirene).

**Hors Union, faisable sans clé payante :**

| Pays | Source | Clé | Ce qu'elle confirme |
|---|---|---|---|
| Suisse (et Liechtenstein) | Registre IDE/UID de l'Office fédéral de la statistique, service SOAP public `https://www.uid-wse.admin.ch/V5.0/PublicServices.svc` (`ValidateUID`, `ValidateVatNumber`, `GetByUID`) | aucune pour les services publics | l'IDE `CHE-123.456.789` existe, raison sociale, adresse, état, inscription à la TVA (`MWST/TVA/IVA`). Débit limité par l'OFS (chiffre exact à vérifier avant de coder). La clé de l'IDE (mod 11) se vérifie aussi sans réseau. |
| Royaume-Uni (GB) | HMRC « Check a UK VAT number » API v2.0 (`api.service.hmrc.gov.uk`) | **gratuite mais obligatoire** : une application déclarée sur le Developer Hub de HMRC (OAuth 2, identifiants d'application), à créer par Teo | numéro de TVA GB enregistré, nom et adresse, numéro de consultation à garder comme preuve. Depuis 2021, VIES ne sert plus que XI (Irlande du Nord). Companies House (numéro de société, état) : clé gratuite aussi. |
| Norvège | Brønnøysund, `https://data.brreg.no/enhetsregisteret/api/enheter/{orgnr}` | aucune | l'entreprise existe, son état, `registrertIMvaregisteret` (assujettie à la TVA). |
| États-Unis et le reste (SaaS : Google, AWS…) | GLEIF, `https://api.gleif.org/api/v1/lei-records` | aucune | l'entité juridique existe (LEI, nom légal, siège, état) pour les grandes sociétés. Ne dit rien de la TVA : l'autoliquidation reste un contrôle d'A4. |

Pour un particulier, un auto-entrepreneur étranger ou un pays sans registre ouvert, il ne reste que l'attestation
humaine (`filed_attester_identite`, A4), qui gagnerait à être proposée d'emblée sur la fiche (point 8 d'A4).

**Ce que demanderait le code (lot à venir, pas commencé) :**
- `filed_verifications_tiers.registre` est contraint à `vies | sirene` (A4, a4_04) et `identites_registre` aussi (b7_01).
  Ajouter `uid_ch` ou `hmrc` impose de remplacer ces contraintes. Une contrainte CHECK ne se remplace pas sans la
  retirer, donc c'est une décision du coordinateur et d'A4. Autre voie, sans rien retirer : un champ `pays` et une table
  à part pour les registres hors Union ;
- le contrôle `identite.registre` d'A4 ne demande que VIES ou Sirene : il faudrait une branche pour `CHE…` et
  `GB…` ;
- ordre proposé : Suisse d'abord (sans clé, fréquente chez une PME française), puis GB quand Teo aura l'application
  HMRC, puis GLEIF pour les grands fournisseurs SaaS.

## 13. Royaume-Uni : HMRC « Check a UK VAT number » v2 — ce que Teo doit faire (6/10, aucun appel réel)

L'adaptateur `omega/functions/identite/hmrc.ts` est prêt (jeton OAuth, consultation, lecture des réponses, double
`HmrcFactice`, 7 tests) mais **pas branché** et jamais appelé en réel : il manque l'application HMRC. La v1, ouverte,
a été retirée le 17/02/2025 ; la v2 exige une application déclarée. HMRC annonce environ **deux semaines** d'examen
avant les identifiants de production. C'est gratuit.

Étapes (les libellés exacts des écrans peuvent changer : suivre le sens) :

1. Créer un compte développeur sur https://developer.service.hmrc.gov.uk (« Register ») : nom, courriel, mot de
   passe, puis confirmation par courriel. HMRC demande une vérification en deux étapes (application
   d'authentification ou SMS).
2. « Applications » → ajouter une application au **bac à sable** (sandbox), nom « Omega identité ».
3. Dans l'application : abonner l'API **« Check a UK VAT number » version 2.0** (« Manage API subscriptions »).
4. Onglet des identifiants du bac à sable : copier le **Client ID** et générer un **client secret**. Le secret ne
   s'affiche qu'une fois : le copier d'un bloc (même piège que la clé Sirene).
5. Me les transmettre par le coordinateur **en secrets Edge de la recette**, jamais dans un fichier ni un message :
   `HMRC_CLIENT_ID`, `HMRC_CLIENT_SECRET`, et `HMRC_BASE = https://test-api.service.hmrc.gov.uk` pour le bac à
   sable. Je ferai alors l'essai avec les numéros fictifs publiés par HMRC
   (github.com/hmrc/vat-registered-companies-api, `public/api/conf/2.0/test-data`).
6. Demander les identifiants de **production** (« Get production credentials »). HMRC demande notamment :
   - l'organisation et une personne responsable ;
   - l'adresse d'une politique de confidentialité et de conditions d'utilisation (omegaai.fr) ;
   - quelques réponses sur le logiciel et la façon dont il traite les données ;
   - l'acceptation des **Terms of Use 2.0**.

   L'usage déclaré est de vérifier les fournisseurs britanniques d'une organisation avant de les payer (« due
   diligence on VAT-registered businesses »), ce qui correspond exactement à l'objet de l'API.
7. Une fois la production accordée : remplacer `HMRC_CLIENT_ID` et `HMRC_CLIENT_SECRET` par ceux de production, et
   retirer `HMRC_BASE` (production par défaut).
8. Facultatif : `HMRC_VRN_REQUERANT`, le numéro de TVA britannique de l'organisation qui vérifie. HMRC rend alors un
   **numéro de consultation**, preuve opposable de la vérification. Une PME française n'en a en général pas : la
   vérification simple, sans numéro de consultation, suffit.

Ce que fait l'adaptateur :
- **Jeton :** `POST /oauth/token` (client_credentials, scope `read:vat`), gardé quatre heures moins une minute,
  redemandé après un 401.
- **Consultation :** `GET /organisations/vat/check-vat-number/lookup/{vrn}[/{requérant}]`, en-tête
  `Accept: application/vnd.hmrc.2.0+json`.
- **Lecture :**
  - 200 → valide (nom, adresse, référence de consultation) ;
  - 404 `NOT_FOUND` → invalide (numéro non enregistré) ;
  - 400 sur `targetVrn` → invalide (forme refusée) ;
  - tout le reste → indisponible : 401 et 403 (jeton ou requérant), 429 `MESSAGE_THROTTLED_OUT` (3 requêtes par
    seconde), 5xx, réseau.
- **Clé mod 97 / 9755 :** notée dans la preuve, sans arrêter la consultation (les numéros du bac à sable ne la
  respectent pas, et HMRC fait foi).
- **Secret :** il ne passe jamais dans un motif ni dans le journal.

Pour le brancher, il faut la même décision que pour la Suisse (le registre `hmrc` dans les contraintes, accord de
Teo) et une branche `GB…` dans le contrôle `identite.registre` d'A4. XI (Irlande du Nord) reste à VIES.

## 14. Tiers étrangers dans FILED : ce qui manque pour que la fiche porte un identifiant étranger vérifié (6/10)

**Côté ouvrier, c'est fait (inerte).** `verifier.ts` aiguille selon le registre de la demande : `sirene`, `vies`,
`uid_ch` (registre IDE suisse, sans clé), `hmrc` (TVA GB, identifiants HMRC). Un registre inconnu n'est plus envoyé
par défaut à VIES : le travail est fini, ignoré. Sans `HMRC_CLIENT_ID` et `HMRC_CLIENT_SECRET`, une demande `hmrc`
est reportée (indisponible), et le battement le dit (`hmrc: "absent"`). Aujourd'hui aucune demande `uid_ch` ni `hmrc`
ne peut exister : la base les refuse. Le redéploiement est donc sans effet tant que rien d'autre ne bouge.

**Côté base : trois contraintes CHECK à élargir.** Chacune doit être retirée puis reposée avec la nouvelle liste,
d'où l'accord de Teo. Un seul « go » pour les trois :
1. `filed_verifications_tiers.registre` (A4, a4_04) : `vies | sirene` → `+ uid_ch | hmrc` ;
2. `identites_registre.registre` (B7, b7_01, contrainte nommée par défaut) : même liste ;
3. `filed_fournisseurs.identite_source` (A4, a4_10) : `sirene | vies | humain` → `+ uid_ch | hmrc` (le verdict pose le
   registre comme source).

**Ensuite, deux lots, chacun dans son périmètre :**
- **A4** : `filed_controles_identite` demande `uid_ch` quand la TVA ou `id_etranger` a la forme `CHE…`, `hmrc` pour
  `GB…`. Pour un pays sans registre ouvert, `identite.registre` reste « attention » et propose l'attestation humaine.
- **B7** : `identite_demander` admet les deux registres (formes `CHE` + 9 chiffres + suffixe facultatif, `GB` + 9
  ou 12 chiffres) ; `identite_balayer` revérifie aussi les fournisseurs étrangers ; test pgTAP de bout en bout
  (demande → travail → `noter_identite` → verdict `identite_source = uid_ch` sur la fiche). Une vingtaine de lignes
  SQL, écrites dès que les contraintes sont élargies.

## 15. L'ouvrier des taux de change BCE (`taux-bce`) — 6/10

**Pourquoi.** A4 (a4_22) écrit les factures en devise en euros au taux du jour, lu dans `public.filed_taux_change`.
Sans taux, la comptabilisation est refusée. La base ne fait aucun appel réseau : la fonction Edge `taux-bce` pose les
taux de référence de la BCE chaque jour ouvré.

**Les portes (`omega/modules/taux_bce/migrations/b7_07_taux_bce.sql`, service seul) :**
- `taux_bce_etat()` → `{dernier_jour, devises, dernier_passage}` ;
- `taux_bce_poser_lot([{devise, jour, taux}])` : un appel pour tout un lot, par `filed_poser_taux_change` (source
  `bce`). Un taux identique n'est pas réécrit, une saisie humaine n'est jamais écrasée, une ligne fausse est refusée
  seule. Rend `{recus, poses, inchanges, saisies_gardees, refuses}` ;
- `taux_bce_noter_passage(detail, alerte)` : le battement. Une ligne est écrite dans `public.taux_bce_passages`, car
  le battement du socle est par client et cet ouvrier n'en a pas. Si l'ouvrier signale une alerte, une alerte
  **interne** est levée, une seule par jour de Francfort (clé `taux_bce:AAAA-MM-JJ`). Elle se referme seule quand un
  passage suivant pose les taux du jour ;
- `taux_bce_veiller()` : pour un cron SQL. Un jour ouvré après 18 h à Francfort, sans aucun passage depuis 30 heures,
  elle lève une alerte interne (l'ouvrier n'a pas tourné).

**L'ouvrier (`omega/functions/taux-bce/`) :**
- **Flux lu :** le quotidien `eurofxref-daily.xml`, ou `eurofxref-hist-90d.xml` quand la base est vide ou qu'il
  manque plus de quatre jours (le trou se comble seul).
- **Envoi :** seuls les jours depuis le dernier en base partent, en un seul lot.
- **Alerte :** un jour ouvré TARGET (hors week-ends, 1er janvier, Vendredi saint, lundi de Pâques, 1er mai, 25 et 26
  décembre), après 16 h 15 à Francfort, sans taux du jour. Le message donne le dernier jour publié ou le motif de la
  panne.
- **Tests :** 15 tests Deno sur les flux réels du 6/10, verts avec check, lint et fmt.
- **Essai réel :** 1 856 taux au premier passage (64 jours × 29 devises), 29 inchangés au second.

**Pour le coordinateur :**
1. Poser `b7_07_taux_bce.sql` (après a4_22), puis le test `omega/tests/taux_bce/b7_08_taux_bce.sql`
   (`^test_b7_14`, 21 assertions vertes en local).
2. Déployer `taux-bce` en coquille comme `identite` (verify_jwt true, `@partage` → 7425991,
   `index.ts` → `…/<sha>/omega/functions/taux-bce/index.ts`).
3. Cron, en UTC : `35 14,15 * * 1-5`, soit deux appels à une heure d'écart (16 h 35 puis 17 h 35 à Francfort en
   été, 15 h 35 puis 16 h 35 en hiver). Le second couvre l'hiver et un retard de la BCE ; l'ouvrier est rejouable.
   En plus, `select public.taux_bce_veiller()` à `0 17 * * 1-5`.
4. Le premier appel remplit 90 jours d'historique.

## 11. Journal des étapes

- 5/10 23 h 30 : lecture du contrat, du socle, du lot 4d d'A4, du lecteur ; scénario et portes écrits et
  envoyés au coordinateur.
- 6/10 0 h 50 : ouvrier, migration, tests Deno et pgTAP écrits et verts en local ; b7_01 envoyé à la pose.
- 5/10 22 h 47 Z (coordinateur) : b7_01 posé (`identite_b7_01_portes`), fonction `identite` v1 déployée en coquille
  (index.ts à e4fd65f, `@partage/` sur worker-a1 7425991), cron `omega-identite` chaque minute, `SIRENE_API_KEY`
  pas encore posée (repli annuaire). Tests : test_b7_01..07 verts sur la recette ; **test_b7_08 et le scénario
  tombent** : `identite_verdict` est **jsonb** chez A4 (a4_10 déjà posé), mon `EXECUTE … USING` passait un texte
  (42804).
- 6/10 1 h 10 : corrigé — `identite_poser_verdict` lit le type réel des colonnes dans `pg_attribute` et écrit un
  objet `{resultat, registre, identifiant, source, verifie_le, verification}` en jsonb (ou le seul résultat si la
  colonne est texte) ; test_b7_08 réécrit avec la colonne en jsonb ; 8/8 et scénario verts en local, avec et sans
  les colonnes d'a4_10. Au passage, `portes.ts` passe par `rpc()` exportée par A1 (7425991), fin de la recopie.
- 5/10 22 h 52 Z (coordinateur, 158277d reposé) : 7/8 ; deux contraintes d'a4_10 : `identite_source` n'admet que
  `sirene | vies | humain` (= le registre, pas la source d'ouvrier) ; la forme du verdict lue par A4 est
  `{resultat, identifiant, registre, preuve}`. Et le scénario heurtait `UNIQUE (piece_id)` sur `filed_documents`.
- 6/10 1 h 25 : aligné — `identite_source` = le registre ; `identite_verdict` = `{resultat, identifiant, registre,
  preuve}` où la preuve est celle de la vérification plus `source` (d'ouvrier), `verifie_le`, `verification` ;
  jsonb seulement. Scénario : une pièce par document. Test b7_08 pose aussi la contrainte d'A4 en local. 8/8 et
  scénario verts, avec et sans les colonnes et la contrainte d'a4_10.
- 5/10 23 h 01 Z : pause demandée par Teo (limite d'usage) ; tout était poussé (e5aa5dd). Reprise 6/10 1 h 40 Paris :
  le coordinateur repose b7_01 d'e5aa5dd et rejoue les tests.
- 6/10 1 h 55 : lot b7_02 (`identite_demander`, force) écrit et testé en local.
- 6/10 2 h 06 Z (coordinateur) : b7_02 et b7_03 posés, scénario vert ; test_b7_09 tombait sur `tests.role_admis`
  (absente de la recette) → test rendu autonome (69a0ba9) → **16/16**. Bilan recette : 9/9 fichiers pgTAP verts +
  scénario, b7_01 v3 et b7_02 posés, ouvrier v1 déployé, cron chaque minute. Manquent la pièce à vrai SIREN (dépôt
  de Teo à refaire : rien n'est arrivé en base) et `SIRENE_API_KEY`.
- 6/10 2 h 35 : jauges à jour ; scénario du lot 3 écrit (section 9), envoyé au coordinateur avant de coder.
- 6/10 2 h 26 Z (coordinateur) : GO sur le balayage ; p_max bas, compteur dans le battement ; SQL d'abord, coquille ensuite.
- 6/10 3 h 05 : lot 3 écrit, testé en local (pgTAP 10 fichiers verts dont b7_04, scénario vert, 44 tests Deno), poussé.
- 6/10 2 h 29 Z (coordinateur) : b7_03 posé (`identite_b7_03_balayer`), test_b7_10 16/16, coquille `identite` **v2**
  redéployée à e77fabb. Attendus : `battements.identite` du prochain passage (balayees, issues), la pièce à vrai
  SIREN (Teo), `SIRENE_API_KEY` (Teo).
- 6/10 0 h 49 Z (coordinateur) : **chaîne à vrai SIREN prouvée** (section 10). Rien à corriger.
- 6/10 3 h 35 : notes closes, « terminé » envoyé au coordinateur. Reste chez Teo : `SIRENE_API_KEY` ; chez A3 : le
  bouton « revérifier » (contrat en 9 b) ; chez le coordinateur : la production.
- 6/10 1 h 22 Z (coordinateur) : rejeu `^test_b7_` 9/10 — test_b7_02 « aucun cache pour un identifiant jamais vu »
  tombait : le cache global porte maintenant de vraies lignes (preuve Orange). Corrigé par Fable en a84d621 + 91b919d
  (identifiant `ZZ` + 11 caractères tirés au sort, aucune contrainte de format sur `filed_verifications_tiers.identifiant`).
  Les autres tests lisent le cache filtré sur leur propre identifiant. À reposer : `omega/tests/identite/b7_01_portes.sql`.
- 6/10 1 h 35 Z : reprise par session_01967jUehrY7tLAXLn9pBaSw (Opus 5.5), Fable à court de crédit.
- 6/10 1 h 31 Z (coordinateur) : b7_01_portes.sql reposé depuis 91b919d, `^test_b7_` rejoué → **10/10**. Identité verte.
- 6/10 13 h 55 Z (coordinateur) : `SIRENE_API_KEY` posée par Teo, battement `sirene+repli`, complément Orange servi
  par l'INSEE (source `sirene`). **Faux négatif VIES** : ORANGE FR89380129866 valide à 13:48:06 Z, invalide à
  13:54:29 Z (« non assujetti probable »), verdict du fournisseur 90cc1d86 écrasé. Les deux demandes étaient
  forcées (cache ignoré) : pas de moi.
- 6/10 14 h 30 Z : **lot b7_04** écrit, testé en local (Postgres 16 jetable, souche minimale : b7_01 à b7_04 + les
  tests 01, 04 et 05 verts, 33 assertions dans test_b7_11 ; migration rejouée deux fois ; rattrapage idempotent),
  ouvrier 48 tests Deno verts (check, lint, fmt).
  - `omega/modules/identite/migrations/b7_04_doute.sql` : `private.identite_doute` (la règle) ; `noter_identite`
    remplacée : un refus est **douteux** s'il contredit une réponse valide de moins de 30 jours (cache ou
    vérification, tous clients) ou s'il est marqué `suspect` par l'ouvrier ; il ne conclut que s'il confirme un refus
    d'au moins 1 h (deux refus espacés d'au moins 1 h, sans valide entre les deux). Sinon : écrit `indisponible`,
    `preuve.doute {motif, premier_refus_le, rang, valide_le}`, `preuve.resultat_registre = invalide`, pas de verdict,
    pas de recontrôle ; même règle pour les compléments. La porte rend en plus `resultat` et `doute`.
    `identite_memoriser` : un `indisponible` n'écrase plus une réponse du registre dans le cache.
    `identite_relancer` : un doute est redemandé **forcé** (sans cache) 1 h après le premier, 6 h ensuite.
    Rattrapage : les refus VIES de 30 jours à clé juste et SIREN actif (ancienne remarque) sont redemandés forcés,
    une fois (Orange compris).
  - Ouvrier : `vies.ts` lit `errorWrappers[0].error` / `actionSucceed: false` (réponse d'erreur REST en HTTP 200) et
    rend `indisponible` sans `valid` booléen (avant : lu « invalide ») ; `code_vies` dans la preuve d'un refus.
    `verifier.ts` : refus VIES + clé juste + SIREN actif → `preuve.suspect` et nouvelle remarque (« panne de VIES
    possible, revérifié avant de conclure ») ; issue `doute` quand la porte met le refus en doute.
  - Tests : `omega/tests/identite/b7_05_doute.sql` (test_b7_11), Deno : double VIES `valid:false` derrière le vrai
    `ViesRest`, enveloppe `errorWrappers`.
  - À faire par le coordinateur : poser b7_04, jouer `^test_b7_`, redéployer la coquille `identite` au nouveau SHA.

- 6/10 14 h 09 Z (coordinateur) : coquille `identite` **v4** à 0b1be57 (déployée avant la migration), b7_04 et
  b7_05 posés (`identite_b7_04_doute`), `^test_b7_` **11/11**. Cause confirmée par A3 : VIES répondait HTTP 200
  `{actionSucceed:false, errorWrappers:[{error:"MS_MAX_CONCURRENT_REQ"}]}`, lu « invalide » par l'ancien `vies.ts`.
  Rattrapage : ORANGE redemandée à 14:08:21 Z → **valide** (VIES), verdict du fournisseur 90cc1d86 rétabli.
- 6/10 14 h 31 Z (coordinateur) : nouvelle vague. (1) `filed_verification_recente` ne doit plus rendre un
  `indisponible` (doute compris) quand une réponse valide récente existe ; (2) fournisseurs étrangers.
- 6/10 14 h 50 Z : (2) écrit en section 12 ; (1) codé : `omega/modules/identite/migrations/b7_05_recente.sql` (même
  signature, texte d'a4_10 plus une condition : un `indisponible` est ignoré dès qu'une réponse valide **ou invalide**
  de moins de p_jours existe pour le même client ; sinon la règle des deux heures d'a4_10 tient). La fonction est
  celle d'A4 : s'il repose a4_10, il doit reprendre la condition. Test `omega/tests/identite/b7_06_recente.sql`
  (test_b7_12, 11 assertions vertes en local, dont les deux cas du test a4_05 d'A4) ; `^test_b7_` complet vert en local.

- 6/10 14 h 37 Z (coordinateur) : b7_05 posé, `^test_b7_` **12/12** ; A4 prévenu (garder la condition, choisir entre
  élargir la contrainte `registre` et une table à part). Demande : l'adaptateur suisse côté ouvrier, sans toucher à la base.
- 6/10 15 h 00 Z : `omega/functions/identite/uid_ch.ts` écrit, **pas branché** sur `verifier.ts` (attend la voie d'A4) :
  `analyserUidCh` (CHE-123.456.789, suffixe MWST/TVA/IVA), `cleUidChValide` (poids 5 4 3 2 7 6 5 4, mod 11), `UidChSoap`
  (GetByUID, une requête : entreprise + statut TVA, sans clé), lecture des codes eCH-0108 v5.1 (IDE 3/4 actif, 1/2
  valide avec remarque, 5/6/7 radié → invalide ; TVA 2 inscrit, 3 non inscrit → invalide si l'on vérifie un numéro de
  TVA). Faute `Data_validation_failed` = refus du numéro ; toute autre faute, HTTP ≠ 200 ou réseau = indisponible.
  Tests : `tests/uid_ch_test.ts` (10, sur une réponse réelle relevée sur un office fédéral) et le double `UidChFactice` ;
  58 tests Deno verts. Sondé en réel : CHE-116.068.369 et CHE-105.909.036 valides (TVA inscrite), CHE-100.000.006
  inconnue. 27 requêtes en une minute sans refus du service.
- 6/10 14 h 45 Z (coordinateur) : la voie suisse retenue par A4 est d'élargir la contrainte à `uid_ch`, mais cela
  suppose de la retirer, donc l'accord de Teo ; pas prioritaire, l'adaptateur reste prêt et non branché. Suivant :
  HMRC.
- 6/10 15 h 20 Z : `omega/functions/identite/hmrc.ts` + `tests/hmrc_test.ts` (7) + double `HmrcFactice` ; 65 tests
  Deno verts ; formes prises dans la spécification OpenAPI publiée par HMRC (v2.0) ; aucun appel réel. Étapes pour
  Teo en section 13.
- 6/10 15 h 58 Z (coordinateur) : l'audit des promesses note HMRC et UID « à poser » ; suite : les tiers étrangers
  dans FILED.
- 6/10 16 h 20 Z : rien à poser en base pour HMRC et UID (adaptateurs seulement). Aiguillage par registre dans
  l'ouvrier (`uid_ch`, `hmrc`, registre inconnu ignoré), `hmrcDepuisEnv`, `hmrc` dans le battement ; 69 tests Deno
  verts. Ce qui manque en base, section 14 : trois contraintes à élargir (accord de Teo), puis un lot A4 et un lot B7.

- 6/10 16 h 08 Z (coordinateur) : coquille `identite` **v5** à 4ed0bff. Accord (délégué par Teo) pour élargir les trois
  contraintes : A4 écrit le lot (nouvelle contrainte NOT VALID, VALIDATE, retrait de l'ancienne posé à part par le
  coordinateur), la mienne (`identites_registre.registre`) dans le même fichier. Demandé : mon lot et `GUIDE-HMRC.md`.
- 6/10 16 h 40 Z : `omega/GUIDE-HMRC.md` (pour Teo, court) ; `omega/modules/identite/migrations/b7_06_etrangers.sql`
  (`private.identite_cible_etrangere` : TVA `CHE…` → uid_ch + MWST, TVA `GB…` → hmrc, IDE en `id_etranger` →
  uid_ch ; `identite_demander` admet uid_ch et hmrc ; `identite_balayer` les revérifie, VIES d'abord pour l'Union) ;
  test `omega/tests/identite/b7_07_etrangers.sql` (test_b7_13, 26 assertions vertes en local avec les contraintes
  élargies simulées ; il échoue exprès tant qu'elles ne le sont pas). **À poser après le lot d'A4**, sinon le
  balayage heurte la contrainte à chaque passage dès qu'un fournisseur suisse ou britannique existe.
- 6/10 16 h 16 Z (coordinateur) : b7_06 et son test seront posés APRÈS le lot d'A4 (a4_24), pas encore posés.
  Nouvelle tâche : l'ouvrier des taux BCE.
- 6/10 17 h 10 Z : lot `b7_07_taux_bce.sql` (portes, passages, alerte interne, veille), test `test_b7_14`, ouvrier
  `taux-bce` (15 tests Deno) ; sondé en réel. Section 15. Attention : le test des étrangers s'appelle
  `b7_07_etrangers.sql` (dans tests/identite), la migration des taux `b7_07_taux_bce.sql` (dans modules/taux_bce) :
  même numéro, dossiers différents.

