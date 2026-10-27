-- SOCLE, lot 19bd — l'effacement d'une organisation emporte aussi ses lignes du schéma private (TMET-26, 27/10/2026).
-- Copie du dépôt omega-metiers (socle/base/), où ce lot a été écrit et testé, 27/10/2026.
--
-- Pourquoi : private.effacer_client vide les tables de private.tables_locataires (schéma public) puis supprime la ligne de
-- clients. Une table de private qui porte client_id n'est vidée que si une clé étrangère en cascade la relie à clients
-- ou à une table effacée. Le testeur (outils/testeur/2026-10-27, TMET-26) a trouvé, après l'effacement d'une agence
-- Lorani, 2 lignes dans private.mesures_pieces (organisation, pièce, mois). Le relevé du 27/10 sur la recette en trouve
-- trois autres dans le même cas : private.journal_sceaux (les sceaux du journal opposable, alors que le journal
-- lui-même est effacé), private.filed_lot4_passages et private.filed_banc_releves (FILED).
--
-- Ce qui est posé :
--   · une clé étrangère client_id → clients ON DELETE CASCADE sur ces tables, NOT VALID : elle vaut pour toute
--     suppression à venir sans exiger que les lignes déjà orphelines (organisations effacées avant ce lot) aient leur
--     organisation ; ces orphelines restent, comptées par le gardien, à retirer sur décision de Teo ;
--   · private.journal_sceaux_ajout_seul() : un sceau se retire pendant l'effacement de SON organisation (réglage
--     omega.effacement_client, posé par effacer_client), comme les lignes du journal opposable (journal_immuable) ;
--     hors de là, toujours refusé (42501).
-- Les tables FILED n'existent que là où FILED est posé : la clé n'y est posée que si la table est là.
-- Rejouable. Aucun DROP. Le gardien : b6_80_tables_locataires (assertion sur private).

do $$
declare
  r record;
begin
  for r in select * from (values
      ('mesures_pieces',      'mesures_pieces_client_fkey'),
      ('journal_sceaux',      'journal_sceaux_client_fkey'),
      ('filed_lot4_passages', 'filed_lot4_passages_client_fkey'),
      ('filed_banc_releves',  'filed_banc_releves_client_fkey')) as x(t, c) loop
    if to_regclass('private.' || r.t) is not null
       and not exists (select 1 from pg_constraint k where k.conname = r.c and k.conrelid = to_regclass('private.' || r.t)) then
      execute format('alter table private.%I add constraint %I foreign key (client_id) references public.clients(id) '
                     'on delete cascade not valid', r.t, r.c);
    end if;
  end loop;
end $$;

CREATE OR REPLACE FUNCTION private.journal_sceaux_ajout_seul()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- 19bd : l'effacement de l'organisation emporte ses sceaux, comme son journal (journal_immuable)
  if tg_op = 'DELETE' and old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return old;
  end if;
  raise exception 'Les sceaux du journal ne se modifient ni ne se retirent.' using errcode = '42501';
end $function$;
revoke execute on function private.journal_sceaux_ajout_seul() from public, anon, authenticated;

-- Contrôle
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mesures_pieces_client_fkey' and confdeltype = 'c')
     or not exists (select 1 from pg_constraint where conname = 'journal_sceaux_client_fkey' and confdeltype = 'c') then
    raise exception 'socle 19bd : les clés en cascade manquent.';
  end if;
  if position('omega.effacement_client' in (select prosrc from pg_proc where oid = 'private.journal_sceaux_ajout_seul()'::regprocedure)) = 0 then
    raise exception 'socle 19bd : journal_sceaux_ajout_seul n''a pas son corps.';
  end if;
end $$;
