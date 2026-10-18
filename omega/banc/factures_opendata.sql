-- Banc FILED — factures publiées en open data par des collectivités, lues par FILED (A4, 18/10/2026, chantier 3).
-- Lecture seule : aucun bloc n'écrit. Le dépôt se fait comme un client, par omega/banc/factures_opendata.mjs.
-- Ordre : bloc 1 ; puis, par paquets (MAX_PIECES=10 node omega/banc/factures_opendata.mjs), bloc 2 entre deux paquets
-- — on s'arrête dès que le cumul approche 1 € ; bloc 3 quand tout est lu.

-- 1. Prérequis : FILED installé sur le client du banc, son gérant, la version du lecteur.
select (select count(*) from public.filed_reglages r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and r.entite_id is null and r.actif) as filed_installe,
       (select count(*) from public.comptes c join auth.users u on u.id = c.user_id
         where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and u.email = 'gerant@banc-varelo.test' and c.role = 'gerant') as gerant_du_banc,
       (select max(p.version_lecteur) from public.pieces p where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.lue_le > now() - interval '7 days') as lecteur_recent;

-- 2. Lecture et coût des pièces open data (le coût vient des travaux lecteur.lire de chaque pièce).
with d as (
  select d.id, d.reference, d.nom_fichier, d.piece_id, d.etat, d.nature from public.filed_documents d
  where d.client_id = 'cccccccc-0000-4000-8000-00000000000c' and d.expediteur like 'opendata:%'
), co as (
  select d.id, sum(coalesce((t.resultat ->> 'cout_eur')::numeric, 0)) as cout
  from d join public.travaux t on t.genre = 'lecteur.lire' and t.charge ->> 'piece' = d.piece_id::text
  group by d.id
)
select d.reference, d.nom_fichier, d.etat, d.nature, p.statut as lecture, p.nb_pages, p.version_lecteur,
       round(coalesce(co.cout, 0), 4) as cout_eur, round(sum(coalesce(co.cout, 0)) over (), 4) as cout_total_eur
from d join public.pieces p on p.id = d.piece_id left join co on co.id = d.id
order by d.reference;

-- 3. Les écarts : ce que FILED a lu de chaque facture, et ce que ses contrôles y trouvent.
select d.reference, d.nom_fichier, f.statut, f.numero, f.date_emission, f.montant_ht, f.montant_tva, f.montant_ttc, f.devise,
       fo.nom as fournisseur, fo.siren,
       (select string_agg(c.gravite || ' ' || c.code || ' : ' || left(c.message, 120), ' | ' order by c.gravite, c.code)
          from public.filed_controles c where c.facture_id = f.id and c.resultat = 'anomalie') as ecarts
from public.filed_documents d
left join public.filed_factures f on f.document_id = d.id
left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
where d.client_id = 'cccccccc-0000-4000-8000-00000000000c' and d.expediteur like 'opendata:%'
order by d.reference;

-- 3 bis. Les écarts comptés par contrôle, pour le bilan.
select c.code, c.gravite, count(*) as factures
from public.filed_documents d join public.filed_controles c on c.document_id = d.id and c.resultat = 'anomalie'
where d.client_id = 'cccccccc-0000-4000-8000-00000000000c' and d.expediteur like 'opendata:%'
group by c.code, c.gravite order by count(*) desc, c.code;
