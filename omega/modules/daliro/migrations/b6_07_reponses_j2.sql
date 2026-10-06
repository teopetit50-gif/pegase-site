-- b6_07 — DALIRO : la réponse OUI / NON du sous-traitant est lue, et l'écran voit la demande partie (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE.
--   1. La demande J-2 part (b6_06), mais la réponse du sous-traitant arrive dans public.receptions et rien
--      ne la porte au passage : le bureau devait la noter à la main.
--   2. Le tableau du chantier ne dit pas si la demande est partie ni si elle a été remise.
--
-- CE QUI EST POSÉ.
--   · private.abonnements : reception.nouvelle → travail daliro.reception (module daliro).
--   · private.btp_lire_oui_non(texte) : lecture STRICTE de la première ligne écrite (avant la citation) :
--     « oui », « ok », « je confirme »… → confirmee ; « non », « je ne peux pas »… → declinee ; tout le
--     reste (« oui mais pas jeudi », une question, un long message) → null.
--   · private.btp_lire_reponse(p_reception) : une réception qui répond (en_reponse_a) à un envoi daliro:j2:
--     d'un passage. Lue OUI / NON → private.btp_repondre_confirmation(passage, réponse, 'reception:<id>')
--     (idempotente sur la clé), réception passée « traitee ». Illisible, venue d'une autre adresse qu'un
--     envoi réel, ou refusée par la porte → RIEN n'est noté, une alerte part au conducteur du chantier.
--     Une réception qui ne répond pas à une demande J-2 est ignorée.
--   · private.btp_ouvrier : prend aussi daliro.reception (la demande J-2 passe par private.btp_envoyer_demande,
--     même code que b6_06).
--   · public.btp_tableau_chantier : chaque passage porte « envoi » (la dernière demande J-2 : canal, mode,
--     statut, envoyée le, remise), lu sous la RLS du lecteur.
--
-- Règles de pose : create or replace / where not exists ; rien n'est retiré ni effacé.

insert into private.abonnements (evenement, module, genre)
select 'reception.nouvelle', 'daliro', 'daliro.reception'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'reception.nouvelle' and a.module = 'daliro' and a.genre = 'daliro.reception');

-- ─────────────────────────────────────────────────────────────────────────
-- La lecture stricte d'une réponse
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_lire_oui_non(p_texte text)
 returns text
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  l text;
  v text;
  p text;
  w1 text;
