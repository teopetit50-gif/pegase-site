-- 20261019153833 a4_62_banc_reference
-- Source : dépôt : dd6fdd4e omega/migrations/a4_62_filed_lot54_banc_de_reference.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_62_filed_lot54_banc_de_reference.sql @ dd6fdd4e ; a4_50 cité comme test : ignoré ; a4_49 cité comme test : ignoré.
-- ═══ omega/migrations/a4_62_filed_lot54_banc_de_reference.sql @ dd6fdd4e
-- a4_62 (FILED lot 54) : le banc de référence. Une note par contrôle FILED et par champ du lecteur, rejouée
-- à chaque lot FILED ou A1, sur des pièces et des cas dont on connaît la bonne réponse.
--
-- Décision de Teo (19/10/2026, 15 h 22 Z). Sources, licences lues par le bureau le 19/10 :
--   hf_djo33350  huggingface.co/datasets/djo33350/french-synthetic-document-test-samples (CC BY 4.0, données
--                synthétiques) : six PDF fictifs et leur vérité terrain. Cas « piece » : le PDF est déposé sur le
--                client du banc (omega/banc/banc_reference.mjs --deposer), le lecteur le lit, FILED le contrôle.
--   einvoi       data.gouv.fr, « Jeu de tests Factur-X 1.09.2 — TVA, montants, doublons et cohérence PDF/XML »
--                (Einvoi, Licence Ouverte 2.0). Ses 29 cas décrivent des montants, pas des fichiers : ceux qui
--                portent sur les contrôles FILED sont traduits en « scenario » (des factures construites puis
--                contrôlées à blanc) ; les autres sont gardés au banc, marqués hors périmètre FILED.
--   nobat        les vraies pièces NOBAT de la recette, hors git : le coordinateur remplit lui-même leurs bonnes
--                réponses sur la recette (empreinte de la pièce, champs clés). Git ne porte ni nom ni montant.
--   omega        cas écrits par A4 (le devis et la facture d'un même fournisseur, par exemple).
-- canopynexus/factur-x (MIT) n'est qu'un outil du banc, pour fabriquer des variantes : rien de lui n'entre ici.
--
--   private.filed_banc_cas        les cas et leurs bonnes réponses ;
--   private.filed_banc_releves    un relevé par passage (étiquette : le lot, le SHA du lecteur…) ;
--   private.filed_banc_verdicts   un verdict par cas et par champ ou contrôle attendu ;
--   private.filed_banc_rejouer(etiquette, client)  joue tout et rend le numéro du relevé ;
--   private.filed_banc_notes(releve)               le tableau de notes, avec la note du relevé précédent.
--
-- Les scénarios se jouent À BLANC : factures créées dans un sous-bloc, contrôlées, verdicts lus, puis le
-- sous-bloc est annulé (exception rattrapée). Rien n'en reste : ni facture, ni pièce, ni alerte, ni compteur.
-- Les cas « piece » ne font que lire ce que le lecteur et FILED ont déjà écrit.
-- Rien n'est exposé : schéma private, exécution réservée à service_role. Rejouable.

create table if not exists private.filed_banc_cas (
  code text primary key check (code ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{1,79}$'),
  source text not null check (source in ('hf_djo33350', 'einvoi', 'nobat', 'omega')),
  licence text,
  attribution text,
  genre text not null check (genre in ('piece', 'scenario', 'hors_perimetre')),
  piece_sha256 text check (piece_sha256 is null or piece_sha256 ~ '^[0-9a-f]{64}$'),
  lie_a text,
  intitule text not null check (char_length(intitule) between 3 and 300),
  champs_attendus jsonb not null default '{}' check (jsonb_typeof(champs_attendus) = 'object'),
  controles_attendus jsonb not null default '{}' check (jsonb_typeof(controles_attendus) = 'object'),
  scenario jsonb check (scenario is null or jsonb_typeof(scenario) = 'object'),
  note text,
  maj_le timestamptz not null default now(),
  check (genre <> 'scenario' or scenario is not null)
);
comment on table private.filed_banc_cas is
  'Banc de référence FILED (a4_62) : un cas, sa source, sa licence et ses bonnes réponses. controles_attendus : '
  '{"<code>" | "famille:<famille>" : {"resultat": "anomalie" | "ok" | "pas_anomalie" | "present", "gravites": [...]}}.';

create table if not exists private.filed_banc_releves (
  id bigint generated always as identity primary key,
  etiquette text not null check (char_length(etiquette) between 1 and 120),
  client_id uuid,
  lance_le timestamptz not null default now(),
  nb_cas int not null default 0,
  nb_verdicts int not null default 0,
  nb_justes int not null default 0
);

create table if not exists private.filed_banc_verdicts (
  releve_id bigint not null references private.filed_banc_releves(id),
  cas_code text not null,
  source text not null,
  genre text not null check (genre in ('champ', 'controle')),
  cle text not null,
  attendu jsonb,
  obtenu jsonb,
  verdict text not null check (verdict in ('juste', 'faux', 'non_joue')),
  motif text,
  primary key (releve_id, cas_code, genre, cle)
);

alter table private.filed_banc_cas enable row level security;
alter table private.filed_banc_releves enable row level security;
alter table private.filed_banc_verdicts enable row level security;
revoke all on private.filed_banc_cas, private.filed_banc_releves, private.filed_banc_verdicts from public, anon, authenticated;
grant all on private.filed_banc_cas, private.filed_banc_releves, private.filed_banc_verdicts to service_role;

-- ─── Comparer une valeur lue à la bonne réponse ─────────────────────────
create or replace function private.filed_banc_nombre(p jsonb) returns numeric
language plpgsql immutable set search_path to '' as $$
declare v_t text;
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) = 'number' then return (p #>> '{}')::numeric; end if;
  if jsonb_typeof(p) = 'object' and p ? 'valeur' then return private.filed_banc_nombre(p -> 'valeur'); end if;
  v_t := regexp_replace(p #>> '{}', '[\s€%]|EUR', '', 'g');
  v_t := replace(v_t, ',', '.');
  if v_t ~ '^-?[0-9]+(\.[0-9]+)?$' then return v_t::numeric; end if;
  return null;
end $$;

-- Sans accent, sans casse, sans ponctuation. Un remplacement par lettre (et non translate) : juste quel que soit
-- l'encodage de la base.
create or replace function private.filed_banc_texte(p jsonb) returns text
language plpgsql immutable set search_path to '' as $$
declare
  v_t text := lower(case when jsonb_typeof(p) = 'object' and p ? 'valeur' then p ->> 'valeur' else p #>> '{}' end);
  v_paire text[];
begin
  foreach v_paire slice 1 in array array[['à','a'],['â','a'],['ä','a'],['á','a'],['ã','a'],['ç','c'],['é','e'],['è','e'],['ê','e'],
      ['ë','e'],['í','i'],['ì','i'],['î','i'],['ï','i'],['ñ','n'],['ó','o'],['ò','o'],['ô','o'],['ö','o'],['õ','o'],['ú','u'],
      ['ù','u'],['û','u'],['ü','u'],['À','a'],['Â','a'],['Ç','c'],['É','e'],['È','e'],['Ê','e'],['Î','i'],['Ï','i'],['Ô','o'],
      ['Ù','u'],['Û','u'],['œ','oe'],['Œ','oe'],['æ','ae']] loop
    v_t := replace(v_t, v_paire[1], v_paire[2]);
  end loop;
  return nullif(regexp_replace(v_t, '[^a-z0-9]', '', 'g'), '');
end $$;

-- Rend 'juste' ou 'faux' (ou null si rien n'a été lu).
create or replace function private.filed_banc_comparer(p_champ text, p_attendu jsonb, p_obtenu jsonb) returns text
language plpgsql immutable set search_path to '' as $$
declare
  v_obtenu jsonb := case when jsonb_typeof(p_obtenu) = 'object' and p_obtenu ? 'valeur' then p_obtenu -> 'valeur' else p_obtenu end;
  a jsonb;
  v_ok boolean;
begin
  if v_obtenu is null or jsonb_typeof(v_obtenu) = 'null' then
    return case when p_attendu is null or jsonb_typeof(p_attendu) = 'null' then 'juste' else 'faux' end;
  end if;
  -- Les lignes : on compte.
  if jsonb_typeof(p_attendu) = 'object' and p_attendu ? 'nombre' then
    return case when jsonb_typeof(v_obtenu) = 'array' and jsonb_array_length(v_obtenu) = (p_attendu ->> 'nombre')::int
                then 'juste' else 'faux' end;
  end if;
  -- La ventilation : autant de taux, chacun retrouvé (taux, base, montant à un centime).
  if jsonb_typeof(p_attendu) = 'array' then
    if jsonb_typeof(v_obtenu) <> 'array' or jsonb_array_length(v_obtenu) <> jsonb_array_length(p_attendu) then
      return 'faux';
    end if;
    for a in select * from jsonb_array_elements(p_attendu) loop
      select exists (select 1 from jsonb_array_elements(v_obtenu) o
                     where abs(coalesce(private.filed_banc_nombre(o -> 'taux'), -1) - private.filed_banc_nombre(a -> 'taux')) <= 0.01
                       and abs(coalesce(private.filed_banc_nombre(o -> 'base'), -1e9) - private.filed_banc_nombre(a -> 'base')) <= 0.01
                       and abs(coalesce(private.filed_banc_nombre(o -> 'montant'), -1e9) - private.filed_banc_nombre(a -> 'montant')) <= 0.01)
        into v_ok;
      if not v_ok then return 'faux'; end if;
    end loop;
    return 'juste';
  end if;
  if jsonb_typeof(p_attendu) = 'number' then
    return case when abs(coalesce(private.filed_banc_nombre(v_obtenu), -1e12) - (p_attendu #>> '{}')::numeric) <= 0.005
                then 'juste' else 'faux' end;
  end if;
  if (p_attendu #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' then
    return case when left(v_obtenu #>> '{}', 10) = p_attendu #>> '{}' then 'juste' else 'faux' end;
  end if;
  return case when private.filed_banc_texte(v_obtenu) = private.filed_banc_texte(p_attendu) then 'juste' else 'faux' end;
end $$;

-- Le verdict d'un contrôle attendu, sur les résultats d'une facture (tableau de {code, resultat, gravite}).
create or replace function private.filed_banc_juger(p_cle text, p_attendu jsonb, p_resultats jsonb) returns text
language plpgsql immutable set search_path to '' as $$
declare
  v_famille text := case when p_cle like 'famille:%' then substr(p_cle, 9) end;
  v_voulu text := p_attendu ->> 'resultat';
  v_gravites jsonb := p_attendu -> 'gravites';
  v_lignes jsonb;
  v_anomalie boolean;
begin
  select coalesce(jsonb_agg(r), '[]'::jsonb) into v_lignes
  from jsonb_array_elements(coalesce(p_resultats, '[]'::jsonb)) r
  where case when v_famille is not null then split_part(r ->> 'code', '.', 1) = v_famille else r ->> 'code' = p_cle end;
  select exists (select 1 from jsonb_array_elements(v_lignes) r
                 where r ->> 'resultat' in ('anomalie', 'levee')
                   and (v_gravites is null or v_gravites ? (r ->> 'gravite'))) into v_anomalie;
  return case v_voulu
    when 'anomalie' then case when v_anomalie then 'juste' else 'faux' end
    when 'pas_anomalie' then case when not exists (select 1 from jsonb_array_elements(v_lignes) r
                                                   where r ->> 'resultat' in ('anomalie', 'levee')) then 'juste' else 'faux' end
    when 'ok' then case when jsonb_array_length(v_lignes) > 0
                             and not exists (select 1 from jsonb_array_elements(v_lignes) r where r ->> 'resultat' <> 'ok')
                        then 'juste' else 'faux' end
    when 'present' then case when jsonb_array_length(v_lignes) > 0 then 'juste' else 'faux' end
    else 'faux' end;
end $$;

-- ─── Un scénario, à blanc : rend les résultats des contrôles de la facture visée ────
-- scenario = {"factures": [{nature, numero, date (décalage en jours depuis aujourd'hui), echeance (décalage),
--             devise, ht, tva, ttc, net, prepaye, lignes: [montants HT], ventilation: [{taux, base, montant}],
--             fournisseur (false : sans fournisseur), source}], "cible": rang (1 = la première ; défaut : la dernière)}
create or replace function private.filed_banc_scenario(p_client uuid, p_scenario jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_ent uuid;
  v_four uuid;
  v_annee smallint := extract(year from now())::smallint;
  v_base int := 900000 + (floor(random() * 90000))::int;
  v_cible int := coalesce((p_scenario ->> 'cible')::int, jsonb_array_length(p_scenario -> 'factures'));
  v_factures uuid[] := '{}';
  v_resultats jsonb;
  x jsonb;
  i int := 0;
  v_piece uuid; v_doc uuid; v_f uuid; v_num text;
begin
  select e.id into v_ent from public.entites e where e.client_id = p_client order by e.principale desc limit 1;
  if v_ent is null then
    raise exception 'filed_banc_scenario : client % sans entité', p_client;
  end if;
  begin
    insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
    values (p_client, 'BANC-' || v_base, 'Fournisseur du banc ' || v_base, 'fournisseur du banc ' || v_base, 'FR', 'actif', 'saisie', null)
    returning id into v_four;
    for x in select * from jsonb_array_elements(p_scenario -> 'factures') loop
      i := i + 1;
      v_num := x ->> 'numero';
      insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
      values (gen_random_uuid(), p_client, 'filed', 'depot', 'banc-' || v_base || '-' || i || '.xml', 'application/xml', 1024,
              md5('banc' || v_base || i) || md5(i || 'banc' || v_base), p_client::text || '/filed_document/banc/' || v_base || '-' || i,
              'filed_document', 'banc-' || v_base || '-' || i, 'lue')
      returning id into v_piece;
      insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, nom_fichier,
                                          sha256, recu_le, etat, nature, nature_source)
      values (p_client, v_ent, v_annee, v_base + i, v_piece, coalesce(x ->> 'source', 'depot'), 'banc-' || v_base || '-' || i || '.xml',
              md5('banc' || v_base || i) || md5(i || 'banc' || v_base), now(), 'integre', coalesce(x ->> 'nature', 'facture'), 'lecteur')
      returning id into v_doc;
      insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception,
                                         echeance_lue, devise, montant_ht, montant_tva, montant_ttc, net_a_payer, montant_prepaye,
                                         fournisseur_id, fournisseur_identification, statut)
      values (p_client, v_ent, v_doc, coalesce(x ->> 'nature', 'facture'), v_num,
              nullif(upper(regexp_replace(coalesce(v_num, ''), '[^A-Za-z0-9]', '', 'g')), ''),
              current_date + (x ->> 'date')::int, current_date, current_date + (x ->> 'echeance')::int,
              coalesce(x ->> 'devise', 'EUR'), (x ->> 'ht')::numeric, (x ->> 'tva')::numeric, (x ->> 'ttc')::numeric,
              (x ->> 'net')::numeric, (x ->> 'prepaye')::numeric,
              case when coalesce((x ->> 'fournisseur')::boolean, true) then v_four end,
              case when coalesce((x ->> 'fournisseur')::boolean, true) then 'saisie' end, 'a_completer')
      returning id into v_f;
      insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, source)
      select p_client, v_f, v_doc, l.rang, 'Ligne ' || l.rang, 1, (l.m #>> '{}')::numeric, (l.m #>> '{}')::numeric, 'regle'
      from jsonb_array_elements(coalesce(x -> 'lignes', '[]')) with ordinality l(m, rang);
      insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
      select p_client, v_f, v_doc, 'S', (t ->> 'taux')::numeric, (t ->> 'base')::numeric, (t ->> 'montant')::numeric, 'regle'
      from jsonb_array_elements(coalesce(x -> 'ventilation', '[]')) t;
      v_factures := v_factures || v_f;
      perform private.filed_controler_facture(v_f);
    end loop;
    select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'resultat', c.resultat, 'gravite', c.gravite, 'message', c.message)), '[]'::jsonb)
      into v_resultats
    from public.filed_controles c where c.facture_id = v_factures[v_cible];
    raise exception using errcode = 'P0A62', message = 'banc : annulation du scénario';
  exception when sqlstate 'P0A62' then
    null;  -- tout est annulé ; v_resultats reste.
  end;
  return v_resultats;
end $$;

-- ─── Rejouer tout le banc ───────────────────────────────────────────────
create or replace function private.filed_banc_rejouer(p_etiquette text, p_client uuid default null) returns bigint
language plpgsql security definer set search_path to '' as $$
declare
  v_releve bigint;
  c record;
  k text;
  v_attendu jsonb;
  v_piece public.pieces;
  v_facture uuid;
  v_resultats jsonb;
  v_obtenu jsonb;
  v_verdict text;
  v_motif text;
begin
  insert into private.filed_banc_releves (etiquette, client_id) values (p_etiquette, p_client) returning id into v_releve;
  for c in select * from private.filed_banc_cas order by source, code loop
    v_resultats := null; v_facture := null; v_piece := null; v_motif := null;
    if c.genre = 'piece' then
      if c.piece_sha256 is not null then
        select p.* into v_piece from public.pieces p
        where p.sha256 = c.piece_sha256 and (p_client is null or p.client_id = p_client)
        order by p.recue_le desc limit 1;
      end if;
      if v_piece.id is null then
        v_motif := case when c.piece_sha256 is null then 'empreinte de la pièce à renseigner' else 'pièce pas encore déposée' end;
      else
        select f.id into v_facture from public.filed_factures f join public.filed_documents d on d.id = f.document_id
        where d.piece_id = v_piece.id;
        if v_facture is null then
          v_motif := 'la pièce n''est pas (encore) une facture FILED';
        else
          select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'resultat', x.resultat, 'gravite', x.gravite)), '[]'::jsonb)
            into v_resultats from public.filed_controles x where x.facture_id = v_facture;
        end if;
      end if;
    elsif c.genre = 'scenario' then
      if p_client is null then
        v_motif := 'scénario : client du banc non donné';
      else
        begin
          v_resultats := private.filed_banc_scenario(p_client, c.scenario);
        exception when others then
          v_motif := left('scénario en erreur : ' || sqlerrm, 300);
        end;
      end if;
    else
      v_motif := coalesce(c.note, 'hors du périmètre des contrôles FILED');
    end if;

    -- Les champs du lecteur.
    for k, v_attendu in select * from jsonb_each(c.champs_attendus) loop
      v_obtenu := null;
      if v_piece.id is not null then
        select pv.valeur into v_obtenu from public.pieces_valeurs pv
        where pv.piece_id = v_piece.id and pv.champ = k order by pv.cree_le desc limit 1;
      end if;
      v_verdict := case when v_piece.id is null then 'non_joue' else private.filed_banc_comparer(k, v_attendu, v_obtenu) end;
      insert into private.filed_banc_verdicts (releve_id, cas_code, source, genre, cle, attendu, obtenu, verdict, motif)
      values (v_releve, c.code, c.source, 'champ', k, v_attendu, v_obtenu, v_verdict,
              case when v_piece.id is null then v_motif end);
    end loop;

    -- Les contrôles FILED.
    for k, v_attendu in select * from jsonb_each(c.controles_attendus) loop
      if v_resultats is null then
        v_verdict := 'non_joue';
        v_obtenu := null;
      else
        v_verdict := private.filed_banc_juger(k, v_attendu, v_resultats);
        select coalesce(jsonb_agg(r), '[]'::jsonb) into v_obtenu from jsonb_array_elements(v_resultats) r
        where case when k like 'famille:%' then split_part(r ->> 'code', '.', 1) = substr(k, 9) else r ->> 'code' = k end;
      end if;
      insert into private.filed_banc_verdicts (releve_id, cas_code, source, genre, cle, attendu, obtenu, verdict, motif)
      values (v_releve, c.code, c.source, 'controle', k, v_attendu, v_obtenu, v_verdict, v_motif);
    end loop;
  end loop;

  update private.filed_banc_releves r
     set nb_cas = (select count(distinct v.cas_code) from private.filed_banc_verdicts v where v.releve_id = v_releve),
         nb_verdicts = (select count(*) from private.filed_banc_verdicts v where v.releve_id = v_releve and v.verdict <> 'non_joue'),
         nb_justes = (select count(*) from private.filed_banc_verdicts v where v.releve_id = v_releve and v.verdict = 'juste')
   where r.id = v_releve;
  return v_releve;
end $$;

-- ─── Le tableau de notes ────────────────────────────────────────────────
-- Une ligne par champ et par contrôle : joués, justes, la note (sur 100) et celle du relevé précédent.
create or replace function private.filed_banc_notes(p_releve bigint default null)
returns table (genre text, cle text, joues int, justes int, non_joues int, note numeric, note_precedente numeric, cas_faux text)
language sql stable security definer set search_path to '' as $$
  with r as (select coalesce(p_releve, (select max(id) from private.filed_banc_releves)) as id),
  p as (select max(x.id) as id from private.filed_banc_releves x, r where x.id < r.id),
  n as (
    select v.releve_id, v.genre, v.cle,
           count(*) filter (where v.verdict <> 'non_joue')::int as joues,
           count(*) filter (where v.verdict = 'juste')::int as justes,
           count(*) filter (where v.verdict = 'non_joue')::int as non_joues,
           string_agg(v.cas_code, ', ' order by v.cas_code) filter (where v.verdict = 'faux') as cas_faux
    from private.filed_banc_verdicts v
    where v.releve_id in ((select id from r), (select id from p))
    group by v.releve_id, v.genre, v.cle)
  select a.genre, a.cle, a.joues, a.justes, a.non_joues,
         case when a.joues > 0 then round(100.0 * a.justes / a.joues, 1) end,
         case when b.joues > 0 then round(100.0 * b.justes / b.joues, 1) end,
         a.cas_faux
  from n a
  left join n b on b.releve_id = (select id from p) and b.genre = a.genre and b.cle = a.cle
  where a.releve_id = (select id from r)
  order by a.genre, a.cle
$$;

revoke all on function private.filed_banc_nombre(jsonb), private.filed_banc_texte(jsonb),
  private.filed_banc_comparer(text, jsonb, jsonb), private.filed_banc_juger(text, jsonb, jsonb),
  private.filed_banc_scenario(uuid, jsonb), private.filed_banc_rejouer(text, uuid), private.filed_banc_notes(bigint)
  from public, anon, authenticated;
grant execute on function private.filed_banc_rejouer(text, uuid), private.filed_banc_notes(bigint) to service_role;
