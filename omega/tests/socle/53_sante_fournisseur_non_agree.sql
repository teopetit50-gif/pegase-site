-- 53 — un envoi portant des données de santé vers un fournisseur dont agree_sante est faux est verrouillé (définitivement)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit (y compris la bascule d'agree_sante du témoin).
-- Règle : private.verrous_envoi rend SANTE_HORS_CANAL_AGREE (le verrou « sante:fournisseur ») quand p_e.donnees_sante et
-- que le fournisseur retenu n'est pas agréé. En mode essai, le fournisseur est private.reglages.envois_essai_fournisseur
-- (brevo) ; le canal est celui de ce fournisseur, permis en santé, pour que seul le fournisseur puisse bloquer.
-- Témoin : le même envoi, le même fournisseur passé à agree_sante = true dans la transaction, n'a plus ce verrou.

create or replace function tests.test_53_sante_fournisseur_non_agree() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; v_fournisseur text; v_canal text; base jsonb; e public.envois;
  non_agree jsonb; agree jsonb; sans_sante jsonb; motif_reglage text;
  code_fournisseur constant text := '(SANTE_HORS_CANAL_AGREE|SANTE_FOURNISSEUR|sante:fournisseur)';
begin
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid;
  if to_regprocedure('private.verrous_envoi(public.envois, boolean, timestamp with time zone)') is null then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) introuvable');
    return;
  end if;
  if to_regclass('private.fournisseurs_envoi') is null then
    return next fail('private.fournisseurs_envoi introuvable : aucun fournisseur ne peut être dit agréé ou non');
    return;
  end if;
  v_fournisseur := coalesce((select g.valeur from private.reglages g where g.cle = 'envois_essai_fournisseur'), 'brevo');
  select coalesce(f.canal, 'email') into v_canal from private.fournisseurs_envoi f where f.fournisseur = v_fournisseur;
  if v_canal is null then
    return next fail(format('Le fournisseur d''essai %s n''est pas dans private.fournisseurs_envoi', v_fournisseur));
    return;
  end if;
  if not coalesce((select c.permis_sante from private.canaux_envoi c where c.canal = v_canal), false) then
    return next fail(format('Le canal %s du fournisseur d''essai n''est pas permis en santé : le test ne peut isoler le fournisseur', v_canal));
    return;
  end if;
  if tests.table_existe('reglages_envois') then
    begin
      perform tests.inserer_minimal('public', 'reglages_envois', jsonb_build_object(
        'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'essai_adresse', 'essais-a5@essai.invalid', 'sante', false));
    exception when others then
      motif_reglage := sqlerrm;
    end;
  end if;
  base := jsonb_build_object('id', gen_random_uuid(), 'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'canal', v_canal,
            'destinataire_adresse', 'sante-a5@essai.invalid', 'destinataire_fuseau', 'Europe/Paris',
            'destinataire_professionnel', false, 'destinataire_langue', 'fr', 'transactionnel', true,
            'sujet', 'Essai A5', 'corps', 'Essai A5 : message de santé', 'empreinte', 'essai_a5_' || gen_random_uuid(),
            'cle_idempotence', 'essai_a5_53', 'statut', 'a_valider', 'echeance', now() + interval '1 day',
            'cree_le', now(), 'maj_le', now(), 'variables', '{}'::jsonb, 'pieces', '{}'::uuid[]);
  -- Fournisseur non agréé (état exigé par la décision de Teo : aucun n'est agréé sans preuve HDS).
  update private.fournisseurs_envoi f set agree_sante = false where f.fournisseur = v_fournisseur;
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', true));
  non_agree := to_jsonb(private.verrous_envoi(e, true, now()));
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', false));
  sans_sante := to_jsonb(private.verrous_envoi(e, true, now()));
  -- Témoin : le même fournisseur, agréé le temps de la transaction.
  update private.fournisseurs_envoi f set agree_sante = true where f.fournisseur = v_fournisseur;
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', true));
  agree := to_jsonb(private.verrous_envoi(e, true, now()));
  return next ok(coalesce(non_agree::text, '') ~* code_fournisseur,
                 format('Envoi de santé par %s (agree_sante faux) : verrou SANTE_HORS_CANAL_AGREE', v_fournisseur));
  return next ok(coalesce(non_agree::text, '') !~* '"definitif"\s*:\s*false' and coalesce(non_agree::text, '') !~* '(differ|report|hors_plage)',
                 'le verrou est définitif : ni différé, ni reporté vers un autre fournisseur');
  return next ok(coalesce(non_agree::text, '') !~* '(CANAL_NON_PERMIS|sante:canal)',
                 format('ce n''est pas le canal qui bloque (%s est permis en santé)', v_canal));
  return next ok(coalesce(agree::text, '') !~* code_fournisseur,
                 format('Témoin : %s agréé dans la transaction, le même envoi n''a plus ce verrou', v_fournisseur));
  return next ok(coalesce(sans_sante::text, '') !~* code_fournisseur,
                 'Témoin : sans donnée de santé, le fournisseur non agréé n''est pas un verrou');
  if motif_reglage is not null then return next diag('Réglage d''essai non posé : ' || motif_reglage); end if;
  return next diag('Non agréé : ' || left(coalesce(non_agree::text, 'null'), 300));
  return next diag('Agréé (témoin) : ' || left(coalesce(agree::text, 'null'), 300));
  return next diag('Sans santé : ' || left(coalesce(sans_sante::text, 'null'), 300));
end $f$;

select * from runtests('tests'::name, '^test_53_');
