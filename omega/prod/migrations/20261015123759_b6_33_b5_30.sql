-- 20261015123759 b6_33_b5_30
-- Source : dépôt : 247b860 omega/modules/daliro/migrations/b6_33_devis_pdf.sql ; 247b860 omega/modules/daliro/migrations/b6_29_confirmation_deux_temps.sql ; bcb1545 omega/modules/lorani/migrations/b5_30_choisir_decideur.sql ; bcb1545 omega/modules/lorani/migrations/b5_19_os_reserves_gpa.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_33_devis_pdf.sql @ 247b860, b6_29_confirmation_deux_temps.sql @ 247b860, b5_30_choisir_decideur.sql @ bcb1545, b5_19_os_reserves_gpa.sql @ bcb1545.
-- ═══ omega/modules/daliro/migrations/b6_33_devis_pdf.sql @ 247b860
-- b6_33 — DALIRO : le devis en PDF, lu par le lecteur d'A1 puis importé (session B6, 15/10/2026), après b6_28
--
-- LA PROMESSE (/secteurs/btp) : « Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. »
-- b6_28 importait le tableau collé d'Excel ou le CSV. Le lecteur v34 d'A1 (c51c6de) lit maintenant un devis PDF en
-- lignes : type daliro_devis, valeur « lignes » (numero, lot, designation, unite, quantite, prix_unitaire, montant),
-- plus montant_total_ht (CHAMPS-LECTURE.md, § Daliro). Le lecteur ne pose rien : l'écran relit, montre, importe.
--
-- CE QUI EST POSÉ.
--   · public.btp_deposer_devis(marche, nom, mime, octets, sha256, chemin) : le PDF, déjà mis dans omega-clients
--     sous <client>/btp_marche/<marche>/<nom>, devient une pièce du module daliro rattachée au marché (statut
--     « recue », type daliro_devis) ; le déclencheur du socle demande sa lecture. Le bureau (btp_exiger_bureau), sur
--     un marché À VÉRIFIER. Même fichier deux fois : refusé (empreinte). Journal daliro.devis_depose.
--   · public.btp_devis_lu(marche) : la dernière pièce daliro du marché, son statut, et ce que le lecteur en a lu
--     (lignes, montant_total_ht, numero, verifiee). L'écran l'interroge jusqu'à la lecture, montre l'aperçu, puis
--     appelle btp_importer_lignes (b6_28) au nom de l'utilisateur : chaque ligne passe par btp_ecrire_ligne.
--   · Lecture par cette porte (SECURITY DEFINER, bureau), pour ne pas dépendre de la politique des pièces sur un
--     objet « btp_marche ».
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_deposer_devis(p_marche uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text, p_chemin text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  v_nom text := nullif(btrim(p_nom_fichier), '');
  v_id uuid;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if m.statut <> 'a_verifier' then
    raise exception 'Le devis se lit sur un marché à vérifier : rouvrez-le d''abord.' using errcode = '23514';
  end if;
  if v_nom is null or char_length(v_nom) > 200 then
    raise exception 'Le nom du fichier est obligatoire (200 caractères au plus).' using errcode = '22023';
  end if;
  if p_mime is distinct from 'application/pdf' then
    raise exception 'Le devis se dépose en PDF (pour un tableur, collez-le ou exportez-le en CSV).' using errcode = '22023';
  end if;
  if p_octets is null or p_octets <= 0 or p_octets > 50 * 1024 * 1024 then
    raise exception 'Le fichier doit faire entre 1 octet et 50 Mo.' using errcode = '22023';
  end if;
  if p_sha256 !~* '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte SHA-256 du fichier est attendue (64 caractères hexadécimaux).' using errcode = '22023';
  end if;
  if p_chemin is null or p_chemin !~ ('^' || m.client_id::text || '/btp_marche/' || m.id::text || '/[^/]{1,200}$') then
    raise exception 'Le fichier se dépose sous <organisation>/btp_marche/<marché>/<nom>.' using errcode = '22023';
  end if;
  begin
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256, chemin,
                               statut, type_piece)
    values (m.client_id, 'daliro', 'btp_marche', m.id::text, 'depot', (select auth.uid()), v_nom, p_mime, p_octets,
            lower(p_sha256), p_chemin, 'recue', 'daliro_devis')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ce devis est déjà déposé sur ce marché (même empreinte).' using errcode = '23505';
  end;
  perform private.journaliser(m.client_id, 'daliro.devis_depose', 'btp_marches', m.id::text,
    jsonb_build_object('piece', v_id, 'nom', v_nom, 'octets', p_octets), m.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_devis_lu(p_marche uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  p record;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  select x.id, x.nom_fichier, x.statut, x.type_piece, x.cree_le into p
  from public.pieces x
  where x.client_id = m.client_id and x.module = 'daliro' and x.objet_type = 'btp_marche' and x.objet_id = m.id::text
  order by x.cree_le desc limit 1;
  if p.id is null then
    return jsonb_build_object('piece', null);
  end if;
  return jsonb_build_object(
    'piece', p.id, 'nom', p.nom_fichier, 'statut', p.statut, 'type_piece', p.type_piece, 'depose_le', p.cree_le,
    'lignes', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'lignes_verifiees', (select v.verifiee from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'montant_total_ht', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'montant_total_ht' order by v.cree_le desc limit 1),
    'numero', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'numero' order by v.cree_le desc limit 1));
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) from public, anon;
grant execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) to authenticated, service_role;
revoke execute on function public.btp_devis_lu(uuid) from public, anon;
grant execute on function public.btp_devis_lu(uuid) to authenticated, service_role;