begin
  for l in select x from regexp_split_to_table(coalesce(p_texte, ''), E'\r?\n') x loop
    continue when btrim(l) = '';
    exit when l ~ '^\s*>';   -- le message cité : la réponse est au-dessus, ou il n'y en a pas
    v := l;
    exit;
  end loop;
  if v is null then
    return null;
  end if;
  v := lower(v);
  v := regexp_replace(v, '[^[:alpha:][:space:]]', ' ', 'g');   -- ponctuation, apostrophes, émojis
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  if v = '' or char_length(v) > 60 then
    return null;   -- trop long pour une lecture stricte : le bureau lit lui-même
  end if;
  -- « pas de souci », « sans problème » confirment : on les retire avant de chercher une négation
  p := ' ' || btrim(regexp_replace(v, '(pas de (souci|soucis|probleme|problème|pb)|sans (souci|probleme|problème))', ' ', 'g')) || ' ';
  w1 := split_part(v, ' ', 1);
  if (w1 in ('oui', 'ok', 'okay', 'confirme', 'confirmé')
      or v in ('je confirme', 'c est bon', 'c est ok', 'd accord', 'entendu', 'bien reçu', 'bien recu', 'parfait', 'top'))
     and p !~ ' (non|pas|mais|impossible|annul[a-zé]*|empech[a-zé]*|empêch[a-zé]*|retard[a-zé]*|decal[a-zé]*|décal[a-zé]*|report[a-zé]*|plutot|plutôt|sauf|quelle|quand|ou) ' then
    return 'confirmee';
  end if;
  if (w1 = 'non' and p !~ ' (oui|ok|bon|confirm[a-zé]*|viens|viendrai|serai|sera) ')
     or v ~ '^(je ne (peux|pourrai|viendrai|viens|serai) pas|impossible|pas possible|pas dispo|pas disponible|je ne suis pas disponible)( |$)' then
    return 'declinee';
  end if;
  return null;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Une réception qui répond à une demande J-2
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_lire_reponse(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  e public.envois;
  p public.btp_passages;
  c public.btp_chantiers;
  v_tiers text;
  v_texte text;
  v_rep text;
  v_meme boolean;
  v_ligne text;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception absente');
  end if;
  if r.en_reponse_a is null then
    return jsonb_build_object('ignore', 'ne répond à aucun envoi');
  end if;
  select * into e from public.envois x
  where x.id = r.en_reponse_a and x.client_id = r.client_id and x.module = 'daliro'
    and x.objet_type = 'btp_passages' and x.cle_idempotence like 'daliro:j2:%';
  if not found then
    return jsonb_build_object('ignore', 'ne répond pas à une demande de confirmation J-2');
  end if;
  select * into p from public.btp_passages where client_id = r.client_id and id = e.objet_id::uuid;
  if not found then
    return jsonb_build_object('ignore', 'passage absent');
  end if;
  select * into c from public.btp_chantiers where id = p.chantier_id;
  select t.nom into v_tiers from public.btp_tiers t where t.id = p.tiers_id;

  v_texte := coalesce(nullif(btrim(r.corps), ''),
                      regexp_replace(regexp_replace(coalesce(r.corps_html, ''), '<(br|/p|/div)[^>]*>', E'\n', 'gi'), '<[^>]+>', ' ', 'g'));
  v_ligne := left((select btrim(x) from regexp_split_to_table(coalesce(v_texte, ''), E'\r?\n') x where btrim(x) <> '' limit 1), 200);

  -- En réel, la réponse vient de l'adresse à laquelle on a écrit (téléphone : les neuf derniers chiffres).
  v_meme := e.mode = 'essai'
    or (e.canal = 'email' and lower(btrim(r.de_adresse)) = lower(btrim(e.destinataire_adresse)))
    or (e.canal in ('whatsapp', 'sms') and right(regexp_replace(coalesce(r.de_adresse, ''), '\D', '', 'g'), 9)
                                           = right(regexp_replace(coalesce(e.destinataire_adresse, ''), '\D', '', 'g'), 9)
        and char_length(regexp_replace(coalesce(r.de_adresse, ''), '\D', '', 'g')) >= 9);
  if not v_meme then
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('Réponse à vérifier : le passage du %s sur %s a reçu une réponse d''une autre adresse que %s',
                  to_char(p.debut, 'DD/MM'), c.nom, coalesce(v_tiers, 'celle du sous-traitant')), 150),
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'reception', r.id, 'envoi', e.id, 'texte', v_ligne),
      'reponse_a_verifier:' || r.id::text, true, c.conducteur_id);
    return jsonb_build_object('statut', 'a_verifier', 'motif', 'autre_adresse', 'passage', p.id);
  end if;

  v_rep := private.btp_lire_oui_non(v_texte);
  if v_rep is null then
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('%s a répondu sur son passage du %s (%s) : à lire', coalesce(v_tiers, 'Le sous-traitant'),
                  to_char(p.debut, 'DD/MM'), c.nom), 150),
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'reception', r.id, 'envoi', e.id, 'texte', v_ligne),
      'reponse_a_lire:' || r.id::text, true, c.conducteur_id);
    return jsonb_build_object('statut', 'a_lire', 'passage', p.id);
  end if;

  begin
    perform private.btp_repondre_confirmation(p.id, v_rep, 'reception:' || r.id::text,
      jsonb_build_object('canal', case when r.canal in ('whatsapp', 'sms', 'email') then r.canal end,
                         'reception', r.id, 'envoi', e.id, 'texte', v_ligne, 'lu', 'automatique'));
  exception when others then
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('La réponse de %s sur son passage du %s (%s) n''a pas pu être notée', coalesce(v_tiers, 'du sous-traitant'),
                  to_char(p.debut, 'DD/MM'), c.nom), 150),
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'reception', r.id, 'reponse', v_rep,
                         'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
      'reponse_refusee:' || r.id::text, true, c.conducteur_id);
    return jsonb_build_object('statut', 'refusee', 'reponse', v_rep, 'erreur', left(sqlerrm, 300), 'passage', p.id);
  end;

  begin
    update public.receptions set statut = 'traitee' where id = r.id and statut in ('nouvelle', 'lue');
  exception when others then
    raise notice 'réception % : statut non changé (%)', r.id, sqlerrm;
  end;
  return jsonb_build_object('statut', 'notee', 'reponse', v_rep, 'passage', p.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La demande J-2 d'un travail (le corps de l'ouvrier de b6_06, sorti en fonction)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_envoyer_demande(t public.travaux)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_canal text := t.charge ->> 'canal';
  v_adresse text;
  v_texte jsonb;
  v_envoi uuid;
  v_passage public.btp_passages;
