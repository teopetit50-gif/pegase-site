# Chiffrage FILED — ce qui reste pour un produit livrable (A4, 06/10/2026, relevé sur main c0494b4)

## Synthèse (6 lignes)

1. **Le moteur est construit et testé sur la recette** (lots a4_01 → a4_32, 64 fonctions pgTAP vertes, plus de 300 assertions) : lecture intégrée, contrôles, circuit de validation, écritures et FEC, archivage, pilotage, reprise, envoi comptable. **Rien n'est en production, et une seule vraie facture est passée de bout en bout** (F-2026-0413, recette). En état A (prouvé en vrai) : 4 lignes ; en B : 64 ; C : 22 ; D : 12 ; T : 15.
2. **Trous de produit (D), environ 34 jours** : facturation du client et quotas par palier (A5), export de sortie complet, espace multi-dossiers pour les cabinets, « rédige ce qui repart », notes de frais, connexion d'une messagerie existante (aujourd'hui : adresse dédiée seulement), durées d'historique.
3. **Contradictions sur la page même, à trancher par Teo avant toute vente** (aucun jour de code) : « il n'écrit à personne / accès en lecture seule » contre l'envoi API vers la comptabilité et les statuts de la plateforme agréée (voie 1) ; « FILED ne vend pas la mise en conformité » contre la voie 1 ; photo « lue quand même » contre « part en anomalie » ; découpage « n'existe pas encore » (faux depuis a4_21) ; devise « sans conversion » (faux depuis a4_22/a4_27) ; « rien dans votre plan comptable » contre la reprise FEC ; exercice « à votre comptabilité de décider » contre l'orientation automatique ; « historique de trois mois » contre l'archivage probant de dix ans.
4. **Passage B → A, environ 18 jours** : pose en production (3 j), puis un pilote réel sur des pièces d'un vrai client (10 j : lecteur, contrôles, circuit, FEC relu par un expert-comptable), plus les petits écarts que le pilote révèle (5 j).
5. **Tiers et comptes de Teo (T)** : clé Sirene (gratuite), application HMRC (gratuite), cours BCE (gratuit), applications QuickBooks / Pennylane / Cegid (partenariats ; Cegid via un référent partenaire), vérification Google (scope Gmail restreint : audit de sécurité CASA, **environ 500 à 4 500 $ par an**) et Microsoft pour lire une boîte existante, plateforme agréée en marque blanche (voie 1 : contrat et coût par flux à négocier), prix des paliers.
6. **Total pour « vraiment livrable »** : environ **34 j (D) + 21 j (C) + 18 j (B → A) ≈ 73 jours de travail**. Les comptes tiers se font en parallèle, avec les délais des éditeurs (2 à 8 semaines pour Google et Intuit en production).

Légende de l'état : **A** prouvé en vrai · **B** construit et testé sur la recette · **C** partiel · **D** pas construit · **T** tiers, compte ou achat de Teo. Jours : « → B » = de l'état actuel jusqu'à B ; « → A » = de B jusqu'à A, hors pilote commun (ligne 0).

Fichiers lus : `lib/produits/factures.ts` (noté `fac`), `lib/produits/capacites/factures.ts` (`cap`), `app/offres/factures-fournisseurs/page.tsx` (`page`), `components/produits/factures/Bento.tsx` (`bento`), `Francais.tsx` (`fr`), `Paliers.tsx`, `Maquettes.tsx`, `app/page.tsx` (`accueil`), `app/offres/page.tsx` (`offres`), `lib/content.ts` (`content`).

## 0. Commun à toutes les lignes

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 0.1 | (tout FILED) | — | B | recette : a4_01 → a4_32 posés, `^test_a4_` 64/64 | Pose en production des 32 lots et des migrations du socle F1–F3, dans l'ordre, puis tests verts en production | 0 / 3 | — |
| 0.2 | (tout FILED) | — | B | une vraie facture (F-2026-0413) passée sur la recette | Pilote sur 200 à 500 pièces réelles d'un client (formats variés), FEC relu par un expert-comptable | 0 / 10 | honoraires de l'expert-comptable (½ j) |
| 0.3 | (tout FILED) | — | — | — | Écarts révélés par le pilote | 0 / 5 | — |

