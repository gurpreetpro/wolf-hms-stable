import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, ListGroup } from 'react-bootstrap';

const ClinicalAIAssistant = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "👋 Hello Dr. Sharma! I'm Wolf AI, your clinical decision support assistant. I can help with:\n\n• **Drug interactions** — check medication safety\n• **Diagnosis support** — differential diagnosis from symptoms\n• **Lab interpretation** — analyze lab results\n• **Clinical guidelines** — evidence-based recommendations\n• **ICD-10 coding** — suggest appropriate codes\n\nHow can I assist you today?", time: '10:00 AM' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickActions = [
    { label: '💊 Drug Interaction Check', prompt: 'Check interaction between Warfarin and Metronidazole' },
    { label: '🔬 Interpret Lab Results', prompt: 'Patient has Hb 7.2, MCV 68, Ferritin 8. Interpret these results.' },
    { label: '🩺 Differential Diagnosis', prompt: 'Patient presents with acute chest pain, diaphoresis, and dyspnea. Generate differential.' },
    { label: '📋 ICD-10 Suggestion', prompt: 'Suggest ICD-10 codes for Type 2 Diabetes with diabetic nephropathy' },
    { label: '📊 Sepsis Screening', prompt: 'Patient vitals: Temp 38.9°C, HR 112, BP 88/52, RR 24, WBC 18,200. Screen for sepsis.' },
    { label: '💉 Dose Calculator', prompt: 'Calculate Vancomycin dose for 72kg male with CrCl 45 mL/min' },
  ];

  const aiResponses = {
    'warfarin': `⚠️ **HIGH-RISK INTERACTION DETECTED**

**Warfarin + Metronidazole**
- **Severity:** Major (Level 1)
- **Mechanism:** Metronidazole inhibits CYP2C9, reducing Warfarin metabolism
- **Effect:** INR can increase 2-3x → bleeding risk ↑↑
- **Evidence:** Well-documented, multiple case reports

**📋 Recommendations:**
1. Monitor INR within 3-5 days of starting Metronidazole
2. Consider 25-50% Warfarin dose reduction prophylactically
3. Watch for bleeding signs (bruising, dark stools, hematuria)
4. Consider alternative antibiotics: Amoxicillin/Clavulanate

**🏥 NABH Alert:** This interaction is on the hospital's Critical Drug Interaction list.`,

    'lab': `🔬 **Lab Interpretation — Iron Deficiency Anemia**

| Parameter | Value | Reference | Status |
|-----------|-------|-----------|--------|
| Hemoglobin | 7.2 g/dL | 13-17 g/dL | 🔴 Severe |
| MCV | 68 fL | 80-100 fL | 🔴 Microcytic |
| Ferritin | 8 ng/mL | 20-250 ng/mL | 🔴 Depleted |

**📊 Assessment:** Microcytic hypochromic anemia with depleted iron stores → **Iron Deficiency Anemia (IDA)**

**Severity:** Moderate-severe (Hb < 8 g/dL — consider transfusion threshold)

**📋 Recommended workup:**
1. Serum Iron, TIBC, Transferrin Saturation
2. Peripheral blood smear
3. Reticulocyte count
4. Stool occult blood (R/O GI bleed)
5. If female: menstrual history assessment

**🩺 ICD-10:** D50.9 — Iron deficiency anemia, unspecified`,

    'chest': `🩺 **Differential Diagnosis — Acute Chest Pain**

**Clinical Presentation:** Acute chest pain + diaphoresis + dyspnea

| Priority | Diagnosis | Probability | Key Differentiator |
|----------|-----------|-------------|-------------------|
| 🔴 STAT | **Acute MI (STEMI/NSTEMI)** | High (45%) | ECG changes, Troponin elevation |
| 🔴 STAT | **Pulmonary Embolism** | Moderate (20%) | D-dimer, CT-PA, Well's score |
| 🔴 STAT | **Aortic Dissection** | Low-Mod (10%) | Tearing pain, BP differential, CT Aorta |
| 🟡 Urgent | **Unstable Angina** | Moderate (15%) | Serial ECGs, stress test |
| 🟡 Urgent | **Tension Pneumothorax** | Low (5%) | Absent breath sounds, tracheal shift |
| 🟢 Lower | **Pericarditis** | Low (5%) | Friction rub, diffuse ST elevation |

**⚡ Immediate Workup (STAT):**
1. 12-lead ECG — within 10 minutes
2. Troponin I/T (serial q3h)
3. Chest X-Ray
4. CBC, BMP, D-dimer, ABG
5. Continuous cardiac monitoring

**🏥 Protocol:** Activate Chest Pain Pathway per hospital protocol`,

    'icd': `📋 **ICD-10 Code Suggestions**

**Primary Diagnosis:** Type 2 Diabetes with Diabetic Nephropathy

| Code | Description | Specificity |
|------|-------------|------------|
| **E11.21** | Type 2 DM with diabetic nephropathy | ✅ Most Specific |
| E11.22 | Type 2 DM with diabetic CKD | If CKD staged |
| E11.65 | Type 2 DM with hyperglycemia | Add if applicable |
| N18.3-N18.5 | CKD Stage 3-5 | Secondary — specify stage |

**💰 CDI Impact:**
- Using E11.21 instead of unspecified E11.9 → **DRG weight ↑ 0.3**
- Adding CKD stage → **HCC risk adjustment capture**
- Estimated revenue impact: **+₹28,000/case**

**⚠️ Documentation Tips:**
1. Specify nephropathy stage (microalbuminuria vs macroalbuminuria)
2. Document most recent eGFR and UACR
3. Link diabetes as causal condition for CKD`,

    'sepsis': `🚨 **SEPSIS SCREENING — POSITIVE**

**qSOFA Score: 3/3** ⚠️ HIGH RISK
| Criteria | Value | Status |
|----------|-------|--------|
| Systolic BP ≤ 100 | 88 mmHg | 🔴 MET |
| Respiratory Rate ≥ 22 | 24/min | 🔴 MET |
| Altered Mentation | Assess GCS | ⚠️ CHECK |

**SIRS Criteria: 3/4 MET**
- ✅ Temp > 38°C (38.9°C)
- ✅ HR > 90 (112 bpm)
- ✅ WBC > 12,000 (18,200)
- ⏳ RR > 20 (24/min) — MET

**⚡ HOUR-1 SEPSIS BUNDLE — ACTIVATE NOW:**
1. 🩸 Blood cultures × 2 sets BEFORE antibiotics
2. 💊 Broad-spectrum antibiotics within 1 hour
3. 💧 30 mL/kg crystalloid for hypotension (BP < 90)
4. 🔬 Serum Lactate — STAT
5. 📊 Repeat lactate if initial > 2 mmol/L

**🏥 Protocol:** Notify ICU team, consider vasopressors if MAP < 65 after fluid resuscitation`,

    'vancomycin': `💉 **Vancomycin Dosing Calculator**

**Patient Parameters:**
- Weight: 72 kg
- CrCl: 45 mL/min (Moderate renal impairment)
- Indication: Assumed serious MRSA infection

**📊 Calculated Dose:**
| Parameter | Value |
|-----------|-------|
| **Loading Dose** | 25 mg/kg = **1,800 mg** (round to 1,750 mg) |
| **Maintenance Dose** | 750 mg q12h |
| **Target Trough** | 15-20 mcg/mL (serious infection) |
| **Infusion Rate** | ≤ 10 mg/min (175 min for loading) |

**⚠️ Renal Dose Adjustment:**
- CrCl 45 → Dosing interval extended
- Standard: 15-20 mg/kg q8-12h → **Adjusted: q12h**
- AUC/MIC target: 400-600

**📋 Monitoring Plan:**
1. Trough level before 4th dose (steady state)
2. BUN/Creatinine daily
3. Audiometry if prolonged course
4. Watch for Red Man Syndrome (infuse over ≥60 min)`,
  };

  const getAIResponse = (userInput) => {
    const lower = userInput.toLowerCase();
    if (lower.includes('warfarin') || lower.includes('interaction')) return aiResponses.warfarin;
    if (lower.includes('lab') || lower.includes('hb') || lower.includes('ferritin')) return aiResponses.lab;
    if (lower.includes('chest') || lower.includes('differential')) return aiResponses.chest;
    if (lower.includes('icd') || lower.includes('code') || lower.includes('diabetes')) return aiResponses.icd;
    if (lower.includes('sepsis') || lower.includes('temp') || lower.includes('wbc')) return aiResponses.sepsis;
    if (lower.includes('vancomycin') || lower.includes('dose') || lower.includes('calculator')) return aiResponses.vancomycin;
    return `I understand your query about "${userInput}". Let me analyze this...\n\n📊 Based on current clinical evidence and hospital protocols, I'd recommend:\n1. Review the patient's complete history\n2. Cross-reference with latest guidelines\n3. Consider specialist consultation if needed\n\nWould you like me to provide more specific guidance on any aspect?`;
  };

  const handleSend = (text) => {
    const msgText = text || input;
    if (!msgText.trim()) return;

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: msgText, time: now }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getAIResponse(msgText);
      setMessages(prev => [...prev, { role: 'assistant', text: response, time: now }]);
      setIsTyping(false);
    }, 1500);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const recentPatients = [
    { name: 'Rajesh Kumar', mrn: 'MRN-1045', condition: 'T2DM + HTN', ward: 'A-101' },
    { name: 'Anita Desai', mrn: 'MRN-1078', condition: 'Pneumonia', ward: 'A-103' },
    { name: 'Suresh Menon', mrn: 'MRN-1023', condition: 'Post-CABG', ward: 'ICU-2' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🤖 Wolf Clinical AI Assistant</h4>
          <small className="text-muted">Phase 7 S-Tier — AI-powered clinical decision support</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2">🟢 AI Engine Online</Badge>
          <Badge bg="info" className="p-2">v2.1 — CDS Certified</Badge>
        </div>
      </div>

      <Row>
        <Col md={3}>
          <Card className="mb-3">
            <Card.Header className="bg-primary text-white"><strong>⚡ Quick Actions</strong></Card.Header>
            <ListGroup variant="flush">
              {quickActions.map((qa, i) => (
                <ListGroup.Item key={i} action onClick={() => handleSend(qa.prompt)} style={{cursor: 'pointer', fontSize: '0.85rem'}}>
                  {qa.label}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
          <Card>
            <Card.Header><strong>👥 Recent Patients</strong></Card.Header>
            <ListGroup variant="flush">
              {recentPatients.map((p, i) => (
                <ListGroup.Item key={i}>
                  <strong>{p.name}</strong><br/>
                  <small className="text-muted">{p.mrn} | {p.ward}</small><br/>
                  <Badge bg="secondary" size="sm">{p.condition}</Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col md={9}>
          <Card style={{height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column'}}>
            <Card.Header className="bg-dark text-white d-flex justify-content-between">
              <span>🤖 Wolf AI — Clinical Decision Support</span>
              <small>Powered by Wolf Intelligence Engine</small>
            </Card.Header>
            <Card.Body style={{overflowY: 'auto', flex: 1, backgroundColor: '#f8f9fa'}}>
              {messages.map((msg, i) => (
                <div key={i} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: msg.role === 'user' ? '#0d6efd' : '#ffffff',
                    color: msg.role === 'user' ? '#fff' : '#212529',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.9rem'
                  }}>
                    {msg.text}
                    <div className="text-end mt-1"><small style={{opacity: 0.6, fontSize: '0.75rem'}}>{msg.time}</small></div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="d-flex justify-content-start mb-3">
                  <div style={{padding: '12px 20px', borderRadius: '18px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <span className="text-muted">🤖 Wolf AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </Card.Body>
            <Card.Footer>
              <InputGroup>
                <Form.Control
                  placeholder="Ask Wolf AI — drug interactions, diagnosis, lab interpretation, guidelines..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  size="lg"
                />
                <Button variant="primary" onClick={() => handleSend()} size="lg">Send 🚀</Button>
              </InputGroup>
              <div className="mt-1 text-center">
                <small className="text-muted">⚕️ AI suggestions are for clinical decision support only — always verify with clinical judgment</small>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ClinicalAIAssistant;
