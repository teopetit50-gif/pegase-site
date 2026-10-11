-- b1_12 — VARELO : les photos du constat d'une livraison (06/10/2026, B1)
--
-- CE QUE ÇA CORRIGE : la page groupes promet « Une livraison reçue avec avarie : le transport, les colis et les
-- photos du constat » (components/secteurs/groupes/textes.ts, survol-reserves). b1_11 tenait le transport et les
-- colis ; les photos manquaient (la lettre disait seulement « tenues à votre disposition »).
--
-- CE QUE ÇA POSE (après b1_11 et b1_11b) :
--   · public.grp_receptions.photos (jsonb, 20 au plus) : chemin dans le bucket omega-clients, nom, octets, type,
--     déposée le, par ;
--   · la vue grp_reserves la rend (colonne ajoutée en dernier) ;
--   · la porte grp_joindre_photo(reception, chemin, nom) : l'écran dépose d'abord le fichier sous
--     <client>/grp_receptions/<reception>/… (la politique Storage INSERT du socle, lot 19o, couvre déjà
--     <client>/<objet_type>/…), puis la porte vérifie le chemin, l'existence de l'objet et son type (une image),
--     l'inscrit et le journalise (varelo.reception.photo_jointe) ;
--   · la lettre de protestation dit combien de photographies sont jointes.
--
-- Règles de pose : add column if not exists ; create or replace ; aucune suppression.

alter table public.grp_receptions add column if not exists photos jsonb not null default '[]'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'grp_receptions_photos_check') then
    alter table public.grp_receptions add constraint grp_receptions_photos_check
      check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 20);
  end if;
end $$;
comment on column public.grp_receptions.photos is 'VARELO — les photos du constat : [{chemin (bucket omega-clients), nom, octets, type, depose_le, depose_par}], 20 au plus, jointes par la porte grp_joindre_photo.';

create or replace view public.grp_reserves with (security_invoker = true) as
  select r.id, r.client_id, r.entite_id, e.nom as societe, r.date_reception, r.mode, r.transporteur, r.document_transport,
         r.objet_id, o.code_groupe, coalesce(o.nom_groupe, r.expediteur) as expediteur, r.colis_attendus, r.colis_recus,
         r.avarie, r.manquant, r.constat, r.reserves_sur_bon, r.montant_estime, r.piece_id, r.territoire, r.regle_code,
         g.libelle as regle_libelle, g.source_texte as regle_source, r.echeance, (r.echeance - current_date) as jours_restants,
         r.calcul ->> 'detail' as calcul_detail, r.statut, r.protestation_le, r.protestation_moyen, r.motif, r.cree_par, r.cree_le,
         case
           when r.statut = 'sans_suite' then 'sans_suite'
           when r.statut = 'protestee' and r.protestation_le > r.echeance then 'protestee_hors_delai'
           when r.statut = 'protestee' then 'protestee'
           when r.echeance < current_date then 'depasse'
           when r.echeance = current_date then 'aujourdhui'
           when r.echeance = current_date + 1 then 'demain'
           else 'a_venir'
         end as etat,
         r.photos
  from public.grp_receptions r
  join public.entites e on e.client_id = r.client_id and e.id = r.entite_id
  left join public.grp_ref_objets o on o.client_id = r.client_id and o.id = r.objet_id
  left join lateral (select x.libelle, x.source_texte from public.regles_delais x where x.code = r.regle_code order by x.version desc limit 1) g on true;
comment on view public.grp_reserves is 'VARELO — les réserves à émettre : chaque livraison avariée ou incomplète avec sa date limite de protestation, les jours restants, l''état et les photos du constat.';

revoke all on public.grp_reserves from anon, authenticated;
grant select on public.grp_reserves to authenticated;

