# Inventaire avant refonte — écran TIROMA (cabinet dentaire)

Relevé du 29/10/2026 sur la copie `refonte-metiers` (dernier commit 45c3aa89, à jour de origin/main). Lecture seule.
Écran : `/espace/tiroma` (`app/espace/tiroma/page.tsx:18`) et `/espace2/tiroma` (`app/espace2/tiroma/page.tsx:12`, même composant enveloppé dans `Habille`, `components/espace2/Habille.tsx:19`). Composant racine : `components/espace/tiroma/EcranTiroma.tsx`.

**Ce document est un contrat** : tout ce qui est listé ici (bloc, geste, fenêtre, état, condition d'affichage, mention santé) doit exister quelque part après la refonte.

**Conventions de citation** : un nom de fichier seul (`Creneaux.tsx:17`, `portes.ts:105`, `libelles.ts:148`) désigne `components/espace/tiroma/<fichier>` ; un nom `b3_NN_*.sql` désigne `omega/modules/tiroma/migrations/<fichier>` ; les autres chemins partent de la racine du dépôt. « Profil » = `tiroma_profils.profil` : `titulaire`, `assistante`, `collaborateur`, `direction` (ou aucun profil : `null`).

---

## 1. Entrées

### 1.1 Liens écrits en base vers l'écran (`'lien', '/espace/tiroma'`)

Tous passent par `private.deposer_section` (point du matin, table `points_sections`). Le dépôt b3_06 est remplacé par b3_21 (même fonction `private.tiroma_deposer_points`, mêmes lignes via `private.tiroma_section_lignes` de b3_06) : b3_21 ajoute le suffixe « — <centre> » aux titres quand la personne sert plusieurs centres (`b3_21_point_multi_sites.sql:73-87`) et sert la direction des entités parentes (`b3_21_point_multi_sites.sql:52-70`). Aucun lien ne porte d'ancre ni de paramètre : on arrive **en haut de l'écran** (voir 1.2).

| # | Fichier SQL:ligne | `objet_type` (→ `objet_id`) | Ce que désigne l'objet | Titre de section / gabarit de la ligne | Qui la reçoit | Où l'utilisateur devrait atterrir |
|---|---|---|---|---|---|---|
| E1 | `b3_06_point_du_matin.sql:52` | `tiroma_evenements_agenda` → `evenement_id` | le créneau libéré (annulation, report, déplacement) | Section « Créneaux à sauver » (`b3_06:143`, `b3_21:78`, ordre 10, santé = vrai). Ligne (`b3_06:44-50`) : « Annulation 12/10 à 09h30 (45 min, Fauteuil 2) : appeler 1. Nom (plan accepté) ; 2. … » ou « … : aucun patient ne convient ». 15 lignes max ; gravité `attention` (candidats) ou `info` | titulaire, assistante (tous) ; collaborateur (ses patients) | Bloc 8 « Créneaux à sauver » (`#tiroma-creneaux`, `Creneaux.tsx:17`), sur la ligne dont la clé est `evenement_id` (`Creneaux.tsx:28`), avec le bouton « Noter l'appel » de chaque candidat |
| E2 | `b3_06_point_du_matin.sql:66` | `tiroma_plans` → `plan_id` | le plan de traitement signé sans rendez-vous | Section « Plans sans rendez-vous » (`b3_06:151`, `b3_21:79`, ordre 20, santé = vrai). Ligne (`b3_06:58-63`) : « Nom : devis D123 signé il y a 34 jours, <séance> à poser (accord de mutuelle reçu) — expire dans 12 j ». 15 max ; `attention` si expire ≤ 30 j ou ≥ 42 j, sinon `info` | idem E1 | Bloc 9 « Plans sans rendez-vous » (`#tiroma-plans`, `Plans.tsx:49`), ligne de clé `plan_id` (`Plans.tsx:60`) ; le même plan est aussi au bloc 22 « Un créneau pour chaque plan » (`ComplementsCabinet.tsx:150`) |
| E3 | `b3_06_point_du_matin.sql:75-76` | variable selon la vérification (`b3_04_avant_rendez_vous.sql:169`) : `tiroma_travaux_labo` → `travail_id` (labo, `b3_04:71`) ; `tiroma_plans` → `plan.id` (devis_expire `b3_04:92`, mutuelle_accord `:103`, interruption `:148`) ; `tiroma_ententes_odf` → `id` (odf_accord `:125`, odf_semestre `:135`) ; implant : `tiroma_stock` sans id (`b3_04:79`) → la ligne n'a **pas** d'objet (`b3_06:76`) | la vérification à J-2 : travail de laboratoire, implant en stock, devis à échéance, accord de mutuelle, accord/semestre ODF, traitement interrompu | Section « Avant les rendez-vous » (`b3_06:159`, `b3_21:80`, ordre 25, santé = vrai). Ligne : « Nom — <texte de la vérification> » (`b3_06:74`). Seulement gravité ≠ `info` (`b3_06:71`), 20 max | idem E1 | Bloc 16 « Avant les rendez-vous » (`#tiroma-avant`, `AvantRendezVous.tsx:18`) ; pour les natures portant un `tiroma_plans`, aussi bloc 9 (pastilles expiration / mutuelle, fenêtre F1 « Noter la mutuelle ») |
| E4 | `b3_06_point_du_matin.sql:88` | `tiroma_fauteuils` → `fauteuil_id` | le fauteuil qui tourne à vide aujourd'hui | Section « Charge des fauteuils » (`b3_06:168`, `b3_21:81`, ordre 28, santé = faux). Ligne (`b3_06:84-87`) : « Fauteuil 2 : matinée vide (38 % prévu sur la journée, 4 rendez-vous) ; 2 soins exigent une assistante » ; gravité `attention` | titulaire seul (`b3_06:163`, `b3_21:82`) | Bloc 17 « Charge des fauteuils » (`#tiroma-charge`, `ChargeFauteuils.tsx:29`), carte du fauteuil (clé `fauteuil_id`, `ChargeFauteuils.tsx:48`) ; suites possibles : bloc 20 « Soins à regrouper », bloc 11 « Équipe absente » (soins exigeant une assistante) |
| E5 | `b3_06_point_du_matin.sql:95` | aucun | compteurs du cabinet, sans nom | Section « Cabinet dentaire — <centre> » (`b3_06:134`, `b3_21:68`, ordre 30, santé = faux). Ligne (`b3_06:91-94`) : « N créneau(x) libéré(s) à reprendre, N plan(s) signé(s) sans rendez-vous, N vérification(s) avant les rendez-vous. » ; `info` | direction (du centre ou d'une entité parente, `b3_21:52-70`) | Bloc 2 « Compteurs » (`EcranTiroma.tsx:386`). Attention : la direction ne voit ni la charge (bloc 17 en « réservé au titulaire ») ni les appels ; elle voit blocs 8, 9, 13, 14, 15, 16 |
| E6 | `b3_15_synthese_semaine.sql:282` | aucun | la dernière semaine complète du centre | Section « Synthèse de la semaine — <centre> » (`b3_15:281`, ordre 5, santé = faux), le lundi dès 5 h (`b3_15:261`, cron `tiroma-synthese` `b3_15:329`). Ligne (`b3_15:267`) : « Semaine du 13/10 au 19/10 : N rendez-vous, N manqué(s) (x %) ; réinscription x % ; N créneau(x) libéré(s) ; N devis signé(s) sur N présenté(s) (x €) ; N plan(s) signé(s) sans rendez-vous (x €) ; N appel(s), N rendez-vous repris. » | titulaire + direction de l'entité ou d'une parente (`private.tiroma_profils_synthese`, `b3_15:278`) | Bloc 13 « Synthèse de la semaine » (`#tiroma-synthese`, `SyntheseSemaine.tsx:37`) |
| E7 | `b3_19_demi_journees_vides.sql:258` | aucun | une demi-journée d'un praticien sous le seuil d'occupation | Section « Demi-journées vides — <centre> » (`b3_19:268`, ordre 6, santé forcée par le socle), J à J+7, 8 lignes max (`b3_19:261`), cron `tiroma-demi-journees` (`b3_19:306`). Ligne (`b3_19:251-256`) : « Dr X, 14/10 matin : 2 h 30 libre(s) sur 4 h ; 3 patient(s) en liste d'attente. » ; `attention` si J ou J+1 | titulaire seul (`b3_19:265`) | Bloc 19 « Demi-journées vides » (`#tiroma-demi-journees`, `DemiJournees.tsx:39`) — **pas** le compteur « Demi-journées vides » du bloc 2, qui renvoie au bloc 17 (voir § 8) |
| E8 | `b3_10_gabarit_point.sql:27` | — (courriel) | gabarit global `tiroma.point_matin`, courriel de compteurs sans donnée de santé (`b3_10:11-13`) | Sujet « Point du matin du {{jour}} — {{entite}} » (`b3_10:21`) ; corps : 4 compteurs (créneaux, plans, vérifications, demi-journées vides) + « Le détail, avec les patients à appeler, est dans votre espace : https://app.omegaai.fr/espace/tiroma » | destinataires du point par courriel | URL **absolue** vers `/espace/tiroma` (non réécrite vers `/espace2`) : haut de l'écran, compteurs (bloc 2) |

### 1.2 Comment ces liens arrivent à l'écran

| Entrée | fichier:ligne | Effet |
|---|---|---|
| Point du matin, ancien espace | `components/espace/point/PointDuMatin.tsx:243-246` | lien « Ouvrir » vers `l.lien` tel quel (`/espace/tiroma`) ; `objet_id` affiché en texte (`PointDuMatin.tsx:250`) mais non transmis |
| Point du matin, nouvel espace | `components/espace2/Point.tsx:48`, `:248`, `:333` | `lienV2` réécrit `/espace…` en `/espace2…` → `/espace2/tiroma` ; libellé « Ouvrir » (critique) ou « Examiner » (`Point.tsx:249`) ; `objet_id` affiché en méta (`Point.tsx:255`), non transmis |
| Paramètres d'adresse lus par l'écran | — | **Aucun.** Ni `useSearchParams`, ni `searchParams`, ni `location.hash` dans `components/espace/tiroma/`, `app/espace/tiroma/`, `app/espace2/tiroma/`. `objet_type`/`objet_id` ne servent à rien côté écran. Les seuls sauts internes sont les 4 compteurs (`aller`, `EcranTiroma.tsx:363`) vers `#tiroma-creneaux`, `#tiroma-plans`, `#tiroma-avant`, `#tiroma-charge` |
| Ancres présentes mais jamais visées | composants | `#tiroma-absences` (`Absences.tsx:23`), `#tiroma-equipe` (`EquipeAbsente.tsx:133`), `#tiroma-appels` (`Appels.tsx:111`), `#tiroma-synthese` (`SyntheseSemaine.tsx:37`), `#tiroma-reinscription` (`Reinscription.tsx:24`), `#tiroma-pilotage` (`Pilotage.tsx:44`), `#tiroma-objectifs` (`Objectifs.tsx:83`), `#tiroma-demi-journees` (`DemiJournees.tsx:39`), `#tiroma-soins-a-deplacer` (`ComplementsCabinet.tsx:57`), `#tiroma-seances-longues` (`:101`), `#tiroma-creneaux-plans` (`:139`), `#tiroma-controles` (`:183`), `#tiroma-rappels` (`Rappels.tsx:89`), `#tiroma-attente` (`ListeAttente.tsx:101`), `#tiroma-regles-communes` (`ReglesCommunes.tsx:70`), `#tiroma-donnees` (`ComplementsCabinet.tsx:256`), `#tiroma-cabinet` (`Cabinet.tsx:98`) |

### 1.3 Alertes du module (sans lien)

`private.lever_alerte_module(…, 'tiroma', …)` ne porte pas de lien vers l'écran. Pour mémoire, où l'utilisateur devrait les traiter :

| fichier:ligne | Alerte (titre) | Gravité | Endroit de l'écran concerné |
|---|---|---|---|
| `b3_06_point_du_matin.sql:176` (remplacée par `b3_21_point_multi_sites.sql:103`) | « Le point du matin du cabinet n'a pas pu être déposé. » | attention | Bloc 28 « Le cabinet » (état, relevés) |
| `b3_14_rappels_patients.sql:449` | « Un patient annonce qu'il ne viendra pas le … : libérez le créneau dans le logiciel du cabinet. » (objet `rendez_vous`, `patient`) | attention | Bloc 24 « Rappels », sous-partie « Réponses reçues » (`Rappels.tsx:131-145`, phrase « Libérez le créneau… » `:140`) ; le rendez-vous apparaît aussi en tête du bloc 10 « Absences probables » (niveau `annonce`, `Absences.tsx:15`) |
| `b3_14_rappels_patients.sql:454` | « Réponse à lire au rappel du rendez-vous du … » | attention | Bloc 24, « Réponses reçues » (pastilles « À lire » / « Autre adresse », `libelles.ts:180-181`) |
| `b3_15_synthese_semaine.sql:287` | « La synthèse de la semaine n'a pas pu être déposée. » | attention | Bloc 13 |
| `b3_19_demi_journees_vides.sql:273` | « Les demi-journées vides n'ont pas pu être déposées au point du matin. » | attention | Bloc 19 |
| `omega/SOCLE-EXTRAITS-TIROMA.sql:2084`, `:2104` (socle, pas une migration du module) | « La mesure de Tiroma n'a pas pu se faire » (soir / matin) | critique | Bloc 28 (mode, relevés) |
| `omega/SOCLE-EXTRAITS-TIROMA.sql:3507` (socle) | « Tiroma n'a pas reçu l'export « … » de votre logiciel ce matin … » | attention | Bloc 28.2 « Relevés du logiciel » |

### 1.4 Autres écrans du dépôt qui mènent ici

| fichier:ligne | Lien |
|---|---|
| `components/espace/ecrans.ts:12` | entrée de navigation de l'ancien espace : `/espace/tiroma`, « Cabinet dentaire », court « TIROMA » |
| `components/espace2/modules.ts:100` | module `tiroma` du nouvel espace (« Cabinet dentaire », « Créneaux, fauteuils et liste d'attente ») ; **un seul onglet** « Vue d'ensemble » → `/espace2/tiroma` (défaut `modules.ts:56`) |
| `components/espace2/modules.ts:126` | `moduleMetier` : le secteur `dentaire` donne le module `tiroma` dans la barre |
| `components/espace2/Point.tsx:48` | réécriture des liens du point du matin (voir 1.2) |
| `components/espace/point/PointDuMatin.tsx:246` | « Ouvrir » des lignes du point du matin (ancien espace) |

---

## 2. Blocs

Ordre d'affichage = ordre du tableau (`EcranTiroma.tsx:366-486`). « Toujours » = dès qu'un dossier est chargé (exemple ou réel). La condition « profil » vient de deux endroits : la demande de données (`portes.ts:109-139`, une porte non demandée renvoie `null`) et le rendu (`EcranTiroma.tsx:457-482` + le `return null` du composant).

### 2.1 Cadre de l'écran et états

| N° | Titre affiché | Composant fichier:ligne | Emplacement | Données affichées | Source | Condition d'affichage |
|---|---|---|---|---|---|---|
| 1 | « Cabinet dentaire » (h1) + phrase « Tiroma lit l'agenda, les plans et les devis… sans y écrire… » | `EcranTiroma.tsx:368-383` (h1 `:370`, phrase `:371-373`) | haut | titre, promesse, sélecteur de cabinet, ruban de source | `monCompte` `portes.ts:37` (tables `comptes`, `entites`) ; `listerCabinets` `portes.ts:50` (`tiroma_cabinets`) | toujours ; sélecteur `:376-380` seulement en réel avec > 1 cabinet ; ruban `Ruban` (`components/espace/ui.tsx:57`) toujours. En /espace2, le h1 est masqué (titre dans la barre, `components/espace2/Habille.tsx:6-9`) |
| 2 | Compteurs : « Créneaux à sauver » · « Plans sans rendez-vous » · « Avant les rendez-vous » · « Demi-journées vides » | `EcranTiroma.tsx:386-407` (calcul `:354-361`) | sous l'en-tête | créneaux `libre` ; nombre de plans ; vérifications ≠ info (+ nombre de critiques) ; `charge.demi_journees_vides` | calcul local sur le dossier | dès qu'un dossier existe ; 4e compteur : valeur « — » et « réservé au titulaire » si non-titulaire (`:404-405`). Chaque compteur est un bouton qui fait défiler vers sa carte (`:387`, `:392`, `:397`, `:402`) |
| 3 | Avis rouge « La base réelle n'a pas répondu. » + message | `EcranTiroma.tsx:410` | sous les compteurs | message d'erreur brut de la base | `charger` `:107-110`, `installer` `:347` | erreur en réel |
| 4 | Avis ambre « Lecture partielle. » + liste des portes en échec | `EcranTiroma.tsx:411` | idem | « <quoi> : <message> » par porte | `chargerDossier` → `quiet` `portes.ts:83-90` | réel, au moins une porte en échec |
| 5 | « Lecture de votre cabinet… » / « Lecture du cabinet… » | `EcranTiroma.tsx:413-414`, `:452-453` | corps | chargement | — | réel, avant réponse ; puis cabinet trouvé mais dossier en lecture |
| 6 | « Aucun compte rattaché » | `EcranTiroma.tsx:415-416` | corps | « Cette session n'est rattachée à aucune organisation. » | `monCompte` = null (`portes.ts:41-44`) | réel, pas de ligne `comptes` |
| 7 | « Installer le cabinet » | `EcranTiroma.tsx:417-451` | corps (remplace tout) | gérant : formulaire Entité / Logiciel de cabinet (`LOGICIELS` `libelles.ts:6`) / Version (facultatif) / Qui voit les patients (Tout le cabinet / Chaque praticien, les siens) + bouton « Installer <logiciel> » ; non-gérant : « Aucun cabinet installé » (`:422`) | `compte.entites` ; écriture `installerCabinet` (geste G1) | réel, aucun cabinet ; formulaire si `compte.role === "gerant"` (`:421`) |

### 2.2 Cartes du cabinet (dossier chargé)

| N° | Titre affiché | Composant fichier:ligne | Emplacement (`EcranTiroma.tsx`) | Données affichées | Source (portes.ts → rpc / table) | Condition d'affichage |
|---|---|---|---|---|---|---|
| 8 | « Créneaux à sauver » | `Creneaux.tsx:15-82` | `:457`, grille 2 colonnes, gauche | par créneau : type (annulation/report/déplacement), famille, « Déjà repris », date → fin, durée, fauteuil, praticien, « Libéré le » ; candidats ordonnés (rang, nom, origine plan/attente/contrôle, « hors préférences », motif, durée, dernier appel) ; « Aucun patient ne convient… » ; « L'assistante appelle dans cet ordre ; le rendez-vous se pose dans le logiciel du cabinet. » | `portes.ts:105` → rpc `tiroma_creneaux_a_sauver` (b3_02) ; horizon `regles.horizon_creneaux_jours` (défaut 2) ; derniers appels `appels.derniers` (rpc `tiroma_appels`) | toujours ; bouton « Noter l'appel » si registre des appels chargé et patient contactable (`Creneaux.tsx:56`) |
| 9 | « Plans sans rendez-vous » | `Plans.tsx:21-117` | `:458`, grille, droite | par plan : ancienneté en jours (bleu < 21 ≤ ambre < 42 ≤ rouge), mutuelle (« Accord de mutuelle reçu » ou statut), « Expire dans N j » (≤ 30), « À vérifier », « Ne pas contacter », montant + reste à charge, patient — séance à poser (n°), devis + date de signature, praticien, actes faits / à faire + durée, « Famille : N proches à planifier dans la foulée », dernier appel | `portes.ts:106` → rpc `tiroma_plans_sans_rendez_vous` (b3_03) ; mutuelle b3_07 | toujours ; « Noter la mutuelle » toujours présent (`Plans.tsx:78`) ; « Noter l'appel » si registre chargé et patient contactable (`:79`) ; fenêtre F1 |
| 10 | « Absences probables » | `Absences.tsx:20-56` | `:460` | rendez-vous des 3 jours à risque : niveau (« A annoncé son absence », « Absence probable », « Risque d'absence », `Absences.tsx:14-18`), patient — date, raisons, praticien, fauteuil | `portes.ts:122` → rpc `tiroma_absences_probables` (b3_17, p_jours 3) | profil ≠ direction et non nul ; « Noter l'appel » sauf si le patient a annoncé (`:43`) |
| 11 | « Équipe absente » | `EquipeAbsente.tsx:108-181` | `:461-462` | sous-titre « N soins à basculer sur sept jours » ; par absence : motif (Congé/Arrêt/Formation/Autre), membre — fauteuil, du/au, « Clore l'absence » ; soins prévus exigeant une assistante : patient — date, soin, « Vers <fauteuil> (avec <assistante>) » ou « Aucun fauteuil libre » ; note « Le basculement se fait dans le logiciel du cabinet » | `portes.ts:124` → rpc `tiroma_soins_a_basculer` (b3_18, 7 j) ; `membres` ← table `tiroma_membres` (`portes.ts:97`) | profil titulaire ou assistante (`EcranTiroma.tsx:461`) ; « Noter une absence » si au moins un membre actif (`:138`) ; fenêtre F2 |
| 12 | « Appels » | `Appels.tsx:105-165` | `:463` | 4 tuiles : Appels (patients, jours) · Rendez-vous repris (confirmés / notés) · Plans remis à l'agenda (montant, titulaire seul `:130-131`) · Fauteuil repris (heures) ; avis « N patients ont demandé à ne plus être contactés… reportez-le dans le logiciel » ; liste à reprendre (issue, « Aujourd'hui » ou date, nb d'appels, patient — motif, dernier appel par qui) | `portes.ts:112` → rpc `tiroma_appels` (b3_12, 30 j) | profil ≠ direction et non nul (sinon `null`, `Appels.tsx:106`) |
| 13 | « Synthèse de la semaine » | `SyntheseSemaine.tsx:32-91` | `:464` | 4 tuiles (manqués, devis signés, signé sans rendez-vous, créneaux libérés + appels) ; tableau par centre (rendez-vous, manqués, écart, réinscription, créneaux libérés, devis, sans rendez-vous, appels) ; « Le lundi matin, la même synthèse arrive au point du matin… » | `portes.ts:118` → rpc `tiroma_synthese_semaine` (b3_15, `p_entite` null = tous les centres) | profil titulaire ou direction et au moins un centre (`SyntheseSemaine.tsx:33`) |
| 14 | « Réinscription » | `Reinscription.tsx:19-85` | `:465` | taux (ambre < 60 %), écart, « Repartis sans suite » ; tableau par praticien ; liste « Vus sans prochain rendez-vous » (vu le, patient, praticien) | `portes.ts:120` → rpc `tiroma_reinscription` (b3_16, 30 j) | profil titulaire, assistante ou direction ; tableau par praticien si renvoyé ; noms remplacés par « Patient du cabinet » pour la direction (« Noter l'appel » masqué alors, `:71`) |
| 15 | « Pilotage » | `Pilotage.tsx:34-142` | `:466` | sous-titre « Du … au … · réservé au titulaire » ; 4 tuiles (devis acceptés + écart, signé sans rendez-vous, devis sans réponse / à relancer / expirent, rendez-vous manqués) ; tableaux « Par panier » (`PANIERS` `libelles.ts:167`) et « Manqués par praticien » ; liste « Devis à relancer » (panier, « Expire le », montant, patient — devis, présenté le) | `portes.ts:114` → rpc `tiroma_pilotage` (b3_13, 30 j) | profil titulaire ou direction ; « Noter l'appel » si registre chargé (donc pas pour la direction) |
| 16 | « Avant les rendez-vous » | `AvantRendezVous.tsx:15-46` | `:468`, grille gauche | « À J-N : n vérifications, k critiques » ; lignes : gravité, nature (`NATURES_VERIF` `libelles.ts:67`), date, patient, texte ; « critique d'abord » | `portes.ts:107` → rpc `tiroma_avant_rendez_vous` (b3_04, `p_jours` null) ; J-N = `regles.labo_verif_jours` (défaut 2) | toujours |
| 17 | « Charge des fauteuils » | `ChargeFauteuils.tsx:27-70` | `:469`, grille droite | date + taux prévu ; « N demi-journées sous x % : des soins à déplacer, ou un créneau à proposer » ; par fauteuil : nom, capacités, « Journée/Matin/Après-midi vide », jauges matin / après-midi, rendez-vous, assistante habituelle, « N soins exigent une assistante : à basculer », objectif | `portes.ts:110` → rpc `tiroma_charge_fauteuils` (b3_05) | toujours rendu ; contenu « Vue réservée au titulaire » si non-titulaire (`:35-36`) ; « Aucun fauteuil ou aucun horaire… Posez-les dans la carte « Le cabinet » » (`:38`) |
| 18 | « Objectifs par fauteuil » | `Objectifs.tsx:77-128` | `:471` | « N fauteuils sur M à l'objectif au moins une semaine sur deux » ; tableau fauteuil × objectif × 4 semaines réalisées + cette semaine + la suivante (prévu), « Tenu », bouton « Fixer » / « Changer » ; note « Vous seul voyez cette carte » | `portes.ts:128` → rpc `tiroma_objectifs_fauteuils` (b3_20, 4 semaines) | titulaire et au moins un fauteuil (`Objectifs.tsx:79`) ; fenêtre F4 |
| 19 | « Demi-journées vides » | `DemiJournees.tsx:34-78` | `:472` | « N demi-journées à remplir, X libres sur quatorze jours » ; par demi-journée : « Demain »/« Aujourd'hui », « Aucun rendez-vous » ou « Occupée à x % », (praticien —) jour, moment, libre/ouvert, patients en liste d'attente, « D'après ses demi-journées habituelles » ; note de confidentialité selon profil (`:70-74`) | `portes.ts:126` → rpc `tiroma_demi_journees_vides` (b3_19, 14 j) | profil titulaire (tous les praticiens) ou collaborateur (le sien) |
| 20 | « Soins à regrouper » | `ComplementsCabinet.tsx:52-94` | `:473` | demi-journées à vide (2 j) : « Peut se libérer » / « Un soin reste sans place », taux, fauteuil — jour, moment ; soins (heure, patient, soin → fauteuils possibles avec taux et assistante) ; « Tiroma ne déplace rien… » | `portes.ts:135` → rpc `tiroma_soins_a_deplacer` (p_jours 2) — **absente des migrations du dépôt** (§ 8) | titulaire |
| 21 | « Séances longues mal placées » | `ComplementsCabinet.tsx:98-131` | `:474` | séances ≥ 1 h ou chirurgies sur 7 j : nb de problèmes, minutes, jour, plage, patient, soin · fauteuil · praticien, raisons | `portes.ts:136` → rpc `tiroma_seances_mal_placees` (p_jours 7) — **absente des migrations** | titulaire, assistante, collaborateur (`portes.ts:133`) |
| 22 | « Un créneau pour chaque plan » | `ComplementsCabinet.tsx:135-174` | `:475` | « N plans sur M trouvent une place sous quatorze jours » ; par plan : nb de créneaux, durée, patient — devis, séance · praticien, jusqu'à 3 créneaux (jour, plage, fauteuil) | `portes.ts:137` → rpc `tiroma_creneaux_pour_plans` (14 j, max 3) — **absente des migrations** | titulaire, assistante, collaborateur |
| 23 | « Contrôles dus » | `ComplementsCabinet.tsx:178-225` | `:476` | « N patients sans contrôle depuis plus de X mois » ; 8 premiers puis « Voir les N » ; par patient : mois (rouge « Jamais de contrôle », ambre ≥ 2× seuil), nom, dernier contrôle, praticien ; patients « ne pas contacter » comptés à part | `portes.ts:138` → rpc `tiroma_controles_dus` (limite 200) — **absente des migrations** | titulaire, assistante, collaborateur ; **pas** de bouton « Noter l'appel » |
| 24 | « Rappels aux patients » | `Rappels.tsx:33-228` | `:477` | pastille du mode (Essai / En service / Coupés / Non réglés, `:93`) ; texte HDS (`:100-102`) ; colonne « Moyens de contact » (canal, Rappels/Relances, patient, adresse, accord + date, « Retirer ») ; « Réponses reçues » (15 j : Confirme / Ne viendra pas / À lire / Autre adresse, patient — rendez-vous, reçue, « Libérez le créneau… ») ; « Derniers rappels » (8 : type, statut d'envoi, patient · canal, préparé, essai, verrou) | `portes.ts:116` → rpc `tiroma_rappels` (b3_14) | profil ≠ direction et non nul (sinon `null`, `Rappels.tsx:66`) ; écriture si `peutEcrire` (`EcranTiroma.tsx:477`) ; fenêtre F5 |
| 25 | « Liste d'attente » | `ListeAttente.tsx:32-209` | `:478` | « N patients veulent venir plus tôt » ; par patient : nom, famille, « Patient gêné », « Inscrit ici » / « Logiciel », depuis le, durée, praticien ou « tout praticien », préavis, « Retirer » ; avis « C'est fait. » | `listerAttente` `portes.ts:147` → table `tiroma_liste_attente` (`retire_le` null, tri `ajoute_le`) + noms `tiroma_patients` (« Patient (hors de votre périmètre) » si RLS, `:156`) ; praticiens `tiroma_praticiens` | toujours ; boutons si profil non nul et ≠ direction ; fenêtres F6, F7 |
| 26 | « Règles communes » | `ReglesCommunes.tsx:49-126` | `:479` | « N écarts » / « Mêmes règles partout » ; tableau règle × centre (`LIBELLES` `:16-36`) ; « Restent propres à chaque centre : la réserve d'urgences, les garde-fous d'import et l'objectif de production. » | `portes.ts:130` → rpc `tiroma_regles_communes` (b3_22) | titulaire et ≥ 2 centres (`:54`) ; « Aligner sur ce centre » si écarts (`:75`) ; fenêtre F8 |
| 27 | « Vos données » | `ComplementsCabinet.tsx:229-273` | `:480` | « Réservé au titulaire » ; texte (contenu de l'export, « données de santé : gardez-le sur un poste du cabinet ») ; bouton « Télécharger les données » | `exporterDonnees` `portes.ts:227` → rpc `tiroma_exporter_donnees` — **absente des migrations** | titulaire |
| 28 | « Le cabinet » | `Cabinet.tsx:37-508` | `:481`, dernière carte | voir sous-sections 28.1 à 28.9 | `listerCabinets` (`tiroma_cabinets`) + tables `portes.ts:95-103` | toujours ; actions titulaire seul |
| 29 | Fenêtre globale « Noter l'appel — <patient> » | `Appels.tsx:42-103` | `:482` (rendue dans la grille, ouverte par `setCibleAppel`) | « Pour le <motif> » ; issues (`ISSUES_APPEL` `libelles.ts:148`) ; date « Rappeler le » ; note « Ne plus contacter » | voir geste G2 | ouverte depuis les blocs 8, 9, 10, 12, 14, 15 |

### 2.3 Sous-sections de la carte « Le cabinet » (bloc 28)

| N° | Titre affiché | Cabinet.tsx | Données | Source | Condition |
|---|---|---|---|---|---|
| 28.1 | (en-tête) statut, mode, « N relevés douteux de suite » ; fiche Entité / Logiciel / Point du matin (heure) / Dernier relevé / Dernier relevé sûr / Partage ; boutons d'état | `:99-135` | `STATUTS_CABINET` `libelles.ts:20` ; `heure_point` | `tiroma_cabinets` | boutons titulaire ; « Brancher le logiciel » si statut `installation` (`:121`) ; « Couper » / « Réactiver » si non clos (`:129`) |
| 28.2 | « Relevés du logiciel » | `:137-168` | 6 derniers relevés : date, statut (`STATUTS_RELEVE` `libelles.ts:114`), mode (`MODES_RELEVE` `:122`) · voie, raison, compteurs d'ajouts/modifs/événements/disparitions | table `tiroma_releves` (30 derniers, `portes.ts:101`) | toujours ; texte vide différent titulaire / autres (`:141`) |
| 28.3 | « Ce que le logiciel tient » | `:170-182` | pastilles domaine : état (`DOMAINES_CAPACITE` `libelles.ts:98`, `ETATS_CAPACITE` `:107`), mesure en infobulle | table `tiroma_capacites` | si au moins une capacité |
| 28.4 | « Praticiens et équipe » | `:186-206` | praticiens (nom, métier, inactif) ; membres (prénom, « assistante », fauteuil habituel) | tables `tiroma_praticiens`, `tiroma_membres` | toujours ; « Ajouter un praticien » titulaire (`:189`) ; fenêtre F12 |
| 28.5 | « Fauteuils » | `:207-224` | nom, inactif, capacités, objectif | table `tiroma_fauteuils` | toujours ; « Ajouter un fauteuil » titulaire (`:210`) ; fenêtre F9 |
| 28.6 | « Horaires » | `:229-254` | tableau Jour / De / À / Pour (+ « Retirer ») ; horaires non exceptionnels triés (`:95`) | table `tiroma_horaires` | toujours ; « Ajouter un horaire » et « Retirer » titulaire (`:232`, `:247`) ; fenêtre F10 |
| 28.7 | « Fermetures et congés » | `:255-271` | nature (`NATURES_FERMETURE` `libelles.ts:90`), du / au, qui (praticien, fauteuil, tout le cabinet) | table `tiroma_fermetures` | toujours ; « Ajouter une fermeture » titulaire (`:258`) ; fenêtre F11 |
| 28.8 | « Vocabulaire du logiciel » | `:274-298` | « N types de rendez-vous à confirmer » ; tableau libellé source · catégorie / famille · labo · chirurgie / durée / état (Validé, Proposé (confiance), À classer) | table `tiroma_types_rdv` | toujours ; « Classer » / « Modifier » titulaire (`:291`) ; fenêtre F13 |
| 28.9 | « Règles du cabinet » | `:300-314` | ordre pour un créneau libéré ; créneau minimal · nb de propositions ; horizon · délai d'appel ; contrôle dû · quota ; vérifications (labo J-N, devis, interruption) ; seuil de demi-journée vide ; « Les règles se fixent avec Omega à l'audit ; le titulaire peut les ajuster ici (durée et préférences tenues : oui/non) » | table `tiroma_regles` | si règles lues ; sinon « Règles non lues » pour le titulaire (`:314`) ; **aucun bouton** d'ajustement (voir § 8) |

### 2.4 Fenêtres (dialogues)

| N° | Titre | fichier:ligne | Ouverte depuis | Champs |
|---|---|---|---|---|
| F1 | « La mutuelle, devis <n°> » | `Plans.tsx:87-114` | bloc 9 « Noter la mutuelle » | Où en est la mutuelle (`MUTUELLES` `libelles.ts:79`), Date, Note (facultatif, 200 car.) |
| F2 | « Noter une absence » | `EquipeAbsente.tsx:41-106` | bloc 11 | Qui (membres actifs), Du, Au (inclus), Motif codé (`MOTIFS_ABSENCE` `EquipeAbsente.tsx:21`), « Aucune raison médicale n'est demandée. » |
| F3 | « Noter l'appel — <patient> » | `Appels.tsx:42-103` | blocs 8, 9, 10, 12, 14, 15 | Ce qui s'est passé (6 issues), Rappeler le (si « À rappeler », J à J+180) |
| F4 | « Objectif — <fauteuil> » | `Objectifs.tsx:28-75` | bloc 18 « Fixer » / « Changer » | Objectif d'occupation (%) 1-100, vide = retirer |
| F5 | « Ajouter un moyen de contact » | `Rappels.tsx:173-225` | bloc 24 | Patient (recherche), Courriel, « Pas de SMS… », Rappel J-2, Relance plan/devis, Son accord (oral / écrit / formulaire), Preuve (facultatif, 300 car.) |
| F6 | « Inscrire un patient en liste d'attente » | `ListeAttente.tsx:136-183` | bloc 25 | Patient (recherche, « ne pas contacter » grisé), Soin attendu, Durée, Préavis, Praticien, « Patient gêné (douleur) » |
| F7 | « Retirer <patient> de la liste » | `ListeAttente.tsx:185-206` | bloc 25 « Retirer » | Motif (rendez-vous pris, date passée, renonce, doublon, autre) |
| F8 | « Aligner sur <centre> » | `ReglesCommunes.tsx:101-123` | bloc 26 | liste des règles qui changeront |
| F9 | « Ajouter un fauteuil » | `Cabinet.tsx:318-348` | 28.5 | Nom, Capacités (`CAPACITES` `libelles.ts:47`), Objectif (%) |
| F10 | « Ajouter un horaire » | `Cabinet.tsx:350-381` | 28.6 | Jour, De, À, Pour (cabinet / fauteuil) |
| F11 | « Ajouter une fermeture » | `Cabinet.tsx:383-416` | 28.7 | Nature, Du, Au (date-heure), Qui (cabinet / praticien / fauteuil) |
| F12 | « Ajouter un praticien » | `Cabinet.tsx:418-442` | 28.4 | Nom affiché, Métier (titulaire, collaborateur, salarié, orthodontiste, remplaçant) |
| F13 | « Classer « <type> » » | `Cabinet.tsx:444-474` | 28.8 | Famille, Durée par défaut, Travail de laboratoire, Chirurgie, Exige une assistante |
| F14 | « Passer en mode réel » / « Repasser à blanc » | `Cabinet.tsx:476-488` | 28.1 | texte d'effet seulement |
| F15 | « Réactiver / Couper / Clore le cabinet » | `Cabinet.tsx:490-505` | 28.1 | case « Clore définitivement plutôt que couper » (`:498`) |

---

## 3. Gestes (écritures et envois)

En exemple, chaque geste modifie le dossier en mémoire (pause de 250 ms) et n'écrit rien (§ 5). En réel, chaque geste relit tout le dossier ensuite (`charger(...)`). Les erreurs de la base s'affichent telles quelles dans la fenêtre ou la carte.

| G | Libellé | Bloc | Fonction appelée → rpc / table | Fenêtre de confirmation | Rôle requis (écran / base) | Après |
|---|---|---|---|---|---|---|
| G1 | « Installer <logiciel> » | 7 (`EcranTiroma.tsx:446`) | `installer` `EcranTiroma.tsx:339` → `installerCabinet` `portes.ts:188` → rpc `tiroma_installer_cabinet` **puis** insert `tiroma_profils` (profil titulaire pour l'installeur, `portes.ts:195`) | non (formulaire en ligne) | écran : `compte.role === "gerant"` (`:421`) ; base : porte du socle | relecture complète (`:345`) ; si le profil échoue : message « Le cabinet est installé, mais le profil… » (`portes.ts:196`) |
| G2 | « Noter » (l'appel) | 29 / F3 (`Appels.tsx:98`) ; ouvert par « Noter l'appel » : `Creneaux.tsx:57-60` (motif `creneau`), `Plans.tsx:79` (`plan`), `Absences.tsx:44` (`autre`), `Appels.tsx:156` (motif repris), `Reinscription.tsx:72` (`controle`), `Pilotage.tsx:132` (`devis`) | `noterUnAppel` `EcranTiroma.tsx:207` → `noterAppel` `portes.ts:292` → rpc `tiroma_noter_appel` (table `tiroma_appels`, b3_12:164) | F3 | écran : registre chargé (profil ≠ direction) ; base : titulaire, collaborateur, assistante (`b3_12_registre_appels.sql:123`) | fenêtre fermée, relecture ; la ligne « dernier appel » apparaît sous le patient (`DernierAppelLigne` `Appels.tsx:22`) |
| G3 | « Noter » (la mutuelle) | 9 / F1 (`Plans.tsx:111`) | `noter` `EcranTiroma.tsx:153` → `noterMutuelle` `portes.ts:279` → rpc `tiroma_noter_mutuelle` (b3_07) | F1 | écran : **aucune condition** (bouton visible pour tous, `EcranTiroma.tsx:458`) ; base : titulaire, collaborateur, assistante (`b3_07_mutuelle.sql:32`) | relecture ; journal `tiroma.mutuelle_notee` (`b3_07:47`) |
| G4 | « Noter » (absence d'un membre) | 11 / F2 (`EquipeAbsente.tsx:101`) | `noterUneAbsence` `EcranTiroma.tsx:263` → `noterAbsenceMembre` `portes.ts:303` → rpc `tiroma_noter_absence_membre` (table `tiroma_absences_membres`, b3_18:73) | F2 | titulaire, assistante (écran `:461` ; base `b3_18_assistante_absente.sql:63`) | relecture ; les soins à basculer s'affichent (en exemple : sans calcul, `EcranTiroma.tsx:262`) |
| G5 | « Clore l'absence » | 11 (`EquipeAbsente.tsx:151`) | `cloreUneAbsence` `EcranTiroma.tsx:280` → `retirerAbsenceMembre` `portes.ts:313` → rpc `tiroma_retirer_absence_membre` | **non** (clic direct) | titulaire, assistante (`b3_18:94`) | relecture ; l'absence reste dans l'historique (`portes.ts:312`) |
| G6 | « Enregistrer » (objectif) | 18 / F4 (`Objectifs.tsx:70`) | `fixerUnObjectif` `EcranTiroma.tsx:290` → `fixerObjectif` `portes.ts:242` → update `tiroma_fauteuils.objectif_occupation` | F4 | titulaire (écran `:471` ; base : RLS) | relecture ; en exemple, les semaines sont recalculées contre le nouvel objectif (`EcranTiroma.tsx:296-304`) |
| G7 | « Noter » (moyen de contact) | 24 / F5 (`Rappels.tsx:220`) | `noterUnContact` `EcranTiroma.tsx:234` → `noterContact` `portes.ts:320` → rpc `tiroma_noter_contact` (table `tiroma_contacts` + registre des consentements, b3_14:146) | F5 | écran : profil non nul ≠ direction ; base : titulaire, collaborateur, assistante (`b3_14:109`) | avis « C'est fait. … noté, avec son accord. » (`Rappels.tsx:79`) ; relecture |
| G8 | « Retirer » (moyen de contact) | 24 (`Rappels.tsx:122`) | `retirerUnContact` `EcranTiroma.tsx:253` → `retirerContact` `portes.ts:330` → rpc `tiroma_retirer_contact` (`p_motif` null) | **non** ; l'erreur éventuelle n'est pas affichée (`void retirer(c)`) | idem G7 (`b3_14:172`) | relecture |
| G9 | « Inscrire » | 25 / F6 (`ListeAttente.tsx:180`) | `inscrire` `EcranTiroma.tsx:181` → `ajouterAttente` `portes.ts:172` → rpc `tiroma_ajouter_attente` (b3_09) ; recherche `chercherPatients` `portes.ts:160` (lecture `tiroma_patients`) | F6 | écran : profil non nul ≠ direction ; base : titulaire, collaborateur, assistante (`b3_09_liste_attente.sql:29`) | avis « C'est fait. X est en liste d'attente. » ; relecture |
| G10 | « Retirer » (liste d'attente) | 25 / F7 (`ListeAttente.tsx:203`) | `retirer` `EcranTiroma.tsx:195` → `retirerAttente` `portes.ts:182` → rpc `tiroma_retirer_attente` | F7 (motif) | idem G9 (`b3_09:93`) | avis « … est retiré de la liste (motif) » ; motif au journal |
| G11 | « Aligner » | 26 / F8 (`ReglesCommunes.tsx:120`) | `alignerLesRegles` `EcranTiroma.tsx:321` → `alignerRegles` `portes.ts:234` → rpc `tiroma_aligner_regles` (b3_22) | F8 | titulaire de chaque centre (`b3_22_regles_communes.sql:88`, `:100`) | avis « N centres alignés sur X » ; journal `tiroma.regles_alignees` (`b3_22:118`) |
| G12 | « Télécharger les données » | 27 (`ComplementsCabinet.tsx:268`) | `exporterLesDonnees` `EcranTiroma.tsx:313` → `exporterDonnees` `portes.ts:227` → rpc `tiroma_exporter_donnees` (absente du dépôt) | **non** | titulaire | fichier `tiroma-donnees-AAAA-MM-JJ.json` téléchargé (`:239-247`) ; « L'export est noté au journal du cabinet. » ; en exemple : extrait fictif (`EcranTiroma.tsx:316`) |
| G13 | « Brancher le logiciel » | 28.1 (`Cabinet.tsx:122`) | `agir({type:"brancher"})` `EcranTiroma.tsx:139` → `brancherCabinet` `portes.ts:200` → rpc `tiroma_brancher_cabinet` (voie `exports`) | **non** | titulaire ; statut `installation` | avis « Le cabinet est branché… » ; relecture |
| G14 | « Confirmer » (mode) | 28.1 / F14 (`Cabinet.tsx:485`) ; ouvert par « Passer en mode réel » / « Repasser à blanc » (`:126`) | `changerMode` `portes.ts:207` → rpc `tiroma_changer_mode` | F14 | titulaire | avis « Le cabinet est en mode réel / à blanc. » |
| G15 | « Confirmer » (statut) | 28.1 / F15 (`Cabinet.tsx:502`) ; ouvert par « Couper » / « Réactiver » (`:130`) ; option « Clore » (`:498`, bouton rouge) | `changerStatut` `portes.ts:213` → update `tiroma_cabinets.statut` (`actif` / `coupe` / `clos`) | F15 | titulaire | avis « Le cabinet est réactivé / coupé / clos. » ; clos : plus de bouton de statut (`:129`) |
| G16 | « Ajouter » (praticien) | 28.4 / F12 (`Cabinet.tsx:439`) | `ajouterPraticien` `portes.ts:266` → insert `tiroma_praticiens` | F12 | titulaire (RLS) | avis « X est ajouté. » |
| G17 | « Ajouter » (fauteuil) | 28.5 / F9 (`Cabinet.tsx:345`) | `ajouterFauteuil` `portes.ts:219` → insert `tiroma_fauteuils` | F9 | titulaire (RLS) | avis « X est posé. » |
| G18 | « Ajouter » (horaire) | 28.6 / F10 (`Cabinet.tsx:378`) | `ajouterHoraire` `portes.ts:248` → insert `tiroma_horaires` | F10 | titulaire (RLS) | avis « lun. 08:00–12:00 est posé. » |
| G19 | « Retirer » (horaire) | 28.6 (`Cabinet.tsx:247`) | `retirerHoraire` `portes.ts:254` → **delete** `tiroma_horaires` | **non** | titulaire (RLS) | avis « L'horaire est retiré. » |
| G20 | « Ajouter » (fermeture) | 28.7 / F11 (`Cabinet.tsx:413`) | `ajouterFermeture` `portes.ts:260` → insert `tiroma_fermetures` | F11 | titulaire (RLS) | avis « La fermeture est posée. » |
| G21 | « Classer sans valider » | 28.8 / F13 (`Cabinet.tsx:470`) | `classerType` `portes.ts:272` → update `tiroma_types_rdv` (statut `propose`) | F13 | titulaire (RLS) | avis « Le type est classé, à valider plus tard. » |
| G22 | « Valider » | 28.8 / F13 (`Cabinet.tsx:471`) | `classerType` `portes.ts:272` → update `tiroma_types_rdv` (statut `valide`) | F13 | titulaire (RLS) | avis « Le type est validé. » ; le type ne bouge plus au relevé |

Porte d'écriture **sans geste** : `reglerRegles` (`portes.ts:285`, update `tiroma_regles`) n'est appelée nulle part.

Gestes non écrivants (navigation, affichage) : les 4 compteurs (`EcranTiroma.tsx:387-402`), le sélecteur de cabinet (`:377`), l'interrupteur de source (`components/espace/source.tsx:97`, dans la coquille), « Voir les N » / « Réduire la liste » (`ComplementsCabinet.tsx:213`), la recherche de patients (F5, F6).

---

## 4. Listes, filtres, tri, recherche, états

### 4.1 Filtres, sélection, recherche

| Élément | fichier:ligne | Détail |
|---|---|---|
| Sélecteur de cabinet | `EcranTiroma.tsx:376-380` | réel, > 1 cabinet ; recharge le dossier (`setChoix` + `charger`) ; défaut : premier cabinet par `cree_le` (`portes.ts:52`, `EcranTiroma.tsx:98`) |
| Source exemple / réel | `components/espace/source.tsx:29`, `:84-85`, `:97` ; ruban `EcranTiroma.tsx:381` | mémorisé dans `localStorage` (`espace.source`) ; réel seulement si session ouverte |
| Recherche de patients | F5 `Rappels.tsx:48-64`, `:183-195` ; F6 `ListeAttente.tsx:48-67`, `:146-158` ; `chercher` `EcranTiroma.tsx:174-180` ; `chercherPatients` `portes.ts:160-167` | 2 caractères mini, délai 250 ms, début du nom ou du prénom (`ilike t%`), patients actifs du cabinet, 12 max, tri par nom ; « ne pas contacter » grisé ; en exemple 5 patients fixes (`EcranTiroma.tsx:167-173`) |
| Limites d'affichage | `ComplementsCabinet.tsx:181` (contrôles : 8 puis tout), `Rappels.tsx:151` (8 derniers rappels), `Cabinet.tsx:144` (6 relevés ; 30 lus `portes.ts:101`), `portes.ts:138` (200 contrôles) | — |
| Horizons demandés à la base | `portes.ts:105-138` | créneaux : règle `horizon_creneaux_jours` ; avant : `labo_verif_jours` ; appels 30 j ; pilotage 30 j ; réinscription 30 j ; absences 3 j ; équipe 7 j ; demi-journées 14 j ; objectifs 4 semaines (+2 prévues) ; soins à regrouper 2 j ; séances longues 7 j ; créneaux des plans 14 j, 3 max ; synthèse : semaine précédente, tous les centres |
| Filtres locaux | `EcranTiroma.tsx:355-358` (compteurs : créneaux `libre`, vérifs ≠ info, critiques) ; `Appels.tsx:108-109` (dus / plus tard) ; `Cabinet.tsx:94` (types non validés) ; `Cabinet.tsx:95` (horaires non exceptionnels) ; `Objectifs.tsx:80-81` (fauteuils avec objectif, tenus) ; `EquipeAbsente.tsx:119` (membres actifs) ; `ListeAttente.tsx:162` (famille `personnel` exclue) | — |

### 4.2 Tri

| Liste | Tri | fichier:ligne |
|---|---|---|
| Créneaux, candidats | ordre de la porte ; candidats par rang (règle plan → attente → contrôle) | `Creneaux.tsx:27`, `:45` |
| Plans | du plus ancien au plus récent (porte) | `Plans.tsx:52` |
| Avant les rendez-vous | critique d'abord (porte) | `AvantRendezVous.tsx:6` |
| Appels à reprendre | dus aujourd'hui d'abord | `Appels.tsx:146` |
| Liste d'attente | `ajoute_le` croissant | `portes.ts:149` |
| Tables du cabinet | fauteuils `nom`, praticiens `nom_affiche`, membres `prenom`, horaires `jour` (puis jour + début `Cabinet.tsx:95`), fermetures `debut`, capacités `domaine`, types `libelle_source`, relevés `recu_le` inversé | `portes.ts:95-103` |
| Cabinets | `cree_le` | `portes.ts:52` |

### 4.3 États des objets (libellés)

| Objet | Valeurs → libellé | fichier:ligne |
|---|---|---|
| Logiciel | logosw, julie, veasy, weclever, trophy, desmos, autre | `libelles.ts:6-14` |
| Statut du cabinet | installation « En installation », actif, coupe « Coupé », clos | `libelles.ts:20-25` |
| Mode du cabinet | reel « Mode réel » / a_blanc « À blanc » | `Cabinet.tsx:103` |
| Famille de soin | 17 familles (contrôle… temps personnel, autre) | `libelles.ts:27-45` |
| Capacité de fauteuil | soins, prothèse, chirurgie, orthodontie, prévention | `libelles.ts:47-53` |
| Origine d'un candidat | plan « Plan accepté », attente « Liste d'attente », controle « Contrôle dû » | `libelles.ts:55-59` |
| Type de créneau libéré | annulation, report, déplacement | `libelles.ts:61-65` |
| Nature de vérification | labo, implant, devis_expire, mutuelle_accord, mutuelle_attente, odf_accord, odf_semestre, interruption, devis_sans_reponse | `libelles.ts:67-77` |
| Gravité | critique (rouge), attention (ambre), info (vert) | `AvantRendezVous.tsx:13` |
| Mutuelle | non_requise, a_demander, demandee, accord, refus | `libelles.ts:79-85` |
| Jours | Lundi…Dimanche (1-7) | `libelles.ts:87-88` |
| Fermeture | conge, ferie, fermeture, formation, absence | `libelles.ts:90-96` |
| Capacité du logiciel (domaine / état) | laboratoire, statuts_manques, signature_devis, liens_familiaux, stock, dates_creation / tenu, partiel, non_tenu, inconnu | `libelles.ts:98-112` |
| Relevé (statut / mode) | en_cours, ok « Appliqué », douteux, refuse, echec / rapide, courant, complet, reprise, demande | `libelles.ts:114-122` |
| Type de rendez-vous (vocabulaire) | valide « Validé », propose « Proposé (confiance) », autre « À classer » | `Cabinet.tsx:290` |
| Issue d'appel | rdv_pris, message, pas_de_reponse, rappeler, refus « Ne souhaite pas », ne_plus_contacter | `libelles.ts:148-155` |
| Motif d'appel | creneau, plan, devis, controle, attente, autre | `libelles.ts:157-164` |
| Panier de devis | 100_sante, maitrise, libre, mixte, non_precise | `libelles.ts:167-173` |
| Type de rappel | j2, plan, devis | `libelles.ts:176` |
| Réponse au rappel | confirme, annule « Ne viendra pas », a_lire, autre_adresse | `libelles.ts:177-182` |
| Statut d'envoi | a_valider, differe, pret, en_cours, envoye, bloque « Retenu », refuse, annule, expire, echec | `libelles.ts:183-186` |
| Verrou d'envoi | SANTE_HORS_CANAL_AGREE, SANTE_FOURNISSEUR_NON_HDS, CANAL_NON_PERMIS, CONFIG_ABSENTE, CONSENTEMENT_ABSENT, DESINSCRIT | `libelles.ts:187-194` |
| Mode des rappels | essai, reel « En service », coupe « Coupés », null « Non réglés » | `Rappels.tsx:93` |
| Canal / accord du contact | email « Courriel » / oral, ecrit, formulaire | `Rappels.tsx:22-23` |
| Niveau d'absence probable | annonce, fort, moyen | `Absences.tsx:14-18` |
| Motif d'absence de l'équipe | conge, maladie « Arrêt », formation, autre | `EquipeAbsente.tsx:21-26` |
| Motif de retrait de la liste d'attente | rdv_obtenu, date_passee, annule, doublon, autre | `ListeAttente.tsx:21` |
| Source d'une inscription | tiroma « Inscrit ici » / logiciel | `ListeAttente.tsx:121` |
| Règles (libellés de comparaison) | 19 clés de `tiroma_regles` | `ReglesCommunes.tsx:16-36` |
| Seuils de couleur | plans ≥ 21 / ≥ 42 j (`Plans.tsx:62`) ; expiration ≤ 30 j (`:64`) ; manqués ≥ 5 % (`Pilotage.tsx:66`, `SyntheseSemaine.tsx:44`) ; réinscription < 60 % (`Reinscription.tsx:31`) ; contrôles ≥ 2× seuil (`ComplementsCabinet.tsx:198`) ; séance > 1 problème (`:114`) | — |

---

## 5. Exemple vs réel

| Point | fichier:ligne | Comportement |
|---|---|---|
| Choix de la source | `EcranTiroma.tsx:75`, `components/espace/source.tsx:84-85` | `useSource()` ; « reelle » seulement si mémorisé ET session ouverte ; rendu serveur toujours « exemple » (`source.tsx:18-21`) |
| Dossier affiché | `EcranTiroma.tsx:128` | exemple : `local` (initialisé à `DOSSIER_EXEMPLE`, `:76`) ; réel : `reel.dossier` |
| Jeu d'exemple | `exemple.ts:1-13`, `:127-384` | « Cabinet dentaire des Flamboyants (exemple) », Logos_w, 3 fauteuils, 2 praticiens, 1 assistante ; identifiants `0000…` ; dates relatives au jour ; **profil `titulaire`** (`exemple.ts:129`) ; deux centres pour les règles communes (`:335-341`) |
| Conséquence du profil d'exemple | — | en exemple on voit tous les blocs titulaire ; les vues assistante, collaborateur (bloc 19 « votre agenda seulement »), direction, sans profil, ne sont visibles qu'en réel |
| Gestes en exemple | `EcranTiroma.tsx:50-72` (`appliquerExemple`), `:131-135`, `:154-160`, `:182-188`, `:196-199`, `:208-226`, `:235-246`, `:254-256`, `:264-273`, `:281-283`, `:291-306`, `:314-316`, `:322-330` | tout en mémoire, perdu au rechargement ; aucune écriture en base |
| Lecture réelle | `charger` `EcranTiroma.tsx:88-111` → `monCompte`, `listerCabinets`, `chargerDossier` (`portes.ts:81-144`) | 14 lectures en parallèle (`portes.ts:93-108`), puis portes réservées par profil (`:110-139`) ; chaque échec devient un avis (bloc 4) et laisse la carte vide ou absente |
| Temps réel | `EcranTiroma.tsx:126` | réel seulement ; relit sur changement de `tiroma_cabinets`, `tiroma_releves`, `tiroma_evenements_agenda`, `tiroma_rendez_vous`, `tiroma_plans` (pas sur appels, contacts, liste d'attente, absences) |
| États réels sans dossier | `EcranTiroma.tsx:413-453` | (a) lecture en cours ; (b) aucun compte ; (c) **aucun cabinet** → bloc 7 « Installer le cabinet » : formulaire pour le gérant, message « Aucun cabinet installé — un gérant… vous recevrez ensuite votre profil » pour les autres ; (d) cabinet trouvé, dossier en lecture |
| Installation | `EcranTiroma.tsx:82-86`, `:101`, `:339-351` ; `portes.ts:188-198` | entité par défaut = première de l'organisation (principale d'abord, `portes.ts:45`) ; logiciel par défaut Logos_w ; périmètre par défaut « cabinet » ; texte « le territoire fixe les jours ouvrés et son fuseau l'heure du point du matin » (`:425`) |
| Cabinet installé mais pas branché | `Cabinet.tsx:121-125`, `:141` | statut « En installation », bouton « Brancher le logiciel » ; relevés vides : « branchez le logiciel, puis déposez son premier export » |
| Personne sans profil Tiroma | `portes.ts:57-62`, `:110-139` ; `EcranTiroma.tsx:477-478` | profil `null` : blocs 10-15, 18-24, 26-27 absents ; 17 en « réservé au titulaire » ; liste d'attente en lecture seule |
| Erreurs et avis | `EcranTiroma.tsx:410-411` | réel seulement |

---

## 6. Objets métier

| Objet | Table | Identifiant | Blocs qui s'y rattachent |
|---|---|---|---|
| Organisation / compte | `comptes`, `entites` | `client_id`, `user_id`, `entite_id` | 1, 6, 7 |
| Cabinet (centre) | `tiroma_cabinets` | `id` (clé de choix), `entite_id` | 1 (sélecteur), 7, 28.1, 26 (centres), 13 (centres) |
| Profil | `tiroma_profils` | (`user_id`, `entite_id`) → `profil` | toutes les conditions d'affichage ; posé par G1 |
| Créneau libéré | `tiroma_evenements_agenda` | `evenement_id` | 8, 2 ; E1 ; motif d'appel `creneau` (G2) |
| Rendez-vous | `tiroma_rendez_vous` | `rendez_vous_id` | 10, 11 (soins), 16, 20, 21, 24 (réponses) |
| Plan de traitement / devis | `tiroma_plans` (+ `tiroma_plan_actes`) | `plan_id` | 9, 22, 15 (devis à relancer), 8 (candidat origine plan), 16 (natures devis/mutuelle/interruption), 13, 2 ; E2, E3 ; G2, G3 |
| Patient | `tiroma_patients` | `patient_id` | 8, 9, 10, 11, 12, 14, 15, 16, 20, 21, 22, 23, 24, 25 ; recherche F5/F6 |
| Patient en attente | `tiroma_liste_attente` | `id` | 25, 8 (candidat origine attente), 19 (compte de patients) ; G9, G10 |
| Fauteuil | `tiroma_fauteuils` | `fauteuil_id` | 17, 18, 20, 22, 28.5, 28.6, 28.7, 11 (vers) ; E4 ; G6, G17 |
| Praticien | `tiroma_praticiens` | `praticien_id` | 28.4, 19, 25, 15 et 14 (par praticien), 28.6, 28.7 ; G16 |
| Membre de l'équipe (assistante) | `tiroma_membres` | `membre_id` | 28.4, 11, 17 (assistante habituelle) |
| Absence d'un membre | `tiroma_absences_membres` | `absence_id` | 11 ; G4, G5 |
| Horaire | `tiroma_horaires` | `id` | 28.6 ; G18, G19 |
| Fermeture | `tiroma_fermetures` | `id` | 28.7 ; G20 |
| Règles du cabinet | `tiroma_regles` | `id` | 28.9, 26, 8 (horizon), 16 (J-N), 17 (seuil) ; G11 |
| Relevé | `tiroma_releves` | `id` | 28.2, 28.1 (dernier relevé) |
| Capacité du logiciel | `tiroma_capacites` | `id` | 28.3 |
| Type de rendez-vous | `tiroma_types_rdv` | `id` | 28.8 ; G21, G22 |
| Travail de laboratoire | `tiroma_travaux_labo` | `travail_id` | 16 ; E3 |
| Stock d'implants | `tiroma_stock` | — | 16 ; E3 (sans objet) |
| Entente ODF | `tiroma_ententes_odf` | `id` | 16 ; E3 |
| Appel | `tiroma_appels` | — (registre ; `derniers` par patient) | 12, 29, ligne « dernier appel » dans 8, 9 ; G2 |
| Moyen de contact (consentement) | `tiroma_contacts` (+ registre des consentements) | `id` | 24 ; G7, G8 |
| Envoi de rappel | `envois` (socle) | `id` | 24 « Derniers rappels » |
| Réponse au rappel | `tiroma_reponses_rappels` | `id` | 24 « Réponses reçues », 10 (annonce) |
| Agrégats sans table propre | rpc | — | 13 (semaine), 14 (réinscription), 15 (pilotage), 17 (charge), 18 (objectifs), 19 (demi-journées), 2 (compteurs) |

---

## 7. Promesses

Sources : `omega/CHIFFRAGE/tiroma.md` (numéros # de son tableau, état A/B/C/T au 06/10) et `lib/en-preparation.ts:21-27` : la clé `tiroma` est **vide** (« Tout est livré ») — aucune promesse Tiroma ne porte la pastille « En préparation », donc **chaque promesse ci-dessous doit garder son écran**. Les textes sont dans `components/secteurs/dentaire/textes.ts` (lignes du chiffrage revérifiées sur les principales).

### 7.1 La contrainte « une seule page »

| Promesse | Où | Ce qu'elle dit de l'écran |
|---|---|---|
| « Votre cabinet tient sur une seule page » — « Les créneaux, les plans et les fauteuils qui comptent ce matin sont réunis au même endroit. » (#14, état B, preuve citée : `/espace/tiroma`) | `components/secteurs/dentaire/EnDirect.tsx:17-18` | la section du site montre **4 onglets** : « Point du matin », « Créneaux », « Fauteuils », « Plans » (`components/secteurs/dentaire/textes.ts:129-134`) |
| Métadonnées de l'écran : « Le cabinet lu en une page : créneaux à sauver, plans sans rendez-vous, vérifications avant les rendez-vous, charge des fauteuils. » | `app/espace/tiroma/page.tsx:15`, `app/espace2/tiroma/page.tsx:9` | même promesse dans la description de la page |
| Commentaire d'en-tête « le cabinet, lu en une page » | `EcranTiroma.tsx:4` | — |

Fait utile : ce que la promesse place « au même endroit » = créneaux (bloc 8), plans (bloc 9), fauteuils (bloc 17), soit les blocs déjà résumés par les compteurs du bloc 2 (avec « Avant les rendez-vous », bloc 16).

### 7.2 Promesse → bloc qui la prouve

| # chiffrage | Promesse (abrégée) | Bloc(s) |
|---|---|---|
| 1, 3 | quel créneau sauver, quel plan planifier, quel fauteuil tourne à vide | 8, 9, 17 (+ 2) |
| 2, 78 | lecture seule, sans écrire dans le logiciel | 1 (phrase `EcranTiroma.tsx:372`), 8 (`Creneaux.tsx:72`), 11 (`EquipeAbsente.tsx:176`), 20 (`ComplementsCabinet.tsx:90`), 22 |
| 4 | se branche sur votre logiciel | 7 (choix du logiciel), 28.1 (G13), 28.2, 28.3 |
| 5, 33 | aucune double saisie (C : mutuelle et contacts saisis) | F1, F5 |
| 7 | pastilles Agenda · Plans · Devis · Patients · Fauteuils · Point du matin | 8, 9, 15, 25, 28.5 ; point du matin : écran à part (`/espace/point`), seule l'heure est ici (28.1) |
| 8 | Annulations · Liste d'attente · Présences de l'équipe · Contrôles dus · Point du matin à 7 h · Travaux de laboratoire · Accords des mutuelles · Stock d'implants | 8 · 25 · 11 · 23 (+ candidats de 8) · 28.1 · 16 · 9/F1 + 16 · 16 |
| 9, 21, 65 | point du matin avant le premier patient | hors écran (E1-E7 y mènent) |
| 10, 25, 36 | chaque annulation arrive avec les patients qui peuvent la reprendre | 8 |
| 11, 41 | quel fauteuil tourne à vide et **quels soins déplacer** (C au 06/10) | 17, 20, 11 |
| 12, 23, 26, 37 | plans sans rendez-vous, du plus ancien au plus récent | 9 |
| 13, 24, 28, 39, 60, 84 | J-2 : laboratoire, implant, mutuelle | 16 |
| 14 | une seule page | l'écran entier (§ 7.1) |
| 15, 29, 61, 85 | réponses / accords des mutuelles (C : saisis) | F1 (9), 16 (mutuelle_accord / attente) |
| 17, 22, 83 | ordre plan → attente → contrôle ; durée et préférences tenues | 8 (origines, « hors préférences » `Creneaux.tsx:52`), 28.9, 26 |
| 18 | plans « avec le créneau qui leur convient » (C au 06/10) | 22 |
| 19 | fauteuil sans assistante, demi-journée vide, **séance longue mal placée** (C au 06/10) | 17, 19, 21 |
| 20, 31, 89 | charge par fauteuil, jamais par personne, titulaire seul | 17 (`ChargeFauteuils.tsx:35-36`), 18 |
| 27, 35, 38 | contrôles dus rapprochés des trous d'agenda | 8 (origine contrôle), 23 |
| 30, 46, 63, 87 | implants rapprochés du stock ; orthodontie | 16 |
| 32, 40 | point du matin dans un espace sécurisé, prêt à 7 h | 28.1 (heure), hors écran |
| 43, 55 | assistante absente : soins à basculer | 11 |
| 44, 58 | demi-journées vides des collaborateurs | 19 |
| 45, 56 | liste d'attente commune ; « à celui qui en a le plus besoin » (patient gêné) | 25, F6 (`ListeAttente.tsx:175`) |
| 47, 48, 49, 74 | un point du matin par centre ; synthèse de la semaine pour la direction | 13 ; E5, E6 ; sélecteur de cabinet (1) |
| 50, 74 | mêmes règles de priorité partout | 26 |
| 51, 79 | droits par rôle ; accès journalisés | conditions de profil de tous les blocs ; mentions du journal (F7, F8, 27) |
| 52, 72 | taux de réinscription et d'acceptation des devis | 14, 15 |
| 57 | « quarante-six patients pas revus depuis plus d'un an » (C au 06/10) | 23, 14 |
| 59 | traitement interrompu | 16 |
| 62 | devis qui arrive à échéance | 16, 9 (pastille) |
| 64 | accord ODF de six mois | 16 |
| 69 | Formule Cabinet : point du matin, créneaux, plans, contrôles dus, laboratoire, mutuelles sans rendez-vous, devis à échéance | 8, 9, 23, 16, 9/16 |
| 70 | famille à planifier dans la foulée | 9 (`Plans.tsx:77`) |
| 71 | Formule Groupe : charge, demi-journées vides, liste d'attente commune, implants, orthodontie, absences probables, droits par rôle | 17, 19, 25, 16, 16, 10, profils |
| 72 | Formule Centre : synthèse, objectifs par fauteuil, réinscription, acceptation des devis, appels à refaire | 13, 18, 14, 15, 12 (+ liste « Vus sans prochain rendez-vous » de 14) |
| 80 | « tout exporter ou tout effacer » (C au 06/10) | 27 (exporter) ; « Clore » F15 (données selon la conservation) |
| 82 | ne contacte un patient qu'avec un message validé | 24 |

Note : les promesses #11, #18, #19, #57, #80 étaient « C » au 06/10 ; les blocs 20, 21, 22, 23, 27 ont été ajoutés le 11/10 (commit 5a6249da) pour les couvrir, mais leurs portes ne sont pas dans les migrations du dépôt (§ 8).

### 7.3 Où l'écran tient compte de la santé (données de santé, envoi agréé)

| Point | fichier:ligne |
|---|---|
| Rappels : un rappel est une donnée de santé ; ne part que par un prestataire agréé HDS ; préparé puis retenu d'ici là ; en essai, seulement à l'adresse d'essai | `Rappels.tsx:3-9`, `:100-102` |
| Pas de SMS (aucun prestataire SMS agréé santé, décision D6) ; canal courriel seul | `Rappels.tsx:5`, `:22`, `:38`, `:199` |
| Verrou affiché par envoi (`verrous_envoi` du socle) : SANTE_HORS_CANAL_AGREE, SANTE_FOURNISSEUR_NON_HDS, CANAL_NON_PERMIS, CONSENTEMENT_ABSENT… ; statut « Retenu » | `Rappels.tsx:162`, `libelles.ts:184`, `:187-194` |
| Accord noté au registre des consentements, retirable | `Rappels.tsx:178`, `:208-212` |
| Appels : issue codée, jamais de texte (« rien de médical ne s'écrit ici ») | `Appels.tsx:3-8`, F3 `:77-85` |
| Absence de l'équipe : motif codé, « Aucune raison médicale n'est demandée » | `EquipeAbsente.tsx:9-10`, `:96` |
| Export : « Le fichier contient des données de santé : gardez-le sur un poste du cabinet » ; journalisé | `ComplementsCabinet.tsx:263`, `:248` |
| « Ne pas contacter » respecté | `Creneaux.tsx:56`, `Plans.tsx:66`, `:79`, `ListeAttente.tsx:141`, `:152-153`, `Rappels.tsx:189-190`, `ComplementsCabinet.tsx:217-219`, `Appels.tsx:91-93`, `:139-141` |
| Minimisation : chiffres sans nom (synthèse), direction sans nom (réinscription), charge jamais par personne, agenda du collaborateur privé, objectifs titulaire seul, patient hors périmètre masqué | `SyntheseSemaine.tsx:7`, `Reinscription.tsx:7-8`, `:71`, `ChargeFauteuils.tsx:4`, `:36`, `DemiJournees.tsx:70-74`, `Objectifs.tsx:123`, `portes.ts:156` |
| Champs libres qui peuvent recevoir de la santé (pas de garde-fou à l'écran) | F1 « Note (facultatif) » `Plans.tsx:104-106` (200 car.) ; F5 « Preuve » `Rappels.tsx:213-215` (300 car.) |
| Point du matin : sections nominatives déposées `sante = vrai`, le socle (`verrous_envoi`, SANTE_HORS_CANAL_AGREE) ne les laisse sortir que par un expéditeur agréé ; sinon renvoi vers l'écran | `b3_06_point_du_matin.sql:14-16`, `b3_21_point_multi_sites.sql:77-80`, `b3_19_demi_journees_vides.sql:269` |
| Courriel du point : compteurs seulement, `donnees_sante = false`, « il ne sort jamais d'Omega par courriel » | `b3_10_gabarit_point.sql:11-13`, `:27-28` |

---

## 8. Regroupements naturels et observations (faits)

### 8.1 Taille des blocs (lignes de code)

| Bloc | Fichier | Lignes |
|---|---|---|
| 1-7 cadre, compteurs, états, installation | `EcranTiroma.tsx` (487 au total : logique 48-363, rendu 366-486 ; compteurs 22 lignes `:386-407` ; installation 35 lignes `:417-451`) | 487 |
| 8 Créneaux à sauver | `Creneaux.tsx` | 82 |
| 9 Plans + F1 | `Plans.tsx` | 117 |
| 10 Absences probables | `Absences.tsx` | 56 |
| 11 Équipe absente + F2 | `EquipeAbsente.tsx` | 181 |
| 12 Appels + 29/F3 | `Appels.tsx` (carte `:105-165` = 61 ; fenêtre `:42-103` = 62) | 165 |
| 13 Synthèse | `SyntheseSemaine.tsx` | 91 |
| 14 Réinscription | `Reinscription.tsx` | 85 |
| 15 Pilotage | `Pilotage.tsx` | 142 |
| 16 Avant les rendez-vous | `AvantRendezVous.tsx` | 46 |
| 17 Charge des fauteuils | `ChargeFauteuils.tsx` | 70 |
| 18 Objectifs + F4 | `Objectifs.tsx` | 128 |
| 19 Demi-journées vides | `DemiJournees.tsx` | 78 |
| 20 / 21 / 22 / 23 / 27 | `ComplementsCabinet.tsx` (273) : `:52-94` = 43, `:98-131` = 34, `:135-174` = 40, `:178-225` = 48, `:229-273` = 45 | 273 |
| 24 Rappels + F5 | `Rappels.tsx` | 228 |
| 25 Liste d'attente + F6, F7 | `ListeAttente.tsx` | 209 |
| 26 Règles communes + F8 | `ReglesCommunes.tsx` | 126 |
| 28 Le cabinet + F9-F15 | `Cabinet.tsx` (508) : 28.1 `:99-135` = 37 ; 28.2 = 32 ; 28.3 = 13 ; 28.4-28.5 = 42 ; 28.6-28.7 = 46 ; 28.8 = 25 ; 28.9 = 15 ; 7 fenêtres `:317-505` = 189 | 508 |
| Données | `portes.ts` 334, `types.ts` 556, `exemple.ts` 384, `libelles.ts` 194 | — |

21 cartes métier empilées verticalement après les compteurs ; seuls deux couples sont côte à côte (8 + 9, 16 + 17 : `EcranTiroma.tsx:456`, `:467`).

### 8.2 Regroupements par sujet

| Sujet | Blocs | Lien factuel |
|---|---|---|
| Remplir l'agenda (créneaux et patients à appeler) | 8, 25, 23, 22, 19, 10, 12, 29 | candidats de 8 = plans (9), attente (25), contrôles (23) ; 19 compte les patients de 25 ; 12 et 29 notent les appels lancés depuis 8, 9, 10, 14, 15 |
| Plans et devis | 9, 22, 15 (devis à relancer, signé sans rendez-vous), 16 (devis_expire, mutuelle, interruption), F1 | même objet `tiroma_plans` |
| Vérifications avant les rendez-vous | 16 | seule carte ; E3 |
| Fauteuils et occupation | 17, 18, 19, 20, 21, 11, 28.5 | objectif d'occupation affiché en 17, 18, 28.5, saisi en F4 et F9 ; seuil de demi-journée vide en 17 et 28.9 |
| Équipe | 11, 28.4, 28.7 | membres (11, 28.4), fermetures/congés des praticiens (28.7) |
| Indicateurs | 13, 14, 15, 12 (tuiles), 18 | 30 jours ou semaine ; titulaire / direction |
| Communication patient | 24, 12, 29 | contacts, rappels, réponses ; registre des appels |
| Réglages | 28 (toutes sous-sections), 26, 27, 7 | titulaire / gérant |

### 8.3 Fréquence d'usage (d'après les horizons et les textes de l'écran)

| Fréquence | Blocs | Indice dans le code |
|---|---|---|
| Quotidien, le matin (assistante) | 8, 9, 10, 16, 12, 24 (réponses reçues), 25 | horizons 2-3 j ; point du matin quotidien E1-E3 ; « à reprendre aujourd'hui » (`Appels.tsx:114`) |
| Quotidien / hebdo (titulaire, organisation) | 17, 19, 20, 21, 22, 11 | charge du jour ; 2, 7, 14 j ; E4, E7 |
| Ponctuel (listes de travail longues) | 23, 14 (vus sans suite) | 200 contrôles ; 30 j |
| Hebdomadaire / mensuel (pilotage) | 13, 15, 14 (taux), 18 | synthèse du lundi (E6) ; 30 j ; 4 semaines |
| Réglage (rare) | 28, 26, 27, 24 (moyens de contact), 7 | installation, branchement, horaires, vocabulaire, règles, export |

### 8.4 Doublons constatés

| Doublon | Où |
|---|---|
| « Demi-journées vides » désigne deux choses : le compteur du bloc 2 (`charge.demi_journees_vides`, aujourd'hui, par fauteuil, b3_05) défile vers le bloc 17 « Charge des fauteuils » (`EcranTiroma.tsx:402`) ; la carte 19 du même nom (b3_19, par praticien, 14 j) n'a pas de compteur. E7 vise la carte 19 | `EcranTiroma.tsx:359`, `:402-405` ; `DemiJournees.tsx:41` |
| Plans signés sans rendez-vous : compteur (2), carte 9, carte 22, tuile « Signé, sans rendez-vous » du pilotage (`Pilotage.tsx:56-60`) et de la synthèse (`SyntheseSemaine.tsx:54-58`) | 5 endroits |
| Rendez-vous manqués : pilotage (`Pilotage.tsx:66-70` + tableau par praticien) et synthèse (`SyntheseSemaine.tsx:44-48`) | — |
| Devis à relancer / sans réponse : pilotage (`Pilotage.tsx:61-65`, `:116-138`) et vérification `devis_sans_reponse` (info, bloc 16) | — |
| Mutuelle : pastille + F1 au bloc 9, natures `mutuelle_accord` / `mutuelle_attente` au bloc 16 | — |
| Contrôle dû : candidat (8), carte 23, « Vus sans prochain rendez-vous » (14, motif d'appel `controle`) | — |
| Réinscription : carte 14 et colonne de la synthèse (13) ; appels : tuiles de 12 et colonne de 13 | — |
| Objectif d'occupation : lu en 17, 18, 28.5 ; écrit en F4 (update) et F9 (à la création) | — |
| Recherche de patient : code dupliqué dans F5 et F6 | `Rappels.tsx:48-64`, `ListeAttente.tsx:48-67` |
| Trois « absences » de natures différentes : patients (10), équipe (11), fermetures/congés des praticiens (28.7) | — |
| Règles : « Règles du cabinet » (28.9, lecture seule) et « Règles communes » (26, comparaison + alignement) | — |

### 8.5 Blocs mal rangés ou incohérences

| Constat | fichier:ligne |
|---|---|
| Les compteurs 3 et 4 visent des cartes placées 9e et 10e (16, 17), après Appels, Synthèse, Réinscription, Pilotage | `EcranTiroma.tsx:463-469` |
| « Règles du cabinet » dit « le titulaire peut les ajuster ici » mais n'offre aucun contrôle ; la porte `reglerRegles` existe sans appelant | `Cabinet.tsx:312` ; `portes.ts:285` |
| « Contrôles dus » (23) est une liste d'appels sans « Noter l'appel », contrairement à 8, 9, 10, 12, 14, 15 | `ComplementsCabinet.tsx:195-208` |
| « Pilotage » affiche « réservé au titulaire » alors que la direction le voit aussi | `Pilotage.tsx:47` ; `portes.ts:114` |
| « Noter la mutuelle » visible pour tous les profils (direction comprise) ; la base refuse hors titulaire / collaborateur / assistante | `EcranTiroma.tsx:458` ; `b3_07_mutuelle.sql:32` |
| La carte « Rappels » mêle réglage (moyens de contact) et quotidien (réponses « Ne viendra pas » à traiter) | `Rappels.tsx:104-170` |
| « Équipe absente » (équipe) est rangée entre deux cartes patients (10 et 12) ; les membres sont listés ailleurs (28.4) | `EcranTiroma.tsx:460-463` |
| Renvois textuels entre cartes à préserver : 17 → « la carte « Le cabinet » » ; 12 → « depuis un créneau à sauver ou un plan sans rendez-vous » ; 19 et 23 → « le point du matin » | `ChargeFauteuils.tsx:38`, `Appels.tsx:143`, `DemiJournees.tsx:72`, `ComplementsCabinet.tsx:220` |
| Gestes sans confirmation dont un effacement : « Retirer » un horaire (delete), « Retirer » un contact (erreur non affichée), « Clore l'absence », « Brancher le logiciel », « Télécharger les données » | `Cabinet.tsx:247`, `Rappels.tsx:122`, `EquipeAbsente.tsx:151`, `Cabinet.tsx:122`, `ComplementsCabinet.tsx:268` |
| **Les 5 portes des blocs 20, 21, 22, 23, 27** (`tiroma_soins_a_deplacer`, `tiroma_seances_mal_placees`, `tiroma_creneaux_pour_plans`, `tiroma_controles_dus`, `tiroma_exporter_donnees`) ne figurent dans aucun fichier SQL du dépôt (migrations b3_01 à b3_22 ; aucun b3_23). En réel, si elles manquent en base, 20-23 disparaissent avec un avis « Lecture partielle » et 27 échoue au clic | `portes.ts:135-138`, `:229` ; `ComplementsCabinet.tsx:3` (« b3_23 ») |
| Le temps réel ne relit pas sur les tables écrites par les gestes (appels, contacts, liste d'attente, absences) : un collègue ne voit pas ces changements sans recharger | `EcranTiroma.tsx:126` |
| Aucune entrée n'atterrit sur l'objet visé : `objet_id` des liens n'est lu nulle part, aucun paramètre d'adresse ; tous les liens ouvrent le haut de l'écran | § 1.2 |
| Le nouvel espace n'a qu'un onglet pour Tiroma (« Vue d'ensemble »), alors que d'autres modules (CASHD, REPUT, OFFLOAD) ont déjà des sous-pages | `components/espace2/modules.ts:80-110` |

---

**Totaux** — Blocs : 29 numérotés (7 de cadre et d'état, 21 cartes métier, 1 fenêtre globale « Noter l'appel ») + 9 sous-sections de « Le cabinet » + 15 fenêtres (F1-F15) · Gestes : 22 qui écrivent ou envoient (G1-G22) + 1 porte d'écriture sans geste (`reglerRegles`) · Entrées : 8 écrites en base (7 lignes `'lien', '/espace/tiroma'` E1-E7 + 1 URL de gabarit courriel E8), 9 alertes sans lien, 5 points d'entrée dans le code (navigation ancien et nouvel espace, barre métier, deux affichages du point du matin), 0 paramètre d'adresse lu.
