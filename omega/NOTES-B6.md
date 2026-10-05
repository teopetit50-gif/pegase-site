# Session B6 — DALIRO, le module des entreprises du bâtiment

Branche `worker-b6`. Coordinateur : session `session_01B4JNQXyT69GytdvE9SjAnE`.
Dernière mise à jour : 05/10/2026, 23 h 05 UTC — SESSION MISE EN PAUSE par le coordinateur (limite d'usage de Teo) ; état exact et prochaine étape ci-dessous.

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce que le scénario demande, prouvé par pgTAP sur la recette) | **45 %** | lot 1 posé par le coordinateur (b6_01 à b6_04, migration `daliro_b6_01_04_lot1`) ; garde-fous 38/39 verts au premier passage (le 39e retiré : postgres = Omega) ; le parcours b6_01 n'a pas encore été évalué (il mourait sur un alias masqué, corrigé en 7dbdc3a) → **à rejouer** |
| **Livrable client** (/espace/daliro en ligne, relu avec le compte du banc) | **55 %** | l'écran est écrit, tsc ✓, eslint ✓, build ✓, recette aux cinq largeurs ✓ (captures dans omega/recette-b6/), enchaînements d'exemple 3/4 ✓ ; pas encore fusionné dans main, pas encore relu en base réelle |

### État exact à la pause (05/10, 23 h 05 UTC) et prochaine étape

- **Poussé sur worker-b6** : migrations b6_01..04, tests b6_00..02, l'onglet dans `components/espace/ecrans.ts`, l'écran complet (`components/espace/daliro/` : types, etats, exemples, portes, EcranDaliro, ChantierVue ; `app/espace/daliro/page.tsx`), le script `omega/recette-b6/recette-daliro.mjs` et onze captures.
- **Dernier message du coordinateur** : lot 1 posé ; b6_03 à reposer (grants `btp_est_serveur` / `btp_voit_prix`) puis rejouer b6_01 et b6_02 sur 7dbdc3a. Il m'écrit à la reprise.
- **Reste en rouge dans la recette d'exemple (1 sur 56)** : « Maison Rolland : le marché est Vérifié, figé ». Cause : dans `ChantierVue.tsx`, après le rattachement de la ligne sans lot, le bouton « Vérifier le marché » est bien actif mais le clic passe par `bouton('/Vérifier le marché/')` qui trouve d'abord un autre bouton ? À vérifier au prochain passage (lancer `node omega/recette-b6/recette-daliro.mjs http://localhost:3013` sur un `next dev -p 3013`) ; le flux à la main est à relire. Tout le reste passe (accepter l'écart, chiffrer/soumettre/signer un avenant, noter une réponse, remplaçants, facture refusée puis rattachée).
- **Prochaine étape, dans l'ordre** : 1) résultats bruts de b6_01/b6_02 → corriger jusqu'au vert ; 2) le rouge de la recette ci-dessus ; 3) relecture réelle de /espace/daliro avec `gerant@banc-varelo.test` (recette ygwbgpowzlbdaajlsqkn, clé publique donnée par le coordinateur, `.env.local` non commité, méthode d'A3 `omega/recette-a3/relecture-reelle.mjs`) ; 4) prévenir le coordinateur pour la fusion (build vert déjà obtenu sur cet état) ; 5) mettre à jour les montants du scénario dans ce fichier (le marché d'exemple fait 90 625 € HT et le lot 02 24 020 €, pas 184 300 / 24 100).

### Ce qui manque au socle pour tenir la page /secteurs/btp (trous repérés à la lecture du 05/10)

