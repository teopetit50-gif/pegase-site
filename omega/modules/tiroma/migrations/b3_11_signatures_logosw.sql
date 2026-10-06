-- b3_11 — Des signatures d'en-têtes qui ne se recouvrent plus entre les jeux Logos_w.
--
-- CE QUE ÇA CORRIGE (remarque d'A1, lecteur-exports d963121) : sous un nom de fichier neutre, le lecteur reconnaît
-- un jeu par sa signature (`entetes` : tous présents dans la feuille, forme normalisée). Avec les signatures v1, un
-- fichier complet d'un jeu couvrait la signature d'un autre, donc deux candidats, donc « à classer » :
--   actes, agenda, devis_lignes  ⊇ devis     ["N° devis", "Date"]
--   agenda                       ⊇ patients  ["N° patient", "Nom"]
--   devis_lignes                 ⊇ types_rdv ["Libellé", "Durée"]
-- Chaque signature gagne un en-tête que seul son jeu déclare (vérifié sur tous les alias des dix jeux) :
--   devis     + « Part AMO » ; patients + « Prénom » ; types_rdv + « Couleur ».
-- Un export qui n'aurait pas cet en-tête reste reconnu par son nom de fichier (motif_fichier, inchangé).
--
-- CE QUI NE CHANGE PAS : les colonnes, les clés, les obligations. En particulier `agenda.patient_ref` reste NON
-- obligatoire, volontairement : un agenda porte des créneaux sans patient (réunion, pause, urgence réservée) et
-- tiroma_appliquer_releve garde le patient déjà connu quand la référence est vide.
--
-- Idempotent : ne réécrit que les lignes qui portent encore la signature v1 ; les branchements déjà déclarés
-- (branchements_jeux recopie le modèle) suivent, sauf ceux dont la signature a été réglée à la main.

with nouvelles(code, avant, apres) as (values
  ('devis',     array['N° devis', 'Date'],    array['N° devis', 'Date', 'Part AMO']),
  ('patients',  array['N° patient', 'Nom'],   array['N° patient', 'Nom', 'Prénom']),
  ('types_rdv', array['Libellé', 'Durée'],    array['Libellé', 'Durée', 'Couleur'])
), modeles as (
  update public.modeles_jeux m
     set entetes = n.apres
    from nouvelles n
   where m.module = 'tiroma' and m.logiciel = 'logosw' and m.code = n.code and m.version = 1
     and m.entetes = n.avant
  returning m.id
)
select count(*) as modeles_mis_a_jour from modeles;

with nouvelles(code, avant, apres) as (values
  ('devis',     array['N° devis', 'Date'],    array['N° devis', 'Date', 'Part AMO']),
  ('patients',  array['N° patient', 'Nom'],   array['N° patient', 'Nom', 'Prénom']),
  ('types_rdv', array['Libellé', 'Durée'],    array['Libellé', 'Durée', 'Couleur'])
), jeux as (
  update public.branchements_jeux j
     set entetes = n.apres, maj_le = now()
    from nouvelles n, public.branchements b
   where b.id = j.branchement_id and b.module = 'tiroma' and b.logiciel = 'logosw'
     and j.code = n.code and j.entetes = n.avant
  returning j.id
)
select count(*) as branchements_mis_a_jour from jeux;

-- Contrôle : les trois signatures v2 en place.
select code, entetes from public.modeles_jeux
 where module = 'tiroma' and logiciel = 'logosw' and code in ('devis', 'patients', 'types_rdv') and version = 1
 order by code;
