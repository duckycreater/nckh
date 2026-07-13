/**
 * scripts/inject-audit-namespace.cjs — add audit.* keys to all FE locale files.
 */
const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'src', 'locales');

const AUDIT = {
  en: {
    title: 'Your data log',
    empty: 'No events yet. When you scan waste or chat with BMO, those events will show up here.',
    loadError: 'Could not load log: {{error}}',
    loading: 'Loading…',
    loadMore: 'Load more',
    messages: {
      scan: 'You scanned a sorting image. The system does NOT store the image — only hash',
      consentGranted: 'You consented to dataset contribution (revocable anytime).',
      consentRevoked: 'You withdrew your dataset consent.',
      chatMessage: 'You sent',
      chatMessageSuffix: 'characters to the chatbot.',
      login: 'You logged in.',
      logout: 'You logged out.',
      rewardClaim: 'You received',
      rewardSpent: 'You spent',
      rewardPoints: 'reward points.',
      federatedSubmit: 'You contributed 1 federated-learning round (gradient clipped + noised before upload).',
      quizComplete: 'You completed a quiz.',
      score: 'Score',
      fallback: 'Event',
      recorded: 'was recorded.',
    },
  },
  vi: {
    title: 'Nhật ký dữ liệu của bạn',
    empty: 'Chưa có sự kiện nào. Khi bạn quét rác hoặc trò chuyện với BMO, các sự kiện này sẽ xuất hiện ở đây.',
    loadError: 'Không tải được nhật ký: {{error}}',
    loading: 'Đang tải…',
    loadMore: 'Tải thêm',
    messages: {
      scan: 'Bạn quét một bức ảnh phân loại. Hệ thống KHÔNG lưu ảnh — chỉ ghi hash',
      consentGranted: 'Bạn đã đồng ý đóng góp dữ liệu (có thể thu hồi bất kỳ lúc nào).',
      consentRevoked: 'Bạn đã rút lại đồng ý đóng góp dữ liệu.',
      chatMessage: 'Bạn gửi',
      chatMessageSuffix: 'ký tự tới chatbot.',
      login: 'Bạn đã đăng nhập.',
      logout: 'Bạn đã đăng xuất.',
      rewardClaim: 'Bạn nhận',
      rewardSpent: 'Bạn đã tiêu',
      rewardPoints: 'điểm thưởng.',
      federatedSubmit: 'Bạn đã đóng góp 1 vòng federated learning (gradient đã được clip+noise trước khi gửi).',
      quizComplete: 'Hoàn thành bài kiểm tra.',
      score: 'Điểm',
      fallback: 'Sự kiện',
      recorded: 'được ghi nhận.',
    },
  },
  zh: {
    title: '您的数据日志',
    empty: '暂无事件。当您扫描垃圾或与 BMO 对话时，事件将显示在此处。',
    loadError: '无法加载日志：{{error}}',
    loading: '加载中…',
    loadMore: '加载更多',
    messages: {
      scan: '您扫描了一张分类图片。系统不会保存图片 — 仅记录哈希',
      consentGranted: '您已同意贡献数据集（可随时撤回）。',
      consentRevoked: '您已撤回数据集同意。',
      chatMessage: '您向聊天机器人发送了',
      chatMessageSuffix: '个字符。',
      login: '您已登录。',
      logout: '您已登出。',
      rewardClaim: '您收到了',
      rewardSpent: '您消费了',
      rewardPoints: '奖励积分。',
      federatedSubmit: '您贡献了 1 轮联邦学习（梯度在上传前已裁剪+加噪）。',
      quizComplete: '您完成了测试。',
      score: '得分',
      fallback: '事件',
      recorded: '已记录。',
    },
  },
  es: {
    title: 'Tu registro de datos',
    empty: 'Aún no hay eventos. Cuando escanees residuos o chatees con BMO, aparecerán aquí.',
    loadError: 'No se pudo cargar el registro: {{error}}',
    loading: 'Cargando…',
    loadMore: 'Cargar más',
    messages: {
      scan: 'Escaneaste una imagen de clasificación. El sistema NO guarda la imagen — solo el hash',
      consentGranted: 'Has dado tu consentimiento para contribuir al dataset (revocable en cualquier momento).',
      consentRevoked: 'Has retirado tu consentimiento.',
      chatMessage: 'Enviaste',
      chatMessageSuffix: 'caracteres al chatbot.',
      login: 'Has iniciado sesión.',
      logout: 'Has cerrado sesión.',
      rewardClaim: 'Has recibido',
      rewardSpent: 'Has gastado',
      rewardPoints: 'puntos de recompensa.',
      federatedSubmit: 'Has contribuido 1 ronda de aprendizaje federado (gradiente recortado + con ruido antes de subirlo).',
      quizComplete: 'Has completado un cuestionario.',
      score: 'Puntuación',
      fallback: 'Evento',
      recorded: 'fue registrado.',
    },
  },
  fr: {
    title: 'Votre journal de données',
    empty: 'Aucun événement pour l’instant. Quand vous scannez ou discutez avec BMO, ils apparaîtront ici.',
    loadError: 'Impossible de charger le journal : {{error}}',
    loading: 'Chargement…',
    loadMore: 'Charger plus',
    messages: {
      scan: 'Vous avez scanné une image de tri. Le système NE stocke PAS l’image — seulement le hash',
      consentGranted: 'Vous avez consenti à contribuer au jeu de données (révocable à tout moment).',
      consentRevoked: 'Vous avez retiré votre consentement.',
      chatMessage: 'Vous avez envoyé',
      chatMessageSuffix: 'caractères au chatbot.',
      login: 'Vous vous êtes connecté.',
      logout: 'Vous vous êtes déconnecté.',
      rewardClaim: 'Vous avez reçu',
      rewardSpent: 'Vous avez dépensé',
      rewardPoints: 'points de récompense.',
      federatedSubmit: 'Vous avez contribué 1 tour d’apprentissage fédéré (gradient coupé + bruité avant envoi).',
      quizComplete: 'Vous avez terminé un quiz.',
      score: 'Score',
      fallback: 'Événement',
      recorded: 'a été enregistré.',
    },
  },
  ja: {
    title: 'あなたのデータログ',
    empty: 'イベントはまだありません。BMO で廃棄物をスキャンしたり会話すると、ここに表示されます。',
    loadError: 'ログを読み込めませんでした：{{error}}',
    loading: '読み込み中…',
    loadMore: 'さらに読み込む',
    messages: {
      scan: '分類画像をスキャンしました。画像は保存されず、ハッシュのみ記録されます',
      consentGranted: 'データセットへの貢献に同意しました（いつでも撤回可能）。',
      consentRevoked: 'データセットへの同意を撤回しました。',
      chatMessage: 'チャットボットに',
      chatMessageSuffix: '文字送信しました。',
      login: 'ログインしました。',
      logout: 'ログアウトしました。',
      rewardClaim: '受け取りました：',
      rewardSpent: '使用しました：',
      rewardPoints: '報酬ポイント。',
      federatedSubmit: '連合学習 1 ラウンドに貢献しました（勾配はアップロード前にクリッピング + ノイズ化）。',
      quizComplete: 'クイズを完了しました。',
      score: 'スコア',
      fallback: 'イベント',
      recorded: 'が記録されました。',
    },
  },
  ko: {
    title: '내 데이터 로그',
    empty: '아직 이벤트가 없습니다. BMO에서 폐기물을 스캔하거나 대화하면 여기에 표시됩니다.',
    loadError: '로그를 불러올 수 없습니다: {{error}}',
    loading: '불러오는 중…',
    loadMore: '더 불러오기',
    messages: {
      scan: '분류 이미지를 스캔했습니다. 이미지는 저장되지 않으며 해시만 기록됩니다',
      consentGranted: '데이터셋 기여에 동의했습니다 (언제든지 철회 가능).',
      consentRevoked: '데이터셋 동의를 철회했습니다.',
      chatMessage: '챗봇에 보낸 글자 수:',
      chatMessageSuffix: '자.',
      login: '로그인했습니다.',
      logout: '로그아웃했습니다.',
      rewardClaim: '받음:',
      rewardSpent: '사용함:',
      rewardPoints: '보상 포인트.',
      federatedSubmit: '연합 학습 1라운드에 기여했습니다 (업로드 전 그래디언트 클리핑 + 노이즈 적용).',
      quizComplete: '퀴즈를 완료했습니다.',
      score: '점수',
      fallback: '이벤트',
      recorded: '기록됨.',
    },
  },
  id: {
    title: 'Log data Anda',
    empty: 'Belum ada peristiwa. Saat Anda memindai sampah atau mengobrol dengan BMO, peristiwa akan tampil di sini.',
    loadError: 'Tidak dapat memuat log: {{error}}',
    loading: 'Memuat…',
    loadMore: 'Muat lagi',
    messages: {
      scan: 'Anda memindai gambar pemilahan. Sistem TIDAK menyimpan gambar — hanya hash',
      consentGranted: 'Anda menyetujui kontribusi dataset (dapat dicabut kapan saja).',
      consentRevoked: 'Anda menarik persetujuan dataset.',
      chatMessage: 'Anda mengirim',
      chatMessageSuffix: 'karakter ke chatbot.',
      login: 'Anda masuk.',
      logout: 'Anda keluar.',
      rewardClaim: 'Anda menerima',
      rewardSpent: 'Anda menghabiskan',
      rewardPoints: 'poin hadiah.',
      federatedSubmit: 'Anda berkontribusi 1 putaran federated learning (gradien di-clip + diberi noise sebelum diunggah).',
      quizComplete: 'Anda menyelesaikan kuis.',
      score: 'Skor',
      fallback: 'Peristiwa',
      recorded: 'dicatat.',
    },
  },
};

const FILES = ['en', 'vi', 'zh', 'es', 'fr', 'ja', 'ko', 'id'].map((c) => `${c}.json`);

for (const file of FILES) {
  const full = path.join(FRONTEND_DIR, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  const code = file.replace('.json', '');
  const dict = AUDIT[code];
  if (!dict) {
    console.log(`skip ${file} — no audit dict for ${code}`);
    continue;
  }
  data.audit = dict;
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`OK ${file}`);
}
console.log('Done.');