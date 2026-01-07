
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { translations } from '../lib/translations';

export const useTranslation = () => {
  const currentLanguage = useSelector((state: RootState) => state.language.currentLanguage);
  
  // Helper to get nested properties safely
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Return key if translation missing
      }
    }
    return value;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    
    return new Intl.DateTimeFormat(currentLanguage === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return { t, language: currentLanguage, formatDate };
};
