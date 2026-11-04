-- 20261022193532 a4_80_filed_lot72_messages_clairs
-- Source : dépôt : e47a002f6d09607109405db8252226309cf4051f omega/migrations/a4_80_filed_lot72_messages_clairs.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_80_filed_lot72_messages_clairs.sql @ e47a002f6d09607109405db8252226309cf4051f.
-- ═══ omega/migrations/a4_80_filed_lot72_messages_clairs.sql @ e47a002f6d09607109405db8252226309cf4051f
-- a4_80 (FILED lot 72) : des messages clairs, jamais une contrainte ou un transtypage bruts (TFILED-18, TFILED-19).
--
-- TFILED-19 (testeur boîte noire, 22/10/2026) : public.filed_poser_compte avec une nature inconnue renvoyait la contrainte
-- brute (filed_plan_comptable_nature_check, code interne), sans dire les valeurs admises.
-- TFILED-18 : public.filed_imputer_facture avec {"compte": "601000"} renvoyait 22P02 (« invalid input syntax for type
-- uuid ») : « compte » n'acceptait qu'un identifiant.
--
--   · filed_poser_compte : une nature hors liste est refusée avant l'écriture, en clair (22023) : « charge,
--     immobilisation, stock, tiers ou autre ».
--   · filed_imputer_facture, chaque ligne :
--       - « compte » accepte l'identifiant du compte OU son numéro (601000) ; « numero » reste accepté ;
--       - « centre » accepte l'identifiant du centre OU son code ; « code » reste accepté ;
--       - « montant_ht » illisible est refusé en clair, avec la ligne ;
--       - un compte introuvable dit ce qui a été donné et la forme attendue.
--     Mêmes règles pour la reprise des propositions (le rapprochement ligne / proposition).
-- Repères dans private.filed_poser_compte et private.filed_imputer_facture ; chaque pose s'arrête si son repère n'est
-- pas trouvé une fois. Rejouable ; aucune suppression.

