-- 20261015123125 c2_09_c4_14_15_b6_32
-- Source : dépôt : 53e22e5 omega/modules/cashd/migrations/c2_09_lignes.sql ; 046014a omega/modules/offload/migrations/c4_14_chantiers_et_missions.sql ; 046014a omega/modules/offload/migrations/c4_15_message_et_echeance.sql ; c416463 omega/modules/daliro/migrations/b6_32_reserve_hors_devis.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_09_lignes.sql @ 53e22e5, c4_14_chantiers_et_missions.sql @ 046014a, c4_15_message_et_echeance.sql @ 046014a, b6_32_reserve_hors_devis.sql @ c416463.
-- ═══ omega/modules/cashd/migrations/c2_09_lignes.sql @ 53e22e5
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_09 : les lignes de pièces dans la langue du compte (15/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- « Les comptes export reçoivent leur relance dans leur langue de facturation. » (G6)
-- Depuis c2_04, une organisation écrit ses textes dans toute langue ; le détail des pièces restait en français ou en
-- anglais. Elle écrit maintenant aussi la ligne d'une facture et celle d'un devis dans la langue du compte
-- (cashd_gabarits_lignes, porte cashd_ecrire_ligne) : {numero}, {date}, {montant}, {echeance}, {retard}, {reste}.
-- Sans ligne propre, la ligne anglaise s'applique à un compte qui n'est pas en français (jusqu'ici c'était la française,
-- formule de politesse comprise : corrigé ici). Les mentions sous une ligne (échéancier, part contestée, lien de
-- paiement) restent en anglais pour ces comptes.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de DROP ni de DELETE ; RLS, revoke puis grants ;
-- revoke execute de public sur les fonctions.

create table if not exists public.cashd_gabarits_lignes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  langue text not null,
  nature text not null,
  modele text not null,
  actif boolean not null default true,
  ecrit_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_gabarits_lignes_un unique (client_id, langue, nature),
  constraint cashd_gabarits_lignes_check check (langue ~ '^[a-z]{2}$' and nature in ('facture', 'devis') and char_length(modele) between 1 and 300)
);
alter table public.cashd_gabarits_lignes enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_gabarits_lignes' and policyname = 'les membres lisent les lignes de leur organisation') then
    create policy "les membres lisent les lignes de leur organisation" on public.cashd_gabarits_lignes for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $do$;
revoke all on table public.cashd_gabarits_lignes from anon, authenticated;
grant select on table public.cashd_gabarits_lignes to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'cashd_gabarits_lignes'
               where not exists (select 1 from private.tables_locataires t where t.nom = 'cashd_gabarits_lignes')$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- Écrire (ou désactiver) la ligne d'une facture ou d'un devis dans une langue. Gestion seulement ; daté au journal.
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
    where m[1] not in ('numero', 'date', 'montant', 'echeance', 'retard', 'reste')
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

-- Écrire le texte d'une relance (c2_04), avec les lignes de pièces de l'organisation dans la langue du compte.
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
      if v_lf is not null then
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

-- Les textes de l'organisation (c2_04), plus ses lignes de pièces.
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
  return jsonb_build_object('gabarits', v_out, 'variables', private.cashd_gabarit_variables(),
    'lignes', (select coalesce(jsonb_agg(jsonb_build_object('langue', gl.langue, 'nature', gl.nature, 'modele', gl.modele, 'maj_le', gl.maj_le) order by gl.langue, gl.nature), '[]'::jsonb)
               from public.cashd_gabarits_lignes gl where gl.client_id = p_client and gl.actif));
end $function$;

revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;
revoke execute on function public.cashd_ecrire_ligne(uuid, text, text, text, boolean) from public, anon;
revoke execute on function public.cashd_gabarits(uuid) from public, anon;
grant execute on function public.cashd_ecrire_ligne(uuid, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.cashd_gabarits(uuid) to authenticated, service_role;


-- ═══ omega/modules/offload/migrations/c4_14_chantiers_et_missions.sql @ 046014a
-- c4_14 — OFFLOAD : chantiers réceptionnés et missions closes, comptés comme le dernier passage (C4, 15/10/2026)
--
-- CE QUE ÇA POSE (chiffrage omega/CHIFFRAGE/offload.md, n° 34 et 35) :
--   · Bâtiment : « OFFLOAD reprend vos chantiers réceptionnés, puis il propose un mot aux clients dont le dernier passage
--     remonte à plus longtemps que le délai que vous fixez. » Modèle d'export « chantiers » (code client, référence,
--     date de réception, libellé, montant HT).
--   · Conseil : « OFFLOAD repère les missions closes depuis assez longtemps pour qu'une prise de contact se justifie,
--     sans insistance. » Modèle d'export « missions » (code client, référence, date de clôture, libellé, honoraires HT).
--   · Chaque ligne devient un passage du compte dans offload_achats (nature « commande », libellé « Chantier « … »
--     réceptionné » ou « Mission « … » close ») : la détection (rythme, silence au-delà du délai fixé) et le message
--     (« je retrouve votre … ») s'appuient sur lui comme sur une vente. Son montant n'est pas compté deux fois : s'il
--     existe déjà une pièce de même référence pour le compte (la facture du chantier), le passage vaut 0 €.
--   · Une seule relance de suivi par séquence vaut ici « sans insistance » : deux messages en tout, puis le compte sort
--     du cycle (ligne 12, inchangée).
--
-- Règles de pose : insert … where not exists, create or replace. Aucun DROP, aucun DELETE.

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'chantiers', 1, 'Chantiers réceptionnés',
       '^(chantiers?|receptions?|affaires[_ -]?terminees)',
       array['Code client', 'Référence'],
       $j${
         "compte_ref": {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers", "Maître d'ouvrage", "Client"]},
         "reference":  {"type": "texte", "obligatoire": true, "entetes": ["Référence", "N° chantier", "N° mission", "N° affaire", "Code affaire"]},
         "receptionne_le": {"type": "date", "obligatoire": true, "entetes": ["Réception", "Date de réception", "Réceptionné le", "Fin de chantier", "Date de fin"]},
         "libelle":    {"type": "texte", "facultative": true, "entetes": ["Libellé", "Intitulé", "Objet", "Désignation"]},
         "montant":    {"type": "decimal", "facultative": true, "entetes": ["Montant HT", "Montant", "Honoraires HT", "Total HT"]}
       }$j$::jsonb,
       array['compte_ref', 'reference'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 15/10/2026) : un chantier réceptionné par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'chantiers' and m.version = 1);

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'missions', 1, 'Missions closes',
       '^(missions?|dossiers?[_ -]?clos|lettres?[_ -]?de[_ -]?mission)',
       array['Code client', 'Référence'],
       $j${
         "compte_ref": {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers", "Maître d'ouvrage", "Client"]},
         "reference":  {"type": "texte", "obligatoire": true, "entetes": ["Référence", "N° chantier", "N° mission", "N° affaire", "Code affaire"]},
         "close_le": {"type": "date", "obligatoire": true, "entetes": ["Clôture", "Date de clôture", "Close le", "Fin de mission", "Date de fin"]},
         "libelle":    {"type": "texte", "facultative": true, "entetes": ["Libellé", "Intitulé", "Objet", "Désignation"]},
         "montant":    {"type": "decimal", "facultative": true, "entetes": ["Montant HT", "Montant", "Honoraires HT", "Total HT"]}
       }$j$::jsonb,
       array['compte_ref', 'reference'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 15/10/2026) : une mission close par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'missions' and m.version = 1);

do $$
declare b record;
begin
  for b in select x.id from public.branchements x where x.module = 'offload' and x.logiciel = 'tableur' loop
    if not exists (select 1 from public.branchements_jeux j where j.branchement_id = b.id and j.code = 'chantiers') then
      perform private.declarer_jeu(b.id, 'chantiers', '{}'::jsonb);
    end if;
    if not exists (select 1 from public.branchements_jeux j where j.branchement_id = b.id and j.code = 'missions') then
      perform private.declarer_jeu(b.id, 'missions', '{}'::jsonb);
    end if;
  end loop;
end $$;

