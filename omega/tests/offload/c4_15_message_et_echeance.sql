-- c4_15 — OFFLOAD : le message de reprise s'ancre aussi sur l'échéance qui revient (C4, 15/10/2026).
-- Après c4_00, c4_02, c4_03, c4_07 (aides) et les migrations c4_01 à c4_15. runtests() annule tout.

create or replace function tests.test_c4_15_message_et_echeance() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_avec uuid; v_proche uuid; v_sans uuid;
  e public.envois;
begin
  perform tests.c4_reprises_pretes();
  v_avec := tests.c4_compte_courriel('ME15', 'Boulangerie Fournier', 'contact@fournier.test', 70);
  v_proche := tests.c4_compte_courriel('MP15', 'Pressing Lucas', 'contact@lucas-pressing.test', 70);
  v_sans := tests.c4_compte_courriel('MS15', 'Fleuriste Morel', 'contact@morel-fleurs.test', 70);
  perform tests.c4_equipement(v_avec, 'FO-1', 'Four à sole', 30, 'commerciale', 'Fournil');
  perform tests.c4_equipement(v_proche, 'PR-1', 'Machine à laver industrielle', 4);
  perform private.offload_echeances_cycle(v_client, null);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);

  select * into e from public.envois x where x.id = (tests.c4_reprise(v_avec)).envoi1_id;
  return next ok(e.corps like '%Je reprends votre dossier : votre dernière commande%'
                 and e.corps like '%L''entretien de votre Four à sole (Fournil) est à refaire d''ici le %souhaitez-vous que nous convenions d''un créneau ?%',
                 'Le message reprend la dernière facture et l''entretien qui va avec : ' || coalesce(left(e.corps, 320), 'aucun'));
  select * into e from public.envois x where x.id = (tests.c4_reprise(v_proche)).envoi1_id;
  return next ok(e.corps not like '%L''entretien de votre%',
                 'Une échéance de la semaine a déjà son propre message : la reprise ne la répète pas');
  select * into e from public.envois x where x.id = (tests.c4_reprise(v_sans)).envoi1_id;
  return next ok(e.corps not like '%créneau%', 'Sans équipement suivi, le message ne parle d''aucun entretien');
end $f$;

select * from runtests('tests'::name, '^test_c4_15_');
