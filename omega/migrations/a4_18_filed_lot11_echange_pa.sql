-- FILED, lot 11 (a4_18) — les portes de l'ouvrier d'échange avec la plateforme agréée (A2, omega/functions/echange-pa,
-- worker-a2 cf01689 ; contrat : NOTES-A2 § « Échange PA »).
--
-- Décisions provisoires du coordinateur (06/10), jusqu'au choix de Teo : voie 1 (Omega opérateur de dématérialisation,
-- une seule connexion PA pour tous les clients, API AFNOR XP Z12-013) ; l'ouvrier fabrique les CDAR ; les statuts 200 à
-- 203 et 213 sont des statuts de plateforme, jamais émis par nous.
--
-- Ce lot pose, toutes portes en service_role seul :
--   1. filed_cycle_vie gagne `suivi` (uuid, le trackingId donné à la plateforme), `sens` (emis | recu) et `flux_pa` ;
--      un statut n'est « à émettre » que pour une facture REÇUE PAR LA PLATEFORME (sinon : sans objet, journal seul) ;
--      à émettre, il dépose le travail pa.statut {"statut": suivi} (private.deposer_travail).
--   2. public.filed_pa_flux : chaque flux relevé ou déposé, idempotent sur sa clé ; public.filed_pa_etat : le curseur.
--   3. Les portes du contrat d'A2 : pa_commencer_statut, pa_noter_statut, pa_echouer_statut ; pa_curseur,
--      pa_poser_curseur ; pa_noter_flux ; et pa_commencer_depot, pa_noter_depot, pa_echouer_depot, qui répondent
--      « non pris en charge » : FILED tient les ACHATS ; l'émission (obligatoire pour les PME au 1er septembre 2027)
--      viendra avec les modules de facturation client.
--   4. Une facture entrante se dépose en DEUX temps, à cause de la règle du socle (une pièce FILED se range sous
--      <client>/filed_document/<document>/…, private.filed_deposer_piece) : pa_noter_flux retrouve le client par le SIREN
--      de l'acheteur, réserve le document et rend `chemin_cible` ; l'ouvrier y copie le fichier, puis appelle
--      public.pa_deposer_facture(p_flux_id, p_octets) qui crée la pièce (source connecteur) : le lecteur la lit en xml.
-- Remplace private.filed_deposer_cycle_vie d'a4_16 (même signature). Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le cycle de vie, relié à la plateforme
-- ───────────────────────────────────────────────────────────────────────────
alter table public.filed_cycle_vie add column if not exists suivi uuid not null default gen_random_uuid();
alter table public.filed_cycle_vie add column if not exists sens text not null default 'emis';
alter table public.filed_cycle_vie add column if not exists flux_pa text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'filed_cycle_vie_sens_check') then
    alter table public.filed_cycle_vie add constraint filed_cycle_vie_sens_check check (sens in ('emis', 'recu'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'filed_cycle_vie_flux_check') then
    alter table public.filed_cycle_vie add constraint filed_cycle_vie_flux_check check (flux_pa is null or char_length(flux_pa) <= 200);
  end if;
end $$;
create unique index if not exists filed_cycle_vie_suivi on public.filed_cycle_vie (suivi);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les flux et le curseur
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_pa_flux (
  id            bigint generated always as identity primary key,
  cle           text not null unique check (char_length(cle) between 1 and 300),
  flux          text not null check (char_length(flux) between 1 and 200),
  sens          text not null check (sens in ('entrant', 'sortant')),
  type          text check (type is null or char_length(type) <= 80),
  syntaxe       text check (syntaxe is null or char_length(syntaxe) <= 40),
  suivi         text check (suivi is null or char_length(suivi) <= 200),
  accuse        text check (accuse is null or accuse in ('en_attente', 'ok', 'erreur')),
  maj_le        timestamptz,
  chemin        text check (chemin is null or char_length(chemin) <= 500),
  sha256        text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  detail        jsonb not null default '{}'::jsonb,
  -- note : enregistré ; rattache : client trouvé, fichier à copier ; depose : pièce créée dans FILED ;
  -- orphelin : aucun client ; ambigu : plusieurs ; sans_suite : rien à faire (accusé d'un flux inconnu, en attente…).
  etat          text not null default 'note' check (etat in ('note', 'rattache', 'depose', 'orphelin', 'ambigu', 'sans_suite')),
  client_id     uuid references public.clients(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete set null,
  document_id   uuid,
  facture_id    uuid references public.filed_factures(id) on delete set null,
  cycle_vie_id  bigint references public.filed_cycle_vie(id) on delete set null,
  chemin_cible  text,
  recu_le       timestamptz not null default now()
);
comment on table public.filed_pa_flux is
  'Les flux échangés avec la plateforme agréée (factures et statuts, entrants et sortants), idempotents sur leur clé (pa:<flux>:<maj_le>:<accuse>), et ce que FILED en a fait.';
create index if not exists filed_pa_flux_flux on public.filed_pa_flux (flux, sens);
create index if not exists filed_pa_flux_document on public.filed_pa_flux (document_id) where document_id is not null;
alter table public.filed_pa_flux enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_pa_flux' and policyname = 'filed_pa_flux_lecture') then
    execute 'create policy filed_pa_flux_lecture on public.filed_pa_flux for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_pa_flux from anon, authenticated;
grant select on public.filed_pa_flux to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_pa_flux', 2, 'FILED, lot 11')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

create table if not exists public.filed_pa_etat (
  connexion  text primary key default 'principale' check (char_length(connexion) between 1 and 60),
  curseur    timestamptz,
  maj_le     timestamptz not null default now()
);
comment on table public.filed_pa_etat is 'Le curseur de relevé de la plateforme agréée (updatedAt du dernier flux relevé), une ligne par connexion.';
alter table public.filed_pa_etat enable row level security;
revoke all on table public.filed_pa_etat from anon, authenticated;

-- Une facture est « reçue par la plateforme » quand son document vient d'un flux entrant déposé.
create or replace function private.filed_recue_par_pa(p_document uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.filed_pa_flux x where x.document_id = p_document and x.sens = 'entrant' and x.etat = 'depose')
$$;
revoke all on function private.filed_recue_par_pa(uuid) from public, anon, authenticated;

-- Remplace la version d'a4_16 : à émettre seulement pour une facture reçue par la plateforme, et jamais un statut de
-- plateforme (200 à 203, 213).
create or replace function private.filed_deposer_cycle_vie(p_f public.filed_factures, p_code smallint, p_cle text,
                                                         p_motif_code text default null, p_motif text default null, p_montant numeric default null)
returns bigint language plpgsql security definer set search_path to '' as $$
declare v_id bigint;
begin
  insert into public.filed_cycle_vie (client_id, facture_id, document_id, code, motif_code, motif, montant, cle, etat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_code, p_motif_code, left(p_motif, 500), p_montant, left(p_cle, 200),
          case when p_code between 200 and 203 or p_code = 213 then 'sans_objet'
               when private.filed_recue_par_pa(p_f.document_id) then 'a_emettre'
               else 'sans_objet' end)
  on conflict (client_id, cle) do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.filed_deposer_cycle_vie(public.filed_factures, smallint, text, text, text, numeric) from public, anon, authenticated;

-- Un statut à émettre dépose le travail de l'ouvrier.
create or replace function private.filed_cycle_vie_travail()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.etat = 'a_emettre' and new.sens = 'emis' then
    perform private.deposer_travail(new.client_id, 'filed', 'pa.statut', jsonb_build_object('statut', new.suivi),
                                    'pa.statut:' || new.suivi::text, 5::smallint);
  end if;
  return null;
end $$;
revoke all on function private.filed_cycle_vie_travail() from public, anon, authenticated;
create or replace trigger filed_cycle_vie_travail
  after insert on public.filed_cycle_vie
  for each row execute function private.filed_cycle_vie_travail();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Émettre un statut
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.pa_commencer_statut(p_statut uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_e public.filed_cycle_vie; v_f public.filed_factures; v_four public.filed_fournisseurs; v_ent public.entites;
        v_motif text; v_cdar jsonb;
begin
  select * into v_e from public.filed_cycle_vie where suivi = p_statut for update;
  if not found then return jsonb_build_object('envoyer', false, 'statut', null, 'motif', 'Statut inconnu.'); end if;
  if v_e.sens <> 'emis' or v_e.code between 200 and 203 or v_e.code = 213 then
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Statut de plateforme ou reçu : jamais émis par Omega.');
  end if;
  if v_e.etat = 'emis' then return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Déjà émis.', 'flux', v_e.flux_pa); end if;
  if v_e.etat not in ('a_emettre', 'en_cours') then
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', format('État %s : rien à émettre.', v_e.etat));
  end if;
  if not private.filed_recue_par_pa(v_e.document_id) then
    update public.filed_cycle_vie set etat = 'sans_objet', erreur = 'Facture non reçue par la plateforme.' where id = v_e.id;
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Facture non reçue par la plateforme : statut sans objet.');
  end if;
  select * into v_f from public.filed_factures where id = v_e.facture_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_motif := coalesce(v_e.motif, (select a.texte from public.filed_factures_annexes a
                                   where a.facture_id = v_f.id and a.nature = 'motif_refus' order by a.cree_le desc limit 1));
  update public.filed_cycle_vie set etat = 'en_cours', pris_le = now(), essais = essais + 1 where id = v_e.id;
  v_cdar := jsonb_strip_nulls(jsonb_build_object(
    'message', v_e.suivi, 'emis_le', now(), 'code', v_e.code,
    'facture', jsonb_build_object('numero', v_f.numero, 'date', to_char(v_f.date_emission, 'YYYY-MM-DD'),
                                  'type_code', case when v_f.nature = 'avoir' then '381' else '380' end,
                                  'emetteur_siren', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren)),
    'emetteur', jsonb_build_object('siren', coalesce(v_f.acheteur_lu ->> 'siren', v_ent.siren), 'nom', v_ent.nom, 'role', 'BY'),
    'destinataire', jsonb_build_object('siren', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren), 'nom', v_four.nom, 'role', 'SE'),
    'motif', case when v_e.code in (206, 207, 208, 210) then jsonb_build_object('code', coalesce(v_e.motif_code, 'AUTRE'), 'texte', left(v_motif, 500)) end,
    'montant', case when v_e.code in (211, 212) then jsonb_build_object('valeur', v_e.montant, 'devise', coalesce(v_f.devise, 'EUR')) end));
  return jsonb_build_object('envoyer', true, 'statut', v_e.code, 'client_id', v_e.client_id, 'suivi', v_e.suivi, 'cdar', v_cdar);
end $$;
comment on function public.pa_commencer_statut(uuid) is
  'Ouvrier echange-pa : verrouille un statut du cycle de vie à émettre (suivi = trackingId) et rend de quoi fabriquer le CDAR ; refuse les statuts de plateforme et ceux d''une facture non reçue par la plateforme.';

create or replace function public.pa_noter_statut(p_statut uuid, p_flux text, p_depose_le timestamptz default now())
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.filed_cycle_vie
     set etat = 'emis', emis_le = coalesce(p_depose_le, now()), flux_pa = left(p_flux, 200), reference_pa = left(p_flux, 200), erreur = null
   where suivi = p_statut and etat <> 'emis';
end $$;
comment on function public.pa_noter_statut(uuid, text, timestamptz) is 'Ouvrier echange-pa : statut déposé à la plateforme (flux). Rejouable.';

create or replace function public.pa_echouer_statut(p_statut uuid, p_erreur text, p_definitif boolean default false)
returns void language plpgsql security definer set search_path to '' as $$
declare v_e public.filed_cycle_vie;
begin
  select * into v_e from public.filed_cycle_vie where suivi = p_statut for update;
  if not found or v_e.etat = 'emis' then return; end if;
  update public.filed_cycle_vie
     set etat = case when coalesce(p_definitif, false) then 'echec' else 'a_emettre' end, erreur = left(coalesce(p_erreur, 'Erreur inconnue'), 500)
   where id = v_e.id;
  if coalesce(p_definitif, false) then
    perform private.lever_alerte_module(v_e.client_id, 'filed', 'attention',
      left(format('Statut %s non transmis à la plateforme : %s', v_e.code, coalesce(p_erreur, 'erreur inconnue')), 200),
      jsonb_build_object('facture', v_e.facture_id, 'cycle_vie', v_e.id), 'cycle_vie_echec:' || v_e.id::text, false, null);
  end if;
end $$;
comment on function public.pa_echouer_statut(uuid, text, boolean) is 'Ouvrier echange-pa : échec d''émission d''un statut ; définitif → échec et alerte, sinon à émettre de nouveau.';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Déposer une facture émise : pas encore (FILED tient les achats)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.pa_commencer_depot(p_facture uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('deposer', false, 'statut', 'non_pris_en_charge',
    'motif', 'Omega n''émet pas encore de factures : FILED tient les achats. L''émission (obligatoire pour les PME au 1er septembre 2027) viendra avec les modules de facturation client.')
$$;
comment on function public.pa_commencer_depot(uuid) is 'Ouvrier echange-pa : dépôt d''une facture émise — non pris en charge (FILED tient les achats).';

create or replace function public.pa_noter_depot(p_facture uuid, p_flux text, p_depose_le timestamptz default now())
returns void language plpgsql security definer set search_path to '' as $$
begin
  raise exception 'Dépôt de facture émise non pris en charge : FILED tient les achats.' using errcode = '0A000';
end $$;
create or replace function public.pa_echouer_depot(p_facture uuid, p_erreur text, p_definitif boolean default false)
returns void language plpgsql security definer set search_path to '' as $$
begin
  raise exception 'Dépôt de facture émise non pris en charge : FILED tient les achats.' using errcode = '0A000';
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Le curseur de relevé
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.pa_curseur()
returns timestamptz language sql stable security definer set search_path to '' as $$
  select e.curseur from public.filed_pa_etat e where e.connexion = 'principale'
$$;
create or replace function public.pa_poser_curseur(p_curseur timestamptz)
returns void language plpgsql security definer set search_path to '' as $$
begin
  insert into public.filed_pa_etat (connexion, curseur, maj_le) values ('principale', p_curseur, now())
  on conflict (connexion) do update set curseur = excluded.curseur, maj_le = now();
end $$;
comment on function public.pa_curseur() is 'Ouvrier echange-pa : updatedAt du dernier flux relevé (null au premier passage).';
comment on function public.pa_poser_curseur(timestamptz) is 'Ouvrier echange-pa : pose le curseur de relevé.';

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Noter un flux relevé
-- ───────────────────────────────────────────────────────────────────────────
-- Le client d'une facture entrante : la société dont le SIREN est celui de l'acheteur (clés lues dans p_detail :
-- acheteur_siren, acheteur.siren, destinataire.siren, destinataire_siren, routage — SIREN ou SIRET), FILED installé.
create or replace function private.filed_pa_trouver_client(p_detail jsonb, out client_id uuid, out entite_id uuid, out issue text)
language plpgsql stable security definer set search_path to '' as $$
declare v_siren text; v_n integer;
begin
  v_siren := left(regexp_replace(coalesce(p_detail ->> 'acheteur_siren', p_detail -> 'acheteur' ->> 'siren', p_detail -> 'destinataire' ->> 'siren',
                                          p_detail ->> 'destinataire_siren', p_detail ->> 'routage', ''), '[^0-9]', '', 'g'), 9);
  if v_siren !~ '^[0-9]{9}$' then issue := 'orphelin'; return; end if;
  select count(*) into v_n from public.entites e
   where e.siren = v_siren and exists (select 1 from public.filed_reglages r where r.client_id = e.client_id and r.entite_id is null and r.actif);
  if v_n = 0 then issue := 'orphelin'; return; end if;
  if v_n > 1 then issue := 'ambigu'; return; end if;
  select e.client_id, e.id into client_id, entite_id from public.entites e
   where e.siren = v_siren and exists (select 1 from public.filed_reglages r where r.client_id = e.client_id and r.entite_id is null and r.actif);
  issue := 'rattache';
end $$;
revoke all on function private.filed_pa_trouver_client(jsonb) from public, anon, authenticated;

create or replace function public.pa_noter_flux(p_flux text, p_sens text, p_type text, p_syntaxe text, p_suivi text, p_accuse text,
                                                p_maj_le timestamptz, p_chemin text, p_sha256 text, p_detail jsonb, p_cle text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_x public.filed_pa_flux; v_e public.filed_cycle_vie; v_c record; v_cdar jsonb; v_f public.filed_factures; v_code smallint;
  v_suivi uuid; v_nom text; v_premier public.filed_pa_flux;
begin
  select * into v_x from public.filed_pa_flux where cle = p_cle;
  if found then
    return jsonb_build_object('id', v_x.id, 'nouveau', false, 'etat', v_x.etat, 'client_id', v_x.client_id,
                              'document', v_x.document_id, 'chemin_cible', v_x.chemin_cible);
  end if;
  insert into public.filed_pa_flux (cle, flux, sens, type, syntaxe, suivi, accuse, maj_le, chemin, sha256, detail)
  values (p_cle, p_flux, p_sens, p_type, p_syntaxe, p_suivi, p_accuse, p_maj_le, p_chemin, lower(p_sha256), coalesce(p_detail, '{}'::jsonb))
  returning * into v_x;

  -- Sortant : l'accusé de la plateforme sur un statut que nous avons déposé (suivi = notre trackingId).
  if p_sens = 'sortant' then
    begin v_suivi := p_suivi::uuid; exception when others then v_suivi := null; end;
    select * into v_e from public.filed_cycle_vie where suivi = v_suivi for update;
    if v_e.id is null then
      update public.filed_pa_flux set etat = 'sans_suite' where id = v_x.id;
    else
      update public.filed_pa_flux set etat = 'note', client_id = v_e.client_id, facture_id = v_e.facture_id, cycle_vie_id = v_e.id where id = v_x.id;
      if p_accuse = 'ok' and v_e.etat <> 'emis' then
        update public.filed_cycle_vie set etat = 'emis', emis_le = coalesce(p_maj_le, now()), flux_pa = left(p_flux, 200), reference_pa = left(p_flux, 200), erreur = null
         where id = v_e.id;
      elsif p_accuse = 'erreur' then
        update public.filed_cycle_vie set etat = 'echec', flux_pa = left(p_flux, 200),
               erreur = left('Rejeté par la plateforme : ' || coalesce(p_detail -> 'details' #>> '{}', 'sans détail'), 500)
         where id = v_e.id;
        perform private.lever_alerte_module(v_e.client_id, 'filed', 'attention',
          left(format('Statut %s rejeté par la plateforme : %s', v_e.code, coalesce(p_detail -> 'details' #>> '{}', 'sans détail')), 200),
          jsonb_build_object('facture', v_e.facture_id, 'cycle_vie', v_e.id, 'flux', p_flux), 'cycle_vie_rejet:' || v_e.id::text, false, null);
      end if;
    end if;
    select * into v_x from public.filed_pa_flux where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat);
  end if;

  -- Entrant, statut (CDAR) : sur une facture que nous avons reçue ; gardé au journal du cycle de vie (sens recu).
  if upper(coalesce(p_syntaxe, '')) = 'CDAR' or coalesce(p_type, '') ~ 'LC$' then
    v_cdar := coalesce(p_detail -> 'cdar', '{}'::jsonb);
    select f.* into v_f from public.filed_factures f
      left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
     where f.numero_normalise = upper(regexp_replace(coalesce(v_cdar -> 'facture' ->> 'numero', ''), '[^A-Za-z0-9]', '', 'g'))
       and coalesce(f.fournisseur_lu ->> 'siren', fo.siren) = coalesce(v_cdar -> 'facture' ->> 'emetteur_siren', v_cdar -> 'emetteur' ->> 'siren')
     order by f.cree_le desc limit 1;
    v_code := case when (v_cdar ->> 'code') ~ '^[0-9]{3}$' then (v_cdar ->> 'code')::smallint end;
    if v_f.id is null or v_code is null or not exists (select 1 from public.filed_cycle_vie_statuts s where s.code = v_code) then
      update public.filed_pa_flux set etat = 'orphelin' where id = v_x.id;
    else
      insert into public.filed_cycle_vie (client_id, facture_id, document_id, code, motif_code, motif, cle, etat, sens, flux_pa, survenu_le)
      values (v_f.client_id, v_f.id, v_f.document_id, v_code,
              (select m.code from public.filed_cycle_vie_motifs m where m.code = v_cdar -> 'motif' ->> 'code'),
              left(v_cdar -> 'motif' ->> 'texte', 500), 'pa:recu:' || p_flux, 'sans_objet', 'recu', left(p_flux, 200), coalesce(p_maj_le, now()))
      on conflict (client_id, cle) do nothing;
      update public.filed_pa_flux set etat = 'note', client_id = v_f.client_id, facture_id = v_f.id where id = v_x.id;
    end if;
    select * into v_x from public.filed_pa_flux where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat, 'facture', v_x.facture_id);
  end if;

  -- Entrant, facture : un même flux déjà rattaché (autre clé, autre maj_le) garde son document.
  select * into v_premier from public.filed_pa_flux
   where flux = p_flux and sens = 'entrant' and document_id is not null and id <> v_x.id order by id limit 1;
  if v_premier.id is not null then
    update public.filed_pa_flux set etat = 'sans_suite', client_id = v_premier.client_id, document_id = v_premier.document_id where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', 'sans_suite', 'client_id', v_premier.client_id,
                              'document', v_premier.document_id, 'chemin_cible', v_premier.chemin_cible, 'flux_id', v_premier.id);
  end if;
  select * into v_c from private.filed_pa_trouver_client(p_detail);
  if v_c.issue <> 'rattache' then
    update public.filed_pa_flux set etat = v_c.issue where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_c.issue);
  end if;
  v_nom := coalesce(nullif(regexp_replace(coalesce(p_chemin, ''), '^.*/', ''), ''), p_flux || '.xml');
  update public.filed_pa_flux
     set etat = 'rattache', client_id = v_c.client_id, entite_id = v_c.entite_id, document_id = gen_random_uuid()
   where id = v_x.id returning * into v_x;
  update public.filed_pa_flux set chemin_cible = v_c.client_id::text || '/filed_document/' || v_x.document_id::text || '/' || v_nom
   where id = v_x.id returning * into v_x;
  return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat, 'client_id', v_x.client_id,
                            'document', v_x.document_id, 'chemin_cible', v_x.chemin_cible);
end $$;
comment on function public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text) is
  'Ouvrier echange-pa : note un flux (idempotent sur p_cle). Sortant : accusé d''un statut (ok → émis, erreur → échec et alerte). Entrant statut (CDAR) : au cycle de vie de la facture reçue. Entrant facture : client retrouvé par le SIREN de l''acheteur, document réservé, chemin_cible rendu ; l''ouvrier y copie le fichier puis appelle pa_deposer_facture.';

-- La facture entrante, une fois le fichier copié à chemin_cible : la pièce FILED (source connecteur), lue ensuite en xml.
create or replace function public.pa_deposer_facture(p_flux_id bigint, p_octets bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_x public.filed_pa_flux; v_r jsonb; v_mime text;
begin
  select * into v_x from public.filed_pa_flux where id = p_flux_id for update;
  if not found then raise exception 'Flux introuvable.' using errcode = 'P0002'; end if;
  if v_x.etat = 'depose' then return jsonb_build_object('document', v_x.document_id, 'deja', true); end if;
  if v_x.etat <> 'rattache' then raise exception 'Ce flux n''est pas rattaché à un client (%).', v_x.etat using errcode = '55000'; end if;
  if v_x.sha256 is null then raise exception 'Empreinte SHA-256 du fichier manquante.' using errcode = '22023'; end if;
  v_mime := case when upper(coalesce(v_x.syntaxe, '')) in ('FACTUR-X', 'FACTURX', 'PDF') or v_x.chemin_cible ~* '\.pdf$' then 'application/pdf' else 'application/xml' end;
  v_r := private.filed_deposer_piece(v_x.client_id, v_x.document_id, regexp_replace(v_x.chemin_cible, '^.*/', ''), v_mime,
                                     p_octets, v_x.sha256, v_x.chemin_cible, v_x.entite_id, 'connecteur', 'plateforme agréée');
  update public.filed_pa_flux set etat = 'depose' where id = v_x.id;
  return v_r;
end $$;
comment on function public.pa_deposer_facture(bigint, bigint) is
  'Ouvrier echange-pa : dépose dans FILED la facture d''un flux entrant rattaché, une fois le fichier copié à chemin_cible.';

-- Toutes les portes : service_role seul.
do $$
declare f text;
begin
  foreach f in array array[
    'public.pa_commencer_statut(uuid)', 'public.pa_noter_statut(uuid, text, timestamptz)', 'public.pa_echouer_statut(uuid, text, boolean)',
    'public.pa_commencer_depot(uuid)', 'public.pa_noter_depot(uuid, text, timestamptz)', 'public.pa_echouer_depot(uuid, text, boolean)',
    'public.pa_curseur()', 'public.pa_poser_curseur(timestamptz)',
    'public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text)', 'public.pa_deposer_facture(bigint, bigint)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
