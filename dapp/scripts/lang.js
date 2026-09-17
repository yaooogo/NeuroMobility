import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const localesDir = path.join(srcDir, "i18n", "locales");

// These keys are resolved dynamically by the Launchpad pages, so the regular
// lang("...") scanner cannot discover all of them by itself.
const preservedTexts = [
  "Launchpad 致力于发现并赋能高潜力优质项目，为参与者链接更多资源、机遇与价值。邀请好友加入，共享项目成长红利，让收益与机会持续叠加，让每一次参与都更具价值。",
  "Launchpad 致力于发现并赋能高潜力优质项目，为参与者链接更多资源、机遇与价值。",
  "募集金额", "最高回报", "发行项目", "参与人次", "进行中", "已募集", "本次发行份额", "已募集总额",
  "距离结束还有", "天", "时", "分", "秒", "已结束", "募集总额", "查看", "超募", "当前占比", "参与人数",
  "每份金额", "最低申购份数", "最高申购份数", "份", "份额", "加载项目失败", "申购成功", "申购失败", "返回",
  "我的申购", "立即申购", "申购项目", "关闭", "每份价值", "最多可买", "待释放ROH", "购买份数", "预计支付",
  "申购中...", "确认申购", "暂无链上记录", "加载申购记录失败", "申购记录筛选", "全部记录", "已完成",
  "发行价格", "申购金额", "距离结束", "查看链接", "查看链上记录", "暂无申购记录"
];

