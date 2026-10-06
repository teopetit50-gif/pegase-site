-- b2_03 — Les avis de contravention : désigner le conducteur sous 45 jours (session B2, 06/10/2026, vague 3, manque n° 1).
--
-- LE BESOIN : chaque avis de contravention (radar, stationnement, péage) arrive chez le loueur, titulaire de la carte
-- grise. Son représentant légal doit désigner le conducteur dans les 45 jours suivant l'envoi de l'avis, sinon il paie
-- l'amende de non-désignation (675 €, 450 € sous 15 jours, 1 875 € majorée) en plus de l'avis. Tavaro connaît déjà la
-- plaque, les heures de départ et de retour de chaque contrat et le locataire : il retrouve le conducteur et tient le délai.
--
-- CE QUE ÇA POSE (rien n'est effacé ni remplacé dans le socle) :
--   · loc_reglages.delai_designation_jours (45 par défaut, 1 à 90) : le délai légal reste un réglage, à revérifier ;
--   · public.loc_avis_contravention : le registre des avis, lecture sous RLS (agence du contrat), aucune écriture
--     directe — tout passe par les portes ; l'identité désignée n'entre pas dans la trace (tracer en liste blanche) ;
--   · private.loc_rapprocher_avis(client, plaque, instant) : plaque + heure de l'infraction → contrat(s) en cours à
--     cette heure (départ ≤ infraction ≤ retour réel, ou retour chiffré, ou « encore dehors » si le contrat est ouvert) ;
--   · public.loc_enregistrer_avis(valeurs) : l'agence saisit l'avis reçu ; idempotent sur le numéro d'avis ;
--     rapprochement automatique ; échéance = date d'envoi + délai ; journal tavaro.avis_enregistre ;
--   · public.loc_rattacher_avis(avis, contrat) : le rapprochement à la main (plusieurs contrats, plaque mal lue) ;
--   · public.loc_designer_conducteur(avis, designation, mode, reference) : la désignation consignée (personne ou
--     société locataire), par la direction ou un valideur ; journal tavaro.conducteur_designe (sans l'identité) ;
--   · public.loc_classer_avis(avis, motif) : classer sans désignation (l'agence paie, vol déclaré, avis contesté),
--     direction seule ; journal tavaro.avis_classe ;
--   · private.loc_surveiller_avis(maintenant) + cron tavaro-avis (6 h 05 UTC) : alertes à J-10, J-3 et au dépassement.
-- Les frais de gestion d'un avis refacturés au locataire (une ligne du barème, une facture validée) viendront ensuite.

alter table public.loc_reglages add column if not exists delai_designation_jours smallint not null default 45;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_delai_designation_check') then
    alter table public.loc_reglages add constraint loc_reglages_delai_designation_check check (delai_designation_jours between 1 and 90);
  end if;
end $$;
comment on column public.loc_reglages.delai_designation_jours is 'b2_03 : jours pour désigner le conducteur après l''envoi de l''avis (45 au 06/10/2026, à revérifier)';

create table if not exists public.loc_avis_contravention (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  numero_avis text not null,
  immatriculation text not null,
  vehicule_id uuid,
  infraction_le timestamp with time zone not null,
  lieu text,
  nature text,
  montant_eur numeric(10,2),
  avis_envoye_le date not null,
  recu_le date not null,
  echeance_le date not null,
  contrat_id uuid,
  locataire_id uuid,
  rapprochement text,
  candidats smallint not null default 0,
  statut text not null default 'a_rapprocher',
  designation jsonb,
  mode_designation text,
  reference_designation text,
  designe_le timestamp with time zone,
  designe_par uuid,
  hors_delai boolean,
  motif_classement text,
  classe_le timestamp with time zone,
  classe_par uuid,
  piece_id uuid,
  source text not null default 'saisie',
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_avis_contravention_pkey primary key (id),
  constraint loc_avis_client_id_id_key unique (client_id, id),
  constraint loc_avis_numero_unique unique (client_id, numero_avis),
  constraint loc_avis_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_avis_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_avis_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_avis_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_avis_locataire_fkey foreign key (client_id, locataire_id) references public.loc_locataires(client_id, id),
  constraint loc_avis_piece_fkey foreign key (client_id, piece_id) references public.pieces(client_id, id) on delete set null (piece_id),
  constraint loc_avis_numero_check check (numero_avis ~ '^[0-9A-Z][0-9A-Z /.-]{2,39}$'),
  constraint loc_avis_immatriculation_check check (char_length(immatriculation) between 2 and 20),
  constraint loc_avis_lieu_check check (char_length(lieu) <= 200),
  constraint loc_avis_nature_check check (char_length(nature) <= 200),
  constraint loc_avis_montant_check check (montant_eur >= 0 and montant_eur <= 100000),
  constraint loc_avis_dates check (avis_envoye_le >= (infraction_le at time zone 'UTC')::date - 1 and recu_le >= avis_envoye_le and echeance_le > avis_envoye_le),
  constraint loc_avis_rapprochement_check check (rapprochement in ('auto', 'manuel')),
  constraint loc_avis_statut_check check (statut in ('a_rapprocher', 'a_designer', 'designe', 'classe')),
  constraint loc_avis_source_check check (source in ('saisie', 'lecture')),
  constraint loc_avis_mode_check check (mode_designation in ('antai_en_ligne', 'lrar')),
  constraint loc_avis_reference_check check (char_length(reference_designation) <= 80),
  constraint loc_avis_designe check (statut <> 'designe' or (designation is not null and designe_le is not null and mode_designation is not null and hors_delai is not null)),
  constraint loc_avis_classe check (statut <> 'classe' or (motif_classement is not null and classe_le is not null)),
  constraint loc_avis_a_designer check (statut <> 'a_designer' or contrat_id is not null),
  constraint loc_avis_motif_check check (char_length(motif_classement) <= 500)
);
comment on table public.loc_avis_contravention is 'b2_03 : avis de contravention reçus par le loueur, rapprochés du contrat, conducteur désigné sous le délai légal';

create index if not exists loc_avis_a_traiter on public.loc_avis_contravention (client_id, echeance_le) where statut in ('a_rapprocher', 'a_designer');
create index if not exists loc_avis_contrat on public.loc_avis_contravention (client_id, contrat_id);

alter table public.loc_avis_contravention enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_avis_contravention' and policyname = 'on voit les avis de son agence') then
    create policy "on voit les avis de son agence" on public.loc_avis_contravention for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
                       else private.voit_entite(client_id, entite_id) end));
  end if;
end $$;
revoke all on table public.loc_avis_contravention from public, anon, authenticated;
grant select on table public.loc_avis_contravention to authenticated;
grant all on table public.loc_avis_contravention to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_avis_toucher' and tgrelid = 'public.loc_avis_contravention'::regclass) then
    create trigger loc_avis_toucher before update on public.loc_avis_contravention for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_avis_tracer' and tgrelid = 'public.loc_avis_contravention'::regclass) then
    -- liste blanche : l'identité désignée (designation) ne part pas dans la trace
    create trigger loc_avis_tracer after insert or delete or update on public.loc_avis_contravention for each row
      execute function private.tracer('+numero_avis', '+immatriculation', '+infraction_le', '+avis_envoye_le', '+echeance_le', '+contrat_id',
                                      '+rapprochement', '+statut', '+mode_designation', '+reference_designation', '+designe_le', '+hors_delai', '+classe_le');
  end if;
end $$;

-- La personne connectée, son loueur (un seul) et son rôle : comme loc_publier_bareme.
CREATE OR REPLACE FUNCTION private.loc_client_de_la_personne(p_roles text[], p_refus text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_client uuid;
  v_clients integer;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select count(distinct k.client_id), min(k.client_id::text)::uuid into v_clients, v_client
  from public.comptes k where k.user_id = v_uid;
  if v_clients <> 1 then
    raise exception 'Cette personne n''appartient pas à un seul loueur.' using errcode = '22023';
  end if;
  if not private.a_un_role(v_client, p_roles) then
    raise exception '%', p_refus using errcode = '42501';
  end if;
  return v_client;
end $function$;

-- Un avis vu par la personne connectée : appartenance, rôle et périmètre (agence de l'avis ; sans agence, la direction et les valideurs).
CREATE OR REPLACE FUNCTION private.loc_avis_de_l_agence(p_avis uuid, p_roles text[], p_refus text)
 RETURNS public.loc_avis_contravention
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  a public.loc_avis_contravention;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into a from public.loc_avis_contravention where id = p_avis;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = a.client_id) then
    raise exception 'Avis introuvable.' using errcode = 'P0002';
  end if;
  if a.entite_id is null then
    if not private.a_un_role(a.client_id, array['gerant', 'admin', 'valideur']) then
      raise exception 'Cet avis n''est rattaché à aucune agence : la direction ou un valideur le traite.' using errcode = '42501';
    end if;
  elsif not private.voit_entite(a.client_id, a.entite_id) then
    raise exception 'Cet avis n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if not private.a_un_role(a.client_id, p_roles) then
    raise exception '%', p_refus using errcode = '42501';
  end if;
  return a;
end $function$;

-- Les contrats en cours à l'heure de l'infraction pour cette plaque. Le retour : celui du contrat, sinon celui du
-- retour chiffré (loc_chiffrer_retour le garde dans la proposition), sinon « encore dehors » si le contrat est ouvert,
-- sinon le retour prévu. Les contrats annulés ne comptent pas.
CREATE OR REPLACE FUNCTION private.loc_rapprocher_avis(p_client uuid, p_plaque text, p_instant timestamp with time zone)
 RETURNS TABLE(contrat_id uuid, locataire_id uuid, entite_id uuid, vehicule_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.id, c.locataire_id, c.entite_id, c.vehicule_id
  from public.loc_vehicules v
  join public.loc_contrats c on c.client_id = v.client_id and c.vehicule_id = v.id
  where v.client_id = p_client
    and v.immatriculation = (select x.plaque from private.loc_plaque(p_plaque) x)
    and c.statut <> 'annule'
    and c.depart_le <= p_instant
    and p_instant <= coalesce(
          c.retour_reel_le,
          (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p
            where p.client_id = c.client_id and p.contrat_id = c.id
              and p.statut not in ('remplacee', 'expiree') and p.entrees ? 'retour_reel_le'),
          case when c.statut = 'ouvert' then 'infinity'::timestamptz else c.retour_prevu_le end)
  order by c.depart_le desc
$function$;

-- Le cœur de l'enregistrement, appelable par une porte (personne connectée) ou plus tard par le lecteur de pièces.
CREATE OR REPLACE FUNCTION private.loc_enregistrer_avis(p_client uuid, p_valeurs jsonb, p_source text, p_par uuid, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_numero text;
  v_plaque record;
  v_instant timestamptz;
  v_envoye date;
  v_recu date;
  v_montant numeric;
  v_piece uuid;
  v_delai smallint;
  v_echeance date;
  v_vehicule uuid;
  v_vehicule_entite uuid;
  v_n integer;
  r record;
  a public.loc_avis_contravention;
  v_statut text;
  v_aujourd_hui date := (p_maintenant at time zone 'Europe/Paris')::date;
begin
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs de l''avis sont un objet.' using errcode = '22023';
  end if;
  if p_source not in ('saisie', 'lecture') then
    raise exception 'Source inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  v_numero := upper(regexp_replace(btrim(coalesce(p_valeurs ->> 'numero_avis', '')), '\s+', ' ', 'g'));
  if v_numero !~ '^[0-9A-Z][0-9A-Z /.-]{2,39}$' then
    raise exception 'Le numéro de l''avis est illisible (3 à 40 chiffres ou lettres).' using errcode = '22023';
  end if;

  -- Le même avis saisi deux fois : on rend le premier, sans rien changer.
  select * into a from public.loc_avis_contravention x where x.client_id = p_client and x.numero_avis = v_numero;
  if found then
    return jsonb_build_object('avis', a.id, 'statut', a.statut, 'deja', true, 'echeance_le', a.echeance_le, 'contrat', a.contrat_id);
  end if;

  select * into v_plaque from private.loc_plaque(p_valeurs ->> 'immatriculation');
  if v_plaque.plaque is null then
    raise exception 'L''immatriculation manque.' using errcode = '22023';
  end if;
  begin
    v_instant := (p_valeurs ->> 'infraction_le')::timestamptz;
    v_envoye := (p_valeurs ->> 'avis_envoye_le')::date;
    v_recu := coalesce((p_valeurs ->> 'recu_le')::date, v_aujourd_hui);
    v_montant := nullif(p_valeurs ->> 'montant_eur', '')::numeric;
    v_piece := nullif(p_valeurs ->> 'piece', '')::uuid;
  exception when others then
    raise exception 'Une valeur de l''avis est illisible (date, heure, montant ou pièce).' using errcode = '22023';
  end;
  if v_instant is null or (p_valeurs ->> 'infraction_le') !~ '[T ][0-9]{1,2}:[0-9]{2}' then
    raise exception 'L''heure de l''infraction manque : c''est elle qui désigne le contrat.' using errcode = '22023';
  end if;
  if v_instant > p_maintenant + interval '1 hour' then
    raise exception 'L''infraction ne peut pas être dans le futur.' using errcode = '22023';
  end if;
  if v_envoye is null then
    raise exception 'La date d''envoi de l''avis manque : le délai de désignation court à partir d''elle.' using errcode = '22023';
  end if;
  if v_envoye < (v_instant at time zone 'UTC')::date - 1 or v_envoye > v_aujourd_hui then
    raise exception 'La date d''envoi de l''avis doit suivre l''infraction et ne pas dépasser aujourd''hui.' using errcode = '22023';
  end if;
  if v_recu < v_envoye or v_recu > v_aujourd_hui then
    raise exception 'La date de réception doit suivre l''envoi et ne pas dépasser aujourd''hui.' using errcode = '22023';
  end if;
  if v_montant is not null and (v_montant < 0 or v_montant > 100000) then
    raise exception 'Le montant de l''avis est hors bornes.' using errcode = '22023';
  end if;
  if v_piece is not null and not exists (select 1 from public.pieces pc where pc.client_id = p_client and pc.id = v_piece) then
    raise exception 'La pièce jointe n''appartient pas à ce loueur.' using errcode = '23503';
  end if;

  select coalesce((select g.delai_designation_jours from public.loc_reglages g where g.client_id = p_client), 45) into v_delai;
  v_echeance := v_envoye + v_delai;

  select v.id, v.entite_id into v_vehicule, v_vehicule_entite
  from public.loc_vehicules v where v.client_id = p_client and v.immatriculation = v_plaque.plaque;

  select count(*) into v_n from private.loc_rapprocher_avis(p_client, v_plaque.plaque, v_instant);
  if v_n = 1 then
    select * into r from private.loc_rapprocher_avis(p_client, v_plaque.plaque, v_instant);
    v_statut := 'a_designer';
  else
    v_statut := 'a_rapprocher';
  end if;

  insert into public.loc_avis_contravention (client_id, entite_id, numero_avis, immatriculation, vehicule_id, infraction_le, lieu, nature,
    montant_eur, avis_envoye_le, recu_le, echeance_le, contrat_id, locataire_id, rapprochement, candidats, statut, piece_id, source, cree_par)
  values (p_client, case when v_n = 1 then r.entite_id else v_vehicule_entite end, v_numero, v_plaque.plaque, v_vehicule, v_instant,
    private.loc_lire_texte(p_valeurs, 'lieu', 200), private.loc_lire_texte(p_valeurs, 'nature', 200),
    v_montant, v_envoye, v_recu, v_echeance,
    case when v_n = 1 then r.contrat_id end, case when v_n = 1 then r.locataire_id end,
    case when v_n = 1 then 'auto' end, least(v_n, 99), v_statut, v_piece, p_source, p_par)
  returning * into a;

  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avis_enregistre', 'loc_avis_contravention', a.id::text,
    jsonb_build_object('numero_avis', a.numero_avis, 'immatriculation', a.immatriculation, 'infraction_le', a.infraction_le,
                       'echeance_le', a.echeance_le, 'statut', a.statut, 'candidats', v_n, 'contrat', a.contrat_id, 'source', p_source), a.entite_id);
  if v_n <> 1 then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Avis %s (%s) : %s. Rattachez-le au bon contrat avant le %s.', a.numero_avis, a.immatriculation,
             case when v_n = 0 then 'aucun contrat en cours à l''heure de l''infraction' else v_n || ' contrats possibles' end,
             to_char(a.echeance_le, 'DD/MM/YYYY')),
      jsonb_build_object('avis', a.id, 'numero_avis', a.numero_avis, 'candidats', v_n, 'echeance_le', a.echeance_le),
      'avis:a_rapprocher:' || a.id::text, true, null);
  end if;
  -- Un avis reçu tard : l'échéance est déjà proche ou passée, on prévient tout de suite.
  perform private.loc_alerter_avis(a, v_aujourd_hui);
  return jsonb_build_object('avis', a.id, 'statut', a.statut, 'deja', false, 'echeance_le', a.echeance_le, 'contrat', a.contrat_id, 'candidats', v_n);
end $function$;

-- Les alertes d'échéance d'un avis non traité (J-10, J-3, dépassée). Une clé par palier : levée une fois.
CREATE OR REPLACE FUNCTION private.loc_alerter_avis(a public.loc_avis_contravention, p_jour date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_reste integer;
  v_palier text;
begin
  if a.statut not in ('a_rapprocher', 'a_designer') then
    return null;
  end if;
  v_reste := a.echeance_le - p_jour;
  if v_reste < 0 then
    v_palier := 'depasse';
    perform private.lever_alerte_module(a.client_id, 'tavaro', 'critique',
      format('Avis %s (%s) : le délai de désignation est dépassé depuis le %s. L''amende de non-désignation (675 €) est encourue : désignez sans attendre ou classez avec motif.',
             a.numero_avis, a.immatriculation, to_char(a.echeance_le, 'DD/MM/YYYY')),
      jsonb_build_object('avis', a.id, 'numero_avis', a.numero_avis, 'echeance_le', a.echeance_le, 'contrat', a.contrat_id),
      'avis:depasse:' || a.id::text, true, null);
  elsif v_reste <= 3 then
    v_palier := 'j3';
    perform private.lever_alerte_module(a.client_id, 'tavaro', 'critique',
      format('Avis %s (%s) : plus que %s jour%s pour désigner le conducteur (échéance le %s).',
             a.numero_avis, a.immatriculation, v_reste, case when v_reste > 1 then 's' else '' end, to_char(a.echeance_le, 'DD/MM/YYYY')),
      jsonb_build_object('avis', a.id, 'numero_avis', a.numero_avis, 'echeance_le', a.echeance_le, 'contrat', a.contrat_id),
      'avis:j3:' || a.id::text, true, null);
  elsif v_reste <= 10 then
    v_palier := 'j10';
    perform private.lever_alerte_module(a.client_id, 'tavaro', 'attention',
      format('Avis %s (%s) : conducteur à désigner avant le %s.', a.numero_avis, a.immatriculation, to_char(a.echeance_le, 'DD/MM/YYYY')),
      jsonb_build_object('avis', a.id, 'numero_avis', a.numero_avis, 'echeance_le', a.echeance_le, 'contrat', a.contrat_id),
      'avis:j10:' || a.id::text, true, null);
  end if;
  return v_palier;
end $function$;

-- Le passage quotidien : chaque avis non traité est confronté à son échéance, au fuseau de son agence.
CREATE OR REPLACE FUNCTION private.loc_surveiller_avis(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avis_contravention;
  v_fuseau text;
  v_palier text;
  n integer := 0;
  v_client uuid;
begin
  for a in
    select x.* from public.loc_avis_contravention x
    where x.statut in ('a_rapprocher', 'a_designer') and x.echeance_le <= (p_maintenant at time zone 'UTC')::date + 11
    order by x.client_id, x.echeance_le
  loop
    begin
      select e.fuseau into v_fuseau from public.entites e where e.client_id = a.client_id and e.id = a.entite_id;
      v_palier := private.loc_alerter_avis(a, (p_maintenant at time zone coalesce(v_fuseau, 'Europe/Paris'))::date);
      if v_palier is not null then
        n := n + 1;
      end if;
      if v_client is distinct from a.client_id then
        v_client := a.client_id;
        perform private.battre(a.client_id, 'tavaro_avis', jsonb_build_object('passage', p_maintenant), interval '1 day');
      end if;
    exception when others then
      perform private.lever_alerte_module(a.client_id, 'tavaro', 'attention',
        'La surveillance d''un avis de contravention a échoué.',
        jsonb_build_object('avis', a.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'avis:surveillance_erreur:' || a.id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

-- ── Les portes ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.loc_enregistrer_avis(p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'],
                     'Votre rôle ne permet pas d''enregistrer un avis de contravention.');
begin
  return private.loc_enregistrer_avis(v_client, p_valeurs, 'saisie', (select auth.uid()), now());
end $function$;

CREATE OR REPLACE FUNCTION public.loc_rattacher_avis(p_avis uuid, p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avis_contravention := private.loc_avis_de_l_agence(p_avis, array['gerant', 'admin', 'valideur', 'collaborateur'],
                                       'Votre rôle ne permet pas de rattacher un avis.');
  c public.loc_contrats;
  v_plaque text;
begin
  if a.statut not in ('a_rapprocher', 'a_designer') then
    raise exception 'Cet avis est déjà traité (%).', a.statut using errcode = '23514';
  end if;
  select * into c from public.loc_contrats x where x.client_id = a.client_id and x.id = p_contrat;
  if not found then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Ce contrat n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if c.statut = 'annule' then
    raise exception 'Un contrat annulé ne porte pas d''avis.' using errcode = '23514';
  end if;
  select v.immatriculation into v_plaque from public.loc_vehicules v where v.client_id = c.client_id and v.id = c.vehicule_id;
  if v_plaque is distinct from a.immatriculation then
    -- une plaque mal lue sur l'avis se corrige ici, mais le journal le dit
    perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.avis_plaque_differente', 'loc_avis_contravention', a.id::text,
      jsonb_build_object('numero_avis', a.numero_avis, 'plaque_avis', a.immatriculation, 'plaque_contrat', v_plaque, 'contrat', c.numero), c.entite_id);
  end if;
  update public.loc_avis_contravention
     set contrat_id = c.id, locataire_id = c.locataire_id, entite_id = c.entite_id, vehicule_id = coalesce(c.vehicule_id, vehicule_id),
         rapprochement = 'manuel', statut = 'a_designer'
   where id = a.id;
  perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.avis_rattache', 'loc_avis_contravention', a.id::text,
    jsonb_build_object('numero_avis', a.numero_avis, 'contrat', c.numero, 'avant', a.contrat_id), c.entite_id);
  return jsonb_build_object('avis', a.id, 'statut', 'a_designer', 'contrat', c.id);
end $function$;

-- La désignation : une personne (le conducteur) ou la société locataire (qui désignera elle-même son conducteur).
-- Champs d'une personne : nom, prenom, date_naissance, lieu_naissance, adresse, permis_numero (permis_delivre_le,
-- permis_lieu facultatifs) ; d'une société : raison_sociale, siren, adresse.
CREATE OR REPLACE FUNCTION public.loc_designer_conducteur(p_avis uuid, p_designation jsonb, p_mode text, p_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avis_contravention := private.loc_avis_de_l_agence(p_avis, array['gerant', 'admin', 'valideur'],
                                       'La désignation engage le représentant légal : la direction ou un valideur la fait.');
  v_type text;
  v_d jsonb;
  v_naissance date;
  v_champ text;
  v_fuseau text;
  v_hors_delai boolean;
begin
  if a.statut not in ('a_rapprocher', 'a_designer') then
    raise exception 'Cet avis est déjà traité (%).', a.statut using errcode = '23514';
  end if;
  if jsonb_typeof(p_designation) is distinct from 'object' then
    raise exception 'La désignation est un objet.' using errcode = '22023';
  end if;
  if p_mode not in ('antai_en_ligne', 'lrar') then
    raise exception 'Mode de désignation inconnu : en ligne sur le site de l''ANTAI ou par lettre recommandée.' using errcode = '22023';
  end if;
  v_type := coalesce(p_designation ->> 'type', 'personne');
  if v_type = 'personne' then
    foreach v_champ in array array['nom', 'prenom', 'date_naissance', 'lieu_naissance', 'adresse', 'permis_numero'] loop
      if private.loc_lire_texte(p_designation, v_champ) is null then
        raise exception 'Il manque « % » pour désigner le conducteur.', replace(v_champ, '_', ' ') using errcode = '22023';
      end if;
    end loop;
    begin
      v_naissance := (p_designation ->> 'date_naissance')::date;
    exception when others then
      raise exception 'La date de naissance est illisible.' using errcode = '22023';
    end;
    if v_naissance < date '1900-01-01' or v_naissance > (now() - interval '14 years')::date then
      raise exception 'La date de naissance est hors bornes.' using errcode = '22023';
    end if;
    v_d := jsonb_strip_nulls(jsonb_build_object('type', 'personne',
      'nom', private.loc_lire_texte(p_designation, 'nom', 120), 'prenom', private.loc_lire_texte(p_designation, 'prenom', 120),
      'date_naissance', v_naissance, 'lieu_naissance', private.loc_lire_texte(p_designation, 'lieu_naissance', 120),
      'adresse', private.loc_lire_texte(p_designation, 'adresse', 500),
      'permis_numero', upper(private.loc_lire_texte(p_designation, 'permis_numero', 40)),
      'permis_delivre_le', private.loc_lire_texte(p_designation, 'permis_delivre_le', 10),
      'permis_lieu', private.loc_lire_texte(p_designation, 'permis_lieu', 120)));
  elsif v_type = 'societe' then
    foreach v_champ in array array['raison_sociale', 'siren', 'adresse'] loop
      if private.loc_lire_texte(p_designation, v_champ) is null then
        raise exception 'Il manque « % » pour désigner la société locataire.', replace(v_champ, '_', ' ') using errcode = '22023';
      end if;
    end loop;
    if regexp_replace(p_designation ->> 'siren', '\s', '', 'g') !~ '^[0-9]{9}$' then
      raise exception 'Le SIREN a neuf chiffres.' using errcode = '22023';
    end if;
    v_d := jsonb_build_object('type', 'societe', 'raison_sociale', private.loc_lire_texte(p_designation, 'raison_sociale', 200),
      'siren', regexp_replace(p_designation ->> 'siren', '\s', '', 'g'), 'adresse', private.loc_lire_texte(p_designation, 'adresse', 500));
  else
    raise exception 'On désigne une personne ou la société locataire.' using errcode = '22023';
  end if;
  if a.contrat_id is null and v_type = 'societe' then
    raise exception 'Sans contrat rattaché, on désigne une personne (le salarié qui conduisait).' using errcode = '23514';
  end if;

  select e.fuseau into v_fuseau from public.entites e where e.client_id = a.client_id and e.id = a.entite_id;
  v_hors_delai := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date > a.echeance_le;
  update public.loc_avis_contravention
     set statut = 'designe', designation = v_d, mode_designation = p_mode, reference_designation = left(nullif(btrim(p_reference), ''), 80),
         designe_le = now(), designe_par = (select auth.uid()), hors_delai = v_hors_delai
   where id = a.id;
  perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.conducteur_designe', 'loc_avis_contravention', a.id::text,
    jsonb_build_object('numero_avis', a.numero_avis, 'type', v_type, 'mode', p_mode, 'reference', left(nullif(btrim(p_reference), ''), 80),
                       'echeance_le', a.echeance_le, 'hors_delai', v_hors_delai, 'contrat', a.contrat_id), a.entite_id);
  return jsonb_build_object('avis', a.id, 'statut', 'designe', 'hors_delai', v_hors_delai);
end $function$;

CREATE OR REPLACE FUNCTION public.loc_classer_avis(p_avis uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avis_contravention := private.loc_avis_de_l_agence(p_avis, array['gerant', 'admin'],
                                       'Classer un avis sans désigner engage l''entreprise : la direction seule le fait.');
begin
  if a.statut not in ('a_rapprocher', 'a_designer') then
    raise exception 'Cet avis est déjà traité (%).', a.statut using errcode = '23514';
  end if;
  if char_length(coalesce(btrim(p_motif), '')) < 10 then
    raise exception 'Un classement a un motif (au moins dix caractères) : l''agence paie, vol déclaré, avis contesté…' using errcode = '22023';
  end if;
  update public.loc_avis_contravention
     set statut = 'classe', motif_classement = left(btrim(p_motif), 500), classe_le = now(), classe_par = (select auth.uid())
   where id = a.id;
  perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.avis_classe', 'loc_avis_contravention', a.id::text,
    jsonb_build_object('numero_avis', a.numero_avis, 'motif', left(btrim(p_motif), 500), 'echeance_le', a.echeance_le), a.entite_id);
  return jsonb_build_object('avis', a.id, 'statut', 'classe');
end $function$;

revoke all on function private.loc_client_de_la_personne(text[], text) from public, anon, authenticated;
revoke all on function private.loc_avis_de_l_agence(uuid, text[], text) from public, anon, authenticated;
revoke all on function private.loc_rapprocher_avis(uuid, text, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_enregistrer_avis(uuid, jsonb, text, uuid, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_alerter_avis(public.loc_avis_contravention, date) from public, anon, authenticated;
revoke all on function private.loc_surveiller_avis(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_enregistrer_avis(uuid, jsonb, text, uuid, timestamp with time zone) to service_role;
grant execute on function private.loc_surveiller_avis(timestamp with time zone) to service_role;

revoke all on function public.loc_enregistrer_avis(jsonb) from public, anon;
revoke all on function public.loc_rattacher_avis(uuid, uuid) from public, anon;
revoke all on function public.loc_designer_conducteur(uuid, jsonb, text, text) from public, anon;
revoke all on function public.loc_classer_avis(uuid, text) from public, anon;
grant execute on function public.loc_enregistrer_avis(jsonb) to authenticated, service_role;
grant execute on function public.loc_rattacher_avis(uuid, uuid) to authenticated, service_role;
grant execute on function public.loc_designer_conducteur(uuid, jsonb, text, text) to authenticated, service_role;
grant execute on function public.loc_classer_avis(uuid, text) to authenticated, service_role;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-avis') then
    perform cron.schedule('tavaro-avis', '5 6 * * *', 'select private.loc_surveiller_avis()');
  end if;
end $$;
