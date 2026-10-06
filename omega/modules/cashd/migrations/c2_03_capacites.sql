-- c2_03 — CASHD, palier 4 : les autres lignes du périmètre promis (session C2, 06/10/2026).
--
-- CE QUE ÇA POSE, ligne par ligne de lib/produits/capacites/relances.ts (la preuve de chacune est dans
-- omega/tests/cashd/c2_04_capacites.sql et omega/NOTES-C2.md) :
--   · ÉCHÉANCIER NÉGOCIÉ : cashd_echeances ; cashd_poser_echeancier remplace l'échéance d'origine (gardée) ; l'échéance
--     suivie est la première que les règlements ne couvrent pas ; une échéance manquée relance le cycle, une échéance
--     payée le remet à zéro.
--   · JOURS OUVRÉS : le passage du matin ne se fait qu'un jour ouvré du territoire de l'organisation (calendrier du
--     socle) ; les fenêtres horaires d'envoi restent celles des réglages d'envoi du socle.
--   · LITIGE PARTIEL : cashd_litige_partiel(facture, montant contesté, motif) : la part contestée sort du cycle, le reste
--     continue d'être relancé ; le litige (entier ou partiel) prévient le commercial du compte (alerte nominative) ;
--     les alertes d'un compte (plafond, dégradation, litige) vont au commercial, les relances au contact de facturation.
--   · DOSSIERS : cashd_dossier(compte, facture, motif) réunit les pièces, les imputations, les relances (texte, état,
--     envoi, remise), les réponses reçues et le journal — pour un litige, l'assurance-crédit ou le recouvrement ;
--     cashd_remettre_dossier passe le compte en recouvrement (toute relance cesse) et prépare l'envoi du dossier à qui
--     l'organisation désigne, par la file de validation.
--   · ADRESSE QUI REBONDIT : un envoi de relance non remis (rebond définitif, refus) met le compte « en attente de
--     contact » ; une réponse reçue à une relance est notée (taux de réponse) et signalée.
--   · DEVISES : cashd_taux_change (taux de référence, saisis ou chargés par le serveur) ; chaque pièce est suivie dans
--     sa devise et en euros (taux fixé sur la pièce, ou le dernier taux connu) ; la balance âgée compte en euros.
--   · PLAFOND D'ENCOURS : cashd_proposer_plafond (depuis l'historique : facturé mensuel moyen sur douze mois × durée
--     moyenne de paiement) ; alerte de dépassement ; cashd_verifier_commande : une commande qui ferait passer le compte
--     au-dessus de son plafond est bloquée jusqu'à la décision d'un responsable (demande de validation du socle).
--   · RISQUE ET PILOTAGE : vue cashd_delais_reglement (délai moyen de règlement par compte, récent et habituel, signal
--     de dégradation) ; cashd_prevision (encaissements attendus à 30 et 60 jours) ; vue cashd_reponses (taux de réponse
--     par palier) ; comptage continu des créances en litige, en pause, en recouvrement (cashd_tableau) ; vue
--     cashd_historique_reglages (chaque changement de seuil ou de cadence, daté, lu dans le journal).
--   · LETTRE RECOMMANDÉE ÉLECTRONIQUE (tiers : AR24) : la mise en demeure part par LRE quand l'organisation le règle
--     (au-delà d'un montant) ; le socle la tient prête tant que le fournisseur n'est pas branché.
--   · LIEN DE PAIEMENT (tiers : prestataire de paiement de l'organisation) : contrat d'interface cashd_liens_paiement ;
--     le lien actif accompagne la relance ; il s'éteint au règlement ; un paiement par lien se note par la porte serveur.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; jamais de DROP ni
-- de DELETE. RLS sur toute table, revoke all puis grants ; vues security_invoker ; revoke execute de public sur les
-- fonctions privées. Les fonctions de c2_02 redéfinies ici gardent leur signature.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Colonnes et tables
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.cashd_factures add column if not exists echeance_origine date;
alter table public.cashd_factures add column if not exists montant_conteste numeric(14,2) not null default 0;
alter table public.cashd_factures add column if not exists conteste_motif text;
alter table public.cashd_factures add column if not exists taux_eur numeric(18,8);
alter table public.cashd_relances add column if not exists reponse_le timestamptz;
alter table public.cashd_relances add column if not exists lien_paiement text;
alter table public.cashd_reglages add column if not exists seuil_lre numeric(14,2);
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_factures_conteste_check') then
    alter table public.cashd_factures add constraint cashd_factures_conteste_check check (
      montant_conteste >= 0 and montant_conteste <= montant_ttc and char_length(conteste_motif) <= 500 and (taux_eur is null or taux_eur > 0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_seuil_lre_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_seuil_lre_check check (seuil_lre is null or seuil_lre >= 0);
  end if;
end $do$;

-- Les arrêtés de la balance âgée, à date fixe (le jour du mois réglé) : chaque arrêté se télécharge en tableur.
alter table public.cashd_reglages add column if not exists arrete_jour smallint not null default 1;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_arrete_jour_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_arrete_jour_check check (arrete_jour between 1 and 28);
  end if;
end $do$;
create table if not exists public.cashd_arretes (
  client_id uuid not null references public.clients(id) on delete cascade,
  jour date not null,
  balance jsonb not null,
  totaux jsonb not null,
  cree_le timestamptz not null default now(),
  primary key (client_id, jour)
);

-- L'échéancier négocié d'une facture (il remplace l'échéance d'origine, gardée dans echeance_origine).
create table if not exists public.cashd_echeances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null,
  rang smallint not null,
  echeance date not null,
  montant numeric(14,2) not null,
  actif boolean not null default true,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint cashd_echeances_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id),
  constraint cashd_echeances_montant_check check (montant > 0),
  constraint cashd_echeances_rang_check check (rang between 1 and 60),
  constraint cashd_echeances_motif_check check (char_length(motif) <= 500)
);
create index if not exists cashd_echeances_facture_idx on public.cashd_echeances (facture_id, rang) where actif;

-- Les taux de change de référence : 1 unité de la devise = taux euros.
create table if not exists public.cashd_taux_change (
  devise text not null,
  jour date not null,
  taux numeric(18,8) not null,
  source text not null default 'saisie',
  client_id uuid references public.clients(id) on delete cascade,
  cree_le timestamptz not null default now(),
  constraint cashd_taux_change_devise_check check (devise ~ '^[A-Z]{3}$' and devise <> 'EUR'),
  constraint cashd_taux_change_taux_check check (taux > 0),
  constraint cashd_taux_change_source_check check (source in ('saisie', 'bce'))
);
create unique index if not exists cashd_taux_change_un_jour on public.cashd_taux_change (devise, jour, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Les commandes contrôlées contre le plafond d'encours.
create table if not exists public.cashd_commandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  compte_id uuid not null,
  reference text,
  montant numeric(14,2) not null,
  encours numeric(14,2) not null,
  plafond numeric(14,2),
  statut text not null,
  demande_id uuid,
  demande_par uuid,
  cree_le timestamptz not null default now(),
  constraint cashd_commandes_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_commandes_montant_check check (montant > 0),
  constraint cashd_commandes_statut_check check (statut in ('autorisee', 'bloquee')),
  constraint cashd_commandes_reference_check check (char_length(reference) <= 120)
);
create index if not exists cashd_commandes_compte_idx on public.cashd_commandes (compte_id, cree_le desc);

-- Le contrat d'interface du lien de paiement (prestataire de l'organisation).
create table if not exists public.cashd_liens_paiement (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null,
  prestataire text not null,
  reference text not null,
  url text not null,
  statut text not null default 'actif',
  cree_le timestamptz not null default now(),
  eteint_le timestamptz,
  eteint_motif text,
  constraint cashd_liens_paiement_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id),
  constraint cashd_liens_paiement_prestataire_check check (prestataire ~ '^[a-z][a-z0-9_]{1,29}$'),
  constraint cashd_liens_paiement_url_check check (url ~ '^https://' and char_length(url) <= 500),
  constraint cashd_liens_paiement_reference_check check (char_length(reference) between 1 and 200),
  constraint cashd_liens_paiement_statut_check check (statut in ('actif', 'eteint', 'paye')),
  constraint cashd_liens_paiement_une_reference unique (prestataire, reference)
);
create index if not exists cashd_liens_paiement_facture_idx on public.cashd_liens_paiement (facture_id) where statut = 'actif';

alter table public.cashd_arretes enable row level security;
alter table public.cashd_echeances enable row level security;
alter table public.cashd_taux_change enable row level security;
alter table public.cashd_commandes enable row level security;
alter table public.cashd_liens_paiement enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_arretes' and policyname = 'les membres lisent les arretes de balance') then
    create policy "les membres lisent les arretes de balance" on public.cashd_arretes for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_echeances' and policyname = 'les membres lisent les echeanciers des factures qu''ils voient') then
    create policy "les membres lisent les echeanciers des factures qu'ils voient" on public.cashd_echeances for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_factures f where f.id = cashd_echeances.facture_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_taux_change' and policyname = 'les taux de reference et ceux de son organisation') then
    create policy "les taux de reference et ceux de son organisation" on public.cashd_taux_change for select to authenticated
      using (client_id is null or client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_commandes' and policyname = 'les membres lisent les commandes controlees') then
    create policy "les membres lisent les commandes controlees" on public.cashd_commandes for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_comptes c where c.id = cashd_commandes.compte_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_liens_paiement' and policyname = 'les membres lisent les liens de paiement de leurs factures') then
    create policy "les membres lisent les liens de paiement de leurs factures" on public.cashd_liens_paiement for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_factures f where f.id = cashd_liens_paiement.facture_id));
  end if;
