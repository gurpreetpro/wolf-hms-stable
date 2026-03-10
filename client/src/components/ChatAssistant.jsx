import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { MessageCircle, Send, X, Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const ChatAssistant = ({ show, onHide, hideTrigger = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! I am your Hospital AI Assistant. You can speak to me by saying "Hey Wolf".' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Voice State
    const [error, setError] = useState(null);
    const [voiceMode, setVoiceMode] = useState(false); // Toggle for Wake Word mode
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    const messagesEndRef = useRef(null);
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Text to Speech
    const speak = (text) => {
        if (synthRef.current) {
            // Cancel current speech
            synthRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            synthRef.current.speak(utterance);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('showAI') === 'true') {
            setIsOpen(true);
        }
    }, [location.search]);

    // Sync external show prop
    useEffect(() => {
        if (show !== undefined && show !== isOpen) {
            setIsOpen(show);
        }
    }, [show, isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        if (onHide) onHide();
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('')
                    .toLowerCase();

                // Check for Wake Words
                if (!isOpen && (transcript.includes('hey wolf') || transcript.includes('hey assistant'))) {
                    setIsOpen(true);
                    speak("I am listening.");
                    // Reset transcript implicitly by restarting or managing state if we could clear it
                    // For simple demo, we just open the chat
                }

                // If chat is open and we are in voice mode, update input
                if (isOpen && voiceMode) {
                    // Logic to capture the command AFTER the wake word or just general dictation
                    // For this v1, we will just set the latest final result to input
                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult.isFinal) {
                        setInput(lastResult[0].transcript);
                        // Optional: Auto-send if finalized? 
                        // handleSend({ preventDefault: () => {} }, lastResult[0].transcript);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setVoiceMode(false);
                }
            };

            // Restart loop if it stops unexpectedly while voice mode is ON
            recognitionRef.current.onend = () => {
                if (voiceMode) {
                    try {
                        recognitionRef.current.start();
                    } catch {
                        // ignore
                    }
                }
            };
        }
    }, [isOpen, voiceMode]);

    const toggleVoiceMode = () => {
        if (voiceMode) {
            setVoiceMode(false);
            setIsListening(false);
            recognitionRef.current?.stop();
        } else {
            setVoiceMode(true);
            setIsListening(true);
            try {
                recognitionRef.current?.start();
            } catch {
                // already tracking
            }
        }
    };

    const handleSend = async (e, overrideInput = null) => {
        if (e) e.preventDefault();
        const textToSend = overrideInput || input;

        if (!textToSend.trim()) return;

        const userMsg = { sender: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // NEW: Real Intelligence Logic
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            let answer = "";
            const lowerInput = textToSend.toLowerCase();

            // 1. Staff / Doctors Query
            if (lowerInput.includes("doctor") || lowerInput.includes("staff") || lowerInput.includes("nurse")) {
                const res = await axios.get('/api/auth/users', { headers });
                const list = res.data.data || res.data;
                const users = Array.isArray(list) ? list : [];
                const total = users.length;
                const doctors = users.filter(u => u.role === 'doctor').length;
                const nurses = users.filter(u => u.role === 'nurse').length;

                if (lowerInput.includes("doctor")) answer = `We currently have ${doctors} doctors active in the system.`;
                else if (lowerInput.includes("nurse")) answer = `There are ${nurses} nurses on duty.`;
                else answer = `Total staff count is ${total} (${doctors} Doctors, ${nurses} Nurses).`;
            }
            // 2. IPD / Admitted Patients Query
            else if (lowerInput.includes("ipd") || lowerInput.includes("admitted") || lowerInput.includes("admission")) {
                const res = await axios.get('/api/admissions/active', { headers });
                const list = res.data.data || res.data;
                const admissions = Array.isArray(list) ? list : [];
                if (admissions.length === 0) {
                    answer = `There are no patients currently admitted in IPD.`;
                } else {
                    const names = admissions.slice(0, 5).map(a => a.patient_name || a.name || 'Unknown').join(', ');
                    answer = `There are ${admissions.length} patients in IPD. Recent: ${names}${admissions.length > 5 ? '...' : ''}.`;
                }
            }
            // 3. Specific Patient Search (e.g., "tell me about patient harpreet kaur")
            else if (lowerInput.includes("patient") && (lowerInput.includes("about") || lowerInput.includes("find") || lowerInput.includes("search"))) {
                // Extract patient name - get text after "patient"
                const patientMatch = lowerInput.match(/patient\s+(.+?)(?:\?|$)/);
                const searchName = patientMatch ? patientMatch[1].trim() : '';
                
                if (searchName && searchName.length > 2) {
                    try {
                        const res = await axios.get(`/api/patients/search?q=${encodeURIComponent(searchName)}`, { headers });
                        const patients = res.data.data || res.data || [];
                        if (patients.length > 0) {
                            const p = patients[0];
                            answer = `Found ${patients.length} patient(s) matching "${searchName}". ${p.name}: ${p.age || 'Unknown age'}, ${p.gender || 'Unknown gender'}. Phone: ${p.phone || 'N/A'}.`;
                        } else {
                            answer = `No patients found matching "${searchName}".`;
                        }
                    } catch (e) {
                        answer = `Could not search for patient. Error: ${e.message}`;
                    }
                } else {
                    // General patient count query
                    const res = await axios.get('/api/opd/queue', { headers });
                    const list = res.data.data || res.data;
                    const active = (Array.isArray(list) ? list : []).filter(p => p.status !== 'completed').length;
                    answer = `There are currently ${active} patients active in the OPD queue.`;
                }
            }
            // 4. OPD Queue Query
            else if (lowerInput.includes("opd") || lowerInput.includes("queue")) {
                const res = await axios.get('/api/opd/queue', { headers });
                const list = res.data.data || res.data;
                const active = (Array.isArray(list) ? list : []).filter(p => p.status !== 'completed').length;
                answer = `There are currently ${active} patients active in the OPD queue.`;
            }
            // 5. Beds / Wards Query
            else if (lowerInput.includes("bed") || lowerInput.includes("ward") || lowerInput.includes("occupancy")) {
                const res = await axios.get('/api/admissions/active', { headers });
                const list = res.data.data || res.data;
                const count = Array.isArray(list) ? list.length : 0;
                answer = `Bed occupancy is currently at ${count}/50 beds (${Math.round((count / 50) * 100)}%).`;
            }
            // 6. Revenue / Finance Query
            else if (lowerInput.includes("revenue") || lowerInput.includes("collection") || lowerInput.includes("money")) {
                const res = await axios.get('/api/finance/invoices', { headers });
                const list = res.data.data || res.data;
                const today = new Date().toDateString();
                const total = (Array.isArray(list) ? list : [])
                    .filter(i => new Date(i.generated_at).toDateString() === today)
                    .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0);
                answer = `Today's total revenue collection is ₹${total.toLocaleString()}.`;
            }
            // 7. Greeting / General
            else if (lowerInput.includes("hello") || lowerInput.includes("hi") || lowerInput.includes("hey")) {
                answer = "Hello! I am connected to the hospital database. Ask me about doctors, patients, IPD, beds, or revenue.";
            }
            // Fallback
            else {
                answer = "I didn't quite catch that. Try asking about 'doctors', 'patients', 'IPD admissions', or 'revenue'.";
            }

            const botMsg = { sender: 'bot', text: answer };
            setMessages(prev => [...prev, botMsg]);
            setLoading(false);

            if (voiceMode) {
                speak(answer);
            }

        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    // Stop speaking/listening when closed?
    // Keep listening for wake word if Voice Mode is ON, even if closed.

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && !hideTrigger && (
                <Button
                    variant={voiceMode ? "danger" : "primary"}
                    className={`position-fixed rounded-circle shadow-lg d-flex align-items-center justify-content-center ${voiceMode ? 'pulse-animation' : ''}`}
                    style={{
                        bottom: '30px',
                        right: '30px',
                        width: '60px',
                        height: '60px',
                        zIndex: 1050
                    }}
                    onClick={() => setIsOpen(true)}
                >
                    {voiceMode ? <Mic size={30} /> : <MessageCircle size={30} />}
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className="position-fixed shadow-lg border-0"
                    style={{
                        bottom: '30px',
                        right: '30px',
                        width: '350px',
                        height: '550px',
                        zIndex: 1050,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Card.Header className={`text-white d-flex justify-content-between align-items-center fw-bold ${voiceMode ? 'bg-danger' : 'bg-primary'}`}>
                        <div className="d-flex align-items-center gap-2">
                            <Bot size={20} />
                            {voiceMode ? 'Listening (' + (isSpeaking ? 'Speaking...' : 'Ready') + ')' : 'Hospital AI'}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Button
                                variant="link"
                                className="text-white p-0"
                                onClick={toggleVoiceMode}
                                title={voiceMode ? "Turn Voice Mode OFF" : "Turn Voice Mode ON"}
                            >
                                {voiceMode ? <MicOff size={18} /> : <Mic size={18} />}
                            </Button>
                            <Button variant="link" className="text-white p-0" onClick={handleClose}>
                                <X size={20} />
                            </Button>
                        </div>
                    </Card.Header>

                    <Card.Body className="flex-grow-1 overflow-auto bg-light p-3">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div
                                    className={`p-3 rounded shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                    style={{ maxWidth: '80%', fontSize: '0.9rem' }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="d-flex justify-content-start mb-3">
                                <div className="bg-white p-3 rounded shadow-sm text-muted fst-italic small">
                                    <Spinner animation="grow" size="sm" className="me-2" /> Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </Card.Body>

                    <Card.Footer className="bg-white border-top">
                        <Form onSubmit={(e) => handleSend(e)}>
                            <InputGroup>
                                <Form.Control
                                    placeholder={voiceMode ? "Listening..." : "Ask a question..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={loading}
                                />
                                <Button variant="primary" type="submit" disabled={loading}>
                                    <Send size={18} />
                                </Button>
                            </InputGroup>
                        </Form>
                        {voiceMode && (
                            <div className="text-center mt-2 text-muted small fst-italic">
                                Say "Hey Wolf" to wake me up.
                            </div>
                        )}
                    </Card.Footer>
                </Card>
            )}
            <style>{`
                .pulse-animation {
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
                }
            `}</style>
        </>
    );
};

export default ChatAssistant;
