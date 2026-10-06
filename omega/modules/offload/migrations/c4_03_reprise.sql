-- c4_03 — OFFLOAD : la reprise de contact, en validation ; l'appel du commercial ; la réponse suivie ; le point du
-- matin « clients qui décrochent » (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE. Le palier 2 (c4_02) repère le client qui décroche. Il faut maintenant préparer la reprise, sans
-- que rien ne parte sans une personne :
--   · public.offload_reprises : une reprise de contact par compte et par cycle. Deux messages en tout : le premier,
--     puis une relance après le délai fixé (7 jours par défaut, 3 au moins), puis le compte sort du cycle. Une
--     réponse, même négative, arrête la séquence. Une commande arrivée depuis la clôt (« commande »). Entre deux
--     cycles, une quarantaine (90 jours par défaut) : un compte n'est pas sollicité plus d'une fois par trimestre.
--   · le MESSAGE, rédigé sans IA à partir de l'historique seul : la dernière commande du compte (date, référence,
--     libellé, montant HT) et le temps écoulé depuis ; aucun prix, aucun délai, aucune remise ; une ligne pour dire
--     « stop ». Il passe par private.preparer_envoi : le socle pose la DEMANDE DE VALIDATION (type envoi.email),
--     applique ses verrous (consentement, oppositions, heures, plafonds) et le mode des réglages d'envoi. OFFLOAD
--     reste en mode « essai » à l'installation : s'il trouve les envois du module réglés en réel, il ne prépare
--     rien et le signale.
--   · public.offload_taches : la tâche d'appel du commercial (son nom vient du fichier clients), datée avant la
--     clôture, avec les raisons du signal et la dernière commande ; la tâche « répondre » quand le client répond.
--     Un compte sans courriel (ou dont le courriel est bloqué par un verrou) n'a que sa tâche d'appel.
--   · le suivi : événements envoi.*.offload (envoyé, refusé en validation, bloqué, annulé, expiré, en échec, non
--     remis) et reception.nouvelle (la réponse, rattachée à l'envoi d'origine ou, à défaut, à l'adresse du compte).
--     À la réponse : pause du destinataire au socle (la relance en attente est bloquée), tâche « répondre » ; sur
--     « stop », « ne plus recevoir »… : désinscription au socle et compte « arrete », définitivement.
--   · le cycle quotidien (private.offload_cycle, enchaîné à la détection de la nuit) : clore sur commande, relancer,
--     sortir du cycle, ouvrir les nouvelles reprises (clôture proche d'abord, puis priorité), au plus N par jour.
--   · le point du matin : section « Clients qui décrochent » (gérant, valideur, collaborateur), cron offload-matin.
--   · portes : offload_ouvrir_reprise (à la main, pour un compte), offload_noter_tache (appel passé, compte rendu),
--     offload_regler étendu (signature, délai de relance, quarantaine, plafond quotidien).
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists, cron si absent. Aucun DROP, aucun DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Réglages complémentaires, tables
-- ─────────────────────────────────────────────────────────────────────────

alter table public.offload_reglages add column if not exists signature text;
alter table public.offload_reglages add column if not exists delai_relance_jours smallint not null default 7;
alter table public.offload_reglages add column if not exists quarantaine_jours smallint not null default 90;
alter table public.offload_reglages add column if not exists plafond_reprises_jour smallint not null default 20;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_relance_check') then
    alter table public.offload_reglages add constraint offload_reglages_relance_check check (delai_relance_jours between 3 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_quarantaine_check') then
    alter table public.offload_reglages add constraint offload_reglages_quarantaine_check check (quarantaine_jours between 30 and 730);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_plafond_check') then
    alter table public.offload_reglages add constraint offload_reglages_plafond_check check (plafond_reprises_jour between 1 and 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_signature_check') then
    alter table public.offload_reglages add constraint offload_reglages_signature_check check (char_length(signature) <= 500);
  end if;
end $$;

create table if not exists public.offload_reprises (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  statut text not null,
  ouverte_par text not null,
  ouverte_par_user uuid,
  niveau text,
  score smallint,
  raisons jsonb not null default '[]'::jsonb,
  envoi1_id uuid,
  envoi2_id uuid,
  envoye1_le timestamptz,
  envoye2_le timestamptz,
  reception_id bigint,
  repondu_le timestamptz,
  issue text,
  motif text,
  close_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_reprises_client_id_id_key unique (client_id, id),
  constraint offload_reprises_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_reprises_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_reprises_envoi1_fkey foreign key (client_id, envoi1_id) references public.envois(client_id, id) on delete set null (envoi1_id),
  constraint offload_reprises_envoi2_fkey foreign key (client_id, envoi2_id) references public.envois(client_id, id) on delete set null (envoi2_id),
  constraint offload_reprises_statut_check check (statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee', 'repondue', 'close')),
  constraint offload_reprises_ouverte_par_check check (ouverte_par in ('detection', 'manuel')),
  constraint offload_reprises_issue_check check (issue in ('reponse', 'arret', 'commande', 'sans_reponse', 'refusee', 'appel_passe', 'reprise_en_main', 'abandon')),
  constraint offload_reprises_close check ((statut in ('repondue', 'close')) = (issue is not null)),
  constraint offload_reprises_motif_check check (char_length(motif) <= 500),
  constraint offload_reprises_raisons_check check (jsonb_typeof(raisons) = 'array')
);
comment on table public.offload_reprises is 'OFFLOAD — une reprise de contact d''un compte : message 1 puis relance, chacun en validation ; tâche d''appel ; réponse suivie. Issue : reponse, arret, commande, sans_reponse, refusee, appel_passe, reprise_en_main, abandon.';

create unique index if not exists offload_reprises_une_ouverte on public.offload_reprises (compte_id)
  where statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
create index if not exists offload_reprises_client_idx on public.offload_reprises (client_id, statut, cree_le desc);

create table if not exists public.offload_taches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  reprise_id uuid,
  type text not null,
  titre text not null,
  detail text,
  commercial text,
  echeance date not null,
  statut text not null default 'a_faire',
  compte_rendu text,
  faite_le timestamptz,
  faite_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_taches_client_id_id_key unique (client_id, id),
  constraint offload_taches_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_taches_reprise_fkey foreign key (client_id, reprise_id) references public.offload_reprises(client_id, id) on delete cascade,
  constraint offload_taches_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_taches_type_check check (type in ('appel', 'repondre')),
  constraint offload_taches_titre_check check (char_length(btrim(titre)) between 1 and 200),
  constraint offload_taches_detail_check check (char_length(detail) <= 4000),
  constraint offload_taches_commercial_check check (char_length(commercial) <= 120),
  constraint offload_taches_statut_check check (statut in ('a_faire', 'faite', 'abandonnee')),
  constraint offload_taches_compte_rendu_check check (char_length(compte_rendu) <= 2000),
  constraint offload_taches_faite check ((statut = 'a_faire') = (faite_le is null))
);
comment on table public.offload_taches is 'OFFLOAD — une tâche du commercial : appeler un compte qui décroche (avant la clôture), ou répondre à un compte qui a répondu.';

create unique index if not exists offload_taches_une_par_reprise on public.offload_taches (reprise_id, type) where reprise_id is not null;
create index if not exists offload_taches_client_idx on public.offload_taches (client_id, statut, echeance);

alter table public.offload_reprises enable row level security;
alter table public.offload_taches enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_reprises'
                 and policyname = 'on lit les reprises de son perimetre') then
    create policy "on lit les reprises de son perimetre" on public.offload_reprises
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_taches'
                 and policyname = 'on lit les taches de son perimetre') then
    create policy "on lit les taches de son perimetre" on public.offload_taches
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on public.offload_reprises from anon, authenticated;
revoke all on public.offload_taches from anon, authenticated;
grant select on public.offload_reprises to authenticated;
grant select on public.offload_taches to authenticated;
grant all on public.offload_reprises to service_role;
grant all on public.offload_taches to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Le message
-- ─────────────────────────────────────────────────────────────────────────

-- « 6 semaines », « 19 mois », « 3 ans ».
create or replace function private.offload_duree(p_depuis date, p_jour date)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p_jour - p_depuis < 60 then greatest(1, (p_jour - p_depuis) / 7) || ' semaine' || case when (p_jour - p_depuis) / 7 > 1 then 's' else '' end
    when p_jour - p_depuis < 730 then ((extract(year from age(p_jour, p_depuis)) * 12 + extract(month from age(p_jour, p_depuis)))::integer) || ' mois'
    else extract(year from age(p_jour, p_depuis))::integer || ' ans' end
$function$;

-- « 14 mars 2025 ».
create or replace function private.offload_date_longue(p date)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select extract(day from p)::integer || case when extract(day from p) = 1 then 'er' else '' end || ' '
         || private.offload_mois(extract(month from p)::integer) || ' ' || extract(year from p)::integer
$function$;

-- Le sujet et le corps d'un message de reprise (rang 1) ou de relance (rang 2). Rien que l'historique : la dernière
-- commande et le temps écoulé. Aucun prix, aucun délai, aucune remise.
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
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_org text;
  v_bonjour text;
  v_commande text;
  v_signature text;
  v_sujet text;
  v_corps text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  select * into a from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir'
  order by x.date_achat desc, x.montant_ht desc limit 1;

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
      || 'Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour à ce message suffit : '
      || 'nous vous rappelons au moment qui vous convient.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  else
    v_sujet := left('Re : ' || v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                             else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone 'Europe/Paris')::date), 'dernier')
      || case when a.id is not null then ', au sujet de ' || replace(v_commande, 'votre dernière commande chez ' || v_org || ' date du', 'votre commande du') else '' end
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  end if;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Ouvrir une reprise, préparer un envoi, relancer
-- ─────────────────────────────────────────────────────────────────────────

