# Tiroma v2 — le patient suivi de la demande de rendez-vous au dernier soin

Brief produit, version 2 du 11/11/2026. Il n'y avait pas de « PROMPT PRODUIT » v1 pour Tiroma :
la v1, c'est ce que la page `/secteurs/dentaire` et l'espace `/espace2/tiroma` vendent
aujourd'hui (le point du matin, les créneaux à sauver, la charge des fauteuils, les plans sans
rendez-vous, la vérification avant rendez-vous). Les passages marqués ◆ sont ceux que la v2
ajoute ou change.

L'idée est celle des briefs Tamila et Lorani : reprendre les briques des trois plus gros SaaS
américains du cabinet dentaire, les fondre en un seul produit français qui suit le patient de
bout en bout, et le faire mieux parce qu'il connaît le cabinet français (logiciels de cabinet,
devis conventionnel, mutuelles et tiers payant, Doctolib, hébergement des données de santé) et
parce qu'il prouve chaque point. Tiroma existe : la v2 l'étend, elle ne repart pas de zéro.

## 0. Ce que la v2 change par rapport à ce qui est vendu aujourd'hui ◆

| Aujourd'hui (page et espace en ligne) | v2 | Pourquoi |
|---|---|---|
| Tiroma commence au point du matin : il lit un agenda déjà rempli | Tiroma commence à la DEMANDE : la prise de rendez-vous, le rappel de contrôle (recall) et la liste d'attente font partie du produit (Module 1) | Les trois SaaS US gagnent sur l'amont du créneau : la demande, le rappel, l'attente. Un créneau sauvé commence par un patient qui veut venir. |
| Le plan de traitement est suivi jusqu'au rendez-vous posé | Le plan est suivi jusqu'au DERNIER SOIN et au dernier règlement : séances restantes, accord de mutuelle, reste à charge, impayé (Module 3) | Le plan interrompu est la galère n° 3 du métier (galeres-metier-par-secteur.md §18) : une série de rendez-vous et de règlements qui s'évaporent. |
| Le point du matin tient en trois décisions | Le point du matin devient la page unique du cabinet, avec les tâches assignées à chaque membre et la trace de ce qui a été fait la veille (Module 2) | C'est la brique Dental Intelligence : le huddle n'a de valeur que si chaque tuile ouvre une liste de patients à appeler et si la veille est relue. |
| Le téléphone et les textos restent à l'assistante | Tiroma prépare et trace chaque échange : le texto de proposition de créneau, le rappel, la confirmation, l'appel à passer, dans l'ordre (Module 4) ; il n'envoie rien sans qu'une personne du cabinet ait validé la règle | Weave vend d'abord le téléphone et le texto bidirectionnel. En France, l'envoi au patient est soumis au consentement et au RGPD : la règle est validée une fois, puis Tiroma applique. |
| « Sur des données d'exemple » partout | Toujours vrai tant que les chiffres ne viennent pas d'un cabinet pilote (section 13) | Doctrine : aucun résultat client, aucun chiffre non sourcé. |

## 1. Vision en une phrase

