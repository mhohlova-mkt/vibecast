-- AlterTable
ALTER TABLE "Article" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
