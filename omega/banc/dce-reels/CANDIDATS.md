# DCE réels candidats (chantier 2) — A1, 18/10/2026

Avis de marchés de travaux relevés dans l'open data du BOAMP (appels d'offres parus depuis le 01/10/2026,
405 avis). Les DCE de ces avis sont sur PLACE (marches-publics.gouv.fr) et sur Mégalis : deux plateformes
Atexo qui proposent le téléchargement **anonyme** (formulaire « Je souhaite rester anonyme » et acceptation
des conditions d'utilisation).

**Pas encore téléchargé.** Depuis cette session, la soumission de ce formulaire a été refusée par le contrôle
de permissions de l'outil, et non par le réseau : PLACE répond. Il faut donc qu'une personne fasse le
téléchargement, ou qu'elle autorise cette action. Une fois le DCE obtenu, on dépose le zip dans
`<neuf|renovation|vrd>/`, avec un fichier `SOURCE.md` qui donne l'URL et la date.

| Catégorie | BOAMP | Objet | Plateforme : consultation | Remise | Taille du DCE |
|---|---|---|---|---|---|
| neuf (1er choix) | 26-99441 | Cazaux BA 120 : construction de 2 bâtiments de bureaux, sanitaires et vestiaires | https://www.marches-publics.gouv.fr/entreprise/consultation/3077404?orgAcronyme=g7h | 26/11/2026 | 52,24 Mo (lu sur la page) |
| neuf (repli) | 26-98974 | Construction d'amphithéâtres bioclimatiques, campus de Terre Sainte | https://www.marches-publics.gouv.fr/entreprise/consultation/3084054?orgAcronyme=f2h | 12/11/2026 | ? |
| neuf (repli) | 26-99980 | Construction du satellite de restauration de la cité scolaire de Bandrélé | https://www.marches-publics.gouv.fr/?page=Entreprise.EntrepriseAdvancedSearch&AllCons&id=3086909&orgAcronyme=f0g | 06/11/2026 | ? |
| rénovation (1er choix) | 26-100585 | Rénovation thermique du siège de la CAF de l'Indre | https://www.marches-publics.gouv.fr/entreprise/consultation/3087741?orgAcronyme=s7h | 13/11/2026 | ? |
| rénovation (repli) | 26-99983 | Rénovation passive tous corps d'état des bâtiments GMP, H et Bureaux | https://www.marches-publics.gouv.fr/entreprise/consultation/3084774?orgAcronyme=f2h | 16/11/2026 | ? |
| VRD (1er choix) | 26-98864 | Aménagement de la Voie Romaine et de la rue du Fréau, Poullaouen | https://marches.megalis.bretagne.bzh/entreprise/consultation/242264?orgAcronyme=i6q | 06/11/2026 | ? |
| VRD (repli) | 26-99992 | Port à sec de Saint-Malo : longrines et travaux de VRD | https://marches.megalis.bretagne.bzh/entreprise/consultation/242491?orgAcronyme=j9w | 23/11/2026 | ? |
| VRD (repli) | 26-98768 | Aménagement des espaces publics de la ZAC des Tarterêts, Corbeil | https://www.marches-publics.gouv.fr/?page=Entreprise.EntrepriseAdvancedSearch&AllCons&id=3081499&orgAcronyme=d4t | 26/11/2026 | ? |

Taille : un DCE de bâtiment fait en général 20 à 150 Mo, surtout à cause des plans PDF. C'est trop lourd pour
git, et le premier choix « neuf » fait déjà 52 Mo. Je propose de garder dans git seulement le `SOURCE.md` et la
liste des pièces avec leur sha256, et de mettre les fichiers dans le stockage de la recette, sous le banc.

Réseau, testé le 18/10 : boamp.fr, marches-publics.gouv.fr, achatpublic.com, marches-securises.fr, Mégalis et
data.gouv.fr répondent. alpes-marchespublics.fr est refusé par le proxy, et maximilien.fr coupe la connexion.
