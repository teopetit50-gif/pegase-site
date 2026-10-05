# NOTES — worker A4 (FILED : comptabilité, archivage, pilotage, circuit de validation)

Branche `worker-a4`. Périmètre : `omega/migrations/a4_*.sql`, `omega/tests/filed/`.
Recette seulement (omega-recette) ; la production est au coordinateur.

## Organisation (05/10/2026)

- Le coordinateur applique sur la recette : chaque appel direct à l'outil Supabase bloquait la
  session. Les migrations et les tests sont écrits ici, commités et poussés sur `worker-a4`.
- Les corps du socle viennent de `omega/SOCLE-EXTRAITS-FILED.sql` (origin/main) et des trois
  messages du coordinateur. Rien n'a été écrit à l'aveugle.
- **Validation locale** : un PostgreSQL 16 de la session, avec une souche du socle
  (`omega/tests/filed/souche_locale/`). Les huit migrations s'appliquent dans l'ordre, puis une
  seconde fois (idempotence), et les quatre fichiers de tests passent. Ce n'est pas la recette :
  les écarts possibles sont listés plus bas.

## Fait (prêt à poser, dans l'ordre)

| Fichier | Ce qu'il pose |
|---|---|
| `a4_01_filed_lot4a_comptabilite_tables.sql` | `filed_exercices`, `filed_plan_comptable`, `filed_centres_cout`, `filed_imputations`, `filed_imputations_apprises`, `filed_charges_recurrentes`, `filed_charges_attendues` ; RLS, `maj_le`, effacement. |
| `a4_02_filed_lot4b_comptabilite_portes.sql` | statut de facture étendu (`validee`, `refusee`, `comptabilisee`, contrainte `filed_factures_statut_v2`) ; `filed_factures_exercices` et l'orientation après clôture avec sa mention ; portes `filed_ouvrir_exercice`, `filed_cloturer_exercice`, `filed_poser_compte`, `filed_retirer_compte`, `filed_poser_centre`, `filed_retirer_centre`, `filed_imputer_facture` ; apprentissage et proposition (`filed.imputer`, décision `private.filed_decider_imputation`) ; contrôles `exercice.cloture`, `exercice.absent`. |
| `a4_03_filed_lot4c_charges_recurrentes.sql` | `filed_declarer_charge_recurrente`, `filed_arreter_charge_recurrente` ; écritures attendues treize mois devant ; facture reconnue (`recurrence.reconnue`, imputation proposée) ; facture attendue absente → alerte `attention` au client. |
| `a4_04_filed_lot4d_controles_identite.sql` | `private.filed_tva_intracom_analyser` (format des 27 États + XI ; clé pour FR, BE, DE, IT, LU, NL, PT, DK, FI, SE, PL, AT, SI, HU), `filed_siren_de_tva_fr`, `filed_verifications_tiers` (VIES / Sirene, écrites par l'ouvrier par `public.filed_repondre_verification`, service_role), contrôles `identite.tva_intracom`, `identite.siren`, `identite.coherence`, `identite.registre`. |
| `a4_05_filed_lot5a_archivage_probant.sql` | `filed_archives` (ajout seul), `private.filed_archiver` (empreinte SHA-256 : fichier, valeurs lues, numéro de réception, version ; inscrite au journal opposable), `filed_verifier_archive`, `filed_piste_audit`. |
| `a4_06_filed_lot6a_pilotage.sql` | `filed_reglements`, `filed_litiges` et leurs portes ; `filed_engage_mois`, `filed_echeancier`, `filed_delai_traitement`, `filed_pieces_en_cours` ; huit indicateurs `filed.*` et `private.filed_mesurer` ; `filed_exporter_tableau` (CSV, journal avec empreinte) ; exports programmés (`filed_programmer_export`, `filed_arreter_export`, `private.filed_produire_exports`). |
| `a4_07_filed_lot4f_circuit_validation.sql` | `filed_circuits` (→ `regles_validation`), `filed_validations`, `filed_factures_annexes` ; `filed_regler_circuit`, `filed_retirer_circuit`, `filed_joindre_annexe`, `filed_comptabiliser_facture` ; `private.filed_deposer_validation` (type `filed.valider_facture[.<centre>][.direction]`), `filed_decider_facture`, `filed_relancer_validations`, `filed_saisisseurs`. |
| `a4_09_filed_lot4g_acquittement_alerte.sql` | correctif : `private.filed_reconnaitre_charge` acquitte l'alerte « facture attendue absente » (`alertes.acquittee_le`) quand la facture arrive tard. |
| `a4_08_filed_lot4e_branchements.sql` | `private.filed_apres_controle`, `private.filed_balayer_lot4` (+ `private.filed_lot4_passages`) ; `filed_controler_facture` modifié par lecture du corps en place et quatre insertions (identité + exercice après le rapprochement ; statut décidé conservé ; message d'historique ; appel après l'écriture du statut) ; `filed_rapprocher_ligne`, `filed_traiter`, `filed_executer_decision` recopiés en entier + lignes « Lot 4 (A4) ». |

Tests (`omega/tests/filed/`, DO … assert …, tout en rollback, données d'exemple) :
`a4_01_parcours_facture.sql` (identité, exercice, validation par la file, archive au journal, piste
d'audit, imputation posée puis apprise et proposée, comptabilisation, échéancier, règlement,
mesures, export), `a4_02_circuit_et_charges.sql` (circuit à deux approbations, délégation datée,
séparation saisie/approbation, relance puis remontée, refus avec motif et annexes, TVA fausse
bloquante, charges récurrentes et facture absente, écart de prix dans la tolérance signalé,
litige, export à date fixe), `a4_03_identite_tva.sql`, `a4_04_structure.sql`.

## À faire par le coordinateur, dans l'ordre

1. Appliquer `a4_01` → `a4_09` sur la recette.
2. **Après `a4_02`** : retirer à la main l'ancienne contrainte CHECK de `filed_factures.statut`
   (celle sans nom explicite, « statut in (a_completer, bloquee, a_valider, ecartee) »). Sans
   cela, la première validation échoue sur « violates check constraint ». La v2 la remplace.
3. Lancer les quatre tests ; chacun finit par « … : tous les contrôles passent. ».
4. Si `public.filed_installer(uuid)` n'existe pas sous ce nom sur la recette, le test 1 le dit
   à sa première ligne : me le signaler.

## Bloqué / à vérifier sur la recette (écarts possibles avec la souche locale)

- `private.filed_rapprocher_facture` réel : le test 8 de `a4_02` suppose qu'une ligne de facture
  de même rang qu'une ligne de commande est appariée (la souche le fait par rang). Si le réel
  apparie autrement, seul ce test est à adapter, pas le code.
- `public.pieces` : les tests insèrent les colonnes NOT NULL données par le coordinateur (module,
  source, nom_fichier, mime, octets, sha256, chemin) ; corrigé le 05/10 à 16:50.
- Les droits `filed.pilotage` des indicateurs (`droit_lecture`, `droit_detail`) : nom choisi
  faute de catalogue des droits ; à aligner si le socle en a un.
- Le push GitHub a été refusé (403) de 16:00 à 16:15 UTC, puis rétabli. Rappel posé à 16:37
  pour vérifier ; sans objet désormais.

## Demandes au coordinateur

- **Séparation saisie / approbation** : le coordinateur l'ajoute dans `private.preparer_approbation`
  (refus si le décideur est dans `payload->'saisi_par'`) ; FILED garde son filet *après* la décision
  (`filed_decider_facture` : approbation sans effet, demande redéposée, alerte). Le socle ne
  refuse que le `demandeur_id`, nul pour une demande système. Pour refuser *avant* la décision,
  une ligne dans `private.preparer_approbation` suffirait : refuser `v_decideur` s'il est dans
  `v_d.payload->'saisi_par'` (FILED y met les déposants et correcteurs). À votre main.
- **Alerte « facture attendue absente »** : acquittée (`acquittee_le`) par
  `private.filed_reconnaitre_charge` quand la facture arrive tard (a4_09, sur indication du
  coordinateur : pas de porte générique, un update sur `public.alertes`).
- **Ouvrier VIES / Sirene** (hors base, à confier à un ouvrier) : lire
  `filed_verifications_tiers` où `repondu_le is null` ; pour `registre = 'vies'`, appeler le
  service SOAP/REST VIES de la Commission (`checkVatService`, pays = 2 premières lettres,
  numéro = le reste) ; pour `'sirene'`, l'API Sirene de l'INSEE (`/siren/{siren}`, état
  administratif A/C) ; écrire la réponse par `public.filed_repondre_verification(id, 'valide' |
  'invalide' | 'indisponible', preuve jsonb {nom, adresse, etat, date})` avec la clé service ;
  puis recontrôler les factures du fournisseur (`private.filed_controler_facture` sur les
  factures en `a_valider` / `bloquee`). Une réponse vaut 90 jours (`filed_verification_recente`).
  Aucun secret en base : les clés d'API restent chez l'ouvrier.
- **Site** (`lib/produits/capacites/factures.ts`, hors de mon périmètre) : les lignes ci-dessous
  peuvent passer à `atteste: true` une fois la recette verte et la production poussée.
- Le `cron.job 'omega-filed'` suffit : le balayage du lot 4 tourne dans `filed_traiter`, une
  fois par heure et par organisation. Aucune tâche cron à ajouter.

## Lignes de factures.ts rendues vraies

Famille « Contrôles avant classement » :
- « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. » — format
  et clé en SQL, cohérence TVA/SIREN ; l'existence au registre (VIES, Sirene) par l'ouvrier
  décrit ci-dessus, lue par le contrôle `identite.registre`.
- « Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé. »
- « Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention. »

Famille « Circuit de validation » (reprise sur demande du coordinateur) :
- « L'approbation suit le montant, le centre de coût et la société concernée. »
- « Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées. »
- « Une délégation d'approbation se pose pour une absence, avec sa date de fin. » (socle,
  testé par FILED)
- « L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau. »
- « Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture. »
- « Celui qui saisit et celui qui approuve ne peuvent pas être la même personne. »

Famille « Comptabilité et archivage » :
- « L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur. »
- « Chaque pièce est affectée au plan comptable et au centre de coût qui la portent. »
- « Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie. »
- « L'archivage est à valeur probante, et la piste d'audit reste reconstituable. »
- « Le journal des pièces reçues est numéroté en continu et ne se modifie pas. » — déjà vrai
  par le lot F1 (`filed_documents` numérotées R2026-000001, `filed_historique` immuable) ; pas
  mon travail, à attester par le coordinateur.

Famille « Pilotage » :
- « L'engagé du mois se lit par fournisseur, par société et par centre de coût. »
- « L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours. »
- « Le délai moyen de traitement se mesure de la réception au classement. »
- « Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu. »
- « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. »

## Demain

- Retours de la recette : corriger, re-pousser.
- Si le coordinateur retient la ligne dans `preparer_approbation`, retirer la redéposition
  post-décision de `filed_decider_facture` (elle devient inutile).
- L'écran : rien ici ; les portes et les fonctions de lecture sont prêtes pour lui.
