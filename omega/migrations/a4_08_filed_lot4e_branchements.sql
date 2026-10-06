-- FILED, lot 4e — Les branchements dans le socle de FILED.
--
-- Ce que ce lot pose :
--   private.filed_apres_controle(p_facture, p_statut)   ce qui suit le contrôle d'une facture : charge récurrente reconnue,
--                                                       imputation proposée, demande de validation déposée ou annulée ;
--   private.filed_balayer_lot4()                        le balayage horaire : charges attendues, factures attendues absentes,
--                                                       relances et remontées, exports à date fixe, mesures du jour ;
--   private.filed_controler_facture                     + contrôles d'identité (lot 4d), d'exercice (lot 4b) ; une facture décidée
--                                                       (validee, refusee, comptabilisee) garde son statut au recontrôle ; appel de
--                                                       filed_apres_controle après l'écriture du statut. Posé par lecture du corps
--                                                       en place (pg_get_functiondef) et insertion sur trois repères : robuste aux
--                                                       lots qui passent avant ou après ;
--   private.filed_rapprocher_ligne                      + l'écart de prix ou de quantité dans la tolérance signalé en « info » ;
--   private.filed_traiter                               + le balayage du lot 4 ;
--   private.filed_executer_decision                     + les décisions filed.valider_facture* et filed.imputer.
--
-- Les trois derniers sont le texte exact de la recette au 5 octobre 2026, plus les lignes marquées « Lot 4 (A4) ».
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Ce qui suit le contrôle d'une facture
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_apres_controle(p_facture uuid, p_statut text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_statut = 'a_valider' then
    -- La charge récurrente reconnue propose son imputation ; sinon, ce que le fournisseur a appris.
    perform private.filed_reconnaitre_charge(p_facture);
    perform private.filed_proposer_imputation(p_facture, 'apprise');
    perform private.filed_deposer_validation(p_facture, 1);
  elsif p_statut in ('a_completer', 'bloquee', 'ecartee') then
    perform private.filed_annuler_validations(p_facture, 'annulee');
    if p_statut = 'ecartee' then
      perform private.filed_reconnaitre_charge(p_facture);
    end if;
  end if;
end $$;
comment on function private.filed_apres_controle(uuid, text) is
  'Après le contrôle d''une facture : charge récurrente, imputation proposée, demande de validation déposée (a_valider) ou annulée (sinon).';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le balayage horaire du lot 4
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists private.filed_lot4_passages (
  client_id   uuid not null,
  tache       text not null,
  dernier_le  timestamptz not null default now(),
  primary key (client_id, tache)
);
comment on table private.filed_lot4_passages is 'Le dernier passage de chaque tâche du lot 4 de FILED, par organisation (uuid zéro : pour toutes) : le balayage ne refait pas une tâche avant son heure.';

create or replace function private.filed_lot4_passage(p_client uuid, p_tache text, p_tous_les interval)
returns boolean language plpgsql set search_path to '' as $$
declare v_dernier timestamptz;
begin
  select dernier_le into v_dernier from private.filed_lot4_passages where client_id = p_client and tache = p_tache;
  if v_dernier is not null and v_dernier > now() - p_tous_les then return false; end if;
  insert into private.filed_lot4_passages (client_id, tache, dernier_le) values (p_client, p_tache, now())
  on conflict (client_id, tache) do update set dernier_le = now();
  return true;
end $$;

create or replace function private.filed_balayer_lot4()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r record; v_res jsonb := '{}'::jsonb; n_orgs integer := 0; n_attendues integer := 0; n_manquantes integer := 0; n_mesures integer := 0;
        v_relances jsonb := '{}'::jsonb; n_exports integer := 0; v_zero uuid := '00000000-0000-0000-0000-000000000000';
begin
  for r in select g.client_id, e.fuseau from public.filed_reglages g
            left join public.entites e on e.client_id = g.client_id and e.principale
           where g.entite_id is null and g.actif
  loop
    if private.filed_lot4_passage(r.client_id, 'charges', interval '1 hour') then
      begin
        n_attendues := n_attendues + private.filed_generer_charges_attendues(r.client_id);
        n_manquantes := n_manquantes + private.filed_verifier_charges_manquantes(r.client_id, (now() at time zone coalesce(r.fuseau, 'Europe/Paris'))::date);
      exception when others then
        raise warning 'FILED lot 4 : charges récurrentes de % non balayées (%)', r.client_id, sqlerrm;
      end;
    end if;
    if private.filed_lot4_passage(r.client_id, 'mesures', interval '1 hour') then
      begin
        n_mesures := n_mesures + private.filed_mesurer(r.client_id, (now() at time zone coalesce(r.fuseau, 'Europe/Paris'))::date);
      exception when others then
        raise warning 'FILED lot 4 : mesures de % non enregistrées (%)', r.client_id, sqlerrm;
      end;
    end if;
    n_orgs := n_orgs + 1;
  end loop;
  if private.filed_lot4_passage(v_zero, 'relances', interval '1 hour') then
    v_relances := private.filed_relancer_validations();
  end if;
  if private.filed_lot4_passage(v_zero, 'exports', interval '1 hour') then
    n_exports := private.filed_produire_exports();
  end if;
  return jsonb_build_object('organisations', n_orgs, 'attendues', n_attendues, 'manquantes', n_manquantes, 'mesures', n_mesures,
                            'relances', v_relances, 'exports', n_exports);
end $$;
comment on function private.filed_balayer_lot4() is 'Appelé par private.filed_traiter à chaque passage : chaque tâche du lot 4 ne se refait pas avant une heure.';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. filed_controler_facture : trois insertions sur le corps en place
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare v_def text; v_a text; v_b text; v_c text; v_d text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'filed_controler_facture';
  if v_def is null then raise exception 'private.filed_controler_facture est introuvable.'; end if;
  if position('filed_apres_controle' in v_def) > 0 then
    raise notice 'filed_controler_facture : lot 4 déjà branché.';
    return;
  end if;

  v_a := E'  perform private.filed_rapprocher_facture(v_f.id);\n';
  v_b := E'  v_statut := case when coalesce(v_lecture, false) then \'a_completer\'\n';
  v_c := E'  return v_statut;\nend';
  if position(v_a in v_def) = 0 then raise exception 'Repère (a) introuvable dans filed_controler_facture.'; end if;
  if position(v_b in v_def) = 0 then raise exception 'Repère (b) introuvable dans filed_controler_facture.'; end if;
  if position(v_c in v_def) = 0 then raise exception 'Repère (c) introuvable dans filed_controler_facture.'; end if;

  -- (a) après le rapprochement : identité du fournisseur, exercice et clôture.
  v_def := replace(v_def, v_a, v_a
    || E'\n  -- ── Lot 4 (A4) : l\'identité du fournisseur (TVA de l\'Union, SIREN, registres), l\'exercice et la clôture ──\n'
    || E'  perform private.filed_controles_identite(v_f.id);\n'
    || E'  perform private.filed_controles_comptables(v_f.id);\n');
  -- (b) une facture décidée garde son statut : les contrôles se relisent, la décision reste.
  v_def := replace(v_def, v_b,
       E'  v_statut := case when v_f.statut in (\'validee\', \'refusee\', \'comptabilisee\') then v_f.statut -- Lot 4 (A4)\n'
    || E'                   when coalesce(v_lecture, false) then \'a_completer\'\n');
  -- (c) après l'écriture du statut : charge récurrente, imputation, demande de validation.
  v_def := replace(v_def, v_c,
       E'  -- ── Lot 4 (A4) : la charge récurrente, l\'imputation proposée, la demande de validation ──\n'
    || E'  perform private.filed_apres_controle(v_f.id, v_statut);\n'
    || v_c);
  -- (d) le message d'historique d'une facture décidée que l'on recontrôle.
  v_d := E'        else \'Contrôlée : prête à valider\'';
  if position(v_d in v_def) > 0 then
    v_def := replace(v_def, v_d,
         E'        when \'validee\' then \'Recontrôlée : validée, le statut reste.\' -- Lot 4 (A4)\n'
      || E'        when \'refusee\' then \'Recontrôlée : refusée, le statut reste.\'\n'
      || E'        when \'comptabilisee\' then \'Recontrôlée : comptabilisée, le statut reste.\'\n'
      || v_d);
  else
    raise notice 'Repère (d) absent : le message d''historique reste celui du socle.';
  end if;
  execute v_def;
  raise notice 'filed_controler_facture : lot 4 branché.';
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. filed_rapprocher_ligne : l'écart dans la tolérance est signalé
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_rapprocher_ligne(p_f filed_factures, p_l filed_factures_lignes, p_c filed_commandes_lignes, p_methode text, p_sens smallint, p_reglage filed_reglages, p_a_reception boolean)
 RETURNS filed_rapprochements_lignes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qte numeric := coalesce(p_l.quantite, 1);
  v_prix_f numeric;
  v_prix_c numeric := p_c.prix_unitaire;
  v_deja numeric;
  v_recu numeric;
  v_restant numeric;
  v_ecart_pu numeric;
  v_ecart_prix numeric := 0;
  v_ecart_qte numeric := 0;
  v_ecart_qte_montant numeric := 0;
  v_non_recu numeric := 0;
  v_non_recu_montant numeric := 0;
  v_prix_ok boolean := true;
  v_qte_ok boolean := true;
  v_resultat text := 'ok';
  v_libelle text;
  v_autres jsonb;
  v_x public.filed_rapprochements_lignes;
  v_preuve jsonb;
begin
  v_prix_f := coalesce(p_l.prix_unitaire, case when coalesce(p_l.quantite, 0) <> 0 then p_l.montant_ht / p_l.quantite end);
  select coalesce(sum(x.sens * x.quantite), 0), coalesce(jsonb_agg(distinct f2.numero) filter (where f2.numero is not null), '[]'::jsonb)
    into v_deja, v_autres
  from public.filed_rapprochements_lignes x join public.filed_factures f2 on f2.id = x.facture_id
  where x.commande_ligne_id = p_c.id and x.facture_id <> p_f.id and f2.statut <> 'ecartee';
  select coalesce(sum(q.quantite), 0) into v_recu
  from public.filed_receptions_lignes q join public.filed_receptions rc on rc.id = q.reception_id
  where q.commande_ligne_id = p_c.id and rc.statut = 'enregistree';
  v_restant := p_c.quantite - v_deja;
  v_libelle := format('ligne %s (%s)', p_l.rang, coalesce(left(p_l.designation, 60), p_l.reference_vendeur, p_l.numero, '?'));

  if p_sens = 1 then
    if v_prix_f is not null and v_prix_c is not null then
      v_ecart_pu := v_prix_f - v_prix_c;
      v_ecart_prix := round(v_ecart_pu * v_qte, 2);
      v_prix_ok := abs(v_ecart_pu) <= v_prix_c * coalesce(p_reglage.ecart_prix_pct, 0) / 100 + 0.0000005
                   or abs(v_ecart_prix) <= coalesce(p_reglage.ecart_prix_montant, 0.05);
    end if;
    v_ecart_qte := v_qte - v_restant;
    v_qte_ok := v_ecart_qte <= p_c.quantite * coalesce(p_reglage.ecart_quantite_pct, 0) / 100 + 0.0000005;
    v_ecart_qte_montant := round(greatest(v_ecart_qte, 0) * coalesce(v_prix_c, v_prix_f, 0), 2);
    if p_a_reception or coalesce(p_reglage.reception_exigee, false) then
      v_non_recu := greatest(v_deja + v_qte - v_recu, 0);
      v_non_recu_montant := round(v_non_recu * coalesce(v_prix_c, v_prix_f, 0), 2);
    end if;
    v_resultat := case when v_restant <= 0.0000005 then 'deja_facture'
                       when not v_qte_ok then 'ecart_quantite'
                       when not v_prix_ok then 'ecart_prix'
                       when v_non_recu > 0.0000005 then 'non_recu'
                       else 'ok' end;
  else
    -- Un avoir rend de la quantité : pas plus que ce qui a été facturé.
    v_ecart_qte := v_qte - greatest(v_deja, 0);
    v_resultat := case when v_ecart_qte > 0.0000005 then 'avoir_trop' else 'ok' end;
  end if;

  insert into public.filed_rapprochements_lignes (
    client_id, facture_id, document_id, facture_ligne_id, commande_ligne_id, methode, sens, quantite, prix_facture,
    prix_commande, ecart_prix_unitaire, ecart_prix, quantite_commandee, deja_facture, quantite_recue, ecart_quantite,
    ecart_quantite_montant, non_recu, non_recu_montant, resultat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_l.id, p_c.id, p_methode, p_sens, v_qte, v_prix_f, v_prix_c, v_ecart_pu,
          v_ecart_prix, p_c.quantite, v_deja, v_recu, v_ecart_qte, v_ecart_qte_montant, v_non_recu, v_non_recu_montant,
          v_resultat)
  returning * into v_x;

  -- Les contrôles de la ligne, chacun avec sa preuve ; la clé est la ligne commandée.
  v_preuve := jsonb_build_object('facture_ligne', p_l.id, 'commande_ligne', p_c.id, 'rang', p_l.rang, 'quantite', v_qte,
                                 'commande', p_c.quantite, 'deja_facture', v_deja, 'recu', v_recu, 'prix_facture', v_prix_f,
                                 'prix_commande', v_prix_c, 'autres_factures', v_autres, 'methode', p_methode);
  if p_sens = 1 then
    if v_resultat = 'deja_facture' then
      perform private.filed_poser_resultat(p_f, 'rapprochement.deja_facture', 'bloquant', true,
        format('%s : déjà facturée en totalité (%s sur %s commandé(s)%s).', v_libelle, private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(p_c.quantite),
               case when v_autres <> '[]'::jsonb then ', par ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_autres) x) else '' end),
        'DOUBLON', v_preuve, p_c.id::text);
    elsif not v_qte_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'bloquant', true,
        format('%s : %s facturé(s) pour %s restant à facturer (%s commandé(s), %s déjà facturé(s)) : %s de trop, soit %s.',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(p_c.quantite), private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(v_ecart_qte), private.filed_montant_texte(v_ecart_qte_montant)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant), p_c.id::text);
    elsif v_ecart_qte > 0.0000005 then
      -- Lot 4 (A4) : l'écart dans la tolérance est signalé, pas absorbé.
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'info', true,
        format('%s : %s facturé(s) pour %s restant à facturer : %s de trop, dans la tolérance de %s %% (signalé, pas absorbé).',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(v_ecart_qte), coalesce(p_reglage.ecart_quantite_pct, 0)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant, 'dans_tolerance', true), p_c.id::text);
    end if;
    if not v_prix_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', case when v_ecart_pu > 0 then 'bloquant' else 'attention' end, true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne.', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix), p_c.id::text);
    elsif v_ecart_pu is not null and v_ecart_pu <> 0 then
      -- Lot 4 (A4) : l'écart dans la tolérance est signalé, pas absorbé.
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', 'info', true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne, dans la tolérance (signalé, pas absorbé).', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix, 'dans_tolerance', true), p_c.id::text);
    end if;
    if v_non_recu > 0.0000005 then
      perform private.filed_poser_resultat(p_f, 'rapprochement.reception',
        case when coalesce(p_reglage.reception_exigee, false) then 'bloquant' else 'attention' end, true,
        format('%s : %s facturé(s) au total pour %s reçu(s) : %s non reçu(s), soit %s.', v_libelle,
               private.filed_quantite_texte(v_deja + v_qte), private.filed_quantite_texte(v_recu),
               private.filed_quantite_texte(v_non_recu), private.filed_montant_texte(v_non_recu_montant)),
        'LIVR_INCOMP', v_preuve || jsonb_build_object('non_recu', v_non_recu, 'non_recu_montant', v_non_recu_montant), p_c.id::text);
    end if;
  elsif v_resultat = 'avoir_trop' then
    perform private.filed_poser_resultat(p_f, 'avoir.quantite', 'attention', true,
      format('%s : l''avoir rend %s alors que %s seulement ont été facturé(s) sur cette ligne commandée.', v_libelle,
             private.filed_quantite_texte(v_qte), private.filed_quantite_texte(greatest(v_deja, 0))),
      'MONTANT_ERR', v_preuve, p_c.id::text);
  end if;
  return v_x;
