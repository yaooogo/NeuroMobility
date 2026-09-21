-- 投资订单表
-- 金额字段 amount、distributed_amount、total_dividend 均保存 18 位精度的最小单位整数。
-- 示例：1000 U 保存为 1000000000000000000000。

CREATE TABLE IF NOT EXISTS `n_investment_order` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `order_id` varchar(80) NOT NULL COMMENT '投资订单编号，格式为 N + 时间 + 随机数',
  `wallet` varchar(80) NOT NULL COMMENT '投资用户钱包地址',
  `token` varchar(40) NOT NULL DEFAULT 'USDT' COMMENT '投资币种',
  `amount` decimal(65,0) NOT NULL COMMENT '投资金额，18 位精度最小单位整数',
  `distributed_amount` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '已发放分红金额，18 位精度最小单位整数',
  `total_dividend` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '累计产生的分红总额，18 位精度最小单位整数',
  `waiting_days` int NOT NULL DEFAULT 0 COMMENT '下单时的等待期配置快照，单位：天',
  `cycle_days` int NOT NULL DEFAULT 30 COMMENT '下单时的分红周期配置快照，单位：天',
  `min_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '下单时的最低分红百分比配置快照',
  `max_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '下单时的最高分红百分比配置快照',
  `dividend_multiple` decimal(20,8) NOT NULL DEFAULT 1 COMMENT '切换后段分红规则的累计分红倍数快照',
  `dividend_min_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '达到分红倍数后的最低分红百分比快照',
  `dividend_max_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '达到分红倍数后的最高分红百分比快照',
  `exit_multiple` decimal(20,8) NOT NULL DEFAULT 1 COMMENT '累计分红达到该投资倍数后出局',
  `guaranteed_percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '下单时的整车保底分红百分比配置快照',
  `guaranteed_eligible` tinyint NOT NULL DEFAULT 0 COMMENT '是否已满足单次或累计整车挡位保底条件：0 否，1 是',
  `whole_vehicle` tinyint NOT NULL DEFAULT 0 COMMENT '是否整车参与：0 否，1 是',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '订单状态：0 等待期，1 分红中，2 已出局',
  `waiting_until` datetime DEFAULT NULL COMMENT '等待期结束时间',
  `next_dividend_at` datetime DEFAULT NULL COMMENT '下次计划分红时间',
  `created_at` datetime DEFAULT NULL COMMENT '投资时间',
  `updated_at` datetime DEFAULT NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_investment_order_order_id` (`order_id`),
  KEY `idx_investment_order_wallet_id` (`wallet`, `id`),
  KEY `idx_investment_order_status_time` (`status`, `next_dividend_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投资订单';

-- 投资分红明细表
-- 每个订单的每个 cycle_at 只能有一条记录，用于防止多个定时器或任务重试时重复发放。
CREATE TABLE IF NOT EXISTS `n_investment_dividend` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
  `dividend_id` varchar(100) NOT NULL COMMENT '分红流水编号',
  `order_id` varchar(80) NOT NULL COMMENT '投资订单编号',
  `wallet` varchar(80) NOT NULL COMMENT '收款用户钱包地址',
  `token` varchar(40) NOT NULL DEFAULT 'USDT' COMMENT '分红币种',
  `cycle_at` datetime NOT NULL COMMENT '本次对应的计划分红时间',
  `percent` decimal(10,4) NOT NULL DEFAULT 0 COMMENT '本次实际分红百分比',
  `amount` decimal(65,0) NOT NULL DEFAULT 0 COMMENT '本次分红金额，18 位精度最小单位整数',
  `created_at` datetime DEFAULT NULL COMMENT '实际发放时间',
  `updated_at` datetime DEFAULT NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_investment_dividend_order_cycle` (`order_id`, `cycle_at`),
  UNIQUE KEY `uk_investment_dividend_id` (`dividend_id`),
  KEY `idx_investment_dividend_wallet_id` (`wallet`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投资分红记录';
