-- LORANI, lot B5-07 — une seconde demande de pièces complète la première, elle ne la remplace pas.
--
-- Ce que ça corrige : une demande de pièces confirmée sur un permis qui en portait déjà une écrasait la première
-- (lorani_confirmer_date_lue fait `set date_demande_pieces = <nouvelle>, pieces_demandees = <nouvelle liste>`, la
-- saisie de l'écran aussi). Constaté sur la recette le 06/10 à 2 h 15 Z : « Pavillon Lemoine » a perdu PCMI3 et PCMI6
-- (lettre du 01/10) au profit de PCMI2 et PCMI8 (lettre du 03/10), et son échéance « pièces » a glissé du 2027-01-01
-- au 2027-01-03. Or (NOTES-B5 § 6) : la mairie réclame toutes les pièces en une fois (art. R*423-38) ; le demandeur a
-- trois mois pour tout fournir, sinon rejet tacite (art. R*423-39) ; une demande hors du délai d'un mois ou sur une
-- pièce non prévue par le code ne modifie pas les délais (art. R*423-41). Un client qui suivrait l'écran ne
-- fournirait que la seconde liste. Point encore à faire valider par un juriste : la seconde demande DANS le mois.
--
-- Désormais (trigger BEFORE, donc la même règle pour la confirmation d'une date lue et pour la saisie de l'écran) :
--   1. Nouvelle colonne public.lorani_permis.demandes_pieces : l'historique des lettres, [{date, pieces}] dans l'ordre
--      des dates ; pieces_demandees reste la liste à fournir.
--   2. Seconde lettre (autre date) avant la remise des pièces : pieces_demandees = union (la lettre la plus ancienne
--      d'abord, puis les codes nouveaux) ; date_demande_pieces = la plus ancienne (le délai de trois mois ne repart
--      pas ; l'échéance et les rappels restent) ; alerte « attention » au chef de projet.
--   3. Lettre arrivée après date_pieces_fournies : rien ne change sur le permis ; la lettre va à l'historique et
--      l'alerte cite l'art. R*423-41.
--   4. Même date, autre liste : c'est une correction de la même lettre ; la liste est remplacée, l'historique aussi.
--   5. private.lorani_deja_saisi : une lettre déjà dans l'historique avec la même liste ne repropose rien.
-- Les données déjà en base : l'historique est amorcé avec la demande courante de chaque permis (ce qu'un écrasement
-- a fait perdre n'est pas reconstitué ici ; sur le banc, « Pavillon Lemoine » se rejoue par l'écran).
-- Migration idempotente (add column if not exists, create or replace) ; rien n'est retiré.

ALTER TABLE public.lorani_permis ADD COLUMN IF NOT EXISTS demandes_pieces jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_permis_demandes_pieces_check') then
    alter table public.lorani_permis add constraint lorani_permis_demandes_pieces_check
      check (jsonb_typeof(demandes_pieces) = 'array' and jsonb_array_length(demandes_pieces) <= 24);
  end if;
end $$;

-- L'union de deux listes [{code}], la première d'abord, sans doublon.
CREATE OR REPLACE FUNCTION private.lorani_union_pieces(p_a jsonb, p_b jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('code', z.code) order by z.rang), '[]'::jsonb)
  from (select y.code, min(y.rang) as rang
        from (select e ->> 'code' as code, o as rang
              from jsonb_array_elements(case jsonb_typeof(p_a) when 'array' then p_a else '[]'::jsonb end) with ordinality as a(e, o)
              union all
              select e ->> 'code', 1000 + o
              from jsonb_array_elements(case jsonb_typeof(p_b) when 'array' then p_b else '[]'::jsonb end) with ordinality as b(e, o)) y
        where y.code is not null
        group by y.code) z
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_union_pieces(jsonb, jsonb) FROM PUBLIC;

