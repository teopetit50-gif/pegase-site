-- 20261011145239 b1_17_caisses
-- Source : dépôt : c78b91c omega/modules/varelo/migrations/b1_17_caisses.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b1_17_caisses.sql @ c78b91c ; b1_20 cité comme test : ignoré ; b1_13 cité comme test : ignoré.
-- ═══ omega/modules/varelo/migrations/b1_17_caisses.sql @ c78b91c
-- b1_17 — VARELO : les ventes des caisses de chaque société (11/10/2026, B1)
--
-- CE QUE ÇA CORRIGE (omega/CHIFFRAGE/varelo.md, lignes 24 et 26). La page promet « Varelo lit vos logiciels de
-- gestion, vos caisses et vos tableurs » et montre « les sources d'une société : logiciel de gestion, caisses,
-- tableurs et documents ». Rien ne lisait une caisse.
--
-- CE QUE ÇA POSE (après b1_16) :
--   · Le jeu « ventes_caisse » (le Z de caisse par magasin et par jour : jour, magasin, CA TTC, CA HT, tickets)
--     dans public.modeles_jeux pour six logiciels de caisse ou tableurs : tableur, lightspeed, zelty, tiller,
--     sumup, cashpad. Signature « Magasin » + « CA TTC » (aucun recouvrement avec les cinq jeux de b1_10/b1_14) ;
--     fenêtre observée sur la colonne jour (un export quotidien ne dit rien des jours qu'il ne contient pas).
--     En-têtes : hypothèses à ajuster sur un vrai export par l'essai à blanc d'A1.
--   · public.grp_ventes_caisse (une ligne par société, magasin et jour ; un nouveau dépôt du même jour la remplace).
--   · La porte grp_deposer_ventes(client, société, lignes, source) : le dépôt à la main (CSV collé), et le même
--     geste pour le lecteur d'exports (grp_appliquer_jeu, remplacée). Montants à la française (grp_montant),
--     dates JJ/MM/AAAA ou AAAA-MM-JJ ; une ligne illisible est rejetée avec sa raison.
--   · La vue grp_ventes_magasins : par magasin, hier, le même jour de la semaine dernière, le mois en cours.
--   · « Le groupe ce matin » (grp_lignes_groupe, remplacée) : les ventes d'hier du groupe (info), une société dont
--     les caisses vendent 20 % de moins que le même jour de la semaine dernière (attention), un magasin muet hier
--     alors qu'il vendait le même jour la semaine dernière (attention).
--
-- Règles de pose : on conflict do nothing ; create … if not exists ; create or replace ; aucune suppression.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Le modèle d'export « ventes_caisse »
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  l text;
  v_cols jsonb := jsonb_build_object(
    'jour', jsonb_build_object('type', 'date', 'obligatoire', true, 'libelle', 'Jour de vente',
                               'entetes', jsonb_build_array('Date', 'Jour', 'Date de vente', 'Date du Z', 'Journée')),
    'magasin', jsonb_build_object('type', 'texte', 'obligatoire', true, 'libelle', 'Magasin ou point de vente',
                                  'entetes', jsonb_build_array('Magasin', 'Point de vente', 'Boutique', 'Établissement', 'Site', 'Caisse')),
    'ca_ttc', jsonb_build_object('type', 'texte', 'obligatoire', true, 'libelle', 'Chiffre d''affaires TTC',
                                 'entetes', jsonb_build_array('CA TTC', 'Total TTC', 'Ventes TTC', 'Montant TTC', 'Chiffre d''affaires TTC')),
    'ca_ht', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('CA HT', 'Total HT', 'Ventes HT', 'Montant HT')),
    'tickets', jsonb_build_object('type', 'texte', 'facultative', true, 'entetes', jsonb_build_array('Tickets', 'Nombre de tickets', 'Nb tickets', 'Transactions', 'Couverts')));
  v_source constant text := 'omega/modules/varelo/migrations/b1_17_caisses.sql ; Z de caisse journalier par magasin (hypothèses d''en-têtes, à ajuster sur un vrai export par l''essai à blanc d''A1)';
