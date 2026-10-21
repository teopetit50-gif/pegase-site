# T-OFFLOAD — tests en boîte noire du moteur OFFLOAD (clients inactifs, affaires en plan)

Brief posé par la session bureau de Teo, 21/10/2026. Contrat : `omega/CONTRAT-TESTEUR.md`.
Branche : `testeur-offload`. Client banc : `banc-test-offload` (créé par le coordinateur).

## Ce que tu lis

- Promesses : `lib/produits/capacites/reprise.ts` (catalogue, cas limites, échelle) et
  `lib/produits/reprise.ts` (la page) : détection du silence anormal, reprise à valider, un
  seul canal, un message par trimestre, compte en litige exclu, affaires en plan, échéances,
  valeur en jeu, rien ne part en essai.
- Écran : `app/espace2/offload` sur la recette (tableau, fiche compte, pilotage).
- Banc de l'ouvrier, pour savoir comment l'historique entre : `omega/recette-c4/banc_offload.sql`
  et, sur `worker-c4`, `omega/banc/offload_*.sql` (fichiers de banc seulement).

OFFLOAD part d'un **historique d'achats** (relevés : qui a acheté quoi, quand), de contrats et
d'interventions. Ton jeu d'essai est un fichier de données ; les comptes et contacts sont des
entreprises et des personnes **fictives**.

## Le jeu d'essai de départ

Le client banc est une **société de maintenance et d'équipements en Guadeloupe** (climatisation,
par exemple) : des comptes qui achètent à un rythme régulier, des contrats à reconduction, des
interventions terminées. Douze comptes sur le même gabarit ; seul le cas change.

| Cas | Le compte | Ce que le site promet (à vérifier dans `reprise.ts`) |
|---|---|---|
| O0 | rythme mensuel, silencieux depuis 3 mois — le témoin | signal levé, reprise **à valider**, rien d'envoyé |
| O1 | même silence, mais compte en litige chez CASHD (posé par le coordinateur) | **exclu** de la vague, dit pourquoi |
| O2 | rythme annuel, silencieux depuis 3 mois | **aucun** signal : silence normal |
| O3 | silence anormal, compte sans courriel | reprise par **appel**, pas de message |
| O4 | commande arrivée, non retirée depuis 10 jours (délai réglé 7) | affaire en plan, relance 1 préparée |
| O5 | contact importé sans accord | aucun message préparé pour lui |
| O6 | compte déjà relancé il y a 40 jours | pas de second message ce trimestre |
| O7 | C:114 ; brief | O0 + achat F-9007 le 21/10 pendant la reprise | reprise close « commande », message annulé | après deux détections au 22/10 : niveau passé à `ralentit` (« Ses commandes s'espacent … »), mais reprise toujours `appel`, `issue: null`, `close_le: null`, tâche d'appel `a_faire`. Le pilotage, lui, compte la commande (`commandes_reprises: 2`, `chiffre_repris: 1450` sur la vague du 21/10) | **écart** TOFFLOAD-06 | 1 |
| O8 | sortie d'un geste (exclure / suivre) sans motif | refusée ; avec motif : acceptée et journalisée | | sans motif (null, blanc, vide) : refusé par `offload_changer_statut` (« Un changement de suivi dit pourquoi. ») et `offload_exclure` (« Une exclusion nomme ce qu'elle écarte et dit pourquoi. ») ; avec motif : accepté, deux lignes `offload.compte_statut` (avant/après/motif) au journal lu par `offload_restitution` | juste | 1 |
| O9 | compte joignable par courriel et par SMS | **un seul** canal par vague |
| O10 | contrat à reconduction tacite, échéance dans 60 jours | échéance signalée à temps, pas après |
| O11 | C:113 ; brief | O0 + achat F-9011 1 000 € le 21/10 après l'ouverture | valeur figée à l'ouverture | après la détection du 22/10 : `valeur_en_jeu: 5567.8` inchangée (le signal, lui, passe à `valeur_annuelle: 9738.45`). Même défaut de clôture que O7 : reprise toujours `appel` | valeur : juste ; clôture : voir TOFFLOAD-06 | 1 |
| O12 | effacement d'une personne (porte d'effacement, demandée au coordinateur) | plus rien ne la mentionne ; journal présent, sans ses données |

