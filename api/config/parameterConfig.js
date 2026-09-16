import BigNumber from "bignumber.js";

export const MINING_TOTAL_OUTPUT_SYS_CONFIG_NAME = "mining_total_output";
export const MINING_START_DATE_SYS_CONFIG_NAME = "mining_start_date";
export const MINING_OUTPUT_ENABLED_SYS_CONFIG_NAME = "mining_output_enabled";
export const MINING_INITIAL_OUTPUT_SYS_CONFIG_NAME = "mining_initial_output";
export const MINING_WEEKLY_DECREASE_PERCENT_SYS_CONFIG_NAME = "mining_weekly_decrease_percent";
export const MINING_RELEASE_RATIO_RULES_SYS_CONFIG_NAME = "mining_release_ratio_rules";
export const MINING_WALLET_HASHRATE_ADJUSTMENT_RULES_SYS_CONFIG_NAME = "mining_rig_hashrate_adjustment_rules";
export const MANAGEMENT_FEE_RULES_SYS_CONFIG_NAME = "management_fee_rules";
export const MANAGEMENT_FEE_NEU_RULES_SYS_CONFIG_NAME = "management_fee_neu_rules";
export const MANAGEMENT_FEE_NEU_ENABLED_SYS_CONFIG_NAME = "management_fee_neu_enabled";
export const MANAGEMENT_FEE_MIXED_PAYMENT_RULES_SYS_CONFIG_NAME = "management_fee_mixed_payment_rules";
export const MANAGEMENT_FEE_OVERDUE_DESTROY_DAYS_SYS_CONFIG_NAME = "management_fee_overdue_destroy_days";
export const MANAGEMENT_FEE_AUTO_RENEW_ENABLED_SYS_CONFIG_NAME = "management_fee_auto_renew_enabled";
export const MANAGEMENT_FEE_ROHS_USDT_PRICE_SYS_CONFIG_NAME = "management_fee_rohs_usdt_price";
export const MANAGEMENT_FEE_FIRST_RENEW_ROHS_ENABLED_SYS_CONFIG_NAME = "management_fee_first_renew_rohs_enabled";
export const MANAGEMENT_FEE_ROHS_DAILY_RIG_LIMIT_SYS_CONFIG_NAME = "management_fee_rohs_daily_rig_limit";
export const MANAGEMENT_FEE_REWARD_BOTTOM_POOL_PERCENT_SYS_CONFIG_NAME = "management_fee_reward_bottom_pool_percent";
export const MANAGEMENT_FEE_BOTTOM_POOL_PERCENT_SYS_CONFIG_NAME = "management_fee_bottom_pool_percent";
export const MINING_RIG_INSURANCE_PRICE_SYS_CONFIG_NAME = "mining_rig_insurance_price";
export const MINING_RIG_INSURANCE_PURCHASE_MODE_SYS_CONFIG_NAME = "mining_rig_insurance_purchase_mode";
export const MINING_RIG_INSURANCE_PURCHASE_START_DATE_SYS_CONFIG_NAME = "mining_rig_insurance_purchase_start_date";
export const MINING_RIG_INSURANCE_MONTHLY_RETURN_PERCENT_SYS_CONFIG_NAME = "mining_rig_insurance_monthly_return_percent";
export const STATIC_LINEAR_RELEASE_RULES_SYS_CONFIG_NAME = "static_linear_release_rules";
export const STATIC_LINEAR_RELEASE_MIN_AMOUNT_SYS_CONFIG_NAME = "static_linear_release_min_amount";
export const LINEAR_RELEASE_FEE_POOL_DISTRIBUTION_WEEKDAY_SYS_CONFIG_NAME = "linear_release_fee_pool_distribution_weekday";
export const LINEAR_RELEASE_FEE_PAYMENT_TOKEN_SYS_CONFIG_NAME = "linear_release_fee_payment_token";
export const LINEAR_RELEASE_NEU_PAYMENT_ENABLED_SYS_CONFIG_NAME = "linear_release_neu_payment_enabled";
export const LINEAR_RELEASE_HYPER_BOOST_ENABLED_SYS_CONFIG_NAME = "linear_release_hyper_boost_enabled";
export const LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROH = "ROH";
export const LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROHS = "ROHS";
export const MINING_RIG_PURCHASE_LIMIT_SYS_CONFIG_NAME = "mining_rig_purchase_limit";
export const HASHRATE_COMPENSATION_START_DATE_SYS_CONFIG_NAME = "hashrate_compensation_start_date";
export const HASHRATE_COMPENSATION_BASE_HASHRATE_SYS_CONFIG_NAME = "hashrate_compensation_base_hashrate";
export const HASHRATE_COMPENSATION_PERCENT_SYS_CONFIG_NAME = "hashrate_compensation_percent";
export const HASHRATE_COMPENSATION_END_DATE_SYS_CONFIG_NAME = "hashrate_compensation_end_date";
export const MINING_RIG_COMPOSE_PRICE_SYS_CONFIG_NAME = "mining_rig_compose_price";
export const MINING_RIG_COMPOSE_ROH_USDT_PRICE_SYS_CONFIG_NAME = "mining_rig_compose_roh_usdt_price";
export const MINING_RIG_COMPOSE_BOTTOM_POOL_PERCENT_SYS_CONFIG_NAME = "mining_rig_compose_bottom_pool_percent";
export const MINING_RIG_COMPOSE_HASHPOWER_MULTIPLIER_SYS_CONFIG_NAME = "mining_rig_compose_hashpower_multiplier";
export const MINING_RIG_TRANSFER_ENABLED_SYS_CONFIG_NAME = "mining_rig_transfer_enabled";
export const MINING_RIG_TRANSFER_PRICE_SYS_CONFIG_NAME = "mining_rig_transfer_price";
export const MINING_RIG_TRANSFER_ROHS_ENABLED_SYS_CONFIG_NAME = "mining_rig_transfer_rohs_enabled";
export const MINING_RIG_HASHRATE_UPGRADE_RULES_SYS_CONFIG_NAME = "mining_rig_hashrate_upgrade_rules";
export const C2C_TRADING_ENABLED_SYS_CONFIG_NAME = "c2c_trading_enabled";
export const C2C_TRADING_LIMIT_MODE_SYS_CONFIG_NAME = "c2c_trading_limit_mode";
export const C2C_TRADING_PRICE_SYS_CONFIG_NAME = "c2c_trading_price";
export const C2C_TRADING_FLOATING_RATIO_SYS_CONFIG_NAME = "c2c_trading_floating_ratio";
export const C2C_SELLER_FEE_SYS_CONFIG_NAME = "c2c_seller_fee";
export const C2C_SELLER_FEE_BOTTOM_POOL_PERCENT_SYS_CONFIG_NAME = "c2c_seller_fee_bottom_pool_percent";
export const C2C_BOTTOM_POOL_HASHPOWER_MULTIPLIER_SYS_CONFIG_NAME = "c2c_bottom_pool_hashpower_multiplier";
export const C2C_RELATION_PRIORITY_HOURS_SYS_CONFIG_NAME = "c2c_relation_priority_hours";
export const SWAP_ENABLED_SYS_CONFIG_NAME = "swap_enabled";
export const SWAP_REVERSE_ENABLED_SYS_CONFIG_NAME = "swap_reverse_enabled";
export const SWAP_MIN_AMOUNT_SYS_CONFIG_NAME = "swap_min_amount";
export const SWAP_MAX_AMOUNT_SYS_CONFIG_NAME = "swap_max_amount";
export const SWAP_MIN_PENDING_ROHS_AMOUNT_SYS_CONFIG_NAME = "swap_min_pending_rohs_amount";
export const SWAP_PRICE_MIN_VALUE_SYS_CONFIG_NAME = "swap_price_min_value";
export const SWAP_PRICE_MAX_VALUE_SYS_CONFIG_NAME = "swap_price_max_value";
export const SWAP_DAILY_ROH_LIMIT_SYS_CONFIG_NAME = "swap_daily_roh_limit";
export const SWAP_DAILY_USDT_LIMIT_SYS_CONFIG_NAME = "swap_daily_usdt_limit";
export const SWAP_ROH_TELEGRAM_NOTIFY_THRESHOLD_SYS_CONFIG_NAME = "swap_roh_telegram_notify_threshold";
export const SWAP_USDT_TELEGRAM_NOTIFY_THRESHOLD_SYS_CONFIG_NAME = "swap_usdt_telegram_notify_threshold";
export const SWAP_FEE_TYPE_SYS_CONFIG_NAME = "swap_fee_type";
export const SWAP_FEE_MIN_VALUE_SYS_CONFIG_NAME = "swap_fee_min_value";
export const SWAP_FEE_MAX_VALUE_SYS_CONFIG_NAME = "swap_fee_max_value";
export const SWAP_FEE_VALUE_SYS_CONFIG_NAME = "swap_fee_value";
export const ROH_STAKING_ENABLED_SYS_CONFIG_NAME = "roh_staking_enabled";
export const ROH_STAKING_RULES_SYS_CONFIG_NAME = "roh_staking_rules";
export const SWAP_FEE_TYPE_PERCENT = "percent";
export const SWAP_FEE_TYPE_FIXED = "fixed";

export function calculateMiningInitialOutputByTotalOutput(totalOutput, weeklyDecreasePercent, defaultValue = "0") {
  const totalOutputValue = new BigNumber(String(totalOutput ?? "").trim());
  const weeklyDecreasePercentValue = new BigNumber(String(weeklyDecreasePercent ?? "").trim());

  if (
    !totalOutputValue.isFinite() ||
    totalOutputValue.isNaN() ||
    totalOutputValue.lt(0) ||
    !weeklyDecreasePercentValue.isFinite() ||
    weeklyDecreasePercentValue.isNaN() ||
    weeklyDecreasePercentValue.lte(0) ||
    weeklyDecreasePercentValue.gt(100)
  ) {
    return defaultValue;
  }

  return totalOutputValue.times(weeklyDecreasePercentValue).div(100).toFixed();
}

