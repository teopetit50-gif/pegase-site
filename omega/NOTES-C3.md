# Session C3 — REPUT : la réponse aux demandes clients

Branche `worker-c3`. Coordinateur : `session_01BCGFdpRKBvXKjouC75sYBg`.
Commencée le 06/10/2026. Je n'appelle jamais Supabase : le coordinateur pose, je lis les sorties brutes.

## Ce que le site promet et ce que C3 rend vrai

La réception existe (A2 : courriel Brevo sur recu.omegaai.fr, formulaire signé, WhatsApp → `public.receptions`,
événement `reception.nouvelle`). La réponse n'existait pas. Règle de fond (coordinateur) : la réponse est
**préparée dans la minute** par le modèle à partir de la base du client, **attend la validation** dans la file,
et **ne part seule que sur les sujets autorisés d'avance** par un accord permanent du socle (`public.politiques`),
sujet par sujet. Jamais de données de santé hors canal agréé (verrous 19ab et D6 du socle).

## Paliers

| Palier | Contenu | État |
|---|---|---|
| 1 | Base de connaissances par client (questions-réponses, horaires, tarifs, documents ; source et validité ; versions) ; sujets ; réglages par entité ; abonnement `reception.nouvelle → reput` | **écrit, 66/66 en local** — à poser |
| 2 | Préparation : classement (sujet), brouillon sourcé, « je ne sais pas », langue ; dépôt en envoi `a_valider` sur le canal de la demande | à faire |
| 3 | Accord permanent par sujet (envoi seul) ; point du matin « reçues, en attente, répondues » | à faire |
| 4 | Écran `/espace/reput` : demandes, réponses à valider (Valider / Corriger / Refuser), base, sujets autorisés | à faire |
| 5 | Autres lignes de `lib/produits/capacites/accueil.ts` : rendez-vous, relance de devis, avis… | à faire |

## Palier 1 — `c3_01_base_connaissances.sql`

Tables (lues sous RLS, écrites par les portes seulement) :
- `reput_reglages` (organisation, ou entité) : signature, formule d'appel, formule de politesse, ton
  (vouvoiement / tutoiement), mention de la réponse automatisée (termes du client), langues couvertes, actif.
- `reput_sujets` : onze sujets posés à l'installation. `reclamation`, `urgence`, `humain`, `litige`, `autre`
  ne sont **jamais** autorisables à l'envoi seul (figé par la porte, même réécrits).
- `reput_connaissances` : fiche (genre question / horaires / tarif / document / information), sujet, titre,
  contenu, langue, **source obligatoire**, pièce rattachée, `valide_du` / `valide_au`, statut
  brouillon → validée → remplacée / retirée, **versions** (`origine_id`, `version`, `remplace_id`), rédacteur,
  valideur, dates ; chaque écriture au journal opposable (`reput.connaissance_creee|corrigee|validee|retiree`).

Portes : `reput_installer` (serveur, gérant, admin ; rejouable), `reput_regler`, `reput_ecrire_sujet` (gérant,
admin), `reput_ecrire_connaissance` (gérant / admin / valideur → validée ; collaborateur → brouillon ; périmètre
d'entité), `reput_valider_connaissance`, `reput_retirer_connaissance` (motif obligatoire), `reput_base`
(**serveur seul** : la base en vigueur à un instant, pour la fonction Edge du palier 2).

Abonnement : `reception.nouvelle` → module `reput`, genre `reput.preparer` (l'ouvrier ignorera les réceptions
d'un autre module). Tables inscrites dans `private.tables_locataires` (export, effacement).

Droits : fonctions de `private` révoquées de public/anon/authenticated (test 44) ; aucune vue (46) ; SELECT
seul pour authenticated, une politique SELECT par table (51).

Tests : `omega/tests/reput/c3_00_jeu.sql` (aides), `omega/tests/reput/c3_01_base.sql` (66 assertions).
Joués sur une souche Postgres 16 **locale** (`omega/tests/reput/souche_locale/jouer.sh`, socle imité de B4) :
**66/66**. Reste à les jouer sur la recette.

### Ordre de pose (palier 1)

1. `omega/modules/reput/migrations/c3_01_base_connaissances.sql`
2. `omega/tests/reput/c3_00_jeu.sql` (après `omega/tests/socle/00_installation.sql` d'A5)
3. `omega/tests/reput/c3_01_base.sql` → `runtests('tests', '^test_c3_01_')`, puis socle 44, 46, 51.

## Lignes de capacité (`lib/produits/capacites/accueil.ts`) : tenues et preuves

| Ligne | État | Preuve |
|---|---|---|
| La base est versionnée : chaque règle porte sa date et son auteur. | **tenue côté base** (palier 1) | c3_01 : version 2, `remplace_id`, `cree_par`, `valide_par`, `valide_le`, journal |
| Une modification de tarif ou d'horaire s'applique à la réponse suivante. | base : tenue (la version corrigée remplace aussitôt la précédente dans `reput_base`) ; réponse : palier 2 | c3_01 « la réponse suivante la cite » |
| Le ton, la signature et les formules se règlent entité par entité. | réglages : tenus ; usage dans la réponse : palier 2 | c3_01 « Lyon signe de sa propre signature » |
| La réponse est tirée de la base de connaissances construite avec vos équipes. | palier 2 | — |
| Hors de cette base, le système ne formule aucune hypothèse et transfère. | palier 2 | — |

## Questions au coordinateur

1. `private.envois_suivre_demande` (déclencheur AFTER UPDATE OF statut sur `demandes_validation`) : je
   compte déposer pour chaque réponse **ma** demande de validation (`type_action = 'reput.repondre.<sujet>'`,
   objet `reput_reponses`) puis l'envoi par `preparer_envoi(…, p_options => {"demande": <id>})` (envoi
   **adossé**). Couverte par une politique du sujet, la demande naît approuvée et l'envoi part (verrous du
   socle compris) ; sinon l'envoi reste `a_valider` et suit la décision. Le déclencheur valide-t-il bien un
   envoi adossé quand sa demande passe `approuvee`, et l'annule-t-il quand elle passe `rejetee` ? Sa source
   m'aiderait (absente des extraits).
2. `private.politique_couvrante` : sa source aussi (le libellé du type d'action est-il comparé tel quel ?).

## Journal de session

- 06/10, ~17 h 30 Z : lecture (AUDIT-PROMESSES, CONTRAT-OUVRIER, extraits du socle, Daliro b6_06/b6_08,
  tests A5 44/46/51). Palier 1 écrit, souche locale montée, 66/66.
