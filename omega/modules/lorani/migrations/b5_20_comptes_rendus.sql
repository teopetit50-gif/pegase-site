-- LORANI, lot B5-20 — les comptes rendus de chantier et les points suivis jusqu'à la réponse.
--
-- Pourquoi : n° 4 du carnet (« CR de chantier, puis une question suivie jusqu'à la réponse ») et la promesse de la page
-- des architectes : « Il rédige le compte rendu de chantier à partir de vos notes et photos de visite ». Un compte rendu
-- de chantier liste les présents, l'avancement, et surtout les points : questions posées à une entreprise, actions à
-- faire, décisions. Un point ouvert revient de compte rendu en compte rendu jusqu'à ce qu'il soit répondu ou soldé.
--
-- Ce qui est posé :
--   · public.lorani_comptes_rendus : le CR n° k du projet (visite le, présents [{nom, organisme, intervenant, present}],
--     notes de visite brutes, avancement, prochaine visite, statut brouillon | diffuse, diffusé le, contenu figé à la
--     diffusion — ce qui a été diffusé reste tel quel, opposable).
--   · public.lorani_points : un point (nature question | action | decision | observation, texte, lot, entreprise
--     destinataire, échéance, statut ouvert | repondu | clos, réponse, répondu le, CR où il est né, CR où il est soldé).
--     Une question ou une action datée pose une échéance au registre (rappels J-2, J) ; une question adressée à une
--     entreprise qui a une adresse courriel ouvre un suivi du socle (private.ouvrir_suivi, nature reponse) : les
--     relances partent par la file des envois ; la réponse le clôt (private.clore_suivi, issue repondu). Si le suivi ne
--     peut pas s'ouvrir (destinataire, réglages), l'échéance interne suffit et une alerte info le dit.
--   · public.lorani_cr_contenu(p_cr) (sous la RLS de qui lit) → jsonb : l'en-tête, les présents, les points nés à ce
--     CR, les points en suspens nés avant (avec leur âge en jours), les points soldés depuis le CR précédent.
--   · Diffusion (statut → diffuse) : le contenu est figé dans le CR, les points ouverts restent suivis ; journal
--     lorani.cr_diffuse.
--   · private.lorani_chantier_rappeler (corps de b5_19) prend aussi les échéances des points : « question sans réponse :
--     … (entreprise), attendue le … ».
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_comptes_rendus (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  numero smallint,
  visite_le date NOT NULL DEFAULT current_date,
  presents jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  avancement text,
  prochaine_visite date,
  statut text NOT NULL DEFAULT 'brouillon',
  diffuse_le timestamptz,
  contenu jsonb,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_comptes_rendus_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_comptes_rendus_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_comptes_rendus_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_comptes_rendus_une_fois UNIQUE (projet_id, numero),
  CONSTRAINT lorani_comptes_rendus_statut_check CHECK (statut = ANY (ARRAY['brouillon', 'diffuse'])),
  CONSTRAINT lorani_comptes_rendus_presents_check CHECK (jsonb_typeof(presents) = 'array' AND jsonb_array_length(presents) <= 80),
  CONSTRAINT lorani_comptes_rendus_notes_check CHECK (notes IS NULL OR char_length(notes) <= 20000),
  CONSTRAINT lorani_comptes_rendus_avancement_check CHECK (avancement IS NULL OR char_length(avancement) <= 5000),
  CONSTRAINT lorani_comptes_rendus_numero_check CHECK (numero IS NULL OR numero BETWEEN 1 AND 999),
  CONSTRAINT lorani_comptes_rendus_visite_check CHECK (prochaine_visite IS NULL OR prochaine_visite >= visite_le)
);
ALTER TABLE public.lorani_comptes_rendus ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid,
  intervenant_id uuid,
  nature text NOT NULL DEFAULT 'question',
  texte text NOT NULL,
  echeance date,
  statut text NOT NULL DEFAULT 'ouvert',
  reponse text,
  repondu_le date,
  ouvert_au_cr uuid,
  clos_au_cr uuid,
  delai_id uuid,
  suivi_id uuid,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_points_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_points_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_points_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_points_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_points_intervenant_fkey FOREIGN KEY (client_id, intervenant_id) REFERENCES public.lorani_intervenants (client_id, id),
  CONSTRAINT lorani_points_ouvert_fkey FOREIGN KEY (client_id, ouvert_au_cr) REFERENCES public.lorani_comptes_rendus (client_id, id),
  CONSTRAINT lorani_points_clos_fkey FOREIGN KEY (client_id, clos_au_cr) REFERENCES public.lorani_comptes_rendus (client_id, id),
  CONSTRAINT lorani_points_nature_check CHECK (nature = ANY (ARRAY['question', 'action', 'decision', 'observation'])),
  CONSTRAINT lorani_points_statut_check CHECK (statut = ANY (ARRAY['ouvert', 'repondu', 'clos'])),
  CONSTRAINT lorani_points_texte_check CHECK (char_length(btrim(texte)) BETWEEN 1 AND 1000),
  CONSTRAINT lorani_points_reponse_check CHECK (reponse IS NULL OR char_length(reponse) <= 2000),
  CONSTRAINT lorani_points_repondu_check CHECK (statut <> 'repondu' OR char_length(btrim(coalesce(reponse, ''))) >= 1)
);
CREATE INDEX IF NOT EXISTS lorani_points_projet_idx ON public.lorani_points (projet_id, statut);
ALTER TABLE public.lorani_points ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lorani_comptes_rendus, public.lorani_points FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_comptes_rendus, public.lorani_points TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_comptes_rendus', 'lorani_points'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit les comptes rendus des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit les comptes rendus des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet redige') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet redige', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet met a jour') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet met a jour', t);
    end if;
  end loop;
