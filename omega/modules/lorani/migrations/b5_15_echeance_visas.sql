-- LORANI, lot B5-15 — la date limite d'un visa devient une échéance du socle, avec ses rappels.
--
-- Pourquoi : b5_13 calcule « à viser avant » (15 jours, CCAG-Travaux art. 29, ou la veille ouvrée de la commande de
-- l'ouvrage) et lève une alerte quand il reste moins de cinq jours, mais rien ne rappelait la date ensuite ni ne
-- signalait le dépassement. Le socle a un registre des délais (public.delais : rappels J-n, dépassement, cron
-- private.controler_delais à la minute 7) ; le calendrier des permis s'en sert déjà (lorani_permis_echeances).
--
-- Ce qui est posé :
--   · public.lorani_visas.delai_id : l'échéance du socle qui porte la date limite.
--   · private.lorani_visa_suivre_delai() (trigger BEFORE, après lorani_visas_preparer par l'ordre alphabétique) :
--     un visa « à viser » pose son échéance par private.poser_delai_date (module lorani, objet lorani_projet, libellé
--     « Visa : <document> (indice X) », source = réception et règle, rappels J-3, J-1, J, responsable = chef de projet,
--     clé lorani:visa:<id>:<date>) ; si la date limite change, l'ancienne échéance est annulée (motif) et une nouvelle
--     posée ; l'avis rendu (vso, vao, ref) tient l'échéance ; un retour à « à viser » en repose une. Un dossier sans
--     territoire connu ne pose pas d'échéance (le socle l'exige) ; un refus du socle ne bloque pas la saisie du visa :
--     il lève une alerte interne avec le motif.
--   · private.abonnements : delai.proche.lorani → lorani.visa.rappel ; delai.depasse.lorani → lorani.visa.depasse
--     (les travaux du calendrier des permis ignorent déjà les délais qui ne sont pas des leurs).
--   · private.lorani_visa_rappeler(travaux) : le délai est-il celui d'un visa encore « à viser » ? Alors alerte
--     « attention » au chef de projet (« à rendre avant le …, dans n jours » ou « en retard depuis le … ») ; sinon le
--     travail est ignoré.
--   · private.lorani_lectures_passage() (corps de b5_14, cron toutes les cinq minutes) prend aussi ces deux genres.
-- Fonctions nouvelles fermées au public. Migration idempotente ; rien n'est retiré (une échéance périmée est annulée
-- avec son motif, comme le fait le calendrier des permis).

ALTER TABLE public.lorani_visas ADD COLUMN IF NOT EXISTS delai_id uuid;

insert into private.abonnements (evenement, module, genre)
select 'delai.proche.lorani', 'lorani', 'lorani.visa.rappel'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.proche.lorani' and a.module = 'lorani' and a.genre = 'lorani.visa.rappel');
insert into private.abonnements (evenement, module, genre)
select 'delai.depasse.lorani', 'lorani', 'lorani.visa.depasse'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.depasse.lorani' and a.module = 'lorani' and a.genre = 'lorani.visa.depasse');

CREATE OR REPLACE FUNCTION private.lorani_visa_suivre_delai()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_ouvert boolean;
  v_date date;