const DEFAULT_MINING_PARAMETER_CONFIG = Object.freeze({
  start_date: "",
  output_enabled: 0,
  total_output: "147000000",
  initial_output: calculateMiningInitialOutputByTotalOutput("147000000", "0.76", "0"),
  weekly_decrease_percent: "0.76",
  release_ratio_rules: Object.freeze([
    { min_nodes: null, max_nodes: 19999, release_percent: "60" },
    { min_nodes: 19999, max_nodes: 29999, release_percent: "85" },
    { min_nodes: 30000, max_nodes: null, release_percent: "100" }
  ]),
  wallet_hashrate_adjustment_rules: Object.freeze([])
});

const DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG = Object.freeze({
  insurance_price: "0",
  insurance_purchase_mode: 1,
  insurance_purchase_start_date: "",
  insurance_monthly_return_percent: "3",
  overdue_destroy_days: 7,
  auto_renew_enabled: 0,
  rohs_usdt_price: "0",
  first_renew_rohs_enabled: 0,
  rohs_daily_rig_limit: 0,
  reward_bottom_pool_percent: "0",
  bottom_pool_percent: "0",
  neu_enabled: 1,
  neu_rules: Object.freeze([]),
  mixed_payment_rules: Object.freeze([]),
  rules: Object.freeze([
    { duration_days: 30, fee_amount: "40", discount_percent: "0" }
  ])
});

const DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG = Object.freeze({
  min_release_amount: "0",
  fee_pool_distribution_weekday: 0,
  fee_payment_token: LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROH,
  neu_payment_enabled: 1,
  hyper_boost_enabled: 1,
  static_rules: Object.freeze([
    { period_days: 100, fee_percent: "10", income_principal_multiple_step: "1" },
    { period_days: 50, fee_percent: "20", income_principal_multiple_step: "1" },
    { period_days: 15, fee_percent: "30", income_principal_multiple_step: "1" }
  ])
});

const DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG = Object.freeze({
  mining_rig_purchase_limit: 10,
  hashrate_compensation_start_date: "",
  hashrate_compensation_base_hashrate: "10",
  hashrate_compensation_percent: "0.5",
  hashrate_compensation_end_date: "",
  mining_rig_compose_price: "0",
  mining_rig_compose_roh_usdt_price: "1.5",
  mining_rig_compose_bottom_pool_percent: "0",
  mining_rig_compose_hashpower_multiplier: "1",
  mining_rig_transfer_enabled: 1,
  mining_rig_transfer_price: "0",
  mining_rig_transfer_rohs_enabled: 0,
  mining_rig_hashrate_upgrade_rules: Object.freeze([])
});

const DEFAULT_OTHER_PARAMETER_CONFIG = Object.freeze({
  c2c_trading_enabled: 1,
  c2c_trading_limit_mode: 0,
  c2c_trading_price: "0",
  c2c_trading_floating_ratio: "0",
  c2c_seller_fee: "10",
  c2c_seller_fee_bottom_pool_percent: "0",
  c2c_bottom_pool_hashpower_multiplier: "1",
  c2c_relation_priority_hours: 3,
  swap_enabled: 1,
  swap_reverse_enabled: 1,
  swap_min_amount: "0",
  swap_max_amount: "0",
  swap_min_pending_rohs_amount: "0",
  swap_price_min_value: "0",
  swap_price_max_value: "0",
  swap_daily_roh_limit: "2000",
  swap_daily_usdt_limit: "2000",
  swap_roh_telegram_notify_threshold: "0",
  swap_usdt_telegram_notify_threshold: "0",
  swap_fee_type: SWAP_FEE_TYPE_PERCENT,
  swap_fee_min_value: "2",
  swap_fee_max_value: "2",
  swap_fee_value: "2"
});

const DEFAULT_ROH_STAKING_RULES = Object.freeze([
  Object.freeze({ duration_days: 90, hashpower_multiplier: "1" }),
  Object.freeze({ duration_days: 180, hashpower_multiplier: "2" }),
  Object.freeze({ duration_days: 360, hashpower_multiplier: "3" }),
  Object.freeze({ duration_days: -1, hashpower_multiplier: "5" })
]);

export function getDefaultRohStakingRules() {
  return DEFAULT_ROH_STAKING_RULES.map((rule) => ({ ...rule }));
}

export function getDefaultRohStakingEnabled() {
  return 1;
}

export function normalizeRohStakingEnabled(value) {
  return normalizeSwitchFlag(value, getDefaultRohStakingEnabled());
}

export function validateRohStakingEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("ROH staking enabled must be 0 or 1");
  }
  return normalizedValue;
}

export function normalizeRohStakingRules(value, fallback = getDefaultRohStakingRules()) {
  let rows = value;
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch {
      rows = null;
    }
  }

  if (!Array.isArray(rows) || rows.length < 1) {
    return fallback.map((rule) => ({ ...rule }));
  }

  const normalized = [];
  const durations = new Set();
  for (const row of rows) {
    const durationDays = Number.parseInt(String(row?.duration_days ?? "").trim(), 10);
    const multiplier = new BigNumber(String(row?.hashpower_multiplier ?? "").trim());
    if (!Number.isInteger(durationDays) || (durationDays !== -1 && durationDays <= 0) || durations.has(durationDays) || !multiplier.isFinite() || multiplier.lte(0) || multiplier.gt(100000000)) {
      return fallback.map((rule) => ({ ...rule }));
    }
    durations.add(durationDays);
    normalized.push({ duration_days: durationDays, hashpower_multiplier: multiplier.toFixed() });
  }
  return normalized;
}

export function validateRohStakingRules(value) {
  let rows = value;
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch {
      throw new Error("ROH staking rules must be valid JSON");
    }
  }
  if (!Array.isArray(rows) || rows.length < 1) {
    throw new Error("At least one ROH staking rule is required");
  }
  const normalized = normalizeRohStakingRules(rows, []);
  if (normalized.length !== rows.length) {
    throw new Error("Staking duration must be a unique positive integer or -1, and hashpower multiplier must be greater than 0");
  }
  return normalized;
}

function cloneReleaseRatioRule(rule) {
  return {
    min_nodes: Number.isFinite(rule?.min_nodes) ? Number(rule.min_nodes) : null,
    max_nodes: Number.isFinite(rule?.max_nodes) ? Number(rule.max_nodes) : null,
    release_percent: String(rule?.release_percent ?? "0")
  };
}

function cloneWalletHashrateAdjustmentRule(rule) {
  return {
    min_hashrate: rule?.min_hashrate == null ? null : String(rule.min_hashrate),
    max_hashrate: rule?.max_hashrate == null ? null : String(rule.max_hashrate),
    adjustment_amount: String(rule?.adjustment_amount ?? "0")
  };
}

function cloneMiningRigHashrateUpgradeRule(rule) {
  return {
    hashrate: String(rule?.hashrate ?? "0"),
    usdt_amount: String(rule?.usdt_amount ?? rule?.usdtAmount ?? "0"),
    latest_compose_gap: String(rule?.latest_compose_gap ?? rule?.latestComposeGap ?? "0")
  };
}

function cloneManagementFeeRule(rule) {
  return {
    duration_days: resolveManagementFeeDurationDays(rule, 0),
    fee_amount: String(rule?.fee_amount ?? "0"),
    discount_percent: String(rule?.discount_percent ?? rule?.discountPercent ?? "0")
  };
}

function cloneLinearReleaseRule(rule) {
  return {
    period_days: Number.isFinite(rule?.period_days) ? Number(rule.period_days) : 0,
    fee_percent: String(rule?.fee_percent ?? "0"),
    income_principal_multiple_step: String(
      rule?.income_principal_multiple_step
        ?? rule?.incomePrincipalMultipleStep
        ?? rule?.reward_multiple_base
        ?? rule?.rewardMultipleBase
        ?? "1"
    )
  };
}

function parseReleaseRatioRulesInput(rules, strict = false) {
  if (Array.isArray(rules)) {
    return rules;
  }

  if (rules && typeof rules === "object") {
    return Object.values(rules);
  }

  const rawRules = String(rules ?? "").trim();

  if (!rawRules) {
    return strict ? [] : null;
  }

  try {
    const parsedRules = JSON.parse(rawRules);

    if (Array.isArray(parsedRules)) {
      return parsedRules;
    }

    if (parsedRules && typeof parsedRules === "object") {
      return Object.values(parsedRules);
    }
  } catch (error) {
    if (strict) {
      throw new Error("Mining release ratio rules are invalid");
    }
  }

  return strict ? [] : null;
}

function parseLinearReleaseRulesInput(rules, strict = false) {
  if (Array.isArray(rules)) {
    return rules;
  }

  if (rules && typeof rules === "object") {
    return Object.values(rules);
  }

  const rawRules = String(rules ?? "").trim();

  if (!rawRules) {
    return strict ? [] : null;
  }

  try {
    const parsedRules = JSON.parse(rawRules);

    if (Array.isArray(parsedRules)) {
      return parsedRules;
    }

    if (parsedRules && typeof parsedRules === "object") {
      return Object.values(parsedRules);
    }
  } catch (error) {
    if (strict) {
      throw new Error("Linear release rules are invalid");
    }
  }

  return strict ? [] : null;
}

function parseManagementFeeRulesInput(rules, strict = false) {
  if (Array.isArray(rules)) {
    return rules;
  }

  if (rules && typeof rules === "object") {
    return Object.values(rules);
  }

  const rawRules = String(rules ?? "").trim();

  if (!rawRules) {
    return strict ? [] : null;
  }

  try {
    const parsedRules = JSON.parse(rawRules);

    if (Array.isArray(parsedRules)) {
      return parsedRules;
    }

    if (parsedRules && typeof parsedRules === "object") {
      return Object.values(parsedRules);
    }
  } catch (error) {
    if (strict) {
      throw new Error("Management fee rules are invalid");
    }
  }

  return strict ? [] : null;
}

function toNormalizedDecimalString(value, defaultValue = "0") {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  const decimalValue = new BigNumber(rawValue);
  if (!decimalValue.isFinite() || decimalValue.isNaN()) {
    return defaultValue;
  }

  return decimalValue.toFixed();
}

function toNormalizedNonNegativeIntegerOrNull(value, defaultValue = null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return defaultValue;
  }

  return parsedValue;
}

function toNormalizedPositiveInteger(value, defaultValue = 0) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return defaultValue;
  }

  return parsedValue;
}

