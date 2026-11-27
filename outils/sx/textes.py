#!/usr/bin/env python3
"""Le contenu Omega de l'accueil « sx » -> outils/sx/textes-fr.json.

Chaque bloc est une liste ALIGNÉE, ligne pour ligne, sur les textes de la
référence relevés dans outils/sx/textes-source.json (même ordre, doublons
retirés). « = » garde le texte d'origine (un chiffre, une initiale).

D'où viennent ces phrases. Rien n'est inventé pour remplir une case :
  · titres, chapôs, situations, FAQ : components/accueil-v3/textes.ts
    (l'accueil précédent, validé par Teo) ;
  · prix : components/tarifs/TroisPrix.tsx (34,90 € HT / personne / mois ;
    packs installés dès 1 750 € HT, puis l'IA à la pièce) ;
  · sécurité : app/vos-donnees/page.tsx — aucune certification n'est
    attribuée à Omega, jamais « hébergé en France » ;
  · noms d'agents : lib/content.ts (jamais les noms de code).
Les écrans dessinés (tableaux, fiches, graphiques) sont des EXEMPLES : noms
de personnes et de sociétés fictifs, montants repris de la référence et
passés en euros. Aucun client réel, aucun témoignage, aucun logo tiers.

usage : python3 -I outils/sx/textes.py            (écrit textes-fr.json, signale tout décalage)
"""
import json, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__))
SOURCE = json.load(open(os.path.join(ICI, "textes-source.json"), encoding="utf-8"))

B = {}
B["nav"] = """Navigation principale
Accueil Omega
Omega
Logiciel
Agents
Intégrations
Tarifs
Parler à l'équipe
Commencer
Ouvrir le menu"""

B["hero"] = """Audit de 30 minutes offert, sans engagement.
Nouveau
Des agents sur mesure
L'ERP IA pour toute votre gestion
Omega est l'ERP où des agents IA font le travail et où vous validez les décisions qui comptent.
Réserver un audit
Voir le logiciel
Les modules d'Omega
=
=
=
=
=
=
=
=
=
=
="""