-- Joindre une photo déjà déposée dans le bucket.
create or replace function private.grp_joindre_photo(p_reception uuid, p_chemin text, p_nom text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  r public.grp_receptions;
  v_obj record;
  v_type text;
  v_photo jsonb;
begin
  select * into r from public.grp_receptions where id = p_reception;
  if r.id is null or (v_uid is not null and r.client_id not in (select private.mes_clients())) then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null then
    if not private.a_un_role(r.client_id, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Une photo se joint par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(r.client_id, r.entite_id) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if p_chemin is null or char_length(p_chemin) > 400 or position('..' in p_chemin) > 0
     or left(p_chemin, char_length(r.client_id::text || '/grp_receptions/' || r.id::text || '/')) <> r.client_id::text || '/grp_receptions/' || r.id::text || '/'
     or char_length(p_chemin) = char_length(r.client_id::text || '/grp_receptions/' || r.id::text || '/') then
    raise exception 'Photo refusée : elle se dépose sous %/grp_receptions/%/…', r.client_id, r.id using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(r.photos) p where p ->> 'chemin' = p_chemin) then
    return jsonb_build_object('photos', jsonb_array_length(r.photos), 'deja', true);
  end if;
  if jsonb_array_length(r.photos) >= 20 then
    raise exception 'Photo refusée : vingt photos au plus par livraison.' using errcode = '22023';
  end if;
  select o.name, o.metadata into v_obj from storage.objects o where o.bucket_id = 'omega-clients' and o.name = p_chemin;
  if v_obj.name is null then
    raise exception 'Photo introuvable dans le dépôt : déposez le fichier d''abord.' using errcode = 'P0002';
  end if;
  v_type := lower(coalesce(v_obj.metadata ->> 'mimetype', ''));
  if v_type not like 'image/%' then
    raise exception 'Photo refusée : le fichier n''est pas une image (%).', coalesce(nullif(v_type, ''), 'type inconnu') using errcode = '22023';
  end if;
  v_photo := jsonb_build_object('chemin', p_chemin, 'nom', left(coalesce(nullif(btrim(p_nom), ''), regexp_replace(p_chemin, '^.*/', '')), 200),
                                'octets', nullif(v_obj.metadata ->> 'size', '')::bigint, 'type', v_type,
                                'depose_le', now(), 'depose_par', v_uid);
  update public.grp_receptions set photos = photos || jsonb_build_array(v_photo), maj_le = now() where id = r.id;
  perform private.grp_journal(r.client_id, 'varelo.reception.photo_jointe', 'grp_receptions', r.id::text,
    jsonb_build_object('chemin', p_chemin, 'type', v_type, 'octets', v_photo -> 'octets'), r.entite_id);
  return jsonb_build_object('photos', jsonb_array_length(r.photos) + 1, 'deja', false);
end $function$;

create or replace function public.grp_joindre_photo(p_reception uuid, p_chemin text, p_nom text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_joindre_photo(p_reception, p_chemin, p_nom) $function$;

-- La lettre dit combien de photographies sont jointes (remplace celle de b1_11).
create or replace function private.grp_lettre_reserve(p_reception uuid)
 returns text
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
begin
  select x.* into r from public.grp_reserves x where x.id = p_reception;
  if r.id is null then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;
  return format(E'%s\n\nÀ l''attention de %s\n\nObjet : protestation motivée — livraison du %s%s\n\nMadame, Monsieur,\n\n'
    'Nous avons reçu le %s la livraison%s%s. %s\n\n'
    'Constat : %s\n%s%s'
    'Nous vous adressons, par la présente, notre protestation motivée pour %s, et réservons tous nos droits à indemnisation%s.\n\n'
    'Cette protestation vous est notifiée dans le délai prévu : %s (%s).\n\n'
    'Veuillez agréer, Madame, Monsieur, nos salutations distinguées.\n\n%s',
    r.societe, r.transporteur, to_char(r.date_reception, 'DD/MM/YYYY'),
    coalesce(', document de transport n° ' || r.document_transport, ''),
    to_char(r.date_reception, 'DD/MM/YYYY'),
    coalesce(' expédiée par ' || r.expediteur, ''),
    case when r.colis_attendus is not null and r.colis_recus is not null
         then format(' : %s colis annoncés, %s reçus', r.colis_attendus, r.colis_recus) else '' end,
    case when r.reserves_sur_bon is not null then 'Les réserves suivantes ont été portées sur le bon de livraison : « ' || r.reserves_sur_bon || ' ».'
         else 'Aucune réserve n''a pu être portée sur le bon au moment de la livraison.' end,
    coalesce(r.constat, '—'),
    case when r.montant_estime is not null then 'Préjudice estimé à ce jour : ' || private.grp_euros(r.montant_estime) || E' €.\n' else '' end,
    case jsonb_array_length(coalesce(r.photos, '[]'::jsonb))
      when 0 then E'Les photographies du constat sont tenues à votre disposition.\n\n'
      when 1 then E'Une photographie du constat est jointe à la présente.\n\n'
      else format(E'%s photographies du constat sont jointes à la présente.\n\n', jsonb_array_length(r.photos)) end,
    case when r.avarie and r.manquant then 'avarie et perte partielle' when r.manquant then 'perte partielle' else 'avarie' end,
    case when r.montant_estime is not null then ', à hauteur du préjudice subi' else '' end,
    coalesce(r.regle_source, ''), coalesce(r.calcul_detail, 'date limite au ' || to_char(r.echeance, 'DD/MM/YYYY')),
    r.societe);
end $function$;

revoke execute on function private.grp_joindre_photo(uuid, text, text) from public, anon;
grant execute on function private.grp_joindre_photo(uuid, text, text) to authenticated, service_role;
revoke execute on function public.grp_joindre_photo(uuid, text, text) from public, anon;
grant execute on function public.grp_joindre_photo(uuid, text, text) to authenticated, service_role;
