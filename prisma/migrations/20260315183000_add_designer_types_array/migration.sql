ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "designerTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "AdminInvite"
ADD COLUMN IF NOT EXISTS "designerTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User"
SET "designerTypes" = CASE
  WHEN "designerType" IS NULL OR btrim("designerType") = '' THEN ARRAY[]::TEXT[]
  WHEN "designerType" = '2D / 3D' THEN ARRAY['2D', '3D']
  ELSE ARRAY["designerType"]
END
WHERE COALESCE(array_length("designerTypes", 1), 0) = 0;

UPDATE "AdminInvite"
SET "designerTypes" = CASE
  WHEN "designerType" IS NULL OR btrim("designerType") = '' THEN ARRAY[]::TEXT[]
  WHEN "designerType" = '2D / 3D' THEN ARRAY['2D', '3D']
  ELSE ARRAY["designerType"]
END
WHERE COALESCE(array_length("designerTypes", 1), 0) = 0;
