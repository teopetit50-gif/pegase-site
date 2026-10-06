# Session B2 — TAVARO, le module des loueurs (contrats, retours, barèmes, factures, avoirs, litiges)

Branche `worker-b2`, fusionnée dans main. Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg (depuis le 06/10, 03 h 10 Paris ; auparavant session_01B4JNQXyT69GytdvE9SjAnE). Dernière mise à jour : 06/10/2026, 03 h 15 Paris.

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce que la vitrine promet, prouvé sur la recette) | **95 %** — 11 fichiers de tests sur 11 verts sur la recette ; **parcours réel sur le banc prouvé** : barème, contrat, retour chiffré, approbation, deux factures émises, courriel parti par Brevo et remis chez Teo, factures « envoyée », relance préparée, validée et mise au délai minimal du socle (départ le 09/10) ; b2_01 v2 et b2_02 v2 posées | la remise effective de la relance le 09/10 (cron) ; le PDF de facture joint au courriel (hors vague) | le TAP vert sur la recette ; corrections jusqu'au vert ; l'envoi réel d'une facture et d'une relance (mode essai, Brevo) prouvé sur le banc |
| **Livrable client** (un loueur ouvre /espace/tavaro et travaille) | **90 %** — **Teo a confirmé le 06/10 (13 h 43 Z, par le coordinateur) avoir reçu le courriel d'essai envoyé depuis la recette : la chaîne d'envoi Tavaro est validée de bout en bout par un humain** ; **servi par omegaai.fr** (vérifié le 06/10 à 00 h 55 Z : 200, titre « Location : retours et factures », onglet « Location ») — fusionné sur main (b287d04) ; **un geste réel joué depuis l'écran** sur le banc avec le référent (compléter les conditions de BANC-2026-0001 : la porte répond, les saisies portent son nom, capture `reel-tavaro-completer-1440.jpg`) ; l'écran lit le parking réel du banc (1 contrat facturé, 418,20 € à encaisser, 5 lignes de barème) — l'écran existe, tsc / eslint / build verts, recette aux cinq largeurs verte, onglet « Location » posé, relecture en base réelle faite avec le gérant puis le référent du banc (lecture de tout le parking sous RLS sans aucun refus ; capture `omega/recette-b2/reel-tavaro-1440.jpg`) ; Realtime et Storage posés par le coordinateur | les gestes réels depuis l'écran (compléter, chiffrer, litige, avoir, relance) une fois le banc garni par `banc_01_parcours_reel.sql` : à rejouer avec `--geste=…` et un compte referent/daf ; la vérification de la page servie par omegaai.fr après fusion |

