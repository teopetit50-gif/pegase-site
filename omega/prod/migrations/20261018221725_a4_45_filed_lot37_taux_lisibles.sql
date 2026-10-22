-- 20261018221725 a4_45_filed_lot37_taux_lisibles
-- Source : dépôt : 7aff4db omega/migrations/a4_45_filed_lot37_taux_lisibles.sql ; 7aff4db omega/migrations/a4_33_filed_lot25_sortie_et_envois_programmes.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_45_filed_lot37_taux_lisibles.sql @ 7aff4db, a4_33_filed_lot25_sortie_et_envois_programmes.sql @ 7aff4db.
-- ═══ omega/migrations/a4_45_filed_lot37_taux_lisibles.sql @ 7aff4db
-- FILED, lot 37 (a4_45) — les taux de TVA des messages s'écrivent « 19 % », « 5,5 % », et non « 19.000 % ».
--
-- Vu sur la recette après a4_44 (18/10) : filed_factures_tva.taux y est un numeric à trois décimales ; les messages de
-- tva.taux recopiaient le texte brut (« TVA étrangère facturée (19.000 %) »). Les messages passent par trim_scale et la
-- virgule française. Seul le texte affiché change : la clé du contrôle (cle) et la preuve gardent le texte brut, pour
-- que les levées déjà faites restent attachées à leur contrôle.
--
-- Pose « par repère » sur le corps en base (pg_get_functiondef) de private.filed_controler_facture : chaque fragment
-- est remplacé partout où il est, à condition d'y être exactement le nombre de fois attendu ; déjà remplacé, il n'est
-- pas retouché ; sinon la migration s'arrête sans rien poser. Droits inchangés. Aucun DROP, aucune suppression.

do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  for r in select * from (values
    ($o1$array_to_string(v_hors, ' %, ')$o1$,
     $n1$(select string_agg(replace(trim_scale(x::numeric)::text, '.', ','), ' %, ' order by x::numeric) from unnest(v_hors) x)$n1$, 3),
    ($o2$replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')$o2$,
     $n2$replace(trim_scale(v_taux_trouve)::text, '.', ',')$n2$, 2)
  ) t(ancien, nouveau, attendu)
  loop
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n = 0 and position(r.nouveau in v_def) > 0 then
      continue;
    end if;
    if v_n <> r.attendu then
      raise exception 'a4_45 : repère trouvé % fois au lieu de % dans private.filed_controler_facture. Rien n''est posé.', v_n, r.attendu;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_45 : private.filed_controler_facture(uuid) corrigée.';
  else
    raise notice 'a4_45 : private.filed_controler_facture(uuid) déjà corrigée.';
  end if;
end $do$;


