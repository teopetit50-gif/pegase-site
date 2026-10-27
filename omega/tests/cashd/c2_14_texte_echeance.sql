-- CASHD — c2_14 : l'organisation écrit aussi le texte du rappel du jour d'échéance.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_14_texte_echeance() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid; j date := tests.c2_jour(); v_compte uuid; v_autre uuid; r public.cashd_relances; v_g jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-echeance-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_compte := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-ECH14', 'nom', 'Jardins Leroy', 'contact_facturation_email', 'compta@leroy.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_compte, 'numero', 'F-2026-610', 'date_emission', j - 30, 'echeance', j, 'montant_ttc', 960));
  v_autre := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-ECH14B', 'nom', 'Paysages Morin', 'contact_facturation_email', 'compta@morin.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_autre, 'numero', 'F-2026-611', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 700));

  -- ── Les gardes ──
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'echeance', 'fr', 'Échéance', 'Bonjour, sans le détail.'),
                        '22023', null, 'Le texte du jour d''échéance porte {lignes}, comme les autres');
  perform tests.endosser(v_collab, 'c2-echeance-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'echeance', 'fr', 'Échéance', '{lignes}'),
                        '42501', null, 'Un collaborateur n''écrit pas les textes');

  -- ── Le texte de l'organisation ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_g := public.cashd_ecrire_gabarit(v_client, 'echeance', 'fr', 1, '{emetteur} — votre facture {numero} arrive à échéance',
    E'{bonjour}\n\nPetit mot amical de l''équipe Jardins : {dues} aujourd''hui.\n{lignes}\nMerci d''avance !\n{reglement}');
  return next is(v_g ->> 'cle', 'echeance', 'Le texte du jour d''échéance s''enregistre');
  v_g := public.cashd_gabarits(v_client);
  return next ok(exists (select 1 from jsonb_array_elements(v_g -> 'gabarits') x
                         where x ->> 'cle' = 'echeance' and x ->> 'langue' = 'fr' and (x ->> 'variante')::int = 1 and (x ->> 'personnalise')::boolean)
                 and exists (select 1 from jsonb_array_elements(v_g -> 'gabarits') x where x ->> 'cle' = 'echeance' and (x ->> 'variante')::int = 2 and not (x ->> 'personnalise')::boolean),
                 'La liste des textes le montre, à côté de la variante par défaut');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_compte and x.jour = j;
  return next ok(r.palier = 'echeance' and r.gabarit = 'echeance' and r.variante = 1 and r.sujet like '% — votre facture F-2026-610 arrive à échéance',
                 'Le rappel du jour d''échéance prend l''objet écrit par l''organisation');
  return next ok(r.corps like '%Petit mot amical de l''équipe Jardins%' and tests.c2_plat(r.corps) like '%la facture suivante arrive à échéance aujourd''hui%'
                 and r.corps like '%F-2026-610%',
                 'Et son corps, avec les variables remplies');
  return next ok((select x.corps not like '%Petit mot amical%' from public.cashd_relances x where x.compte_id = v_autre and x.jour = j and x.palier = 'rappel'),
                 'Le rappel J+7 garde son propre texte');

  -- ── Retiré : le texte par défaut revient ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_gabarit(v_client, 'echeance', 'fr', 1, null, null, false);
  return next ok(not exists (select 1 from jsonb_array_elements(public.cashd_gabarits(v_client) -> 'gabarits') x
                             where x ->> 'cle' = 'echeance' and (x ->> 'personnalise')::boolean),
                 'Retiré, le texte par défaut revient');
  return next ok(tests.c2_journal(v_client, 'cashd.gabarit') ->> 'donnees' like '%echeance%', 'Le changement est daté au journal (cashd.gabarit)');
  perform tests.redevenir_admin();
end $f$;
