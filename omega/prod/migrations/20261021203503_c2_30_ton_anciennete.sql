-- 20261021203503 c2_30_ton_anciennete
-- Source : dépôt : 162895fa omega/modules/cashd/migrations/c2_30_ton_anciennete.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_30_ton_anciennete.sql @ 162895fa ; c2_03 cité comme test : ignoré ; c2_30 cité comme test : ignoré.
-- ═══ omega/modules/cashd/migrations/c2_30_ton_anciennete.sql @ 162895fa
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_30 : le ton du rappel suit l'ancienneté du retard (21/10/2026, session C2 — TCASHD-08a)
-- ═══════════════════════════════════════════════════════════════════════════
-- Un rappel de 8 jours et un rappel de 35 jours avaient le même corps (recette T-CASHD, S2-1). La phrase {oubli} du
-- rappel est désormais graduée :
--   · jusqu'à 15 jours de retard : « Il s'agit sans doute d'un simple oubli. » (comme avant : client qui paie
--     d'habitude à l'heure, et pas de demande de date liée au montant) ;
--   · au-delà de 15 jours : « Ce retard dure maintenant depuis N jours. » ;
--   · au-delà de 45 jours : « Ce retard de N jours devient important : merci de nous indiquer dès à présent la date de
--     règlement prévue. » (sans redemander la date si le ton du montant l'a déjà fait).
-- 15 et 45 jours sont des défauts : l'organisation les règle (cashd_regler_relances : ton_retard_jours,
-- ton_retard_important_jours ; écran « Vos textes ») et le défaut s'efface dès qu'elle les pose.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_reglages add column if not exists ton_retard_jours smallint;
alter table public.cashd_reglages add column if not exists ton_retard_important_jours smallint;
comment on column public.cashd_reglages.ton_retard_jours is 'Au-delà, le rappel dit la durée du retard (null : 15 jours).';
comment on column public.cashd_reglages.ton_retard_important_jours is 'Au-delà, le rappel dit que le retard devient important (null : 45 jours).';

-- Régler les relances (c2_04), avec les paliers du ton.
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
                  'suivi_facturation_jours', 'ton_retard_jours', 'ton_retard_important_jours');
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
  -- c2_30 : les paliers d'ancienneté du ton (par défaut 15 et 45 jours ; null rend le défaut)
  if (p_champs ? 'ton_retard_jours' and p_champs ->> 'ton_retard_jours' is not null and coalesce(p_champs ->> 'ton_retard_jours', '') !~ '^[0-9]{1,3}$')
     or (p_champs ? 'ton_retard_important_jours' and p_champs ->> 'ton_retard_important_jours' is not null and coalesce(p_champs ->> 'ton_retard_important_jours', '') !~ '^[0-9]{1,3}$')
     or coalesce(case when p_champs ? 'ton_retard_jours' then (p_champs ->> 'ton_retard_jours')::integer else g.ton_retard_jours end, 15) not between 1 and 365
     or coalesce(case when p_champs ? 'ton_retard_important_jours' then (p_champs ->> 'ton_retard_important_jours')::integer else g.ton_retard_important_jours end, 45) not between 2 and 365
     or coalesce(case when p_champs ? 'ton_retard_jours' then (p_champs ->> 'ton_retard_jours')::integer else g.ton_retard_jours end, 15)
        >= coalesce(case when p_champs ? 'ton_retard_important_jours' then (p_champs ->> 'ton_retard_important_jours')::integer else g.ton_retard_important_jours end, 45) then
    raise exception 'Les paliers du ton se donnent en jours de retard, le premier avant le second (par défaut 15 et 45).' using errcode = '22023';
  end if;
  update public.cashd_reglages set
    ton_retard_jours = case when p_champs ? 'ton_retard_jours' then (p_champs ->> 'ton_retard_jours')::smallint else ton_retard_jours end,
    ton_retard_important_jours = case when p_champs ? 'ton_retard_important_jours' then (p_champs ->> 'ton_retard_important_jours')::smallint else ton_retard_important_jours end,
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

-- Les variables d'un gabarit (c2_27) : {oubli} gradué.
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
    "oubli": "au rappel, la phrase qui suit l''ancienneté du retard : « simple oubli » jusqu''à 15 jours (si le client paie d''habitude à l''heure), « ce retard dure depuis N jours » ensuite, « ce retard devient important » au-delà de 45 jours (paliers réglables)",
    "ton_montant": "au-delà du seuil de ton, la demande de la date de règlement prévue, sinon rien",
    "droits": "les pénalités et l''indemnité forfaitaire dues, quand il y en a",
    "reglement": "vos moyens de règlement, et la proposition d''échelonnement au-delà du seuil réglé",
    "devis_suite": "la fin d''une relance de devis, au vocabulaire de votre métier",
    "cette_facture": "« cette facture » ou « ces factures », accordé au nombre de pièces",
    "ce_message": "« ce courriel » ou « ce courrier », selon le canal (courriel, ou lettre recommandée)"
  }'::jsonb
$function$;

-- Écrire une relance (c2_28) : le ton suit l'ancienneté.
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
    -- c2_30 : le ton suit l'ancienneté du retard (paliers réglables, 15 et 45 jours par défaut)
    'oubli', case when v_cle <> 'rappel' then ''
                  when v_max_retard > coalesce(g.ton_retard_important_jours, 45) then
                    case when v_l = 'en' then format('This delay of %s days is becoming significant', v_max_retard)
                                              || case when v_ton = '' then ': please let us know now when payment will be made. ' else '. ' end
                         else format('Ce retard de %s jours devient important', v_max_retard)
                              || case when v_ton = '' then ' : merci de nous indiquer dès à présent la date de règlement prévue. ' else '. ' end end
                  when v_max_retard > coalesce(g.ton_retard_jours, 15) then
                    case when v_l = 'en' then format('This payment is now %s days overdue. ', v_max_retard)
                         else format('Ce retard dure maintenant depuis %s jours. ', v_max_retard) end
                  when not v_retardataire and v_ton = '' then
                    case when v_l = 'en' then 'This is probably a simple oversight. ' else 'Il s''agit sans doute d''un simple oubli. ' end
                  else '' end,
    'ton_montant', v_ton, 'droits', v_droits, 'reglement', v_reglement, 'devis_suite', v_suite);

  v_corps := private.cashd_rendre(v_gab ->> 'corps', v_vars)
             || E'\n' || coalesce(nullif(btrim(g.formule), ''), case when v_l = 'en' then 'Kind regards,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
             || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_emetteur) || E'\n';
  return jsonb_build_object('sujet', left(private.cashd_rendre(v_gab ->> 'sujet', v_vars), 300), 'corps', v_corps, 'montant', v_total,
                            'penalites', v_pen, 'indemnites', v_ind, 'retard_max', v_max_retard, 'pieces', v_n,
                            'gabarit', v_cle, 'variante', v_var);
end $function$;

revoke execute on function public.cashd_regler_relances(uuid, jsonb) from public, anon;
grant execute on function public.cashd_regler_relances(uuid, jsonb) to authenticated, service_role;
revoke execute on function private.cashd_gabarit_variables() from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;