-- ═══ omega/migrations/a4_33_filed_lot25_sortie_et_envois_programmes.sql @ 7aff4db
-- FILED, lot 25 (a4_33) — tout récupérer : le dossier de sortie ; et l'envoi comptable à date fixe.
--
-- Promesses du site (lib/produits/factures.ts) : « vous pouvez tout récupérer quand vous voulez » (235, 238), « vous
-- pouvez les récupérer […] à tout moment » (287), « vous repartez avec vos pièces » (294-295) ; « Export mensuel pour
-- la comptabilité » (143) et « un dossier classé dans le format qu'elle utilise déjà, à la date convenue » (275).
--
-- 1. Le dossier de sortie. Un gérant ou un admin le demande (filed_preparer_sortie : toute l'organisation ou une
--    société, une période ou tout). La base en dresse le manifeste, entièrement : chaque fichier reçu tel qu'il est
--    arrivé (chemin Storage, SHA-256, taille), l'index des pièces (index.csv : numéro de réception, fichier, facture,
--    fournisseur, montants, statut, empreinte d'archive), les fournisseurs (fournisseurs.csv), le FEC de chaque
--    société sur la période, les empreintes au format sha256sum (empreintes.sha256) et un LISEZMOI. Le manifeste est
--    découpé en volumes (45 Mo par défaut, sous la limite d'objet de Storage). L'ouvrier « sortie » (fonction Edge,
--    service_role) lit chaque fichier, vérifie son empreinte, écrit chaque volume ZIP dans Storage et le déclare
--    (filed_sortie_volume) ; au dernier volume, le dossier est prêt, une alerte prévient le demandeur. Le lien de
--    téléchargement (filed_sortie_lien) n'est donné qu'au gérant ou à l'admin, journalisé, pendant sept jours.
--    Rien n'est effacé dans FILED par une sortie : la conservation légale (dix ans) ne dépend pas d'elle.
-- 2. L'envoi comptable à date fixe. filed_programmer_envoi(société, format, cadence, jour) : FEC, Pennylane, Sage,
--    Cegid ou QuickBooks, chaque semaine ou chaque mois. Le balayage produit le fichier le jour venu (les écritures
--    nouvelles depuis le dernier envoi, ou la période écoulée), le range dans filed_exports et prévient le
--    destinataire, comme les tableaux du lot 6.
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le dossier de sortie
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_sorties (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  entite_id       uuid references public.entites(id) on delete cascade,
  du              date,
  au              date,
  statut          text not null default 'a_preparer' check (statut in ('a_preparer', 'prete', 'echec', 'expiree')),
  -- [{volume, chemin_zip, chemin, sha256, octets}] pour un fichier reçu ; [{volume, chemin_zip, contenu}] pour un fichier produit.
  manifeste       jsonb not null,
  nb_pieces       integer not null,
  octets_pieces   bigint not null,
  volumes_total   integer not null check (volumes_total >= 1),
  -- Le dossier Storage (bucket omega-clients) où l'ouvrier écrit les volumes.
  chemin_base     text not null,
  -- [{n, chemin, sha256, octets}] : les volumes écrits.
  volumes         jsonb not null default '[]'::jsonb,
  tentatives      integer not null default 0,
  erreur          text,
  demande_par     uuid,
  demande_le      timestamptz not null default now(),
  prete_le        timestamptz,
  expire_le       timestamptz,
  maj_le          timestamptz not null default now()
);
comment on table public.filed_sorties is
  'Lot 25 (a4_33) : les dossiers de sortie d''une organisation — chaque fichier reçu tel qu''il est arrivé, l''index, les fournisseurs, le FEC, les empreintes ; en volumes ZIP écrits par l''ouvrier « sortie ». Téléchargeables sept jours.';
create index if not exists filed_sorties_client on public.filed_sorties (client_id, demande_le desc);
create index if not exists filed_sorties_a_preparer on public.filed_sorties (demande_le) where statut = 'a_preparer';
create unique index if not exists filed_sorties_une_en_cours on public.filed_sorties (client_id) where statut = 'a_preparer';
alter table public.filed_sorties enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_sorties' and policyname = 'filed_sorties_lecture') then
    execute 'create policy filed_sorties_lecture on public.filed_sorties for select to authenticated using (client_id in (select private.mes_clients()) and exists (select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = filed_sorties.client_id and c.role in (''gerant'', ''admin'')))';
  end if;
end $$;
revoke all on table public.filed_sorties from anon, authenticated;
grant select (id, client_id, entite_id, du, au, statut, nb_pieces, octets_pieces, volumes_total, volumes, erreur, demande_par, demande_le, prete_le, expire_le)
  on public.filed_sorties to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_sorties', 1, 'FILED, lot 25')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- Un nom de fichier sûr dans une archive : lettres, chiffres, point, tiret, souligné ; 120 caractères au plus.
create or replace function private.filed_nom_sur(p text)
returns text language sql immutable set search_path to '' as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9._-]+', '_', 'g'), '_.'), 120), ''), 'fichier')
$$;
revoke all on function private.filed_nom_sur(text) from public, anon, authenticated;

