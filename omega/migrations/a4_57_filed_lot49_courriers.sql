-- FILED, lot 49 (a4_57) — les courriers reçus : relances, mises en demeure, changements de coordonnées
-- (chiffrage n° 126 : « chaque document reçu […] — facture, bon de livraison, contrat, courrier —, ses informations
-- extraites puis contrôlées […] et la réponse qu'elle appelle rédigée »).
--
-- Un courrier (document hors facture, avoir, bon, contrat, que le lecteur dit courrier — pieces.type_piece courrier,
-- lettre, relance, mise_en_demeure — ou qui porte des valeurs « courrier.* ») devient public.filed_courriers :
--   · sa fiche : expéditeur (et le fournisseur s'il est connu), objet, date, sorte (relance, mise_en_demeure,
--     changement_coordonnees, reclamation, information, autre), montant réclamé, réponse attendue avant, factures citées ;
--   · ses contrôles : chaque facture citée est retrouvée chez l'organisation ; le courrier dit si elle est déjà réglée
--     (et quand), encore due, ou inconnue — une relance pour une facture payée se voit tout de suite ;
--   · un changement de coordonnées bancaires n'est JAMAIS appliqué : il lève une alerte (fraude au faux fournisseur :
--     contre-appeler le fournisseur à un numéro connu) ; l'IBAN ne change que par le circuit de validation (a4_10) ;
--   · la réponse : la porte d'a4_38 (filed_preparer_reponse, sur le document) la rédige, une personne la valide ;
--   · l'échéance : alerte au gérant 7 jours avant la date de réponse, puis le jour même, une fois chacune
--     (balayage quotidien) ; filed_courriers_a_traiter, filed_traiter_courrier.
-- Champs lus pour A1 : courrier.expediteur (sinon fournisseur.nom), courrier.objet, courrier.date, courrier.sorte,
-- courrier.montant, courrier.reponse_avant, courrier.factures (numéros séparés par virgule, espace ou point-virgule).
-- Branchements : un déclencheur sur filed_documents et le balayage quotidien (private.filed_produire_exports, après les
-- contrats d'a4_56, par repère). Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_courriers (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  entite_id         uuid references public.entites(id) on delete cascade,
  document_id       uuid not null unique references public.filed_documents(id) on delete cascade,
  fournisseur_id    uuid references public.filed_fournisseurs(id) on delete set null,
  expediteur        text check (expediteur is null or char_length(expediteur) <= 200),
  objet             text check (objet is null or char_length(objet) <= 300),
  date_courrier     date,
  sorte             text not null default 'autre'
                    check (sorte in ('relance', 'mise_en_demeure', 'changement_coordonnees', 'reclamation', 'information', 'autre')),
  montant_reclame   numeric(14,2),
  reponse_avant     date,
  factures_citees   text[] not null default '{}',
  constat           jsonb not null default '[]'::jsonb,   -- [{numero, facture, etat: reglee|due|inconnue, reste, regle_le}]
  statut            text not null default 'a_traiter' check (statut in ('a_traiter', 'traite')),
  traite_par        uuid,
  traite_le         timestamptz,
  note              text check (note is null or char_length(note) <= 1000),
  source            text not null default 'lecture' check (source in ('lecture', 'humain')),
  alerte_7_pour     date,
  alerte_0_pour     date,
  cree_le           timestamptz not null default now(),
  maj_le            timestamptz not null default now()
);
comment on table public.filed_courriers is
  'Lot 49 (a4_57) : les courriers reçus (relances, mises en demeure, changements de coordonnées…), leurs factures citées contrôlées, leur échéance de réponse.';
create index if not exists filed_courriers_client_statut on public.filed_courriers (client_id, statut, reponse_avant);
alter table public.filed_courriers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_courriers' and policyname = 'filed_courriers_lecture') then
    create policy filed_courriers_lecture on public.filed_courriers for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id));
  end if;
