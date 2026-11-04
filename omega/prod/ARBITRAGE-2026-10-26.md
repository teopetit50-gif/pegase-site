# Arbitrage production / recette — 26/10/2026

Fait le 26/10 sur `worker-a5`, **sans aucune écriture en production** (lectures du catalogue seulement). Teo était
absent : chaque décision est la plus prudente, et elle est notée. Méthode, outils et sorties : § 6.

---

## Ce que Teo doit encore faire lui-même

1. **Réinitialiser le mot de passe de la base de production** (exposé le 23/10) : Supabase → omega-core-eu → Connect
   → *Reset your database password*.
2. **Une sauvegarde de la production de moins d'une heure avant la pose** (Supabase → Database → Backups, ou
   `pg_dump -Fc` depuis le Mac, hors du dépôt).
3. **Poser les secrets de production** (noms seulement ; Supabase → Edge Functions → Secrets), pour les modules
   qu'il ouvre :
   - IA : `ANTHROPIC_API_KEY` (clé de production) ; facultatifs `ANTHROPIC_MODEL_ID`, `PLAFOND_IA_JOUR_CLIENT_EUR`,
     `MISTRAL_API_KEY` ;
   - envois : `BREVO_API_KEY`, `BREVO_WEBHOOK_JETON`, `ALERTES_ENVIRONNEMENT` ;
   - réception : `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN` ;
   - widget : `WIDGET_SEL` ; export : `EXPORT_ORIGINES` ; identité : `SIRENE_API_KEY` ;
   - messagerie : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
     `MICROSOFT_TENANT`, `MESSAGERIE_RETOUR_BASE`, `MESSAGERIE_ECRAN` ;
   - AR24 : `AR24_TOKEN`, `AR24_CLE_PRIVEE`, `AR24_URL`, `AR24_WEBHOOK_URL` ;
   - REPUT (Twilio réel) : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMERO`, `REPUT_ASTREINTE_URL`,
     `REPUT_ASTREINTE_JETON`, `REPUT_APPELS_URL` ;
   - Tamila : `SCALEWAY_SECRET_KEY`, `SCALEWAY_PROJECT_ID`, `SCALEWAY_REGION`, `TAMILA_COFFRE_ORIGINES`.
4. **Vault de production** : `cle_service` (clé `service_role` de la production) et `reput_astreinte_jeton` (= le
   secret `REPUT_ASTREINTE_JETON`).
5. **Donner le feu vert**, étape par étape (RUNBOOK-20261026.md) : gel et dernière répétition, puis chaque palier P1 à
   P6 (`poser-palier.sh Pn --essai`, puis `poser-palier.sh Pn`), puis les fonctions Edge, les crons, les réglages, la
   fusion des écrans.
6. Trois décisions restées ouvertes, avec la décision prudente prise en attendant :
   - **a5_01 rouvre l'EXECUTE par défaut des futures fonctions de `public`** à `anon` et `authenticated` (la
     production l'avait fermé). Pris : on la garde telle quelle, toutes les portes ont été éprouvées ainsi ; à
     confirmer par Teo.
   - **`espace_url`** : la recette dit `https://app.omegaai.fr/espace`, l'espace client est `omegaai.fr/espace2`.
     Pris : rien n'est posé (les fonctions retombent sur leur valeur par défaut) ; à trancher par Teo.
   - **Clé IA** : API Anthropic directe (décision de Teo du 25/10) ; écart à la promesse « données en Europe », à
     régler avant le premier vrai client.

---

## En bref

| Écarts relevés le 26/10 | Nombre | Décision |
|---|---|---|
| Fonctions qui ne diffèrent que par les commentaires ou les espaces | 15 | rien : on garde ce que la séquence pose (comportement identique) |
| Fonctions où la recette a une version plus récente, que la séquence ne ramène pas | 7 | **garder la recette** : lot d'alignement en fin de P5 |
| Politique RLS (`delegations`) | 1 | rien : écart d'écriture (parenthèses) dû à la restauration du relevé ; en production réelle, identique à la recette |
| Contraintes (`points_*`, `politiques`) | 5 | rien : même cause, même sens |
| Droits (ACL) | 34 en 10 familles (les 194 du 25/10 étaient pour l'essentiel un artefact d'ordre, § 4) | **garder la production**, plus fermée ; aucun écran n'en dépend |

Résultat : la répétition `repetition-20261026k` (§ 5).

---

## 1. Les 22 fonctions

Colonnes : ce que c'est ; d'où vient l'écart ; risque pour omegaai.fr si on ne fait rien ; décision.

### 1.1 Vraie différence de comportement : la recette a raison (7) → lot d'alignement

