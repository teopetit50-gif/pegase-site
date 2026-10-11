-- b2_12 — Les photos du départ jointes à la facture ; les rappels du constructeur, le contrôle technique et la vignette
-- Crit'Air (audit des promesses : chiffrage TAVARO lignes 7 et 51 ; module 15 « Rappels » ; session B2, 11/10/2026).
--
-- LES PROMESSES : « Chaque facture part avec les photos datées du départ et du retour, après validation de l'agence. » ;
-- « Un véhicule rappelé par le constructeur, ou dont le contrôle technique arrive à échéance, sort des réservations. Sa
-- vignette Crit'Air est rappelée au comptoir. »
--
-- CE QUE ÇA POSE (rien n'est effacé ni remplacé dans le socle) :
--   · public.loc_pdf_a_produire (b2_08) redéfinie : après les photos des preuves, celles des états des lieux signés (le
--     départ d'abord, puis le retour) ; l'ouvrier tavaro-pdf les joint tant qu'elles tiennent (dix pièces, 15 Mo) ;
--   · public.loc_vehicules_conformite : la vignette Crit'Air (classe, vérifiée le) et la validité du contrôle technique ;
--   · public.loc_rappels et loc_rappels_vehicules : la campagne du constructeur et les véhicules concernés ; un rappel
--     « immobilisant » immobilise chaque véhicule (b2_10, motif rappel_constructeur) et liste les réservations à
--     réaffecter — Tavaro ne se branche pas au logiciel de réservation : il les signale ; un rappel « à planifier »
--     devient un entretien placé dans un creux ;
--   · public.loc_controle_depart(contrat) : ce que le comptoir doit dire ou vérifier au départ (Crit'Air et zones à
--     faibles émissions, rappel en cours, contrôle technique échu avant le retour prévu, entretien dû) ;
--   · private.loc_surveiller_conformite + cron tavaro-conformite (6 h 20 UTC) : contrôle technique qui échoit avant une
--     réservation ou un contrat du véhicule (à réaffecter), Crit'Air inconnue sur un véhicule en service.

CREATE OR REPLACE FUNCTION public.loc_pdf_a_produire(p_proposition uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'proposition', p.id, 'client', p.client_id, 'contrat', c.numero, 'statut', p.statut,
    'factures', coalesce((select jsonb_agg(jsonb_build_object(
        'id', f.id, 'reference', f.reference, 'nature', f.nature, 'date_facture', f.date_facture, 'echeance_le', f.echeance_le,
        'a_debiter_avant', f.a_debiter_avant, 'emetteur', f.emetteur, 'destinataire', f.destinataire, 'mentions', f.mentions,
        'total_ht', f.total_ht, 'total_tva', f.total_tva, 'total_ttc', f.total_ttc, 'pdf_fait', f.pdf_piece_id is not null,
        'lignes', coalesce((select jsonb_agg(jsonb_build_object('rang', li.rang, 'libelle', li.libelle, 'quantite', li.quantite, 'unite', li.unite,
                                                                'prix_unitaire', li.prix_unitaire, 'montant_ht', li.montant_ht, 'regime_tva', li.regime_tva,
                                                                'taux_tva', li.taux_tva, 'montant_tva', li.montant_tva, 'montant_ttc', li.montant_ttc) order by li.rang)
                            from public.loc_facture_lignes li where li.facture_id = f.id), '[]'::jsonb),
        'photos', coalesce((select jsonb_agg(distinct jsonb_strip_nulls(jsonb_build_object('chemin', pr ->> 'chemin', 'prise_le', pr ->> 'prise_le',
                                                                                          'legende', li.libelle)))
                            from public.loc_facture_lignes li, jsonb_array_elements(li.preuves) pr
                            where li.facture_id = f.id and nullif(pr ->> 'chemin', '') is not null), '[]'::jsonb)
          -- b2_12 : puis les photos des états des lieux signés, celles du départ d'abord (la référence), puis celles du retour
          || coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('chemin', ph ->> 'chemin', 'prise_le', ph ->> 'prise_le',
                                         'legende', 'État des lieux de ' || case e.moment when 'depart' then 'départ' else 'retour' end
                                                    || coalesce(' — ' || replace(ph ->> 'vue', '_', ' '), '')))
                                       order by e.moment, ph ->> 'vue')
                       from public.loc_etats_des_lieux e, jsonb_array_elements(e.photos) ph
                       where e.client_id = f.client_id and e.contrat_id = f.contrat_id and e.statut in ('signe', 'refuse')
                         and nullif(ph ->> 'chemin', '') is not null), '[]'::jsonb)
      ) order by f.numero) from public.loc_factures f where f.client_id = p.client_id and f.proposition_id = p.id), '[]'::jsonb))
  from public.loc_propositions p join public.loc_contrats c on c.client_id = p.client_id and c.id = p.contrat_id
  where p.id = p_proposition
