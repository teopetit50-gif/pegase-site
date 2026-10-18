-- b2_08 — La facture part avec son PDF et ses photos datées en pièces jointes (audit des promesses, § 2 Tavaro, point 2 ;
-- session B2, 06/10/2026). Avec l'ouvrier omega/functions/tavaro-pdf (à déployer par le coordinateur) et l'expéditeur
-- d'A2, qui joint déjà au courriel Brevo les pièces d'un envoi (lues dans le bucket omega-clients par leur chemin).
--
-- LE CHEMIN :
--   1. la décision d'une facture est appliquée par le socle (loc_appliquer_decision → loc_emettre_factures →
--      loc_envoyer_factures) ; loc_envoyer_factures, remplacée ici, ne prépare plus le courriel tout de suite si les
--      PDF ne sont pas faits : elle dépose le travail tavaro.pdf_factures et rend « pdf_en_cours » (la demande reste
--      approuvée, rien n'est perdu) ;
--   2. l'ouvrier tavaro-pdf prend le travail, lit la facture par public.loc_pdf_a_produire, compose un PDF par
--      facture, le dépose dans omega-clients/<client>/loc_factures/<facture>/<référence>.pdf, mesure les photos des
--      preuves (taille, SHA-256) et appelle public.loc_enregistrer_pdf : les pièces sont créées (statut « lue » : rien ne
--      part à la lecture IA), la facture porte son pdf_piece_id et son pdf_sha256, et le courriel est préparé avec
--      les pièces jointes (dix au plus, 15 Mo au plus : règles du socle) ;
--   3. si le PDF ne peut pas être fait (dernier essai), l'ouvrier appelle public.loc_pdf_impossible : alerte à l'agence,
--      et le courriel part sans pièce jointe, comme avant b2_08 ;
--   4. filet : si l'ouvrier ne répond pas (pas encore déployé, en panne), private.loc_pdf_en_souffrance (cron tavaro-pdf-filet,
--      toutes les 15 minutes) fait partir sans pièce jointe, au bout de 30 minutes, tout courriel de facture qui attend son PDF.
-- L'attente du PDF ne joue que si un courriel part vraiment : sans réglage d'envoi ou sans adresse, rien ne change.
-- Rien n'est effacé ; aucune contrainte retirée. loc_envoyer_factures garde sa signature (deux arguments).

create table if not exists public.loc_factures_pieces (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  facture_id uuid not null,
  piece_id uuid not null,
  nature text not null,
  rang smallint not null default 1,
  legende text,
  cree_le timestamp with time zone not null default now(),
  constraint loc_factures_pieces_pkey primary key (id),
  constraint loc_factures_pieces_une_fois unique (facture_id, piece_id),
  constraint loc_factures_pieces_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_factures_pieces_facture_fkey foreign key (client_id, facture_id) references public.loc_factures(client_id, id),
  constraint loc_factures_pieces_piece_fkey foreign key (client_id, piece_id) references public.pieces(client_id, id),
  constraint loc_factures_pieces_nature_check check (nature in ('pdf', 'photo')),
  constraint loc_factures_pieces_legende_check check (char_length(legende) <= 300)
);
comment on table public.loc_factures_pieces is 'b2_08 : les pièces jointes d''une facture (son PDF, les photos datées des preuves)';
alter table public.loc_factures_pieces enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_factures_pieces' and policyname = 'on voit les pieces des factures qu''on voit') then
    create policy "on voit les pieces des factures qu'on voit" on public.loc_factures_pieces for select to authenticated
      using (exists (select 1 from public.loc_factures f where f.client_id = loc_factures_pieces.client_id and f.id = loc_factures_pieces.facture_id));
  end if;
end $$;
revoke all on table public.loc_factures_pieces from public, anon, authenticated;
grant select on table public.loc_factures_pieces to authenticated;
grant all on table public.loc_factures_pieces to service_role;

