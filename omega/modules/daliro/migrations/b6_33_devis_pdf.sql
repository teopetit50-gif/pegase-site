-- b6_33 — DALIRO : le devis en PDF, lu par le lecteur d'A1 puis importé (session B6, 15/10/2026), après b6_28
--
-- LA PROMESSE (/secteurs/btp) : « Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. »
-- b6_28 importait le tableau collé d'Excel ou le CSV. Le lecteur v34 d'A1 (c51c6de) lit maintenant un devis PDF en
-- lignes : type daliro_devis, valeur « lignes » (numero, lot, designation, unite, quantite, prix_unitaire, montant),
-- plus montant_total_ht (CHAMPS-LECTURE.md, § Daliro). Le lecteur ne pose rien : l'écran relit, montre, importe.
--
-- CE QUI EST POSÉ.
--   · public.btp_deposer_devis(marche, nom, mime, octets, sha256, chemin) : le PDF, déjà mis dans omega-clients
--     sous <client>/btp_marche/<marche>/<nom>, devient une pièce du module daliro rattachée au marché (statut
--     « recue », type daliro_devis) ; le déclencheur du socle demande sa lecture. Le bureau (btp_exiger_bureau), sur
--     un marché À VÉRIFIER. Même fichier deux fois : refusé (empreinte). Journal daliro.devis_depose.
--   · public.btp_devis_lu(marche) : la dernière pièce daliro du marché, son statut, et ce que le lecteur en a lu
--     (lignes, montant_total_ht, numero, verifiee). L'écran l'interroge jusqu'à la lecture, montre l'aperçu, puis
--     appelle btp_importer_lignes (b6_28) au nom de l'utilisateur : chaque ligne passe par btp_ecrire_ligne.
--   · Lecture par cette porte (SECURITY DEFINER, bureau), pour ne pas dépendre de la politique des pièces sur un
--     objet « btp_marche ».
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_deposer_devis(p_marche uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text, p_chemin text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  v_nom text := nullif(btrim(p_nom_fichier), '');
  v_id uuid;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if m.statut <> 'a_verifier' then
    raise exception 'Le devis se lit sur un marché à vérifier : rouvrez-le d''abord.' using errcode = '23514';
  end if;
  if v_nom is null or char_length(v_nom) > 200 then
    raise exception 'Le nom du fichier est obligatoire (200 caractères au plus).' using errcode = '22023';
  end if;
  if p_mime is distinct from 'application/pdf' then
    raise exception 'Le devis se dépose en PDF (pour un tableur, collez-le ou exportez-le en CSV).' using errcode = '22023';
  end if;
  if p_octets is null or p_octets <= 0 or p_octets > 50 * 1024 * 1024 then
    raise exception 'Le fichier doit faire entre 1 octet et 50 Mo.' using errcode = '22023';
  end if;
  if p_sha256 !~* '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte SHA-256 du fichier est attendue (64 caractères hexadécimaux).' using errcode = '22023';
  end if;
  if p_chemin is null or p_chemin !~ ('^' || m.client_id::text || '/btp_marche/' || m.id::text || '/[^/]{1,200}$') then
    raise exception 'Le fichier se dépose sous <organisation>/btp_marche/<marché>/<nom>.' using errcode = '22023';
  end if;
  begin
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256, chemin,
                               statut, type_piece)
    values (m.client_id, 'daliro', 'btp_marche', m.id::text, 'depot', (select auth.uid()), v_nom, p_mime, p_octets,
            lower(p_sha256), p_chemin, 'recue', 'daliro_devis')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ce devis est déjà déposé sur ce marché (même empreinte).' using errcode = '23505';
  end;
  perform private.journaliser(m.client_id, 'daliro.devis_depose', 'btp_marches', m.id::text,
    jsonb_build_object('piece', v_id, 'nom', v_nom, 'octets', p_octets), m.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_devis_lu(p_marche uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  p record;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  select x.id, x.nom_fichier, x.statut, x.type_piece, x.cree_le into p
  from public.pieces x
  where x.client_id = m.client_id and x.module = 'daliro' and x.objet_type = 'btp_marche' and x.objet_id = m.id::text
  order by x.cree_le desc limit 1;
  if p.id is null then
    return jsonb_build_object('piece', null);
  end if;
  return jsonb_build_object(
    'piece', p.id, 'nom', p.nom_fichier, 'statut', p.statut, 'type_piece', p.type_piece, 'depose_le', p.cree_le,
    'lignes', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'lignes_verifiees', (select v.verifiee from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'montant_total_ht', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'montant_total_ht' order by v.cree_le desc limit 1),
    'numero', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'numero' order by v.cree_le desc limit 1));
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) from public, anon;
grant execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) to authenticated, service_role;
revoke execute on function public.btp_devis_lu(uuid) from public, anon;
grant execute on function public.btp_devis_lu(uuid) to authenticated, service_role;