-- OFFLOAD en essai, mais les envois du module réglés en réel : on ne prépare rien.
create or replace function private.offload_essai_contre_reel(p_client uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce((select g.mode from public.offload_reglages g where g.client_id = p_client), 'essai') = 'essai'
     and (private.reglages_envois_effectifs(p_client, 'offload') ->> 'mode') is not distinct from 'reel'
$function$;

-- Prépare le message de rang 1 ou 2 d'une reprise par le socle (validation, verrous, mode). Rend l'envoi, ou null si
-- le compte n'a pas de courriel. Refuse de préparer si les envois du module sont réglés en réel alors qu'OFFLOAD est
-- en essai.
create or replace function private.offload_preparer_message(p_reprise uuid, p_rang integer)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  c public.offload_comptes;
  g public.offload_reglages;
  v_msg jsonb;
  v_envoi uuid;
begin
  select * into r from public.offload_reprises where id = p_reprise;
  select * into c from public.offload_comptes where id = r.compte_id;
  select * into g from public.offload_reglages where client_id = r.client_id;
  if nullif(btrim(c.email), '') is null then
    return null;
  end if;
  if private.offload_essai_contre_reel(r.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
  end if;
  v_msg := private.offload_message(c.id, p_rang, r.envoye1_le, null);
  v_envoi := private.preparer_envoi(r.client_id, 'offload', 'offload_reprises', r.id::text, 'email',
    jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref, 'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
    'offload:reprise:' || r.id::text || ':' || p_rang, r.entite_id, false, false, null::timestamptz, '{}'::jsonb);
  return v_envoi;
end $function$;

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
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
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
  select x.id into v_id from public.offload_reprises x
  where x.compte_id = c.id and x.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
  if v_id is not null then
    return v_id;
  end if;
  if exists (select 1 from public.offload_reprises x where x.compte_id = c.id
             and coalesce(x.close_le, x.repondu_le, x.cree_le) > now() - make_interval(days => g.quarantaine_jours)) then
    raise exception 'Ce compte a déjà eu une reprise il y a moins de % jours.', g.quarantaine_jours using errcode = '55000';
  end if;

  if private.offload_essai_contre_reel(c.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
  end if;
  select * into s from public.offload_signaux where compte_id = c.id;
  insert into public.offload_reprises (client_id, entite_id, compte_id, statut, ouverte_par, ouverte_par_user, niveau, score, raisons)
  values (c.client_id, c.entite_id, c.id, 'appel', p_par, (select auth.uid()), s.niveau, s.score, coalesce(s.raisons, '[]'::jsonb))
  returning id into v_id;

  -- La tâche d'appel du commercial, avant la clôture (ou sous trois jours si la clôture est loin).
  select * into v_dernier from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir' order by x.date_achat desc limit 1;
  v_echeance := least(coalesce(s.cloture_le, v_jour + 3), v_jour + 3);
  v_detail := concat_ws(E'\n',
    (select string_agg('• ' || (x ->> 'phrase'), E'\n') from jsonb_array_elements(coalesce(s.raisons, '[]'::jsonb)) x),
    case when v_dernier.id is not null then format('Dernière commande : %s, %s HT%s.', private.offload_le(v_dernier.date_achat),
                                                   private.offload_euros(v_dernier.montant_ht), coalesce(', réf. ' || v_dernier.reference, '')) end,
    case when c.telephone is not null then 'Téléphone : ' || c.telephone end,
    case when c.contact is not null then 'Contact : ' || c.contact end);
  insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
  values (c.client_id, c.entite_id, c.id, v_id, 'appel', left('Appeler ' || c.nom, 200), left(v_detail, 4000), c.commercial, v_echeance);

  -- Le message : en validation, ou rien si le compte n'a pas de courriel, ou bloqué par un verrou du socle.
  v_envoi := private.offload_preparer_message(v_id, 1);
  if v_envoi is null then
    v_statut := 'appel';
    v_motif := 'Pas de courriel connu : la reprise passe par l''appel du commercial.';
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
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reprise_ouverte', 'offload_reprises', v_id::text,
    jsonb_build_object('compte', c.id, 'par', p_par, 'niveau', s.niveau, 'score', s.score, 'statut', v_statut, 'envoi', v_envoi,
                       'motif', v_motif), c.entite_id);
  return v_id;
end $function$;

-- Une reprise se clôt : statut, issue, motif, journal ; ses tâches encore à faire sont abandonnées si elles n'ont
-- plus d'objet (commande arrivée, compte retiré).
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
  perform private.journaliser_module(r.client_id, 'offload', 'offload.reprise_close', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', r.compte_id, 'issue', p_issue, 'motif', p_motif, 'avant', r.statut), r.entite_id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le suivi : envois et réponses
-- ─────────────────────────────────────────────────────────────────────────

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

-- « stop », « désinscrire », « ne plus recevoir »… dans les premières lignes écrites (avant la citation).
create or replace function private.offload_demande_arret(p_corps text)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select lower(coalesce(split_part(split_part(coalesce(p_corps, ''), E'\n>', 1), E'\nLe ', 1), '')) ~
    '(^|[^a-z])(stop|d[ée]sinscri|d[ée]sabonn|ne (plus|pas) (me |nous )?(recevoir|contacter|solliciter|[ée]crire|relancer)|ne m''[ée]crivez plus|retirez[- ](moi|nous))'
$function$;

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
begin
  if (p_charge ->> 'reception') !~ '^[0-9]+$' then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into x from public.receptions where id = (p_charge ->> 'reception')::bigint;
  if x.id is null or not exists (select 1 from public.offload_reglages g where g.client_id = x.client_id) then
    return jsonb_build_object('statut', 'ignore');
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
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue le ' || private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
           statut_le = now(), maj_le = now() where id = c.id;
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une reprise OFFLOAD.', 'message', null);
  else
    -- La relance en attente ne part pas : le socle bloque les envois en attente vers cette adresse.
    perform private.opposer(c.client_id, 'pause', coalesce(c.email, x.de_adresse), 'email', null, now() + interval '30 days',
                            'Le client a répondu à une reprise OFFLOAD : la conversation revient à l''équipe.', 'message', null);
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, r.id, 'repondre', left('Répondre à ' || c.nom, 200),
            left(format('%s a répondu le %s%s.', coalesce(c.contact, c.nom), private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
                        coalesce(' : « ' || left(regexp_replace(coalesce(x.sujet, ''), '\s+', ' ', 'g'), 120) || ' »', '')), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date + 1)
    on conflict do nothing;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_recue', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', c.id, 'reception', x.id, 'arret', v_arret), c.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'reprise', r.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Le cycle du jour
-- ─────────────────────────────────────────────────────────────────────────

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
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 0. OFFLOAD en essai et envois du module réglés en réel : on ne prépare rien, on le dit.
  if private.offload_essai_contre_reel(p_client) then
    perform private.lever_alerte_module(p_client, 'offload', 'attention',
      'OFFLOAD est en mode essai, mais les envois du module sont réglés en réel : aucun message de reprise n''est préparé.',
      '{}'::jsonb, 'offload:essai_contre_reel', false, null);
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;

  -- 1. Une commande arrivée depuis l'ouverture clôt la reprise.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and exists (select 1 from public.offload_achats a where a.compte_id = p.compte_id and a.annule_le is null
                  and a.nature <> 'avoir' and a.date_achat >= (p.cree_le at time zone 'Europe/Paris')::date)
  loop
    perform private.offload_clore(k.id, 'commande', 'Une commande est arrivée depuis l''ouverture de la reprise.');
    n_commande := n_commande + 1;
  end loop;

  -- 2. La relance : message 1 parti depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'envoyee'
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

  -- 3. La sortie du cycle : relance partie depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'relancee'
      and p.envoye2_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    perform private.offload_clore(k.id, 'sans_reponse', 'Deux messages sans réponse : le compte sort du cycle.');
    n_sortie := n_sortie + 1;
  end loop;

  -- 4. Les nouvelles reprises : clôture proche d'abord, puis priorité ; au plus le plafond du jour.
  for k in
    select s.compte_id from public.offload_signaux s
    join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison') and c.statut = 'suivi'
      and not exists (select 1 from public.offload_reprises p where p.compte_id = s.compte_id
                      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
                           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours)))
    order by s.avant_cloture desc, s.priorite desc, s.compte_id
    limit greatest(0, g.plafond_reprises_jour - (select count(*) from public.offload_reprises p
                                                  where p.client_id = p_client and p.ouverte_par = 'detection'
                                                    and (p.cree_le at time zone 'Europe/Paris')::date = v_jour))
  loop
    begin
      perform private.offload_ouvrir(k.compte_id, 'detection', v_jour);
      n_ouverte := n_ouverte + 1;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;

  -- Chaque exécution qui a fait quelque chose laisse son bilan au journal.
  if n_commande + n_relance + n_sortie + n_ouverte + n_refus > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.cycle', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie,
                         'ouvertes', n_ouverte, 'refus', n_refus), null);
  end if;
  return jsonb_build_object('commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie, 'ouvertes', n_ouverte,
                            'refus', n_refus);
