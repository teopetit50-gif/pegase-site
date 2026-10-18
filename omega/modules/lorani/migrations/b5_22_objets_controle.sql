-- LORANI, lot B5-22 — les objets déjà nommés par les pièces sœurs, pour le lecteur (A1, 06/10/2026).
--
-- Pourquoi : le croisement du contrôle du dossier (b5_16) rapproche deux mesures par leur grandeur ET leur objet
-- (« batiment_a », « facade_sud »). Le lecteur voit chaque pièce seule : il peut nommer « batiment_principal » ce
-- qu'une autre planche a nommé « batiment_a », et l'écart passe inaperçu. Avant de lire une pièce, le lecteur demande
-- les objets déjà rendus par ses pièces sœurs et reprend le même nom quand sa mesure porte sur la même chose.
--
-- Ce qui est posé :
--   · public.lorani_objets_controle(p_piece) → jsonb : [{"grandeur", "objet"}, …], 200 au plus, sans valeur.
--     Pièces sœurs = les pièces des contrôles où figure la pièce ; si elle n'est dans aucun contrôle, les pièces Lorani
--     du même projet. Rien si la pièce n'est pas une pièce Lorani rattachée à un projet.
--     Réservée à la clé de service (le lecteur) : ni authenticated ni anon.
-- Idempotent ; rien n'est retiré.

CREATE OR REPLACE FUNCTION public.lorani_objets_controle(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with p as (
    select x.id, x.client_id, x.objet_id from public.pieces x
    where x.id = p_piece and x.module = 'lorani' and x.objet_type = 'lorani_projet' and x.objet_id is not null
  ), soeurs as (
    select cp2.piece_id from p
    join public.lorani_controle_pieces cp on cp.piece_id = p.id
    join public.lorani_controle_pieces cp2 on cp2.controle_id = cp.controle_id and cp2.piece_id <> p.id
    union
    select y.id from p join public.pieces y on y.client_id = p.client_id and y.module = 'lorani' and y.objet_type = 'lorani_projet'
                                          and y.objet_id = p.objet_id and y.id <> p.id
    where not exists (select 1 from public.lorani_controle_pieces cp where cp.piece_id = p.id)
  ), objets as (
    select distinct split_part(pv.champ, '.', 2) as grandeur, split_part(pv.champ, '.', 3) as objet
    from soeurs s join public.pieces_valeurs pv on pv.piece_id = s.piece_id and pv.chiffre is null
    where pv.champ ~ '^mesure\.[a-z0-9_]+\.[a-z0-9_]+$'
    order by 1, 2
    limit 200
  )
  select coalesce(jsonb_agg(jsonb_build_object('grandeur', o.grandeur, 'objet', o.objet) order by o.grandeur, o.objet), '[]'::jsonb) from objets o
$function$;
REVOKE EXECUTE ON FUNCTION public.lorani_objets_controle(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lorani_objets_controle(uuid) TO service_role;
