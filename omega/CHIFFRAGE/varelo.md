# Chiffrage — Varelo, /secteurs/groupes (B1, 06/10/2026, 20 h 30 Z)

Demande de Teo (06/10, 19 h 50 Z) relayée par le coordinateur : estimer ce qui reste à construire pour un
produit vraiment livrable, et vérifier chaque promesse, même petite. **Lecture seule** : aucun fichier du
site public n'a été touché. Le texte chiffré est celui de main `c0494b4` (la vitrine de 15 h 55, qui dit à
nouveau « branche la même IA sur les logiciels »). Écart relevé : **omegaai.fr sert encore, à 20 h 25 Z, la
version d'après** (« Chaque société dépose l'export de son logiciel… » ; « La lecture automatique des
sources, avec l'accord de la DSI, est en préparation »). Le prochain déploiement de main remettra donc les
phrases chiffrées ci-dessous.

## Synthèse

1. **Par état** (39 lignes) : A 2 (une statistique sourcée, les liens qui répondent) · B 15 · C 17 · D 2 ·
   T 1, plus deux lignes mixtes (B/C, C/T). Aucune fonction Varelo n'est prouvée **en vrai** : tout le B
   tourne sur la recette, sur des données fictives (banc « Groupe Sogexal » et `tests.jeu()`). Seuls
   b1_01 à b1_03 sont prévus en production (au gel, avec A5).