## 1. Héros, bandeau, principe (`lib/produits/factures.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 1 | « Vos équipes ne ressaisiront plus une seule facture. » | fac:49-50 | C | lecture et intégration (socle F2, A1), a4_11 | Vrai pour les pièces lues ; la ressaisie reste pour ce qui part en anomalie (champs manquants, valeurs non sûres) | 0 / pilote | — |
| 2 | « Vous connectez une messagerie. C'est la seule chose à faire. » | fac:51 | C | réception par adresse dédiée (`factures@recu.omegaai.fr`, socle 18a) + a4_20 | « Connecter **sa** messagerie » (Gmail, Outlook) en lecture n'existe pas : il faut un connecteur OAuth et un relevé périodique. Aujourd'hui, le client transfère vers l'adresse dédiée. Il faut aussi installer FILED (`filed_installer`, exercice, plan) : ce n'est pas « la seule chose » | 6 / 1 | Google : vérification de l'appli + audit CASA (scope restreint), ~500–4 500 $/an ; Microsoft : vérification d'éditeur (gratuite) |
| 3 | « FILED lit chaque pièce qui arrive, recoupe ses montants et la classe jusqu'au dossier de votre comptabilité. » | fac:52 | B | lecteur (A1) + `filed_controler_facture` (a4_11) + écritures (a4_17) + export (a4_25) | — | 0 / 0,5 | — |
| 4 | Bandeau : « PDF » | fac:69 | A | F-2026-0413 lue en vrai | — | 0 / 0 | — |
| 5 | « Scan » | fac:70 | B | lecteur (A1) | Preuve sur un vrai scan | 0 / 0,5 | — |
| 6 | « Photo prise sur le parking » | fac:71 | C | lecteur (A1) lit les images | Contredit le cas limite cap:123-124 (« part en anomalie »). Trancher, puis prouver | 0,5 / 0,5 | — |
| 7 | « Pièce jointe » | fac:72 | B | a4_20 (courriel → document) | — | 0 / 0,5 | — |
| 8 | « Montant écrit dans le corps du mail » | fac:73 | C | a4_20 : un courriel sans pièce lisible lève une alerte « à lire » | Le corps du mail n'est **pas lu** comme une facture : contredit FAQ fac:268, cohérent avec cap:119-120 (anomalie). Trancher le texte | 0 / 0 (texte) | — |
| 9 | « Facture-X » | fac:74 | B | a4_16 (la valeur XML fait foi), lecteur | Preuve sur un vrai Factur-X | 0 / 0,5 | — |
| 10 | « Ticket de caisse froissé » | fac:75 | C | lecteur A1 (ligne cap:32, `atteste: false`) | Rattachement d'un ticket à une dépense sans fournisseur identifié : à préciser | 2 / 0,5 | — |
| 11 | « Avoir » | fac:76 | B | `nature = avoir` (socle), écritures inversées (a4_17), rapprochement d'avoir (a4_08) | — | 0 / 0,5 | — |
| 12 | « Relevé » | fac:77 | C | nature `releve` reconnue et classée (socle) | Classé seulement : aucun rapprochement relevé ↔ factures | 4 / 0,5 | — |
| 13 | « Note de frais » | fac:78 | D | — | Pas de nature « note de frais », pas de circuit salarié ni de remboursement | 6 / 1 | — |
| 14 | « Facture écrite à la main » | fac:79 | C | lecteur A1 (ligne cap:32, `false`) | Preuve sur des manuscrits réels (A1) | A1 / 0,5 | — |
| 15 | « Plusieurs pièces dans un même fichier » | fac:80 | B | a4_21 + lecteur v24 (découpage) | Passer une vraie pièce multi-factures sur le banc | 0 / 0,5 | — |
| 16 | « Vous connectez une messagerie une fois, puis tout ce qui y arrive en ressort classé au bon fournisseur. » | fac:100 | C | identité fournisseur (a4_10), a4_20 | Même réserve que n° 2 (messagerie à soi) ; un fournisseur nouveau attend une confirmation (a4_10), il n'est pas classé d'emblée | voir n° 2 | — |
| 17 | « FILED recoupe donc le HT, la TVA et le TTC de chaque facture, et ne la classe que si les trois montants tombent juste. » | fac:114 | A | contrôle des totaux (a4_11), vu en vrai sur F-2026-0413 | — | 0 / 0 | — |
| 18 | « Chaque pièce lue s'ajoute au total engagé du mois, fournisseur par fournisseur, et ce qui attend encore votre validation reste visible à part. » | fac:121 | B | `filed_engage_mois`, `filed_pieces_en_cours` (a4_06), écran A3 | — | 0 / 0,5 | — |
| 19 | « Vous n'avez donc aucun tableur à tenir à côté. » | fac:121 | B | a4_06 | — | 0 / 0 | — |

