-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_04 : les textes de l'organisation, et quatre cas de la page (11/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ce que la page promet et que c2_01 → c2_03 ne tenaient qu'à moitié (omega/CHIFFRAGE/cashd.md) :
--   · G2 GABARITS — « Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le système à chaque
--     situation. » Chaque organisation écrit ses textes, palier par palier et langue par langue (cashd_gabarits,
--     porte cashd_ecrire_gabarit) ; les variables ({lignes}, {total}, {limite}…) sont remplies à chaque relance. Sans
--     gabarit propre, les textes par défaut s'appliquent ; ils sont eux-mêmes des gabarits, lisibles à l'écran
--     (cashd_gabarits) pour servir de point de départ. Une langue sans texte par défaut (allemand, espagnol…) devient
--     possible dès que l'organisation y écrit ses gabarits.
--   · G3 VARIATION — « Un client ne reçoit jamais deux fois le même texte. » Deux variantes par palier (trois au plus
--     pour une organisation) : un compte reçoit à chaque palier la variante suivante de celle qu'il a reçue la dernière
--     fois. La mise en demeure garde un texte unique (forme juridique). « Le ton suit le montant » : au-delà de
--     seuil_ton, la relance demande la date de règlement prévue. Le vocabulaire du métier (metier = 'btp') change la
--     fin des relances de devis (chantier, visite, date d'intervention).
--   · G21 MOYENS DE RÈGLEMENT — moyens_reglement (texte libre de l'organisation) et, au-delà d'echelonnement_des, la
--     proposition d'un règlement en plusieurs fois.
--   · G9 PETITS SOLDES — le seuil de relance se règle par entité (cashd_reglages_entites) ; un solde sous le seuil se
--     décide : abandonné (sort de toute relance) ou réclamé (relancé malgré le seuil), porte cashd_decider_solde.
--   · G8 ACCORD ORAL — cashd_consigner_accord : le devis accepté de vive voix sort de la cadence, et le point du matin
--     signale, passé suivi_facturation_jours, un accord qui n'a donné lieu à aucune facture.
--   · G7 BON DE COMMANDE — cashd_attendre_commande : la facture sort de la relance adressée à la comptabilité ; le
--     service qui doit émettre le bon reçoit sa propre relance tous les relance_commande_jours, par la même file de
--     validation (cashd_relances_commande) ; le retard continue de courir et reste lu partout.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; jamais de DROP ni
-- de DELETE. RLS sur toute table, revoke all puis grants ; vues security_invoker ; revoke execute de public sur les
-- fonctions privées. Les fonctions redéfinies gardent leur signature.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Colonnes
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.cashd_reglages add column if not exists seuil_ton numeric(14,2);
alter table public.cashd_reglages add column if not exists moyens_reglement text;
alter table public.cashd_reglages add column if not exists echelonnement_des numeric(14,2);
alter table public.cashd_reglages add column if not exists metier text not null default 'general';
alter table public.cashd_reglages add column if not exists relance_commande_jours smallint not null default 7;
alter table public.cashd_reglages add column if not exists suivi_facturation_jours smallint not null default 15;
alter table public.cashd_relances add column if not exists gabarit text;
alter table public.cashd_relances add column if not exists variante smallint;
alter table public.cashd_factures add column if not exists solde_decision text;
alter table public.cashd_factures add column if not exists solde_decision_le timestamptz;
alter table public.cashd_factures add column if not exists solde_decision_motif text;
alter table public.cashd_factures add column if not exists accord_oral_le date;
alter table public.cashd_factures add column if not exists accord_note text;
alter table public.cashd_factures add column if not exists attente_commande_le date;
alter table public.cashd_factures add column if not exists attente_commande_email text;
alter table public.cashd_factures add column if not exists attente_commande_nom text;
alter table public.cashd_factures add column if not exists attente_commande_motif text;

do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_c2_04_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_c2_04_check check (
      (seuil_ton is null or seuil_ton >= 0) and (echelonnement_des is null or echelonnement_des >= 0)
      and metier in ('general', 'btp') and relance_commande_jours between 1 and 60 and suivi_facturation_jours between 1 and 365
      and char_length(moyens_reglement) <= 400);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashd_factures_c2_04_check') then
    alter table public.cashd_factures add constraint cashd_factures_c2_04_check check (
      (solde_decision is null or solde_decision in ('abandonne', 'reclame'))
      and char_length(solde_decision_motif) <= 500 and char_length(accord_note) <= 500
      and char_length(attente_commande_email) <= 254 and char_length(attente_commande_nom) <= 200 and char_length(attente_commande_motif) <= 500
      and (attente_commande_le is null or attente_commande_email is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashd_relances_variante_check') then
    alter table public.cashd_relances add constraint cashd_relances_variante_check check (variante is null or variante between 1 and 3);
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Tables : gabarits, réglages par entité, relances des bons de commande
-- ═══════════════════════════════════════════════════════════════════════════

-- Les textes de l'organisation. cle : rappel, relance, mise_en_demeure, devis_rappel, devis_relance ; langue : code à
-- deux lettres ; variante 1 à 3. Un gabarit inactif rend la main au texte par défaut.
create table if not exists public.cashd_gabarits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cle text not null,
  langue text not null default 'fr',
  variante smallint not null default 1,
  sujet text not null,
  corps text not null,
  actif boolean not null default true,
  ecrit_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_gabarits_un unique (client_id, cle, langue, variante),
  constraint cashd_gabarits_check check (cle in ('rappel', 'relance', 'mise_en_demeure', 'devis_rappel', 'devis_relance')
    and langue ~ '^[a-z]{2}$' and variante between 1 and 3 and (cle <> 'mise_en_demeure' or variante = 1)
    and char_length(sujet) between 1 and 200 and char_length(corps) between 1 and 8000)
);

-- Le seuil de relance d'une entité (null : celui de l'organisation).
create table if not exists public.cashd_reglages_entites (
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  seuil_relance numeric(14,2),
  maj_le timestamptz not null default now(),
  primary key (entite_id),
  constraint cashd_reglages_entites_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint cashd_reglages_entites_check check (seuil_relance is null or seuil_relance >= 0)
);

-- La relance adressée au service qui doit émettre un bon de commande : une par facture et par jour, par la file.
create table if not exists public.cashd_relances_commande (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  compte_id uuid not null,
  facture_id uuid not null,
  jour date not null,
  destinataire_adresse text not null,
  destinataire_nom text,
  sujet text,
  corps text,
  demande_id uuid,
  envoi_id uuid,
  statut text not null default 'preparee',
  motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_relances_commande_un unique (facture_id, jour),
  constraint cashd_relances_commande_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_relances_commande_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id),
  constraint cashd_relances_commande_check check (statut in ('preparee', 'a_valider', 'non_reglee', 'bloquee', 'coupee', 'echec')
    and char_length(sujet) <= 300 and char_length(corps) <= 20000 and char_length(motif) <= 500 and char_length(destinataire_adresse) <= 254)
);
create index if not exists cashd_relances_commande_facture_idx on public.cashd_relances_commande (facture_id, jour desc);

alter table public.cashd_gabarits enable row level security;
alter table public.cashd_reglages_entites enable row level security;
alter table public.cashd_relances_commande enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_gabarits' and policyname = 'les membres lisent les gabarits de leur organisation') then
    create policy "les membres lisent les gabarits de leur organisation" on public.cashd_gabarits for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_reglages_entites' and policyname = 'les membres lisent les reglages de leurs entites') then
    create policy "les membres lisent les reglages de leurs entites" on public.cashd_reglages_entites for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_relances_commande' and policyname = 'les membres lisent les relances de bons de commande') then
    create policy "les membres lisent les relances de bons de commande" on public.cashd_relances_commande for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_comptes c where c.id = cashd_relances_commande.compte_id));
  end if;
end $do$;
revoke all on table public.cashd_gabarits, public.cashd_reglages_entites, public.cashd_relances_commande from anon, authenticated;
grant select on table public.cashd_gabarits, public.cashd_reglages_entites, public.cashd_relances_commande to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
               select x from unnest(array['cashd_gabarits', 'cashd_reglages_entites', 'cashd_relances_commande']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- L'historique daté des réglages (c2_03), plus les gabarits, les seuils par entité et les décisions de solde.
create or replace view public.cashd_historique_reglages with (security_invoker = true) as
select j.client_id, j.survenu_le, j.action, j.objet_type, j.objet_id, j.acteur_type, j.acteur_libelle, j.donnees
from public.journal_opposable j
where j.action in ('cashd.installe', 'cashd.reglages', 'cashd.reglages_relances', 'cashd.compte_regle', 'cashd.compte_statut', 'cashd.echeancier', 'cashd.plafond',
                   'cashd.gabarit', 'cashd.reglages_entite');
revoke all on table public.cashd_historique_reglages from anon, authenticated;
grant select on table public.cashd_historique_reglages to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Les gabarits : variables, textes par défaut, rendu
-- ═══════════════════════════════════════════════════════════════════════════

-- Le seuil de relance qui s'applique à une pièce : celui de son entité, sinon celui de l'organisation.
create or replace function private.cashd_seuil_relance(p_entite uuid, p_defaut numeric)
 returns numeric language sql stable security definer set search_path to ''
as $function$
  select coalesce((select y.seuil_relance from public.cashd_reglages_entites y where y.entite_id = p_entite), p_defaut, 0)
$function$;

-- Les variables d'un gabarit. Obligatoires : {lignes} partout ; {total} pour la relance ; {total} et {limite} pour la
-- mise en demeure.
create or replace function private.cashd_gabarit_variables()
 returns jsonb language sql immutable set search_path to ''
as $function$
  select '{
    "bonjour": "la salutation, avec le nom du contact de facturation",
    "emetteur": "le nom de votre entité",
    "compte": "la référence du compte, et son secteur",
    "lignes": "le détail des pièces : numéro, date, montant, échéance, retard, reste dû (obligatoire)",
    "total": "le total dû",
    "limite": "la date limite de règlement",
    "delai": "le délai de la mise en demeure, en jours",
    "nb": "le nombre de pièces",
    "numero": "le numéro de la première pièce",
    "retard_max": "le plus long retard, en jours",
    "objet": "l''objet court : « facture F-12 échue », « 3 factures échues »",
    "dues": "« la somme suivante reste due », « les sommes suivantes restent dues »… (accordé au nombre)",
    "oubli": "« Il s''agit sans doute d''un simple oubli. » quand le client paie d''habitude à l''heure, sinon rien",
    "ton_montant": "au-delà du seuil de ton, la demande de la date de règlement prévue, sinon rien",
    "droits": "les pénalités et l''indemnité forfaitaire dues, quand il y en a",
    "reglement": "vos moyens de règlement, et la proposition d''échelonnement au-delà du seuil réglé",
    "devis_suite": "la fin d''une relance de devis, au vocabulaire de votre métier"
  }'::jsonb
