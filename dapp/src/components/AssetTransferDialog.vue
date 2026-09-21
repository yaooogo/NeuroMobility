<script setup>
import { computed, ref, watch } from "vue";
import { getAccount, readContract, waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { formatUnits, getAddress, parseUnits } from "viem";
import { useLocale } from "../composables/useLocale.js";
import { requestPrepareWithdrawal, requestWithdrawalSubmitted } from "../lib/api.js";
import { wagmiAdapter } from "../lib/reown.js";

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: "deposit" },
  address: { type: String, default: "" },
  overview: { type: Object, default: () => ({}) }
});
const emit = defineEmits(["close", "success", "notice"]);
const { lang } = useLocale();
const amount = ref("");
const chainBalance = ref("--");
const chainDecimals = ref(null);
const busy = ref(false);
const stage = ref("");
const preparedWithdrawal = ref(null);

const token = computed(() => props.overview?.token || {});
const isDeposit = computed(() => props.mode === "deposit");
const configuredDecimals = computed(() => Number(token.value.decimals ?? 18));
const decimals = computed(() => isDeposit.value && chainDecimals.value !== null
  ? chainDecimals.value
  : configuredDecimals.value);
const title = computed(() => isDeposit.value ? lang("充值") : lang("提现"));
const balanceText = computed(() => isDeposit.value ? chainBalance.value : String(props.overview?.balance || "0"));
const minimum = computed(() => isDeposit.value ? token.value.recharge_min_amount : token.value.withdraw_min_amount);

const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }
];
const receiverAbi = [
  { type: "function", name: "pay", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }
];
const withdrawalAbi = [
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" }, { name: "orderId", type: "uint256" },
    { name: "amount", type: "uint256" }, { name: "serviceAmount", type: "uint256" },
    { name: "deadline", type: "uint256" }, { name: "v", type: "uint8" },
    { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" }
  ], outputs: [] }
];

function walletContext() {
  const account = getAccount(wagmiAdapter.wagmiConfig);
  if (!account?.address || !account?.connector) throw new Error(lang("钱包连接尚未就绪，请稍后重试"));
  return { account: getAddress(account.address), connector: account.connector };
}

function readableError(error) {
  const code = Number(error?.code ?? error?.cause?.code ?? error?.cause?.cause?.code);
  if (code === 4001 || error?.name === "UserRejectedRequestError") return lang("已取消交易");
  return error?.shortMessage || error?.cause?.shortMessage || error?.message || lang("交易失败");
}

async function loadChainBalance() {
  if (!props.visible || !isDeposit.value || !props.address || !token.value.contract) return;
  chainBalance.value = "--";
  try {
    const contract = getAddress(token.value.contract);
    const [raw, contractDecimals] = await Promise.all([
      readContract(wagmiAdapter.wagmiConfig, {
        address: contract, abi: erc20Abi, functionName: "balanceOf", args: [getAddress(props.address)]
      }),
      readContract(wagmiAdapter.wagmiConfig, {
        address: contract, abi: erc20Abi, functionName: "decimals"
      })
    ]);
    chainDecimals.value = Number(contractDecimals);
    chainBalance.value = formatUnits(raw, chainDecimals.value);
  } catch {
    chainDecimals.value = null;
    chainBalance.value = "--";
  }
}

watch(() => [props.visible, props.mode, props.address, token.value.contract], ([visible]) => {
  if (!visible) return;
  amount.value = "";
  stage.value = "";
  preparedWithdrawal.value = null;
  chainDecimals.value = null;
  void loadChainBalance();
});

async function deposit(rawAmount) {
  const wallet = walletContext();
  const tokenAddress = getAddress(token.value.contract);
  const receiver = getAddress(props.overview.receiver_contract);
  const allowance = await readContract(wagmiAdapter.wagmiConfig, {
    address: tokenAddress, abi: erc20Abi, functionName: "allowance", args: [wallet.account, receiver]
  });
  if (allowance < rawAmount) {
    stage.value = lang("请确认 USDT 授权");
    const approveHash = await writeContract(wagmiAdapter.wagmiConfig, {
      ...wallet, address: tokenAddress, abi: erc20Abi, functionName: "approve", args: [receiver, rawAmount]
    });
    await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash: approveHash });
  }
  stage.value = lang("请确认充值交易");
  const hash = await writeContract(wagmiAdapter.wagmiConfig, {
    ...wallet, address: receiver, abi: receiverAbi, functionName: "pay", args: [tokenAddress, rawAmount]
  });
  await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash });
  emit("success", { type: "deposit", hash });
}

