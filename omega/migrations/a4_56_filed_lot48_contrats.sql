-- FILED, lot 48 (a4_56) — les contrats : ce que FILED retient d'un contrat reçu, et l'échéance de résiliation
-- (chiffrage n° 126, 127 : « chaque document reçu est lu […], ses informations extraites puis contrôlées »).
--
-- Un document classé « contrat » (filed_documents.nature, socle) devient un contrat suivi :
--   · public.filed_contrats : cocontractant (et le fournisseur s'il est connu), objet, référence, début, fin, durée,
--     préavis, reconduction tacite, montant et périodicité ; lus des valeurs du lecteur (champs « contrat.* », liste
--     ci-dessous pour A1), ou posés par une personne (filed_poser_contrat) — ce qu'une personne pose n'est jamais
--     écrasé par une relecture ;
--   · l'échéance : la date limite pour résilier (fin − préavis) ; une alerte au gérant 30 jours puis 7 jours avant,
--     une fois chacune ; un contrat à reconduction tacite dont la fin passe est reconduit (la fin avance d'une période)
--     et l'historique le dit ; sans reconduction, il passe « échu » ;
--   · filed_contrats_echeances : les contrats à résilier ou à renouveler dans les N jours ; filed_resilier_contrat.
-- Champs lus pour A1 (pieces_valeurs.champ) : contrat.cocontractant (sinon fournisseur.nom), contrat.objet,
-- contrat.reference, contrat.date_debut, contrat.date_fin, contrat.duree_mois, contrat.preavis_jours (ou
-- contrat.preavis_mois), contrat.reconduction_tacite (oui/non), contrat.reconduction_mois, contrat.montant,
-- contrat.periodicite (mensuel, trimestriel, semestriel, annuel, unique).
-- Branchements : un déclencheur sur filed_documents (nature devenue « contrat ») et le balayage quotidien
-- (private.filed_produire_exports, texte d'a4_41, par repère). Migration idempotente ; aucun DROP, aucune suppression ;
-- aucun envoi (les alertes restent dans Omega).

create table if not exists public.filed_contrats (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  entite_id           uuid references public.entites(id) on delete cascade,
  document_id         uuid not null unique references public.filed_documents(id) on delete cascade,
  fournisseur_id      uuid references public.filed_fournisseurs(id) on delete set null,
  cocontractant       text check (cocontractant is null or char_length(cocontractant) <= 200),
  objet               text check (objet is null or char_length(objet) <= 300),
  reference           text check (reference is null or char_length(reference) <= 100),
  date_debut          date,
  date_fin            date,
  duree_mois          integer check (duree_mois is null or duree_mois between 1 and 600),
  preavis_jours       integer check (preavis_jours is null or preavis_jours between 0 and 1000),
  reconduction_tacite boolean,
  reconduction_mois   integer check (reconduction_mois is null or reconduction_mois between 1 and 120),
  montant             numeric(14,2),
  periodicite         text check (periodicite is null or periodicite in ('mensuel', 'trimestriel', 'semestriel', 'annuel', 'unique')),
  source              text not null default 'lecture' check (source in ('lecture', 'humain')),
  statut              text not null default 'actif' check (statut in ('actif', 'resilie', 'echu')),
  resilie_le          date,
  alerte_30_pour      date,
  alerte_7_pour       date,
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now()
);
comment on table public.filed_contrats is
  'Lot 48 (a4_56) : les contrats reçus (documents de nature « contrat ») : cocontractant, durée, préavis, reconduction ; l''échéance de résiliation suivie.';
create index if not exists filed_contrats_client_fin on public.filed_contrats (client_id, statut, date_fin);
alter table public.filed_contrats enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_contrats' and policyname = 'filed_contrats_lecture') then
    create policy filed_contrats_lecture on public.filed_contrats for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id));
  end if;
end $$;
revoke all on table public.filed_contrats from anon, authenticated;
grant select on public.filed_contrats to authenticated;
grant all on public.filed_contrats to service_role;
create or replace trigger filed_contrats_maj_le before update on public.filed_contrats for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_contrats', 7, 'FILED, lot 48' where not exists (select 1 from private.tables_locataires where nom = 'filed_contrats');

-- La date limite pour résilier : la fin moins le préavis (nulle sans fin connue).
create or replace function private.filed_contrat_limite(c public.filed_contrats)
returns date language sql immutable set search_path to '' as $$
  select case when c.date_fin is null then null else c.date_fin - coalesce(c.preavis_jours, 0) end
$$;
revoke all on function private.filed_contrat_limite(public.filed_contrats) from public, anon, authenticated;
grant execute on function private.filed_contrat_limite(public.filed_contrats) to service_role;

-- Lire le contrat d'un document depuis les valeurs du lecteur ; une fiche posée par une personne n'est pas réécrite.
create or replace function private.filed_lire_contrat(p_document uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; v jsonb; c public.filed_contrats; v_id uuid; v_debut date; v_fin date; v_duree integer; v_preavis integer;
        v_tacite text; v_four uuid; v_cocontr text; v_per text;
begin
  select * into d from public.filed_documents where id = p_document;
  if not found or d.nature is distinct from 'contrat' then return null; end if;
  select * into c from public.filed_contrats where document_id = p_document;
  if c.id is not null and c.source = 'humain' then return c.id; end if;
  v := coalesce(private.filed_valeurs(d.piece_id), '{}'::jsonb);
  v_debut := private.filed_date_lue(v -> 'contrat.date_debut' ->> 'valeur');
  v_duree := nullif(substring(coalesce(v -> 'contrat.duree_mois' ->> 'valeur', '') from '\d{1,3}'), '')::integer;
  v_fin := coalesce(private.filed_date_lue(v -> 'contrat.date_fin' ->> 'valeur'),
                    case when v_debut is not null and v_duree is not null then (v_debut + make_interval(months => v_duree) - interval '1 day')::date end);
  v_preavis := coalesce(nullif(substring(coalesce(v -> 'contrat.preavis_jours' ->> 'valeur', '') from '\d{1,4}'), '')::integer,
                        nullif(substring(coalesce(v -> 'contrat.preavis_mois' ->> 'valeur', '') from '\d{1,2}'), '')::integer * 30);
  v_tacite := lower(coalesce(v -> 'contrat.reconduction_tacite' ->> 'valeur', ''));
  v_cocontr := left(nullif(btrim(coalesce(v -> 'contrat.cocontractant' ->> 'valeur', v -> 'fournisseur.nom' ->> 'valeur', '')), ''), 200);
  v_per := lower(nullif(btrim(coalesce(v -> 'contrat.periodicite' ->> 'valeur', '')), ''));
  if v_cocontr is not null then
    select f.id into v_four from public.filed_fournisseurs f
     where f.client_id = d.client_id and f.nom_normalise = private.filed_normaliser_nom(v_cocontr) limit 1;
  end if;
  insert into public.filed_contrats (client_id, entite_id, document_id, fournisseur_id, cocontractant, objet, reference, date_debut, date_fin,
                                     duree_mois, preavis_jours, reconduction_tacite, reconduction_mois, montant, periodicite, source)
  values (d.client_id, d.entite_id, d.id, v_four, v_cocontr,
          left(nullif(btrim(coalesce(v -> 'contrat.objet' ->> 'valeur', '')), ''), 300),
          left(nullif(btrim(coalesce(v -> 'contrat.reference' ->> 'valeur', '')), ''), 100),
          v_debut, v_fin, v_duree, v_preavis,
          case when v_tacite in ('oui', 'true', 'vrai', '1') then true when v_tacite in ('non', 'false', 'faux', '0') then false end,
          nullif(substring(coalesce(v -> 'contrat.reconduction_mois' ->> 'valeur', '') from '\d{1,3}'), '')::integer,
          private.filed_montant_lu(v -> 'contrat.montant' ->> 'valeur'),
          case when v_per in ('mensuel', 'trimestriel', 'semestriel', 'annuel', 'unique') then v_per end, 'lecture')
  on conflict (document_id) do update
    set fournisseur_id = excluded.fournisseur_id, cocontractant = excluded.cocontractant, objet = excluded.objet, reference = excluded.reference,
        date_debut = excluded.date_debut, date_fin = excluded.date_fin, duree_mois = excluded.duree_mois, preavis_jours = excluded.preavis_jours,
        reconduction_tacite = excluded.reconduction_tacite, reconduction_mois = excluded.reconduction_mois, montant = excluded.montant,
        periodicite = excluded.periodicite
  returning id into v_id;
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'contrat',
    format('Contrat lu%s%s.', coalesce(' : ' || v_cocontr, ''), coalesce(', fin le ' || to_char(v_fin, 'DD/MM/YYYY'), '')),
    jsonb_build_object('contrat', v_id, 'fin', v_fin, 'preavis_jours', v_preavis));
  return v_id;
end $$;
revoke all on function private.filed_lire_contrat(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_contrat(uuid) to service_role;

create or replace function private.filed_document_contrat()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.nature = 'contrat' and (tg_op = 'INSERT' or old.nature is distinct from new.nature or old.etat is distinct from new.etat) then
    begin
      perform private.filed_lire_contrat(new.id);
    exception when others then
      raise warning 'FILED : contrat non lu pour le document % (%)', new.id, sqlerrm;
    end;
  end if;
  return null;
end $$;
revoke all on function private.filed_document_contrat() from public, anon, authenticated;
grant execute on function private.filed_document_contrat() to service_role;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_contrat') then
    create trigger filed_documents_contrat after insert or update of nature, etat on public.filed_documents
      for each row execute function private.filed_document_contrat();
  end if;
end $$;

-- Une personne pose (ou corrige) la fiche : ses valeurs tiennent.
create or replace function private.filed_poser_contrat(p_document uuid, p_valeurs jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; v_id uuid; v jsonb := coalesce(p_valeurs, '{}'::jsonb);
begin
  select * into d from public.filed_documents where id = p_document;
  if not found then raise exception 'Document introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(d.client_id, array['gerant', 'admin', 'valideur'], d.entite_id);
  if d.nature is distinct from 'contrat' then raise exception 'Ce document n''est pas classé comme contrat.' using errcode = '55000'; end if;
  v_id := private.filed_lire_contrat(p_document);
  if v_id is null then
    insert into public.filed_contrats (client_id, entite_id, document_id, source) values (d.client_id, d.entite_id, d.id, 'humain') returning id into v_id;
  end if;
  update public.filed_contrats c set
    cocontractant = case when v ? 'cocontractant' then left(nullif(btrim(v ->> 'cocontractant'), ''), 200) else c.cocontractant end,
    fournisseur_id = case when v ? 'fournisseur' then nullif(v ->> 'fournisseur', '')::uuid else c.fournisseur_id end,
    objet = case when v ? 'objet' then left(nullif(btrim(v ->> 'objet'), ''), 300) else c.objet end,
    reference = case when v ? 'reference' then left(nullif(btrim(v ->> 'reference'), ''), 100) else c.reference end,
    date_debut = case when v ? 'date_debut' then (v ->> 'date_debut')::date else c.date_debut end,
    date_fin = case when v ? 'date_fin' then (v ->> 'date_fin')::date else c.date_fin end,
    duree_mois = case when v ? 'duree_mois' then (v ->> 'duree_mois')::integer else c.duree_mois end,
    preavis_jours = case when v ? 'preavis_jours' then (v ->> 'preavis_jours')::integer else c.preavis_jours end,
    reconduction_tacite = case when v ? 'reconduction_tacite' then (v ->> 'reconduction_tacite')::boolean else c.reconduction_tacite end,
    reconduction_mois = case when v ? 'reconduction_mois' then (v ->> 'reconduction_mois')::integer else c.reconduction_mois end,
    montant = case when v ? 'montant' then (v ->> 'montant')::numeric else c.montant end,
    periodicite = case when v ? 'periodicite' then nullif(v ->> 'periodicite', '') else c.periodicite end,
    source = 'humain', alerte_30_pour = null, alerte_7_pour = null
  where c.id = v_id;
  if exists (select 1 from public.filed_contrats c where c.id = v_id and c.fournisseur_id is not null
              and not exists (select 1 from public.filed_fournisseurs f where f.id = c.fournisseur_id and f.client_id = d.client_id)) then
    raise exception 'Le fournisseur n''est pas à cette organisation.' using errcode = '22023';
  end if;
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'contrat', 'Fiche du contrat posée par une personne.',
    jsonb_build_object('contrat', v_id, 'champs', (select jsonb_agg(k) from jsonb_object_keys(v) k)));
  return v_id;
end $$;
revoke all on function private.filed_poser_contrat(uuid, jsonb) from public, anon;
grant execute on function private.filed_poser_contrat(uuid, jsonb) to authenticated, service_role;
create or replace function public.filed_poser_contrat(p_document uuid, p_valeurs jsonb)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_contrat(p_document, p_valeurs) $$;
comment on function public.filed_poser_contrat(uuid, jsonb) is
  'Lot 48 (a4_56) : pose ou corrige la fiche d''un contrat (cocontractant, fournisseur, objet, référence, date_debut, date_fin, duree_mois, preavis_jours, reconduction_tacite, reconduction_mois, montant, periodicite). Gérant, admin, valideur.';
revoke all on function public.filed_poser_contrat(uuid, jsonb) from public, anon;
grant execute on function public.filed_poser_contrat(uuid, jsonb) to authenticated, service_role;

create or replace function private.filed_resilier_contrat(p_contrat uuid, p_le date default current_date)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_contrats;
begin
  select * into c from public.filed_contrats where id = p_contrat for update;
  if not found then raise exception 'Contrat introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(c.client_id, array['gerant', 'admin'], c.entite_id);
  update public.filed_contrats set statut = 'resilie', resilie_le = coalesce(p_le, current_date) where id = p_contrat;
  perform private.filed_historiser(c.client_id, c.document_id, 'filed_document', c.document_id::text, 'contrat',
    format('Contrat noté résilié le %s.', to_char(coalesce(p_le, current_date), 'DD/MM/YYYY')), jsonb_build_object('contrat', c.id));
end $$;
revoke all on function private.filed_resilier_contrat(uuid, date) from public, anon;
grant execute on function private.filed_resilier_contrat(uuid, date) to authenticated, service_role;
create or replace function public.filed_resilier_contrat(p_contrat uuid, p_le date default current_date)
returns void language sql set search_path to '' as $$ select private.filed_resilier_contrat(p_contrat, p_le) $$;
comment on function public.filed_resilier_contrat(uuid, date) is 'Lot 48 (a4_56) : note un contrat résilié (la lettre elle-même reste à envoyer par une personne). Gérant, admin.';
revoke all on function public.filed_resilier_contrat(uuid, date) from public, anon;
grant execute on function public.filed_resilier_contrat(uuid, date) to authenticated, service_role;

create or replace function private.filed_contrats_echeances(p_client uuid, p_jours integer default 90)
returns table (contrat_id uuid, document_id uuid, cocontractant text, objet text, date_fin date, preavis_jours integer,
               date_limite date, jours_restants integer, reconduction_tacite boolean, montant numeric, periodicite text)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  return query
    select c.id, c.document_id, c.cocontractant, c.objet, c.date_fin, c.preavis_jours, private.filed_contrat_limite(c),
           private.filed_contrat_limite(c) - current_date, c.reconduction_tacite, c.montant, c.periodicite
      from public.filed_contrats c
     where c.client_id = p_client and c.statut = 'actif' and c.date_fin is not null
       and private.filed_contrat_limite(c) <= current_date + greatest(coalesce(p_jours, 90), 0)
     order by private.filed_contrat_limite(c);
end $$;
revoke all on function private.filed_contrats_echeances(uuid, integer) from public, anon;
grant execute on function private.filed_contrats_echeances(uuid, integer) to authenticated, service_role;
create or replace function public.filed_contrats_echeances(p_client uuid, p_jours integer default 90)
returns table (contrat_id uuid, document_id uuid, cocontractant text, objet text, date_fin date, preavis_jours integer,
               date_limite date, jours_restants integer, reconduction_tacite boolean, montant numeric, periodicite text)
language sql stable set search_path to '' as $$ select * from private.filed_contrats_echeances(p_client, p_jours) $$;
comment on function public.filed_contrats_echeances(uuid, integer) is
  'Lot 48 (a4_56) : les contrats actifs dont la date limite de résiliation (fin − préavis) tombe dans les N jours. Gérant, admin, valideur.';
revoke all on function public.filed_contrats_echeances(uuid, integer) from public, anon;
grant execute on function public.filed_contrats_echeances(uuid, integer) to authenticated, service_role;

-- Le balayage quotidien : reconduire, échoir, alerter (30 et 7 jours avant la date limite). Rend le nombre d'alertes.
create or replace function private.filed_alerter_contrats(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare c public.filed_contrats; v_lim date; v_pas integer; n integer := 0; v_fin date;
begin
  for c in select * from public.filed_contrats where statut = 'actif' and date_fin is not null for update skip locked loop
    if c.date_fin < p_aujourdhui then
      if coalesce(c.reconduction_tacite, false) then
        v_pas := coalesce(c.reconduction_mois, c.duree_mois, 12); v_fin := c.date_fin;
        while v_fin < p_aujourdhui loop v_fin := (v_fin + make_interval(months => v_pas))::date; end loop;
        update public.filed_contrats set date_fin = v_fin, alerte_30_pour = null, alerte_7_pour = null where id = c.id;
        perform private.filed_historiser(c.client_id, c.document_id, 'filed_document', c.document_id::text, 'contrat',
          format('Contrat reconduit tacitement jusqu''au %s.', to_char(v_fin, 'DD/MM/YYYY')), jsonb_build_object('contrat', c.id, 'fin', v_fin));
        c.date_fin := v_fin; c.alerte_30_pour := null; c.alerte_7_pour := null;
      else
        update public.filed_contrats set statut = 'echu' where id = c.id;
        continue;
      end if;
    end if;
    v_lim := private.filed_contrat_limite(c);
    if v_lim >= p_aujourdhui and v_lim - p_aujourdhui <= 30 and c.alerte_30_pour is distinct from v_lim then
      update public.filed_contrats set alerte_30_pour = v_lim where id = c.id;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('Contrat %s : à résilier avant le %s, sinon %s.', coalesce(c.cocontractant, c.objet, 'sans nom'), to_char(v_lim, 'DD/MM/YYYY'),
                    case when c.reconduction_tacite then 'il se reconduit' else 'il prend fin le ' || to_char(c.date_fin, 'DD/MM/YYYY') end), 200),
        jsonb_build_object('contrat', c.id, 'document', c.document_id, 'date_limite', v_lim), 'filed:contrat:30:' || c.id || ':' || v_lim, true, null);
      n := n + 1;
    end if;
    if v_lim >= p_aujourdhui and v_lim - p_aujourdhui <= 7 and c.alerte_7_pour is distinct from v_lim then
      update public.filed_contrats set alerte_7_pour = v_lim where id = c.id;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('Contrat %s : plus que %s jour(s) pour résilier (avant le %s).', coalesce(c.cocontractant, c.objet, 'sans nom'), v_lim - p_aujourdhui,
                    to_char(v_lim, 'DD/MM/YYYY')), 200),
        jsonb_build_object('contrat', c.id, 'document', c.document_id, 'date_limite', v_lim), 'filed:contrat:7:' || c.id || ':' || v_lim, true, null);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.filed_alerter_contrats(date) from public, anon, authenticated;
grant execute on function private.filed_alerter_contrats(date) to service_role;

-- Le balayage quotidien (texte d'a4_41, par repère) suit aussi les contrats.
do $do$
declare
  v_def text;
  v_ancien text := $o$  v_n := v_n + private.filed_produire_envois(p_aujourdhui);
$o$;
  v_nouveau text := $n$  v_n := v_n + private.filed_produire_envois(p_aujourdhui);
  -- a4_56 : les échéances des contrats ; un échec n'empêche pas les exports.
  begin
    perform private.filed_alerter_contrats(p_aujourdhui);
  exception when others then
    raise warning 'FILED : échéances des contrats non suivies (%)', sqlerrm;
  end;
$n$;
begin
  v_def := pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure);
  if position('private.filed_alerter_contrats(p_aujourdhui)' in v_def) > 0 then
    raise notice 'a4_56 : private.filed_produire_exports déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_56 : le repère attendu n''est pas une fois et une seule dans private.filed_produire_exports. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_56 : private.filed_produire_exports branchée.';
end $do$;
