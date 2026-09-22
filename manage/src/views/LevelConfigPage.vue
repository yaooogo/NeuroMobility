<script setup>
import { computed, onMounted, ref } from 'vue';
import ManageLayout from '../components/ManageLayout.vue';
import { getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can } from '../lib/permissions.js';

const user = getUser();
const activeTab = ref('level');
const rules = ref([]);
const growthRewards = ref([]);
const investment = ref({
  whole_vehicle_tier: '50000',
  minimum_investment_amount: '1000',
  waiting_period_days: '0',
  dividend_cycle_days: '30',
  min_percent: '0',
  max_percent: '100',
  dividend_multiple: '1',
  dividend_min_percent: '0',
  dividend_max_percent: '100',
  exit_multiple: '1',
  guaranteed_dividend_percent: '3'
});
const investmentLoaded = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const canUpdate = computed(() => can(user, 'parameter-config-update'));

async function loadLevels() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/system-config/wallet-level');
    rules.value = (data.rules || []).map(item => ({
      level: String(item.level),
      amount: String(item.amount),
      differential_percent: String(item.differential_percent ?? 0),
      expansion_reward_percent: String(item.expansion_reward_percent ?? 0),
      position_salary: String(item.position_salary ?? 0)
    }));
    growthRewards.value = (data.growth_rewards || []).map(item => ({
      level: String(item.level),
      whole_vehicle_count: String(item.whole_vehicle_count),
      bonus_percent: String(item.bonus_percent)
    }));
  } catch (err) { error.value = err.message || '加载等级配置失败'; }
  finally { loading.value = false; }
}

async function loadInvestment() {
  loading.value = true; error.value = '';
  try {
    const data = await post('/system-config/investment');
    investment.value = {
      whole_vehicle_tier: String(data.whole_vehicle_tier),
      minimum_investment_amount: String(data.minimum_investment_amount),
      waiting_period_days: String(data.waiting_period_days),
      dividend_cycle_days: String(data.dividend_cycle_days),
      min_percent: String(data.min_percent),
      max_percent: String(data.max_percent),
      dividend_multiple: String(data.dividend_multiple),
      dividend_min_percent: String(data.dividend_min_percent),
      dividend_max_percent: String(data.dividend_max_percent),
      exit_multiple: String(data.exit_multiple),
      guaranteed_dividend_percent: String(data.guaranteed_dividend_percent)
    };
    investmentLoaded.value = true;
  } catch (err) { error.value = err.message || '加载投资配置失败'; }
  finally { loading.value = false; }
}

async function selectTab(tab) {
  activeTab.value = tab; error.value = ''; success.value = '';
  if (tab === 'investment' && !investmentLoaded.value) await loadInvestment();
}

function validateLevels() {
  const normalized = rules.value.map(item => ({
    level: Number(item.level),
    amount: Number(item.amount),
    differentialPercent: Number(item.differential_percent),
    expansionRewardPercent: Number(item.expansion_reward_percent),
    positionSalary: Number(item.position_salary)
  }));
  if (normalized.length !== 3 || normalized.some((item, index) => item.level !== 3 - index)) return '等级配置固定为 1、2、3 级';
  if (normalized.some(item => !Number.isFinite(item.amount) || item.amount < 0)) return '金额必须为非负数';
  if (normalized.some(item => !Number.isFinite(item.differentialPercent) || item.differentialPercent < 0 || item.differentialPercent > 100)) return '毛利分成必须在 0% 到 100% 之间';
  if (normalized.some(item => !Number.isFinite(item.expansionRewardPercent) || item.expansionRewardPercent < 0 || item.expansionRewardPercent > 100)) return '拓展奖励必须在 0% 到 100% 之间';
  if (normalized.some(item => !Number.isFinite(item.positionSalary) || item.positionSalary < 0)) return '岗位工资必须为非负数';
  for (let index = 0; index < normalized.length - 1; index += 1) {
    if (normalized[index].amount <= normalized[index + 1].amount) return `等级 ${normalized[index].level} 的金额必须高于等级 ${normalized[index + 1].level}`;
  }
  const growthMessage = validateGrowthRewards();
  if (growthMessage) return growthMessage;
  return '';
}

