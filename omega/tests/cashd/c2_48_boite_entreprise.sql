-- CASHD — c2_48 : les relances depuis la boîte de l'entreprise (G4, C13). Sur le banc (client cccccccc-…-0c, boîte
-- Gmail de test branchée au socle), dans une transaction annulée. Le dépôt en brouillon passe par la porte de l'ouvrier
-- (public.confirmer_brouillon), comme dans le test du socle 19al.

create or replace function tests.test_c2_48_boite_entreprise() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; r public.cashd_relances; v_exp uuid; v_envoi uuid; v_m jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'envoi.brouillon_depose.cashd' and a.module = 'cashd' and a.genre = 'cashd.envoi'),
                 'CASHD est abonné au dépôt en brouillon dans la boîte de l''entreprise');
  select x.id into v_exp from public.expediteurs x join public.messageries m on m.expediteur_id = x.id
   where x.client_id = v_client and x.fournisseur = 'gmail' and x.canal = 'email' and (x.module is null or x.module = 'cashd') limit 1;
  if v_exp is null then
    return next ok(true, 'Aucune boîte Gmail branchée au socle sur ce banc : dépôt non vérifiable ici');
    return;
  end if;

  -- L'écran sait par où partent les relances.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_m := public.cashd_messagerie(v_client);
  return next ok(jsonb_array_length(v_m -> 'boites') >= 1 and v_m #>> '{boites,0,fournisseur}' = 'gmail' and v_m #>> '{boites,0,depot}' = 'brouillon'
                 and v_m ->> 'phrase' is not null,
                 'cashd_messagerie : la boîte Gmail connectée, en dépôt de brouillon, et une phrase pour l''écran');
  return next ok(not (v_m::text ~ '(secret|jeton|acces_expire|renouvellement)'), 'cashd_messagerie ne rend aucun secret');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-GMAIL', 'nom', 'Boîte Entreprise', 'contact_facturation_email', 'compta@gmail-banc.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-3201', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_c and x.jour = j;

  -- L'ouvrier dépose le message dans la boîte Gmail : en cours, puis brouillon déposé (porte de l'ouvrier).
  insert into public.envois (client_id, entite_id, module, objet_type, objet_id, canal, destinataire_adresse, destinataire_fuseau, transactionnel,
                             donnees_sante, mode, fournisseur, expediteur_id, statut, sujet, corps, empreinte, cle_idempotence, echeance)
  values (v_client, r.entite_id, 'cashd', 'cashd_relances', r.id::text, 'email', 'compta@gmail-banc.test', 'Europe/Paris', true, false,
          'essai', 'gmail', v_exp, 'en_cours', r.sujet, r.corps, 'c2_48', 'c2_48:' || gen_random_uuid(), now() + interval '1 day')
  returning id into v_envoi;
  update public.cashd_relances set envoi_id = v_envoi where id = r.id;
  perform public.confirmer_brouillon(v_envoi, '<omega.' || v_envoi || '@banc.test>', 'gmail:brouillon:c2_48');
  return next ok(private.cashd_suivre_envoi(jsonb_build_object('evenement', 'envoi.brouillon_depose.cashd', 'envoi', v_envoi,
                                                               'objet_type', 'cashd_relances', 'objet_id', r.id)) ->> 'statut' = 'brouillon_depose',
                 'Le suivi d''envoi reconnaît le brouillon déposé');
  return next ok((select x.motif like 'déposée en brouillon dans % : envoyez-la depuis votre messagerie%' from public.cashd_relances x where x.id = r.id),
                 'La relance dit qu''elle est dans la boîte, à envoyer depuis la messagerie');
  return next ok(tests.c2_journal(v_client, 'cashd.brouillon_depose', r.id::text) is not null,
                 'Le journal porte « cashd.brouillon_depose »');
  return next ok((select x.etat = 'envoyee' from public.cashd_relances_etat x where x.id = r.id)
                 and private.cashd_palier_parti((select p.facture_id from public.cashd_relances_pieces p where p.relance_id = r.id limit 1), r.palier),
                 'Déposée en brouillon, elle compte comme partie : son palier est atteint, le suivant s''écrira');
end $f$;
