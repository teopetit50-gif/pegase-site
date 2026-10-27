-- CASHD — c2_49 : un client ne reçoit jamais deux fois le même texte (P12). Sur le banc (client cccccccc-…-0c),
-- transaction annulée. Le rappel du jour d'échéance ne cite pas de retard : d'un jour à l'autre, sa ligne de facture est
-- la même ; c'est le cas où une répétition mot pour mot était possible.

create or replace function tests.test_c2_49_texte_jamais_repete() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; v_f uuid; v_r uuid[] := '{}'; v_id uuid; v_t jsonb; k integer;
  v_textes text[] := '{}'; v_emp text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REPET', 'nom', 'Jamais Deux Fois', 'contact_facturation_email', 'compta@repet.test'));
  v_f := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-3301', 'date_emission', j - 30, 'echeance', j, 'montant_ttc', 640));
  perform tests.redevenir_admin();
  if v_f is null then
    select x.id into v_f from public.cashd_factures x where x.compte_id = v_c;
  end if;

  -- Trois rappels du jour d'échéance de la même facture, à trois jours différents, chacun réellement parti.
  for k in 0 .. 2 loop
    insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut)
    select v_client, x.entite_id, v_c, j - 10 + k, 'facture', 'echeance', 'fr', 'compta@repet.test', 'Jamais Deux Fois', 'preparee'
    from public.cashd_comptes x where x.id = v_c returning id into v_id;
    insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
    values (v_client, v_id, v_f, 'echeance', 1, 640, 0, 0, 0);
    v_t := private.cashd_ecrire_texte(v_id);
    update public.cashd_relances set sujet = v_t ->> 'sujet', corps = v_t ->> 'corps', gabarit = v_t ->> 'gabarit', variante = (v_t ->> 'variante')::smallint
     where id = v_id;
    perform tests.c2_parti(v_id);
    -- la pièce est rendue (une facture n'a qu'une pièce active par palier) : le texte reçu, lui, reste
    update public.cashd_relances_pieces set annulee = true where relance_id = v_id;
    v_r := v_r || v_id;
    v_textes := v_textes || private.cashd_empreinte_texte(v_t ->> 'sujet', v_t ->> 'corps');
  end loop;
  return next ok((select count(distinct e) from unnest(v_textes) e) = 3, 'Les trois rappels partis ont trois textes différents (trois variantes)');

  -- Un rappel qui ne part pas (variante 3) : le tour suivant retomberait sur la variante 1, déjà reçue mot pour mot.
  update public.cashd_relances set variante = 3 where id = v_r[3];
  insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut)
  select v_client, x.entite_id, v_c, j - 2, 'facture', 'echeance', 'fr', 'compta@repet.test', 'Jamais Deux Fois', 'preparee'
  from public.cashd_comptes x where x.id = v_c returning id into v_id;
  insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
  values (v_client, v_id, v_f, 'echeance', 1, 640, 0, 0, 0);
  v_t := private.cashd_ecrire_texte(v_id);
  v_emp := private.cashd_empreinte_texte(v_t ->> 'sujet', v_t ->> 'corps');
  return next ok(not (v_emp = any (v_textes)), 'Le quatrième message n''est identique à aucun des trois reçus');
  return next ok(v_t ->> 'repetition_evitee' = 'reference' and v_t ->> 'corps' like '%Référence de ce message : %',
                 'Toutes les variantes ayant été reçues, la référence datée le rend unique');

  -- Avec une variante encore jamais reçue, c'est elle qui est choisie, sans référence ajoutée.
  update public.cashd_relances set corps = corps || ' ' where id = v_r[2];   -- le texte de la variante 2 n'a plus été reçu tel quel
  v_t := private.cashd_ecrire_texte(v_id);
  return next ok(v_t ->> 'repetition_evitee' = 'variante' and v_t ->> 'corps' not like '%Référence de ce message%'
                 and not (private.cashd_empreinte_texte(v_t ->> 'sujet', v_t ->> 'corps') = any (v_textes)),
                 'S''il reste une variante jamais reçue mot pour mot, elle est choisie');

end $f$;
