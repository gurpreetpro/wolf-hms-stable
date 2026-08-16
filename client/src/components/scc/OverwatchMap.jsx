import React from 'react';

const OverwatchMap = ({ activePatrols = [], activeIncidents = [] }) => {

    return (
        <div
            style={{
                width: '100%',
                height: '400px',
                background: 'linear-gradient(45deg, #1a1a2e 30%, #001e3c 90%)',
                borderRadius: 8,
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Grid Lines */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.3
            }} />

            <h6 style={{ color: 'rgba(0,255,255,0.7)', userSelect: 'none', position: 'absolute', top: 20, left: 20, margin: 0 }}>
                SECTOR A: NORTH WING [LIVE]
            </h6>

            {/* Render Patrols */}
            {activePatrols.map((patrol, index) => (
                <div
                    key={'patrol-' + index}
                    style={{
                        position: 'absolute',
                        top: `${20 + (index * 15)}%`,
                        left: `${30 + (index * 20)}%`,
                        width: 12,
                        height: 12,
                        backgroundColor: '#00ff00',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #00ff00',
                        animation: 'scc-pulse 1.5s infinite'
                    }}
                    title={`Guard: ${patrol.guard_name}`}
                />
            ))}

            {/* Render Incidents */}
            {activeIncidents.map((incident, index) => (
                <div
                    key={'incident-' + index}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '60%',
                        width: 20,
                        height: 20,
                        backgroundColor: 'red',
                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                        animation: 'scc-flash 1s infinite'
                    }}
                    title={`Incident: ${incident.title}`}
                />
            ))}

            <style>
                {`
                @keyframes scc-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes scc-flash {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                `}
            </style>
        </div>
    );
};

export default OverwatchMap;