-- ═══ omega/modules/daliro/migrations/b6_29_confirmation_deux_temps.sql @ 247b860
-- b6_29 — DALIRO : la confirmation J-2 en deux temps, demandée le matin, relevée le soir (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Chaque sous-traitant reçoit une demande de confirmation deux jours avant son
-- passage. S'il ne répond pas, vous êtes prévenu le soir même et vous avez une journée pour le remplacer. »
-- Jusqu'ici (b6_02) : demande à J-2 à 17 h, alerte « sans réponse » la VEILLE du passage à 17 h — il restait une
-- soirée et un matin, pas une journée.
--
-- CE QUI EST POSÉ.
--   · private.btp_confirmations_phase(client, jour, phase) : le corps de btp_demander_confirmations en deux temps.
--       matin : les demandes des passages qui commencent dans deux jours ouvrés (même règle qu'avant) ;
--       soir  : les demandes restées sans réponse pour un passage qui commence dans deux jours ouvrés ou moins →
--               « sans réponse », alerte au conducteur avec les remplaçants. La journée de J-1 reste pour remplacer.
--   · private.btp_tache_confirmations_matin() + cron daliro-confirmations-matin à 6 h 07 UTC (8 h 07 Paris l'été,
--     7 h 07 l'hiver : dans la plage d'envoi 8 h–20 h du socle l'été ; l'hiver, l'envoi attend 8 h, le socle le garde).
--   · private.btp_tache_confirmations (cron daliro-confirmations-j2, 15 h UTC) ne fait plus que la phase « soir »,
--     le reste inchangé (fin d'accord J-2, alertes de réception).
--   · Le jour de Paris remplace current_date (UTC) dans les deux tâches.
--   · public.btp_demander_confirmations / private.btp_demander_confirmations (b6_02) restent tels quels : le bureau
--     peut toujours lancer les deux temps d'un coup à la main.
--   · Sans l'accord permanent des J-2 (b6_08), chaque demande passe par « À valider » : la fenêtre de réponse du
--     sous-traitant commence quand la demande est validée.
--
-- Règles de pose : create or replace ; cron.schedule si absent ; rien n'est retiré ni effacé.

create or replace function private.btp_confirmations_phase(p_client uuid, p_jour date, p_phase text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_jour date := coalesce(p_jour, current_date);
  v_canal text;
  v_demandees integer := 0;
  v_sans_reponse integer := 0;
  v_remplacants jsonb;
  v_chantiers uuid[] := '{}';
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
  end if;

  if p_phase not in ('matin', 'soir') then
    raise exception 'Phase inconnue : matin (demandes) ou soir (sans réponse).' using errcode = '22023';
  end if;

  -- 1. Le matin de J-2 : les passages de sous-traitants qui commencent dans deux jours ouvrés, pas encore demandés.
  for r in
    select p.*, c.nom as chantier_nom, c.territoire, c.conducteur_id, t.nom as tiers_nom, t.telephone, t.email, t.canal as tiers_canal
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'non_demandee'
      and c.statut = 'ouvert' and t.actif and t.confirmer_passages
      and (t.telephone is not null or t.email is not null)
      and p.debut > v_jour
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
      and p_phase = 'matin'
    order by p.debut, p.id
  loop
    v_canal := coalesce(r.tiers_canal, case when r.telephone is not null then 'whatsapp' else 'email' end);
    update public.btp_passages set confirmation = 'demandee' where id = r.id;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'demandee', v_canal,
            'demande:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('debut', r.debut, 'fin', r.fin, 'tache', r.tache), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.publier_evenement(r.client_id, 'daliro.confirmation_demandee',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'chantier_nom', r.chantier_nom, 'tiers', r.tiers_id,
                         'tiers_nom', r.tiers_nom, 'canal', v_canal, 'telephone', r.telephone, 'email', r.email,
                         'debut', r.debut, 'fin', r.fin, 'tache', r.tache, 'version', r.version),
      'confirmation:' || r.id::text || ':v' || r.version);
    v_demandees := v_demandees + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  -- 2. Le soir de J-2 : demandé le matin (ou avant), toujours sans réponse → sans_reponse, alerte au conducteur avec
  --    les remplaçants. Il reste la journée de J-1 pour remplacer.
  for r in
    select p.*, c.nom as chantier_nom, c.conducteur_id, t.nom as tiers_nom
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    left join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'demandee'
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
      and p_phase = 'soir'
    order by p.debut, p.id
  loop
    update public.btp_passages set confirmation = 'sans_reponse' where id = r.id;
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(r.id) limit 5) x;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'sans_reponse',
            'sans_reponse:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('remplacants', v_remplacants), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('%s n''a pas confirmé son passage du %s sur %s', coalesce(r.tiers_nom, 'Un sous-traitant'),
                  to_char(r.debut, 'DD/MM'), r.chantier_nom), 150),
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut,
                         'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text, true, r.conducteur_id);
    perform private.publier_evenement(r.client_id, 'daliro.passage_sans_reponse',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut, 'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text || ':v' || r.version);
    v_sans_reponse := v_sans_reponse + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  for r in select c.id, c.entite_id from public.btp_chantiers c where c.id = any (v_chantiers) loop
    perform private.journaliser(p_client, 'daliro.confirmations_relevees', 'btp_chantiers', r.id::text,
      jsonb_build_object('jour', v_jour, 'phase', p_phase, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse), r.entite_id);
  end loop;
  return jsonb_build_object('jour', v_jour, 'phase', p_phase, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse);
end $function$;

create or replace function private.btp_tache_confirmations_matin()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat',
                                           private.btp_confirmations_phase(r.client_id, (now() at time zone 'Europe/Paris')::date, 'matin'));
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

