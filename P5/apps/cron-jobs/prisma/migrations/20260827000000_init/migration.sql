-- CreateTable
CREATE TABLE "cron_executions" (
    "id" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carnet" TEXT NOT NULL,

    CONSTRAINT "cron_executions_pkey" PRIMARY KEY ("id")
);
