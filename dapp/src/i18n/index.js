export const supportedLocales = [
  { value: "zh", label: "中文", tag: "zh-CN" },
  { value: "en", label: "English", tag: "en" },
  { value: "id", label: "Bahasa Indonesia", tag: "id" },
  { value: "ko", label: "한국어", tag: "ko" },
  { value: "ja", label: "日本語", tag: "ja" },
  { value: "th", label: "ไทย", tag: "th" },
  { value: "hi", label: "हिन्दी", tag: "hi" },
  { value: "vi", label: "Tiếng Việt", tag: "vi" }
];

const zh = {
  connect: "连接钱包", connecting: "登录中", investmentPlan: "投资计划", vehicleInfo: "车辆信息",
  dividendRecords: "分红记录", inviteFriends: "邀请好友", platformVehicles: "平台运营车辆",
  totalUsers: "累计用户", units: "台", users: "人", bannerTitle: "租车投资 · 月度分红计划",
  bannerSub: "真实投资运营｜稳定经营收益｜透明公开分配", investNow: "立即投资", highlights: "项目亮点",
  realVehicle: "真实租车业务", realAsset: "实体资产支撑", monthlyDividend: "月度分红", stableReturn: "共享经营收益",
  transparent: "资金安全透明", onchain: "链上可查", partnership: "合伙人体系", growth: "收益多元化",
  partnerTitle: "成为合伙人 · 共享全球出行红利", partnerSub: "与更多伙伴一起，建设全球出行生态",
  enquire: "立即邀请", home: "首页", invest: "投资", assets: "资产", mine: "我的", language: "切换语言",
  notices: "通知", disconnected: "未连接", disconnect: "断开连接", loginSuccess: "钱包登录成功",
  loginFailed: "钱包登录失败", inviteRequired: "首次登录需要邀请码", inviteCode: "邀请码",
  inviterWallet: "推荐人钱包", verifyInvite: "验证并登录", cancel: "取消", invalidProjectId: "请先配置 Reown Project ID",
  signing: "请在钱包中确认签名", connectHint: "连接钱包后可查看投资与资产", close: "关闭"
};