-- L'import lit aussi les jeux « chantiers » et « missions ».
create or replace function private.offload_appliquer_releve(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b public.branchements;
  rl public.releves;
  i record;
  v_entite uuid;
  v_total integer;
  v_ok integer;
  v_raison text;
  v_comptes_nouveaux integer;
  v_achats_nouveaux integer;
  v_achats_modifies integer;
  v_jeux jsonb := '{}'::jsonb;
  v_douteux boolean := false;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'offload' then
    raise exception 'Branchement introuvable ou étranger à OFFLOAD.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.offload_reglages g where g.client_id = b.client_id) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  v_entite := private.offload_entite(b.client_id, b.entite_id);

  if not exists (select 1 from public.instantanes x where x.releve_id = rl.id and x.statut = 'a_appliquer') then
    return jsonb_build_object('releve', rl.id, 'deja_applique', true);
  end if;

  -- Le référentiel d'abord, pour que les ventes trouvent leurs comptes avec leur vrai nom.
  for i in
    select x.id, j.code, j.id as jeu_id
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut = 'a_appliquer'
    order by case j.code when 'clients' then 0 when 'ventes' then 1 when 'equipements' then 2 when 'contrats' then 3
                          when 'interventions' then 4 when 'affaires' then 5 when 'contacts' then 6 when 'chantiers' then 7 when 'missions' then 8 else 9 end, x.recu_le, x.id
  loop
    v_comptes_nouveaux := 0;
    v_achats_nouveaux := 0;
    v_achats_modifies := 0;

    if i.code = 'clients' then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l where l.instantane_id = i.id) z
        where ref is not null
        order by ref, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, contact, email, telephone, commercial, groupe,
                                                 ville, secteur, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'nom', 200), lus.ref),
               private.offload_texte(v ->> 'contact', 200), private.offload_texte(v ->> 'email', 320),
               private.offload_texte(v ->> 'telephone', 40), private.offload_texte(v ->> 'commercial', 120),
               private.offload_texte(v ->> 'groupe', 200), private.offload_texte(v ->> 'ville', 120),
               private.offload_texte(v ->> 'secteur', 120), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = excluded.nom,
              contact = coalesce(excluded.contact, c.contact),
              email = coalesce(excluded.email, c.email),
              telephone = coalesce(excluded.telephone, c.telephone),
              commercial = coalesce(excluded.commercial, c.commercial),
              groupe = coalesce(excluded.groupe, c.groupe),
              ville = coalesce(excluded.ville, c.ville),
              secteur = coalesce(excluded.secteur, c.secteur),
              maj_le = now()
          where (c.nom, c.contact, c.email, c.telephone, c.commercial, c.groupe, c.ville, c.secteur)
                is distinct from (excluded.nom, coalesce(excluded.contact, c.contact), coalesce(excluded.email, c.email),
                                  coalesce(excluded.telephone, c.telephone), coalesce(excluded.commercial, c.commercial),
                                  coalesce(excluded.groupe, c.groupe), coalesce(excluded.ville, c.ville),
                                  coalesce(excluded.secteur, c.secteur))
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_comptes_nouveaux, v_achats_modifies from ecrits;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('clients', jsonb_build_object(
        'lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux, 'comptes_modifies', v_achats_modifies));

    elsif i.code = 'ventes' then
      select count(*), count(*) filter (where private.offload_ligne_vente_ok(l.valeurs))
        into v_total, v_ok
      from public.instantanes_lignes l where l.instantane_id = i.id;

      -- Le garde-fou : un export dont plus de la moitié des lignes est illisible n'est pas appliqué.
      if v_total > 0 and v_ok * 2 < v_total then
        v_raison := format('Sur %s lignes, %s seulement ont un code client, une date et un montant lisibles : '
                           'l''export n''est pas appliqué. Vérifiez les colonnes du fichier.', v_total, v_ok);
        perform private.acquitter_instantane(i.id, 'douteux', v_raison);
        perform private.journaliser_module(b.client_id, 'offload', 'offload.import_douteux', 'releves', rl.id::text,
          jsonb_build_object('releve', rl.id, 'instantane', i.id, 'jeu', 'ventes', 'lignes', v_total, 'exploitables', v_ok),
          v_entite);
        v_douteux := true;
        v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object('douteux', v_raison, 'lignes', v_total));
        continue;
      end if;

      -- Les comptes que les ventes citent et que le référentiel ne connaît pas encore.
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l
              where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)) z
        order by ref, (private.offload_texte(v ->> 'compte_nom', 200) is not null) desc, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, email, telephone, commercial, groupe, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'compte_nom', 200), lus.ref),
               private.offload_texte(v ->> 'email', 320), private.offload_texte(v ->> 'telephone', 40),
               private.offload_texte(v ->> 'commercial', 120), private.offload_texte(v ->> 'groupe', 200), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = case when c.nom = c.ref and excluded.nom <> excluded.ref then excluded.nom else c.nom end,
              email = coalesce(c.email, excluded.email),
              telephone = coalesce(c.telephone, excluded.telephone),
              commercial = coalesce(c.commercial, excluded.commercial),
              groupe = coalesce(c.groupe, excluded.groupe),
              maj_le = now()
          where (c.nom = c.ref and excluded.nom <> excluded.ref)
             or (c.email is null and excluded.email is not null)
             or (c.telephone is null and excluded.telephone is not null)
             or (c.commercial is null and excluded.commercial is not null)
             or (c.groupe is null and excluded.groupe is not null)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau) into v_comptes_nouveaux from ecrits;

      -- Les achats. Un achat est une PIÈCE : un client, une date, un numéro de pièce. Un export ligne à ligne
      -- (plusieurs lignes par facture) est additionné pièce par pièce. La clé est relue (date normalisée), elle
      -- ne dépend ni de l'ordre du fichier ni de la façon dont le logiciel écrit ses dates : un export rejoué,
      -- trié autrement ou corrigé met à jour la même pièce, il ne la double jamais.
      with lignes as (
        select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref,
               private.offload_lire_date(l.valeurs ->> 'date') as d,
               private.offload_texte(l.valeurs ->> 'reference', 120) as piece,
               private.offload_nature(l.valeurs ->> 'nature') as nat,
               private.offload_lire_montant(l.valeurs ->> 'montant') as m,
               private.offload_texte(l.valeurs ->> 'libelle', 500) as lib,
               l.n
        from public.instantanes_lignes l
        where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)
      ), lus as (
        select 'p1:' || ref || '|' || d::text || '|' || coalesce(piece, '') as k, ref, d, piece,
               sum(case when nat = 'avoir' then -abs(m) else m end) as montant,
               case when bool_and(nat = 'avoir') then 'avoir'
                    when bool_and(nat in ('commande', 'avoir')) and bool_or(nat = 'commande') then 'commande'
                    else 'facture' end as nature,
               left(string_agg(distinct lib, ' · '), 500) as lib
        from lignes
        group by ref, d, piece
      ), ecrits as (
        insert into public.offload_achats as a (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle,
                                                nature, source, jeu_id, cle)
        select b.client_id, v_entite, c.id, lus.d, round(lus.montant, 2), lus.piece, lus.lib, lus.nature, 'import', i.jeu_id, lus.k
        from lus
        join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = lus.ref
        on conflict (jeu_id, cle) do update
          set compte_id = excluded.compte_id, date_achat = excluded.date_achat, montant_ht = excluded.montant_ht,
              reference = excluded.reference, libelle = excluded.libelle, nature = excluded.nature, maj_le = now()
          where (a.compte_id, a.date_achat, a.montant_ht, a.reference, a.libelle, a.nature)
                is distinct from (excluded.compte_id, excluded.date_achat, excluded.montant_ht, excluded.reference,
                                  excluded.libelle, excluded.nature)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_achats_nouveaux, v_achats_modifies from ecrits;

      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object(
        'lignes', v_total, 'ecartees', v_total - v_ok, 'comptes_nouveaux', v_comptes_nouveaux,
        'achats_nouveaux', v_achats_nouveaux, 'achats_modifies', v_achats_modifies));

    elsif i.code in ('equipements', 'contrats', 'interventions', 'affaires', 'contacts', 'chantiers', 'missions') then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      -- Les comptes cités et pas encore connus (le référentiel viendra les nommer).
      insert into public.offload_comptes (client_id, entite_id, ref, nom, source, jeu_id)
      select distinct b.client_id, v_entite, z.ref, z.ref, 'import', i.jeu_id
      from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref from public.instantanes_lignes l where l.instantane_id = i.id) z
      where z.ref is not null
      on conflict (client_id, entite_id, ref) do nothing;
      get diagnostics v_comptes_nouveaux = row_count;

      if i.code = 'equipements' then
        with lus as (
          select distinct on (c.id, z.eref) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'ref', 120) as eref,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.eref is not null and private.offload_texte(z.v ->> 'designation', 200) is not null
          order by c.id, z.eref, z.n desc
        ), ecrits as (
          insert into public.offload_equipements as q (client_id, entite_id, compte_id, ref, designation, site, type_entretien, periodicite_mois,
                                                       nature, derniere_intervention, mise_en_service, source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id, lus.eref, private.offload_texte(lus.v ->> 'designation', 200),
                 private.offload_texte(lus.v ->> 'site', 200), private.offload_texte(lus.v ->> 'type_entretien', 200),
                 coalesce(private.offload_lire_periodicite(lus.v ->> 'periodicite_mois'), 12), private.offload_lire_nature(lus.v ->> 'nature'),
                 private.offload_lire_date(lus.v ->> 'derniere_intervention'), private.offload_lire_date(lus.v ->> 'mise_en_service'),
                 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, compte_id, ref) do update
            set designation = excluded.designation, site = coalesce(excluded.site, q.site),
                type_entretien = coalesce(excluded.type_entretien, q.type_entretien), periodicite_mois = excluded.periodicite_mois,
                nature = excluded.nature, derniere_intervention = greatest(q.derniere_intervention, excluded.derniere_intervention),
                mise_en_service = coalesce(excluded.mise_en_service, q.mise_en_service), maj_le = now()
            where (q.designation, q.site, q.type_entretien, q.periodicite_mois, q.nature, q.derniere_intervention)
                  is distinct from (excluded.designation, coalesce(excluded.site, q.site), coalesce(excluded.type_entretien, q.type_entretien),
                                    excluded.periodicite_mois, excluded.nature, greatest(q.derniere_intervention, excluded.derniere_intervention))
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code = 'contrats' then
        with lus as (
          select distinct on (z.num) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'numero', 120) as num,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.num is not null and private.offload_lire_date(z.v ->> 'fin') is not null
          order by z.num, z.n desc
        ), ecrits as (
          insert into public.offload_contrats as k (client_id, entite_id, compte_id, equipement_id, numero, libelle, debut, fin, reconduction,
                                                    source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id,
                 (select q.id from public.offload_equipements q where q.compte_id = lus.compte_id
                    and q.ref = private.offload_texte(lus.v ->> 'equipement_ref', 120)),
                 lus.num, private.offload_texte(lus.v ->> 'libelle', 300), private.offload_lire_date(lus.v ->> 'debut'),
                 private.offload_lire_date(lus.v ->> 'fin'), private.offload_lire_reconduction(lus.v ->> 'reconduction'), 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, numero) do update
            set fin = excluded.fin, libelle = coalesce(excluded.libelle, k.libelle), debut = coalesce(excluded.debut, k.debut),
                reconduction = excluded.reconduction, equipement_id = coalesce(excluded.equipement_id, k.equipement_id),
                statut = case when excluded.fin > k.fin then 'actif' else k.statut end, maj_le = now()
            where (k.fin, k.libelle, k.debut, k.reconduction) is distinct from (excluded.fin, coalesce(excluded.libelle, k.libelle),
                                                                                coalesce(excluded.debut, k.debut), excluded.reconduction)
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code in ('chantiers', 'missions') then
        -- Un chantier réceptionné ou une mission close : un passage du compte, daté, avec son montant s'il n'est pas déjà
        -- compté par une pièce de même référence.
        with lus as (
          select distinct on (c.id, z.ref) c.id as compte_id, c.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'reference', 120) as ref,
                       private.offload_lire_date(l.valeurs ->> case when i.code = 'chantiers' then 'receptionne_le' else 'close_le' end) as d,
                       private.offload_texte(l.valeurs ->> 'libelle', 200) as lib, private.offload_lire_montant(l.valeurs ->> 'montant') as m, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.ref is not null and z.d between date '1990-01-01' and current_date
          order by c.id, z.ref, z.n desc
        ), ecrits as (
          insert into public.offload_achats as a (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle, nature, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.d,
                 case when exists (select 1 from public.offload_achats x where x.compte_id = lus.compte_id and x.reference = lus.ref
                                   and x.annule_le is null and x.jeu_id is distinct from i.jeu_id) then 0
                      else coalesce(lus.m, 0) end,
                 lus.ref,
                 left(case when i.code = 'chantiers' then 'Chantier « ' || coalesce(lus.lib, lus.ref) || ' » réceptionné'
                           else 'Mission « ' || coalesce(lus.lib, lus.ref) || ' » close' end, 300),
                 'commande', 'import', i.jeu_id, 'p:' || lus.compte_id::text || '|' || lus.ref
          from lus
          on conflict (jeu_id, cle) do update
            set date_achat = excluded.date_achat, montant_ht = excluded.montant_ht, libelle = excluded.libelle, maj_le = now()
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code = 'contacts' then
        -- Les contacts tenus dans le CRM : un par compte, date et canal ; le réimport n'ajoute rien.
        with lus as (
          select c.id as compte_id, c.entite_id, z.d, z.v, z.cle,
                 case when z.v ->> 'canal' ~* '(appel|t[ée]l[ée]phon|phone)' then 'appel'
                      when z.v ->> 'canal' ~* '(visite|rdv|rendez|r[ée]union)' then 'visite'
                      when z.v ->> 'canal' ~* '(mail|courriel)' then 'courriel'
                      when z.v ->> 'canal' ~* 'salon' then 'salon' else 'autre' end as canal
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_lire_date(l.valeurs ->> 'date') as d,
                       l.valeurs as v, l.cle
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.d between date '1990-01-01' and current_date
        ), ecrits as (
          insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.d, lus.canal, private.offload_texte(lus.v ->> 'par', 120),
                 private.offload_texte(lus.v ->> 'note', 2000), 'import', i.jeu_id,
                 'c:' || lus.compte_id::text || '|' || lus.d::text || '|' || lus.canal
          from lus
          on conflict (jeu_id, cle) where jeu_id is not null do nothing
          returning compte_id, le
        ), maj as (
          update public.offload_comptes k set dernier_contact = greatest(coalesce(k.dernier_contact, e.le), e.le), maj_le = now()
          from (select compte_id, max(le) as le from ecrits group by compte_id) e
          where k.id = e.compte_id
          returning 1
        )
        select (select count(*) from ecrits), 0 into v_achats_nouveaux, v_achats_modifies;
      elsif i.code = 'affaires' then
        -- Ce qui attend son retrait : une affaire par compte et référence ; vu_le dit qu'elle figure au dernier export.
        -- Une affaire absente d'un export n'est jamais close d'office : la liste la signale « plus vue ».
        with lus as (
          select distinct on (c.id, z.ref) c.id as compte_id, c.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'reference', 120) as ref,
                       private.offload_lire_date(l.valeurs ->> 'disponible_le') as d, private.offload_lire_date(l.valeurs ->> 'retire_le') as r,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.ref is not null and z.d between date '1990-01-01' and current_date
          order by c.id, z.ref, z.n desc
        ), ecrits as (
          insert into public.offload_affaires as a (client_id, entite_id, compte_id, type, reference, libelle, disponible_le, valeur_ht,
                                                    statut, retire_le, vu_le, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id,
                 case when lus.v ->> 'type' ~* '(r[ée]par|interv|atelier|sav)' then 'intervention' else 'commande' end,
                 lus.ref, private.offload_texte(lus.v ->> 'libelle', 300), lus.d, private.offload_lire_montant(lus.v ->> 'valeur'),
                 case when lus.r is not null then 'retiree' else 'en_attente' end, lus.r, current_date, 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, compte_id, reference) do update
            set libelle = coalesce(excluded.libelle, a.libelle), valeur_ht = coalesce(excluded.valeur_ht, a.valeur_ht),
                disponible_le = case when a.statut = 'en_attente' then excluded.disponible_le else a.disponible_le end,
                retire_le = coalesce(a.retire_le, excluded.retire_le),
                statut = case when excluded.retire_le is not null and a.statut not in ('retiree', 'close_sans_suite') then 'retiree' else a.statut end,
                vu_le = current_date, jeu_id = excluded.jeu_id, cle = excluded.cle, maj_le = now()
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      else
        -- Une intervention se rattache à son équipement par le n° de série (et le code client s'il est donné).
        with lus as (
          select distinct on (q.id, z.d) q.id as equipement_id, q.compte_id, q.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'equipement_ref', 120) as eref, private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref,
                       private.offload_lire_date(l.valeurs ->> 'date') as d, l.valeurs as v, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_equipements q on q.client_id = b.client_id and q.ref = z.eref
          join public.offload_comptes c on c.id = q.compte_id and (z.cref is null or c.ref = z.cref)
          where z.d between date '1990-01-01' and current_date
          order by q.id, z.d, z.n desc
        ), ecrits as (
          insert into public.offload_interventions (client_id, entite_id, compte_id, equipement_id, le, nature, reference, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.equipement_id, lus.d,
                 case when lus.v ->> 'nature' ~* 'contr[ôo]le' then 'controle' when lus.v ->> 'nature' ~* '(r[ée]par|d[ée]pann)' then 'reparation'
                      when lus.v ->> 'nature' ~* '(install|mise en service)' then 'installation' else 'entretien' end,
                 private.offload_texte(lus.v ->> 'reference', 120), 'import', i.jeu_id, 'i:' || lus.equipement_id::text || '|' || lus.d::text
          from lus
          on conflict (jeu_id, cle) do nothing
          returning 1
        )
        select count(*), 0 into v_achats_nouveaux, v_achats_modifies from ecrits;
      end if;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux,
                                                                         'nouveaux', v_achats_nouveaux, 'modifies', v_achats_modifies));

    else
      -- Un jeu que le module ne lit pas : appliqué tel quel, sans effet.
      perform private.acquitter_instantane(i.id, 'applique');
    end if;
  end loop;

  perform private.journaliser_module(b.client_id, 'offload', 'offload.import_applique', 'releves', rl.id::text,
    jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux), v_entite);
  return jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux);