function validateGrowthRewards() {
  const normalized = growthRewards.value.map(item => ({
    level: Number(item.level),
    wholeVehicleCount: Number(item.whole_vehicle_count),
    bonusPercent: Number(item.bonus_percent)
  }));
  if (normalized.some(item => !Number.isInteger(item.level) || item.level < 1 || item.level > 3)) return '成长奖励等级必须为 1、2、3 级';
  if (normalized.some(item => !Number.isSafeInteger(item.wholeVehicleCount) || item.wholeVehicleCount <= 0)) return '成长奖励整车数必须为正整数';
  if (normalized.some(item => !Number.isFinite(item.bonusPercent) || item.bonusPercent < 0 || item.bonusPercent > 100)) return '成长奖励加成必须在 0% 到 100% 之间';
  const keys = normalized.map(item => `${item.level}:${item.wholeVehicleCount}`);
  if (new Set(keys).size !== keys.length) return '同一等级和整车数不能重复配置';
  return '';
}

function addGrowthReward() {
  growthRewards.value.push({ level: '1', whole_vehicle_count: '1', bonus_percent: '0' });
}

function removeGrowthReward(index) {
  growthRewards.value.splice(index, 1);
}

function validateInvestment() {
  if (Object.values(investment.value).some(value => String(value).trim() === '')) return '投资配置项不能为空';
  const wholeVehicleTier = Number(investment.value.whole_vehicle_tier);
  const minimumInvestmentAmount = Number(investment.value.minimum_investment_amount);
  const waitingPeriodDays = Number(investment.value.waiting_period_days);
  const dividendCycleDays = Number(investment.value.dividend_cycle_days);
  const minPercent = Number(investment.value.min_percent);
  const maxPercent = Number(investment.value.max_percent);
  const dividendMultiple = Number(investment.value.dividend_multiple);
  const dividendMinPercent = Number(investment.value.dividend_min_percent);
  const dividendMaxPercent = Number(investment.value.dividend_max_percent);
  const exitMultiple = Number(investment.value.exit_multiple);
  const guaranteedDividendPercent = Number(investment.value.guaranteed_dividend_percent);
  if (!Number.isFinite(wholeVehicleTier) || wholeVehicleTier <= 0) return '整车挡位必须大于 0';
  if (!Number.isInteger(minimumInvestmentAmount) || minimumInvestmentAmount <= 0) return '最低投资金额必须为正整数';
  if (!Number.isInteger(waitingPeriodDays) || waitingPeriodDays < 0) return '等待期必须为非负整数';
  if (!Number.isInteger(dividendCycleDays) || dividendCycleDays <= 0) return '分红周期必须为正整数';
  if (!Number.isFinite(minPercent) || !Number.isFinite(maxPercent) || minPercent < 0 || minPercent > 100 || maxPercent < 0 || maxPercent > 100) return '分红百分比必须在 0% 到 100% 之间';
  if (minPercent > maxPercent) return '分红百分比起始值不能大于结束值';
  if (!Number.isFinite(dividendMultiple) || dividendMultiple <= 0) return '分红倍数必须大于 0';
  if (!Number.isFinite(dividendMinPercent) || !Number.isFinite(dividendMaxPercent) || dividendMinPercent < 0 || dividendMinPercent > 100 || dividendMaxPercent < 0 || dividendMaxPercent > 100) return '分红百分比区间必须在 0% 到 100% 之间';
  if (dividendMinPercent > dividendMaxPercent) return '分红百分比区间起始值不能大于结束值';
  if (!Number.isFinite(exitMultiple) || exitMultiple <= 0) return '出局倍数必须大于 0';
  if (!Number.isFinite(guaranteedDividendPercent) || guaranteedDividendPercent < 0 || guaranteedDividendPercent > 100) return '保底分红必须在 0% 到 100% 之间';
  return '';
}

