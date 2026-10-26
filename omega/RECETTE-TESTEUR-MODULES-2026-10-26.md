# Recette du testeur indépendant — corrections des 25 et 26/10 sur les modules

> Session « testeur modules », lancée par la session de Teo le 26/10/2026. Jouée de 17 h 36 à 18 h 08 Z sur la recette
> `ygwbgpowzlbdaajlsqkn` (jamais la production). Aucun code produit corrigé, aucun envoi réel. Les envois créés restent en
> mode `essai`, avec le statut `a_valider`, `refuse` ou `bloque`.

## Méthode

- Le banc et la méthode sont ceux des testeurs : `omega/CONTRAT-TESTEUR.md` et `omega/TESTS-<MOTEUR>.md` sur `origin/testeur-*`,
  plus la fin de `omega/NOTES-COORDINATEUR.md` sur `origin/main`.
- Les gestes passent **par les portes, sous les vrais rôles du banc**. Le rôle `authenticated` porte les claims du gérant ou du
  valideur de chaque client banc :

  | Module | Client | Gérant | Valideur |
  |---|---|---|---|
  | FILED | `…00f1` | `eeeeeeee-…01f1` | `…02f1` |
  | CASHD | `…00c2` | `…01c2` | `…02c2` |
  | REPUT | `…00c3` | `…01c3` | `…02c3` |
  | OFFLOAD | `…00c4` | `…01c4` | `…02c4` |

  Un refus est une ligne dans `approbations`, avec `decision = 'rejete'` et un commentaire, comme le font les testeurs.
- **Transactions annulées.** Chaque cas de bord est un bloc `do $$ … raise exception 'BILAN …' $$`. L'exception finale annule tout
  et renvoie le bilan : rien n'est resté en base.
- **Écrit pour de bon, sur les données du banc prévues pour ça :**
  - R2 sur F3 (FILED), demandé par la note d'A4 ;
  - le refus d'une réponse REPUT (la réécriture passe par la fonction Edge, qu'une transaction annulée ne voit pas) ;
  - le refus de F13 (FILED), pour obtenir une relecture réelle du lecteur.
- **Hypothèses**, notées faute de pouvoir poser la question :
  1. **L'heure figée d'une transaction.** Dans une transaction, `now()` est figé : refus et correction y portent la même heure.
     Pour jouer « corrigé après le refus », je recule de 10 min la ligne `private.reprises` (`cree_le`, `consigne.refuse_le`) dans
     la transaction annulée. Pour simuler « après 24 h », je la recule de 25 h. Les crons sont appelés à la main dans la même
     transaction : `private.filed_tache`, `filed_traiter_reprises`, `cashd_traiter_reprises`, `offload_traiter_reprises`,
     `reput_traiter_reprises`.
  2. **Lectures hors des portes.** Pour lire un résultat qu'aucune porte ne rend (l'état d'une reprise, d'une relecture, d'un
     travail du lecteur), je lis en SELECT `private.reprises`, `private.reput_reprises`, `private.relectures` et `public.travaux`.
     Je n'ai lu ni le code des lots, ni les tests, ni les notes des ouvriers. Seule exception, une recherche de nom (« quelle
     fonction appelle `filed_traiter_reprises` ? ») pour trouver le cron qui fait avancer la reprise FILED.
  3. **Gravité.**
     - Bloquant : la correction n'atteint pas son but.
     - Important : le but est atteint, mais un chemin voisin laisse une pièce ou un message dans un état faux, ou contredit une
       promesse du site.
     - Mineur : un texte ou un affichage.

## Bilan

| Correction | Cas joués | Justes | Écarts |
|---|---|---|---|
| FILED — TFILED-28 (a4_87, a4_89) | 10 | 8 | TMOD-01, TMOD-02 |
| FILED — TFILED-29 (a4_88) | 4 | 3 | TMOD-03 |
| CASHD — TCASHD-18 (c2_42) | 4 | 4 | — |
| CASHD — TCASHD-19 (c2_43) | 5 | 3 | TMOD-04, TMOD-05 |
| OFFLOAD — c4_37 | 6 | 4 | TMOD-06, TMOD-07 |
| REPUT — c3_44 | 4 | 1 | TMOD-08, TMOD-09, TMOD-10 |
| Lecteur — relecture avec consigne | 2 | 2 | — |

**Aucun bloquant.** Les cinq corrections font ce qu'elles annoncent sur leur chemin principal. Les écarts sont sur les chemins
voisins :
- la pièce refusée qui sort de toutes les listes ;
- le second refus ;
- les interdits sur un texte revu ;
- la séparation des rôles dans FILED.

## FILED

### R2 sur F3, joué pour de bon avant l'échéance du 27/10 00 h 52 Z

**Le geste.** Le 26/10 à 17 h 40 m 52 s Z, en gérant :

```sql
filed_corriger_facture('830baec5-…', '{"montant_tva":66.30,"montant_ttc":846.30,"net_a_payer":846.30}',
                       'T-MOD R2 : facture rectificative reçue, TVA à 8,5 %')
```

- Réponse : `"refusee"`, sans erreur. **TFILED-28 corrigé** : la correction n'est plus refusée.
- Piste : « Corrigée par une personne : montant_ttc, montant_tva, net_a_payer (T-MOD R2 …) », version 3, puis « Recontrôlée :
  refusée, le statut reste ».

