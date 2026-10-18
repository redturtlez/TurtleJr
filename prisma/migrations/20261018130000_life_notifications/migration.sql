CREATE TYPE "LifeNotificationDeliveryKind" AS ENUM ('DAILY_DIGEST');
CREATE TYPE "LifeNotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "LifeNotificationSettings" (
    "userId" TEXT NOT NULL,
    "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietStartMinutes" INTEGER,
    "quietEndMinutes" INTEGER,
    "showActivityNames" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeNotificationSettings_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "LifePushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifePushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeNotificationDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" "LifeNotificationDeliveryKind" NOT NULL,
    "status" "LifeNotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifePushSubscription_endpoint_key" ON "LifePushSubscription"("endpoint");
CREATE INDEX "LifePushSubscription_userId_active_idx" ON "LifePushSubscription"("userId", "active");
CREATE UNIQUE INDEX "LifeNotificationDelivery_subscriptionId_fingerprint_key" ON "LifeNotificationDelivery"("subscriptionId", "fingerprint");
CREATE INDEX "LifeNotificationDelivery_userId_createdAt_idx" ON "LifeNotificationDelivery"("userId", "createdAt");
