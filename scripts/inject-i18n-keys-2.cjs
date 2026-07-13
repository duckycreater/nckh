/**
 * scripts/inject-i18n-keys-2.cjs — second-pass injection.
 */
const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.resolve(__dirname, '..', 'src', 'locales');

const DICT = {
  vi: {
    cards: { unknown: 'Không xác định' },
    error: {
      serverUnavailable: 'Máy chủ không khả dụng',
      networkError: 'Lỗi mạng',
      unauthorized: 'Phiên đăng nhập đã hết hạn',
      forbidden: 'Bạn không có quyền truy cập',
      notFound: 'Không tìm thấy tài nguyên',
      validationFailed: 'Dữ liệu không hợp lệ',
      rateLimited: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
      internal: 'Đã xảy ra lỗi, vui lòng thử lại sau',
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
    },
    email: {
      welcome: { subject: 'Chào mừng đến với BMO Robot!' },
      passwordReset: { subject: 'Khôi phục mật khẩu BMO Robot' },
    },
  },
  en: {
    cards: { unknown: 'Unknown' },
    error: {
      serverUnavailable: 'Server unavailable',
      networkError: 'Network error',
      unauthorized: 'Your session has expired',
      forbidden: 'You do not have permission',
      notFound: 'Resource not found',
      validationFailed: 'Invalid input',
      rateLimited: 'Too many requests. Please slow down.',
      internal: 'Something went wrong, please try again',
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
    },
    email: {
      welcome: { subject: 'Welcome to BMO Robot!' },
      passwordReset: { subject: 'Reset your BMO Robot password' },
    },
  },
  zh: {
    cards: { unknown: '未知' },
    error: {
      serverUnavailable: '服务器不可用',
      networkError: '网络错误',
      unauthorized: '会话已过期',
      forbidden: '您没有权限',
      notFound: '未找到资源',
      validationFailed: '输入无效',
      rateLimited: '请求过于频繁，请稍后再试。',
      internal: '出现错误，请稍后再试',
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
      chat: {
        empty: '消息为空',
        tooLong: '消息过长',
      },
    },
    email: {
      welcome: { subject: '欢迎使用 BMO Robot！' },
      passwordReset: { subject: '重置您的 BMO Robot 密码' },
    },
  },
};

function setDeep(obj, p, value) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function flat(o, prefix) {
  const out = [];
  if (typeof o === 'string') out.push([prefix, o]);
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      out.push(...flat(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return out;
}

for (const [locale, dict] of Object.entries(DICT)) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [p, v] of flat(dict, '')) {
    setDeep(data, p, v);
    count++;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${locale}: injected ${count} keys`);
}

console.log('Done.');