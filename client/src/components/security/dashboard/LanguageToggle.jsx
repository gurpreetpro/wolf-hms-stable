import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../../../contexts/LanguageContext';
import './LanguageToggle.css';

/**
 * LanguageToggle - Switch between English and Hindi
 * Displays the opposite language as the switch option
 */
const LanguageToggle = ({ 
    showLabel = true, 
    size = 'default', 
    variant = 'button' // 'button' | 'dropdown' | 'minimal'
}) => {
    const { language, toggleLanguage, setLanguage, availableLanguages } = useLanguage();
    
    const currentLang = LANGUAGES[language];
    const oppositeCode = language === 'en' ? 'hi' : 'en';
    const oppositeLang = LANGUAGES[oppositeCode];

    if (variant === 'dropdown') {
        return (
            <div className={`language-toggle dropdown size-${size}`}>
                <button className="toggle-btn dropdown-toggle">
                    <Globe size={size === 'small' ? 14 : 16} />
                    <span className="current-lang">{currentLang.nativeName}</span>
                </button>
                <div className="dropdown-menu">
                    {availableLanguages.map(lang => (
                        <button
                            key={lang.code}
                            className={`dropdown-item ${lang.code === language ? 'active' : ''}`}
                            onClick={() => setLanguage(lang.code)}
                        >
                            <span className="lang-name">{lang.nativeName}</span>
                            <span className="lang-name-english">{lang.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (variant === 'minimal') {
        return (
            <button 
                className={`language-toggle minimal size-${size}`}
                onClick={toggleLanguage}
                title={`Switch to ${oppositeLang.name}`}
            >
                <span className="lang-code">{oppositeLang.nativeName}</span>
            </button>
        );
    }

    // Default button variant
    return (
        <button 
            className={`language-toggle button size-${size}`}
            onClick={toggleLanguage}
            title={`Switch to ${oppositeLang.name}`}
        >
            <Globe size={size === 'small' ? 14 : 16} />
            {showLabel && <span className="switch-label">{oppositeLang.nativeName}</span>}
        </button>
    );
};

export default LanguageToggle;
