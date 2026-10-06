-- FILED, lot 21 (a4_29) — un numéro de TVA étranger s'écrit sous sa forme compacte dans filed_fournisseurs.tva.
--
-- Remontée du coordinateur (6/10) : la colonne porte la contrainte du socle filed_fournisseurs_tva_check
-- (tva ~ '^[A-Z]{2}[0-9A-Z]{2,13}$'). Un numéro lu tel qu'imprimé (« CHE-116.281.710 MWST », « NO 923609016 MVA »)
-- la viole, et la création du fournisseur échoue. Le socle (filed_creer_fournisseur) recopie la valeur lue telle
-- quelle ; la saisie et l'import passent aussi par cette colonne. Un déclencheur BEFORE la normalise donc à toute
-- écriture, quel qu'en soit l'auteur :
--   majuscules, sans espaces, tirets ni points ; CHE + 9 chiffres sans le suffixe MWST, TVA ou IVA ; NO + 9 chiffres
--   sans le suffixe MVA. Une valeur qui ne tient toujours pas dans la contrainte n'est pas perdue : elle passe dans
--   id_etranger (s'il est vide), et tva reste vide.
-- Migration idempotente ; aucune suppression.

create or replace function private.filed_tva_normaliser(p text)
returns text language sql immutable set search_path to '' as $$
  select case
           when v ~ '^CHE[0-9]{9}(MWST|TVA|IVA)$' then left(v, 12)
           when v ~ '^NO[0-9]{9}MVA$' then left(v, 11)
           else v end
    from (select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '') v) s
$$;
comment on function private.filed_tva_normaliser(text) is
  'Lot 21 (a4_29) : la forme compacte d''un numéro de TVA (majuscules, sans séparateurs ; suffixes MWST/TVA/IVA suisses et MVA norvégien retirés).';
revoke all on function private.filed_tva_normaliser(text) from public, anon, authenticated;
grant execute on function private.filed_tva_normaliser(text) to service_role;

create or replace function private.filed_fournisseurs_tva_compacte()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v text;
begin
  if new.tva is null then return new; end if;
  v := private.filed_tva_normaliser(new.tva);
  if v is not null and v ~ '^[A-Z]{2}[0-9A-Z]{2,13}$' then
    new.tva := v;
  else
    new.id_etranger := coalesce(new.id_etranger, left(btrim(new.tva), 60));
    new.tva := null;
  end if;
  return new;
end $$;
revoke all on function private.filed_fournisseurs_tva_compacte() from public, anon, authenticated;

create or replace trigger filed_fournisseurs_tva_compacte
  before insert or update of tva on public.filed_fournisseurs
  for each row execute function private.filed_fournisseurs_tva_compacte();
