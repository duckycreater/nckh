/**
 * scripts/inject-server-keys.cjs — extend server/locales/*.json with new keys.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'server', 'locales');

const NEW_KEYS = {
  en: {
    tournamentEnded: 'Tournament has ended',
    nameTooShort: 'Clan name too short',
    tagInvalid: 'Clan tag must be 2-5 characters',
    alreadyMember: 'You are already in a clan',
    tagTaken: 'Clan tag already taken',
    notLeaderDisband: 'Only the leader can disband',
    badClanId: 'Invalid clan id',
    badUserId: 'Invalid user id',
    badRequest: 'Bad request',
    emptyBody: 'Request body is empty',
  },
  vi: {
    tournamentEnded: 'Giải đấu đã kết thúc',
    nameTooShort: 'Tên clan quá ngắn',
    tagInvalid: 'Tag clan phải 2-5 ký tự',
    alreadyMember: 'Bạn đã ở trong một clan',
    tagTaken: 'Tag clan đã tồn tại',
    notLeaderDisband: 'Chỉ chủ tịch mới có quyền giải tán',
    badClanId: 'ID clan không hợp lệ',
    badUserId: 'ID người dùng không hợp lệ',
    badRequest: 'Yêu cầu không hợp lệ',
    emptyBody: 'Body yêu cầu trống',
  },
  zh: {
    tournamentEnded: '锦标赛已结束',
    nameTooShort: '家族名称太短',
    tagInvalid: '家族标签必须 2-5 个字符',
    alreadyMember: '您已在家族中',
    tagTaken: '家族标签已被占用',
    notLeaderDisband: '只有族长才能解散',
    badClanId: '家族 ID 无效',
    badUserId: '用户 ID 无效',
    badRequest: '请求无效',
    emptyBody: '请求体为空',
  },
  es: {
    tournamentEnded: 'El torneo ha terminado',
    nameTooShort: 'Nombre del clan demasiado corto',
    tagInvalid: 'La etiqueta del clan debe tener 2-5 caracteres',
    alreadyMember: 'Ya estás en un clan',
    tagTaken: 'Etiqueta de clan ya en uso',
    notLeaderDisband: 'Solo el líder puede disolver',
    badClanId: 'ID de clan inválido',
    badUserId: 'ID de usuario inválido',
    badRequest: 'Solicitud incorrecta',
    emptyBody: 'Cuerpo de la solicitud vacío',
  },
  fr: {
    tournamentEnded: 'Le tournoi est terminé',
    nameTooShort: 'Nom de clan trop court',
    tagInvalid: 'Le tag du clan doit contenir 2-5 caractères',
    alreadyMember: 'Vous êtes déjà dans un clan',
    tagTaken: 'Tag de clan déjà pris',
    notLeaderDisband: 'Seul le chef peut dissoudre',
    badClanId: 'ID de clan invalide',
    badUserId: 'ID utilisateur invalide',
    badRequest: 'Requête invalide',
    emptyBody: 'Corps de la requête vide',
  },
  ja: {
    tournamentEnded: 'トーナメントは終了しました',
    nameTooShort: 'クラン名が短すぎます',
    tagInvalid: 'クランタグは2〜5文字である必要があります',
    alreadyMember: 'すでにクランに参加しています',
    tagTaken: 'クランタグは既に使用されています',
    notLeaderDisband: 'リーダーのみが解散できます',
    badClanId: '無効なクランID',
    badUserId: '無効なユーザーID',
    badRequest: 'リクエストが無効です',
    emptyBody: 'リクエストボディが空です',
  },
  ko: {
    tournamentEnded: '토너먼트가 종료되었습니다',
    nameTooShort: '클랜 이름이 너무 짧습니다',
    tagInvalid: '클랜 태그는 2-5자여야 합니다',
    alreadyMember: '이미 클랜에 가입되어 있습니다',
    tagTaken: '클랜 태그가 이미 사용 중입니다',
    notLeaderDisband: '리더만解散할 수 있습니다',
    badClanId: '잘못된 클랜 ID',
    badUserId: '잘못된 사용자 ID',
    badRequest: '잘못된 요청',
    emptyBody: '요청 본문이 비어 있습니다',
  },
  id: {
    tournamentEnded: 'Turnamen telah berakhir',
    nameTooShort: 'Nama klan terlalu pendek',
    tagInvalid: 'Tag klan harus 2-5 karakter',
    alreadyMember: 'Anda sudah berada di klan',
    tagTaken: 'Tag klan sudah digunakan',
    notLeaderDisband: 'Hanya pemimpin yang dapat membubarkan',
    badClanId: 'ID klan tidak valid',
    badUserId: 'ID pengguna tidak valid',
    badRequest: 'Permintaan tidak valid',
    emptyBody: 'Body permintaan kosong',
  },
  ar: {
    tournamentEnded: 'انتهت البطولة',
    nameTooShort: 'اسم العشيرة قصير جداً',
    tagInvalid: 'يجب أن يكون وسم العشيرة 2-5 أحرف',
    alreadyMember: 'أنت بالفعل في عشيرة',
    tagTaken: 'وسم العشيرة مستخدم بالفعل',
    notLeaderDisband: 'القائد فقط يمكنه الحل',
    badClanId: 'معرّف العشيرة غير صالح',
    badUserId: 'معرّف المستخدم غير صالح',
    badRequest: 'طلب غير صالح',
    emptyBody: 'جسم الطلب فارغ',
  },
  pt: {
    tournamentEnded: 'O torneio terminou',
    nameTooShort: 'Nome do clã muito curto',
    tagInvalid: 'A tag do clã deve ter 2-5 caracteres',
    alreadyMember: 'Você já está em um clã',
    tagTaken: 'Tag de clã já em uso',
    notLeaderDisband: 'Apenas o líder pode dissolver',
    badClanId: 'ID de clã inválido',
    badUserId: 'ID de usuário inválido',
    badRequest: 'Requisição inválida',
    emptyBody: 'Corpo da requisição vazio',
  },
};

for (const [code, dict] of Object.entries(NEW_KEYS)) {
  const file = path.join(DIR, `${code}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.error) data.error = {};
  let count = 0;
  for (const [k, v] of Object.entries(dict)) {
    if (data.error[k] === undefined) {
      data.error[k] = v;
      count++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${code}: added ${count} new keys`);
}

console.log('Done.');