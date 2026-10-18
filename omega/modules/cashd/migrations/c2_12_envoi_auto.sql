-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_12 : le « modèle 2 » — les rappels des paliers 1 et 2 partent seuls, sous accord permanent (18/10/2026, C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Décision de Teo (18/10, 21 h 20 Z). L'envoi automatique ne vaut QUE pour les rappels courtois des factures — le rappel
-- du jour d'échéance et le rappel J+7 (paliers « echeance » et « rappel ») ; la relance ferme, la relance d'un devis, la
-- mise en demeure et tout envoi en lettre recommandée (LRE) restent validés par une personne, toujours. Réglable par
-- organisation.
--
-- Comment, sans contourner le socle (« un moteur ne se passe jamais de la validation : un accord permanent peut couvrir
-- ses envois ») :
--   · les rappels des paliers 1 et 2 déposent une demande de type « cashd.rappel » (les autres gardent cashd.relance,
--     cashd.devis, cashd.mise_en_demeure) ;
--   · le gérant active l'envoi automatique (porte cashd_regler_envoi_auto) : CASHD propose un ACCORD PERMANENT du socle
--     (public.politiques, type cashd.rappel, un an, plafond par rappel), qu'une seconde personne active dans la file de
--     validation (règle politique.activer : gérant, administrateur ou valideur, le demandeur exclu par le socle). Tant
--     qu'il est actif, la demande d'un rappel naît approuvée et le message part par le moteur d'envoi, selon le réglage
--     d'envoi de l'organisation (essai, réel… ou coupé : rien ne part) ; le couper révoque l'accord ;
--   · cashd.relance, cashd.devis et cashd.mise_en_demeure sont inscrits dans private.actions_sans_accord : aucun accord
--     ne peut les couvrir. Et si une relance autre qu'un rappel naissait approuvée d'office, CASHD la bloque.
-- Aucun mode d'envoi n'est changé ici ; aucun accord n'est créé ici.
--
-- Règles de pose : create or replace ; insertions gardées ; jamais de DROP ni de DELETE ; revoke execute de public.

do $do$
declare t text;
begin
  if to_regclass('private.actions_sans_accord') is not null then
    foreach t in array array['cashd.relance', 'cashd.devis', 'cashd.mise_en_demeure'] loop
      begin
        execute 'insert into private.actions_sans_accord (module, type_action) select $1, $2
                 where not exists (select 1 from private.actions_sans_accord a where a.module = $1 and a.type_action = $2)' using 'cashd', t;
      exception when others then raise notice 'actions_sans_accord (%) : % (à inscrire à la main)', t, sqlerrm; end;
    end loop;
  end if;
end $do$;

-- L'état de l'envoi automatique des rappels pour une organisation : l'accord actif ou proposé.
create or replace function public.cashd_envoi_auto(p_client uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select jsonb_build_object(
    'actif', exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'cashd' and p.type_action = 'cashd.rappel'
                     and p.statut = 'active' and now() >= p.debut and now() < p.fin),
    'accord', (select jsonb_build_object('id', p.id, 'statut', p.statut, 'plafond', p.plafond_operation, 'debut', p.debut, 'fin', p.fin, 'demande_id', p.demande_id)
               from public.politiques p
               where p.client_id = p_client and p.module = 'cashd' and p.type_action = 'cashd.rappel' and p.statut in ('active', 'a_valider') and p.fin > now()
               order by (p.statut = 'active') desc, p.cree_le desc limit 1))
$function$;

-- Activer (proposer l'accord) ou couper (révoquer) l'envoi automatique des rappels. Gérant seulement ; daté au journal.
create or replace function public.cashd_regler_envoi_auto(p_client uuid, p_actif boolean, p_plafond numeric default 5000)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid()); v_id uuid; p record; v_n integer := 0;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant décide que des rappels partent sans validation.' using errcode = '42501';
  end if;
  perform private.cashd_exiger_installe(p_client);
  if p_actif is null then
    raise exception 'Activer ou couper.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cashd.envoi_auto:' || p_client::text, 0));
  if p_actif then
    if p_plafond is null or p_plafond <= 0 or p_plafond > 1000000 then
      raise exception 'Le plafond d''un rappel envoyé seul est un montant positif (au plus 1 000 000 €).' using errcode = '22023';
    end if;
    -- Deux personnes : l'activation de l'accord est ouverte aux gérants, administrateurs et valideurs (le demandeur exclu).
    insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, actif)
    select p_client, null, 'cashd', 'politique.activer', 1, array['gerant', 'admin', 'valideur'], true
    where not exists (select 1 from public.regles_validation r
                      where r.client_id = p_client and r.module = 'cashd' and r.type_action = 'politique.activer' and r.entite_id is null and r.actif);
    if not exists (select 1 from public.politiques x where x.client_id = p_client and x.module = 'cashd' and x.type_action = 'cashd.rappel'
                     and (x.statut = 'a_valider' or (x.statut = 'active' and x.fin > now() + interval '30 days'))) then
      insert into public.politiques (client_id, entite_id, module, type_action, libelle, plafond_operation, nombre_mensuel, debut, fin)
      values (p_client, null, 'cashd', 'cashd.rappel',
              left('Accord permanent CASHD : rappels courtois (jour de l''échéance et J+7) envoyés sans validation, jusqu''à '
                   || private.cashd_eur(p_plafond, 'fr') || ' par rappel', 200),
              p_plafond, 1000, now(), now() + interval '365 days')
      returning id into v_id;
    end if;
  else
    for p in select x.id from public.politiques x
             where x.client_id = p_client and x.module = 'cashd' and x.type_action = 'cashd.rappel' and x.statut in ('a_valider', 'active') loop
      perform private.revoquer_politique(p.id, 'Envoi automatique des rappels coupé par le gérant dans CASHD');
      v_n := v_n + 1;
    end loop;
  end if;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', p_client::text,
    jsonb_build_object('envoi_auto_rappels', p_actif, 'plafond', case when p_actif then p_plafond end, 'accord_propose', v_id, 'accords_revoques', v_n), null);
  return public.cashd_envoi_auto(p_client) || jsonb_build_object('propose', v_id, 'revoques', v_n);
