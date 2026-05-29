/*
  Warnings:

  - You are about to drop the column `categoryName` on the `Category` table. All the data in the column will be lost.
  - Added the required column `categoryEng` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "categoryName",
ADD COLUMN     "categoryArb" TEXT,
ADD COLUMN     "categoryEng" TEXT NOT NULL;
