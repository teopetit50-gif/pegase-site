-- 20261021192245 c4_23_correctifs_testeur
-- Source : dépôt : 8f82a396 omega/modules/offload/migrations/c4_23_correctifs_testeur.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_23_correctifs_testeur.sql @ 8f82a396.
-- ═══ omega/modules/offload/migrations/c4_23_correctifs_testeur.sql @ 8f82a396
-- c4_23 — OFFLOAD : correctifs du testeur T-OFFLOAD (session C4, 21/10/2026)
--
-- Écarts relevés sur la recette (client banc-test-offload), reproduits par le coordinateur :
--   · TOFFLOAD-01 : OFFLOAD en essai, mais aucune ligne reglages_envois pour le module : le socle a fait naître les envois
--     en mode « reel » (bloqués CONFIG_ABSENTE, rien n'est parti, par chance). Désormais, OFFLOAD en essai ne prépare
--     RIEN tant que les envois du module ne sont pas explicitement réglés en essai : offload_essai_contre_reel est vrai
--     dès que le réglage d'envoi du module n'est pas « essai » (réel OU absent). Toutes les portes qui préparent un
--     message le lisent déjà (reprise, relance, échéance, affaire, cycle) ; offload_envoyer le revérifie en dernier.
--   · TOFFLOAD-02 : une reprise ouverte À LA MAIN sur un compte en litige ou en recouvrement CASHD. offload_ouvrir
--     refuse désormais un compte que CASHD suit (offload_impaye, c4_11), quelle que soit la porte.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- OFFLOAD en essai : le réglage d'envoi du module doit être « essai », explicitement (absent = refus).
create or replace function private.offload_essai_contre_reel(p_client uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce((select g.mode from public.offload_reglages g where g.client_id = p_client), 'essai') = 'essai'
     and (private.reglages_envois_effectifs(p_client, 'offload') ->> 'mode') is distinct from 'essai'
$function$;

-- L'ouverture d'une reprise : refusée pour un compte suivi par CASHD ; le refus d'essai dit le vrai motif.
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
  if exists (select 1 from public.offload_reprises x where x.compte_id = c.id
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

-- La préparation du message : même phrase.
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
    raise exception 'OFFLOAD est en mode essai et les envois du module ne sont pas réglés en essai : rien n''est préparé (aucun message ne naît en réel).' using errcode = '55000';
  end if;
  if private.offload_suspendu(r.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = r.client_id) using errcode = '55000';
  end if;
  perform private.offload_assurer_consentement(c.id);
  v_msg := private.offload_regles_appliquer(r.client_id, private.offload_message(c.id, p_rang, r.envoye1_le, null));
  if v_msg ->> 'retenu' is not null then
    -- Une règle du client est enfreinte : le message est retenu, la reprise passe par l'appel.
    update public.offload_reprises set motif = left(format('Message retenu par votre règle « %s » : la reprise passe par l''appel.', v_msg ->> 'retenu'), 500),
           maj_le = now() where id = r.id;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_retenu', 'offload_reprises', r.id::text,
      jsonb_build_object('rang', p_rang, 'regle', v_msg ->> 'retenu'), r.entite_id);
    return null;
  end if;
  v_envoi := private.offload_envoyer(r.client_id, 'reprise', c.id, 'offload_reprises', r.id::text,
    jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                       'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
    v_msg, 'offload:reprise:' || r.id::text || ':' || p_rang, r.entite_id);
  return v_envoi;
end $function$;

-- Le cycle : l'alerte dit le vrai motif.
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
      'OFFLOAD est en mode essai, mais les envois du module ne sont pas réglés en essai : aucun message de reprise n''est préparé.',
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

-- La voie d'envoi : le verrou d'essai, en dernier.
create or replace function private.offload_envoyer(p_client uuid, p_sujet text, p_compte uuid, p_objet_type text, p_objet_id text,
                                                   p_destinataire jsonb, p_msg jsonb, p_cle text, p_entite uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_envoi uuid;
  v_raison text;
  v_dem public.demandes_validation;
  e public.envois;
begin
  select x.id into v_envoi from public.envois x where x.client_id = p_client and x.cle_idempotence = p_cle;
  if v_envoi is not null then
    return v_envoi;
  end if;
  -- Dernier verrou (c4_23) : OFFLOAD en essai ne fait jamais naître un envoi hors essai.
  if private.offload_essai_contre_reel(p_client) then
    raise exception '%', 'OFFLOAD est en mode essai et les envois du module ne sont pas réglés en essai : rien n''est préparé (aucun message ne naît en réel).' using errcode = '55000';
  end if;
  v_raison := private.offload_retenue(p_client, p_compte, p_sujet, p_destinataire ->> 'adresse');
  if v_raison is not null then
    select * into v_dem from public.demandes_validation d where d.client_id = p_client and d.cle_idempotence = 'offload:retenu:' || p_cle;
    if v_dem.id is null then
      insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
      values (p_client, p_entite, 'offload', 'offload.message_retenu', p_objet_type, p_objet_id,
              left(format('Message retenu — %s. Courriel à %s : %s', v_raison, coalesce(p_destinataire ->> 'nom', p_destinataire ->> 'adresse'),
                          coalesce(p_msg ->> 'sujet', 'sans objet')), 500),
              jsonb_build_object('raison', v_raison, 'sujet_offload', p_sujet, 'canal', 'email',
                                 'destinataire', jsonb_build_object('nom', p_destinataire ->> 'nom', 'adresse', p_destinataire ->> 'adresse'),
                                 'sujet', p_msg ->> 'sujet', 'corps', p_msg ->> 'corps'),
              'offload:retenu:' || p_cle)
      returning * into v_dem;
    end if;
    if v_dem.statut <> 'en_attente' then
      -- Un accord permanent ne couvre jamais un message retenu : une personne décide chaque fois.
      raise exception 'Un accord permanent couvre les messages retenus d''OFFLOAD : révoquez-le, une personne doit les lire.'
        using errcode = '42501';
    end if;
  end if;
  v_envoi := private.preparer_envoi(p_client, 'offload', p_objet_type, p_objet_id, 'email', p_destinataire,
    null, '{}'::jsonb, p_msg ->> 'sujet', p_msg ->> 'corps', null::uuid[], p_cle, p_entite, false, false, null::timestamptz,
    case when v_dem.id is null then '{}'::jsonb else jsonb_build_object('demande', v_dem.id) end);
  if v_dem.id is not null then
    select * into e from public.envois where id = v_envoi;
    if e.statut = 'bloque' or e.demande_id is distinct from v_dem.id then
      -- Arrêté par le socle (opposition, consentement…) : la demande de lecture n'a plus d'objet.
      update public.demandes_validation set statut = 'annulee' where id = v_dem.id and statut = 'en_attente';
    end if;
    perform private.journaliser_module(p_client, 'offload', 'offload.message_retenu', p_objet_type, p_objet_id,
      jsonb_build_object('raison', v_raison, 'sujet', p_sujet, 'envoi', v_envoi, 'demande', v_dem.id), p_entite);
  end if;
  return v_envoi;
end $function$;

revoke execute on function private.offload_essai_contre_reel(uuid) from public, anon, authenticated;
grant execute on function private.offload_essai_contre_reel(uuid) to service_role;
revoke execute on function private.offload_ouvrir(uuid, text, date) from public, anon, authenticated;
grant execute on function private.offload_ouvrir(uuid, text, date) to service_role;
revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_cycle(uuid, date) to service_role;
revoke execute on function private.offload_preparer_message(uuid, integer) from public, anon, authenticated;
grant execute on function private.offload_preparer_message(uuid, integer) to service_role;
revoke execute on function private.offload_envoyer(uuid, text, uuid, text, text, jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function private.offload_envoyer(uuid, text, uuid, text, text, jsonb, jsonb, text, uuid) to service_role;
