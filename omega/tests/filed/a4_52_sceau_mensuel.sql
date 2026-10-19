-- Tests A4 — lot 56 (a4_64) : l'envoi mensuel du sceau de l'historique. Doublures : organisations, gérants et lignes d'historique d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), à poser avant.
-- Ce fichier ne supprime rien.

-- Trois lignes d'historique chaînées, datées du mois dernier.
create or replace function tests.a4_historique_mois_dernier(p_org jsonb) returns void language plpgsql as $$
begin
  insert into public.filed_historique (client_id, objet_type, objet_id, etape, message, acteur_type, survenu_le)
  select (p_org ->> 'client')::uuid, 'filed_document', 'test-' || n, 'lu', 'Ligne d''exemple ' || n, 'systeme',
         date_trunc('month', now()) - interval '10 days' + n * interval '1 hour'
  from generate_series(1, 3) n;
end $$;

create or replace function tests.test_a4_64_01_sceau_mensuel() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); b jsonb := tests.a4_organisation();
  v_mois date := (date_trunc('month', now()) - interval '1 month')::date;
  s public.filed_sceaux; x public.filed_exports; e public.envois; v_rang bigint;
begin
  perform tests.a4_historique_mois_dernier(o);
  perform tests.a4_historique_mois_dernier(b);
  -- Le gérant de la seconde organisation a une adresse que l'envoi refuse.
  update auth.users set email = 'bloque-' || id::text || '@exemple.test' where id = (b ->> 'gerant')::uuid;
  select max(rang) into v_rang from public.filed_historique where client_id = (o ->> 'client')::uuid
     and survenu_le < date_trunc('month', now());

  return next ok(private.filed_sceller_mois_ecoule(current_date) >= 2, 'Le balayage scelle le mois écoulé de chaque organisation');
  select * into s from public.filed_sceaux where client_id = (o ->> 'client')::uuid and mois = v_mois;
  return next ok(s.id is not null and s.rang = v_rang and s.empreinte is not null and s.chaine_intacte,
                 'Le sceau : dernier rang du mois, son empreinte, chaîne intacte');

  select * into x from public.filed_exports where id = s.export_id;
  return next ok(x.tableau = 'sceau_historique' and x.contenu like '%' || s.empreinte || '%'
                 and x.sha256 = encode(sha256(convert_to(x.contenu, 'UTF8')), 'hex'),
                 'Son export : le CSV porte l''empreinte, et l''export la sienne');

  -- Ne regarder que ce que le test a créé : l'entrée de SON gérant, et l'absence de son valideur.
  select * into e from public.envois
   where id = (select (g ->> 'envoi')::uuid from jsonb_array_elements(s.envois) g where (g ->> 'gerant')::uuid = (o ->> 'gerant')::uuid);
  return next ok(e.id is not null and e.destinataire_membre = (o ->> 'gerant')::uuid
                 and not exists (select 1 from jsonb_array_elements(s.envois) g where (g ->> 'gerant')::uuid = (o ->> 'valideur')::uuid),
                 'Un courriel au gérant, aucun au valideur');
  return next ok(e.sujet like 'FILED — sceau de l''historique, %' and e.corps like '%' || s.empreinte || '%'
                 and e.corps like '%/filed/comptabilite?export=' || s.export_id::text || '%' and e.corps like '%aucune pièce jointe%',
                 'Gabarit fermé : sujet fixe, empreinte et lien vers l''export dans le corps');
  return next ok(cardinality(coalesce(e.pieces, '{}')) = 0 and e.objet_type = 'filed_sceau' and e.transactionnel,
                 'Sans pièce jointe, transactionnel, rattaché au sceau');
  return next ok(e.statut <> 'envoye', 'Comme tout envoi d''un moteur, il passe par la validation du socle (aucun envoi direct) : ' || e.statut);

  -- Rejouable : le même mois ne se scelle pas deux fois, aucun courriel de plus.
  perform private.filed_sceller_mois_ecoule(current_date);
  return next is((select count(*)::int from public.filed_sceaux where client_id = (o ->> 'client')::uuid), 1, 'Un sceau par mois');
  return next is((select count(*)::int from public.envois where objet_id = s.id::text), 1, 'Pas de second courriel');

  -- Envoi refusé : le sceau et l'export restent, une alerte le dit au gérant.
  select * into s from public.filed_sceaux where client_id = (b ->> 'client')::uuid and mois = v_mois;
  return next ok(s.statut = 'non_envoye' and s.export_id is not null and s.motif like '%verrouillé%',
                 'Courriel verrouillé : sceau non envoyé, export gardé, motif dit');
  return next ok(exists (select 1 from public.alertes a where a.client_id = (b ->> 'client')::uuid and a.cle_regroupement like '%sceau:' || s.id::text),
                 'Une alerte interne le dit au gérant');

  -- Le balayage quotidien porte le sceau ; rien n'est ouvert aux comptes.
  return next ok(pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure) like '%filed_sceller_mois_ecoule(p_aujourdhui)%',
                 'Branché dans le balayage quotidien');
  return next ok(not has_function_privilege('authenticated', 'private.filed_sceller_mois(uuid, date)', 'execute')
                 and not has_table_privilege('anon', 'public.filed_sceaux', 'select'),
                 'Le sceau se fait au balayage, pas à la demande d''un compte');
end $f$;
