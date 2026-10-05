-- pgTAP sur la recette seulement (omega-recette). Jamais sur la production.
-- Idempotent : l'extension s'installe une fois dans le schéma extensions.
create extension if not exists pgtap with schema extensions;
