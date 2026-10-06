-- b4_04 — Tamila : la clé d'idempotence d'une demande de clôture ne se répète plus (session B4, 06/10/2026).
--
-- CE QUE ÇA CORRIGE (relevé par le coordinateur sur la recette, test 09) : private.tamila_demander_cloture
-- fabrique la clé « tamila:cloture:<dossier>:<epoch en secondes> ». Si la première demande est décidée dans
-- la seconde (un gérant qui demande puis approuve), une seconde demande de clôture du même dossier — après
-- une annulation de clôture, par exemple — porte la MÊME clé et meurt sur demandes_validation_idempotence
-- (23505). La porte ne rend la demande existante que si elle est encore en attente.
--
-- CE QUE ÇA POSE. La même fonction, avec une clé au microseconde (clock_timestamp) : deux demandes dans la
-- même seconde ne se confondent plus. Le reste (qui demande, demande en attente rendue telle quelle,
-- exécution immédiate) ne change pas. Create or replace seulement.

create or replace function private.tamila_demander_cloture(p_dossier uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_demande uuid;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_d.statut not in ('ouvert', 'audit') then
    raise exception 'Ce dossier n''est pas ouvert.' using errcode = '55000';
  end if;
  if not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'Seul le responsable du dossier, ou un associé, en demande la clôture.' using errcode = '42501';
  end if;
  select d.id into v_demande from public.demandes_validation d
   where d.client_id = v_d.client_id and d.module = 'tamila' and d.type_action = 'cloturer_dossier'
     and d.objet_id = p_dossier::text and d.statut = 'en_attente';
  if v_demande is not null then
    return v_demande;
  end if;
  v_demande := private.tamila_deposer_demande_systeme(v_d.client_id, v_d.entite_id, 'cloturer_dossier', p_dossier,
    'Clôture d''un dossier et effacement de son contenu',
    jsonb_build_object('dossier_id', p_dossier, 'initiateur', v_uid),
    'tamila:cloture:' || p_dossier::text || ':' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSUS'));
  perform private.tamila_executer_demande(v_demande);
  return v_demande;
end $function$;
