-- recupere 20261005164900 filed_lot4d_controles_identite
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : a4_04.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête e8132dc4-c615-4eb0-b642-cbc9f09569d1 (mcp__Supabase__execute_sql, 2026-10-05T16:53:02.189Z, résultat : réussi)
set lock_timeout = '8s';
-- FILED, lot 4d — Contrôles d'identité (a4_04, session A4, posé par le coordinateur)
create or replace function private.filed_tva_intracom_analyser(p text)
returns table (pays text, numero text, format_ok boolean, cle_verifiee boolean, valide boolean, motif text)
language plpgsql immutable set search_path to '' as $$
declare
  v       text := upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'));
  v_pays  text;
  v_num   text;
  v_fmt   boolean := false;
  v_cle   boolean := null;
  v_motif text := null;
  v_s     bigint;
  v_i     int;
  v_sum   int;
  v_prod  int;
  v_d     int[];
begin
  if char_length(v) < 4 then
    return query select null::text, v, false, null::boolean, false, 'Numéro vide ou trop court';
    return;
  end if;
  v_pays := left(v, 2);
  v_num  := substr(v, 3);

  case v_pays
    when 'FR' then
      v_fmt := v_num ~ '^[0-9A-HJ-NP-Z]{2}[0-9]{9}$';
      if v_fmt and v_num ~ '^[0-9]{2}[0-9]{9}$' then
        v_cle := left(v_num, 2)::int = (12 + 3 * (substr(v_num, 3, 9)::bigint % 97)) % 97;
      elsif v_fmt then
        v_cle := null;
      end if;
    when 'BE' then
      v_fmt := v_num ~ '^[01][0-9]{9}$';
      if v_fmt then v_cle := (97 - (left(v_num, 8)::bigint % 97)) = right(v_num, 2)::int; end if;
    when 'DE' then
      v_fmt := v_num ~ '^[1-9][0-9]{8}$';
      if v_fmt then
        v_prod := 10;
        for v_i in 1..8 loop
          v_sum := (substr(v_num, v_i, 1)::int + v_prod) % 10;
          if v_sum = 0 then v_sum := 10; end if;
          v_prod := (2 * v_sum) % 11;
        end loop;
        v_cle := ((11 - v_prod) % 10) = right(v_num, 1)::int;
      end if;
    when 'IT' then
      v_fmt := v_num ~ '^[0-9]{11}$';
      if v_fmt then v_cle := private.filed_luhn(v_num); end if;
    when 'LU' then
      v_fmt := v_num ~ '^[0-9]{8}$';
      if v_fmt then v_cle := (left(v_num, 6)::bigint % 89) = right(v_num, 2)::int; end if;
    when 'NL' then
      v_fmt := v_num ~ '^[0-9]{9}B[0-9]{2}$';
      if v_fmt then
        v_sum := 0;
        for v_i in 1..8 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * (10 - v_i); end loop;
        v_cle := (v_sum % 11) = substr(v_num, 9, 1)::int and (v_sum % 11) <> 10;
        if not v_cle then
          v_cle := (('2321' || left(v_num, 9) || '11' || right(v_num, 2))::numeric % 97) = 1;
        end if;
      end if;
    when 'PT' then
      v_fmt := v_num ~ '^[1-9][0-9]{8}$';
      if v_fmt then
        v_sum := 0;
        for v_i in 1..8 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * (10 - v_i); end loop;
        v_sum := 11 - (v_sum % 11);
        if v_sum >= 10 then v_sum := 0; end if;
        v_cle := v_sum = right(v_num, 1)::int;
      end if;
    when 'DK' then
      v_fmt := v_num ~ '^[0-9]{8}$';
      if v_fmt then
        v_d := array[2, 7, 6, 5, 4, 3, 2, 1];
        v_sum := 0;
        for v_i in 1..8 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * v_d[v_i]; end loop;
        v_cle := v_sum % 11 = 0;
      end if;
    when 'FI' then
      v_fmt := v_num ~ '^[0-9]{8}$';
      if v_fmt then
        v_d := array[7, 9, 10, 5, 8, 4, 2];
        v_sum := 0;
        for v_i in 1..7 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * v_d[v_i]; end loop;
        v_sum := 11 - (v_sum % 11);
        if v_sum = 11 then v_sum := 0; end if;
        v_cle := v_sum <> 10 and v_sum = right(v_num, 1)::int;
      end if;
    when 'SE' then
      v_fmt := v_num ~ '^[0-9]{10}01$';
      if v_fmt then v_cle := private.filed_luhn(left(v_num, 10)); end if;
    when 'PL' then
      v_fmt := v_num ~ '^[0-9]{10}$';
      if v_fmt then
        v_d := array[6, 5, 7, 2, 3, 4, 5, 6, 7];
        v_sum := 0;
        for v_i in 1..9 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * v_d[v_i]; end loop;
        v_cle := (v_sum % 11) <> 10 and (v_sum % 11) = right(v_num, 1)::int;
      end if;
    when 'AT' then
      v_fmt := v_num ~ '^U[0-9]{8}$';
      if v_fmt then
        v_sum := 0;
        for v_i in 2..8 loop
          if v_i % 2 = 0 then
            v_sum := v_sum + substr(v_num, v_i, 1)::int;
          else
            v_prod := substr(v_num, v_i, 1)::int * 2;
            v_sum := v_sum + v_prod / 10 + v_prod % 10;
          end if;
        end loop;
        v_cle := ((96 - v_sum) % 10 + 10) % 10 = right(v_num, 1)::int;
      end if;
    when 'SI' then
      v_fmt := v_num ~ '^[1-9][0-9]{7}$';
      if v_fmt then
        v_sum := 0;
        for v_i in 1..7 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * (9 - v_i); end loop;
        v_sum := 11 - (v_sum % 11);
        if v_sum = 10 then v_sum := 0; end if;
        v_cle := v_sum <> 11 and v_sum = right(v_num, 1)::int;
      end if;
    when 'HU' then
      v_fmt := v_num ~ '^[0-9]{8}$';
      if v_fmt then
        v_d := array[9, 7, 3, 1, 9, 7, 3];
        v_sum := 0;
        for v_i in 1..7 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * v_d[v_i]; end loop;
        v_cle := (10 - v_sum % 10) % 10 = right(v_num, 1)::int;
      end if;
    when 'EE' then v_fmt := v_num ~ '^10[0-9]{7}$';
    when 'ES' then v_fmt := v_num ~ '^([A-Z][0-9]{7}[0-9A-Z]|[0-9]{8}[A-Z])$';
    when 'IE' then v_fmt := v_num ~ '^([0-9]{7}[A-W][A-IW]?|[0-9][A-Z+*][0-9]{5}[A-W])$';
    when 'BG' then v_fmt := v_num ~ '^[0-9]{9,10}$';
    when 'CY' then v_fmt := v_num ~ '^[0-9]{8}[A-Z]$';
    when 'CZ' then v_fmt := v_num ~ '^[0-9]{8,10}$';
    when 'EL' then v_fmt := v_num ~ '^[0-9]{9}$';
    when 'HR' then v_fmt := v_num ~ '^[0-9]{11}$';
    when 'LT' then v_fmt := v_num ~ '^([0-9]{9}|[0-9]{12})$';
    when 'LV' then v_fmt := v_num ~ '^[0-9]{11}$';
    when 'MT' then v_fmt := v_num ~ '^[0-9]{8}$';
    when 'RO' then v_fmt := v_num ~ '^[1-9][0-9]{1,9}$';
    when 'SK' then v_fmt := v_num ~ '^[0-9]{10}$';
    when 'XI' then v_fmt := v_num ~ '^([0-9]{9}|[0-9]{12})$';
    else
      return query select v_pays, v_num, false, null::boolean, false, format('Préfixe « %s » : hors de l''Union européenne', v_pays);
      return;
  end case;

  if not v_fmt then
    v_motif := format('Format inattendu pour %s', v_pays);
  elsif v_cle is false then
    v_motif := format('Clé de contrôle fausse pour %s', v_pays);
  elsif v_cle is null then
    v_motif := format('Format correct pour %s ; cet État n''a pas de clé publique calculable', v_pays);
  else
    v_motif := format('Format et clé corrects pour %s', v_pays);
  end if;

  return query select v_pays, v_num, v_fmt, v_cle, (v_fmt and v_cle is distinct from false), v_motif;