async function save() {
  const message = activeTab.value === 'level' ? validateLevels() : validateInvestment();
  if (message) { error.value = message; return; }
  saving.value = true; error.value = ''; success.value = '';
  try {
    if (activeTab.value === 'level') {
      const data = await post('/system-config/wallet-level/update', { rules: rules.value, growth_rewards: growthRewards.value });
      rules.value = (data.rules || []).map(item => ({
        level: String(item.level),
        amount: String(item.amount),
        differential_percent: String(item.differential_percent ?? 0),
        expansion_reward_percent: String(item.expansion_reward_percent ?? 0),
        position_salary: String(item.position_salary ?? 0)
      }));
      growthRewards.value = (data.growth_rewards || []).map(item => ({
        level: String(item.level),
        whole_vehicle_count: String(item.whole_vehicle_count),
        bonus_percent: String(item.bonus_percent)
      }));
      success.value = '等级配置已保存';
    } else {
      const data = await post('/system-config/investment/update', investment.value);
      investment.value = {
        whole_vehicle_tier: String(data.whole_vehicle_tier),
        minimum_investment_amount: String(data.minimum_investment_amount),
        waiting_period_days: String(data.waiting_period_days),
        dividend_cycle_days: String(data.dividend_cycle_days),
        min_percent: String(data.min_percent),
        max_percent: String(data.max_percent),
        dividend_multiple: String(data.dividend_multiple),
        dividend_min_percent: String(data.dividend_min_percent),
        dividend_max_percent: String(data.dividend_max_percent),
        exit_multiple: String(data.exit_multiple),
        guaranteed_dividend_percent: String(data.guaranteed_dividend_percent)
      };
      success.value = '投资配置已保存';
    }
  } catch (err) { error.value = err.message || '保存配置失败'; }
  finally { saving.value = false; }
}

onMounted(loadLevels);
</script>