-- L'envoi des factures d'une proposition. p_sans_pdf : le PDF n'a pas pu être fait, le courriel part sans pièce jointe.
CREATE OR REPLACE FUNCTION private.loc_envoyer_factures(p_client uuid, p_proposition uuid, p_sans_pdf boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  c public.loc_contrats;
  l public.loc_locataires;
  f public.loc_factures;
  v_n integer;
  v_refs text;
  v_quoi text;
  v_nom_loueur text;
  v_client_nom text;
  v_pro boolean;
  v_agence text;
  v_restitution text;
  v_sujet text;
  v_corps text;
  v_envoi uuid;
  v_statut text;
  v_verrou text;
  v_erreur text;
  v_pieces uuid[];
  v_photos integer;
begin
  select * into p from public.loc_propositions where client_id = p_client and id = p_proposition;
  if not found or p.statut <> 'facturee' then
    return jsonb_build_object('statut', 'rien');
  end if;
  select count(*)::int, string_agg(x.reference, ' et ' order by x.numero) into v_n, v_refs
  from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id;
  if v_n = 0 then
    return jsonb_build_object('statut', 'rien');
  end if;

  select * into f from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id order by x.numero limit 1;
  select * into c from public.loc_contrats where client_id = p_client and id = p.contrat_id;
  select e.nom into v_agence from public.entites e where e.client_id = p_client and e.id = p.entite_id;
  v_quoi := case when v_n > 1 then 'des factures ' else 'de la facture ' end || v_refs;
  v_nom_loueur := f.emetteur ->> 'nom';
  v_pro := f.destinataire ->> 'type' = 'professionnel';
  v_client_nom := coalesce(f.destinataire ->> 'raison_sociale', f.destinataire ->> 'nom');

  if (private.reglages_envois_effectifs(p_client, 'tavaro') ->> 'mode') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel %s (contrat %s) n''est pas parti : l''envoi par courriel n''est pas réglé pour votre organisation. Envoyez-la vous-même.',
             v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs), 'facture:envoi_non_regle:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_non_regle', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'contrat', c.numero), p.entite_id);
    return jsonb_build_object('statut', 'non_regle');
  end if;

  if c.locataire_id is not null then
    select * into l from public.loc_locataires x where x.client_id = p_client and x.id = c.locataire_id;
  end if;
  if l.id is null or l.anonymise_le is not null or nullif(btrim(l.email), '') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel %s (contrat %s) n''est pas parti : le locataire n''a pas d''adresse de courriel. Envoyez-la vous-même.', v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs), 'facture:sans_adresse:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_sans_adresse', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'contrat', c.numero), p.entite_id);
    return jsonb_build_object('statut', 'sans_adresse');
  end if;

  -- Les PDF : le courriel va partir ; tant qu'une facture n'a pas le sien, l'ouvrier tavaro-pdf est appelé et le courriel
  -- attend (au plus 30 minutes : private.loc_pdf_en_souffrance le fait partir sans pièce jointe ensuite).
  if not coalesce(p_sans_pdf, false)
     and exists (select 1 from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id and x.pdf_piece_id is null) then
    perform private.deposer_travail(p_client, 'tavaro', 'tavaro.pdf_factures', jsonb_build_object('proposition', p.id),
                                    'tavaro:pdf:' || p.id::text, 0::smallint);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_pdf_demande', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs), p.entite_id);
    return jsonb_build_object('statut', 'pdf_en_cours');
  end if;

  -- Les pièces jointes : les PDF d'abord, puis les photos, dix au plus (règle du socle).
  select coalesce(array_agg(z.piece_id order by z.ordre), '{}') into v_pieces from (
    select fp.piece_id, row_number() over (order by case fp.nature when 'pdf' then 0 else 1 end, x.numero, fp.rang) as ordre
    from public.loc_factures_pieces fp join public.loc_factures x on x.id = fp.facture_id
    where x.client_id = p_client and x.proposition_id = p.id
  ) z where z.ordre <= 10;
  if coalesce(p_sans_pdf, false) then
    v_pieces := '{}';
  end if;
  select count(*) into v_photos from public.loc_factures_pieces fp where fp.piece_id = any (v_pieces) and fp.nature = 'photo';

  v_restitution := f.mentions ->> 'restitution';
  v_sujet := format('%s : %s %s — location %s', v_nom_loueur, case when v_n > 1 then 'vos factures' else 'votre facture' end, v_refs, c.numero);
  v_corps := format(E'Bonjour %s,\n\nÀ la suite de la restitution du véhicule de la location %s%s, %s vous adresse %s :\n\n',
                    v_client_nom, c.numero, case when v_restitution is not null then ' le ' || v_restitution else '' end, v_nom_loueur,
                    case when v_n > 1 then 'les factures suivantes' else 'la facture suivante' end);
  for f in select * from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id order by x.numero loop
    v_corps := v_corps || private.loc_texte_facture(f) || E'\n';
  end loop;
  v_corps := v_corps
    || case when cardinality(v_pieces) > 0
            then format(E'%s en pièce%s jointe%s. Les photos datées du départ et du retour et l''état des lieux sont aussi à votre disposition auprès de l''agence %s. Une contestation écrite adressée à l''agence suspend le recouvrement.\n\n',
                        case when v_photos > 0 then format('La facture au format PDF et %s photo%s datée%s', v_photos, case when v_photos > 1 then 's' else '' end, case when v_photos > 1 then 's' else '' end)
                             else 'La facture au format PDF' end,
                        case when cardinality(v_pieces) > 1 then 's' else '' end, case when cardinality(v_pieces) > 1 then 's' else '' end, v_agence)
            else format(E'Les photos datées du départ et du retour et l''état des lieux sont à votre disposition sur simple demande à l''agence %s. Une contestation écrite adressée à l''agence suspend le recouvrement.\n\n', v_agence) end
    || coalesce(f.mentions ->> 'mandat', '') || E'\n'
    || v_nom_loueur
    || case when f.emetteur ->> 'siren' is not null then ' — SIREN ' || (f.emetteur ->> 'siren') else '' end
    || case when f.emetteur ->> 'adresse' is not null then ' — ' || (f.emetteur ->> 'adresse') else '' end || E'\n';

  begin
    v_envoi := private.preparer_envoi(p_client, 'tavaro', 'loc_propositions', p.id::text, 'email',
      jsonb_build_object('adresse', l.email, 'nom', v_client_nom, 'ref', l.id::text, 'professionnel', v_pro, 'langue', 'fr'),
      null, '{}'::jsonb, v_sujet, v_corps, case when cardinality(v_pieces) > 0 then v_pieces end, 'tavaro:facture:' || p.id::text, p.entite_id, true, false,
      null::timestamptz, jsonb_build_object('demande', p.demande_id));
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    update public.demandes_validation set statut = 'echec_execution', motif_echec = v_erreur where id = p.demande_id and statut = 'approuvee';
    perform private.lever_alerte_module(p_client, 'tavaro', 'critique',
      format('Le courriel %s (contrat %s) n''a pas pu être préparé. Envoyez-la vous-même.', v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs, 'erreur', v_erreur), 'facture:envoi_echec:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_echec', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'erreur', v_erreur), p.entite_id);
    return jsonb_build_object('statut', 'echec', 'erreur', v_erreur);
  end;

  update public.loc_factures set envoi_id = v_envoi where client_id = p_client and proposition_id = p.id and envoi_id is null;
  select e.statut, e.verrou into v_statut, v_verrou from public.envois e where e.id = v_envoi;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_prepare', 'loc_propositions', p.id::text,
    jsonb_build_object('envoi', v_envoi, 'statut', v_statut, 'verrou', v_verrou, 'factures', v_refs, 'demande', p.demande_id, 'contrat', c.numero,
                       'pieces_jointes', cardinality(v_pieces), 'photos', v_photos), p.entite_id);
  return jsonb_build_object('statut', 'prepare', 'envoi', v_envoi, 'envoi_statut', v_statut, 'verrou', v_verrou, 'pieces_jointes', cardinality(v_pieces));