B["s1 Plateforme"] = """ERP
Votre gestion, prise en charge.
Les agents font le travail. Vous gardez la main.
Un seul espace pour les ventes, les achats, le stock, la banque et la comptabilité. Les agents préparent les relances, traitent les factures et signalent ce qui demande votre attention, et rien ne part sans votre accord.
Ce que fait l'ERP
Relancer les impayés
Traiter les factures
Répondre aux demandes
Contrôler les paiements
Suivre la trésorerie
Les agents repèrent les devis sans réponse et les factures en retard, rédigent les relances et signalent ce qui sort de l'ordinaire. Vous relisez une courte liste et validez en un clic.
Relances de novembre
4 collaborateurs
Adam Benali
=
Alice Morel
Anne-Marie Roux
=
collaborateur de plus
Partager
Partager
Discussion
Aide
Plus d'options
Demander à l'IA
Tous les clients
Affichage
Tout sélectionner
Sélection partielle
Client
Pièce
Montant
Reste dû
Statut
Sélectionner la ligne 1
Adam Benali
Facture · J+7
6 200 €
4 580 €
Prête
Sélectionner la ligne 2
Alice Morel
Devis · J+3
7 900 €
6 310 €
Sélectionner la ligne 3
Sélectionnée
Anne-Marie Roux
Facture · J+21
5 450 €
4 070 €
Payée en partie
Sélectionner la ligne 4
Fanny Estève
Facture · J+3
4 800 €
3 620 €
Litige ouvert
Sélectionner la ligne 5
Gabriel Meyer
Devis · J+7
5 100 €
3 860 €
Sélectionner la ligne 6
Maya Martin
6 600 €
4 860 €
Sélectionner la ligne 7
Paul Girard
Sélectionner la ligne 8
Rémi Lambert
5 800 €
4 350 €
Résumé de l'IA
2 relances demandent un regard. Anne-Marie a réglé une partie de sa facture, et Fanny a ouvert un litige il y a 2 jours.
Voir les 2 cas
Valider les relances
Les factures fournisseurs entrent en comptabilité sans rien recopier. Les agents les lisent, les rapprochent de la commande et préparent l'écriture.
Facture Papeteries Dumas
=
=
=
étapes faites
Options
Lire la facture reçue
Rapprocher la commande
Contrôler le fournisseur
L'agent a rapproché la facture de sa commande. Relisez les champs extraits, puis confirmez le contrôle.
Confirmer le contrôle
Préparer l'écriture
Classer la pièce
Planifier le paiement
Extrait de la facture
Contrôlé avec la commande. Les montants correspondent.
Fournisseur
Date de facture
12 nov. 2026
Commande
BC-0418
Échéance
12 déc. 2026
Confiance
Élevée
Les demandes arrivent par mail ou par WhatsApp et sont rapprochées de l'historique du client et de l'agenda de l'équipe. Vous validez la réponse avec tout le contexte sous les yeux.
Demande client
=
Rendez-vous de mardi à jeudi : l'agenda de Maya est libre, et 3 personnes sur 4 restent disponibles.
Réponse rédigée
Agenda vérifié
Lun
Mar
Mer
Jeu
Ven
Adam
Libre
Alice
=
Maya
Rendez-vous · 3 jours
=
Paul
Proposer d'autres dates
Valider la réponse
Chaque paiement est comparé à la fiche du fournisseur et aux paiements passés avant de partir. Un RIB modifié ou une facture en double attend votre accord.
Paiements à venir
Contrôles actifs
Toutes les sociétés
30 prochains jours
Facture
Nature
Valideur
DÉC
=
Loyer · SCI des Quais
Charge fixe
Prête à payer
Fournitures · Papeteries Dumas
Achats
=
Véhicules · Loca Pro
Location
À valider
=
Assurance · Axelia
Rémi
=
Entretien · Net Service
2 pièces manquantes
RIB modifié détecté
Le RIB de la facture Loca Pro diffère de celui de la fiche. En 12 mois, aucun paiement vers ce compte :
2 140 € suspendus.
12 mois comparés
Voir le détail
Vérifier le RIB
Posez vos questions sur la trésorerie, les ventes ou les marges en langage courant. Chaque réponse montre les chiffres et le calcul sur lesquels elle repose.
a demandé à
Omega
=
À l'instant
Peut-on payer les charges de novembre sans toucher à la réserve de 532,4 k€ ?
a répondu à
Oui. Les acomptes reçus, les factures encaissées et les abonnements du mois couvrent les
68,4 k€ à payer
, et la réserve de 532,4 k€ reste intacte.
Trésorerie de novembre
Trésorerie de novembre /
k€
Les encaissements du mois, affectés aux paiements à venir
Affecté
68,40 k€
Réserve conservée
532,40 k€
Acomptes reçus
Factures encaissées
Abonnements
Loyers
Fournisseurs
Salaires
47 %
36 %
17 %
Trésorerie de novembre : flux
Abonnements vers Loyers : 7,8 k€, 65 % des abonnements, 100 % des loyers
7,8 k€
Factures encaissées vers Fournisseurs : 8,4 k€, 34 % des factures encaissées, 67 % des fournisseurs
8,4 k€
Abonnements vers Fournisseurs : 4,2 k€, 35 % des abonnements, 33 % des fournisseurs
4,2 k€
Acomptes reçus vers Salaires : 32,0 k€, 100 % des acomptes, 67 % des salaires
32,0 k€
Factures encaissées vers Salaires : 16,0 k€, 66 % des factures encaissées, 33 % des salaires
16,0 k€
100 %
67 %
33 %
De la source
−100 %
Du poste
+67 %
11 %
19 %
70 %"""

