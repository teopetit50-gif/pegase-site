# Chiffrage des canaux promis sur le site

A2, 6 octobre 2026, pour Teo, à la demande du coordinateur. Les états reposent sur le dépôt
(branche main et worker-a2) et sur les recettes rapportées par le coordinateur jusqu'à 18 h 25 Z.
Les jours sont des jours de travail d'un ouvrier. Les coûts externes sont des ordres de grandeur :
quand un coût n'est pas vérifié, la case le dit.

**États** :
- **A** prouvé en vrai (un vrai message ou fichier est passé de bout en bout) ;
- **B** construit et testé sur la recette ;
- **C** partiel ;
- **D** pas construit ;
- **T** attend un compte ou un achat de Teo.

## Synthèse

1. Ce qui marche en vrai aujourd'hui :
   - le courriel sortant (Brevo) ;
   - le dépôt par lot de pièces (WebDAV) ;
   - l'échange avec une plateforme de facturation électronique, mais seulement contre notre bac à
     sable.
2. Ce qui est construit et testé sur la recette, à éprouver avec un vrai message (**B**) : la
   messagerie du site, le formulaire, le courriel entrant.

   Ce qui est construit et n'attend qu'un compte de Teo (**T**) :
   - Gmail, Outlook / Microsoft 365, WhatsApp, SMS ;
   - les logiciels comptables (Pennylane, QuickBooks, Cegid Loop).

   Il faut environ 0,5 à 1 jour chacun pour passer en A une fois le compte créé.
3. Ce qui n'est pas construit (**D**) et coûte le plus :
   - l'appel manqué transcrit et le téléphone d'astreinte : 5 à 8 jours, plus un opérateur
     téléphonique ;
   - les réseaux sociaux : 6 à 10 jours, plus les validations de Meta et Google ;
   - la synchronisation des agendas externes : 4 à 6 jours.
4. La lettre recommandée AR24 est promise par CASHD, mais aucun ouvrier n'existe : 2 à 3 jours, plus
   un contrat AR24 payé à la lettre.
5. Les coûts externes récurrents restent faibles pour les canaux construits : quelques euros par
   mois, sauf trois postes :
   - les SMS, payés au message ;
   - WhatsApp, quand on écrit le premier ;
   - l'évaluation de sécurité annuelle de Google si Gmail passe en production (540 à 4 500 $ par an
     selon le niveau, source tierce).
6. À faire par Teo, par ordre de rendement :
   - acheter des crédits SMS Brevo ;
   - inscrire l'application Microsoft ;
   - créer l'application Google (régime Test) ;
   - ouvrir le compte Meta WhatsApp ;
   - demander les accès Pennylane et QuickBooks ;
   - décider de la téléphonie.

## Tableau