end $function$;

revoke execute on function private.offload_appliquer_releve(jsonb) from public, anon, authenticated;
grant execute on function private.offload_appliquer_releve(jsonb) to service_role;


-- ═══ omega/modules/offload/migrations/c4_15_message_et_echeance.sql @ 046014a
-- c4_15 — OFFLOAD : le message de reprise s'ancre aussi sur l'échéance qui revient (session C4, 15/10/2026)
--
-- CE QUE ÇA POSE (chiffrage omega/CHIFFRAGE/offload.md, n° 25 ; carte « Chaque client reçoit son propre message ») :
--   « Bonjour Martin, je retrouve votre passage du 14 mars 2025, réf. 4821, 615 € : l'entretien annuel qui va avec est à
--   refaire. Je vous garde un créneau ? » — le premier message d'une reprise reprend la dernière ligne de facturation
--   (déjà fait) ET, si le compte a un équipement dont l'entretien revient dans les deux mois ou est tombé sans
--   intervention connue, ce motif daté, avec la proposition d'un créneau. Aucun créneau n'est fixé à la place du
--   client : il répond, le commercial reprend la main. Une échéance de la semaine a déjà son propre message (c4_07) :
--   elle n'est pas reprise ici, pour ne jamais écrire deux fois la même chose.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- Le message de reprise : dernière facture, et l'échéance qui revient s'il y en a une.
create or replace function private.offload_message(p_compte uuid, p_rang integer, p_premier_le timestamptz default null,
                                                   p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  a public.offload_achats;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_org text;
  v_bonjour text;
  v_commande text;
  v_signature text;
  v_sujet text;
  v_corps text;
  v_echeance text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  select * into a from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir'
  order by x.date_achat desc, x.montant_ht desc limit 1;

  -- Le motif daté : l'entretien qui revient dans les deux mois (hors semaine qui vient), ou tombé sans intervention.
  select case when h.statut = 'depassee'
              then format('L''entretien de votre %s%s était à refaire le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le))
              else format('L''entretien de votre %s%s est à refaire d''ici le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le)) end
    into v_echeance
  from public.offload_echeances h join public.offload_equipements q on q.id = h.equipement_id
  where h.compte_id = c.id and h.type = 'entretien'
    and ((h.statut = 'a_venir' and h.due_le between v_jour + 8 and v_jour + 60) or h.statut = 'depassee')
  order by (h.statut = 'depassee') desc, h.due_le limit 1;

  v_bonjour := 'Bonjour' || coalesce(' ' || c.contact, '') || ',';
  v_signature := coalesce(nullif(btrim(g.signature), ''), v_org);
  if a.id is not null then
    v_commande := format('votre dernière commande chez %s date du %s (%s%s), il y a %s',
      v_org, private.offload_date_longue(a.date_achat),
      concat_ws(', ', 'réf. ' || a.reference, '« ' || a.libelle || ' »', private.offload_euros(a.montant_ht) || ' HT'), '',
      private.offload_duree(a.date_achat, v_jour));
  end if;

  if p_rang = 1 then
    v_sujet := left(v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                  else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || case when a.id is not null then 'Je reprends votre dossier : ' || v_commande || '.' || E'\n\n'
              else 'Nous n''avons pas eu l''occasion de travailler ensemble depuis un moment.' || E'\n\n' end
      || coalesce(v_echeance || E'\n\n', '')
      || 'Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour à ce message suffit : '
      || 'nous vous rappelons au moment qui vous convient.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  else
    v_sujet := left('Re : ' || v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                             else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone 'Europe/Paris')::date), 'dernier')
      || case when a.id is not null then ', au sujet de ' || replace(v_commande, 'votre dernière commande chez ' || v_org || ' date du', 'votre commande du') else '' end
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  end if;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps);
end $function$;

revoke execute on function private.offload_message(uuid, integer, timestamptz, date) from public, anon, authenticated;
grant execute on function private.offload_message(uuid, integer, timestamptz, date) to service_role;


-- ═══ omega/modules/daliro/migrations/b6_32_reserve_hors_devis.sql @ c416463
-- b6_32 — DALIRO : la réserve hors devis devient un avenant (session B6, 15/10/2026)
--
-- LA PROMESSE (/secteurs/btp, Peinture-finitions) : « Les reprises demandées à la réception sont photographiées, et
-- celles qui ne figuraient pas au devis sont chiffrées à part. » Une réserve (b6_13) ne pouvait que se lever ; et un
-- chantier réceptionné n'ouvrait plus d'avenant.
--
-- CE QUI EST POSÉ.
--   · btp_reserves.avenant_id : la réserve reconnue hors devis porte son avenant.
--   · public.btp_avenant_depuis_reserve(reserve, objet) : le bureau (comme les avenants) ouvre un avenant brouillon
--     dont l'objet est la réserve (ou l'objet donné), l'origine { canal « reception », reserve, reception, texte }, et
--     origine.chiffrage la recherche de prix de b6_26 (sans unité dite, elle rend au moins la ligne du marché proche).
--     Une réserve n'a qu'un avenant ; une réserve levée n'en ouvre plus.
--   · private.btp_ouvrir_avenant (b6_01) : sur un chantier RÉCEPTIONNÉ, il n'ouvre que l'avenant d'une réserve. Le
--     reste est inchangé (chantier ouvert ou suspendu, objet, origine, numéro, journal).
--   · L'avenant suit ensuite son chemin habituel : chiffré ligne à ligne, soumis, signé (sur place, b6_20).
--
-- Règles de pose : alter table … add column if not exists ; create or replace ; rien n'est retiré ni effacé.

