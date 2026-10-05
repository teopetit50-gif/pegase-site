-- pgTAP — FILED lot 4a : les tables de la comptabilité existent, commentées, sous RLS, inscrites à l'effacement.
begin;
select plan(31);

select has_table('public', t, t || ' existe') from unnest(array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations', 'filed_imputations_apprises', 'filed_charges_recurrentes', 'filed_charges_attendues']) as t;
select ok((select relrowsecurity from pg_class where oid = ('public.' || t)::regclass), 'RLS activée sur ' || t) from unnest(array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations', 'filed_imputations_apprises', 'filed_charges_recurrentes', 'filed_charges_attendues']) as t;
select isnt(obj_description(('public.' || t)::regclass, 'pg_class'), null, 'commentaire sur ' || t) from unnest(array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations', 'filed_imputations_apprises', 'filed_charges_recurrentes', 'filed_charges_attendues']) as t;
select ok(exists (select 1 from private.tables_locataires where nom = t), t || ' inscrite à l''effacement') from unnest(array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations', 'filed_imputations_apprises', 'filed_charges_recurrentes', 'filed_charges_attendues']) as t;
select ok(exists (select 1 from private.tables_objets where nom = 'filed_imputations' and objet_type = 'filed_document'), 'filed_imputations suit le document');
select ok(not has_table_privilege('authenticated', 'public.filed_imputations', 'INSERT'), 'authenticated n''écrit pas directement dans filed_imputations');
select ok(not has_table_privilege('authenticated', 'public.filed_plan_comptable', 'UPDATE'), 'authenticated ne modifie pas directement le plan comptable');

select * from finish();
rollback;