## 2. Paliers et prix (`lib/produits/factures.ts`, `page.tsx`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 20 | Prix des paliers (« à définir ») | fac:135, 149, 165 | T | — | Décision de Teo | — | — |
| 21 | « Vous payez les pièces, pas les utilisateurs. » / « Le prix suit le nombre de pièces qui passent » / « Vous changez de palier d'un mois sur l'autre. » | page:424-426 | D | — | Compteur de pièces facturables par mois et par organisation, palier, changement de palier, facturation (AUDIT : « aucun compteur de facturation », A5) | 5 (A5) / 1 | prestataire de paiement (Stripe : ~1,5 % + 0,25 € par paiement) |
| 22 | « 20 / 100 / 500 factures par mois » | fac:140, 155, 171 | D | — | Quota par palier : compter, prévenir à 80 %, décider au dépassement (bloquer ou facturer) | 2 / 0,5 | — |
| 23 | « Une boîte mail connectée » / « Deux boîtes » / « Boîtes mail illimitées » | fac:141, 156, 172 | C | adresse dédiée par organisation (socle) | Plusieurs boîtes par organisation, et la limite par palier | 1,5 / 0,5 | — |
| 24 | « Classement par fournisseur » | fac:142 | B | a4_10, socle F2 | — | 0 / 0,5 | — |
| 25 | « Export mensuel pour la comptabilité » | fac:143 | C | exports programmés en tableur (a4_06) ; fichiers d'import comptables à la demande (a4_25) | Programmer l'export au **format comptable** (a4_25) à date fixe | 1 / 0,5 | — |
| 26 | « Historique de trois mois » / « de douze mois » / « Historique complet » | fac:144, 159, 175 | D | — | Aucune durée de consultation par palier. **Contradiction légale** : l'archivage probant (a4_05) et le registre figé (a4_31) gardent tout ; une pièce comptable se conserve 10 ans (C. com. L123-22). Ne limiter que l'**affichage**, jamais la conservation | 1 / 0 | — |
| 27 | « Recoupement HT / TVA / TTC » | fac:157 | A | voir n° 17 | — | 0 / 0 | — |
| 28 | « Transmission directe à la comptabilité » | fac:158 | C / T | fichiers d'import (a4_25) ; envoi par API Pennylane, QuickBooks, Cegid Loop (a4_28, ouvrier `compta` sur doubles) | Déployer l'ouvrier `compta` ; comptes éditeurs ; valider chaque format sur un vrai dossier | 1 / 3 | partenariats éditeurs (voir n° 92) |
| 29 | « Assistance par mail » / « Assistance prioritaire » / « Interlocuteur dédié » | fac:160, 177, 192 | T | — | Organisation du support (humain) | — | temps humain |
| 30 | « File de validation partagée » | fac:173 | B | demandes de validation (socle), circuit (a4_07), écran A3 « À valider » | — | 0 / 0,5 | — |
| 31 | « Catégories d'achat sur mesure » | fac:174 | C | catégorie produite à la lecture (cap:47, `true`) | Liste de catégories propre à l'organisation, et le lecteur qui s'y tient | 2 (A1 + A4) / 0,5 | — |
| 32 | « Journal de tout ce qui a été lu » | fac:176, 239 | B | `journal_opposable`, `filed_historique` immuable, `filed_journal_continuite` (a4_31) | — | 0 / 0,5 | — |
| 33 | Cabinet : « Un espace par dossier client » | fac:188 | D | une organisation = un client (socle) | Un cabinet qui voit plusieurs organisations (comptes multi-organisations, bascule, droits) | 5 (socle, A3) / 1 | — |
| 34 | « Vue d'ensemble sur tous les dossiers » | fac:189 | D | — | Tableau consolidé multi-organisations | 3 / 0,5 | — |
| 35 | « Marque du cabinet » | fac:190 | D | — | Marque blanche (logo, adresse d'envoi, domaine) | 3 / 0,5 | domaine du cabinet |
| 36 | « Reversement sur les abonnements » | fac:191 | D | — | Commissionnement (dépend du n° 21) | 2 / 0,5 | — |

## 3. Garde-fous, conformité, FAQ, clôture (`lib/produits/factures.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 37 | « FILED lit vos comptes sans y toucher. » | fac:217-218 | C | — | **Contradiction** : FILED écrit les écritures d'achat (a4_17), pose des comptes du FEC repris (a4_24), crée un compte fournisseur chez Pennylane et un Vendor chez QuickBooks (a4_28). À reformuler (« rien n'entre dans vos comptes sans validation ») | 0 / 0 (texte) | — |
| 38 | « Il n'écrit à personne. » / « FILED n'envoie aucun message en votre nom, ni à vos clients, ni à vos fournisseurs, ni à votre banque. » | fac:223-225 | B, sous réserve | aucun envoi depuis FILED aujourd'hui | Devient **faux** avec la voie 1 : les statuts de cycle de vie (a4_18 : « refusée », « encaissée » via la plateforme agréée) sont des messages au fournisseur en votre nom. Trancher le texte avant d'activer la plateforme | 0 / 0 (texte) | — |
| 39 | « Ses accès s'arrêtent à la lecture, donc il ne peut pas payer à votre place. » | fac:225, 229, 279 | B | aucun moyen de paiement ; le paiement est seulement **noté** (a4_15) | « Accès en lecture » est faux pour la comptabilité (n° 37). « Ne peut pas payer » est vrai | 0 / 0 | — |
| 40 | « Zéro message envoyé en votre nom » | fac:228 | B | voir n° 38 | voir n° 38 | 0 / 0 | — |
| 41 | « Aucune pièce n'est effacée. » / « Un doublon est mis de côté au lieu d'être effacé » | fac:233-236 | B | doublon → état « doublon », consultable (socle) ; registre figé, effacement refusé (a4_31) | — | 0 / 0,5 | — |
| 42 | « un montant douteux attend votre validation avant d'être classé » | fac:235 | B | contrôles bloquants → `bloquee` (a4_11) | — | 0 / 0 | — |
| 43 | « Vos fichiers d'origine restent tels que vous les avez reçus, donc vous pouvez tout récupérer quand vous voulez. » / « Chaque pièce gardée dans son format d'origine » | fac:235, 238 | C | fichier d'origine gardé dans Storage, empreinte (a4_05) | « Tout récupérer » : il n'y a pas d'export groupé des fichiers (ZIP par période, avec index) | 2 / 0,5 | — |
| 44 | « Depuis le 1ᵉʳ septembre 2026, toute entreprise établie en France doit pouvoir recevoir des factures électroniques. » | fac:250 | A (fait) | vérifié sur impots.gouv.fr (NOTES-A4) | — | — | — |
| 45 | « FILED ne vend pas cette mise en conformité : le raccordement relève de votre outil de facturation. » | fac:250, 291 ; accueil:604 | — | — | **Contradiction de stratégie** : Teo a choisi la voie 1 (Omega opérateur de dématérialisation, une plateforme agréée en marque blanche ; a4_16, a4_18 construits). Trancher : soit le texte reste et la voie 1 ne se vend pas, soit le texte change | décision | contrat plateforme agréée (voie 1) |
| 46 | FAQ « Que faut-il installer ? Rien. … Aucun logiciel de facturation à connecter, aucun fichier client à importer, aucune extension » | fac:263-264 | C | — | Vrai côté client ; l'installation FILED (exercice, plan comptable, circuit, comptes système) se fait chez nous : la dire « faite par nous » | 0 / 0 (texte) | — |
| 47 | FAQ « photo prise de travers … Elle est lue quand même. … le format ne vous concerne plus. » | fac:267-268 | C | lecteur A1 | Contradiction avec cap:123-124 et n° 8 (corps du mail) | 0,5 / 0,5 | — |
| 48 | FAQ « Elle reçoit un dossier classé dans le format qu'elle utilise déjà, à la date convenue pendant l'installation. » | fac:275 | C | formats Pennylane, Sage, Cegid, QuickBooks (a4_25), FEC (a4_17) | La date convenue : programmation (n° 25). EBP, ACD, Inqom, Tiime… : FEC générique seulement | 1 / 1 | — |
| 49 | FAQ « Jamais. Il lit, recoupe, classe et transmet à votre comptabilité. » | fac:279 | B, sous réserve | voir n° 38 | voir n° 38 | 0 / 0 | — |
| 50 | FAQ « HT, TVA et TTC sont recoupés entre eux ; si les trois ne tombent pas juste, la pièce est mise de côté et vous est signalée. Rien n'entre en silence dans votre comptabilité. » | fac:283 | A | voir n° 17 | — | 0 / 0 | — |
| 51 | FAQ « Sur des serveurs situés dans l'Union européenne. » | fac:287 | B / T | base à Francfort (fr:20) | La lecture passe par un service d'IA **hors UE** (fr:23-25) : la phrase ne vaut que pour le stockage. Lecteur en région UE (Bedrock eu-central, déjà dans `_partage`, A1) | A1 / 0,5 | tarif IA en région UE |
| 52 | FAQ « vous pouvez les récupérer ou tout effacer à tout moment » | fac:287 | C | effacement de l'organisation (socle), seul cas permis par a4_31 | Export groupé (n° 43). « Tout effacer » se heurte à la conservation légale de 10 ans : à reformuler (effacement à la résiliation, après export) | 0 / 0 (texte) + n° 43 | — |
| 53 | FAQ « Puis-je arrêter à tout moment ? Oui, sans préavis. Vous repartez avec vos pièces. » | fac:294-295 | C | — | Résiliation dans le produit + export groupé (n° 43) | 1 / 0,5 | — |
| 54 | Clôture « une messagerie connectée suffit à remettre l'ensemble en ordre » | fac:312 | C | voir n° 2 | voir n° 2 | — | — |

## 4. Le périmètre — catalogue (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 55 | « Une facture fournisseur traverse six étapes avant d'entrer en comptabilité. » | cap:20 | B | les six familles ci-dessous | — | 0 / 0 | — |
| 56 | « Le périmètre se règle à l'installation … et les contrôles restent actifs quel que soit le réglage. » | cap:22 | B | `filed_reglages` (a4_02, a4_08) ; les contrôles ne se désactivent pas | — | 0 / 0 | — |
| 57 | « Une adresse dédiée reçoit les pièces, et l'expéditeur est repris sur la ligne d'achat. » | cap:28 | B | a4_20 (`atteste: true` sur le site) | Prouver en vrai | 0 / 0,5 | — |
| 58 | « Les factures en PDF sont lues … natives ou scannées. » | cap:29 | A / B | natif : F-2026-0413 ; scanné : lecteur | Scan en vrai | 0 / 0,5 | — |
| 59 | « Un message sans pièce jointe lisible part en anomalie » | cap:30 | B | a4_20 (alerte « à lire ») | — | 0 / 0,5 | — |
| 60 | « Un fichier qui contient plusieurs factures est découpé pièce par pièce. » | cap:31 | B | a4_21 + A1 v24 | Vraie pièce multi-factures sur le banc | 0 / 0,5 | — |
| 61 | « Les factures manuscrites et les tickets de caisse sont lus et rattachés. » | cap:32 | C | A1 | Voir n° 10 et 14 | 2 / 0,5 | — |
| 62 | « Les formats structurés Factur-X, UBL et CII sont reçus et lus tels quels. » | cap:33 | B | a4_16 (XML fait foi) + lecteur | UBL et CII seuls (sans PDF) par la plateforme agréée : dépend de la voie 1 | 0 / 1 | plateforme agréée |
| 63 | « Un dépôt par lot arrive depuis un dossier partagé ou un transfert de fichiers. » | cap:34 | D | — | A2 (AUDIT) : dossier partagé (Drive, SharePoint) ou SFTP | A2 : 4 / 0,5 | serveur SFTP (~10 €/mois) |
| 64 | « Un historique de plusieurs exercices se reprend en une fois à l'installation. » | cap:35 | B | a4_24 (FEC) + a4_32 (pièces) | Écran d'installation (A3) qui envoie les FEC | A3 : 1 / 0,5 | — |
| 65 | « L'en-tête : fournisseur, numéro de pièce, date d'émission et date d'échéance. » | cap:42 | A | F-2026-0413 | — | 0 / 0 | — |
| 66 | « Les lignes de détail : désignation, quantité, prix unitaire et remise. » | cap:43 | B | champ `lignes` du lecteur (A1), `filed_factures_lignes`, rapprochement (a4_08) | Prouver en vrai | 0 / 0,5 | — |
| 67 | « La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits. » | cap:44 | B | a4_11, a4_22, a4_27 | — | 0 / 0,5 | — |
| 68 | « La devise, le taux de change et la contre-valeur en euros au jour d'émission. » | cap:45 | B / T | a4_22, a4_27 | Ouvrier des cours BCE (B7) | B7 : 0,5 / 0,5 | — (BCE gratuit) |
| 69 | « Les références de commande, de bon de livraison et de contrat citées sur la pièce. » | cap:46 | B | `refs` lues (A1), rattachement de la commande (socle F3, a4_23) | Prouver en vrai | 0 / 0,5 | — |
| 70 | « La catégorie d'achat et un résumé de la pièce, produits à la lecture. » | cap:47 | B | lecteur (`atteste: true`) | — | 0 / 0 | — |
| 71 | « Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire. » | cap:48 | B | a4_27 | — | 0 / 0,5 | — |
| 72 | « Le total hors taxes, la TVA et le total toutes taxes sont recoupés au pied de la facture. » | cap:55 | A | n° 17 | — | 0 / 0 | — |
| 73 | « Les doublons sont détectés, y compris quand le fichier a été renommé ou rescanné. » | cap:56 | B | empreinte du fichier (renommé) ; fournisseur + numéro (rescanné, socle) | Prouver le rescan en vrai | 0 / 0,5 | — |
| 74 | « Un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte. » | cap:57 | B | a4_30 | — | 0 / 0,5 | — |
| 75 | « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. » | cap:58 | B / T | forme et clé (a4_04, a4_14), registres (B7 : Sirene, VIES ; a4_26 : IDE suisse, HMRC) | `SIRENE_API_KEY` et application HMRC (Teo) ; ouvrier B7 en production | 0 / 1 | Sirene : gratuit ; HMRC : gratuit |
| 76 | « La commande, la réception et la facture sont rapprochées avant toute validation. » | cap:59 | B | a4_08, a4_23 | Réserve : bloquant seulement si `reception_exigee` ou `commande_exigee` est réglé ; à dire, ou à régler à l'installation | 0 / 0,5 | — |
| 77 | « Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé. » | cap:60 | B | a4_08 | — | 0 / 0,5 | — |
| 78 | « Une pièce aux champs manquants ou au total nul est mise en attente, jamais classée. » | cap:61 | B | a4_11 (`atteste: true`) | — | 0 / 0 | — |
| 79 | « Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention. » | cap:62 | B | a4_02 | Contradiction avec cap:155-156 (n° 101) | 0 / 0,5 | — |
| 80 | « L'approbation suit le montant, le centre de coût et la société concernée. » | cap:69 | B | a4_07 | — | 0 / 0,5 | — |
| 81 | « Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées. » | cap:70 | B | a4_07 + socle | — | 0 / 0,5 | — |
| 82 | « Une délégation d'approbation se pose pour une absence, avec sa date de fin. » | cap:71 | B | socle + a4_31 + écran A3 | — | 0 / 0,5 | — |
| 83 | « L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau. » | cap:72 | B | a4_07, a4_31 | — | 0 / 0,5 | — |
| 84 | « Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture. » | cap:73 | B | `filed_factures_annexes` (a4_07), écran A3 | — | 0 / 0,5 | — |
| 85 | « Celui qui saisit et celui qui approuve ne peuvent pas être la même personne. » | cap:74 | B | socle 19c + `filed_saisisseurs` (a4_13) | — | 0 / 0 | — |
| 86 | « L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur. » | cap:81 | B | a4_02 + a4_24 (FEC) | Le centre de coût ne s'apprend pas depuis les FEC (ils n'en portent pas) | 0 / 0,5 | — |
| 87 | « Chaque pièce est affectée au plan comptable et au centre de coût qui la portent. » | cap:82 | B | a4_01, a4_02 | — | 0 / 0,5 | — |
| 88 | « Chaque pièce lue est écrite dans votre espace, avec son fournisseur et sa catégorie. » | cap:83 | A / B | socle F2 (`atteste: true`) | — | 0 / 0 | — |
| 89 | « Les pièces classées s'ajoutent à une table que rien ne modifie après coup. » | cap:84 | B | registre figé (a4_31), écritures non réécrites (a4_17) | — | 0 / 0 | — |
| 90 | « Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie. » | cap:85 | B | a4_03, a4_09 | — | 0 / 0,5 | — |
| 91 | « L'archivage est à valeur probante, et la piste d'audit reste reconstituable. » | cap:86 | B | a4_05 (empreintes, journal) | « Probant » au sens fiscal (BOI-CF-COM-10-80) : piste d'audit fiable écrite et validée par l'expert-comptable du pilote | 0 / 1 | — |
| 92 | « Le journal des pièces reçues est numéroté en continu et ne se modifie pas. » | cap:87 | B | a4_31 | — | 0 / 0 | — |
| 93 | « L'engagé du mois se lit par fournisseur, par société et par centre de coût. » | cap:94 | B | a4_06 | — | 0 / 0,5 | — |
| 94 | « L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours. » | cap:95 | B | a4_06, a4_15 | — | 0 / 0,5 | — |
| 95 | « Le délai moyen de traitement se mesure de la réception au classement. » | cap:96 | B | a4_06 | — | 0 / 0 | — |
| 96 | « Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu. » | cap:97 | B | a4_06 | — | 0 / 0 | — |
| 97 | « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. » | cap:98 | B | a4_06 | — | 0 / 0,5 | — |

