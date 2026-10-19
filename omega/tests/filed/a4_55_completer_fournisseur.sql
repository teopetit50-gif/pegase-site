-- Tests A4 — lot 59 (a4_67) : un SIREN ou une TVA lus pour un fournisseur connu à son seul nom : compléter la fiche est
-- proposé, une personne confirme. Doublures : organisation, fournisseurs et SIREN fictifs (clé de Luhn juste).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Une facture d'un fournisseur établi, reconnu à son nom, dont la pièce porte un SIREN (vérifié ou non).
create or replace function tests.a4_facture_par_nom(p_org jsonb, p_four uuid, p_numero text, p_siren text, p_verifie boolean)
returns uuid language plpgsql as $$
declare a jsonb := tests.a4_facture(p_org, 'ia', p_numero, 120); v_f uuid := (a ->> 'facture')::uuid;
begin
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  values ((p_org ->> 'client')::uuid, (a ->> 'piece')::uuid, 'fournisseur.siren', to_jsonb(p_siren), 'SIREN ' || p_siren, 'ia',
          case when p_verifie then 0.98 else 0.4 end, p_verifie);
  update public.filed_factures set fournisseur_id = p_four, fournisseur_identification = 'nom',
         fournisseur_lu = jsonb_build_object('nom', (select nom from public.filed_fournisseurs where id = p_four)), statut = 'a_completer'
   where id = v_f;
  return v_f;
end $$;

create or replace function tests.test_a4_67_01_completer_fournisseur() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid;
  v_boul uuid; v_lead uuid; v_autre uuid; f1 uuid; f2 uuid; f3 uuid; c public.filed_controles; p public.filed_fournisseurs_completions;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values (v_cl, 'BOUL', 'Matériaux de Boulogne d''exemple', 'materiaux de boulogne d exemple', 'FR', 'actif', 'saisie') returning id into v_boul;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values (v_cl, 'LEAD', 'Leader Mat d''exemple', 'leader mat d exemple', 'FR', 'actif', 'saisie') returning id into v_lead;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values (v_cl, 'AUTR', 'Autre négoce d''exemple', 'autre negoce d exemple', 'FR', 'actif', 'saisie') returning id into v_autre;

  -- Un SIREN vérifié sur la pièce : proposé, jamais repris seul ; le message ne dit plus « faute de SIREN ».
  f1 := tests.a4_facture_par_nom(o, v_boul, 'BOUL-001', '412345670', true);
  perform private.filed_controler_facture(f1);
  select * into c from public.filed_controles where facture_id = f1 and code = 'fournisseur.identification';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%412 345 670%'
                 and c.message like '%la compléter est proposé, une personne confirme%' and c.message not like '%faute de SIREN%',
                 'SIREN lu : proposé à une personne, et plus « faute de SIREN »');
  return next ok((select siren from public.filed_fournisseurs where id = v_boul) is null, 'La fiche n''est pas complétée seule (lot 7 compris)');
  select * into p from public.filed_fournisseurs_completions where fournisseur_id = v_boul and champ = 'siren';
  return next ok(p.statut = 'propose' and p.valeur = '412345670' and p.verifie and p.facture_id = f1, 'La proposition : SIREN vérifié, sa facture');

  -- Lu sans vérification : proposé aussi, et dit comme tel.
  f2 := tests.a4_facture_par_nom(o, v_lead, 'LEAD-001', '476543210', false);
  perform private.filed_controler_facture(f2);
  return next ok((select message from public.filed_controles where facture_id = f2 and code = 'fournisseur.identification') like '%476 543 210 (lu sans vérification)%',
                 'SIREN lu sans vérification : proposé, et dit « lu sans vérification »');

  -- Le SIREN de la pièce est celui d'un autre fournisseur : pas de proposition, on le dit.
  f3 := tests.a4_facture_par_nom(o, v_autre, 'AUTR-001', '123456782', true);
  perform private.filed_controler_facture(f3);
  return next ok((select message from public.filed_controles where facture_id = f3 and code = 'fournisseur.identification') like '%qui est celui de%'
                 and not exists (select 1 from public.filed_fournisseurs_completions where fournisseur_id = v_autre),
                 'SIREN d''un autre fournisseur : vérifier, aucune proposition');

  -- Une personne confirme : la fiche est complétée, la facture est reconnue à son SIREN.
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_completer_fournisseur(p.id);
  reset role; perform set_config('request.jwt.claims', '', true);
  return next is((select siren from public.filed_fournisseurs where id = v_boul), '412345670', 'Confirmé par une personne : la fiche porte le SIREN');
  return next ok((select fournisseur_identification from public.filed_factures where id = f1) = 'siren'
                 and (select resultat from public.filed_controles where facture_id = f1 and code = 'fournisseur.identification') = 'ok',
                 'La facture recontrôlée est reconnue à son SIREN');

  -- Écarter, avec un motif : la proposition ne revient pas, le contrôle le dit.
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_ecarter_completion(%L, %L)',
                               (select id from public.filed_fournisseurs_completions where fournisseur_id = v_lead), ''), '22023', null,
                        'Écarter demande un motif');
  perform public.filed_ecarter_completion((select id from public.filed_fournisseurs_completions where fournisseur_id = v_lead), 'SIREN mal lu');
  reset role; perform set_config('request.jwt.claims', '', true);
  return next ok((select statut from public.filed_fournisseurs_completions where fournisseur_id = v_lead) = 'ecarte'
                 and (select siren from public.filed_fournisseurs where id = v_lead) is null
                 and (select message from public.filed_controles where facture_id = f2 and code = 'fournisseur.identification') like '%Écarté par une personne%',
                 'Écarté : la fiche reste sans SIREN, le contrôle le dit');

  -- Sans SIREN ni TVA sur la pièce : le message d'avant.
  f3 := (tests.a4_facture(o, 'ia', 'BOUL-SANS', 120) ->> 'facture')::uuid;
  update public.filed_factures set fournisseur_id = v_lead, fournisseur_identification = 'nom', fournisseur_lu = '{}' where id = f3;
  perform private.filed_controler_facture(f3);
  return next ok((select message from public.filed_controles where facture_id = f3 and code = 'fournisseur.identification') like '%faute de SIREN ou de TVA lisibles%',
                 'Rien sur la pièce : « reconnu à son seul nom, faute de SIREN » reste juste');

  return next ok(not has_function_privilege('anon', 'public.filed_completer_fournisseur(uuid)', 'execute')
                 and not has_table_privilege('anon', 'public.filed_fournisseurs_completions', 'select'),
                 'Ni les propositions ni la confirmation ne sont ouvertes aux anonymes');
