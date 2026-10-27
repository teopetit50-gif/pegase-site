-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_57 : les moyens de règlement dans chaque langue prise en charge ; le reste, dit avant l'envoi
-- (27/10/2026, session C2 — fin de TNUIT-06, rejeu de la contre-recette de nuit)
-- ═══════════════════════════════════════════════════════════════════════════
-- Rejeu de TNUIT-06 : sans traduction écrite par l'organisation, « Virement IBAN … ou chèque à l'ordre de … » partait en
-- français dans un texte espagnol ou anglais, et seule une alerte générale le disait.
-- Désormais :
--   · les moyens de règlement usuels existent dans les langues que CASHD prend en charge (anglais, espagnol) :
--     virement (IBAN, BIC gardés tels quels), chèque (à l'ordre de … : le nom gardé tel quel), espèces, carte bancaire,
--     prélèvement SEPA, au comptoir, en ligne, reliés par « ou », « et » ou une virgule. CASHD ne rend que ce qu'il
--     reconnaît en entier : une phrase qu'il ne sait pas rendre n'est jamais traduite à moitié ;
--   · ce qui reste en français dans un texte étranger (phrase non reconnue, langue sans textes par défaut) est signalé
--     AVANT l'envoi : la demande de validation porte « À relire — » en tête de son résumé et l'avertissement dans son
--     contenu (« avertissements »), la relance aussi (cashd_relances.avertissements, motif « à relire avant l'envoi : … ») ;
--   · la traduction écrite par l'organisation (c2_55) passe toujours en premier.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_relances add column if not exists avertissements jsonb not null default '[]'::jsonb;
comment on column public.cashd_relances.avertissements is 'Ce que le valideur doit relire avant l''envoi (c2_57) : une partie du texte restée en français, etc.';

-- Un moyen de règlement usuel, rendu en anglais ou en espagnol ; null s'il n'est pas reconnu en entier.
create or replace function private.cashd_traduire_moyen(p text, p_l text)
 returns text language plpgsql immutable set search_path to ''
as $function$
declare s text := btrim(p); m text[];
begin
  -- virement (IBAN, BIC, RIB : gardés tels quels, s'ils ne portent que des identifiants)
  m := regexp_match(s, '^(?:par |un )?virement(?: bancaire)?(?: sur (?:le|notre) compte)?\s*:?\s*(.*)$', 'i');
  if m is not null and (m[1] = '' or m[1] ~ '^[A-Z0-9 :/.\-]+$') then
    return case p_l when 'en' then 'bank transfer' else 'transferencia bancaria' end || case when m[1] <> '' then ' (' || m[1] || ')' else '' end;
  end if;
  -- chèque, à l'ordre de … (le nom gardé tel quel)
  m := regexp_match(s, '^(?:par )?ch[eè]ques?(?: bancaires?)?(?:\s+(?:libellés? )?(?:à l''ordre de|à l’ordre de|au nom de|à)\s+(.+))?$', 'i');
  if m is not null then
    return case p_l when 'en' then 'cheque' || coalesce(' payable to ' || m[1], '') else 'cheque' || coalesce(' a nombre de ' || m[1], '') end;
  end if;
  if s ~* '^(?:en )?esp[eè]ces$' then return case p_l when 'en' then 'cash' else 'efectivo' end; end if;
  if s ~* '^(?:en )?esp[eè]ces (?:au comptoir|à l''accueil|au magasin|en agence)$' then
    return case p_l when 'en' then 'cash at our counter' else 'efectivo en nuestro mostrador' end;
  end if;
  if s ~* '^(?:par |en )?carte(?: bancaire| bleue| de cr[eé]dit)?(?: au comptoir)?$' then return case p_l when 'en' then 'bank card' else 'tarjeta bancaria' end; end if;
  if s ~* '^(?:par )?pr[eé]l[eè]vement(?: automatique)?(?: sepa)?$' then return case p_l when 'en' then 'SEPA direct debit' else 'domiciliación bancaria SEPA' end; end if;
  if s ~* '^(?:paiement |règlement )?(?:au comptoir|à l''accueil|au magasin)$' then return case p_l when 'en' then 'at our counter' else 'en nuestro mostrador' end; end if;
  if s ~* '^(?:paiement |règlement )?en ligne$' then return case p_l when 'en' then 'online payment' else 'pago en línea' end; end if;
  return null;
end $function$;

-- Les moyens de règlement de l'organisation, rendus en anglais ou en espagnol s'ils sont reconnus en entier ; sinon null.
create or replace function private.cashd_traduire_moyens(p text, p_l text)
 returns text language plpgsql immutable set search_path to ''
as $function$
declare
  s text := btrim(rtrim(btrim(coalesce(p, '')), '. '));
  m text[];
  t text;
  v_sep text;
  v_out text := '';
begin
  if p_l not in ('en', 'es') or s = '' then
    return null;
  end if;
  for m in select regexp_matches(s, '(.+?)(\s*[,;]\s*|\s+ou\s+|\s+et\s+|$)', 'gi') loop
    t := private.cashd_traduire_moyen(m[1], p_l);
    if t is null then
      return null;
    end if;
    v_sep := lower(btrim(m[2]));
    v_out := v_out || t || case when v_sep = '' then ''
                                when v_sep in (',', ';') then v_sep || ' '
                                when v_sep = 'ou' then case p_l when 'en' then ' or ' else ' o ' end
                                else case p_l when 'en' then ' and ' else ' y ' end end;
  end loop;
  return nullif(v_out, '');
end $function$;

-- Écrire une relance pour une variante donnée (c2_55), moyens de règlement rendus et avertissements (c2_57).
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
  v_avert jsonb := '[]'::jsonb;
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
                                 nullif(btrim(g.traductions #>> array[v_l, 'moyens_reglement']), ''),
                                 -- c2_57 : les moyens usuels (virement, chèque, espèces, carte, prélèvement…) rendus dans la langue du texte
                                 case when v_lt in ('en', 'es') then private.cashd_traduire_moyens(g.moyens_reglement, v_lt) end,
                                 g.moyens_reglement) end;
  -- c2_57 : ce qui reste en français dans un texte étranger est dit avant l'envoi
  if v_l <> 'fr' and v_moyens is not null and v_moyens = g.moyens_reglement then
    v_avert := v_avert || to_jsonb(format('vos moyens de règlement partent en français dans ce texte en %s : traduisez-les dans Vos textes',
                                          private.cashd_nom_langue(v_lt)));
  end if;
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
                            'gabarit', v_cle, 'variante', v_var, 'variantes', v_nvar, 'langue', v_l, 'avertissements', v_avert);
end $function$;

-- La préparation (c2_51), qui dit au valideur ce qui reste à relire (c2_57).
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
                                and y.echeance < p_jour
                                and (a.facture_visee is null or y.numero = a.facture_visee)   -- c2_20 : l'avoir va à la facture qu'il vise
                              order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
        -- c2_24 : une mise en demeure n'est jamais le premier message reçu. Tant qu'aucun palier précédent n'est réellement
        -- parti pour la facture, elle n'est pas écrite ; la pièce porte la raison (relance_retenue), une alerte la dit.
        for f in
          select s.facture_id, s.numero, z.relance_retenue
          from public.cashd_suivi s join public.cashd_factures z on z.id = s.facture_id
          where s.compte_id = c.id and s.palier_suivant = 'mise_en_demeure' and s.palier_suivant_le <= p_jour
            and s.etat_sequence in ('pas_encore_relancee', 'en_cours') and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
            and not private.cashd_med_permise(s.facture_id, coalesce(c.scenario, g.scenario))
        loop
          if f.relance_retenue is distinct from 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie pour cette facture. Elle est dans la liste des relances : validez-la et envoyez-la, ou notez-la envoyée à la main ; la mise en demeure suivra.' then
            update public.cashd_factures set relance_retenue = 'mise en demeure retenue : la relance qui la précède n''est pas réellement partie pour cette facture. Elle est dans la liste des relances : validez-la et envoyez-la, ou notez-la envoyée à la main ; la mise en demeure suivra.', maj_le = now() where id = f.facture_id;
          end if;
          if f.relance_retenue is null then
            perform private.lever_alerte_module(p_client, 'cashd', 'attention',
              format('La mise en demeure de %s (%s) est retenue : la relance qui la précède n''est pas réellement partie. Envoyez d''abord la relance, ou notez-la envoyée à la main.', c.nom, f.numero),
              jsonb_build_object('compte', c.id, 'facture', f.facture_id), 'relance:med_sans_envoi:' || f.facture_id::text, true, null);
          end if;
        end loop;
        update public.cashd_factures z set relance_retenue = null, maj_le = now()
         where z.compte_id = c.id and z.relance_retenue is not null
           and not exists (select 1 from public.cashd_suivi s where s.facture_id = z.id and s.palier_suivant = 'mise_en_demeure' and s.statut = 'ouverte'
                           and s.etat_sequence in ('pas_encore_relancee', 'en_cours'))
            or (z.compte_id = c.id and z.relance_retenue is not null and private.cashd_med_permise(z.id, coalesce(c.scenario, g.scenario)));
      end if;
      for f in
        select q.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = q.palier_ecrit limit 1)::integer as rang
        from (
        -- c2_24b : aucun palier n'est atteint sans que le précédent soit réellement parti : la séquence reprend au premier
        -- palier du scénario qui n'est pas parti (le rappel, si rien n'est parti) ; la mise en demeure, elle, est retenue
        -- tant que la relance qui la précède n'est pas partie (c2_24).
        select s.*, case when v_nature = 'facture' then private.cashd_palier_a_ecrire(s.facture_id, s.palier_suivant, coalesce(c.scenario, g.scenario))
                         else s.palier_suivant end as palier_ecrit
        from public.cashd_suivi s
        where s.compte_id = c.id and s.palier_suivant is not null and s.palier_suivant_le <= p_jour
          and s.etat_sequence in ('pas_encore_relancee', 'en_cours')
          -- le rappel du jour d'échéance ne s'écrit que ce jour-là (c2_10)
          and not (s.palier_suivant = 'echeance' and s.nature <> 'devis' and s.echeance is distinct from p_jour)
          and ((v_nature = 'facture' and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
                and ((select e.reste_relancable from public.cashd_factures_etat e where e.id = s.facture_id) > private.cashd_seuil_relance(c.entite_id, g.seuil_relance)
                     or exists (select 1 from public.cashd_factures z where z.id = s.facture_id and z.solde_decision = 'reclame'))
                and not exists (select 1 from public.cashd_factures z where z.id = s.facture_id
                                and (z.solde_decision = 'abandonne' or z.attente_commande_le is not null
                                     or z.incoherence is not null)))   -- c2_17 : total incohérent, relance suspendue ; c2_31 : la mise en demeure due passe par le palier à écrire
               or (v_nature = 'devis' and s.nature = 'devis'))
        ) q
        -- c2_31 : le premier palier non parti est déjà dans la file (à valider, à envoyer, sans adresse, ou bloqué depuis
        -- le dernier changement de réglages) : on l'attend, rien de plus n'est écrit
        where not (q.palier_ecrit is distinct from q.palier_suivant and private.cashd_palier_en_file(q.facture_id, q.palier_ecrit))
        order by q.echeance nulls last, q.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_ecrit, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        -- c2_24b : la séquence reprend au premier palier ; le palier de la relance qui n'est jamais partie est rendu
        if f.palier_ecrit is distinct from f.palier_suivant then
          update public.cashd_relances_pieces set annulee = true
           where facture_id = f.facture_id and palier = f.palier_ecrit and not annulee and relance_id <> v_rel;
        end if;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_ecrit, f.rang,
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
             penalites = (v_texte ->> 'penalites')::numeric, indemnites = (v_texte ->> 'indemnites')::numeric,
             avertissements = coalesce(v_texte -> 'avertissements', '[]'::jsonb), maj_le = now()   -- c2_57
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
      v_type := case when v_nature = 'devis' then 'cashd.devis' when v_palier_max = 'mise_en_demeure' then 'cashd.mise_en_demeure'
                    -- les rappels courtois des paliers 1 et 2 : seuls à pouvoir partir sous accord permanent (c2_12)
                    when v_palier_max in ('echeance', 'rappel') then 'cashd.rappel' else 'cashd.relance' end;
      -- La mise en demeure part en lettre recommandée électronique au-delà du seuil réglé (tiers : AR24, branché par le socle).
      v_canal := case when v_type = 'cashd.mise_en_demeure' and g.seuil_lre is not null and (v_texte ->> 'montant')::numeric >= g.seuil_lre then 'lre'
                      -- c2_51 : les rappels et relances d'un compte qui a choisi WhatsApp, sur le modèle validé par Meta
                      when v_type in ('cashd.rappel', 'cashd.relance') and private.cashd_whatsapp_possible(c.id) then 'whatsapp'
                      else 'email' end;
      update public.cashd_relances set canal = v_canal,
             lien_paiement = (select l.url from public.cashd_relances_pieces x join public.cashd_liens_paiement l on l.facture_id = x.facture_id and l.statut = 'actif'
                              where x.relance_id = v_rel and not x.annulee order by l.cree_le desc limit 1)
       where id = v_rel;
      begin
        insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
        values (p_client, c.entite_id, 'cashd', v_type, 'cashd_relances', v_rel::text,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end
               || case when jsonb_array_length(coalesce(v_texte -> 'avertissements', '[]'::jsonb)) > 0 then 'À relire — ' else '' end   -- c2_57
               || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_texte ->> 'montant')::numeric), 500),
          case when v_nature = 'devis' then null else (v_texte ->> 'montant')::numeric end,
          jsonb_build_object('relance', v_rel, 'canal', v_canal, 'mode', g.mode, 'palier', v_palier_max,
            'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
            'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
            'sujet', v_texte ->> 'sujet', 'corps', v_texte ->> 'corps',
            'penalites', (v_texte ->> 'penalites')::numeric, 'indemnites', (v_texte ->> 'indemnites')::numeric,
            'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end,
            'avertissements', coalesce(v_texte -> 'avertissements', '[]'::jsonb)),   -- c2_57 : dit au valideur avant l'envoi
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

      -- Seuls les rappels des paliers 1 et 2 partent sous accord permanent (c2_12) : toute autre relance approuvée d'office
      -- (relance ferme, devis) est retenue.
      if v_type not in ('cashd.rappel', 'cashd.mise_en_demeure') and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : seuls les rappels des paliers 1 et 2 partent sans validation, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s n''a pas été préparée : un accord permanent l''approuvait d''office, et seuls les rappels courtois partent sans validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:accord_hors_rappel:' || v_rel::text, true, null);
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
        v_envoi := private.cashd_preparer_message(v_rel, v_demande, 'cashd:relance:' || v_rel::text);   -- c2_51 : courriel, LRE ou WhatsApp
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