**Ce que fait le cron.** À 17 h 41 m 00 s, soit 8 s plus tard, `omega-filed` traite la reprise : `impossible`, motif « La facture
corrigée reste bloquée (doublon.probable) : une personne la reprend. »

**Pourquoi la reprise échoue.** Corrigée, F3 vaut 846,30 € chez le même fournisseur que F0 (MCD-2026-1001, 846,30 €,
comptabilisée). `doublon.probable` dit : « Même fournisseur, même montant (846,30 €), à 0 jour(s) de la pièce R2026-000001 ».

- Le signal est **défendable** : les mêmes valeurs que la R2 de T-FILED donnent, par construction du banc, le montant de F0.
- La correction de T-FILED ne passait pas la ventilation. `tva.ventilation` dit donc à juste titre « La ventilation fait 148,20 €
  de TVA pour un total de 66,30 € », et `tva.taux` garde « 19 % ».

**Ce qui reste écrit sur le banc.** F3 est `refusee`, avec une reprise `impossible`. Plus aucune porte ne la reprend : voir TMOD-01.
Le chemin positif est prouvé sur F13, en transaction annulée.

### TFILED-28 — une facture refusée se corrige pour sa reprise, et la reprise aboutit

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| F-1 | R2 sur F3, réel (ci-dessus) | correction acceptée, recontrôle, reprise traitée | acceptée ; recontrôle immédiat ; reprise traitée par le cron en 8 s, `impossible` (doublon probable), motif lisible | juste |
| F-2 | F13 en transaction annulée : refus commenté (valideur), passage du cron, correction de montants **différents** (rectificative : 90 agglos, HT 121,50, TVA 10,33, TTC 131,83), cron des reprises | reprise proposée, F13 `a_valider`, nouvelle demande | reprise `proposee` ; F13 `a_valider` 131,83 € ; nouvelle demande `filed.valider_facture` « Reprise après refus — facture MCD-2026-1014, corrigée (montant_ht, montant_ttc, montant_tva, net_a_payer) » | **juste** |
| F-3 | Sans reprise ouverte : F3 après sa reprise `impossible`, seconde correction | refus lisible | `ERROR 55000: Cette facture est décidée (refusee) : elle ne se corrige plus.` | juste |
| F-4 | Bord : reprise de plus de 24 h (reculée de 25 h), aucune correction, cron, puis correction tardive | `impossible`, puis la correction est refusée | `impossible` « Aucune correction de la facture depuis le refus : même résultat qu'avant. » ; correction refusée (« ne se corrige plus ») | juste (motif : voir les observations) |
| F-5 | Bord : montants à zéro pendant la reprise | pas de reprise proposée | `impossible` « La facture corrigée reste bloquée (montant.nul) : une personne la reprend. » | juste |
| F-6 | Bord : double refus, c'est-à-dire le refus de la demande de reprise | une seconde reprise, ou un refus définitif dit comme tel | aucune seconde reprise ; F13 `refusee` ; une nouvelle correction est refusée (« ne se corrige plus ») | juste : une reprise au plus (observation) |
| F-7 | Bord : correction qui ne change rien (même TTC), reprise reculée de 10 min | rien à reprendre | la correction répond `"refusee"` sans rien dire ; reprise `a_faire` ; au bout de 24 h, `impossible` | juste (observation : aucun retour au client) |
| F-8 | Bord : le valideur qui a refusé corrige, puis approuve sa propre correction | refusé (`capacites/factures.ts:74`) | correction acceptée ; demande de reprise `saisi_par = []` ; approbation acceptée ; demande `approuvee` | **écart TMOD-02** |
| F-9 | Après une reprise `impossible` (F3, réel ; F13 à 24 h, annulé) : ce qu'une personne peut faire | une porte pour « la reprendre » ; la pièce reste visible | correction **et** levée d'anomalie refusées (« ne se corrige plus ») ; la pièce sort de `filed_pieces_en_cours` | **écart TMOD-01** |
| F-10 | Refus sans commentaire (F13, annulé) | — | refus accepté ; reprise `a_faire` avec une consigne sans commentaire | juste (pas de promesse) |

### TFILED-29 — ni facture refusée ni double compte dans « Imputation proposée »

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| I-1 | `filed_pieces_en_cours` (gérant) à 17 h 37 Z, F3 refusée et F13 à valider | pas de catégorie « imputation » qui compte F3 ; F13 une seule fois | `bloquees 14 / 8 363,42`, `attente 1 / 146,48` ; plus de catégorie « Imputation proposée » | **juste** |
| I-2 | Bord : F13 reprise, puis remise à valider à 131,83 € (annulé) | comptée une fois, au nouveau montant | `attente 1 / 131,83` | juste |
| I-3 | Bord : F13 refusée pendant la reprise (annulé), puis réel à 18 h 08 Z | hors des pièces à valider | `bloquees 14 / 8 363,42` seulement | juste pour le double compte ; la pièce n'est nulle part (TMOD-01) |
| I-4 | Bord : la demande `filed.imputer` (60251551) restée `en_attente` sur F3 refusée ; le valideur l'approuve (annulé) | refusé, ou demande annulée au refus de la facture | approbation acceptée, demande **`executee`** | **écart TMOD-03** |

## CASHD

**Constat de départ**, sous le gérant (`cashd_relances_du_jour(…, '2026-10-26')`) : les deux relances ont été revues à 16 h 53 et
16 h 56 Z, à la pose de c2_42 et c2_43.

