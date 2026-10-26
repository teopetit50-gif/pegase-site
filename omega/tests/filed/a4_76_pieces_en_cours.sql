-- Tests A4 — lot 80 (a4_88) : TFILED-29, les pièces en cours sans facture refusée à imputer ni double compte.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql)
-- tests.a4_compte (a4_11_ecritures_fec.sql) et tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Données d'exemple (les montants de F3 et F13 du banc
-- T-FILED). Ce fichier ne supprime rien.

-- Une facture « à valider » et son imputation proposée (charge récurrente, sur le compte donné). Rend la facture.
create or replace function tests.a4_facture_imputee(p_org jsonb, p_numero text, p_ttc numeric, p_compte uuid) returns uuid
language plpgsql as $$
declare v_f uuid := (tests.a4_facture(p_org, 'ia', p_numero, p_ttc) ->> 'facture')::uuid;
begin
  perform private.filed_controler_facture(v_f);
  perform private.filed_proposer_imputation(v_f, 'recurrente', p_compte);
  return v_f;
end $$;

create or replace function tests.test_a4_88_01_pieces_en_cours() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_c uuid; f3 uuid; f13 uuid; v_d uuid;
begin
  v_c := tests.a4_compte(o, '606300', 'Petit équipement');
  -- F3 (928,20 €) : imputation proposée, puis refusée par le valideur ; F13 (146,48 €) : imputation proposée, à valider.
  f3 := tests.a4_facture_imputee(o, 'F3-TVA-19', 928.20, v_c);
  f13 := tests.a4_facture_imputee(o, 'F13-MCD-1014', 146.48, v_c);
  return next is((select count(*) from public.filed_imputations where facture_id in (f3, f13) and statut = 'proposee'), 2::bigint,
                 'Deux imputations proposées');
  select x.demande_id into v_d from public.filed_validations x where x.facture_id = f3 and x.issue is null;
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  insert into public.approbations (demande_id, decision, commentaire)
  values (v_d, 'rejete', 'TVA à 19 % non justifiée, demander une facture rectificative à 8,5 %');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
  return next ok((select statut from public.filed_factures where id = f3) = 'refusee'
                 and (select statut from public.filed_factures where id = f13) = 'a_valider', 'F3 refusée, F13 à valider');
  -- Le relevé du gérant.
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next is((select count(*) from public.filed_pieces_en_cours(v_cl) where categorie = 'imputation'), 0::bigint,
                 'Plus de ligne « Imputation proposée » : F3 est refusée, F13 est déjà « En attente d''approbation »');
  return next ok((select nombre = 1 and montant_ttc = 146.48 from public.filed_pieces_en_cours(v_cl) where categorie = 'attente'),
                 'F13 en attente d''approbation : 1 pour 146,48 €');
  -- a4_92 (TMOD-01) : F3 refusée reste visible, dans sa catégorie ; chaque pièce comptée une fois.
  return next ok((select nombre = 1 and montant_ttc = 928.20 from public.filed_pieces_en_cours(v_cl) where categorie = 'refusees'),
                 'F3 refusée : 1 pour 928,20 € en « Refusées, à reprendre ou à classer »');
  return next is((select sum(nombre) from public.filed_pieces_en_cours(v_cl)), 2::numeric,
                 'Chaque pièce comptée une fois : deux pièces en cours (F3 refusée, F13 en attente)');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  -- Une facture validée dont l'imputation reste proposée : seule l'imputation reste à valider, elle est comptée.
  update public.filed_factures set statut = 'validee' where id = f13;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next ok((select nombre = 1 and montant_ttc = 146.48 from public.filed_pieces_en_cours(v_cl) where categorie = 'imputation')
                 and not exists (select 1 from public.filed_pieces_en_cours(v_cl) where categorie = 'attente'),
                 'Facture validée, imputation à valider : comptée une fois, en « Imputation proposée »');
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $f$;
