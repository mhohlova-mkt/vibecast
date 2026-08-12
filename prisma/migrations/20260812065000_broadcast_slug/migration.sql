-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_slug_key" ON "Broadcast"("slug");