function toLegacyManagementFeeDurationDays(value, defaultValue = 0) {
  const durationMonths = toNormalizedPositiveInteger(value, 0);

  if (durationMonths <= 0) {
    return defaultValue;
  }

  return durationMonths * 30;
}

function resolveManagementFeeDurationDays(rule, defaultValue = 0) {
  const durationDays = toNormalizedPositiveInteger(rule?.duration_days ?? rule?.durationDays, 0);

  if (durationDays > 0) {
    return durationDays;
  }

  const legacyDurationDays = toLegacyManagementFeeDurationDays(
    rule?.duration_months ?? rule?.durationMonths,
    0
  );

  return legacyDurationDays > 0 ? legacyDurationDays : defaultValue;
}

function parseManagementFeeDurationDays(rule, label) {
  const rawDurationDays = rule?.duration_days ?? rule?.durationDays;

  if (String(rawDurationDays ?? "").trim()) {
    return parseRequiredPositiveInteger(rawDurationDays, label);
  }

  const rawDurationMonths = rule?.duration_months ?? rule?.durationMonths;

  if (String(rawDurationMonths ?? "").trim()) {
    return parseRequiredPositiveInteger(rawDurationMonths, `${label} legacy duration months`) * 30;
  }

  throw new Error(`${label} is required`);
}

function isValidDateString(value) {
  const text = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }

  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === text;
}

function toNormalizedDateString(value, defaultValue = "") {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  return isValidDateString(rawValue) ? rawValue : defaultValue;
}

function parseRequiredDecimal(value, label) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    throw new Error(`${label} is required`);
  }

  const decimalValue = new BigNumber(rawValue);
  if (!decimalValue.isFinite() || decimalValue.isNaN()) {
    throw new Error(`${label} is invalid`);
  }

  return decimalValue;
}

function parseOptionalNonNegativeInteger(value, label) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} is invalid`);
  }

  return parsedValue;
}

function parseRequiredPositiveInteger(value, label) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    throw new Error(`${label} is required`);
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }

  return parsedValue;
}

function normalizeNonNegativeInteger(value, defaultValue = 0) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return defaultValue;
  }

  return parsedValue;
}

function normalizeSwitchFlag(value, defaultValue = 1) {
  const rawValue = String(value ?? "").trim();

  if (rawValue === "1") {
    return 1;
  }

  if (rawValue === "0") {
    return 0;
  }

  return defaultValue;
}

function getRuleSortTuple(rule) {
  const minNodes = Number.isFinite(rule?.min_nodes) ? Number(rule.min_nodes) : null;
  const maxNodes = Number.isFinite(rule?.max_nodes) ? Number(rule.max_nodes) : null;
  const lowerBound = minNodes ?? Number.NEGATIVE_INFINITY;
  const upperBound = maxNodes ?? Number.POSITIVE_INFINITY;
  const typeRank = minNodes === null ? 0 : maxNodes === null ? 2 : 1;

  return [lowerBound, upperBound, typeRank];
}

function compareRules(a, b) {
  const [aLower, aUpper, aType] = getRuleSortTuple(a);
  const [bLower, bUpper, bType] = getRuleSortTuple(b);

  if (aLower !== bLower) {
    return aLower - bLower;
  }

  if (aUpper !== bUpper) {
    return aUpper - bUpper;
  }

  return aType - bType;
}

function getRuleInterval(rule) {
  const minNodes = Number.isFinite(rule?.min_nodes) ? Number(rule.min_nodes) : null;
  const maxNodes = Number.isFinite(rule?.max_nodes) ? Number(rule.max_nodes) : null;

  if (minNodes === null && maxNodes !== null) {
    return {
      lower: Number.NEGATIVE_INFINITY,
      lower_inclusive: false,
      upper: maxNodes,
      upper_inclusive: false
    };
  }

  if (minNodes !== null && maxNodes === null) {
    return {
      lower: minNodes,
      lower_inclusive: true,
      upper: Number.POSITIVE_INFINITY,
      upper_inclusive: false
    };
  }

  return {
    lower: minNodes ?? Number.NEGATIVE_INFINITY,
    lower_inclusive: true,
    upper: maxNodes ?? Number.POSITIVE_INFINITY,
    upper_inclusive: true
  };
}

function intervalsOverlap(previousRule, nextRule) {
  const previous = getRuleInterval(previousRule);
  const next = getRuleInterval(nextRule);

  if (next.lower < previous.upper) {
    return true;
  }

  if (next.lower > previous.upper) {
    return false;
  }

  return Boolean(previous.upper_inclusive && next.lower_inclusive);
}

export function getDefaultMiningReleaseRatioRules() {
  return DEFAULT_MINING_PARAMETER_CONFIG.release_ratio_rules.map(cloneReleaseRatioRule);
}

export function getDefaultMiningWalletHashrateAdjustmentRules() {
  return DEFAULT_MINING_PARAMETER_CONFIG.wallet_hashrate_adjustment_rules.map(cloneWalletHashrateAdjustmentRule);
}

export function getDefaultMiningRigHashrateUpgradeRules() {
  return DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_hashrate_upgrade_rules.map(
    cloneMiningRigHashrateUpgradeRule
  );
}

export function normalizeMiningRigHashrateUpgradeRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, false);
  const sourceRules = Array.isArray(parsedRules) ? parsedRules : getDefaultMiningRigHashrateUpgradeRules();

  return sourceRules
    .map((rule) => ({
      hashrate: toNormalizedNonNegativeDecimalString(rule?.hashrate, "0"),
      usdt_amount: toNormalizedNonNegativeDecimalString(
        rule?.usdt_amount ?? rule?.usdtAmount,
        "0"
      ),
      latest_compose_gap: toNormalizedNonNegativeDecimalString(
        rule?.latest_compose_gap ?? rule?.latestComposeGap,
        "0"
      )
    }))
    .filter((rule) => new BigNumber(rule.hashrate).gt(0) && new BigNumber(rule.usdt_amount).gt(0))
    .sort((a, b) => new BigNumber(a.hashrate).comparedTo(b.hashrate));
}

export function validateMiningRigHashrateUpgradeRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, true);
  const usedHashrates = new Set();

  return parsedRules
    .map((rule, index) => {
      const itemIndex = index + 1;
      const hashrate = parseRequiredDecimal(rule?.hashrate, `Hashrate upgrade rule #${itemIndex} hashrate`);
      const usdtAmount = parseRequiredDecimal(
        rule?.usdt_amount ?? rule?.usdtAmount,
        `Hashrate upgrade rule #${itemIndex} USDT amount`
      );
      const latestComposeGap = parseRequiredDecimal(
        rule?.latest_compose_gap ?? rule?.latestComposeGap ?? "0",
        `Hashrate upgrade rule #${itemIndex} latest compose gap`
      );

      if (hashrate.lte(0)) {
        throw new Error(`Hashrate upgrade rule #${itemIndex} hashrate must be greater than 0`);
      }
      if (usdtAmount.lte(0)) {
        throw new Error(`Hashrate upgrade rule #${itemIndex} USDT amount must be greater than 0`);
      }
      if (latestComposeGap.lt(0)) {
        throw new Error(`Hashrate upgrade rule #${itemIndex} latest compose gap must be greater than or equal to 0`);
      }

      const normalizedHashrate = hashrate.toFixed();
      if (usedHashrates.has(normalizedHashrate)) {
        throw new Error("Hashrate upgrade rules cannot contain duplicate hashrate values");
      }
      usedHashrates.add(normalizedHashrate);

      return {
        hashrate: normalizedHashrate,
        usdt_amount: usdtAmount.toFixed(),
        latest_compose_gap: latestComposeGap.toFixed()
      };
    })
    .sort((a, b) => new BigNumber(a.hashrate).comparedTo(b.hashrate));
}

function compareLinearReleaseRules(a, b) {
  return Number(b?.period_days || 0) - Number(a?.period_days || 0);
}

function compareManagementFeeRules(a, b) {
  return Number(a?.duration_days || 0) - Number(b?.duration_days || 0);
}

export function getDefaultManagementFeeRules() {
  return DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.rules.map(cloneManagementFeeRule);
}

export function getDefaultManagementFeeNeuRules() {
  return DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.neu_rules.map(cloneManagementFeeRule);
}

function cloneManagementFeeMixedPaymentRule(rule) {
  return {
    duration_days: resolveManagementFeeDurationDays(rule, 0),
    management_fee_amount: String(
      rule?.management_fee_amount
        ?? rule?.managementFeeAmount
        ?? rule?.total_fee_amount
        ?? rule?.totalFeeAmount
        ?? "0"
    ),
    fee_amount: String(rule?.fee_amount ?? rule?.feeAmount ?? "0"),
    discount_percent: String(rule?.discount_percent ?? rule?.discountPercent ?? "0")
  };
}

export function getDefaultManagementFeeMixedPaymentRules() {
  return DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.mixed_payment_rules.map(cloneManagementFeeMixedPaymentRule);
}

export function getDefaultStaticLinearReleaseRules() {
  return DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.static_rules.map(cloneLinearReleaseRule);
}

export function normalizeMiningReleaseRatioRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, false);
  const sourceRules = Array.isArray(parsedRules) && parsedRules.length > 0 ? parsedRules : getDefaultMiningReleaseRatioRules();

  return sourceRules
    .map((rule) => ({
      min_nodes: toNormalizedNonNegativeIntegerOrNull(rule?.min_nodes ?? rule?.minNodes, null),
      max_nodes: toNormalizedNonNegativeIntegerOrNull(rule?.max_nodes ?? rule?.maxNodes, null),
      release_percent: toNormalizedDecimalString(rule?.release_percent ?? rule?.releasePercent, "0")
    }))
    .sort(compareRules);
}