end $$;
comment on function private.filed_tva_intracom_analyser(text) is
  'Format et clé de contrôle d''un numéro de TVA intracommunautaire, pays par pays, sans appel réseau. La confirmation par VIES est l''affaire de l''ouvrier (filed_verifications_tiers).';

create or replace function private.filed_siren_de_tva_fr(p text) returns text
language sql immutable set search_path to '' as $$
  select case when upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) ~ '^FR[0-9A-HJ-NP-Z]{2}[0-9]{9}$'
              then right(upper(regexp_replace(p, '[^A-Za-z0-9]', '', 'g')), 9) end
$$;

create table if not exists public.filed_verifications_tiers (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  fournisseur_id  uuid references public.filed_fournisseurs(id) on delete cascade,
  registre        text not null check (registre in ('vies', 'sirene')),
  identifiant     text not null,
  demande_le      timestamptz not null default now(),
  repondu_le      timestamptz,
  resultat        text check (resultat in ('valide', 'invalide', 'indisponible')),
  preuve          jsonb not null default '{}'::jsonb,
  cree_le         timestamptz not null default now()
);
comment on table public.filed_verifications_tiers is
  'Les vérifications d''un fournisseur demandées aux registres publics (VIES pour la TVA de l''Union, Sirene pour le SIREN). FILED demande ; l''ouvrier appelle et écrit la réponse ; le contrôle la lit. Ajout seul : une nouvelle vérification s''ajoute, la précédente reste.';