end $function$;

-- La nuit : détection puis cycle, chez chaque organisation installée.
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
      perform private.offload_cycle(k.client_id, p_jour);
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

-- Le passage du module : relevés, envois, réponses.
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
    select * from private.prendre_travaux(array['offload.appliquer_releve', 'offload.envoi', 'offload.reception'], p_nombre,
                                          interval '10 minutes', 'offload-sql')
  loop
    begin
      r := case t.genre
             when 'offload.appliquer_releve' then private.offload_appliquer_releve(t.charge)
             when 'offload.envoi' then private.offload_suivre_envoi(t.charge)
             when 'offload.reception' then private.offload_lire_reponse(t.charge)
           end;
      if t.genre = 'offload.appliquer_releve' and t.client_id is not null and not coalesce((r ->> 'deja_applique')::boolean, false) then
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

insert into private.abonnements (evenement, module, genre)
select x.evenement, 'offload', x.genre
from (values ('envoi.envoye.offload', 'offload.envoi'), ('envoi.refuse.offload', 'offload.envoi'),
             ('envoi.bloque.offload', 'offload.envoi'), ('envoi.annule.offload', 'offload.envoi'),
             ('envoi.expire.offload', 'offload.envoi'), ('envoi.echec.offload', 'offload.envoi'),
             ('envoi.non_remis.offload', 'offload.envoi'), ('reception.nouvelle', 'offload.reception')) x(evenement, genre)