### TCASHD-18 — rappel refusé, puis règlement partiel lettré : une reprise est préparée

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| C-1 | A-C27 (FB-2026-0130), état réel : rappel refusé le 26/10 à 00 h 53, 500 € lettrés | une nouvelle demande au reste dû | relance 585 €, corps « 585,00 € restant dus (il reste 585,00 € après votre règlement du 25/10/2026) », lien `montant=585.00`, motif « refusée, puis montant revu … une nouvelle demande au nouveau montant, à valider », demande `5c8957b2` `en_attente` | **juste** |
| C-2 | Bord : second refus de la demande revue (valideur), puis cron | reprise traitée, motif lisible | reprise `impossible` « même résultat qu'avant … — consigne : … Corrigez la fiche du compte, ses pièces ou vos textes » ; relance « refusée dans la file de validation : … » | juste |
| C-3 | Bord : après ce second refus, 85 € de plus réglés | revue à 500 € | relance 500 €, nouvelle demande `en_attente` 500 € ; les demandes à 1 085 et 585 € restent `rejetee` | juste |
| C-4 | Le refus du 26/10 à 00 h 53 (réel) | reprise traitée | reprise `impossible` dès 00 h 54, avant le règlement, motif qui cite la consigne ; la revue de c2_42 a pris le relais au règlement | juste |

### TCASHD-19 — la relance en attente suit le reste dû : 585 € et non 1 085 €

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| C-5 | A-C26 (FB-2026-0129), état réel | 585 € | relance 585 €, corps et lien à 585, motif « montant revu … à valider de nouveau », ancienne demande `annulee`, nouvelle `b8184d64` `en_attente` | **juste** |
| C-6 | Bord : second règlement partiel, 85 € (annulé) | 500 €, une seule demande en attente | 500 € dès l'appel (sans attendre le cron), lien `montant=500.00` ; demandes 1 085 et 585 `annulee`, 500 `en_attente` | juste |
| C-7 | Bord : solde complet, 85 + 500 € (annulé) | relance coupée, aucune demande ouverte | `coupee`, « facture FB-2026-0129 réglée » ; les trois demandes `annulee` | juste |
| C-8 | Bord : règlement de 0 € | refus lisible | `Le montant reçu est positif.` | refus juste ; **phrase à l'envers, TMOD-05** |
| C-9 | Bord : interdit « simple oubli » posé (`cashd_regler_relances`), puis 85 € réglés sur A-C26 ou A-C27 (annulé) | la relance revue contient l'interdit : `bloquee` (comme S2-10) | relance revue `en_attente` à 500 €, le corps contient « Il s'agit sans doute d'un simple oubli » | **écart TMOD-04** |

Note : l'interdit « simple oubli » de S2-10 n'est plus sur le banc (`interdits = []`). La présence du mot dans les relances réelles
n'est donc pas un écart en soi. C-9 le remet dans une transaction annulée.

## OFFLOAD — c4_37, reprise après refus, de bout en bout

Demande refusée : message de reprise de V1 (`58c70ff3`, Hôtel Fictif Vague-Un), refusé par le valideur `…02c4`.

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| O-1 | Refus commenté, fiche corrigée 10 min après (contact « Mme Fictive Nouvelle »), cron | nouveau message corrigé, nouvelle demande, rien d'envoyé | reprise `proposee` ; nouvelle demande `b821397e` ; message `essai` « Bonjour Mme Fictive Nouvelle, … » ; l'ancien n'est plus listé | **juste** (résumé : TMOD-07) |
| O-2 | Bord : refus sans correction, reprise reculée de 25 h, cron | `impossible`, motif lisible | « aucune correction en 24 heures — consigne : … Corrigez la fiche du compte (contact, courriel) ou vos réglages (signature, règles) : le message suivant en tiendra compte » ; reprise de compte `close`, `issue: refusee` | juste |
| O-3 | Bord : refus, puis cron sans correction (moins de 24 h) | rien de proposé | reprise `a_faire`, cron → 0 | juste |
| O-4 | Bord : le valideur qui a refusé décide la demande de reprise | refusé | `Le demandeur ne décide pas de sa propre demande.` (il en est `demandeur_id`) | juste |
| O-5 | Bord : double refus (le gérant refuse la demande de reprise), puis nouvelle correction | refus définitif, sorti de « à valider » | aucune seconde reprise ; le message refusé **reste** dans `offload_tableau.a_valider` ; reprise de compte « a_valider, Reprise après refus : message corrigé, à valider de nouveau » | **écart TMOD-06** |
| O-6 | Pendant l'attente de correction (0 à 24 h) | message refusé hors de « à valider » | reste listé `a_valider` avec sa demande `rejetee` ; compteur `a_valider` 5 au lieu de 4 ; retiré seulement quand la reprise est `impossible` | **écart TMOD-06** |

## REPUT — c3_44, reprise après refus avec la consigne du valideur

