// context/LanguageContext.js
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const translationCache = useRef({});

  useEffect(() => {
    const loadTranslations = async (lang) => {
      if (lang === 'en') {
        setTranslations({});
        return;
      }
      
      setIsLoading(true);
      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (response.ok) {
          const data = await response.json();
          setTranslations(data);
        } else {
          console.warn(`Failed to load translations for ${lang}`);
          setTranslations({});
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations(selectedLanguage);
  }, [selectedLanguage]);

  const t = (key, fallback = key) => {
    return translations[key] || fallback;
  };

  const translateText = useCallback(async (text, targetLang = selectedLanguage) => {
    if (targetLang === 'en' || !text.trim()) return text;
    
    const cacheKey = `${text}-${targetLang}`;
    
    if (translationCache.current[cacheKey]) {
      return translationCache.current[cacheKey];
    }
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: 'en', targetLang })
      });
      
      if (response.ok) {
        const { translatedText } = await response.json();
        translationCache.current[cacheKey] = translatedText;
        return translatedText;
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
    
    return text;
  }, [selectedLanguage]);

  return (
    <LanguageContext.Provider value={{
      selectedLanguage,
      setSelectedLanguage,
      t,
      isLoading,
      translations,
      translateText
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};