const seedEn = {
  "mining_rig_transfer": "Agent Transfer",
  "Agent转让功能已关闭": "Agent transfer is disabled",
  "转让价格(U/台)": "Transfer price (U/unit)",
  "转让费用": "Transfer fee",
  "hidden_finish_linear_release_fee": "Stop fee release and refund",
  "hidden_batch_asset_convert": "Asset conversion",
  "hidden_finish_linear_release": "Stop release and refund",
  "linear_release_cancel": "Stop linear release",
  "已撤销": "Cancelled",
  "失败/撤销原因": "Failure/cancellation reason",
  "您的币种兑换已成功完成": "Your coin swap was completed successfully.",
  "返回首页": "Back to home",
  "查看": "View",
  "首页": "Home",
  "资产": "Assets",
  "语言": "中文",
  "钱包管理": "Manage wallet",
  "连接钱包": "Connect wallet",
  "钱包未连接": "Wallet not connected",
  "NEURO 矿工收益终端": "NEURO Miner Yield Terminal",
  "BNB Chain / Reown Wallet": "BNB Chain / Reown Wallet",
  "钱包已连接": "Wallet connected",
  "连接钱包后开始操作": "Connect wallet to start",
  "当前地址": "Current address",
  "进入资产页": "Assets Page",
  "我的数字资产": "My Digital Assets",
  "协议代币 (RO)": "Protocol Token (RO)",
  "当前释放收益 (ROP)": "Current Released Yield (ROP)",
  "已释放收益 (70%)": "Released Yield (70%)",
  "锁仓部分 (30%)": "Locked Portion (30%)",
  "打开资产列表": "Open Asset List",
  "节点算力认购": "Node Power Subscription",
  "库存充足": "Supply available",
  "节点名额": "Node Slot",
  "第一期": "Phase 1",
  "第二期": "Phase 2",
  "第三期": "Phase 3",
  "认购": "Subscribe",
  "我的算力节点列表": "My Power Node List",
  "尚未部署任何算力节点": "No power nodes deployed yet",
  "额度算力": "Power",
  "限价": "Price",
  "资产列表": "Asset List",
  "USDT 充值在这里操作": "USDT recharge is handled here",
  "变动记录": "Change Records",
  "释放记录": "Release Records",
  "合成Agent记录": "Agent Synthesis Records",
  "充值": "Recharge",
  "ROP余额": "ROP Balance",
  "提取": "Withdraw",
  "待解锁ROHs": "ROHs Pending Unlock",
  "释放收益": "Release Yield",
  "合成矿机": "Compose Miner",
  "冻结ROHp": "Frozen ROH",
  "充值 USDT": "Recharge USDT",
  "关闭": "Close",
  "网络正确": "Network ready",
  "请切换网络": "Wrong network",
  "USDT 合约": "USDT contract",
  "收款合约": "Receiver contract",
  "充值数量": "Amount",
  "请输入 USDT 数量": "Enter USDT amount",
  "订单号": "Order ID",
  "可选，不填则自动生成": "Optional, auto-generated if empty",
  "处理中...": "Processing...",
  "当前状态": "Status",
  "错误信息": "Error",
  "授权交易": "Approve tx",
  "充值交易": "Pay tx",
  "正在发起 USDT 授权": "Sending USDT approval",
  "正在调用充值合约": "Calling recharge contract",
  "充值成功": "Recharge completed",
  "充值失败": "Recharge failed",
  "未检测到钱包 Provider": "Wallet provider not found",
  "请先连接钱包": "Please connect your wallet first",
  "当前钱包网络不正确，请切换到 {chain}": "Wrong wallet network. Please switch to {chain}",
  "请先配置 VITE_USDT_ADDRESS 与 VITE_URECEIVER_ADDRESS": "Please configure VITE_USDT_ADDRESS and VITE_URECEIVER_ADDRESS first",
  "充值数量格式不正确": "Invalid amount format",
  "交易执行失败": "Transaction failed",
  "请先激活矿机": "Please activate a mining rig first",
  "该账户当前档位释放配额已达上限，请选择其他档位": "The release quota for the current account tier has reached its limit. Please select another tier",
  "算力驱动未来，生态创造价值": "Computing Power Drives The Future, Ecosystem Creates Value",
  "启动 APP": "Launch APP",
  "什么是 NEURO Agent？": "What is NEURO Agent?",
  "连接算力供给与真实 AI 需求的全球分布式智能算力平台。": "A global distributed intelligent computing platform connecting computing supply with real AI demand.",
  "核心服务": "Core Services",
  "云算力租赁 (GPU/CPU)": "Cloud Computing Rental (GPU/CPU)",
  "分布式算力网络": "Distributed Computing Network",
  "AI 算力支持": "AI Computing Support",
  "算力收益系统": "Computing Revenue System",
  "项目优势与牌照": "Project Advantages and Licenses",
  "3000 亿美元以上资本背书，低成本算力资源": "Backed by $300B+ capital, low-cost computing power",
  "完整产业生态闭环": "Full industrial ecosystem closed-loop",
  "传统金融-资产管理-加密基础设施": "TradeFi-Asset Management-Crypto-Infra",
  "全球 1GW 以上算力基础设施部署": "Global 1GW+ computing infrastructure deployment",
  "持牌合规体系，多国业务布局": "Licensed compliance system, multi-country business rollout",
  "自增长生态飞轮，持续价值积累": "Self-growing ecosystem flywheel, continuous value accumulation",
  "与全球顶级科技巨头建立生态合作": "Ecosystem partnerships with top global tech giants",
  "投资管理人": "Investment Manager",
  "DCA AlphaTen Investment Limited 已获 DV FSC 批准成为投资管理人": "DCA AlphaTen Investment Limited has been approved by DV FSC as an Investment Manager",
  "牌照编号：IB(R/AIM/23/0507": "License plate number: IB(R/AIM/23/0507",
  "BVI 国际资产管理框架": "BVI International Asset Management Framework",
  "Umbrella Capital Holdings Limited：BVI 公司编号 2148650": "Umbrella Capital Holdings Limited: BVI COMPANY NUMBER 2148650",
  "英属维尔京群岛公司层级": "British Virgin Islands Corporate-Tier",
  "巴基斯坦支付牌照": "Pakistan Payment License",
  "已在巴基斯坦证券交易委员会 (SECP) 注册，注册编号：227792": "Registered With The Securities and Exchange Commission (SECP) of Pakistan Registration Number:227792",
  "印度支付布局": "Payment Layout in India",
  "Umbrella Web Management 对接 UPI 等支付网络": "Umbrella Web Management Payment Networks such as UPI",
  "板块布局": "Section Layout",
  "算力基地": "Computing Power Base",
  "市值管理": "Market Capitalization",
  "量化分析": "Quantitative Analysis",
  "预测": "Prediction",
  "未来愿景": "Future Vision",
  "NEURO Hash 致力于打造以算力为基础、资本为驱动、数据为核心的全球数字基础设施网络，形成算力、数据、金融与 AI 的完整闭环，成为下一代数字经济的核心基础设施。": "NEURO Hash is committed to building a global digital infrastructure network based on computing power, driven by capital, and centered on data, creating a complete closed loop of computing power, data, finance, and AI, and becoming the core infrastructure of the next generation of digital economy.",
  "NEURO AI 基础设施": "NEURO AI infrastructure",
  "加入 NEURO": "Join NEURO",
  "把握算力时代": "Seize The Era Of Computing Power",
  "©2025 Neuro. All Rights Reserved": "©2025 Neuro. All Rights Reserved",
  "项目优势和许可": "Project Advantages and Licenses",
  "云计算租赁 (GPU/CPU)": "Cloud Computing Rental (GPU/CPU)",
  "拥有超过3000亿美元的资金支持，低成本的计算能力": "Backed by over $300B in capital, low-cost computing power",
  "完整的产业生态闭环": "Complete industrial ecosystem closed loop",
  "人工智能计算支持": "AI Computing Support",
  "BOA Alphaline Investment Limited 已获得 BVI FSC 批准，成为一家投资管理公司。": "BOA Alphaline Investment Limited has been approved by the BVI FSC as an investment management company.",
  "全球 1GW+ 算力基础设施部署": "Global 1GW+ computing infrastructure deployment",
  "一个全球分布式智能计算平台，连接全球计算供给和真正的AI需求。": "A global distributed intelligent computing platform connecting global computing supply with real AI demand.",
  "计算能力基础": "Computing Power Base",
  "BVI国际资产管理框架": "BVI International Asset Management Framework",
  "Umbrella Capital Holdings Limited (英属维尔京群岛)公司编号：2146650": "Umbrella Capital Holdings Limited (British Virgin Islands) company number: 2146650",
  "(英属维尔京群岛公司)": "(British Virgin Islands company)",
  "闭环布局": "Closed-loop Layout",
  "印度的支付布局": "Payment Layout in India",
  "NEURO Hash致力于构建以算力为基础、以资本为驱动、以数据为核心的全球数字基础设施网络，打造算力、数据、金融和人工智能的完整闭环，成为下一代数字经济的核心基础设施。": "NEURO Hash is committed to building a global digital infrastructure network based on computing power, driven by capital, and centered on data, creating a complete closed loop of computing power, data, finance, and AI, and becoming the core infrastructure of the next generation digital economy.",
  "分布式计算网络": "Distributed Computing Network",
  "市值": "Market Capitalization",
  "获得许可的合规体系，多国业务拓展": "Licensed compliance system, multi-country business expansion",
  "定量分析": "Quantitative Analysis",
  "自我增长的生态系统飞轮，持续的价值积累": "Self-growing ecosystem flywheel, continuous value accumulation",
  "与全球顶级科技巨头建立生态系统合作伙伴关系": "Ecosystem partnerships with top global technology giants",
  "全选": "Select All",
  "取消全选": "Deselect All",
  "收益/本金倍数": "Income / Principal Multiple",
  "释放手续费": "Release Fee",
  "增加": "Increase",
  "总额需付": "Total Payable",
  "超能增幅": "HyperBoost",
  "收益本金倍数步长": "Income-Principal Multiple Step",
  "最终手续费比例": "Final Fee Rate",
  "回释放手续费比例": "Redistributed Fee Rate",
  "回释放手续费": "Redistributed Fee",
  "每日待解锁释放": "Daily Pending Unlock Release",
  "每日超能增幅释放": "Daily HyperBoost Release",
  "当前钱包或上级团队已配置超能增幅，系统优先使用最近的团队配置；最终手续费 = 释放手续费 + 超能增幅，超能增幅将释放回用户。": "The current wallet or upstream team has HyperBoost configured. The system prioritizes the nearest team configuration. Final fee = release fee + HyperBoost, and HyperBoost will be released back to the user.",
  "手续费 = 收益/本金<1倍：释放手续费；>=1倍：释放手续费 + 收益/本金倍数 × 步长 × 释放手续费，其中增加手续费用于释放回用户。": "Fee = if income/principal is below 1x: release fee; if 1x or above: release fee + income/principal multiple × step × release fee. The incremental fee is released back to users.",
  "绑定推荐人": "Bind Inviter",
  "新用户必须绑定推荐人后才能进入 DApp": "New users must bind an inviter before entering DApp",
  "推荐人邀请码或钱包地址": "Inviter code or wallet address",
  "请输入邀请码或钱包地址": "Enter an invite code or wallet address",
  "推荐人钱包": "Inviter Wallet",
  "推荐人邀请码": "Inviter Code",
  "断开钱包": "Disconnect Wallet",
  "确认并绑定": "Confirm and Bind",
  "推荐人不存在": "Inviter does not exist",
  "请输入推荐人的邀请码或钱包地址": "Please enter the inviter code or wallet address",
  "当前连接钱包已发生变化，请重新连接": "The connected wallet has changed. Please reconnect"
};

