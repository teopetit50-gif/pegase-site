-- CASHD — c2_11 : une relance validée, envoyée à la main (envoi du module coupé ou préféré), se note et compte comme partie.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

-- Approuver une demande comme le fait une personne : par public.approbations (le socle recopie la décision).
create or replace function tests.c2_approuver(p_demande uuid, p_client uuid, p_user uuid, p_email text) returns void
language plpgsql as $f$
begin
  if to_regclass('public.approbations') is not null then
    perform tests.endosser(p_user, p_email);
    execute 'insert into public.approbations (demande_id, client_id, user_id, decision) values ($1, $2, $3, ''approuve'')' using p_demande, p_client, p_user;
    perform tests.redevenir_admin();
  else
    update public.demandes_validation set statut = 'approuvee' where id = p_demande;   -- banc local sans socle complet
  end if;
end $f$;

create or replace function tests.test_c2_11_envoi_main() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; j date := tests.c2_jour(); v_compte uuid; v_autre uuid;
  r public.cashd_relances; r2 public.cashd_relances; v_l jsonb; v_x jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-main-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_compte := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MAIN', 'nom', 'Ébénisterie Roux',
                'contact_facturation_email', 'compta@roux.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_compte, 'numero', 'F-2026-410', 'date_emission', j - 40,
             'echeance', j - 10, 'montant_ttc', 2100));
  v_autre := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MAIN2', 'nom', 'Serrurerie Petit',
                'contact_facturation_email', 'compta@petit.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_autre, 'numero', 'F-2026-411', 'date_emission', j - 40,
             'echeance', j - 10, 'montant_ttc', 800));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_compte and x.jour = j;
  select * into r2 from public.cashd_relances x where x.compte_id = v_autre and x.jour = j;

  -- ── Les gardes ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'email'), '55000', null,
                        'Avant sa validation, une relance ne se note pas comme envoyée');
  perform tests.redevenir_admin();
  perform tests.c2_approuver(r.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  perform tests.endosser(v_collab, 'c2-main-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'email'), '42501', null,
                        'Un collaborateur ne note pas l''envoi');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'pigeon'), '22023', null, 'Un canal inconnu est refusé');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L, %L)', r.id, 'email', now() + interval '2 days'), '22023', null,
                        'Une date d''envoi à venir est refusée');

  -- ── Validée, envoyée par courrier ──
  v_x := public.cashd_noter_envoi_main(r.id, 'courrier', null, 'Lettre simple, posée au bureau de poste');
  return next is(v_x ->> 'canal', 'courrier', 'L''envoi à la main est noté, avec son canal');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'email'), '23505', null, 'Un envoi ne se note qu''une fois');
  v_l := (select x from jsonb_array_elements(public.cashd_relances_du_jour(v_client, j)) x where (x ->> 'id')::uuid = r.id);
  return next ok(v_l ->> 'etat' = 'envoyee' and v_l ->> 'envoye_le' is not null and v_l #>> '{envoi_main,canal}' = 'courrier',
                 'Dans la liste du jour, la relance est partie, à sa date, par courrier');
  return next ok((select x ->> 'etat' from jsonb_array_elements(public.cashd_dossier(v_compte) -> 'relances') x where (x ->> 'jour')::date = j) = 'envoyee',
                 'Le dossier la montre partie');
  return next ok((select g.envoyees from public.cashd_reponses g where g.client_id = v_client and g.palier = r.palier) >= 1,
                 'Elle compte dans le taux de réponse');
  return next ok(tests.c2_journal(v_client, 'cashd.relance_envoyee_main', r.id::text) ->> 'donnees' like '%courrier%', 'L''envoi à la main est au journal');

  -- ── Une relance coupée ne se note pas ──
  perform public.cashd_statut_compte(v_autre, 'pause', 'Le client a appelé : il paie vendredi');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r2.id, 'email'), '55000', null,
                        'Une relance coupée (compte en pause) ne se note pas comme envoyée');
  return next ok(not exists (select 1 from public.cashd_envois_main m where m.relance_id = r2.id), 'Rien n''est noté pour elle');
  perform tests.redevenir_admin();
end $f$;
