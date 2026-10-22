-- 20261011135603 a4_34_filed_releves
-- Source : dépôt : 4e2a224 omega/migrations/a4_34_filed_lot26_releves_bancaires.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_34_filed_lot26_releves_bancaires.sql @ 4e2a224 ; a4_27 cité comme test : ignoré.
-- ═══ omega/migrations/a4_34_filed_lot26_releves_bancaires.sql @ 4e2a224
-- FILED, lot 26 (a4_34) — le relevé bancaire : importé, et rapproché des factures qu'il règle.
--
-- Promesse du site (lib/produits/factures.ts:77, « Relevé ») ; chiffrage n° 12 : jusqu'ici un relevé n'était que
-- classé. Ce lot pose :
--   filed_releves, filed_releves_lignes          le relevé importé et ses opérations, sans doublon : un même fichier
--                                                est refusé (SHA-256), deux relevés qui se chevauchent ne comptent une
--                                                opération qu'une fois (clé : date, montant, libellé, référence, rang
--                                                parmi les opérations identiques du fichier) ;
--   public.filed_importer_releve(...)            CAMT.053 (le relevé XML ISO 20022 que toutes les banques françaises
--                                                exportent) ou CSV (date, libellé, montant ou débit/crédit, avec
--                                                en-tête) ; puis rapproche ;
--   le rapprochement                             chaque débit cherche la facture validée dont le reste à payer est
--                                                exactement son montant ; il marque des points : numéro de la facture
--                                                dans le libellé ou la référence (+3), IBAN du bénéficiaire connu du
--                                                fournisseur ou lu sur la facture (+3), nom du fournisseur (+2),
--                                                proche de l'échéance (+1). Un seul meilleur candidat à 3 points ou
--                                                plus : le règlement est noté (filed_marquer_reglee, référence
--                                                RELEVE:<ligne>, donc écrit en comptabilité par le lot 19). Sinon,
--                                                les candidats sont proposés à une personne. Un règlement déjà noté à
--                                                la main du même montant, à sept jours près, est relié sans doublon ;
--   public.filed_rapprocher_ligne / filed_ignorer_ligne   la décision d'une personne (gérant, admin, valideur).
-- L'IBAN d'un tiers n'est gardé que masqué. Migration idempotente ; aucune suppression.

create table if not exists public.filed_releves (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  entite_id        uuid not null references public.entites(id) on delete cascade,
  nom_fichier      text not null,
  format           text not null check (format in ('camt053', 'csv')),
  sha256           text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  compte_masque    text,
  du               date,
  au               date,
  solde_ouverture  numeric(16,2),
  solde_cloture    numeric(16,2),
  nb_lignes        integer not null default 0,
  nb_nouvelles     integer not null default 0,
  importe_par      uuid,
  importe_le       timestamptz not null default now()
);
comment on table public.filed_releves is 'Lot 26 (a4_34) : les relevés bancaires importés d''une société (CAMT.053 ou CSV), un fichier une fois.';
create unique index if not exists filed_releves_un on public.filed_releves (client_id, entite_id, sha256);
alter table public.filed_releves enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_releves' and policyname = 'filed_releves_lecture') then
    execute 'create policy filed_releves_lecture on public.filed_releves for select to authenticated using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id))';
  end if;
end $$;
revoke all on table public.filed_releves from anon, authenticated;
grant select on public.filed_releves to authenticated;

create table if not exists public.filed_releves_lignes (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  entite_id           uuid not null references public.entites(id) on delete cascade,
  releve_id           uuid not null references public.filed_releves(id) on delete cascade,
  rang                integer not null,
  cle                 text not null,
  date_operation      date not null,
  date_valeur         date,
  -- Négatif : un débit (ce qui sort du compte) ; positif : un crédit.
  montant             numeric(16,2) not null check (montant <> 0),
  devise              text not null default 'EUR',
  libelle             text not null default '',
  reference           text,
  contrepartie_nom    text,
  contrepartie_iban   text,
  statut              text not null default 'a_rapprocher' check (statut in ('a_rapprocher', 'proposee', 'rapprochee', 'ignoree')),
  facture_id          uuid references public.filed_factures(id) on delete set null,
  reglement_id        uuid references public.filed_reglements(id) on delete set null,
  candidats           jsonb not null default '[]'::jsonb,
  motif               text,
  decide_par          uuid,
  decide_le           timestamptz
);
comment on table public.filed_releves_lignes is
  'Lot 26 (a4_34) : les opérations des relevés, une fois chacune, et leur rapprochement : à rapprocher, proposée (candidats), rapprochée (facture, règlement), ignorée (motif). L''IBAN du tiers n''y est que masqué.';
