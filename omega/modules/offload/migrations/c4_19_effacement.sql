-- c4_19 — OFFLOAD : l'effacement des données d'une personne (session C4, 19/10/2026)
--
-- Liste de Teo, point 9 : « restitution et effacement ». La restitution est c4_17. L'effacement de TOUTE
-- l'organisation relève du socle (preparer_effacement, puis la suppression du client) : chaque table d'OFFLOAD y est
-- reliée par client_id … on delete cascade, et le test c4_19 le vérifie sur le catalogue.
-- Ici, la demande d'une PERSONNE (un entrepreneur individuel, un interlocuteur) : « effacez mes données ».
--   · public.offload_effacer_compte(p_compte, p_motif) — gérant ou admin. Le compte garde son historique d'achats
--     (pièces comptables du client, chiffres sans nom) ; ses données personnelles sont rendues anonymes : nom,
--     interlocuteur, courriel, téléphone, ville ; les notes de contact et le détail des tâches sont vidés. Le compte
--     sort du cycle (statut « arrete ») et ses messages encore à valider ou prêts sont annulés.
--   · Un import ou une saisie qui retrouverait la même référence ne réécrit plus rien : un déclencheur garde le
--     compte effacé tel quel (offload_comptes.efface_le).
--   · L'effacement est au journal, sans les données effacées.
--
-- Règles de pose : alter … add column if not exists, create or replace. Aucun DROP, aucun DELETE : effacer, ici,
-- c'est rendre anonyme.

alter table public.offload_comptes add column if not exists efface_le timestamptz;
comment on column public.offload_comptes.efface_le is 'OFFLOAD — données personnelles effacées à la demande de la personne (c4_19) ; le compte ne se réécrit plus.';

-- Un compte effacé ne se remplit plus, quelle que soit la porte (import, saisie, fusion).
create or replace function private.offload_garder_efface()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if old.efface_le is not null then
    new.nom := old.nom;
    new.contact := null;
    new.email := null;
    new.telephone := null;
    new.ville := null;
    new.groupe := null;
    new.statut := 'arrete';
    new.statut_motif := old.statut_motif;
    new.efface_le := old.efface_le;
  end if;
  return new;
end $function$;
revoke execute on function private.offload_garder_efface() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'offload_comptes_garder_efface' and tgrelid = 'public.offload_comptes'::regclass) then
    create trigger offload_comptes_garder_efface before update on public.offload_comptes
      for each row execute function private.offload_garder_efface();
  end if;
end $$;

create or replace function private.offload_effacer_compte(p_compte uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
  v_envois integer := 0;
  r record;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if c.id is null then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'effacer les données d''une personne');
  if v_motif is null then
    raise exception 'Dites d''où vient la demande d''effacement (courrier, message, appel…).' using errcode = '22023';
  end if;
  if c.efface_le is not null then
    return jsonb_build_object('compte', c.id, 'efface_le', c.efface_le, 'deja', true);
  end if;

  -- Les messages qui n'ont pas encore quitté le circuit : annulés.
  for r in
    select e.id from public.envois e
    where e.client_id = c.client_id and e.module = 'offload' and e.statut in ('a_valider', 'pret')
      and ((e.objet_type = 'offload_reprises' and e.objet_id in (select x.id::text from public.offload_reprises x where x.compte_id = c.id))
        or (e.objet_type = 'offload_echeances' and e.objet_id in (select x.id::text from public.offload_echeances x where x.compte_id = c.id))
        or (e.objet_type = 'offload_affaires' and e.objet_id in (select x.id::text from public.offload_affaires x where x.compte_id = c.id)))
  loop
    perform private.annuler_envoi(r.id, 'Données de la personne effacées à sa demande.');
    v_envois := v_envois + 1;
  end loop;

  update public.offload_comptes
     set nom = 'Compte effacé (réf. ' || c.ref || ')', contact = null, email = null, telephone = null, ville = null, groupe = null,
         statut = 'arrete', statut_motif = 'Données personnelles effacées à la demande de la personne.',
         statut_par = (select auth.uid()), statut_le = now(), efface_le = now(), maj_le = now()
   where id = c.id;
  update public.offload_contacts set note = null, par = null where compte_id = c.id;
  update public.offload_taches
     set titre = 'Tâche d''un compte effacé', detail = 'Effacé à la demande de la personne.', compte_rendu = null, maj_le = now()
   where compte_id = c.id;

  perform private.journaliser_module(c.client_id, 'offload', 'offload.compte_efface', 'offload_comptes', c.id::text,
    jsonb_build_object('ref', c.ref, 'motif', left(v_motif, 500), 'envois_annules', v_envois), c.entite_id);
  return jsonb_build_object('compte', c.id, 'efface_le', now(), 'envois_annules', v_envois, 'deja', false);
end $function$;

create or replace function public.offload_effacer_compte(p_compte uuid, p_motif text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_effacer_compte(p_compte, p_motif) $function$;

revoke execute on function private.offload_effacer_compte(uuid, text) from public, anon;
grant execute on function private.offload_effacer_compte(uuid, text) to authenticated, service_role;
revoke execute on function public.offload_effacer_compte(uuid, text) from public, anon;
grant execute on function public.offload_effacer_compte(uuid, text) to authenticated, service_role;
