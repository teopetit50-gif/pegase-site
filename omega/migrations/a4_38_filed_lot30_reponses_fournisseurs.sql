-- FILED, lot 30 (a4_38) — « rédige ce qui repart », en minimal : FILED écrit, une personne valide, rien ne part seul.
--
-- Promesse du site (accueil:704, chiffrage n° 125) ; décision de Teo le 17/10 : un brouillon de réponse au
-- fournisseur, de trois sortes, toujours validé par une personne, jamais d'envoi sans elle :
--   piece_manquante  le message est arrivé sans facture lisible : on demande la pièce ;
--   contestation     la facture ne peut pas être réglée en l'état : on dit pourquoi (motif donné, sinon les contrôles
--                    bloquants de la facture) et l'on demande un avoir ou une facture rectificative ;
--   confirmation     on accuse réception : numéro, date, montant, référence de réception, échéance.
-- public.filed_preparer_reponse(document, sorte, motif?, adresse?, sujet?, corps?) rédige (ou reprend le texte de la
-- personne), range le brouillon dans filed_reponses et dépose une demande de validation « filed.repondre » — inscrite
-- aux actions qu'aucun accord permanent ne couvre (private.actions_sans_accord). Le courriel est préparé par
-- private.preparer_envoi ADOSSÉ à cette demande (comme CASHD) : il ne part que si une personne l'approuve ; refusée,
-- expirée ou annulée, il ne part pas. Si l'envoi par courriel n'est pas réglé pour FILED, le brouillon reste
-- validable et lisible (statut non_reglee) : la personne l'envoie elle-même. La décision est exécutée par
-- private.filed_executer_decision (texte d'a4_08, une branche ajoutée ; gen38.py).
-- Migration idempotente ; aucune suppression.

create table if not exists public.filed_reponses (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients(id) on delete cascade,
  entite_id            uuid references public.entites(id) on delete cascade,
  document_id          uuid not null references public.filed_documents(id) on delete cascade,
  facture_id           uuid references public.filed_factures(id) on delete set null,
  sorte                text not null check (sorte in ('piece_manquante', 'contestation', 'confirmation')),
  destinataire_adresse text,
  destinataire_nom     text,
  sujet                text not null check (char_length(sujet) between 1 and 200),
  corps                text not null check (char_length(corps) between 1 and 8000),
  statut               text not null default 'a_valider' check (statut in ('a_valider', 'non_reglee', 'validee', 'refusee', 'expiree', 'bloquee')),
  demande_id           uuid,
  envoi_id             uuid,
  motif                text,
  prepare_par          uuid,
  prepare_le           timestamptz not null default now(),
  decide_par           uuid,
  decide_le            timestamptz
);
comment on table public.filed_reponses is
  'Lot 30 (a4_38) : les brouillons de réponse aux fournisseurs (pièce manquante, contestation, confirmation). Chacun attend la validation d''une personne ; le courriel, adossé à la demande, ne part qu''approuvé.';
create index if not exists filed_reponses_document on public.filed_reponses (document_id);
create index if not exists filed_reponses_a_valider on public.filed_reponses (client_id) where statut in ('a_valider', 'non_reglee');
alter table public.filed_reponses enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reponses' and policyname = 'filed_reponses_lecture') then
    execute 'create policy filed_reponses_lecture on public.filed_reponses for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke all on table public.filed_reponses from anon, authenticated;
grant select on public.filed_reponses to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_reponses', 2, 'FILED, lot 30')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_reponses', 'filed_document', 'document_id', 3)
on conflict do nothing;

-- « filed.repondre » : jamais couvert par un accord permanent. La table du socle n'est connue ici que par son nom :
-- on remplit les colonnes qu'elle a (module, type_action, et un motif s'il en faut un).
do $$
declare v_cols text := 'module, type_action'; v_vals text := quote_literal('filed') || ', ' || quote_literal('filed.repondre');
begin
  if to_regclass('private.actions_sans_accord') is null then return; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'private' and table_name = 'actions_sans_accord' and column_name = 'motif') then
    v_cols := v_cols || ', motif';
    v_vals := v_vals || ', ' || quote_literal('Un courriel à un fournisseur part toujours sur la validation d''une personne (FILED, a4_38).');
  end if;
  execute format('insert into private.actions_sans_accord (%s) select %s where not exists (select 1 from private.actions_sans_accord where module = %L and type_action = %L)',
                 v_cols, v_vals, 'filed', 'filed.repondre');
end $$;

