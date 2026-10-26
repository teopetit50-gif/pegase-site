-- a4_90 (FILED lot 82) : TMOD-03 — le refus d'une facture ferme ses demandes liées, et une demande liée à une
-- facture refusée ne s'exécute jamais.
--
-- Avant : la demande « filed.imputer » d'une facture refusée restait en attente dans la file du valideur ; approuvée,
-- elle s'exécutait (imputation validée sur une facture refusée). a4_88 ne la comptait plus, sans la fermer.
-- Maintenant :
--   · Quand une facture passe « refusee » (déclencheur après mise à jour du statut, quel que soit le chemin), ses
--     demandes FILED encore en attente (imputation, validation de direction…) passent « annulee », motif écrit ; ses
--     imputations proposées passent « refusee », motif « Fermée au refus de la facture » ; c'est écrit à l'historique.
--   · Une demande d'imputation déjà approuvée, mais pas encore exécutée, sur une facture refusée : « echec_execution »,
--     l'imputation n'est pas validée (filed_executer_decision).
--   · Si la reprise après refus (a4_86) remet la facture « à valider », l'imputation fermée au refus est proposée de
--     nouveau (même compte, même centre, nouvelle demande).
--   · Rattrapage : les factures déjà refusées sur la base sont traitées de même (demandes ouvertes fermées).
-- Deux repères (filed_executer_decision, filed_traiter_reprises) ; la pose s'arrête si l'un n'est pas trouvé une fois.
-- Rejouable ; aucune suppression.

-- Ferme les demandes en attente et les imputations proposées d'une facture refusée. Rend le nombre de demandes fermées.
create or replace function private.filed_fermer_liees(p_facture uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare f public.filed_factures; r record; v_ids uuid[] := '{}';
begin
  select * into f from public.filed_factures where id = p_facture;
  if f.id is null or f.statut <> 'refusee' then return 0; end if;
  for r in select d.id, d.type_action, d.payload from public.demandes_validation d
            where d.client_id = f.client_id and d.module = 'filed' and d.objet_type = 'filed_facture'
              and d.objet_id = f.id::text and d.statut = 'en_attente'
            for update loop
    update public.demandes_validation set statut = 'annulee', motif_echec = 'Fermée : la facture est refusée.' where id = r.id;
    v_ids := v_ids || r.id;
  end loop;
  update public.filed_imputations set statut = 'refusee', decide_le = now(), motif = 'Fermée au refus de la facture'
   where facture_id = f.id and statut = 'proposee';
  if cardinality(v_ids) > 0 then
    -- Étape « refusee » : FILED l'écrit, elle ne fait de personne un saisisseur (private.filed_saisisseurs).
    perform private.filed_historiser(f.client_id, f.document_id, 'filed_facture', f.id::text, 'refusee',
      format('Refusée : %s demande(s) liée(s) fermée(s) (imputation, autre niveau de validation).', cardinality(v_ids)),
      jsonb_build_object('demandes_fermees', to_jsonb(v_ids)));
  end if;
  return cardinality(v_ids);
end $$;

create or replace function private.filed_facture_refusee_fermer() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.statut = 'refusee' and old.statut is distinct from 'refusee' then
    perform private.filed_fermer_liees(new.id);
  end if;
  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_factures'::regclass and tgname = 'filed_factures_refus_fermer') then
    create trigger filed_factures_refus_fermer after update of statut on public.filed_factures
      for each row execute function private.filed_facture_refusee_fermer();
  end if;
end $$;

-- La reprise remet la facture « à valider » : l'imputation fermée au refus est proposée de nouveau.
create or replace function private.filed_reprise_reimputer(p_facture uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_i public.filed_imputations; v_id uuid;
begin
  if exists (select 1 from public.filed_imputations i where i.facture_id = p_facture and i.statut in ('proposee', 'validee')) then
    return null;
  end if;
  select * into v_i from public.filed_imputations i
   where i.facture_id = p_facture and i.statut = 'refusee' and i.motif = 'Fermée au refus de la facture'
   order by i.decide_le desc limit 1;
  if v_i.id is null then return null; end if;
  v_id := private.filed_proposer_imputation(p_facture, v_i.origine, v_i.compte_id, v_i.centre_id, v_i.libelle);
  if v_id is not null then
    update public.filed_imputations set statut = 'remplacee' where id = v_i.id;
  end if;
  return v_id;
end $$;

revoke all on function private.filed_fermer_liees(uuid) from public, anon, authenticated;
revoke all on function private.filed_facture_refusee_fermer() from public, anon, authenticated;
revoke all on function private.filed_reprise_reimputer(uuid) from public, anon, authenticated;
grant execute on function private.filed_fermer_liees(uuid) to service_role;
grant execute on function private.filed_reprise_reimputer(uuid) to service_role;

-- filed_executer_decision : une imputation approuvée sur une facture refusée ne s'exécute pas.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_executer_decision(jsonb)'::regprocedure);
  v_rep constant text := E'    v_issue := private.filed_decider_imputation(v_d);\n';
  v_n int;
begin
  if position('a4_90' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_90 : repère de filed_executer_decision trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'    -- a4_90 : une demande liée à une facture refusée ne s''exécute jamais.\n'
    || E'    if exists (select 1 from public.filed_factures x where x.client_id = v_d.client_id and x.id::text = v_d.objet_id\n'
    || E'                 and x.statut = ''refusee'') then\n'
    || E'      if v_d.statut = ''approuvee'' then\n'
    || E'        update public.demandes_validation set statut = ''echec_execution'',\n'
    || E'               motif_echec = ''La facture est refusée : l''''imputation ne s''''exécute pas.'' where id = v_d.id;\n'
    || E'      end if;\n'
    || E'      update public.filed_imputations set statut = ''refusee'', decide_le = now(), motif = ''Fermée au refus de la facture''\n'
    || E'       where id = (v_d.payload ->> ''imputation'')::uuid and statut = ''proposee'';\n'
    || E'      return ''facture_refusee'';\n'
    || E'    end if;\n'
    || v_rep);
end $$;

-- filed_traiter_reprises : la facture reprise retrouve son imputation.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter_reprises(interval)'::regprocedure);
  v_rep constant text := E'      update public.filed_factures set statut = ''a_valider'', maj_le = now() where id = f.id;\n';
  v_n int;
begin
  if position('filed_reprise_reimputer' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_90 : repère de filed_traiter_reprises trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep, v_rep || E'      perform private.filed_reprise_reimputer(f.id);   -- a4_90\n');
end $$;

-- Rattrapage : les factures déjà refusées ferment leurs demandes encore ouvertes.
do $$
declare r record; n integer := 0;
begin
  for r in select distinct f.id from public.filed_factures f
             join public.demandes_validation d on d.module = 'filed' and d.objet_type = 'filed_facture'
                                              and d.objet_id = f.id::text and d.statut = 'en_attente'
            where f.statut = 'refusee' loop
    n := n + private.filed_fermer_liees(r.id);
  end loop;
  raise notice 'a4_90 : % demande(s) fermée(s) sur des factures déjà refusées', n;
end $$;
