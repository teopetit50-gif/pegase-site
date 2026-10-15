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
    raise exception 'Ajoutez au barème la ligne PEAGE, unité « devis » (péage refacturé au montant réel, prévu par vos conditions générales).' using errcode = '23514';
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
      lp.id, 'forfait', 1, v_ht, v_ht, lp.regime_tva, v_taux, 'chiffree',
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
