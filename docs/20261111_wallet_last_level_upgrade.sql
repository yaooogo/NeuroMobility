-- Existing users stay NULL; historical upgrade times cannot be inferred.
-- Adjust n_ if the deployment uses a different table prefix.
ALTER TABLE `n_wallet`
  ADD COLUMN `last_level_upgrade_at` DATETIME DEFAULT NULL
  COMMENT 'Last automatic level upgrade time' AFTER `level`;
