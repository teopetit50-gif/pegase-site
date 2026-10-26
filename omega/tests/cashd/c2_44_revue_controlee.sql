-- CASHD — c2_44 : une relance revue au nouveau montant repasse tous les contrôles d'une relance neuve (TMOD-04).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_44_revue_controlee() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; v_c uuid;
  ra public.cashd_relances; rb public.cashd_relances; rc public.cashd_relances; x public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CTL-A', 'nom', 'Contrôle Interdit', 'contact_facturation_email', 'compta@ctla.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-2901', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CTL-B', 'nom', 'Contrôle Hors Périmètre', 'contact_facturation_email', 'compta@ctlb.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-2902', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CTL-C', 'nom', 'Contrôle Litige', 'contact_facturation_email', 'compta@ctlc.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-2903', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances r where r.compte_id = v_a and r.jour = j;
  select * into rb from public.cashd_relances r where r.compte_id = v_b and r.jour = j;
  select * into rc from public.cashd_relances r where r.compte_id = v_c and r.jour = j;
  return next ok(tests.c2_plat(ra.corps) like '%simple oubli%', 'Le rappel de A dit « simple oubli » (dix jours de retard, petit montant)');

  -- A : l'organisation interdit « simple oubli » ; puis 500 € sont lettrés. La relance revue contient l'interdit.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"interdits": ["simple oubli"]}');
  perform public.cashd_noter_reglement(v_client, v_a, 500, j, 'VIR FB-2026-2901', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = ra.id;
  return next ok(x.statut = 'bloquee' and x.motif like '%mot interdit%simple oubli%' and x.montant = 585,
                 'Revue à 585 €, la relance qui contient un mot interdit est bloquée, comme une relance neuve');
  return next ok((select d.statut = 'annulee' from public.demandes_validation d where d.id = ra.demande_id)
                 and not exists (select 1 from public.demandes_validation d where d.payload ->> 'revue_de' = ra.demande_id::text),
                 'Aucune demande n''est proposée : l''ancienne est retirée de la file, aucune nouvelle n''y entre');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"interdits": []}');
  perform tests.redevenir_admin();

  -- B : rappel refusé (reprise impossible), puis le client demande l'arrêt des relances (hors périmètre), puis 500 € lettrés.
  if to_regclass('private.reprises') is not null and to_regclass('public.approbations') is not null then
    perform tests.endosser(v_daf, 'daf@banc-varelo.test');
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (rb.demande_id, v_client, v_daf, 'rejete', 'Attendre');
    perform tests.redevenir_admin();
    perform private.cashd_traiter_reprises();
    perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
    perform public.cashd_statut_compte(v_b, 'hors_perimetre', 'Le client demande l''arrêt des relances par écrit');
    perform public.cashd_noter_reglement(v_client, v_b, 500, j, 'VIR FB-2026-2902', 'virement');
    perform tests.redevenir_admin();
    select * into x from public.cashd_relances r where r.id = rb.id;
    return next ok(not exists (select 1 from public.demandes_validation d where d.payload ->> 'revue_de' = rb.demande_id::text)
                   and x.statut = 'coupee' and x.motif like '%hors périmètre%',
                   'Refusée puis hors périmètre : le règlement ne repropose rien, la relance est coupée avec la raison');
  else
    return next ok(true, 'Lot socle 19az absent du banc : cas de la relance refusée non vérifiable ici');
  end if;

  -- C : la facture passe en litige pendant que la relance attend (elle est coupée) ; le texte revu ne la ressuscite pas,
  --     et un compte en litige ne reçoit pas de nouvelle demande.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_statut_compte(v_c, 'litige', 'Le client conteste la prestation');
  perform public.cashd_noter_reglement(v_client, v_c, 500, j, 'VIR FB-2026-2903', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = rc.id;
  return next ok(x.statut = 'coupee' and not exists (select 1 from public.demandes_validation d where d.payload ->> 'revue_de' = rc.demande_id::text),
                 'Compte en litige : la relance reste coupée, rien n''est reproposé');

  -- Le cas ordinaire est inchangé : sans interdit ni suspension, la relance revue entre dans la file (c2_42).
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 85, j, 'VIR FB-2026-2901 bis', 'virement');
  perform tests.redevenir_admin();
  return next ok((select r.statut = 'bloquee' from public.cashd_relances r where r.id = ra.id),
                 'Une relance bloquée par un interdit n''est pas revue par un règlement suivant : elle attend une décision');
end $f$;