$function$;

-- Remplit un gabarit.
create or replace function private.cashd_rendre(p_gabarit text, p_vars jsonb)
 returns text language plpgsql immutable set search_path to ''
as $function$
declare k text; v text; t text := coalesce(p_gabarit, '');
begin
  for k, v in select x.key, x.value from jsonb_each_text(p_vars) x loop
    t := replace(t, '{' || k || '}', coalesce(v, ''));
  end loop;
  return t;
end $function$;

-- Le nombre de variantes par défaut d'un palier.
create or replace function private.cashd_variantes_defaut(p_cle text)
 returns integer language sql immutable set search_path to ''
as $function$ select case when p_cle = 'mise_en_demeure' then 1 else 2 end $function$;

-- Les textes par défaut, en gabarits. La variante 1 est, mot pour mot, le texte de c2_03 ; la variante 2 dit la même
-- chose autrement. Deux langues : fr, en.
create or replace function private.cashd_gabarit_defaut(p_cle text, p_langue text, p_variante integer)
 returns jsonb language plpgsql immutable set search_path to ''
as $function$
declare l text := case when p_langue = 'en' then 'en' else 'fr' end; v integer := least(greatest(coalesce(p_variante, 1), 1), private.cashd_variantes_defaut(p_cle));
begin
  if l = 'fr' then
    return case p_cle || ':' || v
      when 'rappel:1' then jsonb_build_object('sujet', '{emetteur} — rappel : {objet}',
        'corps', E'{bonjour}\n\nSauf erreur de notre part, {dues} sur votre compte {compte} :\n{lignes}\n{ton_montant}{oubli}Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.\n{reglement}')
      when 'rappel:2' then jsonb_build_object('sujet', '{emetteur} — {objet}, pour rappel',
        'corps', E'{bonjour}\n\nNous revenons vers vous au sujet de votre compte {compte}. À ce jour, {dues} :\n{lignes}\n{ton_montant}{oubli}Si vous avez déjà réglé, nos messages se sont simplement croisés et vous pouvez ignorer celui-ci. Une question ? Répondez simplement à ce courriel.\n{reglement}')
      when 'relance:1' then jsonb_build_object('sujet', '{emetteur} — relance : {total} restent dus',
        'corps', E'{bonjour}\n\nMalgré notre précédent rappel, {dues} sur votre compte {compte} :\n{lignes}\nTotal restant dû : {total}. Nous vous remercions de procéder au règlement au plus tard le {limite}.\n{ton_montant}{droits}Si vous contestez tout ou partie de ces montants, merci de nous l''écrire pour que nous l''examinions.\n{reglement}')
      when 'relance:2' then jsonb_build_object('sujet', '{emetteur} — {total} restent à régler',
        'corps', E'{bonjour}\n\nNotre premier rappel est resté sans suite, et {dues} sur votre compte {compte} :\n{lignes}\nLe total dû s''élève à {total}. Merci de le régler au plus tard le {limite}.\n{ton_montant}{droits}Si une partie de ces montants vous paraît contestable, écrivez-nous : nous l''examinerons.\n{reglement}')
      when 'mise_en_demeure:1' then jsonb_build_object('sujet', '{emetteur} — mise en demeure de payer {total}',
        'corps', E'{bonjour}\n\nMalgré nos précédentes relances, les sommes suivantes restent impayées (compte {compte}) :\n{lignes}\nPar la présente, nous vous mettons en demeure de régler la somme de {total} dans un délai de {delai} jours à compter de la réception de ce courrier, soit au plus tard le {limite}.\n{droits}À défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.\n')
      when 'devis_rappel:1' then jsonb_build_object('sujet', '{emetteur} — votre devis{objet}',
        'corps', E'{bonjour}\n\nNous vous avons adressé {dues} (compte {compte}) :\n{lignes}{devis_suite}')
      when 'devis_rappel:2' then jsonb_build_object('sujet', '{emetteur} — suite à notre devis{objet}',
        'corps', E'{bonjour}\n\nNous nous permettons de revenir vers vous : nous vous avons adressé {dues} (compte {compte}), et nous n''avons pas encore eu votre retour.\n{lignes}{devis_suite}')
      when 'devis_relance:1' then jsonb_build_object('sujet', '{emetteur} — votre devis{objet}',
        'corps', E'{bonjour}\n\nNous vous avons adressé {dues} (compte {compte}) :\n{lignes}{devis_suite}')
      when 'devis_relance:2' then jsonb_build_object('sujet', '{emetteur} — suite à notre devis{objet}',
        'corps', E'{bonjour}\n\nNous nous permettons de revenir vers vous : nous vous avons adressé {dues} (compte {compte}), et nous n''avons pas encore eu votre retour.\n{lignes}{devis_suite}')
    end;
  end if;
  return case p_cle || ':' || v
    when 'rappel:1' then jsonb_build_object('sujet', '{emetteur} — reminder: {objet} overdue',
      'corps', E'{bonjour}\n\nUnless we are mistaken, the following {dues} unpaid on your account {compte}:\n{lignes}\n{ton_montant}{oubli}If payment has already been made, please disregard this message. Should you have any question about this invoice, simply reply to this e-mail.\n{reglement}')
    when 'rappel:2' then jsonb_build_object('sujet', '{emetteur} — {objet} overdue: a friendly reminder',
      'corps', E'{bonjour}\n\nWe are writing about your account {compte}. As of today, the following {dues} unpaid:\n{lignes}\n{ton_montant}{oubli}If you have already paid, our messages have simply crossed and you can ignore this one. Any question? Just reply to this e-mail.\n{reglement}')
    when 'relance:1' then jsonb_build_object('sujet', '{emetteur} — second reminder: {total} outstanding',
      'corps', E'{bonjour}\n\nDespite our reminder, the following {dues} unpaid on your account {compte}:\n{lignes}\nTotal outstanding: {total}. Please settle it by {limite} at the latest.\n{ton_montant}{droits}If you dispute any part of these amounts, please let us know in writing so that we can look into it.\n{reglement}')
    when 'relance:2' then jsonb_build_object('sujet', '{emetteur} — {total} still to be paid',
      'corps', E'{bonjour}\n\nOur first reminder has gone unanswered, and the following {dues} unpaid on your account {compte}:\n{lignes}\nThe total due is {total}. Please pay it by {limite} at the latest.\n{ton_montant}{droits}If any part of these amounts seems disputable to you, write to us and we will look into it.\n{reglement}')
    when 'mise_en_demeure:1' then jsonb_build_object('sujet', '{emetteur} — formal notice to pay {total}',
      'corps', E'{bonjour}\n\nDespite our previous reminders, the following amounts remain unpaid (account {compte}):\n{lignes}\nWe hereby give you formal notice to pay the sum of {total} within {delai} days of receipt of this letter, that is by {limite} at the latest.\n{droits}Failing payment within this period, we will initiate recovery proceedings without further notice.\n')
    when 'devis_rappel:1' then jsonb_build_object('sujet', '{emetteur} — following up on our quote{objet}',
      'corps', E'{bonjour}\n\nWe sent you the following {dues} (account {compte}):\n{lignes}{devis_suite}')
    when 'devis_rappel:2' then jsonb_build_object('sujet', '{emetteur} — about our quote{objet}',
      'corps', E'{bonjour}\n\nWe are coming back to you about the following {dues} (account {compte}), on which we have not heard from you yet:\n{lignes}{devis_suite}')
    when 'devis_relance:1' then jsonb_build_object('sujet', '{emetteur} — following up on our quote{objet}',
      'corps', E'{bonjour}\n\nWe sent you the following {dues} (account {compte}):\n{lignes}{devis_suite}')
    when 'devis_relance:2' then jsonb_build_object('sujet', '{emetteur} — about our quote{objet}',
      'corps', E'{bonjour}\n\nWe are coming back to you about the following {dues} (account {compte}), on which we have not heard from you yet:\n{lignes}{devis_suite}')
  end;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Écrire le texte d'une relance (c2_03), par gabarit
-- ═══════════════════════════════════════════════════════════════════════════
-- Mêmes pièces, mêmes montants que c2_03. Le gabarit : celui de l'organisation pour la langue du compte s'il existe,
-- sinon le texte par défaut ; la variante : la suivante de celle que le compte a reçue au même palier.