begin
  foreach l in array array['tableur', 'lightspeed', 'zelty', 'tiller', 'sumup', 'cashpad'] loop
    insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, fenetre,
                                     confirmer_disparition, seuil_perte, perte_min, seuil_anomalies, options, accuse, source)
    values ('varelo', l, 'ventes_caisse', 1, 'Ventes des caisses (Z par magasin et par jour)', '^(ventes?[_ -]?caisses?|z[_ -]?caisse|caisses?[_ -]|ca[_ -]jour)',
            array['Magasin', 'CA TTC'], v_cols, array['jour', 'magasin'], false, '{"colonne": "jour", "observee": true}'::jsonb,
            1, 0.5, 1, 0.05, '{}'::jsonb, true, v_source)
    on conflict on constraint modeles_jeux_une_version do nothing;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les ventes
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_ventes_caisse (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  magasin text not null,
  jour date not null,
  ca_ttc numeric(16,2) not null,
  ca_ht numeric(16,2),
  tickets integer,
  source text,
  depose_par uuid,
  depose_le timestamptz not null default clock_timestamp(),
  constraint grp_ventes_caisse_cle unique (client_id, entite_id, magasin, jour),
  constraint grp_ventes_caisse_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_ventes_caisse_magasin_check check (char_length(btrim(magasin)) between 1 and 120),
  constraint grp_ventes_caisse_tickets_check check (tickets >= 0),
  constraint grp_ventes_caisse_source_check check (char_length(source) <= 200)
);
comment on table public.grp_ventes_caisse is 'VARELO — les ventes des caisses d''une société du groupe, par magasin et par jour (le Z de caisse). Écrite par grp_deposer_ventes (dépôt à la main ou export lu).';

create index if not exists grp_ventes_caisse_jour_idx on public.grp_ventes_caisse (client_id, jour);

create or replace trigger grp_ventes_caisse_tracer after insert or update on public.grp_ventes_caisse
  for each row execute function private.tracer();

alter table public.grp_ventes_caisse enable row level security;
revoke all on public.grp_ventes_caisse from anon, authenticated;
grant select on public.grp_ventes_caisse to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_ventes_caisse'
                 and policyname = 'membres lisent les ventes de leur perimetre') then
    create policy "membres lisent les ventes de leur perimetre" on public.grp_ventes_caisse
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

-- Par magasin : hier, le même jour de la semaine dernière, le mois en cours, le dernier jour remonté.
create or replace view public.grp_ventes_magasins with (security_invoker = true) as
  select v.client_id, v.entite_id, e.nom as societe, v.magasin,
         sum(v.ca_ttc) filter (where v.jour = current_date - 1) as hier_ttc,
         sum(v.tickets) filter (where v.jour = current_date - 1) as hier_tickets,
         sum(v.ca_ttc) filter (where v.jour = current_date - 8) as semaine_derniere_ttc,
         sum(v.ca_ttc) filter (where v.jour >= date_trunc('month', current_date - 1)::date and v.jour <= current_date - 1) as mois_ttc,
         max(v.jour) as dernier_jour
  from public.grp_ventes_caisse v
  join public.entites e on e.client_id = v.client_id and e.id = v.entite_id
  where v.jour >= current_date - 62
  group by v.client_id, v.entite_id, e.nom, v.magasin;
comment on view public.grp_ventes_magasins is 'VARELO — les ventes des caisses par magasin : hier, le même jour de la semaine dernière, le mois en cours, le dernier jour remonté (périmètre de la personne).';
revoke all on public.grp_ventes_magasins from anon, authenticated;
grant select on public.grp_ventes_magasins to authenticated;

-- Une date d'export : AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA, JJ/MM/AA ; illisible : null.
create or replace function private.grp_date(p text)
 returns date
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t text := btrim(coalesce(p, ''));
begin
  if t ~ '^\d{4}-\d{2}-\d{2}' then
    return left(t, 10)::date;
  elsif t ~ '^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$' then
    return to_date(regexp_replace(t, '[.-]', '/', 'g'), 'DD/MM/YYYY');
  elsif t ~ '^\d{1,2}[/.-]\d{1,2}[/.-]\d{2}$' then
    return to_date(regexp_replace(t, '[.-]', '/', 'g'), 'DD/MM/YY');
  end if;
  return null;
exception when others then
  return null;
end $function$;