create or replace function private.btp_tache_confirmations()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      -- b6_29 : le soir, seulement le relevé des sans-réponse (les demandes partent le matin, btp_tache_confirmations_matin).
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat',
                                           private.btp_confirmations_phase(r.client_id, (now() at time zone 'Europe/Paris')::date, 'soir'));
      begin
        perform private.btp_alerter_fin_accord(r.client_id, now());
      exception when others then
        raise notice 'alerte de fin d''accord (%) : %', r.client_id, sqlerrm;
      end;
      begin
        perform private.btp_alerter_reception(r.client_id, current_date);
      exception when others then
        raise notice 'alertes de réception (%) : %', r.client_id, sqlerrm;
      end;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

-- Le cron du matin.
select cron.schedule('daliro-confirmations-matin', '7 6 * * *', $cron$select private.btp_tache_confirmations_matin()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-confirmations-matin');

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : tout reste au serveur.
revoke execute on function private.btp_confirmations_phase(uuid, date, text) from public, anon, authenticated;
grant execute on function private.btp_confirmations_phase(uuid, date, text) to service_role;
revoke execute on function private.btp_tache_confirmations_matin() from public, anon, authenticated;
grant execute on function private.btp_tache_confirmations_matin() to service_role;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_tache_confirmations() to service_role;


-- ═══ omega/modules/lorani/migrations/b5_30_choisir_decideur.sql @ bcb1545
-- LORANI, lot B5-30 — choisir qui décide des constats d'un contrôle (15/10/2026).
--
-- Pourquoi : la page des architectes montre, dans le menu du produit, « Choisir qui décide » (Produit.tsx:304 ;
-- chiffrage, ligne 16 : C). Jusqu'ici tout membre qui écrit sur le projet pouvait accepter ou écarter un constat :
-- l'agence veut nommer, pour chaque contrôle, la personne qui tranche (le chef de projet, l'associé qui signe le dépôt).
--
-- Ce qui est posé :
--   · lorani_controles.decideur uuid : la personne qui décide des constats de ce contrôle (nul = tout membre qui
--     écrit sur le projet, comme avant).
--   · public.lorani_choisir_decideur(controle, personne) : réservé au gérant, à l'admin ou au chef de projet ; la
--     personne doit être un compte du client (pas « lecteur ») qui voit le projet, membre du projet ou gérant/admin ;
--     nul remet la décision à tous ; refusé sur un contrôle clos ; journal lorani.decideur_choisi.
--   · trigger BEFORE UPDATE OF statut sur lorani_constats (lorani_constats_decideur, distinct de
--     lorani_constats_garder) : quand le contrôle a un décideur, seuls lui, un gérant ou un admin changent le statut
--     d'un constat (42501). Le contrôle lui-même (lorani.controle_en_cours) et le système (sans auth.uid()) passent.
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_controles ADD COLUMN IF NOT EXISTS decideur uuid;

