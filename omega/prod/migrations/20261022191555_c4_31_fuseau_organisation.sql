-- 20261022191555 c4_31_fuseau_organisation
-- Source : dépôt : 71866fa9971367754ed4c04d2183b8537730562f omega/modules/offload/migrations/c4_31_fuseau_organisation.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_31_fuseau_organisation.sql @ 71866fa9971367754ed4c04d2183b8537730562f.
-- ═══ omega/modules/offload/migrations/c4_31_fuseau_organisation.sql @ 71866fa9971367754ed4c04d2183b8537730562f
-- c4_31 — OFFLOAD : le fuseau de l'organisation remplace l'heure de Paris fixe (session C4, 22/10/2026)
--
-- Relevé par le coordinateur après c4_30 : OFFLOAD raisonnait à l'heure de Paris ; un client en Guadeloupe a son propre
-- fuseau. OFFLOAD lit désormais le fuseau de l'organisation, comme le socle (verrous_envoi) : celui de son entité
-- principale (public.entites.fuseau), à défaut « Europe/Paris ».
--   · private.offload_fuseau(p_client), private.offload_fuseau_compte(p_compte) ;
--   · toutes les fonctions d'OFFLOAD qui datent quelque chose (jour de détection, de cycle, de vague, d'arrêté ;
--     « pas dans le futur » d'un achat, d'un contact, d'une intervention ; clôture sur commande ; quarantaine d'un contact ;
--     échéance des tâches ; pilotage ; fiche ; phrases datées) passent par lui.
--   · Reste à l'heure de Paris : offload_deposer_points, le point du matin déposé pour toutes les organisations d'un
--     coup à 5 h (un réglage par organisation demandera de le découper).
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function private.offload_fuseau(p_client uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce((select en.fuseau from public.entites en where en.client_id = p_client and en.principale), 'Europe/Paris')
$function$;

create or replace function private.offload_fuseau_compte(p_compte uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select private.offload_fuseau((select k.client_id from public.offload_comptes k where k.id = p_compte))
$function$;

-- private.offload_affaires_cycle : 3 date(s) au fuseau de l'organisation.
create or replace function private.offload_affaires_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
  k record;
  n1 integer := 0; n2 integer := 0; nd integer := 0; ne integer := 0;
  -- Une affaire relancée pendant ce passage attend le suivant : jamais deux étapes d'un coup.
  v_debut timestamptz := clock_timestamp();
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if private.offload_essai_contre_reel(p_client) then
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;
  if private.offload_suspendu(p_client) then
    return jsonb_build_object('bloque', 'suspendu');
  end if;
  -- 1. Première relance, après le délai fixé.
  -- Un rappel de retrait n'est pas une sollicitation commerciale : un compte inactif, ou déjà contacté, est prévenu
  -- quand même. Seuls l'arrêt demandé et la fiche fusionnée l'écartent ; un compte suivi en direct par un commercial
  -- ou sur une liste d'exclusion est prévenu par une personne (tâche d'appel), jamais par un message automatique.
  for k in select a.id, a.compte_id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'en_attente' and a.disponible_le <= v_jour - g.delai_retrait_jours
           order by a.disponible_le loop
    if k.raison like 'Fiche fusionnée%' or k.raison like 'Retiré à sa demande%' then
      ne := ne + 1;
      continue;
    end if;
    begin
      perform private.offload_relancer_affaire(k.id, 1,
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'À vérifier%' then k.raison end);
      n1 := n1 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 2. Une seule autre, après le délai de relance.
  for k in select a.id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'relancee_1'
             and (a.relance1_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance1_le < v_debut loop
    begin
      perform private.offload_relancer_affaire(k.id, 2,
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'Retiré à sa demande%'
             or k.raison like 'Fiche fusionnée%' or k.raison like 'À vérifier%' then k.raison end);
      n2 := n2 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 3. Deux relances sans réponse : décision manuelle, montant immobilisé en regard.
  update public.offload_affaires a set statut = 'decision', maj_le = now(),
         motif = format('Relancé deux fois sans réponse : à décider (%s immobilisés depuis le %s).',
                        coalesce(private.offload_euros(a.valeur_ht), 'valeur inconnue'), private.offload_le(a.disponible_le))
   where a.client_id = p_client and a.statut = 'relancee_2'
     and (a.relance2_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance2_le < v_debut;
  get diagnostics nd = row_count;
  if n1 + n2 + nd > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.affaires', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne), null);
  end if;
  return jsonb_build_object('relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne);
end $function$;

-- private.offload_arreter : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_arreter(p_client uuid, p_jour date default null)
 returns date
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found or extract(day from v_jour)::integer < g.arrete_jour
     or exists (select 1 from public.offload_arretes a where a.client_id = p_client and date_trunc('month', a.jour) = date_trunc('month', v_jour)) then
    return null;
  end if;
  insert into public.offload_arretes (client_id, jour, pilotage)
  values (p_client, v_jour, private.offload_pilotage_calcul(p_client, (v_jour - interval '12 months')::date))
  on conflict (client_id, jour) do nothing;
  perform private.journaliser_module(p_client, 'offload', 'offload.arrete', 'offload_arretes', v_jour::text,
    jsonb_build_object('jour', v_jour), null);
  return v_jour;
end $function$;

-- private.offload_clore_commandes : 1 date(s) au fuseau de l'organisation.
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
                  and a.nature <> 'avoir' and a.date_achat >= (p.cree_le at time zone private.offload_fuseau(p_client))::date)
  loop
    perform private.offload_clore(k.id, 'commande', 'Une commande est arrivée depuis l''ouverture de la reprise.');
    n := n + 1;
  end loop;
  return n;
end $function$;

-- private.offload_cycle : 2 date(s) au fuseau de l'organisation.
create or replace function private.offload_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
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
  where p.client_id = p_client and p.ouverte_par = 'detection' and (p.cree_le at time zone private.offload_fuseau(p_client))::date = v_jour;

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

-- private.offload_detecter : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_detecter(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
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

-- private.offload_echeances_cycle : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_echeances_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
  q record;
  k record;
  v_base date;
  v_ailleurs boolean;
  v_due date;
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  c public.offload_comptes;
  v_msg jsonb;
  v_retenu text;
  v_raison text;
  v_n integer;
  n_nouvelles integer := 0; n_honorees integer := 0; n_depassees integer := 0; n_prevenues integer := 0; n_appels integer := 0;
  n_contrats integer := 0; n_ecartees integer := 0;
begin
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 1. Chaque équipement actif : son échéance datée depuis la dernière intervention enregistrée.
  for q in select x.* from public.offload_equipements x where x.client_id = p_client and x.statut = 'actif' loop
    select i.le, i.ailleurs into v_base, v_ailleurs from public.offload_interventions i
    where i.equipement_id = q.id order by i.le desc, i.ailleurs limit 1;
    if q.derniere_intervention is not null and (v_base is null or q.derniere_intervention > v_base) then
      v_base := q.derniere_intervention;
      v_ailleurs := false;
    end if;
    continue when v_base is null;
    v_due := (v_base + make_interval(months => q.periodicite_mois))::date;
    -- Une intervention plus récente honore les échéances d'avant (ailleurs : « honorée ailleurs »).
    update public.offload_echeances h
       set statut = case when v_ailleurs then 'honoree_ailleurs' else 'honoree' end, honoree_le = v_base, maj_le = now(),
           motif = case when v_ailleurs then 'Intervention faite ailleurs le ' || private.offload_le(v_base) || ' : l''échéance sort du cycle.'
                        else 'Intervention du ' || private.offload_le(v_base) || '.' end
     where h.equipement_id = q.id and h.type = 'entretien' and h.due_le < v_due
       and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee');
    get diagnostics v_n = row_count;
    n_honorees := n_honorees + v_n;
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, nature, due_le, base_le)
    values (q.client_id, q.entite_id, q.compte_id, 'entretien', q.id, q.nature, v_due, v_base)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      n_nouvelles := n_nouvelles + 1;
    end if;
  end loop;

  -- 2. Tombée sans intervention connue : en attente, jamais relancée une seconde fois.
  update public.offload_echeances h set statut = 'depassee', maj_le = now(),
         motif = 'Échéance du ' || private.offload_le(h.due_le) || ' tombée sans intervention connue : en attente, sans seconde relance.'
   where h.client_id = p_client and h.type = 'entretien' and h.due_le < v_jour and h.statut in ('a_venir', 'prevenue', 'appel');
  get diagnostics n_depassees = row_count;

  -- 3. Les contrats : leur fin est une échéance ; sans reconduction tacite, à 60 jours ou passée, il s'éteint.
  for k in select x.* from public.offload_contrats x where x.client_id = p_client and x.statut = 'actif' loop
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, contrat_id, nature, due_le, base_le)
    values (k.client_id, k.entite_id, k.compte_id, 'contrat', k.equipement_id, k.id, 'commerciale', k.fin, k.debut)
    on conflict do nothing;
    if k.reconduction <> 'tacite' and k.fin <= v_jour + 60
       and not exists (select 1 from public.offload_contrats y where y.compte_id = k.compte_id and y.id <> k.id
                       and y.statut = 'actif' and y.fin > k.fin and coalesce(y.equipement_id, k.equipement_id) is not distinct from k.equipement_id) then
      update public.offload_echeances h set s_eteint = true, maj_le = now(),
             motif = format('Le contrat %s %s le %s sans reconduction %s.', k.numero,
                            case when k.fin < v_jour then 's''est éteint' else 's''éteint' end, private.offload_le(k.fin),
                            case k.reconduction when 'aucune' then 'prévue' else 'tacite : il faut le renouveler' end)
       where h.contrat_id = k.id and h.type = 'contrat' and h.due_le = k.fin and not h.s_eteint
      returning h.id into v_id;
      if found then
        n_contrats := n_contrats + 1;
        select * into c from public.offload_comptes where id = k.compte_id;
        insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
        values (k.client_id, k.entite_id, k.compte_id, v_id, 'appel', left('Proposer le renouvellement du contrat ' || k.numero || ' — ' || c.nom, 200),
                left(format('Le contrat %s%s prend fin le %s, sans reconduction tacite.%s', k.numero, coalesce(' (' || k.libelle || ')', ''),
                            private.offload_le(k.fin), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                c.commercial, least(greatest(v_jour, k.fin - 30), v_jour + 3))
        on conflict do nothing;
        perform private.journaliser_module(k.client_id, 'offload', 'offload.contrat_s_eteint', 'offload_contrats', k.id::text,
          jsonb_build_object('numero', k.numero, 'fin', k.fin, 'reconduction', k.reconduction), k.entite_id);
      end if;
    end if;
    if k.fin < v_jour and k.reconduction <> 'tacite' then
      update public.offload_contrats set statut = 'echu', maj_le = now() where id = k.id;
    elsif k.fin < v_jour and k.reconduction = 'tacite' then
      update public.offload_contrats set statut = 'reconduit', maj_le = now() where id = k.id;
    end if;
  end loop;

  -- 4. Prévenir la semaine qui précède (J-7 à J-1, jamais le jour même), une fois.
  if not private.offload_essai_contre_reel(p_client) and not private.offload_suspendu(p_client) then
    for k in
      select h.* from public.offload_echeances h
      where h.client_id = p_client and h.type = 'entretien' and h.statut = 'a_venir'
        and h.due_le between v_jour + 1 and v_jour + 7
      order by h.due_le, h.nature desc, h.id
    loop
      v_raison := private.offload_ecarte_echeance(k.compte_id, v_jour);
      if v_raison is not null then
        n_ecartees := n_ecartees + 1;
        continue;
      end if;
      select * into c from public.offload_comptes where id = k.compte_id;
      begin
        v_envoi := null;
        v_retenu := null;
        if nullif(btrim(c.email), '') is not null then
          perform private.offload_assurer_consentement(c.id);
          v_msg := private.offload_regles_appliquer(k.client_id, private.offload_message_echeance(k.id));
          v_retenu := v_msg ->> 'retenu';
        end if;
        if v_retenu is null and nullif(btrim(c.email), '') is not null then
          v_envoi := private.offload_envoyer(k.client_id, 'echeance', c.id, 'offload_echeances', k.id::text,
            jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                               'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
            v_msg, 'offload:echeance:' || k.id::text, k.entite_id);
          select * into e from public.envois where id = v_envoi;
        end if;
        if v_envoi is not null and e.statut <> 'bloque' then
          update public.offload_echeances set statut = 'a_valider', envoi_id = v_envoi, maj_le = now() where id = k.id;
          n_prevenues := n_prevenues + 1;
        else
          update public.offload_echeances set statut = 'appel', envoi_id = v_envoi, maj_le = now(),
                 motif = case when v_retenu is not null then left(format('Message retenu par votre règle « %s » : le commercial prévient le client.', v_retenu), 500)
                              when v_envoi is null then 'Pas de courriel connu : le commercial prévient le client.'
                              else left(format('Message retenu par le socle (%s) : le commercial prévient le client.', e.verrou), 500) end
           where id = k.id;
          insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
          select k.client_id, k.entite_id, k.compte_id, k.id, 'appel',
                 left(format('Prévenir %s : %s le %s', c.nom, case when k.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                             private.offload_le(k.due_le)), 200),
                 left(format('%s (n° %s%s), dernière intervention le %s.%s', q2.designation, q2.ref, coalesce(', site ' || q2.site, ''),
                             private.offload_le(k.base_le), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                 c.commercial, v_jour
          from public.offload_equipements q2 where q2.id = k.equipement_id
          on conflict do nothing;
          n_appels := n_appels + 1;
        end if;
      exception when others then
        n_ecartees := n_ecartees + 1;
      end;
    end loop;
  end if;

  if n_nouvelles + n_honorees + n_depassees + n_prevenues + n_appels + n_contrats > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.echeances', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees,
                         'prevenues', n_prevenues, 'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees), null);
  end if;
  return jsonb_build_object('nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees, 'prevenues', n_prevenues,
                            'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees);
end $function$;

-- private.offload_pilotage_calcul : 6 date(s) au fuseau de l'organisation.
create or replace function private.offload_pilotage_calcul(p_client uuid, p_depuis date default null)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with bornes as (
    select coalesce(p_depuis, (now() at time zone private.offload_fuseau(p_client))::date - 365) as depuis,
           (now() at time zone private.offload_fuseau(p_client))::date as jour
  ), lieux as (
    -- La société et le site de chaque entité.
    select e.id as entite_id,
           case when e.type = 'societe' or p.id is null then e.id else p.id end as societe_id,
           case when e.type = 'societe' or p.id is null then e.nom else p.nom end as societe,
           case when e.type in ('site', 'etablissement') then e.id end as site_id,
           case when e.type in ('site', 'etablissement') then e.nom end as site
    from public.entites e left join public.entites p on p.id = e.parent_id
    where e.client_id = p_client
  ), rep as (
    select r.*, (r.cree_le at time zone private.offload_fuseau(p_client))::date as vague,
           r.repondu_le is not null as a_repondu,
           coalesce(c.chiffre, 0) as chiffre_repris,
           (r.issue = 'commande' or coalesce(c.chiffre, 0) > 0) as a_commande,
           r.envoi1_id is not null as par_courriel,
           exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel') as par_appel,
           exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel' and t.statut = 'faite') as appel_passe,
           sg.niveau as niveau_actuel
    from public.offload_reprises r
    left join lateral (select sum(a.montant_ht) as chiffre from public.offload_achats a
                       where a.compte_id = r.compte_id and a.annule_le is null
                         and a.date_achat between (r.cree_le at time zone private.offload_fuseau(p_client))::date
                                              and (r.cree_le at time zone private.offload_fuseau(p_client))::date + 90) c on true
    left join public.offload_signaux sg on sg.compte_id = r.compte_id
    where r.client_id = p_client and (r.cree_le at time zone private.offload_fuseau(p_client))::date >= (select depuis from bornes)
  ), aff as (
    select a.*, e.envoye_le as envoye1_le
    from public.offload_affaires a left join public.envois e on e.id = a.envoi1_id
    where a.client_id = p_client and a.disponible_le >= (select depuis from bornes) - 90
  ), ech as (
    select h.* from public.offload_echeances h
    where h.client_id = p_client and h.type = 'entretien' and h.honoree_le >= (select depuis from bornes)
      and h.statut in ('honoree', 'honoree_ailleurs')
  ), par as (
    select l.societe_id, l.societe, l.site_id, l.site,
           (select count(*) from rep where rep.entite_id = l.entite_id) as comptes,
           (select coalesce(sum(valeur_en_jeu), 0) from rep where rep.entite_id = l.entite_id) as en_jeu,
           (select count(*) from rep where rep.entite_id = l.entite_id and a_repondu) as reponses,
           (select count(*) from rep where rep.entite_id = l.entite_id and a_commande) as commandes,
           (select coalesce(sum(chiffre_repris), 0) from rep where rep.entite_id = l.entite_id) as chiffre_repris,
           (select count(*) from ech where ech.entite_id = l.entite_id) as echeances_honorees,
           (select count(*) from aff where aff.entite_id = l.entite_id and aff.statut = 'retiree' and aff.relance1_le is not null) as affaires_retirees
    from lieux l
  ), taux as (
    -- Une ligne par sollicitation comparable : (axe, valeur, sollicité, a répondu).
    select 'segment' as axe, segment as valeur, true as sollicite, a_repondu from rep where envoye1_le is not null or par_appel
    union all select 'niveau', coalesce(niveau, 'inconnu'), true, a_repondu from rep where envoye1_le is not null or par_appel
    union all select 'canal', 'Courriel', true, a_repondu from rep where envoye1_le is not null
    union all select 'canal', 'Appel', true, appel_passe or a_repondu from rep where par_appel and envoye1_le is null
    union all select 'message', 'Premier message', true, a_repondu and (envoye2_le is null or repondu_le < envoye2_le) from rep where envoye1_le is not null
    union all select 'message', 'Relance', true, a_repondu and envoye2_le is not null and repondu_le >= envoye2_le from rep where envoye2_le is not null
    union all select 'message', 'Rappel de retrait', true, repondu_le is not null from aff where envoye1_le is not null
  )
  select jsonb_build_object(
    'depuis', (select depuis from bornes),
    'calcule_le', now(),
    'vagues', coalesce((select jsonb_agg(v order by v ->> 'vague' desc) from (
        select jsonb_build_object('vague', vague, 'comptes', count(*), 'en_jeu', coalesce(sum(valeur_en_jeu), 0),
                                  'messages', count(*) filter (where envoye1_le is not null),
                                  'appels', count(*) filter (where par_appel),
                                  'reponses', count(*) filter (where a_repondu),
                                  'commandes', count(*) filter (where a_commande),
                                  'chiffre_repris', coalesce(sum(chiffre_repris), 0),
                                  'taux_reponse', round(100.0 * count(*) filter (where a_repondu)
                                                        / nullif(count(*) filter (where envoye1_le is not null or par_appel), 0), 1)) as v
        from rep group by vague) z), '[]'::jsonb),
    'taux', coalesce((select jsonb_object_agg(axe, lignes) from (
        select axe, jsonb_agg(jsonb_build_object('valeur', valeur, 'sollicites', n, 'reponses', r,
                                                 'taux', round(100.0 * r / nullif(n, 0), 1)) order by n desc, valeur) as lignes
        from (select axe, valeur, count(*) as n, count(*) filter (where a_repondu) as r from taux group by axe, valeur) t
        group by axe) z), '{}'::jsonb),
    'suivi', coalesce((select jsonb_agg(m order by m ->> 'mois' desc) from (
        select jsonb_build_object('mois', mois,
                 'echeances_honorees', coalesce((select count(*) from ech where to_char(ech.honoree_le, 'YYYY-MM') = mois), 0),
                 'echeances_apres_message', coalesce((select count(*) from ech where to_char(ech.honoree_le, 'YYYY-MM') = mois and ech.envoi_id is not null), 0),
                 'commandes_reprises', coalesce((select count(*) from rep where a_commande and to_char(vague, 'YYYY-MM') = mois), 0),
                 'chiffre_repris', coalesce((select sum(chiffre_repris) from rep where to_char(vague, 'YYYY-MM') = mois), 0),
                 'affaires_retirees', coalesce((select count(*) from aff where aff.statut = 'retiree' and aff.relance1_le is not null
                                                and to_char(aff.retire_le, 'YYYY-MM') = mois), 0),
                 'valeur_liberee', coalesce((select sum(aff.valeur_ht) from aff where aff.statut = 'retiree' and aff.relance1_le is not null
                                             and to_char(aff.retire_le, 'YYYY-MM') = mois), 0)) as m
        from (select distinct to_char(d, 'YYYY-MM') as mois
              from generate_series(date_trunc('month', (select depuis from bornes)), (select jour from bornes), interval '1 month') d) mm) z), '[]'::jsonb),
    'entites', jsonb_build_object(
      'par_entite', coalesce((select jsonb_agg(to_jsonb(x) order by x.societe) from (
          select societe_id, societe, sum(comptes) as comptes, sum(en_jeu) as en_jeu, sum(reponses) as reponses, sum(commandes) as commandes,
                 sum(chiffre_repris) as chiffre_repris, sum(echeances_honorees) as echeances_honorees, sum(affaires_retirees) as affaires_retirees
          from par group by societe_id, societe) x), '[]'::jsonb),
      'par_site', coalesce((select jsonb_agg(to_jsonb(x) order by x.societe, x.site) from (
          select societe_id, societe, site_id, site, sum(comptes) as comptes, sum(en_jeu) as en_jeu, sum(reponses) as reponses, sum(commandes) as commandes,
                 sum(chiffre_repris) as chiffre_repris, sum(echeances_honorees) as echeances_honorees, sum(affaires_retirees) as affaires_retirees
          from par where site_id is not null group by societe_id, societe, site_id, site) x), '[]'::jsonb),
      'consolide', (select jsonb_build_object('comptes', coalesce(sum(comptes), 0), 'en_jeu', coalesce(sum(en_jeu), 0), 'reponses', coalesce(sum(reponses), 0),
                                              'commandes', coalesce(sum(commandes), 0), 'chiffre_repris', coalesce(sum(chiffre_repris), 0),
                                              'echeances_honorees', coalesce(sum(echeances_honorees), 0), 'affaires_retirees', coalesce(sum(affaires_retirees), 0))
                    from par))
  )
$function$;

-- private.offload_ecarte : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_ecarte(p_compte uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  x public.offload_exclusions;
  v_contact public.offload_contacts;
  v_autre text;
  v_impaye text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.fusionne_dans is not null then
    return 'Fiche fusionnée dans une autre.';
  end if;
  if c.verification is not null then
    return 'À vérifier : ' || coalesce(c.verification_motif, 'le compte attend une vérification') || '';
  end if;
  v_impaye := private.offload_impaye(c.id);
  if v_impaye is not null then
    return format('Impayé : %s. Une relance commerciale et une relance d''impayé ne se croisent jamais.', v_impaye);
  end if;
  if c.statut = 'exclu' then
    return 'Suivi en direct par un commercial' || coalesce(' : ' || c.statut_motif, '') || '.';
  end if;
  if c.statut = 'arrete' then
    return 'Retiré à sa demande.';
  end if;
  select * into x from public.offload_exclusions e
  where e.client_id = c.client_id and e.levee_le is null
    and ((e.type = 'compte' and (e.valeur = c.id::text or lower(e.valeur) = lower(c.ref)))
      or (e.type = 'secteur' and lower(e.valeur) = lower(c.secteur))
      or (e.type = 'commercial' and lower(e.valeur) = lower(c.commercial))
      or (e.type = 'groupe' and lower(e.valeur) = lower(c.groupe)))
  order by e.cree_le limit 1;
  if x.id is not null then
    return format('Exclu par la liste (%s « %s ») : %s', case x.type when 'compte' then 'compte' when 'secteur' then 'secteur'
                                                               when 'commercial' then 'commercial' else 'groupe' end, x.valeur, x.motif);
  end if;
  select * into v_contact from public.offload_contacts k
  where k.compte_id = c.id and k.le > (now() at time zone private.offload_fuseau_compte(p_compte))::date - g.quarantaine_jours
  order by k.le desc limit 1;
  if v_contact.id is not null then
    return format('Déjà contacté le %s%s : écarté de la vague en cours.', private.offload_le(v_contact.le), coalesce(' par ' || v_contact.par, ''));
  end if;
  if nullif(btrim(c.groupe), '') is not null then
    select k.nom into v_autre from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = c.client_id and k.id <> c.id and lower(btrim(k.groupe)) = lower(btrim(c.groupe))
      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours))
    limit 1;
    if v_autre is not null then
      return format('Le groupe « %s » est déjà sollicité (par %s) : le plafond vaut pour le groupe.', c.groupe, v_autre);
    end if;
  end if;
  return null;
end $function$;

-- private.offload_noter_contact : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_noter_contact(p_compte uuid, p_le date, p_canal text, p_par text default null, p_note text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter un contact');
  if p_le is null or p_le > (now() at time zone private.offload_fuseau_compte(p_compte))::date or p_le < date '1990-01-01' then
    raise exception 'Un contact est daté, et pas dans le futur.' using errcode = '22023';
  end if;
  if p_canal not in ('appel', 'visite', 'courriel', 'salon', 'autre') then
    raise exception 'Canal du contact : appel, visite, courriel, salon ou autre.' using errcode = '22023';
  end if;
  -- Rejouer le même contact ne crée rien (c4_24).
  select k.id into v_id from public.offload_contacts k
  where k.compte_id = c.id and k.le = p_le and k.canal = p_canal
    and k.par is not distinct from private.offload_texte(p_par, 120) and k.note is not distinct from private.offload_texte(p_note, 2000)
  order by k.cree_le limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_le, p_canal, private.offload_texte(p_par, 120), private.offload_texte(p_note, 2000), (select auth.uid()))
  returning id into v_id;
  update public.offload_comptes set dernier_contact = greatest(coalesce(dernier_contact, p_le), p_le), maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.contact_note', 'offload_comptes', c.id::text,
    jsonb_build_object('le', p_le, 'canal', p_canal, 'par', p_par), c.entite_id);
  return v_id;
end $function$;

-- private.offload_saisir_achat : 1 date(s) au fuseau de l'organisation.
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
  if p_date is null or p_date < date '1990-01-01' or p_date > (now() at time zone private.offload_fuseau_compte(p_compte))::date then
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

-- private.offload_ouvrir : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_ouvrir(p_compte uuid, p_par text, p_jour date default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  s public.offload_signaux;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau_compte(p_compte))::date);
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  v_statut text;
  v_motif text;
  v_dernier public.offload_achats;
  v_detail text;
  v_echeance date;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.statut <> 'suivi' then
    raise exception 'Ce compte est % : il ne reçoit aucune reprise.', case c.statut when 'exclu' then 'suivi en direct' else 'retiré à sa demande' end
      using errcode = '55000';
  end if;
  -- Un compte en litige ou en recouvrement chez CASHD ne reçoit aucune reprise commerciale, même ouverte à la main (c4_23).
  v_motif := private.offload_impaye(c.id);
  if v_motif is not null then
    raise exception '% : pas de reprise commerciale tant que CASHD suit ce compte.', v_motif using errcode = '55000';
  end if;
  select x.id into v_id from public.offload_reprises x
  where x.compte_id = c.id and x.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
  if v_id is not null then
    return v_id;
  end if;
  if coalesce(current_setting('offload.forcer', true), '') <> 'oui'
     and exists (select 1 from public.offload_reprises x where x.compte_id = c.id
             and coalesce(x.close_le, x.repondu_le, x.cree_le) > now() - make_interval(days => g.quarantaine_jours)) then
    raise exception 'Ce compte a déjà eu une reprise il y a moins de % jours.', g.quarantaine_jours using errcode = '55000';
  end if;

  if private.offload_suspendu(c.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = c.client_id) using errcode = '55000';
  end if;
  if private.offload_essai_contre_reel(c.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module ne sont pas réglés en essai : rien n''est préparé (aucun message ne naît en réel).' using errcode = '55000';
  end if;
  select * into s from public.offload_signaux where compte_id = c.id;
  insert into public.offload_reprises (client_id, entite_id, compte_id, statut, ouverte_par, ouverte_par_user, niveau, score, raisons)
  values (c.client_id, c.entite_id, c.id, 'appel', p_par, (select auth.uid()), s.niveau, s.score, coalesce(s.raisons, '[]'::jsonb))
  returning id into v_id;

  -- La tâche d'appel du commercial, avant la clôture (ou sous trois jours si la clôture est loin) : posée seulement si
  -- le message ne part pas (un seul canal à la fois, c4_12).
  select * into v_dernier from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir' order by x.date_achat desc limit 1;
  v_echeance := least(coalesce(s.cloture_le, v_jour + 3), v_jour + 3);
  v_detail := concat_ws(E'\n',
    (select string_agg('• ' || (x ->> 'phrase'), E'\n') from jsonb_array_elements(coalesce(s.raisons, '[]'::jsonb)) x),
    case when v_dernier.id is not null then format('Dernière commande : %s, %s HT%s.', private.offload_le(v_dernier.date_achat),
                                                   private.offload_euros(v_dernier.montant_ht), coalesce(', réf. ' || v_dernier.reference, '')) end,
    case when c.telephone is not null then 'Téléphone : ' || c.telephone end,
    case when c.contact is not null then 'Contact : ' || c.contact end);

  -- Le message : en validation, ou rien si le compte n'a pas de courriel, ou bloqué par un verrou du socle.
  v_envoi := private.offload_preparer_message(v_id, 1);
  if v_envoi is null then
    v_statut := 'appel';
    v_motif := coalesce((select x.motif from public.offload_reprises x where x.id = v_id),
                        'Pas de courriel connu : la reprise passe par l''appel du commercial.');
  else
    select * into e from public.envois where id = v_envoi;
    if e.statut = 'bloque' then
      v_statut := 'appel';
      v_motif := left(format('Message retenu par le socle (%s) : %s', e.verrou, coalesce(e.motif, '')), 500);
    else
      v_statut := 'a_valider';
    end if;
  end if;
  update public.offload_reprises set statut = v_statut, envoi1_id = v_envoi, motif = v_motif, maj_le = now() where id = v_id;
  if v_statut = 'appel' then
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, v_id, 'appel', left('Appeler ' || c.nom, 200), left(v_detail, 4000), c.commercial, v_echeance);
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reprise_ouverte', 'offload_reprises', v_id::text,
    jsonb_build_object('compte', c.id, 'par', p_par, 'niveau', s.niveau, 'score', s.score, 'statut', v_statut, 'envoi', v_envoi,
                       'motif', v_motif), c.entite_id);
  return v_id;
end $function$;

-- private.offload_message : 2 date(s) au fuseau de l'organisation.
create or replace function private.offload_message(p_compte uuid, p_rang integer, p_premier_le timestamptz default null,
                                                   p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  a public.offload_achats;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau_compte(p_compte))::date);
  v_org text;
  v_bonjour text;
  v_commande text;
  v_signature text;
  v_sujet text;
  v_corps text;
  v_echeance text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  select * into a from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir'
  order by x.date_achat desc, x.montant_ht desc limit 1;

  -- Le motif daté : l'entretien qui revient dans les deux mois (hors semaine qui vient), ou tombé sans intervention.
  select case when h.statut = 'depassee'
              then format('L''entretien de votre %s%s était à refaire le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le))
              else format('L''entretien de votre %s%s est à refaire d''ici le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le)) end
    into v_echeance
  from public.offload_echeances h join public.offload_equipements q on q.id = h.equipement_id
  where h.compte_id = c.id and h.type = 'entretien'
    and ((h.statut = 'a_venir' and h.due_le between v_jour + 8 and v_jour + 60) or h.statut = 'depassee')
  order by (h.statut = 'depassee') desc, h.due_le limit 1;

  v_bonjour := 'Bonjour' || coalesce(' ' || c.contact, '') || ',';
  v_signature := coalesce(nullif(btrim(g.signature), ''), v_org);
  if a.id is not null then
    v_commande := format('votre dernière commande chez %s date du %s (%s%s), il y a %s',
      v_org, private.offload_date_longue(a.date_achat),
      concat_ws(', ', 'réf. ' || a.reference, '« ' || a.libelle || ' »', private.offload_euros(a.montant_ht) || ' HT'), '',
      private.offload_duree(a.date_achat, v_jour));
  end if;

  if p_rang = 1 then
    v_sujet := left(v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                  else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || case when a.id is not null then 'Je reprends votre dossier : ' || v_commande || '.' || E'\n\n'
              else 'Nous n''avons pas eu l''occasion de travailler ensemble depuis un moment.' || E'\n\n' end
      || coalesce(v_echeance || E'\n\n', '')
      || 'Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour à ce message suffit : '
      || 'nous vous rappelons au moment qui vous convient.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  else
    v_sujet := left('Re : ' || v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                             else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone private.offload_fuseau_compte(p_compte))::date), 'dernier')
      || case when a.id is not null then ', au sujet de ' || replace(v_commande, 'votre dernière commande chez ' || v_org || ' date du', 'votre commande du') else '' end
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  end if;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps);
end $function$;

-- private.offload_lire_reponse_auto : 2 date(s) au fuseau de l'organisation.
create or replace function private.offload_lire_reponse_auto(p_reception bigint, p_compte uuid, p_genre text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  c public.offload_comptes;
  r record;
begin
  select * into x from public.receptions where id = p_reception;
  select * into c from public.offload_comptes where id = p_compte;
  if c.id is null then
    return jsonb_build_object('statut', 'ignore', 'auto', p_genre);
  end if;
  if p_genre = 'absence' then
    perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_auto', 'offload_comptes', c.id::text,
      jsonb_build_object('reception', x.id, 'genre', 'absence'), c.entite_id);
    return jsonb_build_object('statut', 'absence', 'compte', c.id);
  end if;
  perform private.offload_a_verifier(c.id, 'reattribuer',
    format('L''interlocuteur a quitté l''entreprise (réponse automatique du %s) : à réattribuer.', private.offload_le((x.recu_le at time zone private.offload_fuseau_compte(p_compte))::date)));
  for r in select p.id from public.offload_reprises p
           where p.compte_id = c.id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee') loop
    perform private.offload_clore(r.id, 'abandon', 'L''interlocuteur a quitté l''entreprise : la reprise attend un nouvel interlocuteur.');
  end loop;
  insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
  values (c.client_id, c.entite_id, c.id, 'appel', left('Trouver le nouvel interlocuteur de ' || c.nom, 200),
          left(format('%s ne fait plus partie de l''entreprise, d''après une réponse automatique. Le système ne devine pas le successeur : '
                      || 'notez le nouveau contact sur la fiche, puis levez la vérification.%s', coalesce(c.contact, 'L''interlocuteur'),
                      coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
          c.commercial, (now() at time zone private.offload_fuseau_compte(p_compte))::date + 1);
  return jsonb_build_object('statut', 'depart', 'compte', c.id);
end $function$;

-- public.offload_fiche : 1 date(s) au fuseau de l'organisation.
create or replace function public.offload_fiche(p_compte uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_jour date := (now() at time zone private.offload_fuseau_compte(p_compte))::date;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'compte', to_jsonb(c) - 'client_id',
    'signal', (select to_jsonb(s) - 'client_id' - 'entite_id' from public.offload_signaux s where s.compte_id = c.id),
    'mois', (select jsonb_agg(jsonb_build_object('mois', to_char(m.debut, 'YYYY-MM'), 'montant', coalesce(a.montant, 0),
                                                 'pieces', coalesce(a.pieces, 0)) order by m.debut)
             from generate_series(date_trunc('month', v_jour) - interval '23 months', date_trunc('month', v_jour), interval '1 month') m(debut)
             left join (select date_trunc('month', x.date_achat) as debut, sum(x.montant_ht) as montant, count(*) as pieces
                        from public.offload_achats x where x.compte_id = c.id and x.annule_le is null
                        group by 1) a on a.debut = m.debut),
    'achats', coalesce((select jsonb_agg(to_jsonb(x) - 'client_id' - 'entite_id' - 'cle' order by x.date_achat desc, x.cree_le desc)
                        from (select * from public.offload_achats a where a.compte_id = c.id
                              order by a.date_achat desc, a.cree_le desc limit 60) x), '[]'::jsonb),
    'nb_achats', (select count(*) from public.offload_achats a where a.compte_id = c.id and a.annule_le is null),
    'reprises', coalesce((select jsonb_agg((to_jsonb(p) - 'client_id') || jsonb_build_object(
                            'envoi1', (select jsonb_build_object('statut', e.statut, 'mode', e.mode, 'verrou', e.verrou, 'sujet', e.sujet)
                                       from public.envois e where e.id = p.envoi1_id),
                            'envoi2', (select jsonb_build_object('statut', e.statut, 'mode', e.mode, 'verrou', e.verrou, 'sujet', e.sujet)
                                       from public.envois e where e.id = p.envoi2_id)) order by p.cree_le desc)
                          from public.offload_reprises p where p.compte_id = c.id), '[]'::jsonb),
    'taches', coalesce((select jsonb_agg(to_jsonb(t) - 'client_id' order by t.statut = 'a_faire' desc, t.echeance desc)
                        from public.offload_taches t where t.compte_id = c.id), '[]'::jsonb));
end $function$;

-- private.offload_noter_intervention : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_noter_intervention(p_equipement uuid, p_le date, p_nature text default 'entretien',
                                                              p_ailleurs boolean default false, p_reference text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  q public.offload_equipements;
  v_id uuid;
begin
  select * into q from public.offload_equipements where id = p_equipement;
  if not found then
    raise exception 'Équipement introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(q.client_id, q.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter une intervention');
  if p_le is null or p_le > (now() at time zone private.offload_fuseau((select q9.client_id from public.offload_equipements q9 where q9.id = p_equipement)))::date or p_le < date '1990-01-01' then
    raise exception 'Une intervention est datée, et pas dans le futur.' using errcode = '22023';
  end if;
  if coalesce(p_nature, 'entretien') not in ('entretien', 'controle', 'reparation', 'installation') then
    raise exception 'Nature : entretien, controle, reparation ou installation.' using errcode = '22023';
  end if;
  insert into public.offload_interventions (client_id, entite_id, compte_id, equipement_id, le, nature, ailleurs, reference, source, saisi_par)
  values (q.client_id, q.entite_id, q.compte_id, q.id, p_le, coalesce(p_nature, 'entretien'), coalesce(p_ailleurs, false),
          private.offload_texte(p_reference, 120), 'saisie', (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(q.client_id, 'offload', 'offload.intervention_notee', 'offload_equipements', q.id::text,
    jsonb_build_object('le', p_le, 'nature', p_nature, 'ailleurs', coalesce(p_ailleurs, false)), q.entite_id);
  perform private.offload_echeances_cycle(q.client_id, null);
  return v_id;
end $function$;

-- private.offload_message_retrait : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_message_retrait(p_affaire uuid, p_rang integer)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  c public.offload_comptes;
  g public.offload_reglages;
  v_org text;
  v_quoi text;
  v_jours integer;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into a from public.offload_affaires where id = p_affaire;
  select * into c from public.offload_comptes where id = a.compte_id;
  select * into g from public.offload_reglages where client_id = a.client_id;
  select x.nom into v_org from public.clients x where x.id = a.client_id;
  v_jours := (now() at time zone private.offload_fuseau((select a9.client_id from public.offload_affaires a9 where a9.id = p_affaire)))::date - a.disponible_le;
  v_quoi := case a.type when 'intervention' then 'votre ' || coalesce(a.libelle, 'appareil') || ' (réf. ' || a.reference || ')'
                        else 'votre commande' || coalesce(' « ' || a.libelle || ' »', '') || ' (réf. ' || a.reference || ')' end;
  -- Phrases sans accord : on ne connaît pas le genre de l'objet réparé.
  return jsonb_build_object(
    'sujet', left(case when p_rang = 2 then 'Rappel : ' else '' end || v_org || ' — '
                  || case a.type when 'intervention' then 'votre appareil est prêt' else 'votre commande est arrivée' end, 300),
    'corps', 'Bonjour' || coalesce(' ' || c.contact, '') || ',' || E'\n\n'
      || case when p_rang = 2
              then format('Je me permets de revenir vers vous : %s vous attend toujours, depuis le %s.', v_quoi, private.offload_date_longue(a.disponible_le))
              when a.type = 'intervention'
              then format('L''intervention sur %s est terminée depuis le %s : tout est prêt.', v_quoi, private.offload_date_longue(a.disponible_le))
              else format('%s est arrivée le %s et vous attend.', 'V' || substr(v_quoi, 2), private.offload_date_longue(a.disponible_le)) end
      || E'\n\n' || 'Vous pouvez passer au magasin aux heures d''ouverture. Si vous préférez convenir d''un moment, répondez simplement à ce message.'
      || E'\n\n' || 'Bien cordialement,' || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_org) || E'\n\n' || v_stop);
end $function$;

-- private.offload_retirer_affaire : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_retirer_affaire(p_affaire uuid, p_retire_le date default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare a public.offload_affaires;
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  if not found then
    raise exception 'Affaire introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(a.client_id, a.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter un retrait');
  if a.statut in ('retiree', 'close_sans_suite') then
    return;
  end if;
  update public.offload_affaires set statut = 'retiree', retire_le = coalesce(p_retire_le, (now() at time zone private.offload_fuseau((select a9.client_id from public.offload_affaires a9 where a9.id = p_affaire)))::date), maj_le = now()
  where id = a.id;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_retiree', 'offload_affaires', a.id::text,
    jsonb_build_object('reference', a.reference, 'retire_le', coalesce(p_retire_le, current_date), 'avant', a.statut), a.entite_id);
end $function$;

-- private.offload_relancer_affaire : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_relancer_affaire(p_affaire uuid, p_rang integer, p_appel text default null)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  c public.offload_comptes;
  v_envoi uuid;
  e public.envois;
  v_msg jsonb;
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  select * into c from public.offload_comptes where id = a.compte_id;
  -- p_appel : la raison pour laquelle on passe par une personne (compte suivi en direct, liste d'exclusion).
  if p_appel is null and nullif(btrim(c.email), '') is not null and c.statut <> 'arrete' then
    perform private.offload_assurer_consentement(c.id);
    v_msg := private.offload_regles_appliquer(a.client_id, private.offload_message_retrait(a.id, p_rang));
    if v_msg ->> 'retenu' is not null then
      p_appel := format('message retenu par votre règle « %s »', v_msg ->> 'retenu');
    else
    v_envoi := private.offload_envoyer(a.client_id, 'affaire', c.id, 'offload_affaires', a.id::text,
      jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                         'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
      v_msg, 'offload:affaire:' || a.id::text || ':' || p_rang, a.entite_id);
    select * into e from public.envois where id = v_envoi;
    end if;
  end if;
  if v_envoi is null or e.statut = 'bloque' then
    -- Sans message (pas de courriel, règle, compte suivi en direct ou à vérifier) : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'appel',
            left(format('Prévenir %s : %s %s en attente de retrait', c.nom, case a.type when 'intervention' then 'intervention' else 'commande' end, a.reference), 200),
            left(format('%s disponible depuis le %s%s.%s', coalesce(a.libelle, a.reference), private.offload_le(a.disponible_le),
                        case when p_appel is not null then ' (' || p_appel || ')'
                             when v_envoi is not null then ' (message retenu : ' || coalesce(e.verrou, e.statut) || ')' else ' (pas de courriel)' end,
                        coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
            c.commercial, (now() at time zone private.offload_fuseau((select a9.client_id from public.offload_affaires a9 where a9.id = p_affaire)))::date);
  end if;
  if p_rang = 1 then
    update public.offload_affaires set statut = 'relancee_1', relance1_le = clock_timestamp(), envoi1_id = v_envoi, maj_le = now() where id = a.id;
  else
    update public.offload_affaires set statut = 'relancee_2', relance2_le = clock_timestamp(), envoi2_id = v_envoi, maj_le = now() where id = a.id;
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_relancee', 'offload_affaires', a.id::text,
    jsonb_build_object('rang', p_rang, 'envoi', v_envoi, 'appel', v_envoi is null or e.statut = 'bloque'), a.entite_id);
  return case when v_envoi is null or e.statut = 'bloque' then 'appel' else 'message' end;
end $function$;

-- private.offload_reponse_affaire : 2 date(s) au fuseau de l'organisation.
create or replace function private.offload_reponse_affaire(p_reception bigint, p_affaire uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  a public.offload_affaires;
  c public.offload_comptes;
  v_arret boolean;
begin
  select * into x from public.receptions where id = p_reception;
  select * into a from public.offload_affaires where id = p_affaire for update;
  if a.id is null or a.statut not in ('relancee_1', 'relancee_2', 'decision') then
    return jsonb_build_object('statut', 'sans_effet');
  end if;
  select * into c from public.offload_comptes where id = a.compte_id;
  v_arret := private.offload_demande_arret(x.corps);
  -- La relance encore en validation ne part pas.
  if a.envoi2_id is not null and exists (select 1 from public.envois e where e.id = a.envoi2_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(a.envoi2_id, 'Le client a répondu à la relance de retrait.');
  end if;
  update public.offload_affaires set statut = 'repondue', repondu_le = coalesce(x.recu_le, now()), maj_le = now(),
         motif = case when v_arret then 'Le client a demandé l''arrêt des messages : à traiter au magasin.'
                      else 'Le client a répondu le ' || private.offload_le((x.recu_le at time zone private.offload_fuseau((select a9.client_id from public.offload_affaires a9 where a9.id = p_affaire)))::date) || ' : la conversation revient au magasin.' end
   where id = a.id;
  if v_arret then
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une relance de retrait OFFLOAD.', 'message', null);
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue', statut_le = now(), maj_le = now() where id = c.id;
  else
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'repondre', left('Répondre à ' || c.nom || ' (retrait ' || a.reference || ')', 200),
            left(format('%s a répondu à la relance de retrait de %s.', coalesce(c.contact, c.nom), a.reference), 4000),
            c.commercial, (now() at time zone private.offload_fuseau((select a9.client_id from public.offload_affaires a9 where a9.id = p_affaire)))::date + 1);
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.reponse_retrait', 'offload_affaires', a.id::text,
    jsonb_build_object('reception', x.id, 'arret', v_arret), a.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'affaire', a.id);
end $function$;

-- private.offload_lire_reponse : 3 date(s) au fuseau de l'organisation.
create or replace function private.offload_lire_reponse(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  r public.offload_reprises;
  c public.offload_comptes;
  e public.envois;
  v_arret boolean;
  v_auto text;
  v_compte uuid;
begin
  if (p_charge ->> 'reception') !~ '^[0-9]+$' then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into x from public.receptions where id = (p_charge ->> 'reception')::bigint;
  if x.id is null or not exists (select 1 from public.offload_reglages g where g.client_id = x.client_id) then
    return jsonb_build_object('statut', 'ignore');
  end if;
  -- 00. Une réponse automatique (c4_10) : une absence ne change rien, un départ met le compte à réattribuer.
  v_auto := private.offload_reponse_auto(x.sujet, x.corps);
  if v_auto is not null then
    if x.en_reponse_a is not null then
      v_compte := private.offload_compte_de_envoi(x.en_reponse_a);
    end if;
    if v_compte is null and nullif(btrim(x.de_adresse), '') is not null then
      select k.id into v_compte from public.offload_comptes k
      where k.client_id = x.client_id and lower(btrim(k.email)) = lower(btrim(x.de_adresse)) and k.fusionne_dans is null
      order by k.maj_le desc limit 1;
    end if;
    if v_compte is not null then
      return private.offload_lire_reponse_auto(x.id, v_compte, v_auto);
    end if;
    return jsonb_build_object('statut', 'ignore', 'auto', v_auto);
  end if;
  -- 0. La réponse à un message de retrait (c4_08).
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_affaires';
    if e.id is not null then
      return private.offload_reponse_affaire(x.id, e.objet_id::uuid);
    end if;
  end if;
  -- 1. La réponse à un envoi d'OFFLOAD.
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_reprises';
    if e.id is not null then
      select * into r from public.offload_reprises where id = e.objet_id::uuid for update;
    end if;
  end if;
  -- 2. À défaut, l'adresse d'un compte dont une reprise attend.
  if r.id is null and x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
    select p.* into r from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = x.client_id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
    order by p.cree_le desc limit 1;
  end if;
  if r.id is null then
    -- À défaut encore, l'adresse d'un compte dont une affaire a été relancée (c4_08).
    if x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
      return coalesce((select private.offload_reponse_affaire(x.id, a.id)
                       from public.offload_affaires a join public.offload_comptes k on k.id = a.compte_id
                       where a.client_id = x.client_id and a.statut in ('relancee_1', 'relancee_2', 'decision')
                         and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
                       order by a.maj_le desc limit 1), jsonb_build_object('statut', 'ignore'));
    end if;
    return jsonb_build_object('statut', 'ignore');
  end if;
  if r.reception_id is not null then
    return jsonb_build_object('statut', 'deja_lue', 'reprise', r.id);
  end if;
  select * into c from public.offload_comptes where id = r.compte_id for update;
  v_arret := private.offload_demande_arret(x.corps);

  update public.offload_reprises set reception_id = x.id, repondu_le = x.recu_le, maj_le = now() where id = r.id;
  perform private.offload_clore(r.id, case when v_arret then 'arret' else 'reponse' end,
    case when v_arret then 'Le client a demandé à ne plus être sollicité.' else 'Le client a répondu : la conversation revient à votre équipe.' end);

  if v_arret then
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue le ' || private.offload_le((x.recu_le at time zone private.offload_fuseau(x.client_id))::date),
           statut_le = now(), maj_le = now() where id = c.id;
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une reprise OFFLOAD.', 'message', null);
  else
    -- La relance en attente ne part pas : le socle bloque les envois en attente vers cette adresse.
    perform private.opposer(c.client_id, 'pause', coalesce(c.email, x.de_adresse), 'email', null, now() + interval '30 days',
                            'Le client a répondu à une reprise OFFLOAD : la conversation revient à l''équipe.', 'message', null);
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, r.id, 'repondre', left('Répondre à ' || c.nom, 200),
            left(format('%s a répondu le %s%s.', coalesce(c.contact, c.nom), private.offload_le((x.recu_le at time zone private.offload_fuseau(x.client_id))::date),
                        coalesce(' : « ' || left(regexp_replace(coalesce(x.sujet, ''), '\s+', ' ', 'g'), 120) || ' »', '')), 4000),
            c.commercial, (now() at time zone private.offload_fuseau(x.client_id))::date + 1)
    on conflict do nothing;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_recue', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', c.id, 'reception', x.id, 'arret', v_arret), c.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'reprise', r.id);
end $function$;

-- private.offload_suivre_envoi : 2 date(s) au fuseau de l'organisation.
create or replace function private.offload_suivre_envoi(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_rang integer;
begin
  -- Un brouillon déposé dans la boîte connectée (Gmail, 19al) compte comme parti : le client l'envoie de sa boîte.
  if v_issue = 'brouillon_depose' then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' then
      perform private.journaliser_module(e.client_id, 'offload', 'offload.brouillon_depose', e.objet_type, e.objet_id,
        jsonb_build_object('envoi', e.id, 'mode', e.mode), e.entite_id);
    end if;
    p_charge := jsonb_set(p_charge, '{evenement}', to_jsonb('envoi.envoye.' || split_part(p_charge ->> 'evenement', '.', 3)))
                || jsonb_build_object('brouillon', true);
    v_issue := 'envoye';
    e := null;
  end if;
  -- Un message non remis : le compte passe « à vérifier », et la surveillance juge s'il faut s'arrêter (c4_10).
  if v_issue in ('echec', 'non_remis') and p_charge ->> 'envoi' is not null then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' and private.offload_compte_de_envoi(e.id) is not null then
      perform private.offload_a_verifier(private.offload_compte_de_envoi(e.id), 'echec',
        left(format('Le message du %s n''a pas été remis (%s%s) : l''adresse est à vérifier.', private.offload_le((e.cree_le at time zone private.offload_fuseau(e.client_id))::date),
                    v_issue, coalesce(', ' || e.verrou, '')), 500));
      perform private.offload_surveiller(e.client_id);
    end if;
  end if;
  if p_charge ->> 'objet_type' = 'offload_affaires' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_affaire(p_charge);
  end if;
  if p_charge ->> 'objet_type' = 'offload_echeances' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_echeance(p_charge);
  end if;
  if p_charge ->> 'objet_type' is distinct from 'offload_reprises' or p_charge ->> 'envoi' is null then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into r from public.offload_reprises where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or r.id is null or r.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
  if v_rang is null or r.statut in ('repondue', 'close') then
    return jsonb_build_object('statut', 'sans_effet', 'reprise', r.statut);
  end if;

  if v_issue = 'envoye' then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'envoyee', envoye1_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut in ('a_valider', 'appel');
    else
      update public.offload_reprises set statut = 'relancee', envoye2_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut = 'relance_a_valider';
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_envoye', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('statut', 'envoye', 'rang', v_rang);
  elsif v_issue = 'refuse' then
    -- Refusé en validation : une personne a dit non, la reprise s'arrête là.
    perform private.offload_clore(r.id, 'refusee', 'Le message de rang ' || v_rang || ' a été refusé en validation.');
    return jsonb_build_object('statut', 'refusee', 'rang', v_rang);
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'appel', maj_le = now(),
             motif = left(format('Le message n''est pas parti (%s%s) : la reprise passe par l''appel.', v_issue,
                                 coalesce(', ' || e.verrou, '')), 500)
       where id = r.id;
      -- Le message ne part pas : l'appel prend le relais (un seul canal à la fois, c4_12).
      insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
      select r.client_id, r.entite_id, k.id, r.id, 'appel', left('Appeler ' || k.nom, 200),
             left(format('Le message de reprise n''est pas parti (%s%s) : appelez le client.%s', v_issue, coalesce(', ' || e.verrou, ''),
                         coalesce(E'\nTéléphone : ' || k.telephone, '')), 4000),
             k.commercial, (now() at time zone private.offload_fuseau(e.client_id))::date + 1
      from public.offload_comptes k where k.id = r.compte_id
      on conflict do nothing;
    else
      -- La relance ne part pas : le compte sort du cycle, l'appel reste.
      perform private.offload_clore(r.id, 'sans_reponse', format('La relance n''est pas partie (%s%s).', v_issue, coalesce(', ' || e.verrou, '')));
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_non_parti', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'issue', v_issue, 'verrou', e.verrou), r.entite_id);
    return jsonb_build_object('statut', v_issue, 'rang', v_rang);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- private.offload_suivre_envoi_affaire : 1 date(s) au fuseau de l'organisation.
create or replace function private.offload_suivre_envoi_affaire(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
begin
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into a from public.offload_affaires where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or a.id is null or a.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  if v_issue = 'envoye' then
    perform private.journaliser_module(a.client_id, 'offload', 'offload.message_retrait_envoye', 'offload_affaires', a.id::text,
      jsonb_build_object('envoi', e.id, 'rang', case when a.envoi2_id = e.id then 2 else 1 end, 'mode', e.mode), a.entite_id);
    return jsonb_build_object('statut', 'envoye');
  elsif v_issue = 'refuse' then
    update public.offload_affaires set statut = 'decision', maj_le = now(), motif = 'Relance de retrait refusée en validation : à décider.'
     where id = a.id and statut in ('relancee_1', 'relancee_2');
    return jsonb_build_object('statut', 'decision');
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') and a.statut in ('relancee_1', 'relancee_2') then
    -- Le message n'est pas parti : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    select a.client_id, a.entite_id, a.compte_id, 'appel',
           left(format('Prévenir %s : %s %s en attente de retrait', c.nom, a.type, a.reference), 200),
           left(format('Le message de retrait n''est pas parti (%s%s).%s', v_issue, coalesce(', ' || e.verrou, ''),
                       coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
           c.commercial, (now() at time zone private.offload_fuseau((select e9.client_id from public.envois e9 where e9.id = (p_charge ->> 'envoi')::uuid)))::date
    from public.offload_comptes c where c.id = a.compte_id;
    return jsonb_build_object('statut', v_issue);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

revoke execute on function private.offload_fuseau(uuid) from public, anon;
grant execute on function private.offload_fuseau(uuid) to authenticated, service_role;
revoke execute on function private.offload_fuseau_compte(uuid) from public, anon;
grant execute on function private.offload_fuseau_compte(uuid) to authenticated, service_role;
