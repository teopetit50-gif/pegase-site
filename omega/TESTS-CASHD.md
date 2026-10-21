# T-CASHD — tests en boîte noire du moteur CASHD (relances des impayés)

Brief posé par la session bureau de Teo, 21/10/2026. Contrat : `omega/CONTRAT-TESTEUR.md`.
Branche : `testeur-cashd`. Client banc : `banc-test-cashd` (créé par le coordinateur).

## Ce que tu lis

- Promesses : `lib/produits/capacites/relances.ts` (catalogue, cas limites, échelle) et
  `lib/produits/relances.ts` (la page). Les paliers (rappel, relance ferme, mise en demeure ;
  devis), ce qui suspend, ce qui coupe, « un message par compte et par jour », « rien ne part
  sans validation » : tout y est.
- Écran : `app/espace2/cashd` sur la recette (débiteurs, relances, envois, trésorerie).
- Banc de l'ouvrier, pour savoir comment les factures entrent : `omega/recette-c2/banc_cashd.sql`
  et, sur `worker-c2`, `omega/banc/cashd_*.sql` (fichiers de banc seulement).

**CASHD ne lit pas de PDF.** Il prend un **export du logiciel de facturation** (factures émises,
échéances, règlements), déposé par la porte d'import. Ton jeu d'essai est donc un fichier de
données (SQL ou export), pas des pièces.

Attention : l'ouvrier C2 fabrique de son côté, ce même jour, un jeu d'essai « façon NOBAT »
(1 juste + 5 fautives). Tu ne le lis pas et tu ne l'attends pas : tu fais le tien. Si vos deux
jeux trouvent des choses différentes, c'est justement l'intérêt.

## Le jeu d'essai de départ

Le client banc est un **négoce de matériaux BTP en Guadeloupe** qui facture des entreprises
**fictives** (TVA 8,5 % / 2,1 % / exonérée, octroi de mer, chantier nommé). Six à douze
factures sur le même gabarit ; seule l'erreur change.

| Cas | Erreur volontaire | Ce que le site promet (à vérifier dans `relances.ts`) |
|---|---|---|
| C0 | aucune — le témoin, échue depuis 8 jours | rappel palier 1 préparé, **à valider**, rien d'envoyé |
| C1 | numéro de facture en doublon avec C0 | signalé ; une seule créance, pas deux relances |
| C2 | total ≠ somme des lignes | signalé ; pas de relance sur un montant faux |
| C3 | échéance antérieure à la date d'émission | signalé ; palier calculé sur une base saine ou facture retenue |
| C4 | client sans adresse de relance | suspendue « pas d'adresse », visible à l'écran |
| C5 | règlement partiel reçu, non lettré | pas de relance tant que le règlement n'est pas lettré ; reste dû juste après lettrage |
| C6 | avoir qui vise une facture inconnue | retenu, signalé, jamais imputé au hasard |
| C7 | même règlement importé deux fois | un seul règlement, pas de « trop-perçu » fantôme |
| C8 | compte passé en litige **entre** deux paliers | la relance en attente passe `annulée`, aucune suivante |
| C9 | devis accepté puis facturé | relance de devis coupée, la facture suit son propre cycle |
| C10 | facture réglée mais toujours présente dans l'export suivant | coupée, aucune relance |
| C11 | reste dû sous le seuil réglé | suspendue, pas de relance pour 3 € |
| C12 | deux factures du même compte échues le même jour | **un** message, qui porte les deux |
| C13 | facture échue depuis 35 jours, jamais relancée avant | aucun palier sauté : rappel d'abord, puis ferme, cinq jours d'écart au moins |

Après la série : rejoue l'import **à l'identique**. Attendu : zéro doublon, zéro nouvelle relance.

Puis le passage du lendemain (le coordinateur te dit comment déclencher « le matin » sans
attendre 7 h Paris) : la relance ferme remplace le rappel encore en attente, « un message par
compte et par jour » tient, la mise en demeure exige un commentaire.

Deuxième série : les textes (ton, vocabulaire du bâtiment, moyens de règlement, échéancier
proposé), lus à l'écran sur chaque relance préparée : sont-ils ceux que la page promet ?

## Niveau 2 (plus tard)