where not exists (select 1 from private.abonnements a where a.evenement = x.evenement and a.module = 'offload' and a.genre = x.genre);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Le point du matin : « Clients qui décrochent »
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.offload_point_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer;
begin
  -- 1. Les réponses à traiter.
  for r in
    select t.titre, t.detail, t.compte_id from public.offload_taches t
    where t.client_id = p_client and t.type = 'repondre' and t.statut = 'a_faire'
    order by t.echeance, t.cree_le limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.detail, 300), 'gravite', 'attention', 'lien', '/espace/offload',
                                             'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 2. Avant la clôture : les comptes à risque dont la commande devait tomber ce mois-ci.
  for r in
    select c.nom, s.compte_id, s.cloture_le, s.raisons, s.priorite from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : à joindre avant la clôture du %s. %s', r.nom, private.offload_le(r.cloture_le), r.raisons -> 0 ->> 'phrase'), 300),
      'gravite', 'attention', 'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 3. Les comptes entrés à risque ces dernières 24 heures.
  for r in
    select c.nom, s.compte_id, s.raisons from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison', 'ralentit') and s.depuis_le >= p_jour - 1
      and not s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.nom || ' : ' || (r.raisons -> 0 ->> 'phrase'), 300), 'gravite', 'info',
                                             'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 4. Les appels du jour et en retard.
  select count(*) into v_n from public.offload_taches t
  where t.client_id = p_client and t.type = 'appel' and t.statut = 'a_faire' and t.echeance <= p_jour;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s appel%s de reprise à passer aujourd''hui ou en retard.', v_n,
                                                             case when v_n > 1 then 's' else '' end),
                                             'gravite', 'info', 'lien', '/espace/offload');
  end if;
  -- 5. Les messages qui attendent une validation.
  select count(*) into v_n from public.offload_reprises p
  where p.client_id = p_client and p.statut in ('a_valider', 'relance_a_valider');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s message%s de reprise attend%s votre validation.', v_n,
                                                             case when v_n > 1 then 's' else '' end, case when v_n > 1 then 'ent' else '' end),
                                             'gravite', 'info', 'lien', '/espace/validations');
  end if;
  return v_items;
