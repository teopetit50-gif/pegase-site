# Promesses du site sans page dans l'espace client — audit et plan (02/11/2026)

Demande de Teo (02/11, 18 h 45 UTC) : vérifier tout ce que le site promet pour les cinq SaaS métiers
(Daliro, Lorani, Tamila, Tavaro, Tiroma ; Varelo, pour les groupes, est hors champ), repérer les
fonctions qui demandent une page et n'en ont pas, puis faire construire ces pages comme la refonte :
copie 1:1 d'une page réelle déjà relevée (`REGLES.md`, `cloud/COMMUN.md`).

Méthode : chaque promesse de `components/secteurs/<secteur>/` et de `lib/secteurs.ts` a été citée,
puis cherchée dans `/espace2/<métier>/*`, dans l'inventaire et dans le back-end (`omega/modules/<métier>`,
`components/espace/<métier>/portes.ts`). Environ 170 promesses lues ; la grande majorité a déjà sa place.

## Règles de ce lot (décidées par la session coordinatrice, Teo absent)

1. **On ne construit que ce dont le back-end existe.** Aucune migration, portes inchangées (règle de la
   refonte). Une promesse sans back-end est notée plus bas, pas maquettée.
2. **Une vraie page nouvelle** seulement quand la fonction est un écran à part entière sans place
   aujourd'hui. Le reste devient une section ou un geste d'une sous-page existante.
3. **Référence** : une page déjà relevée (`claude/refs-linear-49bf64`, `claude/refs-plain-attio-cal-a3a72b`)
   que le métier n'a pas encore prise (une référence par sous-page dans un même métier). Aucun nouveau
   relevé : le conteneur cloud n'a pas accès aux comptes Linear, Plain, Attio, Cal.com de Teo.
4. **Nouvelles pages** = nouvelles sessions, branche `claude/pages-<métier>` tirée de `main`.
   **Sections dans les pages existantes** = la session de refonte du métier, après ses boutons, sur sa branche.
   La coordinatrice fusionne sur `main` et met en ligne.

## Nouvelles pages (6, dans 5 métiers)

| Métier | Page | Route | Promesses couvertes (citations du site) | Données et gestes (existants) | Référence proposée |
|---|---|---|---|---|---|
| DALIRO | Approvisionnement | `/espace2/daliro/approvisionnement` | « Liste cadencée depuis le devis », « Livraisons calées sur la pose », « Suivi des retours », « Bons de livraison rapprochés », « livraisons à caler » (une des trois listes du matin) ; puces « Quoi livrer cette semaine ? », « Livraisons à décaler ». Aujourd'hui : une carte par chantier dans la fiche, aucune vue de toute l'entreprise. | `chargerAppro` (`btp_appro_chantier`) appelée pour chaque chantier ; gestes d'ApproCarte : `preparerListe`, `ecrireCommande`, `noterCommande`, `noterLivraison`, `recevoir`, `noterRetour`, `annulerCommande` | Plain, Tasks (`plain-tasks.md`) : liste groupée par état (à commander, en retard, livraisons de la semaine, à décaler, bons avec écart, matériel à rendre) |
| LORANI | Questions et réponses | `/espace2/lorani/questions` | « Questions suivies jusqu'à la réponse », « 8 jours sans réponse… remonte le matin », « Transformer en question au BET » (la question créée n'a aucune liste ; O6 de `lorani.md`) | `lorani_points` (b5_20, b5_25) ; portes `ajouterPoints`, `majPoint` ; gestes « Réponse reçue », « Solder », relancer | Plain, Threads (`plain-threads.md`) : une question = un fil, destinataire, âge, extrait |
| LORANI | À viser | `/espace2/lorani/a-viser` | « Situations et décomptes » à viser sous 7 ou 15 jours, « Visas calés sur les délais de commande », « J-10 », échéances de réserves et d'attestations — tous projets confondus (aujourd'hui projet par projet) | `lorani_situations`, `lorani_visas`, `public.delais` (b5_13 à b5_15, b5_32, b5_33) ; portes `viserSituation`, `rendreVisa` | Linear, My issues (`linear-my-issues.md`) : groupes par échéance |
| TAVARO | Pilotage | `/espace2/tavaro/pilotage` | « Quatre indicateurs suivis : part facturée, délai de remise, celui de la dépanneuse, véhicules à sortir » ; chiffres d'exemple du site (« 302 € proposés », « 2 h 48 de remise ») | rpc `loc_indicateur_mois` ; médiane de remise (`loc_remises`, calcul de `ParcAtelier.tsx`) ; délai de dépanneuse calculé dans le navigateur depuis `loc_incidents.arrivee_estimee_le` ; véhicules à sortir `loc_fiches_flotte` ; filtre par agence | Plain, Insights (`plain-insights.md`) |
| TIROMA | Avant les rendez-vous | `/espace2/tiroma/avant` | Écran vendu « Avant les rendez-vous », « À J-2 » : retour du laboratoire, « Implants des chirurgies de la semaine » rapprochés du stock, « Orthodontie : accords et semestres », « Traitement interrompu », devis à échéance. Aujourd'hui : un groupe d'Aujourd'hui dont les lignes ne mènent nulle part | porte `tiroma_avant_rendez_vous(p_client, p_entite, p_jours)` (b3_04 ; `p_jours = 7` pour la semaine) ; `tiroma_stock`, `tiroma_travaux_labo`, `tiroma_ententes_odf` ; `?verif=` ; aiguillage : `tiroma_travaux_labo` et `tiroma_ententes_odf` → `/espace2/tiroma/avant?verif=` | Linear, Triage (`linear-triage.md`) : liste à gauche, vérification ouverte à droite ; onglets par nature, horizon J-2 / semaine |
| TAMILA | Dossier de faits | `/espace2/tamila/dossiers/[id]/faits` | « Chronologie sourcée », « Dossier de faits daté et sourcé », « Contradictions relevées… côte à côte », « Dossier de plaidoirie et renvois cliquables », « L'ensemble de la pré-lecture » (aujourd'hui dans une fenêtre « Lire ») | `analyses` (b4_15) déchiffrées comme la fenêtre de lecture actuelle ; lien depuis la fiche du dossier | Linear, Timeline (`linear-timeline.md`) pour la chronologie, ou Linear, page d'un ticket (`linear-ticket.md`) ; la session choisit et écrit pourquoi |