$function$;
-- ── La conformité d'un véhicule : Crit'Air et contrôle technique ─────────────────────────
create table if not exists public.loc_vehicules_conformite (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  critair text,
  critair_verifie_le date,
  ct_valide_jusqu_au date,
  maj_par uuid,
  maj_le timestamp with time zone not null default now(),
  constraint loc_vehicules_conformite_pkey primary key (id),
  constraint loc_vehicules_conformite_un unique (client_id, vehicule_id),
  constraint loc_vehicules_conformite_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_vehicules_conformite_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_vehicules_conformite_critair_check check (critair in ('0', '1', '2', '3', '4', '5', 'non_classe')),
  constraint loc_vehicules_conformite_verifie check ((critair is null) = (critair_verifie_le is null))
);
comment on table public.loc_vehicules_conformite is 'b2_12 : vignette Crit''Air (classe 0 = électrique) et validité du contrôle technique de chaque véhicule';

-- ── Les rappels du constructeur ─────────────────────────────────────────────────────────
create table if not exists public.loc_rappels (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  reference text not null,
  constructeur text,
  libelle text not null,
  gravite text not null,
  publie_le date,
  source text not null default 'saisie',
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_rappels_pkey primary key (id),
  constraint loc_rappels_client_id_id_key unique (client_id, id),
  constraint loc_rappels_une_fois unique (client_id, reference),
  constraint loc_rappels_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_rappels_gravite_check check (gravite in ('immobilisant', 'a_planifier')),
  constraint loc_rappels_source_check check (source in ('saisie', 'rappel_conso', 'constructeur')),
  constraint loc_rappels_textes_check check (char_length(reference) between 2 and 80 and char_length(libelle) between 3 and 500 and char_length(constructeur) <= 80)
);
create table if not exists public.loc_rappels_vehicules (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  rappel_id uuid not null,
  vehicule_id uuid not null,
  statut text not null default 'a_faire',
  immobilisation_id uuid,
  entretien_id uuid,
  fait_le timestamp with time zone,
  maj_le timestamp with time zone not null default now(),
  constraint loc_rappels_vehicules_pkey primary key (id),
  constraint loc_rappels_vehicules_un unique (rappel_id, vehicule_id),
  constraint loc_rappels_vehicules_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_rappels_vehicules_rappel_fkey foreign key (client_id, rappel_id) references public.loc_rappels(client_id, id),
  constraint loc_rappels_vehicules_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_rappels_vehicules_statut_check check (statut in ('a_faire', 'fait', 'non_concerne')),
  constraint loc_rappels_vehicules_fait check ((statut = 'fait') = (fait_le is not null))
);
comment on table public.loc_rappels is 'b2_12 : campagnes de rappel du constructeur (immobilisant : le véhicule ne part plus ; à planifier : un entretien)';

