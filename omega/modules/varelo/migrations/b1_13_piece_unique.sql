-- b1_13 — VARELO : une pièce, une livraison (06/10/2026, B1, demande d'A1)
--
-- CE QUE ÇA CORRIGE : le lecteur v27 d'A1 (6f57d5e) lit le bon de livraison Varelo, déposé sur l'objet
-- grp_societes/<entité>, et pré-remplit la livraison par private.grp_enregistrer_reception avec son piece_id. Une
-- même pièce relue (nouvelle version du lecteur, reprise après échec) créait une seconde livraison, donc une
-- seconde alerte et une seconde ligne au point du matin.
--
-- CE QUE ÇA POSE (après b1_11) :
--   · l'index unique grp_receptions_piece_key (client_id, piece_id) — les livraisons saisies à la main (piece_id
--     nul) ne sont pas concernées ;
--   · private.grp_enregistrer_reception (remplace celle de b1_11) : une pièce d'une autre organisation est refusée
--     (22023) ; une pièce déjà enregistrée rend la livraison existante avec 'deja' = true, sans rien écrire ni
--     journaliser ; deux lectures simultanées butent sur l'index et rendent la même livraison.
--
-- Règles de pose : create unique index if not exists ; create or replace ; aucune suppression. L'index échoue s'il
-- existe déjà deux livraisons pour une même pièce : contrôle à la fin.

create unique index if not exists grp_receptions_piece_key on public.grp_receptions (client_id, piece_id);

