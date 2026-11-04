-- 20261021202907 a4_73+c2_28_chantier_ligne+c2_29_secteur_import
-- Source : dépôt : 4882d98a omega/modules/cashd/migrations/c2_28_chantier_ligne.sql ; 310d8d11 omega/modules/cashd/migrations/c2_29_secteur_import.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_28_chantier_ligne.sql @ 4882d98a, c2_29_secteur_import.sql @ 310d8d11 ; a4_73 cité pour un état de test : ignoré.
-- ═══ omega/modules/cashd/migrations/c2_28_chantier_ligne.sql @ 4882d98a
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_28 : le chantier dans la ligne de chaque facture (21/10/2026, session C2 — TCASHD-09b)
-- ═══════════════════════════════════════════════════════════════════════════
-- La facture porte sa référence de commande ou de chantier (commande_ref : « Chantier : Résidence Les Flamboyants »),
-- jamais reprise dans les messages (recette T-CASHD, S2-3). La ligne par défaut la cite désormais après le montant :
-- « Facture FB-2026-0100 du 13/09/2026, 1 085,00 € TTC — Chantier : Résidence Les Flamboyants, échue le … ». Les lignes
-- écrites par l'organisation reçoivent la variable {commande}.
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Écrire la ligne d'une pièce (c2_09) : {commande} admise.
create or replace function public.cashd_ecrire_ligne(p_client uuid, p_langue text, p_nature text, p_modele text, p_actif boolean default true)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid; v_inconnues text; x public.cashd_gabarits_lignes;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  perform private.cashd_exiger_installe(p_client);
  if coalesce(p_langue, '') !~ '^[a-z]{2}$' then
    raise exception 'La langue se donne en deux lettres (de, es, it…).' using errcode = '22023';
  end if;
  if p_nature is null or p_nature not in ('facture', 'devis') then
    raise exception 'Une ligne de facture ou de devis.' using errcode = '22023';
  end if;
  if coalesce(p_actif, true) then
    if nullif(btrim(p_modele), '') is null then
      raise exception 'La ligne a un modèle.' using errcode = '22023';
    end if;
    select string_agg(distinct m[1], ', ') into v_inconnues from regexp_matches(p_modele, '\{([a-z_]+)\}', 'g') m
    where m[1] not in ('numero', 'date', 'montant', 'echeance', 'retard', 'reste', 'commande')   -- c2_28 : {commande}
       or (p_nature = 'devis' and m[1] in ('echeance', 'retard', 'reste'));
    if v_inconnues is not null then
      raise exception 'Variable inconnue pour une ligne de % : {%}.', p_nature, v_inconnues using errcode = '22023';
    end if;
    if position('{numero}' in p_modele) = 0 or (p_nature = 'facture' and position('{reste}' in p_modele) = 0) then
      raise exception 'La ligne d''une facture porte {numero} et {reste} ; celle d''un devis, {numero}.' using errcode = '22023';
    end if;
  end if;
  insert into public.cashd_gabarits_lignes (client_id, langue, nature, modele, actif, ecrit_par)
  values (p_client, p_langue, p_nature, coalesce(nullif(btrim(p_modele), ''), '—'), coalesce(p_actif, true), v_uid)
  on conflict (client_id, langue, nature) do update
    set modele = case when coalesce(p_actif, true) then excluded.modele else cashd_gabarits_lignes.modele end,
        actif = excluded.actif, ecrit_par = excluded.ecrit_par, maj_le = now()
  returning * into x;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.gabarit', 'cashd_gabarits_lignes', x.id::text,
    jsonb_build_object('langue', p_langue, 'ligne', p_nature, 'actif', x.actif, 'modele', x.modele), null);
  return to_jsonb(x);
end $function$;

