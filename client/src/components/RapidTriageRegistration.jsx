/**
 * RapidTriageRegistration Component
 * WOLF HMS — Reception/OPD Registration Pipeline Upgrade
 *
 * Minimalist registration form for Emergency / Medico-Legal Cases (MLC).
 * Requires only Gender and Approximate Age. Generates a provisional patient ID
 * so the clinical team can start treatment immediately — full demographics
 * are captured later when the patient is stabilised.
 *
 * Integrates with OPDReception.jsx via the onTriageRegistered callback.
 */

import React, { useState, useCallback } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge, InputGroup, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { AlertTriangle, UserPlus, HeartPulse, ShieldAlert, Ambulance, Clock, Check, X, FileText, Loader2, Zap } from 'lucide-react';
import api from '../utils/axiosInstance';

// ===== APPROXIMATE AGE BUCKETS (WHO standard) =====
const AGE_BUCKETS = [
  { label: '0-2 (Infant)',     years: 1  },
  { label: '3-12 (Child)',     years: 7  },
  { label: '13-17 (Teen)',     years: 15 },
  { label: '18-30 (Adult)',    years: 24 },
  { label: '31-50 (Adult)',    years: 40 },
  { label: '51-70 (Senior)',   years: 60 },
  { label: '71+ (Elderly)',    years: 78 },
  { label: 'Unknown',          years: null }
];

// ===== PRE-DEFINED COMPLAINT SHORTCUTS =====
const COMPLAINT_SHORTCUTS = [
  { label: 'RTA / Trauma',    value: 'RTA — Polytrauma',                icon: '🚗' },
  { label: 'Cardiac Arrest',  value: 'CARDIAC ARREST',                 icon: '❤️'  },
  { label: 'Stroke',          value: 'ACUTE STROKE',                   icon: '🧠' },
  { label: 'Unconscious',     value: 'UNRESPONSIVE / UNCONSCIOUS',     icon: '💤'  },
  { label: 'Burns',           value: 'BURNS — THERMAL / CHEMICAL',     icon: '🔥'  },
  { label: 'Poisoning',       value: 'POISONING / OVERDOSE',           icon: '☠️'  },
  { label: 'Fall',            value: 'FALL FROM HEIGHT',               icon: '🦴'  },
  { label: 'Assault / MLC',   value: 'ALLEGED ASSAULT — MLC',          icon: '⚖️'  },
  { label: 'Other Emergency', value: 'EMERGENCY — UNSPECIFIED',        icon: '🚨' }
];

