-- c4_33 — OFFLOAD : affaires en plan, relance et chiffrage tenus même sans message (session C4, 23/10/2026).
-- Promesses C:86-88 et C:152. Après c4_00, c4_03, c4_08 (aides) et les migrations c4_01 à c4_33. Mode essai, aucun envoi.
-- runtests() annule tout.

create or replace function tests.test_c4_33_affaires_relance_et_chiffrage() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid; v_aff uuid; v_aff2 uuid;
  a public.offload_affaires;
  v_jour date;
begin
  perform tests.c4_reprises_pretes();
  v_jour := (now() at time zone private.offload_fuseau(v_client))::date;
  v_x := tests.c4_compte_courriel('AF1', 'Garage Pneus Ouest', 'atelier@garage-pneus-ouest.test', 70);
  -- La commande du client est connue d'OFFLOAD (pièce de même référence), l'affaire est saisie sans valeur.
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  select v_client, k.entite_id, k.id, v_jour - 12, 480, 'CMD-O4-01', 'commande', 'saisie' from public.offload_comptes k where k.id = v_x;
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v_aff := public.offload_saisir_affaire(v_x, 'CMD-O4-01', v_jour - 10, '{"libelle": "4 pneus hiver"}');
  v_aff2 := public.offload_saisir_affaire(v_x, 'CMD-O4-02', v_jour - 2, '{"libelle": "Batterie", "montant": 95}');
  perform tests.redevenir_admin();
  return next is((select x.valeur_ht from public.offload_affaires x where x.id = v_aff2), 95.00::numeric(14,2),
                 'La valeur d''une affaire se saisit aussi en « montant »');

  -- Comme sur le banc …c4 avant réglage : OFFLOAD ne peut préparer aucun message.
  update public.reglages_envois set mode = null where client_id = v_client and (module = 'offload' or module is null);
  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  return next ok(a.statut = 'relancee_1' and a.envoi1_id is null
                 and exists (select 1 from public.offload_taches t where t.compte_id = v_x and t.type = 'appel' and t.statut = 'a_faire'
                               and t.titre like '%CMD-O4-01%'),
                 'Sans message possible, la première relance passe par une personne (tâche d''appel) : ' || a.statut);
  return next is(a.valeur_ht, 480.00::numeric(14,2), 'Le stock immobilisé est chiffré par la pièce de même référence');
  return next ok(not exists (select 1 from public.envois e where e.client_id = v_client and e.module = 'offload'
                               and e.objet_type = 'offload_affaires' and e.objet_id = v_aff::text),
                 'Aucun message n''est préparé hors essai');

  update public.offload_affaires set relance1_le = now() - interval '8 days' where id = v_aff;
  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  return next is(a.statut, 'relancee_2', 'Après le délai, une seule autre relance, par une personne');
  update public.offload_affaires set relance2_le = now() - interval '8 days' where id = v_aff;
  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  return next ok(a.statut = 'decision' and a.motif like '%480%immobilisés%',
                 'Puis décision manuelle, montant immobilisé en regard : ' || coalesce(a.motif, '?'));
end $f$;

select * from runtests('tests'::name, '^test_c4_33_');
