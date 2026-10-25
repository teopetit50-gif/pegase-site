-- 20261025151701 a4_86_filed_lot78_reprise_apres_refus
-- Source : dépôt : 6470f895b11da3219501f4f3e5cbbe47181139d7 omega/migrations/a4_86_filed_lot78_reprise_apres_refus.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_86_filed_lot78_reprise_apres_refus.sql @ 6470f895b11da3219501f4f3e5cbbe47181139d7 ; fichiers de tests ignorés : omega/tests/filed/a4_74_reprise_apres_refus.sql.
-- ═══ omega/migrations/a4_86_filed_lot78_reprise_apres_refus.sql @ 6470f895b11da3219501f4f3e5cbbe47181139d7
-- a4_86 (FILED lot 78) : le module FILED de la reprise après refus (décision de Teo du 23/10, 15 h 05 Z ; socle 19az d'A5).
--
-- À poser APRÈS le socle 19az (private.reprises, reprises_a_faire, proposer_reprise, reprise_impossible). Une facture
-- refusée avec un motif ou un commentaire est reprise par FILED, au plus une fois, et jamais exécutée sans une nouvelle
-- validation humaine.
--
--   · Au refus (déclencheur après insertion sur private.reprises, module filed) : un instantané de la facture refusée
--     (numéro, dates, montants, IBAN masqué, fournisseur, SIREN et TVA lus, ventilation de la TVA) dans
--     private.filed_reprises.
--   · Le cron de FILED (private.filed_traiter, avant la preuve de vie) appelle private.filed_traiter_reprises() :
--       - une demande qui n'est pas la validation d'une facture → reprise_impossible ;
--       - motif « Doublon » ou « Hors budget ou hors période » → reprise_impossible tout de suite : une correction de
--         la pièce n'y répond pas, la demande revient au demandeur ;
--       - la facture a changé depuis le refus (pièce corrigée par une personne ; relecture, quand le lecteur saura
--         relire avec la consigne) → recontrôle ; sans bloquant : proposer_reprise, avec les corrections
--         {champ, avant, apres}, au nom du moteur ; la facture repasse « à valider » et la nouvelle demande lui est
--         liée (filed_validations) ; avec un bloquant : reprise_impossible, en disant lequel ;
--       - rien n'a changé : la reprise attend, au plus p_delai (24 h par défaut), puis reprise_impossible « aucune
--         correction ».
--   · Ce lot ne relit pas la pièce lui-même : la relecture avec la consigne est une porte du lecteur (A1), à brancher ici.
-- Repère dans private.filed_traiter (avant la preuve de vie) ; la pose s'arrête s'il n'est pas trouvé une fois.
-- Rejouable ; aucune suppression.

create table if not exists private.filed_reprises (
  demande_id uuid primary key references public.demandes_validation(id) on delete cascade,
  client_id  uuid not null,
  facture_id uuid not null references public.filed_factures(id) on delete cascade,
  version    integer not null,
  instantane jsonb not null,
  cree_le    timestamptz not null default now()
);
comment on table private.filed_reprises is 'a4_86 : l''instantané d''une facture au moment de son refus, pour dire ce qu''une reprise corrige.';
revoke all on table private.filed_reprises from public, anon, authenticated;
grant select on table private.filed_reprises to service_role;

-- Ce que la reprise compare : les champs qu'un valideur regarde.
create or replace function private.filed_instantane(p_facture uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'numero', f.numero, 'date_emission', f.date_emission, 'echeance', f.echeance_lue,
    'montant_ht', f.montant_ht, 'montant_tva', f.montant_tva, 'montant_ttc', f.montant_ttc, 'net_a_payer', f.net_a_payer,
    'iban', case when f.iban is not null then private.filed_masquer_iban(f.iban) end,
    'fournisseur', (select x.nom from public.filed_fournisseurs x where x.id = f.fournisseur_id),
    'siren', nullif(f.fournisseur_lu ->> 'siren', ''), 'tva', nullif(f.fournisseur_lu ->> 'tva', ''),
    'ventilation', (select coalesce(jsonb_agg(jsonb_build_object('taux', t.taux, 'base', t.base, 'montant', t.montant) order by t.taux, t.base), '[]'::jsonb)
                      from public.filed_factures_tva t where t.facture_id = f.id))
  from public.filed_factures f where f.id = p_facture
$$;

create or replace function private.filed_reprise_instantane() returns trigger
language plpgsql security definer set search_path to '' as $$
declare d public.demandes_validation; f public.filed_factures;
begin
  if new.module <> 'filed' then return null; end if;
  select * into d from public.demandes_validation x where x.id = new.demande_id;
  if d.objet_type <> 'filed_facture' then return null; end if;
  select * into f from public.filed_factures x where x.id::text = d.objet_id;
  if f.id is null then return null; end if;
  insert into private.filed_reprises (demande_id, client_id, facture_id, version, instantane)
  values (d.id, d.client_id, f.id, f.version, private.filed_instantane(f.id))
  on conflict (demande_id) do nothing;
  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'private.reprises'::regclass and tgname = 'reprises_filed_instantane') then
    create trigger reprises_filed_instantane after insert on private.reprises
      for each row execute function private.filed_reprise_instantane();
  end if;
end $$;

