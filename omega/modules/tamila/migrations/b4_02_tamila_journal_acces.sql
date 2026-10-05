-- b4_02 — Tamila : le journal des accès d'un dossier, lisible et exportable (session B4, 05/10/2026).
--
-- CE QUE ÇA CORRIGE. La vitrine (app/secteurs/avocats, « Chaque accès est journalisé ») promet :
-- « Le journal indique qui a consulté quel dossier, et à quelle date. Vous pouvez l'exporter à tout
-- moment. » Le socle trace bien chaque lecture (private.tracer_lecture → public.lectures, appelé par
-- tamila_consulter et par le téléchargement d'un export), mais aucune porte publique ne rend ces
-- lectures à un cabinet : public.lectures n'a pas de politique de lecture pour les membres, et il ne
-- doit pas en avoir (la table est commune à tous les modules).
--
-- CE QUE ÇA POSE. Une porte de lecture, public.tamila_journal_acces(p_dossier, p_depuis), qui rend
-- les lectures du dossier (qui, quand, dans quel contexte) à qui GÈRE le dossier : son responsable,
-- le titulaire d'une clientèle personnelle, ou un associé qui le voit (private.tamila_gere_dossier_pour).
-- Un intervenant ou un lecteur ne lit pas le journal des autres. Lire le journal est tracé à son tour
-- (contexte « journal »), pour que la relecture d'un accès soit elle-même un accès.
-- Rien n'est effacé, rien n'est modifié : create or replace seulement.

create or replace function private.tamila_journal_acces(p_dossier uuid, p_depuis date default null)
returns table(user_id uuid, lu_le timestamptz, contexte text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  if v_uid is null then
    raise exception 'Le journal des accès se lit par une personne connectée.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if not (private.tamila_gere_dossier_pour(v_uid, p_dossier)
          or (v_d.statut in ('clos', 'efface') and private.a_un_role(v_d.client_id, array['gerant', 'admin']))) then
    raise exception 'Le journal des accès revient au responsable du dossier et aux associés.' using errcode = '42501';
  end if;
  perform private.tracer_lecture(v_d.client_id, 'tamila_dossier', p_dossier::text, 'journal');
  return query
    select l.user_id, l.lu_le, l.contexte
    from public.lectures l
    where l.client_id = v_d.client_id and l.objet_type = 'tamila_dossier' and l.objet_id = p_dossier::text
      and (p_depuis is null or l.lu_le >= p_depuis)
    order by l.lu_le desc
    limit 2000;
end $function$;

create or replace function public.tamila_journal_acces(p_dossier uuid, p_depuis date default null)
returns table(user_id uuid, lu_le timestamptz, contexte text)
language sql
set search_path to ''
as $function$ select * from private.tamila_journal_acces(p_dossier, p_depuis) $function$;

comment on function public.tamila_journal_acces(uuid, date) is
  'Tamila (B4) : les lectures d''un dossier (qui, quand, contexte), pour son responsable et les associés. Exportable par l''écran.';

grant execute on function public.tamila_journal_acces(uuid, date) to authenticated;
grant execute on function private.tamila_journal_acces(uuid, date) to authenticated;
revoke execute on function public.tamila_journal_acces(uuid, date) from anon;
