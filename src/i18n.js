/**
 * Internationalization strings for ja/en.
 */

export const translations = {
  ja: {
    title: 'JSON Schema バリデータ',
    schemaLabel: 'スキーマ (JSON Schema Draft 7)',
    dataLabel: 'データ (JSON)',
    validateBtn: '検証',
    copyErrors: 'エラーをコピー',
    clearBtn: 'クリア',
    valid: '有効',
    invalid: '無効',
    errorsFound: (n) => `${n} 件のエラー`,
    noErrors: 'エラーなし — 検証済み',
    invalidSchema: 'スキーマの JSON が無効です',
    invalidData: 'データの JSON が無効です',
    examples: 'サンプル',
    theme: 'テーマ',
    lang: 'EN',
    path: 'パス',
    message: 'メッセージ',
    keyword: 'キーワード',
    copied: 'コピーしました',
    schemaError: 'スキーマ解析エラー',
    dataError: 'データ解析エラー',
    validationResult: '検証結果',
    loading: '検証中...',
    placeholder: {
      schema: '{\n  "type": "object"\n}',
      data: '{\n  "key": "value"\n}'
    }
  },
  en: {
    title: 'JSON Schema Validator',
    schemaLabel: 'Schema (JSON Schema Draft 7)',
    dataLabel: 'Data (JSON)',
    validateBtn: 'Validate',
    copyErrors: 'Copy errors',
    clearBtn: 'Clear',
    valid: 'Valid',
    invalid: 'Invalid',
    errorsFound: (n) => `${n} error${n === 1 ? '' : 's'} found`,
    noErrors: 'No errors — valid',
    invalidSchema: 'Schema JSON is invalid',
    invalidData: 'Data JSON is invalid',
    examples: 'Examples',
    theme: 'Theme',
    lang: 'JA',
    path: 'Path',
    message: 'Message',
    keyword: 'Keyword',
    copied: 'Copied!',
    schemaError: 'Schema parse error',
    dataError: 'Data parse error',
    validationResult: 'Validation Result',
    loading: 'Validating...',
    placeholder: {
      schema: '{\n  "type": "object"\n}',
      data: '{\n  "key": "value"\n}'
    }
  }
};

let currentLang = 'en';

export function setLang(lang) {
  if (lang === 'ja' || lang === 'en') currentLang = lang;
}

export function getLang() {
  return currentLang;
}

export function t(key, ...args) {
  const val = translations[currentLang][key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}
