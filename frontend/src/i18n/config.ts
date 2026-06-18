import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enJson from '../locales/en.json';
import hiJson from '../locales/hi.json';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: enJson },
        hi: { translation: hiJson },
      },
      lng: localStorage.getItem('selectedLanguage') || 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage'],
      },
    });
}

export default i18n;