end $$;
revoke all on table public.filed_courriers from anon, authenticated;
grant select on public.filed_courriers to authenticated;
grant all on public.filed_courriers to service_role;
create or replace trigger filed_courriers_maj_le before update on public.filed_courriers for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_courriers', 7, 'FILED, lot 49' where not exists (select 1 from private.tables_locataires where nom = 'filed_courriers');

-- Les factures citées : retrouvées, et dites réglées, dues ou inconnues.
create or replace function private.filed_constater_courrier(p_courrier uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c public.filed_courriers; v_num text; v_out jsonb := '[]'::jsonb; f public.filed_factures; v_regle numeric; v_le date;
begin
  select * into c from public.filed_courriers where id = p_courrier;
  if not found then return '[]'::jsonb; end if;
  foreach v_num in array c.factures_citees loop
    f := null;
    select x.* into f from public.filed_factures x
     where x.client_id = c.client_id and x.numero_normalise = upper(regexp_replace(v_num, '[^A-Za-z0-9]', '', 'g'))
       and (c.fournisseur_id is null or x.fournisseur_id = c.fournisseur_id) and x.statut not in ('ecartee')
     order by x.date_emission desc nulls last limit 1;
    if f.id is null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('numero', v_num, 'etat', 'inconnue'));
    else
      select coalesce(sum(r.montant), 0), max(r.regle_le) into v_regle, v_le from public.filed_reglements r where r.facture_id = f.id;
      v_out := v_out || jsonb_build_array(jsonb_build_object('numero', v_num, 'facture', f.id, 'ttc', f.montant_ttc,
        'reste', greatest(coalesce(f.montant_ttc, 0) - v_regle, 0), 'regle_le', v_le,
        'etat', case when coalesce(f.montant_ttc, 0) - v_regle <= 0.01 then 'reglee' else 'due' end));
    end if;
  end loop;
  update public.filed_courriers set constat = v_out where id = c.id;
  return v_out;
end $$;
revoke all on function private.filed_constater_courrier(uuid) from public, anon, authenticated;
grant execute on function private.filed_constater_courrier(uuid) to service_role;