create index if not exists filed_verifications_tiers_cle
  on public.filed_verifications_tiers (client_id, registre, identifiant, demande_le desc);
create index if not exists filed_verifications_tiers_fournisseur
  on public.filed_verifications_tiers (fournisseur_id);
alter table public.filed_verifications_tiers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_verifications_tiers' and policyname = 'filed_verifications_tiers_lecture') then
    execute 'create policy filed_verifications_tiers_lecture on public.filed_verifications_tiers for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke insert, update, delete on public.filed_verifications_tiers from anon, authenticated;
grant select on public.filed_verifications_tiers to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_verifications_tiers', 5, 'FILED, lot 4')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

create or replace function private.filed_verification_recente(p_client uuid, p_registre text, p_identifiant text, p_jours int default 90)
returns public.filed_verifications_tiers
language sql stable set search_path to '' as $$
  select v from public.filed_verifications_tiers v
  where v.client_id = p_client and v.registre = p_registre
    and v.identifiant = upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g'))
    and v.repondu_le is not null and v.repondu_le >= now() - make_interval(days => p_jours)
  order by v.repondu_le desc limit 1
$$;

create or replace function private.filed_demander_verification(p_client uuid, p_fournisseur uuid, p_registre text, p_identifiant text)
returns uuid language plpgsql set search_path to '' as $$
declare v_id uuid; v_ident text := upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_ident = '' then return null; end if;
  select id into v_id from public.filed_verifications_tiers
   where client_id = p_client and registre = p_registre and identifiant = v_ident and repondu_le is null
   order by demande_le desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant)
  values (p_client, p_fournisseur, p_registre, v_ident) returning id into v_id;
  return v_id;
end $$;

create or replace function private.filed_repondre_verification(p_verification uuid, p_resultat text, p_preuve jsonb)
returns void language plpgsql set search_path to '' as $$
begin
  if p_resultat not in ('valide', 'invalide', 'indisponible') then
    raise exception 'Résultat inconnu : %', p_resultat using errcode = '22023';
  end if;
  update public.filed_verifications_tiers
     set repondu_le = now(), resultat = p_resultat, preuve = coalesce(p_preuve, '{}'::jsonb)
   where id = p_verification and repondu_le is null;
  if not found then
    raise exception 'Vérification inconnue ou déjà répondue.' using errcode = 'P0002';
  end if;
end $$;
create or replace function public.filed_repondre_verification(p_verification uuid, p_resultat text, p_preuve jsonb default '{}'::jsonb)
returns void language sql security definer set search_path to '' as $$
  select private.filed_repondre_verification(p_verification, p_resultat, p_preuve)
$$;
comment on function public.filed_repondre_verification(uuid, text, jsonb) is
  'Porte de l''ouvrier : la réponse de VIES ou de Sirene pour une vérification demandée. Réservée au service.';
