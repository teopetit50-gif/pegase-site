-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_05 : les réponses lues, les pièces jointes (11/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ce que la page promet et que c2_01 → c2_04 ne tenaient qu'à moitié (omega/CHIFFRAGE/cashd.md) :
--   · G5 LECTURE DES RÉPONSES — « Une contestation écrite bascule la facture en litige et la sort du cycle » ; « Le rejet
--     du message ou la réponse d'absence définitive signale l'adresse ». Chaque réponse reçue à une relance est lue
--     (private.cashd_lire_reponse : règles en français et en anglais, sans modèle de langue, rien ne sort de la base) et
--     classée : contestation, contact parti, promesse de paiement, autre. La lecture devient une PROPOSITION
--     (cashd_reponses_lues) : facture en litige, compte en attente de contact, compte en pause le temps du règlement
--     promis. Une personne la tranche (porte cashd_trancher_reponse) ; rien ne bascule seul.
--   · G20 PIÈCES DU DOSSIER — « Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées. » Une
--     facture porte ses pièces (PDF de la facture, bon de livraison, bon de commande, contrat), déposées dans le stockage
--     de l'organisation (omega-clients/<client>/cashd/…) et rattachées par la porte cashd_joindre_piece. Le dossier
--     (cashd_dossier) les liste, et dit, pour l'assurance-crédit, les factures auxquelles il manque leur PDF.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; jamais de DROP ni
-- de DELETE. RLS sur toute table, revoke all puis grants ; revoke execute de public sur les fonctions privées. Les
-- fonctions redéfinies gardent leur signature.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Tables
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.cashd_reponses_lues (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  compte_id uuid not null,
  relance_id uuid not null,
  reception_id bigint not null,
  lecture text not null,
  indice text,
  proposition text not null,
  statut text not null default 'proposee',
  motif text,
  tranche_par uuid,
  tranche_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint cashd_reponses_lues_un unique (reception_id),
  constraint cashd_reponses_lues_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_reponses_lues_relance_fkey foreign key (client_id, relance_id) references public.cashd_relances(client_id, id),
  constraint cashd_reponses_lues_check check (lecture in ('contestation', 'absence', 'promesse', 'autre')
    and proposition in ('litige', 'attente_contact', 'pause', 'aucune') and statut in ('proposee', 'acceptee', 'ecartee')
    and char_length(indice) <= 200 and char_length(motif) <= 500)
);
create index if not exists cashd_reponses_lues_compte_idx on public.cashd_reponses_lues (compte_id, cree_le desc);

create table if not exists public.cashd_pieces_jointes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null,
  nature text not null,
  chemin text not null,
  nom text not null,
  actif boolean not null default true,
  ajoute_par uuid,
  cree_le timestamptz not null default now(),
  constraint cashd_pieces_jointes_un unique (facture_id, chemin),
  constraint cashd_pieces_jointes_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id),
  constraint cashd_pieces_jointes_check check (nature in ('facture_pdf', 'bon_livraison', 'bon_commande', 'contrat', 'autre')
    and char_length(chemin) between 3 and 500 and char_length(nom) between 1 and 200)
);
create index if not exists cashd_pieces_jointes_facture_idx on public.cashd_pieces_jointes (facture_id);

alter table public.cashd_reponses_lues enable row level security;
alter table public.cashd_pieces_jointes enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_reponses_lues' and policyname = 'les membres lisent les reponses lues de leurs comptes') then
    create policy "les membres lisent les reponses lues de leurs comptes" on public.cashd_reponses_lues for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_comptes c where c.id = cashd_reponses_lues.compte_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_pieces_jointes' and policyname = 'les membres lisent les pieces jointes de leurs factures') then
    create policy "les membres lisent les pieces jointes de leurs factures" on public.cashd_pieces_jointes for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_factures f where f.id = cashd_pieces_jointes.facture_id));
  end if;
