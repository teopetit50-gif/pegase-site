-- c4_44 — OFFLOAD : la relance des prospects qui n'ont pas abouti (session C4, 27/10/2026 ; audit
-- omega/CHIFFRAGE/offload.md, ligne N9 : « Chaque agence possède un fichier de contacts qui n'ont pas abouti, et qui n'ont
-- jamais été recontactés. Le système OFFLOAD reprend cette base à cadence maîtrisée : un message personnel, adapté à
-- l'historique du contact, jamais une campagne de masse. Celui qui répond sort du circuit automatique et revient à
-- l'agent ; celui qui demande à ne plus être contacté ne l'est plus jamais. »)
--
-- OFFLOAD partait des ACHATS : un contact sans achat était « présenté à part ». Désormais :
--   · un prospect est un compte suivi, sans aucun achat, dont l'historique porte au moins un échange (offload_contacts :
--     appel, visite, courriel, salon) ;
--   · private.offload_prospects_cycle(client, jour) le reprend à la cadence de l'organisation : le jour de la vague
--     (vague_jour), dans le plafond quotidien de reprises (partagé avec les clients), jamais un compte écarté
--     (offload_ecarte : liste d'exclusion, suivi en direct, retiré, impayé, contacté pendant la quarantaine), une seule
--     fois par échange (pas de nouvelle reprise sans nouvel échange) ; cron « offload-prospects » chaque matin ;
--   · la reprise d'un compte sans achat est marquée « prospect » (offload_reprises.nature) et porte son propre message :
--     ancré sur la date et la nature du dernier échange (« Nous avions échangé le 12 mai, lors de votre visite »), dans le
--     vocabulaire du secteur (c4_43), sans jamais reprendre la note interne du commercial, sans prix ni délai ;
--   · il ne part jamais seul : un message à un prospect est toujours lu par une personne (sujet « prospect », jamais
--     autorisé à l'envoi automatique) ; et jamais sans base légale : sans consentement enregistré pour son adresse, le
--     socle le retient et la reprise passe par l'appel de l'agent (la prospection par courriel d'un particulier exige
--     son accord, CPCE L34-5) ;
--   · le reste est le cycle d'OFFLOAD : une réponse arrête tout et revient à l'agent ; « stop » vaut retrait définitif ;
--     un message par trimestre au plus (c4_40).
--   · réglage : public.offload_regler_prospects(client, actifs) — allumé par défaut, gérant ou administrateur, au journal.
--
-- Règles de pose : alter … add column if not exists, déclencheur et contrainte posés s'ils manquent, create or replace,
-- cron.schedule rejouable. Aucun DROP, aucun DELETE.

alter table public.offload_reprises add column if not exists nature text not null default 'client';
alter table public.offload_reglages add column if not exists prospects_actifs boolean not null default true;
do $do$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.offload_reprises'::regclass and conname = 'offload_reprises_nature_check') then
    alter table public.offload_reprises add constraint offload_reprises_nature_check check (nature in ('client', 'prospect'));
  end if;
end $do$;

-- Une reprise d'un compte sans aucun achat est la reprise d'un prospect.
create or replace function private.offload_reprise_nature() returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not exists (select 1 from public.offload_achats a where a.compte_id = new.compte_id and a.annule_le is null and a.nature <> 'avoir') then
    new.nature := 'prospect';
  end if;
  return new;
end $function$;
revoke execute on function private.offload_reprise_nature() from public, anon, authenticated;
do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.offload_reprises'::regclass and tgname = 'offload_reprises_nature') then
    create trigger offload_reprises_nature before insert on public.offload_reprises
      for each row execute function private.offload_reprise_nature();
  end if;
end $do$;

-- Le message à un prospect : son dernier échange, jamais la note interne, dans le vocabulaire du secteur.
create or replace function private.offload_message_prospect(p_compte uuid, p_rang integer, p_premier_le timestamptz default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  k public.offload_contacts;
  v_org text;
  v_vocab jsonb;
  v_signature text;
  v_echange text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  select * into k from public.offload_contacts x where x.compte_id = c.id order by x.le desc, x.cree_le desc limit 1;
  v_vocab := private.offload_vocabulaire(c.client_id);
  v_signature := coalesce(nullif(btrim(g.signature), ''), v_org);
  v_echange := case when k.id is null then null
                    else 'le ' || private.offload_date_longue(k.le)
                         || case k.canal when 'appel' then ', au téléphone' when 'visite' then ', lors de votre visite'
                                         when 'courriel' then ', par courriel' when 'salon' then ', sur le salon' else '' end end;
  if p_rang = 1 then
    return jsonb_build_object(
      'sujet', left(v_org || case when k.id is not null then ' — suite à notre échange du ' || private.offload_date_longue(k.le)
                                  else ' — reprendre contact' end, 300),
      'corps', 'Bonjour' || coalesce(' ' || c.contact, '') || ',' || E'\n\n'
        || case when v_echange is not null then 'Nous avions échangé ' || v_echange || '. ' else '' end
        || 'Je reviens vers vous : où en est ' || (v_vocab ->> 'projet') || ' ?' || E'\n\n'
        || 'Si le moment est venu, ' || (v_vocab ->> 'retour') || ' : un simple retour à ce message suffit.' || E'\n\n'
        || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop);
  end if;
  return jsonb_build_object(
    'sujet', left('Re : ' || v_org || case when k.id is not null then ' — suite à notre échange du ' || private.offload_date_longue(k.le)
                                           else ' — reprendre contact' end, 300),
    'corps', 'Bonjour' || coalesce(' ' || c.contact, '') || ',' || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone private.offload_fuseau_compte(p_compte))::date), 'dernier')
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop);
end $function$;
revoke execute on function private.offload_message_prospect(uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function private.offload_message_prospect(uuid, integer, timestamptz) to service_role;

-- La préparation du message : le message du prospect pour une reprise de prospect, jamais en envoi automatique.
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
  v_msg := private.offload_regles_appliquer(r.client_id,
    case when r.nature = 'prospect' then private.offload_message_prospect(c.id, p_rang, r.envoye1_le)
         else private.offload_message(c.id, p_rang, r.envoye1_le, null) end);
  if v_msg ->> 'retenu' is not null then
    update public.offload_reprises set motif = left(format('Message retenu par votre règle « %s » : la reprise passe par l''appel.', v_msg ->> 'retenu'), 500),
           maj_le = now() where id = r.id;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_retenu', 'offload_reprises', r.id::text,
      jsonb_build_object('rang', p_rang, 'regle', v_msg ->> 'retenu'), r.entite_id);
    return null;
  end if;
  v_envoi := private.offload_envoyer(r.client_id, case when r.nature = 'prospect' then 'prospect' else 'reprise' end, c.id,
    'offload_reprises', r.id::text,
    jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                       'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
    v_msg, 'offload:reprise:' || r.id::text || ':' || p_rang, r.entite_id);
  return v_envoi;
