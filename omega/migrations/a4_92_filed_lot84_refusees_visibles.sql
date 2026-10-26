-- a4_92 (FILED lot 84) : TMOD-01 — une facture refusée reste visible, avec son motif, et après « reprise impossible »
-- une personne peut la classer sans suite.
--
-- Avant : une facture refusée ne figurait dans aucune catégorie des pièces en cours (ni pendant les 24 h où elle se
-- corrige pour sa reprise, ni après) ; après « reprise impossible », correction et levée d'anomalie étaient refusées et
-- aucun geste ne la reprenait, alors que le motif disait « une personne la reprend ».
--
-- Décision prudente (Teo absent, 26/10) : la sortie après « reprise impossible » est le CLASSEMENT SANS SUITE, tracé
-- (motif obligatoire, par une personne : gérant, admin ou valideur), et la NOUVELLE SAISIE de la facture rectificative
-- comme une nouvelle pièce (déjà possible). Pas de réouverture de la facture refusée : un refus est une décision
-- humaine ; une pièce refusée ne revient au circuit de paiement que par la reprise (24 h, une fois), sinon par une
-- nouvelle pièce, contrôlée de zéro (doublons compris).
--
--   · private.filed_classements : la facture refusée classée sans suite (quand, par qui, pourquoi). Rien n'est effacé ;
--     la facture garde son statut « refusee ».
--   · public.filed_classer_refusee(facture, motif) : classe sans suite. Si la reprise est encore « à faire », elle
--     devient « impossible » (« Classée sans suite par une personne »). Historique et journal.
--   · public.filed_factures_refusees(client, entité, avec_classees) : la liste des refusées, avec le motif du refus,
--     l'état de la reprise, la date limite de correction et le geste qui reste.
--   · filed_pieces_en_cours : nouvelle catégorie « Refusées, à reprendre ou à classer » (refusées non classées).
--   · Les motifs de « reprise impossible » disent le geste : « à classer sans suite, ou à redéposer en facture
--     rectificative » ; celui du délai dit « dans les 24 h ».
-- Deux repères dans filed_traiter_reprises ; la pose s'arrête si l'un n'est pas trouvé une fois. Rejouable ; aucune
-- suppression.

create table if not exists private.filed_classements (
  facture_id uuid primary key references public.filed_factures(id) on delete cascade,
  client_id  uuid not null,
  classee_le timestamptz not null default now(),
  classee_par uuid not null,
  motif      text not null check (length(btrim(motif)) between 5 and 500)
);
comment on table private.filed_classements is 'a4_92 : une facture refusée classée sans suite par une personne (rien n''est effacé).';
revoke all on table private.filed_classements from public, anon, authenticated;
grant select on table private.filed_classements to service_role;

-- La dernière reprise FILED d'une facture (toute issue), avec la demande refusée qui l'a ouverte.
create or replace function private.filed_derniere_reprise(p_facture uuid)
returns private.reprises language sql stable security definer set search_path to '' as $$
  select r.* from private.reprises r join public.demandes_validation d on d.id = r.demande_id
   where r.module = 'filed' and d.objet_type = 'filed_facture' and d.objet_id = p_facture::text
   order by r.cree_le desc limit 1
$$;

