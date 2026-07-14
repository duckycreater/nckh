/**
 * scripts/inject-i18n-keys.cjs
 *
 * Injects new i18n namespaces (smartBin, survey, theoryOfChange, voice,
 * app, research, etc.) into vi.json + en.json + zh.json with curated
 * translations, so the freshly-extracted components can render in 8 locales.
 *
 * The 5 newer locales (es/fr/ja/ko/id) inherit these new keys via per-key
 * fallback to en, configured in src/lib/i18n.ts.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '..', 'src', 'locales');

// Vietnamese reference translations for new namespaces.
const VI = {
  smartBin: {
    kpis: {
      binsOnline: 'Thùng trực tuyến',
      offline: 'Ngoại tuyến',
      totalKg: 'Tổng kg (24h)',
      co2KgSaved: 'kg CO₂e tránh được',
    },
    forecast: 'Dự báo 24h',
    hourLabels: { '0': '00', '6': '06', '12': '12', '18': '18', '24': '24' },
  },
  survey: {
    submit: 'Gửi',
    submitted: 'Đã gửi',
  },
  theoryOfChange: {
    title: 'Lý thuyết thay đổi',
    tagline: 'Năng lực × Cơ hội × Động lực → Hành vi → Tác động SDG.',
    taglineHint: 'Kéo thanh trượt để thử nghiệm can thiệp trực tiếp.',
    nodes: {
      capability: 'Năng lực',
      opportunity: 'Cơ hội',
      motivation: 'Động lực',
      behaviour: 'Hành vi',
    },
    kinds: {
      knowledgeSkill: 'Kiến thức / Kỹ năng',
      peerBinAccess: 'Bạn bè / Truy cập thùng',
      identityReward: 'Bản ngã / Phần thưởng',
      sortAccuracy: 'Độ chính xác phân loại',
    },
  },
  research: {
    cohorts: {
      C: 'Đối chứng',
      E1: 'E1 (gamification)',
      E2: 'E2 (+FL)',
      E3: 'E3 (+Twin)',
      E4: 'E4 (+Identity)',
    },
    axisLabels: {
      identityChange: 'Thay đổi bản ngã',
      sortAccuracy: 'Độ chính xác phân loại',
      d30Retention: 'Retention D30',
    },
  },
  voice: {
    title: 'Đổi ngôn ngữ',
    on: 'Bật giọng nói',
    off: 'Tắt giọng nói',
    lang: { vi: 'VI', en: 'EN' },
  },
  family: {
    open: 'Mở Family Mode',
    homeTitle: 'Family Mode',
  },
  app: {
    syncingLogin: 'Đang đồng bộ đăng nhập...',
    syncingHint: 'Đang khôi phục phiên của bạn',
    loadingDashboard: 'Đang tải dashboard...',
    home: 'Trang chính',
  },
};

// English reference translations (same keys, English copy).
const EN = {
  smartBin: {
    kpis: {
      binsOnline: 'Bins online',
      offline: 'Offline',
      totalKg: 'Total kg (24h)',
      co2KgSaved: 'kg CO₂e avoided',
    },
    forecast: '24h Demand Forecast',
    hourLabels: { '0': '00', '6': '06', '12': '12', '18': '18', '24': '24' },
  },
  survey: {
    submit: 'Submit',
    submitted: 'Submitted',
  },
  theoryOfChange: {
    title: 'Theory of Change',
    tagline: 'Capability × Opportunity × Motivation → Behaviour → SDG Impact.',
    taglineHint: 'Drag the slider to test interventions live.',
    nodes: {
      capability: 'Capability',
      opportunity: 'Opportunity',
      motivation: 'Motivation',
      behaviour: 'Behaviour',
    },
    kinds: {
      knowledgeSkill: 'Knowledge / Skill',
      peerBinAccess: 'Peer / Bin access',
      identityReward: 'Identity / Reward',
      sortAccuracy: 'Sort accuracy',
    },
  },
  research: {
    cohorts: {
      C: 'Control',
      E1: 'E1 (gamification)',
      E2: 'E2 (+FL)',
      E3: 'E3 (+Twin)',
      E4: 'E4 (+Identity)',
    },
    axisLabels: {
      identityChange: 'Identity change',
      sortAccuracy: 'Sort accuracy',
      d30Retention: 'D30 retention',
    },
  },
  voice: {
    title: 'Switch language',
    on: 'Enable voice',
    off: 'Disable voice',
    lang: { vi: 'VI', en: 'EN' },
  },
  family: {
    open: 'Open Family Mode',
    homeTitle: 'Family Mode',
  },
  app: {
    syncingLogin: 'Syncing login...',
    syncingHint: 'Restoring your session',
    loadingDashboard: 'Loading dashboard...',
    home: 'Home',
  },
};

// Chinese (Simplified).
const ZH = {
  smartBin: {
    kpis: {
      binsOnline: '在线垃圾桶',
      offline: '离线',
      totalKg: '24小时总公斤数',
      co2KgSaved: '避免的二氧化碳当量',
    },
    forecast: '24小时需求预测',
    hourLabels: { '0': '00', '6': '06', '12': '12', '18': '18', '24': '24' },
  },
  survey: { submit: '提交', submitted: '已提交' },
  theoryOfChange: {
    title: '变革理论',
    tagline: '能力 × 机会 × 动机 → 行为 → SDG 影响力。',
    taglineHint: '拖动滑块实时测试干预。',
    nodes: { capability: '能力', opportunity: '机会', motivation: '动机', behaviour: '行为' },
    kinds: {
      knowledgeSkill: '知识 / 技能',
      peerBinAccess: '同伴 / 桶可及性',
      identityReward: '身份 / 奖励',
      sortAccuracy: '分类准确度',
    },
  },
  research: {
    cohorts: { C: '对照组', E1: 'E1（游戏化）', E2: 'E2（+FL）', E3: 'E3（+Twin）', E4: 'E4（+Identity）' },
    axisLabels: { identityChange: '身份变化', sortAccuracy: '分类准确度', d30Retention: 'D30 留存' },
  },
  voice: { title: '切换语言', on: '开启语音', off: '关闭语音', lang: { vi: 'VI', en: 'EN' } },
  family: { open: '打开家庭模式', homeTitle: '家庭模式' },
  app: { syncingLogin: '正在同步登录...', syncingHint: '正在恢复您的会话', loadingDashboard: '正在加载仪表盘...', home: '首页' },
};

function setDeep(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function apply(locale, dict) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [namespace, nsObj] of Object.entries(dict)) {
    if (data[namespace] == null) data[namespace] = {};
    const flat = (function walk(node, prefix) {
      const out = [];
      if (typeof node === 'string') {
        out.push([prefix, node]);
      } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          out.push(...walk(v, prefix ? `${prefix}.${k}` : k));
        }
      }
      return out;
    })(nsObj, namespace);
    for (const [p, v] of flat) {
      setDeep(data, p, v);
      count++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`${locale}: injected ${count} new keys`);
}

apply('vi', VI);
apply('en', EN);
apply('zh', ZH);

console.log('Done.');