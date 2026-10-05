# Session B3 — TIROMA (cabinets dentaires : praticiens, fauteuils, horaires, rendez-vous, point du matin)

Branche `worker-b3`. Coordinateur : session `session_01B4JNQXyT69GytdvE9SjAnE`.
Dernière mise à jour : 05/10/2026, soir (lecture du socle, scénario écrit, rien de posé encore).

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce que le scénario demande, prouvé par pgTAP sur la recette) | **15 %** — le socle TIROMA existe (23 tables, 92 fonctions, 3 crons) et sait appliquer un relevé, mesurer, purger ; rien n'est encore joué en réel, et trois trous sont déjà visibles à la lecture (ci-dessous). | Les portes publiques exécutables par un titulaire ; une porte de dépôt de relevé jouable en test ; le point du matin TIROMA (sections) ; les créneaux à sauver ; les vérifications à J-2 ; les tests verts. |
| **Livrable client** (un cabinet installe, branche, reçoit son point du matin, ouvre /espace/tiroma) | **5 %** — la promesse est écrite sur /secteurs/dentaire, l'écran n'existe pas, aucun connecteur Logos_w n'a jamais livré d'export réel. | L'écran /espace/tiroma (exemple + base réelle) ; l'envoi du point du matin dans un canal permis pour la santé ; un vrai export Logos_w d'un vrai cabinet (Teo). |

### Ce que Teo (le patron) doit fournir lui-même

1. Un export Logos_w réel (ou le gabarit d'export du logiciel du premier cabinet) : le socle ne lit « pour l'instant que Logos_w » (`private.tiroma_brancher_cabinet`) et `modeles_jeux` ne se devine pas.
2. Le canal de remise du point du matin **permis pour la santé** : aucun prestataire d'envoi n'est certifié HDS ; tant qu'il n'y en a pas, le point du matin TIROMA ne sortira d'Omega que **sans donnée de santé** (compteurs, liens vers l'espace) — le contenu nominatif reste derrière l'authentification de /espace/tiroma. Décision à prendre par Teo : ce repli convient-il, ou faut-il un canal HDS avant la première mise en route ?
3. Le territoire des cabinets de recette (code ISO sur l'entité, jours fériés de droit local « complets ») : `tiroma_installer_cabinet` refuse une entité sans territoire ou sans calendrier complet.

## Le scénario réel de bout en bout (ce que les tests jouent)

Un cabinet de trois fauteuils, un titulaire (le gérant de l'organisation), un
collaborateur, une assistante ; le logiciel Logos_w. Sur la recette : le client
du banc `cccccccc-0000-4000-8000-00000000000c`, les comptes `gerant`
(titulaire), `daf` (collaborateur), `referent` (assistante), `daf2` (témoin :
valideur sans profil TIROMA). Tout passe par les portes publiques ou par les
écritures sous RLS que le socle prévoit (fauteuils, horaires, fermetures,
membres, profils, règles, vocabulaire) ; jamais d'écriture directe hors RLS.

1. **Installation.** Le titulaire appelle `tiroma_installer_cabinet(client, entité, 'logosw', 'cabinet')` : ligne `tiroma_cabinets` (statut `installation`, mode `a_blanc`) + `tiroma_regles` par défaut. Refusé si l'entité n'a pas de territoire ou de fuseau cohérent. Le témoin `daf2` ne peut pas l'appeler.
2. **Profils.** Le gérant se donne `titulaire`, donne `collaborateur` à `daf` (relié à un praticien), `assistante` à `referent` (reliée à un membre). Le déclencheur refuse un titulaire qui n'est pas gérant et une direction qui n'est ni gérante ni admin ; les droits `tiroma.voir_*` suivent.
3. **Fauteuils.** Trois fauteuils (soins ; prothèse + chirurgie ; orthodontie) posés par le titulaire (INSERT sous RLS) ; l'assistante ne peut pas en poser, mais les voit.
4. **Horaires.** Lundi–vendredi 8 h–12 h et 14 h–19 h, samedi 8 h–12 h, un horaire exceptionnel un jour donné ; `private.tiroma_ouvert` rend les plages, vide un jour férié du territoire.
5. **Fermetures.** Congé d'un praticien, fermeture du cabinet ; la plage ouverte se réduit d'autant.
6. **Branchement.** `tiroma_brancher_cabinet(client, entité, 'exports')` : branchement + jeux (types_rdv, patients, agenda, devis, devis_lignes, actes, labo, stock, odf, attente), cabinet `actif`, journal `tiroma.connecteur_active`. Refusé sur un cabinet clos.
7. **Premier relevé (reprise initiale).** Un export Logos_w d'exemple déposé par la porte du socle, puis `tiroma_traiter_travaux()` : `tiroma_releves` `ok`, patients, praticiens, fauteuils et types créés, rendez-vous de la semaine, devis signés et leurs lignes, actes, fiche de laboratoire, implant en stock, entente ODF, liste d'attente ; aucun événement d'agenda (c'est une reprise). Types classés par règle (« Couronne — pose » → `prothese_pose`, labo requis).
8. **Vocabulaire.** Le titulaire valide un type à classer (UPDATE sous RLS) : `valide_par`, `valide_le`, `classe_par = 'humain'` posés par le déclencheur.
9. **Relevé courant avec annulation.** Un rendez-vous de demain disparaît : événement `annulation` (immuable), rendez-vous `supprime`. **Créneau à sauver** : les candidats dans l'ordre des règles (plan signé de la même famille → liste d'attente → contrôle dû), durée et préférences tenues.
10. **Relevé avec rendez-vous honoré / manqué.** Statuts du logiciel → événements `honore` / `absence` ; actes du jour sans statut → `presume_honore` ; faits patients remis (dernier rendez-vous, prochain, dernier contrôle).
11. **Garde-fou.** Un relevé qui vide une journée entière : relevé `douteux`, journal `tiroma.releve_douteux`, `releves_douteux_suite` = 1, aucun battement ; le suivant repart à 0.
12. **Plans sans rendez-vous.** Devis signé il y a six semaines, aucune ligne planifiée : il remonte, du plus ancien au plus récent ; quand un rendez-vous de la bonne famille arrive, `tiroma_rattacher_plans` le lie et la ligne passe `planifie`.
13. **Avant les rendez-vous (J-2).** Pose de prothèse dans deux jours sans retour du laboratoire ; chirurgie d'implant dont la référence manque au stock ; devis qui expire dans 30 jours ; accord de mutuelle sans rendez-vous ; accord ODF de plus de six mois sans début.
14. **Point du matin à 7 h.** La section TIROMA (trois décisions du jour : créneaux à sauver, plans sans rendez-vous, vérifications J-2) est déposée pour le titulaire et l'assistante, marquée `sante`. `apercu_point` / `lire_point` la rendent. L'envoi passe par `preparer_envoi(..., p_donnees_sante => true)` : seul un canal `permis_sante` la porte ; sinon le point sort **sans données de santé** (compteurs + lien) — jamais de nom de patient dans un courriel Brevo.
15. **Mesures du soir.** `tiroma_horloge` après 23 h 30 : occupation réalisée par fauteuil, reprise à 48 h, production, délai labo, patients sans contrôle, réinscription, acceptation des devis ; enregistrées en mode `a_blanc` ; visibles du titulaire, jamais par personne.
16. **Mode réel.** `tiroma_changer_mode(..., 'reel')` par le titulaire ; refusé à l'assistante ; `mode_depuis` posé.
17. **Journal opposable.** Chaque étape laisse sa ligne (`connecteur_active`, `releve_termine`, `releve_douteux`, `indicateurs_calcules`), écrite par `private.journaliser` seulement, lisible par le gérant, pas par le collaborateur, jamais modifiable.
18. **Isolement.** Un gérant d'un autre client ne voit rien ; l'assistante ne lit ni règles ni relevés ; un collaborateur en périmètre `praticien` ne voit que ses patients et sa production ; la production du cabinet est au titulaire seul.
19. **Relevé en retard.** L'export du matin n'arrive pas : alerte `attention` « Tiroma n'a pas reçu l'export … » ; elle se ferme quand l'export arrive.
20. **Fermeture et conservation.** Le titulaire coupe puis clôt son cabinet ; `tiroma_purger` retire les objets au-delà de la durée de conservation et le journal le dit.

