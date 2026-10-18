-- b4_20 — Tamila : la clé d'un dossier au coffre, rendue au lecteur pour une lecture longue (session B4, 18/10/2026).
-- À poser APRÈS b4_05 et b4_15.
--
-- POURQUOI. La porte tamila_coffre_pour_lecteur (b4_05) ne rend la clé que pour une pièce « à lire » (reçue ou en
-- lecture). Or une lecture longue (lecteur.analyser, A1) porte sur des pièces DÉJÀ lues : le lecteur demande la clé
-- du dossier par l'une d'elles (cle_piece), relit les pages chiffrées et rechiffre le résultat. Sans ce lot, toute
-- analyse d'un dossier au coffre échoue à la clé (55000 « Cette pièce n'est pas à lire (lue) »).
--
-- CE QUE ÇA POSE. private.tamila_coffre_pour_lecteur remplacée : corps de b4_05 ; une pièce lue ou à vérifier rend
-- aussi sa clé si une analyse Tamila de son dossier, demandée ou en cours, la compte parmi ses pièces (l'identifiant
-- de l'analyse est rendu et la remise journalisée comme toute remise au lecteur). Rien d'autre ne change : serveur
-- seul, pièce chiffrée d'un dossier vivant, clé active. Signature et droits inchangés. Rien n'est retiré ni effacé.

create or replace function private.tamila_coffre_pour_lecteur(p_piece uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_p public.pieces;
  v_d public.tamila_dossiers;
  v_k public.tamila_cles;
  v_journal bigint;
  v_analyse uuid;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Le lecteur passe par le serveur.' using errcode = '42501';
  end if;
  select * into v_p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if v_p.module <> 'tamila' or v_p.objet_type is distinct from 'tamila_dossier' or v_p.chiffrement is distinct from 'dossier:v1' then
    raise exception 'Le coffre ne sert que les pièces chiffrées des dossiers Tamila.' using errcode = '22023';
  end if;
  if v_p.statut not in ('recue', 'en_lecture') then
    -- b4_20 : une pièce déjà lue rouvre sa clé au lecteur tant qu'une lecture longue qui la couvre est en attente
    -- ou en cours (le lecteur relit les pages chiffrées et rechiffre le résultat sous la même clé).
    if v_p.statut in ('lue', 'a_verifier') and to_regclass('public.analyses') is not null then
      execute 'select a.id from public.analyses a where a.client_id = $1 and a.module = ''tamila''
                 and a.objet_type = ''tamila_dossier'' and a.objet_id = $2 and a.statut in (''demandee'', ''en_cours'')
                 and $3 = any(a.pieces) order by a.demandee_le desc limit 1'
        into v_analyse using v_p.client_id, v_p.objet_id, p_piece;
    end if;
    if v_analyse is null then
      raise exception 'Cette pièce n''est pas à lire (%).', v_p.statut using errcode = '55000';
    end if;
  end if;
  select * into v_d from public.tamila_dossiers where id = private.tamila_uuid(v_p.objet_id) and client_id = v_p.client_id;
  if not found or v_d.statut not in ('ouvert', 'audit') then
    raise exception 'Le dossier de cette pièce n''est pas ouvert.' using errcode = '55000';
  end if;
  select * into v_k from public.tamila_cles k where k.dossier_id = v_d.id and k.statut = 'active';
  if not found then
    raise exception 'Le dossier n''a plus de clé active.' using errcode = '55000';
  end if;
  if v_k.fournisseur = 'local' then
    return jsonb_build_object('piece', p_piece, 'dossier', v_d.id, 'fournisseur', 'local');
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, piece_id, pour)
  values (v_d.client_id, v_d.id, p_piece, 'lecteur')
  returning id into v_journal;
  return jsonb_build_object('piece', p_piece, 'dossier', v_d.id, 'fournisseur', 'scaleway', 'journal', v_journal,
                            'reference', v_k.reference, 'enveloppe', encode(v_k.enveloppe, 'hex'), 'analyse', v_analyse);
end $function$;

revoke execute on function private.tamila_coffre_pour_lecteur(uuid) from public;
grant execute on function private.tamila_coffre_pour_lecteur(uuid) to service_role;
