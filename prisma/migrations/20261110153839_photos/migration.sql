-- AlterTable
ALTER TABLE "Student" ADD COLUMN "photoAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "photoAt" DATETIME;

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerType" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Photo_ownerType_ownerId_key" ON "Photo"("ownerType", "ownerId");
