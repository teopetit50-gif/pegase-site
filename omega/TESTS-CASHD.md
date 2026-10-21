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

Série 1 **import joué (J + rejeu), passage du matin en attente**. Réponses brutes : `omega/testeur-cashd/serie1_reponses.md`.
Série 1 préparée : jeu d'essai dans `omega/testeur-cashd/` (export fictif, J = 2026-10-21).
Attendus notés **avant** de jouer. « R » = `lib/produits/relances.ts`, « C » = `lib/produits/capacites/relances.ts`.

| Cas | Promesse (fichier:ligne) | Erreur volontaire | Attendu | Ce que CASHD a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| C0 | R:211 (J+7 rappel), R:186, R:453 | aucune — FB-2026-0100, échue 13/10 (8 j) | rappel palier 1 préparé, en file de validation, rien d'envoyé | — | à jouer | 1 |
| C1 | C:52-53 (une séquence par facture) — *pas de ligne explicite sur le doublon* | n° FB-2026-0100 repris sur un autre compte | doublon signalé, pas deux créances sous un même n° relancées sans bruit | import : ligne écartée, motif « numéro déjà porté par la pièce du compte A-C00 », la pièce existante est gardée ; rejeu idem | juste (à l'import ; écran à voir) | 1 |
| C2 | C:34, C:50 (montant repris) — *le site ne parle pas des lignes* | total TTC 1 185 ≠ lignes 1 085 | signalé, pas de relance sur un montant faux | import accepté sans motif ; `reste_relancable` 1 185 | écart (TCASHD-02), relance à voir | 1 |
| C3 | R:210-211 — *pas de ligne explicite* | échéance 05/09 < émission 05/10 | signalée ou retenue, palier pas calculé sur une date absurde | import : ligne écartée, motif « échéance antérieure à l'émission » | juste | 1 |
| C4 | *aucune ligne du site* ; banc ouvrier : « marquée sans adresse » | e-mail de facturation vide | relance suspendue « pas d'adresse », visible à l'écran | — | à jouer | 1 |
| C5 | C:78-79, C:146 (virement sans référence ⇒ séquence suspendue) | 500 € reçus sans référence de facture | pas de relance tant que non lettré ; après lettrage J+1, reste dû 585,00 | — | à jouer | 1 |
| C6 | C:82 | avoir −200 € visant FB-2026-0999 (inconnue) | avoir retenu, signalé, jamais imputé à FB-2026-0106 | pas imputé (`avoirs_imputes` 0) — mais l'avoir est créé `ouverte`, `reste_relancable` **+200**, aucun signalement | écart (TCASHD-03) | 1 |
| C7 | C:77-79 | règlement VIR-C07-001 (300 €) deux fois dans l'export | un seul règlement, reste dû 785,00, aucun trop-perçu | 2ᵉ ligne « inchangée » ; réglé 300, reste 785 | juste | 1 |
| C8 | C:62, C:65, R:188 (« coupe même ce qui est déjà prêt ») | compte mis en litige après préparation du rappel | rappel en attente ⇒ annulé ; aucune relance suivante | — | à jouer | 1 |
| C9 | R:223 (devis J+3/J+7), C:166 | devis DV-2026-0009 (7 j) accepté et facturé FB-2026-0109 le 20/10 | relance de devis coupée ; facture non échue ⇒ rien | — | à jouer | 1 |
| C10 | R:267, C:36, C:125-126 | réglée la veille (1 085 €), toujours dans l'export de J+1 | coupée, aucune relance, ni à J ni à J+1 | — | à jouer | 1 |
| C11 | C:149-150 | reste dû 3,00 € | sort du cycle automatique, reste visible dans l'encours | — | à jouer | 1 |
| C12 | *aucune ligne du site* ; C:53 dit « chaque facture suit sa propre séquence » | deux factures du même compte échues le 13/10 | brief : **un** message portant les deux — à confronter à C:53 | — | à jouer | 1 |
| C13 | R:207-222, R:354 (J+7 / J+21 / J+30) | échue depuis 35 j, jamais relancée | aucun palier sauté : rappel d'abord (pas de MED d'emblée) | — | à jouer | 1 |
| R1 | C:33, R:267 | rejeu à l'identique de tout l'export | zéro doublon, zéro nouvelle relance | aucune création ; factures 14 et règlements 5 « inchangés » ; mais clients **14 « modifiés »** sur données identiques | juste (doublons) + écart mineur TCASHD-01 ; relances à voir | 1 |
| J+1 | R:211-216, R:187, R:453 | passage du lendemain | ferme remplace le rappel en attente ; un message par compte et par jour ; MED exige validation explicite | — | à jouer | 1 |

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
- **TCASHD-02** · C2 · facture `FB-2026-0102`, `montant_ht` 1000, une ligne 1000 HT à 8,5 %, `montant_ttc` **1185** ·
  réponse : créée sans motif, `reste_relancable` 1185. Le total faux n'est pas signalé (il ne l'est ni sur la ligne, ni
  sur HT × TVA). Écran : non vu.
- **TCASHD-03** · C6 · pièce `AV-2026-0006`, `montant_ttc` −200, `commande_ref` « avoir sur FB-2026-0999 » · réponse :
  reconnue `nature = avoir` mais rangée `ouverte`, `reste_du` **+200**, `reste_relancable` **200**, aucun signalement.
  Un avoir (somme due AU client) apparaît comme une créance relançable. Non imputé à FB-2026-0106 : ça, c'est juste.
  NB : l'import ne porte aucun champ « facture visée » ; la référence n'est que dans `commande_ref`.

## Questions au coordinateur

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
- En cours : import J + rejeu faits (C1, C3, C7 justes ; TCASHD-01 à 03). Attente : passage du matin J par le coordinateur.
- Prochain pas : lire les relances de J (C0, C2, C4, C5, C11, C12, C13), puis `cashd_litige` sur FB-2026-0108 (C8), puis J+1.
- Questions : 1, 2, 4 (litige) répondues le 21/10 ; restent 3 (passage du matin, joué par le coordinateur), 4 (seuil), 5 (porte de lecture des relances), 6 (compte gérant, au bureau).
- Note : pour le format, j'ai lu les appels `cashd_importer` de `cashd_nobat.sql` (autorisé par le coordinateur) ; deux commentaires de ce fichier citent des issues attendues (avoir, échéance) — vu malgré moi, signalé.
- SHA d'arrêt : voir le commit « T-CASHD série 1 préparée ».
