
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LanguageState {
  currentLanguage: 'en' | 'id';
}

const savedLang = localStorage.getItem('app_language') as 'en' | 'id';

const initialState: LanguageState = {
  currentLanguage: savedLang || 'id', // Default to Indonesian
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'id'>) => {
      state.currentLanguage = action.payload;
      localStorage.setItem('app_language', action.payload);
    },
    toggleLanguage: (state) => {
      const newLang = state.currentLanguage === 'en' ? 'id' : 'en';
      state.currentLanguage = newLang;
      localStorage.setItem('app_language', newLang);
    }
  },
});

export const { setLanguage, toggleLanguage } = languageSlice.actions;
export default languageSlice.reducer;
