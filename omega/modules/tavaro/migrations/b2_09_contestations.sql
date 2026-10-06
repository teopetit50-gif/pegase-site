-- b2_09 — Les contestations bancaires : le dossier qui tient devant la banque (audit des promesses, § 2 Tavaro, point 3,
-- module 17 ; session B2, 06/10/2026). La promesse (components/secteurs/location/textes.ts) : « Quand un client conteste
-- auprès de sa banque le débit des dommages, le dossier part en un clic : état des lieux signé, photos datées, barème
-- appliqué et contrat. »
--
-- LE BESOIN : le locataire conteste auprès de sa banque le débit d'une facture (dommages, frais). La banque du loueur
-- (l'acquéreur, ou le prestataire de paiement) le lui notifie avec une référence, un motif et un délai court pour répondre
-- (7 à 10 jours chez la plupart des prestataires : le délai est un réglage, 7 par défaut, et chaque contestation porte sa
-- date limite). Sans dossier dans le délai, le débit est perdu. Tavaro a déjà tout : contrat, états des lieux signés
-- (empreinte SHA-256), photos datées, barème publié, facture validée par une autre personne que celle qui l'a saisie,
-- courriel d'envoi. Il le rassemble en un PDF et l'envoie.
--
-- LE CHEMIN :
--   1. l'agence ouvre la contestation sur la facture (public.loc_ouvrir_contestation) : référence de la banque, motif,
--      montant, date de réception, date limite ; Tavaro dit tout de suite ce qui rendra le dossier fort ou faible
--      (private.loc_forces_contestation) et dépose le travail tavaro.dossier_contestation ;
--   2. l'ouvrier tavaro-pdf lit le dossier (public.loc_dossier_a_produire), compose le PDF (lettre de réponse, contrat,
--      états des lieux départ et retour avec photos datées et signatures, barème appliqué, facture, décision et envoi),
--      le dépose sous <client>/loc_contestations/<id>/ et l'enregistre (public.loc_enregistrer_dossier) : statut
--      « dossier_pret » ; au dernier essai, public.loc_dossier_impossible prévient l'agence ;
--   3. un clic (public.loc_envoyer_dossier) : le courriel part à l'adresse de la banque avec le dossier, le PDF de la
--      facture et le contrat scanné s'il existe (dix pièces, 15 Mo : règles du socle), par le chemin de tout envoi —
--      validation comprise ; statut « envoyee » ;
--   4. l'issue (public.loc_issue_contestation) : gagnée, perdue, abandonnée — par la direction ou un valideur ;
--   5. private.loc_surveiller_contestations + cron tavaro-contestations (6 h 10 UTC) : alerte à J-2, le jour même et au
--      dépassement pour tout dossier pas encore envoyé.
-- Rien n'est effacé ; aucune contrainte du socle retirée ; la facture n'est pas touchée (elle garde son statut).

alter table public.loc_reglages add column if not exists contestation_delai_jours smallint not null default 7;
alter table public.loc_reglages add column if not exists contestation_adresse text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_contestation_delai_check') then
    alter table public.loc_reglages add constraint loc_reglages_contestation_delai_check check (contestation_delai_jours between 1 and 45);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_contestation_adresse_check') then
    alter table public.loc_reglages add constraint loc_reglages_contestation_adresse_check
      check (contestation_adresse ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contestation_adresse) <= 320);
  end if;
end $$;
comment on column public.loc_reglages.contestation_delai_jours is 'b2_09 : jours laissés par la banque pour répondre à une contestation (7 par défaut ; chaque contestation porte sa date)';
comment on column public.loc_reglages.contestation_adresse is 'b2_09 : adresse du service des contestations de la banque ou du prestataire de paiement';

