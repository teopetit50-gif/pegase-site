-- c4_02 — OFFLOAD : le rythme de chaque client, et le client qui décroche avant la clôture (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE. Le site promet : « Un client qui s'éteint, vous le voyez avant la clôture », « la fréquence
-- d'achat habituelle d'un compte est mesurée, puis son décrochage détecté », « les comptes sont priorisés par valeur
-- attendue ». Sur l'historique du palier 1 (c4_01), chaque nuit et après chaque import :
--   · le RYTHME de chaque compte : jours d'achat distincts, écart médian entre deux achats, panier moyen par jour
--     d'achat, chiffre des douze derniers mois et des douze d'avant, date du dernier achat, date attendue du suivant ;
--   · cinq constats, chacun écrit en une phrase avec ses chiffres, chacun avec ses points :
--       retard      — rien depuis N jours, soit X fois son rythme (dès 1,5 fois) ;
--       silence     — le client s'est tu : au-delà de trois fois son rythme et du délai de silence fixé, ou, pour un
--                     client de moins de trois achats, au-delà du délai seul ;
--       baisse      — chiffre des douze derniers mois en baisse d'au moins 40 % sur les douze d'avant ;
--       ralenti     — écarts récents 1,5 fois plus longs que d'habitude, ou panier récent en baisse de 40 % ;
--       saison      — achète chaque année ce mois-là (au moins deux des trois années passées) et rien cette année,
--                     pour un client qui n'achète que quelques fois par an ;
--     plus l'alerte AVANT LA CLÔTURE : le compte à risque dont l'achat était attendu avant la clôture du mois, dans
--     les N jours qui la précèdent (réglages jour_cloture, alerte_avant_cloture_jours de c4_01).
--   · un SCORE de 0 à 100 qui n'est que la somme des points des constats, sans boîte noire, et une PRIORITÉ en euros :
--     score × valeur annuelle attendue (panier × achats par an). La liste se trie par priorité, pas par nom.
--   · un NIVEAU : eteint (s'est tu), decroche (retard), saison, ralentit, ok ; à part : sans_achat (rien ne le date),
--     sous_seuil (moins d'achats cumulés que le montant minimal fixé).
--   · public.offload_signaux : l'état du jour, un par compte (RLS du compte) ; depuis_le garde la date d'entrée dans
--     le niveau ; l'entrée dans un niveau à risque est inscrite au journal (offload.signal).
--   · le calcul : private.offload_detecter(client, jour) ; cron offload-detection chaque nuit ; et à la fin de chaque
--     import (private.offload_traiter_travaux, redéfini ici).
--
-- Règles de pose : create … if not exists, create or replace, cron si absent. Aucun DROP, aucun DELETE.

create table if not exists public.offload_signaux (
  compte_id uuid primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  jour date not null,
  niveau text not null,
  depuis_le date not null,
  score smallint not null default 0,
  priorite numeric(14,2) not null default 0,
  valeur_annuelle numeric(14,2),
  nb_achats integer not null default 0,
  premier_achat date,
  dernier_achat date,
  rythme_jours numeric(8,1),
  panier_moyen numeric(14,2),
  attendu_le date,
  jours_silence integer,
  retard numeric(6,2),
  ca_12m numeric(14,2),
  ca_12m_precedent numeric(14,2),
  cloture_le date,
  avant_cloture boolean not null default false,
  raisons jsonb not null default '[]'::jsonb,
  calcule_le timestamptz not null default now(),
  constraint offload_signaux_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_signaux_niveau_check check (niveau in ('eteint', 'decroche', 'saison', 'ralentit', 'ok', 'sans_achat', 'sous_seuil')),
  constraint offload_signaux_score_check check (score between 0 and 100),
  constraint offload_signaux_raisons_check check (jsonb_typeof(raisons) = 'array')
);
comment on table public.offload_signaux is 'OFFLOAD — l''état du jour de chaque compte : niveau, score (somme des points des raisons, chacune écrite en une phrase), priorité en euros, rythme, alerte avant la clôture.';

create index if not exists offload_signaux_client_idx on public.offload_signaux (client_id, niveau, priorite desc);

alter table public.offload_signaux enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_signaux'
                 and policyname = 'on lit les signaux de son perimetre') then
    create policy "on lit les signaux de son perimetre" on public.offload_signaux
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on public.offload_signaux from anon, authenticated;
grant select on public.offload_signaux to authenticated;
grant all on public.offload_signaux to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Écrire un nombre et une date à la française
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_euros(p numeric)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p is null then '—'
              else translate(to_char(round(p), 'FM999G999G999G990'), ',', ' ') || ' €' end
$function$;

create or replace function private.offload_le(p date)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select to_char(p, 'DD/MM/YYYY')
$function$;

create or replace function private.offload_mois(p integer)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
                'novembre', 'décembre'])[p]
