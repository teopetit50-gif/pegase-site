-- c4_41 — OFFLOAD : le point du matin et chaque message à valider arrivent par courriel (ligne 39 de l'audit ; session C4,
-- 27/10/2026). Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_41. Mode essai. runtests() annule tout.

create or replace function tests.test_c4_41_validations_par_courriel() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_a uuid;
  r public.offload_reprises;
  v_dem uuid;
  v_items jsonb;
  v_fuseau text;
  v_jour date;
  v_point uuid;
  v_statut text;
  e public.envois;
begin
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('VC41', 'Garage Courriel', 'atelier@courriel41.test', 70);
  perform private.offload_ouvrir(v_a, 'manuel');
  r := tests.c4_reprise(v_a);
  select x.demande_id into v_dem from public.envois x where x.id = r.envoi1_id;

  -- Chaque message à valider, en une ligne : nature, destinataire, objet, début du texte, lien vers sa demande.
  v_items := private.offload_point_validations(v_client, 20);
  return next ok(exists (select 1 from jsonb_array_elements(v_items) i
                         where i ->> 'lien' = '/espace2/validations?demande=' || v_dem
                           and i ->> 'texte' like 'Reprise · Martin <atelier@courriel41.test> — « %» — %'
                           and char_length(i ->> 'texte') <= 300 and (i ->> 'texte') !~ '[[:cntrl:]]'),
                 'Chaque message à valider tient en une ligne : nature, destinataire, objet, début du texte et lien vers sa demande');

  -- Le dépôt du matin : une section « Messages à valider » pour qui décide, pas pour le collaborateur.
  v_fuseau := private.offload_fuseau(v_client);
  v_jour := (now() at time zone v_fuseau)::date;
  perform private.offload_deposer_points((v_jour + time '06:00') at time zone v_fuseau);
  return next ok(exists (select 1 from public.points_sections s join public.points_items i on i.section_id = s.id
                         where s.client_id = v_client and s.module = 'offload' and s.jour = v_jour and s.role = 'valideur'
                           and s.titre = 'Messages à valider' and i.lien = '/espace2/validations?demande=' || v_dem)
                 and exists (select 1 from public.points_sections s where s.client_id = v_client and s.module = 'offload'
                               and s.jour = v_jour and s.role = 'gerant' and s.titre = 'Messages à valider')
                 and not exists (select 1 from public.points_sections s where s.client_id = v_client and s.module = 'offload'
                                   and s.jour = v_jour and s.role = 'collaborateur' and s.titre = 'Messages à valider'),
                 'Le point du matin porte les messages à valider, pour le gérant et le valideur, pas pour le collaborateur');
  return next ok(not exists (select 1 from public.points_sections s join public.points_items i on i.section_id = s.id
                             where s.client_id = v_client and s.module = 'offload' and s.jour = v_jour
                               and i.lien like '/espace/%'),
                 'Les liens du point mènent à /espace2');

  -- Le courriel du matin du gérant, par la porte d'envoi du socle, en mode essai.
  insert into public.reglages_envois (client_id, module, mode, essai_adresse)
  values (v_client, 'point_du_matin', 'essai', 'point-c4@essai.invalid')
  on conflict (client_id, module) do update set mode = 'essai', essai_adresse = excluded.essai_adresse;
  update public.points_reglages set actif = true, heure = time '07:00', territoire = 'metropole', jours = '{1,2,3,4,5,6,7}', sauf_feries = false
   where client_id = v_client and user_id is null;
  insert into public.points_reglages (client_id, user_id, actif, heure, territoire, jours, sauf_feries)
  select v_client, null, true, time '07:00', 'metropole', '{1,2,3,4,5,6,7}', false
  where not exists (select 1 from public.points_reglages x where x.client_id = v_client and x.user_id is null);
  update public.points_reglages set actif = true, heure = time '07:00', territoire = 'metropole', jours = '{1,2,3,4,5,6,7}', sauf_feries = false
   where client_id = v_client and user_id = v_gerant;
  v_point := private.point_assembler(v_client, v_gerant, v_jour, (v_jour + time '09:00') at time zone 'Europe/Paris');
  return next ok(v_point is not null, 'Le point du gérant est assemblé');
  if v_point is null then
    return;
  end if;
  v_statut := private.point_remettre(v_point);
  select x.* into e from public.envois x where x.id = (select p.envoi_id from public.points_du_jour p where p.id = v_point);
  return next ok(v_statut = 'remis' and e.canal = 'email' and e.mode = 'essai' and e.destinataire_membre = v_gerant,
                 'Il part au gérant par courriel, en mode essai : rien ne va chez un vrai destinataire (' || coalesce(v_statut, '') || ')');
  return next ok(e.corps like '%Messages à valider%' and e.corps like '%atelier@courriel41.test%' and e.corps like '%Clients qui décrochent%',
                 'Le courriel porte les messages à valider, avec leur destinataire, et le point des comptes');
end $f$;

select * from runtests('tests'::name, '^test_c4_41_');