create table if not exists public.loc_contestations (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  facture_id uuid not null,
  contrat_id uuid not null,
  reference_banque text not null,
  motif_banque text not null,
  montant_eur numeric(12,2) not null,
  recue_le date not null,
  repondre_avant date not null,
  adresse_banque text,
  statut text not null default 'ouverte',
  forces jsonb not null default '[]'::jsonb,
  dossier_piece_id uuid,
  dossier_sha256 text,
  dossier_pages integer,
  dossier_le timestamp with time zone,
  envoi_id uuid,
  envoyee_le timestamp with time zone,
  envoyee_par uuid,
  issue_le timestamp with time zone,
  issue_par uuid,
  issue_note text,
  notes text,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_contestations_pkey primary key (id),
  constraint loc_contestations_client_id_id_key unique (client_id, id),
  constraint loc_contestations_une_fois unique (client_id, facture_id, reference_banque),
  constraint loc_contestations_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_contestations_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_contestations_facture_fkey foreign key (client_id, facture_id) references public.loc_factures(client_id, id),
  constraint loc_contestations_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_contestations_piece_fkey foreign key (client_id, dossier_piece_id) references public.pieces(client_id, id) on delete set null (dossier_piece_id),
  constraint loc_contestations_reference_check check (char_length(reference_banque) between 1 and 80),
  constraint loc_contestations_motif_check check (char_length(motif_banque) between 1 and 300),
  constraint loc_contestations_montant_check check (montant_eur > 0 and montant_eur <= 1000000),
  constraint loc_contestations_dates check (repondre_avant >= recue_le),
  constraint loc_contestations_adresse_check check (adresse_banque ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(adresse_banque) <= 320),
  constraint loc_contestations_statut_check check (statut in ('ouverte', 'dossier_pret', 'envoyee', 'gagnee', 'perdue', 'abandonnee')),
  constraint loc_contestations_forces_check check (jsonb_typeof(forces) = 'array'),
  constraint loc_contestations_sha_check check (dossier_sha256 ~ '^[0-9a-f]{64}$'),
  constraint loc_contestations_dossier check (statut in ('ouverte', 'abandonnee') or statut in ('gagnee', 'perdue') or dossier_piece_id is not null),
  constraint loc_contestations_envoyee check (statut <> 'envoyee' or (envoi_id is not null and envoyee_le is not null)),
  constraint loc_contestations_issue check ((statut in ('gagnee', 'perdue', 'abandonnee')) = (issue_le is not null)),
  constraint loc_contestations_textes_check check (char_length(issue_note) <= 1000 and char_length(notes) <= 2000)
);
comment on table public.loc_contestations is 'b2_09 : contestations bancaires d''une facture (rétrofacturation) et le dossier de réponse envoyé à la banque';

create index if not exists loc_contestations_a_suivre on public.loc_contestations (client_id, repondre_avant) where statut in ('ouverte', 'dossier_pret');
create index if not exists loc_contestations_facture on public.loc_contestations (client_id, facture_id);

alter table public.loc_contestations enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_contestations' and policyname = 'on voit les contestations de son agence') then
    create policy "on voit les contestations de son agence" on public.loc_contestations for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on table public.loc_contestations from public, anon, authenticated;
grant select on table public.loc_contestations to authenticated;
grant all on table public.loc_contestations to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_contestations_toucher' and tgrelid = 'public.loc_contestations'::regclass) then
    create trigger loc_contestations_toucher before update on public.loc_contestations for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_contestations_tracer' and tgrelid = 'public.loc_contestations'::regclass) then
    create trigger loc_contestations_tracer after insert or update on public.loc_contestations for each row
      execute function private.tracer('+facture_id', '+reference_banque', '+montant_eur', '+recue_le', '+repondre_avant', '+statut',
                                      '+dossier_sha256', '+envoi_id', '+envoyee_le', '+issue_le');
  end if;
end $$;

