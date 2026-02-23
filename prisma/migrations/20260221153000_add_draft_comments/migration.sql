CREATE TABLE "DraftComment" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DraftComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DraftComment_draftId_createdAt_idx"
ON "DraftComment"("draftId", "createdAt");

CREATE INDEX "DraftComment_authorId_idx"
ON "DraftComment"("authorId");

ALTER TABLE "DraftComment"
ADD CONSTRAINT "DraftComment_draftId_fkey"
FOREIGN KEY ("draftId") REFERENCES "Draft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DraftComment"
ADD CONSTRAINT "DraftComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
