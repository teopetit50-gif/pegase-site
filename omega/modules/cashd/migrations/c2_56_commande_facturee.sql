-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_56 : une commande autorisée puis facturée ne compte qu'une fois dans le cumul du plafond
-- (27/10/2026, session C2 — TNUIT-09, rejeu de la contre-recette de nuit)
-- ═══════════════════════════════════════════════════════════════════════════
-- TNUIT-09 : depuis c2_54, une commande autorisée restait dans l'engagé pendant toute la fenêtre, même facturée : sa
-- facture entrait dans l'encours, et elle comptait deux fois (885 + 300 + 100 = 1 285 au lieu de 985) ; une commande
-- sous le plafond était bloquée à tort.
-- Désormais, une commande est FACTURÉE dès qu'une facture (ou un acompte) du même compte, non annulée, porte sa
-- référence — dans la colonne de commande de l'export (commande_ref) ou comme numéro de pièce, à la casse et aux espaces
-- près — et elle sort de l'engagé : chaque engagement compte une seule fois, la commande ou sa facture. Une commande que
-- rien ne cite reste engagée jusqu'à la fin de la fenêtre (choix prudent, dit dans API-COMMANDES.md).
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

create or replace function private.cashd_commande_facturee(p_commande uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from public.cashd_commandes o
                 join public.cashd_factures f on f.compte_id = o.compte_id and f.nature in ('facture', 'acompte') and f.statut <> 'annulee'
                 where o.id = p_commande and nullif(btrim(o.reference), '') is not null
                   and (upper(btrim(f.commande_ref)) = upper(btrim(o.reference)) or upper(btrim(f.numero)) = upper(btrim(o.reference))))
$function$;

-- Ce qui est déjà engagé pour un compte (c2_54) : les commandes autorisées ou débloquées dans la fenêtre, pas encore facturées.
create or replace function private.cashd_commandes_engagees(p_compte uuid, p_fenetre integer)
 returns numeric language sql stable security definer set search_path to ''
as $function$
  select coalesce(sum(o.montant), 0)
  from public.cashd_commandes o left join public.demandes_validation d on d.id = o.demande_id
  where o.compte_id = p_compte and o.cree_le > now() - make_interval(days => greatest(coalesce(p_fenetre, 30), 1))
    and (o.statut = 'autorisee' or d.statut = 'approuvee')
    and not private.cashd_commande_facturee(o.id)
$function$;

revoke execute on function private.cashd_commande_facturee(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_commandes_engagees(uuid, integer) from public, anon, authenticated;
