import { randomUUID } from 'node:crypto';
import Database from './Database.js';
import DB from './database/DB.js';

export const AGREEMENT_VERSION = '2026-11-03.1';
export const AGREEMENT_THRESHOLD = 1000n * 10n ** 18n;
let ready;

export async function ensureInvestmentAgreementTable() {
  if (ready) return ready;
  ready = (async () => {
    const table = `${Database.prefix('default') || ''}investment_agreement`;
    await DB.query().exec(`CREATE TABLE IF NOT EXISTS ${table} (
    id BIGINT NOT NULL AUTO_INCREMENT,
    agreement_id VARCHAR(80) NOT NULL,
    wallet VARCHAR(80) NOT NULL,
    order_id VARCHAR(80) DEFAULT NULL,
    snapshot LONGTEXT NOT NULL,
    signature MEDIUMTEXT DEFAULT NULL,
    signed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_investment_agreement_id (agreement_id),
    UNIQUE KEY uk_investment_agreement_order (order_id),
    KEY idx_investment_agreement_wallet (wallet, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车辆租赁投资协议'`);
    const columns = await DB.query().exec(
      'SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
      [Database.dbConfig.default.database, table]
    );
    for (const [name, definition] of [['signed_at', 'DATETIME DEFAULT NULL'], ['created_at', 'DATETIME NOT NULL']]) {
      const column = (columns || []).find(item => item.COLUMN_NAME === name);
      if (!column || column.DATA_TYPE === 'datetime') continue;
      // Earlier versions stored UTC ISO strings. Preserve their instant as Shanghai local time.
      await DB.query().exec(`UPDATE ${table} SET ${name}=DATE_FORMAT(
        CONVERT_TZ(STR_TO_DATE(REPLACE(LEFT(${name},19),'T',' '),'%Y-%m-%d %H:%i:%s'),'+00:00','+08:00'),
        '%Y-%m-%d %H:%i:%s') WHERE ${name} REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*Z$'`);
      await DB.query().exec(`ALTER TABLE ${table} MODIFY COLUMN ${name} ${definition}`);
    }
  })().catch(error => { ready = null; throw error; });
  return ready;
}