create or replace function private.filed_classer_refusee(p_facture uuid, p_motif text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; r private.reprises; v_uid uuid := (select auth.uid());
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if v_f.id is null then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if v_uid is null then
    raise exception 'Une facture se classe sans suite par une personne.' using errcode = '42501';
  end if;
  if not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if v_f.statut <> 'refusee' then
    raise exception 'Seule une facture refusée se classe sans suite (celle-ci est %).', v_f.statut using errcode = '55000';
  end if;
  if exists (select 1 from private.filed_classements c where c.facture_id = v_f.id) then
    raise exception 'Cette facture est déjà classée sans suite.' using errcode = '55000';
  end if;
  if length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Un classement sans suite se motive (5 caractères au moins).' using errcode = '22023';
  end if;
  insert into private.filed_classements (facture_id, client_id, classee_par, motif)
  values (v_f.id, v_f.client_id, v_uid, left(btrim(p_motif), 500));
  r := private.filed_reprise_ouverte(v_f.id);
  if r.demande_id is not null then
    perform private.reprise_impossible(r.demande_id, 'Classée sans suite par une personne.');
  end if;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'classee_sans_suite',
    'Classée sans suite : ' || left(btrim(p_motif), 300), jsonb_build_object('reprise_close', r.demande_id));
  perform private.filed_journaliser(v_f.client_id, 'filed.classement', 'filed_facture', v_f.id::text,
    jsonb_build_object('motif', left(btrim(p_motif), 300)), v_f.entite_id);
  return 'classee_sans_suite';
end $$;

create or replace function public.filed_classer_refusee(p_facture uuid, p_motif text)
returns text language sql set search_path to '' as $$ select private.filed_classer_refusee(p_facture, p_motif) $$;
comment on function public.filed_classer_refusee(uuid, text) is
  'Classe sans suite une facture refusée (motif obligatoire, par un gérant, un admin ou un valideur). Rien n''est effacé.';

create or replace function private.filed_factures_refusees(p_client uuid, p_entite uuid default null, p_avec_classees boolean default false)
returns table (facture_id uuid, reference text, numero text, fournisseur text, montant_ttc numeric, refusee_le timestamptz,
               motif text, reprise text, reprise_motif text, corriger_avant timestamptz, classee_le timestamptz,
               classee_motif text, geste text)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (select * from private.filed_factures_visibles(p_client, p_entite) x where x.statut = 'refusee'),
    l as (
      select f.id, d.reference, f.numero, fo.nom as fournisseur, f.montant_ttc,
             (select max(h.survenu_le) from public.filed_historique h
               where h.document_id = f.document_id and h.etape = 'refusee' and h.objet_type = 'filed_facture') as refusee_le,
             (select a.texte from public.filed_factures_annexes a where a.facture_id = f.id and a.nature = 'motif_refus'
               order by a.cree_le desc limit 1) as motif,
             rp.statut as reprise, rp.motif as reprise_motif,
             case when rp.statut = 'a_faire' then rp.cree_le + interval '24 hours' end as corriger_avant,
             c.classee_le, c.motif as classee_motif
        from f
        join public.filed_documents d on d.id = f.document_id
        left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
        left join private.filed_classements c on c.facture_id = f.id
        left join lateral (select * from private.filed_derniere_reprise(f.id)) rp on true
       where p_avec_classees or c.facture_id is null)
    select l.id, l.reference, l.numero, l.fournisseur, l.montant_ttc, l.refusee_le, coalesce(l.motif, 'Refusée sans motif écrit.'),
           coalesce(l.reprise, 'aucune'), l.reprise_motif, l.corriger_avant, l.classee_le, l.classee_motif,
           case when l.classee_le is not null then 'Classée sans suite.'
                when l.reprise = 'a_faire' then 'À corriger pour sa reprise avant l''heure limite, sinon à classer sans suite.'
                else 'À classer sans suite, ou à redéposer en facture rectificative.' end
      from l order by l.refusee_le desc nulls last;
end $$;

create or replace function public.filed_factures_refusees(p_client uuid, p_entite uuid default null, p_avec_classees boolean default false)
returns table (facture_id uuid, reference text, numero text, fournisseur text, montant_ttc numeric, refusee_le timestamptz,
               motif text, reprise text, reprise_motif text, corriger_avant timestamptz, classee_le timestamptz,
               classee_motif text, geste text)
language sql set search_path to '' as $$ select * from private.filed_factures_refusees(p_client, p_entite, p_avec_classees) $$;
comment on function public.filed_factures_refusees(uuid, uuid, boolean) is
  'Les factures refusées, avec le motif du refus, l''état de la reprise, la date limite de correction et le geste qui reste.';

