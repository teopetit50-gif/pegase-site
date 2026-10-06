# Session B3 — TIROMA (cabinets dentaires : praticiens, fauteuils, horaires, rendez-vous, point du matin)

Branche `worker-b3`. Coordinateur : session `session_01B4JNQXyT69GytdvE9SjAnE`.
Dernière mise à jour : 06/10/2026, soir (lot 2, troisième passage demandé).

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce que le scénario demande, prouvé par pgTAP sur la recette) | **70 %** — lot 1 vert (98/98) ; b3_01 à b3_09 posés ; lot 2 joué deux fois : la chaîne d'export est prouvée (05 à un contrôle près, 09, 10 verts), 06/07/08/11 corrigés et à rejouer. | Le troisième passage du lot 2 jusqu'au vert (point du matin : 0 membre servi, cause à lire) ; b3_10 posé ; la règle santé stricte dans verrous_envoi (socle commun). |
| **Livrable client** (un cabinet installe, branche, reçoit son point du matin, ouvre /espace/tiroma) | **45 %** — écran /espace/tiroma écrit, recetté aux cinq largeurs, en fusion sur main par le coordinateur ; le point du matin TIROMA existe (b3_06) ; la chaîne d'export est jouable par les portes. | **Aucun ouvrier ne lit les exports** (trou commun n° 1, confié à A1) ; aucun fournisseur d'envoi agréé santé → le point nominatif reste derrière l'authentification ; aucun export Logos_w réel (Teo). |

### Ce que Teo (le patron) doit fournir lui-même

