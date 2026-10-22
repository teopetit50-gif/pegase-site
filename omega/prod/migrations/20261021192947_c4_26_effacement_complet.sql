-- 20261021192947 c4_26_effacement_complet
-- Source : dépôt : b0f14098 omega/modules/offload/migrations/c4_26_effacement_complet.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_26_effacement_complet.sql @ b0f14098 ; c4_19 cité comme test : ignoré ; c4_26 cité comme test : ignoré.
-- ═══ omega/modules/offload/migrations/c4_26_effacement_complet.sql @ b0f14098
-- c4_26 — OFFLOAD : l'effacement d'une personne, jusqu'au bout (testeur T-OFFLOAD, TOFFLOAD-04 ; C4, 21/10/2026)
--
-- Écarts (O12) après offload_effacer_compte : (1) la restitution montrait encore nom, courriel et contact, recopiés en
-- clair dans le journal à la saisie du compte (« offload.compte_saisi ») ; (2) la reprise restait ouverte et la tâche
-- « à faire » ; (3) une ressaisie était acceptée en silence, écrivait de nouveau nom et courriel au journal, et de
-- nouveaux achats se rattachaient au compte.
-- Ce qui reste, et pourquoi : le journal opposable est chaîné (chaque ligne scelle la précédente) ; il ne se réécrit
-- pas, c'est sa fonction de preuve. Les achats (pièces comptables du client, sans nom) restent : obligation de
-- conservation comptable du client. Ce lot corrige le reste :
--   · le journal ne reçoit plus les VALEURS d'un compte saisi, seulement la référence et le NOM des champs saisis ;
--   · la restitution masque les données des lignes de journal d'un compte effacé (« donnees »: {"efface": true}) ;
--   · effacer clôt les reprises ouvertes (« abandon », message pas encore parti annulé) et abandonne les tâches à faire ;
--     rejouer l'effacement sur un compte déjà effacé fait ce ménage (O12 sur la recette) ;
--   · un compte effacé refuse toute ressaisie et toute nouvelle saisie d'achat (55000), avec la raison.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- La saisie d'un compte : refusée s'il est effacé ; au journal, le nom des champs, pas leurs valeurs.
create or replace function private.offload_saisir_compte(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_champs jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_entite uuid;
  v_id uuid;
  v_ref text;
  v_nom text := private.offload_texte(p_nom, 200);
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_nouveau boolean;
begin
  v_entite := private.offload_entite(p_client, p_entite);
  perform private.offload_exiger(p_client, v_entite, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un compte');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if v_nom is null then
    raise exception 'Un compte a un nom.' using errcode = '22023';
  end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les champs du compte se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('contact', 'email', 'telephone', 'commercial', 'groupe', 'ville', 'secteur');
  if v_inconnus is not null then
    raise exception 'Champ de compte inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  v_ref := coalesce(private.offload_texte(p_ref, 120), 'S-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 8)));
  -- Un compte effacé à la demande de la personne ne se ressaisit pas (c4_26).
  if exists (select 1 from public.offload_comptes k where k.client_id = p_client and k.entite_id = v_entite and k.ref = v_ref
               and k.efface_le is not null) then
    raise exception 'Ce compte a été effacé à la demande de la personne : il ne se ressaisit pas.' using errcode = '55000';
  end if;

  insert into public.offload_comptes as c (client_id, entite_id, ref, nom, contact, email, telephone, commercial, groupe, ville,
                                           secteur, source)
  values (p_client, v_entite, v_ref, v_nom, private.offload_texte(p ->> 'contact', 200), private.offload_texte(p ->> 'email', 320),
          private.offload_texte(p ->> 'telephone', 40), private.offload_texte(p ->> 'commercial', 120),
          private.offload_texte(p ->> 'groupe', 200), private.offload_texte(p ->> 'ville', 120),
          private.offload_texte(p ->> 'secteur', 120), 'saisie')
  on conflict (client_id, entite_id, ref) do update
    set nom = excluded.nom,
        contact = case when p ? 'contact' then excluded.contact else c.contact end,
        email = case when p ? 'email' then excluded.email else c.email end,
        telephone = case when p ? 'telephone' then excluded.telephone else c.telephone end,
        commercial = case when p ? 'commercial' then excluded.commercial else c.commercial end,
        groupe = case when p ? 'groupe' then excluded.groupe else c.groupe end,
        ville = case when p ? 'ville' then excluded.ville else c.ville end,
        secteur = case when p ? 'secteur' then excluded.secteur else c.secteur end,
        maj_le = now()
  returning id, (xmax = 0) into v_id, v_nouveau;
  perform private.journaliser_module(p_client, 'offload', case when v_nouveau then 'offload.compte_saisi' else 'offload.compte_modifie' end,
    'offload_comptes', v_id::text, jsonb_build_object('ref', v_ref, 'champs', (select jsonb_agg(k order by k) from jsonb_object_keys(jsonb_build_object('nom', v_nom) || p) k)), v_entite);
  return v_id;
