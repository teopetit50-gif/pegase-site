-- 20261011135955 b2_12_a_b2_16_tavaro
-- Source : dépôt : 814ddc7 omega/modules/tavaro/migrations/b2_12_depart_rappels_critair.sql ; 814ddc7 omega/modules/tavaro/migrations/b2_13_transferts.sql ; 814ddc7 omega/modules/tavaro/migrations/b2_14_peages.sql ; 814ddc7 omega/modules/tavaro/migrations/b2_15_sinistres.sql ; 814ddc7 omega/modules/tavaro/migrations/b2_16_interfaces_tiers.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b2_12_depart_rappels_critair.sql @ 814ddc7, b2_13_transferts.sql @ 814ddc7, b2_14_peages.sql @ 814ddc7, b2_15_sinistres.sql @ 814ddc7, b2_16_interfaces_tiers.sql @ 814ddc7.
-- ═══ omega/modules/tavaro/migrations/b2_12_depart_rappels_critair.sql @ 814ddc7
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


-- ═══ omega/modules/tavaro/migrations/b2_13_transferts.sql @ 814ddc7
-- b2_13 — Les transferts entre agences (modules 11 et 16 ; session B2, 11/10/2026).
-- Les promesses : « Tavaro organise les transferts entre agences avant le pic de demande, en une seule tournée, selon les
-- réservations de chaque site. » ; « Chaque véhicule chez le carrossier garde une date de retour. Si cette date manque ou
-- tombe après le pic, Tavaro propose des transferts. »
--
-- LE CALCUL (public.loc_proposer_transferts) : pour chaque jour des sept prochains, chaque agence et chaque catégorie,
--   demande = réservations (option, confirmée) qui partent ce jour-là de l'agence ;
--   offre   = véhicules de la catégorie qui seront dans l'agence ce matin-là (dernier retour, ou dernier transfert fait,
--             sinon l'agence du véhicule) et libres toute la journée (aucun contrat, réservation affectée ou immobilisation :
--             un véhicule chez le carrossier sans date de retour, ou revenant après, ne compte pas) ;
--   le pic = le jour où le manque total est le plus grand (ou le jour demandé). Pour chaque manque, Tavaro prend un véhicule
--   de la même catégorie dans une agence en surplus ce jour-là, libre jusqu'au pic, et propose son transfert la veille ;
--   les transferts d'une même agence vers une même agence forment une tournée. La direction ou un valideur valide la
--   tournée, l'agence marque le transfert fait : la position du véhicule suit.
-- Rien n'est effacé ni remplacé ; le logiciel de réservation n'est pas touché (Tavaro ne réaffecte pas les réservations).

create table if not exists public.loc_transferts (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  categorie_id uuid,
  origine_entite_id uuid not null,
  destination_entite_id uuid not null,
  pour_le timestamp with time zone not null,
  jour_pic date not null,
  tournee text not null,
  statut text not null default 'propose',
  motif jsonb not null default '{}'::jsonb,
  propose_par uuid,
  propose_le timestamp with time zone not null default now(),
  decide_par uuid,
  decide_le timestamp with time zone,
  fait_le timestamp with time zone,
  fait_par uuid,
  convoyeur text,
  maj_le timestamp with time zone not null default now(),
  constraint loc_transferts_pkey primary key (id),
  constraint loc_transferts_client_id_id_key unique (client_id, id),
  constraint loc_transferts_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_transferts_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_transferts_origine_fkey foreign key (client_id, origine_entite_id) references public.entites(client_id, id),
  constraint loc_transferts_destination_fkey foreign key (client_id, destination_entite_id) references public.entites(client_id, id),
  constraint loc_transferts_sens check (origine_entite_id <> destination_entite_id),
  constraint loc_transferts_statut_check check (statut in ('propose', 'valide', 'refuse', 'fait', 'annule')),
  constraint loc_transferts_fait check ((statut = 'fait') = (fait_le is not null)),
  constraint loc_transferts_textes check (char_length(tournee) <= 200 and char_length(convoyeur) <= 120)
);
comment on table public.loc_transferts is 'b2_13 : transferts de véhicules entre agences proposés avant le pic, validés, faits';
create unique index if not exists loc_transferts_un_ouvert on public.loc_transferts (client_id, vehicule_id) where statut in ('propose', 'valide');

alter table public.loc_transferts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_transferts' and policyname = 'on voit les transferts de ses agences') then
    create policy "on voit les transferts de ses agences" on public.loc_transferts for select to authenticated
      using (client_id in (select private.mes_clients())
             and (private.voit_entite(client_id, origine_entite_id) or private.voit_entite(client_id, destination_entite_id)));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_transferts_toucher' and tgrelid = 'public.loc_transferts'::regclass) then
    create trigger loc_transferts_toucher before update on public.loc_transferts for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_transferts_tracer' and tgrelid = 'public.loc_transferts'::regclass) then
    create trigger loc_transferts_tracer after insert or update on public.loc_transferts for each row execute function private.tracer('maj_le');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_transferts') then
    alter publication supabase_realtime add table public.loc_transferts;
  end if;
end $$;
revoke all on table public.loc_transferts from public, anon, authenticated;
grant select on table public.loc_transferts to authenticated;
grant all on table public.loc_transferts to service_role;

-- Où est le véhicule à un instant : le dernier événement de position avant cet instant (retour d'un contrat à son agence
-- de retour, transfert fait), sinon l'agence du véhicule.
CREATE OR REPLACE FUNCTION private.loc_position_vehicule(p_client uuid, p_vehicule uuid, p_au timestamp with time zone)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select z.entite from (
       select coalesce(c.entite_retour_id, c.entite_id) as entite, coalesce(c.retour_reel_le, c.retour_prevu_le) as le
       from public.loc_contrats c
       where c.client_id = p_client and c.vehicule_id = p_vehicule and c.statut <> 'annule' and c.disparu_le is null
         and coalesce(c.retour_reel_le, c.retour_prevu_le) <= p_au
       union all
       select t.destination_entite_id, t.fait_le from public.loc_transferts t
       where t.client_id = p_client and t.vehicule_id = p_vehicule and t.statut = 'fait' and t.fait_le <= p_au
       union all
       -- un transfert validé est compté comme fait à son heure prévue (on planifie le pic après lui)
       select t.destination_entite_id, t.pour_le from public.loc_transferts t
       where t.client_id = p_client and t.vehicule_id = p_vehicule and t.statut = 'valide' and t.pour_le <= p_au
     ) z order by z.le desc limit 1),
    (select v.entite_id from public.loc_vehicules v where v.client_id = p_client and v.id = p_vehicule))
$function$;

