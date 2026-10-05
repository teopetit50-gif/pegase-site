-- pgTAP — FILED lot 6a : indicateurs, export, fonctions pures du pilotage.
begin;
select plan(16);
select ok(exists (select 1 from public.indicateurs where code = c and version = 1 and en_service), 'indicateur ' || c || ' publié')
  from unnest(array['filed.engage_mois', 'filed.decaissement_30j', 'filed.decaissement_60j', 'filed.delai_traitement', 'filed.pieces_bloquees', 'filed.pieces_litige', 'filed.pieces_attente', 'filed.charges_manquantes']) as c;
select is(private.filed_csv_cellule(1234.50::numeric), '1234,50', 'virgule décimale');
select is(private.filed_csv_cellule('a "b"'::text), '"a ""b"""', 'texte entre guillemets, guillemets doublés');
select is(private.filed_csv_cellule(date '2026-10-05'), '05/10/2026', 'date au format français');
select is(private.filed_csv_cellule(null::text), '', 'nul = vide');
select is(private.filed_prochain_export('mensuelle', 5, date '2026-10-05'), date '2026-11-05', 'mensuel le 5 : le jour même → le mois suivant');
select is(private.filed_prochain_export('mensuelle', 10, date '2026-10-05'), date '2026-10-10', 'mensuel le 10 : plus tard ce mois');
select is(private.filed_prochain_export('hebdomadaire', 1, date '2026-10-05'), date '2026-10-12', 'hebdomadaire lundi, un lundi → lundi suivant');
select is(private.filed_prochain_export('hebdomadaire', 3, date '2026-10-05'), date '2026-10-07', 'hebdomadaire mercredi, depuis un lundi → ce mercredi');
select * from finish();
rollback;
