# Inventaire avant refonte — LORANI (`/espace2/lorani`)

Relevé du 29/10/2026 sur la copie `refonte-metiers` (HEAD 45c3aa89, avec `components/espace2/aiguillage.ts` et
`outils/verifier-aiguillage.mjs` non commités). Lecture seule : aucun fichier touché à part celui-ci.

**Contrat** : tout ce qui est listé ici (entrée, bloc, fenêtre, geste, état, promesse) doit encore exister après le
découpage en sous-pages, à un endroit atteignable.

**Chemins** : relatifs à la racine de la copie. Abréviations :
- `L/` = `components/espace/lorani/` ;
- `M/` = `omega/modules/lorani/migrations/` ;
- `S/` = `omega/SOCLE-EXTRAITS-LORANI.sql` (le socle photographié, dont les fonctions appellent les liens de b5_02) ;
- `CH#n` = ligne n du tableau de `omega/CHIFFRAGE/lorani.md`.

**Point de départ** : `app/espace2/lorani/page.tsx:12-18` rend `<Habille><EcranLorani /></Habille>`. L'ancienne page
`app/espace/lorani/page.tsx:18-20` rend le même composant. `proxy.ts:56-61` redirige tout `/espace/…` vers `/espace2/…`
(307, requête conservée), sauf `?ancien=1` ou le témoin `espace_ancien`.

---

## 1. Entrées

### 1.1 Liens écrits en base ou dans un courriel

Les liens sont fabriqués par deux fonctions de `M/b5_02_liens_espace.sql` :
- `private.lorani_lien_permis(p)` → `'/espace/lorani?permis=' || p` (`M/b5_02_liens_espace.sql:10-13`) ;
- `private.lorani_lien_projet(p)` → `'/espace/lorani?projet=' || p` (`:15-18`).

Les alertes passent par `private.lever_alerte_module(client, 'lorani', niveau, titre, detail jsonb, cle, …,
destinataire)`. Cette fonction ne prend **pas** d'`objet_type`. L'objet est porté par les clés du jsonb `detail`.

Seules les lignes du point du matin (`S/`) et l'envoi du courriel (b5_03) posent un `objet_type`. C'est toujours
`'lorani_projet'` (au singulier), avec `objet_id` = l'id du projet.

Sens de la colonne « Atterrissage voulu » : le bloc où se traite le point (numéros de la section 2).

Comportement actuel : `?permis=` ouvre le permis. `?projet=` ouvre le **premier permis visible** du projet
(`L/EcranLorani.tsx:177-188`). Il ne montre le projet seul que si celui-ci n'a pas de permis. Le bloc visé se trouve
alors plus bas, dans le dossier du projet. Aucune ancre ne permet de descendre jusqu'à lui.

