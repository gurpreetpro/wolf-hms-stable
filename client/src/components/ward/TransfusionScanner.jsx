import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Form,
  Button,
  Alert,
  Card,
  Toast,
  ToastContainer,
  Badge,
  Spinner,
  Row,
  Col,
} from 'react-bootstrap';
import {
  ScanLine,
  User,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Droplet,
} from 'lucide-react';
import bloodBankService from '../../services/bloodBankService';

/**
 * TransfusionScanner — BCMA Bedside Transfusion Verification
 *
 * Design Philosophy — "The Two-Scan Lock":
 * - The UI is locked by default (Start Transfusion button disabled).
 * - Both "Patient Wristband (UHID)" and "Blood Unit ISBT DIN" MUST be scanned.
 * - Only then does the "Start Transfusion" button unlock.
 * - WOLF Ultimate Guardrails: ABO/Rh mismatch, TTI, expiry, cross-match, recent reaction.
 * - On success: Green toast + transfusion ID displayed.
 * - On clinical warning: Red alert + UI stays locked for correction.
 */
export default function TransfusionScanner() {
  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [patientUhid, setPatientUhid] = useState('');
  const [isbtDin, setIsbtDin] = useState('');

  // Feedback state
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'danger'|'warning', title, message }
  const [warnings, setWarnings] = useState([]);
  const [showToast, setShowToast] = useState(false);

  // Audit trail
  const [lastTransfusion, setLastTransfusion] = useState(null);

  // Refs for barcode gun focus management
  const uhidInputRef = useRef(null);
  const dinInputRef = useRef(null);

  // -------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------
  const isLocked = !patientUhid.trim() || !isbtDin.trim();
  const isLoading = status === 'loading';

  // -------------------------------------------------------------
  // Auto-dismiss toast after 5s
  // -------------------------------------------------------------
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // -------------------------------------------------------------
  // Clear feedback when inputs change (reset lock feedback)
  // -------------------------------------------------------------
  useEffect(() => {
    if (feedback) {
      setFeedback(null);
      setWarnings([]);
      setStatus('idle');
    }
  }, [patientUhid, isbtDin]);

  // -------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------
  const handleStartTransfusion = useCallback(
    async (e) => {
      e.preventDefault();

      if (isLocked) return;

      setStatus('loading');
      setFeedback(null);
      setWarnings([]);

      try {
        const result = await bloodBankService.bedsideStartTransfusion({
          patientUhid: patientUhid.trim(),
          isbtDinScanned: isbtDin.trim(),
        });

        if (result.success) {
          const data = result.data;

          // ----- SUCCESS: Transfusion Started -----
          setStatus('success');
          setFeedback({
            type: 'success',
            title: 'Transfusion Started Safely',
            message: data?.message || result.data?.message || 'Bedside BCMA verification passed. Transfusion is now in progress.',
          });
          setShowToast(true);
          setLastTransfusion({
            transfusionId: data?.transfusionId || 'N/A',
            patient: data?.patient || { name: 'Unknown' },
            unit: data?.unit || {},
            time: new Date().toLocaleTimeString(),
          });

          // If non-blocking warnings exist (e.g., cross-match not found), show them
          const allWarnings = data?.warnings || [];
          if (allWarnings.length > 0) {
            setWarnings(allWarnings);
          }

          // Reset fields for next scan
          setPatientUhid('');
          setIsbtDin('');

          // Return focus to UHID input for next patient
          setTimeout(() => uhidInputRef.current?.focus(), 100);
        } else {
          // ----- BACKEND GUARDRAIL BLOCKED -----
          setStatus('error');
          setFeedback({
            type: 'danger',
            title: `TRANSFUSION BLOCKED — ${result.status || 'GUARDRAIL'}`,
            message: result.message || 'Bedside safety check failed.',
          });
          // Keep UI locked — do NOT reset fields
        }
      } catch (err) {
        // Network or unexpected error
        setStatus('error');
        setFeedback({
          type: 'danger',
          title: 'Connection Error',
          message: 'Failed to reach the blood bank server. Please check your connection and try again.',
        });
      }
    },
    [patientUhid, isbtDin, isLocked]
  );

  // -------------------------------------------------------------
  // Handle ENTER key behavior for barcode gun workflow
  // -------------------------------------------------------------
  const handleUhidKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Barcode gun auto-enters — jump to blood unit DIN field
      dinInputRef.current?.focus();
    }
  };

  const handleDinKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If both fields are filled, auto-start on ENTER from DIN field
      if (!isLocked) {
        handleStartTransfusion(e);
      }
    }
  };

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <>
      <Card className="transfusion-scanner shadow-sm">
        <Card.Header className="d-flex align-items-center justify-content-between bg-danger text-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <Droplet size={22} />
            Transfusion BCMA Scanner
          </h5>
          <Badge
            bg={isLocked ? 'light' : 'success'}
            text={isLocked ? 'dark' : 'white'}
            className="d-flex align-items-center gap-1 px-3 py-2"
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            {isLocked ? 'LOCKED' : 'UNLOCKED'}
          </Badge>
        </Card.Header>

        <Card.Body>
          {/* ------ Feedback Alert ------ */}
          {feedback && (
            <Alert
              variant={feedback.type}
              className="d-flex align-items-start gap-2 mb-3"
              dismissible
              onClose={() => {
                setFeedback(null);
                setWarnings([]);
                setStatus('idle');
              }}
            >
              {feedback.type === 'success' ? (
                <CheckCircle size={20} />
              ) : feedback.type === 'danger' ? (
                <ShieldAlert size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <div>
                <strong>{feedback.title}</strong>
                <div className="small">{feedback.message}</div>
              </div>
            </Alert>
          )}

          {/* ------ Warnings list (from WOLF Ultimate) ------ */}
          {warnings.length > 0 && (
            <div className="mb-3">
              <strong className="text-warning">
                <XCircle size={16} className="me-1" />
                Clinical Warnings:
              </strong>
              <ul className="list-unstyled mt-1 mb-0">
                {warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-warning small mb-1 d-flex align-items-center gap-1"
                  >
                    <XCircle size={14} />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ------ Status Banner ------ */}
          {status === 'success' && !feedback && (
            <div className="text-center mb-3 p-3 bg-success bg-opacity-10 border border-success rounded">
              <CheckCircle size={32} className="text-success mb-2" />
              <h6 className="text-success mb-0">
                Transfusion Started Successfully
              </h6>
            </div>
          )}

          <Form onSubmit={handleStartTransfusion}>
            {/* 1 — Patient Wristband Scan */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold d-flex align-items-center gap-2">
                <User size={18} className="text-primary" />
                Scan Patient Wristband (UHID)
              </Form.Label>
              <Form.Control
                ref={uhidInputRef}
                type="text"
                placeholder="e.g. KOKILA-0010/2026"
                value={patientUhid}
                onChange={(e) => setPatientUhid(e.target.value)}
                onKeyDown={handleUhidKeyDown}
                disabled={isLoading}
                autoFocus
                className={`border-2 ${
                  patientUhid.trim() ? 'border-primary' : 'border-secondary'
                }`}
              />
              <Form.Text className="text-muted">
                Scan the patient wristband barcode or type the UHID manually.
              </Form.Text>
            </Form.Group>

            {/* 2 — Blood Unit ISBT DIN Scan */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold d-flex align-items-center gap-2">
                <Droplet size={18} className="text-danger" />
                Scan Blood Unit (ISBT 128 DIN)
              </Form.Label>
              <Form.Control
                ref={dinInputRef}
                type="text"
                placeholder="e.g. =A999923123456"
                value={isbtDin}
                onChange={(e) => setIsbtDin(e.target.value)}
                onKeyDown={handleDinKeyDown}
                disabled={isLoading}
                className={`border-2 ${
                  isbtDin.trim() ? 'border-danger' : 'border-secondary'
                }`}
              />
              <Form.Text className="text-muted">
                Scan the ISBT 128 DIN barcode on the blood unit bag. WOLF
                Ultimate will verify ABO/Rh match, TTI status, expiry, and
                cross-match before allowing transfusion.
              </Form.Text>
            </Form.Group>

            {/* ------ Guardrail Summary (visible when both scanned) ------ */}
            {patientUhid.trim() && isbtDin.trim() && (
              <Row className="mb-3 g-2">
                <Col xs={6}>
                  <div className="p-2 bg-light rounded small text-center">
                    <strong className="text-muted d-block">
                      Guardrails Active:
                    </strong>
                    <span className="text-danger fw-bold">
                      ABO/Rh Match • TTI • Expiry • Cross-Match • Reaction
                    </span>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="p-2 bg-light rounded small text-center">
                    <strong className="text-muted d-block">
                      WOLF Ultimate:
                    </strong>
                    <span className="text-success fw-bold">Ready</span>
                  </div>
                </Col>
              </Row>
            )}

            {/* ------ START TRANSFUSION Button (The Dual-Scan Lock) ------ */}
            <div className="d-grid">
              <Button
                variant={isLocked ? 'outline-secondary' : 'danger'}
                size="lg"
                type="submit"
                disabled={isLocked || isLoading}
                className="d-flex align-items-center justify-content-center gap-2 py-3"
              >
                {isLoading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Verifying with WOLF Ultimate...
                  </>
                ) : isLocked ? (
                  <>
                    <Lock size={20} />
                    Start Transfusion — Both Scan Fields Required
                  </>
                ) : (
                  <>
                    <Unlock size={20} />
                    Start Transfusion
                  </>
                )}
              </Button>
            </div>

            {/* ------ Lock explanation ------ */}
            {isLocked && (
              <div className="text-center mt-2 text-muted small">
                <Lock size={12} className="me-1" />
                The &quot;Start Transfusion&quot; button remains locked until
                both the Patient UHID and Blood Unit ISBT DIN are scanned.
              </div>
            )}
          </Form>

          {/* ------ Last Transfusion Audit Log ------ */}
          {lastTransfusion && (
            <div className="mt-3 p-3 bg-light rounded border small">
              <Row className="g-2">
                <Col xs={12}>
                  <strong>
                    <CheckCircle size={14} className="text-success me-1" />
                    Last Transfusion Started:
                  </strong>
                </Col>
                <Col xs={4}>
                  <span className="text-muted">Transfusion ID:</span>
                  <br />
                  <code>{lastTransfusion.transfusionId}</code>
                </Col>
                <Col xs={4}>
                  <span className="text-muted">Patient:</span>
                  <br />
                  <strong>{lastTransfusion.patient?.name || 'N/A'}</strong>
                </Col>
                <Col xs={4}>
                  <span className="text-muted">Unit:</span>
                  <br />
                  <Badge bg="danger">
                    {lastTransfusion.unit?.blood_group || '?'}
                    {lastTransfusion.unit?.rh_factor === 'Negative' ? '-' : '+'}
                  </Badge>
                </Col>
              </Row>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ------ Success Toast ------ */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          bg="success"
          className="text-white"
          delay={5000}
          autohide
        >
          <Toast.Header>
            <CheckCircle className="me-2 text-success" size={20} />
            <strong className="me-auto">TRANSFUSION STARTED</strong>
            <small>just now</small>
          </Toast.Header>
          <Toast.Body className="text-white bg-success">
            Bedside BCMA verification passed. Transfusion is now in progress.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* ------ Inline Styles (scoped to component) ------ */}
      <style>{`
        .transfusion-scanner {
          max-width: 600px;
          margin: 0 auto;
        }
        .transfusion-scanner input.form-control {
          font-family: 'Courier New', Courier, monospace;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .transfusion-scanner input.form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.15);
        }
      `}</style>
    </>
  );
}