B["s2 Fiche"] = """Configuré par l'IA
En service en quelques semaines.
Omega se construit autour de votre façon de travailler.
Apportez vos fichiers et vos règles. Omega en tire des modules, des taux de TVA et un plan comptable réglés sur votre façon de travailler.
Audit offert
Voir la gestion
Navigation du logiciel
=
Holding Laurent
Rechercher
=
Accueil
À valider
=
Demander à Omega
Gestion
Ventes
=
Achats
Stock
Banque
Comptabilité
Documents
Sociétés
Maison Laurent SAS
Alpes Distribution
Jura Services
Réglages
=
Alice Morel
Administration
Fil d'Ariane
Clients
Anne-Marie Roux
4 collaborateurs
Adam Benali
Alice Morel
Anne-Marie Roux
=
collaborateur de plus
Partager
Partager
Discussion
Aide
Plus d'options
Demander à l'IA
À jour
Roux Conseil · Bordeaux · Maison Laurent SAS
Sections de la fiche
Vue d'ensemble
Devis
Factures
Activité
Résumé de l'IA
Anne-Marie Roux a signé son devis le 28 oct. L'acompte est encaissé, le matériel commandé et la livraison planifiée. La facture part le 27 nov. et le point de fin de projet suit le 3 fév.
À venir
À venir
À facturer
Ven. 27 nov. · 5 450 € HT
Dans 13 jours
Fin de projet
Mer. 3 fév. · avec Rémi Lambert
Dans 81 jours
Devis
Devis
Devis signé.pdf
Signé le 28 oct. · 6 pages
Début
3 nov. 2026
Durée
3 mois
Acompte
30 %
Paiement
À 30 jours
Indicateurs de novembre
Indicateurs de novembre
Étapes faites
=
Factures émises
=
Livraisons faites
=
Paiements reçus
=
Mois en cours
Dans les temps
76 %
Facturé à ce jour
Facturé à ce jour
3 019,50 €
Encaissé à ce jour
2 066,95 €
Voir la facture
Encaissé à ce jour, par poste
Prestation, 3–6 nov. · 32 h : 1 006,08 €
Prestation
75 %
Fournitures
10 %
Déplacements
9 %
Options
6 %
Dépenses du projet
Dépenses du projet
7 048,50 € depuis le devis · 28 oct.
Prestation
2 578,08 € · 37 %
Dépenses du projet, par poste
Prestation : 2,6 k€
2,6 k€
Envoi : 65 €
65 €
Matériel : 394 €
394 €
Licences : 450 €
450 €
Intérim : 2,2 k€
2,2 k€
Location : 1,2 k€
1,2 k€
Matériel
Licences
Intérim
Location
Activité
Devis signé
par Anne-Marie Roux et Rémi
Signature électronique · 28 oct.
Acompte rapproché
avec le devis
Banque · 30 oct.
Projet ouvert
, suivi par Rémi Lambert
Ventes · 31 oct.
Commande de matériel
passée chez Papeteries Dumas
Achats · 2 nov.
Stock réservé
pour 18 articles, selon le devis
Stock · 3 nov.
Facture de location
de 1 240 € validée et saisie
Comptabilité · 5 nov.
prévue le 3 fév.
Agenda · 6 nov.
Tout s'enregistre seul.
Devis, factures, achats et stock sont enregistrés automatiquement.
Vos outils travaillent ensemble.
Banque, comptabilité et messagerie restent synchronisées.
Omega apprend vos règles.
Il lit vos taux de TVA, votre plan comptable et votre historique.
Demandez, c'est là.
Une fiche ou un chiffre en quelques secondes."""