create or replace function private.filed_preparer_sortie(p_client uuid, p_du date default null, p_au date default null, p_entite uuid default null,
                                                        p_volume_octets bigint default 45000000)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid; v_id uuid := gen_random_uuid(); v_base text; v_pieces jsonb; v_nb integer; v_octets bigint; v_vol integer;
  v_index text[]; v_four text[]; v_sha text[]; v_produits jsonb := '[]'::jsonb; v_fec jsonb; v_lisez text; r record;
  v_crlf text := chr(13) || chr(10); v_limite bigint;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_du is not null and p_au is not null and p_au < p_du then raise exception 'La période est à l''envers.' using errcode = '22023'; end if;
  if exists (select 1 from public.filed_sorties where client_id = p_client and statut = 'a_preparer') then
    raise exception 'Un dossier de sortie est déjà en préparation pour cette organisation.' using errcode = '55000';
  end if;
  v_limite := greatest(coalesce(p_volume_octets, 45000000), 1);
  v_base := p_client::text || '/filed/sorties/' || v_id::text;

  -- Les fichiers reçus, tels qu'ils sont arrivés, rangés en volumes : un volume se ferme avant de dépasser la limite
  -- (un fichier plus gros que la limite occupe un volume à lui seul) ou 60 000 fichiers.
  v_pieces := '[]'::jsonb; v_nb := 0; v_octets := 0; v_vol := 1;
  declare v_cur bigint := 0; v_dans integer := 0;
  begin
    for r in
      select d.id, d.reference, p.chemin, p.sha256, p.octets,
             'pieces/' || coalesce(d.reference, d.id::text) || '_' || private.filed_nom_sur(coalesce(p.nom_fichier, d.nom_fichier)) as chemin_zip
        from public.filed_documents d join public.pieces p on p.id = d.piece_id
       where d.client_id = p_client
         and (p_entite is null or d.entite_id = p_entite)
         and (p_du is null or d.recu_le >= p_du::timestamptz)
         and (p_au is null or d.recu_le < (p_au + 1)::timestamptz)
         and (v_uid is null or private.voit_objet(p_client, 'filed_document', d.id::text))
       order by d.recu_le, d.id
    loop
      if v_dans > 0 and (v_cur + coalesce(r.octets, 0) > v_limite or v_dans >= 60000) then
        v_vol := v_vol + 1; v_cur := 0; v_dans := 0;
      end if;
      v_pieces := v_pieces || jsonb_build_array(jsonb_build_object('volume', v_vol, 'chemin_zip', r.chemin_zip, 'chemin', r.chemin,
                                                                   'sha256', r.sha256, 'octets', r.octets, 'document', r.id));
      v_cur := v_cur + coalesce(r.octets, 0); v_dans := v_dans + 1;
      v_nb := v_nb + 1; v_octets := v_octets + coalesce(r.octets, 0);
    end loop;
  end;

  -- index.csv
  v_index := array['reference_reception;recu_le;societe;nature;etat;fichier;sha256;numero_facture;fournisseur;siren;tva;date_emission;echeance;devise;montant_ht;montant_tva;montant_ttc;statut_facture;empreinte_archive'];
  for r in
    select d.reference, d.recu_le, e.nom as societe, d.nature, d.etat, p ->> 'chemin_zip' as fichier, p ->> 'sha256' as sha256,
           f.numero, fo.nom as fournisseur, fo.siren, fo.tva, f.date_emission, f.echeance_lue, f.devise, f.montant_ht, f.montant_tva, f.montant_ttc, f.statut,
           (select a.empreinte_archive from public.filed_archives a where a.facture_id = f.id order by a.version desc limit 1) as archive
      from jsonb_array_elements(v_pieces) p
      join public.filed_documents d on d.id = (p ->> 'document')::uuid
      left join public.entites e on e.id = d.entite_id
      left join public.filed_factures f on f.document_id = d.id
      left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
     order by d.recu_le, d.id
  loop
    v_index := v_index || concat_ws(';', private.filed_csv_cellule(r.reference), private.filed_csv_cellule(to_char(r.recu_le at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI')),
      private.filed_csv_cellule(r.societe), private.filed_csv_cellule(r.nature), private.filed_csv_cellule(r.etat), private.filed_csv_cellule(r.fichier),
      private.filed_csv_cellule(r.sha256), private.filed_csv_cellule(r.numero), private.filed_csv_cellule(r.fournisseur), private.filed_csv_cellule(r.siren),
      private.filed_csv_cellule(r.tva), private.filed_csv_cellule(r.date_emission), private.filed_csv_cellule(r.echeance_lue), private.filed_csv_cellule(r.devise),
      private.filed_csv_cellule(r.montant_ht), private.filed_csv_cellule(r.montant_tva), private.filed_csv_cellule(r.montant_ttc), private.filed_csv_cellule(r.statut),
      private.filed_csv_cellule(r.archive));
  end loop;
  v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'index.csv', 'contenu', array_to_string(v_index, v_crlf) || v_crlf));

  -- fournisseurs.csv : tous ceux de l'organisation, avec l'IBAN validé masqué.
  v_four := array['code;nom;siren;siret;tva;identifiant_etranger;pays;statut;iban_valide'];
  for r in
    select fo.code, fo.nom, fo.siren, fo.siret, fo.tva, fo.id_etranger, fo.pays, fo.statut,
           (select string_agg(i.iban_masque, ' ' order by i.decide_le) from public.filed_fournisseurs_ibans i where i.fournisseur_id = fo.id and i.statut = 'valide') as iban
      from public.filed_fournisseurs fo where fo.client_id = p_client order by fo.code
  loop
    v_four := v_four || concat_ws(';', private.filed_csv_cellule(r.code), private.filed_csv_cellule(r.nom), private.filed_csv_cellule(r.siren),
      private.filed_csv_cellule(r.siret), private.filed_csv_cellule(r.tva), private.filed_csv_cellule(r.id_etranger), private.filed_csv_cellule(r.pays),
      private.filed_csv_cellule(r.statut), private.filed_csv_cellule(r.iban));
  end loop;
  v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'fournisseurs.csv', 'contenu', array_to_string(v_four, v_crlf) || v_crlf));

  -- Le FEC de chaque société qui a des écritures sur la période.
  for r in
    select e.id, min(x.ecriture_date) as d1, max(x.ecriture_date) as d2
      from public.entites e join public.filed_ecritures x on x.entite_id = e.id and x.client_id = p_client
     where e.client_id = p_client and (p_entite is null or e.id = p_entite)
       and (p_du is null or x.ecriture_date >= p_du) and (p_au is null or x.ecriture_date <= p_au)
     group by e.id order by e.id
  loop
    begin
      v_fec := private.filed_exporter_fec(p_client, r.id, null, coalesce(p_du, r.d1), coalesce(p_au, r.d2));
      v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'fec/' || private.filed_nom_sur(v_fec ->> 'nom_fichier'),
                                                                       'contenu', v_fec ->> 'contenu'));
    exception when others then
      -- Un FEC impossible (société sans SIREN…) n'empêche pas la sortie des pièces : on le dit dans le dossier.
      v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1,
        'chemin_zip', 'fec/FEC_NON_PRODUIT_' || private.filed_nom_sur((select e.nom from public.entites e where e.id = r.id)) || '.txt',
        'contenu', 'Le FEC de cette société n''a pas pu être produit : ' || sqlerrm || chr(13) || chr(10)));
    end;
  end loop;

  -- Les empreintes, lisibles par sha256sum -c.
  select array_agg((p ->> 'sha256') || '  ' || (p ->> 'chemin_zip') order by rang) into v_sha
    from jsonb_array_elements(v_pieces) with ordinality e(p, rang) where p ->> 'sha256' ~ '^[0-9a-f]{64}$';
  v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'empreintes.sha256',
                                                                   'contenu', coalesce(array_to_string(v_sha, chr(10)) || chr(10), '')));

  v_lisez := concat_ws(v_crlf,
    'Dossier de sortie FILED — ' || coalesce((select c.nom from public.clients c where c.id = p_client), 'organisation'),
    'Préparé le ' || to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI') || ' (heure de Paris).',
    'Période : ' || coalesce(to_char(p_du, 'DD/MM/YYYY'), 'depuis l''origine') || ' — ' || coalesce(to_char(p_au, 'DD/MM/YYYY'), 'à ce jour') || '.',
    'Pièces : ' || v_nb || ' fichier(s), ' || v_octets || ' octets, en ' || v_vol || ' volume(s).',
    '',
    'pieces/            chaque fichier tel qu''il a été reçu, nommé par son numéro de réception',
    'index.csv          une ligne par pièce : réception, facture, fournisseur, montants, statut, empreinte d''archive',
    'fournisseurs.csv   les fournisseurs de l''organisation',
    'fec/               le fichier des écritures comptables de chaque société (A. 47 A-1 du LPF)',
    'empreintes.sha256  le SHA-256 de chaque pièce : « sha256sum -c empreintes.sha256 » les vérifie toutes',
    '',
    'Les fichiers CSV sont en UTF-8, séparés par des points-virgules, la virgule pour décimale.',
    'Ce dossier est une copie : vos pièces restent conservées dans FILED pendant la durée légale.') || v_crlf;
  v_produits := v_produits || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'LISEZMOI.txt', 'contenu', v_lisez));

  insert into public.filed_sorties (id, client_id, entite_id, du, au, manifeste, nb_pieces, octets_pieces, volumes_total, chemin_base, demande_par)
  values (v_id, p_client, p_entite, p_du, p_au, v_produits || v_pieces, v_nb, v_octets, v_vol, v_base, v_uid);
  perform private.filed_journaliser(p_client, 'filed.sortie.demande', 'filed_sortie', v_id::text,
    jsonb_build_object('du', p_du, 'au', p_au, 'pieces', v_nb, 'octets', v_octets, 'volumes', v_vol), p_entite);
  return v_id;