Un premier export réel (logiciel de facturation d'un client pilote), avec le coordinateur.
Pas avant.

## Résultats

Série 1 **J jouée (import, rejeu, matin, litige, seuil, lettrage)** ; J+1 en attente. Réponses brutes : `omega/testeur-cashd/serie1_reponses.md`.
Série 1 préparée : jeu d'essai dans `omega/testeur-cashd/` (export fictif, J = 2026-10-21).
Attendus notés **avant** de jouer. « R » = `lib/produits/relances.ts`, « C » = `lib/produits/capacites/relances.ts`.

| Cas | Promesse (fichier:ligne) | Erreur volontaire | Attendu | Ce que CASHD a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| C0 | R:211 (J+7 rappel), R:186, R:453 | aucune — FB-2026-0100, échue 13/10 (8 j) | rappel palier 1 préparé, en file de validation, rien d'envoyé | rappel préparé, `en_attente` de validation, `envoi_id` null, motif « envoi pas encore réglé » | juste | 1 |
| C1 | C:52-53 (une séquence par facture) — *pas de ligne explicite sur le doublon* | n° FB-2026-0100 repris sur un autre compte | doublon signalé, pas deux créances sous un même n° relancées sans bruit | import : ligne écartée, motif « numéro déjà porté par la pièce du compte A-C00 », la pièce existante est gardée ; rejeu idem | juste (à l'import ; écran à voir) | 1 |
| C2 | C:34, C:50 (montant repris) — *le site ne parle pas des lignes* | total TTC 1 185 ≠ lignes 1 085 | signalé, pas de relance sur un montant faux | import accepté sans motif ; **aucune relance préparée et aucun motif** (fiche : actif, ouverte, relançable 1 185) | écart (TCASHD-02 : retenue juste mais muette) | 1 |
| C3 | R:210-211 — *pas de ligne explicite* | échéance 05/09 < émission 05/10 | signalée ou retenue, palier pas calculé sur une date absurde | import : ligne écartée, motif « échéance antérieure à l'émission » | juste | 1 |
| C4 | *aucune ligne du site* ; banc ouvrier : « marquée sans adresse » | e-mail de facturation vide | relance suspendue « pas d'adresse », visible à l'écran | relance `sans_adresse`, motif « le compte n'a pas d'adresse de facturation : relancez-le vous-même ou complétez sa fiche » | juste (écran : en attente du compte) | 1 |
| C5 | C:78-79, C:146 (virement sans référence ⇒ séquence suspendue) | 500 € reçus sans référence de facture | pas de relance tant que non lettré ; après lettrage J+1, reste dû 585,00 | avant lettrage : aucune relance, mais aucun motif visible (compte `actif`) ; après `cashd_lettrer` : reste 585, rappel 585,00 € préparé | juste (suspension muette, voir TCASHD-04) | 1 |
| C6 | C:82 | avoir −200 € visant FB-2026-0999 (inconnue) | avoir retenu, signalé, jamais imputé à FB-2026-0106 | pas imputé en fiche (`avoirs_imputes` 0) — mais la relance de FB-2026-0106 réclame **885,00 €** : les 200 € de l'avoir orphelin sont déduits ; l'avoir lui-même `ouverte`, relançable 200 | écart (TCASHD-03) | 1 |
| C7 | C:77-79 | règlement VIR-C07-001 (300 €) deux fois dans l'export | un seul règlement, reste dû 785,00, aucun trop-perçu | 2ᵉ ligne « inchangée » ; réglé 300, reste 785 | juste | 1 |
| C8 | C:62, C:65, R:188 (« coupe même ce qui est déjà prêt ») | compte mis en litige après préparation du rappel | rappel en attente ⇒ annulé ; aucune relance suivante | `cashd_litige` → `relances_coupees 1` ; rappel `coupee`, demande `annulee`, motif « en litige : … » ; rien de neuf aux préparations suivantes | juste (J+1 à confirmer) | 1 |
| C9 | R:223 (devis J+3/J+7), C:166 | devis DV-2026-0009 (7 j) accepté et facturé FB-2026-0109 le 20/10 | relance de devis coupée ; facture non échue ⇒ rien | porte `cashd_importer(…,'devis',…)` : DV-2026-0009 (14/10, `en_attente`) → `creees 1` ; préparation → `devis_rappel` « Nous vous avons adressé le devis suivant … », `en_attente`. Réimport `statut accepte` → `modifiees 1, relances_coupees 1` ; relance `coupee`, `annulee`, motif « avant l'envoi : facture DV-2026-0009 : devis accepte ». FB-2026-0109 (non échue) : rien | juste (motif dit « facture » pour un devis : mot à revoir, pas un écart) | 1 |
| C10 | R:267, C:36, C:125-126 | réglée la veille (1 085 €), toujours dans l'export de J+1 | coupée, aucune relance, ni à J ni à J+1 | soldée « réglée (lettrage) », aucune relance à J | juste (J+1 à faire) | 1 |
| C11 | C:149-150 | reste dû 3,00 € | sort du cycle automatique, reste visible dans l'encours | seuil 10 € posé ⇒ rappel 3 € `coupee` — motif **« facture FB-2026-0111 réglée ou sortie de l'export »** | écart (TCASHD-05, motif faux) | 1 |
| C12 | *aucune ligne du site* ; C:53 dit « chaque facture suit sa propre séquence » | deux factures du même compte échues le 13/10 | brief : **un** message portant les deux — à confronter à C:53 | **un** message, 2 pièces, chacune avec son palier ; montant 1 627,50 € | juste (site C:53 et brief tous deux tenus) | 1 |
| C13 | R:207-222, R:354 (J+7 / J+21 / J+30) | échue depuis 35 j, jamais relancée | aucun palier sauté : rappel d'abord (pas de MED d'emblée) | J : `rappel` (35 j). J+1 : rien. J+6 : `relance` (ferme) préparée, le rappel de J (jamais validé ni envoyé) passe `coupee` « remplacée par la relance du 27/10/2026 ». La ferme dit **« Malgré notre précédent rappel »** | écart (TCASHD-06) : écart de 6 j tenu, mais le rappel n'est jamais parti | 1 |
| R1 | C:33, R:267 | rejeu à l'identique de tout l'export | zéro doublon, zéro nouvelle relance | aucune création ; factures 14 et règlements 5 « inchangés » ; mais clients **14 « modifiés »** sur données identiques | juste (doublons) + écart mineur TCASHD-01 ; relances à voir | 1 |
| J+1 | R:211-216, R:187, R:453 | passage du lendemain | ferme remplace le rappel en attente ; un message par compte et par jour ; MED exige validation explicite | 22/10 : `{preparees 0, bloquees 0, coupees 0}` — aucun doublon, aucune ferme à 1 j du rappel. 27/10 : `{preparees 1}` (ferme C13 qui remplace le rappel en attente) ; C0 C5 C6 C7 C12 (14 j de retard) restent au rappel du 21/10, en attente. Mise en demeure : pas encore atteinte | juste (un message par compte et par jour ; remplacement) ; MED à faire | 1 |

Notes de lecture (avant de jouer) :
- « Un message par compte et par jour », « cinq jours d'écart au moins » (C13) et « suspendue pas d'adresse » (C4)
  sont dans le brief mais **pas sur le site**. Je les teste comme le brief les pose, en le signalant.
- C12 : le brief (un message pour deux factures) et C:53 (une séquence par facture) peuvent se contredire.
- La porte que montre le banc de l'ouvrier (`cashd_ecrire_facture`) ne prend qu'un `montant_ttc` : sans lignes,
  C2 risque d'être **pas couvert** par construction ; sans nature « avoir » ni lettrage, idem C5 et C6.

## Écarts

Reproduction commune : `omega/testeur-cashd/serie1_import.sql` joué sur la recette (client `dddddddd-…-0000000000c2`),
puis `select to_jsonb(e) from public.cashd_factures_etat e where client_id = '<client>'`.

- **TCASHD-01** · R1 · rejouer `serie1_import.sql` tel quel · réponse `clients : creees 0, modifiees 14, inchangees 0`
  alors que rien n'a changé (factures et règlements, eux, répondent `inchangees`). Bruit : un rapport d'import qui annonce
  14 modifications fausses masque une vraie modification. Écran : non vu.
- **TCASHD-02** · C2 · *(reformulé le 21/10 après vérification du coordinateur : la marque d'incohérence existe en base)*.
  Ligne importée exacte (jeu `factures`, `serie1_import.sql`) :
  `{"numero":"FB-2026-0102","compte_ref":"A-C02","date_emission":"2026-09-13","echeance":"2026-10-13","montant_ht":1000,"montant_ttc":1185,"reste_du":1185,"commande_ref":"Chantier : École de Dothémare","lignes":[{"article":"Fer à béton HA10 x200","quantite":1,"prix_ht":1000,"montant_ht":1000,"tva":8.5},{"article":"Octroi de mer et OMR","mention":"inclus dans les prix unitaires"}]}`
  (pas de champ TVA total : HT 1000, TTC 1185, une ligne 1000 HT à 8,5 %).
  **L'écart : la marque n'est visible par aucune porte du client.** Réponse brute de `cashd_importer` : `creees 14, ecartees`
  = seulement C1 et C3, **rien sur FB-2026-0102**. `cashd_fiche_compte('5c06e06e-…')` : pièce `ouverte`, `statut_motif`
  null, `reste_relancable` 1185, compte `actif`. `cashd_relances_du_jour(client,'2026-10-21')` : **aucune ligne** pour
  A-C02 (ni préparée, ni bloquée, ni coupée). Le moteur retient bien la facture (pas de relance sur un montant faux :
  ça, c'est juste), mais en silence : le client ne voit ni l'incohérence ni la retenue. Écran : en attente du compte.
- **TCASHD-03** · C6 · ligne importée exacte (jeu `factures`) :
  `{"numero":"AV-2026-0006","compte_ref":"A-C06","date_emission":"2026-10-10","montant_ht":-184.33,"montant_ttc":-200,"reste_du":-200,"commande_ref":"Chantier : Résidence Gosier — avoir sur FB-2026-0999","lignes":[{"article":"Retour marchandise","quantite":1,"prix_ht":-184.33,"montant_ht":-184.33,"tva":8.5},{"article":"Octroi de mer et OMR","mention":"inclus dans les prix unitaires"}]}`
  (aucun champ `nature` : c'est le moteur qui l'a reconnue comme avoir ; pas d'échéance ; TVA implicite 15,67).
  Réponse :
  reconnue `nature = avoir` mais rangée `ouverte`, `reste_du` **+200**, `reste_relancable` **200**, aucun signalement.
  Un avoir (somme due AU client) apparaît comme une créance relançable. Non imputé à FB-2026-0106 : ça, c'est juste.
  NB : l'import ne porte aucun champ « facture visée » ; la référence n'est que dans `commande_ref`.
  **Aggravé au passage du matin** : la relance du compte A-C06 réclame « FB-2026-0106 … 1 085,00 € TTC … : **885,00 €**
  restant dus ». Les 200 € de l'avoir orphelin sont déduits de FB-2026-0106 dans le montant réclamé, alors que la fiche
  dit `avoirs_imputes` 0 et `reste_relancable` 1 085. Imputation de fait, au hasard, et deux chiffres contradictoires.
- **TCASHD-04** · C5 (C2 : voir TCASHD-02) · lignes importées exactes : facture
  `{"numero":"FB-2026-0105","compte_ref":"A-C05","date_emission":"2026-09-13","echeance":"2026-10-13","montant_ht":1000,"montant_ttc":1085,"reste_du":1085,"commande_ref":"Chantier : Villa Sainte-Anne","lignes":[…une ligne 1000 HT à 8,5 %…]}`
  et règlement (jeu `reglements`) `{"date":"2026-10-18","montant":500,"mode":"VIR","compte_ref":"A-C05","reference":"VIR-C05-0001","libelle":"VIR SARL CARRELAGE PARTIEL"}`
  (réponse import : `lettrees 3` sur 5, celui-ci non lettré ; fiche : `a_imputer 500`, `facture_citee` null). Après le passage de J, `cashd_relances_du_jour(client,'2026-10-21')` ne contient aucune
  ligne pour A-C02 ni A-C05, et `cashd_fiche_compte` des deux comptes ne donne aucun motif (`statut actif`,
  `statut_motif` null, pièce `ouverte`). La retenue est peut-être voulue, mais le client ne peut pas savoir pourquoi la
  facture n'est pas relancée (C2 : total faux ? C5 : règlement à imputer ?). Écran : en attente du compte.
- **TCASHD-05** · C11 · lignes importées : FB-2026-0111 (1085 TTC, échue 13/10) et règlement
  `{"date":"2026-10-15","montant":1082,"mode":"CHQ","compte_ref":"A-C11","reference":"CHQ-0004521","libelle":"CHQ FB-2026-0111"}`
  (lettré à l'import : reste 3,00). Rappel de 3,00 € préparé à J (`en_attente`). Puis, en gérant `eeeeeeee-…-0000000001c2` :
  `cashd_regler_entite('f2e7e4fc-0b0c-4b8f-8ea5-1800439408ca', 10)` puis `cashd_preparer_maintenant`
  → rappel A-C11 (3,00 €) `coupee`, motif « avant l'envoi : facture FB-2026-0111 réglée ou sortie de l'export ».
  Faux : elle n'est ni réglée ni sortie, elle est sous le seuil. Le site (C:149-150) promet que ces soldes « restent
  visibles dans l'encours, et vous décidez de les abandonner ou de les réclamer » : un motif « réglée » pousse à l'oubli.
- **TCASHD-06** · C13 · facture FB-2026-0114 (émise 17/08, échue 16/09, 1085 TTC, jamais relancée). Passage du 21/10
  (coordinateur) → rappel préparé, `en_attente`, `envoye_le` null, **jamais validé ni envoyé**. Passage du 27/10
  (`private.cashd_preparer_relances(client,'2026-10-27',null)` → `{preparees 1}`) → `cashd_relances_du_jour(client,'2026-10-27')` :
  palier `relance`, sujet « relance : 1 085,00 € restent dus », corps « **Malgré notre précédent rappel**, la somme suivante
  reste impayée … au plus tard le 04/11/2026 … indemnité forfaitaire … 40,00 € … (art. L441-10) ». Et le rappel du 21/10
  passe `coupee`, demande `annulee`, motif « remplacée par la relance du 27/10/2026 ».
  Conséquence : le premier message que le débiteur recevrait est la relance ferme, qui affirme un rappel qu'il n'a
  jamais reçu. Le palier « rappel courtois » (R:211) est sauté de fait ; le texte est inexact. Attendu (brief C13, R:207-222) :
  tant que le rappel n'est pas parti, la ferme ne le remplace pas — ou alors elle ne cite pas de « précédent rappel ».

## Questions au coordinateur

00. (21/10, J+6) **Mise en demeure** : pour C13, jouer `private.cashd_preparer_relances(client,'2026-11-03',null)` ?
   Et quelle porte pour **valider** une relance (en valideur `eeeeeeee-…-0000000002c2`), afin de vérifier que la MED exige
   un commentaire (R:187, R:453) ?
0. (21/10, après J) **Porte devis** : `cashd_importer` refuse `nature devis` ; par où entre un devis (C9, R:223) ?
   **Passages à jouer pour moi** : `private.cashd_preparer_relances(client, '2026-10-22', null)` puis `'2026-10-27'`
   (J+1 et J+6 : rejeu, cadence rappel → ferme, écart de 5 j sur C13, un message par compte et par jour).
   C12 : brief et site divergent, je teste contre le site (C:53) comme demandé — les deux sont tenus ici.
1. L'**identifiant** (`clients.id`) de `banc-test-cashd`, et confirmation qu'il est en mode `essai` ou `coupe`.
2. La **porte d'import** et le format exact qu'elle attend (export fichier ? ou les portes RPC
   `cashd_ecrire_compte` / `cashd_ecrire_facture` / `cashd_noter_reglement` vues dans le banc de l'ouvrier ?).
   Prend-elle des **lignes**, des **avoirs** (avec facture visée), des **devis** (et leur acceptation), un **lettrage** ?
3. Comment déclencher **le passage du matin** à une date donnée (J puis J+1) — le banc ouvrier cite
   `private.cashd_preparer_relances(client, date, null)` : ai-je le droit de l'appeler ?
4. Les portes pour **mettre un compte en litige** (C8) et pour **régler le seuil** (C11).
5. Les **portes de lecture** à utiliser (état des factures, relances préparées, signalements).
6. Un compte « gérant » du client banc pour lire `app/espace2/cashd` sur la recette.

## REPRISE

- Fait : contrat, brief, promesses (R, C), banc ouvrier `banc_cashd.sql` et `cashd_omega.sql` lus ; jeu série 1 écrit
  (`omega/testeur-cashd/`), attendus notés.
- En cours : J, J+1, J+6 lus (TCASHD-06) ; C9 joué (juste). J complet. Justes : C0 C1 C3 C4 C5 C7 C8 C10 C12 C13. Écarts TCASHD-01 à 05. Attente : passage du 03/11 (MED) et porte de validation.
- Prochain pas : rejouer l'export avant J+1 (C10 encore présente), lire J+1 et J+6, puis valider une mise en demeure (commentaire exigé), puis série 2 (textes).
- Questions : 1, 2, 4 (litige) répondues le 21/10 ; restent 3 (passage du matin, joué par le coordinateur), 4 (seuil), 5 (porte de lecture des relances), 6 (compte gérant, au bureau).
- Note : pour le format, j'ai lu les appels `cashd_importer` de `cashd_nobat.sql` (autorisé par le coordinateur) ; deux commentaires de ce fichier citent des issues attendues (avoir, échéance) — vu malgré moi, signalé.
- SHA d'arrêt : voir le dernier commit de `testeur-cashd` (« … jour J, tableau »).
