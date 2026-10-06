-- b3_14 — Les rappels aux patients : J-2 du rendez-vous, relance du plan signé sans rendez-vous, rappel du devis
-- sans réponse ; le canal choisi par chaque patient (son accord) ; ses réponses OUI / NON (vague 3, manque n° 3).
--
-- CE QUE ÇA POSE (côté module ; rien dans le socle) :
--   · table public.tiroma_contacts : le moyen de joindre un patient (courriel ou SMS), ce qu'il accepte de recevoir
--     (rappels de rendez-vous, relances de plan et de devis), et l'accord noté dans public.consentements
--     (private.noter_consentement, module tiroma). Lecture sous RLS comme la liste d'attente ; écriture par la porte.
--   · public.tiroma_noter_contact(p_client, p_entite, p_patient, p_canal, p_adresse, p_rappels, p_relances, p_source,
--     p_preuve) → uuid ; public.tiroma_retirer_contact(p_contact, p_motif) → void.
--   · six gabarits globaux, validés : tiroma.rappel_j2_{email,sms}, tiroma.relance_plan_{email,sms},
--     tiroma.rappel_devis_{email,sms} ; tous donnees_sante = true (un rendez-vous chez le dentiste révèle un soin).
--   · private.tiroma_preparer_rappels(p_maintenant) : chaque heure (cron tiroma-rappels), pour chaque cabinet dont le
--     module tiroma est réglé (reglages_envois, mode essai ou réel), prépare par private.preparer_envoi :
--       J-2      rendez-vous prévu après-demain (heure du cabinet), patient joignable qui accepte les rappels ;
--                clé tiroma:j2:<rdv>:<début> (un rendez-vous déplacé repart) ;
--       plan     plan signé sans rendez-vous depuis 21 jours ou plus, patient qui accepte les relances ; une fois
--                par tranche de 30 jours (clé tiroma:plan:<plan>:<tranche>) ;
--       devis    devis présenté depuis 10 jours ou plus, non expiré, sans réponse ; une seule fois (tiroma:devis:<plan>).
--     Tout le reste est au socle : verrous (dont la santé : SANTE_HORS_CANAL_AGREE tant qu'aucun fournisseur n'est
--     agréé), mode essai (remise à essai_adresse), validation, plages, oppositions, doublons.
--   · les réponses : abonnement reception.nouvelle → travail tiroma.reception ; private.tiroma_lire_reponse lit une
--     réponse à un rappel J-2 (lecture stricte OUI / NON de la première ligne) et la note dans
--     public.tiroma_reponses_rappels. NON : alerte au cabinet « libérez le créneau dans le logiciel » (le créneau
--     libéré arrivera au relevé suivant, et ses candidats avec). Illisible ou d'une autre adresse : alerte « à lire ».
--     Cron tiroma-reponses, chaque minute.
--   · public.tiroma_rappels(p_client, p_entite) → jsonb : réglage du module, contacts, derniers envois, réponses.
-- Profils : titulaire, assistante, collaborateur (sur ses patients). Aucune adresse dans le journal.
-- Idempotent : if not exists, create or replace, on conflict do nothing, where not exists. Aucun drop.

-- ——— Les moyens de contact ———
create table if not exists public.tiroma_contacts (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid not null,
  patient_id uuid not null,
  canal text not null check (canal in ('email', 'sms')),
  adresse text not null check (char_length(adresse) between 3 and 254),
  rappels boolean not null default true,
  relances boolean not null default false,
  source text not null check (source in ('oral', 'ecrit', 'formulaire')),
  consentement_id uuid,
  cree_le timestamp with time zone not null default clock_timestamp(),
  cree_par uuid,
  retire_le timestamp with time zone,
  motif_retrait text check (char_length(motif_retrait) <= 200),
  constraint tiroma_contacts_patient_fkey foreign key (client_id, entite_id, patient_id)
    references public.tiroma_patients (client_id, entite_id, id) on delete cascade
);
create unique index if not exists tiroma_contacts_un_ouvert on public.tiroma_contacts (client_id, entite_id, patient_id, canal) where retire_le is null;
alter table public.tiroma_contacts enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tiroma_contacts'
                 and policyname = 'tiroma : on voit les contacts des patients qu''on voit') then
    create policy "tiroma : on voit les contacts des patients qu'on voit" on public.tiroma_contacts
      for select to authenticated
      using (client_id in (select private.mes_clients()) and patient_id in (select pa.id from public.tiroma_patients pa));
  end if;
