# Audit des promesses du site — 06/10/2026, 16 h Z

Demande de Teo : « livrer tout ce qu'on promet sur notre site, et pas une chose de moins ».
Audit fait en lecture seule sur main et sur les branches worker-*. Ce fichier sert de **carnet de commandes** :
chaque ligne a son ouvrier. Quand une promesse est livrée et posée sur la recette, l'ouvrier coche sa ligne
dans sa NOTES et prévient le coordinateur. C'est lui qui bascule `atteste: true` dans `lib/produits/capacites/*.ts`.

Règle générale :
- Une promesse **tenable** se livre.
- Une promesse **intenable** se reformule honnêtement sur le site. Exemples : contredite par une décision (D6, pas de SMS
  santé) ou par un fait (hébergement à Francfort).
- Un **gros** chantier sans code se livre par paliers ; tant qu'il n'existe pas, la page dit « en préparation ».

## 0. Transversal

| Promesse | État | Qui |
|---|---|---|
| Rien n'est en production : tout ce qui est « livré » l'est sur la recette | paliers P1–P6 de MISE-EN-PRODUCTION | A5 + coordinateur |
| `CAPACITES-A-VALIDER.md` périmé ; 56 des 185 lignes de catalogue seulement attestées | à rebasculer ligne par ligne | coordinateur, sur preuves des ouvriers |
| Sauvegardes : workflow prêt, secrets non posés ; dumps en artefacts GitHub (hors UE) | déplacer vers un stockage UE (Scaleway Object Storage, Paris) | A5 |
| « Export complet en un clic », « à la sortie : export puis effacement » | portes en base, aucun bouton, Storage non compris | A3 (écran) + A5 (Storage) |
| Journal « exportable à tout moment » | pas d'export du journal | A3 |
| Tarif indexé sur le nombre de pièces / part reprise par un opérateur | aucun compteur de facturation | A5 |
| « Le message reste un brouillon dans votre outil », « vous connectez une messagerie » | fournisseurs gmail/microsoft non branchés | A2 (Gmail puis Microsoft 365) |
| 28 intégrations de `lib/integrations.ts` | seuls Brevo et WhatsApp (sans secrets) existent | A2, par paliers ; le reste « sur demande » sur le site |
| Installation sur vos serveurs | rien | reformuler (C5) : « sur étude » |

## 1. Postes de l'accueil sans module

| Poste | État | Qui |
|---|---|---|
| CASHD — relances d'impayés (facturier relu chaque matin, relances écrites à 7 h, encours échu, 50 lignes de capacités) | ABSENT | **C2 (nouveau)** ; briques : b2_02, b6_16, a4_15, b1_04 |
| REPUT — la réponse aux demandes (base de connaissances, réponse prête dans la minute, rendez-vous, 30 lignes non attestées) ; la réception existe (A2) | réponse ABSENTE | **C3 (nouveau)** |
| OFFLOAD — clients qui décrochent (46 lignes) | ABSENT | **C4 (nouveau)** |
| Sites vitrines : « demandes reçues, devis, règlements, avis, par enseigne » | aucun écran ne lit `receptions` | A3 (page « Documents reçus » / « Demandes reçues ») |

## 2. Par module

- **FILED (A4, A1, A3)**
  - abonnement `reception.nouvelle → filed` : un courriel reçu doit devenir un document FILED (A4, petit) ;
  - découpage d'un fichier qui contient plusieurs factures en pièces filles (A1 + A4) ;
  - FEC : autoliquidation, contre-valeur en devise, extourne ; envoi vers Pennylane, Sage, Cegid et QuickBooks (A4) ;
  - TVA sur les débits et contre-valeur en euros (A1) ;
  - mentions d'escompte, de pénalités et d'indemnité (A1) ;
  - dépôt par lot depuis un dossier partagé (A2) ;
  - reprise de plusieurs exercices (A4) ;
  - rapprochement commande / réception / facture (A4) ;
  - alerte au changement d'IBAN, à attester (coordinateur).
- **Varelo (B1)**
  - point du matin par direction (petit) ;
  - « le groupe sur une page » : ventes, trésorerie, écarts (gros) ;
  - reportings dus (moyen) ;
  - réserves à émettre (gros, avec A1) ;
  - modèle `modeles_jeux` Varelo pour lire les exports automatiquement (avec A1).
