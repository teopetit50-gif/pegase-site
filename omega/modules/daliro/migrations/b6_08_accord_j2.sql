-- b6_08 — DALIRO : l'accord permanent des confirmations J-2 (session B6, 06/10/2026)
--
-- DÉCISION DE TEO (06/10, ~13 h 40 Z) : les confirmations J-2 partent sans approbation envoi par envoi, pour
-- les organisations qui ont donné cet accord. Décision du coordinateur : par le mécanisme du socle,
-- public.politiques (« accord permanent »), sans contournement — un moteur ne se passe jamais de la
-- validation, une politique active couvre ses envois (private.preparer_demande → politique_couvrante).
--
-- CE QUI EST POSÉ.
--   · public.btp_donner_accord_j2(p_client) : le gérant ou un administrateur (une personne, jamais le serveur)
--     propose trois politiques du socle, module daliro, type_action envoi.email / envoi.whatsapp / envoi.sms,
--     libellé « Accord permanent des confirmations J-2 (…) », bornées par nombre_mensuel = 1000 (un envoi J-2
--     n'a pas de montant : plafond_operation reste null), du moment présent à +365 jours. Le socle dépose
--     la demande d'activation « politique.activer » ; l'accord ne couvre rien tant qu'elle n'est pas
--     approuvée. Rejouer ne crée rien de plus ; une politique active qui finit dans moins de 30 jours est
--     renouvelée (une nouvelle est proposée).
--   · public.btp_revoquer_accord_j2(p_client, p_motif) : révoque par public.revoquer_politique du socle
--     toutes les politiques J-2 à valider ou actives. Les envois déjà approuvés ou partis ne bougent pas ;
--     les suivants retournent dans « À valider ».
--   · public.btp_accord_j2(p_client) : l'état, par canal (aucun / à valider / actif jusqu'au… / révoqué),
--     qui l'a donné et quand, la demande d'activation, l'usage du mois. Gérant et administrateurs seulement.
--   · La trace : un envoi J-2 couvert porte demandes_validation.politique_id (socle) ; l'ouvrier ajoute au
--     journal « daliro.confirmation_par_accord » : « approuvé par accord permanent du <date>, <utilisateur> ».
--     Le tableau du chantier montre l'accord sur l'envoi.
--   · private.btp_alerter_fin_accord(p_client, p_instant) : 30 jours avant la fin d'une politique active
--     sans relève, une alerte au client ; appelée chaque jour par btp_tache_confirmations (cron 15 h UTC).
--   · Le mode essai (reglages_envois) reste prioritaire : un envoi préparé en essai part à l'adresse d'essai.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_accord_j2_types()
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$ select array['envoi.email', 'envoi.whatsapp', 'envoi.sms'] $function$;

