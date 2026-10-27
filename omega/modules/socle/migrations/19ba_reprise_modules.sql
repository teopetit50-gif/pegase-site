-- SOCLE, lot 19ba — la reprise après refus ne vaut que pour les modules qui savent reprendre (décision D3, 26/10/2026).
-- Copie du dépôt omega-metiers (socle/base/), où ce lot a été écrit et testé, 27/10/2026.
-- plan/CONVERGENCE-BASES.md, étape 2d ; risque R1.
--
-- Pourquoi : le lot 19az (25/10) pose un déclencheur sur public.approbations (approbations_zz_reprise) qui, à chaque
-- refus, inscrit une reprise « à faire » dans private.reprises, quel que soit le module. Seuls FILED, CASHD, REPUT et
-- OFFLOAD ont un ouvrier qui les traite (filed_traiter_reprises, cashd_…, reput_…, offload_…). Un avenant Daliro refusé,
-- une demande Tamila, Lorani, Varelo ou Tavaro refusée laissaient donc une reprise « à faire » que personne ne traite.
-- Daliro a déjà son propre chemin après un refus (b6_72 : l'avenant passe « refusé », le bureau corrige et resoumet).
--
-- Ce qui est posé ici :
--   · private.modules_reprise : la liste des modules qui reprennent après un refus (filed, cashd, reput, offload).
--     Un logiciel y entre par un lot, le jour où il a un consommateur de private.reprises_a_faire ;
--   · private.reprise_deposer() : le corps de 19az, plus une seule condition : le module de la demande est dans la liste ;
--   · les reprises « à faire » d'un module hors liste (il n'y en a aucune le 26/10 sur la recette des modules) passent
--     « impossible », motif « module sans reprise (D3) ». Aucune ligne n'est retirée.
-- Rejouable. Rien n'est retiré.

create table if not exists private.modules_reprise (
  module text primary key,
  note text,
  cree_le timestamptz not null default now()
);
revoke all on table private.modules_reprise from public, anon, authenticated;
grant select on table private.modules_reprise to service_role;

insert into private.modules_reprise (module, note) values
  ('filed',   'reprise après refus : filed_traiter_reprises (a4_86)'),
  ('cashd',   'reprise après refus : cashd_traiter_reprises (c2_41)'),
  ('reput',   'reprise après refus : reput_traiter_reprises (c3_44)'),
  ('offload', 'reprise après refus : offload_traiter_reprises (c4_37)')
on conflict (module) do nothing;

CREATE OR REPLACE FUNCTION private.reprise_deposer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.demandes_validation;
begin
  if new.decision <> 'rejete' then return null; end if;
  select * into d from public.demandes_validation x where x.id = new.demande_id;
  if d.id is null or d.statut <> 'rejetee' then return null; end if;
  if d.payload ? 'reprise_de' then return null; end if;   -- une reprise refusée revient au demandeur : pas de boucle
  -- 19ba (D3) : seuls les modules qui savent reprendre reçoivent une reprise
  if not exists (select 1 from private.modules_reprise m where m.module = d.module) then return null; end if;
  insert into private.reprises (demande_id, client_id, module, consigne)
  values (d.id, d.client_id, d.module, jsonb_strip_nulls(jsonb_build_object(
            'motif', nullif(btrim(to_jsonb(new) ->> 'motif'), ''),
            'commentaire', nullif(btrim(regexp_replace(coalesce(new.commentaire, ''), '^\[seul décideur\]', '')), ''),
            'piece_id', to_jsonb(new) ->> 'piece_id',
            'refuse_par', new.user_id, 'refuse_le', coalesce(new.decide_le, now()))))
  on conflict (demande_id) do nothing;
  return null;
end $function$;
revoke execute on function private.reprise_deposer() from public, anon, authenticated;

update private.reprises r set statut = 'impossible', motif = 'module sans reprise (D3)', traite_le = now()
where r.statut = 'a_faire' and not exists (select 1 from private.modules_reprise m where m.module = r.module);

-- Contrôle : le corps posé porte la condition (une pose sans erreur n'a pas forcément changé le corps).
do $$
begin
  if position('private.modules_reprise' in (select p.prosrc from pg_proc p where p.oid = 'private.reprise_deposer()'::regprocedure)) = 0 then
    raise exception 'socle 19ba : private.reprise_deposer ne lit pas private.modules_reprise.';
  end if;
  if (select count(*) from private.modules_reprise where module in ('filed', 'cashd', 'reput', 'offload')) <> 4 then
    raise exception 'socle 19ba : les quatre modules qui reprennent ne sont pas inscrits.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'approbations_zz_reprise'
                 and tgfoid = 'private.reprise_deposer()'::regprocedure) then
    raise exception 'socle 19ba : le déclencheur approbations_zz_reprise (19az) manque.';
  end if;
end $$;