revoke all on function public.filed_repondre_verification(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.filed_repondre_verification(uuid, text, jsonb) to service_role;

create or replace function private.filed_controles_identite(p_facture uuid) returns void
language plpgsql set search_path to '' as $$
declare
  v_f      public.filed_factures;
  v_four   public.filed_fournisseurs;
  v_tva    text;
  v_siren  text;
  v_a      record;
  v_verif  public.filed_verifications_tiers;
  v_siren_tva text;
  v_tva_ok boolean := false;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  if v_f.fournisseur_id is not null then
    select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  end if;

  v_tva   := coalesce(nullif(v_f.fournisseur_lu->>'tva', ''), v_four.tva);
  v_siren := coalesce(nullif(v_f.fournisseur_lu->>'siren', ''), v_four.siren,
                      case when nullif(v_f.fournisseur_lu->>'siret', '') is not null then left(regexp_replace(v_f.fournisseur_lu->>'siret', '[^0-9]', '', 'g'), 9) end,
                      case when v_four.siret is not null then left(regexp_replace(v_four.siret, '[^0-9]', '', 'g'), 9) end);
  v_siren := nullif(regexp_replace(coalesce(v_siren, ''), '[^0-9]', '', 'g'), '');

  if v_tva is null then
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'attention', true,
      'Aucun numéro de TVA intracommunautaire sur la pièce ni sur le fournisseur.', 'EMMET_INC',
      jsonb_build_object('tva', null), 'absent');
  else
    select * into v_a from private.filed_tva_intracom_analyser(v_tva);
    v_tva_ok := coalesce(v_a.valide, false);
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'bloquant', not v_a.valide,
      case when v_a.valide then format('Numéro de TVA %s : %s.', v_a.pays, v_a.motif)
           else format('Numéro de TVA intracommunautaire invalide : %s.', v_a.motif) end,
      'EMMET_INC',
      jsonb_build_object('tva', v_tva, 'pays', v_a.pays, 'format_ok', v_a.format_ok, 'cle_verifiee', v_a.cle_verifiee),
      v_a.numero);
  end if;

  if v_siren is null then
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'attention', true,
      'Aucun SIREN sur la pièce ni sur le fournisseur.', 'EMMET_INC', jsonb_build_object('siren', null), 'absent');
  else
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'bloquant', not private.filed_siren_valide(v_siren),
      case when private.filed_siren_valide(v_siren) then format('SIREN %s : clé correcte.', v_siren)
           else format('SIREN %s : clé de contrôle fausse.', v_siren) end,
      'EMMET_INC', jsonb_build_object('siren', v_siren), v_siren);
  end if;

  v_siren_tva := private.filed_siren_de_tva_fr(v_tva);
  if v_siren_tva is not null and v_siren is not null then
    perform private.filed_poser_resultat(v_f, 'identite.coherence', 'bloquant', v_siren_tva <> v_siren,
      case when v_siren_tva = v_siren then 'Le numéro de TVA et le SIREN désignent la même entreprise.'
           else format('Le numéro de TVA porte le SIREN %s, la pièce donne %s.', v_siren_tva, v_siren) end,
      'EMMET_INC', jsonb_build_object('siren_tva', v_siren_tva, 'siren', v_siren), v_siren_tva || '/' || v_siren);
  end if;

  if v_tva_ok then
    v_verif := private.filed_verification_recente(v_f.client_id, 'vies', v_tva);
    if v_verif.id is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, 'vies', v_tva);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'Numéro de TVA pas encore confirmé par VIES : vérification demandée.', 'EMMET_INC',
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva), 'vies:' || v_tva);
    elsif v_verif.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        format('VIES ne reconnaît pas le numéro de TVA %s (réponse du %s).', v_tva, to_char(v_verif.repondu_le, 'DD/MM/YYYY')),
        'EMMET_INC', jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le, 'preuve', v_verif.preuve), 'vies:' || v_tva);
    elsif v_verif.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'VIES n''a pas répondu : numéro de TVA à confirmer.', 'EMMET_INC',
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le), 'vies:' || v_tva);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('Numéro de TVA confirmé par VIES le %s.', to_char(v_verif.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le), 'vies:' || v_tva);
    end if;
  elsif v_siren is not null and private.filed_siren_valide(v_siren) then
    v_verif := private.filed_verification_recente(v_f.client_id, 'sirene', v_siren);
    if v_verif.id is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, 'sirene', v_siren);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'SIREN pas encore confirmé par Sirene : vérification demandée.', 'EMMET_INC',
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren), 'sirene:' || v_siren);
    elsif v_verif.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        format('Sirene ne connaît pas le SIREN %s, ou l''entreprise est fermée (réponse du %s).', v_siren, to_char(v_verif.repondu_le, 'DD/MM/YYYY')),
        'EMMET_INC', jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le, 'preuve', v_verif.preuve), 'sirene:' || v_siren);
    elsif v_verif.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'Sirene n''a pas répondu : SIREN à confirmer.', 'EMMET_INC',
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le), 'sirene:' || v_siren);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('SIREN confirmé par Sirene le %s.', to_char(v_verif.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le), 'sirene:' || v_siren);
    end if;
  end if;
end $$;
comment on function private.filed_controles_identite(uuid) is
  'Les contrôles d''identité du fournisseur d''une facture (TVA intracommunautaire, SIREN, cohérence, registres). Appelée par private.filed_controler_facture.';
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005164900', 'filed_lot4d_controles_identite', array['-- A4 a4_04, posé par execute_sql']);
select 'a4_04 ok' as r, (select (private.filed_tva_intracom_analyser('FR40303265045')).valide) as essai_tva;
