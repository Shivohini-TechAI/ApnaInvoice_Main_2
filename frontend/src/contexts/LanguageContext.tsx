import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n/config';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isLanguageSelected: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [isLanguageSelected, setIsLanguageSelected] = useState<boolean>(false);

  const setLanguage = (lang: string) => {
    console.log('Setting language to:', lang);
    localStorage.setItem('selectedLanguage', lang);
    setLanguageState(lang);
    setIsLanguageSelected(true);
    i18n.changeLanguage(lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'hi' ? 'ltr' : 'ltr'; 
  };

  useEffect(() => {
   
    const savedLanguage = localStorage.getItem('selectedLanguage');
    console.log('Initializing language with:', savedLanguage);
    if (savedLanguage) {
      setLanguageState(savedLanguage);
      setIsLanguageSelected(true);
      i18n.changeLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    } else {
      setIsLanguageSelected(false);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLanguageSelected }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
