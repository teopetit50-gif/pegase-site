-- 20261006023555 filed_a4_14_cle_valeurs_humaines
-- Source : dépôt : 7c29802 omega/migrations/a4_14_filed_lot7_cle_valeurs_humaines.sql ; cf4c3af omega/migrations/a4_08_filed_lot4e_branchements.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_14_filed_lot7_cle_valeurs_humaines.sql @ 7c29802, a4_08_filed_lot4e_branchements.sql @ cf4c3af ; omega/migrations/a4_14_filed_lot7_cle_valeurs_humaines.sql : cf4c3af remplacé par 7c29802 (A4 a corrigé le fichier (EXECUTE des contrôles FILED)).
-- ═══ omega/migrations/a4_14_filed_lot7_cle_valeurs_humaines.sql @ 7c29802
-- FILED, lot 7 (correctif a4_14) — une valeur confirmée par une personne n'est sûre que si sa clé tient.
--
-- Relevé du coordinateur (recette, 06/10) : private.filed_confirmer_valeurs recopie la valeur lue en source « humain »
-- (donc sûre pour private.filed_valeurs) sans contrôler la clé, alors que filed_corriger_facture refuse un SIREN, une
-- TVA ou un IBAN à clé fausse. En aval, l'intégration et private.filed_completer_fournisseur_lu recontrôlent la clé
-- du SIREN et de l'IBAN ; mais pour une TVA française, private.filed_tva_intracom_analyser ne vérifiait que la clé
-- TVA, pas le SIREN qu'elle porte. Confirmer « FR52842115763 » (clé TVA juste, SIREN 842115763 faux au Luhn) aurait
-- donc fait monter 842115763 sur la fiche fournisseur.
--
-- Ce que pose ce correctif :
--   1. private.filed_tva_intracom_analyser (texte d'a4_04) : une TVA FR dont le SIREN échoue au Luhn a une clé fausse.
--   2. private.filed_siren_de_tva_fr : nul si le SIREN porté échoue au Luhn.
--   3. Déclencheur sur public.pieces_valeurs : une valeur de source « humain » sur fournisseur.siren / siret / tva /
--      iban ou acheteur.siren / siret / tva est refusée (22023) si sa clé est fausse, quelle que soit la porte
--      (filed_confirmer_valeurs, filed_corriger_facture ou une autre). Le corps de filed_confirmer_valeurs n'est pas
--      recopié (il n'est dans aucun extrait).
-- Migration idempotente (create or replace function, create or replace trigger).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Analyse d'un numéro de TVA intracommunautaire (texte d'a4_04 + le Luhn du SIREN pour FR)
-- ───────────────────────────────────────────────────────────────────────────
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
      -- FR + clé (2 caractères, chiffres ou lettres sauf O et I) + SIREN (9 chiffres).
      v_fmt := v_num ~ '^[0-9A-HJ-NP-Z]{2}[0-9]{9}$';
      if v_fmt and v_num ~ '^[0-9]{2}[0-9]{9}$' then
        -- Clé numérique : (12 + 3 × (SIREN mod 97)) mod 97.
        v_cle := left(v_num, 2)::int = (12 + 3 * (substr(v_num, 3, 9)::bigint % 97)) % 97;
      elsif v_fmt then
        v_cle := null; -- clé alphanumérique (anciens numéros) : format seul
      end if;
      -- Lot 7 (a4_14) : le SIREN porté par le numéro doit lui-même passer la clé de Luhn.
      if v_fmt and not private.filed_siren_valide(right(v_num, 9)) then v_cle := false; end if;
    when 'BE' then
      v_fmt := v_num ~ '^[01][0-9]{9}$';
      if v_fmt then v_cle := (97 - (left(v_num, 8)::bigint % 97)) = right(v_num, 2)::int; end if;
    when 'DE' then
      v_fmt := v_num ~ '^[1-9][0-9]{8}$';
      if v_fmt then
        -- ISO 7064, mod 11,10.
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
        -- Clé mod 11 sur les neuf chiffres (sociétés) ; les indépendants portent une clé mod 97
        -- sur « NL » + numéro, que l'on accepte aussi.
        v_sum := 0;
        for v_i in 1..8 loop v_sum := v_sum + substr(v_num, v_i, 1)::int * (10 - v_i); end loop;
        v_cle := (v_sum % 11) = substr(v_num, 9, 1)::int and (v_sum % 11) <> 10;
        if not v_cle then
          -- mod 97 sur « NL » + numéro, les lettres valant A=10 … Z=35 (N=23, L=21, B=11) : le reste doit être 1.
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
        -- Clé : somme des chiffres de rang impair + chiffres de (2 × rang pair), 96 - somme, mod 10.
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
    when 'XI' then v_fmt := v_num ~ '^([0-9]{9}|[0-9]{12})$'; -- Irlande du Nord, règles du Royaume-Uni
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

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le SIREN porté par un numéro de TVA français : nul s'il échoue au Luhn
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_siren_de_tva_fr(p text) returns text
language sql immutable set search_path to '' as $$
  select case when upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) ~ '^FR[0-9A-HJ-NP-Z]{2}[0-9]{9}$'
               and private.filed_siren_valide(right(upper(regexp_replace(p, '[^A-Za-z0-9]', '', 'g')), 9))
              then right(upper(regexp_replace(p, '[^A-Za-z0-9]', '', 'g')), 9) end
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Une valeur saisie ou confirmée par une personne passe la clé
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_valeur_humaine_cle()
returns trigger language plpgsql set search_path to '' as $$
declare v text; v_ok boolean;
begin
  if new.source is distinct from 'humain'
     or new.champ not in ('fournisseur.siren', 'fournisseur.siret', 'fournisseur.tva', 'fournisseur.iban',
                          'acheteur.siren', 'acheteur.siret', 'acheteur.tva') then
    return new;
  end if;
  -- Une ligne déjà en place qu'on touche sans changer sa valeur (effacement, horodatage…) passe.
  if tg_op = 'UPDATE' and new.valeur is not distinct from old.valeur and new.champ = old.champ
     and new.source is not distinct from old.source then
    return new;
  end if;
  v := case when jsonb_typeof(new.valeur) = 'string' then new.valeur #>> '{}' else new.valeur::text end;
  v := upper(regexp_replace(coalesce(v, ''), '[^A-Za-z0-9]', '', 'g'));
  if v = '' then return new; end if;
  v_ok := case
    when new.champ like '%.siren' then private.filed_siren_valide(v)
    when new.champ like '%.siret' then v ~ '^[0-9]{14}$' and private.filed_siren_valide(left(v, 9))
    when new.champ like '%.tva' then coalesce((select a.valide from private.filed_tva_intracom_analyser(v) a), false)
    when new.champ like '%.iban' then v ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' and private.filed_iban_valide(v)
  end;
  if not coalesce(v_ok, false) then
    raise exception 'Valeur refusée pour % : % ne passe pas la clé de contrôle. Corrigez-la d''après la pièce.',
      new.champ, v using errcode = '22023';
  end if;
  return new;
