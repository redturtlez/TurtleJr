ALTER TYPE "LifeNotificationDeliveryKind" ADD VALUE 'ACTIVITY_REMINDER';

ALTER TABLE "LifeNotificationSettings"
ADD COLUMN "dailyDigestMinutes" INTEGER NOT NULL DEFAULT 1080,
ADD COLUMN "activityPushRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LifeNotificationDelivery"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
