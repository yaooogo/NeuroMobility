import CacheData from "./CacheData.js";
import Database from "./Database.js";
import DB from "./database/DB.js";
import Helper from "./Helper.js";

const DEFAULT_DECIMALS = 18;
let rechargeMinAmountColumnReady = false;
let rechargeableColumnReady = false;
let withdrawDailyLimitColumnReady = false;

async function ensureRechargeableColumn() {
  if (rechargeableColumnReady) {
    return;
  }

  const prefix = Database.prefix("default") || "";
  const database = Database.dbConfig.default.database;
  const tableName = `${prefix}assets_tokens`;
  const rows = await DB.query().exec(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [database, tableName, "rechargeable"]
  );

  if (!Array.isArray(rows) || rows.length < 1) {
    try {
      await DB.query().exec(
        `ALTER TABLE \`${tableName}\`
         ADD COLUMN \`rechargeable\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否允许充值：1允许，0禁止' AFTER \`recharge_min_amount\``
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  await CacheData.removeAssetsTokens();
  rechargeableColumnReady = true;
}

async function ensureRechargeMinAmountColumn() {
  if (rechargeMinAmountColumnReady) {
    return;
  }

  const prefix = Database.prefix("default") || "";
  const database = Database.dbConfig.default.database;
  const tableName = `${prefix}assets_tokens`;
  const rows = await DB.query().exec(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [database, tableName, "recharge_min_amount"]
  );

  if (!Array.isArray(rows) || rows.length < 1) {
    try {
      await DB.query().exec(
        `ALTER TABLE \`${tableName}\`
         ADD COLUMN \`recharge_min_amount\` DECIMAL(36,8) NOT NULL DEFAULT 0 COMMENT '最少充值金额' AFTER \`icon\``
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  await CacheData.removeAssetsTokens();
  rechargeMinAmountColumnReady = true;
}

async function ensureWithdrawDailyLimitColumn() {
  if (withdrawDailyLimitColumnReady) {
    return;
  }

  const prefix = Database.prefix("default") || "";
  const database = Database.dbConfig.default.database;
  const tableName = `${prefix}assets_tokens`;
  const rows = await DB.query().exec(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [database, tableName, "withdraw_daily_limit"]
  );

  if (!Array.isArray(rows) || rows.length < 1) {
    try {
      await DB.query().exec(
        `ALTER TABLE \`${tableName}\`
         ADD COLUMN \`withdraw_daily_limit\` DECIMAL(36,8) NOT NULL DEFAULT 0 COMMENT '提现每日限额，0表示不限额' AFTER \`withdraw_min_amount\``
      );
    } catch (error) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  await CacheData.removeAssetsTokens();
  withdrawDailyLimitColumnReady = true;
}

async function ensureAssetTokenColumns() {
  await ensureRechargeMinAmountColumn();
  await ensureRechargeableColumn();
  await ensureWithdrawDailyLimitColumn();
}

function normalizeTokenRow(row) {
  if (!row) {
    return null;
  }

  const symbol = String(row.symbol || row.value || "").trim().toUpperCase();
  const contract = String(row.contract || "").trim();

  return {
    id: row.id,
    symbol,
    value: symbol,
    label: row.name || symbol,
    name: row.name || symbol,
    contract,
    icon: row.icon || "",
    decimals: Helper.parseInt(row.decimals, DEFAULT_DECIMALS),
    recharge_min_amount: row.recharge_min_amount ?? "0",
    rechargeable: Number(row.rechargeable ?? 1) === 1 ? 1 : 0,
    withdrawable: Number(row.withdrawable || 0),
    withdraw_service_type: Number(row.withdraw_service_type || 0),
    withdraw_service_fee: row.withdraw_service_fee ?? "0",
    withdraw_min_amount: row.withdraw_min_amount ?? "0",
    withdraw_daily_limit: row.withdraw_daily_limit ?? "0"
  };
}

async function getTokens() {
  await ensureAssetTokenColumns();
  const rows = await CacheData.getAssetsTokens();
  return (rows || []).map(normalizeTokenRow).filter(Boolean);
}

async function getTokenItem(token) {
  const normalizedToken = String(token || "").trim().toUpperCase();
  if (!normalizedToken) {
    return null;
  }

  const tokens = await getTokens();
  return tokens.find((item) => item.value === normalizedToken) || null;
}

async function getTokenDecimals(token) {
  const tokenItem = await getTokenItem(token);
  return Helper.parseInt(tokenItem?.decimals, DEFAULT_DECIMALS);
}

async function getTokenItemByContract(contractAddress) {
  const normalizedContract = String(contractAddress || "").trim().toLowerCase();
  if (!normalizedContract) {
    return null;
  }

  const tokens = await getTokens();
  return tokens.find((item) => String(item?.contract || "").trim().toLowerCase() === normalizedContract) || null;
}

async function getTokenContract(token) {
  const tokenItem = await getTokenItem(token);
  return String(tokenItem?.contract || "").trim();
}

export default {
  DEFAULT_DECIMALS,
  ensureRechargeMinAmountColumn,
  ensureRechargeableColumn,
  ensureWithdrawDailyLimitColumn,
  ensureAssetTokenColumns,
  normalizeTokenRow,
  getTokens,
  getTokenItem,
  getTokenDecimals,
  getTokenItemByContract,
  getTokenContract
};
