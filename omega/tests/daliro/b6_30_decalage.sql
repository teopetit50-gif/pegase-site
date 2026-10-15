-- b6_30 — DALIRO : le sous-traitant prévenu quand son passage est décalé (session B6, 15/10/2026), b6_34.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_34.
-- runtests() annule tout. Le plaquiste (lot client) prend du retard ; l'électricien (sous-traitant, déjà sollicité)
-- et le peintre (sous-traitant, pas encore sollicité) sont en aval.

create or replace function tests.b6_texte_decalage(p_client uuid, p_charge jsonb) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_texte_decalage(p_client, p_charge) $$;

create or replace function tests.test_b6_30_decalage() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_elec uuid; v_peint uuid; v_ch uuid; v_l0 uuid; v_l1 uuid; v_l2 uuid; v_a uuid; v_b uuid; v_c uuid;
  v_l date := date_trunc('week', current_date + 35)::date; v_r jsonb; v_debut_b date; v_t jsonb;
  v_tel text := lpad((floor(random() * 9000000) + 1000000)::bigint::text, 7, '0');
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du décalage') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal) values (v_client, array['sous_traitant'], 'Électricité du décalage', '+3365' || v_tel, 'sms') returning id into v_elec;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal) values (v_client, array['sous_traitant'], 'Peinture du décalage', '+3366' || v_tel, 'sms') returning id into v_peint;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier du décalage', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '05', 'Plâtrerie', 'client') returning id into v_l0;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '06', 'Électricité', 'sous_traitant', v_elec) returning id into v_l1;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '07', 'Peinture', 'sous_traitant', v_peint) returning id into v_l2;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin) values (v_client, v_ch, v_l0, 'Doublages', v_l, v_l + 4) returning id into v_a;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tiers_id, tache, debut, fin, confirmation)
  values (v_client, v_ch, v_l1, v_elec, 'Gaines et boîtiers', v_l + 7, v_l + 8, 'confirmee') returning id into v_b;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tiers_id, tache, debut, fin)
  values (v_client, v_ch, v_l2, v_peint, 'Peinture', v_l + 14, v_l + 16) returning id into v_c;
  insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id, delai_min_jours) values (v_client, v_ch, v_a, v_b, 0), (v_client, v_ch, v_b, v_c, 0);

  -- ── Le plaquiste finit trois jours ouvrés plus tard ──
  v_r := public.btp_recaler(v_a, public.ajouter_jours(v_l + 4, 3, 'ouvres', 'metropole'), 'Retard des doublages');
  select p.debut into v_debut_b from public.btp_passages p where p.id = v_b;
  return next ok(v_debut_b > v_l + 7, 'L''électricien est décalé en aval');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.genre = 'daliro.decalage'
                         and t.charge ->> 'passage' = v_b::text and (t.charge ->> 'nouveau_debut')::date = v_debut_b
                         and (t.charge ->> 'ancien_debut')::date = v_l + 7 and t.charge ->> 'etait' = 'confirmee')
                 or not exists (select 1 from private.abonnements a where a.evenement = 'daliro.passage_decale'),
                 'Un travail daliro.decalage est déposé pour l''électricien déjà sollicité : ancienne et nouvelle date');
  return next ok(not exists (select 1 from public.travaux t where t.client_id = v_client and t.genre = 'daliro.decalage' and t.charge ->> 'passage' = v_c::text),
                 'Le peintre, pas encore sollicité, n''est pas prévenu (sa demande J-2 partira à la nouvelle date)');
  return next ok(not exists (select 1 from public.travaux t where t.client_id = v_client and t.genre = 'daliro.decalage' and t.charge ->> 'passage' = v_a::text),
                 'Le passage recalé lui-même (équipe interne) ne déclenche pas d''envoi');

  -- ── Le message ──
  v_t := tests.b6_texte_decalage(v_client, jsonb_build_object('tiers_nom', 'Électricité du décalage', 'chantier_nom', 'Chantier du décalage', 'tache', 'Gaines et boîtiers',
                                                             'ancien_debut', v_l + 7, 'nouveau_debut', v_debut_b));
  return next ok(v_t ->> 'corps' like 'Bonjour Électricité du décalage,%est décalé au %ne vous déplacez pas à l''ancienne date.%redemandée deux jours avant.%',
                 'Le message dit le décalage et que la confirmation sera redemandée');
  return next ok(v_t ->> 'sujet' like 'Passage décalé au % — Chantier du décalage', 'Un sujet court');

  -- ── L'ouvrier sait le traiter ──
  return next ok(pg_get_functiondef('private.btp_ouvrier(integer)'::regprocedure) like '%btp_envoyer_decalage(t)%', 'L''ouvrier prend les travaux daliro.decalage');
  return next ok(not has_function_privilege('authenticated', 'private.btp_envoyer_decalage(public.travaux)', 'execute'), 'L''envoi reste au serveur');
end $f$;

select * from runtests('tests'::name, '^test_b6_30_');
