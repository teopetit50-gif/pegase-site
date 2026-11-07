# Brief Phase 3 — Fiches détaillées (lis d'abord BRIEF_commun.md dans le même dossier)

Tu rédiges une fiche markdown par outil, en FRANÇAIS, dans /home/user/pegase-site/recherche-saas-architectes/03_fiches_saas/.
Nom de fichier : <nom-en-minuscules-sans-espaces>.md (ex. revit.md, bqe-core.md, deltek-ajera.md).

Avant d'écrire, lis la ligne de l'outil dans /home/user/pegase-site/recherche-saas-architectes/02_base_saas.csv
(grep -i "<nom>") pour partir des données déjà collectées, puis COMPLÈTE et VÉRIFIE avec tes propres
recherches (site éditeur pour les prix, G2 / Capterra / TrustRadius pour les avis, Crunchbase / presse
pour la société, Reddit / Archinect pour les retours terrain).

## Structure OBLIGATOIRE de chaque fiche (garde ces titres exacts)

# <Nom de l'outil>

**Éditeur / propriétaire :** ... | **Catégorie :** ... | **Date de vérification :** AAAA-MM-JJ

## 1. Problème résolu (en une phrase, du point de vue de l'architecte)
## 2. Étapes du workflow couvertes
(numéros et libellés de BRIEF_commun.md ; distingue couverture principale et secondaire)
## 3. Segment cible
(taille de cabinet, type de projet, résidentiel / commercial ; ce que dit l'éditeur ET ce que montrent les avis)
## 4. Fonctionnalités clés
## 5. Fonctionnalités IA
(ce qui est réellement disponible, avec date ; les annonces / bêtas à part, étiquetées "annoncé")
## 6. Prix public et modèle de tarification
(tableau : offre | prix | unité (par siège / projet / usage) | date du relevé | source URL ; noter les
changements récents de tarification s'il y en a)
## 7. Intégrations clés et dépendances
(ex. "plugin Revit uniquement", "export IFC", "API ouverte", "sync QuickBooks")
## 8. Société
(année de création, siège, propriétaire ou levées de fonds étiquetées, nombre de clients / utilisateurs
si publié [déclaratif], effectifs si trouvés)
## 9. Ce que les utilisateurs aiment (3 points sourcés)
(chaque point : phrase en français + citation courte en anglais entre guillemets + source avec URL et date)
## 10. Ce que les utilisateurs détestent (3 points sourcés)
(même format ; priorité aux avis 1 à 3 étoiles et aux fils Reddit / Archinect)
## 11. Pourquoi les clients partent ou n'adoptent pas l'outil
(raisons de churn et de non-adoption, sourcées : "we switched from X to Y because", comparatifs, prix,
complexité, dépendance plateforme)
## 12. Concurrents directs
(liste avec une ligne de positionnement chacun)
## 13. Promesse marketing vs réalité utilisateur
(2 à 4 lignes : ce que l'éditeur promet, ce que les avis confirment ou contredisent)
## Sources
(toutes les URLs utilisées, avec titre court et date de consultation)

## Règles

- Jamais de chiffre, prix ou citation inventés. "non trouvé" si tu ne trouves pas.
- Chaque chiffre est étiqueté [vérifié] / [estimé] / [déclaratif].
- 60 à 120 lignes par fiche. Pas de tirets cadratins. Pas de jargon inutile.
- Vérifie la fiche avec `python3 -I -c "import sys; t=open(sys.argv[1]).read(); print(len(t.splitlines()), 'lignes'); assert '—' not in t"`.

Quand tu as fini tes fiches, réponds-moi avec, pour chaque fiche : nom de fichier, nombre de lignes,
prix relevé (une ligne), et les 2 informations que tu n'as pas pu vérifier.
