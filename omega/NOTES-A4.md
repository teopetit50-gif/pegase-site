# NOTES — worker A4 (FILED : comptabilité, archivage, pilotage, circuit de validation)

Branche `worker-a4`. Périmètre : `omega/migrations/a4_*.sql`, `omega/tests/filed/`.
Recette seulement (omega-recette) ; la production est au coordinateur.

## Organisation (05/10/2026, passation le 06/10 à 01:10 UTC)

- **06/10, ~01:30 UTC : la session A4 Fable `session_01ScVNMRrPwNeNjD9LBufDVP` (crédit épuisé) est
  remplacée par `session_01FiYEg9p2egKbatQDPJGmFY` (Opus 5.5)**, même branche, même périmètre.


- **Coordinateur depuis le 06/10** : la session `session_01BCGFdpRKBvXKjouC75sYBg` (Opus 5.5) remplace
  la session Fable `session_01B4JNQXyT69GytdvE9SjAnE`. Tout (SHA à poser, résultats, questions) lui est
  adressé désormais ; les règles ne changent pas.

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
| `a4_10_filed_lot7_identite_fournisseur.sql` | lot 7 : `filed_fournisseurs.identite_verifiee_le / identite_source / identite_verdict` ; `private.filed_completer_fournisseur_lu` (SIREN, TVA, IBAN lus par le lecteur remontés vers `fournisseur_lu`, `filed_factures.iban` et le fournisseur) en tête de `filed_controler_facture` (repère, corps en place) ; `filed_repondre_verification` pose le verdict sur le fournisseur et recontrôle ses factures ; `filed_attester_identite` (une personne) ; `filed_controles_identite` lit le verdict ; porte `filed_confirmer_fournisseur`. |
| `a4_11_filed_lot7_controler_facture_complet.sql` | `private.filed_controler_facture` en texte complet (corps de la recette + lignes « Lot 4 (A4) » + appel de `filed_completer_fournisseur_lu` en tête). Remplace les poses par repère d'a4_08 et a4_10, restées sans effet sur la recette pour lot 7. |
| `a4_12_filed_lot7_a_confirmer_non_levable.sql` | correctif (remontée d'A3, 06/10) : le contrôle `fournisseur.a_confirmer` n'est levable par personne. Déclencheur sur `filed_levees` (refus 42501) et sur `filed_controles` (une levée antérieure retombe en `anomalie`). Sortie unique : `filed_confirmer_fournisseur`. Ne dépend pas du corps de `filed_lever_anomalie` (absent des extraits). Test `a4_06_a_confirmer_non_levable.sql`. |
| `a4_13_filed_lot7_demandeur_systeme_iban.sql` | correctif (deux remontées d'A3, 06/10) : (a) déclencheur `demandes_validation_preparer_filed` (après celui du socle) : demandes `filed.valider_facture*` et `filed.valider_iban` déposées par le système, proposant de l'IBAN ajouté à `saisi_par` ; `filed_saisisseurs` ignore les étapes écrites par FILED (`controlee`, `identite_completee`…) ; reprise des demandes de facture ouvertes au nom d'une personne (`filed_reprendre_demandes_facture`, suffixe `:systeme`). (b) une demande d'IBAN annulée est reposée tant que l'IBAN est proposé chez un fournisseur actif (`filed_reproposer_iban`, déclencheur `demandes_validation_filed_iban_annulee`) ; reprise des IBAN déjà orphelins (`filed_reprendre_ibans_sans_demande`). Test `a4_07_demandeur_systeme_iban.sql`. |
| `a4_08_filed_lot4e_branchements.sql` | `private.filed_apres_controle`, `private.filed_balayer_lot4` (+ `private.filed_lot4_passages`) ; `filed_controler_facture` modifié par lecture du corps en place et quatre insertions (identité + exercice après le rapprochement ; statut décidé conservé ; message d'historique ; appel après l'écriture du statut) ; `filed_rapprocher_ligne`, `filed_traiter`, `filed_executer_decision` recopiés en entier + lignes « Lot 4 (A4) ». |

Tests (`omega/tests/filed/`, DO … assert …, tout en rollback, données d'exemple) :
`a4_01_parcours_facture.sql` (identité, exercice, validation par la file, archive au journal, piste
d'audit, imputation posée puis apprise et proposée, comptabilisation, échéancier, règlement,
mesures, export), `a4_02_circuit_et_charges.sql` (circuit à deux approbations, délégation datée,
séparation saisie/approbation, relance puis remontée, refus avec motif et annexes, TVA fausse
bloquante, charges récurrentes et facture absente, écart de prix dans la tolérance signalé,
litige, export à date fixe), `a4_03_identite_tva.sql`, `a4_04_structure.sql`.

## À faire par le coordinateur, dans l'ordre

1. Appliquer `a4_01` → `a4_11` sur la recette (a4_10 puis a4_11 : lot 7, après tout le reste). a4_11
   porte le `delete from public.filed_controles` du socle dans le corps recopié : à poser par psql si
   l'outil bloque sur le mot.
2. **Après `a4_02`** : retirer à la main l'ancienne contrainte CHECK de `filed_factures.statut`
   (celle sans nom explicite, « statut in (a_completer, bloquee, a_valider, ecartee) »). Sans
   cela, la première validation échoue sur « violates check constraint ». La v2 la remplace.
3. Lancer les quatre tests ; chacun finit par « … : tous les contrôles passent. ».
4. Si `public.filed_installer(uuid)` n'existe pas sous ce nom sur la recette, le test 1 le dit
   à sa première ligne : me le signaler.

## État sur la recette (05/10, 17:50 UTC, coordinateur)

- Les neuf migrations sont posées ; `filed_controler_facture` branché ; `filed_factures_statut_check`
  retiré, v2 en place.
- Tests : **les quatre sont verts sur la recette** (18:05 UTC), avec les adaptations ci-dessous,
  toutes reportées dans les tests et la souche locale.
- Adaptations reportées dans les tests et la souche (commit du 05/10 soir) : l'entité principale
  est créée par le socle avec le client (on la lit, on ne l'insère pas) ; `filed_fournisseurs.source`
  = 'saisie' ; `filed_documents.reference` est générée, `nom_fichier` obligatoire, `nature_source`
  = 'humain' ; `filed_commandes.numero_normalise` et `source`, `filed_commandes_lignes.source`,
  `filed_factures_lignes.source` obligatoires ; `pieces.source` = 'depot' ; SIREN unique par
  organisation (l'artisan d'exemple porte 100000009) ; la commande se cite dans
  `filed_factures.refs` (`{"commande": "CMD-1"}`), le rapprochement du socle pose `commande_id`
  lui-même ; `ecart_prix_pct` vaut 0 % à l'installation, le test le règle à 2 %.
- Séparation saisie / approbation : le coordinateur l'a posée dans `private.preparer_approbation`
  (refus à l'insertion si le décideur ou le délégant est dans `payload->'saisi_par'`). FILED ne
  redépose plus après décision : `filed_decider_facture` allégé (a4_07), test réécrit.
- Droits : patron du socle appliqué à toutes les tables des lots 4 à 6 (`revoke all on table …
  from anon, authenticated ; grant select … to authenticated`), comme posé en recette par le
  coordinateur (TRUNCATE/REFERENCES/TRIGGER retirés).

## À vérifier sur la recette (écarts possibles avec la souche locale)

- `private.filed_rapprocher_facture` réel : vérifié, la ligne de facture de même rang est appariée
  (test 8 de `a4_02` vert sur la recette).
- `public.pieces` : les tests insèrent les colonnes NOT NULL données par le coordinateur (module,
  source, nom_fichier, mime, octets, sha256, chemin) ; corrigé le 05/10 à 16:50.
- Les droits `filed.pilotage` des indicateurs (`droit_lecture`, `droit_detail`) : nom choisi
  faute de catalogue des droits ; à aligner si le socle en a un.
- Le push GitHub a été refusé (403) de 16:00 à 16:15 UTC, puis rétabli. Rappel posé à 16:37
  pour vérifier ; sans objet désormais.

## Demandes au coordinateur

- **Séparation saisie / approbation** : posée par le coordinateur dans `private.preparer_approbation`
  (lot 19) à partir de `payload->'saisi_par'` que FILED remplit (`private.filed_saisisseurs`). Fait.
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

## Lot 7 (05/10 soir) — première vraie facture

- **État (20:50 UTC)** : a4_10 et a4_11 posés sur la recette depuis le dépôt (SHA 179fd13), test a4_05
  vert. Recontrôle réel de F-2026-0413 : `identite.siren` « SIREN lu (842115763) mais non vérifié par
  le lecteur », `identite.tva_intracom` idem, `fournisseur.a_confirmer` bloquant, `fournisseur_lu`
  porte `non_verifie`. Le coordinateur ne reposera plus une photo par-dessus : a4_11 est le texte
  de référence de `filed_controler_facture`. Rien d'autre attendu d'A4 sauf remontée de B7 ou A3.

- Constat en base réelle (A3) : `filed_integrer_facture` n'avait remonté que `{nom}` dans
  `fournisseur_lu` alors que le lecteur avait lu `fournisseur.siren / tva / iban`. Lecture des
  corps (`omega/SOCLE-EXTRAITS-COMMUN.sql`) : l'intégration ne reprend que les valeurs SÛRES
  (`verifiee` ou saisies par une personne, `private.filed_valeurs` → `sure`), et le SIREN / la TVA
  de cette pièce étaient lus sans être vérifiés (clé fausse) : l'intégration avait raison. Pas de
  lot 7b. a4_10 garde la même règle : `private.filed_completer_fournisseur_lu` ne reprend que les
  valeurs sûres et justes à la clé, garde à part ce qui est lu sans être vérifié
  (`fournisseur_lu.non_verifie`), et le contrôle dit « SIREN lu (…) mais non vérifié » au lieu
  de « aucun SIREN ». Champs du lecteur : `omega/CHAMPS-LECTURE.md` (worker-a1).
- `private.filed_verification_recente` : une réponse « indisponible » ne vaut que deux heures
  (demande de B7), les autres 90 jours.
- Verdict externe : l'ouvrier B7 passe par `public.filed_repondre_verification` (service_role) ;
  le verdict se pose sur `filed_fournisseurs.identite_*` et les factures sont recontrôlées.
  `identite.registre` passe à « ok » quand le verdict est bon. Une personne peut attester
  (`filed_attester_identite`).
- `filed_confirmer_fournisseur(p_fournisseur, p_motif)` : gérant, admin, valideur ; jamais le
  déposant de la pièce d'origine ; IBAN proposé avec lui validé ; demande `filed.valider_fournisseur`
  en attente annulée ; factures recontrôlées. Test `a4_05_identite_fournisseur.sql`.

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

## Papeterie Delorme / R2026-000003 (06/10, 02:20 UTC) — pas d'a4_14

- A3 : fiche « Sans identifiant ». Hypothèse « lue avant a4_10 » fausse : le recontrôle du 05/10 20:50 a déjà tourné.
- Le SIREN lu 842115763 est non vérifié par le lecteur ET échoue à Luhn (somme 35) : il ne doit pas monter sur la
  fiche. Chemin : une personne saisit les vrais identifiants (valeurs 'humain', donc sûres) par
  `filed_corriger_facture` (à vérifier côté socle) ou confirme la TVA si elle est juste (`filed_confirmer_valeurs`).

## a4_13 (06/10) — posé sur la recette (~02:08 UTC, 5f6aa66)

- Test a4_07 vert par `tester_sans_trace` (notices perdues : on ne sait pas si le cas replica a été joué).
- Réel : IBAN …0189 repris (demande annulée/utilisateur puis en_attente/système). FAC-2026-10-0471 déjà
  approuvée par daf2@ avant la pose (executee) : rien à redéposer. Le (a) reste à démontrer sur la prochaine
  vraie facture née d'un recontrôle (demande attendue : `demandeur_type = 'systeme'`, daf absent de `saisi_par`).

## a4_12 (06/10) — remontée d'A3 : levée de `fournisseur.a_confirmer`

- Constat : rien dans a4_10 / a4_11 ne refusait la levée ; la souche (et l'extrait de `filed_poser_resultat`)
  montre `private.filed_levable` = tout sauf `lecture.%`. Le corps réel de `filed_lever_anomalie` n'est dans aucun
  extrait : la garde est posée sur les tables, pas dans la porte.
- Choix : refus pour **tout le monde**, pas seulement pour le déposant. Lever revient à confirmer sans journal,
  sans valider l'IBAN, pour une seule facture ; les personnes habilitées ont `filed_confirmer_fournisseur`.
- Local : a4_01→a4_12 deux fois, six tests verts ; le cas 2 (porte réelle) ne se joue que sur la recette.
- **Posé sur la recette (06/10, ~01:56 UTC)** depuis 18578a3 ; refus pour tous validé par le coordinateur ;
  0 levée de ce code avant et après ; test a4_06 vert (cas 2 joué contre la vraie `filed_lever_anomalie`), joué par
  `private.tester_sans_trace` (lot 19ae) qui annule tout — la pose depuis le dépôt retire le `rollback;` final.
- À A3 : masquer « Lever avec un motif » pour ce code et montrer « Confirmer le fournisseur ».

## factures.ts : lignes exactes à passer à `atteste: true` (06/10, relevé sur origin/main 70f9b7c)

Pour le coordinateur ou la session du site, **pas sur main par A4**. Condition commune : migrations
a4_01 → a4_11 posées en **production** et les cinq tests verts là-bas (aujourd'hui : recette seulement).
Numéros de ligne de `lib/produits/capacites/factures.ts` à 70f9b7c ; rechercher le texte si le
fichier a bougé.

À passer à `true` dès la production posée (portes + test vert sur la recette) :

| Ligne | Texte (début) | Preuve |
|---|---|---|
| 60 | « Un écart de prix ou de quantité … signalé, pas absorbé. » | a4_08 (rapprochement), test a4_02 n° 8 |
| 62 | « Une pièce reçue après la clôture est orientée vers l'exercice suivant … » | a4_02, test a4_01 |
| 69 | « L'approbation suit le montant, le centre de coût et la société … » | a4_07 `filed_circuits`, test a4_02 |
| 70 | « Au-delà d'un seuil …, deux approbations distinctes … » | a4_07, test a4_02 |
| 72 | « L'approbateur qui n'a pas répondu est relancé, puis … remonte d'un niveau. » | a4_07 `filed_relancer_validations`, test a4_02 |
| 73 | « Le commentaire, la pièce jointe et le motif de refus restent attachés … » | a4_07 `filed_factures_annexes`, test a4_02 |
| 74 | « Celui qui saisit et celui qui approuve ne peuvent pas être la même personne. » | socle `preparer_approbation` + `filed_saisisseurs`, test a4_02 |
| 81 | « L'imputation analytique s'apprend sur vos écritures passées … » | a4_02 apprentissage, test a4_01 |
| 82 | « Chaque pièce est affectée au plan comptable et au centre de coût … » | a4_01/a4_02, test a4_01 |
| 85 | « Les charges récurrentes produisent leurs écritures d'abonnement … » | a4_03, test a4_02 |
| 86 | « L'archivage est à valeur probante, et la piste d'audit … » | a4_05, test a4_01 |
| 94 | « L'engagé du mois se lit par fournisseur, par société et par centre … » | a4_06 `filed_engage_mois`, test a4_01 |
| 95 | « L'échéancier fournisseur … trente et soixante jours. » | a4_06 `filed_echeancier`, test a4_01 |
| 96 | « Le délai moyen de traitement se mesure … » | a4_06 `filed_delai_traitement`, test a4_01 |
| 97 | « Les pièces bloquées, en litige ou en attente d'approbation sont comptées … » | a4_06 `filed_pieces_en_cours`, test a4_01 |
| 98 | « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. » | a4_06 export + exports programmés, tests a4_01 et a4_02 |

Sous condition supplémentaire :

| Ligne | Texte (début) | Ce qui manque |
|---|---|---|
| 58 | « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. » | Format, clé et cohérence : faits (a4_04, test a4_03). L'existence au registre exige l'ouvrier B7 en marche en production **et** `SIRENE_API_KEY` posée par Teo. Avant cela : rester à `false`. |
| 71 | « Une délégation d'approbation se pose pour une absence, avec sa date de fin. » | Porte du socle (testée par FILED, test a4_02) : à attester par le coordinateur, pas par A4. |
| 87 | « Le journal des pièces reçues est numéroté en continu et ne se modifie pas. » | Lot F1 du socle (`filed_documents` R2026-…, `filed_historique` immuable) : au coordinateur. |

Hors A4, à laisser tels quels : 57 (alerte changement d'IBAN : `filed_fournisseurs_ibans` /
`filed.valider_iban` du socle F1 — A4 ne fait que valider l'IBAN proposé avec un fournisseur
confirmé), 59 (rapprochement à trois voies commande / réception / facture : la réception n'est
pas rapprochée par A4), lignes 31–48 (lecture : A1).

## Demain

- Retours de la recette : corriger, re-pousser.
- Le coordinateur repose la migration correctrice (a4_07 allégé, droits) ; puis la production,
  à sa main, et les lignes du site à `atteste: true`.
- L'écran : rien ici ; les portes et les fonctions de lecture sont prêtes pour lui.