Un SaaS français qui suit chaque patient d'un cabinet dentaire de sa demande de rendez-vous au
dernier soin de son plan de traitement : la demande et le rappel, le créneau et son remplaçant
quand il saute, la préparation du rendez-vous, le plan signé jusqu'à sa dernière séance et son
dernier règlement, en lisant l'agenda, les plans et les devis du logiciel de cabinet sans jamais
y écrire, et en remettant chaque matin à chaque membre de l'équipe la liste de ce qu'il a à faire.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Tiroma | Ce que Tiroma fait de mieux |
|---|---|---|---|
| **Dental Intelligence** (Morning Huddle, Follow Ups) | Le huddle du matin construit chaque nuit depuis le logiciel de cabinet : tuiles « traitements non planifiés », « membres de la famille non planifiés », « rappels d'hygiène en retard », « soldes dus », « tentatives de suivi » ; chaque tuile ouvre la liste des patients à contacter ; l'onglet « hier » dit ce qui a été fait et ce qui ne l'a pas été ; les suivis assignés à une personne, avec des règles d'assignation automatiques | Module 2 (le point du matin, déjà en ligne, étendu aux tâches par personne et à la relecture de la veille), Module 3 (plans et règlements) | Le devis conventionnel français et l'accord de mutuelle comme étapes du plan ; la CCAM et le reste à charge au lieu de l'« AR balance » ; aucune promesse de production en plus (Dental Intelligence annonce +30 % de production : chiffre d'éditeur, on ne le reprend pas). |
| **Weave** (Quick Fill, textos bidirectionnels, rappels, recall) | La liste d'attente « au plus tôt » : à l'annulation, un texto part aux patients qui veulent le prochain créneau ; les rappels par texto, courriel et voix ; le texto bidirectionnel tenu dans un seul fil ; le rappel de contrôle lu depuis l'intervalle de soin du logiciel | Module 1 (demande, rappel, liste d'attente), Module 4 (les échanges avec le patient) | Le consentement RGPD par canal, la règle validée par le cabinet avant tout envoi, le texto qui propose un créneau COMPATIBLE avec le soin (durée, fauteuil, praticien, matériel) et pas seulement le prochain trou ; le français du cabinet, pas un gabarit traduit. |
| **NexHealth** (prise de rendez-vous en ligne, recall lié à la réservation, formulaires, synchronisation temps réel) | La réservation depuis le site, Google, un texto, un QR code ; le rappel de contrôle qui se réserve en un clic ; les formulaires avant rendez-vous ; la synchronisation avec le logiciel de cabinet | Module 1, Module 5 (la veille du rendez-vous) | Tiroma ne remplace pas Doctolib, qui tient la réservation en ligne de la majorité des cabinets : il LIT Doctolib et le logiciel de cabinet, et ne crée pas une troisième porte d'entrée. Le formulaire d'avant rendez-vous reste un document du cabinet, Tiroma vérifie qu'il est revenu. |

