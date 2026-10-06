-- FILED, lot 23 (a4_31) — le journal des pièces reçues ne se modifie pas et se prouve continu ; la délégation
-- d'approbation va à un membre et reçoit la relance.
--
-- Décisions du coordinateur (6/10, 18 h 25 Z), lignes 87 et 71 de factures.ts.
--
-- Ligne 87 « Le journal des pièces reçues est numéroté en continu et ne se modifie pas. »
--   · le numéro vient de private.filed_prochain_numero, compteur en table (filed_compteurs, insert … on conflict … do
--     update … returning) : sans trou, rien à réécrire ;
--   · filed_documents_registre_fige (BEFORE UPDATE) : les colonnes du registre ne changent plus — client_id,
--     annee_reception, numero_reception, piece_id, sha256, nom_fichier, source, expediteur, depose_par, recu_le
--     (55000). Restent vivants, et tracés (filed_documents_tracer) : etat, nature, nature_source, motif, doublon_de,
--     lu_le, traite_le, entite_id (une pièce adressée à une autre société y est rangée, a4_11) ;
--   · filed_documents_registre_garde (BEFORE DELETE) : une pièce reçue ne s'efface pas, sauf pendant l'effacement de
--     son organisation par le socle (private.effacement_en_cours) ;
--   · filed_historique est déjà gardé par le socle (filed_historique_immuable, BEFORE UPDATE OR DELETE) ;
--   · public.filed_journal_continuite(p_client, p_annee) → {annee, premier, dernier, nombre, compteur, trous[], continu}
--     (gérant, admin, valideur) : la preuve, à la demande.
-- Ligne 71 « Une délégation d'approbation se pose pour une absence, avec sa date de fin. »
--   · delegations_delegataire_membre (BEFORE INSERT OR UPDATE OF delegataire) : le délégataire est membre de
--     l'organisation, avec un message clair. La clé étrangère du socle (delegations_delegataire_client_id_fkey vers
--     comptes(user_id, client_id)) l'impose déjà ; ce déclencheur, posé à côté de private.preparer_delegation (dont le
--     texte n'est pas dans les extraits, donc laissé intact), dit pourquoi au lieu d'une erreur de clé ;
--   · private.filed_relancer_validations (texte d'a4_07) : à la relance, chaque délégataire en cours d'un approbateur
--     du rôle (et de l'équipe) attendu reçoit aussi l'alerte, à son nom.
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le registre des pièces reçues
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_documents_registre_fige()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if (new.client_id, new.annee_reception, new.numero_reception, new.piece_id, new.sha256, new.nom_fichier, new.source,
      new.expediteur, new.depose_par, new.recu_le)
     is distinct from
     (old.client_id, old.annee_reception, old.numero_reception, old.piece_id, old.sha256, old.nom_fichier, old.source,
      old.expediteur, old.depose_par, old.recu_le) then
    raise exception 'Le journal des pièces reçues ne se modifie pas : % garde son numéro, son fichier, son empreinte, sa source et sa date de réception.',
      old.reference using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function private.filed_documents_registre_fige() from public, anon, authenticated;
create or replace trigger filed_documents_registre_fige
  before update on public.filed_documents
  for each row execute function private.filed_documents_registre_fige();

create or replace function private.filed_documents_registre_garde()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if private.effacement_en_cours(old.client_id) then return old; end if;
  raise exception 'Une pièce reçue ne s''efface pas du journal (%) : seul l''effacement de l''organisation la retire.', old.reference
    using errcode = '55000';
end $$;
revoke all on function private.filed_documents_registre_garde() from public, anon, authenticated;
create or replace trigger filed_documents_registre_garde
  before delete on public.filed_documents
  for each row execute function private.filed_documents_registre_garde();

-- La preuve de continuité d'une année : premier et dernier numéro, nombre, valeur du compteur, numéros manquants.
create or replace function private.filed_journal_continuite(p_client uuid, p_annee smallint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_premier integer; v_dernier integer; v_n integer; v_compteur integer; v_trous integer[];
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  select min(numero_reception), max(numero_reception), count(*) into v_premier, v_dernier, v_n
    from public.filed_documents where client_id = p_client and annee_reception = p_annee;
  select c.dernier into v_compteur from public.filed_compteurs c where c.client_id = p_client and c.nature = 'reception' and c.annee = p_annee;
  select coalesce(array_agg(g order by g), '{}') into v_trous
    from (select g from generate_series(1, greatest(coalesce(v_dernier, 0), coalesce(v_compteur, 0))) g
           where not exists (select 1 from public.filed_documents d where d.client_id = p_client and d.annee_reception = p_annee
                              and d.numero_reception = g)
           order by g limit 1000) t;
  return jsonb_build_object('annee', p_annee, 'premier', v_premier, 'dernier', v_dernier, 'nombre', coalesce(v_n, 0),
    'compteur', v_compteur, 'trous', to_jsonb(v_trous), 'continu', cardinality(v_trous) = 0 and coalesce(v_premier, 1) = 1);
end $$;
revoke all on function private.filed_journal_continuite(uuid, smallint) from public, anon;
grant execute on function private.filed_journal_continuite(uuid, smallint) to authenticated, service_role;
create or replace function public.filed_journal_continuite(p_client uuid, p_annee smallint)
returns jsonb language sql set search_path to '' as $$ select private.filed_journal_continuite(p_client, p_annee) $$;
comment on function public.filed_journal_continuite(uuid, smallint) is
  'La preuve que le journal des pièces reçues d''une année est continu : premier et dernier numéro, nombre, compteur, numéros manquants. Gérant, admin ou valideur.';
revoke all on function public.filed_journal_continuite(uuid, smallint) from public, anon;
grant execute on function public.filed_journal_continuite(uuid, smallint) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. La délégation : un membre de l'organisation
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_delegataire_membre()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.comptes c where c.user_id = new.delegataire and c.client_id = new.client_id) then
    raise exception 'On ne délègue qu''à un membre de l''organisation : cette personne n''en fait pas partie.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.filed_delegataire_membre() from public, anon, authenticated;
create or replace trigger delegations_delegataire_membre
  before insert or update of delegataire on public.delegations
  for each row execute function private.filed_delegataire_membre();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. La relance (texte d'a4_07 + l'alerte adressée aux délégataires en cours)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_relancer_validations(p_maintenant timestamptz default now())
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r record; n_relances integer := 0; n_remontees integer := 0; v_relance interval; v_remontee interval; v_d uuid; v_dl record;
begin
  for r in
    select v.*, d.cree_le, d.resume, d.approbations_requises, d.roles_autorises, d.equipe_id, f.numero, f.entite_id,
           coalesce(c.delai_relance_jours, 3) as relance_jours, coalesce(c.delai_remontee_jours, 7) as remontee_jours
      from public.filed_validations v
      join public.demandes_validation d on d.id = v.demande_id and d.statut = 'en_attente'
      join public.filed_factures f on f.id = v.facture_id
      left join public.filed_circuits c on c.id = v.circuit_id
     where v.issue is null
     order by d.cree_le
  loop
    v_relance := make_interval(days => r.relance_jours);
    v_remontee := make_interval(days => r.remontee_jours);
    if r.remontee_le is null and r.cree_le + v_remontee <= p_maintenant then
      if r.niveau = 1 then
        update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
        update public.filed_validations set issue = 'remontee', remontee_le = p_maintenant, decide_le = p_maintenant where id = r.id;
        v_d := private.filed_deposer_validation(r.facture_id, 2);
        perform private.filed_historiser(r.client_id, r.document_id, 'filed_facture', r.facture_id::text, 'remontee',
          format('Sans décision depuis %s jours : la demande remonte à la direction.', r.remontee_jours),
          jsonb_build_object('demande', r.demande_id, 'nouvelle_demande', v_d));
        perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
          left(format('Facture %s : sans décision depuis %s jours, remontée à la direction.', coalesce(r.numero, '?'), r.remontee_jours), 200),
          jsonb_build_object('facture', r.facture_id, 'demande', v_d), 'remontee:' || r.demande_id::text, true, null);
        n_remontees := n_remontees + 1;
      else
        update public.filed_validations set remontee_le = p_maintenant where id = r.id;
        perform private.lever_alerte_module(r.client_id, 'filed', 'critique',
          left(format('Facture %s : la direction n''a pas décidé depuis %s jours.', coalesce(r.numero, '?'), r.remontee_jours), 200),
          jsonb_build_object('facture', r.facture_id, 'demande', r.demande_id), 'direction_silencieuse:' || r.demande_id::text, true, null);
        n_remontees := n_remontees + 1;
      end if;
    elsif r.relance_le is null and r.cree_le + v_relance <= p_maintenant then
      update public.filed_validations set relance_le = p_maintenant where id = r.id;
      perform private.filed_historiser(r.client_id, r.document_id, 'filed_facture', r.facture_id::text, 'relancee',
        format('Approbateur relancé : sans décision depuis %s jours (%s).', r.relance_jours, array_to_string(r.roles_autorises, ', ')),
        jsonb_build_object('demande', r.demande_id));
      perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
        left(format('À décider : %s (en attente depuis %s jours)', r.resume, r.relance_jours), 200),
        jsonb_build_object('facture', r.facture_id, 'demande', r.demande_id, 'roles', to_jsonb(r.roles_autorises), 'equipe', r.equipe_id),
        'relance:' || r.demande_id::text, true, null);
      -- a4_31 : un approbateur absent a délégué ; son délégataire reçoit la relance à son nom.
      for v_dl in
        select distinct on (dl.delegataire) dl.delegataire, dl.delegant, dl.fin
          from public.delegations dl
          join public.comptes cp on cp.user_id = dl.delegant and cp.client_id = dl.client_id
         where dl.client_id = r.client_id and dl.revoquee_le is null and p_maintenant >= dl.debut and p_maintenant < dl.fin
           and (dl.entite_id is null or dl.entite_id = r.entite_id) and (dl.module is null or dl.module = 'filed')
           and cp.role = any (coalesce(r.roles_autorises, array['gerant', 'admin', 'valideur']))
           and (r.equipe_id is null or exists (select 1 from public.equipes_membres em where em.equipe_id = r.equipe_id and em.user_id = dl.delegant))
         order by dl.delegataire, dl.fin desc
      loop
        perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
          left(format('À décider pendant une absence, par délégation : %s (en attente depuis %s jours)', r.resume, r.relance_jours), 200),
          jsonb_build_object('facture', r.facture_id, 'demande', r.demande_id, 'au_nom_de', v_dl.delegant, 'delegation_fin', v_dl.fin),
          'relance:' || r.demande_id::text || ':' || v_dl.delegataire::text, true, v_dl.delegataire);
      end loop;
      n_relances := n_relances + 1;
    end if;
  end loop;
  return jsonb_build_object('relances', n_relances, 'remontees', n_remontees);
end $$;
