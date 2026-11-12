-- Adjust n_ to the deployment table prefix. Existing rows remain NULL.
ALTER TABLE `n_wallet`
  ADD COLUMN `first_level_upgrade_at` DATETIME DEFAULT NULL COMMENT 'First automatic level change',
  ADD COLUMN `first_level_upgrade_date` DATE DEFAULT NULL COMMENT 'First automatic level change date';
