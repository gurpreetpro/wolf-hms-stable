import React, { useState } from 'react';
import { X, Bell, Volume2, VolumeX, Save, RotateCcw } from 'lucide-react';
import './AlertSettingsModal.css';

/**
 * AlertSettingsModal - Configure which events trigger audio alerts
 */
const AlertSettingsModal = ({ 
    onClose,
    onSave,
    translations = {}
}) => {
    // Default settings
    const [settings, setSettings] = useState({
        sosAlert: { enabled: true, sound: 'siren' },
        manDown: { enabled: true, sound: 'alarm' },
        panicButton: { enabled: true, sound: 'siren' },
        geofenceBreach: { enabled: true, sound: 'beep' },
        guardOffline: { enabled: false, sound: 'low-tone' },
        newIncident: { enabled: true, sound: 'beep' },
        visitorArrival: { enabled: false, sound: 'chime' }
    });

    const [masterVolume, setMasterVolume] = useState(80);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Default translations
    const t = {
        alertSettings: 'Alert Settings',
        alertSettingsHi: 'अलर्ट सेटिंग्स',
        soundSettings: 'Sound Settings',
        masterVolume: 'Master Volume',
        enableSound: 'Enable Sound Alerts',
        alertTypes: 'Alert Types',
        sosAlert: 'SOS Alert',
        manDown: 'Man Down',
        panicButton: 'Panic Button',
        geofenceBreach: 'Geofence Breach',
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
        saveHi: 'सहेजें',
        reset: 'Reset',
        resetHi: 'रीसेट',
        ...translations
    };

    const alertTypes = [
        { key: 'sosAlert', label: t.sosAlert, critical: true },
        { key: 'manDown', label: t.manDown, critical: true },
        { key: 'panicButton', label: t.panicButton, critical: true },
        { key: 'geofenceBreach', label: t.geofenceBreach, critical: false },
        { key: 'guardOffline', label: t.guardOffline, critical: false },
        { key: 'newIncident', label: t.newIncident, critical: false },
        { key: 'visitorArrival', label: t.visitorArrival, critical: false }
    ];

    const soundOptions = [
        { value: 'siren', label: t.siren },
        { value: 'alarm', label: t.alarm },
        { value: 'beep', label: t.beep },
        { value: 'chime', label: t.chime },
        { value: 'low-tone', label: t.lowTone }
    ];

    const toggleAlert = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled }
        }));
    };

    const changeSound = (key, sound) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], sound }
        }));
    };

    const handleSave = () => {
        // Save to localStorage or API
        localStorage.setItem('wolf_alert_settings', JSON.stringify({
            settings,
            masterVolume,
            soundEnabled
        }));
        onSave && onSave({ settings, masterVolume, soundEnabled });
        onClose();
    };

    const handleReset = () => {
        setSettings({
            sosAlert: { enabled: true, sound: 'siren' },
            manDown: { enabled: true, sound: 'alarm' },
            panicButton: { enabled: true, sound: 'siren' },
            geofenceBreach: { enabled: true, sound: 'beep' },
            guardOffline: { enabled: false, sound: 'low-tone' },
            newIncident: { enabled: true, sound: 'beep' },
            visitorArrival: { enabled: false, sound: 'chime' }
        });
        setMasterVolume(80);
        setSoundEnabled(true);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="alert-settings-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <Bell size={24} />
                        <div>
                            <h2>{t.alertSettings}</h2>
                            <span className="title-hi">{t.alertSettingsHi}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="settings-content">
                    {/* Master Controls */}
                    <section className="settings-section">
                        <h3>{t.soundSettings}</h3>
                        
                        {/* Enable/Disable */}
                        <div className="setting-row">
                            <div className="setting-info">
                                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                <span>{t.enableSound}</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={soundEnabled}
                                    onChange={() => setSoundEnabled(!soundEnabled)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        {/* Volume Slider */}
                        <div className="setting-row volume-row">
                            <span className="setting-label">{t.masterVolume}</span>
                            <div className="volume-control">
                                <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={masterVolume}
                                    onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                                    disabled={!soundEnabled}
                                />
                                <span className="volume-value">{masterVolume}%</span>
                            </div>
                        </div>
                    </section>

                    {/* Alert Types */}
                    <section className="settings-section">
                        <h3>{t.alertTypes}</h3>
                        
                        {alertTypes.map(alert => (
                            <div 
                                key={alert.key} 
                                className={`alert-type-row ${alert.critical ? 'critical' : ''} ${settings[alert.key].enabled ? 'enabled' : ''}`}
                            >
                                <div className="alert-info">
                                    <label className="toggle-switch small">
                                        <input 
                                            type="checkbox" 
                                            checked={settings[alert.key].enabled}
                                            onChange={() => toggleAlert(alert.key)}
                                        />
                                        <span className="toggle-slider" />
                                    </label>
                                    <span className="alert-label">{alert.label}</span>
                                    {alert.critical && <span className="critical-badge">Critical</span>}
                                </div>
                                
                                <select 
                                    value={settings[alert.key].sound}
                                    onChange={(e) => changeSound(alert.key, e.target.value)}
                                    disabled={!settings[alert.key].enabled}
                                >
                                    {soundOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </section>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="footer-btn reset-btn" onClick={handleReset}>
                        <RotateCcw size={16} />
                        <span className="btn-en">{t.reset}</span>
                        <span className="btn-hi">{t.resetHi}</span>
                    </button>
                    <button className="footer-btn save-btn" onClick={handleSave}>
                        <Save size={16} />
                        <span className="btn-en">{t.save}</span>
                        <span className="btn-hi">{t.saveHi}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertSettingsModal;