Après la série : rejoue le relevé **à l'identique**. Attendu : un signal par compte et par
jour au plus, aucune seconde reprise.

Deuxième série : la vague de la semaine (un seul jour d'envoi réglé), le pilotage (valeur en
jeu par segment sur 12 mois, lisible à l'écran), la restitution des données d'une organisation
(tout revient, dans un format lisible).

## Niveau 2 (plus tard)

L'import des comptes d'Omega (personnes morales) est en cours chez l'ouvrier, sur l'accord
écrit de Teo. Quand le coordinateur te le dit, tu lis **ses** résultats par l'écran : les
signaux ont-ils du sens pour une vraie liste ? Tu n'importes rien toi-même. Les connecteurs
CRM / ERP / tableur : « pas testable sans tiers ».

## Résultats

Client banc `dddddddd-0000-4000-8000-0000000000c4`, mode `essai`, aucun réglage d'envoi au socle. Dépôt par
`public.offload_saisir_*` (rôle de service) ; gestes et lectures sous l'identité du gérant
`eeeeeeee-0000-4000-8000-0000000001c4`. Détection au 21/10 jouée par le coordinateur : `{"entrees": 9,
"niveaux": {"ok": 4, "eteint": 9}, "avant_cloture": 9}`. Les reprises ont été ouvertes par le gérant
(`offload_ouvrir_reprise`) : la détection seule n'en ouvre aucune et ne met rien « à valider ».
P = `lib/produits/reprise.ts`, C = `lib/produits/capacites/reprise.ts`.

| Cas | Promesse (fichier:ligne) | Le compte | Attendu | Ce qu'OFFLOAD a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| O0 | P:166, P:451, C:44 | mensuel, muet depuis 20/07 | signal levé, reprise à valider, rien d'envoyé | signal `eteint` 60 pts, phrase juste (« tous les 30 jours … depuis 93 jours … 3,2 fois son rythme ») ; détection : aucune reprise, `a_valider` vide ; à l'ouverture par le gérant : envoi1 créé **`mode: reel`**, `bloque` `CONFIG_ABSENTE`, puis tâche d'appel. Rien n'est parti, mais grâce au seul socle | signal : juste ; reprise à valider : **écart** TOFFLOAD-01 | 1 |
| O1 | P:195, C:156 | O0 + litige CASHD (posé par le coordinateur) | exclu de la vague, motif dit | même signal que O0, aucune mention du litige ; reprise ouverte et envoi1 tenté comme O0 | **écart** TOFFLOAD-02 | 1 |
| O2 | C:44, P:320 | annuel, muet depuis 20/07 | aucun signal | niveau `ok`, score 0, `rythme_jours: 365`, attendu le 20/07/2027 | juste | 1 |
| O3 | brief (pas de promesse écrite) | O0 sans courriel | appel, aucun message | reprise `appel`, motif « Pas de courriel connu : la reprise passe par l'appel du commercial. », `envoi1: null`, tâche d'appel | juste | 1 |
| O4 | C:86-87, C:88, C:152 | actif, CMD-O4-01 arrivée 11/10, délai 7 j | affaire en plan, relance 1 préparée | `offload_affaires_liste` : affaire `en_attente`, `jours: 10` (listée : juste) ; aucune relance ni tâche préparée ; `valeur_ht: null`, aucun champ montant à la saisie | liste : juste ; relance et chiffrage : pas couvert (CYCLE, dit par le coordinateur) | 1 |
| O5 | brief (pas de promesse écrite) | O0, contact sans accord | aucun message préparé | aucun champ d'accord à la saisie (`Champ de compte inconnu : … consentement, opt_in, accord_contact …`) ; reprise ouverte et envoi1 tenté comme O0 | pas couvert | 1 |
| O6 | C:131-132, P:193, P:381 | O0, contact courriel noté le 11/09 (`offload_noter_contact`) | sort de la vague / pas de second message ce trimestre | `dernier_contact: 2026-09-11` lu sur le compte, mais signal levé, reprise ouverte et envoi1 tenté comme O0 | **écart** TOFFLOAD-03 | 1 |
| O7 | C:114 ; brief | O0 + achat F-9007 le 21/10 pendant la reprise | reprise close « commande », message annulé | juste après l'achat : reprise toujours `appel`, `close_le: null`, tâche `a_faire` | en attente de la détection du 22/10 | — |
| O8 | C:101, C:176 ; brief | actif | sans motif refusé ; avec motif accepté et journalisé | sans motif (null, blanc, vide) : refusé par `offload_changer_statut` (« Un changement de suivi dit pourquoi. ») et `offload_exclure` (« Une exclusion nomme ce qu'elle écarte et dit pourquoi. ») ; avec motif : accepté, deux lignes `offload.compte_statut` (avant/après/motif) au journal | juste | 1 |
| O9 | P:381 | O0, courriel + SMS | un seul canal par vague | envoi1 courriel seulement (aucun SMS) ; après le blocage, tâche d'appel avec le téléphone. Pas d'envoi simultané sur deux canaux | juste (sous réserve : envoi réel jamais parti) | 1 |
| O10 | C:73, C:75 | actif, CT-O10 tacite au 20/12 | échéance signalée à temps | contrat accepté (`reconduction`, `libelle`, `debut`) ; `offload_echeances_tableau` : `[]`, alors que `offload_restitution` compte `echeances: 1` | pas couvert (CYCLE, dit par le coordinateur) | 1 |
| O11 | C:113 ; brief | O0 + achat F-9011 1 000 € le 21/10 après l'ouverture | valeur figée à l'ouverture | juste après l'achat : `valeur_en_jeu: 5567.8` inchangée | en attente de la détection du 22/10 | — |
| O12 | P:441 ; brief | O0 ; effacement par `offload_effacer_compte` | plus rien ne la mentionne ; journal présent sans ses données | sans motif : refusé (« Dites d'où vient la demande d'effacement … ») ; avec motif : fiche et tableau anonymisés (« Compte effacé (réf. O12) », email/contact `null`), journal `offload.compte_efface` présent. **Mais** `offload_restitution` contient encore nom, courriel et contact dans la ligne de journal `offload.compte_saisi` ; tâche d'appel restée `a_faire` ; rejeu : la saisie est acceptée en silence et réécrit les données au journal (`offload.compte_modifie`) | **écart** TOFFLOAD-04 | 1 |
| R | P:196, P:397 | rejeu à l'identique des passes A et B, puis deux détections au 22/10 | aucun doublon, 1 signal/compte/jour, aucune seconde reprise | signaux : 13 (un par compte, 2ᵉ détection `entrees: 0`), reprises : 10, aucune seconde ; comptes 13, affaire 1, contrat 1. **Mais achats 172 → 342** (chaque facture recréée, même référence, même date, même montant) et contacts 1 → 2 ; d'où `ca_12m` d'O0 passé de 4 050 à 8 100 et `valeur_annuelle` de 5 567,8 à 11 135,59 | signaux et reprises : juste ; dépôt : **écart** TOFFLOAD-05 | 1 |


### Contre-épreuve des correctifs (21/10, après c4_24, c4_25, c4_26 ; réglage d'envoi essai posé, `envoi_auto` false, accord « absent »)

Rejouée sur des comptes neufs pour ne pas lire l'état pollué de la série 1. Aucun envoi ni demande approuvés.

| Cas | Écart | Ce qui a été joué | Ce qu'OFFLOAD a fait | Verdict | Niveau |
|---|---|---|---|---|---|
| C-01 | TOFFLOAD-01 | O14 « Snack Fictif Reprise-Neuve SARL » (mensuel, muet depuis 20/07), `offload_ouvrir_reprise` par le gérant | reprise `a_valider`, envoi1 `"mode":"essai","statut":"a_valider"` ; `offload_tableau.a_valider` montre la demande `415069c1-…` avec destinataire, sujet et corps entier ; `retenus_en_attente: 1`. Le corps reprend date, réf. et montant de la dernière commande (P:237, C:56), aucun prix ni délai (C:102), propose « stop » | juste | 1 |
| C-04 | TOFFLOAD-04 | O13 neuf (13 achats), `offload_effacer_compte` avec motif, puis ressaisie du compte et d'un achat | restitution : aucune trace du nom, du courriel ni du contact ; ressaisie refusée (« Ce compte a été effacé à la demande de la personne : il ne se ressaisit pas. ») ; achat refusé (« … aucun achat ne s'y rattache plus. »). O12 de la série 1 a aussi disparu de la restitution | juste | 1 |
| C-05 | TOFFLOAD-05 | rejeu à l'identique du compte O0 et de ses 13 factures | `achats` 342 → 368 = +13 (O13) +13 (O14) : zéro doublon pour O0 | juste | 1 |
| C-06 | TOFFLOAD-06 | O14 : achat F-9014 le 21/10 pendant la reprise | reprise `close`, `issue: commande`, motif « Une commande est arrivée depuis l'ouverture de la reprise. », envoi1 `annule`, plus rien à valider pour O14. **Mais** `offload_envoi_auto.retenus_en_attente` reste à 1 | juste ; compteur : TOFFLOAD-07 | 1 |
| — | TOFFLOAD-06 (série 1) | reprises O7 et O11 ouvertes avant le correctif, puis détections 26/10 et 27/10 | `close`, `issue: commande` | juste | 1 |

**TOFFLOAD-07 · compteur des messages retenus.** Après C-06 (envoi `bf3163bd-…` annulé, `a_valider` vide pour O14 et vide en tout),
`offload_envoi_auto('dddddddd-0000-4000-8000-0000000000c4')` rend encore `"retenus_en_attente": 1`. Mineur : le valideur croit qu'un
message attend.

**TOFFLOAD-08 · réglage refusé en langage machine.** `offload_regler(client, '{"vague_jour":9}')` sous le gérant rend
`new row for relation "offload_reglages" violates check constraint "offload_reglages_vague_jour_check"` au lieu d'une phrase
(les autres portes disent pourquoi en français). Mineur.

## Série 2

Réglage : `offload_regler(client, '{"vague_jour":2}')` (mardi, P:256 « Mardi 9 h ») par le gérant. Comptes neufs, mensuels, muets
depuis le 20/07 : V1 Hôtellerie 600 €, V2 Restauration 300 €, V3 Hôtellerie 900 € (`5797c896-…`, `9ac17c98-…`, `a9130d92-…`).
Détections demandées au coordinateur : lundi 26/10, mardi 27/10, mardi 27/10 encore.

| Cas | Promesse | Attendu | Ce qu'OFFLOAD a fait | Verdict | Niveau |
|---|---|---|---|---|---|
| S2-1 | P:256 | lundi : signaux levés, aucune reprise ouverte | 26/10 : `entrees: 5`, V1-V3 `eteint`, aucune reprise ouverte | juste | 1 |
| S2-2 | P:256, P:451 | mardi : V1-V3 ouverts en demandes retenues « à valider », rien ne part | 27/10 : `entrees: 0`, V1-V3 `eteint`, `reprise: null`, `a_valider` 0 ; aucun envoi créé (constat du coordinateur) | rien ne part : juste ; vague : en attente de la réponse du coordinateur (autre tâche que la détection ?) | — |
| S2-3 | P:381, P:397 | second appel du mardi : rien de plus | identique au premier (`entrees: 0`), aucun envoi | juste (mais rien n'avait été ouvert) | 1 |
| S2-4 | C:113, C:115 ; brief | pilotage : valeur en jeu par segment sur 12 mois | `offload_pilotage(client, '2025-10-27')` : `vagues` (valeur en jeu, comptes, commandes, chiffre repris par vague : 21/10, en jeu 51 910,2, 3 commandes, 1 900 € repris), `suivi` mois par mois sur 12 mois, `entites` (consolidé, par entité ; `par_site` vide) ; `taux` par segment / canal / niveau. **Pas** de valeur en jeu par segment ; pas de taux par message (C:115) ; V1-V3 (secteurs renseignés) n'y figurent pas, faute de vague | valeur par segment : pas couvert ; par vague, par entité, 12 mois : juste | 1 |
| S2-5 | P:441, C:118 ; brief | restitution : tout revient, format lisible | `offload_restitution` : un JSON, `resume` (compteurs) + `donnees` (achats, comptes, contacts, contrats, affaires, échéances, équipements, interventions, signaux, reprises, tâches, exclusions, règles, réglages, rapprochements, arrêtés, journal). Les messages préparés (sujet, corps, destinataire) n'y sont pas, ni les envois ; aucun export tableur (C:118) | données OFFLOAD : juste ; messages : à confirmer (relèvent du socle ?) ; tableur : pas couvert | 1 |

## Écarts

**TOFFLOAD-01 · O0 (et tous les comptes ouverts) · « Vous validez ce qui part » (P:451) et essai.**
Réglages lus par `offload_tableau('dddddddd-0000-4000-8000-0000000000c4')->'reglages'` à l'installation :
`"mode":"essai", "envoi_auto":true, "sujets_auto":["affaire","echeance","reprise"]`. Le gérant appelle
`offload_ouvrir_reprise('c653531b-d1d7-47dd-b919-5b909f78537c')` ; `offload_fiche(...)->'reprises'` rend
`"envoi1":{"mode":"reel","sujet":"banc-test-offload — votre commande du 20 juillet 2026","statut":"bloque","verrou":"CONFIG_ABSENTE"}`,
`"motif":"Message retenu par le socle (CONFIG_ABSENTE) : Le module offload n'est pas réglé pour cette organisation : aucun envoi."`
(reprise `926a426c-ec8d-4474-a8ec-a35ee1fc96d3`, envoi `a90724ef-edb7-4b74-b1e4-66c790164e89`). Deux choses : l'envoi est
tenté dès l'ouverture, sans étape « à valider » ; et il est marqué `reel` alors que le module est en `essai`. Seule
l'absence de ligne `reglages_envois` l'a arrêté. Écran : non vu (comptes sans mot de passe).

**TOFFLOAD-02 · O1 · « Jamais un compte en litige » (P:195, C:156).** Litige CASHD posé par le coordinateur sur la
référence « O1 » (`cashd_statut_compte`, statut `litige`) avant la détection. `offload_tableau` : O1 a le même signal que O0
(aucune raison « litige »), et `offload_ouvrir_reprise('c988d725-79b0-4241-babf-6aac82a66148')` ouvre la reprise
`0b20b320-98d5-4df0-8090-4f7113e14e1b` avec un envoi1 `reel` (bloqué `CONFIG_ABSENTE`), sans refus ni motif.

**TOFFLOAD-03 · O6 · dernier contact récent (C:131-132, P:193).** `offload_noter_contact('5a4ae785-bf87-4bc8-bfd3-214e6436e122',
'2026-09-11','courriel','relance OFFLOAD (fictive)', …)` ; le compte montre `dernier_contact: 2026-09-11`, mais la détection
lève le signal et `offload_ouvrir_reprise` ouvre la reprise `253475da-e105-44fe-8ffc-5856ee6045b4` avec un envoi1. Réserve : le
contact de 40 jours est un contact noté, pas un message OFFLOAD parti (impossible à produire en essai sans réglage d'envoi).

**TOFFLOAD-04 · O12 · effacement (P:441).** `offload_effacer_compte('1ec7702c-938b-40d8-a27c-c11d77022795', 'Courrier de demande
d''effacement (fictif, test)')` sous le gérant. Après coup, `offload_restitution(...)->'donnees'->'journal'` contient encore
`{"action":"offload.compte_saisi","donnees":{"ref":"O12","champs":{"nom":"Cabinet Fictif Effacement SCP","email":"contact@o12.example.invalid","contact":"Contact fictif O12"}}}`.
La tâche « Tâche d'un compte effacé » (`33d2e022-…`) reste `a_faire`, la reprise reste ouverte. Puis le rejeu
`offload_saisir_compte(…, 'O12', 'Cabinet Fictif Effacement SCP', {contact, email})` est accepté sans refus, laisse la fiche
effacée mais écrit au journal `offload.compte_modifie` avec nom, courriel et contact, et rattache 13 achats de plus au compte.

**TOFFLOAD-05 · R · rejeu à l'identique.** Le même lot `serie1_A_depot.sql` rejoué, plus la passe B : `offload_restitution(...)->'resume'`
passe de `achats: 172` à `achats: 342` et de `contacts: 1` à `contacts: 2`. Ex. O0 : deux factures `F-1013` du 20/07/2026 à 450 €
actives (`annule_le` null). Comptes, affaire et contrat ne sont pas doublés. Conséquence attendue sur la valeur en jeu et le
CA 12 mois des comptes, constatée après la détection du 22/10 : O0 `ca_12m` 4 050 → 8 100, `valeur_annuelle` 5 567,8 → 11 135,59 (le compte n'a rien acheté de plus).

**TOFFLOAD-06 · O7 (et O11) · commande pendant une reprise (C:114 ; brief).** Reprise O7 `c015930d-296e-40c6-a1e2-bd63cf7d633a`
ouverte le 21/10 par le gérant ; `offload_saisir_achat('a9fc8da0-1d4f-43fc-9237-d5c5c7a84fe7','2026-10-21',450,'F-9007','Entretien climatisation (fictif)')` ;
détection au 22/10 (deux fois, par le coordinateur). `offload_tableau` : reprise O7 `"statut":"appel","issue":null,"close_le":null`, tâche
d'appel toujours `a_faire` — le commercial est invité à appeler un client qui vient de commander. Même chose pour O11 (`d1f3cdab-…`).
Pourtant `offload_pilotage(…, '2025-10-21')->'vagues'` compte `"commandes":2,"chiffre_repris":1450` : la commande est vue, la reprise n'est pas close.

**TOFFLOAD-01, complément.** Le coordinateur indique que chaque envoi bloqué porte une demande de validation (`demande_id` non nul).
Par les portes OFFLOAD, rien ne la montre : `offload_tableau(...)->'a_valider'` = `[]` et `compteurs.a_valider` = 0, avant et après les
détections. Question posée : quelle porte (socle) montre ces demandes au valideur ?

Notes, non classées en écart :
- `offload_deposer_export` exige un fichier déjà en Storage (nom, sha256, chemin) : dépôt par fichier non testé.
- Pas de montant sur une affaire (`offload_saisir_affaire` ne reconnaît que `libelle`, `type`) : C:88 et C:152 (montant
  immobilisé) ne peuvent pas être tenus (rangé dans O4, pas couvert).
- `offload_echeances_tableau` vide pendant que la restitution compte une échéance (O10).

## Questions au coordinateur

- La porte de dépôt d'un relevé d'historique pour `banc-test-offload`, et celles des contrats
  et interventions.
- Comment poser un compte « en litige CASHD » pour O1, et déclencher la détection à la demande.
- Un compte « gérant » du client banc pour l'écran et les gestes.
- (21/10) L'identifiant (uuid) de `banc-test-offload`, et la confirmation qu'OFFLOAD y est installé en `essai`.
- (21/10) Les portes de lecture : signaux / reprises d'un compte, affaires en plan, échéances, journal des envois préparés.
- (21/10) La porte d'effacement d'une personne (O12) et la porte de geste exclure / suivre avec motif (O8).
- (21/10) Le format attendu du relevé : mon jeu est en CSV (`omega/testeur-offload/releve.csv`,
  compte, date, référence, libellé, montant HT). Faut-il le passer par le dépôt de fichier
  (`GUIDE-DEPOT.md`) ou par une RPC ?
- (21/10) Constat de lecture, pour info : O3 (appel), O5 (accord), O8 (motif), O11 (valeur figée)
  et O12 (effacement) ne correspondent à aucune promesse écrite sur la page ni au catalogue ; je
  les teste contre le brief. Par ailleurs toutes les lignes « Échéances » et « Affaires en plan »
  du catalogue portent le commentaire « moteur CYCLE pas construit » (`capacites/reprise.ts:20-25`) :
  O4 et O10 risquent d'être « pas couvert ».

## REPRISE

**21/10, arrêt 1.**
- Fait : contrat, brief, promesses (page + catalogue) et banc de l'ouvrier lus ; jeu d'essai série 1 prêt
  (`omega/testeur-offload/` : `comptes.csv`, `releve.csv`, `jeu-serie1.md`) ; attendus notés dans le tableau.
- En cours : rien joué — aucune porte de dépôt connue (le banc de l'ouvrier ne montre que `offload_installer`).
- Prochain pas : dès réponse, dépôt → détection → lecture → événements O7/O11/O8/O12 → rejeu.
- Questions : section ci-dessus (identifiant du banc, portes de dépôt/lecture/geste/effacement, litige O1, compte gérant).
- SHA : voir le commit « T-OFFLOAD : jeu d'essai série 1 ».

**21/10, arrêt 2.** Fait : passe A (13 comptes, 170 achats) et passe B (affaire O4, contrat O10, contact
O6 au 11/09) par `public.offload_saisir_*` ; O8 joué, juste. En cours : attente du litige O1 et de
`private.offload_detecter(…, 2026-10-21)` demandés au coordinateur. Prochain pas : lire tableau / fiches /
affaires / échéances, puis O7, O11, O12, détection au 22/10, rejeu. Fichiers : `omega/testeur-offload/serie1_A_depot.sql`.

**21/10, arrêt 3.** Fait : détection du 21/10, lecture, O0-O6, O8-O10, O12 et rejeu du dépôt ; écarts TOFFLOAD-01 à 05.
En cours : O7, O11 et la moitié « signaux / reprises » du rejeu, qui attendent deux détections au 22/10 (demandées).
Prochain pas : lire O7 (close « commande » ?), O11 (valeur figée ?), doublons de signaux et de reprises ; puis série 2.
Questions : aucune nouvelle ; alerte envoyée sur le `mode: reel` (TOFFLOAD-01), ne pas poser de réglage d'envoi sur le banc.

**21/10, arrêt 4 — fin de série 1.** Fait : les 14 lignes jouées ; justes O2, O3, O8, O9, O11 (valeur), R (signaux, reprises) ;
écarts TOFFLOAD-01 à 06 ; pas couverts O4 (relance, chiffrage), O5, O10. En cours : rien. Prochain pas : série 2 — pilotage lu une
fois (vague du 21/10 : `en_jeu` 51 910,2, taux par segment/canal/niveau, pas de valeur en jeu par segment), restitution (JSON, déjà
lue) ; la vague de la semaine attend le correctif TOFFLOAD-01 (régler `vague_jour` déclencherait de nouveaux envois `reel`).
Questions : porte des demandes de validation ; feu vert pour la vague après TOFFLOAD-01.

**21/10, arrêt 5.** Fait : contre-épreuve 01/04/05/06 justes, TOFFLOAD-07 et 08 (mineurs) ; série 2 posée (vague mardi, V1-V3).
En cours : attente des détections 26/10, 27/10, 27/10. Prochain pas : lire la vague, le pilotage par segment, O7/O11.
Questions : aucune. Aucune approbation faite.

**21/10, arrêt 6.** Fait : série 2 lue (S2-1, S2-3 justes ; S2-4 sans valeur par segment ; S2-5 sans messages ni tableur) ;
O7/O11 clos « commande ». En cours : S2-2 — la vague du mardi n'ouvre rien ; question posée au coordinateur (autre tâche ?).
Prochain pas : selon sa réponse, rejouer la vague ou noter l'écart. Aucune approbation faite.
