-- c3_14 — REPUT : lire et afficher les pièces jointes d'une demande (session C3, 19/10/2026)
--
-- Chiffrage #43 (« Les pièces jointes sont conservées et rattachées à la demande ») : A2 garde les pièces sur la réception
-- (public.receptions.pieces = [{nom, mime, taille, chemin}], fichiers dans le bucket omega-clients sous
-- <client>/receptions/<id externe>/<nom>). L'écran n'en montrait que les noms. Ce lot ouvre la pièce depuis la demande :
--   · public.reput_pieces(p_demande) — la liste des pièces de la demande, rangée, avec leur nature (image, pdf, texte,
--     audio, vidéo, autre) et si l'écran peut l'afficher dans la page ; les pièces non reçues (detail.pieces_ignorees)
--     sont dites ;
--   · public.reput_ouvrir_piece(p_demande, p_rang) — rend le chemin à signer (URL de 5 minutes, côté écran) et journalise
--     l'ouverture (reput.piece.ouverte : rang, nature, taille ; jamais le nom du fichier ni son contenu).
-- Qui : une personne connectée qui lit la demande (même règle que la politique de lecture de reput_demandes : membre de
-- l'organisation et périmètre couvrant l'entité). Un chemin qui ne commence pas par le client de la demande n'est jamais
-- rendu. Affichées dans la page : images courantes, PDF, texte brut ; le reste (SVG et HTML compris) se télécharge.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_nature_piece(p_mime text, p_nom text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when lower(coalesce(p_mime, '')) in ('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif')
      or lower(coalesce(p_nom, '')) ~ '\.(jpe?g|png|gif|webp|heic|heif)$' then 'image'
    when lower(coalesce(p_mime, '')) = 'application/pdf' or lower(coalesce(p_nom, '')) ~ '\.pdf$' then 'pdf'
    when lower(coalesce(p_mime, '')) = 'text/plain' or lower(coalesce(p_nom, '')) ~ '\.txt$' then 'texte'
    when lower(coalesce(p_mime, '')) like 'audio/%' then 'audio'
    when lower(coalesce(p_mime, '')) like 'video/%' then 'video'
    else 'autre'
  end
$function$;

revoke execute on function private.reput_nature_piece(text, text) from public, anon, authenticated;

-- La demande, si la personne connectée la lit ; sinon une erreur 42501.
create or replace function private.reput_demande_lue(p_demande uuid)
 returns public.reput_demandes
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  d public.reput_demandes;
begin
  select * into d from public.reput_demandes x where x.id = p_demande;
  if v_uid is null or d.id is null or d.client_id not in (select private.mes_clients())
     or not private.perimetre_couvre(v_uid, d.client_id, d.entite_id) then
    raise exception 'Cette demande n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  return d;
end $function$;

revoke execute on function private.reput_demande_lue(uuid) from public, anon, authenticated;

create or replace function private.reput_pieces_liste(d public.reput_demandes)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'rang', x.rang,
           'nom', coalesce(nullif(btrim(x.p ->> 'nom'), ''), 'pièce ' || x.rang),
           'mime', coalesce(x.p ->> 'mime', 'application/octet-stream'),
           'taille', case when (x.p ->> 'taille') ~ '^[0-9]{1,15}$' then (x.p ->> 'taille')::bigint end,
           'nature', private.reput_nature_piece(x.p ->> 'mime', x.p ->> 'nom'),
           'affichable', private.reput_nature_piece(x.p ->> 'mime', x.p ->> 'nom') in ('image', 'pdf', 'texte'),
           'disponible', coalesce(x.p ->> 'chemin', '') like d.client_id::text || '/%')
         order by x.rang), '[]'::jsonb)
  from public.receptions r,
       lateral jsonb_array_elements(case when jsonb_typeof(r.pieces) = 'array' then r.pieces else '[]'::jsonb end)
         with ordinality as x(p, rang)
  where r.id = d.reception_id and r.client_id = d.client_id
$function$;

revoke execute on function private.reput_pieces_liste(public.reput_demandes) from public, anon, authenticated;

create or replace function public.reput_pieces(p_demande uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_lue(p_demande);
  v_ignorees jsonb;
begin
  select case when jsonb_typeof(r.detail -> 'pieces_ignorees') = 'array' then r.detail -> 'pieces_ignorees' else '[]'::jsonb end
    into v_ignorees
  from public.receptions r where r.id = d.reception_id and r.client_id = d.client_id;
  return jsonb_build_object('demande', d.id, 'pieces', private.reput_pieces_liste(d), 'ignorees', coalesce(v_ignorees, '[]'::jsonb));
end $function$;

revoke execute on function public.reput_pieces(uuid) from public, anon;
grant execute on function public.reput_pieces(uuid) to authenticated, service_role;

create or replace function public.reput_ouvrir_piece(p_demande uuid, p_rang integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_lue(p_demande);
  p jsonb;
  v_chemin text;
  v_nature text;
begin
  select x.p into p
  from public.receptions r,
       lateral jsonb_array_elements(case when jsonb_typeof(r.pieces) = 'array' then r.pieces else '[]'::jsonb end)
         with ordinality as x(p, rang)
  where r.id = d.reception_id and r.client_id = d.client_id and x.rang = p_rang;
  if p is null then
    raise exception 'Cette demande n''a pas de pièce n° %.', p_rang using errcode = '22023';
  end if;
  v_chemin := p ->> 'chemin';
  if v_chemin is null or v_chemin not like d.client_id::text || '/%' or v_chemin ~ '(^|/)\.\.(/|$)' then
    raise exception 'Cette pièce n''est pas dans le stockage de l''organisation.' using errcode = '22023';
  end if;
  v_nature := private.reput_nature_piece(p ->> 'mime', p ->> 'nom');
  perform private.journaliser_module(d.client_id, 'reput', 'reput.piece.ouverte', 'reput_demandes', d.id::text,
    jsonb_build_object('rang', p_rang, 'nature', v_nature, 'taille', p -> 'taille', 'par', (select auth.uid())), d.entite_id);
  return jsonb_build_object('bucket', 'omega-clients', 'chemin', v_chemin, 'duree', 300,
                            'nom', coalesce(nullif(btrim(p ->> 'nom'), ''), 'pièce ' || p_rang),
                            'mime', coalesce(p ->> 'mime', 'application/octet-stream'), 'nature', v_nature,
                            'affichable', v_nature in ('image', 'pdf', 'texte'));
end $function$;

revoke execute on function public.reput_ouvrir_piece(uuid, integer) from public, anon;
grant execute on function public.reput_ouvrir_piece(uuid, integer) to authenticated, service_role;
