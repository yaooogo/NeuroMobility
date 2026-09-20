CREATE TABLE IF NOT EXISTS `n_vehicle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `language` varchar(10) NOT NULL DEFAULT 'zh' COMMENT '语言代码',
  `name` varchar(255) NOT NULL COMMENT '车辆名称',
  `model` varchar(255) DEFAULT NULL COMMENT '车辆型号',
  `image` varchar(500) DEFAULT NULL COMMENT '车辆图片',
  `tags` mediumtext DEFAULT NULL COMMENT '标签JSON',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_language_status_sort` (`language`, `status`, `sort`),
  KEY `idx_vehicle_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆详情';