create or replace function private.filed_uuid_ou_rien(p text)
returns uuid language sql immutable set search_path to '' as $$
  select case when btrim(coalesce(p, '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then btrim(p)::uuid end
$$;

-- Le compte d'une ligne : « compte » (identifiant ou numéro) ou « numero ».
create or replace function private.filed_compte_de_ligne(p_client uuid, p_entite uuid, p_l jsonb)
returns uuid language plpgsql stable security definer set search_path to '' as $$
declare v_id uuid := private.filed_uuid_ou_rien(p_l ->> 'compte'); v_num text;
begin
  if v_id is not null then return v_id; end if;
  v_num := nullif(regexp_replace(coalesce(nullif(btrim(p_l ->> 'numero'), ''), p_l ->> 'compte', ''), '[^0-9]', '', 'g'), '');
  if v_num is null then return null; end if;
  select c.id into v_id from public.filed_plan_comptable c
   where c.client_id = p_client and c.numero = v_num and (c.entite_id = p_entite or c.entite_id is null)
   order by (c.entite_id is not null) desc limit 1;
  return v_id;
end $$;

-- Le centre de coût d'une ligne : « centre » (identifiant ou code) ou « code ».
create or replace function private.filed_centre_de_ligne(p_client uuid, p_entite uuid, p_l jsonb)
returns uuid language plpgsql stable security definer set search_path to '' as $$
declare v_id uuid := private.filed_uuid_ou_rien(p_l ->> 'centre'); v_code text;
begin
  if v_id is not null then return v_id; end if;
  v_code := upper(nullif(btrim(coalesce(nullif(btrim(p_l ->> 'code'), ''), p_l ->> 'centre', '')), ''));
  if v_code is null then return null; end if;
  select k.id into v_id from public.filed_centres_cout k
   where k.client_id = p_client and k.code = v_code and (k.entite_id = p_entite or k.entite_id is null)
   order by (k.entite_id is not null) desc limit 1;
  return v_id;
end $$;

-- Le montant hors taxes d'une ligne, ou nul ; illisible, il est refusé en clair.
create or replace function private.filed_montant_de_ligne(p_l jsonb, p_rang integer)
returns numeric language plpgsql immutable set search_path to '' as $$
declare v text := btrim(coalesce(p_l ->> 'montant_ht', ''));
begin
  if v = '' then return null; end if;
  if v !~ '^-?[0-9]+([.,][0-9]+)?$' then
    raise exception 'Ligne % : montant hors taxes illisible (%) : un nombre, par exemple 125.40.', p_rang, left(v, 40) using errcode = '22023';
  end if;
  return replace(v, ',', '.')::numeric;
end $$;

revoke all on function private.filed_uuid_ou_rien(text) from public, anon, authenticated;
revoke all on function private.filed_compte_de_ligne(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.filed_centre_de_ligne(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.filed_montant_de_ligne(jsonb, integer) from public, anon, authenticated;
grant execute on function private.filed_uuid_ou_rien(text) to service_role;
grant execute on function private.filed_compte_de_ligne(uuid, uuid, jsonb) to service_role;
grant execute on function private.filed_centre_de_ligne(uuid, uuid, jsonb) to service_role;
grant execute on function private.filed_montant_de_ligne(jsonb, integer) to service_role;

create or replace function private.filed_a4_80_remplacer(p_def text, p_ancien text, p_nouveau text, p_nom text)
returns text language plpgsql immutable set search_path to '' as $$
declare v_n int := (length(p_def) - length(replace(p_def, p_ancien, ''))) / length(p_ancien);
begin
  if v_n <> 1 then raise exception 'a4_80 : repère « % » trouvé % fois (1 attendu)', p_nom, v_n; end if;
  return replace(p_def, p_ancien, p_nouveau);
end $$;
revoke all on function private.filed_a4_80_remplacer(text, text, text, text) from public, anon, authenticated;

-- 1. filed_poser_compte : la nature, en clair.
do $$
declare v_def text := pg_get_functiondef('private.filed_poser_compte(uuid, uuid, text, text, text, boolean)'::regprocedure);
  v_ligne constant text := E'  if nullif(btrim(p_libelle), '''') is null then raise exception ''Un compte porte un libellé.'' using errcode = ''22023''; end if;\n';
begin
  if position('a4_80' in v_def) > 0 then return; end if;
  execute private.filed_a4_80_remplacer(v_def, v_ligne,
    v_ligne
    || E'  if coalesce(p_nature, ''charge'') not in (''charge'', ''immobilisation'', ''stock'', ''tiers'', ''autre'') then   -- a4_80\n'
    || E'    raise exception ''Nature de compte inconnue (%) : charge, immobilisation, stock, tiers ou autre.'', p_nature using errcode = ''22023'';\n'
    || E'  end if;\n',
    'libellé');
end $$;

-- 2. filed_imputer_facture : compte, centre et montant lus sans transtypage brut.
do $$
declare v_def text := pg_get_functiondef('private.filed_imputer_facture(uuid, jsonb, text)'::regprocedure);
begin
  if position('a4_80' in v_def) > 0 then return; end if;
  v_def := private.filed_a4_80_remplacer(v_def, E'coalesce((l->>''compte'')::uuid, (select c.id from public.filed_plan_comptable c where c.client_id = v_f.client_id and c.numero = l->>''numero'' and (c.entite_id = v_f.entite_id or c.entite_id is null) order by (c.entite_id is not null) desc limit 1))', E'private.filed_compte_de_ligne(v_f.client_id, v_f.entite_id, l)', 'compte (reprise)');
  v_def := private.filed_a4_80_remplacer(v_def, E'coalesce((l->>''centre'')::uuid, (select k.id from public.filed_centres_cout k where k.client_id = v_f.client_id and k.code = upper(l->>''code'') and (k.entite_id = v_f.entite_id or k.entite_id is null) order by (k.entite_id is not null) desc limit 1))', E'private.filed_centre_de_ligne(v_f.client_id, v_f.entite_id, l)', 'centre (reprise)');
  v_def := private.filed_a4_80_remplacer(v_def, E'    v_compte := coalesce((v_l->>''compte'')::uuid,\n      (select c.id from public.filed_plan_comptable c where c.client_id = v_f.client_id and c.numero = v_l->>''numero''\n         and (c.entite_id = v_f.entite_id or c.entite_id is null) order by (c.entite_id is not null) desc limit 1));\n',
    E'    v_compte := private.filed_compte_de_ligne(v_f.client_id, v_f.entite_id, v_l);   -- a4_80 : identifiant ou numéro\n', 'compte');
  v_def := private.filed_a4_80_remplacer(v_def, E'    v_centre := coalesce((v_l->>''centre'')::uuid,\n      (select k.id from public.filed_centres_cout k where k.client_id = v_f.client_id and k.code = upper(v_l->>''code'')\n         and (k.entite_id = v_f.entite_id or k.entite_id is null) order by (k.entite_id is not null) desc limit 1));\n',
    E'    v_centre := private.filed_centre_de_ligne(v_f.client_id, v_f.entite_id, v_l);   -- a4_80 : identifiant ou code\n', 'centre');
  v_def := private.filed_a4_80_remplacer(v_def, E'(v_l->>''montant_ht'')::numeric', E'private.filed_montant_de_ligne(v_l, v_rang)', 'montant');
  v_def := private.filed_a4_80_remplacer(v_def, E'''Ligne % : compte inconnu ou retiré.'', v_rang',
    E'''Ligne % : compte inconnu ou retiré (%) ; « compte » prend l''''identifiant ou le numéro d''''un compte du plan, par exemple 601000.'', v_rang, coalesce(v_l->>''compte'', v_l->>''numero'', ''aucun'')',
    'message du compte');
  execute v_def;
end $$;