-- Lire un courrier ; une fiche posée par une personne n'est pas réécrite.
create or replace function private.filed_lire_courrier(p_document uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; v jsonb; c public.filed_courriers; v_id uuid; v_type text; v_sorte text; v_exp text; v_four uuid; v_cit text[];
        v_constat jsonb; v_resume text;
begin
  select * into d from public.filed_documents where id = p_document;
  if not found or d.nature in ('facture', 'avoir', 'bon_commande', 'bon_livraison', 'contrat', 'devis', 'releve') then return null; end if;
  select lower(p.type_piece) into v_type from public.pieces p where p.id = d.piece_id;
  v := coalesce(private.filed_valeurs(d.piece_id), '{}'::jsonb);
  if not (v_type in ('courrier', 'lettre', 'relance', 'mise_en_demeure')
          or exists (select 1 from jsonb_object_keys(v) k where k like 'courrier.%')) then
    return null;
  end if;
  select * into c from public.filed_courriers where document_id = p_document;
  if c.id is not null and c.source = 'humain' then return c.id; end if;
  v_sorte := lower(coalesce(v -> 'courrier.sorte' ->> 'valeur', case when v_type in ('relance', 'mise_en_demeure') then v_type end, 'autre'));
  if v_sorte not in ('relance', 'mise_en_demeure', 'changement_coordonnees', 'reclamation', 'information', 'autre') then v_sorte := 'autre'; end if;
  v_exp := left(nullif(btrim(coalesce(v -> 'courrier.expediteur' ->> 'valeur', v -> 'fournisseur.nom' ->> 'valeur', d.expediteur, '')), ''), 200);
  if v_exp is not null then
    select f.id into v_four from public.filed_fournisseurs f
     where f.client_id = d.client_id and f.nom_normalise = private.filed_normaliser_nom(v_exp) limit 1;
  end if;
  select coalesce(array_agg(distinct x) filter (where x <> ''), '{}') into v_cit
    from regexp_split_to_table(coalesce(v -> 'courrier.factures' ->> 'valeur', ''), '[,; ]+') x;
  insert into public.filed_courriers (client_id, entite_id, document_id, fournisseur_id, expediteur, objet, date_courrier, sorte,
                                      montant_reclame, reponse_avant, factures_citees, source)
  values (d.client_id, d.entite_id, d.id, v_four, v_exp, left(nullif(btrim(coalesce(v -> 'courrier.objet' ->> 'valeur', '')), ''), 300),
          private.filed_date_lue(v -> 'courrier.date' ->> 'valeur'), v_sorte, private.filed_montant_lu(v -> 'courrier.montant' ->> 'valeur'),
          private.filed_date_lue(v -> 'courrier.reponse_avant' ->> 'valeur'), v_cit, 'lecture')
  on conflict (document_id) do update
    set fournisseur_id = excluded.fournisseur_id, expediteur = excluded.expediteur, objet = excluded.objet, date_courrier = excluded.date_courrier,
        sorte = excluded.sorte, montant_reclame = excluded.montant_reclame, reponse_avant = excluded.reponse_avant, factures_citees = excluded.factures_citees
  returning id into v_id;
  v_constat := private.filed_constater_courrier(v_id);
  select string_agg(format('%s : %s', x ->> 'numero', case x ->> 'etat' when 'reglee' then 'déjà réglée' || coalesce(' le ' || to_char((x ->> 'regle_le')::date, 'DD/MM/YYYY'), '')
                                                                       when 'due' then 'due (' || (x ->> 'reste') || ' €)' else 'inconnue' end), ' ; ')
    into v_resume from jsonb_array_elements(v_constat) x;
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'courrier',
    left(format('Courrier lu (%s%s)%s.', replace(v_sorte, '_', ' '), coalesce(', ' || v_exp, ''), coalesce(' — ' || v_resume, '')), 500),
    jsonb_build_object('courrier', v_id, 'sorte', v_sorte, 'constat', v_constat));
  if v_sorte = 'changement_coordonnees' then
    perform private.lever_alerte_module(d.client_id, 'filed', 'attention',
      left(format('Courrier de %s annonçant un changement de coordonnées bancaires : ne rien changer sans contre-appeler le fournisseur à un numéro connu.',
                  coalesce(v_exp, 'un expéditeur')), 200),
      jsonb_build_object('courrier', v_id, 'document', d.id, 'fournisseur', v_four), 'filed:courrier:iban:' || v_id, true, null);
  end if;
  return v_id;
