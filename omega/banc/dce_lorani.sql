-- Banc Lorani — trois DCE publics réels (neuf, rénovation, VRD) lus par le lecteur (B5, 18/10/2026). Lecture seule :
-- aucun bloc n'écrit. Le dépôt lui-même se fait comme un client, par omega/banc/dce_lorani.mjs (Storage puis
-- lorani_deposer_piece au nom du gérant du banc) : du SQL ne peut pas mettre les octets d'un PDF dans Storage.
--
-- Ordre : bloc 1 (prérequis) ; puis, pour chaque dossier l'un après l'autre :
--   node omega/banc/dce_lorani.mjs <dossier> --voir   (ce qui sera déposé)
--   node omega/banc/dce_lorani.mjs <dossier>          (dépôt ; 12 pièces et 60 Mo au plus)
--   bloc 2 quelques minutes plus tard (lecture et coût) ; on ne passe au dossier suivant que si le cumul reste sous 5 €.
-- Bloc 3 quand tout est lu : ce que les pièces ont donné (valeurs, constats du contrôle).

-- 1. Prérequis : le gérant du banc, le mode essai des envois Lorani, la version du lecteur.
select (select count(*) from public.comptes c join auth.users u on u.id = c.user_id
         where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and u.email = 'gerant@banc-varelo.test' and c.role = 'gerant') as gerant_du_banc,
       (select r.mode from public.reglages_envois r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and r.module = 'lorani' limit 1) as mode_envois_lorani,
       (select max(p.version_lecteur) from public.pieces p where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.lue_le > now() - interval '7 days') as lecteur_recent;

-- 2. Lecture et coût, par projet DCE (le coût vient des travaux lecteur.lire de ses pièces).
with pr as (
  select id, reference, nom from public.lorani_projets
  where client_id = 'cccccccc-0000-4000-8000-00000000000c' and reference like 'BANC-DCE-%'
), pc as (
  select pr.reference, p.id, p.nom_fichier, p.statut, p.type_piece, p.nb_pages, p.version_lecteur, p.motif
  from pr join public.pieces p on p.module = 'lorani' and p.objet_type = 'lorani_projet' and p.objet_id = pr.id::text
), co as (
  select pc.id, sum(coalesce((t.resultat ->> 'cout_eur')::numeric, 0)) as cout
  from pc join public.travaux t on t.genre = 'lecteur.lire' and t.charge ->> 'piece' = pc.id::text
  group by pc.id
)
select pc.reference, pc.nom_fichier, pc.statut, pc.type_piece, pc.nb_pages, pc.version_lecteur, left(pc.motif, 80) as motif,
       round(coalesce(co.cout, 0), 4) as cout_eur,
       round(sum(coalesce(co.cout, 0)) over (), 4) as cout_total_eur
from pc left join co on co.id = pc.id
order by pc.reference, pc.nom_fichier;

-- 3. Ce que les pièces ont donné : valeurs lues par pièce (les champs du contrat CHAMPS-LECTURE-LORANI.md), puis le
--    contrôle du dossier de chaque projet et ses constats.
select pr.reference, p.nom_fichier, p.type_piece, count(v.*) as valeurs,
       count(*) filter (where v.champ like 'mesure.%') as mesures, count(*) filter (where v.champ like 'poste.%') as postes,
       count(*) filter (where v.champ like 'quantite.%') as quantites, count(*) filter (where v.champ like 'regle.%') as regles,
       string_agg(distinct split_part(v.champ, '.', 1), ', ') as familles
from public.lorani_projets pr
join public.pieces p on p.module = 'lorani' and p.objet_type = 'lorani_projet' and p.objet_id = pr.id::text
left join public.pieces_valeurs v on v.piece_id = p.id and v.chiffre is null
where pr.client_id = 'cccccccc-0000-4000-8000-00000000000c' and pr.reference like 'BANC-DCE-%'
group by pr.reference, p.nom_fichier, p.type_piece
order by pr.reference, p.nom_fichier;

select pr.reference, c.intitule, c.statut, c.lance_le, c.constats_nb,
       (select jsonb_agg(jsonb_build_object('nature', k.nature, 'gravite', k.gravite, 'titre', left(k.titre, 160)) order by k.gravite, k.nature)
          from public.lorani_constats k where k.controle_id = c.id) as constats
from public.lorani_projets pr join public.lorani_controles c on c.projet_id = pr.id
where pr.client_id = 'cccccccc-0000-4000-8000-00000000000c' and pr.reference like 'BANC-DCE-%'
order by pr.reference;