Joué pour de bon (mode essai). Le 26/10 à 17 h 53 m 08 s Z, le valideur `…02c3` refuse la réponse `c041ef93` (Ophélie Goyave,
garantie, client fictif du banc) avec la consigne : « commencez par « Bonjour Madame Goyave » et terminez en l'invitant à répondre
à ce courriel pour toute autre question ».

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| P-1 | Refus avec consigne, réel | nouvelle réponse qui suit la consigne, à valider, rien d'envoyé | à 17 h 54 m 04 s, reprise `proposee`, nouvelle demande `40a3169f` « Reprise après refus — Réponse à Ophélie Goyave », réponse v2, `raison` « Reprise après refus (consigne suivie) », envoi `e163be56` `essai` `a_valider` ; ancien envoi `refuse` ; texte « Bonjour,\n\nLes pièces remplacées sont garanties un an. N'hésitez pas à répondre à ce courriel pour toute autre question. … » | fin de la consigne suivie ; **formule d'appel ignorée alors que la raison dit « consigne suivie » : TMOD-09** |
| P-2 | Bord : refus sans commentaire (`ffd90841`, annulé) | `impossible`, motif qui dit quoi faire | « refusée sans consigne (ni motif ni commentaire) : écrivez la réponse vous-même, ou refusez de nouveau en disant quoi corriger » | motif juste, mais **le second geste n'existe pas : TMOD-10** |
| P-3 | Bord : double refus de la reprise `40a3169f` (annulé) | refus définitif dit comme tel, demande « à traiter » | aucune reprise pour ce refus ; la demande client `d336c126` reste **`a_valider`**, sans aucune validation en attente | **écart TMOD-08** |
| P-4 | Délai | — | reprise en 56 s ; le cas « après 24 h » ne se pose pas (la réécriture est immédiate) | juste |

## Lecteur — relecture avec consigne après un refus

Joué pour de bon sur F13 (R2026-000034, pièce fictive du banc FILED). Le 26/10 à 17 h 56 m 17 s Z, le valideur la refuse avec la
consigne : « relisez le numéro imprimé sous « SIRET » (9 chiffres seulement, donc un SIREN, pas de SIRET), et la ligne des
agglos : quantité 100, prix unitaire 1,35 € ».

| # | Cas | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| L-1 | Relecture déclenchée par le refus | une relecture qui porte la consigne | `private.relectures` origine `reprise:a6dbc678…`, consigne « Commentaire du valideur : … » à 17 h 57 m 00 s ; travail 17588 `fait` à 17 h 57 m 09 s, lecteur `10-26.f8c811e`, `relecture: {essai: 1, consigne: true}`, 0,033 € | **juste** |
| L-2 | Valeurs relues | SIREN vérifié, aucun SIRET fabriqué, ligne 100 × 1,35 = 135 | `fournisseur.siren` 912345618 vérifié ; aucun `fournisseur.siret` ; ligne quantité 100, montant 135, TVA 8,5 % ; HT, TVA et TTC identiques ; recontrôle à 17 h 58 tout `ok` ; la reprise attend une correction humaine (`a_faire`) | **juste** |

Également relevé, sans le jouer : la relecture de la pièce de F3, déclenchée par R1 le 26/10 à 00 h 53 (essai 1), porte la
consigne en entrée, mais son résultat n'a pas la marque `relecture` (lecteur d'avant v71). La preuve d'A1 de 16 h 59 Z (essai 2) l'a.

## Écarts

**TMOD-01 · FILED · important · une facture refusée sort de toutes les listes, et après « reprise impossible » plus aucune porte ne la reprend**

- **Reproduction**, état réel du banc : F3 `830baec5-…`, reprise `impossible` depuis le 26/10 à 17 h 41 Z.
  - En gérant : `filed_corriger_facture(F3, '{"montant_ttc":846.31}', …)` → `ERROR 55000: Cette facture est décidée (refusee) :
    elle ne se corrige plus.`
  - `filed_lever_anomalie(F3, 'doublon.probable', …)` → même erreur.
  - `filed_pieces_en_cours(client, null)` → `bloquees 14 / 8 363,42` : F3 n'est comptée nulle part. F13, refusée depuis 17 h 56 Z,
    non plus.
- **L'écart.** Le motif de la reprise promet « une personne la reprend ». Mais aucun geste n'existe, et la pièce n'apparaît dans
  aucune catégorie, alors que `capacites/factures.ts:97` promet que les pièces bloquées ou en attente sont comptées en continu.
  Pendant les 24 h où elle se corrige, la facture « à reprendre » est déjà invisible du pilotage.
- **Attendu** :
  - une catégorie « refusée, à reprendre » dans `filed_pieces_en_cours` ;
  - après « impossible », un geste qui reprend la pièce (rouvrir, ou dire de redéposer la rectificative), ou un motif qui dit ce
    geste.

**TMOD-02 · FILED · important · le valideur qui refuse peut corriger la facture, puis approuver seul sa propre correction**

- **Reproduction**, transaction annulée, F13 :
  1. En valideur `…02f1` : `insert into approbations (…'a6dbc678…', …, 'rejete', 'T-MOD : 90 agglos')`.
  2. `private.filed_tache()`. Reculer la reprise de 10 min.
  3. Toujours en valideur : `filed_corriger_facture(F13, '{"montant_ht":121.50,"montant_tva":10.33,"montant_ttc":131.83,"net_a_payer":131.83}', …)`
     → `"refusee"`.
  4. `private.filed_traiter_reprises()` → nouvelle demande `filed.valider_facture`, `saisi_par = []`, 1 approbation requise.
  5. Toujours en valideur : `insert into approbations (…, 'approuve', 'T-MOD : j''approuve ma propre correction')` → accepté,
     demande `approuvee`.
