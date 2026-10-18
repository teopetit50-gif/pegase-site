-- Tests A4 — lot 44 (a4_52) : la vue d'ensemble multi-dossiers d'un cabinet. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_52_01_vue_ensemble() returns setof text
language plpgsql as $f$
declare a jsonb := tests.a4_organisation(); b jsonb := tests.a4_organisation(); c jsonb := tests.a4_organisation();
        u uuid := (a ->> 'gerant')::uuid; fa jsonb; n integer; r record;
begin
  -- La gérante du dossier A suit aussi le dossier B, comme valideuse ; elle ne suit pas C.
  insert into public.comptes (user_id, client_id, role) values (u, (b ->> 'client')::uuid, 'valideur');
  fa := tests.a4_facture(a, 'ia', 'CAB-A1', 120);
  update public.filed_factures set statut = 'bloquee' where id = (fa ->> 'facture')::uuid;
  perform tests.a4_facture(a, 'ia', 'CAB-A2', 60);
  perform tests.a4_facture(b, 'ia', 'CAB-B1', 30);
  perform tests.a4_facture(c, 'ia', 'CAB-C1', 10);

  reset role; perform tests.a4_comme(u);
  select count(*) into n from public.filed_vue_ensemble();
  return next is(n, 2, 'Deux dossiers : ceux où elle a un rôle, pas les autres');
  select * into r from public.filed_vue_ensemble() where client_id = (a ->> 'client')::uuid;
  return next ok(r.role = 'gerant' and r.bloquees = 1 and r.attente = 1 and r.pieces_mois = 2 and r.erreur is null,
                 format('Dossier A : rôle %s, %s bloquée, %s en attente, %s pièces ce mois', r.role, r.bloquees, r.attente, r.pieces_mois));
  select * into r from public.filed_vue_ensemble() where client_id = (b ->> 'client')::uuid;
  return next ok(r.role = 'valideur' and r.attente = 1 and r.dernier_recu_le is not null, 'Dossier B : comme valideuse, sa pièce en attente');
  return next ok(not exists (select 1 from public.filed_vue_ensemble() where client_id = (c ->> 'client')::uuid), 'Le dossier C n''y est pas');

  -- Épingler B le met en tête.
  perform public.filed_epingler_dossier((b ->> 'client')::uuid, true, 1);
  return next is((select client_id from public.filed_vue_ensemble() limit 1), (b ->> 'client')::uuid, 'Le dossier épinglé passe en tête');
  return next throws_ok(format('select public.filed_epingler_dossier(%L)', c ->> 'client'), '42501', null, 'On n''épingle pas un dossier qu''on ne suit pas');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return next is((select count(*) from public.filed_vue_ensemble()), 0::bigint, 'Le serveur n''a pas de vue de personne');
end $f$;
