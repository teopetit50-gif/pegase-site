-- LORANI, lot B5-01 — déposer une pièce sur un projet (récépissé, lettre de la mairie, arrêté, constat d'affichage).
--
-- Ce que ça corrige : le socle lit les courriers de la mairie (lorani_lire_piece, déclenchée par piece_lue.lorani)
-- mais aucune porte ne permet à un membre d'attacher une pièce à un projet Lorani (objet_type 'lorani_projet') :
-- FILED a filed_deposer_piece, Lorani n'avait rien. Sans elle, ni l'écran /espace/lorani ni le scénario B5
-- (étapes 5, 7, 9, 16 de omega/NOTES-B5.md) ne peuvent faire lire un récépissé.
--
-- La porte : public.lorani_deposer_piece(p_projet, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_type_piece)
--   → uuid de la pièce. Le fichier est mis AVANT dans le bucket omega-clients sous
--   <client_id>/lorani_projet/<projet_id>/<nom> ; la pièce part en lecture par le trigger du socle
--   (pieces_demander_lecture). Réservée à qui écrit sur le projet (private.lorani_ecrit_projet) ; la clé de service
--   passe (réception par courriel, lot à venir). Journal : lorani.piece_deposee.
-- Le bucket : la politique Storage INSERT des membres sous <client>/<objet_type>/… est posée par le coordinateur
-- (lot 19o), elle couvre <client>/lorani_projet/<projet>/<nom>. Migration idempotente (create or replace).

create or replace function public.lorani_deposer_piece(
  p_projet uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text, p_chemin text, p_type_piece text default null)
returns uuid
language plpgsql security definer set search_path to '' as $$
declare
  pr public.lorani_projets;
  v_id uuid;
  v_nom text := nullif(btrim(p_nom_fichier), '');
begin
  select * into pr from public.lorani_projets where id = p_projet;
  if not found or ((select auth.uid()) is not null and not private.lorani_ecrit_projet(pr.client_id, pr.entite_id, pr.id)) then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;
  if v_nom is null or char_length(v_nom) > 200 then
    raise exception 'Le nom du fichier est obligatoire (200 caractères au plus).' using errcode = '22023';
  end if;
  if p_mime is null or p_mime !~ '^[a-z]+/[a-z0-9.+-]+$' then
    raise exception 'Type de fichier illisible : %.', coalesce(p_mime, 'aucun') using errcode = '22023';
  end if;
  if p_octets is null or p_octets <= 0 or p_octets > 50 * 1024 * 1024 then
    raise exception 'Le fichier doit faire entre 1 octet et 50 Mo.' using errcode = '22023';
  end if;
  if p_sha256 !~* '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte SHA-256 du fichier est attendue (64 caractères hexadécimaux).' using errcode = '22023';
  end if;
  if p_chemin is null or p_chemin !~ ('^' || pr.client_id::text || '/lorani_projet/' || pr.id::text || '/[^/]{1,200}$') then
    raise exception 'Le fichier se dépose sous <organisation>/lorani_projet/<projet>/<nom>.' using errcode = '22023';
  end if;
  if p_type_piece is not null and p_type_piece !~ '^[a-z][a-z0-9_]{1,59}$' then
    raise exception 'Type de pièce illisible : %.', p_type_piece using errcode = '22023';
  end if;

  begin
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256, chemin,
                               statut, type_piece)
    values (pr.client_id, 'lorani', 'lorani_projet', pr.id::text, 'depot', (select auth.uid()), v_nom, p_mime, p_octets,
            lower(p_sha256), p_chemin, 'recue', p_type_piece)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ce fichier est déjà déposé sur ce projet (même empreinte).' using errcode = '23505';
  end;

  perform private.journaliser_module(pr.client_id, 'lorani', 'lorani.piece_deposee', 'lorani_projet', pr.id::text,
    jsonb_strip_nulls(jsonb_build_object('piece', v_id, 'nom', v_nom, 'mime', p_mime, 'octets', p_octets, 'type_piece', p_type_piece,
                                         'par', (select auth.uid()))),
    pr.entite_id);
  return v_id;
end $$;

revoke all on function public.lorani_deposer_piece(uuid, text, text, bigint, text, text, text) from public, anon;
grant execute on function public.lorani_deposer_piece(uuid, text, text, bigint, text, text, text) to authenticated, service_role;

comment on function public.lorani_deposer_piece(uuid, text, text, bigint, text, text, text) is
  'Lorani : attache un fichier déjà mis dans omega-clients (<client>/lorani_projet/<projet>/<nom>) au projet ; la pièce part en lecture. Qui écrit sur le projet.';
