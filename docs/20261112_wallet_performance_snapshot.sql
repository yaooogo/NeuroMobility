-- Adjust n_ to match deployment. Run once if not using runtime schema setup.
ALTER TABLE `n_investment_order`
  ADD COLUMN `performance_ended_at` DATETIME DEFAULT NULL;
UPDATE `n_investment_order` SET `performance_ended_at`=`updated_at`
WHERE `status` IN (2,3) AND `performance_ended_at` IS NULL;

CREATE TABLE IF NOT EXISTS `n_wallet_performance_snapshot` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `wallet` VARCHAR(80) NOT NULL,
  `anchor_date` DATE NOT NULL,
  `period_start` DATETIME NOT NULL,
  `period_end` DATETIME NOT NULL,
  `level` INT NOT NULL DEFAULT 0,
  `previous_community_invests` DECIMAL(65,0) NOT NULL DEFAULT 0,
  `community_invests` DECIMAL(65,0) NOT NULL DEFAULT 0,
  `growth_amount` DECIMAL(65,0) NOT NULL DEFAULT 0,
  `whole_vehicle_count` DECIMAL(65,0) NOT NULL DEFAULT 0,
  `growth_percent` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `target_amount` DECIMAL(65,18) NOT NULL DEFAULT 0,
  `deduction_differential_percent` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `deduction_expansion_reward_percent` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `deduction_bonus_percent` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `deduction_direct_dividend_reward_percent` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_performance_wallet_period` (`wallet`,`period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户首次升级锚定30天业绩考核快照';
