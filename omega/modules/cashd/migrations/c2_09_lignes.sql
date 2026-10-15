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