const insuranceLocaleSeeds = {
  zh: {
    "Agent保险返还": "Agent保险返还",
    "保险价格未配置": "保险价格未配置",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。",
    "保险金额": "保险金额",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。",
    "可购买保险": "可购买保险",
    "确认购买": "确认购买",
    "是否购买矿机保险，保险金额{amount}U？": "是否购买矿机保险，保险金额{amount}U？",
    "确认续费并购买保险": "确认续费并购买保险",
    "购买保险": "购买保险",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。",
    "是": "是",
    "否": "否"
    ,"确认销毁Agent": "确认销毁Agent"
    ,"销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？"
    ,"首次返还将在销毁后30天发放，之后每30天返还一次。": "首次返还将在销毁后30天发放，之后每30天返还一次。"
    ,"确认销毁": "确认销毁"
    ,"Agent已销毁，首期保险返还时间：{time}": "Agent已销毁，首期保险返还时间：{time}"
    ,"Agent销毁失败": "Agent销毁失败"
  },
  en: {
    "Agent保险返还": "Agent Insurance Return",
    "保险价格未配置": "Insurance price is not configured",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "After the Agent is destroyed, the member will receive {principal}U x {returnPercent}% = {monthlyReturn}U per month until the full {principal}U has been returned.",
    "保险金额": "Insurance Amount",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "After purchasing insurance, members must destroy the Agent to initiate an insurance claim. The Agent can be destroyed from the Agents page.",
    "可购买保险": "Eligible for Insurance",
    "确认购买": "Confirm Purchase",
    "是否购买矿机保险，保险金额{amount}U？": "Purchase Agent insurance for {amount}U?",
    "确认续费并购买保险": "Confirm Renewal and Purchase Insurance",
    "购买保险": "Purchase Insurance",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "Confirming the insurance purchase will charge {insurance}U for insurance, for a total activation/renewal cost of {total}U.",
    "是": "Yes",
    "否": "No"
    ,"确认销毁Agent": "Confirm Agent Destruction"
    ,"销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "This cannot be undone. Destroy this Agent and start insurance returns?"
    ,"首次返还将在销毁后30天发放，之后每30天返还一次。": "The first return is paid 30 days after destruction, then every 30 days."
    ,"确认销毁": "Confirm Destruction"
    ,"Agent已销毁，首期保险返还时间：{time}": "Agent destroyed. First insurance return: {time}"
    ,"Agent销毁失败": "Failed to destroy Agent"
  },
  id: {
    "Agent保险返还": "Pengembalian Asuransi Agent",
    "确认销毁Agent": "Konfirmasi Penghancuran Agent",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "Tindakan ini tidak dapat dibatalkan. Hancurkan Agent ini dan mulai pengembalian asuransi?",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "Pengembalian pertama dibayar 30 hari setelah penghancuran, lalu setiap 30 hari.",
    "确认销毁": "Konfirmasi Penghancuran",
    "Agent已销毁，首期保险返还时间：{time}": "Agent telah dihancurkan. Pengembalian asuransi pertama: {time}",
    "Agent销毁失败": "Gagal menghancurkan Agent",
    "保险价格未配置": "Harga asuransi belum dikonfigurasi",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "Setelah Agent dihancurkan, anggota akan menerima {principal}U x {returnPercent}% = {monthlyReturn}U setiap bulan hingga seluruh {principal}U dikembalikan.",
    "保险金额": "Jumlah Asuransi",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "Setelah membeli asuransi, anggota harus menghancurkan Agent untuk mengajukan klaim. Agent dapat dihancurkan dari halaman Agents.",
    "可购买保险": "Dapat Membeli Asuransi",
    "确认购买": "Konfirmasi Pembelian",
    "是否购买矿机保险，保险金额{amount}U？": "Beli asuransi Agent seharga {amount}U?",
    "确认续费并购买保险": "Konfirmasi Perpanjangan dan Beli Asuransi",
    "购买保险": "Beli Asuransi",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "Konfirmasi pembelian akan mengenakan biaya asuransi {insurance}U, sehingga total aktivasi/perpanjangan menjadi {total}U.",
    "是": "Ya",
    "否": "Tidak"
  },
  ko: {
    "Agent保险返还": "Agent 보험 반환",
    "确认销毁Agent": "Agent 폐기 확인",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "폐기 후 복구할 수 없습니다. 이 Agent를 폐기하고 보험 반환을 시작하시겠습니까?",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "첫 반환은 폐기 30일 후 지급되며 이후 30일마다 지급됩니다.",
    "确认销毁": "폐기 확인",
    "Agent已销毁，首期保险返还时间：{time}": "Agent가 폐기되었습니다. 첫 보험 반환: {time}",
    "Agent销毁失败": "Agent 폐기에 실패했습니다",
    "保险价格未配置": "보험 가격이 설정되지 않았습니다",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "Agent 소각 후 매월 {principal}U x {returnPercent}% = {monthlyReturn}U가 지급되며, 총 {principal}U가 모두 반환될 때까지 계속됩니다.",
    "保险金额": "보험 금액",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "보험 가입 후 보험금 청구를 시작하려면 Agent를 소각해야 합니다. Agents 페이지에서 Agent를 소각할 수 있습니다.",
    "可购买保险": "보험 구매 가능",
    "确认购买": "구매 확인",
    "是否购买矿机保险，保险金额{amount}U？": "{amount}U로 Agent 보험을 구매하시겠습니까?",
    "确认续费并购买保险": "갱신 및 보험 구매 확인",
    "购买保险": "보험 구매",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "보험 구매를 확인하면 보험료 {insurance}U가 부과되며 활성화/갱신 총액은 {total}U입니다.",
    "是": "예",
    "否": "아니요"
  },
  ja: {
    "Agent保险返还": "Agent保険返還",
    "确认销毁Agent": "Agent破棄の確認",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "破棄後は元に戻せません。このAgentを破棄して保険返還を開始しますか？",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "初回返還は破棄から30日後、その後は30日ごとに支払われます。",
    "确认销毁": "破棄を確認",
    "Agent已销毁，首期保险返还时间：{time}": "Agentを破棄しました。初回保険返還：{time}",
    "Agent销毁失败": "Agentの破棄に失敗しました",
    "保险价格未配置": "保険価格が設定されていません",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "Agentを破棄した後、{principal}Uの{returnPercent}%にあたる{monthlyReturn}Uが、合計{principal}Uの返還が完了するまで毎月返還されます。",
    "保险金额": "保険金額",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "保険購入後、保険請求を開始するにはAgentを破棄する必要があります。AgentはAgentsページから破棄できます。",
    "可购买保险": "保険購入可能",
    "确认购买": "購入を確認",
    "是否购买矿机保险，保险金额{amount}U？": "{amount}UでAgent保険を購入しますか？",
    "确认续费并购买保险": "更新と保険購入を確認",
    "购买保险": "保険を購入",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "保険の購入を確定すると保険料{insurance}Uがかかり、アクティベーション／更新との合計は{total}Uです。",
    "是": "はい",
    "否": "いいえ"
  },
  th: {
    "Agent保险返还": "การคืนเงินประกัน Agent",
    "确认销毁Agent": "ยืนยันการทำลาย Agent",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "ไม่สามารถกู้คืนได้หลังทำลาย ยืนยันทำลาย Agent และเริ่มคืนเงินประกันหรือไม่?",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "คืนเงินครั้งแรกหลังทำลาย 30 วัน และคืนทุก 30 วันหลังจากนั้น",
    "确认销毁": "ยืนยันการทำลาย",
    "Agent已销毁，首期保险返还时间：{time}": "ทำลาย Agent แล้ว คืนเงินประกันครั้งแรก: {time}",
    "Agent销毁失败": "ทำลาย Agent ไม่สำเร็จ",
    "保险价格未配置": "ยังไม่ได้กำหนดราคาประกัน",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "หลังจากทำลาย Agent สมาชิกจะได้รับ {principal}U x {returnPercent}% = {monthlyReturn}U ต่อเดือน จนกว่าจะได้รับคืนครบ {principal}U",
    "保险金额": "จำนวนเงินประกัน",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "หลังจากซื้อประกัน สมาชิกต้องทำลาย Agent เพื่อเริ่มการเคลมประกัน โดยสามารถทำลาย Agent ได้จากหน้า Agents",
    "可购买保险": "ซื้อประกันได้",
    "确认购买": "ยืนยันการซื้อ",
    "是否购买矿机保险，保险金额{amount}U？": "ซื้อประกัน Agent ราคา {amount}U หรือไม่?",
    "确认续费并购买保险": "ยืนยันการต่ออายุและซื้อประกัน",
    "购买保险": "ซื้อประกัน",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "การยืนยันซื้อประกันจะคิดค่าประกัน {insurance}U รวมค่าเปิดใช้งาน/ต่ออายุทั้งหมด {total}U",
    "是": "ใช่",
    "否": "ไม่"
  },
  hi: {
    "Agent保险返还": "Agent बीमा वापसी",
    "确认销毁Agent": "Agent नष्ट करने की पुष्टि",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "इसे वापस नहीं किया जा सकता। क्या इस Agent को नष्ट करके बीमा वापसी शुरू करें?",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "पहली वापसी नष्ट करने के 30 दिन बाद और फिर हर 30 दिन में दी जाएगी।",
    "确认销毁": "नष्ट करने की पुष्टि",
    "Agent已销毁，首期保险返还时间：{time}": "Agent नष्ट कर दिया गया। पहली बीमा वापसी: {time}",
    "Agent销毁失败": "Agent नष्ट करने में विफल",
    "保险价格未配置": "बीमा मूल्य कॉन्फ़िगर नहीं किया गया है",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "Agent नष्ट होने के बाद सदस्य को हर महीने {principal}U x {returnPercent}% = {monthlyReturn}U मिलेगा, जब तक पूरे {principal}U वापस नहीं हो जाते।",
    "保险金额": "बीमा राशि",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "बीमा खरीदने के बाद दावा शुरू करने के लिए सदस्य को Agent नष्ट करना होगा। Agent को Agents पेज से नष्ट किया जा सकता है।",
    "可购买保险": "बीमा खरीदने योग्य",
    "确认购买": "खरीद की पुष्टि करें",
    "是否购买矿机保险，保险金额{amount}U？": "क्या आप {amount}U में Agent बीमा खरीदना चाहते हैं?",
    "确认续费并购买保险": "नवीनीकरण और बीमा खरीद की पुष्टि करें",
    "购买保险": "बीमा खरीदें",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "बीमा खरीद की पुष्टि करने पर {insurance}U बीमा शुल्क लगेगा और सक्रियण/नवीनीकरण सहित कुल {total}U होगा।",
    "是": "हाँ",
    "否": "नहीं"
  },
  vi: {
    "Agent保险返还": "Hoàn trả bảo hiểm Agent",
    "确认销毁Agent": "Xác nhận hủy Agent",
    "销毁后不可恢复，是否确认销毁该Agent并启动保险返还？": "Không thể khôi phục sau khi hủy. Xác nhận hủy Agent và bắt đầu hoàn trả bảo hiểm?",
    "首次返还将在销毁后30天发放，之后每30天返还一次。": "Khoản đầu tiên được trả sau 30 ngày, sau đó cứ mỗi 30 ngày.",
    "确认销毁": "Xác nhận hủy",
    "Agent已销毁，首期保险返还时间：{time}": "Agent đã được hủy. Lần hoàn bảo hiểm đầu tiên: {time}",
    "Agent销毁失败": "Không thể hủy Agent",
    "保险价格未配置": "Giá bảo hiểm chưa được cấu hình",
    "销毁矿机后，每月将返回给会员{principal}U x {returnPercent}% = {monthlyReturn}U，直到{principal}U返回完毕。": "Sau khi hủy Agent, thành viên sẽ nhận {principal}U x {returnPercent}% = {monthlyReturn}U mỗi tháng cho đến khi hoàn trả đủ {principal}U.",
    "保险金额": "Số tiền bảo hiểm",
    "购买保险后，当会员想进入保险赔付的动作，需要销毁矿机，会员点击Agents页面可销毁矿机。": "Sau khi mua bảo hiểm, thành viên phải hủy Agent để bắt đầu yêu cầu bồi thường. Có thể hủy Agent tại trang Agents.",
    "可购买保险": "Có thể mua bảo hiểm",
    "确认购买": "Xác nhận mua",
    "是否购买矿机保险，保险金额{amount}U？": "Bạn có muốn mua bảo hiểm Agent với giá {amount}U không?",
    "确认续费并购买保险": "Xác nhận gia hạn và mua bảo hiểm",
    "购买保险": "Mua bảo hiểm",
    "确认购买保险将收取{insurance}U为保险费，加上激活/续费一共是{total}U。": "Xác nhận mua bảo hiểm sẽ thu {insurance}U phí bảo hiểm, tổng cộng với phí kích hoạt/gia hạn là {total}U.",
    "是": "Có",
    "否": "Không"
  }
};

