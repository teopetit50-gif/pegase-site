-- c4_44 — OFFLOAD : la relance des prospects qui n'ont pas abouti (ligne N9 de l'audit ; session C4, 27/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_44. Mode essai. runtests() annule tout.

create or replace function tests.c4_prospect(p_ref text, p_nom text, p_email text, p_contact_il_y_a integer, p_canal text, p_note text)
returns uuid language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  v uuid;
begin
  perform tests.redevenir_admin();
  v := public.offload_saisir_compte((banc ->> 'client')::uuid, null, p_ref, p_nom,
    jsonb_build_object('email', p_email, 'contact', 'Mme Durand', 'commercial', 'Sophie'));
  insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note)
  values ((banc ->> 'client')::uuid, (select c.entite_id from public.offload_comptes c where c.id = v), v,
          current_date - p_contact_il_y_a, p_canal, 'Sophie', p_note);
  return v;
end $$;

create or replace function tests.test_c4_44_prospects_non_aboutis() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_collab uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  r1 public.offload_reprises; r2 public.offload_reprises;
  e public.envois;
  d public.demandes_validation;
  res jsonb;
begin
  perform tests.c4_reprises_pretes();
  update public.offload_reglages set vague_jour = null, plafond_reprises_jour = 50, prospects_actifs = true where client_id = v_client;
  -- Une visite il y a quatre mois, avec l'accord de recevoir nos messages ; un appel sans accord ; un échange récent.
  v_p1 := tests.c4_prospect('PR1', 'Durand Hélène', 'h.durand@particulier.test', 120, 'visite', 'Budget serré, cliente hésitante');
  perform public.noter_consentement(v_client, 'email', 'h.durand@particulier.test', 'oral', 'tout',
                                    'Accord donné lors de la visite (jeu d''essai C4)', null, 'offload');
  v_p2 := tests.c4_prospect('PR2', 'Martin Paul', 'p.martin@particulier.test', 130, 'appel', null);
  v_p3 := tests.c4_prospect('PR3', 'Petit Anne', 'a.petit@particulier.test', 10, 'appel', null);

  res := private.offload_prospects_cycle(v_client, null);
  r1 := tests.c4_reprise(v_p1);
  r2 := tests.c4_reprise(v_p2);
  return next ok(r1.nature = 'prospect' and r1.ouverte_par = 'detection' and r2.nature = 'prospect',
                 'Les contacts sans achat dont l''échange est ancien sont repris, comme prospects (' || res::text || ')');
  return next ok(tests.c4_reprise(v_p3) is null or (tests.c4_reprise(v_p3)).id is null,
                 'Un contact avec un échange récent n''est pas sollicité');

  -- Le message : l'échange, dans le vocabulaire du secteur, jamais la note interne ; toujours lu par une personne.
  select * into e from public.envois x where x.id = r1.envoi1_id;
  select * into d from public.demandes_validation x where x.id = e.demande_id;
  return next ok(e.corps like 'Bonjour Mme Durand,%Nous avions échangé le %, lors de votre visite. Je reviens vers vous : où en est %?%'
                 and e.corps like '%répondez simplement « stop »%'
                 and e.corps not like '%Budget%' and e.corps not like '%hésitante%' and e.corps !~ '€'
                 and e.sujet like '% — suite à notre échange du %',
                 'Un message personnel, ancré sur la visite, sans la note du commercial ni aucun prix : ' || left(coalesce(e.corps, ''), 220));
  return next ok(e.mode = 'essai' and d.statut = 'en_attente' and d.type_action = 'offload.message_retenu'
                 and d.payload ->> 'raison' like 'prospect : %toujours lu par une personne',
                 'Il ne part jamais seul : une personne le lit, en mode essai');

  -- Sans accord enregistré, pas de courriel : l'agent appelle.
  return next ok(r2.statut = 'appel' and r2.motif like '%CONSENTEMENT_ABSENT%'
                 and exists (select 1 from public.offload_taches t where t.reprise_id = r2.id and t.type = 'appel' and t.statut = 'a_faire'),
                 'Sans accord enregistré pour son adresse, pas de courriel : une tâche d''appel pour l''agent');

  -- Une seule fois par échange ; la vague et le plafond de l'organisation.
  perform private.offload_prospects_cycle(v_client, null);
  return next is((select count(*)::integer from public.offload_reprises x where x.compte_id in (v_p1, v_p2)), 2,
                 'Pas de seconde reprise sans nouvel échange');
  v_p4 := tests.c4_prospect('PR4', 'Leroy Marc', 'm.leroy@particulier.test', 150, 'salon', null);
  update public.offload_reglages set vague_jour = (extract(isodow from current_date)::integer % 7) + 1 where client_id = v_client;
  res := private.offload_prospects_cycle(v_client, current_date);
  return next ok((res ->> 'vague')::boolean is false and (tests.c4_reprise(v_p4)).id is null,
                 'Hors du jour de la vague, aucun prospect n''est repris : cadence maîtrisée');
  update public.offload_reglages set vague_jour = null, plafond_reprises_jour = 1 where client_id = v_client;
  res := private.offload_prospects_cycle(v_client, current_date);
  return next ok((res ->> 'ouverts')::int = 0 and (tests.c4_reprise(v_p4)).id is null,
                 'Le plafond quotidien vaut aussi pour les prospects : jamais une campagne de masse');

  -- Le réglage : gérant ou administrateur, au journal.
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-prospects@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-prospects@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler_prospects(%L::uuid, false)', v_client), '42501', null,
                        'Un collaborateur n''éteint pas la reprise des prospects');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_regler_prospects(v_client, false);
  perform tests.redevenir_admin();
  update public.offload_reglages set plafond_reprises_jour = 50 where client_id = v_client;
  res := private.offload_prospects_cycle(v_client, current_date);
  return next ok((res ->> 'actifs')::boolean is false and (tests.c4_reprise(v_p4)).id is null
                 and exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.reglages'
                               and j.donnees #>> '{demande,prospects_actifs}' = 'false'),
                 'Éteinte par le gérant, la reprise des prospects s''arrête, et c''est au journal');
  return next ok(exists (select 1 from cron.job where jobname = 'offload-prospects'), 'Le cron offload-prospects est posé');
end $f$;

select * from runtests('tests'::name, '^test_c4_44_');
