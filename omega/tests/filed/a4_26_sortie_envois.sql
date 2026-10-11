-- Tests A4 — lot 25 (a4_33) : le dossier de sortie (tout récupérer) et l'envoi comptable à date fixe.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_facture_comptabilisee (a4_18_envoi_comptable.sql), à poser avant.
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Agir comme une personne (claims + rôle authenticated), ou revenir au serveur.
create or replace function tests.a4_comme(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- Un fichier produit du manifeste d'un dossier de sortie, par son chemin dans l'archive.
create or replace function tests.a4_sortie_fichier(p_sortie uuid, p_chemin text) returns text language sql stable as $$
  select e ->> 'contenu' from public.filed_sorties s, jsonb_array_elements(s.manifeste) e where s.id = p_sortie and e ->> 'chemin_zip' = p_chemin
$$;

create or replace function tests.test_a4_33_01_manifeste() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); autre jsonb := tests.a4_organisation(); v_s uuid; v_index text[]; v_n integer;
begin
  update public.entites set siren = '987654329' where id = (o ->> 'entite')::uuid;
  perform tests.a4_facture_comptabilisee(o, 'SOR-001');
  perform tests.a4_facture(o, 'ia', 'SOR-002', 240);
  perform tests.a4_facture(autre, 'ia', 'SOR-AUTRE', 60);

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_preparer_sortie(%L)', o ->> 'client'), '42501', null, 'Un valideur ne sort pas le dossier');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v_s := public.filed_preparer_sortie((o ->> 'client')::uuid);
  return next throws_ok(format('select public.filed_preparer_sortie(%L)', o ->> 'client'), '55000', null, 'Un seul dossier en préparation à la fois');
  return next is((select count(*) from public.filed_sorties where id = v_s), 1::bigint, 'Le gérant voit son dossier');
  reset role;

  return next is((select nb_pieces || '/' || volumes_total || '/' || statut from public.filed_sorties where id = v_s), '2/1/a_preparer',
                 'Deux pièces, un volume, à préparer');
  return next is((select count(*) from public.filed_sorties s, jsonb_array_elements(s.manifeste) e
                   where s.id = v_s and e ->> 'chemin_zip' like 'pieces/R2026-%' and e ->> 'chemin' is not null and e ->> 'sha256' ~ '^[0-9a-f]{64}$'),
                 2::bigint, 'Chaque fichier reçu, par son chemin Storage et son empreinte, nommé par son numéro de réception');
  return next ok(not exists (select 1 from public.filed_sorties s, jsonb_array_elements(s.manifeste) e where s.id = v_s and e ->> 'chemin_zip' like '%SOR-AUTRE%'),
                 'Rien d''une autre organisation');
  v_index := string_to_array(tests.a4_sortie_fichier(v_s, 'index.csv'), chr(13) || chr(10));
  return next is(cardinality(v_index), 4, 'index.csv : l''en-tête, deux lignes, la fin');
  return next ok(v_index[1] like 'reference_reception;recu_le;societe;%;empreinte_archive', 'avec ses colonnes');
  return next ok(exists (select 1 from unnest(v_index) l where l like '%"SOR-002"%;240;%'), 'les montants de la facture');
  return next ok(tests.a4_sortie_fichier(v_s, 'fournisseurs.csv') like '%"XML";"Fournisseur structuré d''exemple";"123456782"%', 'fournisseurs.csv');
  return next ok((select bool_or(e ->> 'chemin_zip' like 'fec/%FEC%.txt' and e ->> 'contenu' like 'JournalCode%') from public.filed_sorties s, jsonb_array_elements(s.manifeste) e where s.id = v_s),
                 'Le FEC de la société qui a des écritures');
  select count(*) into v_n from unnest(string_to_array(rtrim(tests.a4_sortie_fichier(v_s, 'empreintes.sha256'), chr(10)), chr(10))) l where l ~ '^[0-9a-f]{64}  pieces/';
  return next is(v_n, 2, 'empreintes.sha256, lisible par sha256sum -c');
  return next ok(tests.a4_sortie_fichier(v_s, 'LISEZMOI.txt') like '%restent conservées dans FILED%', 'Le LISEZMOI dit que rien n''est effacé');
  return next ok(exists (select 1 from public.journal_opposable j where j.objet_id = v_s::text and j.action = 'filed.sortie.demande'), 'La demande est journalisée');
end $f$;

