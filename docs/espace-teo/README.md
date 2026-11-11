# Mon espace — l'espace personnel de Teo (11/11/2026)

Teo : « tu dois me faire mon espace à moi : copier le dashboard d'espace 2 en 1:1, la page du BTP,
sauf que tout le contenu doit être pour moi — mes clients, mon agenda, mes conversations WhatsApp,
mon mail connecté ».

Adresse : **omegaai.fr/espace2/teo** — réservée au compte gérant (`omega_est_admin`, la même porte
que le pilotage `/omega`). Sans session, la page renvoie vers le pilotage pour se connecter ; un
autre compte tombe sur « page introuvable ». Le menu de l'organisation (en haut) bascule entre
« Données d'exemple » (fictives, `components/espace2/teo/exemples.ts`) et « Base réelle ».

## Les pages, référence pour référence (copies 1:1 de DALIRO)

| Page | Adresse | Copie de | Référence (REGLES.md) | Contenu réel |
|---|---|---|---|---|
| Vue d'ensemble | `/espace2/teo` | `daliro/VueEnsemble` | Linear, accueil d'équipe | à relancer, agenda du jour, clients récents, branchements |
| Clients | `/espace2/teo/clients` | `daliro/Annuaire` | Attio, People + fiche | `omega_contacts`, `omega_echanges` (les mêmes tables que `/omega/contacts`) |
| Agenda | `/espace2/teo/agenda` | `daliro/Equipes` | Cal.com, Bookings | Google Agenda (`GOOGLE_CALENDAR_ID`, « primary » par défaut) |
| WhatsApp | `/espace2/teo/whatsapp` | `daliro/Appels` | Linear, Inbox | `omega_whatsapp_messages`, remplie par le webhook Meta |
| Mails | `/espace2/teo/mails` | `daliro/Mails` | Plain, fils + carte centrale | Gmail (boîte de réception) |

Code : `app/espace2/teo/` (pages, layout, actions serveur), `components/espace2/teo/` (les pages),
`lib/teo/` (Google, Gmail, agenda, clients, WhatsApp), `app/api/teo/whatsapp/route.ts` (webhook).
La coquille : `MODULE_TEO` dans `components/espace2/modules.ts`, le rail réduit dans `Coquille.tsx`
(comme l'espace « un seul logiciel »), `teo` dans les pages communes de `portail.ts`.

## Brancher Gmail et Google Agenda (une fois)

Le même jeton que le lien Meet des audits (`lib/visio.ts`), avec la boîte en plus :

1. Dans la console Google Cloud, avec le compte Google d'Omega : activer l'API **Gmail** (l'API
   Calendar l'est déjà), l'écran de consentement publié « En production ».
2. Sur le Mac : `node outils/jeton-google.mjs <CLIENT_ID> <CLIENT_SECRET>` — il demande désormais
   `calendar.events` **et** `gmail.modify` (lire, répondre, marquer lu ; jamais supprimer).
3. `bash outils/poser-variables-google.sh` pose `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `GOOGLE_OAUTH_REFRESH_TOKEN` (et `GOOGLE_CALENDAR_ID`) sur le projet Vercel `pegase-site2`.
4. Pousser un changement (ou « Redeploy ») : les variables ne s'appliquent qu'au déploiement suivant.

Un jeton obtenu avant le 11/11 ne porte que l'agenda : la page Mails le dit (« portée ») et demande
de relancer le script. Tant que rien n'est posé, les pages disent « pas branché » en base réelle.

## Brancher WhatsApp (une fois)

WhatsApp ne rend pas l'historique : les messages arrivent par le webhook de l'API WhatsApp Business
Cloud (Meta for Developers, une application « Business », le produit WhatsApp).

1. Supabase, éditeur SQL du projet `noepmkkplxshjbmqqxft` : coller `docs/espace-teo/schema-whatsapp.sql`
   après avoir remplacé `REMPLACER_PAR_UN_SECRET` par une longue chaîne au hasard.
2. Vercel, projet `pegase-site2` (production) :
   - `WHATSAPP_WEBHOOK_SECRET` — la même chaîne qu'au point 1 ;
   - `WHATSAPP_VERIFY_TOKEN` — une chaîne au hasard, à redonner à Meta à l'enregistrement du webhook ;
   - `WHATSAPP_APP_SECRET` — le secret de l'application Meta (signature des appels ; facultatif mais conseillé) ;
   - `WHATSAPP_TOKEN` et `WHATSAPP_PHONE_ID` — pour répondre depuis la page (jeton système permanent,
     identifiant du numéro) ; sans eux, la page lit et « Ouvrir dans WhatsApp » envoie depuis le téléphone.
3. Meta, WhatsApp › Configuration › Webhooks : adresse `https://omegaai.fr/api/teo/whatsapp`, jeton de
   vérification = `WHATSAPP_VERIFY_TOKEN`, s'abonner au champ `messages`.
4. Un message reçu apparaît dans `/espace2/teo/whatsapp` ; un accusé (remis, lu) met à jour nos messages.

Ce qui n'est pas fait ici : télécharger les photos, vocaux et documents reçus (la page montre
« Photo », « Vocal », « Document » et la légende) ; les modèles de message (hors fenêtre de 24 h,
WhatsApp exige un modèle approuvé — la page le dira en erreur d'envoi).
