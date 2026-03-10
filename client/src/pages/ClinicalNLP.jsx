import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const ClinicalNLP = () => {
  const [activeTab, setActiveTab] = useState('extraction');
  const [inputNote, setInputNote] = useState(`Patient is a 65-year-old male with a history of type 2 diabetes mellitus, hypertension, and chronic kidney disease stage 3. He presents today with worsening shortness of breath and bilateral lower extremity edema for the past 3 days. 

Vitals: BP 158/92, HR 96, RR 22, SpO2 93% on RA, Temp 37.1°C.

On examination, JVP elevated, bilateral basal crackles, pitting edema 2+ bilateral.

Labs: BNP 1240 pg/mL, Creatinine 2.1 mg/dL, eGFR 32, K+ 5.2 mEq/L, Hb 10.8 g/dL.

Assessment: Acute decompensated heart failure (ADHF) with reduced ejection fraction (HFrEF), likely precipitated by medication non-compliance. CKD stage 3b with hyperkalemia.

Plan: IV Furosemide 40mg stat, restrict fluids to 1.5L, telemetry monitoring, ECHO stat, cardiology consult, hold ACE-inhibitor due to hyperkalemia, insulin sliding scale for diabetes, strict I/O charting.`);

  const extractedEntities = [
    { entity: 'Type 2 diabetes mellitus', type: 'Condition', icd10: 'E11.9', confidence: 96, hcc: true },
    { entity: 'Hypertension', type: 'Condition', icd10: 'I10', confidence: 98, hcc: false },
    { entity: 'Chronic kidney disease stage 3', type: 'Condition', icd10: 'N18.3', confidence: 94, hcc: true },
    { entity: 'Acute decompensated heart failure', type: 'Condition', icd10: 'I50.21', confidence: 91, hcc: true },
    { entity: 'HFrEF', type: 'Condition', icd10: 'I50.20', confidence: 88, hcc: true },
    { entity: 'Hyperkalemia', type: 'Condition', icd10: 'E87.5', confidence: 95, hcc: false },
    { entity: 'Bilateral lower extremity edema', type: 'Symptom', icd10: 'R60.0', confidence: 92, hcc: false },
    { entity: 'Shortness of breath', type: 'Symptom', icd10: 'R06.02', confidence: 97, hcc: false },
    { entity: 'Furosemide 40mg IV', type: 'Medication', rxnorm: '313988', confidence: 99, hcc: false },
    { entity: 'IV Furosemide', type: 'Medication', rxnorm: '313988', confidence: 98, hcc: false },
    { entity: 'Insulin sliding scale', type: 'Medication', rxnorm: '311027', confidence: 90, hcc: false },
    { entity: 'ACE-inhibitor', type: 'Medication', rxnorm: 'CLASS', confidence: 85, hcc: false },
  ];

  const suggestedCodes = [
    { code: 'I50.21', desc: 'Acute systolic (congestive) heart failure', type: 'Primary', confidence: 91, drgImpact: 'Base DRG 291', revenue: '₹1,20,000' },
    { code: 'E11.22', desc: 'Type 2 DM with diabetic CKD', type: 'Secondary', confidence: 94, drgImpact: 'CC — DRG weight +0.4', revenue: '+₹48,000' },
    { code: 'N18.3b', desc: 'CKD Stage 3b', type: 'Secondary', confidence: 92, drgImpact: 'MCC — DRG weight +0.8', revenue: '+₹96,000' },
    { code: 'E87.5', desc: 'Hyperkalemia', type: 'Secondary', confidence: 95, drgImpact: 'CC', revenue: '+₹24,000' },
    { code: 'I10', desc: 'Essential hypertension', type: 'Secondary', confidence: 98, drgImpact: 'None', revenue: '—' },
    { code: 'R60.0', desc: 'Localized edema', type: 'Symptom', confidence: 92, drgImpact: 'None', revenue: '—' },
  ];

  const qualityFlags = [
    { flag: '⚠️ Specify ejection fraction %', detail: 'EF% needed for HFrEF vs HFpEF differentiation — impacts DRG', impact: 'High', status: 'Missing' },
    { flag: '⚠️ Document medication non-compliance', detail: 'Non-compliance as precipitant — document for clinical context', impact: 'Medium', status: 'Vague' },
    { flag: '📋 Link diabetes to CKD', detail: 'E11.22 requires causal linkage — "diabetic nephropathy"', impact: 'High', status: 'Implicit' },
    { flag: '✅ Hyperkalemia well documented', detail: 'K+ 5.2 with lab value — clear clinical indicator', impact: 'Low', status: 'Complete' },
  ];

  const metrics = {
    notesProcessed: 1248, entitiesExtracted: 8940, autoCodedAccuracy: 93,
    cdiQueriesGenerated: 156, revenueImpact: '₹22.4L', avgProcessTime: '2.3s'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🧠 Clinical NLP Engine</h4>
          <small className="text-muted">Phase 7 S-Tier — Auto-coding, entity extraction, documentation quality analysis</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => {}}>🔬 Analyze Note</Button>
          <Button variant="outline-info">📊 NLP Analytics</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h4 className="text-primary">{metrics.notesProcessed}</h4><small>Notes Processed</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h4 className="text-info">{metrics.entitiesExtracted}</h4><small>Entities Extracted</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h4 className="text-success">{metrics.autoCodedAccuracy}%</h4><small>Auto-Code Accuracy</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h4 className="text-warning">{metrics.cdiQueriesGenerated}</h4><small>CDI Queries Auto-generated</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h4 className="text-success">{metrics.revenueImpact}</h4><small>Revenue Impact</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="extraction" title="🔬 Entity Extraction">
          <Row>
            <Col md={5}>
              <Card className="h-100">
                <Card.Header className="bg-dark text-white">📝 Clinical Note Input</Card.Header>
                <Card.Body>
                  <Form.Control as="textarea" rows={18} value={inputNote} onChange={e => setInputNote(e.target.value)} style={{fontSize: '0.85rem', fontFamily: 'monospace'}} />
                  <Button variant="primary" className="mt-2 w-100">🧠 Extract Entities & Auto-Code</Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="h-100">
                <Card.Header className="bg-success text-white">🏷️ Extracted Entities ({extractedEntities.length})</Card.Header>
                <Card.Body style={{overflowY: 'auto', maxHeight: 500}}>
                  <Table striped hover size="sm">
                    <thead className="table-dark">
                      <tr><th>Entity</th><th>Type</th><th>Code</th><th>Confidence</th><th>HCC</th></tr>
                    </thead>
                    <tbody>
                      {extractedEntities.map((e, i) => (
                        <tr key={i}>
                          <td><strong>{e.entity}</strong></td>
                          <td><Badge bg={e.type === 'Condition' ? 'danger' : e.type === 'Medication' ? 'primary' : 'info'}>{e.type}</Badge></td>
                          <td><code>{e.icd10 || e.rxnorm}</code></td>
                          <td>
                            <ProgressBar now={e.confidence} variant={e.confidence > 90 ? 'success' : 'warning'} style={{height: 6}} />
                            <small>{e.confidence}%</small>
                          </td>
                          <td>{e.hcc ? <Badge bg="success">HCC</Badge> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="autocoding" title="📋 Auto-Coding">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Suggested ICD-10 / DRG Coding</h5>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Code</th><th>Description</th><th>Type</th><th>Confidence</th><th>DRG Impact</th><th>Revenue</th><th>Accept</th></tr>
                </thead>
                <tbody>
                  {suggestedCodes.map((c, i) => (
                    <tr key={i} className={c.type === 'Primary' ? 'table-info' : ''}>
                      <td><code className="fw-bold">{c.code}</code></td>
                      <td>{c.desc}</td>
                      <td><Badge bg={c.type === 'Primary' ? 'primary' : c.type === 'Secondary' ? 'success' : 'secondary'}>{c.type}</Badge></td>
                      <td><Badge bg={c.confidence > 90 ? 'success' : 'warning'}>{c.confidence}%</Badge></td>
                      <td>{c.drgImpact}</td>
                      <td className="text-success fw-bold">{c.revenue}</td>
                      <td><Form.Check type="checkbox" defaultChecked={c.confidence > 85} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="mt-3 p-3 bg-light rounded text-center">
                <h5>Estimated Total DRG Revenue: <span className="text-success">₹2,88,000</span></h5>
                <small>vs. manual coding estimate ₹1,68,000 — <strong className="text-success">+71% revenue capture</strong></small>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="quality" title="⚠️ Documentation Quality">
          <Card>
            <Card.Body>
              <h5 className="mb-3">AI-Detected Documentation Quality Flags</h5>
              {qualityFlags.map((f, i) => (
                <Alert key={i} variant={f.status === 'Complete' ? 'success' : f.impact === 'High' ? 'danger' : 'warning'}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{f.flag}</strong>
                      <br/><small className="text-muted">{f.detail}</small>
                    </div>
                    <div>
                      <Badge bg={f.status === 'Complete' ? 'success' : f.status === 'Missing' ? 'danger' : 'warning'}>{f.status}</Badge>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ClinicalNLP;