| Fonction | Ce que c'est | D'où vient l'écart | Risque si rien | Décision |
|---|---|---|---|---|
| `private.filed_saisisseurs(uuid)` | FILED : qui a saisi une facture (pour la séparation saisie / approbation) | a4_13 reposé sur la recette à un commit plus récent (étapes « que FILED écrit lui-même en contrôlant ») sans nouvelle ligne | une personne qui n'a fait que déclencher un contrôle est vue comme saisisseur : son approbation est refusée à tort | **recette** |
| `private.grp_proposer_aretes(uuid, grp_installations, boolean)` | Varelo : rapprochement des sociétés d'un groupe | retouche **faite à la main** sur la recette (CTE `materialized`), sur aucun fichier | même résultat, mais calcul non borné sur un gros groupe (lenteur, délai dépassé) | **recette** ; le fichier `varelo_referentiel_perf` est à mettre à jour par la session Varelo |
| `private.lorani_alerter_rappel(…)` | Lorani : rappel d'échéance d'un permis | b5_27 (liens `/espace2`) reposé plus récent sans ligne | lien du courriel faux (`/espace2/lorani`) | **recette** |
| `private.lorani_chantier_rappeler(travaux)` | Lorani : rappels du chantier | b5_20 (points de chantier) écrasé ensuite par `b6_33_b5_30`, pris à un commit plus ancien | une question ou une action de chantier en retard ne prévient personne | **recette** |
| `private.lorani_lectures_passage()` | Lorani : ouvrier qui range les pièces lues | b5_23 et b5_26 écrasés par `b6_33_b5_30` plus ancien | offres, CERFA, attestations RE2020, plans BET, notices, compléments du PLU ne sont plus traités | **recette** |
| `private.lorani_valeurs_de_piece(uuid)` | Lorani : valeurs lues d'une pièce | b5_06 reposé plus récent sans ligne | une liste de pièces devient du texte | **recette** |
| `public.loc_refacturer_peages(uuid)` | Tavaro : refacturer les péages | b2_14 reposé plus récent sans ligne | ligne de péage chiffrée avec la mauvaise unité ; message d'erreur imprécis | **recette** |

Aucune de ces fonctions n'existe en production aujourd'hui : **aucun risque pour le site actuel** ; le risque
porterait sur les premiers clients Lorani, Tavaro, Varelo et FILED.

### 1.2 Commentaires et espaces seulement (15) → rien

Vérifié par la répétition : même texte une fois retirés les commentaires `--` et les écarts d'espaces.