B["s3 Agents"] = """Nouveau
Des agents sur mesure
Choisissez un agent, réglez-le, mettez-le au travail.
Des agents prêts à l'emploi pour les tâches répétitives de la gestion. Chacun suit vos règles, demande avant d'agir et consigne chaque étape dans le dossier du client.
Chercher un agent…
Chercher
Relances
Factures
Demandes
Clients
Sur mesure
Plus d'étiquettes
=
Paul Girard
Devis sans réponse · J+7
2 h
=
Maya Martin
Facture échue · J+3
Vous
=
Adam Benali
Facture échue · 860 €
3 h
Agent de relance
Les devis sans réponse et les factures en retard arrivent déjà triés selon vos règles. Vous tranchez les cas particuliers ; l'agent prépare le reste.
Découvrir
Détails
Détails
Régler l'agent de relance
Ajouter l'agent de relance
=
=
Numéro de TVA relevé
RIB vérifié
Factures fournisseurs
Déposez factures, bons de livraison et attestations. Omega en extrait les champs utiles et les classe dans le bon dossier.
Régler l'agent des factures
Ajouter l'agent des factures
Quels clients faut-il recontacter ?
Clients sans commande depuis 90 jours
Contrats à renouveler ce mois-ci
Commandes restées en plan
Échéances de la semaine
Clients inactifs
Demandez en langage courant qui recontacter, et recevez la liste des clients qui ne commandent plus et des contrats à renouveler, avec un message prêt pour chacun.
Régler l'agent des clients inactifs
Ajouter l'agent des clients inactifs
=
Gabriel Meyer
Pouvez-vous me rappeler cette semaine ?
Demandes clients
Un assistant sur WhatsApp et par mail qui prépare les réponses aux demandes de vos clients à partir de vos tarifs et de vos horaires, pour que votre équipe n'ait plus qu'à les valider.
Régler l'agent des demandes
Ajouter l'agent des demandes"""

B["s4 Intégrations"] = """Les modèles d'IA
Claude
ChatGPT
Anthropic
Gemini
OpenAI
Les meilleurs modèles d'IA.
Rien à brancher.
Omega fait travailler ses agents avec les modèles des principaux laboratoires d'IA, sans rien à configurer de votre côté.
Voir les agents
Parler à l'équipe
Les laboratoires d'IA
Google
Mistral AI
Le Chat
DeepMind
GPT"""

B["s5 Marque"] = """Documents
Votre nom sur chaque document.
Votre marque sur chaque devis, facture et relance.
Gérez chaque société sous son propre nom. Chacune garde ses clients, sa numérotation et ses mentions légales, et ses documents partent sous son en-tête.
Votre société
Aperçu
Choisir une société
M
Maison Laurent
Société principale
A
Alpes Distribution
Filiale
J
Jura Services
Filiale
H
Holding Laurent
Holding
Couleur
Sarcelle
Marine
Framboise
Olive
Ardoise
Anthracite
Angles
Doux
Vifs
=
Jeudi 19 novembre
Bonjour Maya
Prochaine livraison · 25 novembre
4 218,60 €
Reste à payer sur le devis
Devis
Commandes
Documents
Paiements
19 % réglé
Accueil
Factures
Commandes
Moi
Devis
Novembre 2026
Client
Maya Martin
Date du devis
12 nov. 2026
Objet
Équipement des bureaux
Validité
30 jours
Prestations
Fourniture et livraison
5 450,00 €
Installation, 6 h
186,00 €
Déductions
Acompte versé
−1 021,40 €
Remise, 5 %
−272,50 €
Reprise de l'ancien matériel
−123,50 €
Reste à payer
Émis avec Omega. Une question sur ce devis ? Répondez simplement à ce mail.
Réglez votre marque une fois.
Ajoutez votre logo, vos couleurs et vos mentions légales, et vos devis, factures et relances suivent aussitôt.
4 sociétés
Chercher une société
H
Holding Laurent
48 personnes
· clôture de novembre
Validée
Maison Laurent
12 personnes
À valider
=
Alpes Distribution
136 personnes
Clôturée le 15 nov.
=
Jura Services
9 personnes
Installation
Ajouter une société
Gérez toutes vos sociétés depuis un seul compte.
Chaque société garde ses clients, ses fournisseurs et ses données. Passez de l'une à l'autre sans vous déconnecter.
Votre proposition
Ajouter
Gestion
Les six modules de gestion
34,90 €
par personne, par mois
Pack relances
Devis et factures relancés
dès 1 750 €
Pour Maison Laurent
12 personnes × 34,90 €
418,80 €
Écrite à la fin de l'audit, prix hors taxes
Envoyer
Le prix est écrit avant de commencer.
Après l'audit, vous recevez une proposition écrite, prix compris."""

