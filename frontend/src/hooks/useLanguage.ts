import { useLanguage as useLanguageContext } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { language, setLanguage, isLanguageSelected } = useLanguageContext();
  const { t } = useTranslation();

  return {
    language,
    setLanguage,
    isLanguageSelected,
    t,
  };
};
