# Session B3 — TIROMA (cabinets dentaires : praticiens, fauteuils, horaires, rendez-vous, point du matin)

## REPRISE (pause demandée par Teo, 06/10, 21 h Z)

**Fait, posé, vert, fusionné dans main par le coordinateur :**
- **Tiroma**, b3_01 à b3_22, tests B3-01 à B3-23 : ^test_b3_ 24/24. Écrans /espace/tiroma : toutes les cartes, jusqu'aux Règles communes. Aucune promesse Tiroma sans code ; `lib/en-preparation.ts` a la clé tiroma vide.
- **Tavaro (renfort)**, b3t_01 v3, b3t_02 v2, b3t_03, b3t_04 et le test `omega/tests/tavaro/b3t_01_analyses.sql` (f1e9c42) : ^test_b3t_ vert (lot h1915tav, 501 ok). Écran AnalysesParc (79be032, c3640a3). Les 5 lignes sont retirées de « en préparation » (4653c92). La recette de B2 est corrigée (8ac47dd) avec son accord.
- **Chiffrage** demandé par Teo : `omega/CHIFFRAGE/tiroma.md` (3235aba).

**Attention, vitrine** : main a été remis à la vitrine de 15 h 55 (c0494b4). Sur cette version, les 5 lignes Tavaro portent encore « En préparation », et la carte WhatsApp de `Formules.tsx:162` est inexacte. Je ne touche pas au site : décision de Teo.

**Attend le coordinateur** : rien à poser. Seulement vérifier que la vitrine reprend 4653c92, l'écran AnalysesParc et les cartes Tiroma si Teo le décide.

**Attend Teo** :
- un export réel du logiciel du premier cabinet ;
- Scaleway HDS et un fournisseur de courriel HDS ;
- la passerelle ou l'accord éditeur pour le quasi temps réel ;
- le contrat-type ;
- la correction de la phrase WhatsApp ;
- pour Tavaro, des données réelles d'un loueur.

**Prochaine étape exacte** (au réveil) :
1. Lire les notifications.
2. Si un export réel arrive, le jouer par la chaîne de relevé et caler les `modeles_jeux` tiroma/logosw.
3. Sinon, la liste « Pour tout amener en B » du chiffrage, dans l'ordre : soins à déplacer, séance longue mal placée, créneau proposé pour un plan, liste des contrôles dus, export des données.

Base de travail locale : `/var/tmp/pgb3`, port 5499 (bases b3_rap et b3_tav). Elle sera perdue avec le conteneur, ce qui n'a aucune importance.

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
- 06/10, 15 h 05 Z — **b3_12 v2, test 13 et b3_12c sont verts sur la recette** : `^test_b3_` et le test socle 44, 15/15. L'écran du registre part sur main avec la prochaine poussée.

