-- LORANI, lot B5-10 — l'alerte de seconde demande de pièces cite la jurisprudence.
--
-- Recherche du coordinateur (06/10, 13 h 43 Z), qui confirme la règle de b5_07 (union des listes, date de la première
-- lettre gardée, le délai ne repart pas) :
--   - CE, 30 avril 2024, n° 461958 : l'administration peut inviter de nouveau le pétitionnaire à compléter son
--     dossier, mais cette demande est sans incidence sur le cours du délai et sur la naissance d'une décision tacite ;
--     le délai d'instruction ne part qu'à la réception de la dernière pièce ;
--   - CE, 4 février 2025 : dès qu'au moins une pièce demandée figure parmi celles du code, le délai est valablement
--     interrompu. Lorani n'a aucun avertissement « pièce non prévue par le code » portant sur toute une demande : le
--     socle garde les codes de pièces (lorani_codes_pieces, b5_05/b5_06) et écarte le texte libre sans rien signaler ;
--     la seule mention de R*423-41 sur une demande est celle d'une demande arrivée après le délai d'un mois (calcul du
--     socle) ou après la remise des pièces (ci-dessous). Rien à retirer de ce côté.
-- Ce qui change : le titre de l'alerte de seconde demande cite « CE 30 avril 2024, n° 461958 » (≤ 200 caractères,
-- intitulé borné à 50) ; le texte complet (« detail » des données de l'alerte) cite la décision et les articles
-- R*423-38 et R*423-39 ; l'alerte « après la remise des pièces » ajoute la décision à son détail. La règle ne change
-- pas. Seul le corps de private.lorani_suivre_demandes_pieces (b5_08) est remplacé.
-- Migration idempotente (create or replace), rien n'est retiré.

CREATE OR REPLACE FUNCTION private.lorani_suivre_demandes_pieces()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre text;
  v_detail text;
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
    v_detail := v_titre || ' Une nouvelle invitation à compléter le dossier ne change ni le cours du délai ni la naissance d''une décision tacite (CE, 30 avril 2024, n° 461958).';
    new.date_demande_pieces := old.date_demande_pieces;
    new.pieces_demandees := old.pieces_demandees;
  else
    v_premiere := least(old.date_demande_pieces, new.date_demande_pieces);
    new.pieces_demandees := case when new.date_demande_pieces < old.date_demande_pieces
                                 then private.lorani_union_pieces(new.pieces_demandees, old.pieces_demandees)
                                 else private.lorani_union_pieces(old.pieces_demandees, new.pieces_demandees) end;
    v_titre := format('%s : 2e demande de pièces du %s, sans effet sur les délais (CE 30 avril 2024, n° 461958) ; délai depuis la lettre du %s. À fournir : %s.',
      left(coalesce(new.intitule, new.numero, 'Permis'), 50), to_char(greatest(old.date_demande_pieces, new.date_demande_pieces), 'DD/MM/YYYY'),
      to_char(v_premiere, 'DD/MM/YYYY'),
      (select string_agg(e ->> 'code', ', ') from jsonb_array_elements(new.pieces_demandees) e));
    v_detail := format('Seconde demande de pièces (lettres du %s et du %s). La mairie peut inviter de nouveau à compléter le dossier, mais cette demande est sans incidence sur le cours du délai et sur la naissance d''une décision tacite (CE, 30 avril 2024, n° 461958 ; art. R*423-38). Le délai de trois mois pour fournir les pièces court depuis la première lettre (art. R*423-39) ; l''instruction part de la réception de la dernière pièce. Fournissez toutes les pièces : %s.',
      to_char(v_premiere, 'DD/MM/YYYY'), to_char(greatest(old.date_demande_pieces, new.date_demande_pieces), 'DD/MM/YYYY'),
      (select string_agg(e ->> 'code', ', ') from jsonb_array_elements(new.pieces_demandees) e));
    new.date_demande_pieces := v_premiere;
  end if;

  perform private.lever_alerte_module(new.client_id, 'lorani', 'attention', left(v_titre, 200),
    jsonb_build_object('projet', new.projet_id, 'permis', new.id, 'demandes_pieces', new.demandes_pieces,
                       'lien', private.lorani_lien_permis(new.id), 'detail', v_detail),
    format('permis:%s:seconde_demande:%s', new.id, jsonb_array_length(new.demandes_pieces)), true,
    private.lorani_chef_de_projet(new.client_id, new.projet_id));
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_suivre_demandes_pieces() FROM PUBLIC;
