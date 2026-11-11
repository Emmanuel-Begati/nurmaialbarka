-- AlterTable
ALTER TABLE "SchoolSettings" ADD COLUMN     "aboutText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "admissionsText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "feesText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "officeHours" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "principalMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "programmeText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "showStaffPublicly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tagline" TEXT NOT NULL DEFAULT '';
