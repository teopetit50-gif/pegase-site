# Session C3 — REPUT : la réponse aux demandes clients

Branche `worker-c3`. Coordinateur : `session_01BCGFdpRKBvXKjouC75sYBg`.
Commencée le 06/10/2026. Je n'appelle jamais Supabase : le coordinateur pose, je lis les sorties brutes.

## REPRISE (pause de Teo, 22/10/2026 00 h 11 Z — reprise sur son go ou samedi 25/10 après 02 h Z)

- **22/10 — preuve REPUT niveau 2 NON FAITE** : banc prêt (boîte banc@recu.omegaai.fr réactivée, envoi en essai, 3 fiches validées seulement, crons verts, aucun accord actif), mais les 2 courriels de Teo vers banc@recu.omegaai.fr ont été rejetés par Brevo « 550 5.1.2 adresse introuvable » (MX OK). **Inbound Brevo à rétablir** (Teo : compte Brevo → Inbound parsing → domaine recu.omegaai.fr ; puis brevo-inbound-installer). Ensuite rejouer PREUVE-VRAIE.md étape 1 (heure T0 dans les blocs 1 à 4).
- **Arrêt** : lots 1 à 10 + c3_24 faits, verts, poussés ; posés et verts sur la recette jusqu'à c3_24. Arbre propre, rien en cours.
- **À faire par d'autres** : redéployer reput-appels v2 (+ TWILIO_ACCOUNT_SID) et reput-reponse, déployer reput-astreinte (session bureau) ; 403 du premier appel : Auth Token PRINCIPAL et REPUT_APPELS_URL identique à la console (Teo) ; choisir le fournisseur de transcription UE ; point RGPD/HDS.
- **Reprise** : preuve en vrai (mail + formulaire, puis astreinte et appels quand Twilio est ouvert) ; restent hors de portée sans accès tiers : connecteur agenda, réseaux sociaux, lecture des avis Google, logiciels métier.

