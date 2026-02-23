-- CreateTable
CREATE TABLE "DisputeFile" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeFile_disputeId_idx" ON "DisputeFile"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeFile_uploadedById_idx" ON "DisputeFile"("uploadedById");

-- AddForeignKey
ALTER TABLE "DisputeFile" ADD CONSTRAINT "DisputeFile_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeFile" ADD CONSTRAINT "DisputeFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