2. **Jours → B** : **≈ 33 jours** pour tenir à la lettre ce qui est C ou D, ou **≈ 28** si
   « branche… sur les logiciels » redevient « dépose l'export ». Le gros morceau est « une seule IA »
   (≈ 8 j, voir l'avis). « Vos propres serveurs » est hors de ce compte (10 à 15 j avec A5).
3. **Jours B → A** : **≈ 8 jours** de travail (production, essai à blanc sur de vrais exports, mise en
   route d'un premier groupe), plus le **trimestre de pilote** que la page promet (calendaire).
4. **Tiers et achats** : un contrat de modèle de langage hébergé dans l'UE, sans entraînement, avec DPA (pour
   « une seule IA ») ; les accès partenaires aux API des logiciels (Pennylane, Cegid, Sage) si l'on veut
   « brancher » au lieu de « déposer l'export » ; les éditeurs de caisses ; un hébergement chez le client
   si « vos propres serveurs » reste écrit.
5. **Pour un premier groupe réel** : poser b1_04 à b1_14 en production ; un vrai export de chaque logiciel
   du groupe pour l'essai à blanc du lecteur (mes en-têtes sont des hypothèses) ; les comptes et équipes
   (gérant, DF, DJ, DO) ; les réglages du point du matin (heure, destinataires) ; un premier lot de
   référentiel validé par la DF ; la saisie des contrats tacites et des reportings. Pas d'achat
   nécessaire si l'on s'en tient aux exports déposés.
6. **Avis honnête** : le cœur promis (référentiel, encours, contrats, réserves, reportings, page du groupe,
   point du matin) est construit et testé, mais seulement sur la recette. Les mots « IA » et « branche »
   promettent plus que ce qui existe : aujourd'hui Varelo calcule et range ; il ne converse pas, et il lit
   des exports déposés, pas les logiciels eux-mêmes. Les caisses, « vos propres serveurs » et les décisions
   validées depuis le point du matin ne sont pas faits. Je recommande la formulation de la version d'après
   (« dépose l'export ») tant que l'assistant et les connecteurs n'existent pas.

## Légende

**A** prouvé en vrai (production, vraies données ou page servie) · **B** construit et testé sur la recette
(test cité) · **C** partiel · **D** pas construit · **T** dépend d'un tiers, d'un compte ou d'un achat de
Teo. Jours : **→B** pour arriver à B, **→A** de B à A. Un jour = une journée d'ouvrier, recette comprise.
Fichiers : `components/secteurs/groupes/textes.ts` (T), `app/secteurs/groupes/page.tsx` (P),
`lib/secteurs.ts` (L), tous lus à `c0494b4`.

## Les promesses

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 1 | « Varelo · une seule IA pour tout le groupe » / « Une seule IA pour tout le groupe. » | P:49 ; T:59 | C | Un seul socle et un seul espace pour toutes les sociétés (RLS par société, b1_01, tests b1_01..06). | Pas d'« IA » qu'une équipe interroge : Varelo calcule (règles, rapprochements) et le lecteur d'A1 lit les pièces. Il faut un assistant qui réponde sur les données du groupe, au périmètre de la personne, journalisé. | →B 8 ; →A 1 | Modèle de langage hébergé UE, DPA, sans entraînement |
| 2 | « Varelo branche la même IA sur les logiciels et les tableurs de chaque société, en lecture seule. » | T:61 | C | Lecture seule par construction : exports déposés et lus d'après `modeles_jeux` (b1_10, b1_14 ; tests b1_13, b1_17 verts) ; lecteur-exports d'A1 déployé. | « Branche… sur les logiciels » : aucun connecteur direct. Aujourd'hui la société dépose ou envoie son export. Connecteur API Pennylane d'abord (≈ 3 j), essai à blanc sur de vrais exports Sage/EBP/Cegid (≈ 2 j). | →B 5 ; →A 2 | Accès partenaire API (Pennylane, Cegid, Sage) |
| 3 | « Chaque matin, elle dit à chaque direction ce qu'elle doit décider. » | T:61 | B | Point du matin par direction : sections déposées dès 5 h au gérant, à la DF, à la DJ et à la DO (b1_07..b1_11, tests b1_10, b1_14_matin) ; assemblage et remise par le socle. | Remise par courriel jamais faite pour un client Varelo. | →A 0,5 | — |
| 4 | Image : « Le point du matin d'une direction financière : trois décisions à valider, chacune avec son calcul, et la facture de la première rapprochée de son bon de livraison. » | T:72 | D | Les lignes Varelo informent, mais rien ne s'y valide. Le rapprochement facture ↔ bon de livraison n'est pas dans Varelo. | Décisions validables depuis le point (dénoncer, protester, relever un plafond → `demandes_validation`, ≈ 3 j). Rapprochement facture FILED ↔ bon de livraison lu par A1 (≈ 3 j, avec A4). | →B 6 ; →A 1 | — |
| 5 | Image : « Le référentiel du groupe : les codes de chaque société rangés sous un seul nom de client, de fournisseur ou d'article. » | T:78 | B | b1_01..03, 14/14 tests ; relu en base réelle sur le banc de la recette (gérant, référent, DF) ; écran en ligne. | Un vrai groupe. | →A 2 | — |
| 6 | « D'après Microsoft et LinkedIn, 78 % des salariés qui se servent de l'IA au travail y viennent avec leurs propres outils. » | T:92 | A | Work Trend Index 2024 (Microsoft et LinkedIn) : 78 % des utilisateurs d'IA apportent leurs propres outils. | La source n'est pas citée sur la page. | 0 | — |
| 7 | « En France, 9 % seulement des salariés disent que leur entreprise leur a mis une IA à disposition. » | T:92 | C | Source non retrouvée dans le dépôt. | Sourcer le chiffre, ou le retirer. | 0,25 | — |
| 8 | « Varelo réunit ces usages sur un seul socle. La même IA lit les logiciels et les tableurs de toutes les sociétés, en lecture seule, et range leurs données sous un seul référentiel. » | T:103 | C | Référentiel unique et lecture des exports (b1_01..03, b1_10, b1_14). | « La même IA lit les logiciels » : voir 1 et 2. | (compté en 1, 2) | — |
| 9 | « Une règle s'écrit une fois pour le groupe et s'applique dans chaque filiale, qu'il s'agisse d'un délai de réserve, d'un préavis de contrat ou d'un seuil d'encours. » | T:104 | C | Seuil d'encours : plafond posé une fois par objet du groupe (b1_04, test b1_07). Délai de réserve : règles légales du socle (`regles_delais`, b1_11), fériés du territoire. | Le groupe ne peut pas écrire sa règle : un délai interne de réserve, un préavis ou un plafond par défaut se règlent contrat par contrat ou client par client. Il faut des réglages Varelo du groupe, appliqués partout, avec un écran. | →B 3 ; →A 0,5 | — |
| 10 | « Chaque matin, la présidence lit le groupe sur une page, et chaque direction reçoit ses décisions avec le calcul et la pièce qui les justifient. » | T:105 | C | Page du groupe (b1_08, test b1_11) ; calcul dit dans les écrans (date limite et son détail, écarts). Pièces : photos et bon de livraison d'une réception (b1_12, b1_13). | Les lignes du point ne portent ni le calcul ni la pièce. Un contrat n'a pas de pièce jointe : ajouter le PDF du contrat et le lien vers la pièce dans la ligne. | →B 2 ; →A 0,5 | — |
| 11 | Image : « Un assemblage d'écrans de Varelo : les sociétés d'un pôle, les clients du groupe, une règle de calcul, les pièces, le point du matin d'une direction et ses commentaires. » | T:112 | C | Pôles et sociétés, clients du groupe, pièces, point du matin : oui. | Les commentaires sur une ligne du point : non trouvés dans le socle ni dans Varelo. | →B 1 | — |
| 12 | « Chaque matin à 7 h, chaque direction reçoit : » | T:118 | B | Sections déposées dès 5 h (cron `varelo-matin`, toutes les 30 min) ; le socle assemble (cron `omega-points-assemblage`, toutes les 5 min) et remet à l'heure réglée du client. | Remise réelle à 7 h jamais observée pour Varelo. | →A 0,5 | — |
| 13 | « Le groupe sur une page » ; image : « La page du groupe : ventes, trésorerie et écarts de chaque société, sur une seule page. » | T:127, 132 | B | b1_08 (balances générales, objectifs, trésorerie, écarts ; test b1_11 vert ; recette cinq largeurs). | Une balance générale réelle par société (export ou dépôt). | →A 1 | — |
| 14 | « Les contrats à dénoncer » ; « Les contrats du groupe à reconduction tacite, chacun avec sa date limite de dénonciation. » ; « La fiche d'un contrat : société, échéance, préavis et date limite pour le dénoncer. » | T:137–148 | B | b1_05 (registre, échéancier, cron `varelo-contrats`, alerte J-7 ; test b1_08). | Saisie à la main : rien ne lit un contrat PDF. Ce n'est pas promis, mais c'est utile. | →A 1 | — |
| 15 | « Les réserves à émettre » ; « Une livraison reçue avec avarie : le transport, les colis et les photos du constat. » | T:152–157 | B | b1_11, b1_12, b1_13 (tests b1_14, b1_15, b1_16 verts) ; bon de livraison lu par le lecteur v27 d'A1. | Une vraie livraison, de vraies photos. | →A 1 | — |
| 16 | « Le compte à rebours de la réserve : trois jours pour l'adresser au transporteur. » | T:163 | B | Routier : 3 jours ouvrables (L133-3) ; CMR 7, maritime 3, aérien 14 ; fériés du territoire (test b1_14). | — | →A 0 | — |
| 17 | « Les reportings dus » ; « Les reportings attendus par chaque marque, rangés par échéance. » | T:167–172 | B | b1_09 (obligations, échéances, retards ; test b1_12). | Le reporting lui-même n'est pas produit : seule l'échéance est suivie. | →A 0,5 | — |
| 18 | Carrousel DSI : « Chaque filiale a pris son propre assistant d'IA, et les données du groupe circulent dans des outils que la DSI n'a pas choisis. » → « Une seule IA pour le groupe » | T:191–193 | C | Voir 1. | Voir 1. | (en 1) | (en 1) |
| 19 | Carrousel présidence : « Chaque société envoie son reporting à sa façon, et le chiffre du groupe arrive en retard. » → « Le groupe sur une page » | T:197–199 | B | Voir 13. | — | (en 13) | — |
| 20 | Carrousel DJ : « Le contrat se renouvelle seul si personne ne le dénonce, et sa date est ailleurs. » | T:203 | B | Voir 14. | — | (en 14) | — |
| 21 | Carrousel DO : « Sans réserve envoyée au transporteur sous trois jours, l'avarie devient une perte. » | T:209 | B | Voir 15–16. | — | (en 15) | — |
| 22 | Carrousel DF : « Le même client porte trois noms dans trois sociétés, et personne ne voit son encours. » → « Un seul référentiel » | T:215–217 | B | b1_01..03 et b1_04 (encours du groupe). | — | (en 5) | — |
| 23 | « La DSI garde la main sur l'IA du groupe » | T:229 | C | Portes et droits par rôle ; journal. | Pas de rôle ni d'écran DSI : seuls le gérant ou l'administrateur branchent. | (en 25) | — |
| 24 | « Varelo lit vos logiciels de gestion, vos caisses et vos tableurs sans jamais rien y écrire. » | T:237 | C | Logiciels de gestion et tableurs par leurs exports (voir 2). | **Caisses : rien.** Il faut des modèles « ventes de caisse / Z » et les exports des éditeurs de caisse. | →B 3 ; →A 1 | Éditeurs de caisse (formats, accès) |
| 25 | « Chaque source se branche avec l'accord de la DSI et se débranche de la même façon. » | T:237 | C | `public.brancher` (socle), réservé au gérant ou à l'admin ; écran Exports automatiques (b1_10). | Accord DSI (demande de validation à l'équipe DSI) et **débrancher** : le statut `debranche` existe au socle, mais il n'y a ni porte ni bouton. | →B 1,5 ; →A 0,5 | — |
| 26 | Image : « Les sources d'une société branchées en lecture seule : logiciel de gestion, caisses, tableurs et documents. » | T:243 | C | Logiciel, tableurs, documents (bon de livraison, photos). | Caisses (voir 24). | (en 24) | — |
| 27 | « Chaque client, fournisseur ou article reçoit un seul nom pour tout le groupe, rattaché aux codes de chaque société. » | T:249 | B | b1_01..03 (14/14). | — | (en 5) | — |
| 28 | « L'IA raisonne donc sur les mêmes données dans toutes les filiales. » | T:249 | C | Mêmes données : oui. « L'IA raisonne » : voir 1. | Voir 1. | (en 1) | — |
| 29 | Image : « Un même client inscrit sous trois noms dans trois sociétés, rangé sous un seul nom avec son encours total. » | T:255 | B | b1_04 (encours par objet du groupe, plafond ; test b1_07). | — | (en 5) | — |
| 30 | « Rien ne part sans l'accord de la direction concernée, décision par décision. » | T:261 | C | Corrections du référentiel par demande de validation (séparation saisie / approbation, double approbation IBAN ; b1_02, b1_03). Varelo n'envoie rien dehors (la lettre de réserve se copie). | Dénonciation de contrat, protestation et plafond sont notés directement par le décideur, pas proposés puis validés. | (en 4) | — |
| 31 | « Chaque proposition arrive avec son calcul et sa pièce, et le journal garde qui a validé quoi. » | T:261 | C | Journal opposable : oui (toutes les portes). Calcul : oui pour les paires du référentiel (preuve). | Pièce jointe aux propositions hors référentiel (voir 10). | (en 10) | — |
| 32 | Image : « Une décision proposée à la direction juridique, avec son calcul, en attente de sa validation. » | T:267 | D | Rien ne propose une dénonciation à valider par la DJ. | Voir 4 (décisions validables). | (en 4) | — |
| 33 | « Les données restent dans l'Union européenne ou sur vos propres serveurs, chiffrées, et chaque lecture est inscrite au journal. » | T:273 | C / T | UE et chiffrement : hébergement du socle (réglage de Teo). Journal des lectures du référentiel (b1_06, test des lectures journalisées). | « Vos propres serveurs » : aucune offre d'hébergement chez le client (≈ 10–15 j avec A5, hors chiffrage). « Chaque lecture » : les lectures d'écran ne sont pas toutes journalisées (≈ 1,5 j). | →B 1,5 (+ 10–15 si serveurs du client) | Hébergement client, contrat UE |
| 34 | « Aucune d'elles ne sert à entraîner un modèle. » | T:273 | T | Vrai aujourd'hui : Varelo n'envoie aucune donnée à un modèle. | Le prouver par contrat dès qu'il y aura un assistant (voir 1). | 0 | DPA du fournisseur de modèle |
| 35 | Image : « Les réglages d'hébergement et le journal : données dans l'Union européenne, chiffrées, chaque lecture tracée. » | T:279 | C | Page publique « Où vivent vos données » ; journal dans l'espace (A3). | Un écran de réglages d'hébergement propre au client : non vérifié, probablement absent. | →B 1 | — |
| 36 | « Nous commençons par un pôle, une société et une direction. Le pilote se juge sur un trimestre complet, avec ses clôtures, ses échéances et ses chiffres réels. » | T:289 | B | Pôles, sociétés et équipes de direction existent (b1_01). | Le pilote lui-même. | →A (le trimestre) | — |
| 37 | « Chaque société suivante se branche ensuite sur le même socle : elle reprend le référentiel, les règles et l'IA déjà validés, d'un territoire à l'autre. » | T:290 | B / C | Ajout de société au groupe, fériés par territoire (Guadeloupe, Martinique…). | « Les règles » : voir 9 ; « l'IA » : voir 1. | (en 1, 9) | — |
| 38 | Liens « Réserver un audit », « Où vivent vos données » | T:62, 238, 294–295 | A | `curl` 20 h 25 Z : 200 sur /reserver-un-audit et /vos-donnees. | — | 0 | — |
| 39 | Catalogue : « Chaque matin à 7 h, chaque direction reçoit au plus trois décisions, et la présidence une page : les ventes, la trésorerie et les échéances de chaque société. » | L:157 | C | Point du matin et page du groupe (voir 3, 13). | « Au plus trois décisions » : Varelo n'en limite ni n'en classe le nombre (jusqu'à 15 lignes par bloc). À limiter ou à reformuler. | →B 0,5 | — |

« Se combine avec » (L:160–161), affiché en bas de la page : « Les factures fournisseurs de chaque société
lues, contrôlées, transmises à sa comptabilité » (FILED) et « Les encours clients de chaque société suivis
et relancés selon les règles du groupe » (CASHD). Ces deux promesses sont chiffrées par leurs ouvriers
(A4, C2) : je ne les compte pas ici.

## Les jours, ligne par ligne

→B : 8 (IA, 1) + 5 (connecteur Pennylane et essai à blanc, 2) + 6 (décisions validables et facture ↔ bon
de livraison, 4) + 0,25 (source, 7) + 3 (règles du groupe, 9) + 2 (calcul et pièce dans le point, 10) + 1
(commentaires, 11) + 3 (caisses, 24) + 1,5 (accord DSI et débrancher, 25) + 1,5 (journal de chaque
lecture, 33) + 1 (écran d'hébergement, 35) + 0,5 (au plus trois, 39) = **≈ 33 j**, ou **≈ 28 j** si
l'on reformule la ligne 2 en « dépose l'export » (sans connecteur ni essai à blanc à ce stade). Hors
chiffrage : « vos propres serveurs » (10 à 15 j, avec A5).

→A : production b1_04 à b1_14 (1) + essai à blanc sur les vrais exports du groupe (2) + mise en route
(comptes, équipes, réglages du point, premier lot du référentiel validé, contrats et reportings saisis :
3) + suivi des deux premières semaines (2) = **≈ 8 j**, puis le trimestre de pilote.
