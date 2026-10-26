-- Tests A4 — lot 86 (a4_94) : TMOD-12, filed_factures_refusees donne l'instant de la décision de refus, pas la dernière
-- ligne d'historique « refusee » (fermeture des demandes liées, rattrapage). Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), tests.a4_compte
-- (a4_11_ecritures_fec.sql), tests.a4_comme (a4_26_sortie_envois.sql), tests.a4_facture_imputee
-- (a4_76_pieces_en_cours.sql) et tests.a4_decider (a4_77_refus_ferme_liees.sql), à poser avant. Ce fichier ne
-- supprime rien.

create or replace function tests.test_a4_94_01_date_du_refus() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_c uuid; f uuid; v_val uuid; v_le timestamptz;
begin
  -- Une facture imputée, refusée : sa demande d'imputation est fermée (une ligne « refusee » de plus à l'historique).
  v_c := tests.a4_compte(o, '606300', 'Petit équipement');
  f := tests.a4_facture_imputee(o, 'DATE-001', 928.20, v_c);
  select demande_id into v_val from public.filed_validations where facture_id = f and issue is null;
  perform tests.a4_decider((o ->> 'valideur')::uuid, v_val, 'rejete', 'TVA à 19 % non justifiée.', true);
  -- La décision date d'hier soir ; la fermeture et l'exécution, de maintenant (comme le rattrapage d'a4_90).
  update public.approbations set decide_le = now() - interval '18 hours' where demande_id = v_val;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  select refusee_le into v_le from public.filed_factures_refusees(v_cl) where facture_id = f;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return next ok(exists (select 1 from public.filed_historique h join public.filed_factures x on x.document_id = h.document_id
                          where x.id = f and h.etape = 'refusee' and h.message like 'Refusée : 1 demande(s) liée(s) fermée(s)%'),
                 'Une ligne « refusee » est écrite après la décision (demandes liées fermées)');
  return next is(v_le, now() - interval '18 hours', 'refusee_le : l''instant de la décision de refus');
end $f$;
