import React, { useState, useEffect, useRef } from 'react';
import { Button, Offcanvas, Card, ListGroup, Badge, Alert, Accordion, Form } from 'react-bootstrap';
import {
    AlertTriangle,
    Phone,
    Heart,
    Activity,
    Wind,
    Zap,
    Thermometer,
    Brain,
    Shield,
    ChevronRight,
    Clock,
    User,
    Bell,
    Languages,
    Volume2,
    VolumeX,
    StopCircle
} from 'lucide-react';

/**
 * Emergency Protocol Guide for Nurses
 * Updated Phase 11: Bilingual (English/Hindi) Support + Text-to-Speech Audio
 */
const EmergencyProtocolGuide = ({ isOpen, onClose }) => {
    const [show, setShow] = useState(false);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [alertSent, setAlertSent] = useState(false);
    
    // Localization & Audio State
    // languages: 'en' (English), 'hi' (Hindi)
    const [language, setLanguage] = useState('en'); 
    const [isSpeaking, setIsSpeaking] = useState(false);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        // Cleanup audio on unmount
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Text-to-Speech Handler
    const speakText = (text, lang = language) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
            setIsSpeaking(false);
            return; 
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Locale Mapping
        let localeCode = 'en-US';
        if (lang === 'hi') localeCode = 'hi-IN';

        utterance.lang = localeCode;
        utterance.rate = 0.9; // Slightly slower for clarity
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    };

    const stopAudio = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
    };

    // Helper for Text Selection based on Language
    const t = (obj, key) => {
        if (!obj) return '';
        if (language === 'hi' && obj[`${key}_hi`]) return obj[`${key}_hi`];
        return obj[key]; // Default English
    };

    // Emergency Protocols Database with Bilingual Support
    const emergencyProtocols = [
        {
            id: 'cardiac_arrest',
            title: 'Cardiac Arrest / No Pulse',
            title_hi: 'कार्डियक अरेस्ट / नब्ज नहीं (Cardiac Arrest)',
            icon: <Heart className="text-danger" />,
            severity: 'CRITICAL',
            severity_hi: 'गंभीर (Critical)',
            color: 'danger',
            quickActions: [
                '🔴 Call CODE BLUE immediately',
                '🔴 Start CPR - 30 compressions : 2 breaths',
                '🔴 Attach AED/Defibrillator as soon as available',
                '🔴 Do NOT leave patient alone'
            ],
            quickActions_hi: [
                '🔴 तुरंत कोड ब्लू (CODE BLUE) कॉल करें',
                '🔴 सीपीआर (CPR) शुरू करें - 30 दबाव : 2 सांसें',
                '🔴 AED/डिफाइब्रिलेटर उपलब्ध होते ही लगाएं',
                '🔴 मरीज को अकेला न छोड़ें'
            ],
            steps: [
                { step: 1, action: 'Confirm unresponsiveness - Tap shoulders, shout "Are you okay?"', time: '0-10 sec' },
                { step: 2, action: 'Check pulse (carotid) - No pulse? Start CPR immediately', time: '10 sec' },
                { step: 3, action: 'Call for help - Shout for assistance, press emergency button', time: 'Immediately' },
                { step: 4, action: 'Begin chest compressions - Push hard, push fast (100-120/min)', time: 'Start now' },
                { step: 5, action: 'After 30 compressions, give 2 rescue breaths', time: 'Every 30 comp' },
                { step: 6, action: 'Continue CPR until AED arrives or patient responds', time: 'Continuous' },
                { step: 7, action: 'When AED arrives - Follow voice prompts, clear patient before shock', time: 'As available' }
            ],
            steps_hi: [
                { step: 1, action: 'बेहोशी की पुष्टि करें - कंधे थपथपाएं, पूछें "क्या आप ठीक हैं?"', time: '0-10 सेकंड' },
                { step: 2, action: 'नब्ज (Pulse) जांचें - नब्ज नहीं? तुरंत सीपीआर शुरू करें', time: '10 सेकंड' },
                { step: 3, action: 'मदद के लिए बुलाएं - जोर से चिल्लाएं, आपातकालीन बटन दबाएं', time: 'तत्काल' },
                { step: 4, action: 'छाती दबाना (Compressions) शुरू करें - जोर से और तेजी से दबाएं (100-120/मिनट)', time: 'अभी शुरू करें' },
                { step: 5, action: '30 बार दबाने के बाद, 2 बार कृत्रिम सांस दें', time: 'हर 30 दबाव पर' },
                { step: 6, action: 'AED आने तक या मरीज के होश में आने तक सीपीआर जारी रखें', time: 'लगातार' },
                { step: 7, action: 'जब AED आए - वॉयस निर्देशों का पालन करें', time: 'उपलब्ध होते ही' }
            ],
            doNot: [
                'Do NOT delay starting CPR to call for help',
                'Do NOT stop CPR except for AED analysis',
                'Do NOT give up - continue until help arrives'
            ],
            doNot_hi: [
                'मदद बुलाने के लिए सीपीआर (CPR) शुरू करने में देरी न करें',
                'AED विश्लेषण के अलावा सीपीआर न रोकें',
                'हार न मानें - मदद आने तक जारी रखें'
            ],
            escalation: 'Call CODE BLUE, Page on-call physician, Notify nursing supervisor',
            escalation_hi: 'कोड ब्लू को कॉल करें, डॉक्टर को पेज करें, नर्सिंग सुपरवाइजर को सूचित करें'
        },
        {
            id: 'respiratory_distress',
            title: 'Severe Respiratory Distress',
            title_hi: 'गंभीर सांस की तकलीफ',
            icon: <Wind className="text-warning" />,
            severity: 'URGENT',
            severity_hi: 'अत्यावश्यक',
            color: 'warning',
            quickActions: [
                '🟠 Position patient upright (High Fowler\'s)',
                '🟠 Apply oxygen - Start with high flow O2',
                '🟠 Check SpO2 - Target >94%',
                '🟠 Prepare suction if needed'
            ],
            quickActions_hi: [
                '🟠 मरीज को सीधा बैठाएं (High Fowler\'s स्थिति)',
                '🟠 ऑक्सीजन लगाएं - हाई फ्लो O2 से शुरू करें',
                '🟠 SpO2 की जांच करें - लक्ष्य >94%',
                '🟠 यदि आवश्यक हो तो सक्शन (Suction) तैयार करें'
            ],
            steps: [
                { step: 1, action: 'Sit patient upright (High Fowler\'s 60-90°)', time: 'Immediately' },
                { step: 2, action: 'Apply oxygen via non-rebreather mask at 15L/min', time: '30 sec' },
                { step: 3, action: 'Assess: Airway clear? Breathing sounds? SpO2?', time: '1 min' },
                { step: 4, action: 'If choking - Perform Heimlich maneuver', time: 'If needed' },
                { step: 5, action: 'Prepare nebulizer (Salbutamol) if wheezing present', time: '2 min' },
                { step: 6, action: 'Document vital signs, call doctor with SBAR report', time: '3 min' },
                { step: 7, action: 'Stay with patient, monitor continuously', time: 'Ongoing' }
            ],
            steps_hi: [
                { step: 1, action: 'मरीज को सीधा बैठाएं (60-90 डिग्री)', time: 'तत्काल' },
                { step: 2, action: 'मास्क के जरिए 15L/min पर ऑक्सीजन दें', time: '30 सेकंड' },
                { step: 3, action: 'जांचें: श्वास नली साफ है? सांस की आवाज? SpO2?', time: '1 मिनट' },
                { step: 4, action: 'अगर दम घुट रहा है - हेइमलिच (Heimlich) पैंतरा अपनाएं', time: 'यदि आवश्यक हो' },
                { step: 5, action: 'अगर घरघराहट है तो नेब्युलाइज़र (Salbutamol) तैयार करें', time: '2 मिनट' },
                { step: 6, action: 'वाइटल्स नोट करें, डॉक्टर को SBAR रिपोर्ट दें', time: '3 मिनट' },
                { step: 7, action: 'मरीज के पास रहें, लगातार निगरानी करें', time: 'जारी रखें' }
            ],
            doNot: [
                'Do NOT lay patient flat',
                'Do NOT leave patient alone',
                'Do NOT delay oxygen for any reason'
            ],
            doNot_hi: [
                'मरीज को सीधा लेटाएं नहीं (Do NOT lay flat)',
                'मरीज को अकेला न छोड़ें',
                'किसी भी कारण से ऑक्सीजन में देरी न करें'
            ],
            escalation: 'Call Rapid Response Team if SpO2 <90% despite O2, increasing work of breathing',
            escalation_hi: 'यदि O2 देने के बाद भी SpO2 <90% है, तो रैपिड रिस्पांस टीम को बुलाएं'
        },
        {
            id: 'anaphylaxis',
            title: 'Anaphylactic Shock',
            title_hi: 'नाफिलैक्टिक शॉक (गंभीर एलर्जी)',
            icon: <Zap className="text-danger" />,
            severity: 'CRITICAL',
            severity_hi: 'गंभीर',
            color: 'danger',
            quickActions: [
                '🔴 Remove allergen source immediately',
                '🔴 Call for help - prepare Epinephrine',
                '🔴 Position flat with legs elevated (if not breathing difficulty)',
                '🔴 Be ready for CPR if needed'
            ],
            quickActions_hi: [
                '🔴 एलर्जी स्रोत को तुरंत हटाएं',
                '🔴 मदद के लिए बुलाएं - एपिनेफ्रिन (Epinephrine) तैयार करें',
                '🔴 पैरों को ऊपर उठाकर सीधा लेटाएं (यदि सांस में दिक्कत न हो)',
                '🔴 जरूरत पड़ने पर सीपीआर के लिए तैयार रहें'
            ],
            steps: [
                { step: 1, action: 'Stop allergen exposure (stop IV, remove stinger)', time: 'Immediately' },
                { step: 2, action: 'Call CODE - Request Epinephrine 1:1000', time: '10 sec' },
                { step: 3, action: 'Position: Flat with legs up OR upright if breathing issues', time: '20 sec' },
                { step: 4, action: 'Administer Epinephrine 0.3-0.5mg IM mid-outer thigh (if ordered/available)', time: 'STAT' },
                { step: 5, action: 'Start IV access - large bore, run NS wide open', time: '1-2 min' },
                { step: 6, action: 'Apply oxygen, prepare for airway management', time: 'Ongoing' },
                { step: 7, action: 'Monitor BP, HR, SpO2 every 2-5 minutes', time: 'Continuous' }
            ],
            steps_hi: [
                { step: 1, action: 'एलर्जन संपर्क रोकें (IV रोकें, डंक हटाएं)', time: 'तत्काल' },
                { step: 2, action: 'कोड कॉल करें - एपिनेफ्रिन 1:1000 मांगें', time: '10 सेकंड' },
                { step: 3, action: 'स्थिति: पैरों को ऊपर करके लेटाएं या सांस की दिक्कत हो तो बैठाएं', time: '20 सेकंड' },
                { step: 4, action: 'एपिनेफ्रिन 0.3-0.5mg जांघ में दें (यदि आदेश हो)', time: 'तुरंत' },
                { step: 5, action: 'IV शुरू करें - NS लाइन चालू करें', time: '1-2 मिनट' },
                { step: 6, action: 'ऑक्सीजन लगाएं, श्वास नली प्रबंधन के लिए तैयार रहें', time: 'जारी रखें' },
                { step: 7, action: 'हर 2-5 मिनट में बीपी, पल्स, SpO2 की निगरानी करें', time: 'लगातार' }
            ],
            doNot: [
                'Do NOT sit patient upright if hypotensive',
                'Do NOT delay Epinephrine - it\'s life-saving',
                'Do NOT leave patient - secondary reaction possible'
            ],
            doNot_hi: [
                'यदि बीपी कम है तो मरीज को बैठाएं नहीं',
                'एपिनेफ्रिन में देरी न करें - यह जीवन रक्षक है',
                'मरीज को न छोड़ें - दोबारा प्रतिक्रिया हो सकती है'
            ],
            escalation: 'Immediate physician presence required, prepare crash cart',
            escalation_hi: 'डॉक्टर की तत्काल उपस्थिति आवश्यक, क्रैश कार्ट तैयार करें'
        },
        {
            id: 'hypoglycemia',
            title: 'Severe Hypoglycemia (Diabetic)',
            title_hi: 'गंभीर हाइपोग्लाइसीमिया (शुगर कम होना)',
            icon: <Activity className="text-warning" />,
            severity: 'URGENT',
            severity_hi: 'अत्यावश्यक',
            color: 'warning',
            quickActions: [
                '🟠 Check blood glucose STAT',
                '🟠 If conscious: Give oral glucose/juice',
                '🟠 If unconscious: Prepare IV Dextrose',
                '🟠 DO NOT give oral anything if unconscious'
            ],
            quickActions_hi: [
                '🟠 ब्लड शुगर की तुरंत जांच करें',
                '🟠 यदि होश में है: ग्लूकोज/जूस दें',
                '🟠 यदि बेहोश है: IV डेक्सट्रोज (Dextrose) तैयार करें',
                '🟠 बेहोश होने पर मुंह से कुछ न दें'
            ],
            steps: [
                { step: 1, action: 'Check blood glucose immediately', time: '30 sec' },
                { step: 2, action: 'If conscious & can swallow: 15-20g fast-acting carbs', time: '1 min' },
                { step: 3, action: 'If unconscious: Position recovery, call for IV D50%', time: 'STAT' },
                { step: 4, action: 'Administer IV Dextrose 50% 25-50ml (if ordered)', time: '2 min' },
                { step: 5, action: 'Recheck glucose in 15 minutes', time: '15 min' },
                { step: 6, action: 'Once recovered: Give complex carbs + protein', time: 'When stable' },
                { step: 7, action: 'Document event, investigate cause', time: 'After stable' }
            ],
            steps_hi: [
                { step: 1, action: 'ब्लड शुगर तुरंत चेक करें', time: '30 सेकंड' },
                { step: 2, action: 'होश में है: 15-20g मीठा (जूस/टॉफी) दें', time: '1 मिनट' },
                { step: 3, action: 'बेहोश है: रिकवरी पोजीशन में रखें, IV D50% मंगवाएं', time: 'तुरंत' },
                { step: 4, action: 'IV डेक्सट्रोज 50% दें (यदि आदेश हो)', time: '2 मिनट' },
                { step: 5, action: '15 मिनट में दोबारा शुगर चेक करें', time: '15 मिनट' },
                { step: 6, action: 'ठीक होने पर: भोजन दें', time: 'स्थिर होने पर' },
                { step: 7, action: 'घटना नोट करें, कारण पता करें', time: 'बाद में' }
            ],
            doNot: [
                'Do NOT give oral food/drink if unconscious - aspiration risk!',
                'Do NOT delay glucose - brain damage occurs quickly',
                'Do NOT use chocolate or fatty foods - too slow'
            ],
            doNot_hi: [
                'बेहोश होने पर मुंह से कुछ न दें - फेफड़ों में जा सकता है!',
                'ग्लूकोज में देरी न करें - मस्तिष्क को नुकसान हो सकता है',
                'चॉकलेट या वसायुक्त भोजन का प्रयोग न करें - यह धीमा होता है'
            ],
            escalation: 'If unresponsive to D50, call physician, check for other causes',
            escalation_hi: 'यदि D50 से असर न हो, तो डॉक्टर को बुलाएं'
        },
        {
            id: 'high_fever',
            title: 'High Fever / Febrile Seizure Risk',
            title_hi: 'तेज बुखार / दौरे का जोखिम',
            icon: <Thermometer className="text-danger" />,
            severity: 'MODERATE',
            severity_hi: 'मध्यम',
            color: 'orange',
            quickActions: [
                '🟡 Check temperature accurately',
                '🟡 Remove excess clothing/blankets',
                '🟡 Administer antipyretic if ordered',
                '🟡 Monitor for seizure activity'
            ],
            quickActions_hi: [
                '🟡 तापमान की सही जांच करें',
                '🟡 अतिरिक्त कपड़े/कंबल हटा दें',
                '🟡 आदेशनुसार बुखार की दवा (Antipyretic) दें',
                '🟡 दौरे (Seizure) के लक्षणों पर नजर रखें'
            ],
            steps: [
                { step: 1, action: 'Confirm temperature (>38.5°C / 101.3°F is significant)', time: '1 min' },
                { step: 2, action: 'Remove excess clothing, maintain light cover', time: '2 min' },
                { step: 3, action: 'Give Paracetamol/Ibuprofen if ordered (check allergies)', time: '5 min' },
                { step: 4, action: 'Apply tepid sponging if temp >40°C', time: 'If needed' },
                { step: 5, action: 'Encourage oral fluids if conscious', time: 'Ongoing' },
                { step: 6, action: 'Monitor every 30 min, document', time: '30 min' },
                { step: 7, action: 'SBAR report to doctor', time: 'After assessment' }
            ],
            steps_hi: [
                { step: 1, action: 'तापमान की पुष्टि करें (>101.3°F महत्वपूर्ण है)', time: '1 मिनट' },
                { step: 2, action: 'कपड़े कम करें, हल्का कवर रखें', time: '2 मिनट' },
                { step: 3, action: 'पैरासिटामोल (Paracetamol) दें (यदि आदेश हो)', time: '5 मिनट' },
                { step: 4, action: 'यदि तापमान >40°C हो तो गुनगुने पानी की पट्टी करें', time: 'यदि जरूरी हो' },
                { step: 5, action: 'यदि होश में है तो पानी पीने को कहें', time: 'जारी रखें' },
                { step: 6, action: 'हर 30 मिनट में निगरानी करें', time: '30 मिनट' },
                { step: 7, action: 'डॉक्टर को रिपोर्ट करें', time: 'जांच के बाद' }
            ],
            doNot: [
                'Do NOT use cold water/ice bath - causes shivering',
                'Do NOT give aspirin to children under 16',
                'Do NOT ignore - high fever can indicate sepsis'
            ],
            doNot_hi: [
                'बर्फ के पानी का उपयोग न करें - इससे कंपकंपी होती है',
                '16 साल से कम उम्र के बच्चों को एस्पिरिन न दें',
                'अनदेखा न करें - तेज बुखार सेप्सिस हो सकता है'
            ],
            escalation: 'If temp >40°C, seizure occurs, or signs of sepsis (rash, confusion)',
            escalation_hi: 'यदि तापमान >40°C हो, दौरा पड़े, या सेप्सिस के लक्षण दिखें'
        },
        {
            id: 'stroke',
            title: 'Suspected Stroke (FAST)',
            title_hi: 'सस्पेक्टेड स्ट्रोक (FAST)',
            icon: <Brain className="text-danger" />,
            severity: 'CRITICAL',
            severity_hi: 'गंभीर',
            color: 'danger',
            quickActions: [
                '🔴 Note TIME of symptom onset - crucial!',
                '🔴 Call Stroke Alert / CODE',
                '🔴 Keep patient NPO (nothing by mouth)',
                '🔴 Check glucose - rule out hypoglycemia'
            ],
            quickActions_hi: [
                '🔴 लक्षण शुरू होने का समय नोट करें - अत्यंत महत्वपूर्ण!',
                '🔴 स्ट्रोक अलर्ट / कोड कॉल करें',
                '🔴 मरीज को मुंह से कुछ न दें (NPO)',
                '🔴 ग्लूकोज चेक करें - शुगर कम तो नहीं?'
            ],
            steps: [
                { step: 1, action: 'FAST check: Face droop? Arm weakness? Speech slurred? Time?', time: '30 sec' },
                { step: 2, action: 'Call STROKE ALERT - Note exact time symptoms started', time: 'Immediately' },
                { step: 3, action: 'Keep patient NPO - Risk of aspiration', time: 'Now' },
                { step: 4, action: 'Check blood glucose - Hypoglycemia can mimic stroke', time: '1 min' },
                { step: 5, action: 'Position head of bed 30° unless hypotensive', time: '2 min' },
                { step: 6, action: 'Establish IV access (no dextrose solutions)', time: '3 min' },
                { step: 7, action: 'Document baseline neuro status for comparison', time: '5 min' }
            ],
            steps_hi: [
                { step: 1, action: 'FAST चेक: चेहरा टेढ़ा? हाथ कमजोर? बोली लड़खड़ाना?', time: '30 सेकंड' },
                { step: 2, action: 'स्ट्रोक अलर्ट कॉल करें - सही समय नोट करें', time: 'तत्काल' },
                { step: 3, action: 'मरीज को कुछ न खिलाएं (NPO)', time: 'अभी' },
                { step: 4, action: 'ब्लड शुगर चेक करें', time: '1 मिनट' },
                { step: 5, action: 'बिस्तर का सिरहाना 30° ऊपर करें', time: '2 मिनट' },
                { step: 6, action: 'IV लाइन शुरू करें (डेक्सट्रोज नहीं)', time: '3 मिनट' },
                { step: 7, action: 'मरीज की स्थिति नोट करें', time: '5 मिनट' }
            ],
            doNot: [
                'Do NOT give anything by mouth - aspiration risk',
                'Do NOT lower BP unless extremely high (>220 systolic)',
                'Do NOT delay - "Time is Brain"'
            ],
            doNot_hi: [
                'मुंह से कुछ भी न दें',
                'बीपी कम करने की कोशिश न करें (जब तक बहुत ज्यादा न हो)',
                'देरी न करें - "समय ही मस्तिष्क है"'
            ],
            escalation: 'STROKE ALERT - CT scan within 25 min of arrival, potential tPA candidate',
            escalation_hi: 'स्ट्रोक कोड - 25 मिनट के भीतर सीटी स्कैन'
        },
        {
            id: 'fire',
            title: 'Code Red - Fire / Smoke',
            title_hi: 'कोड रेड - आग / धुआं',
            icon: <AlertTriangle className="text-danger" />,
            severity: 'CRITICAL',
            severity_hi: 'गंभीर',
            color: 'danger',
            quickActions: [
                '🔴 R - RESCUE patients in immediate danger',
                '🔴 A - ALARM (Activate pull station)',
                '🔴 C - CONTAIN (Close doors/windows)',
                '🔴 E - EXTINGUISH (if safe) or EVACUATE'
            ],
            quickActions_hi: [
                '🔴 R - रेस्क्यू (बचाव): खतरे में फंसे मरीजों को निकालें',
                '🔴 A - अलार्म: फायर अलार्म दबाएं',
                '🔴 C - कंटेन (रोकें): दरवाजे/खिड़कियां बंद करें',
                '🔴 E - एक्सटिंग्विश (बुझाएं): यदि सुरक्षित हो, या खाली करें'
            ],
            steps: [
                { step: 1, action: 'Rescue anyone in immediate danger of fire', time: 'Immediately' },
                { step: 2, action: 'Activate the nearest fire alarm pull station', time: 'Now' },
                { step: 3, action: 'Close all doors and windows to contain smoke', time: 'ASAP' },
                { step: 4, action: 'Extinguish small fires if trained (PASS method)', time: 'If safe' },
                { step: 5, action: 'Evacuate horizontally to next fire compartment', time: 'When ordered' },
                { step: 6, action: 'Do not use elevators', time: 'Always' },
                { step: 7, action: 'Check patient count at assembly area', time: 'After evacuation' }
            ],
            steps_hi: [
                { step: 1, action: 'आग के खतरे में फंसे लोगों को बचाएं', time: 'तत्काल' },
                { step: 2, action: 'नजदीकी फायर अलार्म बजाएं', time: 'अभी' },
                { step: 3, action: 'धुआं रोकने के लिए दरवाजे-खिड़कियां बंद करें', time: 'जल्दी' },
                { step: 4, action: 'यदि प्रशिक्षित हैं तो छोटी आग बुझाएं', time: 'यदि सुरक्षित हो' },
                { step: 5, action: 'आदेश मिलने पर बाहर निकलें', time: 'आदेश पर' },
                { step: 6, action: 'लिफ्ट का प्रयोग न करें', time: 'हमेशा' },
                { step: 7, action: 'मरीजों की गिनती करें', time: 'निकलने के बाद' }
            ],
            doNot: [
                'Do NOT open hot doors',
                'Do NOT use elevators',
                'Do NOT re-enter the building until cleared'
            ],
            doNot_hi: [
                'गर्म दरवाजे न खोलें',
                'लिफ्ट का इस्तेमाल न करें',
                'इमारत में वापस न जाएं जब तक सुरक्षित न कहा जाए'
            ],
            escalation: 'Call Fire Department (911/101) immediately if not automatic',
            escalation_hi: 'फायर ब्रिगेड (101) को तुरंत कॉल करें'
        }
    ];

    const handleEmergencyAlert = () => {
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 3000);
    };

    const getSBAR = (emergency) => {
        return `
S - Situation: Patient experiencing ${t(emergency, 'title')}
B - Background: [History, Allergies]  
A - Assessment: [Vitals, Signs]
R - Recommendation: Need immediate assessment
        `.trim();
    };

    const toggleLanguage = () => {
        stopAudio(); 
        // Cycle: EN -> HI -> EN
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
    };

    // If props are provided, use them; otherwise use local state
    const isControlled = typeof isOpen !== 'undefined';
    const displayShow = isControlled ? isOpen : show;
    const handleClose = isControlled ? onClose : () => setShow(false);
    const handleOpen = isControlled ? () => { } : () => setShow(true);

    return (
        <>
            {/* Floating Trigger Button - Only show if not controlled externally */}
            {!isControlled && (
                <Button
                    variant="danger"
                    className="position-fixed shadow-lg d-flex align-items-center gap-2"
                    style={{
                        bottom: '24px',
                        left: '24px',
                        zIndex: 1050,
                        borderRadius: '50px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #dc3545 0%, #9a0b0b 100%)',
                        border: 'none',
                    }}
                    onClick={handleOpen}
                >
                    <Shield size={20} />
                    <span className="d-none d-md-inline">
                        {language === 'en' ? 'Emergency Protocols' : 'आपातकालीन प्रोटोकॉल'}
                    </span>
                </Button>
            )}

            {/* Offcanvas Panel */}
            <Offcanvas show={displayShow} onHide={() => { handleClose(); stopAudio(); }} placement="start" style={{ width: '480px' }}>
                <Offcanvas.Header className="bg-danger text-white border-bottom border-danger-subtle shadow-sm">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        {/* Title Section */}
                        <div className="d-flex align-items-center gap-3">
                            <Shield size={24} className="flex-shrink-0" />
                            <div className="fw-bold fs-5 lh-1">
                               {language === 'en' ? 'Emergency Guide' : 'आपातकालीन गाइड'}
                            </div>
                        </div>

                        {/* Controls Section */}
                        <div className="d-flex align-items-center gap-2">
                            <Button 
                                variant="white" 
                                size="sm" 
                                className="text-danger bg-white fw-bold d-flex align-items-center gap-1 shadow-sm"
                                onClick={toggleLanguage}
                                style={{ 
                                    minWidth: '70px',
                                    height: '32px',
                                    justifyContent: 'center',
                                    borderRadius: '20px'
                                }}
                            >
                                <Languages size={14} /> 
                                {language === 'en' ? 'HI' : 'EN'}
                            </Button>
                            <Button 
                                variant="outline-light" 
                                size="sm" 
                                onClick={() => { handleClose(); stopAudio(); }}
                                className="border-0 p-1 d-flex align-items-center justify-content-center"
                                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                            >
                                <span style={{ fontSize: '20px', lineHeight: '1' }}>×</span>
                            </Button>
                        </div>
                    </div>
                </Offcanvas.Header>

                <Offcanvas.Body className="p-0">
                    {/* Status Alert */}
                    {alertSent && (
                        <Alert variant="success" className="m-3 d-flex align-items-center gap-2">
                            <Bell /> 
                            {language === 'en' ? 'Alert Sent!' : 'अलर्ट भेजा गया!'}
                        </Alert>
                    )}

                    {!selectedEmergency ? (
                        <>
                            {/* Dashboard View */}
                            <div className="p-3 bg-light border-bottom">
                                <div className="fw-bold mb-2 text-danger">
                                    <Phone size={16} className="me-2" />
                                    {language === 'en' ? 'Quick Access' : 'त्वरित एक्सेस'}
                                </div>
                                <div className="d-flex gap-2 flex-wrap">
                                    <Button variant="danger" size="sm" onClick={handleEmergencyAlert}>Code Blue</Button>
                                    <Button variant="warning" size="sm" onClick={handleEmergencyAlert}>Rapid Response</Button>
                                </div>
                            </div>

                            <ListGroup variant="flush">
                                {emergencyProtocols.map(emergency => (
                                    <ListGroup.Item
                                        key={emergency.id}
                                        action
                                        onClick={() => setSelectedEmergency(emergency)}
                                        className="d-flex align-items-center justify-content-between py-3"
                                    >
                                        <div className="d-flex align-items-center gap-3">
                                            <div className={`p-2 rounded bg-${emergency.color}-subtle`}>
                                                {emergency.icon}
                                            </div>
                                            <div>
                                                <div className="fw-bold">{t(emergency, 'title')}</div>
                                                <Badge bg={emergency.color} className="mt-1">
                                                    {t(emergency, 'severity')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-muted" />
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </>
                    ) : (
                        <>
                            {/* Detail View */}
                            <Button
                                variant="link"
                                className="m-2 text-decoration-none"
                                onClick={() => { setSelectedEmergency(null); stopAudio(); }}
                            >
                                ← {language === 'en' ? 'Back' : 'वापस'}
                            </Button>

                            <div className="px-3 pb-3">
                                <Card className={`border-${selectedEmergency.color} mb-3`}>
                                    <Card.Header className={`bg-${selectedEmergency.color} text-white`}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-2" style={{ maxWidth: '80%' }}>
                                                {selectedEmergency.icon}
                                                <span className="fw-bold lh-sm">{t(selectedEmergency, 'title')}</span>
                                            </div>
                                            <Button 
                                                variant="light" 
                                                size="sm" 
                                                className="rounded-circle p-2"
                                                onClick={() => speakText(
                                                    `${t(selectedEmergency, 'title')}. ${language === 'en' ? 'Actions' : ''}. ${t(selectedEmergency, 'quickActions').join('. ')}`,
                                                    language
                                                )}
                                                title="Read Aloud"
                                            >
                                                {isSpeaking ? <VolumeX size={18} className="text-danger" /> : <Volume2 size={18} className="text-dark" />}
                                            </Button>
                                        </div>
                                    </Card.Header>

                                    <Card.Body className="p-0">
                                        {/* Quick Actions */}
                                        <div className="p-3 bg-light border-bottom">
                                            <div className="fw-bold text-danger mb-2">
                                                ⚡ {language === 'en' ? 'ACTIONS' : 'कार्यवाही'}
                                            </div>
                                            {t(selectedEmergency, 'quickActions').map((action, idx) => (
                                                <div key={idx} className="mb-1 fw-medium">{action}</div>
                                            ))}
                                        </div>

                                        {/* Steps */}
                                        <Accordion flush alwaysOpen>
                                            <Accordion.Item eventKey="0">
                                                <Accordion.Header>
                                                    📋 {language === 'en' ? 'Steps' : 'प्रक्रिया'}
                                                </Accordion.Header>
                                                <Accordion.Body className="p-0">
                                                    <ListGroup variant="flush" numbered>
                                                        {t(selectedEmergency, 'steps').map((step, idx) => (
                                                            <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-start">
                                                                <div className="ms-2">
                                                                    <div className="fw-bold mb-1">{step.action}</div>
                                                                    <Badge bg="secondary" className="fw-normal">
                                                                        <Clock size={10} className="me-1" />
                                                                        {step.time}
                                                                    </Badge>
                                                                </div>
                                                            </ListGroup.Item>
                                                        ))}
                                                    </ListGroup>
                                                </Accordion.Body>
                                            </Accordion.Item>

                                            <Accordion.Item eventKey="1">
                                                <Accordion.Header>
                                                    🚫 {language === 'en' ? 'Don\'ts' : 'सावधानियां'}
                                                </Accordion.Header>
                                                <Accordion.Body>
                                                    {t(selectedEmergency, 'doNot').map((item, idx) => (
                                                        <div key={idx} className="text-danger mb-2 d-flex gap-2">
                                                            <AlertTriangle size={16} className="flex-shrink-0" />
                                                            {item}
                                                        </div>
                                                    ))}
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        </Accordion>
                                    </Card.Body>

                                    <Card.Footer className="bg-warning-subtle">
                                        <div className="fw-bold mb-1">📢 Escalation:</div>
                                        <small>{t(selectedEmergency, 'escalation')}</small>
                                    </Card.Footer>
                                </Card>

                                <Button variant="danger" className="w-100 py-3 fw-bold shadow-sm" onClick={handleEmergencyAlert}>
                                    <Bell className="me-2" />
                                    {language === 'en' ? 'SEND ALERT' : 'अलर्ट भेजें'}
                                </Button>
                            </div>
                        </>
                    )}
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
};

export default EmergencyProtocolGuide;