-- Le décideur se pose par la porte : un membre ne le change pas par un UPDATE direct.
CREATE OR REPLACE FUNCTION private.lorani_controles_garder_decideur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.decideur is distinct from old.decideur and (select auth.uid()) is not null
     and current_setting('lorani.decideur_en_cours', true) is distinct from 'oui' then
    raise exception 'Le décideur se choisit par « Choisir qui décide ».' using errcode = '42501';
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controles_garder_decideur() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lorani_choisir_decideur(p_controle uuid, p_personne uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
  v_moi uuid := (select auth.uid());
  v_role text;
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  select role into v_role from public.comptes where user_id = v_moi and client_id = c.client_id;
  if v_moi is not null and coalesce(v_role, '') not in ('gerant', 'admin')
     and not exists (select 1 from public.lorani_membres_projet mp where mp.client_id = c.client_id and mp.projet_id = c.projet_id
                     and mp.user_id = v_moi and mp.role_projet = 'chef_projet') then
    raise exception 'Seuls le gérant, un admin ou le chef de projet choisissent qui décide.' using errcode = '42501';
  end if;
  if c.statut = 'clos' then
    raise exception 'Un contrôle clos ne change plus de décideur.' using errcode = '55000';
  end if;
  if p_personne is not null and not exists (
       select 1 from public.comptes m
       where m.user_id = p_personne and m.client_id = c.client_id and m.role <> 'lecteur'
         and (m.role in ('gerant', 'admin')
              or exists (select 1 from public.lorani_membres_projet mp where mp.client_id = c.client_id and mp.projet_id = c.projet_id and mp.user_id = m.user_id))
         and private.lorani_voit_projet_pour(m.user_id, c.client_id, c.entite_id, c.projet_id)) then
    raise exception 'Cette personne n''est pas membre du projet (ou ne peut que lire).' using errcode = '22023';
  end if;
  if c.decideur is not distinct from p_personne then
    return jsonb_build_object('controle', c.id, 'decideur', p_personne, 'deja', true);
  end if;
  perform set_config('lorani.decideur_en_cours', 'oui', true);
  update public.lorani_controles set decideur = p_personne where id = c.id;
  perform set_config('lorani.decideur_en_cours', '', true);
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.decideur_choisi', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('controle', c.id, 'intitule', c.intitule, 'indice', c.indice, 'avant', c.decideur, 'apres', p_personne), c.entite_id);
  return jsonb_build_object('controle', c.id, 'decideur', p_personne);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_choisir_decideur(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_choisir_decideur(uuid, uuid) TO authenticated;

-- Quand le contrôle a un décideur, lui seul (ou un gérant, un admin) tranche un constat.
CREATE OR REPLACE FUNCTION private.lorani_constats_decideur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_moi uuid := (select auth.uid());
  v_decideur uuid;
begin
  if new.statut is not distinct from old.statut or v_moi is null
     or current_setting('lorani.controle_en_cours', true) = 'oui' then
    return new;
  end if;
  select decideur into v_decideur from public.lorani_controles where id = new.controle_id;
  if v_decideur is null or v_decideur = v_moi
     or exists (select 1 from public.comptes m where m.user_id = v_moi and m.client_id = new.client_id and m.role in ('gerant', 'admin')) then
    return new;
  end if;
  raise exception 'Les constats de ce contrôle sont décidés par la personne choisie (« Choisir qui décide »).' using errcode = '42501';
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_constats_decideur() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controles'::regclass and tgname = 'lorani_controles_garder_decideur') then
    create trigger lorani_controles_garder_decideur before update of decideur on public.lorani_controles
      for each row execute function private.lorani_controles_garder_decideur();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_constats'::regclass and tgname = 'lorani_constats_decideur') then
    create trigger lorani_constats_decideur before update of statut on public.lorani_constats
      for each row execute function private.lorani_constats_decideur();
  end if;
end $$;


-- ═══ omega/modules/lorani/migrations/b5_19_os_reserves_gpa.sql @ bcb1545
-- LORANI, lot B5-19 — le chantier, suite : les ordres de service et leur incidence sur le montant et le délai ; les
-- réserves suivies jusqu'à leur levée ; la garantie de parfait achèvement.
--
-- Pourquoi : n° 4 du carnet et la promesse de la page des architectes : « calcule l'incidence de chaque ordre de
-- service sur le montant et le délai, puis suit chaque réserve jusqu'à sa levée et la fin de la garantie de parfait
-- achèvement ». Règles reprises :
--   · ordre de service : l'entreprise qui l'estime contestable émet ses réserves dans les QUINZE jours de sa notification
--     (CCAG-Travaux 2021, art. 3.8.2) ; un ordre de service peut porter un prix nouveau et une incidence sur le délai ;
--   · marché public de travaux : une modification se fait sans nouvelle procédure tant qu'elle reste sous les seuils
--     européens et sous 15 % du montant initial (CCP, art. R2194-8) — au-delà, l'examiner (avenant, nouvelle procédure) ;
--   · réception avec ou sans réserves (C. civ., art. 1792-6) ; garantie de parfait achèvement d'UN AN à compter de la
--     réception, pour les désordres signalés par réserves ou par notification écrite ;
--   · retenue de garantie : libérée un an après la réception, sauf opposition motivée par l'inexécution des obligations
--     de parfait achèvement (loi n° 71-584 du 16 juillet 1971, art. 2).
--
-- Ce qui est posé :
--   · lorani_marches : delai_execution_jours (le délai contractuel) et demarrage_le (posé par l'OS de démarrage).
--   · lorani_projets : reception_le (date de la réception) et gpa_delai_id (l'échéance « fin de la GPA »).
--   · public.lorani_ordres_service : l'OS n° k d'un marché (nature demarrage | travaux_modificatifs |
--     travaux_supplementaires | arret | reprise | autre, objet, émis le, notifié le, incidence HT, incidence en jours,
--     statut emis | signe | signe_reserves | refuse, réserves de l'entreprise, « réserves possibles jusqu'au » = notifié
--     + 15 jours). L'OS de démarrage date le marché ; chaque OS est relu : cumul > 15 % du marché initial (public) ou
--     > 10 % (privé) → alerte « attention » ; incidence sur le délai → alerte info avec la nouvelle fin contractuelle.
--   · public.lorani_os_incidence (vue, sous la RLS de l'appelant) : par marché, montant initial, avenants, OS cumulés,
--     montant à date, part du marché, délai initial, jours d'OS, jours d'arrêt, démarrage, fin contractuelle.
--   · public.lorani_reserves : la réserve n° k du projet (lot, marché, intitulé, localisation, origine reception | opr |
--     gpa, constatée le, à lever avant, statut ouverte | levee | contestee, levée le, motif) ; « à lever avant » est une
--     échéance du registre (rappels J-7, J), tenue à la levée.
--   · La réception datée sur le projet : l'échéance « fin de la GPA » (réception + 1 an, rappels J-60, J-30, J-7, J).
--   · Abonnements delai.proche/depasse.lorani → lorani.chantier.rappel/.depasse ; private.lorani_chantier_rappeler :
--     réserve à lever (si encore ouverte), ou fin de la GPA avec le compte des réserves non levées par lot et la
--     retenue de garantie à conserver.
--   · private.lorani_lectures_passage() (corps de b5_18) prend ces genres.
-- Clés étrangères sans effacement en cascade. Fonctions nouvelles de private fermées au public. Migration idempotente.

ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS delai_execution_jours integer;
ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS demarrage_le date;
ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS reception_le date;
ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS gpa_delai_id uuid;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_delai_execution_check') then
    alter table public.lorani_marches add constraint lorani_marches_delai_execution_check CHECK (delai_execution_jours IS NULL OR delai_execution_jours BETWEEN 1 AND 3650);
  end if;
end $$;

-- ——— les ordres de service ———

CREATE TABLE IF NOT EXISTS public.lorani_ordres_service (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  marche_id uuid NOT NULL,
  numero smallint,
  nature text NOT NULL DEFAULT 'travaux_modificatifs',
  objet text NOT NULL,
  emis_le date NOT NULL DEFAULT current_date,
  notifie_le date,
  montant_ht numeric(14,2) NOT NULL DEFAULT 0,
  delai_jours integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'emis',
  reserves_entreprise text,
  reserves_jusquau date,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_ordres_service_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_ordres_service_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_ordres_service_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_ordres_service_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES public.lorani_marches (client_id, id),
  CONSTRAINT lorani_ordres_service_une_fois UNIQUE (marche_id, numero),
  CONSTRAINT lorani_ordres_service_nature_check CHECK (nature = ANY (ARRAY['demarrage', 'travaux_modificatifs', 'travaux_supplementaires', 'arret', 'reprise', 'autre'])),
  CONSTRAINT lorani_ordres_service_statut_check CHECK (statut = ANY (ARRAY['emis', 'signe', 'signe_reserves', 'refuse'])),
  CONSTRAINT lorani_ordres_service_objet_check CHECK (char_length(btrim(objet)) BETWEEN 1 AND 300),
  CONSTRAINT lorani_ordres_service_montant_check CHECK (montant_ht BETWEEN -1000000000 AND 1000000000),
  CONSTRAINT lorani_ordres_service_delai_check CHECK (delai_jours BETWEEN -3650 AND 3650),
  CONSTRAINT lorani_ordres_service_numero_check CHECK (numero IS NULL OR numero BETWEEN 1 AND 999),
  CONSTRAINT lorani_ordres_service_reserves_check CHECK (statut <> 'signe_reserves' OR char_length(btrim(coalesce(reserves_entreprise, ''))) >= 3),
  CONSTRAINT lorani_ordres_service_dates_check CHECK (notifie_le IS NULL OR notifie_le >= emis_le)
);
ALTER TABLE public.lorani_ordres_service ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_reserves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid,
  marche_id uuid,
  numero smallint,
  intitule text NOT NULL,
  localisation text,
  origine text NOT NULL DEFAULT 'reception',
  constatee_le date NOT NULL DEFAULT current_date,
  lever_avant date,
  statut text NOT NULL DEFAULT 'ouverte',
  levee_le date,
  motif text,
  delai_id uuid,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_reserves_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_reserves_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_reserves_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_reserves_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_reserves_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES public.lorani_marches (client_id, id),
  CONSTRAINT lorani_reserves_une_fois UNIQUE (projet_id, numero),
  CONSTRAINT lorani_reserves_origine_check CHECK (origine = ANY (ARRAY['reception', 'opr', 'gpa'])),
  CONSTRAINT lorani_reserves_statut_check CHECK (statut = ANY (ARRAY['ouverte', 'levee', 'contestee'])),
  CONSTRAINT lorani_reserves_intitule_check CHECK (char_length(btrim(intitule)) BETWEEN 1 AND 300),
  CONSTRAINT lorani_reserves_localisation_check CHECK (localisation IS NULL OR char_length(localisation) <= 200),
  CONSTRAINT lorani_reserves_motif_check CHECK (motif IS NULL OR char_length(motif) <= 500),
  CONSTRAINT lorani_reserves_levee_check CHECK (statut <> 'levee' OR levee_le IS NOT NULL),
  CONSTRAINT lorani_reserves_contestee_check CHECK (statut <> 'contestee' OR char_length(btrim(coalesce(motif, ''))) >= 3),
  CONSTRAINT lorani_reserves_numero_check CHECK (numero IS NULL OR numero BETWEEN 1 AND 9999)
);
ALTER TABLE public.lorani_reserves ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lorani_ordres_service, public.lorani_reserves FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_ordres_service, public.lorani_reserves TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_ordres_service', 'lorani_reserves'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit le chantier des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit le chantier des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet tient le chantier') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet tient le chantier', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet met le chantier a jour') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet met le chantier a jour', t);
    end if;
  end loop;
end $$;

-- L'incidence des OS, marché par marché (sous la RLS de qui lit).
CREATE OR REPLACE VIEW public.lorani_os_incidence WITH (security_invoker = true) AS
  select m.id as marche_id, m.projet_id, m.lot_id, m.titulaire,
         m.montant_ht as montant_initial, m.avenants_ht,
         coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0) as os_montant_ht,
         m.montant_ht + m.avenants_ht + coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0) as montant_a_date,
         round(100 * (m.avenants_ht + coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0)) / m.montant_ht, 1) as part_pct,
         m.delai_execution_jours,
         coalesce(sum(o.delai_jours) filter (where o.statut <> 'refuse' and o.nature not in ('arret', 'reprise')), 0)::integer as os_jours,
         coalesce((select sum(greatest(0, coalesce(rp.d, current_date) - a.d))
                   from (select x.marche_id, coalesce(x.notifie_le, x.emis_le) as d,
                                row_number() over (partition by x.marche_id order by coalesce(x.notifie_le, x.emis_le), x.numero) as n
                         from public.lorani_ordres_service x where x.marche_id = m.id and x.nature = 'arret' and x.statut <> 'refuse') a
                   left join lateral (select coalesce(y.notifie_le, y.emis_le) as d from public.lorani_ordres_service y
                                      where y.marche_id = m.id and y.nature = 'reprise' and y.statut <> 'refuse'
                                        and coalesce(y.notifie_le, y.emis_le) >= a.d order by coalesce(y.notifie_le, y.emis_le) limit 1) rp on true), 0)::integer as arret_jours,
         m.demarrage_le,
         count(o.id)::integer as os_nb
  from public.lorani_marches m
  left join public.lorani_ordres_service o on o.marche_id = m.id
  group by m.id;
