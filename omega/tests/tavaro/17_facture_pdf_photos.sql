-- 17 — La facture part avec son PDF et ses photos datées (migration b2_08) : avec un réglage d'envoi, le courriel attend
-- les PDF (travail tavaro.pdf_factures) ; l'ouvrier tavaro-pdf (simulé ici par ses portes) enregistre les pièces, qui
-- ne partent pas à la lecture IA, et le courriel est préparé avec elles ; sans PDF possible, il part sans pièce jointe.
-- Sans réglage d'envoi, rien ne change (test 07).

create or replace function tests.test_b2_17_facture_pdf_photos() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_prop uuid; a jsonb; r jsonb; v_pieces jsonb := '[]'::jsonb; f record; v_regle boolean := true; n bigint; v_envoi public.envois;
begin
  if to_regprocedure('public.loc_enregistrer_pdf(uuid, jsonb)') is null then
    return next fail('La migration b2_08 (PDF et photos) n''est pas posée : public.loc_enregistrer_pdf manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  -- Le gérant pose un réglage d'envoi en essai pour tavaro (sinon le courriel ne part pas : test 07).
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  begin
    insert into public.reglages_envois (client_id, module, mode, essai_adresse) values (v_client, 'tavaro', 'essai', 'essai-b2@essai.invalid');
  exception when others then
    v_regle := false;
    return next diag('Réglage d''envoi non posé (' || sqlerrm || ') : seul le chemin « non réglé » est vérifié.');
  end;
  perform tests.redevenir_admin();
  jeu := tests.tavaro_chiffrer(jeu, 'collab');
  perform tests.tavaro_decider(jeu, (jeu ->> 'demande')::uuid, 'referent');
  perform private.loc_ouvrier(50);
  v_prop := (jeu ->> 'proposition')::uuid;
  return next is((select p.statut from public.loc_propositions p where p.id = v_prop), 'facturee', 'Les factures sont émises');

  if v_regle then
    return next ok((select bool_and(x.envoi_id is null and x.pdf_piece_id is null) from public.loc_factures x where x.proposition_id = v_prop), 'Avec un réglage d''envoi, le courriel attend les PDF');
    return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L and cle = %L', v_client, 'tavaro.pdf_factures', 'tavaro:pdf:' || v_prop)), 1::bigint, 'Le travail tavaro.pdf_factures est déposé');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_pdf_demande') >= 1, 'Le journal porte tavaro.facture_pdf_demande');
  end if;

  -- Les portes de l'ouvrier sont au service seul.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_pdf_a_produire(%L::uuid)', v_prop), '42501', null, 'Une personne connectée n''appelle pas les portes de l''ouvrier');
  perform tests.redevenir_admin();

  -- Ce que l'ouvrier lit : les factures, leurs lignes, les photos des preuves.
  a := public.loc_pdf_a_produire(v_prop);
  return next ok(jsonb_array_length(a -> 'factures') >= 1 and jsonb_array_length(a -> 'factures' -> 0 -> 'lignes') >= 1, 'L''ouvrier lit les factures et leurs lignes');
  -- Un chemin hors du dossier du loueur est refusé.
  return next throws_ok(format('select public.loc_enregistrer_pdf(%L::uuid, %L::jsonb)', v_prop, jsonb_build_array(jsonb_build_object(
      'facture', a -> 'factures' -> 0 ->> 'id', 'nature', 'pdf', 'chemin', 'un-autre-loueur/x.pdf', 'nom', 'x.pdf', 'mime', 'application/pdf', 'octets', 10, 'sha256', repeat('a', 64)))),
    '42501', null, 'Une pièce hors du dossier du loueur est refusée');
  -- L'ouvrier enregistre un PDF par facture et une photo.
  for f in select x.id, x.reference, row_number() over (order by x.numero) as k from public.loc_factures x where x.proposition_id = v_prop loop
    v_pieces := v_pieces || jsonb_build_array(jsonb_build_object('facture', f.id, 'nature', 'pdf', 'chemin', v_client || '/loc_factures/' || f.id || '/' || f.reference || '.pdf',
      'nom', f.reference || '.pdf', 'mime', 'application/pdf', 'octets', 24000, 'sha256', repeat(f.k::text, 64)));
  end loop;
  v_pieces := v_pieces || jsonb_build_array(jsonb_build_object('facture', a -> 'factures' -> 0 ->> 'id', 'nature', 'photo', 'chemin', v_client || '/loc_contrat/' || (jeu ->> 'contrat') || '/jauge.jpg',
      'nom', 'jauge.jpg', 'mime', 'image/jpeg', 'octets', 180000, 'sha256', repeat('e', 64), 'legende', 'Carburant — prise le 05/10/2026 à 11:35'));
  r := public.loc_enregistrer_pdf(v_prop, v_pieces);
  return next ok((select bool_and(x.pdf_piece_id is not null and x.pdf_sha256 is not null) from public.loc_factures x where x.proposition_id = v_prop), 'Chaque facture porte son PDF et son empreinte');
  select count(*) into n from public.pieces pc where pc.client_id = v_client and pc.module = 'tavaro' and pc.objet_type = 'loc_factures' and pc.statut = 'lue';
  return next is(n, jsonb_array_length(v_pieces)::bigint, 'Les pièces sont créées, au statut « lue »');
  return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L', v_client, 'lecteur.lire')), 0::bigint, 'Rien ne part à la lecture IA');
  if v_regle then
    return next is(r ->> 'statut', 'prepare', 'Le courriel est préparé');
    select * into v_envoi from public.envois e where e.client_id = v_client and e.cle_idempotence = 'tavaro:facture:' || v_prop;
    return next is(cardinality(v_envoi.pieces), jsonb_array_length(v_pieces), 'Le courriel porte les PDF et la photo en pièces jointes');
    return next ok(v_envoi.corps like '%en pièces jointes%', 'Le courriel le dit');
    -- Rejouer ne crée ni pièce ni envoi de plus.
    r := public.loc_enregistrer_pdf(v_prop, v_pieces);
    return next is(tests.compter('public', 'envois', format('client_id = %L and cle_idempotence = %L', v_client, 'tavaro:facture:' || v_prop)), 1::bigint, 'Rejouer ne fait pas un second envoi');
  else
    return next is(r ->> 'statut', 'non_regle', 'Sans réglage d''envoi, la facture reste à envoyer soi-même');
  end if;
end $f$;

select * from runtests('tests'::name, '^test_b2_17_');