comment on column public.filed_releves_lignes.contrepartie_iban is 'IBAN du tiers, masqué (FR76…1234).';
create unique index if not exists filed_releves_lignes_cle on public.filed_releves_lignes (client_id, entite_id, cle);
create index if not exists filed_releves_lignes_a_voir on public.filed_releves_lignes (client_id, entite_id, statut) where statut in ('a_rapprocher', 'proposee');
create index if not exists filed_releves_lignes_facture on public.filed_releves_lignes (facture_id) where facture_id is not null;
alter table public.filed_releves_lignes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_releves_lignes' and policyname = 'filed_releves_lignes_lecture') then
    execute 'create policy filed_releves_lignes_lecture on public.filed_releves_lignes for select to authenticated using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id))';
  end if;
end $$;
revoke all on table public.filed_releves_lignes from anon, authenticated;
grant select on public.filed_releves_lignes to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_releves_lignes', 1, 'FILED, lot 26'), ('filed_releves', 2, 'FILED, lot 26')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- ───────────────────────────────────────────────────────────────────────────
-- Lecture des fichiers
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_iban_masque(p text)
returns text language sql immutable set search_path to '' as $$
  select case when v ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$' then left(v, 4) || '…' || right(v, 4) end
    from (select upper(regexp_replace(coalesce(p, ''), '\s', '', 'g')) v) s
$$;

-- « 1 234,56 », « -1234.56 », « 1.234,56 », « (12,00) » → numeric ; null si illisible.
create or replace function private.filed_montant_lu(p text)
returns numeric language plpgsql immutable set search_path to '' as $$
declare v text; v_neg boolean := false;
begin
  -- Espaces insécables (U+00A0, U+202F) et symbole euro ; chr() au-delà de 127 n'existe qu'en base UTF-8.
  v := regexp_replace(coalesce(p, ''), '\s', '', 'g');
  if getdatabaseencoding() = 'UTF8' then v := translate(v, chr(160) || chr(8239) || chr(8364), ''); end if;
  if v ~ '^\(.*\)$' then v_neg := true; v := substr(v, 2, char_length(v) - 2); end if;
  if v ~ '^[-+]?[0-9]{1,3}(\.[0-9]{3})+,[0-9]+$' then v := replace(replace(v, '.', ''), ',', '.');
  elsif v ~ '^[-+]?[0-9]{1,3}(,[0-9]{3})+\.[0-9]+$' then v := replace(v, ',', '');
  else v := replace(v, ',', '.'); end if;
  if v !~ '^[-+]?[0-9]+(\.[0-9]+)?$' then return null; end if;
  return case when v_neg then -(v::numeric) else v::numeric end;
end $$;

create or replace function private.filed_date_lue(p text)
returns date language plpgsql immutable set search_path to '' as $$
declare v text := btrim(coalesce(p, ''));
begin
  if v ~ '^\d{4}-\d{2}-\d{2}' then return left(v, 10)::date; end if;
  if v ~ '^\d{2}/\d{2}/\d{4}$' then return to_date(v, 'DD/MM/YYYY'); end if;
  if v ~ '^\d{2}/\d{2}/\d{2}$' then return to_date(v, 'DD/MM/YY'); end if;
  if v ~ '^\d{2}\.\d{2}\.\d{4}$' then return to_date(v, 'DD.MM.YYYY'); end if;
  if v ~ '^\d{8}$' then return to_date(v, 'YYYYMMDD'); end if;
  return null;
exception when others then return null;
end $$;