| # | Fichier SQL:ligne (fonction) | Forme du lien | objet_type / objet_id | Ce que désigne l'objet (clés du detail) | Gabarit du titre ou sujet | Atterrissage voulu |
|---|---|---|---|---|---|---|
| E1 | `S/:999-1003` (`private.lorani_ligne_du_point`, appelée par `lorani_deposer_point` `S/:762`) | `lorani_lien_permis(p.id)` | `lorani_projet` / projet | permis ; ligne du **point du matin**, section « Calendrier des permis » | « %titre : une date lue / n dates lues sur les courriers de la mairie, à confirmer ou à écarter. » | B10 (Lu sur les courriers) du permis |
| E2 | `S/:1067-1070` (même fonction) | `lorani_lien_permis(p.id)` | `lorani_projet` / projet | permis, selon son état : décision implicite, pièces demandées, affichage, purge proche, recours en cours, décision attendue, purgé | 7 gabarits `S/:1013-1063` (« … à confirmer, ou saisir la décision reçue », « pièces manquantes … au plus tard le », « affichage du permis … en retard », « purgé à l'issue du », « un recours est en cours », « décision de la mairie attendue au plus tard le », « purgé depuis le ») | B9, B11 (bouton correspondant), B7 (bandeau), B16 |
| E3 | `M/b5_02_liens_espace.sql:51-54` (`lorani_alerter_transition`) | `lorani_lien_permis` | — | `projet`, `permis`, `etat`, `motif`, `date_purge` | « %titre : permis tacite né / rejet implicite … le JJ/MM/AAAA si aucune décision ne vous a été notifiée. Confirmez-le, ou saisissez la décision reçue. » ; « %titre : purgé à l'issue du … Chantier sans ce risque dès le … » | B9 (décision implicite) ; B7 (purge) |
| E4 | `M/b5_02_liens_espace.sql:99-103` (`lorani_lire_piece`) | `lorani_lien_projet` | — | `projet`, `piece` | « « %projet » : arrêté de sursis à statuer reçu. Le calendrier ne le calcule pas : à voir avec votre conseil. » | B17 (courrier listé). **Aucun bloc ne traite le sursis.** |
| E5 | `M/b5_02_liens_espace.sql:154-168` (`lorani_lire_piece`) | `coalesce(lien_permis(v_permis), lien_projet(projet))` | — | `projet`, `permis` (peut être nul), `piece`, `proposition` (id de la date lue) | « « %projet » : date de dépôt / délai d'instruction notifié / demande de pièces / décision de la mairie / permis tacite / premier jour d'affichage lu(e) sur %pièce, à confirmer. » | B10, puis F7 (« Permis à choisir » quand le permis est nul) |
| E6 | `M/b5_03_rappels_envoyes.sql:54-57` (`lorani_alerter_rappel`) | `lorani_lien_permis` | — | `projet`, `permis`, `nature` (pieces / instruction / affichage), `echeance`, `rappel` (J-n) | « %titre : pièces manquantes à faire recevoir … au plus tard le … sinon rejet tacite. » ; « … décision de la mairie attendue au plus tard le … » ; « … affichage sur le terrain non saisi quinze jours après la décision … » | B15 (échéances), puis B11 (« Pièces reçues par la mairie », « Permis affiché sur le terrain », « Arrêté reçu ») |
| E7 | `M/b5_03_rappels_envoyes.sql:62-69` (courriel `private.preparer_envoi`, canal `email`) | **URL absolue** : `coalesce(lire_parametre('espace_url'), 'https://app.omegaai.fr/espace') || '/lorani?permis=' || p.id`. N'utilise **pas** `lorani_lien_permis`. | `lorani_projet` / projet (arguments 3 et 4 de `preparer_envoi`) | permis ; destinataire = chef de projet | Sujet : « Omega — » + titre de E6. Corps : 3 gabarits `:33`, `:41`, `:48`, puis « Ouvrir le dossier : … » | B15 / B11 du permis |
| E8 | `components/espace2/DetailDemande.tsx:375` (« À valider » : la demande d'envoi de E7, qui passe par la file de validation `M/b5_03_rappels_envoyes.sql:7`) | calculé par `aiguiller({module, objet_type, objet_id})` | `lorani_projet` / projet | le courriel de rappel à valider | Résumé de la demande d'envoi | Aujourd'hui : **`/espace2/lorani` nu**, car `aiguillage.ts:63-99` n'a pas de règle `lorani_projet` et la demande n'a pas de lien. Atterrissage voulu : le permis de E7 |
| E9 | `M/b5_10_jurisprudence_seconde_demande.sql:82-86` (`lorani_suivre_demandes_pieces`, trigger ; version en vigueur) | `lorani_lien_permis` | — | `projet`, `permis`, `demandes_pieces`, `detail` (texte long avec CE 30/04/2024) | « %permis : 2e demande de pièces du …, sans effet sur les délais (CE 30 avril 2024, n° 461958) ; délai depuis la lettre du … À fournir : … » ; ou « … reçue après la remise des pièces … » | B13 (avis « Plusieurs demandes de pièces »), B7 |
| E10 | `M/b5_11_courriels_guichet.sql:94-100` (`lorani_rattacher_reception`) | **`'/espace/lorani'` sans paramètre** | — | `reception` (id du courriel reçu), `de`, `numeros` | « Courriel du guichet à ranger : « %sujet » (il cite plusieurs dossiers / numéro X sans permis connu / aucun numéro de dossier). » | **Aucun bloc** : l'écran n'a ni liste ni geste pour ranger un courriel du guichet |
| E11 | `M/b5_11_courriels_guichet.sql:133-137` (même fonction) | `lorani_lien_projet` | — | `projet`, `reception`, `de` | « « %projet » (%permis) : courriel du guichet sans pièce jointe, à lire : « %sujet ». » | Aucun bloc (le corps du courriel n'est montré nulle part) ; à défaut B17 |
| E12 | `M/b5_12_honoraires_phases.sql:231-242` (`lorani_temps_surveiller`) | `lorani_lien_projet` | — | `projet`, `element` (id honoraire), `heures`, `heures_prevues`, `montant_ht`, `seuil` 80/100 | « « %projet » : %élément a consommé X h sur Y h prévues (Z %), avant la fin de la phase. » ; « … Les honoraires de la phase sont dépassés … » | B27 (Honoraires) |
| E13 | `M/b5_12_honoraires_phases.sql:259-265` (`lorani_honoraires_achever`) | `lorani_lien_projet` | — | `projet`, `element`, `montant_ht` | « « %projet » : élément « … » achevé le … Appel d'honoraires à émettre : … € HT. » | B27 (bouton « Facturé ») |
| E14 | `M/b5_13_situations_visas.sql:247-252` (`lorani_situations_controler`) | `lorani_lien_projet` | — | `projet`, `situation`, `marche`, `a_viser_avant` | « %entreprise reçue : X HT cumulés, Y ce mois. À viser avant le … » | B28 (situation à viser) |
| E15 | `M/b5_13_situations_visas.sql:255-260` (même fonction) | `lorani_lien_projet` | — | `situation`, `marche`, `ecart` | « … le cumul (X HT) dépasse le marché et ses avenants (Y HT) de Z. » | B28 (Rectifier) |
| E16 | `M/b5_13_situations_visas.sql:263-268` (même fonction) | `lorani_lien_projet` | — | `situation`, `marche`, `precedent` | « … le cumul … est inférieur à celui de la situation précédente … » | B28 |
| E17 | `M/b5_13_situations_visas.sql:324-330` (`lorani_visas_controler`) | `lorani_lien_projet` | — | `visa`, `a_viser_avant`, `commande_le` | « « %projet » : visa urgent, %document (indice X) à viser avant le …, l'ouvrage se commande le … » | B28 (tableau des visas, « Rendre l'avis ») |
| E18 | `M/b5_14_situation_lue.sql:134-138` (`lorani_poser_situation_lue`) | `lorani_lien_projet` | — | `projet`, `piece`, `valeurs` lues | « « %projet » : situation de travaux lue (%fichier), à ranger : marché non reconnu / cumul illisible — titulaire lu « … ». » | **Aucun geste** pour rattacher la pièce ; B28 « Situation reçue » (saisie à la main). La pièce apparaît dans B17 sous le libellé « Courrier », car le type `lorani_situation_travaux` n'est pas dans `L/etats.ts:166-183` |
| E19 | `M/b5_14_situation_lue.sql:153-157` (même fonction) | `lorani_lien_projet` | — | `piece`, `marche`, `numero` | « … situation n° X de %titulaire lue (%fichier), mais ce numéro est déjà reçu : à vérifier. » | B28 |
| E20 | `M/b5_15_echeance_visas.sql:114-124` (`lorani_visa_rappeler`, travail du registre) | `lorani_lien_projet` | — | `visa`, `delai`, `echeance` | « « %projet » : visa à rendre avant le … (dans n jours), %document (indice X). » ; « … visa en retard … devait être rendu le … » | B28 (visas) |
| E21 | `M/b5_16b_reprise_controle.sql:259-266` (`lorani_controler`, version en vigueur) | `lorani_lien_projet` | — | `controle`, `constats`, `bloquants`, `corriges` | « « %projet » : contrôle « %intitulé » (indice X) passé, n constats ouverts dont m bloquants ; k corrigés depuis l'indice précédent. » | B25 (Contrôle du dossier, sur ce contrôle-là). **Le sélecteur ne lit pas d'id de contrôle dans l'URL.** |
| E22 | `M/b5_17_plu_adresse.sql:277-282` (`lorani_plu_poser`) | `lorani_lien_projet` | — | `zone`, `document`, `reglement` | « « %projet » : zone X (et n autres) du %document, règlement en ligne. » | B23 (Règles d'urbanisme) |
| E23 | `M/b5_17_plu_adresse.sql:294-296` (même fonction) | `lorani_lien_projet` | — | `statut` (introuvable / erreur) | « « %projet » : PLU non trouvé — %erreur » | B23 (« Chercher à nouveau ») |
| E24 | `M/b5_18_decennales.sql:299-305` (`lorani_attestation_signaler`, trigger) | `lorani_lien_projet` | — | `attestation`, `constats` | « « %projet » : décennale de %entreprise non conforme / échue — %constat » | B33 (« Corriger ») |
| E25 | `M/b5_18_decennales.sql:449-456` (`lorani_attestation_rappeler`) | `lorani_lien_projet` | — | `attestation`, `fin` | « … la décennale de %entreprise expire le … (dans n jours) ; demandez la nouvelle attestation. » ; « … est échue depuis le … » | B33 |
| E26 | `M/b5_19_os_reserves_gpa.sql:239-244` (`lorani_os_relire`) | `lorani_lien_projet` | — | `marche`, `os`, `part_pct`, `montant_a_date` | « « %projet » : OS cumulés sur %titulaire, ±X % du marché initial (… € HT à date) : au-delà de 15 %, la modification est à examiner (CCP, art. R2194-8) / un avenant est à envisager. » | B30 (Ordres de service) |
| E27 | `M/b5_19_os_reserves_gpa.sql:248-254` (même fonction) | `lorani_lien_projet` | — | `marche`, `os`, `fin_contractuelle` | « « %projet » : OS n° X (%titulaire), arrêt de chantier / reprise / ±n jours sur le délai ; fin contractuelle le … » | B30 |
| E28 | `M/b5_20_comptes_rendus.sql:392-400` (`lorani_chantier_rappeler`, version en vigueur) | `lorani_lien_projet` | — | `point` | « « %projet » : question sans réponse / action non faite (%entreprise) attendue le … — %texte » | B29 (le point, dans « En suspens » d'un CR). Voir l'observation O6 : le point peut n'être visible nulle part |
| E29 | `M/b5_20_comptes_rendus.sql:411-418` (même fonction) | `lorani_lien_projet` | — | `reserve` | « « %projet » : réserve n° X (lot Y) à lever avant le … / non levée au … — %intitulé » | B31 (la réserve) |
| E30 | `M/b5_20_comptes_rendus.sql:431-440` (même fonction) | `lorani_lien_projet` | — | `reception_le`, `reserves_ouvertes` | « « %projet » : fin de la garantie de parfait achèvement le … ; toutes les réserves sont levées … / n réserves non levées … retenue de garantie à conserver … » | B31 (avis GPA) |
| E31 | `M/b5_21_conformite_doe.sql:331-336` (`lorani_doe_a_la_reception`) | `lorani_lien_projet` | — | `lot`, `manquantes` | « « %projet » : DOE incomplet à la réception — lot X (%entreprise) : n pièces manquantes (…). » | B32 (DOE) |

**Versions remplacées** : elles écrivent encore un lien dans leur fichier, mais une migration plus récente redéfinit
la même fonction (`create or replace`).

| Fichier:ligne | Fonction | Remplacée par |
|---|---|---|
| `M/b5_07_seconde_demande_pieces.sql:130-134` | `lorani_suivre_demandes_pieces` | b5_08:68-72, puis b5_10:82-86 (E9) |
| `M/b5_08_titre_alerte_seconde_demande.sql:68-72` | idem | b5_10 (E9) |
| `M/b5_16_controle_dossier.sql:522-529` | `lorani_controler` | b5_16b:259-266 (E21) |
| `M/b5_19_os_reserves_gpa.sql:445-452` (réserve) et `:465-474` (GPA) | `lorani_chantier_rappeler` | b5_20:367 et suivantes (E29, E30) |

**Liens morts dans le socle photographié** : `/secteurs/architectes/permis` (`S/:360`, `:400`, `:969`, `:1120`,
`:1185`). Ils ont été corrigés par b5_02 et b5_03 (`M/b5_02_liens_espace.sql:1-8`).

**Écritures sans lien** : `private.journaliser_module(…, 'lorani_projet', projet_id, …)` (par exemple
`M/b5_12_honoraires_phases.sql:266`, `M/b5_16b_reprise_controle.sql:267`, `M/b5_17_plu_adresse.sql:283`,
`M/b5_18_decennales.sql:295`). Ce sont des entrées de journal, sans `lien`.

### 1.2 Paramètres d'adresse lus par l'écran

| Paramètre | Lu où | Effet |
|---|---|---|
| `?permis=<uuid>` | `L/EcranLorani.tsx:103-106` | `setChoix(permis)`. Il n'est pris que si ce permis figure dans `visibles` (`:184`), sinon c'est le premier de la liste. Un permis au-delà des 600 lus (`L/portes.ts:69`) ou caché par un filtre n'est pas ouvert. |
| `?projet=<uuid>` | `L/EcranLorani.tsx:105-107` | `setChoix('projet:'+id)`. Ouvre le premier permis visible du projet (`:178-181`), sinon la carte du projet seule (`:182`). |
| hash `#…` | — | **Pas lu.** Aucune ancre par bloc. Le seul `id` est `esp-detail` (`:419`), utilisé pour défiler sur mobile (`:194`). |
| `?objet=<type>:<id>` | — | **Pas lu.** Le contrat de `components/espace2/aiguillage.ts:18-20` (« la page racine accepte ?objet= ») n'est pas tenu par Lorani. |
| `?ancien=1` / `?ancien=0` | `proxy.ts:57-67` | Garde ou quitte l'ancien design (`/espace/lorani`). |

L'URL n'est jamais **écrite** par l'écran : choisir un permis ne change pas l'adresse (`L/EcranLorani.tsx:192-195`).

### 1.3 Autres écrans et code qui mènent ici

| Fichier:ligne | Nature |
|---|---|
| `components/espace2/modules.ts:99` | Entrée de navigation « LORANI — Permis » (espace 2, sans sous-pages déclarées) |
| `components/espace2/modules.ts:124` | `moduleMetier` : secteur `archi` → `lorani` (module métier affiché dans la barre) |
| `components/espace/ecrans.ts:11` | Navigation de l'ancien espace : `/espace/lorani`, « Permis » |
| `components/espace2/aiguillage.ts:77-79` | Règles `lorani_permis` → `/espace2/lorani?permis=`, `lorani_projets` → `?projet=`. Aucune règle pour `lorani_projet` (singulier), l'objet_type réellement écrit (E1, E2, E7, E8) |
| `components/espace2/aiguillage.ts:106-111` | `/espace/lorani…` → `/espace2/lorani…` (lien des lignes E1, E2) |
| `components/espace2/Point.tsx:50` et `:250-259` | Point du matin de l'espace 2 : bouton qui suit `aiguiller(ligne)` (E1, E2) |
| `components/espace/point/PointDuMatin.tsx:243-246` | Point du matin de l'ancien espace : `<Link href={l.lien}>` (E1, E2) |
| `components/espace2/DetailDemande.tsx:375` | Demande à valider → page de l'objet (E8) |
| `proxy.ts:56-61` | Redirection 307 `/espace/lorani?…` → `/espace2/lorani?…` (E3 à E31, E7) |
| `outils/verifier-aiguillage.mjs:54-55` | Vérificateur : il compte `lorani_lien_permis/projet` comme `lorani_permis`/`lorani_projets`. Il ne lit que `omega/modules`, donc **ni `S/` (E1, E2) ni l'`objet_type` positionnel de `preparer_envoi` (E7)** |

Dans le dépôt, aucun écran ne lit `alertes.detail.lien`. La cloche de l'espace 2 (`components/espace2/Coquille.tsx:116-130`)
ne montre que FILED et les validations.

---

## 2. Blocs

Conditions communes :
- `peutEcrire` = exemple **ou** (session réelle avec `moi` et `role ≠ 'lecteur'`) (`L/EcranLorani.tsx:190`) ;
- en base réelle, la RLS (`private.lorani_ecrit_projet`) tranche en dernier (`L/portes.ts:4-5`) ;
- « Source » = `chargerDossier()` (`L/portes.ts:63-149`), qui lit toutes les tables d'un coup à l'ouverture et après
  chaque écriture.

### 2.1 Haut de page et liste

| N° | Titre affiché | Composant fichier:ligne | Emplacement | Données affichées | Source | Condition d'affichage | Taille (lignes) |
|---|---|---|---|---|---|---|---|
| B1 | « Calendrier des permis » + paragraphe + ruban + « Nouveau projet » | `L/EcranLorani.tsx:314-327` | haut de page | titre (h1, masqué en espace 2 : `components/espace2/Habille.tsx:7-9`), texte de promesse, ruban « Données d'exemple / Base réelle » (`components/espace/ui.tsx:57-63`) | — | toujours ; bouton grisé si `!peutEcrire` | 14 |
| B2 | 5 compteurs-filtres : À confirmer / Pièces à fournir / En instruction / Accordés / Clos | `L/EcranLorani.tsx:329-337` ; libellés `L/etats.ts:206-212` | haut de page | nombre de permis par famille, sous-titre | `lorani_permis` + `lorani_permis_dates_lues` (`L/portes.ts:69-70`) | toujours. Calculés sur `dossier` même pendant le chargement réel (voir O14) | 9 |
| B3 | « La base réelle n'a pas répondu. » | `L/EcranLorani.tsx:339` | haut de page | message d'erreur | `chargerDossier` | si la lecture échoue | 1 |
| B4 | « Tous les permis » ou nom de la famille ; « n permis · m projets » ; permis groupés par projet | `L/EcranLorani.tsx:342-397` | liste (gauche) | en-tête de projet (nom, référence, commune, nature) ; par permis : pastilles type, état, « n dates lues à confirmer », numéro, titre, « Accord tacite / Rejet implicite né le », « Prochaine étape le », « Déposé le / Pas encore déposé », « Chantier sans risque depuis le » | `lorani_projets`, `lorani_permis`, `lorani_permis_dates_lues` | chargement (`:347-348`), vide (`:349-352`, deux textes selon le filtre) | 56 |
| B5 | Projets sans permis (« Sans permis », « Aucun permis saisi pour ce projet », « Phase : … ») | `L/EcranLorani.tsx:398-414` | liste | nom, référence, commune, nature, phase | `lorani_projets` | seulement **sans filtre** (`:170`) | 17 |
| B6 | « Choisissez un permis » / « Lecture du dossier… » | `L/EcranLorani.tsx:420-421`, `:439-441` | dossier (droite) | texte d'attente | — | rien de choisi, ou chargement | 7 |

### 2.2 Le permis ouvert (`PermisVue`, `L/PermisVue.tsx`, 932 lignes)

Affiché quand un permis est choisi (`L/EcranLorani.tsx:422-435`).

| N° | Titre affiché | Fichier:ligne | Emplacement | Données affichées | Source | Condition | Taille |
|---|---|---|---|---|---|---|---|
| B7 | Titre du permis (« PC « … » ») + pastilles + bouton « Régime » + bandeau de 4 chiffres + règle d'instruction | `:342-406` | dossier | type, numéro, commune, parcelles. Pastilles : état, secteur protégé, monument historique, ERP, IGH, évaluation environnementale, inactif. Chiffres : « Déposé le », « Décision attendue le » ou « Pièces à fournir avant le », « Purgé de tout recours le », « Chantier sans risque dès le ». Ligne « Règle d'instruction : … · délai de n mois notifié · sans réponse : … (art. …) » | `lorani_permis` (colonne `calcul` jsonb : `etapes`, `regime`, `date_purge`…) | toujours. Le bouton Régime s'affiche si `peutEcrire && p.actif` (`:362`) | 65 |
| B8 | « C'est fait. … » / « La base a refusé. … » / « Vous voyez ce dossier sans pouvoir y écrire … » | `:408-410` | dossier | retour d'écriture (6 s), erreur, lecture seule | état local | après un geste ; `!peutEcrire` | 3 |
| B9 | « Permis tacite né / Non-opposition tacite née / Rejet implicite / Opposition tacite le … » + « À confirmer » | `:413-431` | dossier | motif du moteur | `calcul.decision_implicite` | `p.etat === 'decision_a_confirmer'` et décision implicite présente | 19 |
| B10 | « Lu sur les courriers de la mairie » + « n à confirmer » | `:433-472` | dossier | par date lue : nature, type de pièce, « Citation retrouvée / non retrouvée », « Permis à choisir », valeurs proposées, jusqu'à 3 citations (page), fichier, heure de lecture | `lorani_permis_dates_lues` (statut `proposee`, permis **ou projet sans permis**, `:123-124`), `pieces` | au moins une date proposée | 40 |
| B11 | « Saisir ce qui est arrivé » | `:475-493` | dossier | jusqu'à 7 boutons selon l'état (voir G13 à G19) | `lorani_permis` | `peutEcrire && p.actif` et état non clos (`purge, refuse, rejete, annule, classe, hors_catalogue`) | 19 |
| B12 | « Calendrier » + « moteur lorani.m4.x · calculé le … » | `:496-515` ; ligne d'étape `:844-876` | dossier | étapes datées : statut (pastille), prévision, « En retard / À confirmer / En cours », issue, motif ou détail, source (lien Légifrance) ; repère « Aujourd'hui » | `calcul.etapes` | toujours. Vide : 2 textes (`:503-505`) | 20 + 33 |
| B13 | « Plusieurs demandes de pièces. … » | `:518-525` | dossier | pièces à fournir, lettres datées, jurisprudence CE 30/04/2024, R*423-41 | `demandes_pieces` | plus d'une lettre | 8 |
| B14 | « À savoir. … » (un par avertissement) | `:528-534` | dossier | avertissements du calcul | `calcul.avertissements` | au moins un | 7 |
| B15 | « Échéances et rappels » + « n en cours » | `:537-553` ; ligne `:879-905` | dossier | date, libellé, statut (Ouverte, Tenue, Annulée, Dépassée), date calculée contre date notifiée, rappels prévus et partis, responsable, action attendue, code de règle, source | vue `lorani_echeances_permis` (`L/portes.ts:71`) | toujours. Vide : « elles naissent au dépôt du dossier » | 17 + 27 |
| B16 | « Recours » + « n saisis / aucun » | `:556-587` | dossier | nature, date, auteur, issue (pastille) ; bouton « Saisir l'issue » | `lorani_permis_recours` | `recours.length` ou permis accordé (`:556`) | 32 |
| B17 | « Courriers du dossier » + « n pièces » | `:590-606` ; ligne `:908-931` | dossier | type, fichier, statut de lecture (Lue, En lecture, À vérifier, Courrier non reconnu, Illisible, Rejetée, Reçue), source (« Reçu par courriel du guichet… » / « Déposé le »), motif, dates confirmées ou écartées par qui et quand | `pieces` du projet **sauf les types de contrôle** (`:128`, `L/etats.ts:186`), dates lues décidées | toujours. Vide : texte | 17 + 24 |

### 2.3 Le dossier du projet (`ProjetCarte`, `L/EcranLorani.tsx:679-805`)

Affiché sous B7-B17, ou seul pour un projet sans permis (`:435`, `:438`). Une seule `<section>` contient 16 sous-blocs.

| N° | Titre affiché | Fichier:ligne | Emplacement | Données affichées | Source | Condition | Taille |
|---|---|---|---|---|---|---|---|
| B18 | Nom du projet + « réf · adresse · CP commune · parcelles » + pastilles | `L/EcranLorani.tsx:697-710` | dossier, projet | nature, phase, « Marché public », territoire (« Territoire inconnu » en ambre) | `lorani_projets` | toujours | 14 |
| B19 | Actions du projet : « Déposer un courrier de la mairie », « Nouveau permis », « Exporter le dossier daté » | `:711-718` (export `:684-694`) | dossier, projet | erreur d'export | — | dépôt et permis grisés si `!peutEcrire` ; export toujours actif | 8 + 11 |
| B20 | « Équipe » + « Ajouter » | `:721-738` | dossier, projet | rôle → nom ; vide : « Personne : les rappels n'ont pas de destinataire. Nommez un chef de projet. » | `lorani_membres_projet` + `annuaire` | toujours | 18 |
| B21 | « Lots » + « Ajouter » | `:739-756` | dossier, projet | numéro, intitulé | `lorani_lots` | toujours | 18 |
| B22 | « Intervenants » + « Ajouter » | `:759-791` | dossier, projet | tableau Rôle / Organisme (+ SIREN) / Contact / Lot | `lorani_intervenants` (actifs) | toujours | 33 |
| B23 | « Règles d'urbanisme » + « Trouver le PLU / Chercher à nouveau » | `L/PluProjet.tsx:96-156` ; servitudes et risques `:160-193` | dossier, projet | zone, type de zone, document, libellé long, autres zones, méthode et confiance, date, lien « Règlement de la zone (PDF) », prescriptions (dépliable). Servitudes : avis secteur protégé (R423-24), avis PPR (L562-4), servitudes groupées (dépliable), risques (commune, sismicité, argiles, radon), « Non lus ». Étapes de recherche (`:20-27`) | `lorani_plu` ; rpc `lorani_chercher_plu`, `lorani_suivre_plu` | toujours. Le bouton exige une adresse ou une parcelle (`:57`, `:101`) | 61 + 34 |
| B24 | « Pièces que le permis exigera » | `L/PiecesPermis.tsx:17-39` ; calcul `L/pieces-exigees.ts:47-83` | dossier, projet | Cerfa 13406/13409, « n pièces sur m pas encore déposées, dont k demandées par la mairie » ; par pièce : Déposée / Demandée par la mairie / À confirmer / À déposer, code, libellé, article, fichier, motif ; texte « non couvert » | calculé dans le navigateur à partir de `lorani_permis`, `lorani_plu`, `pieces`, `lorani_controle_pieces` ; **rien n'est écrit** | seulement PC ou PCMI (`L/pieces-exigees.ts:50`) | 23 (+83) |
| B25 | « Contrôle du dossier » + « Revérifier à l'indice suivant » / « Nouveau contrôle » / « Régler les contrôles » | `L/Controle.tsx:314-457` | dossier, projet | ligne « Réglages du projet » (`:324-329`) ; sélecteur de contrôles (`:339-347`) ; en-tête (intitulé, indice, statut, « passé le », « revérifie l'indice », « Suspendu », Lancer/Relancer, Suspendre/Reprendre, `:349-361`) ; « Décide des constats : … » + « Choisir qui décide » (`:362-366`) ; motif de suspension (`:367-369`) ; résumé des constats (`:370-375`) ; boutons rapport (`:376-381`) ; pièces croisées (`:384-393`) ; constats ouverts avec gravité, famille, « relevé depuis l'indice », correction proposée, citations, 4 boutons (`:395-415`) ; dépliables « Changements depuis l'indice » (`:417-430`), « Corrigés depuis l'indice » (`:431-438`), « Décidés » + « Rouvrir » (`:439-455`) | `lorani_controles`, `lorani_controle_pieces`, `lorani_constats`, `pieces`, `lorani_membres_projet`, `lorani_projets.controle_tolerances/familles_coupees` | toujours. Vide : 2 textes (`:331-336`). Rôles : `peutChoisir` (gérant, admin ou chef de projet, `:115-116`), `peutDecider` (décideur nommé, ou direction, `:117`) | 144 (fichier 661) |
| B26 | « Analyse des offres » + « Ouvrir une consultation » | `L/Offres.tsx:147-279` | dossier, projet | consigne de dépôt (`:155-157`) ; sélecteur de consultations (`:163-171`) ; en-tête (statut, lot, intitulé, estimation, seuil, remise, date d'analyse) ; Relancer, PDF, Excel ; avis « Chiffré par aucune entreprise » et « par une seule » ; tableau de classement (rang, entreprise, annoncé, comparable, écart, relevés, décision) ; relevés par offre ; tableau poste par poste (`:248-275`) | `lorani_consultations`, `lorani_offres`, `lorani_lots`, `pieces` (DPGF) | toujours. Vide : 2 textes (`:159-161`) | 133 (fichier 353) |
| B27 | « Honoraires et temps passés » + « Saisir du temps » / « Ajouter un élément » | `L/Honoraires.tsx:123-203` | dossier, projet | total HT, heures passées et prévues, facturé, appels à émettre ; avis 80 % / dépassé ; tableau Élément / Honoraires / Temps passé (jauge) / Taux réalisé / État / action ; dépliable « Derniers temps saisis » (12) | `lorani_honoraires`, `lorani_temps` | toujours. Vide : texte (`:202`) | 81 (fichier 278) |
| B28 | « Chantier : situations et visas » + « Situation reçue » / « Document à viser » / « Nouveau marché » | `L/Chantier.tsx:132-257` | dossier, projet | cartes « Situation n° … à viser » (`:152-192`) : cumul et %, ce mois, retenue, dépassement, avancement facturé contre constaté au CR (b5_32, `:167-174`), recalcul retenue, avance et pénalités (b5_33, `:175-184`), cumul qui recule, Viser / Rectifier ; tableau des marchés (`:194-222`) ; tableau des visas (`:224-257`) avec « Urgent » et « Rendre l'avis » | `lorani_marches`, `lorani_situations`, `lorani_visas`, `lorani_comptes_rendus` (avancement) | toujours. Vide : 2 textes (`:148-150`) | 126 (fichier 463) |
| B29 | « Comptes rendus de chantier » + « Nouveau compte rendu » | `L/ComptesRendus.tsx:154-212` ; ligne de point `:138-152` | dossier, projet | sélecteur de CR (`:166-170`) ; en-tête (n°, visite, Brouillon / Diffusé, prochaine visite) ; boutons Rédiger depuis les notes, Ajouter un point, Modifier, Diffuser, PDF ; présents et excusés, avancement, avancement par lot, nombre de lignes de notes ; « Points de cette visite », « En suspens » (âge, CR d'origine), dépliable « Soldés depuis … » ; par point : nature, lot, entreprise, échéance, « En retard », réponse, « Réponse reçue / Faite », « Solder » | `lorani_comptes_rendus`, `lorani_points` (`L/cr.ts:21-46`) | toujours. Vide : texte (`:163`) | 59 + 15 (fichier 368) |
| B30 | « Ordres de service » | `L/OrdresService.tsx:126-177` | dossier, projet | par marché : lot, titulaire, « Chantier à l'arrêt », « Délai du marché », « Émettre un OS » ; incidence (montant à date, % du marché initial, délai, jours d'OS et d'arrêt, démarrage, fin contractuelle) ; avis au-delà du seuil (15 % public, R2194-8) ; liste des OS (n°, nature, objet, émis, notifié, montant, jours, réserves possibles jusqu'au, statut, « Retour de l'entreprise ») | `lorani_ordres_service`, `lorani_marches` (incidence recalculée côté écran, `:7-9`) | **masqué sans marché** (`:126`) | 52 (fichier 278) |
| B31 | « Réception et réserves » + « Prononcer la réception / Date de réception » / « Nouvelle réserve » | `L/Reserves.tsx:88-133` | dossier, projet | date de réception, fin de la GPA, « n réserves non levées sur m » ; avis GPA à 60 jours ; par réserve : n°, lot, statut (Levée, Contestée, À lever avant ou depuis, Ouverte), intitulé, localisation, origine, motif, « Constater la levée », « Contestée », « Rouvrir » | `lorani_reserves`, `lorani_projets.reception_le` | toujours | 46 (fichier 233) |
| B32 | « DOE : dossier des ouvrages exécutés » + « Préparer / Compléter la liste » / « Demander les pièces manquantes » | `L/Doe.tsx:104-152` | dossier, projet | « n pièces reçues sur m (x %) · k attendues · sans objet » ; jauge ; avis « Réception prononcée … DOE incomplet » ; par lot et entreprise, puis « Projet » (DIUO) : statut, intitulé, fichier, motif, « Reçu », « Sans objet », « Remettre en attente » | `lorani_doe`, `pieces`, `lorani_intervenants` | toujours. Vide : 2 textes (`:114`) | 49 (fichier 186) |
| B33 | « Assurances décennales des entreprises » + « Ouverture du chantier » / « Saisir une attestation » | `L/Assurances.tsx:132-201` | dossier, projet | date d'ouverture et consigne de dépôt ; par attestation : statut, lot, entreprise, assureur, police, période, plafond, activités, ce que le contrôle relève, « Échue le », « Contrôlée le · lue sur la pièce / saisie à la main », « Corriger » ; tableau Lot / Activités requises (« Modifier ») / Attestation | `lorani_attestations`, `lorani_lots.activites_requises`, `lorani_intervenants` (entreprises), `lorani_projets.ouverture_chantier` | toujours. Vide : texte (`:148-150`) | 70 (fichier 307) |

### 2.4 Fenêtres (Dialog)

| N° | Titre | Fichier:ligne | Ouverte par | Champs | Taille |
|---|---|---|---|---|---|
| F1 | Nouveau projet | `L/EcranLorani.tsx:446-497` | B1 | nom*, référence, nature, adresse, code postal*, commune, code INSEE, parcelles, marché public | 52 |
| F2 | Nouveau permis | `:500-532` | B19 | type, intitulé, numéro, date de dépôt | 33 |
| F3 | Déposer un courrier de la mairie | `:535-565` | B19 | fichier* (PDF/PNG/JPG), nature (16 types `L/etats.ts:166-183` ou « Laisser Lorani reconnaître ») | 31 |
| F4 | Ajouter un lot | `:568-592` | B21 | numéro*, intitulé* | 25 |
| F5 | Ajouter un intervenant | `:594-642` | B22 | rôle, lot, organisme*, contact, SIREN, courriel, téléphone | 49 |
| F6 | Composer l'équipe | `:644-673` | B20 | personne* (annuaire), rôle dans le projet | 30 |
| F7 | Confirmer <nature> | `L/PermisVue.tsx:609-647` | B10 | permis visé (si plusieurs ou aucun), champs de la nature (`L/etats.ts:118-164`) | 39 |
| F8 | Écarter cette lecture | `:649-668` | B10 | motif* (3 à 300 caractères) | 20 |
| F9 | Confirmer la décision implicite | `:670-685` | B9 | avertissement | 16 |
| F10 | Pièces reçues / Permis affiché / Décision reçue / Délai notifié / Dossier déposé / Demande de pièces reçue | `:687-740` | B9, B11 | date* ; selon le cas : décision, mois (1-24), numéro, pièces* | 54 |
| F11 | Recours reçu | `:742-771` | B11 | nature, date*, auteur | 30 |
| F12 | Régime du permis | `:773-808` | B7 | 5 cases et cas de rejet R*424-2 (`lorani_cas_rejet`) | 36 |
| F13 | Issue du recours | `:810-838` | B16 | issue, date* | 29 |
| F14 | Nouveau contrôle du dossier / Revérifier à l'indice suivant | `L/Controle.tsx:460-509` | B25 | intitulé*, indice, pièces croisées (2 au moins, rôle, référence) | 50 |
| F15 | En faire une question | `:512-544` | B25 | à qui (intervenant), échéance, question* (extrait prérempli) | 33 |
| F16 | Suspendre le contrôle | `:547-566` | B25 | motif* | 20 |
| F17 | Régler les contrôles | `:569-607` | B25 | 12 tolérances (`:57-70`), 7 familles à cocher | 39 |
| F18 | Choisir qui décide | `:610-633` | B25 | membre ou « Toute l'équipe » | 24 |
| F19 | Marquer corrigé / Accepter / Écarter | `:636-658` | B25 | motif (obligatoire sauf « corrigé ») | 23 |
| F20 | Ouvrir une consultation | `L/Offres.tsx:282-325` | B26 | lot, intitulé*, DPGF de référence, estimation, seuil, remise | 44 |
| F21 | Retenir l'offre / Écarter l'offre | `:328-350` | B26 | motif (obligatoire pour écarter) | 23 |
| F22 | Ajouter un élément de mission | `L/Honoraires.tsx:205-241` | B27 | élément, intitulé (si « autre »), honoraires, heures | 37 |
| F23 | Saisir du temps | `:243-275` | B27 | élément, jour, heures, note | 33 |
| F24 | Nouveau marché de travaux | `L/Chantier.tsx:260-306` | B28 | lot, titulaire, montant, avenants, retenue, avance, pénalité | 47 |
| F25 | Situation reçue | `:309-363` | B28 | marché, n°, mois, cumul, reçue le, retenue, avance, pénalités | 55 |
| F26 | Viser / Rectifier la situation n° | `:366-390` | B28 | cumul admis (si rectifier), observation | 25 |
| F27 | Document d'exécution à viser | `:393-431` | B28 | lot, document, indice, reçu le, commande le | 39 |
| F28 | Rendre l'avis | `:434-460` | B28 | VSO / VAO / REF, observation | 27 |
| F29 | Nouveau compte rendu / Compte rendu n° | `L/ComptesRendus.tsx:215-270` | B29 | visite, présents, notes, avancement, avancement par lot, prochaine visite | 56 |
| F30 | Rédiger depuis les notes | `:273-297` | B29 | points lus dans les notes | 25 |
| F31 | Ajouter un point | `:300-343` | B29 | nature, texte, intervenant, lot, échéance | 44 |
| F32 | Réponse reçue / Action faite | `:346-365` | B29 | réponse | 20 |
| F33 | Émettre un ordre de service | `L/OrdresService.tsx:180-222` | B30 | nature, objet, émis, notifié, montant, jours | 43 |
| F34 | Retour de l'entreprise sur l'OS n° | `:225-253` | B30 | signé / avec réserves / refusé, réserves | 29 |
| F35 | Délai d'exécution du marché | `:256-275` | B30 | jours | 20 |
| F36 | Réception des travaux | `L/Reserves.tsx:136-155` | B31 | date du PV | 20 |
| F37 | Nouvelle réserve | `:158-203` | B31 | lot, intitulé, localisation, origine, constatée le, à lever avant | 46 |
| F38 | Constater la levée / Réserve contestée | `:206-230` | B31 | date ou motif | 25 |
| F39 | Pièce reçue / Sans objet | `L/Doe.tsx:155-183` | B32 | pièce rattachée ou motif | 29 |
| F40 | Saisir une attestation décennale / Corriger l'attestation | `L/Assurances.tsx:204-255` | B33 | entreprise, assureur, police, activités, début, fin, plafond | 52 |
| F41 | Activités du lot n° | `:258-282` | B33 | activités (`L/etats.ts:254-289`) | 25 |
| F42 | Ouverture du chantier | `:285-304` | B33 | date | 20 |

---

## 3. Gestes

Après chaque geste, la suite est la même :
- en base réelle, la porte de `L/portes.ts`, puis `relire()`, qui relit **tout** `chargerDossier` ;
- en exemple, une modification en mémoire (`appliquer` `L/EcranLorani.tsx:206-222`, `agir` `:225-232`, `appliquer`
  `L/PermisVue.tsx:143-161`, `lancer` dans chaque sous-composant).

Une erreur s'affiche dans la fenêtre, ou dans le bloc si le geste n'a pas de fenêtre. Le rôle par défaut est `peutEcrire`.

| G | Libellé | Bloc | Fonction → rpc / table | Fenêtre | Rôle requis | Ce qui se passe après |
|---|---|---|---|---|---|---|
| G1 | Nouveau projet → « Ouvrir le projet » | B1 | `ouvrirProjet` `L/portes.ts:215` → INSERT `lorani_projets` | F1 | peutEcrire | le projet s'ouvre (`L/EcranLorani.tsx:238`) |
| G2 | Nouveau permis → « Saisir le permis » | B19 | `ouvrirPermis` `:208` → INSERT `lorani_permis` | F2 | peutEcrire | le permis s'ouvre ; le socle calcule |
| G3 | Déposer un courrier → « Déposer » | B19 | `deposerCourrier` `:266-283` → Storage `omega-clients/<client>/lorani_projet/<projet>/…` + rpc `lorani_deposer_piece` | F3 | peutEcrire | la pièce part « en lecture ». Le lecteur pose les dates lues (B10), les situations (E18-E19), les attestations, les offres… |
| G4 | Équipe « Ajouter » | B20 | `ajouterMembre` `:251` → INSERT `lorani_membres_projet` | F6 | peutEcrire | le chef de projet reçoit les rappels (F6 le dit) |
| G5 | Lots « Ajouter » | B21 | `ajouterLot` `:239` → INSERT `lorani_lots` | F4 | peutEcrire | — |
| G6 | Intervenants « Ajouter » | B22 | `ajouterIntervenant` `:245` → INSERT `lorani_intervenants` | F5 | peutEcrire | — |
| G7 | Exporter le dossier daté | B19 | `dossierDate` `L/dossier-date.ts` → zip (registre.pdf, registre.xlsx avec une feuille par lot), **sans écriture** | aucune | aucun | téléchargement |
| G8 | Régime → « Enregistrer le régime » | B7 | `saisirPermis` `:202` → UPDATE `lorani_permis` (5 cases, `cas_rejet`) | F12 | peutEcrire et permis actif | recalcul de la règle et de l'effet du silence |
| G9 | Confirmer la décision implicite | B9 | `confirmerDecisionImplicite` `:168` → rpc `lorani_confirmer_decision_implicite` | F9 | peutEcrire | permis accordé ou rejeté, daté par le moteur |
| G10 | Saisir la décision reçue | B9 | `saisirPermis` → UPDATE `lorani_permis` (`decision`, `date_decision`) | F10 | peutEcrire | doublon de G17 |
| G11 | Confirmer (date lue) | B10 | `confirmerDateLue` `:153` → rpc `lorani_confirmer_date_lue(p_id, p_valeurs, p_permis)` | F7 | peutEcrire | « Date confirmée … le calendrier est recalculé » |
| G12 | Écarter (date lue) | B10 | `ecarterDateLue` `:160` → rpc `lorani_ecarter_date_lue` | F8 | peutEcrire | motif au journal |
| G13 | Dossier déposé | B11 | `saisirPermis` → UPDATE `date_depot`, `numero` | F10 | peutEcrire | les échéances naissent (B15) |
| G14 | Demande de pièces reçue | B11 | `saisirPermis` → UPDATE `date_demande_pieces`, `pieces_demandees` | F10 | peutEcrire | trigger seconde demande (E9) |
| G15 | Pièces reçues par la mairie | B11 | `saisirPermis` → UPDATE `date_pieces_fournies` | F10 | peutEcrire | l'instruction repart |
| G16 | Délai notifié par la mairie | B11 | `saisirPermis` → UPDATE `delai_notifie_mois`, `date_notification_delai` | F10 | peutEcrire | fin d'instruction recalculée |
| G17 | Arrêté reçu | B11 | `saisirPermis` → UPDATE `decision`, `date_decision` | F10 | peutEcrire | accordé ou refusé |
| G18 | Permis affiché sur le terrain | B11 | `saisirPermis` → UPDATE `date_affichage` | F10 | peutEcrire | le délai de recours des tiers court |
| G19 | Recours reçu → « Saisir le recours » | B11 | `saisirRecours` `:224` → INSERT `lorani_permis_recours` | F11 | peutEcrire, permis accordé | pas de purge avant l'issue |
| G20 | Saisir l'issue | B16 | `clore_recours` `:231` → UPDATE `lorani_permis_recours` | F13 | peutEcrire | recalcul |
| G21 | Trouver le PLU / Chercher à nouveau | B23 | `chercherPlu` `:387` → rpc `lorani_chercher_plu` ; puis relève automatique `suivrePlu` → rpc `lorani_suivre_plu` toutes les 2,5 s, 24 fois au plus (`L/PluProjet.tsx:60-70`) | aucune | peutEcrire, adresse ou parcelle | alertes E22 et E23 ; `secteur_protege` alimente B24 |
| G22 | Nouveau contrôle → « Préparer le contrôle » | B25 | `preparerControle` `:349` → INSERT `lorani_controles` + `lorani_controle_pieces`, puis `lancerControle` si toutes les pièces sont lues | F14 | peutEcrire, 2 pièces au moins | alerte E21 |
| G23 | Revérifier à l'indice suivant | B25 | idem, avec `precedent_id` | F14 | peutEcrire | constats corrigés ou reconduits |
| G24 | Régler les contrôles → « Enregistrer » | B25 | `reglerControles` `:520` → rpc `lorani_regler_controles` | F17 | gérant, admin ou chef de projet (`L/Controle.tsx:116`) | vaut au prochain passage |
| G25 | Lancer / Relancer | B25 | `lancerControle` `:362` → rpc `lorani_lancer_controle` | **aucune** | peutEcrire, ni clos ni suspendu | E21 |
| G26 | Suspendre | B25 | `suspendreControle` `:507` → rpc `lorani_suspendre_controle` | F16 | peutEcrire | ne se lance plus |
| G27 | Reprendre | B25 | `reprendreControle` `:513` → rpc `lorani_reprendre_controle` | **aucune** | peutEcrire | — |
| G28 | Choisir qui décide → « Enregistrer » | B25 | `choisirDecideur` `:527` → rpc `lorani_choisir_decideur` | F18 | gérant, admin ou chef de projet | seul le décideur décide ensuite |
| G29 | Rapport PDF annoté | B25 | `pdfControle` `L/rapport.ts` + `octetsPiece` `:376` (URL signée du Storage, 10 min) | aucune | aucun | téléchargement |
| G30 | Tableau Excel (contrôle) | B25 | `excelControle` | aucune | aucun | téléchargement |
| G31 | Corrigé | B25 | `deciderConstat` `:369` → UPDATE `lorani_constats` | F19 | peutDecider | — |
| G32 | Accepter | B25 | idem | F19 | peutDecider | motif obligatoire |
| G33 | Écarter (constat) | B25 | idem | F19 | peutDecider | motif obligatoire |
| G34 | En faire une question → « Poser la question » | B25 | `ajouterPoints` `:482` → INSERT `lorani_points` (nature `question`, `ouvert_au_cr` nul) | F15 | peutEcrire | relances du socle ; alerte E28 |
| G35 | Rouvrir (constat) | B25 | `deciderConstat` → `statut 'ouvert'` | **aucune** | peutDecider | — |
| G36 | Ouvrir une consultation | B26 | `ouvrirConsultation` `:498` → INSERT `lorani_consultations` | F20 | peutEcrire, au moins un lot | — |
| G37 | Relancer l'analyse | B26 | `analyserOffres` `:533` → rpc `lorani_analyser_offres` | **aucune** | peutEcrire, offres présentes, non attribuée | — |
| G38 | Rapport d'analyse PDF | B26 | `pdfOffres` `L/rapport-offres.ts` | aucune | aucun | téléchargement |
| G39 | Tableau Excel (offres) | B26 | `excelOffres` | aucune | aucun | téléchargement |
| G40 | Retenir | B26 | `attribuerOffre` `:539` → rpc `lorani_attribuer_offre` (crée le marché du lot) | F21 | peutEcrire | consultation attribuée ; le marché apparaît dans B28 et B30 |
| G41 | Écarter (offre) | B26 | `ecarterOffre` `:545` → UPDATE `lorani_offres` | F21 | peutEcrire | motif au rapport |
| G42 | Saisir du temps | B27 | `saisirTemps` `:308` → INSERT `lorani_temps` | F23 | **`!!moi` et au moins un élément, pas `peutEcrire`** (`L/Honoraires.tsx:128`) | alerte E12 |
| G43 | Ajouter un élément | B27 | `poserHonoraire` `:296` → INSERT `lorani_honoraires` | F22 | peutEcrire | — |
| G44 | Achevé | B27 | `changerHonoraire` `:302` → UPDATE `statut 'achevee'` | **aucune** | peutEcrire | alerte « appel d'honoraires » (E13) |
| G45 | Facturé | B27 | idem → `statut 'facturee'` | **aucune** | peutEcrire | — |
| G46 | Situation reçue | B28 | `recevoirSituation` `:322` → INSERT `lorani_situations` | F25 | peutEcrire, au moins un marché | E14 à E16 |
| G47 | Document à viser | B28 | `recevoirDocument` `:334` → INSERT `lorani_visas` | F27 | peutEcrire | E17, E20 |
| G48 | Nouveau marché | B28 | `poserMarche` `:316` → INSERT `lorani_marches` | F24 | peutEcrire, au moins un lot | B30 apparaît |
| G49 | Viser | B28 | `viserSituation` `:328` → UPDATE `statut 'visee'` | F26 | peutEcrire | — |
| G50 | Rectifier | B28 | idem → `statut 'rectifiee'` | F26 | peutEcrire | — |
| G51 | Rendre l'avis | B28 | `rendreVisa` `:340` → UPDATE `lorani_visas` | F28 | peutEcrire | — |
| G52 | Nouveau compte rendu | B29 | `creerCompteRendu` `:469` → INSERT `lorani_comptes_rendus` | F29 | peutEcrire | — |
| G53 | Modifier (CR) | B29 | `majCompteRendu` `:476` → UPDATE | F29 | peutEcrire, brouillon | — |
| G54 | Rédiger depuis les notes → « Ajouter n points » | B29 | `ajouterPoints` → INSERT `lorani_points` (lot) | F30 | peutEcrire, brouillon avec notes | — |
| G55 | Ajouter un point | B29 | `ajouterPoints` | F31 | peutEcrire, brouillon | — |
| G56 | Diffuser | B29 | `majCompteRendu` → `statut 'diffuse'` (contenu figé par le socle) | **aucune**, alors que le geste est irréversible | peutEcrire | le CR devient opposable ; points soldés clos |
| G57 | PDF (CR) | B29 | `pdfCompteRendu` `L/cr.ts` | aucune | aucun | téléchargement |
| G58 | Réponse reçue / Faite | B29 | `majPoint` `:488` → UPDATE `lorani_points.reponse` | F32 | peutEcrire | — |
| G59 | Solder | B29 | `majPoint` → `statut 'clos'` | **aucune** | peutEcrire | — |
| G60 | Délai du marché | B30 | `poserDelaiMarche` `:443` → UPDATE `lorani_marches.delai_execution_jours` | F35 | peutEcrire | fin contractuelle |
| G61 | Émettre un OS | B30 | `emettreOs` `:431` → INSERT `lorani_ordres_service` | F33 | peutEcrire | E26, E27 |
| G62 | Retour de l'entreprise | B30 | `changerOs` `:437` → UPDATE | F34 | peutEcrire | — |
| G63 | Prononcer la réception / Date de réception | B31 | `poserReception` `:461` → UPDATE `lorani_projets.reception_le` | F36 | peutEcrire | E30 (GPA), E31 (DOE), avis dans B32 |
| G64 | Nouvelle réserve | B31 | `constaterReserve` `:449` → INSERT `lorani_reserves` | F37 | peutEcrire | E29 |
| G65 | Constater la levée | B31 | `changerReserve` `:455` → UPDATE | F38 | peutEcrire | — |
| G66 | Contestée | B31 | idem | F38 | peutEcrire | — |
| G67 | Rouvrir (réserve) | B31 | idem → `statut 'ouverte'` | **aucune** | peutEcrire | — |
| G68 | Préparer / Compléter la liste | B32 | `preparerDoe` `:553` → rpc `lorani_preparer_doe` | **aucune** | peutEcrire, au moins un lot | — |
| G69 | Demander les pièces manquantes | B32 | `ajouterPoints` → INSERT `lorani_points`, une question par lot, rattachée au CR brouillon s'il y en a un (`L/Doe.tsx:82-102`) | **aucune**, alors que des questions partent aux entreprises (relances du socle) | peutEcrire | message dans B32 |
| G70 | Reçu | B32 | `majDoe` `:560` → UPDATE `lorani_doe` | F39 | peutEcrire | — |
| G71 | Sans objet | B32 | idem | F39 | peutEcrire | motif obligatoire |
| G72 | Remettre en attente | B32 | idem | **aucune** | peutEcrire | — |
| G73 | Ouverture du chantier | B33 | `poserOuvertureChantier` `:423` → UPDATE `lorani_projets.ouverture_chantier` | F42 | peutEcrire | les attestations sont recontrôlées |
| G74 | Saisir une attestation | B33 | `saisirAttestation` `:405` → INSERT `lorani_attestations` | F40 | peutEcrire, au moins une entreprise | contrôle par trigger, E24 |
| G75 | Corriger | B33 | `corrigerAttestation` `:411` → UPDATE | F40 | peutEcrire | E24 |
| G76 | Modifier (activités du lot) | B33 | `changerActivitesLot` `:417` → UPDATE `lorani_lots.activites_requises` | F41 | peutEcrire | recontrôle |

Fonction de `portes.ts` qu'aucun écran n'appelle : `calendrier()` → rpc `lorani_calendrier_permis` (`L/portes.ts:287-292`).

---

## 4. Liste et filtres

| Élément | Fichier:ligne | Fait |
|---|---|---|
| Familles (5) | `L/etats.ts:204-212` | à confirmer (ambre), pièces (rouge), instruction (bleu), accordés (vert), clos (gris) |
| Rattachement d'un permis à une famille | `L/etats.ts:214-229` | une date lue proposée **sur le permis** ou `decision_a_confirmer` → à confirmer ; `pieces_demandees` → pièces ; `a_deposer`, `completude`, `instruction` → instruction (« À déposer » est donc compté « En instruction ») ; `accorde`, `recours_en_cours` → accordés ; le reste → clos |
| Comptage | `L/EcranLorani.tsx:131-145` | `proposeesPar` compte par `permis_id`, ou par `projet:<id>` quand le permis est nul. Ces dernières ne sont comptées dans aucune famille et ne donnent aucune pastille dans la liste (voir O8) |
| Filtre | `L/EcranLorani.tsx:331` | un clic sur un compteur filtre, un second clic retire le filtre. Un seul filtre à la fois. Avec un filtre, les projets sans permis disparaissent (`:170`) |
| Tri | `L/EcranLorani.tsx:147-164` | rang de la famille, puis nombre de dates lues proposées (décroissant), puis `prochaineDate` (`L/etats.ts:237-243` : date implicite, ou première étape à venir, manquée ou à confirmer), puis `cree_le` décroissant |
| Groupement | `L/EcranLorani.tsx:166-172` | par projet, dans l'ordre du premier permis visible ; projets sans permis à la fin |
| Choix par défaut | `L/EcranLorani.tsx:176-188` | URL, sinon le premier permis visible, sinon le premier projet sans permis |
| Recherche | — | **Aucune** : ni texte, ni commune, ni responsable, ni projet |
| Repère « proche » et « retard » d'un item | `L/EcranLorani.tsx:382` | « proche » si la date tombe à 7 jours au plus. Le calcul se fait par chaîne, jour plafonné à 31, sans passage au mois suivant |
| Sélecteurs internes | `L/Controle.tsx:339-347` ; `L/Offres.tsx:163-171` ; `L/ComptesRendus.tsx:166-170` | contrôle (intitulé · indice), consultation (lot · intitulé), CR (n° · date) : état local, absent de l'URL |
| Limites de lecture | `L/portes.ts:68-106` | 300 projets, 600 permis, 600 dates lues, 600 pièces, 2000 échéances… sans pagination |

**Vocabulaires d'état** (tout libellé passe par un dictionnaire) :

| Objet | Fichier:ligne | Valeurs |
|---|---|---|
| Permis `etat` | `L/etats.ts:29-43` | a_deposer, completude, pieces_demandees, instruction, decision_a_confirmer, accorde, recours_en_cours, purge, refuse, rejete, annule, classe, hors_catalogue |
| Type d'autorisation | `L/etats.ts:21-27` | pc, pcmi, pa, pd, dp |
| Décision | `L/etats.ts:45-50` | favorable, defavorable, tacite, rejet_implicite |
| Étape du calendrier | `L/etats.ts:193-201` | fait, a_venir, passe, manque, a_confirmer, en_attente, en_cours |
| Recours (nature, issue) | `L/etats.ts:76-87` | gracieux, contentieux, prefet / en_cours, rejete, desiste, annulation |
| Date lue (nature) | `L/etats.ts:118-164` | depot, delai_notifie, demande_pieces, decision, decision_tacite, affichage |
| Pièce (type, statut) | `L/etats.ts:166-186` ; `L/PermisVue.tsx:909-916` | 16 types ; lue, en_lecture, a_verifier, a_classer, echec, rejetee, reçue |
| Échéance | `L/PermisVue.tsx:880-881` | ouvert, tenu, annule, depasse |
| Phase du projet, nature, rôles, intervenants | `L/etats.ts:52-113` | 12 phases, 6 natures, 6 rôles, 14 natures d'intervenant |
| PLU | `L/PluProjet.tsx:18-27` | a_chercher, geocodage, zonage, trouve, introuvable, erreur |
| Contrôle, constat | `L/Controle.tsx:30-45` | gravité bloquant, majeur, mineur ; 7 familles ; décisions corrige, accepte, ecarte ; contrôle en_lecture, controle, clos (+ suspendu) |
| Consultation, offre | `L/Offres.tsx:21-27` | ouverte, analysee, attribuee, infructueuse / recue, analysee, retenue, ecartee |
| Visa | `L/Chantier.tsx:35-40` | a_viser, vso, vao, ref |
| Honoraires | `L/Honoraires.tsx:18-33`, `:162-167` | 14 éléments ; a_venir, en_cours, achevee, facturee (+ à surveiller ou dépassé, calculé) |
| Activités décennales | `L/etats.ts:254-289` | 34 activités |

---

## 5. Exemple ou base réelle

| Point | Fichier:ligne | Fait |
|---|---|---|
| Interrupteur | `components/espace/source.tsx:28-91` | `localStorage['espace.source']`. « reelle » n'est retenu que si une session est ouverte (`connecte`). Le rendu serveur vaut toujours « exemple » |
| Où il se règle | `components/espace2/Coquille.tsx:103`, `:345-382` (menu « exemple / réelle ») ; ancien espace `components/espace/CoquilleEspace.tsx:50-59` | — |
| Données d'exemple | `L/exemples.ts:780-812` (`dossierExemple`) | 5 projets (`:52-58`), 6 permis à tous les stades, ids `00000000-…`, dates relatives au jour. `moi` = `EXEMPLE_MOI`, rôle `valideur`, chef de projet de Maison Lemoine (`:448`) |
| Choix dans l'écran | `L/EcranLorani.tsx:57-97` | `local = dossierExemple()` (modifiable en mémoire). `reel` est chargé quand `source === 'reelle'` (`:78-85`). `dossier = exemple ? local : (reel ?? local)` (`:96`) ; `pret` (`:97`) |
| Échec de lecture | `L/EcranLorani.tsx:73-75` | `reel` = l'exemple **vidé seulement en partie** : `honoraires`, `temps`, `marches`, `situations`, `visas`, `casRejet` restent ceux de l'exemple (invisibles sans projet). `moi` vaut nul |
| Temps réel | `L/EcranLorani.tsx:94` | abonnement à 4 tables seulement : `lorani_permis`, `lorani_permis_dates_lues`, `lorani_permis_recours`, `lorani_permis_echeances` |
| Écriture | `L/EcranLorani.tsx:206-232` ; `L/PermisVue.tsx:143-161` | réelle : porte puis relire ; exemple : `setLocal` / `onLocal` |
| Droits | `L/EcranLorani.tsx:190` | en exemple, tout est permis ; en base réelle, `role ≠ lecteur` |
| Noms | `L/EcranLorani.tsx:116-128` | en exemple `PERSONNES` ; en base réelle `annuaire` + « Vous » |
| Comportements propres à l'exemple | `L/PluProjet.tsx:30-42` (réponse préparée pour Villeurbanne seulement) ; `L/Controle.tsx:171-190` (pas de croisement, reconduction) ; `L/Offres.tsx:100-103` (pas de réanalyse) ; `L/Assurances.tsx:7-8` (contrôle refait dans le navigateur) ; `L/Doe.tsx:69-73` (liste type) | — |
| Ruban | B1 `L/EcranLorani.tsx:322` ; `components/espace2/Coquille.tsx:336-340` | — |

---

## 6. Objets métier

| Objet | Table / vue (lecture `L/portes.ts:ligne`) | Identifiant | Écrit par | Blocs |
|---|---|---|---|---|
| Projet | `lorani_projets` (:68) | `id` (`?projet=`) | G1, G24 (réglages), G63, G73 | B4, B5, B18-B33, F1 |
| Permis | `lorani_permis` (:69), colonne `calcul` jsonb | `id` (`?permis=`), `numero` | G2, G8, G10, G13-G18 ; triggers | B2, B4, B7-B17, B24, F2, F7-F13 |
| Date lue | `lorani_permis_dates_lues` (:70) | `id` ; unique `(client, piece, nature)` | lecteur (`lorani_lire_piece`), G11, G12 | B2, B4, B10, B17 |
| Échéance du permis | vue `lorani_echeances_permis` (:71) | `delai_id` | socle | B15 |
| Recours | `lorani_permis_recours` (:72) | `id` | G19, G20 | B16 |
| Lot | `lorani_lots` (:73) | `id`, `numero` | G5, G76 | B21, B26, B28, B31, B32, B33, F5, F24, F31, F37 |
| Intervenant | `lorani_intervenants` (:74) | `id` | G6 | B22, B32, B33, F15, F31 |
| Membre du projet | `lorani_membres_projet` (:75) | `id` | G4 | B20, B25 (décideur), F18 |
| Cas de rejet | `lorani_cas_rejet` (:76) | `code` | — | F12 |
| Pièce | `pieces` (module `lorani`, objet_type `lorani_projet`, objet_id = projet) (:78) ; Storage `omega-clients` | `id`, `chemin` | G3, courriels du guichet (b5_11) | B17, B24, B25, F14, F20, F39, B33 |
| Personne | rpc `annuaire` (:79), `comptes` (:58) | `user_id` | — | B20, B25, B27, B15 |
| Élément d'honoraires / temps | `lorani_honoraires` (:81), `lorani_temps` (:82) | `id` | G42-G45 | B27 |
| Marché | `lorani_marches` (:84) | `id` | G48, G40, G60 | B28, B30 |
| Situation | `lorani_situations` (:85) | `id`, `(marche, numero)` | G46, G49, G50, lecteur (b5_14) | B28 |
| Visa | `lorani_visas` (:86) | `id` | G47, G51 | B28 |
| Contrôle / pièce de contrôle / constat | `lorani_controles` (:89), `lorani_controle_pieces` (:90), `lorani_constats` (:91) | `id`, `precedent_id` | G22-G35 | B25, B24 (références) |
| PLU | `lorani_plu` (:93) | `projet_id` | G21 | B23, B24 |
| Attestation décennale | `lorani_attestations` (:95) | `id` | G74, G75, lecteur | B33 |
| Ordre de service | `lorani_ordres_service` (:97) ; vue `lorani_os_incidence` (socle) | `id`, `numero` | G61, G62 | B30 |
| Réserve | `lorani_reserves` (:98) | `id`, `numero` | G64-G67 | B31 |
| Compte rendu / point | `lorani_comptes_rendus` (:100), `lorani_points` (:101) | `id`, `numero` | G34, G52-G59, G69 | B29, B28 (avancement constaté) |
| Pièce du DOE | `lorani_doe` (:103) | `id` | G68-G72 | B32 |
| Consultation / offre | `lorani_consultations` (:105), `lorani_offres` (:106) | `id` | G36-G41, lecteur | B26 |

---

## 7. Promesses du site

Sources :
- `omega/CHIFFRAGE/lorani.md` (relu sur main c0494b4 le 06/10) ;
- `lib/en-preparation.ts:68-91` (14 lignes encore marquées « En préparation ») ;
- les pages du site, sous `components/secteurs/architectes/`.

**Le chiffrage date d'avant b5_25 à b5_33.** Plusieurs lignes qu'il classe en D ont désormais un bloc.

| Promesse (CH#) | État du chiffrage | Bloc ou geste qui la prouve | Remarque |
|---|---|---|---|
| #1-2 croiser les planches, le CCTP et la DPGF ; liste des incohérences | C | B25, G22, G25 | — |
| #3-4 PDF, même scannés | B / C | F3 (`accept=".pdf,.png,.jpg,.jpeg"`) | — |
| #5 lecture seule | B | (par construction) | — |
| #7 retrait des données | D | **aucun** | — |
| #8 « PC1 à PC8 » | C | B24, B25 | — |
| #9 « 4 phases, du permis à la réception » | C | B7-B17 (permis), B26 (offres), B28 (situations, visas), B31-B32 (réception) | — |
| #10, #12, #56 PLU, PMR, ERP, RE2020 | B / C | B25 (familles plu, accessibilite, securite_incendie, re2020) | — |
| #11, #13 cote retrouvée partout ; une preuve par point | B | B25 (citations, correction), G29 | — |
| #14 « Ajouter un projet », « Déposer un dossier », « Réglages du projet » (`Produit.tsx:243`, `:265`, `:343`) | B | G1, G3 ; « Réglages du projet » → ligne `L/Controle.tsx:324-329` + F17 | — |
| #15 « Régler les contrôles » (`Produit.tsx:286`) | C | G24, F17 (b5_31) | depuis le chiffrage |
| #16 « Choisir qui décide » (`Produit.tsx:304`) | C | G28, F18 (b5_30) | depuis le chiffrage |
| #17 « Inviter l'équipe » (`Produit.tsx:324`) | C | B20, G4 (ajoute un compte **existant**) | aucune invitation |
| #18 « Suspendre un contrôle » (`Produit.tsx:364`) | D | G26, G27, F16 (b5_29) | depuis le chiffrage |
| #19 calendrier jusqu'à la purge | B | B7, B9-B16 | promesse centrale |
| #20 règles du PLU citées par article | B | B25 (article cité) | — |
| #21, #21b, #22 PLU, servitudes et risques depuis l'adresse | A / C | B23 (+ servitudes et risques) | encore dans `en-preparation.ts:78` |
| #23 pièces que le permis exigera | D | B24 | depuis le chiffrage |
| #24-27 analyse des offres, postes non chiffrés, écarts, rapport | D | B26, G36-G41 (b5_26) | « Analyse des offres sur DPGF » encore dans `en-preparation.ts:80` |
| #28 métré contre DPGF | C | B25 (famille `metre_dpgf`, tolérance F17) | encore dans `en-preparation.ts:81` |
| #29 décennales contre le lot | B | B33 | — |
| #30-33 situations contre le marché, BT, avancement déclaré contre constaté, retenue, avance, pénalités | C / D | B28 (b5_32 `:167-174`, b5_33 `:175-184`) ; avancement constaté saisi dans F29 | révision BT absente |
| #34 OS : montant et délai | B | B30 | masqué sans marché |
| #35-36 fond du visa (feu, Avis Technique, PV) | D | **aucun** | — |
| #37 bordereau VSO, VAO, refus | C | F28 (avis), pas de bordereau imprimable | — |
| #38-40 date butoir de visa, J-10, registre daté | B / C | B28 (visas), E17, E20 ; G7 (registre) | — |
| #41-43 toutes les planches relues ; alerte dès la réception | C | B25 ; alertes E14, E21 | — |
| #44, #46 question suivie jusqu'à la réponse ; 8 jours au point du matin | B / C | B29 (en suspens, âge), E28 ; texte de F15 `L/Controle.tsx:518` | — |
| #45 « Une question en un clic » | C | G34, F15 (b5_25) | encore dans `en-preparation.ts:82` |
| #47-48 point écarté non reconduit ; revérification à chaque indice | B | B25, G23, « Corrigés depuis l'indice » | — |
| #49 changements non signalés | C | B25 « Changements depuis l'indice » (`L/Controle.tsx:417-430`, b5_28) | — |
| #50 historique des indices | B | B25, sélecteur `:339-347` | encore dans `en-preparation.ts:87` |
| #51 bloquant, à vérifier, mineur | B | B25 (`L/Controle.tsx:30-34` dit « Majeur ») | libellé à aligner (CH#51) |
| #52 checklists, charte, « Contrôles définis avec vous » | C | partiel : F17 ; **pas d'éditeur de listes** | `en-preparation.ts:83`, `:88`, `:90` |
| #53 Questions posées au dossier | D | **aucun** | `en-preparation.ts:79` |
| #54 nomenclatures | D | **aucun** | — |
| #55 DTU | C | B25 (citations) | — |
| #57 rapport PDF annoté et Excel | B | G29, G30 | `en-preparation.ts:77` |
| #58 export Excel par lot | C | G7 (registre.xlsx, une feuille par lot) | `en-preparation.ts:84` |
| #59 Cerfa, RE2020, fonds BET | B | B25 (rôles cerfa, re2020, bet) | — |
| #60 complétude du DOE | B | B32, E31 | — |
| #61 comptes rendus rédigés | C | B29, G54, G57 | sans photos |
| #62 réserves jusqu'à la GPA | B | B31, E29, E30 | — |
| #63 honoraires par phase contre temps passé | B | B27, E12, E13 | `en-preparation.ts:85` |
| #64 dossier daté, « Dossier de défense décennale » | C | G7 (`L/dossier-date.ts:1-15`) | `en-preparation.ts:86` |
| #65 bureaux d'études invités | C | B22 (sans compte invité) | — |
| #66 DWG ; « Import depuis vos plateformes » | D / T | **aucun** | `en-preparation.ts:89` |
| Texte d'en-tête de l'écran (« Les courriers de la mairie sont lus … Vous savez quand le chantier peut démarrer ») | — | B1 → B10, B7 (« Chantier sans risque dès le ») | — |

Promesses sans aucun bloc aujourd'hui :
- #7 (retrait des données) ;
- #35-36 (fond du visa) ;
- #53 (questions posées au dossier) ;
- #54 (nomenclatures) ;
- #66 (DWG) et l'import depuis les plateformes ;
- la charte (partie de #52).

Ces promesses ne perdent donc pas d'écran à la refonte, mais elles n'en ont pas.

---

## 8. Regroupements naturels et observations

### 8.1 Regroupement par sujet (phase de mission, `L/etats.ts:61-74`)

| Sujet | Blocs | Lignes de rendu (environ) | Entrées qui y mènent |
|---|---|---|---|
| Liste et tri des permis | B2, B4, B5 | 82 | — |
| Un permis (instruction jusqu'à la purge) | B7-B17, F7-F13 | 331 + 224 de fenêtres | E1-E3, E5-E9 |
| Fiche projet (identité, équipe, lots, intervenants) | B18-B22, F1, F4-F6 | 102 + 156 | — |
| Urbanisme et pièces du PC | B23, B24 | 118 | E22, E23 |
| Contrôle du dossier (études, indices) | B25, F14-F19 | 144 + 189 | E21 |
| Consultation des entreprises | B26, F20-F21 | 133 + 67 | — |
| Chantier : argent et documents | B28, B30, F24-F28, F33-F35 | 178 + 285 | E14-E20, E26, E27 |
| Chantier : visites et questions | B29, F29-F32 | 74 + 145 | E28 |
| Réception, GPA, DOE | B31, B32, F36-F39 | 95 + 120 | E29-E31 |
| Assurances | B33, F40-F42 | 70 + 97 | E24, E25 |
| Gestion de l'agence (honoraires, temps) | B27, F22-F23 | 81 + 70 | E12, E13 |
| Courrier entrant non rattaché | **aucun bloc** | — | E4, E10, E11, E18 |

### 8.2 Fréquence d'usage

**Quotidien** :
- B2, B4 ;
- B9, B10, B11 (ce qui attend un membre) ;
- B12, B15 ;
- B25 (constats ouverts, en phase d'études) ;
- B28 (situations et visas à viser, en phase chantier) ;
- B29 (hebdomadaire) ;
- G42 (saisie des temps).

**Ponctuel** :
- G1, G2, G3 ;
- B16, B17, B23, B24 ;
- B26 (phase ACT) ;
- B30 ;
- B31, B32 (réception) ;
- B33 ;
- les exports G7, G29, G30, G38, G39, G57.

**Réglage** (une fois par projet ou rarement) :
- B20, B21, B22 ;
- F12 (régime) ;
- F17 (régler les contrôles), F18 (décideur) ;
- F22 (éléments de mission) ;
- F24 (marché), F35 (délai), F41 (activités), F42 (ouverture du chantier).

### 8.3 Observations (faits)

- **O1 — Un seul défilement.**
  - Avec un permis ouvert, la colonne de droite empile jusqu'à 11 cartes du permis (B7-B17), puis une seule
    `<section>` projet. Celle-ci contient 5 parties propres et 11 sous-blocs (`L/EcranLorani.tsx:792-802`).
  - Cela fait environ 27 sections sous le permis, sans sommaire ni ancre.
  - Le rendu cumulé de B23 à B33 représente environ 890 lignes ; leurs fichiers, fenêtres comprises, environ 3 360.
- **O2 — `?projet=` atterrit sur un permis.**
  - 22 des 31 entrées passent par `lorani_lien_projet` (E4, E11-E31), plus E5 quand le permis est inconnu. Elles
    visent un sujet de projet : honoraires, situations, visas, contrôle, PLU, décennales, OS, réserves, GPA, DOE,
    points.
  - Elles ouvrent le premier permis du projet (`L/EcranLorani.tsx:178-181`). Le bloc visé se trouve plus bas, dans
    ProjetCarte, sans ancre.
  - Aucune entrée ne désigne le contrôle, la situation, le visa ou la réserve en particulier. L'id est pourtant dans
    `detail` (par exemple `'controle'`, `'reserve'`, `'visa'`), mais le lien ne le porte pas.
- **O3 — Quatre alertes sans endroit pour les traiter.**
  - E10 : courriel à ranger, lien nu `/espace/lorani`.
  - E11 : courriel sans pièce jointe, dont le corps n'est montré nulle part.
  - E4 : sursis à statuer.
  - E18 : situation lue à ranger. Il n'existe pas de geste « rattacher », et le type `lorani_situation_travaux`
    s'affiche « Courrier » dans B17.
- **O4 — `objet_type` incohérent.**
  - Le point du matin et l'envoi écrivent `lorani_projet` (`S/:1003`, `:1069` ; `M/b5_03_rappels_envoyes.sql:63`).
  - L'aiguillage n'a de règles que pour `lorani_permis` et `lorani_projets` (`components/espace2/aiguillage.ts:78-79`).
  - Le point du matin s'en sort par le `lien`. La demande à valider du rappel (E8) atterrit sur `/espace2/lorani` sans
    paramètre.
  - Le vérificateur (`outils/verifier-aiguillage.mjs:41`) ne lit pas `S/`.
- **O5 — Le courriel de rappel (E7) n'utilise pas `lorani_lien_permis`.** Il compose `espace_url + '/lorani?permis='`
  (`M/b5_03_rappels_envoyes.sql:67`). Toute nouvelle sous-page devra garder `/espace2/lorani?permis=` vivant :
  courriels déjà partis, lignes de point du matin déjà stockées (`components/espace2/aiguillage.ts:8-11`).
- **O6 — Des points invisibles.**
  - G34 (question depuis un constat) et G69 (demande DOE sans CR brouillon) créent des `lorani_points` avec
    `ouvert_au_cr` nul.
  - Ils ne s'affichent que dans « En suspens » d'un CR dont la visite est postérieure à leur création
    (`L/cr.ts:34`, `:41`).
  - S'il n'y a pas de CR, ou si le dernier est plus ancien, la question n'est visible **nulle part**, alors que E28 y
    renvoie.
- **O7 — Le dépôt de toutes les pièces passe par F3, nommée « courrier de la mairie ».**
  - Cela vaut pour les planches, le CCTP, la DPGF, les attestations, les offres et les situations.
  - B25, B26 et B33 disent « Déposez … comme « X » » sans bouton de dépôt dans le bloc.
  - B26 demande le type « Offre d'une entreprise » (`L/Offres.tsx:156`), **absent** de la liste des types
    (`L/etats.ts:166-183`).
- **O8 — Les dates lues à l'échelle du projet ne sont pas comptées.** Une date lue sans permis
  (`permis_id` nul, « Permis à choisir ») n'entre dans aucun compteur (B2) ni aucune pastille (B4)
  (`L/EcranLorani.tsx:135`, `:143`). Elle s'affiche pourtant dans B10 de chaque permis du projet
  (`L/PermisVue.tsx:123`).
- **O9 — Doublons.**
  - Deux boutons ouvrent la même saisie de décision : G10 « Saisir la décision reçue » (B9) et G17 « Arrêté reçu » (B11).
  - Deux chemins créent un marché : G48 « Nouveau marché » (B28) et G40 « Retenir » (B26).
  - Deux dates de début de chantier : `ouverture_chantier` (G73, B33) et `demarrage_le` (OS de démarrage, B30).
  - Les lots s'affichent dans B21 et servent de liste dans B26, B28, B31, B32 et B33.
  - Six exports dans quatre blocs : G7, G29, G30, G38, G39, G57.
- **O10 — Ordre interne.**
  - Le commentaire d'en-tête de PermisVue numérote 1 à 6 (`L/PermisVue.tsx:9-18`), mais le rendu place les
    avertissements (5) et l'avis « 4 bis » avant les échéances (3).
  - Dans ProjetCarte, Honoraires (gestion de l'agence) s'intercale entre Offres et Chantier.
  - Assurances, nécessaires dès l'attribution, vient en dernier.
  - PiecesPermis (sujet du permis) est dans la carte projet, pas sous le permis.
- **O11 — Gestes sans confirmation**, dont deux à effet fort :
  - G56 « Diffuser » fige le CR de façon opposable et irréversible ;
  - G69 « Demander les pièces manquantes » pose des questions aux entreprises, que le socle relance ;
  - sans fenêtre non plus : G25, G27, G35, G37, G44, G45, G59, G67, G68, G72.
- **O12 — Droits inégaux.**
  - G42 (temps) n'exige que `moi` : un lecteur voit le bouton actif.
  - Les exports (G7, G29, G30, G38, G39, G57) ne sont jamais grisés.
  - B11 et le bouton Régime disparaissent pour un lecteur ; les autres boutons sont seulement grisés.
- **O13 — Le temps réel ne couvre que 4 tables du permis** (`L/EcranLorani.tsx:94`). Chantier, contrôle, offres, CR,
  DOE et PLU ne se rafraîchissent qu'après un geste de la personne. Le PLU fait exception, avec sa relève propre.
- **O14 — Compteurs pendant le chargement.** Pendant le chargement réel, `dossier` vaut l'exemple
  (`L/EcranLorani.tsx:96`). B2, qui n'attend pas `pret`, montre un instant les compteurs de l'exemple.
- **O15 — Le sélecteur de contrôle, de consultation et de CR n'est pas dans l'URL.** Un lien ne peut pas viser le
  contrôle, la consultation ou le CR d'E21 ou E28.
- **O16 — B30 disparaît sans marché** (`L/OrdresService.tsx:126`). Tous les autres sous-blocs restent affichés vides
  avec une consigne.
- **O17 — Le chiffrage est en retard sur le code.** `lib/en-preparation.ts:76-91` garde 14 pastilles, dont 8 ont un
  bloc : #57 G29, #21 B23, #24 B26, #45 G34, #58 et #64 G7, #63 B27, #50 B25.
- **O18 — Un même jeu de données pour tout.** `chargerDossier` lit 28 requêtes en parallèle à chaque ouverture et
  après chaque geste (`L/portes.ts:67-107`). Elles portent sur tous les projets, sans filtre par projet.

### 8.4 Taille des fichiers (lignes)

| Fichier | Lignes | Fichier | Lignes |
|---|---|---|---|
| `L/PermisVue.tsx` | 932 | `L/Assurances.tsx` | 307 |
| `L/exemples.ts` | 812 | `L/Honoraires.tsx` | 278 |
| `L/EcranLorani.tsx` | 805 | `L/OrdresService.tsx` | 278 |
| `L/Controle.tsx` | 661 | `L/Reserves.tsx` | 233 |
| `L/types.ts` | 649 | `L/PluProjet.tsx` | 193 |
| `L/portes.ts` | 564 | `L/Doe.tsx` | 186 |
| `L/lorani.css` | 551 | `L/cr.ts` | 131 |
| `L/rapport.ts` | 487 | `L/dossier-date.ts` | 117 |
| `L/Chantier.tsx` | 463 | `L/rapport-offres.ts` | 113 |
| `L/ComptesRendus.tsx` | 368 | `L/pieces-exigees.ts` | 83 |
| `L/Offres.tsx` | 353 | `L/montants.ts` | 48 |
| `L/etats.ts` | 290 | `L/PiecesPermis.tsx` | 40 |
| | | `L/avancement.ts` | 18 |

---

**Totaux** :
- **75 blocs**, soit 33 blocs (B1-B33) et 42 fenêtres (F1-F42) ;
- **76 gestes** (G1-G76) ;
- **31 entrées** écrites en base ou en courriel (E1-E31), plus 5 versions remplacées ;
- 2 paramètres d'adresse lus (`permis`, `projet`) ;
- 10 points d'entrée dans le code.
