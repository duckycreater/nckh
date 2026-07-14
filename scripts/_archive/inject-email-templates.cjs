/**
 * scripts/inject-email-templates.cjs — add email.*.body keys to all 10 server locales.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'server', 'locales');

const TEMPLATES = {
  en: {
    welcome: {
      body: 'Hi {name},\n\nWelcome to BMO Robot! We are excited to help you build eco-friendly habits through on-device AI, federated learning, and a touch of friendly competition.\n\nTo get started, log in and complete your first scan.\n\n— The BMO Robot team',
    },
    password_reset: {
      body: 'Hi {name},\n\nWe received a request to reset your BMO Robot password. If you made this request, use the link below within 24 hours to set a new password.\n\nReset link: {link}\n\nIf you did not request this, you can safely ignore this email — your password will remain unchanged.\n\n— The BMO Robot team',
    },
    achievement: {
      body: 'Hi {name},\n\nCongratulations on earning the "{achievement}" badge! Keep up the great work for the planet.\n\n— The BMO Robot team',
    },
    weekly_summary: {
      body: 'Hi {name},\n\nHere is your week at a glance:\n\n• Scans: {scans}\n• CO₂e avoided: {co2} kg\n• Streak: {streak} days\n• Ranking: #{rank}\n\nKeep going!\n\n— The BMO Robot team',
    },
  },
  vi: {
    welcome: {
      body: 'Xin chào {name},\n\nChào mừng bạn đến với BMO Robot! Chúng tôi rất vui được đồng hành cùng bạn xây dựng thói quen xanh nhờ AI trên thiết bị, học liên kết và một chút thi đua thân thiện.\n\nĐể bắt đầu, hãy đăng nhập và hoàn thành lần quét đầu tiên.\n\n— Đội ngũ BMO Robot',
    },
    password_reset: {
      body: 'Xin chào {name},\n\nChúng tôi nhận được yêu cầu khôi phục mật khẩu BMO Robot của bạn. Nếu đúng là bạn, hãy dùng liên kết dưới đây trong vòng 24 giờ để đặt mật khẩu mới.\n\nLiên kết khôi phục: {link}\n\nNếu bạn không thực hiện yêu cầu này, hãy bỏ qua email — mật khẩu của bạn sẽ không thay đổi.\n\n— Đội ngũ BMO Robot',
    },
    achievement: {
      body: 'Xin chào {name},\n\nChúc mừng bạn đã nhận huy hiệu "{achievement}"! Hãy tiếp tục hành động vì hành tinh nhé.\n\n— Đội ngũ BMO Robot',
    },
    weekly_summary: {
      body: 'Xin chào {name},\n\nĐây là tổng kết tuần của bạn:\n\n• Số lượt quét: {scans}\n• CO₂e tránh được: {co2} kg\n• Streak: {streak} ngày\n• Hạng: #{rank}\n\nCố lên!\n\n— Đội ngũ BMO Robot',
    },
  },
  zh: {
    welcome: {
      body: '你好 {name},\n\n欢迎使用 BMO Robot！我们很高兴通过设备端 AI、联邦学习和友好的竞赛机制，帮助您养成环保习惯。\n\n请登录并完成首次扫描以开始。\n\n— BMO Robot 团队',
    },
    password_reset: {
      body: '你好 {name},\n\n我们收到了重置您的 BMO Robot 密码的请求。如果是您本人操作，请在 24 小时内点击下方链接设置新密码。\n\n重置链接：{link}\n\n如果您没有发起此请求，请忽略此邮件，密码将保持不变。\n\n— BMO Robot 团队',
    },
    achievement: {
      body: '你好 {name},\n\n恭喜您获得 "{achievement}" 徽章！继续为地球贡献力量吧。\n\n— BMO Robot 团队',
    },
    weekly_summary: {
      body: '你好 {name},\n\n您本周的概况：\n\n• 扫描次数：{scans}\n• 避免的 CO₂e：{co2} kg\n• 连续天数：{streak} 天\n• 排名：#{rank}\n\n继续加油！\n\n— BMO Robot 团队',
    },
  },
  es: {
    welcome: {
      body: 'Hola {name},\n\n¡Bienvenido a BMO Robot! Estamos encantados de ayudarte a construir hábitos ecológicos con IA en el dispositivo, aprendizaje federado y una competencia amistosa.\n\nPara empezar, inicia sesión y haz tu primer escaneo.\n\n— El equipo de BMO Robot',
    },
    password_reset: {
      body: 'Hola {name},\n\nRecibimos una solicitud para restablecer tu contraseña de BMO Robot. Si fuiste tú, usa el siguiente enlace dentro de 24 horas para crear una nueva contraseña.\n\nEnlace: {link}\n\nSi no realizaste esta solicitud, ignora este mensaje — tu contraseña no cambiará.\n\n— El equipo de BMO Robot',
    },
    achievement: {
      body: 'Hola {name},\n\n¡Felicidades por obtener la insignia "{achievement}"! Sigue así por el planeta.\n\n— El equipo de BMO Robot',
    },
    weekly_summary: {
      body: 'Hola {name},\n\nTu semana en resumen:\n\n• Escaneos: {scans}\n• CO₂e evitado: {co2} kg\n• Racha: {streak} días\n• Rango: #{rank}\n\n¡Sigue!\n\n— El equipo de BMO Robot',
    },
  },
  fr: {
    welcome: {
      body: 'Bonjour {name},\n\nBienvenue sur BMO Robot ! Nous sommes ravis de vous aider à adopter des habitudes écologiques grâce à l\'IA sur l\'appareil, l\'apprentissage fédéré et une compétition amicale.\n\nPour commencer, connectez-vous et effectuez votre premier scan.\n\n— L\'équipe BMO Robot',
    },
    password_reset: {
      body: 'Bonjour {name},\n\nNous avons reçu une demande de réinitialisation de votre mot de passe BMO Robot. Si vous en êtes l\'auteur, utilisez le lien ci-dessous dans les 24 heures pour définir un nouveau mot de passe.\n\nLien : {link}\n\nSi vous n\'êtes pas à l\'origine de cette demande, ignorez ce message — votre mot de passe restera inchangé.\n\n— L\'équipe BMO Robot',
    },
    achievement: {
      body: 'Bonjour {name},\n\nFélicitations pour avoir obtenu le badge "{achievement}" ! Continuez vos efforts pour la planète.\n\n— L\'équipe BMO Robot',
    },
    weekly_summary: {
      body: 'Bonjour {name},\n\nVotre semaine en bref :\n\n• Analyses : {scans}\n• CO₂e évité : {co2} kg\n• Série : {streak} jours\n• Rang : #{rank}\n\nContinuez !\n\n— L\'équipe BMO Robot',
    },
  },
  ja: {
    welcome: {
      body: '{name} 様\n\nBMO Robot へようこそ！オンデバイス AI、連合学習、そして友好的な競争を通じて、エコ習慣を身につけるお手伝いをします。\n\nまずはログインして最初のスキャンを完了してください。\n\n— BMO Robot チーム',
    },
    password_reset: {
      body: '{name} 様\n\nBMO Robot のパスワードリセットリクエストを受け付けました。本人確認のため、24 時間以内に以下のリンクから新しいパスワードを設定してください。\n\nリセットリンク：{link}\n\nこのリクエストに心当たりがない場合は、このメールを無視してください。パスワードは変更されません。\n\n— BMO Robot チーム',
    },
    achievement: {
      body: '{name} 様\n\n「{achievement}」バッジの獲得おめでとうございます！地球のために引き続き頑張ってください。\n\n— BMO Robot チーム',
    },
    weekly_summary: {
      body: '{name} 様\n\n今週の概要：\n\n• スキャン：{scans} 回\n• 削減 CO₂e：{co2} kg\n• 連続日数：{streak} 日\n• 順位：#{rank}\n\n頑張りましょう！\n\n— BMO Robot チーム',
    },
  },
  ko: {
    welcome: {
      body: '{name} 님, 안녕하세요.\n\nBMO Robot에 오신 것을 환영합니다! 온디바이스 AI, 연합 학습, 그리고 친근한 경쟁을 통해 친환경 습관을 만드는 데 도움을 드리겠습니다.\n\n시작하려면 로그인하고 첫 스캔을 완료하세요.\n\n— BMO Robot 팀',
    },
    password_reset: {
      body: '{name} 님, 안녕하세요.\n\nBMO Robot 비밀번호 재설정 요청을 받았습니다. 본인이 요청한 경우 24시간 이내에 아래 링크로 새 비밀번호를 설정하세요.\n\n재설정 링크: {link}\n\n본인이 요청하지 않았다면 이 이메일을 무시하세요. 비밀번호는 변경되지 않습니다.\n\n— BMO Robot 팀',
    },
    achievement: {
      body: '{name} 님, 안녕하세요.\n\n"{achievement}" 배지를 획득한 것을 축하합니다! 지구를 위해 계속 힘내세요.\n\n— BMO Robot 팀',
    },
    weekly_summary: {
      body: '{name} 님, 안녕하세요.\n\n이번 주 요약:\n\n• 스캔: {scans}회\n• 절감 CO₂e: {co2} kg\n• 연속: {streak}일\n• 순위: #{rank}\n\n계속 화이팅!\n\n— BMO Robot 팀',
    },
  },
  id: {
    welcome: {
      body: 'Halo {name},\n\nSelamat datang di BMO Robot! Kami senang membantu Anda membangun kebiasaan ramah lingkungan melalui AI di perangkat, federated learning, dan sedikit kompetisi yang seru.\n\nUntuk memulai, masuk dan lakukan pemindaian pertama Anda.\n\n— Tim BMO Robot',
    },
    password_reset: {
      body: 'Halo {name},\n\nKami menerima permintaan untuk mengatur ulang kata sandi BMO Robot Anda. Jika ini memang Anda, gunakan tautan berikut dalam 24 jam untuk membuat kata sandi baru.\n\nTautan: {link}\n\nJika Anda tidak merasa meminta ini, abaikan email ini — kata sandi Anda tidak akan berubah.\n\n— Tim BMO Robot',
    },
    achievement: {
      body: 'Halo {name},\n\nSelamat atas獲得nya lencana "{achievement}"! Terus berkarya untuk planet ini.\n\n— Tim BMO Robot',
    },
    weekly_summary: {
      body: 'Halo {name},\n\nRingkasan minggu Anda:\n\n• Pemindaian: {scans}\n• CO₂e dihindari: {co2} kg\n• Streak: {streak} hari\n• Peringkat: #{rank}\n\nTeruskan!\n\n— Tim BMO Robot',
    },
  },
  ar: {
    welcome: {
      body: 'مرحباً {name}،\n\nأهلاً بك في BMO Robot! يسعدنا مساعدتك في بناء عادات صديقة للبيئة من خلال الذكاء الاصطناعي على الجهاز والتعلم الموحد والقليل من المنافسة الودية.\n\nللبدء، سجّل الدخول وأكمل أول مسح لك.\n\n— فريق BMO Robot',
    },
    password_reset: {
      body: 'مرحباً {name}،\n\nتلقّينا طلباً لإعادة تعيين كلمة مرور BMO Robot الخاصة بك. إذا كنت أنت، استخدم الرابط التالي خلال 24 ساعة لتعيين كلمة مرور جديدة.\n\nرابط إعادة التعيين: {link}\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذا البريد — ستبقى كلمة المرور كما هي.\n\n— فريق BMO Robot',
    },
    achievement: {
      body: 'مرحباً {name}،\n\nتهانينا على获得 وسام "{achievement}"! استمر في العمل من أجل كوكبنا.\n\n— فريق BMO Robot',
    },
    weekly_summary: {
      body: 'مرحباً {name}،\n\nملخص أسبوعك:\n\n• المسحات: {scans}\n• CO₂e المتجنبة: {co2} كغ\n• السلسلة: {streak} يوم\n• الترتيب: #{rank}\n\nواصل التقدم!\n\n— فريق BMO Robot',
    },
  },
  pt: {
    welcome: {
      body: 'Olá {name},\n\nBem-vindo ao BMO Robot! Estamos animados para ajudá-lo a construir hábitos ecológicos com IA no dispositivo, aprendizado federado e uma competição amigável.\n\nPara começar, faça login e realize sua primeira análise.\n\n— Equipe BMO Robot',
    },
    password_reset: {
      body: 'Olá {name},\n\nRecebemos uma solicitação para redefinir sua senha do BMO Robot. Se foi você, use o link abaixo em até 24 horas para definir uma nova senha.\n\nLink: {link}\n\nSe você não fez essa solicitação, ignore este e-mail — sua senha permanecerá inalterada.\n\n— Equipe BMO Robot',
    },
    achievement: {
      body: 'Olá {name},\n\nParabéns por獲得 a insígnia "{achievement}"! Continue assim pelo planeta.\n\n— Equipe BMO Robot',
    },
    weekly_summary: {
      body: 'Olá {name},\n\nSua semana em resumo:\n\n• Análises: {scans}\n• CO₂e evitado: {co2} kg\n• Sequência: {streak} dias\n• Rank: #{rank}\n\nContinue!\n\n— Equipe BMO Robot',
    },
  },
};

for (const [code, templates] of Object.entries(TEMPLATES)) {
  const file = path.join(DIR, `${code}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.email) data.email = {};
  let count = 0;
  for (const [tplName, parts] of Object.entries(templates)) {
    if (!data.email[tplName]) data.email[tplName] = {};
    for (const [k, v] of Object.entries(parts)) {
      if (data.email[tplName][k] === undefined) {
        data.email[tplName][k] = v;
        count++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${code}: added ${count} email keys`);
}

console.log('Done.');