**Ce que Teo doit fournir lui-même** (rien ne le remplace) :
- le barème réel d'un loueur (codes, prix, TVA, catégories) pour remplacer celui d'exemple ;
- les mentions de l'émetteur (adresse, RCS, numéro de TVA) dans `loc_reglages.emetteur`, sinon chaque facture part avec `mentions_manquantes` ;
- le taux de TVA de chaque agence (`loc_agences.taux_tva`) hors métropole/DOM connus ;
- le réglage d'envoi du module `tavaro` dans `reglages_envois` (mode `essai` sur le banc) ;
- plus tard : le PDF de facture joint au courriel (le socle envoie aujourd'hui le texte de la facture, pas une pièce jointe, et aucune photo).

## 1. Le scénario réel de bout en bout (écrit le 06/10 avant tout code)

Un loueur, « Groupe Sogexal (banc) », deux agences (siège + une agence). Quatre personnes : le gérant
(direction), le référent (valideur, chef d'agence), la DAF (valideur), et un collaborateur au comptoir.
Tout ce qui engage de l'argent passe par une validation (promesse de la vitrine) ; chaque geste s'écrit au
journal opposable ; rien ne s'écrit directement dans une table là où une porte existe.

| # | Qui | Geste (porte) | Ce que le socle doit faire | Garde-fou vérifié |
|---|---|---|---|---|
| 1 | Gérant | règle l'agence : `loc_agences` (code, TVA), `loc_reglages` (émetteur, tolérance de retard 59 min) | lignes posées par la politique RLS du gérant | un collaborateur ne peut pas (42501) |
| 2 | Gérant | **publie le barème** `loc_publier_bareme('Barème 2026', '2026-01-01', lignes)` : carburant au huitième, km, retard au jour entamé, dommages (rayure au forfait, jante sur devis), nettoyage, frais de dossier | barème `publie`, journal `tavaro.bareme_publie` | le collaborateur ne publie pas ; deux barèmes à la même date refusés |
| 3 | Export du logiciel | **le contrat arrive** par `loc_appliquer_releve(client, 'contrats', [ligne], {cle, source:'export'})` : numéro, agence, départ, retour prévu, plaque, catégorie, km départ, locataire (nom, courriel), franchise | contrat `ouvert`, véhicule `a_confirmer` créé, locataire créé ; la même clé rejouée = `deja_applique` | clé unique ; champ obligatoire manquant = ligne rejetée, pas d'exception |
| 4 | Collaborateur | **complète les conditions** `loc_completer_contrat(contrat, {km_inclus, politique_carburant, franchise_eur, rachat_franchise})` | `saisies` garde qui et quand ; un relevé suivant n'écrase pas la saisie | un collaborateur d'une autre agence est refusé |
| 5 | Référent | **prolonge** `loc_amender_contrat(contrat, 'prolongation', nouveau retour)` | le retard se calcule sur le retour prolongé | le collaborateur n'amende pas (42501) |
| 6 | Collaborateur | **chiffre le retour** `loc_chiffrer_retour(contrat, {retour_reel_le, km_retour, carburant_depart_8: 8, carburant_retour_8: 5, dommages:[{code:'RAYURE_PORTIERE', preuves:[photo]}], postes:[{code:'NETTOYAGE', preuves:[photo]}]})` | proposition v1 `calculee` : carburant 3/8, km au-delà du forfait, retard (jours entamés, tolérance), dommage plafonné à la franchise, TVA selon le régime ; journal `tavaro.proposition_calculee` ; travail `tavaro.deposer_demande` déposé | un dommage **sans photo** → `preuve_manquante`, aucune demande ; retour **non contradictoire** → hors barème, règle direction seule |
| 7 | Ouvrier (cron) | `private.loc_ouvrier()` prend le travail → `loc_deposer_demande` | `demandes_validation` type `facture.envoyer`, règle par défaut 1 accord (< 1 500 €) / 2 accords au-delà ; proposition `a_valider` | un second chiffrage pendant l'attente annule la demande et remplace la proposition |
| 8 | Collaborateur | tente d'approuver sa propre facture (INSERT `approbations`) | **refusé : celui qui a saisi n'approuve pas** | → trou H1 : la demande ne porte pas `saisi_par` (migration b2_01) |
| 9 | Référent (valideur) | **approuve** (INSERT `approbations`) | le socle décide la demande et publie l'événement ; travail `tavaro.decision` → `loc_appliquer_decision` → proposition `validee` → **factures émises** FA-2026-000001 (frais) et FA-2026-000002 (dommages), lignes recopiées avec leurs preuves, mentions (mandat, objet, TVA hors champ sur les dommages) | insérer une facture sans demande approuvée : refusé ; modifier/effacer une facture ou une ligne : refusé |
| 10 | Socle | **envoie** le courriel de la facture au locataire (`preparer_envoi`, mode essai → adresse de Teo) ; `tavaro.envoi` ramène `envoye` | factures `envoyee`, journal `tavaro.facture_envoyee` ; sans courriel du locataire → alerte « envoyez-la vous-même », demande `executee` | hors heures → différé, pas perdu |
| 11 | Collaborateur | le client conteste par écrit : **`loc_marquer_litige(facture, motif)`** | facture `litige`, motif gardé, journal ; le point du matin compte « factures en litige » | litige sur une facture réglée : refusé |
| 12 | Collaborateur | **demande un avoir partiel** `loc_demander_avoir(facture, 'rayure antérieure au départ', 120)` | avoir `a_valider` au prorata de TVA ; demande `avoir.emettre` (direction seule, 48 h) | montant > reste : refusé ; deux avoirs en attente : refusé ; le référent (valideur) ne peut pas approuver un avoir |
| 13 | Gérant | **approuve l'avoir** | `loc_decision_avoir` → `loc_emettre_avoir` AV-2026-000001, courriel ; la facture reste `litige` tant que l'avoir ne la couvre pas | un avoir émis ne se modifie ni ne s'efface |
| 14 | Collaborateur | le client paie le reste : **`loc_marquer_reglee(facture, 'carte')`** | facture `reglee` avec date et mode ; journal `tavaro.facture_reglee` | mode inconnu refusé |
| 15 | Cron | **relance** de la facture pro non réglée à l'échéance (+ 7 jours) | → trou H2 : **aucune relance n'existe dans le socle** (migration b2_02 : `private.loc_relancer_factures()` + porte `loc_relancer_facture`) | une facture en litige n'est pas relancée |
| 16 | Cron | **point du matin** `private.loc_deposer_points()` et mesure `private.loc_mesurer()` | sections « Facturation des retours » (à décider, preuves manquantes, à envoyer, en litige, émises hier), « Avoirs à décider » ; mesures euros facturés / retours facturés / délai de décision | — |
| 17 | Tous | **journal opposable** | chaque étape 2 → 14 a sa ligne `tavaro.*` dans `journal_opposable`, écrite par `private.journaliser` seulement | INSERT direct refusé ; un autre client ne lit rien |
| 18 | Un autre loueur | lit les contrats, factures, avoirs, barèmes | **rien** (RLS `mes_clients`) ; un collaborateur de l'agence B ne voit pas les contrats de l'agence A (`voit_entite`) | — |
| 19 | Gérant | **anonymise** le locataire à la fin : `loc_anonymiser_locataire(locataire, 'demande')` | refusé tant qu'un contrat est ouvert ; après clôture : identité effacée, journal | collaborateur refusé |

## 2. Trous du socle repérés à la lecture (à confirmer par les tests)

| # | Manque | Migration |
|---|---|---|
| H1 | `loc_deposer_demande` ne met pas `saisi_par` dans le payload : la séparation saisie / approbation du socle (`preparer_approbation` refuse `payload.saisi_par`) ne joue pas pour TAVARO — l'agent qui a chiffré le retour peut approuver sa facture s'il est valideur | `b2_01_separation_saisie_approbation.sql` : `payload.saisi_par = proposition.calculee_par` ; même chose pour l'avoir (`demande_par`) |
| H2 | Aucune relance des factures non réglées (la vitrine et le cahier la promettent) | `b2_02_relances_factures.sql` : cron quotidien + porte manuelle, courriel par `preparer_envoi`, journal, jamais sur un litige ni une facture créditée |
| H3 | `public.loc_appliquer_releve(p_client, …)` ne vérifie aucun droit : si `authenticated` peut l'exécuter, n'importe quel membre importe des contrats chez n'importe quel client | à vérifier avec le coordinateur (grants) ; sinon `b2_03` : porte de saisie au comptoir `loc_saisir_contrat(p_valeurs)` avec contrôle du rôle et du périmètre |
| H4 | Pas de porte de lecture « mon dossier de retour » pour l'écran : il lira les tables sous RLS (comme A3) | aucune, sauf besoin |

## 3. Questions posées au coordinateur (06/10) — et ses réponses

1. **Portes `public.loc_*`** : enveloppes d'une ligne vers `private.loc_*` ; EXECUTE `authenticated` sur amender_contrat, anonymiser_locataire, chiffrer_retour, completer_contrat, demander_avoir, marquer_litige, marquer_reglee, publier_bareme, retirer_bareme ; **service_role seul** sur `loc_appliquer_releve`, `loc_confirmer_purge_pieces`, `loc_pieces_a_purger` ; anon nulle part. → **H3 n'est pas un trou** : le relevé est une porte d'ouvrier.
2. **Abonnements de tavaro** (`private.abonnements`) : `releve.pret.tavaro → tavaro.appliquer_releve`, `releve.en_retard.tavaro → tavaro.releve_en_retard`, `demande.decidee.tavaro → tavaro.decision`, `envoi.<issue>.tavaro → tavaro.envoi`, `piece_lue.tavaro → tavaro.piece_lue`. Le trigger `private.publier_decision` sur `demandes_validation` publie `demande.decidee.<module>` ; `publier_evenement` dépose chez chaque abonné `charge || {evenement}`, clé `evenement:cle`. Charge de `tavaro.decision` : `{demande, statut, type_action, objet_type, objet_id, entite, politique, decide_le, decideurs: [{user, au_nom_de, decision}], evenement}`.
3. **Le banc** : entité principale `2d1ed71f-…` « Groupe Sogexal (banc) », Europe/Paris, territoire null (TVA à fixer sur l'agence) ; trois entités DOM (Novasud Antilles et Sodimat Guadeloupe : America/Guadeloupe, GP ; Métalco Martinique : America/Martinique, MQ → TVA 8,5). Comptes : gerant = gerant ; referent, daf, daf2 = valideur ; tous `perimetre_total`, aucun collaborateur. `reglages_envois` : organisation et reput en essai, **rien pour tavaro** (le coordinateur posera la ligne au premier test d'envoi). `loc_agences`, `loc_reglages`, `abonnements_modules` : vides → installation vierge.
4. **Schéma `tests` d'A5** : en place (jeu, endosser, redevenir_admin, journaliser, appeler_privee, compter, inserer_minimal, table_existe, runtests).
5. **`alertes`** n'a pas de colonne `module` (cle, cle_regroupement, gravite, titre, detail, acquittee_le…) ; le périmètre par entité = `public.comptes_entites(client_id, user_id, entite_id)` + `comptes.perimetre_total` (`private.voit_entite`).

## 3 bis. Premier TAP sur la recette (06/10, coordinateur)

Lot 1 posé (b2_01, b2_02 inscrits), TOUT_B2 joué : **5 fichiers verts sur 11** (01 : 21/21, 02 : 30/30, 04 : 46/46, 08 : 29/29 avec AV-2026-000001/000002 et le refus, 10 : 32/32). Rouges : 03 (le socle signale l'écart sous `saisie_protegee`), 05 (`is(smallint, integer)`), 06/09/11 (adresse d'auth.users en double quand `tavaro_jeu()` est rappelée dans la même transaction : l'exception était avalée), 07 (`alertes.module` n'existe pas). Les quatre corrigés et poussés ; relecture demandée.

Second TAP (66f1d09, 01 h 43 Paris) : **8 fichiers verts sur 11** (01, 02, 03, 04, 06 avec FA-2026-000001/000002, 08, 10, 11). Rouges : 05 (alias `p` ambigu avec la variable), 07 (`alertes.cle` n'existe pas : la clé est `cle_regroupement`, préfixée par le module), 09 (joué entre 0 h et 2 h Paris : `current_date` est en UTC, les factures sont datées au fuseau de l'agence). Les trois corrigés, SHA 30877c2 ; le coordinateur a posé `reglages_envois` tavaro (essai) sur le banc et enchaîne banc_01 après le troisième TAP.

Troisième TAP (30877c2, 02 h 06 Paris) : **10 fichiers verts sur 11**. Le seul rouge, 05, a attrapé un vrai défaut de b2_01 : `preparer_approbation` (lot 19c) ne lit `payload.saisi_par` que sous forme de **tableau** d'identifiants, et b2_01 l'écrivait en scalaire ; le référent qui avait chiffré a donc pu approuver sa propre facture, l'ouvrier a facturé, et le rechiffrage hors barème a buté sur « déjà facturé ». Le garde-fou `demandeur_id` du socle ne joue pas non plus ici : la demande est déposée par l'ouvrier (sans `auth.uid`), donc demandeur « systeme ». b2_01 révisée (`jsonb_build_array(...)`, SHA c7f78ff), reposée (`tavaro_b2_01_v2`) ; **quatrième TAP : 11/11 verts** (05 : 27/27, la séparation saisie / approbation est prouvée). banc_01 (b555ca7) passe A, B, C jusqu'au select de contrôle : `envois.programme_le` n'existe pas (colonnes : statut, verrou, motif, reprise_le, bail_jusqu_au, echeance, essais, fournisseur, reference_externe, pret_le, envoye_le, clos_le) ; corrigé, tout le fichier étant une transaction, rien n'était resté sur le banc. **L'écran /espace/tavaro est fusionné sur main (b287d04)** avec l'onglet « Location » et `MODULES.tavaro` ; recette cinq largeurs verte sur le build de main. omegaai.fr ne le servira qu'après la remise à zéro du quota Vercel (06/10, 02 h Paris) : la vérification de la page servie reste à faire. banc_01 corrigé (b555ca7 : plus de `private.*` sous authenticated, l'ouvrier de base passé dans le fichier) ; b2_01 révisée (c7f78ff) à reposer avant le quatrième TAP.

## 3 ter. Le parcours réel sur le banc (06/10, 02 h 26 Paris)

`banc_01_parcours_reel.sql` (e620cab) joué d'un trait par le coordinateur sur le client du banc : barème « Barème banc 2026 » publié par le gérant (5 lignes), contrat BANC-2026-0001 arrivé par le relevé, conditions complétées et retour chiffré par le référent (proposition v1, 418,20 €), demande déposée par l'ouvrier, approuvée par la DAF, **factures FA-2026-000001 (frais, 238,20 €) et FA-2026-000002 (dommages, 180,00 €) émises**, courriel « Groupe Sogexal (banc) : vos factures FA-2026-000001 et FA-2026-000002 — location BANC-2026-0001 » préparé en mode essai, **parti par Brevo à 00 h 26 Z et remis** (envois_evenements : delivered) chez Teo (adresse d'essai). Journal opposable : bareme_publie, proposition_calculee, regles_posees, demande_deposee, proposition_validee, facture_emise ×2, facture_envoi_prepare.

Suite (02 h 28) : le travail `tavaro.envoi` était simplement en attente du cron ; les deux factures sont **envoyee**. b2_02 v2 reposée, bloc D rejoué : FA-2026-000001 `relances = 1`, journal `tavaro.facture_relancee`, envoi `tavaro:relance:<facture>:1` en mode essai, **statut `a_valider`** : un envoi qui n'est pas adossé à une décision déjà prise (option `demande`) ni « direct » passe par la validation, et le cron (sans `auth.uid`) ne peut jamais être direct (« un moteur ne se passe jamais de la validation »). **C'est un fait du socle, voulu, conforme à la promesse** (rien ne part vers le client sans l'accord de l'agence) : la facture part sans second accord parce qu'elle est adossée à la demande approuvée ; la relance est une nouvelle décision, approuvée dans « À valider ». L'écran le dit désormais après le clic « Relancer ».

Fin du parcours (02 h 29) : la demande de l'envoi de relance (type `envoi.email`, objet `loc_factures`) n'a pas pu être approuvée par la DAF (« Le demandeur ne décide pas de sa propre demande » : c'est elle qui a relancé — la séparation joue aussi sur l'envoi) ; approuvée par le gérant. `private.tache_envois` l'a alors mise **differe, verrou DELAI_MINIMAL** : « Un message est parti vers cette personne le 06/10/2026 à 02 h 26 : le suivant attend le 09/10/2026 à 02 h 26 » (`reglages_envois.delai_min`, trois jours entre deux messages non transactionnels au même destinataire). La relance partira donc le 09/10 par le cron ; la mécanique est prouvée jusqu'au verrou. **Deux faits du socle à retenir pour TAVARO** : la facture est adossée à la demande approuvée et part tout de suite ; une relance est une nouvelle décision (validation par une autre personne que celle qui relance) puis attend le délai minimal entre messages.

Deux restes (historique) : (1) la relance (bloc D) a échoué — `preparer_envoi` n'admet que les options direct, repondre_a, demande, espacement et b2_02 lui passait « origine » ; b2_02 v2 (61e1bbe) n'en passe plus, à reposer et D à rejouer ; (2) les factures sont restées « emise » une seconde après l'envoi : le travail `tavaro.envoi` (→ `loc_envoi_issue`, qui les passe en « envoyee ») n'avait sans doute pas encore été pris par le cron ; relecture demandée (travail fait / absent / en échec).

## 4. Fait / en cours

- 06/10 matin : lecture de CLAUDE.md, AGENTS.md, CONTRAT-OUVRIER, NOTES-COORDINATEUR, NOTES-A3, SOCLE-EXTRAITS-TAVARO (17 tables, 110 fonctions, 4 crons) et de la promesse du site ; scénario écrit (ci-dessus) et envoyé au coordinateur.
- 06/10 : **lot 1 de tests** — `omega/tests/tavaro/00_jeu_tavaro.sql` (le loueur fictif, ses deux agences, ses cinq personnes, le barème publié par la porte, le contrat arrivé par le relevé, le retour type) et onze tests `01` à `11` qui jouent les 19 étapes du scénario par les portes publiques sous le rôle de chaque personne (`tests.endosser` d'A5). Assemblés en `TOUT_B2.sql` (un seul appel, `runtests('^test_b2_')`). Syntaxe vérifiée sur un Postgres 16 local (`check_function_bodies = off` : les tables n'existent pas ici) ; le fond se joue sur la recette par le coordinateur.
- 06/10 : **deux migrations** — `b2_01_separation_saisie_approbation.sql` (H1 : `payload.saisi_par` et demandeur sur les demandes de facture et d'avoir) et `b2_02_relances_factures.sql` (H2 : relance des impayés, cron `tavaro-relances`, porte `loc_relancer_facture`). Envoyées à la pose avec le lot de tests.

- 06/10 : **l'écran /espace/tavaro** — `components/espace/tavaro/` (types, états, exemples « Autoloc Bertin » : 8 contrats à tous les états, portes, calcul en mémoire pour l'exemple, formulaire de retour, dossier du contrat, barème, écran) et `app/espace/tavaro/page.tsx`. Quatre compteurs (retours à chiffrer, à valider, bloqués, le reste) et « à encaisser » ; la liste des contrats par agence ; le dossier : contrat et conditions (compléter, prolonger / offrir le retard), le chiffrage du retour (photos par poste, dommage sans photo prévenu avant le clic, totaux, lignes, calculs, avertissements, la demande de validation et la séparation saisie / approbation dite), les factures (litige, règlement, avoir borné à ce qui reste, relance), les avoirs, le fil du journal opposable ; le barème en vigueur, publier / retirer réservés à la direction. `npx tsc --noEmit` ✓, `npx eslint components/espace/tavaro app/espace/tavaro` ✓ (0 erreur, 0 avertissement), `npm run build` ✓, `node omega/recette-b2/recette-tavaro.mjs` ✓ (59 contrôles aux cinq largeurs + enchaînements).
  - Ce qui n'est pas dans mon périmètre et que je demande : l'onglet « Location » dans `components/espace/ecrans.ts` (A3) ; la publication Realtime de `loc_contrats`, `loc_propositions`, `loc_factures`, `loc_avoirs` ; une politique Storage INSERT sur `omega-clients` pour `<client>/loc_contrat/<contrat>/…` (les photos du retour) ; la clé publique de la recette pour la relecture réelle.
  - Le contrôle natif `datetime-local` du dialogue de retour s'affiche dans la langue du navigateur (« AM » sur le Chromium de recette, en anglais) : c'est le navigateur, pas l'écran ; en français sur un navigateur français.

- 06/10, 01 h 45 (reprise après la pause de Teo) : **relecture en base réelle** — `omega/recette-b2/ouvrir-session.mjs` (session par mot de passe, fichier hors dépôt) puis `relecture-reelle.mjs` sur un `next dev` pointé sur la recette (clé publique transmise par le coordinateur). Résultat avec `gerant@banc-varelo.test` : identité affichée, interrupteur « Base réelle », tout le parking lu sous RLS (0 contrat, 0 barème : le banc est vierge, l'écran dit « Aucun barème publié » comme attendu), **aucun refus de la base en console**, aucun avis rouge inattendu. Deux faits de l'environnement de recette, pas de l'écran : le Chromium headless ne lit pas le magasin NSS où la CA du mandataire sortant est posée (ERR_CERT_AUTHORITY_INVALID → « Failed to fetch ») : le script lui fait accepter ce certificat pour la relecture seulement ; et la poignée de main WebSocket Realtime échoue derrière le mandataire (même constat qu'A3), à vérifier depuis un navigateur ordinaire.
- **État exact à cet instant** : lot 1 (tests + b2_01/b2_02) relu par le coordinateur sur 66f1d09, TAP attendu ; lot 2 (écran) prêt à fusionner ; `banc_01_parcours_reel.sql` attend TOUT_B2 vert et la ligne `reglages_envois` tavaro. **Prochaine étape** : corriger ce que le TAP rendra, puis rejouer la relecture réelle avec `--geste=completer` sur le contrat BANC-2026-0001 une fois le banc garni.

- 06/10, 02 h 35 : **relecture réelle avec le référent du banc, un geste joué pour de vrai** (`relecture-reelle.mjs … --geste=completer`) : l'écran lit le contrat BANC-2026-0001 facturé (418,20 € à encaisser, 5 lignes de barème), « Compléter les conditions » appelle `loc_completer_contrat` (forfait 600 → 650 km), la base répond, le dossier se relit avec « complété à la main : km inclus par Vous ». Vu au passage et corrigé (f5069b8+) : le contrat reste « En location » / « Rendu le : pas encore » après un retour chiffré, parce que `loc_chiffrer_retour` garde l'heure de restitution dans `proposition.entrees` sans l'écrire sur le contrat (c'est l'export qui le clôt) ; l'écran lit désormais l'heure du retour chiffré en repli et dit « Rendu ». omegaai.fr répond encore 404 sur /espace/tavaro à 00 h 35 Z (quota Vercel) : à revérifier.

## Vérifié en ligne (06/10, 00 h 55 Z)

Le quota Vercel revenu, main (7c7c934 puis 6635b1c) est déployé avec les retouches bde6a45 : `https://omegaai.fr/espace/tavaro` répond 200, le HTML servi porte « Location : retours et factures » et l'onglet « Location » dans la barre. omegaai.fr parle à la production (vide de loueur) : l'écran y montre l'exemple « Autoloc Bertin » ; la relecture en base réelle reste sur un Next local pointé sur la recette (clé publique de la recette, compte du banc).

## Fin de la vague 2 pour B2 — ce qui reste pour 100 %

- **Mécanique (95 %)** : la relance du banc part le 09/10 par le cron (verrou DELAI_MINIMAL du socle) ; à relire ce jour-là (envoi `tavaro:relance:…:1` envoye, remis). Le PDF de facture joint au courriel et les photos jointes (la vitrine le promet) sont hors de cette vague : le socle envoie le texte de la facture ; à faire avec le lecteur/pièces (coordinateur).
- **Livrable (90 %)** : relecture réelle des autres gestes depuis l'écran (chiffrer un retour avec photos déposées dans le bucket, litige, avoir, relance) sur un second contrat du banc ; une relecture depuis un navigateur ordinaire pour le temps réel (WebSocket) et le contrôle de date natif en français.
- **Teo** : barème réel, mentions de l'émetteur, TVA des agences DOM, réglage d'envoi `tavaro` en production, ~~vérifier dans sa boîte le courriel de facture du banc~~ (reçu, confirmé le 06/10), puis la relance du 09/10.

## 5. Ce que les tests attendent du socle (à confirmer par le coordinateur, sinon les tests le diront)

- `public.loc_appliquer_releve` exécutable par le propriétaire de la base (les tests l'appellent en `postgres`, comme le ferait le connecteur en service_role).
- Les colonnes `demandes_validation.demandeur_type` / `demandeur_id` acceptent `('utilisateur', <uuid>)` à l'insertion (b2_01) ; sinon, retirer ces deux colonnes de l'INSERT et garder `payload.saisi_par`.
- `preparer_approbation` lit bien `payload.saisi_par` (lot 19c) : test 05 « celui qui a chiffré n'approuve pas ».
- La décision d'une demande dépose un travail `tavaro.decision` chez le module (abonnement) avec `{demande, statut, objet_type, objet_id, decideurs}` : test 06 le compte dans `travaux`.
- `alertes` (table) porte `client_id`, `module`, `cle` : tests 07 et 11 y comptent les alertes « envoyez-la vous-même » et « recouvrement ».
- Une table de périmètre par entité (`comptes_perimetres` ou autre) : test 10 la cherche, sinon dit qu'il ne peut pas tester le périmètre par agence.

## Accessibilité (06/10, 07 h 30 Paris, session B2 Opus 5.5 — session_01HKxgZfAkgWXmzJkkwWRMN5)

Demandé par le coordinateur après la mesure d'A3 (axe-core, WCAG 2.1 A/AA). Dans la liste des contrats, le faux `role="listbox"` / `role="option"` est remplacé par une simple liste de boutons, et le contrat ouvert porte `aria-current="true"`. Le style vient de `espace.css` sur main (0244972). axe signalait aussi un écart grave à 390 px, `scrollable-region-focusable` : les trois cadres de tableau qui défilent (lignes de la proposition, lignes d'une facture, barème) portent maintenant `tabIndex={0}`, `role="region"` et un `aria-label`. Nouveau script : `omega/recette-b2/accessibilite-tavaro.mjs`, sur le modèle d'A3. Il rend 0 écart à 390 et 1440 px, sur l'écran comme dans le dialogue « Chiffrer le retour », et le clavier passe (focus piégé, Échap, focus rendu). tsc, eslint et build sont verts, `recette-tavaro.mjs` passe tout aux cinq largeurs. worker-b2 avait été avancée sur main (1fcfbda) avant la correction.

## Vague 3 — les trois manques qui font payer et ouvrir Tavaro chaque jour (06/10, 14 h 40 Z)

Écrit à la demande du coordinateur, avant tout code. Le critère : ce qu'une agence de location (5 à 200 véhicules) fait **tous les jours**, qui lui coûte de l'argent si c'est mal fait, et que Tavaro peut faire mieux qu'un tableur parce qu'il connaît déjà le contrat, la plaque, les dates et le locataire.

| # | Manque | Pourquoi une agence paie | Ce que Tavaro a déjà | Ce qu'il faut |
|---|---|---|---|---|
| **1** | **Les avis de contravention (PV, radars) : désigner le conducteur sous 45 jours** | Chaque avis arrive chez le loueur, titulaire de la carte grise. Le représentant légal doit désigner le conducteur **dans les 45 jours** suivant l'envoi de l'avis, sinon il paie une **amende de non-désignation de 675 €** (450 € si payée sous 15 jours, 1 875 € majorée), en plus de l'avis d'origine. Une agence en reçoit des dizaines par mois : retrouver qui avait la voiture à telle heure, recopier l'identité et tenir le délai, c'est du travail quotidien et un risque chiffré. | Le contrat (plaque, départ, retour), le locataire, le journal opposable, les alertes, le point du matin | b2_03 : le registre des avis, le **rapprochement automatique** plaque + heure → contrat → locataire, l'échéance J+45 surveillée (alertes à J-10, J-3 et au dépassement), la désignation consignée (identité, mode : ANTAI en ligne ou LRAR, numéro d'accusé), le classement motivé réservé à la direction, les frais de gestion refacturables plus tard par le barème. **Commencé (ci-dessous).** |
| **2** | **La facture électronique** : réception obligatoire pour toutes les entreprises au 1/9/2026, **émission pour les PME et TPE au 1/9/2027** (calendrier confirmé ; l'amendement qui la reportait à 2028 a été rejeté le 11/04/2025). Une facture à un client professionnel français passe par une **plateforme agréée** ; une facture à un particulier relève du **e-reporting**. Quatre mentions nouvelles : **SIREN du client, catégorie de l'opération** (ici prestation de services), option pour la TVA sur les débits, adresse de livraison si elle diffère. | Sans cela, dans moins d'un an, Tavaro ne pourra plus émettre légalement de facture à un client pro. C'est l'argument « conforme 2027 » que les concurrents mettent déjà en avant. | La numérotation par série, les mentions (mandat, TVA hors champ), `loc_locataires.siren`, l'émetteur dans `loc_reglages` | Les mentions nouvelles dès maintenant (SIREN client obligatoire si professionnel, catégorie « prestation de services », TVA sur les débits), une sortie structurée Factur-X/CII de chaque facture et chaque avoir, puis le raccordement à une plateforme agréée et le flux e-reporting B2C (socle, coordinateur : un seul raccordement pour tous les modules). |
| **3** | **L'état des lieux de départ contradictoire, signé par le locataire, avec photos horodatées** (et l'empreinte de caution) | Aujourd'hui le chiffrage du retour compare à un départ supposé (export). Sans état de départ signé, une facture de dommage se conteste, et les litiges sont la première perte d'une agence. Les logiciels du marché (Shiftor, Boboloc, Startloc, Check & Visit) vendent d'abord cela : état des lieux sur tablette, photos horodatées et géolocalisées, signature électronique, préautorisation de caution. | Le retour chiffré avec photos par poste, le dommage refusé sans photo (`preuve_manquante`), les pièces dans Storage | Un état de départ (carburant, km, dommages existants avec photos) signé au comptoir ; le retour chiffré ne facture plus un dommage déjà noté au départ ; la caution (montant, empreinte faite / levée) suivie sur le contrat. La préautorisation bancaire elle-même dépend d'un prestataire de paiement (Teo). |

Sources :
- Désignation sous 45 jours, 675 € / 450 € / 1 875 € : [Assemblée nationale, question écrite 15e lég. n° 126](https://questions.assemblee-nationale.fr/dyn/15/questions/QANR5L15QE126.pdf) ; [Journal de l'Automobile, délais de contestation et de désignation allongés](https://journalauto.com/journal-des-flottes/amendes-des-delais-de-contestation-et-de-designation-allonges/) ; [désignation du conducteur d'un véhicule loué par une société à une autre](https://www.lemondedudroit.fr/judiciaire/326-droit-penal/71549-exces-de-vitesse-designation-du-conducteur-d-un-vehicule-loue-par-une-societe-a-une-autre.html).
- Calendrier de la facture électronique : [economie.gouv.fr](https://www.economie.gouv.fr/node/3231220) ; [Cegid, calendrier 2026-2027](https://www.cegid.com/fr/facture-electronique-obligatoire/calendrier-facture-electronique/) ; [CCI Paris Île-de-France](https://www.entreprises.cci-paris-idf.fr/actualites/facturation-electronique-une-obligation-pour-toutes-les-entreprises) ; mentions nouvelles et e-reporting : [abby.fr](https://abby.fr/guide/facturation-electronique/quelles-informations-doivent-apparaitre-sur-une-facture-electronique), [Socic, check-list TPE-PME](https://www.socic.fr/ressources-comptabilite/articles/facturation-electronique-obligatoire-2026-2027-calendrier-plateformes-agreees-e-reporting-et-checklist-tpe-pme).
- Le marché : [Shiftor (G2)](https://www.g2.com/sellers/shiftor) ; [Boboloc](https://apps.apple.com/fr/app/boboloc-contrat-de-location/id6447763912) ; [Kolonell, modules attendus d'un logiciel de location de véhicules](https://kolonell.com/fr/blog/logiciel-location-vehicules-utilitaires-marseille-2026).

À vérifier par Teo ou un juriste avant la mise en vente : la réforme du délai de désignation (l'article de presse parle d'un allongement) et le texte en vigueur au jour de la vente ; Tavaro garde l'échéance comme un **réglage** (`loc_reglages`), 45 jours par défaut.

### Manque n° 1 — avis de contravention : état au 06/10, 15 h 30 Z

- **Base** (8fd4e11 puis retouches de texte) : `omega/modules/tavaro/migrations/b2_03_avis_contravention.sql`. La table `loc_avis_contravention` est lisible sous RLS par agence ; on n'y écrit jamais directement. Quatre portes : `loc_enregistrer_avis`, `loc_rattacher_avis`, `loc_designer_conducteur` (direction et valideurs), `loc_classer_avis` (direction seule). Le cron `tavaro-avis` tourne à 6 h 05 UTC. Joué sur un Postgres 16 local contre une souche du socle (hors dépôt) : la migration passe, se rejoue, et le scénario complet passe. **Test 12 à jouer sur la recette** par le coordinateur.
- **Correction de fond, en cours de route** : une personne morale qui paie l'avis sans désigner encourt quand même l'amende de non-désignation. Le classement sert donc à la contestation (usurpation de plaque, vol, véhicule cédé). Un salarié qui conduisait se désigne comme une personne : c'est possible sans contrat.
- **Écran** : `components/espace/tavaro/AvisVue.tsx`, une carte sous la liste des contrats.
  - La liste « À traiter » est triée par échéance, avec une pastille J-n (rouge à 3 jours, ambre à 10) ; la liste « Traités » suit.
  - On enregistre un avis : le jour et l'heure se saisissent séparément (heure sur 24 h, sans contrôle natif en anglais).
  - On le rattache à un contrat : ceux de la même plaque viennent en premier.
  - On désigne : les champs sont préremplis depuis le locataire, et un locataire professionnel se désigne comme société.
  - On classe, avec un motif.
  - Dans l'exemple, cinq avis ; le même rapprochement est joué en mémoire. tsc, eslint et build verts. `recette-tavaro.mjs` passe tout (65 contrôles, dont l'enchaînement saisir → rapproché → désigner). axe : 0 écart à 390 et 1440 px, sur l'écran comme dans le dialogue de désignation.
- **Ensuite** : les frais de gestion d'un avis refacturés au locataire (une ligne du barème, la facture validée) ; la lecture de l'avis par le lecteur de pièces (`source = 'lecture'`, porte privée déjà prête) ; l'effacement de `designation` à l'anonymisation (à trancher avec le coordinateur) ; la section « avis à désigner » dans le point du matin (gabarit du socle).

### 06/10, 16 h Z — TAP du test 12 rouge, corrigé ; b2_04 (désignation gardée un an)

- **TAP du coordinateur** (b2_03 au SHA 8fd4e11) : tests 01 à 11 verts ; le 12 meurt avec « record "r" is not assigned yet » quand aucun contrat ne correspond. Un record PL/pgSQL jamais assigné ne se lit pas, même dans une branche `case` non prise. **Corrigé** avec des scalaires (v_contrat, v_locataire, v_entite).
- **Pourquoi ma souche ne l'avait pas vu** : le scénario local commençait par un avis rapproché, et `r` était déjà assigné dans la même session. Je l'ai reproduit dans une session neuve, chemin « aucun contrat » d'abord, puis vérifié la correction de la même façon. **À retenir** : un scénario local doit ouvrir chaque chemin dans une session neuve.
- **b2_04** (décision du coordinateur) : l'identité désignée est gardée un an après la désignation, puis effacée par `private.loc_effacer_designations` (cron `tavaro-avis-conservation`, 3 h 25 UTC).
  - Fondement : l'article 9 du code de procédure pénale fixe la prescription de l'action publique des contraventions à un an révolu depuis l'infraction, interrompu par tout acte de poursuite. Partir de la désignation couvre au moins ce délai.
  - Ce qui reste : la forme {type, effacee_le}, plaque, heure, montant, statut, mode, référence.
  - `loc_avis_contravention` est ajoutée à la publication Realtime, et l'écran s'y abonne.
  - Test 13 : 9 assertions. TOUT_B2 réassemblé : 13 tests.
- **Écran** : une désignation effacée s'affiche « identité effacée le … (gardée un an) » ; un sixième avis d'exemple le montre. La recette passe tout, axe ne trouve aucun écart.

### Manque n° 3 — l'état des lieux contradictoire : état au 06/10, 16 h 45 Z

- **Avis et test 13 sur la recette** : b2_03 v2, b2_04 et les tests 12 et 13 sont posés (7e97d91) ; `^test_b2_` passe 1..13. L'écran des avis part sur main à la prochaine poussée du coordinateur.
- **Base** (a4c95e6) : `b2_05_etats_des_lieux.sql`, sans drop, rejouable.
  - Une table `loc_etats_des_lieux` : un état par contrat et par moment (départ, retour), à l'état brouillon puis signé ou refusé. Une garde fige un état signé ou refusé ; seul le suivi de la caution avance ensuite.
  - Les portes établir, signer, constater le refus et lever la caution.
  - La signature exige l'avant, l'arrière et les deux flancs en photo. L'heure est celle du serveur et une empreinte SHA-256 du contenu signé est gardée, recalculable à l'identique.
  - **`public.loc_chiffrer_retour` est remplacée**, même signature. Elle applique les états avant le chiffrage du socle : le carburant du départ signé fait foi, un retour refusé est non contradictoire, et une zone déjà notée au départ signé n'est pas facturée. Les raisons vont aux avertissements de la proposition.
  - Test 14 : 20 assertions, à travers le vrai chiffrage. TOUT_B2 réassemblé : 14 tests. En local, la migration et le scénario passent.
- **Écran** :
  - un composant `EtatsDesLieux.tsx` dans le dossier du contrat, avec deux colonnes, départ et retour ;
  - le constat : compteur, carburant, quatre vues obligatoires plus compteur, jauge et intérieur, dommages par zone avec leur photo, caution au départ ;
  - la signature au doigt sur un canevas ; le refus se constate avec un motif ;
  - la caution se lève quand rien n'est dû ;
  - dans le formulaire de retour : une zone par dommage, le carburant du départ signé repris et verrouillé, un avis « déjà noté au départ : ne sera pas facturé » ;
  - dans l'exemple, cinq états des lieux, et le chiffrage en mémoire applique les états comme la base (`edl.ts`).
  - tsc, eslint et build verts ; `recette-tavaro.mjs` passe tout (74 contrôles, dont l'état de retour avec de vrais fichiers déposés par CDP et une signature tracée) ; axe : 0 écart à 390 et 1440 px, dialogue de l'état des lieux compris.
- **Restent ouverts** :
  - la préautorisation bancaire réelle (un prestataire de paiement, à choisir par Teo) ;
  - l'état des lieux envoyé en PDF au locataire après la signature (lié au PDF de facture) ;
  - le n° 2, la facture électronique ; les mentions (SIREN client, catégorie d'opération) peuvent commencer dans le module, le raccordement à une plateforme agréée relève du socle.

### Manque n° 2 — la facture électronique, partie module : état au 06/10, 17 h 45 Z

- **Recette** : b2_05 et b2_05b sont posés ; `^test_(b2_|44_)` passe 15/15. L'écran de l'état des lieux est fusionné dans main (1f6427c).
- **Base** (03a86fa) : `b2_06_facture_electronique.sql`. Aucune table touchée, rien d'effacé ; l'émission du socle ne change pas (il met déjà le SIREN client, la nature des opérations et l'option débits dans les mentions).
  - Le CII D16B, profil EN 16931, de chaque facture et de chaque avoir.
  - Un contrôle par pièce : le flux (e_invoicing, e_reporting, a_completer) et ce qui ferait rejeter la pièce.
  - Les portes `loc_facture_electronique`, `loc_avoir_electronique`, `loc_completer_locataire` (SIREN avec clé de Luhn) et `loc_preparation_2027`.
  - **Validé hors base** avec le XSD Factur-X EN 16931 et les schematrons EN 16931 et BR-FR Flux 2 du paquet `factur-x` (Saxon) : 0 erreur, 0 avertissement pour une facture de frais pro, une facture de dommages pro (catégorie O) et un avoir pro. Le BR-FR avait d'abord trouvé quatre manques, corrigés :
    - le cadre de facturation BT-23 = S1 ;
    - les notes PMD, PMT et AAB ;
    - les adresses électroniques BT-34 et BT-49 = SIREN au schéma 0225 ;
    - la date de livraison = la restitution.
  - L'outil : `omega/recette-b2/valider_cii.py`, avec trois XML d'exemple dans `omega/recette-b2/cii/`. Test 15 : 18 assertions.
- **Écran** :
  - un bouton « Forme électronique » sur chaque facture et chaque avoir émis ; le dialogue montre le flux, ce qui manque, le XML lisible et téléchargeable, et un champ pour compléter le SIREN du client, contrôlé avant le clic ;
  - une carte « Facture électronique : prêt pour le 1er septembre 2027 ? », pour la direction et les valideurs ;
  - `cii.ts` est le port exact du constructeur pour l'exemple : ses six pièces d'exemple, données à un pro, passent elles aussi XSD, EN 16931 et BR-FR ;
  - le SIREN d'exemple de l'émetteur est corrigé (512345679, clé valide ; TVA FR75…) ;
  - tsc, eslint et build verts ; recette 82 contrôles verts ; axe : 0 écart, dialogue compris.
- **Reste au socle (coordinateur)** : le raccordement à une plateforme agréée et le dépôt ; le PDF/A-3 Factur-X qui embarque ce XML ; la transmission du e-reporting B2C ; les statuts de cycle de vie renvoyés par la plateforme.

### Carnet de l'audit des promesses (coordinateur, 06/10, 15 h 58 Z) — point 1 fait

Ordre décidé :
1. les deux petits (faits ci-dessous) ;
2. la facture qui part avec son PDF et les photos datées en pièces jointes (avec A2) ;
3. les modules promis : 17 Contestations bancaires, puis Remise en location et entretien, puis Sortie de flotte, puis 02–11, 13, 15, 16, 18, 20 ;
4. Assistance et 19 Relevés constructeur, en contrat d'interface seulement, le tiers à noter pour Teo ;
5. le contrat d'interface du paiement de la caution (préautorisation, capture, libération), sans fournisseur ; le coordinateur choisira le fournisseur avec Teo.

- **Test 15** : il mourait sur un appel à `private.loc_dec` sous le rôle endossé. Le test calcule maintenant la valeur attendue sans fonction privée (7bb5c00). `loc_dec` est mon formateur de décimaux, pas un déchiffrement.
- **b2_07** (0e2cc89) et son écran :
  - **la photo floue est refusée**. L'écran mesure la netteté dans le navigateur (`nettete.ts` : variance du laplacien sur l'image réduite à 512 px ; fixtures `omega/recette-b2/photos` : nette 2 554, légère 350, floue 8 ; seuil 40, réglable par `loc_reglages.nettete_min`) et écarte la photo floue dès son choix, en la nommant. La base garde la mesure et une garde refuse de signer un état dont une photo mesurée est sous le seuil.
  - **les frais de dossier d'un avis sont refacturés** : `loc_refacturer_avis` crée une proposition d'une ligne (FRAIS_AVIS du barème), qui suit validation, facture et courriel. L'écran a un bouton « Refacturer les frais de dossier » sur un avis désigné. Test 16 : 12 assertions, jusqu'à la facture émise.
  - Recette : 84 contrôles verts, dont la photo floue refusée (vraie fixture déposée par CDP) et la refacturation ; axe : 0 écart.

### Carnet, point 2 — la facture part avec son PDF et ses photos datées (06/10, 18 h 30 Z)

- **b2_08** (8c928e4) :
  - `loc_envoyer_factures` attend les PDF quand un courriel doit vraiment partir (travail `tavaro.pdf_factures`), puis joint PDF et photos (10 pièces et 15 Mo au plus, règles du socle) ;
  - les pièces sont créées au statut « lue » : pas de lecture IA ;
  - le filet `loc_pdf_en_souffrance` (cron toutes les 15 minutes) fait partir le courriel sans pièce jointe au bout de 30 minutes si l'ouvrier ne répond pas ;
  - test 17 : 16 assertions.
- **Ouvrier `omega/functions/tavaro-pdf`** (Deno, pdf-lib) : un PDF A4 par facture, déposé dans omega-clients ; les photos sont mesurées (taille, SHA-256) ; au dernier essai, envoi sans pièce jointe. deno test 7/7, check, lint et fmt OK ; PDF relu à l'œil. **À déployer par le coordinateur, avant la pose de b2_08.**
- **L'expéditeur d'A2** joint déjà les pièces d'un envoi (Brevo `attachment`) : rien à changer chez lui ; à prouver sur le banc.
- **Écran** : la facture dit « PDF et photos datées joints », ou « PDF en préparation » ; recette 85 contrôles verts.
- **Suite du carnet** : le point 3, en commençant par le module 17 (contestations bancaires : le dossier de preuve en un clic).

### Carnet, point 3 — module 17, contestations bancaires (06/10, 20 h Z)

La promesse (textes.ts) : « Quand un client conteste auprès de sa banque le débit des dommages, le dossier part en un clic : état des lieux signé, photos datées, barème appliqué et contrat. »

- **b2_06b** (42fdbe4) : `loc_completer_locataire` construisait sa liste de champs par `text[] || 'siren'`, que PL/pgSQL lit comme un littéral de tableau (22P02 au test 15). Corrigé avec `array_append`, et reporté dans la source b2_06.
- **b2_09** (1ee1134, puis 3a79c20 qui ajoute `dossier_chemin`) :
  - `loc_contestations`, avec RLS par agence et Realtime ;
  - deux réglages : `contestation_delai_jours` (7 par défaut) et `contestation_adresse` ;
  - les portes :
    - `loc_ouvrir_contestation` rend les **forces du dossier** : contrat, états des lieux de départ et de retour, photos datées, barème, constat contradictoire, envoi de la facture ;
    - `loc_produire_dossier`, puis `loc_envoyer_dossier`, qui passe par `preparer_envoi`, donc par la validation ; il refuse en 55000 si l'envoi par courriel n'est pas réglé ;
    - `loc_issue_contestation`, par la direction ou un valideur ;
    - pour l'ouvrier, au service seul : `loc_dossier_a_produire`, `loc_enregistrer_dossier`, `loc_dossier_impossible` ;
  - le cron `tavaro-contestations` alerte à J-2, à J0 et au dépassement.
  - Vérifié en local sur souche, chaque chemin dans une session neuve. Test 18 : 25 assertions quand l'envoi est réglé.
- **Ouvrier tavaro-pdf** (6ea1694) : genre `tavaro.dossier_contestation`. Le PDF contient :
  - la lettre et la chronologie (départ, retour, validation par une autre personne, envoi, débit) ;
  - le contrat ;
  - le barème ligne par ligne ;
  - les deux états des lieux, avec l'empreinte SHA-256, la signature et les photos datées intégrées (budget de 9 Mo, pour laisser la place au PDF de la facture et au contrat dans les 15 Mo du courriel).

  Les forces et faiblesses du dossier ne vont pas à la banque. deno test 12/12.
- **Écran** (2da8695) : la carte « Contestations bancaires ».
  - À l'ouverture, l'écran montre ce que le dossier contiendra et ce qui lui manque.
  - Elle affiche le délai, le dossier composé, l'envoi en un clic, le téléchargement et l'issue.
  - Recette : 98 contrôles verts aux cinq largeurs ; axe : 0 écart, dialogue compris.
- **À confirmer sur la recette** : `private.lit_objet` connaît-il `objet_type = 'loc_contestations'` ? Sinon, la pièce du dossier reste invisible aux personnes. L'envoi et le téléchargement par chemin ne changent pas.
- **Suite du carnet** : « Remise en location et entretien ».
