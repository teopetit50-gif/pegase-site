-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_55 : une relance dans une autre langue ne mélange plus le français (27/10/2026, session C2 — TNUIT-06)
-- ═══════════════════════════════════════════════════════════════════════════
-- TNUIT-06 : le texte espagnol était juste, mais il reprenait en français les moyens de règlement (« Virement IBAN … ou
-- chèque à l'ordre de … »), la formule et la signature de l'organisation, sans que rien ne le dise.
-- Désormais :
--   · l'organisation traduit ses moyens de règlement, sa formule et sa signature par langue
--     (cashd_regler_traduction(client, langue, {moyens_reglement, formule, signature})) ; une relance hors français les
--     prend dans la langue du compte, puis dans celle de son texte ;
--   · sans traduction, la formule est celle de la langue du texte (« Atentamente, ») et la signature, le nom de
--     l'émetteur : plus de français ; les moyens de règlement, eux, restent tels quels (ils portent l'IBAN : les retirer
--     ferait perdre de l'argent) ;
--   · et l'organisation est prévenue, une fois par langue : « Relances en espagnol : vos moyens de règlement, votre
--     formule ou votre signature n'existent qu'en français. Traduisez-les dans Vos textes. »
-- Le français ne change pas d'un caractère.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_reglages add column if not exists traductions jsonb not null default '{}'::jsonb;
comment on column public.cashd_reglages.traductions is 'Par langue : moyens_reglement, formule, signature traduits par l''organisation (c2_55).';

-- Le nom d'une langue, pour le dire.
create or replace function private.cashd_nom_langue(p text)
 returns text language sql immutable set search_path to ''
as $function$
  select case p when 'en' then 'anglais' when 'es' then 'espagnol' when 'de' then 'allemand' when 'it' then 'italien' when 'pt' then 'portugais'
                when 'nl' then 'néerlandais' when 'ht' then 'créole haïtien' else 'langue « ' || p || ' »' end
$function$;

-- Traduire les textes de l'organisation dans une langue (gérant ou administrateur) ; un objet vide les retire.
create or replace function public.cashd_regler_traduction(p_client uuid, p_langue text, p_champs jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_l text := lower(split_part(replace(btrim(coalesce(p_langue, '')), '_', '-'), '-', 1));
  v_inconnus text;
  v_t jsonb;
begin
  perform private.cashd_exiger_gestion(p_client);
  if v_l !~ '^[a-z]{2}$' or v_l = 'fr' then
    raise exception 'Langue de traduction : son code de deux lettres, autre que le français (en, es, de…).' using errcode = '22023';
  end if;
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Une traduction se donne en objet : moyens_reglement, formule, signature.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p_champs) k where k not in ('moyens_reglement', 'formule', 'signature');
  if v_inconnus is not null then
    raise exception 'Se traduisent les moyens de règlement, la formule et la signature ; pas : %.', v_inconnus using errcode = '22023';
  end if;
  if char_length(coalesce(p_champs ->> 'moyens_reglement', '')) > 400 or char_length(coalesce(p_champs ->> 'formule', '')) > 200
     or char_length(coalesce(p_champs ->> 'signature', '')) > 200 then
    raise exception 'Moyens de règlement : 400 caractères au plus ; formule et signature : 200.' using errcode = '22023';
  end if;
  select jsonb_object_agg(k, btrim(v)) into v_t from jsonb_each_text(p_champs) x(k, v) where nullif(btrim(v), '') is not null;
  update public.cashd_reglages
     set traductions = case when v_t is null then traductions - v_l else jsonb_set(traductions, array[v_l], v_t) end, maj_le = now()
   where client_id = p_client;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.traduction_reglee', 'cashd_reglages', p_client::text,
    jsonb_build_object('langue', v_l, 'champs', coalesce(v_t, '{}'::jsonb), 'par', (select auth.uid())), null);
  return jsonb_build_object('langue', v_l, 'traduction', coalesce(v_t, '{}'::jsonb));
end $function$;