-- L'historique, trié par date, une entrée par date (la dernière liste lue pour cette date l'emporte).
CREATE OR REPLACE FUNCTION private.lorani_noter_demande(p_hist jsonb, p_date date, p_pieces jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(h.e order by h.d), '[]'::jsonb)
  from (select e, (e ->> 'date')::date as d
        from jsonb_array_elements(case jsonb_typeof(p_hist) when 'array' then p_hist else '[]'::jsonb end) as t(e)
        where (e ->> 'date')::date is distinct from p_date
        union all
        select jsonb_build_object('date', p_date, 'pieces', coalesce(p_pieces, '[]'::jsonb)), p_date
        where p_date is not null) h
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_noter_demande(jsonb, date, jsonb) FROM PUBLIC;

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
    v_titre := format('%s : nouvelle demande de pièces datée du %s, reçue après la remise des pièces (le %s). Elle ne modifie pas les délais (art. R*423-41) ; voyez s''il faut quand même répondre.',
      coalesce(new.intitule, new.numero, 'Permis'), to_char(new.date_demande_pieces, 'DD/MM/YYYY'),
      to_char(old.date_pieces_fournies, 'DD/MM/YYYY'));
    new.date_demande_pieces := old.date_demande_pieces;
    new.pieces_demandees := old.pieces_demandees;
  else
    v_premiere := least(old.date_demande_pieces, new.date_demande_pieces);
    new.pieces_demandees := case when new.date_demande_pieces < old.date_demande_pieces
                                 then private.lorani_union_pieces(new.pieces_demandees, old.pieces_demandees)
                                 else private.lorani_union_pieces(old.pieces_demandees, new.pieces_demandees) end;
    v_titre := format('%s : seconde demande de pièces (lettres du %s et du %s). Fournissez toutes les pièces : %s. Le délai de trois mois court depuis la première lettre (art. R*423-38, R*423-39) ; une demande hors délai d''un mois ne change pas les délais (art. R*423-41).',
      coalesce(new.intitule, new.numero, 'Permis'), to_char(v_premiere, 'DD/MM/YYYY'),
      to_char(greatest(old.date_demande_pieces, new.date_demande_pieces), 'DD/MM/YYYY'),
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

-- Après lorani_permis_garder et lorani_permis_heriter_projet (ordre alphabétique des triggers BEFORE).
DO $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'lorani_permis_suivre_demandes'
                   and tgrelid = 'public.lorani_permis'::regclass) then
    create trigger lorani_permis_suivre_demandes
      before insert or update of date_demande_pieces, pieces_demandees on public.lorani_permis
      for each row execute function private.lorani_suivre_demandes_pieces();
  end if;
end $$;

-- Une lettre déjà notée dans l'historique avec la même liste ne repropose rien (corps du socle, la branche
-- demande_pieces lit aussi l'historique).
CREATE OR REPLACE FUNCTION private.lorani_deja_saisi(x lorani_permis, p_nature text, v jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(case p_nature
    when 'depot' then x.date_depot = (v ->> 'date_depot')::date
                      and (v ->> 'numero' is null or private.lorani_numero_dossier(x.numero) = v ->> 'numero')
    when 'delai_notifie' then x.delai_notifie_mois = (v ->> 'delai_notifie_mois')::smallint
    when 'demande_pieces' then (x.date_demande_pieces is not null and x.pieces_demandees = coalesce(v -> 'pieces', '[]'::jsonb))
                               or exists (select 1 from jsonb_array_elements(x.demandes_pieces) h
                                          where (h ->> 'date')::date = (v ->> 'date_demande_pieces')::date
                                            and h -> 'pieces' = coalesce(v -> 'pieces', '[]'::jsonb))
    when 'decision' then x.decision = v ->> 'decision' and x.date_decision = (v ->> 'date_decision')::date
    when 'decision_tacite' then x.decision = 'tacite' and x.date_decision = (v ->> 'date_decision')::date
    when 'affichage' then x.date_affichage <= (v ->> 'date_affichage')::date
  end, false)
$function$;

-- Amorcer l'historique des permis qui portent déjà une demande.
UPDATE public.lorani_permis
   SET demandes_pieces = jsonb_build_array(jsonb_build_object('date', date_demande_pieces, 'pieces', pieces_demandees))
 WHERE date_demande_pieces IS NOT NULL AND demandes_pieces = '[]'::jsonb;