begin
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_date from public.delais d where d.id = new.delai_id;
  begin
    -- L'avis rendu tient l'échéance.
    if new.avis <> 'a_viser' then
      if coalesce(v_ouvert, false) then
        perform private.clore_delai(new.delai_id, 'tenu', null);
      end if;
      return new;
    end if;
    -- À viser : une échéance ouverte à la bonne date, sinon on la remplace.
    if coalesce(v_ouvert, false) and v_date = new.a_viser_avant then
      return new;
    end if;
    if coalesce(v_ouvert, false) then
      perform private.clore_delai(new.delai_id, 'annule',
        left(format('Date limite du visa recalculée : %s au lieu du %s.', to_char(new.a_viser_avant, 'DD/MM/YYYY'), to_char(v_date, 'DD/MM/YYYY')), 300));
    end if;
    select * into pr from public.lorani_projets where id = new.projet_id;
    if pr.territoire is null then
      new.delai_id := null;
      return new;
    end if;
    new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
      left(format('Visa : %s (indice %s)', new.document, new.indice), 200), new.a_viser_avant,
      left(format('Document reçu le %s ; visa en %s jours (CCAG-Travaux, art. 29)%s.', to_char(new.recu_le, 'DD/MM/YYYY'), new.delai_visa_jours,
                  case when new.commande_le is not null then ', au plus tard la veille ouvrée de la commande de l''ouvrage le ' || to_char(new.commande_le, 'DD/MM/YYYY') else '' end), 300),
      pr.territoire, array[3, 1, 0], private.lorani_chef_de_projet(new.client_id, new.projet_id),
      'Rendre l''avis sur le document (visé, visé avec observations, refusé).',
      format('lorani:visa:%s:%s', new.id, new.a_viser_avant));
  exception when others then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('Visa « %s » : l''échéance n''a pas pu être posée au registre des délais (%s).', left(new.document, 60), left(sqlerrm, 100)), 200),
      jsonb_build_object('projet', new.projet_id, 'visa', new.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
      format('visa:%s:delai_refuse', new.id), true, null);
  end;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_visa_suivre_delai() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_visas'::regclass and tgname = 'lorani_visas_suivre_delai') then
    create trigger lorani_visas_suivre_delai before insert or update of avis, recu_le, commande_le, delai_visa_jours on public.lorani_visas
      for each row execute function private.lorani_visa_suivre_delai();
  end if;
end $$;

-- Le rappel et le dépassement d'une échéance de visa.
CREATE OR REPLACE FUNCTION private.lorani_visa_rappeler(t public.travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.lorani_visas;
  pr public.lorani_projets;
  v_echeance date := (t.charge ->> 'echeance')::date;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
begin
  select * into v from public.lorani_visas where delai_id = (t.charge ->> 'delai')::uuid;
  if not found then
    return jsonb_build_object('ignore', 'délai hors des visas');
  end if;
  if v.avis <> 'a_viser' then
    return jsonb_build_object('ignore', 'avis déjà rendu', 'visa', v.id);
  end if;
  select * into pr from public.lorani_projets where id = v.projet_id;
  perform private.lever_alerte_module(v.client_id, 'lorani', 'attention',
    left(case when t.genre = 'lorani.visa.depasse'
      then format('« %s » : visa en retard, %s (indice %s) devait être rendu le %s.', left(pr.nom, 50), left(v.document, 70), v.indice,
                  to_char(coalesce(v_echeance, v.a_viser_avant), 'DD/MM/YYYY'))
      else format('« %s » : visa à rendre avant le %s (%s), %s (indice %s).', left(pr.nom, 50), to_char(coalesce(v_echeance, v.a_viser_avant), 'DD/MM/YYYY'),
                  case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end,
                  left(v.document, 70), v.indice) end, 200),
    jsonb_build_object('projet', v.projet_id, 'visa', v.id, 'delai', v.delai_id, 'echeance', coalesce(v_echeance, v.a_viser_avant),
                       'lien', private.lorani_lien_projet(v.projet_id)),
    case when t.genre = 'lorani.visa.depasse' then format('visa:%s:retard', v.id) else format('visa:%s:rappel:%s', v.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(v.client_id, v.projet_id));
  return jsonb_build_object('visa', v.id, 'genre', t.genre, 'rappel', v_rappel);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_visa_rappeler(public.travaux) FROM PUBLIC;

-- Le passage des lectures (corps de b5_14) prend aussi les rappels et dépassements des visas.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse'],
                                                 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      elsif t.genre in ('lorani.visa.rappel', 'lorani.visa.depasse') then
        v_res := private.lorani_visa_rappeler(t);
      elsif exists (select 1 from public.pieces x where x.id = (t.charge ->> 'piece')::uuid and x.type_piece = 'lorani_situation_travaux') then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences);
end $function$;