### Vague 3, n° 2 : le pilotage du titulaire (06/10, ~15 h 30 Z)
- `omega/modules/tiroma/migrations/b3_13_pilotage.sql` : la porte `tiroma_pilotage(p_client, p_entite, p_jours = 30)`, réservée au titulaire et à la direction. Sur une période glissante (et la période d'avant, de même longueur), elle rend :
  - les devis présentés et signés, avec le taux, les montants et la répartition par panier (100 % Santé, maîtrisé, libre, non précisé) ;
  - les devis en attente : montant, ceux qui expirent sous 30 jours, et ceux « à relancer » (présentés depuis 7 jours ou plus, sans appel noté depuis 14 jours ; liste de 10 au plus) ;
  - le chiffre signé sans rendez-vous, tiré de la même source que la carte b3_03 ;
  - les rendez-vous passés, honorés et manqués, avec le taux par praticien ;
  - les appels de la période.

  Lecture seule. Vérifiée sur un Postgres local, avec les devis du banc recopiés : 3 présentés, 2 signés, taux 0,667, 3 825 € présentés et 3 045 € signés, période d'avant 2/2, D005 à relancer puis plus du tout après un appel.
- `omega/tests/tiroma/14_pilotage.sql` : `test_b3_14_pilotage`, 27 assertions.
- Écran : carte « Pilotage » (titulaire et direction) avec 4 tuiles (devis acceptés et écart en points, signé sans rendez-vous, devis sans réponse, rendez-vous manqués), deux tableaux (par panier, manqués par praticien) et la liste des devis à relancer, chacun avec son bouton « Noter l'appel » (motif devis). Recette aux cinq largeurs : 76 contrôles, tout passe ; axe : 0 écart.
- Reste pour le n° 2 : le rapport mensuel déposé au point du matin du 1er (agrégats seuls, sans nom). Ce sera une section de `tiroma_deposer_points`, après accord.

### Vague 3, n° 3 : les rappels aux patients (06/10, ~16 h Z)
- Décision de Teo (par le coordinateur, 15 h 17 Z) : tout construire maintenant et tester sur la recette, en mode essai, avec des patients fictifs ; le prestataire HDS sera branché au premier client ; le verrou du socle reste intact en production.
- **Voie d'essai proposée au coordinateur, en attente de son accord** : `reglages_envois.essai_donnees_fictives`, vrai seulement sur la recette et en mode essai. Il ne lève les verrous santé qu'en essai ; le message part à `essai_adresse`, jamais au patient ; l'expéditeur d'A2 l'accepte de même. J'ai écarté l'idée d'un fournisseur d'essai « agréé » : ce serait une fausse déclaration HDS, et le réglage `envois_essai_fournisseur` vaut pour toute la recette.
- `omega/modules/tiroma/migrations/b3_14_rappels_patients.sql` (module seul, rien dans le socle) :
  - `tiroma_contacts` et ses portes `tiroma_noter_contact` / `tiroma_retirer_contact` : l'accord passe par `private.noter_consentement` (module tiroma, source oral, écrit ou formulaire, avec preuve) ;
  - 6 gabarits globaux validés, `donnees_sante = true` : `tiroma.rappel_j2_{email,sms}`, `tiroma.relance_plan_{email,sms}`, `tiroma.rappel_devis_{email,sms}` ;
  - `private.tiroma_preparer_rappels` (cron tiroma-rappels, à h:07) prépare :
    - le rappel J-2, clé `tiroma:j2:<rdv>:<début>` ;
    - la relance d'un plan signé sans rendez-vous depuis 21 jours, une fois par tranche de 30 jours ;
    - le rappel d'un devis présenté depuis 10 jours, une seule fois ;
  - les réponses : abonnement `reception.nouvelle` → `tiroma.reception`, lecture stricte OUI / NON, `tiroma_reponses_rappels`. Une réponse NON lève une alerte « libérez le créneau dans le logiciel », sans nom dans le titre (cron tiroma-reponses) ;
  - `public.tiroma_rappels` : la porte de lecture de l'écran.

  Rejouée deux fois sur un Postgres local avec des tables simulées : idempotente, gabarits validés, crons inscrits, lecture OUI / NON conforme.
- `omega/tests/tiroma/15_rappels_patients.sql` : `test_b3_15_rappels_patients` (35 assertions). Il vérifie notamment que le rappel J-2 de R011 (Dorville) est **bloqué SANTE_HORS_CANAL_AGREE** tant qu'aucun fournisseur n'est agréé, et que les réponses OUI, NON et la question sont lues comme attendu.
- Écran : carte « Rappels aux patients » (mode essai ou en service, moyens de contact, réponses reçues, derniers rappels avec la raison du verrou) et dialogue « Ajouter un moyen de contact ». Recette : 81 contrôles, tout passe ; axe : 0 écart.
- 06/10, ~16 h 30 Z — **voie d'essai acceptée** par le coordinateur ; extraits de la recette reçus. Conséquences :
  - **Décision D6** : pas de SMS dans Tiroma (`modules_envois.tiroma` : email, whatsapp, appel ; `canaux_envoi.sms.permis_sante = false`). b3_14 passe au **courriel seul** : contacts en `email`, 3 gabarits au lieu de 6, refus 22023 d'un SMS, écran sans SMS. Le drapeau 19ah ne rouvre pas le SMS.
  - `exiger_reglage_destinataire` admet gerant, admin, valideur et collaborateur (rôle socle). `referent@` est valideur : l'assistante du banc note donc les accords. **Une assistante « lecteur » serait refusée (42501)** : à l'installation d'un vrai cabinet, lui donner le rôle valideur ou collaborateur.
  - **Lot socle écrit par B3** :
    - `omega/modules/socle/migrations/19ah_essai_donnees_fictives.sql` : colonne `reglages_envois.essai_donnees_fictives`, CHECK (essai seulement), déclencheur (vrai refusé hors `environnement = recette`), réécriture par repères de `verrous_envoi` (SANTE_HORS_CANAL_AGREE sauté seulement en essai, drapeau posé sur la ligne du module, et environnement = recette) et de `commencer_envoi` (`donnees_fictives`). Le lot se rejoue (un repère déjà réécrit est sauté) ;
    - `19ah_recette_seulement.sql` : `private.reglages('environnement') = 'recette'`, exclu de la prod par A5 ;
    - `omega/tests/socle/19ah_essai_donnees_fictives.sql` (21 assertions) : sans drapeau bloqué ; avec drapeau accepté en essai et `donnees_fictives` rendu ; SMS toujours CANAL_NON_PERMIS ; réel refusé (CHECK) ; hors recette, l'envoi est bloqué et le drapeau ne se pose pas.

    Réécriture vérifiée en local sur des fonctions simulées portant les repères de 19ab : posée deux fois, puis les cas sans drapeau, avec drapeau, réel et hors recette.
  - Test 15 : second test `test_b3_15_rappels_essai_fictif` (5 assertions ; total 40). Avec 19ah, le rappel J-2 de R011 passe en essai, et `commencer_envoi` rend `donnees_fictives = true` et `fournisseur_hds = false`.
  - Test socle 19ah, n° 15 : le second envoi allait au même destinataire, donc il était différé (espacement) et commencer_envoi ne rendait pas la réponse d'un envoi prêt (have NULL). Corrigé : autre destinataire, donnees_sante lu sur l'envoi, et donnees_fictives jamais vrai pour un envoi ordinaire. 20 assertions.
  - Test socle 19ah, n° 16 : un vrai défaut, relevé par le coordinateur. commencer_envoi rendait donnees_fictives = le drapeau du module, même pour un envoi sans donnée de santé. **19ah v2** : v_fictif := e.donnees_sante and … ; l'étape 4, rejouable, corrige une pose v1 (vérifié en local : la v1 posée est corrigée, un envoi de santé donne true, un envoi ordinaire false, et une seconde pose ne change rien).

### Suite de la vague 3 (audit des promesses, § 2 Tiroma), dans l'ordre du coordinateur
1. **Synthèse de la semaine pour la direction** (06/10, ~17 h Z) :
   - `b3_15_synthese_semaine.sql` :
     - `private.tiroma_indicateurs_semaine` donne, par cabinet et du lundi au dimanche : rendez-vous, manqués et taux, créneaux libérés, devis présentés et signés (montant), plans sans rendez-vous, appels et rendez-vous repris, rappels, plus la semaine d'avant ;
     - `public.tiroma_synthese_semaine(client, entité = null, lundi = null)` est réservée au titulaire et à la direction. Sans entité, elle couvre tous leurs centres (la direction voit ses sous-entités), avec un total. Aucune donnée nominative ;
     - `private.tiroma_deposer_synthese` : le lundi dès 5 h, une ligne de chiffres « Synthèse de la semaine — <centre> » au point du matin du titulaire et de la direction (de l'entité ou d'un parent), `sante = false`. Cron tiroma-synthese.

     Vérifié en local (tables simulées) : idempotente ; 2 rendez-vous dont 1 manqué sur la semaine du 28/09 au 04/10 ; dépôt le lundi, rien le mardi.
   - `16_synthese_semaine.sql` : `test_b3_16_synthese_semaine`, 22 assertions (droits, chiffres comparés à la base, profil direction, dépôt du lundi, pas à l'assistante, rien le mardi).
   - Écran : carte « Synthèse de la semaine » (4 tuiles, tableau par centre avec l'écart de manqués). Recette : 83 contrôles, tout passe ; axe : 0 écart.
2. **Taux de réinscription** (06/10, ~17 h 30 Z) :
   - Définition : parmi les patients VUS dans la période (honoré ou présumé honoré, une visite par patient et par jour), la part qui a déjà un prochain rendez-vous (après la visite, ni annulé ni supprimé). On ne dépend pas de la date de création des rendez-vous, souvent absente des exports.
   - `private.tiroma_reinscription_calc` est posée **dans b3_15** (pas encore posé au moment de l'écrire) : la synthèse de la semaine donne aussi la réinscription, par centre et au total, et elle figure dans la ligne du lundi.
   - `b3_16_reinscription.sql` : `public.tiroma_reinscription(client, entité, jours = 30)`, pour le titulaire, l'assistante et la direction. Elle rend le taux, la période d'avant, le détail par praticien (titulaire et direction seulement) et `sans_suite` : 25 patients vus au plus, sans prochain rendez-vous, sans plan en cours, joignables, et sans appel noté depuis 14 jours. La direction n'y voit aucun nom.
   - `17_reinscription.sql` : `test_b3_17_reinscription`, 18 assertions.
   - Écran : carte « Réinscription » (taux et écart, détail par praticien, « Vus sans prochain rendez-vous » avec « Noter l'appel ») et une colonne réinscription dans la synthèse. Recette : 85 contrôles, tout passe ; axe : 0 écart.
   - Vérifié en local : b3_15 et b3_16 posées deux fois ; 2 visites, 1 réinscrit, taux 0,5, Hugo dans la liste ; la direction voit « Patient du cabinet ».
3. **Absences probables** (06/10, ~18 h Z) :
   - `b3_17_absences_probables.sql` : `public.tiroma_absences_probables(client, entité, jours = 3)` (titulaire, assistante, collaborateur pour ses patients). C'est un score à règles lisible, chaque point avec sa raison :
     - +3 pour deux manqués ou plus en 18 mois, +2 pour un seul ;
     - +1 pour un nouveau patient ;
     - +1 pour un créneau à risque (même jour et même demi-journée, au moins 10 rendez-vous sur 180 jours, taux de manqués au moins 1,5 fois celui du cabinet) ;
     - +1 pour un rendez-vous pris 60 jours avant ou plus (si l'export donne la date de création) ;
     - −3 si le patient a confirmé au rappel.

     Niveau « fort » à partir de 3 points, « moyen » à 2. Un NON au rappel est rendu en tête (« annonce »).
   - `18_absences_probables.sql` : `test_b3_18_absences_probables`, 13 assertions (Jean Absent fort, Lina Nouvelle et ses raisons, confirmation qui efface, NON en tête, horizon).
   - Écran : carte « Absences probables » (niveau, raisons, « Noter l'appel »). Recette : 88 contrôles, tout passe ; axe : 0 écart.
   - Vérifié en local : Jean 4 points (fort), Lina 2 (moyen) ; après la confirmation de Jean et le NON de Lina, seule Lina reste, en « annonce ».
4. **Assistante absente : soins à basculer** (06/10, ~19 h Z) :
   - `b3_18_assistante_absente.sql` pose la table `public.tiroma_absences_membres` : membre, du, au, motif (congé, maladie, formation ou autre ; aucune raison médicale n'est demandée), `close_le`. L'équipe la lit sous RLS ; on n'y écrit que par les portes.
   - Les portes, pour le titulaire et l'assistante :
     - `tiroma_noter_absence_membre(client, entité, membre, début, fin, motif)` → uuid. Elle écrit au journal `tiroma.absence_membre_notee` ;
     - `tiroma_retirer_absence_membre(absence)` clôt l'absence sans l'effacer ;
     - `tiroma_soins_a_basculer(client, entité, jours = 7)` rend, pour chaque absence ouverte, les rendez-vous prévus sur le fauteuil habituel du membre absent pendant l'absence quand le soin exige une assistante. Pour chacun, elle donne les fauteuils où le basculer : actifs, équipés pour ce soin, libres sur ce créneau, non fermés, avec une assistante habituelle présente.
   - `19_assistante_absente.sql` : `test_b3_19_assistante_absente`, 16 assertions. Le test vérifie les droits et les refus (dates, motif). Il vérifie aussi :
     - le soin bascule vers le Fauteuil 2 avec Élodie, jamais vers le Fauteuil 3 (sans assistante), jamais vers celui de l'absente ;
     - si Élodie est absente aussi, il n'y a plus de fauteuil où basculer ;
     - une fois clôturée, l'absence n'apparaît plus mais reste dans l'historique ;
     - daf2 ne voit rien ;
     - la ligne est au journal.
   - Écran : carte « Équipe absente » (titulaire et assistante) avec :
     - les absences et les soins à basculer (« Vers Fauteuil 2 (avec Karine) » ou « Aucun fauteuil libre ») ;
     - le dialogue « Noter une absence » (qui, du, au inclus, motif) ;
     - « Clore l'absence ».

     Recette : 94 contrôles, tout passe ; axe : 0 écart, dialogue compris.
   - Vérifié en local : la porte rend le rendez-vous avec le Fauteuil 2 et Élodie ; après clôture, plus rien. Un premier essai a montré qu'une absence clôturée jouait encore dans la même transaction, parce que now() y est constant : d'où `close_le`.
5. **Demi-journées vides des collaborateurs** (06/10, ~20 h Z) :
   - `b3_19_demi_journees_vides.sql` pose `public.tiroma_demi_journees_vides(client, entité, jours = 14)`, de 1 à 28 jours. Pour chaque praticien actif et chaque demi-journée (matin avant 13 h), on calcule :
     - les heures où il consulte : ses horaires propres s'il en a. Sinon, les horaires du cabinet réduits à ses demi-journées habituelles, c'est-à-dire des rendez-vous à ce créneau au moins 3 des 8 dernières semaines (`source` vaut alors « habitude ») ;
     - à ces heures on retire les fériés, ses fermetures et celles du cabinet, et ses plages « personnel ». Un horaire exceptionnel du jour l'emporte ;
     - la demi-journée est « vide » à partir d'une heure ouverte et sous le seuil du cabinet. Aujourd'hui, seul ce qui reste compte ;
     - avec la demi-journée vide, on rend les minutes libres et le nombre de patients en liste d'attente qui la rempliraient.
   - Qui la voit :
     - le titulaire voit tous les praticiens ; un collaborateur ne voit que son agenda, même si le périmètre du cabinet est partagé ;
     - ni l'assistante ni la direction : la page dit « jamais par personne, seul le titulaire » ;
     - on ne regarde que l'avenir, sans taux passé.
   - `private.tiroma_deposer_demi_journees` : chaque jour dès 5 h, au point du matin du titulaire seulement, une section « Demi-journées vides — <centre> » pour les sept jours qui viennent (8 lignes au plus), `sante = false`. Les lignes de J et J+1 sont en « attention ». Cron tiroma-demi-journees.
   - Les calculs internes (`tiroma_ouvert_praticien`, `tiroma_demi_journees_calc`, le dépôt) ne sont ouverts qu'au service_role.
   - `20_demi_journees_vides.sql` : `test_b3_20_demi_journees_vides`, 15 assertions :
     - les droits, l'horizon ;
     - le matin vide de Dr Rousseau (ses horaires, 240 min) et rien l'après-midi ;
     - l'après-midi habituel de Dr Lacour ;
     - le collaborateur ne voit que lui ;
     - le décompte de la liste d'attente ;
     - le point du matin : rien avant 5 h, la section au titulaire seul, sans santé ;
     - un rendez-vous de 3 h 30 remplit le matin, un congé efface l'après-midi.
   - Vérifié en local (tables simulées) : posée deux fois. Le jour D, on trouve Rousseau le matin (horaires, 240 min, attente 1) et Lacour l'après-midi (habitude, 300 min). Le collaborateur ne voit que Rousseau, l'assistante est refusée et rien n'est déposé à 4 h. Après le rendez-vous et le congé, il ne reste rien pour D.
6. **Objectifs par fauteuil** (06/10, ~20 h 30 Z) :
   - `b3_20_objectifs_fauteuils.sql` pose `public.tiroma_objectifs_fauteuils(client, entité, semaines = 4)`, pour le titulaire seul, sur 1 à 12 semaines. Par fauteuil actif et par semaine :
     - les heures ouvertes viennent de `private.tiroma_ouvert` (un jour au calendrier inconnu ne compte pas) ;
     - pour les semaines passées, l'occupation est le **réalisé** (honoré, `tiroma_reserve 'realisee'`) : un manqué n'occupe pas le fauteuil. Pour la semaine en cours et la suivante, c'est le **prévu** ;
     - `atteint` vaut taux ≥ objectif, s'il y a un objectif et au moins une heure ouverte. Le résultat donne aussi la moyenne des semaines passées et le compte atteintes / comptées.
   - L'objectif lui-même se fixe sous RLS : le titulaire fait l'`update` de `tiroma_fauteuils.objectif_occupation`. Il n'y a pas de nouvelle porte d'écriture.
   - `private.tiroma_occupation_semaine` n'est ouvert qu'au service_role.
   - `21_objectifs_fauteuils.sql` : `test_b3_21_objectifs_fauteuils`, 14 assertions :
     - droits : l'assistante, le collaborateur et daf2 sont refusés ;
     - six semaines, natures « réalisé » / « prévu » ;
     - +120 min honorées comptées, l'heure manquée non, +60 min prévues la semaine suivante ;
     - objectif à 1 % atteint, à 100 % non, sans objectif ni l'un ni l'autre ;
     - aucun nom.
   - Écran : carte « Objectifs par fauteuil » (titulaire). Un tableau fauteuils × six semaines, en pastilles vert/ambre pour le passé ; une semaine à venir sous l'objectif reste neutre, son agenda se remplit encore. Colonne « Tenu », et « Fixer / Changer » ouvre le dialogue d'objectif. Le cadre du tableau est en `position: relative` : sans cela, le texte `sr-only` en position absolue débordait la page à 390, 768 et 1024. Recette : 101 contrôles, tout passe ; axe : 0 écart, dialogue compris.
   - Vérifié en local (tables simulées) : posée deux fois. 120 min honorées et 60 prévues sont comptées, l'heure manquée non ; objectif 1 % → atteint.
7. **Point du matin multi-sites** (06/10, ~21 h Z) :
   - Deux trous dans b3_06 :
     - une personne présente dans deux centres recevait deux « Créneaux à sauver » sans savoir de quel centre ;
     - une direction posée sur l'entité de tête ne recevait rien. Seul un profil sur l'entité même du cabinet était servi, alors que la synthèse (b3_15) suit déjà la hiérarchie.
   - `b3_21_point_multi_sites.sql` remplace `private.tiroma_deposer_points` (même signature, même cron, mêmes droits) :
     - un membre servi dans plus d'un cabinet actif voit « — <centre> » au bout de chaque titre ;
     - la variante qui ne vaut plus est retirée, dans les deux sens ;
     - la direction d'une entité parente reçoit « Cabinet dentaire — <centre> » pour chaque centre qui en dépend ;
     - le reste est inchangé : un membre d'un seul centre garde les titres de toujours, le compte rendu ne compte pas la direction, et les tests 08, 16 et 20 ne bougent pas.
   - `22_point_multi_sites.sql` : `test_b3_22_point_multi_sites`, 12 assertions, **sur deux centres**. Le centre du banc A, et B, « Centre B3-22 Les Abymes », un site rattaché à A créé dans le test : son cabinet, un fauteuil ouvert aujourd'hui, le gérant titulaire des deux, daf2 admin et direction sur A. Le test vérifie :
     - 4 services ;
     - les titres suffixés pour le gérant, et aucun titre nu ;
     - « Charge des fauteuils — Centre B3-22 Les Abymes » (passé si aujourd'hui est férié) ;
     - l'assistante garde les titres nus et ne reçoit pas B ;
     - la direction reçoit les compteurs de A et de B, sans santé ;
     - rejouer le dépôt ne double rien ;
     - une fois B coupé, les titres de A redeviennent nus et les suffixés partent.
   - Vérifié en local (sections simulées, même scénario) : 10 sections, rejouées à l'identique ; après la coupure de B, les titres nus reviennent.
**Retour TAP du coordinateur (06/10, ~16 h 45 Z) et corrections :**
- **Test 44 rouge**, à cause de `private.tiroma_duree_texte`, ouverte à authenticated. b3_19 la ferme désormais : service_role seul.
- **Le socle classe toute section de Tiroma « santé ».** `deposer_section` fait `v_sante := p_sante or private.point_module_sante(module)`. Les assertions « sans donnée de santé » des tests 16, 20 et 22 étaient donc fausses : elles sont retirées. Le test 22 vérifie à la place que la direction ne reçoit que des compteurs. Les commentaires de b3_15 et b3_19 qui disent `sante = false` parlent de l'argument passé, pas de la section rendue.
- **Test 19** : le soin de demain passe de 15 h à 11 h 15. À 15 h, le Fauteuil 2 est occupé par R012 (implant, 14 h 30 à 16 h) dans l'agenda du banc.
- **Test 20** : D passe au-delà de l'agenda du banc, entre J+12 et J+18, lu sur 21 jours. Le banc donne à Dr Rousseau 50 min chaque matin (20,8 %) et à Dr Lacour 75 min chaque après-midi (25 %), au-dessus du seuil de 20 %. Le dépôt est appelé à D-3.

## Après l'audit — les lignes Tiroma restantes du site (06/10, ~21 h 30 Z)

Coordinateur : toutes les migrations sont posées, `^test_b3_` passe à 24/24 et tous les écrans sont fusionnés dans main. J'ai fusionné main dans worker-b3 (c3f1bf8) pour reprendre `lib/en-preparation.ts`.

- **`lib/en-preparation.ts`** : les sept lignes Tiroma restantes sont retirées, car toutes sont livrées et posées (b3_18 à b3_21). La clé `tiroma` reste, vide, parce que la page dentaire la nomme. La page /secteurs/dentaire ne porte plus aucune pastille « En préparation ».
- **Comparaison de `components/secteurs/dentaire/textes.ts` avec ce qui est livré.** Une seule promesse n'avait pas de code : « Mêmes règles de priorité partout » (offre Centre) et « Règles de priorité communes » (offre Réseau). Les règles sont propres à chaque centre (`tiroma_regles`) et rien ne les alignait.
- **`b3_22_regles_communes.sql`** pose deux portes, pour le titulaire :
  - `public.tiroma_regles_communes(client)` donne les règles de priorité de chacun de ses centres et la liste des écarts ;
  - `public.tiroma_aligner_regles(client, source, cibles = null)` recopie ces règles du centre source sur les autres centres. Il faut être titulaire de la source et de chaque cible ; sinon 42501, et rien n'est changé. La porte écrit au journal `tiroma.regles_alignees`.
  - Sont recopiés : l'ordre de priorité, les propositions, les délais, les seuils, les contrôles, les devis, le laboratoire, l'orthodontie et la demi-journée vide. Restent propres à chaque centre : la réserve d'urgences, les garde-fous d'import, la fenêtre de report et l'objectif de production.
- **`23_regles_communes.sql`** : `test_b3_23_regles_communes`, 15 assertions sur deux centres (A et « Centre B3-23 Le Gosier », un site rattaché à A). Il couvre :
  - les écarts nommés ;
  - les refus (assistante, collaborateur, cible étrangère), sans aucune écriture ;
  - l'alignement, objectif de production et garde-fous de B gardés ;
  - plus aucun écart après l'alignement ;
  - le journal ;
  - daf2 qui ne voit aucune règle.
- **Écran** : carte « Règles communes » (titulaire de plusieurs centres) avec le tableau des écarts et le dialogue « Aligner sur ce centre ». Recette : 104 contrôles, tout passe ; axe : 0 écart, dialogue compris.
- **Vérifié en local** (tables simulées) : posée deux fois. Les écarts relevés sont `nb_propositions` et `ordre_priorite`. Une cible étrangère est refusée sans écriture. L'alignement donne 1 et laisse l'objectif de B à 4000 ; il ne reste ensuite aucun écart.

## Renfort Tavaro (06/10, ~18 h Z) — les cinq lignes d'analyse

Le coordinateur m'a confié, en renfort de B2, cinq lignes de la page /secteurs/location qui étaient en préparation : Véhicules inactifs (n° 10), Réservations à risque (07), Montée en gamme (08), Contrats à risque (09), Plan de flotte (20). B2 garde les douze autres et en a été prévenu (session_01HKxgZfAkgWXmzJkkwWRMN5).

Les fichiers portent le préfixe b3t_. Aucune fonction ni table de B2 n'est modifiée ; les tables loc_ ne sont que lues, sauf la nouvelle table du contrôle des pièces.

- **`b3t_01_parc_et_reservations.sql`**
  - `private.loc_b3t_flux` calcule, sur 72 h, l'offre et la demande par agence et par catégorie : véhicules au parc (là où leur dernier contrat les a rendus), retours prévus, départs réservés.
  - `public.loc_vehicules_inactifs(client, entité)` : pour chaque véhicule au parc sans réservation propre, la probabilité de rester trois jours, calculée ainsi :
    - excédent = au parc + retours − départs, plafonné au nombre au parc ;
    - probabilité = excédent / au parc ;
    - niveau « fort » à partir de 0,66, « moyen » à partir de 0,34.

    L'action proposée, dans cet ordre : transférer vers l'agence où la catégorie manque, sinon proposer le véhicule en montée en gamme, sinon placer l'entretien dans ce creux.
  - `public.loc_reservations_a_risque(client, entité, heures = 72)` : un score à règles, chaque point avec sa raison.
    - +3 si le client a déjà fait faux bond ;
    - +2 si la réservation n'est qu'une option ;
    - +2 si elle n'est ni prépayée ni couverte par un acompte ;
    - +1 pour un nouveau client ;
    - +1 si le canal est à risque (taux de non-présentation au moins 1,5 fois celui du réseau, sur 10 réservations au moins) ;
    - +1 si la réservation date de plus de 60 jours.

    L'action suit la raison : confirmer, demander un acompte ou relancer.
  - `public.loc_montee_en_gamme(client, entité, heures = 48)` propose la catégorie immédiatement supérieure qui a un excédent à l'agence, si le profil s'y prête :
    - +2 si le client a déjà loué plus haut ;
    - +1 pour un professionnel ;
    - +1 pour une location de 3 jours ou plus ;
    - +1 s'il est fidèle.

    Jamais à un client qui a un impayé, un litige ou une non-présentation.
- **`b3t_02_contrats_a_risque.sql`**
  - La table `public.loc_controles_conducteur` garde un contrôle par contrat : pièce d'identité et permis conforme ou non, permis de moins de trois ans. Minimisation : ni numéro, ni date, ni photo. RLS : lecture par qui voit l'agence du contrat.
  - La porte `public.loc_noter_controle_conducteur` écrit au journal.
  - `public.loc_contrats_a_risque` donne un score sur trois axes :
    - conducteur : +3 pièce non conforme, +2 permis récent, +1 pièces à contrôler ;
    - historique : +1 nouveau client, +2 retard passé, +3 impayé ou litige ;
    - sinistralité : +2 pour une facture de dommages, +3 pour deux ou plus.
- **`b3t_03_plan_de_flotte.sql`** : `public.loc_plan_de_flotte(client, mois = 12, cible = 0,80)`, réservé au gérant et à l'admin. Par agence et par catégorie, il donne la flotte, l'utilisation, le pic au 95e centile et la cible.
  - La cible est le plus grand de deux chiffres : le pic, et ce qu'il faut pour louer les mêmes jours à l'utilisation visée.
  - On déplace avant d'acheter, puis on vend le reste, des plus anciens aux plus kilométrés.
  - Sont à renouveler les véhicules qui auront 4 ans ou plus, ou 120 000 km ou plus.
- **`b3t_04_point_du_matin.sql`** : `private.loc_b3t_deposer_points` (cron tavaro-analyses) dépose dès 5 h quatre sections par agence, au rôle valideur : Véhicules inactifs, Réservations à risque, Contrats à risque, Montée en gamme. Une section vide est retirée. `loc_deposer_points` de B2 n'est pas touché.
- **Droits** : les portes publiques sont en security definer et contrôlent le rôle (`private.loc_b3t_regard`) et le périmètre (`voit_entite`). Toutes les fonctions private sont réservées au service_role.
- **Tests** : `omega/tests/tavaro/b3t_01_analyses.sql`, 4 fonctions, 42 assertions, sur le jeu de B2 (`tests.tavaro_jeu`, `tavaro_jeu_facture`) et un parc posé par `tests.b3t_parc`. Ils couvrent :
  - les probabilités et les actions ;
  - les scores ;
  - l'offre de montée en gamme ;
  - le périmètre d'un collaborateur de NORD ;
  - le contrôle des pièces (refus, remplacement, journal, autre loueur) ;
  - le plan (droits, déplacer avant acheter, renouveler) ;
  - le point du matin.
- **Écran** : la carte `AnalysesParc.tsx` (avec `analyses.ts` et `analyses-exemple.ts`) s'insère en une ligne dans `EcranTavaro.tsx`, au-dessus des avis de contravention. Elle regroupe quatre listes et le plan de flotte, avec le dialogue « Noter le contrôle ». Le rendu attend le montage côté navigateur, sinon les dates de l'exemple faisaient une erreur d'hydratation (#418).
- **Recette** : `omega/recette-b3/recette-tavaro-analyses.mjs`, 45 contrôles aux 5 largeurs, scénario du contrôle et axe sur les cinq cartes et le dialogue : tout passe. La recette de B2 passe aussi, après une seule correction : son compte « 8 contrats listés » prenait tous les `.esp-item` de la page, il est désormais limité à la liste « Contrats de location ».
- **Vérifié en local** (tables loc_ simulées) :
  - transfert SIÈGE → NORD avec une probabilité de 0,67, et une compacte certaine de rester ;
  - R1 à 5 points (« fort »), R2 « a déjà fait faux bond » ;
  - R3 reçoit l'offre de la catégorie C ;
  - collaborateur de NORD : aucun véhicule du siège ;
  - contrat de Rémi Risque à 5 points, puis 6 après le contrôle ;
  - plan : 5 citadines du siège vers NORD ;
  - point du matin : 3 sections déposées.
- **Après la réponse de B2 (06/10, ~18 h 30 Z)** :
  - La carte est déplacée entre « Contestations bancaires » et « Facture électronique : préparation 2027 », comme B2 l'a demandé.
  - Les véhicules immobilisés sont exclus du parc et de la liste des inactifs. Ils viennent de `public.loc_immobilisations` (b2_10 de B2, période ouverte avec `fin_le` null) ; la table est lue par `to_regclass` et une requête dynamique, donc tant qu'elle n'est pas posée, aucun véhicule n'est immobilisé. Le résultat donne leur nombre (`immobilises`).
  - Contrats à risque : +3 si le client a déjà contesté un débit auprès de sa banque (`public.loc_contestations` de B2, même lecture dynamique). L'action proposée est alors de faire signer l'état des lieux de départ, photos à l'appui.
  - Vérifié en local, avec des tables simulées pour ces deux sources : le véhicule immobilisé est exclu, et le contestataire reçoit +3.
  - Les tests pgTAP ne couvrent pas ces deux chemins, faute de connaître le schéma définitif des tables de B2.
  - La recette de B3 et celle de B2 repassent.
  - Mes tests ne passent pas par `assembler.sh` de B2 (motif `[0-9][0-9]_*.sql`) : `b3t_01_analyses.sql` se pose seul, après `00_jeu_tavaro.sql`.
- **b2_10 de B2** (1c467ef, pas encore posé) : le schéma de `loc_immobilisations` est définitif. Un véhicule est immobilisé si `fin_le is null and debut_le <= maintenant`.
  - `private.loc_b3t_immobilises(client, avant)` a été adaptée en conséquence.
  - L'offre de 72 h ne compte pas les véhicules immobilisés au début de la fenêtre.
  - La liste des inactifs écarte aussi une immobilisation planifiée qui commence dans les 72 h : un entretien déjà prévu n'est pas un creux perdu.
  - Vérifié en local : un entretien qui commence dans 30 h écarte le véhicule, un entretien dans 10 jours le laisse dans la liste.
