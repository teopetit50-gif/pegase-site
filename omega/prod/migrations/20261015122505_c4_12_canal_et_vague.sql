-- 20261015122505 c4_12_canal_et_vague
-- Source : dépôt : 18a2ff7 omega/modules/offload/migrations/c4_12_canal_et_vague.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_12_canal_et_vague.sql @ 18a2ff7 ; c4_03 cité comme test : ignoré ; c4_04 cité comme test : ignoré ; c4_12 cité comme test : ignoré.
-- ═══ omega/modules/offload/migrations/c4_12_canal_et_vague.sql @ 18a2ff7
-- c4_12 — OFFLOAD : un seul canal à la fois, et la vague de la semaine (session C4, 15/10/2026)
--
-- CE QUE ÇA POSE (promesses de /offres/nouvelles-affaires, chiffrage omega/CHIFFRAGE/offload.md n° 41, 51, 52) :
--   · « un seul canal à la fois, jamais les deux » : une reprise passe par un message OU par un appel. Le message part
--     s'il le peut (courriel connu, ni retenu par une règle, ni bloqué par le socle) ; sinon, et seulement alors, la
--     tâche d'appel est posée. Un message qui ne part pas (bloqué, annulé, expiré, en échec, non remis) bascule la
--     reprise sur l'appel et pose la tâche à ce moment-là.
--   · « la vague de la semaine » : offload_reglages.vague_jour (1 = lundi … 7 = dimanche ; vide = chaque jour, comme
--     avant). Les nouvelles reprises ne s'ouvrent que le jour de la vague, préparées la nuit et prêtes à valider au
--     matin ; elles partent à la validation, dans les plages horaires du socle. Les relances, les échéances et les
--     retraits gardent leur propre calendrier.
--
-- Règles de pose : alter … add column if not exists, contrainte posée si absente, create or replace. Aucun DROP,
-- aucun DELETE.

alter table public.offload_reglages add column if not exists vague_jour smallint;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_vague_jour_check') then
    alter table public.offload_reglages add constraint offload_reglages_vague_jour_check check (vague_jour between 1 and 7);
  end if;
end $$;

-- L'ouverture d'une reprise : un message, ou un appel, jamais les deux.
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

  if private.offload_suspendu(c.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = c.client_id) using errcode = '55000';
  end if;
  if private.offload_essai_contre_reel(c.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
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

-- Le suivi des envois : un message de reprise qui ne part pas bascule sur l'appel.
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
  -- Un message non remis : le compte passe « à vérifier », et la surveillance juge s'il faut s'arrêter (c4_10).
  if v_issue in ('echec', 'non_remis') and p_charge ->> 'envoi' is not null then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' and private.offload_compte_de_envoi(e.id) is not null then
      perform private.offload_a_verifier(private.offload_compte_de_envoi(e.id), 'echec',
        left(format('Le message du %s n''a pas été remis (%s%s) : l''adresse est à vérifier.', private.offload_le((e.cree_le at time zone 'Europe/Paris')::date),
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
             k.commercial, (now() at time zone 'Europe/Paris')::date + 1
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

-- Le cycle : les nouvelles reprises ne s'ouvrent que le jour de la vague, s'il est réglé.
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

  -- 0. OFFLOAD suspendu au premier doute : rien ne se prépare (c4_10).
  if private.offload_suspendu(p_client) then
    return jsonb_build_object('bloque', 'suspendu');
  end if;
  -- 0 bis. OFFLOAD en essai et envois du module réglés en réel : on ne prépare rien, on le dit.
  if private.offload_essai_contre_reel(p_client) then
    perform private.lever_alerte_module(p_client, 'offload', 'attention',
      'OFFLOAD est en mode essai, mais les envois du module sont réglés en réel : aucun message de reprise n''est préparé.',
      '{}'::jsonb, 'offload:essai_contre_reel', false, null);
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;

  select count(*) into v_deja from public.offload_reprises p
  where p.client_id = p_client and p.ouverte_par = 'detection' and (p.cree_le at time zone 'Europe/Paris')::date = v_jour;

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

-- Les réglages : le jour de la vague.
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
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour', 'delai_retrait_jours', 'delai_relance_retrait_jours',
                  'arrete_jour', 'seuil_non_remis_pct', 'vague_jour');
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
    delai_retrait_jours = case when p ? 'delai_retrait_jours' then (p ->> 'delai_retrait_jours')::smallint else delai_retrait_jours end,
    delai_relance_retrait_jours = case when p ? 'delai_relance_retrait_jours' then (p ->> 'delai_relance_retrait_jours')::smallint
                                       else delai_relance_retrait_jours end,
    vague_jour = case when p ? 'vague_jour' then (p ->> 'vague_jour')::smallint else vague_jour end,
    seuil_non_remis_pct = case when p ? 'seuil_non_remis_pct' then (p ->> 'seuil_non_remis_pct')::smallint else seuil_non_remis_pct end,
    arrete_jour = case when p ? 'arrete_jour' then (p ->> 'arrete_jour')::smallint else arrete_jour end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- Droits : inchangés (fonctions redéfinies).
revoke execute on function private.offload_ouvrir(uuid, text, date) from public, anon, authenticated;
grant execute on function private.offload_ouvrir(uuid, text, date) to service_role;
revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;
grant execute on function private.offload_suivre_envoi(jsonb) to service_role;
revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_cycle(uuid, date) to service_role;
revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;
grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
