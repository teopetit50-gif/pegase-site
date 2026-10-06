# Passer Omega en production : ce qu'il faut, combien ça coûte, qui le fait

A5, 6 octobre 2026, pour Teo. Résumé de `MISE-EN-PRODUCTION.md` § 6, en clair. Prix relevés ce jour sur les sites
officiels (liens en bas) ; à revérifier au moment de payer.

## En une phrase

Avant le premier client, la production coûte **environ 45 $ par mois** : Supabase Pro (25 $), s'il n'est pas déjà
pris, et Vercel Pro (20 $). La sauvegarde peut rester **gratuite** jusqu'au premier client. Tout le reste ne coûte
qu'à l'usage, donc 0 € tant qu'il n'y a pas de client.

## 1. Ce que Teo doit faire

| # | Quoi | Coût | Temps pour Teo | Si on ne le fait pas |
|---|---|---|---|---|
| 1 | **Vérifier l'offre Supabase de la production** et passer en **Pro** si elle est en Free | 25 $/mois (environ 23 €). L'offre Pro inclut 7 jours de sauvegardes Supabase | 5 min (tableau de bord Supabase → Billing) | En Free : pas de sauvegarde Supabase, base limitée à 500 Mo, et le projet est **mis en pause après une semaine sans activité**. Impossible pour un client |
| 2 | **Sauvegarde gratuite** : poser deux secrets GitHub, `SUPABASE_DB_URL` (l'adresse « Session pooler » de la production) et `SAUVEGARDE_PHRASE` (une longue phrase, à garder aussi dans le gestionnaire de mots de passe), puis lancer une fois « Sauvegarde de la base » dans l'onglet Actions | **0 €**. Le quota gratuit de GitHub suffit : 2 000 minutes et 500 Mo de fichiers par mois, contre quelques minutes et quelques dizaines de Mo par nuit | 10 min | Le plan de mise en production s'arrête : une première sauvegarde réussie est exigée **avant** la première étape. Sinon, l'alerte critique « sauvegarde manquante » reste allumée |
| 3 | **Vercel Pro** pour omegaai.fr | 20 $/mois | 5 min | L'offre gratuite (Hobby) est réservée à l'usage **non commercial** : interdite dès qu'on vend |
| 4 | **Clé de service dans le coffre (Vault) de la production** (`cle_service`) | 0 € | 5 min, ou une session autorisée | Les tâches planifiées ne peuvent pas appeler les fonctions : pas de lecture des pièces, pas d'envois automatiques |
| 5 | **Lecteur IA (AWS Bedrock)** : identifiants IAM, région eu-central-1 (Francfort), modèle | À l'usage seulement, par pièce lue ; 0 € sans client. Un plafond par client et par jour existe déjà | 30 min | Les pièces déposées ne sont pas lues |
| 6 | **Brevo (courriels) de production** : domaine et expéditeur vérifiés (DNS), webhook « Transactionnel », suivi d'ouverture coupé | Offre gratuite de Brevo pour démarrer (plafond quotidien d'envois, à vérifier sur leur grille) ; payant seulement au-delà | 30 min (DNS) | Aucun courriel ne part de la production |
| 7 | **WhatsApp (Meta)** : secrets du compte professionnel | Facturé par Meta à l'envoi ; 0 € sans envoi | 30 min | Pas de WhatsApp. Facultatif au lancement |
| 8 | **Clé SIRENE (INSEE)** | Gratuite | 10 min | Rien ne bloque : la recherche d'entreprise marche déjà sans clé. La clé apporte la source officielle et un meilleur quota |
| 9 | **Deux décisions métier** : l'accord permanent des J-2 Daliro, et l'avis du juriste sur la seconde demande de pièces Lorani dans le mois | 0 € | — | Ces deux automatismes restent soumis à validation à la main |

## 2. Ce que l'équipe fait (aucun coût)

| Quoi | Qui | Ce qui bloque sinon |
|---|---|---|
| Fusionner les branches de travail (`worker-a4`, `worker-a5`) dans `main` et poser l'étiquette du gel | coordinateur | On ne sait pas quelle version on met en production |
| Exporter la séquence de la recette et assembler les migrations | A5 + coordinateur | Rien à poser |
| **Répétition gratuite** dans GitHub (voie C). Pour qu'elle ressemble à la production, Teo lance une fois `omega/prod/base/relever-base.sh` (lecture seule, 2 min ; même adresse que le n° 2) | Teo (2 min) puis l'équipe | On poserait en production sans avoir répété : risque d'échec en cours de route |
| Poser en production par paliers (P1 à P6), avec les contrôles après chacun | coordinateur | — |
| Déployer les fonctions (lecteur, expéditeur, réception, identité…) sur leurs versions figées | coordinateur | — |

## 3. Ce qui attend le premier client (et coûtera alors)

| Quoi | Coût prévu | Pourquoi attendre |
|---|---|---|
| **Sauvegarde en France** (Scaleway, Paris) à la place de GitHub | Environ 0,05 € par mois pour 3 Go gardés ; 0,50 € par mois si la base grossit à 1 Go par sauvegarde. Plus de stockage gratuit chez Scaleway, seulement un essai de 90 jours | Avant le premier client, la base ne contient aucune donnée de client : une copie chez GitHub ne trahit aucune promesse. Dès le premier client, le site promet « aucune réplication hors UE » : il faut basculer **ce jour-là** |
| **Hébergement de données de santé (HDS)**, Scaleway | À chiffrer avec Scaleway au premier client santé | Jusque-là, aucun envoi portant des données de santé ne part, c'est verrouillé et testé. Tiroma fonctionne, sans données de santé |
| Export Logos_w réel (Tiroma) | 0 € | Tiroma fonctionne sans relevé automatique tant qu'aucun vrai export n'est passé |

## 4. À retenir

- **Le minimum avant le premier client** : les n° 1 (si besoin), 2, 3, 4, 5 et 6 du tableau 1. C'est environ 45 $ par mois, plus une heure et demie de Teo.
- **Le jour du premier client** : basculer la sauvegarde vers Paris, quelques centimes par mois.
- **Le jour du premier client santé** : souscrire l'HDS.

## Sources (6/10/2026)

- Supabase : https://supabase.com/pricing (Free : pas de sauvegarde, pause après une semaine ; Pro : 25 $/mois, 7 jours de sauvegardes)
- GitHub Actions : https://docs.github.com/en/billing/concepts/product-billing/github-actions (offre gratuite : 2 000 minutes, 500 Mo ; sans moyen de paiement, l'usage s'arrête au plafond au lieu d'être facturé)
- Vercel : https://vercel.com/pricing (Hobby : « personal, non-commercial use » ; Pro : 20 $/mois)
- Scaleway : https://www.scaleway.com/en/pricing/storage/ et https://www.scaleway.com/en/docs/faq/objectstorage/