create or replace function private.grp_deposer_ventes(p_client uuid, p_entite uuid, p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  l jsonb;
  i integer := 0;
  v_jour date;
  v_ttc numeric;
  v_ht numeric;
  v_tickets numeric;
  v_magasin text;
  n_ok integer := 0;
  v_rejets jsonb := '[]'::jsonb;
  v_jours date[] := '{}';
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Des ventes se déposent par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, p_entite) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_lignes, 'null'::jsonb)) <> 'array' then
    raise exception 'Les ventes se donnent en liste de lignes.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Vingt mille lignes au plus par dépôt.' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  for l in select * from jsonb_array_elements(p_lignes) loop
    i := i + 1;
    v_jour := private.grp_date(l ->> 'jour');
    v_magasin := left(nullif(btrim(coalesce(l ->> 'magasin', '')), ''), 120);
    v_ttc := private.grp_montant(l ->> 'ca_ttc');
    v_ht := private.grp_montant(l ->> 'ca_ht');
    v_tickets := private.grp_montant(l ->> 'tickets');
    if v_jour is null then
      v_rejets := v_rejets || jsonb_build_object('ligne', i, 'motif', 'jour illisible');
    elsif v_jour >= current_date + 1 then
      v_rejets := v_rejets || jsonb_build_object('ligne', i, 'motif', 'jour dans le futur');
    elsif v_magasin is null then
      v_rejets := v_rejets || jsonb_build_object('ligne', i, 'motif', 'magasin absent');
    elsif v_ttc is null or v_ttc = 'NaN'::numeric then
      v_rejets := v_rejets || jsonb_build_object('ligne', i, 'motif', 'CA TTC illisible');
    elsif v_ht = 'NaN'::numeric or v_tickets = 'NaN'::numeric or v_tickets < 0 then
      v_rejets := v_rejets || jsonb_build_object('ligne', i, 'motif', 'CA HT ou tickets illisibles');
    else
      insert into public.grp_ventes_caisse as v (client_id, entite_id, magasin, jour, ca_ttc, ca_ht, tickets, source, depose_par)
      values (p_client, p_entite, v_magasin, v_jour, round(v_ttc, 2), round(v_ht, 2), round(v_tickets)::integer, left(p_source, 200), v_uid)
      on conflict (client_id, entite_id, magasin, jour) do update
        set ca_ttc = excluded.ca_ttc, ca_ht = excluded.ca_ht, tickets = excluded.tickets, source = excluded.source,
            depose_par = excluded.depose_par, depose_le = clock_timestamp();
      n_ok := n_ok + 1;
      if not v_jour = any (v_jours) then
        v_jours := v_jours || v_jour;
      end if;
    end if;
  end loop;
  perform private.grp_journal(p_client, 'varelo.ventes.depot', 'grp_societes', p_entite::text,
    jsonb_build_object('lignes', i, 'retenues', n_ok, 'rejets', jsonb_array_length(v_rejets), 'source', left(p_source, 200),
                       'du', (select min(x) from unnest(v_jours) x), 'au', (select max(x) from unnest(v_jours) x)), p_entite);
  return jsonb_build_object('lignes', i, 'retenues', n_ok, 'rejets', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select x from jsonb_array_elements(v_rejets) x limit 50) t),
                            'rejetees', jsonb_array_length(v_rejets), 'jours', cardinality(v_jours));
end $function$;