end $function$;
revoke execute on function private.offload_preparer_message(uuid, integer) from public, anon, authenticated;
grant execute on function private.offload_preparer_message(uuid, integer) to service_role;

-- La retenue : un message à un prospect est toujours lu par une personne, même quand l'envoi automatique est allumé.
create or replace function private.offload_retenue(p_client uuid, p_compte uuid, p_sujet text, p_adresse text)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  c public.offload_comptes;
  s public.offload_signaux;
  v_local text := split_part(lower(btrim(coalesce(p_adresse, ''))), '@', 1);
begin
  select * into g from public.offload_reglages where client_id = p_client;
  select * into c from public.offload_comptes where id = p_compte;
  if p_sujet = 'prospect' then
    return 'prospect : un premier message à un contact qui n''a pas abouti est toujours lu par une personne';
  end if;
  if not coalesce(g.envoi_auto, false) then
    return 'envoi automatique éteint dans les réglages';
  end if;
  if not (p_sujet = any (g.sujets_auto)) then
    return format('sujet non autorisé pour l''envoi automatique (%s)',
                  case p_sujet when 'reprise' then 'reprise d''un compte silencieux' when 'echeance' then 'échéance qui revient'
                               when 'affaire' then 'commande en attente de retrait' else p_sujet end);
  end if;
  if c.verification is not null then
    return 'doute : compte ' || case when c.verification = 'reattribuer' then 'à réattribuer' else 'à vérifier' end
           || coalesce(' (' || c.verification_motif || ')', '');
  end if;
  if v_local ~ '^(contact|info|infos|accueil|bonjour|hello|admin|administration|secretariat|standard|noreply|no-reply|ne-pas-repondre|nepasrepondre)$' then
    return format('doute : adresse générique (%s@…), le message risque de ne pas atteindre la bonne personne', v_local);
  end if;
  if p_sujet = 'reprise' then
    select * into s from public.offload_signaux where compte_id = p_compte;
    if s.compte_id is null or s.nb_achats < 3 then
      return 'doute : moins de trois achats connus, le silence du compte n''est pas établi';
    end if;
  end if;
  return null;