-- Ce qui rend le dossier fort ou faible, lu dans ce que Tavaro sait du contrat et de la facture.
-- [{code, ok, libelle}] : contrat, états des lieux départ et retour signés, photos datées, barème, contradictoire, envoi.
CREATE OR REPLACE FUNCTION private.loc_forces_contestation(p_client uuid, p_facture uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures;
  c public.loc_contrats;
  v_depart text;
  v_retour text;
  v_photos integer;
  v_hors_bareme integer;
  v_non_contradictoire boolean;
  v_forces jsonb := '[]'::jsonb;
begin
  select * into f from public.loc_factures where client_id = p_client and id = p_facture;
  select * into c from public.loc_contrats where client_id = p_client and id = f.contrat_id;
  select e.statut into v_depart from public.loc_etats_des_lieux e where e.client_id = p_client and e.contrat_id = c.id and e.moment = 'depart';
  select e.statut into v_retour from public.loc_etats_des_lieux e where e.client_id = p_client and e.contrat_id = c.id and e.moment = 'retour';
  select count(*) into v_photos from (
    select ph ->> 'chemin' from public.loc_etats_des_lieux e, jsonb_array_elements(e.photos) ph
    where e.client_id = p_client and e.contrat_id = c.id and nullif(ph ->> 'prise_le', '') is not null
    union
    select pr ->> 'chemin' from public.loc_facture_lignes li, jsonb_array_elements(li.preuves) pr
    where li.facture_id = f.id and nullif(pr ->> 'prise_le', '') is not null
  ) z;
  select count(*) into v_hors_bareme from public.loc_facture_lignes li where li.facture_id = f.id and li.bareme_ligne_id is null;
  select p.non_contradictoire into v_non_contradictoire from public.loc_propositions p where p.client_id = p_client and p.id = f.proposition_id;

  v_forces := jsonb_build_array(
    jsonb_build_object('code', 'contrat', 'ok', c.piece_id is not null or c.conditions_version is not null,
      'libelle', case when c.piece_id is not null then 'Le contrat signé est au dossier'
                      when c.conditions_version is not null then 'Les conditions acceptées sont identifiées (version ' || c.conditions_version || ') ; le contrat scanné manque'
                      else 'Ni contrat scanné ni version des conditions : la clause de responsabilité est difficile à prouver' end),
    jsonb_build_object('code', 'edl_depart', 'ok', coalesce(v_depart = 'signe', false),
      'libelle', case v_depart when 'signe' then 'L''état des lieux de départ est signé par le locataire'
                               when 'refuse' then 'Le locataire a refusé de signer l''état des lieux de départ (refus constaté)'
                               when 'brouillon' then 'L''état des lieux de départ n''est pas signé'
                               else 'Pas d''état des lieux de départ dans Tavaro' end),
    jsonb_build_object('code', 'edl_retour', 'ok', coalesce(v_retour in ('signe', 'refuse'), false),
      'libelle', case v_retour when 'signe' then 'L''état des lieux de retour est signé par le locataire'
                               when 'refuse' then 'Le locataire a refusé de signer au retour : le refus est constaté et daté'
                               when 'brouillon' then 'L''état des lieux de retour n''est pas signé'
                               else 'Pas d''état des lieux de retour dans Tavaro' end),
    jsonb_build_object('code', 'photos', 'ok', v_photos > 0,
      'libelle', case when v_photos > 0 then v_photos || ' photo' || case when v_photos > 1 then 's datées' else ' datée' end
                      else 'Aucune photo datée : le dommage repose sur la parole de l''agence' end),
    jsonb_build_object('code', 'bareme', 'ok', v_hors_bareme = 0,
      'libelle', case when v_hors_bareme = 0 then 'Chaque ligne de la facture applique le barème publié'
                      else v_hors_bareme || ' ligne' || case when v_hors_bareme > 1 then 's' else '' end || ' hors barème : joignez le devis ou la facture de réparation' end),
    jsonb_build_object('code', 'contradictoire', 'ok', not coalesce(v_non_contradictoire, false),
      'libelle', case when coalesce(v_non_contradictoire, false) then 'Le retour a été constaté hors de la présence du locataire'
                      else 'Le constat de retour est contradictoire' end),
    jsonb_build_object('code', 'envoi', 'ok', f.envoi_id is not null,
      'libelle', case when f.envoi_id is not null then 'La facture a été adressée au locataire par courriel, avant le débit'
                      else 'Pas de trace d''envoi de la facture au locataire dans Tavaro' end)
  );
  return v_forces;
end $function$;

-- Une contestation vue par la personne connectée : appartenance, périmètre (agence de la contestation), rôle.
CREATE OR REPLACE FUNCTION private.loc_contestation_de_l_agence(p_contestation uuid, p_roles text[], p_refus text)
 RETURNS public.loc_contestations
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  k public.loc_contestations;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into k from public.loc_contestations where id = p_contestation;
  if not found or not exists (select 1 from public.comptes x where x.user_id = v_uid and x.client_id = k.client_id) then
    raise exception 'Contestation introuvable.' using errcode = 'P0002';
  end if;
  if not private.voit_entite(k.client_id, k.entite_id) then
    raise exception 'Cette contestation n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if not private.a_un_role(k.client_id, p_roles) then
    raise exception '%', p_refus using errcode = '42501';
  end if;
  return k;
end $function$;

-- Une date lue dans les valeurs (AAAA-MM-JJ), ou null.
CREATE OR REPLACE FUNCTION private.loc_lire_date(p jsonb, p_champ text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  if nullif(btrim(p ->> p_champ), '') is null then
    return null;
  end if;
  if (p ->> p_champ) !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Date illisible pour « % » : AAAA-MM-JJ.', p_champ using errcode = '22023';
  end if;
  return (p ->> p_champ)::date;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Date impossible pour « % » : %.', p_champ, p ->> p_champ using errcode = '22007';
end $function$;

-- L'agence ouvre la contestation reçue de la banque. Idempotent sur (facture, référence de la banque).
-- p_valeurs : {reference_banque, motif_banque, montant_eur?, recue_le?, repondre_avant?, adresse_banque?, notes?}
CREATE OR REPLACE FUNCTION public.loc_ouvrir_contestation(p_facture uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  f public.loc_factures;
  c public.loc_contrats;
  k public.loc_contestations;
  g public.loc_reglages;
  v_ref text;
  v_motif text;
  v_montant numeric;
  v_recue date;
  v_avant date;
  v_adresse text;
  v_aujourdhui date;
  v_fuseau text;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into f from public.loc_factures where id = p_facture;
  if not found or not exists (select 1 from public.comptes x where x.user_id = v_uid and x.client_id = f.client_id) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  select * into c from public.loc_contrats where client_id = f.client_id and id = f.contrat_id;
  if not (private.voit_entite(c.client_id, c.entite_id) or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Cette facture n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if not private.a_un_role(f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur']) then
    raise exception 'Une contestation s''ouvre par l''agence : collaborateur, valideur ou direction.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  v_ref := private.loc_lire_texte(p_valeurs, 'reference_banque', 80);
  v_motif := private.loc_lire_texte(p_valeurs, 'motif_banque', 300);
  if v_ref is null or v_motif is null then
    raise exception 'La référence de la contestation et son motif, tels que la banque les donne, sont obligatoires.' using errcode = '22023';
  end if;

  select * into k from public.loc_contestations x where x.client_id = f.client_id and x.facture_id = f.id and x.reference_banque = v_ref;
  if found then
    return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'repondre_avant', k.repondre_avant, 'deja', true, 'forces', k.forces);
  end if;

  if f.statut = 'avoir' then
    raise exception 'Cette facture est annulée par un avoir : il n''y a plus de débit à défendre, acceptez la contestation auprès de la banque.' using errcode = '23514';
  end if;
  begin
    v_montant := coalesce(round((p_valeurs ->> 'montant_eur')::numeric, 2), f.total_ttc);
  exception when others then
    raise exception 'Montant illisible.' using errcode = '22023';
  end;
  if v_montant <= 0 or v_montant > f.total_ttc then
    raise exception 'Le montant contesté est positif et ne dépasse pas la facture (% €).', f.total_ttc using errcode = '22023';
  end if;
  select * into g from public.loc_reglages where client_id = f.client_id;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = f.client_id and e.id = c.entite_id;
  v_aujourdhui := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;
  v_recue := coalesce(private.loc_lire_date(p_valeurs, 'recue_le'), v_aujourdhui);
  if v_recue > v_aujourdhui or v_recue < f.date_facture then
    raise exception 'La contestation est reçue entre la date de la facture et aujourd''hui.' using errcode = '22023';
  end if;
  v_avant := coalesce(private.loc_lire_date(p_valeurs, 'repondre_avant'), v_recue + coalesce(g.contestation_delai_jours, 7));
  if v_avant < v_recue then
    raise exception 'La date limite de réponse suit la réception.' using errcode = '22023';
  end if;
  v_adresse := coalesce(private.loc_lire_texte(p_valeurs, 'adresse_banque', 320), g.contestation_adresse);
  if v_adresse is not null and v_adresse !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'L''adresse de la banque n''est pas une adresse de courriel.' using errcode = '22023';
  end if;

  insert into public.loc_contestations (client_id, entite_id, facture_id, contrat_id, reference_banque, motif_banque, montant_eur, recue_le,
                                        repondre_avant, adresse_banque, forces, notes, cree_par)
  values (f.client_id, c.entite_id, f.id, c.id, v_ref, v_motif, v_montant, v_recue, v_avant, v_adresse,
          private.loc_forces_contestation(f.client_id, f.id), private.loc_lire_texte(p_valeurs, 'notes', 2000), v_uid)
  returning * into k;
  perform private.deposer_travail(f.client_id, 'tavaro', 'tavaro.dossier_contestation', jsonb_build_object('contestation', k.id),
                                  'tavaro:contestation:' || k.id::text, 1::smallint);
  perform private.journaliser_module(f.client_id, 'tavaro', 'tavaro.contestation_ouverte', 'loc_contestations', k.id::text,
    jsonb_build_object('facture', f.reference, 'contrat', c.numero, 'montant', v_montant, 'repondre_avant', v_avant, 'par', v_uid), c.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'repondre_avant', k.repondre_avant, 'deja', false, 'forces', k.forces);
end $function$;

-- Refaire le dossier (un état des lieux signé depuis, un contrat scanné ajouté) : les forces sont relues, le PDF recomposé.
CREATE OR REPLACE FUNCTION public.loc_produire_dossier(p_contestation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations := private.loc_contestation_de_l_agence(p_contestation, array['gerant', 'admin', 'valideur', 'collaborateur'],
                                                                    'Le dossier se prépare par l''agence.');
  v_forces jsonb;
begin
  if k.statut not in ('ouverte', 'dossier_pret', 'envoyee') then
    raise exception 'Cette contestation est close (%).', k.statut using errcode = '23514';
  end if;
  v_forces := private.loc_forces_contestation(k.client_id, k.facture_id);
  update public.loc_contestations set forces = v_forces where id = k.id;
  perform private.deposer_travail(k.client_id, 'tavaro', 'tavaro.dossier_contestation', jsonb_build_object('contestation', k.id),
                                  'tavaro:contestation:' || k.id::text, 1::smallint);
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.contestation_dossier_demande', 'loc_contestations', k.id::text,
    jsonb_build_object('par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'forces', v_forces);
end $function$;

-- ── Les portes de l'ouvrier tavaro-pdf (service_role seul) ─────────────────────────────────

-- Tout ce qu'il faut pour composer le dossier.
CREATE OR REPLACE FUNCTION public.loc_dossier_a_produire(p_contestation uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'contestation', jsonb_build_object('id', k.id, 'reference_banque', k.reference_banque, 'motif_banque', k.motif_banque,
                                       'montant_eur', k.montant_eur, 'recue_le', k.recue_le, 'repondre_avant', k.repondre_avant,
                                       'statut', k.statut, 'forces', k.forces),
    'client', k.client_id,
    'agence', (select e.nom from public.entites e where e.client_id = k.client_id and e.id = k.entite_id),
    'emetteur', f.emetteur,
    'locataire', f.destinataire,
    'contrat', jsonb_strip_nulls(jsonb_build_object(
      'numero', c.numero, 'depart_le', c.depart_le, 'retour_prevu_le', c.retour_prevu_le, 'retour_reel_le', c.retour_reel_le,
      'km_depart', c.km_depart, 'km_retour', c.km_retour, 'franchise_eur', c.franchise_eur, 'franchise_reduite_eur', c.franchise_reduite_eur,
      'rachat_franchise', c.rachat_franchise, 'depot_eur', c.depot_eur, 'conditions_version', c.conditions_version,
      'politique_carburant', c.politique_carburant,
      'vehicule', (select jsonb_strip_nulls(jsonb_build_object('immatriculation', v.immatriculation, 'modele', v.modele))
                   from public.loc_vehicules v where v.client_id = c.client_id and v.id = c.vehicule_id),
      'piece', (select jsonb_build_object('id', pc.id, 'nom', pc.nom_fichier, 'chemin', pc.chemin)
                from public.pieces pc where pc.client_id = c.client_id and pc.id = c.piece_id))),
    'etats', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'moment', e.moment, 'statut', e.statut, 'releve_le', e.releve_le, 'km', e.km, 'carburant_8', e.carburant_8, 'charge_pct', e.charge_pct,
        'photos', e.photos, 'dommages', e.dommages, 'observations', e.observations, 'caution_eur', e.caution_eur, 'caution_mode', e.caution_mode,
        'signataire_nom', e.signataire_nom, 'signature_chemin', e.signature_chemin, 'signe_le', e.signe_le, 'empreinte', e.empreinte,
        'refus_motif', e.refus_motif, 'refuse_le', e.refuse_le)) order by e.moment desc)
      from public.loc_etats_des_lieux e where e.client_id = c.client_id and e.contrat_id = c.id and e.statut in ('signe', 'refuse')), '[]'::jsonb),
    'facture', jsonb_build_object(
      'id', f.id, 'reference', f.reference, 'nature', f.nature, 'date_facture', f.date_facture, 'echeance_le', f.echeance_le,
      'statut', f.statut, 'regle_le', f.regle_le, 'mode_reglement', f.mode_reglement,
      'total_ht', f.total_ht, 'total_tva', f.total_tva, 'total_ttc', f.total_ttc, 'pdf_piece_id', f.pdf_piece_id,
      'lignes', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'rang', li.rang, 'code', li.code, 'libelle', li.libelle, 'famille', li.famille, 'quantite', li.quantite, 'unite', li.unite,
          'prix_unitaire', li.prix_unitaire, 'montant_ttc', li.montant_ttc,
          'bareme', (select jsonb_build_object('code', b.code, 'libelle', b.libelle, 'unite', b.unite, 'prix_eur', b.prix_eur)
                     from public.loc_bareme_lignes b where b.id = li.bareme_ligne_id),
          'calcul', (select pl.calcul from public.loc_proposition_lignes pl where pl.id = li.proposition_ligne_id),
          'preuves', li.preuves)) order by li.rang)
        from public.loc_facture_lignes li where li.facture_id = f.id), '[]'::jsonb)),
    'decision', (select jsonb_build_object('demandee_le', d.cree_le, 'decidee_le', d.decide_le, 'statut', d.statut,
                                           'approbations', coalesce((select jsonb_agg(jsonb_build_object('decision', a.decision, 'decide_le', a.decide_le,
                                                                       'role', (select x.role from public.comptes x where x.user_id = a.user_id and x.client_id = a.client_id limit 1),
                                                                       'autre_que_la_saisie', a.user_id is distinct from d.demandeur_id) order by a.decide_le)
                                                                     from public.approbations a where a.demande_id = d.id), '[]'::jsonb))
                 from public.demandes_validation d where d.id = f.demande_id),
    'envoi_facture', (select jsonb_strip_nulls(jsonb_build_object('prepare_le', en.cree_le, 'statut', en.statut, 'remise', en.remise, 'remise_le', en.remise_le))
                      from public.envois en where en.id = f.envoi_id))
  from public.loc_contestations k
  join public.loc_factures f on f.client_id = k.client_id and f.id = k.facture_id
  join public.loc_contrats c on c.client_id = k.client_id and c.id = k.contrat_id
  where k.id = p_contestation
