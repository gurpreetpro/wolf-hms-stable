import React, { useState, useRef } from 'react';
import { X, Printer, Download, Calendar, Users, FileText } from 'lucide-react';
import './PatrolReportModal.css';

/**
 * PatrolReportModal - Print/Export patrol reports
 */
const PatrolReportModal = ({ 
    guards = [],
    events = [],
    onClose,
    hospitalName = 'Wolf Hospital',
    translations = {}
}) => {
    const printRef = useRef(null);
    const [dateRange, setDateRange] = useState('today');

    // Default translations
    const t = {
        patrolReport: 'Patrol Report',
        patrolReportHi: 'गश्त रिपोर्ट',
        print: 'Print',
        printHi: 'प्रिंट करें',
        download: 'Download PDF',
        downloadHi: 'पीडीएफ डाउनलोड करें',
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
        ...translations
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (content) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>${t.patrolReport} - ${hospitalName}</title>
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; }
                        h1 { color: #1a1a2e; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
                        h2 { color: #3d3d5c; margin-top: 30px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        th { background: #f5f5f5; }
                        .header { display: flex; justify-content: space-between; align-items: center; }
                        .meta { color: #666; font-size: 12px; }
                        .stat-box { display: inline-block; padding: 15px 25px; background: #f0f9ff; border-radius: 8px; margin-right: 15px; text-align: center; }
                        .stat-value { font-size: 28px; font-weight: bold; color: #00d4ff; }
                        .stat-label { font-size: 12px; color: #666; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const getDateRangeLabel = () => {
        const now = new Date();
        switch(dateRange) {
            case 'today': return now.toLocaleDateString('en-IN');
            case 'yesterday': 
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday.toLocaleDateString('en-IN');
            case 'last7days':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return `${weekAgo.toLocaleDateString('en-IN')} - ${now.toLocaleDateString('en-IN')}`;
            default: return now.toLocaleDateString('en-IN');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="patrol-report-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <FileText size={24} />
                        <div>
                            <h2>{t.patrolReport}</h2>
                            <span className="title-hi">{t.patrolReportHi}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Controls */}
                <div className="modal-controls">
                    <div className="date-selector">
                        <Calendar size={16} />
                        <select 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="today">{t.today}</option>
                            <option value="yesterday">{t.yesterday}</option>
                            <option value="last7days">{t.last7days}</option>
                        </select>
                    </div>
                    
                    <div className="action-buttons">
                        <button className="action-btn print-btn" onClick={handlePrint}>
                            <Printer size={18} />
                            <span className="btn-en">{t.print}</span>
                            <span className="btn-hi">{t.printHi}</span>
                        </button>
                        <button className="action-btn download-btn">
                            <Download size={18} />
                            <span className="btn-en">{t.download}</span>
                        </button>
                    </div>
                </div>

                {/* Report Content (Printable) */}
                <div className="modal-content" ref={printRef}>
                    {/* Report Header */}
                    <div className="report-header">
                        <div className="header-left">
                            <h1>🛡️ {t.patrolReport}</h1>
                            <p className="hospital-name">{hospitalName}</p>
                        </div>
                        <div className="header-right">
                            <p className="meta">{t.generatedOn}: {new Date().toLocaleString('en-IN')}</p>
                            <p className="meta">{t.dateRange}: {getDateRangeLabel()}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="stats-row">
                        <div className="stat-box">
                            <div className="stat-value">{guards.filter(g => g.status !== 'OFFLINE').length}</div>
                            <div className="stat-label">{t.activeGuards}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{guards.length}</div>
                            <div className="stat-label">{t.totalPatrols}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{events.filter(e => e.type === 'ALERT').length}</div>
                            <div className="stat-label">{t.incidents}</div>
                        </div>
                    </div>

                    {/* Guards Table */}
                    <h2>{t.guardsSummary}</h2>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Guard Name</th>
                                <th>Status</th>
                                <th>Last Location</th>
                                <th>Battery</th>
                                <th>Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guards.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{textAlign: 'center', color: '#666'}}>
                                        No guard data available
                                    </td>
                                </tr>
                            ) : (
                                guards.map((guard, idx) => (
                                    <tr key={guard.guard_id}>
                                        <td>{idx + 1}</td>
                                        <td>{guard.username || `Guard ${guard.guard_id}`}</td>
                                        <td>{guard.status || 'Unknown'}</td>
                                        <td>
                                            {guard.latitude && guard.longitude 
                                                ? `${guard.latitude.toFixed(4)}, ${guard.longitude.toFixed(4)}`
                                                : 'Unknown'}
                                        </td>
                                        <td>{guard.batteryLevel ? `${Math.round(guard.batteryLevel * 100)}%` : '-'}</td>
                                        <td>{guard.lastUpdate ? new Date(guard.lastUpdate).toLocaleTimeString('en-IN') : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Event Log */}
                    <h2>{t.eventLog}</h2>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Event</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{textAlign: 'center', color: '#666'}}>
                                        No events recorded
                                    </td>
                                </tr>
                            ) : (
                                events.slice(0, 20).map((event, idx) => (
                                    <tr key={idx} className={`event-${event.type?.toLowerCase()}`}>
                                        <td>{new Date(event.timestamp).toLocaleTimeString('en-IN')}</td>
                                        <td>{event.type || 'INFO'}</td>
                                        <td>{event.message}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PatrolReportModal;
