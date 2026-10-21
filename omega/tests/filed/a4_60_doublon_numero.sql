-- Tests A4 — lot 64 (a4_72) : TFILED-04, même numéro avec un autre montant : doublon.numero, pas doublon.exact.
-- Doublures : organisation et factures d'exemple (le cas F4 / F4b : MCD-2026-1001, 846,30 puis 848,47).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_72_01_doublon_numero() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); x jsonb; v_a uuid; v_b uuid; v_c uuid;
begin
  -- Trois pièces au même numéro ; le registre (figé) donne leur ordre de réception, et les montants suivent cet ordre :
  -- la première 846,30 (F4), la deuxième 848,47 (F4b), la troisième 846,30 (vrai doublon de la première).
  x := tests.a4_facture(o, 'ia', 'MCD-2026-1001', 846.30); x := tests.a4_facture(o, 'ia', 'MCD-2026-1001', 846.30);
  x := tests.a4_facture(o, 'ia', 'MCD-2026-1001', 846.30);
  select (array_agg(f.id order by d.annee_reception, d.numero_reception))[1], (array_agg(f.id order by d.annee_reception, d.numero_reception))[2],
         (array_agg(f.id order by d.annee_reception, d.numero_reception))[3]
    into v_a, v_b, v_c
    from public.filed_factures f join public.filed_documents d on d.id = f.document_id
   where f.client_id = (o ->> 'client')::uuid and f.numero = 'MCD-2026-1001';
  update public.filed_factures set montant_ttc = 848.47, montant_ht = 707.06, montant_tva = 141.41 where id = v_b;
  perform private.filed_controler_facture(v_a);
  perform private.filed_controler_facture(v_b);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = v_b and code = 'doublon.exact' and resultat = 'anomalie'),
                 'F4b : pas de doublon.exact en anomalie');
  return next ok((select resultat = 'anomalie' and gravite = 'bloquant' and message like 'Même numéro que la pièce %, pour un montant de 848,47 € au lieu de 846,30 €%'
                    from public.filed_controles where facture_id = v_b and code = 'doublon.numero'),
                 'F4b : doublon.numero, bloquant, avec le message d''avant');
  return next ok((select statut from public.filed_factures where id = v_b) = 'bloquee', 'F4b est bloquée, pas écartée');

  -- Le vrai doublon (même numéro, même date, même montant que la première) reste doublon.exact et est écarté.
  perform private.filed_controler_facture(v_c);
  return next ok((select resultat = 'anomalie' from public.filed_controles where facture_id = v_c and code = 'doublon.exact')
                 and (select statut from public.filed_factures where id = v_c) = 'ecartee'
                 and not exists (select 1 from public.filed_controles where facture_id = v_c and code = 'doublon.numero'),
                 'Le vrai doublon : doublon.exact, écarté, sans doublon.numero');

  -- Au banc : les cas de TTC contradictoires attendent doublon.numero.
  return next is(private.filed_banc_juger('doublon.numero', '{"resultat": "anomalie"}',
                   private.filed_banc_scenario((o ->> 'client')::uuid, (select scenario from private.filed_banc_cas where code = 'EINVOI-COH-FXC-013'))),
                 'juste', 'Banc : COH-FXC-013 (TTC contradictoire) → doublon.numero');
end $f$;