end $$;
comment on function private.filed_preparer_sortie(uuid, date, date, uuid, bigint) is
  'Lot 25 (a4_33) : dresse le manifeste d''un dossier de sortie (fichiers reçus, index, fournisseurs, FEC, empreintes, LISEZMOI), découpé en volumes.';
revoke all on function private.filed_preparer_sortie(uuid, date, date, uuid, bigint) from public, anon;
grant execute on function private.filed_preparer_sortie(uuid, date, date, uuid, bigint) to authenticated, service_role;

create or replace function public.filed_preparer_sortie(p_client uuid, p_du date default null, p_au date default null, p_entite uuid default null)
returns uuid language sql set search_path to '' as $$ select private.filed_preparer_sortie(p_client, p_du, p_au, p_entite) $$;
comment on function public.filed_preparer_sortie(uuid, date, date, uuid) is
  'Demande le dossier de sortie : chaque fichier reçu tel qu''il est arrivé, l''index, les fournisseurs, le FEC, les empreintes. Toute l''organisation ou une société, une période ou tout. Gérant ou admin ; prêt quand l''alerte arrive.';
revoke all on function public.filed_preparer_sortie(uuid, date, date, uuid) from public, anon;
grant execute on function public.filed_preparer_sortie(uuid, date, date, uuid) to authenticated, service_role;

-- Porte de l'ouvrier : les dossiers à préparer, un à la fois, avec leur manifeste et les volumes déjà écrits.
create or replace function public.filed_sorties_a_preparer(p_limite integer default 1)
returns setof jsonb language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_sorties;
begin
  for v_s in
    select * from public.filed_sorties where statut = 'a_preparer' order by demande_le limit greatest(coalesce(p_limite, 1), 1) for update skip locked
  loop
    update public.filed_sorties set tentatives = tentatives + 1, maj_le = now() where id = v_s.id;
    return next jsonb_build_object('id', v_s.id, 'client', v_s.client_id, 'chemin_base', v_s.chemin_base, 'volumes_total', v_s.volumes_total,
      'faits', coalesce((select jsonb_agg((v ->> 'n')::int) from jsonb_array_elements(v_s.volumes) v), '[]'::jsonb), 'manifeste', v_s.manifeste);
  end loop;
end $$;
comment on function public.filed_sorties_a_preparer(integer) is 'Ouvrier « sortie » (service_role) : les dossiers de sortie à préparer, avec leur manifeste.';
revoke all on function public.filed_sorties_a_preparer(integer) from public, anon, authenticated;
grant execute on function public.filed_sorties_a_preparer(integer) to service_role;