end $$;
comment on function private.filed_valeur_humaine_cle() is
  'Lot 7 (a4_14) : un SIREN, SIRET, numéro de TVA ou IBAN saisi ou confirmé par une personne (source humain) doit passer sa clé ; sinon 22023.';
revoke all on function private.filed_valeur_humaine_cle() from public, anon, authenticated;

create or replace trigger pieces_valeurs_cle_humaine
  before insert or update on public.pieces_valeurs
  for each row execute function private.filed_valeur_humaine_cle();

-- Droits (ajout du 06/10, après le lot socle 19ag d'A5) : private.filed_valeur_humaine_cle() est SECURITY INVOKER ;
-- un membre qui écrit sous RLS une valeur « humain » dans pieces_valeurs exécute donc, avec ses droits, ces quatre
-- fonctions (filed_luhn par filed_tva_intracom_analyser). Sans EXECUTE : « permission denied ».
grant execute on function private.filed_siren_valide(text) to authenticated, service_role;
grant execute on function private.filed_luhn(text) to authenticated, service_role;
grant execute on function private.filed_iban_valide(text) to authenticated, service_role;
grant execute on function private.filed_tva_intracom_analyser(text) to authenticated, service_role;


-- ═══ omega/migrations/a4_08_filed_lot4e_branchements.sql @ cf4c3af
-- FILED, lot 4e — Les branchements dans le socle de FILED.
--
-- Ce que ce lot pose :
--   private.filed_apres_controle(p_facture, p_statut)   ce qui suit le contrôle d'une facture : charge récurrente reconnue,
--                                                       imputation proposée, demande de validation déposée ou annulée ;
--   private.filed_balayer_lot4()                        le balayage horaire : charges attendues, factures attendues absentes,
--                                                       relances et remontées, exports à date fixe, mesures du jour ;
--   private.filed_controler_facture                     + contrôles d'identité (lot 4d), d'exercice (lot 4b) ; une facture décidée
--                                                       (validee, refusee, comptabilisee) garde son statut au recontrôle ; appel de
--                                                       filed_apres_controle après l'écriture du statut. Posé par lecture du corps
--                                                       en place (pg_get_functiondef) et insertion sur trois repères : robuste aux
--                                                       lots qui passent avant ou après ;
--   private.filed_rapprocher_ligne                      + l'écart de prix ou de quantité dans la tolérance signalé en « info » ;
--   private.filed_traiter                               + le balayage du lot 4 ;
--   private.filed_executer_decision                     + les décisions filed.valider_facture* et filed.imputer.
--
-- Les trois derniers sont le texte exact de la recette au 5 octobre 2026, plus les lignes marquées « Lot 4 (A4) ».
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Ce qui suit le contrôle d'une facture
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_apres_controle(p_facture uuid, p_statut text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_statut = 'a_valider' then
    -- La charge récurrente reconnue propose son imputation ; sinon, ce que le fournisseur a appris.
    perform private.filed_reconnaitre_charge(p_facture);
    perform private.filed_proposer_imputation(p_facture, 'apprise');
    perform private.filed_deposer_validation(p_facture, 1);
  elsif p_statut in ('a_completer', 'bloquee', 'ecartee') then
    perform private.filed_annuler_validations(p_facture, 'annulee');
    if p_statut = 'ecartee' then
      perform private.filed_reconnaitre_charge(p_facture);
    end if;
  end if;
end $$;
comment on function private.filed_apres_controle(uuid, text) is
  'Après le contrôle d''une facture : charge récurrente, imputation proposée, demande de validation déposée (a_valider) ou annulée (sinon).';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le balayage horaire du lot 4
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists private.filed_lot4_passages (
  client_id   uuid not null,
  tache       text not null,
  dernier_le  timestamptz not null default now(),
  primary key (client_id, tache)
);
comment on table private.filed_lot4_passages is 'Le dernier passage de chaque tâche du lot 4 de FILED, par organisation (uuid zéro : pour toutes) : le balayage ne refait pas une tâche avant son heure.';

create or replace function private.filed_lot4_passage(p_client uuid, p_tache text, p_tous_les interval)
returns boolean language plpgsql set search_path to '' as $$
declare v_dernier timestamptz;
begin
  select dernier_le into v_dernier from private.filed_lot4_passages where client_id = p_client and tache = p_tache;
  if v_dernier is not null and v_dernier > now() - p_tous_les then return false; end if;
  insert into private.filed_lot4_passages (client_id, tache, dernier_le) values (p_client, p_tache, now())
  on conflict (client_id, tache) do update set dernier_le = now();
  return true;
end $$;

create or replace function private.filed_balayer_lot4()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r record; v_res jsonb := '{}'::jsonb; n_orgs integer := 0; n_attendues integer := 0; n_manquantes integer := 0; n_mesures integer := 0;
        v_relances jsonb := '{}'::jsonb; n_exports integer := 0; v_zero uuid := '00000000-0000-0000-0000-000000000000';
begin
  for r in select g.client_id, e.fuseau from public.filed_reglages g
            left join public.entites e on e.client_id = g.client_id and e.principale
           where g.entite_id is null and g.actif
  loop
    if private.filed_lot4_passage(r.client_id, 'charges', interval '1 hour') then
      begin
        n_attendues := n_attendues + private.filed_generer_charges_attendues(r.client_id);
        n_manquantes := n_manquantes + private.filed_verifier_charges_manquantes(r.client_id, (now() at time zone coalesce(r.fuseau, 'Europe/Paris'))::date);
      exception when others then
        raise warning 'FILED lot 4 : charges récurrentes de % non balayées (%)', r.client_id, sqlerrm;
      end;
    end if;
    if private.filed_lot4_passage(r.client_id, 'mesures', interval '1 hour') then
      begin
        n_mesures := n_mesures + private.filed_mesurer(r.client_id, (now() at time zone coalesce(r.fuseau, 'Europe/Paris'))::date);
      exception when others then
        raise warning 'FILED lot 4 : mesures de % non enregistrées (%)', r.client_id, sqlerrm;
      end;
    end if;
    n_orgs := n_orgs + 1;
  end loop;
  if private.filed_lot4_passage(v_zero, 'relances', interval '1 hour') then
    v_relances := private.filed_relancer_validations();
  end if;
  if private.filed_lot4_passage(v_zero, 'exports', interval '1 hour') then
    n_exports := private.filed_produire_exports();
  end if;
  return jsonb_build_object('organisations', n_orgs, 'attendues', n_attendues, 'manquantes', n_manquantes, 'mesures', n_mesures,
                            'relances', v_relances, 'exports', n_exports);
end $$;
comment on function private.filed_balayer_lot4() is 'Appelé par private.filed_traiter à chaque passage : chaque tâche du lot 4 ne se refait pas avant une heure.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. filed_controler_facture : trois insertions sur le corps en place
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare v_def text; v_a text; v_b text; v_c text; v_d text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'filed_controler_facture';
  if v_def is null then raise exception 'private.filed_controler_facture est introuvable.'; end if;
  if position('filed_apres_controle' in v_def) > 0 then
    raise notice 'filed_controler_facture : lot 4 déjà branché.';
    return;
  end if;

  v_a := E'  perform private.filed_rapprocher_facture(v_f.id);\n';
  v_b := E'  v_statut := case when coalesce(v_lecture, false) then \'a_completer\'\n';
  v_c := E'  return v_statut;\nend';
  if position(v_a in v_def) = 0 then raise exception 'Repère (a) introuvable dans filed_controler_facture.'; end if;
  if position(v_b in v_def) = 0 then raise exception 'Repère (b) introuvable dans filed_controler_facture.'; end if;
  if position(v_c in v_def) = 0 then raise exception 'Repère (c) introuvable dans filed_controler_facture.'; end if;

  -- (a) après le rapprochement : identité du fournisseur, exercice et clôture.
  v_def := replace(v_def, v_a, v_a
    || E'\n  -- ── Lot 4 (A4) : l\'identité du fournisseur (TVA de l\'Union, SIREN, registres), l\'exercice et la clôture ──\n'
    || E'  perform private.filed_controles_identite(v_f.id);\n'
    || E'  perform private.filed_controles_comptables(v_f.id);\n');
  -- (b) une facture décidée garde son statut : les contrôles se relisent, la décision reste.
  v_def := replace(v_def, v_b,
       E'  v_statut := case when v_f.statut in (\'validee\', \'refusee\', \'comptabilisee\') then v_f.statut -- Lot 4 (A4)\n'
    || E'                   when coalesce(v_lecture, false) then \'a_completer\'\n');
  -- (c) après l'écriture du statut : charge récurrente, imputation, demande de validation.
  v_def := replace(v_def, v_c,
       E'  -- ── Lot 4 (A4) : la charge récurrente, l\'imputation proposée, la demande de validation ──\n'
    || E'  perform private.filed_apres_controle(v_f.id, v_statut);\n'
    || v_c);
  -- (d) le message d'historique d'une facture décidée que l'on recontrôle.
  v_d := E'        else \'Contrôlée : prête à valider\'';
  if position(v_d in v_def) > 0 then
    v_def := replace(v_def, v_d,
         E'        when \'validee\' then \'Recontrôlée : validée, le statut reste.\' -- Lot 4 (A4)\n'
      || E'        when \'refusee\' then \'Recontrôlée : refusée, le statut reste.\'\n'
      || E'        when \'comptabilisee\' then \'Recontrôlée : comptabilisée, le statut reste.\'\n'
      || v_d);
  else
    raise notice 'Repère (d) absent : le message d''historique reste celui du socle.';
  end if;
  execute v_def;
  raise notice 'filed_controler_facture : lot 4 branché.';
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. filed_rapprocher_ligne : l'écart dans la tolérance est signalé
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_rapprocher_ligne(p_f filed_factures, p_l filed_factures_lignes, p_c filed_commandes_lignes, p_methode text, p_sens smallint, p_reglage filed_reglages, p_a_reception boolean)
 RETURNS filed_rapprochements_lignes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qte numeric := coalesce(p_l.quantite, 1);
  v_prix_f numeric;
  v_prix_c numeric := p_c.prix_unitaire;
  v_deja numeric;
  v_recu numeric;
  v_restant numeric;
  v_ecart_pu numeric;
  v_ecart_prix numeric := 0;
  v_ecart_qte numeric := 0;
  v_ecart_qte_montant numeric := 0;
  v_non_recu numeric := 0;
  v_non_recu_montant numeric := 0;
  v_prix_ok boolean := true;
  v_qte_ok boolean := true;
  v_resultat text := 'ok';
  v_libelle text;
  v_autres jsonb;
  v_x public.filed_rapprochements_lignes;
  v_preuve jsonb;
begin
  v_prix_f := coalesce(p_l.prix_unitaire, case when coalesce(p_l.quantite, 0) <> 0 then p_l.montant_ht / p_l.quantite end);
  select coalesce(sum(x.sens * x.quantite), 0), coalesce(jsonb_agg(distinct f2.numero) filter (where f2.numero is not null), '[]'::jsonb)
    into v_deja, v_autres
  from public.filed_rapprochements_lignes x join public.filed_factures f2 on f2.id = x.facture_id
  where x.commande_ligne_id = p_c.id and x.facture_id <> p_f.id and f2.statut <> 'ecartee';
  select coalesce(sum(q.quantite), 0) into v_recu
  from public.filed_receptions_lignes q join public.filed_receptions rc on rc.id = q.reception_id
  where q.commande_ligne_id = p_c.id and rc.statut = 'enregistree';
  v_restant := p_c.quantite - v_deja;
  v_libelle := format('ligne %s (%s)', p_l.rang, coalesce(left(p_l.designation, 60), p_l.reference_vendeur, p_l.numero, '?'));

  if p_sens = 1 then
    if v_prix_f is not null and v_prix_c is not null then
      v_ecart_pu := v_prix_f - v_prix_c;
      v_ecart_prix := round(v_ecart_pu * v_qte, 2);
      v_prix_ok := abs(v_ecart_pu) <= v_prix_c * coalesce(p_reglage.ecart_prix_pct, 0) / 100 + 0.0000005
                   or abs(v_ecart_prix) <= coalesce(p_reglage.ecart_prix_montant, 0.05);
    end if;
    v_ecart_qte := v_qte - v_restant;
    v_qte_ok := v_ecart_qte <= p_c.quantite * coalesce(p_reglage.ecart_quantite_pct, 0) / 100 + 0.0000005;
    v_ecart_qte_montant := round(greatest(v_ecart_qte, 0) * coalesce(v_prix_c, v_prix_f, 0), 2);
    if p_a_reception or coalesce(p_reglage.reception_exigee, false) then
      v_non_recu := greatest(v_deja + v_qte - v_recu, 0);
      v_non_recu_montant := round(v_non_recu * coalesce(v_prix_c, v_prix_f, 0), 2);
    end if;
    v_resultat := case when v_restant <= 0.0000005 then 'deja_facture'
                       when not v_qte_ok then 'ecart_quantite'
                       when not v_prix_ok then 'ecart_prix'
                       when v_non_recu > 0.0000005 then 'non_recu'
                       else 'ok' end;
  else
    -- Un avoir rend de la quantité : pas plus que ce qui a été facturé.
    v_ecart_qte := v_qte - greatest(v_deja, 0);
    v_resultat := case when v_ecart_qte > 0.0000005 then 'avoir_trop' else 'ok' end;
  end if;

  insert into public.filed_rapprochements_lignes (
    client_id, facture_id, document_id, facture_ligne_id, commande_ligne_id, methode, sens, quantite, prix_facture,
    prix_commande, ecart_prix_unitaire, ecart_prix, quantite_commandee, deja_facture, quantite_recue, ecart_quantite,
    ecart_quantite_montant, non_recu, non_recu_montant, resultat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_l.id, p_c.id, p_methode, p_sens, v_qte, v_prix_f, v_prix_c, v_ecart_pu,
          v_ecart_prix, p_c.quantite, v_deja, v_recu, v_ecart_qte, v_ecart_qte_montant, v_non_recu, v_non_recu_montant,
          v_resultat)
  returning * into v_x;

  -- Les contrôles de la ligne, chacun avec sa preuve ; la clé est la ligne commandée.
  v_preuve := jsonb_build_object('facture_ligne', p_l.id, 'commande_ligne', p_c.id, 'rang', p_l.rang, 'quantite', v_qte,
                                 'commande', p_c.quantite, 'deja_facture', v_deja, 'recu', v_recu, 'prix_facture', v_prix_f,
                                 'prix_commande', v_prix_c, 'autres_factures', v_autres, 'methode', p_methode);
  if p_sens = 1 then
    if v_resultat = 'deja_facture' then
      perform private.filed_poser_resultat(p_f, 'rapprochement.deja_facture', 'bloquant', true,
        format('%s : déjà facturée en totalité (%s sur %s commandé(s)%s).', v_libelle, private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(p_c.quantite),
               case when v_autres <> '[]'::jsonb then ', par ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_autres) x) else '' end),
        'DOUBLON', v_preuve, p_c.id::text);
    elsif not v_qte_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'bloquant', true,
        format('%s : %s facturé(s) pour %s restant à facturer (%s commandé(s), %s déjà facturé(s)) : %s de trop, soit %s.',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(p_c.quantite), private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(v_ecart_qte), private.filed_montant_texte(v_ecart_qte_montant)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant), p_c.id::text);
    elsif v_ecart_qte > 0.0000005 then
      -- Lot 4 (A4) : l'écart dans la tolérance est signalé, pas absorbé.
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'info', true,
        format('%s : %s facturé(s) pour %s restant à facturer : %s de trop, dans la tolérance de %s %% (signalé, pas absorbé).',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(v_ecart_qte), coalesce(p_reglage.ecart_quantite_pct, 0)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant, 'dans_tolerance', true), p_c.id::text);
    end if;
    if not v_prix_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', case when v_ecart_pu > 0 then 'bloquant' else 'attention' end, true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne.', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix), p_c.id::text);
    elsif v_ecart_pu is not null and v_ecart_pu <> 0 then
      -- Lot 4 (A4) : l'écart dans la tolérance est signalé, pas absorbé.
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', 'info', true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne, dans la tolérance (signalé, pas absorbé).', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix, 'dans_tolerance', true), p_c.id::text);
    end if;
    if v_non_recu > 0.0000005 then
      perform private.filed_poser_resultat(p_f, 'rapprochement.reception',
        case when coalesce(p_reglage.reception_exigee, false) then 'bloquant' else 'attention' end, true,
        format('%s : %s facturé(s) au total pour %s reçu(s) : %s non reçu(s), soit %s.', v_libelle,
               private.filed_quantite_texte(v_deja + v_qte), private.filed_quantite_texte(v_recu),
               private.filed_quantite_texte(v_non_recu), private.filed_montant_texte(v_non_recu_montant)),
        'LIVR_INCOMP', v_preuve || jsonb_build_object('non_recu', v_non_recu, 'non_recu_montant', v_non_recu_montant), p_c.id::text);
    end if;
  elsif v_resultat = 'avoir_trop' then
    perform private.filed_poser_resultat(p_f, 'avoir.quantite', 'attention', true,
      format('%s : l''avoir rend %s alors que %s seulement ont été facturé(s) sur cette ligne commandée.', v_libelle,
             private.filed_quantite_texte(v_qte), private.filed_quantite_texte(greatest(v_deja, 0))),
      'MONTANT_ERR', v_preuve, p_c.id::text);
  end if;
  return v_x;
