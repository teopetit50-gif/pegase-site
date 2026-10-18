# Chiffrage — du « testé sur la recette » au « premier client réel servi » (socle)

A5, 6 octobre 2026, 19 h 45 Z. Complète `omega/PRODUCTION-POUR-TEO.md`. Prix relevés ce jour sur les sites officiels
(sources en bas) ; les jours sont des jours de travail de l'équipe (sessions), hors temps de Teo, qui est donné à part.

## Synthèse

1. **Travail de l'équipe** : environ **9 jours** en tout, dont 4 pour la pose en production elle-même (gel, répétition, paliers, fonctions).
2. **Temps de Teo** : environ **1 jour**, surtout des comptes et des réglages : Supabase, Vercel, AWS, Brevo/DNS, GitHub, contrats.
3. **Coût fixe avant le premier client** : environ **45 $ par mois** (Supabase Pro 25 $, Vercel Pro 20 $). Tout le reste se paie à l'usage, donc 0 sans client.
4. **Sauvegarde** : **0 €** jusqu'au premier client (copie chiffrée chez GitHub, quota gratuit). Puis Paris (Scaleway) le jour du premier client, pour quelques centimes par mois.
5. **Ce qui bloque vraiment** : l'offre Supabase de la production (pas vérifiée, voir plus bas), les deux secrets de sauvegarde, la clé de service dans le Vault, Bedrock et Brevo de production, et les contrats de sous-traitance (RGPD).
6. **Offre Supabase de la production** : non vérifiée. Ma consigne de départ m'interdit tout appel à Supabase et toute lecture de la production. Teo la lit en 1 minute (tableau de bord → Billing) ; si elle est en Free, la passer en Pro avant tout.

## Détail par domaine

Légende : **J** = jours de travail de l'équipe ; **€/mois** = coût récurrent ; **Qui** = Teo ou nous.