-- La revue (c2_51), de même.
create or replace function private.cashd_reviser_relance(p_relance uuid, p_motif text, p_apres_refus jsonb default null)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  d public.demandes_validation;
  v_t jsonb;
  v_type text;
  v_cle text;
  v_nouvelle uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_statut text;
  v_mode text;
  v_erreur text;
  v_motif text := left(p_motif, 500);
begin
  select * into r from public.cashd_relances where id = p_relance for update;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  update public.cashd_relances_pieces p set reste_du = case when f.nature = 'devis' then f.montant_ttc else e.reste_relancable end
    from public.cashd_factures f join public.cashd_factures_etat e on e.id = f.id
   where p.relance_id = r.id and not p.annulee and f.id = p.facture_id;
  v_t := private.cashd_ecrire_texte(r.id);
  update public.cashd_relances set sujet = v_t ->> 'sujet', corps = v_t ->> 'corps', montant = (v_t ->> 'montant')::numeric,
         gabarit = v_t ->> 'gabarit', variante = (v_t ->> 'variante')::smallint,
         penalites = (v_t ->> 'penalites')::numeric, indemnites = (v_t ->> 'indemnites')::numeric, motif = v_motif,
         avertissements = coalesce(v_t -> 'avertissements', '[]'::jsonb), maj_le = now()   -- c2_57
   where id = r.id;
  -- c2_44 : la relance revue repasse les contrôles d'une relance neuve ; retenue, elle n'entre pas dans la file
  if private.cashd_controler_revue(r.id) is not null then
    return null;
  end if;
  begin
    v_mode := private.reglages_envois_effectifs(r.client_id, 'cashd') ->> 'mode';
  exception when others then
    v_mode := null;
  end;
  if r.demande_id is not null then
    select * into d from public.demandes_validation where id = r.demande_id;
    if d.statut = 'en_attente' then
      update public.demandes_validation set statut = 'annulee' where id = d.id and statut = 'en_attente';
    end if;
    v_type := d.type_action;
    v_cle := left('cashd:relance:' || r.id::text || ':revue:' || d.id::text, 200);
  else
    -- c2_46 : la demande qu'elle aurait eue à la préparation
    v_type := case when r.nature = 'devis' then 'cashd.devis' when r.palier = 'mise_en_demeure' then 'cashd.mise_en_demeure'
                   when r.palier in ('echeance', 'rappel') then 'cashd.rappel' else 'cashd.relance' end;
    v_cle := 'cashd:relance:' || r.id::text;
  end if;
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
    values (r.client_id, r.entite_id, 'cashd', v_type, 'cashd_relances', r.id::text,
            left(case when g.mode = 'essai' then 'Essai — ' else '' end
                 || case when jsonb_array_length(coalesce(v_t -> 'avertissements', '[]'::jsonb)) > 0 then 'À relire — ' else '' end   -- c2_57
                 || case when p_apres_refus is not null then 'Après refus — ' else '' end
                 || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
                 || ' : ' || c.nom || ', ' || private.cashd_eur((v_t ->> 'montant')::numeric), 500),
            case when r.nature = 'devis' then null else (v_t ->> 'montant')::numeric end,
            coalesce(d.payload, jsonb_build_object('relance', r.id, 'canal', r.canal, 'mode', g.mode, 'palier', r.palier,
                                                   'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
                                                   'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end))
              || jsonb_build_object('sujet', v_t ->> 'sujet', 'corps', v_t ->> 'corps',
                                    'penalites', (v_t ->> 'penalites')::numeric, 'indemnites', (v_t ->> 'indemnites')::numeric,
                                    'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
                                    'motif_revue', v_motif, 'avertissements', coalesce(v_t -> 'avertissements', '[]'::jsonb))
              || case when d.id is not null then jsonb_build_object('revue_de', d.id) else '{}'::jsonb end
              || case when p_apres_refus is not null then jsonb_build_object('apres_refus', p_apres_refus) else '{}'::jsonb end,
            coalesce(d.echeance, (greatest(r.jour, (now() at time zone 'Europe/Paris')::date) + 7)::timestamptz), v_cle)
    returning id, statut, politique_id into v_nouvelle, v_dstatut, v_dpolitique;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
    update public.cashd_relances set statut = 'echec', motif = left('revue, la demande de validation n''a pas pu être déposée : ' || v_erreur, 500), maj_le = now()
     where id = r.id;
    perform private.lever_alerte_module(r.client_id, 'cashd', 'critique', format('La relance revue de %s n''a pas pu entrer dans la file de validation.', c.nom),
      jsonb_build_object('relance', r.id, 'erreur', v_erreur), 'relance:echec:' || r.id::text, true, null);
    return null;
  end;
  -- le statut suit le réglage d'envoi, comme à la préparation
  v_statut := case when v_mode is null then 'non_reglee' else 'a_valider' end;
  -- un accord permanent ne couvre que les rappels des paliers 1 et 2 (c2_12), jamais une mise en demeure
  if v_dstatut = 'approuvee' and v_dpolitique is not null and v_type <> 'cashd.rappel' then
    v_statut := 'bloquee';
    v_motif := left(v_motif || ' — un accord permanent l''a approuvée d''office : '
               || case when v_type = 'cashd.mise_en_demeure' then 'une mise en demeure exige une validation explicite'
                       else 'seuls les rappels des paliers 1 et 2 partent sans validation' end || ', elle n''est pas préparée', 500);
  end if;
  update public.cashd_relances set demande_id = v_nouvelle, statut = v_statut, motif = v_motif, maj_le = now() where id = r.id;
  if v_statut = 'a_valider'
     and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
    begin
      v_envoi := private.cashd_preparer_message(r.id, v_nouvelle, v_cle);   -- c2_51 : courriel, LRE ou WhatsApp
      update public.cashd_relances set envoi_id = v_envoi where id = r.id;
    exception when others then
      v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
      update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = r.id;
      perform private.lever_alerte_module(r.client_id, 'cashd', 'critique', format('Le message de relance revu de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
        jsonb_build_object('relance', r.id, 'erreur', v_erreur), 'relance:envoi:' || r.id::text, true, null);
    end;
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_revue', 'cashd_relances', r.id::text,
    jsonb_build_object('motif', v_motif, 'avant', d.id, 'demande', v_nouvelle, 'montant_avant', d.montant, 'montant', (v_t ->> 'montant')::numeric), r.entite_id);
  return v_nouvelle;
end $function$;

-- La langue du texte et l'alerte (c2_55) ; le motif « à relire avant l'envoi » (c2_57).
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
        -- c2_57 : seulement s'ils restent en français dans le texte (CASHD rend les moyens usuels)
        case when nullif(btrim(g.moyens_reglement), '') is not null and position(rtrim(btrim(g.moyens_reglement), '. ') in coalesce(new.corps, '')) > 0
                  then 'vos moyens de règlement' end,
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
  -- c2_57 : une relance qui garde du français dans un texte étranger le dit, avant l'envoi, en tête de son motif
  if jsonb_array_length(coalesce(new.avertissements, '[]'::jsonb)) > 0 and new.statut in ('a_valider', 'non_reglee', 'preparee', 'bloquee', 'sans_adresse')
     and coalesce(new.motif, '') not like 'à relire avant l''envoi : %' then
    new.motif := left('à relire avant l''envoi : ' || (select string_agg(x, ' ; ') from jsonb_array_elements_text(new.avertissements) x)
                      || coalesce(' — ' || nullif(new.motif, ''), ''), 500);
  end if;
  return new;
end $function$;

revoke execute on function private.cashd_traduire_moyen(text, text) from public, anon, authenticated;
revoke execute on function private.cashd_traduire_moyens(text, text) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid, date, integer) from public, anon, authenticated;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_reviser_relance(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_relance_langue_texte() from public, anon, authenticated;