create or replace function private.cashd_ecrire_texte(p_relance uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  v_emetteur text;
  v_l text;
  v_lt text;
  v_lignes text := '';
  v_total numeric := 0;
  v_pen numeric := 0;
  v_ind numeric := 0;
  v_n integer := 0;
  v_max_retard integer := 0;
  v_retardataire boolean;
  v_limite date;
  v_ref text;
  v_cle text;
  v_nvar integer;
  v_dernier integer;
  v_var integer;
  v_gab jsonb;
  v_vars jsonb;
  v_premier text;
  v_reglement text := '';
  v_ton text := '';
  v_droits text := '';
  v_suite text;
  v_corps text;
  p record;
begin
  select * into r from public.cashd_relances where id = p_relance;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  v_l := case when r.langue = 'en' then 'en' else 'fr' end;
  v_emetteur := coalesce((select e.nom from public.entites e where e.id = r.entite_id), (select x.nom from public.clients x where x.id = r.client_id));
  v_retardataire := private.cashd_payeur_en_retard(c.id);
  v_ref := c.reference || case when c.secteur is not null then case when v_l = 'en' then ', ' || c.secteur || ' sector' else ', secteur ' || c.secteur end else '' end;
  for p in
    select x.*, f.numero, f.date_emission, f.echeance, f.montant_ttc, f.devise,
           (select e.montant_conteste from public.cashd_factures_etat e where e.id = f.id) as conteste,
           (select count(*) from public.cashd_echeances k where k.facture_id = f.id and k.actif) as echeances,
           (select l.url from public.cashd_liens_paiement l where l.facture_id = f.id and l.statut = 'actif' order by l.cree_le desc limit 1) as lien
    from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id
    where x.relance_id = r.id and not x.annulee
    order by f.echeance nulls last, f.date_emission, f.numero
  loop
    v_n := v_n + 1;
    v_premier := coalesce(v_premier, p.numero);
    v_total := v_total + p.reste_du;
    v_pen := v_pen + p.penalites;
    v_ind := v_ind + p.indemnite;
    v_max_retard := greatest(v_max_retard, p.retard_jours);
    if r.nature = 'devis' then
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Quote %s of %s: %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l))
        else format(E'  • Devis %s du %s : %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l)) end;
    else
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Invoice %s of %s, %s incl. VAT, due on %s (%s days overdue): %s outstanding\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, private.cashd_eur(p.reste_du, v_l))
        else format(E'  • Facture %s du %s, %s TTC, échue le %s (%s jour%s de retard) : %s restant dus\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, case when p.retard_jours > 1 then 's' else '' end, private.cashd_eur(p.reste_du, v_l)) end;
      if p.echeances > 0 then
        v_lignes := v_lignes || case when v_l = 'en' then E'    (instalment of the agreed payment schedule)\n' else E'    (échéance de l''échéancier convenu)\n' end;
      end if;
      if coalesce(p.conteste, 0) > 0 then
        v_lignes := v_lignes || case when v_l = 'en' then format(E'    (%s under dispute are not claimed here)\n', private.cashd_eur(p.conteste, v_l))
                                     else format(E'    (%s contestés ne sont pas réclamés ici)\n', private.cashd_eur(p.conteste, v_l)) end;
      end if;
      if p.devise <> 'EUR' then
        v_lignes := v_lignes || format(E'    (%s)\n', p.devise);
      end if;
      if p.lien is not null then
        v_lignes := v_lignes || case when v_l = 'en' then '    Pay online: ' else '    Régler en ligne : ' end || p.lien || E'\n';
      end if;
    end if;
  end loop;
  v_limite := r.jour + g.delai_mise_en_demeure_jours;

  -- Le palier du texte, comme en c2_03.
  v_cle := case when r.nature = 'devis' then case when r.palier = 'devis_rappel' then 'devis_rappel' else 'devis_relance' end
                when r.palier = 'mise_en_demeure' then 'mise_en_demeure'
                when r.palier = 'rappel' or (select x.rang from public.cashd_relances_pieces x where x.relance_id = r.id and not x.annulee order by x.rang desc limit 1) = 1 then 'rappel'
                else 'relance' end;
  -- La langue du gabarit : celle du compte si l'organisation y a écrit ce palier, sinon fr / en.
  v_lt := case when exists (select 1 from public.cashd_gabarits x where x.client_id = r.client_id and x.cle = v_cle and x.langue = r.langue and x.actif)
               then r.langue else v_l end;
  v_nvar := (select count(*) from public.cashd_gabarits x where x.client_id = r.client_id and x.cle = v_cle and x.langue = v_lt and x.actif);
  if v_nvar = 0 then
    v_nvar := private.cashd_variantes_defaut(v_cle);
  end if;
  v_dernier := (select x.variante from public.cashd_relances x
                where x.compte_id = r.compte_id and x.id <> r.id and x.gabarit = v_cle and x.variante is not null
                order by x.jour desc, x.cree_le desc limit 1);
  v_var := case when v_dernier is null then 1 else (v_dernier % v_nvar) + 1 end;
  select jsonb_build_object('sujet', x.sujet, 'corps', x.corps) into v_gab
  from public.cashd_gabarits x where x.client_id = r.client_id and x.cle = v_cle and x.langue = v_lt and x.actif
  order by x.variante offset v_var - 1 limit 1;
  v_gab := coalesce(v_gab, private.cashd_gabarit_defaut(v_cle, v_l, v_var));

  -- Les phrases qui dépendent de la situation.
  if v_cle in ('rappel', 'relance') then
    if g.seuil_ton is not null and v_total >= g.seuil_ton then
      v_ton := case when v_l = 'en' then 'Given the amount involved, please let us know the expected payment date now. '
                    else 'Compte tenu du montant en jeu, merci de nous indiquer dès à présent la date de règlement prévue. ' end;
    end if;
    if g.moyens_reglement is not null then
      v_reglement := case when v_l = 'en' then 'You can pay ' else 'Vous pouvez régler ' end || rtrim(g.moyens_reglement, '. ') || E'.\n';
    end if;
    if g.echelonnement_des is not null and v_total >= g.echelonnement_des then
      v_reglement := v_reglement || case when v_l = 'en' then E'If paying in instalments would help, reply to us and we can agree on a schedule.\n'
                                         else E'Si un règlement en plusieurs fois vous aide, répondez-nous : nous pouvons convenir d''un échéancier.\n' end;
    end if;
  end if;
  if v_cle = 'relance' and v_ind > 0 then
    v_droits := case when v_l = 'en'
      then format(E'We remind you that any late payment entitles us to a fixed recovery fee of %s per invoice and to late payment interest (French Commercial Code, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l))
      else format(E'Nous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de %s par facture et des pénalités de retard (Code de commerce, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) end;
  elsif v_cle = 'mise_en_demeure' and (v_ind > 0 or v_pen > 0) then
    v_droits := case when v_l = 'en'
      then format(E'Under articles L441-10 and D441-5 of the French Commercial Code, late payment interest%s and a fixed recovery fee of %s per invoice (%s in total) are also due.\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' to date)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l))
      else format(E'En application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard%s et une indemnité forfaitaire pour frais de recouvrement de %s par facture (%s au total).\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' à ce jour)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l)) end;
  end if;
  v_suite := case v_l || ':' || g.metier || ':' || v_cle
    when 'fr:general:devis_rappel' then E'\nAvez-vous des questions, ou souhaitez-vous que nous l''ajustions ? Nous en parlerons volontiers.\n'
    when 'fr:general:devis_relance' then E'\nVotre réponse nous permettrait de planifier les travaux. Si le projet a changé, un mot suffit pour nous le dire.\n'
    when 'fr:btp:devis_rappel' then E'\nAvez-vous des questions sur le chantier, ou souhaitez-vous que nous passions voir les lieux pour ajuster le devis ? Nous pouvons aussi caler dès maintenant une date d''intervention.\n'
    when 'fr:btp:devis_relance' then E'\nVotre accord nous permettrait de réserver une date d''intervention dans notre planning de chantiers. Si le projet a changé, un mot suffit pour nous le dire.\n'
    when 'en:general:devis_rappel' then E'\nDo you have any questions, or would you like us to adjust anything? We will be glad to discuss it.\n'
    when 'en:general:devis_relance' then E'\nWe would be grateful for your decision so that we can plan the work. If the project has changed, a short reply is enough.\n'
    when 'en:btp:devis_rappel' then E'\nDo you have any questions about the work, or would you like us to visit the site to adjust the quote? We can also book a date for the job right away.\n'
    when 'en:btp:devis_relance' then E'\nYour go-ahead would let us book a date in our site schedule. If the project has changed, a short reply is enough.\n'
    else '' end;

  v_vars := jsonb_build_object(
    'bonjour', case when v_l = 'en' then 'Dear ' || coalesce(c.contact_facturation_nom, 'Sir or Madam') || ','
                    else 'Bonjour' || coalesce(' ' || c.contact_facturation_nom, ' Madame, Monsieur') || ',' end,
    'emetteur', v_emetteur, 'compte', v_ref, 'lignes', v_lignes, 'total', private.cashd_eur(v_total, v_l),
    'limite', private.cashd_date_texte(v_limite, v_l), 'delai', g.delai_mise_en_demeure_jours::text, 'nb', v_n::text,
    'numero', coalesce(v_premier, ''), 'retard_max', v_max_retard::text,
    'objet', case when r.nature = 'devis' then case when v_n > 1 then case when v_l = 'en' then 's' else ' (' || v_n || ')' end else ' ' || coalesce(v_premier, '') end
                  when v_l = 'en' then case when v_n > 1 then v_n || ' invoices' else 'invoice ' || coalesce(v_premier, '') end
                  else case when v_n > 1 then v_n || ' factures échues' else 'facture ' || coalesce(v_premier, '') || ' échue' end end,
    'dues', case v_l || ':' || v_cle
              when 'fr:rappel' then case when v_n > 1 then 'les sommes suivantes restent dues' else 'la somme suivante reste due' end
              when 'fr:relance' then case when v_n > 1 then 'les sommes suivantes restent impayées' else 'la somme suivante reste impayée' end
              when 'en:rappel' then case when v_n > 1 then 'amounts remain' else 'amount remains' end
              when 'en:relance' then case when v_n > 1 then 'amounts still remain' else 'amount still remains' end
              when 'fr:devis_rappel' then case when v_n > 1 then 'les devis suivants' else 'le devis suivant' end
              when 'fr:devis_relance' then case when v_n > 1 then 'les devis suivants' else 'le devis suivant' end
              when 'en:devis_rappel' then case when v_n > 1 then 'quotes' else 'quote' end
              when 'en:devis_relance' then case when v_n > 1 then 'quotes' else 'quote' end
              else case when v_l = 'en' then 'amounts remain' else 'les sommes suivantes restent dues' end end,
    'oubli', case when v_cle = 'rappel' and not v_retardataire and v_ton = '' then
                    case when v_l = 'en' then 'This is probably a simple oversight. ' else 'Il s''agit sans doute d''un simple oubli. ' end else '' end,
    'ton_montant', v_ton, 'droits', v_droits, 'reglement', v_reglement, 'devis_suite', v_suite);

  v_corps := private.cashd_rendre(v_gab ->> 'corps', v_vars)
             || E'\n' || coalesce(nullif(btrim(g.formule), ''), case when v_l = 'en' then 'Kind regards,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
             || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_emetteur) || E'\n';
  return jsonb_build_object('sujet', left(private.cashd_rendre(v_gab ->> 'sujet', v_vars), 300), 'corps', v_corps, 'montant', v_total,
                            'penalites', v_pen, 'indemnites', v_ind, 'retard_max', v_max_retard, 'pieces', v_n,
                            'gabarit', v_cle, 'variante', v_var);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Les portes