const packs = {
  en: ["Connect Wallet","Signing in","Investment Plan","Vehicle Info","Dividend Records","Invite Friends","Vehicles in Operation","Total Users"," vehicles"," users","Mobility Investment · Monthly Dividends","Real operations | Stable returns | Transparent distribution","Invest Now","Project Highlights","Real Mobility Business","Backed by real assets","Monthly Dividends","Share operating returns","Secure & Transparent","Verifiable on-chain","Partner Program","Multiple income streams","Become a Partner · Share Global Mobility Growth","Build a global mobility ecosystem with partners","Invite Now","Home","Invest","Assets","Profile","Language","Notifications","Disconnected","Disconnect","Wallet login successful","Wallet login failed","An invite code is required for first login","Invite code","Inviter wallet","Verify & Sign In","Cancel","Configure a Reown Project ID first","Confirm the signature in your wallet","Connect your wallet to view investments and assets","Close"],
  id: ["Hubungkan Dompet","Sedang masuk","Paket Investasi","Info Kendaraan","Riwayat Dividen","Undang Teman","Kendaraan Beroperasi","Total Pengguna"," unit"," pengguna","Investasi Mobilitas · Dividen Bulanan","Operasi nyata | Imbal hasil stabil | Distribusi transparan","Investasi Sekarang","Keunggulan Proyek","Bisnis Mobilitas Nyata","Didukung aset nyata","Dividen Bulanan","Berbagi hasil operasi","Aman & Transparan","Dapat diverifikasi on-chain","Program Mitra","Beragam sumber pendapatan","Jadi Mitra · Nikmati Pertumbuhan Mobilitas Global","Bangun ekosistem mobilitas global bersama","Undang Sekarang","Beranda","Investasi","Aset","Profil","Bahasa","Notifikasi","Terputus","Putuskan","Login dompet berhasil","Login dompet gagal","Kode undangan diperlukan untuk login pertama","Kode undangan","Dompet pengundang","Verifikasi & Masuk","Batal","Konfigurasikan Reown Project ID terlebih dahulu","Konfirmasi tanda tangan di dompet","Hubungkan dompet untuk melihat investasi dan aset","Tutup"],
  ko: ["지갑 연결","로그인 중","투자 계획","차량 정보","배당 내역","친구 초대","운영 차량","누적 사용자","대","명","모빌리티 투자 · 월간 배당","실제 운영 | 안정적 수익 | 투명한 배분","지금 투자","프로젝트 장점","실제 모빌리티 사업","실물 자산 기반","월간 배당","운영 수익 공유","안전하고 투명함","온체인 확인 가능","파트너 시스템","다양한 수익원","파트너가 되어 글로벌 모빌리티 성장 공유","파트너와 글로벌 모빌리티 생태계 구축","지금 초대","홈","투자","자산","내 정보","언어","알림","연결 안 됨","연결 해제","지갑 로그인 성공","지갑 로그인 실패","첫 로그인에는 초대 코드가 필요합니다","초대 코드","추천인 지갑","확인 및 로그인","취소","Reown Project ID를 먼저 설정하세요","지갑에서 서명을 확인하세요","지갑을 연결해 투자와 자산을 확인하세요","닫기"],
  ja: ["ウォレット接続","ログイン中","投資プラン","車両情報","配当履歴","友達を招待","稼働車両","累計ユーザー","台","人","モビリティ投資・月次配当","実運用｜安定収益｜透明な分配","今すぐ投資","プロジェクトの特長","実際のモビリティ事業","実物資産が裏付け","月次配当","運用収益を共有","安全で透明","オンチェーンで確認可能","パートナー制度","多様な収益源","パートナーになって世界の成長を共有","仲間と世界のモビリティを築く","今すぐ招待","ホーム","投資","資産","マイページ","言語","通知","未接続","接続解除","ウォレットログイン成功","ウォレットログイン失敗","初回ログインには招待コードが必要です","招待コード","紹介者ウォレット","確認してログイン","キャンセル","Reown Project IDを設定してください","ウォレットで署名を確認してください","ウォレットを接続して投資と資産を確認","閉じる"],
  th: ["เชื่อมต่อกระเป๋า","กำลังเข้าสู่ระบบ","แผนลงทุน","ข้อมูลรถ","ประวัติปันผล","เชิญเพื่อน","รถที่ให้บริการ","ผู้ใช้ทั้งหมด"," คัน"," คน","ลงทุนด้านการเดินทาง · ปันผลรายเดือน","ธุรกิจจริง | ผลตอบแทนมั่นคง | แจกจ่ายโปร่งใส","ลงทุนทันที","จุดเด่นโครงการ","ธุรกิจการเดินทางจริง","รองรับด้วยสินทรัพย์จริง","ปันผลรายเดือน","แบ่งปันผลตอบแทน","ปลอดภัยและโปร่งใส","ตรวจสอบบนเชนได้","ระบบพันธมิตร","รายได้หลากหลาย","ร่วมเป็นพันธมิตร · แบ่งปันการเติบโตทั่วโลก","สร้างระบบนิเวศการเดินทางร่วมกัน","เชิญทันที","หน้าแรก","ลงทุน","สินทรัพย์","ของฉัน","ภาษา","การแจ้งเตือน","ไม่ได้เชื่อมต่อ","ตัดการเชื่อมต่อ","เข้าสู่ระบบสำเร็จ","เข้าสู่ระบบไม่สำเร็จ","ต้องใช้รหัสเชิญสำหรับการเข้าสู่ระบบครั้งแรก","รหัสเชิญ","กระเป๋าผู้แนะนำ","ยืนยันและเข้าสู่ระบบ","ยกเลิก","โปรดตั้งค่า Reown Project ID ก่อน","ยืนยันลายเซ็นในกระเป๋า","เชื่อมต่อกระเป๋าเพื่อดูการลงทุนและสินทรัพย์","ปิด"],
  hi: ["वॉलेट कनेक्ट करें","लॉग इन हो रहा है","निवेश योजना","वाहन जानकारी","लाभांश रिकॉर्ड","मित्रों को आमंत्रित करें","संचालित वाहन","कुल उपयोगकर्ता"," वाहन"," उपयोगकर्ता","मोबिलिटी निवेश · मासिक लाभांश","वास्तविक संचालन | स्थिर लाभ | पारदर्शी वितरण","अभी निवेश करें","परियोजना की विशेषताएँ","वास्तविक मोबिलिटी व्यवसाय","वास्तविक परिसंपत्तियों द्वारा समर्थित","मासिक लाभांश","परिचालन लाभ साझा करें","सुरक्षित और पारदर्शी","ऑन-चेन सत्यापन","साझेदार कार्यक्रम","विविध आय स्रोत","साझेदार बनें · वैश्विक विकास साझा करें","साथ मिलकर वैश्विक मोबिलिटी बनाएं","अभी आमंत्रित करें","होम","निवेश","परिसंपत्तियाँ","प्रोफ़ाइल","भाषा","सूचनाएँ","कनेक्ट नहीं","डिस्कनेक्ट","वॉलेट लॉगिन सफल","वॉलेट लॉगिन विफल","पहली बार लॉगिन के लिए आमंत्रण कोड आवश्यक है","आमंत्रण कोड","आमंत्रक वॉलेट","सत्यापित कर लॉगिन करें","रद्द करें","पहले Reown Project ID कॉन्फ़िगर करें","वॉलेट में हस्ताक्षर की पुष्टि करें","निवेश और परिसंपत्तियाँ देखने के लिए वॉलेट कनेक्ट करें","बंद करें"],
  vi: ["Kết nối ví","Đang đăng nhập","Kế hoạch đầu tư","Thông tin xe","Lịch sử cổ tức","Mời bạn bè","Xe đang vận hành","Tổng người dùng"," xe"," người","Đầu tư di chuyển · Cổ tức hàng tháng","Vận hành thật | Lợi nhuận ổn định | Phân phối minh bạch","Đầu tư ngay","Điểm nổi bật","Kinh doanh di chuyển thực","Được bảo chứng bằng tài sản thật","Cổ tức hàng tháng","Chia sẻ lợi nhuận vận hành","An toàn & Minh bạch","Có thể kiểm tra on-chain","Chương trình đối tác","Nguồn thu đa dạng","Trở thành đối tác · Chia sẻ tăng trưởng toàn cầu","Cùng xây dựng hệ sinh thái di chuyển toàn cầu","Mời ngay","Trang chủ","Đầu tư","Tài sản","Cá nhân","Ngôn ngữ","Thông báo","Chưa kết nối","Ngắt kết nối","Đăng nhập ví thành công","Đăng nhập ví thất bại","Lần đầu đăng nhập cần mã giới thiệu","Mã giới thiệu","Ví người giới thiệu","Xác minh & Đăng nhập","Hủy","Vui lòng cấu hình Reown Project ID trước","Xác nhận chữ ký trong ví","Kết nối ví để xem đầu tư và tài sản","Đóng"]
};

const keys = Object.keys(zh);
export const messages = { zh };
Object.entries(packs).forEach(([locale, values]) => {
  messages[locale] = Object.fromEntries(keys.map((key, index) => [key, values[index] ?? zh[key]]));
});

export function normalizeLocale(value) {
  const language = String(value || "zh").toLowerCase().split("-")[0];
  return supportedLocales.some((item) => item.value === language) ? language : "zh";
}