create or replace function public.grp_deposer_ventes(p_client uuid, p_entite uuid, p_lignes jsonb, p_source text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_deposer_ventes(p_client, p_entite, p_lignes, p_source) $function$;

-- Le lecteur d'exports verse le jeu ventes_caisse comme les autres (remplace celle de b1_10).
create or replace function private.grp_appliquer_jeu(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_arrete date, p_source text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  return case p_jeu
    when 'fournisseurs' then private.grp_deposer_codes(p_client, p_entite, 'fournisseur', p_lignes, p_source)
    when 'clients' then private.grp_deposer_codes(p_client, p_entite, 'client', p_lignes, p_source)
    when 'balance_agee_clients' then private.grp_deposer_encours(p_client, p_entite, 'client', p_arrete, p_lignes, p_source)
    when 'balance_agee_fournisseurs' then private.grp_deposer_encours(p_client, p_entite, 'fournisseur', p_arrete, p_lignes, p_source)
    when 'balance_generale' then private.grp_deposer_balance(p_client, p_entite, p_arrete, null, p_lignes, p_source)
    when 'ventes_caisse' then private.grp_deposer_ventes(p_client, p_entite, p_lignes, p_source)
  end;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. « Le groupe ce matin » : les caisses d'hier (remplace celle de b1_08)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_lignes_groupe(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
  v jsonb := '[]'::jsonb;
  v_total jsonb;
  n integer := 0;
begin
  for r in select g.* from public.grp_groupe_page g where g.client_id = p_client order by g.societe loop
    exit when n >= 15;
    if r.sous_plancher then
      v := v || jsonb_build_object('texte', left(format('%s : trésorerie de %s €, sous son plancher de %s € (balance au %s)', r.societe,
               private.grp_euros(r.tresorerie), private.grp_euros(r.tresorerie_plancher), to_char(r.arrete_le, 'DD/MM')), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
      n := n + 1;
    end if;
    if r.objectif_a_date is not null and r.objectif_a_date > 0 and r.ecart_objectif < -0.10 * r.objectif_a_date then
      v := v || jsonb_build_object('texte', left(format('%s : ventes de %s € au %s, %s € sous l''objectif à date', r.societe,
               private.grp_euros(r.ventes), to_char(r.arrete_le, 'DD/MM'), private.grp_euros(-r.ecart_objectif)), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
      n := n + 1;
    end if;
    if r.age_jours > 35 then
      v := v || jsonb_build_object('texte', left(format('La balance générale de %s date du %s (%s jours) : à redéposer', r.societe,
               to_char(r.arrete_le, 'DD/MM'), r.age_jours), 300),
             'gravite', 'info', 'lien', '/espace/varelo', 'objet_type', 'grp_balances_depots', 'objet_id', r.depot_id::text);
      n := n + 1;
    end if;
  end loop;
  -- b1_17 : les caisses d'hier
  for r in
    select m.entite_id, m.societe, sum(m.hier_ttc) as hier, sum(m.semaine_derniere_ttc) as avant,
           count(*) filter (where m.hier_ttc is not null) as magasins
    from public.grp_ventes_magasins m where m.client_id = p_client
    group by m.entite_id, m.societe order by m.societe
  loop
    exit when n >= 15;
    if r.avant is not null and r.avant > 0 and coalesce(r.hier, 0) < 0.8 * r.avant then
      v := v || jsonb_build_object('texte', left(format('%s : caisses d''hier à %s € TTC, %s %% sous le même jour de la semaine dernière (%s €)', r.societe,
               private.grp_euros(coalesce(r.hier, 0)), round(100 * (1 - coalesce(r.hier, 0) / r.avant)), private.grp_euros(r.avant)), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
      n := n + 1;
    end if;
  end loop;
  for r in
    select m.* from public.grp_ventes_magasins m
    where m.client_id = p_client and m.hier_ttc is null and coalesce(m.semaine_derniere_ttc, 0) > 0
    order by m.societe, m.magasin
  loop
    exit when n >= 15;
    v := v || jsonb_build_object('texte', left(format('%s (%s) : aucune vente remontée hier, alors qu''il vendait %s € le même jour la semaine dernière',
             r.magasin, r.societe, private.grp_euros(r.semaine_derniere_ttc)), 300),
           'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
    n := n + 1;
  end loop;
  select jsonb_build_object('texte', format('Caisses d''hier : %s € TTC pour le groupe, %s magasin%s', private.grp_euros(sum(m.hier_ttc)),
           count(*), case when count(*) > 1 then 's' else '' end), 'gravite', 'info', 'lien', '/espace/varelo')
    into v_total from public.grp_ventes_magasins m where m.client_id = p_client and m.hier_ttc is not null having count(*) > 0;
  if v_total is not null and n < 15 then
    v := v || v_total;
  end if;
  return v;
end $function$;

revoke execute on function private.grp_date(text) from public, anon, authenticated;
grant execute on function private.grp_date(text) to service_role;
revoke execute on function private.grp_appliquer_jeu(uuid, uuid, text, jsonb, date, text) from public, anon, authenticated;
grant execute on function private.grp_appliquer_jeu(uuid, uuid, text, jsonb, date, text) to service_role;
revoke execute on function private.grp_deposer_ventes(uuid, uuid, jsonb, text) from public, anon;
grant execute on function private.grp_deposer_ventes(uuid, uuid, jsonb, text) to authenticated, service_role;
revoke execute on function public.grp_deposer_ventes(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.grp_deposer_ventes(uuid, uuid, jsonb, text) to authenticated, service_role;
