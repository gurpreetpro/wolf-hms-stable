import React, { useState, useEffect } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import { Play, Pause, ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react';

const GuardLocationTimeline = ({ guardId, onTimeSelect }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [sliderValue, setSliderValue] = useState(100); // 0 to 100%
    const [history, setHistory] = useState([]);

    // Mock history fetch for UI dev - Real API call will go here
    useEffect(() => {
        // Fetch history for timeline
    }, [guardId]);

    const handleSliderChange = (e) => {
        setSliderValue(e.target.value);
        // Calculate timestamp based on slider position and pass to parent
        // onTimeSelect(calculatedTimestamp);
    };

    return (
        <Card className="bg-dark border-secondary text-white mt-3">
            <Card.Body className="p-2">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted font-monospace">LOCATION TIMELINE</small>
                    <span className="badge bg-secondary">
                        -{Math.round((100 - sliderValue) / 10)} MIN
                    </span>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                    <Button 
                        variant="outline-info" 
                        size="sm" 
                        className="p-1 rounded-circle"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </Button>
                    
                    <Form.Range 
                        value={sliderValue}
                        onChange={handleSliderChange}
                        className="custom-range flex-grow-1"
                    />
                </div>
            </Card.Body>
        </Card>
    );
};

export default GuardLocationTimeline;