-- Le texte d'une réponse, sobre et factuel. Rend (sujet, corps).
create or replace function private.filed_rediger_reponse(p_document uuid, p_sorte text, p_motif text default null)
returns table (sujet text, corps text) language plpgsql stable security definer set search_path to '' as $$
declare v_d public.filed_documents; v_f public.filed_factures; v_e text; v_motifs text; v_ech date; v_n text := chr(10);
begin
  select * into v_d from public.filed_documents where id = p_document;
  select * into v_f from public.filed_factures where document_id = p_document;
  select e.nom into v_e from public.entites e where e.id = v_d.entite_id;
  v_ech := coalesce(v_f.echeance_lue, null);
  if p_sorte = 'piece_manquante' then
    sujet := left(format('Facture à nous renvoyer — votre envoi du %s', to_char(v_d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY')), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous avons bien reçu votre envoi du %s (notre référence %s), mais la facture n''y est pas jointe ou n''est pas lisible.',
             to_char(v_d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), coalesce(v_d.reference, 'en attente')),
      coalesce(nullif(btrim(p_motif), ''), null),
      'Pourriez-vous nous la renvoyer en pièce jointe, au format PDF (ou Factur-X) ? Elle sera traitée dès réception.', '',
      'Cordialement,', coalesce(v_e, ''));
  elsif p_sorte = 'contestation' then
    if v_f.id is null then raise exception 'Une contestation porte sur une facture : ce document n''en est pas une.' using errcode = '22023'; end if;
    v_motifs := nullif(btrim(p_motif), '');
    if v_motifs is null then
      select string_agg('- ' || c.message, v_n order by c.code) into v_motifs
        from public.filed_controles c where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    end if;
    if v_motifs is null then raise exception 'Dites ce qui est contesté : aucun contrôle bloquant ne le dit pour cette facture.' using errcode = '22023'; end if;
    sujet := left(format('Votre facture %s — à rectifier avant règlement', coalesce(v_f.numero, v_d.reference)), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous avons bien reçu votre facture %s du %s, d''un montant de %s %s (notre référence %s).',
             coalesce(v_f.numero, 'sans numéro'), coalesce(to_char(v_f.date_emission, 'DD/MM/YYYY'), 'date non lue'),
             coalesce(replace(to_char(v_f.montant_ttc, 'FM999999990.00'), '.', ','), '?'), coalesce(v_f.devise, 'EUR'), coalesce(v_d.reference, '')),
      'Nous ne pouvons pas la régler en l''état :', v_motifs, '',
      'Merci de nous adresser un avoir ou une facture rectificative ; nous la traiterons dès réception.', '',
      'Cordialement,', coalesce(v_e, ''));
  elsif p_sorte = 'confirmation' then
    if v_f.id is null then raise exception 'Une confirmation porte sur une facture : ce document n''en est pas une.' using errcode = '22023'; end if;
    sujet := left(format('Bonne réception de votre facture %s', coalesce(v_f.numero, v_d.reference)), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous accusons réception de votre facture %s du %s, d''un montant de %s %s.',
             coalesce(v_f.numero, 'sans numéro'), coalesce(to_char(v_f.date_emission, 'DD/MM/YYYY'), 'date non lue'),
             coalesce(replace(to_char(v_f.montant_ttc, 'FM999999990.00'), '.', ','), '?'), coalesce(v_f.devise, 'EUR')),
      format('Elle est enregistrée sous notre référence %s%s.', coalesce(v_d.reference, ''),
             coalesce(', échéance au ' || to_char(v_ech, 'DD/MM/YYYY'), '')),
      coalesce(nullif(btrim(p_motif), ''), null), '',
      'Cordialement,', coalesce(v_e, ''));
  else
    raise exception 'Sorte de réponse inconnue : piece_manquante, contestation ou confirmation.' using errcode = '22023';
  end if;
  return next;
end $$;
revoke all on function private.filed_rediger_reponse(uuid, text, text) from public, anon, authenticated;

