-- FILED, lot 17 (a4_25) — les écritures partent vers le logiciel comptable : Pennylane, Sage, Cegid, QuickBooks.
--
-- Audit des promesses (§ 2 FILED, n° 6). Premier temps, sur ordre du coordinateur : le fichier d'import de chacun ;
-- les API viendront ensuite. Les écritures sont celles de filed_ecritures (a4_17, a4_22) : achats (HA), règlements (BQ,
-- CA), extournes.
--
--   public.filed_exporter_ecritures(p_client, p_entite, p_format, p_exercice?, p_du?, p_au?) → jsonb
--     gérant, admin ou valideur (comme l'export FEC). p_format :
--       pennylane   CSV « ; », UTF-8, colonnes du modèle « Importer des écritures » de Pennylane (Date, Code journal,
--                   Numéro de compte, Libellé, Débit, Crédit, Numéro de pièce, Devise, Débit_devise_origine,
--                   Crédit_devise_origine) ; date JJ/MM/AAAA, virgule décimale ; le fournisseur en compte 401
--                   alphanumérique (401 + code du tiers), que Pennylane accepte.
--       sage        « Écritures Sage » (*.pnm) de Sage 100 Comptabilité, Fichier > Importer > Format Sage : première ligne
--                   le nom de la société (30), puis des lignes fixes de 138 caractères (journal 3, date JJMMAA, type de
--                   pièce 2, compte général 13, type de compte 1, compte auxiliaire 13, référence 13, libellé 25, mode de
--                   paiement 1, échéance 6, sens 1, montant 20 au point décimal, type d'écriture 1, n° de pièce 7, réservé
--                   26). Encodage ANSI (Windows-1252), à la charge de l'écran au téléchargement.
--       cegid       .TRA de Cegid (Expert, Loop, Y2) en mode journal : en-tête « ***S5CLIJRLSTD », les comptes de tiers
--                   (CAE), puis les mouvements de 222 caractères (journal 3, date JJMMAAAA, nature 2, général 17, type de
--                   compte 1, auxiliaire 17, référence 35, libellé 35, mode de paiement 3, échéance 8, sens 1, montant 20 à
--                   la virgule cadré à droite, type d'écriture 1, n° de pièce 8, devise 3, taux 10, code montant 3, montants
--                   2 et 3, établissement 3, axe 2, n° d'échéance 2). ANSI.
--       quickbooks  CSV « , » de QuickBooks en ligne, « Importer des écritures de journal » : Numéro de journal, Date du
--                   journal, Nom du compte, Description, Débits, Crédits, Nom (le fournisseur des lignes 401) ; moins de
--                   1 000 lignes par fichier, donc plusieurs fichiers si besoin, une écriture n'étant jamais coupée.
--     Sans période ni exercice : les écritures pas encore envoyées dans ce format (curseur par société et par format,
--     filed_envois_comptables). Avec une période ou un exercice : ces écritures-là, sans toucher au curseur.
--     Rend {format, fichiers: [{nom_fichier, contenu, encodage, separateur, lignes}], ecritures, lignes, total_debit,
--     total_credit, envoi}. Journalisé (filed.envoi_comptable) avec l'empreinte.
-- Migration idempotente ; aucune suppression.

create table if not exists public.filed_envois_comptables (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  entite_id          uuid not null references public.entites(id) on delete cascade,
  format             text not null check (format in ('pennylane', 'sage', 'cegid', 'quickbooks')),
  mode               text not null check (mode in ('nouvelles', 'periode')),
  du                 date,
  au                 date,
  premiere_ecriture  bigint,
  derniere_ecriture  bigint,
  ecritures          integer not null default 0,
  lignes             integer not null default 0,
  total_debit        numeric(16,2) not null default 0,
  total_credit       numeric(16,2) not null default 0,
  fichiers           jsonb not null default '[]'::jsonb,
  empreinte          text,
  envoye_par         uuid,
  cree_le            timestamptz not null default now()
);
comment on table public.filed_envois_comptables is
  'Les fichiers d''écritures produits pour un logiciel comptable (a4_25). En mode « nouvelles », derniere_ecriture fait curseur : l''envoi suivant part de là.';
create index if not exists filed_envois_comptables_curseur on public.filed_envois_comptables (client_id, entite_id, format, derniere_ecriture);
alter table public.filed_envois_comptables enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_envois_comptables' and policyname = 'filed_envois_comptables_lecture') then
    execute 'create policy filed_envois_comptables_lecture on public.filed_envois_comptables for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_envois_comptables from anon, authenticated;
grant select on public.filed_envois_comptables to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_envois_comptables', 3, 'FILED, lot 17')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- ───────────────────────────────────────────────────────────────────────────
-- Zones fixes et champs CSV
-- ───────────────────────────────────────────────────────────────────────────
-- Zone alphanumérique : cadrée à gauche, complétée d'espaces, coupée à la longueur ; sans retour à la ligne.
create or replace function private.filed_zone(p text, p_n integer)
returns text language sql immutable set search_path to '' as $$
  select rpad(left(regexp_replace(coalesce(p, ''), '[[:cntrl:]]+', ' ', 'g'), p_n), p_n, ' ')
$$;
-- Zone numérique : deux décimales, séparateur donné, cadrée à droite.
create or replace function private.filed_zone_montant(p numeric, p_n integer, p_sep text)
returns text language sql immutable set search_path to '' as $$
  select lpad(replace(to_char(coalesce(p, 0), 'FM99999999999999990.00'), '.', p_sep), p_n, ' ')
$$;
-- Champ CSV : entre guillemets si besoin, guillemets doublés.
create or replace function private.filed_csv(p text, p_sep text)
returns text language sql immutable set search_path to '' as $$
  select case when v ~ ('["\r\n' || p_sep || ']') then '"' || replace(v, '"', '""') || '"' else v end
    from (select regexp_replace(coalesce(p, ''), '[\r\n]+', ' ', 'g') v) s
$$;
revoke all on function private.filed_zone(text, integer) from public, anon, authenticated;
revoke all on function private.filed_zone_montant(numeric, integer, text) from public, anon, authenticated;
revoke all on function private.filed_csv(text, text) from public, anon, authenticated;
grant execute on function private.filed_zone(text, integer), private.filed_zone_montant(numeric, integer, text), private.filed_csv(text, text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Les lignes à envoyer
-- ───────────────────────────────────────────────────────────────────────────
-- Les lignes retenues, dans l'ordre des écritures. piece : la référence, suivie du numéro d'écriture pour une extourne
-- (elle garde la référence de la facture, et les logiciels regroupent par pièce) ; nature : FF facture fournisseur,
-- AF avoir ou extourne (le fournisseur au débit), RF règlement ; rang : l'écriture ; n_lignes : ses lignes.
create or replace function private.filed_envoi_lignes(p_client uuid, p_entite uuid, p_curseur bigint, p_exercice uuid, p_du date, p_au date)
returns table (id bigint, journal_code text, journal_lib text, exercice_cle text, ecriture_num integer, ecriture_date date, compte_num text,
               compte_lib text, comp_aux_num text, comp_aux_lib text, piece text, ecriture_lib text, debit numeric, credit numeric,
               montant_devise numeric, idevise text, nature text, rang bigint, n_lignes bigint)
language sql stable set search_path to '' as $$
  select e.id, e.journal_code, e.journal_lib, e.exercice_cle, e.ecriture_num, e.ecriture_date, e.compte_num, e.compte_lib,
         e.comp_aux_num, e.comp_aux_lib,
         case when e.extourne_de is not null then e.piece_ref || '-' || e.ecriture_num else e.piece_ref end,
         e.ecriture_lib, e.debit, e.credit, e.montant_devise, e.idevise,
         case when e.origine = 'reglement' then 'RF'
              when bool_or(e.compte_num like '40%' and e.debit > 0) over (partition by e.exercice_cle, e.ecriture_num) then 'AF'
              else 'FF' end,
         dense_rank() over (order by e.exercice_cle, e.ecriture_num),
         count(*) over (partition by e.exercice_cle, e.ecriture_num)
    from public.filed_ecritures e
   where e.client_id = p_client and e.entite_id = p_entite
     and case when p_curseur is not null then e.id > p_curseur
              when p_exercice is not null then e.exercice_id = p_exercice
              else e.ecriture_date between p_du and p_au end
   order by e.exercice_cle, e.ecriture_num, e.id
$$;
revoke all on function private.filed_envoi_lignes(uuid, uuid, bigint, uuid, date, date) from public, anon, authenticated;
grant execute on function private.filed_envoi_lignes(uuid, uuid, bigint, uuid, date, date) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- L'export
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_exporter_ecritures(p_client uuid, p_entite uuid, p_format text, p_exercice uuid default null,
                                                           p_du date default null, p_au date default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_acteur uuid; v_e public.entites; v_x public.filed_exercices; v_mode text; v_curseur bigint; v_du date; v_au date;
  v_fichiers jsonb := '[]'::jsonb; v_lignes text[]; v_nb integer := 0; v_ecr integer := 0; v_d numeric := 0; v_c numeric := 0;
  v_premiere bigint; v_derniere bigint; v_base text; v_rang bigint := 0; v_dans_fichier integer := 0; v_envoi uuid; v_empreinte text;
  v_entete text; r record; t record;
begin
  v_acteur := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  if p_format is null or p_format not in ('pennylane', 'sage', 'cegid', 'quickbooks') then
    raise exception 'Format inconnu : pennylane, sage, cegid ou quickbooks.' using errcode = '22023';
  end if;
  select * into v_e from public.entites where id = p_entite and client_id = p_client;
  if not found then raise exception 'Société introuvable dans cette organisation.' using errcode = '22023'; end if;
  if p_exercice is not null then
    select * into v_x from public.filed_exercices where id = p_exercice and client_id = p_client;
    if not found then raise exception 'Exercice introuvable.' using errcode = '22023'; end if;
    v_mode := 'periode'; v_du := v_x.debut; v_au := v_x.fin;
  elsif p_du is not null or p_au is not null then
    v_mode := 'periode'; v_du := coalesce(p_du, date '1900-01-01'); v_au := coalesce(p_au, date '2999-12-31');
    if v_au < v_du then raise exception 'La période finit avant de commencer.' using errcode = '22023'; end if;
  else
    v_mode := 'nouvelles';
    select coalesce(max(derniere_ecriture), 0) into v_curseur from public.filed_envois_comptables
     where client_id = p_client and entite_id = p_entite and format = p_format and mode = 'nouvelles';
  end if;

  select count(*), count(distinct (l.exercice_cle, l.ecriture_num)), coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0), min(l.id), max(l.id)
    into v_nb, v_ecr, v_d, v_c, v_premiere, v_derniere
    from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) l;
  if v_nb = 0 then
    return jsonb_build_object('format', p_format, 'mode', v_mode, 'fichiers', '[]'::jsonb, 'ecritures', 0, 'lignes', 0,
                              'total_debit', 0, 'total_credit', 0, 'envoi', null);
  end if;
  v_base := 'omega-ecritures-' || coalesce(nullif(v_e.siren, ''), left(p_entite::text, 8)) || '-'
            || case when v_mode = 'nouvelles' then to_char(now(), 'YYYYMMDD-HH24MISS') else to_char(v_du, 'YYYYMMDD') || '-' || to_char(v_au, 'YYYYMMDD') end;

  if p_format = 'pennylane' then
    v_lignes := array['Date;Code journal;Numéro de compte;Libellé;Débit;Crédit;Numéro de pièce;Devise;Débit_devise_origine;Crédit_devise_origine'];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (to_char(r.ecriture_date, 'DD/MM/YYYY') || ';' || private.filed_csv(r.journal_code, ';') || ';'
        || private.filed_csv(case when r.comp_aux_num is not null
                                  then left(r.compte_num, 3) || upper(regexp_replace(r.comp_aux_num, '[^A-Za-z0-9]', '', 'g'))
                                  else r.compte_num end, ';') || ';'
        || private.filed_csv(left(r.ecriture_lib, 200), ';') || ';'
        || replace(to_char(r.debit, 'FM9999999999990.00'), '.', ',') || ';' || replace(to_char(r.credit, 'FM9999999999990.00'), '.', ',') || ';'
        || private.filed_csv(r.piece, ';') || ';' || coalesce(r.idevise, 'EUR') || ';'
        || case when r.montant_devise is not null and r.debit > 0 then replace(to_char(abs(r.montant_devise), 'FM9999999999990.00'), '.', ',') else '' end || ';'
        || case when r.montant_devise is not null and r.credit > 0 then replace(to_char(abs(r.montant_devise), 'FM9999999999990.00'), '.', ',') else '' end);
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-pennylane.csv', 'encodage', 'UTF-8', 'separateur', ';',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  elsif p_format = 'sage' then
    v_lignes := array[private.filed_zone(v_e.nom, 30)];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (private.filed_zone(r.journal_code, 3) || to_char(r.ecriture_date, 'DDMMYY') || r.nature
        || private.filed_zone(r.compte_num, 13) || case when r.comp_aux_num is not null then 'X' else ' ' end
        || private.filed_zone(r.comp_aux_num, 13) || private.filed_zone(r.piece, 13) || private.filed_zone(r.ecriture_lib, 25)
        || ' ' || repeat(' ', 6) || case when r.debit > 0 then 'D' else 'C' end
        || private.filed_zone_montant(greatest(r.debit, r.credit), 20, '.') || 'N' || private.filed_zone(right(r.ecriture_num::text, 7), 7)
        || repeat(' ', 26));
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-sage.pnm', 'encodage', 'Windows-1252', 'separateur', 'positions',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  elsif p_format = 'cegid' then
    v_entete := '***S5CLIJRLSTD' || repeat(' ', 3) || '01011970' || '01011970' || '007' || repeat(' ', 5) || to_char(now(), 'DDMMYYYYHH24MI')
             || private.filed_zone('Omega', 35) || private.filed_zone(v_e.nom, 35) || repeat(' ', 4) || repeat(' ', 6) || repeat(' ', 3)
             || repeat(' ', 8) || '001';
    v_lignes := array[v_entete];
    -- Les comptes de tiers, pour qu'un fournisseur nouveau soit créé à l'import.
    for t in select l.comp_aux_num, max(l.comp_aux_lib) lib, min(l.compte_num) collectif
               from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) l
              where l.comp_aux_num is not null group by l.comp_aux_num order by l.comp_aux_num loop
      v_lignes := v_lignes || ('***CAE' || private.filed_zone(t.comp_aux_num, 17) || private.filed_zone(t.lib, 35) || 'FOU' || 'X'
                               || private.filed_zone(t.collectif, 17));
    end loop;
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (private.filed_zone(r.journal_code, 3) || to_char(r.ecriture_date, 'DDMMYYYY') || r.nature
        || private.filed_zone(r.compte_num, 17) || case when r.comp_aux_num is not null then 'X' else ' ' end
        || private.filed_zone(r.comp_aux_num, 17) || private.filed_zone(r.piece, 35) || private.filed_zone(r.ecriture_lib, 35)
        || repeat(' ', 3) || repeat(' ', 8) || case when r.debit > 0 then 'D' else 'C' end
        || private.filed_zone_montant(greatest(r.debit, r.credit), 20, ',') || 'N' || lpad(right(r.ecriture_num::text, 8), 8, ' ')
        || repeat(' ', 3) || repeat(' ', 10) || 'E--' || repeat(' ', 20) || repeat(' ', 20) || repeat(' ', 3) || repeat(' ', 2) || repeat(' ', 2));
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-cegid.tra', 'encodage', 'Windows-1252', 'separateur', 'positions',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  else   -- quickbooks : moins de 1 000 lignes par fichier, une écriture n'est jamais coupée
    v_entete := 'Numéro de journal,Date du journal,Nom du compte,Description,Débits,Crédits,Nom';
    v_lignes := array[v_entete];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      if r.rang <> v_rang then
        if v_dans_fichier > 0 and v_dans_fichier + r.n_lignes > 999 then
          v_fichiers := v_fichiers || jsonb_build_object('nom_fichier', v_base || '-quickbooks-' || (jsonb_array_length(v_fichiers) + 1) || '.csv',
            'encodage', 'UTF-8', 'separateur', ',', 'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_dans_fichier);
          v_lignes := array[v_entete]; v_dans_fichier := 0;
        end if;
        v_rang := r.rang;
      end if;
      v_lignes := v_lignes || (private.filed_csv(r.journal_code || '-' || regexp_replace(r.exercice_cle, '[^A-Za-z0-9]', '', 'g') || '-' || r.ecriture_num, ',') || ','
        || to_char(r.ecriture_date, 'DD/MM/YYYY') || ',' || private.filed_csv(coalesce(nullif(r.compte_lib, ''), r.compte_num), ',') || ','
        || private.filed_csv(r.ecriture_lib, ',') || ','
        || case when r.debit > 0 then to_char(r.debit, 'FM9999999999990.00') else '' end || ','
        || case when r.credit > 0 then to_char(r.credit, 'FM9999999999990.00') else '' end || ','
        || private.filed_csv(case when r.comp_aux_num is not null then r.comp_aux_lib end, ','));
      v_dans_fichier := v_dans_fichier + 1;
    end loop;
    v_fichiers := v_fichiers || jsonb_build_object('nom_fichier', v_base || '-quickbooks-' || (jsonb_array_length(v_fichiers) + 1) || '.csv',
      'encodage', 'UTF-8', 'separateur', ',', 'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_dans_fichier);
  end if;

  select encode(sha256(convert_to(string_agg(f ->> 'contenu', '' order by n), 'UTF8')), 'hex') into v_empreinte
    from jsonb_array_elements(v_fichiers) with ordinality x(f, n);
  insert into public.filed_envois_comptables (client_id, entite_id, format, mode, du, au, premiere_ecriture, derniere_ecriture, ecritures,
                                              lignes, total_debit, total_credit, fichiers, empreinte, envoye_par)
  values (p_client, p_entite, p_format, v_mode, v_du, v_au, v_premiere, v_derniere, v_ecr, v_nb, v_d, v_c,
          (select jsonb_agg(f ->> 'nom_fichier') from jsonb_array_elements(v_fichiers) f), v_empreinte, v_acteur)
  returning id into v_envoi;
  perform private.filed_journaliser(p_client, 'filed.envoi_comptable', 'entite', p_entite::text,
    jsonb_build_object('format', p_format, 'mode', v_mode, 'du', v_du, 'au', v_au, 'ecritures', v_ecr, 'lignes', v_nb,
                       'premiere', v_premiere, 'derniere', v_derniere, 'empreinte', v_empreinte, 'envoi', v_envoi), p_entite);
  return jsonb_build_object('format', p_format, 'mode', v_mode, 'fichiers', v_fichiers, 'ecritures', v_ecr, 'lignes', v_nb,
    'total_debit', v_d, 'total_credit', v_c, 'equilibre', v_d = v_c, 'envoi', v_envoi, 'empreinte', v_empreinte);
end $$;
comment on function private.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) is
  'Lot 17 (a4_25) : les écritures d''une société au format d''import de Pennylane, Sage 100 (PNM), Cegid (TRA) ou QuickBooks ; les nouvelles depuis le dernier envoi, ou une période.';
revoke all on function private.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) from public, anon;
grant execute on function private.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) to authenticated, service_role;

create or replace function public.filed_exporter_ecritures(p_client uuid, p_entite uuid, p_format text, p_exercice uuid default null,
                                                          p_du date default null, p_au date default null)
returns jsonb language sql set search_path to '' as $$ select private.filed_exporter_ecritures(p_client, p_entite, p_format, p_exercice, p_du, p_au) $$;
comment on function public.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) is
  'Le fichier d''import des écritures pour Pennylane, Sage, Cegid ou QuickBooks : les nouvelles depuis le dernier envoi (sans période), ou une période / un exercice. Gérant, admin ou valideur.';
revoke all on function public.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) from public, anon;
grant execute on function public.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date) to authenticated, service_role;