## 5. Les cas tordus (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 98 | « l'adresse d'envoi est reprise telle quelle sur la ligne d'achat. C'est le contenu de la facture qui décide du fournisseur, pas l'expéditeur. » | cap:112 | B | a4_20, a4_10 | — | 0 / 0 | — |
| 99 | « La pièce part en anomalie pour champ manquant. » (sans numéro) | cap:116 | B | a4_11 | — | 0 / 0 | — |
| 100 | « Le message part en anomalie avec sa mention » (montant dans le corps) | cap:120 | B | a4_20 | — | 0 / 0 | — |
| 101 | « La pièce part en anomalie plutôt que d'être devinée. » (photo) | cap:124 | C | — | Contredit fac:71, 268 et le lecteur qui lit les photos : trancher | 0 / 0 (texte) | — |
| 102 | « Le classement s'arrête dès que l'écart … dépasse cinq centimes. » | cap:128 | B | `tolerance_totaux` 0,05 (a4_02, a4_11) | — | 0 / 0 | — |
| 103 | « Les montants sont lus tels qu'ils figurent sur la pièce, sans conversion. La contre-valeur en euros reste à la charge de votre comptabilité. » | cap:132 | **faux** | a4_22, a4_27 convertissent | Texte à remplacer (C5 l'a en main, NOTES-C5 passe 3) | 0 / 0 (texte) | — |
| 104 | « Un taux exotique passe s'il tombe juste, et s'arrête sinon. » | cap:136 | C | a4_11 : un taux qui n'existe pas en France est **bloquant**, même s'il tombe juste | Trancher : texte, ou contrôle | 0 / 0 (texte) | — |
| 105 | « Le doublon est reconnu même après un renommage ou un nouveau scan. La seconde copie est écartée et reste consultable. » | cap:140 | B | voir n° 73 | — | 0 / 0,5 | — |
| 106 | « Le découpage automatique n'existe pas encore, et l'annoncer coûterait plus cher que de le dire. » | cap:144 | **faux** | a4_21 + A1 v24 découpent | Texte à remplacer (contredit cap:31) | 0 / 0 (texte) | — |
| 107 | « La pièce est mise en attente. » (total à zéro) | cap:148 | B | a4_11 | — | 0 / 0 | — |
| 108 | « c'est votre comptabilité qui crée la fiche. Le système n'écrit rien dans votre plan comptable. » | cap:152 | C | fournisseur créé « à confirmer » par une personne (a4_10) | Faux à deux endroits : la reprise FEC pose des comptes (a4_24), l'envoi API crée des comptes fournisseurs (a4_28). Reformuler | 0 / 0 (texte) | — |
| 109 | « Elle est classée avec ses deux dates … c'est à votre comptabilité de décider de l'exercice. » | cap:156 | C | les deux dates sont gardées | Contredit cap:62 : l'orientation vers l'exercice suivant est automatique (a4_02). Trancher le texte | 0 / 0 (texte) | — |

