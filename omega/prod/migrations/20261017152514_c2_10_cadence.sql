-- 20261017152514 c2_10_cadence
-- Source : dépôt : 7a5678f0 omega/modules/cashd/migrations/c2_10_cadence.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_10_cadence.sql @ 7a5678f0.
-- ═══ omega/modules/cashd/migrations/c2_10_cadence.sql @ 7a5678f0
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_10 : la cadence du site devient la cadence par défaut (17/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Décision de Teo (17/10). Par défaut, et réglable par organisation (cashd_regler_relances, scenario / scenario_devis)
-- et par compte (cashd_comptes.scenario) :
--   · facture : un rappel courtois le jour de l'échéance (palier « echeance », J 0), puis rappel J+7, relance ferme
--     J+21, mise en demeure J+30 ;
--   · devis : relancé à J+3 puis à J+7 après l'envoi (avant : J+10).
-- Le rappel du jour d'échéance ne part que ce jour-là : une facture déjà échue quand il serait écrit (installation sur
-- un portefeuille en retard, passage manqué) le saute et suit au rappel J+7 — jamais un « arrive à échéance
-- aujourd'hui » sur une facture en retard. Son texte est propre (deux variantes, fr / en) ; il ne réclame ni pénalité
-- ni indemnité.
-- Pour un devis, l'écart entre deux relances est celui de son scénario (quatre jours entre J+3 et J+7), plafonné par
-- ecart_paliers_jours ; pour une facture, ecart_paliers_jours reste le minimum.
-- Le palier atteint se retrouve désormais par son nom dans le scénario (et non plus par son rang) : changer de scénario
-- en cours de route ne fait pas repartir une facture à un palier déjà passé.
-- Les organisations qui avaient gardé l'ancienne cadence par défaut passent à la nouvelle (journalisé) ; celles qui
-- l'avaient réglée gardent la leur.
--
-- Règles de pose : alter … set default ; create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_reglages alter column scenario
  set default '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb;
alter table public.cashd_reglages alter column scenario_devis
  set default '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 7}]'::jsonb;

do $do$
declare g record;
begin
  for g in
    update public.cashd_reglages x set
      scenario = case when x.scenario = '[{"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb
                      then '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb
                      else x.scenario end,
      scenario_devis = case when x.scenario_devis = '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 10}]'::jsonb
                            then '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 7}]'::jsonb
                            else x.scenario_devis end,
      maj_le = now()
    where x.scenario = '[{"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb
       or x.scenario_devis = '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 10}]'::jsonb
    returning x.client_id, x.scenario, x.scenario_devis
  loop
    perform private.journaliser_module(g.client_id, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', g.client_id::text,
      jsonb_build_object('scenario', g.scenario, 'scenario_devis', g.scenario_devis, 'motif', 'cadence par défaut du 17/10/2026'), null);
  end loop;
end $do$;

-- Chaque pièce suivie (c2_02), avec le palier atteint retrouvé par son nom, le rappel du jour d'échéance sauté quand la
-- facture est déjà échue, l'écart des devis pris dans leur scénario ; plus le rang du palier suivant (en fin de liste :
-- un rejeu de c2_02 garde alors cette définition).
create or replace view public.cashd_suivi with (security_invoker = true) as
with f as (
  select x.*, c.statut as compte_statut, c.reciproque,
         case when x.nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end as sc,
         g.ecart_paliers_jours
  from public.cashd_factures_etat x
  join public.cashd_comptes c on c.id = x.compte_id
  join public.cashd_reglages g on g.client_id = x.client_id
  where (x.nature in ('facture', 'acompte') and x.statut in ('ouverte', 'litige') and x.reste_du > 0)
     or (x.nature = 'devis' and x.statut = 'en_attente')
), dernier as (
  select distinct on (p.facture_id) p.facture_id, p.palier, p.rang, r.jour, r.id as relance_id, r.statut
  from public.cashd_relances_pieces p join public.cashd_relances r on r.id = p.relance_id
  where not p.annulee
  order by p.facture_id, p.rang desc, r.jour desc
)
select f.id as facture_id, f.client_id, f.entite_id, f.compte_id, f.nature, f.numero, f.reste_du, f.montant_ttc, f.echeance,
       f.date_emission, f.retard_jours, f.jours_ecoules, f.statut, f.compte_statut,
       d.palier as palier_atteint, d.jour as palier_atteint_le, d.relance_id as derniere_relance_id, d.statut as derniere_relance_statut,
       s.palier as palier_suivant,
       case when s.palier is null then null
            else greatest(case when f.nature = 'devis' then f.date_emission else coalesce(f.echeance, f.date_emission) end + (s.jours)::integer,
                          coalesce(d.jour + case when f.nature = 'devis' then least(f.ecart_paliers_jours::integer, greatest(s.jours - coalesce(s.precedent, 0), 1))
                                                 else f.ecart_paliers_jours::integer end,
                                   (now() at time zone 'Europe/Paris')::date)) end as palier_suivant_le,
       case
         when f.statut = 'litige' then 'litige'
         when f.reciproque then 'reciproque'
         when f.compte_statut <> 'actif' then f.compte_statut
         when s.palier is null and d.palier is not null then 'sequence_terminee'
         when d.palier is null then 'pas_encore_relancee'
         else 'en_cours' end as etat_sequence,
       s.ordinality::integer as rang_suivant
