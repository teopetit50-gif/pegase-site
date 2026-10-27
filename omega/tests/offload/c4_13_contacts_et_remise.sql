-- c4_13 — OFFLOAD : le dernier contact lu dans vos outils, et la remise dans le circuit en un geste (C4, 15/10/2026).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_13. runtests() annule tout.

create or replace function tests.test_c4_13_contacts_importes() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid;
  n integer;
begin
  perform tests.c4_reprises_pretes();
  v := tests.c4_compte_courriel('CT13', 'Négoce Bertin', 'achats@bertin.test', 70);
  perform tests.c4_deposer('contacts', jsonb_build_array(
    jsonb_build_object('compte_ref', 'CT13', 'date', to_char(current_date - 6, 'DD/MM/YYYY'), 'canal', 'Appel téléphonique', 'par', 'Sophie',
                       'note', 'Rappeler après le salon'),
    jsonb_build_object('compte_ref', 'INCONNU13', 'date', to_char(current_date - 2, 'DD/MM/YYYY'), 'canal', 'Visite')), 'ct-1');
  return next ok(exists (select 1 from public.offload_contacts k where k.compte_id = v and k.le = current_date - 6 and k.canal = 'appel'
                         and k.par = 'Sophie' and k.source = 'import'),
                 'Le contact tenu dans le CRM est lu (date, canal, commercial)');
  return next is((select c.dernier_contact from public.offload_comptes c where c.id = v), current_date - 6, 'Le dernier contact du compte suit');
  return next ok(private.offload_ecarte(v) like 'Déjà contacté le %par Sophie%',
                 'Un échange récent dans vos outils sort le compte de la vague en cours : ' || coalesce(private.offload_ecarte(v), 'rien'));
  perform tests.c4_deposer('contacts', jsonb_build_array(
    jsonb_build_object('compte_ref', 'CT13', 'date', to_char(current_date - 6, 'DD/MM/YYYY'), 'canal', 'Appel téléphonique', 'par', 'Sophie')), 'ct-2');
  select count(*) into n from public.offload_contacts k where k.compte_id = v;
  return next is(n, 1, 'Le réimport du même contact n''ajoute rien');
end $f$;

create or replace function tests.test_c4_13_remise_dans_le_circuit() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v := tests.c4_compte_courriel('RC13', 'Imprimerie Royer', 'achats@royer.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-13', 'achats@royer.test', null,
    'Re : votre dossier', 'STOP', null, '[]'::jsonb, jsonb_build_object('envoi_id', r.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  return next ok((select c.statut from public.offload_comptes c where c.id = v) = 'arrete'
                 and exists (select 1 from public.oppositions o where o.client_id = v_client and o.adresse = 'achats@royer.test' and o.levee_le is null),
                 'Après « stop », le compte est retiré et l''adresse opposée au socle');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_changer_statut(v, 'suivi', 'Le client a redemandé nos offres par écrit le 14/10.');
  perform tests.redevenir_admin();
  return next ok((select c.statut from public.offload_comptes c where c.id = v) = 'suivi'
                 and not exists (select 1 from public.oppositions o where o.client_id = v_client and o.adresse = 'achats@royer.test' and o.levee_le is null),
                 'Une personne de l''équipe le remet dans le circuit d''un seul geste : l''opposition du socle est levée avec');
end $f$;

select * from runtests('tests'::name, '^test_c4_13_');