end $$;

-- ——— le contenu d'un compte rendu ———

CREATE OR REPLACE FUNCTION public.lorani_cr_contenu(p_cr uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with cr as (select * from public.lorani_comptes_rendus where id = p_cr),
  prec as (select p.* from public.lorani_comptes_rendus p, cr where p.projet_id = cr.projet_id and p.numero < cr.numero order by p.numero desc limit 1),
  pts as (
    select pt.*, l.numero as lot_numero, i.organisme as entreprise, o.numero as cr_numero, o.visite_le as cr_visite
    from public.lorani_points pt
    join cr on cr.projet_id = pt.projet_id
    left join public.lorani_lots l on l.id = pt.lot_id
    left join public.lorani_intervenants i on i.id = pt.intervenant_id
    left join public.lorani_comptes_rendus o on o.id = pt.ouvert_au_cr
  ),
  ligne as (
    select pts.*, jsonb_build_object('id', pts.id, 'nature', pts.nature, 'texte', pts.texte, 'lot', pts.lot_numero, 'entreprise', pts.entreprise,
             'echeance', pts.echeance, 'statut', pts.statut, 'reponse', pts.reponse, 'repondu_le', pts.repondu_le, 'ne_au_cr', pts.cr_numero) as j
    from pts
  )
  select jsonb_build_object(
    'cr', (select jsonb_build_object('id', cr.id, 'numero', cr.numero, 'visite_le', cr.visite_le, 'prochaine_visite', cr.prochaine_visite,
                                     'statut', cr.statut, 'avancement', cr.avancement, 'presents', cr.presents) from cr),
    'projet', (select jsonb_build_object('nom', p.nom, 'reference', p.reference, 'adresse', p.adresse, 'commune', p.commune)
               from public.lorani_projets p, cr where p.id = cr.projet_id),
    'precedent', (select jsonb_build_object('numero', prec.numero, 'visite_le', prec.visite_le) from prec),
    'nouveaux', coalesce((select jsonb_agg(l.j order by l.lot_numero nulls first, l.cree_le) from ligne l, cr where l.ouvert_au_cr = cr.id), '[]'::jsonb),
    'en_suspens', coalesce((select jsonb_agg(l.j || jsonb_build_object('age_jours', cr.visite_le - coalesce(l.cr_visite, l.cree_le::date)) order by l.lot_numero nulls first, l.cree_le)
                            from ligne l, cr
                            where l.statut = 'ouvert' and l.ouvert_au_cr is distinct from cr.id and l.nature in ('question', 'action')
                              and coalesce(l.cr_visite, l.cree_le::date) <= cr.visite_le), '[]'::jsonb),
    'soldes', coalesce((select jsonb_agg(l.j order by l.lot_numero nulls first, l.cree_le)
                        from ligne l, cr
                        where l.statut <> 'ouvert' and l.ouvert_au_cr is distinct from cr.id and l.nature in ('question', 'action')
                          and coalesce(l.repondu_le, l.maj_le::date) > coalesce((select prec.visite_le from prec), '-infinity'::date)
                          and coalesce(l.repondu_le, l.maj_le::date) <= cr.visite_le), '[]'::jsonb)
  )
$function$;
REVOKE EXECUTE ON FUNCTION public.lorani_cr_contenu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_cr_contenu(uuid) TO authenticated;

-- ——— les triggers ———

CREATE OR REPLACE FUNCTION private.lorani_cr_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  if tg_op = 'UPDATE' and old.statut = 'diffuse' then
    -- un compte rendu diffusé ne se réécrit pas : on en fait un nouveau (seul le socle fige une fois son contenu)
    if (new.visite_le, new.presents, new.notes, new.avancement, new.prochaine_visite, new.statut)
       is distinct from (old.visite_le, old.presents, old.notes, old.avancement, old.prochaine_visite, old.statut)
       or (old.contenu is not null and new.contenu is distinct from old.contenu) then
      raise exception 'Ce compte rendu est diffusé : il ne se modifie plus. Rédigez le suivant.' using errcode = '55000';
    end if;
    return new;
  end if;
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('lorani_cr:' || new.projet_id::text, 0));
    select coalesce(max(c.numero), 0) + 1 into new.numero from public.lorani_comptes_rendus c where c.projet_id = new.projet_id;
  end if;
  new.notes := nullif(btrim(new.notes), '');
  new.avancement := nullif(btrim(new.avancement), '');
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_cr_preparer() FROM PUBLIC;