## 6. À l'échelle d'un groupe (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 110 | « Chaque société, site ou filiale a son espace, ses fournisseurs et son plan comptable. Une direction financière lit le consolidé, un comptable de site ne voit que le sien. » | cap:171 | B | périmètres par société (socle), plan par société (a4_01) | Les fournisseurs sont par organisation, pas par société (réserve mineure) | 0 / 0,5 | — |
| 111 | « Saisie, approbation, comptabilisation et administration sont quatre rôles distincts. » | cap:177 | C | rôles du socle : gérant, admin, valideur, collaborateur | Pas de rôle « comptabilisation » distinct (le valideur comptabilise) | 1,5 (socle) / 0,5 | — |
| 112 | « Une délégation se pose pour une absence et s'éteint à la date prévue. » | cap:177 | B | n° 82 | — | 0 / 0 | — |
| 113 | « Le montant décide du circuit : validation simple, double validation, accord de la direction. Le seuil est un réglage, et son historique reste lisible. » | cap:183 | B | a4_07 (niveaux, direction) ; changements tracés (`tracer`) | Lecture de l'historique d'un circuit à l'écran (A3) | A3 : 0,5 / 0 | — |
| 114 | « Chaque lecture, chaque décision et chaque export s'inscrivent dans un journal qui ne se modifie pas, y compris par nous. C'est ce qu'un commissaire aux comptes demande. » | cap:189 | C | `journal_opposable`, empreintes (a4_05) | « Y compris par nous » : un superutilisateur de la base peut écrire. Pour le dire honnêtement, il faut un chaînage d'empreintes, ou un horodatage tiers qualifié publié hors de notre base | 3 / 0,5 | horodatage qualifié eIDAS (~0,05 à 0,20 € par jeton) |
| 115 | « Le système lit et écrit dans vos outils de comptabilité et de gestion. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation. » | cap:195 | C / T | fichiers (a4_25), API (a4_28) | Ouvrier `compta` déployé, comptes éditeurs ; « outils de gestion » (ERP) : rien | 1 / 3 | voir n° 28 |
| 116 | « Engagé, délai de traitement, pièces bloquées et prévision de décaissement se lisent par société et en consolidé, avec un export daté. » | cap:201 | B | a4_06 | — | 0 / 0,5 | — |