-- Une ligne CSV en cellules (guillemets doublés compris).
create or replace function private.filed_csv_cellules(p_ligne text, p_sep text)
returns text[] language plpgsql immutable set search_path to '' as $$
declare v_out text[] := '{}'; v_cur text := ''; v_q boolean := false; i integer; c text; n integer := char_length(coalesce(p_ligne, ''));
begin
  i := 1;
  while i <= n loop
    c := substr(p_ligne, i, 1);
    if v_q then
      if c = '"' and substr(p_ligne, i + 1, 1) = '"' then v_cur := v_cur || '"'; i := i + 1;
      elsif c = '"' then v_q := false;
      else v_cur := v_cur || c; end if;
    elsif c = '"' then v_q := true;
    elsif c = p_sep then v_out := v_out || btrim(v_cur); v_cur := '';
    else v_cur := v_cur || c; end if;
    i := i + 1;
  end loop;
  return v_out || btrim(v_cur);
end $$;

-- Rend les opérations d'un fichier : {compte, du, au, solde_ouverture, solde_cloture, lignes: [{date, valeur, montant,
-- devise, libelle, reference, nom, iban}]}.
create or replace function private.filed_lire_releve(p_contenu text, p_format text)
returns jsonb language plpgsql stable set search_path to '' as $$
declare
  v_x xml; v_lignes jsonb := '[]'::jsonb; e xml; v_m numeric; v_sens text; v_tete text[]; v_l text[]; v_sep text; v_txt text;
  i_date integer; i_val integer; i_lib integer; i_mt integer; i_deb integer; i_cre integer; i_ref integer; i_dev integer; k integer;
  v_compte text; v_ouv numeric; v_clo numeric; v_rows text[]; v_d date;
