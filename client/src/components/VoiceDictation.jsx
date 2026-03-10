import React, { useState, useEffect, useRef } from 'react';
import { Button, Badge, Form, Alert } from 'react-bootstrap';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

/**
 * VoiceDictation - Phase 5 Voice Input Component
 * Uses Web Speech API for voice-to-text dictation
 */
const VoiceDictation = ({ onTranscript, placeholder, fieldName }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            setError(event.error);
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            if (finalTranscript) {
                setTranscript(prev => prev + finalTranscript);
                if (onTranscript) {
                    onTranscript(finalTranscript, fieldName);
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onTranscript, fieldName]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setTranscript('');
            recognitionRef.current.start();
        }
    };

    const clearTranscript = () => {
        setTranscript('');
    };

    if (!isSupported) {
        return (
            <Alert variant="warning" className="py-1 px-2 mb-0 small">
                <Volume2 size={14} className="me-1" />
                Voice not supported in this browser
            </Alert>
        );
    }

    return (
        <div className="d-flex align-items-center gap-2">
            <Button
                variant={isListening ? 'danger' : 'outline-primary'}
                size="sm"
                onClick={toggleListening}
                className="d-flex align-items-center gap-1"
                title={isListening ? 'Stop dictation' : 'Start dictation'}
            >
                {isListening ? (
                    <>
                        <MicOff size={14} />
                        <span className="d-none d-md-inline">Stop</span>
                        <Badge bg="light" text="dark" className="ms-1 pulse-animation">
                            ● REC
                        </Badge>
                    </>
                ) : (
                    <>
                        <Mic size={14} />
                        <span className="d-none d-md-inline">Dictate</span>
                    </>
                )}
            </Button>

            {transcript && (
                <div className="flex-grow-1 d-flex align-items-center gap-1">
                    <small className="text-muted fst-italic text-truncate" style={{ maxWidth: 200 }}>
                        "{transcript.substring(0, 50)}..."
                    </small>
                    <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-danger"
                        onClick={clearTranscript}
                    >
                        <X size={12} />
                    </Button>
                </div>
            )}

            {error && (
                <small className="text-danger">
                    Error: {error}
                </small>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .pulse-animation {
                    animation: pulse 1s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default VoiceDictation;