do $$
declare t text;
begin
  foreach t in array array['loc_vehicules_conformite', 'loc_rappels', 'loc_rappels_vehicules'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'membres lisent la conformite') then
      execute format($p$create policy "membres lisent la conformite" on public.%I for select to authenticated using (client_id in (select private.mes_clients()))$p$, t);
    end if;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_tracer' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I after insert or update on public.%I for each row execute function private.tracer(%L)', t || '_tracer', t, 'maj_le');
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- La vignette et le contrôle technique d'un véhicule : l'agence les saisit (la carte grise, le procès-verbal).
-- p_valeurs : {critair?, critair_verifie_le?, ct_valide_jusqu_au?}
CREATE OR REPLACE FUNCTION public.loc_poser_conformite(p_vehicule uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'La conformité d''un véhicule se saisit par l''agence.');
  x public.loc_vehicules_conformite;
begin
  if not exists (select 1 from public.loc_vehicules v where v.client_id = v_client and v.id = p_vehicule) then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  if p_valeurs ? 'critair' and coalesce(p_valeurs ->> 'critair', '') not in ('', '0', '1', '2', '3', '4', '5', 'non_classe') then
    raise exception 'Classe Crit''Air inconnue : 0 (électrique) à 5, ou non_classe.' using errcode = '22023';
  end if;
  insert into public.loc_vehicules_conformite (client_id, vehicule_id) values (v_client, p_vehicule)
  on conflict on constraint loc_vehicules_conformite_un do nothing;
  select * into x from public.loc_vehicules_conformite where client_id = v_client and vehicule_id = p_vehicule for update;
  begin
    if p_valeurs ? 'critair' then
      x.critair := nullif(p_valeurs ->> 'critair', '');
      x.critair_verifie_le := case when x.critair is not null then coalesce(nullif(p_valeurs ->> 'critair_verifie_le', '')::date, current_date) end;
    end if;
    if p_valeurs ? 'ct_valide_jusqu_au' then x.ct_valide_jusqu_au := nullif(p_valeurs ->> 'ct_valide_jusqu_au', '')::date; end if;
  exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
    raise exception 'Date illisible.' using errcode = '22023';
  end;
  update public.loc_vehicules_conformite set critair = x.critair, critair_verifie_le = x.critair_verifie_le,
         ct_valide_jusqu_au = x.ct_valide_jusqu_au, maj_par = (select auth.uid())
   where id = x.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.conformite_posee', 'loc_vehicules', p_vehicule::text,
    jsonb_build_object('critair', x.critair, 'ct_valide_jusqu_au', x.ct_valide_jusqu_au, 'par', (select auth.uid())), null);
  return jsonb_build_object('vehicule', p_vehicule, 'critair', x.critair, 'ct_valide_jusqu_au', x.ct_valide_jusqu_au);
end $function$;