1. **Aucun avenant, aucun travail supplémentaire** : la page promet « les travaux supplémentaires signés avant exécution, chiffrés sur vos prix unitaires, l'avenant préparé ». Le socle a la bibliothèque de prix (`btp_bibliotheque_prix`) et rien qui la consomme. → `b6_01` : `btp_avenants` + `btp_avenants_lignes`, portes `btp_ouvrir_avenant`, `btp_chiffrer_ligne_avenant`, `btp_soumettre_avenant` (dépose une `demandes_validation` du socle : séparation saisie / signature), `btp_signer_avenant`.
2. **La confirmation à J-2 n'a pas de porte** : `btp_passages.confirmation` existe (non_demandee → demandee → confirmee | declinee | sans_reponse) mais rien ne passe un passage en « demandee » à J-2, rien ne reçoit la réponse, rien ne propose de remplaçant. → `b6_02` : `btp_demander_confirmations(p_client, p_jour)` (serveur, cron 17 h), `btp_repondre_confirmation(p_passage, p_reponse, p_cle)` (idempotente), `btp_proposer_remplacants(p_passage)` (tiers du même corps d'état, du même département, vigilance à jour).
3. **Une facture fournisseur ne se rattache pas à un chantier ni à un lot** : FILED a ses factures, DALIRO ses marchés, rien entre les deux. → `b6_03` : `btp_factures_chantier` + porte `btp_rattacher_facture(p_facture, p_chantier, p_lot, p_motif)` (le fournisseur de la facture doit être le tiers du lot, par SIREN), vue `btp_debourse_lots` (engagé du marché par lot ↔ facturé).
4. **`btp_installer` n'exige rien** : la porte publique installe la formule pour n'importe quelle organisation, par n'importe qui. → `b6_04` : réservée au serveur d'Omega ou au gérant de l'organisation.
5. **Pas de lecture d'ensemble d'un chantier** : l'écran ferait douze requêtes. → `b6_04` : `btp_tableau_chantier(p_chantier) → jsonb` (chantier, lots et étape, marchés chiffrés, contrôles, passages à venir et confirmations, dépendances, avenants, factures rattachées), sous RLS (SECURITY INVOKER).
6. **Pas d'acceptation du sous-traitant par porte** : `btp_acceptations` s'écrit en direct (INSERT/UPDATE du bureau) et c'est voulu par le socle ; pas de trou.
7. **Les trois listes du matin, la météo, les livraisons calées, la situation de travaux** : promises par la page, hors de ce que B6 peut prouver en réel cette nuit (météo = fournisseur externe ; situation = `btp_chantiers_etape` × marché, faisable en `b6_05` si le temps le permet). Dits tels quels au client dans l'écran : « à venir ».

### Ce que Teo doit fournir

- Rien pour l'instant. Si le J-2 doit partir pour de vrai (WhatsApp / SMS), ce sont les secrets Meta déjà listés par le coordinateur.

## 1. Le scénario réel de bout en bout

L'entreprise : **Atelier Bertin** (menuiserie-agencement, Lyon — la même entreprise fictive que les trois écrans d'A3, pour que l'espace client raconte une seule histoire), formule **Chantiers** (20 chantiers, 5 comptes bureau). Le chantier : **Résidence Les Tilleuls**, 12 logements à Villeurbanne (69100), maître d'ouvrage **SCI Lefèvre Patrimoine**, Atelier Bertin titulaire du lot Menuiseries, qui sous-traite la pose des garde-corps à **Serrurerie Dumont**. En base, c'est le client du banc `cccccccc-0000-4000-8000-00000000000c` qui joue Atelier Bertin : `gerant` (gérant), `referent` (valideur, équipe « Référent données »), `daf` et `daf2` (valideurs, « Direction financière »).

