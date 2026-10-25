-- 68 — lot 19az : la reprise après refus. Un refus dépose la consigne ; le moteur propose UNE demande liée
-- (reprise_de, corrections), au nom du moteur ; une seconde reprise est refusée ; le refus d'une reprise ne relance rien ;
-- « reprise impossible » laisse une note et un avis, sans demande. Rouge avant 19az, vert après.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19az.
-- runtests() annule tout ce que le test écrit (client fictif A, demandes, approbations, reprises, avis).

create or replace function tests.refuser_68(p_dem uuid, p_client uuid, p_user uuid, p_commentaire text) returns void
language plpgsql as $$
begin
  -- Le motif (liste de six) est posé quand la colonne existe : un refus peut l'exiger (exige_motif).
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approbations' and column_name = 'motif') then
    execute 'insert into public.approbations (demande_id, client_id, user_id, decision, commentaire, motif) values ($1, $2, $3, ''rejete'', $4, $5)'
      using p_dem, p_client, p_user, p_commentaire, 'Montant ou bénéficiaire à vérifier';
  else
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (p_dem, p_client, p_user, 'rejete', p_commentaire);
  end if;
end $$;

create or replace function tests.test_68_reprise_apres_refus() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; dem uuid; dem2 uuid; rep uuid; code text; msg text; r record; n bigint;
begin
  if to_regclass('public.demandes_validation') is null then
    return next ok(true, 'circuit de validation absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Une demande du collaborateur, refusée avec un commentaire par le gérant ──
  perform tests.endosser(membre, 'a5-client-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, montant, cle_idempotence)
  values (client, 'filed', 'essai.a5', 'Facture fournisseur 120 € (essai 68)', 120, 'essai_a5_68_' || gen_random_uuid()) returning id into dem;
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence)
  values (client, 'filed', 'essai.a5', 'Autre facture (essai 68)', 'essai_a5_68_' || gen_random_uuid()) returning id into dem2;
  perform tests.redevenir_admin();
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  perform tests.refuser_68(dem, client, gerant, 'Le montant est 210 €, pas 120 €.');
  perform tests.refuser_68(dem2, client, gerant, 'Pièce illisible.');
  perform tests.redevenir_admin();
  select * into r from private.reprises where demande_id = dem;
  return next ok(r.statut = 'a_faire' and r.consigne ->> 'commentaire' = 'Le montant est 210 €, pas 120 €.',
                 'le refus dépose la consigne (le commentaire) dans la file du moteur');
  return next ok(exists (select 1 from private.reprises_a_faire('filed') x where x.demande_id = dem), 'le moteur FILED la trouve à faire');

  -- ── La reprise : une nouvelle demande liée, au nom du moteur ──
  begin
    perform private.proposer_reprise(dem, null, null, '[{"champ": "montant", "avant": 120, "apres": 120}]'::jsonb, 120);
    code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'même résultat qu''avant : pas de reprise');
  rep := private.proposer_reprise(dem, 'Facture fournisseur 210 €', null, '[{"champ": "montant", "avant": 120, "apres": 210}]'::jsonb, 210);
  select * into r from public.demandes_validation where id = rep;
  return next ok(r.statut = 'en_attente' and r.payload ->> 'reprise_de' = dem::text and r.montant = 210
                 and r.resume like 'Reprise après refus — %' and jsonb_array_length(r.payload -> 'corrections') = 1,
                 'la reprise est en attente, liée à la refusée, avec ses corrections et le préfixe');
  return next ok(r.demandeur_id is null, 'elle est saisie au nom du moteur, jamais au nom du valideur');
  begin
    perform private.proposer_reprise(dem, null, null, '[{"champ": "montant", "avant": 120, "apres": 211}]'::jsonb, 211);
    code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '23505', 'une seule reprise par demande refusée');

  -- ── Le refus de la reprise ne relance rien ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  perform tests.refuser_68(rep, client, gerant, 'Toujours faux.');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from private.reprises where demande_id = rep), 'le refus d''une reprise ne dépose rien : pas de troisième demande');

  -- ── Reprise impossible : une note et un avis, aucune demande ──
  select count(*) into n from public.demandes_validation where client_id = client;
  perform private.reprise_impossible(dem2, 'consigne hors de portée du moteur');
  return next ok((select statut from private.reprises where demande_id = dem2) = 'impossible'
                 and (select count(*) from public.demandes_validation where client_id = client) = n,
                 'reprise impossible : aucune nouvelle demande');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = client and j.action = 'validation.reprise_impossible' and j.objet_id = dem2::text)
                 and exists (select 1 from public.alertes a where a.client_id = client and a.titre like 'Reprise impossible%'),
                 'une note au journal de la demande refusée et un avis au client');
end $f$;

select * from runtests('tests'::name, '^test_68_');