-- Porte de l'ouvrier : un volume est écrit. Au dernier, le dossier est prêt et le demandeur prévenu.
create or replace function public.filed_sortie_volume(p_sortie uuid, p_n integer, p_chemin text, p_sha256 text, p_octets bigint)
returns text language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_sorties; v_faits integer;
begin
  select * into v_s from public.filed_sorties where id = p_sortie for update;
  if not found then raise exception 'Dossier de sortie introuvable.' using errcode = 'P0002'; end if;
  if v_s.statut <> 'a_preparer' then return v_s.statut; end if;
  if p_n is null or p_n not between 1 and v_s.volumes_total then raise exception 'Volume hors du dossier : %.', p_n using errcode = '22023'; end if;
  if p_chemin is null or left(p_chemin, char_length(v_s.chemin_base) + 1) <> v_s.chemin_base || '/' or p_chemin ~ '\.\.' then
    raise exception 'Chemin hors du dossier de sortie.' using errcode = '22023';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or coalesce(p_octets, 0) <= 0 then raise exception 'Empreinte ou taille invalide.' using errcode = '22023'; end if;
  if not exists (select 1 from jsonb_array_elements(v_s.volumes) v where (v ->> 'n')::int = p_n) then
    update public.filed_sorties
       set volumes = volumes || jsonb_build_array(jsonb_build_object('n', p_n, 'chemin', p_chemin, 'sha256', p_sha256, 'octets', p_octets)),
           erreur = null, maj_le = now()
     where id = p_sortie;
  end if;
  select jsonb_array_length(volumes) into v_faits from public.filed_sorties where id = p_sortie;
  if v_faits < v_s.volumes_total then return 'a_preparer'; end if;
  update public.filed_sorties set statut = 'prete', prete_le = now(), expire_le = now() + interval '7 days', maj_le = now() where id = p_sortie;
  perform private.filed_journaliser(v_s.client_id, 'filed.sortie.prete', 'filed_sortie', p_sortie::text,
    jsonb_build_object('volumes', (select volumes from public.filed_sorties where id = p_sortie), 'pieces', v_s.nb_pieces), v_s.entite_id);
  perform private.lever_alerte_module(v_s.client_id, 'filed', 'info',
    left(format('Votre dossier de sortie est prêt : %s pièce(s), %s volume(s). Téléchargeable sept jours.', v_s.nb_pieces, v_s.volumes_total), 200),
    jsonb_build_object('sortie', p_sortie, 'action', 'telecharger_sortie'), 'sortie:' || p_sortie::text, true, v_s.demande_par);
  return 'prete';
end $$;
comment on function public.filed_sortie_volume(uuid, integer, text, text, bigint) is 'Ouvrier « sortie » (service_role) : déclare un volume écrit ; au dernier, le dossier est prêt.';
revoke all on function public.filed_sortie_volume(uuid, integer, text, text, bigint) from public, anon, authenticated;
grant execute on function public.filed_sortie_volume(uuid, integer, text, text, bigint) to service_role;