end $do$;
revoke all on table public.cashd_reponses_lues, public.cashd_pieces_jointes from anon, authenticated;
grant select on table public.cashd_reponses_lues, public.cashd_pieces_jointes to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
               select x from unnest(array['cashd_reponses_lues', 'cashd_pieces_jointes']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Lire une réponse
-- ═══════════════════════════════════════════════════════════════════════════
-- Règles, dans cet ordre : le contact est parti (l'adresse ne vaut plus), la facture est contestée, un paiement est
-- promis ou fait ; sinon « autre ». Français et anglais. Rend {lecture, indice} — l'indice est le passage reconnu.

create or replace function private.cashd_lire_reponse(p_texte text)
 returns jsonb language plpgsql immutable set search_path to ''
as $function$
declare
  t text := lower(coalesce(p_texte, ''));
  m text[];
begin
  t := translate(t, 'àâäéèêëîïôöùûüç’', 'aaaeeeeiioouuuc''');
  m := regexp_match(t, '(ne fait plus partie|a quitte (la societe|l''entreprise|nos effectifs|ses fonctions)|n''est plus (en poste|dans (la|l'')|joignable|en charge)|ne travaille plus|has left (the company|our company|the organi[sz]ation)|no longer (works|with|employed|at)|is no longer|adresse (n''est plus|desactivee|inexistante)|mailbox (is )?(no longer|unavailable|not monitored))');
  if m is not null then
    return jsonb_build_object('lecture', 'absence', 'indice', left(m[1], 200));
  end if;
  m := regexp_match(t, '(contest\w*|litig\w*|desaccord|pas d''accord|non conforme|erreur (sur|dans) (la|votre) facture|facture (erronee|incorrecte|errone)|travaux (non|pas) (termines|realises|faits)|prestation (non|pas) (realisee|conforme)|refus\w* de (payer|regler)|ne (paierons|reglerons) pas|reclamation|dispute[sd]?|disagree|incorrect invoice|wrong (invoice|amount)|not (delivered|completed|as agreed)|refuse to pay|will not pay)');
  if m is not null then
    return jsonb_build_object('lecture', 'contestation', 'indice', left(m[1], 200));
  end if;
  m := regexp_match(t, '(virement (a ete |est |sera )?(effectue|emis|envoye|passe|fait|programme|en cours)|paiement (a ete |est |sera )?(effectue|en cours|programme|envoye|emis|parti)|(nous|je) (allons|vais) (regler|payer|proceder)|(nous|je) (reglerons|paierons|reglerai|paierai|virerons)|sera (regle|paye|vire)e?|reglement (a ete |est |sera )?(effectue|en cours|parti|programme)|cheque (a ete |est )?(envoye|parti|poste)|deja (regle|paye)e?|(payment|transfer) (has been |was )?(made|sent|issued|scheduled)|we (will|shall) pay|will be paid|already paid|paid (it|this|the invoice))');
  if m is not null then
    return jsonb_build_object('lecture', 'promesse', 'indice', left(m[1], 200));
  end if;
  return jsonb_build_object('lecture', 'autre', 'indice', null);
end $function$;

-- Noter une réponse reçue à une relance : la lire et en faire une proposition (une par réception). Appelée par
-- cashd_suivre_reception ; rend {lecture, indice, proposition}.
create or replace function private.cashd_noter_reponse(p_relance uuid, p_reception bigint, p_sujet text, p_corps text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare r public.cashd_relances; v_lu jsonb; v_prop text;
begin
  select * into r from public.cashd_relances where id = p_relance;
  if not found then
    return null;
  end if;
  v_lu := private.cashd_lire_reponse(coalesce(p_sujet, '') || ' ' || coalesce(p_corps, ''));
  v_prop := case v_lu ->> 'lecture' when 'contestation' then 'litige' when 'absence' then 'attente_contact' when 'promesse' then 'pause' else 'aucune' end;
  insert into public.cashd_reponses_lues (client_id, entite_id, compte_id, relance_id, reception_id, lecture, indice, proposition)
  values (r.client_id, r.entite_id, r.compte_id, r.id, p_reception, v_lu ->> 'lecture', v_lu ->> 'indice', v_prop)
  on conflict (reception_id) do nothing;
  return v_lu || jsonb_build_object('proposition', v_prop);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Trancher une proposition
-- ═══════════════════════════════════════════════════════════════════════════
-- Accepter : contestation → les factures de la relance passent en litige (porte cashd_litige : relances coupées,
-- commercial prévenu) ; contact parti → le compte passe en attente de contact ; promesse → le compte passe en pause
-- (il reprend sur votre décision). Écarter : rien ne change. Dans les deux cas, la décision reste au journal.

create or replace function public.cashd_trancher_reponse(p_reponse uuid, p_accepter boolean, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  x public.cashd_reponses_lues;
  v_uid uuid;
  v_motif text;
  f record;
  v_n integer := 0;
begin
  select * into x from public.cashd_reponses_lues where id = p_reponse for update;
  if not found then
    raise exception 'Réponse introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(x.client_id, x.entite_id);
  if x.statut <> 'proposee' then
    raise exception 'Cette réponse est déjà tranchée.' using errcode = '55000';
  end if;
  if p_accepter is null then
    raise exception 'Accepter ou écarter.' using errcode = '22023';
  end if;
  v_motif := coalesce(nullif(btrim(p_motif), ''), case x.lecture
    when 'contestation' then 'contestation écrite du client'
    when 'absence' then 'l''interlocuteur a quitté l''entreprise'
    when 'promesse' then 'le client annonce son règlement'
    else 'réponse du client' end) || coalesce(' (« ' || x.indice || ' »)', '');
  if p_accepter then
    if x.proposition = 'litige' then
      for f in select distinct p.facture_id from public.cashd_relances_pieces p join public.cashd_factures z on z.id = p.facture_id
               where p.relance_id = x.relance_id and z.statut = 'ouverte' loop
        perform public.cashd_litige(f.facture_id, true, left(v_motif, 500));
        v_n := v_n + 1;
      end loop;
    elsif x.proposition in ('attente_contact', 'pause') then
      perform public.cashd_statut_compte(x.compte_id, x.proposition, left(v_motif, 500));
      v_n := 1;
    end if;
  end if;
  update public.cashd_reponses_lues set statut = case when p_accepter then 'acceptee' else 'ecartee' end, motif = left(coalesce(nullif(btrim(p_motif), ''), v_motif), 500),
         tranche_par = v_uid, tranche_le = now()
   where id = x.id returning * into x;
  perform private.journaliser_module(x.client_id, 'cashd', 'cashd.reponse_tranchee', 'cashd_comptes', x.compte_id::text,
    jsonb_build_object('reponse', x.id, 'lecture', x.lecture, 'proposition', x.proposition, 'acceptee', p_accepter, 'motif', x.motif, 'effets', v_n), x.entite_id);
  return jsonb_build_object('reponse', x.id, 'statut', x.statut, 'proposition', x.proposition, 'effets', v_n);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Joindre une pièce à une facture
-- ═══════════════════════════════════════════════════════════════════════════
-- Le fichier est déjà déposé dans le stockage de l'organisation (omega-clients) sous <client>/cashd/… ; la porte le
-- rattache à la facture. p_actif = false le détache (la ligne reste, datée).

create or replace function public.cashd_joindre_piece(p_facture uuid, p_nature text, p_chemin text, p_nom text, p_actif boolean default true)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_uid uuid; x public.cashd_pieces_jointes;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if p_nature is null or p_nature not in ('facture_pdf', 'bon_livraison', 'bon_commande', 'contrat', 'autre') then
    raise exception 'Nature : facture_pdf, bon_livraison, bon_commande, contrat ou autre.' using errcode = '22023';
  end if;
  if coalesce(p_chemin, '') not like f.client_id::text || '/cashd/%' or p_chemin like '%..%' then
    raise exception 'La pièce se dépose dans le stockage de votre organisation, sous %/cashd/.', f.client_id using errcode = '42501';
  end if;
  if nullif(btrim(p_nom), '') is null then
    raise exception 'Une pièce porte un nom.' using errcode = '22023';
  end if;
  insert into public.cashd_pieces_jointes (client_id, facture_id, nature, chemin, nom, actif, ajoute_par)
  values (f.client_id, f.id, p_nature, p_chemin, left(btrim(p_nom), 200), coalesce(p_actif, true), v_uid)
  on conflict (facture_id, chemin) do update set nature = excluded.nature, nom = excluded.nom, actif = excluded.actif, ajoute_par = excluded.ajoute_par
  returning * into x;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.piece_jointe', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'nature', x.nature, 'nom', x.nom, 'chemin', x.chemin, 'actif', x.actif), f.entite_id);
  return to_jsonb(x);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Fonctions redéfinies (copies des dernières définitions, patchées)
-- ═══════════════════════════════════════════════════════════════════════════

-- Suivre une réponse reçue (c2_03) : elle est lue et devient une proposition.
create or replace function private.cashd_suivre_reception(p_charge jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  x public.receptions;
  r public.cashd_relances;
  v_id bigint;
  v_lu jsonb;
begin
  begin
    v_id := coalesce(p_charge ->> 'reception', p_charge ->> 'id')::bigint;
  exception when others then
    return jsonb_build_object('ignore', 'charge sans réception');
  end;
  select * into x from public.receptions where id = v_id;
  if not found or x.en_reponse_a is null then
    return jsonb_build_object('ignore', 'réception sans envoi d''origine');
  end if;
  select * into r from public.cashd_relances where envoi_id = x.en_reponse_a;
  if not found then
    return jsonb_build_object('ignore', 'réponse étrangère aux relances');
  end if;
  update public.cashd_relances set reponse_le = coalesce(reponse_le, x.recu_le), maj_le = now() where id = r.id;
  -- La réponse est lue (règles, sans modèle) et devient une proposition qu'une personne tranche (c2_05).
  v_lu := private.cashd_noter_reponse(r.id, x.id, x.sujet, x.corps);
  perform private.cashd_alerter_commercial(r.compte_id, 'info',
    format('Réponse reçue à la relance du %s (%s) : %s', to_char(r.jour, 'DD/MM/YYYY'),
           left(coalesce(x.sujet, 'sans objet'), 120),
           case v_lu ->> 'lecture' when 'contestation' then 'le client conteste — la mise en litige vous est proposée.'
                when 'absence' then 'l''interlocuteur a quitté l''entreprise — l''attente de contact vous est proposée.'
                when 'promesse' then 'un règlement est annoncé — la pause du compte vous est proposée.'
                else 'lisez-la ; si le client conteste, mettez la facture en litige.' end),
    jsonb_build_object('relance', r.id, 'reception', x.id), 'reponse:' || r.id::text);
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.reponse_recue', 'cashd_relances', r.id::text,
    jsonb_build_object('reception', x.id, 'recu_le', x.recu_le, 'de', x.de_empreinte, 'lecture', v_lu ->> 'lecture', 'indice', v_lu ->> 'indice'), r.entite_id);
  return jsonb_build_object('relance', r.id, 'reponse_le', x.recu_le, 'lecture', v_lu ->> 'lecture', 'indice', v_lu ->> 'indice');
end $function$;

-- Le dossier d'un compte (c2_03) : plus les pièces jointes, et les factures à qui manque leur PDF.
create or replace function public.cashd_dossier(p_compte uuid, p_facture uuid default null, p_motif text default 'litige')
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'motif', coalesce(p_motif, 'litige'),
    'constitue_le', now(),
    'creancier', (select jsonb_build_object('nom', e.nom, 'siren', e.siren) from public.entites e where e.id = c.entite_id),
    'debiteur', jsonb_build_object('nom', c.nom, 'reference', c.reference, 'siren', c.siren, 'groupe', c.groupe, 'pays', c.pays,
                                   'contact_facturation', c.contact_facturation_nom, 'adresse_facturation', c.contact_facturation_email,
                                   'statut', c.statut, 'statut_motif', c.statut_motif),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'delais', (select to_jsonb(d) from public.cashd_delais_reglement d where d.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || jsonb_build_object(
                  'echeancier', (select coalesce(jsonb_agg(jsonb_build_object('rang', x.rang, 'echeance', x.echeance, 'montant', x.montant) order by x.rang), '[]'::jsonb)
                                 from public.cashd_echeances x where x.facture_id = f.id and x.actif))
                  order by f.date_emission), '[]'::jsonb)
               from public.cashd_factures_etat f where f.compte_id = c.id and (p_facture is null or f.id = p_facture)),
    'imputations', (select coalesce(jsonb_agg(jsonb_build_object('facture', f.numero, 'montant', x.montant, 'le', x.cree_le, 'annulee_le', x.annulee_le,
                                                                 'reglement', (select jsonb_build_object('recu_le', r.recu_le, 'montant', r.montant, 'mode', r.mode, 'reference', r.reference)
                                                                               from public.cashd_reglements r where r.id = x.reglement_id),
                                                                 'avoir', (select a.numero from public.cashd_factures a where a.id = x.avoir_id)) order by x.cree_le), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id
                    where f.compte_id = c.id and (p_facture is null or f.id = p_facture)),
    'relances', (select coalesce(jsonb_agg(jsonb_build_object('jour', r.jour, 'palier', r.palier, 'etat', r.etat, 'canal', r.canal, 'destinataire', r.destinataire_adresse,
                                                              'sujet', r.sujet, 'corps', r.corps, 'montant', r.montant, 'envoye_le', r.envoye_le,
                                                              'remise', (select jsonb_build_object('remise', e.remise, 'remise_le', e.remise_le) from public.envois e where e.id = r.envoi_id),
                                                              'reponse_le', (select x.reponse_le from public.cashd_relances x where x.id = r.id),
                                                              'motif', r.motif) order by r.jour), '[]'::jsonb)
                 from public.cashd_relances_etat r
                 where r.compte_id = c.id and (p_facture is null or exists (select 1 from public.cashd_relances_pieces p where p.relance_id = r.id and p.facture_id = p_facture))),
    'reponses', (select coalesce(jsonb_agg(jsonb_build_object('recu_le', x.recu_le, 'de', x.de_adresse, 'sujet', x.sujet, 'corps', left(x.corps, 4000)) order by x.recu_le), '[]'::jsonb)
                 from public.receptions x join public.cashd_relances r on r.envoi_id = x.en_reponse_a where r.compte_id = c.id),
    'pieces_jointes', (select coalesce(jsonb_agg(jsonb_build_object('facture', f.numero, 'nature', p.nature, 'nom', p.nom, 'chemin', p.chemin, 'le', p.cree_le)
                                                order by f.numero, p.cree_le), '[]'::jsonb)
                       from public.cashd_pieces_jointes p join public.cashd_factures f on f.id = p.facture_id
                       where f.compte_id = c.id and p.actif and (p_facture is null or f.id = p_facture)),
    'pdf_manquants', (select coalesce(jsonb_agg(f.numero order by f.numero), '[]'::jsonb) from public.cashd_factures f
                      where f.compte_id = c.id and f.nature in ('facture', 'acompte') and f.statut <> 'soldee' and (p_facture is null or f.id = p_facture)
                        and not exists (select 1 from public.cashd_pieces_jointes p where p.facture_id = f.id and p.actif and p.nature = 'facture_pdf')),
    'journal', (select coalesce(jsonb_agg(jsonb_build_object('le', j.survenu_le, 'action', j.action, 'par', j.acteur_libelle, 'donnees', j.donnees) order by j.id), '[]'::jsonb)
                from public.journal_opposable j
                where j.client_id = c.client_id and j.action like 'cashd.%'
                  and ((j.objet_type = 'cashd_comptes' and j.objet_id = c.id::text)
                       or (j.objet_type = 'cashd_factures' and j.objet_id in (select f.id::text from public.cashd_factures f where f.compte_id = c.id and (p_facture is null or f.id = p_facture)))
                       or (j.objet_type = 'cashd_relances' and j.objet_id in (select r.id::text from public.cashd_relances r where r.compte_id = c.id))))) end
  from (select 1) z left join public.cashd_comptes c on c.id = p_compte
$function$;

-- La fiche d'un compte (c2_04) : plus les réponses à trancher et les pièces jointes.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || (select jsonb_build_object('solde_decision', z.solde_decision, 'solde_decision_motif', z.solde_decision_motif,
                 'accord_oral_le', z.accord_oral_le, 'accord_note', z.accord_note, 'attente_commande_le', z.attente_commande_le,
                 'attente_commande_email', z.attente_commande_email, 'attente_commande_nom', z.attente_commande_nom,
                 'attente_commande_motif', z.attente_commande_motif) from public.cashd_factures z where z.id = f.id)
               order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f where f.compte_id = c.id),
    'reponses_lues', (select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) from public.cashd_reponses_lues x
                      where x.compte_id = c.id and x.statut = 'proposee'),
    'pieces_jointes', (select coalesce(jsonb_agg(to_jsonb(p) order by p.cree_le), '[]'::jsonb) from public.cashd_pieces_jointes p
                       join public.cashd_factures f on f.id = p.facture_id where f.compte_id = c.id and p.actif),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Droits
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function private.cashd_lire_reponse(text) from public, anon, authenticated;
revoke execute on function private.cashd_noter_reponse(uuid, bigint, text, text) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_reception(jsonb) from public, anon, authenticated;
grant execute on function private.cashd_suivre_reception(jsonb) to service_role;
revoke execute on function public.cashd_trancher_reponse(uuid, boolean, text) from public, anon;
revoke execute on function public.cashd_joindre_piece(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.cashd_trancher_reponse(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.cashd_joindre_piece(uuid, text, text, text, boolean) to authenticated, service_role;
