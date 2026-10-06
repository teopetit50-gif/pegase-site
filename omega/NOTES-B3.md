# Session B3 — TIROMA (cabinets dentaires : praticiens, fauteuils, horaires, rendez-vous, point du matin)

Branche `worker-b3`. Coordinateur : session `session_01BCGFdpRKBvXKjouC75sYBg` (depuis le 06/10, 01 h 10 Z ; avant : `session_01B4JNQXyT69GytdvE9SjAnE`).
Dernière mise à jour : 06/10/2026, nuit (douze fichiers verts, branche fusionnée dans main d298f07, règle santé tranchée).

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce que le scénario demande, prouvé par pgTAP sur la recette) | **85 %** — 11 fichiers verts sur la recette (lot 1 : 98/98 ; lot 2 : 05 50/50, 06 35/35, 07 32/32, 08 28/28, 09 17/17, 10 13/13, 11 18/18) ; b3_01 à b3_10 posés ; gabarit `tiroma.point_matin` validé ; chaîne d'export prouvée de bout en bout ; test 12 (vocabulaire) 18/18 : **12 fichiers verts**. | La règle santé stricte (proposition ci-dessous, portée par le coordinateur à A5/A2 avec le prochain lot socle) ; un ouvrier d'export (trou commun n° 1, A1) ; un export Logos_w réel pour confirmer les en-têtes. |
| **Livrable client** (un cabinet installe, branche, reçoit son point du matin, ouvre /espace/tiroma) | **55 %** — écran /espace/tiroma en ligne sur omegaai.fr, relu en base réelle avec le compte du banc ; le point du matin TIROMA se dépose (b3_06) et le courriel de compteurs part par le gabarit validé ; la chaîne d'export est jouable par les portes. | **Aucun ouvrier ne lit les exports** (A1) ; aucun fournisseur d'envoi agréé santé → le point nominatif reste derrière l'authentification ; aucun export Logos_w réel (Teo). |

### Ce que Teo (le patron) doit fournir lui-même