## 7. Bento, maquettes, page (`components/produits/factures`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 117 | « Reçue → Lue → Recoupée → Classée → Transmise » ; « 5 étapes · 0 perdue » | bento:141-145, 162 | B | socle F1-F2, a4_11, a4_25 | « Transmise » : voir n° 28 | 0 / 0 | — |
| 118 | « 3 canaux d'arrivée » ; « 0 pièce ressaisie » | bento:297-298 | C | courriel, dépôt (socle) ; plateforme agréée (a4_18, voie 1) | Le troisième canal (plateforme) attend la voie 1. « 0 ressaisie » : voir n° 1 | — | — |
| 119 | « Pièce déjà reçue → Écartée » ; « Montants qui ne tombent pas juste → Mise de côté » ; « Fournisseur inconnu → Validation » ; « Doublon de numéro → Écartée » ; « Devise inattendue → Validation » ; « 12 contrôles » | bento:308-320 | B | socle, a4_10, a4_11, a4_27 | — | 0 / 0 | — |
| 120 | « Une seule file, courte, avec uniquement ce qui a besoin de vous. Le reste est déjà rangé. » | bento:436 | B | écran A3 + statuts | — | 0 / 0 | — |
| 121 | Maquettes (« Dossier prêt — Août transmis à la comptabilité, 214 pièces », « Pièces traitées 1 284 », fournisseurs d'exemple) | bento:346-349 ; Maquettes:148-153, 282-304 | — | illustrations | Données d'exemple, non présentées comme des clients : rien à prouver. Garder des noms fictifs | — | — |
| 122 | Fait « Conception : France » ; « Hébergement : Union européenne » ; « Droit applicable : Français » ; « Facturation : Euros, TVA française » | fr:29-32 | B / T | base à Francfort | Lecture IA hors UE (n° 51) ; facturation Omega (n° 21) ; CGV de droit français (Teo) | voir n° 21, 51 | — |
| 123 | Méta : « Chaque facture fournisseur est lue quel qu'en soit le format, ses montants recoupés, la pièce classée et transmise à votre comptabilité. » | page:97 | C | voir n° 3, 6, 8 | « Quel qu'en soit le format » : voir n° 8 et 101 | — | — |

## 8. Accueil, /offres, contenus (`app/page.tsx`, `app/offres/page.tsx`, `lib/content.ts`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 124 | « Vos équipes ne ressaisiront plus un seul document. » | accueil:702 | C | factures et natures classées (socle) | « Un seul document » : contrats, courriers, bons… sont classés par nature, pas tous lus en détail | — | — |
| 125 | « Lit chaque document, le classe, rédige ce qui repart. » | accueil:704 | D | — | **« Rédige ce qui repart »** n'existe pas dans FILED (aucune réponse rédigée), et contredit fac:223-225 (« il n'écrit à personne »). Soit le construire (brouillon de réponse validé, A1/A2 : ~5 j), soit retirer le texte | 5 / 1 | — |
| 126 | « Chaque document reçu est lu, quels qu'en soient le type et le format — facture, bon de livraison, contrat, courrier —, ses informations extraites puis contrôlées, la pièce classée au bon dossier et la réponse qu'elle appelle rédigée. » | content:145 | C / D | nature lue et classée (socle) ; contrôles : factures et avoirs seulement | Extraction et contrôles pour les contrats et courriers : pas construits (2 j par nature, A1 + A4). « Réponse rédigée » : n° 125 | 6 / 1 | — |
| 127 | « Tout document reçu, lu et contrôlé, classé au bon dossier, la réponse rédigée. » | content:146 | C / D | n° 126 | n° 126 | (n° 126) | — |
| 128 | « Le système FILED lit les factures fournisseurs reçues par mail et les range au journal d'achats, prêtes pour le cabinet » | content:295 | B | a4_17, a4_20, a4_25 | — | 0 / 0,5 | — |
| 129 | /offres : « FILED — Lecture et classement » | offres:401-404 | B | — | — | 0 / 0 | — |
| 130 | Accueil FAQ « Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier » | accueil:600 | **faux pour FILED** | le lecteur envoie la pièce entière au modèle (A1) | Reformuler, ou découper avant envoi (hors de portée pour une facture) | 0 / 0 (texte) | — |
| 131 | Accueil FAQ « Nous ne vendons pas de mise en conformité » | accueil:604 | — | — | Voir n° 45 (voie 1) | décision | — |