begin
  if p_format = 'camt053' then
    v_x := xmlparse(document regexp_replace(p_contenu, '^\s*<\?xml[^>]*\?>', ''));
    v_compte := (xpath('(//*[local-name()=''Stmt'']/*[local-name()=''Acct'']/*[local-name()=''Id'']/*[local-name()=''IBAN''])[1]/text()', v_x))[1]::text;
    -- Sur un élément extrait, le contexte d'un xpath est la racine du fragment : d'où les chemins en « /*/ ».
    for e in select unnest(xpath('//*[local-name()=''Stmt'']/*[local-name()=''Bal'']', v_x)) loop
      v_m := (xpath('/*/*[local-name()=''Amt'']/text()', e))[1]::text::numeric;
      if (xpath('/*/*[local-name()=''CdtDbtInd'']/text()', e))[1]::text = 'DBIT' then v_m := -v_m; end if;
      case (xpath('/*/*[local-name()=''Tp'']/*[local-name()=''CdOrPrtry'']/*[local-name()=''Cd'']/text()', e))[1]::text
        when 'OPBD' then v_ouv := v_m; when 'PRCD' then v_ouv := coalesce(v_ouv, v_m); when 'CLBD' then v_clo := v_m; else null; end case;
    end loop;
    for e in select unnest(xpath('//*[local-name()=''Ntry'']', v_x)) loop
      v_m := (xpath('/*/*[local-name()=''Amt'']/text()', e))[1]::text::numeric;
      v_sens := (xpath('/*/*[local-name()=''CdtDbtInd'']/text()', e))[1]::text;
      if v_sens = 'DBIT' then v_m := -v_m; end if;
      continue when coalesce(v_m, 0) = 0;
      v_lignes := v_lignes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'date', private.filed_date_lue(coalesce((xpath('/*/*[local-name()=''BookgDt'']/*/text()', e))[1]::text, (xpath('/*/*[local-name()=''ValDt'']/*/text()', e))[1]::text)),
        'valeur', private.filed_date_lue((xpath('/*/*[local-name()=''ValDt'']/*/text()', e))[1]::text),
        'montant', v_m,
        'devise', coalesce((xpath('/*/*[local-name()=''Amt'']/@Ccy', e))[1]::text, 'EUR'),
        'libelle', btrim(concat_ws(' ',
                     (select string_agg(t::text, ' ') from unnest(xpath('/*//*[local-name()=''RmtInf'']/*[local-name()=''Ustrd'']/text()', e)) t),
                     (xpath('/*/*[local-name()=''AddtlNtryInf'']/text()', e))[1]::text)),
        'reference', coalesce(nullif((xpath('/*//*[local-name()=''Refs'']/*[local-name()=''EndToEndId'']/text()', e))[1]::text, 'NOTPROVIDED'),
                              (xpath('/*//*[local-name()=''CdtrRefInf'']/*[local-name()=''Ref'']/text()', e))[1]::text),
        'nom', (xpath(case when v_sens = 'DBIT' then '/*//*[local-name()=''RltdPties'']/*[local-name()=''Cdtr'']//*[local-name()=''Nm'']/text()'
                           else '/*//*[local-name()=''RltdPties'']/*[local-name()=''Dbtr'']//*[local-name()=''Nm'']/text()' end, e))[1]::text,
        'iban', (xpath(case when v_sens = 'DBIT' then '/*//*[local-name()=''RltdPties'']/*[local-name()=''CdtrAcct'']/*[local-name()=''Id'']/*[local-name()=''IBAN'']/text()'
                            else '/*//*[local-name()=''RltdPties'']/*[local-name()=''DbtrAcct'']/*[local-name()=''Id'']/*[local-name()=''IBAN'']/text()' end, e))[1]::text)));
    end loop;
  elsif p_format = 'csv' then
    v_txt := p_contenu;
    if getdatabaseencoding() = 'UTF8' then v_txt := replace(v_txt, chr(65279), ''); end if;
    v_rows := array(select r from unnest(regexp_split_to_array(v_txt, '\r\n|\n|\r')) r where btrim(r) <> '');
    if cardinality(v_rows) < 2 then raise exception 'Relevé CSV vide.' using errcode = '22023'; end if;
    v_sep := case when char_length(v_rows[1]) - char_length(replace(v_rows[1], ';', '')) > 0 then ';'
                  when char_length(v_rows[1]) - char_length(replace(v_rows[1], chr(9), '')) > 0 then chr(9) else ',' end;
    v_tete := private.filed_csv_cellules(lower(v_rows[1]), v_sep);
    for k in 1 .. cardinality(v_tete) loop
      v_txt := translate(v_tete[k], 'éèêàâîôûç', 'eeeaaiouc');
      if v_txt ~ 'valeur' then i_val := coalesce(i_val, k);
      elsif v_txt ~ '^date|date (d.)?op|date comptable' then i_date := coalesce(i_date, k);
      elsif v_txt ~ 'libell|description|intitul' then i_lib := coalesce(i_lib, k);
      elsif v_txt ~ 'd.{0,2}bit' then i_deb := coalesce(i_deb, k);
      elsif v_txt ~ 'cr.{0,2}dit' then i_cre := coalesce(i_cre, k);
      elsif v_txt ~ 'montant|amount|somme' then i_mt := coalesce(i_mt, k);
      elsif v_txt ~ 'r.{0,2}f.{0,2}rence|^ref' then i_ref := coalesce(i_ref, k);
      elsif v_txt ~ 'devise|currency' then i_dev := coalesce(i_dev, k);
      end if;
    end loop;
    if i_date is null or i_lib is null or (i_mt is null and i_deb is null and i_cre is null) then
      raise exception 'En-tête du relevé CSV non reconnu : il faut une date, un libellé et un montant (ou débit et crédit).' using errcode = '22023';
    end if;
    for k in 2 .. cardinality(v_rows) loop
      v_l := private.filed_csv_cellules(v_rows[k], v_sep);
      v_d := private.filed_date_lue(v_l[i_date]);
      continue when v_d is null;
      if i_mt is not null then v_m := private.filed_montant_lu(v_l[i_mt]);
      else v_m := coalesce(private.filed_montant_lu(v_l[i_cre]), 0) - abs(coalesce(private.filed_montant_lu(v_l[i_deb]), 0)); end if;
      continue when coalesce(v_m, 0) = 0;
      v_lignes := v_lignes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('date', v_d, 'valeur', private.filed_date_lue(v_l[i_val]),
        'montant', v_m, 'devise', coalesce(nullif(upper(v_l[i_dev]), ''), 'EUR'), 'libelle', coalesce(v_l[i_lib], ''), 'reference', nullif(v_l[i_ref], ''))));
    end loop;
  else
    raise exception 'Format de relevé inconnu : camt053 ou csv.' using errcode = '22023';
  end if;
  return jsonb_strip_nulls(jsonb_build_object('compte', v_compte, 'solde_ouverture', v_ouv, 'solde_cloture', v_clo,
    'du', (select min((l ->> 'date')::date) from jsonb_array_elements(v_lignes) l), 'au', (select max((l ->> 'date')::date) from jsonb_array_elements(v_lignes) l),
    'lignes', v_lignes));
