-- ============================================================
-- Finus — Migración: etiquetas como jsonb con label + slug
-- ============================================================

CREATE OR REPLACE FUNCTION public.tags_text_array_to_jsonb(tags text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN tags IS NULL THEN NULL
    ELSE (
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug', tag,
          'label', initcap(replace(tag, '-', ' '))
        )
      )
      FROM unnest(tags) AS tag
    )
  END
$$;

ALTER TABLE transacciones
  ALTER COLUMN etiquetas DROP DEFAULT;

ALTER TABLE transacciones
  ALTER COLUMN etiquetas TYPE JSONB
  USING public.tags_text_array_to_jsonb(etiquetas);

ALTER TABLE transacciones
  ALTER COLUMN etiquetas SET DEFAULT '[]'::jsonb;

DROP FUNCTION public.tags_text_array_to_jsonb(text[]);