B["s6 Sécurité"] = """Sécurité et conformité
Une sécurité à la hauteur de vos comptes.
Conformité et contrôle intégrés.
Chaque donnée chiffrée, chaque modification enregistrée, et chaque action d'agent validée par une personne. Vos données sont hébergées dans l'Union européenne, à Francfort.
Données chiffrées en transit et au repos
TLS
CHIFFRÉ
Rétention fournisseur : 30 jours
30 J
MAXI
Hébergement dans l'Union européenne
UE
Journal des actions
Quatre engagements écrits
Hébergées à Francfort, sans réplication hors de l'Union européenne. Jamais utilisées pour entraîner un modèle d'IA.
Où vont vos données
Où vont vos données
Relances
100 % validées
Factures fournisseurs
100 % contrôlées
Demandes clients
Un historique complet
90 derniers jours
Chaque action est tracée
Sauvegardes automatiques et supervision comprises. Le journal indique qui a validé quoi, et quand.
Voir l'espace client
Voir l'espace client
Validation humaine
Brouillons
Journal
Un compte par personne
Export complet
Des accès contrôlés à chaque niveau
Un compte par utilisateur, des droits par rôle, et une personne nommée pour valider chaque action d'agent.
Voir les agents
Voir les agents"""

B["s7 Clients"] = """Exemples
Ce qu'Omega fait chaque jour.
De la petite entreprise au groupe multi-sociétés.
Ce qui change quand les relances, les factures et les demandes clients passent sur Omega.
Chaque matin, l'agent reprend les devis sans réponse et les factures échues, rédige une relance dans votre ton et vous la présente. Vous la validez avant l'envoi.
Relances
Agent · relances et encaissements
Ventes, le module des devis et des factures
VENTES
DEVIS · FACTURES
« L'IA prépare le travail, vous le validez, et chaque action est enregistrée. »
Omega · notre méthode
Banque, le module des rapprochements
BANQUE
& TVA
Stock, le module des articles
STOCK
Chaque facture reçue est lue, rapprochée de sa commande et préparée pour la comptabilité. Un doublon est signalé, et un RIB modifié bloque le paiement jusqu'à votre accord.
Factures fournisseurs
Agent · factures fournisseurs"""

B["s8 Tarifs"] = """Tarifs
Un prix par utilisateur.
Ajoutez des automatisations quand vous le souhaitez.
L'ERP comprend tous les modules, à 34,90 € HT par utilisateur et par mois. Les automatisations se prennent par pack : l'installation se paie une fois, à partir de 1 750 € HT, puis l'IA se paie à la pièce, au prix fixé lors de l'audit.
Type de prix
Chaque mois
Installation
Une seule fois
Nombre de personnes
10 personnes
10 personnes
Audit
Nous voyons ce qu'Omega peut faire chez vous, et à quel prix.
0 €
offert
30 minutes
Offert
et sans engagement
Réserver l'audit
Ce qui est compris
Votre activité, passée en revue
Les modules et packs utiles
Une proposition écrite, prix compris
Le calendrier de démarrage
Votre tarif, écrit à la fin
Aucun engagement
Gestion
Dès la première personne
Toute votre gestion dans un seul ERP, configuré pour votre activité.
34,90 €
349,00 €
Parler à l'équipe
Ce qui est compris
Les six modules de gestion
Sans minimum de personnes
Vos données actuelles reprises
Vérifié par votre expert-comptable
50 Go de documents compris
Un interlocuteur dans notre équipe
Packs d'automatisations
Quatre packs de dix automatisations pour vos tâches répétitives.
À la pièce
Prix fixé
Voir les tarifs
Dans chaque pack
Jamais un pourcentage de vos encaissements
3, 6 ou 10 automatisations au choix
Aucun débit avant la fin de l'installation
Installés en 2 à 4 semaines
Un mois sans activité ne coûte rien
Export complet de vos données
Sur mesure
Nous construisons le module ou l'agent qui n'existe que chez vous.
Sur devis
Une automatisation ou un agent,
chiffré après diagnostic
Découvrir le sur-mesure
Construit pour vous
Votre organisation, étudiée avec vous
Un module ajouté à votre logiciel
Vos outils actuels raccordés
Données d'un autre logiciel reprises
Ce qu'il fait, écrit avant de commencer
Les six modules comme base"""