from f
left join dernier d on d.facture_id = f.id
left join lateral (
  select z.* from (
    select x.value ->> 'palier' as palier, (x.value ->> 'jours')::integer as jours, x.ordinality,
           lag((x.value ->> 'jours')::integer) over (order by x.ordinality) as precedent
    from jsonb_array_elements(f.sc) with ordinality x) z
  -- (un rappel du jour d'échéance retiré du scénario après coup compte pour le palier 0 : le rappel suit)
  where z.ordinality > coalesce((select y.ordinality from jsonb_array_elements(f.sc) with ordinality y where y.value ->> 'palier' = d.palier limit 1),
                                case when d.palier = 'echeance' then 0 else d.rang end, 0)
    -- le rappel du jour d'échéance ne se rattrape pas
    and not (z.palier = 'echeance' and f.nature <> 'devis' and f.retard_jours > 0)
  order by z.ordinality limit 1) s on true;

revoke all on table public.cashd_suivi from anon, authenticated;
grant select on table public.cashd_suivi to authenticated;

-- Les textes par défaut (c2_04), plus le rappel du jour d'échéance.
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
      when 'echeance:1' then jsonb_build_object('sujet', '{emetteur} — {objet} : échéance du jour',
        'corps', E'{bonjour}\n\nPetit rappel : {dues} aujourd''hui sur votre compte {compte} :\n{lignes}\n{ton_montant}Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.\n{reglement}')
      when 'echeance:2' then jsonb_build_object('sujet', '{emetteur} — {objet}, à régler aujourd''hui',
        'corps', E'{bonjour}\n\nNous nous permettons de vous signaler que {dues} ce jour (compte {compte}) :\n{lignes}\n{ton_montant}Si vous avez déjà procédé au règlement, nos messages se sont simplement croisés. Une question ? Répondez simplement à ce courriel.\n{reglement}')
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
    when 'echeance:1' then jsonb_build_object('sujet', '{emetteur} — {objet} due today',
      'corps', E'{bonjour}\n\nA friendly reminder: the following {dues} due today on your account {compte}:\n{lignes}\n{ton_montant}If payment has already been made, please disregard this message. Should you have any question about this invoice, simply reply to this e-mail.\n{reglement}')
    when 'echeance:2' then jsonb_build_object('sujet', '{emetteur} — {objet}: payment due today',
      'corps', E'{bonjour}\n\nWe would like to let you know that the following {dues} due for payment today (account {compte}):\n{lignes}\n{ton_montant}If you have already paid, our messages have simply crossed. Any question? Just reply to this e-mail.\n{reglement}')
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

-- Écrire le texte d'une relance (c2_09), avec le rappel du jour d'échéance.
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
  v_lf text;
  v_ld text;
  p record;
begin
  select * into r from public.cashd_relances where id = p_relance;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  -- Un compte dans une autre langue que le français reçoit, à défaut de textes propres, la version anglaise (c2_09).
  v_l := case when r.langue = 'fr' then 'fr' else 'en' end;
  v_emetteur := coalesce((select e.nom from public.entites e where e.id = r.entite_id), (select x.nom from public.clients x where x.id = r.client_id));
  v_retardataire := private.cashd_payeur_en_retard(c.id);
  -- Les lignes de pièces dans la langue du compte, quand l'organisation les a écrites (c2_09).
  select x.modele into v_lf from public.cashd_gabarits_lignes x where x.client_id = r.client_id and x.langue = r.langue and x.nature = 'facture' and x.actif;
  select x.modele into v_ld from public.cashd_gabarits_lignes x where x.client_id = r.client_id and x.langue = r.langue and x.nature = 'devis' and x.actif;
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
    if r.nature = 'devis' and v_ld is not null then
      v_lignes := v_lignes || '  • ' || private.cashd_rendre(v_ld, jsonb_build_object('numero', p.numero, 'date', private.cashd_date_texte(p.date_emission, v_l),
                    'montant', private.cashd_eur(p.montant_ttc, v_l))) || E'\n';
    elsif r.nature = 'devis' then
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Quote %s of %s: %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l))
        else format(E'  • Devis %s du %s : %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l)) end;
    else
      if p.palier = 'echeance' and v_lf is null then
        -- le rappel du jour d'échéance (c2_10) : la facture est à régler, pas en retard
        v_lignes := v_lignes || case when v_l = 'en'
          then format(E'  • Invoice %s of %s, %s incl. VAT, due on %s: %s to pay\n', p.numero,
                      private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l), private.cashd_eur(p.reste_du, v_l))
          else format(E'  • Facture %s du %s, %s TTC, à régler le %s : %s\n', p.numero,
                      private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l), private.cashd_eur(p.reste_du, v_l)) end;
      elsif v_lf is not null then
        v_lignes := v_lignes || '  • ' || private.cashd_rendre(v_lf, jsonb_build_object('numero', p.numero, 'date', private.cashd_date_texte(p.date_emission, v_l),
                      'montant', private.cashd_eur(p.montant_ttc, v_l), 'echeance', private.cashd_date_texte(p.echeance, v_l), 'retard', p.retard_jours::text,
                      'reste', private.cashd_eur(p.reste_du, v_l))) || E'\n';
      else
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Invoice %s of %s, %s incl. VAT, due on %s (%s days overdue): %s outstanding\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, private.cashd_eur(p.reste_du, v_l))
        else format(E'  • Facture %s du %s, %s TTC, échue le %s (%s jour%s de retard) : %s restant dus\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, case when p.retard_jours > 1 then 's' else '' end, private.cashd_eur(p.reste_du, v_l)) end;
      end if;
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
                when r.palier = 'echeance' then 'echeance'
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
  if v_cle in ('echeance', 'rappel', 'relance') then
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
                  when v_cle = 'echeance' then case when v_n > 1 then v_n || case when v_l = 'en' then ' invoices' else ' factures' end
                                                    else case when v_l = 'en' then 'invoice ' else 'facture ' end || coalesce(v_premier, '') end
                  when v_l = 'en' then case when v_n > 1 then v_n || ' invoices' else 'invoice ' || coalesce(v_premier, '') end
                  else case when v_n > 1 then v_n || ' factures échues' else 'facture ' || coalesce(v_premier, '') || ' échue' end end,
    'dues', case v_l || ':' || v_cle
              when 'fr:echeance' then case when v_n > 1 then 'les factures suivantes arrivent à échéance' else 'la facture suivante arrive à échéance' end
              when 'en:echeance' then case when v_n > 1 then 'invoices are' else 'invoice is' end
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

-- Préparer les relances du jour (c2_04) : le rappel du jour d'échéance n'est écrit que le jour même.
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
          -- le rappel du jour d'échéance ne s'écrit que ce jour-là (c2_10)
          and not (s.palier_suivant = 'echeance' and s.nature <> 'devis' and s.echeance is distinct from p_jour)
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


revoke execute on function private.cashd_gabarit_defaut(text, text, integer) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