-- ═══════════════════════════════════════════════════════════════════════════

-- Écrire (ou désactiver) un gabarit de l'organisation. Gestion seulement ; chaque changement reste daté au journal.
create or replace function public.cashd_ecrire_gabarit(p_client uuid, p_cle text, p_langue text, p_variante integer, p_sujet text, p_corps text,
  p_actif boolean default true)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_uid uuid;
  v_inconnues text;
  v_manque text;
  v_tout text := coalesce(p_sujet, '') || ' ' || coalesce(p_corps, '');
  v_obligatoires text[];
  x public.cashd_gabarits;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  perform private.cashd_exiger_installe(p_client);
  if p_cle is null or p_cle not in ('rappel', 'relance', 'mise_en_demeure', 'devis_rappel', 'devis_relance') then
    raise exception 'Palier inconnu : rappel, relance, mise_en_demeure, devis_rappel ou devis_relance.' using errcode = '22023';
  end if;
  if coalesce(p_langue, '') !~ '^[a-z]{2}$' then
    raise exception 'La langue se donne en deux lettres (fr, en, de…).' using errcode = '22023';
  end if;
  if p_variante is null or p_variante not between 1 and (case when p_cle = 'mise_en_demeure' then 1 else 3 end) then
    raise exception 'Variante 1 à 3 (une seule pour la mise en demeure, dont la forme est juridique).' using errcode = '22023';
  end if;
  if coalesce(p_actif, true) then
    if nullif(btrim(p_sujet), '') is null or nullif(btrim(p_corps), '') is null then
      raise exception 'Un gabarit a un objet et un corps.' using errcode = '22023';
    end if;
    select string_agg(distinct m[1], ', ') into v_inconnues
    from regexp_matches(v_tout, '\{([a-z_]+)\}', 'g') m
    where not (private.cashd_gabarit_variables() ? m[1]);
    if v_inconnues is not null then
      raise exception 'Variable inconnue : {%}.', v_inconnues using errcode = '22023';
    end if;
    v_obligatoires := case p_cle when 'mise_en_demeure' then array['lignes', 'total', 'limite'] when 'relance' then array['lignes', 'total'] else array['lignes'] end;
    select string_agg('{' || o || '}', ', ') into v_manque from unnest(v_obligatoires) o where position('{' || o || '}' in p_corps) = 0;
    if v_manque is not null then
      raise exception 'Ce palier exige dans le corps : %.', v_manque using errcode = '22023';
    end if;
  end if;
  insert into public.cashd_gabarits (client_id, cle, langue, variante, sujet, corps, actif, ecrit_par)
  values (p_client, p_cle, p_langue, p_variante, coalesce(nullif(btrim(p_sujet), ''), '—'), coalesce(nullif(btrim(p_corps), ''), '—'), coalesce(p_actif, true), v_uid)
  on conflict (client_id, cle, langue, variante) do update
    set sujet = case when coalesce(p_actif, true) then excluded.sujet else cashd_gabarits.sujet end,
        corps = case when coalesce(p_actif, true) then excluded.corps else cashd_gabarits.corps end,
        actif = excluded.actif, ecrit_par = excluded.ecrit_par, maj_le = now()
  returning * into x;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.gabarit', 'cashd_gabarits', x.id::text,
    jsonb_build_object('cle', p_cle, 'langue', p_langue, 'variante', p_variante, 'actif', x.actif, 'sujet', x.sujet, 'corps', left(x.corps, 2000)), null);
  return to_jsonb(x);
end $function$;

-- Les textes de l'organisation, palier par palier : les siens, sinon ceux par défaut (point de départ), et la liste
-- des variables.
create or replace function public.cashd_gabarits(p_client uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare v_out jsonb := '[]'::jsonb; k text; l text; v integer; x public.cashd_gabarits; d jsonb;
begin
  if p_client is null or p_client not in (select private.mes_clients()) then
    raise exception 'Organisation hors de votre périmètre.' using errcode = '42501';
  end if;
  foreach k in array array['rappel', 'relance', 'mise_en_demeure', 'devis_rappel', 'devis_relance'] loop
    foreach l in array (select array_agg(distinct y) from unnest(array['fr', 'en'] || coalesce((select array_agg(distinct g.langue) from public.cashd_gabarits g
                                                                                                where g.client_id = p_client), '{}')) y) loop
      for v in 1 .. case when k = 'mise_en_demeure' then 1 else 3 end loop
        select * into x from public.cashd_gabarits g where g.client_id = p_client and g.cle = k and g.langue = l and g.variante = v;
        d := case when l in ('fr', 'en') and v <= private.cashd_variantes_defaut(k) then private.cashd_gabarit_defaut(k, l, v) end;
        continue when x.id is null and d is null;
        v_out := v_out || jsonb_build_object('cle', k, 'langue', l, 'variante', v,
          'personnalise', x.id is not null and x.actif, 'sujet', case when x.id is not null and x.actif then x.sujet else d ->> 'sujet' end,
          'corps', case when x.id is not null and x.actif then x.corps else d ->> 'corps' end,
          'defaut_sujet', d ->> 'sujet', 'defaut_corps', d ->> 'corps', 'maj_le', x.maj_le);
        x := null;
      end loop;
    end loop;
  end loop;
  return jsonb_build_object('gabarits', v_out, 'variables', private.cashd_gabarit_variables());
end $function$;

-- Le seuil de relance d'une entité (null : celui de l'organisation).
create or replace function public.cashd_regler_entite(p_entite uuid, p_seuil_relance numeric)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_client uuid; x public.cashd_reglages_entites;
begin
  select e.client_id into v_client from public.entites e where e.id = p_entite;
  if v_client is null then
    raise exception 'Entité introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(v_client, p_entite);
  perform private.cashd_exiger_installe(v_client);
  if p_seuil_relance is not null and p_seuil_relance < 0 then
    raise exception 'Un seuil de relance est positif.' using errcode = '23514';
  end if;
  insert into public.cashd_reglages_entites (client_id, entite_id, seuil_relance) values (v_client, p_entite, p_seuil_relance)
  on conflict (entite_id) do update set seuil_relance = excluded.seuil_relance, maj_le = now()
  returning * into x;
  perform private.journaliser_module(v_client, 'cashd', 'cashd.reglages_entite', 'entites', p_entite::text,
    jsonb_build_object('seuil_relance', p_seuil_relance), p_entite);
  return to_jsonb(x);
end $function$;