end $$;
revoke all on table public.tiroma_contacts from public, anon, authenticated;
grant select on table public.tiroma_contacts to authenticated;
grant all on table public.tiroma_contacts to service_role;

-- ——— Les réponses aux rappels ———
create table if not exists public.tiroma_reponses_rappels (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid not null,
  patient_id uuid,
  rendez_vous_id uuid,
  envoi_id uuid not null,
  reception_id bigint not null,
  reponse text not null check (reponse in ('confirme', 'annule', 'a_lire', 'autre_adresse')),
  recue_le timestamp with time zone not null default clock_timestamp(),
  constraint tiroma_reponses_une_fois unique (client_id, reception_id),
  constraint tiroma_reponses_patient_fkey foreign key (client_id, entite_id, patient_id)
    references public.tiroma_patients (client_id, entite_id, id) on delete cascade
);
alter table public.tiroma_reponses_rappels enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tiroma_reponses_rappels'
                 and policyname = 'tiroma : on voit les réponses des patients qu''on voit') then
    create policy "tiroma : on voit les réponses des patients qu'on voit" on public.tiroma_reponses_rappels
      for select to authenticated
      using (client_id in (select private.mes_clients()) and patient_id in (select pa.id from public.tiroma_patients pa));
  end if;
end $$;
revoke all on table public.tiroma_reponses_rappels from public, anon, authenticated;
grant select on table public.tiroma_reponses_rappels to authenticated;
grant all on table public.tiroma_reponses_rappels to service_role;

-- ——— Noter et retirer un moyen de contact ———
create or replace function private.tiroma_noter_contact(p_client uuid, p_entite uuid, p_patient uuid, p_canal text, p_adresse text,
  p_rappels boolean default true, p_relances boolean default false, p_source text default 'oral', p_preuve text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  pa public.tiroma_patients;
  v_adresse text;
  v_consent uuid;
  v_id uuid;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  select * into pa from public.tiroma_patients where id = p_patient and client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Patient introuvable dans ce cabinet.' using errcode = 'P0002';
  end if;
  if not rg.voit_tous and (rg.praticien_id is null or pa.praticien_habituel_id is distinct from rg.praticien_id) then
    raise exception 'Ce patient n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if pa.ne_pas_contacter then
    raise exception 'Ce patient a demandé à ne pas être contacté (logiciel du cabinet) : aucun moyen de contact ne se note.' using errcode = '22023';
  end if;
  if p_canal is null or p_canal not in ('email', 'sms') then
    raise exception 'Le canal vaut email ou sms.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('oral', 'ecrit', 'formulaire') then
    raise exception 'L''accord est oral, écrit ou par formulaire.' using errcode = '22023';
  end if;
  if not coalesce(p_rappels, false) and not coalesce(p_relances, false) then
    raise exception 'Le patient accepte au moins les rappels ou les relances ; sinon, ne notez rien.' using errcode = '22023';
  end if;
  v_adresse := private.normaliser_adresse(p_canal, p_adresse);
  if v_adresse is null then
    raise exception 'Adresse invalide pour le canal %.', p_canal using errcode = '22023';
  end if;
  -- L'accord du patient, au registre commun des consentements. Les relances (plan, devis) suivent un soin en cours :
  -- elles restent transactionnelles, mais le patient a dit oui à les recevoir, et c'est écrit.
  v_consent := private.noter_consentement(p_client, p_canal, v_adresse, p_source, 'transactionnel',
    coalesce(nullif(btrim(p_preuve), ''), case when p_source = 'oral' then 'Accord oral recueilli au cabinet (Tiroma).' end), null, 'tiroma');

  select c.id into v_id from public.tiroma_contacts c
  where c.client_id = p_client and c.entite_id = p_entite and c.patient_id = p_patient and c.canal = p_canal and c.retire_le is null
  for update;
  if v_id is not null then
    update public.tiroma_contacts set adresse = v_adresse, rappels = coalesce(p_rappels, false), relances = coalesce(p_relances, false),
                                      source = p_source, consentement_id = v_consent
     where id = v_id;
  else
    insert into public.tiroma_contacts (client_id, entite_id, patient_id, canal, adresse, rappels, relances, source, consentement_id, cree_par)
    values (p_client, p_entite, p_patient, p_canal, v_adresse, coalesce(p_rappels, false), coalesce(p_relances, false), p_source, v_consent,
            (select auth.uid()))
    returning id into v_id;
  end if;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.contact_note', 'tiroma_contacts', v_id::text,
    jsonb_build_object('patient', p_patient, 'canal', p_canal, 'rappels', coalesce(p_rappels, false), 'relances', coalesce(p_relances, false),
                       'source', p_source), p_entite);
  return v_id;
