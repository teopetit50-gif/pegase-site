-- FILED, lot 5a — Archivage à valeur probante et piste d'audit.
--
-- Ce que ce lot pose :
--   filed_archives                      l'empreinte de chaque facture classée (validée), inscrite au journal opposable ;
--   private.filed_archiver(p_facture)   calcule l'empreinte d'archive et l'inscrit ; une par version de facture ;
--   filed_verifier_archive(p_facture)   recalcule et compare : l'archive est intègre, ou non ;
--   filed_piste_audit(p_facture)        reconstitue, dans l'ordre du temps, tout ce qui est arrivé à la facture :
--                                       réception, lectures, contrôles, décisions, imputations, archive, journal.
--
-- L'empreinte d'archive lie le fichier (SHA-256 de la pièce), les valeurs lues (empreinte_donnees), le numéro
-- de réception et la version. Le journal opposable, chaîné, la rend opposable : la modifier après coup casse
-- la chaîne (verifier_journal_client). La table est en ajout seul.
-- Migration idempotente.

create table if not exists public.filed_archives (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  entite_id          uuid references public.entites(id) on delete cascade,
  facture_id         uuid not null references public.filed_factures(id) on delete cascade,
  document_id        uuid not null references public.filed_documents(id) on delete cascade,
  version            integer not null check (version >= 1),
  reference          text,
  empreinte_piece    text,
  empreinte_donnees  text,
  empreinte_archive  text not null check (empreinte_archive ~ '^[0-9a-f]{64}$'),
  journal_id         bigint,
  archive_le         timestamptz not null default now(),
  archive_par        uuid
);
comment on table public.filed_archives is
  'L''empreinte d''archive de chaque facture classée, par version : fichier, valeurs lues, numéro de réception, liés par SHA-256 et inscrits au journal opposable. Ajout seul : rien ne s''y modifie ni ne s''y efface, sauf avec l''objet ou l''organisation.';
create unique index if not exists filed_archives_un on public.filed_archives (facture_id, version);
create index if not exists filed_archives_client on public.filed_archives (client_id, archive_le desc);
create index if not exists filed_archives_document on public.filed_archives (document_id);

alter table public.filed_archives enable row level security;
drop policy if exists filed_archives_lecture on public.filed_archives;
create policy filed_archives_lecture on public.filed_archives for select to authenticated
  using (exists (select 1 from public.filed_documents d where d.id = document_id));
revoke insert, update, delete on public.filed_archives from anon, authenticated;
grant select on public.filed_archives to authenticated;

create or replace function private.filed_archives_immuable() returns trigger
language plpgsql set search_path to '' as $$
begin
  -- La seule écriture permise après coup : le numéro de la ligne du journal, posé une fois.
  if tg_op = 'UPDATE' and old.journal_id is null and new.journal_id is not null
     and to_jsonb(new) - 'journal_id' = to_jsonb(old) - 'journal_id' then
    return new;
  end if;
  raise exception 'Une archive ne se modifie pas et ne s''efface pas.' using errcode = '55000';
end $$;
drop trigger if exists filed_archives_immuable on public.filed_archives;
create trigger filed_archives_immuable before update or delete on public.filed_archives
  for each row execute function private.filed_archives_immuable();

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_archives', 3, 'FILED, lot 5')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_archives', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

-- L'empreinte d'archive : SHA-256 du texte « piece|donnees|reference|version|facture ».
create or replace function private.filed_empreinte_archive(p_piece text, p_donnees text, p_reference text, p_version integer, p_facture uuid)
returns text language sql immutable set search_path to '' as $$
  select encode(extensions.digest(convert_to(
    coalesce(p_piece, '') || '|' || coalesce(p_donnees, '') || '|' || coalesce(p_reference, '') || '|' || p_version::text || '|' || p_facture::text, 'UTF8'), 'sha256'), 'hex')
$$;

