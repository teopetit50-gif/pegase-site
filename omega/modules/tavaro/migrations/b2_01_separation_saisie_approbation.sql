-- b2_01 — Séparation saisie / approbation pour TAVARO (session B2, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : le socle refuse qu'une personne approuve la demande qu'elle a saisie
-- (lot 19c : preparer_approbation lit payload.saisi_par). Mais loc_deposer_demande et
-- loc_demander_avoir ne posaient pas saisi_par : l'agent qui chiffre un retour pouvait,
-- s'il est valideur, approuver sa propre facture ; celui qui demande un avoir pouvait
-- l'approuver s'il est gérant. Les deux fonctions posent désormais payload.saisi_par
-- (celui qui a chiffré la proposition, celui qui a demandé l'avoir) — un TABLEAU d'identifiants,
-- la forme que preparer_approbation lit (lot 19c : jsonb_typeof = 'array') — et nomment le
-- demandeur (demandeur_type = 'utilisateur', demandeur_id) pour que l'écran le dise
-- avant le clic, comme A3 le fait pour les autres modules.
-- Révision du 06/10, 02 h 10 : saisi_par était un scalaire, que preparer_approbation ignore ;
-- le troisième TAP (05 : le référent a approuvé sa propre facture) l'a montré.
-- Corps identiques au socle photographié le 05/10 à 22 h 30, hors ces ajouts.

CREATE OR REPLACE FUNCTION private.loc_deposer_demande(p_client uuid, p_proposition uuid, p_tentative integer DEFAULT 1, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  c public.loc_contrats;
  v_fuseau text;
  v_type text;
  v_resume text;
  v_demande uuid;
  v_nb integer;
  v_echeance timestamptz;
begin
  select * into p from public.loc_propositions where client_id = p_client and id = p_proposition for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if p.statut = 'a_valider' and exists (select 1 from public.demandes_validation d where d.id = p.demande_id and d.statut = 'en_attente') then
    return p.demande_id;
  end if;
  if p.statut not in ('calculee', 'a_valider') then
    return null;
  end if;
  select * into c from public.loc_contrats where client_id = p_client and id = p.contrat_id;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p.entite_id;
  perform private.loc_regles_par_defaut(p_client);
  v_type := case when p.hors_bareme then 'facture.envoyer_hors_bareme' else 'facture.envoyer' end;
  select count(*) into v_nb from public.loc_proposition_lignes l where l.proposition_id = p.id;
  v_resume := format('Facturer le retour du contrat %s : %s € TTC (frais %s, dommages %s)%s', c.numero,
                     replace(p.total_ttc::text, '.', ','), replace(p.total_frais_ttc::text, '.', ','), replace(p.total_dommages_ttc::text, '.', ','),
                     case when p.hors_bareme then ' — hors barème' else '' end);
  v_echeance := private.loc_echeance_locale(v_fuseau, p_maintenant);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload,
                                          echeance, cle_idempotence, demandeur_type, demandeur_id)
  values (p_client, p.entite_id, 'tavaro', v_type, 'loc_propositions', p.id::text, left(v_resume, 500), p.total_ttc,
          jsonb_strip_nulls(jsonb_build_object('proposition', p.id, 'contrat', c.id, 'numero', c.numero, 'version', p.version, 'tentative', p_tentative,
                             'total_ttc', p.total_ttc, 'total_frais_ttc', p.total_frais_ttc, 'total_dommages_ttc', p.total_dommages_ttc,
                             'lignes', v_nb, 'hors_bareme', p.hors_bareme, 'non_contradictoire', p.non_contradictoire,
                             'avertissements', p.avertissements,
                             -- b2_01 : celui qui a chiffré le retour n'approuve pas sa facture (preparer_approbation, lot 19c)
                             'saisi_par', case when p.calculee_par is null then null else jsonb_build_array(p.calculee_par) end, 'source', p.source)),
          v_echeance, 'tavaro:proposition:' || p.id::text || ':t' || p_tentative,
          case when p.calculee_par is null then 'systeme' else 'utilisateur' end, p.calculee_par)
  returning id into v_demande;
  update public.loc_propositions set statut = 'a_valider', demande_id = v_demande where id = p.id;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.demande_deposee', 'loc_propositions', p.id::text,
    jsonb_build_object('demande', v_demande, 'type_action', v_type, 'montant', p.total_ttc, 'tentative', p_tentative, 'echeance', v_echeance,
                       'saisi_par', p.calculee_par),
    p.entite_id);
  return v_demande;
end $function$;

CREATE OR REPLACE FUNCTION private.loc_demander_avoir(p_facture uuid, p_motif text, p_montant_ttc numeric DEFAULT NULL::numeric, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
  v_uid uuid := (select auth.uid());
  v_motif text := left(btrim(p_motif), 500);
  v_deja numeric;
  v_reste numeric;
  v_ttc numeric;
  v_ht numeric;
  v_tva numeric;
  v_total boolean;
  v_lignes jsonb;
  v_avoir uuid;
  v_demande uuid;
  v_resume text;
begin
  if f.statut = 'avoir' then
    raise exception 'Cette facture est déjà annulée par un avoir.' using errcode = '23514';
  end if;
  if exists (select 1 from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'a_valider') then
    raise exception 'Un avoir attend déjà la décision de la direction sur cette facture.' using errcode = '55000';
  end if;
  if v_motif is null or char_length(v_motif) < 3 then
    raise exception 'Un avoir a un motif : ce que la facture avait de faux.' using errcode = '22023';
  end if;
  select coalesce(sum(a.montant_ttc), 0) into v_deja from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'emis';
  v_reste := f.total_ttc - v_deja;
  if v_reste <= 0 then
    raise exception 'Cette facture est déjà entièrement créditée.' using errcode = '23514';
  end if;
  v_ttc := coalesce(p_montant_ttc, v_reste);
  if v_ttc <= 0 or v_ttc > v_reste or v_ttc <> round(v_ttc, 2) then
    raise exception 'Le montant d''un avoir est entre 0,01 et %s € (ce qui reste de la facture), au centime.', replace(v_reste::text, '.', ',')
      using errcode = '22023';
  end if;
  v_total := v_ttc = f.total_ttc;
  if v_total then
    v_ht := f.total_ht;
    v_tva := f.total_tva;
    select coalesce(jsonb_agg(jsonb_build_object('rang', l.rang, 'code', l.code, 'libelle', l.libelle, 'quantite', l.quantite, 'prix_unitaire', l.prix_unitaire,
                                                 'montant_ht', l.montant_ht, 'regime_tva', l.regime_tva, 'taux_tva', l.taux_tva, 'montant_tva', l.montant_tva,
                                                 'montant_ttc', l.montant_ttc) order by l.rang), '[]'::jsonb)
      into v_lignes
    from public.loc_facture_lignes l where l.client_id = f.client_id and l.facture_id = f.id;
  else
    -- Au prorata de la facture : la même part de TVA que la facture entière.
    v_ht := round(v_ttc * f.total_ht / f.total_ttc, 2);
    v_tva := v_ttc - v_ht;
    v_lignes := jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'rang', 1, 'code', 'AVOIR_PARTIEL', 'libelle', format('Avoir partiel sur la facture %s', f.reference), 'quantite', 1, 'prix_unitaire', v_ht,
      'montant_ht', v_ht, 'regime_tva', case when f.total_tva > 0 then 'taxable' else 'hors_champ' end,
      'taux_tva', case when f.total_tva > 0 and f.total_ht > 0 then round(f.total_tva / f.total_ht * 100, 2) end,
      'montant_tva', v_tva, 'montant_ttc', v_ttc)));
  end if;

  insert into public.loc_avoirs (client_id, entite_id, entite_emettrice_id, facture_id, facture_reference, contrat_id, contrat_numero, motif, total,
                                 montant_ht, montant_tva, montant_ttc, lignes, demande_par)
  values (f.client_id, f.entite_id, f.entite_emettrice_id, f.id, f.reference, f.contrat_id, f.contrat_numero, v_motif, v_total,
          v_ht, v_tva, v_ttc, v_lignes, v_uid)
  returning id into v_avoir;

  perform private.loc_regles_par_defaut(f.client_id);
  -- Le résumé entre au journal opposable : le montant et la facture, jamais le motif (un texte libre).
  v_resume := format('Avoir de %s € TTC sur la facture %s (contrat %s), %s', replace(v_ttc::text, '.', ','), f.reference, f.contrat_numero,
                     case when v_total then 'annulation complète' else 'partiel' end);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence,
                                          demandeur_type, demandeur_id)
  values (f.client_id, f.entite_id, 'tavaro', 'avoir.emettre', 'loc_avoirs', v_avoir::text, left(v_resume, 500), v_ttc,
          jsonb_build_object('avoir', v_avoir, 'facture', f.id, 'reference', f.reference, 'contrat', f.contrat_numero, 'montant_ttc', v_ttc,
                             'total', v_total, 'motif', v_motif, 'facture_ttc', f.total_ttc, 'deja_credite', v_deja, 'lignes', v_lignes,
                             -- b2_01 : celui qui demande l'avoir ne l'approuve pas
                             'saisi_par', jsonb_build_array(v_uid)),
          p_maintenant + interval '48 hours', 'tavaro:avoir:' || v_avoir::text, 'utilisateur', v_uid)
  returning id into v_demande;
  update public.loc_avoirs set demande_id = v_demande where id = v_avoir;
  perform private.journaliser_module(f.client_id, 'tavaro', 'tavaro.avoir_demande', 'loc_avoirs', v_avoir::text,
    jsonb_build_object('facture', f.id, 'reference', f.reference, 'montant_ttc', v_ttc, 'total', v_total, 'demande', v_demande, 'contrat', f.contrat_numero,
                       'saisi_par', v_uid),
    f.entite_id);
  return v_avoir;
end $function$;