end $$;
revoke all on function private.filed_lire_courrier(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_courrier(uuid) to service_role;

create or replace function private.filed_document_courrier()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.nature is not null and new.nature not in ('facture', 'avoir', 'bon_commande', 'bon_livraison', 'contrat', 'devis', 'releve')
     and (tg_op = 'INSERT' or old.nature is distinct from new.nature or old.etat is distinct from new.etat) then
    begin
      perform private.filed_lire_courrier(new.id);
    exception when others then
      raise warning 'FILED : courrier non lu pour le document % (%)', new.id, sqlerrm;
    end;
  end if;
  return null;
end $$;
revoke all on function private.filed_document_courrier() from public, anon, authenticated;
grant execute on function private.filed_document_courrier() to service_role;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_courrier') then
    create trigger filed_documents_courrier after insert or update of nature, etat on public.filed_documents
      for each row execute function private.filed_document_courrier();
  end if;
end $$;

-- Une personne pose ou corrige la fiche (ses valeurs tiennent) ; les factures citées sont recontrôlées.
create or replace function private.filed_poser_courrier(p_document uuid, p_valeurs jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; v_id uuid; v jsonb := coalesce(p_valeurs, '{}'::jsonb);
begin
  select * into d from public.filed_documents where id = p_document;
  if not found then raise exception 'Document introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(d.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], d.entite_id);
  if d.nature in ('facture', 'avoir', 'bon_commande', 'bon_livraison', 'contrat', 'devis', 'releve') then
    raise exception 'Ce document est classé « % », pas comme courrier.', d.nature using errcode = '55000';
  end if;
  select c.id into v_id from public.filed_courriers c where c.document_id = p_document;
  if v_id is null then
    insert into public.filed_courriers (client_id, entite_id, document_id, source) values (d.client_id, d.entite_id, d.id, 'humain') returning id into v_id;
  end if;
  update public.filed_courriers c set
    expediteur = case when v ? 'expediteur' then left(nullif(btrim(v ->> 'expediteur'), ''), 200) else c.expediteur end,
    fournisseur_id = case when v ? 'fournisseur' then nullif(v ->> 'fournisseur', '')::uuid else c.fournisseur_id end,
    objet = case when v ? 'objet' then left(nullif(btrim(v ->> 'objet'), ''), 300) else c.objet end,
    date_courrier = case when v ? 'date' then (v ->> 'date')::date else c.date_courrier end,
    sorte = case when v ? 'sorte' then v ->> 'sorte' else c.sorte end,
    montant_reclame = case when v ? 'montant' then (v ->> 'montant')::numeric else c.montant_reclame end,
    reponse_avant = case when v ? 'reponse_avant' then (v ->> 'reponse_avant')::date else c.reponse_avant end,
    factures_citees = case when v ? 'factures' then array(select jsonb_array_elements_text(v -> 'factures')) else c.factures_citees end,
    source = 'humain', alerte_7_pour = null, alerte_0_pour = null
  where c.id = v_id;
  if exists (select 1 from public.filed_courriers c where c.id = v_id and c.fournisseur_id is not null
              and not exists (select 1 from public.filed_fournisseurs f where f.id = c.fournisseur_id and f.client_id = d.client_id)) then
    raise exception 'Le fournisseur n''est pas à cette organisation.' using errcode = '22023';
  end if;
  perform private.filed_constater_courrier(v_id);
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'courrier', 'Fiche du courrier posée par une personne.',
    jsonb_build_object('courrier', v_id, 'champs', (select jsonb_agg(k) from jsonb_object_keys(v) k)));
  return v_id;
end $$;
revoke all on function private.filed_poser_courrier(uuid, jsonb) from public, anon;
grant execute on function private.filed_poser_courrier(uuid, jsonb) to authenticated, service_role;
create or replace function public.filed_poser_courrier(p_document uuid, p_valeurs jsonb)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_courrier(p_document, p_valeurs) $$;
comment on function public.filed_poser_courrier(uuid, jsonb) is
  'Lot 49 (a4_57) : pose ou corrige la fiche d''un courrier (expediteur, fournisseur, objet, date, sorte, montant, reponse_avant, factures []) ; les factures citées sont recontrôlées. Membres (hors lecteur).';
revoke all on function public.filed_poser_courrier(uuid, jsonb) from public, anon;
grant execute on function public.filed_poser_courrier(uuid, jsonb) to authenticated, service_role;

create or replace function private.filed_traiter_courrier(p_courrier uuid, p_note text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_courriers; v_uid uuid;
begin
  select * into c from public.filed_courriers where id = p_courrier for update;
  if not found then raise exception 'Courrier introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], c.entite_id);
  update public.filed_courriers set statut = 'traite', traite_par = v_uid, traite_le = now(), note = left(nullif(btrim(p_note), ''), 1000) where id = c.id;
  perform private.filed_historiser(c.client_id, c.document_id, 'filed_document', c.document_id::text, 'courrier',
    'Courrier traité' || coalesce(' : ' || left(nullif(btrim(p_note), ''), 300), '.'), jsonb_build_object('courrier', c.id));
end $$;
revoke all on function private.filed_traiter_courrier(uuid, text) from public, anon;
grant execute on function private.filed_traiter_courrier(uuid, text) to authenticated, service_role;
create or replace function public.filed_traiter_courrier(p_courrier uuid, p_note text default null)
returns void language sql set search_path to '' as $$ select private.filed_traiter_courrier(p_courrier, p_note) $$;
comment on function public.filed_traiter_courrier(uuid, text) is 'Lot 49 (a4_57) : marque un courrier traité, avec une note. Membres (hors lecteur).';
revoke all on function public.filed_traiter_courrier(uuid, text) from public, anon;
grant execute on function public.filed_traiter_courrier(uuid, text) to authenticated, service_role;

create or replace function private.filed_courriers_a_traiter(p_client uuid)
returns table (courrier_id uuid, document_id uuid, sorte text, expediteur text, objet text, montant_reclame numeric, reponse_avant date,
               jours_restants integer, constat jsonb)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  return query
    select c.id, c.document_id, c.sorte, c.expediteur, c.objet, c.montant_reclame, c.reponse_avant, c.reponse_avant - current_date, c.constat
      from public.filed_courriers c
     where c.client_id = p_client and c.statut = 'a_traiter'
       and private.voit_objet(c.client_id, 'filed_document', c.document_id::text)
     order by c.reponse_avant nulls last, c.cree_le;
end $$;
revoke all on function private.filed_courriers_a_traiter(uuid) from public, anon;
grant execute on function private.filed_courriers_a_traiter(uuid) to authenticated, service_role;
create or replace function public.filed_courriers_a_traiter(p_client uuid)
returns table (courrier_id uuid, document_id uuid, sorte text, expediteur text, objet text, montant_reclame numeric, reponse_avant date,
               jours_restants integer, constat jsonb)
language sql stable set search_path to '' as $$ select * from private.filed_courriers_a_traiter(p_client) $$;
comment on function public.filed_courriers_a_traiter(uuid) is
  'Lot 49 (a4_57) : les courriers à traiter, par date de réponse, avec le constat des factures citées. Membres (hors lecteur).';
revoke all on function public.filed_courriers_a_traiter(uuid) from public, anon;
grant execute on function public.filed_courriers_a_traiter(uuid) to authenticated, service_role;

-- Le balayage : 7 jours avant la date de réponse, puis le jour même.
create or replace function private.filed_alerter_courriers(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare c public.filed_courriers; n integer := 0;
begin
  for c in select * from public.filed_courriers where statut = 'a_traiter' and reponse_avant is not null and reponse_avant >= p_aujourdhui
             for update skip locked loop
    if c.reponse_avant - p_aujourdhui <= 7 and c.alerte_7_pour is distinct from c.reponse_avant then
      update public.filed_courriers set alerte_7_pour = c.reponse_avant where id = c.id;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('Courrier de %s (%s) : réponse attendue avant le %s.', coalesce(c.expediteur, 'un expéditeur'), replace(c.sorte, '_', ' '),
                    to_char(c.reponse_avant, 'DD/MM/YYYY')), 200),
        jsonb_build_object('courrier', c.id, 'document', c.document_id), 'filed:courrier:7:' || c.id || ':' || c.reponse_avant, true, null);
      n := n + 1;
    end if;
    if c.reponse_avant = p_aujourdhui and c.alerte_0_pour is distinct from c.reponse_avant then
      update public.filed_courriers set alerte_0_pour = c.reponse_avant where id = c.id;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('Courrier de %s : la réponse est attendue aujourd''hui.', coalesce(c.expediteur, 'un expéditeur')), 200),
        jsonb_build_object('courrier', c.id, 'document', c.document_id), 'filed:courrier:0:' || c.id || ':' || c.reponse_avant, true, null);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.filed_alerter_courriers(date) from public, anon, authenticated;
grant execute on function private.filed_alerter_courriers(date) to service_role;

do $do$
declare
  v_def text;
  v_ancien text := $o$    perform private.filed_alerter_contrats(p_aujourdhui);
$o$;
  v_nouveau text := $n$    perform private.filed_alerter_contrats(p_aujourdhui);
    perform private.filed_alerter_courriers(p_aujourdhui);   -- a4_57
$n$;
begin
  v_def := pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure);
  if position('private.filed_alerter_courriers(p_aujourdhui)' in v_def) > 0 then
    raise notice 'a4_57 : private.filed_produire_exports déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_57 : le repère attendu (a4_56) n''est pas une fois et une seule dans private.filed_produire_exports. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_57 : private.filed_produire_exports branchée.';
end $do$;
