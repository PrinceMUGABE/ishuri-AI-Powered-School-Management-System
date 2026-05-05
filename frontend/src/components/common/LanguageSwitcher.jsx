// components/Common/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' }
  ];
  
  const changeLanguage = async (langCode) => {
    console.log(`[LanguageSwitcher] Changing language to: ${langCode}`);
    
    // Change i18n language
    await i18n.changeLanguage(langCode);
    
    // Store in multiple places
    localStorage.setItem('user_language', langCode);
    sessionStorage.setItem('selected_language', langCode);
    
    // Update axios default header if available
    if (window.apiClient) {
      window.apiClient.defaults.headers.common['X-Language'] = langCode;
    }
    
    // Force reload to ensure all components update
    // window.location.reload(); // Optional: uncomment to force reload
  };
  
  return (
    <div className="relative group">
      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
              i18n.language === lang.code ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : ''
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;