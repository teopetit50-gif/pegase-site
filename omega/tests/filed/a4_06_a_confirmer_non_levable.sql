-- Tests A4 — a4_12 : le contrôle « fournisseur.a_confirmer » ne se lève pas avec un motif, ni par le déposant ni par
-- personne ; la sortie est filed_confirmer_fournisseur. Données d'exemple seulement ; tout est annulé (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_v uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_statut text; v_ok boolean;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now() from unnest(array[v_v, v_c]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 quater');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  update public.entites set siren = '987654329' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_v, v_cl, 'valideur'), (v_c, v_cl, 'gerant');
  set local role service_role; perform public.filed_installer(v_cl); reset role;

  -- Une facture d'un fournisseur nouveau, déposée par le gérant v_c.
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-nouveau.pdf', 'application/pdf', 2048, repeat('5', 64), v_cl::text || '/filed_document/test/facture-nouveau.pdf', 'filed_document', 'nouveau', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 5, v_piece, 'depot', v_c, 'facture-nouveau.pdf', repeat('5', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, document_origine)
  values (v_cl, 'NOU', 'Fournisseur nouveau d''exemple', 'fournisseur nouveau d exemple', 'FR', 'a_confirmer', 'facture', v_doc) returning id into v_four;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'NOU-1', 'NOU1', date '2026-09-30', current_date, 'EUR', 100, 20, 120, v_four, 'creation', '{"nom": "Fournisseur nouveau d''exemple"}', '{"siren": "987654329"}', repeat('6', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'bloquee' and (select resultat from public.filed_controles where facture_id = v_f and code = 'fournisseur.a_confirmer') = 'anomalie', 'bloquée sur fournisseur.a_confirmer';

  -- ── 1. Aucune levée de ce contrôle n'entre dans filed_levees, même posée par le propriétaire de la base ──
  begin
    insert into public.filed_levees (client_id, facture_id, document_id, code, cle, motif)
    values (v_cl, v_f, v_doc, 'fournisseur.a_confirmer', '', 'Je connais ce fournisseur.');
    raise exception 'une levée de fournisseur.a_confirmer est entrée dans filed_levees';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK filed_levees refuse la levée de fournisseur.a_confirmer';

  -- ── 2. Par la porte de l'écran (si elle existe ici) : ni le déposant, ni le valideur ──
  if to_regprocedure('public.filed_lever_anomalie(uuid, text, text)') is not null then
    foreach v_ok in array array[true, false] loop
      set local role authenticated;
      perform set_config('request.jwt.claims', json_build_object('sub', case when v_ok then v_c else v_v end, 'role', 'authenticated')::text, true);
      begin
        perform public.filed_lever_anomalie(v_f, 'fournisseur.a_confirmer', 'Je connais ce fournisseur.');
      exception when others then null;
      end;
      reset role;
    end loop;
    assert (select resultat from public.filed_controles where facture_id = v_f and code = 'fournisseur.a_confirmer') = 'anomalie', 'la porte de levée n''a pas levé le contrôle';
    assert (select statut from public.filed_factures where id = v_f) = 'bloquee', 'la facture reste bloquée';
    raise notice 'OK filed_lever_anomalie : ni le déposant ni le valideur ne lèvent fournisseur.a_confirmer';
  else
    raise notice 'public.filed_lever_anomalie absente ici (souche locale) : cas 2 non joué';
  end if;

  -- ── 3. Une levée antérieure au correctif ne vaut plus : le résultat reste « anomalie » ──
  update public.filed_controles set resultat = 'levee' where facture_id = v_f and code = 'fournisseur.a_confirmer';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'fournisseur.a_confirmer') = 'anomalie', 'filed_controles garde l''anomalie';
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'bloquee', 'recontrôlée : toujours bloquée (' || v_statut || ')';
  raise notice 'OK une levée ancienne ne débloque pas la facture';

  -- ── 4. La sortie reste la confirmation, par une autre personne que le déposant ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin
    perform public.filed_confirmer_fournisseur(v_four, 'Je l''ai déposée.');
    raise exception 'le déposant a pu confirmer';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  perform public.filed_confirmer_fournisseur(v_four, 'Devis signé, fournisseur connu.');
  reset role;
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'fournisseur.a_confirmer') = 'ok', 'confirmé : contrôle ok';
  assert (select statut from public.filed_factures where id = v_f) = 'a_valider', 'confirmé : facture à valider';
  raise notice 'FOURNISSEUR À CONFIRMER NON LEVABLE (a4_12) : tous les contrôles passent.';
end $$;
rollback;
