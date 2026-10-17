-- b4_19 — Tamila : demander le relevé des pièces citées (session B4, 17/10/2026). À poser APRÈS b4_15.
--
-- POURQUOI. Teo a dit oui (17/10) au relevé d'office des pièces que les écritures adverses invoquent ; A1 construit
-- le type tamila.pieces_citees au lecteur. La porte de b4_15 ne connaît que quatre types : elle apprend le cinquième.
-- Format attendu du résultat (proposé à A1) : constats de code piece_citee, données { numero?, intitule, citee_par
-- (adverse | client | juge | expert | tiers), citee_dans (id de la pièce qui la cite), communiquee (booléen : retrouvée
-- parmi les pièces du dossier), piece? (id de la pièce retrouvée) }. L'écran propose de réclamer au confrère, en
-- pièce attendue (b4_18), chaque pièce non communiquée.
--
-- CE QUE ÇA POSE. private.tamila_demander_analyse remplacée : corps de b4_15, la liste des types gagne
-- pieces_citees (200 pièces au plus, comme les autres). Signature, droits et politiques inchangés. Si le socle (19an)
-- tient lui aussi une liste de types, A1 y ajoute tamila.pieces_citees. Rien n'est retiré ni effacé.

create or replace function private.tamila_demander_analyse(p_dossier uuid, p_type text, p_pieces uuid[] default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_type text;
  v_pieces uuid[];
  v_max integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Une analyse se demande par un avocat du dossier.' using errcode = '42501';
  end if;
  if to_regclass('public.analyses') is null then
    raise exception 'Les analyses ne sont pas encore installées sur cette base.' using errcode = '55000';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, true);
  if p_type is null or p_type not in ('prelecture', 'chronologie', 'contradictions', 'bordereau', 'pieces_citees') then
    raise exception 'Type d''analyse inconnu : %.', coalesce(p_type, 'vide') using errcode = '22023';
  end if;
  v_type := 'tamila.' || p_type;
  if not exists (select 1 from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active' and k.fournisseur = 'scaleway') then
    raise exception 'La clé de ce dossier est sous la phrase du cabinet : le serveur ne peut ni lire ni chiffrer l''analyse. Passez le cabinet au coffre.'
      using errcode = '55000';
  end if;

  if p_pieces is null then
    select coalesce(array_agg(p.id order by p.recue_le), '{}') into v_pieces from public.pieces p
     where p.client_id = v_d.client_id and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text
       and p.chiffrement = 'dossier:v1' and p.statut in ('lue', 'a_verifier');
  else
    if exists (select 1 from unnest(p_pieces) x(id) where not exists (
                 select 1 from public.pieces p where p.id = x.id and p.client_id = v_d.client_id
                    and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text)) then
      raise exception 'Une pièce demandée n''est pas de ce dossier.' using errcode = '22023';
    end if;
    select coalesce(array_agg(distinct x), '{}') into v_pieces from unnest(p_pieces) x;
  end if;
  if cardinality(v_pieces) = 0 then
    raise exception 'Aucune pièce lue dans ce dossier : l''analyse attend que le lecteur ait lu les pièces.' using errcode = '55000';
  end if;
  v_max := case when p_type = 'prelecture' then 60 else 200 end;
  if cardinality(v_pieces) > v_max then
    raise exception 'Au plus % pièces pour ce type d''analyse (% demandées) : choisissez-les.', v_max, cardinality(v_pieces)
      using errcode = '22023';
  end if;

  execute 'select a.id from public.analyses a where a.client_id = $1 and a.module = ''tamila'' and a.objet_type = ''tamila_dossier''
             and a.objet_id = $2 and a.type = $3 and a.statut in (''demandee'', ''en_cours'') order by a.demandee_le desc limit 1'
    into v_id using v_d.client_id, p_dossier::text, v_type;
  if v_id is not null then
    return v_id;
  end if;

  execute 'select private.demander_analyse($1, ''tamila'', ''tamila_dossier'', $2, $3, $4, ''dossier:v1'', $5)'
    into v_id using v_d.client_id, p_dossier::text, v_type, v_pieces, v_uid;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.analyse.demandee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('analyse', v_id, 'type', v_type, 'pieces', cardinality(v_pieces), 'par', v_uid));
  return v_id;
end $function$;

revoke execute on function private.tamila_demander_analyse(uuid, text, uuid[]) from public;
grant execute on function private.tamila_demander_analyse(uuid, text, uuid[]) to authenticated;
