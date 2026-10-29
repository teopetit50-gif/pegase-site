# TAMILA — inventaire de l'écran avant refonte

Relevé le 29/10/2026 sur la copie `refonte-metiers` (HEAD 45c3aa89, puis 479f9d88 « l'aiguillage » arrivé pendant le relevé), en lecture seule. Écran : `/espace2/tamila` (`app/espace2/tamila/page.tsx:12-17`, `<Habille>` sans `ancien`) qui rend tel quel `components/espace/tamila/EcranTamila.tsx`, comme `/espace/tamila` (`app/espace/tamila/page.tsx:18-20`).

Ce document est un **contrat** : tout ce qui est listé ici (bloc, geste, entrée, condition) doit exister après la refonte, quelle que soit la sous-page qui l'accueille.

Abréviations : `E` = `components/espace/tamila/EcranTamila.tsx`, `D` = `components/espace/tamila/DossierTamila.tsx`, `P` = `components/espace/tamila/portes.ts`, `M` = `omega/modules/tamila/migrations/`. Rôles du cabinet (`regles.ts:199-232`) : **avocat** = gerant, admin, valideur ; **associé** = gerant, admin ; **gérant** = gerant ; collaborateur = assistant juridique ; lecteur = stagiaire. `peutEcrire` = `ecritDossier` (`regles.ts:214-222`), `peutGerer` = `gereDossier` (`regles.ts:225-232`).

---

## 0. La contrainte du chiffrement (à lire en premier)

Tout ce qui nomme une personne ou un dossier est chiffré **dans le navigateur** (AES-256-GCM, WebCrypto, `chiffrement.ts:93-123`) avec la **clé du dossier**. Le serveur ne voit que des octets (`bytea` en hexadécimal `\x01…`, `chiffrement.ts:20-21`).

### 0.1 D'où vient la clé d'un dossier

| Source | Comment | Où | Conséquence |
|---|---|---|---|
| Phrase du cabinet (fournisseur `local`) | Tapée dans la fenêtre « La phrase du cabinet », gardée en `sessionStorage` clé `espace.tamila.phrase` (`chiffrement.ts:26,70-86`) ; dérive par PBKDF2-SHA-256 310 000 tours (`chiffrement.ts:25,135-138`) une clé qui déballe l'enveloppe `tamila_cles.enveloppe` (77 octets, `chiffrement.ts:150-161`) | `E:361-381`, `E:841-861` | La phrase survit à la navigation dans l'onglet ; chaque déballage coûte 310 000 tours PBKDF2 par dossier |
| Enveloppe pour un membre non associé | `tamila_cle_dossier(p_dossier)` (`P:270`, `M/b4_03_tamila_cle_dossier.sql:43` : **trace une lecture « cle »**) | `E:261-263`, `E:289` | Chaque appel écrit une trace |
| Coffre Scaleway (fournisseur `scaleway`) | Fonction Edge `tamila-coffre`, action `cle_dossier` (`P:258-268`), clé de 32 octets en base64 (`chiffrement.ts:164-168`) ; **chaque remise est journalisée** (`E:21-25`, `E:635`) | `E:100-106`, `E:253-259`, `E:554-572` | Rouvrir un dossier après avoir perdu le trousseau = nouvelle ligne au journal du coffre |
| Trousseau de l'onglet | `class Trousseau` en mémoire (`chiffrement.ts:177-199`), instancié par `useRef` **dans EcranTamila** (`E:89`) ; clés ouvertes posées dans un état `clesOuvertes` (`E:81`) et passées à `DossierTamila` (`E:738`) | `E:89`, `E:265`, `E:435` | **Le trousseau meurt avec le composant** : découper en routes Next sans remonter le trousseau (layout ou contexte) fait tout redéballer (PBKDF2 ou coffre journalisé) à chaque changement de sous-page |
| Clé d'index du cabinet (conflits) | HMAC-SHA-256 (`index.ts:51-55`), clé lue par `tamila_index_cle` puis phrase ou coffre `cle_index` (`ConformiteTamila.tsx:73-93`), gardée dans une `Map` **au niveau du module** (`ConformiteTamila.tsx:71`) | — | Survit à la navigation côté client (portée module), pas au rechargement |

### 0.2 Ce qui est chiffré, où on le chiffre, où on le déchiffre

| Donnée | Colonne / stockage | Chiffré à | Déchiffré à | Sans clé, l'écran affiche |
|---|---|---|---|---|
| Référence, intitulé, n° RG du dossier | `tamila_dossiers.reference_chiffree`, `intitule_chiffre`, `numero_rg_chiffre` (`types.ts:27-29`) | Nouveau dossier `E:424-429` | Liste `E:145-172` ; ouverture `E:266-269` ; liste au coffre `E:554-572` | « Chiffré », « Intitulé chiffré » (`E:705,711`), « Référence chiffrée » (`D:520`) |
| Nom et courriel d'une partie | `tamila_parties.nom_chiffre`, `courriels_chiffres` (`types.ts:77,81`) | `D:182` | `E:270-274`, `E:340-344` | « nom chiffré » (`D:587`) |
| Motif d'une muraille | `tamila_murailles.motif_chiffre` (`types.ts:231`) | `D:377` (sans clé : muraille posée sans motif, `D:1083`) | **Jamais** à l'écran (`D:849` : « Motif chiffré, lu par les associés ») | « Motif chiffré… » |
| Description d'un temps passé | `tamila_temps.description_chiffree` (`types.ts:392`) | `HonorairesTamila.tsx:218` | `HonorairesTamila.tsx:146-162` | « description chiffrée » (`HonorairesTamila.tsx:482`) |
| Objet d'une pièce attendue | `tamila_attentes.objet_chiffre` (`types.ts:511`) | `AttentesTamila.tsx:103`, `AnalysesTamila.tsx:143` | `AttentesTamila.tsx:54-69`, `AnalysesTamila.tsx:178-180` | « objet chiffré » (`AttentesTamila.tsx:132`) |
| Contenu d'une pièce (fichier) | bucket `omega-clients`, `<client>/tamila_dossier/<dossier>/<nom>.<sha12>.chiffre` ; `pieces.chiffrement = 'dossier:v1'` ; sha256 **du chiffré** | `D:395-402`, `AvisEntrantsTamila.tsx:119-127` | `AnalysesTamila.tsx:118-130` (renvoi), `archive.ts` (export) | — |
| **Nom de fichier d'une pièce** | `pieces.nom_fichier` et le chemin du bucket | **en clair** (`P:283-284`, `D:400`) | — | toujours lisible (`D:758`) |
| Résultat d'une lecture longue | `analyses.resultat_chiffre` (`P:442-443`) | serveur (coffre) | `AnalysesTamila.tsx:175` | « le résultat reste chiffré » (`AnalysesTamila.tsx:174`) |
| Archive d'export | bucket, manifeste aux champs chiffrés | ouvrier `tamila.exporter` | `D:424-433` via `archive.ts` | téléchargée chiffrée par URL signée (`D:435-436`) |
| Empreintes des parties | `tamila_empreintes` (HMAC, `index.ts:58-64`) | `ConformiteTamila.tsx:187` | jamais (comparaison serveur) | — |
| Avis reçu par courriel | `receptions.sujet/corps/de_nom` **en clair** sept jours au plus | — | lu tel quel `AvisEntrantsTamila.tsx:177,204` ; n° RG comparé dans le navigateur `AvisEntrantsTamila.tsx:44-49,88-97` | — |
| Facture imprimée | nom du client et détail du temps déchiffrés ici ; **adresse du client jamais enregistrée** | — | `FactureImprimable.tsx:52-68` | « Client » |

### 0.3 Lectures tracées (écrites en base par un simple affichage)

| Déclencheur | Porte | Trace | Où |
|---|---|---|---|
| Ouvrir un dossier de statut attente/ouvert/audit/clos | `tamila_consulter(p_dossier, 'dossier')` → fenêtre de 30 min pour lire les parties | lecture `dossier` | `P:143-149`, `E:250` ; condition d'affichage des parties `D:110,576-577` |
| Ouvrir un dossier (toujours) | `tamila_journal_acces` | `private.tracer_lecture(…, 'journal')` (`M/b4_02_tamila_journal_acces.sql:38`) | `P:160` |
| Enveloppe d'un membre | `tamila_cle_dossier` | `tracer_lecture(…, 'cle')` (`M/b4_03_tamila_cle_dossier.sql:43`) | `E:262`, `E:289` |
| Clé au coffre | Edge `tamila-coffre` `cle_dossier` | journal du coffre | `E:101`, `E:255`, `E:559` |
| Télécharger une archive | `tamila_telecharger_export` | lecture `export.telechargement` | `D:423`, `D:440` |

---

## 1. Entrées

### 1.1 Liens écrits en base vers l'écran

Aucune ligne TAMILA ne porte `objet_type` ni `objet_id` : c'est voulu. Le socle n'accepte pour un objet chiffré qu'un gabarit, donc rien ne désigne le dossier (`M/b4_14_tamila_point_matin.sql:15-18`). Toutes les lignes pointent sur `/espace/tamila` ; l'écran ne sait donc pas quel dossier ouvrir.

Sections du point du matin : « Tamila : vos délais et audiences » par personne (`M/b4_14…:226`, rôles gerant/admin/valideur/collaborateur `:237`), « Tamila : le cabinet » pour le rôle gérant (`:227,250`). Cron `tamila-matin` toutes les 30 min dès 5 h (`:281-282`). `tamila_point_lignes_personne` de b4_14 est **remplacée** par celle de b4_16 (`M/b4_16_tamila_expertises.sql:191-311`) : les lignes 1 à 5 y sont recopiées à l'identique.

| # | Fichier SQL:ligne | objet_type | Ce que désigne la ligne | Gabarit (texte) / destinataire / gravité | Où l'utilisateur devrait atterrir |
|---|---|---|---|---|---|
| E1 | `M/b4_14…:91` (actif : `M/b4_16…:218`) | — (délais `tamila_delais` des dossiers « à moi ») | Délais à confirmer | « %s délai(s) de procédure à confirmer, le plus ancien posé le JJ/MM/AAAA » ; avocats seulement ; critique après 48 h | Compteur « Délais à confirmer » (B9) → liste filtrée (B10) → carte « Appel et délais », bouton Confirmer (B20, `D:677`) |
| E2 | `M/b4_14…:112` (actif : `M/b4_16…:239`) | — (`tamila_delais`) | Une échéance à 7 jours ou dépassée sans acte (≤ 20 lignes) | « Échéance [dépassée du / le] JJ/MM/AAAA : <acte> (dans N jours / N jours de retard)[, délai encore à confirmer] » ; critique à J-2 | Compteur « Échéances sous 15 jours » (B9) → B20 (Acte déposé, Corriger) |
| E3 | `M/b4_14…:129` (actif : `M/b4_16…:256`) | — (`tamila_audiences`) | Audience d'aujourd'hui ou de demain (≤ 10) | « <Nature> aujourd'hui/demain [à HH h MM] » ; attention le jour même, info la veille | Compteur « Audiences à venir » (B9) → carte Audiences (B21) |
| E4 | `M/b4_14…:142` (actif : `M/b4_16…:269`) | — (`tamila_audiences` × `tamila_temps`) | Audiences passées (3 j) sans temps saisi | « N audience(s) passée(s) sans temps saisi : le temps est proposé dans le dossier » ; info | Carte Honoraires, « Proposé à la saisie » (B30, `HonorairesTamila.tsx:453-470`) — **aucune vue cabinet ne liste ces propositions** |
| E5 | `M/b4_14…:153` (actif : `M/b4_16…:280`) | — (`tamila_avis_entrants`) | Avis RPVA reçus par courriel à rattacher | « N avis RPVA reçu(s) par courriel à rattacher ; le premier s'efface le JJ/MM/AAAA s'il ne l'est pas » ; pour qui peut lire la réception (`M/b4_13…:14-25`) ; critique à J-2 de l'expiration | File « Avis RPVA à rattacher » (B7) |
| E6 | `M/b4_14…:177` | — (`tamila_delais`) | Délais dépassés sans acte, tout le cabinet | « N délai(s) dépassé(s) sans acte déposé dans le cabinet » ; gérant ; critique | Compteur « Échéances sous 15 jours » (inclut les dépassés, `E:209,221`) → B20 |
| E7 | `M/b4_14…:184` | — (`tamila_controles_conflits`) | Dossiers avec un conflit d'intérêts sans décision | « N dossier(s) avec un conflit d'intérêts sans décision (RIN art. 4) » ; gérant ; critique | Carte « Conflits d'intérêts et vigilance » (B33) — **ni compteur ni pastille de liste ne signale ces dossiers** |
| E8 | `M/b4_14…:194` | — (`tamila_dossiers` × `tamila_conventions`) | Dossiers ouverts depuis plus de 15 j sans convention signée | « N dossier(s) ouvert(s) depuis plus de quinze jours sans convention d'honoraires signée » ; gérant ; attention | Fenêtre « Honoraires du cabinet », filtre « À traiter » (B12) ; dans le dossier, bandeau de B30 (`HonorairesTamila.tsx:400-402`) |
| E9 | `M/b4_14…:202` | — (`tamila_factures`) | Factures impayées à 30 jours | « N facture(s) d'honoraires impayée(s) depuis plus de trente jours, X € restant dus » ; gérant ; attention | B12 (signal « facture impayée », `HonorairesCabinet.tsx:90-91`) → B30 (bouton Payée) |
| E10 | `M/b4_14…:210` | — (`tamila_dossiers`) | Dossiers effacés dans les 7 jours | « N dossier(s) effacé(s) dans les sept jours : l'export, s'il le faut, avant » ; gérant ; info | Compteur « Dossiers clos » (B9) → B18 (« Effacement prévu », Exporter) → B37 |
| E11 | `M/b4_16…:296` | — (`tamila_expertises`) | Consignation de l'expertise à verser (J-7) | « Expertise : consignation à verser avant/depuis le JJ/MM/AAAA (sinon … caduque, art. 271 CPC) » ; critique à J-2 | Carte Expertise (B24) ; vue Pilotage « Pièces attendues » (B13) |
| E12 | `M/b4_16…:301` | — (`tamila_expertises`) | Dires à adresser (J-7) | « Expertise : dires à adresser à l'expert au plus tard/depuis le JJ/MM/AAAA » | B24 ; B13 |
| E13 | `M/b4_16…:305` | — (`tamila_expertises`) | Pré-rapport en retard | « Expertise : pré-rapport attendu le JJ/MM/AAAA, pas encore reçu » | B24 ; B13 |
| E14 | `M/b4_16…:309` | — (`tamila_expertises`) | Rapport définitif en retard | « Expertise : rapport définitif attendu le JJ/MM/AAAA, pas encore déposé » | B24 ; B13 |
| E15 | `M/b4_10_tamila_avis_entrants.sql:135-137` | — (detail `{entrant, lien: '/espace/tamila'}`) | Alerte : un avis RPVA arrivé par courriel | « Un avis RPVA est arrivé par courriel : rattachez-le à son dossier » ; attention ; `public.alertes` | B7 |

### 1.2 Repères en base sans lien (alertes et demandes) qui concernent cet écran

Ces lignes ne portent pas `lien` mais désignent un objet de l'écran dans leur `detail` (table `public.alertes`, `omega/SOCLE-EXTRAITS-COMMUN.sql:6268`). Aucun écran du dépôt ne lit aujourd'hui `public.alertes`.

| Fichier:ligne | Titre | Objet dans `detail` | Bloc concerné |
|---|---|---|---|
| `M/b4_05_tamila_coffre.sql:389-392` | Le coffre à clés n'a pas pu déballer une clé de dossier | dossier, pièce, journal | B14 |
| `M/b4_10_tamila_avis_entrants.sql:189-191` | Un avis RPVA reçu par courriel n'a pas été rattaché en sept jours… | entrant | B7 |
| `M/b4_14_tamila_point_matin.sql:255-257` | Le point du matin de Tamila n'a pas pu être déposé | erreur | — |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:649-652` | Un avis RPVA ne porte pas le n° RG de son dossier | avis, dossier | B35 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:660-661` | Avis RPVA sans gabarit : type proposé par le modèle | avis, type | B35 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:666-669` | Un accusé de dépôt RPVA est arrivé : rattachez-le au délai qu'il éteint | avis, dossier | B20, B35 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:694-698` | Un avis RPVA est arrivé : précisez la cour / déclarez l'appel | avis, dossier | B20 (Déclarer l'appel) |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:766-769` | Un avis RPVA n'a pas pu être appliqué | avis, dossier | B35, B20 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1267-1269` | Délai de procédure dépassé sans acte déposé | délai, dossier | B20 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1285-1287` | Délai de procédure à confirmer depuis 48 heures | délai, dossier | B20 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1311-1313` | Délai de procédure non confirmé à huit jours ou moins | délai, dossier | B20 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1586-1588` | Acte déposé après l'échéance du délai | délai, dossier | B20 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1746-1749` (et `SOCLE-EXTRAITS-COMMUN.sql:7972`) | Un gérant a demandé l'export de tous les dossiers | export | **aucun** (pas de bouton, voir § 8) |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:3050-3053` | Effacement de dossier en retard de plus de 24 heures | dossier | B18 |
| `omega/SOCLE-EXTRAITS-TAMILA.sql:1502`, `:1842` (via `:1688`, `:1788`, `:1814`, `M/b4_04…:40`) | `demandes_validation` module `tamila`, `objet_type = 'tamila_dossier'`, `type_action` ouvrir_dossier / cloturer_dossier / lever_muraille / confirmer_delai | dossier | B18 (décisions), B20 (Confirmer) ; aussi l'écran À valider |

### 1.3 Paramètres d'adresse lus par l'écran

| Paramètre | Lu ? | Preuve |
|---|---|---|
| `?objet=…`, `?dossier=…`, ancre | **Non.** Aucun `useSearchParams`, `location`, `hash` dans `components/espace/tamila/` | grep vide ; le dossier ouvert est le premier de la liste triée (`E:236`) |
| `?ancien=1` | Non lu par l'écran (posé par `components/espace2/modules.ts:53`) | — |
| État hors adresse | source exemple/réelle `localStorage` `espace.source` (`components/espace/source.tsx:30,47-53`) ; phrase `sessionStorage` (`chiffrement.ts:26`) ; coût horaire du pilotage `localStorage` `omega.tamila.cout_horaire` (`PilotageCabinet.tsx:46-55`) | — |

### 1.4 Autres écrans du dépôt qui mènent ici

| Fichier:ligne | Lien | Remarque |
|---|---|---|
| `components/espace/ecrans.ts:13` | `/espace/tamila` « Dossiers du cabinet » | navigation de l'ancien espace |
| `components/espace2/modules.ts:101` (aide `:48-57`) | `/espace2/tamila`, onglet unique « Vue d'ensemble » ; `ancien: /espace/tamila?ancien=1` | module « TAMILA · Dossiers chiffrés et pièces » |
| `components/espace2/modules.ts:127` | `moduleMetier` : secteur `avocats` → `tamila` | le module métier montré dans la barre (`components/espace2/Coquille.tsx:399,442`) |
| `components/espace2/Coquille.tsx:223,280`, `components/espace2/Palette.tsx:56`, `components/espace2/Automatisations.tsx:258` | listes de tous les modules | — |
| `components/espace/point/PointDuMatin.tsx:243-246` | le `lien` brut de la ligne (`/espace/tamila`) | ancien point du matin |
| `components/espace2/Point.tsx:43,50,250,335` | `lienV2` → `aiguiller(l)` (479f9d88) : sans objet, le lien `/espace/tamila` devient `/espace2/tamila` | — |
| `components/espace2/aiguillage.ts:51,58,86` (479f9d88) | `tamila_dossier` → `/espace2/tamila?objet=tamila_dossier:<id>` | EcranTamila ne lit pas `?objet=` ; et les lignes du point TAMILA n'ont pas d'objet (§ 1.1) |
| `app/secteurs/avocats/page.tsx`, `lib/secteurs.ts:76-80` | vitrine | pas de lien vers l'espace |

---

## 2. Blocs

Emplacements : **haut** (au-dessus des compteurs), **liste** (colonne gauche), **dossier** (colonne droite, `D`, cartes dans l'ordre d'affichage), **fenêtre** (`Dialog`). Taille = lignes de code du bloc (sous-composant : fichier entier + fichiers d'aide).

| # | Titre affiché | Composant fichier:ligne | Empl. | Données affichées | Source (portes.ts → table / rpc) | Condition d'affichage | Taille |
|---|---|---|---|---|---|---|---|
| B1 | « Dossiers du cabinet » + sous-titre + barre d'actions + ruban | `E:583-616` | haut | boutons Phrase (`:591-595`), Coffre (`:596-600`), Honoraires du cabinet (`:601-605`), Pilotage (`:606-610`), Nouveau dossier (`:611-613`), ruban « Données d'exemple / Base réelle » (`:614`, `components/espace/ui.tsx:57-64`) | — | Phrase : réel seulement ; Coffre : `etat && associé` (`etat` null si `tamila_coffre_etat` absente, `P:243-249`) ; Honoraires et Pilotage : avocat et (exemple ou installé) ; Nouveau dossier désactivé en réel si non installé ou lecteur | 34 |
| B2 | « C'est fait. » / « La base réelle n'a pas répondu. » | `E:618-619` | haut | message du dernier geste de l'écran | — | après un geste / une erreur | 2 |
| B3 | « Tamila n'est pas installé pour ce cabinet. » | `E:620-631` | haut | explication des 3 règles de validation ; bouton Installer | `cabinet.installe` = ligne `tamila_reglages` (`P:100,126`) | réel, connecté, non installé ; bouton : gérant (sinon « Seul un gérant l'installe ») | 12 |
| B4 | « Les clés de ce cabinet sont au coffre Scaleway. » | `E:632-643` | haut | nombre d'ouvertures de clé à faire | `cabinet.cles`, `cabinet.coffre` | réel, coffre ≠ local, dossiers au coffre non lus (`E:548-553`) | 12 |
| B5 | « Les dossiers sont chiffrés. » | `E:644-651` | haut | invite à taper la phrase ; « les clés ne sont lisibles que par les associés » si aucune clé lisible | `cabinet.cles` (`tamila_cles`, `P:102`) | réel, sans phrase, hors coffre, au moins un dossier | 8 |
| B6 | « N dossier(s) du cabinet … hors de votre vue » | `E:652-654` | haut | compte des dossiers sous muraille ou hors périmètre | rpc `tamila_registre_hors_vue` (`P:119-122`) | réel, gérant ou admin, compte > 0 | 3 |
| B7 | « Avis RPVA à rattacher » (pastille du nombre) | `AvisEntrantsTamila.tsx:164-191` (monté `E:656-666`) | haut | sujet du courriel, type supposé, dossier proposé (même n° RG déchiffré) ou « RG … : aucun dossier lisible », reçu le, nb de pièces, date d'effacement ; notice de transit en clair | `chargerAvisEntrants` (`P:478-491`) → `tamila_avis_entrants` (statut a_rattacher, 50) + `receptions` | exemple, ou (installé et avocat) ; masqué si table absente ou file vide (`:99`) ; « Écarter » : avocat ; proposition : nécessite le clair des dossiers de la liste | 235 |
| B8 | « Rattacher l'avis à son dossier » / « Écarter l'avis » | `AvisEntrantsTamila.tsx:193-232` | fenêtre | corps du courriel (600 car.), choix du dossier (vivants : attente/ouvert/audit, `E:661`), type d'avis, motif d'écart | idem B7 | ouverte depuis B7 | (dans B7) |
| B9 | Cinq compteurs : Délais à confirmer, Échéances sous 15 jours, Audiences à venir, Dossiers ouverts, Dossiers clos | `E:668-676` (définition `E:56-62`, calcul `E:205-215`) | haut | nombres ; teinte si > 0 ; bouton bascule `aria-pressed` | `cabinet.delais` (`tamila_delais`, `P:103`), `cabinet.audiences` (`P:104`), `cabinet.dossiers` (`P:101`) | toujours | 9 (+ 21 de calcul) |
| B10 | « Tous les dossiers » ou nom du filtre, « N dossier(s) » | `E:679-726` | liste | par dossier : référence (ou « Chiffré »), statut, « N à confirmer », « Dépassé » / « J-n », intitulé (ou « Intitulé chiffré ») · matière, juridiction ou siège, échéance, audience, responsable | `cabinet.dossiers` (≤ 300, `P:101`), délais, audiences, `annuaire` + `comptes` (`P:106-117`) ; clairs `E:145-172` | toujours ; « Lecture des dossiers… » en réel avant réponse ; vide : 3 messages (`E:687`) | 48 (+ 55 de calcul `E:180-237`) |
| B11 | « Choisissez un dossier » / « Lecture du dossier… » | `E:728-749` | dossier | conteneur `#esp-dossier` ; défilement mobile < 1024 px (`E:701`) | `chargerDossier` (`P:140-182`) | aucun dossier / chargement | 22 |
| B12 | « Honoraires du cabinet » | `HonorairesCabinet.tsx:128-187` (monté `E:752-762`) | fenêtre | totaux (à facturer HT + heures, reste dû + provisions, facturé et encaissé de l'année) ; filtres Tous / À facturer / À traiter ; tableau par dossier : référence (lien), intitulé, responsable, convention, non facturé, à facturer HT, provisions, reste dû, signaux (sans convention, impayées > 30 j, forfait ≥ 80 %, clos avec temps non facturé) | `chargerHonorairesCabinet` (`P:326-343`) → `tamila_conventions`, `tamila_temps`, `tamila_provisions`, `tamila_factures` ; calcul `resumer` (`HonorairesTamila.tsx:90-109`) | bouton B1 ; « pas encore installés » si tables absentes | 188 |
| B13 | « Pilotage du cabinet » : vues Marge, Charge, Séries, Sans diligence, Pièces attendues | `PilotageCabinet.tsx:111-221` (monté `E:764-777`) ; calculs `pilotage.ts:39-165` | fenêtre | Marge : coût horaire réglable, temps, facturé + à facturer, coût, marge, taux réalisé (`:134-157`) ; Charge : par personne, temps 30 j, dossiers responsables, délais et audiences à 30 j (`:159-176`) ; Séries : même partie (≥ 2, depuis l'intitulé déchiffré `pilotage.ts:79-104`) ou même matière + juridiction (≥ 3) (`:178-189`) ; Sans diligence : ≥ 30 j (`pilotage.ts:109`) (`:191-201`) ; Pièces attendues : convention signée sans exemplaire, accusé RPVA manquant, pièce d'identité LCB-FT, expertise, attentes, aucune pièce (`pilotage.ts:130-165`) (`:203-212`) | `chargerPilotage` (`P:347-365`) → honoraires + `tamila_avis`, `pieces`, `tamila_vigilances`, `tamila_expertises`, `tamila_attentes` ; + délais, audiences, personnes de l'écran | bouton B1 ; « La base n'a pas répondu » si échec | 222 + 165 |
| B14 | « Le coffre à clés du cabinet » | `E:780-838` | fenêtre | état (toutes au coffre / bascule / phrase), dossiers sous la phrase, au coffre, région ; progression du ré-enveloppement ; échecs | `cabinet.coffre` = rpc `tamila_coffre_etat` (`P:243-249`) | bouton B1 (associé) ; « Passer au coffre » : gérant et statut local ; « Ré-envelopper » : statut bascule, phrase en réel, dossiers locaux > 0 | 59 |
| B15 | « La phrase du cabinet » | `E:841-861` | fenêtre | champ mot de passe (≥ 8 car.), « une phrase est mémorisée » | `sessionStorage` | réel (bouton B1) | 21 |
| B16 | « Ouvrir un dossier » | `E:864-934` | fenêtre | référence, n° RG, intitulé, matière (`MATIERES`), mode (contentieux / dommage corporel), juridiction, siège de la cour (`TERRITOIRES`), avocat responsable, fin d'audit (associé), phrase (réel sans phrase ni coffre), avertissement collaborateur | `personnes` (avocats) | bouton B1 | 71 |
| B17 | « C'est fait. » / erreur du dossier | `D:513-514` | dossier | message du dernier geste | — | après un geste | 2 |
| B18 | Identité du dossier : « <référence> — <intitulé> » | `D:517-567` | dossier | RG, matière, mode, « clientèle personnelle » ; statut ; pastille « Chiffré » (réel sans clé) ; juridiction, siège, responsable, ouvert le, fin d'audit, clos le, effacement prévu (rouge), clé du dossier (active · phrase/coffre) ; **décisions en attente** (`:539-553`, sauf confirmer_delai) ; boutons Exporter, Clôturer, Annuler la clôture, Convertir l'audit | `complet.dossier`, `complet.cle`, `complet.demandes` (`demandes_validation`, `P:159`) | toujours ; voir gestes G9-G13 | 51 |
| B19 | « Parties » | `D:570-607` | dossier | nom (ou « nom chiffré »), qualité, rôle procédural, demeure (alerte si client inconnu), courriels | `tamila_parties` (`P:151`) + déchiffrement | lisibles si exemple, ou fenêtre de consultation ouverte, ou parties lues (`D:110`) ; sinon « se lisent après une lecture tracée » | 38 |
| B20 | « Appel et délais de procédure » | `D:610-690` | dossier | appel : introduit le, régime, procédure, rôle du client, cour, clôture prévisible ; par délai : échéance retenue (retard / proche), acte, statut, J-n, raisons « À vérifier », article + départ + augmentation, correction, confirmation, interruption, acte déposé, annulation ; dépliant « Comment la date est calculée » (`:662-673`) avec sanction et alternatives | `tamila_appels` (`P:152`), `tamila_delais` (`P:153`), `tamila_regles_procedure` (`P:108`), demandes confirmer_delai | toujours ; actions par délai si délai courant et `peutEcrire` (`:674`) ; Confirmer si demande liée | 81 |
| B21 | « Audiences » | `D:693-726` | dossier | date (heure), nature, statut, « Venue d'un avis », juridiction · chambre, avocat qui plaide, renvoi | `tamila_audiences` (`P:154`) | toujours ; action si prévue et `peutEcrire` | 34 |
| B22 | « Pièces attendues » | `AttentesTamila.tsx:117-149` (monté `D:729`) | dossier | objet (ou « objet chiffré »), de qui, relance due / prévue, demandée le, nb de relances | `chargerAttentes` (`P:404-409`) → `tamila_attentes` | masqué si table absente (`:71`) ; gestes si `peutEcrire` ; Demander : clé requise en réel | 176 |
| B23 | « Une pièce attendue » | `AttentesTamila.tsx:151-173` | fenêtre | ce qui est attendu, de qui (client / confrère / tiers), relancer le | — | depuis B22 | (dans B22) |
| B24 | « Expertise » | `ExpertiseTamila.tsx:113-140` (monté `D:732`) | dossier | mission, ordonnée le, statut ; étapes (consignation, pré-rapport, dires, rapport) faites / attendues / en retard | `chargerExpertises` (`P:416-421`) → `tamila_expertises` | masqué si table absente (`:61`) ; gestes si `peutEcrire` et en cours | 167 |
| B25 | « Une expertise ordonnée » / « Les dates de l'expertise » | `ExpertiseTamila.tsx:142-164` | fenêtre | six dates | — | depuis B24 | (dans B24) |
| B26 | « Lectures du dossier » | `AnalysesTamila.tsx:197-233` (monté `D:735`) | dossier | 5 boutons de lecture ; avertissement « la clé est sous la phrase » ; notice ; par lecture : type, statut, critiques, « à vérifier », demandée le, pièces lues / non lues, motif, Lire | `chargerAnalyses` (`P:446-453`) → `analyses` (module tamila, ≤ 30) | masqué si table absente (`:114`) ; boutons : `peutEcrire` et avocat, dossier vivant, **clé au coffre en réel** (`:203`) | 309 + 165 (`analyses.ts`) |
| B27 | « <Type de lecture> — <référence> » | `AnalysesTamila.tsx:235-306` | fenêtre | résumé, constats (code, gravité, données, texte), citations vérifiées / non retrouvées avec renvoi pièce-page-lignes cliquable, état des pièces citées (produite / retrouvée / attendue / absente + « Réclamer au confrère ») ; cadre d'impression | `resultat_chiffre` déchiffré ; `chargerAttentes` pour les pièces citées | depuis « Lire » (lecture finie ou partielle) ; renvoi cliquable en réel avec clé | (dans B26) |
| B28 | « Pièces » | `D:738-771` | dossier | nom de fichier, statut de lecture (Lue, Attend l'ouverture, En lecture, Échec, Rejetée, À vérifier, Reçue), « Chiffrée », nature, déposée le / par, taille, motif (« Le lecteur ne lit pas encore les pièces chiffrées ») | `pieces` objet_type `tamila_dossier` (`P:161`) | toujours ; Bordereau : pièces et clair lisible ; Déposer : `peutEcrire` et clé en réel | 34 |
| B29 | « Bordereau de pièces » | `BordereauImprimable.tsx:51-84` (monté `D:746-753`) | fenêtre | pièces cochées et ordonnées (monter / descendre), aperçu imprimable avec en-tête du cabinet, parties pour / contre | `pieces`, `reglages.facture_entete`, parties déchiffrées ; `bordereau.ts` | depuis B28 | 85 + 46 |
| B30 | « Honoraires » | `HonorairesTamila.tsx:384-522` (monté `D:774`) | dossier | bandeau « Pas de convention signée » (> 15 j) ; à facturer HT + durée, provisions disponibles / demandées, reste dû / facturé TTC ; convention (statut, mode, taux, forfait, résultat, TVA) ; **forfait consommé** (jauge, alertes 80 % / 100 %) ; **Proposé à la saisie** (≤ 5) ; temps passé (6 puis tout) ; provisions et factures | `chargerHonoraires` (`P:303-323`) → `tamila_conventions`, `tamila_temps`, `tamila_provisions`, `tamila_factures`, `tamila_temps_ecartes` ; propositions `temps.ts` sur audiences, délais, avis du dossier | masqué si tables absentes (`:376`) ; boutons selon `peutEcrire` / `peutGerer && avocat` / `peutEncaisser` (`D:774`) | 659 + 78 (`temps.ts`) |
| B31 | Fenêtre des gestes d'honoraires (9 formulaires : temps, forfait, convention, signer, provision, reçue, facturer + aperçu, payée, annuler facture) | `HonorairesTamila.tsx:541-656` | fenêtre | champs propres à chaque geste ; aperçu HT / TVA / TTC / provisions / reste (`:616-622`) | — | depuis B30 | (dans B30) |
| B32 | « Facture <numéro> » / « Compte détaillé définitif <numéro> » | `FactureImprimable.tsx:96-143` (monté `HonorairesTamila.tsx:524-539`) | fenêtre | avertissement en-tête incomplet ; client (pré-rempli déchiffré), adresse (non enregistrée) ; **édition de l'en-tête du cabinet** (13 champs + délai de paiement, `:40-48,115-132`) ; aperçu imprimable | `reglages.facture_entete` ; `facture.ts` | depuis « Imprimer » d'une facture non annulée ; édition : gérant | 144 + 127 |
| B33 | « Conflits d'intérêts et vigilance » | `ConformiteTamila.tsx:264-327` (monté `D:777`) | dossier | bandeaux : pas de clé d'index (+ bouton gérant), conflits sans décision, parties jamais contrôlées, vigilance à faire ; dernier contrôle, parties indexées N sur M, vigilance (assujetti, activité, risque) ; résultats par partie (conflit / déjà connu / aucune correspondance, dossiers trouvés, hors vue, effacé) | rpc `tamila_conformite` (`P:383-389`), `tamila_index_cle` (`P:390`) | masqué si la porte est absente (`:220`) ; Contrôler : index et noms lisibles ; Vigilance : `peutGerer && avocat` ; **contrôle automatique** de toute nouvelle partie client/adverse (`:207-216`) | 384 + 64 (`index.ts`) |
| B34 | « La vigilance LCB-FT du dossier » / « Décider : <nom> » | `ConformiteTamila.tsx:329-381` | fenêtre | assujetti, activité, dates d'identification et du bénéficiaire effectif, pièce d'identité, risque ; ou décision + motif | — | depuis B33 | (dans B33) |
| B35 | « Avis RPVA » | `D:780-809` | dossier | date, type, statut, confiance (Saisi / Lu gabarit / Proposé par le modèle), effet, audience, date limite, déposé le, « Le n° RG ne concorde pas » | `tamila_avis` (`P:155`) | toujours ; Saisir : `peutEcrire` et ouvert/audit | 30 |
| B36 | « Qui voit le dossier » + sous-titre « Murailles » | `D:812-858` | dossier | membres : nom, rôle dans le dossier, « Jusqu'au », rôle au cabinet, entré le ; mention associés ; murailles : personne, en place / levée / levée demandée, posée par, levée par, motif chiffré ou sans motif | `tamila_dossiers_membres` (`P:156`), `tamila_murailles` (`P:157`) | toujours ; murailles si au moins une | 47 |
| B37 | « Exports » + « Archive conservée N jours, puis purgée » | `D:861-884` | dossier | date, demandé par, statut (Prêt, En préparation, Échec, Expiré), taille, disponible jusqu'au, téléchargements, empreinte du manifeste | `tamila_exports` (`P:158`), `reglages.conservation_exports_jours` | toujours ; Télécharger si prêt | 24 |
| B38 | « Journal des accès » | `D:887-906` | dossier | 30 dernières lectures : personne, nature (consulté / demandé un export / téléchargé), date et heure | rpc `tamila_journal_acces` (`P:160`) | toujours ; vide si la porte manque | 20 |
| B39 | Fenêtre du geste du dossier (19 formulaires : partie, résidence, appel, délai par règle + calcul, date fixée, confirmer, corriger, interrompre, annuler, acte, audience, renvoyer, avis, membre, muraille, décider, clôture, export, pièce) | `D:909-1130` (titres `D:505-509`) | fenêtre | champs de chaque geste ; textes réglementaires (art. 908, 915-3, 915-4, décret 2023-1391…) ; avertissements (après échéance `:1014`, effacement `:1086`, motif sans clé `:1083`) | `regles` (règles applicables `D:142-145`), `personnes`, `pieces` | depuis B18-B21, B28, B35, B36 | 222 |

---

## 3. Gestes

### 3.1 Gestes qui écrivent ou envoient

« Fenêtre » = le geste passe par une boîte de dialogue qui sert de confirmation ; « aucune » = un clic suffit. En exemple, chaque geste est appliqué en mémoire après 300 à 400 ms, rien n'est écrit (`D:121-139`, `HonorairesTamila.tsx:174-192`).

| # | Libellé | Bloc | Fonction → rpc / table | Fenêtre | Rôle requis (écran) | Après |
|---|---|---|---|---|---|---|
| G1 | Installer Tamila | B3 | `installer` (`P:186`) → `tamila_installer` | aucune | gérant (`E:624`) | relit le cabinet, « Tamila est installé… » (`E:464-476`) |
| G2 | Nouveau dossier → **Ouvrir le dossier** | B1 → B16 | `creerDossier` (`P:205`) → `tamila_creer_dossier` ; au coffre, d'abord Edge `tamila-coffre` `nouvelle_cle` (`E:409`) ; sinon clé tirée et enveloppée sous la phrase (`E:421-422`) | B16 | non lecteur, installé ; collaborateur : dossier en attente d'accord | clé posée au trousseau, clair connu, relecture, dossier choisi (`E:394-462`) |
| G3 | Passer au coffre Scaleway | B14 | `coffre("activer")` (`P:258`) → Edge `tamila-coffre` | B14 | gérant, statut local | relecture, statut bascule (`E:488-506`) |
| G4 | Ré-envelopper N dossiers | B14 | par clé locale : déballage par la phrase, `coffre("reenvelopper", {dossier, cle})` | B14 | associé (bouton coffre), statut bascule, phrase | progression, liste des échecs, relecture (`E:509-545`) |
| G5 | Lire les références de la liste (N ouvertures de clé) | B4 | `coffre("cle_dossier")` par dossier (journalisé) | aucune | réel au coffre | clairs posés ; dossiers renvoyés à la phrase écartés (`E:554-572`) |
| G6 | (implicite) choisir un dossier dans la liste | B10 | `tamila_consulter`, `tamila_journal_acces`, `tamila_cle_dossier` ou coffre `cle_dossier` (§ 0.3) | aucune | qui voit le dossier | dossier chargé et déchiffré (`E:246-279,308-325`) |
| G7 | Rattacher → **Chiffrer et rattacher** | B7 → B8 | par pièce jointe : `telecharger` (bucket) → `chiffrerOctets` → `televerser` (`P:278-282`) → `deposerPiece` (`P:283`, `tamila_deposer_piece`) ; puis `rattacherAvis` (`P:499`) → `tamila_rattacher_avis` | B8 | qui voit la file ; clé du dossier ouverte | avis retiré de la file, dossier ouvert et relu (`E:296-306`) (`AvisEntrantsTamila.tsx:109-143`) |
| G8 | Écarter → **Écarter** | B7 → B8 | `ecarterAvis` (`P:500`) → `tamila_ecarter_avis` (motifs `:41`) | B8 | avocat | avis retiré, copie en clair effacée (`:145-159`) |
| G9 | Approuver / Refuser (décision en attente) | B18 → B39 | `decider` (`P:224`) → `tamila_decider` | B39 (décision + commentaire) | `roles_autorises` de la demande (`D:148`) | ouvrir_dossier → ouvert / refusé ; cloturer_dossier → clos + effacement programmé ; lever_muraille → muraille levée (`D:249-274`) |
| G10 | Exporter le dossier → Demander l'export | B18 → B39 | `demanderExport` (`P:275`) → `tamila_demander_export` | B39 | statut attente/ouvert/audit/clos | export « En préparation » dans B37 (`D:408-413`) |
| G11 | Clôturer le dossier → Demander la clôture | B18 → B39 | `demanderCloture` (`P:288`) → `tamila_demander_cloture` | B39 (avertit : effacé N jours après) | `peutGerer` ; ouvert/audit ; pas déjà demandée | demande en attente (décision d'un associé) (`D:382-387`) |
| G12 | Annuler la clôture | B18 | `annulerCloture` (`P:289`) → `tamila_annuler_cloture` | **aucune** | gérant, clos | rouvert au statut d'avant (`D:559-561`) |
| G13 | Convertir l'audit en dossier | B18 | `convertirAudit` (`P:290`) → `tamila_convertir_audit` | **aucune** | gérant, audit | ouvert, effacement retiré (`D:562-564`) |
| G14 | Ajouter (partie) | B19 → B39 | nom et courriel chiffrés → `ajouterPartie` (`P:207`) → `tamila_ajouter_partie` | B39 | `peutEcrire` ; clé en réel | relecture ; **déclenche le contrôle automatique des conflits** (B33) (`D:173-191`) |
| G15 | Résidence | B19 → B39 | `modifierPartie` (`P:209`) → `tamila_modifier_partie` | B39 | `peutEcrire` | relecture (`D:192-199`) |
| G16 | Retirer (partie) | B19 | `retirerPartie` (`P:211`) → `tamila_retirer_partie` | **aucune** | `peutEcrire` | relecture (`D:598`) |
| G17 | Déclarer l'appel / Modifier l'appel | B20 → B39 | `declarerAppel` (`P:216`) → `tamila_declarer_appel` | B39 (régime calculé) | `peutEcrire` | relecture ; le socle pose les délais de l'appelant (`D:200-218`) |
| G18 | Délai → Enregistrer (règle, départ, demeure) | B20 → B39 | `poserDelai` (`P:222`) → `tamila_poser_delai` | B39 (+ « Calculer la date », L9) | `peutEcrire`, appel déclaré | délai à confirmer + demande (`D:219-233`) |
| G19 | Date fixée | B20 → B39 | `poserDate` (`P:223`) → `tamila_poser_date` | B39 | `peutEcrire` ; confirmée d'office par un avocat | `D:234-248` |
| G20 | Confirmer (délai) | B20 → B39 | `decider` → `tamila_decider` (demande confirmer_delai) | B39 (avec le détail du calcul) | avocat et rôle autorisé | délai confirmé ou rejeté (`D:677`) |
| G21 | Corriger la date | B20 → B39 | `corrigerDelai` (`P:225`) → `tamila_corriger_delai` (motifs `MOTIFS_CORRECTION`) | B39 | avocat | date retenue changée, calcul gardé (`D:275-283`) |
| G22 | Interrompre | B20 → B39 | `interrompreDelai` (`P:226`) → `tamila_interrompre_delai` | B39 | avocat ; règle interruptible | `D:284-292` |
| G23 | Acte déposé | B20 → B39 | `declarerActe` (`P:228`) → `tamila_declarer_acte` (sans pièce) | B39 (alerte si après l'échéance) | avocat | délai clos ; alerte critique si hors délai (`D:301-308`) |
| G24 | Annuler (délai) | B20 → B39 | `annulerDelai` (`P:227`) → `tamila_annuler_delai` | B39 (bouton rouge) | avocat | délai annulé, reste au dossier (`D:293-300`) |
| G25 | Ajouter (audience) | B21 → B39 | `ajouterAudience` (`P:230`) → `tamila_ajouter_audience` | B39 | `peutEcrire` | `D:309-322` |
| G26 | Renvoyer / tenue / annulée | B21 → B39 | `changerAudience` (`P:232`) → `tamila_changer_audience` | B39 | `peutEcrire`, audience prévue | nouvelle audience si renvoi (`D:323-337`) |
| G27 | Demander (pièce attendue) → Noter | B22 → B23 | objet chiffré → `poserAttente` (`P:410`) → `tamila_poser_attente` | B23 | `peutEcrire` ; clé en réel | « remontera au point du matin » (`AttentesTamila.tsx:94-107`) |
| G28 | Reçue (attente) | B22 | `noterAttente(…, "recue")` (`P:411`) → `tamila_noter_attente` | **aucune** | `peutEcrire` | `AttentesTamila.tsx:108-113,140` |
| G29 | Relancée | B22 | `noterAttente(…, "relancee", null, J+7)` | **aucune** | `peutEcrire` | prochaine relance à 7 jours (`:141`) |
| G30 | Abandonner | B22 | `noterAttente(…, "abandon")` | **aucune** | `peutEcrire` | `:142` |
| G31 | Ordonnée (expertise) → Enregistrer | B24 → B25 | `poserExpertise(dossier, null, champs)` (`P:423`) → `tamila_poser_expertise` | B25 | `peutEcrire` | `ExpertiseTamila.tsx:90-99` |
| G32 | Dates (expertise) → Enregistrer | B24 → B25 | `poserExpertise(dossier, id, champs)` | B25 | `peutEcrire`, en cours | `:135` |
| G33 | Consignation versée | B24 | `noterExpertise(id, "consignation_versee")` (`P:425`) → `tamila_noter_expertise` | **aucune** | `peutEcrire`, en cours | daté du jour (`:100-101,134`) |
| G34 | Pré-rapport reçu | B24 | idem `pre_rapport_recu` | **aucune** | idem | idem |
| G35 | Dires adressés | B24 | idem `dires_deposes` | **aucune** | idem | idem |
| G36 | Rapport définitif reçu | B24 | idem `rapport_recu` (clôt l'expertise) | **aucune** | idem | statut « Rapport déposé » |
| G37 | Pré-lecture | B26 | `demanderAnalyse(dossier, "prelecture")` (`P:454`) → `tamila_demander_analyse` | **aucune** (coût IA) | `peutEcrire` et avocat ; vivant ; clé au coffre | lecture « Demandée » (`AnalysesTamila.tsx:151-169,201-206`) |
| G38 | Chronologie | B26 | idem `chronologie` | **aucune** | idem | idem |
| G39 | Contradictions | B26 | idem `contradictions` | **aucune** | idem | idem |
| G40 | Bordereau (lecture IA) | B26 | idem `bordereau` | **aucune** | idem | idem |
| G41 | Pièces citées | B26 | idem `pieces_citees` | **aucune** | idem | idem |
| G42 | Réclamer au confrère | B27 | objet chiffré → `poserAttente(dossier, "confrere", …)` | **aucune** | `peutDemander`, vivant, clé | pastille « Déjà dans les pièces attendues » (`AnalysesTamila.tsx:139-149,270`) |
| G43 | Déposer → **Chiffrer et déposer** | B28 → B39 | fichier chiffré → `televerser` (bucket `omega-clients`) → `deposerPiece` → `tamila_deposer_piece` | B39 | `peutEcrire` ; clé en réel | pièce « Reçue » ou « Attend l'ouverture » (`D:388-407`) |
| G44 | Saisir du temps → Saisir | B30 → B31 | description chiffrée → `saisirTemps` (`P:370`) → `tamila_saisir_temps` | B31 | `peutEcrire` | `HonorairesTamila.tsx:205-225` |
| G45 | Saisir (proposition) → Saisir | B30 → B31 | `saisirTempsPropose` (`P:458`) → `tamila_saisir_temps_propose` (porte l'origine) | B31 (pré-rempli) | `peutEcrire`, ouvert/audit | proposition retirée (`:197-198,219`) |
| G46 | Ignorer (proposition) | B30 | `ecarterProposition` (`P:460`) → `tamila_ecarter_proposition` | **aucune** | `peutEcrire` | plus proposée (`:199-200,465`) |
| G47 | Annuler (temps) | B30 | `annulerTemps` (`P:372`) → `tamila_annuler_temps` | **aucune** | auteur ou `peutGerer`, et `peutEcrire` | `:359-360,483` |
| G48 | Convention → Poser la convention | B30 → B31 | `poserConvention` (`P:367`) → `tamila_poser_convention` | B31 | `peutGerer && avocat` | l'ancienne est résiliée (`:239-258`) |
| G49 | Enregistrer la signature | B30 → B31 | `signerConvention` (`P:369`) → `tamila_signer_convention` (pièce facultative) | B31 | `peutGerer` ; convention proposée | `:260-272,426` |
| G50 | Prévoir / Modifier le temps du forfait | B30 → B31 | `prevoirForfait` (`P:461`) → `tamila_prevoir_forfait` | B31 | `peutGerer` | jauge (`:227-237,447`) |
| G51 | Provision → Demander | B30 → B31 | `demanderProvision` (`P:373`) → `tamila_demander_provision` | B31 | `peutGerer && avocat` | `:274-282` |
| G52 | Reçue (provision) → Noter reçue | B30 → B31 | `provisionRecue` (`P:374`) → `tamila_provision_recue` | B31 | `peutEncaisser` | `:284-293,500` |
| G53 | Facturer → Émettre la facture / le compte définitif | B30 → B31 | `emettreFacture` (`P:375`) → `tamila_emettre_facture` | B31 (aperçu) | `peutGerer && avocat`, convention signée ou urgence | numéro sans trou (`:295-332`) |
| G54 | Payée → Noter payée | B30 → B31 | `facturePayee` (`P:377`) → `tamila_facture_payee` | B31 | `peutEncaisser` | `:334-343,515` |
| G55 | Annuler (facture) → Annuler la facture | B30 → B31 | `annulerFacture` (`P:378`) → `tamila_annuler_facture` (motif codé) | B31 (rouge) | `peutGerer` | temps et provisions redeviennent à facturer (`:345-357,516`) |
| G56 | Modifier l'en-tête du cabinet → Enregistrer l'en-tête | B32 | `poserEnteteFacture` (`P:400`) → `tamila_poser_entete_facture` | dans B32 | gérant | en-tête de toutes les factures et du bordereau (`FactureImprimable.tsx:72-93,113,129`) |
| G57 | Créer la clé d'index du cabinet | B33 | au coffre : Edge `nouvelle_cle_index` ; sinon `poserIndexCle` (`P:391`) → `tamila_poser_index_cle` (enveloppée sous la phrase) | **aucune** | gérant | `ConformiteTamila.tsx:159-173,284` |
| G58 | Contrôler les conflits (et **contrôle automatique** d'une nouvelle partie) | B33 | empreintes HMAC → `indexerPartie` (`P:392`, si `peutEcrire`) → `controlerConflits` (`P:393`) → `tamila_controler_conflits` | **aucune** | index posé, noms lisibles | résultats par partie ; conflit auto = message d'erreur bloquant (`:176-216,268`) |
| G59 | Décider (conflit) → Enregistrer | B33 → B34 | `deciderConflit` (`P:395`) → `tamila_decider_conflit` | B34 | `peutGerer && avocat` | `:222-234,318` |
| G60 | Vigilance LCB-FT → Enregistrer | B33 → B34 | `poserVigilance` (`P:396`) → `tamila_poser_vigilance` | B34 | `peutGerer && avocat` | `:236-253,271` |
| G61 | Saisir un avis → Enregistrer | B35 → B39 | `avisLu` (`P:234-235`) → `tamila_avis_lu` (**confiance envoyée « gabarit »**) | B39 | `peutEcrire`, ouvert/audit | délais posés / audience ajoutée / appel orienté (`D:338-362`) |
| G62 | Ajouter (membre) | B36 → B39 | `ajouterMembre` (`P:213`) → `tamila_ajouter_membre` | B39 | `peutGerer` | `D:363-372` |
| G63 | Muraille → Poser la muraille | B36 → B39 | motif chiffré → `poserMuraille` (`P:272`) → `tamila_poser_muraille` | B39 (rouge) | gérant ; attente/ouvert/audit | personne retirée du dossier (`D:373-381`) |
| G64 | Retirer (membre) | B36 | `retirerMembre` (`P:214`) → `tamila_retirer_membre` | **aucune** | `peutGerer` ou soi-même | `D:830` |
| G65 | Demander la levée | B36 | `demanderLeveeMuraille` (`P:273`) → `tamila_demander_levee_muraille` | **aucune** | gérant, pas soi | demande lever_muraille (`D:852`) |
| G66 | Télécharger l'archive | B37 | `telechargerExport` (`P:286`) → `tamila_telecharger_export` ; puis bucket + `ouvrirArchive` (clé) ou URL signée (`P:293-298`) | **aucune** | qui voit le dossier ; export prêt | zip en clair ou archive chiffrée ; tracé (`D:419-446`) |

### 3.2 Gestes locaux (rien n'est écrit en base, mais ils doivent survivre)

| # | Libellé | Bloc | Ce qu'il fait | fichier:ligne |
|---|---|---|---|---|
| L1 | Mémoriser pour cet onglet | B15 | phrase en `sessionStorage`, trousseau vidé, clairs relus | `E:361-372,858` |
| L2 | Oublier la phrase | B15 | efface la phrase et le trousseau | `E:373-381,857` |
| L3 | Compteurs (bascule de filtre) | B9 | filtre la liste | `E:670` |
| L4 | Choisir un dossier | B10 | ouvre le dossier (voir G6) ; défile en mobile | `E:699-702` |
| L5 | Référence cliquable (Honoraires du cabinet, Pilotage) | B12, B13 | ferme la fenêtre, ouvre le dossier, retire le filtre | `HonorairesCabinet.tsx:164`, `PilotageCabinet.tsx:107-109` |
| L6 | Filtres Tous / À facturer / À traiter | B12 | — | `HonorairesCabinet.tsx:148-154` |
| L7 | Exporter (CSV) des honoraires | B12 | fichier `honoraires-cabinet-AAAA-MM-JJ.csv` | `HonorairesCabinet.tsx:115-126,183` |
| L8 | Vues du pilotage ; coût de revient d'une heure | B13 | coût en `localStorage` | `PilotageCabinet.tsx:97-106,127-138` |
| L9 | Calculer la date | B39 | rpc de lecture `tamila_calculer_delai` (`P:220-221`) | `D:484-500,976` |
| L10 | Comment la date est calculée / Masquer le calcul | B20 | dépliant | `D:664` |
| L11 | Agenda (.ics) | B21 | audiences prévues en RFC 5545 | `D:449-470,697` |
| L12 | Bordereau → monter / descendre / cocher → Imprimer ou PDF | B28, B29 | impression du cadre | `D:742`, `BordereauImprimable.tsx:42-49,80` |
| L13 | Lire (lecture) ; renvoi pièce-page | B26, B27 | déchiffre le résultat ; télécharge et déchiffre la pièce, l'ouvre à la page | `AnalysesTamila.tsx:118-130,171-182,228` |
| L14 | Word ; Imprimer ou PDF (lecture) | B27 | `.doc` et impression | `AnalysesTamila.tsx:185-193,300-301` |
| L15 | Tout le temps / Moins | B30 | — | `HonorairesTamila.tsx:487` |
| L16 | Imprimer (facture) → Imprimer ou enregistrer en PDF | B30, B32 | client et adresse non enregistrés | `HonorairesTamila.tsx:514`, `FactureImprimable.tsx:70,139` |
| L17 | Exporter (CSV) du journal | B38 | `journal-acces-<réf>.csv` | `D:473-482,890` |

---

## 4. Liste et filtres

| Sujet | Constat | fichier:ligne |
|---|---|---|
| Familles (compteurs-filtres) | `a_confirmer` « Délais à confirmer · par un avocat » (ambre), `proches` « Échéances sous 15 jours · actes à déposer » (rouge), `audiences` « Audiences à venir · dans les 30 jours » (bleu), `ouverts` « Dossiers ouverts · ouverts, audits, en attente » (vert), `clos` « Dossiers clos · effacés à l'échéance » (gris) | `E:54-62` |
| Calcul des compteurs | `a_confirmer` **compte des délais** (somme) alors que le filtre montre des **dossiers** ; les quatre autres comptent des dossiers ; `proches` = prochaine échéance d'un délai courant ≤ 15 j, **dépassés compris** ; `audiences` = prochaine audience prévue ≤ 30 j | `E:205-215`, `delaiCourt` `regles.ts:235-237` |
| Filtre actif | un seul à la fois, re-clic = aucun ; sans filtre, tout sauf `efface` ; `refuse` reste visible sans filtre ; `efface` n'est jamais visible | `E:217-225,670` |
| Tri | rang 0 = au moins un délai à confirmer ; 1 = une échéance courante ; 2 = le reste ; 3 = clos ou refusé ; puis échéance la plus proche ; puis création la plus récente | `E:226-233` |
| Dossier ouvert par défaut | le dossier choisi s'il est visible, sinon le premier de la liste triée | `E:236-237` |
| Recherche | **Aucune recherche texte dans la liste.** `index.ts` n'est pas une recherche de liste : c'est l'**index aveugle des parties** pour le contrôle des conflits (normalisation des noms, SIREN, HMAC sous la clé d'index du cabinet) | `index.ts:1-64`, utilisé `ConformiteTamila.tsx:33,97-109,187` ; aussi `pilotage.ts:13,88` (séries) |
| Volume lu | 300 dossiers au plus, du plus récent au plus ancien | `P:101` |
| Temps réel | relecture sur changement de `tamila_dossiers`, `tamila_delais`, `tamila_audiences`, `demandes_validation` | `E:142` |
| États d'un dossier | attente « Attend l'ouverture », ouvert, audit, clos, efface « Effacé », refuse « Ouverture refusée » | `regles.ts:13-20` |
| États d'un délai | a_confirmer, confirme, rejete, interrompu, clos « Acte déposé », annule | `regles.ts:22-29` |
| États d'une audience | prevue, renvoyee, tenue, annulee | `regles.ts:96-101` |
| États d'un avis RPVA | lu, applique, sans_effet, a_rattacher, a_verifier | `regles.ts:116-122` |
| États d'un avis entrant | a_rattacher, rattache, ecarte, expire | `P:471` |
| États d'une pièce | lue, a_rattacher, en_lecture, echec, rejetee, a_verifier, recue | `D:759` |
| États d'une lecture | demandee, en_cours, finie, partielle, echec | `AnalysesTamila.tsx:39-42` |
| États d'un export | pret, a_preparer, echec, expiré | `D:872` |
| États convention / temps / provision / facture | proposee, signee, resiliee (+ urgence) / saisi, facture, annule / demandee, recue, annulee / emise, payee, annulee | `HonorairesTamila.tsx:415,477,495,508` |
| États d'une expertise / attente / muraille | en_cours, deposee, abandonnee / attendue, recue, abandonnee / en place, levée, levée demandée | `ExpertiseTamila.tsx:127`, `AttentesTamila.tsx:111`, `D:843-844` |

---

## 5. Exemple ou réel

| Point | Constat | fichier:ligne |
|---|---|---|
| Choix | `useSource()` : `localStorage` `espace.source` ; « réelle » seulement si une session est ouverte ; rendu serveur toujours « exemple » | `components/espace/source.tsx:27-53,72-80` |
| Indication | ruban « Données d'exemple » / « Base réelle » dans l'en-tête | `E:614`, `components/espace/ui.tsx:57-64` |
| Monde d'exemple | cabinet fictif « Delorme & Associés », 5 personnes, vous = gérant (`MOI`) ; 6 dossiers : 2026-0412 ouvert, 2026-0398 ouvert (dommage corporel), 2026-0377 ouvert, 2025-0291 clos, 2026-0430 en attente, AUDIT-2026-03 audit ; identifiants `0000…` ; dates relatives | `exemples.ts:1-35,123-236` |
| État modifiable | `local` (copie de `DOSSIERS_EXEMPLE`) modifiée par `onLocal` / `remplacerLocal` ; coffre d'exemple en mémoire | `E:76,95,356-358` |
| Jeux d'exemple par carte | honoraires `honorairesExemple` + `DESCRIPTIONS_TEMPS_EXEMPLE` (`exemples.ts:237-285`) ; conformité `conformiteExemple` (`:286-296`) ; expertise `expertisesExemple` (`:297-308`) ; attentes `attentesExemple` + `ATTENTES_OBJETS_EXEMPLE` (`:309-321`) ; **dans les composants eux-mêmes** : avis entrants `EXEMPLE` (`AvisEntrantsTamila.tsx:51-63`), lectures `exemple()` (`AnalysesTamila.tsx:44-85`), contrôle des conflits `controleExemple` (`ConformiteTamila.tsx:95-109`) | — |
| Ce qui change en exemple | pas de bouton Phrase ni bandeaux B3-B6 ; file B7 visible quel que soit le rôle (`E:656`) ; Honoraires et Pilotage visibles (vous êtes gérant) ; gestes simulés 300-400 ms ; création de la clé d'index sans effet (`ConformiteTamila.tsx:161`) ; en-tête de facture gardé en mémoire (`FactureImprimable.tsx:84`) ; lectures : boutons actifs sans coffre | — |
| Ce qui change en réel | `chargerCabinet` à l'ouverture (`E:114-131`) puis `chargerDossier` au choix (`E:308-325`) ; chaque carte lit sa table et **disparaît si la table ou la porte manque** (Honoraires `:376`, Conformité `:220`, Attentes `:71`, Expertise `:61`, Lectures `:114`, Avis entrants `:99`, coffre `P:242-249`) ; erreur de base : cabinet vide de rôle lecteur (`E:121-124`) | — |
| Remise à zéro | `key={source}` sur la file d'avis ; `key={complet.dossier.id}` sur le dossier | `E:658,731` |

---

## 6. Objets métier

| Objet | Table / porte | Identifiant | Blocs rattachés |
|---|---|---|---|
| Cabinet et réglages | `tamila_reglages` (`delai_cloture_jours`, `conservation_exports_jours`, `facture_entete`) ; `tamila_installer` | `client_id` | B1, B3, B32, B29, B37, B39 (clôture) |
| Dossier | `tamila_dossiers` ; objet_type `tamila_dossier` | `id` uuid | B9, B10, B11, B18 et tout le dossier ; B12, B13 |
| Clé de dossier | `tamila_cles` (`fournisseur` local / scaleway, `enveloppe`) | `dossier_id` | B4, B5, B14, B18 (« Clé du dossier ») |
| Coffre | rpc `tamila_coffre_etat` ; Edge `tamila-coffre` | `client_id` | B1, B4, B14 |
| Personne | `comptes` + rpc `annuaire` | `user_id` | B10, B16, B36, B39 ; B13 (Charge) |
| Partie | `tamila_parties` | `id` | B19, B29 (pour / contre), B32 (client), B33 |
| Appel | `tamila_appels` (un par dossier) | `dossier_id` | B20 |
| Règle de procédure | `tamila_regles_procedure` | `code` | B20, B39 |
| Délai | `tamila_delais` | `id` | B9, B10, B20, B13, B30 (propositions) |
| Demande de validation | `demandes_validation` (module tamila ; ouvrir_dossier, cloturer_dossier, lever_muraille, confirmer_delai) | `id`, `objet_id` = dossier | B18, B20 |
| Audience | `tamila_audiences` | `id` | B9, B10, B21, B13, B30 (propositions) |
| Avis RPVA | `tamila_avis` | `id` | B35, B30 (propositions), B13 |
| Avis entrant | `tamila_avis_entrants` + `receptions` (bigint) | `id` | B7, B8 |
| Pièce | `pieces` (objet_type `tamila_dossier`) + bucket `omega-clients` | `id` | B28, B29, B26-B27, B33-B34 (pièce d'identité), B31 (exemplaire signé), B13 |
| Lecture (journal) | rpc `tamila_journal_acces` | — | B38 |
| Lecture longue (analyse) | `analyses` (module tamila, objet_type `tamila_dossier`) | `id` | B26, B27 |
| Pièce attendue | `tamila_attentes` | `id` | B22, B23, B27, B13 |
| Expertise | `tamila_expertises` | `id` | B24, B25, B13 |
| Convention | `tamila_conventions` | `id` | B30, B31, B12, B13 |
| Temps | `tamila_temps`, `tamila_temps_ecartes` | `id`, `origine` | B30, B31, B32, B12, B13 |
| Provision | `tamila_provisions` | `id` | B30, B31, B12 |
| Facture | `tamila_factures` (numéro unique par cabinet) | `id`, `numero` | B30, B31, B32, B12, B13 |
| Index et contrôles de conflits | `tamila_index_cles`, `tamila_empreintes`, `tamila_controles_conflits` ; rpc `tamila_conformite` | `id` du contrôle | B33, B34 |
| Vigilance LCB-FT | `tamila_vigilances` | `dossier_id` | B33, B34, B13 |
| Membre | `tamila_dossiers_membres` | `id` | B36, B39 |
| Muraille | `tamila_murailles` ; rpc `tamila_registre_hors_vue` | `id` | B36, B6 |
| Export | `tamila_exports` | `id` | B18, B37 |

---

## 7. Promesses

### 7.1 Promesses de la page /secteurs/avocats (`omega/CHIFFRAGE/tamila.md`, textes dans `components/secteurs/avocats/textes.ts`) et le bloc qui les prouve

| Ligne chiffrage | Promesse (abrégée) | textes.ts | Bloc(s) qui la prouvent à l'écran |
|---|---|---|---|
| 1 | « Tamila suit désormais vos délais d'appel » | :37 | B9, B10, B20, B39 |
| 3, 11, 13, 46 | Chronologie dont chaque fait renvoie à sa pièce | :41, :57, :60, :171 | B26 (bouton Chronologie), B27 |
| 4, 15, 47 | Contradictions relevées, côte à côte | :41, :62, :171 | B26, B27 |
| 5, 14, 48 | Bordereau rapproché / contrôlé | :41, :61, :171 | B26 (lecture Bordereau), B29 (bordereau imprimable) |
| 8 | Notification d'une pièce reçue | Illustrations.tsx:63 | B7 |
| 9, 10, 26, 58 | Chaque pièce lue, même scannée ; familles lues | :47-50, :127, :171 | B28 (dépôt, nature, statut de lecture) |
| 16, 28 | Pièces chiffrées sur votre poste | :63, :136 | B15, B16, B19, B28, B39 (§ 0) |
| 17, 62 | Point du matin à 7 h | :70, :183-184 | écran Point (pas ici) ; atterrissage : entrées E1-E14 |
| 18, 63 | Forfaits dépassés ; conventions et forfaits | :73-74, :183-184 | B30 (jauge), B12 (signal ≥ 80 %) |
| 19, 63 | Sans diligence (30 jours) | :85-86, :183-184 | B13 vue « Sans diligence » (seuil 30, `pilotage.ts:109` ; le chiffrage disait 45, il est dépassé) |
| 20, 62 | Délais lus dans les avis RPVA, classés du plus proche | :97-98, :183-184 | B35, B7, B20 (tri `D:503`) |
| 21, 62 | Ce que le cabinet attend : client, expert, pièces citées par le confrère | :109-110, :183-184 | B22, B24, B27 (Réclamer), B13 vue « Pièces attendues » |
| 22 | Messagerie | :127 | B7 |
| 23 | Agenda | :127 | B21 « Agenda (.ics) » (le chiffrage disait D, l'export ICS existe) |
| 27 | Exports | :127 | B18 (Exporter), B37 |
| 39 | Ne lit que les dossiers que vous ouvrez, un par un | :147 | B26 (demande par dossier) |
| 41, 61 | Effacement à la clôture ; vous gardez l'export | :149, :172 | B18 (Clôturer, Effacement prévu), B39 (avertissement), B37 |
| 43 | Journal des accès, exportable à tout moment | :151 | B38 (Exporter CSV) |
| 51 | Pièces citées jamais communiquées, sommation prête | :171 | B26 « Pièces citées », B27 « Réclamer au confrère » (pas de sommation) |
| 52 | Dires à l'expert préparés sur le pré-rapport | :171-172 | B24 (dates des dires seulement) |
| 57 | Dossier de plaidoirie et renvois cliquables | :171 | B27 (renvoi cliquable), B29 (bordereau) |
| 59 | Export Word et PDF | :171-172 | B27 (Word, PDF), B32 (PDF), B29 (PDF) |
| 63 | Marge par dossier, Charge par avocat, Dossiers en série, Temps passé proposé à la saisie | :183-184 | B13 (Marge, Charge, Séries), B30 (Proposé à la saisie) |

### 7.2 `lib/en-preparation.ts` (TAMILA)

Livrées et retirées de la liste (commentaire `lib/en-preparation.ts:29-34`), donc **elles doivent garder leur écran** : effacement à la clôture → B18, B37 ; temps proposé et forfait consommé → B30 ; point du matin → atterrissage E1-E14 ; marge, charge, séries, dossiers sans diligence → B13 ; pièces attendues du client et de l'expert → B22, B24, B13.

Encore marquées « En préparation » (`lib/en-preparation.ts:35-66`), avec ce qui existe déjà à l'écran :

| Ligne en-preparation.ts | Texte | Écran existant |
|---|---|---|
| :37 | Pièces adverses du jour | aucun (B7 ne traite que les avis RPVA) |
| :38, :45 | Chronologie sourcée ; Dossier de faits daté et sourcé | B26, B27 |
| :39, :48 | Bordereau contrôlé ; Bordereau contrôlé (art. 768) | B26, B29 |
| :40, :46 | Contradictions relevées / entre pièces | B26, B27 |
| :49 | Dispositif contre motifs (art. 954) | aucun |
| :50 | Prétentions nouvelles et concentration en appel | aucun |
| :51 | Pièces citées jamais communiquées, sommation prête | B26, B27 (partiel) |
| :52 | Dires à l'expert préparés sur le pré-rapport | B24 (dates seulement) |
| :53 | Trous de la chronologie et faits contredits | B27 (partiel) |
| :54 | Index des personnes et faits classés par moyen | aucun |
| :55 | Questions posées au dossier | aucun |
| :56 | Premier jet de l'exposé des faits | aucun |
| :57 | Dossier de plaidoirie et renvois cliquables | B27, B29 (partiel) |
| :58 | Pièces scannées et manuscrites | B28 (dépôt) |
| :59 | Export Word et PDF | **B27, B32, B29 existent** : la ligne est encore marquée alors que le chiffrage la classe B |
| :60-:66 | Chronologie des soins, Interruptions de soins, Nomenclature Dintilhac, Écarts entre rapports d'expertise, Source de chaque poste de préjudice, Questions posées au dossier médical, Pièces médicales scannées | aucun propre (mode « dommage corporel » choisi en B16 seulement) |
| :65 | L'ensemble de la pré-lecture | B26 « Pré-lecture » |

Fonctions non promises sur la vitrine mais réglementaires ou de sécurité, à garder quand même : conflits d'intérêts et vigilance LCB-FT (B33, RIN art. 4, CMF L.561-3), murailles (B36), coffre et phrase (B14, B15), facturation numérotée et compte définitif (B30-B32, RIN art. 11.7), convention obligatoire (loi 31/12/1971 art. 10).

---

## 8. Regroupements naturels et observations

### 8.1 Par sujet

| Sujet | Blocs | Lignes cumulées (environ) |
|---|---|---|
| Accès et chiffrement (phrase, coffre, installation, bandeaux) | B1 (Phrase, Coffre), B3, B4, B5, B6, B14, B15 | 150 |
| Arrivées à traiter | B7, B8 | 235 |
| Liste et urgences | B9, B10, B11 | 155 |
| Procédure (échéances) | B20, B21, B24, B25, B35, B39 (formulaires délais, audiences, avis) | 145 + 167 + ~120 |
| Pièces et lectures | B22, B23, B26, B27, B28, B29 | 176 + 474 + 34 + 131 |
| Honoraires | B30, B31, B32, B12 | 659 + 78 + 271 + 188 |
| Conformité et secret | B33, B34, B36, B37, B38, B18 (clôture, export) | 448 + 91 + 51 |
| Pilotage du cabinet | B12, B13 | 188 + 387 |
| Création d'un dossier | B16, B19 (parties), B33 (contrôle à l'entrée d'une partie), B20 (appel) | 71 + 38 + … |

### 8.2 Par fréquence d'usage (déduite des déclencheurs du point du matin et des textes)

| Fréquence | Blocs |
|---|---|
| Quotidien | B7 (avis à rattacher, s'effacent à 7 j), B9-B10 (compteurs, liste), B20 (confirmer, acte déposé), B21 (audiences du jour), B30 temps saisi et propositions, B22 (relances dues), B18 (décisions en attente) |
| Ponctuel, au fil du dossier | B16 (ouvrir), B19 (parties), B20 (appel, délais), B24 (expertise), B26-B27 (lectures), B28-B29 (pièces, bordereau), B30-B31 (convention, provision, facture), B33-B34 (conflits à l'entrée, vigilance), B36 (membres, murailles), B37 (exports), B18 (clôture) |
| Périodique, cabinet | B12 (honoraires du cabinet), B13 (pilotage), B38 (journal) |
| Réglage, rare | B3 (installer, une fois), B14 (coffre, une fois puis bascule), B32 édition de l'en-tête (une fois), B33 « Créer la clé d'index » (une fois), coût horaire du pilotage (B13) |
| Par session | B15 (phrase, par onglet) |

### 8.3 Doublons et chevauchements

1. **Pièces attendues à trois endroits** : B22 (carte du dossier), B13 vue « Pièces attendues » (qui y ajoute expertise, convention, accusé RPVA, pièce d'identité, `pilotage.ts:130-165`), B27 « Réclamer au confrère » qui écrit dans la même table.
2. **Avis RPVA par trois entrées** : B7 (par courriel), B35 « Saisir un avis » (à la main), B28 dépôt d'une pièce de nature « avis RPVA » (`D:1107`). Le résultat est lu dans B35, et ses effets dans B20 et B21.
3. **Deux « Bordereau » dans le même dossier** : la lecture IA « Bordereau » (B26, G40) et le bordereau imprimable (B28 → B29, local).
4. **Export coupé en deux** : la demande dans l'en-tête (B18, G10), le résultat trois cartes plus bas (B37, G66). Trois autres exports CSV (B12, B38) et un PDF (B32, B29) sont épars.
5. **Décisions sur deux cartes** : confirmer_delai dans B20 (par délai), les autres demandes dans B18 ; les mêmes `demandes_validation` sont aussi dans l'écran commun À valider.
6. **Calcul des honoraires partagé** : `resumer` (`HonorairesTamila.tsx:90-109`) sert B30, B12 (`HonorairesCabinet.tsx:23,85`) et B13 (`pilotage.ts:12`) ; même calcul, trois présentations.
7. **Échéances dispersées** : délais (B20), audiences (B21), expertise (B24), relances (B22) sont quatre cartes, alors que le point du matin les réunit.

### 8.4 Blocs mal rangés

1. **Pages entières dans des fenêtres** : « Honoraires du cabinet » (tableau, filtres, export) et « Pilotage » (cinq vues, réglage) sont des `Dialog` ouverts depuis l'en-tête (B12 `DialogContent className="tam-cabinet-dialogue"`, B13).
2. **Réglages dans la barre de l'écran quotidien** : coffre (B14), installation (B3), clé d'index (dans une carte de dossier, B33), en-tête du cabinet (dans l'aperçu d'une facture, B32). Ce sont des réglages du cabinet, pas d'un dossier.
3. **Conflits d'intérêts après les honoraires** : B33 est la 11e carte du dossier (`D:777`), alors que le contrôle a lieu à l'entrée d'une partie, avant d'accepter le dossier (RIN art. 4).
4. **Un dossier de 14 cartes** (B18 à B38, `D:517-906`) plus 4 fenêtres internes ; l'en-tête B18 porte à la fois l'identité, les décisions, l'export, la clôture et la conversion d'audit.
5. **Lectures (B26) avant Pièces (B28)** alors qu'elles en dépendent (`D:735,738`).

### 8.5 Faits utiles pour le découpage

1. **Aucune entrée ne désigne un dossier** (§ 1.1) et l'écran ne lit aucun paramètre (§ 1.3). Les 15 liens atterrissent sur la liste, premier dossier ouvert. Une sous-page doit pouvoir être visée par un filtre (E1, E2, E3, E6, E10 → compteurs ; E4, E8, E9 → honoraires ; E5, E15 → avis entrants ; E7 → conflits ; E11-E14 → expertise / pièces attendues). `aiguillage.ts` (479f9d88) prévoit `?objet=tamila_dossier:<id>`, qui ne servira qu'aux demandes de validation.
2. **Deux vues cabinet manquent** pour des lignes du point : E4 (propositions de temps, seulement par dossier) et E7 (conflits sans décision, seulement dans la carte B33 de chaque dossier).
3. **Le trousseau et les clairs vivent dans EcranTamila** (`E:78-81,89`) et sont transmis aux enfants par props (`cle`, `clair`, `referenceDe`, `cleDe`). B7 (proposition de dossier par n° RG), B12 et B13 (références, séries) ont besoin des clairs **de toute la liste**. Toute sous-page qui montre une référence ou un nom doit partager ce trousseau, sinon il faut tout redéballer : PBKDF2 ou une remise au coffre journalisée par dossier.
4. **Ouvrir un dossier écrit en base** (consultation, journal, clé : § 0.3). Une sous-page qui charge un dossier sans l'ouvrir vraiment (par exemple une liste d'honoraires) ne doit pas appeler `chargerDossier` sans raison : chaque appel ajoute des lignes au journal des accès.
5. **Portes sans bouton** : `demanderExportCabinet` (`P:285`, alerte « Un gérant a demandé l'export de tous les dossiers » prévue en base), `orienterAppel` (`P:218`), `consulter` (`P:237`, doublon de l'appel direct `P:145`). Le type `EtapeExpertise` prévoit `abandon` (`P:424`) sans bouton (`ExpertiseTamila.tsx:31-36`).
6. **Saisie d'avis à la main envoyée comme « gabarit »** : `avisLu` passe `p_confiance: "gabarit"` (`P:235`) alors que l'exemple l'affiche « Saisi » (`D:350`) ; en réel, un avis saisi s'affichera « Lu (gabarit) » (`D:796`).
7. **Nom des pièces en clair** (`pieces.nom_fichier`, chemin du bucket) alors que tout le reste qui nomme est chiffré (§ 0.2).
8. **Motif de muraille jamais déchiffré** à l'écran (`D:849`).
9. **Compteur « Délais à confirmer »** : nombre de délais, la liste filtrée montre des dossiers (`E:208` contre `E:220`).
10. **Gestes sans fenêtre de confirmation** (un clic écrit) : G1, G5, G6, G12, G13, G16, G28-G30, G33-G42, G46, G47, G57, G58, G64, G65, G66. Les lectures IA (G37-G41) coûtent de l'argent (1 à 5 € par dossier, chiffrage § 0) sans confirmation.
11. **Migrations du dépôt jusqu'à b4_16 seulement** : l'écran appelle aussi `tamila_attentes` / `tamila_poser_attente` / `tamila_noter_attente` (b4_18), l'archive chiffrée (b4_17), absentes de `omega/modules/tamila/migrations/`. Chaque carte qui en dépend disparaît d'elle-même si la base ne les a pas (§ 5).
12. **Tailles** : `DossierTamila.tsx` 1 133 lignes, `EcranTamila.tsx` 937, `HonorairesTamila.tsx` 659 ; total du dossier `components/espace/tamila/` 7 642 lignes (dont `tamila.css` 363, `types.ts` 518).

---

**Totaux : 39 blocs (B1-B39, dont 14 fenêtres), 66 gestes qui écrivent ou envoient (G1-G66) + 17 gestes locaux (L1-L17), 15 entrées avec lien écrit en base (E1-E15, 20 occurrences SQL) + 15 repères sans lien (§ 1.2), 0 paramètre d'adresse lu, 8 fichiers d'écran qui mènent ici (§ 1.4).**
