-- 20261011142324 b6_27_fonctions_formule
-- Source : dépôt : 52e9cff omega/modules/daliro/migrations/b6_27_fonctions_formule.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_27_fonctions_formule.sql @ 52e9cff ; b6_23 cité comme test : ignoré ; b6_17 cité comme test : ignoré ; b6_21 cité comme test : ignoré.
-- ═══ omega/modules/daliro/migrations/b6_27_fonctions_formule.sql @ 52e9cff
-- b6_27 — DALIRO : les fonctions ouvertes selon la formule (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp, tableau des formules) : Démarrage, Chantiers, Entreprise n'ouvrent pas les mêmes
-- fonctions. Le socle les liste (public.btp_fonctions_de) mais seule la météo les consultait (b6_21) : un client
-- Démarrage pouvait recaler ses lots, préparer une liste cadencée, rapprocher ses bons de livraison.
--
-- CE QUI EST POSÉ.
--   · private.btp_exiger_fonction(client, fonction) : refuse (42501) avec le nom de la fonction et la formule qui
--     l'ouvre, si la formule du client ne la comprend pas. Sans entrée dans btp_reglages (Daliro non installé), tout
--     est fermé, comme btp_fonction_ouverte le dit déjà.
--   · Les portes qui la demandent, sinon inchangées :
--       ordre_lots      → btp_proposer_recalage, btp_recaler (Chantiers, Entreprise)
--       liste_cadencee  → btp_preparer_liste (Chantiers, Entreprise)
--       retours         → btp_noter_retour (Entreprise)
--       bons_livraison  → btp_recevoir (Entreprise)
--       remplacants     → btp_proposer_remplacants (Chantiers, Entreprise)
--       situations      → btp_avancement_photos rend vide, motif « compris dans la formule Entreprise » (l'écran
--                         l'appelle de lui-même : pas de refus)
--   · Restent ouvertes à toutes les formules, comme le dit la page : avenants, signature, J-2, annuaire, point du
--     matin, commandes et livraisons (btp_ecrire_commande, btp_noter_livraison), situations de travaux elles-mêmes.
--   · NON FAIT ICI : la relance des avenants dans le point du matin et les remplaçants listés dans l'alerte du soir
--     restent pour toutes les formules (fonctions du point du matin, recréées à chaque lot : à reprendre au prochain
--     lot qui le touche) ; le quota de comptes bureau (2 / 5) se compte à l'invitation, dans le socle.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_exiger_fonction(p_client uuid, p_fonction text)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_formule text;
begin
  if public.btp_fonction_ouverte(p_client, p_fonction) then
    return;
  end if;
  select r.formule into v_formule from public.btp_reglages r where r.client_id = p_client;
  raise exception '% : compris dans la formule %, pas dans la formule %.',
    case p_fonction when 'ordre_lots' then 'Le recalage des lots' when 'liste_cadencee' then 'La liste cadencée depuis le devis'
                    when 'retours' then 'Le suivi des retours de matériel' when 'bons_livraison' then 'Le rapprochement des bons de livraison'
                    when 'remplacants' then 'Les remplaçants proposés' when 'situations' then 'L''avancement lu dans les photos'
                    else 'Cette fonction' end,
    case when p_fonction = any (public.btp_fonctions_de('chantiers')) then 'Chantiers' else 'Entreprise' end,
    coalesce(case v_formule when 'demarrage' then 'Démarrage' when 'chantiers' then 'Chantiers' when 'entreprise' then 'Entreprise' end, '(Daliro non installé)')
    using errcode = '42501';
end $function$;

create or replace function public.btp_proposer_recalage(p_passage uuid, p_nouvelle_fin date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
begin
  select * into p from public.btp_passages where id = p_passage;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  perform private.btp_exiger_fonction(p.client_id, 'ordre_lots');
  return private.btp_calculer_recalage(p_passage, p_nouvelle_fin);
end $function$;

create or replace function public.btp_recaler(p_passage uuid, p_nouvelle_fin date, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
begin
  select * into p from public.btp_passages where id = p_passage for update;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  perform private.btp_exiger_fonction(p.client_id, 'ordre_lots');
  return private.btp_appliquer_recalage(p, p_nouvelle_fin, left(nullif(btrim(p_motif), ''), 300));
end $function$;

create or replace function public.btp_preparer_liste(p_chantier uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  r record;
  v_creees integer := 0;
  v_deja integer := 0;
  v_passage uuid;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(c.client_id, c.entite_id);
  perform private.btp_exiger_fonction(c.client_id, 'liste_cadencee');
  if c.statut not in ('preparation', 'ouvert', 'suspendu') then
    raise exception 'Le chantier n''est plus en cours : on n''y commande plus.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.btp_marches m where m.chantier_id = c.id and m.statut = 'verifie') then
    raise exception 'La liste se prépare depuis le marché vérifié : vérifiez d''abord le marché.' using errcode = '23514';
  end if;
  for r in
    select li.id, li.lot_id, li.designation, li.quantite, li.unite
    from public.btp_lignes_marche li
    join public.btp_marches m on m.id = li.marche_id
    join public.btp_lots l on l.id = li.lot_id
    where m.chantier_id = c.id and m.statut = 'verifie' and l.execution = 'client'
      and li.nature in ('ouvrage', 'fourniture') and li.quantite is not null and li.quantite > 0
      and li.unite in ('u', 'ml', 'm2', 'm3', 'kg', 't', 'l')
    order by l.rang, l.code, li.ordre
  loop
    if exists (select 1 from public.btp_commandes k where k.chantier_id = c.id and k.ligne_marche_id = r.id and k.statut <> 'annulee') then
      v_deja := v_deja + 1;
      continue;
    end if;
    select p.id into v_passage from public.btp_passages p
    where p.chantier_id = c.id and p.lot_id = r.lot_id and p.statut = 'prevu' and p.remplace_par_id is null
    order by p.debut limit 1;
    insert into public.btp_commandes (client_id, chantier_id, entite_id, lot_id, passage_id, ligne_marche_id, objet, quantite, unite,
                                      quantite_texte, delai_jours, cree_par)
    values (c.client_id, c.id, c.entite_id, r.lot_id, v_passage, r.id, left(btrim(r.designation), 300), r.quantite, r.unite,
            translate(regexp_replace(to_char(r.quantite, 'FM999999990.999'), '\.$', ''), '.', ',') || ' '
              || case r.unite when 'm2' then 'm²' when 'm3' then 'm³' when 'ml' then 'm' else r.unite end,
            5, (select auth.uid()));
    v_creees := v_creees + 1;
  end loop;
  if v_creees > 0 then
    perform private.journaliser(c.client_id, 'daliro.liste_preparee', 'btp_chantiers', c.id::text,
      jsonb_build_object('creees', v_creees, 'deja', v_deja), c.entite_id);
  end if;
  return jsonb_build_object('creees', v_creees, 'deja', v_deja);
end $function$;

create or replace function public.btp_noter_retour(p_commande uuid, p_rendu_le date default null, p_retour_prevu date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  perform private.btp_exiger_fonction(k.client_id, 'retours');
  if p_rendu_le is null and p_retour_prevu is null then
    raise exception 'Donnez la date du retour, ou la date à laquelle le rendre.' using errcode = '22023';
  end if;
  if p_rendu_le is not null then
    if k.statut not in ('livree', 'livree_partielle') then
      raise exception 'Seul du matériel reçu se rend.' using errcode = '23514';
    end if;
    if p_rendu_le > v_auj or p_rendu_le < k.livree_le then
      raise exception 'Le retour est entre la livraison et aujourd''hui.' using errcode = '22023';
    end if;
  end if;
  update public.btp_commandes
     set a_retourner = true, retour_prevu = coalesce(p_retour_prevu, retour_prevu), retourne_le = coalesce(p_rendu_le, retourne_le), maj_le = now()
   where id = k.id;
  if p_rendu_le is not null then
    perform private.journaliser(k.client_id, 'daliro.materiel_rendu', 'btp_commandes', k.id::text,
      jsonb_build_object('rendu_le', p_rendu_le), k.entite_id);
  end if;
  return private.btp_echeances_commande(k.id);
end $function$;

create or replace function public.btp_recevoir(p_commande uuid, p_livree_le date default null, p_quantite numeric default null,
                                               p_bon_reference text default null, p_piece uuid default null, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_fonction(k.client_id, 'bons_livraison');
  return private.btp_recevoir(k, p_livree_le, p_quantite, p_bon_reference, p_piece, p_note, null);
end $function$;

create or replace function public.btp_avancement_photos(p_situation uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  v_depuis date;
  v_lectures jsonb;
  v_propositions jsonb := '[]'::jsonb;
  v_non_rattaches jsonb := '[]'::jsonb;
  a jsonb;
  v_lot uuid;
  v_ligne record;
  v_lignes uuid[];
  v_pris uuid[] := '{}';
begin
  select * into s from public.btp_situations where id = p_situation;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if not public.btp_fonction_ouverte(s.client_id, 'situations') then
    return jsonb_build_object('propositions', '[]'::jsonb, 'non_rattaches', '[]'::jsonb, 'motif', 'compris dans la formule Entreprise', 'ferme', true);
  end if;
  if s.statut not in ('brouillon', 'refusee') then
    return jsonb_build_object('propositions', '[]'::jsonb, 'non_rattaches', '[]'::jsonb, 'motif', 'situation déjà soumise ou validée');
  end if;
  select max(x.periode_fin) into v_depuis from public.btp_situations x
  where x.chantier_id = s.chantier_id and x.statut = 'validee' and x.numero < s.numero;

  -- Les lectures « avancement » du chantier sur la période, les plus récentes d'abord.
  select coalesce(jsonb_agg(jsonb_build_object(
           'message', m.id, 'le', m.recu_le, 'de_nom', m.de_nom,
           'ouvrage', d ->> 'ouvrage', 'lot_code', d ->> 'lot_code', 'pourcentage', (d ->> 'pourcentage')::numeric,
           'extrait', d -> 'source' ->> 'extrait',
           'photo', coalesce(
                      (select y ->> 'chemin' from jsonb_array_elements(coalesce(m.lecture -> 'medias', '[]'::jsonb)) y
                       where y ->> 'n' = d -> 'source' ->> 'media' and y ->> 'nature' = 'photo' limit 1),
                      (select p ->> 'chemin' from jsonb_array_elements(m.pieces) with ordinality q(p, o)
                       where not (m.lecture ? 'medias') and o = coalesce((d -> 'source' ->> 'media')::integer, 0)
                         and coalesce(p ->> 'mime', '') like 'image/%')))
         order by m.recu_le desc), '[]'::jsonb)
    into v_lectures
  from public.btp_messages m
  cross join lateral jsonb_array_elements(coalesce(m.lecture -> 'demandes', '[]'::jsonb)) d
  where m.chantier_id = s.chantier_id and m.statut = 'range'
    and d ->> 'nature' = 'avancement' and (d ->> 'pourcentage') ~ '^[0-9]+(\.[0-9]+)?$'
    and (v_depuis is null or (m.recu_le at time zone 'Europe/Paris')::date > v_depuis)
    and (m.recu_le at time zone 'Europe/Paris')::date <= s.periode_fin + 1;

  for a in select x from jsonb_array_elements(v_lectures) x loop
    select l.id into v_lot from public.btp_lots l where l.chantier_id = s.chantier_id and l.code = a ->> 'lot_code';
    -- La ligne qui partage un mot avec l'ouvrage lu (dans le lot s'il est connu), sinon la seule ligne du lot.
    select array_agg(sl.id order by sl.ordre) into v_lignes
    from public.btp_situations_lignes sl
    where sl.situation_id = s.id and (v_lot is null or sl.lot_id = v_lot)
      and private.btp_mots_ouvrage(sl.designation) && private.btp_mots_ouvrage(a ->> 'ouvrage');
    if coalesce(cardinality(v_lignes), 0) <> 1 and v_lot is not null then
      select array_agg(sl.id) into v_lignes from public.btp_situations_lignes sl where sl.situation_id = s.id and sl.lot_id = v_lot;
      if cardinality(v_lignes) <> 1 then
        v_lignes := null;
      end if;
    elsif coalesce(cardinality(v_lignes), 0) <> 1 then
      v_lignes := null;
    end if;
    if v_lignes is null then
      v_non_rattaches := v_non_rattaches || a;
      continue;
    end if;
    continue when v_lignes[1] = any (v_pris);   -- la lecture la plus récente l'emporte
    select sl.id, sl.designation, sl.avancement, sl.lot_id into v_ligne from public.btp_situations_lignes sl where sl.id = v_lignes[1];
    v_pris := v_pris || v_ligne.id;
    continue when (a ->> 'pourcentage')::numeric <= v_ligne.avancement or (a ->> 'pourcentage')::numeric > 100;
    v_propositions := v_propositions || (a || jsonb_build_object('ligne', v_ligne.id, 'designation', v_ligne.designation,
                                                                 'actuel', v_ligne.avancement, 'propose', round((a ->> 'pourcentage')::numeric, 2)));
  end loop;
  return jsonb_build_object('propositions', v_propositions, 'non_rattaches', v_non_rattaches, 'depuis', v_depuis);
end $function$;

create or replace function public.btp_proposer_remplacants(p_passage uuid)
 returns table(tiers_id uuid, nom text, telephone text, email text, canal text, vigilance text, corps_commun boolean, departement_ok boolean)
 language plpgsql
 stable
 set search_path to ''
as $function$
begin
  -- Toujours SECURITY INVOKER, comme en b6_02 : la RLS du lecteur s'applique aux tiers proposés.
  perform private.btp_exiger_fonction((select p.client_id from public.btp_passages p where p.id = p_passage), 'remplacants');
  return query select * from private.btp_proposer_remplacants(p_passage);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt). private.btp_exiger_fonction est aussi exécutable par
-- authenticated : btp_proposer_remplacants reste SECURITY INVOKER ; elle ne rend rien, refuse ou laisse passer.
-- Les autres portes gardent leurs droits (create or replace les conserve).
revoke execute on function private.btp_exiger_fonction(uuid, text) from public, anon;
grant execute on function private.btp_exiger_fonction(uuid, text) to authenticated, service_role;
revoke execute on function public.btp_proposer_remplacants(uuid) from public, anon;
grant execute on function public.btp_proposer_remplacants(uuid) to authenticated, service_role;
