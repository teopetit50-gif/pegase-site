-- FILED, lot 12 (a4_20) — un courriel reçu dans la boîte FILED du client devient un document FILED.
--
-- Audit des promesses (omega/AUDIT-PROMESSES.md, § 2 FILED, n° 1) : la réception (A2, public.deposer_reception) range
-- le courriel dans public.receptions, ses pièces jointes dans le bucket sous <client>/receptions/<identifiant>/<nom>,
-- et publie reception.nouvelle ; personne côté FILED ne l'écoutait. Ce lot pose :
--   · private.abonnements : reception.nouvelle → travail filed.reception (module filed) ;
--   · private.filed_rattacher_reception(bigint) → jsonb : pour une réception d'une boîte FILED (receptions.module =
--     'filed') chez une organisation où FILED est installé, chaque pièce jointe lisible (PDF, PNG, JPEG, TIFF, WebP,
--     HEIC, XML Factur-X / UBL / CII) devient un document FILED, comme un dépôt : numéro de réception, doublon reconnu
--     à l'empreinte, source « courriel », expéditeur. La pièce reste où la réception l'a mise (son chemin commence par
--     le client) ; le socle dépose ensuite lui-même la lecture (pieces_demander_lecture). Idempotent : une pièce jointe
--     déjà rangée (même chemin) ne l'est pas deux fois. Un courriel sans pièce lisible lève une alerte « à lire » ; la
--     réception passe « traitee » quand au moins une pièce est rangée. Les réceptions des autres modules sont ignorées.
--   · private.filed_traiter (texte d'a4_08) : prend aussi filed.reception.
-- Pourquoi pas private.filed_deposer_piece : elle exige un fichier rangé sous <client>/filed_document/<document>/…, ce
-- qu'aucune copie en SQL ne peut faire ; le dépôt est donc refait ici à l'identique, ce chemin excepté.
-- Migration idempotente (where not exists, create or replace) ; aucune suppression.

insert into private.abonnements (evenement, module, genre)
select 'reception.nouvelle', 'filed', 'filed.reception'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'reception.nouvelle' and a.module = 'filed' and a.genre = 'filed.reception');