end $function$;

create or replace function private.offload_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  v_jour date;
  v_items jsonb;
  v_role text;
  v_titre constant text := 'Clients qui décrochent';
  n integer := 0;
begin
  if (p_maintenant at time zone 'Europe/Paris')::time < time '05:00' then
    return 0;
  end if;
  v_jour := (p_maintenant at time zone 'Europe/Paris')::date;
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      v_items := private.offload_point_lignes(k.client_id, v_jour);
      foreach v_role in array array['gerant', 'valideur', 'collaborateur'] loop
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre, null, null);
        else
          perform private.deposer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre, v_items,
                                          null, null, false, p_maintenant, false, 45);
        end if;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'Le point du matin « Clients qui décrochent » n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:offload', false, null);
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Les portes : ouvrir une reprise à la main, noter une tâche, régler
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.offload_ouvrir_reprise(p_compte uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'ouvrir une reprise');
  return private.offload_ouvrir(c.id, 'manuel', null);
end $function$;

create or replace function private.offload_noter_tache(p_tache uuid, p_statut text, p_compte_rendu text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.offload_taches;
  r public.offload_reprises;
  v_cr text := private.offload_texte(p_compte_rendu, 2000);
begin
  select * into t from public.offload_taches where id = p_tache for update;
  if not found then
    raise exception 'Tâche introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(t.client_id, t.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter une tâche');
  if p_statut not in ('faite', 'abandonnee') then
    raise exception 'Une tâche se note faite ou abandonnée.' using errcode = '22023';
  end if;
  if p_statut = 'abandonnee' and v_cr is null then
    raise exception 'Une tâche abandonnée dit pourquoi.' using errcode = '22023';
  end if;
  if t.statut <> 'a_faire' then
    raise exception 'Cette tâche est déjà notée.' using errcode = '55000';
  end if;
  update public.offload_taches set statut = p_statut, compte_rendu = v_cr, faite_le = now(), faite_par = (select auth.uid()), maj_le = now()
  where id = t.id;
  -- Un appel passé sur une reprise sans message clôt la reprise ; sinon la séquence de messages continue.
  if t.type = 'appel' and p_statut = 'faite' and t.reprise_id is not null then
    select * into r from public.offload_reprises where id = t.reprise_id;
    if r.statut = 'appel' then
      perform private.offload_clore(r.id, 'appel_passe', v_cr);
    end if;
  end if;
  perform private.journaliser_module(t.client_id, 'offload', 'offload.tache_notee', 'offload_taches', t.id::text,
    jsonb_build_object('type', t.type, 'statut', p_statut, 'compte', t.compte_id, 'reprise', t.reprise_id, 'compte_rendu', v_cr), t.entite_id);