B["s9 Bande"] = ""

B["s10 FAQ"] = """FAQ
Vos questions, nos réponses.
Ce qu'on nous demande avant de passer à Omega.
Une question que nous n'avons pas abordée ? L'équipe qui construit Omega se fera un plaisir de vous répondre.
Écrire à l'équipe
Combien coûte Omega ?
34,90 € HT par utilisateur et par mois pour l'ERP. Les automatisations se prennent par pack : l'installation se paie une fois, à partir de 1 750 € HT pour 3 automatisations, 2 900 € HT pour 6 et 4 000 € HT pour les 10. Ensuite, l'IA se paie à la pièce, au prix fixé lors de l'audit.
Peut-on changer d'offre plus tard ?
Oui. Vous commencez par un pack, ou par trois automatisations, et vous en ajoutez quand vous voulez. L'IA se paie à la pièce : un mois sans activité ne coûte rien.
Combien de temps faut-il pour passer sur Omega ?
Comptez deux semaines à un mois. Nos modèles d'IA paramètrent l'ERP et reprennent vos clients, vos articles, vos factures en cours et vos soldes, puis votre expert-comptable vérifie le paramétrage avant le démarrage.
Les agents font-ils quelque chose sans demander ?
Non. Les agents préparent les relances, les réponses et les écritures, mais tout ce qui part attend la validation d'une personne nommée. Chaque action est enregistrée, avec qui l'a validée et quand.
Où sont stockées nos données ?
Chiffrées au repos et en transit, dans un espace réservé à votre entreprise et hébergé à Francfort. Si votre politique interne l'exige, elles peuvent rester dans vos locaux.
Omega fonctionne-t-il avec nos outils ?
Oui. Omega se branche sur Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et d'autres. Vous pouvez aussi garder votre logiciel actuel et commencer par les agents.
Pouvez-vous construire un module rien que pour nous ?
Oui. Pendant l'audit, nous regardons comment vous travaillez. Vous repartez avec une proposition écrite, prix compris, et le module s'ajoute à votre ERP."""

B["s11 Appel"] = """Commencer
Passez votre gestion sur Omega.
Vous validez chaque action.
Réservez un audit de 30 minutes, apportez vos données actuelles, et laissez les agents préparer votre premier mois de gestion.
Parler à l'équipe"""

B["pied"] = """Agents
Le travail répétitif
Relances
Demandes clients
Clients inactifs
Factures fournisseurs
Sur mesure
Gestion
L'ERP
Ventes
Achats
Stock
Banque
Comptabilité
Tarifs
Ressources
Toute l'offre
Intégrations
Modèles de site
Blog
Automatisations
Audit offert
Omega
Réserver un audit
Espace client
Service client
Mentions légales
Où vont vos données
© 2026 Omega. Tous droits réservés.
OMEGA
Réserver un audit"""

# Ce qu'une liste alignée ne sait pas dire : la n-ième occurrence d'un même
# texte de la référence, quand elle doit se rendre autrement dans le bloc.
PRECIS = {
    "s2 Fiche": {"Pay##2": "Prestation", "Payroll##2": "Envoi"},
    "s5 Marque": {"M##2": "M", "a person, monthly##2": "par pack, une fois"},
    "s8 Tarifs": {
        "per employee##2": "HT par personne", "a month##2": "par mois",
        "a month for 50 people, billed yearly##2": "HT par mois pour 10 personnes",
        "per employee##3": "l'IA, selon", "a month##3": "le volume traité",
        "a month for 50 people, billed yearly##3": "à l'audit, sur vos volumes",
    },
    "s11 Appel": {"Get started##2": "Réserver un audit offert"},
}