end $$;
revoke all on function private.filed_iban_masque(text), private.filed_montant_lu(text), private.filed_date_lue(text),
  private.filed_csv_cellules(text, text), private.filed_lire_releve(text, text) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Le rapprochement
-- ───────────────────────────────────────────────────────────────────────────
-- Les factures que ce débit peut régler, avec leurs points. p_iban : l'IBAN du bénéficiaire en clair (jamais gardé).
create or replace function private.filed_candidats_ligne(p_l public.filed_releves_lignes, p_iban text default null)
returns table (facture_id uuid, points integer, reste numeric) language sql stable security definer set search_path to '' as $$
  with t as (
    select upper(regexp_replace(coalesce(p_l.libelle, '') || ' ' || coalesce(p_l.reference, '') || ' ' || coalesce(p_l.contrepartie_nom, ''), '[^A-Za-z0-9]', '', 'g')) as compact,
           ' ' || upper(regexp_replace(translate(lower(coalesce(p_l.libelle, '') || ' ' || coalesce(p_l.contrepartie_nom, '')), 'éèêëàâäîïôöûüç', 'eeeeaaaiioouuc'), '[^a-z0-9]+', ' ', 'g')) || ' ' as mots,
           nullif(upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g')), '') as iban
  ), f as (
    select f.*, coalesce(f.net_a_payer, f.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = f.id), 0) as reste
      from public.filed_factures f
     where f.client_id = p_l.client_id and f.entite_id = p_l.entite_id and f.statut in ('validee', 'comptabilisee') and f.nature = 'facture'
       and coalesce(f.devise, 'EUR') = p_l.devise
       and p_l.date_operation >= coalesce(f.date_emission, f.date_reception) - 10
  )
  select f.id,
         (case when char_length(coalesce(f.numero_normalise, '')) >= 3 and t.compact like '%' || upper(f.numero_normalise) || '%' then 3 else 0 end
        + case when t.iban is not null and (upper(regexp_replace(coalesce(f.iban, ''), '\s', '', 'g')) = t.iban
                 or exists (select 1 from public.filed_fournisseurs_ibans i where i.fournisseur_id = f.fournisseur_id and i.statut = 'valide'
                              and upper(regexp_replace(coalesce(i.iban, ''), '\s', '', 'g')) = t.iban)) then 3 else 0 end
        + case when exists (select 1 from public.filed_fournisseurs fo,
                              unnest(regexp_split_to_array(upper(regexp_replace(translate(lower(fo.nom), 'éèêëàâäîïôöûüç', 'eeeeaaaiioouuc'), '[^a-z0-9]+', ' ', 'g')), ' ')) m
                             where fo.id = f.fournisseur_id and char_length(m) >= 4 and m not in ('SARL', 'SOCIETE', 'GROUPE', 'FRANCE', 'SERVICES')
                               and t.mots like '% ' || m || ' %') then 2 else 0 end
        + case when f.echeance_lue is not null and p_l.date_operation between f.echeance_lue - 10 and f.echeance_lue + 10 then 1 else 0 end)::integer,
         round(f.reste, 2)
    from f, t
   where round(f.reste, 2) = -p_l.montant and f.reste > 0
   order by 2 desc, f.date_emission
$$;
revoke all on function private.filed_candidats_ligne(public.filed_releves_lignes, text) from public, anon, authenticated;

create or replace function private.filed_mode_releve(p_libelle text)
returns text language sql immutable set search_path to '' as $$
  select case when upper(coalesce(p_libelle, '')) ~ '(^|[^A-Z])(PRLV|PRELEVEMENT|PRÉLÈVEMENT|SEPA DD)' then 'prelevement'
              when upper(coalesce(p_libelle, '')) ~ '(^|[^A-Z])(CB|CARTE|PAIEMENT CB)([^A-Z]|$)' then 'carte'
              when upper(coalesce(p_libelle, '')) ~ '(^|[^A-Z])(CHQ|CHEQUE|CHÈQUE)' then 'cheque'
              else 'virement' end
$$;
revoke all on function private.filed_mode_releve(text) from public, anon, authenticated;