<template>
  <ManageLayout title="参数配置" description="通过顶部页签切换配置模块，保存后立即写入系统配置。">
    <section class="panel-card parameter-panel">
      <div class="parameter-tabs">
        <button class="parameter-tab" :class="{ 'parameter-tab--active': activeTab === 'level' }" type="button" @click="selectTab('level')">等级配置</button>
        <button class="parameter-tab" :class="{ 'parameter-tab--active': activeTab === 'investment' }" type="button" @click="selectTab('investment')">投资配置</button>
      </div>
      <div v-if="activeTab === 'level'" class="parameter-section-head">
        <div>
          <h2>等级配置</h2>
          <p>配置各等级对应的金额阈值，达到对应金额后自动进入该等级。</p>
        </div>
      </div>
      <div v-else class="parameter-section-head">
        <div>
          <h2>投资配置</h2>
          <p>配置整车挡位、投资等待期、百分比区间及达到出局条件的倍数。</p>
        </div>
      </div>
      <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
      <div v-if="success" class="alert-box alert-box--success">{{ success }}</div>
      <template v-if="activeTab === 'level'">
        <div class="level-config-wrap">
          <div class="table-wrap">
            <table class="data-table level-config-table">
              <thead><tr><th>等级</th><th>金额</th><th>岗位工资（U）</th><th>毛利分成（%）</th><th>拓展奖励（%）</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="empty-cell">正在加载...</td></tr>
                <tr v-for="row in rules" :key="row.level">
                  <td><strong>{{ row.level }}</strong></td>
                  <td><input v-if="canUpdate" v-model.trim="row.amount" class="text-input" type="number" min="0" step="0.01" /><span v-else>{{ row.amount }}</span></td>
                  <td><input v-if="canUpdate" v-model.trim="row.position_salary" class="text-input" type="number" min="0" step="0.01" /><span v-else>{{ row.position_salary }} U</span></td>
                  <td><input v-if="canUpdate" v-model.trim="row.differential_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><span v-else>{{ row.differential_percent }}%</span></td>
                  <td><input v-if="canUpdate" v-model.trim="row.expansion_reward_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><span v-else>{{ row.expansion_reward_percent }}%</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <section class="growth-reward-section">
          <div class="growth-reward-head"><div><h3>成长奖励</h3><p>按等级和整车数配置对应的奖励加成。</p></div><button v-if="canUpdate" class="primary-button" type="button" @click="addGrowthReward">新增规则</button></div>
          <div class="table-wrap">
            <table class="data-table growth-reward-table">
              <thead><tr><th>等级</th><th>整车数</th><th>加成（%）</th><th v-if="canUpdate">操作</th></tr></thead>
              <tbody>
                <tr v-if="loading || !growthRewards.length"><td :colspan="canUpdate ? 4 : 3" class="empty-cell">{{ loading ? '正在加载...' : '暂无成长奖励规则' }}</td></tr>
                <tr v-for="(row, index) in growthRewards" :key="index">
                  <td><select v-if="canUpdate" v-model="row.level" class="text-input"><option value="1">1级</option><option value="2">2级</option><option value="3">3级</option></select><span v-else>{{ row.level }}级</span></td>
                  <td><input v-if="canUpdate" v-model.trim="row.whole_vehicle_count" class="text-input" type="number" min="1" step="1" /><span v-else>{{ row.whole_vehicle_count }}</span></td>
                  <td><input v-if="canUpdate" v-model.trim="row.bonus_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><span v-else>{{ row.bonus_percent }}%</span></td>
                  <td v-if="canUpdate"><button class="table-button" type="button" @click="removeGrowthReward(index)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
      <template v-else>
        <div v-if="loading" class="investment-loading">正在加载...</div>
        <div v-else class="investment-form">
          <label class="investment-field">
            <span>整车挡位</span>
            <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.whole_vehicle_tier" class="text-input" type="number" min="0.01" step="0.01" /><strong v-else>{{ investment.whole_vehicle_tier }}</strong><em>U</em></div>
          </label>
          <label class="investment-field">
            <span>最低投资金额</span>
            <div>
              <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.minimum_investment_amount" class="text-input" type="number" min="1" step="1" /><strong v-else>{{ investment.minimum_investment_amount }}</strong><em>U</em></div>
              <small class="investment-tip">投资金额必须为最低投资金额的整数倍</small>
            </div>
          </label>
          <label class="investment-field">
            <span>等待期</span>
            <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.waiting_period_days" class="text-input" type="number" min="0" step="1" /><strong v-else>{{ investment.waiting_period_days }}</strong><em>天</em></div>
          </label>
          <label class="investment-field">
            <span>分红周期</span>
            <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.dividend_cycle_days" class="text-input" type="number" min="1" step="1" /><strong v-else>{{ investment.dividend_cycle_days }}</strong><em>天</em></div>
          </label>
          <label class="investment-field">
            <span>分红百分比</span>
            <div class="range-inputs">
              <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.min_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><strong v-else>{{ investment.min_percent }}</strong><em>%</em></div>
              <span class="range-separator">~</span>
              <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.max_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><strong v-else>{{ investment.max_percent }}</strong><em>%</em></div>
            </div>

          </label>
          <label class="investment-field">
            <span>出局倍数</span>
            <div>
              <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.exit_multiple" class="text-input" type="number" min="0.01" step="0.01" /><strong v-else>{{ investment.exit_multiple }}</strong><em>倍</em></div>
              <small class="investment-tip">
                倍数只算分红，比如投资1000，设置为1.5倍，即分红达到 1000 * 1.5 = 1500 即出局，不算本金
              </small>
            </div>
          </label>
          <div class="investment-field investment-field--dividend">
            <span>分红规则</span>
            <div class="dividend-config">
              <div class="dividend-threshold">
                <span>当分红达到</span>
                <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.dividend_multiple" class="text-input" type="number" min="0.01" step="0.01" /><strong v-else>{{ investment.dividend_multiple }}</strong><em>倍</em></div>
              </div>
              <span class="dividend-percent-label">，分红百分比</span>
              <div class="range-inputs">
                <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.dividend_min_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><strong v-else>{{ investment.dividend_min_percent }}</strong><em>%</em></div>
                <span class="range-separator">~</span>
                <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.dividend_max_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><strong v-else>{{ investment.dividend_max_percent }}</strong><em>%</em></div>
              </div>
            </div>
          </div>
          <label class="investment-field">
            <span>保底分红</span>
            <div>
              <div class="input-with-unit"><input v-if="canUpdate" v-model.trim="investment.guaranteed_dividend_percent" class="text-input" type="number" min="0" max="100" step="0.01" /><strong v-else>{{ investment.guaranteed_dividend_percent }}</strong><em>%</em></div>
              <small class="investment-tip">单次投资金额达到或累计金额达到 <strong>{{ investment.whole_vehicle_tier }} U</strong>，保底获得 <strong>{{ investment.guaranteed_dividend_percent }}%</strong> 分红，即 <strong>{{ investment.guaranteed_dividend_percent }}%</strong> 至 <strong>{{ investment.max_percent }}%</strong> 的分红规则。</small>
            </div>
          </label>
        </div>
      </template>
      <div v-if="canUpdate" class="level-config-actions"><button class="submit-button" type="button" :disabled="saving || loading || (activeTab === 'investment' && !investmentLoaded)" @click="save">{{ saving ? '保存中...' : '保存配置' }}</button></div>
    </section>
  </ManageLayout>