end $function$;

create or replace function private.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_inconnus text;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler les seuils');
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('delai_silence_jours', 'montant_min', 'jour_cloture', 'alerte_avant_cloture_jours', 'signature',
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  update public.offload_reglages set
    delai_silence_jours = case when p ? 'delai_silence_jours' then (p ->> 'delai_silence_jours')::integer else delai_silence_jours end,
    montant_min = case when p ? 'montant_min' then (p ->> 'montant_min')::numeric else montant_min end,
    jour_cloture = case when p ? 'jour_cloture' then (p ->> 'jour_cloture')::smallint else jour_cloture end,
    alerte_avant_cloture_jours = case when p ? 'alerte_avant_cloture_jours' then (p ->> 'alerte_avant_cloture_jours')::smallint
                                      else alerte_avant_cloture_jours end,
    signature = case when p ? 'signature' then private.offload_texte(p ->> 'signature', 500) else signature end,
    delai_relance_jours = case when p ? 'delai_relance_jours' then (p ->> 'delai_relance_jours')::smallint else delai_relance_jours end,
    quarantaine_jours = case when p ? 'quarantaine_jours' then (p ->> 'quarantaine_jours')::smallint else quarantaine_jours end,
    plafond_reprises_jour = case when p ? 'plafond_reprises_jour' then (p ->> 'plafond_reprises_jour')::smallint else plafond_reprises_jour end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

create or replace function public.offload_ouvrir_reprise(p_compte uuid)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_ouvrir_reprise(p_compte) $function$;

create or replace function public.offload_noter_tache(p_tache uuid, p_statut text, p_compte_rendu text default null)
 returns void language sql set search_path to ''
as $function$ select private.offload_noter_tache(p_tache, p_statut, p_compte_rendu) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Droits et crons
-- ─────────────────────────────────────────────────────────────────────────

revoke all on function public.offload_ouvrir_reprise(uuid) from public, anon;
revoke all on function public.offload_noter_tache(uuid, text, text) from public, anon;
grant execute on function public.offload_ouvrir_reprise(uuid) to authenticated, service_role;
grant execute on function public.offload_noter_tache(uuid, text, text) to authenticated, service_role;
revoke execute on function private.offload_ouvrir_reprise(uuid) from public, anon;
revoke execute on function private.offload_noter_tache(uuid, text, text) from public, anon;
grant execute on function private.offload_ouvrir_reprise(uuid) to authenticated, service_role;
grant execute on function private.offload_noter_tache(uuid, text, text) to authenticated, service_role;

revoke execute on function private.offload_essai_contre_reel(uuid) from public, anon, authenticated;
revoke execute on function private.offload_duree(date, date) from public, anon, authenticated;
revoke execute on function private.offload_date_longue(date) from public, anon, authenticated;
revoke execute on function private.offload_message(uuid, integer, timestamptz, date) from public, anon, authenticated;
revoke execute on function private.offload_preparer_message(uuid, integer) from public, anon, authenticated;
revoke execute on function private.offload_ouvrir(uuid, text, date) from public, anon, authenticated;
revoke execute on function private.offload_clore(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;
revoke execute on function private.offload_demande_arret(text) from public, anon, authenticated;
revoke execute on function private.offload_lire_reponse(jsonb) from public, anon, authenticated;
revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;
revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;
revoke execute on function private.offload_traiter_travaux(integer) from public, anon, authenticated;
revoke execute on function private.offload_point_lignes(uuid, date) from public, anon, authenticated;
revoke execute on function private.offload_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.offload_essai_contre_reel(uuid) to service_role;
grant execute on function private.offload_duree(date, date) to service_role;
grant execute on function private.offload_date_longue(date) to service_role;
grant execute on function private.offload_message(uuid, integer, timestamptz, date) to service_role;
grant execute on function private.offload_preparer_message(uuid, integer) to service_role;
grant execute on function private.offload_ouvrir(uuid, text, date) to service_role;
grant execute on function private.offload_clore(uuid, text, text) to service_role;
grant execute on function private.offload_suivre_envoi(jsonb) to service_role;
grant execute on function private.offload_demande_arret(text) to service_role;
grant execute on function private.offload_lire_reponse(jsonb) to service_role;
grant execute on function private.offload_cycle(uuid, date) to service_role;
grant execute on function private.offload_detecter_tout(date) to service_role;
grant execute on function private.offload_traiter_travaux(integer) to service_role;
grant execute on function private.offload_point_lignes(uuid, date) to service_role;
grant execute on function private.offload_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('offload-matin', '*/30 * * * *', $cron$select private.offload_deposer_points()$cron$)
where not exists (select 1 from cron.job where jobname = 'offload-matin');
