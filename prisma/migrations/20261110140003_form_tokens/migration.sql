-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "formToken" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "formToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_formToken_key" ON "Payment"("formToken");

-- CreateIndex
CREATE UNIQUE INDEX "Student_formToken_key" ON "Student"("formToken");

