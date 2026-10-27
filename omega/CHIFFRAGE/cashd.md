# CASHD — audit des promesses du site, ligne par ligne (26/10/2026)

Audit refait le 26/10/2026, entre 18 h 40 et 19 h 10 Z, en lecture seule : aucun code produit touché, aucun fichier du
site modifié. Il remplace le chiffrage du 06/10 (C2, `d7391be1`, toujours lisible dans l'historique git) ; la colonne
« 06/10 » en garde l'état.

Sources lues :
- textes du site sur `origin/main` `de17d8c9` : `lib/produits/relances.ts` et `lib/produits/capacites/relances.ts`
  (inchangés depuis le 15/09, donc les numéros de ligne du 06/10 tiennent), `app/page.tsx` (réécrit le 21/10 :
  M1, M2, M3 reprennent les nouvelles phrases), `app/offres/page.tsx` et `lib/content.ts` (inchangés depuis le
  06/10) ;
- construction : `origin/worker-c2` `f31c0c7b` (migrations et tests c2_01 → c2_45), `omega/NOTES-C2.md` de cette
  branche, et sa liste « Ce qui reste vraiment » du 26/10 (`2b7a6c7d`, pas encore sur main) ; fin de
  `omega/NOTES-COORDINATEUR.md` ; rapport du testeur des modules du 26/10 (TMOD-04, TMOD-05) ;
- recette `omega-recette` (`ygwbgpowzlbdaajlsqkn`), en lecture : `supabase_migrations.schema_migrations`,
  fonctions `tests.test_c2_*`, crons, tables `envois`, `messageries`, `expediteurs` et `cashd_taux_change`.

## Mise à jour du 27/10/2026 (session C2, branche `cashd-lacunes`)

Construites, posées sur omega-recette depuis le dépôt avec leur ligne `schema_migrations`, chacune avec un test vu rouge
avant la migration et vert après ; puis toute la suite `^test_c2_` (01 → 52) rejouée verte par morceaux :

| Lacune | Migration | Test | Effet sur l'audit |
|---|---|---|---|
| E1 / G10 | (test borné, 26/10) | `test_c2_08` ✔ 14/14 | E1 C → **B** |
| G4, part CASHD | `c2_48_boite_entreprise` | `test_c2_48` ✔ 7/7 | C13 reste C (Microsoft 365, vérification Google/Microsoft, A2/T) |
| P12 | `c2_49_texte_jamais_repete` | `test_c2_49` ✔ 4/4 | P12 C → **B** |
| G19 | `c2_50_raccord_commandes` + `API-COMMANDES.md` | `test_c2_50` ✔ 14/14 | C38 C → **B** |
| G13, part CASHD | `c2_51_whatsapp` | `test_c2_51` ✔ 9/9 | P3 reste C (G1, Outlook, Meta) |
| C17 / G6 (espagnol) | `c2_52_espagnol` | `test_c2_52` ✔ 7/7 | C17 reste C (relecture native, autres langues) |

En chemin, un défaut corrigé (`c2_47_envoi_readosse`, `test_c2_47` ✔ 3/3) : depuis c2_41, une relance reprise après
refus ou revue au nouveau montant gardait le message adossé à son ANCIENNE demande (signature de `preparer_envoi` mal
écrite dans le test de présence) ; approuvée, elle ne serait jamais partie. Les relances en attente concernées ont reçu
leur message à la pose.

Décompte au 27/10 : **A 0 · B 90 · C 22 · D 0 · T 7** (119). Restent côté CASHD : la relecture native de l'espagnol et
d'autres langues (G6, avec un traducteur). Le reste attend A1 (G1), A2 (Microsoft 365, expéditeur WhatsApp, AR24), le
socle (G12, G18), la vitrine (G14) ou un tiers. Écrans ajoutés (vérifiés par tsc et eslint, **à ouvrir dans un
navigateur**) : Relances et Envois (boîte d'envoi), Vos textes (section WhatsApp), fiche du compte (canal des relances),
Risque client (raccord d'un logiciel de commandes).

## En tête

### Décompte

| | A | B | C | D | T | Total |
|---|---|---|---|---|---|---|
| 06/10 (synthèse C2) | 0 | 71 | 38 | 1 | 7 | 117 |
| **26/10** | **0** | **87** | **25** | **0** | **7** | **119** |

Deux lignes ont été ajoutées parce qu'elles manquaient au relevé du 06/10 (M9, M10). Quinze lignes passent de C
ou D à B, toutes sur un test rejoué vert le 26/10 : P10, P21, P33, C18, C42, L4, L7, L11, L12, E3, M4 à M8.

Une ligne descend de B à C : C10. Depuis c2_10, le devis est relancé à J+7 après l'envoi, et non plus sept jours
après le rappel.

E1 reste en C : elle est construite, mais son seul test est rouge ce jour. Aucune ligne n'est en A.

### Les 5 manques les plus importants pour vendre CASHD

1. **Rien n'a jamais tourné en vrai.** Sur la recette, CASHD n'a que des organisations de banc. Ses envois sont
   2 « à valider » et 1 « annulé », tous en essai, et aucun n'est jamais parti (`envois.envoye_le` vide). On ne peut
   citer ni client ni envoi réel. Il faut un pilote chez un premier client : ~13 j de travail sur 30 à 45 jours de
   calendrier, puisque la mise en demeure n'arrive qu'à J+30.
2. **« CASHD relit votre facturier chaque matin » (G1).** CASHD relit le **dernier export déposé**. Aucun connecteur
   ne va chercher le facturier chaque jour. Seize lignes en dépendent, dont l'accroche de l'accueil. Il faut 3 j
   (connecteur du lecteur A1) et un vrai client, ou bien un dépôt quotidien fait par lui, assumé sur la page.
3. **« Les relances partent … depuis la boîte de votre entreprise » (G4).** Le socle sait déposer dans une boîte
   Gmail : une boîte de test est branchée sur le banc (portées `gmail.compose` et `gmail.readonly`) et OFFLOAD
   l'utilise (c4_22). CASHD, lui, ne s'y abonne pas (aucune migration c2 ne lit `envoi.brouillon_depose`), et
   Microsoft 365 n'existe pas. Il faut 1 j côté CASHD et 2 j côté A2, plus la vérification d'application de Google
   et de Microsoft (gratuite, plusieurs semaines).
4. **Les captures de la page sont celles d'une maquette, montrées « telles quelles » (P26).** L'écran réel a
   maintenant ses quatre vues dans `/espace2/cashd/suivi` (recette 298/298 du 26/10). Il reste à refaire les captures
   depuis cet écran : 0,5 j de vitrine.
5. **Le lien de paiement qui s'éteint au règlement (C34) et la LRE (C26) attendent un tiers.** Une adresse de
   paiement fixe est glissée dans chaque relance (c2_40, ✔). Le lien PAR FACTURE demande en plus le compte du
   prestataire de chaque client (Stripe, GoCardless) et l'ouvrier serveur (2,5 j). La LRE demande le contrat AR24
   et son branchement (2 j).

### Reste à construire (→ B) au 26/10

Environ **14 j**, chaque lacune comptée une fois (détail plus bas) :
- côté CASHD : ≈ 4,75 j (G4 1, G13 0,5, P12 1, C17 0,5, G19 1,5, E1 0,25) ;
- chez les autres équipes : ≈ 9 j (A1 3, A2 3, socle 3) ;
- vitrine : 0,5 j.

Les tiers T restent à part (AR24, prestataire de paiement, Meta, région d'hébergement et contrats). Le 06/10, ce
total était de 38 j.

### Hypothèses prises seul (Teo non consulté, comme demandé)

- **Recette rejouée.** Les tests marqués ✔ ont été rejoués par moi le 26/10 entre 18 h 52 et 19 h 02 Z
  (`runtests`, chaque test annulé en fin de transaction : rien n'est resté écrit). Ils sont tous verts : c2_02 à
  c2_07, c2_09 à c2_45. Deux sont rouges :
  - **`test_c2_01_donnees`** : 35 assertions vertes et 4 rouges, à savoir 6 « trois comptes saisis » (10 trouvés),
    13 « le tableau : 15 600 € échus » (totaux du client entier), 23 « à imputer » (2 au lieu de 1) et 36 « le
    collaborateur lit les comptes de son périmètre » (10 au lieu de 3) ;
  - **`test_c2_08_portefeuille`** : 5 décomptes rouges.

  Les neuf assertions rouges comptent **tous** les comptes du client du banc, et les 7 comptes NOBAT ajoutés le 21/10
  les faussent ; C2 l'avait déjà écrit. J'ai donc gardé en B les lignes dont l'assertion de fond reste verte
  (C31 : « la facture probable est proposée », assertion 79, verte), et descendu en C celle dont le seul test est
  rouge (E1).
- **Lots posés sans inscription.** Une partie des lots est posée sur la recette sans figurer sous son nom dans
  `schema_migrations` : c2_16, c2_19 à c2_22, c2_27 à c2_29, c2_33 et c2_37. c2_37 est inscrit sous
  « c2_36 verts+c2_37 », et c2_07 sous « c2_06_c2_07_liens ». J'ai jugé posé un lot dont le test existe sur la
  recette et y passe vert. Tous les tests `test_c2_01` à `test_c2_45` existent dans le schéma `tests`.
- **Taux BCE.** « Taux BCE quotidiens » (C35, G17) : les crons `cashd-taux-bce` et `-lire` tournent chaque jour
  ouvré, mais `cashd_taux_change` et `cashd_taux_demandes` sont **vides**. Aucune facture en devise n'existe sur la
  recette, donc aucune demande n'est partie. Le mécanisme est B (c2_15 et c2_16 ✔) ; il n'a jamais appelé la BCE
  en vrai.
- **Accord permanent.** Le modèle 2 (c2_12 : rappels 1 et 2 sous accord permanent) est lu comme « votre accord »
  dans P14, P39 et M5 : l'accord permanent est donné par une personne de l'organisation.
- **Variantes de texte.** « Un client ne reçoit jamais deux fois le même texte » (P12) est en C. Les variantes
  alternent : deux par palier, trois au plus, et une seule pour la mise en demeure. Le même gabarit revient donc au
  troisième rappel d'un même palier. C2 la comptait B le 11/10.
- **Comptes export (C17).** Ils sont en C. Le mécanisme des langues existe (c2_09 ✔), mais sans texte écrit par
  l'organisation, un compte allemand reçoit l'anglais.

Légende : **A** prouvé en vrai (vraie donnée ou vrai envoi, daté) · **B** construit et testé sur la recette, test vert
cité · **C** partiel · **D** pas construit · **T** attend un tiers. Tests : t1 = `test_c2_01_donnees`, t2 =
`test_c2_02_export`, t3 = `test_c2_03_moteur`, t4 = `test_c2_04_capacites`, `cNN` = `test_c2_NN_*`. ✔ = rejoué vert
le 26/10 (18 h 52 – 19 h 02 Z) ; ✗ = rejoué rouge le 26/10. « j → B » : jours pour passer en B, portés par la lacune
et comptés une fois dans le tableau final.

## Page /offres/relances-impayes (`lib/produits/relances.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| P1 | Vos factures attendent d'être payées | `lib/produits/relances.ts:78` | B | B | constat, pas une capacité | — | 0 |
| P2 | Des devis attendent une réponse et des factures ont dépassé leur échéance. Chaque matin, une relance est déjà rédigée pour chaque compte, et vos équipes décident si elle part. | `:85-86` | C | C | cron `cashd-matin` (toutes les 10 min, actif), t3 ✔, c2_10 ✔ | G1 : le facturier n'arrive pas seul chaque matin, CASHD relit le dernier export déposé | 3 (G1) |
| P3 | Vous ne changez aucun de vos outils — Google Sheets, Excel, Gmail, Outlook, WhatsApp | `:110-111` | C | C | Excel et CSV : dépôt d'export (t2 ✔) ; Sheets par export seulement ; **27/10** : Gmail, CASHD abonné au dépôt en brouillon (c2_48 ✔ 7/7) ; WhatsApp, rappels et relances sur le modèle Meta, canal par compte (c2_51 ✔ 9/9) | Outlook (Microsoft 365) absent (A2) ; vérification d'application Google et Microsoft (T) ; modèle WhatsApp à faire approuver par Meta (A2, T) ; facturier quotidien (G1) | G1 + 2 (A2) |
| P4 | À 7 h, vos relances sont déjà écrites. | `:137` | B | B | `heure_relances`, passage toutes les 10 min (t3 ✔) | — | 0 |
| P5 | CASHD relit votre facturier chaque matin, avant d'écrire quoi que ce soit. | `:144` | C | C | relit le dernier relevé intégré (t2 ✔, t3 ✔) | G1 | (G1) |
| P6 | Chaque devis porte ses jours sans réponse | `:153` | B | B | `jours_ecoules` (t1 : assertion verte ; t1 ✗ sur 4 décomptes faussés par le jeu NOBAT) | — | 0 |
| P7 | Chaque facture porte son retard et son montant | `:154` | B | B | `cashd_factures_etat` (t3 ✔, c2_42 ✔) | — | 0 |
| P8 | Un règlement encaissé la veille sort de la liste | `:155` | C | C | vrai si le règlement est dans l'export ou saisi (t2 ✔, c2_42 ✔) | G1 | (G1) |
| P9 | Le message est déjà rédigé quand vous ouvrez votre espace, et il ne reste qu'à le relire. | `:161` | B | B | relances `a_valider` avec texte (t3 ✔) ; écran /espace2/cashd (recette 298/298 du 26/10, C2) | — | 0 |
| P10 | Le ton suit le montant et l'ancienneté du retard | `:169` | C | **B** | c2_30 ✔ (ton selon l'ancienneté, 15/45 j), c2_33 ✔ (ton selon le montant, 1 500 € par défaut) | — | 0 |
| P11 | L'historique de paiement du client pèse aussi | `:170` | B | B | `cashd_payeur_en_retard` (t3 ✔) ; variantes (c2_05 ✔) | — | 0 |
| P12 | Un client ne reçoit jamais deux fois le même texte | `:171` | C | **B (27/10)** | variantes alternées par compte (c2_05 ✔) ; **c2_49 ✔ 4/4** : les textes reçus par chaque compte sont retenus (empreinte), une variante déjà reçue mot pour mot est écartée, et si toutes l'ont été la référence datée rend le message unique | le même *gabarit* peut revenir (deux ou trois variantes par palier) : la garantie porte sur le texte reçu, mot pour mot | 0 |
| P13 | Tout ce qui doit partir passe par une file de validation, qui reste la seule porte de sortie du système. | `:178` | B | B | `preparer_envoi` adossé à `demandes_validation` (t3 ✔) ; c2_39 ✔ ; c2_44 ✔ (la relance revue repasse les contrôles) | — | 0 |
| P14 | Aucun message ne part sans votre accord | `:186` | B | B | t3 ✔ ; c2_12 ✔ (accord permanent donné par une personne) | — | 0 |
| P15 | La mise en demeure exige une validation explicite | `:187` | B | B | c2_25 ✔ (approuvée sans commentaire : coupée) | — | 0 |
| P16 | Une suspension coupe même ce qui est déjà prêt | `:188` | B | B | `cashd_couper` (t3 ✔) ; c2_22b ✔ | — | 0 |
| P17 | J 0 · Facture émise · le suivi s'ouvre automatiquement | `:210` | C | C | à l'intégration de l'export (t2 ✔) | G1 | (G1) |
| P18 | J+7 · Rappel courtois · le ton se cale sur l'historique de paiement | `:211` | B | B | t3 ✔ ; c2_10 ✔ (scénario par défaut J0 / J+7 / J+21 / J+30) | — | 0 |
| P19 | J+21 · Relance ferme · elle récapitule les sommes dues et fixe une échéance | `:213-215` | B | B | t3 ✔ ; c2_35 ✔ (date limite : 3 j ouvrés de validation + 2 j de remise) | — | 0 |
| P20 | J+30 · Mise en demeure préparée · elle attend votre signature et ne part jamais seule | `:218-220` | B | B | c2_24 ✔ (jamais avant que la ferme soit partie), c2_25 ✔ | — | 0 |
| P21 | Les devis suivent une cadence plus resserrée, J+3 puis J+7 | `:223` | C | **B** | c2_10 ✔ : le scénario des devis par défaut est `[J+3, J+7]`, l'écart de texte du 06/10 est résorbé | — | 0 |
| P22 | Chaque ligne porte le client, le montant dû et les jours de retard, et elle se met à jour à chaque relecture. | `:261` | B | B | t2 ✔ ; c2_23 ✔ (clients inchangés) | — | 0 |
| P23 | Le facturier est relu avant chaque envoi, donc un règlement encaissé la veille coupe la séquence avant qu'elle reparte. Un client qui a payé n'est jamais relancé. | `:267` | C | C | coupure au règlement intégré (t3 ✔, c2_36 ✔, c2_42 ✔) | G1 : « jamais » dépend de la fraîcheur de l'export | (G1) |
| P24 | Chaque message est écrit à partir du montant, de l'ancienneté du retard et du palier atteint. | `:273` | B | B | t3 ✔, c2_30 ✔, c2_33 ✔ | — | 0 |
| P25 | Le système date et archive chaque message, si bien que le jour où un client affirme n'avoir rien reçu, la preuve est disponible. | `:278` | B | B | envois + journal opposable + dossier (t4 ✔) ; preuve de REMISE réelle : seulement après un vrai envoi (A) | — | 0 |
| P26 | Votre espace tient en quatre écrans — Débiteurs, Relances, Envois, Trésorerie ; les captures ci-dessous sont celles de l'espace, montrées telles quelles. | `:295-325` | C | C | l'écran a ses quatre vues (`/espace2/cashd/suivi?vue=…`, recette 298/298 du 26/10, C2) ; les captures de la page viennent toujours de l'ancienne maquette | refaire les quatre captures depuis l'écran réel (vitrine) | 0,5 |
| P27 | Aucun outil à remplacer · Rien ne part sans vous · Vos données restent chez vous | `:328` | C | C | 2ᵉ point : B ; 1ᵉʳ : voir P3 ; 3ᵉ : les données sont dans la base d'Omega, isolées par organisation | reformuler « restent chez vous » (G22) | 0 |
| P28 | Conçu et développé en France ; rien n'est sous-traité ailleurs. | `:373-375` | T | T | déclaration d'entreprise | G22 (Teo) | — |
| P29 | Vos données sont hébergées dans l'Union européenne. Espace chiffré et distinct. Le système n'en extrait que le nécessaire, jamais votre facturier entier. | `:378-380` | T | T | RLS par organisation (t1, assertions vertes) ; aucun modèle appelé ; région d'hébergement non vérifiée ici | G22 (Teo) | — |
| P30 | L'assistance se fait en français, par les personnes qui ont installé le système chez vous. | `:383-385` | T | T | organisation d'Omega | G22 (Teo) | — |
| P31 | Facturation en euros, droit français | `:388-390` | T | T | CGV / contrat | G22 (Teo) | — |
| P32 | Et si un client paie entre deux relances ? … Un règlement enregistré interrompt la séquence sur-le-champ. | `:412-413` | B | B | t3 ✔ ; c2_42 ✔ (règlement partiel : la relance en attente est revue au reste dû) ; c2_43 ✔ | — | 0 |
| P33 | Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le système à chaque situation. Le ton reste le vôtre. | `:416-417` | C | **B** | textes de l'organisation par palier, langue et variante, écran « Vos textes » (c2_05 ✔) | — | 0 |
| P34 | Le ton reste le vôtre, le vouvoiement est constant, et vous lisez chaque message avant qu'il parte. | `:421` | B | B | t3 ✔, c2_05 ✔ | — | 0 |
| P35 | Une liste blanche est établie à l'installation et modifiable à tout moment … et seul vous pouvez les y remettre. | `:430-431` | B | B | `hors_perimetre`, retour par décision motivée (t3 ✔) | — | 0 |
| P36 | Le système lit le tableur ou l'outil où vit déjà votre facturation, avec vos colonnes et vos habitudes. Aucun compte à ouvrir ni aucune donnée à migrer. | `:434-435` | C | C | tableur à synonymes d'en-têtes (t2 ✔), contrôles d'import (c2_17 ✔), secteur lu (c2_29 ✔) | G1 : « l'outil » suppose un connecteur | (G1) |
| P37 | Le système ne remplace personne. Il prépare les relances, puis cette personne les relit et décide de ce qui part. | `:438-439` | B | B | t3 ✔ | — | 0 |
| P38 | Pour rédiger un message, le système transmet à un modèle le strict nécessaire … jamais votre facturier entier. | `:448-449` | B | B | plus strict que promis : aucun modèle n'est appelé, rien ne sort | écart de texte : la phrase décrit un mécanisme absent | 0 |
| P39 | Un message peut-il partir sans moi ? Non. … vous approuvez, vous corrigez ou vous suspendez. | `:452-453` | B | B | file de validation (t3 ✔) ; reprise après refus (c2_41 ✔) | — | 0 |
| P40 | Le tarif dépend de votre encours et du nombre de comptes à suivre … nous chiffrons votre cas sur vos volumes réels. | `:456-457` | T | T | commercial (prix fixés à l'audit) | Teo | — |
| P41 | Vous connectez le tableur que vous tenez déjà, puis vos équipes relisent chaque relance avant qu'elle parte : le système ne demande rien d'autre. | `:473-475` | C | C | dépôt d'export (t2 ✔) | G1 : « connecter » suppose un lien permanent | (G1) |

## Catalogue (`lib/produits/capacites/relances.ts`, 50 lignes)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| C1 | Le système relit votre facturier chaque matin, avant d'écrire la moindre relance. | `:33` | C | C | dernier relevé (t2 ✔, t3 ✔) | G1 | (G1) |
| C2 | Chaque devis porte le nombre de jours écoulés depuis son envoi. | `:34` | B | B | t1 (assertion verte) ; écran | — | 0 |
| C3 | Chaque facture porte son montant dû, son retard et le compte concerné. | `:35` | B | B | t3 ✔, c2_21 ✔ | — | 0 |
| C4 | Un règlement encaissé la veille sort de la liste du jour. | `:36` | C | C | t2 ✔ (dépend de l'export) | G1 | (G1) |
| C5 | La balance âgée range l'encours par tranche d'ancienneté, compte par compte. | `:37` | B | B | `cashd_balance_agee` (t4 ✔, t2 ✔) | — | 0 |
| C6 | Chaque ligne indique l'état de la relance et le palier suivant. | `:38` | B | B | `cashd_suivi` (t3 ✔), c2_24b ✔ | — | 0 |
| C7 | Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes. | `:39` | B | B | `cashd_poser_echeancier` (t4 ✔) | — | 0 |
| C8 | Les devis sans réponse sont suivis au même titre que les factures échues. | `:40` | B | B | t3 ✔ | — | 0 |
| C9 | Une facture échue suit trois paliers : deux relances, puis la mise en demeure. | `:47` | B | B | t3 ✔, c2_31 ✔ | — | 0 |
| C10 | Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel. | `:48` | B | **C** | c2_10 ✔ : depuis le 17/10 (décision de Teo), le défaut est « J+3 puis J+7 **après l'envoi** », soit quatre jours après le rappel ; la phrase décrit l'ancien défaut (J+10) | écart de texte : corriger le catalogue (« puis au septième jour ») ou régler le défaut à 3/10 | 0 |
| C11 | La fermeté du message suit le palier atteint, du rappel à la mise en demeure. | `:49` | B | B | t3 ✔, c2_05 ✔ | — | 0 |
| C12 | Chaque message reprend le secteur du compte, sa référence, son montant et son retard. | `:50` | B | B | t3 ✔, c2_29 ✔ (secteur lu à l'import) | — | 0 |
| C13 | Les relances partent par courriel, depuis la boîte de votre entreprise. | `:51` | C | C | **27/10, c2_48 ✔ 7/7** : CASHD abonné au dépôt en brouillon dans la boîte Gmail branchée au socle ; la relance dit « déposée en brouillon dans … : envoyez-la depuis votre messagerie », journal `cashd.brouillon_depose`, palier compté parti ; l'écran dit par quelle boîte partent les relances (`cashd_messagerie`) | Microsoft 365 (A2) ; envoi direct (portée `gmail.send`) et vérification d'application Google / Microsoft (T) ; aucun dépôt réel encore | 2 (A2) |
| C14 | Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi. | `:52` | B | B | trois paliers de validation (c2_07 ✔) | — | 0 |
| C15 | Chaque facture suit sa propre séquence, avec son palier et son échéance. | `:53` | B | B | `cashd_relances_pieces` (t3 ✔), c2_26 ✔ | — | 0 |
| C16 | Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires. | `:54` | B | B | calendrier du socle (t4 ✔) | — | 0 |
| C17 | Les comptes export reçoivent leur relance dans leur langue de facturation. | `:55` | C | C | textes et lignes de pièces dans toute langue écrite par l'organisation (c2_09 ✔) ; **27/10, c2_52 ✔ 7/7** : l'espagnol est la troisième langue par défaut (six paliers, lignes, phrases, montants) | textes espagnols à faire relire par un natif (tiers, ~150–300 €) ; hors fr / en / es, un compte reçoit l'anglais tant que l'organisation n'a pas écrit ses textes | 0,5 / langue |
| C18 | Une contestation écrite bascule la facture en litige et la sort du cycle. | `:62` | C | **B** | réponse lue par règles (sans modèle), proposition « litige » acceptée par une personne (c2_06 ✔) | — | 0 |
| C19 | Le commercial en charge du compte est notifié dès l'ouverture du litige. | `:63` | B | B | `cashd_alerter_commercial` (t4 ✔) | — | 0 |
| C20 | Une facture contestée sur une seule ligne laisse le reste en relance. | `:64` | B | B | `cashd_litige_partiel` (t4 ✔) | — | 0 |
| C21 | La reprise des relances demande une décision, jamais un simple délai écoulé. | `:65` | B | B | motif obligatoire (t3 ✔) | — | 0 |
| C22 | Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes. | `:66` | B | B | t4 ✔ | — | 0 |
| C23 | Un compte se met en pause ou sort du périmètre à tout moment. | `:67` | B | B | t3 ✔ ; écran | — | 0 |
| C24 | La mise en demeure est préparée, puis elle attend une validation explicite. | `:68` | B | B | t3 ✔, c2_25 ✔ | — | 0 |
| C25 | Le dossier de litige réunit les pièces, les envois et les accusés de réception. | `:69` | B | B | `cashd_dossier` (t4 ✔), pièces déposées (c2_06 ✔) ; accusés réels : après G16 | — | 0 |
| C26 | Le courrier recommandé électronique est préparé quand la créance l'exige. | `:70` | T | T | préparé en canal `lre` au-delà de `seuil_lre` (t4 ✔), ne part pas sans AR24 | G16 : contrat AR24 et branchement A2 | 2 (A2) |
| C27 | Un règlement enregistré interrompt la séquence avant le prochain envoi. | `:77` | B | B | t3 ✔, c2_42 ✔ | — | 0 |
| C28 | Les règlements partiels sont imputés, et le solde dû continue d'être suivi. | `:78` | B | B | c2_42 ✔ (reste dû revu), c2_45 ✔ (règlement de 0 € refusé) | — | 0 |
| C29 | Le lettrage rapproche chaque encaissement de la facture qu'il solde. | `:79` | B | B | t2 ✔ ; t1 (assertions de lettrage vertes) | — | 0 |
| C30 | Les écritures bancaires sont rapprochées de l'encours, jour après jour. | `:80` | C | C | par export du relevé (t2 ✔) | G1 : « jour après jour » suppose un dépôt quotidien | (G1) |
| C31 | Un virement sans référence est proposé au rapprochement avec les factures probables. | `:81` | B | B | `cashd_propositions` : t1, assertion 79 verte ; l'assertion 80 du même test, rouge, compte tout le client | — | 0 |
| C32 | Les avoirs et les acomptes sont déduits avant tout calcul du solde dû. | `:82` | B | B | c2_20 ✔, c2_20b ✔ | — | 0 |
| C33 | Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées. | `:83` | B | B | `cashd_penalites` (t3 ✔) | — | 0 |
| C34 | Un lien de paiement accompagne la relance et s'éteint dès le règlement. | `:84` | T | T | une adresse de paiement fixe de l'organisation dans chaque relance (c2_40 ✔) ; le lien par facture (`cashd_poser_lien`, `cashd_lien_paye`) attend un prestataire | G15 : prestataire de chaque client + ouvrier serveur et webhook | 2,5 (serveur) |
| C35 | Les factures en devise étrangère sont suivies dans leur devise et en euros. | `:85` | B | B | c2_15 ✔, c2_16 ✔ ; crons BCE actifs, mais aucune facture en devise sur la recette, donc aucun taux BCE réel rangé (`cashd_taux_change` vide) | — (le premier appel réel à la BCE se fera avec la première facture en devise) | 0 |
| C36 | Un plafond d'encours se fixe par compte, à partir de son historique. | `:92` | B | B | `cashd_proposer_plafond` (t4 ✔) | — | 0 |
| C37 | Le dépassement du plafond déclenche une alerte avant toute nouvelle commande. | `:93` | B | B | `cashd_alerter_plafonds` (t4 ✔) | — | 0 |
| C38 | Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable. | `:94` | C | **B (27/10)** | porte `cashd_verifier_commande` (t4 ✔) ; **c2_50 ✔ 14/14** : raccord générique d'un logiciel de commandes — clé par logiciel (empreinte SHA-256, révocable), `cashd_commande` sans session rend autorisée / en attente, demande de validation et alerte au commercial, `cashd_commande_etat` rend débloquée / refusée / expirée ; contrat `omega/modules/cashd/API-COMMANDES.md` ; écran Risque client | A : le logiciel de commandes d'un premier client branché sur le raccord | 0 |
| C39 | Vos règles de communication et vos interdits sont repris dans chaque message. | `:95` | B | B | t3 ✔, c2_44 ✔ (la relance revue repasse les interdits) | — | 0 |
| C40 | Un compte qui se dégrade est signalé avant que le retard s'installe. | `:96` | B | B | t4 ✔ | — | 0 |
| C41 | Un compte se met en pause, et il n'y revient que sur votre décision. | `:97` | B | B | t3 ✔ | — | 0 |
| C42 | Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées. | `:98` | C | **B** | PDF de facture, bon de livraison, bon de commande, contrat rattachés ; le dossier nomme les factures sans PDF (c2_06 ✔) | — | 0 |
| C43 | Le dossier de recouvrement judiciaire est remis complet à qui vous désignez. | `:99` | B | B | `cashd_remettre_dossier` (t4 ✔) | — | 0 |
| C44 | Le délai moyen de règlement se mesure compte par compte. | `:106` | B | B | t4 ✔ | — | 0 |
| C45 | La prévision d'encaissement est établie à trente et à soixante jours. | `:107` | B | B | t4 ✔ | — | 0 |
| C46 | Chaque relance partie est datée et consignée, avec son objet et son destinataire. | `:108` | B | B | envois + journal (t4 ✔) ; c2_37 ✔ (statut « envoyée ») | — | 0 |
| C47 | Le taux de réponse aux relances se suit palier par palier. | `:109` | B | B | vue `cashd_reponses` (t4 ✔) ; aucune réponse réelle encore | — | 0 |
| C48 | Les créances en litige, en pause et en recouvrement sont comptées en continu. | `:110` | B | B | t4 ✔ | — | 0 |
| C49 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | `:111` | B | B | arrêté mensuel (t4 ✔) ; boutons Tableur (recette écran du 26/10) | — | 0 |
| C50 | Les seuils et les cadences se modifient, et chaque changement reste daté. | `:112` | B | B | `cashd_historique_reglages` (t4 ✔), c2_10 ✔ | — | 0 |

## Les douze cas tordus (`lib/produits/capacites/relances.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| L1 | Le client a payé hier soir, et la relance était prête. | `:125` | C | C | coupure au règlement intégré (t3 ✔, c2_42 ✔) | G1 | (G1) |
| L2 | Le client conteste une seule ligne de la facture. | `:129` | B | B | t4 ✔ | — | 0 |
| L3 | Le client demande à régler en plusieurs fois. | `:133` | B | B | t4 ✔ ; échelonnement proposé (c2_05 ✔) | — | 0 |
| L4 | Votre interlocuteur a quitté l'entreprise du client. Le rejet du message ou la réponse d'absence définitive signale l'adresse. | `:137` | C | **B** | la réponse « a quitté l'entreprise » est lue et proposée en « attente de contact » (c2_06 ✔) ; le rejet par rebond (`cashd_suivre_envoi`) ne se prouve qu'après un vrai envoi (→ A) | — | 0 |
| L5 | Deux filiales du même groupe client doivent être relancées séparément. | `:141` | B | B | un compte par entité (t1, assertions vertes) ; tableau par entité (t4 ✔) | — | 0 |
| L6 | Un virement arrive sans aucune référence … Tant que l'imputation n'est pas tranchée, la séquence du compte est suspendue. | `:145` | B | B | t3 ✔ ; c2_22 ✔ (raison dite) | — | 0 |
| L7 | Le montant restant dû est de quelques euros. Un seuil de relance se fixe par entité … | `:149` | C | **B** | seuil par entité ; solde abandonné ou réclamé, motivé (c2_05 ✔) | — | 0 |
| L8 | Le client est aussi l'un de vos fournisseurs. Le compte est signalé comme réciproque et sort du cycle automatique. | `:153` | B | B | `reciproque` exclu (t3 ✔), c2_44 ✔ | — | 0 |
| L9 | Le dossier est passé entre les mains d'un avocat … toute relance commerciale cesse, y compris celle qui était déjà rédigée. | `:157` | B | B | `cashd_remettre_dossier` (t4 ✔) | — | 0 |
| L10 | Le client demande expressément l'arrêt des relances … le journal garde la trace des deux décisions. | `:161` | B | B | `hors_perimetre` + journal (t3 ✔) | — | 0 |
| L11 | Le devis a été accepté de vive voix … Vous consignez l'accord oral, ce qui arrête la relance et ouvre le suivi de la facturation à venir. | `:165` | C | **B** | accord oral : cadence arrêtée, point du matin si rien n'est facturé (c2_05 ✔) | — | 0 |
| L12 | La facture attend un bon de commande chez le client … la relance vise le service qui doit émettre ce bon. | `:169` | D | **B** | relance au service émetteur tous les 7 jours, par la file (c2_05 ✔) | — | 0 |

## À l'échelle d'un groupe (`lib/produits/capacites/relances.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| E1 | Chaque société, filiale ou site a son encours … un chargé de recouvrement ne voit que son portefeuille. | `:185` | C | **B (27/10)** | portefeuille par chargé (c2_08 : politiques RLS restrictives sur 7 tables) ; **c2_08 ✔ 14/14** depuis le 26/10 (9f60d964 : le jeu NOBAT du banc compté à part, aucune ligne du banc touchée), rejoué vert le 27/10 | — | 0 |
| E2 | Suivi, validation des relances, gestion des litiges et administration sont quatre rôles distincts. Une délégation se pose pour une absence et s'éteint à la date prévue. | `:191` | B | B | rôles du socle ; CASHD exige gestion / validation (t3 ✔, c2_07 ✔) | — | 0 |
| E3 | Le montant et le palier décident de qui valide : le chargé de compte, le responsable crédit, la direction financière. | `:197` | C | **B** | trois paliers {montant, rôles} écrits en règles de validation du socle (c2_07 ✔) | — | 0 |
| E4 | … un journal qui ne se modifie pas, y compris par nous. | `:203` | C | C | journal opposable du socle, protégé contre l'écriture | G18 : un administrateur de la base peut encore le modifier ; chaînage + export horodaté, ou reformuler | 1 (socle) |
| E5 | Le système lit votre facturation et vos encaissements là où ils vivent déjà, tableur compris. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation. | `:209` | C | C | dépôt de fichiers (t2 ✔) | G1 ; G12 : interface de programmation offerte à un tiers | 2 (socle) + (G1) |
| E6 | Encours, balance âgée, délai moyen de règlement et prévision d'encaissement se lisent par société et en consolidé, avec un export daté. | `:215` | B | B | `cashd_tableau(p_client, p_entite)`, arrêtés (t4 ✔) | — | 0 |

## Accueil, /offres, articles

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| M1 | À 7 h, vos relances sont déjà écrites. — Il vérifie vos factures chaque matin. Vous choisissez les relances à envoyer. | `app/page.tsx:696-698` (réécrit le 21/10) | C | C | voir P4, P5 | G1 | (G1) |
| M2 | Les relances partent au bon moment et s'arrêtent dès que le client paie. | `app/page.tsx:297` (réécrit le 21/10) | C | C | voir P23 | G1 : « dès que le client paie » = dès que le règlement est connu de CASHD | (G1) |
| M3 | Pour les PME et les groupes : on relance les impayés, on répond aux demandes, on fait revenir les anciens clients et on classe vos documents. Sur les outils que vous avez déjà. | `app/page.tsx:201` (réécrit le 21/10) | C | C | voir P3 | G1, G4 | (G1, G4) |
| M4 | CASHD — Relance des devis · Relance des factures échues · Gradation par montant · Validation avant envoi | `app/offres/page.tsx:381-384` | C | **B** | gradation par montant : c2_33 ✔ ; le reste t3 ✔ | — | 0 |
| M5 | relance graduée, rédigée au cas par cas selon le montant en jeu, l'ancienneté du retard et l'historique du compte. — Relance à J+3, J+7, J+21, aucun envoi sans votre validation. | `lib/content.ts:112-113` | C | **B** | c2_30 ✔, c2_33 ✔, c2_10 ✔ (J+3 devis, J+7 et J+21 factures), t3 ✔ | — | 0 |
| M6 | CASHD relance aux bonnes dates avec des messages que le dirigeant valide, en proposant le règlement au comptoir, par virement ou en plusieurs fois. Chaque matin, le point du jour … | `lib/content.ts:260` | C | **B** | moyens de règlement dans le texte (c2_38 ✔), échelonnement (c2_05 ✔), point du matin (c2_13, posé ; t3 ✔) | — | 0 |
| M7 | … un message de suivi part, formulation cordiale, jamais le mot « relance », en proposant de passer voir le chantier ou de caler une date … vocabulaire du métier … le dirigeant valide le ton une fois pour toutes. | `lib/content.ts:287` | C | **B** | textes « btp » des devis (« passions voir les lieux », « caler une date d'intervention », c2_04) ; c2_05 ✔, c2_28 ✔ | — | 0 |
| M8 | rappel à l'échéance, relances progressives, proposition d'échelonnement pour les gros montants, et mise en demeure uniquement sur validation expresse du dirigeant. | `lib/content.ts:291` | C | **B** | texte du jour d'échéance (c2_14 ✔), échelonnement au-delà d'`echelonnement_des` (c2_05 ✔), mise en demeure (c2_25 ✔) | — | 0 |
| M9 | *(ajoutée)* L'espace client Omega : qui doit de l'argent, où en est la relance, et l'encours échu au total. | `app/page.tsx:1003` (texte de l'image) | — | B | tableau de bord /espace2/cashd : débiteurs, état des relances, encours échu au pied de la grille (recette `recette-cashd.mjs` 298/298 du 26/10, C2, données d'exemple ; portes rejouées sous RLS sur le banc) | — | 0 |
| M10 | *(ajoutée)* Un système comme CASHD ne se fatigue pas et n'oublie rien : devis relancé à J+3 puis J+7, facture échue relancée à J+7 puis J+21, mise en demeure préparée au-delà, chaque message adapté à l'ancienneté du retard, chaque envoi soumis à votre validation. | `lib/content.ts:428` | — | B | c2_10 ✔, c2_30 ✔, c2_24 ✔, t3 ✔ | — | 0 |

## Lacunes encore ouvertes au 26/10 (chacune comptée une fois)

Fermées depuis le 06/10 (test vert le 26/10) : G2, G3 (sauf la répétition, P12), G5, G7, G8, G9, G11, G14 (l'écran ;
les captures restent à la vitrine), G17, G20, G21. **Le 27/10** : G10 (E1), P12, G19 (côté CASHD), et la part CASHD de G4 et G13 ;
l'espagnol pour G6.

| Lacune | Ce qui manque, en une phrase | j → B | Qui | Tiers | Promesses |
|---|---|---|---|---|---|
| G1 | Faire arriver le facturier chaque jour : aujourd'hui, CASHD relit le dernier export déposé. | 3 | A1 | OAuth Google / Microsoft selon la source ; un premier client | P2, P3, P5, P8, P17, P23, P36, P41, C1, C4, C30, L1, E5, M1, M2, M3 |
| G4 | ~~Abonner CASHD au dépôt dans la boîte de l'entreprise~~ (fait 27/10, c2_48 ✔) ; brancher Microsoft 365. | 2 | A2 | vérification d'application Google et Microsoft (plusieurs semaines) | P3, C13, M3 |
| G13 | ~~Brancher le canal WhatsApp de CASHD~~ (fait 27/10, c2_51 ✔) ; expéditeur WhatsApp du module CASHD et approbation du modèle chez Meta. | 1 | A2 | compte Meta vérifié, ~0,05–0,10 € par conversation | P3 |
| P12 | ~~Garder la trace des textes reçus par compte et ne jamais répéter un texte mot pour mot.~~ Fait 27/10 (c2_49 ✔). | 0 | — | — | P12 |
| G6 | Espagnol écrit le 27/10 (c2_52 ✔) ; le faire relire, puis les autres langues de facturation. | 0,5 / langue | C2 + traducteur | traduction relue ~150–300 € par langue | C17 |
| G14 | Refaire les quatre captures de la page depuis l'écran réel. | 0,5 | vitrine | — | P26 |
| G19 | ~~Raccord du logiciel de commandes~~ : raccord générique fait le 27/10 (c2_50 ✔) ; brancher le logiciel d'un premier client dessus (A). | 0 | client | un premier client | C38 |
| G10 | ~~Rendre `test_c2_08_portefeuille` vert~~ : vert depuis le 26/10 (borné, jeu NOBAT gardé). | 0 | — | — | E1 |
| G18 | Rendre le journal infalsifiable même par nous (chaînage + export horodaté), ou reformuler. | 1 | socle | horodatage qualifié éventuel | E4 |
| G12 | Offrir à un tiers une interface de programmation documentée (clés, quotas). | 2 | socle | — | E5 |
| G15 | Créer le lien de paiement par facture chez le prestataire du client et recevoir son webhook. | 2,5 | serveur | Stripe ~1,5 % + 0,25 € par carte UE ; SEPA ~0,35 € | C34 (T) |
| G16 | Brancher AR24 pour la lettre recommandée électronique (CASHD la prépare déjà). | 2 | A2 | contrat AR24, prix par envoi | C26 (T) |
| G22 | Confirmer la région d'hébergement et écrire les CGV, le DPA et l'engagement d'assistance. | 0 | Teo | — | P27, P28–P31 |
| **Total → B** | (hors G15, G16, G22, qui portent des lignes T) | **≈ 14** | CASHD ≈ 4,75 · autres ≈ 9 · vitrine 0,5 | | |

## Passage à A (inchangé)

Pilote chez un premier client : installation, lecture de SON export, réglage des textes, premier envoi validé, un
cycle complet J+7 → J+30, puis les cas rares provoqués avec lui. ≈ 13 j de travail sur 30 à 45 jours de calendrier
(détail dans la version du 06/10, `d7391be1`).

## Écarts de texte encore ouverts (rien à construire)

- **P26** : les captures sont présentées « telles quelles », mais elles viennent de la maquette.
- **P38** : « transmet à un modèle », alors qu'aucun modèle n'est appelé.
- **P27** : « Vos données restent chez vous », alors qu'elles sont dans la base d'Omega, isolées par organisation.
- **C10 et P21** : le moteur relance le devis à J+7 après l'envoi. La page dit « J+3 puis J+7 », ce qui est juste.
  Le catalogue dit « sept jours après ce rappel », soit J+10, ce qui est faux depuis c2_10. C'est l'inverse de
  l'écart du 06/10.
- **Résorbé** : « rappel à l'échéance » (M8), grâce à c2_14.
