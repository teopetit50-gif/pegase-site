#!/usr/bin/env python3
"""Le contenu Omega de l'accueil « sx » -> outils/sx/textes-fr.json.

Chaque bloc est une liste ALIGNÉE, ligne pour ligne, sur les textes de la
référence relevés dans outils/sx/textes-source.json (même ordre, doublons
retirés). « = » garde le texte d'origine (un chiffre, une initiale).

D'où viennent ces phrases. Rien n'est inventé pour remplir une case :
  · titres, chapôs, situations, FAQ : components/accueil-v3/textes.ts
    (l'accueil précédent, validé par Teo) ;
  · prix : components/tarifs/TroisPrix.tsx (34,90 € HT / personne / mois ;
    agents dès 199 € HT ; installation sur devis) ;
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
Omega devient un ERX
Un logiciel de gestion qui fait le travail à votre place
Devis, factures, achats, stock, banque et comptabilité sont dans le même logiciel. Des agents IA s'occupent des relances, de la saisie des factures et des réponses aux clients. Vous relisez avant chaque envoi.
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

B["s1 Plateforme"] = """Logiciel
Un seul logiciel pour toute la gestion.
Et des agents qui avancent le travail chaque jour.
Vos ventes, vos achats et votre comptabilité partagent les mêmes données : une facture saisie met à jour le stock, la banque et les comptes. Chaque matin, les agents vous présentent ce qu'ils ont préparé.
Ce que fait le logiciel
Relancer les impayés
Traiter les factures
Répondre aux demandes
Contrôler les paiements
Suivre la trésorerie
Chaque matin, l'agent repère les devis restés sans réponse et les factures en retard, puis rédige les relances. Vous relisez la liste et vous validez en un clic.
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
Quand une facture fournisseur arrive, l'agent la lit, retrouve la commande correspondante et vérifie les montants. Il prépare ensuite l'écriture comptable : il n'y a plus rien à recopier.
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
Vos clients écrivent par mail ou par WhatsApp. L'agent rédige une réponse en tenant compte de l'historique du client et de l'agenda de l'équipe, puis vous la soumet.
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
Avant chaque virement, l'agent compare la facture à la fiche du fournisseur et aux paiements passés. Si le RIB a changé ou si la facture est en double, le paiement attend votre accord.
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
Posez une question sur la trésorerie, les ventes ou les achats, comme vous la poseriez à un collaborateur. La réponse affiche les chiffres utilisés et le détail du calcul.
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

B["s2 Fiche"] = """Configuration par l'IA
Une installation faite pour vous.
Vous décrivez votre activité, l'IA configure le logiciel.
Vous nous expliquez comment vous travaillez. L'IA en déduit les réglages : modules utiles, taux de TVA, plan comptable. Notre équipe reprend les données de votre ancien logiciel, et votre expert-comptable vérifie avant le démarrage.
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
Tout est relié.
Un devis signé met à jour le stock, la facturation et la comptabilité.
Votre banque est connectée.
Les paiements reçus sont rapprochés des factures, sans saisie.
Les règles comptables sont intégrées.
TVA et plan comptable sont réglés dès l'installation.
Posez vos questions.
Une fiche client ou un chiffre s'affiche en quelques secondes."""

B["s3 Agents"] = """Nouveau
Des agents sur mesure
Des agents pour les tâches répétitives.
Un agent est un assistant IA chargé d'une tâche précise. Il applique vos règles et vous montre son travail avant d'envoyer quoi que ce soit.
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
Les devis sans réponse et les factures en retard sont relancés à J+3, J+7 et J+21, avec le ton que vous avez choisi. Chaque matin, vous validez la liste avant l'envoi.
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
Factures, bons de livraison, attestations : chaque document reçu est lu, vérifié, classé, puis envoyé en comptabilité, sans que vous ayez à le recopier.
Régler l'agent des factures
Ajouter l'agent des factures
Quels clients faut-il recontacter ?
Clients sans commande depuis 90 jours
Contrats à renouveler ce mois-ci
Commandes restées en plan
Échéances de la semaine
Clients inactifs
L'agent repère les clients qui n'ont pas commandé depuis longtemps, les contrats à renouveler et les commandes en suspens. Il prépare un message pour chacun, que vous validez.
Régler l'agent des clients inactifs
Ajouter l'agent des clients inactifs
=
Gabriel Meyer
Pouvez-vous me rappeler cette semaine ?
Demandes clients
Quand un client écrit par mail ou par WhatsApp, même le soir, l'agent rédige aussitôt la réponse. Elle part seule si vous l'avez autorisé, sinon elle attend votre accord.
Régler l'agent des demandes
Ajouter l'agent des demandes"""