- **L'écart.** La même personne a saisi les montants et les a approuvés, contre `capacites/factures.ts:74`. La décision de Teo sur
  TFILED-12 (« un gérant décide seul ») vise le gérant, pas un valideur.
- **Point de comparaison.** OFFLOAD bloque ce cas : « Le demandeur ne décide pas de sa propre demande. » (O-4).
- **Attendu** : l'auteur de la correction figure dans `saisi_par` de la demande de reprise, et le contrôle de séparation l'exclut.

**TMOD-03 · FILED · mineur · la demande d'imputation reste ouverte sur une facture refusée, et s'exécute si on l'approuve**

- **Reproduction**, transaction annulée :
  1. En valideur : `insert into approbations (demande '60251551-…' [filed.imputer de F3], …, 'approuve', …)` → accepté.
  2. `private.filed_tache()` → demande `executee`.
- **L'écart.** a4_88 ne la compte plus dans « Imputation proposée », mais elle reste dans la file du valideur. La même demande est
  ouverte sur F13 (`ff6b0e60`).
- **Attendu** : les demandes liées à la facture sont annulées quand elle est refusée, ou rouvertes quand la reprise est proposée.

**TMOD-04 · CASHD · important · la relance revue au nouveau montant ne repasse pas les interdits**

- **Reproduction**, transaction annulée, en gérant `…01c2` :
  1. `cashd_regler_relances(client, '{"interdits":["simple oubli"]}')`, puis vérifier `interdits = {"simple oubli"}`.
  2. `cashd_noter_reglement(client, 'bb667935-…' [A-C26], 85, '2026-10-26', 'VIR-C26-0002', 'virement', 'cef4c4eb-…', null)`.
  3. Relance `6874a940` : `non_reglee`, 500 €, motif « montant revu … à valider de nouveau », corps qui contient « Il s'agit sans
     doute d'un simple oubli », nouvelle demande `en_attente`. Même chose sur A-C27 (`6faf6b59`).
- **L'écart.** Une relance neuve qui contient l'interdit est `bloquee` (S2-10). Le texte réécrit par c2_42 et c2_43 ne repasse pas
  le contrôle, contre `capacites/relances.ts:95`, attestée (« Vos règles de communication et vos interdits sont repris dans chaque
  message »).
- **Non vérifié** : le contrôle au moment de l'envoi (envoi non réglé sur le banc).

**TMOD-05 · CASHD · mineur · `cashd_noter_reglement` à 0 € répond une phrase à l'envers**

- **Reproduction** : en gérant, `cashd_noter_reglement(client, A-C26, 0, '2026-10-26', 'VIR-C26-ZERO', 'virement', FB-2026-0129, null)`.
- Réponse : `Le montant reçu est positif.` Attendu : « Le montant reçu doit être positif. »

**TMOD-06 · OFFLOAD · important · le message refusé reste « à valider »**

- **Reproduction**, transaction annulée :
  1. En valideur `…02c4` : `insert into approbations ('58c70ff3-…', …, 'rejete', 'T-MOD : attendre')`.
  2. `offload_tableau(client)` (gérant) : V1 reste dans `a_valider` (`statut a_valider`, demande `58c70ff3` pourtant `rejetee`),
     `compteurs.a_valider` = 5. Il en sort seulement quand la reprise passe `impossible`, après 24 h ; le compteur revient alors à 4.
  3. Second refus. Après une correction (contact) et la reprise proposée `b821397e`, en gérant :
     `insert into approbations ('b821397e-…', …, 'rejete', 'T-MOD : second refus…')`. Aucune reprise n'est créée, et le message
     reste **sans fin** dans `a_valider`. La reprise de compte dit « a_valider — Reprise après refus : message corrigé, à valider
     de nouveau ».
- **Attendu** : un message refusé sort de « à valider » dès le refus (« refusé, en attente de correction »). Après un second refus,
  la reprise de compte se clôt avec un motif.

**TMOD-07 · OFFLOAD · mineur · le résumé de la demande de reprise cite l'ancien contact**

- **Reproduction** : O-1. Demande `b821397e`, résumé « Reprise après refus — Message retenu … Courriel à **Contact fictif V1** : … »,
  alors que le message part à « Mme Fictive Nouvelle ».
- Le valideur lit un nom périmé.

**TMOD-08 · REPUT · important · après un second refus, la demande client reste « a_valider » sans rien à valider**

- **Reproduction**, transaction annulée, sur l'état réel après P-1 :
  1. En valideur `…02c3` : `insert into approbations ('40a3169f-…', …, 'rejete', 'T-MOD : second refus, toujours sans le nom')`.
  2. `private.reput_traiter_reprises()` : aucune ligne de reprise pour `40a3169f`.
  3. La réponse v2 est `refusee`, et `reput_demandes` `d336c126` reste `a_valider`, alors que plus aucune validation n'est en attente.
- **L'écart.** Le client n'aura pas de réponse, et rien ne dit à l'équipe de l'écrire. Le refus sans consigne dit bien « écrivez la
  réponse vous-même » : le second refus, lui, ne dit rien.
- **Attendu** : passer la demande « à traiter vous-même », avec la consigne du second refus.

**TMOD-09 · REPUT · mineur · « consigne suivie » alors qu'une partie de la consigne est ignorée**

- **Reproduction** : P-1, réel. Réponse `383158bd`, `raison` « Reprise après refus (consigne suivie) ». Le texte garde « Bonjour, »
  alors que la consigne demandait « Bonjour Madame Goyave ». Seule l'invitation finale est ajoutée.
