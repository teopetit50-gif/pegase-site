-- c4_32 — OFFLOAD : les reprises ouvertes avant les règles suivent les règles (testeur T-OFFLOAD, TOFFLOAD-09 et 10 ;
-- session C4, 22/10/2026). Après c4_00, c4_03, c4_11 (aides) et les migrations c4_01 à c4_32. runtests() annule tout.

create or replace function tests.test_c4_32_reprises_d_avant() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_l uuid; v_e uuid;
  r public.offload_reprises;
  t jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_l := tests.c4_compte_courriel('RA1', 'Garage Litige Ancien', 'atelier@garage-litige-ancien.test', 70);
  v_e := tests.c4_compte_courriel('RA2', 'Cabinet Effacé Ancien', 'cabinet@cabinet-efface-ancien.test', 70);
  update public.offload_comptes set email = null where id in (v_l, v_e);   -- reprises « appel », avec tâche
  perform private.offload_detecter(v_client, null);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_ouvrir_reprise(v_l);
  perform public.offload_ouvrir_reprise(v_e);
  perform tests.redevenir_admin();
  return next ok((tests.c4_reprise(v_l)).statut = 'appel' and (tests.c4_reprise(v_e)).statut = 'appel',
                 'Deux reprises « appel » ouvertes, chacune avec sa tâche');

  -- Comme sur la recette : le litige arrive après l'ouverture ; l'effacement date d'avant c4_26 (rien n'a été clos).
  perform tests.c4_cashd_compte('RA1', 'litige');
  update public.offload_comptes set nom = 'Compte effacé (réf. RA2)', contact = null, telephone = null, statut = 'arrete',
         statut_motif = 'Données personnelles effacées à la demande de la personne.', efface_le = now() where id = v_e;

  perform private.offload_detecter(v_client, null);
  r := tests.c4_reprise(v_l);
  return next ok(r.statut = 'close' and r.issue = 'abandon',
                 'TOFFLOAD-09 : la reprise d''un compte passé en litige CASHD s''arrête (' || r.statut || ', ' || coalesce(r.issue, '—') || ')');
  return next ok(not exists (select 1 from public.offload_taches x where x.compte_id = v_l and x.statut = 'a_faire'),
                 'Sa tâche « Appeler » n''est plus à faire');
  r := tests.c4_reprise(v_e);
  return next ok(r.statut = 'close' and r.issue = 'abandon',
                 'TOFFLOAD-10 : la reprise d''un compte effacé s''arrête (' || r.statut || ')');
  return next ok(not exists (select 1 from public.offload_taches x where x.compte_id = v_e and x.statut = 'a_faire'),
                 'Aucune tâche ne reste à faire sur le compte effacé');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  t := public.offload_tableau(v_client);
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from jsonb_array_elements(t -> 'comptes') x where x ->> 'id' = v_e::text),
                 'Le compte effacé ne figure plus dans la liste des comptes');
end $f$;

select * from runtests('tests'::name, '^test_c4_32_');
