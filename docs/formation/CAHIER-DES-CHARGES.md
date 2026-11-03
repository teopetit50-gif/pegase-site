# Formation Omega : cahier des charges

Rédigé le 03/11/2026 à partir des réponses de Teo (session « refonte de la
Formation »). Teo : « je voudrais vraiment un truc complet, en regroupant plein
de vidéos, plein de tutoriels ». Le travail suit deux temps : d'abord le
fond (les contenus), ensuite le visuel.

## 1. Les décisions de Teo

| Sujet | Décision |
|---|---|
| Publics | Les **clients** et les **prospects**. |
| Parcours | Un **socle commun** suivi par tous, puis le **module du métier** du client. |
| Lieux | La formation complète dans l'**espace client** (`/espace2/formation`) ; sur le site public, une **vitrine** pour les prospects (`/formation`, « Voir Omega en vidéo »). |
| Format | Des **vidéos courtes, une par geste**, accompagnées du texte de chaque page. |
| Tournage | C'est **Teo** qui tourne. Omega écrit le script de chaque vidéo. |
| Bande-son | La **voix de Teo**, avec des **sous-titres** français ajoutés au dépôt. |
| Durée | Libre. Repère indicatif : un geste, du premier clic au résultat. |
| En attendant le tournage | Chaque emplacement garde la **vidéo provisoire** (« Découvrir Omega », 38 s). |
| Dépôt | Teo colle le **lien du fichier** (Drive, Dropbox, WeTransfer…) sur la ligne de la vidéo dans `/omega` → Formation. Une session le récupère et le met en ligne. |
| Hébergement | Les **fichiers du site** (`public/formation/`), compressés. On passera à Vercel Blob si l'ensemble dépasse 150 Mo. |
| Lot pilote | **Bien démarrer** (guide, principes, première semaine) **+ CASHD**. |

Points qui n'ont pas été posés à Teo et qui suivent l'existant : le texte est
en français, au vouvoiement, sans superlatif, et on dit « système », jamais
« moteur ». La mise en page de référence reste celle de la documentation
Linear (Start Guide), déjà retenue le 29/10. Notion, Vercel, Pylon et Twenty
restent exclus comme références de dessin.

## 2. Parcours et sommaire

### Socle commun (tous les clients)
1. **Guide de démarrage** : la vue d'ensemble, l'ouverture de l'espace, les modules, ce qu'Omega ne fait jamais sans vous.
2. **Comment marche Omega** : « À valider », les règles de décision, le mode essai, ce qui arrête un envoi, les rôles, les données.
3. **Votre première semaine** : le premier accès, le point du matin, la routine de validation, l'activité, le rodage.
4. **FILED**, **CASHD**, **REPUT**, **OFFLOAD** : une page par système, avec une vidéo par geste.
5. **Votre espace au quotidien** (`/espace2/formation/espace`) : vue d'ensemble, délégation, équipe, activité et automatisations, tâches, contacts, notes et appels, utilisation et carte, réglages.
6. **Le Réseau Omega** (`/espace2/formation/reseau`) : présenté comme « ouvre bientôt », avec un aperçu sur les données d'exemple ; ses gestes ne sont pas enseignés tant qu'ils restent locaux.

### Module métier (selon le client)
Daliro (BTP), Lorani (architectes), Tamila (avocats), Tavaro (location),
Tiroma (dentaire), Varelo (groupes) : une page chacun, avec une vidéo par geste.

### Vitrine publique (prospects)
`/formation` devient « Voir Omega en vidéo ». La page présente une sélection
de 6 à 10 gestes (un par système et par métier) et propose de réserver une
démonstration. On n'y montre **que des vidéos déjà tournées par Teo**, jamais
la vidéo provisoire. Le reste de la formation est réservé aux clients.

## 3. Les vidéos : comment elles sont faites

### Le catalogue
`components/espace2/formation/videos.ts` recense toutes les vidéos. Chacune a
un identifiant stable (`cashd-noter-reglement`…), un titre, sa page, l'écran
de départ et, une fois écrit, son **script** : pour chaque étape, ce qu'on
fait à l'écran et ce qu'on dit. Les pages (`pages.ts`) ne citent que
l'identifiant.

`docs/formation/SCRIPTS.md` sert de **prompteur** à Teo. Ce fichier est
produit à partir du catalogue par `node outils/formation-scripts.mjs` : il ne
faut jamais le modifier à la main.

### Le tournage (Teo)
- Filmer **`omegaai.fr/espace2` sans être connecté**, c'est-à-dire sur
  l'entreprise d'exemple, pour ne jamais montrer de vraies données.
- Écran en 1440 × 900 ou plus, en thème sombre (celui par défaut), avec le
  zoom du navigateur à 100 %.
- Un outil au choix : Loom, QuickTime, OBS… Le fichier est un MP4 ou un MOV.

### Le dépôt (une session)
`outils/formation-deposer.sh <identifiant> <fichier ou lien>` fait le travail :
1. Il récupère le fichier.
2. Il le compresse en H.264, 1080p au plus, 30 i/s, « faststart », avec un son AAC à 96 kb/s. Cible : 1,5 à 3 Mo par minute.
3. Il tire l'image d'affiche en 1280 × 720.
4. Il produit les **sous-titres** (`.vtt`) par transcription automatique (faster-whisper). Une personne les relit en les comparant au script.
5. Il range les fichiers sous `public/formation/<identifiant>.{mp4,jpg,vtt}`.

Il reste à passer `tournee: { duree }` sur la fiche de la vidéo dans
`videos.ts`, puis à suivre la mise en ligne habituelle (`CLAUDE.md`).

### Le poids
Une cinquantaine de vidéos d'environ une minute pèsent entre 75 et 150 Mo.
Au-delà de 150 Mo dans `public/formation/`, on passe à Vercel Blob : seule
l'adresse calculée dans `videos.ts` change.

## 4. Ordre de livraison

| Lot | Contenu | État |
|---|---|---|
| 1 | Cahier des charges ; catalogue et scripts de **Bien démarrer + CASHD** ; CASHD détaillé geste par geste ; outil de dépôt ; sous-titres dans le lecteur | en ligne le 03/11 |
| 2 | Scripts et pages détaillées de **FILED, REPUT, OFFLOAD** | en ligne le 03/11 |
| 3 | Scripts et pages des **six métiers** | en ligne le 03/11 |
| 4 | Le reste du socle et le **Réseau Omega** | en ligne le 03/11 |
| 5 | La **vitrine publique**, dès que 6 vidéos sont tournées | attend le tournage |
| 6 | La **refonte du visuel** : 2 ou 3 directions proposées à Teo, qui choisit | après le lot 2 |

Pendant tout ce temps, Teo tourne au fil des scripts, dans l'ordre du sommaire.

## 5. Ce qui attend Teo
- Tourner les vidéos du lot 1 à partir de `docs/formation/SCRIPTS.md`.
- Les questions ouvertes sont dans `docs/formation/QUESTIONS-POUR-TEO.md`
  (l'import du catalogue dans `/omega` → Formation, le choix du visuel).
