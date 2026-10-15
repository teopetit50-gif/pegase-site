-- LORANI, lot B5-02 — les liens des alertes et du point du matin mènent à l'écran client.
--
-- Ce que ça corrige : lorani_lien_permis, lorani_alerter_transition et lorani_lire_piece (lorani_alerter_rappel : b5_03)
-- renvoyaient vers /secteurs/architectes/permis, une page qui n'existe pas sur omegaai.fr (la page des architectes
-- est une vitrine). Les alertes, le point du matin et les lignes « à confirmer » pointent désormais l'écran client
-- /espace/lorani : ?permis=<id> ouvre le permis, ?projet=<id> le projet.
-- Les corps des deux fonctions sont ceux du socle photographié le 05/10/2026 (omega/SOCLE-EXTRAITS-LORANI.sql),
-- seuls les liens changent. Migration idempotente (create or replace).

create or replace function private.lorani_lien_permis(p_permis uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace/lorani?permis=' || p_permis::text
$$;

create or replace function private.lorani_lien_projet(p_projet uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace/lorani?projet=' || p_projet::text
$$;

CREATE OR REPLACE FUNCTION private.lorani_alerter_transition(p public.lorani_permis, p_projet public.lorani_projets, p_calcul jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_impl jsonb := p_calcul -> 'decision_implicite';
  v_dp boolean := p.type_autorisation = 'dp';
  v_titre text;
  v_niveau text;
  v_cle text;
begin
  if p_calcul ->> 'etat' = 'decision_a_confirmer' and v_impl is not null then
    v_niveau := case when v_impl ->> 'nature' = 'tacite' then 'attention' else 'critique' end;
    v_titre := format('%s : %s le %s si aucune décision ne vous a été notifiée. Confirmez-le, ou saisissez la décision reçue.',
      private.lorani_titre_permis(p, p_projet),
      case when v_impl ->> 'nature' = 'tacite'
           then case when v_dp then 'non-opposition tacite' else 'permis tacite né' end
           else case when v_dp then 'opposition tacite' else 'rejet implicite' end end,
      to_char((v_impl ->> 'date')::date, 'DD/MM/YYYY'));
    v_cle := format('permis:%s:instruction:implicite', p.id);
  elsif p_calcul ->> 'etat' = 'purge' then
    v_niveau := 'info';
    v_titre := format('%s : purgé à l''issue du %s, plus de retrait ni de recours des tiers possible. Chantier sans ce risque dès le %s.',
      private.lorani_titre_permis(p, p_projet), to_char((p_calcul ->> 'date_purge')::date, 'DD/MM/YYYY'),
      to_char((p_calcul ->> 'chantier_sans_risque_le')::date, 'DD/MM/YYYY'));
    v_cle := format('permis:%s:purge:acquise', p.id);
  else
    return null;
  end if;
  return private.lever_alerte_module(p.client_id, 'lorani', v_niveau, left(v_titre, 200),
    jsonb_strip_nulls(jsonb_build_object('projet', p.projet_id, 'permis', p.id, 'etat', p_calcul ->> 'etat',
      'motif', v_impl ->> 'motif', 'date_purge', p_calcul ->> 'date_purge', 'lien', private.lorani_lien_permis(p.id))),
    v_cle, true, private.lorani_chef_de_projet(p.client_id, p.projet_id));
end $function$;

CREATE OR REPLACE FUNCTION private.lorani_lire_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.pieces;
  v_projet public.lorani_projets;
  x public.lorani_permis;
  v_valeurs jsonb;
  v_props jsonb;
  e jsonb;
  v_numero text;
  v_permis uuid;
  v_verifiee boolean;
  v_citations jsonb;
  v_id uuid;
  n integer := 0;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    return jsonb_build_object('ignore', 'pièce introuvable');
  end if;
  if p.module <> 'lorani' or p.objet_type is distinct from 'lorani_projet' then
    return jsonb_build_object('ignore', 'pièce hors d''un dossier de Lorani');
  end if;
  if p.chiffrement is not null then
    return jsonb_build_object('ignore', 'pièce chiffrée');
  end if;
  if p.statut not in ('lue', 'a_verifier') then
    return jsonb_build_object('ignore', 'pièce non lue');
  end if;
  select * into v_projet from public.lorani_projets pr where pr.client_id = p.client_id and pr.id::text = p.objet_id;
  if not found then
    return jsonb_build_object('ignore', 'dossier introuvable');
  end if;

  v_valeurs := private.lorani_valeurs_de_piece(p.id);
  v_props := private.lorani_propositions(p.type_piece, v_valeurs);
  if jsonb_array_length(v_props) = 0 then
    if p.type_piece = 'lorani_arrete' and v_valeurs #>> '{decision,valeur}' = 'sursis' then
      perform private.lever_alerte_module(p.client_id, 'lorani', 'attention',
        left(format('« %s » : arrêté de sursis à statuer reçu. Le calendrier ne le calcule pas : à voir avec votre conseil.',
                    left(v_projet.nom, 80)), 200),
        jsonb_build_object('projet', v_projet.id, 'piece', p.id, 'lien', private.lorani_lien_projet(v_projet.id)),
        'lecture:sursis:' || p.id, true, private.lorani_chef_de_projet(p.client_id, v_projet.id));
    end if;
    return jsonb_build_object('piece', p.id, 'type_piece', p.type_piece, 'propositions', 0);
  end if;

  -- Le permis visé : celui dont le numéro concorde, sinon le seul permis en cours du dossier.
  v_numero := private.lorani_numero_dossier(v_valeurs #>> '{numero_dossier,valeur}');
  if v_numero is not null then
    select x2.id into v_permis from public.lorani_permis x2
    where x2.client_id = p.client_id and x2.projet_id = v_projet.id and x2.actif
      and private.lorani_numero_dossier(x2.numero) = v_numero
    order by x2.cree_le limit 1;
  end if;
  if v_permis is null then
    select case when count(*) = 1 then min(x2.id::text)::uuid end into v_permis
    from public.lorani_permis x2
    where x2.client_id = p.client_id and x2.projet_id = v_projet.id and x2.actif
      and (v_numero is null or x2.numero is null or private.lorani_numero_dossier(x2.numero) = v_numero);
  end if;

  for e in select * from jsonb_array_elements(v_props) loop
    if v_permis is not null then
      select * into x from public.lorani_permis where id = v_permis;
      continue when private.lorani_deja_saisi(x, e ->> 'nature', e -> 'valeurs');
    end if;
    v_verifiee := not exists (select 1 from jsonb_array_elements_text(e -> 'champs') c
                              where v_valeurs ? c and jsonb_typeof(v_valeurs -> c) = 'object'
                                and not coalesce((v_valeurs #>> array[c, 'verifiee'])::boolean, false))
                  and not exists (select 1 from jsonb_array_elements_text(e -> 'champs') c,
                                                jsonb_array_elements(case jsonb_typeof(v_valeurs -> c) when 'array'
                                                                          then v_valeurs -> c else '[]'::jsonb end) r
                                  where not coalesce((r ->> 'verifiee')::boolean, false));
    select coalesce(jsonb_agg(jsonb_build_object('champ', c, 'texte', r ->> 'texte', 'page', (r ->> 'page')::integer,
                                                 'verifiee', coalesce((r ->> 'verifiee')::boolean, false))), '[]'::jsonb)
      into v_citations
    from jsonb_array_elements_text(e -> 'champs') c,
         jsonb_array_elements(case jsonb_typeof(v_valeurs -> c) when 'array' then v_valeurs -> c
                                   when 'object' then jsonb_build_array(v_valeurs -> c) else '[]'::jsonb end) r;

    v_id := null;
    insert into public.lorani_permis_dates_lues (client_id, entite_id, projet_id, permis_id, piece_id, type_piece, nature,
                                                 proposition, citations, verifiee)
    values (p.client_id, v_projet.entite_id, v_projet.id, v_permis, p.id, p.type_piece, e ->> 'nature',
            e -> 'valeurs', v_citations, v_verifiee)
    on conflict (client_id, piece_id, nature) do update
      set permis_id = excluded.permis_id, type_piece = excluded.type_piece, proposition = excluded.proposition,
          citations = excluded.citations, verifiee = excluded.verifiee, maj_le = now()
      where lorani_permis_dates_lues.statut = 'proposee'
    returning id into v_id;
    if v_id is not null then
      n := n + 1;
      perform private.lever_alerte_module(p.client_id, 'lorani', 'info',
        left(format('« %s » : %s lu%s sur %s, à confirmer.', left(v_projet.nom, 80),
          case e ->> 'nature' when 'depot' then 'date de dépôt' when 'delai_notifie' then 'délai d''instruction notifié'
                              when 'demande_pieces' then 'demande de pièces' when 'decision' then 'décision de la mairie'
                              when 'decision_tacite' then 'permis tacite' else 'premier jour d''affichage' end,
          case when e ->> 'nature' in ('depot', 'demande_pieces', 'decision') then 'e' else '' end,
          case p.type_piece when 'lorani_recepisse_depot' then 'le récépissé de dépôt'
                            when 'lorani_lettre_delai' then 'la lettre de la mairie'
                            when 'lorani_demande_pieces' then 'la demande de pièces'
                            when 'lorani_arrete' then 'l''arrêté'
                            when 'lorani_certificat_tacite' then 'le certificat'
                            else 'le constat d''affichage' end), 200),
        jsonb_build_object('projet', v_projet.id, 'permis', v_permis, 'piece', p.id, 'proposition', v_id,
                           'lien', coalesce(private.lorani_lien_permis(v_permis), private.lorani_lien_projet(v_projet.id))),
        'lecture:' || v_id, true, private.lorani_chef_de_projet(p.client_id, v_projet.id));
    end if;
  end loop;
  return jsonb_strip_nulls(jsonb_build_object('piece', p.id, 'type_piece', p.type_piece, 'propositions', n,
                                              'permis', v_permis));
end $function$;
