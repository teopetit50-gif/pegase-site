-- Tests A4 — lot 57 (a4_65) : le quota sans blocage, alertes au gérant à 80 % et 100 %. Données fictives ; aucun prix.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_65_01_quota_sans_blocage() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; b jsonb := tests.a4_organisation(); v_g2 uuid := gen_random_uuid();
  c jsonb; v_mois date := date_trunc('month', now() at time zone 'Europe/Paris')::date; k public.filed_compteurs_pieces; i int; v_six jsonb;
begin
  -- Le destinataire d'une alerte se lit sans dépendre du nom de sa colonne (destinataire_id sur la recette).
  insert into public.filed_paliers (code, libelle, pieces_mois, boites, alerte_pct, rang) values ('ESSAI_Q65', 'Essai quota', 5, 1, 80, 998);
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_changer_palier(v_cl, 'ESSAI_Q65');
  reset role; perform set_config('request.jwt.claims', '', true);

  for i in 1..3 loop perform tests.a4_facture(o, 'ia', 'Q65-' || i, 10); end loop;
  return next is((select count(*)::int from public.alertes where client_id = v_cl and cle_regroupement like '%quota%'), 0, 'À 3 pièces sur 5 : pas d''alerte');

  perform tests.a4_facture(o, 'ia', 'Q65-4', 10);
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_cl and a.cle_regroupement like '%quota:alerte%'
                          and coalesce(to_jsonb(a) ->> 'destinataire_id', to_jsonb(a) ->> 'destinataire') = o ->> 'gerant' and a.titre like '%80 %% du quota%' and a.titre like '%La lecture continue%'),
                 'À 80 % : une alerte au gérant, qui dit que la lecture continue');

  perform tests.a4_facture(o, 'ia', 'Q65-5', 10);
  select * into k from public.filed_compteurs_pieces where client_id = v_cl and mois = v_mois;
  return next ok(k.atteint_le is not null and k.depasse_le is null, 'À 100 % : le quota est noté atteint');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_cl and a.cle_regroupement like '%quota:atteint%'
                          and coalesce(to_jsonb(a) ->> 'destinataire_id', to_jsonb(a) ->> 'destinataire') = o ->> 'gerant' and a.titre like '%atteint%'),
                 'À 100 % : une seconde alerte au gérant');
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  c := public.filed_compteur(v_cl);
  reset role; perform set_config('request.jwt.claims', '', true);
  return next ok(c ->> 'etat' = 'atteint' and (c ->> 'au_dela')::int = 0, 'Le compteur dit « atteint », rien au-delà');

  -- Au-delà : la pièce est reçue et lue comme les autres, comptée à part, sans alerte de plus.
  v_six := tests.a4_facture(o, 'ia', 'Q65-6', 10);
  select * into k from public.filed_compteurs_pieces where client_id = v_cl and mois = v_mois;
  return next ok(k.au_dela = 1 and k.depasse_le is not null, 'La sixième pièce est comptée au-delà');
  return next is((select count(*)::int from public.alertes a where a.client_id = v_cl and a.cle_regroupement like '%quota%'
                   and coalesce(to_jsonb(a) ->> 'destinataire_id', to_jsonb(a) ->> 'destinataire') = o ->> 'gerant'), 2,
                 'Au gérant : deux alertes dans le mois, pas une de plus au-delà');
  return next is((select etat from public.filed_documents where id = (v_six ->> 'document')::uuid), 'a_traiter', 'La pièce au-delà n''est pas bloquée');
  return next ok(private.filed_controler_facture((v_six ->> 'facture')::uuid) is not null, 'et sa facture se contrôle comme les autres');
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  c := public.filed_compteur(v_cl);
  reset role; perform set_config('request.jwt.claims', '', true);
  return next ok(c ->> 'etat' = 'depasse' and (c ->> 'au_dela')::int = 1 and c ->> 'lecture' = 'continue',
                 'Le compteur « au-delà » est visible (1), la lecture continue');

  -- Aucun prix : pas un mot de facturation, et « facturer » n'est plus un réglage.
  return next is((select count(*)::int from public.alertes where client_id = v_cl and (titre ilike '%factur%' or titre ilike '%€%')), 0,
                 'Aucune alerte ne parle de prix ou de facturation');
  return next throws_ok($$select public.filed_regler_palier('ESSAI_Q65', 5, 1, null, 80, 'facturer')$$, '22023', null,
                        'Le réglage « facturer » est refusé');

  -- Deux gérants : chacun reçoit l'alerte.
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_g2, v_g2::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role) values (v_g2, (b ->> 'client')::uuid, 'gerant');
  insert into public.filed_paliers (code, libelle, pieces_mois, boites, alerte_pct, rang) values ('ESSAI_Q65B', 'Essai quota B', 1, 1, 80, 997);
  perform tests.a4_comme((b ->> 'gerant')::uuid);
  perform public.filed_changer_palier((b ->> 'client')::uuid, 'ESSAI_Q65B');
  reset role; perform set_config('request.jwt.claims', '', true);
  perform tests.a4_facture(b, 'ia', 'Q65B-1', 10);
  return next is((select count(distinct coalesce(to_jsonb(a) ->> 'destinataire_id', to_jsonb(a) ->> 'destinataire'))::int from public.alertes a
                   where a.client_id = (b ->> 'client')::uuid and a.cle_regroupement like '%quota:atteint%'
                     and coalesce(to_jsonb(a) ->> 'destinataire_id', to_jsonb(a) ->> 'destinataire') in (b ->> 'gerant', v_g2::text)), 2,
                 'Deux gérants : l''alerte va à chacun');
end $f$;
