# La messagerie instantanée du site (REPUT) : l'installer chez un client

Pour l'équipe d'installation et pour Teo. Rédigé par A2 le 6 octobre 2026.

## Ce que c'est

Une bulle en bas à droite du site du client. Le visiteur écrit son message et laisse un e-mail
ou un téléphone. Le message entre dans **le même circuit que les autres canaux** : une
réception REPUT, qui est qualifiée, puis reçoit une réponse **par e-mail ou par SMS** aux
coordonnées laissées.

La bulle ne pose aucun cookie et aucun traceur. Elle est isolée du site : elle n'en prend
aucun style et ne lui en impose aucun. Elle pèse quelques kilo-octets, sans dépendance.

## L'installer

1. Dans Omega, un gérant ou un admin règle la messagerie du site (porte `widget_regler`) :
   - un nom, affiché dans l'en-tête de la bulle ;
   - la liste exacte des **adresses du site**, par exemple `https://www.plombier-exemple.fr`
     et `https://plombier-exemple.fr` ;
   - une couleur et une phrase d'accueil, au choix.

   Omega rend une **clé publique** `w_…`.
2. Sur le site du client, juste avant `</body>`, une seule ligne :

   ```html
   <script src="https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/widget/w_…/widget.js" async></script>
   ```

   - **WordPress** : extension « Insert Headers and Footers » (ou le thème), zone « pied de
     page ».
   - **Wix, Squarespace, Webflow** : « code personnalisé », pied de page, toutes les pages.
3. Ouvrir le site : la bulle apparaît. Envoyer un message d'essai : il arrive dans les
   réceptions REPUT du client (canal formulaire, « Messagerie du site »).

## Si le site a une politique de sécurité du contenu (CSP)

Le site doit autoriser l'adresse de la fonction :
- dans `script-src` : `https://ygwbgpowzlbdaajlsqkn.supabase.co` ;
- dans `connect-src` : la même adresse.

## Ce qui protège

- **La clé n'est pas un secret** : elle s'écrit dans la page. Ce qui compte, c'est la **liste
  des adresses du site**. Un navigateur sur un autre site est refusé.
- **Plafonds** : 10 messages par 10 minutes depuis une même adresse, 300 par jour pour le
  site.
- **Robots** : un champ piège invisible et un temps de saisie minimal. Ils sont écartés en
  silence.
- **Accord du visiteur** : il doit cocher qu'il accepte que ses coordonnées servent à lui
  répondre.
- **Adresse IP** : elle n'est jamais gardée en clair. Seule une empreinte du jour sert aux
  plafonds, effacée après deux jours.

## Limites de cette première version

- **La réponse arrive par e-mail ou SMS**, pas dans la bulle. Répondre dans la bulle demande
  deux choses : un canal d'envoi « site » dans le socle (`envois_statut_check` et
  `envois_canal_check`), et une porte de lecture des réponses pour la conversation. C'est un
  lot à part, à décider.
- **Pas de pièce jointe** depuis la bulle.
