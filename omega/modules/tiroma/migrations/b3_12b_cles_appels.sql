-- b3_12b — Les clés étrangères du registre des appels (b3_12), accordées par le coordinateur le 06/10.
--
-- CE QUE ÇA CORRIGE : b3_12 posait tiroma_appels sans clé vers tiroma_patients ni tiroma_plans. Un patient effacé
-- (droit à l'effacement, purge de conservation) laissait ses appels en base, invisibles mais présents. Désormais :
--   · patient effacé  → ses appels partent avec lui (cascade, comme sa liste d'attente et ses rendez-vous) ;
--   · plan effacé     → l'appel reste, son plan_id passe à null (l'appel a eu lieu, le plan n'existe plus).
-- Idempotent : chaque clé n'est ajoutée que si elle manque. Posée « not valid » puis validée : une ligne orpheline
-- éventuelle (patient effacé entre b3_12 et b3_12b) est signalée sans bloquer la pose.

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and conname = 'tiroma_appels_patient_fkey') then
    alter table public.tiroma_appels add constraint tiroma_appels_patient_fkey
      foreign key (client_id, entite_id, patient_id) references public.tiroma_patients (client_id, entite_id, id)
      on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and conname = 'tiroma_appels_plan_fkey') then
    alter table public.tiroma_appels add constraint tiroma_appels_plan_fkey
      foreign key (client_id, entite_id, plan_id) references public.tiroma_plans (client_id, entite_id, id)
      on delete set null (plan_id) not valid;
  end if;
  begin
    alter table public.tiroma_appels validate constraint tiroma_appels_patient_fkey;
    alter table public.tiroma_appels validate constraint tiroma_appels_plan_fkey;
  exception when foreign_key_violation then
    raise notice 'b3_12b : des appels orphelins empêchent la validation ; les clés jouent pour toute nouvelle écriture.';
  end;
end $$;

create index if not exists tiroma_appels_plan on public.tiroma_appels (client_id, entite_id, plan_id) where plan_id is not null;

select conname, convalidated from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and contype = 'f' order by conname;