end $function$;

-- La signature du socle, gardée : ses appelants (loc_appliquer_decision…) passent par ici.
CREATE OR REPLACE FUNCTION private.loc_envoyer_factures(p_client uuid, p_proposition uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.loc_envoyer_factures(p_client, p_proposition, false)
$function$;

-- Une fois le courriel en route (ou impossible : rien, non réglé, sans adresse), la demande est exécutée — comme le
-- fait loc_appliquer_decision quand l'envoi est préparé dans la foulée de la décision.
CREATE OR REPLACE FUNCTION private.loc_suite_envoi(p_proposition uuid, p_envoi jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_envoi ->> 'statut' in ('rien', 'non_regle', 'sans_adresse') then
    update public.demandes_validation d set statut = 'executee', motif_echec = null
     where d.id = (select p.demande_id from public.loc_propositions p where p.id = p_proposition) and d.statut in ('approuvee', 'echec_execution');
  end if;
  return p_envoi;
end $function$;

-- ── Les portes de l'ouvrier tavaro-pdf (service_role seul) ─────────────────────────────────

-- Ce qu'il faut pour composer les PDF : les factures de la proposition, leurs lignes, et les photos datées des preuves.
CREATE OR REPLACE FUNCTION public.loc_pdf_a_produire(p_proposition uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'proposition', p.id, 'client', p.client_id, 'contrat', c.numero, 'statut', p.statut,
    'factures', coalesce((select jsonb_agg(jsonb_build_object(
        'id', f.id, 'reference', f.reference, 'nature', f.nature, 'date_facture', f.date_facture, 'echeance_le', f.echeance_le,
        'a_debiter_avant', f.a_debiter_avant, 'emetteur', f.emetteur, 'destinataire', f.destinataire, 'mentions', f.mentions,
        'total_ht', f.total_ht, 'total_tva', f.total_tva, 'total_ttc', f.total_ttc, 'pdf_fait', f.pdf_piece_id is not null,
        'lignes', coalesce((select jsonb_agg(jsonb_build_object('rang', li.rang, 'libelle', li.libelle, 'quantite', li.quantite, 'unite', li.unite,
                                                                'prix_unitaire', li.prix_unitaire, 'montant_ht', li.montant_ht, 'regime_tva', li.regime_tva,
                                                                'taux_tva', li.taux_tva, 'montant_tva', li.montant_tva, 'montant_ttc', li.montant_ttc) order by li.rang)
                            from public.loc_facture_lignes li where li.facture_id = f.id), '[]'::jsonb),
        'photos', coalesce((select jsonb_agg(distinct jsonb_strip_nulls(jsonb_build_object('chemin', pr ->> 'chemin', 'prise_le', pr ->> 'prise_le',
                                                                                          'legende', li.libelle)))
                            from public.loc_facture_lignes li, jsonb_array_elements(li.preuves) pr
                            where li.facture_id = f.id and nullif(pr ->> 'chemin', '') is not null), '[]'::jsonb)
      ) order by f.numero) from public.loc_factures f where f.client_id = p.client_id and f.proposition_id = p.id), '[]'::jsonb))
  from public.loc_propositions p join public.loc_contrats c on c.client_id = p.client_id and c.id = p.contrat_id
  where p.id = p_proposition
$function$;

-- Les pièces produites (PDF, photos mesurées) sont enregistrées, puis le courriel part avec elles.
-- p_pieces : [{facture, nature: pdf|photo, chemin, nom, mime, octets, sha256, legende}]
CREATE OR REPLACE FUNCTION public.loc_enregistrer_pdf(p_proposition uuid, p_pieces jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  x jsonb;
  f public.loc_factures;
  v_piece uuid;
  v_rang integer := 0;
  v_n integer := 0;
begin
  select * into p from public.loc_propositions where id = p_proposition for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_pieces) is distinct from 'array' then
    raise exception 'Les pièces forment un tableau.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_pieces) loop
    select * into f from public.loc_factures where client_id = p.client_id and id = (x ->> 'facture')::uuid and proposition_id = p.id;
    if not found then
      raise exception 'Facture % étrangère à cette proposition.', x ->> 'facture' using errcode = '22023';
    end if;
    if x ->> 'nature' not in ('pdf', 'photo') or nullif(x ->> 'chemin', '') is null or (x ->> 'sha256') !~ '^[0-9a-f]{64}$'
       or nullif(x ->> 'nom', '') is null or nullif(x ->> 'mime', '') is null or coalesce((x ->> 'octets')::bigint, -1) < 0 then
      raise exception 'Pièce illisible : nature, chemin, nom, type, taille et SHA-256 sont obligatoires.' using errcode = '22023';
    end if;
    if x ->> 'chemin' not like p.client_id::text || '/%' then
      raise exception 'Une pièce de ce loueur est rangée sous son dossier.' using errcode = '42501';
    end if;
    insert into public.pieces (client_id, module, objet_type, objet_id, source, nom_fichier, mime, octets, sha256, chemin, statut, type_piece, motif)
    values (p.client_id, 'tavaro', 'loc_factures', f.id::text, 'api', left(x ->> 'nom', 255), left(x ->> 'mime', 120), (x ->> 'octets')::bigint,
            x ->> 'sha256', left(x ->> 'chemin', 1024), 'lue', case x ->> 'nature' when 'pdf' then 'facture_pdf' else 'photo_preuve' end,
            'Produite par Tavaro pour l''envoi de la facture ' || f.reference)
    on conflict on constraint pieces_une_fois do nothing
    returning id into v_piece;
    if v_piece is null then
      select pc.id into v_piece from public.pieces pc
      where pc.client_id = p.client_id and pc.module = 'tavaro' and pc.objet_type = 'loc_factures' and pc.objet_id = f.id::text and pc.sha256 = x ->> 'sha256';
    end if;
    v_rang := v_rang + 1;
    insert into public.loc_factures_pieces (client_id, facture_id, piece_id, nature, rang, legende)
    values (p.client_id, f.id, v_piece, x ->> 'nature', v_rang, left(x ->> 'legende', 300))
    on conflict on constraint loc_factures_pieces_une_fois do nothing;
    if x ->> 'nature' = 'pdf' then
      update public.loc_factures set pdf_piece_id = v_piece, pdf_sha256 = x ->> 'sha256' where id = f.id and pdf_piece_id is null;
    end if;
    v_n := v_n + 1;
  end loop;
  perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.facture_pdf_produit', 'loc_propositions', p.id::text,
    jsonb_build_object('pieces', v_n), p.entite_id);
  if exists (select 1 from public.loc_factures x where x.client_id = p.client_id and x.proposition_id = p.id and x.pdf_piece_id is null) then
    raise exception 'Une facture de cette proposition n''a pas encore son PDF.' using errcode = '55000';
  end if;
  return private.loc_suite_envoi(p.id, private.loc_envoyer_factures(p.client_id, p.id, false)) || jsonb_build_object('pieces_enregistrees', v_n);
end $function$;

-- Le PDF n'a pas pu être fait : l'agence est prévenue, le courriel part sans pièce jointe (comme avant b2_08).
CREATE OR REPLACE FUNCTION public.loc_pdf_impossible(p_proposition uuid, p_erreur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
begin
  select * into p from public.loc_propositions where id = p_proposition;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  perform private.lever_alerte_module(p.client_id, 'tavaro', 'attention',
    'Le PDF d''une facture n''a pas pu être produit : le courriel part sans pièce jointe. Les photos restent disponibles dans le dossier du contrat.',
    jsonb_build_object('proposition', p.id, 'erreur', left(p_erreur, 300)), 'facture:pdf_impossible:' || p.id::text, true, null);
  perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.facture_pdf_impossible', 'loc_propositions', p.id::text,
    jsonb_build_object('erreur', left(p_erreur, 300)), p.entite_id);
  return private.loc_suite_envoi(p.id, private.loc_envoyer_factures(p.client_id, p.id, true));
end $function$;

-- Le filet : un courriel de facture qui attend son PDF depuis plus de 30 minutes part sans pièce jointe.
CREATE OR REPLACE FUNCTION private.loc_pdf_en_souffrance(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select distinct f.proposition_id
    from public.loc_factures f join public.loc_propositions p on p.id = f.proposition_id and p.statut = 'facturee'
    where f.envoi_id is null and f.pdf_piece_id is null and f.statut = 'emise' and f.emise_le < p_maintenant - interval '30 minutes'
      and exists (select 1 from public.travaux t where t.client_id = f.client_id and t.genre = 'tavaro.pdf_factures'
                  and t.cle = 'tavaro:pdf:' || f.proposition_id::text and t.etat <> 'fait')
  loop
    begin
      perform public.loc_pdf_impossible(r.proposition_id, 'L''ouvrier tavaro-pdf n''a pas répondu en 30 minutes.');
      n := n + 1;
    exception when others then
      raise warning 'loc_pdf_en_souffrance %: %', r.proposition_id, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-pdf-filet') then
    perform cron.schedule('tavaro-pdf-filet', '*/15 * * * *', 'select private.loc_pdf_en_souffrance()');
  end if;
end $$;

revoke all on function private.loc_pdf_en_souffrance(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_pdf_en_souffrance(timestamp with time zone) to service_role;
revoke all on function private.loc_envoyer_factures(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function private.loc_envoyer_factures(uuid, uuid) from public, anon, authenticated;
revoke all on function private.loc_suite_envoi(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_pdf_a_produire(uuid) from public, anon, authenticated;
revoke all on function public.loc_enregistrer_pdf(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_pdf_impossible(uuid, text) from public, anon, authenticated;
grant execute on function public.loc_pdf_a_produire(uuid) to service_role;
grant execute on function public.loc_enregistrer_pdf(uuid, jsonb) to service_role;
grant execute on function public.loc_pdf_impossible(uuid, text) to service_role;