create or replace function private.grp_enregistrer_reception(p_client uuid, p_entite uuid, p_champs jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_objet public.grp_ref_objets;
  v_date date;
  v_mode text := coalesce(nullif(f ->> 'mode', ''), 'routier');
  v_territoire text;
  v_calcul jsonb;
  v_avarie boolean;
  v_manquant boolean;
  v_id uuid;
  v_statut text;
  v_piece uuid;
  v_deja public.grp_receptions;
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Une livraison s''enregistre par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, p_entite) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les champs d''une livraison se donnent en objet JSON.' using errcode = '22023';
  end if;
  begin
    v_date := coalesce(nullif(f ->> 'date_reception', '')::date, current_date);
    v_avarie := coalesce((f ->> 'avarie')::boolean, false);
    v_manquant := coalesce((f ->> 'manquant')::boolean, false);
  exception when others then
    raise exception 'Livraison refusée : une date ou une case est illisible (dates au format AAAA-MM-JJ).' using errcode = '22023';
  end;
  begin
    v_piece := nullif(f ->> 'piece_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Identifiant de pièce illisible.' using errcode = '22023';
  end;
  if v_piece is not null then
    if not exists (select 1 from public.pieces p where p.id = v_piece and p.client_id = p_client) then
      raise exception 'La pièce donnée n''est pas une pièce de cette organisation.' using errcode = '22023';
    end if;
    -- une pièce relue (lecteur v27, A1) rend la livraison déjà enregistrée, sans en créer une seconde
    select * into v_deja from public.grp_receptions r where r.client_id = p_client and r.piece_id = v_piece;
    if v_deja.id is not null then
      return jsonb_build_object('reception', v_deja.id, 'statut', v_deja.statut, 'echeance', v_deja.echeance,
                                'detail', v_deja.calcul ->> 'detail', 'territoire', v_deja.territoire, 'deja', true);
    end if;
  end if;
  if v_date > current_date then
    raise exception 'Une livraison se reçoit aujourd''hui ou avant.' using errcode = '22023';
  end if;
  if v_mode not in ('routier', 'cmr', 'maritime', 'aerien') then
    raise exception 'Mode de transport : routier, cmr, maritime ou aerien (%).', v_mode using errcode = '22023';
  end if;
  if nullif(f ->> 'objet_id', '') is not null then
    begin
      select * into v_objet from public.grp_ref_objets o where o.id = (f ->> 'objet_id')::uuid and o.client_id = p_client;
    exception when invalid_text_representation then
      raise exception 'Identifiant d''objet illisible.' using errcode = '22023';
    end;
    if v_objet.id is null or v_objet.nature <> 'fournisseur' or v_objet.statut <> 'actif' then
      raise exception 'L''expéditeur pris au référentiel est un fournisseur actif du groupe.' using errcode = '22023';
    end if;
  end if;
  v_territoire := coalesce(public.territoire_de_entite(p_client, p_entite), 'metropole');
  v_calcul := public.echeance_de('varelo.reserves.' || v_mode, v_date, v_territoire);
  v_statut := case when v_avarie or v_manquant then 'a_examiner' else 'sans_suite' end;
  perform set_config('omega.module', 'varelo', true);
  begin
    insert into public.grp_receptions (client_id, entite_id, date_reception, mode, transporteur, document_transport, nature, objet_id,
      expediteur, colis_attendus, colis_recus, avarie, manquant, constat, reserves_sur_bon, montant_estime, piece_id, territoire,
      regle_code, echeance, calcul, statut, motif, cree_par)
    values (p_client, p_entite, v_date, v_mode, btrim(coalesce(f ->> 'transporteur', '')), left(nullif(btrim(f ->> 'document_transport'), ''), 80),
      v_objet.nature, v_objet.id, left(nullif(btrim(f ->> 'expediteur'), ''), 200),
      nullif(f ->> 'colis_attendus', '')::integer, nullif(f ->> 'colis_recus', '')::integer, v_avarie, v_manquant,
      nullif(btrim(f ->> 'constat'), ''), nullif(btrim(f ->> 'reserves_sur_bon'), ''), round(nullif(f ->> 'montant_estime', '')::numeric, 2),
      v_piece, v_territoire, 'varelo.reserves.' || v_mode, (v_calcul ->> 'echeance')::date, v_calcul, v_statut,
      case when v_statut = 'sans_suite' then 'livraison conforme : ni avarie ni manquant' end, v_uid)
    returning id into v_id;
  exception
    when unique_violation then
      -- deux lectures simultanées de la même pièce : la première a gagné
      select * into v_deja from public.grp_receptions r where r.client_id = p_client and r.piece_id = v_piece;
      return jsonb_build_object('reception', v_deja.id, 'statut', v_deja.statut, 'echeance', v_deja.echeance,
                                'detail', v_deja.calcul ->> 'detail', 'territoire', v_deja.territoire, 'deja', true);
    when check_violation then
      raise exception 'Livraison refusée : %', case
        when sqlerrm like '%transporteur%' then 'le transporteur est nommé (1 à 200 caractères).'
        when sqlerrm like '%dommage_decrit%' then 'une avarie ou un manquant se décrit (le constat).'
        when sqlerrm like '%colis%' then 'des nombres de colis positifs.'
        when sqlerrm like '%montant%' then 'un montant estimé positif.'
        else sqlerrm end using errcode = '22023';
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Livraison refusée : un nombre est illisible.' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.reception.enregistree', 'grp_receptions', v_id::text,
    jsonb_build_object('date_reception', v_date, 'mode', v_mode, 'transporteur', btrim(f ->> 'transporteur'), 'avarie', v_avarie,
                       'manquant', v_manquant, 'echeance', v_calcul ->> 'echeance', 'regle', 'varelo.reserves.' || v_mode, 'statut', v_statut), p_entite);
  perform private.grp_controler_reserves(p_client);
  return jsonb_build_object('reception', v_id, 'statut', v_statut, 'echeance', v_calcul ->> 'echeance', 'detail', v_calcul ->> 'detail',
                            'territoire', v_territoire, 'deja', false);
end $function$;

-- Contrôle : 0 attendu (aucune pièce portée par deux livraisons).
select count(*) as pieces_en_double
from (select client_id, piece_id from public.grp_receptions where piece_id is not null group by 1, 2 having count(*) > 1) d;