export function agreementDateTime(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function validateAgreementInvestor(input) {
  const fields = { name: 100, document_number: 100, phone: 40, email: 254 };
  const investor = {};
  for (const [field, maximum] of Object.entries(fields)) {
    const value = typeof input?.[field] === 'string' ? input[field].trim() : '';
    if (!value || value.length > maximum || /[\x00-\x1f\x7f]/u.test(value)) throw new Error('Please complete valid investor information');
    investor[field] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(investor.email)) throw new Error('Please enter a valid email address');
  return investor;
}

export function validateAgreementSignature(value) {
  if (typeof value !== 'string' || value.length > 180000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(value)) throw new Error('Please provide a valid handwritten signature');
  const png = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64');
  if (png.length < 150 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.length < 24
    || png.readUInt32BE(16) < 100 || png.readUInt32BE(16) > 1600 || png.readUInt32BE(20) < 50 || png.readUInt32BE(20) > 800) throw new Error('Please provide a valid handwritten signature');
  return value;
}

export function agreementEndDate(startDate) {
  const date = new Date(`${startDate}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export function buildAgreementSnapshot({ investor, maturity, amount, amountRaw, token, usdtAmount, usdtRaw, mixedUsdtPercent }) {
  if (!['renew', 'refund'].includes(maturity)) throw new Error('Please select a principal maturity option');
  const createdAt = agreementDateTime();
  const startDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const snapshot = {
    agreement_id: `NM-${randomUUID()}`, version: AGREEMENT_VERSION, status: 'pending', company: 'Neuro Foundation Ltd',
    investor: validateAgreementInvestor(investor), maturity, amount, amount_raw: String(amountRaw), token,
    usdt_amount: usdtAmount, usdt_raw: String(usdtRaw), mixed_usdt_percent: mixedUsdtPercent,
    term_months: 12, start_date: startDate, end_date: agreementEndDate(startDate),
    expected_rate: '3%–10%', created_at: createdAt
  };
  snapshot.content = agreementContent(snapshot);
  return snapshot;
}

export function agreementContent(s) {
  const i = s.investor;
  return `NEURO Mobility
车辆租赁业务投资协议
协议编号：${s.agreement_id}
协议版本：${s.version}
生成时间：${s.created_at}
本协议由甲乙双方在平等、自愿、充分理解协议内容的基础上，就乙方参与甲方车辆租赁业务投资事宜，经双方确认后订立。

第一条　双方资料
1.1 甲方（公司）
公司名称：Neuro Foundation Ltd
以下简称“甲方”。
1.2 乙方（投资者）
姓名：${i.name}
身份证 / 护照号码：${i.document_number}
联系电话：${i.phone}
电子邮箱：${i.email}
以下简称“乙方”。
乙方确认，以上个人资料均由本人填写，并保证所提供的信息真实、准确、完整。
乙方同意甲方根据本协议的履行需要，使用上述资料进行投资者身份核实、投资记录管理、协议签署及相关业务联系。

第二条　投资内容
2.1 投资金额
乙方本次投资金额为：USD ${s.usdt_amount}
本项目最低投资金额为 USD 1,000。
乙方可根据自身投资意愿及系统开放的投资额度，选择 USD 1,000 或以上的投资金额。
最终投资金额以乙方确认并完成支付，且经甲方确认收到的实际金额为准。
本协议对应本次投入的 USDT 部分：${s.usdt_amount} USDT。
本次订单参与金额：${s.amount} ${s.token}。
2.2 投资期限
本次投资期限为：12个月。
乙方确认投资金额及投资期限后，系统将根据双方确认的投资信息自动生成相应的投资起止日期。
2.3 投资用途
乙方确认，本次投资资金主要用于甲方商务租赁车辆的购买、运营及相关业务管理。
甲方负责根据实际业务需要进行车辆采购、租赁运营及日常管理工作，包括车辆采购安排、租赁业务管理及车辆日常运营等相关事项。
甲方应按照本协议约定及实际经营需要合理使用投资资金。
2.4 投资确认
乙方完成投资资料填写及投资金额确认后，应按照系统提示完成投资款项支付。
甲方确认收到投资款项后，系统将生成相应的投资记录，并记录乙方的投资金额、投资期限及相关协议信息。

第三条　预计收益
3.1 预计月化收益率
本项目预计月化收益率为：3%–10%。
乙方确认，以上收益率属于项目预计收益范围，具体收益情况以实际经营情况及双方确认的相关记录为准。
3.2 预计收益计算
本项目预计收益根据乙方实际投资金额及双方确认的预计月化收益率进行测算。
预计月收益计算方式：投资金额 × 双方确认的预计月化收益率。
例如：乙方投资金额为 USD 1,000，双方确认的预计月化收益率为 5%，则预计月收益为 USD 50。
以上仅为预计收益计算示例，不代表甲方对实际收益作出保证。
3.3 预计收益说明
乙方确认，预计收益率仅作为投资收益的参考依据，不构成甲方对固定收益、最低收益或实际收益的保证。
乙方已充分了解，实际收益可能因车辆租赁业务的经营情况、市场环境及其他相关因素而有所变化。

第四条　投资本金及期限
4.1 投资期限及起止日期
本次投资期限自：${s.start_date} 至：${s.end_date}。
系统根据双方确认的投资金额、投资期限及实际投资开始日期，自动生成投资结束日期。
4.2 投资本金到期处理方式
投资期限届满后，乙方可根据自身意愿选择以下一种处理方式：
方式一：自动续约
乙方选择自动续约的，系统将按照双方确认的续约安排进行处理。
续约前，乙方应确认续约期限及相关投资信息。
方式二：退还本金
乙方选择退还本金的，甲方应按照双方确认的处理安排办理本金退还。
具体退还时间及相关结算事项，以双方确认的记录为准。
乙方本次选择：${s.maturity === 'renew' ? '自动续约' : '退还本金'}。

第五条　双方确认
5.1 甲方确认
甲方确认，将按照本协议约定及实际经营需要使用乙方的投资资金，并负责商务租赁车辆的采购、租赁运营及日常管理。
甲方应根据实际业务情况，合理安排车辆租赁业务及相关运营管理工作。
5.2 乙方确认
乙方确认，已充分了解本项目的投资内容、投资期限及预计收益安排。
乙方已了解车辆租赁业务可能存在的经营风险，并在充分理解相关内容的基础上，自愿参与本次投资。
5.3 双方共同确认
双方确认，已阅读并理解本协议的全部条款，并同意按照本协议约定履行各自的权利及义务。
本协议经甲乙双方有效电子签署后生效。

第六条　电子签署
6.1 电子签署方式
双方同意通过 NEURO Mobility DApp 或 H5 系统，以电子方式完成本协议的确认及签署。
乙方应在阅读并确认本协议全部内容后，通过系统提供的电子签名区域完成签署。
6.2 甲方（公司）电子签署
公司名称：Neuro Foundation Ltd
公司电子签名：Neuro Foundation Ltd
签署日期：系统自动记录。
6.3 乙方（投资者）电子签署
投资者姓名：${i.name}
电子签名：见本协议保存的投资者手写电子签名。
签署日期：系统自动记录。
6.4 电子签署记录
系统应自动记录本协议的协议编号、签署日期、双方签署信息及相关协议内容。
双方确认，系统记录的电子签署信息可作为本协议签署及履行的相关记录。
6.5 协议保存
本协议完成电子签署后，系统将生成已签署的电子协议文件。
乙方可通过系统查看、下载及保存已签署的协议文件。

第七条　投资者确认
本人已阅读并同意本协议全部条款。
本人已了解本项目预计收益率为预计收益，并非保证收益。
本人已了解本项目的经营风险，并自愿参与本次投资。
本人同意通过电子方式签署本协议。
乙方确认，以上内容均为本人真实意愿，并同意按照本协议约定履行相关义务。

协议签署确认
甲方：Neuro Foundation Ltd
电子签名：Neuro Foundation Ltd
乙方：${i.name}
电子签名：见签名记录。
协议编号：${s.agreement_id}
投资金额：USD ${s.usdt_amount}
投资期限：12个月
预计月化收益率：3%–10%
投资开始日期：${s.start_date}
投资结束日期：${s.end_date}
投资本金到期处理方式：${s.maturity === 'renew' ? '自动续约' : '退还本金'}`;
}
