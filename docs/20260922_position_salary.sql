-- 岗位工资发放记录；运行时也会自动创建该表。
CREATE TABLE IF NOT EXISTS `n_position_salary_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `salary_id` varchar(100) NOT NULL COMMENT '工资流水号',
  `salary_month` char(7) NOT NULL COMMENT '工资月份 YYYY-MM',
  `wallet` varchar(80) NOT NULL COMMENT '收款钱包',
  `level` int NOT NULL DEFAULT 0 COMMENT '发放时的有效等级',
  `token` varchar(40) NOT NULL DEFAULT 'USDT' COMMENT '工资币种',
  `amount` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '工资金额，18 位精度最小单位整数',
  `paid_at` datetime NOT NULL COMMENT '发放时间',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_position_salary_id` (`salary_id`),
  UNIQUE KEY `uk_position_salary_month_wallet` (`salary_month`, `wallet`),
  KEY `idx_position_salary_wallet_id` (`wallet`, `id`),
  KEY `idx_position_salary_month_id` (`salary_month`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位工资发放记录';
