# Brief Phase 2 — Découverte des SaaS (lis d'abord BRIEF_commun.md dans le même dossier)

## Ta mission

Identifier et documenter TOUS les outils de ta catégorie utilisés par les architectes US.
Commence par la liste de départ fournie, puis élargis avec : catégories G2 / Capterra / TrustRadius /
Software Advice, Product Hunt, annuaire Y Combinator, portefeuilles des VC AEC (Foundamental, Zacua
Ventures, Building Ventures, Brick & Mortar Ventures, Suffolk Technologies), cartographies "AEC tech
landscape", médias (Archinect, Architizer, AEC Magazine, Architosh, ENR, Architect Magazine),
discussions Reddit "what software does your firm use", offres d'emploi d'architectes.

## Format de sortie (OBLIGATOIRE)

Écris un fichier JSONL (une ligne JSON par outil, encodage UTF-8) à l'emplacement indiqué dans ton
prompt. Écris-le avec Python (module json) pour garantir la validité, puis vérifie-le avec
`python3 -I -c "import json,sys; [json.loads(l) for l in open(sys.argv[1]) if l.strip()]" <fichier>`.

Clés de chaque objet (toutes obligatoires, valeur "non trouvé" si inconnue) :

nom, url, categorie, etapes_workflow, segment_cible, probleme_resolu, fonctionnalites_cles,
fonctionnalites_ia, modele_prix, prix_public, integrations, annee_creation, siege,
proprietaire_ou_levees, note_g2, nb_avis_g2, points_forts, points_faibles, date_verification, sources

Précisions :
- categorie : le libellé exact de ta catégorie (fourni dans ton prompt), éventuellement suivi d'une
  sous-catégorie après " / ".
- etapes_workflow : numéros séparés par ";" (ex. "3;4;5").
- probleme_resolu : UNE phrase, du point de vue de l'architecte.
- fonctionnalites_cles : 3 à 6 items séparés par ";".
- fonctionnalites_ia : ce qui existe réellement (pas les annonces), ou "aucune" ou "non trouvé".
- prix_public : montants en USD avec unité et date, ex. "365 $/mois/siège (relevé 2026-11-07)".
- proprietaire_ou_levees : propriétaire (ex. "Nemetschek") ou levées (ex. "série A 12 M$ 2024 [vérifié]").
- note_g2 / nb_avis_g2 : nombres (ex. "4.5" / "312") ou "non trouvé".
- points_forts / points_faibles : 2 à 3 items tirés des AVIS UTILISATEURS (pas du marketing),
  séparés par ";", chacun avec la source entre parenthèses (ex. "(G2, 2025)").
- date_verification : AAAA-MM-JJ.
- sources : 2 à 5 URLs séparées par " | ".

## Rapport final

En plus du JSONL, écris un court fichier markdown (même dossier, même nom avec suffixe _notes.md) :
- nombre d'outils trouvés,
- outils écartés et pourquoi (hors périmètre, pas de présence US, disparu),
- sites inaccessibles,
- les 5 à 8 outils que tu juges les plus importants de ta catégorie (part de marché, croissance,
  pertinence) avec une ligne de justification,
- les signaux de douleur utilisateur les plus fréquents repérés au passage (avec URL).

Puis réponds-moi avec un résumé de 15 lignes maximum.
