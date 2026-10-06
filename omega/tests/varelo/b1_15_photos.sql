-- b1_15 — VARELO : les photos du constat d'une livraison (migration b1_12_photos, après b1_11 et b1_11b)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_14.
-- runtests() annule tout ce que le test écrit (y compris les objets factices de storage.objects). Motif : ^test_b1_15_
--
-- La livraison avariée de Transports Caraïbes : le collaborateur dépose deux photos du carton écrasé ; la lettre
-- dit qu'elles sont jointes. Un PDF, un chemin hors de la livraison, un fichier absent du dépôt : refusés.

create or replace function tests.test_b1_15_photos() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  r jsonb; j jsonb;
  v_id uuid; v_base text;
  v_lettre text;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  r := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date - 1, 'transporteur', 'Transports Caraïbes',
         'colis_attendus', 10, 'colis_recus', 10, 'avarie', true, 'constat', 'Un carton écrasé.'));
  perform tests.redevenir_admin();
  v_id := (r ->> 'reception')::uuid;
  v_base := v_client::text || '/grp_receptions/' || v_id::text || '/';

  -- les fichiers, comme si l'écran les avait déposés dans le bucket
  insert into storage.objects (bucket_id, name, metadata) values
    ('omega-clients', v_base || '1-carton.jpg', jsonb_build_object('mimetype', 'image/jpeg', 'size', 482113)),
    ('omega-clients', v_base || '2-etiquette.png', jsonb_build_object('mimetype', 'image/png', 'size', 90211)),
    ('omega-clients', v_base || '3-bon.pdf', jsonb_build_object('mimetype', 'application/pdf', 'size', 30000)),
    ('omega-clients', v_client::text || '/filed_document/x.jpg', jsonb_build_object('mimetype', 'image/jpeg', 'size', 1000));

  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  j := public.grp_joindre_photo(v_id, v_base || '1-carton.jpg', 'carton.jpg');
  return next is((j ->> 'photos')::int, 1, 'le collaborateur joint une photo');
  j := public.grp_joindre_photo(v_id, v_base || '2-etiquette.png');
  j := public.grp_joindre_photo(v_id, v_base || '2-etiquette.png');
  return next ok((j ->> 'photos')::int = 2 and (j ->> 'deja')::boolean, 'la même photo deux fois : une seule fois inscrite');
  return next throws_ok(format('select public.grp_joindre_photo(%L, %L)', v_id, v_base || '3-bon.pdf'), '22023', null, 'un PDF n''est pas une photo (22023)');
  return next throws_ok(format('select public.grp_joindre_photo(%L, %L)', v_id, v_client::text || '/filed_document/x.jpg'), '22023', null, 'un fichier hors de la livraison : refusé (22023)');
  return next throws_ok(format('select public.grp_joindre_photo(%L, %L)', v_id, v_base || '../autre/x.jpg'), '22023', null, 'un chemin qui remonte : refusé (22023)');
  return next throws_ok(format('select public.grp_joindre_photo(%L, %L)', v_id, v_base || 'absente.jpg'), 'P0002', null, 'une photo absente du dépôt : introuvable (P0002)');
  perform tests.redevenir_admin();

  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_joindre_photo(%L, %L)', v_id, v_base || '1-carton.jpg'), 'P0002', null, 'une personne d''un autre groupe : livraison introuvable (P0002)');
  perform tests.redevenir_admin();

  return next is((select jsonb_array_length(photos) from public.grp_reserves where id = v_id), 2, 'la vue rend les deux photos');
  return next ok((select (photos -> 0 ->> 'nom') = 'carton.jpg' and (photos -> 0 ->> 'octets')::bigint = 482113 and photos -> 0 ->> 'type' = 'image/jpeg'
                  from public.grp_receptions where id = v_id), 'nom, taille et type sont gardés');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = %L', v_client, 'varelo.reception.photo_jointe')), 2::bigint,
                 'deux photos jointes au journal');

  perform tests.endosser(g, ge);
  v_lettre := public.grp_lettre_reserve(v_id);
  perform tests.redevenir_admin();
  return next ok(v_lettre like '%2 photographies du constat sont jointes à la présente.%', 'la lettre dit que deux photographies sont jointes');
end $f$;
