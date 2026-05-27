ALTER TABLE "Order" ADD COLUMN "queueNumber" INTEGER;
ALTER TABLE "Order" ADD COLUMN "orderDate" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'amount';
ALTER TABLE "Order" ADD COLUMN "discountValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "refundReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "shiftId" TEXT;

CREATE TABLE "CashierShift" (
  "id" TEXT NOT NULL,
  "openedById" TEXT,
  "openedByName" TEXT NOT NULL,
  "openingCash" INTEGER NOT NULL DEFAULT 0,
  "closingCash" INTEGER,
  "expectedCash" INTEGER,
  "cashDifference" INTEGER,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "CashierShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "userId" TEXT,
  "username" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_orderDate_queueNumber_key" ON "Order"("orderDate", "queueNumber");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CashierShift"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashierShift"
  ADD CONSTRAINT "CashierShift_openedById_fkey"
  FOREIGN KEY ("openedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
