CREATE TABLE IF NOT EXISTS `n_announcement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `language` varchar(10) NOT NULL DEFAULT 'zh' COMMENT '语言代码',
  `title` varchar(255) NOT NULL COMMENT '公告标题',
  `cover` varchar(500) DEFAULT NULL COMMENT '封面图片地址',
  `content` mediumtext NOT NULL COMMENT '公告内容',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_announcement_created_at` (`created_at`),
  KEY `idx_announcement_status_sort` (`status`, `sort`),
  KEY `idx_announcement_language_status_sort` (`language`, `status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告';
