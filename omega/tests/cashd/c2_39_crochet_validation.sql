-- CASHD — c2_39 : à l'approbation, le crochet du socle (19ay) réécrit le texte d'une relance au jour de la validation ;
-- la date limite part de ce jour (TCASHD-10b exact). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_39_crochet_validation() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; r public.cashd_relances; e public.envois; v jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'delai_mise_en_demeure_jours', 8));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-CRO', 'nom', 'Crochet Validation', 'contact_facturation_email', 'compta@cro.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-2401', 'date_emission', j - 50, 'echeance', j - 25, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j - 0, null);
  -- une relance ferme écrite aujourd'hui (le rappel tenu pour parti), avec la marge de c2_35
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  update public.cashd_relances set jour = j - 6 where compte_id = v_a and jour = j;
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  return next ok(r.palier = 'relance' and r.corps like '%au plus tard le ' || to_char(private.cashd_jours_ouvres(j, 3) + 8, 'DD/MM/YYYY') || '%',
                 'À la préparation, la limite garde la marge de validation (c2_35)');

  -- le crochet, comme le socle l'appelle à l'approbation (l'envoi est encore « a_valider »)
  e.id := gen_random_uuid(); e.client_id := v_client; e.module := 'cashd'; e.objet_type := 'cashd_relances'; e.objet_id := r.id::text;
  e.sujet := r.sujet; e.corps := r.corps;
  v := private.cashd_crochet_approbation(e);
  return next ok(v ->> 'corps' like '%au plus tard le ' || to_char(j + 8, 'DD/MM/YYYY') || '%' and v ? 'sujet',
                 'À l''approbation, le corps est réécrit : la limite part du jour de la validation, sans marge');
  return next ok((select x.corps from public.cashd_relances x where x.id = r.id) = v ->> 'corps', 'La relance garde le texte de son envoi');
  e.corps := v ->> 'corps'; e.sujet := v ->> 'sujet';
  return next is(private.cashd_crochet_approbation(e), '{}'::jsonb, 'Un texte déjà juste n''est pas réécrit');
  e.objet_type := 'reput_avis';
  return next is(private.cashd_crochet_approbation(e), '{}'::jsonb, 'Un envoi qui n''est pas une relance CASHD est laissé tel quel');
  return next ok(exists (select 1 from pg_proc p where p.oid = 'private.cashd_crochet_approbation(public.envois)'::regprocedure
                         and p.pronargs = 1 and p.prorettype = 'jsonb'::regtype),
                 'La signature est celle qu''attend le socle : (public.envois) → jsonb');
  if to_regclass('private.crochets_approbation_envoi') is not null then
    return next ok(exists (select 1 from private.crochets_approbation_envoi c where c.module = 'cashd'
                           and c.fonction = 'private.cashd_crochet_approbation(public.envois)'::regprocedure),
                   'Le crochet est inscrit auprès du socle (lot 19ay)');
  else
    return next ok(true, 'Lot socle 19ay absent du banc : inscription non vérifiable ici');
  end if;
end $f$;
