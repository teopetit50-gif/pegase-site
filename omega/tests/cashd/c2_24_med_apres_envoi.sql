-- CASHD — c2_24 : pas de mise en demeure tant qu'aucun palier précédent n'est réellement parti (TCASHD-12).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_approuver (c2_11).

-- Tenir une relance pour partie (envoi noté à la main, posé directement) : une mise en demeure exige qu'un palier précédent
-- soit réellement parti (c2_24). Utilisé aussi par c2_03, c2_04 et c2_12.
create or replace function tests.c2_parti(p_relance uuid) returns void
language sql as $$
  insert into public.cashd_envois_main (client_id, relance_id, canal, envoye_le, note)
  select r.client_id, r.id, 'email', now(), 'banc : tenue pour partie' from public.cashd_relances r where r.id = p_relance
  on conflict (relance_id) do nothing
$$;

create or replace function tests.test_c2_24_med_apres_envoi() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; v_fa uuid; v_fb uuid;
  r public.cashd_relances; v_p jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MED-A', 'nom', 'Rénovation Jamais Relancé', 'contact_facturation_email', 'compta@med-a.test'));
  v_fa := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-0981', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MED-B', 'nom', 'Enduits Interdits', 'contact_facturation_email', 'compta@med-b.test'));
  v_fb := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-0982', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  perform tests.redevenir_admin();

  -- A : rappel au jour j, relance ferme à j + 5, ni l'un ni l'autre validé.
  perform private.cashd_preparer_relances(v_client, j, null);
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  -- B : rappel et relance ferme bloqués par un mot interdit (cas A-C14) — posé après coup sur les textes déjà écrits.
  update public.cashd_relances set statut = 'bloquee', motif = 'le message contient un mot interdit par vos règles : « contentieux »'
   where compte_id = v_b and statut = 'a_valider';

  perform private.cashd_preparer_relances(v_client, j + 10, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.palier = 'mise_en_demeure'),
                 'Rien n''est parti : aucune mise en demeure n''est écrite, ni pour A ni pour B');
  select * into r from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 5;
  return next ok(r.palier = 'relance' and r.statut = 'a_valider', 'La relance ferme en attente de A n''est pas remplacée');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_b) -> 'pieces') x where x ->> 'numero' = 'FB-2026-0982';
  return next ok(tests.c2_plat(v_p ->> 'relance_suspendue') like 'mise en demeure retenue : aucun message précédent n''est réellement parti%',
                 'La fiche dit pourquoi la mise en demeure est retenue');
  perform tests.redevenir_admin();
  return next ok((select to_jsonb(f) ->> 'relance_retenue' is not null from public.cashd_factures f where f.id = v_fa),
                 'La retenue est posée sur la facture de A aussi');

  -- A : la relance ferme est validée puis partie (envoi noté à la main ; posé directement, la date du test étant à venir) ;
  -- la mise en demeure suit au passage suivant.
  perform tests.c2_approuver(r.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  insert into public.cashd_envois_main (client_id, relance_id, canal, envoye_le, note) values (v_client, r.id, 'courrier', now(), 'test c2_24');
  perform private.cashd_preparer_relances(v_client, j + 11, null);
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 11) = 'mise_en_demeure'
                 and (select to_jsonb(f) ->> 'relance_retenue' from public.cashd_factures f where f.id = v_fa) is null,
                 'Une fois la relance partie, la mise en demeure est écrite et la retenue levée');
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_b and x.palier = 'mise_en_demeure'),
                 'B, à qui rien n''est parti, reste sans mise en demeure');
end $f$;