REVOKE ALL ON public.lorani_os_incidence FROM anon;
GRANT SELECT ON public.lorani_os_incidence TO authenticated;

-- La fin contractuelle d'un marché : démarrage + délai + jours d'OS + jours d'arrêt.
CREATE OR REPLACE FUNCTION private.lorani_fin_contractuelle(p_marche uuid)
 RETURNS date
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when i.demarrage_le is not null and i.delai_execution_jours is not null
              then i.demarrage_le + i.delai_execution_jours + i.os_jours + i.arret_jours end
  from public.lorani_os_incidence i where i.marche_id = p_marche
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_fin_contractuelle(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_os_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.lorani_marches;
begin
  select * into m from public.lorani_marches where id = new.marche_id;
  if not found then
    raise exception 'Marché inconnu.' using errcode = '23503';
  end if;
  new.client_id := m.client_id;
  new.entite_id := m.entite_id;
  new.projet_id := m.projet_id;
  new.objet := btrim(regexp_replace(new.objet, '\s+', ' ', 'g'));
  new.reserves_entreprise := nullif(btrim(new.reserves_entreprise), '');
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('lorani_os:' || new.marche_id::text, 0));
    select coalesce(max(o.numero), 0) + 1 into new.numero from public.lorani_ordres_service o where o.marche_id = new.marche_id;
  end if;
  if new.nature in ('demarrage', 'arret', 'reprise') then
    new.montant_ht := 0;
    new.delai_jours := 0;
  end if;
  -- l'entreprise a quinze jours pour émettre ses réserves (CCAG-Travaux 2021, art. 3.8.2)
  new.reserves_jusquau := case when new.notifie_le is not null then new.notifie_le + 15 end;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_os_preparer() FROM PUBLIC;

