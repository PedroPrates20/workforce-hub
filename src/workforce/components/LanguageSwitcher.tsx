import { useState, useEffect } from 'react';

export const LanguageSwitcher = () => {
  const [lang, setLang] = useState<string>(() => {
    return localStorage.getItem('app_language') || 'pt';
  });

  const handleLanguageChange = (selectedLang: string) => {
    setLang(selectedLang);
    localStorage.setItem('app_language', selectedLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en-US';
  }, [lang]);

  return (
    <div className="flex items-center gap-1 p-1 bg-[#ffffff] rounded-lg border border-gray-800">
      <button
        type="button"
        onClick={() => handleLanguageChange('pt')}
        className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-all ${
          lang === 'pt'
            ? 'border border-amber-600 bg-amber-950/20 text-amber-500 shadow-sm'
            : 'text-gray-400 hover:text-gray-200 border border-transparent'
        }`}
      >
        <span className="text-amber-600 font-extrabold text-[10px]">BR</span> PT
      </button>

      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-all ${
          lang === 'en'
            ? 'border border-amber-600 bg-amber-950/20 text-amber-500 shadow-sm'
            : 'text-gray-400 hover:text-gray-200 border border-transparent'
        }`}
      >
        <span className="text-blue-500 font-extrabold text-[10px]">US</span> EN
      </button>
    </div>
  );
};