- **Hypothèse.** La formule d'appel vient du gabarit, et le modèle n'écrit que le brouillon. Le système ne peut pas la suivre, mais
  il affiche quand même « consigne suivie ».
- **Attendu** : « consigne suivie en partie : la formule d'appel ne se règle pas ici », ou la formule d'appel ouverte au brouillon.

**TMOD-10 · REPUT · mineur · le motif d'un refus sans consigne propose un geste impossible**

- **Reproduction**, transaction annulée :
  1. Refus sans commentaire de `ffd90841` (valideur), puis `reput_traiter_reprises()`. Motif : « … ou refusez de nouveau en disant
     quoi corriger ».
  2. En gérant, nouveau refus commenté de la même demande → `Cette demande n'est plus en attente (rejetee).`
- **Attendu** : un motif qui ne propose que les gestes possibles, ou une porte pour donner la consigne après coup.

## Observations, sans écart

- **Une reprise au plus**, selon le module :
  - FILED, OFFLOAD et REPUT n'ouvrent pas de reprise pour le refus d'une demande de reprise ;
  - CASHD en ouvre une, qui finit `impossible`.

  Les quatre ne se comportent donc pas pareil. À trancher par le coordinateur.
- **Motifs FILED.**
  - Le motif à 24 h, « Aucune correction de la facture depuis le refus : même résultat qu'avant. », ne dit pas que le délai de 24 h
    est passé.
  - Une correction qui ne change rien répond `"refusee"` sans le signaler (F-7).
- **Ventilation non recalculée.** `filed_corriger_facture` ne recalcule pas la ventilation de TVA quand on corrige les totaux. Le
  contrôle le signale (`tva.ventilation`, attention), ce qui est juste. Le client doit passer la ventilation lui-même.
- **Coût des relectures.** Une relecture du lecteur (environ 0,03 €) part pour tout refus commenté, même quand la consigne ne porte
  pas sur la lecture (R1 de F3 : « demander une facture rectificative »).
- **Sujet des relances revues.** Les relances CASHD revues gardent leur sujet « rappel : facture … échue ». Le corps dit bien le
  reste dû.

## État laissé sur la recette (pour T-FILED, T-CASHD, T-REPUT, T-OFFLOAD)

| Pièce | État | Ce qu'il faut savoir |
|---|---|---|
| FILED F3 (`830baec5`) | `refusee`, corrigée (version 3 : TVA 66,30, TTC 846,30), reprise `impossible` (doublon probable avec F0) | ne se reprend plus par les portes (TMOD-01) |
| FILED F13 (`775e98e4`) | `refusee` depuis 17 h 56 Z par T-MOD L1, reprise `a_faire` | passera `impossible` le 27/10 vers 17 h 57 Z sans correction réelle ; les autres données de F13 sont intactes |
| REPUT `d336c126` | réponse v1 refusée ; réponse v2 (`383158bd`) `a_valider`, demande `40a3169f`, envoi `essai` `a_valider` | rien n'est parti |
| CASHD, OFFLOAD | aucune écriture : tous les cas sont annulés | — |

Aucun autre état n'a été modifié. Aucune donnée réelle n'a été utilisée : clients, contacts et pièces sont fictifs, et les adresses
sont en `.invalid` ou `exemple.test`.

---

## Contre-recette du 26/10 (18 h 44 à 18 h 56 Z)

**Lots rejoués**, posés sur la recette :

| Module | Lots | Branche, tête |
|---|---|---|
| FILED | a4_90 à a4_92 | worker-a4 `114f6fac` |
| CASHD | c2_44, c2_45 | worker-c2 `f31c0c7b` |
| OFFLOAD | c4_38 | worker-c4 `e8490963` |
| REPUT | c3_45 et reput-reponse v32 | worker-c3 `711f83f0` |

**Méthode** : les étapes d'origine de chaque écart, plus un ou deux cas de bord, avec les mêmes rôles et le même montage qu'à la
première passe. Tout s'est fait en transaction annulée, sauf un refus REPUT réel (voir l'état laissé, plus bas).

### État des écarts