-- La diffusion : le contenu est figé, le journal en garde la trace.
CREATE OR REPLACE FUNCTION private.lorani_cr_diffuser()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_contenu jsonb;
begin
  if new.statut = 'diffuse' and (tg_op = 'INSERT' or old.statut is distinct from 'diffuse') then
    v_contenu := public.lorani_cr_contenu(new.id);
    update public.lorani_comptes_rendus set contenu = v_contenu, diffuse_le = now() where id = new.id;
    -- les points soldés depuis le CR précédent sont rattachés à ce CR
    update public.lorani_points set clos_au_cr = new.id
    where projet_id = new.projet_id and statut <> 'ouvert' and clos_au_cr is null
      and id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_contenu -> 'soldes') x);
    perform private.journaliser_module(new.client_id, 'lorani', 'lorani.cr_diffuse', 'lorani_projet', new.projet_id::text,
      jsonb_build_object('cr', new.id, 'numero', new.numero, 'visite_le', new.visite_le,
                         'nouveaux', jsonb_array_length(v_contenu -> 'nouveaux'), 'en_suspens', jsonb_array_length(v_contenu -> 'en_suspens'),
                         'soldes', jsonb_array_length(v_contenu -> 'soldes')), new.entite_id);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_cr_diffuser() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_points_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  i public.lorani_intervenants;
  v_ouvert boolean;
  v_echeance date;
  v_qui text;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  new.texte := btrim(regexp_replace(new.texte, '\s+', ' ', 'g'));
  new.reponse := nullif(btrim(new.reponse), '');
  if new.intervenant_id is not null then
    select * into i from public.lorani_intervenants where id = new.intervenant_id and projet_id = new.projet_id;
    if not found then
      raise exception 'Cet intervenant n''est pas du projet.' using errcode = '22023';
    end if;
    new.lot_id := coalesce(new.lot_id, i.lot_id);
  end if;
  if new.ouvert_au_cr is not null and not exists (select 1 from public.lorani_comptes_rendus c where c.id = new.ouvert_au_cr and c.projet_id = new.projet_id) then
    raise exception 'Ce compte rendu n''est pas du projet.' using errcode = '22023';
  end if;
  if new.reponse is not null and new.statut = 'ouvert' then
    new.statut := 'repondu';
  end if;
  if new.statut = 'repondu' and new.repondu_le is null then
    new.repondu_le := current_date;
  elsif new.statut = 'ouvert' then
    new.repondu_le := null;
  end if;
  if new.nature in ('decision', 'observation') and tg_op = 'INSERT' then
    new.statut := 'clos';
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;

  -- l'échéance interne d'une question ou d'une action
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_echeance from public.delais d where d.id = new.delai_id;
  if coalesce(v_ouvert, false) and new.statut <> 'ouvert' then
    perform private.clore_delai(new.delai_id, 'tenu', null);
  elsif coalesce(v_ouvert, false) and new.echeance is distinct from v_echeance then
    perform private.clore_delai(new.delai_id, 'annule', left(format('Échéance du point modifiée : %s.', coalesce(to_char(new.echeance, 'DD/MM/YYYY'), 'aucune')), 300));
    new.delai_id := null;
    v_ouvert := false;
  end if;
  if not coalesce(v_ouvert, false) and new.statut = 'ouvert' and new.nature in ('question', 'action') and new.echeance is not null
     and new.echeance >= current_date and pr.territoire is not null then
    v_qui := coalesce(i.organisme, 'l''équipe');
    begin
      new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
        left(format('%s (%s) : %s', case new.nature when 'question' then 'Réponse attendue' else 'Action attendue' end, v_qui, new.texte), 200), new.echeance,
        left('Point du compte rendu de chantier.', 300), pr.territoire, array[2, 0], private.lorani_chef_de_projet(new.client_id, new.projet_id),
        'Relancer, ou porter le point au prochain compte rendu.', format('lorani:point:%s:%s', new.id, new.echeance));
    exception when others then
      new.delai_id := null;
    end;
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_points_preparer() FROM PUBLIC;

