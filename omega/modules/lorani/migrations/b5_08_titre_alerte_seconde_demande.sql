-- LORANI, lot B5-08 — le titre de l'alerte « seconde demande de pièces » garde ses articles.
--
-- Ce que ça corrige : le titre levé par b5_07 dépassait 200 caractères et lever_alerte_module le coupe : sur la
-- recette (06/10, 2 h 50 Z, « Pavillon Lemoine »), le titre s'arrêtait sur « … court depuis la première lettre »,
-- sans la référence aux articles. Désormais les articles viennent avant la liste des pièces (que l'écran et
-- l'historique demandes_pieces donnent en entier), l'intitulé est borné à 60 caractères. Le texte complet reste dans
-- les données de l'alerte (« detail »). Seul le corps de private.lorani_suivre_demandes_pieces (b5_07) change, la
-- règle est la même. Migration idempotente (create or replace), rien n'est retiré.

CREATE OR REPLACE FUNCTION private.lorani_suivre_demandes_pieces()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre text;
  v_premiere date;
begin
  if tg_op = 'INSERT' then
    if new.date_demande_pieces is not null then
      new.demandes_pieces := private.lorani_noter_demande(new.demandes_pieces, new.date_demande_pieces, new.pieces_demandees);
    end if;
    return new;
  end if;

  -- Rien de neuf sur la demande.
  if new.date_demande_pieces is not distinct from old.date_demande_pieces
     and new.pieces_demandees is not distinct from old.pieces_demandees then
    return new;
  end if;

  -- Première demande, demande effacée, ou correction de la même lettre (même date) : on garde la saisie.
  if old.date_demande_pieces is null or new.date_demande_pieces is null
     or new.date_demande_pieces = old.date_demande_pieces then
    if new.date_demande_pieces is not null then
      new.demandes_pieces := private.lorani_noter_demande(old.demandes_pieces, new.date_demande_pieces, new.pieces_demandees);
    end if;
    return new;
  end if;

  -- Une seconde lettre, d'une autre date.
  new.demandes_pieces := private.lorani_noter_demande(
    case when jsonb_array_length(old.demandes_pieces) = 0
         then private.lorani_noter_demande('[]'::jsonb, old.date_demande_pieces, old.pieces_demandees)
         else old.demandes_pieces end,
    new.date_demande_pieces, new.pieces_demandees);

  if old.date_pieces_fournies is not null then
    -- Après la remise des pièces : le permis ne bouge pas (art. R*423-41).
    v_titre := format('%s : demande de pièces du %s reçue après la remise des pièces (le %s) : sans effet sur les délais (art. R*423-41). Voyez s''il faut répondre.',
      left(coalesce(new.intitule, new.numero, 'Permis'), 60), to_char(new.date_demande_pieces, 'DD/MM/YYYY'),
      to_char(old.date_pieces_fournies, 'DD/MM/YYYY'));
    new.date_demande_pieces := old.date_demande_pieces;
    new.pieces_demandees := old.pieces_demandees;
  else
    v_premiere := least(old.date_demande_pieces, new.date_demande_pieces);
    new.pieces_demandees := case when new.date_demande_pieces < old.date_demande_pieces
                                 then private.lorani_union_pieces(new.pieces_demandees, old.pieces_demandees)
                                 else private.lorani_union_pieces(old.pieces_demandees, new.pieces_demandees) end;
    v_titre := format('%s : seconde demande de pièces (%s). Le délai de trois mois court depuis la lettre du %s (art. R*423-38, R*423-41). À fournir : %s.',
      left(coalesce(new.intitule, new.numero, 'Permis'), 60), to_char(greatest(old.date_demande_pieces, new.date_demande_pieces), 'DD/MM/YYYY'),
      to_char(v_premiere, 'DD/MM/YYYY'),
      (select string_agg(e ->> 'code', ', ') from jsonb_array_elements(new.pieces_demandees) e));
    new.date_demande_pieces := v_premiere;
  end if;

  perform private.lever_alerte_module(new.client_id, 'lorani', 'attention', left(v_titre, 200),
    jsonb_build_object('projet', new.projet_id, 'permis', new.id, 'demandes_pieces', new.demandes_pieces,
                       'lien', private.lorani_lien_permis(new.id), 'detail', v_titre),
    format('permis:%s:seconde_demande:%s', new.id, jsonb_array_length(new.demandes_pieces)), true,
    private.lorani_chef_de_projet(new.client_id, new.projet_id));
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_suivre_demandes_pieces() FROM PUBLIC;
