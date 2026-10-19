-- Tests A4 — lot 43 (a4_51) : plusieurs boîtes de réception par organisation, la limite du palier. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql) et tests.a4_reception (a4_13_reception_courriel.sql), à poser avant. Ne supprime rien.

-- Une boîte de réception FILED du socle (comme A2 la crée). Le socle n'admet qu'un expéditeur ACTIF par organisation,
-- canal et module (expediteurs_un_actif_idx) : une boîte qui ne fait que recevoir reste « a_verifier » ;
-- public.resoudre_boite la trouve quel que soit son statut. Rend son id.
create or replace function tests.a4_boite(p_org jsonb, p_adresse text) returns uuid language sql as $$
  insert into public.expediteurs (client_id, module, canal, fournisseur, identite, statut)
  values ((p_org ->> 'client')::uuid, 'filed', 'email', 'brevo', p_adresse, 'a_verifier') returning id
$$;

create or replace function tests.test_a4_51_01_boites() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_e2 uuid; b1 uuid; b2 uuid; b3 uuid; v_r bigint; e jsonb;
begin
  insert into public.entites (client_id, nom, principale) values (v_cl, 'Filiale d''exemple', false) returning id into v_e2;
  b1 := tests.a4_boite(o, 'factures-siege@recu.exemple.test');
  b2 := tests.a4_boite(o, 'factures-filiale@recu.exemple.test');
  b3 := tests.a4_boite(o, 'factures-trois@recu.exemple.test');

  -- Sans abonnement : pas de limite ; deux boîtes, deux sociétés.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_declarer_boite(v_cl, b1, (o ->> 'entite')::uuid, 'Siège');
  perform public.filed_declarer_boite(v_cl, b2, v_e2, 'Filiale');
  reset role;

  -- Un courriel reçu dans la boîte de la filiale est rangé dans la filiale.
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(jsonb_build_object('nom', 'f-filiale.pdf', 'mime', 'application/pdf', 'taille', 1000,
           'sha256', repeat('e', 64), 'chemin', v_cl::text || '/receptions/msg-b2/f-filiale.pdf')));
  update public.receptions set boite = 'Factures-Filiale@recu.exemple.test' where id = v_r;
  perform private.filed_rattacher_reception(v_r);
  return next is((select d.entite_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
                   where p.chemin = v_cl::text || '/receptions/msg-b2/f-filiale.pdf'), v_e2, 'La boîte de la filiale range dans la filiale');

  -- Une boîte non déclarée reçoit comme avant, dans la société principale.
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(jsonb_build_object('nom', 'f-trois.pdf', 'mime', 'application/pdf', 'taille', 1000,
           'sha256', repeat('f', 64), 'chemin', v_cl::text || '/receptions/msg-b3/f-trois.pdf')));
  update public.receptions set boite = 'factures-trois@recu.exemple.test' where id = v_r;
  perform private.filed_rattacher_reception(v_r);
  return next is((select d.entite_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
                   where p.chemin = v_cl::text || '/receptions/msg-b3/f-trois.pdf'), (o ->> 'entite')::uuid,
                 'Une boîte non déclarée continue de recevoir : société principale, rien de perdu');

  -- Au palier Standard (deux boîtes), une troisième est refusée.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_changer_palier(v_cl, 'STANDARD');
  return next throws_ok(format('select public.filed_declarer_boite(%L, %L)', v_cl, b3), '55000', null, 'Standard : deux boîtes, pas trois');
  e := public.filed_boites_etat(v_cl);
  reset role;
  return next ok((e ->> 'limite')::int = 2 and (e ->> 'declarees')::int = 2 and (e ->> 'non_declarees')::int = 1,
                 'L''état dit la limite, les boîtes déclarées et celle qui ne l''est pas : ' || (e - 'boites')::text);

  -- Retirer une boîte libère la place ; une adresse d'un autre module est refusée.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_retirer_boite((select id from public.filed_boites where expediteur_id = b1));
  return next lives_ok(format('select public.filed_declarer_boite(%L, %L)', v_cl, b3), 'Une boîte retirée libère la place');
  reset role;
  update public.expediteurs set module = 'lorani' where id = b1;
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_declarer_boite(%L, %L)', v_cl, b1), '22023', null, 'Une boîte d''un autre module n''est pas une boîte FILED');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_declarer_boite(%L, %L)', v_cl, b2), '42501', null, 'Le valideur ne déclare pas de boîte');
  reset role;
end $f$;
