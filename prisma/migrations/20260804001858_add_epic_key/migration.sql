-- DropIndex
DROP INDEX "Project_siteUrl_projectKey_key";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "epicKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_siteUrl_projectKey_epicKey_key" ON "Project"("siteUrl", "projectKey", "epicKey");