end $function$;
revoke execute on function private.offload_retenue(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function private.offload_retenue(uuid, uuid, text, text) to service_role;

-- La reprise des prospects d'une organisation, un jour donné.
create or replace function private.offload_prospects_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
  v_deja integer;
  v_reste integer;
  k record;
  n_ouverts integer := 0;
  n_refus integer := 0;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if g.client_id is null or not g.prospects_actifs then
    return jsonb_build_object('actifs', false);
  end if;
  if private.offload_suspendu(p_client) or private.offload_essai_contre_reel(p_client) then
    return jsonb_build_object('actifs', true, 'arrete', true);
  end if;
  if g.vague_jour is not null and extract(isodow from v_jour)::integer <> g.vague_jour then
    return jsonb_build_object('actifs', true, 'vague', false);
  end if;
  select count(*) into v_deja from public.offload_reprises p
  where p.client_id = p_client and p.ouverte_par = 'detection'
    and (p.cree_le at time zone private.offload_fuseau(p_client))::date = v_jour;
  v_reste := greatest(0, g.plafond_reprises_jour - v_deja);
  for k in
    select c.id, max(x.le) as dernier
    from public.offload_comptes c
    join public.offload_contacts x on x.compte_id = c.id
    where c.client_id = p_client and c.statut = 'suivi' and c.efface_le is null and c.fusionne_dans is null
      and not exists (select 1 from public.offload_achats a where a.compte_id = c.id and a.annule_le is null and a.nature <> 'avoir')
    group by c.id
    having not exists (select 1 from public.offload_reprises p where p.compte_id = c.id
                       and (p.cree_le at time zone private.offload_fuseau(p_client))::date >= max(x.le))
    order by max(x.le) desc, c.id
  loop
    exit when n_ouverts >= v_reste;
    continue when private.offload_ecarte(k.id) is not null;
    begin
      perform private.offload_ouvrir(k.id, 'detection', v_jour);
      n_ouverts := n_ouverts + 1;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;
  if n_ouverts + n_refus > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.prospects', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'ouverts', n_ouverts, 'refus', n_refus, 'plafond_restant', v_reste), null);
  end if;
  return jsonb_build_object('actifs', true, 'jour', v_jour, 'ouverts', n_ouverts, 'refus', n_refus, 'plafond_restant', v_reste);
end $function$;
revoke execute on function private.offload_prospects_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_prospects_cycle(uuid, date) to service_role;

create or replace function private.offload_prospects_tout()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare k record; n integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g where g.prospects_actifs order by g.client_id loop
    begin
      perform private.offload_prospects_cycle(k.client_id, null);
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention', 'La reprise des prospects n''a pas pu passer ce matin.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'prospects:echec', false, null);
    end;
  end loop;
  return n;
end $function$;
revoke execute on function private.offload_prospects_tout() from public, anon, authenticated;
grant execute on function private.offload_prospects_tout() to service_role;

-- Le réglage : reprendre ou non les prospects. Gérant ou administrateur, au journal.
create or replace function private.offload_regler_prospects(p_client uuid, p_actifs boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_avant boolean;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler la reprise des prospects');
  if p_actifs is null then
    raise exception 'La reprise des prospects est allumée ou éteinte.' using errcode = '22023';
  end if;
  select g.prospects_actifs into v_avant from public.offload_reglages g where g.client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  update public.offload_reglages set prospects_actifs = p_actifs, maj_le = now() where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('demande', jsonb_build_object('prospects_actifs', p_actifs), 'avant', jsonb_build_object('prospects_actifs', v_avant)), null);
  return jsonb_build_object('prospects_actifs', p_actifs);
end $function$;

create or replace function public.offload_regler_prospects(p_client uuid, p_actifs boolean)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_regler_prospects(p_client, p_actifs) $function$;

revoke execute on function private.offload_regler_prospects(uuid, boolean) from public, anon;
grant execute on function private.offload_regler_prospects(uuid, boolean) to authenticated, service_role;
revoke execute on function public.offload_regler_prospects(uuid, boolean) from public, anon;
grant execute on function public.offload_regler_prospects(uuid, boolean) to authenticated, service_role;

-- Chaque matin, après la détection (04 h 41 UTC).
do $cron$
begin
  if to_regnamespace('cron') is null then
    raise notice 'c4_44 : pg_cron absent — cron non posé.';
    return;
  end if;
  perform cron.schedule('offload-prospects', '20 5 * * *', 'select private.offload_prospects_tout()');
end $cron$;
