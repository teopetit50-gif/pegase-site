-- b4_08 — Tamila : la passerelle « avis RPVA lu par le lecteur → délais » (session B4, 06/10/2026, vague 3, n° 3).
--
-- POURQUOI. Aujourd'hui un avis RPVA se saisit à la main (tamila_avis_lu, confiance « saisie »). Avec le coffre (b4_05),
-- le lecteur peut lire une pièce chiffrée ; il faut qu'un avis lu pose ses délais comme un avis saisi.
--
-- OÙ ÇA SE PASSE. Une pièce chiffrée ne laisse rien en clair en base : enregistrer_lecture n'accepte que des pages et
-- des valeurs chiffrées (pieces_pages.texte_chiffre, pieces_valeurs.chiffre). La base ne peut donc pas relire les
-- dates d'un avis : la passerelle se fait dans le lecteur, au moment où il a la clé du dossier en mémoire. Il appelle
-- tamila_avis_du_lecteur avec le type et les seules valeurs que tamila_avis_lu accepte (dates, partie visée, rang) :
-- ce sont celles que tamila_avis garde déjà en clair, rien de plus ne sort.
--
-- LE N° RG. Le n° RG du dossier est chiffré : tamila_dossier_pour_lecteur le rend chiffré au lecteur, qui le déchiffre
-- avec la clé du dossier et compare au n° lu sur l'avis. Il passe la concordance (p_rg_concorde) : un RG différent
-- met l'avis « à vérifier » avec une alerte critique (tamila_appliquer_avis), comme le prévoit le socle.
--
-- CE QUE ÇA POSE (serveur seulement, aucune table) :
--   · tamila_dossier_pour_lecteur(pièce) → {dossier, client, statut, numero_rg (chiffré, hex), avis_deja}
--   · tamila_avis_du_lecteur(pièce, type, valeurs, confiance, rg_concorde) → jsonb de tamila_avis_lu.
--     Le dossier se déduit de la pièce (le lecteur ne le choisit jamais) ; la pièce doit être une pièce Tamila lue,
--     d'un dossier ouvert ; le type, l'un des dix avis ; la confiance, « gabarit » ou « modele ». Idempotent : une
--     pièce déjà lue en avis rend son avis (tamila_avis_lu le fait).
--
-- Create or replace seulement. Fonctions private : revoke from public, grant au seul service_role.

create or replace function private.tamila_dossier_pour_lecteur(p_piece uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_p public.pieces;
  v_d public.tamila_dossiers;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Le lecteur passe par le serveur.' using errcode = '42501';
  end if;
  select * into v_p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if v_p.module <> 'tamila' or v_p.objet_type is distinct from 'tamila_dossier' then
    raise exception 'Cette pièce n''est pas une pièce d''un dossier Tamila.' using errcode = '22023';
  end if;
  select * into v_d from public.tamila_dossiers where id = private.tamila_uuid(v_p.objet_id) and client_id = v_p.client_id;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('piece', p_piece, 'dossier', v_d.id, 'client', v_d.client_id, 'statut', v_d.statut,
                            'numero_rg', case when v_d.numero_rg_chiffre is not null then encode(v_d.numero_rg_chiffre, 'hex') end,
                            'avis_deja', exists (select 1 from public.tamila_avis a where a.piece_id = p_piece));
end $function$;

create or replace function private.tamila_avis_du_lecteur(p_piece uuid, p_type text, p_valeurs jsonb, p_confiance text,
                                                          p_rg_concorde boolean default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_p public.pieces;
  v_d public.tamila_dossiers;
  v_cles text[];
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Un avis lu est posé par le serveur, pour le lecteur.' using errcode = '42501';
  end if;
  select * into v_p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if v_p.module <> 'tamila' or v_p.objet_type is distinct from 'tamila_dossier' then
    raise exception 'Cette pièce n''est pas une pièce d''un dossier Tamila.' using errcode = '22023';
  end if;
  if v_p.statut not in ('en_lecture', 'lue', 'a_verifier') then
    raise exception 'Cette pièce n''a pas été lue (%).', v_p.statut using errcode = '55000';
  end if;
  if p_confiance is null or p_confiance not in ('gabarit', 'modele') then
    raise exception 'La confiance d''un avis lu est « gabarit » ou « modele ».' using errcode = '22023';
  end if;
  -- Rien d'autre que ce que tamila_avis_lu lit : aucune autre valeur lue ne quitte le lecteur.
  select coalesce(array_agg(k), '{}') into v_cles from jsonb_object_keys(coalesce(p_valeurs, '{}'::jsonb)) k
   where k not in ('date_avis', 'date_audience', 'date_cloture_previsible', 'date_limite', 'partie_visee', 'rang', 'depose_le');
  if cardinality(v_cles) > 0 then
    raise exception 'Valeurs refusées (seules les dates, la partie visée et le rang passent) : %.', array_to_string(v_cles, ', ')
      using errcode = '22023';
  end if;
  select * into v_d from public.tamila_dossiers where id = private.tamila_uuid(v_p.objet_id) and client_id = v_p.client_id;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  return private.tamila_avis_lu(v_d.client_id, v_d.id, p_piece, p_type, p_valeurs, p_confiance, p_rg_concorde);
end $function$;

create or replace function public.tamila_dossier_pour_lecteur(p_piece uuid) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_dossier_pour_lecteur(p_piece) $function$;
create or replace function public.tamila_avis_du_lecteur(p_piece uuid, p_type text, p_valeurs jsonb, p_confiance text, p_rg_concorde boolean default null)
returns jsonb
language sql set search_path to '' as $function$ select private.tamila_avis_du_lecteur(p_piece, p_type, p_valeurs, p_confiance, p_rg_concorde) $function$;

revoke execute on function private.tamila_dossier_pour_lecteur(uuid) from public;
revoke execute on function private.tamila_avis_du_lecteur(uuid, text, jsonb, text, boolean) from public;
revoke execute on function public.tamila_dossier_pour_lecteur(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_avis_du_lecteur(uuid, text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function private.tamila_dossier_pour_lecteur(uuid) to service_role;
grant execute on function private.tamila_avis_du_lecteur(uuid, text, jsonb, text, boolean) to service_role;
grant execute on function public.tamila_dossier_pour_lecteur(uuid) to service_role;
grant execute on function public.tamila_avis_du_lecteur(uuid, text, jsonb, text, boolean) to service_role;

comment on function public.tamila_avis_du_lecteur(uuid, text, jsonb, text, boolean) is
  'Tamila (B4, b4_08) : le lecteur pose l''avis RPVA qu''il a lu dans une pièce chiffrée ; dossier déduit de la pièce ; seules les valeurs de tamila_avis_lu passent.';