-- Décider d'un solde sous le seuil : 'abandonne' (sort de toute relance), 'reclame' (relancé malgré le seuil), ou null
-- (la règle du seuil reprend). Motif obligatoire.
create or replace function public.cashd_decider_solde(p_facture uuid, p_decision text, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_n integer := 0;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if f.nature not in ('facture', 'acompte') then
    raise exception 'Seul le solde d''une facture se décide.' using errcode = '22023';
  end if;
  if p_decision is not null and p_decision not in ('abandonne', 'reclame') then
    raise exception 'Décision : abandonne, reclame, ou rien pour revenir à la règle du seuil.' using errcode = '22023';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Une décision sur un solde se motive.' using errcode = '22023';
  end if;
  update public.cashd_factures set solde_decision = p_decision, solde_decision_le = case when p_decision is null then null else now() end,
         solde_decision_motif = left(btrim(p_motif), 500), maj_le = now()
   where id = p_facture returning * into f;
  if p_decision = 'abandonne' then
    v_n := private.cashd_couper(f.client_id, null, f.id, 'solde abandonné : ' || left(btrim(p_motif), 400));
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.solde_decide', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'decision', p_decision, 'motif', left(btrim(p_motif), 500), 'reste_du', private.cashd_reste(f.id)), f.entite_id);
  return jsonb_build_object('facture', f.id, 'decision', f.solde_decision, 'relances_coupees', v_n);
end $function$;

-- Consigner l'accord oral d'un client sur un devis : le devis est accepté (la cadence s'arrête, ses relances en attente
-- sont coupées), l'accord est daté et noté ; le point du matin suit la facturation à venir.
create or replace function public.cashd_consigner_accord(p_devis uuid, p_note text, p_le date default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_le date; v_n integer;
begin
  select * into f from public.cashd_factures where id = p_devis for update;
  if not found or f.nature <> 'devis' then
    raise exception 'Devis introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if nullif(btrim(p_note), '') is null then
    raise exception 'Un accord oral se consigne avec une note : qui, quand, comment.' using errcode = '22023';
  end if;
  v_le := coalesce(p_le, (now() at time zone 'Europe/Paris')::date);
  if v_le > (now() at time zone 'Europe/Paris')::date or v_le < f.date_emission then
    raise exception 'La date de l''accord se situe entre l''envoi du devis et aujourd''hui.' using errcode = '22023';
  end if;
  update public.cashd_factures set statut = 'accepte', accord_oral_le = v_le, accord_note = left(btrim(p_note), 500), maj_le = now()
   where id = p_devis returning * into f;
  v_n := private.cashd_couper(f.client_id, null, f.id, 'devis accepté de vive voix le ' || to_char(v_le, 'DD/MM/YYYY'));
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.accord_oral', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'le', v_le, 'note', left(btrim(p_note), 500)), f.entite_id);
  return jsonb_build_object('devis', f.id, 'statut', f.statut, 'accord_oral_le', v_le, 'relances_coupees', v_n);
end $function$;

-- Une facture attend un bon de commande chez le client : elle sort de la relance adressée à la comptabilité, le service
-- émetteur du bon reçoit sa propre relance. p_email null : le bon est arrivé, la facture reprend son cycle.
create or replace function public.cashd_attendre_commande(p_facture uuid, p_email text, p_nom text, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_n integer := 0; r record;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found or f.nature not in ('facture', 'acompte') then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if p_email is not null then
    if btrim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'L''adresse du service qui émet le bon de commande n''est pas une adresse de courriel.' using errcode = '22023';
    end if;
    if nullif(btrim(p_motif), '') is null then
      raise exception 'Le motif de blocage se consigne (par exemple : « bon de commande attendu du service achats »).' using errcode = '22023';
    end if;
    update public.cashd_factures set attente_commande_le = coalesce(attente_commande_le, (now() at time zone 'Europe/Paris')::date),
           attente_commande_email = lower(btrim(p_email)), attente_commande_nom = nullif(btrim(p_nom), ''), attente_commande_motif = left(btrim(p_motif), 500),
           maj_le = now()
     where id = p_facture returning * into f;
    v_n := private.cashd_couper(f.client_id, null, f.id, 'en attente d''un bon de commande : la relance va au service qui l''émet');
  else
    update public.cashd_factures set attente_commande_le = null, attente_commande_email = null, attente_commande_nom = null, attente_commande_motif = null,
           maj_le = now()
     where id = p_facture returning * into f;
    -- Les relances du bon encore en attente tombent.
    for r in select x.* from public.cashd_relances_commande x where x.facture_id = f.id and x.statut in ('preparee', 'a_valider', 'non_reglee', 'bloquee') loop
      if r.demande_id is not null then
        update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
      end if;
      update public.cashd_relances_commande set statut = 'coupee', motif = 'bon de commande reçu', maj_le = now() where id = r.id;
      v_n := v_n + 1;
    end loop;
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.attente_commande', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'email', f.attente_commande_email, 'nom', f.attente_commande_nom, 'motif', coalesce(f.attente_commande_motif, p_motif),
                       'depuis', f.attente_commande_le), f.entite_id);
  return jsonb_build_object('facture', f.id, 'attente_commande_le', f.attente_commande_le, 'relances_coupees', v_n);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Les relances des bons de commande attendus
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_relancer_commandes(p_client uuid, p_jour date)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  f record;
  v_l text;
  v_emetteur text;
  v_sujet text;
  v_corps text;
  v_id uuid;
  v_demande uuid;
  v_envoi uuid;
  v_mode_envoi text;
  v_mot text;
  v_interdit text;
  n integer := 0;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  if not found then
    return 0;
  end if;
  begin
    v_mode_envoi := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode_envoi := null;
  end;
  for f in
    select x.*, c.nom as compte_nom, c.langue as compte_langue, c.reference as compte_reference
    from public.cashd_factures x join public.cashd_comptes c on c.id = x.compte_id
    where x.client_id = p_client and x.attente_commande_le is not null and x.statut = 'ouverte' and c.statut = 'actif'
      and x.echeance < p_jour
      and not exists (select 1 from public.cashd_relances_commande r where r.facture_id = x.id and r.statut <> 'coupee'
                      and r.jour > p_jour - g.relance_commande_jours)
    order by x.attente_commande_le, x.numero
  loop
    v_l := case when f.compte_langue = 'en' then 'en' else 'fr' end;
    v_emetteur := coalesce((select e.nom from public.entites e where e.id = f.entite_id), (select x.nom from public.clients x where x.id = p_client));
    if v_l = 'en' then
      v_sujet := format('%s — purchase order needed for invoice %s', v_emetteur, f.numero);
      v_corps := format(E'Dear %s,\n\nWe issued invoice %s on %s, %s incl. VAT, for %s. Its payment is waiting for a purchase order from your side (%s).\n\nCould you send it to us, or tell us who issues it? Simply reply to this e-mail.\n',
                        coalesce(f.attente_commande_nom, 'Sir or Madam'), f.numero, private.cashd_date_texte(f.date_emission, v_l), private.cashd_eur(f.montant_ttc, v_l),
                        f.compte_nom, f.attente_commande_motif);
    else
      v_sujet := format('%s — bon de commande attendu pour la facture %s', v_emetteur, f.numero);
      v_corps := format(E'Bonjour%s,\n\nNous avons émis le %s la facture %s, d''un montant de %s TTC, à l''attention de %s. Son règlement attend un bon de commande de votre part (%s).\n\nPourriez-vous nous l''adresser, ou nous indiquer qui l''émet ? Il vous suffit de répondre à ce courriel.\n',
                        coalesce(' ' || f.attente_commande_nom, ' Madame, Monsieur'), private.cashd_date_texte(f.date_emission, v_l), f.numero,
                        private.cashd_eur(f.montant_ttc, v_l), f.compte_nom, f.attente_commande_motif);
    end if;
    v_corps := v_corps || E'\n' || coalesce(nullif(btrim(g.formule), ''), case when v_l = 'en' then 'Kind regards,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
               || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_emetteur) || E'\n';
    insert into public.cashd_relances_commande (client_id, entite_id, compte_id, facture_id, jour, destinataire_adresse, destinataire_nom, sujet, corps)
    values (p_client, f.entite_id, f.compte_id, f.id, p_jour, f.attente_commande_email, f.attente_commande_nom, v_sujet, v_corps)
    on conflict (facture_id, jour) do nothing
    returning id into v_id;
    continue when v_id is null;
    v_interdit := null;
    foreach v_mot in array g.interdits loop
      if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower(v_sujet || ' ' || v_corps)) > 0 then
        v_interdit := v_mot;
        exit;
      end if;
    end loop;
    if v_interdit is not null then
      update public.cashd_relances_commande set statut = 'bloquee', motif = format('le message contient un mot interdit par vos règles : « %s »', v_interdit) where id = v_id;
      continue;
    end if;
    begin
      insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, echeance, cle_idempotence)
      values (p_client, f.entite_id, 'cashd', 'cashd.bon_commande', 'cashd_relances_commande', v_id::text,
        left(case when g.mode = 'essai' then 'Essai — ' else '' end || 'Bon de commande attendu : ' || f.compte_nom || ', facture ' || f.numero, 500),
        jsonb_build_object('relance_commande', v_id, 'facture', f.id, 'mode', g.mode,
          'destinataire', jsonb_build_object('nom', f.attente_commande_nom, 'adresse', f.attente_commande_email), 'sujet', v_sujet, 'corps', v_corps),
        (p_jour + 7)::timestamptz, 'cashd:commande:' || v_id::text)
      returning id into v_demande;
    exception when others then
      update public.cashd_relances_commande set statut = 'echec', motif = left('la demande de validation n''a pas pu être déposée : ' || sqlstate || ' ' || sqlerrm, 500) where id = v_id;
      continue;
    end;
    update public.cashd_relances_commande set demande_id = v_demande, statut = 'a_valider', maj_le = now() where id = v_id;
    perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_commande_preparee', 'cashd_relances_commande', v_id::text,
      jsonb_build_object('facture', f.numero, 'destinataire', f.attente_commande_email, 'demande', v_demande, 'jour', p_jour), f.entite_id);
    if v_mode_envoi is null then
      update public.cashd_relances_commande set statut = 'non_reglee',
        motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable' where id = v_id;
    else
      begin
        v_envoi := private.preparer_envoi(p_client, 'cashd', 'cashd_relances_commande', v_id::text, 'email',
          jsonb_build_object('adresse', f.attente_commande_email, 'nom', coalesce(f.attente_commande_nom, f.compte_nom), 'ref', f.compte_reference,
                             'professionnel', true, 'langue', f.compte_langue),
          null, '{}'::jsonb, v_sujet, v_corps, null::uuid[], 'cashd:commande:' || v_id::text, f.entite_id, true, false,
          null::timestamptz, jsonb_build_object('demande', v_demande));
        update public.cashd_relances_commande set envoi_id = v_envoi, maj_le = now() where id = v_id;
      exception when others then
        update public.cashd_relances_commande set motif = left('le message n''a pas pu être préparé : ' || sqlstate || ' ' || sqlerrm, 500) where id = v_id;
      end;
    end if;
    n := n + 1;
  end loop;
  return n;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Fonctions redéfinies (copies des dernières définitions, patchées)
-- ═══════════════════════════════════════════════════════════════════════════