-- L'état de l'accord d'une organisation (sans contrôle : réservé aux portes ci-dessous et au serveur).
create or replace function private.btp_accord_j2_etat(p_client uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with p as (
    select p.*, row_number() over (partition by p.type_action
                                   order by (p.statut = 'active' and now() >= p.debut and now() < p.fin) desc,
                                            (p.statut = 'a_valider') desc, p.cree_le desc) as rang
    from public.politiques p
    where p.client_id = p_client and p.module = 'daliro' and p.type_action = any (private.btp_accord_j2_types())
  ), canaux as (
    select jsonb_build_object(
             'canal', split_part(t, '.', 2), 'type_action', t,
             'politique', p.id, 'statut', coalesce(p.statut, 'aucun'), 'libelle', p.libelle,
             'debut', p.debut, 'fin', p.fin, 'active_le', p.active_le, 'cree_le', p.cree_le,
             'donne_par', p.cree_par, 'donne_par_libelle', (select u.email from auth.users u where u.id = p.cree_par),
             'demande', p.demande_id, 'demande_statut', (select d.statut from public.demandes_validation d where d.id = p.demande_id),
             'revoquee_le', p.revoquee_le, 'revoquee_par_libelle', (select u.email from auth.users u where u.id = p.revoquee_par),
             'motif_revocation', p.motif_revocation, 'nombre_mensuel', p.nombre_mensuel,
             'utilises_mois', (select count(*) from public.demandes_validation d
                               where d.politique_id = p.id and d.statut in ('approuvee', 'executee')
                                 and d.cree_le >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
           ) as c, p.statut, p.fin
    from unnest(private.btp_accord_j2_types()) t
    left join p on p.type_action = t and p.rang = 1
  )
  select jsonb_build_object(
    'etat', case when bool_and(statut = 'active' and fin > now()) then 'actif'
                 when bool_or(statut = 'active' and fin > now()) then 'partiel'
                 when bool_or(statut = 'a_valider') then 'a_valider'
                 when bool_or(statut = 'revoquee') then 'revoque'
                 else 'aucun' end,
    'fin', min(fin) filter (where statut = 'active'),
    'canaux', jsonb_agg(c order by c ->> 'canal'))
  from canaux
$function$;

create or replace function public.btp_accord_j2(p_client uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not private.btp_est_serveur()
     and ((select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin'])) then
    raise exception 'L''accord permanent des confirmations J-2 se lit par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  return private.btp_accord_j2_etat(p_client);
end $function$;

create or replace function public.btp_donner_accord_j2(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_type text;
  v_id uuid;
  v_crees jsonb := '[]'::jsonb;
  v_reglage uuid;
begin
  -- Une décision d'une personne : ni le serveur, ni un membre sans rôle de direction.
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''accord permanent des confirmations J-2 se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  select r.id into v_reglage from public.btp_reglages r where r.client_id = p_client;
  if v_reglage is null then
    raise exception 'Daliro n''est pas installé pour cette organisation.' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('daliro.accord_j2:' || p_client::text, 0));
  foreach v_type in array private.btp_accord_j2_types() loop
    -- déjà proposée, ou active pour plus de 30 jours : rien à faire
    continue when exists (select 1 from public.politiques p
                          where p.client_id = p_client and p.module = 'daliro' and p.type_action = v_type
                            and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days')));
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, null, 'daliro', v_type,
            'Accord permanent des confirmations J-2 (' || case v_type when 'envoi.email' then 'courriel'
                                                                    when 'envoi.whatsapp' then 'WhatsApp' else 'SMS' end || ')',
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    v_crees := v_crees || to_jsonb(v_id);
  end loop;
  if jsonb_array_length(v_crees) > 0 then
    perform private.journaliser(p_client, 'daliro.accord_j2_donne', 'btp_reglages', v_reglage::text,
      jsonb_build_object('politiques', v_crees, 'par', v_uid), null);
  end if;
  return private.btp_accord_j2_etat(p_client) || jsonb_build_object('proposees', v_crees);
end $function$;

create or replace function public.btp_revoquer_accord_j2(p_client uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_n integer := 0;
  v_reglage uuid := (select g.id from public.btp_reglages g where g.client_id = p_client);
begin
  if not private.btp_est_serveur()
     and ((select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin'])) then
    raise exception 'L''accord permanent des confirmations J-2 se révoque par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  for r in select p.id from public.politiques p
           where p.client_id = p_client and p.module = 'daliro' and p.type_action = any (private.btp_accord_j2_types())
             and p.statut in ('a_valider', 'active')
  loop
    perform private.revoquer_politique(r.id, left(coalesce(nullif(btrim(p_motif), ''), 'Accord des confirmations J-2 révoqué'), 500));
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    perform private.journaliser(p_client, 'daliro.accord_j2_revoque', 'btp_reglages', coalesce(v_reglage::text, p_client::text),
      jsonb_build_object('politiques', v_n, 'motif', p_motif), null);
  end if;
  return private.btp_accord_j2_etat(p_client) || jsonb_build_object('revoquees', v_n);
end $function$;

-- 30 jours avant la fin d'un accord actif qui n'a pas de relève : une alerte au client.
create or replace function private.btp_alerter_fin_accord(p_client uuid, p_instant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_n integer := 0;
begin
  for r in
    select p.* from public.politiques p
    where p.client_id = p_client and p.module = 'daliro' and p.type_action = any (private.btp_accord_j2_types())
      and p.statut = 'active' and p.fin > p_instant and p.fin <= p_instant + interval '30 days'
      and not exists (select 1 from public.politiques q
                      where q.client_id = p.client_id and q.module = 'daliro' and q.type_action = p.type_action and q.id <> p.id
                        and (q.statut = 'a_valider' or (q.statut = 'active' and q.fin > p_instant + interval '30 days')))
  loop
    perform private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
      left(format('L''accord permanent des confirmations J-2 prend fin le %s : renouvelez-le',
                  to_char(r.fin at time zone 'Europe/Paris', 'DD/MM/YYYY')), 150),
      jsonb_build_object('politique', r.id, 'type_action', r.type_action, 'fin', r.fin),
      'accord_j2_fin:' || r.id::text, true, null);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- L'ouvrier trace l'accord (b6_07, plus la trace « approuvé par accord permanent »)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_envoyer_demande(t public.travaux)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_canal text := t.charge ->> 'canal';
  v_adresse text;
  v_texte jsonb;
  v_envoi uuid;
  v_passage public.btp_passages;
  v_politique uuid;
  v_accord_le timestamptz;
  v_accord_par uuid;
  v_accord_par_libelle text;
begin
  select * into v_passage from public.btp_passages p
  where p.client_id = t.client_id and p.id = (t.charge ->> 'passage')::uuid;
  if v_passage.id is null or v_passage.statut <> 'prevu' or v_passage.confirmation <> 'demandee' then
    return jsonb_build_object('ignore', 'passage absent, plus prévu ou plus en attente de réponse');
  end if;
  if v_canal is null or v_canal not in ('email', 'whatsapp', 'sms') then
    return jsonb_build_object('ignore', format('canal %s : le bureau appelle lui-même', coalesce(v_canal, 'vide')));
  end if;
  v_adresse := case when v_canal = 'email' then t.charge ->> 'email' else t.charge ->> 'telephone' end;
  v_texte := private.btp_texte_confirmation(t.client_id, t.charge);
  v_envoi := private.preparer_envoi(t.client_id, 'daliro', 'btp_passages', v_passage.id::text, v_canal,
    jsonb_build_object('adresse', v_adresse, 'nom', t.charge ->> 'tiers_nom', 'ref', t.charge ->> 'tiers',
                       'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb,
    case when v_canal = 'email' then v_texte ->> 'sujet' end,
    case when v_canal = 'email' then v_texte ->> 'corps' else (v_texte ->> 'sujet') || E'\n\n' || (v_texte ->> 'corps') end,
    null::uuid[], 'daliro:j2:' || v_passage.id::text || ':v' || coalesce(t.charge ->> 'version', v_passage.version::text),
    v_passage.entite_id, true, false, null::timestamptz, '{}'::jsonb);
  -- b6_08 : couverte par l'accord permanent (public.politiques du socle), la demande naît approuvée ; on le trace.
  select d.politique_id, p.active_le, p.cree_par, (select u.email from auth.users u where u.id = p.cree_par)
    into v_politique, v_accord_le, v_accord_par, v_accord_par_libelle
  from public.envois e
  join public.demandes_validation d on d.id = e.demande_id
  left join public.politiques p on p.id = d.politique_id
  where e.id = v_envoi;
  perform private.journaliser(t.client_id, 'daliro.confirmation_envoyee', 'btp_passages', v_passage.id::text,
    jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'tiers', t.charge ->> 'tiers', 'debut', t.charge ->> 'debut',
                       'politique', v_politique),
    v_passage.entite_id);
  if v_politique is not null then
    perform private.journaliser(t.client_id, 'daliro.confirmation_par_accord', 'btp_passages', v_passage.id::text,
      jsonb_build_object('envoi', v_envoi, 'politique', v_politique, 'accord_du', v_accord_le, 'accord_par', v_accord_par,
                         'trace', format('approuvé par accord permanent du %s, %s',
                                         to_char(v_accord_le at time zone 'Europe/Paris', 'DD/MM/YYYY'),
                                         coalesce(v_accord_par_libelle, 'utilisateur inconnu'))),
      v_passage.entite_id);
  end if;
  return jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'politique', v_politique,
    'statut', (select e.statut from public.envois e where e.id = v_envoi),
    'verrou', (select e.verrou from public.envois e where e.id = v_envoi));
end $function$;

-- Le passage quotidien : les demandes J-2 (b6_02) et l'alerte de fin d'accord.
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
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat', private.btp_demander_confirmations(r.client_id, current_date));
      begin
        perform private.btp_alerter_fin_accord(r.client_id, now());
      exception when others then
        raise notice 'alerte de fin d''accord (%) : %', r.client_id, sqlerrm;
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

-- Le tableau du chantier : b6_07, plus « accord » sur l'envoi.
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.id), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id),
        -- b6_07 : la dernière demande J-2 partie pour ce passage (envois du socle, sous la RLS du lecteur)
        'envoi', (select jsonb_build_object('id', e.id, 'canal', e.canal, 'mode', e.mode, 'statut', e.statut, 'verrou', e.verrou,
                                            'cree_le', e.cree_le, 'envoye_le', e.envoye_le, 'remise', e.remise, 'remise_le', e.remise_le,
                                            -- b6_08 : approuvé par l'accord permanent (politique du socle) ?
                                            'accord', (select jsonb_build_object('politique', d.politique_id, 'active_le', p.active_le)
                                                       from public.demandes_validation d join public.politiques p on p.id = d.politique_id
                                                       where d.id = e.demande_id))
                  from public.envois e
                  where e.client_id = p.client_id and e.module = 'daliro' and e.objet_type = 'btp_passages' and e.objet_id = p.id::text
                  order by e.cree_le desc limit 1))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;
revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_accord_j2_types() from public, anon, authenticated;
revoke execute on function private.btp_accord_j2_etat(uuid) from public, anon, authenticated;
revoke execute on function private.btp_alerter_fin_accord(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function private.btp_envoyer_demande(public.travaux) from public, anon, authenticated;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_accord_j2_types() to service_role;
grant execute on function private.btp_accord_j2_etat(uuid) to service_role;
grant execute on function private.btp_alerter_fin_accord(uuid, timestamptz) to service_role;
grant execute on function private.btp_envoyer_demande(public.travaux) to service_role;
grant execute on function private.btp_tache_confirmations() to service_role;
revoke execute on function public.btp_accord_j2(uuid) from public, anon;
revoke execute on function public.btp_donner_accord_j2(uuid) from public, anon;
revoke execute on function public.btp_revoquer_accord_j2(uuid, text) from public, anon;
grant execute on function public.btp_accord_j2(uuid) to authenticated, service_role;
grant execute on function public.btp_donner_accord_j2(uuid) to authenticated, service_role;
grant execute on function public.btp_revoquer_accord_j2(uuid, text) to authenticated, service_role;
