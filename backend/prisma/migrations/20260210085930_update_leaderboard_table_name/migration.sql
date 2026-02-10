/*
  Warnings:

  - You are about to drop the `leaderboard` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "leaderboard" DROP CONSTRAINT "leaderboard_user_id_fkey";

-- DropTable
DROP TABLE "leaderboard";

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "rank" INTEGER,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_user_id_key" ON "leaderboards"("user_id");

-- CreateIndex
CREATE INDEX "leaderboards_total_score_user_id_idx" ON "leaderboards"("total_score" DESC, "user_id");

-- CreateIndex
CREATE INDEX "leaderboards_rank_idx" ON "leaderboards"("rank");

-- AddForeignKey
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
