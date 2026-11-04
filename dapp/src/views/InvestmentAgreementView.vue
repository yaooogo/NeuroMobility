<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AgreementSignature from '../components/AgreementSignature.vue';
import { downloadInvestmentAgreement } from '../lib/investmentAgreementDocument.js';
import companySignature from '../assets/images/Neuro Foundation Ltd Signature Logo.png';
import { useLocale } from '../composables/useLocale.js';
import { requestCreateInvestment, requestInvestmentAgreement, requestInvestmentAgreements, requestPrepareInvestmentAgreement } from '../lib/api.js';

defineOptions({ inheritAttrs: false });
const props = defineProps({ authenticated: Boolean, connected: Boolean, address: { type: String, default: '' } });
const emit = defineEmits(['connect']);
const { lang } = useLocale();
const route = useRoute();
const router = useRouter();
const investor = reactive({ name: '', document_number: '', phone: '', email: '' });
const step = ref(1);
const draft = ref(null);
const signed = ref(null);
const history = ref([]);
const busy = ref(false);
const error = ref('');
const signature = ref('');
const consents = ref([false, false, false, false]);
const signing = computed(() => Boolean(route.query.amount) && !route.query.order_id);
const authenticated = computed(() => props.authenticated && props.connected && Boolean(localStorage.getItem('token')));
const allConfirmed = computed(() => consents.value.every(Boolean));
const consentLabels = computed(() => [
  lang('本人已阅读并同意本协议全部条款。'),
  lang('本人已了解本项目预计收益率为预计收益，并非保证收益。'),
  lang('本人已了解本项目的经营风险，并自愿参与本次投资。'),
  lang('本人同意通过电子方式签署本协议。')
]);
const stepLabels = computed(() => [lang('填写资料'), lang('确认协议'), lang('电子签署'), lang('完成')]);

async function prepare() {
  if (busy.value) return;
  if (!authenticated.value) { emit('connect'); return; }
  busy.value = true;
  error.value = '';
  const current = ++requestId;
  try {
    const prepared = await requestPrepareInvestmentAgreement({ amount: String(route.query.amount), token: String(route.query.token || 'USDT'), investor: { ...investor }, maturity: 'renew' });
    if (current !== requestId) return;
    draft.value = prepared;
    signature.value = '';
    consents.value = [false, false, false, false];
    step.value = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) { if (current === requestId) error.value = err.message; }
  finally { if (current === requestId) busy.value = false; }
}

async function submit() {
  if (busy.value || !allConfirmed.value || !signature.value || !draft.value) return;
  if (!authenticated.value) { emit('connect'); return; }
  busy.value = true;
  error.value = '';
  try {
    const order = await requestCreateInvestment(draft.value.amount, draft.value.token, {
      agreement_id: draft.value.agreement_id,
      agreement_signature: signature.value,
      agreement_consents: [...consents.value]
    });
    await router.replace({ name: 'invest-success', query: { order_id: order.order_id, agreement: '1' } });
  } catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}

async function download() {
  try { await downloadInvestmentAgreement(signed.value); }
  catch { error.value = lang('加载失败'); }
}

let requestId = 0;
async function load() {
  const current = ++requestId;
  error.value = '';
  signed.value = null;
  history.value = [];
  busy.value = false;
  if (signing.value || !authenticated.value) return;
  busy.value = true;
  try {
    if (route.query.order_id) {
      const result = await requestInvestmentAgreement(String(route.query.order_id));
      if (current === requestId) { signed.value = result; step.value = 4; }
    } else {
      const result = await requestInvestmentAgreements();
      if (current === requestId) history.value = result.items || [];
    }
  } catch (err) { if (current === requestId) error.value = err.message; }
  finally { if (current === requestId) busy.value = false; }
}
watch(() => [props.address, props.authenticated, props.connected, route.fullPath], () => {
  draft.value = null;
  signature.value = '';
  investor.name = ''; investor.document_number = ''; investor.phone = ''; investor.email = '';
  step.value = 1;
  void load();
});
onMounted(load);
</script>

