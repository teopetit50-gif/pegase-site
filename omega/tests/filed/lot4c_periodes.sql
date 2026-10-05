-- pgTAP — FILED lot 4c : les périodes des charges récurrentes (fonctions pures).
begin;
select plan(6);
select is(private.filed_pas_periodicite('mensuelle'), interval '1 month', 'mensuelle = 1 mois');
select is(private.filed_pas_periodicite('trimestrielle'), interval '3 months', 'trimestrielle = 3 mois');
select is(private.filed_pas_periodicite('annuelle'), interval '1 year', 'annuelle = 1 an');
select is(private.filed_pas_periodicite('hebdo'), null, 'inconnue = nul');
select has_function('private', 'filed_generer_periodes', 'filed_generer_periodes existe');
select has_function('public', 'filed_declarer_charge_recurrente', 'la porte filed_declarer_charge_recurrente existe');
select * from finish();
rollback;