B["s4 Intégrations"] = """Les modèles d'IA
Claude
ChatGPT
Anthropic
Gemini
OpenAI
Les IA des grands laboratoires.
Au travail dans votre gestion.
Omega utilise les modèles des principaux laboratoires d'IA pour faire fonctionner ses agents.
Voir les agents
Parler à l'équipe
Les laboratoires d'IA
Google
Mistral AI
Le Chat
DeepMind
GPT"""

B["s5 Marque"] = """Documents
Des documents à l'image de votre entreprise.
Logo, couleurs et mentions légales sur chaque document.
Devis, factures et relances partent au nom de la bonne société, avec ses mentions légales, ses conditions de paiement et sa numérotation.
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
Une présentation par société.
Quand vous changez de société, ses devis, ses factures et ses relances prennent automatiquement son logo et ses couleurs.
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
Plusieurs sociétés, un seul compte.
Chaque société garde ses clients, ses fournisseurs et ses contrats. Vous passez de l'une à l'autre sans vous reconnecter.
Votre proposition
Ajouter
Gestion
Les six modules de gestion
34,90 €
par personne, par mois
Agent de relance
Devis et factures relancés
dès 199 €
Pour Maison Laurent
12 personnes × 34,90 €
418,80 €
Écrite à la fin de l'audit, prix hors taxes
Envoyer
Le prix est écrit avant de commencer.
Après l'audit, vous recevez une proposition écrite, prix compris."""

B["s6 Sécurité"] = """Vos données
Protégées et hébergées en Europe.
Chaque action d'un agent est enregistrée.
Vos données sont stockées dans un espace réservé à votre entreprise, chiffré et hébergé dans l'Union européenne. Les agents attendent votre accord pour agir, et chaque action reste consultable dans un journal.
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
Vos données sont stockées à Francfort et ne sortent pas de l'Union européenne. Elles ne servent jamais à entraîner un modèle d'IA.
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
Le journal indique qui a validé quoi, et quand. L'hébergement, les sauvegardes et la surveillance sont compris dans le prix.
Voir l'espace client
Voir l'espace client
Validation humaine
Brouillons
Journal
Un compte par personne
Export complet
Vous décidez de ce qui part
Au départ, tout ce qui sort passe par votre validation. Vous pouvez ensuite autoriser un agent à envoyer seul certains messages.
Voir les agents
Voir les agents"""

B["s7 Clients"] = """Exemples
Ce qu'Omega fait concrètement.
De la vente à la clôture des comptes, pour une société comme pour un groupe.
Voici des tâches que les agents et les modules d'Omega prennent en charge chaque jour. Vous gardez toujours la décision finale.
Chaque matin, les relances des devis en attente et des factures en retard sont prêtes, écrites dans votre ton, et chaque demande reçue a déjà sa réponse rédigée. Rien ne part sans votre validation.
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
Chaque facture reçue est lue et rapprochée de sa commande. Un RIB modifié ou un doublon suspend le paiement jusqu'à votre accord.
Factures fournisseurs
Agent · factures fournisseurs"""