-- Un rappel du constructeur et ses véhicules. Immobilisant : chaque véhicule est immobilisé jusqu'à la date prévue de la
-- réparation (b2_10), les réservations à réaffecter sont rendues ; à planifier : un entretien « autre » à l'échéance.
-- p_valeurs : {reference, libelle, gravite, constructeur?, publie_le?, fin_prevue_le? (immobilisant), echeance_le? (à planifier)}
CREATE OR REPLACE FUNCTION public.loc_enregistrer_rappel(p_valeurs jsonb, p_vehicules uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Un rappel du constructeur s''enregistre par la direction ou un valideur.');
  r public.loc_rappels;
  v_id uuid;
  v_vehicule uuid;
  v public.loc_vehicules;
  v_res jsonb;
  v_reaffecter jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_fin timestamptz;
  v_echeance date;
  v_rv uuid;
begin
  if coalesce(p_valeurs ->> 'gravite', '') not in ('immobilisant', 'a_planifier') then
    raise exception 'Gravité : immobilisant (le véhicule ne part plus) ou a_planifier.' using errcode = '22023';
  end if;
  if private.loc_lire_texte(p_valeurs, 'reference', 80) is null or private.loc_lire_texte(p_valeurs, 'libelle', 500) is null then
    raise exception 'La référence de la campagne et son libellé sont obligatoires.' using errcode = '22023';
  end if;
  if p_vehicules is null or cardinality(p_vehicules) = 0 then
    raise exception 'Choisissez au moins un véhicule concerné.' using errcode = '22023';
  end if;
  begin
    v_fin := nullif(p_valeurs ->> 'fin_prevue_le', '')::timestamptz;
    v_echeance := nullif(p_valeurs ->> 'echeance_le', '')::date;
  exception when others then
    raise exception 'Date illisible.' using errcode = '22023';
  end;
  if p_valeurs ->> 'gravite' = 'immobilisant' and v_fin is null then
    v_fin := now() + interval '3 days';
  end if;
  insert into public.loc_rappels (client_id, reference, constructeur, libelle, gravite, publie_le, cree_par)
  values (v_client, private.loc_lire_texte(p_valeurs, 'reference', 80), private.loc_lire_texte(p_valeurs, 'constructeur', 80),
          private.loc_lire_texte(p_valeurs, 'libelle', 500), p_valeurs ->> 'gravite', nullif(p_valeurs ->> 'publie_le', '')::date, (select auth.uid()))
  on conflict on constraint loc_rappels_une_fois do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'La campagne % est déjà enregistrée.', p_valeurs ->> 'reference' using errcode = '23505';
  end if;
  select * into r from public.loc_rappels where id = v_id;
  foreach v_vehicule in array p_vehicules loop
    select * into v from public.loc_vehicules where client_id = v_client and id = v_vehicule;
    if not found then
      raise exception 'Véhicule introuvable.' using errcode = 'P0002';
    end if;
    insert into public.loc_rappels_vehicules (client_id, entite_id, rappel_id, vehicule_id) values (v_client, v.entite_id, r.id, v.id)
    returning id into v_rv;
    if r.gravite = 'immobilisant' then
      v_res := public.loc_immobiliser(v.id, jsonb_build_object('motif', 'rappel_constructeur', 'fin_prevue_le', v_fin,
                                                               'prestataire', r.constructeur, 'notes', 'Rappel ' || r.reference || ' : ' || r.libelle));
      update public.loc_rappels_vehicules set immobilisation_id = (v_res ->> 'immobilisation')::uuid where id = v_rv;
      v_reaffecter := v_reaffecter || (select coalesce(jsonb_agg(x || jsonb_build_object('vehicule', v.immatriculation)), '[]'::jsonb)
                                       from jsonb_array_elements(v_res -> 'a_reaffecter') x);
    else
      v_res := public.loc_prevoir_entretien(v.id, jsonb_build_object('nature', 'autre', 'libelle', left('Rappel ' || r.reference || ' — ' || r.libelle, 200),
                                                                     'echeance_le', coalesce(v_echeance, current_date + 30), 'duree_h', 4));
      update public.loc_rappels_vehicules set entretien_id = (v_res ->> 'entretien')::uuid where id = v_rv;
    end if;
    v_n := v_n + 1;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.rappel_enregistre', 'loc_rappels', r.id::text,
    jsonb_build_object('reference', r.reference, 'gravite', r.gravite, 'vehicules', v_n, 'a_reaffecter', jsonb_array_length(v_reaffecter)), null);
  return jsonb_build_object('rappel', r.id, 'vehicules', v_n, 'a_reaffecter', v_reaffecter);
end $function$;

-- Le rappel est fait sur un véhicule : l'immobilisation est levée, l'entretien clos.
CREATE OR REPLACE FUNCTION public.loc_rappel_fait(p_rappel_vehicule uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un rappel se clôt par l''agence.');
  rv public.loc_rappels_vehicules;
begin
  select * into rv from public.loc_rappels_vehicules where client_id = v_client and id = p_rappel_vehicule for update;
  if not found then
    raise exception 'Rappel introuvable.' using errcode = 'P0002';
  end if;
  if rv.statut <> 'a_faire' then
    raise exception 'Ce rappel est déjà clos (%).', rv.statut using errcode = '23514';
  end if;
  update public.loc_rappels_vehicules set statut = 'fait', fait_le = now() where id = rv.id;
  if rv.immobilisation_id is not null and exists (select 1 from public.loc_immobilisations i where i.id = rv.immobilisation_id and i.fin_le is null) then
    perform public.loc_lever_immobilisation(rv.immobilisation_id, null, 'Rappel du constructeur fait');
  end if;
  if rv.entretien_id is not null and exists (select 1 from public.loc_entretiens e where e.id = rv.entretien_id and e.statut in ('a_planifier', 'planifie')) then
    perform public.loc_entretien_fait(rv.entretien_id, null, null, 'Rappel du constructeur fait');
  end if;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.rappel_fait', 'loc_rappels_vehicules', rv.id::text,
    jsonb_build_object('rappel', rv.rappel_id, 'vehicule', rv.vehicule_id, 'par', (select auth.uid())), rv.entite_id);
  return jsonb_build_object('rappel_vehicule', rv.id, 'statut', 'fait');
