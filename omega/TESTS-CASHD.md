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
| J+1 | R:211-216, R:187, R:453 | passage du lendemain | ferme remplace le rappel en attente ; un message par compte et par jour ; MED exige validation explicite | 22/10 : rien. 27/10 : ferme C13 qui remplace le rappel en attente. 03/11 : ferme (`relance`) à 21 j pour C0 C4 C5 C6 C7 C12 (C12 : 1 message, 2 pièces), MED préparée pour C13 (48 j, 7 j après la ferme), `en_attente`. Toutes disent « Malgré notre précédent rappel » sans qu'aucun rappel soit parti. **MED approuvée par le valideur sans commentaire** : acceptée, demande `approuvee` | juste (cadence, un message par compte et par jour) ; écarts TCASHD-06 (élargi) et **TCASHD-07** | 1 |
| S2-1 | R:169 « Le ton suit le montant et l'ancienneté du retard », R:273 | rappels de 3,00 € (C11), 1 085 € à 8 j (C0), 1 085 € à 35 j (C13), 1 627,50 € (C12) | ton différent selon montant et ancienneté | **corps identique** mot pour mot (seuls n°, dates, montants changent) | écart (TCASHD-08) | 1 |
| S2-2 | C:49, R:213-221 (fermeté suit le palier) | rappel / ferme / MED de C13 | trois tons distincts, ferme récapitule et fixe une échéance | rappel « simple oubli » ; ferme « Malgré… Total restant dû… au plus tard le 11/11/2026 » + indemnité 40 € ; MED « mettons en demeure… 8 jours… procédure de recouvrement » | juste | 1 |
| S2-3 | C:50 « secteur du compte, sa référence, son montant et son retard » | tous les textes | secteur + référence + montant + retard | référence (compte et facture), montant, retard : oui. **Secteur : jamais** (fiche `secteur` null, l'import n'a pas de clé secteur). **Chantier** (`commande_ref`) jamais cité | écart (TCASHD-09) | 1 |
| S2-4 | R:421 « le vouvoiement est constant » | tous les textes | vouvoiement | « Madame, Monsieur », « vous », partout | juste | 1 |
| S2-5 | brief : vocabulaire du bâtiment | tous les textes | chantier, livraison, situation de travaux… | aucun mot du métier ; gabarit générique | pas couvert (le site ne le promet pas en ces mots ; voir S2-3) | 1 |
| S2-6 | brief : moyens de règlement ; C:84 (lien de paiement) | tous les textes | IBAN, virement, chèque ou lien | **aucun moyen de règlement** dans aucun palier | pas couvert | 1 |
| S2-7 | brief : échéancier proposé ; C:133-134 | ferme, MED | proposition d'échelonnement | rien ; la ferme invite seulement à contester | pas couvert (le site promet la saisie d'un échéancier, pas sa proposition) | 1 |
| S2-8 | R:170 historique de paiement ; R:171 « jamais deux fois le même texte » | C7 (a déjà payé 300 €) vs C0 | ton tenant compte d'un acompte ; textes jamais répétés | C7 = même texte que C0 ; deux clients différents reçoivent le même texte (promesse lue « par client » : pas testable sans deux messages du même palier au même client) | pas testable (historique trop court) | 1 |
| S2-9 | R:220, C:68 | MED C13 | « courrier », délai cohérent | canal `email` mais « 8 jours à compter de la réception de ce **courrier** », et l'échéance (11/11) est comptée depuis la préparation, pas la réception ; rappel C12 « cette facture » pour deux factures | écart mineur (TCASHD-10) | 1 |
| S2-10 | C:95 « Vos règles de communication et vos interdits sont repris dans chaque message » | interdit « simple oubli » posé (`cashd_regler_relances` … `interdits`) ; rappel C14 qui contient ces mots | le mot ne part pas | rappel C14 `bloquee`, motif « le message contient un mot interdit par vos règles : « simple oubli » » | juste | 1 |
| S2-11 | C:50 (secteur) — rejeu de TCASHD-09 avec réglage | `cashd_regler_compte(A-C14, {secteur:"second œuvre"})` | secteur cité | « compte A-C14, **secteur second œuvre** » ; signature réglée reprise ; chantier toujours absent ; `metier btp` : aucun mot du métier visible | juste pour le secteur (TCASHD-09 réduit au chantier et à l'import sans clé secteur) ; `metier btp` : voir S2-13 | 1 |
| S2-12 | brief : moyens de règlement | `moyens_reglement` réglé | moyens cités | « Vous pouvez régler Virement IBAN … ou chèque … » (le texte libre est collé après « régler », sans « par » : tournure bancale selon la saisie) | juste (remarque de tournure) | 1 |
| R06 | rejeu TCASHD-06 (lot c2_19) | C14 : FB-2026-0115 échue 26/09, jamais relancée ; rappel de J bloqué (jamais parti) | ferme et MED sans « précédent rappel » | 27/10 : ferme « Sauf erreur de notre part, la somme suivante reste impayée … » (plus de « précédent rappel ») ; 03/11 : MED « Les sommes suivantes restent impayées … » (plus de « précédentes relances »). Chaque palier remplace le précédent (`coupee`, « remplacée par la relance du … »). Reste : aucun des trois messages n'est parti, et la MED est préparée quand même — le débiteur recevrait la MED en premier. MED sans les moyens de règlement (la ferme les porte) | juste pour le texte (TCASHD-06 corrigé) ; écart **TCASHD-12** (MED préparée sans qu'aucun palier soit parti, contre C:47) et TCASHD-13 mineur (MED sans moyens de règlement) — numérotés par le coordinateur | 1 |
| S2-13 | brief : vocabulaire du bâtiment ; réglage `metier btp` (coordinateur : réservé aux relances de devis) | devis DV-2026-0014 (18/10, 2 170 €, `en_attente`) sur A-C14, client réglé `metier btp` | chantier, visite, date d'intervention | `devis_rappel` : « Avez-vous des questions sur le chantier, ou souhaitez-vous que nous passions voir les lieux pour ajuster le devis ? Nous pouvons aussi caler dès maintenant une date d'intervention. » ; secteur et signature repris | juste | 1 |
| S2-14 | « Vous pouvez régler » + texte du réglage | `moyens_reglement` en texte libre | phrase correcte | « Vous pouvez régler Virement IBAN … » | écart mineur (TCASHD-11, noté par le coordinateur) | 1 |
| R03 | rejeu TCASHD-03 (lot c2_20) ; C:82 | (a) avoir orphelin **neuf** AV-2026-0016 (−100, `facture_visee` FB-2026-0998) sur A-C00 ; (b) témoin AV-2026-0012 (−42,50, `facture_visee` FB-2026-0113) ; (c) AV-2026-0006 réimporté à l'identique | (a) signalé, imputé nulle part ; (b) imputé à FB-0113 seulement ; (c) l'imputation fautive du 21/10 défaite | (a) `avoirs_non_imputes [{vise FB-2026-0998, compte A-C00, numero AV-2026-0016}]`, FB-0100 intacte (1085) — **juste**. (b) passage du 12/11 (coordinateur, `{preparees 6, bloquees 1}`) : AV-0012 `soldee`, FB-0113 `avoirs_imputes` 42,50, reste 500 ; MED A-C12 « FB-2026-0113 … 500,00 € restant dus … somme de 1 585,00 € » — **juste** ; et AV-0016 (orphelin) toujours `ouverte`, MED A-C00 à 1 085 — **juste**. (c) **l'ancienne imputation reste** : fiche A-C06 `imputations` [auto, « avoir déduit avant la relance », 200 → FB-2026-0106, 19:17:29, `annulee_le` null] ; FB-0106 reste 885 ; AV-0006 passe `soldee` | juste pour le neuf et le témoin ; écart résiduel (c) : l'existant n'est pas réparé — lot c2_20b annoncé | 1 |
| R02 | rejeu TCASHD-02 (lot c2_21) | (a) FB-2026-0102 réimportée à l'identique (TTC 1185) ; (b) facture neuve FB-2026-0116 (HT 500, TTC 524,50 ≠ 542,50) ; (c) FB-0102 réimportée corrigée (TTC 1085) | (a)(b) incohérence dite à l'import et sur la fiche, pas de relance ; (c) marque levée, relançable | (a)(b) import → `incoherentes` [« TTC 1185 ≠ lignes : HT 1000 + TVA 85.00 = 1085.00 », « TTC 524.5 ≠ lignes : HT 500 + TVA 42.50 = 542.50 »] ; fiche : `reste_relancable` 0, `relance_suspendue` « total incohérent (…) : relance suspendue jusqu'à l'export corrigé ou la marque levée ». (c) → `modifiees 1`, `incoherentes` [] ; fiche FB-0102 : TTC 1085, `incoherence` null, `relance_suspendue` null, relançable 1085. Avoir AV-0016 : `reste_relancable` 0, `facture_visee` FB-2026-0998 | juste | 1 |
| R04 | rejeu TCASHD-04 (lot c2_22) | A-C15 : FB-2026-0117 échue + règlement 400 € « VIR SARL CARRELAGE » sans référence de facture | suspendue, raison visible | fiche : `relance_suspendue` « un règlement reçu reste à imputer sur ce compte (400,00 € du 18/10/2026, VIR-C15-0001) : la relance attend son lettrage » ; aucune relance préparée. (Remarque : `reste_relancable` 1085 alors que suspendue ; pour une incohérence, c'est 0) | juste (remarque mineure) | 1 |
| R05 | rejeu TCASHD-05 (lot c2_22) ; C:149-150 | (a) A-C17 : FB-2026-0119 reste 50 €, rappel préparé, puis seuil de l'entité monté à 60 € ; (b) A-C16 : FB-2026-0118 reste 5 € (sous le seuil de 10 € dès l'import) | (a) coupe au vrai motif ; (b) raison visible sur la fiche | (a) `coupee`, « avant l'envoi : facture FB-2026-0119 : reste dû 50,00 €, sous le seuil de relance de 60,00 € ; elle reste dans l'encours, à abandonner ou à réclamer » — **juste**. (b) aucune relance, et fiche `relance_suspendue` **null**, `reste_relancable` 5 ; idem A-C17 après la coupe : le « sous le seuil » ne se lit que dans la relance coupée, pas sur la fiche | (a) juste ; (b) écart résiduel (la promesse c2_22 « chaque facture ouverte porte relance_suspendue avec la vraie raison » ne couvre pas le seuil) | 1 |
| R01 | rejeu TCASHD-01 (lot c2_23) | jeu `clients` de la série 1 réimporté à l'identique (14 lignes, dont A-C04 sans e-mail) + témoin A-C17 au nom changé | 14 inchangés, 1 modifié | `{creees 0, lignes 15, modifiees 1, inchangees 14}` | juste | 1 |
| R03b | reprise TCASHD-03 (lot c2_20b) | imputation auto fautive du 21/10 (AV-2026-0006 → FB-2026-0106, 200 €) | défaite, FB-0106 à 1 085, relance fausse coupée | fiche A-C06 : imputation `annulee_le` 19:54:57, motif « reprise c2_20b : l'avoir AV-2026-0006 vise FB-2026-0999, il avait été déduit de FB-2026-0106 » ; FB-0106 `reste_du` 1085, relançable 1085, `avoirs_imputes` 0 ; AV-0006 `ouverte`, reste 200, relançable 0, `facture_visee` FB-2026-0999 ; MED du 12/11 à 885 `coupee`, « montant revu : l'avoir AV-2026-0006 (sur FB-2026-0999) ne se déduit pas de FB-2026-0106 » | juste ; passage du 13/11 (`{preparees 3}`) : MED A-C06 réécrite « FB-2026-0106 … 1 085,00 € restant dus … somme de 1 085,00 € » | 1 |
| R12 | rejeu TCASHD-12 (lot c2_24) | (a) les MED préparées avant le lot sans qu'aucun message soit parti : A-C14 (03/11), A-C13 (03/11, approuvée), A-C00 et A-C12 (12/11), A-C06 (13/11) ; (b) MED neuve : A-C02 au passage du 20/11 | (a) retenues ou coupées ; (b) retenue, raison sur la fiche | (a) lu le 21/10 20:05 : les cinq restent `non_reglee`, demande `en_attente` (A-C13 `approuvee`), fiches `relance_suspendue` null — **l'existant n'est pas repris** ; (b) passage du 20/11 (`{preparees 1}`) : aucune MED pour A-C02 ; fiche FB-2026-0102 `relance_suspendue` « mise en demeure retenue : aucun message précédent n'est réellement parti pour cette facture (rappel et relance ferme non envoyés). Une mise en demeure n'est jamais le premier message reçu : envoyez d'abord la relance, ou notez-la envoyée à la main. » (alerte : non lisible par mes portes) | (a) écart résiduel, reproduit par le coordinateur → c2_24b ; (b) **juste** | 1 |
| R07 | rejeu TCASHD-07 (lot c2_25) ; R:187, R:453 | (a) MED A-C13 approuvée sans commentaire le 21/10 ; (b) en valideur, approbation de la MED A-C14 (demande `20ae670a-…`) avec `commentaire` **''** (vide) | la MED ne part pas | (a) relance `coupee`, motif « mise en demeure approuvée sans commentaire : elle ne part pas. Une mise en demeure exige une validation commentée ; elle sera proposée de nouveau au prochain passage. » ; (b) l'insert est **accepté** (`53fe8fb4-…`, commentaire '') mais la relance passe aussitôt `coupee` avec le même motif, `envoi_id` null | juste (remarque : la demande reste affichée `approuvee` ; un refus à la saisie serait plus clair pour le valideur) | 1 |
| R04b-05b | rejeu c2_22b | fiches A-C15 (règlement à imputer), A-C16 et A-C11 (sous le seuil, sans relance), A-C02 (MED retenue, total incohérent) | raison sur la fiche ; relançable 0 ; dû gardé | A-C15 : relançable 0, dû 1 085, raison « règlement … à imputer » ; A-C16 : « reste dû 5,00 €, sous le seuil de relance de 10,00 € : il reste dans l'encours, à abandonner ou à réclamer », relançable 0, dû 5 ; A-C11 idem à 3,00 € ; A-C02 : relançable 0 sur ses deux factures | juste | 1 |
| R10 | rejeu c2_26 (« cette / ces factures ») | A-C18 : deux factures échues le 13/10, rappel du 21/10 | « ces factures » | « Pour toute question sur **ces factures**, il vous suffit de répondre à ce courriel. » (TCASHD-11 « régler Virement » toujours là ; c2_27 « courriel/courrier » : il faut une MED neuve pour le lire) | juste (c2_26) | 1 |
| R12b | reprise c2_24b (MED en file sans relance partie) | MED A-C00 et A-C12 (12/11), A-C06 (13/11), A-C14 (03/11) | coupées, retenue sur la fiche | A-C00, A-C12 (2 factures), A-C06 : MED `coupee`, demande `annulee`, motif « mise en demeure retenue : la relance qui la précède n'est pas réellement partie. Une mise en demeure ne vient qu'après une relance reçue : envoyez d'abord la relance, ou notez-la envoyée à la main. » ; fiches : même raison, relançable 0. A-C14 : MED déjà coupée par la garde c2_25 (mon approbation à commentaire vide), fiche sans raison, relançable 1 085 | juste ; nouveaux paliers : passage du 21/11 demandé | 1 |
| R12c | c2_24b, nouveaux paliers (passage du 21/11, `{preparees 1}`) | A-C02 (ferme du 13/11 sans rappel parti), A-C17 (ferme du 20/11 sans rappel parti), A-C14 (rappel, ferme, MED tous coupés, rien parti) | fermes d'avant le lot coupées ; un **rappel** écrit pour chacun | A-C02 : ferme du 13/11 toujours `non_reglee` en file, aucun rappel ; A-C17 : ferme du 20/11 toujours en file, aucun rappel ; A-C14 : **rien** d'écrit, fiche « mise en demeure retenue … envoyez d'abord la relance, ou notez-la envoyée à la main » alors qu'aucune relance n'est en file | écart (TCASHD-14) | 1 |
| R12d | « notez-la envoyée à la main » (`cashd_noter_envoi_main`, feu vert du coordinateur) | ferme A-C17 `0cf52b47-…` : approuvée en valideur (commentaire « Test du banc »), puis notée envoyée en gérant | envoi noté, MED possible | avant comme après l'approbation : `ERROR 55000 : Cette relance n'est pas à envoyer (non_reglee)`. Sans réglage d'envoi, une relance reste `non_reglee` même approuvée : le geste que la fiche conseille est impossible | écart (TCASHD-15) ; c2_27 non lisible | 1 |
| R08 | rejeu TCASHD-08 (lot c2_30, ton du rappel selon l'ancienneté, seuils 15 et 45 j) | rappels du 21/10 : A-C18 (8 j), A-C19 (20 j, neuf), A-C20 (50 j, neuf) | trois tons | 8 j : « Il s'agit sans doute d'un simple oubli. » ; 20 j : « Ce retard dure maintenant depuis 20 jours. » ; 50 j : « Ce retard de 50 jours devient important : merci de nous indiquer dès à présent la date de règlement prévue. » Les rappels neufs citent aussi le chantier (« 1 085,00 € TTC — Chantier : Villa Saint-Claude ») : TCASHD-09 réduit d'autant | juste | 1 |
| R14 | rejeu TCASHD-14 (lot c2_31) ; passage du 22/11 (`{preparees 9, bloquees 1}`) | A-C02, A-C17 (fermes sans rappel parti), A-C14 (rien en file), A-C18 (rappel du 21/10 remplacé le 21/11) | fermes coupées, un rappel écrit, rien de réécrit s'il attend déjà | A-C02 : ferme du 13/11 `coupee` « remplacée : le palier qui la précède n'est jamais parti ; la séquence reprend au premier palier non parti », rappel 22/11 en attente ; A-C17 : ferme du 20/11 coupée (même motif), rappel 22/11 ; A-C14 : rappel 22/11, fiche « … Elle est dans la liste des relances : validez-la et envoyez-la, ou notez-la envoyée à la main ; la mise en demeure suivra. » ; A-C18 : rappel du 21/11 en attente, pas réécrit le 22/11 | juste | 1 |
| R15 | rejeu TCASHD-15 (lot c2_32) | (a) ferme A-C17 `0cf52b47` (coupée par c2_31) ; (b) rappel A-C17 du 22/11 avant approbation ; (c) même rappel approuvé, `p_le` 22/11 puis null ; (d) rappel A-C19 du 21/10 approuvé (« Test du banc ») puis noté, `p_le` null | (a) refus ; (b) refus « validez d'abord » ; (d) envoi consigné, palier compté parti | (a) « Cette relance n'est pas à envoyer (coupee) » ; (b) « Une relance ne part qu'après sa validation : validez-la d'abord dans la file. » ; (c) « La date d'envoi tombe entre le jour où la relance a été écrite et maintenant. » — artefact du banc (jour simulé 22/11 > maintenant réel 21/10) ; (d) accepté : `{id 5d7cba3f-…, envoye_le 2026-10-21T20:48:39Z, note « Test du banc … »}` ; la relance porte `envoye_le` et `envoi_main`, mais reste `non_reglee` avec le motif « l'envoi par courriel n'est pas encore réglé … l'envoi viendra une fois le réglage posé » | juste (a, b, d) ; la remarque (relance notée envoyée qui reste `non_reglee`, risque de second envoi si un réglage est posé) devient **TCASHD-16** (coordinateur) | 1 |
| R27 | c2_27 « ce courriel / ce courrier » dans la MED | MED neuve impossible sur le banc (jours simulés > date réelle exigée par `cashd_noter_envoi_main`) | — | non joué | pas testable sur le banc — couvert par le test de l'ouvrier c2_27, vert sur la recette (coordinateur, 21/10) | 1 |
| R16 | rejeu TCASHD-16 (lot c2_34) | rappel A-C19 du 21/10 noté envoyé à la main avant le lot | quitte `non_reglee`, ne repartira pas | `etat` **envoyee**, `envoye_le` 20:48:39, motif « envoyée à la main le 21/10/2026 (email) : elle ne repartira pas » (remarque : `statut` affiché `a_valider` à côté d'un `etat` `envoyee`) | juste (remarque mineure) | 1 |
| R33 | c2_33 (ton au-dessus de 1 500 € ; mention du règlement partiel) | A-C21 : 2 170 € à 8 j ; A-C22 : 1 085 € à 8 j, règlement lettré 500 € du 16/10 | ton du montant ; reste après règlement | A-C21 : « Compte tenu du montant en jeu, merci de nous indiquer dès à présent la date de règlement prévue. » ; A-C22 : « 585,00 € restant dus (il reste 585,00 € après votre règlement du 16/10/2026) » et ton « simple oubli » (8 j, < 1 500 €) | juste | 1 |
| R35 | c2_35 / c2_36 (date limite de la ferme avec marge de validation de 3 jours ouvrés ; MED avec moyens de règlement et délai « à compter de la réception de ce courriel ») | A-C19 : rappel noté parti le 21/10, passage du 26/10 (`{preparees 1}`) | ferme neuve, date limite = préparation + 8 j + 3 jours ouvrés | ferme du 26/10 (lundi) : « Malgré notre précédent rappel » (juste : le rappel est noté parti) … « au plus tard le **06/11/2026** » (26/10 + 3 j ouvrés = 29/10, + 8 j = 06/11 ; les fermes d'avant le lot donnaient préparation + 8 j) ; moyens de règlement repris. MED neuve : non testable sur le banc (couvert par le test de l'ouvrier) | juste pour la ferme | 1 |

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
  **Élargi le 03/11** (`private.cashd_preparer_relances(client,'2026-11-03',null)` → `{preparees 6, bloquees 1}`) : les six
  relances fermes (A-C00, A-C04, A-C05, A-C06, A-C07, A-C12) commencent toutes par « Malgré notre précédent rappel », alors
  qu'aucun rappel n'a été envoyé (tous `envoye_le` null) — y compris A-C04, qui n'a pas d'adresse et n'a donc jamais pu rien
  recevoir. La MED de A-C13 dit « Malgré nos précédentes relances ». Le texte affirme un historique que le journal dément.
- **TCASHD-07** · mise en demeure · MED A-C13 du 03/11 (`cashd_relances_du_jour(client,'2026-11-03')`, palier
  `mise_en_demeure`, `demande_id` `bdc51f0d-a8f8-46a7-9618-bf8170bcff53`). La demande porte `type_action`
  `cashd.mise_en_demeure`, **`exige_commentaire true`**, `exige_motif true`. En valideur `eeeeeeee-…-0000000002c2` (claims +
  `role authenticated`, geste de l'écran /espace2/validations, autorisé par le coordinateur) :
  `insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values ('bdc51f0d-…', 'dddddddd-…-0000000000c2', auth.uid(), 'approuve', null) returning id, decision, commentaire;`
  → **accepté** : `{id fe3fe337-d2da-4652-99d2-99dddb56c150, decision approuve, commentaire null}`. Ensuite la demande est
  `approuvee`, `decide_le` 19:24:42 ; la relance reste `non_reglee` (rien envoyé : pas de réglage d'envoi), `envoi_id` null.
  Promesse trahie : R:187 « La mise en demeure exige une validation explicite », R:453 « La mise en demeure exige en plus une
  validation explicite, à chaque fois », C:68, C:197 — et le brief : « la mise en demeure exige un commentaire ».
  NB : cette MED est désormais approuvée ; si un réglage d'envoi est posé un jour sur ce client banc, elle partirait (vers
  une adresse `.invalid`). À annuler par le coordinateur s'il le juge utile.

### Série 2 — les textes (lus le 21/10 sur les relances préparées des 21/10, 27/10, 03/11)

- **TCASHD-08** · S2-1 · `cashd_relances_du_jour(client,'2026-10-21')`, champ `corps`, comptes A-C11 (3,00 €), A-C00
  (1 085 €, 8 j), A-C13 (1 085 €, 35 j), A-C12 (1 627,50 €, 2 pièces) : même corps « Sauf erreur de notre part … Il s'agit
  sans doute d'un simple oubli. Si le règlement est déjà parti, merci de ne pas tenir compte de ce message … », seuls les
  numéros, dates et montants changent. R:169 promet « Le ton suit le montant et l'ancienneté du retard », R:273 « Chaque
  message est écrit à partir du montant, de l'ancienneté du retard et du palier atteint » : seul le palier joue.
- **TCASHD-09** · S2-3 · mêmes relances : aucun texte ne nomme le secteur ni le chantier. La fiche du compte porte
  `secteur` null (la porte d'import n'a pas de clé secteur) ; la facture porte `commande_ref` « Chantier : Résidence Les
  Flamboyants », jamais repris. C:50 promet « le secteur du compte, sa référence, son montant et son retard ».
- **TCASHD-10** · S2-9 (mineur) · MED A-C13 du 03/11, canal `email` : « dans un délai de 8 jours à compter de la réception
  de ce courrier, soit au plus tard le 11/11/2026 » (date comptée depuis la préparation, quelle que soit la date de
  validation). Rappel A-C12 (deux factures) : « Pour toute question sur cette facture ».
- **TCASHD-11** (mineur) · S2-14 · « Vous pouvez régler » suivi du texte brut de `moyens_reglement` (« … régler Virement IBAN … »).
- **TCASHD-12** · R06 · A-C14 : rappel du 21/10 jamais parti (bloqué), ferme du 27/10 jamais partie, MED préparée le 03/11
  (`private.cashd_preparer_relances(client,'2026-11-03',null)` → `{preparees 1}`). Le débiteur recevrait la MED en premier.
  Contre C:47 « Une facture échue suit trois paliers : deux relances, puis la mise en demeure ». Atténuation : la MED exige
  une validation (mais voir TCASHD-07).
- **TCASHD-13** (mineur) · R06 · la MED A-C14 du 03/11 ne reprend pas `moyens_reglement`, que la ferme du 27/10 porte.
- **TCASHD-14** · c2_24b · passage du 21/11 (`private.cashd_preparer_relances(client,'2026-11-21',null)` → `{preparees 1}`) :
  `cashd_relances_du_jour` 13/11 A-C02 `relance` `b860d136-…` toujours `non_reglee` ; 20/11 A-C17 `relance` `0cf52b47-…` toujours
  `non_reglee` ; aucun rappel écrit le 21/11 pour A-C02, A-C17, A-C14. Fiche A-C14 FB-2026-0115 : « mise en demeure retenue : la
  relance qui la précède n'est pas réellement partie … envoyez d'abord la relance » — aucune relance en file pour A-C14.
  Attendu (annonce c2_24b) : les fermes écrites sans rappel parti coupées, et le premier palier non parti (le rappel) écrit.
- **TCASHD-15** · en gérant, `cashd_noter_envoi_main('0cf52b47-…','email','2026-11-20 10:00+00','Test du banc …')` →
  `ERROR 55000: Cette relance n'est pas à envoyer (non_reglee)`, avant et après approbation en valideur (approbation
  `2f7cdf9b-…`, commentaire « Test du banc T-CASHD »). Un client sans réglage d'envoi (le cas de tout client qui copie le
  texte et l'envoie lui-même, comme Omega pour son propre compte) ne peut donc jamais noter un envoi : la MED reste retenue
  pour toujours, et le motif lui conseille un geste impossible.