-- Le tableau d'un jour : par agence et catégorie, la demande, l'offre et les véhicules libres.
CREATE OR REPLACE FUNCTION private.loc_tableau_jour(p_client uuid, p_jour date, p_fuseau text)
 RETURNS TABLE(entite_id uuid, categorie_id uuid, demande integer, offre integer, libres uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with bornes as (
    select ((p_jour::timestamp + time '07:00') at time zone p_fuseau) as debut, ((p_jour::timestamp + time '21:00') at time zone p_fuseau) as fin
  ),
  dem as (
    select r.entite_id, r.categorie_id, count(*)::int as n
    from public.loc_reservations r, bornes b
    where r.client_id = p_client and r.statut in ('option', 'confirmee') and r.disparue_le is null and r.categorie_id is not null
      and r.vehicule_id is null  -- une réservation déjà affectée a son véhicule, compté hors de l'offre
      and r.depart_prevu_le >= b.debut - interval '7 hours' and r.depart_prevu_le < b.fin + interval '3 hours'
    group by 1, 2
  ),
  lib as (
    select private.loc_position_vehicule(p_client, v.id, b.debut) as entite_id, v.categorie_id, v.id
    from public.loc_vehicules v, bornes b
    where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id is not null
      and not exists (select 1 from private.loc_occupations(p_client, v.id) o where o.debut < b.fin and o.fin > b.debut)
  ),
  offres as (
    select l.entite_id, l.categorie_id, count(*)::int as n, array_agg(l.id order by l.id) as ids from lib l where l.entite_id is not null group by 1, 2
  )
  select coalesce(d.entite_id, o.entite_id), coalesce(d.categorie_id, o.categorie_id), coalesce(d.n, 0), coalesce(o.n, 0), coalesce(o.ids, '{}')
  from dem d full join offres o on o.entite_id = d.entite_id and o.categorie_id = d.categorie_id
$function$;

-- Proposer les transferts du prochain pic (ou du jour demandé). Les propositions encore ouvertes pour ce pic sont
-- remplacées ; celles validées restent (elles comptent déjà dans la position des véhicules).
CREATE OR REPLACE FUNCTION public.loc_proposer_transferts(p_jour date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Les transferts se proposent par la direction ou un valideur.');
  v_fuseau text;
  v_jour date;
  v_pic date;
  v_manque integer;
  v_max integer := -1;
  d record;
  s record;
  v_besoin integer;
  v_pris integer;
  v_vehicule uuid;
  v_pour timestamptz;
  v_n integer := 0;
  v_tournees jsonb := '{}'::jsonb;
  v_cle text;
  v_immo jsonb;
  v_pris_ids uuid[] := '{}';
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = v_client order by e.principale desc nulls last limit 1;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  if p_jour is not null then
    v_pic := p_jour;
  else
    for i in 1..7 loop
      v_jour := (now() at time zone v_fuseau)::date + i;
      select coalesce(sum(greatest(t.demande - t.offre, 0)), 0) into v_manque from private.loc_tableau_jour(v_client, v_jour, v_fuseau) t;
      if v_manque > v_max then
        v_max := v_manque;
        v_pic := v_jour;
      end if;
    end loop;
  end if;
  update public.loc_transferts set statut = 'annule' where client_id = v_client and jour_pic = v_pic and statut = 'propose';
  v_pour := ((v_pic - 1)::timestamp + time '18:00') at time zone v_fuseau;

  for d in
    select t.entite_id, t.categorie_id, t.demande - t.offre as manque from private.loc_tableau_jour(v_client, v_pic, v_fuseau) t
    where t.demande > t.offre order by t.demande - t.offre desc
  loop
    v_besoin := d.manque;
    for s in
      select t.entite_id, t.offre - t.demande as surplus, t.libres from private.loc_tableau_jour(v_client, v_pic, v_fuseau) t
      where t.categorie_id = d.categorie_id and t.offre > t.demande and t.entite_id <> d.entite_id order by t.offre - t.demande desc
    loop
      exit when v_besoin <= 0;
      -- ce que cette agence a déjà cédé pour un autre manque de la même catégorie
      v_pris := (select count(*)::int from unnest(s.libres) x where x = any (v_pris_ids));
      foreach v_vehicule in array s.libres loop
        exit when v_besoin <= 0 or v_pris >= s.surplus;
        continue when v_vehicule = any (v_pris_ids)
          or exists (select 1 from public.loc_transferts x where x.client_id = v_client and x.vehicule_id = v_vehicule and x.statut in ('propose', 'valide'))
          -- libre de maintenant jusqu'au pic : il peut rouler la veille
          or exists (select 1 from private.loc_occupations(v_client, v_vehicule) o where o.debut < v_pour + interval '3 hours' and o.fin > now());
        v_cle := (select coalesce(x.nom, '?') from public.entites x where x.id = s.entite_id) || ' → '
                 || (select coalesce(x.nom, '?') from public.entites x where x.id = d.entite_id) || ' · ' || to_char(v_pic, 'DD/MM');
        select coalesce(jsonb_agg(jsonb_build_object('vehicule', v.immatriculation, 'motif', i.motif, 'retour_prevu', i.fin_prevue_le)), '[]'::jsonb) into v_immo
        from public.loc_immobilisations i join public.loc_vehicules v on v.id = i.vehicule_id
        where i.client_id = v_client and i.fin_le is null and i.motif <> 'preparation' and v.categorie_id = d.categorie_id
          and coalesce(private.loc_position_vehicule(v_client, v.id, now()), v.entite_id) = d.entite_id
          and coalesce(i.fin_prevue_le, 'infinity'::timestamptz) > ((v_pic::timestamp + time '07:00') at time zone v_fuseau);
        insert into public.loc_transferts (client_id, vehicule_id, categorie_id, origine_entite_id, destination_entite_id, pour_le, jour_pic, tournee, motif, propose_par)
        values (v_client, v_vehicule, d.categorie_id, s.entite_id, d.entite_id, v_pour, v_pic, left(v_cle, 200),
                jsonb_build_object('manque', d.manque, 'surplus', s.surplus, 'immobilises_a_destination', v_immo), (select auth.uid()));
        v_pris_ids := array_append(v_pris_ids, v_vehicule);
        v_tournees := v_tournees || jsonb_build_object(v_cle, coalesce((v_tournees ->> v_cle)::int, 0) + 1);
        v_pris := v_pris + 1;
        v_besoin := v_besoin - 1;
        v_n := v_n + 1;
      end loop;
    end loop;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.transferts_proposes', 'loc_transferts', v_pic::text,
    jsonb_build_object('pic', v_pic, 'transferts', v_n, 'tournees', v_tournees, 'par', (select auth.uid())), null);
  return jsonb_build_object('pic', v_pic, 'manque', greatest(v_max, 0), 'transferts', v_n, 'tournees', v_tournees);
end $function$;

-- Valider ou refuser une tournée entière (ou un transfert, p_tournee null).
CREATE OR REPLACE FUNCTION public.loc_decider_transferts(p_tournee text, p_valider boolean, p_transfert uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Les transferts se valident par la direction ou un valideur.');
  v_n integer;
begin
  if p_valider is null or (p_tournee is null and p_transfert is null) then
    raise exception 'Une tournée ou un transfert, valider ou refuser.' using errcode = '22023';
  end if;
  update public.loc_transferts
     set statut = case when p_valider then 'valide' else 'refuse' end, decide_par = (select auth.uid()), decide_le = now()
   where client_id = v_client and statut = 'propose' and (tournee = p_tournee or id = p_transfert);
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Rien à décider : la tournée n''a plus de transfert proposé.' using errcode = 'P0002';
  end if;
  perform private.journaliser_module(v_client, 'tavaro', case when p_valider then 'tavaro.transferts_valides' else 'tavaro.transferts_refuses' end,
    'loc_transferts', coalesce(p_transfert::text, p_tournee), jsonb_build_object('tournee', p_tournee, 'transferts', v_n, 'par', (select auth.uid())), null);
  return jsonb_build_object('transferts', v_n, 'statut', case when p_valider then 'valide' else 'refuse' end);
end $function$;

-- Le véhicule est arrivé : sa position suit.
CREATE OR REPLACE FUNCTION public.loc_transfert_fait(p_transfert uuid, p_convoyeur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un transfert se clôt par l''agence.');
  t public.loc_transferts;
begin
  select * into t from public.loc_transferts where client_id = v_client and id = p_transfert for update;
  if not found or not (private.voit_entite(v_client, t.origine_entite_id) or private.voit_entite(v_client, t.destination_entite_id)) then
    raise exception 'Transfert introuvable.' using errcode = 'P0002';
  end if;
  if t.statut <> 'valide' then
    raise exception 'Un transfert se fait une fois validé (statut : %).', t.statut using errcode = '23514';
  end if;
  update public.loc_transferts set statut = 'fait', fait_le = now(), fait_par = (select auth.uid()), convoyeur = left(nullif(btrim(p_convoyeur), ''), 120)
   where id = t.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.transfert_fait', 'loc_transferts', t.id::text,
    jsonb_build_object('vehicule', t.vehicule_id, 'vers', t.destination_entite_id, 'par', (select auth.uid())), t.destination_entite_id);
  return jsonb_build_object('transfert', t.id, 'statut', 'fait');
end $function$;

revoke all on function private.loc_position_vehicule(uuid, uuid, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_tableau_jour(uuid, date, text) from public, anon, authenticated;
grant execute on function private.loc_position_vehicule(uuid, uuid, timestamp with time zone) to service_role;
revoke all on function public.loc_proposer_transferts(date) from public, anon;
revoke all on function public.loc_decider_transferts(text, boolean, uuid) from public, anon;
revoke all on function public.loc_transfert_fait(uuid, text) from public, anon;
grant execute on function public.loc_proposer_transferts(date) to authenticated, service_role;
grant execute on function public.loc_decider_transferts(text, boolean, uuid) to authenticated, service_role;
grant execute on function public.loc_transfert_fait(uuid, text) to authenticated, service_role;


-- ═══ omega/modules/tavaro/migrations/b2_14_peages.sql @ 814ddc7
-- b2_14 — Les péages en flux libre (module 13 ; session B2, 11/10/2026).
-- La promesse : « Chaque passage sous un portique sans barrière est rattaché au contrat, payé dans les 72 heures, puis
-- refacturé au client. »
--
-- Sur les autoroutes en flux libre (A79, A13-A14, A4 Nord…), le passage se paie en ligne sous 72 heures, sinon une
-- indemnité forfaitaire arrive au titulaire de la carte grise : le loueur. Les passages arrivent par l'export du compte
-- flotte de l'opérateur, ou se saisissent ; Tavaro les rattache au contrat par la plaque et l'heure (comme les avis de
-- contravention, b2_03), compte les 72 heures, et refacture au locataire par le chemin de toute facture (une ligne PEAGE
-- au montant réel, plus FRAIS_PEAGE si le barème la porte). Le paiement lui-même se fait chez l'opérateur : Tavaro en
-- garde la référence. Le compte flotte de l'opérateur est un tiers (Teo).

create table if not exists public.loc_passages_peage (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  operateur text not null,
  portique text,
  passe_le timestamp with time zone not null,
  immatriculation text not null,
  vehicule_id uuid,
  classe text,
  montant_eur numeric(10,2) not null,
  reference text not null,
  payer_avant timestamp with time zone not null,
  statut text not null default 'a_payer',
  paye_le timestamp with time zone,
  paiement_reference text,
  contrat_id uuid,
  locataire_id uuid,
  rapprochement text,
  candidats smallint not null default 0,
  refacture_proposition_id uuid,
  a_la_charge_motif text,
  source text not null default 'saisie',
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_passages_peage_pkey primary key (id),
  constraint loc_passages_peage_client_id_id_key unique (client_id, id),
  constraint loc_passages_peage_une_fois unique (client_id, operateur, reference),
  constraint loc_passages_peage_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_passages_peage_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_passages_peage_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_passages_peage_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_passages_peage_statut_check check (statut in ('a_payer', 'paye', 'refacture', 'a_la_charge_du_loueur')),
  constraint loc_passages_peage_paye check (statut not in ('paye', 'refacture') or paye_le is not null),
  constraint loc_passages_peage_rapprochement_check check (rapprochement in ('auto', 'manuel')),
  constraint loc_passages_peage_source_check check (source in ('saisie', 'import')),
  constraint loc_passages_peage_montant_check check (montant_eur >= 0 and montant_eur <= 1000),
  constraint loc_passages_peage_textes check (char_length(operateur) between 2 and 80 and char_length(portique) <= 120 and char_length(reference) between 1 and 80
                                               and char_length(paiement_reference) <= 80 and char_length(classe) <= 10 and char_length(a_la_charge_motif) <= 300)
);
comment on table public.loc_passages_peage is 'b2_14 : passages sous les portiques en flux libre, rattachés au contrat, payés sous 72 h, refacturés';
create index if not exists loc_passages_peage_a_payer on public.loc_passages_peage (client_id, payer_avant) where statut = 'a_payer';
create index if not exists loc_passages_peage_contrat on public.loc_passages_peage (client_id, contrat_id);

alter table public.loc_passages_peage enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_passages_peage' and policyname = 'on voit les passages de son agence') then
    create policy "on voit les passages de son agence" on public.loc_passages_peage for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
                       else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_passages_peage_toucher' and tgrelid = 'public.loc_passages_peage'::regclass) then
    create trigger loc_passages_peage_toucher before update on public.loc_passages_peage for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_passages_peage_tracer' and tgrelid = 'public.loc_passages_peage'::regclass) then
    create trigger loc_passages_peage_tracer after insert or update on public.loc_passages_peage for each row execute function private.tracer('maj_le');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_passages_peage') then
    alter publication supabase_realtime add table public.loc_passages_peage;
  end if;
end $$;
revoke all on table public.loc_passages_peage from public, anon, authenticated;
grant select on table public.loc_passages_peage to authenticated;
grant all on table public.loc_passages_peage to service_role;

-- Les passages reçus (export du compte flotte, ou saisie). Idempotent sur (opérateur, référence).
-- p_lignes : [{operateur, reference, passe_le, immatriculation, montant_eur, portique?, classe?, payer_avant?}]
CREATE OR REPLACE FUNCTION public.loc_enregistrer_passages(p_lignes jsonb, p_source text DEFAULT 'saisie'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Les passages de péage s''enregistrent par l''agence.');
  x jsonb;
  v_passe timestamptz;
  v_montant numeric;
  v_plaque text;
  v_id uuid;
  v_contrat uuid;
  v_locataire uuid;
  v_entite uuid;
  v_vehicule uuid;
  v_candidats integer;
  v_nouveaux integer := 0;
  v_deja integer := 0;
  v_rapproches integer := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Les passages forment un tableau non vide.' using errcode = '22023';
  end if;
  if p_source not in ('saisie', 'import') then
    raise exception 'Source inconnue.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_lignes) loop
    begin
      v_passe := (x ->> 'passe_le')::timestamptz;
      v_montant := round((x ->> 'montant_eur')::numeric, 2);
    exception when others then
      raise exception 'Passage illisible (heure ou montant) : %.', left(x::text, 120) using errcode = '22023';
    end;
    if v_passe is null or v_montant is null or nullif(btrim(x ->> 'reference'), '') is null or nullif(btrim(x ->> 'operateur'), '') is null
       or nullif(btrim(x ->> 'immatriculation'), '') is null then
      raise exception 'Chaque passage a un opérateur, une référence, une heure, une plaque et un montant.' using errcode = '22023';
    end if;
    if v_passe > now() + interval '1 hour' then
      raise exception 'Un passage n''est pas daté dans le futur (référence %).', x ->> 'reference' using errcode = '22023';
    end if;
    v_plaque := (select p.plaque from private.loc_plaque(x ->> 'immatriculation') p);
    select count(*), min(r.contrat_id::text)::uuid, min(r.locataire_id::text)::uuid, min(r.entite_id::text)::uuid, min(r.vehicule_id::text)::uuid
      into v_candidats, v_contrat, v_locataire, v_entite, v_vehicule
    from private.loc_rapprocher_avis(v_client, x ->> 'immatriculation', v_passe) r;
    if v_candidats <> 1 then
      v_contrat := null; v_locataire := null;
      select v.id, v.entite_id into v_vehicule, v_entite from public.loc_vehicules v where v.client_id = v_client and v.immatriculation = v_plaque;
    end if;
    insert into public.loc_passages_peage (client_id, entite_id, operateur, portique, passe_le, immatriculation, vehicule_id, classe, montant_eur,
                                           reference, payer_avant, contrat_id, locataire_id, rapprochement, candidats, source, cree_par)
    values (v_client, v_entite, left(btrim(x ->> 'operateur'), 80), left(nullif(btrim(x ->> 'portique'), ''), 120), v_passe, coalesce(v_plaque, left(x ->> 'immatriculation', 20)),
            v_vehicule, left(nullif(btrim(x ->> 'classe'), ''), 10), v_montant, left(btrim(x ->> 'reference'), 80),
            coalesce(nullif(x ->> 'payer_avant', '')::timestamptz, v_passe + interval '72 hours'),
            v_contrat, v_locataire, case when v_contrat is not null then 'auto' end, v_candidats, p_source, (select auth.uid()))
    on conflict on constraint loc_passages_peage_une_fois do nothing
    returning id into v_id;
    if v_id is null then
      v_deja := v_deja + 1;
    else
      v_nouveaux := v_nouveaux + 1;
      if v_contrat is not null then v_rapproches := v_rapproches + 1; end if;
    end if;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.passages_enregistres', 'loc_passages_peage', null,
    jsonb_build_object('nouveaux', v_nouveaux, 'deja', v_deja, 'rapproches', v_rapproches, 'source', p_source, 'par', (select auth.uid())), null);
  return jsonb_build_object('nouveaux', v_nouveaux, 'deja', v_deja, 'rapproches', v_rapproches);
end $function$;

-- Le passage vu par la personne connectée.
CREATE OR REPLACE FUNCTION private.loc_passage_de_l_agence(p_passage uuid)
 RETURNS public.loc_passages_peage
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Les péages se traitent par l''agence.');
  x public.loc_passages_peage;
begin
  select * into x from public.loc_passages_peage where client_id = v_client and id = p_passage;
  if not found or (x.entite_id is not null and not private.voit_entite(v_client, x.entite_id))
     or (x.entite_id is null and not private.a_un_role(v_client, array['gerant', 'admin', 'valideur'])) then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  return x;
end $function$;

-- Le passage est payé chez l'opérateur : Tavaro garde la référence du paiement.
CREATE OR REPLACE FUNCTION public.loc_payer_passage(p_passage uuid, p_reference text, p_paye_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x public.loc_passages_peage := private.loc_passage_de_l_agence(p_passage);
begin
  if x.statut <> 'a_payer' then
    raise exception 'Ce passage n''est plus à payer (%).', x.statut using errcode = '23514';
  end if;
  if nullif(btrim(coalesce(p_reference, '')), '') is null then
    raise exception 'La référence du paiement chez l''opérateur est obligatoire.' using errcode = '22023';
  end if;
  update public.loc_passages_peage set statut = 'paye', paye_le = coalesce(p_paye_le, now()), paiement_reference = left(btrim(p_reference), 80) where id = x.id;
  perform private.journaliser_module(x.client_id, 'tavaro', 'tavaro.passage_paye', 'loc_passages_peage', x.id::text,
    jsonb_build_object('reference', x.reference, 'montant', x.montant_eur, 'dans_le_delai', coalesce(p_paye_le, now()) <= x.payer_avant, 'par', (select auth.uid())), x.entite_id);
  return jsonb_build_object('passage', x.id, 'statut', 'paye', 'dans_le_delai', coalesce(p_paye_le, now()) <= x.payer_avant);
end $function$;

-- Le rattachement à la main (plaque mal lue, deux contrats le même jour).
CREATE OR REPLACE FUNCTION public.loc_rattacher_passage(p_passage uuid, p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x public.loc_passages_peage := private.loc_passage_de_l_agence(p_passage);
  c public.loc_contrats;
begin
  select * into c from public.loc_contrats where client_id = x.client_id and id = p_contrat;
  if not found or not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if x.refacture_proposition_id is not null then
    raise exception 'Ce passage est déjà refacturé.' using errcode = '23514';
  end if;
  update public.loc_passages_peage set contrat_id = c.id, locataire_id = c.locataire_id, entite_id = c.entite_id, rapprochement = 'manuel' where id = x.id;
  perform private.journaliser_module(x.client_id, 'tavaro', 'tavaro.passage_rattache', 'loc_passages_peage', x.id::text,
    jsonb_build_object('contrat', c.numero, 'par', (select auth.uid())), c.entite_id);
  return jsonb_build_object('passage', x.id, 'contrat', c.id);
end $function$;

-- Refacturer au locataire les passages payés d'un contrat : une proposition (lignes PEAGE au montant réel, FRAIS_PEAGE
-- par passage si le barème la porte), qui suit validation, facture et courriel.
CREATE OR REPLACE FUNCTION public.loc_refacturer_peages(p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Les péages se refacturent par l''agence.');
  c public.loc_contrats;
  lp public.loc_bareme_lignes;
  lf public.loc_bareme_lignes;
  x public.loc_passages_peage;
  v_fuseau text;
  v_bareme uuid;
  v_version integer;
  v_prop uuid;
  v_rang integer := 0;
  v_n integer := 0;
  v_taux numeric;
  v_ht numeric;
begin
  select * into c from public.loc_contrats where client_id = v_client and id = p_contrat;
  if not found or not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.loc_passages_peage p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut = 'paye' and p.refacture_proposition_id is null) then
    raise exception 'Aucun passage payé à refacturer sur ce contrat : payez d''abord les passages chez l''opérateur.' using errcode = '55000';
  end if;
  if exists (select 1 from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut in ('calculee', 'preuve_manquante', 'a_valider', 'validee')) then
    raise exception 'Une facture de ce contrat est en cours : refacturez les péages une fois émise.' using errcode = '55000';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = c.client_id and e.id = c.entite_id;
  v_bareme := private.loc_bareme_en_vigueur(c.client_id, (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date);
  select * into lp from public.loc_bareme_lignes l where l.client_id = c.client_id and l.bareme_id = v_bareme and l.code = 'PEAGE' order by l.categorie_id nulls last limit 1;
  if lp.id is null then
    raise exception 'Ajoutez au barème la ligne PEAGE (péage refacturé au montant réel, prévu par vos conditions générales).' using errcode = '23514';
  end if;
  select * into lf from public.loc_bareme_lignes l where l.client_id = c.client_id and l.bareme_id = v_bareme and l.code = 'FRAIS_PEAGE' order by l.categorie_id nulls last limit 1;
  select coalesce(max(p.version), 0) + 1 into v_version from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id;
  insert into public.loc_propositions (client_id, entite_id, contrat_id, version, source, bareme_id, entrees, calculee_par)
  values (c.client_id, c.entite_id, c.id, v_version, 'saisie', v_bareme, jsonb_build_object('objet', 'peages'), (select auth.uid()))
  returning id into v_prop;
  for x in select * from public.loc_passages_peage p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut = 'paye' and p.refacture_proposition_id is null order by p.passe_le loop
    v_rang := v_rang + 1;
    -- le péage payé est un montant toutes taxes : refacturé sur une ligne taxable, il est ramené hors taxes
    v_taux := private.loc_taux_tva(c.client_id, c.entite_id, lp.taux_tva);
    v_ht := case when lp.regime_tva = 'taxable' and coalesce(v_taux, 0) > 0 then round(x.montant_eur / (1 + v_taux / 100), 2) else x.montant_eur end;
    perform private.loc_poser_ligne(c.client_id, v_prop, v_rang, 'frais', lp.famille, lp.code,
      format('%s — %s, %s', lp.libelle, coalesce(x.portique, x.operateur), to_char(x.passe_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI')),
      lp.id, lp.unite, 1, v_ht, v_ht, lp.regime_tva, v_taux, 'chiffree',
      jsonb_build_object('passage', x.id, 'operateur', x.operateur, 'reference', x.reference, 'paiement', x.paiement_reference),
      jsonb_build_array(jsonb_build_object('note', format('Passage %s chez %s, payé le %s (référence %s)', x.reference, x.operateur,
                                                          to_char(x.paye_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY'), x.paiement_reference))),
      false);
    if lf.id is not null and lf.prix_eur is not null then
      v_rang := v_rang + 1;
      perform private.loc_poser_ligne(c.client_id, v_prop, v_rang, 'frais', lf.famille, lf.code, lf.libelle || ' — passage ' || x.reference,
        lf.id, lf.unite, 1, lf.prix_eur, round(lf.prix_eur, 2), lf.regime_tva, private.loc_taux_tva(c.client_id, c.entite_id, lf.taux_tva), 'chiffree',
        jsonb_build_object('passage', x.id), '[]'::jsonb, false);
    end if;
    update public.loc_passages_peage set refacture_proposition_id = v_prop, statut = 'refacture' where id = x.id;
    v_n := v_n + 1;
  end loop;
  update public.loc_propositions p
     set statut = 'calculee',
         total_ht = (select coalesce(sum(l.montant_ht), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_tva = (select coalesce(sum(l.montant_tva), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_frais_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop)
   where p.id = v_prop;
  perform private.deposer_travail(c.client_id, 'tavaro', 'tavaro.deposer_demande', jsonb_build_object('proposition', v_prop), 'tavaro:deposer:' || v_prop::text, 0::smallint);
  perform private.journaliser_module(c.client_id, 'tavaro', 'tavaro.peages_refactures', 'loc_contrats', c.id::text,
    jsonb_build_object('contrat', c.numero, 'passages', v_n, 'proposition', v_prop), c.entite_id);
  return jsonb_build_object('contrat', c.id, 'proposition', v_prop, 'passages', v_n);
end $function$;

-- Un passage que le loueur garde à sa charge (convoyage, véhicule de l'agence) : motif obligatoire.
CREATE OR REPLACE FUNCTION public.loc_passage_a_la_charge(p_passage uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x public.loc_passages_peage := private.loc_passage_de_l_agence(p_passage);
begin
  if x.statut not in ('a_payer', 'paye') or x.refacture_proposition_id is not null then
    raise exception 'Ce passage est déjà refacturé ou classé.' using errcode = '23514';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Dites pourquoi (cinq caractères au moins).' using errcode = '22023';
  end if;
  if x.statut = 'a_payer' then
    raise exception 'Payez d''abord le passage chez l''opérateur : à la charge du loueur ne veut pas dire impayé.' using errcode = '55000';
  end if;
  update public.loc_passages_peage set statut = 'a_la_charge_du_loueur', a_la_charge_motif = left(btrim(p_motif), 300) where id = x.id;
  perform private.journaliser_module(x.client_id, 'tavaro', 'tavaro.passage_a_la_charge', 'loc_passages_peage', x.id::text,
    jsonb_build_object('motif', left(btrim(p_motif), 300), 'par', (select auth.uid())), x.entite_id);
  return jsonb_build_object('passage', x.id, 'statut', 'a_la_charge_du_loueur');
end $function$;

-- Toutes les heures : un passage à payer dont les 72 heures finissent dans moins de 24 heures, ou sont passées.
CREATE OR REPLACE FUNCTION private.loc_surveiller_peages(p_maintenant timestamp with time zone DEFAULT now())
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
    select p.client_id, count(*) as nb, sum(p.montant_eur) as total, min(p.payer_avant) as premier,
           count(*) filter (where p.payer_avant < p_maintenant) as depasses
    from public.loc_passages_peage p
    where p.statut = 'a_payer' and p.payer_avant < p_maintenant + interval '24 hours'
    group by p.client_id
  loop
    perform private.lever_alerte_module(r.client_id, 'tavaro', case when r.depasses > 0 then 'critique' else 'attention' end,
      case when r.depasses > 0
           then format('%s passage(s) de péage en flux libre ont dépassé les 72 heures : l''indemnité forfaitaire va arriver au loueur. Payez-les aujourd''hui.', r.depasses)
           else format('%s passage(s) de péage à payer avant demain (%s €) : le premier avant le %s.', r.nb, replace(round(r.total, 2)::text, '.', ','),
                       private.loc_heure_locale(r.premier, r.client_id, null, 'DD/MM à HH24:MI')) end,
      jsonb_build_object('passages', r.nb, 'depasses', r.depasses), 'peages:' || to_char(p_maintenant, 'YYYYMMDDHH24'), true, null);
    n := n + 1;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-peages') then
    perform cron.schedule('tavaro-peages', '35 * * * *', 'select private.loc_surveiller_peages()');
  end if;
end $$;

revoke all on function private.loc_passage_de_l_agence(uuid) from public, anon, authenticated;
revoke all on function private.loc_surveiller_peages(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_peages(timestamp with time zone) to service_role;
revoke all on function public.loc_enregistrer_passages(jsonb, text) from public, anon;
revoke all on function public.loc_payer_passage(uuid, text, timestamp with time zone) from public, anon;
revoke all on function public.loc_rattacher_passage(uuid, uuid) from public, anon;
revoke all on function public.loc_refacturer_peages(uuid) from public, anon;
revoke all on function public.loc_passage_a_la_charge(uuid, text) from public, anon;
grant execute on function public.loc_enregistrer_passages(jsonb, text) to authenticated, service_role;
grant execute on function public.loc_payer_passage(uuid, text, timestamp with time zone) to authenticated, service_role;
grant execute on function public.loc_rattacher_passage(uuid, uuid) to authenticated, service_role;
grant execute on function public.loc_refacturer_peages(uuid) to authenticated, service_role;
grant execute on function public.loc_passage_a_la_charge(uuid, text) to authenticated, service_role;


-- ═══ omega/modules/tavaro/migrations/b2_15_sinistres.sql @ 814ddc7
-- b2_15 — Sinistres et recours (module 18 ; session B2, 11/10/2026).
-- La promesse : « Chaque accident est suivi du constat au règlement, et le recours contre l'assureur du client est
-- préparé pour les jours d'immobilisation. » (et, dans l'Assistance : « Le dossier d'accident est ensuite suivi jusqu'au
-- règlement. »)
--
-- LE DOSSIER : ouvert depuis le contrat (ou le véhicule), avec le constat, le tiers et son assureur, la responsabilité ;
-- il avance (expertise, réparation, recours, réglé, clos) et garde son historique ; le véhicule immobilisé l'est par
-- b2_10 (motif sinistre). LE RECOURS (perte d'exploitation) : les jours où le véhicule n'a pas pu être loué — lus sur ses
-- immobilisations depuis le sinistre — multipliés par son tarif journalier moyen (les contrats de sa catégorie sur douze
-- mois), au prorata de la responsabilité du tiers ; le courrier part à l'assureur du tiers par le chemin de tout envoi
-- (validation comprise), et Tavaro relance à trente jours sans réponse.

create table if not exists public.loc_sinistres (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  contrat_id uuid,
  vehicule_id uuid not null,
  reference text not null,
  survenu_le timestamp with time zone not null,
  lieu text,
  nature text not null,
  responsabilite text not null default 'inconnue',
  description text,
  tiers jsonb not null default '{}'::jsonb,
  constat_piece_id uuid,
  statut text not null default 'ouvert',
  expert jsonb not null default '{}'::jsonb,
  montant_reparation_eur numeric(12,2),
  franchise_eur numeric(12,2),
  immobilisation_id uuid,
  recours jsonb,
  regle_le date,
  montant_recu_eur numeric(12,2),
  historique jsonb not null default '[]'::jsonb,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_sinistres_pkey primary key (id),
  constraint loc_sinistres_client_id_id_key unique (client_id, id),
  constraint loc_sinistres_reference_un unique (client_id, reference),
  constraint loc_sinistres_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_sinistres_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_sinistres_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_sinistres_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_sinistres_nature_check check (nature in ('accident', 'vol', 'vandalisme', 'bris_de_glace', 'incendie', 'catastrophe_naturelle', 'autre')),
  constraint loc_sinistres_responsabilite_check check (responsabilite in ('locataire', 'tiers', 'partagee', 'inconnue')),
  constraint loc_sinistres_statut_check check (statut in ('ouvert', 'expertise', 'reparation', 'recours', 'regle', 'clos')),
  constraint loc_sinistres_regle check (statut not in ('regle') or regle_le is not null),
  constraint loc_sinistres_objets check (jsonb_typeof(tiers) = 'object' and jsonb_typeof(expert) = 'object' and jsonb_typeof(historique) = 'array'),
  constraint loc_sinistres_textes check (char_length(lieu) <= 300 and char_length(description) <= 4000 and char_length(reference) <= 40),
  constraint loc_sinistres_montants check (montant_reparation_eur >= 0 and franchise_eur >= 0 and montant_recu_eur >= 0)
);
comment on table public.loc_sinistres is 'b2_15 : dossiers de sinistre du constat au règlement, et le recours pour les jours d''immobilisation';
create index if not exists loc_sinistres_ouverts on public.loc_sinistres (client_id, statut) where statut not in ('regle', 'clos');

alter table public.loc_sinistres enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_sinistres' and policyname = 'on voit les sinistres de son agence') then
    create policy "on voit les sinistres de son agence" on public.loc_sinistres for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
                       else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_sinistres_toucher' and tgrelid = 'public.loc_sinistres'::regclass) then
    create trigger loc_sinistres_toucher before update on public.loc_sinistres for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_sinistres_tracer' and tgrelid = 'public.loc_sinistres'::regclass) then
    -- liste blanche : le tiers (identité, police) ne part pas dans la trace
    create trigger loc_sinistres_tracer after insert or update on public.loc_sinistres for each row
      execute function private.tracer('+reference', '+vehicule_id', '+contrat_id', '+nature', '+responsabilite', '+statut', '+regle_le', '+montant_recu_eur');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_sinistres') then
    alter publication supabase_realtime add table public.loc_sinistres;
  end if;
end $$;
revoke all on table public.loc_sinistres from public, anon, authenticated;
grant select on table public.loc_sinistres to authenticated;
grant all on table public.loc_sinistres to service_role;

-- Un dossier vu par la personne connectée.
CREATE OR REPLACE FUNCTION private.loc_sinistre_de_l_agence(p_sinistre uuid, p_roles text[], p_refus text)
 RETURNS public.loc_sinistres
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(p_roles, p_refus);
  s public.loc_sinistres;
begin
  select * into s from public.loc_sinistres where client_id = v_client and id = p_sinistre;
  if not found or (s.entite_id is not null and not private.voit_entite(v_client, s.entite_id))
     or (s.entite_id is null and not private.a_un_role(v_client, array['gerant', 'admin', 'valideur'])) then
    raise exception 'Dossier de sinistre introuvable.' using errcode = 'P0002';
  end if;
  return s;
end $function$;

-- Ouvrir le dossier. p_valeurs : {contrat? | vehicule, survenu_le, nature, lieu?, description?, responsabilite?,
-- tiers? {nom, assureur, assureur_adresse, police, immatriculation, telephone}, immobilise? (bool), fin_prevue_le?}
CREATE OR REPLACE FUNCTION public.loc_ouvrir_sinistre(p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un sinistre se déclare par l''agence.');
  c public.loc_contrats;
  v public.loc_vehicules;
  v_survenu timestamptz;
  v_entite uuid;
  v_id uuid;
  v_ref text;
  v_immo jsonb;
  v_n integer;
begin
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  if coalesce(p_valeurs ->> 'nature', '') not in ('accident', 'vol', 'vandalisme', 'bris_de_glace', 'incendie', 'catastrophe_naturelle', 'autre') then
    raise exception 'Nature du sinistre inconnue.' using errcode = '22023';
  end if;
  if coalesce(p_valeurs ->> 'responsabilite', 'inconnue') not in ('locataire', 'tiers', 'partagee', 'inconnue') then
    raise exception 'Responsabilité inconnue : locataire, tiers, partagee ou inconnue.' using errcode = '22023';
  end if;
  begin
    v_survenu := (p_valeurs ->> 'survenu_le')::timestamptz;
  exception when others then
    raise exception 'Date du sinistre illisible.' using errcode = '22007';
  end;
  if v_survenu is null or v_survenu > now() + interval '1 hour' then
    raise exception 'La date du sinistre est obligatoire et passée.' using errcode = '22023';
  end if;
  if nullif(p_valeurs ->> 'contrat', '') is not null then
    select * into c from public.loc_contrats where client_id = v_client and id = (p_valeurs ->> 'contrat')::uuid;
    if not found or not private.voit_entite(c.client_id, c.entite_id) then
      raise exception 'Contrat introuvable.' using errcode = 'P0002';
    end if;
    if c.vehicule_id is null then
      raise exception 'Ce contrat n''a pas de véhicule.' using errcode = '23514';
    end if;
    select * into v from public.loc_vehicules where client_id = v_client and id = c.vehicule_id;
    v_entite := c.entite_id;
  else
    select * into v from public.loc_vehicules where client_id = v_client and id = nullif(p_valeurs ->> 'vehicule', '')::uuid;
    if not found then
      raise exception 'Un sinistre se rattache à un contrat ou à un véhicule.' using errcode = '22023';
    end if;
    v_entite := v.entite_id;
  end if;
  if jsonb_typeof(coalesce(p_valeurs -> 'tiers', '{}'::jsonb)) <> 'object' then
    raise exception 'Le tiers est un objet.' using errcode = '22023';
  end if;
  select count(*) + 1 into v_n from public.loc_sinistres s where s.client_id = v_client and extract(year from s.cree_le) = extract(year from now());
  v_ref := 'SIN-' || to_char(now(), 'YYYY') || '-' || lpad(v_n::text, 4, '0');
  insert into public.loc_sinistres (client_id, entite_id, contrat_id, vehicule_id, reference, survenu_le, lieu, nature, responsabilite, description, tiers, historique, cree_par)
  values (v_client, v_entite, c.id, v.id, v_ref, v_survenu, private.loc_lire_texte(p_valeurs, 'lieu', 300), p_valeurs ->> 'nature',
          coalesce(p_valeurs ->> 'responsabilite', 'inconnue'), private.loc_lire_texte(p_valeurs, 'description', 4000), coalesce(p_valeurs -> 'tiers', '{}'::jsonb),
          jsonb_build_array(jsonb_build_object('le', now(), 'statut', 'ouvert', 'par', (select auth.uid()))), (select auth.uid()))
  returning id into v_id;
  if coalesce((p_valeurs ->> 'immobilise')::boolean, false) then
    v_immo := public.loc_immobiliser(v.id, jsonb_build_object('motif', 'sinistre', 'debut_le', greatest(v_survenu, now() - interval '30 days'),
                                                             'fin_prevue_le', nullif(p_valeurs ->> 'fin_prevue_le', ''), 'notes', 'Sinistre ' || v_ref));
    update public.loc_sinistres set immobilisation_id = (v_immo ->> 'immobilisation')::uuid where id = v_id;
  end if;
  perform private.lever_alerte_module(v_client, 'tavaro', 'attention',
    format('Sinistre %s déclaré sur %s (%s) : le dossier est ouvert.', v_ref, v.immatriculation, replace(p_valeurs ->> 'nature', '_', ' ')),
    jsonb_build_object('sinistre', v_id), 'sinistre:ouvert:' || v_id::text, true, null);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.sinistre_ouvert', 'loc_sinistres', v_id::text,
    jsonb_build_object('reference', v_ref, 'vehicule', v.immatriculation, 'nature', p_valeurs ->> 'nature', 'responsabilite', coalesce(p_valeurs ->> 'responsabilite', 'inconnue')), v_entite);
  return jsonb_build_object('sinistre', v_id, 'reference', v_ref, 'a_reaffecter', coalesce(v_immo -> 'a_reaffecter', '[]'::jsonb));
end $function$;

-- Faire avancer le dossier : expertise, réparation, recours, réglé, clos ; et compléter (tiers, expert, montants).
-- p_valeurs : {responsabilite?, tiers?, expert?, montant_reparation_eur?, franchise_eur?, regle_le?, montant_recu_eur?, note?}
CREATE OR REPLACE FUNCTION public.loc_avancer_sinistre(p_sinistre uuid, p_statut text, p_valeurs jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.loc_sinistres := private.loc_sinistre_de_l_agence(p_sinistre, array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un sinistre se suit par l''agence.');
  v_statut text := coalesce(nullif(p_statut, ''), s.statut);
begin
  if v_statut not in ('ouvert', 'expertise', 'reparation', 'recours', 'regle', 'clos') then
    raise exception 'Étape inconnue.' using errcode = '22023';
  end if;
  if s.statut = 'clos' then
    raise exception 'Ce dossier est clos.' using errcode = '23514';
  end if;
  if v_statut in ('regle', 'clos') and not private.a_un_role(s.client_id, array['gerant', 'admin', 'valideur']) then
    raise exception 'Un dossier se règle ou se clôt par la direction ou un valideur.' using errcode = '42501';
  end if;
  if v_statut = 'regle' and nullif(p_valeurs ->> 'regle_le', '') is null and s.regle_le is null then
    raise exception 'La date du règlement est obligatoire.' using errcode = '22023';
  end if;
  if p_valeurs ? 'responsabilite' and p_valeurs ->> 'responsabilite' not in ('locataire', 'tiers', 'partagee', 'inconnue') then
    raise exception 'Responsabilité inconnue.' using errcode = '22023';
  end if;
  begin
    update public.loc_sinistres
       set statut = v_statut,
           responsabilite = coalesce(p_valeurs ->> 'responsabilite', responsabilite),
           tiers = case when jsonb_typeof(p_valeurs -> 'tiers') = 'object' then tiers || (p_valeurs -> 'tiers') else tiers end,
           expert = case when jsonb_typeof(p_valeurs -> 'expert') = 'object' then expert || (p_valeurs -> 'expert') else expert end,
           montant_reparation_eur = coalesce(round(nullif(p_valeurs ->> 'montant_reparation_eur', '')::numeric, 2), montant_reparation_eur),
           franchise_eur = coalesce(round(nullif(p_valeurs ->> 'franchise_eur', '')::numeric, 2), franchise_eur),
           regle_le = coalesce(nullif(p_valeurs ->> 'regle_le', '')::date, regle_le),
           montant_recu_eur = coalesce(round(nullif(p_valeurs ->> 'montant_recu_eur', '')::numeric, 2), montant_recu_eur),
           historique = historique || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('le', now(), 'statut', v_statut, 'par', (select auth.uid()),
                                                                                             'note', private.loc_lire_texte(p_valeurs, 'note', 500))))
     where id = s.id;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Valeur illisible.' using errcode = '22023';
  when check_violation then
    raise exception 'Valeur refusée : %.', sqlerrm using errcode = '22023';
  end;
  perform private.journaliser_module(s.client_id, 'tavaro', 'tavaro.sinistre_avance', 'loc_sinistres', s.id::text,
    jsonb_build_object('reference', s.reference, 'de', s.statut, 'vers', v_statut, 'par', (select auth.uid())), s.entite_id);
  return jsonb_build_object('sinistre', s.id, 'statut', v_statut);
end $function$;

-- Préparer le recours pour les jours d'immobilisation, et l'envoyer à l'assureur du tiers (si l'adresse est connue et
-- l'envoi réglé ; sinon le courrier se télécharge). Direction ou valideur.
CREATE OR REPLACE FUNCTION public.loc_preparer_recours(p_sinistre uuid, p_envoyer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.loc_sinistres := private.loc_sinistre_de_l_agence(p_sinistre, array['gerant', 'admin', 'valideur'], 'Le recours se prépare par la direction ou un valideur.');
  v public.loc_vehicules;
  v_jours numeric;
  v_tarif numeric;
  v_part numeric;
  v_montant numeric;
  v_nom_loueur text;
  v_courrier text;
  v_adresse text := nullif(btrim(coalesce(s.tiers ->> 'assureur_adresse', '')), '');
  v_envoi uuid;
  v_recours jsonb;
begin
  if s.responsabilite not in ('tiers', 'partagee') then
    raise exception 'Un recours se prépare quand le tiers est responsable, en tout ou en partie (responsabilité : %).', s.responsabilite using errcode = '23514';
  end if;
  if nullif(s.tiers ->> 'assureur', '') is null then
    raise exception 'L''assureur du tiers manque au dossier.' using errcode = '22023';
  end if;
  select * into v from public.loc_vehicules where client_id = s.client_id and id = s.vehicule_id;
  -- les jours où le véhicule n'a pas pu être loué : ses immobilisations depuis le sinistre (hors préparation)
  select coalesce(sum(extract(epoch from (least(coalesce(i.fin_le, now()), now()) - greatest(i.debut_le, s.survenu_le))) / 86400), 0)
    into v_jours
  from public.loc_immobilisations i
  where i.client_id = s.client_id and i.vehicule_id = s.vehicule_id and i.motif <> 'preparation' and coalesce(i.fin_le, now()) > s.survenu_le;
  v_jours := ceil(v_jours);
  -- son tarif journalier moyen : les contrats de sa catégorie sur douze mois, sinon les siens
  select avg(c.tarif_jour_eur) into v_tarif from public.loc_contrats c join public.loc_vehicules x on x.id = c.vehicule_id
  where c.client_id = s.client_id and x.categorie_id is not distinct from v.categorie_id and c.tarif_jour_eur is not null
    and c.depart_le > now() - interval '365 days' and c.statut <> 'annule';
  if v_tarif is null then
    raise exception 'Aucun tarif journalier connu pour cette catégorie : le recours ne peut pas être chiffré.' using errcode = '55000';
  end if;
  if v_jours < 1 then
    raise exception 'Aucun jour d''immobilisation depuis le sinistre : immobilisez le véhicule (carrosserie, sinistre) pour chiffrer le recours.' using errcode = '55000';
  end if;
  v_part := case s.responsabilite when 'tiers' then 1 else 0.5 end;
  v_montant := round(v_jours * v_tarif * v_part, 2);
  select coalesce(g.emetteur ->> 'nom', (select x.nom from public.clients x where x.id = s.client_id)) into v_nom_loueur from public.loc_reglages g where g.client_id = s.client_id;
  v_courrier := format(E'Objet : recours — perte d''exploitation du véhicule %s — sinistre du %s\nVotre assuré : %s%s\n\nMadame, Monsieur,\n\n'
                       'Le %s, le véhicule %s%s, appartenant à %s et loué à cette date, a été endommagé lors d''un sinistre dont votre assuré est %s.\n\n'
                       'Le véhicule n''a pas pu être loué pendant %s jour%s (immobilisation constatée du %s au %s). Sur la base de son tarif journalier moyen (%s € TTC, contrats de sa catégorie sur douze mois), '
                       'la perte d''exploitation s''élève à %s €%s.\n\nNous vous remercions de bien vouloir nous adresser votre règlement, ou votre position, sous trente jours. '
                       'Les justificatifs (constat, immobilisations, contrats) sont à votre disposition.\n\n%s\n',
                       v.immatriculation, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), coalesce(s.tiers ->> 'nom', 'non nommé'),
                       case when s.tiers ->> 'police' is not null then ', contrat n° ' || (s.tiers ->> 'police') else '' end,
                       private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), v.immatriculation, case when v.modele is not null then ' (' || v.modele || ')' else '' end, v_nom_loueur,
                       case s.responsabilite when 'tiers' then 'reconnu responsable' else 'reconnu responsable pour moitié' end,
                       v_jours, case when v_jours > 1 then 's' else '' end, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), private.loc_heure_locale(now(), s.client_id, s.entite_id, 'DD/MM/YYYY'),
                       replace(round(v_tarif, 2)::text, '.', ','), replace(v_montant::text, '.', ','),
                       case when v_part < 1 then ' (la moitié, responsabilité partagée)' else '' end, coalesce(v_nom_loueur, ''));
  if coalesce(p_envoyer, false) then
    if v_adresse is null or v_adresse !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'L''adresse de courriel de l''assureur du tiers manque ou est fausse : complétez le dossier, ou téléchargez le courrier.' using errcode = '22023';
    end if;
    if (private.reglages_envois_effectifs(s.client_id, 'tavaro') ->> 'mode') is null then
      raise exception 'L''envoi par courriel n''est pas réglé pour votre organisation : téléchargez le courrier et envoyez-le vous-même.' using errcode = '55000';
    end if;
    v_envoi := private.preparer_envoi(s.client_id, 'tavaro', 'loc_sinistres', s.id::text, 'email',
      jsonb_build_object('adresse', v_adresse, 'nom', s.tiers ->> 'assureur', 'professionnel', true, 'langue', 'fr'), null, '{}'::jsonb,
      format('Recours — perte d''exploitation — %s — sinistre du %s', v.immatriculation, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY')), v_courrier, null,
      'tavaro:recours:' || s.id::text || ':' || v_montant::text, s.entite_id, true, false, null::timestamptz, '{}'::jsonb);
  end if;
  v_recours := jsonb_build_object('jours', v_jours, 'tarif_moyen', round(v_tarif, 2), 'part', v_part, 'montant', v_montant, 'courrier', v_courrier,
                                  'prepare_le', now(), 'envoi', v_envoi, 'envoye_le', case when v_envoi is not null then now() end);
  update public.loc_sinistres
     set recours = v_recours, statut = case when statut in ('ouvert', 'expertise', 'reparation') then 'recours' else statut end,
         historique = historique || jsonb_build_array(jsonb_build_object('le', now(), 'statut', 'recours', 'montant', v_montant, 'envoye', v_envoi is not null, 'par', (select auth.uid())))
   where id = s.id;
  perform private.journaliser_module(s.client_id, 'tavaro', 'tavaro.recours_prepare', 'loc_sinistres', s.id::text,
    jsonb_build_object('reference', s.reference, 'jours', v_jours, 'montant', v_montant, 'envoi', v_envoi), s.entite_id);
  return v_recours - 'courrier' || jsonb_build_object('sinistre', s.id, 'courrier', v_courrier);
end $function$;

-- Chaque matin : un recours envoyé sans règlement depuis trente jours est à relancer.
CREATE OR REPLACE FUNCTION private.loc_surveiller_sinistres(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  n integer := 0;
begin
  for s in
    select x.* from public.loc_sinistres x
    where x.statut = 'recours' and x.recours is not null and coalesce((x.recours ->> 'envoye_le')::timestamptz, (x.recours ->> 'prepare_le')::timestamptz) < p_maintenant - interval '30 days'
  loop
    perform private.lever_alerte_module(s.client_id, 'tavaro', 'attention',
      format('Le recours du sinistre %s (%s €) attend la réponse de l''assureur depuis plus de trente jours : relancez-le.', s.reference, replace((s.recours ->> 'montant'), '.', ',')),
      jsonb_build_object('sinistre', s.id), 'sinistre:relance:' || s.id::text || ':' || to_char(p_maintenant, 'IYYY-IW'), true, null);
    n := n + 1;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-sinistres') then
    perform cron.schedule('tavaro-sinistres', '40 6 * * *', 'select private.loc_surveiller_sinistres()');
  end if;
end $$;

revoke all on function private.loc_sinistre_de_l_agence(uuid, text[], text) from public, anon, authenticated;
revoke all on function private.loc_surveiller_sinistres(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_sinistres(timestamp with time zone) to service_role;
revoke all on function public.loc_ouvrir_sinistre(jsonb) from public, anon;
revoke all on function public.loc_avancer_sinistre(uuid, text, jsonb) from public, anon;
revoke all on function public.loc_preparer_recours(uuid, boolean) from public, anon;
grant execute on function public.loc_ouvrir_sinistre(jsonb) to authenticated, service_role;
grant execute on function public.loc_avancer_sinistre(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.loc_preparer_recours(uuid, boolean) to authenticated, service_role;


-- ═══ omega/modules/tavaro/migrations/b2_16_interfaces_tiers.sql @ 814ddc7
-- b2_16 — Les contrats d'interface sans fournisseur : Assistance (module 04), Relevés constructeur (module 19), paiement
-- de la caution (préautorisation, capture, libération). Carnet de l'audit, points 4 et 5 ; session B2, 11/10/2026.
--
-- Teo choisira les fournisseurs (voix et dépanneurs, agrégateur de données constructeur, prestataire de paiement).
-- Ce lot pose côté Tavaro tout ce qui ne dépend pas d'eux : les tables, les portes que le fournisseur appellera (service
-- seul), les portes de l'agence, les travaux que l'ouvrier du fournisseur prendra. Le détail des messages est dans
-- omega/modules/tavaro/INTERFACES.md. Aucun appel sortant ici ; aucun secret.
--
--   · Assistance : public.loc_grille_assistance (ce que l'assistant fait, par type d'incident), public.loc_incidents ;
--     portes du fournisseur : loc_assistance_ouvrir (l'appel arrive : contrat retrouvé, action selon la grille, l'agence
--     prévenue), loc_assistance_evenement (missionné, arrivée estimée, transcription, transféré, clos) ; un accident
--     ouvre le dossier de sinistre (b2_15) ;
--   · Relevés constructeur : public.loc_releves_constructeur ; porte du fournisseur loc_enregistrer_releves_constructeur
--     (par numéro de série ou plaque) ; porte de l'agence loc_releve_au_retour(contrat) : le relevé le plus proche du
--     retour, et l'écart avec l'état des lieux ;
--   · Caution : public.loc_cautions ; portes de l'agence : loc_demander_preautorisation, loc_capturer_caution (direction
--     ou valideur, sur une facture du contrat, jamais plus que la préautorisation), loc_liberer_caution ; chacune dépose
--     le travail tavaro.caution que l'ouvrier du prestataire prendra ; porte du prestataire loc_caution_evenement.

-- ── Assistance ──────────────────────────────────────────────────────────────────────────
create table if not exists public.loc_grille_assistance (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  type_incident text not null,
  action text not null,
  prestataire text,
  prestataire_telephone text,
  delai_cible_min integer,
  consignes text,
  rang smallint not null default 0,
  maj_le timestamp with time zone not null default now(),
  constraint loc_grille_assistance_pkey primary key (id),
  constraint loc_grille_assistance_un unique (client_id, type_incident),
  constraint loc_grille_assistance_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_grille_assistance_type_check check (type_incident in ('panne', 'accident', 'cle_perdue', 'crevaison', 'batterie', 'carburant', 'vol', 'autre')),
  constraint loc_grille_assistance_action_check check (action in ('depanneuse', 'vehicule_remplacement', 'serrurier', 'conseil', 'transfert_humain')),
  constraint loc_grille_assistance_textes check (char_length(prestataire) <= 120 and char_length(prestataire_telephone) <= 30 and char_length(consignes) <= 1000),
  constraint loc_grille_assistance_delai check (delai_cible_min between 5 and 1440)
);
create table if not exists public.loc_incidents (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  contrat_id uuid,
  vehicule_id uuid,
  canal text not null,
  appelant_telephone text,
  type_incident text not null,
  description text,
  position text,
  recu_le timestamp with time zone not null default now(),
  action text,
  prestataire text,
  missionne_le timestamp with time zone,
  arrivee_estimee_le timestamp with time zone,
  statut text not null default 'ouvert',
  transfere_le timestamp with time zone,
  transfert_motif text,
  resume text,
  transcription text,
  sinistre_id uuid,
  fournisseur text,
  fournisseur_reference text,
  clos_le timestamp with time zone,
  maj_le timestamp with time zone not null default now(),
  constraint loc_incidents_pkey primary key (id),
  constraint loc_incidents_client_id_id_key unique (client_id, id),
  constraint loc_incidents_fournisseur_un unique (client_id, fournisseur, fournisseur_reference),
  constraint loc_incidents_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_incidents_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_incidents_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_incidents_canal_check check (canal in ('telephone', 'sms', 'messagerie', 'web')),
  constraint loc_incidents_type_check check (type_incident in ('panne', 'accident', 'cle_perdue', 'crevaison', 'batterie', 'carburant', 'vol', 'autre')),
  constraint loc_incidents_statut_check check (statut in ('ouvert', 'missionne', 'transfere', 'clos')),
  constraint loc_incidents_textes check (char_length(description) <= 2000 and char_length(position) <= 300 and char_length(resume) <= 2000
                                         and char_length(transcription) <= 50000 and char_length(transfert_motif) <= 500 and char_length(fournisseur_reference) <= 120)
);
comment on table public.loc_incidents is 'b2_16 : incidents reçus par l''assistance (fournisseur de voix à choisir), traités selon la grille de l''agence';

-- ── Relevés constructeur ────────────────────────────────────────────────────────────────
create table if not exists public.loc_releves_constructeur (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  lu_le timestamp with time zone not null,
  km integer,
  carburant_pct numeric(5,1),
  batterie_pct numeric(5,1),
  autonomie_km integer,
  source text not null,
  reference text,
  recu_le timestamp with time zone not null default now(),
  constraint loc_releves_constructeur_pkey primary key (id),
  constraint loc_releves_constructeur_un unique (client_id, vehicule_id, lu_le, source),
  constraint loc_releves_constructeur_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_releves_constructeur_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_releves_constructeur_valeurs check (km between 0 and 2000000 and carburant_pct between 0 and 100 and batterie_pct between 0 and 100 and autonomie_km between 0 and 3000),
  constraint loc_releves_constructeur_source check (char_length(source) between 2 and 60 and char_length(reference) <= 120)
);
create index if not exists loc_releves_constructeur_vehicule on public.loc_releves_constructeur (client_id, vehicule_id, lu_le desc);
comment on table public.loc_releves_constructeur is 'b2_16 : kilométrage, carburant et batterie lus auprès du constructeur (agrégateur à choisir)';

-- ── Caution ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.loc_cautions (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  contrat_id uuid not null,
  montant_eur numeric(10,2) not null,
  statut text not null default 'demandee',
  prestataire text,
  reference_externe text,
  preautorisee_le timestamp with time zone,
  expire_le timestamp with time zone,
  capture_demandee_eur numeric(10,2),
  capture_eur numeric(10,2),
  capture_facture_id uuid,
  capture_motif text,
  capturee_le timestamp with time zone,
  liberee_le timestamp with time zone,
  erreur text,
  evenements jsonb not null default '[]'::jsonb,
  demande_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_cautions_pkey primary key (id),
  constraint loc_cautions_client_id_id_key unique (client_id, id),
  constraint loc_cautions_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_cautions_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_cautions_facture_fkey foreign key (client_id, capture_facture_id) references public.loc_factures(client_id, id),
  constraint loc_cautions_statut_check check (statut in ('demandee', 'preautorisee', 'capture_demandee', 'capturee', 'liberation_demandee', 'liberee', 'expiree', 'echec')),
  constraint loc_cautions_montants check (montant_eur > 0 and montant_eur <= 100000 and capture_demandee_eur >= 0 and capture_eur >= 0),
  constraint loc_cautions_capture_bornee check (capture_demandee_eur is null or capture_demandee_eur <= montant_eur),
  constraint loc_cautions_textes check (char_length(prestataire) <= 60 and char_length(reference_externe) <= 120 and char_length(capture_motif) <= 500 and char_length(erreur) <= 500)
);
create unique index if not exists loc_cautions_une_active on public.loc_cautions (client_id, contrat_id) where statut in ('demandee', 'preautorisee', 'capture_demandee', 'liberation_demandee');
comment on table public.loc_cautions is 'b2_16 : la caution par carte (préautorisation, capture, libération) ; le prestataire de paiement est à choisir';

do $$
declare t text;
begin
  foreach t in array array['loc_grille_assistance', 'loc_incidents', 'loc_releves_constructeur', 'loc_cautions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_grille_assistance' and policyname = 'membres lisent la grille') then
    create policy "membres lisent la grille" on public.loc_grille_assistance for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_releves_constructeur' and policyname = 'membres lisent les releves constructeur') then
    create policy "membres lisent les releves constructeur" on public.loc_releves_constructeur for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_incidents' and policyname = 'on voit les incidents de son agence') then
    create policy "on voit les incidents de son agence" on public.loc_incidents for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_cautions' and policyname = 'on voit les cautions de son agence') then
    create policy "on voit les cautions de son agence" on public.loc_cautions for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  foreach t in array array['loc_grille_assistance', 'loc_incidents', 'loc_cautions'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_tracer' and tgrelid = ('public.' || t)::regclass) then
      -- la transcription de l'appel ne part pas dans la trace
      execute format('create trigger %I after insert or update on public.%I for each row execute function private.tracer(%L, %L)', t || '_tracer', t, 'maj_le', 'transcription');
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- La grille de l'agence : ce que l'assistant fait pour chaque type d'incident. Direction seule.
-- p_lignes : [{type_incident, action, prestataire?, prestataire_telephone?, delai_cible_min?, consignes?}]
CREATE OR REPLACE FUNCTION public.loc_poser_grille_assistance(p_lignes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin'], 'La grille d''assistance se règle par la direction.');
  x jsonb;
  v_n integer := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception 'La grille est un tableau.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_lignes) loop
    begin
      insert into public.loc_grille_assistance (client_id, type_incident, action, prestataire, prestataire_telephone, delai_cible_min, consignes, rang)
      values (v_client, x ->> 'type_incident', x ->> 'action', private.loc_lire_texte(x, 'prestataire', 120), private.loc_lire_texte(x, 'prestataire_telephone', 30),
              nullif(x ->> 'delai_cible_min', '')::integer, private.loc_lire_texte(x, 'consignes', 1000), v_n)
      on conflict on constraint loc_grille_assistance_un do update
        set action = excluded.action, prestataire = excluded.prestataire, prestataire_telephone = excluded.prestataire_telephone,
            delai_cible_min = excluded.delai_cible_min, consignes = excluded.consignes, rang = excluded.rang;
    exception when check_violation or invalid_text_representation or not_null_violation then
      raise exception 'Ligne de grille refusée : %.', left(x::text, 160) using errcode = '22023';
    end;
    v_n := v_n + 1;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.grille_assistance_posee', 'loc_grille_assistance', null,
    jsonb_build_object('lignes', v_n, 'par', (select auth.uid())), null);
  return jsonb_build_object('lignes', v_n);
end $function$;

-- PORTE DU FOURNISSEUR DE VOIX (service seul). Un appel arrive : le contrat est retrouvé par le numéro de l'appelant
-- (locataire d'un contrat ouvert) ou par la plaque ; l'action vient de la grille ; l'agence est prévenue.
-- p_appel : {fournisseur, fournisseur_reference, canal, appelant_telephone?, immatriculation?, type_incident, description?, position?}
CREATE OR REPLACE FUNCTION public.loc_assistance_ouvrir(p_client uuid, p_appel jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats;
  g public.loc_grille_assistance;
  v_id uuid;
  v_tel text := regexp_replace(coalesce(p_appel ->> 'appelant_telephone', ''), '[^0-9+]', '', 'g');
  v_type text := coalesce(p_appel ->> 'type_incident', 'autre');
  v_existant uuid;
  v_immat text;
begin
  if not exists (select 1 from public.clients x where x.id = p_client) then
    raise exception 'Organisation inconnue.' using errcode = 'P0002';
  end if;
  if nullif(p_appel ->> 'fournisseur', '') is null or nullif(p_appel ->> 'fournisseur_reference', '') is null then
    raise exception 'Le fournisseur et sa référence d''appel sont obligatoires (rejouer ne doit jamais ouvrir deux dossiers).' using errcode = '22023';
  end if;
  select i.id into v_existant from public.loc_incidents i where i.client_id = p_client and i.fournisseur = p_appel ->> 'fournisseur' and i.fournisseur_reference = p_appel ->> 'fournisseur_reference';
  if v_existant is not null then
    return jsonb_build_object('incident', v_existant, 'deja', true);
  end if;
  -- le contrat : d'abord par le numéro de l'appelant (contrat en cours), sinon par la plaque
  if char_length(v_tel) >= 6 then
    select x.* into c from public.loc_contrats x join public.loc_locataires l on l.client_id = x.client_id and l.id = x.locataire_id
    where x.client_id = p_client and x.statut = 'ouvert' and right(regexp_replace(coalesce(l.telephone, ''), '[^0-9]', '', 'g'), 9) = right(regexp_replace(v_tel, '[^0-9]', '', 'g'), 9)
    order by x.depart_le desc limit 1;
  end if;
  if c.id is null and nullif(p_appel ->> 'immatriculation', '') is not null then
    select x.* into c from public.loc_contrats x join private.loc_rapprocher_avis(p_client, p_appel ->> 'immatriculation', now()) r on r.contrat_id = x.id limit 1;
  end if;
  select * into g from public.loc_grille_assistance x where x.client_id = p_client and x.type_incident = v_type;
  insert into public.loc_incidents (client_id, entite_id, contrat_id, vehicule_id, canal, appelant_telephone, type_incident, description, position, action, prestataire,
                                    statut, fournisseur, fournisseur_reference)
  values (p_client, c.entite_id, c.id, c.vehicule_id, coalesce(p_appel ->> 'canal', 'telephone'), left(nullif(v_tel, ''), 30), v_type,
          private.loc_lire_texte(p_appel, 'description', 2000), private.loc_lire_texte(p_appel, 'position', 300),
          coalesce(g.action, 'transfert_humain'), g.prestataire, 'ouvert', left(p_appel ->> 'fournisseur', 60), left(p_appel ->> 'fournisseur_reference', 120))
  returning id into v_id;
  select v.immatriculation into v_immat from public.loc_vehicules v where v.id = c.vehicule_id;
  perform private.lever_alerte_module(p_client, 'tavaro', case when v_type in ('accident', 'vol') then 'critique' else 'attention' end,
    format('Assistance : %s%s%s. Action : %s%s.', replace(v_type, '_', ' '), case when v_immat is not null then ' sur ' || v_immat else '' end,
           case when c.numero is not null then ' (contrat ' || c.numero || ')' else ' — contrat non retrouvé' end,
           replace(coalesce(g.action, 'transfert_humain'), '_', ' '), case when g.prestataire is not null then ', ' || g.prestataire else '' end),
    jsonb_build_object('incident', v_id), 'incident:' || v_id::text, true, null);
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.incident_ouvert', 'loc_incidents', v_id::text,
    jsonb_build_object('type', v_type, 'contrat', c.numero, 'action', coalesce(g.action, 'transfert_humain'), 'fournisseur', p_appel ->> 'fournisseur'), c.entite_id);
  return jsonb_build_object('incident', v_id, 'deja', false, 'contrat', c.numero, 'vehicule', v_immat,
    'action', coalesce(g.action, 'transfert_humain'), 'prestataire', g.prestataire, 'prestataire_telephone', g.prestataire_telephone,
    'delai_cible_min', g.delai_cible_min, 'consignes', g.consignes,
    -- sans grille ou sans contrat retrouvé, l'assistant passe la main à une personne
    'transferer', g.id is null or c.id is null or g.action = 'transfert_humain');
end $function$;

-- PORTE DU FOURNISSEUR DE VOIX (service seul) : ce qui arrive ensuite.
-- p_evenement : {type: missionne|arrivee_estimee|transcription|transfere|clos, prestataire?, arrivee_estimee_le?, resume?, transcription?, motif?}
CREATE OR REPLACE FUNCTION public.loc_assistance_evenement(p_incident uuid, p_evenement jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.loc_incidents;
  v_type text := p_evenement ->> 'type';
  v_sin jsonb;
begin
  select * into i from public.loc_incidents where id = p_incident for update;
  if not found then
    raise exception 'Incident introuvable.' using errcode = 'P0002';
  end if;
  if i.statut = 'clos' then
    return jsonb_build_object('incident', i.id, 'statut', 'clos', 'ignore', true);
  end if;
  case v_type
    when 'missionne' then
      update public.loc_incidents set statut = 'missionne', missionne_le = now(), prestataire = coalesce(private.loc_lire_texte(p_evenement, 'prestataire', 120), prestataire),
             arrivee_estimee_le = coalesce(nullif(p_evenement ->> 'arrivee_estimee_le', '')::timestamptz, arrivee_estimee_le) where id = i.id;
    when 'arrivee_estimee' then
      update public.loc_incidents set arrivee_estimee_le = nullif(p_evenement ->> 'arrivee_estimee_le', '')::timestamptz where id = i.id;
    when 'transcription' then
      update public.loc_incidents set resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume),
             transcription = coalesce(left(p_evenement ->> 'transcription', 50000), transcription) where id = i.id;
    when 'transfere' then
      update public.loc_incidents set statut = 'transfere', transfere_le = now(), transfert_motif = private.loc_lire_texte(p_evenement, 'motif', 500),
             resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume) where id = i.id;
      perform private.lever_alerte_module(i.client_id, 'tavaro', 'critique',
        format('Assistance : un appel est transféré à l''agence (%s). %s', replace(i.type_incident, '_', ' '), coalesce(private.loc_lire_texte(p_evenement, 'resume', 300), '')),
        jsonb_build_object('incident', i.id), 'incident:transfere:' || i.id::text, true, null);
    when 'clos' then
      update public.loc_incidents set statut = 'clos', clos_le = now(), resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume) where id = i.id;
    else
      raise exception 'Événement inconnu : missionne, arrivee_estimee, transcription, transfere ou clos.' using errcode = '22023';
  end case;
  perform private.journaliser_module(i.client_id, 'tavaro', 'tavaro.incident_' || v_type, 'loc_incidents', i.id::text, jsonb_build_object('type', v_type), i.entite_id);
  return jsonb_build_object('incident', i.id, 'evenement', v_type);
end $function$;

-- L'agence clôt l'incident, et ouvre au besoin le dossier de sinistre (b2_15) depuis lui.
CREATE OR REPLACE FUNCTION public.loc_clore_incident(p_incident uuid, p_note text DEFAULT NULL::text, p_ouvrir_sinistre boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un incident se clôt par l''agence.');
  i public.loc_incidents;
  v_sin jsonb;
begin
  select * into i from public.loc_incidents where client_id = v_client and id = p_incident for update;
  if not found or (i.entite_id is not null and not private.voit_entite(v_client, i.entite_id)) then
    raise exception 'Incident introuvable.' using errcode = 'P0002';
  end if;
  if coalesce(p_ouvrir_sinistre, false) then
    if i.vehicule_id is null then
      raise exception 'L''incident n''est rattaché à aucun véhicule : ouvrez le sinistre depuis le contrat.' using errcode = '23514';
    end if;
    v_sin := public.loc_ouvrir_sinistre(jsonb_strip_nulls(jsonb_build_object('contrat', i.contrat_id, 'vehicule', i.vehicule_id, 'survenu_le', i.recu_le,
      'nature', case i.type_incident when 'vol' then 'vol' else 'accident' end, 'lieu', i.position, 'description', coalesce(i.resume, i.description))));
  end if;
  update public.loc_incidents set statut = 'clos', clos_le = coalesce(clos_le, now()), resume = coalesce(nullif(btrim(p_note), ''), resume),
         sinistre_id = coalesce((v_sin ->> 'sinistre')::uuid, sinistre_id)
   where id = i.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.incident_clos', 'loc_incidents', i.id::text,
    jsonb_build_object('sinistre', v_sin ->> 'reference', 'par', (select auth.uid())), i.entite_id);
  return jsonb_build_object('incident', i.id, 'statut', 'clos', 'sinistre', v_sin -> 'sinistre');
end $function$;

-- PORTE DE L'AGRÉGATEUR (service seul) : les relevés lus chez le constructeur, par numéro de série ou plaque.
-- p_lignes : [{vin? | immatriculation?, lu_le, km?, carburant_pct?, batterie_pct?, autonomie_km?, reference?}]
CREATE OR REPLACE FUNCTION public.loc_enregistrer_releves_constructeur(p_client uuid, p_source text, p_lignes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x jsonb;
  v_vehicule uuid;
  v_n integer := 0;
  v_inconnus integer := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' or nullif(btrim(coalesce(p_source, '')), '') is null then
    raise exception 'Une source et un tableau de relevés.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_lignes) loop
    select v.id into v_vehicule from public.loc_vehicules v
    where v.client_id = p_client and ((nullif(x ->> 'vin', '') is not null and v.vin = upper(x ->> 'vin'))
                                       or (nullif(x ->> 'immatriculation', '') is not null and v.immatriculation = (select p.plaque from private.loc_plaque(x ->> 'immatriculation') p)))
    limit 1;
    if v_vehicule is null then
      v_inconnus := v_inconnus + 1;
      continue;
    end if;
    begin
      insert into public.loc_releves_constructeur (client_id, vehicule_id, lu_le, km, carburant_pct, batterie_pct, autonomie_km, source, reference)
      values (p_client, v_vehicule, (x ->> 'lu_le')::timestamptz, nullif(x ->> 'km', '')::integer, nullif(x ->> 'carburant_pct', '')::numeric,
              nullif(x ->> 'batterie_pct', '')::numeric, nullif(x ->> 'autonomie_km', '')::integer, left(p_source, 60), left(x ->> 'reference', 120))
      on conflict on constraint loc_releves_constructeur_un do nothing;
    exception when check_violation or invalid_text_representation or not_null_violation or invalid_datetime_format then
      raise exception 'Relevé refusé : %.', left(x::text, 160) using errcode = '22023';
    end;
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('releves', v_n, 'vehicules_inconnus', v_inconnus);
end $function$;

-- Le relevé constructeur le plus proche du retour (à deux heures près), et l'écart avec l'état des lieux de retour.
CREATE OR REPLACE FUNCTION public.loc_releve_au_retour(p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
  r public.loc_releves_constructeur;
  v_retour timestamptz;
  v_edl_km integer;
  v_edl_carb smallint;
begin
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or v_uid is null or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id)
     or not (private.voit_entite(c.client_id, c.entite_id) or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  v_retour := coalesce(c.retour_reel_le, (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p where p.contrat_id = c.id and p.entrees ? 'retour_reel_le'), now());
  select x.* into r from public.loc_releves_constructeur x
  where x.client_id = c.client_id and x.vehicule_id = c.vehicule_id and x.lu_le between v_retour - interval '2 hours' and v_retour + interval '2 hours'
  order by abs(extract(epoch from (x.lu_le - v_retour))) limit 1;
  if r.id is null then
    return jsonb_build_object('releve', null, 'message', 'Aucun relevé du constructeur à l''heure du retour (agrégateur non branché, ou véhicule non connecté).');
  end if;
  select e.km, e.carburant_8 into v_edl_km, v_edl_carb from public.loc_etats_des_lieux e where e.client_id = c.client_id and e.contrat_id = c.id and e.moment = 'retour';
  return jsonb_build_object('releve', jsonb_build_object('lu_le', r.lu_le, 'km', r.km, 'carburant_pct', r.carburant_pct,
                                                         'carburant_8', case when r.carburant_pct is not null then round(r.carburant_pct / 12.5)::int end,
                                                         'batterie_pct', r.batterie_pct, 'source', r.source),
                            'ecart_km', case when r.km is not null and v_edl_km is not null then v_edl_km - r.km end,
                            'ecart_carburant_8', case when r.carburant_pct is not null and v_edl_carb is not null then v_edl_carb - round(r.carburant_pct / 12.5)::int end);
end $function$;

-- ── La caution ─────────────────────────────────────────────────────────────────────────

-- Demander la préautorisation au départ : le travail tavaro.caution {action: preautoriser} attend l'ouvrier du prestataire.
CREATE OR REPLACE FUNCTION public.loc_demander_preautorisation(p_contrat uuid, p_montant_eur numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'La caution se demande par l''agence.');
  c public.loc_contrats;
  v_montant numeric;
  v_id uuid;
begin
  select * into c from public.loc_contrats where client_id = v_client and id = p_contrat;
  if not found or not private.voit_entite(v_client, c.entite_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  v_montant := round(coalesce(p_montant_eur, c.depot_eur), 2);
  if v_montant is null or v_montant <= 0 then
    raise exception 'Le montant de la caution est obligatoire (le contrat n''en porte pas).' using errcode = '22023';
  end if;
  begin
    insert into public.loc_cautions (client_id, entite_id, contrat_id, montant_eur, demande_par) values (v_client, c.entite_id, c.id, v_montant, (select auth.uid()))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Une caution est déjà en cours sur ce contrat.' using errcode = '23505';
  end;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', v_id, 'action', 'preautoriser', 'montant_eur', v_montant),
                                  'tavaro:caution:' || v_id::text || ':preautoriser', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_demandee', 'loc_cautions', v_id::text,
    jsonb_build_object('contrat', c.numero, 'montant', v_montant, 'par', (select auth.uid())), c.entite_id);
  return jsonb_build_object('caution', v_id, 'statut', 'demandee', 'montant_eur', v_montant);
end $function$;

-- Capturer tout ou partie de la caution pour régler une facture du contrat : direction ou valideur, jamais plus que la
-- préautorisation ni que ce qui reste dû sur la facture.
CREATE OR REPLACE FUNCTION public.loc_capturer_caution(p_caution uuid, p_facture uuid, p_montant_eur numeric, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Une caution se capture par la direction ou un valideur.');
  k public.loc_cautions;
  f public.loc_factures;
begin
  select * into k from public.loc_cautions where client_id = v_client and id = p_caution for update;
  if not found or not private.voit_entite(v_client, k.entite_id) then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  if k.statut <> 'preautorisee' then
    raise exception 'Une caution se capture une fois préautorisée (statut : %).', k.statut using errcode = '23514';
  end if;
  if k.expire_le is not null and k.expire_le < now() then
    raise exception 'La préautorisation a expiré le % : demandez le règlement de la facture.', private.loc_heure_locale(k.expire_le, k.client_id, k.entite_id, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  select * into f from public.loc_factures where client_id = v_client and id = p_facture;
  if not found or f.contrat_id <> k.contrat_id then
    raise exception 'La facture doit être une facture de ce contrat.' using errcode = '22023';
  end if;
  if f.statut in ('reglee', 'avoir') then
    raise exception 'Cette facture n''est plus due (%).', f.statut using errcode = '23514';
  end if;
  if p_montant_eur is null or p_montant_eur <= 0 or p_montant_eur > k.montant_eur or p_montant_eur > f.total_ttc then
    raise exception 'Le montant capturé est positif, et ne dépasse ni la caution (% €) ni la facture (% €).', k.montant_eur, f.total_ttc using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Le motif est obligatoire (cinq caractères au moins).' using errcode = '22023';
  end if;
  update public.loc_cautions set statut = 'capture_demandee', capture_demandee_eur = round(p_montant_eur, 2), capture_facture_id = f.id, capture_motif = left(btrim(p_motif), 500)
   where id = k.id;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', k.id, 'action', 'capturer', 'montant_eur', round(p_montant_eur, 2),
                                  'reference_externe', k.reference_externe), 'tavaro:caution:' || k.id::text || ':capturer', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_capture_demandee', 'loc_cautions', k.id::text,
    jsonb_build_object('facture', f.reference, 'montant', round(p_montant_eur, 2), 'motif', left(btrim(p_motif), 500), 'par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', 'capture_demandee');
end $function$;

-- Libérer la caution (retour sans frais, ou reste après capture) : l'agence.
CREATE OR REPLACE FUNCTION public.loc_liberer_caution(p_caution uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une caution se libère par l''agence.');
  k public.loc_cautions;
begin
  select * into k from public.loc_cautions where client_id = v_client and id = p_caution for update;
  if not found or not private.voit_entite(v_client, k.entite_id) then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  if k.statut not in ('preautorisee', 'capturee') then
    raise exception 'Cette caution n''est pas à libérer (statut : %).', k.statut using errcode = '23514';
  end if;
  update public.loc_cautions set statut = 'liberation_demandee' where id = k.id;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', k.id, 'action', 'liberer', 'reference_externe', k.reference_externe),
                                  'tavaro:caution:' || k.id::text || ':liberer', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_liberation_demandee', 'loc_cautions', k.id::text, jsonb_build_object('par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', 'liberation_demandee');
end $function$;

-- PORTE DU PRESTATAIRE DE PAIEMENT (service seul) : le résultat de chaque action.
-- p_evenement : {type: preautorisee|capturee|liberee|expiree|echec, prestataire, reference_externe?, expire_le?, montant_eur?, erreur?}
CREATE OR REPLACE FUNCTION public.loc_caution_evenement(p_caution uuid, p_evenement jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_cautions;
  v_type text := p_evenement ->> 'type';
  v_statut text;
begin
  select * into k from public.loc_cautions where id = p_caution for update;
  if not found then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  v_statut := case v_type
    when 'preautorisee' then case when k.statut = 'demandee' then 'preautorisee' end
    when 'capturee' then case when k.statut = 'capture_demandee' then 'capturee' end
    when 'liberee' then case when k.statut in ('liberation_demandee', 'preautorisee') then 'liberee' end
    when 'expiree' then case when k.statut in ('preautorisee', 'capture_demandee', 'liberation_demandee') then 'expiree' end
    -- un échec de capture laisse la préautorisation en place ; un échec de demande ou de libération se signale
    when 'echec' then case k.statut when 'demandee' then 'echec' when 'capture_demandee' then 'preautorisee' when 'liberation_demandee' then 'echec' end end;
  if v_type not in ('preautorisee', 'capturee', 'liberee', 'expiree', 'echec') then
    raise exception 'Événement inconnu : preautorisee, capturee, liberee, expiree ou echec.' using errcode = '22023';
  end if;
  if v_statut is null then
    -- un événement rejoué ou hors d'ordre ne défait rien : il est seulement noté
    update public.loc_cautions set evenements = evenements || jsonb_build_array(jsonb_build_object('le', now(), 'type', v_type, 'ignore', true)) where id = k.id;
    return jsonb_build_object('caution', k.id, 'statut', k.statut, 'ignore', true);
  end if;
  update public.loc_cautions
     set statut = v_statut, prestataire = coalesce(left(p_evenement ->> 'prestataire', 60), prestataire),
         reference_externe = coalesce(left(p_evenement ->> 'reference_externe', 120), reference_externe),
         preautorisee_le = case when v_statut = 'preautorisee' then now() else preautorisee_le end,
         expire_le = coalesce(nullif(p_evenement ->> 'expire_le', '')::timestamptz, expire_le),
         capture_eur = case when v_statut = 'capturee' then coalesce(nullif(p_evenement ->> 'montant_eur', '')::numeric, capture_demandee_eur) else capture_eur end,
         capturee_le = case when v_statut = 'capturee' then now() else capturee_le end,
         liberee_le = case when v_statut = 'liberee' then now() else liberee_le end,
         erreur = case when v_type = 'echec' then left(p_evenement ->> 'erreur', 500) else erreur end,
         capture_demandee_eur = case when v_type = 'echec' and k.statut = 'capture_demandee' then null else capture_demandee_eur end,
         capture_facture_id = case when v_type = 'echec' and k.statut = 'capture_demandee' then null else capture_facture_id end,
         evenements = evenements || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('le', now(), 'type', v_type, 'reference', p_evenement ->> 'reference_externe')))
   where id = k.id;
  if v_type in ('capturee', 'echec', 'expiree') then
    perform private.lever_alerte_module(k.client_id, 'tavaro', case v_type when 'capturee' then 'info' else 'attention' end,
      case v_type
        when 'capturee' then format('%s € capturés sur la caution : marquez la facture réglée (mode dépôt de garantie), puis libérez le reste.', coalesce(p_evenement ->> 'montant_eur', k.capture_demandee_eur::text))
        when 'expiree' then 'Une préautorisation de caution a expiré : la caution n''est plus garantie.'
        else format('L''opération de caution a échoué : %s', coalesce(left(p_evenement ->> 'erreur', 200), 'sans détail du prestataire')) end,
      jsonb_build_object('caution', k.id), 'caution:' || v_type || ':' || k.id::text || ':' || jsonb_array_length(k.evenements), true, k.demande_par);
  end if;
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.caution_' || v_type, 'loc_cautions', k.id::text,
    jsonb_build_object('type', v_type, 'prestataire', p_evenement ->> 'prestataire'), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', v_statut);
end $function$;

revoke all on function public.loc_poser_grille_assistance(jsonb) from public, anon;
revoke all on function public.loc_clore_incident(uuid, text, boolean) from public, anon;
revoke all on function public.loc_releve_au_retour(uuid) from public, anon;
revoke all on function public.loc_demander_preautorisation(uuid, numeric) from public, anon;
revoke all on function public.loc_capturer_caution(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.loc_liberer_caution(uuid) from public, anon;
grant execute on function public.loc_poser_grille_assistance(jsonb) to authenticated, service_role;
grant execute on function public.loc_clore_incident(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.loc_releve_au_retour(uuid) to authenticated, service_role;
grant execute on function public.loc_demander_preautorisation(uuid, numeric) to authenticated, service_role;
grant execute on function public.loc_capturer_caution(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.loc_liberer_caution(uuid) to authenticated, service_role;
-- les portes des fournisseurs : service seul
revoke all on function public.loc_assistance_ouvrir(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_assistance_evenement(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_enregistrer_releves_constructeur(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.loc_caution_evenement(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.loc_assistance_ouvrir(uuid, jsonb) to service_role;
grant execute on function public.loc_assistance_evenement(uuid, jsonb) to service_role;
grant execute on function public.loc_enregistrer_releves_constructeur(uuid, text, jsonb) to service_role;
grant execute on function public.loc_caution_evenement(uuid, jsonb) to service_role;
