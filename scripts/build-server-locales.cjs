/**
 * scripts/build-server-locales.cjs
 *
 * Generates server/locales/{vi,en,zh,es,fr,ja,ko,id,ar,pt}.json with the
 * ErrorKey catalog. Run once after editing DICT below.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'server', 'locales');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Curated catalog of error keys (canonical English).
const EN = {
  error: {
    serverUnavailable: 'Server unavailable',
    networkError: 'Network error',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Not found',
    validationFailed: 'Validation failed',
    rateLimited: 'Too many requests, please slow down',
    internal: 'Internal server error',
    methodNotAllowed: 'Method not allowed',
    databaseUnavailable: 'Database unavailable',
    clan: {
      full: 'Clan limit reached. Please join an existing clan.',
      notFound: 'Clan does not exist',
      notMember: 'You are not a member of this clan',
      memberNotFound: 'Member not found in clan',
      notLeader: 'Only the leader can do this',
      missingTarget: 'Member name is required',
      missingExp: 'Not enough EXP',
      emptyMessage: 'Message is empty',
      messageTooLong: 'Message is too long',
    },
    chat: {
      empty: 'Message is empty',
      tooLong: 'Message is too long',
    },
    scan: {
      notAnImage: 'File must be an image',
      noText: 'Text is required',
      quotaExceeded: 'Daily scan quota exceeded',
    },
    auth: {
      invalidCredentials: 'Invalid username or password',
      accountTaken: 'Account already taken',
      passwordTooShort: 'Password must be at least 6 characters',
      sessionExpired: 'Session expired, please log in again',
    },
  },
  email: {
    welcome: { subject: 'Welcome to BMO Robot!' },
    passwordReset: { subject: 'Reset your BMO Robot password' },
  },
};

const VI = {
  error: {
    serverUnavailable: 'Máy chủ không khả dụng',
    networkError: 'Lỗi mạng',
    unauthorized: 'Chưa đăng nhập hoặc phiên đã hết hạn',
    forbidden: 'Bạn không có quyền truy cập',
    notFound: 'Không tìm thấy tài nguyên',
    validationFailed: 'Dữ liệu không hợp lệ',
    rateLimited: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
    internal: 'Đã xảy ra lỗi, vui lòng thử lại sau',
    methodNotAllowed: 'Phương thức không được hỗ trợ',
    databaseUnavailable: 'Cơ sở dữ liệu không khả dụng',
    clan: {
      full: 'Đã đạt giới hạn clan. Hãy tham gia clan hiện có.',
      notFound: 'Clan không tồn tại',
      notMember: 'Bạn không phải thành viên clan',
      memberNotFound: 'Thành viên không tồn tại trong clan',
      notLeader: 'Chỉ chủ tịch mới có quyền',
      missingTarget: 'Thiếu tên thành viên',
      missingExp: 'Không đủ EXP',
      emptyMessage: 'Tin nhắn trống',
      messageTooLong: 'Tin nhắn quá dài',
    },
    chat: {
      empty: 'Tin nhắn trống',
      tooLong: 'Tin nhắn quá dài',
    },
    scan: {
      notAnImage: 'Tệp phải là hình ảnh',
      noText: 'Cần nhập nội dung',
      quotaExceeded: 'Đã vượt quá hạn mức quét trong ngày',
    },
    auth: {
      invalidCredentials: 'Tài khoản hoặc mật khẩu không đúng',
      accountTaken: 'Tài khoản đã được sử dụng',
      passwordTooShort: 'Mật khẩu phải có ít nhất 6 ký tự',
      sessionExpired: 'Phiên đã hết hạn, vui lòng đăng nhập lại',
    },
  },
  email: {
    welcome: { subject: 'Chào mừng đến với BMO Robot!' },
    passwordReset: { subject: 'Khôi phục mật khẩu BMO Robot' },
  },
};

const ZH = {
  error: {
    serverUnavailable: '服务器不可用',
    networkError: '网络错误',
    unauthorized: '会话已过期',
    forbidden: '您没有权限',
    notFound: '未找到资源',
    validationFailed: '输入无效',
    rateLimited: '请求过于频繁，请稍后再试。',
    internal: '出现错误，请稍后再试',
    methodNotAllowed: '方法不被允许',
    databaseUnavailable: '数据库不可用',
    clan: {
      full: '已达到家族上限，请加入现有家族。',
      notFound: '家族不存在',
      notMember: '您不是此家族的成员',
      memberNotFound: '家族中找不到该成员',
      notLeader: '只有族长才能执行此操作',
      missingTarget: '需要提供成员名称',
      missingExp: '经验值不足',
      emptyMessage: '消息为空',
      messageTooLong: '消息过长',
    },
    chat: { empty: '消息为空', tooLong: '消息过长' },
    scan: { notAnImage: '文件必须是图片', noText: '请输入内容', quotaExceeded: '已超出每日扫描限额' },
    auth: {
      invalidCredentials: '账号或密码错误',
      accountTaken: '账号已被占用',
      passwordTooShort: '密码至少 6 个字符',
      sessionExpired: '会话已过期，请重新登录',
    },
  },
  email: {
    welcome: { subject: '欢迎使用 BMO Robot！' },
    passwordReset: { subject: '重置您的 BMO Robot 密码' },
  },
};

const ES = {
  error: {
    serverUnavailable: 'Servidor no disponible',
    networkError: 'Error de red',
    unauthorized: 'No autorizado',
    forbidden: 'Acceso prohibido',
    notFound: 'No encontrado',
    validationFailed: 'Validación fallida',
    rateLimited: 'Demasiadas solicitudes. Por favor, inténtalo más tarde.',
    internal: 'Error interno del servidor',
    methodNotAllowed: 'Método no permitido',
    databaseUnavailable: 'Base de datos no disponible',
    clan: {
      full: 'Límite de clan alcanzado. Únete a un clan existente.',
      notFound: 'El clan no existe',
      notMember: 'No eres miembro de este clan',
      memberNotFound: 'Miembro no encontrado en el clan',
      notLeader: 'Solo el líder puede hacer esto',
      missingTarget: 'Falta el nombre del miembro',
      missingExp: 'No tienes suficiente EXP',
      emptyMessage: 'Mensaje vacío',
      messageTooLong: 'Mensaje demasiado largo',
    },
    chat: { empty: 'Mensaje vacío', tooLong: 'Mensaje demasiado largo' },
    scan: { notAnImage: 'El archivo debe ser una imagen', noText: 'Se requiere texto', quotaExceeded: 'Cuota diaria de escaneo agotada' },
    auth: {
      invalidCredentials: 'Usuario o contraseña incorrectos',
      accountTaken: 'Cuenta ya en uso',
      passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
      sessionExpired: 'La sesión expiró, por favor inicia sesión de nuevo',
    },
  },
  email: {
    welcome: { subject: '¡Bienvenido a BMO Robot!' },
    passwordReset: { subject: 'Restablece tu contraseña de BMO Robot' },
  },
};

const FR = {
  error: {
    serverUnavailable: 'Serveur indisponible',
    networkError: 'Erreur réseau',
    unauthorized: 'Non autorisé',
    forbidden: 'Accès interdit',
    notFound: 'Introuvable',
    validationFailed: 'Validation échouée',
    rateLimited: 'Trop de requêtes, veuillez réessayer plus tard.',
    internal: 'Erreur interne du serveur',
    methodNotAllowed: 'Méthode non autorisée',
    databaseUnavailable: 'Base de données indisponible',
    clan: {
      full: 'Limite de clan atteinte. Rejoignez un clan existant.',
      notFound: 'Le clan n’existe pas',
      notMember: 'Vous n’êtes pas membre de ce clan',
      memberNotFound: 'Membre introuvable dans le clan',
      notLeader: 'Seul le chef peut faire cela',
      missingTarget: 'Nom du membre requis',
      missingExp: 'Pas assez d’EXP',
      emptyMessage: 'Message vide',
      messageTooLong: 'Message trop long',
    },
    chat: { empty: 'Message vide', tooLong: 'Message trop long' },
    scan: { notAnImage: 'Le fichier doit être une image', noText: 'Texte requis', quotaExceeded: 'Quota d’analyse quotidien dépassé' },
    auth: {
      invalidCredentials: 'Identifiant ou mot de passe invalide',
      accountTaken: 'Compte déjà pris',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      sessionExpired: 'Session expirée, veuillez vous reconnecter',
    },
  },
  email: {
    welcome: { subject: 'Bienvenue sur BMO Robot !' },
    passwordReset: { subject: 'Réinitialisez votre mot de passe BMO Robot' },
  },
};

const JA = {
  error: {
    serverUnavailable: 'サーバーが利用できません',
    networkError: 'ネットワークエラー',
    unauthorized: '認証されていません',
    forbidden: 'アクセスが禁止されています',
    notFound: '見つかりません',
    validationFailed: '入力が無効です',
    rateLimited: 'リクエストが多すぎます。しばらくしてから再度お試しください。',
    internal: 'サーバー内部エラー',
    methodNotAllowed: 'メソッドが許可されていません',
    databaseUnavailable: 'データベースが利用できません',
    clan: {
      full: 'クランの上限に達しました。既存のクランに参加してください。',
      notFound: 'クランが存在しません',
      notMember: 'このクランのメンバーではありません',
      memberNotFound: 'クラン内にメンバーが見つかりません',
      notLeader: 'リーダーのみが実行できます',
      missingTarget: 'メンバー名が必要です',
      missingExp: '経験値が不足しています',
      emptyMessage: 'メッセージが空です',
      messageTooLong: 'メッセージが長すぎます',
    },
    chat: { empty: 'メッセージが空です', tooLong: 'メッセージが長すぎます' },
    scan: { notAnImage: 'ファイルは画像である必要があります', noText: 'テキストが必要です', quotaExceeded: '1日のスキャン上限を超えました' },
    auth: {
      invalidCredentials: 'ユーザー名またはパスワードが無効です',
      accountTaken: 'アカウントは既に使用されています',
      passwordTooShort: 'パスワードは6文字以上である必要があります',
      sessionExpired: 'セッションが切れました。再度ログインしてください',
    },
  },
  email: {
    welcome: { subject: 'BMO Robot へようこそ！' },
    passwordReset: { subject: 'BMO Robot のパスワードをリセット' },
  },
};

const KO = {
  error: {
    serverUnavailable: '서버를 사용할 수 없습니다',
    networkError: '네트워크 오류',
    unauthorized: '인증되지 않음',
    forbidden: '접근 금지',
    notFound: '찾을 수 없음',
    validationFailed: '입력값이 잘못되었습니다',
    rateLimited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    internal: '내부 서버 오류',
    methodNotAllowed: '허용되지 않은 메서드',
    databaseUnavailable: '데이터베이스를 사용할 수 없습니다',
    clan: {
      full: '클랜 한도에 도달했습니다. 기존 클랜에 가입하세요.',
      notFound: '클랜이 존재하지 않습니다',
      notMember: '이 클랜의 멤버가 아닙니다',
      memberNotFound: '클랜에서 멤버를 찾을 수 없습니다',
      notLeader: '리더만 수행할 수 있습니다',
      missingTarget: '멤버 이름이 필요합니다',
      missingExp: '경험치가 부족합니다',
      emptyMessage: '메시지가 비어 있습니다',
      messageTooLong: '메시지가 너무 깁니다',
    },
    chat: { empty: '메시지가 비어 있습니다', tooLong: '메시지가 너무 깁니다' },
    scan: { notAnImage: '파일은 이미지여야 합니다', noText: '텍스트가 필요합니다', quotaExceeded: '일일 스캔 할당량을 초과했습니다' },
    auth: {
      invalidCredentials: '아이디 또는 비밀번호가 잘못되었습니다',
      accountTaken: '이미 사용 중인 계정입니다',
      passwordTooShort: '비밀번호는 최소 6자 이상이어야 합니다',
      sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요',
    },
  },
  email: {
    welcome: { subject: 'BMO Robot에 오신 것을 환영합니다!' },
    passwordReset: { subject: 'BMO Robot 비밀번호 재설정' },
  },
};

const ID = {
  error: {
    serverUnavailable: 'Server tidak tersedia',
    networkError: 'Kesalahan jaringan',
    unauthorized: 'Tidak diizinkan',
    forbidden: 'Akses dilarang',
    notFound: 'Tidak ditemukan',
    validationFailed: 'Validasi gagal',
    rateLimited: 'Terlalu banyak permintaan, harap tunggu.',
    internal: 'Kesalahan server internal',
    methodNotAllowed: 'Metode tidak diizinkan',
    databaseUnavailable: 'Basis data tidak tersedia',
    clan: {
      full: 'Batas klan tercapai. Bergabunglah dengan klan yang ada.',
      notFound: 'Klan tidak ada',
      notMember: 'Anda bukan anggota klan ini',
      memberNotFound: 'Anggota tidak ditemukan di klan',
      notLeader: 'Hanya pemimpin yang dapat melakukan ini',
      missingTarget: 'Nama anggota wajib diisi',
      missingExp: 'EXP tidak cukup',
      emptyMessage: 'Pesan kosong',
      messageTooLong: 'Pesan terlalu panjang',
    },
    chat: { empty: 'Pesan kosong', tooLong: 'Pesan terlalu panjang' },
    scan: { notAnImage: 'File harus berupa gambar', noText: 'Teks wajib diisi', quotaExceeded: 'Kuota pemindaian harian terlampaui' },
    auth: {
      invalidCredentials: 'Nama pengguna atau kata sandi salah',
      accountTaken: 'Akun sudah digunakan',
      passwordTooShort: 'Kata sandi minimal 6 karakter',
      sessionExpired: 'Sesi kedaluwarsa, harap masuk lagi',
    },
  },
  email: {
    welcome: { subject: 'Selamat datang di BMO Robot!' },
    passwordReset: { subject: 'Reset kata sandi BMO Robot Anda' },
  },
};

const AR = {
  error: {
    serverUnavailable: 'الخادم غير متوفر',
    networkError: 'خطأ في الشبكة',
    unauthorized: 'غير مصرّح',
    forbidden: 'ممنوع الوصول',
    notFound: 'غير موجود',
    validationFailed: 'فشل التحقق',
    rateLimited: 'الطلبات كثيرة جداً، حاول لاحقاً.',
    internal: 'خطأ داخلي في الخادم',
    methodNotAllowed: 'الطريقة غير مسموحة',
    databaseUnavailable: 'قاعدة البيانات غير متوفرة',
    clan: {
      full: 'تم بلوغ حد العشيرة. انضم إلى عشيرة موجودة.',
      notFound: 'العشيرة غير موجودة',
      notMember: 'لست عضواً في هذه العشيرة',
      memberNotFound: 'العضو غير موجود في العشيرة',
      notLeader: 'القائد فقط يمكنه فعل ذلك',
      missingTarget: 'اسم العضو مطلوب',
      missingExp: 'لا توجد خبرة كافية',
      emptyMessage: 'الرسالة فارغة',
      messageTooLong: 'الرسالة طويلة جداً',
    },
    chat: { empty: 'الرسالة فارغة', tooLong: 'الرسالة طويلة جداً' },
    scan: { notAnImage: 'يجب أن يكون الملف صورة', noText: 'النص مطلوب', quotaExceeded: 'تم تجاوز حصة المسح اليومية' },
    auth: {
      invalidCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      accountTaken: 'الحساب مستخدم بالفعل',
      passwordTooShort: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      sessionExpired: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
    },
  },
  email: {
    welcome: { subject: 'مرحباً بك في BMO Robot!' },
    passwordReset: { subject: 'إعادة تعيين كلمة مرور BMO Robot' },
  },
};

const PT = {
  error: {
    serverUnavailable: 'Servidor indisponível',
    networkError: 'Erro de rede',
    unauthorized: 'Não autorizado',
    forbidden: 'Acesso proibido',
    notFound: 'Não encontrado',
    validationFailed: 'Validação falhou',
    rateLimited: 'Muitas requisições. Tente novamente mais tarde.',
    internal: 'Erro interno do servidor',
    methodNotAllowed: 'Método não permitido',
    databaseUnavailable: 'Banco de dados indisponível',
    clan: {
      full: 'Limite de clã atingido. Entre em um clã existente.',
      notFound: 'Clã não existe',
      notMember: 'Você não é membro deste clã',
      memberNotFound: 'Membro não encontrado no clã',
      notLeader: 'Apenas o líder pode fazer isso',
      missingTarget: 'Nome do membro é obrigatório',
      missingExp: 'EXP insuficiente',
      emptyMessage: 'Mensagem vazia',
      messageTooLong: 'Mensagem muito longa',
    },
    chat: { empty: 'Mensagem vazia', tooLong: 'Mensagem muito longa' },
    scan: { notAnImage: 'O arquivo deve ser uma imagem', noText: 'Texto obrigatório', quotaExceeded: 'Cota diária de análise excedida' },
    auth: {
      invalidCredentials: 'Usuário ou senha inválidos',
      accountTaken: 'Conta já em uso',
      passwordTooShort: 'A senha deve ter pelo menos 6 caracteres',
      sessionExpired: 'Sessão expirada, faça login novamente',
    },
  },
  email: {
    welcome: { subject: 'Bem-vindo ao BMO Robot!' },
    passwordReset: { subject: 'Redefina sua senha do BMO Robot' },
  },
};

const ALL = { vi: VI, en: EN, zh: ZH, es: ES, fr: FR, ja: JA, ko: KO, id: ID, ar: AR, pt: PT };

for (const [code, dict] of Object.entries(ALL)) {
  const file = path.join(OUT_DIR, `${code}.json`);
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${code}.json (${JSON.stringify(dict).length} bytes)`);
}

console.log('Done.');