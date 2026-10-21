-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_24b : aucun palier sans message réellement parti, et la reprise des mises en demeure en file
-- (21/10/2026, session C2 — TCASHD-12, suite)
-- ═══════════════════════════════════════════════════════════════════════════
-- c2_24 retient la mise en demeure ; la relance FERME pouvait encore être écrite sans qu'aucun rappel soit parti
-- (recette : A-C02 / FB-0102 après une suspension levée ; A-C17, dont le rappel du 13/11 n'est jamais parti).
-- Désormais, aucun palier n'est atteint sans que le précédent soit réellement parti (moteur, ou envoi noté à la main) :
-- la séquence reprend au premier palier du scénario qui n'est pas parti — le rappel, si rien n'est parti — et ce nouveau
-- message remplace celui qui attendait. La mise en demeure est retenue (c2_24) tant que la relance qui la précède n'est
-- pas partie ; le motif le dit.
-- Reprise de l'existant, une fois : les mises en demeure écrites avant c2_24 sans qu'aucun message soit parti
-- (A-C14, A-C00, A-C12, A-C06), à valider ou approuvées mais pas parties, sont coupées avec le motif ; leurs paliers
-- sont rendus, la facture porte la retenue (fiche : relance_suspendue), une alerte est levée. A-C13 relève de c2_25.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Un message portant la facture à ce palier est-il réellement parti ?
create or replace function private.cashd_palier_parti(p_facture uuid, p_palier text)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from public.cashd_relances_pieces x
                 join public.cashd_relances r on r.id = x.relance_id
                 left join public.envois e on e.id = r.envoi_id
                 where x.facture_id = p_facture and x.palier = p_palier
                   and (e.statut = 'envoye' or e.envoye_le is not null
                        or exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)))
$function$;

-- Le palier à écrire : le premier du scénario (jour d'échéance à part) qui n'est pas réellement parti, jusqu'au palier
-- dû. La mise en demeure et le jour d'échéance ne se réécrivent pas ainsi.
create or replace function private.cashd_palier_a_ecrire(p_facture uuid, p_palier text, p_scenario jsonb)
 returns text language sql stable security definer set search_path to ''
as $function$
  select case when p_palier is null or p_palier in ('echeance', 'mise_en_demeure') then p_palier
    else coalesce((select x.value ->> 'palier' from jsonb_array_elements(p_scenario) with ordinality x
                   where x.value ->> 'palier' <> 'echeance'
                     and x.ordinality <= (select y.ordinality from jsonb_array_elements(p_scenario) with ordinality y where y.value ->> 'palier' = p_palier limit 1)
                     and not private.cashd_palier_parti(p_facture, x.value ->> 'palier')
                   order by x.ordinality limit 1), p_palier) end
$function$;

-- La mise en demeure est-elle permise : la relance qui la précède dans le scénario est-elle réellement partie ?
-- (sans palier avant elle, n'importe quel message parti suffit)
create or replace function private.cashd_med_permise(p_facture uuid, p_scenario jsonb)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select coalesce(
    (select private.cashd_palier_parti(p_facture, x.value ->> 'palier') from jsonb_array_elements(p_scenario) with ordinality x
     where x.value ->> 'palier' not in ('echeance', 'mise_en_demeure')
       and x.ordinality < coalesce((select y.ordinality from jsonb_array_elements(p_scenario) with ordinality y where y.value ->> 'palier' = 'mise_en_demeure' limit 1), 1000)
     order by x.ordinality desc limit 1),
    private.cashd_piece_partie(p_facture))
$function$;

-- Préparer les relances (c2_24) : la séquence reprend au premier palier tant que rien n'est parti.
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
            and not private.cashd_med_permise(s.facture_id, coalesce(c.scenario, g.scenario))
        loop
          if f.relance_retenue is distinct from 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie pour cette facture. Une mise en demeure ne vient qu''après une relance reçue : envoyez d''abord la relance, ou notez-la envoyée à la main.' then
            update public.cashd_factures set relance_retenue = 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie pour cette facture. Une mise en demeure ne vient qu''après une relance reçue : envoyez d''abord la relance, ou notez-la envoyée à la main.', maj_le = now() where id = f.facture_id;
          end if;
          if f.relance_retenue is null then
            perform private.lever_alerte_module(p_client, 'cashd', 'attention',
              format('La mise en demeure de %s (%s) est retenue : la relance qui la précède n''est pas réellement partie. Envoyez d''abord la relance, ou notez-la envoyée à la main.', c.nom, f.numero),
              jsonb_build_object('compte', c.id, 'facture', f.facture_id), 'relance:med_sans_envoi:' || f.facture_id::text, true, null);
          end if;
        end loop;
        update public.cashd_factures z set relance_retenue = null, maj_le = now()
         where z.compte_id = c.id and z.relance_retenue is not null
           and not exists (select 1 from public.cashd_suivi s where s.facture_id = z.id and s.palier_suivant = 'mise_en_demeure' and s.statut = 'ouverte'
                           and s.etat_sequence in ('pas_encore_relancee', 'en_cours'))
            or (z.compte_id = c.id and z.relance_retenue is not null and private.cashd_med_permise(z.id, coalesce(c.scenario, g.scenario)));
      end if;
      for f in
        select q.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = q.palier_ecrit limit 1)::integer as rang
        from (
        -- c2_24b : aucun palier n'est atteint sans que le précédent soit réellement parti : la séquence reprend au premier
        -- palier du scénario qui n'est pas parti (le rappel, si rien n'est parti) ; la mise en demeure, elle, est retenue
        -- tant que la relance qui la précède n'est pas partie (c2_24).
        select s.*, case when v_nature = 'facture' then private.cashd_palier_a_ecrire(s.facture_id, s.palier_suivant, coalesce(c.scenario, g.scenario))
                         else s.palier_suivant end as palier_ecrit
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
                and not (s.palier_suivant = 'mise_en_demeure' and not private.cashd_med_permise(s.facture_id, coalesce(c.scenario, g.scenario))))   -- c2_24
               or (v_nature = 'devis' and s.nature = 'devis'))
        ) q
        order by q.echeance nulls last, q.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_ecrit, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        -- c2_24b : la séquence reprend au premier palier ; le palier de la relance qui n'est jamais partie est rendu
        if f.palier_ecrit is distinct from f.palier_suivant then
          update public.cashd_relances_pieces set annulee = true
           where facture_id = f.facture_id and palier = f.palier_ecrit and not annulee and relance_id <> v_rel;
        end if;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_ecrit, f.rang,
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