-- Rapproche une opération (débit) : règlement déjà noté, ou règlement à noter, ou candidats à proposer.
create or replace function private.filed_rapprocher_operation(p_ligne uuid, p_iban text default null)
returns text language plpgsql security definer set search_path to '' as $$
declare v_l public.filed_releves_lignes; v_r public.filed_reglements; v_c jsonb; v_meilleur integer; v_second integer; v_f uuid; v_reg uuid;
begin
  select * into v_l from public.filed_releves_lignes where id = p_ligne for update;
  if v_l.statut not in ('a_rapprocher', 'proposee') or v_l.montant >= 0 then return v_l.statut; end if;
  -- Un règlement noté à la main, même montant, à sept jours près, pas encore relié à une opération.
  select r.* into v_r from public.filed_reglements r join public.filed_factures f on f.id = r.facture_id
   where r.client_id = v_l.client_id and f.entite_id = v_l.entite_id and r.montant = -v_l.montant
     and r.regle_le between v_l.date_operation - 7 and v_l.date_operation + 7
     and not exists (select 1 from public.filed_releves_lignes x where x.reglement_id = r.id)
   order by abs(r.regle_le - v_l.date_operation), r.cree_le limit 1;
  if v_r.id is not null then
    update public.filed_releves_lignes set statut = 'rapprochee', facture_id = v_r.facture_id, reglement_id = v_r.id, candidats = '[]'::jsonb,
           motif = 'Règlement déjà noté', decide_le = now() where id = p_ligne;
    return 'rapprochee';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('facture', c.facture_id, 'points', c.points) order by c.points desc), '[]'::jsonb),
         max(c.points), (array_agg(c.points order by c.points desc))[2], (array_agg(c.facture_id order by c.points desc))[1]
    into v_c, v_meilleur, v_second, v_f
    from private.filed_candidats_ligne(v_l, p_iban) c;
  if v_meilleur >= 3 and coalesce(v_second, -1) < v_meilleur then
    v_reg := private.filed_marquer_reglee(v_f, least(v_l.date_operation, current_date), -v_l.montant, private.filed_mode_releve(v_l.libelle), 'RELEVE:' || v_l.id::text);
    update public.filed_releves_lignes set statut = 'rapprochee', facture_id = v_f, reglement_id = v_reg, candidats = v_c,
           motif = format('Rapprochée d''office (%s points)', v_meilleur), decide_le = now() where id = p_ligne;
    return 'rapprochee';
  end if;
  if jsonb_array_length(v_c) > 0 then
    update public.filed_releves_lignes set statut = 'proposee', candidats = v_c where id = p_ligne;
    return 'proposee';
  end if;
  return 'a_rapprocher';
end $$;
revoke all on function private.filed_rapprocher_operation(uuid, text) from public, anon, authenticated;