AUDIT = "/reserver-un-audit"
LIENS = {
    "nav": {"Synnax": "/", "Platform": "/offres", "Solutions": "/offres#catalogue", "Developers": "/integrations",
            "Pricing": "/tarifs", "Talk To Sales": "/contact", "Get Started": AUDIT},
    "hero": {"We've closed a $20m seed round.": AUDIT, "Get it on Mac": AUDIT, "Explore Now": "/offres"},
    "s2 Fiche": {"Start a migration": AUDIT, "Book a demo": "/gestion"},
    "s3 Agents": {"Deploy##1": "/offres/relances-impayes", "Details##1": "/offres/relances-impayes",
                  "Deploy##2": "/offres/factures-fournisseurs", "Details##2": "/offres/factures-fournisseurs",
                  "Deploy##3": "/offres/nouvelles-affaires", "Details##3": "/offres/nouvelles-affaires",
                  "Deploy##4": "/offres/demandes-clients", "Details##4": "/offres/demandes-clients"},
    "s4 Intégrations": {"See integrations": "/offres", "Talk to sales": "/contact"},
    "s6 Sécurité": {"Visit the trust centre": "/vos-donnees", "View system status": "/espace2", "Explore enterprise": "/offres"},
    "s8 Tarifs": {"Choose Payroll": AUDIT, "Choose People": "/contact", "Choose Autopilot": "/tarifs", "Talk to sales": "/offres/sur-mesure"},
    "s10 FAQ": {"Talk to sales": "/contact"},
    "s11 Appel": {"Get started": AUDIT, "Talk to sales": "/contact"},
    "pied": {
        "LinkedIn": "/offres#catalogue", "Payroll": "/offres/relances-impayes", "Onboarding": "/offres/demandes-clients",
        "Time off": "/offres/nouvelles-affaires", "Compliance": "/offres/factures-fournisseurs", "Insights": "/offres/sur-mesure",
        "X": "/gestion", "Agents": "/gestion#modules", "Integrations": "/gestion#modules", "White labelling": "/gestion#modules",
        "Security": "/gestion#modules", "Pricing": "/gestion#modules",
        "YouTube": "/tarifs", "About": "/offres", "Customers": "/integrations", "Careers": "/modeles", "FAQs": "/blog", "Contact sales": "/tarifs#packs",
        "Instagram": AUDIT, "Terms of service": AUDIT, "Privacy policy": "/espace2", "Cookie policy": "/contact",
        "POPIA": "/mentions-legales", "Data processing": "/vos-donnees", "Get it on Mac": AUDIT,
    },
}

IMAGES = {
    "/synnax-mark.svg": "/logo-pegase.png",
    "/hero/menu.svg": "/accueil-sx/menu.svg",
    "/integrations/arrow-light.svg": "/accueil-sx/chevron-clair.svg",
    "/integrations/arrow-dark.svg": "/accueil-sx/chevron-sombre.svg",
    "/integrations/backdrop-ellipse.svg": "/accueil-sx/halo.svg",
    "/integrations/sticker-calendar.svg": "/accueil-sx/ia-claude.svg",
    "/integrations/sticker-teams.svg": "/accueil-sx/ia-chatgpt.svg",
    "/integrations/sticker-gmail.svg": "/accueil-sx/ia-anthropic.svg",
    "/integrations/sticker-slack.svg": "/accueil-sx/ia-gemini.svg",
    "/integrations/sticker-notion.svg": "/accueil-sx/ia-openai.svg",
    "/integrations/sticker-quickbooks.svg": "/accueil-sx/ia-google.svg",
    "/integrations/sticker-xero.svg": "/accueil-sx/ia-mistral.svg",
    "/integrations/sticker-sage.svg": "/accueil-sx/ia-lechat.svg",
    "/integrations/sticker-drive.svg": "/accueil-sx/ia-deepmind.svg",
    "/integrations/sticker-wise.svg": "/accueil-sx/ia-gpt.svg",
    "/employees/akin-balogun.jpg": "/accueil-sx/avatar-ab.svg",
    "/employees/amy-mckinnon.jpg": "/accueil-sx/avatar-am.svg",
    "/employees/anne-marie-myburg.jpg": "/accueil-sx/avatar-ar.svg",
    "/employees/franki-esposito.jpg": "/accueil-sx/avatar-fe.svg",
    "/employees/guilermo-mendez.jpg": "/accueil-sx/avatar-gm.svg",
    "/employees/maryam-malek.jpg": "/accueil-sx/avatar-mm.svg",
    "/employees/prateek-gupta.jpg": "/accueil-sx/avatar-pg.svg",
    "/employees/roger-lin.jpg": "/accueil-sx/avatar-rl.svg",
}
DEFILE = ["Ventes", "Achats", "Stock", "Banque", "Comptabilité", "Documents", "Relances",
          "Demandes clients", "Factures fournisseurs", "Clients inactifs", "Sur mesure"]
