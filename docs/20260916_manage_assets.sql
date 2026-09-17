CREATE TABLE IF NOT EXISTS `n_assets_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `symbol` varchar(80) DEFAULT NULL,
  `name` varchar(80) DEFAULT NULL,
  `decimals` int DEFAULT 18 COMMENT '精度',
  `contract` varchar(100) DEFAULT NULL COMMENT '合约',
  `icon` varchar(255) DEFAULT NULL,
  `recharge_min_amount` decimal(36,8) NOT NULL DEFAULT 0 COMMENT '最少充值金额',
  `rechargeable` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否允许充值',
  `withdrawable` tinyint(1) DEFAULT 0,
  `withdraw_service_type` tinyint(1) DEFAULT 0 COMMENT '0固定 1百分比',
  `withdraw_service_fee` decimal(10,4) DEFAULT 0,
  `withdraw_min_amount` decimal(20,2) NOT NULL DEFAULT 0,
  `withdraw_daily_limit` decimal(36,8) NOT NULL DEFAULT 0,
  `status` tinyint(1) DEFAULT 1,
  `sort` int DEFAULT 0,
  PRIMARY KEY (`id`), UNIQUE KEY `uk_symbol` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产类型';

CREATE TABLE IF NOT EXISTS `n_wallet_assets_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `biz_id` varchar(100) DEFAULT NULL,
  `wallet` varchar(100) DEFAULT NULL COMMENT '钱包地址',
  `token` varchar(50) DEFAULT NULL COMMENT '币种',
  `balance` decimal(64,0) DEFAULT NULL,
  `before_balance` decimal(64,0) DEFAULT NULL,
  `after_balance` decimal(64,0) DEFAULT NULL,
  `scene` varchar(50) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `type` enum('in','out') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_time` (`wallet`,`created_at`),
  KEY `idx_token_type_time` (`token`,`type`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产变更记录';

CREATE TABLE IF NOT EXISTS `n_wallet_frozen_assets_logs` LIKE `n_wallet_assets_logs`;
ALTER TABLE `n_wallet_frozen_assets_logs` COMMENT='冻结资产变更记录';
