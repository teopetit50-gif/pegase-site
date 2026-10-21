-- 67 — lot 19ay : un crochet par module réécrit le texte d'un envoi à l'approbation, avant qu'il ne soit figé.
-- Rouge avant 19ay (aucun crochet ; le texte d'un envoi décidé ne change plus), vert après.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ay.
-- Banc cccccccc-…000c (ligne reglages_envois tavaro en essai, comme 19ah). runtests() annule tout : aucun envoi ne part.

create or replace function tests.crochet_essai_67(e public.envois) returns jsonb language plpgsql as $$
begin
  return jsonb_build_object('corps', e.corps || ' Merci de régler au plus tard le 31/10/2026.');
end $$;
create or replace function tests.crochet_faux_67(e public.envois) returns jsonb language sql as $$
  select jsonb_build_object('destinataire_adresse', 'autre@essai.invalid')
$$;

create or replace function tests.test_67_crochet_approbation_envoi() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  entite uuid;
  v_envoi uuid; v_envoi2 uuid; avant public.envois; apres public.envois; code text; msg text;
begin
  if to_regclass('public.demandes_validation') is null or to_regclass('public.envois') is null then
    return next ok(true, 'circuit d''envoi absent de cet environnement : sans objet');
    return;
  end if;
  entite := (select e.id from public.entites e where e.client_id = banc and e.principale limit 1);
  return next ok(position('private.envoi_crochet_approbation' in pg_get_functiondef('private.envois_suivre_demande()'::regprocedure)) > 0,
                 'à l''approbation, envois_suivre_demande appelle le crochet avant envoi_valide');
  return next ok(not has_function_privilege('authenticated', 'private.inscrire_crochet_approbation_envoi(text, regprocedure, text)', 'execute'),
                 'authenticated n''inscrit pas de crochet');

  perform private.inscrire_crochet_approbation_envoi('tavaro', 'tests.crochet_essai_67(public.envois)'::regprocedure, 'essai 67');
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 67'), null, '{}'::jsonb,
               'Relance', 'Votre facture reste due.', null, 'socle67:' || gen_random_uuid(), entite, true, false, null, '{}'::jsonb);
  select * into avant from public.envois where id = v_envoi;
  return next is(avant.statut, 'a_valider', 'l''envoi préparé attend sa validation');

  return next ok(private.envoi_crochet_approbation(v_envoi), 'le crochet du module s''applique');
  select * into apres from public.envois where id = v_envoi;
  return next is(apres.corps, 'Votre facture reste due. Merci de régler au plus tard le 31/10/2026.', 'le corps est réécrit');
  return next ok(apres.empreinte is distinct from avant.empreinte, 'l''empreinte suit le texte réécrit');
  return next ok((apres.destinataire_adresse, apres.canal, apres.echeance) is not distinct from (avant.destinataire_adresse, avant.canal, avant.echeance),
                 'destinataire, canal et échéance ne bougent pas');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = banc and j.action = 'envoi.reecrit_a_approbation' and j.objet_id = v_envoi::text),
                 'la réécriture est inscrite au journal opposable');

  -- Une fois validé (pret), l'envoi est figé : le crochet ne s'applique plus.
  perform private.envoi_valide(v_envoi);
  return next ok(not private.envoi_crochet_approbation(v_envoi), 'un envoi décidé ne se réécrit plus');

  -- Un crochet qui voudrait changer autre chose que le texte est refusé.
  perform private.inscrire_crochet_approbation_envoi('tavaro', 'tests.crochet_faux_67(public.envois)'::regprocedure);
  v_envoi2 := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'daf@banc-varelo.test', 'nom', 'Essai 67 bis'), null, '{}'::jsonb,
               'Relance', 'Votre facture reste due.', null, 'socle67b:' || gen_random_uuid(), entite, true, false, null, '{}'::jsonb);
  begin perform private.envoi_crochet_approbation(v_envoi2); code := 'accepté'; exception when others then code := sqlstate; msg := sqlerrm; end;
  return next is(code, '22023', 'un crochet qui touche le destinataire est refusé (' || coalesce(msg, '') || ')');
  begin
    perform private.inscrire_crochet_approbation_envoi('tavaro', 'tests.verdict_signale_rupture(jsonb)'::regprocedure);
    code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'une fonction qui ne reçoit pas un envoi ne s''inscrit pas comme crochet');
end $f$;

select * from runtests('tests'::name, '^test_67_');
