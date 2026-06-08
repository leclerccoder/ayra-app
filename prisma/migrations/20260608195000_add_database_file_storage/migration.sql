CREATE TABLE "StoredFile" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoredFile_path_key" ON "StoredFile"("path");
CREATE INDEX "StoredFile_sha256_idx" ON "StoredFile"("sha256");