create or replace function tests.test_a4_33_02_volumes_et_lien() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_s uuid; v_base text; v_t jsonb; v_l jsonb;
begin
  perform tests.a4_facture(o, 'ia', 'VOL-001', 120);
  perform tests.a4_facture(o, 'ia', 'VOL-002', 120);
  perform tests.a4_facture(o, 'ia', 'VOL-003', 120);
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v_s := private.filed_preparer_sortie((o ->> 'client')::uuid, null, null, null, 3000);
  reset role;
  select chemin_base into v_base from public.filed_sorties where id = v_s;
  return next is((select volumes_total from public.filed_sorties where id = v_s), 3, 'Trois fichiers de 2 048 octets, volumes de 3 000 : trois volumes');
  return next ok(v_base = (o ->> 'client') || '/filed/sorties/' || v_s, 'Le dossier Storage est celui de l''organisation');

  return next ok(not has_function_privilege('authenticated', 'public.filed_sorties_a_preparer(integer)', 'execute')
             and not has_function_privilege('authenticated', 'public.filed_sortie_volume(uuid, integer, text, text, bigint)', 'execute')
             and not has_function_privilege('authenticated', 'public.filed_sortie_echec(uuid, text)', 'execute')
             and not has_function_privilege('authenticated', 'public.filed_sorties_expirees(integer)', 'execute'),
                 'Les portes de l''ouvrier ne sont pas ouvertes aux membres');

  set local role service_role;
  select t into v_t from public.filed_sorties_a_preparer(5) t where t ->> 'id' = v_s::text;
  return next is(jsonb_array_length(v_t -> 'faits'), 0, 'L''ouvrier reçoit le dossier, aucun volume fait');
  return next is(public.filed_sortie_volume(v_s, 1, v_base || '/dossier-1.zip', repeat('a', 64), 4100), 'a_preparer', 'Un volume sur trois');
  return next throws_ok(format('select public.filed_sortie_volume(%L, 2, %L, %L, 10)', v_s, (o ->> 'client') || '/autre/x.zip', repeat('b', 64)), '22023', null,
                        'Un volume hors du dossier est refusé');
  return next throws_ok(format('select public.filed_sortie_volume(%L, 2, %L, %L, 10)', v_s, v_base || '/../x.zip', repeat('b', 64)), '22023', null, 'et une remontée');
  return next throws_ok(format('select public.filed_sortie_volume(%L, 4, %L, %L, 10)', v_s, v_base || '/dossier-4.zip', repeat('b', 64)), '22023', null, 'et un volume de trop');
  return next is(public.filed_sortie_volume(v_s, 1, v_base || '/dossier-1.zip', repeat('a', 64), 4100), 'a_preparer', 'Redéclarer un volume ne compte pas double');
  perform public.filed_sortie_volume(v_s, 2, v_base || '/dossier-2.zip', repeat('b', 64), 4100);
  return next is(public.filed_sortie_volume(v_s, 3, v_base || '/dossier-3.zip', repeat('c', 64), 4100), 'prete', 'Au dernier, le dossier est prêt');
  reset role;
  return next ok(exists (select 1 from public.alertes a where a.client_id = (o ->> 'client')::uuid and a.cle_regroupement like '%sortie:' || v_s
                           and a.destinataire = (o ->> 'gerant')::uuid and not a.interne), 'Le demandeur est prévenu');

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_sortie_lien(%L)', v_s), '42501', null, 'Un valideur n''a pas le lien');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v_l := public.filed_sortie_lien(v_s);
  reset role;
  return next is(jsonb_array_length(v_l -> 'volumes'), 3, 'Le gérant a les trois volumes');
  return next is(v_l -> 'volumes' -> 0 ->> 'chemin', v_base || '/dossier-1.zip', 'dans l''ordre');
  return next ok(exists (select 1 from public.journal_opposable j where j.objet_id = v_s::text and j.action = 'filed.sortie.telechargement'), 'Le téléchargement est journalisé');

  update public.filed_sorties set expire_le = now() - interval '1 minute' where id = v_s;
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_sortie_lien(%L)', v_s), '55000', null, 'Après sept jours, plus de lien');
  reset role;
  set local role service_role;
  select t into v_t from public.filed_sorties_expirees(50) t where t ->> 'id' = v_s::text;
  reset role;
  return next is(jsonb_array_length(v_t -> 'chemins'), 3, 'L''ouvrier reçoit les trois volumes à retirer');
  return next is((select statut from public.filed_sorties where id = v_s), 'expiree', 'et le dossier est expiré');
end $f$;