end $function$;

-- Ce que le comptoir dit ou vérifie au départ d'un contrat. [{code, niveau (info, attention, bloquant), message}]
CREATE OR REPLACE FUNCTION public.loc_controle_depart(p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
  v public.loc_vehicules;
  x public.loc_vehicules_conformite;
  v_points jsonb := '[]'::jsonb;
  v_rappel record;
  v_entretien record;
  v_retour date;
begin
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or v_uid is null or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id)
     or not (private.voit_entite(c.client_id, c.entite_id) or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if c.vehicule_id is null then
    return jsonb_build_array(jsonb_build_object('code', 'vehicule', 'niveau', 'attention', 'message', 'Aucun véhicule n''est encore affecté à ce contrat.'));
  end if;
  select * into v from public.loc_vehicules where client_id = c.client_id and id = c.vehicule_id;
  select * into x from public.loc_vehicules_conformite where client_id = c.client_id and vehicule_id = c.vehicule_id;
  v_retour := c.retour_prevu_le::date;
  v_points := v_points || jsonb_build_array(case
    when x.critair is null then jsonb_build_object('code', 'critair', 'niveau', 'attention',
      'message', format('La classe Crit''Air de %s n''est pas connue : vérifiez la vignette sur le pare-brise avant le départ.', v.immatriculation))
    when x.critair = 'non_classe' then jsonb_build_object('code', 'critair', 'niveau', 'attention',
      'message', format('%s n''a pas de vignette Crit''Air : il ne peut pas circuler dans les zones à faibles émissions qui l''exigent. Dites-le au client.', v.immatriculation))
    else jsonb_build_object('code', 'critair', 'niveau', 'info',
      'message', format('Vignette Crit''Air %s : rappelez-la au client s''il entre dans une zone à faibles émissions (Paris, Lyon, Grenoble…).', x.critair)) end);
  for v_rappel in
    select r.reference, r.libelle, r.gravite from public.loc_rappels_vehicules rv join public.loc_rappels r on r.id = rv.rappel_id
    where rv.client_id = c.client_id and rv.vehicule_id = c.vehicule_id and rv.statut = 'a_faire'
  loop
    v_points := v_points || jsonb_build_array(jsonb_build_object('code', 'rappel', 'niveau', case v_rappel.gravite when 'immobilisant' then 'bloquant' else 'attention' end,
      'message', format('Rappel du constructeur %s en cours : %s.%s', v_rappel.reference, v_rappel.libelle,
                        case v_rappel.gravite when 'immobilisant' then ' Le véhicule ne doit pas partir : changez de véhicule.' else '' end)));
  end loop;
  if x.ct_valide_jusqu_au is not null and (x.ct_valide_jusqu_au < current_date or x.ct_valide_jusqu_au <= v_retour) then
    v_points := v_points || jsonb_build_array(jsonb_build_object('code', 'controle_technique', 'niveau',
      case when x.ct_valide_jusqu_au < current_date then 'bloquant' else 'attention' end,
      'message', case when x.ct_valide_jusqu_au < current_date
                      then format('Le contrôle technique de %s a expiré le %s : le véhicule ne doit pas partir.', v.immatriculation, to_char(x.ct_valide_jusqu_au, 'DD/MM/YYYY'))
                      else format('Le contrôle technique de %s expire le %s, avant le retour prévu : changez de véhicule ou avancez le contrôle.', v.immatriculation, to_char(x.ct_valide_jusqu_au, 'DD/MM/YYYY')) end));
  end if;
  for v_entretien in
    select e.libelle, e.nature, e.echeance_le, e.echeance_km from public.loc_entretiens e
    where e.client_id = c.client_id and e.vehicule_id = c.vehicule_id and e.statut = 'a_planifier'
      and ((e.echeance_le is not null and e.echeance_le <= v_retour) or (e.echeance_km is not null and coalesce(v.km_dernier, 0) >= e.echeance_km - 500))
  loop
    v_points := v_points || jsonb_build_array(jsonb_build_object('code', 'entretien', 'niveau', 'attention',
      'message', format('%s est dû pendant la location (%s) : prévoyez-le au retour.', coalesce(v_entretien.libelle, replace(v_entretien.nature, '_', ' ')),
                        concat_ws(' ou ', to_char(v_entretien.echeance_le, 'DD/MM/YYYY'), case when v_entretien.echeance_km is not null then v_entretien.echeance_km || ' km' end))));
  end loop;
  return v_points;
end $function$;

-- Chaque matin : le contrôle technique qui échoit avant une réservation ou un contrat du véhicule ; la vignette inconnue.
CREATE OR REPLACE FUNCTION private.loc_surveiller_conformite(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select x.client_id, v.id as vehicule_id, v.immatriculation, v.entite_id, x.ct_valide_jusqu_au,
           (select count(*) from private.loc_occupations(x.client_id, v.id) o
            where o.quoi in ('contrat', 'reservation') and o.fin > (x.ct_valide_jusqu_au::timestamptz)) as touches
    from public.loc_vehicules_conformite x join public.loc_vehicules v on v.client_id = x.client_id and v.id = x.vehicule_id
    where v.statut <> 'sorti' and x.ct_valide_jusqu_au is not null and x.ct_valide_jusqu_au <= (p_maintenant at time zone 'UTC')::date + 30
  loop
    begin
      perform private.lever_alerte_module(r.client_id, 'tavaro', case when r.ct_valide_jusqu_au < (p_maintenant at time zone 'UTC')::date then 'critique' else 'attention' end,
        format('Le contrôle technique de %s %s le %s%s.', r.immatriculation,
               case when r.ct_valide_jusqu_au < (p_maintenant at time zone 'UTC')::date then 'a expiré' else 'expire' end, to_char(r.ct_valide_jusqu_au, 'DD/MM/YYYY'),
               case when r.touches > 0 then format(' : %s réservation(s) ou contrat(s) après cette date sont à réaffecter ou le contrôle à avancer', r.touches) else '' end),
        jsonb_build_object('vehicule', r.vehicule_id, 'ct', r.ct_valide_jusqu_au, 'a_reaffecter', r.touches),
        'conformite:ct:' || r.vehicule_id::text || ':' || to_char(p_maintenant, 'IYYY-IW'), true, null);
      n := n + 1;
    exception when others then
      raise warning 'loc_surveiller_conformite %: %', r.vehicule_id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-conformite') then
    perform cron.schedule('tavaro-conformite', '20 6 * * *', 'select private.loc_surveiller_conformite()');
  end if;
end $$;

revoke all on function private.loc_surveiller_conformite(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_conformite(timestamp with time zone) to service_role;
revoke all on function public.loc_poser_conformite(uuid, jsonb) from public, anon;
revoke all on function public.loc_enregistrer_rappel(jsonb, uuid[]) from public, anon;
revoke all on function public.loc_rappel_fait(uuid) from public, anon;
revoke all on function public.loc_controle_depart(uuid) from public, anon;
grant execute on function public.loc_poser_conformite(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_enregistrer_rappel(jsonb, uuid[]) to authenticated, service_role;
grant execute on function public.loc_rappel_fait(uuid) to authenticated, service_role;
grant execute on function public.loc_controle_depart(uuid) to authenticated, service_role;