export function normalizeMiningWalletHashrateAdjustmentRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, false);
  const sourceRules = Array.isArray(parsedRules) ? parsedRules : [];

  return sourceRules
    .map((rule) => ({
      min_hashrate: rule?.min_hashrate == null || String(rule.min_hashrate).trim() === ""
        ? null
        : toNormalizedDecimalString(rule.min_hashrate, "0"),
      max_hashrate: rule?.max_hashrate == null || String(rule.max_hashrate).trim() === ""
        ? null
        : toNormalizedDecimalString(rule.max_hashrate, "0"),
      adjustment_amount: toNormalizedDecimalString(rule?.adjustment_amount, "0")
    }))
    .sort((a, b) => {
      const aMin = a.min_hashrate == null ? Number.NEGATIVE_INFINITY : Number(a.min_hashrate);
      const bMin = b.min_hashrate == null ? Number.NEGATIVE_INFINITY : Number(b.min_hashrate);
      return aMin - bMin;
    });
}

export function normalizeLinearReleaseRules(rules, fallbackRules = []) {
  const parsedRules = parseLinearReleaseRulesInput(rules, false);
  const defaultRules = Array.isArray(fallbackRules) && fallbackRules.length > 0 ? fallbackRules : [];
  const sourceRules = Array.isArray(parsedRules) && parsedRules.length > 0 ? parsedRules : defaultRules;
  const normalizedRules = sourceRules
    .map((rule) => ({
      period_days: toNormalizedPositiveInteger(rule?.period_days ?? rule?.periodDays, 0),
      fee_percent: toNormalizedDecimalString(rule?.fee_percent ?? rule?.feePercent, "0"),
      income_principal_multiple_step: toNormalizedDecimalString(
        rule?.income_principal_multiple_step
          ?? rule?.incomePrincipalMultipleStep
          ?? rule?.reward_multiple_base
          ?? rule?.rewardMultipleBase,
        "1"
      )
    }))
    .filter((rule) => rule.period_days > 0)
    .sort(compareLinearReleaseRules);

  return normalizedRules.length > 0 ? normalizedRules : defaultRules.map(cloneLinearReleaseRule);
}

export function normalizeLinearReleaseMinAmount(value) {
  const defaults = getDefaultLinearReleaseParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.min_release_amount);
}

export function normalizeLinearReleaseFeePoolDistributionWeekday(value) {
  const defaults = getDefaultLinearReleaseParameterConfig();
  const rawValue = String(value ?? "").trim();

  if (!rawValue && rawValue !== "0") {
    return defaults.fee_pool_distribution_weekday;
  }

  const weekday = Number.parseInt(rawValue, 10);
  return Number.isFinite(weekday) && weekday >= 0 && weekday <= 6
    ? weekday
    : defaults.fee_pool_distribution_weekday;
}

export function normalizeLinearReleaseFeePaymentToken(value) {
  const token = String(value ?? "").trim().toUpperCase();
  return token === LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROHS
    ? LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROHS
    : LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROH;
}

export function validateLinearReleaseFeePaymentToken(value) {
  const token = String(value ?? "").trim().toUpperCase();
  if (token !== LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROH && token !== LINEAR_RELEASE_FEE_PAYMENT_TOKEN_ROHS) {
    throw new Error("Linear release fee payment token must be ROH or ROHS");
  }
  return token;
}

export function normalizeManagementFeeRules(rules, fallbackRules = []) {
  const parsedRules = parseManagementFeeRulesInput(rules, false);
  const defaultRules = Array.isArray(fallbackRules) && fallbackRules.length > 0 ? fallbackRules : [];
  const sourceRules = Array.isArray(parsedRules) && parsedRules.length > 0 ? parsedRules : defaultRules;
  const normalizedRules = sourceRules
    .map((rule) => ({
      duration_days: resolveManagementFeeDurationDays(rule, 0),
      fee_amount: toNormalizedDecimalString(rule?.fee_amount ?? rule?.feeAmount, "0"),
      discount_percent: toNormalizedDecimalString(
        rule?.discount_percent ?? rule?.discountPercent,
        "0"
      )
    }))
    .filter((rule) => rule.duration_days > 0)
    .sort(compareManagementFeeRules);

  return normalizedRules.length > 0 ? normalizedRules : defaultRules.map(cloneManagementFeeRule);
}

export function normalizeManagementFeeNeuRules(rules, fallbackRules = []) {
  const parsedRules = parseManagementFeeRulesInput(rules, false);
  const defaultRules = Array.isArray(fallbackRules) ? fallbackRules : [];
  const sourceRules = Array.isArray(parsedRules) ? parsedRules : defaultRules;

  return sourceRules
    .map((rule) => ({
      duration_days: resolveManagementFeeDurationDays(rule, 0),
      fee_amount: toNormalizedDecimalString(rule?.fee_amount ?? rule?.feeAmount, "0"),
      discount_percent: toNormalizedDecimalString(
        rule?.discount_percent ?? rule?.discountPercent,
        "0"
      )
    }))
    .filter((rule) => rule.duration_days > 0)
    .sort(compareManagementFeeRules);
}

export function normalizeLinearReleaseNeuPaymentEnabled(value) {
  const defaults = getDefaultLinearReleaseParameterConfig();
  return normalizeSwitchFlag(value, defaults.neu_payment_enabled);
}

export function validateLinearReleaseNeuPaymentEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Linear release NEU payment enabled must be 0 or 1");
  }
  return normalizedValue;
}

export function normalizeLinearReleaseHyperBoostEnabled(value) {
  const defaults = getDefaultLinearReleaseParameterConfig();
  return normalizeSwitchFlag(value, defaults.hyper_boost_enabled);
}

export function validateLinearReleaseHyperBoostEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Linear release HyperBoost enabled must be 0 or 1");
  }
  return normalizedValue;
}

export function normalizeManagementFeeMixedPaymentRules(rules, fallbackRules = []) {
  const parsedRules = parseManagementFeeRulesInput(rules, false);
  const defaultRules = Array.isArray(fallbackRules) ? fallbackRules : [];
  const sourceRules = Array.isArray(parsedRules) ? parsedRules : defaultRules;

  return sourceRules
    .map((rule) => ({
      duration_days: resolveManagementFeeDurationDays(rule, 0),
      management_fee_amount: toNormalizedDecimalString(
        rule?.management_fee_amount
          ?? rule?.managementFeeAmount
          ?? rule?.total_fee_amount
          ?? rule?.totalFeeAmount,
        "0"
      ),
      fee_amount: toNormalizedDecimalString(rule?.fee_amount ?? rule?.feeAmount, "0"),
      discount_percent: toNormalizedDecimalString(
        rule?.discount_percent ?? rule?.discountPercent,
        "0"
      )
    }))
    .filter((rule) => rule.duration_days > 0)
    .sort(compareManagementFeeRules);
}

export function applyLegacyManagementFeeMixedPaymentTotals(mixedRules, managementFeeRules) {
  const baseFeeByDuration = new Map(
    (Array.isArray(managementFeeRules) ? managementFeeRules : []).map((rule) => [
      Number(rule?.duration_days || 0),
      String(rule?.fee_amount || "0")
    ])
  );

  return (Array.isArray(mixedRules) ? mixedRules : []).map((rule) => {
    const totalFee = new BigNumber(String(rule?.management_fee_amount || "0"));
    return totalFee.isFinite() && totalFee.gt(0)
      ? rule
      : {
          ...rule,
          management_fee_amount: baseFeeByDuration.get(Number(rule?.duration_days || 0)) || "0"
        };
  });
}

export function validateMiningReleaseRatioRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, true);

  if (!Array.isArray(parsedRules) || parsedRules.length < 1) {
    throw new Error("Mining release ratio rules are required");
  }

  const normalizedRules = parsedRules.map((rule, index) => {
    const itemIndex = index + 1;
    const minNodes = parseOptionalNonNegativeInteger(
      rule?.min_nodes ?? rule?.minNodes,
      `Mining release rule #${itemIndex} minimum nodes`
    );
    const maxNodes = parseOptionalNonNegativeInteger(
      rule?.max_nodes ?? rule?.maxNodes,
      `Mining release rule #${itemIndex} maximum nodes`
    );

    if (minNodes === null && maxNodes === null) {
      throw new Error(`Mining release rule #${itemIndex} must set at least one node condition`);
    }

    if (minNodes !== null && maxNodes !== null && maxNodes < minNodes) {
      throw new Error(`Mining release rule #${itemIndex} maximum nodes must be greater than or equal to minimum nodes`);
    }

    const releasePercent = parseRequiredDecimal(
      rule?.release_percent ?? rule?.releasePercent,
      `Mining release rule #${itemIndex} release percent`
    );

    if (releasePercent.lt(0) || releasePercent.gt(100)) {
      throw new Error(`Mining release rule #${itemIndex} release percent must be between 0 and 100`);
    }

    return {
      min_nodes: minNodes,
      max_nodes: maxNodes,
      release_percent: releasePercent.toFixed()
    };
  });

  const sortedRules = [...normalizedRules].sort(compareRules);

  for (let i = 1; i < sortedRules.length; i += 1) {
    if (intervalsOverlap(sortedRules[i - 1], sortedRules[i])) {
      throw new Error("Mining release ratio rules cannot overlap");
    }
  }

  return sortedRules;
}