Écartés comme modèles produit : Overjet, Pearl et VideaHealth (lecture des radiographies, aide au
diagnostic : dispositif médical, hors périmètre, section 12) ; Dentrix, Eaglesoft, Open Dental et
Curve (logiciels de cabinet : Tiroma s'y branche, il ne les remplace pas).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil de la demande au dernier
soin, là où les trois couvrent chacun un morceau (l'amont du créneau pour NexHealth, le
téléphone pour Weave, le matin pour Dental Intelligence) ; la preuve par point (section 8) ; la
lecture seule du logiciel de cabinet ; l'hébergement des données de santé chez un hébergeur
certifié HDS, que les trois ignorent.

## 3. Problème adressé

Le cabinet français de deux à dix fauteuils vit avec un secrétariat saturé : appels non
décrochés, patients qui rappellent pour la même information, erreurs administratives et retards
récurrents (L'Information Dentaire, points de friction d'un cabinet ; galeres-metier-par-secteur.md
§18). Les rendez-vous non honorés tombent sur des créneaux longs, difficiles à recaser au pied
levé. Les plans de traitement signés s'interrompent : des séances et des règlements qui
s'évaporent, et un résultat clinique compromis.

Chacun de ces problèmes a son outil : le logiciel de cabinet (Logos, Julie, Visiodent, Veasy,
Desmos) tient l'agenda et les devis ; Doctolib tient la prise de rendez-vous et les rappels ; le
téléphone tient le reste. Personne ne lit les trois ensemble pour dire, chaque matin, quel
créneau sauver, quel plan planifier, quel patient appeler, et pour vérifier le soir que ça a été
fait.

## 4. Cible utilisateur

- **Primaire** : cabinets de groupe de 4 à 10 fauteuils, plusieurs praticiens, une ou deux
  assistantes, un secrétariat ; la décision revient au titulaire ou à l'associé gérant.
- **Secondaire** : cabinets de 2 à 3 fauteuils, par le plan Découverte.
- **Tertiaire (plus tard)** : centres dentaires et groupes multi-sites, par la page direction
  (plusieurs cabinets sur une page, section 7, Module 2).

Personas : le titulaire (décide), l'assistante ou la secrétaire (utilise chaque matin), le
praticien (lit sa journée), le responsable du centre (lit les sites).

## 5. Positionnement

« La couche qui lit l'agenda, les plans et les devis, et qui dit chaque matin quoi faire. »
Tiroma s'ajoute au logiciel de cabinet et à Doctolib, sans rien y écrire. Il se distingue des
agendas en ligne (qui prennent le rendez-vous mais ne savent pas quel soin a besoin de quel
créneau), des logiciels de cabinet (qui tiennent le dossier mais ne proposent pas de décision) et
des SaaS US (qui connaissent la facturation américaine et pas la mutuelle française). Il n'est
ni un logiciel de cabinet, ni un agenda en ligne, ni un outil d'imagerie, ni un outil de
facturation.

## 6. Principes produit

1. **Lecture seule.** Tiroma lit le logiciel de cabinet et Doctolib ; il n'y écrit jamais.
   Chaque rendez-vous, chaque texto, chaque règlement est validé et posé par le cabinet.
2. **Un soin, un créneau compatible.** Un créneau proposé tient compte de la durée du soin, du
   fauteuil, du praticien, du matériel (implant en stock, travail de laboratoire revenu).
3. **Une liste par personne, chaque matin.** Pas un tableau de bord : une liste de ce que
   l'assistante, le praticien et le titulaire ont à faire, dans l'ordre.
4. **Preuve par point.** Chaque proposition cite ce qui la justifie : le plan signé le 3 mars,
   l'accord de mutuelle reçu le 12, le créneau de 45 minutes libéré jeudi 9 h.
5. **Rien n'est envoyé sans règle validée.** Le cabinet valide une fois ce que Tiroma peut
   envoyer (quel texto, à qui, à quelle heure) ; ensuite Tiroma applique et trace.
6. **Données de santé chez un hébergeur certifié HDS**, en France, et aucun entraînement de
   modèle sur les dossiers des patients.

## 7. Les cinq modules ◆

**Module 1 — La demande, le rappel et la liste d'attente** (brique NexHealth + Weave). Le rappel
de contrôle lu depuis l'intervalle de soin du logiciel ; la liste des patients qui veulent le
prochain créneau, avec leur soin et sa durée ; à l'annulation, les patients compatibles dans
l'ordre, et le texto de proposition prêt ; le formulaire d'avant rendez-vous suivi (envoyé,
revenu, manquant). Tiroma lit Doctolib ; il ne prend pas le rendez-vous à sa place.

**Module 2 — Le point du matin et la page du cabinet** (brique Dental Intelligence, déjà en
ligne, étendu). Trois décisions pour ce matin ; les créneaux à sauver ; les plans sans
rendez-vous ; la charge des fauteuils ; les tâches de chacun ; l'onglet « hier » : fait, pas fait,
pourquoi. Pour un centre ou un groupe : la même page par site, et une page direction.

**Module 3 — Le plan de traitement jusqu'au dernier soin et au dernier règlement** ◆. Pour chaque
devis signé : les séances posées et restantes, l'accord de mutuelle (à demander, demandé, reçu),
le reste à charge, les règlements reçus et dus ; les plans qui dorment, du plus ancien au plus
récent ; les plans interrompus avec la dernière séance honorée et le motif connu.

**Module 4 — Les échanges avec le patient** ◆ (brique Weave). Chaque texto, courriel et appel
tenu dans un seul fil par patient ; la règle d'envoi validée par le cabinet (canal, heure, texte,
consentement) ; l'appel à passer avec le motif et les éléments à dire ; la réponse du patient
rattachée à son créneau ou à son plan.

**Module 5 — La veille du rendez-vous** (déjà en ligne). Deux jours avant : le retour du
laboratoire, l'implant en stock, l'accord de mutuelle, le formulaire revenu, la confirmation du
patient. Ce qui manque remonte avec la personne qui doit le régler.

