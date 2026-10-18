-- B3-10 — Le relevé en retard (alerte posée puis fermée par l'export qui arrive) et la conservation (purge)
-- (étapes 19 et 20). Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 à b3_08. runtests() annule tout.

create or replace function tests.test_b3_10_retard_et_purge() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  v_cabinet uuid;
  v_jeu uuid;
  v_res jsonb;
  v_alerte uuid;
  v_bilan jsonb;
  n_rdv bigint;
  n_plans bigint;
begin
  r := tests.b3_cabinet_releve('initial');
  v_cabinet := (r ->> 'cabinet')::uuid;
  select j.id into v_jeu from public.branchements_jeux j where j.branchement_id = (r ->> 'branchement')::uuid and j.code = 'agenda';

  -- 19. L'export du matin n'est pas arrivé.
  v_res := private.tiroma_releve_en_retard(jsonb_build_object('jeu', v_jeu, 'avant', now(), 'dernier_recu_le', now() - interval '1 day', 'etat_le', now() - interval '1 day'));
  v_alerte := (v_res ->> 'alerte')::uuid;
  return next ok(v_alerte is not null, 'une alerte est levée : ' || coalesce((select titre from public.alertes where id = v_alerte), '?'));
  return next ok((select a.niveau = 'attention' and not a.interne and a.acquittee_le is null and a.cle_regroupement like 'tiroma:releve:retard:' || v_jeu::text || ':%' from public.alertes a where a.id = v_alerte),
                 'niveau attention, pour le client, non acquittée, regroupée par jeu et par jour');
  return next ok((select titre like '%Agenda%' and titre like '%point du matin sera incomplet%' from public.alertes where id = v_alerte), 'elle nomme le jeu et la conséquence');
  perform tests.b3_endosser('gerant');
  return next is(tests.compter('public', 'alertes', format('id = %L', v_alerte)), 1::bigint, 'le gérant la voit');
  perform tests.redevenir_admin();
  v_res := private.tiroma_releve_en_retard(jsonb_build_object('jeu', v_jeu, 'avant', now(), 'dernier_recu_le', now() - interval '1 day'));
  return next ok(v_res ->> 'alerte' is null, 'rejouée le même jour, elle ne se double pas');
  -- L'export arrive : l'alerte se ferme.
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda'], 'courant', 'b3:courant');
  perform tests.b3_traiter();
  return next ok((select acquittee_le is not null and detail ->> 'resolution' = 'un export est arrivé' from public.alertes where id = v_alerte), 'l''export arrivé ferme l''alerte');
  -- Un cabinet coupé n'alerte plus.
  perform tests.b3_endosser('gerant');
  update public.tiroma_cabinets set statut = 'coupe' where id = v_cabinet;
  perform tests.redevenir_admin();
  v_res := private.tiroma_releve_en_retard(jsonb_build_object('jeu', v_jeu, 'avant', now() + interval '1 day'));
  return next is(v_res ->> 'ignore', 'cabinet non actif', 'cabinet coupé : pas d''alerte de retard');
  perform tests.b3_endosser('gerant');
  update public.tiroma_cabinets set statut = 'actif' where id = v_cabinet;
  perform tests.redevenir_admin();

  -- 20. La purge, vingt ans plus tard : ce qui est au-delà de la conservation disparaît, le journal le dit.
  select count(*) into n_rdv from public.tiroma_rendez_vous where entite_id = entite;
  select count(*) into n_plans from public.tiroma_plans where entite_id = entite and statut in ('signe', 'commence');
  v_bilan := private.tiroma_purger(now() + interval '20 years');
  return next ok(v_bilan ? banc::text, 'le bilan de la purge porte l''organisation du banc');
  if exists (select 1 from private.tiroma_conservation c where c.nom = 'tiroma_rendez_vous') then
    return next is(tests.compter('public', 'tiroma_rendez_vous', format('entite_id = %L', entite)), 0::bigint, format('les %s rendez-vous, tous passés depuis vingt ans, sont purgés', n_rdv));
  else
    return next skip('aucune durée de conservation pour tiroma_rendez_vous');
  end if;
  return next is(tests.compter('public', 'tiroma_evenements_agenda', format('entite_id = %L', entite)), 0::bigint, 'les événements d''agenda aussi (la purge seule peut les effacer)');
  return next ok(exists (select 1 from public.journal_opposable x where x.client_id = banc and x.action = 'tiroma.purge'), 'journal : « tiroma.purge », une ligne de synthèse');
  return next ok((select (x.donnees -> 'lignes') ? 'tiroma_rendez_vous' from public.journal_opposable x where x.client_id = banc and x.action = 'tiroma.purge' order by x.id desc limit 1) or not exists (select 1 from private.tiroma_conservation c where c.nom = 'tiroma_rendez_vous'),
                 'elle compte les rendez-vous retirés');
  return next ok(exists (select 1 from public.tiroma_cabinets where id = v_cabinet), 'le cabinet lui-même reste');
end $f$;

select * from runtests('tests'::name, '^test_b3_10_');
