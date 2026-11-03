# 车辆租赁业务投资协议

用户本次 USDT 投资，或混合投资中实际 USDT 部分，大于或等于 1,000 USDT 时必须先签署协议，再完成投资。USDT 部分低于 1,000 USDT 和纯 RUSD 投资沿用原有流程。金额比较使用 18 位精度整数，不按页面两位小数的显示值判断。

协议金额只填写本次 USDT 部分；期限固定为 12 个月，日期按 Asia/Shanghai 生成。正文使用提供的中文协议，页面操作支持现有 8 种语言。版本号位于 `api/Util/InvestmentAgreement.js`，正文修改时应更新版本号。已生成和已签署的协议保存正文快照，不随模板更新而改变。

流程为填写资料、确认协议及四项声明、手写电子签署、完成投资。没有预览按钮。个人中心“我的协议”可查询当前钱包已签署的协议，并下载包含正文、签名和签署时间的 HTML 文件。

API 首次使用时自动创建带配置前缀的 `investment_agreement` 表。数据库账号需要 CREATE TABLE 权限。该表保存投资者资料、协议快照、签名、钱包地址、订单编号和服务端签署时间；不要将这些字段复制到公开接口或应用日志。

`signed_at`（允许 NULL）与 `created_at`（不允许 NULL）均为 DATETIME，写入格式为 `YYYY-MM-DD HH:mm:ss`，使用 Asia/Shanghai 时区。已有 VARCHAR 字段会先将 UTC ISO 时间转换为北京时间，再修改为 DATETIME；数据库账号需具备 UPDATE、ALTER 权限。已有协议正文及快照保持原样。

接口均位于现有钱包鉴权之后：

- `POST /investment/agreement/prepare`：校验投资配置与个人资料，生成唯一协议编号及当天有效的草稿。
- `POST /investment/create`：符合阈值的前台投资必须提供 `agreement_id`、`agreement_signature` 和四项 `agreement_consents`。服务端锁定协议并校验钱包、金额、资产及实际 USDT 部分；扣款、订单和签署记录处于同一事务。重复提交同一已签署协议返回原订单。
- `POST /investment/agreements`：当前钱包最近 100 份已签署协议的摘要。
- `POST /investment/agreement`：按 `order_id` 返回当前钱包自己的已签署协议。

后台代用户创建投资订单保留原有流程。本次仅记录 12 个月期限及到期处理意愿，没有改动分红任务、退出倍数或实现新的到期自动续约 / 退本任务；这些资金结算规则仍由既有投资业务处理。

验证：`cd api` 后运行 `node --test tests/InvestmentAgreement.test.js`；`cd dapp` 后运行 `npm run lang` 与 `npm run build_dev`。
