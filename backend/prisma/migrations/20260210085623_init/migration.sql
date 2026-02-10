-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "game_mode" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "rank" INTEGER,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_timestamp_idx" ON "game_sessions"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_score_idx" ON "game_sessions"("user_id", "score");

-- CreateIndex
CREATE INDEX "game_sessions_timestamp_idx" ON "game_sessions"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_user_id_key" ON "leaderboard"("user_id");

-- CreateIndex
CREATE INDEX "leaderboard_total_score_user_id_idx" ON "leaderboard"("total_score" DESC, "user_id");

-- CreateIndex
CREATE INDEX "leaderboard_rank_idx" ON "leaderboard"("rank");

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