alter table public.btp_reserves add column if not exists avenant_id uuid;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'btp_reserves_avenant_fkey') then
    alter table public.btp_reserves add constraint btp_reserves_avenant_fkey
      foreign key (client_id, avenant_id) references public.btp_avenants(client_id, id) on delete set null (avenant_id);
  end if;
end $do$;

create or replace function private.btp_ouvrir_avenant(p_chantier uuid, p_objet text, p_origine jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_marche uuid;
  v_id uuid;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  -- b6_32 : après la réception, seul un avenant né d'une réserve hors devis s'ouvre encore.
  if c.statut not in ('ouvert', 'suspendu')
     and not (c.statut = 'receptionne' and coalesce(p_origine ->> 'reserve', '') <> '') then
    raise exception 'Un avenant se prépare sur un chantier ouvert.' using errcode = '23514';
  end if;
  if coalesce(btrim(p_objet), '') = '' then
    raise exception 'Un avenant a un objet : ce qui est demandé en plus du marché.' using errcode = '22023';
  end if;
  if p_origine is not null and jsonb_typeof(p_origine) <> 'object' then
    raise exception 'L''origine d''un avenant est un objet (canal, auteur, date, texte).' using errcode = '22023';
  end if;
  -- Le marché de référence : le dernier vérifié du chantier (il peut n'y en avoir pas encore).
  select m.id into v_marche from public.btp_marches m
  where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie'
  order by m.verifie_le desc nulls last limit 1;
  perform pg_advisory_xact_lock(hashtextextended('daliro.avenants:' || c.id::text, 0));
  insert into public.btp_avenants (client_id, chantier_id, marche_id, numero, objet, origine)
  values (c.client_id, c.id, v_marche,
          (select coalesce(max(a.numero), 0) + 1 from public.btp_avenants a where a.chantier_id = c.id),
          p_objet, coalesce(p_origine, '{}'::jsonb))
  returning id into v_id;
  perform private.journaliser(c.client_id, 'daliro.avenant_ouvert', 'btp_avenants', v_id::text,
    jsonb_build_object('chantier', c.id, 'marche', v_marche, 'objet', btrim(p_objet), 'origine', coalesce(p_origine, '{}'::jsonb)), c.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_avenant_depuis_reserve(p_reserve uuid, p_objet text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.btp_reserves;
  x public.btp_receptions;
  v_objet text;
  v_avenant uuid;
begin
  select * into v from public.btp_reserves where id = p_reserve for update;
  if not found then
    raise exception 'Réserve introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(v.client_id, v.entite_id);
  if v.avenant_id is not null then
    raise exception 'Cette réserve a déjà son avenant.' using errcode = '23514';
  end if;
  if v.statut = 'levee' then
    raise exception 'Une réserve levée n''ouvre plus d''avenant.' using errcode = '23514';
  end if;
  select * into x from public.btp_receptions where id = v.reception_id;
  v_objet := left(coalesce(nullif(btrim(p_objet), ''), 'Reprise hors devis demandée à la réception : ' || v.description), 500);
  v_avenant := private.btp_ouvrir_avenant(v.chantier_id, v_objet,
    jsonb_build_object('canal', 'reception', 'reserve', v.id, 'reception', v.reception_id, 'date', x.date_reception,
                       'texte', left(v.description, 1000),
                       'chiffrage', private.btp_prix_pour(v.client_id, v.chantier_id, v.description, null)));
  update public.btp_reserves set avenant_id = v_avenant where id = v.id;
  perform private.journaliser(v.client_id, 'daliro.reserve_hors_devis', 'btp_receptions', v.reception_id::text,
    jsonb_build_object('reserve', v.id, 'avenant', v_avenant, 'description', left(v.description, 200)), v.entite_id);
  return v_avenant;
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_avenant_depuis_reserve(uuid, text) from public, anon;
grant execute on function public.btp_avenant_depuis_reserve(uuid, text) to authenticated, service_role;
revoke execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) from public, anon;
grant execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) to authenticated, service_role;
