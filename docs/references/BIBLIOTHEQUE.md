# Bibliothèque des références (11/11/2026)

Tous les sites copiés pour bâtir omegaai.fr et ses logiciels, ce que chacun a donné, et les gabarits achetés
encore libres. Demandée par Teo le 11/11/2026 (« une bibliothèque avec tous les sites qu'on a copiés pour Omega »).
La page avec les captures est publiée en artifact ; ce fichier est la source pour les sessions.
Pour ajouter un site : une ligne ici, une capture (`scripts-capture-modeles.mjs` ou `outils/chrome.mjs`),
et s'il doit entrer au catalogue public, une entrée dans `components/modeles/donnees.ts`.

## Ajoutés le 11/11/2026

| Site | Adresse | Source | État |
|---|---|---|---|
| Radius | https://radius.nextjsshop-preview.workers.dev/ | nextjsshop | Déjà employé : la page Avocats (Tamila) refaite 1:1 dessus le 11/11. Entré au catalogue /modeles le 11/11 avec ses pages internes. |
| Agent AI (21st) | https://agent-ai-v1.21st.app/ | 21st.dev | Déjà employé : l'accueil d'omegaai.fr en est le décalque 1:1 depuis le 05/11. Même gabarit que « Agent-AI » de nextjsshop, déjà au catalogue (captures comparées) : l'entrée du catalogue pointe désormais sur cette adresse. |
| NexusCloud (21st) | https://nexuscloud-v1.21st.app/ | 21st.dev | Pas encore employé. Même gabarit que l'aperçu nextjsshop « zensend », entré au catalogue sous le nom Nexuscloud : l'entrée du catalogue pointe désormais sur cette adresse. |

Captures 1440 px du jour : `docs/references/captures/<nom>.jpg` (radius, agentaiv1, nexuscloudv1).

## Ce que chaque page d'Omega a copié

| Page | Route | Logiciel | Référence | Date | Note |
|---|---|---|---|---|---|
| Accueil | `omegaai.fr` | Omega | [Agent AI (21st)](https://agent-ai-v1.21st.app/) | 05/11/2026 | Décalque 1:1, bloc par bloc dans l'ordre de la référence ; les écrans du gabarit remplacés par des captures de l'espace client. |
| Grands groupes | `/secteurs/groupes` | Varelo | [Payload marketing (21st)](https://payload-marketing-v1.21st.app/) | 25/09/2026 | Décalque 1:1, gabarit noir passé en blanc. Teo : « je préfère un truc fait à l'identique plutôt qu'un truc fait à 80 % ». |
| BTP | `/secteurs/btp` | Daliro | [Vertex](https://vertex-one-lovat.vercel.app) | 24/09/2026 | Page d'accueil de chantieros-site rapatriée dans omegaai.fr : grille de fonctionnalités, « Trusted by » et formules de Vertex. |
| Hôtellerie | `/secteurs/hotellerie` | Ostelo | [Vertex, par la page BTP](https://vertex-one-lovat.vercel.app) | 04/11/2026 | Copie de la page BTP : mêmes composants, même UX, textes du métier hôtelier. |
| Avocats | `/secteurs/avocats` | Tamila | [Vetra, puis Radius](https://radius.nextjsshop-preview.workers.dev/) | 24/09 puis 11/11/2026 | D'abord décalque de vetra-app passé en blanc ; refaite 1:1 sur le dessin de Radius le 11/11. |
| Architectes | `/secteurs/architectes` | Lorani | Parlo | 24/09/2026 | Page d'accueil de dossieros-site rapatriée ; gabarit Parlo (hero-10, bouton étoilé, liseré), thème clair de l'auteur gardé. L'adresse de démo n'est notée nulle part dans le code. |
| Location automobile | `/secteurs/location-automobile` | Tavaro | [rentalos-site](https://rentalos-site.vercel.app) | 24/09/2026 | Page d'accueil de rentalos-site rapatriée (source en Tailwind v3, General Sans). Le gabarit d'origine n'est pas noté dans le code. |
| Dentaire | `/secteurs/dentaire` | Tiroma | [tiroma-site](https://tiroma-site.vercel.app) | 24/09/2026 | Page d'accueil de dentaire-site rapatriée, bundle compilé repassé en JSX, rhabillage « cabinet dentaire ». Le gabarit d'origine n'est pas noté dans le code. |
| Espace client, coquille | `/espace2` | Omega | [Attio, puis le tableau de bord Supabase](https://supabase.com/dashboard) | 22/10/2026 | Boutons et cartes d'abord pris sur Attio, puis la base commune refaite au 1:1 du tableau de bord Supabase (gabarits components/espace2/sb) : Inter et Manrope, rayons 8 px, principal bleu. |
| Premières pages des modules | `/espace2/cashd · filed · reput · offload` | CASHD, FILED, REPUT, OFFLOAD | [Linear, page Issues](https://linear.app) | 28/10/2026 | La page « Issues » de Linear au 1:1, modèle des premières pages des quatre modules ; les pages communes (Activité…) sur un modèle Linear ou Plain. |
| Sous-pages des six métiers | `/espace2/daliro · lorani · tamila · tavaro · tiroma · varelo` | Daliro, Lorani, Tamila, Tavaro, Tiroma, Varelo | Linear, Plain, Attio, Cal.com | 01 au 03/11/2026 | Chaque sous-page est la copie 1:1 d'une page réelle d'un de ces quatre logiciels (règles de Teo du 01/11). Le détail page par page est dans la section suivante. |
| Sites dédiés des logiciels | `varelo-site, lorani-site, tamila-site, tavaro-site, tiroma-site, daliro` | Les six | [omegaai.fr](https://omegaai.fr) | 10/11/2026 | La racine de chaque logiciel est sa page de vente, copiée d'omegaai.fr (déploiements Vercel séparés, témoin NEXT_PUBLIC_PORTAIL_METIER). |

## Pages d'application copiées pour les métiers

Détail et règles : `docs/refonte-metiers/REGLES.md` ; relevés par logiciel : `docs/refonte-metiers/REFERENCES-*.md`.

| Logiciel | Page | Adresse | Sous-pages |
|---|---|---|---|
| Linear | Accueil d'une équipe | https://linear.app/omegaaii/team/OME/overview | Daliro vue d'ensemble · Tavaro vue d'ensemble · Varelo Ce matin |
| Linear | Projects, liste et Timeline | https://linear.app/omegaaii/projects/all | Daliro Chantiers · Lorani vue d'ensemble |
| Linear | Page d'une Initiative | https://linear.app/omegaaii/initiative/residence-les-tilleuls-c37131c236b4/overview | Daliro fiche chantier · Lorani projet · Tamila dossier |
| Linear | Liste des Initiatives | https://linear.app/omegaaii/initiatives | Tavaro Réseau et flotte · Varelo Groupe |
| Linear | Page d'un ticket | https://linear.app/omegaaii/issue/OME-19 | Lorani permis · Tavaro contrat · Tamila dossier de faits |
| Linear | Triage | https://linear.app/omegaaii/team/OME/triage | Daliro À ranger · Tamila Arrivées · Tavaro Amendes · Tiroma Avant les rendez-vous |
| Linear | My issues | https://linear.app/omegaaii/my-issues/assigned | Daliro À faire · Tamila vue d'ensemble · Tiroma Aujourd'hui · Lorani À viser |
| Linear | Inbox | https://linear.app/omegaaii/inbox | Lorani Courrier · Tavaro Retours à facturer |
| Linear | Board | https://linear.app/omegaaii/team/OME/all | Daliro Avenants · Tavaro Parc et atelier · Tiroma Plans et devis · Varelo Opérations |
| Linear | Settings › Labels et Templates | https://linear.app/omegaaii/settings/issue-labels | Daliro Réglages · Tavaro Réglages |
| Linear | Settings › Team | https://linear.app/omegaaii/settings/teams/OME | Lorani Réglages · Tamila Réglages · Tiroma Réglages |
| Linear | Settings › Integrations | https://linear.app/omegaaii/settings/integrations | Varelo Sources et structure |
| Plain | Tenants / Accounts | https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tenants/ | Tamila Honoraires · Varelo Contrats |
| Plain | Tasks | https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tasks/ | Tamila Conformité · Tavaro Incidents · Daliro Approvisionnement |
| Plain | Insights › Reporting | https://app.plain.com | Tamila Pilotage · Tiroma Pilotage · Tavaro Pilotage · Varelo Finance |
| Plain | Threads | https://app.plain.com | Tiroma Créneaux et appels · Lorani Questions et réponses |
| Attio | People et fiche d'un contact | https://app.attio.com | Daliro Annuaire · Lorani Honoraires et temps · Varelo Référentiel |
| Cal.com | Bookings | https://app.cal.com/bookings/upcoming | Daliro Équipes · Tiroma Fauteuils |
| Cal.com | Availability | https://app.cal.com/availability | Daliro Équipes (première version, remplacée par Bookings le 03/11) |

## Les gabarits achetés (catalogue /modeles, 84 entrées)

Source : `components/modeles/donnees.ts`. Démos des éditeurs, jamais une copie republiée par nous.
Emplois connus : Payload (Grands groupes, 25/09) ; Vertex (BTP (24/09) et Hôtellerie (04/11)) ; Vetra (Avocats, 24/09 (remplacé par Radius le 11/11)) ; Nexuscloud (Même dessin que NexusCloud (21st), adresse reprise le 11/11) ; Agent-AI (Même dessin qu'Agent AI (21st) : l'accueil d'omegaai.fr, 05/11) ; Radius (Avocats, 11/11 ; entré au catalogue le 11/11).

| Nom | Adresse | Style | Pour | Catégorie |
|---|---|---|---|---|
| Proactiv | https://proactiv-aceternity.vercel.app | Sombre, frontal, très affirmé | Bâtiment, travaux publics, industrie — peser dès la première page | Vous montrez ce que vous réalisez |
| Schedule | https://schedule-template-aceternity.vercel.app/ | Clair, orange, tourné mobile | Après-vente, services, réseaux de points de vente — tout ce qui se réserve | Vos clients réservent |
| Kinto | https://kinto-nextjs-template.vercel.app/ | Clair, serif chaleureux, élégant | Hôtellerie, résidences, bien-être, enseignes de standing | Vos clients réservent |
| Hive | https://hive-nextjs-template.vercel.app | Noir profond, titre géant, galerie | Agence, production, événementiel, réception haut de gamme | Vous montrez ce que vous réalisez |
| Studio | https://studio.tailwindui.com | Noir et blanc, typo large, très dessiné | Architecture, maîtrise d'œuvre, studio de création | Vous montrez ce que vous réalisez |
| OriginX | https://originx.demos.tailgrids.com | Gris très clair, corail, volumes 3D | Agence, société de services, direction du développement | Vous montrez ce que vous réalisez |
| Sonic | https://sonic-nextjs-template.vercel.app/ | Clair, épuré, le produit en grand | Distribution, showroom, concession, réseau de magasins | Vos clients réservent |
| Fincash | https://fincash.demos.tailgrids.com | Noir et vert citron, application en scène | Courtage, assurance, gestion de patrimoine, services financiers | Vous vendez votre expertise |
| Aspect | https://aspect-nextjs-template.vercel.app/ | Sombre, sobre, chiffres au centre | Comptabilité, conseil, assurance, gestion | Vous vendez votre expertise |
| Flux | https://flux-nextjs-template.vercel.app/?banner=false | Clair, premium, matière et relief | Services aux entreprises, conseil, prestation à forte valeur | Vous vendez votre expertise |
| Gray | https://preview.cruip.com/gray/ | Blanc, gris, sobre et premium | Société de conseil, direction qui vend d'abord du sérieux | Vous vendez votre expertise |
| Streamline | https://streamline-nextjs-template.vercel.app | Blanc, minimal, presque nu | Conseil, stratégie, direction — quand le texte doit primer | Vous vendez votre expertise |
| Folio | https://folio-topaz-delta.vercel.app/ | Sombre, dense, technique | Bureau d'études, ingénierie, industrie | Vous montrez ce que vous réalisez |
| SynthAI | https://synthai.demos.tailgrids.com | Clair, sobre, structure complète | Éditeur, société de services, prestataire technique | Vous vendez un service en ligne |
| SaaSSpace | https://saasspace.demos.tailgrids.com | Clair, carré, très lisible | Éditeur, plateforme, groupe à plusieurs offres | Vous vendez un service en ligne |
| AISpace | https://aispace.demos.tailgrids.com | Clair, bleu franc, orienté produit | Services numériques, informatique, intégration | Vous vendez un service en ligne |
| AppSpace | https://appspace.demos.tailgrids.com | Clair, bleu, application mobile en scène | Service à la demande, livraison, réservation, application | Vos clients réservent |
| Postly | https://template-07-saas.vercel.app | Noir, bleu électrique, produit en scène | Communication, marque, agence social media | Vous vendez un service en ligne |
| Sage | https://startup-template-sage.vercel.app | Noir, page unique, droit au but | Lancement d'offre, campagne, opération ponctuelle | Vous vendez un service en ligne |
| Summit | https://summit-nextjs.keenthemes.com | Interface claire, colonnes, fils de discussion | Espace membre, extranet client, plateforme d'échange | Vous vendez un service en ligne |
| Material Kit | https://demos.creative-tim.com/material-kit-pro-react/#/presentation | Bibliothèque de blocs et de pages | Quand il faut beaucoup de pages — 41 gabarits déjà dessinés | Vous vendez un service en ligne |
| Northstar | https://daliagency-anonymized.vercel.app/ | Clair, net, promesse en gros titre | Éditeur, intégrateur, société de services — livré en quatre langues | Vous montrez ce que vous réalisez |
| Vertex ★ | https://vertex-one-lovat.vercel.app | Clair, ordonné, tableau comparatif | Prestataire technique, logiciel métier, bureau d'études | Vous vendez un service en ligne |
| SalesHookAI | https://saleshookai-landing-page-2-v1.21st.app | Clair, violet, preuve par les partenaires | Artisans, dépannage, sociétés d'intervention — le seul gabarit dont le texte parle déjà de ces métiers | Vous montrez ce que vous réalisez |
| Qronos | https://qronos-ai-agent-scheduler-template-v1.21st.app | Sombre, contrasté, produit en scène | Éditeur, plateforme, société d'exploitation | Vous vendez un service en ligne |
| Pulse AI | https://pulse-ai-one-ashy.vercel.app/ | Bleu franc, dégradé, seize pages déjà dessinées | Entreprise qui a beaucoup à dire — blog, prix, contact, pages de compte fournis | Vous vendez votre expertise |
| Intellune | https://intellune-ruixen-com.vercel.app | Clair, courbes et logos animés | Société de services, intégrateur, éditeur | Vous vendez un service en ligne |
| Nguyen | https://nguyen-ai-workspace-saas-landing-page-v1.21st.app | Clair, bleu ciel, vidéo en vitrine | Éditeur, plateforme d'équipe, outil interne vendu au dehors | Vous vendez un service en ligne |
| Guild | https://guild-landing-kit-qa-v1.21st.app | Clair, cartes flottantes, accent violet | Lancement d'offre, opération ponctuelle, produit qui s'annonce | Vous vendez un service en ligne |
| SmileFlow | https://smileflow-premium-next-js-16-dental-practice-templ-v1.21st.app | Clair, rassurant, cabinet de soins | Cabinet dentaire, praticien, centre de soins — écrit pour un métier de santé | Vos clients réservent |
| Personal Site Kit | https://personal-site-kit-v2.21st.app | Une page, menu au clavier, très sobre | Indépendant, consultant, dirigeant qui se présente lui-même | Vous vendez votre expertise |
| T3Code | https://t3code-cinematic-dark-saas-landing-page-template-v2.21st.app | Sombre cinématique, relief animé | Éditeur, marque technique, lancement qui doit impressionner | Vous vendez un service en ligne |
| Evolv-Ai | https://evolv-ai.nextjsshop-preview.workers.dev/ | Sombre, flux et étapes | Société de services, exploitation, prestataire de traitement | Vous vendez un service en ligne |
| Agent-AI ★ | https://agent-ai-v1.21st.app/ | Sombre, chiffres, tourné vente | Direction commerciale, réseau de vente, éditeur d'outils commerciaux | Vous vendez un service en ligne |
| Mosa AI | https://mosa-ai.nextjsshop-preview.workers.dev/ | Sombre, conversation en scène | Éditeur, service d'assistance, plateforme d'échange | Vous vendez un service en ligne |
| Deo-Ecommerce | https://deo-ecommerce.nextjsshop-preview.workers.dev/ | Boutique en ligne, horlogerie, très soigné | Commerce de détail, marque, vente en ligne de produits à forte valeur | Vous vendez un service en ligne |
| Cypon-Analytics | https://cypon-analytics.nextjsshop-preview.workers.dev/ | Clair, mesures en temps réel | Éditeur, plateforme, direction qui pilote par les chiffres | Vous vendez un service en ligne |
| Bookmark Design | https://bookmarkdesign.nextjsshop-preview.workers.dev/ | Galerie de références, très visuel | Annuaire, sélection, catalogue d'inspiration, réseau de partenaires | Vous montrez ce que vous réalisez |
| Ecommerce Template | https://ecommerce-template.nextjsshop-preview.workers.dev/ | Boutique en ligne, tournée conversion | Commerce de détail, marque, réseau de magasins qui vend aussi en ligne | Vous vendez un service en ligne |
| Omega (nextjsshop) | https://omega.nextjsshop-preview.workers.dev/ | Clair, illustration au trait, chiffres en avant | Agence, société de conseil, studio — le travail se prouve en réalisations | Vous montrez ce que vous réalisez |
| Nexflow | https://nexflow.nextjsshop-preview.workers.dev/ | Clair, grand panneau sombre, logos connus | Éditeur, qualité, industrie, bureau de contrôle | Vous vendez un service en ligne |
| Anox | https://anox.nextjsshop-preview.workers.dev/ | Studio de refonte, très dessiné | Studio, agence, prestataire de refonte et de migration | Vous montrez ce que vous réalisez |
| Nexuscloud ★ | https://nexuscloud-v1.21st.app/ | Infrastructure, sobre, technique | Hébergeur, infogérance, services informatiques, opérateur | Vous vendez un service en ligne |
| Aceai | https://aceai.nextjsshop-preview.workers.dev/ | Clair rosé, messagerie d'équipe en scène | Éditeur, outil d'équipe, service en ligne | Vous vendez un service en ligne |
| FleetOps | https://fleetops.nextjsshop-preview.workers.dev/ | Tableaux de bord, flotte et tournées | Transport, logistique, location de véhicules, gestion de parc | Vous vendez un service en ligne |
| Bookify | https://bookify.nextjsshop-preview.workers.dev/ | Gris clair, couverture en vitrine, sobre | Librairie, édition, formation, vente de contenu | Vous vendez un service en ligne |
| ThinkScope | https://thinkcope.nextjsshop-preview.workers.dev/ | Clair, analyse et méthode | Conseil, études, recherche, cabinet d'expertise | Vous vendez votre expertise |
| Deepflow | https://deepflow.nextjsshop-preview.workers.dev/ | Sombre, produit technique en scène | Éditeur, société de données, prestataire d'intégration | Vous vendez un service en ligne |
| Personal-Portfolio | https://personalportfolio.nextjsshop-preview.workers.dev/ | Portfolio, articles, très sobre | Indépendant, profil technique, expert qui publie | Vous vendez votre expertise |
| ConnectSphere | https://connectsphere.nextjsshop-preview.workers.dev/ | Application mobile en scène | Service à la demande, livraison, réservation, application | Vos clients réservent |
| DevFolio | https://preview.cruip.com/devfolio/ | Une page, expérience et réalisations | Indépendant, consultant, profil qui se vend sur ses références | Vous vendez votre expertise |
| Open PRO | https://preview.cruip.com/open-pro/ | Sombre et net, logiciel | Éditeur, jeune société, produit technique | Vous vendez un service en ligne |
| Docs | https://preview.cruip.com/docs/ | Documentation, sommaire, recherche | Éditeur, service technique, base de connaissance ouverte aux clients | Vous vendez un service en ligne |
| Simple | https://preview.cruip.com/simple/ | Clair et simple, une seule idée | Lancement d'offre, campagne, opération ponctuelle | Vous vendez un service en ligne |
| Meridian | https://meridian-nextjs-template.vercel.app/ | Sombre, console, animation d'ouverture | Éditeur d'outils, prestataire technique, société de supervision | Vous vendez un service en ligne |
| Lumen | https://lumen-nextjs-template.vercel.app/ | Lumineux, toutes les pages du socle | Éditeur, société de services, entreprise qui veut un site complet d'emblée | Vous vendez votre expertise |
| Metafi | https://metafi-nextjs-template.vercel.app/ | Sobre, marketing sophistiqué | Finance, conseil, assurance, marque qui vend du sérieux | Vous vendez votre expertise |
| AI Agent Template | https://agent-magicui.vercel.app/ | Clair, automatisation en scène | Éditeur, société d'automatisation, prestataire de traitement | Vous vendez un service en ligne |
| Blog Template | https://blog-magicui.vercel.app/ | Blog, articles, sommaire | Marque qui publie, média, direction de la communication | Vous vendez un service en ligne |
| Minimal Portfolio | https://minimal-portfolio-website-template.vercel.app/ | Minimaliste centré, micro-interactions | Indépendant, créatif, profil qui se vend sur la forme | Vous vendez votre expertise |
| Nodus | https://notus-agent-marketing-template.vercel.app/ | Clair, minimal, très moderne | Éditeur, jeune société technique, plateforme | Vous vendez un service en ligne |
| Lume | https://template-lume.vercel.app/ | Clair, photo en vis-à-vis, paliers de prix | Éditeur, plateforme à plusieurs offres, groupe à plusieurs marques | Vous vendez un service en ligne |
| Dali Agents | https://red.daliagents.com/ | Rouge cinématique, très affirmé | Agence, studio, production, événementiel | Vous montrez ce que vous réalisez |
| Outline | https://21st-outline-preview.vercel.app | Éditorial, clair, tableaux comparatifs | Éditeur, service en ligne, produit qui se compare à un concurrent | Vous vendez un service en ligne |
| AURA | https://21st-aura-svelte-preview-jdpo1k26v-larsen3.vercel.app | Agence créative, mouvement très expressif | Agence, production, événementiel, création | Vous montrez ce que vous réalisez |
| Mobile SaaS | https://mobile-saas-template-v1.21st.app | Application mobile, pensé téléphone d'abord | Service à la demande, application, réseau de points de vente | Vos clients réservent |
| HomeGuardian | https://homeguardian-v1.21st.app | Clair, sécurité de la maison | Alarme, domotique, télésurveillance, installateur — métier reconnaissable d'emblée | Vos clients réservent |
| Studiova | https://studiova-agency-business-bootstrap-template-v2.21st.app | Agence classique, cinq pages complètes | Agence, PME de services, entreprise généraliste | Vous montrez ce que vous réalisez |
| Launch UI | https://launch-ui-v1.21st.app | Lancement, blocs nets, sans bavardage | Lancement d'offre, produit, campagne | Vous vendez un service en ligne |
| SaasCN | https://saas-landing.techwithanirudh.com/ | Logiciel, documentation et blog fournis | Éditeur, service technique, société qui documente ce qu'elle vend | Vous vendez un service en ligne |
| ChatDeck | https://chatdeck-v1.21st.app | Clair, produit en scène, prix et FAQ | Éditeur, plateforme, service d'assistance | Vous vendez un service en ligne |
| Payload ★ | https://payload-marketing-v1.21st.app | Grille architecturale sombre, effet de verre | Éditeur, prestataire technique, société d'ingénierie | Vous vendez un service en ligne |
| Vetra ★ | https://vetra-app.vercel.app/ | Sombre animé, gestion de projet en scène | Éditeur, outil d'équipe, société de services | Vous vendez un service en ligne |
| Luro AI | https://luro.heyshreyas.com/ | Réseaux sociaux, mesures, mouvement soigné | Communication, agence social media, marque qui publie | Vous vendez un service en ligne |
| SaaS Landing | https://saas-landing-template-v1.21st.app | Sombre, grille de fonctions et prix | Éditeur, plateforme, produit en ligne | Vous vendez un service en ligne |
| NexaCore | https://hirael.com/embed/templates/nexacore | Violet profond, vidéo plein écran, cartes en relief | Industrie, infrastructure, groupe, exploitation technique | Vous montrez ce que vous réalisez |
| Asme | https://hirael.com/embed/templates/asme | Sombre, verre dépoli, vidéo en fondu | Marque, enseigne haut de gamme, réception soignée | Vous montrez ce que vous réalisez |
| Velorah | https://hirael.com/embed/templates/velorah | Clair, ciel pastel, très évocateur | Concession, marque de véhicules, équipement de loisir | Vos clients réservent |
| Rivr | https://hirael.com/embed/templates/rivr | Cartes de verre, chiffres, mise en pavés | Finance, courtage, gestion, société d'investissement | Vous vendez votre expertise |
| USD Halo | https://hirael.com/embed/templates/usd-halo | Fintech premium, bandeau de marques | Finance, paiement, assurance, groupe qui rassure par ses références | Vous vendez votre expertise |
| Mindloop | https://hirael.com/embed/templates/mindloop | Monochrome sombre, inscription en ligne | Média, lettre d'information, direction de la communication | Vous vendez un service en ligne |
| Agency Landing | https://hirael.com/embed/templates/agency-landing | Lumineux, fond animé, réalisations | Agence, studio, création, communication | Vous montrez ce que vous réalisez |
| Creative Studio | https://hirael.com/embed/templates/creative-studio | Sombre cinématique, révélations au défilement | Production, studio, événementiel, création | Vous montrez ce que vous réalisez |
| Radius ★ | https://radius.nextjsshop-preview.workers.dev/ | Clair, sobre, application posée sur une photo | Éditeur, cabinet, société de services — quand le produit doit se voir dès l'accueil | Vous vendez un service en ligne |
