-- Tests A4 — lot 73 (a4_81) : TFILED-21, identite.siren dit sa source et confronte le SIREN lu non vérifié à celui de la
-- fiche. Doublures : organisation et fournisseur d'exemple, SIREN fictifs à clé juste (912345618, 912345626, 912345634, 123456782).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_identifiants_lus (a4_62_cles_identifiants.sql), à poser avant. Ce fichier ne supprime rien.

-- Une facture d'un fournisseur dont la fiche porte p_siren, et ce que le lecteur a lu.
create or replace function tests.a4_facture_fiche_siren(p_org jsonb, p_numero text, p_siren text, p_lu jsonb) returns uuid
language plpgsql as $$
declare v_f uuid := tests.a4_facture_identifiants_lus(p_org, p_numero, '{}');
begin
  update public.filed_fournisseurs set siren = p_siren
   where id = (select fournisseur_id from public.filed_factures where id = v_f);
  update public.filed_factures set fournisseur_lu = p_lu where id = v_f;
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.test_a4_81_01_siren_source() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f uuid; c public.filed_controles;
begin
  -- 069 : la fiche porte 912345618, la pièce le même, non vérifié.
  f := tests.a4_facture_fiche_siren(o, 'SRC-001', '912345618', '{"non_verifie": {"siren": "912345618"}}');
  select * into c from public.filed_controles where facture_id = f and code = 'identite.siren';
  return next ok(c.resultat = 'ok' and c.message like 'SIREN 912345618, celui de la fiche du fournisseur : clé correcte. La pièce porte le même, lu sans être vérifié.',
                 'La source est dite : la fiche, et la pièce porte le même, non vérifié');
  -- La pièce en porte un autre : bloquant.
  f := tests.a4_facture_fiche_siren(o, 'SRC-002', '912345626', '{"non_verifie": {"siren": "123456782"}}');
  select * into c from public.filed_controles where facture_id = f and code = 'identite.siren';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Le SIREN lu sur la pièce (123456782, non vérifié) n''est pas celui du fournisseur (912345626)%',
                 'Un SIREN lu différent de la fiche : bloquant');
  -- Lu et vérifié sur la pièce : dit comme tel.
  f := tests.a4_facture_fiche_siren(o, 'SRC-003', '912345634', '{"siren": "912345634"}');
  return next is((select message from public.filed_controles where facture_id = f and code = 'identite.siren'),
                 'SIREN 912345634, lu sur la pièce : clé correcte.', 'Lu sur la pièce : dit comme tel');
end $f$;
