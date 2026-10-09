export const INVESTMENT_SYS_CONFIG_NAME = "investment_config";

const DEFAULT_INVESTMENT_CONFIG = Object.freeze({
  whole_vehicle_tier: 50000,
  minimum_investment_amount: 1000,
  usdt_minimum_investment_amount: 1000,
  rusdt_minimum_investment_amount: 100,
  mixed_minimum_investment_amount: 500,
  waiting_period_days: 0,
  dividend_cycle_days: 30,
  min_percent: 0,
  max_percent: 100,
  dividend_multiple: 1,
  dividend_min_percent: 0,
  dividend_max_percent: 100,
  exit_multiple: 1,
  usdt_exit_multiple: 1,
  rusdt_exit_multiple: 1,
  mixed_exit_multiple: 1,
  guaranteed_dividend_percent: 3,
  rusdt_investment_enabled: 1,
  mixed_investment_enabled: 1,
  mixed_usdt_percent: 70
});

export function getDefaultInvestmentConfig() {
  return { ...DEFAULT_INVESTMENT_CONFIG };
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finitePercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : fallback;
}

export function normalizeInvestmentConfig(config) {
  const defaults = getDefaultInvestmentConfig();
  const wholeVehicleTier = Number(config?.whole_vehicle_tier ?? config?.wholeVehicleTier);
  const legacyMinimumInvestmentAmount = Number(config?.minimum_investment_amount ?? config?.minimumInvestmentAmount);
  const usdtMinimumInvestmentAmount = Number(config?.usdt_minimum_investment_amount ?? config?.usdtMinimumInvestmentAmount ?? legacyMinimumInvestmentAmount);
  const rusdtMinimumInvestmentAmount = Number(config?.rusdt_minimum_investment_amount ?? config?.rusdtMinimumInvestmentAmount);
  const mixedMinimumInvestmentAmount = Number(config?.mixed_minimum_investment_amount ?? config?.mixedMinimumInvestmentAmount);
  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const dividendCycleDays = Number(config?.dividend_cycle_days ?? config?.dividendCycleDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const legacyExitMultiple = Number(config?.exit_multiple ?? config?.exitMultiple);
  const usdtExitMultiple = Number(config?.usdt_exit_multiple ?? config?.usdtExitMultiple ?? legacyExitMultiple);
  const rusdtExitMultiple = Number(config?.rusdt_exit_multiple ?? config?.rusdtExitMultiple);
  const mixedExitMultiple = Number(config?.mixed_exit_multiple ?? config?.mixedExitMultiple);
  const guaranteedDividendPercent = Number(config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent);
  const rusdtInvestmentEnabled = Number(config?.rusdt_investment_enabled ?? config?.rusdtInvestmentEnabled);
  const mixedInvestmentEnabled = Number(config?.mixed_investment_enabled ?? config?.mixedInvestmentEnabled);
  const mixedUsdtPercent = Number(config?.mixed_usdt_percent ?? config?.mixedUsdtPercent);

  const normalized = {
    whole_vehicle_tier: Number.isFinite(wholeVehicleTier) && wholeVehicleTier > 0 ? wholeVehicleTier : defaults.whole_vehicle_tier,
    usdt_minimum_investment_amount: positiveInteger(usdtMinimumInvestmentAmount, defaults.usdt_minimum_investment_amount),
    rusdt_minimum_investment_amount: positiveInteger(rusdtMinimumInvestmentAmount, defaults.rusdt_minimum_investment_amount),
    mixed_minimum_investment_amount: positiveInteger(mixedMinimumInvestmentAmount, defaults.mixed_minimum_investment_amount),
    waiting_period_days: Number.isInteger(waitingPeriodDays) && waitingPeriodDays >= 0 ? waitingPeriodDays : defaults.waiting_period_days,
    dividend_cycle_days: Number.isInteger(dividendCycleDays) && dividendCycleDays > 0 ? dividendCycleDays : defaults.dividend_cycle_days,
    min_percent: finitePercent(minPercent, defaults.min_percent),
    max_percent: finitePercent(maxPercent, defaults.max_percent),
    dividend_multiple: positiveNumber(dividendMultiple, defaults.dividend_multiple),
    dividend_min_percent: finitePercent(dividendMinPercent, defaults.dividend_min_percent),
    dividend_max_percent: finitePercent(dividendMaxPercent, defaults.dividend_max_percent),
    usdt_exit_multiple: positiveNumber(usdtExitMultiple, defaults.usdt_exit_multiple),
    rusdt_exit_multiple: positiveNumber(rusdtExitMultiple, defaults.rusdt_exit_multiple),
    mixed_exit_multiple: positiveNumber(mixedExitMultiple, defaults.mixed_exit_multiple),
    guaranteed_dividend_percent: finitePercent(guaranteedDividendPercent, defaults.guaranteed_dividend_percent),
    rusdt_investment_enabled: Number.isFinite(rusdtInvestmentEnabled) ? (rusdtInvestmentEnabled === 1 ? 1 : 0) : defaults.rusdt_investment_enabled,
    mixed_investment_enabled: Number.isFinite(mixedInvestmentEnabled) ? (mixedInvestmentEnabled === 1 ? 1 : 0) : defaults.mixed_investment_enabled,
    mixed_usdt_percent: finitePercent(mixedUsdtPercent, defaults.mixed_usdt_percent)
  };
  normalized.minimum_investment_amount = normalized.usdt_minimum_investment_amount;
  normalized.exit_multiple = normalized.usdt_exit_multiple;

  if (normalized.min_percent > normalized.max_percent) {
    normalized.min_percent = defaults.min_percent;
    normalized.max_percent = defaults.max_percent;
  }
  if (normalized.dividend_min_percent > normalized.dividend_max_percent) {
    normalized.dividend_min_percent = defaults.dividend_min_percent;
    normalized.dividend_max_percent = defaults.dividend_max_percent;
  }

  return normalized;
}

export function validateInvestmentConfig(config) {
  const hasEmptyValue = [
    config?.whole_vehicle_tier ?? config?.wholeVehicleTier,
    config?.usdt_minimum_investment_amount ?? config?.usdtMinimumInvestmentAmount ?? config?.minimum_investment_amount ?? config?.minimumInvestmentAmount,
    config?.rusdt_minimum_investment_amount ?? config?.rusdtMinimumInvestmentAmount,
    config?.mixed_minimum_investment_amount ?? config?.mixedMinimumInvestmentAmount,
    config?.waiting_period_days ?? config?.waitingPeriodDays,
    config?.dividend_cycle_days ?? config?.dividendCycleDays,
    config?.min_percent ?? config?.minPercent,
    config?.max_percent ?? config?.maxPercent,
    config?.dividend_multiple ?? config?.dividendMultiple,
    config?.dividend_min_percent ?? config?.dividendMinPercent,
    config?.dividend_max_percent ?? config?.dividendMaxPercent,
    config?.usdt_exit_multiple ?? config?.usdtExitMultiple ?? config?.exit_multiple ?? config?.exitMultiple,
    config?.rusdt_exit_multiple ?? config?.rusdtExitMultiple,
    config?.mixed_exit_multiple ?? config?.mixedExitMultiple,
    config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent,
    config?.mixed_usdt_percent ?? config?.mixedUsdtPercent
  ].some(value => value === null || typeof value === "undefined" || String(value).trim() === "");
  if (hasEmptyValue) throw new Error("Investment config fields cannot be empty");

  const wholeVehicleTier = Number(config?.whole_vehicle_tier ?? config?.wholeVehicleTier);
  const usdtMinimumInvestmentAmount = Number(config?.usdt_minimum_investment_amount ?? config?.usdtMinimumInvestmentAmount ?? config?.minimum_investment_amount ?? config?.minimumInvestmentAmount);
  const rusdtMinimumInvestmentAmount = Number(config?.rusdt_minimum_investment_amount ?? config?.rusdtMinimumInvestmentAmount);
  const mixedMinimumInvestmentAmount = Number(config?.mixed_minimum_investment_amount ?? config?.mixedMinimumInvestmentAmount);
  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const dividendCycleDays = Number(config?.dividend_cycle_days ?? config?.dividendCycleDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const usdtExitMultiple = Number(config?.usdt_exit_multiple ?? config?.usdtExitMultiple ?? config?.exit_multiple ?? config?.exitMultiple);
  const rusdtExitMultiple = Number(config?.rusdt_exit_multiple ?? config?.rusdtExitMultiple);
  const mixedExitMultiple = Number(config?.mixed_exit_multiple ?? config?.mixedExitMultiple);
  const guaranteedDividendPercent = Number(config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent);
  const rusdtInvestmentEnabled = Number(config?.rusdt_investment_enabled ?? config?.rusdtInvestmentEnabled ?? 1);
  const mixedInvestmentEnabled = Number(config?.mixed_investment_enabled ?? config?.mixedInvestmentEnabled ?? 1);
  const mixedUsdtPercent = Number(config?.mixed_usdt_percent ?? config?.mixedUsdtPercent);

  if (!Number.isFinite(wholeVehicleTier) || wholeVehicleTier <= 0) throw new Error("Whole vehicle tier must be greater than 0");
  if (!Number.isInteger(usdtMinimumInvestmentAmount) || usdtMinimumInvestmentAmount <= 0) throw new Error("USDT minimum investment amount must be a positive integer");
  if (!Number.isInteger(rusdtMinimumInvestmentAmount) || rusdtMinimumInvestmentAmount <= 0) throw new Error("RUSD minimum investment amount must be a positive integer");
  if (!Number.isInteger(mixedMinimumInvestmentAmount) || mixedMinimumInvestmentAmount <= 0) throw new Error("Mixed minimum investment amount must be a positive integer");
  if (!Number.isInteger(waitingPeriodDays) || waitingPeriodDays < 0) throw new Error("Waiting period must be a non-negative integer");
  if (!Number.isInteger(dividendCycleDays) || dividendCycleDays <= 0) throw new Error("Dividend cycle must be a positive integer");
  if (!Number.isFinite(minPercent) || !Number.isFinite(maxPercent) || minPercent < 0 || minPercent > 100 || maxPercent < 0 || maxPercent > 100) {
    throw new Error("Dividend percent must be between 0 and 100");
  }
  if (minPercent > maxPercent) throw new Error("Dividend minimum percent cannot exceed maximum percent");
  if (!Number.isFinite(dividendMultiple) || dividendMultiple <= 0) throw new Error("Dividend multiple must be greater than 0");
  if (!Number.isFinite(dividendMinPercent) || !Number.isFinite(dividendMaxPercent)
    || dividendMinPercent < 0 || dividendMinPercent > 100 || dividendMaxPercent < 0 || dividendMaxPercent > 100) {
    throw new Error("Dividend percent range must be between 0 and 100");
  }
  if (dividendMinPercent > dividendMaxPercent) throw new Error("Dividend range minimum percent cannot exceed maximum percent");
  if (!Number.isFinite(usdtExitMultiple) || usdtExitMultiple <= 0) throw new Error("USDT exit multiple must be greater than 0");
  if (!Number.isFinite(rusdtExitMultiple) || rusdtExitMultiple <= 0) throw new Error("RUSD exit multiple must be greater than 0");
  if (!Number.isFinite(mixedExitMultiple) || mixedExitMultiple <= 0) throw new Error("Mixed exit multiple must be greater than 0");
  if (!Number.isFinite(guaranteedDividendPercent) || guaranteedDividendPercent < 0 || guaranteedDividendPercent > 100) {
    throw new Error("Guaranteed dividend percent must be between 0 and 100");
  }
  if (!Number.isFinite(mixedUsdtPercent) || mixedUsdtPercent < 0 || mixedUsdtPercent > 100) {
    throw new Error("Mixed USDT percent must be between 0 and 100");
  }

  return {
    whole_vehicle_tier: wholeVehicleTier,
    minimum_investment_amount: usdtMinimumInvestmentAmount,
    usdt_minimum_investment_amount: usdtMinimumInvestmentAmount,
    rusdt_minimum_investment_amount: rusdtMinimumInvestmentAmount,
    mixed_minimum_investment_amount: mixedMinimumInvestmentAmount,
    waiting_period_days: waitingPeriodDays,
    dividend_cycle_days: dividendCycleDays,
    min_percent: minPercent,
    max_percent: maxPercent,
    dividend_multiple: dividendMultiple,
    dividend_min_percent: dividendMinPercent,
    dividend_max_percent: dividendMaxPercent,
    exit_multiple: usdtExitMultiple,
    usdt_exit_multiple: usdtExitMultiple,
    rusdt_exit_multiple: rusdtExitMultiple,
    mixed_exit_multiple: mixedExitMultiple,
    guaranteed_dividend_percent: guaranteedDividendPercent,
    rusdt_investment_enabled: rusdtInvestmentEnabled === 1 ? 1 : 0,
    mixed_investment_enabled: mixedInvestmentEnabled === 1 ? 1 : 0,
    mixed_usdt_percent: mixedUsdtPercent
  };
}