$function$;

-- Le dossier composé est enregistré : une pièce (statut « lue » : rien ne part à la lecture IA), le statut « dossier_pret ».
-- p_piece : {chemin, nom, mime, octets, sha256, pages}
CREATE OR REPLACE FUNCTION public.loc_enregistrer_dossier(p_contestation uuid, p_piece jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations;
  v_piece uuid;
begin
  select * into k from public.loc_contestations where id = p_contestation for update;
  if not found then
    raise exception 'Contestation introuvable.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_piece) is distinct from 'object' or nullif(p_piece ->> 'chemin', '') is null or (p_piece ->> 'sha256') !~ '^[0-9a-f]{64}$'
     or nullif(p_piece ->> 'nom', '') is null or coalesce(p_piece ->> 'mime', '') <> 'application/pdf' or coalesce((p_piece ->> 'octets')::bigint, -1) < 0 then
    raise exception 'Dossier illisible : chemin, nom, type PDF, taille et SHA-256 sont obligatoires.' using errcode = '22023';
  end if;
  if p_piece ->> 'chemin' not like k.client_id::text || '/%' then
    raise exception 'Un dossier de ce loueur est rangé sous son dossier.' using errcode = '42501';
  end if;
  insert into public.pieces (client_id, module, objet_type, objet_id, source, nom_fichier, mime, octets, sha256, chemin, statut, type_piece, motif)
  values (k.client_id, 'tavaro', 'loc_contestations', k.id::text, 'api', left(p_piece ->> 'nom', 255), 'application/pdf', (p_piece ->> 'octets')::bigint,
          p_piece ->> 'sha256', left(p_piece ->> 'chemin', 1024), 'lue', 'dossier_contestation',
          'Produit par Tavaro pour répondre à la contestation ' || k.reference_banque)
  on conflict on constraint pieces_une_fois do nothing
  returning id into v_piece;
  if v_piece is null then
    select pc.id into v_piece from public.pieces pc
    where pc.client_id = k.client_id and pc.module = 'tavaro' and pc.objet_type = 'loc_contestations' and pc.objet_id = k.id::text and pc.sha256 = p_piece ->> 'sha256';
  end if;
  update public.loc_contestations
     set dossier_piece_id = v_piece, dossier_sha256 = p_piece ->> 'sha256', dossier_le = now(),
         dossier_pages = case when jsonb_typeof(p_piece -> 'pages') = 'number' then (p_piece ->> 'pages')::integer end,
         statut = case when statut = 'ouverte' then 'dossier_pret' else statut end
   where id = k.id
  returning * into k;
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.contestation_dossier_produit', 'loc_contestations', k.id::text,
    jsonb_build_object('piece', v_piece, 'sha256', k.dossier_sha256, 'pages', k.dossier_pages), k.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'piece', v_piece);
