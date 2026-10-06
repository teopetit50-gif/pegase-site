# Le dépôt par lot de FILED : un dossier réseau pour vos pièces

Pour le cabinet et pour Teo. Rédigé par A2 le 6 octobre 2026.

## En deux phrases

Omega donne à votre cabinet une **adresse de dépôt**, avec un identifiant et un mot de passe.
Vous la montez une fois comme un dossier réseau. Ensuite, chaque facture ou relevé que vous y
glissez, un par un ou par dossiers entiers, devient une pièce FILED : elle est numérotée,
reconnue si c'est un doublon, puis lue.

Ce que le dépôt accepte : PDF, PNG, JPEG, TIFF, WebP, HEIC, XML (Factur-X, UBL, CII), 25 Mo au
plus par fichier. Les autres fichiers sont refusés avec un message.

Il ne rend jamais un fichier, et rien ne s'y efface : ce qui est déposé est reçu, comme un
courrier. Vous retrouvez vos pièces dans FILED. Le dossier montre ce qui a été déposé depuis
30 jours.

## Ce qu'il vous faut

Dans Omega, un gérant ou un admin ouvre un dépôt (écran « Dépôt par lot »). Omega affiche
alors **une seule fois** :

- l'adresse : `https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/depot/` pour la recette ;
- l'identifiant : `depot-…` ;
- le mot de passe : 32 caractères. Notez-le tout de suite, il ne sera plus jamais affiché.
  S'il est perdu, on en demande un nouveau, et l'ancien cesse de marcher.

## Windows : un lecteur réseau dans l'Explorateur

1. Explorateur de fichiers → **Ce PC** → **Connecter un lecteur réseau** (en haut, sous les
   trois points selon la version).
2. Dossier : collez l'adresse de dépôt. Cochez **Se connecter à l'aide d'informations
   d'identification différentes**, puis **Terminer**.
3. Identifiant et mot de passe du dépôt. Cochez « Mémoriser ».
4. Le lecteur « depot » apparaît. Glissez-y vos fichiers ou vos dossiers.

Si Windows refuse la connexion, le service « WebClient » est peut-être arrêté. Le plus simple
est alors de passer par **WinSCP** (ci-dessous), qui fait la même chose et sait aussi
automatiser.

## Mac : le Finder

Finder → menu **Aller** → **Se connecter au serveur…** (⌘K) → collez l'adresse → **Se
connecter** → identifiant et mot de passe. Le dépôt s'ouvre comme un dossier.

## Dépôts automatiques (export du logiciel comptable, scanner)

- **WinSCP** (Windows, gratuit) : nouveau site, protocole **WebDAV**, chiffrement **TLS/SSL
  implicite**. Hôte : `ygwbgpowzlbdaajlsqkn.supabase.co`, port 443, chemin
  `/functions/v1/depot/`, puis l'identifiant et le mot de passe. Pour un envoi planifié :
  `winscp.com /command "open davs://depot-…:<mot de passe>@ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/depot/" "put C:\Exports\*.pdf" "exit"`
  dans le Planificateur de tâches.
- **rclone** (tous systèmes) : `rclone config` → type `webdav`, vendor `other`, l'adresse,
  l'identifiant, le mot de passe. Ensuite `rclone copy C:\Exports omega-depot:` (copie,
  jamais `sync` : le dépôt n'efface rien).
- **Cyberduck** (Mac, Windows) : « Ouvrir une connexion » → WebDAV (HTTPS).

## Bon à savoir

- Un même fichier déposé deux fois est reconnu (empreinte) : il est classé « doublon » et reste
  consultable, rien n'est compté deux fois.
- Les fichiers système (`.DS_Store`, `._…`, `Thumbs.db`, `desktop.ini`, `~$…`) sont acceptés
  puis ignorés.
- Dix mots de passe faux en un quart d'heure ferment l'identifiant pendant 15 minutes.
- Un dépôt se ferme dans Omega ; on peut en ouvrir plusieurs (un par poste ou par scanner, par
  exemple), vingt au plus.