-- Relire avant d'envoyer (c2_02), avec le seuil de l'entité, les soldes abandonnés et les bons de commande attendus.
create or replace function private.cashd_verifier_relances(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  g public.cashd_reglages;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  for r in
    select distinct x.id, x.compte_id,
      case when c.statut <> 'actif' or c.reciproque then 'compte ' || replace(c.statut, '_', ' ')
           else 'facture ' || f.numero || case when f.statut = 'litige' then ' en litige'
                                                when f.nature = 'devis' and f.statut <> 'en_attente' then ' : devis ' || f.statut
                                                when f.solde_decision = 'abandonne' then ' : solde abandonné'
                                                when f.attente_commande_le is not null then ' : en attente d''un bon de commande'
                                                else ' réglée ou sortie de l''export' end end as motif,
      p.facture_id
    from public.cashd_relances x
    join public.cashd_comptes c on c.id = x.compte_id
    join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
    join public.cashd_factures f on f.id = p.facture_id
    where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and (c.statut <> 'actif' or c.reciproque
           or (f.nature = 'devis' and f.statut <> 'en_attente')
           or (f.nature <> 'devis' and (f.statut <> 'ouverte' or f.solde_decision = 'abandonne' or f.attente_commande_le is not null
                                        or (private.cashd_reste(f.id) <= greatest(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 0.005)
                                            and f.solde_decision is distinct from 'reclame'))))
  loop
    n := n + private.cashd_couper(p_client, null, r.facture_id, 'avant l''envoi : ' || r.motif);
  end loop;
  return n;
end $function$;

-- Préparer les relances (c2_03), mêmes règles ; le gabarit et la variante retenus sont gardés sur la relance.
create or replace function private.cashd_preparer_relances(p_client uuid, p_jour date, p_par uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  c record;
  f record;
  v_rel uuid;
  v_nature text;
  v_texte jsonb;
  v_pen jsonb;
  v_demande uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_type text;
  v_palier_max text;
  v_rang_max integer;
  v_mot text;
  v_n_prep integer := 0;
  v_n_bloq integer := 0;
  v_n_coupees integer;
  v_mode_envoi text;
  v_interdit text;
  v_erreur text;
  v_canal text;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  if not found then
    return jsonb_build_object('installe', false);
  end if;
  -- Relire avant d'écrire : ce qui a été réglé depuis hier coupe ce qui était prêt.
  v_n_coupees := private.cashd_verifier_relances(p_client);
  begin
    v_mode_envoi := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode_envoi := null;
  end;

  foreach v_nature in array array['facture', 'devis'] loop
    for c in
      select x.* from public.cashd_comptes x
      where x.client_id = p_client and x.statut = 'actif' and not x.reciproque
        and not exists (select 1 from public.cashd_relances r where r.compte_id = x.id and r.jour = p_jour and r.nature = v_nature)
        -- un règlement du compte reste à lettrer : la séquence attend l'imputation
        and not (v_nature = 'facture' and exists (select 1 from public.cashd_reglements_etat e where e.compte_id = x.id and e.a_imputer > 0))
      order by x.nom
    loop
      v_rel := null;
      -- Les avoirs ouverts du compte sont déduits avant tout calcul du solde dû : imputés sur ses factures échues, de la
      -- plus ancienne à la plus récente (lettrage automatique, journalisé).
      if v_nature = 'facture' then
        for f in
          select a.id as avoir_id, x.id as facture_id
          from public.cashd_factures a
          cross join lateral (select y.id from public.cashd_factures_etat y
                              where y.compte_id = c.id and y.nature in ('facture', 'acompte') and y.statut = 'ouverte' and y.reste_du > 0
                                and y.echeance < p_jour order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
      end if;
      for f in
        select s.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = s.palier_suivant limit 1)::integer as rang
        from public.cashd_suivi s
        where s.compte_id = c.id and s.palier_suivant is not null and s.palier_suivant_le <= p_jour
          and s.etat_sequence in ('pas_encore_relancee', 'en_cours')
          and ((v_nature = 'facture' and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
                and ((select e.reste_relancable from public.cashd_factures_etat e where e.id = s.facture_id) > private.cashd_seuil_relance(c.entite_id, g.seuil_relance)
                     or exists (select 1 from public.cashd_factures z where z.id = s.facture_id and z.solde_decision = 'reclame'))
                and not exists (select 1 from public.cashd_factures z where z.id = s.facture_id
                                and (z.solde_decision = 'abandonne' or z.attente_commande_le is not null)))
               or (v_nature = 'devis' and s.nature = 'devis'))
        order by s.echeance nulls last, s.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_suivant, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_suivant, f.rang,
                case when v_nature = 'devis' then f.montant_ttc else (select e.reste_relancable from public.cashd_factures_etat e where e.id = f.facture_id) end,
                coalesce((v_pen ->> 'retard_jours')::integer, 0), coalesce((v_pen ->> 'penalites')::numeric, 0), coalesce((v_pen ->> 'indemnite')::numeric, 0));
      end loop;
      continue when v_rel is null;

      -- Le palier du message : le plus ferme de ses factures.
      select p.palier, p.rang into v_palier_max, v_rang_max from public.cashd_relances_pieces p where p.relance_id = v_rel order by p.rang desc limit 1;
      update public.cashd_relances set palier = v_palier_max where id = v_rel;
      v_texte := private.cashd_ecrire_texte(v_rel);
      update public.cashd_relances set sujet = v_texte ->> 'sujet', corps = v_texte ->> 'corps', montant = (v_texte ->> 'montant')::numeric,
             gabarit = v_texte ->> 'gabarit', variante = (v_texte ->> 'variante')::smallint,
             penalites = (v_texte ->> 'penalites')::numeric, indemnites = (v_texte ->> 'indemnites')::numeric, maj_le = now()
       where id = v_rel;

      if c.contact_facturation_email is null then
        update public.cashd_relances set statut = 'sans_adresse', motif = 'le compte n''a pas d''adresse de facturation : relancez-le vous-même ou complétez sa fiche' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s est écrite mais ne peut pas partir : le compte n''a pas d''adresse de facturation.', c.nom),
          jsonb_build_object('compte', c.id, 'relance', v_rel), 'relance:sans_adresse:' || c.id::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Les interdits de l'organisation : un message qui en contient un ne part pas.
      v_interdit := null;
      foreach v_mot in array g.interdits loop
        if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower((v_texte ->> 'sujet') || ' ' || (v_texte ->> 'corps'))) > 0 then
          v_interdit := v_mot;
          exit;
        end if;
      end loop;
      if v_interdit is not null then
        update public.cashd_relances set statut = 'bloquee', motif = format('le message contient un mot interdit par vos règles : « %s »', v_interdit) where id = v_rel;
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;
      -- La demande de validation, avec son montant (le seuil de la direction s'y applique).
      v_type := case when v_nature = 'devis' then 'cashd.devis' when v_palier_max = 'mise_en_demeure' then 'cashd.mise_en_demeure' else 'cashd.relance' end;
      -- La mise en demeure part en lettre recommandée électronique au-delà du seuil réglé (tiers : AR24, branché par le socle).
      v_canal := case when v_type = 'cashd.mise_en_demeure' and g.seuil_lre is not null and (v_texte ->> 'montant')::numeric >= g.seuil_lre then 'lre' else 'email' end;
      update public.cashd_relances set canal = v_canal,
             lien_paiement = (select l.url from public.cashd_relances_pieces x join public.cashd_liens_paiement l on l.facture_id = x.facture_id and l.statut = 'actif'
                              where x.relance_id = v_rel and not x.annulee order by l.cree_le desc limit 1)
       where id = v_rel;
      begin
        insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
        values (p_client, c.entite_id, 'cashd', v_type, 'cashd_relances', v_rel::text,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end
               || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_texte ->> 'montant')::numeric), 500),
          case when v_nature = 'devis' then null else (v_texte ->> 'montant')::numeric end,
          jsonb_build_object('relance', v_rel, 'canal', v_canal, 'mode', g.mode, 'palier', v_palier_max,
            'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
            'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
            'sujet', v_texte ->> 'sujet', 'corps', v_texte ->> 'corps',
            'penalites', (v_texte ->> 'penalites')::numeric, 'indemnites', (v_texte ->> 'indemnites')::numeric,
            'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end),
          (p_jour + 7)::timestamptz, 'cashd:relance:' || v_rel::text)
        returning id, statut, politique_id into v_demande, v_dstatut, v_dpolitique;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set statut = 'echec', motif = left('la demande de validation n''a pas pu être déposée : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('La relance de %s n''a pas pu entrer dans la file de validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:echec:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end;
      update public.cashd_relances set demande_id = v_demande, statut = 'a_valider', maj_le = now() where id = v_rel;
      -- Toute relance écrite et déposée dans la file est au journal, quel que soit le réglage d'envoi.
      perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_preparee', 'cashd_relances', v_rel::text,
        jsonb_build_object('compte', c.reference, 'palier', v_palier_max, 'montant', (v_texte ->> 'montant')::numeric, 'pieces', (v_texte ->> 'pieces')::integer,
                           'demande', v_demande, 'jour', p_jour), c.entite_id);

      -- La mise en demeure exige une validation explicite : un accord permanent ne la couvre jamais.
      if v_type = 'cashd.mise_en_demeure' and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : une mise en demeure exige une validation explicite, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La mise en demeure de %s n''a pas été préparée : un accord permanent couvre les relances CASHD, et une mise en demeure exige une validation explicite.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:med_accord:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Le message, adossé à la demande : il ne part que si elle est approuvée.
      if v_mode_envoi is null then
        update public.cashd_relances set statut = 'non_reglee',
          motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé' where id = v_rel;
        v_n_prep := v_n_prep + 1;
        continue;
      end if;
      begin
        v_envoi := private.preparer_envoi(p_client, 'cashd', 'cashd_relances', v_rel::text, v_canal,
          jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                             'professionnel', not c.particulier, 'langue', c.langue),
          null, '{}'::jsonb, v_texte ->> 'sujet', v_texte ->> 'corps', null::uuid[], 'cashd:relance:' || v_rel::text, c.entite_id, true, false,
          null::timestamptz, jsonb_build_object('demande', v_demande));
        update public.cashd_relances set envoi_id = v_envoi, maj_le = now() where id = v_rel;
        v_n_prep := v_n_prep + 1;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('Le message de relance de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:envoi:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
      end;
    end loop;
  end loop;
  perform private.battre(p_client, 'cashd_relances', jsonb_build_object('jour', p_jour, 'preparees', v_n_prep), interval '1 day');
  return jsonb_build_object('jour', p_jour, 'preparees', v_n_prep, 'bloquees', v_n_bloq, 'coupees', v_n_coupees, 'mode_envoi', v_mode_envoi);
end $function$;

-- Le point du matin (c2_03), plus les devis acceptés de vive voix et les bons de commande attendus.
create or replace function private.cashd_point_lignes(p_client uuid, p_jour date)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  r record;
  n integer := 0;
  v_a_valider integer;
  v_med integer;
  v_dernier timestamptz;
begin
  -- 1. Ce qui attend la validation ce matin.
  select count(*), count(*) filter (where x.palier = 'mise_en_demeure') into v_a_valider, v_med
  from public.cashd_relances x
  where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee')
    and (x.demande_id is null or exists (select 1 from public.demandes_validation d where d.id = x.demande_id and d.statut = 'en_attente'));
  if v_a_valider > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s relance%s écrite%s attend%s votre validation%s', v_a_valider,
        case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 'ent' else '' end,
        case when v_med > 0 then format(', dont %s mise%s en demeure', v_med, case when v_med > 1 then 's' else '' end) else '' end),
      'gravite', case when v_med > 0 then 'attention' else 'info' end, 'lien', '/espace/cashd');
  end if;
  -- 2. Le facturier relu ce matin ?
  select max(f.vue_le) into v_dernier from public.cashd_factures f where f.client_id = p_client and f.source in ('export', 'import');
  if exists (select 1 from public.branchements b where b.client_id = p_client and b.module = 'cashd' and b.statut = 'actif')
     and (v_dernier is null or (v_dernier at time zone 'Europe/Paris')::date < p_jour) then
    v_items := v_items || jsonb_build_object('texte', format('Le facturier n''a pas été relu ce matin%s : les relances partent de l''état connu',
        case when v_dernier is not null then ' (dernier export lu le ' || to_char(v_dernier at time zone 'Europe/Paris', 'DD/MM/YYYY') || ')' else '' end),
      'gravite', 'attention', 'lien', '/espace/cashd');
  end if;
  -- 3. Qui doit quoi, où en est la relance (les comptes les plus en retard d'abord).
  for r in
    select b.*, (select s.palier_atteint from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_atteint is not null
                 order by s.palier_atteint_le desc nulls last limit 1) as palier,
                (select min(s.palier_suivant_le) from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_suivant is not null) as prochain
    from public.cashd_balance_agee b
    where b.client_id = p_client and b.echu > 0
    order by b.echu_plus_90 + b.echu_61_90 desc, b.echu desc
    limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s doit %s échus (retard le plus ancien : %s jours)%s%s', r.nom, private.cashd_eur(r.echu),
        r.retard_max_jours,
        case when r.statut <> 'actif' then ' — compte ' || replace(r.statut, '_', ' ') else
          case when r.palier is not null then ' — dernier palier : ' || replace(r.palier, '_', ' ') else ' — pas encore relancé' end
          || case when r.prochain is not null then ', suivant le ' || to_char(r.prochain, 'DD/MM') else '' end end,
        case when r.plafond_encours is not null and r.encours > r.plafond_encours then ' ; plafond d''encours dépassé' else '' end), 300),
      'gravite', case when r.retard_max_jours > 60 then 'critique' when r.retard_max_jours > 30 then 'attention' else 'info' end,
      'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
    n := n + 1;
  end loop;
  -- 4. Les règlements à lettrer.
  for r in
    select count(*) as n, sum(e.a_imputer) as montant from public.cashd_reglements_etat e where e.client_id = p_client and e.a_imputer > 0 having count(*) > 0
  loop
    v_items := v_items || jsonb_build_object('texte', format('%s règlement%s à rapprocher (%s) : la relance des comptes concernés attend', r.n,
        case when r.n > 1 then 's' else '' end, private.cashd_eur(r.montant)), 'gravite', 'attention', 'lien', '/espace/cashd');
  end loop;
  -- 5. Les comptes au-dessus de leur plafond.
  for r in select b.nom, b.encours, b.plafond_encours, b.compte_id from public.cashd_balance_agee b
           where b.client_id = p_client and b.plafond_encours is not null and b.encours > b.plafond_encours order by b.encours - b.plafond_encours desc limit 5 loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s : encours %s pour un plafond de %s — à voir avant toute nouvelle commande', r.nom,
        private.cashd_eur(r.encours), private.cashd_eur(r.plafond_encours)), 300),
      'gravite', 'attention', 'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 6. Les comptes qui se dégradent (c2_03).
  for r in select d.nom, d.compte_id, d.delai_recent_jours, d.delai_moyen_jours, d.retard_actuel_jours, d.retard_moyen_jours
           from public.cashd_delais_reglement d where d.client_id = p_client and d.se_degrade order by d.retard_actuel_jours desc limit 5 loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s se dégrade : %s', r.nom,
        case when r.delai_recent_jours > r.delai_moyen_jours + 10 then format('il paie en %s jours ces trois derniers mois, contre %s jours d''habitude', round(r.delai_recent_jours), round(r.delai_moyen_jours))
             else format('%s jours de retard aujourd''hui, contre %s jours en moyenne', r.retard_actuel_jours, round(coalesce(r.retard_moyen_jours, 0))) end), 300),
      'gravite', 'attention', 'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 7. Les devis acceptés de vive voix qui ne sont pas encore facturés (c2_04) : l'accord consigné ouvre ce suivi.
  for r in
    select d.id, d.numero, d.accord_oral_le, d.montant_ttc, c.nom, c.id as compte_id
    from public.cashd_factures d
    join public.cashd_comptes c on c.id = d.compte_id
    join public.cashd_reglages g on g.client_id = d.client_id
    where d.client_id = p_client and d.nature = 'devis' and d.accord_oral_le is not null
      and d.accord_oral_le <= p_jour - g.suivi_facturation_jours
      and not exists (select 1 from public.cashd_factures f where f.compte_id = d.compte_id and f.nature in ('facture', 'acompte')
                      and f.date_emission >= d.accord_oral_le)
    order by d.accord_oral_le limit 5
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('Devis %s de %s (%s), accepté de vive voix le %s : rien n''est encore facturé',
        r.numero, r.nom, private.cashd_eur(r.montant_ttc), to_char(r.accord_oral_le, 'DD/MM/YYYY')), 300),
      'gravite', 'attention', 'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 8. Les factures qui attendent un bon de commande (c2_04) : le retard continue de courir.
  for r in
    select f.numero, f.attente_commande_le, f.attente_commande_nom, f.attente_commande_email, c.nom, c.id as compte_id,
           greatest(p_jour - f.echeance, 0) as retard
    from public.cashd_factures f join public.cashd_comptes c on c.id = f.compte_id
    where f.client_id = p_client and f.attente_commande_le is not null and f.statut = 'ouverte'
    order by f.attente_commande_le limit 5
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('Facture %s de %s : attend un bon de commande depuis le %s (%s) ; %s jour%s de retard',
        r.numero, r.nom, to_char(r.attente_commande_le, 'DD/MM/YYYY'), coalesce(r.attente_commande_nom, r.attente_commande_email),
        r.retard, case when r.retard > 1 then 's' else '' end), 300),
      'gravite', 'info', 'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  return v_items;
