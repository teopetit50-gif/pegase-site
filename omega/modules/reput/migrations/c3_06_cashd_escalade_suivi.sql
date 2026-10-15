-- c3_06 — REPUT : avis après règlement (CASHD), litige, délai de traitement et escalade, client reconnu,
-- sujets récurrents, avis comptés par site (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT (lib/produits/capacites/accueil.ts) :
--   · « La demande d'avis part dans les trois jours qui suivent le règlement » — sans saisie : abonnement à
--     l'événement cashd.facture_reglee publié par CASHD (C2) quand une facture est soldée par lettrage. Seulement si
--     le client a coché « avis_auto_reglement » (faux par défaut) et posé son lien d'avis ; les règles de c3_05
--     (J+3, deux relances, six mois) s'appliquent. Aucune lecture des tables de CASHD : tout vient de la charge.
--   · « Un client en litige ouvert ne reçoit aucune réponse automatisée. » — private.reput_en_litige appelle
--     private.cashd_contact_en_litige(client, adresse) si CASHD l'a posée (to_regprocedure), sinon faux. Une demande
--     d'un contact en litige est toujours « à relire » (reput.transferer), jamais couverte par un accord, et remonte.
--   · « Chaque type de demande porte un délai de traitement que vous fixez. » « Le délai dépassé fait remonter la
--     demande au responsable du service. » — reput_sujets.delai_heures (urgence 1 h, réclamation et humain 4 h, le
--     reste 24 h, modifiable par reput_fixer_delai) ; l'ouvrier lève une alerte au client (critique pour une urgence)
--     pour toute demande en attente au-delà du délai de son sujet, une fois (reput_demandes.escaladee_le).
--   · « Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse. » — reput_commencer joint
--     ses demandes précédentes (même empreinte d'expéditeur : nombre, dernière date, sujets, sans texte) au dossier
--     préparé ; l'écran les montre.
--   · « Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. » — point du matin :
--     les sujets hors base deux fois ou plus sur sept jours (« ajoutez une fiche »).
--   · « Les avis obtenus après intervention sont comptés par service et par site. » — vue reput_avis_indicateurs
--     (par entité et par mois : demandés, relancés, avis reçus), security_invoker.
--
-- Règles de pose : alter … if not exists / create … if not exists / create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists avis_auto_reglement boolean not null default false;
alter table public.reput_sujets add column if not exists delai_heures integer;
alter table public.reput_demandes add column if not exists de_empreinte text;
alter table public.reput_demandes add column if not exists litige boolean not null default false;
alter table public.reput_demandes add column if not exists escaladee_le timestamptz;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_sujets_delai_check') then
    alter table public.reput_sujets add constraint reput_sujets_delai_check check (delai_heures is null or delai_heures between 1 and 720);
  end if;
end $do$;
create index if not exists reput_demandes_empreinte_idx on public.reput_demandes (client_id, de_empreinte, recu_le desc);
update public.reput_sujets s set delai_heures = case s.code when 'urgence' then 1 when 'reclamation' then 4 when 'humain' then 4 else 24 end
where s.delai_heures is null;

insert into private.abonnements (evenement, module, genre)
select 'cashd.facture_reglee', 'reput', 'reput.avis_reglement'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'cashd.facture_reglee' and a.module = 'reput' and a.genre = 'reput.avis_reglement');

-- ─────────────────────────────────────────────────────────────────────────
-- Aides
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_en_litige(p_client uuid, p_adresse text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v boolean;
begin
  if p_client is null or nullif(btrim(p_adresse), '') is null or to_regprocedure('private.cashd_contact_en_litige(uuid, text)') is null then
    return false;
  end if;
  execute 'select private.cashd_contact_en_litige($1, $2)' into v using p_client, p_adresse;
  return coalesce(v, false);
exception when others then
  return false;   -- CASHD absent ou en panne : la règle générale (validation) s'applique
end $function$;

create or replace function private.reput_historique(p_client uuid, p_empreinte text, p_sauf uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case when p_empreinte is null then jsonb_build_object('connu', false) else (
    select jsonb_build_object(
      'connu', count(*) > 0,
      'demandes', count(*),
      'derniere', max(d.recu_le),
      'repondues', count(*) filter (where d.statut = 'envoyee'),
      'sujets', coalesce(jsonb_agg(distinct d.sujet) filter (where d.sujet is not null), '[]'::jsonb))
    from public.reput_demandes d
    where d.client_id = p_client and d.de_empreinte = p_empreinte and d.id is distinct from p_sauf) end
$function$;

-- Un règlement lettré publié par CASHD → une demande d'avis, si le client l'a voulu.
create or replace function private.reput_avis_depuis_reglement(p_client uuid, p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.reput_reglages;
  v_entite uuid := nullif(p_charge ->> 'entite', '')::uuid;
  v_canal text;
  v_adresse text;
  v_regle date;
  v_r jsonb;
begin
  select * into g from public.reput_reglages r
  where r.client_id = p_client and (r.entite_id = v_entite or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or not g.avis_auto_reglement then
    return jsonb_build_object('ignore', 'demande d''avis automatique non activée');
  end if;
  if g.lien_avis is null then
    return jsonb_build_object('ignore', 'aucun lien d''avis dans les réglages');
  end if;
  if nullif(btrim(p_charge ->> 'email'), '') is not null then
    v_canal := 'email'; v_adresse := btrim(p_charge ->> 'email');
  elsif nullif(btrim(p_charge ->> 'telephone'), '') is not null then
    v_canal := 'whatsapp'; v_adresse := btrim(p_charge ->> 'telephone');
  else
    return jsonb_build_object('ignore', 'aucun contact sur le compte');
  end if;
  begin
    v_regle := least(coalesce(nullif(p_charge ->> 'regle_le', '')::date, current_date), (now() at time zone 'Europe/Paris')::date);
  exception when others then
    v_regle := (now() at time zone 'Europe/Paris')::date;
  end;
  if v_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = v_entite) then
    v_entite := null;
  end if;
  v_r := public.reput_programmer_avis(p_client, v_canal, v_adresse, left(p_charge ->> 'nom', 200),
                                      left(coalesce(p_charge ->> 'numero', p_charge ->> 'facture'), 120), v_regle, v_entite);
  return v_r || jsonb_build_object('source', 'cashd.facture_reglee', 'facture', p_charge ->> 'facture');
end $function$;

-- Le délai de traitement dépassé : une alerte au client, une fois par demande.
create or replace function private.reput_escalader(p_instant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_n integer := 0;
begin
  for x in
    select d.id, d.client_id, d.entite_id, d.de_nom, d.recu_le, d.urgence, d.statut, s.libelle,
           coalesce(case when d.urgence then 1 end, s.delai_heures, 24) as heures
    from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.statut in ('a_preparer', 'a_valider', 'a_traiter', 'bloquee') and d.escaladee_le is null
      and d.recu_le + make_interval(hours => coalesce(case when d.urgence then 1 end, s.delai_heures, 24)) <= p_instant
    order by d.recu_le limit 100
  loop
    update public.reput_demandes d set escaladee_le = p_instant, maj_le = now() where d.id = x.id;
    perform private.lever_alerte_module(x.client_id, 'reput', case when x.urgence then 'critique' else 'attention' end,
      left(format('Délai de %s h dépassé : %s (%s) attend depuis le %s', x.heures, coalesce(nullif(btrim(x.de_nom), ''), 'un client'),
                  coalesce(x.libelle, 'demande'), to_char(x.recu_le at time zone 'Europe/Paris', 'DD/MM HH24:MI')), 150),
      jsonb_build_object('demande', x.id, 'statut', x.statut, 'delai_heures', x.heures), 'delai:' || x.id::text, true, null);
    perform private.journaliser_module(x.client_id, 'reput', 'reput.delai_depasse', 'reput_demandes', x.id::text,
      jsonb_build_object('delai_heures', x.heures, 'statut', x.statut), x.entite_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

create or replace function public.reput_fixer_delai(p_client uuid, p_sujet text, p_heures integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.reput_sujets;
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les délais de traitement se fixent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_heures is null or p_heures not between 1 and 720 then
    raise exception 'Un délai de traitement va de 1 à 720 heures.' using errcode = '22023';
  end if;
  update public.reput_sujets x set delai_heures = p_heures
  where x.client_id = p_client and x.code = lower(btrim(p_sujet)) returning * into s;
  if s.id is null then
    raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
  end if;
  perform private.journaliser_module(p_client, 'reput', 'reput.delai_fixe', 'reput_sujets', s.id::text,
    jsonb_build_object('sujet', s.code, 'heures', p_heures), null);
  return to_jsonb(s);
end $function$;

-- Les sujets ajoutés plus tard reçoivent le délai par défaut (24 h).
create or replace function private.reput_delai_defaut()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if new.delai_heures is null then
    new.delai_heures := case new.code when 'urgence' then 1 when 'reclamation' then 4 when 'humain' then 4 else 24 end;
  end if;
  return new;
end $function$;
do $do$ begin
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.reput_sujets'::regclass and t.tgname = 'reput_sujets_delai_defaut') then
    create trigger reput_sujets_delai_defaut before insert on public.reput_sujets for each row execute function private.reput_delai_defaut();
  end if;
end $do$;

create or replace function public.reput_regler(p_client uuid, p_entite uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_cle text;
  v_r public.reput_reglages;
  v_langues text[];
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_reglages is null or jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Les réglages forment un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(p_reglages) loop
    if v_cle not in ('signature', 'formule_appel', 'formule_politesse', 'ton', 'mention_automatisee', 'langues', 'actif',
                     'accuse', 'texte_accuse', 'lien_avis', 'texte_avis', 'avis_auto_reglement') then
      raise exception 'Réglage inconnu : « % » (signature, formule_appel, formule_politesse, ton, mention_automatisee, langues, actif, accuse, texte_accuse, lien_avis, texte_avis, avis_auto_reglement).', v_cle
        using errcode = '22023';
    end if;
  end loop;
  perform private.reput_installer(p_client, p_entite);
  select * into v_r from public.reput_reglages r where r.client_id = p_client and r.entite_id is not distinct from p_entite for update;
  if p_reglages ? 'langues' then
    if jsonb_typeof(p_reglages -> 'langues') <> 'array' then
      raise exception 'Les langues forment une liste de codes à deux lettres (fr, en, es…).' using errcode = '22023';
    end if;
    select array_agg(lower(btrim(x)) order by o) into v_langues
    from jsonb_array_elements_text(p_reglages -> 'langues') with ordinality t(x, o);
  end if;
  update public.reput_reglages r set
    signature = case when p_reglages ? 'signature' then btrim(p_reglages ->> 'signature') else r.signature end,
    formule_appel = case when p_reglages ? 'formule_appel' then coalesce(p_reglages ->> 'formule_appel', '') else r.formule_appel end,
    formule_politesse = case when p_reglages ? 'formule_politesse' then coalesce(p_reglages ->> 'formule_politesse', '') else r.formule_politesse end,
    ton = case when p_reglages ? 'ton' then p_reglages ->> 'ton' else r.ton end,
    mention_automatisee = case when p_reglages ? 'mention_automatisee' then nullif(btrim(p_reglages ->> 'mention_automatisee'), '') else r.mention_automatisee end,
    langues = coalesce(v_langues, r.langues),
    actif = case when p_reglages ? 'actif' then (p_reglages ->> 'actif')::boolean else r.actif end,
    accuse = case when p_reglages ? 'accuse' then (p_reglages ->> 'accuse')::boolean else r.accuse end,
    texte_accuse = case when p_reglages ? 'texte_accuse' then btrim(p_reglages ->> 'texte_accuse') else r.texte_accuse end,
    lien_avis = case when p_reglages ? 'lien_avis' then nullif(btrim(p_reglages ->> 'lien_avis'), '') else r.lien_avis end,
    texte_avis = case when p_reglages ? 'texte_avis' then btrim(p_reglages ->> 'texte_avis') else r.texte_avis end,
    avis_auto_reglement = case when p_reglages ? 'avis_auto_reglement' then (p_reglages ->> 'avis_auto_reglement')::boolean else r.avis_auto_reglement end,
    maj_par = v_uid, maj_le = now()
  where r.id = v_r.id
  returning * into v_r;
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_modifies', 'reput_reglages', v_r.id::text,
    jsonb_build_object('cles', (select jsonb_agg(k order by k) from jsonb_object_keys(p_reglages) k)), p_entite);
  return to_jsonb(v_r);
end $function$;

create or replace function public.reput_commencer(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  d public.reput_demandes;
  v_base jsonb;
  v_rep jsonb;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  select * into r from public.receptions x where x.id = p_reception;
  if r.id is null then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception introuvable');
  end if;
  if r.module is distinct from 'reput' then
    return jsonb_build_object('statut', 'ignore', 'motif', format('réception du module %s', coalesce(r.module, 'aucun')));
  end if;
  if r.statut in ('ignoree', 'indesirable') then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception ' || r.statut);
  end if;
  perform private.reput_installer(r.client_id, null);
  v_base := private.reput_base(r.client_id, r.entite_id, now());
  if not coalesce((v_base -> 'reglages' ->> 'actif')::boolean, false) then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réponses désactivées dans les réglages');
  end if;
  v_rep := private.reput_canal_reponse(r);
  insert into public.reput_demandes (client_id, entite_id, reception_id, canal, canal_reponse, adresse_reponse, de_nom, objet, recu_le, langue,
                                     de_empreinte, litige)
  values (r.client_id, r.entite_id, r.id, r.canal, v_rep ->> 'canal', v_rep ->> 'adresse', left(r.de_nom, 200), left(r.sujet, 300),
          r.recu_le, case when r.langue ~ '^[a-z]{2}$' then r.langue end,
          r.de_empreinte, private.reput_en_litige(r.client_id, coalesce(v_rep ->> 'adresse', r.de_adresse)))
  on conflict (client_id, reception_id) do nothing
  returning * into d;
  if d.id is null then
    select * into d from public.reput_demandes x where x.client_id = r.client_id and x.reception_id = r.id;
    if d.statut <> 'a_preparer' then
      return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
    end if;
  else
    perform private.journaliser_module(r.client_id, 'reput', 'reput.demande_recue', 'reput_demandes', d.id::text,
      jsonb_build_object('reception', r.id, 'canal', r.canal, 'canal_reponse', d.canal_reponse), r.entite_id);
  end if;
  return jsonb_build_object(
    'statut', 'a_preparer',
    'demande', d.id,
    'client', r.client_id,
    'reception', jsonb_build_object('id', r.id, 'canal', r.canal, 'de_nom', r.de_nom, 'sujet', left(r.sujet, 300),
                                    'corps', left(coalesce(r.corps, ''), 8000), 'langue', r.langue, 'recu_le', r.recu_le,
                                    'pieces', jsonb_array_length(coalesce(r.pieces, '[]'::jsonb)),
                                    'en_reponse_a', r.en_reponse_a is not null),
    'canal_reponse', d.canal_reponse,
    -- c3_06 : le client reconnu à son adresse (ses demandes précédentes, sans leur texte) et son litige éventuel.
    'client_connu', private.reput_historique(d.client_id, d.de_empreinte, d.id),
    'litige', d.litige,
    'base', v_base);
end $function$;

create or replace function public.reput_deposer_reponse(p_demande uuid, p_resultat jsonb, p_version text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  r public.receptions;
  v_base jsonb;
  v_sujet text;
  v_autorisable boolean;
  v_langue text;
  v_langues text[];
  v_sources uuid[];
  v_couverte boolean;
  v_raison text;
  v_corps text;
  v_objet text;
  v_type text;
  v_rep public.reput_reponses;
  v_dv uuid;
  v_dv_statut text;
  v_politique uuid;
  v_envoi uuid;
  v_e public.envois;
  v_statut_rep text;
  v_statut_dem text;
  v_erreur text;
  v_libelle text;
  v_urgence boolean := coalesce((p_resultat ->> 'urgence')::boolean, false);
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  if p_resultat is null or jsonb_typeof(p_resultat) <> 'object' then
    raise exception 'Le résultat forme un objet JSON.' using errcode = '22023';
  end if;
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null then
    raise exception 'Demande REPUT introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'a_preparer' then
    return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
  end if;
  select * into r from public.receptions x where x.id = d.reception_id;
  v_base := private.reput_base(d.client_id, d.entite_id, now());

  -- Le sujet : un sujet actif de l'organisation, sinon « autre ».
  v_sujet := lower(btrim(p_resultat ->> 'sujet'));
  select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
  from public.reput_sujets s where s.client_id = d.client_id and s.code = v_sujet and s.actif;
  if v_sujet is null then
    select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
    from public.reput_sujets s where s.client_id = d.client_id and s.code = 'autre';
  end if;
  v_autorisable := coalesce(v_autorisable, false) and not (v_sujet = any (private.reput_sujets_proteges()));

  v_langue := lower(btrim(p_resultat ->> 'langue'));
  if v_langue is null or v_langue !~ '^[a-z]{2}$' then
    v_langue := coalesce(d.langue, 'fr');
  end if;
  select array_agg(x) into v_langues from jsonb_array_elements_text(coalesce(v_base -> 'reglages' -> 'langues', '["fr"]'::jsonb)) x;

  -- Les sources : seulement des fiches validées et en vigueur de cette base ; le reste est écarté.
  select coalesce(array_agg(distinct (f ->> 'id')::uuid), '{}') into v_sources
  from jsonb_array_elements(coalesce(v_base -> 'fiches', '[]'::jsonb)) f
  where jsonb_typeof(p_resultat -> 'sources') = 'array' and (p_resultat -> 'sources') ? (f ->> 'id');

  v_raison := nullif(left(btrim(p_resultat ->> 'raison'), 500), '');
  v_couverte := coalesce((p_resultat ->> 'couverte')::boolean, false);
  if v_couverte and cardinality(v_sources) = 0 then
    v_couverte := false;
    v_raison := coalesce(v_raison, 'Aucune fiche de la base citée : la réponse n''est pas sourcée.');
  end if;
  if v_couverte and not (v_langue = any (v_langues)) then
    v_couverte := false;
    v_raison := format('Langue « %s » non couverte par les réglages (%s) : transférée.', v_langue, array_to_string(v_langues, ', '));
  end if;
  if nullif(btrim(p_resultat ->> 'corps'), '') is null then
    raise exception 'Le résultat porte un corps (même un « je ne sais pas »).' using errcode = '22023';
  end if;
  -- c3_06 : un contact en litige ouvert ne reçoit jamais de réponse automatisée.
  v_type := case when v_couverte and v_autorisable and not coalesce(d.litige, false) then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
  v_corps := private.reput_assembler(v_base -> 'reglages', v_langue, p_resultat);
  v_objet := case when d.canal_reponse = 'email'
                  then left(coalesce('Re : ' || nullif(btrim(r.sujet), ''), nullif(btrim(p_resultat ->> 'objet'), ''), 'Votre demande'), 300) end;

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(p_resultat ->> 'corps'), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', v_type, 'reput_demandes', d.id::text,
            left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, v_sujet), case when v_couverte then '' else ' (hors base : à compléter)' end), 500),
            jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps),
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    if d.canal_reponse is not null then
      v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
        jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', v_langue, 'professionnel', false),
        null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:envoi:' || v_rep.id::text, d.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : à traiter par une personne.' end),
         maj_le = now()
  where x.id = v_rep.id returning * into v_rep;
  update public.reput_demandes x set statut = v_statut_dem, sujet = v_sujet, langue = v_langue, urgence = v_urgence,
         couverte = v_couverte, preparee_le = now(),
         decidee_le = case when v_statut_dem in ('validee', 'envoyee') then now() end,
         envoyee_le = case when v_statut_dem = 'envoyee' then now() end,
         motif = case when v_statut_dem in ('a_traiter', 'bloquee') then left(coalesce(v_rep.raison, v_e.motif, v_e.verrou), 500) end,
         maj_le = now()
  where x.id = d.id returning * into d;
  update public.receptions x set statut = 'lue' where x.id = r.id and x.statut = 'nouvelle';

  perform private.journaliser_module(d.client_id, 'reput', 'reput.reponse_preparee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue, 'couverte', v_couverte, 'urgence', v_urgence,
                       'sources', to_jsonb(v_sources), 'type_action', v_type, 'demande_validation', v_dv, 'politique', v_politique,
                       'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'statut', d.statut,
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur), d.entite_id);

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur);
end $function$;

create or replace function private.reput_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  x record;
  v_r jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_accuses integer := 0;
  v_avis integer := 0;
  v_erreurs integer := 0;
  v_synchro integer;
  v_avis_reglement integer := 0;
  v_escalades integer := 0;
begin
  for t in select * from private.prendre_travaux(array['reput.redeposer'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_redeposer((t.charge ->> 'reponse')::uuid);
      perform private.finir_travail(t.id, v_r);
      v_faits := v_faits + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- Les accusés de réception des demandes qui attendent (déposées depuis moins d'un jour).
  for x in select d.id, d.client_id from public.reput_demandes d
           where d.statut in ('a_valider', 'a_traiter') and d.accuse_le is null and d.canal_reponse is not null
             and d.preparee_le > now() - interval '1 day'
           order by d.recu_le limit 50 loop
    begin
      v_r := private.reput_accuser(x.id);
      if v_r ? 'envoi' then v_accuses := v_accuses + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_demandes d set accuse_le = now() where d.id = x.id;   -- jamais deux fois, jamais en boucle
      perform private.lever_alerte_module(x.client_id, 'reput', 'info', 'Un accusé de réception n''a pas pu être préparé.',
        jsonb_build_object('demande', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'accuse:' || x.id::text, false, null);
    end;
  end loop;
  -- Les demandes d'avis arrivées à échéance.
  for x in select a.id, a.client_id from public.reput_avis a
           where a.statut in ('programme', 'sollicite') and a.prochain_le <= now()
           order by a.prochain_le limit 50 loop
    begin
      v_r := private.reput_solliciter_avis(x.id);
      if v_r ? 'envoi' then v_avis := v_avis + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_avis a set statut = 'termine', motif = left('Envoi impossible : ' || sqlerrm, 300), prochain_le = null where a.id = x.id;
    end;
  end loop;
  -- c3_06 : les règlements lettrés publiés par CASHD (cashd.facture_reglee) → demande d'avis, si le client l'a voulu.
  for t in select * from private.prendre_travaux(array['reput.avis_reglement'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_avis_depuis_reglement(t.client_id, t.charge);
      perform private.finir_travail(t.id, v_r);
      if v_r ? 'avis' then v_avis_reglement := v_avis_reglement + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- c3_06 : le délai de traitement dépassé fait remonter la demande au responsable.
  v_escalades := private.reput_escalader(now());
  v_synchro := private.reput_synchroniser(null);
  begin
    perform private.battre_ouvrier('reput', array['reput.redeposer', 'reput.avis_reglement'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                         'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                            'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro);
end $function$;

create or replace function private.reput_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_debut timestamptz := (p_jour - 1)::timestamp at time zone 'Europe/Paris';
  v_fin timestamptz := p_jour::timestamp at time zone 'Europe/Paris';
  v_recues integer; v_repondues integer; v_seules integer; v_attente integer; v_traiter integer;
  v_items jsonb := '[]'::jsonb;
  r record;
  v_n integer := 0;
begin
  select count(*), count(*) filter (where d.statut = 'envoyee'),
         count(*) filter (where d.statut = 'envoyee' and exists (select 1 from public.reput_reponses p
                                                                 join public.demandes_validation v on v.id = p.demande_validation_id
                                                                 where p.demande_id = d.id and v.politique_id is not null))
    into v_recues, v_repondues, v_seules
  from public.reput_demandes d where d.client_id = p_client and d.recu_le >= v_debut and d.recu_le < v_fin;
  select count(*) filter (where d.statut in ('a_valider', 'validee')), count(*) filter (where d.statut in ('a_traiter', 'bloquee'))
    into v_attente, v_traiter
  from public.reput_demandes d where d.client_id = p_client and d.statut in ('a_valider', 'validee', 'a_traiter', 'bloquee', 'a_preparer');
  if v_recues = 0 and v_attente = 0 and v_traiter = 0 then
    return '[]'::jsonb;
  end if;
  v_items := v_items || jsonb_build_object(
    'texte', format('Hier : %s demande%s reçue%s, %s répondue%s%s. En attente de votre validation : %s. À traiter vous-même : %s.',
                    v_recues, case when v_recues > 1 then 's' else '' end, case when v_recues > 1 then 's' else '' end,
                    v_repondues, case when v_repondues > 1 then 's' else '' end,
                    case when v_seules > 0 then format(' (dont %s partie%s seule%s par accord)', v_seules,
                                                       case when v_seules > 1 then 's' else '' end, case when v_seules > 1 then 's' else '' end) else '' end,
                    v_attente, v_traiter),
    'gravite', case when v_traiter > 0 or v_attente > 0 then 'attention' else 'info' end,
    'lien', '/espace/reput');
  for r in
    select d.*, s.libelle from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.client_id = p_client and d.statut in ('a_traiter', 'bloquee', 'a_valider')
    order by d.urgence desc, (d.statut in ('a_traiter', 'bloquee')) desc, d.recu_le
  loop
    exit when v_n >= 30;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s%s — %s : %s', case when r.urgence then 'URGENT · ' else '' end,
                           coalesce(nullif(btrim(r.de_nom), ''), 'Client'), coalesce(r.libelle, 'demande'),
                           case r.statut when 'a_valider' then 'réponse prête, à valider'
                                         when 'bloquee' then 'réponse bloquée, à traiter'
                                         else 'à traiter vous-même' end), 300),
      'gravite', case when r.urgence or r.statut <> 'a_valider' then 'attention' else 'info' end,
      'lien', '/espace/reput', 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  -- c3_05 : les devis demandés qui attendent encore une réponse (la relance d'un devis demandé).
  for r in
    select d.* from public.reput_demandes d
    where d.client_id = p_client and d.sujet = 'devis' and d.statut not in ('envoyee', 'refusee', 'ignoree')
      and d.recu_le < (p_jour - 2)::timestamp at time zone 'Europe/Paris'
    order by d.recu_le
  loop
    exit when v_n >= 40;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('Devis demandé par %s il y a %s jours : toujours sans réponse, relancez votre équipe',
                           coalesce(nullif(btrim(r.de_nom), ''), 'un client'),
                           (p_jour - (r.recu_le at time zone 'Europe/Paris')::date)), 300),
      'gravite', 'attention', 'lien', '/espace/reput', 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  -- c3_06 : les sujets qui reviennent hors de la base sur sept jours nourrissent la base (« ajoutez une fiche »).
  for r in
    select coalesce(s.libelle, d.sujet) as libelle, count(*) as n
    from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.client_id = p_client and d.couverte is false and d.sujet is not null
      and d.sujet <> all (private.reput_sujets_proteges())
      and d.recu_le >= (p_jour - 7)::timestamp at time zone 'Europe/Paris'
    group by 1 having count(*) >= 2
    order by 2 desc limit 5
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s questions hors de votre base cette semaine sur « %s » : ajoutez une fiche, elles partiront tirées de la base',
                           r.n, r.libelle), 300),
      'gravite', 'info', 'lien', '/espace/reput');
  end loop;
  return v_items;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les avis comptés par site (vue security_invoker)
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.reput_avis_indicateurs with (security_invoker = true) as
select a.client_id, a.entite_id,
       date_trunc('month', coalesce(a.premier_envoi_le, a.cree_le) at time zone 'Europe/Paris')::date as mois,
       count(*) filter (where a.statut <> 'ecarte')::int as programmes,
       count(*) filter (where cardinality(a.envois) >= 1)::int as demandes,
       count(*) filter (where cardinality(a.envois) >= 2)::int as relancees,
       count(*) filter (where a.statut = 'avis_recu')::int as avis_recus
from public.reput_avis a
group by 1, 2, 3;
revoke all on public.reput_avis_indicateurs from authenticated, anon;
grant select on public.reput_avis_indicateurs to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_en_litige(uuid, text) from public, anon, authenticated;
revoke execute on function private.reput_historique(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function private.reput_avis_depuis_reglement(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.reput_escalader(timestamptz) from public, anon, authenticated;
grant execute on function private.reput_en_litige(uuid, text) to service_role;
grant execute on function private.reput_historique(uuid, text, uuid) to service_role;
grant execute on function private.reput_avis_depuis_reglement(uuid, jsonb) to service_role;
grant execute on function private.reput_escalader(timestamptz) to service_role;
revoke execute on function public.reput_fixer_delai(uuid, text, integer) from public, anon;
grant execute on function public.reput_fixer_delai(uuid, text, integer) to authenticated, service_role;
revoke execute on function private.reput_delai_defaut() from public, anon, authenticated;
grant execute on function private.reput_delai_defaut() to service_role;