1. Un export Logos_w réel (ou le gabarit d'export du logiciel du premier cabinet) : les modèles `modeles_jeux` tiroma/logosw sont des **hypothèses d'en-têtes** (leur colonne `source` le dit) ; il faut un vrai fichier pour les confirmer.
2. Le canal de remise du point du matin **agréé pour la santé** : aucun fournisseur d'envoi n'est `agree_sante` ; tant qu'il n'y en a pas, `verrous_envoi` bloque tout message nominatif (`SANTE_HORS_CANAL_AGREE`) et le point du matin TIROMA ne sort d'Omega que **sans donnée de santé** (compteurs + lien vers /espace/tiroma). Décision à prendre par Teo : ce repli convient-il, ou faut-il un canal HDS avant la première mise en route ?
3. Le territoire des cabinets (code ISO sur l'entité) : `tiroma_installer_cabinet` refuse une entité sans territoire complet.
4. **L'hébergement HDS** pour le premier cabinet : base de données et bucket `omega-clients` hébergés HDS (les réponses des patients arrivent dans `receptions`), et une preuve de certification HDS du fournisseur d'envoi avant de passer `fournisseurs_envoi.hds` à vrai. Sans cela, le point du matin nominatif reste derrière l'authentification.

## État exact au 06/10 (soir) et prochaine étape

- **Posé sur la recette** (par le coordinateur) : b3_01 (portes + droits), b3_02 (reposé : une voie par patient), b3_03 (à reposer : booléen `mutuelle_accord_sans_rdv` jamais nul), b3_04, b3_05, b3_06 (point du matin + cron tiroma-matin), b3_07 (mutuelle), b3_08 (heures locales), b3_09 (liste d'attente). b3_10 (gabarit validé `tiroma.point_matin`) envoyé, pose à confirmer.
- **Lot 1** (`^test_b3_0[1-4]`) : 98/98 verts.
- **Lot 2** (`^test_b3_(05|06|07|08|09|10|11)_`) : joué deux fois par le coordinateur. Au second passage : 05 49/50 (le compteur de travaux additionne maintenant toutes les passes), 09 17/17, 10 13/13 ; 06, 07, 08, 11 corrigés d'après les sorties brutes (colonne `etat` des capacités, périmètre du collaborateur qui peut noter la mutuelle de son patient, envois transactionnels pour atteindre le verrou santé avant le consentement, patient gêné proposé avant le patient en attente). La chaîne relevé → instantané → travail → `tiroma_appliquer_releve` est **prouvée de bout en bout** sur la recette.
- **Lot 2 vert** (troisième et quatrième passages) : la pendule de test `tests.b3_vieillir` (un instant par relevé) a fait tomber les huit rouges de 06 ; b3_06 corrigé (un item « avant les rendez-vous » était coupé en deux objets par une concaténation jsonb non parenthésée) ; b3_10 : variables de type « nombre ».
- **Test 12** (vocabulaire) : 18/18 au premier passage. **12/12 fichiers verts.** Rien n'est en attente côté B3.
- **Prochaine étape** : attendre le premier vrai export Logos_w de Teo et l'ouvrier lecteur d'exports d'A1 (déployé) ; le rejouer alors sur le banc par la chaîne de relevé, et confirmer ou corriger les en-têtes de `modeles_jeux` tiroma/logosw. La règle santé stricte est portée par le coordinateur au prochain lot socle.
- **Écran** : /espace/tiroma fusionné sur main par le coordinateur (d572973), avec la ligne de navigation dans `components/espace/ecrans.ts`.

## Proposition pour le socle commun : la règle santé stricte (trou n° 7)

Constat (F5 et test 08) : des canaux portent `permis_sante = true` alors qu'aucun fournisseur n'est
`agree_sante`. Aujourd'hui seul le verrou `SANTE_HORS_CANAL_AGREE` (fournisseur) protège le nominatif ;
le drapeau du canal ne veut donc rien dire par lui-même. Proposition, à poser par le coordinateur dans
le socle commun (je ne touche pas à `private.verrous_envoi` ni aux canaux) :

1. **Cohérence des canaux** : un déclencheur sur `private.canaux_envoi` refuse `permis_sante = true` si
   le fournisseur du canal n'est pas `agree_sante` (22023 « Un canal n'est permis pour la santé que si son
   fournisseur est agréé santé. ») ; et quand un fournisseur perd son agrément, ses canaux repassent à
   `permis_sante = false` (déclencheur sur la table des fournisseurs). Les deux vérités ne peuvent plus
   diverger.
2. **Le verrou lit les deux** : `CANAL_NON_PERMIS` dès que `p_donnees_sante` (ou le contexte santé d'un
   module `sante = true`) et `not permis_sante`, avant `SANTE_HORS_CANAL_AGREE` — même résultat qu'aujourd'hui
   pour l'envoi, mais le code du verrou dit « canal » quand c'est le canal, « fournisseur » quand c'est lui.
3. **Une alerte interne** (`lever_alerte_module`, clé `sante:canal:<canal>`) quand un `reglages_envois`
   d'un module `sante = true` désigne un canal non permis santé : le cockpit voit le trou avant le
   premier point du matin bloqué.
4. **Rien ne change pour TIROMA** : le point nominatif reste derrière l'authentification tant qu'aucun
   fournisseur n'est agréé ; le courriel de compteurs (gabarit `tiroma.point_matin`, `donnees_sante =
   false`) continue de partir.

**Décision du coordinateur (06/10, 00 h 55 Z, avis d'A2, NOTES-A2 fa62599)** — retenu, la restriction
vit dans le socle, pas dans l'ouvrier. Deux colonnes : `fournisseurs_envoi.hds` (tous `false`
aujourd'hui, Brevo compris, tant que Teo n'a pas de preuve de certification HDS ; `manuel` reste le seul
chemin santé) et `canaux_envoi.sante_autorise` (courriel et LRE oui si le fournisseur est HDS ; SMS et
WhatsApp non pour un contenu de santé — un SMS « neutre » est un envoi `donnees_sante = false` décidé par
le gabarit). Un envoi `donnees_sante = true` n'est confié qu'à un fournisseur `hds = true` sur un canal
`sante_autorise`, sinon verrou `SANTE_FOURNISSEUR_NON_HDS` (expéditeur v11) qui bloque (jamais un différé, jamais de repli). A2
écrit le lot.

**Vigilance à garder pour TIROMA** : la table `receptions` porte aussi des données de santé (les réponses
des patients aux messages) ; pour un client santé, la base **et** le bucket `omega-clients` doivent être
hébergés HDS. C'est une question d'hébergement pour Teo, pas un travail d'ouvrier : à inscrire dans la
liste « ce que Teo doit fournir » avant la première mise en route d'un cabinet.

## Relecture de /espace/tiroma en base réelle — faite le 06/10 (00 h 37 Z)

Comme A3 : serveur `next start` local pointé sur la recette (`.env.local`, non commité), session du
compte du banc `gerant@banc-varelo.test` ouverte par l'appel même du formulaire du site
(`POST /auth/v1/token?grant_type=password`, clé publique), cookie posé par
`omega/recette-b3/relecture-reelle.mjs`, captures `omega/recette-b3/reel-tiroma-{1440,390}.jpg`.

- **L'écran se charge avec la session** aux deux largeurs : identité affichée, interrupteur sur
  « Base réelle », aucun avis rouge, aucun « permission denied » en console, aucun débordement.
- **Le banc n'a pas de cabinet** (les tests pgTAP annulent tout) : l'écran montre le formulaire
  d'installation, avec l'entité principale « Groupe Sogexal (banc) » (territoire posé) et Logos_w.
  Je n'ai **pas** installé de cabinet durable sur le banc : le test 04 compte les cabinets du client
  sans filtre d'entité, un cabinet permanent casserait le lot 1, et rien ne s'efface. Les écritures
  de l'écran (installer, brancher, fauteuils, horaires, mutuelle, liste d'attente) sont prouvées par
  les tests sous les jetons des membres, pas par cette relecture.
- **Observation hors périmètre** (site, pas TIROMA) : en local sur la recette, le WebSocket Realtime
  `wss://ygwbgpowzlbdaajlsqkn.supabase.co` est refusé par la CSP `connect-src` (next.config.ts n'écrit
  que l'armoire de production et l'URL d'environnement en https). Sans effet sur omegaai.fr ; signalé
  au coordinateur.

## Le scénario réel de bout en bout (ce que les tests jouent)

Un cabinet de trois fauteuils, un titulaire (le gérant de l'organisation), un
collaborateur, une assistante ; le logiciel Logos_w. Sur la recette : le client
du banc `cccccccc-0000-4000-8000-00000000000c`, l'entité **Novasud Antilles**
(Guadeloupe, calendrier complet), les comptes `gerant` (titulaire), `daf`
(collaborateur, relié au praticien « Dr Rousseau »), `referent` (assistante),
`daf2` (témoin : valideur sans profil TIROMA). Tout passe par les portes
publiques ou par les écritures sous RLS que le socle prévoit ; jamais
d'écriture directe hors RLS.

1. **Installation.** `tiroma_installer_cabinet(client, entité, 'logosw', 'cabinet')` par le titulaire ; refusé sans territoire ; refusé au témoin `daf2` et au gérant d'un autre client. *(test 01, vert)*
2. **Profils.** Titulaire, collaborateur (relié à un praticien), assistante (reliée à un membre) ; refus d'un titulaire non gérant ; droits `tiroma.voir_*`. *(01, vert)*
3. **Fauteuils.** Trois fauteuils posés par le titulaire ; l'assistante voit, ne pose pas, ne modifie pas. *(02, vert)*
4. **Horaires.** Lundi–vendredi 8–12 / 14–19, samedi 8–12, un exceptionnel ; `tiroma_ouvert` : 540 / 240 / 0 minutes, férié local fermé. *(02, vert)*
5. **Fermetures.** Fauteuil fermé l'après-midi, cabinet en formation : la plage se réduit. *(02, vert)*
6. **Branchement.** `tiroma_brancher_cabinet` → dix jeux, cabinet actif, journal ; refusé à l'assistante et sur un cabinet clos. *(03, vert)*
7. **Premier relevé (reprise).** Dix fichiers par les portes du socle → relevé `ok/reprise`, 30 patients, praticiens et fauteuils reconnus par leur nom, 9 types (un à classer), rendez-vous aux heures du cabinet (b3_08), 5 plans et 9 lignes, actes liés, fiche labo liée à la pose, stock, ODF, attente ; zéro événement ; journal ; six capacités ; périmètres de lecture. *(05, vert)*
8. **Vocabulaire.** Le titulaire classe « RDV LV » et valide ; l'assistante et le témoin ne changent rien ; pas de validation sans famille ; le relevé suivant respecte la classification humaine. *(12, vert)*
9. **Relevé courant, annulation.** R010 disparaît → `supprime` + événement `annulation` immuable ; `tiroma_creneaux_a_sauver` rend le créneau avec trois candidats dans l'ordre : plan accepté (Delannoy), liste d'attente (Bazile), contrôle dû (Nestor). *(06, vert)*
10. **Honoré / manqué / présumé.** R003 honoré, R005 manqué, R004 présumé honoré par l'acte du jour. *(06, vert)*
11. **Garde-fou.** Une journée de dix rendez-vous vidée → relevé `douteux`, journal, compteur 1 puis 0. *(06, vert)*
12. **Plans sans rendez-vous.** D001, D002, D003, D004 dans l'ordre ; proche à planifier ; **accord de mutuelle noté par l'assistante** (b3_07, l'export ne le porte pas). *(07, vert)*
13. **Avant les rendez-vous.** Labo critique, implant sous seuil, devis qui expire, mutuelle sans rendez-vous, ODF sans début, traitement interrompu, devis sans réponse ; charge des fauteuils au titulaire seul. *(07, vert)*
14. **Point du matin.** `tiroma_deposer_points` à 6 h 30 : sections santé par membre selon son périmètre, `apercu_point` les rend ; courriel nominatif → `SANTE_HORS_CANAL_AGREE`, SMS → `CANAL_NON_PERMIS`, courriel sans santé → accepté. *(08, vert)*
15. **Mesures du soir, mode réel, journal, isolement, relevé en retard, fermeture et purge.** Mode réel, journal et isolement : *(03/04, verts)* ; mesures, retard, purge : *(09/10, verts)* ; liste d'attente : *(11, vert)*.

## Trous du socle relevés et ce qui en est fait

1. **Portes publiques inexécutables et sans contrôle de droits** → b3_01 (posé, confirmé par F1).
2. **Aucune porte de lecture métier** (créneaux, plans, J-2, charge) → b3_02 à b3_05 (posés).
3. **Aucun dépôt de section du point du matin** par TIROMA → b3_06 (posé).
4. **Accords des mutuelles sans source** (modèle d'export devis sans colonne mutuelle, aucune porte) → b3_07 (écrit).
5. **Heures d'export lues en UTC** (`tiroma_v_instant`) : 9 h à Pointe-à-Pitre devenait 5 h → b3_08 (écrit).
6. **Aucun ouvrier ne lit les exports** (`releve.lire`) : trou commun n° 1, confié à A1 par le coordinateur.
7. **Canaux `permis_sante = true` sans fournisseur agréé** (F5) : le verrou `SANTE_HORS_CANAL_AGREE` protège déjà le nominatif ; règle stricte proposée puis **tranchée par le coordinateur** (`fournisseurs_envoi.hds`, `canaux_envoi.sante_autorise`, verrou `SANTE_FOURNISSEUR_NON_HDS`) : A2 écrit le lot socle.
8. **Liste d'attente « commune »** (`source = 'tiroma'`) sans porte d'écriture : à faire (b3_09) après le lot 2.
9. **`private.tiroma_trace_ecriture()` inexécutable par authenticated** (23 triggers) : corrigé côté socle par le coordinateur (lot 19u).
10. **Tout texte libre du module est tenu pour de la santé** (`private.creer_envoi` : `v_contexte_sante`, `modules_envois.tiroma.sante = true`) : même un courriel de compteurs sans nom est bloqué `SANTE_HORS_CANAL_AGREE`. Pour qu'un point « sans donnée de santé » parte, il faut un **gabarit validé** sans variable libre : b3_10 pose `tiroma.point_matin` (global, courriel, compteurs + lien), validé par le serveur ; le test 08 vérifie qu'il part.
11. **Un même patient pouvait être proposé deux fois** pour un créneau (par son plan et par la liste d'attente) : corrigé dans b3_02 (une voie par patient, la meilleure) — à reposer.

## Journal des échanges avec le coordinateur

- 05/10, soir — scénario envoyé ; extraits demandés (reçus : omega/SOCLE-EXTRAITS-COMMUN.sql sur main) ; faits F1–F6 reçus.
- 05/10, 20 h 39 — lot 1 : 96/98 puis 98/98 après trois corrections (b3_compte SECURITY DEFINER ; UPDATE/suppression sous RLS ne lèvent pas ; mot interdit coupé).
- 05/10, 20 h 49 — F7 : pas d'ouvrier d'export ; portes commencer_releve / deposer_lignes / terminer_lecture / recevoir_releve (service_role).
- 05/10, 20 h 54 — b3_02 à b3_06 posés depuis f7194d6 ; Realtime publié sur cinq tables tiroma ; fusion de l'écran promise par le coordinateur.
- 05/10, 20 h 58 — PAUSE demandée par Teo. 06/10 — REPRISE : F8 (13 indicateurs tiroma inscrits), F9 (tiroma_conservation et tiroma_passages existent).
- 06/10 — b3_07 à b3_09 posés ; écran fusionné (d572973) ; lot 2 joué deux fois (retours : clé `jeu` de terminer_lecture, destinataire par `adresse`, somme des travaux, colonne `etat`, booléen mutuelle, périmètre du collaborateur, verrou consentement avant santé, patient gêné) ; b3_10 et le troisième passage demandés (5220b21).
- 06/10, 00 h 25–00 h 37 Z — b3_10 refusé deux fois (« entier » n'est pas un type de variable ; « nombre ») ; troisième passage : 05/06/07/11 verts, 08 révèle l'item sans gravité ; quatrième passage : **28/28, 11 fichiers verts**. Clé publique de la recette reçue pour la relecture réelle (faite). Test 12 poussé (a4d1212) : 18/18 au premier passage, 12 fichiers verts.
- 06/10, 00 h 51–00 h 55 Z — omegaai.fr sert /espace/tiroma (quota Vercel revenu) ; « terminé » envoyé (87b914e), fusionné dans main (d298f07) ; règle santé tranchée (hds / sante_autorise / SANTE_FOURNISSEUR_NON_HDS, lot A2) ; vigilance `receptions` + hébergement HDS consignée.
- 06/10, 01 h 10 Z — passation du coordinateur à la session `session_01BCGFdpRKBvXKjouC75sYBg`. Lot socle 19ab (santé des envois) posé sur la recette : test 08 toujours vert 28/28. e7fe453 fusionné dans main. Rien n'est attendu de B3.
- 06/10 — **Reprise de B3** par la session `session_016947vqqcuBzgihDxHt7Aoo` (Opus 5.5), qui remplace `session_01XVDbxXV3nk5ANUdd5hfZHf` (limite de crédit Fable). État relu, coordinateur prévenu par send_message. Rien en attente ; prochain chantier : premier export Logos_w réel de Teo, rejoué sur le banc par la chaîne de relevé.
- 06/10, 01 h 34 Z — remarques d'A1 (lecteur-exports d963121) : signatures qui se recouvrent (actes/agenda/devis_lignes ⊇ devis ; agenda ⊇ patients ; devis_lignes ⊇ types_rdv). **b3_11** (`omega/modules/tiroma/migrations/b3_11_signatures_logosw.sql`) : devis + « Part AMO », patients + « Prénom », types_rdv + « Couleur » ; plus aucun recouvrement sur tous les alias des dix jeux. `agenda.patient_ref` reste non obligatoire, volontairement (créneaux sans patient ; l'application garde le patient connu si la référence est vide). Aucun test pgTAP touché (les tests déposent les lignes, la signature ne sert qu'au lecteur).
- 06/10, 01 h 39 Z — **b3_11 posé** par le coordinateur (ligne `tiroma_b3_11_signatures_logosw`), signatures relues en base ; `^test_b3_` rejoué : **12/12**. A1 a reporté les signatures (worker-a1 041f6a2, test « chaque jeu se reconnaît par ses seuls en-têtes » vert). Rien en attente ; prochain chantier : le vrai export Logos_w de Teo, d'abord par `deno task essai` d'A1.
- 06/10, matin — **accessibilité** (demande du coordinateur, mesure d'A3) : `ListeAttente.tsx`, la liste des patients trouvés n'est plus un `listbox`/`option` mais une liste de boutons (rien n'y reste « ouvert » : un patient choisi ferme la liste, donc pas d'`aria-current`) ; `AvantRendezVous.tsx`, la pastille de gravité portait un `aria-label` sans rôle (aria-prohibited-attr, grave) → `role="img"` comme le point du matin d'A3. Nouveau `omega/recette-b3/accessibilite-tiroma.mjs` (axe-core WCAG 2.1 A/AA, 390 et 1440, dialogue de la liste d'attente ouvert) : 0 écart. Recette cinq largeurs : tout passe (le sélecteur du script suit la liste de boutons).
- 06/10, 05 h 30 Z — 8d20e49 fusionné dans main (fccee92). **Pas encore en ligne** à 05 h 33 Z : omegaai.fr sert toujours l'ancien chunk (`role:"listbox"`, `"aria-label":e.gravite`) ; Vercel refuse les déploiements de fccee92 par quota (NOTES-COORDINATEUR, « Vercel par créneaux ») ; le coordinateur retente. À revérifier : `node omega/recette-b3/accessibilite-tiroma.mjs https://omegaai.fr` (le Chrome du banc ne charge pas omegaai.fr ici ; à défaut, chercher « Patients trouvés » dans les chunks servis).
- 06/10, ~05 h 40 Z — remarque de B6 (axe scrollable-region-focusable à 390) : les deux cadres `.esp-tableau-cadre` de `Cabinet.tsx` (Horaires, Vocabulaire du logiciel) portent `tabIndex={0}`, `role="region"` et un `aria-label` « … (tableau qui défile) », sur le modèle de daliro/ChantierVue. axe 390/1440 : 0 écart ; à 390, le tableau du vocabulaire défile bien.

## Vague 3 — les 3 manques pour qu'un vrai cabinet paie Tiroma et l'ouvre chaque jour (06/10, 14 h 40 Z)

Hors import Logos_w (reporté par le coordinateur). Ce que Tiroma fait déjà : il lit l'agenda, les plans et les
devis, il propose qui appeler pour chaque créneau libéré, il fait remonter les plans signés sans rendez-vous, il
vérifie le labo à J-2, il montre la charge des fauteuils et la liste d'attente, et il dépose le point du matin.
Ce qui manque, par ordre d'importance :

1. **Fermer la boucle de l'appel : un registre des appels et ce qu'ils ont rapporté.** Tiroma dit « appelez
   Marguerite Delannoy » mais ne garde rien de ce que l'assistante a fait. Le lendemain, les mêmes noms reviennent ;
   deux personnes appellent le même patient ; « message laissé » n'a pas de date ; et le titulaire ne voit jamais
   en euros ce que l'outil lui a rapporté. Sans cette preuve de valeur, l'abonnement ne se renouvelle pas.
   - Le prix du trou : les chirurgiens-dentistes sont la profession la plus touchée par les rendez-vous non honorés,
     **4,7 %** des rendez-vous en juin 2024, soit près d'un patient sur 20 (Doctolib, communiqué du 3 juillet 2024,
     <https://media.doctolib.com/image/upload/mkg/file/doctolib__actualise_ses_statistiques_annuelles_rendez_vous_non_honores.pdf>).
     Chaque créneau libéré qu'on ne reprend pas, c'est du temps de fauteuil perdu ; chaque plan signé qu'on ne
     replanifie pas, c'est du chiffre qui dort.
   - Les concurrents : Doctolib propose aux patients les créneaux annulés par liste d'attente et rappelle les
     rendez-vous par SMS, mais seulement pour les patients qui réservent en ligne. Les logiciels de cabinet vendent
     le « suivi des plans de traitement avec relance » et des taux d'acceptation des devis (exemple, une source
     commerciale à prendre avec prudence : de 58 % à 72 %, <https://kolonell.com/fr/blog/logiciel-gestion-cabinet-dentaire-bordeaux-2026>).
     Weclever Dental, en SaaS à 68 € HT par mois et par praticien, vend l'automatisation des tâches et une
     intégration Doctolib (<https://www.indy.fr/guide/profession-liberale/ouvrir-un-cabinet-medical/comparatif-logiciel-dentiste/>).
     Tiroma ne remplace pas le logiciel : ce qu'il peut vendre, c'est « voici ce que vos appels ont repris ce mois-ci ».
   - Les règles de santé : rien ne sort d'Omega, puisque c'est l'équipe qui téléphone ; le verrou HDS des envois
     n'est donc pas en jeu. La gestion des rendez-vous est une finalité prévue par le référentiel de la CNIL pour
     les cabinets (base légale : l'intérêt légitime pour la prise de rendez-vous ; référentiel du 28 juillet 2020,
     § 3 et tableau des bases légales, <https://www.cnil.fr/sites/default/files/atoms/files/referentiel_-_cabinet.pdf>).
     L'issue est codée, sans texte libre : aucune donnée médicale n'est écrite. L'hébergement reste celui de la
     base, HDS chez Scaleway au premier client (même référentiel, § 7, et CSP art. L. 1111-8).
   - **Fait (b3_12, test 13, carte « Appels »)** : chaque appel est noté en un geste (rendez-vous pris, message
     laissé, pas de réponse, à rappeler le…, refus, ne plus contacter). Le patient « à rappeler » revient le jour
     dit. Un « rendez-vous pris » n'est compté que lorsque le relevé suivant le trouve dans l'agenda du logiciel.
     Le titulaire voit la valeur des plans remis à l'agenda et les minutes de fauteuil reprises.

2. **La valeur en euros, en continu : le pilotage mensuel du titulaire.** Plans signés non planifiés en euros,
   devis présentés et non signés (relance à J+7 / J+21 avant l'expiration), taux d'acceptation des devis par
   praticien et par panier 100 % Santé, maîtrisé ou libre, taux de rendez-vous manqués par praticien et par jour,
   heures de fauteuil vides. Les données sont déjà en base (plans.montant, panier, presente_le, signe_le,
   rendez_vous.statut). Il manque la porte de lecture et un rapport mensuel déposé au point du matin du 1er.
   - Règles : le devis est obligatoire avant tout traitement prothétique, avec une alternative 100 % Santé
     ou à reste à charge maîtrisé chaque fois qu'elle existe (DGCCRF, fiche « Dentiste », 20/03/2026,
     <https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dentiste>). Suivre le panier choisi par devis,
     c'est aussi montrer que le cabinet propose bien l'alternative. Les montants sont des données de gestion et
     restent derrière l'authentification (agrégats seuls dans un courriel, pas de nom).

3. **Les rappels et relances aux patients par un canal agréé santé.** Rappel J-2 avec confirmation ou
   annulation en un clic : une annulation libère le créneau, donc un « créneau à sauver » le jour même et non au
   relevé suivant. S'y ajoutent la relance des devis non signés et l'invitation au contrôle annuel.
   - Concurrents : Doctolib rappelle sept ou deux jours avant, puis deux heures avant par l'application ; il
     permet d'annuler à toute heure, propose les créneaux libérés à une liste d'attente, et bloque le compte
     après trois absences non excusées (Le Quotidien du Médecin,
     <https://cardiologie.lequotidiendumedecin.fr/liberal-soins-de-ville/exercice/baisse-generale-des-rendez-vous-non-honores-33-de-taux-de-lapins-toutes-specialites-revele-doctolib>).
   - Règles de santé : un message qui dit « votre rendez-vous chez le Dr X » révèle un soin ; c'est une donnée de
     santé (RGPD, art. 9). Le prestataire qui stocke ou transmet ces données doit être certifié HDS (CSP art.
     L. 1111-8 ; référentiel CNIL, § 7 : « ce prestataire doit être hébergeur agréé ou certifié… » ;
     <https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante>), avec un contrat de
     sous-traitance (RGPD, art. 28). Il faut aussi informer le patient (affichage, courriel de confirmation) et
     respecter son droit d'opposition (`ne_pas_contacter`, déjà lu). Dans Omega, c'est exactement le verrou
     `SANTE_FOURNISSEUR_NON_HDS` : rien ne part tant qu'un fournisseur d'envoi SMS ou courriel n'est pas `hds = true`.
     L'hébergeur de la base est choisi (Scaleway) ; **il manque le fournisseur d'envoi HDS**, que Teo doit
     choisir. D'ici là, le gabarit `tiroma.point_matin` (compteurs, sans nom) reste le seul message sortant.

Non retenus pour cette vague : écrire dans l'agenda du logiciel (Tiroma lit les exports, il n'écrit pas ; il
faudrait une API Logos_w), la prise de rendez-vous en ligne (Doctolib la tient), et la facturation (c'est le
logiciel métier qui la fait).

### Vague 3, n° 1 : où on en est (06/10, ~15 h Z)
- `omega/modules/tiroma/migrations/b3_12_registre_appels.sql` : table `tiroma_appels` (RLS en lecture, sans écriture directe), portes `tiroma_noter_appel` et `tiroma_appels`. Rejouée deux fois sur un Postgres 16 local, avec un socle simulé (tables et fonctions de regard minimales) : idempotente, refus attendus (ne pas contacter, rappel sans date, plan d'un autre patient, hors périmètre), double clic, confirmation par un rendez-vous vu après l'appel, valeur du plan comptée. **Pas de clé étrangère** vers patients et plans : la clause de cascade porte le mot interdit ; question posée au coordinateur.
- `omega/tests/tiroma/13_registre_appels.sql` : `test_b3_13_registre_appels`, 25 assertions, à jouer sur la recette après b3_12.
- Écran (components/espace/tiroma seulement) : nouvelle carte « Appels » (à reprendre aujourd'hui, bilan sur 30 jours : appels, rendez-vous repris confirmés, plans remis à l'agenda en euros pour le titulaire, heures de fauteuil reprises, avis « à reporter dans le logiciel »). Bouton « Noter l'appel » sous chaque candidat d'un créneau et sur chaque plan sans rendez-vous, avec la ligne « dernier appel ». Recette cinq largeurs : 72 contrôles, tout passe ; axe 390/1440, dont le dialogue « Noter l'appel » : 0 écart.
- 06/10, 14 h 46 Z — b3_12 et le test 13 sont posés par le coordinateur (dépôts 4600 et 4601) ; le TAP est attendu. Le coordinateur accepte les clés étrangères (seul « drop » est interdit) : **b3_12b** (`b3_12b_cles_appels.sql`) ajoute une cascade vers le patient et un set null vers le plan, posés not valid puis validés, de façon idempotente. Nouveau test `test_b3_13_registre_effacement` (6 assertions) : un plan effacé laisse l'appel sans plan ; un patient effacé emporte ses appels ; un appel vers un patient disparu est refusé (23503). Vérifié sur le Postgres local.
- 06/10, ~15 h Z — TAP après b3_12 v1 : 01 à 12 verts, **13 à 21/25**. Corrigé dans **b3_12 v2** (b3_12b est fondu dedans ; son fichier est retiré) :
  - n° 12 : le prénom de l'appelant se lit par `tiroma_profils.membre_id` (le banc relie l'assistante ainsi, pas par `tiroma_membres.user_id`) → `private.tiroma_appelant`, qui retombe sur le praticien du profil.
  - n° 16 : `appele_le` valait now(), l'heure du début de la transaction ; trois appels dans un même test avaient la même heure, et « le dernier » était tiré au hasard. Il prend désormais `clock_timestamp()`.
  - n° 20 et 21 : **pas un trou** ; c'est mon test qui était faux. Le banc est installé en périmètre « tout le cabinet », et le collaborateur y voit les 30 patients (test 05, même règle que b3_07 et b3_09). Le test vérifie maintenant les deux périmètres : en mode cabinet, le collaborateur voit tout ; une fois `perimetre_partage = 'praticien'`, il ne voit et ne note que ses patients (42501 sur Delannoy).
  - Rejoué en local : v1 posée, puis v2 deux fois ; scénario en une seule transaction (prénom, dernier appel, confirmation, valeur 1180).
- 06/10, ~15 h 05 Z — b3_12 v2 et le test 13 sont posés (dépôts 4635 et 4636). Le test socle 44 signale `private.tiroma_appelant`, exécutable par authenticated sans que ce soit nécessaire : **b3_12c** ramène ce droit à service_role seul (seule `tiroma_appels_lire`, en security definer, l'appelle), et la source b3_12 est alignée. Vérifié en local : authenticated n'a plus le droit, et le prénom se lit toujours.