## Trous du socle déjà vus à la lecture (à confirmer par les faits)

1. **Les trois portes publiques ne sont pas exécutables par un titulaire.** `public.tiroma_installer_cabinet`, `tiroma_brancher_cabinet`, `tiroma_changer_mode` sont des `language sql` SECURITY INVOKER qui appellent `private.tiroma_*` ; or `private.tiroma_installer_cabinet` et ses sœurs ne sont pas dans la liste figée d'a5_01 (`omega/a5_01_liste_figee.txt`) → « permission denied for function ». Et elles ne vérifient **aucun droit** (n'importe quel compte ayant EXECUTE pourrait installer un cabinet chez autrui). → `b3_01` : portes SECURITY DEFINER qui exigent `private.a_un_role(p_client, '{gerant}')` et `private.voit_entite` (installer, brancher) ou `private.tiroma_est_titulaire` (changer le mode).
2. **Aucune porte de lecture « métier »** : créneaux à sauver avec candidats, plans sans rendez-vous, charge des fauteuils, vérifications J-2. L'écran ne doit pas recalculer la promesse en TypeScript. → `b3_02…` : `tiroma_creneaux_a_sauver`, `tiroma_plans_sans_rendez_vous`, `tiroma_charge_fauteuils`, `tiroma_avant_rendez_vous`.
3. **Aucun dépôt de section du point du matin** par TIROMA (TAVARO et LORANI ont leur `*_deposer_point*` et leur cron) ; aucun gabarit `tiroma.*`. → `b3_0N` : `private.tiroma_deposer_points` + gabarits + cron, section `sante = true`.
4. **La liste d'attente et les créneaux à sauver** ne s'alimentent que par le logiciel (`source = 'logiciel'`) : `tiroma_liste_attente.source` admet `tiroma` mais aucune porte n'y écrit (« Une liste d'attente commune » promise au Groupe).

## Demandes au coordinateur (faits et extraits)

Envoyées le 05/10 au soir — voir le journal des échanges en bas.

## Journal des échanges avec le coordinateur

- 05/10, soir — scénario envoyé en 15 lignes + demande d'extraits du socle commun (branchements, relevés, instantanés, point du matin, envois / santé) et de faits (droits sur les trois portes, entités du banc, territoires, modèles de jeux Logos_w, comptes).