| TMOD | Étapes d'origine | Cas de bord | État |
|---|---|---|---|
| 01 | `filed_pieces_en_cours` → `bloquees 14 / 8 363,42`, plus une catégorie **`refusees` « Refusées, à reprendre ou à classer » 2 / 992,78** (F3 et F13). Nouvelle porte `filed_factures_refusees` : F3 « À classer sans suite, ou à redéposer en facture rectificative. » ; F13 « À corriger pour sa reprise avant l'heure limite, sinon à classer sans suite. », avec `corriger_avant` 27/10 17 h 56 Z. `filed_classer_refusee(F3, motif)` → `classee_sans_suite` | sans motif → « Un classement sans suite se motive (5 caractères au moins). » ; deuxième classement → « déjà classée sans suite » ; F13 classée pendant sa reprise → reprise `impossible` « Classée sans suite par une personne. », correction refusée ensuite ; F0 comptabilisée → « Seule une facture refusée se classe sans suite » ; valideur → accepté ; membre inconnu → « Votre rôle ne permet pas ce geste » ; classées hors de la liste par défaut, visibles avec `p_avec_classees` | **corrigé** (détail : TMOD-12) |
| 02 | le valideur corrige F13 pendant sa reprise → demande de reprise `saisi_par = [valideur]` ; son approbation **et** son refus → « Celui qui a saisi la pièce ne l'approuve pas : une autre personne décide. » ; le gérant approuve → `approuvee` | le gérant corrige → c'est lui qui est exclu : « Vous avez corrigé cette facture pour sa reprise : une autre personne l'approuve. » | **corrigé** (conséquence : TMOD-11) |
| 03 | les demandes `filed.imputer` de F3 (`60251551`) et de F13 (`ff6b0e60`) sont `annulee` ; l'approbation → « Cette demande n'est plus en attente (annulee). » | reprise de F13 proposée → une nouvelle demande `filed.imputer` `en_attente` | **corrigé** |
| 04 | interdit « simple oubli », 85 € réglés sur A-C26 et A-C27 → relances `bloquee` 500 €, « montant revu à 500,00 €, mais le message contient un mot interdit par vos règles : « simple oubli » », aucune demande en attente | interdit retiré, puis 15 € de plus → la relance reste `bloquee` à 500 € (voir TMOD-13) | **corrigé** |
| 05 | 0 € → « Un règlement de 0 € ou moins ne se note pas : le montant reçu doit être supérieur à 0 €. » | −10 € → même phrase | **corrigé** |
| 06 | O-6 : juste après le refus, V1 n'est plus dans `a_valider`, compteur 4 ; reprise de compte `close` « Message refusé en validation (consigne : …) : OFFLOAD le repropose si la fiche ou les réglages … ». O-5 : second refus par le gérant → hors de `a_valider`, compteur 4, reprise `close`, `issue: refusee`, « Reprise refusée à son tour (consigne : …) : OFFLOAD n'en propose pas d'autre. » | O-1 rejoué en entier : correction du contact, puis reprise proposée | **corrigé** |
| 07 | O-1 : résumé « Reprise après refus — Essai — Courriel à Mme Fictive Nouvelle (au lieu de Contact fictif V1) : … » | — | **corrigé** |
| 08 | second refus de `40a3169f` → `reput_demandes` `d336c126` **`a_traiter`**, motif « Reprise refusée : écrivez la réponse vous-même. Consigne du refus : T-MOD : second refus, toujours sans le nom » | — | **corrigé** |
| 09 | rejoué **pour de bon** sur une autre réponse du banc (`bac63f11`, Marie Quenette, client fictif), consigne « commencez par « Bonjour Madame Quenette » et terminez en l'invitant à répondre à ce courriel … ». Reprise `proposee` en 43 s, demande `462c724e`, envoi `essai` `a_valider`. Raison : « consigne suivie en partie ; non suivi : La formule d'appel « Bonjour Madame Quenette » ne peut pas figurer dans le corps (elle est ajoutée par l'entreprise) et la civilité « Madame » n'a pas été écrite par la cliente ; l'invitation à répondre à ce courriel est suivie. … » ; le texte finit par « Vous pouvez répondre à ce courriel pour toute autre question. » | refus de la cliente, civilité non écrite : non appliquée, et c'est dit | **corrigé** (observation : raison longue, l'explication est donnée deux fois) |
| 10 | refus sans commentaire de `ffd90841` → « REPUT ne sait pas quoi corriger. Répondez au client vous-même ; au prochain refus, un commentaire suffit pour que REPUT propose une réponse corrigée » ; demande `a_traiter` | — | **corrigé** |

### CSV d'OFFLOAD : neutralisation des formules (c4_38)

Joué en transaction annulée. Des comptes et un achat sont saisis avec des valeurs piégées, puis lus par
`offload_restitution_tableur` (gérant).

| Valeur saisie | Champ | Dans le CSV | Verdict |
|---|---|---|---|
| `=HYPERLINK("http://x.invalid","clic")` | nom | `"'=HYPERLINK(""…"")"` | juste |
| `+33 1 99 00 00 00` | contact | `'+33 1 99 00 00 00` | juste |
| `-2+3` | secteur | `'-2+3` | juste |
| `@SUM(A1:A2)` | nom | `'@SUM(A1:A2)` | juste |
| tab puis `=1+1`, espace puis `=1+1` | nom, contact | `'=1+1` (l'espace de tête est retiré à la saisie) | juste |
| `=REF-1`, `@libellé` | référence et libellé d'achat | `'=REF-1`, `'@libellé` | juste |
| `＠SUM(1)`, `＝1+1`, `＋1`, `－1` (pleine chasse) | contact, nom, secteur | **inchangés** | **écart TMOD-14** |
| `-` seul | secteur | `'-` | juste, prudent (la donnée garde une apostrophe) |

### Tests rouges test_c2_01 et test_c2_08 : ce n'est pas l'effet de mes écritures

Joués un par un, en transaction annulée, avec `no_plan()` :

- **test_c2_01_donnees**, 4 échecs : « Trois comptes clients saisis » 10 au lieu de 3 ; tableau 27 418,80 / 35 818,80 / 7 au lieu
  de 15 600 / 24 000 / 2 ; « à imputer » 2 au lieu de 1 ; collaborateur 10 au lieu de 3.
- **test_c2_08_portefeuille**, 5 échecs : 10 au lieu de 3 (trois fois), 9 au lieu de 2, 8 au lieu de 3.

**La cause.** Il y a **7 comptes CASHD** de plus sur le client du banc principal `cccccccc-…000c`, « Groupe Sogexal (banc) », tous
importés le **21/10 à 19 h 05 m 27 s Z**. Le test ajoute ses 3 comptes à ce même client, d'où 10.

**Pourquoi ce ne sont pas mes écritures.** Celles du 26/10 n'ont créé aucun compte CASHD et ne touchent pas ce client :

- F3 et F13 sont sur le client `…00f1` ;
- les réponses REPUT sont sur le client `…00c3` ;
- tous mes cas CASHD étaient en transaction annulée.

C2 parle du « jeu NOBAT ». Les comptes en cause portent l'entité « Groupe Sogexal (banc) » et datent du 21/10 : c'est un défaut des
deux tests, qui supposent ce client vide de CASHD. Ce n'est pas un défaut du produit.

### Nouveaux écarts

**TMOD-11 · FILED · important (à trancher par Teo) · le gérant qui corrige une facture pour sa reprise ne peut plus l'approuver**

- **Reproduction**, transaction annulée :
  1. F13 refusée, reprise `a_faire` reculée de 10 min.
  2. En gérant `…01f1` : `filed_corriger_facture(F13, '{"montant_ht":121.50,"montant_tva":10.33,"montant_ttc":131.83,"net_a_payer":131.83}', …)`.
  3. `private.filed_traiter_reprises()` → demande de reprise `saisi_par = [gérant]`.
  4. En gérant : `insert into approbations (…, 'approuve', …)` → `Vous avez corrigé cette facture pour sa reprise : une autre
     personne l'approuve.`
- **Pourquoi c'est un écart.** Le lot respecte `capacites/factures.ts:74`. Mais la décision de Teo sur TFILED-12 dit « un gérant
  décide seul ; une organisation qui veut deux personnes pose un seuil ». Chez un client à un seul décideur (l'artisan seul), une
  facture corrigée pour sa reprise ne peut plus être approuvée par personne : elle attendra sans fin.
- **À trancher** : le gérant seul décideur approuve sa correction (comme pour un dépôt), ou bien la reprise le dit et propose une
  délégation.

**TMOD-12 · FILED · mineur · `filed_factures_refusees.refusee_le` donne l'heure de pose du lot, pas l'heure du refus**

- **Reproduction** : en gérant, `filed_factures_refusees('dddddddd-…00f1', null, false)`.
  - F3 : `refusee_le` 26/10 à 18 h 38 m 48 s Z. Le refus date de 00 h 53 Z (piste : « Refusée par une personne », 00 h 53 m 00 s).
  - F13 : `refusee_le` 18 h 38 m 48 s Z, pour un refus à 17 h 57 m 00 s Z.
- **Hypothèse** : le rattrapage de a4_90 a daté les factures déjà refusées de sa pose. Les refus à venir sont peut-être justes.
  Je n'ai pas pu le vérifier sans refuser une nouvelle facture, faute de demande en attente sur le banc.

**TMOD-13 · CASHD · mineur · une relance bloquée par un interdit ne suit plus le reste dû, même après la levée de l'interdit**

- **Reproduction**, transaction annulée, en gérant :
  1. Interdit « simple oubli », puis 85 € réglés sur A-C26 → relance `bloquee` à 500 € (juste).
  2. `cashd_regler_relances(client, '{"interdits":[]}')`, puis 15 € de plus réglés (`VIR-C26-0003`).
  3. `cashd_preparer_maintenant`, puis `private.cashd_preparer_relances(client, '2026-10-27', null)` → `preparees 0`.
  4. La relance reste `bloquee` à **500 €** pour 485 € dus, avec le motif de l'interdit levé.
- **Attendu** : la relance bloquée suit le reste dû comme une relance en attente (c2_43), ou se refait une fois l'interdit retiré.

**TMOD-14 · OFFLOAD · mineur · les signes de formule en pleine chasse ne sont pas neutralisés dans les CSV**

- **Reproduction**, transaction annulée :
  1. `offload_saisir_compte(client, entité, 'TMOD-F3', '＝1+1', {"contact":"＋1","secteur":"－1",…})` et
     `offload_saisir_compte(…, 'TMOD-F2', …, {"contact":"＠SUM(1)",…})`.
  2. `offload_restitution_tableur(client)->'fichiers'->>'offload-comptes.csv'` : les quatre valeurs sortent sans apostrophe.
- **Pourquoi c'est un écart.** Certaines versions d'Excel, avec des réglages de saisie asiatiques, convertissent les signes en pleine
  chasse. C'est le cas demandé par le coordinateur (`＠`).
- **Attendu** : traiter `＝ ＋ － ＠` comme `= + - @`.

### État laissé sur la recette après la contre-recette

| Pièce | État | Ce qu'il faut savoir |
|---|---|---|
| REPUT `bac63f11` (Marie Quenette, demande `702de13f`), réel | réponse refusée par T-MOD TMOD-09 à 18 h 54 Z ; nouvelle réponse `a_valider`, demande `462c724e`, envoi `essai` `a_valider` | rien n'est parti |
| FILED F3, F13 | inchangés par moi : F3 `refusee`, reprise `impossible` ; F13 `refusee`, reprise `a_faire` jusqu'au 27/10 17 h 56 Z | a4_91 a annulé leurs demandes d'imputation ; les deux sont dans « Refusées, à reprendre ou à classer » ; aucune n'a été classée pour de bon |
| CASHD, OFFLOAD | rien | tous les cas sont annulés |

Aucun envoi réel. Aucune donnée réelle.
