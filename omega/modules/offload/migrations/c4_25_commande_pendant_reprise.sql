-- c4_25 — OFFLOAD : une commande pendant la reprise la clôt, partout (testeur T-OFFLOAD, TOFFLOAD-06 ; C4, 21/10/2026)
--
-- Écart (O7, O11) : une commande saisie pendant une reprise ne la close pas ; la tâche d'appel reste « à faire » (le
-- commercial appellerait un client qui vient de commander), alors que le pilotage compte la commande. Cause : la
-- clôture ne vivait que dans l'étape 1 du cycle, APRÈS ses sorties anticipées (OFFLOAD suspendu, essai sans réglage
-- d'envoi) ; la détection seule, ou un client sans réglage d'envoi, ne la jouait jamais.
--   · private.offload_clore_commandes(p_client, p_compte) : toute reprise ouverte dont le compte a commandé depuis
--     l'ouverture se clôt « commande » ;
--   · elle joue à la saisie d'un achat (aussitôt), à la fin de chaque détection, et au début du cycle, avant ses
--     sorties anticipées (clore ne prépare aucun message) ;
--   · offload_clore annule aussi le message de la reprise qui n'est pas encore parti (à valider ou prêt).
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function private.offload_clore_commandes(p_client uuid, p_compte uuid default null)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
begin
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and (p_compte is null or p.compte_id = p_compte)
      and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and exists (select 1 from public.offload_achats a where a.compte_id = p.compte_id and a.annule_le is null
                  and a.nature <> 'avoir' and a.date_achat >= (p.cree_le at time zone 'Europe/Paris')::date)
  loop
    perform private.offload_clore(k.id, 'commande', 'Une commande est arrivée depuis l''ouverture de la reprise.');
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Clore une reprise : son message pas encore parti est annulé.
create or replace function private.offload_clore(p_reprise uuid, p_issue text, p_motif text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
begin
  select * into r from public.offload_reprises where id = p_reprise for update;
  if not found or r.statut in ('repondue', 'close') then
    return;
  end if;
  update public.offload_reprises
     set statut = case when p_issue in ('reponse', 'arret') then 'repondue' else 'close' end,
         issue = p_issue, motif = coalesce(left(p_motif, 500), motif), close_le = now(), maj_le = now()
   where id = r.id;
  if p_issue in ('commande', 'arret', 'refusee', 'reprise_en_main', 'abandon', 'sans_reponse') then
    update public.offload_taches set statut = 'abandonnee', faite_le = now(), maj_le = now(),
           compte_rendu = coalesce(compte_rendu, case p_issue when 'commande' then 'Le client a commandé : appel sans objet.'
                                                              when 'arret' then 'Le client a demandé l''arrêt.'
                                                              else 'Reprise close : ' || p_issue || '.' end)
     where reprise_id = r.id and statut = 'a_faire' and type = 'appel';
  end if;
  -- Le message qui n'est pas encore parti n'a plus d'objet (c4_25).
  if r.envoi1_id is not null and exists (select 1 from public.envois e where e.id = r.envoi1_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(r.envoi1_id, 'Reprise close (' || p_issue || ') : le message n''a plus d''objet.');
  end if;
  if r.envoi2_id is not null and exists (select 1 from public.envois e where e.id = r.envoi2_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(r.envoi2_id, 'Reprise close (' || p_issue || ') : le message n''a plus d''objet.');
  end if;
  perform private.journaliser_module(r.client_id, 'offload', 'offload.reprise_close', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', r.compte_id, 'issue', p_issue, 'motif', p_motif, 'avant', r.statut), r.entite_id);
end $function$;

-- La saisie d'un achat : la reprise en cours se clôt aussitôt.
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

-- La détection : elle clôt aussi les reprises dont le compte a commandé.
create or replace function private.offload_detecter(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_cloture date;
  r record;
  v_niveau text;
  v_raisons jsonb;
  v_score integer;
  v_retard numeric;
  v_valeur numeric;
  v_pts integer;
  v_avant boolean;
  v_saison_mois integer;
  v_saison_debut date;
  v_saison_annees integer[];
  v_bilan jsonb := '{}'::jsonb;
  v_ancien public.offload_signaux;
  v_entrees integer := 0;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  v_cloture := private.offload_cloture(v_jour, g.jour_cloture);

  for r in
    with jours as (
      select a.compte_id, a.date_achat as d, sum(a.montant_ht) as m
      from public.offload_achats a
      where a.client_id = p_client and a.annule_le is null and a.date_achat <= v_jour
      group by a.compte_id, a.date_achat
    ), ecarts as (
      select j.*, j.d - lag(j.d) over (partition by j.compte_id order by j.d) as ecart,
             row_number() over (partition by j.compte_id order by j.d desc) as rang
      from jours j
    ), stats as (
      select e.compte_id,
             count(*)::integer as nb, min(e.d) as premier, max(e.d) as dernier,
             percentile_cont(0.5) within group (order by e.ecart) filter (where e.ecart is not null) as rythme,
             avg(e.ecart) filter (where e.ecart is not null and e.rang <= 3) as rythme_recent,
             percentile_cont(0.5) within group (order by e.ecart) filter (where e.ecart is not null and e.rang > 3) as rythme_ancien,
             sum(e.m) as ca_total,
             coalesce(sum(e.m) filter (where e.d > v_jour - 365), 0) as ca_12m,
             coalesce(sum(e.m) filter (where e.d > v_jour - 730 and e.d <= v_jour - 365), 0) as ca_12m_prec,
             avg(e.m) as panier,
             avg(e.m) filter (where e.rang <= 3) as panier_recent,
             avg(e.m) filter (where e.rang > 3) as panier_ancien
      from ecarts e
      group by e.compte_id
    )
    select c.id as compte_id, c.entite_id, c.nom, s.*
    from public.offload_comptes c
    left join stats s on s.compte_id = c.id
    where c.client_id = p_client
  loop
    v_raisons := '[]'::jsonb;
    v_score := 0;
    v_retard := null;
    v_avant := false;
    v_valeur := null;

    if coalesce(r.nb, 0) = 0 then
      v_niveau := 'sans_achat';
      v_raisons := jsonb_build_array(jsonb_build_object('code', 'sans_achat', 'points', 0,
        'phrase', 'Aucun achat connu : rien ne permet de dater ce compte, il est présenté à part.'));
    elsif r.ca_total < g.montant_min then
      v_niveau := 'sous_seuil';
      v_raisons := jsonb_build_array(jsonb_build_object('code', 'sous_seuil', 'points', 0,
        'phrase', format('%s d''achats cumulés, sous le montant minimal de %s que vous avez fixé.',
                         private.offload_euros(r.ca_total), private.offload_euros(g.montant_min))));
    else
      -- La valeur annuelle attendue : panier × achats par an au rythme habituel, sinon le meilleur des deux derniers exercices glissants.
      v_valeur := case when r.rythme is not null and r.rythme > 0 and r.nb >= 3 then r.panier * 365.0 / r.rythme
                       else greatest(r.ca_12m, r.ca_12m_prec, r.ca_total / greatest(1, ceil((v_jour - r.premier + 1) / 365.0))) end;

      -- 1. Le retard sur son rythme, ou le silence.
      if r.nb >= 3 and r.rythme is not null and r.rythme > 0 then
        v_retard := round((v_jour - r.dernier) / r.rythme::numeric, 2);
        if (v_jour - r.dernier) >= greatest(g.delai_silence_jours, 3 * r.rythme) then
          v_pts := 60;
          v_raisons := v_raisons || jsonb_build_object('code', 'silence', 'points', v_pts,
            'phrase', format('Le client s''est tu : il achetait en moyenne tous les %s jours et n''a rien acheté depuis %s jours, depuis le %s (%s fois son rythme).',
                             round(r.rythme), v_jour - r.dernier, private.offload_le(r.dernier), replace(to_char(v_retard, 'FM990.0'), '.', ',')));
          v_score := v_score + v_pts;
        elsif v_retard >= 1.5 and (v_jour - r.dernier) >= 14 then
          v_pts := least(50, round((v_retard - 1) * 30)::integer);
          v_raisons := v_raisons || jsonb_build_object('code', 'retard', 'points', v_pts,
            'phrase', format('Il achetait en moyenne tous les %s jours ; rien depuis %s jours, depuis le %s (%s fois son rythme).',
                             round(r.rythme), v_jour - r.dernier, private.offload_le(r.dernier), replace(to_char(v_retard, 'FM990.0'), '.', ',')));
          v_score := v_score + v_pts;
        end if;
      elsif (v_jour - r.dernier) >= g.delai_silence_jours then
        v_pts := 50;
        v_raisons := v_raisons || jsonb_build_object('code', 'silence', 'points', v_pts,
          'phrase', format('%s %s : rien depuis %s jours, au-delà de votre délai de %s jours.',
                           case when r.nb = 1 then 'Un seul achat connu, le' else r.nb || ' achats seulement, le dernier le' end,
                           private.offload_le(r.dernier), v_jour - r.dernier, g.delai_silence_jours));
        v_score := v_score + v_pts;
      end if;

      -- 2. Le chiffre des douze derniers mois contre les douze d'avant.
      if r.ca_12m_prec > 0 and r.ca_12m_prec >= g.montant_min and r.ca_12m <= 0.6 * r.ca_12m_prec then
        v_pts := least(25, round((1 - greatest(r.ca_12m, 0) / r.ca_12m_prec) * 25)::integer);
        v_raisons := v_raisons || jsonb_build_object('code', 'baisse', 'points', v_pts,
          'phrase', format('Chiffre des douze derniers mois : %s, contre %s les douze mois d''avant (%s %%).',
                           private.offload_euros(r.ca_12m), private.offload_euros(r.ca_12m_prec),
                           to_char(round((r.ca_12m - r.ca_12m_prec) / r.ca_12m_prec * 100), 'FMS990')));
        v_score := v_score + v_pts;
      end if;

      -- 3. Le ralentissement : écarts qui s'allongent, panier qui fond.
      if r.nb >= 6 and r.rythme_ancien is not null and r.rythme_ancien > 0 and r.rythme_recent >= 1.5 * r.rythme_ancien then
        v_pts := 10;
        v_raisons := v_raisons || jsonb_build_object('code', 'ralenti', 'points', v_pts,
          'phrase', format('Ses commandes s''espacent : un achat tous les %s jours sur les trois derniers, contre tous les %s jours avant.',
                           round(r.rythme_recent), round(r.rythme_ancien)));
        v_score := v_score + v_pts;
      end if;
      if r.nb >= 6 and r.panier_ancien is not null and r.panier_ancien > 0 and r.panier_recent <= 0.6 * r.panier_ancien then
        v_pts := 10;
        v_raisons := v_raisons || jsonb_build_object('code', 'panier', 'points', v_pts,
          'phrase', format('Son panier fond : %s en moyenne sur les trois derniers achats, contre %s avant.',
                           private.offload_euros(r.panier_recent), private.offload_euros(r.panier_ancien)));
        v_score := v_score + v_pts;
      end if;

      -- 4. La saison manquée : le mois écoulé (ou le mois en cours passé le 20), acheté au moins deux des trois années
      --    passées, et rien depuis le début de ce mois cette année. Seulement pour un client qui achète quelques fois
      --    par an (rythme d'au moins 120 jours, ou inconnu) : pour un client mensuel, le retard dit déjà tout.
      v_saison_mois := null;
      if r.rythme is null or r.rythme >= 120 then
      select m.mois, m.debut, array_agg(distinct m.annee order by m.annee) into v_saison_mois, v_saison_debut, v_saison_annees
      from (
        select x.mois, x.debut, extract(year from a.date_achat)::integer as annee
        from (select date_trunc('month', v_jour - interval '1 month')::date as debut,
                     extract(month from v_jour - interval '1 month')::integer as mois
              union all
              select date_trunc('month', v_jour)::date, extract(month from v_jour)::integer
              where extract(day from v_jour) >= 20) x
        join public.offload_achats a on a.compte_id = r.compte_id and a.annule_le is null
          and extract(month from a.date_achat) = x.mois
          and a.date_achat < x.debut and a.date_achat >= (x.debut - interval '3 years')::date
      ) m
      where not exists (select 1 from public.offload_achats a where a.compte_id = r.compte_id and a.annule_le is null
                        and a.date_achat >= m.debut and a.date_achat <= v_jour)
      group by m.mois, m.debut
      having count(distinct m.annee) >= 2
      order by m.debut desc
      limit 1;
      end if;
      if v_saison_mois is not null then
        v_pts := 15;
        v_raisons := v_raisons || jsonb_build_object('code', 'saison', 'points', v_pts,
          'phrase', format('Il achète chaque année en %s (%s) ; rien en %s %s à ce jour.',
                           private.offload_mois(v_saison_mois), array_to_string(v_saison_annees, ', '),
                           private.offload_mois(v_saison_mois), extract(year from v_saison_debut)));
        v_score := v_score + v_pts;
      end if;

      v_score := least(v_score, 100);
      v_niveau := case
        when v_raisons @> '[{"code": "silence"}]' then 'eteint'
        when v_raisons @> '[{"code": "retard"}]' then 'decroche'
        when v_raisons @> '[{"code": "saison"}]' then 'saison'
        when v_raisons @> '[{"code": "baisse"}]' or v_raisons @> '[{"code": "ralenti"}]' or v_raisons @> '[{"code": "panier"}]' then 'ralentit'
        else 'ok' end;

      -- 5. Avant la clôture : à risque, achat attendu avant la clôture du mois, dans la fenêtre d'alerte.
      if v_niveau in ('eteint', 'decroche', 'saison') and v_jour >= v_cloture - g.alerte_avant_cloture_jours
         and (r.rythme is null or r.dernier + round(r.rythme)::integer <= v_cloture) then
        v_avant := true;
        v_raisons := v_raisons || jsonb_build_object('code', 'avant_cloture', 'points', 0,
          'phrase', format('La clôture du mois tombe le %s : il reste %s jour%s pour qu''une commande compte dans le mois.',
                           private.offload_le(v_cloture), v_cloture - v_jour, case when v_cloture - v_jour > 1 then 's' else '' end));
      end if;
    end if;

    select * into v_ancien from public.offload_signaux s where s.compte_id = r.compte_id;
    insert into public.offload_signaux as s (compte_id, client_id, entite_id, jour, niveau, depuis_le, score, priorite, valeur_annuelle,
                                             nb_achats, premier_achat, dernier_achat, rythme_jours, panier_moyen, attendu_le,
                                             jours_silence, retard, ca_12m, ca_12m_precedent, cloture_le, avant_cloture, raisons, calcule_le)
    values (r.compte_id, p_client, r.entite_id, v_jour, v_niveau, v_jour, v_score,
            round(coalesce(v_valeur, 0) * v_score / 100.0, 2), round(v_valeur, 2),
            coalesce(r.nb, 0), r.premier, r.dernier, round(r.rythme::numeric, 1), round(r.panier, 2),
            case when r.rythme is not null and r.nb >= 3 then r.dernier + round(r.rythme)::integer end,
            v_jour - r.dernier, v_retard, r.ca_12m, r.ca_12m_prec, v_cloture, v_avant, v_raisons, now())
    on conflict (compte_id) do update set
      entite_id = excluded.entite_id, jour = excluded.jour, niveau = excluded.niveau,
      depuis_le = case when s.niveau = excluded.niveau then s.depuis_le else excluded.depuis_le end,
      score = excluded.score, priorite = excluded.priorite, valeur_annuelle = excluded.valeur_annuelle,
      nb_achats = excluded.nb_achats, premier_achat = excluded.premier_achat, dernier_achat = excluded.dernier_achat,
      rythme_jours = excluded.rythme_jours, panier_moyen = excluded.panier_moyen, attendu_le = excluded.attendu_le,
      jours_silence = excluded.jours_silence, retard = excluded.retard, ca_12m = excluded.ca_12m,
      ca_12m_precedent = excluded.ca_12m_precedent, cloture_le = excluded.cloture_le, avant_cloture = excluded.avant_cloture,
      raisons = excluded.raisons, calcule_le = excluded.calcule_le;

    if v_niveau in ('eteint', 'decroche', 'saison', 'ralentit') and v_ancien.niveau is distinct from v_niveau then
      perform private.journaliser_module(p_client, 'offload', 'offload.signal', 'offload_comptes', r.compte_id::text,
        jsonb_build_object('niveau', v_niveau, 'avant', v_ancien.niveau, 'score', v_score, 'jour', v_jour,
                           'raisons', (select jsonb_agg(x ->> 'phrase') from jsonb_array_elements(v_raisons) x)), r.entite_id);
      v_entrees := v_entrees + 1;
    end if;
    v_bilan := jsonb_set(v_bilan, array[v_niveau], to_jsonb(coalesce((v_bilan ->> v_niveau)::integer, 0) + 1));
  end loop;

  -- Les commandes vues par la détection closent les reprises en cours (c4_25).
  perform private.offload_clore_commandes(p_client, null);
  return jsonb_build_object('client', p_client, 'jour', v_jour, 'cloture', v_cloture, 'niveaux', v_bilan, 'entrees', v_entrees,
                            'avant_cloture', (select count(*) from public.offload_signaux s where s.client_id = p_client and s.avant_cloture));
end $function$;

-- Le cycle : la clôture sur commande passe avant les sorties anticipées.
create or replace function private.offload_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  k record;
  v_envoi uuid;
  e public.envois;
  n_commande integer := 0;
  n_relance integer := 0;
  n_sortie integer := 0;
  n_ouverte integer := 0;
  n_refus integer := 0;
  n_ecartes integer := 0;
  v_deja integer;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 00. Une commande clôt la reprise, même OFFLOAD suspendu ou sans réglage d'envoi : clore ne prépare rien (c4_25).
  n_commande := private.offload_clore_commandes(p_client, null);

  -- 0. OFFLOAD suspendu au premier doute : rien ne se prépare (c4_10).
  if private.offload_suspendu(p_client) then
    return jsonb_build_object('bloque', 'suspendu');
  end if;
  -- 0 bis. OFFLOAD en essai et envois du module réglés en réel : on ne prépare rien, on le dit.
  if private.offload_essai_contre_reel(p_client) then
    perform private.lever_alerte_module(p_client, 'offload', 'attention',
      'OFFLOAD est en mode essai, mais les envois du module ne sont pas réglés en essai : aucun message de reprise n''est préparé.',
      '{}'::jsonb, 'offload:essai_contre_reel', false, null);
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;

  select count(*) into v_deja from public.offload_reprises p
  where p.client_id = p_client and p.ouverte_par = 'detection' and (p.cree_le at time zone 'Europe/Paris')::date = v_jour;

  -- 1. (Les commandes ont clos leurs reprises à l'étape 00.)

  -- 2. La relance : message 1 parti depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'envoyee' and g.relance_ecrite
      and p.envoye1_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    begin
      v_envoi := private.offload_preparer_message(k.id, 2);
      select * into e from public.envois where id = v_envoi;
      if v_envoi is null or e.statut = 'bloque' then
        perform private.offload_clore(k.id, 'sans_reponse', 'La relance n''a pas pu être préparée' || coalesce(' (' || e.verrou || ')', '') || '.');
        n_sortie := n_sortie + 1;
      else
        update public.offload_reprises set statut = 'relance_a_valider', envoi2_id = v_envoi, maj_le = now() where id = k.id;
        n_relance := n_relance + 1;
      end if;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;

  -- 2 bis. Relance écrite éteinte (par défaut, c4_16) : un message par trimestre ; sans réponse après le délai, la
  --        reprise se clôt et le compte sort du cycle jusqu'à la fin de la quarantaine.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'envoyee' and not g.relance_ecrite
      and p.envoye1_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    perform private.offload_clore(k.id, 'sans_reponse', 'Un message sans réponse : le compte sort du cycle pour ce trimestre.');
    n_sortie := n_sortie + 1;
  end loop;

  -- 3. La sortie du cycle : relance partie depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'relancee'
      and p.envoye2_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    perform private.offload_clore(k.id, 'sans_reponse', 'Deux messages sans réponse : le compte sort du cycle.');
    n_sortie := n_sortie + 1;
  end loop;

  -- 4. Les nouvelles reprises : clôture proche d'abord, puis priorité ; au plus le plafond du jour. Chaque candidat
  --    passe par offload_ecarte (exclusions, contact récent, groupe déjà sollicité), vu au moment où il passe.
  for k in
    select s.compte_id from public.offload_signaux s
    join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison') and c.statut = 'suivi' and c.fusionne_dans is null
      and (g.vague_jour is null or extract(isodow from v_jour)::integer = g.vague_jour)
      and not exists (select 1 from public.offload_reprises p where p.compte_id = s.compte_id
                      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
                           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours)))
    order by s.avant_cloture desc, s.priorite desc, s.compte_id
  loop
    exit when n_ouverte >= g.plafond_reprises_jour - v_deja;
    if private.offload_ecarte(k.compte_id) is not null then
      n_ecartes := n_ecartes + 1;
      continue;
    end if;
    begin
      perform private.offload_ouvrir(k.compte_id, 'detection', v_jour);
      n_ouverte := n_ouverte + 1;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;

  -- Chaque exécution qui a fait quelque chose laisse son bilan au journal.
  if n_commande + n_relance + n_sortie + n_ouverte + n_refus + n_ecartes > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.cycle', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie,
                         'ouvertes', n_ouverte, 'refus', n_refus, 'ecartes', n_ecartes), null);
  end if;
  return jsonb_build_object('commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie, 'ouvertes', n_ouverte,
                            'refus', n_refus, 'ecartes', n_ecartes);
end $function$;

revoke execute on function private.offload_clore_commandes(uuid, uuid) from public, anon, authenticated;
grant execute on function private.offload_clore_commandes(uuid, uuid) to service_role;
revoke execute on function private.offload_clore(uuid, text, text) from public, anon, authenticated;
grant execute on function private.offload_clore(uuid, text, text) to service_role;
revoke execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
grant execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
revoke execute on function private.offload_detecter(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_detecter(uuid, date) to service_role;
revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_cycle(uuid, date) to service_role;
