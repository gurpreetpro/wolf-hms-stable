import React, { useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Tabs, Tab, ListGroup, ProgressBar, Form } from 'react-bootstrap';

const HealthEducation = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Diabetes', 'Heart', 'Kidney', 'Nutrition', 'Mental Health', 'Post-Surgery', 'Medications'];

  const educationContent = [
    { id: 'ED-01', title: 'Managing Type 2 Diabetes: A Complete Guide', category: 'Diabetes', type: 'Article', readTime: '8 min', views: 342, rating: 4.7, tags: ['Blood Sugar', 'Diet', 'Exercise'], featured: true },
    { id: 'ED-02', title: 'Understanding Your Blood Pressure Medications', category: 'Heart', type: 'Video', readTime: '12 min', views: 289, rating: 4.5, tags: ['Hypertension', 'ACE Inhibitors', 'Beta Blockers'] },
    { id: 'ED-03', title: 'Kidney-Friendly Diet: Foods to Eat and Avoid', category: 'Kidney', type: 'Infographic', readTime: '5 min', views: 198, rating: 4.8, tags: ['CKD', 'Diet', 'Potassium'] },
    { id: 'ED-04', title: 'Post-CABG Recovery: Week by Week Guide', category: 'Post-Surgery', type: 'Article', readTime: '15 min', views: 156, rating: 4.6, tags: ['Cardiac Surgery', 'Recovery', 'Exercise'] },
    { id: 'ED-05', title: 'Insulin Injection Technique: Step by Step', category: 'Diabetes', type: 'Video', readTime: '6 min', views: 421, rating: 4.9, tags: ['Insulin', 'Self-injection', 'Technique'] },
    { id: 'ED-06', title: 'Managing Anxiety During Hospital Stays', category: 'Mental Health', type: 'Article', readTime: '7 min', views: 167, rating: 4.4, tags: ['Anxiety', 'Coping', 'Relaxation'] },
    { id: 'ED-07', title: 'Heart-Healthy Indian Recipes', category: 'Nutrition', type: 'Article', readTime: '10 min', views: 534, rating: 4.8, tags: ['Diet', 'Indian Food', 'Low Sodium'] },
    { id: 'ED-08', title: 'Understanding Your Lab Reports', category: 'Medications', type: 'Infographic', readTime: '4 min', views: 612, rating: 4.7, tags: ['CBC', 'RFT', 'LFT'] },
  ];

  const medicationGuides = [
    { drug: 'Metformin', purpose: 'Blood sugar control', keyPoints: ['Take with meals', 'Watch for lactic acidosis symptoms', 'Regular kidney function tests', 'Avoid excess alcohol'], sideEffects: ['Nausea', 'Diarrhea', 'Metallic taste'] },
    { drug: 'Amlodipine', purpose: 'Blood pressure control', keyPoints: ['Take at same time daily', 'Do not stop suddenly', 'Monitor for ankle swelling', 'Avoid grapefruit'], sideEffects: ['Ankle swelling', 'Dizziness', 'Flushing'] },
    { drug: 'Atorvastatin', purpose: 'Cholesterol management', keyPoints: ['Take at bedtime', 'Report muscle pain immediately', 'Regular liver function tests', 'Continue even if cholesterol normalizes'], sideEffects: ['Muscle pain', 'Headache', 'Digestive issues'] },
  ];

  const wellnessPrograms = [
    { name: 'Diabetes Management Program', duration: '12 weeks', enrolled: 45, completion: 72, nextSession: '2026-03-05', sessions: 12, topics: ['Diet planning', 'Blood sugar monitoring', 'Exercise routine', 'Foot care'] },
    { name: 'Cardiac Rehabilitation', duration: '8 weeks', enrolled: 28, completion: 65, nextSession: '2026-03-04', sessions: 16, topics: ['Supervised exercise', 'Stress management', 'Diet modification', 'Lifestyle changes'] },
    { name: 'Weight Management', duration: '16 weeks', enrolled: 62, completion: 58, nextSession: '2026-03-06', sessions: 16, topics: ['Calorie counting', 'Meal planning', 'Physical activity', 'Behavioral therapy'] },
    { name: 'Mental Wellness', duration: '6 weeks', enrolled: 35, completion: 80, nextSession: '2026-03-07', sessions: 6, topics: ['Mindfulness', 'Sleep hygiene', 'Stress reduction', 'Support groups'] },
  ];

  const filtered = selectedCategory === 'All' ? educationContent : educationContent.filter(e => e.category === selectedCategory);
  const typeIcon = (t) => t === 'Video' ? 'Video' : t === 'Infographic' ? 'Image' : 'Article';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Health Education Hub</h4>
          <small className="text-muted">Phase 8 S-Tier -- Patient education, medication guides & wellness programs</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Create Content</Button>
          <Button variant="outline-info">Analytics</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{educationContent.length}</h3><small>Content Items</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">2,719</h3><small>Total Views</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">4.7</h3><small>Avg Rating</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">170</h3><small>Program Enrollees</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="library" title="Content Library">
          <div className="mb-3 d-flex gap-2 flex-wrap">
            {categories.map(c => (
              <Button key={c} variant={selectedCategory === c ? 'primary' : 'outline-primary'} size="sm" onClick={() => setSelectedCategory(c)}>{c}</Button>
            ))}
          </div>
          <Row>
            {filtered.map(item => (
              <Col md={4} key={item.id} className="mb-3">
                <Card className={item.featured ? 'border-primary' : ''}>
                  <Card.Header className={item.featured ? 'bg-primary text-white' : ''}>
                    {item.featured && <Badge bg="warning" text="dark" className="me-2">Featured</Badge>}
                    <Badge bg={item.type === 'Video' ? 'danger' : item.type === 'Infographic' ? 'info' : 'success'}>{typeIcon(item.type)}</Badge>
                  </Card.Header>
                  <Card.Body>
                    <h6>{item.title}</h6>
                    <div className="d-flex gap-1 mb-2 flex-wrap">
                      {item.tags.map((t,i) => <Badge key={i} bg="light" text="dark" style={{fontSize:'0.7rem'}}>{t}</Badge>)}
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">{item.readTime} read</small>
                      <small className="text-muted">{item.views} views</small>
                      <small>Rating: {item.rating}/5</small>
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <Button variant="outline-primary" size="sm" className="w-100">Read / View</Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="medications" title="Medication Guides">
          <Row>
            {medicationGuides.map((m,i) => (
              <Col md={4} key={i}>
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white"><strong>{m.drug}</strong></Card.Header>
                  <Card.Body>
                    <p><strong>Purpose:</strong> {m.purpose}</p>
                    <h6>Key Points:</h6>
                    <ListGroup variant="flush" className="mb-2">
                      {m.keyPoints.map((k,j) => <ListGroup.Item key={j} className="py-1"><small>- {k}</small></ListGroup.Item>)}
                    </ListGroup>
                    <h6>Side Effects to Watch:</h6>
                    <div className="d-flex gap-1 flex-wrap">
                      {m.sideEffects.map((s,j) => <Badge key={j} bg="warning" text="dark">{s}</Badge>)}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="wellness" title="Wellness Programs">
          <Row>
            {wellnessPrograms.map((p,i) => (
              <Col md={6} key={i} className="mb-3">
                <Card>
                  <Card.Header className="bg-success text-white"><strong>{p.name}</strong></Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Duration:</strong> {p.duration}</p>
                        <p><strong>Enrolled:</strong> <Badge bg="primary">{p.enrolled}</Badge></p>
                        <p><strong>Next Session:</strong> {p.nextSession}</p>
                        <p><strong>Sessions:</strong> {p.sessions} total</p>
                      </Col>
                      <Col md={6}>
                        <h6>Completion Rate</h6>
                        <ProgressBar now={p.completion} variant={p.completion > 70 ? 'success' : 'warning'} label={`${p.completion}%`} className="mb-3" />
                        <h6>Topics Covered:</h6>
                        <div className="d-flex gap-1 flex-wrap">
                          {p.topics.map((t,j) => <Badge key={j} bg="light" text="dark" style={{fontSize:'0.7rem'}}>{t}</Badge>)}
                        </div>
                      </Col>
                    </Row>
                    <Button variant="outline-success" className="mt-2 w-100">Enroll Patient</Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default HealthEducation;