begin
  select * into v_passage from public.btp_passages p
  where p.client_id = t.client_id and p.id = (t.charge ->> 'passage')::uuid;
  if v_passage.id is null or v_passage.statut <> 'prevu' or v_passage.confirmation <> 'demandee' then
    return jsonb_build_object('ignore', 'passage absent, plus prévu ou plus en attente de réponse');
  end if;
  if v_canal is null or v_canal not in ('email', 'whatsapp', 'sms') then
    return jsonb_build_object('ignore', format('canal %s : le bureau appelle lui-même', coalesce(v_canal, 'vide')));
  end if;
  v_adresse := case when v_canal = 'email' then t.charge ->> 'email' else t.charge ->> 'telephone' end;
  v_texte := private.btp_texte_confirmation(t.client_id, t.charge);
  v_envoi := private.preparer_envoi(t.client_id, 'daliro', 'btp_passages', v_passage.id::text, v_canal,
    jsonb_build_object('adresse', v_adresse, 'nom', t.charge ->> 'tiers_nom', 'ref', t.charge ->> 'tiers',
                       'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb,
    case when v_canal = 'email' then v_texte ->> 'sujet' end,
    case when v_canal = 'email' then v_texte ->> 'corps' else (v_texte ->> 'sujet') || E'\n\n' || (v_texte ->> 'corps') end,
    null::uuid[], 'daliro:j2:' || v_passage.id::text || ':v' || coalesce(t.charge ->> 'version', v_passage.version::text),
    v_passage.entite_id, true, false, null::timestamptz, '{}'::jsonb);
  perform private.journaliser(t.client_id, 'daliro.confirmation_envoyee', 'btp_passages', v_passage.id::text,
    jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'tiers', t.charge ->> 'tiers', 'debut', t.charge ->> 'debut'),
    v_passage.entite_id);
  return jsonb_build_object('envoi', v_envoi, 'canal', v_canal,
    'statut', (select e.statut from public.envois e where e.id = v_envoi),
    'verrou', (select e.verrou from public.envois e where e.id = v_envoi));
end $function$;

-- L'ouvrier de base : les demandes J-2 et les réponses reçues.
create or replace function private.btp_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_res jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['daliro.confirmation', 'daliro.reception'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      v_res := case t.genre
        when 'daliro.confirmation' then private.btp_envoyer_demande(t)
        when 'daliro.reception' then
          case when (t.charge ->> 'reception') ~ '^[0-9]+$' and t.charge ->> 'en_reponse_a' is not null
               then private.btp_lire_reponse((t.charge ->> 'reception')::bigint)
               else jsonb_build_object('ignore', 'ne répond à aucun envoi') end
      end;
      perform private.finir_travail(t.id, v_res);
      if v_res ? 'ignore' then v_ignores := v_ignores + 1; else v_faits := v_faits + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('daliro', array['daliro.confirmation', 'daliro.reception'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le tableau du chantier : b6_04, plus « envoi » sur chaque passage
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.id), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id),
        -- b6_07 : la dernière demande J-2 partie pour ce passage (envois du socle, sous la RLS du lecteur)
        'envoi', (select jsonb_build_object('id', e.id, 'canal', e.canal, 'mode', e.mode, 'statut', e.statut, 'verrou', e.verrou,
                                            'cree_le', e.cree_le, 'envoye_le', e.envoye_le, 'remise', e.remise, 'remise_le', e.remise_le)
                  from public.envois e
                  where e.client_id = p.client_id and e.module = 'daliro' and e.objet_type = 'btp_passages' and e.objet_id = p.id::text
                  order by e.cree_le desc limit 1))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;
revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : le serveur seul sur tout ce qui est neuf.
revoke execute on function private.btp_lire_oui_non(text) from public, anon, authenticated;
revoke execute on function private.btp_lire_reponse(bigint) from public, anon, authenticated;
revoke execute on function private.btp_envoyer_demande(public.travaux) from public, anon, authenticated;
revoke execute on function private.btp_ouvrier(integer) from public, anon, authenticated;
grant execute on function private.btp_lire_oui_non(text) to service_role;
grant execute on function private.btp_lire_reponse(bigint) to service_role;
grant execute on function private.btp_envoyer_demande(public.travaux) to service_role;
grant execute on function private.btp_ouvrier(integer) to service_role;