create or replace function private.filed_rattacher_reception(p_reception bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.receptions; v_entite uuid; v_fuseau text; v_annee smallint; v_numero integer; e jsonb; v_nom text; v_mime text;
  v_sha text; v_doc uuid; v_piece uuid; v_original public.filed_documents; v_docs jsonb := '[]'::jsonb; n_lisibles integer := 0;
  n_ignorees integer := 0; v_ref text; v_ext text;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then return jsonb_build_object('ignore', 'réception absente'); end if;
  if r.module is distinct from 'filed' then return jsonb_build_object('ignore', 'réception d''un autre module'); end if;
  if not exists (select 1 from public.filed_reglages g where g.client_id = r.client_id and g.entite_id is null and g.actif) then
    return jsonb_build_object('ignore', 'FILED n''est pas installé pour cette organisation');
  end if;
  select x.id, x.fuseau into v_entite, v_fuseau from public.entites x
   where x.client_id = r.client_id and (case when r.entite_id is null then x.principale else x.id = r.entite_id end);
  if v_entite is null then return jsonb_build_object('ignore', 'société introuvable'); end if;

  for e in select * from jsonb_array_elements(case when jsonb_typeof(r.pieces) = 'array' then r.pieces else '[]'::jsonb end) loop
    v_nom := left(coalesce(nullif(btrim(e ->> 'nom'), ''), regexp_replace(coalesce(e ->> 'chemin', ''), '^.*/', '')), 200);
    v_mime := lower(coalesce(e ->> 'mime', ''));
    if v_mime in ('', 'application/octet-stream') then
      v_ext := lower(substring(v_nom from '[.]([A-Za-z0-9]+)$'));
      v_mime := case v_ext when 'pdf' then 'application/pdf' when 'png' then 'image/png' when 'jpg' then 'image/jpeg'
                           when 'jpeg' then 'image/jpeg' when 'tif' then 'image/tiff' when 'tiff' then 'image/tiff'
                           when 'webp' then 'image/webp' when 'heic' then 'image/heic' when 'xml' then 'application/xml'
                           else v_mime end;
    end if;
    if coalesce(e ->> 'chemin', '') = '' or not starts_with(e ->> 'chemin', r.client_id::text || '/')
       or v_mime not in ('application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp', 'image/heic', 'application/xml', 'text/xml') then
      n_ignorees := n_ignorees + 1;
      continue;
    end if;
    n_lisibles := n_lisibles + 1;
    -- Déjà rangée : rien de plus.
    if exists (select 1 from public.pieces p where p.client_id = r.client_id and p.module = 'filed' and p.chemin = e ->> 'chemin') then
      continue;
    end if;
    v_sha := lower(coalesce(nullif(e ->> 'sha256', ''), encode(sha256(convert_to(e ->> 'chemin', 'UTF8')), 'hex')));
    v_doc := gen_random_uuid();
    v_annee := extract(year from now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::smallint;
    v_numero := private.filed_prochain_numero(r.client_id, 'reception', v_annee);
    v_original := null;
    select d.* into v_original from public.filed_documents d
     where d.client_id = r.client_id and d.sha256 = v_sha and d.etat <> 'doublon'
     order by d.recu_le, d.numero_reception limit 1;
    insert into public.pieces (client_id, module, objet_type, objet_id, source, expediteur, depose_par,
                               nom_fichier, mime, octets, sha256, chemin, statut)
    values (r.client_id, 'filed', 'filed_document', v_doc::text, 'courriel', left(r.de_adresse, 320), null,
            v_nom, v_mime, greatest(coalesce((e ->> 'taille')::bigint, 0), 0), v_sha, e ->> 'chemin', 'recue')
    returning id into v_piece;
    insert into public.filed_documents (id, client_id, entite_id, annee_reception, numero_reception, piece_id, source,
                                        expediteur, depose_par, nom_fichier, sha256, etat, doublon_de, motif, traite_le, recu_le)
    values (v_doc, r.client_id, v_entite, v_annee, v_numero, v_piece, 'courriel', left(r.de_adresse, 320), null, v_nom, v_sha,
            case when v_original.id is null then 'en_lecture' else 'doublon' end, v_original.id,
            case when v_original.id is null then null
                 else left(format('Même fichier que la pièce %s, reçue le %s : écartée, elle reste consultable.',
                                  v_original.reference, to_char(v_original.recu_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY')), 500) end,
            case when v_original.id is null then null else now() end, r.recu_le);
    select d.reference into v_ref from public.filed_documents d where d.id = v_doc;
    perform private.filed_historiser(r.client_id, v_doc, 'filed_document', v_doc::text, 'recu',
      format('Pièce reçue (e-mail de %s%s), enregistrée sous le numéro %s.', coalesce(r.de_adresse, 'expéditeur inconnu'),
             coalesce(' : « ' || left(nullif(btrim(r.sujet), ''), 80) || ' »', ''), v_ref),
      jsonb_build_object('reference', v_ref, 'source', 'courriel', 'reception', r.id));
    if v_original.id is not null then
      perform private.filed_historiser(r.client_id, v_doc, 'filed_document', v_doc::text, 'doublon',
        format('Même fichier que la pièce %s : écartée, elle reste consultable.', v_original.reference),
        jsonb_build_object('doublon_de', v_original.id, 'reference_originale', v_original.reference));
    end if;
    v_docs := v_docs || jsonb_build_object('document', v_doc, 'reference', v_ref, 'nom', v_nom);
  end loop;

  if n_lisibles = 0 then
    perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
      left(format('Courriel de %s sans pièce jointe lisible, à lire : « %s ».', coalesce(r.de_adresse, 'expéditeur inconnu'),
                  left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 80)), 200),
      jsonb_build_object('reception', r.id, 'de', r.de_adresse, 'pieces_ignorees', n_ignorees), 'filed_courriel:' || r.id, true, null);
  elsif r.statut = 'nouvelle' then
    update public.receptions set statut = 'traitee', maj_le = now() where id = r.id and statut = 'nouvelle';
  end if;
  return jsonb_build_object('reception', r.id, 'documents', v_docs, 'lisibles', n_lisibles, 'ignorees', n_ignorees);
end $$;
comment on function private.filed_rattacher_reception(bigint) is
  'Lot 12 (a4_20) : les pièces jointes lisibles d''un courriel reçu dans une boîte FILED deviennent des documents FILED (source courriel), lus ensuite par le lecteur ; idempotent sur le chemin.';
revoke all on function private.filed_rattacher_reception(bigint) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- filed_traiter (texte d'a4_08) + le genre filed.reception
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.filed_traiter(p_nombre integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_issue text;
  v_err text;
  n_faits integer := 0;
  n_decisions integer := 0;
  n_ignores integer := 0;
  n_rendus integer := 0;
  n_balayes integer := 0;
  n_battements integer := 0;
  v_lot4 jsonb := '{}'::jsonb;
begin
  perform set_config('omega.module', 'filed', true);

  for t in select * from private.prendre_travaux(array['filed.integrer', 'filed.decision', 'filed.reception'],
                                                  greatest(1, least(coalesce(p_nombre, 200), 500)),
                                                  interval '5 minutes', 'filed')
  loop
    begin
      if t.genre = 'filed.decision' then
        v_issue := private.filed_executer_decision(t.charge);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_decisions := n_decisions + 1;
      -- Lot 12 (A4) : un courriel reçu dans une boîte FILED devient un ou plusieurs documents.
      elsif t.genre = 'filed.reception' then
        perform private.finir_travail(t.id, private.filed_rattacher_reception(nullif(t.charge ->> 'reception', '')::bigint));
        n_faits := n_faits + 1;
      elsif coalesce(t.charge ->> 'module', 'filed') <> 'filed' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'pièce d''un autre module'));
        n_ignores := n_ignores + 1;
      elsif coalesce(t.charge ->> 'piece', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'travail sans pièce'));
        n_ignores := n_ignores + 1;
      else
        v_issue := private.filed_integrer_piece((t.charge ->> 'piece')::uuid);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_faits := n_faits + 1;
      end if;
    exception when others then
      get stacked diagnostics v_err = message_text;
      begin
        perform private.echouer_travail(t.id, 'FILED : ' || v_err);
      exception when others then
        raise warning 'FILED : travail % non rendu (%)', t.id, sqlerrm;
      end;
      n_rendus := n_rendus + 1;
    end;
  end loop;

  -- Les pièces au bout de leur lecture que l'événement n'a pas apportées, et
  -- les factures et avoirs reçus avant le moteur des factures.
  for r in
    select d.piece_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
    where (d.etat = 'en_lecture' and p.statut in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'))
       or (d.etat = 'a_traiter' and d.nature in ('facture', 'avoir')
           and not exists (select 1 from public.filed_factures f where f.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_commande'
           and not exists (select 1 from public.filed_commandes c where c.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_livraison'
           and not exists (select 1 from public.filed_receptions rc where rc.document_id = d.id))
    order by d.recu_le
    limit 500
  loop
    begin
      perform private.filed_integrer_piece(r.piece_id);
      n_balayes := n_balayes + 1;
    exception when others then
      raise warning 'FILED : pièce % non intégrée (%)', r.piece_id, sqlerrm;
    end;
  end loop;

  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.
  for r in
    select g.client_id, m.moteur from public.filed_reglages g
    cross join (values ('filed_reception'), ('filed_factures')) as m(moteur)
    left join public.battements b on b.client_id = g.client_id and b.module = m.moteur
    where g.entite_id is null and g.actif and (b.dernier_le is null or b.dernier_le < now() - interval '5 minutes')
  loop
    perform private.battre(r.client_id, r.moteur, jsonb_build_object('source', 'omega-filed'), null);
    n_battements := n_battements + 1;
  end loop;

  -- Lot 4 (A4) : charges récurrentes, relances et remontées de validation, exports à date fixe, mesures du jour.
  begin
    v_lot4 := private.filed_balayer_lot4();
  exception when others then
    raise warning 'FILED : balayage du lot 4 interrompu (%)', sqlerrm;
    v_lot4 := jsonb_build_object('erreur', sqlerrm);
  end;

  return jsonb_build_object('travaux', n_faits, 'decisions', n_decisions, 'ignores', n_ignores, 'rendus', n_rendus,
                            'balayes', n_balayes, 'battements', n_battements, 'lot4', v_lot4);
end $function$;