-- Écrire une relance (c2_27) : la ligne cite la commande ou le chantier.
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
  v_parti boolean;
  v_lettre boolean;
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
           nullif(btrim(f.commande_ref), '') as commande,   -- c2_28 : le chantier, la commande
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
          then format(E'  • Invoice %s of %s, %s incl. VAT%s, due on %s: %s to pay\n', p.numero,
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
        else format(E'  • Facture %s du %s, %s TTC%s, échue le %s (%s jour%s de retard) : %s restant dus\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), coalesce(' — ' || p.commande, ''),
                    private.cashd_date_texte(p.echeance, v_l),
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

  -- c2_27 : le canal, comme le préparateur le choisira — une mise en demeure au-delà du seuil LRE part en lettre recommandée.
  v_lettre := r.canal in ('lre') or (v_cle = 'mise_en_demeure' and g.seuil_lre is not null and v_total >= g.seuil_lre);
  v_vars := jsonb_build_object(
    'bonjour', case when v_l = 'en' then 'Dear ' || coalesce(c.contact_facturation_nom, 'Sir or Madam') || ','
                    else 'Bonjour' || coalesce(' ' || c.contact_facturation_nom, ' Madame, Monsieur') || ',' end,
    'emetteur', v_emetteur, 'compte', v_ref, 'lignes', v_lignes, 'total', private.cashd_eur(v_total, v_l),
    'limite', private.cashd_date_texte(v_limite, v_l), 'delai', g.delai_mise_en_demeure_jours::text, 'nb', v_n::text,
    'numero', coalesce(v_premier, ''), 'retard_max', v_max_retard::text,
    'ce_message', case when v_l = 'en' then case when v_lettre then 'this letter' else 'this e-mail' end
                       else case when v_lettre then 'ce courrier' else 'ce courriel' end end,   -- c2_27
    'cette_facture', case when v_l = 'en' then case when v_n > 1 then 'these invoices' else 'this invoice' end
                          else case when v_n > 1 then 'ces factures' else 'cette facture' end end,   -- c2_26
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

revoke execute on function public.cashd_ecrire_ligne(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.cashd_ecrire_ligne(uuid, text, text, text, boolean) to authenticated, service_role;
revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;


-- ═══ omega/modules/cashd/migrations/c2_29_secteur_import.sql @ 310d8d11
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_29 : le secteur du compte, lu à l'import des clients (21/10/2026, session C2 — TCASHD-09a)
-- ═══════════════════════════════════════════════════════════════════════════
-- Les messages citent le secteur du compte ({compte} : « A-C00, secteur BTP »), mais la porte d'import des clients
-- n'avait pas de clé secteur : la fiche restait à null (recette T-CASHD, S2-3). La clé « secteur » (alias « activite »,
-- « secteur_activite ») est désormais lue ; un export sans secteur garde celui saisi dans CASHD (cashd_regler_compte).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Intégrer un import (c2_23) : le secteur du compte.
create or replace function private.cashd_integrer(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_complet boolean, p_source text, p_origine text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  l jsonb;
  k integer := 0;
  v_cree integer := 0;
  v_modif integer := 0;
  v_pareil integer := 0;
  v_soldees integer := 0;
  v_ecartees jsonb := '[]'::jsonb;
  v_vus text[] := '{}';
  v_compte uuid;
  v_id uuid;
  f public.cashd_factures;
  v_nature text;
  v_numero text;
  v_ttc numeric;
  v_ht numeric;
  v_reste numeric;
  v_emission date;
  v_echeance date;
  v_statut text;
  v_res jsonb;
  v_lettrees integer := 0;
  g public.cashd_reglages;
  c record;
  v_incoh text;
  v_visee text;
  v_orphelins jsonb := '[]'::jsonb;
  v_incoherentes jsonb := '[]'::jsonb;
  v_secteur text;
  v_autre text;
  v_doublons text[] := '{}';
begin
  g := private.cashd_exiger_installe(p_client);
  if p_jeu not in ('clients', 'factures', 'reglements', 'devis') then
    raise exception 'Jeu inconnu : % (clients, factures, reglements, devis).', coalesce(p_jeu, 'vide') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se donnent en tableau.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Plus de 20 000 lignes : découpez l''export.' using errcode = '22023';
  end if;

  for l in select x.value from jsonb_array_elements(p_lignes) x loop
    k := k + 1;
    begin
      if jsonb_typeof(l) <> 'object' then
        raise exception 'ligne illisible' using errcode = '22023';
      end if;

      if p_jeu = 'clients' then
        if private.cashd_v(l, 'code') is null and private.cashd_v(l, 'nom') is null then
          raise exception 'ni code ni nom' using errcode = '22023';
        end if;
        select x.id into v_id from public.cashd_comptes x
        where x.client_id = p_client and x.entite_id = p_entite and x.reference = left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80);
        v_res := jsonb_strip_nulls(jsonb_build_object(
          'reference', left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80),
          'nom', left(coalesce(private.cashd_v(l, 'nom'), private.cashd_v(l, 'code')), 200),
          'groupe', left(private.cashd_v(l, 'groupe'), 200),
          'siren', case when regexp_replace(coalesce(private.cashd_v(l, 'siren'), ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(private.cashd_v(l, 'siren'), '\s', '', 'g') end,
          'pays', case when upper(private.cashd_v(l, 'pays')) ~ '^[A-Z]{2}$' then upper(private.cashd_v(l, 'pays')) end,
          'langue', case when lower(private.cashd_v(l, 'langue')) ~ '^[a-z]{2}$' then lower(private.cashd_v(l, 'langue')) end,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'contact_facturation_nom', left(private.cashd_v(l, 'contact'), 200),
          'contact_facturation_email', case when lower(private.cashd_v(l, 'email')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email')) end,
          'contact_facturation_telephone', left(private.cashd_v(l, 'telephone'), 40),
          'contact_commercial_email', case when lower(private.cashd_v(l, 'email_commercial')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email_commercial')) end,
          'delai_paiement_jours', case when private.cashd_nombre(private.cashd_v(l, 'delai_paiement')) between 0 and 60 then private.cashd_nombre(private.cashd_v(l, 'delai_paiement'))::integer end,
          'plafond_encours', case when private.cashd_nombre(private.cashd_v(l, 'plafond')) >= 0 then private.cashd_nombre(private.cashd_v(l, 'plafond')) end));
        -- c2_29 : le secteur d'activité du compte (clé secteur, ou activite), repris dans les messages ; absent de l'export,
        -- celui saisi dans CASHD est gardé.
        v_secteur := left(nullif(btrim(coalesce(private.cashd_v(l, 'secteur'), private.cashd_v(l, 'activite'), private.cashd_v(l, 'secteur_activite'))), ''), 120);
        if v_id is null then
          perform private.cashd_ecrire_compte(null, p_client, v_res || jsonb_build_object('entite_id', p_entite), p_source);
          v_cree := v_cree + 1;
        elsif exists (select 1 from jsonb_each(v_res) e
                      where (select to_jsonb(x) -> e.key from public.cashd_comptes x where x.id = v_id) is distinct from e.value)
              or (v_secteur is not null and v_secteur is distinct from (select x.secteur from public.cashd_comptes x where x.id = v_id)) then
          perform private.cashd_ecrire_compte(v_id, p_client, v_res, p_source);
          v_modif := v_modif + 1;
        else
          v_pareil := v_pareil + 1;   -- c2_23 : rien n'a changé, rien n'est réécrit
        end if;
        if v_secteur is not null then
          update public.cashd_comptes x set secteur = v_secteur, maj_le = now()
           where x.client_id = p_client and x.entite_id = p_entite and x.reference = v_res ->> 'reference' and x.secteur is distinct from v_secteur;
        end if;
        continue;
      end if;

      if p_jeu = 'reglements' then
        v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant'));
        v_emission := private.cashd_date(private.cashd_v(l, 'date'));
        if v_ttc is null or v_ttc <= 0 then
          raise exception 'montant illisible ou nul' using errcode = '22023';
        end if;
        if v_emission is null then
          raise exception 'date illisible' using errcode = '22023';
        end if;
        v_compte := null;
        if private.cashd_v(l, 'compte_ref') is not null or private.cashd_v(l, 'compte_nom') is not null then
          select x.id into v_compte from public.cashd_comptes x where x.client_id = p_client and x.entite_id = p_entite
            and x.reference = left(coalesce(private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom')), 80);
        end if;
        v_res := private.cashd_noter_reglement(p_client, v_compte, v_ttc, v_emission, private.cashd_v(l, 'reference'),
          private.cashd_mode(private.cashd_v(l, 'mode')), null, p_entite, private.cashd_v(l, 'libelle'), private.cashd_v(l, 'facture_numero'),
          p_source, left(concat_ws('|', 'export', v_emission, round(v_ttc, 2), coalesce(private.cashd_v(l, 'reference'), ''),
                                   coalesce(private.cashd_v(l, 'facture_numero'), ''), coalesce(private.cashd_v(l, 'compte_ref'), '')), 300));
        if (v_res ->> 'deja_note')::boolean then
          v_pareil := v_pareil + 1;
        else
          v_cree := v_cree + 1;
          v_lettrees := v_lettrees + coalesce((v_res ->> 'imputations')::integer, 0);
        end if;
        continue;
      end if;

      -- factures et devis
      v_numero := left(private.cashd_v(l, 'numero'), 80);
      if v_numero is null then
        raise exception 'numéro absent' using errcode = '22023';
      end if;
      v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant_ttc'));
      v_ht := private.cashd_nombre(private.cashd_v(l, 'montant_ht'));
      v_ttc := coalesce(v_ttc, v_ht);
      if v_ttc is null then
        raise exception 'montant illisible' using errcode = '22023';
      end if;
      v_nature := case when p_jeu = 'devis' then 'devis' else private.cashd_nature(private.cashd_v(l, 'nature'), v_ttc) end;
      if v_nature = 'devis' and p_jeu = 'factures' then
        raise exception 'un devis dans l''export des factures' using errcode = '22023';
      end if;
      v_ttc := abs(v_ttc);
      v_ht := abs(v_ht);
      v_reste := abs(private.cashd_nombre(private.cashd_v(l, 'reste_du')));
      v_emission := private.cashd_date(private.cashd_v(l, 'date_emission'));
      if v_emission is null then
        raise exception 'date d''émission illisible' using errcode = '22023';
      end if;
      v_echeance := private.cashd_date(private.cashd_v(l, 'echeance'));
      if v_echeance is not null and v_echeance < v_emission then
        raise exception 'échéance antérieure à l''émission' using errcode = '22023';
      end if;
      v_compte := private.cashd_compte_pour(p_client, p_entite, private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom'), l, p_source);
      if v_compte is null then
        raise exception 'compte client absent' using errcode = '22023';
      end if;
      v_incoh := case when v_nature in ('facture', 'acompte') then private.cashd_controle_total(l) end;   -- c2_17
      v_visee := case when v_nature = 'avoir' then private.cashd_facture_visee(l, v_numero) end;           -- c2_20
      v_vus := v_vus || (v_nature || ':' || v_numero);
      select * into f from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.nature = v_nature and x.numero = v_numero for update;
      if not found then
        v_id := private.cashd_ecrire_facture(null, p_client, jsonb_strip_nulls(jsonb_build_object(
          'entite_id', p_entite, 'compte_id', v_compte, 'nature', v_nature, 'numero', v_numero, 'date_emission', v_emission,
          'echeance', v_echeance, 'montant_ht', v_ht, 'montant_ttc', v_ttc,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'commande_ref', left(private.cashd_v(l, 'commande_ref'), 80),
          'statut', case when v_nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), 'en_attente') end)), p_source);
        update public.cashd_factures set reste_du_source = case when v_nature in ('facture', 'acompte') then least(v_reste, montant_ttc) end,
               incoherence = v_incoh, facture_visee = v_visee where id = v_id;
        v_cree := v_cree + 1;
      else
        -- c2_17 : le même numéro sur un autre compte n'écrase pas la pièce existante ; la ligne est écartée et signalée.
        if f.compte_id is distinct from v_compte then
          select x.reference into v_autre from public.cashd_comptes x where x.id = f.compte_id;
          v_doublons := v_doublons || (v_numero || ' (déjà au compte ' || coalesce(v_autre, '?') || ')');
          raise exception 'numéro déjà porté par la pièce du compte % : ligne écartée, la pièce existante est gardée', coalesce(v_autre, '?') using errcode = '23505';
        end if;
        -- La pièce connue : on suit ce que le facturier en dit, sans toucher à ce qu'une personne a décidé ici.
        v_statut := case
          when f.nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), f.statut)
          when f.statut = 'soldee' and f.statut_motif like 'absente de l''export%' and coalesce(v_reste, v_ttc) > 0 then 'ouverte'
          else f.statut end;
        if (f.montant_ttc, f.date_emission, f.echeance, f.reste_du_source, f.compte_id, f.statut, f.incoherence, f.facture_visee)
           is distinct from (case when f.statut in ('litige') then f.montant_ttc else v_ttc end, v_emission, coalesce(v_echeance, f.echeance),
                             case when f.nature in ('facture', 'acompte') then least(v_reste, v_ttc) end, f.compte_id, v_statut, v_incoh, v_visee) then
          update public.cashd_factures set
            montant_ttc = case when statut = 'litige' or exists (select 1 from public.cashd_imputations x where (x.facture_id = f.id or x.avoir_id = f.id) and x.annulee_le is null)
                               then montant_ttc else v_ttc end,
            montant_ht = coalesce(v_ht, montant_ht),
            date_emission = v_emission,
            echeance = coalesce(v_echeance, echeance),
            reste_du_source = case when nature in ('facture', 'acompte') then least(v_reste, v_ttc) end,
            statut = v_statut,
            statut_motif = case when v_statut is distinct from f.statut then 'suivi de l''export' else statut_motif end,
            statut_le = case when v_statut is distinct from f.statut then now() else statut_le end,
            incoherence = v_incoh,
            facture_visee = v_visee,
            vue_le = now(), maj_le = now()
          where id = f.id;
          v_modif := v_modif + 1;
        else
          update public.cashd_factures set vue_le = now() where id = f.id;
          v_pareil := v_pareil + 1;
        end if;
      end if;
    exception when others then
      if sqlstate = '42501' then
        raise;
      end if;
      v_ecartees := v_ecartees || jsonb_build_object('ligne', k, 'motif', left(sqlerrm, 200));
    end;
  end loop;

  -- L'export complet : les pièces importées qui n'y sont plus sont soldées (ou, pour un devis, sorties du suivi).
  if coalesce(p_complet, false) and p_jeu in ('factures', 'devis') and jsonb_array_length(p_lignes) > 0 then
    for c in
      select x.id, x.nature, x.numero, x.statut from public.cashd_factures x
      where x.client_id = p_client and x.entite_id = p_entite and x.source in ('export', 'import')
        and ((p_jeu = 'factures' and x.nature in ('facture', 'acompte', 'avoir') and x.statut = 'ouverte')
             or (p_jeu = 'devis' and x.nature = 'devis' and x.statut = 'en_attente'))
        and not ((x.nature || ':' || x.numero) = any (v_vus))
    loop
      update public.cashd_factures
         set statut = case when c.nature = 'devis' then 'expire' else 'soldee' end,
             statut_motif = left(format('absente de l''export du %s (%s)', to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM/YYYY'), coalesce(p_origine, p_source)), 500),
             statut_le = now(), maj_le = now()
       where id = c.id;
      perform private.journaliser_module(p_client, 'cashd', 'cashd.piece_sortie_export', 'cashd_factures', c.id::text,
        jsonb_build_object('nature', c.nature, 'numero', c.numero, 'origine', p_origine), p_entite);
      v_soldees := v_soldees + 1;
    end loop;
  end if;

  -- c2_17 : ce qui doit être vu — les numéros en doublon d'un compte à l'autre, les pièces au total incohérent.
  if cardinality(v_doublons) > 0 then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s ligne%s écartée%s, numéro déjà porté par la facture d''un autre client : %s. Vérifiez la numérotation du facturier.',
             cardinality(v_doublons), case when cardinality(v_doublons) > 1 then 's' else '' end, case when cardinality(v_doublons) > 1 then 's' else '' end,
             array_to_string(v_doublons[1:10], ', ')),
      jsonb_build_object('numeros', to_jsonb(v_doublons[1:50]), 'origine', p_origine), 'import:doublon:' || md5(array_to_string(v_doublons, ',')), true, null);
  end if;
  -- c2_21 : la réponse de l'import dit aussi les pièces au total incohérent, et que leur relance est suspendue.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', x.numero, 'compte', c2.reference, 'motif', x.incoherence) order by x.numero), '[]'::jsonb)
      into v_incoherentes
    from public.cashd_factures x join public.cashd_comptes c2 on c2.id = x.compte_id
    where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null and x.statut = 'ouverte'
      and (x.nature || ':' || x.numero) = any (v_vus);
  end if;
  if p_jeu = 'factures' and exists (select 1 from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
                                    and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus)) then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s facture%s au total incohérent, relance suspendue : %s.',
             count(*), case when count(*) > 1 then 's' else '' end, string_agg(x.numero || ' (' || x.incoherence || ')', ' ; ' order by x.numero)),
      jsonb_build_object('factures', jsonb_agg(x.id)), 'import:incoherence:' || md5(string_agg(x.id::text, ',' order by x.id)), true, null)
    from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
      and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus);
  end if;

  -- c2_20 : un avoir qui vise une facture inconnue de ce compte n'est imputé nulle part ; il est dit, ici et sur sa fiche.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', a.numero, 'vise', a.facture_visee, 'compte', c2.reference) order by a.numero), '[]'::jsonb)
      into v_orphelins
    from public.cashd_factures a join public.cashd_comptes c2 on c2.id = a.compte_id
    where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte' and a.facture_visee is not null
      and (a.nature || ':' || a.numero) = any (v_vus)
      and not exists (select 1 from public.cashd_factures y where y.compte_id = a.compte_id and y.nature in ('facture', 'acompte') and y.numero = a.facture_visee);
    update public.cashd_factures a
       set statut_motif = left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500), maj_le = now()
     where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte'
       and a.numero in (select x ->> 'numero' from jsonb_array_elements(v_orphelins) x)
       and a.statut_motif is distinct from left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500);
    if jsonb_array_length(v_orphelins) > 0 then
      perform private.lever_alerte_module(p_client, 'cashd', 'attention',
        format('Import : %s avoir%s visant une facture inconnue, non imputé%s : %s.', jsonb_array_length(v_orphelins),
               case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end, case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end,
               (select string_agg((x ->> 'numero') || ' sur ' || (x ->> 'vise') || ' (compte ' || (x ->> 'compte') || ')', ' ; ') from jsonb_array_elements(v_orphelins) x)),
        jsonb_build_object('avoirs', v_orphelins, 'origine', p_origine), 'import:avoir_orphelin:' || md5(v_orphelins::text), true, null);
    end if;
  end if;

  perform private.journaliser_module(p_client, 'cashd', 'cashd.import', 'cashd_reglages', p_client::text,
    jsonb_build_object('jeu', p_jeu, 'source', p_source, 'origine', p_origine, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif,
                       'inchangees', v_pareil, 'ecartees', jsonb_array_length(v_ecartees), 'soldees_par_absence', v_soldees,
                       'lettrees', v_lettrees, 'complet', coalesce(p_complet, false)), p_entite);
  return jsonb_build_object('jeu', p_jeu, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif, 'inchangees', v_pareil,
    'soldees_par_absence', v_soldees, 'lettrees', v_lettrees, 'ecartees', v_ecartees, 'avoirs_non_imputes', v_orphelins,
    'incoherentes', v_incoherentes);
end $function$;

revoke execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) from public, anon, authenticated;
