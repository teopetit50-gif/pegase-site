# Daliro v2 — le chantier suivi du premier appel au décompte final

Brief produit, version 2 du 11/11/2026. Il n'y avait pas de brief v2 pour Daliro : Teo avait
demandé le 11/11 au matin de ne pas y toucher, puis, le soir, en relisant les pages : « le premier
titre de Daliro, "les travaux hors devis se perdent entre le chantier et la facture", ce n'est
pas vraiment l'outil qu'on vend ; on vend un truc beaucoup plus complexe, regarde ce qu'on a fait
avec Corail BTP ». Ce brief est écrit sur le modèle des autres (Tamila, Lorani, Tiroma, Tavaro,
Varelo) : les trois plus gros SaaS américains du bâtiment, ce qu'on leur reprend, un seul produit
à vendre, et ce que la page doit dire.

## 0. Ce que la v2 change par rapport à ce qui est vendu aujourd'hui ◆

| Aujourd'hui (page `/secteurs/btp`) | v2 | Pourquoi |
|---|---|---|
| Héros : « Les travaux hors devis se perdent entre le chantier et la facture » ; trois fonctions juxtaposées (travaux supplémentaires, sous-traitants à J-2, approvisionnement) | Le chantier suivi sur UN FIL : l'appel et le devis dicté, le marché vérifié, le planning et les passages confirmés, le terrain lu (photos, vocaux, mails, appels), l'avenant signé avant l'ouvrage, l'approvisionnement calé, la situation et la facture, la réception | La page vend une astuce (l'avenant) ; l'espace `/espace2/daliro` construit pour l'audit de Corail BTP (05 et 06/11) tient tout le chantier : vue d'ensemble, chantiers, fiche, à ranger, à faire, appels, mails, devis dicté, avenants et situations, approvisionnement, équipes, planning, météo, argent, annuaire, réglages. |
| « Avant le départ sur chantier, trois listes » | Le point du matin par personne (conducteur, chef d'équipe, bureau), comme le « huddle » de Dental Intelligence chez Tiroma | Même grammaire que les cinq autres logiciels. |
| Aucune lecture des appels ni des mails | Les appels transcrits en tickets avec leurs suites ; les mails de l'entreprise rangés par chantier (pages Appels et Mails, 05 et 06/11) | C'est ce que Corail BTP a demandé en premier : « où est-ce que je vois tous mes appels ? » |
| Le devis reste dans l'outil du client | Le devis dicté sur le chantier, chiffré sur la bibliothèque de prix, relu avant envoi (page « Dicter un devis », 06/11) | Jobber Copilot rédige un devis depuis une description ; Procore AI Go prend la voix ; on le fait en français, sur les prix de l'entreprise. |
| Aucun chiffre, aucun client, aucun prix | Inchangé | Doctrine. |

## 1. Vision en une phrase

Un SaaS français qui suit chaque chantier d'une entreprise du bâtiment du premier appel au
décompte final : l'appel transcrit et le devis dicté, le marché vérifié ligne à ligne, les
passages des équipes et des sous-traitants confirmés à J-2, le terrain lu dans ce que les équipes
envoient déjà (photos, vocaux, messages, mails), chaque travail hors marché chiffré sur les prix
de l'entreprise et signé avant l'ouvrage, les livraisons calées sur la pose, la situation de fin
de mois établie sur l'avancement constaté, la réception et ses reprises, et chaque matin, pour
chaque personne, la liste de ce qu'elle a à décider.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

Recherche du 11/11/2026 (sources en section 15).

| SaaS US | Ce qu'on lui reprend | Où ça va chez Daliro | Ce que Daliro fait de mieux |
|---|---|---|---|
| **Procore** (plateforme de gestion de chantier ; « Digital Coworker » lancé le 23/07/2026 en trois paliers, agents Daily Log, RFI, Submittal, Contract Review, Deep Search ; AI Go, l'application vocale annoncée le 21/10/2026 à Groundbreak) | Le journal de chantier rédigé par l'agent depuis les photos, les mails et les vocaux, relu par une personne ; les questions posées à la voix sur le chantier ; l'agent qui vérifie un document avant envoi ; les crédits partagés plutôt que les sièges | Le terrain lu (à ranger, fiche du chantier, activité), le devis dicté, l'avenant vérifié avant envoi, le prix par chantier et non par utilisateur | L'entreprise de 6 à 50 salariés qui n'a pas de « project manager » : les chefs d'équipe n'installent rien et écrivent comme d'habitude sur WhatsApp ; le Code civil (art. 1793) comme règle de l'avenant ; le prix d'une PME, pas d'un major |
| **Buildertrend** (constructeurs de maisons ; Client Updates, Bill Capture, Selections, avenants qui recalent le planning) | Le résumé hebdomadaire au client construit depuis le journal, le planning et les avenants ; la facture fournisseur lue et rapprochée ; l'avenant qui décale les tâches suivantes | Le fil du chantier envoyé au maître d'ouvrage ; les bons de livraison rapprochés ; l'ordre des lots recalé | Le marché à forfait français, les situations de travaux, la retenue de garantie et la réception avec réserves, que Buildertrend ne connaît pas |
| **ServiceTitan** et **Jobber** (artisans et dépannage ; réceptionniste IA au téléphone, Copilot qui rédige un devis depuis une description, planification et répartition des équipes) | L'appel pris et transcrit en ticket avec ses suites ; le devis rédigé depuis une description parlée, sur la grille de prix ; le planning par personne et par jour | Les pages Appels et Mails, « Dicter un devis », le planning (Float) et les équipes avec la confirmation à J-2 | Les sous-traitants confirmés à J-2 avec remplaçants proposés depuis l'annuaire, la météo qui repropose l'ordre de la semaine : la coordination entre corps d'état, que les outils d'artisans ne font pas |

Écartés comme modèles produit : Autodesk Construction Cloud (BIM et grands comptes), Fieldwire et
OpenSpace (listes de réserves et captures de site, reprises seulement pour la réception),
Trunk Tools et Document Crunch (recherche documentaire et contrats, hors cible).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil de l'appel au décompte, là
où Procore tient le chantier, Buildertrend le client et Jobber le téléphone ; la preuve par point
(chaque avenant avec ses photos datées, chaque situation avec son avancement constaté, chaque
confirmation avec sa réponse) ; aucune application à installer sur le terrain ; le droit français
du marché de travaux.

## 3. Problème adressé

Sur un chantier, l'information arrive dispersée : des appels pris entre deux visites, des
vocaux de vingt secondes, des photos sur WhatsApp, des mails de fournisseurs, un planning dans
un tableur, un devis dans un autre logiciel. Les travaux faits hors marché se perdent entre le
chantier et la facture ; un sous-traitant qui ne vient pas bloque le suivant ; la livraison
arrive trois jours avant la pose et dort sous la pluie ; la situation de fin de mois se fait de
mémoire ; les réserves de la réception traînent. Les outils en place tiennent chacun un morceau :
le logiciel de devis, le planning, la messagerie.

## 4. Cible utilisateur

- **Primaire** : entreprises du bâtiment de 6 à 50 salariés, tous corps d'état et entreprise
  générale, avec un ou plusieurs conducteurs de travaux et des sous-traitants réguliers.
- **Secondaire** : artisans de 2 à 6, par le plan Démarrage (le devis dicté, les appels, les
  avenants).
- **Tertiaire (plus tard)** : entreprises de 50 à 200, par forfait.

Personas : le dirigeant (décide, veut la marge par chantier), le conducteur de travaux (suit
huit chantiers, reçoit quarante messages par jour), le chef d'équipe (envoie photos et vocaux,
n'installe rien), l'assistante (devis, situations, factures), le sous-traitant (confirme à J-2).

## 5. Positionnement

« Le chantier suivi de l'appel au décompte, sans changer de logiciel. » Daliro lit le logiciel de
devis, le planning et les messages ; il n'en remplace aucun. Il se distingue des plateformes
américaines (grands comptes, application à installer, prix par siège) et des outils d'artisans
(le téléphone et le devis, pas la coordination des corps d'état).

## 6. Principes produit

1. **Rien à installer sur le terrain.** Les chefs d'équipe écrivent comme d'habitude ; Daliro lit
   là où les messages arrivent.
2. **L'avenant avant l'ouvrage.** Un travail hors marché est chiffré sur les prix de l'entreprise
   et signé par le client avant d'être refermé (Code civil, art. 1793).
3. **Preuve par point.** Chaque avenant porte ses photos datées ; chaque situation son avancement
   constaté ; chaque confirmation sa réponse et son heure.
4. **Rien ne part sans validation.** Un devis, un avenant, une situation, une relance : relus par
   une personne avant l'envoi ; le journal garde qui a validé quoi.
5. **Lecture seule sur les outils en place.** Le logiciel de devis et le planning sont lus, jamais
   modifiés.
6. **Données en Europe**, aucun entraînement sur les chantiers de l'entreprise.

## 7. Les huit étapes du fil ◆

1. **L'appel et le devis** (brique Jobber / ServiceTitan). L'appel pris et transcrit en ticket
   avec ses suites ; le devis dicté sur place, chiffré sur la bibliothèque de prix, relu, envoyé.
2. **Le marché** (déjà en ligne). Le devis importé ligne à ligne, chaque ligne rattachée à un lot,
   les écarts acceptés avec motif, le marché vérifié et figé.
3. **Le planning et les passages** (brique ServiceTitan + Procore). Les équipes et les
   sous-traitants au planning ; chaque passage confirmé à J-2 ; remplaçants proposés depuis
   l'annuaire ; la météo qui repropose l'ordre de la semaine.
4. **Le terrain lu** (brique Procore, Daily Log). Photos, vocaux, messages, mails et appels rangés
   par chantier ; le journal du chantier écrit depuis ce que les équipes envoient.
5. **L'avenant** (déjà en ligne). Le travail hors marché repéré, chiffré, joint à ses photos,
   signé sur le téléphone du chef d'équipe avant l'ouvrage.
6. **L'approvisionnement** (déjà en ligne). La liste cadencée depuis le devis, chaque livraison
   calée sur la pose, le bon de livraison rapproché de la commande, les retours suivis.
7. **La situation et la facture** (brique Buildertrend). L'avancement constaté sur les photos de
   la semaine, la situation de fin de mois préparée, la facture rattachée, le résumé envoyé au
   maître d'ouvrage.
8. **La réception** (brique Fieldwire, reprise seulement ici). Les réserves photographiées et
   datées, celles hors marché chiffrées à part, la levée suivie jusqu'au décompte final.

Transversal : **le point du matin** par personne (conducteur, chef d'équipe, bureau, dirigeant),
et **l'argent du chantier** (marge à date par lot, facturé, déboursé, heures).

## 8. Moteur transversal : lecture, rapprochement, preuve

- **Lecture** : WhatsApp, SMS, courriel, appels (transcription), photos, vocaux ; le logiciel de
  devis et le planning par export ou connecteur ; les bons de livraison et les factures en PDF.
- **Rapprochement** : message ↔ chantier ↔ lot ; ouvrage constaté ↔ ligne du marché ; livraison ↔
  commande ↔ pose ; avancement ↔ situation ; réserve ↔ marché.
- **Preuve par point** : un avenant sans photo n'est pas proposé ; une situation sans avancement
  constaté est marquée « à constater » ; une confirmation sans réponse est « sans réponse »,
  jamais « confirmée ».
- **Règle de remboursement** : la même que les autres briefs (point valide, N et seuil à fixer
  après les pilotes, à écrire dans les CGV).

## 9. Intégrations

MVP : WhatsApp, SMS, courriel, téléphone (transcription), import du devis (PDF, tableur). Ensuite :
les logiciels de devis et de gestion des PME du bâtiment français, par connecteur ; la
comptabilité en lecture seule. Aucune écriture dans aucun de ces outils.

## 10. Modèle économique

Abonnement par entreprise selon le nombre de chantiers ouverts (Démarrage 5, Chantiers 20,
Entreprise sur mesure), comme aujourd'hui ; chefs d'équipe sans limite ; prix fixé à l'audit sur
les chantiers réels (`prix: null`). Jamais par siège : c'est le modèle Procore (crédits partagés,
« no per-seat fees ») plutôt que ServiceTitan (par technicien).

## 11. MVP ◆

Ce qui tourne déjà dans `/espace2/daliro` (étapes 2, 3, 4, 5, 6, le point du matin, l'argent, les
appels, les mails, le devis dicté) devient le MVP vendu. Les étapes 7 (situation préparée depuis
l'avancement constaté) et 8 (réception) suivent le premier pilote.

## 12. Non-objectifs

Pas de BIM. Pas de remplacement du logiciel de devis ni de la comptabilité. Pas de paie. Aucun
avenant, devis ou situation envoyé sans validation. Pas de chiffre de gain promis.

## 13. Indicateurs de succès

Mesurés sur les chantiers pilotes, jamais affichés avant : messages rangés sans intervention ;
avenants signés avant l'ouvrage sur avenants repérés ; passages confirmés à J-2 sur passages
prévus ; livraisons arrivées le jour de la pose ; situations établies le dernier jour du mois.

## 14. Risques et parades

| Risque | Parade |
|---|---|
| Une photo mal rattachée à un chantier | « À ranger » : rien n'est rattaché sans validation quand le rapprochement est incertain |
| Un prix unitaire faux dans l'avenant | La bibliothèque de prix est validée par le dirigeant ; l'avenant est relu avant envoi |
| Un sous-traitant qui confirme et ne vient pas | La confirmation est horodatée ; le remplaçant est proposé le soir même |
| Comparaison avec Procore sur l'étendue | Daliro ne vise pas le major : une entreprise de 6 à 50, sans application à installer, au prix d'une PME |
| Chiffres d'éditeurs US repris par réflexe | Aucun chiffre sur la page sans source publique datée |

## 15. Sources (consultées le 11/11/2026)

- Procore, AI plans (Digital Coworker, trois paliers, 23/07/2026) : https://www.procore.com/ai/plans ; crédits : https://v2.support.procore.com/faq-how-are-ai-credits-managed ; agents (Daily Log, RFI, Submittal, Contract Review, Deep Search) : https://www.procore.com/press/new-procore-ai-experience-embeds-datagrid-into-procore ; AI Go (Groundbreak, 21/10/2026, tiers) : https://www.hardlineapp.com/insights/procore-meta-smart-glasses-construction ; https://www.marketscale.com/industries/engineering-and-construction/procores-ai-go-app-lets-jobsite-crews-ask-their-project-data-out-loud
- Buildertrend, IA (Client Updates, Bill Capture, Selections ; tiers) : https://www.usecarly.com/blog/buildertrend-ai/ ; planning et avenants : https://buildertrend.com/project-management/schedule/
- ServiceTitan, prix par technicien et Titan Intelligence (tiers) : https://procured.us/articles/servicetitan-pricing ; https://pfeifferdigital.com/blog/servicetitan-ai-features-guide-2026-08-29-19d62c
- Jobber, réceptionniste IA et Copilot (tiers) : https://www.serviceharness.com/software/jobber ; https://www.usecarly.com/blog/jobber-ai-receptionist/
- Fieldwire, OpenSpace, Autodesk Construction Cloud (tiers) : https://constructable.ai/blog/best-punch-list-software-general-contractors ; https://www.unite.ai/best-ai-tools-for-the-construction-industry/
- Trunk Tools, Document Crunch (tiers) : https://www.cbinsights.com/compare/document-crunch-vs-trunk-tools

## 16. Ce que le prompt doit produire, dans cet ordre

1. Le PRD du MVP (section 11) à partir des pages de `/espace2/daliro` déjà construites.
2. L'architecture : lecture des canaux, transcription des appels, rapprochement message ↔
   chantier, bibliothèque de prix, journal des validations, hébergement en Europe.
3. Le plan pilote : trois entreprises de 6 à 50, un trimestre, protocole de mesure.
4. La page `/secteurs/btp` : faite le 11/11 dans le même commit que ce brief (héros, fiches,
   formules, questions ; même dessin).
