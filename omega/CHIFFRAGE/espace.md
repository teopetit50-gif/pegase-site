# Chiffrage ESPACE CLIENT — ce qui manque pour qu'un vrai client l'utilise demain (A3, 11/10/2026, relevé sur main 2f17a30)

## Synthèse (6 lignes)

1. **Les écrans de travail sont construits et testés sur la recette** (/espace = nouveau design /espace2 depuis la bascule c0494b4) : file « À valider » (approuver, refuser, modifier, déléguer, décider en lot, séparation saisie/validation), FILED, À payer, Fournisseurs, Comptabilité/FEC, boîte de réception, Demandes reçues, Réglages (journal CSV, export complet, aperçu d'effacement), point du matin. Relus en base réelle de recette avec les comptes du banc ; recette aux 5 largeurs, axe WCAG 2.1 AA et non-régression vertes sur /espace et /espace2. **Rien n'est prouvé avec un vrai compte client en production (aucun A).** En état A : 0 ligne ; B : 12 ; C : 9 ; D : 4 ; T : 1.
2. **Le parcours d'entrée n'existe pas dans l'espace (D, ≈ 9 j)** : pas de « Se connecter » dans /espace (sans session, il montre l'exemple ; la connexion vit sur app.omegaai.fr et dans le tunnel /installation), pas d'écran de première connexion (organisation, sociétés, SIREN, modules), pas d'invitation de collaborateurs (la porte `rattacher_membre` existe, aucun écran), pas d'écran des rôles ni des périmètres par société.
3. **Deux « espaces clients » coexistent, à trancher par Teo avant toute vente (0 j de code)** : app.omegaai.fr (pegase-dashboard, autre dépôt, cité par lib/produits/factures.ts:329 et photographié en accueil, app/page.tsx:976-994) et omegaai.fr/espace (ce dépôt, où vivent les modules). Le site promet l'un, les ouvriers construisent l'autre.
4. **À finir (C, ≈ 6 j)** : export complet (la fonction appelle une porte absente + CORS), effacement réel (aujourd'hui un aperçu), règles de validation non éditables à l'écran, notifications (point du matin par courriel : envoi Brevo seul), mobile vérifié en largeur mais pas comme usage (pas de PWA, pas de lien profond depuis un courriel testé).
5. **Passage B → A (≈ 9 j)** : base de production avec les tables des modules et la bascule en ligne (quota Vercel), un vrai client pilote invité, connecté, qui valide une vraie demande et exporte ses données ; relecture accessibilité au lecteur d'écran par une personne.
6. **Total pour « un vrai client demain »** : ≈ **9 j (entrée : 1.2 à 1.6) + 5,5 j (à finir : 1.1, 1.8, 1.10, 1.11, 1.13) + 9 j (B → A) ≈ 23 jours**, plus les décisions de Teo (lequel des deux espaces, nom de domaine de la connexion) et le plan Vercel (T).

Légende : **A** prouvé avec un vrai compte · **B** construit et testé sur la recette · **C** partiel · **D** pas construit · **T** compte, achat ou décision de Teo. Jours : « → B » = de l'état actuel à B ; « → A » = de B à A. Les promesses déjà chiffrées dans `transversal.md` sont citées par leur numéro, pas recomptées.

Fichiers lus : `proxy.ts`, `components/compte/ConnexionInline.tsx`, `components/espace2/Coquille.tsx`, `components/espace2/Reglages.tsx`, `components/espace/**`, `app/installation/page.tsx`, `lib/produits/factures.ts`, `lib/produits/relances.ts`, `lib/content.ts`, `app/page.tsx`, `app/offres/page.tsx`, `app/vos-donnees/page.tsx`, `omega/SOCLE-EXTRAITS-COMMUN.sql` (comptes, perimetres, rattacher_membre, journal_opposable, receptions), `omega/NOTES-A3.md`, `omega/CHIFFRAGE/transversal.md`.

## 1. Le parcours d'un vrai client, de la connexion à la sortie

| # | Étape | État | Preuve | Ce qui manque | Jours → B / → A | Externe |
|---|---|---|---|---|---|---|
| 1.1 | **Lequel des deux espaces** est « l'espace client » | T | app.omegaai.fr (autre dépôt) cité par lib/produits/factures.ts:329 et photographié (app/page.tsx:976-994) ; omegaai.fr/espace porte les modules (ce dépôt) | Décision de Teo ; puis une seule entrée « Mon espace » qui mène au bon endroit, et l'autre redirigé | 0,5 / 0 | — |
| 1.2 | **Se connecter** depuis l'espace | C | Module `ConnexionInline` (mot de passe + code de preuve, mot de passe oublié) utilisé dans /installation ; /espace sans session montre l'exemple, aucun bouton de connexion (décision du 15/09 : « plus rien sur le site ne renvoie à une page de connexion ») ; /auth/confirm redirige vers /compte, qui renvoie à app.omegaai.fr | « Se connecter » dans la coquille de l'espace (ConnexionInline en dialogue), retour sur l'écran demandé, déconnexion, expiration de session dite en clair. Arbitrer avec la décision du 15/09 | 1,5 / 0,5 | — |
| 1.3 | **Première connexion / installation** de l'organisation | D | Les organisations du banc sont créées à la main (coordinateur) ; les portes d'installation existent module par module (`filed_installer`…) ; aucun écran ne les enchaîne | Écran « Votre organisation » : nom, sociétés et SIREN (vérifiés), modules souscrits, boîte de réception, premier exercice ; reprend les portes existantes | 3 / 0,5 | — |
| 1.4 | **Inviter un collaborateur** | D | Porte `rattacher_membre(p_client, p_email, p_role)` (auth) ; aucun écran ; l'invitation par courriel (lien d'activation) suppose une fonction côté service | Écran « Équipe » (liste des comptes, inviter, relancer, retirer) + fonction d'invitation (courriel Brevo, lien /auth/confirm type invite) | 2,5 / 0,5 | — |
| 1.5 | **Rôles** (gérant, admin, valideur, collaborateur, lecteur) | D | Rôles en base (`comptes_role_check`), politique UPDATE gérant/admin, garde « toujours un gérant » ; aucun écran | Changer le rôle dans « Équipe », avec ce que chaque rôle peut faire dit en clair | 1 / 0,25 | — |
| 1.6 | **Périmètre par société** (un valideur ne voit que sa société) | D | Table `perimetres`, RLS `perimetre_couvre` ; aucun écran | Dans « Équipe » : sociétés visibles par personne | 1 / 0,25 | — |
| 1.7 | **Valider** : approuver, refuser (motif), modifier, commentaire exigé, séparation saisie/validation, décider en lot, déléguer | B | /espace/validations ; relectures en base réelle (gérant, daf, daf2, référent) : `relecture-decision`, `-lot`, `-annulation`, `-temps-reel` ; non-régression verte sur /espace et /espace2 | Production + pilote | 0 / 1 | — |
| 1.8 | **Règles de validation** (seuils, nombre d'approbations, commentaire obligatoire) | C | Appliquées par la base (politiques) et lues à l'écran ; « Les délégations et les règles de validation se règlent depuis la file » (components/espace2/Reglages.tsx) : seules les délégations s'y règlent | Écran d'édition des règles (gérant), avec l'aperçu de ce qu'une règle change | 2 / 0,25 | — |
| 1.9 | **Réglages** : thème, données affichées, journal, export, effacement | B (journal) / C | /espace/reglages : journal CSV en base réelle (3 127 lignes, empreintes) ; export complet en échec (`public.exporter_client` absente, CORS : transversal A17) ; effacement = aperçu (transversal V13) | Corriger export-complet (A5), effacement réel (A5) ; l'écran est prêt et prend le lien | 0 (écran) / 0,5 | — |
| 1.10 | **Notifications** : point du matin par courriel, « une demande vous attend » | C | Point du matin assemblé et lisible dans l'espace (/espace/point) ; envoi par Brevo seul, sans lien profond testé vers la demande | Courriel « à valider » avec lien direct vers la demande ; réglage « me prévenir » par personne | 1,5 / 0,5 | Brevo (offre payante au-delà du quota gratuit) |
| 1.11 | **Mobile** | C | Recette aux 5 largeurs dont 390 px, sans débordement, sur /espace et /espace2 ; dialogues utilisables au doigt | Usage réel : ouvrir un lien de validation depuis un courriel sur téléphone, session gardée ; pas d'installation sur l'écran d'accueil (PWA) — à ne pas promettre | 1 / 0,5 | — |
| 1.12 | **Accessibilité** | B | axe-core WCAG 2.1 A/AA sans écart grave sur tous les écrans, focus dans les dialogues, zones défilantes au clavier (`accessibilite.mjs`, /espace et /espace2) | Une passe au lecteur d'écran (NVDA/VoiceOver) par une personne | 0 / 1 | — |
| 1.13 | **Temps réel** (« les changements arrivent sans recharger ») | C | Abonnements Realtime + relecture toutes les 30 s ; le canal WebSocket n'a jamais pu être vérifié depuis le conteneur de recette | Vérifier depuis un navigateur ordinaire ; publier les tables manquantes (`filed_fournisseurs_ibans`) | 0,5 / 0,25 | — |

## 2. Les promesses du site sur l'espace client

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / → A | Externe |
|---|---|---|---|---|---|---|---|
| 2.1 | « L'espace client Omega : qui doit de l'argent, où en est la relance, et l'encours échu au total. » (photo) | app/page.tsx:994 | B | transversal A5 (/espace/cashd) ; la photo vient d'app.omegaai.fr (1.1) | Voir 1.1 | 0 / 0 | — |
| 2.2 | « Votre espace tient en quatre écrans » | lib/produits/relances.ts:295 | B | /espace/cashd (C2) | Production | 0 / 0,5 | — |
| 2.3 | « Le message est déjà rédigé quand vous ouvrez votre espace, et il ne reste qu'à le relire. » | lib/produits/relances.ts:161 | B | file « À valider » (1.7) + rédaction CASHD (C2) | Production | 0 / 0 (compté 1.7) | — |
| 2.4 | « Chaque message passe par une file de validation » ; « File de validation partagée » ; « Tout ce qui doit partir passe par une file de validation » | app/page.tsx:585 ; lib/produits/factures.ts:173 ; lib/produits/relances.ts:178, 453 ; lib/integrations.ts:218 ; app/offres/page.tsx:742 | B | 1.7 | « Partagée » suppose plusieurs personnes : invitation (1.4) | 0 / 0 (compté 1.4, 1.7) | — |
| 2.5 | « Ce journal reste consultable et exportable à tout moment, y compris pour un contrôle. » | app/vos-donnees/page.tsx:156 | B | « Exporter mon journal (CSV) », base réelle de recette (1.9) ; transversal O8 | Production | 0 / 0 (compté transversal O8) | — |
| 2.6 | « Export à tout moment » ; « À la sortie : export, puis effacement » | transversal A17, V13, B36 | C | 1.9 | Compté dans transversal | 0 / 0 | — |
| 2.7 | « Un espace par entreprise » ; « strictement séparé » | transversal A18, I8, B31 | B | RLS par organisation | Compté dans transversal | 0 / 0 | — |
| 2.8 | « Où que vous travailliez » | transversal O3 | B | 1.11 | Compté dans transversal | 0 / 0 | — |
| 2.9 | « Chaque matin, le point du jour pose l'état de la veille […] Il se lit en deux minutes » | lib/content.ts:260, 334 | C | /espace/point lisible ; envoi : 1.10 | Compté 1.10 | 0 / 0 | — |
| 2.10 | « Réservez votre installation » (connexion exigée) | app/installation/page.tsx | C | Tunnel connecté (ConnexionInline) ; ce qui suit la réservation (1.3) n'existe pas | Compté 1.3 | 0 / 0 | — |
| 2.11 | « Aucun compte à créer » (accueil, intégrations, offres) | transversal A15, I2, O10 | C | L'espace exige un compte (1.2–1.4) | Reformuler (compté dans transversal) | 0 / 0 | — |

## 3. Commun (production, pilote)

| # | Ce qui | État | Ce qui manque | Jours → B / → A | Externe |
|---|---|---|---|---|---|
| 3.1 | Base de production avec les tables des modules et du socle | B | Pose P1–P6 (MISE-EN-PRODUCTION) — comptée par A5 / coordinateur | 0 / 0 (compté production.md) | Supabase Pro |
| 3.2 | La bascule /espace → nouveau design en ligne | B | Déploiement (quota Vercel) | 0 / 0,25 | Vercel Pro (T) |
| 3.3 | Un client pilote : invité, connecté, qui valide une vraie demande, exporte son journal et ses données | — | Après 1.2–1.6 | 0 / 2 | — |

**Totaux** : → B = 14,5 j (1.1 : 0,5 ; 1.2 : 1,5 ; 1.3 : 3 ; 1.4 : 2,5 ; 1.5 : 1 ; 1.6 : 1 ; 1.8 : 2 ; 1.10 : 1,5 ; 1.11 : 1 ; 1.13 : 0,5) ; → A = 8,75 j (section 1 : 6 ; 2.2 : 0,5 ; 3.2 : 0,25 ; pilote 3.3 : 2) ; arrondi **≈ 23 jours**.