| Domaine | Ce qu'il faut | J | €/mois | Qui | Ce qui bloque sinon |
|---|---|---|---|---|---|
| **Supabase** | Offre **Pro** pour la production : 7 jours de sauvegardes Supabase, jamais de mise en pause, 8 Go de disque | 0 | 25 $ | Teo (5 min) | En Free : aucune sauvegarde Supabase, base limitée à 500 Mo, **pause après une semaine sans activité**. Inacceptable pour un client |
| **Production : la pose** | Fusion des branches dans `main` et tag du gel (½ j). Export de la séquence de la recette et assemblage (½ j). Répétition gratuite en CI, avec relevé du schéma de la prod par Teo (1 j). Pose par paliers P1–P6 avec contrôles (1 j). Fonctions Edge et crons sur les versions figées (½ j). Empreinte finale comparée à la recette (½ j) | 4 | 0 | nous ; Teo 2 min pour le relevé | Rien ne tourne en production |
| **Sauvegarde** | Avant le premier client : la tâche GitHub existante (dump chiffré, restauration d'essai chaque nuit, preuve en base), secrets `SUPABASE_DB_URL` et `SAUVEGARDE_PHRASE`, un premier run réussi. Le jour du premier client : bascule vers Scaleway Paris | ½ (bascule) | 0 €, puis environ 0,05 à 0,50 € | Teo (10 min) ; la bascule par une session autorisée, car la mienne est bloquée pour ce transfert | Le plan exige une sauvegarde réussie **avant** la première étape. Sans elle, l'alerte critique « sauvegarde manquante » reste allumée |
| **Bedrock UE** (lecteur IA) | Compte AWS, utilisateur IAM limité à Bedrock, région eu-central-1 (Francfort), accès au modèle demandé, secrets de la fonction `lecteur`. Plafond par client et par jour déjà prévu (`PLAFOND_IA_JOUR_CLIENT_EUR`) | ½ | à l'usage (par pièce lue), 0 sans client | Teo (30 min) + nous (essai de bout en bout) | Les pièces déposées ne sont pas lues : FILED, Tamila et Lorani perdent leur lecture automatique |
| **Brevo de production** (courriels) | Domaine d'envoi vérifié (DNS : SPF, DKIM, DMARC), expéditeur, webhook « Transactionnel » vers `webhooks-brevo`, suivi d'ouverture coupé. Brevo a une offre gratuite pour démarrer ; son plafond est à vérifier sur leur grille, je n'ai pas pu la lire | ½ | 0 au départ | Teo (DNS, 30 min) + nous (essai) | Aucun courriel ne part de la production (relances, notifications, réponses) |
| **Vercel** | Offre **Pro** pour omegaai.fr | 0 | 20 $ par membre | Teo (5 min) | L'offre Hobby est réservée à l'usage non commercial |
| **Sécurité** | Clé de service dans le Vault de production (`cle_service`). Rotation des clés partagées avec la recette. Double authentification sur tous les comptes d'administration (Supabase, Vercel, AWS, GitHub, Brevo). Lecture des conseils de sécurité Supabase après la pose. Garde-fous (`garde_fous.sql`) verts à chaque palier | 1 | 0 | Teo (MFA, Vault) + nous (garde-fous, revue) | Sans clé de service, les tâches planifiées n'appellent pas les fonctions. Sans MFA, un mot de passe volé ouvre tout |
| **RGPD et contrats** | Contrats de sous-traitance (DPA) acceptés chez Supabase, AWS, Vercel, Brevo et Meta, en général en ligne. Registre des traitements. Contrat client avec la clause de l'article 28 (Omega sous-traitant du client). Politique de confidentialité alignée sur la réalité : UE, sauvegarde, durée de conservation, effacement prouvé. Données de santé : rien tant que l'HDS n'est pas souscrit, les envois sont verrouillés | 1½ | 0 | Teo (signature) + nous (rédaction et relecture des pages) | Pas de premier client sans contrat ; risque CNIL si la page de confidentialité promet ce qui n'est pas fait |
| **Supervision** | Les alertes existent en base (`alertes`, `verifier_sauvegardes`, battements des ouvriers, crons en échec). Il manque leur **destination** : un courriel d'alerte vers Teo (via Brevo), plus un contrôle de disponibilité externe gratuit sur omegaai.fr et les fonctions | 1 | 0 | nous ; Teo choisit l'adresse | Une panne de nuit (lecteur arrêté, sauvegarde ratée) reste invisible jusqu'à ce qu'un client s'en plaigne |
| **Support** | Une adresse de support. Une procédure d'incident d'une page : qui regarde quoi, comment restaurer (la procédure de sauvegarde existe déjà), comment couper les envois (`envois_arret_general`). Délais de réponse annoncés au contrat | ½ | 0 | Teo (adresse, engagement) + nous (procédure) | Le premier incident se gère dans l'urgence, sans procédure ni promesse claire au client |

**Total équipe : environ 9 jours. Total Teo : environ 1 jour. Coût fixe : environ 45 $ par mois avant le premier client.**

## Ce qui attend le premier client, ou le premier client santé

| Quoi | Quand | Coût |
|---|---|---|
| Sauvegarde à Paris (Scaleway) | le jour du premier client | environ 0,05 à 0,50 € par mois |
| HDS (Scaleway) et `fournisseurs_envoi` avec `agree_sante` sur preuve | au premier client santé | à chiffrer avec Scaleway |
| Clé SIRENE | quand on veut, gratuite | 0 |
| Export Logos_w réel (Tiroma) | quand un vrai export est disponible | 0 |

## Sources (6/10/2026)

- Supabase : https://supabase.com/pricing
- Vercel : https://vercel.com/pricing
- GitHub Actions (quota gratuit) : https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Scaleway Object Storage : https://www.scaleway.com/en/pricing/storage/ et https://www.scaleway.com/en/docs/faq/objectstorage/
