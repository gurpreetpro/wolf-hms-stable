import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Card, Toast, ToastContainer, Badge, Spinner } from 'react-bootstrap';
import { ScanLine, User, Lock, Unlock, CheckCircle, XCircle, ShieldAlert, PackageCheck } from 'lucide-react';

/**
 * MARScanner — Barcode Medication Administration (BCMA)
 *
 * Design Philosophy — "The Barcode Lock":
 * - The UI is locked by default (Administer button disabled).
 * - Both "Patient Wristband (UHID)" and "Medication Barcode" MUST be filled.
 * - Only then does the "Administer" button unlock.
 * - On success: Green toast + success message.
 * - On clinical warning: Red alert + UI stays locked.
 */
export default function MARScanner() {
  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [patientUhid, setPatientUhid] = useState('');
  const [drugBarcode, setDrugBarcode] = useState('');

  // Feedback state
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'danger'|'warning', title, message }
  const [warnings, setWarnings] = useState([]);
  const [showToast, setShowToast] = useState(false);

  // Audit trail
  const [lastLog, setLastLog] = useState(null);

  // Refs for barcode gun focus management
  const uhidInputRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // -------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------
  const isLocked = !patientUhid.trim() || !drugBarcode.trim();
  const isLoading = status === 'loading';

  // -------------------------------------------------------------
  // Auto-dismiss toast after 4s
  // -------------------------------------------------------------
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUhid, drugBarcode]);

  // -------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------
  const handleAdminister = useCallback(async (e) => {
    e.preventDefault();

    if (isLocked) return;

    setStatus('loading');
    setFeedback(null);
    setWarnings([]);

    try {
      const response = await axios.post('/api/ward/mar/scan', {
        patientUhid: patientUhid.trim(),
        drugBarcode: drugBarcode.trim()
      });

      // Axios wraps in data; the ResponseHandler puts result at top level
      const data = response.data?.data || response.data;

      if (response.status === 201 && (data.success !== false)) {
        // ----- SUCCESS: Med Logged -----
        setStatus('success');
        setFeedback({
          type: 'success',
          title: 'Success: Med Logged',
          message: data.message || 'Medication administered successfully.'
        });
        setShowToast(true);
        setLastLog({
          id: data.logId,
          time: new Date().toLocaleTimeString(),
          patientUhid: patientUhid.trim(),
          barcode: drugBarcode.trim()
        });

        // Reset fields for next scan
        setPatientUhid('');
        setDrugBarcode('');

        // Return focus to UHID input for next patient
        setTimeout(() => uhidInputRef.current?.focus(), 100);
      } else {
        // Should not happen with our backend, but handle generically
        throw new Error(data.message || 'Unexpected response from server.');
      }
    } catch (err) {
      // -------------------------------------------------------
      // ERROR / CLINICAL WARNING handling
      // -------------------------------------------------------
      // ResponseHandler.error puts extra details into data.error object
      const responseData = err.response?.data;
      const errorDetail = responseData?.error;
      const errMsg = responseData?.message || (typeof errorDetail === 'string' ? errorDetail : errorDetail?.message) || err.message || 'MAR scan failed.';
      const errStatus = (typeof errorDetail === 'object' && errorDetail?.status) || 'ERROR';
      const errWarnings = (typeof errorDetail === 'object' && errorDetail?.warnings) || [];

      if (err.response?.status === 409 || errStatus === 'CLINICAL_WARNING') {
        // ----- CLINICAL WARNING: Red alert, stay locked -----
        setStatus('error');
        setFeedback({
          type: 'danger',
          title: 'CLINICAL WARNING — Administration BLOCKED',
          message: errMsg
        });
        setWarnings(errWarnings);
      } else if (err.response?.status === 410 || errStatus === 'DRUG_EXPIRED') {
        setStatus('error');
        setFeedback({
          type: 'warning',
          title: 'Expired Medication',
          message: errMsg
        });
      } else if (err.response?.status === 404) {
        setStatus('error');
        setFeedback({
          type: 'warning',
          title: 'Not Found',
          message: errMsg
        });
      } else if (err.response?.status === 401) {
        setStatus('error');
        setFeedback({
          type: 'warning',
          title: 'Authentication Required',
          message: 'Please log in as a nurse to administer medications.'
        });
      } else {
        // Generic fallback
        setStatus('error');
        setFeedback({
          type: 'danger',
          title: 'Scan Failed',
          message: errMsg
        });
      }

      // Keep the UI locked on error — do NOT reset fields (nurse needs to correct)
    }
  }, [patientUhid, drugBarcode, isLocked]);

  // -------------------------------------------------------------
  // Handle ENTER key behavior for barcode gun workflow
  // -------------------------------------------------------------
  const handleUhidKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Barcode gun auto-enters — jump to medication field
      barcodeInputRef.current?.focus();
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If both fields are filled, auto-administer on ENTER from barcode field
      if (!isLocked) {
        handleAdminister(e);
      }
    }
  };

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <>
      <Card className="mar-scanner shadow-sm">
        <Card.Header className="d-flex align-items-center justify-content-between bg-dark text-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <ScanLine size={22} />
            BCMA Medication Scanner
          </h5>
          <Badge bg={isLocked ? 'danger' : 'success'} className="d-flex align-items-center gap-1 px-3 py-2">
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            {isLocked ? 'LOCKED' : 'UNLOCKED'}
          </Badge>
        </Card.Header>

        <Card.Body>
          {/* ------ Feedback Alert ------ */}
          {feedback && (
            <Alert
              variant={feedback.type}
              className="d-flex align-items-center gap-2 mb-3"
              dismissible
              onClose={() => {
                setFeedback(null);
                setWarnings([]);
                setStatus('idle');
              }}
            >
              {feedback.type === 'success' ? <CheckCircle size={20} /> :
                feedback.type === 'danger' ? <ShieldAlert size={20} /> :
                  <XCircle size={20} />}
              <div>
                <strong>{feedback.title}</strong>
                <div className="small">{feedback.message}</div>
              </div>
            </Alert>
          )}

          {/* ------ Warnings list (from WOLF Ultimate) ------ */}
          {warnings.length > 0 && (
            <div className="mb-3">
              <strong className="text-danger">
                <ShieldAlert size={16} className="me-1" />
                WOLF Ultimate Guardrails:
              </strong>
              <ul className="list-unstyled mt-1 mb-0">
                {warnings.map((w, i) => (
                  <li key={i} className="text-danger small mb-1 d-flex align-items-center gap-1">
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
              <h6 className="text-success mb-0">Medication Logged Successfully</h6>
            </div>
          )}

          <Form onSubmit={handleAdminister}>
            {/* 1 — Patient Wristband Scan */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold d-flex align-items-center gap-2">
                <User size={18} />
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
                className={`border-2 ${patientUhid.trim() ? 'border-primary' : 'border-secondary'}`}
              />
              <Form.Text className="text-muted">
                Scan the patient wristband barcode or type the UHID manually.
              </Form.Text>
            </Form.Group>

            {/* 2 — Medication Barcode Scan */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold d-flex align-items-center gap-2">
                <PackageCheck size={18} />
                Scan Medication (Barcode)
              </Form.Label>
              <Form.Control
                ref={barcodeInputRef}
                type="text"
                placeholder="e.g. SKU-AMPICILLIN-500"
                value={drugBarcode}
                onChange={(e) => setDrugBarcode(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                disabled={isLoading}
                className={`border-2 ${drugBarcode.trim() ? 'border-primary' : 'border-secondary'}`}
              />
              <Form.Text className="text-muted">
                Scan the medication barcode. WOLF Ultimate will verify safety before administering.
              </Form.Text>
            </Form.Group>

            {/* ------ ADMINISTER Button (The Barcode Lock) ------ */}
            <div className="d-grid">
              <Button
                variant={isLocked ? 'outline-secondary' : 'primary'}
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
                    Administer — Both Scan Fields Required
                  </>
                ) : (
                  <>
                    <Unlock size={20} />
                    Administer Medication
                  </>
                )}
              </Button>
            </div>

            {/* ------ Lock explanation ------ */}
            {isLocked && (
              <div className="text-center mt-2 text-muted small">
                <Lock size={12} className="me-1" />
                The &quot;Administer&quot; button remains locked until both the Patient UHID and Medication Barcode are scanned.
              </div>
            )}
          </Form>

          {/* ------ Last Audit Log ------ */}
          {lastLog && (
            <div className="mt-3 p-2 bg-light rounded border small">
              <strong>Last Administration:</strong>{' '}
              Log #{lastLog.id} — Patient {lastLog.patientUhid} — {lastLog.barcode} at {lastLog.time}
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
          delay={4000}
          autohide
        >
          <Toast.Header>
            <CheckCircle className="me-2 text-success" size={20} />
            <strong className="me-auto">MED LOGGED</strong>
            <small>just now</small>
          </Toast.Header>
          <Toast.Body className="text-white bg-success">
            Medication was administered safely.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* ------ Inline Styles (scoped to component) ------ */}
      <style>{`
        .mar-scanner {
          max-width: 540px;
          margin: 0 auto;
        }
        .mar-scanner input.form-control {
          font-family: 'Courier New', Courier, monospace;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .mar-scanner input.form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
        }
      `}</style>
    </>
  );
}