async function withdraw() {
  const wallet = walletContext();
  if (!preparedWithdrawal.value) {
    stage.value = lang("正在创建提现订单");
    preparedWithdrawal.value = await requestPrepareWithdrawal(amount.value, wallet.account);
  }
  const order = preparedWithdrawal.value;
  stage.value = lang("请确认提现交易");
  const hash = await writeContract(wagmiAdapter.wagmiConfig, {
    ...wallet,
    address: getAddress(order.contract),
    abi: withdrawalAbi,
    functionName: "claim",
    args: [getAddress(order.token_contract), BigInt(order.order_id), BigInt(order.amount), BigInt(order.service_amount), BigInt(order.deadline), Number(order.v), order.r, order.s]
  });
  await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { hash });
  try { await requestWithdrawalSubmitted(order.order_id, hash); } catch { /* chain event parser will reconcile it */ }
  emit("success", { type: "withdraw", hash, order });
}

async function submit() {
  if (busy.value) return;
  try {
    if (isDeposit.value && Number(token.value.rechargeable || 0) !== 1) throw new Error(lang("当前资产暂不支持充值"));
    if (!isDeposit.value && Number(token.value.withdrawable || 0) !== 1) throw new Error(lang("当前资产暂不支持提现"));
    const rawAmount = parseUnits(String(amount.value || ""), decimals.value);
    const rawMinimum = parseUnits(String(minimum.value || "0"), decimals.value);
    if (rawAmount <= 0n || rawAmount < rawMinimum) throw new Error(`${lang("最低输入")} ${minimum.value || 0} USDT`);
    busy.value = true;
    if (isDeposit.value) await deposit(rawAmount);
    else await withdraw();
  } catch (error) {
    emit("notice", { message: readableError(error), type: "error" });
  } finally {
    busy.value = false;
    stage.value = "";
  }
}
</script>

<template>
  <div v-if="visible" class="transfer-mask" @click.self="!busy && emit('close')">
    <section class="transfer-dialog" role="dialog" aria-modal="true" :aria-label="title">
      <header><h2>{{ title }}</h2><button type="button" :disabled="busy" @click="emit('close')">×</button></header>
      <div v-if="!isDeposit" class="address-box">{{ address }}</div>
      <label class="amount-box">
        <input v-model.trim="amount" inputmode="decimal" :disabled="busy" :placeholder="`${lang('最低输入')} ${minimum || 0} USDT`" />
        <b>USDT</b>
      </label>
      <p class="balance">Balance: {{ balanceText }} USDT</p>
      <p v-if="!isDeposit && Number(token.withdraw_service_fee || 0) > 0" class="fee">
        {{ lang("手续费") }}: {{ token.withdraw_service_fee }}{{ Number(token.withdraw_service_type) === 1 ? "%" : " USDT" }}
      </p>
      <button class="confirm" type="button" :disabled="busy || !amount" @click="submit">
        {{ busy ? (stage || lang("处理中")) : (isDeposit ? lang("确认充值") : lang("确认提现")) }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.transfer-mask { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(25,15,35,.38); backdrop-filter: blur(7px); }
.transfer-dialog { width: min(100%, 520px); padding: 28px 20px 24px; border: 1.5px solid #a845f1; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgba(80,31,120,.2); color: #454047; }
.transfer-dialog header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.transfer-dialog h2 { margin: 0; font-size:19px; }
.transfer-dialog header button { width: 38px; height: 38px; padding: 0; border: 0; background: transparent; color: #454047; font-size: 38px; font-weight: 300; line-height: 34px; cursor: pointer; }
.address-box, .amount-box { min-height: 44px; display: flex; align-items: center; padding: 0 15px; border-radius: 12px; background: #f1effd; }
.address-box { margin-bottom: 18px; overflow: hidden; color: #aaa5b1; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.amount-box input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: #353039; font-size: 13px; }
.amount-box input::placeholder { color: #aaa6b1; }
.amount-box b { margin-left: 12px; font-size: 18px; }
.balance, .fee { margin: 16px 3px 0; color: #929095; font-size: 13px; text-align: right; }
.fee { margin-top: 8px; }
.confirm { width: 100%; min-height: 44px; margin-top: 28px; border: 0; border-radius: 12px; background: linear-gradient(105deg, #ae52f5, #7926d3); color: #fff; font-size: 18px; font-weight: 700; cursor: pointer; }
.confirm:disabled { cursor: not-allowed; opacity: .58; }
@media (max-width: 480px) { .transfer-dialog { padding: 24px 18px 20px; } .transfer-dialog h2 { font-size: 19px; } }
</style>
