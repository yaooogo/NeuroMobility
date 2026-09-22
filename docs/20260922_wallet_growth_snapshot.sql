-- 钱包月度社区投资成长快照；运行时也会自动创建该表。
CREATE TABLE IF NOT EXISTS `n_wallet_growth_snapshot` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `snapshot_id` varchar(100) NOT NULL COMMENT '快照编号',
  `snapshot_month` char(7) NOT NULL COMMENT '快照月份 YYYY-MM',
  `wallet` varchar(80) NOT NULL COMMENT '钱包地址',
  `level` int NOT NULL DEFAULT 0 COMMENT '快照时有效等级',
  `community_invests` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '本月社区投资快照，18 位精度',
  `previous_community_invests` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '上月社区投资快照，18 位精度',
  `growth_amount` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '社区投资正增长，18 位精度',
  `whole_vehicle_count` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '增长折算整车数',
  `growth_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '本月成长加成百分比',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_growth_snapshot_id` (`snapshot_id`),
  UNIQUE KEY `uk_wallet_growth_snapshot_month_wallet` (`snapshot_month`, `wallet`),
  KEY `idx_wallet_growth_snapshot_wallet_month` (`wallet`, `snapshot_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包月度社区投资成长快照';