<template>
  <section class="agreement-page">
    <header><button type="button" :disabled="busy" @click="router.back()">‹</button><div><h1>{{ lang('车辆租赁业务投资协议') }}</h1><p>Vehicle Rental Business Investment Agreement</p></div><span></span></header>
    <ol v-if="signing || signed" class="steps"><li v-for="(label, index) in stepLabels" :key="label" :class="{ active: step === index + 1, done: step > index + 1 }"><b>{{ step > index + 1 ? '✓' : index + 1 }}</b><span>{{ label }}</span></li></ol>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button v-if="!authenticated" class="primary" type="button" @click="emit('connect')">{{ lang('连接钱包') }}</button>
    <template v-else-if="signing">
      <form v-if="step === 1" @submit.prevent="prepare">
        <article class="card"><h2>{{ lang('投资者资料') }}</h2>
          <label>{{ lang('姓名') }}<input v-model.trim="investor.name" autocomplete="name" required maxlength="100" /></label>
          <label>{{ lang('身份证 / 护照号码') }}<input v-model.trim="investor.document_number" required maxlength="100" /></label>
          <label>{{ lang('联系电话') }}<input v-model.trim="investor.phone" type="tel" autocomplete="tel" required maxlength="40" /></label>
          <label>{{ lang('电子邮箱') }}<input v-model.trim="investor.email" type="email" autocomplete="email" required maxlength="254" /></label>
        </article>
        <button class="primary" :disabled="busy">{{ busy ? lang('提交中...') : lang('确认协议') }}</button>
      </form>
      <template v-else-if="draft">
        <article class="card"><h2>{{ lang('双方资料与投资内容') }}</h2>
          <dl><div><dt>{{ lang('协议编号') }}</dt><dd>{{ draft.agreement_id }}</dd></div><div><dt>{{ lang('协议版本') }}</dt><dd>{{ draft.version }}</dd></div><div><dt>{{ lang('甲方（公司）') }}</dt><dd>Neuro Foundation Ltd</dd></div><div><dt>{{ lang('乙方（投资者）') }}</dt><dd>{{ draft.investor.name }}</dd></div><div><dt>{{ lang('投资金额') }}</dt><dd>USD {{ draft.usdt_amount }}</dd></div><div><dt>{{ lang('投资期限') }}</dt><dd>12 {{ lang('个月') }}</dd></div></dl>
        </article>
        <article class="card"><h2>{{ lang('预计收益') }}</h2><div class="rate"><span>{{ lang('预计月化收益率') }}</span><strong>3%–10%</strong></div><p class="note">{{ lang('预计收益率为预估范围，非保证收益。') }}</p></article>
        <article class="card"><h2>{{ lang('投资本金及期限') }}</h2><dl><div><dt>{{ lang('投资开始日期') }}</dt><dd>{{ draft.start_date }}</dd></div><div><dt>{{ lang('投资结束日期') }}</dt><dd>{{ draft.end_date }} (12 {{ lang('个月') }})</dd></div></dl></article>
        <article class="card"><h2>{{ lang('双方确认') }}</h2><p>{{ lang('甲方负责按照本协议约定使用投资资金及管理车辆租赁业务。') }}</p><p>{{ lang('乙方已了解项目经营风险，并自愿参与本次投资。') }}</p><p>{{ lang('本协议经双方有效电子签署后生效。') }}</p></article>
        <article class="card"><h2>{{ lang('协议全文') }}</h2><pre class="contract-text">{{ draft.content }}</pre></article>
        <article class="card"><h2>{{ lang('投资者确认') }}</h2><label v-for="(label, index) in consentLabels" :key="index" class="check"><input v-model="consents[index]" type="checkbox" :disabled="busy" /><span>{{ label }}</span></label></article>
        <article v-if="step === 3" class="card"><h2>{{ lang('电子签署') }}</h2>
          <div class="signature-grid"><section><strong>{{ lang('甲方（公司）') }}</strong><p>Neuro Foundation Ltd</p><img class="company-signature" :src="companySignature" alt="Neuro Foundation Ltd" /><small>{{ lang('签署日期由系统自动记录') }}</small></section><section><strong>{{ lang('乙方（投资者）') }}</strong><p>{{ draft.investor.name }}</p><AgreementSignature v-model="signature" /><small>{{ lang('签署日期由系统自动记录') }}</small></section></div>
        </article>
        <button v-if="step === 2" class="primary" type="button" :disabled="!allConfirmed" @click="step = 3">{{ lang('电子签署') }}</button>
        <button v-else class="primary" type="button" :disabled="busy || !allConfirmed || !signature" @click="submit">{{ busy ? lang('提交中...') : lang('立即签署协议并投资') }}</button>
        <button class="secondary" type="button" :disabled="busy" @click="step = 1; signature = ''; draft = null">{{ lang('修改资料') }}</button>
      </template>
    </template>
    <template v-else-if="signed">
      <article class="card"><h2>{{ lang('已签署') }}</h2><dl><div><dt>{{ lang('协议编号') }}</dt><dd>{{ signed.agreement_id }}</dd></div><div><dt>{{ lang('签署日期') }}</dt><dd>{{ signed.signed_at }}</dd></div></dl><pre class="contract-text signed-text">{{ signed.content }}</pre><p>{{ lang('甲方（公司）') }}：Neuro Foundation Ltd</p><img class="company-signature" :src="companySignature" alt="Neuro Foundation Ltd" /><p>{{ lang('乙方（投资者）') }}：{{ signed.investor.name }}</p><img class="signed-image" :src="signed.signature" :alt="lang('电子签名区域')" /></article>
      <button class="primary" type="button" @click="download">{{ lang('下载已签署协议') }}</button>
    </template>
    <template v-else-if="!signing && !busy && !error">
      <h2>{{ lang('我的协议') }}</h2><p v-if="!history.length" class="note">{{ lang('暂无已签署协议') }}</p>
      <button v-for="item in history" :key="item.agreement_id" class="history card" @click="router.push({ name: 'investment-agreement', query: { order_id: item.order_id } })"><strong>USD {{ item.usdt_amount }}</strong><span>{{ item.agreement_id }}</span><small>{{ item.signed_at }}</small></button>
    </template>
    <p v-if="busy" class="note" role="status">{{ lang('处理中') }}</p>
  </section>
