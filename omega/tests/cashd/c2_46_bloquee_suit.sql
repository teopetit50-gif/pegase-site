-- CASHD — c2_46 : une relance bloquée par un interdit suit le reste dû ; l'interdit levé, elle repasse les contrôles et
-- entre dans la file (TMOD-13). Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_46_bloquee_suit() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid;
  ra public.cashd_relances; rb public.cashd_relances; x public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-BLQ-A', 'nom', 'Bloquée Revue', 'contact_facturation_email', 'compta@blqa.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-3001', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances r where r.compte_id = v_a and r.jour = j;

  -- L'interdit « simple oubli » est posé ; B est préparée ensuite : bloquée dès la préparation, sans demande.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"interdits": ["simple oubli"]}');
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-BLQ-B', 'nom', 'Bloquée Préparée', 'contact_facturation_email', 'compta@blqb.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-3002', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into rb from public.cashd_relances r where r.compte_id = v_b and r.jour = j;
  return next ok(rb.statut = 'bloquee' and rb.demande_id is null, 'B, préparée sous l''interdit, est bloquée sans demande');

  -- A : 85 € réglés → bloquée à 1 000 € (c2_44) ; puis 15 € de plus → elle suit le reste dû, toujours bloquée.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 85, j, 'VIR FB-2026-3001 a', 'virement');
  perform public.cashd_noter_reglement(v_client, v_a, 15, j, 'VIR FB-2026-3001 b', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = ra.id;
  return next ok(x.statut = 'bloquee' and x.montant = 985 and tests.c2_plat(x.corps) like '%985,00 €%' and x.motif like '%mot interdit%simple oubli%',
                 'Bloquée, la relance suit le reste dû (985 €) et garde la raison du blocage');
  return next ok(not exists (select 1 from public.demandes_validation d where d.objet_id = ra.id::text and d.statut = 'en_attente'),
                 'Toujours bloquée : aucune demande en attente');

  -- L'interdit est levé : A et B repassent tous les contrôles et entrent dans la file, au reste dû.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"interdits": []}');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = ra.id;
  return next ok(x.statut in ('a_valider', 'non_reglee') and x.montant = 985
                 and (select d.statut = 'en_attente' and d.montant = 985 from public.demandes_validation d where d.id = x.demande_id),
                 'L''interdit levé, A entre dans la file à 985 €, à valider');
  select * into x from public.cashd_relances r where r.id = rb.id;
  return next ok(x.statut in ('a_valider', 'non_reglee') and x.montant = 1085
                 and (select d.statut = 'en_attente' and d.montant = 1085 and d.type_action = 'cashd.rappel' and d.payload ->> 'relance' = rb.id::text
                      from public.demandes_validation d where d.id = x.demande_id),
                 'B, bloquée dès la préparation, reçoit sa demande (rappel, 1 085 €), à valider');

  -- Ensuite, elle suit le reste dû comme une relance en attente (c2_42).
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 10, j, 'VIR FB-2026-3001 c', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = ra.id;
  return next ok(x.montant = 975 and (select d.statut = 'en_attente' and d.montant = 975 from public.demandes_validation d where d.id = x.demande_id)
                 and (select count(*) from public.demandes_validation d where d.objet_id = ra.id::text and d.statut = 'en_attente') = 1,
                 'Puis elle suit le reste dû (975 €), une seule demande en attente');

  -- Un autre interdit qu'elle contient la garde bloquée.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"interdits": ["simple oubli"]}');
  perform public.cashd_noter_reglement(v_client, v_b, 85, j, 'VIR FB-2026-3002', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = rb.id;
  return next ok(x.statut = 'bloquee' and x.montant = 1000 and not exists (select 1 from public.demandes_validation d where d.objet_id = rb.id::text and d.statut = 'en_attente'),
                 'L''interdit reposé, la relance revue de B est bloquée de nouveau, sans demande en attente');
end $f$;