| Canal | État | Ce qui manque | Jours actuel → B | Jours B → A | Coût externe | Compte à créer par Teo |
|---|---|---|---|---|---|---|
| Courriel sortant (Brevo) | **A** | — | — | — | Abonnement Brevo, déjà en place | — |
| Courriel entrant (Brevo inbound, `reception/brevo`) | **B / T** | Le premier vrai message envoyé à l'adresse de réception n'est pas encore arrivé ; MX `recu.omegaai.fr` et webhook posés | 0 | 0,5 (vérifier la réception et les pièces) | Compris dans Brevo | — (déjà fait) |
| Gmail (relève, brouillons) | **B (code) / T** | Application Google et secrets ; déploiement de `messagerie` et `messagerie-oauth` ; un essai réel | 0 | 1 | Gratuit en régime Test (100 comptes, reconnexion chaque semaine) ; en production, évaluation de sécurité annuelle (540 à 4 500 $ par an selon le niveau, source tierce, à faire chiffrer par un laboratoire) | Projet Google Cloud et client OAuth (`GUIDE-GMAIL.md`) |
| Outlook / Microsoft 365 (relève, brouillons) | **B (code) / T** | Inscription de l'application Microsoft et secrets ; même déploiement ; un essai réel | 0 | 1 | Gratuit ; vérification de l'éditeur gratuite (recommandée pour les entreprises clientes) | Inscription d'application Entra (`GUIDE-MICROSOFT.md`) |
| WhatsApp (réception texte, photos, vocaux) | **B (code) / T** | Compte Meta Business, numéro, trois secrets, webhook ; ligne d'expéditeur par numéro | 0 | 0,5 | Recevoir est gratuit ; écrire le premier coûte environ 0,03 $ par message « utility » en France (tiers) ; réponses gratuites dans les 24 h selon Meta, payantes au-delà de 1 000 par mois depuis le 1er octobre 2026 selon des tiers (à vérifier) | Portefeuille Meta Business, app, numéro (`GUIDE-WHATSAPP.md`) |
| WhatsApp (envoi) | **C** | Le fournisseur `meta_whatsapp` existe au socle mais aucun ouvrier n'envoie ; modèles à faire approuver par Meta | 2 | 0,5 | Voir ligne précédente | Idem |
| SMS (Brevo) | **B (code) / T** | Crédits SMS ; mise en service (`omega/banc/mise_en_service_sms.sql`) | 0 | 0,5 | Environ 0,04 à 0,06 € par SMS en France (prépayé, à vérifier sur la grille Brevo) | Achat de crédits SMS Brevo |
| Formulaire du site | **B** | L'envoi signé depuis omegaai.fr vers `reception/formulaire` n'est pas confirmé en production | 0 | 0,5 | — | — |
| Messagerie du site (widget REPUT) | **B** | Posée et déployée sur la recette, éprouvée dans un vrai Chromium en local ; reste un message réel depuis une page sur la recette. Réponse dans la bulle refusée pour l'instant : la réponse part par courriel ou SMS | 0 | 0,5 | — | — |
| Dépôt par lot de pièces (WebDAV, FILED) | **A (recette)** | Le montage dans l'Explorateur Windows reste à éprouver sur un vrai PC | — | 0,5 | — | — |
| Réseaux sociaux (Facebook, Instagram, avis Google) | **D** | Rien de construit : connecteur Messenger et Instagram (Meta), Google Business Profile (avis), relève dans la même file | 6 à 10 | 2 | Gratuit, mais validations longues : examen de l'application par Meta, accès à l'API Google Business Profile sur demande | App Meta (la même que WhatsApp), accès Google Business Profile |
| Appel manqué transcrit | **D** | `lib/pub.ts` cite « VOCAL v0, construit et jamais publié », mais je n'en trouve pas le code dans ce dépôt : à confirmer. Il faut un numéro chez un opérateur avec webhook (renvoi sur non-réponse, messagerie vocale), la transcription, puis réception et SMS de rappel | 5 à 8 | 2 | Numéro environ 1 à 3 € par mois, minutes entrantes de l'ordre du centime, transcription de l'ordre du centime par minute (ordres de grandeur non vérifiés) | Compte opérateur (Twilio, Vonage ou OVH Telecom) |
| Téléphone d'astreinte | **D** | Routage d'appel selon le planning d'astreinte (REPUT) ; rien de construit côté téléphonie | 4 à 6 (après l'appel manqué) | 1 | Minutes sortantes, quelques centimes la minute | Même compte opérateur |
| Lettre recommandée électronique (AR24) | **C** | Fournisseur `ar24` au socle et LRE promise par CASHD (mise en demeure, `c2_03`), mais aucun ouvrier n'envoie | 2 à 3 | 1 | AR24 facture à la lettre (quelques euros HT, à vérifier sur la grille AR24) | Compte AR24 professionnel et identifiant expéditeur |
| Plateformes de factures électroniques (PA) | **B (contre bac à sable)** | `echange-pa` éprouvé de bout en bout contre notre bac à sable (statuts 204, 207). Il faut une vraie plateforme agréée et son contrat | 0 | 1 à 2 par plateforme (écarts d'implémentation de la norme AFNOR) | Abonnement de la plateforme choisie (variable, à demander) | Contrat et accès API auprès d'une plateforme agréée |
| Logiciels comptables (Pennylane, QuickBooks, Cegid Loop ; export fichier) | **B (code, doubles) / T** ; export fichier **B** | Accès partenaire et secrets ; premier essai réel par éditeur (A4, `GUIDE-LOGICIELS-COMPTABLES.md`) | 0 | 0,5 à 1 par éditeur | Gratuit en bac à sable ; partenariat Cegid sur demande | Portail Intuit, accès partenaire Pennylane, référent partenaire Cegid |
| Agendas (Google Agenda, Outlook) | **D** (créneaux internes seulement, Tiroma) | Lecture des disponibilités et écriture des rendez-vous dans l'agenda du client ; pourrait réutiliser les applications Google et Microsoft déjà prévues (portées agenda en plus) | 4 à 6 | 1 | Gratuit (portées agenda non restreintes chez Google, à vérifier) | Aucun de plus, si les applications Google et Microsoft existent |

## Précisions

- **« B (code) »** veut dire que le code est écrit et testé contre des doubles, et que son socle
  SQL est posé sur la recette quand il en faut un. Aucun appel réel n'a pu avoir lieu faute de
  compte. Le passage en A demande le compte, le déploiement et un message réel.
- **Hors de mon périmètre, et donc estimés de l'extérieur** : réseaux sociaux, téléphonie,
  agendas, AR24, logiciels comptables. Pour les logiciels comptables, je me fie au guide d'A4.
  Ces jours sont à revoir avec les ouvriers concernés.
- Aucun fichier du site public n'a été modifié pour ce chiffrage.