end $function$;

-- Le passage du matin (c2_03), plus les relances des bons de commande attendus.
create or replace function private.cashd_passage(p_maintenant timestamptz default now())
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  g record;
  v_jour date := (p_maintenant at time zone 'Europe/Paris')::date;
  v_bilan jsonb;
  v_items jsonb;
  v_role text;
  v_terr text;
  v_ouvre boolean;
  r record;
  n integer := 0;
begin
  for g in select x.* from public.cashd_reglages x
           where (p_maintenant at time zone 'Europe/Paris')::time >= x.heure_relances
             and not exists (select 1 from public.cashd_passages p where p.client_id = x.client_id and p.jour = v_jour)
           order by x.client_id loop
    begin
      -- Un jour ouvré du territoire de l'organisation seulement (calendrier du socle : week-ends et jours fériés locaux).
      begin
        v_terr := public.territoire_de_entite(g.client_id, (select e.id from public.entites e where e.client_id = g.client_id and e.principale));
        v_ouvre := public.jour_ouvre(v_jour, coalesce(v_terr, 'metropole'));
      exception when others then
        v_ouvre := extract(isodow from v_jour) < 6;
      end;
      if not coalesce(v_ouvre, true) then
        insert into public.cashd_passages (client_id, jour, bilan) values (g.client_id, v_jour, jsonb_build_object('jour_non_ouvre', true, 'territoire', v_terr))
        on conflict do nothing;
        continue;
      end if;
      v_bilan := private.cashd_preparer_relances(g.client_id, v_jour, null);
      v_bilan := v_bilan || jsonb_build_object('plafonds', private.cashd_alerter_plafonds(g.client_id));
      v_bilan := v_bilan || jsonb_build_object('commandes', private.cashd_relancer_commandes(g.client_id, v_jour));
      -- À date fixe : l'arrêté de la balance âgée du mois (jour réglé), téléchargeable en tableur depuis l'écran.
      -- (le premier jour ouvré à partir du jour réglé, une fois par mois)
      if extract(day from v_jour)::int >= g.arrete_jour
         and not exists (select 1 from public.cashd_arretes a where a.client_id = g.client_id and date_trunc('month', a.jour) = date_trunc('month', v_jour)) then
        insert into public.cashd_arretes (client_id, jour, balance, totaux)
        select g.client_id, v_jour, coalesce(jsonb_agg(to_jsonb(b) order by b.echu desc, b.nom), '[]'::jsonb),
               jsonb_build_object('encours', coalesce(sum(b.encours), 0), 'echu', coalesce(sum(b.echu), 0), 'en_litige', coalesce(sum(b.en_litige), 0))
        from public.cashd_balance_agee b where b.client_id = g.client_id and (b.encours > 0 or b.credits > 0)
        on conflict (client_id, jour) do nothing;
        v_bilan := v_bilan || jsonb_build_object('arrete', v_jour);
      end if;
      for r in select d.compte_id, d.nom, d.delai_recent_jours, d.delai_moyen_jours from public.cashd_delais_reglement d where d.client_id = g.client_id and d.se_degrade loop
        perform private.cashd_alerter_commercial(r.compte_id, 'attention', format('%s se dégrade : à surveiller avant que le retard s''installe.', r.nom),
          jsonb_build_object('delai_recent', r.delai_recent_jours, 'delai_moyen', r.delai_moyen_jours),
          'degradation:' || r.compte_id::text || ':' || to_char(v_jour, 'IYYY-IW'));
      end loop;
      insert into public.cashd_passages (client_id, jour, bilan) values (g.client_id, v_jour, v_bilan) on conflict do nothing;
      v_items := private.cashd_point_lignes(g.client_id, v_jour);
      foreach v_role in array array['gerant', 'admin', 'valideur'] loop
        begin
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(g.client_id, 'cashd', v_jour, null, v_role, 'Impayés : qui doit quoi', null, null);
          else
            perform private.deposer_section(g.client_id, 'cashd', v_jour, null, v_role, 'Impayés : qui doit quoi', v_items,
                                            null, null, false, p_maintenant, false, 30);
          end if;
        exception when others then
          perform private.lever_alerte_module(g.client_id, 'cashd', 'attention', 'Le point du matin des impayés n''a pas pu être déposé.',
            jsonb_build_object('role', v_role, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:' || v_jour::text || ':' || v_role, false, null);
        end;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(g.client_id, 'cashd', 'critique', 'Les relances du matin n''ont pas pu être écrites.',
        jsonb_build_object('jour', v_jour, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'passage:' || v_jour::text, false, null);
    end;
  end loop;
  return n;
end $function$;

-- Les réglages des relances (c2_02), plus ceux de c2_03 et de c2_04.
create or replace function public.cashd_regler_relances(p_client uuid, p_champs jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  v_inconnus text;
  v_seuil numeric;
  v_regle uuid;
  e jsonb;
begin
  perform private.cashd_exiger_gestion(p_client);
  select * into g from public.cashd_reglages where client_id = p_client for update;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p_champs) k
  where k not in ('scenario', 'scenario_devis', 'seuil_direction', 'signature', 'formule', 'interdits', 'heure_relances', 'ecart_paliers_jours', 'delai_mise_en_demeure_jours',
                  'seuil_lre', 'arrete_jour', 'seuil_ton', 'moyens_reglement', 'echelonnement_des', 'metier', 'relance_commande_jours',
                  'suivi_facturation_jours');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  foreach e in array array[p_champs -> 'scenario', p_champs -> 'scenario_devis'] loop
    continue when e is null;
    if jsonb_typeof(e) <> 'array' or exists (
         select 1 from jsonb_array_elements(e) with ordinality x
         where jsonb_typeof(x.value) <> 'object' or coalesce(x.value ->> 'palier', '') !~ '^[a-z][a-z_]{1,39}$'
            or coalesce(x.value ->> 'jours', '') !~ '^-?[0-9]{1,3}$'
            or (x.ordinality > 1 and (x.value ->> 'jours')::integer <= (e -> (x.ordinality::integer - 2) ->> 'jours')::integer)) then
      raise exception 'Un scénario est une liste de paliers {palier, jours}, aux jours croissants.' using errcode = '22023';
    end if;
  end loop;
  if p_champs ? 'scenario' and (select count(*) from jsonb_array_elements(p_champs -> 'scenario') x where x.value ->> 'palier' = 'mise_en_demeure') > 1 then
    raise exception 'Une seule mise en demeure par scénario.' using errcode = '22023';
  end if;
  update public.cashd_reglages set
    scenario = case when p_champs ? 'scenario' then p_champs -> 'scenario' else scenario end,
    scenario_devis = case when p_champs ? 'scenario_devis' then p_champs -> 'scenario_devis' else scenario_devis end,
    seuil_direction = case when p_champs ? 'seuil_direction' then (p_champs ->> 'seuil_direction')::numeric else seuil_direction end,
    signature = case when p_champs ? 'signature' then nullif(btrim(p_champs ->> 'signature'), '') else signature end,
    formule = case when p_champs ? 'formule' then nullif(btrim(p_champs ->> 'formule'), '') else formule end,
    interdits = case when p_champs ? 'interdits' then coalesce(array(select btrim(x) from jsonb_array_elements_text(p_champs -> 'interdits') x where btrim(x) <> ''), '{}') else interdits end,
    heure_relances = case when p_champs ? 'heure_relances' then (p_champs ->> 'heure_relances')::time else heure_relances end,
    ecart_paliers_jours = case when p_champs ? 'ecart_paliers_jours' then (p_champs ->> 'ecart_paliers_jours')::smallint else ecart_paliers_jours end,
    delai_mise_en_demeure_jours = case when p_champs ? 'delai_mise_en_demeure_jours' then (p_champs ->> 'delai_mise_en_demeure_jours')::smallint else delai_mise_en_demeure_jours end,
    seuil_lre = case when p_champs ? 'seuil_lre' then (p_champs ->> 'seuil_lre')::numeric else seuil_lre end,
    arrete_jour = case when p_champs ? 'arrete_jour' then (p_champs ->> 'arrete_jour')::smallint else arrete_jour end,
    seuil_ton = case when p_champs ? 'seuil_ton' then (p_champs ->> 'seuil_ton')::numeric else seuil_ton end,
    moyens_reglement = case when p_champs ? 'moyens_reglement' then nullif(btrim(p_champs ->> 'moyens_reglement'), '') else moyens_reglement end,
    echelonnement_des = case when p_champs ? 'echelonnement_des' then (p_champs ->> 'echelonnement_des')::numeric else echelonnement_des end,
    metier = case when p_champs ? 'metier' then coalesce(nullif(btrim(p_champs ->> 'metier'), ''), 'general') else metier end,
    relance_commande_jours = case when p_champs ? 'relance_commande_jours' then (p_champs ->> 'relance_commande_jours')::smallint else relance_commande_jours end,
    suivi_facturation_jours = case when p_champs ? 'suivi_facturation_jours' then (p_champs ->> 'suivi_facturation_jours')::smallint else suivi_facturation_jours end,
    maj_le = now()
  where client_id = p_client
  returning * into g;
  if p_champs ? 'seuil_direction' then
    v_seuil := g.seuil_direction;
    if g.regle_direction_id is not null and exists (select 1 from public.regles_validation r where r.id = g.regle_direction_id) then
      update public.regles_validation set montant_min = coalesce(v_seuil, montant_min), actif = v_seuil is not null where id = g.regle_direction_id;
    elsif v_seuil is not null then
      insert into public.regles_validation (client_id, module, montant_min, approbations_requises, roles_autorises, actif)
      values (p_client, 'cashd', v_seuil, 1, array['gerant', 'admin'], true)
      returning id into v_regle;
      update public.cashd_reglages set regle_direction_id = v_regle where client_id = p_client;
    end if;
  end if;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', p_client::text, p_champs, null);
  return (select to_jsonb(x) from public.cashd_reglages x where x.client_id = p_client);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Droits
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function private.cashd_seuil_relance(uuid, numeric) from public, anon, authenticated;
revoke execute on function private.cashd_gabarit_variables() from public, anon, authenticated;
revoke execute on function private.cashd_rendre(text, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_variantes_defaut(text) from public, anon, authenticated;
revoke execute on function private.cashd_gabarit_defaut(text, text, integer) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_relancer_commandes(uuid, date) from public, anon, authenticated;
revoke execute on function private.cashd_verifier_relances(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_point_lignes(uuid, date) from public, anon, authenticated;
revoke execute on function private.cashd_passage(timestamptz) from public, anon, authenticated;
revoke execute on function public.cashd_ecrire_gabarit(uuid, text, text, integer, text, text, boolean) from public, anon;
revoke execute on function public.cashd_gabarits(uuid) from public, anon;
revoke execute on function public.cashd_regler_entite(uuid, numeric) from public, anon;
revoke execute on function public.cashd_decider_solde(uuid, text, text) from public, anon;
revoke execute on function public.cashd_consigner_accord(uuid, text, date) from public, anon;
revoke execute on function public.cashd_attendre_commande(uuid, text, text, text) from public, anon;
revoke execute on function public.cashd_regler_relances(uuid, jsonb) from public, anon;
grant execute on function public.cashd_ecrire_gabarit(uuid, text, text, integer, text, text, boolean) to authenticated, service_role;
grant execute on function public.cashd_gabarits(uuid) to authenticated, service_role;
grant execute on function public.cashd_regler_entite(uuid, numeric) to authenticated, service_role;
grant execute on function public.cashd_decider_solde(uuid, text, text) to authenticated, service_role;
grant execute on function public.cashd_consigner_accord(uuid, text, date) to authenticated, service_role;
grant execute on function public.cashd_attendre_commande(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.cashd_regler_relances(uuid, jsonb) to authenticated, service_role;
