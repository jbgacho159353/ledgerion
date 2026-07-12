-- CreateIndex
CREATE INDEX `Trade_userId_pair_idx` ON `Trade`(`userId`, `pair`);

-- CreateIndex
CREATE INDEX `Trade_userId_session_idx` ON `Trade`(`userId`, `session`);

-- CreateIndex
CREATE INDEX `Trade_userId_setup_idx` ON `Trade`(`userId`, `setup`);

-- CreateIndex
CREATE INDEX `Trade_userId_result_idx` ON `Trade`(`userId`, `result`);