B["s8 Tarifs"] = """Tarifs
Des prix simples à comprendre.
Le logiciel par personne, les agents selon leur travail.
Le logiciel coûte 34,90 € HT par mois pour chaque personne qui l'utilise, dès la première. Chaque agent a son propre prix, à partir de 199 € HT par mois, selon le nombre de dossiers qu'il traite. Une automatisation se paie une seule fois, à l'installation, dès 49 € HT.
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
Les modules et agents utiles
Une proposition écrite, prix compris
Le calendrier de démarrage
Votre tarif, écrit à la fin
Aucun engagement
Gestion
Dès la première personne
Toute votre gestion dans un seul logiciel, configuré pour votre activité.
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
Agents IA
Des agents qui prennent en charge vos tâches répétitives.
dès 199 €
Prix fixé
Voir les tarifs
Pour chaque agent
Jamais un pourcentage de vos encaissements
Remise de 10 % dès 3 agents, de 15 % dès 5
Aucun débit avant la fin de l'installation
Mensuel, sans engagement
Remboursé pendant 30 jours
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
Questions fréquentes.
Ce qu'on nous demande avant l'audit.
Une question manque ? Notre équipe vous répond le jour même.
Écrire à l'équipe
Combien coûte Omega ?
Le logiciel coûte 34,90 € HT par personne et par mois. Chaque agent coûte à partir de 199 € HT par mois. L'installation se paie une seule fois. Une automatisation s'installe dès 49 € HT, une fois ; quand l'IA y travaille, chaque tâche se paie ensuite à la pièce, de 0,15 à 0,10 € HT selon la recharge.
Que se passe-t-il si l'offre ne convient pas ?
Pour les agents, le remboursement est intégral pendant 30 jours à compter de la mise en service, sans justification à fournir. Au-delà, leur formule mensuelle reste résiliable à tout moment, et l'export complet de vos données vous est remis. Pour le logiciel de gestion, les conditions de sortie sont écrites dans votre devis, avant tout engagement.
Qui s'occupe de l'installation ?
Notre équipe, du début à la fin. L'IA adapte le logiciel à partir de ce que vous lui décrivez, nous reprenons vos données, et votre expert-comptable vérifie les réglages comptables avant le démarrage. Pour les agents, rien n'est débité avant la fin de leur installation.
Un agent peut-il envoyer quelque chose sans mon accord ?
Pas sans que vous l'ayez décidé. Au départ, tout ce qui sort passe par votre validation : une relance, une réponse, un mail. Ensuite, vous pouvez autoriser un agent à envoyer seul certains messages, et revenir en arrière à tout moment.
Où sont mes données ?
Dans un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne et jamais mélangé à celui d'un autre client. L'IA ne reçoit que le strict nécessaire à chaque tâche, et rien n'est réutilisé à d'autres fins.
Faut-il changer nos outils ?
Vous choisissez. Omega peut devenir votre logiciel de gestion, avec la reprise des données de votre logiciel actuel, ou commencer par des agents branchés sur ce que vous utilisez déjà : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et bien d'autres.
Pouvez-vous construire un module rien que pour nous ?
Oui, c'est l'offre sur mesure. Pendant l'audit, nous regardons avec vous comment vous travaillez : qui fait quoi, sur quels logiciels, et qui valide. Vous repartez avec une proposition écrite, prix compris, avant tout engagement."""

B["s11 Appel"] = """Commencer
Voyons ensemble ce qu'Omega peut faire chez vous.
30 minutes, gratuites et sans engagement.
Nous regardons comment vous travaillez aujourd'hui, quels outils vous utilisez et ce qui vous prend le plus de temps. Vous recevez ensuite une proposition écrite, avec le prix.
Parler à l'équipe"""

B["pied"] = """Agents
Le travail répétitif
Relances
Demandes clients
Clients inactifs
Factures fournisseurs
Sur mesure
Gestion
L'ERX
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
    "s5 Marque": {"M##2": "M", "a person, monthly##2": "par agent, par mois"},
    "s8 Tarifs": {
        "per employee##2": "HT par personne", "a month##2": "par mois",
        "a month for 50 people, billed yearly##2": "HT par mois pour 10 personnes",
        "per employee##3": "HT par agent", "a month##3": "par mois",
        "a month for 50 people, billed yearly##3": "à l'audit, selon les dossiers suivis",
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
        "YouTube": "/tarifs", "About": "/offres", "Customers": "/integrations", "Careers": "/modeles", "FAQs": "/blog", "Contact sales": "/tarifs#automatisations",
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
sortie["__prix_hero__"] = {"avant": typo("À partir de "), "prix": typo("34,90 € HT"), "apres": typo(" par personne et par mois.")}
if soucis:
    sys.exit("textes-fr.json NON écrit : %d bloc(s) décalé(s)" % soucis)
json.dump(sortie, open(os.path.join(ICI, "textes-fr.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("textes-fr.json écrit :", sum(len(v) for k, v in sortie.items() if not k.startswith("__")), "entrées")
if "--controle" in sys.argv:
    for nom, cle in CLES.items():
        src = SOURCE[nom]
        for i in range(0, len(src), 9):
            print("%-5s %3d  %-40s | %s" % (cle, i + 1, src[i][:40], sortie[cle][src[i]][:52]))