# curseur des tarifs : de 1 à 50 personnes, 10 au départ (components/accueil-v3/textes.ts, CURSEUR)
CURSEUR = {"min": 1, "max": 50, "value": 10, "fill": "%.4f%%" % ((10 - 1) / (50 - 1) * 100)}

def typo(s):
    """Espaces insécables du français, posées ici une fois pour toutes."""
    s = re.sub(r"(\d) (\d{3})(?!\d)", "\\1\u202f\\2", s)
    s = re.sub(r" (€|%|k€|Go|h\b|j\b|min\b)", "\u00a0\\1", s)
    s = re.sub(r" ([?!:;»])", "\u00a0\\1", s)
    s = s.replace("« ", "«\u00a0")
    return s

CLES = {"nav": "nav", "hero": "hero", "s1 Plateforme": "s1", "s2 Fiche": "s2", "s3 Agents": "s3", "s4 Intégrations": "s4",
        "s5 Marque": "s5", "s6 Sécurité": "s6", "s7 Clients": "s7", "s8 Tarifs": "s8", "s9 Bande": "s9", "s10 FAQ": "s10",
        "s11 Appel": "s11", "pied": "pied"}
sortie, soucis = {}, 0
for nom, cle in CLES.items():
    src = SOURCE[nom]
    fr = [x for x in B[nom].split("\n")] if B[nom] else []
    if len(fr) != len(src):
        soucis += 1
        print("⚠ %s : %d lignes pour %d textes d'origine" % (nom, len(fr), len(src)))
        for i in range(0, max(len(fr), len(src)), 12):
            print("   %3d  %-38s | %s" % (i + 1, (src[i] if i < len(src) else "—")[:38], (fr[i] if i < len(fr) else "—")[:48]))
        continue
    d = {}
    for s, f in zip(src, fr):
        d[s] = typo(s.lstrip("@") if f == "=" else f)
    for k, v in PRECIS.get(nom, {}).items():
        d[k] = typo(v)
    sortie[cle] = d
sortie["__liens__"] = {CLES[k]: v for k, v in LIENS.items()}
sortie["__images__"] = IMAGES
sortie["__defile__"] = DEFILE
sortie["__curseur__"] = CURSEUR
sortie["__mot_symbole__"] = "OMEGA"
# Teo, 25/11 : le prix « dans la phrase, juste en dessous, en plus petit, mais
# qu'il se voie ». Ligne ajoutée sous le chapô du héros (convertir.py).
sortie["__prix_hero__"] = {"avant": typo("À partir de "), "prix": typo("34,90 € HT"), "apres": typo(" par utilisateur et par mois.")}
if soucis:
    sys.exit("textes-fr.json NON écrit : %d bloc(s) décalé(s)" % soucis)
json.dump(sortie, open(os.path.join(ICI, "textes-fr.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("textes-fr.json écrit :", sum(len(v) for k, v in sortie.items() if not k.startswith("__")), "entrées")
if "--controle" in sys.argv:
    for nom, cle in CLES.items():
        src = SOURCE[nom]
        for i in range(0, len(src), 9):
            print("%-5s %3d  %-40s | %s" % (cle, i + 1, src[i][:40], sortie[cle][src[i]][:52]))