end $function$;

create or replace function private.tiroma_retirer_contact(p_contact uuid, p_motif text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.tiroma_contacts;
  rg record;
  pa public.tiroma_patients;
begin
  select * into c from public.tiroma_contacts where id = p_contact for update;
  if not found then
    raise exception 'Moyen de contact introuvable.' using errcode = 'P0002';
  end if;
  rg := private.tiroma_exiger_regard(c.client_id, c.entite_id, array['titulaire', 'collaborateur', 'assistante']);
  select * into pa from public.tiroma_patients where id = c.patient_id;
  if not rg.voit_tous and (rg.praticien_id is null or pa.praticien_habituel_id is distinct from rg.praticien_id) then
    raise exception 'Ce patient n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if c.retire_le is not null then
    return;
  end if;
  update public.tiroma_contacts set retire_le = clock_timestamp(), motif_retrait = left(nullif(btrim(p_motif), ''), 200) where id = c.id;
  perform private.journaliser_module(c.client_id, 'tiroma', 'tiroma.contact_retire', 'tiroma_contacts', c.id::text,
    jsonb_build_object('patient', c.patient_id, 'canal', c.canal), c.entite_id);
end $function$;

create or replace function public.tiroma_noter_contact(p_client uuid, p_entite uuid, p_patient uuid, p_canal text, p_adresse text,
  p_rappels boolean default true, p_relances boolean default false, p_source text default 'oral', p_preuve text default null)
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_noter_contact(p_client, p_entite, p_patient, p_canal, p_adresse, p_rappels, p_relances, p_source, p_preuve)
$function$;

create or replace function public.tiroma_retirer_contact(p_contact uuid, p_motif text default null)
 returns void
 language sql
 set search_path to ''
as $function$
  select private.tiroma_retirer_contact(p_contact, p_motif)
$function$;

-- ——— Les gabarits (globaux, validés par le serveur) ———
insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values
  (null, 'tiroma', 'tiroma.rappel_j2_email', 'fr', 1, 'email', 'Rappel de rendez-vous à J-2 (courriel)',
   'Votre rendez-vous du {{jour}} à {{heure}} — {{entite}}',
   'Bonjour,' || chr(10) || chr(10)
   || 'Nous vous rappelons votre rendez-vous au cabinet {{entite}} le {{jour}} à {{heure}}.' || chr(10) || chr(10)
   || 'Répondez OUI pour le confirmer, ou NON si vous ne pouvez pas venir : nous proposerons ce créneau à un autre patient.' || chr(10) || chr(10)
   || 'Le cabinet {{entite}}.',
   '{"jour": "date", "heure": "texte"}'::jsonb, true, true, false, 'brouillon'),
  (null, 'tiroma', 'tiroma.rappel_j2_sms', 'fr', 1, 'sms', 'Rappel de rendez-vous à J-2 (SMS)',
   null,
   'Cabinet {{entite}} : rendez-vous le {{jour}} à {{heure}}. Répondez OUI pour confirmer, NON si vous ne pouvez pas venir.',
   '{"jour": "date", "heure": "texte"}'::jsonb, true, true, false, 'brouillon'),
  (null, 'tiroma', 'tiroma.relance_plan_email', 'fr', 1, 'email', 'Relance d''un plan de traitement sans rendez-vous (courriel)',
   'Votre plan de traitement — {{entite}}',
   'Bonjour,' || chr(10) || chr(10)
   || 'Le plan de traitement que vous avez accepté le {{signe_le}} attend son prochain rendez-vous.' || chr(10)
   || 'Appelez le cabinet {{entite}} pour le fixer, ou répondez à ce message : nous vous rappellerons.' || chr(10) || chr(10)
   || 'Le cabinet {{entite}}.',
   '{"signe_le": "date"}'::jsonb, true, true, false, 'brouillon'),
  (null, 'tiroma', 'tiroma.relance_plan_sms', 'fr', 1, 'sms', 'Relance d''un plan de traitement sans rendez-vous (SMS)',
   null,
   'Cabinet {{entite}} : votre plan de traitement accepté le {{signe_le}} attend son prochain rendez-vous. Appelez-nous pour le fixer.',
   '{"signe_le": "date"}'::jsonb, true, true, false, 'brouillon'),
  (null, 'tiroma', 'tiroma.rappel_devis_email', 'fr', 1, 'email', 'Rappel d''un devis sans réponse (courriel)',
   'Votre devis du {{presente_le}} — {{entite}}',
   'Bonjour,' || chr(10) || chr(10)
   || 'Le devis que le cabinet {{entite}} vous a remis le {{presente_le}} est valable jusqu''au {{valide_jusqu_au}}.' || chr(10)
   || 'Une question, un doute sur la prise en charge ? Répondez à ce message ou appelez-nous.' || chr(10) || chr(10)
   || 'Le cabinet {{entite}}.',
   '{"presente_le": "date", "valide_jusqu_au": "date"}'::jsonb, true, true, false, 'brouillon'),
  (null, 'tiroma', 'tiroma.rappel_devis_sms', 'fr', 1, 'sms', 'Rappel d''un devis sans réponse (SMS)',
   null,
   'Cabinet {{entite}} : votre devis du {{presente_le}} est valable jusqu''au {{valide_jusqu_au}}. Une question ? Appelez-nous.',
   '{"presente_le": "date", "valide_jusqu_au": "date"}'::jsonb, true, true, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  for v_id in
    select g.id from public.gabarits_messages g
    where g.client_id is null and g.module = 'tiroma' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon'
      and g.code in ('tiroma.rappel_j2_email', 'tiroma.rappel_j2_sms', 'tiroma.relance_plan_email', 'tiroma.relance_plan_sms',
                     'tiroma.rappel_devis_email', 'tiroma.rappel_devis_sms')
  loop
    set local role service_role;
    perform public.valider_gabarit(v_id, 'B3 — recette, 06/10/2026 (rappels patients, vague 3)');
    reset role;
  end loop;
end $$;

-- ——— Préparer les rappels ———
create or replace function private.tiroma_preparer_rappels(p_maintenant timestamp with time zone default now(), p_client uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  x record;
  p jsonb;
  v_jour date;
  v_envoi uuid;
  n_j2 integer := 0;
  n_plan integer := 0;
  n_devis integer := 0;
  n_err integer := 0;
  v_jours text[] := array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
begin
  for k in
    select c.client_id, c.entite_id, coalesce(e.fuseau, 'Europe/Paris') as fuseau
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where (p_client is null or c.client_id = p_client)
      and exists (select 1 from public.reglages_envois r where r.client_id = c.client_id and r.module = 'tiroma' and r.mode in ('essai', 'reel'))
  loop
    v_jour := (p_maintenant at time zone k.fuseau)::date;

    -- 1. J-2 : les rendez-vous d'après-demain.
    for x in
      select r.id as rdv, r.debut, r.entite_id, t.patient_id, t.canal, t.adresse, pa.nom, pa.prenom
      from public.tiroma_rendez_vous r
      join public.tiroma_patients pa on pa.id = r.patient_id
      join public.tiroma_contacts t on t.client_id = r.client_id and t.entite_id = r.entite_id and t.patient_id = r.patient_id
                                    and t.retire_le is null and t.rappels
      where r.client_id = k.client_id and r.entite_id = k.entite_id and r.statut = 'prevu' and r.disparu_le is null
        and (r.debut at time zone k.fuseau)::date = v_jour + 2 and not pa.ne_pas_contacter
    loop
      begin
        v_envoi := private.preparer_envoi(k.client_id, 'tiroma', 'tiroma_rendez_vous', x.rdv::text, x.canal,
          jsonb_build_object('adresse', x.adresse, 'nom', concat_ws(' ', x.prenom, x.nom), 'ref', x.patient_id::text,
                             'professionnel', false, 'langue', 'fr'),
          'tiroma.rappel_j2_' || x.canal,
          jsonb_build_object('jour', (x.debut at time zone k.fuseau)::date,
                             'heure', to_char(x.debut at time zone k.fuseau, 'HH24"h"MI')),
          null, null, null::uuid[],
          'tiroma:j2:' || x.rdv::text || ':' || extract(epoch from x.debut)::bigint::text,
          x.entite_id, true, true, x.debut, '{}'::jsonb);
        n_j2 := n_j2 + 1;
      exception when others then
        n_err := n_err + 1;
        raise notice 'tiroma rappel J-2 % : %', x.rdv, sqlerrm;
      end;
    end loop;

    -- 2. Plans signés sans rendez-vous depuis 21 jours : une relance par tranche de 30 jours.
    for p in select value from jsonb_array_elements(coalesce(private.tiroma_plans_sans_rendez_vous_pour(k.client_id, k.entite_id, true, null), '[]'::jsonb))
    loop
      continue when coalesce((p ->> 'jours_depuis')::integer, 0) < 21 or coalesce((p ->> 'ne_pas_contacter')::boolean, false);
      for x in
        select t.canal, t.adresse, pa.nom, pa.prenom, pa.id as patient_id
        from public.tiroma_contacts t join public.tiroma_patients pa on pa.id = t.patient_id
        where t.client_id = k.client_id and t.entite_id = k.entite_id and t.patient_id = (p ->> 'patient_id')::uuid
          and t.retire_le is null and t.relances
      loop
        begin
          v_envoi := private.preparer_envoi(k.client_id, 'tiroma', 'tiroma_plans', p ->> 'plan_id', x.canal,
            jsonb_build_object('adresse', x.adresse, 'nom', concat_ws(' ', x.prenom, x.nom), 'ref', x.patient_id::text,
                               'professionnel', false, 'langue', 'fr'),
            'tiroma.relance_plan_' || x.canal,
            jsonb_build_object('signe_le', coalesce(p ->> 'signe_le', p ->> 'depuis')),
            null, null, null::uuid[],
            'tiroma:plan:' || (p ->> 'plan_id') || ':' || ((p ->> 'jours_depuis')::integer / 30)::text,
            k.entite_id, true, true, null::timestamptz, '{}'::jsonb);
          n_plan := n_plan + 1;
        exception when others then
          n_err := n_err + 1;
          raise notice 'tiroma relance plan % : %', p ->> 'plan_id', sqlerrm;
        end;
      end loop;
    end loop;

    -- 3. Devis présentés depuis 10 jours, sans réponse, non expirés : un seul rappel.
    for x in
      select pl.id as plan, pl.presente_le, pl.valide_jusqu_au, t.canal, t.adresse, pa.nom, pa.prenom, pa.id as patient_id
      from public.tiroma_plans pl
      join public.tiroma_patients pa on pa.id = pl.patient_id
      join public.tiroma_contacts t on t.client_id = pl.client_id and t.entite_id = pl.entite_id and t.patient_id = pl.patient_id
                                    and t.retire_le is null and t.relances
      where pl.client_id = k.client_id and pl.entite_id = k.entite_id and pl.statut = 'presente' and pl.disparu_le is null
        and pl.type <> 'odf' and pl.presente_le <= v_jour - 10
        and pl.valide_jusqu_au is not null and pl.valide_jusqu_au >= v_jour and not pa.ne_pas_contacter
    loop
      begin
        v_envoi := private.preparer_envoi(k.client_id, 'tiroma', 'tiroma_plans', x.plan::text, x.canal,
          jsonb_build_object('adresse', x.adresse, 'nom', concat_ws(' ', x.prenom, x.nom), 'ref', x.patient_id::text,
                             'professionnel', false, 'langue', 'fr'),
          'tiroma.rappel_devis_' || x.canal,
          jsonb_build_object('presente_le', x.presente_le, 'valide_jusqu_au', x.valide_jusqu_au),
          null, null, null::uuid[],
          'tiroma:devis:' || x.plan::text,
          k.entite_id, true, true, null::timestamptz, '{}'::jsonb);
        n_devis := n_devis + 1;
      exception when others then
        n_err := n_err + 1;
        raise notice 'tiroma rappel devis % : %', x.plan, sqlerrm;
      end;
    end loop;
  end loop;
  return jsonb_build_object('j2', n_j2, 'plans', n_plan, 'devis', n_devis, 'erreurs', n_err);
end $function$;

-- ——— Lire une réponse ———
create or replace function private.tiroma_lire_oui_non(p_texte text)
 returns text
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  l text;
  v text;
  p text;
  w1 text;
begin
  for l in select x from regexp_split_to_table(coalesce(p_texte, ''), E'\r?\n') x loop
    continue when btrim(l) = '';
    exit when l ~ '^\s*>';
    v := l;
    exit;
  end loop;
  if v is null then
    return null;
  end if;
  v := lower(v);
  v := regexp_replace(v, '[^[:alpha:][:space:]]', ' ', 'g');
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  if v = '' or char_length(v) > 60 then
    return null;
  end if;
  p := ' ' || btrim(regexp_replace(v, '(pas de (souci|soucis|probleme|problème|pb)|sans (souci|probleme|problème))', ' ', 'g')) || ' ';
  w1 := split_part(v, ' ', 1);
  if (w1 in ('oui', 'ok', 'okay', 'confirme', 'confirmé')
      or v in ('je confirme', 'c est bon', 'c est ok', 'd accord', 'entendu', 'bien reçu', 'bien recu', 'parfait', 'je serai la', 'je serai là'))
     and p !~ ' (non|pas|mais|impossible|annul[a-zé]*|empech[a-zé]*|empêch[a-zé]*|retard[a-zé]*|decal[a-zé]*|décal[a-zé]*|report[a-zé]*|plutot|plutôt|sauf|quelle|quand|ou) ' then
    return 'confirme';
  end if;
  if (w1 = 'non' and p !~ ' (oui|ok|bon|confirm[a-zé]*|viens|viendrai|serai|sera) ')
     or v ~ '^(je ne (peux|pourrai|viendrai|viens|serai) pas|impossible|pas possible|pas dispo|pas disponible|j annule|annuler|annulation)( |$)' then
    return 'annule';
  end if;
  return null;
end $function$;

create or replace function private.tiroma_lire_reponse(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  e public.envois;
  v_rdv public.tiroma_rendez_vous;
  v_fuseau text;
  v_texte text;
  v_rep text;
  v_meme boolean;
  v_quand text;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception absente');
  end if;
  if r.en_reponse_a is null then
    return jsonb_build_object('ignore', 'ne répond à aucun envoi');
  end if;
  select * into e from public.envois x
  where x.id = r.en_reponse_a and x.client_id = r.client_id and x.module = 'tiroma'
    and x.objet_type = 'tiroma_rendez_vous' and x.cle_idempotence like 'tiroma:j2:%';
  if not found then
    return jsonb_build_object('ignore', 'ne répond pas à un rappel de rendez-vous');
  end if;
  select * into v_rdv from public.tiroma_rendez_vous where client_id = r.client_id and id = e.objet_id::uuid;
  if not found then
    return jsonb_build_object('ignore', 'rendez-vous absent');
  end if;
  select coalesce(x.fuseau, 'Europe/Paris') into v_fuseau from public.entites x where x.client_id = v_rdv.client_id and x.id = v_rdv.entite_id;
  v_quand := to_char(v_rdv.debut at time zone v_fuseau, 'DD/MM "à" HH24"h"MI');

  v_texte := coalesce(nullif(btrim(r.corps), ''),
                      regexp_replace(regexp_replace(coalesce(r.corps_html, ''), '<(br|/p|/div)[^>]*>', E'\n', 'gi'), '<[^>]+>', ' ', 'g'));
  -- En réel, la réponse vient de l'adresse à laquelle on a écrit (téléphone : les neuf derniers chiffres).
  v_meme := e.mode = 'essai'
    or (e.canal = 'email' and lower(btrim(r.de_adresse)) = lower(btrim(e.destinataire_adresse)))
    or (e.canal = 'sms' and right(regexp_replace(coalesce(r.de_adresse, ''), '\D', '', 'g'), 9)
                            = right(regexp_replace(coalesce(e.destinataire_adresse, ''), '\D', '', 'g'), 9)
        and char_length(regexp_replace(coalesce(r.de_adresse, ''), '\D', '', 'g')) >= 9);
  v_rep := case when not v_meme then 'autre_adresse' else coalesce(private.tiroma_lire_oui_non(v_texte), 'a_lire') end;

  insert into public.tiroma_reponses_rappels (client_id, entite_id, patient_id, rendez_vous_id, envoi_id, reception_id, reponse)
  values (r.client_id, v_rdv.entite_id, v_rdv.patient_id, v_rdv.id, e.id, r.id, v_rep)
  on conflict (client_id, reception_id) do nothing;

  -- Les titres d'alerte ne portent aucun nom : le détail (dans l'espace) dit qui.
  if v_rep = 'annule' then
    perform private.lever_alerte_module(r.client_id, 'tiroma', 'attention',
      left(format('Un patient annonce qu''il ne viendra pas le %s : libérez le créneau dans le logiciel du cabinet.', v_quand), 200),
      jsonb_build_object('rendez_vous', v_rdv.id, 'patient', v_rdv.patient_id, 'reception', r.id, 'envoi', e.id),
      'rappel:annule:' || v_rdv.id::text, true, null);
  elsif v_rep in ('a_lire', 'autre_adresse') then
    perform private.lever_alerte_module(r.client_id, 'tiroma', 'attention',
      left(format('Réponse à lire au rappel du rendez-vous du %s.', v_quand), 200),
      jsonb_build_object('rendez_vous', v_rdv.id, 'patient', v_rdv.patient_id, 'reception', r.id, 'envoi', e.id, 'motif', v_rep),
      'rappel:a_lire:' || r.id::text, true, null);
  end if;
  begin
    if v_rep in ('confirme', 'annule') then
      update public.receptions set statut = 'traitee' where id = r.id and statut in ('nouvelle', 'lue');
    end if;
  exception when others then
    raise notice 'réception % : statut non changé (%)', r.id, sqlerrm;
  end;
  perform private.journaliser_module(r.client_id, 'tiroma', 'tiroma.reponse_rappel', 'tiroma_rendez_vous', v_rdv.id::text,
    jsonb_build_object('reponse', v_rep, 'reception', r.id, 'envoi', e.id), v_rdv.entite_id);
  return jsonb_build_object('statut', 'notee', 'reponse', v_rep, 'rendez_vous', v_rdv.id);
end $function$;

insert into private.abonnements (evenement, module, genre)
select 'reception.nouvelle', 'tiroma', 'tiroma.reception'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'reception.nouvelle' and a.module = 'tiroma' and a.genre = 'tiroma.reception');

create or replace function private.tiroma_ouvrier_reponses(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_res jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in select * from private.prendre_travaux(array['tiroma.reception'], p_nombre, interval '5 minutes', 'tiroma-reponses')
  loop
    begin
      v_res := case when (t.charge ->> 'reception') ~ '^[0-9]+$' and t.charge ->> 'en_reponse_a' is not null
                    then private.tiroma_lire_reponse((t.charge ->> 'reception')::bigint)
                    else jsonb_build_object('ignore', 'ne répond à aucun envoi') end;
      perform private.finir_travail(t.id, v_res);
      if v_res ? 'ignore' then v_ignores := v_ignores + 1; else v_faits := v_faits + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('tiroma', array['tiroma.reception'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- ——— Le tableau des rappels, pour l'écran ———
create or replace function private.tiroma_rappels_lire(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  v_reglage jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  select jsonb_build_object('mode', r.mode, 'essai', r.mode = 'essai', 'canaux', r.canaux) into v_reglage
  from public.reglages_envois r where r.client_id = p_client and r.module = 'tiroma' limit 1;
  return jsonb_build_object(
    'reglage', v_reglage,
    'contacts', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', c.id, 'patient_id', c.patient_id, 'patient_nom', private.tiroma_nom_patient(true, pa.nom, pa.prenom),
                   'canal', c.canal, 'adresse', c.adresse, 'rappels', c.rappels, 'relances', c.relances, 'source', c.source,
                   'cree_le', c.cree_le) order by pa.nom, pa.prenom, c.canal), '[]'::jsonb)
                 from public.tiroma_contacts c join public.tiroma_patients pa on pa.id = c.patient_id
                 where c.client_id = p_client and c.entite_id = p_entite and c.retire_le is null
                   and (rg.voit_tous or pa.praticien_habituel_id = rg.praticien_id)),
    'envois', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', x.id, 'type', split_part(x.cle_idempotence, ':', 2), 'canal', x.canal, 'mode', x.mode, 'statut', x.statut,
                 'verrou', x.verrou, 'cree_le', x.cree_le, 'envoye_le', x.envoye_le,
                 'patient_nom', private.tiroma_nom_patient(true, x.nom, x.prenom)) order by x.cree_le desc), '[]'::jsonb)
               from (select e.*, pa.nom, pa.prenom
                     from public.envois e
                     left join public.tiroma_rendez_vous rv on e.objet_type = 'tiroma_rendez_vous' and rv.id::text = e.objet_id
                     left join public.tiroma_plans pl on e.objet_type = 'tiroma_plans' and pl.id::text = e.objet_id
                     join public.tiroma_patients pa on pa.id = coalesce(rv.patient_id, pl.patient_id)
                     where e.client_id = p_client and e.module = 'tiroma' and e.cle_idempotence like 'tiroma:%'
                       and coalesce(rv.entite_id, pl.entite_id) = p_entite
                       and (rg.voit_tous or pa.praticien_habituel_id = rg.praticien_id)
                     order by e.cree_le desc limit 30) x),
    'reponses', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', q.id, 'reponse', q.reponse, 'recue_le', q.recue_le, 'rendez_vous_id', q.rendez_vous_id,
                   'debut', rv.debut, 'patient_nom', private.tiroma_nom_patient(true, pa.nom, pa.prenom)) order by q.recue_le desc), '[]'::jsonb)
                 from public.tiroma_reponses_rappels q
                 join public.tiroma_patients pa on pa.id = q.patient_id
                 left join public.tiroma_rendez_vous rv on rv.id = q.rendez_vous_id
                 where q.client_id = p_client and q.entite_id = p_entite and q.recue_le >= now() - interval '14 days'
                   and (rg.voit_tous or pa.praticien_habituel_id = rg.praticien_id)));
