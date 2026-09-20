CREATE TABLE IF NOT EXISTS `n_about_content` (
  `id` int NOT NULL AUTO_INCREMENT,
  `language` varchar(10) NOT NULL DEFAULT 'zh' COMMENT '语言代码',
  `content` mediumtext NOT NULL COMMENT '关于我们内容',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_about_content_language_id` (`language`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关于我们';