-- Le cron : chaque reprise FILED à faire est proposée, déclarée impossible, ou attend une correction.
create or replace function private.filed_traiter_reprises(p_delai interval default interval '24 hours')
returns integer language plpgsql security definer set search_path to '' as $$
declare
  r record; d public.demandes_validation; s private.filed_reprises; f public.filed_factures;
  v_now jsonb; v_corr jsonb; k text; v_motif text; v_bloq text; v_id uuid; n integer := 0;
begin
  for r in select * from private.reprises_a_faire('filed') loop
    begin
      select * into d from public.demandes_validation x where x.id = r.demande_id;
      v_motif := r.consigne ->> 'motif';
      if d.objet_type is distinct from 'filed_facture' or d.type_action not like 'filed.valider_facture%' then
        perform private.reprise_impossible(d.id, 'FILED ne reprend que la validation d''une facture.');
        n := n + 1; continue;
      end if;
      if v_motif in ('Doublon', 'Hors budget ou hors période') then
        perform private.reprise_impossible(d.id, format('Refus pour « %s » : une correction de la pièce n''y répond pas ; la demande revient au demandeur.', v_motif));
        n := n + 1; continue;
      end if;
      select * into s from private.filed_reprises x where x.demande_id = d.id;
      select * into f from public.filed_factures x where x.id::text = d.objet_id for update;
      if f.id is null then
        perform private.reprise_impossible(d.id, 'La facture n''existe plus.');
        n := n + 1; continue;
      end if;
      if s.demande_id is null then
        insert into private.filed_reprises (demande_id, client_id, facture_id, version, instantane)
        values (d.id, d.client_id, f.id, f.version, private.filed_instantane(f.id)) returning * into s;
      end if;
      v_now := private.filed_instantane(f.id);
      v_corr := '[]'::jsonb;
      for k in select jsonb_object_keys(s.instantane) loop
        if (s.instantane -> k) is distinct from (v_now -> k) then
          v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', k, 'avant', s.instantane -> k, 'apres', v_now -> k));
        end if;
      end loop;
      if jsonb_array_length(v_corr) = 0 then
        if r.cree_le <= now() - p_delai then
          perform private.reprise_impossible(d.id, 'Aucune correction de la facture depuis le refus : même résultat qu''avant.');
          n := n + 1;
        end if;
        continue;   -- elle attend une correction (ou la relecture avec la consigne)
      end if;
      -- Corrigée : recontrôle (le statut « refusee » reste pendant le contrôle), puis la reprise si rien ne bloque.
      perform private.filed_controler_facture(f.id);
      select * into f from public.filed_factures x where x.id = f.id;
      if f.nb_bloquants > 0 then
        select string_agg(c.code, ', ' order by c.code) into v_bloq from public.filed_controles c
         where c.facture_id = f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
        perform private.reprise_impossible(d.id, format('La facture corrigée reste bloquée (%s) : une personne la reprend.', v_bloq));
        n := n + 1; continue;
      end if;
      v_id := private.proposer_reprise(d.id,
        format('facture %s, corrigée (%s)', coalesce(f.numero, '(sans numéro)'),
               (select string_agg(c ->> 'champ', ', ') from jsonb_array_elements(v_corr) c)),
        d.payload || jsonb_build_object('version', f.version, 'montant_ttc', f.montant_ttc, 'anomalies', to_jsonb(f.anomalies)),
        v_corr, abs(coalesce(f.montant_ttc, 0)));
      update public.filed_factures set statut = 'a_valider', maj_le = now() where id = f.id;
      insert into public.filed_validations (client_id, facture_id, document_id, demande_id, version, niveau, type_action, circuit_id)
      select f.client_id, f.id, f.document_id, v_id, f.version, coalesce(v.niveau, 1), d.type_action, v.circuit_id
        from (select 1) one left join public.filed_validations v on v.demande_id = d.id
      on conflict (demande_id) do nothing;
      perform private.filed_historiser(f.client_id, f.document_id, 'filed_facture', f.id::text, 'reprise_proposee',
        format('Reprise après refus proposée : %s.', (select string_agg(c ->> 'champ', ', ') from jsonb_array_elements(v_corr) c)),
        jsonb_build_object('refusee', d.id, 'reprise', v_id, 'corrections', v_corr));
      n := n + 1;
    exception when others then
      raise warning 'FILED : reprise de la demande % non traitée (%)', r.demande_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

revoke all on function private.filed_instantane(uuid) from public, anon, authenticated;
revoke all on function private.filed_reprise_instantane() from public, anon, authenticated;
revoke all on function private.filed_traiter_reprises(interval) from public, anon, authenticated;
grant execute on function private.filed_instantane(uuid) to service_role;
grant execute on function private.filed_traiter_reprises(interval) to service_role;

-- Le cron de FILED traite les reprises, avant la preuve de vie.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter(integer)'::regprocedure);
  v_rep constant text := E'  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.\n';
  v_n int;
begin
  if position('filed_traiter_reprises' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_86 : repère « preuve de vie » de filed_traiter trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'  -- a4_86 : les reprises après refus.\n'
    || E'  begin\n    perform private.filed_traiter_reprises();\n'
    || E'  exception when others then\n    raise warning ''FILED : reprises non traitées (%)'', sqlerrm;\n  end;\n\n'
    || v_rep);
end $$;
