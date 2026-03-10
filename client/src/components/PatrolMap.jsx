import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Play, Pause, RefreshCw, Navigation } from 'lucide-react';

const PatrolMap = () => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [position, setPosition] = useState({ x: 50, y: 50 }); // Percentage coordinates
    const [stepCount, setStepCount] = useState(0);
    const [heading, setHeading] = useState(0); // 0-360 degrees
    const canvasRef = useRef(null);
    const requestRef = useRef();

    // Simulated Path (PDR Waypoints)
    // In a real app, these would come from the PDR algorithm processing sensor data
    const patrolPath = [
        { x: 50, y: 80 }, // Start (Nurse Station)
        { x: 20, y: 80 }, // Walk West
        { x: 20, y: 30 }, // Walk North
        { x: 50, y: 30 }, // Walk East
        { x: 80, y: 30 }, // Walk East
        { x: 80, y: 80 }, // Walk South
        { x: 50, y: 80 }, // Return
    ];

    const [targetIndex, setTargetIndex] = useState(1);

    const animate = () => {
        if (!isSimulating) return;

        setPosition(prev => {
            const target = patrolPath[targetIndex];
            const dx = target.x - prev.x;
            const dy = target.y - prev.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1) {
                // Reached waypoint
                setTargetIndex(prevIdx => (prevIdx + 1) % patrolPath.length);
                return prev;
            }

            // Move towards target (Step Simulation)
            const speed = 0.5; // Speed factor
            const moveX = (dx / distance) * speed;
            const moveY = (dy / distance) * speed;
            
            // Update Heading
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            setHeading(angle);
            setStepCount(c => c + 1);

            return { x: prev.x + moveX, y: prev.y + moveY };
        });

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (isSimulating) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isSimulating, targetIndex]);

    return (
        <Card className="cyber-card h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span><Navigation size={18} className="me-2 text-info" /> LIVE PATROL TRACKING (PDR)</span>
                <div>
                   <Badge bg="dark" className="me-3 border border-info text-info">{stepCount} STEPS</Badge>
                   <Button variant={isSimulating ? "outline-warning" : "outline-success"} size="sm" onClick={() => setIsSimulating(!isSimulating)}>
                       {isSimulating ? <Pause size={16} /> : <Play size={16} />}
                   </Button>
                </div>
            </Card.Header>
            <Card.Body className="p-0 position-relative" style={{ height: '500px', backgroundColor: '#050a14', overflow: 'hidden' }}>
                {/* Floorplan Background */}
                <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    backgroundImage: `url(/hospital_floor_plan_neon_1766324916340.png)`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 0.8
                }}></div>

                {/* Guard Marker */}
                <div style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.1s linear'
                }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#00f3ff',
                        borderRadius: '50%',
                        boxShadow: '0 0 15px #00f3ff',
                        border: '2px solid #fff'
                    }}></div>
                    {/* Heading Indicator */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '40px',
                        height: '2px',
                        backgroundColor: 'rgba(0, 243, 255, 0.5)',
                        transformOrigin: 'left center',
                        transform: `rotate(${heading}deg)`
                    }}></div>
                    <div className="text-info small fw-bold mt-1" style={{ whiteSpace: 'nowrap', textShadow: '0 0 5px black' }}>OFFICER JENKINS</div>
                </div>

                {/* PDR Info Overlay */}
                <div style={{ position: 'absolute', bottom: 10, left: 10, fontSize: '12px', fontFamily: 'monospace', color: '#00f3ff' }}>
                    SENSOR FUSION: ACTIVE<br/>
                    ACCEL: 0.02g (Simulated)<br/>
                    GYRO: {heading.toFixed(1)}°<br/>
                    SIGNAL: PDR (Low Confidence)
                </div>
            </Card.Body>
        </Card>
    );
};

export default PatrolMap;