## 8. Moteur transversal : lecture, croisement, preuve ◆

- **Lecture** : agenda, plans de traitement, devis, règlements du logiciel de cabinet (export ou
  connecteur selon l'éditeur) ; agenda et réservations Doctolib ; stock et laboratoire quand le
  cabinet les tient dans un fichier.
- **Croisement** : un soin ↔ sa durée, son fauteuil, son praticien, son matériel ; un plan ↔ ses
  séances, ses accords, ses règlements ; un patient ↔ son consentement par canal.
- **Preuve par point** : chaque ligne du point du matin porte sa source (quel plan, quel
  créneau, quel accord, quelle date). Un point sans source n'est pas affiché.
- **Règle de remboursement** : la même que Tamila et Lorani (point valide, N et seuil à fixer
  après les pilotes, à écrire dans les CGV).

## 9. Intégrations

Logiciels de cabinet français (Logos, Julie, Visiodent, Veasy, Desmos) par export ou connecteur
selon l'éditeur ; Doctolib ; messagerie du cabinet pour les courriels ; un fournisseur de textos
français ; le fichier de stock et le cahier de laboratoire du cabinet. Aucune écriture dans
aucun de ces outils.

## 10. Modèle économique

Abonnement par cabinet selon le nombre de fauteuils (Découverte 2 à 3, Cabinet 4 à 6, Équipe 7
à 10, Direction multi-sites), prix à fixer après les pilotes (`prix: null` sur le site tant que
Teo n'a pas tranché). Installation comprise ; les textos au coût du fournisseur.

## 11. MVP ◆

Modules 2 et 5 (déjà en ligne) + Module 3 (le plan jusqu'au dernier soin et au dernier
règlement) + la liste d'attente du Module 1 avec le texto de proposition PRÉPARÉ, pas envoyé.
Les envois automatiques (Module 4) et la lecture de Doctolib viennent après les premiers
cabinets pilotes.

## 12. Non-objectifs

Pas de lecture de radiographie ni d'aide au diagnostic (dispositif médical). Pas de prise de
rendez-vous en ligne concurrente de Doctolib. Pas de facturation ni de télétransmission. Pas
d'écriture dans le logiciel de cabinet. Pas de chiffre de production ou de chiffre d'affaires
promis.

## 13. Indicateurs de succès

Mesurés sur les cabinets pilotes, jamais affichés avant : créneaux annulés repris le jour même ;
plans signés sans rendez-vous à plus de 30 jours ; séances restantes honorées ; tâches du matin
faites le jour même ; temps de secrétariat au téléphone (douze heures hebdomadaires en officine
servent de repère, pas de promesse).

## 14. Risques et parades

| Risque | Parade |
|---|---|
| Un logiciel de cabinet sans export exploitable | Commencer par les éditeurs qui exportent ; dire au cabinet, avant l'installation, ce qui sera lu et ce qui ne le sera pas |
| Doctolib ferme sa lecture | Le Module 1 reste sur la liste d'attente tenue par le cabinet ; rien ne dépend de Doctolib au MVP |
| Textos envoyés sans consentement | Aucun envoi automatique au MVP ; règle validée par le cabinet et consentement par canal avant le Module 4 |
| Données de santé | Hébergeur certifié HDS avant le premier cabinet réel ; données d'exemple jusque-là |
| Chiffres d'éditeurs US repris par réflexe | Aucun chiffre sur la page sans source publique datée (doctrine §5) |

## 15. Ce que le prompt doit produire, dans cet ordre

1. Le PRD du MVP seul (section 11), à partir des écrans de `/espace2/tiroma` déjà construits.
2. L'architecture du MVP : lecture des logiciels de cabinet, hébergeur HDS, journal des accès.
3. Le plan pilotes : dix cabinets de 4 à 10 fauteuils, protocole de mesure des points confirmés.
4. Ensuite seulement : la page `/secteurs/dentaire` mise à jour (formules et promesses), avec la
   recette aux cinq largeurs et la mise en ligne habituelle.