-- La langue du texte (c2_53), et l'alerte quand les textes de l'organisation n'existent qu'en français.
create or replace function private.cashd_relance_langue_texte()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare g public.cashd_reglages; v_manque text[];
begin
  if new.corps is not null and (tg_op = 'INSERT' or new.corps is distinct from old.corps or new.gabarit is distinct from old.gabarit or new.langue_texte is null) then
    new.langue_texte := private.cashd_langue_texte(new.client_id, new.gabarit, new.langue);
    if new.langue_texte <> 'fr' then
      select * into g from public.cashd_reglages where client_id = new.client_id;
      v_manque := array_remove(array[
        case when nullif(btrim(g.moyens_reglement), '') is not null and g.traductions #> array[new.langue, 'moyens_reglement'] is null
                  and g.traductions #> array[new.langue_texte, 'moyens_reglement'] is null then 'vos moyens de règlement' end,
        case when nullif(btrim(g.formule), '') is not null and g.traductions #> array[new.langue, 'formule'] is null
                  and g.traductions #> array[new.langue_texte, 'formule'] is null then 'votre formule' end,
        case when nullif(btrim(g.signature), '') is not null and g.traductions #> array[new.langue, 'signature'] is null
                  and g.traductions #> array[new.langue_texte, 'signature'] is null then 'votre signature' end], null);
      if cardinality(v_manque) > 0 then
        perform private.lever_alerte_module(new.client_id, 'cashd', 'attention',
          left(format('Relances en %s : %s n''existent qu''en français. Traduisez-les dans Vos textes.',
                      private.cashd_nom_langue(new.langue_texte), array_to_string(v_manque, ', ')), 200),
          jsonb_build_object('langue', new.langue_texte, 'manque', to_jsonb(v_manque),
                             'effet', 'les moyens de règlement partent en français ; la formule et la signature, par défaut dans la langue'),
          'textes:traduction:' || new.client_id::text || ':' || new.langue_texte, true, null);
      end if;
    end if;
  end if;
  return new;
end $function$;

-- Écrire une relance pour une variante donnée (c2_52), avec les traductions de l'organisation.
create or replace function private.cashd_ecrire_texte(p_relance uuid, p_valide_le date, p_variante integer)
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
  v_parti boolean;
  v_lettre boolean;
  v_vars jsonb;
  v_premier text;
  v_reglement text := '';
  v_moyens text;
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
  -- Un compte dans une autre langue que le français reçoit, à défaut de textes propres, la version anglaise (c2_09),
  -- ou espagnole s'il est en espagnol (c2_52).
  v_l := case when r.langue = 'fr' then 'fr' when r.langue = 'es' then 'es' else 'en' end;
  v_emetteur := coalesce((select e.nom from public.entites e where e.id = r.entite_id), (select x.nom from public.clients x where x.id = r.client_id));
  v_retardataire := private.cashd_payeur_en_retard(c.id);
  -- Les lignes de pièces dans la langue du compte, quand l'organisation les a écrites (c2_09).
  select x.modele into v_lf from public.cashd_gabarits_lignes x where x.client_id = r.client_id and x.langue = r.langue and x.nature = 'facture' and x.actif;
  select x.modele into v_ld from public.cashd_gabarits_lignes x where x.client_id = r.client_id and x.langue = r.langue and x.nature = 'devis' and x.actif;
  v_ref := c.reference || case when c.secteur is not null then case when v_l = 'en' then ', ' || c.secteur || ' sector' when v_l = 'es' then ', sector ' || c.secteur else ', secteur ' || c.secteur end else '' end;
  for p in
    select x.*, f.numero, f.date_emission, f.echeance, f.montant_ttc, f.devise,
           nullif(btrim(f.commande_ref), '') as commande,   -- c2_28 : le chantier, la commande
           (select e.montant_conteste from public.cashd_factures_etat e where e.id = f.id) as conteste,
           (select e.regle from public.cashd_factures_etat e where e.id = f.id) as regle,                       -- c2_33
           (select e.dernier_reglement_le from public.cashd_factures_etat e where e.id = f.id) as regle_le,
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
        when v_l = 'es' then format(E'  • Presupuesto %s del %s: %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l))
        else format(E'  • Devis %s du %s : %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l)) end;
    else
      if p.palier = 'echeance' and v_lf is null then
        -- le rappel du jour d'échéance (c2_10) : la facture est à régler, pas en retard
        v_lignes := v_lignes || case when v_l = 'en'
          then format(E'  • Invoice %s of %s, %s incl. VAT%s, due on %s: %s to pay\n', p.numero,
                      private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                      private.cashd_date_texte(p.echeance, v_l), private.cashd_eur(p.reste_du, v_l))
          when v_l = 'es' then format(E'  • Factura %s del %s, %s IVA incluido%s, con vencimiento el %s: %s por pagar\n', p.numero,
                      private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                      private.cashd_date_texte(p.echeance, v_l), private.cashd_eur(p.reste_du, v_l))
          else format(E'  • Facture %s du %s, %s TTC%s, à régler le %s : %s\n', p.numero,
                      private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                      private.cashd_date_texte(p.echeance, v_l), private.cashd_eur(p.reste_du, v_l)) end;
      elsif v_lf is not null then
        v_lignes := v_lignes || '  • ' || private.cashd_rendre(v_lf, jsonb_build_object('numero', p.numero, 'date', private.cashd_date_texte(p.date_emission, v_l),
                      'montant', private.cashd_eur(p.montant_ttc, v_l), 'echeance', private.cashd_date_texte(p.echeance, v_l), 'retard', p.retard_jours::text,
                      'reste', private.cashd_eur(p.reste_du, v_l), 'commande', coalesce(p.commande, ''))) || E'\n';
      else
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Invoice %s of %s, %s incl. VAT%s, due on %s (%s days overdue): %s outstanding\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                    private.cashd_date_texte(p.echeance, v_l), p.retard_jours, private.cashd_eur(p.reste_du, v_l))
        when v_l = 'es' then format(E'  • Factura %s del %s, %s IVA incluido%s, vencida el %s (%s día%s de retraso): %s pendientes\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                    private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, case when p.retard_jours > 1 then 's' else '' end, private.cashd_eur(p.reste_du, v_l))
        else format(E'  • Facture %s du %s, %s TTC%s, échue le %s (%s jour%s de retard) : %s restant dus\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                    private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, case when p.retard_jours > 1 then 's' else '' end, private.cashd_eur(p.reste_du, v_l)) end;
      end if;
      if p.echeances > 0 then
        v_lignes := v_lignes || case when v_l = 'en' then E'    (instalment of the agreed payment schedule)\n' when v_l = 'es' then E'    (plazo del calendario de pago acordado)\n' else E'    (échéance de l''échéancier convenu)\n' end;
      end if;
      -- c2_33 : le reste après un règlement partiel est dit comme tel
      if coalesce(p.regle, 0) > 0 and p.echeances = 0 then
        v_lignes := v_lignes || case when v_l = 'en'
          then format(E'    (%s remains after your payment%s)\n', private.cashd_eur(p.reste_du, v_l), coalesce(' of ' || private.cashd_date_texte(p.regle_le, v_l), ''))
          when v_l = 'es' then format(E'    (quedan %s tras su pago%s)\n', private.cashd_eur(p.reste_du, v_l), coalesce(' del ' || private.cashd_date_texte(p.regle_le, v_l), ''))
          else format(E'    (il reste %s après votre règlement%s)\n', private.cashd_eur(p.reste_du, v_l), coalesce(' du ' || private.cashd_date_texte(p.regle_le, v_l), '')) end;
      end if;
      if coalesce(p.conteste, 0) > 0 then
        v_lignes := v_lignes || case when v_l = 'en' then format(E'    (%s under dispute are not claimed here)\n', private.cashd_eur(p.conteste, v_l))
                                     when v_l = 'es' then format(E'    (%s en disputa no se reclaman aquí)\n', private.cashd_eur(p.conteste, v_l))
                                     else format(E'    (%s contestés ne sont pas réclamés ici)\n', private.cashd_eur(p.conteste, v_l)) end;
      end if;
      if p.devise <> 'EUR' then
        v_lignes := v_lignes || format(E'    (%s)\n', p.devise);
      end if;
      -- c2_40 : sans lien propre à la facture, l'adresse de paiement de l'organisation, pièce par pièce
      if p.lien is null and g.lien_paiement is not null then
        p.lien := replace(replace(g.lien_paiement, '{numero}', private.cashd_url_composant(p.numero)),
                          '{montant}', to_char(p.reste_du, 'FM999999990.00'));
      end if;
      if p.lien is not null then
        v_lignes := v_lignes || case when v_l = 'en' then '    Pay online: ' when v_l = 'es' then '    Pagar en línea: ' else '    Régler en ligne : ' end || p.lien || E'\n';
      end if;
    end if;
  end loop;

  -- Le palier du texte, comme en c2_03.
  v_cle := case when r.nature = 'devis' then case when r.palier = 'devis_rappel' then 'devis_rappel' else 'devis_relance' end
                when r.palier = 'mise_en_demeure' then 'mise_en_demeure'
                when r.palier = 'echeance' then 'echeance'
                when r.palier = 'rappel' or (select x.rang from public.cashd_relances_pieces x where x.relance_id = r.id and not x.annulee order by x.rang desc limit 1) = 1 then 'rappel'
                else 'relance' end;
  -- La langue du gabarit : celle du compte si l'organisation y a écrit ce palier, sinon fr / en.
  v_lt := case when exists (select 1 from private.cashd_gabarits_de(r.client_id) x where x.cle = v_cle and x.langue = r.langue and x.actif)
               then r.langue else v_l end;
  v_nvar := (select count(*) from private.cashd_gabarits_de(r.client_id) x where x.cle = v_cle and x.langue = v_lt and x.actif);
  if v_nvar = 0 then
    v_nvar := private.cashd_variantes_defaut(v_cle);
  end if;
  v_dernier := (select x.variante from public.cashd_relances x
                where x.compte_id = r.compte_id and x.id <> r.id and x.gabarit = v_cle and x.variante is not null
                order by x.jour desc, x.cree_le desc limit 1);
  v_var := case when v_dernier is null then 1 else (v_dernier % v_nvar) + 1 end;
  -- c2_49 : une variante imposée (le choix contre la répétition), ramenée au nombre de variantes
  if p_variante is not null then
    v_var := ((p_variante - 1) % v_nvar) + 1;
  end if;
  select jsonb_build_object('sujet', x.sujet, 'corps', x.corps) into v_gab
  from private.cashd_gabarits_de(r.client_id) x where x.cle = v_cle and x.langue = v_lt and x.actif
  order by x.variante offset v_var - 1 limit 1;
  -- c2_19 : le texte ne cite un envoi précédent que s'il est vraiment parti (envoyé par le moteur ou noté envoyé à la main),
  -- pour l'une des pièces de cette relance. Sinon, la relance ferme et la mise en demeure par défaut ne parlent d'aucun rappel.
  v_parti := exists (select 1 from public.cashd_relances_pieces x
                     join public.cashd_relances_pieces x2 on x2.facture_id = x.facture_id and x2.relance_id <> r.id
                     join public.cashd_relances r2 on r2.id = x2.relance_id
                     left join public.envois e on e.id = r2.envoi_id
                     where x.relance_id = r.id and not x.annulee and (r2.jour, r2.cree_le) < (r.jour, r.cree_le)
                       and (e.statut = 'envoye' or e.envoye_le is not null
                            or exists (select 1 from public.cashd_envois_main m where m.relance_id = r2.id)));
  if v_gab is null and not v_parti and v_cle in ('relance', 'mise_en_demeure') then
    v_gab := private.cashd_gabarit_defaut(v_cle || '_premier', v_l, v_var);
  end if;
  v_gab := coalesce(v_gab, private.cashd_gabarit_defaut(v_cle, v_l, v_var));

  -- Les phrases qui dépendent de la situation.
  -- c2_36 : les moyens de règlement, mise en demeure comprise
  -- c2_55 : hors français, les moyens de règlement, la formule et la signature viennent de la traduction de
  -- l'organisation (langue du compte, puis langue du texte) ; sans traduction, les moyens restent (l'IBAN compte, une
  -- alerte le dit), la formule est celle de la langue et la signature, le nom de l'émetteur
  v_moyens := case when v_l = 'fr' then g.moyens_reglement
                   else coalesce(nullif(btrim(g.traductions #>> array[r.langue, 'moyens_reglement']), ''),
                                 nullif(btrim(g.traductions #>> array[v_l, 'moyens_reglement']), ''), g.moyens_reglement) end;
  if v_cle in ('echeance', 'rappel', 'relance', 'mise_en_demeure') and v_moyens is not null then
    -- c2_38 : une tournure qui tient quel que soit le texte saisi
    v_reglement := case when v_l = 'en' then 'Payment methods: ' when v_l = 'es' then 'Formas de pago: ' else 'Moyens de règlement : ' end || rtrim(btrim(v_moyens), '. ') || E'.\n';
  end if;
  if v_cle in ('echeance', 'rappel', 'relance') then
    -- c2_33 : 1 500 € par défaut, tant que l'organisation n'a pas posé son seuil
    if v_total >= coalesce(g.seuil_ton, 1500) then
      v_ton := case when v_l = 'en' then 'Given the amount involved, please let us know the expected payment date now. '
                    when v_l = 'es' then 'Dado el importe, le agradeceríamos que nos indicara desde ahora la fecha de pago prevista. '
                    else 'Compte tenu du montant en jeu, merci de nous indiquer dès à présent la date de règlement prévue. ' end;
    end if;
    if g.echelonnement_des is not null and v_total >= g.echelonnement_des then
      v_reglement := v_reglement || case when v_l = 'en' then E'If paying in instalments would help, reply to us and we can agree on a schedule.\n'
                                         when v_l = 'es' then E'Si le ayuda pagar en varios plazos, respóndanos: podemos acordar un calendario de pago.\n'
                                         else E'Si un règlement en plusieurs fois vous aide, répondez-nous : nous pouvons convenir d''un échéancier.\n' end;
    end if;
  end if;
  if v_cle = 'relance' and v_ind > 0 then
    v_droits := case when v_l = 'en'
      then format(E'We remind you that any late payment entitles us to a fixed recovery fee of %s per invoice and to late payment interest (French Commercial Code, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l))
      when v_l = 'es' then format(E'Le recordamos que todo retraso en el pago da lugar a una indemnización a tanto alzado por gastos de cobro de %s por factura y a intereses de demora (Código de Comercio francés, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l))
      else format(E'Nous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de %s par facture et des pénalités de retard (Code de commerce, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) end;
  elsif v_cle = 'mise_en_demeure' and (v_ind > 0 or v_pen > 0) then
    v_droits := case when v_l = 'en'
      then format(E'Under articles L441-10 and D441-5 of the French Commercial Code, late payment interest%s and a fixed recovery fee of %s per invoice (%s in total) are also due.\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' to date)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l))
      when v_l = 'es' then format(E'Conforme a los artículos L441-10 y D441-5 del Código de Comercio francés, se adeudan además intereses de demora%s y una indemnización a tanto alzado por gastos de cobro de %s por factura (%s en total).\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' a la fecha)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l))
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
    when 'es:general:devis_rappel' then E'\n¿Tiene alguna pregunta o desea que lo ajustemos? Lo hablaremos con mucho gusto.\n'
    when 'es:general:devis_relance' then E'\nSu respuesta nos permitiría planificar el trabajo. Si el proyecto ha cambiado, basta con unas palabras para decírnoslo.\n'
    when 'es:btp:devis_rappel' then E'\n¿Tiene alguna pregunta sobre la obra, o desea que visitemos el lugar para ajustar el presupuesto? También podemos fijar ya una fecha de intervención.\n'
    when 'es:btp:devis_relance' then E'\nSu conformidad nos permitiría reservar una fecha en nuestra planificación de obras. Si el proyecto ha cambiado, basta con unas palabras para decírnoslo.\n'
    else '' end;

  -- c2_27 : le canal, comme le préparateur le choisira — une mise en demeure au-delà du seuil LRE part en lettre recommandée.
  v_lettre := r.canal in ('lre') or (v_cle = 'mise_en_demeure' and g.seuil_lre is not null and v_total >= g.seuil_lre);
  -- c2_35 : la date limite laisse le temps de la validation (3 jours ouvrés par défaut) et, pour un courrier ou une
  -- lettre recommandée, celui de la remise (2 jours par défaut) ; le texte est écrit à la préparation.
  -- c2_39 : réécrit à l'approbation (crochet du socle, lot 19ay), la limite part du jour de la validation — sans marge ;
  -- sinon (texte écrit à la préparation), la marge de validation de c2_35.
  v_limite := case when p_valide_le is not null then greatest(p_valide_le, r.jour)
                   else private.cashd_jours_ouvres(r.jour, coalesce(g.marge_validation_jours, 3)) end
              + g.delai_mise_en_demeure_jours
              + case when v_lettre then coalesce(g.remise_courrier_jours, 2) else 0 end;
  v_vars := jsonb_build_object(
    'bonjour', case when v_l = 'en' then 'Dear ' || coalesce(c.contact_facturation_nom, 'Sir or Madam') || ','
                    when v_l = 'es' then 'Estimado/a ' || coalesce(c.contact_facturation_nom, 'cliente') || ':'
                    else 'Bonjour' || coalesce(' ' || c.contact_facturation_nom, ' Madame, Monsieur') || ',' end,
    'emetteur', v_emetteur, 'compte', v_ref, 'lignes', v_lignes, 'total', private.cashd_eur(v_total, v_l),
    'limite', private.cashd_date_texte(v_limite, v_l), 'delai', g.delai_mise_en_demeure_jours::text, 'nb', v_n::text,
    'numero', coalesce(v_premier, ''), 'retard_max', v_max_retard::text,
    'ce_message', case when v_l = 'en' then case when v_lettre then 'this letter' else 'this e-mail' end
                       when v_l = 'es' then case when v_lettre then 'esta carta' else 'este correo' end
                       else case when v_lettre then 'ce courrier' else 'ce courriel' end end,   -- c2_27
    'cette_facture', case when v_l = 'en' then case when v_n > 1 then 'these invoices' else 'this invoice' end
                          when v_l = 'es' then case when v_n > 1 then 'estas facturas' else 'esta factura' end
                          else case when v_n > 1 then 'ces factures' else 'cette facture' end end,   -- c2_26
    'objet', case when r.nature = 'devis' then case when v_n > 1 then case when v_l = 'en' then 's' else ' (' || v_n || ')' end else ' ' || coalesce(v_premier, '') end
                  when v_cle = 'echeance' then case when v_n > 1 then v_n || case when v_l = 'en' then ' invoices' when v_l = 'es' then ' facturas' else ' factures' end
                                                    else case when v_l = 'en' then 'invoice ' when v_l = 'es' then 'factura ' else 'facture ' end || coalesce(v_premier, '') end
                  when v_l = 'en' then case when v_n > 1 then v_n || ' invoices' else 'invoice ' || coalesce(v_premier, '') end
                  when v_l = 'es' then case when v_n > 1 then v_n || ' facturas vencidas' else 'factura ' || coalesce(v_premier, '') || ' vencida' end
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
              when 'es:echeance' then case when v_n > 1 then 'las siguientes facturas vencen' else 'la siguiente factura vence' end
              when 'es:rappel' then case when v_n > 1 then 'siguen pendientes los siguientes importes' else 'sigue pendiente el siguiente importe' end
              when 'es:relance' then case when v_n > 1 then 'siguen impagados los siguientes importes' else 'sigue impagado el siguiente importe' end
              when 'es:devis_rappel' then case when v_n > 1 then 'los siguientes presupuestos' else 'el siguiente presupuesto' end
              when 'es:devis_relance' then case when v_n > 1 then 'los siguientes presupuestos' else 'el siguiente presupuesto' end
              else case when v_l = 'en' then 'amounts remain' when v_l = 'es' then 'siguen pendientes los siguientes importes' else 'les sommes suivantes restent dues' end end,
    -- c2_30 : le ton suit l'ancienneté du retard (paliers réglables, 15 et 45 jours par défaut)
    'oubli', case when v_cle <> 'rappel' then ''
                  when v_max_retard > coalesce(g.ton_retard_important_jours, 45) then
                    case when v_l = 'en' then format('This delay of %s days is becoming significant', v_max_retard)
                                              || case when v_ton = '' then ': please let us know now when payment will be made. ' else '. ' end
                         when v_l = 'es' then format('Este retraso de %s días empieza a ser importante', v_max_retard)
                                              || case when v_ton = '' then ': le agradeceríamos que nos indicara desde ahora la fecha de pago prevista. ' else '. ' end
                         else format('Ce retard de %s jours devient important', v_max_retard)
                              || case when v_ton = '' then ' : merci de nous indiquer dès à présent la date de règlement prévue. ' else '. ' end end
                  when v_max_retard > coalesce(g.ton_retard_jours, 15) then
                    case when v_l = 'en' then format('This payment is now %s days overdue. ', v_max_retard)
                         when v_l = 'es' then format('Este pago acumula ya %s días de retraso. ', v_max_retard)
                         else format('Ce retard dure maintenant depuis %s jours. ', v_max_retard) end
                  when not v_retardataire and v_ton = '' then
                    case when v_l = 'en' then 'This is probably a simple oversight. ' when v_l = 'es' then 'Seguramente se trata de un simple olvido. ' else 'Il s''agit sans doute d''un simple oubli. ' end
                  else '' end,
    'ton_montant', v_ton, 'droits', v_droits, 'reglement', v_reglement, 'devis_suite', v_suite);

  v_corps := private.cashd_rendre(v_gab ->> 'corps', v_vars)
             || E'\n' || coalesce(case when v_l = 'fr' then nullif(btrim(g.formule), '')
                                     else coalesce(nullif(btrim(g.traductions #>> array[r.langue, 'formule']), ''), nullif(btrim(g.traductions #>> array[v_l, 'formule']), '')) end,
                                case when v_l = 'en' then 'Kind regards,' when v_l = 'es' then 'Atentamente,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
             || E'\n' || coalesce(case when v_l = 'fr' then nullif(btrim(g.signature), '')
                                     else coalesce(nullif(btrim(g.traductions #>> array[r.langue, 'signature']), ''), nullif(btrim(g.traductions #>> array[v_l, 'signature']), '')) end,
                                v_emetteur) || E'\n';
  return jsonb_build_object('sujet', left(private.cashd_rendre(v_gab ->> 'sujet', v_vars), 300), 'corps', v_corps, 'montant', v_total,
                            'penalites', v_pen, 'indemnites', v_ind, 'retard_max', v_max_retard, 'pieces', v_n,
                            'gabarit', v_cle, 'variante', v_var, 'variantes', v_nvar, 'langue', v_l);
end $function$;

revoke execute on function private.cashd_nom_langue(text) from public, anon, authenticated;
revoke execute on function private.cashd_relance_langue_texte() from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid, date, integer) from public, anon, authenticated;
revoke execute on function public.cashd_regler_traduction(uuid, text, jsonb) from public, anon;
grant execute on function public.cashd_regler_traduction(uuid, text, jsonb) to authenticated, service_role;
