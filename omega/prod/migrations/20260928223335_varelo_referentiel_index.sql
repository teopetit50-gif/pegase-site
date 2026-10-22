-- 20260928223335 varelo_referentiel_index
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
alter table public.grp_ref_codes drop constraint grp_ref_codes_objet_fkey;
alter table public.grp_ref_codes add constraint grp_ref_codes_objet_fkey
  foreign key (objet_id, client_id, nature) references public.grp_ref_objets (id, client_id, nature);
drop index public.grp_ref_codes_objet_idx;
create index grp_ref_codes_objet_idx on public.grp_ref_codes (objet_id, client_id, nature);
alter table public.grp_ref_objets drop constraint grp_ref_objets_fusion_fkey;
alter table public.grp_ref_objets add constraint grp_ref_objets_fusion_fkey
  foreign key (fusionne_dans, client_id, nature) references public.grp_ref_objets (id, client_id, nature);
drop index public.grp_ref_objets_fusionne_idx;
create index grp_ref_objets_fusionne_idx on public.grp_ref_objets (fusionne_dans, client_id, nature) where fusionne_dans is not null;
create index grp_ref_objets_entite_idx on public.grp_ref_objets (client_id, entite_id) where entite_id is not null;
create index grp_ref_objets_intragroupe_idx on public.grp_ref_objets (client_id, intragroupe_entite_id)
  where intragroupe_entite_id is not null;
alter table public.grp_ref_propositions drop constraint grp_ref_propositions_code_fkey,
  drop constraint grp_ref_propositions_source_fkey, drop constraint grp_ref_propositions_cible_fkey;
alter table public.grp_ref_propositions
  add constraint grp_ref_propositions_code_fkey foreign key (code_id, client_id)
    references public.grp_ref_codes (id, client_id) on delete cascade,
  add constraint grp_ref_propositions_source_fkey foreign key (objet_source, client_id, nature)
    references public.grp_ref_objets (id, client_id, nature),
  add constraint grp_ref_propositions_cible_fkey foreign key (objet_cible, client_id, nature)
    references public.grp_ref_objets (id, client_id, nature);
drop index public.grp_ref_propositions_cible_idx, public.grp_ref_propositions_source_idx;
create index grp_ref_propositions_cible_idx on public.grp_ref_propositions (objet_cible, client_id, nature);
create index grp_ref_propositions_source_idx on public.grp_ref_propositions (objet_source, client_id, nature)
  where objet_source is not null;
create index grp_ref_propositions_code_idx on public.grp_ref_propositions (code_id, client_id) where code_id is not null;
create index grp_societes_pole_idx on public.grp_societes (client_id, pole_id) where pole_id is not null;
