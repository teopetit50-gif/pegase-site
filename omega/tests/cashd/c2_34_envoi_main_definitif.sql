-- CASHD — c2_34 : une relance envoyée à la main ne peut plus repartir, même si un réglage d'envoi est posé ensuite
-- (TCASHD-16). Sur le banc (client cccccccc-…-0c), transaction annulée ; le réglage posé est « essai », jamais « reel ».

create or replace function tests.test_c2_34_envoi_main_definitif() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_c uuid; r public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C19', 'nom', 'Envoyé À La Main', 'contact_facturation_email', 'compta@c19.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-2019', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  -- Sans réglage d'envoi CASHD, le préparateur la laisse « non_reglee » (posé ici : le banc a un réglage d'envoi).
  update public.cashd_relances set statut = 'non_reglee', envoi_id = null,
         motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé'
   where compte_id = v_c and jour = j returning * into r;
  perform tests.c2_approuver(r.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_envoi_main(r.id, 'email');
  perform tests.redevenir_admin();
  select * into r from public.cashd_relances x where x.id = r.id;
  return next ok(r.statut <> 'non_reglee' and r.motif like 'envoyée à la main le %(email) : elle ne repartira pas', 'Notée envoyée à la main, elle quitte « non_reglee » et son motif le dit');
  return next is((select x.etat from public.cashd_relances_etat x where x.id = r.id), 'envoyee', 'Son état est « envoyee »');

  -- Un réglage d'envoi est posé ensuite (essai) ; passages et vérifications suivent.
  update public.reglages_envois set mode = 'essai' where client_id = v_client and module = 'cashd';
  if not found then
    begin
      insert into public.reglages_envois (client_id, module, mode) values (v_client, 'cashd', 'essai');
    exception when others then null;
    end;
  end if;
  perform private.cashd_verifier_relances(v_client);
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  return next ok((select x.envoi_id is null and x.statut <> 'coupee' from public.cashd_relances x where x.id = r.id)
                 and not exists (select 1 from public.cashd_relances x where x.compte_id = v_c and x.id <> r.id and x.palier = r.palier and x.statut <> 'coupee'),
                 'Après la pose du réglage, aucun envoi n''est créé pour elle, et rien ne la réécrit');
  return next throws_ok(format('update public.cashd_relances set envoi_id = %L where id = %L', gen_random_uuid(), r.id), '55000', null,
                        'Aucun chemin ne peut lui adosser un envoi');
end $f$;