-- Le suivi du socle : une question à une entreprise joignable est relancée jusqu'à la réponse.
CREATE OR REPLACE FUNCTION private.lorani_points_suivre()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  i public.lorani_intervenants;
  v_suivi uuid;
begin
  if new.suivi_id is not null and new.statut <> 'ouvert' and (tg_op = 'INSERT' or old.statut = 'ouvert') then
    begin
      perform private.clore_suivi(new.suivi_id, case when new.statut = 'repondu' then 'repondu' else 'annule' end, null,
                                  case when new.statut = 'repondu' then left(new.reponse, 300) else 'Point soldé au compte rendu de chantier.' end);
    exception when others then
      null;
    end;
    return null;
  end if;
  if tg_op <> 'INSERT' or new.nature <> 'question' or new.statut <> 'ouvert' or new.intervenant_id is null then
    return null;
  end if;
  select * into i from public.lorani_intervenants where id = new.intervenant_id;
  if i.email is null then
    return null;
  end if;
  select * into pr from public.lorani_projets where id = new.projet_id;
  begin
    v_suivi := private.ouvrir_suivi(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
      jsonb_strip_nulls(jsonb_build_object('adresse', i.email, 'nom', coalesce(i.contact, i.organisme), 'professionnel', true)),
      left('Réponse : ' || new.texte, 200), now(), '{}'::jsonb,
      case when new.echeance is not null and new.echeance > current_date then (new.echeance + time '18:00')::timestamptz end,
      'reponse', null, pr.territoire, new.entite_id, format('lorani:point:%s', new.id));
    update public.lorani_points set suivi_id = v_suivi where id = new.id;
  exception when others then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('« %s » : la question à %s n''a pas pu être confiée aux relances (%s) ; l''échéance interne la suit.', left(pr.nom, 40), left(i.organisme, 40), left(sqlerrm, 60)), 200),
      jsonb_build_object('projet', new.projet_id, 'point', new.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
      format('point:%s:suivi_refuse', new.id), true, null);
  end;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_points_suivre() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_comptes_rendus'::regclass and tgname = 'lorani_comptes_rendus_preparer') then
    create trigger lorani_comptes_rendus_preparer before insert or update on public.lorani_comptes_rendus
      for each row execute function private.lorani_cr_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_comptes_rendus'::regclass and tgname = 'lorani_comptes_rendus_diffuser') then
    create trigger lorani_comptes_rendus_diffuser after insert or update of statut on public.lorani_comptes_rendus
      for each row execute function private.lorani_cr_diffuser();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_comptes_rendus'::regclass and tgname = 'lorani_comptes_rendus_tracer') then
    create trigger lorani_comptes_rendus_tracer after insert or update on public.lorani_comptes_rendus
      for each row execute function private.tracer('+numero', '+visite_le', '+statut');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_points'::regclass and tgname = 'lorani_points_preparer') then
    create trigger lorani_points_preparer before insert or update on public.lorani_points
      for each row execute function private.lorani_points_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_points'::regclass and tgname = 'lorani_points_suivre') then
    -- sans liste de colonnes : la réponse saisie seule fait passer le statut par le trigger BEFORE, qu'un « update of
    -- statut » ne verrait pas
    create trigger lorani_points_suivre after insert or update on public.lorani_points
      for each row execute function private.lorani_points_suivre();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_points'::regclass and tgname = 'lorani_points_tracer') then
    create trigger lorani_points_tracer after insert or update on public.lorani_points
      for each row execute function private.tracer('+nature', '+statut', '+echeance', '+intervenant_id', '+ouvert_au_cr', '+clos_au_cr');
  end if;
end $$;

-- ——— les rappels (corps de b5_19, plus les points) ———