const stakingLocaleSeeds = {
  zh: {
    "roh_stake": "质押", "roh_stake_release": "解压", "mining_rig_insurance": "购买Agent保险", "本次发行份额": "本次发行份额"
  },
  en: {
    "本次发行份额": "Shares Offered",
    "mining_rig_insurance": "Agent Insurance Purchase",
    "roh_stake": "Stake", "roh_stake_release": "Unstake",
    "当前质押算力": "Current Staking Hash Power",
    "质押ROH": "Stake ROH", "ROH质押": "ROH Staking", "当前质押": "Currently Staked", "质押您的待解锁ROH": "Stake Your Pending ROH",
    "选择质押周期": "Select Staking Cycle", "销毁ROH": "Burn ROH", "{days}天": "{days} Days", "销毁": "Burn",
    "{multiplier}倍算力": "{multiplier}x Hash Power", "质押数量": "Stake Amount", "最大": "MAX", "请输入质押数量": "Enter The Staking Amount",
    "警告：销毁的ROH将永久销毁且无法返还。": "Warning: Burned ROH is permanently destroyed and cannot be returned.",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "Note: When staking expires, pending ROH will be returned to your Pending ROH wallet.",
    "质押记录": "Staking Activity", "暂无质押记录": "No staking activity", "开始": "Start", "结束": "End", "处理中...": "Processing...",
    "加载质押数据失败": "Failed to load staking data", "ROH销毁成功": "ROH burned successfully", "ROH质押成功": "ROH staked successfully", "质押失败": "Staking failed",
    "已质押": "Staked", "成功！": "success !", "返回质押": "Back to Stake", "预计算力": "Estimated Hash Power", "质押功能已关闭": "Staking is disabled"
  },
  id: {
    "本次发行份额": "Bagian yang Ditawarkan",
    "mining_rig_insurance": "Pembelian Asuransi Agent",
    "roh_stake": "Stake", "roh_stake_release": "Lepas Stake",
    "总额需付": "Total yang Harus Dibayar",
    "当前质押算力": "Daya Hash Staking Saat Ini",
    "质押ROH": "Stake ROH", "ROH质押": "Staking ROH", "当前质押": "Sedang Dipertaruhkan", "质押您的待解锁ROH": "Stake ROH Tertunda Anda",
    "选择质押周期": "Pilih Periode Stake", "销毁ROH": "Bakar ROH", "{days}天": "{days} Hari", "销毁": "Bakar",
    "{multiplier}倍算力": "Daya Hash {multiplier}x", "质押数量": "Jumlah Stake", "最大": "MAKS", "请输入质押数量": "Masukkan jumlah stake",
    "警告：销毁的ROH将永久销毁且无法返还。": "Peringatan: ROH yang dibakar dimusnahkan secara permanen dan tidak dapat dikembalikan.",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "Catatan: Saat stake berakhir, ROH tertunda akan dikembalikan ke dompet ROH Tertunda Anda.",
    "质押记录": "Aktivitas Stake", "暂无质押记录": "Belum ada aktivitas stake", "开始": "Mulai", "结束": "Selesai", "处理中...": "Memproses...",
    "加载质押数据失败": "Gagal memuat data stake", "ROH销毁成功": "ROH berhasil dibakar", "ROH质押成功": "ROH berhasil di-stake", "质押失败": "Stake gagal",
    "已质押": "Di-stake", "成功！": "berhasil!", "返回质押": "Kembali ke Stake", "预计算力": "Estimasi Daya Hash", "质押功能已关闭": "Fitur staking dinonaktifkan"
  },
  ko: {
    "本次发行份额": "이번 발행 지분",
    "mining_rig_insurance": "Agent 보험 구매",
    "roh_stake": "스테이킹", "roh_stake_release": "스테이킹 해제",
    "总额需付": "총 결제 금액",
    "当前质押算力": "현재 스테이킹 해시 파워",
    "质押ROH": "ROH 스테이킹", "ROH质押": "ROH 스테이킹", "当前质押": "현재 스테이킹", "质押您的待解锁ROH": "대기 중인 ROH 스테이킹",
    "选择质押周期": "스테이킹 기간 선택", "销毁ROH": "ROH 소각", "{days}天": "{days}일", "销毁": "소각",
    "{multiplier}倍算力": "{multiplier}배 해시 파워", "质押数量": "스테이킹 수량", "最大": "최대", "请输入质押数量": "스테이킹 수량 입력",
    "警告：销毁的ROH将永久销毁且无法返还。": "경고: 소각된 ROH는 영구적으로 파기되며 반환되지 않습니다.",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "참고: 스테이킹 만료 후 대기 중인 ROH는 대기 중인 ROH 지갑으로 반환됩니다.",
    "质押记录": "스테이킹 내역", "暂无质押记录": "스테이킹 내역 없음", "开始": "시작", "结束": "종료", "处理中...": "처리 중...",
    "加载质押数据失败": "스테이킹 데이터 로드 실패", "ROH销毁成功": "ROH 소각 완료", "ROH质押成功": "ROH 스테이킹 완료", "质押失败": "스테이킹 실패",
    "已质押": "스테이킹", "成功！": "성공!", "返回质押": "스테이킹으로 돌아가기", "预计算力": "예상 해시 파워", "质押功能已关闭": "스테이킹 기능이 비활성화되었습니다"
  },
  ja: {
    "本次发行份额": "今回の発行口数",
    "mining_rig_insurance": "Agent保険購入",
    "roh_stake": "ステーキング", "roh_stake_release": "ステーキング解除",
    "总额需付": "お支払い総額",
    "当前质押算力": "現在のステーキングハッシュパワー",
    "质押ROH": "ROHをステーク", "ROH质押": "ROHステーキング", "当前质押": "現在のステーク", "质押您的待解锁ROH": "保留中のROHをステーク",
    "选择质押周期": "ステーク期間を選択", "销毁ROH": "ROHをバーン", "{days}天": "{days}日", "销毁": "バーン",
    "{multiplier}倍算力": "{multiplier}倍のハッシュパワー", "质押数量": "ステーク数量", "最大": "最大", "请输入质押数量": "ステーク数量を入力",
    "警告：销毁的ROH将永久销毁且无法返还。": "警告：バーンしたROHは永久に破棄され、返還されません。",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "注意：ステーク満了後、保留中のROHは保留中ROHウォレットに返還されます。",
    "质押记录": "ステーク履歴", "暂无质押记录": "ステーク履歴はありません", "开始": "開始", "结束": "終了", "处理中...": "処理中...",
    "加载质押数据失败": "ステークデータの読み込みに失敗しました", "ROH销毁成功": "ROHをバーンしました", "ROH质押成功": "ROHをステークしました", "质押失败": "ステークに失敗しました",
    "已质押": "ステーク", "成功！": "成功！", "返回质押": "ステークに戻る", "预计算力": "予想ハッシュパワー", "质押功能已关闭": "ステーキング機能は無効です"
  },
  th: {
    "本次发行份额": "จำนวนส่วนที่เสนอขายครั้งนี้",
    "mining_rig_insurance": "ซื้อประกัน Agent",
    "roh_stake": "สเตก", "roh_stake_release": "ถอนสเตก",
    "总额需付": "ยอดชำระทั้งหมด",
    "当前质押算力": "พลังแฮชที่สเตกอยู่ในปัจจุบัน",
    "质押ROH": "Stake ROH", "ROH质押": "การ Stake ROH", "当前质押": "กำลัง Stake", "质押您的待解锁ROH": "Stake ROH ที่รอดำเนินการของคุณ",
    "选择质押周期": "เลือกระยะเวลา Stake", "销毁ROH": "เผา ROH", "{days}天": "{days} วัน", "销毁": "เผา",
    "{multiplier}倍算力": "พลังแฮช {multiplier} เท่า", "质押数量": "จำนวน Stake", "最大": "สูงสุด", "请输入质押数量": "กรอกจำนวน Stake",
    "警告：销毁的ROH将永久销毁且无法返还。": "คำเตือน: ROH ที่เผาจะถูกทำลายถาวรและไม่สามารถคืนได้",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "หมายเหตุ: เมื่อครบกำหนด ROH ที่รอดำเนินการจะถูกคืนไปยังกระเป๋า ROH ที่รอดำเนินการของคุณ",
    "质押记录": "ประวัติ Stake", "暂无质押记录": "ยังไม่มีประวัติ Stake", "开始": "เริ่ม", "结束": "สิ้นสุด", "处理中...": "กำลังดำเนินการ...",
    "加载质押数据失败": "โหลดข้อมูล Stake ไม่สำเร็จ", "ROH销毁成功": "เผา ROH สำเร็จ", "ROH质押成功": "Stake ROH สำเร็จ", "质押失败": "Stake ไม่สำเร็จ",
    "已质押": "Stake แล้ว", "成功！": "สำเร็จ!", "返回质押": "กลับไป Stake", "预计算力": "พลังแฮชโดยประมาณ", "质押功能已关闭": "ฟังก์ชัน Stake ถูกปิดใช้งาน"
  },
  hi: {
    "本次发行份额": "इस बार जारी शेयर",
    "mining_rig_insurance": "Agent बीमा खरीद",
    "roh_stake": "स्टेकिंग", "roh_stake_release": "अनस्टेक",
    "总额需付": "कुल देय राशि",
    "当前质押算力": "वर्तमान स्टेकिंग हैश पावर",
    "质押ROH": "ROH स्टेक करें", "ROH质押": "ROH स्टेकिंग", "当前质押": "वर्तमान स्टेक", "质押您的待解锁ROH": "अपने लंबित ROH को स्टेक करें",
    "选择质押周期": "स्टेक अवधि चुनें", "销毁ROH": "ROH बर्न करें", "{days}天": "{days} दिन", "销毁": "बर्न",
    "{multiplier}倍算力": "{multiplier}x हैश पावर", "质押数量": "स्टेक राशि", "最大": "अधिकतम", "请输入质押数量": "स्टेक राशि दर्ज करें",
    "警告：销毁的ROH将永久销毁且无法返还。": "चेतावनी: बर्न किया गया ROH स्थायी रूप से नष्ट हो जाता है और वापस नहीं किया जा सकता।",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "नोट: स्टेक अवधि समाप्त होने पर लंबित ROH आपके लंबित ROH वॉलेट में वापस आ जाएगा।",
    "质押记录": "स्टेक गतिविधि", "暂无质押记录": "कोई स्टेक गतिविधि नहीं", "开始": "आरंभ", "结束": "समाप्त", "处理中...": "प्रक्रिया जारी है...",
    "加载质押数据失败": "स्टेक डेटा लोड नहीं हुआ", "ROH销毁成功": "ROH सफलतापूर्वक बर्न हुआ", "ROH质押成功": "ROH सफलतापूर्वक स्टेक हुआ", "质押失败": "स्टेक विफल",
    "已质押": "स्टेक किया", "成功！": "सफल!", "返回质押": "स्टेक पर वापस जाएं", "预计算力": "अनुमानित हैश पावर", "质押功能已关闭": "स्टेकिंग सुविधा अक्षम है"
  },
  vi: {
    "本次发行份额": "Số phần phát hành lần này",
    "mining_rig_insurance": "Mua bảo hiểm Agent",
    "roh_stake": "Stake", "roh_stake_release": "Hủy stake",
    "总额需付": "Tổng số tiền phải trả",
    "当前质押算力": "Công suất băm đang stake hiện tại",
    "质押ROH": "Stake ROH", "ROH质押": "Staking ROH", "当前质押": "Đang Stake", "质押您的待解锁ROH": "Stake ROH đang chờ của bạn",
    "选择质押周期": "Chọn kỳ hạn Stake", "销毁ROH": "Đốt ROH", "{days}天": "{days} ngày", "销毁": "Đốt",
    "{multiplier}倍算力": "Sức mạnh băm {multiplier}x", "质押数量": "Số lượng Stake", "最大": "TỐI ĐA", "请输入质押数量": "Nhập số lượng Stake",
    "警告：销毁的ROH将永久销毁且无法返还。": "Cảnh báo: ROH đã đốt sẽ bị hủy vĩnh viễn và không thể hoàn trả.",
    "提示：质押到期后，待解锁ROH将返还到您的待解锁ROH钱包。": "Lưu ý: Khi hết hạn Stake, ROH đang chờ sẽ được trả về ví ROH đang chờ của bạn.",
    "质押记录": "Lịch sử Stake", "暂无质押记录": "Chưa có lịch sử Stake", "开始": "Bắt đầu", "结束": "Kết thúc", "处理中...": "Đang xử lý...",
    "加载质押数据失败": "Không tải được dữ liệu Stake", "ROH销毁成功": "Đốt ROH thành công", "ROH质押成功": "Stake ROH thành công", "质押失败": "Stake thất bại",
    "已质押": "Đã stake", "成功！": "thành công!", "返回质押": "Quay lại Stake", "预计算力": "Hash Power ước tính", "质押功能已关闭": "Tính năng staking đã bị tắt"
  }
};