end $function$;

-- Préparer les relances (c2_10) : le type cashd.rappel pour les paliers 1 et 2 ; aucune autre relance sous accord.
create or replace function private.cashd_preparer_relances(p_client uuid, p_jour date, p_par uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  c record;
  f record;
  v_rel uuid;
  v_nature text;
  v_texte jsonb;
  v_pen jsonb;
  v_demande uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_type text;
  v_palier_max text;
  v_rang_max integer;
  v_mot text;
  v_n_prep integer := 0;
  v_n_bloq integer := 0;
  v_n_coupees integer;
  v_mode_envoi text;
  v_interdit text;
  v_erreur text;
  v_canal text;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  if not found then
    return jsonb_build_object('installe', false);
  end if;
  -- Relire avant d'écrire : ce qui a été réglé depuis hier coupe ce qui était prêt.
  v_n_coupees := private.cashd_verifier_relances(p_client);
  begin
    v_mode_envoi := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode_envoi := null;
  end;

  foreach v_nature in array array['facture', 'devis'] loop
    for c in
      select x.* from public.cashd_comptes x
      where x.client_id = p_client and x.statut = 'actif' and not x.reciproque
        and not exists (select 1 from public.cashd_relances r where r.compte_id = x.id and r.jour = p_jour and r.nature = v_nature)
        -- un règlement du compte reste à lettrer : la séquence attend l'imputation
        and not (v_nature = 'facture' and exists (select 1 from public.cashd_reglements_etat e where e.compte_id = x.id and e.a_imputer > 0))
      order by x.nom
    loop
      v_rel := null;
      -- Les avoirs ouverts du compte sont déduits avant tout calcul du solde dû : imputés sur ses factures échues, de la
      -- plus ancienne à la plus récente (lettrage automatique, journalisé).
      if v_nature = 'facture' then
        for f in
          select a.id as avoir_id, x.id as facture_id
          from public.cashd_factures a
          cross join lateral (select y.id from public.cashd_factures_etat y
                              where y.compte_id = c.id and y.nature in ('facture', 'acompte') and y.statut = 'ouverte' and y.reste_du > 0
                                and y.echeance < p_jour order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
      end if;
      for f in
        select s.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = s.palier_suivant limit 1)::integer as rang
        from public.cashd_suivi s
        where s.compte_id = c.id and s.palier_suivant is not null and s.palier_suivant_le <= p_jour
          and s.etat_sequence in ('pas_encore_relancee', 'en_cours')
          -- le rappel du jour d'échéance ne s'écrit que ce jour-là (c2_10)
          and not (s.palier_suivant = 'echeance' and s.nature <> 'devis' and s.echeance is distinct from p_jour)
          and ((v_nature = 'facture' and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
                and ((select e.reste_relancable from public.cashd_factures_etat e where e.id = s.facture_id) > private.cashd_seuil_relance(c.entite_id, g.seuil_relance)
                     or exists (select 1 from public.cashd_factures z where z.id = s.facture_id and z.solde_decision = 'reclame'))
                and not exists (select 1 from public.cashd_factures z where z.id = s.facture_id
                                and (z.solde_decision = 'abandonne' or z.attente_commande_le is not null)))
               or (v_nature = 'devis' and s.nature = 'devis'))
        order by s.echeance nulls last, s.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_suivant, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_suivant, f.rang,
                case when v_nature = 'devis' then f.montant_ttc else (select e.reste_relancable from public.cashd_factures_etat e where e.id = f.facture_id) end,
                coalesce((v_pen ->> 'retard_jours')::integer, 0), coalesce((v_pen ->> 'penalites')::numeric, 0), coalesce((v_pen ->> 'indemnite')::numeric, 0));
      end loop;
      continue when v_rel is null;

      -- Le palier du message : le plus ferme de ses factures.
      select p.palier, p.rang into v_palier_max, v_rang_max from public.cashd_relances_pieces p where p.relance_id = v_rel order by p.rang desc limit 1;
      update public.cashd_relances set palier = v_palier_max where id = v_rel;
      v_texte := private.cashd_ecrire_texte(v_rel);
      update public.cashd_relances set sujet = v_texte ->> 'sujet', corps = v_texte ->> 'corps', montant = (v_texte ->> 'montant')::numeric,
             gabarit = v_texte ->> 'gabarit', variante = (v_texte ->> 'variante')::smallint,
             penalites = (v_texte ->> 'penalites')::numeric, indemnites = (v_texte ->> 'indemnites')::numeric, maj_le = now()
       where id = v_rel;

      if c.contact_facturation_email is null then
        update public.cashd_relances set statut = 'sans_adresse', motif = 'le compte n''a pas d''adresse de facturation : relancez-le vous-même ou complétez sa fiche' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s est écrite mais ne peut pas partir : le compte n''a pas d''adresse de facturation.', c.nom),
          jsonb_build_object('compte', c.id, 'relance', v_rel), 'relance:sans_adresse:' || c.id::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Les interdits de l'organisation : un message qui en contient un ne part pas.
      v_interdit := null;
      foreach v_mot in array g.interdits loop
        if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower((v_texte ->> 'sujet') || ' ' || (v_texte ->> 'corps'))) > 0 then
          v_interdit := v_mot;
          exit;
        end if;
      end loop;
      if v_interdit is not null then
        update public.cashd_relances set statut = 'bloquee', motif = format('le message contient un mot interdit par vos règles : « %s »', v_interdit) where id = v_rel;
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;
      -- La demande de validation, avec son montant (le seuil de la direction s'y applique).
      v_type := case when v_nature = 'devis' then 'cashd.devis' when v_palier_max = 'mise_en_demeure' then 'cashd.mise_en_demeure'
                    -- les rappels courtois des paliers 1 et 2 : seuls à pouvoir partir sous accord permanent (c2_12)
                    when v_palier_max in ('echeance', 'rappel') then 'cashd.rappel' else 'cashd.relance' end;
      -- La mise en demeure part en lettre recommandée électronique au-delà du seuil réglé (tiers : AR24, branché par le socle).
      v_canal := case when v_type = 'cashd.mise_en_demeure' and g.seuil_lre is not null and (v_texte ->> 'montant')::numeric >= g.seuil_lre then 'lre' else 'email' end;
      update public.cashd_relances set canal = v_canal,
             lien_paiement = (select l.url from public.cashd_relances_pieces x join public.cashd_liens_paiement l on l.facture_id = x.facture_id and l.statut = 'actif'
                              where x.relance_id = v_rel and not x.annulee order by l.cree_le desc limit 1)
       where id = v_rel;
      begin
        insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
        values (p_client, c.entite_id, 'cashd', v_type, 'cashd_relances', v_rel::text,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end
               || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_texte ->> 'montant')::numeric), 500),
          case when v_nature = 'devis' then null else (v_texte ->> 'montant')::numeric end,
          jsonb_build_object('relance', v_rel, 'canal', v_canal, 'mode', g.mode, 'palier', v_palier_max,
            'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
            'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
            'sujet', v_texte ->> 'sujet', 'corps', v_texte ->> 'corps',
            'penalites', (v_texte ->> 'penalites')::numeric, 'indemnites', (v_texte ->> 'indemnites')::numeric,
            'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end),
          (p_jour + 7)::timestamptz, 'cashd:relance:' || v_rel::text)
        returning id, statut, politique_id into v_demande, v_dstatut, v_dpolitique;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set statut = 'echec', motif = left('la demande de validation n''a pas pu être déposée : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('La relance de %s n''a pas pu entrer dans la file de validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:echec:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end;
      update public.cashd_relances set demande_id = v_demande, statut = 'a_valider', maj_le = now() where id = v_rel;
      -- Toute relance écrite et déposée dans la file est au journal, quel que soit le réglage d'envoi.
      perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_preparee', 'cashd_relances', v_rel::text,
        jsonb_build_object('compte', c.reference, 'palier', v_palier_max, 'montant', (v_texte ->> 'montant')::numeric, 'pieces', (v_texte ->> 'pieces')::integer,
                           'demande', v_demande, 'jour', p_jour), c.entite_id);

      -- La mise en demeure exige une validation explicite : un accord permanent ne la couvre jamais.
      if v_type = 'cashd.mise_en_demeure' and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : une mise en demeure exige une validation explicite, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La mise en demeure de %s n''a pas été préparée : un accord permanent couvre les relances CASHD, et une mise en demeure exige une validation explicite.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:med_accord:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Seuls les rappels des paliers 1 et 2 partent sous accord permanent (c2_12) : toute autre relance approuvée d'office
      -- (relance ferme, devis) est retenue.
      if v_type not in ('cashd.rappel', 'cashd.mise_en_demeure') and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : seuls les rappels des paliers 1 et 2 partent sans validation, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s n''a pas été préparée : un accord permanent l''approuvait d''office, et seuls les rappels courtois partent sans validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:accord_hors_rappel:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Le message, adossé à la demande : il ne part que si elle est approuvée.
      if v_mode_envoi is null then
        update public.cashd_relances set statut = 'non_reglee',
          motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé' where id = v_rel;
        v_n_prep := v_n_prep + 1;
        continue;
      end if;
      begin
        v_envoi := private.preparer_envoi(p_client, 'cashd', 'cashd_relances', v_rel::text, v_canal,
          jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                             'professionnel', not c.particulier, 'langue', c.langue),
          null, '{}'::jsonb, v_texte ->> 'sujet', v_texte ->> 'corps', null::uuid[], 'cashd:relance:' || v_rel::text, c.entite_id, true, false,
          null::timestamptz, jsonb_build_object('demande', v_demande));
        update public.cashd_relances set envoi_id = v_envoi, maj_le = now() where id = v_rel;
        v_n_prep := v_n_prep + 1;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('Le message de relance de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:envoi:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
      end;
    end loop;
  end loop;
  perform private.battre(p_client, 'cashd_relances', jsonb_build_object('jour', p_jour, 'preparees', v_n_prep), interval '1 day');
  return jsonb_build_object('jour', p_jour, 'preparees', v_n_prep, 'bloquees', v_n_bloq, 'coupees', v_n_coupees, 'mode_envoi', v_mode_envoi);
end $function$;


revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function public.cashd_envoi_auto(uuid) from public, anon;
revoke execute on function public.cashd_regler_envoi_auto(uuid, boolean, numeric) from public, anon;
grant execute on function public.cashd_envoi_auto(uuid) to authenticated, service_role;
grant execute on function public.cashd_regler_envoi_auto(uuid, boolean, numeric) to authenticated;
