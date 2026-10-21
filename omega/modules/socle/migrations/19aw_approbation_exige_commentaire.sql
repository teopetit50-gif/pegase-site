-- 19aw_approbation_exige_commentaire.sql — une demande qui exige un commentaire ne s'approuve pas sans commentaire
-- (A5, 21/10/2026, TCASHD-07). Avant : demandes_validation.exige_commentaire = true était posé par preparer_demande
-- (règle de validation ou payload.exigences.commentaire), mais une approbation « approuve » sans commentaire passait
-- et la demande devenait « approuvee ».
--
-- Ce lot ajoute un déclencheur BEFORE INSERT sur public.approbations, nommé pour passer APRÈS approbations_preparer
-- (ordre alphabétique) : le repère « [seul décideur] » posé par 19af/19av ne compte pas comme commentaire.
-- Refus : 23514, en français. Le rejet n'est pas concerné (exige_motif le règle déjà).
-- Rien n'est supprimé, aucune ligne réécrite. Rejouable.

create or replace function private.approbation_exiger_commentaire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.decision = 'approuve'
     and exists (select 1 from public.demandes_validation d where d.id = new.demande_id and d.exige_commentaire)
     and btrim(regexp_replace(coalesce(new.commentaire, ''), '^\[seul décideur\]', '')) = '' then
    raise exception 'Cette demande exige un commentaire : dites en une phrase pourquoi vous l''approuvez.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.approbation_exiger_commentaire() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.approbations'::regclass and tgname = 'approbations_zz_exiger_commentaire') then
    create trigger approbations_zz_exiger_commentaire before insert on public.approbations
      for each row execute function private.approbation_exiger_commentaire();
  end if;
end $do$;
