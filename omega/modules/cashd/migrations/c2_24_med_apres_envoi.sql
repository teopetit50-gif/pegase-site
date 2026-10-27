-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_24 : pas de mise en demeure tant qu'aucun palier n'est réellement parti (21/10/2026, session C2 — TCASHD-12)
-- ═══════════════════════════════════════════════════════════════════════════
-- Le moteur avance d'un palier à l'autre à la préparation : un rappel et une relance ferme bloqués (mot interdit, jamais
-- validés) menaient tout de même à une mise en demeure, premier message que le client aurait reçu (recette T-CASHD,
-- A-C14, FB-2026-0115). La capacité promet « deux relances, puis la mise en demeure ».
-- Désormais, la mise en demeure d'une facture n'est écrite que si au moins un message précédent portant cette facture
-- est réellement parti (envoyé par le moteur, ou noté envoyé à la main — c2_11). Sinon, elle n'est pas écrite — la
-- relance ferme en attente n'est donc pas remplacée — et la facture porte la raison (relance_retenue), dite sur la fiche
-- (relance_suspendue) et par une alerte. Elle est réexaminée à chaque passage : dès qu'un message part, elle suit.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_factures add column if not exists relance_retenue text;
comment on column public.cashd_factures.relance_retenue is 'Écrit par le moteur : pourquoi le palier suivant est retenu (c2_24, mise en demeure sans envoi précédent).';

-- Un message portant cette facture est-il réellement parti ?
create or replace function private.cashd_piece_partie(p_facture uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from public.cashd_relances_pieces x
                 join public.cashd_relances r on r.id = x.relance_id
                 left join public.envois e on e.id = r.envoi_id
                 where x.facture_id = p_facture
                   and (e.statut = 'envoye' or e.envoye_le is not null
                        or exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)))
$function$;

-- Préparer les relances (c2_20) : la mise en demeure attend qu'un palier précédent soit parti.
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
                                and y.echeance < p_jour
                                and (a.facture_visee is null or y.numero = a.facture_visee)   -- c2_20 : l'avoir va à la facture qu'il vise
                              order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
        -- c2_24 : une mise en demeure n'est jamais le premier message reçu. Tant qu'aucun palier précédent n'est réellement
        -- parti pour la facture, elle n'est pas écrite ; la pièce porte la raison (relance_retenue), une alerte la dit.
        for f in
          select s.facture_id, s.numero, z.relance_retenue
          from public.cashd_suivi s join public.cashd_factures z on z.id = s.facture_id
          where s.compte_id = c.id and s.palier_suivant = 'mise_en_demeure' and s.palier_suivant_le <= p_jour
            and s.etat_sequence in ('pas_encore_relancee', 'en_cours') and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
            and not private.cashd_piece_partie(s.facture_id)
        loop
          if f.relance_retenue is null then
            update public.cashd_factures set relance_retenue = 'mise en demeure retenue : aucun message précédent n''est réellement parti pour cette facture (rappel et relance ferme non envoyés). Une mise en demeure n''est jamais le premier message reçu : envoyez d''abord la relance, ou notez-la envoyée à la main.', maj_le = now() where id = f.facture_id;
            perform private.lever_alerte_module(p_client, 'cashd', 'attention',
              format('La mise en demeure de %s (%s) est retenue : aucun rappel ni relance ferme n''est réellement parti. Envoyez d''abord la relance, ou notez-la envoyée à la main.', c.nom, f.numero),
              jsonb_build_object('compte', c.id, 'facture', f.facture_id), 'relance:med_sans_envoi:' || f.facture_id::text, true, null);
          end if;
        end loop;
        update public.cashd_factures z set relance_retenue = null, maj_le = now()
         where z.compte_id = c.id and z.relance_retenue is not null
           and not exists (select 1 from public.cashd_suivi s where s.facture_id = z.id and s.palier_suivant = 'mise_en_demeure' and s.statut = 'ouverte'
                           and s.etat_sequence in ('pas_encore_relancee', 'en_cours'))
            or (z.compte_id = c.id and z.relance_retenue is not null and private.cashd_piece_partie(z.id));
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
                                and (z.solde_decision = 'abandonne' or z.attente_commande_le is not null
                                     or z.incoherence is not null))   -- c2_17 : total incohérent, relance suspendue
                and not (s.palier_suivant = 'mise_en_demeure' and not private.cashd_piece_partie(s.facture_id)))   -- c2_24
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

-- La fiche du compte (c2_22) : la mise en demeure retenue, dite sur la pièce.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || (select jsonb_build_object('solde_decision', z.solde_decision, 'solde_decision_motif', z.solde_decision_motif,
                 'accord_oral_le', z.accord_oral_le, 'accord_note', z.accord_note, 'attente_commande_le', z.attente_commande_le,
                 'attente_commande_email', z.attente_commande_email, 'attente_commande_nom', z.attente_commande_nom,
                 'attente_commande_motif', z.attente_commande_motif,
                 -- c2_21 : ce que le moteur retient, dit sur la pièce ; un avoir et une pièce suspendue ne sont pas relançables
                 'incoherence', z.incoherence, 'facture_visee', z.facture_visee,
                 'relance_suspendue', case when z.incoherence is not null and z.statut = 'ouverte'
                                           then 'total incohérent (' || z.incoherence || ') : relance suspendue jusqu''à l''export corrigé ou la marque levée'
                                           -- c2_24 : la mise en demeure retenue, aucun palier précédent n'étant parti
                                           when z.relance_retenue is not null and z.statut = 'ouverte' then z.relance_retenue
                                           -- c2_22 : un règlement du compte reste à lettrer — la séquence attend son imputation
                                           when z.nature in ('facture', 'acompte') and z.statut = 'ouverte' and f.reste_du > 0 and ra.n > 0
                                           then 'un règlement reçu reste à imputer sur ce compte (' || ra.detail || ') : la relance attend son lettrage' end)
                 || case when (z.incoherence is not null and z.statut = 'ouverte') or z.nature = 'avoir' then jsonb_build_object('reste_relancable', 0) else '{}'::jsonb end
                 from public.cashd_factures z where z.id = f.id)
               order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f
               cross join (select count(*) as n,
                                  string_agg(replace(to_char(e.a_imputer, 'FM999999990.00'), '.', ',') || ' € du ' || to_char(e.recu_le, 'DD/MM/YYYY')
                                             || coalesce(', ' || e.reference, ''), ' ; ' order by e.recu_le) as detail
                           from public.cashd_reglements_etat e where e.compte_id = c.id and e.a_imputer > 0) ra
               where f.compte_id = c.id),
    'reponses_lues', (select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) from public.cashd_reponses_lues x
                      where x.compte_id = c.id and x.statut = 'proposee'),
    'pieces_jointes', (select coalesce(jsonb_agg(to_jsonb(p) order by p.cree_le), '[]'::jsonb) from public.cashd_pieces_jointes p
                       join public.cashd_factures f on f.id = p.facture_id where f.compte_id = c.id and p.actif),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

revoke execute on function private.cashd_piece_partie(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