end $function$;

-- La saisie d'un achat : refusée sur un compte effacé.
create or replace function private.offload_saisir_achat(p_compte uuid, p_date date, p_montant numeric, p_reference text default null,
                                                        p_libelle text default null, p_nature text default 'facture')
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
  v_nature text := coalesce(p_nature, 'facture');
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un achat');
  if c.efface_le is not null then
    raise exception 'Ce compte a été effacé à la demande de la personne : aucun achat ne s''y rattache plus.' using errcode = '55000';
  end if;
  if p_date is null or p_date < date '1990-01-01' or p_date > current_date then
    raise exception 'La date d''un achat est connue et passée.' using errcode = '22023';
  end if;
  if p_montant is null or abs(p_montant) >= 10000000000 then
    raise exception 'Le montant hors taxes est obligatoire.' using errcode = '22023';
  end if;
  if v_nature not in ('facture', 'commande', 'avoir') then
    raise exception 'Une pièce est une facture, une commande ou un avoir.' using errcode = '22023';
  end if;
  -- Rejouer la même saisie ne crée rien (c4_24).
  perform pg_advisory_xact_lock(hashtextextended('offload.achat:' || c.id::text, 0));
  select a.id into v_id from public.offload_achats a
  where a.compte_id = c.id and a.annule_le is null and a.date_achat = p_date and a.nature = v_nature
    and a.montant_ht = round(case when v_nature = 'avoir' then -abs(p_montant) else p_montant end, 2)
    and a.reference is not distinct from private.offload_texte(p_reference, 120)
  order by a.cree_le limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle, nature, source, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_date,
          round(case when v_nature = 'avoir' then -abs(p_montant) else p_montant end, 2),
          private.offload_texte(p_reference, 120), private.offload_texte(p_libelle, 500), v_nature, 'saisie', (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.achat_saisi', 'offload_achats', v_id::text,
    jsonb_build_object('compte', c.id, 'date', p_date, 'montant_ht', p_montant, 'nature', v_nature), c.entite_id);
  -- Une commande pendant une reprise la clôt aussitôt (c4_25).
  if v_nature <> 'avoir' then
    perform private.offload_clore_commandes(c.client_id, c.id);
  end if;
  return v_id;
end $function$;