-- La reprise : couper les mises en demeure en file sans message parti, et poser la retenue sur leurs factures.
create or replace function private.cashd_retenir_med_sans_envoi(p_client uuid default null)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  v_motif text := 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie. Une mise en demeure ne vient qu''après une relance reçue : envoyez d''abord la relance, ou notez-la envoyée à la main.';
begin
  for r in
    select x.*, d.statut as demande_statut from public.cashd_relances x left join public.demandes_validation d on d.id = x.demande_id
    where (p_client is null or x.client_id = p_client) and x.palier = 'mise_en_demeure' and x.nature = 'facture'
      and x.statut in ('a_valider', 'non_reglee', 'preparee', 'sans_adresse', 'bloquee')
      and coalesce(d.statut, 'en_attente') in ('en_attente', 'approuvee')
      and not exists (select 1 from public.cashd_envois_main m where m.relance_id = x.id)
      and not exists (select 1 from public.envois e where e.id = x.envoi_id and (e.statut = 'envoye' or e.envoye_le is not null))
      and not exists (select 1 from public.cashd_relances_pieces p join public.cashd_comptes c on c.id = x.compte_id join public.cashd_reglages g on g.client_id = x.client_id
                      where p.relance_id = x.id and not p.annulee and private.cashd_med_permise(p.facture_id, coalesce(c.scenario, g.scenario)))
    for update of x
  loop
    if r.demande_statut = 'en_attente' then
      begin
        update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
      exception when others then
        perform private.lever_alerte_module(r.client_id, 'cashd', 'critique', 'Une mise en demeure n''a pas pu être retirée de la file de validation : refusez-la à la main.',
          jsonb_build_object('relance', r.id, 'demande', r.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'relance:coupure:' || r.id::text, true, null);
        continue;
      end;
    end if;
    if r.envoi_id is not null then
      begin
        perform private.annuler_envoi(r.envoi_id, v_motif);
      exception when others then
        begin
          perform private.clore_envoi(r.envoi_id, 'annule', 'ANNULE', v_motif);
        exception when others then
          null;   -- l'envoi n'était pas prêt (demande annulée) : rien à retirer
        end;
      end;
    end if;
    update public.cashd_relances set statut = 'coupee', motif = v_motif, maj_le = now() where id = r.id;
    update public.cashd_factures z set relance_retenue = 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie pour cette facture. Une mise en demeure ne vient qu''après une relance reçue : envoyez d''abord la relance, ou notez-la envoyée à la main.', maj_le = now()
     where z.id in (select p.facture_id from public.cashd_relances_pieces p where p.relance_id = r.id and not p.annulee) and z.relance_retenue is null;
    update public.cashd_relances_pieces set annulee = true where relance_id = r.id;
    perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_coupee', 'cashd_relances', r.id::text,
      jsonb_build_object('motif', v_motif, 'compte', r.compte_id, 'palier', r.palier, 'demande', r.demande_id, 'reprise', 'c2_24b'), r.entite_id);
    perform private.lever_alerte_module(r.client_id, 'cashd', 'attention',
      format('La mise en demeure de %s est retenue : la relance qui la précède n''est pas réellement partie. Envoyez d''abord la relance, ou notez-la envoyée à la main.',
             (select c.nom from public.cashd_comptes c where c.id = r.compte_id)),
      jsonb_build_object('relance', r.id), 'relance:med_sans_envoi_reprise:' || r.id::text, true, null);
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Un message portant la facture est-il parti, autre que la relance donnée ?
create or replace function private.cashd_piece_partie_avant(p_facture uuid, p_sauf uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from public.cashd_relances_pieces x
                 join public.cashd_relances r on r.id = x.relance_id
                 left join public.envois e on e.id = r.envoi_id
                 where x.facture_id = p_facture and r.id <> p_sauf
                   and (e.statut = 'envoye' or e.envoye_le is not null
                        or exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)))
$function$;


revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_piece_partie_avant(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_palier_parti(uuid, text) from public, anon, authenticated;
revoke execute on function private.cashd_palier_a_ecrire(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_med_permise(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_retenir_med_sans_envoi(uuid) from public, anon, authenticated;

select private.cashd_retenir_med_sans_envoi(null) as med_retenues;