function buildCrcTable() {
  const table = [];

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let i = 0; i < 8; i += 1) {
      value = (value & 1) !== 0 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

const crcTable = buildCrcTable();

function crc32(input) {
  const bytes = new TextEncoder().encode(String(input));
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

function walk(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (fullPath.startsWith(localesDir)) {
        return [];
      }

      return walk(fullPath);
    }

    if (!/\.(vue|js)$/.test(entry.name)) {
      return [];
    }

    return [fullPath];
  });
}

function extractTexts(content) {
  const matches = [];
  const pattern = /lang\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1\s*\)/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const value = match[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, "\"")
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");

    matches.push(value);
  }

  return matches;
}

function loadLocale(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const pairs = [...source.matchAll(/"([0-9a-f]{8})":\s*"((?:\\.|[^"])*)"/g)];

  return Object.fromEntries(
    pairs.map(([, key, value]) => [
      key,
      value
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\")
    ])
  );
}

function serializeLocale(locale) {
  const lines = Object.entries(locale)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  "${key}": ${JSON.stringify(value)}`);

  return `export default {\n${lines.join(",\n")}\n};\n`;
}

function hasLocaleValue(locale, key) {
  return Object.prototype.hasOwnProperty.call(locale, key);
}

function getLocaleCodes() {
  const defaultOrder = ["zh", "en", "id", "ko", "ja", "th", "hi", "vi"];
  const localeFiles = fs.existsSync(localesDir)
    ? fs.readdirSync(localesDir).filter((fileName) => /^[a-z]{2}\.js$/.test(fileName))
    : [];
  const localeCodes = new Set([
    ...defaultOrder,
    ...localeFiles.map((fileName) => fileName.replace(/\.js$/, ""))
  ]);

  return [...localeCodes].sort((a, b) => {
    const aIndex = defaultOrder.indexOf(a);
    const bIndex = defaultOrder.indexOf(b);

    if (aIndex >= 0 && bIndex >= 0) {
      return aIndex - bIndex;
    }

    if (aIndex >= 0) {
      return -1;
    }

    if (bIndex >= 0) {
      return 1;
    }

    return a.localeCompare(b);
  });
}

fs.mkdirSync(localesDir, { recursive: true });

const sourceFiles = walk(srcDir);
const sourceTexts = new Set(preservedTexts);

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const text of extractTexts(content)) {
    sourceTexts.add(text);
  }
}

const localeCodes = getLocaleCodes();
const existingLocales = Object.fromEntries(
  localeCodes.map((code) => [code, loadLocale(path.join(localesDir, `${code}.js`))])
);
const nextLocales = Object.fromEntries(localeCodes.map((code) => [code, {}]));

for (const text of [...sourceTexts].sort((a, b) => a.localeCompare(b, "zh-Hans"))) {
  const key = crc32(text);

  for (const code of localeCodes) {
    const existingLocale = existingLocales[code] || {};
    const insuranceLocaleValue = insuranceLocaleSeeds[code]?.[text];

    if (insuranceLocaleValue) {
      nextLocales[code][key] = insuranceLocaleValue;
    } else if (stakingLocaleSeeds[code]?.[text]) {
      nextLocales[code][key] = stakingLocaleSeeds[code][text];
    } else if (hasLocaleValue(existingLocale, key)) {
      nextLocales[code][key] = existingLocale[key];
    } else if (code === "zh") {
      nextLocales[code][key] = text;
    } else if (code === "en") {
      nextLocales[code][key] = stakingLocaleSeeds.en?.[text] || seedEn[text] || text;
    } else {
      nextLocales[code][key] = stakingLocaleSeeds[code]?.[text] || existingLocales.en?.[key] || stakingLocaleSeeds.en?.[text] || seedEn[text] || text;
    }
  }
}

for (const code of localeCodes) {
  fs.writeFileSync(path.join(localesDir, `${code}.js`), serializeLocale(nextLocales[code]), "utf8");
}

console.log(`Generated ${sourceTexts.size} language keys for ${localeCodes.length} locales: ${localeCodes.join(", ")}.`);