export function validateMiningWalletHashrateAdjustmentRules(rules) {
  const parsedRules = parseReleaseRatioRulesInput(rules, true);

  if (!Array.isArray(parsedRules)) {
    throw new Error("Mining rig hashrate adjustment rules are invalid");
  }
  if (parsedRules.length > 100) {
    throw new Error("A maximum of 100 mining rig hashrate adjustment rules is allowed");
  }

  const normalizedRules = parsedRules.map((rule, index) => {
    const itemIndex = index + 1;
    const minText = String(rule?.min_hashrate ?? rule?.minHashrate ?? "").trim();
    const maxText = String(rule?.max_hashrate ?? rule?.maxHashrate ?? "").trim();
    const minHashrate = minText ? parseRequiredDecimal(minText, `Mining rig hashrate rule #${itemIndex} minimum hashrate`) : null;
    const maxHashrate = maxText ? parseRequiredDecimal(maxText, `Mining rig hashrate rule #${itemIndex} maximum hashrate`) : null;

    if (minHashrate === null && maxHashrate === null) {
      throw new Error(`Mining rig hashrate rule #${itemIndex} must set at least one hashrate condition`);
    }
    if (minHashrate?.lt(0) || maxHashrate?.lt(0)) {
      throw new Error(`Mining rig hashrate rule #${itemIndex} hashrate must be greater than or equal to 0`);
    }
    if (minHashrate !== null && maxHashrate !== null && maxHashrate.lte(minHashrate)) {
      throw new Error(`Mining rig hashrate rule #${itemIndex} maximum hashrate must be greater than minimum hashrate`);
    }

    const adjustmentAmount = parseRequiredDecimal(
      rule?.adjustment_amount ?? rule?.adjustmentAmount,
      `Mining rig hashrate rule #${itemIndex} adjustment amount`
    );
    if (adjustmentAmount.decimalPlaces() > 8) {
      throw new Error(`Mining rig hashrate rule #${itemIndex} adjustment amount precision cannot exceed 8 decimals`);
    }

    return {
      min_hashrate: minHashrate?.toFixed() ?? null,
      max_hashrate: maxHashrate?.toFixed() ?? null,
      adjustment_amount: adjustmentAmount.toFixed()
    };
  });

  const sortedRules = [...normalizedRules].sort((a, b) => {
    if (a.min_hashrate === null) return -1;
    if (b.min_hashrate === null) return 1;
    return new BigNumber(a.min_hashrate).comparedTo(b.min_hashrate);
  });

  for (let i = 1; i < sortedRules.length; i += 1) {
    const previous = sortedRules[i - 1];
    const current = sortedRules[i];
    if (previous.max_hashrate === null || current.min_hashrate === null || new BigNumber(current.min_hashrate).lt(previous.max_hashrate)) {
      throw new Error("Mining rig hashrate adjustment rules cannot overlap");
    }
  }

  return sortedRules;
}

export function validateManagementFeeRules(rules, labelPrefix = "Management fee") {
  const parsedRules = parseManagementFeeRulesInput(rules, true)
    .filter((rule) => {
      const hasDuration = String(
        rule?.duration_days ??
          rule?.durationDays ??
          rule?.duration_months ??
          rule?.durationMonths ??
          ""
      ).trim();
      const hasFeeAmount = String(rule?.fee_amount ?? rule?.feeAmount ?? "").trim();
      const hasDiscountPercent = String(
        rule?.discount_percent ?? rule?.discountPercent ?? ""
      ).trim();
      return hasDuration || hasFeeAmount || hasDiscountPercent;
    });

  if (!Array.isArray(parsedRules) || parsedRules.length < 1) {
    throw new Error(`${labelPrefix} rules are required`);
  }

  const normalizedRules = parsedRules.map((rule, index) => {
    const itemIndex = index + 1;
    const durationDays = parseManagementFeeDurationDays(rule, `${labelPrefix} rule #${itemIndex} duration days`);
    const feeAmount = parseRequiredDecimal(
      rule?.fee_amount ?? rule?.feeAmount,
      `${labelPrefix} rule #${itemIndex} fee amount`
    );

    if (feeAmount.lt(0)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} fee amount must be greater than or equal to 0`);
    }

    const discountPercent = parseRequiredDecimal(
      rule?.discount_percent ?? rule?.discountPercent ?? "0",
      `${labelPrefix} rule #${itemIndex} discount percent`
    );

    if (discountPercent.gt(100)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} discount percent must be less than or equal to 100`);
    }

    return {
      duration_days: durationDays,
      fee_amount: feeAmount.toFixed(),
      discount_percent: discountPercent.toFixed()
    };
  });

  const sortedRules = [...normalizedRules].sort(compareManagementFeeRules);
  const usedDurationDays = new Set();

  for (const rule of sortedRules) {
    if (usedDurationDays.has(rule.duration_days)) {
      throw new Error(`${labelPrefix} rules cannot contain duplicate duration days`);
    }

    usedDurationDays.add(rule.duration_days);
  }

  return sortedRules;
}

export function validateManagementFeeNeuRules(rules, labelPrefix = "NEU management fee") {
  const parsedRules = parseManagementFeeRulesInput(rules, true);
  if (!Array.isArray(parsedRules) || parsedRules.length < 1) {
    return [];
  }

  return validateManagementFeeRules(parsedRules, labelPrefix);
}

export function validateManagementFeeMixedPaymentRules(rules, labelPrefix = "Mixed management fee") {
  const parsedRules = parseManagementFeeRulesInput(rules, true);
  if (!Array.isArray(parsedRules) || parsedRules.length < 1) {
    return [];
  }

  const normalizedRules = parsedRules.map((rule, index) => {
    const itemIndex = index + 1;
    const durationDays = parseManagementFeeDurationDays(
      rule,
      `${labelPrefix} rule #${itemIndex} duration days`
    );
    const managementFeeAmount = parseRequiredDecimal(
      rule?.management_fee_amount
        ?? rule?.managementFeeAmount
        ?? rule?.total_fee_amount
        ?? rule?.totalFeeAmount,
      `${labelPrefix} rule #${itemIndex} total management fee`
    );
    const paymentUsdtAmount = parseRequiredDecimal(
      rule?.fee_amount ?? rule?.feeAmount,
      `${labelPrefix} rule #${itemIndex} payment U amount`
    );
    const discountPercent = parseRequiredDecimal(
      rule?.discount_percent ?? rule?.discountPercent ?? "0",
      `${labelPrefix} rule #${itemIndex} discount percent`
    );

    if (managementFeeAmount.lte(0)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} total management fee must be greater than 0`);
    }
    if (paymentUsdtAmount.lte(0) || paymentUsdtAmount.gte(managementFeeAmount)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} payment U amount must be greater than 0 and less than total management fee`);
    }
    if (discountPercent.gt(100)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} discount percent must be less than or equal to 100`);
    }

    return {
      duration_days: durationDays,
      management_fee_amount: managementFeeAmount.toFixed(),
      fee_amount: paymentUsdtAmount.toFixed(),
      discount_percent: discountPercent.toFixed()
    };
  }).sort(compareManagementFeeRules);

  const usedDurationDays = new Set();
  for (const rule of normalizedRules) {
    if (usedDurationDays.has(rule.duration_days)) {
      throw new Error(`${labelPrefix} rules cannot contain duplicate duration days`);
    }
    usedDurationDays.add(rule.duration_days);
  }

  return normalizedRules;
}

export function normalizeManagementFeeOverdueDestroyDays(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return normalizeNonNegativeInteger(value, defaults.overdue_destroy_days);
}

export function validateManagementFeeOverdueDestroyDays(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    throw new Error("Management fee overdue destroy days is required");
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error("Management fee overdue destroy days must be greater than or equal to 0");
  }

  return parsedValue;
}

export function normalizeManagementFeeAutoRenewEnabled(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return normalizeSwitchFlag(value, defaults.auto_renew_enabled);
}

export function validateManagementFeeAutoRenewEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);

  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Management fee auto renewal must be 0 or 1");
  }

  return normalizedValue;
}

export function validateLinearReleaseRules(rules, labelPrefix = "Linear release") {
  const parsedRules = parseLinearReleaseRulesInput(rules, true);

  if (!Array.isArray(parsedRules) || parsedRules.length < 1) {
    throw new Error(`${labelPrefix} rules are required`);
  }

  const normalizedRules = parsedRules.map((rule, index) => {
    const itemIndex = index + 1;
    const periodDays = parseRequiredPositiveInteger(
      rule?.period_days ?? rule?.periodDays,
      `${labelPrefix} rule #${itemIndex} period days`
    );
    const feePercent = parseRequiredDecimal(
      rule?.fee_percent ?? rule?.feePercent,
      `${labelPrefix} rule #${itemIndex} fee percent`
    );

    if (feePercent.lt(0) || feePercent.gt(100)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} fee percent must be between 0 and 100`);
    }
    const incomePrincipalMultipleStep = parseRequiredDecimal(
      rule?.income_principal_multiple_step
        ?? rule?.incomePrincipalMultipleStep
        ?? rule?.reward_multiple_base
        ?? rule?.rewardMultipleBase
        ?? "1",
      `${labelPrefix} rule #${itemIndex} income principal multiple step`
    );

    if (incomePrincipalMultipleStep.lt(0)) {
      throw new Error(`${labelPrefix} rule #${itemIndex} income principal multiple step must be greater than or equal to 0`);
    }

    return {
      period_days: periodDays,
      fee_percent: feePercent.toFixed(),
      income_principal_multiple_step: incomePrincipalMultipleStep.toFixed()
    };
  });

  const sortedRules = [...normalizedRules].sort(compareLinearReleaseRules);
  const usedPeriodDays = new Set();

  for (const rule of sortedRules) {
    if (usedPeriodDays.has(rule.period_days)) {
      throw new Error(`${labelPrefix} rules cannot contain duplicate period days`);
    }

    usedPeriodDays.add(rule.period_days);
  }

  return sortedRules;
}

export function validateLinearReleaseMinAmount(value) {
  const defaults = getDefaultLinearReleaseParameterConfig();
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaults.min_release_amount;
  }

  const minAmount = new BigNumber(rawValue);
  if (!minAmount.isFinite() || minAmount.isNaN() || minAmount.lt(0)) {
    throw new Error("Linear release minimum amount must be greater than or equal to 0");
  }

  return minAmount.toFixed();
}

export function validateTeamLinearReleaseFeeRules(rules, staticRules = [], labelPrefix = "Team linear release fee") {
  const parsedRules = parseLinearReleaseRulesInput(rules, true);

  if (!Array.isArray(parsedRules)) {
    throw new Error(`${labelPrefix} rules are invalid`);
  }

  const allowedPeriods = new Set(
    (Array.isArray(staticRules) ? staticRules : [])
      .map((rule) => Number(rule?.period_days || 0))
      .filter((periodDays) => periodDays > 0)
  );
  const usedKeys = new Set();

  return parsedRules
    .map((rule, index) => {
      const itemIndex = index + 1;
      const wallet = String(rule?.wallet ?? "").trim();
      if (!wallet) {
        throw new Error(`${labelPrefix} rule #${itemIndex} wallet is required`);
      }

      const periodDays = parseRequiredPositiveInteger(
        rule?.period_days ?? rule?.periodDays,
        `${labelPrefix} rule #${itemIndex} period days`
      );

      if (allowedPeriods.size > 0 && !allowedPeriods.has(periodDays)) {
        throw new Error(`${labelPrefix} rule #${itemIndex} period days must exist in static linear release rules`);
      }

      const feeIncrementPercent = parseRequiredDecimal(
        rule?.fee_increment_percent ?? rule?.feeIncrementPercent,
        `${labelPrefix} rule #${itemIndex} fee increment percent`
      );

      if (feeIncrementPercent.lt(0)) {
        throw new Error(`${labelPrefix} rule #${itemIndex} fee increment percent must be greater than or equal to 0`);
      }

      const key = `${wallet.toLowerCase()}#${periodDays}`;
      if (usedKeys.has(key)) {
        throw new Error(`${labelPrefix} rules cannot contain duplicate wallet and period days`);
      }
      usedKeys.add(key);

      return {
        wallet,
        period_days: periodDays,
        fee_increment_percent: feeIncrementPercent.toFixed(),
        enabled: ["0", "false", "off", "disabled", "no"].includes(
          String(rule?.enabled ?? rule?.release_enabled ?? rule?.releaseEnabled ?? "1").trim().toLowerCase()
        ) ? 0 : 1
      };
    })
    .sort((a, b) => a.wallet.localeCompare(b.wallet) || compareLinearReleaseRules(a, b));
}