-- Effacer : les reprises et les tâches en cours s'arrêtent.
create or replace function private.offload_effacer_compte(p_compte uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
  v_envois integer := 0;
  r record;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if c.id is null then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'effacer les données d''une personne');
  if v_motif is null then
    raise exception 'Dites d''où vient la demande d''effacement (courrier, message, appel…).' using errcode = '22023';
  end if;
  -- Les reprises ouvertes se closent, les tâches à faire sont abandonnées ; rejouer l'effacement fait ce ménage (c4_26).
  for r in select p.id from public.offload_reprises p
           where p.compte_id = c.id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee') loop
    perform private.offload_clore(r.id, 'abandon', 'Données de la personne effacées à sa demande.');
  end loop;
  update public.offload_taches set statut = 'abandonnee', faite_le = now(), maj_le = now(),
         compte_rendu = coalesce(compte_rendu, 'Données de la personne effacées à sa demande.')
   where compte_id = c.id and statut = 'a_faire';
  if c.efface_le is not null then
    return jsonb_build_object('compte', c.id, 'efface_le', c.efface_le, 'deja', true);
  end if;

  -- Les messages qui n'ont pas encore quitté le circuit : annulés.
  for r in
    select e.id from public.envois e
    where e.client_id = c.client_id and e.module = 'offload' and e.statut in ('a_valider', 'pret')
      and ((e.objet_type = 'offload_reprises' and e.objet_id in (select x.id::text from public.offload_reprises x where x.compte_id = c.id))
        or (e.objet_type = 'offload_echeances' and e.objet_id in (select x.id::text from public.offload_echeances x where x.compte_id = c.id))
        or (e.objet_type = 'offload_affaires' and e.objet_id in (select x.id::text from public.offload_affaires x where x.compte_id = c.id)))
  loop
    perform private.annuler_envoi(r.id, 'Données de la personne effacées à sa demande.');
    v_envois := v_envois + 1;
  end loop;

  update public.offload_comptes
     set nom = 'Compte effacé (réf. ' || c.ref || ')', contact = null, email = null, telephone = null, ville = null, groupe = null,
         statut = 'arrete', statut_motif = 'Données personnelles effacées à la demande de la personne.',
         statut_par = (select auth.uid()), statut_le = now(), efface_le = now(), maj_le = now()
   where id = c.id;
  update public.offload_contacts set note = null, par = null where compte_id = c.id;
  update public.offload_taches
     set titre = 'Tâche d''un compte effacé', detail = 'Effacé à la demande de la personne.', compte_rendu = null, maj_le = now()
   where compte_id = c.id;

  perform private.journaliser_module(c.client_id, 'offload', 'offload.compte_efface', 'offload_comptes', c.id::text,
    jsonb_build_object('ref', c.ref, 'motif', left(v_motif, 500), 'envois_annules', v_envois), c.entite_id);
  return jsonb_build_object('compte', c.id, 'efface_le', now(), 'envois_annules', v_envois, 'deja', false);
end $function$;

-- La restitution : les lignes de journal d'un compte effacé sont masquées.
create or replace function private.offload_restitution(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_tables constant text[] := array['offload_reglages', 'offload_comptes', 'offload_achats', 'offload_signaux', 'offload_reprises',
    'offload_taches', 'offload_contacts', 'offload_exclusions', 'offload_rapprochements', 'offload_equipements', 'offload_interventions',
    'offload_contrats', 'offload_echeances', 'offload_affaires', 'offload_regles', 'offload_arretes'];
  t text;
  v_lignes jsonb;
  v_donnees jsonb := '{}'::jsonb;
  v_resume jsonb := '{}'::jsonb;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'restituer les données OFFLOAD');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  foreach t in array v_tables loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - ''client_id''), ''[]''::jsonb) from public.%I x where x.client_id = $1', t)
      into v_lignes using p_client;
    v_donnees := v_donnees || jsonb_build_object(replace(t, 'offload_', ''), v_lignes);
    v_resume := v_resume || jsonb_build_object(replace(t, 'offload_', ''), jsonb_array_length(v_lignes));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('le', j.survenu_le, 'action', j.action, 'objet_type', j.objet_type, 'objet_id', j.objet_id,
                                               'donnees', case when j.objet_type = 'offload_comptes' and exists (select 1 from public.offload_comptes k
                                                                                   where k.client_id = p_client and k.id::text = j.objet_id
                                                                                     and k.efface_le is not null)
                                                              then jsonb_build_object('efface', true) else j.donnees end)
                         order by j.survenu_le), '[]'::jsonb)
    into v_lignes
  from public.journal_opposable j where j.client_id = p_client and j.action like 'offload.%';
  v_donnees := v_donnees || jsonb_build_object('journal', v_lignes);
  v_resume := v_resume || jsonb_build_object('journal', jsonb_array_length(v_lignes));
  perform private.journaliser_module(p_client, 'offload', 'offload.restitution', 'offload_reglages', p_client::text,
    jsonb_build_object('resume', v_resume), null);
  return jsonb_build_object('module', 'offload', 'organisation', p_client, 'restitue_le', now(), 'resume', v_resume, 'donnees', v_donnees);
end $function$;

revoke execute on function private.offload_saisir_compte(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function private.offload_saisir_compte(uuid, uuid, text, text, jsonb) to authenticated, service_role;
revoke execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
grant execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
revoke execute on function private.offload_effacer_compte(uuid, text) from public, anon;
grant execute on function private.offload_effacer_compte(uuid, text) to authenticated, service_role;
revoke execute on function private.offload_restitution(uuid) from public, anon;
grant execute on function private.offload_restitution(uuid) to authenticated, service_role;
