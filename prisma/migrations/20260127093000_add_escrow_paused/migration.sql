-- Add escrowPaused flag to Project
ALTER TABLE "Project" ADD COLUMN "escrowPaused" BOOLEAN NOT NULL DEFAULT false;
