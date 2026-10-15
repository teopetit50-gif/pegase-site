-- b4_01 — Tamila : le dépôt d'une pièce chiffrée dans un dossier (session B4, 06/10/2026).
--
-- CE QUE ÇA CORRIGE. La vitrine promet « chaque pièce est lue » et le socle ne connaît les pièces de Tamila
-- que par public.pieces (objet_type 'tamila_dossier', chiffrement 'dossier:v1'), mais aucune porte ne les y
-- dépose : filed_deposer_piece est propre à FILED, lorani_deposer_piece à LORANI (réponse 3 du
-- coordinateur, 05/10). Sans porte, un cabinet ne peut rien confier à un dossier depuis l'écran.
--
-- CE QUE ÇA POSE. public.tamila_deposer_piece(p_dossier, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin,
-- p_type_piece) → jsonb {piece_id, statut, deja}, calquée sur filed_deposer_piece :
--   · par qui ÉCRIT dans le dossier (private.tamila_dossier_ecrit : membre responsable ou intervenant, titulaire
--     perso, associé ; jamais un lecteur ; dossier en attente, ouvert ou audit) ;
--   · le fichier est déjà dans le bucket omega-clients sous <client>/tamila_dossier/<dossier>/<nom> (politique
--     Storage INSERT des membres, lot 19o) : le chemin est vérifié, pas le fichier ;
--   · CHIFFRÉE OBLIGATOIREMENT : chiffrement = 'dossier:v1' — le navigateur chiffre avec la clé du dossier
--     avant d'envoyer ; le sha256 est celui de l'OCTET CHIFFRÉ, jamais du clair ;
--   · idempotente : une pièce de même sha256 dans le même dossier est rendue telle quelle (deja = true) ;
--   · statut 'a_rattacher' tant que le dossier attend son ouverture (les pièces partent à la lecture à
--     l'ouverture, tamila_executer_demande), 'recue' sinon ; le trigger du socle dépose le travail lecteur.lire,
--     que le lecteur refuse aujourd'hui (CHIFFREMENT_NON_PRIS_EN_CHARGE, repris sans fin : voir NOTES-B4) ;
--   · le dépôt est journalisé (tamila.piece.deposee) par son identifiant, jamais par son contenu.
-- Create or replace seulement.

create or replace function private.tamila_deposer_piece(p_dossier uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text,
                                                         p_chemin text, p_type_piece text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_id uuid;
  v_statut text;
  v_prefixe text;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_nom_fichier is null or char_length(p_nom_fichier) < 1 or char_length(p_nom_fichier) > 255 then
    raise exception 'Le nom du fichier est nécessaire (255 caractères au plus).' using errcode = '22023';
  end if;
  if p_mime is null or p_mime !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$' then
    raise exception 'Type de fichier illisible : %.', coalesce(p_mime, 'vide') using errcode = '22023';
  end if;
  if p_octets is null or p_octets <= 0 then
    raise exception 'La taille du fichier est nécessaire.' using errcode = '22023';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte SHA-256 du fichier chiffré est nécessaire (64 caractères hexadécimaux).' using errcode = '22023';
  end if;
  v_prefixe := v_d.client_id::text || '/tamila_dossier/' || p_dossier::text || '/';
  if p_chemin is null or not starts_with(p_chemin, v_prefixe) or char_length(p_chemin) <= char_length(v_prefixe) or char_length(p_chemin) > 1024 then
    raise exception 'La pièce se range sous %…', v_prefixe using errcode = '22023';
  end if;
  if p_type_piece is not null and p_type_piece !~ '^[a-z][a-z0-9_]{1,59}$' then
    raise exception 'Type de pièce illisible : %.', p_type_piece using errcode = '22023';
  end if;

  select pc.id, pc.statut into v_id, v_statut from public.pieces pc
   where pc.client_id = v_d.client_id and pc.module = 'tamila' and pc.objet_type = 'tamila_dossier'
     and pc.objet_id = p_dossier::text and pc.sha256 = p_sha256;
  if v_id is not null then
    return jsonb_build_object('piece_id', v_id, 'statut', v_statut, 'deja', true);
  end if;

  v_statut := case when v_d.statut = 'attente' then 'a_rattacher' else 'recue' end;
  insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256, chemin,
                             statut, type_piece, chiffrement)
  values (v_d.client_id, 'tamila', 'tamila_dossier', p_dossier::text, case when v_uid is null then 'api' else 'depot' end, v_uid,
          p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, v_statut, p_type_piece, 'dossier:v1')
  returning id into v_id;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.piece.deposee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('piece', v_id, 'octets', p_octets, 'statut', v_statut));
  return jsonb_build_object('piece_id', v_id, 'statut', v_statut, 'deja', false);
end $function$;

create or replace function public.tamila_deposer_piece(p_dossier uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text,
                                                        p_chemin text, p_type_piece text default null)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.tamila_deposer_piece(p_dossier, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_type_piece) $function$;

comment on function public.tamila_deposer_piece(uuid, text, text, bigint, text, text, text) is
  'Tamila (B4) : dépose une pièce CHIFFRÉE (dossier:v1) dans un dossier, fichier déjà au bucket sous <client>/tamila_dossier/<dossier>/ ; idempotente sur le sha256 du chiffré.';

grant execute on function public.tamila_deposer_piece(uuid, text, text, bigint, text, text, text) to authenticated, service_role;
grant execute on function private.tamila_deposer_piece(uuid, text, text, bigint, text, text, text) to authenticated, service_role;
revoke execute on function public.tamila_deposer_piece(uuid, text, text, bigint, text, text, text) from anon;
