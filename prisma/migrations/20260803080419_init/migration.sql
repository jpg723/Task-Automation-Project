-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorTag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "siteUrl" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apiTokenEnc" TEXT NOT NULL,
    "jql" TEXT,
    "reportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportFrequency" "ReportFrequency" NOT NULL DEFAULT 'DAILY',
    "teamsWebhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "issueCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCategory" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "priority" TEXT,
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "labels" TEXT[],
    "jiraCreatedAt" TIMESTAMP(3) NOT NULL,
    "jiraUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "period" "ReportFrequency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "sentToTeams" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultTeamsWebhookUrl" TEXT,
    "reportHourUtc" INTEGER NOT NULL DEFAULT 0,
    "dashboardPasswordHash" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_siteUrl_projectKey_key" ON "Project"("siteUrl", "projectKey");

-- CreateIndex
CREATE INDEX "Snapshot_projectId_capturedAt_idx" ON "Snapshot"("projectId", "capturedAt");

-- CreateIndex
CREATE INDEX "IssueSnapshot_snapshotId_issueKey_idx" ON "IssueSnapshot"("snapshotId", "issueKey");

-- CreateIndex
CREATE UNIQUE INDEX "Report_projectId_period_periodStart_key" ON "Report"("projectId", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueSnapshot" ADD CONSTRAINT "IssueSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