-- Porte de l'ouvrier : la préparation a échoué (fichier absent, empreinte différente…). Trois essais, puis échec et alerte.
create or replace function public.filed_sortie_echec(p_sortie uuid, p_erreur text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_sorties;
begin
  select * into v_s from public.filed_sorties where id = p_sortie for update;
  if not found then raise exception 'Dossier de sortie introuvable.' using errcode = 'P0002'; end if;
  if v_s.statut <> 'a_preparer' then return v_s.statut; end if;
  if v_s.tentatives < 3 then
    update public.filed_sorties set erreur = left(p_erreur, 500), maj_le = now() where id = p_sortie;
    return 'a_preparer';
  end if;
  update public.filed_sorties set statut = 'echec', erreur = left(p_erreur, 500), maj_le = now() where id = p_sortie;
  perform private.filed_journaliser(v_s.client_id, 'filed.sortie.echec', 'filed_sortie', p_sortie::text, jsonb_build_object('erreur', left(p_erreur, 500)), v_s.entite_id);
  perform private.lever_alerte_module(v_s.client_id, 'filed', 'attention',
    left('Le dossier de sortie n''a pas pu être préparé : ' || coalesce(p_erreur, 'erreur inconnue'), 200),
    jsonb_build_object('sortie', p_sortie, 'erreur', left(p_erreur, 500)), 'sortie:' || p_sortie::text, true, v_s.demande_par);
  perform private.lever_alerte_module(v_s.client_id, 'filed', 'attention',
    left('Dossier de sortie en échec : ' || coalesce(p_erreur, 'erreur inconnue'), 200),
    jsonb_build_object('sortie', p_sortie), 'sortie_interne:' || p_sortie::text, false, null);
  return 'echec';
end $$;
comment on function public.filed_sortie_echec(uuid, text) is 'Ouvrier « sortie » (service_role) : la préparation a échoué ; au troisième essai, le dossier passe en échec et l''on prévient.';
revoke all on function public.filed_sortie_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.filed_sortie_echec(uuid, text) to service_role;

-- Les volumes à signer pour un téléchargement : gérant ou admin, dossier prêt et pas expiré ; journalisé.
create or replace function private.filed_sortie_lien(p_sortie uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_sorties;
begin
  select * into v_s from public.filed_sorties where id = p_sortie;
  if not found then raise exception 'Dossier de sortie introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_s.client_id, array['gerant', 'admin'], v_s.entite_id);
  if v_s.statut <> 'prete' or v_s.expire_le <= now() then
    raise exception 'Ce dossier de sortie n''est pas téléchargeable (%).', case when v_s.statut = 'prete' then 'expiré' else v_s.statut end using errcode = '55000';
  end if;
  perform private.filed_journaliser(v_s.client_id, 'filed.sortie.telechargement', 'filed_sortie', p_sortie::text, '{}'::jsonb, v_s.entite_id);
  return jsonb_build_object('sortie', p_sortie, 'expire_le', v_s.expire_le,
    'volumes', (select jsonb_agg(v order by (v ->> 'n')::int) from jsonb_array_elements(v_s.volumes) v));
end $$;
revoke all on function private.filed_sortie_lien(uuid) from public, anon;
grant execute on function private.filed_sortie_lien(uuid) to authenticated, service_role;

create or replace function public.filed_sortie_lien(p_sortie uuid)
returns jsonb language sql set search_path to '' as $$ select private.filed_sortie_lien(p_sortie) $$;
comment on function public.filed_sortie_lien(uuid) is 'Les volumes d''un dossier de sortie prêt, à signer par l''ouvrier « sortie » pour le téléchargement. Gérant ou admin, sept jours ; journalisé.';
revoke all on function public.filed_sortie_lien(uuid) from public, anon;
grant execute on function public.filed_sortie_lien(uuid) to authenticated, service_role;

-- Porte de l'ouvrier : les dossiers expirés, dont il retire les volumes de Storage. Ils passent « expiree ».
create or replace function public.filed_sorties_expirees(p_limite integer default 50)
returns setof jsonb language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_sorties;
begin
  for v_s in
    select * from public.filed_sorties where statut = 'prete' and expire_le <= now() order by expire_le limit greatest(coalesce(p_limite, 50), 1) for update skip locked
  loop
    update public.filed_sorties set statut = 'expiree', maj_le = now() where id = v_s.id;
    return next jsonb_build_object('id', v_s.id, 'chemins', coalesce((select jsonb_agg(v ->> 'chemin') from jsonb_array_elements(v_s.volumes) v), '[]'::jsonb));
  end loop;
end $$;
comment on function public.filed_sorties_expirees(integer) is 'Ouvrier « sortie » (service_role) : les dossiers expirés et les chemins de leurs volumes, à retirer de Storage.';
revoke all on function public.filed_sorties_expirees(integer) from public, anon, authenticated;
grant execute on function public.filed_sorties_expirees(integer) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. L'envoi comptable à date fixe
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_envois_programmes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  entite_id     uuid not null references public.entites(id) on delete cascade,
  format        text not null check (format in ('fec', 'pennylane', 'sage', 'cegid', 'quickbooks')),
  -- nouvelles : les écritures nouvelles depuis le dernier envoi (curseur du lot 17) ; periode : la semaine ou le mois écoulé.
  mode          text not null default 'nouvelles' check (mode in ('nouvelles', 'periode')),
  cadence       text not null check (cadence in ('hebdomadaire', 'mensuelle')),
  jour          smallint not null check (jour between 1 and 28),
  destinataire  uuid,
  actif         boolean not null default true,
  prochain_le   date not null,
  dernier_le    date,
  cree_par      uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now(),
  constraint filed_envois_programmes_fec_periode check (format <> 'fec' or mode = 'periode')
);
comment on table public.filed_envois_programmes is
  'Lot 25 (a4_33) : les envois comptables à date fixe d''une société (FEC, Pennylane, Sage, Cegid, QuickBooks). Le balayage les produit le jour venu dans filed_exports.';
create index if not exists filed_envois_programmes_a_faire on public.filed_envois_programmes (prochain_le) where actif;
alter table public.filed_envois_programmes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_envois_programmes' and policyname = 'filed_envois_programmes_lecture') then
    execute 'create policy filed_envois_programmes_lecture on public.filed_envois_programmes for select to authenticated using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id))';
  end if;
end $$;
revoke all on table public.filed_envois_programmes from anon, authenticated;
grant select on public.filed_envois_programmes to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_envois_programmes', 2, 'FILED, lot 25')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

create or replace function private.filed_programmer_envoi(p_client uuid, p_entite uuid, p_format text, p_cadence text, p_jour integer,
                                                         p_mode text default null, p_destinataire uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_id uuid; v_mode text;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if not exists (select 1 from public.entites e where e.id = p_entite and e.client_id = p_client) then
    raise exception 'Société introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if p_format is null or p_format not in ('fec', 'pennylane', 'sage', 'cegid', 'quickbooks') then
    raise exception 'Format inconnu : fec, pennylane, sage, cegid ou quickbooks.' using errcode = '22023';
  end if;
  v_mode := coalesce(p_mode, case when p_format = 'fec' then 'periode' else 'nouvelles' end);
  if v_mode not in ('nouvelles', 'periode') then raise exception 'Mode inconnu : nouvelles ou periode.' using errcode = '22023'; end if;
  if p_format = 'fec' and v_mode <> 'periode' then raise exception 'Le FEC se produit sur une période.' using errcode = '22023'; end if;
  if p_cadence not in ('hebdomadaire', 'mensuelle') or p_cadence is null then raise exception 'Cadence inconnue : %.', coalesce(p_cadence, 'vide') using errcode = '22023'; end if;
  if p_cadence = 'hebdomadaire' and p_jour not between 1 and 7 then raise exception 'Le jour d''un envoi hebdomadaire va de 1 (lundi) à 7.' using errcode = '22023'; end if;
  if p_cadence = 'mensuelle' and p_jour not between 1 and 28 then raise exception 'Le jour d''un envoi mensuel va de 1 à 28.' using errcode = '22023'; end if;
  insert into public.filed_envois_programmes (client_id, entite_id, format, mode, cadence, jour, destinataire, prochain_le, cree_par)
  values (p_client, p_entite, p_format, v_mode, p_cadence, p_jour, coalesce(p_destinataire, v_uid),
          private.filed_prochain_export(p_cadence, p_jour, current_date), v_uid)
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.envoi.programme', 'filed_envoi_programme', v_id::text,
    jsonb_build_object('format', p_format, 'mode', v_mode, 'cadence', p_cadence, 'jour', p_jour), p_entite);
  return v_id;
end $$;
revoke all on function private.filed_programmer_envoi(uuid, uuid, text, text, integer, text, uuid) from public, anon;
grant execute on function private.filed_programmer_envoi(uuid, uuid, text, text, integer, text, uuid) to authenticated, service_role;

create or replace function public.filed_programmer_envoi(p_client uuid, p_entite uuid, p_format text, p_cadence text, p_jour integer,
                                                        p_mode text default null, p_destinataire uuid default null)
returns uuid language sql set search_path to '' as $$ select private.filed_programmer_envoi(p_client, p_entite, p_format, p_cadence, p_jour, p_mode, p_destinataire) $$;
comment on function public.filed_programmer_envoi(uuid, uuid, text, text, integer, text, uuid) is
  'Programme l''envoi comptable d''une société à date fixe : format (fec, pennylane, sage, cegid, quickbooks), cadence (hebdomadaire, mensuelle), jour ; mode nouvelles (depuis le dernier envoi) ou periode. Gérant ou admin.';
revoke all on function public.filed_programmer_envoi(uuid, uuid, text, text, integer, text, uuid) from public, anon;
grant execute on function public.filed_programmer_envoi(uuid, uuid, text, text, integer, text, uuid) to authenticated, service_role;

create or replace function private.filed_arreter_envoi(p_programme uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_envois_programmes;
begin
  select * into v_p from public.filed_envois_programmes where id = p_programme for update;
  if not found then raise exception 'Envoi programmé introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_p.client_id, array['gerant', 'admin'], v_p.entite_id);
  update public.filed_envois_programmes set actif = false, maj_le = now() where id = p_programme;
  perform private.filed_journaliser(v_p.client_id, 'filed.envoi.arret', 'filed_envoi_programme', v_p.id::text, '{}'::jsonb, v_p.entite_id);
end $$;
revoke all on function private.filed_arreter_envoi(uuid) from public, anon;
grant execute on function private.filed_arreter_envoi(uuid) to authenticated, service_role;

create or replace function public.filed_arreter_envoi(p_programme uuid)
returns void language sql set search_path to '' as $$ select private.filed_arreter_envoi(p_programme) $$;
comment on function public.filed_arreter_envoi(uuid) is 'Arrête un envoi comptable programmé.';
revoke all on function public.filed_arreter_envoi(uuid) from public, anon;
grant execute on function public.filed_arreter_envoi(uuid) to authenticated, service_role;

-- Produit les envois du jour (appelé par filed_produire_exports, donc par le balayage, en service_role).
create or replace function private.filed_produire_envois(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_envois_programmes; v_du date; v_au date; v_r jsonb; v_f jsonb; v_id uuid; v_n integer := 0; v_fichiers integer;
begin
  for v_p in select * from public.filed_envois_programmes where actif and prochain_le <= p_aujourdhui order by prochain_le loop
    begin
      if v_p.cadence = 'hebdomadaire' then v_du := p_aujourdhui - 7;
      else v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_au := p_aujourdhui - 1;
      if v_p.format = 'fec' then
        v_r := private.filed_exporter_fec(v_p.client_id, v_p.entite_id, null, v_du, v_au);
        v_r := jsonb_build_object('fichiers', jsonb_build_array(jsonb_build_object('nom_fichier', v_r ->> 'nom_fichier', 'contenu', v_r ->> 'contenu')),
                                  'lignes', v_r -> 'lignes', 'ecritures', v_r -> 'ecritures');
      elsif v_p.mode = 'periode' then
        v_r := private.filed_exporter_ecritures(v_p.client_id, v_p.entite_id, v_p.format, null, v_du, v_au);
      else
        v_r := private.filed_exporter_ecritures(v_p.client_id, v_p.entite_id, v_p.format, null, null, null);
      end if;
      v_fichiers := 0;
      -- Pas d'écriture : pas de fichier vide, l'alerte le dit.
      for v_f in select * from jsonb_array_elements(case when coalesce((v_r ->> 'ecritures')::int, 0) > 0 then v_r -> 'fichiers' else '[]'::jsonb end) loop
        insert into public.filed_exports (client_id, entite_id, programme_id, tableau, du, au, nb_lignes, sha256, contenu)
        values (v_p.client_id, v_p.entite_id, null, 'compta.' || v_p.format || ':' || coalesce(v_f ->> 'nom_fichier', 'fichier'),
                case when v_p.mode = 'periode' then v_du end, v_au,
                greatest(0, array_length(string_to_array(v_f ->> 'contenu', chr(13) || chr(10)), 1) - 1),
                encode(extensions.digest(convert_to(coalesce(v_f ->> 'contenu', ''), 'UTF8'), 'sha256'), 'hex'), v_f ->> 'contenu')
        returning id into v_id;
        v_fichiers := v_fichiers + 1;
      end loop;
      update public.filed_envois_programmes set dernier_le = p_aujourdhui, prochain_le = private.filed_prochain_export(cadence, jour, p_aujourdhui), maj_le = now()
       where id = v_p.id;
      perform private.lever_alerte_module(v_p.client_id, 'filed', 'info',
        left(case when v_fichiers = 0 then format('Envoi comptable %s : aucune écriture %s.', v_p.format, case when v_p.mode = 'periode' then 'sur la période' else 'nouvelle depuis le dernier envoi' end)
                  else format('Envoi comptable prêt : %s, %s fichier(s) (%s au %s).', v_p.format, v_fichiers,
                              coalesce(to_char(case when v_p.mode = 'periode' then v_du end, 'DD/MM/YYYY'), 'dernier envoi'), to_char(v_au, 'DD/MM/YYYY')) end, 200),
        jsonb_build_object('programme', v_p.id, 'format', v_p.format, 'fichiers', v_fichiers, 'export', v_id),
        'envoi:' || v_p.id::text || ':' || p_aujourdhui::text, true, v_p.destinataire);
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : envoi programmé % non produit (%)', v_p.id, sqlerrm;
      update public.filed_envois_programmes set prochain_le = p_aujourdhui + 1, maj_le = now() where id = v_p.id;
    end;
  end loop;
  return v_n;
end $$;
revoke all on function private.filed_produire_envois(date) from public, anon, authenticated;

-- Le balayage des exports du lot 6 produit aussi les envois comptables (texte de a4_06, une ligne ajoutée).
create or replace function private.filed_produire_exports(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_exports_programmes; v_csv text; v_du date; v_au date; v_id uuid; v_n integer := 0;
begin
  for v_p in select * from public.filed_exports_programmes where actif and prochain_le <= p_aujourdhui order by prochain_le loop
    begin
      if v_p.cadence = 'hebdomadaire' then v_du := p_aujourdhui - 7; else v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_au := p_aujourdhui - 1;
      if v_p.tableau = 'engage' then v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_csv := private.filed_exporter_tableau(v_p.client_id, v_p.tableau, v_du, v_au, v_p.entite_id);
      insert into public.filed_exports (client_id, entite_id, programme_id, tableau, du, au, nb_lignes, sha256, contenu)
      values (v_p.client_id, v_p.entite_id, v_p.id, v_p.tableau, v_du, v_au, greatest(0, array_length(string_to_array(v_csv, E'\r\n'), 1) - 2),
              encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex'), v_csv)
      returning id into v_id;
      update public.filed_exports_programmes set dernier_le = p_aujourdhui, prochain_le = private.filed_prochain_export(cadence, jour, p_aujourdhui), maj_le = now() where id = v_p.id;
      perform private.lever_alerte_module(v_p.client_id, 'filed', 'info',
        left(format('Export prêt : %s (%s au %s)', v_p.tableau, to_char(v_du, 'DD/MM/YYYY'), to_char(v_au, 'DD/MM/YYYY')), 200),
        jsonb_build_object('export', v_id, 'programme', v_p.id, 'tableau', v_p.tableau),
        'export:' || v_id::text, true, v_p.destinataire);
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : export programmé % non produit (%)', v_p.id, sqlerrm;
      update public.filed_exports_programmes set prochain_le = p_aujourdhui + 1, maj_le = now() where id = v_p.id;
    end;
  end loop;
  v_n := v_n + private.filed_produire_envois(p_aujourdhui);
  update public.filed_exports set contenu = null, purge_le = now() where contenu is not null and genere_le < now() - interval '90 days';
  return v_n;
end $$;
