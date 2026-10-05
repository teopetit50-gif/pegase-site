# Session B2 — TAVARO, le module des loueurs (contrats, retours, barèmes, factures, avoirs, litiges)

Branche `worker-b2`. Coordinateur : session_01B4JNQXyT69GytdvE9SjAnE. Dernière mise à jour : 06/10/2026, matin.

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce que la vitrine promet, prouvé sur la recette) | **0 %** — rien n'a encore été joué sur la recette | le scénario ci-dessous joué en pgTAP par les portes publiques, vert ; les trous du socle comblés par migrations (voir « Trous ») |
| **Livrable client** (un loueur ouvre /espace/tavaro et travaille) | **0 %** — l'écran n'existe pas | /espace/tavaro sur le modèle d'A3 (exemple + base réelle), recette aux cinq largeurs, relecture avec le compte du banc |

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

## 3. Questions posées au coordinateur (06/10)

1. Qui peut exécuter les douze portes `public.loc_*` (authenticated ? service_role ?) — surtout `loc_appliquer_releve`.
2. La chaîne décision → `tavaro.decision` : qui dépose le travail (abonnement sur quel événement ?), forme de la charge (`demande, statut, objet_type, objet_id, decideurs`) ; idem `tavaro.envoi` (`envoi, objet_type, objet_id, evenement`) et `tavaro.piece_lue`.
3. Le banc : fuseau et territoire des entités (TVA), rôles exacts de referent/daf/daf2 (`valideur` ?), ligne `reglages_envois` pour `tavaro`, `loc_reglages`/`loc_agences` déjà posés ou non.
4. Le schéma `tests` d'A5 (`tests.jeu`, `tests.endosser`, `runtests`) est-il en place sur la recette ?

## 4. Fait / en cours

- 06/10 matin : lecture de CLAUDE.md, AGENTS.md, CONTRAT-OUVRIER, NOTES-COORDINATEUR, NOTES-A3, SOCLE-EXTRAITS-TAVARO (17 tables, 110 fonctions, 4 crons) et de la promesse du site ; scénario écrit (ci-dessus) et envoyé au coordinateur.