</template>

<style scoped>
.agreement-page { min-height: 100vh; padding: 0 16px 40px; background: linear-gradient(180deg,#eee5ff,#fbf9fe 300px); color: #37313e; }
header { display: grid; grid-template-columns: 28px 1fr 28px; align-items: center; padding: 22px 0; text-align: center; }
header button { border: 0; background: transparent; color: #8332cf; font-size: 34px; cursor: pointer; }
h1 { margin: 0; font-size: 19px; } header p { margin: 7px 0 0; color: #827789; font-size: 10px; }
.steps { display: flex; justify-content: space-between; list-style: none; padding: 0; margin: 8px 0 25px; }
.steps li { position: relative; flex: 1; text-align: center; font-size: 11px; color: #a69bab; }
.steps li:not(:last-child)::after { content: ''; position: absolute; top: 13px; left: 65%; width: 70%; height: 2px; background: #d7cce3; }
.steps b { position: relative; z-index: 1; display: grid; place-items: center; width: 27px; height: 27px; margin: 0 auto 8px; border: 1px solid #cfc2dc; border-radius: 50%; background: #fff; font-size: 14px; }
.steps .active, .steps .done { color: #8133ca; font-weight: 700; }.steps .active b,.steps .done b { background: linear-gradient(140deg,#b96bff,#6927c5); border-color: transparent; color: white; }
.card { padding: 16px; margin-bottom: 14px; border: 1px solid #e6dded; border-radius: 14px; background: linear-gradient(135deg,#faf6ff,#fff); box-shadow: 0 3px 8px #6134840a; }
h2 { margin: 0 0 15px; font-size: 16px; color: #4a3064; }.card p { font-size: 13px; line-height: 1.7; }
label { display: block; margin-top: 14px; font-size: 13px; }
input:not([type=checkbox]), select { display: block; width: 100%; box-sizing: border-box; min-height: 42px; margin-top: 7px; padding: 10px; border: 1px solid #dccbe9; border-radius: 8px; background: #fff; color: #45354d; font: inherit; }
dl { margin: 0; }dl div { display: grid; grid-template-columns: 100px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px solid #ede6f3; font-size: 12px; }dl div:last-child { border: 0; }dt { color: #81708f; }dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.rate { padding: 18px; text-align: center; border-radius: 10px; background: linear-gradient(110deg,#eee1fc,#e1cff8); }.rate span,.rate strong { display: block; }.rate span { font-size: 13px; }.rate strong { margin-top: 5px; color: #893bd2; font-size: 34px; }
.note { color: #8e8097; font-size: 12px; text-align: center; }.check { display: flex; align-items: flex-start; gap: 9px; line-height: 1.6; }.check input { accent-color: #943de4; flex-shrink: 0; width: 17px; height: 17px; margin: 2px 0 0; }
.contract-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 360px; overflow-y: auto; padding: 10px; margin: 0; border: 1px solid #eee4f8; border-radius: 8px; background: #fff; font-family: inherit; font-size: 12px; line-height: 1.9; }.signed-text { max-height: none; margin-top: 16px; }
.signature-grid { display: grid; gap: 12px; }.signature-grid section { min-width: 0; padding: 12px; border: 1px solid #e6dced; border-radius: 10px; }.signature-grid strong { font-size: 13px; }.signature-grid small { color: #8e8097; font-size: 11px; }.company-signature { display: block; width: 100%; max-width: 360px; height: auto; margin: 16px 0; }.signed-image { width: 100%; max-width: 400px; }
.primary,.secondary { display: block; width: 100%; min-height: 46px; padding: 10px 14px; border-radius: 24px; font-size: 15px; cursor: pointer; }.primary { margin-top: 18px; border: 0; background: linear-gradient(170deg,#ba62ff,#7623d3); color: #fff; font-weight: 700; }.secondary { margin-top: 12px; border: 1px solid #a771d1; background: transparent; color: #8334c7; }button:disabled { opacity: .5; cursor: not-allowed; }.error { padding: 12px; background: #fff0f2; color: #b42657; border-radius: 8px; font-size: 13px; }.history { display: grid; gap: 8px; width: 100%; text-align: left; color: #6f3e98; cursor: pointer; }.history span,.history small { font-size: 11px; overflow-wrap: anywhere; }
@media(min-width:600px) { .signature-grid { grid-template-columns: 1fr 1fr; } }
</style>