CREATE OR REPLACE FUNCTION private.lorani_chantier_rappeler(t public.travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.lorani_reserves;
  pt public.lorani_points;
  pr public.lorani_projets;
  v_delai uuid := (t.charge ->> 'delai')::uuid;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
  v_depasse boolean := t.genre = 'lorani.chantier.depasse';
  v_ouvertes integer;
  v_detail text;
  v_lot text;
  v_qui text;
begin
  select * into pt from public.lorani_points where delai_id = v_delai;
  if found then
    if pt.statut <> 'ouvert' then
      return jsonb_build_object('ignore', 'point répondu ou soldé', 'point', pt.id);
    end if;
    select * into pr from public.lorani_projets where id = pt.projet_id;
    v_qui := coalesce((select organisme from public.lorani_intervenants where id = pt.intervenant_id), 'l''équipe');
    perform private.lever_alerte_module(pt.client_id, 'lorani', 'attention',
      left(format('« %s » : %s (%s) %s — %s', left(pr.nom, 40),
                  case pt.nature when 'question' then 'question sans réponse' else 'action non faite' end, left(v_qui, 40),
                  case when v_depasse then 'attendue le ' || to_char(pt.echeance, 'DD/MM/YYYY')
                       else 'attendue ' || case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end end,
                  pt.texte), 200),
      jsonb_build_object('projet', pt.projet_id, 'point', pt.id, 'lien', private.lorani_lien_projet(pt.projet_id)),
      case when v_depasse then format('point:%s:retard', pt.id) else format('point:%s:rappel:%s', pt.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(pt.client_id, pt.projet_id));
    return jsonb_build_object('point', pt.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into r from public.lorani_reserves where delai_id = v_delai;
  if found then
    if r.statut <> 'ouverte' then
      return jsonb_build_object('ignore', 'réserve levée ou contestée', 'reserve', r.id);
    end if;
    select * into pr from public.lorani_projets where id = r.projet_id;
    select l.numero into v_lot from public.lorani_lots l where l.id = r.lot_id;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(case when v_depasse
        then format('« %s » : réserve n° %s%s non levée au %s — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'), r.intitule)
        else format('« %s » : réserve n° %s%s à lever avant le %s (%s) — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'),
                    case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end, r.intitule) end, 200),
      jsonb_build_object('projet', r.projet_id, 'reserve', r.id, 'lien', private.lorani_lien_projet(r.projet_id)),
      case when v_depasse then format('reserve:%s:retard', r.id) else format('reserve:%s:rappel:%s', r.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(r.client_id, r.projet_id));
    return jsonb_build_object('reserve', r.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into pr from public.lorani_projets where gpa_delai_id = v_delai;
  if not found then
    return jsonb_build_object('ignore', 'délai hors du chantier');
  end if;
  select string_agg(case when x.numero is null then format('sans lot : %s', x.n) else format('lot %s : %s', x.numero, x.n) end, ', ' order by x.numero nulls last)
    into v_detail
  from (select l.numero, count(*) as n from public.lorani_reserves rr left join public.lorani_lots l on l.id = rr.lot_id
        where rr.projet_id = pr.id and rr.statut = 'ouverte' group by l.numero) x;
  select coalesce(sum(n), 0) into v_ouvertes from (select count(*) as n from public.lorani_reserves rr where rr.projet_id = pr.id and rr.statut = 'ouverte') y;
  perform private.lever_alerte_module(pr.client_id, 'lorani', case when v_ouvertes > 0 then 'attention' else 'info' end,
    left(format('« %s » : %s le %s ; %s', left(pr.nom, 40),
                case when v_depasse then 'la garantie de parfait achèvement a pris fin' else 'fin de la garantie de parfait achèvement' end,
                to_char((pr.reception_le + interval '1 year')::date, 'DD/MM/YYYY'),
                case when v_ouvertes = 0 then 'toutes les réserves sont levées, la retenue de garantie peut être libérée.'
                     else format('%s réserve%s non levée%s (%s) : retenue de garantie à conserver par opposition motivée.', v_ouvertes,
                                 case when v_ouvertes > 1 then 's' else '' end, case when v_ouvertes > 1 then 's' else '' end, v_detail) end), 200),
    jsonb_build_object('projet', pr.id, 'reception_le', pr.reception_le, 'reserves_ouvertes', v_ouvertes, 'lien', private.lorani_lien_projet(pr.id)),
    case when v_depasse then format('gpa:%s:fin', pr.id) else format('gpa:%s:rappel:%s', pr.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(pr.client_id, pr.id));
  return jsonb_build_object('projet', pr.id, 'genre', t.genre, 'reserves_ouvertes', v_ouvertes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_chantier_rappeler(public.travaux) FROM PUBLIC;