</template>

<style scoped>
.parameter-panel { display: flex; flex-direction: column; padding: 0; }
.parameter-tabs { display: flex; gap: 10px; padding: 12px 24px; border-bottom: 1px solid var(--line); overflow-y: hidden; overflow-x: auto;  min-height: 72px;}
.parameter-tab { min-height: 42px; padding: 0 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel-strong); color: var(--text); font: inherit; white-space: nowrap; }
.parameter-tab--active { border-color: #3d7bff66; background: #3d7bff2e; }
.parameter-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 26px 24px 20px; }
.parameter-section-head h2 { margin: 0 0 6px; }
.parameter-section-head p { margin:  0 0 16px; color: var(--muted); }
.level-config-wrap { margin: 0 24px; width: auto; }
.level-config-table { min-width: 620px; }
.level-config-table th:nth-child(1), .level-config-table td:nth-child(1) { width: 20%; }
.growth-reward-section { margin: 28px 24px 30px; }
.growth-reward-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.growth-reward-head h3 { margin: 0 0 6px; }
.growth-reward-head p { margin: 0; color: var(--muted); }
.growth-reward-table { min-width: 720px; }
.investment-form { display: grid; gap: 20px; margin: 0 24px 26px; max-width: 720px; }
.investment-field { display: grid; grid-template-columns: 140px minmax(0, 1fr); align-items: center; gap: 18px; }
.investment-field > span { font-weight: 600; }
.input-with-unit { display: flex; align-items: center; min-height: 42px; }
.input-with-unit .text-input { flex: 1; min-width: 0; }
.input-with-unit strong { flex: 1; }
.input-with-unit em { min-width: 42px; color: var(--muted); font-style: normal; text-align: center; }
.range-inputs { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.range-separator { color: var(--muted); }
.dividend-config { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.dividend-threshold { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.dividend-threshold .input-with-unit { flex: 1; }
.dividend-percent-label { white-space: nowrap; }
.dividend-config > .range-inputs { flex: 1 1 240px; }
.investment-loading { padding: 0 24px 26px; color: var(--muted); }
.investment-tip { display: block; margin-top: 7px; color: var(--muted); font-size: 12px; }
.level-config-actions { display: flex; margin-top: auto; padding-top: 26px; border-top: 1px solid var(--line); }
.level-config-actions .submit-button { width: 100%; min-height: 42px; border-radius: 0 0 24px 24px; font-size: 16px; }
@media (max-width: 640px) {
  .parameter-section-head { align-items: stretch; flex-direction: column; }
  .level-config-wrap { margin: 0 14px; }
  .growth-reward-section { margin: 24px 14px; }
  .growth-reward-head { align-items: stretch; flex-direction: column; }
  .investment-form { margin: 0 14px 20px; }
  .investment-field { grid-template-columns: 1fr; gap: 8px; }
  .dividend-config { align-items: stretch; flex-direction: column; }
  .dividend-config > .range-inputs { flex-basis: auto; }
  .dividend-percent-label { margin-left: -4px; }
}
</style>
