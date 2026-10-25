-- c4_37 — OFFLOAD : la reprise après refus (socle 19az ; session C4, 25/10/2026). Après c4_00, c4_03, c4_08, c4_09
-- (aides) et les migrations c4_01 à c4_37. Mode essai. runtests() annule tout.

-- Un refus du gérant du banc, avec ou sans commentaire.
create or replace function tests.c4_refuser(p_demande uuid, p_commentaire text) returns void
language plpgsql as $$
declare banc jsonb := tests.c4_banc();
begin
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (p_demande, (banc ->> 'client')::uuid, (banc ->> 'gerant')::uuid, 'rejete', p_commentaire);
  perform tests.redevenir_admin();
end $$;

create or replace function tests.c4_demande_de(p_envoi uuid) returns uuid
language sql stable as $$ select e.demande_id from public.envois e where e.id = p_envoi $$;

create or replace function tests.test_c4_37_reprise_apres_refus() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_aff uuid;
  ra public.offload_reprises; rb public.offload_reprises; rc public.offload_reprises;
  af public.offload_affaires;
  v_da uuid; v_db uuid; v_dc uuid; v_dd uuid; v_rep uuid; v_rep_d uuid;
  e public.envois;
  q public.demandes_validation;
begin
  if to_regclass('private.reprises') is null then
    return next ok(true, 'Lot socle 19az absent : reprise non vérifiable ici');
    return;
  end if;
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('RR1', 'Reprise Corrigée', 'achats@corrigee.test', 70);
  v_b := tests.c4_compte_courriel('RR2', 'Reprise Identique', 'achats@identique.test', 70);
  v_c := tests.c4_compte_courriel('RR3', 'Refus Muet', 'achats@muet.test', 70);
  v_d := tests.c4_compte_courriel('RR4', 'Garage Adresse', 'atelier@ancienne.test', 70);
  perform private.offload_ouvrir(v_a, 'manuel');
  perform private.offload_ouvrir(v_b, 'manuel');
  perform private.offload_ouvrir(v_c, 'manuel');
  ra := tests.c4_reprise(v_a); rb := tests.c4_reprise(v_b); rc := tests.c4_reprise(v_c);
  v_aff := tests.c4_affaire(v_d, 'CMD-RR4', 10, '{"libelle": "Compresseur 50 L", "valeur_ht": 640}');
  perform private.offload_affaires_cycle(v_client, null);
  af := tests.c4_affaire_lue(v_aff);
  v_da := tests.c4_demande_de(ra.envoi1_id); v_db := tests.c4_demande_de(rb.envoi1_id);
  v_dc := tests.c4_demande_de(rc.envoi1_id); v_dd := tests.c4_demande_de(af.envoi1_id);
  return next ok(ra.statut = 'a_valider' and v_da is not null and v_db is not null and v_dc is not null and v_dd is not null,
                 'Trois messages de reprise et une relance de retrait attendent leur validation');

  -- Les refus : une consigne pour A, B et l'affaire ; aucun commentaire pour C.
  perform tests.c4_refuser(v_da, 'Mauvais interlocuteur : écrire à Mme Durand, la responsable des achats.');
  perform tests.c4_refuser(v_db, 'Ton trop familier.');
  perform tests.c4_refuser(v_dc, null);
  perform tests.c4_refuser(v_dd, 'Le client a changé d''adresse.');
  return next ok((select count(*) from private.reprises x where x.demande_id in (v_da, v_db, v_dc, v_dd) and x.module = 'offload' and x.statut = 'a_faire') = 4,
                 'Chaque refus dépose une consigne pour OFFLOAD (socle)');
  -- L'événement du refus de A passe avant la reprise : la reprise de contact est close, « refusée ».
  perform tests.c4_evenement_envoi(ra.envoi1_id, 'refuse');
  return next ok((tests.c4_reprise(v_a)).statut = 'close' and (tests.c4_reprise(v_a)).issue = 'refusee', 'Le refus clôt d''abord la reprise de A');

  -- Une personne corrige la fiche de A et l'adresse de D ; rien pour B.
  update public.offload_comptes set contact = 'Mme Durand' where id = v_a;
  update public.offload_comptes set email = 'atelier@nouvelle.test' where id = v_d;
  perform public.noter_consentement(v_client, 'email', 'atelier@nouvelle.test', 'contrat', 'tout', 'Jeu d''essai C4 : client sous contrat', null, 'offload');

  return next is(private.offload_reprendre_refus(v_dc, (select x.consigne from private.reprises x where x.demande_id = v_dc)), 'impossible',
                 'Refusé sans consigne : pas de reprise');
  return next ok((select x.statut = 'impossible' and x.motif like 'refusé sans consigne%' from private.reprises x where x.demande_id = v_dc)
                 and (tests.c4_reprise(v_c)).statut = 'close',
                 'La reprise impossible le dit, et la reprise de contact de C se clôt');

  return next is(private.offload_reprendre_refus(v_da, (select x.consigne from private.reprises x where x.demande_id = v_da)), 'proposee',
                 'La fiche de A corrigée : OFFLOAD repropose le message');
  select * into q from public.demandes_validation d where d.payload ->> 'reprise_de' = v_da::text;
  return next ok(q.id is not null and q.statut = 'en_attente' and q.resume like 'Reprise après refus — %'
                 and q.payload -> 'corrections' @> '[{"champ": "corps"}]'::jsonb
                 and q.payload -> 'consigne' ->> 'commentaire' like 'Mauvais interlocuteur%',
                 'Une seule demande liée à la refusée, en attente, avec ses corrections et la consigne');
  return next ok(q.demandeur_id is distinct from v_gerant, 'La reprise est saisie au nom du module, jamais du valideur');
  ra := tests.c4_reprise(v_a);
  select * into e from public.envois x where x.id = ra.envoi1_id;
  return next ok(ra.statut = 'a_valider' and ra.issue is null and e.demande_id = q.id and e.statut = 'a_valider'
                 and e.corps like 'Bonjour Mme Durand,%',
                 'La reprise de A rouvre sur le message corrigé, à valider de nouveau');

  return next is(private.offload_reprendre_refus(v_db, (select x.consigne from private.reprises x where x.demande_id = v_db)), 'attente',
                 'Rien n''a changé pour B : la reprise attend une correction');
  return next ok(not exists (select 1 from public.demandes_validation d where d.payload ->> 'reprise_de' = v_db::text),
                 'Pas de demande identique à la refusée');
  update private.reprises set cree_le = now() - interval '25 hours' where demande_id = v_db;
  return next is(private.offload_reprendre_refus(v_db, (select x.consigne from private.reprises x where x.demande_id = v_db)), 'impossible',
                 'Au bout de 24 heures sans correction : reprise impossible');
  return next ok((select x.motif like 'aucune correction en 24 heures — consigne : Ton trop familier.%' from private.reprises x where x.demande_id = v_db)
                 and exists (select 1 from public.alertes l where l.client_id = v_client and l.source = 'offload' and l.titre like 'Reprise impossible : aucune correction%'),
                 'Le motif reprend la consigne, et le client en est avisé');

  return next is(private.offload_reprendre_refus(v_dd, (select x.consigne from private.reprises x where x.demande_id = v_dd)), 'proposee',
                 'L''adresse de D corrigée : OFFLOAD repropose la relance de retrait');
  select d.id into v_rep_d from public.demandes_validation d where d.payload ->> 'reprise_de' = v_dd::text;
  af := tests.c4_affaire_lue(v_aff);
  select * into e from public.envois x where x.id = af.envoi1_id;
  return next ok(af.statut = 'relancee_1' and e.demande_id = v_rep_d and e.destinataire_adresse = 'atelier@nouvelle.test'
                 and (select d.payload -> 'corrections' @> '[{"champ": "destinataire", "apres": "atelier@nouvelle.test"}]'::jsonb
                      from public.demandes_validation d where d.id = v_rep_d),
                 'La relance de retrait passe sur la reprise, vers la nouvelle adresse');
  -- L'événement du refus arrive après coup : il ne porte plus sur le message en cours.
  return next is(tests.c4_evenement_envoi((select x.id from public.envois x where x.demande_id = v_dd), 'refuse') ->> 'statut', 'sans_effet',
                 'Le refus de l''ancien message ne renvoie plus l''affaire à la décision');
  return next is((tests.c4_affaire_lue(v_aff)).statut, 'relancee_1', 'L''affaire reste en relance, sur le message corrigé');

  -- La reprise validée : le message corrigé part ; une reprise refusée ne relance rien.
  v_rep := q.id;
  perform tests.c4_remettre(ra.envoi1_id, v_gerant, 'gerant@banc-varelo.test');
  return next ok((select x.statut in ('pret', 'en_cours', 'envoye', 'differe') from public.envois x where x.id = ra.envoi1_id),
                 'La reprise approuvée, le message corrigé suit la voie d''envoi');
  perform tests.c4_refuser(v_rep_d, 'Toujours pas.');
  return next ok(not exists (select 1 from private.reprises x where x.demande_id = v_rep_d)
                 and private.offload_traiter_reprises() >= 0
                 and (select count(*) from public.demandes_validation d where d.payload ->> 'reprise_de' = v_rep_d::text) = 0,
                 'Une reprise refusée ne relance rien : pas de troisième message');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.message_repris')
                 and exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'validation.reprise_proposee'),
                 'La reprise est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_37_');