| # | Étape (qui, quoi) | Porte ou écriture | Ce qu'on vérifie |
|---|---|---|---|
| 1 | Omega installe Daliro pour l'organisation, formule Chantiers | `btp_installer(client, 'chantiers')` (serveur) | `btp_reglages` : 20 chantiers, 5 comptes ; refusé à un collaborateur (b6_04) |
| 2 | Le gérant pose l'annuaire : SCI Lefèvre Patrimoine (maître d'ouvrage), Serrurerie Dumont (sous-traitant, SIREN valide, +33…, corps d'état serrurerie, dépt 69, attestation de vigilance du mois), Menuiseries Rhône-Alpes (fournisseur) | INSERT `btp_tiers` | SIREN Luhn, téléphone unique, `btp_etat_vigilance` = `a_verifier` puis `a_jour` après vérification |
| 3 | Le gérant crée le chantier Les Tilleuls en préparation, Villeurbanne 69100, titulaire, conducteur = referent | INSERT `btp_chantiers` | territoire `metropole`, département `69`, TVA `normal`, une entité « site » créée, le conducteur voit l'entité ; `btp_controle` dit « sans lots » |
| 4 | Il pose trois lots : 01 Menuiseries extérieures (client, équipe Pose A), 02 Garde-corps (sous-traitant Dumont), 03 Peinture (autre titulaire) ; puis ouvre le chantier | INSERT `btp_lots`, UPDATE statut `ouvert` | ouverture refusée sans maître d'ouvrage ; quota compté ; `btp_controle` : « sous-traitant non accepté » sur le lot 02 |
| 5 | Il saisit le marché signé : référence M-2026-014, forfait, 184 300 € HT déclarés | `btp_ecrire_marche(null, chantier, {...})` | statut `a_verifier` ; `btp_controle` : « marché à vérifier » bloquant |
| 6 | Il saisit les lignes du devis (6 lignes, une avec un montant qui n'est pas quantité × PU, une sans lot) | `btp_ecrire_ligne(null, marche, {...})` | `controle` = `montant_faux` sur l'une, `sans_lot` dans `btp_controle_marches` ; `lu` garde la saisie d'origine |
| 7 | Il tente de vérifier le marché : refusé avec les raisons | `btp_verifier_marche` | 23514 « 1 ligne dont le montant… ; 1 ligne sans lot » |
| 8 | Il **accepte l'écart** de la ligne 4 avec un motif (remise négociée) et rattache la ligne 6 à son lot | `btp_accepter_ecart`, `btp_ecrire_ligne(ligne, …, {lot_id})` | `ecart_accepte`, motif gardé ; journal `daliro.ecart_accepte` et `daliro.ligne_corrigee` via `private.journaliser` |
| 9 | Il vérifie le marché | `btp_verifier_marche` | `verifie`, figé (UPDATE direct refusé 42501, suppression de ligne refusée) ; **la bibliothèque reçoit les prix du marché en `propose`** ; événement `daliro.marche_verifie` publié |
| 10 | Le referent (droit `daliro.valider_prix`) valide le prix « Garde-corps acier laqué, ml » à 142 € ; le gérant pose un prix de saisie « Heure de pose menuisier » 48 €/h | `btp_valider_prix`, `btp_poser_prix` | `valide`, `valide_par` ; un second prix validé pour la même désignation retire le premier ; un prix validé ne se retouche pas |
| 11 | Le gérant importe le planning du tableur : 5 passages (Pose A, Dumont, « Peintures Giraud » inconnu, …) avec leurs refs | `btp_importer_passages(chantier, 'tableur', [...])` | rapprochement `identique` / `ressemblance` / inconnu → `a_ranger` ; réimport sans une ligne → `annule` ; `version` monte quand les dates bougent |
| 12 | Il demande les dépendances par corps d'état puis les confirme ; une boucle est refusée | `btp_proposer_dependances`, UPDATE `confirmee`, INSERT en boucle | n dépendances `gabarit`, cycle refusé 23514, `dependance_non_respectee` dans `btp_controle` quand l'aval commence trop tôt |
| 13 | Le gérant demande l'acceptation de Dumont au maître d'ouvrage, puis l'enregistre acceptée (lettre) | INSERT / UPDATE `btp_acceptations` | passages d'état gardés ; `sous_traitant_non_accepte` disparaît |
| 14 | **J-2** : le serveur demande les confirmations des passages qui commencent dans deux jours ; Dumont confirme, Giraud ne répond pas ; des remplaçants sont proposés | `btp_demander_confirmations`, `btp_repondre_confirmation`, `btp_proposer_remplacants` (b6_02) | `confirmation` = `demandee` → `confirmee` / `sans_reponse` ; rejouer la réponse avec la même clé ne réécrit rien ; remplaçants = tiers serrurerie 69 vigilance à jour |
| 15 | **Travail supplémentaire** : le chef d'équipe signale 12 ml de garde-corps en plus ; le gérant ouvre l'avenant et le chiffre sur le prix validé de la bibliothèque | `btp_ouvrir_avenant`, `btp_chiffrer_ligne_avenant` (b6_01) | 12 × 142 = 1 704 € HT ; une ligne sur un prix `propose` est refusée ; le prix est copié (figé) dans la ligne |
| 16 | Il soumet l'avenant à la signature : une demande de validation du socle part ; le gérant ne peut pas l'approuver lui-même ; le daf l'approuve ; l'avenant est « signé » avec la pièce | `btp_soumettre_avenant`, INSERT `approbations` (daf), `btp_signer_avenant` | `demandes_validation` type `daliro.signer_avenant`, montant 1 704 ; 42501 pour le déposant ; `signe` + `piece_id` ; journal |
| 17 | **Facture fournisseur** : Dumont envoie sa facture de 9 940 € HT ; FILED la reçoit (document R2026-…, facture, fournisseur SIREN de Dumont) ; le gérant la rattache au chantier et au lot 02 | FILED (`filed_documents`, `filed_factures`), `btp_rattacher_facture` (b6_03) | refusée si le SIREN de la facture n'est pas celui du tiers du lot ; `btp_debourse_lots` : lot 02 engagé 24 100 € (marché) + 1 704 € (avenant), facturé 9 940 €, reste 15 864 € |
| 18 | Le gérant rouvre le marché pour corriger une désignation, puis le revérifie | `btp_rouvrir_marche` (gérant seul), `btp_verifier_marche` | 42501 pour le daf ; journal `daliro.marche_rouvert` |
| 19 | Le gérant lit le tableau du chantier d'un seul appel | `btp_tableau_chantier` (b6_04) | tout y est, et le collaborateur hors périmètre ne voit rien |
| 20 | Garde-fous : un membre d'un autre client ne lit rien ; un collaborateur sans `voir_prix` lit les lignes sans prix (`btp_lignes_marche_chiffrees` à null) ; le journal n'a que des lignes écrites par `private.journaliser` | lectures sous RLS | 0 ligne, prix null, `journal_opposable` chaîné |

## 2. Tests pgTAP (omega/tests/daliro/)

- `b6_00_jeu.sql` : le jeu du banc (client `cccccccc…`, utilisateurs retrouvés par courriel dans `auth.users`, `tests.endosser`), fonctions d'aide.
- `b6_01_parcours.sql` : les étapes 1 à 19, dans l'ordre, par les portes publiques seulement.
- `b6_02_garde_fous.sql` : étape 20 et les refus (RLS, rôles, séparation saisie / approbation, marché figé, journal).

## 3. Migrations (omega/modules/daliro/migrations/)

`b6_01_avenants.sql`, `b6_02_confirmation_j2.sql`, `b6_03_factures_chantier.sql`, `b6_04_installer_et_tableau.sql` — `create or replace`, `if not exists`, `on conflict` ; jamais de DROP ni de DELETE ; chaque nouvelle table : `revoke all` d'anon/authenticated puis les GRANT en face de chaque politique (règle du coordinateur du 05/10).

## 4. Questions au coordinateur (envoyées le 05/10, 23 h 30)

1. `private.a_le_droit(p_client, 'daliro.valider_prix')` et `'voir_prix'` : quelle table porte les droits, et comment les donner au gérant et au referent du banc ?
2. Daliro est-il installé pour le banc (`btp_reglages`) ? Sinon, je demande `btp_installer(banc, 'chantiers')` au lot 1.
3. Les portes publiques `btp_*` ont-elles EXECUTE pour `authenticated` ? (après a5_01)
4. Rôles exacts des comptes du banc : gerant = `gerant` ; referent, daf, daf2 = `valideur` ? Leurs `perimetre_total` ?
5. `private.creer_envoi` : sa signature, pour que la demande J-2 parte vraiment (sinon b6_02 publie l'événement et s'arrête là).
6. `public.territoires` porte bien `metropole` avec son fuseau (sinon aucun chantier ne se crée) ?
7. Pour la relecture réelle de l'écran : l'URL et la clé publishable de la recette, à poser dans `.env.local` (non commité) — comme A3.
8. Hors périmètre B6 : ajouter `{ cle: "daliro", href: "/espace/daliro", libelle: "Chantiers", court: "Daliro" }` dans `components/espace/ecrans.ts` pour que l'onglet apparaisse.
9. `filed_fournisseurs.siren` et `filed_factures.fournisseur_id` : confirmés tels que vus dans le test a4_01 ?

## Journal de session

- 05/10, 23 h 30 → 23 h 05 UTC (minuit → 1 h Paris) : migrations b6_01..04 écrites et posées (lot 1), tests pgTAP écrits et joués une première fois (garde-fous 38/39, parcours à rejouer), écran /espace/daliro écrit, vérifié (tsc, eslint, build), recette cinq largeurs verte, captures. Pause demandée par le coordinateur.

- 05/10, 22 h 40 → 23 h 30 : lecture de CLAUDE.md, AGENTS.md, CONTRAT-OUVRIER, NOTES-COORDINATEUR, NOTES-A3, SOCLE-EXTRAITS-DALIRO (2 789 lignes), FILED (rapprochement, signatures), tests A4/A5, écran A3. Scénario écrit, envoyé au coordinateur.