end $function$;

create or replace function public.tiroma_rappels(p_client uuid, p_entite uuid)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_rappels_lire(p_client, p_entite)
$function$;

-- ——— Droits ———
revoke all on function public.tiroma_noter_contact(uuid, uuid, uuid, text, text, boolean, boolean, text, text) from public, anon;
revoke all on function public.tiroma_retirer_contact(uuid, text) from public, anon;
revoke all on function public.tiroma_rappels(uuid, uuid) from public, anon;
grant execute on function public.tiroma_noter_contact(uuid, uuid, uuid, text, text, boolean, boolean, text, text) to authenticated, service_role;
grant execute on function public.tiroma_retirer_contact(uuid, text) to authenticated, service_role;
grant execute on function public.tiroma_rappels(uuid, uuid) to authenticated, service_role;
-- Les portes publiques sont invoker : leurs fonctions privées sont exécutables par authenticated (comme b3_07, b3_09, b3_12).
revoke all on function private.tiroma_noter_contact(uuid, uuid, uuid, text, text, boolean, boolean, text, text) from public, anon;
revoke all on function private.tiroma_retirer_contact(uuid, text) from public, anon;
revoke all on function private.tiroma_rappels_lire(uuid, uuid) from public, anon;
grant execute on function private.tiroma_noter_contact(uuid, uuid, uuid, text, text, boolean, boolean, text, text) to authenticated, service_role;
grant execute on function private.tiroma_retirer_contact(uuid, text) to authenticated, service_role;
grant execute on function private.tiroma_rappels_lire(uuid, uuid) to authenticated, service_role;
-- Le serveur seul pour le reste.
revoke all on function private.tiroma_preparer_rappels(timestamp with time zone, uuid) from public, anon, authenticated;
revoke all on function private.tiroma_lire_oui_non(text) from public, anon, authenticated;
revoke all on function private.tiroma_lire_reponse(bigint) from public, anon, authenticated;
revoke all on function private.tiroma_ouvrier_reponses(integer) from public, anon, authenticated;
grant execute on function private.tiroma_preparer_rappels(timestamp with time zone, uuid) to service_role;
grant execute on function private.tiroma_lire_oui_non(text) to service_role;
grant execute on function private.tiroma_lire_reponse(bigint) to service_role;
grant execute on function private.tiroma_ouvrier_reponses(integer) to service_role;

-- ——— Les crons ———
select cron.schedule('tiroma-rappels', '7 * * * *', $cron$select private.tiroma_preparer_rappels()$cron$)
where not exists (select 1 from cron.job where jobname = 'tiroma-rappels');
select cron.schedule('tiroma-reponses', '* * * * *', $cron$select private.tiroma_ouvrier_reponses(20)$cron$)
where not exists (select 1 from cron.job where jobname = 'tiroma-reponses');

select 'b3_14 rappels patients posé' as resultat;