Tamila : la seule page nouvelle utile, « Pièces du jour » (« pièce adverse n° 23 reçue aujourd'hui »), n'a pas de
back-end (b4_10 ne reçoit que des avis RPVA). Le « Dossier de faits » a ses données (b4_15) : il devient une
sous-page de la fiche d’un dossier (dernière ligne du tableau).


## Sections et gestes dans les pages existantes (sessions de refonte, après les boutons)

- **DALIRO** : Vue d'ensemble, « Météo de la semaine » pour toute l'entreprise (`ordreMeteo(client)`, `echangerPassages`) ;
  À faire, tâches de commande et de livraison (motifs E07 à E12 du point du matin) ; Planning, geste « Affecter ce
  remplaçant » si une porte existe, sinon noté ; Réglages, lien « Journal des validations » vers `/espace2/activite?modules=daliro`.
- **LORANI** : Courrier à ranger, section « Courriels du guichet et situations à ranger » (b5_11, b5_14 ; E10, E11, E18) ;
  onglet Activité du projet, vue « Registre daté » (`dossier-date.ts`) ; Chantier, révision BT (b5_34) et bordereau
  VSO · VAO · refus imprimable.
- **TAMILA** : Conformité du cabinet, onglet « Accès » (journal `tamila_journal_acces`, `tamila_coffre_journal`, bouton
  `demanderExportCabinet` qui n'a aujourd'hui aucun bouton) ; Réglages, section « Sources et outils » (adresse de transfert
  e-barreau `expediteurs`, lecture seule, agenda .ics du cabinet).
- **TAVARO** : Retours à facturer, vue « Factures » (à envoyer soi-même, émises hier, impayées et relances, « À encaisser » ;
  `loc_factures`, `relancerFacture` ; les repères `/tavaro/factures` du point du matin y mènent déjà) ; Réglages, section
  « Sources » (dernier export lu).
- **TIROMA** : Réglages, sections « Journal des accès » (journal du socle filtré sur `tiroma.*`) et « Accès et rôles » en
  lecture (`tiroma_profils`).

## Promesses sans back-end (rien à construire côté pages ; à décider par Teo)

- **DALIRO** : « Interrogez vos chantiers » pour toute l'entreprise (`btp_poser_question` exige un chantier) ; « qui voit
  les prix » (aucune porte pour `voir_prix`).
- **LORANI** : « Checklists de l'agence », « Règles de votre charte » (aucune table) ; « Import depuis vos plateformes » ;
  « Bureaux d'études invités » (pas d'invitation) ; « Questions posées au dossier » ; « Métré des plans » (le lecteur ne mesure pas).
