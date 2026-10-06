-- b2_05 — L'état des lieux contradictoire : départ et retour, photos, signature du locataire, caution
-- (session B2, 06/10/2026, vague 3, manque n° 3).
--
-- LE BESOIN : sans état de départ signé, une facture de dommage se conteste (« la rayure y était ») et le litige est la
-- première perte d'une agence. Les logiciels du marché vendent d'abord cela : l'état des lieux au comptoir, photos
-- horodatées, signature du locataire, empreinte de caution.
--
-- CE QUE ÇA POSE (rien n'est effacé ni retiré) :
--   · public.loc_etats_des_lieux : un état par contrat et par moment (départ, retour), brouillon puis signé ou refusé ;
--     lecture sous RLS (agence du contrat), aucune écriture directe ; un état signé ne change plus (garde) ;
--   · private.loc_zones_dommage() : les zones d'un véhicule (avant, arrière, flancs, toit, pare-brise, vitres, jantes,
--     intérieur, coffre) ;
--   · public.loc_etablir_etat(contrat, moment, valeurs) : pose ou reprend le brouillon (km, carburant ou charge, photos par
--     vue, dommages existants par zone avec photo, observations ; au départ, la caution prise) ;
--   · public.loc_signer_etat(etat, signataire, signature) : le locataire signe ; l'heure est celle du serveur et une
--     empreinte SHA-256 du contenu signé est gardée (preuve que rien n'a bougé depuis) ; journal tavaro.etat_signe ;
--   · public.loc_constater_refus(etat, motif) : le locataire refuse de signer ou n'est pas là ; au retour, les dommages
--     iront à la direction, hors barème (le socle le fait déjà quand non_contradictoire est vrai) ;
--   · public.loc_lever_caution(contrat, motif) : la caution du départ est levée ; si une facture reste due, refus
--     (« réglez d'abord par le dépôt » : loc_marquer_reglee connaît le mode « depot ») ;
--   · public.loc_chiffrer_retour, remplacée (même signature) : avant le chiffrage du socle, elle applique les états des
--     lieux : le carburant du départ signé fait foi, un retour refusé est non contradictoire, un retour signé l'est, et un
--     dommage dans une zone déjà notée au départ signé n'est pas facturé (avertissement « déjà au départ »).

create table if not exists public.loc_etats_des_lieux (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  contrat_id uuid not null,
  moment text not null,
  statut text not null default 'brouillon',
  releve_le timestamp with time zone not null default now(),
  km integer,
  carburant_8 smallint,
  charge_pct smallint,
  photos jsonb not null default '[]'::jsonb,
  dommages jsonb not null default '[]'::jsonb,
  observations text,
  caution_eur numeric(10,2),
  caution_mode text,
  caution_reference text,
  caution_statut text,
  caution_levee_le timestamp with time zone,
  caution_motif text,
  signataire_nom text,
  signature_chemin text,
  signe_le timestamp with time zone,
  empreinte text,
  refus_motif text,
  refuse_le timestamp with time zone,
  etabli_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_etats_des_lieux_pkey primary key (id),
  constraint loc_edl_client_id_id_key unique (client_id, id),
  constraint loc_edl_un_par_moment unique (client_id, contrat_id, moment),
  constraint loc_edl_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_edl_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_edl_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_edl_moment_check check (moment in ('depart', 'retour')),
  constraint loc_edl_statut_check check (statut in ('brouillon', 'signe', 'refuse')),
  constraint loc_edl_km_check check (km >= 0 and km <= 2000000),
  constraint loc_edl_carburant_check check (carburant_8 between 0 and 8),
  constraint loc_edl_charge_check check (charge_pct between 0 and 100),
  constraint loc_edl_photos_check check (jsonb_typeof(photos) = 'array'),
  constraint loc_edl_dommages_check check (jsonb_typeof(dommages) = 'array'),
  constraint loc_edl_observations_check check (char_length(observations) <= 2000),
  constraint loc_edl_caution_check check (caution_eur >= 0 and caution_eur <= 100000),
  constraint loc_edl_caution_mode_check check (caution_mode in ('empreinte_carte', 'cheque', 'especes', 'virement', 'aucune')),
  constraint loc_edl_caution_statut_check check (caution_statut in ('prise', 'levee')),
  constraint loc_edl_caution_depart check (moment = 'depart' or (caution_eur is null and caution_mode is null and caution_statut is null)),
  constraint loc_edl_signe check (statut <> 'signe' or (signataire_nom is not null and signe_le is not null and empreinte is not null)),
  constraint loc_edl_refuse check (statut <> 'refuse' or (refus_motif is not null and refuse_le is not null)),
  constraint loc_edl_textes_check check (char_length(signataire_nom) <= 200 and char_length(signature_chemin) <= 500 and char_length(refus_motif) <= 500
                                         and char_length(caution_reference) <= 80 and char_length(caution_motif) <= 500)
);
comment on table public.loc_etats_des_lieux is 'b2_05 : états des lieux de départ et de retour, signés par le locataire (empreinte SHA-256 du contenu signé)';

alter table public.loc_etats_des_lieux enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_etats_des_lieux' and policyname = 'on voit les etats des lieux de son agence') then
    create policy "on voit les etats des lieux de son agence" on public.loc_etats_des_lieux for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on table public.loc_etats_des_lieux from public, anon, authenticated;
grant select on table public.loc_etats_des_lieux to authenticated;
grant all on table public.loc_etats_des_lieux to service_role;

-- Un état signé ou refusé ne change plus, sauf le suivi de la caution (levée).
CREATE OR REPLACE FUNCTION private.loc_garder_etat()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    if old.statut <> 'brouillon' then
      raise exception 'Un état des lieux signé ou refusé ne s''efface pas.' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.statut <> 'brouillon'
     and (to_jsonb(new) - array['caution_statut', 'caution_levee_le', 'caution_motif', 'maj_le'])
         is distinct from (to_jsonb(old) - array['caution_statut', 'caution_levee_le', 'caution_motif', 'maj_le']) then
    raise exception 'Un état des lieux signé ou refusé ne change plus : seul le suivi de la caution avance.' using errcode = '42501';
  end if;
  return new;
end $function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_edl_garder' and tgrelid = 'public.loc_etats_des_lieux'::regclass) then
    create trigger loc_edl_garder before update or delete on public.loc_etats_des_lieux for each row execute function private.loc_garder_etat();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_edl_toucher' and tgrelid = 'public.loc_etats_des_lieux'::regclass) then
    create trigger loc_edl_toucher before update on public.loc_etats_des_lieux for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_edl_tracer' and tgrelid = 'public.loc_etats_des_lieux'::regclass) then
    create trigger loc_edl_tracer after insert or delete or update on public.loc_etats_des_lieux for each row
      execute function private.tracer('+contrat_id', '+moment', '+statut', '+km', '+carburant_8', '+charge_pct', '+caution_eur', '+caution_statut',
                                      '+signe_le', '+empreinte', '+refuse_le');
  end if;
end $$;

CREATE OR REPLACE FUNCTION private.loc_zones_dommage()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select array['avant', 'arriere', 'flanc_gauche', 'flanc_droit', 'toit', 'pare_brise', 'vitres', 'jantes', 'interieur', 'coffre']
$function$;

-- Le contrat vu par la personne connectée, pour un geste de comptoir (comme loc_chiffrer_retour_agence).
CREATE OR REPLACE FUNCTION private.loc_contrat_au_comptoir(p_contrat uuid)
 RETURNS public.loc_contrats
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not (private.voit_entite(c.client_id, c.entite_id)
             or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Ce contrat n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  return c;
end $function$;

-- Les photos et les dommages d'un état, relus et bornés : chaque photo a un chemin ; chaque dommage une zone connue,
-- une description et au moins une photo.
CREATE OR REPLACE FUNCTION private.loc_lire_constat(p_valeurs jsonb, OUT photos jsonb, OUT dommages jsonb)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  x jsonb;
  p jsonb;
  v_preuves jsonb;
begin
  photos := '[]'::jsonb;
  dommages := '[]'::jsonb;
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_valeurs -> 'photos') = 'array' then p_valeurs -> 'photos' else '[]'::jsonb end) loop
    if nullif(btrim(x ->> 'chemin'), '') is null then
      raise exception 'Une photo de l''état des lieux n''a pas de chemin.' using errcode = '22023';
    end if;
    photos := photos || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('vue', left(x ->> 'vue', 40), 'chemin', left(x ->> 'chemin', 500), 'prise_le', left(x ->> 'prise_le', 40))));
  end loop;
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_valeurs -> 'dommages') = 'array' then p_valeurs -> 'dommages' else '[]'::jsonb end) loop
    if not (x ->> 'zone' = any (private.loc_zones_dommage())) then
      raise exception 'Zone de dommage inconnue : %.', coalesce(x ->> 'zone', 'vide') using errcode = '22023';
    end if;
    if nullif(btrim(x ->> 'description'), '') is null then
      raise exception 'Un dommage noté a une description.' using errcode = '22023';
    end if;
    v_preuves := '[]'::jsonb;
    for p in select * from jsonb_array_elements(case when jsonb_typeof(x -> 'preuves') = 'array' then x -> 'preuves' else '[]'::jsonb end) loop
      if nullif(btrim(p ->> 'chemin'), '') is not null then
        v_preuves := v_preuves || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('chemin', left(p ->> 'chemin', 500), 'prise_le', left(p ->> 'prise_le', 40))));
      end if;
    end loop;
    if jsonb_array_length(v_preuves) = 0 then
      raise exception 'Le dommage « % » n''a pas de photo : sans photo, il ne protège personne.', left(x ->> 'description', 60) using errcode = '22023';
    end if;
    dommages := dommages || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('zone', x ->> 'zone', 'code', nullif(upper(btrim(x ->> 'code')), ''),
                                                                                    'description', left(btrim(x ->> 'description'), 300), 'preuves', v_preuves)));
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.loc_etablir_etat(p_contrat uuid, p_moment text, p_valeurs jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats := private.loc_contrat_au_comptoir(p_contrat);
  e public.loc_etats_des_lieux;
  k record;
  v_km integer;
  v_c8 integer;
  v_charge integer;
  v_caution numeric;
  v_mode text;
  v_id uuid;
begin
  if p_moment not in ('depart', 'retour') then
    raise exception 'Un état des lieux est de départ ou de retour.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs de l''état des lieux sont un objet.' using errcode = '22023';
  end if;
  if c.statut = 'annule' then
    raise exception 'Ce contrat est annulé.' using errcode = '23514';
  end if;
  select * into e from public.loc_etats_des_lieux x where x.client_id = c.client_id and x.contrat_id = c.id and x.moment = p_moment;
  if found and e.statut <> 'brouillon' then
    raise exception 'L''état des lieux de % est déjà %.', case p_moment when 'depart' then 'départ' else 'retour' end,
      case e.statut when 'signe' then 'signé' else 'clos sur un refus de signer' end using errcode = '23514';
  end if;
  begin
    v_km := nullif(p_valeurs ->> 'km', '')::integer;
    v_c8 := nullif(p_valeurs ->> 'carburant_8', '')::integer;
    v_charge := nullif(p_valeurs ->> 'charge_pct', '')::integer;
    v_caution := nullif(p_valeurs ->> 'caution_eur', '')::numeric;
  exception when others then
    raise exception 'Une valeur de l''état des lieux est illisible (kilométrage, carburant, charge ou caution).' using errcode = '22023';
  end;
  if v_km is not null and c.km_depart is not null and p_moment = 'retour' and v_km < c.km_depart then
    raise exception 'Le compteur au retour (%) est sous celui du départ (%).', v_km, c.km_depart using errcode = '22023';
  end if;
  v_mode := nullif(p_valeurs ->> 'caution_mode', '');
  if p_moment = 'retour' and (v_caution is not null or v_mode is not null) then
    raise exception 'La caution se prend au départ.' using errcode = '22023';
  end if;
  select * into k from private.loc_lire_constat(p_valeurs);

  if e.id is null then
    insert into public.loc_etats_des_lieux (client_id, entite_id, contrat_id, moment, releve_le, km, carburant_8, charge_pct, photos, dommages, observations,
                                           caution_eur, caution_mode, caution_reference, caution_statut, etabli_par)
    values (c.client_id, case when p_moment = 'retour' then coalesce(c.entite_retour_id, c.entite_id) else c.entite_id end, c.id, p_moment, now(),
            v_km, v_c8, v_charge, k.photos, k.dommages, private.loc_lire_texte(p_valeurs, 'observations', 2000),
            v_caution, v_mode, private.loc_lire_texte(p_valeurs, 'caution_reference', 80),
            case when v_caution > 0 and v_mode is distinct from 'aucune' then 'prise' end, (select auth.uid()))
    returning id into v_id;
  else
    update public.loc_etats_des_lieux
       set releve_le = now(), km = v_km, carburant_8 = v_c8, charge_pct = v_charge, photos = k.photos, dommages = k.dommages,
           observations = private.loc_lire_texte(p_valeurs, 'observations', 2000),
           caution_eur = v_caution, caution_mode = v_mode, caution_reference = private.loc_lire_texte(p_valeurs, 'caution_reference', 80),
           caution_statut = case when v_caution > 0 and v_mode is distinct from 'aucune' then 'prise' end, etabli_par = (select auth.uid())
     where id = e.id
    returning id into v_id;
  end if;
  return v_id;
end $function$;

-- Le contenu signé, toujours sérialisé de la même façon : l'empreinte se recalcule pour prouver que rien n'a bougé.
CREATE OR REPLACE FUNCTION private.loc_contenu_signe(e public.loc_etats_des_lieux, p_signataire text, p_signe_le timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('contrat', e.contrat_id, 'moment', e.moment, 'releve_le', e.releve_le, 'km', e.km, 'carburant_8', e.carburant_8,
                            'charge_pct', e.charge_pct, 'photos', e.photos, 'dommages', e.dommages, 'observations', e.observations,
                            'caution_eur', e.caution_eur, 'caution_mode', e.caution_mode, 'caution_reference', e.caution_reference,
                            'signataire', p_signataire, 'signature', e.signature_chemin, 'signe_le', p_signe_le)::text
$function$;

CREATE OR REPLACE FUNCTION public.loc_signer_etat(p_etat uuid, p_signataire text, p_signature text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.loc_etats_des_lieux;
  c public.loc_contrats;
  v_vues text[];
  v_manque text[];
  v_signe_le timestamptz := now();
  v_nom text := left(nullif(btrim(p_signataire), ''), 200);
  v_empreinte text;
begin
  select * into e from public.loc_etats_des_lieux where id = p_etat for update;
  if not found then
    raise exception 'État des lieux introuvable.' using errcode = 'P0002';
  end if;
  c := private.loc_contrat_au_comptoir(e.contrat_id);
  if e.statut <> 'brouillon' then
    raise exception 'Cet état des lieux est déjà clos.' using errcode = '23514';
  end if;
  if v_nom is null then
    raise exception 'Le nom de la personne qui signe est obligatoire.' using errcode = '22023';
  end if;
  if e.km is null then
    raise exception 'Le kilométrage manque : il ne se signe pas sans.' using errcode = '22023';
  end if;
  if e.carburant_8 is null and e.charge_pct is null then
    raise exception 'Le niveau de carburant (ou la charge) manque.' using errcode = '22023';
  end if;
  -- Quatre vues au moins : l'avant, l'arrière et les deux flancs.
  select coalesce(array_agg(distinct p ->> 'vue'), '{}') into v_vues from jsonb_array_elements(e.photos) p;
  select coalesce(array_agg(z), '{}') into v_manque from unnest(array['avant', 'arriere', 'flanc_gauche', 'flanc_droit']) z where not (z = any (v_vues));
  if cardinality(v_manque) > 0 then
    raise exception 'Il manque des photos du véhicule : %.', array_to_string(v_manque, ', ') using errcode = '22023';
  end if;

  update public.loc_etats_des_lieux set signature_chemin = left(nullif(btrim(p_signature), ''), 500) where id = e.id returning * into e;
  v_empreinte := encode(sha256(convert_to(private.loc_contenu_signe(e, v_nom, v_signe_le), 'UTF8')), 'hex');
  update public.loc_etats_des_lieux set statut = 'signe', signataire_nom = v_nom, signe_le = v_signe_le, empreinte = v_empreinte where id = e.id;
  perform private.journaliser_module(e.client_id, 'tavaro', 'tavaro.etat_signe', 'loc_etats_des_lieux', e.id::text,
    jsonb_build_object('contrat', c.numero, 'moment', e.moment, 'km', e.km, 'carburant_8', e.carburant_8, 'dommages', jsonb_array_length(e.dommages),
                       'photos', jsonb_array_length(e.photos), 'caution_eur', e.caution_eur, 'empreinte', v_empreinte), e.entite_id);
  return jsonb_build_object('etat', e.id, 'statut', 'signe', 'signe_le', v_signe_le, 'empreinte', v_empreinte);
end $function$;

CREATE OR REPLACE FUNCTION public.loc_constater_refus(p_etat uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.loc_etats_des_lieux;
  c public.loc_contrats;
begin
  select * into e from public.loc_etats_des_lieux where id = p_etat for update;
  if not found then
    raise exception 'État des lieux introuvable.' using errcode = 'P0002';
  end if;
  c := private.loc_contrat_au_comptoir(e.contrat_id);
  if e.statut <> 'brouillon' then
    raise exception 'Cet état des lieux est déjà clos.' using errcode = '23514';
  end if;
  if char_length(coalesce(btrim(p_motif), '')) < 5 then
    raise exception 'Dites pourquoi il n''est pas signé : client absent (boîte à clés), refus de signer…' using errcode = '22023';
  end if;
  if jsonb_array_length(e.photos) = 0 then
    raise exception 'Sans signature, les photos sont la seule preuve : prenez-en avant de clore.' using errcode = '22023';
  end if;
  update public.loc_etats_des_lieux set statut = 'refuse', refus_motif = left(btrim(p_motif), 500), refuse_le = now() where id = e.id;
  perform private.journaliser_module(e.client_id, 'tavaro', 'tavaro.etat_non_signe', 'loc_etats_des_lieux', e.id::text,
    jsonb_build_object('contrat', c.numero, 'moment', e.moment, 'motif', left(btrim(p_motif), 500), 'photos', jsonb_array_length(e.photos)), e.entite_id);
  return jsonb_build_object('etat', e.id, 'statut', 'refuse');
end $function$;

CREATE OR REPLACE FUNCTION public.loc_lever_caution(p_contrat uuid, p_motif text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats := private.loc_contrat_au_comptoir(p_contrat);
  e public.loc_etats_des_lieux;
  v_du numeric;
begin
  select * into e from public.loc_etats_des_lieux x where x.client_id = c.client_id and x.contrat_id = c.id and x.moment = 'depart' for update;
  if not found or e.caution_statut is distinct from 'prise' then
    raise exception 'Aucune caution prise sur ce contrat.' using errcode = '23514';
  end if;
  select coalesce(sum(f.total_ttc - coalesce((select sum(a.montant_ttc) from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'emis'), 0)), 0)
    into v_du
  from public.loc_factures f where f.client_id = c.client_id and f.contrat_id = c.id and f.statut in ('emise', 'envoyee', 'litige');
  if v_du > 0 then
    raise exception 'Il reste % dus sur ce contrat : réglez d''abord la facture (mode « dépôt » si la caution la paie), puis levez la caution.', private.loc_eur(v_du) using errcode = '23514';
  end if;
  if exists (select 1 from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut in ('calculee', 'preuve_manquante', 'a_valider', 'validee')) then
    raise exception 'Le retour est en cours de facturation : la caution attend la facture.' using errcode = '23514';
  end if;
  update public.loc_etats_des_lieux set caution_statut = 'levee', caution_levee_le = now(), caution_motif = left(nullif(btrim(p_motif), ''), 500) where id = e.id;
  perform private.journaliser_module(c.client_id, 'tavaro', 'tavaro.caution_levee', 'loc_etats_des_lieux', e.id::text,
    jsonb_build_object('contrat', c.numero, 'caution_eur', e.caution_eur, 'mode', e.caution_mode, 'motif', left(nullif(btrim(p_motif), ''), 500)), c.entite_id);
  return jsonb_build_object('etat', e.id, 'caution_statut', 'levee');
end $function$;

-- Le chiffrage du retour, appuyé sur les états des lieux. Même signature que la porte du socle, qu'elle remplace :
-- les valeurs constatées et signées priment sur celles saisies au moment du chiffrage.
CREATE OR REPLACE FUNCTION private.loc_appliquer_etats(p_client uuid, p_contrat uuid, p_retour jsonb, OUT retour jsonb, OUT avertissements jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  dep public.loc_etats_des_lieux;
  ret public.loc_etats_des_lieux;
  d jsonb;
  v_garde jsonb := '[]'::jsonb;
  v_zone text;
  v_code text;
begin
  retour := p_retour;
  avertissements := '[]'::jsonb;
  select * into dep from public.loc_etats_des_lieux x where x.client_id = p_client and x.contrat_id = p_contrat and x.moment = 'depart';
  select * into ret from public.loc_etats_des_lieux x where x.client_id = p_client and x.contrat_id = p_contrat and x.moment = 'retour';

  if dep.statut = 'signe' and dep.carburant_8 is not null then
    if (retour ->> 'carburant_depart_8') is distinct from dep.carburant_8::text then
      avertissements := avertissements || jsonb_build_object('poste', 'carburant', 'code', 'carburant_depart_signe', 'bloquant', false,
        'detail', format('Le carburant au départ est celui de l''état des lieux signé : %s/8.', dep.carburant_8));
    end if;
    retour := jsonb_set(retour, '{carburant_depart_8}', to_jsonb(dep.carburant_8));
  end if;
  if ret.statut = 'signe' then
    retour := jsonb_set(retour, '{non_contradictoire}', 'false'::jsonb);
    if ret.km is not null and nullif(retour ->> 'km_retour', '') is null then
      retour := jsonb_set(retour, '{km_retour}', to_jsonb(ret.km));
    end if;
    if ret.carburant_8 is not null and nullif(retour ->> 'carburant_retour_8', '') is null then
      retour := jsonb_set(retour, '{carburant_retour_8}', to_jsonb(ret.carburant_8));
    end if;
  elsif ret.statut = 'refuse' then
    retour := jsonb_set(retour, '{non_contradictoire}', 'true'::jsonb);
    avertissements := avertissements || jsonb_build_object('poste', 'dommages', 'code', 'retour_non_signe', 'bloquant', false,
      'detail', 'L''état des lieux de retour n''est pas signé : ' || ret.refus_motif);
  end if;

  -- Un dommage dans une zone déjà notée au départ signé (et du même code si les deux en ont un) ne se facture pas.
  if dep.statut = 'signe' and jsonb_typeof(retour -> 'dommages') = 'array' then
    for d in select * from jsonb_array_elements(retour -> 'dommages') loop
      v_zone := d ->> 'zone';
      v_code := upper(btrim(d ->> 'code'));
      if v_zone is not null and exists (
           select 1 from jsonb_array_elements(dep.dommages) x
           where x ->> 'zone' = v_zone and (x ->> 'code' is null or v_code is null or x ->> 'code' = v_code)) then
        avertissements := avertissements || jsonb_build_object('poste', coalesce(v_code, 'dommage'), 'code', 'deja_au_depart', 'bloquant', false,
          'detail', format('Zone « %s » déjà notée sur l''état de départ signé le %s : pas facturée.', replace(v_zone, '_', ' '),
                           to_char(dep.signe_le at time zone 'Europe/Paris', 'DD/MM/YYYY')));
      else
        v_garde := v_garde || jsonb_build_array(d);
      end if;
    end loop;
    retour := jsonb_set(retour, '{dommages}', v_garde);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.loc_chiffrer_retour(p_contrat uuid, p_retour jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats := private.loc_contrat_au_comptoir(p_contrat);
  k record;
  v_prop uuid;
begin
  if p_retour is null or jsonb_typeof(p_retour) <> 'object' then
    raise exception 'Les valeurs du retour sont illisibles.' using errcode = '22023';
  end if;
  select * into k from private.loc_appliquer_etats(c.client_id, c.id, p_retour);
  v_prop := private.loc_chiffrer_retour_agence(p_contrat, k.retour);
  if jsonb_array_length(k.avertissements) > 0 then
    update public.loc_propositions set avertissements = coalesce(avertissements, '[]'::jsonb) || k.avertissements where id = v_prop;
  end if;
  return v_prop;
end $function$;

revoke all on function private.loc_garder_etat() from public, anon, authenticated;
revoke all on function private.loc_contrat_au_comptoir(uuid) from public, anon, authenticated;
revoke all on function private.loc_lire_constat(jsonb) from public, anon, authenticated;
revoke all on function private.loc_contenu_signe(public.loc_etats_des_lieux, text, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_appliquer_etats(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_etablir_etat(uuid, text, jsonb) from public, anon;
revoke all on function public.loc_signer_etat(uuid, text, text) from public, anon;
revoke all on function public.loc_constater_refus(uuid, text) from public, anon;
revoke all on function public.loc_lever_caution(uuid, text) from public, anon;
revoke all on function public.loc_chiffrer_retour(uuid, jsonb) from public, anon;
-- (b2_05b) la porte est maintenant definer : la fonction privée qu'elle appelle n'a plus à être exécutable par authenticated
revoke all on function private.loc_chiffrer_retour_agence(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.loc_chiffrer_retour_agence(uuid, jsonb) to service_role;
grant execute on function public.loc_etablir_etat(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.loc_signer_etat(uuid, text, text) to authenticated, service_role;
grant execute on function public.loc_constater_refus(uuid, text) to authenticated, service_role;
grant execute on function public.loc_lever_caution(uuid, text) to authenticated, service_role;
grant execute on function public.loc_chiffrer_retour(uuid, jsonb) to authenticated, service_role;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_etats_des_lieux') then
    alter publication supabase_realtime add table public.loc_etats_des_lieux;
  end if;
end $$;