end $function$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. filed_traiter : le balayage du lot 4
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_traiter(p_nombre integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_issue text;
  v_err text;
  n_faits integer := 0;
  n_decisions integer := 0;
  n_ignores integer := 0;
  n_rendus integer := 0;
  n_balayes integer := 0;
  n_battements integer := 0;
  v_lot4 jsonb := '{}'::jsonb;
begin
  perform set_config('omega.module', 'filed', true);

  for t in select * from private.prendre_travaux(array['filed.integrer', 'filed.decision'],
                                                  greatest(1, least(coalesce(p_nombre, 200), 500)),
                                                  interval '5 minutes', 'filed')
  loop
    begin
      if t.genre = 'filed.decision' then
        v_issue := private.filed_executer_decision(t.charge);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_decisions := n_decisions + 1;
      elsif coalesce(t.charge ->> 'module', 'filed') <> 'filed' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'pièce d''un autre module'));
        n_ignores := n_ignores + 1;
      elsif coalesce(t.charge ->> 'piece', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'travail sans pièce'));
        n_ignores := n_ignores + 1;
      else
        v_issue := private.filed_integrer_piece((t.charge ->> 'piece')::uuid);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_faits := n_faits + 1;
      end if;
    exception when others then
      get stacked diagnostics v_err = message_text;
      begin
        perform private.echouer_travail(t.id, 'FILED : ' || v_err);
      exception when others then
        raise warning 'FILED : travail % non rendu (%)', t.id, sqlerrm;
      end;
      n_rendus := n_rendus + 1;
    end;
  end loop;

  -- Les pièces au bout de leur lecture que l'événement n'a pas apportées, et
  -- les factures et avoirs reçus avant le moteur des factures.
  for r in
    select d.piece_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
    where (d.etat = 'en_lecture' and p.statut in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'))
       or (d.etat = 'a_traiter' and d.nature in ('facture', 'avoir')
           and not exists (select 1 from public.filed_factures f where f.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_commande'
           and not exists (select 1 from public.filed_commandes c where c.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_livraison'
           and not exists (select 1 from public.filed_receptions rc where rc.document_id = d.id))
    order by d.recu_le
    limit 500
  loop
    begin
      perform private.filed_integrer_piece(r.piece_id);
      n_balayes := n_balayes + 1;
    exception when others then
      raise warning 'FILED : pièce % non intégrée (%)', r.piece_id, sqlerrm;
    end;
  end loop;

  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.
  for r in
    select g.client_id, m.moteur from public.filed_reglages g
    cross join (values ('filed_reception'), ('filed_factures')) as m(moteur)
    left join public.battements b on b.client_id = g.client_id and b.module = m.moteur
    where g.entite_id is null and g.actif and (b.dernier_le is null or b.dernier_le < now() - interval '5 minutes')
  loop
    perform private.battre(r.client_id, r.moteur, jsonb_build_object('source', 'omega-filed'), null);
    n_battements := n_battements + 1;
  end loop;

  -- Lot 4 (A4) : charges récurrentes, relances et remontées de validation, exports à date fixe, mesures du jour.
  begin
    v_lot4 := private.filed_balayer_lot4();
  exception when others then
    raise warning 'FILED : balayage du lot 4 interrompu (%)', sqlerrm;
    v_lot4 := jsonb_build_object('erreur', sqlerrm);
  end;

  return jsonb_build_object('travaux', n_faits, 'decisions', n_decisions, 'ignores', n_ignores, 'rendus', n_rendus,
                            'balayes', n_balayes, 'battements', n_battements, 'lot4', v_lot4);
end $function$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. filed_executer_decision : la facture et l'imputation
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_executer_decision(p_charge jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_decideur uuid;
  v_commentaire text;
  v_four public.filed_fournisseurs;
  v_ib public.filed_fournisseurs_ibans;
  r record;
  v_issue text;
begin
  if coalesce(p_charge ->> 'demande', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'sans_demande';
  end if;
  select * into v_d from public.demandes_validation where id = (p_charge ->> 'demande')::uuid for update;
  if not found then
    return 'demande_effacee';
  end if;
  if v_d.module <> 'filed' then
    return 'autre_module';
  end if;
  if v_d.statut not in ('approuvee', 'rejetee', 'expiree') then
    return 'deja_traitee';
  end if;
  select a.user_id, a.commentaire into v_decideur, v_commentaire from public.approbations a
  where a.demande_id = v_d.id order by a.decide_le desc limit 1;

  if v_d.type_action = 'filed.valider_fournisseur' then
    select * into v_four from public.filed_fournisseurs
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'fournisseur_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un fournisseur nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_four.statut = 'a_confirmer' then
        update public.filed_fournisseurs set statut = 'actif', confirme_le = now(), confirme_par = v_decideur, maj_le = now()
        where id = v_four.id;
        -- L'IBAN que la personne a vu dans la demande se valide avec le fournisseur.
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where fournisseur_id = v_four.id and statut = 'propose'
          and empreinte = v_d.payload ->> 'iban_empreinte';
        -- Un autre IBAN proposé entre-temps part, lui, à la file.
        for r in select i.id, i.iban_masque from public.filed_fournisseurs_ibans i
                 where i.fournisseur_id = v_four.id and i.statut = 'propose'
        loop
          perform private.filed_deposer_demande(v_four.client_id, null, 'filed.valider_iban', 'filed_iban', r.id::text,
            format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), r.iban_masque), null,
            jsonb_build_object('fournisseur', v_four.id, 'iban', r.iban_masque), 'filed:iban:' || r.id::text);
        end loop;
        perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'confirme',
          'Fournisseur confirmé par une personne.', jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_confirme';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs set statut = 'refuse', motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500),
             confirme_le = now(), confirme_par = v_decideur, maj_le = now()
      where id = v_four.id;
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = 'Refusé avec le fournisseur.'
      where fournisseur_id = v_four.id and statut = 'propose';
      perform private.lever_alerte_module(v_four.client_id, 'filed', 'critique',
        left(format('Fournisseur refusé : %s. Ses factures restent bloquées.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'demande', v_d.id), 'fournisseur_refuse:' || v_four.id::text, true, null);
      perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'refuse',
        'Fournisseur refusé par une personne' || coalesce(' : ' || v_commentaire, '.'), jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_refuse';
    end if;
    return 'expiree';
  end if;

  if v_d.type_action = 'filed.valider_iban' then
    select * into v_ib from public.filed_fournisseurs_ibans
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'iban_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un IBAN nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_ib.statut = 'propose' then
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where id = v_ib.id;
        perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_valide',
          format('IBAN %s validé par une personne.', v_ib.iban_masque), jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_valide';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500)
      where id = v_ib.id;
      select * into v_four from public.filed_fournisseurs where id = v_ib.fournisseur_id;
      perform private.lever_alerte_module(v_ib.client_id, 'filed', 'critique',
        left(format('Changement d''IBAN refusé pour %s : tentative de fraude possible.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'iban', v_ib.iban_masque, 'demande', v_d.id),
        'iban_refuse:' || v_ib.id::text, true, null);
      perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_refuse',
        format('IBAN %s refusé par une personne', v_ib.iban_masque) || coalesce(' : ' || v_commentaire, '.'),
        jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_refuse';
    end if;
    return 'expiree';
  end if;

  -- Lot 4 (A4) : la facture (filed.valider_facture[.<centre>][.direction]) et l'imputation proposée (filed.imputer).
  if v_d.type_action like 'filed.valider_facture%' then
    return private.filed_decider_facture(v_d, v_decideur, v_commentaire);
  end if;
  if v_d.type_action = 'filed.imputer' then
    if v_d.statut = 'expiree' then
      return 'expiree';
    end if;
    v_issue := private.filed_decider_imputation(v_d);
    if v_d.statut = 'approuvee' then
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
    end if;
    return v_issue;
  end if;

  return 'type_inconnu';
end $function$;