- **Tavaro (B2)**
  - photo floue refusée (petit) ;
  - refacturation des frais de dossier des amendes (petit) ;
  - facture envoyée avec le PDF et les photos datées (avec A2) ;
  - modules 02–11, 13, 15–20 : remise en location et entretien, contestations bancaires (17), sortie de flotte… par paliers ;
  - assistance téléphonique et relevés constructeur (19) : dépendent de tiers.
- **Tiroma (B3)**
  - synthèse de la semaine pour la direction ;
  - taux de réinscription ;
  - absences probables ;
  - assistante absente : soins à basculer ;
  - demi-journées vides des collaborateurs ;
  - objectifs par fauteuil ;
  - point du matin multi-sites ;
  - le site dit « il ne contacte jamais un patient à votre place », alors que b3_14 envoie des rappels (validés par le cabinet) → reformuler (C5).
- **Tamila (B4)**
  - pré-lecture, chronologie sourcée, contradictions, bordereau (art. 768 et 954), pièces adverses, dires à l'expert, Dintilhac,
    premier jet de l'exposé des faits, questions au dossier, export Word et PDF (gros, avec A1) ;
  - effacement des fichiers à la clôture ;
  - temps proposé à la saisie, forfait consommé ;
  - point du matin ;
  - marge par dossier, charge par avocat, séries, dossiers sans diligence, pièces attendues.
- **Lorani (B5)**
  - contrôle des planches entre elles et contre CCTP, DPGF et PLU (gros, avec A1) ;
  - DWG ;
  - PLU lu depuis l'adresse ;
  - métré contre DPGF ;
  - décennales ;
  - comptes rendus de chantier, OS, réserves et GPA ;
  - revérification à chaque indice ;
  - rapport en PDF annoté et Excel ;
  - RE2020, ERP, surfaces Cerfa, DOE ;
  - une question suivie jusqu'à la réponse.
- **Daliro (B6)**
  - photos et vocaux lus sur le numéro WhatsApp pro et par courriel (gros, avec A1 et A2) ;
  - signature du client sur le téléphone ;
  - alerte météo ;
  - approvisionnement (gros) ;
  - relance des avenants non signés au point du matin ;
  - recalage des lots en cas de retard.
- **Identité des tiers (B7)**
  - HMRC et UID suisse à poser (worker-b7).

## 3. À reformuler sur le site (C5, vitrine honnête)

1. Point du matin dentaire « sur WhatsApp » → « dans votre espace sécurisé ; un courriel vous prévient, sans nom de patient » (D6).
2. Tamila « hébergé en France » → « chiffrées dossier par dossier avant de quitter votre poste, conservées dans l'UE, clés chez un prestataire français ».
3. « Lecture des pièces : en Europe » contre « modèles interrogés hors d'Europe » → une seule phrase vraie partout tant que Bedrock UE n'est pas en production.
4. « jamais l'intégralité d'un fichier » → « le modèle ne reçoit que la pièce à lire, jamais le reste de votre espace ».
5. « Aucune réplication hors UE » → vrai seulement après le déplacement des sauvegardes (A5) ; d'ici là, phrase exacte.
6. Daliro « WhatsApp, SMS » → « au numéro WhatsApp professionnel de l'entreprise ou par courriel ».
7. Tiroma « dans les minutes » → « au premier export qui la contient ».
8. REPUT « répond dans la minute » contre « rien ne part sans vous » → « réponse prête dans la minute ; elle part seule seulement sur les sujets autorisés d'avance ».
9. Varelo « branche la même IA sur vos logiciels » → « chaque société dépose l'export de son logiciel ; Varelo le lit sans rien y écrire » (tant que la lecture automatique n'existe pas).
10. « brouillon dans votre outil » → vrai après Gmail/Microsoft (A2) ; d'ici là, « dans votre file de validation Omega ».
11. Installation sur vos serveurs → « sur étude, pour les organisations qui l'exigent ».
12. Tiroma « ne contacte jamais un patient à votre place » → « ne contacte un patient qu'avec un message que vous avez validé ».
13. Ce qui n'existe pas encore : une mention « en préparation » discrète sur la ligne, à retirer quand l'ouvrier livre. Aucune ligne n'est supprimée : la promesse reste, on la tient.
