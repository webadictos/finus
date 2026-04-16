DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'categoria_transaccion'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum enum
    JOIN pg_type type ON type.oid = enum.enumtypid
    WHERE type.typname = 'categoria_transaccion'
      AND enum.enumlabel = 'casa'
  ) THEN
    ALTER TYPE categoria_transaccion ADD VALUE 'casa';
  END IF;
END $$;