end $function$;

-- Le dossier n'a pas pu être composé : l'agence est prévenue, avec la date limite.
CREATE OR REPLACE FUNCTION public.loc_dossier_impossible(p_contestation uuid, p_erreur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations;
begin
  select * into k from public.loc_contestations where id = p_contestation;
  if not found then
    raise exception 'Contestation introuvable.' using errcode = 'P0002';
  end if;
  if k.statut not in ('ouverte', 'dossier_pret', 'envoyee') then
    return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'alerte', false);
  end if;
  perform private.lever_alerte_module(k.client_id, 'tavaro', 'critique',
    format('Le dossier de la contestation %s n''a pas pu être composé. Réponse attendue par la banque avant le %s : relancez-le depuis Tavaro ou répondez vous-même.',
           k.reference_banque, to_char(k.repondre_avant, 'DD/MM/YYYY')),
    jsonb_build_object('contestation', k.id, 'erreur', left(p_erreur, 300)), 'contestation:dossier_impossible:' || k.id::text, true, null);
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.contestation_dossier_impossible', 'loc_contestations', k.id::text,
    jsonb_build_object('erreur', left(p_erreur, 300)), k.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'alerte', true);
end $function$;

-- ── Le clic : le dossier part à la banque ─────────────────────────────────────────────────