-- Après un OS : la date de démarrage du marché, et l'incidence relue.
CREATE OR REPLACE FUNCTION private.lorani_os_relire()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  m public.lorani_marches;
  i public.lorani_os_incidence;
  v_seuil numeric;
  v_fin date;
begin
  select * into m from public.lorani_marches where id = new.marche_id;
  select * into pr from public.lorani_projets where id = new.projet_id;
  if new.nature = 'demarrage' and new.statut <> 'refuse' then
    update public.lorani_marches set demarrage_le = coalesce(new.notifie_le, new.emis_le) where id = m.id and demarrage_le is distinct from coalesce(new.notifie_le, new.emis_le);
  end if;
  select * into i from public.lorani_os_incidence where marche_id = m.id;
  v_seuil := case when pr.marche_public then 15 else 10 end;
  if new.montant_ht <> 0 and abs(i.part_pct) > v_seuil then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('« %s » : OS cumulés sur %s, %s%s %% du marché initial (%s € HT à date)%s.', left(pr.nom, 40), left(m.titulaire, 40),
                  case when i.part_pct > 0 then '+' else '' end, replace(i.part_pct::text, '.', ','), regexp_replace(trunc(i.montant_a_date)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g'),
                  case when pr.marche_public then ' : au-delà de 15 %, la modification est à examiner (CCP, art. R2194-8)' else ' : un avenant est à envisager' end), 200),
      jsonb_build_object('projet', new.projet_id, 'marche', m.id, 'os', new.id, 'part_pct', i.part_pct, 'montant_a_date', i.montant_a_date, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('os:marche:%s:montant', m.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  if new.delai_jours <> 0 or new.nature in ('arret', 'reprise') then
    v_fin := private.lorani_fin_contractuelle(m.id);
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('« %s » : OS n° %s (%s), %s%s', left(pr.nom, 40), new.numero, left(m.titulaire, 40),
                  case new.nature when 'arret' then 'arrêt de chantier' when 'reprise' then 'reprise du chantier'
                       else format('%s%s jour%s sur le délai', case when new.delai_jours > 0 then '+' else '' end, new.delai_jours, case when abs(new.delai_jours) > 1 then 's' else '' end) end,
                  case when v_fin is not null then ' ; fin contractuelle le ' || to_char(v_fin, 'DD/MM/YYYY') || '.' else '.' end), 200),
      jsonb_build_object('projet', new.projet_id, 'marche', m.id, 'os', new.id, 'fin_contractuelle', v_fin, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('os:%s:delai', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  perform private.journaliser_module(new.client_id, 'lorani', case when tg_op = 'INSERT' then 'lorani.os_emis' else 'lorani.os_modifie' end, 'lorani_projet', new.projet_id::text,
    jsonb_build_object('os', new.id, 'marche', m.id, 'numero', new.numero, 'nature', new.nature, 'montant_ht', new.montant_ht, 'delai_jours', new.delai_jours,
                       'statut', new.statut, 'part_pct', i.part_pct), new.entite_id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_os_relire() FROM PUBLIC;

-- ——— les réserves ———

CREATE OR REPLACE FUNCTION private.lorani_reserves_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_ouvert boolean;
  v_echeance date;
  v_lot text;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  new.intitule := btrim(regexp_replace(new.intitule, '\s+', ' ', 'g'));
  new.localisation := nullif(btrim(new.localisation), '');
  new.motif := nullif(btrim(new.motif), '');
  if new.marche_id is not null and new.lot_id is null then
    select m.lot_id into new.lot_id from public.lorani_marches m where m.id = new.marche_id and m.projet_id = new.projet_id;
  end if;
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('lorani_reserves:' || new.projet_id::text, 0));
    select coalesce(max(r.numero), 0) + 1 into new.numero from public.lorani_reserves r where r.projet_id = new.projet_id;
  end if;
  if new.statut = 'levee' and new.levee_le is null then
    new.levee_le := current_date;
  elsif new.statut <> 'levee' then
    new.levee_le := null;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;

  -- l'échéance « à lever avant » au registre
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_echeance from public.delais d where d.id = new.delai_id;
  if coalesce(v_ouvert, false) and new.statut = 'levee' then
    perform private.clore_delai(new.delai_id, 'tenu', null);
  elsif coalesce(v_ouvert, false) and (new.lever_avant is null or new.lever_avant is distinct from v_echeance or new.statut = 'contestee') then
    perform private.clore_delai(new.delai_id, 'annule', left(case when new.statut = 'contestee' then 'Réserve contestée : ' || coalesce(new.motif, '')
                                                                 else format('Date de levée modifiée : %s.', coalesce(to_char(new.lever_avant, 'DD/MM/YYYY'), 'aucune')) end, 300));
    new.delai_id := null;
    v_ouvert := false;
  end if;
  if not coalesce(v_ouvert, false) and new.statut = 'ouverte' and new.lever_avant is not null and new.lever_avant >= current_date and pr.territoire is not null then
    select l.numero into v_lot from public.lorani_lots l where l.id = new.lot_id;
    begin
      new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
        left(format('Réserve n° %s%s : %s', new.numero, coalesce(' (lot ' || v_lot || ')', ''), new.intitule), 200), new.lever_avant,
        left(format('Réserve constatée le %s (%s)%s.', to_char(new.constatee_le, 'DD/MM/YYYY'),
                    case new.origine when 'reception' then 'réception' when 'opr' then 'opérations préalables à la réception' else 'garantie de parfait achèvement' end,
                    coalesce(', ' || new.localisation, '')), 300),
        pr.territoire, array[7, 0], private.lorani_chef_de_projet(new.client_id, new.projet_id),
        'Vérifier la levée avec l''entreprise, puis la constater.',
        format('lorani:reserve:%s:%s', new.id, new.lever_avant));
    exception when others then
      new.delai_id := null;
    end;
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_reserves_preparer() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_reserves_tracer_levee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut then
    perform private.journaliser_module(new.client_id, 'lorani', case when tg_op = 'INSERT' then 'lorani.reserve_constatee' else 'lorani.reserve_' || new.statut end,
      'lorani_projet', new.projet_id::text,
      jsonb_build_object('reserve', new.id, 'numero', new.numero, 'lot', new.lot_id, 'intitule', new.intitule, 'statut', new.statut, 'levee_le', new.levee_le, 'motif', new.motif), new.entite_id);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_reserves_tracer_levee() FROM PUBLIC;

-- La réception datée : l'échéance « fin de la GPA ».
CREATE OR REPLACE FUNCTION private.lorani_projet_reception()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ouvert boolean;
  v_fin date := (new.reception_le + interval '1 year')::date;
begin
  if new.reception_le is not distinct from old.reception_le then
    return new;
  end if;
  select (d.statut in ('ouvert', 'depasse')) into v_ouvert from public.delais d where d.id = new.gpa_delai_id;
  if coalesce(v_ouvert, false) then
    perform private.clore_delai(new.gpa_delai_id, 'annule', left(format('Date de réception modifiée : %s.', coalesce(to_char(new.reception_le, 'DD/MM/YYYY'), 'aucune')), 300));
    new.gpa_delai_id := null;
  end if;
  if new.reception_le is not null and v_fin >= current_date and new.territoire is not null then
    begin
      new.gpa_delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.id::text,
        left(format('Fin de la garantie de parfait achèvement : %s', new.nom), 200), v_fin,
        left(format('Réception le %s ; garantie de parfait achèvement d''un an (C. civ., art. 1792-6).', to_char(new.reception_le, 'DD/MM/YYYY')), 300),
        new.territoire, array[60, 30, 7, 0], private.lorani_chef_de_projet(new.client_id, new.id),
        'Faire lever les réserves restantes ; à défaut, mise en demeure et opposition à la libération de la retenue de garantie.',
        format('lorani:gpa:%s:%s', new.id, v_fin));
    exception when others then
      new.gpa_delai_id := null;
    end;
  end if;
  perform private.journaliser_module(new.client_id, 'lorani', 'lorani.reception', 'lorani_projet', new.id::text,
    jsonb_build_object('reception_le', new.reception_le, 'fin_gpa', case when new.reception_le is not null then v_fin end), new.entite_id);
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_projet_reception() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_preparer') then
    create trigger lorani_ordres_service_preparer before insert or update on public.lorani_ordres_service
      for each row execute function private.lorani_os_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_relire') then
    create trigger lorani_ordres_service_relire after insert or update of montant_ht, delai_jours, statut, nature, notifie_le, emis_le on public.lorani_ordres_service
      for each row execute function private.lorani_os_relire();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_tracer') then
    create trigger lorani_ordres_service_tracer after insert or update on public.lorani_ordres_service
      for each row execute function private.tracer('+marche_id', '+numero', '+nature', '+montant_ht', '+delai_jours', '+statut');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_preparer') then
    create trigger lorani_reserves_preparer before insert or update on public.lorani_reserves
      for each row execute function private.lorani_reserves_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_journal') then
    create trigger lorani_reserves_journal after insert or update on public.lorani_reserves
      for each row execute function private.lorani_reserves_tracer_levee();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_tracer') then
    create trigger lorani_reserves_tracer after insert or update on public.lorani_reserves
      for each row execute function private.tracer('+numero', '+lot_id', '+statut', '+lever_avant', '+levee_le');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_projets'::regclass and tgname = 'lorani_projets_reception') then
    create trigger lorani_projets_reception before update of reception_le on public.lorani_projets
      for each row execute function private.lorani_projet_reception();
  end if;
end $$;

-- ——— les rappels : réserve à lever, fin de la GPA ———

insert into private.abonnements (evenement, module, genre)
select 'delai.proche.lorani', 'lorani', 'lorani.chantier.rappel'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.proche.lorani' and a.module = 'lorani' and a.genre = 'lorani.chantier.rappel');
insert into private.abonnements (evenement, module, genre)
select 'delai.depasse.lorani', 'lorani', 'lorani.chantier.depasse'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.depasse.lorani' and a.module = 'lorani' and a.genre = 'lorani.chantier.depasse');

CREATE OR REPLACE FUNCTION private.lorani_chantier_rappeler(t public.travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.lorani_reserves;
  pr public.lorani_projets;
  v_delai uuid := (t.charge ->> 'delai')::uuid;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
  v_depasse boolean := t.genre = 'lorani.chantier.depasse';
  v_ouvertes integer;
  v_detail text;
  v_lot text;
begin
  select * into r from public.lorani_reserves where delai_id = v_delai;
  if found then
    if r.statut <> 'ouverte' then
      return jsonb_build_object('ignore', 'réserve levée ou contestée', 'reserve', r.id);
    end if;
    select * into pr from public.lorani_projets where id = r.projet_id;
    select l.numero into v_lot from public.lorani_lots l where l.id = r.lot_id;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(case when v_depasse
        then format('« %s » : réserve n° %s%s non levée au %s — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'), r.intitule)
        else format('« %s » : réserve n° %s%s à lever avant le %s (%s) — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'),
                    case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end, r.intitule) end, 200),
      jsonb_build_object('projet', r.projet_id, 'reserve', r.id, 'lien', private.lorani_lien_projet(r.projet_id)),
      case when v_depasse then format('reserve:%s:retard', r.id) else format('reserve:%s:rappel:%s', r.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(r.client_id, r.projet_id));
    return jsonb_build_object('reserve', r.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into pr from public.lorani_projets where gpa_delai_id = v_delai;
  if not found then
    return jsonb_build_object('ignore', 'délai hors du chantier');
  end if;
  select string_agg(case when x.numero is null then format('sans lot : %s', x.n) else format('lot %s : %s', x.numero, x.n) end, ', ' order by x.numero nulls last)
    into v_detail
  from (select l.numero, count(*) as n from public.lorani_reserves rr left join public.lorani_lots l on l.id = rr.lot_id
        where rr.projet_id = pr.id and rr.statut = 'ouverte' group by l.numero) x;
  select coalesce(sum(n), 0) into v_ouvertes from (select count(*) as n from public.lorani_reserves rr where rr.projet_id = pr.id and rr.statut = 'ouverte') y;
  perform private.lever_alerte_module(pr.client_id, 'lorani', case when v_ouvertes > 0 then 'attention' else 'info' end,
    left(format('« %s » : %s le %s ; %s', left(pr.nom, 40),
                case when v_depasse then 'la garantie de parfait achèvement a pris fin' else 'fin de la garantie de parfait achèvement' end,
                to_char((pr.reception_le + interval '1 year')::date, 'DD/MM/YYYY'),
                case when v_ouvertes = 0 then 'toutes les réserves sont levées, la retenue de garantie peut être libérée.'
                     else format('%s réserve%s non levée%s (%s) : retenue de garantie à conserver par opposition motivée.', v_ouvertes,
                                 case when v_ouvertes > 1 then 's' else '' end, case when v_ouvertes > 1 then 's' else '' end, v_detail) end), 200),
    jsonb_build_object('projet', pr.id, 'reception_le', pr.reception_le, 'reserves_ouvertes', v_ouvertes, 'lien', private.lorani_lien_projet(pr.id)),
    case when v_depasse then format('gpa:%s:fin', pr.id) else format('gpa:%s:rappel:%s', pr.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(pr.client_id, pr.id));
  return jsonb_build_object('projet', pr.id, 'genre', t.genre, 'reserves_ouvertes', v_ouvertes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_chantier_rappeler(public.travaux) FROM PUBLIC;

-- Le passage des lectures (corps de b5_18) prend aussi les rappels du chantier.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  v_type text;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
  n_plu integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse',
                                                       'lorani.attestation.rappel', 'lorani.attestation.depasse', 'lorani.chantier.rappel', 'lorani.chantier.depasse'],
                                                 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      v_type := null;
      if t.genre = 'lorani.piece_lue' then
        select x.type_piece into v_type from public.pieces x where x.id = (t.charge ->> 'piece')::uuid;
      end if;
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      elsif t.genre in ('lorani.visa.rappel', 'lorani.visa.depasse') then
        v_res := private.lorani_visa_rappeler(t);
      elsif t.genre in ('lorani.attestation.rappel', 'lorani.attestation.depasse') then
        v_res := private.lorani_attestation_rappeler(t);
      elsif t.genre in ('lorani.chantier.rappel', 'lorani.chantier.depasse') then
        v_res := private.lorani_chantier_rappeler(t);
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type = 'lorani_attestation_decennale' then
        v_res := private.lorani_poser_attestation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement', 'lorani_metre')
            or exists (select 1 from public.lorani_controle_pieces cp where cp.piece_id = (t.charge ->> 'piece')::uuid) then
        v_res := private.lorani_piece_controle_lue((t.charge ->> 'piece')::uuid);
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Les recherches de PLU dont les réponses sont arrivées (ou qui ont attendu trop longtemps).
  for r in select l.projet_id from public.lorani_plu l where l.statut in ('geocodage', 'zonage') loop
    begin
      perform private.lorani_plu_avancer(r.projet_id);
      n_plu := n_plu + 1;
    exception when others then
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences, 'plu', n_plu);
end $function$;
