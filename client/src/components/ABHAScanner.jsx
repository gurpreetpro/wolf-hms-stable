/**
 * ABHAScanner Component
 * WOLF HMS — Reception/OPD Registration Pipeline Upgrade
 *
 * Provides a UI for scanning an ABHA QR code (mocked as a text-input scan)
 * to instantly auto-fill the patient registration form.
 *
 * Integrates with PatientRegistrationModal via the onAutoFill callback.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Card, Badge, ListGroup, InputGroup } from 'react-bootstrap';
import { QrCode, Shield, Check, X, Search, User, Calendar, Smartphone, MapPin, Loader2, ScanLine, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../utils/axiosInstance';

const ABHAScanner = ({ show, onHide, onAutoFill }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'camera'
  const [abhaNumber, setAbhaNumber] = useState('');
  const [qrRawData, setQrRawData] = useState(''); // simulated QR payload
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null); // verified ABHA profile
  const [fillSuccess, setFillSuccess] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setAbhaNumber('');
    setQrRawData('');
    setError(null);
    setProfile(null);
    setFillSuccess(false);
    setScanMode('manual');
  }, []);

  const formatABHA = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
  };

  // ── Parse QR mock payload ──────────────────────────────────────────────────
  // In production this would come from a camera scanner library.
  // For now the receptionist pastes the raw JSON string printed on an ABHA card
  // and we extract the ABHA number + basic demographics.

  const parseQRPayload = (raw) => {
    try {
      const parsed = JSON.parse(raw);
      // ABHA QR codes carry a structure like:
      // { "hid": "XX-XXXX-XXXX-XXXX", "name": "...", "dob": "...", "gender": "...", … }
      const hid = parsed.hid || parsed.abhaNumber || parsed.healthId || '';
      const name = parsed.name || '';
      const dob = parsed.dob || parsed.dateOfBirth || '';
      const gender = parsed.gender || '';
      const phone = parsed.phone || parsed.mobile || '';
      const address = parsed.address || '';
      return { hid, name, dob, gender, phone, address, raw: parsed };
    } catch (_) {
      // Not JSON — treat as plain ABHA number
      return { hid: raw.replace(/\s/g, ''), name: '', dob: '', gender: '', phone: '', address: '', raw: {} };
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleABHAChange = (e) => {
    setAbhaNumber(formatABHA(e.target.value));
    setError(null);
  };

  const handleQRChange = (e) => {
    setQrRawData(e.target.value);
    setError(null);
  };

  /** Simulate "scanning" the QR payload */
  const handleSimulateScan = () => {
    if (!qrRawData.trim()) {
      setError('Paste ABHA QR payload or enter an ABHA number manually.');
      return;
    }

    const { hid, name, dob, gender, phone, address } = parseQRPayload(qrRawData);
    if (hid) {
      setAbhaNumber(formatABHA(hid));
    }

    // If the QR payload already carries demographic data, pre-fill profile
    // immediately — no server round-trip needed for basic auto-fill.
    if (name || dob || gender || phone) {
      setProfile({
        valid: true,
        name,
        dateOfBirth: dob,
        gender,
        mobile: phone,
        address,
        healthId: hid,
        verifiedFromQR: true
      });
    }
  };

  /** Verify ABHA against server */
  const handleVerify = async () => {
    const digits = abhaNumber.replace(/\D/g, '');
    if (digits.length !== 14) {
      setError('ABHA number must be 14 digits.');
      return;
    }

    setVerifying(true);
    setError(null);
    setProfile(null);

    try {
      const res = await api.post('/api/reception/abha/init-verify', {
        abha_number: abhaNumber
      });
      // Expected response: { success: true, data: { valid, profile: { name, dob, gender, phone, address, healthId, kycVerified } } }
      const data = res.data?.data || res.data;
      if (data && data.valid) {
        setProfile(data.profile || data);
      } else {
        setError(data?.message || 'ABHA number not recognised. Please check and retry.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  /** Push the verified/scanned profile into the registration form */
  const handleAutoFill = () => {
    if (!profile) return;

    const patientFields = {
      name: profile.name || '',
      dob: profile.dateOfBirth || '',
      gender: profile.gender || 'Male',
      phone: profile.mobile || profile.phone || '',
      address: profile.address || '',
      abhaNumber: profile.healthId || abhaNumber.replace(/\D/g, ''),
      abhaVerified: !!profile.valid,
      source: 'ABHA_SCAN'
    };

    onAutoFill && onAutoFill(patientFields);
    setFillSuccess(true);

    // Auto-close after a short delay so the receptionist sees the success badge
    setTimeout(() => {
      reset();
      onHide();
    }, 1200);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isDark = false; // can inherit from parent in the future

  return (
    <Modal show={show} onHide={() => { reset(); onHide(); }} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <Shield size={22} />
          ABHA Quick Scan
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Error banner */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <X size={16} className="me-2" />{error}
          </Alert>
        )}

        {fillSuccess && (
          <Alert variant="success">
            <Check size={16} className="me-2" />
            Patient details auto-filled from ABHA. Closing scanner…
          </Alert>
        )}

        {/* Mode toggle */}
        <div className="d-flex gap-2 mb-4">
          <Button
            variant={scanMode === 'manual' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => { setScanMode('manual'); setError(null); }}
          >
            <QrCode size={16} className="me-1" /> Enter ABHA Manually
          </Button>
          <Button
            variant={scanMode === 'camera' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => { setScanMode('camera'); setError(null); }}
          >
            <ScanLine size={16} className="me-1" /> Simulate QR Scan
          </Button>
        </div>

        {/* MANUAL ENTRY MODE */}
        {scanMode === 'manual' && (
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  <Shield size={16} className="me-1 text-primary" />
                  ABHA Number
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text><Shield size={18} /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="XX-XXXX-XXXX-XXXX"
                    value={abhaNumber}
                    onChange={handleABHAChange}
                    maxLength={17}
                    style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={handleVerify}
                    disabled={verifying || abhaNumber.replace(/\D/g, '').length < 14}
                  >
                    {verifying ? (
                      <><Spinner size="sm" className="me-1" /> Verifying</>
                    ) : (
                      <><Search size={16} className="me-1" /> Verify</>
                    )}
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">
                  Enter the 14-digit ABHA (Ayushman Bharat Health Account) number printed on the patient's card.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        )}

        {/* SIMULATE QR SCAN MODE */}
        {scanMode === 'camera' && (
          <Row>
            <Col md={12}>
              <Card className="border-dashed mb-3 bg-light">
                <Card.Body className="text-center py-4">
                  <ScanLine size={48} className="text-muted mb-2" />
                  <h6>Simulate QR Code Scan</h6>
                  <p className="text-muted small mb-3">
                    Paste the raw ABHA QR payload (JSON) to simulate a real
                    scanner read. In production this is triggered by a barcode
                    gun or camera SDK.
                  </p>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder={'{\n  "hid": "XX-XXXX-XXXX-XXXX",\n  "name": "Ramesh Kumar",\n  "dob": "1985-06-15",\n  "gender": "Male",\n  "phone": "9876543210",\n  "address": "12, MG Road, Mumbai"\n}'}
                    value={qrRawData}
                    onChange={handleQRChange}
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={handleSimulateScan}
                    disabled={!qrRawData.trim()}
                  >
                    <Loader2 size={16} className="me-1" />
                    Parse & Auto-Fill
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* VERIFIED PROFILE CARD */}
        {profile && profile.valid && (
          <Card className="border-success mt-3">
            <Card.Header className="bg-success text-white d-flex align-items-center gap-2">
              <Check size={18} />
              <strong>ABHA Verified</strong>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {profile.name && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <User size={16} className="text-muted" />
                    <span className="text-muted" style={{ width: 100 }}>Name</span>
                    <strong>{profile.name}</strong>
                  </ListGroup.Item>
                )}
                {profile.dateOfBirth && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <Calendar size={16} className="text-muted" />
                    <span className="text-muted" style={{ width: 100 }}>Date of Birth</span>
                    <span>{profile.dateOfBirth}</span>
                  </ListGroup.Item>
                )}
                {profile.gender && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <User size={16} className="text-muted" />
                    <span className="text-muted" style={{ width: 100 }}>Gender</span>
                    <span>{profile.gender}</span>
                  </ListGroup.Item>
                )}
                {profile.mobile && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <Smartphone size={16} className="text-muted" />
                    <span className="text-muted" style={{ width: 100 }}>Mobile</span>
                    <span>{profile.mobile}</span>
                  </ListGroup.Item>
                )}
                {profile.address && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <MapPin size={16} className="text-muted" />
                    <span className="text-muted" style={{ width: 100 }}>Address</span>
                    <span>{profile.address}</span>
                  </ListGroup.Item>
                )}
                {profile.healthId && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <Shield size={16} className="text-success" />
                    <span className="text-muted" style={{ width: 100 }}>Health ID</span>
                    <code>{profile.healthId}</code>
                  </ListGroup.Item>
                )}
                {profile.kycVerified !== undefined && (
                  <ListGroup.Item className="d-flex align-items-center gap-2">
                    <Check size={16} className={profile.kycVerified ? 'text-success' : 'text-warning'} />
                    <span className="text-muted" style={{ width: 100 }}>KYC</span>
                    <Badge bg={profile.kycVerified ? 'success' : 'warning'}>
                      {profile.kycVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => { reset(); onHide(); }}
        >
          Cancel
        </Button>
        {profile && profile.valid && (
          <Button
            variant="success"
            onClick={handleAutoFill}
          >
            <Check size={16} className="me-1" />
            Auto-Fill Registration Form
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ABHAScanner;