export function validateLinearReleaseFeePoolDistributionWeekday(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue && rawValue !== "0") {
    throw new Error("Linear release fee pool distribution weekday is required");
  }

  const weekday = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Linear release fee pool distribution weekday must be between 0 and 6");
  }

  return weekday;
}

export function getDefaultMiningParameterConfig() {
  return {
    start_date: DEFAULT_MINING_PARAMETER_CONFIG.start_date,
    output_enabled: DEFAULT_MINING_PARAMETER_CONFIG.output_enabled,
    total_output: DEFAULT_MINING_PARAMETER_CONFIG.total_output,
    initial_output: DEFAULT_MINING_PARAMETER_CONFIG.initial_output,
    weekly_decrease_percent: DEFAULT_MINING_PARAMETER_CONFIG.weekly_decrease_percent,
    release_ratio_rules: getDefaultMiningReleaseRatioRules(),
    wallet_hashrate_adjustment_rules: getDefaultMiningWalletHashrateAdjustmentRules()
  };
}

export function getDefaultManagementFeeParameterConfig() {
  return {
    insurance_price: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.insurance_price,
    insurance_purchase_mode: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.insurance_purchase_mode,
    insurance_purchase_start_date: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.insurance_purchase_start_date,
    insurance_monthly_return_percent: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.insurance_monthly_return_percent,
    overdue_destroy_days: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.overdue_destroy_days,
    auto_renew_enabled: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.auto_renew_enabled,
    rohs_usdt_price: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.rohs_usdt_price,
    first_renew_rohs_enabled: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.first_renew_rohs_enabled,
    rohs_daily_rig_limit: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.rohs_daily_rig_limit,
    reward_bottom_pool_percent: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.reward_bottom_pool_percent,
    bottom_pool_percent: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.bottom_pool_percent,
    neu_enabled: DEFAULT_MANAGEMENT_FEE_PARAMETER_CONFIG.neu_enabled,
    neu_rules: getDefaultManagementFeeNeuRules(),
    mixed_payment_rules: getDefaultManagementFeeMixedPaymentRules(),
    rules: getDefaultManagementFeeRules()
  };
}

export function normalizeManagementFeeFirstRenewRohsEnabled(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return normalizeSwitchFlag(value, defaults.first_renew_rohs_enabled);
}

export function validateManagementFeeFirstRenewRohsEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);

  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Allow ROHS for first Agents renewal must be 0 or 1");
  }

  return normalizedValue;
}

export function normalizeManagementFeeRohsUsdtPrice(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return toNormalizedDecimalString(value, defaults.rohs_usdt_price);
}

export function validateManagementFeeRohsUsdtPrice(value) {
  const decimalValue = parseRequiredDecimal(value, "Management fee ROHS value (U)");

  if (decimalValue.lt(0)) {
    throw new Error("Management fee ROHS value (U) must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function getDefaultLinearReleaseParameterConfig() {
  return {
    min_release_amount: DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.min_release_amount,
    fee_pool_distribution_weekday: DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.fee_pool_distribution_weekday,
    fee_payment_token: DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.fee_payment_token,
    neu_payment_enabled: DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.neu_payment_enabled,
    hyper_boost_enabled: DEFAULT_LINEAR_RELEASE_PARAMETER_CONFIG.hyper_boost_enabled,
    static_rules: getDefaultStaticLinearReleaseRules()
  };
}

export function getDefaultPurchaseComposeParameterConfig() {
  return {
    mining_rig_purchase_limit: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_purchase_limit,
    hashrate_compensation_start_date:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.hashrate_compensation_start_date,
    hashrate_compensation_base_hashrate:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.hashrate_compensation_base_hashrate,
    hashrate_compensation_percent: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.hashrate_compensation_percent,
    hashrate_compensation_end_date: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.hashrate_compensation_end_date,
    mining_rig_compose_price: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_compose_price,
    mining_rig_compose_roh_usdt_price:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_compose_roh_usdt_price,
    mining_rig_compose_bottom_pool_percent:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_compose_bottom_pool_percent,
    mining_rig_compose_hashpower_multiplier:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_compose_hashpower_multiplier,
    mining_rig_transfer_enabled: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_transfer_enabled,
    mining_rig_transfer_price: DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_transfer_price,
    mining_rig_transfer_rohs_enabled:
      DEFAULT_PURCHASE_COMPOSE_PARAMETER_CONFIG.mining_rig_transfer_rohs_enabled,
    mining_rig_hashrate_upgrade_rules: getDefaultMiningRigHashrateUpgradeRules()
  };
}

export function normalizeMiningRigInsurancePrice(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return toNormalizedDecimalString(value, defaults.insurance_price);
}

export function validateMiningRigInsurancePrice(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig insurance price (U)");

  if (decimalValue.lt(0)) {
    throw new Error("Mining rig insurance price (U) must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeMiningRigInsurancePurchaseMode(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  const mode = Number.parseInt(String(value ?? "").trim(), 10);
  return [1, 2].includes(mode) ? mode : defaults.insurance_purchase_mode;
}

export function validateMiningRigInsurancePurchaseMode(value) {
  const mode = Number.parseInt(String(value ?? "").trim(), 10);
  if (![1, 2].includes(mode)) throw new Error("Mining rig insurance purchase mode must be 1 or 2");
  return mode;
}

export function normalizeMiningRigInsurancePurchaseStartDate(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return toNormalizedDateString(value, defaults.insurance_purchase_start_date);
}

export function validateMiningRigInsurancePurchaseStartDate(value) {
  const text = String(value ?? "").trim();
  if (text && !isValidDateString(text)) {
    throw new Error("Mining rig insurance purchase start date must use YYYY-MM-DD format");
  }
  return text;
}

export function normalizeMiningRigInsuranceMonthlyReturnPercent(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  const percent = new BigNumber(String(value ?? defaults.insurance_monthly_return_percent));
  return percent.isFinite() && percent.gte(0) && percent.lte(100)
    ? percent.toFixed()
    : defaults.insurance_monthly_return_percent;
}

export function validateMiningRigInsuranceMonthlyReturnPercent(value) {
  const percent = parseRequiredDecimal(value, "Mining rig insurance monthly return percent");
  if (percent.lt(0) || percent.gt(100)) {
    throw new Error("Mining rig insurance monthly return percent must be between 0 and 100");
  }
  return percent.toFixed();
}

export function normalizeManagementFeeNeuEnabled(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return normalizeSwitchFlag(value, defaults.neu_enabled);
}

export function validateManagementFeeNeuEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);
  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("NEU management fee enabled must be 0 or 1");
  }
  return normalizedValue;
}

export function getDefaultOtherParameterConfig() {
  return {
    c2c_trading_enabled: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_trading_enabled,
    c2c_trading_limit_mode: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_trading_limit_mode,
    c2c_trading_price: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_trading_price,
    c2c_trading_floating_ratio: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_trading_floating_ratio,
    c2c_seller_fee: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_seller_fee,
    c2c_seller_fee_bottom_pool_percent: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_seller_fee_bottom_pool_percent,
    c2c_bottom_pool_hashpower_multiplier: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_bottom_pool_hashpower_multiplier,
    c2c_relation_priority_hours: DEFAULT_OTHER_PARAMETER_CONFIG.c2c_relation_priority_hours,
    swap_enabled: DEFAULT_OTHER_PARAMETER_CONFIG.swap_enabled,
    swap_reverse_enabled: DEFAULT_OTHER_PARAMETER_CONFIG.swap_reverse_enabled,
    swap_min_amount: DEFAULT_OTHER_PARAMETER_CONFIG.swap_min_amount,
    swap_max_amount: DEFAULT_OTHER_PARAMETER_CONFIG.swap_max_amount,
    swap_min_pending_rohs_amount: DEFAULT_OTHER_PARAMETER_CONFIG.swap_min_pending_rohs_amount,
    swap_price_min_value: DEFAULT_OTHER_PARAMETER_CONFIG.swap_price_min_value,
    swap_price_max_value: DEFAULT_OTHER_PARAMETER_CONFIG.swap_price_max_value,
    swap_daily_roh_limit: DEFAULT_OTHER_PARAMETER_CONFIG.swap_daily_roh_limit,
    swap_daily_usdt_limit: DEFAULT_OTHER_PARAMETER_CONFIG.swap_daily_usdt_limit,
    swap_roh_telegram_notify_threshold: DEFAULT_OTHER_PARAMETER_CONFIG.swap_roh_telegram_notify_threshold,
    swap_usdt_telegram_notify_threshold: DEFAULT_OTHER_PARAMETER_CONFIG.swap_usdt_telegram_notify_threshold,
    swap_fee_type: DEFAULT_OTHER_PARAMETER_CONFIG.swap_fee_type,
    swap_fee_min_value: DEFAULT_OTHER_PARAMETER_CONFIG.swap_fee_min_value,
    swap_fee_max_value: DEFAULT_OTHER_PARAMETER_CONFIG.swap_fee_max_value,
    swap_fee_value: DEFAULT_OTHER_PARAMETER_CONFIG.swap_fee_value
  };
}

export function normalizeMiningParameterConfig(config) {
  const defaults = getDefaultMiningParameterConfig();
  const totalOutput = toNormalizedDecimalString(config?.total_output, defaults.total_output);
  const weeklyDecreasePercent = toNormalizedDecimalString(
    config?.weekly_decrease_percent,
    defaults.weekly_decrease_percent
  );
  const initialOutputDefault = calculateMiningInitialOutputByTotalOutput(
    totalOutput,
    weeklyDecreasePercent,
    defaults.initial_output
  );

  return {
    start_date: toNormalizedDateString(config?.start_date, defaults.start_date),
    output_enabled: normalizeSwitchFlag(config?.output_enabled, defaults.output_enabled),
    total_output: totalOutput,
    initial_output: toNormalizedDecimalString(config?.initial_output, initialOutputDefault),
    weekly_decrease_percent: weeklyDecreasePercent,
    release_ratio_rules: normalizeMiningReleaseRatioRules(config?.release_ratio_rules),
    wallet_hashrate_adjustment_rules: normalizeMiningWalletHashrateAdjustmentRules(
      config?.wallet_hashrate_adjustment_rules
    )
  };
}

export function validateMiningParameterConfig(config) {
  const defaults = getDefaultMiningParameterConfig();
  const startDate = String(config?.start_date ?? "").trim();
  const outputEnabled = String(config?.output_enabled ?? defaults.output_enabled).trim();
  const totalOutput = parseRequiredDecimal(config?.total_output, "Total output");
  const initialOutput = parseRequiredDecimal(config?.initial_output, "Initial output");
  const weeklyDecreasePercent = parseRequiredDecimal(
    config?.weekly_decrease_percent,
    "Weekly decrease percent"
  );

  if (totalOutput.lt(0)) {
    throw new Error("Total output must be greater than or equal to 0");
  }

  if (initialOutput.lt(0)) {
    throw new Error("Initial output must be greater than or equal to 0");
  }

  if (weeklyDecreasePercent.lt(0) || weeklyDecreasePercent.gt(100)) {
    throw new Error("Weekly decrease percent must be between 0 and 100");
  }

  if (startDate && !isValidDateString(startDate)) {
    throw new Error("Mining start date is invalid");
  }

  if (outputEnabled !== "0" && outputEnabled !== "1") {
    throw new Error("Mining output enabled must be 0 or 1");
  }

  return {
    start_date: startDate,
    output_enabled: Number.parseInt(outputEnabled, 10),
    total_output: totalOutput.toFixed(),
    initial_output: initialOutput.toFixed(),
    weekly_decrease_percent: weeklyDecreasePercent.toFixed(),
    release_ratio_rules: validateMiningReleaseRatioRules(config?.release_ratio_rules),
    wallet_hashrate_adjustment_rules: validateMiningWalletHashrateAdjustmentRules(
      config?.wallet_hashrate_adjustment_rules
    )
  };
}

export function matchMiningReleaseRatioRule(nodeCount, rules) {
  const normalizedNodeCount = Number.parseInt(String(nodeCount ?? "").trim(), 10);

  if (!Number.isFinite(normalizedNodeCount) || normalizedNodeCount < 0) {
    return null;
  }

  const normalizedRules = normalizeMiningReleaseRatioRules(rules);

  for (const rule of normalizedRules) {
    const minNodes = Number.isFinite(rule.min_nodes) ? Number(rule.min_nodes) : null;
    const maxNodes = Number.isFinite(rule.max_nodes) ? Number(rule.max_nodes) : null;

    if (minNodes === null && maxNodes !== null) {
      if (normalizedNodeCount < maxNodes) {
        return rule;
      }
      continue;
    }

    if (minNodes !== null && maxNodes === null) {
      if (normalizedNodeCount >= minNodes) {
        return rule;
      }
      continue;
    }

    if (normalizedNodeCount >= (minNodes ?? 0) && normalizedNodeCount <= (maxNodes ?? Number.MAX_SAFE_INTEGER)) {
      return rule;
    }
  }

  return null;
}

export function getMiningReleasePercentByNodeCount(nodeCount, rules) {
  const matchedRule = matchMiningReleaseRatioRule(nodeCount, rules);
  return matchedRule?.release_percent ?? "0";
}

export function normalizeMiningRigPurchaseLimit(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return normalizeNonNegativeInteger(value, defaults.mining_rig_purchase_limit);
}

export function validateMiningRigPurchaseLimit(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    throw new Error("Mining rig purchase limit is required");
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error("Mining rig purchase limit must be greater than or equal to 0");
  }

  return parsedValue;
}

