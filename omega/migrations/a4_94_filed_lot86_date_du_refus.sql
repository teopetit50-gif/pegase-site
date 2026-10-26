-- a4_94 (FILED lot 86) : TMOD-12 — filed_factures_refusees donne la vraie date du refus.
--
-- Avant (a4_92) : refusee_le = la DERNIÈRE ligne d'historique « refusee » de la facture. Le rattrapage d'a4_90 en écrit
-- une (« demandes liées fermées ») à sa pose : F3 et F13 du banc affichaient 26/10 18 h 38 Z au lieu de 00 h 52 et
-- 17 h 56. Toute fermeture de demandes liées décalait de même la date.
-- Maintenant : refusee_le = l'instant de la décision de la personne, c'est-à-dire l'approbation « rejete » la plus récente
-- sur une demande de validation de la facture (filed.valider_facture…) ; à défaut (refus ancien sans approbation
-- retrouvée), la ligne d'historique « Refusée par une personne » la plus récente. Vaut pour les factures refusées avant
-- a4_90 comme après. Rien d'autre ne change dans la liste. Rejouable ; aucune suppression.

create or replace function private.filed_date_du_refus(p_facture uuid)
returns timestamptz language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select max(a.decide_le) from public.approbations a
       join public.demandes_validation d on d.id = a.demande_id
      where d.module = 'filed' and d.objet_type = 'filed_facture' and d.objet_id = p_facture::text
        and d.type_action like 'filed.valider_facture%' and a.decision = 'rejete'),
    (select max(h.survenu_le) from public.filed_factures f join public.filed_historique h on h.document_id = f.document_id
      where f.id = p_facture and h.etape = 'refusee' and h.objet_type = 'filed_facture'
        and h.message like 'Refusée par une personne%'))
$$;
revoke all on function private.filed_date_du_refus(uuid) from public, anon, authenticated;
grant execute on function private.filed_date_du_refus(uuid) to service_role;

create or replace function private.filed_factures_refusees(p_client uuid, p_entite uuid default null, p_avec_classees boolean default false)
returns table (facture_id uuid, reference text, numero text, fournisseur text, montant_ttc numeric, refusee_le timestamptz,
               motif text, reprise text, reprise_motif text, corriger_avant timestamptz, classee_le timestamptz,
               classee_motif text, geste text)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (select * from private.filed_factures_visibles(p_client, p_entite) x where x.statut = 'refusee'),
    l as (
      select f.id, d.reference, f.numero, fo.nom as fournisseur, f.montant_ttc,
             private.filed_date_du_refus(f.id) as refusee_le,   -- a4_94 : la décision, pas la dernière ligne d'historique
             (select a.texte from public.filed_factures_annexes a where a.facture_id = f.id and a.nature = 'motif_refus'
               order by a.cree_le desc limit 1) as motif,
             rp.statut as reprise, rp.motif as reprise_motif,
             case when rp.statut = 'a_faire' then rp.cree_le + interval '24 hours' end as corriger_avant,
             c.classee_le, c.motif as classee_motif
        from f
        join public.filed_documents d on d.id = f.document_id
        left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
        left join private.filed_classements c on c.facture_id = f.id
        left join lateral (select * from private.filed_derniere_reprise(f.id)) rp on true
       where p_avec_classees or c.facture_id is null)
    select l.id, l.reference, l.numero, l.fournisseur, l.montant_ttc, l.refusee_le, coalesce(l.motif, 'Refusée sans motif écrit.'),
           coalesce(l.reprise, 'aucune'), l.reprise_motif, l.corriger_avant, l.classee_le, l.classee_motif,
           case when l.classee_le is not null then 'Classée sans suite.'
                when l.reprise = 'a_faire' then 'À corriger pour sa reprise avant l''heure limite, sinon à classer sans suite.'
                else 'À classer sans suite, ou à redéposer en facture rectificative.' end
      from l order by l.refusee_le desc nulls last;
end $$;