end $f$;

-- Complément (A1, b7773e70) : l'IBAN partiellement masqué sur la pièce.
create or replace function tests.test_a4_67_02_iban_masque() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; v_f uuid;
begin
  a := tests.a4_facture(o, 'ia', 'MASQ-001', 120);
  v_f := (a ->> 'facture')::uuid;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  values ((o ->> 'client')::uuid, (a ->> 'piece')::uuid, 'fournisseur.iban', to_jsonb('FR76 **** **** **** **** **** 189'::text),
          'IBAN FR76 **** **** **** **** **** 189', 'ia', 0.9, true);
  perform private.filed_controler_facture(v_f);
  return next ok((select resultat = 'anomalie' and gravite = 'attention' and message = 'IBAN partiellement masqué sur la pièce : à compléter avant paiement.'
                    from public.filed_controles where facture_id = v_f and code = 'iban.masque')
                 and not exists (select 1 from public.filed_controles where facture_id = v_f and code = 'iban.absent'),
                 'IBAN masqué sur la pièce : iban.masque (attention) remplace iban.absent');
  return next ok((select iban from public.filed_factures where id = v_f) is null, 'L''IBAN masqué n''est jamais repris');

  -- Avant paiement : pas de virement noté tant qu'il n'est pas complété ; un chèque, oui.
  update public.filed_factures set statut = 'validee' where id = v_f;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_noter_paiement(%L, null, 10, %L)', v_f, 'virement'), '55000',
                        'IBAN partiellement masqué sur la pièce : à compléter avant paiement.', 'Un virement est refusé');
  return next throws_ok(format('select public.filed_noter_paiement(%L, null, 10)', v_f), '55000', null, 'Sans moyen dit aussi');
  return next lives_ok(format('select public.filed_noter_paiement(%L, null, 10, %L)', v_f, 'cheque'), 'Un chèque se note');
  reset role; perform set_config('request.jwt.claims', '', true);

  -- Sans IBAN du tout sur la pièce : iban.absent, comme avant.
  b := tests.a4_facture(o, 'ia', 'MASQ-002', 120);
  perform private.filed_controler_facture((b ->> 'facture')::uuid);
  return next ok(exists (select 1 from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'iban.absent')
                 and not exists (select 1 from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'iban.masque'),
                 'Rien sur la pièce : iban.absent reste');
end $f$;