-- Par le chemin de tout envoi (validation comprise) : le dossier, le PDF de la facture, le contrat scanné s'il existe.
CREATE OR REPLACE FUNCTION public.loc_envoyer_dossier(p_contestation uuid, p_adresse text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations := private.loc_contestation_de_l_agence(p_contestation, array['gerant', 'admin', 'valideur', 'collaborateur'],
                                                                    'Le dossier part par l''agence.');
  f public.loc_factures;
  c public.loc_contrats;
  v_adresse text;
  v_pieces uuid[];
  v_contrat_piece uuid;
  v_sujet text;
  v_corps text;
  v_envoi uuid;
  v_statut text;
  v_nom_loueur text;
begin
  if k.statut not in ('dossier_pret', 'envoyee') then
    raise exception '%', case k.statut when 'ouverte' then 'Le dossier est en cours de composition : il part dès qu''il est prêt.'
                                      else 'Cette contestation est close (' || k.statut || ').' end using errcode = '55000';
  end if;
  if (private.reglages_envois_effectifs(k.client_id, 'tavaro') ->> 'mode') is null then
    raise exception 'L''envoi par courriel n''est pas réglé pour votre organisation : téléchargez le dossier et envoyez-le vous-même à la banque.' using errcode = '55000';
  end if;
  v_adresse := coalesce(nullif(btrim(p_adresse), ''), k.adresse_banque);
  if v_adresse is null then
    raise exception 'L''adresse du service des contestations de la banque manque : saisissez-la (ou réglez-la une fois pour toutes).' using errcode = '22023';
  end if;
  if v_adresse !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_adresse) > 320 then
    raise exception 'L''adresse de la banque n''est pas une adresse de courriel.' using errcode = '22023';
  end if;
  select * into f from public.loc_factures where client_id = k.client_id and id = k.facture_id;
  select * into c from public.loc_contrats where client_id = k.client_id and id = k.contrat_id;
  select pc.id into v_contrat_piece from public.pieces pc
  where pc.client_id = c.client_id and pc.id = c.piece_id and pc.statut not in ('rejetee', 'echec');
  v_pieces := array_remove(array[k.dossier_piece_id, f.pdf_piece_id, v_contrat_piece], null);
  v_nom_loueur := coalesce(f.emetteur ->> 'nom', 'Le loueur');

  v_sujet := format('Contestation %s — réponse de %s — facture %s (%s)', k.reference_banque, v_nom_loueur, f.reference, private.loc_eur(k.montant_eur));
  v_corps := format(E'Madame, Monsieur,\n\nVous nous avez notifié la contestation %s (%s), reçue le %s, portant sur %s débités au titre de la facture %s du %s (location %s).\n\n'
                    'Nous la contestons. Vous trouverez en pièce%s jointe%s %s.\n\n'
                    'Le dossier rassemble le contrat de location et les conditions acceptées, les états des lieux de départ et de retour signés (avec leur empreinte SHA-256 et leurs photos datées), '
                    'le barème appliqué ligne par ligne, la facture, sa validation par une personne distincte de celle qui l''a saisie, et son envoi au locataire.\n\n'
                    'Nous restons à votre disposition pour tout complément.\n\n%s%s\n',
                    k.reference_banque, k.motif_banque, to_char(k.recue_le, 'DD/MM/YYYY'), private.loc_eur(k.montant_eur), f.reference,
                    to_char(f.date_facture, 'DD/MM/YYYY'), c.numero,
                    case when cardinality(v_pieces) > 1 then 's' else '' end, case when cardinality(v_pieces) > 1 then 's' else '' end,
                    regexp_replace(concat_ws(', ', 'le dossier de réponse', case when f.pdf_piece_id is not null then 'la facture au format PDF' end,
                                             case when v_contrat_piece is not null then 'le contrat signé' end), ', ([^,]*)$', ' et \1'),
                    v_nom_loueur, case when f.emetteur ->> 'siren' is not null then ' — SIREN ' || (f.emetteur ->> 'siren') else '' end);

  v_envoi := private.preparer_envoi(k.client_id, 'tavaro', 'loc_contestations', k.id::text, 'email',
    jsonb_build_object('adresse', v_adresse, 'nom', 'Service des contestations', 'ref', k.reference_banque, 'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb, v_sujet, v_corps, v_pieces, 'tavaro:contestation:' || k.id::text || ':' || k.dossier_sha256, k.entite_id, true, false,
    null::timestamptz, '{}'::jsonb);
  select e.statut into v_statut from public.envois e where e.id = v_envoi;
  if k.envoi_id is not distinct from v_envoi then
    -- le même dossier, déjà remis à l'envoi : rien ne part deux fois (clé d'idempotence du socle)
    return jsonb_build_object('contestation', k.id, 'statut', k.statut, 'envoi', v_envoi, 'envoi_statut', v_statut, 'pieces_jointes', cardinality(v_pieces), 'deja', true);
  end if;
  update public.loc_contestations
     set statut = 'envoyee', envoi_id = v_envoi, envoyee_le = now(), envoyee_par = (select auth.uid()), adresse_banque = v_adresse
   where id = k.id;
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.contestation_envoyee', 'loc_contestations', k.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_statut, 'pieces', cardinality(v_pieces), 'dossier', k.dossier_sha256), k.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', 'envoyee', 'envoi', v_envoi, 'envoi_statut', v_statut, 'pieces_jointes', cardinality(v_pieces), 'deja', false);
end $function$;