$function$;

-- La clôture du mois en cours : le jour fixé (ramené au dernier jour d'un mois court), sinon le dernier jour ; une
-- clôture déjà passée renvoie à celle du mois suivant.
create or replace function private.offload_cloture(p_jour date, p_jour_cloture smallint)
 returns date
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  v_debut date := date_trunc('month', p_jour)::date;
  v date;
begin
  v := case when p_jour_cloture is null then (v_debut + interval '1 month' - interval '1 day')::date
            else least(v_debut + (p_jour_cloture - 1), (v_debut + interval '1 month' - interval '1 day')::date) end;
  if v < p_jour then
    v_debut := (v_debut + interval '1 month')::date;
    v := case when p_jour_cloture is null then (v_debut + interval '1 month' - interval '1 day')::date
              else least(v_debut + (p_jour_cloture - 1), (v_debut + interval '1 month' - interval '1 day')::date) end;
  end if;
  return v;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le calcul
-- ─────────────────────────────────────────────────────────────────────────
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

  return jsonb_build_object('client', p_client, 'jour', v_jour, 'cloture', v_cloture, 'niveaux', v_bilan, 'entrees', v_entrees,
                            'avant_cloture', (select count(*) from public.offload_signaux s where s.client_id = p_client and s.avant_cloture));
end $function$;

-- Chaque nuit, chez chaque organisation qui a installé OFFLOAD. Une organisation en échec n'arrête pas les autres.
create or replace function private.offload_detecter_tout(p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
  e integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      perform private.offload_detecter(k.client_id, p_jour);
      n := n + 1;
    exception when others then
      e := e + 1;
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'La détection des clients qui décrochent n''a pas pu être calculée.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'offload:detection', false, null);
    end;
  end loop;
  return jsonb_build_object('organisations', n, 'echecs', e);
end $function$;

-- Le passage du module, redéfini : après un import appliqué, la détection est recalculée tout de suite.
create or replace function private.offload_traiter_travaux(p_nombre integer default 20)
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
  for t in
    select * from private.prendre_travaux(array['offload.appliquer_releve'], p_nombre, interval '10 minutes', 'offload-sql')
  loop
    begin
      r := case t.genre
             when 'offload.appliquer_releve' then private.offload_appliquer_releve(t.charge)
           end;
      if t.client_id is not null and not coalesce((r ->> 'deja_applique')::boolean, false) then
        r := r || jsonb_build_object('detection', private.offload_detecter(t.client_id, null));
      end if;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

-- Recalcul à la demande (bouton « recalculer » de l'écran) : gérant, admin, valideur, collaborateur.
create or replace function private.offload_recalculer(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur', 'collaborateur'], 'recalculer la détection');
  return private.offload_detecter(p_client, null);
end $function$;

create or replace function public.offload_recalculer(p_client uuid)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_recalculer(p_client) $function$;

revoke all on function public.offload_recalculer(uuid) from public, anon;
grant execute on function public.offload_recalculer(uuid) to authenticated, service_role;
revoke execute on function private.offload_recalculer(uuid) from public, anon;
grant execute on function private.offload_recalculer(uuid) to authenticated, service_role;

revoke execute on function private.offload_euros(numeric) from public, anon, authenticated;
revoke execute on function private.offload_le(date) from public, anon, authenticated;
revoke execute on function private.offload_mois(integer) from public, anon, authenticated;
revoke execute on function private.offload_cloture(date, smallint) from public, anon, authenticated;
revoke execute on function private.offload_detecter(uuid, date) from public, anon, authenticated;
revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;
revoke execute on function private.offload_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.offload_euros(numeric) to service_role;
grant execute on function private.offload_le(date) to service_role;
grant execute on function private.offload_mois(integer) to service_role;
grant execute on function private.offload_cloture(date, smallint) to service_role;
grant execute on function private.offload_detecter(uuid, date) to service_role;
grant execute on function private.offload_detecter_tout(date) to service_role;
grant execute on function private.offload_traiter_travaux(integer) to service_role;

-- 4 h 41 UTC : avant 7 h à Paris été comme hiver, après les exports de la nuit.
select cron.schedule('offload-detection', '41 4 * * *', $cron$select private.offload_detecter_tout()$cron$)
where not exists (select 1 from cron.job where jobname = 'offload-detection');
