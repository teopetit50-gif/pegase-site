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
