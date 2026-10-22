-- c3_35 — REPUT, TREPUT-07 : l'accusé encore en attente se clôt quand la demande est répondue, refusée ou regroupée ; une
-- demande qui attend garde le sien. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_34 (aides
-- tests.c3_*) et les migrations c3_01 à c3_35. Rien n'est envoyé (mode essai). runtests() annule tout.

create or replace function tests.test_c3_35_accuses_clos() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; a uuid; b uuid; c uuid; v_j jsonb; v_dv uuid; v_envoi uuid;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('accuse', true));
  perform tests.redevenir_admin();

  -- ── La réponse part : l'accusé en attente est annulé, son envoi avec lui ──
  a := (tests.c3_repondre(v_client, 'c3-35a@exemple.test', 'Fictif A', 'Ouvrez-vous samedi ?', 'horaires', false, null,
                          'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  v_j := private.reput_accuser(a);
  v_envoi := (v_j ->> 'envoi')::uuid;
  select v.id into v_dv from public.demandes_validation v where v.objet_id = a::text and v.type_action = 'reput.accuser';
  return next is((select statut from public.demandes_validation where id = v_dv), 'en_attente', 'L''accusé attend sa validation');
  update public.reput_demandes set statut = 'envoyee', envoyee_le = now() where id = a;
  return next is((select statut from public.demandes_validation where id = v_dv), 'annulee', 'Réponse envoyée : l''accusé est annulé');
  return next is((select statut from public.envois where id = v_envoi), 'annule', 'Son envoi se clôt avec lui');
  return next ok(tests.c3_journal(v_client, 'reput.accuse_clos', a::text) is not null, 'Journal : reput.accuse_clos');

  -- ── Regroupée : même règle ──
  b := (tests.c3_repondre(v_client, 'c3-35b@exemple.test', 'Fictif B', 'Un devis ?', 'tarifs', false, null, 'Nous revenons vers vous.') ->> 'demande')::uuid;
  perform private.reput_accuser(b);
  update public.reput_demandes set statut = 'ignoree', motif = 'Regroupée (C3-35).' where id = b;
  return next is((select statut from public.demandes_validation where objet_id = b::text and type_action = 'reput.accuser'), 'annulee',
                 'Demande regroupée : son accusé est annulé');

  -- ── Une demande qui attend garde son accusé ──
  c := (tests.c3_repondre(v_client, 'c3-35c@exemple.test', 'Fictif C', 'Une réclamation.', 'reclamation', false, null, 'Nous regardons.') ->> 'demande')::uuid;
  perform private.reput_accuser(c);
  update public.reput_demandes set statut = 'a_traiter' where id = c;
  return next is((select statut from public.demandes_validation where objet_id = c::text and type_action = 'reput.accuser'), 'en_attente',
                 'À traiter : l''accusé reste à valider');
  return next is(private.reput_clore_accuse(a), 0, 'Rejouer ne fait rien (rattrapage idempotent)');
end $f$;

select * from runtests('tests'::name, '^test_c3_35_');
