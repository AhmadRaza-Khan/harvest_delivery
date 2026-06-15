/*
  Warnings:

  - You are about to drop the column `snoonu_id` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[partnerId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `partnerId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Order_snoonu_id_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "snoonu_id",
ADD COLUMN     "partnerId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_partnerId_key" ON "Order"("partnerId");
