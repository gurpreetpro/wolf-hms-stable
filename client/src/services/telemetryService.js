/**
 * Telemetry Service
 * Formats raw sensor data into UI-friendly values.
 */

const telemetryService = {
    /**
     * Format Battery Level (0.0 - 1.0) to Percentage
     */
    formatBattery: (level) => {
        if (level === undefined || level === null) return { percent: 0, text: 'N/A', color: 'text-muted' };
        const percent = Math.round(level * 100);
        let color = 'text-success';
        if (percent < 20) color = 'text-danger';
        else if (percent < 50) color = 'text-warning';
        return { percent, text: `${percent}%`, color };
    },

    /**
     * Format Signal Strength (dBm or type)
     * Assuming simple string 'WiFi' / '4G' or RSSI number
     */
    formatSignal: (signal) => {
        if (!signal) return { text: 'No Signal', color: 'text-danger', level: 0 };
        // If simply 'WiFi' or '4G'
        if (typeof signal === 'string') {
            return { text: signal, color: 'text-primary', level: 4 }; // Assume good if string present
        }
        // If RSSI (negative number)
        if (signal > -50) return { text: 'Excellent', color: 'text-success', level: 4 };
        if (signal > -70) return { text: 'Good', color: 'text-info', level: 3 };
        if (signal > -85) return { text: 'Fair', color: 'text-warning', level: 2 };
        return { text: 'Poor', color: 'text-danger', level: 1 };
    },

    /**
     * Parse Last Seen Timestamp
     */
    getTimeSince: (dateString) => {
        if (!dateString) return 'Never';
        const diff = Date.now() - new Date(dateString).getTime();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    }
};

export default telemetryService;
