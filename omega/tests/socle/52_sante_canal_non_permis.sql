-- 52 — un envoi portant des données de santé, sur un canal dont permis_sante est faux, est verrouillé (définitivement)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.
-- Règle : private.verrous_envoi rend CANAL_NON_PERMIS dès que p_e.donnees_sante et not canaux_envoi.permis_sante,
-- même hors module de santé (lot socle 19ab). L'envoi est construit en mémoire (jsonb_populate_record) : aucune
-- insertion dans envois, seul le canal et le drapeau varient entre le témoin et l'essai. Module tavaro (pas de santé),
-- mode essai, transactionnel (aucun consentement ni plage requis avant le verrou santé).

create or replace function tests.test_52_sante_canal_non_permis() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; canal_interdit text; canal_permis text; base jsonb; e public.envois;
  temoin jsonb; sante jsonb; sante_permis jsonb; motif_reglage text;
  code_canal constant text := '(CANAL_NON_PERMIS|sante:canal)';
begin
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid;
  if to_regprocedure('private.verrous_envoi(public.envois, boolean, timestamp with time zone)') is null then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) introuvable');
    return;
  end if;
  select c.canal into canal_interdit from private.canaux_envoi c where not c.permis_sante order by (c.canal = 'sms') desc, c.canal limit 1;
  select c.canal into canal_permis from private.canaux_envoi c where c.permis_sante and c.canal in ('email', 'courriel') limit 1;
  if canal_interdit is null then
    return next fail('Aucun canal avec permis_sante = false : la règle n''a rien à garder (SMS attendu non permis)');
    return;
  end if;
  -- Réglage d'envoi du module pour le client d'essai (mode essai, sans santé de module) ; sur la maquette, pas de table.
  if tests.table_existe('reglages_envois') then
    begin
      perform tests.inserer_minimal('public', 'reglages_envois', jsonb_build_object(
        'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'essai_adresse', 'essais-a5@essai.invalid', 'sante', false));
    exception when others then
      motif_reglage := sqlerrm;
    end;
  end if;
  base := jsonb_build_object('id', gen_random_uuid(), 'client_id', client, 'module', 'tavaro', 'mode', 'essai',
            'destinataire_fuseau', 'Europe/Paris', 'destinataire_professionnel', false, 'destinataire_langue', 'fr',
            'transactionnel', true, 'corps', 'Essai A5 : message de santé', 'empreinte', 'essai_a5_' || gen_random_uuid(),
            'cle_idempotence', 'essai_a5_52', 'statut', 'a_valider', 'echeance', now() + interval '1 day',
            'cree_le', now(), 'maj_le', now(), 'variables', '{}'::jsonb, 'pieces', '{}'::uuid[]);
  -- Témoin : même canal, sans donnée de santé → le canal lui-même est permis pour ce module et ce client.
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_interdit, 'destinataire_adresse', '+33600000052', 'donnees_sante', false));
  temoin := to_jsonb(private.verrous_envoi(e, true, now()));
  -- Essai : le même envoi, marqué santé.
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_interdit, 'destinataire_adresse', '+33600000052', 'donnees_sante', true));
  sante := to_jsonb(private.verrous_envoi(e, true, now()));
  return next ok(coalesce(temoin::text, '') !~* code_canal,
                 format('Témoin : %s sans donnée de santé n''est pas refusé par le canal', canal_interdit));
  return next ok(coalesce(sante::text, '') ~* code_canal,
                 format('%s portant des données de santé (module sans santé) : verrou CANAL_NON_PERMIS', canal_interdit));
  return next ok(coalesce(sante::text, '') !~* '"definitif"\s*:\s*false' and coalesce(sante::text, '') !~* '(differ|report|hors_plage)',
                 'le verrou est définitif : ni différé, ni reporté');
  -- Contre-épreuve : le même envoi de santé sur un canal permis n'est pas refusé par le canal (c'est bien le canal qui bloque).
  if canal_permis is not null then
    e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_permis, 'destinataire_adresse', 'sante-a5@essai.invalid', 'donnees_sante', true));
    sante_permis := to_jsonb(private.verrous_envoi(e, true, now()));
    return next ok(coalesce(sante_permis::text, '') !~* code_canal,
                   format('Contre-épreuve : %s (permis_sante) n''oppose pas CANAL_NON_PERMIS au même envoi', canal_permis));
  else
    return next ok(true, 'Contre-épreuve sans objet : aucun canal courriel permis en santé');
  end if;
  if motif_reglage is not null then return next diag('Réglage d''essai non posé : ' || motif_reglage); end if;
  return next diag('Témoin : ' || left(coalesce(temoin::text, 'null'), 300));
  return next diag('Santé sur ' || canal_interdit || ' : ' || left(coalesce(sante::text, 'null'), 300));
  return next diag('Santé sur ' || coalesce(canal_permis, '—') || ' : ' || left(coalesce(sante_permis::text, 'null'), 300));
end $f$;

select * from runtests('tests'::name, '^test_52_');