-- Archive une facture dans sa version courante ; rend l'archive (existante si déjà faite pour cette version).
create or replace function private.filed_archiver(p_facture uuid)
returns public.filed_archives language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_d public.filed_documents; v_a public.filed_archives; v_emp text; v_j bigint;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  select * into v_a from public.filed_archives where facture_id = v_f.id and version = v_f.version;
  if found then return v_a; end if;
  select * into v_d from public.filed_documents where id = v_f.document_id;
  v_emp := private.filed_empreinte_archive(v_d.sha256, v_f.empreinte_donnees, v_d.reference, v_f.version, v_f.id);
  insert into public.filed_archives (client_id, entite_id, facture_id, document_id, version, reference, empreinte_piece, empreinte_donnees, empreinte_archive, archive_par)
  values (v_f.client_id, v_f.entite_id, v_f.id, v_f.document_id, v_f.version, v_d.reference, v_d.sha256, v_f.empreinte_donnees, v_emp, (select auth.uid()))
  returning * into v_a;
  v_j := private.filed_journaliser(v_f.client_id, 'filed.archive', 'filed_facture', v_f.id::text,
    jsonb_build_object('archive', v_a.id, 'version', v_f.version, 'reference', v_d.reference,
                       'empreinte_piece', v_d.sha256, 'empreinte_donnees', v_f.empreinte_donnees, 'empreinte_archive', v_emp), v_f.entite_id);
  update public.filed_archives set journal_id = v_j where id = v_a.id;
  v_a.journal_id := v_j;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'archivee',
    format('Archivée : empreinte %s… inscrite au journal (ligne %s).', left(v_emp, 12), v_j),
    jsonb_build_object('archive', v_a.id, 'journal', v_j, 'version', v_f.version));
  return v_a;
end $$;
comment on function private.filed_archiver(uuid) is 'Inscrit l''empreinte d''archive de la facture (sa version courante) et l''écrit au journal opposable.';