create or replace function private.filed_importer_releve(p_client uuid, p_entite uuid, p_nom_fichier text, p_contenu text, p_format text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid; v_format text; v_sha text; v_lu jsonb; v_rel uuid; l jsonb; v_rang integer := 0; v_base text; v_occ jsonb := '{}'::jsonb; v_n integer;
  v_id uuid; v_nouv integer := 0; v_dbl integer := 0; v_etat text; v_rap integer := 0; v_prop integer := 0; v_reste integer := 0;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  if not exists (select 1 from public.entites e where e.id = p_entite and e.client_id = p_client) then
    raise exception 'Société introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if nullif(btrim(p_contenu), '') is null then raise exception 'Le relevé est vide.' using errcode = '22023'; end if;
  v_format := coalesce(p_format, case when p_contenu ~ '^\s*(<\?xml|<Document)' then 'camt053' else 'csv' end);
  v_sha := encode(sha256(convert_to(p_contenu, 'UTF8')), 'hex');
  if exists (select 1 from public.filed_releves where client_id = p_client and entite_id = p_entite and sha256 = v_sha) then
    raise exception 'Ce relevé a déjà été importé.' using errcode = '23505';
  end if;
  begin
    v_lu := private.filed_lire_releve(p_contenu, v_format);
  exception when sqlstate '22023' then raise;
  when others then raise exception 'Relevé illisible (%) : %.', v_format, sqlerrm using errcode = '22023';
  end;
  insert into public.filed_releves (client_id, entite_id, nom_fichier, format, sha256, compte_masque, du, au, solde_ouverture, solde_cloture, nb_lignes, importe_par)
  values (p_client, p_entite, left(coalesce(nullif(btrim(p_nom_fichier), ''), 'releve'), 200), v_format, v_sha, private.filed_iban_masque(v_lu ->> 'compte'),
          (v_lu ->> 'du')::date, (v_lu ->> 'au')::date, (v_lu ->> 'solde_ouverture')::numeric, (v_lu ->> 'solde_cloture')::numeric,
          jsonb_array_length(v_lu -> 'lignes'), v_uid)
  returning id into v_rel;

  for l in select * from jsonb_array_elements(v_lu -> 'lignes') loop
    v_rang := v_rang + 1;
    v_base := encode(sha256(convert_to(concat_ws('|', l ->> 'date', round((l ->> 'montant')::numeric, 2)::text, l ->> 'devise',
                     upper(regexp_replace(coalesce(l ->> 'libelle', ''), '\s+', ' ', 'g')), coalesce(l ->> 'reference', '')), 'UTF8')), 'hex');
    v_n := coalesce((v_occ ->> v_base)::int, 0) + 1;
    v_occ := v_occ || jsonb_build_object(v_base, v_n);
    insert into public.filed_releves_lignes (client_id, entite_id, releve_id, rang, cle, date_operation, date_valeur, montant, devise, libelle, reference,
                                             contrepartie_nom, contrepartie_iban)
    values (p_client, p_entite, v_rel, v_rang, v_base || '#' || v_n, (l ->> 'date')::date, (l ->> 'valeur')::date, round((l ->> 'montant')::numeric, 2),
            coalesce(l ->> 'devise', 'EUR'), left(coalesce(l ->> 'libelle', ''), 500), left(l ->> 'reference', 140), left(l ->> 'nom', 140),
            private.filed_iban_masque(l ->> 'iban'))
    on conflict (client_id, entite_id, cle) do nothing
    returning id into v_id;
    if v_id is null then v_dbl := v_dbl + 1; continue; end if;
    v_nouv := v_nouv + 1;
    v_etat := private.filed_rapprocher_operation(v_id, l ->> 'iban');
    if v_etat = 'rapprochee' then v_rap := v_rap + 1; elsif v_etat = 'proposee' then v_prop := v_prop + 1; else v_reste := v_reste + 1; end if;
    v_id := null;
  end loop;
  update public.filed_releves set nb_nouvelles = v_nouv where id = v_rel;
  perform private.filed_journaliser(p_client, 'filed.releve.import', 'filed_releve', v_rel::text,
    jsonb_build_object('fichier', p_nom_fichier, 'format', v_format, 'sha256', v_sha, 'lignes', v_rang, 'nouvelles', v_nouv, 'deja_connues', v_dbl,
                       'rapprochees', v_rap, 'proposees', v_prop), p_entite);
  return jsonb_build_object('releve', v_rel, 'format', v_format, 'lignes', v_rang, 'nouvelles', v_nouv, 'deja_connues', v_dbl,
    'rapprochees', v_rap, 'proposees', v_prop, 'a_rapprocher', v_reste,
    'solde_ouverture', (v_lu ->> 'solde_ouverture')::numeric, 'solde_cloture', (v_lu ->> 'solde_cloture')::numeric);
end $$;
revoke all on function private.filed_importer_releve(uuid, uuid, text, text, text) from public, anon;
grant execute on function private.filed_importer_releve(uuid, uuid, text, text, text) to authenticated, service_role;

create or replace function public.filed_importer_releve(p_client uuid, p_entite uuid, p_nom_fichier text, p_contenu text, p_format text default null)
returns jsonb language sql set search_path to '' as $$ select private.filed_importer_releve(p_client, p_entite, p_nom_fichier, p_contenu, p_format) $$;
comment on function public.filed_importer_releve(uuid, uuid, text, text, text) is
  'Importe un relevé bancaire d''une société (CAMT.053 ou CSV avec en-tête) et rapproche ses débits des factures validées : {lignes, nouvelles, deja_connues, rapprochees, proposees, a_rapprocher}. Gérant, admin, valideur.';
revoke all on function public.filed_importer_releve(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.filed_importer_releve(uuid, uuid, text, text, text) to authenticated, service_role;

-- La décision d'une personne : cette opération règle cette facture.
create or replace function private.filed_rapprocher_ligne(p_ligne uuid, p_facture uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_l public.filed_releves_lignes; v_uid uuid; v_f public.filed_factures; v_reg uuid;
begin
  select * into v_l from public.filed_releves_lignes where id = p_ligne for update;
  if not found then raise exception 'Opération introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_l.client_id, array['gerant', 'admin', 'valideur'], v_l.entite_id);
  if v_l.statut not in ('a_rapprocher', 'proposee') then raise exception 'Cette opération est déjà %.', v_l.statut using errcode = '55000'; end if;
  if v_l.montant >= 0 then raise exception 'Un crédit ne règle pas une facture fournisseur.' using errcode = '22023'; end if;
  select * into v_f from public.filed_factures where id = p_facture and client_id = v_l.client_id and entite_id = v_l.entite_id;
  if not found then raise exception 'Facture introuvable pour cette société.' using errcode = 'P0002'; end if;
  v_reg := private.filed_marquer_reglee(p_facture, least(v_l.date_operation, current_date), -v_l.montant, private.filed_mode_releve(v_l.libelle), 'RELEVE:' || v_l.id::text);
  update public.filed_releves_lignes set statut = 'rapprochee', facture_id = p_facture, reglement_id = v_reg, motif = 'Rapprochée par une personne',
         decide_par = v_uid, decide_le = now() where id = p_ligne;
  perform private.filed_journaliser(v_l.client_id, 'filed.releve.rapprochement', 'filed_facture', p_facture::text,
    jsonb_build_object('ligne', p_ligne, 'reglement', v_reg, 'montant', -v_l.montant), v_l.entite_id);
  return v_reg;
end $$;
revoke all on function private.filed_rapprocher_ligne(uuid, uuid) from public, anon;
grant execute on function private.filed_rapprocher_ligne(uuid, uuid) to authenticated, service_role;

create or replace function public.filed_rapprocher_ligne(p_ligne uuid, p_facture uuid)
returns uuid language sql set search_path to '' as $$ select private.filed_rapprocher_ligne(p_ligne, p_facture) $$;
comment on function public.filed_rapprocher_ligne(uuid, uuid) is 'Rapproche une opération du relevé d''une facture : le règlement est noté (montant de l''opération, partiel permis). Gérant, admin, valideur.';
revoke all on function public.filed_rapprocher_ligne(uuid, uuid) from public, anon;
grant execute on function public.filed_rapprocher_ligne(uuid, uuid) to authenticated, service_role;

create or replace function private.filed_ignorer_ligne(p_ligne uuid, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_l public.filed_releves_lignes; v_uid uuid;
begin
  select * into v_l from public.filed_releves_lignes where id = p_ligne for update;
  if not found then raise exception 'Opération introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_l.client_id, array['gerant', 'admin', 'valideur'], v_l.entite_id);
  if v_l.statut not in ('a_rapprocher', 'proposee') then raise exception 'Cette opération est déjà %.', v_l.statut using errcode = '55000'; end if;
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) < 3 then raise exception 'Dites pourquoi cette opération est mise de côté.' using errcode = '22023'; end if;
  update public.filed_releves_lignes set statut = 'ignoree', motif = left(btrim(p_motif), 300), decide_par = v_uid, decide_le = now() where id = p_ligne;
  perform private.filed_journaliser(v_l.client_id, 'filed.releve.ignoree', 'filed_releve', v_l.releve_id::text,
    jsonb_build_object('ligne', p_ligne, 'motif', left(btrim(p_motif), 300)), v_l.entite_id);
end $$;
revoke all on function private.filed_ignorer_ligne(uuid, text) from public, anon;
grant execute on function private.filed_ignorer_ligne(uuid, text) to authenticated, service_role;

create or replace function public.filed_ignorer_ligne(p_ligne uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.filed_ignorer_ligne(p_ligne, p_motif) $$;
comment on function public.filed_ignorer_ligne(uuid, text) is 'Met de côté une opération du relevé qui ne règle aucune facture (frais bancaires, salaire…), avec son motif.';
revoke all on function public.filed_ignorer_ligne(uuid, text) from public, anon;
grant execute on function public.filed_ignorer_ligne(uuid, text) to authenticated, service_role;
