import React, { createContext, useContext, useState, useCallback } from 'react';

// Available languages
export const LANGUAGES = {
    en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
    hi: { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', dir: 'ltr' }
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Translations
const translations = {
    en: {
        // Header
        title: 'Guard Command Centre',
        systemOnline: 'SYSTEM ONLINE',
        systemOffline: 'SYSTEM OFFLINE',
        refresh: 'Refresh',
        
        // Guard Card
        guards: 'Guards',
        online: 'Online',
        offline: 'Offline',
        patrolling: 'Patrolling',
        idle: 'Idle',
        sos: 'SOS',
        battery: 'Battery',
        steps: 'Steps',
        shiftStart: 'Shift Start',
        onDuty: 'On Duty',
        ping: 'Ping',
        photo: 'Photo',
        chat: 'Chat',
        
        // Quick Commands
        quickCommands: 'Quick Commands',
        pingAll: 'Ping All Guards',
        broadcast: 'Broadcast Message',
        lockdown: 'Emergency Lockdown',
        unlock: 'End Lockdown',
        requestPhotos: 'Request All Photos',
        settings: 'Alert Settings',
        printReport: 'Print Report',
        recentActivity: 'Recent Activity',
        send: 'Send',
        cancel: 'Cancel',
        confirmLockdown: 'Confirm Lockdown?',
        confirmUnlock: 'End Lockdown?',
        yes: 'Yes',
        no: 'No',
        
        // Alerts
        sosAlert: 'SOS ALERT',
        manDown: 'MAN DOWN',
        panicButton: 'PANIC BUTTON',
        geofenceBreach: 'GEOFENCE BREACH',
        acknowledge: 'Acknowledge',
        location: 'Location',
        ago: 'ago',
        
        // Voice Channel
        voiceChannel: 'Voice Channel',
        connecting: 'Connecting...',
        connected: 'Connected',
        pushToTalk: 'Hold SPACE to talk',
        participants: 'Participants',
        muted: 'Muted',
        unmuted: 'Speaking',
        
        // Reports
        patrolReport: 'Patrol Report',
        print: 'Print',
        download: 'Download PDF',
        dateRange: 'Date Range',
        today: 'Today',
        yesterday: 'Yesterday',
        last7days: 'Last 7 Days',
        guardsSummary: 'Guards Summary',
        activeGuards: 'Active Guards',
        totalPatrols: 'Total Patrols',
        incidents: 'Incidents',
        eventLog: 'Event Log',
        generatedOn: 'Generated on',
        
        // Alert Settings
        alertSettings: 'Alert Settings',
        soundSettings: 'Sound Settings',
        masterVolume: 'Master Volume',
        enableSound: 'Enable Sound Alerts',
        alertTypes: 'Alert Types',
        guardOffline: 'Guard Offline',
        newIncident: 'New Incident',
        visitorArrival: 'Visitor Arrival',
        soundType: 'Sound',
        siren: 'Siren',
        alarm: 'Alarm',
        beep: 'Beep',
        chime: 'Chime',
        lowTone: 'Low Tone',
        save: 'Save',
        reset: 'Reset',
        
        // Map
        liveMap: 'Live Map',
        
        // General
        noGuardsOnline: 'No guards currently online',
        guardsWillAppear: 'Guards will appear here when they start their patrol',
        unknownLocation: 'Unknown Location'
    },
    hi: {
        // Header
        title: 'गार्ड कमांड सेंटर',
        systemOnline: 'सिस्टम ऑनलाइन',
        systemOffline: 'सिस्टम ऑफ़लाइन',
        refresh: 'रीफ्रेश',
        
        // Guard Card
        guards: 'गार्ड',
        online: 'ऑनलाइन',
        offline: 'ऑफ़लाइन',
        patrolling: 'गश्त',
        idle: 'निष्क्रिय',
        sos: 'एसओएस',
        battery: 'बैटरी',
        steps: 'कदम',
        shiftStart: 'शिफ्ट शुरू',
        onDuty: 'ड्यूटी पर',
        ping: 'पिंग',
        photo: 'फ़ोटो',
        chat: 'चैट',
        
        // Quick Commands
        quickCommands: 'त्वरित कमांड',
        pingAll: 'सभी गार्ड को पिंग करें',
        broadcast: 'संदेश प्रसारित करें',
        lockdown: 'आपातकालीन लॉकडाउन',
        unlock: 'लॉकडाउन समाप्त करें',
        requestPhotos: 'सभी फ़ोटो अनुरोध करें',
        settings: 'अलर्ट सेटिंग्स',
        printReport: 'रिपोर्ट प्रिंट करें',
        recentActivity: 'हाल की गतिविधि',
        send: 'भेजें',
        cancel: 'रद्द करें',
        confirmLockdown: 'लॉकडाउन की पुष्टि करें?',
        confirmUnlock: 'लॉकडाउन समाप्त करें?',
        yes: 'हाँ',
        no: 'नहीं',
        
        // Alerts
        sosAlert: 'एसओएस अलर्ट',
        manDown: 'मैन डाउन',
        panicButton: 'पैनिक बटन',
        geofenceBreach: 'जियोफेंस उल्लंघन',
        acknowledge: 'स्वीकार करें',
        location: 'स्थान',
        ago: 'पहले',
        
        // Voice Channel
        voiceChannel: 'वॉयस चैनल',
        connecting: 'कनेक्ट हो रहा है...',
        connected: 'कनेक्टेड',
        pushToTalk: 'बोलने के लिए SPACE दबाएं',
        participants: 'प्रतिभागी',
        muted: 'म्यूटेड',
        unmuted: 'बोल रहे हैं',
        
        // Reports
        patrolReport: 'गश्त रिपोर्ट',
        print: 'प्रिंट करें',
        download: 'पीडीएफ डाउनलोड करें',
        dateRange: 'तिथि सीमा',
        today: 'आज',
        yesterday: 'कल',
        last7days: 'पिछले 7 दिन',
        guardsSummary: 'गार्ड सारांश',
        activeGuards: 'सक्रिय गार्ड',
        totalPatrols: 'कुल गश्त',
        incidents: 'घटनाएं',
        eventLog: 'इवेंट लॉग',
        generatedOn: 'उत्पन्न तिथि',
        
        // Alert Settings
        alertSettings: 'अलर्ट सेटिंग्स',
        soundSettings: 'ध्वनि सेटिंग्स',
        masterVolume: 'मास्टर वॉल्यूम',
        enableSound: 'ध्वनि अलर्ट सक्षम करें',
        alertTypes: 'अलर्ट प्रकार',
        guardOffline: 'गार्ड ऑफ़लाइन',
        newIncident: 'नई घटना',
        visitorArrival: 'आगंतुक आगमन',
        soundType: 'ध्वनि',
        siren: 'सायरन',
        alarm: 'अलार्म',
        beep: 'बीप',
        chime: 'चाइम',
        lowTone: 'धीमी ध्वनि',
        save: 'सहेजें',
        reset: 'रीसेट',
        
        // Map
        liveMap: 'लाइव मैप',
        
        // General
        noGuardsOnline: 'कोई गार्ड वर्तमान में ऑनलाइन नहीं है',
        guardsWillAppear: 'गार्ड यहां दिखाई देंगे जब वे अपनी गश्त शुरू करेंगे',
        unknownLocation: 'अज्ञात स्थान'
    }
};

// Create context
const LanguageContext = createContext(null);

/**
 * Language Provider Component
 * Wraps the app and provides language switching functionality
 */
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Try to get saved language from localStorage
        const saved = localStorage.getItem('wolf_guard_language');
        return saved && translations[saved] ? saved : DEFAULT_LANGUAGE;
    });

    // Switch language
    const switchLanguage = useCallback((langCode) => {
        if (translations[langCode]) {
            setLanguage(langCode);
            localStorage.setItem('wolf_guard_language', langCode);
        }
    }, []);

    // Toggle between English and Hindi
    const toggleLanguage = useCallback(() => {
        const newLang = language === 'en' ? 'hi' : 'en';
        switchLanguage(newLang);
    }, [language, switchLanguage]);

    // Get translation
    const t = useCallback((key, fallback = key) => {
        return translations[language]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || fallback;
    }, [language]);

    // Get all translations for current language (for passing to components)
    const translations_current = translations[language];

    const value = {
        language,
        languageInfo: LANGUAGES[language],
        setLanguage: switchLanguage,
        toggleLanguage,
        t,
        translations: translations_current,
        availableLanguages: Object.values(LANGUAGES)
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

/**
 * Hook to use language context
 */
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

/**
 * HOC to inject translations into a component
 */
export const withTranslation = (Component) => {
    return function TranslatedComponent(props) {
        const { t, language, toggleLanguage } = useLanguage();
        return <Component {...props} t={t} language={language} toggleLanguage={toggleLanguage} />;
    };
};

export default LanguageContext;
