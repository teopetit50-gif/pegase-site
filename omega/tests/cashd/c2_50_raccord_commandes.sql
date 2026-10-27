-- CASHD — c2_50 : un logiciel de commandes raccordé au plafond d'encours (G19, C38). Sur le banc (client
-- cccccccc-…-0c), transaction annulée. Le logiciel appelle le raccord SANS session (rôle anon) avec sa clé.

create or replace function tests.test_c2_50_raccord_commandes() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_c uuid; v_k jsonb; v_cle text; v_r jsonb; v_r2 jsonb; v_n integer;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CMD', 'nom', 'Commandes Raccordées', 'contact_facturation_email', 'compta@cmd.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-3401', 'date_emission', j - 20, 'echeance', j + 10, 'montant_ttc', 1000));
  perform public.cashd_fixer_plafond(v_c, 1500, 'Plafond du banc pour le raccord');

  -- Le gérant crée la clé : montrée une fois, gardée en empreinte.
  v_k := public.cashd_creer_cle_commandes(v_client, 'Logiciel de commandes du banc');
  v_cle := v_k ->> 'cle';
  return next ok(v_cle ~ '^cashd_cmd_[0-9a-f]{48}$' and v_k ->> 'prefixe' = left(v_cle, 12), 'La clé de raccord est créée et rendue une fois');
  return next ok(not exists (select 1 from public.cashd_cles_commandes x where x.empreinte = v_cle or x.prefixe = v_cle)
                 and exists (select 1 from public.cashd_cles_commandes x where x.empreinte = encode(extensions.digest(convert_to(v_cle, 'UTF8'), 'sha256'), 'hex')),
                 'Seule son empreinte SHA-256 est gardée');
  return next ok(public.cashd_cles_commandes_liste(v_client)::text !~ '[0-9a-f]{64}' and jsonb_array_length(public.cashd_cles_commandes_liste(v_client)) = 1,
                 'La liste des clés ne montre ni la clé ni son empreinte');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.cashd_creer_cle_commandes(%L, %L)', v_client, 'Autre'), '42501', null, 'Un valideur ne crée pas de clé');

  -- Le logiciel, sans session : 300 € passent sous le plafond, 900 € le dépassent.
  perform tests.redevenir_admin();
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  v_r := public.cashd_commande(v_cle, 'a-cmd', 300, 'BC-0001');
  v_r2 := public.cashd_commande(v_cle, 'A-CMD', 900, 'BC-0002');
  execute 'reset role';
  return next ok(v_r ->> 'decision' = 'autorisee' and (v_r ->> 'livrable')::boolean and (v_r ->> 'plafond')::numeric = 1500,
                 'Sous le plafond, la commande est autorisée et livrable');
  return next ok(v_r2 ->> 'decision' = 'en_attente' and not (v_r2 ->> 'livrable')::boolean
                 and exists (select 1 from public.demandes_validation d join public.cashd_commandes o on o.demande_id = d.id
                             where o.id = (v_r2 ->> 'commande')::uuid and d.type_action = 'cashd.commande_hors_plafond' and d.statut = 'en_attente'
                               and d.payload ->> 'source' like 'raccord:%'),
                 'Au-delà, elle est bloquée : une demande attend la décision d''un responsable');
  return next ok(tests.c2_journal(v_client, 'cashd.commande_verifiee', v_c::text) is not null, 'La vérification est au journal');

  -- Rejouée, la même commande rend la même décision, sans doublon.
  execute 'set local role anon';
  v_r := public.cashd_commande(v_cle, 'A-CMD', 900, 'BC-0002');
  execute 'reset role';
  select count(*) into v_n from public.cashd_commandes o where o.compte_id = v_c and o.reference = 'BC-0002';
  return next ok(v_n = 1 and (v_r ->> 'deja_verifiee')::boolean and v_r ->> 'commande' = v_r2 ->> 'commande', 'Une commande rejouée ne se vérifie pas deux fois');

  -- Le responsable la débloque : le logiciel le lit.
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  select o.demande_id, v_client, v_daf, 'approuve', 'Client sûr, accord du directeur' from public.cashd_commandes o where o.id = (v_r2 ->> 'commande')::uuid;
  perform tests.redevenir_admin();
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  v_r := public.cashd_commande_etat(v_cle, (v_r2 ->> 'commande')::uuid);
  execute 'reset role';
  return next ok(v_r ->> 'decision' = 'debloquee' and (v_r ->> 'livrable')::boolean, 'Débloquée par un responsable, elle devient livrable');

  -- Les gardes du raccord.
  execute 'set local role anon';
  return next throws_ok(format('select public.cashd_commande(%L, %L, 10)', 'cashd_cmd_' || repeat('0', 48), 'A-CMD'), '28000', null, 'Une clé inconnue est refusée');
  return next throws_ok(format('select public.cashd_commande(%L, %L, 10)', v_cle, 'INCONNU'), 'P0002', null, 'Un compte inconnu est dit');
  return next throws_ok(format('select public.cashd_commande(%L, %L, 0)', v_cle, 'A-CMD'), '22023', null, 'Un montant nul est refusé');
  execute 'reset role';
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_revoquer_cle_commandes((v_k ->> 'id')::uuid);
  perform tests.redevenir_admin();
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  return next throws_ok(format('select public.cashd_commande(%L, %L, 10)', v_cle, 'A-CMD'), '28000', null, 'Une clé révoquée est refusée');
  return next throws_ok('select count(*) from public.cashd_cles_commandes', '42501', null, 'Le logiciel ne lit pas la table des clés');
  execute 'reset role';
  perform tests.redevenir_admin();
end $f$;