- **TAMILA** : « Pièces du jour » / pièces adverses ; « Dispositif contre motifs (art. 954) », « Prétentions nouvelles » ;
  « sommation prête » ; « Dires à l'expert » ; « Index des personnes », « Premier jet de l'exposé » ; tout le dommage
  corporel (Dintilhac, soins, écarts d'expertise) ; le point du matin n'envoie ni forfaits dépassés, ni dossiers sans
  diligence, ni pièces attendues ; la ligne « Export Word et PDF » porte encore « En préparation » alors que l'export existe.
- **TAVARO** : tâche « sur la messagerie de l'équipe » ; relevés constructeur (carburant, kilométrage, batterie) ;
  assistance téléphonique (fournisseur de voix non choisi) ; délai de relance des factures fixé à 7 jours (b2_02) ;
  gestes « Envoyer la confirmation / demander l'acompte », « Proposer la montée en gamme » (aucune porte).
- **TIROMA** : rappels de contrôle à valider (« 18 rappels… » ; pas de gabarit b3_14) ; questionnaire médical ;
  point du soir ; envoi par WhatsApp ; « tout effacer » ; portes appelées par l'écran mais absentes des migrations du
  dépôt (`tiroma_controles_dus`, `tiroma_creneaux_pour_plans`, `tiroma_soins_a_deplacer`, `tiroma_seances_mal_placees`,
  `tiroma_exporter_donnees`) — à vérifier en prod.

## Suivi

| Lot | Session | Branche | État |
|---|---|---|---|
| Daliro Approvisionnement | Pages DALIRO | `claude/pages-daliro` | en ligne 02/11 |
| Lorani Questions, À viser | Pages LORANI | `claude/pages-lorani` | en ligne 02/11 |
| Tamila Dossier de faits | Pages TAMILA | `claude/pages-tamila` | en ligne 02/11 |
| Tavaro Pilotage | Pages TAVARO | `claude/pages-tavaro` | en ligne 02/11 |
| Tiroma Avant les rendez-vous | Pages TIROMA | `claude/pages-tiroma` | faite 02/11 (Linear Triage, superposition 6,3/255 ; `REFERENCES-TIROMA.md`) |
| Sections ci-dessus | sessions Refonte <MÉTIER> | leurs branches | après les boutons |

Sections (02/11, 21 h 40) : DALIRO fait — météo de la semaine (vue d'ensemble), tâches de commande et de livraison (À faire), lien « Journal des validations » (Réglages). « Affecter ce remplaçant » reste un manque : aucune porte n'écrit l'intervenant d'un passage (migration à décider par Teo).

## Vérification à l'écran (03/11/2026) — `docs/verification/PROMESSES-ECRANS.md`

Teo a demandé le 03/11 une vérification d'un autre ordre : non plus « la fonction existe-t-elle dans le
code ? », mais « la promesse se voit-elle à l'écran, avec ses informations, dans les données d'exemple ? ».
520 promesses d'affichage ont été relevées sur les pages publiques et ouvertes une par une sur
https://omegaai.fr, Varelo compris cette fois. Le relevé, les captures et les totaux sont dans
`docs/verification/PROMESSES-ECRANS.md` ; il remplace ce document pour tout ce qui touche à l'affichage.

Ce qu'il change pour les manques listés ici :

- **Le point du matin d'exemple n'avait aucune ligne métier** alors que les six modules en déposent en base.
  Corrigé le 03/11 (`61c6091`) : cinq sections (Daliro, Tavaro, Tiroma, Tamila, Lorani), chaque ligne ouvrant
  son objet. La file « À valider » et le journal d'activité filtré par module ont aussi gagné leurs demandes
  métier — ils étaient vides, ce que cet audit-ci n'avait pas vu.
- **Les six pages construites le 02/11 montrent bien ce qu'elles promettaient** (Approvisionnement, Questions
  et réponses, À viser, Pilotage de Tavaro, Avant les rendez-vous, Dossier de faits) ; le Dossier de faits
  n'était atteignable que par le menu « … » : un geste « Ouvrir le dossier de faits » a été posé sur chaque
  lecture (`6e91e93`).
- **Varelo, hors champ ici, a son premier relevé** : 27 promesses, dont 7 exemples à compléter. Trois sont
  corrigées (`9df1b00`).
- **Des blocs écrits mais que plus aucun écran ne montait** ont été rebranchés : REPUT (astreinte, second
  sujet, doublon, pièces jointes, rendez-vous — `c0312d5`), FILED (lignes de la facture, provenance
  Factur-X — `e2fb025`).

Restent à décider par Teo, par produit, dans le document de vérification : 45 promesses sans back-end et
26 promesses à reformuler (aucun texte public n'a été modifié).

Second passage (03/11, 17 h 20 – 18 h 40 UTC) : 51 promesses passées à « Montrée » en tout depuis le relevé
(exemples à compléter 64 → 27, blocs invisibles 20 → 10, ailleurs que prévu 21 → 17) ; le détail et les commits sont
dans `docs/verification/PROMESSES-ECRANS.md`, section « Second passage ».

Troisième passage (03/11, 18 h 25 – 20 h 15 UTC) : 60 promesses « Montrée » de plus que le relevé en tout (372 sur 520 ;
exemples à compléter 64 → 18). Les reformulations des 26 promesses « à reformuler » sont rédigées pour Teo, non
appliquées ; aucune pastille « En préparation » n'est réactivée (décision de Teo du 06/10). Détail dans
`docs/verification/PROMESSES-ECRANS.md`.
