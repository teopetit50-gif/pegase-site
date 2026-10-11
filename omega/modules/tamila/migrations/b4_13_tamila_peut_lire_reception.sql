-- b4_13 — Tamila : qui peut lire une réception en clair (session B4, 06/10/2026, demande du coordinateur).
--
-- POURQUOI. Un avis RPVA reçu par courriel (b4_10) reste en clair dans public.receptions et sous
-- <client>/receptions/ le temps du rattachement. La politique du socle laisse aujourd'hui tout membre du cabinet le
-- lire, stagiaire et personnes sous muraille compris. A5 pose un lot socle : une réception d'un module, et ses
-- fichiers, ne se lisent que par les membres que ce module autorise, via private.<module>_peut_lire_reception.
--
-- CE QUE ÇA POSE. private.tamila_peut_lire_reception(p_client, p_user) : vrai pour un avocat du cabinet (gérant,
-- associé, avocat collaborateur : rôles gerant, admin, valideur) qui n'est sous aucune muraille active du cabinet
-- (l'avis peut concerner le dossier dont il est écarté : on ne le sait qu'au rattachement). Faux sinon, et pour un
-- appel sans personne. Lecture seule, stable ; appelée par les politiques du socle, d'où le droit pour
-- authenticated (et service_role). Rien n'est retiré ni effacé.

create or replace function private.tamila_peut_lire_reception(p_client uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select p_client is not null and p_user is not null
     and exists (select 1 from public.comptes c
                  where c.client_id = p_client and c.user_id = p_user and c.role in ('gerant', 'admin', 'valideur'))
     and not exists (select 1 from public.tamila_murailles m
                      where m.client_id = p_client and m.user_id = p_user and m.leve_le is null)
$function$;

comment on function private.tamila_peut_lire_reception(uuid, uuid) is
  'Tamila (B4, b4_13) : un avocat du cabinet, sous aucune muraille active, lit une réception du module tamila (appelée par la politique du socle sur receptions et receptions/).';

revoke execute on function private.tamila_peut_lire_reception(uuid, uuid) from public, anon;
grant execute on function private.tamila_peut_lire_reception(uuid, uuid) to authenticated, service_role;

-- La file des avis à rattacher suit la même règle : qui ne lit pas la réception ne voit pas la file (la politique de
-- b4_10 ouvrait aussi l'assistante). La politique est modifiée sur place, rien n'est retiré.
do $p$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_avis_entrants'
               and policyname = 'qui ouvre des dossiers voit la file des avis') then
    alter policy "qui ouvre des dossiers voit la file des avis" on public.tamila_avis_entrants
      using (private.tamila_peut_lire_reception(client_id, (select auth.uid())));
  end if;
end $p$;