1. Un export Logos_w réel (ou le gabarit d'export du logiciel du premier cabinet) : les modèles `modeles_jeux` tiroma/logosw sont des **hypothèses d'en-têtes** (leur colonne `source` le dit) ; il faut un vrai fichier pour les confirmer.
2. Le canal de remise du point du matin **agréé pour la santé** : aucun fournisseur d'envoi n'est `agree_sante` ; tant qu'il n'y en a pas, `verrous_envoi` bloque tout message nominatif (`SANTE_HORS_CANAL_AGREE`) et le point du matin TIROMA ne sort d'Omega que **sans donnée de santé** (compteurs + lien vers /espace/tiroma). Décision à prendre par Teo : ce repli convient-il, ou faut-il un canal HDS avant la première mise en route ?
3. Le territoire des cabinets (code ISO sur l'entité) : `tiroma_installer_cabinet` refuse une entité sans territoire complet.

## État exact au 06/10 (soir) et prochaine étape

- **Posé sur la recette** (par le coordinateur) : b3_01 (portes + droits), b3_02 (reposé : une voie par patient), b3_03 (à reposer : booléen `mutuelle_accord_sans_rdv` jamais nul), b3_04, b3_05, b3_06 (point du matin + cron tiroma-matin), b3_07 (mutuelle), b3_08 (heures locales), b3_09 (liste d'attente). b3_10 (gabarit validé `tiroma.point_matin`) envoyé, pose à confirmer.
- **Lot 1** (`^test_b3_0[1-4]`) : 98/98 verts.
- **Lot 2** (`^test_b3_(05|06|07|08|09|10|11)_`) : joué deux fois par le coordinateur. Au second passage : 05 49/50 (le compteur de travaux additionne maintenant toutes les passes), 09 17/17, 10 13/13 ; 06, 07, 08, 11 corrigés d'après les sorties brutes (colonne `etat` des capacités, périmètre du collaborateur qui peut noter la mutuelle de son patient, envois transactionnels pour atteindre le verrou santé avant le consentement, patient gêné proposé avant le patient en attente). La chaîne relevé → instantané → travail → `tiroma_appliquer_releve` est **prouvée de bout en bout** sur la recette.
- **Reste inexpliqué** : au second passage, `tiroma_deposer_points` a servi 0 membre sans qu'on lise pourquoi ; le test 08 imprime désormais le détail de l'alerte `tiroma:point:depot:<cabinet>` s'il y en a une. Troisième passage demandé (SHA 5220b21).
- **Prochaine étape** : lire la troisième sortie, corriger jusqu'au vert ; puis la règle santé stricte du socle commun (proposition au coordinateur), la relecture de /espace/tiroma en base réelle avec le compte du banc (comme A3 : omega/recette-a3/relecture-reelle.mjs) quand omegaai.fr sert la page.
- **Écran** : /espace/tiroma fusionné sur main par le coordinateur (d572973), avec la ligne de navigation dans `components/espace/ecrans.ts`.

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
7. **Premier relevé (reprise).** Dix fichiers par les portes du socle → relevé `ok/reprise`, 30 patients, praticiens et fauteuils reconnus par leur nom, 9 types (un à classer), rendez-vous aux heures du cabinet (b3_08), 5 plans et 9 lignes, actes liés, fiche labo liée à la pose, stock, ODF, attente ; zéro événement ; journal ; six capacités ; périmètres de lecture. *(05, écrit)*
8. **Vocabulaire.** Validation d'un type par le titulaire (déclencheur). *(écran recetté sur l'exemple ; test à écrire)*
9. **Relevé courant, annulation.** R010 disparaît → `supprime` + événement `annulation` immuable ; `tiroma_creneaux_a_sauver` rend le créneau avec trois candidats dans l'ordre : plan accepté (Delannoy), liste d'attente (Bazile), contrôle dû (Nestor). *(06, écrit)*
10. **Honoré / manqué / présumé.** R003 honoré, R005 manqué, R004 présumé honoré par l'acte du jour. *(06, écrit)*
11. **Garde-fou.** Une journée de dix rendez-vous vidée → relevé `douteux`, journal, compteur 1 puis 0. *(06, écrit)*
12. **Plans sans rendez-vous.** D001, D002, D003, D004 dans l'ordre ; proche à planifier ; **accord de mutuelle noté par l'assistante** (b3_07, l'export ne le porte pas). *(07, écrit)*
13. **Avant les rendez-vous.** Labo critique, implant sous seuil, devis qui expire, mutuelle sans rendez-vous, ODF sans début, traitement interrompu, devis sans réponse ; charge des fauteuils au titulaire seul. *(07, écrit)*
14. **Point du matin.** `tiroma_deposer_points` à 6 h 30 : sections santé par membre selon son périmètre, `apercu_point` les rend ; courriel nominatif → `SANTE_HORS_CANAL_AGREE`, SMS → `CANAL_NON_PERMIS`, courriel sans santé → accepté. *(08, écrit)*
15. **Mesures du soir, mode réel, journal, isolement, relevé en retard, fermeture et purge.** Mode réel, journal et isolement : *(03/04, verts)* ; mesures, retard, purge : *(09/10, à écrire)*.

## Trous du socle relevés et ce qui en est fait

1. **Portes publiques inexécutables et sans contrôle de droits** → b3_01 (posé, confirmé par F1).
2. **Aucune porte de lecture métier** (créneaux, plans, J-2, charge) → b3_02 à b3_05 (posés).
3. **Aucun dépôt de section du point du matin** par TIROMA → b3_06 (posé).
4. **Accords des mutuelles sans source** (modèle d'export devis sans colonne mutuelle, aucune porte) → b3_07 (écrit).
5. **Heures d'export lues en UTC** (`tiroma_v_instant`) : 9 h à Pointe-à-Pitre devenait 5 h → b3_08 (écrit).
6. **Aucun ouvrier ne lit les exports** (`releve.lire`) : trou commun n° 1, confié à A1 par le coordinateur.
7. **Canaux `permis_sante = true` sans fournisseur agréé** (F5) : le verrou `SANTE_HORS_CANAL_AGREE` protège déjà le nominatif ; règle stricte « permis_sante ET agree_sante » à proposer sur le socle commun après le lot 2.
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
