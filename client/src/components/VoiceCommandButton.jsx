import React, { useState, useEffect } from 'react';
import { Button, Modal, Spinner, Badge } from 'react-bootstrap';
import { Mic, MicOff, Activity } from 'lucide-react';

const VoiceCommandButton = (props) => {
    const { onCommand } = props;
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [supported, setSupported] = useState(true);

    const recognitionRef = React.useRef(null);

    // Allow parent to trigger startListening via ref or exposed handler? 
    // Easier to just check if showModal is controlled? No, this is different.
    // The parent (Dock) contains the button, clicking it calls `startListening`.
    // So we need to expose `startListening` to the parent so it can call it.
    // OR we change the pattern: Parent renders the button, and passes `onTrigger` to this component?
    // Let's pass a `renderTrigger` prop. If provided, we use that.
    
    // Actually, simpler: If `customTrigger` is passed, we Render that status modal ONLY, 
    // and assume the parent handles the click -> `startListening` flow?
    // No, `startListening` is internal. 
    // Let's forwardRef?
    
    // Alternative: `VoiceCommandButton` Renders NOTHING if `hideButton` is true, 
    // but we use `useImperativeHandle` to expose `startListening`.
    
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setSupported(false);
        }
    }, []);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setListening(true);
            setTranscript('');
            setShowModal(true);
        };

        recognition.onresult = (event) => {
            const speechToText = event.results[0][0].transcript;
            setTranscript(speechToText);
            setProcessing(true);

            // Simple Parsing Logic
            // In a real app, this would go to an AI NLU service
            setTimeout(() => {
                handleCommand(speechToText);
                setProcessing(false);
                setListening(false);
                setTimeout(() => setShowModal(false), 2000); // Close after delay
            }, 1000);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setListening(false);
            setTranscript('Error: ' + event.error);
        };

        recognition.onend = () => {
            setListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // Expose startListening through custom event or prop?
    // Let's listen for an event or just attach it to window for this specific singleton? 
    // No, that's messy.
    // Let's stick to: Component renders the button unless `hideButton` is true.
    // But we need the parent to be able to CLICK to start.
    // Best way: `VoiceCommandButton` is just the *Logic* and *Modal*. 
    // The *Trigger* is passed as `children`?
    
    // Let's do: <VoiceCommandButton onCommand={...}><MyCustomButton /></VoiceCommandButton>
    // And `children` gets the `onClick` injected? CloneElement.
    
    const trigger = React.Children.map(props.children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { onClick: startListening });
        }
        return child;
    });

    const handleCommand = (text) => {
        console.log('Voice Command:', text);
        const lowerText = text.toLowerCase();

        // 1. Navigation / Open Modal
        if (lowerText.includes('open') || lowerText.includes('show')) {
            // "Show me Bed 1" or "Open Bed 1"
            const match = lowerText.match(/bed\s+(\d+)/);
            if (match) {
                const bedNum = match[1];
                onCommand({ type: 'OPEN_BED', bedNumber: bedNum });
                return;
            }
        }

        // 2. Log Vitals (Mock) "Log BP 120/80 for Bed 1"
        if (lowerText.includes('log') && lowerText.includes('bp')) {
            const bedMatch = lowerText.match(/bed\s+(\d+)/);
            const bpMatch = lowerText.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/);

            if (bedMatch && bpMatch) {
                const bedNum = bedMatch[1];
                onCommand({
                    type: 'LOG_VITALS',
                    bedNumber: bedNum,
                    vitals: {
                        sys: bpMatch[1],
                        dia: bpMatch[2]
                    }
                });
                return;
            }
        }

        onCommand({ type: 'UNKNOWN', text });
    };

    if (!supported) return null;

    return (
        <>
            {props.children ? trigger : (
                <Button
                    variant="primary"
                    className="rounded-circle shadow-lg position-fixed d-flex align-items-center justify-content-center"
                    style={{
                        bottom: '20px',
                        right: '20px',
                        width: '60px',
                        height: '60px',
                        zIndex: 1050
                    }}
                    onClick={startListening}
                >
                    <Mic size={24} />
                </Button>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="sm">
                <Modal.Body className="text-center p-4">
                    {listening ? (
                        <div className="mb-3">
                            <div className="spinner-grow text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Listening...</span>
                            </div>
                            <h5>Listening...</h5>
                        </div>
                    ) : processing ? (
                        <div className="mb-3">
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <h5>Processing...</h5>
                        </div>
                    ) : (
                        <div className="mb-3">
                            <Activity size={40} className="text-success mb-3" />
                            <h5>Command Recognized</h5>
                        </div>
                    )}

                    <p className="lead fw-bold text-primary">"{transcript}"</p>

                    {!listening && !processing && (
                        <Badge bg="success">Executed</Badge>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default VoiceCommandButton;
