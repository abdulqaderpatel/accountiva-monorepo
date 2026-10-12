import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

// Retrieve saved locale or default to 'en'
const savedLocale = localStorage.getItem('accountiva_locale') || 'en';

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    hi,
    es,
    ar,
  },
});

export default i18n;