export function normalizeHashrateCompensationStartDate(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDateString(value, defaults.hashrate_compensation_start_date);
}

export function validateHashrateCompensationStartDate(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  if (!isValidDateString(rawValue)) {
    throw new Error("Hashrate compensation start date is invalid");
  }

  return rawValue;
}

export function normalizeHashrateCompensationBaseHashrate(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDecimalString(value, defaults.hashrate_compensation_base_hashrate);
}

export function validateHashrateCompensationBaseHashrate(value) {
  const decimalValue = parseRequiredDecimal(value, "Hashrate compensation base hashrate");

  if (decimalValue.lt(0)) {
    throw new Error("Hashrate compensation base hashrate must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeHashrateCompensationPercent(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDecimalString(value, defaults.hashrate_compensation_percent);
}

export function validateHashrateCompensationPercent(value) {
  const decimalValue = parseRequiredDecimal(value, "Hashrate compensation percent");

  if (decimalValue.lt(0) || decimalValue.gt(100)) {
    throw new Error("Hashrate compensation percent must be between 0 and 100");
  }

  return decimalValue.toFixed();
}

export function normalizeHashrateCompensationEndDate(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDateString(value, defaults.hashrate_compensation_end_date);
}

export function validateHashrateCompensationEndDate(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  if (!isValidDateString(rawValue)) {
    throw new Error("Hashrate compensation end date is invalid");
  }

  return rawValue;
}

export function normalizeMiningRigComposePrice(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDecimalString(value, defaults.mining_rig_compose_price);
}

export function validateMiningRigComposePrice(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig compose price");

  if (decimalValue.lt(0)) {
    throw new Error("Mining rig compose price must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

function toNormalizedNonNegativeDecimalString(value, defaultValue = "0") {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return defaultValue;
  }

  const decimalValue = new BigNumber(rawValue);
  if (!decimalValue.isFinite() || decimalValue.isNaN() || decimalValue.lt(0)) {
    return defaultValue;
  }

  return decimalValue.toFixed();
}

export function normalizeMiningRigComposeRohUsdtPrice(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDecimalString(value, defaults.mining_rig_compose_roh_usdt_price);
}

export function validateMiningRigComposeRohUsdtPrice(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig compose ROH USDT price");

  if (decimalValue.lte(0)) {
    throw new Error("Mining rig compose ROH USDT price must be greater than 0");
  }

  return decimalValue.toFixed();
}

export function normalizeManagementFeeRewardBottomPoolPercent(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  const percent = new BigNumber(String(value ?? defaults.reward_bottom_pool_percent));
  return percent.isFinite() && percent.gte(0) && percent.lte(100)
    ? percent.toFixed()
    : defaults.reward_bottom_pool_percent;
}

export function validateManagementFeeRewardBottomPoolPercent(value) {
  const percent = parseRequiredDecimal(value, "Management fee reward bottom pool percent");
  if (percent.lt(0) || percent.gt(100)) {
    throw new Error("Management fee reward bottom pool percent must be between 0 and 100");
  }
  return percent.toFixed();
}

export function normalizeManagementFeeBottomPoolPercent(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  const percent = new BigNumber(String(value ?? defaults.bottom_pool_percent));
  return percent.isFinite() && percent.gte(0) && percent.lte(100)
    ? percent.toFixed()
    : defaults.bottom_pool_percent;
}

export function validateManagementFeeBottomPoolPercent(value) {
  const percent = parseRequiredDecimal(value, "Management fee bottom pool percent");
  if (percent.lt(0) || percent.gt(100)) {
    throw new Error("Management fee bottom pool percent must be between 0 and 100");
  }
  return percent.toFixed();
}

export function normalizeMiningRigComposeBottomPoolPercent(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  const decimalValue = new BigNumber(String(value ?? "").trim());

  if (!decimalValue.isFinite() || decimalValue.isNaN() || decimalValue.lt(0) || decimalValue.gt(100)) {
    return defaults.mining_rig_compose_bottom_pool_percent;
  }

  return decimalValue.toFixed();
}

export function validateMiningRigComposeBottomPoolPercent(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig compose bottom pool percent");

  if (decimalValue.lt(0) || decimalValue.gt(100)) {
    throw new Error("Mining rig compose bottom pool percent must be between 0 and 100");
  }

  return decimalValue.toFixed();
}

export function normalizeMiningRigComposeHashpowerMultiplier(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  const decimalValue = new BigNumber(String(value ?? "").trim());

  if (!decimalValue.isFinite() || decimalValue.isNaN() || decimalValue.lte(0)) {
    return defaults.mining_rig_compose_hashpower_multiplier;
  }

  return decimalValue.toFixed();
}

export function validateMiningRigComposeHashpowerMultiplier(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig compose hashpower multiplier");

  if (decimalValue.lte(0)) {
    throw new Error("Mining rig compose hashpower multiplier must be greater than 0");
  }

  return decimalValue.toFixed();
}

export function normalizeManagementFeeRohsDailyRigLimit(value) {
  const defaults = getDefaultManagementFeeParameterConfig();
  return normalizeNonNegativeInteger(value, defaults.rohs_daily_rig_limit);
}

export function validateManagementFeeRohsDailyRigLimit(value) {
  const rawValue = String(value ?? "").trim();
  if (!/^\d+$/.test(rawValue)) {
    throw new Error("Management fee ROHS daily Agents limit must be a non-negative integer");
  }
  const parsedValue = Number(rawValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new Error("Management fee ROHS daily Agents limit is invalid");
  }
  return parsedValue;
}

export function normalizeMiningRigTransferEnabled(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return normalizeSwitchFlag(value, defaults.mining_rig_transfer_enabled);
}

export function validateMiningRigTransferEnabled(value) {
  const rawValue = String(value ?? "").trim();

  if (rawValue !== "0" && rawValue !== "1") {
    throw new Error("Mining rig transfer enabled must be 0 or 1");
  }

  return Number.parseInt(rawValue, 10);
}

export function normalizeMiningRigTransferPrice(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return toNormalizedDecimalString(value, defaults.mining_rig_transfer_price);
}

export function validateMiningRigTransferPrice(value) {
  const decimalValue = parseRequiredDecimal(value, "Mining rig transfer price");

  if (decimalValue.lt(0)) {
    throw new Error("Mining rig transfer price must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeMiningRigTransferRohsEnabled(value) {
  const defaults = getDefaultPurchaseComposeParameterConfig();
  return normalizeSwitchFlag(value, defaults.mining_rig_transfer_rohs_enabled);
}

export function validateMiningRigTransferRohsEnabled(value) {
  const rawValue = String(value ?? "").trim();

  if (rawValue !== "0" && rawValue !== "1") {
    throw new Error("Mining rig transfer ROHS enabled must be 0 or 1");
  }

  return Number.parseInt(rawValue, 10);
}

export function normalizeC2CTradingEnabled(value) {
  const defaults = getDefaultOtherParameterConfig();
  return normalizeSwitchFlag(value, defaults.c2c_trading_enabled);
}

export function validateC2CTradingEnabled(value) {
  const rawValue = String(value ?? "").trim();

  if (rawValue !== "0" && rawValue !== "1") {
    throw new Error("C2C trading enabled must be 0 or 1");
  }

  return Number.parseInt(rawValue, 10);
}

export function normalizeC2CTradingLimitMode(value) {
  const defaults = getDefaultOtherParameterConfig();
  return normalizeSwitchFlag(value, defaults.c2c_trading_limit_mode);
}

export function validateC2CTradingLimitMode(value) {
  const rawValue = String(value ?? "").trim();

  if (rawValue !== "0" && rawValue !== "1") {
    throw new Error("C2C trading limit mode must be 0 or 1");
  }

  return Number.parseInt(rawValue, 10);
}

export function normalizeC2CTradingPrice(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedDecimalString(value, defaults.c2c_trading_price);
}

export function validateC2CTradingPrice(value) {
  const decimalValue = parseRequiredDecimal(value, "C2C trading price");

  if (decimalValue.lt(0)) {
    throw new Error("C2C trading price must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeC2CTradingFloatingRatio(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedDecimalString(value, defaults.c2c_trading_floating_ratio);
}

export function validateC2CTradingFloatingRatio(value) {
  const decimalValue = parseRequiredDecimal(value, "C2C trading floating ratio");

  if (decimalValue.lt(0) || decimalValue.gt(100)) {
    throw new Error("C2C trading floating ratio must be between 0 and 100");
  }

  return decimalValue.toFixed();
}

export function normalizeC2CSellerFee(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedDecimalString(value, defaults.c2c_seller_fee);
}

export function validateC2CSellerFee(value) {
  const decimalValue = parseRequiredDecimal(value, "C2C seller fee");

  if (decimalValue.lt(0) || decimalValue.gt(100)) {
    throw new Error("C2C seller fee must be between 0 and 100");
  }

  return decimalValue.toFixed();
}

export function normalizeC2CSellerFeeBottomPoolPercent(value) {
  const defaults = getDefaultOtherParameterConfig();
  const decimalValue = new BigNumber(String(value ?? "").trim());

  if (!decimalValue.isFinite() || decimalValue.isNaN() || decimalValue.lt(0) || decimalValue.gt(100)) {
    return defaults.c2c_seller_fee_bottom_pool_percent;
  }

  return decimalValue.toFixed();
}

export function validateC2CSellerFeeBottomPoolPercent(value) {
  const decimalValue = parseRequiredDecimal(value, "C2C seller fee bottom pool percent");

  if (decimalValue.lt(0) || decimalValue.gt(100)) {
    throw new Error("C2C seller fee bottom pool percent must be between 0 and 100");
  }

  return decimalValue.toFixed();
}

export function normalizeC2CBottomPoolHashpowerMultiplier(value) {
  const defaults = getDefaultOtherParameterConfig();
  const decimalValue = new BigNumber(String(value ?? "").trim());

  if (!decimalValue.isFinite() || decimalValue.isNaN() || decimalValue.lte(0)) {
    return defaults.c2c_bottom_pool_hashpower_multiplier;
  }

  return decimalValue.toFixed();
}

export function validateC2CBottomPoolHashpowerMultiplier(value) {
  const decimalValue = parseRequiredDecimal(value, "C2C bottom pool hashpower multiplier");

  if (decimalValue.lte(0)) {
    throw new Error("C2C bottom pool hashpower multiplier must be greater than 0");
  }

  return decimalValue.toFixed();
}

export function normalizeC2CRelationPriorityHours(value) {
  const defaults = getDefaultOtherParameterConfig();
  return normalizeNonNegativeInteger(value, defaults.c2c_relation_priority_hours);
}

export function validateC2CRelationPriorityHours(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    throw new Error("C2C relation priority hours is required");
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error("C2C relation priority hours must be greater than or equal to 0");
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error("C2C relation priority hours must be greater than or equal to 0");
  }

  return parsedValue;
}

export function normalizeSwapEnabled(value) {
  const defaults = getDefaultOtherParameterConfig();
  return normalizeSwitchFlag(value, defaults.swap_enabled);
}

export function normalizeSwapReverseEnabled(value) {
  const defaults = getDefaultOtherParameterConfig();
  return normalizeSwitchFlag(value, defaults.swap_reverse_enabled);
}

export function validateSwapEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);

  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Swap enabled must be 0 or 1");
  }

  return normalizedValue;
}

export function validateSwapReverseEnabled(value) {
  const normalizedValue = normalizeSwitchFlag(value, null);

  if (normalizedValue !== 0 && normalizedValue !== 1) {
    throw new Error("Swap reverse enabled must be 0 or 1");
  }

  return normalizedValue;
}

export function normalizeSwapMinAmount(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_min_amount);
}

export function validateSwapMinAmount(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap minimum amount");

  if (decimalValue.lt(0)) {
    throw new Error("Swap minimum amount must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeSwapMaxAmount(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_max_amount);
}

export function normalizeSwapMinPendingRohsAmount(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_min_pending_rohs_amount);
}

export function normalizeSwapPriceMinValue(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_price_min_value);
}

export function normalizeSwapPriceMaxValue(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_price_max_value);
}

export function normalizeSwapDailyRohLimit(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_daily_roh_limit);
}

export function normalizeSwapDailyUsdtLimit(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_daily_usdt_limit);
}