create or replace function private.filed_preparer_reponse(p_document uuid, p_sorte text, p_motif text default null, p_adresse text default null,
                                                         p_sujet text default null, p_corps text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_d public.filed_documents; v_f public.filed_factures; v_uid uuid; v_t record; v_id uuid := gen_random_uuid(); v_adresse text;
  v_nom text; v_dem uuid; v_dstatut text; v_dpol uuid; v_envoi uuid; v_err text; v_sujet text; v_corps text;
begin
  select * into v_d from public.filed_documents where id = p_document;
  if not found then raise exception 'Document introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_d.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_d.entite_id);
  if v_uid is not null and not private.voit_objet(v_d.client_id, 'filed_document', v_d.id::text) then
    raise exception 'Document introuvable.' using errcode = 'P0002';
  end if;
  select * into v_f from public.filed_factures where document_id = p_document;
  select * into v_t from private.filed_rediger_reponse(p_document, p_sorte, p_motif);
  v_sujet := left(coalesce(nullif(btrim(p_sujet), ''), v_t.sujet), 200);
  v_corps := left(coalesce(nullif(btrim(p_corps), ''), v_t.corps), 8000);
  v_adresse := lower(btrim(coalesce(nullif(btrim(p_adresse), ''), substring(v_d.expediteur from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'))));
  if v_adresse is not null and v_adresse !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'Adresse du destinataire invalide.' using errcode = '22023';
  end if;
  select fo.nom into v_nom from public.filed_fournisseurs fo where fo.id = v_f.fournisseur_id;
  insert into public.filed_reponses (id, client_id, entite_id, document_id, facture_id, sorte, destinataire_adresse, destinataire_nom, sujet, corps, prepare_par)
  values (v_id, v_d.client_id, v_d.entite_id, v_d.id, v_f.id, p_sorte, v_adresse, v_nom, v_sujet, v_corps, v_uid);

  -- La demande : une personne valide, toujours (filed.repondre n'est couvert par aucun accord permanent).
  v_dem := private.filed_deposer_demande(v_d.client_id, v_d.entite_id, 'filed.repondre', 'filed_document', v_d.id::text,
    left(format('Réponse au fournisseur (%s) : %s', replace(p_sorte, '_', ' '), v_sujet), 500), null,
    jsonb_build_object('reponse', v_id, 'sorte', p_sorte, 'destinataire', v_adresse, 'sujet', v_sujet, 'corps', v_corps),
    'filed:repondre:' || v_id::text);
  select d.statut, d.politique_id into v_dstatut, v_dpol from public.demandes_validation d where d.id = v_dem;
  update public.filed_reponses set demande_id = v_dem where id = v_id;
  if v_dstatut = 'approuvee' and v_dpol is not null then
    update public.filed_reponses set statut = 'bloquee', motif = 'Un accord permanent l''a approuvée d''office : une réponse à un fournisseur exige une personne. Rien n''est préparé.'
     where id = v_id;
    perform private.lever_alerte_module(v_d.client_id, 'filed', 'attention',
      'Une réponse au fournisseur n''a pas été préparée : un accord permanent la couvrait, et elle exige la validation d''une personne.',
      jsonb_build_object('reponse', v_id, 'politique', v_dpol), 'reponse:accord:' || v_id::text, true, null);
    return v_id;
  end if;

  -- Le courriel, adossé à la demande : il ne part que si elle est approuvée.
  if v_adresse is null then
    update public.filed_reponses set statut = 'non_reglee', motif = 'Pas d''adresse de destinataire : le brouillon est à valider puis à envoyer par la personne.' where id = v_id;
  elsif to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamp with time zone,jsonb)') is null then
    update public.filed_reponses set statut = 'non_reglee', motif = 'L''envoi par courriel n''existe pas sur cette base : le brouillon est à valider puis à envoyer par la personne.' where id = v_id;
  else
    begin
      execute 'select private.preparer_envoi($1, ''filed'', ''filed_document'', $2, ''email'', $3, null, ''{}''::jsonb, $4, $5, null::uuid[], $6, $7, false, false, $8, $9)'
        into v_envoi
        using v_d.client_id, v_d.id::text, jsonb_build_object('adresse', v_adresse, 'nom', coalesce(v_nom, v_adresse), 'professionnel', true),
              v_sujet, v_corps, 'filed:reponse:' || v_id::text, v_d.entite_id, now() + interval '30 days', jsonb_build_object('demande', v_dem);
      update public.filed_reponses set envoi_id = v_envoi where id = v_id;
    exception when others then
      v_err := left(sqlstate || ' ' || sqlerrm, 400);
      update public.filed_reponses set statut = 'non_reglee',
             motif = left('Le courriel n''a pas pu être préparé (' || v_err || ') : le brouillon reste à valider, puis à envoyer par la personne.', 500)
       where id = v_id;
    end;
  end if;
  perform private.filed_historiser(v_d.client_id, v_d.id, 'filed_document', v_d.id::text, 'reponse_preparee',
    format('Réponse au fournisseur rédigée (%s) : « %s ». Elle attend la validation d''une personne.', replace(p_sorte, '_', ' '), v_sujet),
    jsonb_build_object('reponse', v_id, 'demande', v_dem, 'envoi', v_envoi));
  perform private.filed_journaliser(v_d.client_id, 'filed.reponse.preparee', 'filed_document', v_d.id::text,
    jsonb_build_object('reponse', v_id, 'sorte', p_sorte, 'demande', v_dem, 'envoi', v_envoi), v_d.entite_id);
  return v_id;
end $$;
revoke all on function private.filed_preparer_reponse(uuid, text, text, text, text, text) from public, anon;
grant execute on function private.filed_preparer_reponse(uuid, text, text, text, text, text) to authenticated, service_role;

create or replace function public.filed_preparer_reponse(p_document uuid, p_sorte text, p_motif text default null, p_adresse text default null,
                                                        p_sujet text default null, p_corps text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_preparer_reponse(p_document, p_sorte, p_motif, p_adresse, p_sujet, p_corps) $$;
comment on function public.filed_preparer_reponse(uuid, text, text, text, text, text) is
  'Rédige une réponse au fournisseur (piece_manquante, contestation, confirmation) ou reprend le texte donné, et la dépose en validation : rien ne part sans l''accord d''une personne.';
revoke all on function public.filed_preparer_reponse(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.filed_preparer_reponse(uuid, text, text, text, text, text) to authenticated, service_role;

-- La décision sur une réponse (appelée par filed_executer_decision). Le courriel suit la demande (socle) : approuvée,
-- il part ; refusée, expirée ou annulée, il ne part pas.
create or replace function private.filed_decider_reponse(p_d public.demandes_validation, p_decideur uuid, p_commentaire text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_r public.filed_reponses;
begin
  select * into v_r from public.filed_reponses where id = (p_d.payload ->> 'reponse')::uuid for update;
  if not found then return 'reponse_effacee'; end if;
  if v_r.statut not in ('a_valider', 'non_reglee') then return 'deja_traitee'; end if;
  if p_d.statut = 'approuvee' and p_d.politique_id is not null then
    -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
    update public.demandes_validation set statut = 'echec_execution',
           motif_echec = 'Une réponse à un fournisseur n''est jamais validée d''office par un accord permanent.' where id = p_d.id;
    update public.filed_reponses set statut = 'bloquee', motif = 'Approuvée par un accord permanent : refusé, une personne doit valider.' where id = v_r.id;
    return 'refuse_accord';
  end if;
  if p_d.statut = 'approuvee' then
    update public.filed_reponses set statut = 'validee', decide_par = p_decideur, decide_le = now(),
           motif = coalesce(motif, case when envoi_id is null then null end) where id = v_r.id;
    update public.demandes_validation set statut = 'executee' where id = p_d.id;
    perform private.filed_historiser(v_r.client_id, v_r.document_id, 'filed_document', v_r.document_id::text, 'reponse_validee',
      case when v_r.envoi_id is null then format('Réponse « %s » validée par une personne ; à envoyer par elle (courriel non réglé).', v_r.sujet)
           else format('Réponse « %s » validée par une personne ; le courriel part.', v_r.sujet) end,
      jsonb_build_object('reponse', v_r.id, 'demande', p_d.id, 'par', p_decideur));
    return 'reponse_validee';
  elsif p_d.statut = 'rejetee' then
    update public.filed_reponses set statut = 'refusee', decide_par = p_decideur, decide_le = now(),
           motif = left(coalesce(p_commentaire, 'Refusée par une personne.'), 500) where id = v_r.id;
    perform private.filed_historiser(v_r.client_id, v_r.document_id, 'filed_document', v_r.document_id::text, 'reponse_refusee',
      format('Réponse « %s » refusée : rien n''est parti.', v_r.sujet), jsonb_build_object('reponse', v_r.id, 'demande', p_d.id));
    return 'reponse_refusee';
  end if;
  update public.filed_reponses set statut = 'expiree', decide_le = now() where id = v_r.id;
  return 'expiree';
end $$;
revoke all on function private.filed_decider_reponse(public.demandes_validation, uuid, text) from public, anon, authenticated;

-- filed_executer_decision (texte d'a4_08) : la branche filed.repondre.
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

  -- Lot 30 (a4_38) : la réponse au fournisseur, validée par une personne.
  if v_d.type_action = 'filed.repondre' then
    return private.filed_decider_reponse(v_d, v_decideur, v_commentaire);
  end if;

  return 'type_inconnu';
end $function$;
