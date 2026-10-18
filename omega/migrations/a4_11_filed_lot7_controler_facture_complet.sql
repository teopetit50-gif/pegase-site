-- FILED, lot 7 (a4_11) — private.filed_controler_facture, corps complet.
--
-- Le texte exact de la recette (omega/SOCLE-EXTRAITS-COMMUN.sql, après le lot 4e : identité, exercice, statut décidé
-- conservé, filed_apres_controle), plus l'appel de private.filed_completer_fournisseur_lu en tête (lot 7). Remplace les
-- poses « par repère » des lots 4e et 4d/7 (a4_08, a4_10), qui restent sans effet une fois ce texte en place.
-- À reposer tel quel si le socle change ce corps : les lignes marquées « Lot 4 (A4) » et « Lot 7 (A4) » sont les nôtres.
-- Migration idempotente ; aucun DROP, aucun DELETE ajouté (le « delete from public.filed_controles » est celui du socle).

CREATE OR REPLACE FUNCTION private.filed_controler_facture(p_facture uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_factures;
  v_doc public.filed_documents;
  v_four public.filed_fournisseurs;
  v_ent public.entites;
  v_reglage public.filed_reglages;
  v_regime_ter text;
  v_regime text;
  v_manque text[] := '{}';
  v_tol numeric;
  v_ecart numeric;
  v_somme numeric;
  v_nb_lignes integer;
  v_autre public.filed_factures;
  v_autre_ref text;
  v_ecartee uuid;
  v_ib public.filed_fournisseurs_ibans;
  v_autre_four public.filed_fournisseurs;
  v_pays_iban text;
  v_taux_ok numeric[];
  v_taux_fr numeric[];
  v_taux numeric;
  v_taux_trouve numeric;
  v_hors text[];
  v_tol_taux numeric;
  v_ach_siren text;
  v_ent_siren text;
  v_autre_ent public.entites;
  v_auj date;
  v_statut text;
  v_anomalies text[];
  v_bloquants integer;
  v_attention integer;
  v_lecture boolean;
  v_message text;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  -- ── Lot 7 (A4) : ce que le lecteur a lu du fournisseur (SIREN, TVA, IBAN) remonte avant les contrôles ──
  if private.filed_completer_fournisseur_lu(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_reglage := private.filed_reglage(v_f.client_id, v_f.entite_id);
  v_tol := coalesce(v_reglage.tolerance_totaux, 0.05);
  v_auj := (now() at time zone coalesce(v_ent.fuseau, 'Europe/Paris'))::date;
  select count(*) into v_nb_lignes from public.filed_factures_lignes l where l.facture_id = v_f.id;

  delete from public.filed_controles where facture_id = v_f.id;

  -- ── La lecture : ce qui manque, ce qui reste à vérifier ──
  if v_f.numero is null then v_manque := array_append(v_manque, 'le numéro'); end if;
  if v_f.date_emission is null then v_manque := array_append(v_manque, 'la date d''émission'); end if;
  if v_f.montant_ttc is null then v_manque := array_append(v_manque, 'le total TTC'); end if;
  if v_f.montant_ht is null or v_f.montant_tva is null then v_manque := array_append(v_manque, 'le HT et la TVA'); end if;
  if v_f.fournisseur_id is null then v_manque := array_append(v_manque, 'le fournisseur'); end if;
  perform private.filed_poser_resultat(v_f, 'lecture.complete', 'bloquant', cardinality(v_manque) > 0,
    case when cardinality(v_manque) = 0 then 'Les champs essentiels sont lus.'
         else 'À compléter : ' || array_to_string(v_manque, ', ') || '.' end,
    'NON_CONFORME', jsonb_build_object('manque', to_jsonb(v_manque)));
  perform private.filed_poser_resultat(v_f, 'lecture.verifiee', 'bloquant', jsonb_array_length(v_f.champs_douteux) > 0,
    case when jsonb_array_length(v_f.champs_douteux) = 0 then 'Chaque valeur retenue est vérifiée sur la pièce.'
         else 'À vérifier sur la pièce : ' || (select string_agg(x ->> 'champ' || coalesce(' (' || (x ->> 'controle') || ')', ''), ', ')
                                                from jsonb_array_elements(v_f.champs_douteux) x) || '.' end,
    null, jsonb_build_object('champs', v_f.champs_douteux));

  -- ── Les montants ──
  if v_f.montant_ttc is not null then
    perform private.filed_poser_resultat(v_f, 'montant.nul', 'bloquant', v_f.montant_ttc = 0,
      case when v_f.montant_ttc = 0 then 'Total à zéro : une lecture ratée, le plus souvent. La pièce attend une personne.'
           else 'Le total n''est pas nul.' end, 'MONTANTTOTAL_ERR');
    perform private.filed_poser_resultat(v_f, 'montant.signe', 'bloquant', v_f.nature = 'facture' and v_f.montant_ttc < 0,
      case when v_f.nature = 'facture' and v_f.montant_ttc < 0
           then 'Total négatif sur une facture : c''est peut-être un avoir.' else 'Le signe du total est cohérent.' end,
      'MONTANTTOTAL_ERR', '{}'::jsonb, v_f.montant_ttc::text);
  end if;
  if v_f.montant_ht is not null and v_f.montant_tva is not null and v_f.montant_ttc is not null then
    v_ecart := v_f.montant_ht + v_f.montant_tva - v_f.montant_ttc;
    perform private.filed_poser_resultat(v_f, 'montant.coherence', 'bloquant', abs(v_ecart) > v_tol,
      case when abs(v_ecart) > v_tol
           then format('HT + TVA − TTC = %s : l''écart dépasse la tolérance de %s. La pièce attend une personne.',
                       private.filed_montant_texte(v_ecart), private.filed_montant_texte(v_tol))
           else 'HT + TVA = TTC.' end,
      'CALCUL_ERR', jsonb_build_object('ht', v_f.montant_ht, 'tva', v_f.montant_tva, 'ttc', v_f.montant_ttc,
                                       'ecart', v_ecart, 'tolerance', v_tol), v_ecart::text);
  end if;
  if v_nb_lignes > 0 and v_f.montant_ht is not null then
    select sum(l.montant_ht) into v_somme from public.filed_factures_lignes l where l.facture_id = v_f.id;
    if v_somme is not null then
      perform private.filed_poser_resultat(v_f, 'montant.lignes', 'attention', abs(v_somme - v_f.montant_ht) > v_tol,
        case when abs(v_somme - v_f.montant_ht) > v_tol
             then format('Les lignes font %s pour un HT de %s : remise ou frais au pied de la facture, ou ligne mal lue.',
                         private.filed_montant_texte(v_somme), private.filed_montant_texte(v_f.montant_ht))
             else 'La somme des lignes égale le HT.' end,
        'CALCUL_ERR', jsonb_build_object('somme_lignes', v_somme, 'ht', v_f.montant_ht, 'lignes', v_nb_lignes));
    end if;
  end if;
  if v_f.net_a_payer is not null and v_f.montant_ttc is not null and v_f.net_a_payer <> v_f.montant_ttc then
    perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'info', true,
      format('Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.',
             private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),
      null, jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc));
  end if;
  if v_f.devise <> 'EUR' then
    perform private.filed_poser_resultat(v_f, 'montant.devise', 'info', true,
      format('Montants en %s, lus tels qu''ils figurent sur la pièce, sans conversion.', v_f.devise));
  end if;
  if cardinality(v_f.montants_calcules) > 0 then
    perform private.filed_poser_resultat(v_f, 'montant.calcule', 'info', true,
      'Montant déduit des autres, faute de ligne sur la pièce : ' || array_to_string(v_f.montants_calcules, ', ') || '.',
      null, jsonb_build_object('champs', to_jsonb(v_f.montants_calcules)));
  end if;

  -- ── Les doublons : numéro, année de la date d'émission, SIREN du fournisseur
  -- (règles G1.42 et G1.45 de la DGFiP). Seule une pièce reçue plus tôt fait
  -- d'une autre son doublon. ──
  if v_f.numero_normalise is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null then
    select e.* into v_autre
    from public.filed_factures e
    join public.filed_documents d on d.id = e.document_id
    left join public.filed_fournisseurs ef on ef.id = e.fournisseur_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and (e.fournisseur_id = v_f.fournisseur_id or (v_four.siren is not null and ef.siren = v_four.siren))
      and e.numero_normalise = v_f.numero_normalise
      and extract(year from e.date_emission) = extract(year from v_f.date_emission)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
        v_ecartee := v_autre.id;
      end if;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.exact', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune autre facture de ce fournisseur ne porte ce numéro cette année.'
           when v_ecartee is not null then format('Même facture que la pièce %s : même numéro, même date, même montant. Écartée, elle reste consultable.', v_autre_ref)
           else format('Même numéro que la pièce %s, pour un montant de %s au lieu de %s : un numéro ne sert qu''une fois.',
                       v_autre_ref, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_autre.montant_ttc)) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref) end,
      coalesce(v_autre.id::text, ''));
  end if;
  if v_f.montant_ttc is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null and v_ecartee is null then
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and e.numero_normalise is distinct from v_f.numero_normalise
      and abs(e.date_emission - v_f.date_emission) <= coalesce(v_reglage.doublon_fenetre_jours, 3)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.probable', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune facture voisine du même fournisseur au même montant.'
           else format('Même fournisseur, même montant (%s), à %s jour(s) de la pièce %s : doublon probable, sous un autre numéro.',
                       private.filed_montant_texte(v_f.montant_ttc), abs(v_autre.date_emission - v_f.date_emission), v_autre_ref) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref, 'numero', v_autre.numero) end,
      coalesce(v_autre.id::text, ''));
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.fournisseur_id is distinct from v_f.fournisseur_id
      and e.numero_normalise = v_f.numero_normalise and e.montant_ttc = v_f.montant_ttc
      and e.date_emission = v_f.date_emission and e.statut <> 'ecartee'
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      perform private.filed_poser_resultat(v_f, 'doublon.autre_fournisseur', 'attention', true,
        format('Même numéro, même date et même montant que la pièce %s, sous un autre fournisseur : la même facture présentée deux fois ?', v_autre_ref),
        'DOUBLON', jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref), v_autre.id::text);
    end if;
  end if;

  -- ── Le fournisseur ──
  if v_four.id is not null then
    perform private.filed_poser_resultat(v_f, 'fournisseur.a_confirmer', 'bloquant', v_four.statut = 'a_confirmer',
      case when v_four.statut = 'a_confirmer'
           then format('Fournisseur nouveau (%s) : une personne le confirme avant tout paiement.', private.filed_libelle_fournisseur(v_four))
           else 'Fournisseur connu.' end,
      'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    if v_four.statut = 'refuse' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.refuse', 'bloquant', true,
        format('Fournisseur refusé par une personne (%s) : ne pas payer.', coalesce(v_four.motif, 'sans motif écrit')),
        'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_four.statut = 'bloque' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.bloque', 'bloquant', true,
        format('Fournisseur bloqué (%s) : aucune facture ne passe.', coalesce(v_four.motif, 'sans motif écrit')),
        'CREANCIER_ERR', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_identification = 'nom' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
        'Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.', null,
        jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_lu ? 'siren' and v_four.siren is not null then
      perform private.filed_poser_resultat(v_f, 'fournisseur.siren', 'bloquant', v_f.fournisseur_lu ->> 'siren' <> v_four.siren,
        case when v_f.fournisseur_lu ->> 'siren' <> v_four.siren
             then format('Le SIREN de la facture (%s) n''est pas celui du fournisseur retenu (%s).', v_f.fournisseur_lu ->> 'siren', v_four.siren)
             else 'Le SIREN de la facture est celui du fournisseur.' end,
        'NON_CONFORME', jsonb_build_object('lu', v_f.fournisseur_lu ->> 'siren', 'fournisseur', v_four.siren),
        v_f.fournisseur_lu ->> 'siren');
    end if;
  end if;

  -- ── L'IBAN ──
  if v_f.iban is not null then
    if not private.filed_iban_valide(v_f.iban) then
      perform private.filed_poser_resultat(v_f, 'iban.invalide', 'bloquant', true,
        format('IBAN faux (%s) : sa clé ne tombe pas juste.', private.filed_masquer_iban(v_f.iban)), 'COORD_BANC_ERR');
    elsif v_four.id is not null then
      select * into v_ib from public.filed_fournisseurs_ibans
      where client_id = v_f.client_id and fournisseur_id = v_four.id and iban = v_f.iban;
      if v_ib.statut = 'refuse' then
        perform private.filed_poser_resultat(v_f, 'iban.refuse', 'bloquant', true,
          format('IBAN déjà refusé pour ce fournisseur (%s) : ne pas payer, alerter.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque, 'refuse_le', v_ib.decide_le));
        perform private.lever_alerte_module(v_f.client_id, 'filed', 'critique',
          left(format('IBAN refusé présenté de nouveau par %s', v_four.nom), 200),
          jsonb_build_object('facture', v_f.id, 'fournisseur', v_four.id, 'iban', v_ib.iban_masque),
          'iban_refuse:' || v_ib.id::text || ':' || v_f.id::text, true, null);
      elsif v_ib.statut = 'propose' and v_four.statut = 'actif' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('Nouvel IBAN (%s) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement.', v_ib.iban_masque),
          'COORD_BANC_ERR', jsonb_build_object('iban', v_ib.iban_masque));
      elsif v_ib.statut = 'revoque' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('IBAN révoqué pour ce fournisseur (%s) : il ne sert plus.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque));
      else
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', false,
          case when v_ib.statut = 'valide' then 'IBAN connu et validé pour ce fournisseur.'
               else 'IBAN proposé avec le fournisseur nouveau : il se valide avec lui.' end);
      end if;
      select f.* into v_autre_four
      from public.filed_fournisseurs_ibans i join public.filed_fournisseurs f on f.id = i.fournisseur_id
      where i.client_id = v_f.client_id and i.iban = v_f.iban and i.statut = 'valide' and i.fournisseur_id <> v_four.id
      limit 1;
      perform private.filed_poser_resultat(v_f, 'iban.partage', 'bloquant', v_autre_four.id is not null,
        case when v_autre_four.id is null then 'L''IBAN n''appartient à aucun autre fournisseur.'
             else format('Cet IBAN est déjà celui d''un autre fournisseur (%s) : affacturage à justifier, ou fraude.', v_autre_four.nom) end,
        'COORD_BANC_ERR', case when v_autre_four.id is null then '{}'::jsonb
                               else jsonb_build_object('autre_fournisseur', v_autre_four.id) end,
        coalesce(v_autre_four.id::text, ''));
      v_pays_iban := left(v_f.iban, 2);
      if v_four.pays is not null and v_pays_iban <> replace(v_four.pays, 'EL', 'GR') then
        perform private.filed_poser_resultat(v_f, 'iban.pays', 'attention', true,
          format('IBAN tenu dans un autre pays (%s) que celui du fournisseur (%s) : à vérifier.', v_pays_iban, v_four.pays),
          'COORD_BANC_ERR', jsonb_build_object('pays_iban', v_pays_iban, 'pays_fournisseur', v_four.pays));
      end if;
    end if;
  elsif v_four.id is not null and not exists (select 1 from public.filed_fournisseurs_ibans i
                                             where i.fournisseur_id = v_four.id and i.statut = 'valide') then
    perform private.filed_poser_resultat(v_f, 'iban.absent', 'info', true,
      'Aucun IBAN sur la facture ni au référentiel : le paiement passera par un autre moyen.');
  end if;

  -- ── Le destinataire : la facture est-elle adressée à cette société ? ──
  v_ach_siren := v_f.acheteur_lu ->> 'siren';
  v_ent_siren := coalesce(v_ent.siren, case when v_ent.principale then (select c.siren from public.clients c where c.id = v_f.client_id) end);
  if v_ach_siren is not null then
    if v_ent_siren = v_ach_siren then
      perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', false,
        'Facture adressée à cette société.');
    else
      select e.* into v_autre_ent from public.entites e
      where e.client_id = v_f.client_id and e.id <> v_f.entite_id and e.siren = v_ach_siren
      limit 1;
      if v_autre_ent.id is not null then
        update public.filed_factures set entite_id = v_autre_ent.id where id = v_f.id;
        update public.filed_documents set entite_id = v_autre_ent.id where id = v_f.document_id;
        v_f.entite_id := v_autre_ent.id;
        perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text, 'reorientee',
          format('Adressée à %s (SIREN %s) : rangée dans cette société.', v_autre_ent.nom, v_ach_siren),
          jsonb_build_object('entite', v_autre_ent.id, 'siren', v_ach_siren));
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          format('Adressée à %s : rangée dans cette société.', v_autre_ent.nom), null,
          jsonb_build_object('entite', v_autre_ent.id));
      elsif v_ent_siren is null then
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          'Le SIREN de la société n''est pas renseigné : le destinataire n''est pas vérifié.');
      else
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', true,
          format('Facture adressée à une autre société (SIREN %s) que celle-ci (SIREN %s).', v_ach_siren, v_ent_siren),
          'DEST_ERR', jsonb_build_object('siren_facture', v_ach_siren, 'siren_societe', v_ent_siren), v_ach_siren);
      end if;
    end if;
  end if;

  -- ── La TVA ──
  if v_f.montant_tva is not null and v_f.montant_ht is not null then
    v_regime := case
      when v_f.montant_tva <> 0 and (select count(distinct t.taux) from public.filed_factures_tva t
                                     where t.facture_id = v_f.id and t.taux > 0) > 1 then 'mixte'
      when v_f.montant_tva <> 0 then 'normal'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and upper(t.categorie) = 'AE')
           or coalesce((v_f.mentions ->> 'autoliquidation')::boolean, false)
           or v_four.regime_tva = 'autoliquidation_btp' then 'autoliquidation'
      when private.filed_pays_ue(v_four.pays) then 'intracom'
      when v_four.pays is not null and v_four.pays <> 'FR' then 'hors_ue'
      when coalesce((v_f.mentions ->> 'franchise_293b')::boolean, false) or v_four.regime_tva = 'franchise' then 'franchise'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id
                   and upper(t.categorie) in ('E', 'Z', 'G', 'K', 'O'))
           or v_four.regime_tva = 'exonere' then 'exonere'
      else 'sans_tva' end;
    update public.filed_factures set regime_tva = v_regime where id = v_f.id;
    v_f.regime_tva := v_regime;

    if v_four.pays = 'FR' and v_f.montant_ht > coalesce(v_reglage.seuil_mentions_ht, 150)
       and v_regime not in ('franchise') and v_four.tva is null and not (v_f.fournisseur_lu ? 'tva') then
      perform private.filed_poser_resultat(v_f, 'tva.numero', 'attention', true,
        'Numéro de TVA du fournisseur absent de la facture : mention obligatoire (CGI, art. 242 nonies A), et la TVA déductible en dépend.',
        'NON_CONFORME');
    end if;
    if v_f.fournisseur_lu ->> 'tva' like 'FR%' and coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren) is not null then
      perform private.filed_poser_resultat(v_f, 'tva.numero_siren', 'bloquant',
        right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren),
        case when right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren)
             then format('Le numéro de TVA (%s) n''est pas celui du SIREN %s : il appartient à une autre société.',
                         v_f.fournisseur_lu ->> 'tva', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren))
             else 'Le numéro de TVA est bien celui du SIREN du fournisseur.' end,
        'NON_CONFORME', '{}'::jsonb, v_f.fournisseur_lu ->> 'tva');
    end if;

    v_regime_ter := private.filed_regime_territorial(v_f.client_id, v_f.entite_id);
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_fr from public.filed_taux_tva t;
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_ok from public.filed_taux_tva t
    where v_regime_ter is null or t.regime = v_regime_ter;

    if v_regime in ('normal', 'mixte') then
      if v_regime_ter = 'sans_tva' then
        perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
          'TVA facturée à une société d''un territoire où la TVA française ne s''applique pas (Guyane, Mayotte, collectivité à fiscalité propre) : à vérifier.',
          'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter), 'territoire');
      elsif exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and t.taux is not null) then
        select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
        where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_fr));
        if v_hors is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.', 'TX_TVA_ERR',
            jsonb_build_object('taux', to_jsonb(v_hors)), array_to_string(v_hors, ','));
        else
          select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
          where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_ok));
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', v_hors is not null,
            case when v_hors is null then 'Chaque taux de TVA est un taux légal du territoire de la société.'
                 else 'Taux légal ailleurs en France, pas dans le territoire de la société : ' || array_to_string(v_hors, ' %, ') || ' %.' end,
            'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter, 'taux', to_jsonb(v_hors)),
            coalesce(array_to_string(v_hors, ','), ''));
        end if;
        select sum(t.montant) into v_somme from public.filed_factures_tva t where t.facture_id = v_f.id;
        if v_somme is not null then
          perform private.filed_poser_resultat(v_f, 'tva.ventilation', 'attention', abs(v_somme - v_f.montant_tva) > v_tol,
            case when abs(v_somme - v_f.montant_tva) > v_tol
                 then format('La ventilation fait %s de TVA pour un total de %s.', private.filed_montant_texte(v_somme),
                             private.filed_montant_texte(v_f.montant_tva))
                 else 'La ventilation de la TVA égale son total.' end,
            'CALCUL_ERR', jsonb_build_object('somme', v_somme, 'tva', v_f.montant_tva));
        end if;
      elsif v_f.montant_ht <> 0 then
        -- Sans ventilation : le taux qui redonne la TVA au centime près, ligne par ligne arrondie.
        v_tol_taux := least(1.00, greatest(0.02, 0.005 * greatest(v_nb_lignes, 1)));
        v_taux_trouve := null;
        foreach v_taux in array v_taux_fr loop
          if abs(round(v_f.montant_ht * v_taux / 100, 2) - v_f.montant_tva) <= v_tol_taux then
            if v_taux_trouve is null or v_taux = any (v_taux_ok) then
              v_taux_trouve := v_taux;
            end if;
          end if;
        end loop;
        if v_taux_trouve is not null and v_taux_trouve = any (v_taux_ok) then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', false,
            format('TVA au taux légal de %s %%.', replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_taux_trouve is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('TVA au taux de %s %%, légal ailleurs en France mais pas dans le territoire de la société.',
                   replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_f.montant_tva / v_f.montant_ht * 100 between (select min(x) from unnest(v_taux_ok) x) - 0.01
                                                         and (select max(x) from unnest(v_taux_ok) x) + 0.01 then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('Taux moyen de %s %% : plusieurs taux probables, que la pièce ne détaille pas.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        else
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        end if;
      end if;
    end if;

    if v_regime = 'sans_tva' and v_f.montant_ht <> 0 then
      perform private.filed_poser_resultat(v_f, 'tva.sans_mention', 'attention', true,
        'Aucune TVA, sans mention d''exonération, d''autoliquidation ou de franchise : à vérifier.', 'TX_TVA_ERR');
    end if;
    if v_four.regime_tva = 'autoliquidation_btp' then
      perform private.filed_poser_resultat(v_f, 'tva.autoliquidation_attendue', 'bloquant', v_f.montant_tva <> 0,
        case when v_f.montant_tva <> 0
             then 'Sous-traitant du bâtiment : sa facture se fait hors taxes avec la mention « autoliquidation » (CGI, art. 283-2 nonies). La TVA facturée est une anomalie.'
             else 'Facture de sous-traitant hors taxes : la TVA sera autoliquidée.' end,
        'TX_TVA_ERR', '{}'::jsonb, v_f.montant_tva::text);
    end if;
    if v_regime in ('autoliquidation', 'intracom', 'hors_ue') then
      perform private.filed_poser_resultat(v_f, 'tva.regime', 'info', true,
        case v_regime
          when 'autoliquidation' then 'TVA due par l''acheteur (autoliquidation) : elle sera déclarée et déduite à l''écriture.'
          when 'intracom' then 'Fournisseur de l''Union européenne, sans TVA : acquisition ou service intracommunautaire, TVA autoliquidée.'
          else 'Fournisseur hors de l''Union, sans TVA : TVA autoliquidée à l''écriture, ou payée à l''importation.' end);
    end if;
  end if;

  -- ── Les dates ──
  if v_f.date_emission is not null then
    perform private.filed_poser_resultat(v_f, 'date.future', 'bloquant', v_f.date_emission > v_auj + 1,
      case when v_f.date_emission > v_auj + 1
           then format('Date d''émission dans le futur (%s) : erreur de lecture ou de saisie.', to_char(v_f.date_emission, 'DD/MM/YYYY'))
           else 'Date d''émission passée.' end,
      'NON_CONFORME', '{}'::jsonb, v_f.date_emission::text);
    if v_f.date_emission < v_auj - 365 then
      perform private.filed_poser_resultat(v_f, 'date.ancienne', 'attention', true,
        format('Pièce émise le %s, reçue le %s : plus d''un an d''écart, l''exercice est à vérifier.',
               to_char(v_f.date_emission, 'DD/MM/YYYY'), to_char(v_f.date_reception, 'DD/MM/YYYY')));
    end if;
    if v_f.echeance_lue is not null and v_f.echeance_lue < v_f.date_emission then
      perform private.filed_poser_resultat(v_f, 'date.echeance', 'attention', true,
        'Échéance antérieure à la date d''émission : à vérifier.', 'MODPAI_ERR');
    end if;
  end if;

  -- ── Le cadre de facturation (règle G1.02) ──
  if upper(coalesce(v_f.cadre_facturation, '')) in ('B2', 'S2', 'M2') then
    perform private.filed_poser_resultat(v_f, 'cadre.deja_payee', 'info', true,
      format('Facture déjà payée (cadre %s) : elle ne se paie pas une seconde fois.', upper(v_f.cadre_facturation)));
  end if;

  -- ── Le rapprochement (lot F3) : la commande, la réception, l'avoir ──
  perform private.filed_rapprocher_facture(v_f.id);

  -- ── Lot 4 (A4) : l'identité du fournisseur (TVA de l'Union, SIREN, registres), l'exercice et la clôture ──
  perform private.filed_controles_identite(v_f.id);
  perform private.filed_controles_comptables(v_f.id);

  -- ── L'état ──
  select count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'bloquant'),
         count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'attention'),
         bool_or(c.resultat = 'anomalie' and c.famille = 'lecture'),
         coalesce(array_agg(c.code order by c.code) filter (where c.resultat = 'anomalie' and c.gravite <> 'info'), '{}')
  into v_bloquants, v_attention, v_lecture, v_anomalies
  from public.filed_controles c where c.facture_id = v_f.id;

  v_statut := case when v_f.statut in ('validee', 'refusee', 'comptabilisee') then v_f.statut -- Lot 4 (A4)
                   when coalesce(v_lecture, false) then 'a_completer'
                   when v_ecartee is not null then 'ecartee'
                   when v_bloquants > 0 then 'bloquee'
                   else 'a_valider' end;

  if v_statut is distinct from v_f.statut or v_anomalies is distinct from v_f.anomalies then
    select string_agg(c.message, ' ' order by c.code) into v_message
    from public.filed_controles c
    where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text,
      'controlee',
      case v_statut
        when 'a_completer' then 'À compléter. ' || coalesce(v_message, '')
        when 'bloquee' then 'Bloquée. ' || coalesce(v_message, '')
        when 'ecartee' then 'Écartée : doublon exact d''une pièce reçue plus tôt.'
        when 'validee' then 'Recontrôlée : validée, le statut reste.' -- Lot 4 (A4)
        when 'refusee' then 'Recontrôlée : refusée, le statut reste.'
        when 'comptabilisee' then 'Recontrôlée : comptabilisée, le statut reste.'
        else 'Contrôlée : prête à valider' || case when v_attention > 0 then format(', avec %s point(s) d''attention.', v_attention) else '.' end end,
      jsonb_build_object('statut', v_statut, 'anomalies', to_jsonb(v_anomalies), 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.controles', 'filed_facture', v_f.id::text,
      jsonb_build_object('statut', v_statut, 'version', v_f.version, 'anomalies', to_jsonb(v_anomalies)), v_f.entite_id);
  end if;

  update public.filed_factures
     set statut = v_statut, doublon_de = v_ecartee, anomalies = v_anomalies, nb_bloquants = v_bloquants,
         nb_attention = v_attention, controle_le = now(), maj_le = now()
   where id = v_f.id;
  -- ── Lot 4 (A4) : la charge récurrente, l'imputation proposée, la demande de validation ──
  perform private.filed_apres_controle(v_f.id, v_statut);
  return v_statut;
end $function$;
