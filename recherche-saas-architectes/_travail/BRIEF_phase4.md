# Brief Phase 4 — La voix des architectes (lis d'abord BRIEF_commun.md dans le même dossier)

C'est la phase la plus importante de l'étude. Objectif collectif : 300+ avis, témoignages ou posts
analysés. Ton objectif individuel est indiqué dans ton prompt (50 à 70 items).

## Ce que tu cherches

Les PROBLÈMES RÉELS des architectes US, dans leur travail de projet et la gestion de leur cabinet,
tels qu'ils les expriment eux-mêmes. Priorité absolue aux avis 1 à 3 étoiles, aux fils de discussion
"rant", "frustrated", "why is X so bad", "what do you use for Y", "we switched from X to Y because".

Pour chaque item (avis, post, commentaire, témoignage), tu notes :
- l'étape du workflow concernée (numéro 1 à 19 de BRIEF_commun.md ; "0" si transversal),
- le segment (solo / petit / moyen / grand / résidentiel / commercial / inconnu),
- l'outil concerné (ou "aucun / général"),
- le problème en UNE phrase en français,
- une citation courte EN ANGLAIS, texte original, 40 mots maximum, copiée exactement (pas de
  paraphrase présentée comme citation),
- l'URL exacte du post / de l'avis (pas la page d'accueil du site),
- la date de publication si visible (AAAA-MM ou AAAA),
- la solution de contournement actuelle mentionnée ou évidente (Excel, email, process manuel,
  outil détourné, "on fait sans", etc.) ou "non précisé",
- la note en étoiles si c'est un avis,
- la date de consultation.

## Format de sortie (OBLIGATOIRE)

Fichier JSONL (une ligne JSON par item, UTF-8), écrit avec Python (module json), vérifié avec
`python3 -I -c "import json,sys; [json.loads(l) for l in open(sys.argv[1]) if l.strip()]" <fichier>`.

Clés obligatoires :
type_source (G2 / Capterra / TrustRadius / SoftwareAdvice / Reddit / Archinect / YouTube / LinkedIn /
Podcast / Rapport / Blog / Autre), url, date_publication, outil, etape_workflow, segment, probleme,
citation, contournement, note_etoiles (nombre ou "n/a"), date_consultation

## Règles

- JAMAIS de citation inventée ou reconstituée. Si tu n'as pas pu lire le texte exact (page
  inaccessible, contenu tronqué dans la recherche), n'inclus pas l'item ou mets citation = "non lisible"
  et explique dans les notes.
- Une URL par item, précise. Pour Reddit, l'URL du fil (ou du commentaire).
- Diversifie : plusieurs étapes du workflow, plusieurs tailles de cabinet, résidentiel ET commercial.
- Ne te limite pas aux outils célèbres : les plaintes "il n'existe rien pour faire X" sont les plus
  précieuses (zones blanches).
- Recherches en anglais, rédaction en français (sauf la citation). Pas de tirets cadratins.
- Utilise WebSearch (mode "extended" si besoin) puis WebFetch pour lire le fil / la page d'avis.
  Pour Reddit, l'URL "old.reddit.com" ou le suffixe ".json" peut aider à lire le contenu.
  Si Reddit bloque, note-le et utilise les extraits de recherche uniquement si la citation y figure
  mot pour mot.

## Rapport final

En plus du JSONL, un fichier _notes.md (même dossier, même nom) :
- nombre d'items collectés, répartition par étape du workflow et par type de source,
- les 10 à 15 thèmes de douleur récurrents, avec pour chacun : nombre d'items, étapes, segments,
  intensité perçue (temps / argent / risque juridique / stress), contournements observés,
  et ta note provisoire 1 à 5 sur : Fréquence, Intensité, Insatisfaction (5 = très mal résolu),
  Disposition à payer (signaux concrets : budgets existants, outils déjà payés, plaintes sur les prix),
- les sites inaccessibles.

Puis réponds-moi avec un résumé de 15 lignes maximum.