create or replace function tests.test_a4_33_03_echec() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_s uuid; v_r text;
begin
  perform tests.a4_facture(o, 'ia', 'ECH-001', 120);
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v_s := public.filed_preparer_sortie((o ->> 'client')::uuid);
  reset role;
  set local role service_role;
  for i in 1 .. 3 loop
    perform t from public.filed_sorties_a_preparer(5) t;
    v_r := public.filed_sortie_echec(v_s, 'Empreinte différente pour pieces/x.pdf');
    if i < 3 then return next is(v_r, 'a_preparer', 'Essai ' || i || ' : on recommence'); end if;
  end loop;
  reset role;
  return next is(v_r, 'echec', 'Au troisième, le dossier est en échec');
  return next ok(exists (select 1 from public.alertes a where a.client_id = (o ->> 'client')::uuid and a.niveau = 'attention' and not a.interne
                           and a.titre like '%n''a pas pu être préparé%'), 'Le demandeur le sait');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next lives_ok(format('select public.filed_preparer_sortie(%L)', o ->> 'client'), 'et peut en redemander un');
  reset role;
end $f$;

create or replace function tests.test_a4_33_04_envoi_programme() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_p uuid; v_fec uuid; v_n integer;
begin
  update public.entites set siren = '987654329' where id = (o ->> 'entite')::uuid;
  perform tests.a4_facture_comptabilisee(o, 'PRG-001');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_programmer_envoi(%L, %L, ''pennylane'', ''mensuelle'', 5)', o ->> 'client', o ->> 'entite'), '42501', null,
                        'Un valideur ne programme pas l''envoi');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_programmer_envoi(%L, %L, ''fec'', ''mensuelle'', 5, ''nouvelles'')', o ->> 'client', o ->> 'entite'), '22023', null,
                        'Le FEC se produit sur une période');
  return next throws_ok(format('select public.filed_programmer_envoi(%L, %L, ''ciel'', ''mensuelle'', 5)', o ->> 'client', o ->> 'entite'), '22023', null, 'Format inconnu');
  v_p := public.filed_programmer_envoi((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'pennylane', 'mensuelle', 5);
  v_fec := public.filed_programmer_envoi((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'fec', 'hebdomadaire', 1);
  reset role;
  return next is((select mode from public.filed_envois_programmes where id = v_fec), 'periode', 'Le FEC est en mode période');

  update public.filed_envois_programmes set prochain_le = current_date where id in (v_p, v_fec);
  perform set_config('request.jwt.claims', json_build_object('sub', o ->> 'gerant', 'role', 'authenticated')::text, true);
  -- Le lendemain : la semaine écoulée comprend les écritures du jour.
  v_n := private.filed_produire_exports(current_date + 1);
  return next is(v_n, 2, 'Le balayage des exports produit les deux envois');
  return next ok(exists (select 1 from public.filed_exports x where x.client_id = (o ->> 'client')::uuid and x.tableau like 'compta.pennylane:%'
                           and x.contenu like '%PRG-001%' and x.sha256 ~ '^[0-9a-f]{64}$'), 'Le fichier Pennylane, avec la facture et son empreinte');
  return next ok(exists (select 1 from public.filed_exports x where x.client_id = (o ->> 'client')::uuid and x.tableau like 'compta.fec:%' and x.contenu like 'JournalCode%'),
                 'Le FEC de la semaine écoulée');
  return next ok((select prochain_le > current_date from public.filed_envois_programmes where id = v_p), 'L''envoi suivant est planifié');
  return next ok(exists (select 1 from public.alertes a where a.client_id = (o ->> 'client')::uuid and a.titre like 'Envoi comptable prêt : pennylane%'),
                 'Le destinataire est prévenu');

  update public.filed_envois_programmes set prochain_le = current_date where id = v_p;
  perform private.filed_produire_exports(current_date + 2);
  return next ok(exists (select 1 from public.alertes a where a.client_id = (o ->> 'client')::uuid and a.titre like '%aucune écriture nouvelle%'),
                 'Rien de nouveau depuis le dernier envoi : on le dit, sans fichier vide');
  return next is((select count(*) from public.filed_exports x where x.client_id = (o ->> 'client')::uuid and x.tableau like 'compta.pennylane:%'), 1::bigint,
                 'et sans second fichier');

  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_arreter_envoi(v_p);
  reset role;
  return next is((select actif from public.filed_envois_programmes where id = v_p), false, 'Un envoi s''arrête');
end $f$;