revoke all on function private.filed_derniere_reprise(uuid) from public, anon, authenticated;
revoke all on function private.filed_classer_refusee(uuid, text) from public, anon, authenticated;
revoke all on function private.filed_factures_refusees(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.filed_classer_refusee(uuid, text) from public, anon;
revoke all on function public.filed_factures_refusees(uuid, uuid, boolean) from public, anon;
grant execute on function private.filed_classer_refusee(uuid, text) to authenticated, service_role;
grant execute on function private.filed_factures_refusees(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.filed_classer_refusee(uuid, text) to authenticated, service_role;
grant execute on function public.filed_factures_refusees(uuid, uuid, boolean) to authenticated, service_role;

-- Les pièces en cours : les refusées non classées ont leur catégorie (a4_88 gardé : une facture, une catégorie).
create or replace function private.filed_pieces_en_cours(p_client uuid, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ttc numeric)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (select * from private.filed_factures_visibles(p_client, p_entite)),
    c as (
      select 'bloquees' as categorie, 'Bloquées par un contrôle' as libelle, 1 as rang, f.id, f.montant_ttc from f where f.statut = 'bloquee'
      union all
      select 'litige', 'En litige avec le fournisseur', 2, f.id, f.montant_ttc from f where exists (select 1 from public.filed_litiges l where l.facture_id = f.id and l.clos_le is null)
      union all
      select 'attente', 'En attente d''approbation', 3, f.id, f.montant_ttc from f where f.statut = 'a_valider'
      union all
      select 'a_completer', 'À compléter (lecture incomplète)', 4, f.id, f.montant_ttc from f where f.statut = 'a_completer'
      union all
      select 'refusees', 'Refusées, à reprendre ou à classer', 5, f.id, f.montant_ttc from f   -- a4_92
       where f.statut = 'refusee' and not exists (select 1 from private.filed_classements k where k.facture_id = f.id)
      union all
      select 'imputation', 'Imputation proposée, à valider', 6, f.id, f.montant_ttc from f
       where f.statut not in ('refusee', 'ecartee')
         and exists (select 1 from public.filed_imputations i where i.facture_id = f.id and i.statut = 'proposee')
    ),
    u as (select distinct on (c.id) c.* from c order by c.id, c.rang)   -- a4_88 : une facture, une catégorie
    select u.categorie, u.libelle, count(*), round(coalesce(sum(u.montant_ttc), 0), 2) from u group by u.categorie, u.libelle, u.rang order by u.rang;
end $$;

comment on function public.filed_pieces_en_cours(uuid, uuid) is 'Les pièces en cours, comptées à l''instant, chacune une fois : bloquées, en litige, en attente d''approbation, à compléter, refusées à reprendre ou à classer, imputation à valider.';

-- Les motifs de « reprise impossible » disent le geste qui reste.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter_reprises(interval)'::regprocedure);
  v_a constant text := ': une personne la reprend.''';
  v_b constant text := '''Aucune correction de la facture depuis le refus : même résultat qu''''avant.''';
  v_na int; v_nb int;
begin
  if position('à redéposer en facture rectificative' in v_def) > 0 then return; end if;
  v_na := (length(v_def) - length(replace(v_def, v_a, ''))) / length(v_a);
  v_nb := (length(v_def) - length(replace(v_def, v_b, ''))) / length(v_b);
  if v_na <> 1 or v_nb <> 1 then
    raise exception 'a4_92 : repères des motifs de filed_traiter_reprises trouvés % et % fois (1 attendu)', v_na, v_nb;
  end if;
  execute replace(replace(v_def, v_a, ' : à classer sans suite, ou à redéposer en facture rectificative.'''),
    v_b, '''Aucune correction de la facture dans les 24 h qui ont suivi le refus : à classer sans suite, ou à redéposer en facture rectificative.''');
end $$;