const RapidTriageRegistration = ({ show, onHide, onTriageRegistered }) => {
  // ── Form State ─────────────────────────────────────────────────────────────
  const [gender, setGender]         = useState('Male');
  const [ageBucket, setAgeBucket]   = useState(AGE_BUCKETS[3]);  // default 18-30 Adult
  const [complaint, setComplaint]   = useState('');
  const [customComplaint, setCustomComplaint] = useState(false);
  const [isMLC, setIsMLC]           = useState(false);
  const [notes, setNotes]           = useState('');

  // ── Submission State ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleComplaintSelect = (value) => {
    setComplaint(value);
    setCustomComplaint(false);
  };

  const handleCustomComplaintChange = (e) => {
    setComplaint(e.target.value);
    setCustomComplaint(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!gender) {
      setError('Gender is required.');
      return;
    }

    if (!complaint.trim()) {
      setError('Please select or enter a chief complaint.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        gender,
        approximate_age: ageBucket.years,
        age_bucket_label: ageBucket.label,
        complaint: complaint.trim(),
        is_mlc: isMLC,
        notes: notes.trim() || null
      };

      const res = await api.post('/api/reception/rapid-triage', payload);
      const data = res.data?.data || res.data;

      setSuccess(data);

      // Notify parent (OPDReception) so it can refresh queues
      onTriageRegistered && onTriageRegistered(data);

      // Auto-close after 2 s so receptionist sees the provisional ID badge
      setTimeout(() => {
        setSuccess(null);
        setComplaint('');
        setNotes('');
        setIsMLC(false);
        onHide();
      }, 2000);

    } catch (err) {
      const msg = err.response?.data?.message || 'Rapid triage registration failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isDark = false;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <AlertTriangle size={22} />
          Rapid Triage Registration
          {isMLC && (
            <Badge bg="warning" text="dark" className="ms-2">
              <ShieldAlert size={14} className="me-1" />
              MLC
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Error banner */}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              <X size={16} className="me-2" />{error}
            </Alert>
          )}

          {/* Success confirmation */}
          {success && (
            <Alert variant="success" className="d-flex align-items-center gap-2">
              <Check size={20} />
              <div>
                <strong>Provisional ID Created:</strong>{' '}
                <code className="fs-5">{success.provisional_uhid || success.patient?.uhid}</code>
                <br />
                <small>Patient can now be treated. Full registration after stabilisation.</small>
              </div>
            </Alert>
          )}

          {/* Medical disclaimer */}
          <Card className="border-warning mb-4 bg-warning bg-opacity-10">
            <Card.Body className="py-2 d-flex align-items-center gap-2">
              <AlertTriangle size={20} className="text-warning flex-shrink-0" />
              <small className="text-muted">
                <strong>Emergency Protocol:</strong> Treatment starts immediately. Only minimum
                demographics are required now. Complete registration will be captured later.
              </small>
            </Card.Body>
          </Card>

          {/* ===== FORM FIELDS ===== */}

          {/* Gender — only required field alongside age */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <UserPlus size={16} className="me-1 text-danger" />
              Gender <span className="text-danger">*</span>
            </Form.Label>
            <div>
              <ToggleButtonGroup
                type="radio"
                name="gender"
                value={gender}
                onChange={(val) => setGender(val)}
                className="w-100"
              >
                <ToggleButton id="male"   variant="outline-primary" value="Male">   ♂ Male</ToggleButton>
                <ToggleButton id="female" variant="outline-primary" value="Female"> ♀ Female</ToggleButton>
                <ToggleButton id="other"  variant="outline-primary" value="Other">  ⚥ Other</ToggleButton>
              </ToggleButtonGroup>
            </div>
          </Form.Group>

          {/* Approximate Age */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <Clock size={16} className="me-1 text-danger" />
              Approximate Age
            </Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {AGE_BUCKETS.map((bucket) => (
                <Button
                  key={bucket.label}
                  variant={ageBucket.label === bucket.label ? 'danger' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setAgeBucket(bucket)}
                >
                  {bucket.label}
                </Button>
              ))}
            </div>
          </Form.Group>

          {/* Chief Complaint — shortcut chips */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <FileText size={16} className="me-1 text-danger" />
              Chief Complaint <span className="text-danger">*</span>
            </Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {COMPLAINT_SHORTCUTS.map((sc) => (
                <Button
                  key={sc.label}
                  variant={complaint === sc.value && !customComplaint ? 'danger' : 'outline-danger'}
                  size="sm"
                  onClick={() => handleComplaintSelect(sc.value)}
                >
                  {sc.icon} {sc.label}
                </Button>
              ))}
            </div>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Or type a custom complaint…"
              value={complaint}
              onChange={handleCustomComplaintChange}
              style={{ fontSize: '0.95rem' }}
            />
          </Form.Group>

          {/* MLC Toggle */}
          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              id="mlc-switch"
              label={
                <span className="fw-bold d-flex align-items-center gap-1">
                  <ShieldAlert size={16} className="text-warning" />
                  Medico-Legal Case (MLC)
                </span>
              }
              checked={isMLC}
              onChange={(e) => setIsMLC(e.target.checked)}
            />
            {isMLC && (
              <small className="text-danger d-block mt-1">
                ⚖️ MLC flag applied. Police intimation and forensic
                documentation will be triggered automatically.
              </small>
            )}
          </Form.Group>

          {/* Optional notes */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <FileText size={16} className="me-1" />
              Additional Notes (optional)
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Brought by, vitals at the gate, attached documents…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={submitting}
          >
            Close
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={submitting}
            size="lg"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-1" />
                Creating Provisional ID…
              </>
            ) : (
              <>
                <Zap size={18} className="me-1" />
                Generate Provisional ID &amp; Start Treatment
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RapidTriageRegistration;