- **Fait et posé sur la recette, vert** : c3_01 → c3_08 (migrations + tests pgTAP, dernier lot c3_08 bb153a2 vert, socle 44/46/51 verts, worker-c3 fusionnée par le coordinateur) ; Edge `reput-reponse` déployée (Deno 12/12) ; écran `app/espace/reput` + `components/espace/reput` ; souche locale 264/264.
- **Dernier commit** : e125ccb — chiffrage `omega/CHIFFRAGE/reput.md` (document seul, rien à poser) ; ce commit-ci ajoute cette section.
- **Attend le coordinateur** : rien à poser ; fusionner e125ccb + ce commit (documents). Export à date fixe : non construit (mis de côté).
- **Attend Teo** : trancher les phrases du site relevées dans le chiffrage (rendez-vous/agenda, astreinte, « réponse à 21 h », « aucun logiciel de plus », contradictions A:94/A:177/A:430 et A:426/K:122) ; clé IA en UE (Bedrock eu-west) ; compte Meta WhatsApp ; un premier client réel (mail + formulaire).
- **11/10 (reprise)** : kit de preuve en vrai prêt — `omega/recette-c3/PREUVE-VRAIE.md` (procédure en 5 étapes), `omega/recette-c3/preuve_vraie.sql` (contrôles, lecture seule), `omega/functions/reput-reponse/outils/preuve_formulaire_reput.ts` (formulaire signé avec une vraie question). Attend : le coordinateur (étapes 0, 2, 3, 5) et Teo (1, 4).
- **11/10** : message sans texte (photo seule) → demande de précision préparée sans modèle (`rediger.ts` `sansTexte`, Deno 14/14). **À redéployer** : Edge `reput-reponse`.
- **Pause du 11/10 15 h 40 Z** : arbre propre. À poser : rien (aucune migration nouvelle). À faire par le coordinateur : redéployer l'Edge `reput-reponse` (15a01a67) ; jouer PREUVE-VRAIE.md avec Teo. Écran REPUT déjà monté dans /espace2/reput (C1), sans lien vers l'ancien dessin.
- **15/10** : c3_09 — un transfert nomme le service qui reprend la demande (base en vigueur : `service` par sujet routé ; consigne du modèle). Souche 268/268, Deno 15/15. **Posé et vert** (recette 15/10 : c3_09, 44, 46, 51) ; **à redéployer** : Edge `reput-reponse` (porte aussi 15a01a67).
- **Pause 50 % du 15/10 (16 h 15 Z)** : arbre propre, rien en cours. Attend : redéploiement de l'Edge `reput-reponse` (15a01a67 + c3_09), preuve en vrai avec Teo, choix du coordinateur entre « valider depuis le mail » et « entité site ».
- **17/10 — bloc « valider depuis la notification » (chiffrage #15), lot 1** : c3_10, les lignes du point du matin mènent à `/espace2/reput?demande=<id>` (plus aucun lien vers l'ancien dessin) ; l'écran ouvre la demande du lien. Souche 272/272, recette 5 largeurs verte. Constat : le socle refuse toute décision sans personne connectée → pas de décision par jeton seul ; et le socle n'a pas de courriel interne vers les décideurs. **À poser** : `c3_10_liens_espace2.sql` + test `c3_10_liens.sql`.
- **17/10 — lot 2** : c3_11, courriel « réponses à valider » aux décideurs (gérant, admin, valideur du périmètre ; membres du service si le sujet est routé) par `private.envoyer_interne` (socle 19as, A1) : gabarit global fermé `reput.a_valider` (date, nombre), au plus un par décideur et par heure, seulement s'il est arrivé une réponse à valider dans l'heure ; tâche `reput-prevenir` chaque minute. Souche 281/281 (imitations 19as ajoutées à 02_complements ; `jouer.sh` épingle l'installation A5 à 699b5ba1, la tête de worker-a5 a déplacé ses lignes). **À poser** après 19as : `c3_11_prevenir_decideurs.sql` + test `c3_11_prevenir.sql` (9). À vérifier : l'hôte du lien (`https://omegaai.fr/espace2/reput`).
- **17/10 — correctif c3_11** : recette 3 rouges sur 9 ; cause : le courriel portait `objet_type` sans `objet_id`, que `creer_envoi` refuse (« Un objet se désigne par son type et son identifiant ») — erreur avalée par la boucle. Le compteur part sans objet ; la souche imite désormais cette règle (3 rouges reproduits, puis 281/281). **Reposé et vert** (recette 17/10 : test c3_11 9/9, tâche reput-prevenir active). Lot clos.
- **Pause de sécurité du 18/10 (07 h 30 Z)** : arbre propre, rien en cours. Tout est posé et vert jusqu'à c3_11. Attend : redéploiement de l'Edge `reput-reponse` (15a01a67 + c3_09) et preuve en vrai avec Teo.
- **18/10 — Omega client REPUT (recette)** : `omega/banc/reput_omega.sql` — client de slug « omega » (A3), REPUT installé, envoi en essai, 16 fiches en BROUILLON tirées mot pour mot de lib/content.ts et /offres (vérifié phrase par phrase), aucun accord permanent. Teo valide les fiches dans l'écran (Base de connaissances) : tant qu'elles sont en brouillon, tout est transféré. Joué deux fois sur la souche : 16 puis 0.
- **18/10 — chantier 3 (sources publiques)** : `omega/banc/reput_metiers.sql`, 62 fiches génériques en BROUILLON sur le banc pour 5 métiers (dentaire 13, avocats, BTP, architectes 14 chacun, location auto 7), reformulées d'après des pages publiques dont robots.txt et mentions légales autorisent la réutilisation (vérification en tête du fichier ; sites interdisant la reproduction écartés). Sources surtout publiques (service-public, impots, culture, conseil-etat, Wikipédia CC BY-SA) : la plupart des sites d'entreprises interdisent la reproduction. faq.ada.fr exclu par le coordinateur (8 fiches retirées, 1 fiche service-public ajoutée) ; attribution CC BY-SA sur les fiches Wikipédia. Souche : 62 puis 0.
- **18/10 (soir) — c3_12** : vue `reput_indicateurs_services` (par jour, site et service : reçues, répondues, en attente, hors base, remontées, délai médian ; security_invoker). Souche 288/288. Au passage : main a refait le point du matin de la souche commune (sections + lignes) ; mon imitation de 02_complements est remplacée par la règle réelle du socle (objet chiffré seul refusé). **À poser** : `c3_12_indicateurs_services.sql` + test `c3_12_services.sql` (7). Modes d'envoi inchangés.
- **18/10 (soir) — c3_13, modèle 2 (Teo 21 h 20 Z)** : `reput_reglages.envoi_auto` (vrai par défaut) ; porte `reput_envoi_automatique(client, actif, motif)` — un geste du gérant propose les accords de tous les sujets autorisables (activés aussitôt s'il est seul décideur, sinon par un autre décideur : le socle exige une personne) ; faux → tout révoqué. Retenue : hors base / chiffre non sourcé (déjà), URGENCE (nouveau, reput_deposer_reponse repris de c3_07), sujets protégés. Modes d'envoi inchangés (essai). Souche 299/299. **À poser** : `c3_13_envoi_automatique.sql` + test `c3_13_envoi_auto.sql` (11). **Posé et vert** (recette 18/10). Écran branché (lot suivant).
- **18/10 (soir) — écran du modèle 2** : onglet « Sujets autorisés » → bloc « Envoi automatique » (état voulu/coupé, règles de retenue écrites, bouton Activer/Couper, « tout autoriser d'un coup ») sur `reput_envoi_automatique` ; chaque demande en attente dit pourquoi elle est retenue (urgence, doute hors base, sujet toujours relu, sujet pas encore autorisé). Recette 5 largeurs verte (bascule comprise). Rien à poser en base.
- **18/10 (nuit) — corrections de 7 fiches métiers** : `omega/banc/reput_metiers.sql`, contenus des fiches 2, 5, 10, 13, 26, 50, 57 repris mot pour mot des versions validées chez Omega (633470bc), communiquées par le coordinateur (sujets et sources inchangés). Le fichier ne repose pas une fiche de même titre : sur un banc où elles existent déjà, les brouillons gardent l'ancien texte. Test `c3_05` : il prenait `current_date` (UTC) là où la porte prend la date de Paris → 7 rouges entre 22 h et minuit Z ; il prend désormais la date de Paris. Souche 299/299. **À poser** : rien de neuf (le test c3_05 rejoué donnera le même résultat à toute heure).
- **19/10 — Teo (23 h 41 Z) : construire tout le reste de REPUT, en 8 lots, un à la fois** (pièces jointes ; rapprochement de deux canaux ; sujet et service secondaires ; réglages par entité et par site ; phrase de transfert dans l'accusé ; export à date fixe ; précision quand il n'y a qu'une pièce ; rendez-vous côté base, sans agenda). Recette seulement, sans envoi réel, sans pages publiques. Hors chantier : astreinte, réseaux sociaux.
- **19/10 — lot 1, pièces jointes (c3_14)** : `reput_pieces(demande)` (liste rangée, nature, affichable, disponible, pièces non reçues ; jamais les chemins) et `reput_ouvrir_piece(demande, rang)` (même périmètre que la lecture de la demande ; chemin rendu seulement s'il est dans le dossier de l'organisation et sans « .. » ; journal `reput.piece.ouverte` sans nom ni chemin). Écran `PiecesJointes.tsx` : image dans la page, PDF/texte dans un onglet, le reste (SVG, HTML) en téléchargement, lien signé 5 min. pgTAP 20/20, souche 319/319, recette 5 largeurs verte. **À poser** : `c3_14_pieces_jointes.sql` + test `c3_14_pieces.sql`. Écran : sur worker-c3 comme le reste.
- **19/10 — lot 2, deux canaux (c3_15)** : `cles_texte` (courriels et téléphones écrits dans le message, texte cité ôté, boîte exclue) rapprochent d'une demande dont l'adresse d'ENVOI est ce contact — jamais texte contre texte (la signature de l'organisation citée ne relie pas deux clients) ; `reput_dossier_de` reprise de c3_07 avec ce critère. Même nom (ordre, casse, accents ignorés ; deux à cinq mots), autre canal, 48 h, même entité, sans clé commune → `rapprochement_propose`, jamais de fusion seule. Portes `reput_rapprocher` (tout l'ancien dossier suit ; l'ancienne réponse en attente cède quand la nouvelle est prête — règle de c3_07), `reput_ecarter_rapprochement`, `reput_separer` (une demande regroupée revient « à traiter »). Gérant, admin, valideur, collaborateur, sur son périmètre. Écran `Rapprochement.tsx` + exemple d6 « Martin Luc ». pgTAP 24/24, souche 343/343, recette verte. **À poser** : `c3_15_rapprochement_canaux.sql` + test `c3_15_rapprochement.sql`.
- **19/10 — lot 3, sujet secondaire (c3_16)** : colonne `sujet_secondaire` ; porte `reput_noter_sujet_secondaire(demande, sujet)` — serveur, ou personne qui traite la demande ; inconnu, inactif ou égal au principal refusé ; nul efface. Second sujet routé vers un AUTRE service → `private.reput_prevenir_second_service` : courriel interne (19as) aux membres de ce service dont le périmètre couvre la demande, gabarit global fermé `reput.second_service` (date, nombre), clé `reput.second_service:<demande>:<membre>`. Le service principal garde la réponse et sa validation. Edge : le modèle peut rendre `sujet_secondaire` (contrôlé : connu et ≠ sujet), noté après le dépôt — un échec ne défait pas la réponse (Deno 16/16). Écran `SujetSecondaire.tsx` (pastille « Concerne aussi : … · service … prévenu », choix pour qui traite). pgTAP 19/19, souche 362/362, recette verte. **À poser** : `c3_16_sujet_secondaire.sql` + test `c3_16_secondaire.sql` ; **à redéployer** : Edge `reput-reponse`.
- **19/10 — lot 4, réglages par site (c3_17)** : colonne `suit_organisation` ; déclencheurs sur `reput_reglages` — à la naissance d'une ligne d'entité, copie de l'organisation (suit = vrai) ; à chaque changement de l'organisation, les entités qui suivent sont recopiées (drapeau de transaction `reput.propagation`) ; un changement de contenu d'une entité la fait sortir du suivi. Garde de périmètre dans le déclencheur : entité → `perimetre_couvre`, organisation → `perimetre_total` (personne connectée seulement ; le serveur passe). Porte `reput_suivre_organisation(client, entite)` ; vue `reput_reglages_sites` (security_invoker). Les lecteurs existants (reput_base, accusé, avis) inchangés. Souche : imitation de la lecture des entités au périmètre (grant SELECT + politique du socle, `private.voit_entite`). Écran `ReglagesSites.tsx` dans « Réglages et avis ». pgTAP 17/17, souche 379/379, recette verte. **À poser** : `c3_17_reglages_sites.sql` + test `c3_17_reglages_sites.sql`. **À vérifier sur la recette** : les gérants ont `perimetre_total` (sinon ils ne changent plus les réglages de toute l'organisation).
- **19/10 — lot 5, phrase de transfert dans l'accusé (c3_18)** : colonne `phrase_transfert` (défaut « Votre demande est transmise au service {service}, qui revient vers vous. », contrainte : contient {service}, ≤ 300 ; nulle = aucune). `private.reput_accuser` reprise de c3_05 : sujet routé vers une équipe → phrase ajoutée au texte de l'accusé, {service} = nom de l'équipe ; journal `service_nomme`. `reput_regler` reprise de c3_06 (+ clé `phrase_transfert`) ; copie/différence/propagation/suivi de c3_17 reprises avec le champ. Écran : champ dans « Vos réponses ». pgTAP 9/9, souche 388/388, recette verte. **À poser** : `c3_18_accuse_transfert.sql` + test `c3_18_accuse_transfert.sql` (après c3_17).
- **19/10 — lot 6, export à date fixe (c3_19)** : tables `reput_exports_programmes` (un par organisation ou site ; hebdomadaire jour 1-7 / mensuel jour 1-28 ; destinataires = gérants/admins du périmètre) et `reput_exports` (CSV en base, une fois par période : unique (programme, periode_du)) ; RLS gérant/admin au périmètre STRICT (`private.reput_couvre_strict` : le consolidé demande `perimetre_total`, car `perimetre_couvre` tient une entité nulle pour couverte ; grant execute à authenticated pour la politique). `private.reput_exports_du_jour` (tâche `reput-exports`, 5 h UTC) : sept jours précédents ou mois précédent ; courriel interne fermé `reput.export_pret` (date, nombre), sans le fichier. Porte `reput_programmer_export`. Tables inscrites dans `tables_locataires`. Écran `ExportProgramme.tsx`. pgTAP 20/20, souche 408/408, recette verte. **À poser** : `c3_19_export_date_fixe.sql` + test `c3_19_export.sql`.
- **19/10 — lot 7, précision quand il n'y a qu'une pièce (c3_20)** : `public.reput_commencer` reprise de c3_07 — au moins une pièce, ni texte ni objet qui « parlent » (`private.reput_parle` : un mot de 3 lettres hors noms de fichier, après retrait des signatures automatiques « Envoyé de mon… », « Sent from my… », « Get Outlook for… »), aucun message précédent dans le dossier → `reput_deposer_reponse` avec le texte fixe (`private.reput_corps_precision`, le même que l'ouvrier), sujet autre, hors base, modèle `regle:sans_texte`, coût 0 ; rend `statut: preparee`. Edge : type `preparee` (le travail est clos sans IA, chemin « ignore » existant), signatures automatiques retirées aussi dans `parle` (Deno 18/18). pgTAP 13/13, souche 421/421. **À poser** : `c3_20_precision_sans_texte.sql` + test `c3_20_precision.sql` ; **à redéployer** : Edge `reput-reponse`.
- **19/10 — lot 8, rendez-vous côté base (c3_21)** : tables `reput_rdv_types` (durée 5-480 min, rappel 0-168 h, équipe), `reput_rdv_plages` (jour 1-7, heures, type facultatif, organisation ou site ; désactivées, jamais effacées), `reput_rdv_fermetures`, `reput_rdv` (confirme / replanifie / annule / honore / absent ; remplace). `private.reput_creneaux` : plages au pas de la durée, à l'heure du site (`entites.fuseau`), ≥ maintenant + 1 h, hors fermetures et rendez-vous confirmés du même planning, 62 jours. Portes : `reput_regler_type_rdv`, `reput_regler_plages`, `reput_fermer` (gérant/admin, périmètre strict ; la fermeture dit les rendez-vous à replanifier, sans les bouger), `reput_creneaux_libres` (membre du périmètre ou serveur), `reput_poser_rdv` / `reput_replanifier_rdv` / `reput_annuler_rdv` (qui traite, périmètre ; verrou consultatif par planning ; pris entre-temps → `pose: false` + 3 suivants). Rappel : tâche `reput-rdv-rappels` (*/15) → demande de validation `reput.rappel_rdv` (objet `reput_rdv`) + `preparer_envoi` au canal de la demande, signature des réglages du site. Aucun agenda écrit. Écran `RendezVous.tsx` (sujet ou second sujet rendez_vous). pgTAP 30/30, souche 451/451, recette verte. **À poser** : `c3_21_rendez_vous.sql` + test `c3_21_rendez_vous.sql`. **À vérifier sur la recette** : le socle accepte l'objet `reput_rdv` dans demandes_validation/creer_envoi (nouvel objet_type).
- **19/10 — les 8 lots de Teo (23 h 41 Z) sont faits** (c3_14 → c3_21, tous sur worker-c3). À poser dans l'ordre c3_14 … c3_21 avec leurs tests ; à redéployer : Edge `reput-reponse` (c3_16, c3_20). Hors chantier : astreinte, réseaux sociaux, connecteur agenda.
- **19/10 (reprise 14 h 18 Z) — lot 9, astreinte téléphonique (c3_22)** : réglage `astreinte` / `astreinte_minutes` (organisation) ; tables `reput_gardes` (membre qui traite, numéro E.164 — 06… → +33 —, période, rang 1-5 ; lecture : dirigeants du périmètre et le membre lui-même) et `reput_appels` (un par demande et par rang ; sans numéro ; rang 0 « sans garde ») ; colonnes demande `urgence_prise_le/par`, `astreinte_epuisee_le`. Tâche `reput-astreinte` (chaque minute) : urgence non prise reçue < 6 h → rang 1 ; au délai sans prise, ou échec → rang suivant ; plus de rang → épuisée. Portes serveur `reput_appels_a_passer` (skip locked, numéro + organisation seulement) et `reput_appel_issue` (sonne/pris/sans_reponse/echec ; pris → urgence prise, autres appels clos) ; `reput_prendre_urgence` (espace) ; `reput_regler_astreinte`, `reput_poser_garde`, `reput_retirer_garde`. Ouvrier Edge `omega/functions/reput-astreinte` (Twilio : appel TwiML, Gather 1 touche, StatusCallback ; signature X-Twilio-Signature vérifiée ; cron gardé par `x-reput-jeton`) — Deno 5/5. Écran `Astreinte.tsx` + exemple d7. pgTAP 24/24, souche 475/475, recette verte. **À poser** : `c3_22_astreinte.sql` + test `c3_22_astreinte.sql`. **À déployer (plus tard)** : Edge `reput-astreinte` sans vérification JWT, secrets TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_NUMERO (compte de TEST, Teo), REPUT_ASTREINTE_URL, REPUT_ASTREINTE_JETON, et un cron qui l'appelle chaque minute avec l'en-tête x-reput-jeton.
- **19/10 — lot 10, appels non décrochés transcrits ** : ouvrier Edge `omega/functions/reput-appels` (webhook vocal Twilio, signé) — accueil sans nom, message écouté en français (`Gather input=speech language=fr-FR`), AUCUN enregistrement audio ; le texte reconnu (ou « Appel manqué, sans message laissé. ») devient une réception `canal 'appel'` par `resoudre_boite('appel', numéro appelé)` + `deposer_reception` (identifiant = CallSid, de = numéro appelant). Deno 4/4. Décisions du coordinateur (19/10) : (1) le socle refuse `appel` en réception (`receptions_canal_check`, test de `private.deposer_reception`) — à ouvrir par A1/A2 ; (2) élargir `reput_demandes_canal_check` (c3_02) demande un `drop constraint` (exception à la règle sans DROP). Ensuite c3_23 : canal de réponse d'un appel = SMS au numéro appelant s'il est mobile (06/07), sinon « à traiter » (rappeler). À signaler à Teo : la reconnaissance vocale se fait chez Twilio (hors UE) — question RGPD/HDS pour un client santé.
- **19/10 — lot 10, SQL (c3_23a socle + c3_23)** : `c3_23a_socle_canal_appel.sql` (écrit par C3, A1/A2 à l'arrêt, À RELIRE par le coordinateur) — `receptions_canal_check` + 'appel' (drop/add) et `private.deposer_reception` reprise de l'extrait COMMUN avec la seule vérification de canal élargie (comparer à la définition en base avant de poser). `c3_23_appels_transcrits.sql` — `reput_demandes_canal_check` + 'appel' (drop/add, exception accordée) ; `private.reput_mobile_fr` ; `private.reput_canal_reponse` reprise de c3_02 : appel d'un mobile français → SMS au +33…, sinon pas d'adresse → « à traiter » (rappeler). Edge reput-reponse : le modèle sait qu'un appel est un message vocal transcrit, réponse courte par SMS (Deno 19/19). Écran : libellé « Appel manqué (message transcrit) ». Souche : imitations `exiger_ouvrier`, `resoudre_boite`. pgTAP 9/9, souche 484/484, recette verte. **À poser** : c3_23a (après relecture), puis c3_23 + test `c3_23_appels.sql` ; à redéployer : Edge reput-reponse. Twilio en doublures : rien n'est appelé ni enregistré.
- **19/10 (16 h 15 Z, bureau par délégation de Teo) — c3_24, transcription commutable** : `reput_reglages.transcription_appels` ('twilio' par défaut | 'ue'), portes `reput_regler_transcription` (gérant/admin, périmètre complet) et `reput_voie_transcription` (serveur). Ouvrier `reput-appels` : à l'appel entrant, la voie de l'organisation choisit — « twilio » = Gather speech fr-FR (inchangé) ; « ue » = `<Record maxLength=90>`, rappel `?evenement=enregistrement&a=…&de=…` (numéros dans l'URL signée), audio lu une fois, transcrit par l'interface `Transcripteur` (fournisseur UE non choisi : `transcripteurDepuisEnv` rend null → « transcription indisponible, rappelez »), puis enregistrement EFFACÉ chez Twilio (DELETE Recordings) même en cas d'échec ; un numéro inconnu n'est ni transcrit ni déposé ; une RecordingUrl hors api.twilio.com est refusée. Sans `evenement` dans l'URL : traité comme entrant. Deno 9/9 (reput-appels), 5/5 (reput-astreinte). pgTAP 6/6, souche 490/490. **À poser** : `c3_24_transcription_commutable.sql` + test `c3_24_transcription.sql` ; **à redéployer** : Edge reput-appels (v2 ; ajouter le secret TWILIO_ACCOUNT_SID). **403 du premier vrai appel** : Twilio signe ses webhooks avec l'Auth Token PRINCIPAL (live) du compte, jamais avec le jeton de test ; et `REPUT_APPELS_URL` doit être EXACTEMENT l'URL saisie dans la console Twilio (https, hôte, chemin /functions/v1/reput-appels, même paramètre de requête s'il y en a un).
- **21/10 — série 1 du testeur boîte noire (banc-test-reput), corrections demandées par le coordinateur, un lot à la fois.** Lot 1 TREPUT-04 (R11) → c3_25 : `private.reput_ramener_service` (tout autre service nommé que celui du sujet principal → celui-ci, ou « notre équipe ») appliqué par `reput_deposer_reponse` (reprise de c3_13) au corps et au brouillon AVANT réponse, file de validation et envoi ; consigne de l'ouvrier : ne nommer que le service du sujet principal. pgTAP 8/8, souche 498/498, Deno 19/19. **À poser** : `c3_25_service_annonce.sql` + test ; à redéployer : Edge reput-reponse.
- **21/10 — lot 2 TREPUT-03 (R8)** : le garde-fou des chiffres (rediger.ts) lit les heures comme des heures — « 16 h 30 », « 16h30 », « 16 heures », « 16:30 », « 4:30 pm », « 9 am », « 12 pm » → un jeton « HH:MM » (24 h) ; « 48 h » reste un délai (nombre) ; `permis()` admet la lecture sur 12 h sans am/pm (« until 4:30 » = 16 h 30) et l'heure ronde ↔ le nombre. Aller-retour testé : « 4:30 pm » passe contre « 16 h 30 », « 6:30 pm » / « 10 am » restent attrapés. Correctif côté ouvrier seulement (aucune migration) : Deno 20/20. **À redéployer** : Edge reput-reponse.
- **21/10 — lot 3 TREPUT-01 (R10) → c3_26** : `reput_commencer` (reprise de c3_20) — sans texte ni objet qui parlent, sans précédent → précision sans modèle AVEC ou SANS pièce (sans pièce : `private.reput_corps_vide()`) ; `private.reput_civilite_recue(r)` + `private.reput_sans_civilite(texte, recue)` appliquées par `reput_deposer_reponse` (reprise de c3_25) au corps et au brouillon : jamais de civilité que le client n'a pas écrite (« Bonjour Madame X, » → « Bonjour, » ; ligne « Madame X, … » → « … » avec majuscule ; ailleurs → « X »). Ouvrier : `sansTexte` sans condition de pièce (CORPS_VIDE), consigne 10 (aucune civilité déduite). Test c3_20 : la ligne « sans pièce » prend un texte qui parle (vrai avant et après c3_26). pgTAP 9/9, souche 507/507, Deno 21/21. **À poser** : `c3_26_sans_texte_civilite.sql` + test, et RE-poser le test `c3_20_precision.sql` ; à redéployer : Edge reput-reponse.
- **21/10 — lot 4, détail d'écran → c3_27** : le socle préfixe « Accord permanent : » au résumé de la demande politique.activer ; `reput_donner_accord` (reprise de c3_07) pose un libellé sans préfixe (« Réponses « X » envoyées sans relecture »). Accords déjà posés inchangés. Souche : l'activation imitée compose le résumé comme le socle (« Accord permanent : » || libellé). pgTAP 3/3, souche 510/510. **À poser** : `c3_27_libelle_accord.sql` + test. Les 4 correctifs de la série 1 sont livrés.
- **21/10 — complément du coordinateur (ordre restant : 02, 05, 07, 06 ; 01 et préfixe déjà livrés ; 04 tenu par c3_25). TREPUT-02 → c3_28** : `private.reput_meme_question` (Jaccard des mots ≥ 3 lettres ≥ 0,8, ou inclusion) ; `reput_commencer` (reprise de c3_26) : même question qu'une demande non close du dossier (48 h) → la nouvelle est `ignoree`, `regroupee_avec` la première, journal `reput.demande_doublon`, rend « regroupee » (l'ouvrier n'appelle pas le modèle) ; `reput_regrouper` (reprise de c3_07) traite aussi les réponses à l'envoi BLOQUÉ (validation annulée). pgTAP 8/8, souche 518/518, Deno 22/22. **À poser** : `c3_28_meme_question.sql` + test ; à redéployer : Edge reput-reponse.
- **21/10 — TREPUT-05 → c3_29** : `private.reput_accords_etat` (reprise de c3_07) — `envoyees_seules_mois` ne compte que les demandes de la politique dont l'envoi est « envoye » ; début du mois au fuseau de l'organisation (`private.reput_fuseau`). pgTAP 3/3 (une partie, une bloquée, une prête → 1), souche 521/521. **À poser** : `c3_29_envoyees_seules.sql` + test.
- **21/10 — TREPUT-07 → c3_30** : `reput_fabriquer_export` et `reput_exports_du_jour` (reprises de c3_19) — délai de réponse vide sans `envoyee_le` (greatest ignorait le nul) ; heures de chaque ligne au fuseau de son site, période et « jour dit » au fuseau du programme (`private.reput_fuseau`), plus « Europe/Paris » en dur. Test : site America/Guadeloupe, demande du 31/10 23 h 30 locale bien dans octobre. pgTAP 6/6, souche 527/527. **À poser** : `c3_30_export_delai_fuseau.sql` + test. Reste « Europe/Paris » en dur ailleurs : point du matin (vu avec TREPUT-06), export à la demande de l'écran (export.ts, heure du navigateur forcée à Paris), indicateurs (jour de Paris).
- **21/10 — TREPUT-06 → c3_31** : `private.reput_point_matin_lignes` (reprise de c3_10) — « En attente de votre validation » = demandes de validation REPUT `en_attente` non échues dans la file du socle ; bloquées à l'envoi dites à part (« Bloquées à l'envoi (réglage d'envoi à vérifier) : n ») ; « À traiter vous-même » = à traiter seulement ; jour au fuseau de l'organisation. pgTAP 5/5, souche 532/532. **À poser** : `c3_31_point_matin_file.sql` + test. **Série 1 : tous les lots livrés** (04 c3_25, 03 Edge, 01 c3_26, préfixe c3_27, 02 c3_28, 05 c3_29, 07 c3_30, 06 c3_31).
- **21/10 — TREPUT-08 (mineur, R7a) → c3_32** : `private.reput_libelle_statut(demande)` — statut en clair, et « Regroupée avec la demande du JJ/MM/AAAA HH:MI (canal, nom) » à l'heure du site ; l'export à date fixe l'emploie (`reput_fabriquer_export` reprise de c3_30). Au passage : la même question (c3_28) comparait objet + texte, un objet générique (« Formulaire du site » / « Question ») la faisait manquer → `reput_commencer` (reprise de c3_28) compare les textes, l'objet seulement si le texte manque. Écran : export à la demande (`libelleStatut` dans export.ts) et pastille « Regroupée ». pgTAP 4/4, souche 536/536, recette verte. **À poser** : `c3_32_libelle_statut.sql` + test.
- **Prochaine étape exacte** : faire passer le circuit mail + formulaire en « prouvé en vrai » — rouvrir la boîte du banc banc@recu.omegaai.fr, envoyer un vrai courriel, vérifier préparation < 1 min, validation dans « À valider », envoi reçu, journal ; puis, selon les choix de Teo, le bloc rendez-vous/agenda (≈ 10 j) ou l'astreinte (≈ 3 j).

## Ce que le site promet et ce que C3 rend vrai

La réception existe (A2 : courriel Brevo sur recu.omegaai.fr, formulaire signé, WhatsApp → `public.receptions`,
événement `reception.nouvelle`). La réponse n'existait pas. Règle de fond (coordinateur) : la réponse est
**préparée dans la minute** par le modèle à partir de la base du client, **attend la validation** dans la file,
et **ne part seule que sur les sujets autorisés d'avance** par un accord permanent du socle (`public.politiques`),
sujet par sujet. Jamais de données de santé hors canal agréé (verrous 19ab et D6 du socle).

## Paliers

| Palier | Contenu | État |
|---|---|---|
| 1 | Base de connaissances par client (questions-réponses, horaires, tarifs, documents ; source et validité ; versions) ; sujets ; réglages par entité ; abonnement `reception.nouvelle → reput` | **écrit, 66/66 en local** — à poser |
| 2 | Préparation : classement (sujet), brouillon sourcé, « je ne sais pas », langue ; dépôt en envoi `a_valider` sur le canal de la demande | **écrit** : c3_02 61/61 en local, fonction Edge `reput-reponse` 11/11 Deno — à poser et déployer |
| 3 | Accord permanent par sujet (envoi seul) ; point du matin « reçues, en attente, répondues » | **écrit** : c3_03 46/46 en local — à poser |
| 4 | Écran `/espace/reput` : demandes, réponses à valider (Valider / Corriger / Refuser), base, sujets autorisés | à faire |
| 5 | Autres lignes : accusé de réception, relance des devis, demandes d'avis, indicateurs | **écrit** : c3_05 31/31 en local (souche 206/206), écran « Réglages et avis » — à poser |

## Palier 1 — `c3_01_base_connaissances.sql`

Tables (lues sous RLS, écrites par les portes seulement) :
- `reput_reglages` (organisation, ou entité) : signature, formule d'appel, formule de politesse, ton
  (vouvoiement / tutoiement), mention de la réponse automatisée (termes du client), langues couvertes, actif.
- `reput_sujets` : onze sujets posés à l'installation. `reclamation`, `urgence`, `humain`, `litige`, `autre`
  ne sont **jamais** autorisables à l'envoi seul (figé par la porte, même réécrits).
- `reput_connaissances` : fiche (genre question / horaires / tarif / document / information), sujet, titre,
  contenu, langue, **source obligatoire**, pièce rattachée, `valide_du` / `valide_au`, statut
  brouillon → validée → remplacée / retirée, **versions** (`origine_id`, `version`, `remplace_id`), rédacteur,
  valideur, dates ; chaque écriture au journal opposable (`reput.connaissance_creee|corrigee|validee|retiree`).

Portes : `reput_installer` (serveur, gérant, admin ; rejouable), `reput_regler`, `reput_ecrire_sujet` (gérant,
admin), `reput_ecrire_connaissance` (gérant / admin / valideur → validée ; collaborateur → brouillon ; périmètre
d'entité), `reput_valider_connaissance`, `reput_retirer_connaissance` (motif obligatoire), `reput_base`
(**serveur seul** : la base en vigueur à un instant, pour la fonction Edge du palier 2).

Abonnement : `reception.nouvelle` → module `reput`, genre `reput.preparer` (l'ouvrier ignorera les réceptions
d'un autre module). Tables inscrites dans `private.tables_locataires` (export, effacement).

Droits : fonctions de `private` révoquées de public/anon/authenticated (test 44) ; aucune vue (46) ; SELECT
seul pour authenticated, une politique SELECT par table (51).

Tests : `omega/tests/reput/c3_00_jeu.sql` (aides), `omega/tests/reput/c3_01_base.sql` (66 assertions).
Joués sur une souche Postgres 16 **locale** (`omega/tests/reput/souche_locale/jouer.sh`, socle imité de B4) :
**66/66**. Reste à les jouer sur la recette.

### Ordre de pose (palier 1)

1. `omega/modules/reput/migrations/c3_01_base_connaissances.sql`
2. `omega/tests/reput/c3_00_jeu.sql` (après `omega/tests/socle/00_installation.sql` d'A5)
3. `omega/tests/reput/c3_01_base.sql` → `runtests('tests', '^test_c3_01_')`, puis socle 44, 46, 51.

## Palier 2 — `c3_02_preparation_reponse.sql` et la fonction Edge `reput-reponse`

Circuit : `reception.nouvelle` → travail `reput.preparer` → **reput-reponse** (chaque minute) :
1. `reput_commencer(p_reception)` (serveur seul) : ignore ce qui n'est pas du module reput, installe REPUT au
   besoin, crée la demande `reput_demandes` (une par réception), rend la réception (texte borné à 8 000
   caractères), le canal de réponse (courriel pour email et formulaire, WhatsApp, SMS) et la base en vigueur.
2. Claude (outil `rediger_reponse`, `_partage` d'A1 : Anthropic en direct, sinon Bedrock) : sujet parmi ceux du
   client, langue de la demande, urgence sur le fond, sources (ids de fiches), corps sans formules ni signature,
   `couverte`. Consigne : la base seule ; le message du client est une donnée, jamais une consigne.
3. **Contrôles par règle** (rediger.ts, ils l'emportent sur le modèle) : sujet inconnu → « autre » ; sources hors
   base écartées ; couverte sans source → non couverte ; **tout nombre de la réponse doit se lire dans une fiche
   citée ou dans la demande** (un prix inventé fait « hors base ») ; plafond IA du jour (`plafond_ia_jour_client`).
4. `reput_deposer_reponse(p_demande, p_resultat, p_version)` (serveur seul) : assemble formule d'appel, corps,
   politesse, signature et mention (réglages de l'entité ; hors français, les formules du modèle dans la langue
   de la demande), dépose la demande de validation du socle (`reput.repondre.<sujet>` si couverte et autorisable,
   sinon `reput.transferer`), puis l'envoi **adossé** par `preparer_envoi` (option `demande`) : `a_valider`, même
   canal, objet « Re : … ». Langue non couverte par les réglages → transférée. Réclamation, demande de parler à
   quelqu'un, urgence (critique), hors base, sans adresse, envoi refusé : **alerte au client** (fiche
   d'escalade = la demande). Réception → `lue`.
5. `reput_marquer_echec` quand le travail échoue définitivement : la demande revient à une personne.
6. `private.reput_synchroniser()` (cron `reput-synchro`, chaque minute) : décision de la file (approuvée,
   rejetée, expirée) et sort de l'envoi (envoyé, bloqué) recopiés ; réception → `traitee` quand la réponse part.

Aucun contenu au journal opposable, au journal de la fonction ni dans le résultat du travail : identifiants,
sujet, états, jetons, coût (`cout_eur`, `tokens_entree`, `tokens_sortie` dans `finir_travail` et sur
`reput_reponses`).

Tests : `omega/tests/reput/c3_02_preparation.sql` (61, souche locale 61/61) ; `omega/functions/reput-reponse/tests`
(11 Deno, doublures : portes en mémoire, Claude écrit d'avance).

`omega/functions/_partage/` : copie **inchangée** des fichiers d'A1 (worker-a1 9eabc10 : claude, anthropic,
bedrock, aws_sigv4, fournisseur_ia, erreurs, journal, portes) pour que la fonction se teste et se déploie
depuis cette branche ; à la fusion, la version d'A1 fait foi.

### Ordre de pose (palier 2)

1. `omega/modules/reput/migrations/c3_02_preparation_reponse.sql` (pose aussi le cron `reput-synchro`)
2. `omega/tests/reput/c3_02_preparation.sql` → `runtests('tests', '^test_c3_02_')`, puis socle 44, 46, 51
3. Déployer `omega/functions/reput-reponse` (avec `../_partage`), verify_jwt true, secrets de l'IA du lecteur
4. `omega/recette-c3/banc_reput.sql` (REPUT en essai sur le banc, trois fiches de démonstration)
5. `omega/recette-c3/cron_reput_reponse.sql` (cron `omega-reput`)
6. Épreuve réelle : la boîte `banc@recu.omegaai.fr` (expéditeur a3630f13, aujourd'hui « suspendu ») doit être
   `actif` pour que la réception range le courriel ; un courriel « Êtes-vous ouverts samedi ? » doit donner en
   moins d'une minute une `reput_demandes` « a_valider » et un envoi `a_valider` en mode essai.

Demande au socle : `consommation_ia_jour` ne compte que `lecteur.lire` (CONTRAT-OUVRIER § 2) ; il faudrait y
ajouter `reput.preparer` (même clé `cout_eur` dans le résultat) pour que le plafond de 5 € soit commun.

## Palier 3 — `c3_03_accords_decisions_point.sql`

- **Accord permanent par sujet**, par le mécanisme du socle (`public.politiques`, comme b6_08) :
  `reput_donner_accord(p_client, p_sujet, p_entite)` (gérant / admin, une personne) propose la politique
  `reput.repondre.<sujet>` (1 000 par mois, un an) et ouvre l'activation aux gérant / admin / valideur
  (règle `politique.activer` du module reput, le demandeur exclu par le socle) ;
  `reput_activer_accord_seul` pour le gérant seul décideur (19af : les sept sujets autorisables par défaut
  inscrits dans `private.activation_seul_autorisee`) ; `reput_revoquer_accord` ; `reput_accords` (état par sujet,
  envois partis seuls dans le mois).
- **Garde** `politiques_reput_garde` (BEFORE INSERT sur `public.politiques`, module reput seulement) : une
  politique REPUT ne porte que sur `reput.repondre.<sujet actif et autorisable>` — jamais `reput.transferer`,
  jamais réclamation / urgence / humain / litige / autre, **même par un INSERT direct du gérant** (la politique
  RLS du socle le lui permet).
- **Valider / Refuser** : `reput_decider(p_reponse, 'valider' | 'refuser', p_motif)` — une approbation du socle au
  nom de la personne (motif obligatoire pour refuser), puis synchronisation immédiate.
- **Corriger** : `reput_corriger(p_reponse, p_corps, p_objet)` — l'ancienne version est rejetée dans la file
  (son envoi ne part plus), une version n+1 `redigee_par` la personne est redéposée par le serveur
  (`reput.redeposer`, demandeur « système », type `reput.transferer` : jamais d'envoi seul) ; le correcteur
  peut la valider lui-même. L'ouvrier de base `private.reput_ouvrier` (cron `reput-synchro`, chaque minute)
  redépose et synchronise.
- **Point du matin** : section « Demandes clients : reçues, en attente, répondues » (gérant, valideurs ; dès
  5 h Paris ; cron `reput-matin` toutes les 30 min) : « Hier : N demandes reçues, M répondues (dont K parties
  seules par accord). En attente de votre validation : X. À traiter vous-même : Y. », puis une ligne par
  demande en attente (urgentes d'abord).

Test : `omega/tests/reput/c3_03_accords.sql` (46, souche locale 46/46 ; total souche 173/173).
Note recette : c3_02 et c3_03 font `update public.envois set statut = 'envoye'` pour simuler la remise ; si
`garder_envoi` le refuse même à postgres, me le dire et je passe par la voie du socle.

### Ordre de pose (palier 3)

1. `omega/modules/reput/migrations/c3_03_accords_decisions_point.sql` (après 19af ; remplace la commande du
   cron reput-synchro par l'ouvrier de base ; pose reput-matin)
2. `omega/tests/reput/c3_03_accords.sql` → `^test_c3_03_`, puis 44, 46, 51, 55.

## Palier 4 — l'écran `/espace/reput`

`app/espace/reput/page.tsx`, `components/espace/reput/` (EcranReput, BaseConnaissances, SujetsAutorises,
portes, types, exemples). Trois onglets : **Demandes** (compteurs à valider / à traiter / répondues / reçues,
liste, la demande ouverte : message reçu, réponse préparée, ses sources dans la base, Valider et envoyer /
Corriger / Refuser avec motif), **Base de connaissances** (fiches par sujet, source, période, version ;
nouvelle fiche, corriger = nouvelle version, valider un brouillon, retirer avec motif), **Sujets autorisés**
(accord par sujet : autoriser, révoquer, activer seul ; réclamation, urgence, humain, autre « toujours relus,
par principe »). Exemple en mémoire ou base réelle (RLS + portes reput_*), temps réel sur reput_demandes,
reput_reponses, reput_connaissances.

Recette : `omega/recette-c3/recette_reput.mjs` (390 / 768 / 1024 / 1440 / 1700 : chargement, aucun
débordement, Corriger ouvre l'éditeur, Valider passe la demande en répondue, les deux autres onglets, console
propre hors /_vercel/insights) : **verte**. Captures 390 et 1440 dans `omega/recette-c3/captures/`.

**Hors de mon périmètre** : l'onglet de navigation (`components/espace/ecrans.ts`, coquille refaite par C1) —
à ajouter : `{ cle: "reput", href: "/espace/reput", libelle: "Demandes clients", court: "REPUT" }`.

## Palier 5 — `c3_05_accuse_avis_indicateurs.sql`

- **Accusé de réception** : réglages `accuse` (oui par défaut) et `texte_accuse`. Quand la réponse attend (à valider
  ou à traiter), l'ouvrier de base dépose dans la minute un accusé fixe (formules, texte, signature, mention), sur
  le canal de la demande, une seule fois. Il part seul avec l'accord « accuse » (`reput.accuser`), sinon il attend.
  En français seulement.
- **Relance d'un devis demandé** : au point du matin, chaque demande de devis sans réponse depuis plus de deux
  jours (« Devis demandé par X il y a N jours : toujours sans réponse, relancez votre équipe »).
- **Demandes d'avis** : `reput_avis`, porte `reput_programmer_avis` (serveur ou membre, après un règlement ; le
  lien https de la page d'avis est obligatoire dans les réglages) ; envoi à J+3 10 h (Paris), relances à J+7 et
  J+14 au plus, arrêt sur `reput_avis_recu` ; même adresse écartée pendant 183 jours. Message **non
  transactionnel** : les verrous du socle (consentement, heures) s'appliquent. Accord « avis » (`reput.avis`).
  Le règlement n'arrive pas encore tout seul : CASHD, FILED ou un module l'appellera (porte prête).
- **Indicateurs** : vues `reput_indicateurs` (jour, canal, sujet : reçues, répondues, parties seules, hors base,
  en attente, délai médian de première réponse) et `reput_volumes_heure`, security_invoker.
- Les accords acceptent `accuse` et `avis` (garde, `reput_accords`, 19af).
- Écran : onglet « Réglages et avis » (réglages, programmer une demande d'avis, liste, « Avis reçu ») ; ligne
  d'indicateurs sur 7 jours et délai de réponse par demande. tsc, eslint, build, recette 5 largeurs verts.

Ordre de pose : `c3_05_accuse_avis_indicateurs.sql` → test `omega/tests/reput/c3_05_accuse_avis.sql`
(après c3_02 et c3_03, dont il reprend les aides) → 44, 46, 51, 55.

## c3_06 — CASHD, litige, délais, client reconnu, récurrents, avis par site

- **Avis après règlement, sans saisie** : abonnement `cashd.facture_reglee` → `reput.avis_reglement` ; l'ouvrier
  de base programme la demande d'avis (courriel, sinon WhatsApp) si le client a coché `avis_auto_reglement` (faux
  par défaut) et posé son lien. Côté CASHD (C2, demandé le 06/10) : publier l'événement quand une facture passe
  soldée par lettrage, charge `{facture, numero, compte, entite, regle_le, email, telephone, nom}`.
- **Litige** : `private.reput_en_litige` appelle `private.cashd_contact_en_litige(client, adresse)` si C2 l'a
  posée (demandé), sinon faux. Contact en litige → `reput.transferer` (jamais d'envoi seul), alerte.
- **Délai et escalade** : `reput_sujets.delai_heures` (urgence 1 h, réclamation / humain 4 h, le reste 24 h),
  `reput_fixer_delai` (gérant, admin) ; l'ouvrier remonte une fois toute demande en attente au-delà du délai.
- **Client reconnu** : `reput_demandes.de_empreinte` ; `reput_commencer` rend `client_connu` (nombre, dernière
  date, sujets, sans texte) ; l'écran le montre.
- **Sujets récurrents** : point du matin, sujets hors base ≥ 2 fois sur 7 jours (« ajoutez une fiche »).
- **Avis par site** : vue `reput_avis_indicateurs` (entité, mois : programmés, demandés, relancés, reçus).
- Écran : client connu, litige, délai dépassé, pièces jointes conservées ; délai par sujet modifiable ; case
  « avis automatique après règlement ».

Test `omega/tests/reput/c3_06_cashd_escalade.sql` (27 ; souche 233/233). Il pose sa propre
`private.cashd_contact_en_litige` dans sa transaction (annulée) : indépendant de l'état de CASHD.

## c3_07 — un dossier sur deux canaux, le routage par service

- **Deux canaux, un dossier** : clés de contact par demande (SHA-256 du courriel en minuscules et des neuf derniers
  chiffres du téléphone ; un formulaire qui donne les deux porte les deux). Clé commune dans les sept jours → même
  `dossier_id`. Le dossier préparé joint les trois messages précédents (fonction Edge : bloc « messages précédents »,
  leurs nombres permis) ; la réponse part sur le canal du dernier message ; l'ouvrier annule les réponses plus
  anciennes encore en attente (file « annulee » par le serveur, envoi clos, demande « ignoree », regroupée avec…).
- **Routage** : `reput_router_sujet(p_client, p_sujet, p_equipe)` pose les règles de validation du socle (module
  reput, `reput.repondre.<sujet>` et `reput.transferer.<sujet>`, équipe) : seuls les membres de l'équipe décident.
  La file porte maintenant le sujet aussi pour le « à relire » (`reput.transferer.<sujet>`, toujours refusé aux
  accords par la garde). Le premier sujet concerné est celui que le modèle retient (consigne).
- **Correctif c3_05** : le message « demandes d'avis » s'appelle `demande_avis` (il masquait le sujet « avis »).
- Écran : « Un seul dossier · N messages », service qui décide par sujet.

Test `omega/tests/reput/c3_07_dossiers.sql` (20 ; souche 253/253) ; c3_03 ajusté (type de file `reput.transferer.tarifs`).
Fonction Edge : 12/12 Deno, **à redéployer** (precedents dans la question).

## c3_08 — les réponses de vos équipes nourrissent la base

Une demande hors base à laquelle une personne a répondu elle-même (Corriger) et dont la réponse est partie devient
une **fiche proposée** : brouillon de `reput_connaissances` (sujet de la demande, question du client, contenu = la
réponse écrite, source « Réponse de <courriel> du <date> »), au nom de la personne, une seule par réponse. Elle
n'entre dans la base qu'une fois validée (onglet Base de connaissances, « Brouillon à valider »). Ouvrier de base,
chaque minute. Test `omega/tests/reput/c3_08_fiches.sql` (11 ; souche 264/264). Aucun changement d'écran.

## Lignes de capacité (`lib/produits/capacites/accueil.ts`) : tenues et preuves

| Ligne | État | Preuve |
|---|---|---|
| La base est versionnée : chaque règle porte sa date et son auteur. | **tenue côté base** (palier 1) | c3_01 : version 2, `remplace_id`, `cree_par`, `valide_par`, `valide_le`, journal |
| Une modification de tarif ou d'horaire s'applique à la réponse suivante. | base : tenue (la version corrigée remplace aussitôt la précédente dans `reput_base`) ; réponse : palier 2 | c3_01 « la réponse suivante la cite » |
| Le ton, la signature et les formules se règlent entité par entité. | réglages : tenus ; usage dans la réponse : palier 2 | c3_01 « Lyon signe de sa propre signature » |
| La réponse est tirée de la base de connaissances construite avec vos équipes. | **tenue** (palier 2, à prouver sur la recette) | consigne + contrôles (sources = fiches en vigueur, chiffres sourcés) ; Deno « un prix inventé fait hors base » ; c3_02 « sources … non couverte » |
| Hors de cette base, le système ne formule aucune hypothèse et transfère. | **tenue** (palier 2) | type `reput.transferer` jamais en envoi seul, alerte ; c3_02 « Hors de la base » |
| Chaque demande est classée par type avant d'entrer dans un circuit. | **tenue** (palier 2) | sujet parmi ceux du client, « autre » sinon ; c3_02 « sujet inconnu devient autre » |
| L'urgence est détectée sur le fond du message, pas sur la présence d'un mot. | **tenue côté file** : alerte critique (l'appel d'astreinte : palier 5) | consigne ; c3_02 « Urgence : alerte critique » |
| La langue du client est identifiée dès le premier message. | **tenue** | `langue` de la réponse et de l'envoi ; c3_02 « La langue de la demande est gardée » |
| Les réponses se font en plusieurs langues, avec le même périmètre de contenu. | **tenue** | réglage `langues` ; hors liste → transférée ; c3_02 anglais / allemand |
| La mention d'une réponse automatisée figure dans les termes que vous choisissez. | **tenue** | réglage `mention_automatisee` ajouté au message ; c3_02 « mention choisies » |
| Une réclamation est identifiée comme telle et sort du traitement courant. | **tenue** | sujet `reclamation` protégé, alerte ; c3_02 |
| La demande de parler à une personne est honorée sans discussion. | **tenue côté file** (sujet `humain` protégé, alerte) | c3_02 (alerte) |
| Un accusé de réception part dans la minute, sous votre signature. | **tenue** (c3_05) | c3_05 « accusé déposé… avec le texte et la signature », « avec l'accord, part seul » |
| La demande d'avis part dans les trois jours qui suivent le règlement, relancée deux fois au maximum, pas la même personne avant six mois (accueil.ts, carte Avis). | **tenue** (c3_05), règlement déclaré par porte | c3_05 « une demande et deux relances au plus », « ne sollicite pas deux fois » |
| Le délai de première réponse est mesuré, demande par demande. | **tenue** | `reput_demandes.envoyee_le - recu_le`, vue `reput_indicateurs` ; écran |
| Le volume de demandes se lit par canal, par service et par heure de la journée. | **tenue** (canal, sujet, heure ; par service = entité) | vues `reput_indicateurs`, `reput_volumes_heure` |
| La part des demandes traitées sans intervention humaine est suivie dans le temps. | **tenue** | `parties_seules` par jour |
| Un client en litige ouvert ne reçoit aucune réponse automatisée. | **tenue** (c3_06, avec la fonction de C2) | c3_06 « en litige : toujours relue » |
| Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse. | **tenue** (historique des demandes ; le contrat et les interventions restent hors REPUT) | c3_06 « client reconnu » |
| Chaque type de demande porte un délai de traitement que vous fixez. / Le délai dépassé fait remonter la demande au responsable du service. | **tenues** | c3_06 « délai de 2 h dépassé : la demande remonte » |
| Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. | **tenue** | c3_06 point du matin ; c3_08 fiche proposée depuis la réponse d'une personne |
| Les avis obtenus après intervention sont comptés par service et par site. | **tenue** | vue reput_avis_indicateurs |
| Les pièces jointes sont conservées et rattachées à la demande. | **tenue** (A2 les dépose ; l'écran les montre) | écran |
| Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | **tenue à la demande** (CSV « ; », UTF-8, depuis l'écran) ; à date fixe : non | écran « Exporter vers un tableur » |
| Une même demande reçue sur deux canaux est reconnue comme un seul dossier (une réponse, sur le dernier canal). | **tenue** (c3_07 ; rapprochement par courriel / téléphone connus) | c3_07 « WhatsApp rejoint le dossier du formulaire », « une réponse, pas deux » |
| Chaque demande est aiguillée selon sa catégorie ; une demande qui relève de deux services va au premier concerné. | **tenue** (sujet → équipe du socle) | c3_07 « un valideur hors de l'équipe ne décide pas » |
| Une demande hors périmètre est transférée avec la fiche de son escalade. | **tenue** | alerte au client portant la demande ; c3_02 |
| Chaque échange reste archivé, transféré ou non, et reste consultable. | **tenue** | `reput_demandes` + `reput_reponses` (versions), RLS ; c3_02 « Le gérant lit » |

## Questions au coordinateur

1. `private.envois_suivre_demande` (déclencheur AFTER UPDATE OF statut sur `demandes_validation`) : je
   compte déposer pour chaque réponse **ma** demande de validation (`type_action = 'reput.repondre.<sujet>'`,
   objet `reput_reponses`) puis l'envoi par `preparer_envoi(…, p_options => {"demande": <id>})` (envoi
   **adossé**). Couverte par une politique du sujet, la demande naît approuvée et l'envoi part (verrous du
   socle compris) ; sinon l'envoi reste `a_valider` et suit la décision. Le déclencheur valide-t-il bien un
   envoi adossé quand sa demande passe `approuvee`, et l'annule-t-il quand elle passe `rejetee` ? Sa source
   m'aiderait (absente des extraits).
2. `private.politique_couvrante` : sa source aussi (le libellé du type d'action est-il comparé tel quel ?).

## Journal de session

- 06/10, ~22 h Z : C2 a posé son côté (worker-c2 ef9bc7d : événement cashd.facture_reglee ; 8b8fbb4 :
  private.cashd_contact_en_litige, litige de compte, de facture ou contestation partielle). Charge et signature
  conformes à c3_06 ; rien à changer chez REPUT. Facture soldée par disparition de l'export : non publiée (pas de
  date de règlement sûre), décision C3.

- 06/10, ~21 h 45 Z : c3_05 posé et vert (coordinateur). c3_06 écrit (CASHD, litige, délais, client reconnu,
  récurrents, avis par site) ; souche 233/233 ; recette 5 largeurs verte. Demandes envoyées à C2.

- 06/10, ~21 h Z : c3_02/c3_03 v2 et c3_04 posés et verts (coordinateur) ; écran fusionné dans main e197172.
  Palier 5 écrit (c3_05 + onglet Réglages et avis) ; souche 206/206 ; recette 5 largeurs verte.

- 06/10, ~20 h Z : retour du coordinateur — c3_01 posé et vert ; c3_02, c3_03, banc_reput posés, reput-reponse
  déployé (v1, fumée 200, ia_branchee true), cron omega-reput actif. Tests c3_02/c3_03 morts sur
  « envoye réservé à l'ouvrier d'envoi » (garder_envoi) : la remise passe désormais par la voie du socle
  (tests.c3_remettre : commencer_envoi puis confirmer_envoi, comme 19ab). Souche 175/175. Lot socle
  c3_04_socle_consommation_ia.sql (reput.preparer compté dans le plafond IA du jour) écrit pour le coordinateur.

- 06/10, ~19 h 40 Z : palier 4 (écran) écrit ; tsc, eslint, build verts ; recette 5 largeurs verte.

- 06/10, ~18 h 50 Z : palier 3 écrit (c3_03) ; souche 173/173.

- 06/10, ~18 h 15 Z : palier 2 écrit (c3_02 + fonction Edge reput-reponse) ; souche 127/127, Deno 11/11.

- 06/10, ~17 h 30 Z : lecture (AUDIT-PROMESSES, CONTRAT-OUVRIER, extraits du socle, Daliro b6_06/b6_08,
  tests A5 44/46/51). Palier 1 écrit, souche locale montée, 66/66.