end $function$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. filed_traiter : le balayage du lot 4
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_traiter(p_nombre integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_issue text;
  v_err text;
  n_faits integer := 0;
  n_decisions integer := 0;
  n_ignores integer := 0;
  n_rendus integer := 0;
  n_balayes integer := 0;
  n_battements integer := 0;
  v_lot4 jsonb := '{}'::jsonb;
begin
  perform set_config('omega.module', 'filed', true);

  for t in select * from private.prendre_travaux(array['filed.integrer', 'filed.decision'],
                                                  greatest(1, least(coalesce(p_nombre, 200), 500)),
                                                  interval '5 minutes', 'filed')
  loop
    begin
      if t.genre = 'filed.decision' then
        v_issue := private.filed_executer_decision(t.charge);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_decisions := n_decisions + 1;
      elsif coalesce(t.charge ->> 'module', 'filed') <> 'filed' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'pièce d''un autre module'));
        n_ignores := n_ignores + 1;
      elsif coalesce(t.charge ->> 'piece', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'travail sans pièce'));
        n_ignores := n_ignores + 1;
      else
        v_issue := private.filed_integrer_piece((t.charge ->> 'piece')::uuid);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_faits := n_faits + 1;
      end if;
    exception when others then
      get stacked diagnostics v_err = message_text;
      begin
        perform private.echouer_travail(t.id, 'FILED : ' || v_err);
      exception when others then
        raise warning 'FILED : travail % non rendu (%)', t.id, sqlerrm;
      end;
      n_rendus := n_rendus + 1;
    end;
  end loop;

  -- Les pièces au bout de leur lecture que l'événement n'a pas apportées, et
  -- les factures et avoirs reçus avant le moteur des factures.
  for r in
    select d.piece_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
    where (d.etat = 'en_lecture' and p.statut in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'))
       or (d.etat = 'a_traiter' and d.nature in ('facture', 'avoir')
           and not exists (select 1 from public.filed_factures f where f.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_commande'
           and not exists (select 1 from public.filed_commandes c where c.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_livraison'
           and not exists (select 1 from public.filed_receptions rc where rc.document_id = d.id))
    order by d.recu_le
    limit 500
  loop
    begin
      perform private.filed_integrer_piece(r.piece_id);
      n_balayes := n_balayes + 1;
    exception when others then
      raise warning 'FILED : pièce % non intégrée (%)', r.piece_id, sqlerrm;
    end;
  end loop;

  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.
  for r in
    select g.client_id, m.moteur from public.filed_reglages g
    cross join (values ('filed_reception'), ('filed_factures')) as m(moteur)
    left join public.battements b on b.client_id = g.client_id and b.module = m.moteur
    where g.entite_id is null and g.actif and (b.dernier_le is null or b.dernier_le < now() - interval '5 minutes')
  loop
    perform private.battre(r.client_id, r.moteur, jsonb_build_object('source', 'omega-filed'), null);
    n_battements := n_battements + 1;
  end loop;

  -- Lot 4 (A4) : charges récurrentes, relances et remontées de validation, exports à date fixe, mesures du jour.
  begin
    v_lot4 := private.filed_balayer_lot4();
  exception when others then
    raise warning 'FILED : balayage du lot 4 interrompu (%)', sqlerrm;
    v_lot4 := jsonb_build_object('erreur', sqlerrm);
  end;

  return jsonb_build_object('travaux', n_faits, 'decisions', n_decisions, 'ignores', n_ignores, 'rendus', n_rendus,
                            'balayes', n_balayes, 'battements', n_battements, 'lot4', v_lot4);
end $function$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. filed_executer_decision : la facture et l'imputation
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_executer_decision(p_charge jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_decideur uuid;
  v_commentaire text;
  v_four public.filed_fournisseurs;
  v_ib public.filed_fournisseurs_ibans;
  r record;
  v_issue text;
begin
  if coalesce(p_charge ->> 'demande', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'sans_demande';
  end if;
  select * into v_d from public.demandes_validation where id = (p_charge ->> 'demande')::uuid for update;
  if not found then
    return 'demande_effacee';
  end if;
  if v_d.module <> 'filed' then
    return 'autre_module';
  end if;
  if v_d.statut not in ('approuvee', 'rejetee', 'expiree') then
    return 'deja_traitee';
  end if;
  select a.user_id, a.commentaire into v_decideur, v_commentaire from public.approbations a
  where a.demande_id = v_d.id order by a.decide_le desc limit 1;

  if v_d.type_action = 'filed.valider_fournisseur' then
    select * into v_four from public.filed_fournisseurs
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'fournisseur_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un fournisseur nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_four.statut = 'a_confirmer' then
        update public.filed_fournisseurs set statut = 'actif', confirme_le = now(), confirme_par = v_decideur, maj_le = now()
        where id = v_four.id;
        -- L'IBAN que la personne a vu dans la demande se valide avec le fournisseur.
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where fournisseur_id = v_four.id and statut = 'propose'
          and empreinte = v_d.payload ->> 'iban_empreinte';
        -- Un autre IBAN proposé entre-temps part, lui, à la file.
        for r in select i.id, i.iban_masque from public.filed_fournisseurs_ibans i
                 where i.fournisseur_id = v_four.id and i.statut = 'propose'
        loop
          perform private.filed_deposer_demande(v_four.client_id, null, 'filed.valider_iban', 'filed_iban', r.id::text,
            format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), r.iban_masque), null,
            jsonb_build_object('fournisseur', v_four.id, 'iban', r.iban_masque), 'filed:iban:' || r.id::text);
        end loop;
        perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'confirme',
          'Fournisseur confirmé par une personne.', jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_confirme';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs set statut = 'refuse', motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500),
             confirme_le = now(), confirme_par = v_decideur, maj_le = now()
      where id = v_four.id;
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = 'Refusé avec le fournisseur.'
      where fournisseur_id = v_four.id and statut = 'propose';
      perform private.lever_alerte_module(v_four.client_id, 'filed', 'critique',
        left(format('Fournisseur refusé : %s. Ses factures restent bloquées.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'demande', v_d.id), 'fournisseur_refuse:' || v_four.id::text, true, null);
      perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'refuse',
        'Fournisseur refusé par une personne' || coalesce(' : ' || v_commentaire, '.'), jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_refuse';
    end if;
    return 'expiree';
  end if;

  if v_d.type_action = 'filed.valider_iban' then
    select * into v_ib from public.filed_fournisseurs_ibans
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'iban_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un IBAN nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_ib.statut = 'propose' then
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where id = v_ib.id;
        perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_valide',
          format('IBAN %s validé par une personne.', v_ib.iban_masque), jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_valide';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500)
      where id = v_ib.id;
      select * into v_four from public.filed_fournisseurs where id = v_ib.fournisseur_id;
      perform private.lever_alerte_module(v_ib.client_id, 'filed', 'critique',
        left(format('Changement d''IBAN refusé pour %s : tentative de fraude possible.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'iban', v_ib.iban_masque, 'demande', v_d.id),
        'iban_refuse:' || v_ib.id::text, true, null);
      perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_refuse',
        format('IBAN %s refusé par une personne', v_ib.iban_masque) || coalesce(' : ' || v_commentaire, '.'),
        jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_refuse';
    end if;
    return 'expiree';
  end if;

  -- Lot 4 (A4) : la facture (filed.valider_facture[.<centre>][.direction]) et l'imputation proposée (filed.imputer).
  if v_d.type_action like 'filed.valider_facture%' then
    return private.filed_decider_facture(v_d, v_decideur, v_commentaire);
  end if;
  if v_d.type_action = 'filed.imputer' then
    if v_d.statut = 'expiree' then
      return 'expiree';
    end if;
    v_issue := private.filed_decider_imputation(v_d);
    if v_d.statut = 'approuvee' then
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
    end if;
    return v_issue;
  end if;

  return 'type_inconnu';
end $function$;
