-- CASHD — c2_54 : le plafond porte sur le cumul (encours + commandes déjà autorisées dans la fenêtre), et une référence
-- rejouée avec un autre montant est refusée (TNUIT-01, TNUIT-08). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_54_commandes_cumul() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; v_cle text; v_r jsonb[] := '{}'; v_x jsonb; k integer;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CUM', 'nom', 'Commandes Découpées', 'contact_facturation_email', 'compta@cum.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-3801', 'date_emission', j - 5, 'echeance', j + 25, 'montant_ttc', 585));
  perform public.cashd_fixer_plafond(v_c, 1000, 'Plafond du banc, commandes découpées');
  v_cle := public.cashd_creer_cle_commandes(v_client, 'Logiciel du banc, cumul') ->> 'cle';
  perform tests.redevenir_admin();

  -- Quatre commandes de 300 € : la première passe (585 + 300), la deuxième dépasse le plafond avec la première.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  for k in 1 .. 4 loop
    v_r := v_r || public.cashd_commande(v_cle, 'A-CUM', 300, 'CUM-' || k);
  end loop;
  execute 'reset role';
  return next ok(v_r[1] ->> 'decision' = 'autorisee' and (v_r[1] ->> 'engage')::numeric = 0, 'La première commande de 300 € passe (585 + 300 ≤ 1 000)');
  return next ok(v_r[2] ->> 'decision' = 'en_attente' and (v_r[2] ->> 'engage')::numeric = 300 and (v_r[2] ->> 'encours')::numeric = 585,
                 'La deuxième est bloquée : 585 d''encours + 300 déjà autorisés + 300 dépassent 1 000, et la réponse le dit');
  return next ok(v_r[3] ->> 'decision' = 'en_attente' and v_r[4] ->> 'decision' = 'en_attente',
                 'Les suivantes aussi : découper la commande ne contourne plus le plafond');

  -- La porte des membres compte de même.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_x := public.cashd_verifier_commande(v_c, 200, 'CUM-MEMBRE');
  return next ok(v_x ->> 'statut' = 'bloquee' and (v_x ->> 'engage')::numeric = 300, 'La vérification par un membre compte aussi les commandes déjà autorisées');
  perform tests.redevenir_admin();

  -- Hors de la fenêtre (30 jours par défaut), une commande autorisée ne compte plus.
  update public.cashd_commandes set cree_le = now() - interval '40 days' where compte_id = v_c and reference = 'CUM-1';
  execute 'set local role anon';
  v_x := public.cashd_commande(v_cle, 'A-CUM', 300, 'CUM-5');
  execute 'reset role';
  return next ok(v_x ->> 'decision' = 'autorisee' and (v_x ->> 'engage')::numeric = 0 and (v_x ->> 'fenetre_jours')::integer = 30,
                 'Une commande autorisée il y a 40 jours sort de la fenêtre de 30 jours');

  -- Une référence rejouée : même montant, même décision ; autre montant, refusée et dite.
  execute 'set local role anon';
  v_x := public.cashd_commande(v_cle, 'A-CUM', 300, 'CUM-2');
  return next ok((v_x ->> 'deja_verifiee')::boolean and v_x ->> 'commande' = v_r[2] ->> 'commande', 'Même référence, même montant : la même décision, sans doublon');
  return next throws_ok(format('select public.cashd_commande(%L, %L, 10, %L)', v_cle, 'A-CUM', 'CUM-2'), '23505', null,
                        'Même référence, autre montant : refusé, jamais en silence');
  execute 'reset role';
  begin
    execute 'set local role anon';
    perform public.cashd_commande(v_cle, 'A-CUM', 10, 'CUM-2');
    execute 'reset role';
  exception when others then
    execute 'reset role';
    return next ok(tests.c2_plat(sqlerrm) like 'La commande CUM-2 a déjà été vérifiée pour 300,00 €%10,00 €%nouvelle référence%', 'Le refus dit les deux montants et quoi faire : ' || sqlerrm);
  end;
end $f$;
