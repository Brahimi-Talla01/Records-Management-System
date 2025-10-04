import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const LanguageSelector = ({ currentLanguage = 'fr', onLanguageChange }) => {
  const languages = [
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' }
  ];

  const handleLanguageChange = (selectedLanguage) => {
    localStorage.setItem('preferred-language', selectedLanguage);
    onLanguageChange(selectedLanguage);
  };

  const formatOption = (option) => (
    <div className="flex items-center space-x-2">
      <span className="text-lg">{option?.flag}</span>
      <span className="font-body">{option?.label}</span>
    </div>
  );

  return (
    <div className="flex items-center space-x-2">
      <Icon name="Globe" size={16} className="text-muted-foreground" />
      <Select
        options={languages?.map(lang => ({
          ...lang,
          label: `${lang?.flag} ${lang?.label}`
        }))}
        value={currentLanguage}
        onChange={handleLanguageChange}
        className="w-32"
      />
    </div>
  );
};

export default LanguageSelector;