-- Vérifie l'archive : les empreintes recalculées retrouvent celles inscrites, et le journal les porte.
create or replace function private.filed_verifier_archive(p_facture uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_d public.filed_documents; v_a public.filed_archives; v_emp text; v_j record; v_ok boolean;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  select * into v_a from public.filed_archives where facture_id = v_f.id order by version desc limit 1;
  if not found then return jsonb_build_object('archivee', false, 'integre', null, 'motif', 'Facture pas encore archivée'); end if;
  select * into v_d from public.filed_documents where id = v_f.document_id;
  v_emp := private.filed_empreinte_archive(v_d.sha256, v_f.empreinte_donnees, v_d.reference, v_a.version, v_f.id);
  select j.* into v_j from public.journal_opposable j where j.id = v_a.journal_id;
  v_ok := v_emp = v_a.empreinte_archive
      and v_d.sha256 is not distinct from v_a.empreinte_piece
      and (v_a.version <> v_f.version or v_f.empreinte_donnees is not distinct from v_a.empreinte_donnees)
      and v_j.id is not null and v_j.donnees->>'empreinte_archive' = v_a.empreinte_archive;
  return jsonb_build_object('archivee', true, 'integre', v_ok, 'archive', v_a.id, 'version', v_a.version, 'version_courante', v_f.version,
    'empreinte_archive', v_a.empreinte_archive, 'empreinte_recalculee', v_emp, 'journal', v_a.journal_id,
    'journal_porte_empreinte', v_j.id is not null and v_j.donnees->>'empreinte_archive' = v_a.empreinte_archive,
    'archive_le', v_a.archive_le);
end $$;

create or replace function public.filed_verifier_archive(p_facture uuid)
returns jsonb language sql set search_path to '' as $$ select private.filed_verifier_archive(p_facture) $$;
comment on function public.filed_verifier_archive(uuid) is 'Recalcule l''empreinte d''archive d''une facture et la compare à celle inscrite au journal : intègre, ou non.';
revoke all on function public.filed_verifier_archive(uuid) from public, anon;
grant execute on function public.filed_verifier_archive(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- La piste d'audit d'une facture
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_piste_audit(p_facture uuid)
returns table (survenu_le timestamptz, source text, etape text, message text, acteur text, detail jsonb)
language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  return query
    -- La réception du document
    select d.recu_le, 'document', 'recu', format('Pièce reçue (%s), %s.', coalesce(d.reference, 'sans numéro'), coalesce(d.source, 'source inconnue')), coalesce(d.expediteur, d.depose_par::text, 'FILED'),
           jsonb_build_object('document', d.id, 'reference', d.reference, 'sha256', d.sha256, 'nom_fichier', d.nom_fichier)
      from public.filed_documents d where d.id = v_f.document_id
    union all
    -- L'historique du document et de la facture
    select h.survenu_le, 'historique', h.etape, h.message, coalesce(h.acteur_libelle, h.acteur_type), h.detail
      from public.filed_historique h
     where h.document_id = v_f.document_id or (h.objet_type = 'filed_facture' and h.objet_id = v_f.id::text)
    union all
    -- Les contrôles en vigueur
    select c.cree_le, 'controle', c.code, format('[%s/%s] %s', c.gravite, c.resultat, c.message), 'FILED',
           jsonb_build_object('preuve', c.preuve, 'motif_officiel', c.motif_officiel, 'levee', c.levee_id, 'version', c.version)
      from public.filed_controles c where c.facture_id = v_f.id
    union all
    -- Les demandes de la file et leurs décisions
    select dv.cree_le, 'validation', 'demande.' || dv.type_action, dv.resume, dv.demandeur_type,
           jsonb_build_object('demande', dv.id, 'statut', dv.statut, 'montant', dv.montant)
      from public.demandes_validation dv
     where dv.client_id = v_f.client_id and dv.module = 'filed'
       and ((dv.objet_type = 'filed_facture' and dv.objet_id = v_f.id::text) or (dv.objet_type = 'filed_document' and dv.objet_id = v_f.document_id::text))
    union all
    select (to_jsonb(a)->>'cree_le')::timestamptz, 'validation', 'approbation', coalesce(to_jsonb(a)->>'commentaire', to_jsonb(a)->>'decision', 'décision'), coalesce(to_jsonb(a)->>'decideur_libelle', to_jsonb(a)->>'acteur_libelle', 'personne'),
           to_jsonb(a) - 'id' - 'client_id'
      from public.approbations a
      join public.demandes_validation dv on dv.id = a.demande_id
     where dv.client_id = v_f.client_id and dv.module = 'filed'
       and ((dv.objet_type = 'filed_facture' and dv.objet_id = v_f.id::text) or (dv.objet_type = 'filed_document' and dv.objet_id = v_f.document_id::text))
    union all
    -- Les imputations
    select i.cree_le, 'imputation', i.statut, format('Imputation %s (%s) : compte %s%s, %s HT.', i.statut, i.origine, c.numero, coalesce(', centre ' || k.code, ''), i.montant_ht), coalesce(i.decide_par::text, 'FILED'),
           jsonb_build_object('imputation', i.id, 'compte', c.numero, 'centre', k.code, 'exercice', i.exercice_id, 'mention', i.mention, 'confiance', i.confiance, 'decide_le', i.decide_le)
      from public.filed_imputations i
      join public.filed_plan_comptable c on c.id = i.compte_id
      left join public.filed_centres_cout k on k.id = i.centre_id
     where i.facture_id = v_f.id
    union all
    -- Les archives
    select ar.archive_le, 'archive', 'archivee', format('Archive version %s : empreinte %s.', ar.version, ar.empreinte_archive), coalesce(ar.archive_par::text, 'FILED'),
           jsonb_build_object('archive', ar.id, 'journal', ar.journal_id, 'empreinte_piece', ar.empreinte_piece, 'empreinte_donnees', ar.empreinte_donnees)
      from public.filed_archives ar where ar.facture_id = v_f.id
    union all
    -- Le journal opposable
    select j.survenu_le, 'journal', j.action, format('Journal n° %s : %s.', j.id, j.action), coalesce(j.acteur_libelle, j.acteur_type),
           jsonb_build_object('journal', j.id, 'donnees', j.donnees, 'hash', encode(j.hash, 'hex'))
      from public.journal_opposable j
     where j.client_id = v_f.client_id
       and ((j.objet_type = 'filed_facture' and j.objet_id = v_f.id::text) or (j.objet_type = 'filed_document' and j.objet_id = v_f.document_id::text))
    order by 1, 2;
end $$;

create or replace function public.filed_piste_audit(p_facture uuid)
returns table (survenu_le timestamptz, source text, etape text, message text, acteur text, detail jsonb)
language sql set search_path to '' as $$ select * from private.filed_piste_audit(p_facture) $$;
comment on function public.filed_piste_audit(uuid) is
  'Reconstitue la piste d''audit d''une facture, dans l''ordre du temps : réception, historique, contrôles, demandes et décisions, imputations, archives, lignes du journal opposable.';
revoke all on function public.filed_piste_audit(uuid) from public, anon;
grant execute on function public.filed_piste_audit(uuid) to authenticated, service_role;
