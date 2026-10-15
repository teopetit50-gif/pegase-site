-- b1_10 — VARELO : les exports lus d'eux-mêmes — modèles de jeux, abonnement, application (session B1, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_04 et b1_08 (il en appelle les portes).
--
-- CE QUE ÇA CORRIGE (omega/AUDIT-PROMESSES.md, § 2 Varelo, « modèle modeles_jeux Varelo pour lire les exports
-- automatiquement », avec A1). Jusqu'ici, chaque export d'une société (ses fournisseurs, ses clients, sa balance
-- âgée, sa balance générale) se collait à la main dans /espace/varelo. Le socle sait recevoir un export
-- (recevoir_releve : courriel, passerelle), le lecteur d'exports d'A1 le lit d'après les jeux déclarés du
-- branchement (modeles_jeux → branchements_jeux), et le socle publie « releve.pret.<module> » quand il est lu.
-- Varelo n'avait ni modèle, ni abonnement, ni application : rien n'arrivait.
--
-- CE QUI EST POSÉ.
--   · public.modeles_jeux, module « varelo », six logiciels (sage100, ebp, cegid, quadra, pennylane, tableur),
--     cinq jeux chacun : fournisseurs, clients (le fichier des tiers : code, nom, SIREN, SIRET, TVA, IBAN,
--     adresse…), balance_agee_clients, balance_agee_fournisseurs (code, nom, non échu, 1–30, 31–60, 61–90, > 90,
--     échu, total), balance_generale (compte, libellé, débit, crédit, solde). Les montants sont lus en texte : la
--     porte de Varelo les comprend à la française (private.grp_montant), le lecteur n'a rien à deviner.
--     Reconnaissance : par le nom du fichier (motif_fichier), sinon par les en-têtes signature.
--   · private.abonnements : releve.pret.varelo → travail varelo.appliquer_releve.
--   · private.grp_appliquer_jeu(client, société, jeu, lignes, arrêté, source) : verse les lignes d'un jeu dans la
--     porte qui convient (grp_deposer_codes, grp_deposer_encours, grp_deposer_balance) — c'est le même geste que
--     le dépôt à la main ; l'arrêté d'une balance est le jour de réception de l'export (heure de la société).
--   · private.grp_appliquer_releve(charge) : pour chaque instantané « a_appliquer » d'un relevé Varelo, lit ses
--     lignes (instantanes_lignes), applique, acquitte (acquitter_instantane 'applique') ; journal
--     varelo.releve.applique ; un jeu inconnu de Varelo est acquitté « douteux » avec sa raison.
--   · private.grp_traiter_travaux(n) et le cron varelo-releves (chaque minute), comme tiroma-releves.
--
-- Règles de pose : insert … on conflict do nothing / where not exists ; create or replace ; jamais de suppression.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les modèles de jeux
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  l text;
  v_tiers_f jsonb := jsonb_build_object(
    'code', jsonb_build_object('type', 'texte', 'obligatoire', true, 'libelle', 'Code du fournisseur dans la société',
                               'entetes', jsonb_build_array('Code fournisseur', 'Code tiers', 'N° compte tiers', 'Compte tiers', 'Numéro', 'Code')),
    'nom', jsonb_build_object('type', 'texte', 'obligatoire', true,
                              'entetes', jsonb_build_array('Raison sociale', 'Intitulé', 'Nom', 'Libellé', 'Dénomination')),
    'siren', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('SIREN', 'N° SIREN')),
    'siret', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('SIRET', 'N° SIRET')),
    'tva', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('N° TVA intracommunautaire', 'TVA intracommunautaire', 'TVA intracom', 'N° TVA', 'N° identifiant')),
    'iban', jsonb_build_object('type', 'texte', 'facultative', true, 'sensible', true, 'entetes', jsonb_build_array('IBAN', 'RIB')),
    'adresse', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Adresse', 'Adresse 1', 'Rue')),
    'code_postal', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Code postal', 'CP')),
    'ville', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Ville', 'Commune')),
    'pays', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Pays', 'Code pays')),
    'telephone', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Téléphone', 'Tél', 'Tel')),
    'email', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('E-mail', 'Email', 'Courriel')));
  v_tiers_c jsonb;
  v_age jsonb := jsonb_build_object(
    'code', jsonb_build_object('type', 'texte', 'obligatoire', true,
                               'entetes', jsonb_build_array('Code tiers', 'Compte tiers', 'N° compte tiers', 'Code client', 'Code fournisseur', 'Compte', 'Code')),
    'nom', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Intitulé', 'Raison sociale', 'Nom', 'Libellé', 'Tiers')),
    'siren', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('SIREN', 'N° SIREN')),
    'non_echu', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Non échu', 'À échoir', 'Non échues')),
    'echu_30', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('1-30', '0-30', '1 à 30 jours', 'Moins de 30 jours')),
    'echu_60', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('31-60', '31 à 60 jours')),
    'echu_90', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('61-90', '61 à 90 jours')),
    'echu_plus', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('> 90', '+90', 'Plus de 90 jours', '91 et plus')),
    'echu', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Échu', 'Total échu', 'Échues')),
    'total', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Total', 'Solde', 'Encours', 'Reste dû')));
  v_age_c jsonb;
  v_age_f jsonb;
  v_bg jsonb := jsonb_build_object(
    'compte', jsonb_build_object('type', 'texte', 'obligatoire', true, 'entetes', jsonb_build_array('N° compte', 'Numéro de compte', 'Compte', 'CompteNum')),
    'libelle', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Intitulé', 'Libellé', 'Intitulé du compte', 'CompteLib')),
    'debit', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Solde débit', 'Solde débiteur', 'Débit', 'Total débit')),
    'credit', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Solde crédit', 'Solde créditeur', 'Crédit', 'Total crédit')),
    'solde', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Solde', 'Solde net', 'Solde final')));
  v_source constant text := 'omega/modules/varelo/migrations/b1_10_releves.sql ; en-têtes usuels des exports Sage, EBP, Cegid, Quadra, Pennylane (hypothèses, à ajuster sur un vrai fichier par l''essai à blanc d''A1)';
begin
  v_tiers_c := jsonb_set(v_tiers_f, '{code}', jsonb_build_object('type', 'texte', 'obligatoire', true, 'libelle', 'Code du client dans la société',
                 'entetes', jsonb_build_array('Code client', 'Code tiers', 'N° compte tiers', 'Compte tiers', 'Numéro', 'Code')));
  -- b1_14 : chaque balance âgée ne reconnaît que son côté (signatures sans recouvrement)
  v_age_c := jsonb_set(v_age, '{code,entetes}', '["Code client", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb);
  v_age_f := jsonb_set(v_age, '{code,entetes}', '["Code fournisseur", "Code tiers", "Compte tiers", "N° compte tiers", "Compte", "Code"]'::jsonb);
  foreach l in array array['sage100', 'ebp', 'cegid', 'quadra', 'pennylane', 'tableur'] loop
    insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, fenetre,
                                     confirmer_disparition, seuil_perte, perte_min, seuil_anomalies, options, accuse, source)
    values
      ('varelo', l, 'fournisseurs', 1, 'Fichier des fournisseurs', '^(fournisseurs?|frs|tiers[_ -]?fourn)',
       array['Code fournisseur', 'Raison sociale', 'Code postal'], v_tiers_f, array['code'], true, null, 2, 0.2, 1, 0.05, '{}'::jsonb, true, v_source),
      ('varelo', l, 'clients', 1, 'Fichier des clients', '^(clients?|tiers[_ -]?cli)',
       array['Code client', 'Raison sociale', 'Code postal'], v_tiers_c, array['code'], true, null, 2, 0.2, 1, 0.05, '{}'::jsonb, true, v_source),
      ('varelo', l, 'balance_agee_clients', 1, 'Balance âgée clients', '^(balance[_ -]?ag[ée]e[_ -]?cli|echeancier[_ -]?cli|bac[_ -])',
       array['Code client', 'Non échu', 'Total'], v_age_c, array['code'], true, null, 1, 0.5, 1, 0.05, '{}'::jsonb, true, v_source),
      ('varelo', l, 'balance_agee_fournisseurs', 1, 'Balance âgée fournisseurs', '^(balance[_ -]?ag[ée]e[_ -]?fou|echeancier[_ -]?fou|baf[_ -])',
       array['Code fournisseur', 'Non échu', 'Total'], v_age_f, array['code'], true, null, 1, 0.5, 1, 0.05, '{}'::jsonb, true, v_source),
      ('varelo', l, 'balance_generale', 1, 'Balance générale', '^(balance[_ -]?g[ée]n[ée]rale|bg[_ -])',
       array['Solde débit', 'Solde crédit'], v_bg, array['compte'], true, null, 1, 0.5, 1, 0.05, '{}'::jsonb, true, v_source)
    on conflict on constraint modeles_jeux_une_version do nothing;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. L'abonnement
-- ─────────────────────────────────────────────────────────────────────────

insert into private.abonnements (evenement, module, genre)
select 'releve.pret.varelo', 'varelo', 'varelo.appliquer_releve'
where not exists (select 1 from private.abonnements a where a.evenement = 'releve.pret.varelo' and a.module = 'varelo');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. L'application
-- ─────────────────────────────────────────────────────────────────────────

-- Les lignes d'un jeu lu, versées dans la porte de Varelo qui convient. Rend le compte rendu de la porte.
create or replace function private.grp_appliquer_jeu(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_arrete date, p_source text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  return case p_jeu
    when 'fournisseurs' then private.grp_deposer_codes(p_client, p_entite, 'fournisseur', p_lignes, p_source)
    when 'clients' then private.grp_deposer_codes(p_client, p_entite, 'client', p_lignes, p_source)
    when 'balance_agee_clients' then private.grp_deposer_encours(p_client, p_entite, 'client', p_arrete, p_lignes, p_source)
    when 'balance_agee_fournisseurs' then private.grp_deposer_encours(p_client, p_entite, 'fournisseur', p_arrete, p_lignes, p_source)
    when 'balance_generale' then private.grp_deposer_balance(p_client, p_entite, p_arrete, null, p_lignes, p_source)
  end;
end $function$;

create or replace function private.grp_appliquer_releve(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b public.branchements;
  rl public.releves;
  i record;
  v_arrete date;
  v_lignes jsonb;
  v_res jsonb;
  v_jeux jsonb := '{}'::jsonb;
  v_appliques integer := 0;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'varelo' then
    raise exception 'Branchement introuvable ou étranger à Varelo.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  perform set_config('omega.module', 'varelo', true);
  v_arrete := (rl.recu_le at time zone coalesce(b.fuseau, 'Europe/Paris'))::date;
  for i in
    select x.id, x.statut, x.lignes, j.code
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut = 'a_appliquer'
    order by case j.code when 'fournisseurs' then 1 when 'clients' then 2 else 3 end, x.recu_le
  loop
    if b.entite_id is null or not exists (select 1 from public.grp_societes s where s.client_id = b.client_id and s.entite_id = b.entite_id) then
      perform private.acquitter_instantane(i.id, 'douteux', 'Le branchement n''est pas celui d''une société inscrite dans Varelo.');
      v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('douteux', 'société absente'));
      continue;
    end if;
    if i.code not in ('fournisseurs', 'clients', 'balance_agee_clients', 'balance_agee_fournisseurs', 'balance_generale') then
      perform private.acquitter_instantane(i.id, 'douteux', format('Jeu « %s » inconnu de Varelo.', i.code));
      v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('douteux', 'jeu inconnu'));
      continue;
    end if;
    select coalesce(jsonb_agg(l.valeurs order by l.cle), '[]'::jsonb) into v_lignes
    from public.instantanes_lignes l where l.instantane_id = i.id;
    v_res := private.grp_appliquer_jeu(b.client_id, b.entite_id, i.code, v_lignes, v_arrete,
                                       left(format('export %s %s du %s', b.logiciel, i.code, to_char(v_arrete, 'DD/MM/YYYY')), 200));
    perform private.acquitter_instantane(i.id, 'applique');
    v_appliques := v_appliques + 1;
    v_jeux := v_jeux || jsonb_build_object(i.code, v_res - 'rejetes' || jsonb_build_object('rejetes', jsonb_array_length(coalesce(v_res -> 'rejetes', '[]'::jsonb))));
  end loop;
  perform private.grp_journal(b.client_id, 'varelo.releve.applique', 'releves', rl.id::text,
    jsonb_build_object('branchement', b.id, 'logiciel', b.logiciel, 'arrete_le', v_arrete, 'appliques', v_appliques, 'jeux', v_jeux), b.entite_id);
  return jsonb_build_object('releve', rl.id, 'appliques', v_appliques, 'jeux', v_jeux);
end $function$;

create or replace function private.grp_traiter_travaux(p_nombre integer default 10)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in select * from private.prendre_travaux(array['varelo.appliquer_releve'], p_nombre, interval '10 minutes', 'varelo-sql') loop
    begin
      r := private.grp_appliquer_releve(t.charge);
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

revoke execute on function private.grp_appliquer_jeu(uuid, uuid, text, jsonb, date, text) from public, anon, authenticated;
revoke execute on function private.grp_appliquer_releve(jsonb) from public, anon, authenticated;
revoke execute on function private.grp_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.grp_appliquer_jeu(uuid, uuid, text, jsonb, date, text) to service_role;
grant execute on function private.grp_appliquer_releve(jsonb) to service_role;
grant execute on function private.grp_traiter_travaux(integer) to service_role;

select cron.schedule('varelo-releves', '* * * * *', $cron$select private.grp_traiter_travaux()$cron$);
