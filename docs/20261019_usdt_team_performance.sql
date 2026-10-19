-- Run after deploying the USDT-only team performance calculation.
-- Adjust n_ if the installation uses another table prefix.
-- Existing team totals will be rebuilt by syncWalletInvestmentStats (200 per run).
UPDATE n_wallet SET level_isupdate = 1;