end $do$;
revoke all on table public.cashd_arretes, public.cashd_echeances, public.cashd_taux_change, public.cashd_commandes, public.cashd_liens_paiement from anon, authenticated;
grant select on table public.cashd_arretes, public.cashd_echeances, public.cashd_taux_change, public.cashd_commandes, public.cashd_liens_paiement to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
               select x from unnest(array['cashd_arretes', 'cashd_echeances', 'cashd_commandes', 'cashd_liens_paiement']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Les vues : l'état d'une pièce en devise et en euros, la part contestée ; la balance en euros
-- ═══════════════════════════════════════════════════════════════════════════
-- Mêmes colonnes que c2_01 dans le même ordre (create or replace), plus de nouvelles colonnes à la fin.

create or replace view public.cashd_factures_etat with (security_invoker = true) as
with i as (
  select x.facture_id,
         coalesce(sum(x.montant) filter (where x.reglement_id is not null), 0) as regle,
         coalesce(sum(x.montant) filter (where x.avoir_id is not null), 0) as avoirs_imputes,
         max(r.recu_le) as dernier_reglement_le
  from public.cashd_imputations x
  left join public.cashd_reglements r on r.id = x.reglement_id
  where x.annulee_le is null
  group by x.facture_id
), a as (
  select x.avoir_id, coalesce(sum(x.montant), 0) as impute
  from public.cashd_imputations x where x.annulee_le is null and x.avoir_id is not null group by x.avoir_id
), j as (select (now() at time zone 'Europe/Paris')::date as jour),
b as (
  select f.*, coalesce(i.regle, 0) as regle, coalesce(i.avoirs_imputes, 0) as avoirs_imputes, i.dernier_reglement_le,
         case
           when f.nature = 'avoir' then greatest(f.montant_ttc - coalesce(a.impute, 0), 0)
           when f.nature = 'devis' or f.statut in ('soldee', 'annulee', 'abandonnee') then 0
           else greatest(least(f.montant_ttc - coalesce(i.regle, 0) - coalesce(i.avoirs_imputes, 0), coalesce(f.reste_du_source, f.montant_ttc)), 0)
         end::numeric(14,2) as reste_du,
         j.jour,
         case when f.devise = 'EUR' then 1::numeric
              else coalesce(f.taux_eur, (select t.taux from public.cashd_taux_change t
                                         where t.devise = f.devise and t.jour <= j.jour and (t.client_id is null or t.client_id = f.client_id)
                                         order by (t.client_id is not null) desc, t.jour desc limit 1)) end as taux
  from public.cashd_factures f cross join j
  left join i on i.facture_id = f.id
  left join a on a.avoir_id = f.id
)
select b.id, b.client_id, b.entite_id, b.compte_id, b.nature, b.numero, b.date_emission, b.echeance, b.montant_ht, b.montant_ttc,
       b.devise, b.reste_du_source, b.statut, b.statut_motif, b.statut_le, b.commande_ref, b.source, b.vue_le, b.cree_le, b.maj_le,
       b.regle, b.avoirs_imputes, b.dernier_reglement_le, b.reste_du,
       (b.jour - b.date_emission) as jours_ecoules,
       case when b.nature in ('facture', 'acompte') and b.reste_du > 0 and b.echeance < b.jour then b.jour - b.echeance else 0 end as retard_jours,
       case when b.nature not in ('facture', 'acompte') or b.reste_du <= 0 then null
            when b.echeance is null or b.echeance >= b.jour then 'non_echu'
            when b.jour - b.echeance <= 30 then '1_30'
            when b.jour - b.echeance <= 60 then '31_60'
            when b.jour - b.echeance <= 90 then '61_90'
            else 'plus_90' end as tranche,
       (b.echeance - b.date_emission) as delai_jours,
       -- c2_03 : la part contestée (hors relance), le reste relançable, l'euro
       least(b.montant_conteste, b.reste_du)::numeric(14,2) as montant_conteste,
       greatest(b.reste_du - b.montant_conteste, 0)::numeric(14,2) as reste_relancable,
       b.echeance_origine,
       b.taux as taux_eur,
       round(b.reste_du * b.taux, 2)::numeric(14,2) as reste_du_eur,
       round(b.montant_ttc * b.taux, 2)::numeric(14,2) as montant_ttc_eur
from b;

-- La balance âgée, en euros ; la part contestée d'une facture compte en litige, pas dans ses tranches.
create or replace view public.cashd_balance_agee with (security_invoker = true) as
select c.id as compte_id, c.client_id, c.entite_id, c.reference, c.nom, c.groupe, c.statut, c.plafond_encours, c.devise,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche = 'non_echu' and f.statut <> 'litige'), 0)::numeric(14,2) as non_echu,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche = '1_30' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_1_30,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche = '31_60' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_31_60,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche = '61_90' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_61_90,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche = 'plus_90' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_plus_90,
       coalesce(sum(f.reste_du_eur * (f.reste_relancable / nullif(f.reste_du, 0))) filter (where f.tranche is not null and f.tranche <> 'non_echu' and f.statut <> 'litige'), 0)::numeric(14,2) as echu,
       (coalesce(sum(f.reste_du_eur) filter (where f.statut = 'litige'), 0)
        + coalesce(sum(f.reste_du_eur * (f.montant_conteste / nullif(f.reste_du, 0))) filter (where f.statut <> 'litige' and f.tranche is not null), 0))::numeric(14,2) as en_litige,
       coalesce(sum(f.reste_du_eur) filter (where f.tranche is not null), 0)::numeric(14,2) as encours,
       (coalesce((select sum(a.reste_du_eur) from public.cashd_factures_etat a where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'), 0)
        + coalesce((select sum(r.a_imputer) from public.cashd_reglements_etat r where r.compte_id = c.id), 0))::numeric(14,2) as credits,
       count(f.id) filter (where f.tranche is not null)::integer as factures_ouvertes,
       count(f.id) filter (where f.retard_jours > 0)::integer as factures_echues,
       coalesce(max(f.retard_jours), 0)::integer as retard_max_jours,
       min(f.echeance) filter (where f.retard_jours > 0) as plus_ancienne_echeance,
       count(f.id) filter (where f.tranche is not null and f.taux_eur is null)::integer as pieces_sans_taux
from public.cashd_comptes c
left join public.cashd_factures_etat f on f.compte_id = c.id and f.nature in ('facture', 'acompte')
group by c.id;

-- Le délai de règlement de chaque compte : habituel (douze mois), récent (90 jours), et le signal de dégradation.
create or replace view public.cashd_delais_reglement with (security_invoker = true) as
with p as (
  select f.compte_id, f.date_emission, f.echeance,
         coalesce(f.dernier_reglement_le, case when f.statut = 'soldee' then (f.statut_le at time zone 'Europe/Paris')::date end) as paye_le
  from public.cashd_factures_etat f
  where f.nature in ('facture', 'acompte') and f.statut = 'soldee'
), j as (select (now() at time zone 'Europe/Paris')::date as jour)
select c.id as compte_id, c.client_id, c.entite_id, c.nom,
       round(avg(p.paye_le - p.date_emission) filter (where p.paye_le >= j.jour - 365), 1) as delai_moyen_jours,
       round(avg(greatest(p.paye_le - p.echeance, 0)) filter (where p.paye_le >= j.jour - 365), 1) as retard_moyen_jours,
       round(avg(p.paye_le - p.date_emission) filter (where p.paye_le >= j.jour - 90), 1) as delai_recent_jours,
       count(p.*) filter (where p.paye_le >= j.jour - 365)::integer as factures_payees,
       (select coalesce(max(e.retard_jours), 0) from public.cashd_factures_etat e where e.compte_id = c.id and e.nature in ('facture', 'acompte')) as retard_actuel_jours,
       case
         when count(p.*) filter (where p.paye_le >= j.jour - 365) < 2 then false
         when avg(p.paye_le - p.date_emission) filter (where p.paye_le >= j.jour - 90) > avg(p.paye_le - p.date_emission) filter (where p.paye_le >= j.jour - 365) + 10 then true
         when (select coalesce(max(e.retard_jours), 0) from public.cashd_factures_etat e where e.compte_id = c.id and e.nature in ('facture', 'acompte'))
              > coalesce(avg(greatest(p.paye_le - p.echeance, 0)) filter (where p.paye_le >= j.jour - 365), 0) + 15 then true
         else false end as se_degrade
from public.cashd_comptes c cross join j
left join p on p.compte_id = c.id
group by c.id, c.client_id, c.entite_id, c.nom, j.jour;

-- Le taux de réponse aux relances, palier par palier : une relance partie est « suivie » d'un règlement imputé sur
-- l'une de ses factures dans les quinze jours, ou d'une réponse reçue.
create or replace view public.cashd_reponses with (security_invoker = true) as
select r.client_id, r.palier,
       count(*) filter (where e.envoye_le is not null)::integer as envoyees,
       count(*) filter (where e.envoye_le is not null and (
         r.reponse_le is not null
         or exists (select 1 from public.cashd_relances_pieces p join public.cashd_imputations x on x.facture_id = p.facture_id and x.annulee_le is null
                    left join public.cashd_reglements g on g.id = x.reglement_id
                    where p.relance_id = r.id and coalesce(g.recu_le, (x.cree_le at time zone 'Europe/Paris')::date)
                          between (e.envoye_le at time zone 'Europe/Paris')::date and (e.envoye_le at time zone 'Europe/Paris')::date + 15)))::integer as suivies,
       round(100.0 * count(*) filter (where e.envoye_le is not null and (
         r.reponse_le is not null
         or exists (select 1 from public.cashd_relances_pieces p join public.cashd_imputations x on x.facture_id = p.facture_id and x.annulee_le is null
                    left join public.cashd_reglements g on g.id = x.reglement_id
                    where p.relance_id = r.id and coalesce(g.recu_le, (x.cree_le at time zone 'Europe/Paris')::date)
                          between (e.envoye_le at time zone 'Europe/Paris')::date and (e.envoye_le at time zone 'Europe/Paris')::date + 15)))
             / nullif(count(*) filter (where e.envoye_le is not null), 0), 1) as taux_pct
from public.cashd_relances r
left join public.envois e on e.id = r.envoi_id
group by r.client_id, r.palier;

-- Chaque changement de seuil, de cadence ou de statut, daté (lu dans le journal opposable : gérant et administrateur).
create or replace view public.cashd_historique_reglages with (security_invoker = true) as
select j.client_id, j.survenu_le, j.action, j.objet_type, j.objet_id, j.acteur_type, j.acteur_libelle, j.donnees
from public.journal_opposable j
where j.action in ('cashd.installe', 'cashd.reglages', 'cashd.reglages_relances', 'cashd.compte_regle', 'cashd.compte_statut', 'cashd.echeancier', 'cashd.plafond');

revoke all on table public.cashd_factures_etat, public.cashd_balance_agee, public.cashd_delais_reglement, public.cashd_reponses, public.cashd_historique_reglages from anon, authenticated;
grant select on table public.cashd_factures_etat, public.cashd_balance_agee, public.cashd_delais_reglement, public.cashd_reponses, public.cashd_historique_reglages to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Le commercial du compte reçoit les alertes
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_alerter_commercial(p_compte uuid, p_niveau text, p_titre text, p_detail jsonb, p_cle text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare c public.cashd_comptes;
begin
  select * into c from public.cashd_comptes where id = p_compte;
  if not found then
    return null;
  end if;
  return private.lever_alerte_module(c.client_id, 'cashd', p_niveau, p_titre,
    coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('compte', c.id, 'compte_nom', c.nom, 'commercial', c.commercial_id,
                                                          'commercial_email', c.contact_commercial_email),
    p_cle, true, case when c.commercial_id is not null and exists (select 1 from public.comptes m where m.client_id = c.client_id and m.user_id = c.commercial_id)
                      then c.commercial_id end);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. L'échéancier négocié
-- ═══════════════════════════════════════════════════════════════════════════

-- L'échéance suivie d'une facture sous échéancier : la première que les règlements (et avoirs imputés) ne couvrent
-- pas. Quand elle avance (une échéance payée), le cycle de relance repart de zéro pour la suivante ; les relances
-- encore en attente sont coupées. Rend l'échéance suivie.
create or replace function private.cashd_suivre_echeancier(p_facture uuid)
 returns date language plpgsql security definer set search_path to ''
as $function$
declare
  f public.cashd_factures;
  v_paye numeric;
  v_echeance date;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found or not exists (select 1 from public.cashd_echeances e where e.facture_id = f.id and e.actif) then
    return null;
  end if;
  v_paye := coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0);
  select e.echeance into v_echeance
  from (select e.echeance, sum(e.montant) over (order by e.rang) as cumul from public.cashd_echeances e where e.facture_id = f.id and e.actif) e
  where e.cumul > v_paye + 0.005
  order by e.echeance limit 1;
  if v_echeance is null then
    return f.echeance;
  end if;
  if v_echeance is distinct from f.echeance then
    update public.cashd_factures set echeance = v_echeance, maj_le = now() where id = f.id;
    if f.echeance is not null and v_echeance > f.echeance then
      perform private.cashd_couper(f.client_id, null, f.id, 'échéance du ' || to_char(f.echeance, 'DD/MM/YYYY') || ' réglée : le cycle repart pour la suivante', false);
      update public.cashd_relances_pieces set annulee = true where facture_id = f.id and not annulee;
    end if;
  end if;
  return v_echeance;
end $function$;

-- Poser un échéancier (il remplace l'échéance d'origine) : p_echeances = [{echeance, montant}…], dates croissantes,
-- total égal au reste dû. Les relances en attente de la facture sont coupées : le suivi épouse les nouveaux termes.
create or replace function public.cashd_poser_echeancier(p_facture uuid, p_echeances jsonb, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  f public.cashd_factures;
  v_uid uuid;
  v_total numeric;
  v_reste numeric;
  v_n integer;
  e record;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found or f.nature not in ('facture', 'acompte') then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if f.statut not in ('ouverte') then
    raise exception 'Un échéancier se pose sur une facture ouverte (ici : %).', f.statut using errcode = '23514';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un échéancier se pose avec son motif (l''accord du client).' using errcode = '22023';
  end if;
  if p_echeances is null or jsonb_typeof(p_echeances) <> 'array' or jsonb_array_length(p_echeances) not between 1 and 60
     or exists (select 1 from jsonb_array_elements(p_echeances) with ordinality x
                where jsonb_typeof(x.value) <> 'object' or (x.value ->> 'echeance') is null or (x.value ->> 'montant') is null
                   or (x.value ->> 'montant')::numeric <= 0
                   or (x.ordinality > 1 and (x.value ->> 'echeance')::date <= (p_echeances -> (x.ordinality::integer - 2) ->> 'echeance')::date)) then
    raise exception 'Un échéancier est une liste de {echeance, montant}, aux dates croissantes et aux montants positifs.' using errcode = '22023';
  end if;
  select sum((x.value ->> 'montant')::numeric), count(*) into v_total, v_n from jsonb_array_elements(p_echeances) x;
  v_reste := greatest(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0), 0);
  if abs(round(v_total, 2) - v_reste) > 0.005 then
    raise exception 'Les échéances totalisent % € pour un reste dû de % € : elles doivent le couvrir exactement.', round(v_total, 2), v_reste using errcode = '23514';
  end if;
  update public.cashd_echeances set actif = false where facture_id = f.id and actif;
  for e in select x.value, x.ordinality from jsonb_array_elements(p_echeances) with ordinality x loop
    insert into public.cashd_echeances (client_id, facture_id, rang, echeance, montant, motif, cree_par)
    values (f.client_id, f.id, e.ordinality, (e.value ->> 'echeance')::date, round((e.value ->> 'montant')::numeric, 2), left(btrim(p_motif), 500), v_uid);
  end loop;
  update public.cashd_factures set echeance_origine = coalesce(echeance_origine, echeance), echeance = null, maj_le = now() where id = f.id;
  perform private.cashd_couper(f.client_id, null, f.id, 'échéancier négocié : ' || left(btrim(p_motif), 300));
  update public.cashd_relances_pieces set annulee = true where facture_id = f.id and not annulee;
  perform private.cashd_suivre_echeancier(f.id);
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.echeancier', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'echeance_origine', coalesce(f.echeance_origine, f.echeance), 'echeances', p_echeances, 'motif', left(btrim(p_motif), 500)), f.entite_id);
  return jsonb_build_object('facture', f.id, 'echeances', v_n, 'echeance_suivie', (select x.echeance from public.cashd_factures x where x.id = f.id));
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Le litige partiel, et le litige qui prévient le commercial
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cashd_litige_partiel(p_facture uuid, p_montant numeric, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_reste numeric; v_coupees integer := 0;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found or f.nature not in ('facture', 'acompte') then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un litige s''ouvre et se clôt avec son motif.' using errcode = '22023';
  end if;
  if f.statut <> 'ouverte' then
    raise exception 'Seule une facture ouverte a une part contestée (ici : %).', f.statut using errcode = '23514';
  end if;
  v_reste := private.cashd_reste(f.id);
  if p_montant is null or p_montant < 0 then
    raise exception 'Le montant contesté est positif (zéro clôt le litige partiel).' using errcode = '22023';
  end if;
  if p_montant >= v_reste - 0.005 and p_montant > 0 then
    raise exception 'Le client conteste tout le reste dû (% €) : mettez la facture entière en litige.', v_reste using errcode = '23514';
  end if;
  update public.cashd_factures set montant_conteste = round(p_montant, 2), conteste_motif = case when p_montant > 0 then left(btrim(p_motif), 500) end,
         maj_le = now() where id = f.id;
  if p_montant > 0 then
    -- La relance prête portait le montant entier : elle est coupée, la suivante ne réclamera que la part non contestée.
    v_coupees := private.cashd_couper(f.client_id, null, f.id, 'facture ' || f.numero || ' contestée en partie : ' || left(btrim(p_motif), 300), false);
    perform private.cashd_alerter_commercial(f.compte_id, 'attention',
      format('Litige ouvert sur la facture %s : %s contestés (%s)', f.numero, private.cashd_eur(round(p_montant, 2)), left(btrim(p_motif), 200)),
      jsonb_build_object('facture', f.id, 'numero', f.numero, 'montant_conteste', round(p_montant, 2)), 'litige:' || f.id::text);
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', case when p_montant > 0 then 'cashd.litige_partiel' else 'cashd.litige_partiel_clos' end,
    'cashd_factures', f.id::text, jsonb_build_object('numero', f.numero, 'montant_conteste', round(p_montant, 2), 'motif', left(btrim(p_motif), 500),
                                                     'relances_coupees', v_coupees), f.entite_id);
  return jsonb_build_object('facture', f.id, 'montant_conteste', round(p_montant, 2), 'reste_relancable', greatest(v_reste - round(p_montant, 2), 0),
                            'relances_coupees', v_coupees);
end $function$;

-- Le litige entier (c2_02), qui prévient désormais le commercial du compte.
create or replace function public.cashd_litige(p_facture uuid, p_ouvrir boolean, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_uid uuid; v_coupees integer := 0;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found or f.nature not in ('facture', 'acompte') then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un litige s''ouvre et se clôt avec son motif.' using errcode = '22023';
  end if;
  if coalesce(p_ouvrir, true) then
    if f.statut <> 'ouverte' then
      raise exception 'Seule une facture ouverte passe en litige (ici : %).', f.statut using errcode = '23514';
    end if;
    update public.cashd_factures set statut = 'litige', statut_motif = left(btrim(p_motif), 500), statut_le = now(), maj_le = now() where id = f.id;
    v_coupees := private.cashd_couper(f.client_id, null, f.id, 'facture ' || f.numero || ' en litige : ' || left(btrim(p_motif), 300));
    perform private.cashd_alerter_commercial(f.compte_id, 'attention',
      format('Litige ouvert sur la facture %s (%s) : %s', f.numero, private.cashd_eur(private.cashd_reste(f.id)), left(btrim(p_motif), 200)),
      jsonb_build_object('facture', f.id, 'numero', f.numero), 'litige:' || f.id::text);
  else
    if f.statut <> 'litige' then
      raise exception 'Cette facture n''est pas en litige.' using errcode = '23514';
    end if;
    update public.cashd_factures set statut = 'ouverte', statut_motif = left('litige clos : ' || btrim(p_motif), 500), statut_le = now(), maj_le = now() where id = f.id;
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', case when coalesce(p_ouvrir, true) then 'cashd.litige_ouvert' else 'cashd.litige_clos' end,
    'cashd_factures', f.id::text, jsonb_build_object('numero', f.numero, 'motif', left(btrim(p_motif), 500), 'relances_coupees', v_coupees), f.entite_id);
  return jsonb_build_object('facture', f.id, 'statut', case when coalesce(p_ouvrir, true) then 'litige' else 'ouverte' end, 'relances_coupees', v_coupees);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Les dossiers : litige, assurance-crédit, recouvrement
-- ═══════════════════════════════════════════════════════════════════════════

-- Tout ce qui concerne un compte (ou une facture) : le compte, les pièces, les échéanciers, les imputations et
-- règlements, chaque relance (texte, état, envoi, remise, réponse), les réponses reçues, le journal. Sous les droits de
-- qui lit (le journal : gérant et administrateur).
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
    'journal', (select coalesce(jsonb_agg(jsonb_build_object('le', j.survenu_le, 'action', j.action, 'par', j.acteur_libelle, 'donnees', j.donnees) order by j.id), '[]'::jsonb)
                from public.journal_opposable j
                where j.client_id = c.client_id and j.action like 'cashd.%'
                  and ((j.objet_type = 'cashd_comptes' and j.objet_id = c.id::text)
                       or (j.objet_type = 'cashd_factures' and j.objet_id in (select f.id::text from public.cashd_factures f where f.compte_id = c.id and (p_facture is null or f.id = p_facture)))
                       or (j.objet_type = 'cashd_relances' and j.objet_id in (select r.id::text from public.cashd_relances r where r.compte_id = c.id))))) end
  from (select 1) z left join public.cashd_comptes c on c.id = p_compte
$function$;

-- Remettre le dossier de recouvrement à qui l'organisation désigne (avocat, société de recouvrement, assureur) : le
-- compte passe « en recouvrement » (toute relance commerciale cesse, y compris celle qui était prête) et l'envoi du
-- dossier est préparé, par la file de validation, avec le récapitulatif de la créance.
create or replace function public.cashd_remettre_dossier(p_compte uuid, p_adresse text, p_nom text, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_uid uuid;
  b public.cashd_balance_agee;
  v_dem uuid;
  v_envoi uuid;
  v_corps text;
  v_lignes text := '';
  v_emetteur text;
  v_coupees integer;
  f record;
begin
  select * into c from public.cashd_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(c.client_id, c.entite_id);
  if p_adresse is null or lower(btrim(p_adresse)) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'L''adresse de qui reçoit le dossier est un courriel valide.' using errcode = '22023';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'La remise d''un dossier dit pourquoi.' using errcode = '22023';
  end if;
  select * into b from public.cashd_balance_agee x where x.compte_id = c.id;
  v_emetteur := coalesce((select e.nom from public.entites e where e.id = c.entite_id), 'Notre société');
  for f in select x.* from public.cashd_factures_etat x where x.compte_id = c.id and x.nature in ('facture', 'acompte') and x.reste_du > 0 order by x.echeance loop
    v_lignes := v_lignes || format(E'  • Facture %s du %s, échue le %s : %s restant dus%s\n', f.numero, to_char(f.date_emission, 'DD/MM/YYYY'),
      coalesce(to_char(f.echeance, 'DD/MM/YYYY'), '—'), private.cashd_eur(f.reste_du), case when f.statut = 'litige' then ' (contestée)' else '' end);
  end loop;
  v_corps := format(E'Bonjour%s,\n\nNous vous confions le recouvrement de la créance de %s sur %s (compte %s%s).\n\n',
                    coalesce(' ' || nullif(btrim(p_nom), ''), ''), v_emetteur, c.nom, c.reference, coalesce(', SIREN ' || c.siren, ''))
    || E'Pièces dues :\n' || v_lignes
    || format(E'\nEncours total : %s, dont %s échus.\n', private.cashd_eur(coalesce(b.encours, 0)), private.cashd_eur(coalesce(b.echu, 0)))
    || format(E'Relances faites : %s (dont mise en demeure : %s).\n',
              (select count(*) from public.cashd_relances r where r.compte_id = c.id and r.statut = 'a_valider'),
              case when exists (select 1 from public.cashd_relances r where r.compte_id = c.id and r.palier = 'mise_en_demeure' and r.statut = 'a_valider') then 'oui' else 'non' end)
    || format(E'Motif de la remise : %s\n\nLe dossier complet (pièces, relances datées, accusés, échanges) est tenu à votre disposition dans notre espace.\n\n%s\n',
              left(btrim(p_motif), 500), v_emetteur);
  update public.cashd_comptes set statut = 'recouvrement', statut_motif = left('dossier remis à ' || coalesce(nullif(btrim(p_nom), ''), lower(btrim(p_adresse))) || ' : ' || btrim(p_motif), 500),
         statut_le = now(), statut_par = v_uid, maj_le = now() where id = c.id;
  v_coupees := private.cashd_couper(c.client_id, c.id, null, 'compte en recouvrement : ' || left(btrim(p_motif), 300));
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
  values (c.client_id, c.entite_id, 'cashd', 'cashd.dossier_recouvrement', 'cashd_comptes', c.id::text,
          left('Remise du dossier de recouvrement : ' || c.nom || ' à ' || coalesce(nullif(btrim(p_nom), ''), lower(btrim(p_adresse))), 500),
          coalesce(b.encours, 0),
          jsonb_build_object('canal', 'email', 'destinataire', jsonb_build_object('nom', p_nom, 'adresse', lower(btrim(p_adresse))),
                             'sujet', left(v_emetteur || ' — recouvrement de la créance sur ' || c.nom, 300), 'corps', v_corps,
                             'exigences', jsonb_build_object('commentaire', true)),
          now() + interval '7 days', 'cashd:dossier:' || c.id::text || ':' || to_char(now(), 'YYYYMMDDHH24MISS'))
  returning id into v_dem;
  begin
    if (private.reglages_envois_effectifs(c.client_id, 'cashd') ->> 'mode') is not null then
      v_envoi := private.preparer_envoi(c.client_id, 'cashd', 'cashd_comptes', c.id::text, 'email',
        jsonb_build_object('adresse', lower(btrim(p_adresse)), 'nom', coalesce(nullif(btrim(p_nom), ''), lower(btrim(p_adresse))), 'professionnel', true, 'langue', 'fr'),
        null, '{}'::jsonb, left(v_emetteur || ' — recouvrement de la créance sur ' || c.nom, 300), v_corps, null::uuid[], 'cashd:dossier:' || v_dem::text, c.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dem));
    end if;
  exception when others then
    perform private.lever_alerte_module(c.client_id, 'cashd', 'attention', format('L''envoi du dossier de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
      jsonb_build_object('compte', c.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'dossier:' || c.id::text, true, null);
  end;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.dossier_remis', 'cashd_comptes', c.id::text,
    jsonb_build_object('a', lower(btrim(p_adresse)), 'nom', p_nom, 'motif', left(btrim(p_motif), 500), 'demande', v_dem, 'encours', b.encours,
                       'relances_coupees', v_coupees), c.entite_id);
  return jsonb_build_object('compte', c.id, 'statut', 'recouvrement', 'demande', v_dem, 'envoi', v_envoi, 'relances_coupees', v_coupees);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Ce que les envois et les réponses apprennent
-- ═══════════════════════════════════════════════════════════════════════════

-- Un envoi de relance non remis (rebond définitif, refus, échec) : l'adresse ne vaut plus, le compte passe « en
-- attente de contact » ; la personne désigne le nouvel interlocuteur avant toute reprise.
create or replace function private.cashd_suivre_envoi(p_charge jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  e public.envois;
  r public.cashd_relances;
  c public.cashd_comptes;
  v_id uuid;
begin
  begin
    v_id := coalesce(p_charge ->> 'envoi', p_charge ->> 'id', p_charge #>> '{envoi,id}')::uuid;
  exception when others then
    return jsonb_build_object('ignore', 'charge sans envoi');
  end;
  select * into e from public.envois where id = v_id;
  if not found or e.module <> 'cashd' or e.objet_type <> 'cashd_relances' then
    return jsonb_build_object('ignore', 'envoi étranger aux relances');
  end if;
  select * into r from public.cashd_relances where id = e.objet_id::uuid;
  if not found then
    return jsonb_build_object('ignore', 'relance introuvable');
  end if;
  if not (e.remise in ('rebond', 'refuse') or e.statut in ('echec', 'refuse')) then
    return jsonb_build_object('ignore', 'envoi remis ou en cours', 'statut', e.statut, 'remise', e.remise);
  end if;
  select * into c from public.cashd_comptes where id = r.compte_id for update;
  if c.statut = 'actif' then
    update public.cashd_comptes set statut = 'attente_contact',
      statut_motif = left(format('la relance du %s n''a pas été remise à %s (%s) : désignez le nouvel interlocuteur', to_char(r.jour, 'DD/MM/YYYY'),
                                 coalesce(e.destinataire_adresse, 'l''adresse connue'), coalesce(e.remise, e.statut)), 500),
      statut_le = now(), maj_le = now() where id = c.id;
    perform private.journaliser_module(c.client_id, 'cashd', 'cashd.compte_statut', 'cashd_comptes', c.id::text,
      jsonb_build_object('avant', c.statut, 'apres', 'attente_contact', 'motif', 'relance non remise', 'envoi', e.id, 'remise', e.remise), c.entite_id);
  end if;
  perform private.cashd_alerter_commercial(c.id, 'attention',
    format('La relance de %s n''a pas été remise (%s) : le compte attend un nouvel interlocuteur.', c.nom, coalesce(e.remise, e.statut)),
    jsonb_build_object('relance', r.id, 'envoi', e.id), 'adresse:' || c.id::text);
  return jsonb_build_object('compte', c.id, 'statut', 'attente_contact');
end $function$;

-- Une réponse reçue à une relance : notée sur la relance (taux de réponse), signalée au commercial du compte. Le
-- contenu se lit ; si le client conteste, la personne met la facture en litige.
create or replace function private.cashd_suivre_reception(p_charge jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  x public.receptions;
  r public.cashd_relances;
  v_id bigint;
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
  perform private.cashd_alerter_commercial(r.compte_id, 'info',
    format('Réponse reçue à la relance du %s (%s) : lisez-la ; si le client conteste, mettez la facture en litige.', to_char(r.jour, 'DD/MM/YYYY'),
           left(coalesce(x.sujet, 'sans objet'), 120)),
    jsonb_build_object('relance', r.id, 'reception', x.id), 'reponse:' || r.id::text);
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.reponse_recue', 'cashd_relances', r.id::text,
    jsonb_build_object('reception', x.id, 'recu_le', x.recu_le, 'de', x.de_empreinte), r.entite_id);
  return jsonb_build_object('relance', r.id, 'reponse_le', x.recu_le);
end $function$;

do $do$ begin
  insert into private.abonnements (evenement, module, genre)
  select v.e, 'cashd', v.g from (values ('envoi.non_remis.cashd', 'cashd.envoi'), ('envoi.echec.cashd', 'cashd.envoi'), ('envoi.refuse.cashd', 'cashd.envoi'),
                                        ('reception.nouvelle', 'cashd.reception'), ('reception.nouvelle.cashd', 'cashd.reception')) v(e, g)
  where not exists (select 1 from private.abonnements a where a.evenement = v.e and a.module = 'cashd');
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Les devises
-- ═══════════════════════════════════════════════════════════════════════════

-- Poser un taux : le serveur (taux de référence de la BCE, pour tous) ou un gestionnaire (taux de son organisation).
create or replace function public.cashd_poser_taux(p_devise text, p_jour date, p_taux numeric, p_client uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_source text; v_client uuid := p_client;
begin
  if (select auth.uid()) is null and private.cashd_role_session() in ('service_role', 'postgres') and p_client is null then
    v_source := 'bce';
  else
    if p_client is null then
      raise exception 'Un taux saisi appartient à une organisation.' using errcode = '22023';
    end if;
    perform private.cashd_exiger_gestion(p_client);
    v_source := 'saisie';
  end if;
  if upper(coalesce(p_devise, '')) !~ '^[A-Z]{3}$' or upper(p_devise) = 'EUR' or p_taux is null or p_taux <= 0 or p_jour is null then
    raise exception 'Un taux : une devise (hors euro), un jour, un nombre positif (1 unité = x euros).' using errcode = '22023';
  end if;
  insert into public.cashd_taux_change (devise, jour, taux, source, client_id)
  values (upper(p_devise), p_jour, p_taux, v_source, v_client)
  on conflict (devise, jour, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update set taux = excluded.taux, source = excluded.source;
  if v_client is not null then
    perform private.journaliser_module(v_client, 'cashd', 'cashd.taux', 'cashd_taux_change', upper(p_devise) || ':' || p_jour::text,
      jsonb_build_object('devise', upper(p_devise), 'jour', p_jour, 'taux', p_taux), null);
  end if;
  return jsonb_build_object('devise', upper(p_devise), 'jour', p_jour, 'taux', p_taux, 'source', v_source);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Le plafond d'encours
-- ═══════════════════════════════════════════════════════════════════════════

-- Proposer un plafond à partir de l'historique : facturé mensuel moyen des douze derniers mois × (durée moyenne de
-- paiement en mois + une demi-marge), arrondi à la centaine supérieure. Sous les droits de qui lit.
create or replace function public.cashd_proposer_plafond(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  with c as (select * from public.cashd_comptes where id = p_compte),
       g as (select x.* from public.cashd_reglages x join c on c.client_id = x.client_id),
       f as (select coalesce(sum(e.montant_ttc_eur), 0) / 12.0 as mensuel, count(*) as n
             from public.cashd_factures_etat e join c on c.id = e.compte_id
             where e.nature in ('facture', 'acompte') and e.date_emission >= (now() at time zone 'Europe/Paris')::date - 365),
       d as (select x.delai_moyen_jours from public.cashd_delais_reglement x where x.compte_id = p_compte)
  select case when (select count(*) from c) = 0 then null else jsonb_build_object(
    'facture_mensuel_moyen', round((select mensuel from f), 2),
    'factures_douze_mois', (select n from f),
    'delai_moyen_jours', (select delai_moyen_jours from d),
    'delai_retenu_jours', coalesce((select delai_moyen_jours from d), (select delai_paiement_jours from c), (select delai_paiement_jours from g), 30),
    'propose', case when (select n from f) = 0 then null
                    else ceil((select mensuel from f) * (coalesce((select delai_moyen_jours from d), (select delai_paiement_jours from c), (select delai_paiement_jours from g), 30) / 30.0 + 0.5) / 100.0) * 100 end,
    'plafond_actuel', (select plafond_encours from c)) end
$function$;

create or replace function public.cashd_fixer_plafond(p_compte uuid, p_plafond numeric, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.cashd_comptes;
begin
  select * into c from public.cashd_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(c.client_id, c.entite_id);
  if p_plafond is not null and p_plafond < 0 then
    raise exception 'Un plafond est positif (vide : pas de plafond).' using errcode = '22023';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un plafond se fixe avec son motif.' using errcode = '22023';
  end if;
  update public.cashd_comptes set plafond_encours = round(p_plafond, 2), maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.plafond', 'cashd_comptes', c.id::text,
    jsonb_build_object('avant', c.plafond_encours, 'apres', round(p_plafond, 2), 'motif', left(btrim(p_motif), 500)), c.entite_id);
  return jsonb_build_object('compte', c.id, 'plafond', round(p_plafond, 2));
end $function$;

-- Les comptes au-dessus de leur plafond : une alerte par compte et par jour, au commercial.
create or replace function private.cashd_alerter_plafonds(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare r record; n integer := 0;
begin
  for r in select b.* from public.cashd_balance_agee b where b.client_id = p_client and b.plafond_encours is not null and b.encours > b.plafond_encours loop
    if private.cashd_alerter_commercial(r.compte_id, 'attention',
         format('%s dépasse son plafond d''encours : %s pour %s autorisés. Toute nouvelle commande attend la décision d''un responsable.', r.nom,
                private.cashd_eur(r.encours), private.cashd_eur(r.plafond_encours)),
         jsonb_build_object('encours', r.encours, 'plafond', r.plafond_encours),
         'plafond:' || r.compte_id::text || ':' || to_char((now() at time zone 'Europe/Paris')::date, 'YYYYMMDD')) is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;

-- Vérifier une commande avant de l'accepter (porte du système de commandes de l'organisation, ou de l'écran) : au-delà
-- du plafond, elle est bloquée et une demande de validation part au responsable ; sa décision se lit sur la demande.
create or replace function public.cashd_verifier_commande(p_compte uuid, p_montant numeric, p_reference text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_uid uuid := (select auth.uid());
  v_encours numeric;
  v_id uuid;
  v_dem uuid;
  v_statut text;
begin
  select * into c from public.cashd_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null then
    if private.cashd_role_session() not in ('service_role', 'postgres') then
      raise exception 'Une commande se vérifie par un membre de l''organisation, ou par le serveur.' using errcode = '42501';
    end if;
  elsif not (private.voit_entite(c.client_id, c.entite_id) and private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])) then
    raise exception 'Une commande se vérifie par un membre de l''organisation, ou par le serveur.' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Le montant de la commande est positif.' using errcode = '22023';
  end if;
  select coalesce(b.encours, 0) into v_encours from public.cashd_balance_agee b where b.compte_id = c.id;
  v_statut := case when c.plafond_encours is null or coalesce(v_encours, 0) + p_montant <= c.plafond_encours then 'autorisee' else 'bloquee' end;
  insert into public.cashd_commandes (client_id, compte_id, reference, montant, encours, plafond, statut, demande_par)
  values (c.client_id, c.id, left(nullif(btrim(p_reference), ''), 120), round(p_montant, 2), coalesce(v_encours, 0), c.plafond_encours, v_statut, v_uid)
  returning id into v_id;
  if v_statut = 'bloquee' then
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
    values (c.client_id, c.entite_id, 'cashd', 'cashd.commande_hors_plafond', 'cashd_commandes', v_id::text,
            left(format('Commande %s de %s au-delà du plafond : %s, encours %s pour un plafond de %s', coalesce(p_reference, ''), c.nom,
                        private.cashd_eur(round(p_montant, 2)), private.cashd_eur(coalesce(v_encours, 0)), private.cashd_eur(c.plafond_encours)), 500),
            round(p_montant, 2),
            jsonb_build_object('commande', v_id, 'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
                               'montant', round(p_montant, 2), 'encours', coalesce(v_encours, 0), 'plafond', c.plafond_encours, 'reference', p_reference),
            now() + interval '3 days', 'cashd:commande:' || v_id::text)
    returning id into v_dem;
    update public.cashd_commandes set demande_id = v_dem where id = v_id;
    perform private.cashd_alerter_commercial(c.id, 'attention',
      format('Commande %s de %s bloquée : elle ferait passer l''encours à %s pour un plafond de %s.', coalesce(p_reference, ''), c.nom,
             private.cashd_eur(coalesce(v_encours, 0) + round(p_montant, 2)), private.cashd_eur(c.plafond_encours)),
      jsonb_build_object('commande', v_id, 'demande', v_dem), 'commande:' || v_id::text);
  end if;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.commande_verifiee', 'cashd_comptes', c.id::text,
    jsonb_build_object('commande', v_id, 'reference', p_reference, 'montant', round(p_montant, 2), 'encours', v_encours, 'plafond', c.plafond_encours,
                       'statut', v_statut, 'demande', v_dem), c.entite_id);
  return jsonb_build_object('commande', v_id, 'statut', v_statut, 'encours', coalesce(v_encours, 0), 'plafond', c.plafond_encours, 'demande', v_dem);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. La prévision d'encaissement à 30 et 60 jours
-- ═══════════════════════════════════════════════════════════════════════════
-- Chaque pièce ouverte est attendue à son échéance décalée du retard moyen habituel de son compte (jamais avant
-- aujourd'hui) ; les comptes en litige, en recouvrement ou hors périmètre, et les parts contestées, sont tenus à part.
create or replace function public.cashd_prevision(p_client uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  with j as (select (now() at time zone 'Europe/Paris')::date as jour),
       p as (
         select f.compte_id, c.nom, c.statut, f.reste_relancable * f.taux_eur as attendu, f.montant_conteste * f.taux_eur as conteste,
                greatest(coalesce(f.echeance, f.date_emission + 30) + coalesce(d.retard_moyen_jours, 0)::integer, j.jour) as attendu_le
         from public.cashd_factures_etat f cross join j
         join public.cashd_comptes c on c.id = f.compte_id
         left join public.cashd_delais_reglement d on d.compte_id = f.compte_id
         where f.client_id = p_client and f.nature in ('facture', 'acompte') and f.statut = 'ouverte' and f.reste_du > 0)
  select jsonb_build_object(
    'a_30_jours', round(coalesce((select sum(p.attendu) from p, j where p.statut in ('actif', 'pause', 'attente_contact') and p.attendu_le <= j.jour + 30), 0), 2),
    'a_60_jours', round(coalesce((select sum(p.attendu) from p, j where p.statut in ('actif', 'pause', 'attente_contact') and p.attendu_le <= j.jour + 60), 0), 2),
    'au_dela', round(coalesce((select sum(p.attendu) from p, j where p.statut in ('actif', 'pause', 'attente_contact') and p.attendu_le > j.jour + 60), 0), 2),
    'tenu_a_part', round(coalesce((select sum(p.attendu) from p where p.statut not in ('actif', 'pause', 'attente_contact')), 0)
                         + coalesce((select sum(p.conteste) from p), 0), 2),
    'par_compte', (select coalesce(jsonb_agg(x order by x.a_30_jours desc), '[]'::jsonb) from (
        select p.compte_id, p.nom, round(sum(p.attendu) filter (where p.attendu_le <= j.jour + 30), 2) as a_30_jours,
               round(sum(p.attendu) filter (where p.attendu_le <= j.jour + 60), 2) as a_60_jours
        from p, j where p.statut in ('actif', 'pause', 'attente_contact') group by p.compte_id, p.nom) x))
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Le lien de paiement (contrat d'interface ; tiers : le prestataire de paiement de l'organisation)
-- ═══════════════════════════════════════════════════════════════════════════
-- Le serveur d'Omega (ouvrier du prestataire) pose le lien d'une facture ; il accompagne la relance ; quand le
-- prestataire signale le paiement (webhook), cashd_lien_paye note le règlement, le lettre, éteint le lien. Un règlement
-- noté autrement éteint aussi le lien (cashd_suivre_solde).
create or replace function public.cashd_poser_lien(p_facture uuid, p_prestataire text, p_reference text, p_url text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_id uuid;
begin
  if (select auth.uid()) is not null or private.cashd_role_session() not in ('service_role', 'postgres') then
    raise exception 'Un lien de paiement se pose par le serveur d''Omega (prestataire branché).' using errcode = '42501';
  end if;
  select * into f from public.cashd_factures where id = p_facture;
  if not found or f.nature not in ('facture', 'acompte') or f.statut <> 'ouverte' then
    raise exception 'Facture ouverte introuvable.' using errcode = 'P0002';
  end if;
  update public.cashd_liens_paiement set statut = 'eteint', eteint_le = now(), eteint_motif = 'remplacé' where facture_id = f.id and statut = 'actif';
  insert into public.cashd_liens_paiement (client_id, facture_id, prestataire, reference, url)
  values (f.client_id, f.id, lower(p_prestataire), p_reference, p_url)
  on conflict (prestataire, reference) do update set url = excluded.url, statut = 'actif', eteint_le = null, eteint_motif = null
  returning id into v_id;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.lien_pose', 'cashd_factures', f.id::text,
    jsonb_build_object('prestataire', lower(p_prestataire), 'reference', p_reference), f.entite_id);
  return v_id;
end $function$;

create or replace function public.cashd_lien_paye(p_prestataire text, p_reference text, p_montant numeric, p_date date default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare l public.cashd_liens_paiement; f public.cashd_factures; v_res jsonb;
begin
  if (select auth.uid()) is not null or private.cashd_role_session() not in ('service_role', 'postgres') then
    raise exception 'Le paiement d''un lien est signalé par le serveur d''Omega.' using errcode = '42501';
  end if;
  select * into l from public.cashd_liens_paiement where prestataire = lower(p_prestataire) and reference = p_reference for update;
  if not found then
    return jsonb_build_object('inconnu', true);
  end if;
  if l.statut = 'paye' then
    return jsonb_build_object('lien', l.id, 'deja_paye', true);
  end if;
  select * into f from public.cashd_factures where id = l.facture_id;
  v_res := private.cashd_noter_reglement(f.client_id, f.compte_id, p_montant, coalesce(p_date, (now() at time zone 'Europe/Paris')::date),
    'LIEN ' || p_reference, 'lien_paiement', f.id, f.entite_id, 'paiement par lien (' || lower(p_prestataire) || ')', f.numero, 'saisie',
    'lien:' || lower(p_prestataire) || ':' || p_reference);
  update public.cashd_liens_paiement set statut = 'paye', eteint_le = now(), eteint_motif = 'payé' where id = l.id;
  return v_res || jsonb_build_object('lien', l.id);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Le solde suivi (c2_02), qui éteint désormais le lien et suit l'échéancier
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_suivre_solde(p_facture uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_reste numeric; v_brut numeric; v_statut text;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found then
    return null;
  end if;
  v_statut := f.statut;
  if f.nature = 'avoir' then
    v_reste := private.cashd_reste(f.id);
    if v_reste <= 0.005 and f.statut = 'ouverte' then
      update public.cashd_factures set statut = 'soldee', statut_motif = 'avoir entièrement imputé', statut_le = now(), maj_le = now() where id = f.id;
      v_statut := 'soldee';
    elsif v_reste > 0.005 and f.statut = 'soldee' then
      update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
      v_statut := 'ouverte';
    end if;
    return v_statut;
  end if;
  if f.nature = 'devis' then
    return f.statut;
  end if;
  v_brut := f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0);
  if f.statut = 'ouverte' and v_brut <= 0.005 then
    update public.cashd_factures set statut = 'soldee', statut_motif = 'réglée (lettrage)', statut_le = now(), maj_le = now() where id = f.id;
    v_statut := 'soldee';
    -- Une facture réglée publie un événement du socle (abonné : REPUT, la demande d'avis après règlement). Aucun module
    -- ne lit les tables de l'autre ; clé idempotente par facture.
    perform private.publier_evenement(f.client_id, 'cashd.facture_reglee',
      (select jsonb_build_object('facture', f.id, 'numero', f.numero, 'compte', f.compte_id, 'entite', f.entite_id,
                                 'regle_le', coalesce((select max(r.recu_le) from public.cashd_imputations x join public.cashd_reglements r on r.id = x.reglement_id
                                                       where x.facture_id = f.id and x.annulee_le is null), (now() at time zone 'Europe/Paris')::date),
                                 'email', c.contact_facturation_email, 'telephone', c.contact_facturation_telephone, 'nom', c.nom,
                                 'particulier', c.particulier, 'langue', c.langue)
       from public.cashd_comptes c where c.id = f.compte_id),
      'facture:' || f.id::text);
  elsif f.statut = 'soldee' and f.statut_motif = 'réglée (lettrage)' and v_brut > 0.005 then
    update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
    v_statut := 'ouverte';
  end if;
  -- Un règlement interrompt la séquence avant le prochain envoi ; le lien de paiement s'éteint au règlement.
  if v_statut <> 'ouverte' or private.cashd_reste(f.id) <= 0.005 then
    perform private.cashd_couper(f.client_id, null, f.id, 'facture ' || f.numero || ' réglée');
    update public.cashd_liens_paiement set statut = 'eteint', eteint_le = now(), eteint_motif = 'facture réglée' where facture_id = f.id and statut = 'actif';
  else
    perform private.cashd_suivre_echeancier(f.id);
  end if;
  return v_statut;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12 bis. Un contact en litige (pour REPUT : aucune réponse automatisée à un client en litige ouvert)
-- ═══════════════════════════════════════════════════════════════════════════
-- Vrai si un compte de l'organisation dont l'adresse de facturation, l'adresse commerciale (en minuscules) ou le
-- téléphone de facturation (neuf derniers chiffres) égale p_adresse est en litige, ou porte une facture en litige
-- (entière ou contestée en partie). Lu par le serveur seul ; aucun module ne lit les tables de l'autre.
create or replace function private.cashd_contact_en_litige(p_client uuid, p_adresse text)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  with a as (select lower(btrim(coalesce(p_adresse, ''))) as courriel,
                    right(regexp_replace(coalesce(p_adresse, ''), '[^0-9]', '', 'g'), 9) as chiffres)
  select exists (
    select 1 from public.cashd_comptes c, a
    where c.client_id = p_client
      and ((a.courriel <> '' and a.courriel in (lower(c.contact_facturation_email), lower(c.contact_commercial_email)))
           or (char_length(a.chiffres) = 9 and right(regexp_replace(coalesce(c.contact_facturation_telephone, ''), '[^0-9]', '', 'g'), 9) = a.chiffres))
      and (c.statut = 'litige'
           or exists (select 1 from public.cashd_factures f where f.compte_id = c.id and (f.statut = 'litige' or f.montant_conteste > 0))))
$function$;
revoke execute on function private.cashd_contact_en_litige(uuid, text) from public, anon, authenticated;
grant execute on function private.cashd_contact_en_litige(uuid, text) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. Le texte (c2_02) : part contestée, échéancier, devise, lien de paiement
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_ecrire_texte(p_relance uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  v_emetteur text;
  v_l text;
  v_lignes text := '';
  v_total numeric := 0;
  v_pen numeric := 0;
  v_ind numeric := 0;
  v_n integer := 0;
  v_max_retard integer := 0;
  v_ttc_total numeric := 0;
  v_retardataire boolean;
  v_bonjour text;
  v_sujet text;
  v_corps text;
  v_limite date;
  v_ref text;
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
    v_total := v_total + p.reste_du;
    v_ttc_total := v_ttc_total + p.montant_ttc;
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
  v_bonjour := case when v_l = 'en' then 'Dear ' || coalesce(c.contact_facturation_nom, 'Sir or Madam') || ','
                    else 'Bonjour' || coalesce(' ' || c.contact_facturation_nom, ' Madame, Monsieur') || ',' end;
  v_limite := r.jour + g.delai_mise_en_demeure_jours;

  if r.nature = 'devis' then
    if v_l = 'en' then
      v_sujet := format('%s — following up on our quote%s', v_emetteur, case when v_n > 1 then 's' else ' ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'We sent you the following quote%s (account %s):\n', case when v_n > 1 then 's' else '' end, v_ref) || v_lignes
        || case when r.palier = 'devis_rappel' then E'\nDo you have any questions, or would you like us to adjust anything? We will be glad to discuss it.\n'
                else E'\nWe would be grateful for your decision so that we can plan the work. If the project has changed, a short reply is enough.\n' end;
    else
      v_sujet := format('%s — votre devis%s', v_emetteur, case when v_n > 1 then ' (' || v_n || ')' else ' ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'Nous vous avons adressé le%s devis suivant%s (compte %s) :\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end, v_ref) || v_lignes
        || case when r.palier = 'devis_rappel' then E'\nAvez-vous des questions, ou souhaitez-vous que nous l''ajustions ? Nous en parlerons volontiers.\n'
                else E'\nVotre réponse nous permettrait de planifier les travaux. Si le projet a changé, un mot suffit pour nous le dire.\n' end;
    end if;
  elsif r.palier = 'mise_en_demeure' then
    if v_l = 'en' then
      v_sujet := format('%s — formal notice to pay %s', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Despite our previous reminders, the following amounts remain unpaid (account %s):\n', v_ref) || v_lignes
        || format(E'\nWe hereby give you formal notice to pay the sum of %s within %s days of receipt of this letter, that is by %s at the latest.\n',
                  private.cashd_eur(v_total, v_l), g.delai_mise_en_demeure_jours, private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 or v_pen > 0 then format(E'Under articles L441-10 and D441-5 of the French Commercial Code, late payment interest%s and a fixed recovery fee of %s per invoice (%s in total) are also due.\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' to date)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l)) else '' end
        || E'Failing payment within this period, we will initiate recovery proceedings without further notice.\n';
    else
      v_sujet := format('%s — mise en demeure de payer %s', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Malgré nos précédentes relances, les sommes suivantes restent impayées (compte %s) :\n', v_ref) || v_lignes
        || format(E'\nPar la présente, nous vous mettons en demeure de régler la somme de %s dans un délai de %s jours à compter de la réception de ce courrier, soit au plus tard le %s.\n',
                  private.cashd_eur(v_total, v_l), g.delai_mise_en_demeure_jours, private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 or v_pen > 0 then format(E'En application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard%s et une indemnité forfaitaire pour frais de recouvrement de %s par facture (%s au total).\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' à ce jour)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l)) else '' end
        || E'À défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.\n';
    end if;
  elsif r.palier = 'rappel' or (select x.rang from public.cashd_relances_pieces x where x.relance_id = r.id and not x.annulee order by x.rang desc limit 1) = 1 then
    if v_l = 'en' then
      v_sujet := format('%s — reminder: %s overdue', v_emetteur, case when v_n > 1 then v_n || ' invoices' else 'invoice ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'Unless we are mistaken, the following amount%s remain%s unpaid on your account %s:\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then '' else 's' end, v_ref) || v_lignes
        || case when not v_retardataire then E'\nThis is probably a simple oversight. ' else E'\n' end
        || E'If payment has already been made, please disregard this message. Should you have any question about this invoice, simply reply to this e-mail.\n';
    else
      v_sujet := format('%s — rappel : %s', v_emetteur, case when v_n > 1 then v_n || ' factures échues' else 'facture ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) || ' échue' end);
      v_corps := v_bonjour || E'\n\n' || format(E'Sauf erreur de notre part, %s sur votre compte %s :\n', case when v_n > 1 then 'les sommes suivantes restent dues' else 'la somme suivante reste due' end, v_ref) || v_lignes
        || case when not v_retardataire then E'\nIl s''agit sans doute d''un simple oubli. ' else E'\n' end
        || E'Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.\n';
    end if;
  else
    -- La relance ferme : elle récapitule les sommes dues, ce que le retard ouvre de droit, et fixe une échéance.
    if v_l = 'en' then
      v_sujet := format('%s — second reminder: %s outstanding', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Despite our reminder, the following amount%s still remain%s unpaid on your account %s:\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then '' else 's' end, v_ref) || v_lignes
        || format(E'\nTotal outstanding: %s. Please settle it by %s at the latest.\n', private.cashd_eur(v_total, v_l), private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 then format(E'We remind you that any late payment entitles us to a fixed recovery fee of %s per invoice and to late payment interest (French Commercial Code, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) else '' end
        || E'If you dispute any part of these amounts, please let us know in writing so that we can look into it.\n';
    else
      v_sujet := format('%s — relance : %s restent dus', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Malgré notre précédent rappel, %s sur votre compte %s :\n', case when v_n > 1 then 'les sommes suivantes restent impayées' else 'la somme suivante reste impayée' end, v_ref) || v_lignes
        || format(E'\nTotal restant dû : %s. Nous vous remercions de procéder au règlement au plus tard le %s.\n', private.cashd_eur(v_total, v_l), private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 then format(E'Nous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de %s par facture et des pénalités de retard (Code de commerce, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) else '' end
        || E'Si vous contestez tout ou partie de ces montants, merci de nous l''écrire pour que nous l''examinions.\n';
    end if;
  end if;
  v_corps := v_corps || E'\n' || coalesce(nullif(btrim(g.formule), ''), case when v_l = 'en' then 'Kind regards,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
             || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_emetteur) || E'\n';
  return jsonb_build_object('sujet', left(v_sujet, 300), 'corps', v_corps, 'montant', v_total, 'penalites', v_pen, 'indemnites', v_ind,
                            'retard_max', v_max_retard, 'pieces', v_n);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. Préparer les relances (c2_02) : part contestée hors relance, LRE au-delà du seuil, lien de paiement
-- ═══════════════════════════════════════════════════════════════════════════

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
                and (select e.reste_relancable from public.cashd_factures_etat e where e.id = s.facture_id) > g.seuil_relance)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. Le point du matin (c2_02) : plus les comptes qui se dégradent
-- ═══════════════════════════════════════════════════════════════════════════

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
  return v_items;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. Le passage du matin (c2_02) : jours ouvrés, plafonds, dégradations
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. Les travaux (c2_02) : envois non remis, réponses reçues ; plafonds après chaque intégration
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_traiter_travaux(p_nombre integer default 20)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in select * from private.prendre_travaux(array['cashd.appliquer_releve', 'cashd.envoi', 'cashd.reception'], p_nombre, interval '10 minutes', 'cashd-sql') loop
    begin
      if t.genre = 'cashd.envoi' then
        r := private.cashd_suivre_envoi(t.charge);
      elsif t.genre = 'cashd.reception' then
        r := private.cashd_suivre_reception(t.charge);
      else
        r := private.cashd_appliquer_releve(t.charge);
        r := r || jsonb_build_object('relettrees', private.cashd_relettrer(t.client_id), 'relances_coupees', private.cashd_verifier_relances(t.client_id),
                                     'plafonds', private.cashd_alerter_plafonds(t.client_id));
      end if;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

create or replace function public.cashd_importer(p_client uuid, p_jeu text, p_lignes jsonb, p_complet boolean default false,
  p_entite uuid default null, p_fichier text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_entite uuid; v_res jsonb;
begin
  v_entite := private.cashd_entite(p_client, p_entite);
  perform private.cashd_exiger_gestion(p_client, v_entite);
  v_res := private.cashd_integrer(p_client, v_entite, p_jeu, p_lignes, p_complet, 'import', left(coalesce(nullif(btrim(p_fichier), ''), 'dépôt depuis l''espace'), 200));
  return v_res || jsonb_build_object('relettrees', private.cashd_relettrer(p_client), 'relances_coupees', private.cashd_verifier_relances(p_client),
                                     'plafonds', private.cashd_alerter_plafonds(p_client));
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. Le tableau (c2_01) : comptage continu par statut, litiges, dégradations
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cashd_tableau(p_client uuid, p_entite uuid default null)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  with b as (select * from public.cashd_balance_agee x where x.client_id = p_client and (p_entite is null or x.entite_id = p_entite))
  select jsonb_build_object(
    'reglages', (select to_jsonb(g) from public.cashd_reglages g where g.client_id = p_client),
    'totaux', (select jsonb_build_object(
        'encours', coalesce(sum(b.encours), 0), 'echu', coalesce(sum(b.echu), 0), 'non_echu', coalesce(sum(b.non_echu), 0),
        'echu_1_30', coalesce(sum(b.echu_1_30), 0), 'echu_31_60', coalesce(sum(b.echu_31_60), 0),
        'echu_61_90', coalesce(sum(b.echu_61_90), 0), 'echu_plus_90', coalesce(sum(b.echu_plus_90), 0),
        'en_litige', coalesce(sum(b.en_litige), 0), 'credits', coalesce(sum(b.credits), 0),
        'comptes_en_retard', count(*) filter (where b.echu > 0), 'factures_echues', coalesce(sum(b.factures_echues), 0),
        'au_dessus_du_plafond', count(*) filter (where b.plafond_encours is not null and b.encours > b.plafond_encours),
        'pieces_sans_taux', coalesce(sum(b.pieces_sans_taux), 0)) from b),
    -- c2_03 : les créances en litige, en pause, en recouvrement… comptées en continu ; les comptes qui se dégradent
    'par_statut', (select coalesce(jsonb_object_agg(s.statut, jsonb_build_object('comptes', s.n, 'encours', s.encours)), '{}'::jsonb)
                   from (select b.statut, count(*) as n, sum(b.encours) as encours from b where b.statut <> 'actif' group by b.statut) s),
    'factures_en_litige', (select jsonb_build_object('nombre', count(*) filter (where f.statut = 'litige' or f.montant_conteste > 0),
                                                     'montant', coalesce(sum(case when f.statut = 'litige' then f.reste_du_eur else f.montant_conteste * f.taux_eur end)
                                                                         filter (where f.statut = 'litige' or f.montant_conteste > 0), 0))
                           from public.cashd_factures_etat f where f.client_id = p_client and f.nature in ('facture', 'acompte') and f.reste_du > 0
                             and (p_entite is null or f.entite_id = p_entite)),
    'se_degradent', (select coalesce(jsonb_agg(jsonb_build_object('compte_id', d.compte_id, 'nom', d.nom, 'delai_recent', d.delai_recent_jours,
                                                                  'delai_moyen', d.delai_moyen_jours, 'retard_actuel', d.retard_actuel_jours)), '[]'::jsonb)
                     from public.cashd_delais_reglement d where d.client_id = p_client and d.se_degrade and (p_entite is null or d.entite_id = p_entite)),
    'comptes', (select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('depasse_plafond', b.plafond_encours is not null and b.encours > b.plafond_encours)
                                          order by b.echu desc, b.encours desc, b.nom), '[]'::jsonb) from b where b.encours > 0 or b.credits > 0 or b.statut <> 'actif'),
    'a_imputer', (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('compte', (select c.nom from public.cashd_comptes c where c.id = r.compte_id))
                                            order by r.recu_le desc), '[]'::jsonb)
                  from public.cashd_reglements_etat r where r.client_id = p_client and r.a_imputer > 0 and (p_entite is null or r.entite_id = p_entite)),
    'devis_en_attente', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'numero', f.numero, 'compte_id', f.compte_id,
                                        'compte', (select c.nom from public.cashd_comptes c where c.id = f.compte_id), 'montant_ttc', f.montant_ttc,
                                        'date_emission', f.date_emission, 'jours_ecoules', f.jours_ecoules) order by f.date_emission), '[]'::jsonb)
                         from public.cashd_factures_etat f where f.client_id = p_client and f.nature = 'devis' and f.statut = 'en_attente'
                           and (p_entite is null or f.entite_id = p_entite)),
    'dernier_import', (select max(f.vue_le) from public.cashd_factures f where f.client_id = p_client))
  from (select 1) x
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. Droits
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function private.cashd_alerter_commercial(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_echeancier(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_envoi(jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_reception(jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_alerter_plafonds(uuid) from public, anon, authenticated;
grant execute on function private.cashd_suivre_envoi(jsonb) to service_role;
grant execute on function private.cashd_suivre_reception(jsonb) to service_role;

revoke execute on function public.cashd_poser_echeancier(uuid, jsonb, text) from public, anon;
revoke execute on function public.cashd_litige_partiel(uuid, numeric, text) from public, anon;
revoke execute on function public.cashd_dossier(uuid, uuid, text) from public, anon;
revoke execute on function public.cashd_remettre_dossier(uuid, text, text, text) from public, anon;
revoke execute on function public.cashd_poser_taux(text, date, numeric, uuid) from public, anon;
revoke execute on function public.cashd_proposer_plafond(uuid) from public, anon;
revoke execute on function public.cashd_fixer_plafond(uuid, numeric, text) from public, anon;
revoke execute on function public.cashd_verifier_commande(uuid, numeric, text) from public, anon;
revoke execute on function public.cashd_prevision(uuid) from public, anon;
revoke execute on function public.cashd_poser_lien(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.cashd_lien_paye(text, text, numeric, date) from public, anon, authenticated;
grant execute on function public.cashd_poser_echeancier(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.cashd_litige_partiel(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.cashd_dossier(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cashd_remettre_dossier(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.cashd_poser_taux(text, date, numeric, uuid) to authenticated, service_role;
grant execute on function public.cashd_proposer_plafond(uuid) to authenticated, service_role;
grant execute on function public.cashd_fixer_plafond(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.cashd_verifier_commande(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.cashd_prevision(uuid) to authenticated, service_role;
grant execute on function public.cashd_poser_lien(uuid, text, text, text) to service_role;
grant execute on function public.cashd_lien_paye(text, text, numeric, date) to service_role;