export function normalizeSwapRohTelegramNotifyThreshold(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_roh_telegram_notify_threshold);
}

export function normalizeSwapUsdtTelegramNotifyThreshold(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_usdt_telegram_notify_threshold);
}

export function validateSwapMaxAmount(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap maximum amount");

  if (decimalValue.lt(0)) {
    throw new Error("Swap maximum amount must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapMinPendingRohsAmount(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap minimum pending ROHs amount");

  if (decimalValue.lt(0)) {
    throw new Error("Swap minimum pending ROHs amount must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapPriceMinValue(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap minimum price");

  if (decimalValue.lt(0)) {
    throw new Error("Swap minimum price must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapPriceMaxValue(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap maximum price");

  if (decimalValue.lt(0)) {
    throw new Error("Swap maximum price must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapDailyRohLimit(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap daily ROH limit");

  if (decimalValue.lt(0)) {
    throw new Error("Swap daily ROH limit must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapDailyUsdtLimit(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap daily USDT limit");

  if (decimalValue.lt(0)) {
    throw new Error("Swap daily USDT limit must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapRohTelegramNotifyThreshold(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap ROH telegram notify threshold");

  if (decimalValue.lt(0)) {
    throw new Error("Swap ROH telegram notify threshold must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function validateSwapUsdtTelegramNotifyThreshold(value) {
  const decimalValue = parseRequiredDecimal(value, "Swap USDT telegram notify threshold");

  if (decimalValue.lt(0)) {
    throw new Error("Swap USDT telegram notify threshold must be greater than or equal to 0");
  }

  return decimalValue.toFixed();
}

export function normalizeSwapFeeType(value) {
  const defaults = getDefaultOtherParameterConfig();
  const type = String(value ?? "").trim().toLowerCase();

  if (type === SWAP_FEE_TYPE_FIXED || type === SWAP_FEE_TYPE_PERCENT) {
    return type;
  }

  return defaults.swap_fee_type;
}

export function validateSwapFeeType(value) {
  const type = String(value ?? "").trim().toLowerCase();

  if (type !== SWAP_FEE_TYPE_FIXED && type !== SWAP_FEE_TYPE_PERCENT) {
    throw new Error("Swap fee type must be fixed or percent");
  }

  return type;
}

export function normalizeSwapFeeValue(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_fee_value);
}

export function normalizeSwapFeeMinValue(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_fee_min_value);
}

export function normalizeSwapFeeMaxValue(value) {
  const defaults = getDefaultOtherParameterConfig();
  return toNormalizedNonNegativeDecimalString(value, defaults.swap_fee_max_value);
}

function validateSwapFeeBoundaryValue(value, feeType, label) {
  const decimalValue = parseRequiredDecimal(value, label);

  if (decimalValue.lt(0)) {
    throw new Error(`${label} must be greater than or equal to 0`);
  }

  if (feeType === SWAP_FEE_TYPE_PERCENT && decimalValue.gt(100)) {
    throw new Error(`${label} must be between 0 and 100`);
  }

  return decimalValue.toFixed();
}

export function validateSwapFeeValue(value, feeType = SWAP_FEE_TYPE_PERCENT) {
  return validateSwapFeeBoundaryValue(value, feeType, "Swap fee value");
}

export function validateSwapFeeMinValue(value, feeType = SWAP_FEE_TYPE_PERCENT) {
  return validateSwapFeeBoundaryValue(value, feeType, "Swap minimum fee value");
}

export function validateSwapFeeMaxValue(value, feeType = SWAP_FEE_TYPE_PERCENT) {
  return validateSwapFeeBoundaryValue(value, feeType, "Swap maximum fee value");
}