- **TCASHD-16** (numéroté par le coordinateur) · R15 · rappel A-C19 du 21/10 approuvé puis noté envoyé à la main
  (`cashd_noter_envoi_main` → `5d7cba3f-…`) : la relance porte `envoye_le` mais reste `non_reglee`, motif « l'envoi viendra
  une fois le réglage posé ». Un réglage d'envoi posé plus tard pourrait la faire repartir une seconde fois.

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

- Fait : séries 1 et 2 ; rejeux de TCASHD-01 à 08, 12, 14, 15 (justes), compléments c2_20b, c2_22b, c2_24b, c2_26, c2_30, c2_31, c2_32 (justes).
- Ouverts côté C2 : TCASHD-09 (import sans clé secteur), 10 et 11 (tournures), 13 (MED sans moyens de règlement). TCASHD-16 et c2_33 rejoués justes. c2_27 couvert par le test de l'ouvrier.
- En cours : rien sur la recette. État du banc : réglages `metier btp`, `moyens_reglement`, `signature`, seuil 10 € ; aucun réglage d'envoi ; 0 ligne dans `public.envois` ; une ferme A-C17 et un rappel A-C19 approuvés (« Test du banc »), le rappel A-C19 noté envoyé à la main.
- Prochain pas : rejouer TCASHD-16 et les lots de ton quand le coordinateur les annonce ; écran (compte gérant à mot de passe, au bureau).
- SHA d'arrêt : dernier commit de `testeur-cashd`.
