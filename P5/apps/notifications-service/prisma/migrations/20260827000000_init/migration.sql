-- CreateTable
CREATE TABLE "order_notifications" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_summaries" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "carnet" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_summaries_pkey" PRIMARY KEY ("id")
);
