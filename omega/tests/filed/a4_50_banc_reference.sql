-- Tests A4 — lot 54 (a4_62) : le banc de référence. Doublures : organisation, pièce et cas d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_62_01_banc_reference() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); a jsonb; v_cl uuid; v_sha text; v_rel bigint; v_rel2 bigint;
  v_avant int; v_pieces int;
begin
  v_cl := (o ->> 'client')::uuid;
  -- Une pièce lue (doublure) : sa facture de 240 €, son numéro.
  a := tests.a4_facture(o, 'ia', 'BANC-T-001', 240);
  select sha256 into v_sha from public.pieces where id = (a ->> 'piece')::uuid;
  perform private.filed_controler_facture((a ->> 'facture')::uuid);

  insert into private.filed_banc_cas (code, source, genre, piece_sha256, intitule, champs_attendus, controles_attendus, scenario) values
    ('TEST-PIECE', 'omega', 'piece', v_sha, 'Pièce de test lue',
     '{"numero": "BANC-T-001", "montant_ttc": 240, "fournisseur.nom": "Fournisseur structure d exemple", "date": "2026-01-01"}',
     '{"lecture.complete": {"resultat": "present"}}', null),
    ('TEST-ABSENTE', 'omega', 'piece', repeat('0', 64), 'Pièce jamais déposée', '{"numero": "X"}', '{"montant.coherence": {"resultat": "ok"}}', null),
    ('TEST-SAIN', 'omega', 'scenario', null, 'Facture saine',
     '{}', '{"famille:montant": {"resultat": "pas_anomalie"}, "montant.coherence": {"resultat": "ok"}}',
     '{"factures": [{"numero": "T-1", "date": -5, "ht": 100, "tva": 20, "ttc": 120}]}'),
    ('TEST-TTC', 'omega', 'scenario', null, 'TTC faux', '{}', '{"montant.coherence": {"resultat": "anomalie", "gravites": ["bloquant"]}}',
     '{"factures": [{"numero": "T-2", "date": -5, "ht": 100, "tva": 20, "ttc": 121}]}'),
    ('TEST-ATTENDU-FAUX', 'omega', 'scenario', null, 'Une attente que FILED ne tient pas', '{}', '{"montant.coherence": {"resultat": "anomalie"}}',
     '{"factures": [{"numero": "T-3", "date": -5, "ht": 100, "tva": 20, "ttc": 120}]}'),
    ('TEST-HORS', 'omega', 'hors_perimetre', null, 'Hors périmètre', '{}', '{"lecture.complete": {"resultat": "ok"}}', null);

  select count(*) into v_avant from public.filed_factures where client_id = v_cl;
  select count(*) into v_pieces from public.pieces where client_id = v_cl;
  v_rel := private.filed_banc_rejouer('test a4_62', v_cl);

  return next ok((select count(*) from public.filed_factures where client_id = v_cl) = v_avant
                 and (select count(*) from public.pieces where client_id = v_cl) = v_pieces,
                 'Les scénarios se jouent à blanc : ni facture ni pièce ne reste');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-SAIN' and cle = 'famille:montant'),
                 'juste', 'Facture saine : aucune anomalie de montant, verdict juste');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-TTC' and cle = 'montant.coherence'),
                 'juste', 'TTC faux : montant.coherence en anomalie bloquante, verdict juste');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-ATTENDU-FAUX'),
                 'faux', 'Une attente que FILED ne tient pas est notée fausse');
  return next ok((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-PIECE' and cle = 'numero') = 'juste'
                 and (select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-PIECE' and cle = 'montant_ttc') = 'juste'
                 and (select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-PIECE' and cle = 'fournisseur.nom') = 'juste',
                 'Pièce : numéro, TTC et fournisseur lus comme attendu (le nom à l''accent et à la casse près)');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-PIECE' and cle = 'date'),
                 'faux', 'Champ attendu mais pas lu : faux');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-PIECE' and cle = 'lecture.complete'),
                 'juste', 'Pièce : les contrôles de sa facture sont jugés');
  return next ok((select bool_and(verdict = 'non_joue' and motif = 'pièce pas encore déposée') from private.filed_banc_verdicts
                  where releve_id = v_rel and cas_code = 'TEST-ABSENTE'), 'Pièce pas déposée : non jouée, avec le motif');
  return next is((select verdict from private.filed_banc_verdicts where releve_id = v_rel and cas_code = 'TEST-HORS'),
                 'non_joue', 'Hors périmètre : non joué');

  -- Le tableau de notes et la note précédente.
  update private.filed_banc_cas set controles_attendus = '{"montant.coherence": {"resultat": "ok"}}' where code = 'TEST-ATTENDU-FAUX';
  v_rel2 := private.filed_banc_rejouer('test a4_62 bis', v_cl);
  return next ok(exists (select 1 from private.filed_banc_notes(v_rel2) n where n.genre = 'controle' and n.cle = 'montant.coherence'
                          and n.note_precedente is not null and n.note > n.note_precedente),
                 'Tableau de notes : la note de montant.coherence monte d''un relevé à l''autre');
  return next ok((select nb_verdicts > 0 and nb_justes <= nb_verdicts from private.filed_banc_releves where id = v_rel2), 'Le relevé compte ses verdicts');

  -- Rien n'est ouvert aux comptes.
  return next ok(not has_function_privilege('authenticated', 'private.filed_banc_rejouer(text, uuid)', 'execute')
                 and not has_table_privilege('authenticated', 'private.filed_banc_cas', 'select'),
                 'Ni le banc ni ses cas ne sont ouverts aux comptes');
end $f$;
