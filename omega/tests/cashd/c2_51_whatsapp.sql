-- CASHD — c2_51 : les relances par WhatsApp (G13). Sur le banc (client cccccccc-…-0c), transaction annulée.
-- L'approbation du modèle par Meta (gabarit « valide ») et le canal WhatsApp de l'envoi CASHD sont posés ici en
-- administrateur, comme le ferait A2 ; rien ne part (mode essai, transaction annulée).

create or replace function tests.test_c2_51_whatsapp() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; v_r jsonb; ra public.cashd_relances; rb public.cashd_relances; e public.envois;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  if private.reglages_envois_effectifs(v_client, 'cashd') ->> 'mode' is null then
    return next ok(true, 'Envoi CASHD non réglé sur ce banc : WhatsApp non vérifiable ici');
    return;
  end if;
  update public.reglages_envois set canaux = (select array_agg(distinct x) from unnest(canaux || array['whatsapp']) x)
   where client_id = v_client and module = 'cashd';
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_whatsapp(%L, %L)', v_client, 'Relance Impayé'), '22023', null,
                        'Un nom de modèle WhatsApp suit la forme de Meta');
  v_r := public.cashd_regler_whatsapp(v_client, 'cashd_relance_v1');
  return next ok(v_r ->> 'gabarit_statut' = 'brouillon' and not (v_r ->> 'actif')::boolean,
                 'Le modèle est déposé en brouillon : il attend l''approbation de Meta');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-WA', 'nom', 'Relance WhatsApp', 'contact_facturation_email', 'compta@wa.test',
                                                                      'contact_facturation_telephone', '+590 690 12 34 56'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-3501', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-WA-SANS', 'nom', 'Sans Numéro', 'contact_facturation_email', 'compta@wasans.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-3502', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 700));
  return next throws_ok(format('select public.cashd_canal_compte(%L, %L)', v_b, 'whatsapp'), '22023', null, 'Sans numéro de facturation, pas de WhatsApp');
  v_r := public.cashd_canal_compte(v_a, 'whatsapp');
  return next ok((v_r ->> 'canal') = 'whatsapp' and not (v_r ->> 'whatsapp_possible')::boolean, 'Le compte choisit WhatsApp ; le modèle n''est pas encore validé');

  -- Meta approuve le modèle (A2).
  perform tests.redevenir_admin();
  update public.gabarits_messages set statut = 'valide', valide_par = v_gerant, valide_le = now() where client_id = v_client and code = 'cashd.relance_whatsapp' and modele_externe = 'cashd_relance_v1';
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances r where r.compte_id = v_a and r.jour = j;
  select * into rb from public.cashd_relances r where r.compte_id = v_b and r.jour = j;
  select * into e from public.envois where id = ra.envoi_id;
  return next ok(ra.canal = 'whatsapp' and e.canal = 'whatsapp' and e.destinataire_adresse like '%690%'
                 and e.gabarit_id = (private.cashd_gabarit_whatsapp(v_client)).id
                 and e.variables ->> 'message' like 'la facture FB-2026-3501 (1 085,00 €)%restant à régler.%',
                 'Le rappel part par WhatsApp, au numéro de facturation, sur le modèle validé, avec un message court');
  return next ok((select d.statut = 'en_attente' and d.payload ->> 'canal' = 'whatsapp' from public.demandes_validation d where d.id = ra.demande_id)
                 and e.demande_id = ra.demande_id,
                 'Il attend la même validation qu''un courriel');
  return next ok(rb.canal = 'email', 'Un compte resté au courriel est relancé par courriel');

  -- La revue (règlement partiel) refait le message sur WhatsApp.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 500, j, 'VIR FB-2026-3501', 'virement');
  perform tests.redevenir_admin();
  select * into ra from public.cashd_relances r where r.id = ra.id;
  select * into e from public.envois where id = ra.envoi_id;
  return next ok(e.canal = 'whatsapp' and e.demande_id = ra.demande_id and e.variables ->> 'message' like '%585,00 €%',
                 'Revue au reste dû, la relance garde WhatsApp, au nouveau montant');

  -- La mise en demeure ne part jamais par WhatsApp (séquence courte, chaque palier réellement parti, comme c2_25).
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-WA-MED', 'nom', 'Mise En Demeure WhatsApp', 'contact_facturation_email', 'compta@wamed.test',
                                                                      'contact_facturation_telephone', '+590 690 65 43 21'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-3503', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  perform public.cashd_canal_compte(v_b, 'whatsapp');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_b and x.jour = j;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 5;
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  return next ok((select string_agg(x.palier || ':' || x.canal, ',' order by x.jour) from public.cashd_relances x where x.compte_id = v_b)
                 ~ 'mise_en_demeure:(email|lre)$'
                 and (select bool_and(x.canal = 'whatsapp') from public.cashd_relances x where x.compte_id = v_b and x.palier <> 'mise_en_demeure'),
                 'Rappel et relance par WhatsApp ; la mise en demeure, jamais : courriel ou LRE');
end $f$;
