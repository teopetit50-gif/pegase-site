-- Tests A4 — lot 52 (a4_60) : un IBAN lu à la place du numéro de TVA. Doublures : IBAN d'exemple à clé juste.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_60_01_iban_comme_tva() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; c jsonb; f public.filed_factures; v_iban text := 'FR7630006000011234567890189';
begin
  -- L'IBAN rendu comme TVA : pas une TVA, proposé comme IBAN, jamais repris.
  a := tests.a4_facture(o, 'ia', 'IBT-001', 300);
  update public.filed_factures set fournisseur_lu = jsonb_build_object('tva', 'FR76 3000 6000 0112 3456 7890 189') where id = (a ->> 'facture')::uuid;
  perform private.filed_controler_facture((a ->> 'facture')::uuid);
  select * into f from public.filed_factures where id = (a ->> 'facture')::uuid;
  return next is((select resultat from public.filed_controles where facture_id = f.id and code = 'identite.tva_iban'), 'anomalie',
                 'La valeur au format IBAN n''est pas tenue pour un numéro de TVA');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f.id and code = 'identite.tva_intracom'
                              and message like '%invalide%'), 'et n''est pas jugée comme une TVA invalide');
  return next ok(f.fournisseur_lu ->> 'iban_propose' = v_iban and f.iban is null, 'Proposée comme IBAN à vérifier, pas reprise sur la facture');
  return next is((select resultat from public.filed_controles where facture_id = f.id and code = 'iban.propose'), 'anomalie', 'le contrôle le dit');

  -- Lue sans vérification (non_verifie) : même chose, et le message « TVA lue non vérifiée » ne la cite plus.
  b := tests.a4_facture(o, 'ia', 'IBT-002', 300);
  update public.filed_factures set fournisseur_lu = jsonb_build_object('non_verifie', jsonb_build_object('tva', v_iban)) where id = (b ->> 'facture')::uuid;
  perform private.filed_controler_facture((b ->> 'facture')::uuid);
  return next ok(exists (select 1 from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'identite.tva_iban')
                 and not exists (select 1 from public.filed_controles where facture_id = (b ->> 'facture')::uuid and message like '%' || v_iban || '%'),
                 'Lue sans vérification : écartée aussi, jamais citée en clair');

  -- Une vraie TVA reste jugée comme avant ; une facture qui a déjà un IBAN ne reçoit pas de proposition.
  c := tests.a4_facture(o, 'ia', 'IBT-003', 300);
  update public.filed_factures set fournisseur_lu = jsonb_build_object('tva', v_iban), iban = 'FR1420041010050500013M02606' where id = (c ->> 'facture')::uuid;
  perform private.filed_controler_facture((c ->> 'facture')::uuid);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = (c ->> 'facture')::uuid and code = 'iban.propose'),
                 'Avec un IBAN déjà sur la facture : pas de proposition');
  return next is((select resultat from public.filed_controles where facture_id = (tests.a4_facture(o, 'ia', 'IBT-004', 300) ->> 'facture')::uuid and code = 'identite.tva_iban'),
                 null, 'Sans IBAN lu comme TVA : rien de nouveau');
end $f$;