## Totaux (jours de travail, arrondis)

- **D → B (pas construit)** : messagerie à soi 6, notes de frais 6, facturation et quotas (A5) 7,5, multi-dossiers et marque du cabinet 13, « rédige ce qui repart » et autres natures 11, durées d'historique 1 → **≈ 34 j** (dont environ 20 j hors A4 : A5, socle, A3, A1).
- **C → B (partiel)** : relevés 4, tickets et manuscrits 4, catégories sur mesure 2, export programmé au format comptable 1, export groupé des fichiers 2, résiliation 1, rôle de comptabilisation 1,5, journal à l'épreuve de nous 3, dépôt par lot (A2) 4, écran de reprise (A3) 1, plusieurs boîtes 1,5 → **≈ 25 j**. Les textes à trancher (n° 8, 37, 38, 45, 46, 101, 103, 104, 106, 108, 109, 130) coûtent 0 j de code, mais une décision de Teo et une passe de C5 (≈ 1 j).
- **B → A (preuve en vrai)** : 18 j communs (ligne 0) + environ 0,5 j par famille au pilote, déjà compris.
- **Ce qui ne dépend que de comptes de Teo** : Sirene, HMRC, BCE (gratuits) ; QuickBooks (Intuit, revue de l'appli), Pennylane (partenariat), Cegid Loop (référent partenaire) ; Google CASA et Microsoft (messagerie à soi) ; plateforme agréée (voie 1) ; prix des paliers ; CGV.
