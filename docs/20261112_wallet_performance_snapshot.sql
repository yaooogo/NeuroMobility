-- Adjust n_ to match deployment. Run once if not using runtime schema setup.
ALTER TABLE `n_investment_order`
  ADD COLUMN `performance_ended_at` DATETIME DEFAULT NULL;
UPDATE `n_investment_order` SET `performance_ended_at`=`updated_at`
WHERE `status` IN (2,3) AND `performance_ended_at` IS NULL;

CREATE TABLE IF NOT EXISTS `n_wallet_performance_snapshot` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `wallet` VARCHAR(80) NOT NULL COMMENT '钱包地址（小写）',
  `anchor_date` DATE NOT NULL COMMENT '首次升级日期，考核从次日零点开始（北京时间）',
  `period_start` DATETIME NOT NULL COMMENT '考核周期开始时间（北京时间）',
  `period_end` DATETIME NOT NULL COMMENT '考核周期结束时间及扣减生效时间（北京时间）',
  `level` INT NOT NULL DEFAULT 0 COMMENT '生成快照时的有效等级，手动等级优先',
  `previous_community_invests` DECIMAL(65,0) NOT NULL DEFAULT 0 COMMENT '期初社区USDT本金业绩，18位精度整数',
  `community_invests` DECIMAL(65,0) NOT NULL DEFAULT 0 COMMENT '期末社区USDT本金业绩，18位精度整数',
  `growth_amount` DECIMAL(65,0) NOT NULL DEFAULT 0 COMMENT '本周期社区业绩正增长，最低为0，18位精度整数',
  `whole_vehicle_count` DECIMAL(65,0) NOT NULL DEFAULT 0 COMMENT '兼容保留字段：整车数量，当前不参与计算',
  `growth_percent` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '兼容保留字段：成长加成百分比，当前不参与计算',
  `target_amount` DECIMAL(65,18) NOT NULL DEFAULT 0 COMMENT '命中的未达标业绩门槛，单位USDT，未命中为0',
  `deduction_differential_percent` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '毛利级差奖励比例扣减值，单位百分点',
  `deduction_expansion_reward_percent` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '拓展奖励比例扣减值，单位百分点',
  `deduction_bonus_percent` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '成长加成比例扣减值，单位百分点',
  `deduction_direct_dividend_reward_percent` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '直属上级分红激励比例扣减值，单位百分点',
  `created_at` DATETIME NOT NULL COMMENT '快照生成时间（北京时间）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_performance_wallet_period` (`wallet`,`period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT '用户首次升级锚定30天业绩考核快照';
