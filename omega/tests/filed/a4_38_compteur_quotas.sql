-- Tests A4 — lot 42 (a4_50) : compteur de pièces par mois et quotas par palier. Données fictives ; aucun prix.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_50_01_compteur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; c jsonb; e jsonb;
begin
  -- Un palier d'essai : 3 pièces, alerte à 60 %, dépassement compté.
  insert into public.filed_paliers (code, libelle, pieces_mois, boites, alerte_pct, depassement, rang)
  values ('ESSAI_A4', 'Essai A4', 3, 1, 60, 'facturer', 999);

  -- Sans abonnement : on compte, sans quota.
  perform tests.a4_facture(o, 'ia', 'QTA-001', 10);
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  c := public.filed_compteur(v_cl);
  reset role;
  return next is(c ->> 'pieces', '1', 'Chaque pièce reçue compte dans son mois');
  return next is(c ->> 'etat', 'sans_quota', 'Sans abonnement, pas de quota : rien ne change pour les clients actuels');

  -- Le premier palier prend effet tout de suite.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  e := public.filed_changer_palier(v_cl, 'essai_a4');
  reset role;
  return next ok(e ->> 'palier' = 'ESSAI_A4' and e ->> 'palier_suivant' is null, 'Premier palier : tout de suite');

  perform tests.a4_facture(o, 'ia', 'QTA-002', 10);
  return next ok((select alerte_le is not null and depasse_le is null from public.filed_compteurs_pieces
                   where client_id = v_cl and mois = date_trunc('month', now() at time zone 'Europe/Paris')::date),
                 'À 60 % du quota : l''alerte, une fois');
  perform tests.a4_facture(o, 'ia', 'QTA-003', 10);
  perform tests.a4_facture(o, 'ia', 'QTA-004', 10);
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  c := public.filed_compteur(v_cl);
  reset role;
  return next is(c ->> 'etat', 'depasse', 'Au-delà du quota : dépassé');
  return next is((c ->> 'hors_quota')::int, 1, 'la pièce hors quota est comptée (palier « facturer »)');
  return next ok((select depasse_le is not null from public.filed_compteurs_pieces where client_id = v_cl
                   and mois = date_trunc('month', now() at time zone 'Europe/Paris')::date), 'et le dépassement est signalé');
  return next is((select etat from public.filed_documents d join public.filed_factures f on f.document_id = d.id
                   where f.numero = 'QTA-004' and f.client_id = v_cl), 'a_traiter', 'La pièce hors quota est reçue et traitée comme les autres');

  -- Un changement de palier attend le 1er du mois suivant.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  e := public.filed_changer_palier(v_cl, 'ENTREPRISE');
  c := public.filed_compteur(v_cl);
  reset role;
  return next ok(e ->> 'palier' = 'ESSAI_A4' and e ->> 'palier_suivant' = 'ENTREPRISE'
                 and (e ->> 'suivant_le')::date = (date_trunc('month', now() at time zone 'Europe/Paris') + interval '1 month')::date,
                 'Changer de palier : au 1er du mois suivant');
  return next is(c ->> 'quota', '3', 'le mois en cours garde son quota');
  return next is((private.filed_palier_du(v_cl, (current_date + interval '1 month')::date)).code, 'ENTREPRISE', 'le mois suivant prend le nouveau');

  -- Les droits.
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_changer_palier(%L, %L)', v_cl, 'STANDARD'), '42501', null, 'Le valideur ne change pas de palier');
  return next throws_ok($$select public.filed_regler_palier('STANDARD', 1, 1, null)$$, '42501', null, 'Les seuils des paliers sont à l''opérateur');
  reset role;
  return next is((select count(*) from public.filed_paliers where code in ('DECOUVERTE', 'STANDARD', 'ENTREPRISE')), 3::bigint,
                 'Les trois paliers du site, sans prix');
end $f$;