| Fonction | D'où vient l'écart | Décision |
|---|---|---|
| `private.envoyer_alertes()`, `private.exporter_client(uuid,uuid)`, `private.modifier_demande(…)`, `private.tracer()` | la production a la version **avec** commentaires (fichiers du dépôt) ; la recette celle posée par `execute_sql` sans commentaires | **production** (inchangée par l'export) |
| `public.f_audit_trail()` | fonction du site d'avant (v2_7) ; mise en forme différente | **production** |
| `private.filed_decider_facture`, `private.filed_deposer_validation`, `private.filed_regler_circuit` | FILED a4_13 et ses retouches par repère (a4_14, a4_32, a4_44, a4_75, a4_76) : même code, commentaires différents | ce que pose la séquence |
| `private.tiroma_brancher_cabinet`, `tiroma_changer_mode`, `tiroma_installer_cabinet`, `tiroma_role_session` et les trois portes de `public` | Tiroma b3_01 : la recette a la forme compacte (une ligne), le dépôt la forme développée | ce que pose la séquence |

Risque pour omegaai.fr : aucun (même comportement).

---

## 2. La politique : `delegations."chacun voit ses delegations, gerants et admins toutes"` → rien

Écart d'écriture seulement : `(((a OR b)) OR c)` d'un côté, `((a OR b) OR c)` de l'autre. En production réelle, le
relevé du 25/10 la donne **identique** à la recette ; l'écart naît de la restauration du relevé (`pg_dump`) dans la
répétition. Aucun fichier de l'export n'y touche. Décision : **rien**.

## 3. Les 5 contraintes → rien

`points_gabarits_texte_check`, `points_items_texte_check`, `points_reglages_jours_check`,
`points_sections_titre_check`, `politiques_type_action_check` : `((a AND b) AND c)` contre `(a AND b AND c)`. Même
cause que la politique : identiques entre la production réelle et la recette (relevé du 25/10). Décision : **rien**.

## 4. Les droits

**Les 194 droits du 25/10** étaient pour l'essentiel un artefact : le relevé concaténait les droits dans un ordre
non défini (`string_agg … order by 1` sur une constante) ; la recette écrivait `service_role,authenticated` et la
production `authenticated,service_role`. Corrigé dans `releve.sql` et `empreinte.sql` ; la comparaison se fait
maintenant par ensembles. **Restent 34 objets, en 10 familles, tous dans le même sens : la recette donne plus que la
production**, parce que ses droits par défaut ouvrent tout à `anon` et `authenticated` alors que la production les a
fermés (elle ne donne qu'à `postgres` et `service_role`).

**Règle appliquée : le droit le plus fermé l'emporte, sauf si un écran ou une porte en a besoin.** Vérifié pour
chaque famille ; aucune n'en a besoin. Décision : **garder la production** pour les 34.

| Famille | Objets | Recette a en plus | Pourquoi personne n'en a besoin |
|---|---|---|---|
| Séquences créées par l'export | 11 (`cashd_taux_demandes_id_seq`, `consommations_ia_id_seq`, `depots_fichiers_id_seq`, `filed_conservation_id_seq`…) | `anon` et `authenticated` : SELECT, UPDATE, USAGE | aucune de leurs tables ne reçoit d'insertion directe d'`authenticated` : tout passe par des portes `security definer` (vérifié sur les 19 séquences) |
| Séquences déjà en production | 8 (`envois_evenements_id_seq`, `filed_historique_id_seq`, `journal_opposable_id_seq`, `suivis_evenements_id_seq`…) | idem | idem ; la production les a retirées exprès |
| Vues et tables BTP créées par l'export | 6 (`btp_avenants_chiffres`, `btp_avenants_lignes_chiffrees`, `btp_debourse_lots`, `btp_factures_chantier_detail`…) | `authenticated` : DELETE, INSERT, UPDATE, MAINTAIN | vues de lecture ; l'écriture passe par les portes Daliro |
| `filed_commandes_suivi` | 1 | idem | lecture seule pour les membres ; écrit par les portes FILED |
| `audit_journal`, `moteurs_reconnus`, `profils_metier` | 3 | `anon` : SELECT, DELETE, MAINTAIN ; `authenticated` : SELECT, MAINTAIN | tables du site d'avant ; la production les a fermées et le site marche ainsi aujourd'hui |
| `clients` | 1 | `anon` : SELECT, DELETE, MAINTAIN ; `authenticated` : MAINTAIN | idem ; `anon` ne doit jamais lire les organisations |
| `catalogue_site` | 1 | `anon` : DELETE, MAINTAIN ; `authenticated` : MAINTAIN | le site lit le catalogue (SELECT, gardé) ; il n'y écrit pas |
| `lorani_echeances_permis` | 1 | `anon` et `authenticated` : écriture, MAINTAIN | référentiel lu par les portes Lorani |
| `tamila_registre`, `comptes` | 2 | `authenticated` : MAINTAIN | MAINTAIN (Postgres 17 : VACUUM, ANALYZE…) n'a pas d'usage pour un membre |

Droits par défaut (`postgres` dans `public`, tables et fonctions) : la production est plus fermée que la recette.
Décision : **production** pour les tables ; pour les fonctions, a5_01 pose le comportement Supabase (décision ouverte
n° 6 ci-dessus).

## 5. Export, runbook, répétition

- **Export** refait le 26/10 à 19 h 00 Z : **464 fichiers**, dont les 18 lignes posées sur la recette depuis le 25/10
  (c4_37 posé deux fois, c3_44, c3_45, a1_01 et a1_02 et leur reprise, a4_87 à a4_92, c2_42 à c2_45, c4_38) et le
  **lot d'alignement** `20261026183917_alignement_arbitrage.sql` (fin de P5, avant la clôture).
  Corrigé au passage : la note « c4_08 test @ … » faisait reprendre la **migration** c4_08 (état ancien d'OFFLOAD).
- **Fonctions Edge** : lecteur v71 (`f8c811e1`, worker-a1), reput-reponse v32 (`af472f50`, worker-c3) ; coquilles
  de production à jour (`omega/prod/coquilles/`).
- **Répétition** `repetition-20261026k` (26/10, 19 h 15 Z) : **468 fichiers posés sans un échec** (relevé de la
  production + 464 migrations, en rôle `postgres`, droits par défaut de la production), **garde-fous tous verts**,
  aucun cron actif ni appel sortant. Écarts restants avec la recette, tous voulus : les 15 fonctions du § 1.2, la
  politique du § 2, les 5 contraintes du § 3, les 34 droits du § 4, 2 droits par défaut, les crons inactifs de la
  répétition et les 11 crons Edge posés à part, les objets du site d'avant. Les 7 fonctions du § 1.1 sont identiques à
  la recette.

## 6. Méthode et outils (pour refaire l'arbitrage au gel)

- `omega/prod/arbitrage/recette-definitions.json`, `recette-droits.tsv`, `production-droits.tsv` : relevés par le
  connecteur (catalogue seulement).
- `omega/prod/arbitrage/relever.py` et `comparer.py` : joués par la répétition **avant** la séquence (état de la
  production) et **après** ; comparaison à trois voies, hors commentaires et espaces, une annotation par écart.
- `omega/prod/arbitrage/corps.py` : la même comparaison des corps de fonctions, faite sur les fichiers seuls.
- `omega/prod/arbitrage/alignement.sql` : le lot d'alignement ; `assembler.mjs --cloture` le place avant a5_01.

**Pourquoi ces écarts existent** : des lots ont été reposés sur la recette à un commit plus récent sans nouvelle ligne
`schema_migrations` (21 lots entiers le 25/10, 6 versions de fonctions le 26/10), et une fonction a été retouchée à la
main. **Règle pour les sessions de travail** : toute pose sur la recette, y compris une repose, écrit sa ligne.