-- L'issue, telle que la banque la notifie : gagnée, perdue, abandonnée. Par la direction ou un valideur.
CREATE OR REPLACE FUNCTION public.loc_issue_contestation(p_contestation uuid, p_issue text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations := private.loc_contestation_de_l_agence(p_contestation, array['gerant', 'admin', 'valideur'],
                                                                    'L''issue d''une contestation se consigne par la direction ou un valideur.');
begin
  if p_issue not in ('gagnee', 'perdue', 'abandonnee') then
    raise exception 'Issue inconnue : gagnee, perdue ou abandonnee.' using errcode = '22023';
  end if;
  if k.statut in ('gagnee', 'perdue', 'abandonnee') then
    raise exception 'Cette contestation est déjà close (%).', k.statut using errcode = '23514';
  end if;
  if p_issue in ('gagnee', 'perdue') and k.statut <> 'envoyee' then
    raise exception 'Gagnée ou perdue suppose un dossier envoyé ; sinon, abandonnée.' using errcode = '23514';
  end if;
  update public.loc_contestations
     set statut = p_issue, issue_le = now(), issue_par = (select auth.uid()), issue_note = left(nullif(btrim(p_note), ''), 1000)
   where id = k.id;
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.contestation_close', 'loc_contestations', k.id::text,
    jsonb_build_object('issue', p_issue, 'montant', k.montant_eur, 'par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('contestation', k.id, 'statut', p_issue);
end $function$;

-- ── La surveillance du délai ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.loc_surveiller_contestations(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_contestations;
  v_fuseau text;
  v_jour date;
  v_palier text;
  v_reste integer;
  n integer := 0;
  v_client uuid;
begin
  for k in
    select x.* from public.loc_contestations x
    where x.statut in ('ouverte', 'dossier_pret') and x.repondre_avant <= (p_maintenant at time zone 'UTC')::date + 3
    order by x.client_id, x.repondre_avant
  loop
    begin
      select e.fuseau into v_fuseau from public.entites e where e.client_id = k.client_id and e.id = k.entite_id;
      v_jour := (p_maintenant at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;
      v_reste := k.repondre_avant - v_jour;
      v_palier := case when v_reste < 0 then 'depasse' when v_reste = 0 then 'j0' when v_reste <= 2 then 'j2' end;
      if v_palier is not null then
        perform private.lever_alerte_module(k.client_id, 'tavaro', 'critique',
          case v_palier
            when 'depasse' then format('La contestation %s (%s) n''a pas reçu de réponse et le délai de la banque est passé depuis le %s. Contactez la banque aujourd''hui.',
                                       k.reference_banque, private.loc_eur(k.montant_eur), to_char(k.repondre_avant, 'DD/MM/YYYY'))
            when 'j0' then format('Dernier jour pour répondre à la contestation %s (%s) : %s.', k.reference_banque, private.loc_eur(k.montant_eur),
                                  case k.statut when 'dossier_pret' then 'le dossier est prêt, envoyez-le' else 'le dossier n''est pas encore composé' end)
            else format('La contestation %s (%s) est à répondre avant le %s : %s.', k.reference_banque, private.loc_eur(k.montant_eur),
                        to_char(k.repondre_avant, 'DD/MM/YYYY'),
                        case k.statut when 'dossier_pret' then 'le dossier est prêt, envoyez-le' else 'le dossier n''est pas encore composé' end)
          end,
          jsonb_build_object('contestation', k.id, 'repondre_avant', k.repondre_avant, 'statut', k.statut),
          'contestation:' || v_palier || ':' || k.id::text, true, null);
        n := n + 1;
      end if;
      if v_client is distinct from k.client_id then
        v_client := k.client_id;
        perform private.battre(k.client_id, 'tavaro_contestations', jsonb_build_object('passage', p_maintenant), interval '1 day');
      end if;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tavaro', 'attention', 'La surveillance d''une contestation bancaire a échoué.',
        jsonb_build_object('contestation', k.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'contestation:surveillance_erreur:' || k.id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-contestations') then
    perform cron.schedule('tavaro-contestations', '10 6 * * *', 'select private.loc_surveiller_contestations()');
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_contestations') then
    alter publication supabase_realtime add table public.loc_contestations;
  end if;
end $$;

revoke all on function private.loc_forces_contestation(uuid, uuid) from public, anon, authenticated;
revoke all on function private.loc_contestation_de_l_agence(uuid, text[], text) from public, anon, authenticated;
revoke all on function private.loc_lire_date(jsonb, text) from public, anon, authenticated;
revoke all on function private.loc_surveiller_contestations(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_contestations(timestamp with time zone) to service_role;
revoke all on function public.loc_ouvrir_contestation(uuid, jsonb) from public, anon;
revoke all on function public.loc_produire_dossier(uuid) from public, anon;
revoke all on function public.loc_envoyer_dossier(uuid, text) from public, anon;
revoke all on function public.loc_issue_contestation(uuid, text, text) from public, anon;
grant execute on function public.loc_ouvrir_contestation(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_produire_dossier(uuid) to authenticated, service_role;
grant execute on function public.loc_envoyer_dossier(uuid, text) to authenticated, service_role;
grant execute on function public.loc_issue_contestation(uuid, text, text) to authenticated, service_role;
revoke all on function public.loc_dossier_a_produire(uuid) from public, anon, authenticated;
revoke all on function public.loc_enregistrer_dossier(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_dossier_impossible(uuid, text) from public, anon, authenticated;
grant execute on function public.loc_dossier_a_produire(uuid) to service_role;
grant execute on function public.loc_enregistrer_dossier(uuid, jsonb) to service_role;
grant execute on function public.loc_dossier_impossible(uuid, text) to service_role;
