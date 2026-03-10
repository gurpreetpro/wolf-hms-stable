/**
 * GovtSchemePanel - Doctor-facing panel for CGHS/ECHS/CAPF package lookup
 * Used inside DoctorDashboard as a tab
 * Phase H5: Cross-department integration
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, Form, Button, Table, Alert, Spinner } from 'react-bootstrap';
import { Shield, Search, Calculator, Building2 } from 'lucide-react';
import govtSchemeService from '../services/govtSchemeService';

const SCHEMES = [
  { code: 'cghs', name: 'CGHS', color: 'success', desc: 'Central Govt Health Scheme' },
  { code: 'echs', name: 'ECHS', color: 'primary', desc: 'Ex-Servicemen Health Scheme' },
  { code: 'capf', name: 'CAPF', color: 'warning', desc: 'Central Armed Police Forces' },
  { code: 'pmjay', name: 'PM-JAY', color: 'danger', desc: 'Ayushman Bharat' },
];

const GovtSchemePanel = ({ patient, admissionId }) => {
  const [selectedScheme, setSelectedScheme] = useState('cghs');
  const [packages, setPackages] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [hospitalConfig, setHospitalConfig] = useState({
    nabh: true,
    cityTier: 'X',
    wardType: 'semi_private',
    superSpecialty: false
  });

  // Fetch specialties on scheme change
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await govtSchemeService.getSpecialties(selectedScheme);
        setSpecialties(res.data?.specialties || res.specialties || []);
      } catch (err) {
        console.error('Failed to load specialties:', err);
        setSpecialties([]);
      }
    };
    fetchSpecialties();
  }, [selectedScheme]);

  // Fetch stats on scheme change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await govtSchemeService.getStats(selectedScheme);
        setStats(res.data || res);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };
    fetchStats();
  }, [selectedScheme]);

  // Search packages
  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSpecialty) params.specialty = selectedSpecialty;
      if (searchTerm) params.search = searchTerm;
      params.limit = 50;

      const res = await govtSchemeService.getPackages(selectedScheme, params);
      setPackages(res.data?.packages || res.packages || res.data || []);
    } catch (err) {
      console.error('Package search failed:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedScheme, selectedSpecialty, searchTerm]);

  // Auto-search on specialty change
  useEffect(() => {
    if (selectedSpecialty) handleSearch();
  }, [selectedSpecialty, handleSearch]);

  // Rate calculation for a specific package
  const handleCalculateRate = async (pkg) => {
    try {
      const code = pkg.package_code || pkg.code;
      const res = await govtSchemeService.getPackageRate(selectedScheme, code, hospitalConfig);
      setCalcResult({
        packageName: pkg.procedure_name || pkg.name,
        code,
        ...res.data || res
      });
    } catch (err) {
      console.error('Rate calculation error:', err);
    }
  };

  const schemeInfo = SCHEMES.find(s => s.code === selectedScheme);

  return (
    <div className="p-2">
      {/* Scheme Selector */}
      <Row className="mb-3 g-2">
        {SCHEMES.map(s => (
          <Col key={s.code} xs={6} md={3}>
            <Card
              className={`text-center border-0 shadow-sm h-100 ${selectedScheme === s.code ? `bg-${s.color} text-white` : ''}`}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => { setSelectedScheme(s.code); setPackages([]); setCalcResult(null); }}
            >
              <Card.Body className="py-2 px-1">
                <h6 className="mb-0 fw-bold">{s.name}</h6>
                <small style={{ fontSize: '0.7rem' }}>{s.desc}</small>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Stats Bar */}
      {stats && (
        <Row className="mb-3 g-2">
          <Col xs={4}>
            <Card className="text-center border-0 bg-light">
              <Card.Body className="py-2">
                <h5 className="mb-0 text-primary">{stats.totalPackages || stats.total || 0}</h5>
                <small className="text-muted">Total Packages</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={4}>
            <Card className="text-center border-0 bg-light">
              <Card.Body className="py-2">
                <h5 className="mb-0 text-success">{specialties.length}</h5>
                <small className="text-muted">Specialties</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={4}>
            <Card className="text-center border-0 bg-light">
              <Card.Body className="py-2">
                <h5 className="mb-0 text-warning">{stats.priceRange?.max ? `₹${(stats.priceRange.max / 1000).toFixed(0)}K` : 'N/A'}</h5>
                <small className="text-muted">Max Rate</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Hospital Config */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="py-2">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Building2 size={16} />
            <strong className="small">Hospital Configuration</strong>
          </div>
          <Row className="g-2">
            <Col xs={3}>
              <Form.Check
                type="switch"
                id="nabh-switch"
                label="NABH"
                checked={hospitalConfig.nabh}
                onChange={e => setHospitalConfig(c => ({ ...c, nabh: e.target.checked }))}
                className="small"
              />
            </Col>
            <Col xs={3}>
              <Form.Select
                size="sm"
                value={hospitalConfig.cityTier}
                onChange={e => setHospitalConfig(c => ({ ...c, cityTier: e.target.value }))}
              >
                <option value="X">Tier-I (Metro)</option>
                <option value="Y">Tier-II</option>
                <option value="Z">Tier-III</option>
              </Form.Select>
            </Col>
            <Col xs={3}>
              <Form.Select
                size="sm"
                value={hospitalConfig.wardType}
                onChange={e => setHospitalConfig(c => ({ ...c, wardType: e.target.value }))}
              >
                <option value="general">General Ward</option>
                <option value="semi_private">Semi-Private</option>
                <option value="private">Private</option>
              </Form.Select>
            </Col>
            <Col xs={3}>
              <Form.Check
                type="switch"
                id="super-spec-switch"
                label="Super Spec"
                checked={hospitalConfig.superSpecialty}
                onChange={e => setHospitalConfig(c => ({ ...c, superSpecialty: e.target.checked }))}
                className="small"
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Search & Filter */}
      <Row className="mb-3 g-2">
        <Col md={4}>
          <Form.Select
            size="sm"
            value={selectedSpecialty}
            onChange={e => setSelectedSpecialty(e.target.value)}
          >
            <option value="">All Specialties</option>
            {specialties.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6}>
          <Form.Control
            size="sm"
            type="text"
            placeholder={`Search ${schemeInfo?.name} packages...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </Col>
        <Col md={2}>
          <Button size="sm" variant={`outline-${schemeInfo?.color || 'primary'}`} className="w-100" onClick={handleSearch} disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : <><Search size={14} /> Search</>}
          </Button>
        </Col>
      </Row>

      {/* Rate Calculation Result */}
      {calcResult && (
        <Alert variant="success" dismissible onClose={() => setCalcResult(null)} className="py-2">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{calcResult.packageName}</strong> <Badge bg="secondary">{calcResult.code}</Badge>
            </div>
            <div className="text-end">
              <h4 className="mb-0 text-success">₹{Number(calcResult.finalRate || calcResult.baseRate || 0).toLocaleString('en-IN')}</h4>
              {calcResult.baseRate && calcResult.finalRate && calcResult.baseRate !== calcResult.finalRate && (
                <small className="text-muted text-decoration-line-through">₹{Number(calcResult.baseRate).toLocaleString('en-IN')}</small>
              )}
            </div>
          </div>
          {calcResult.modifiersApplied && calcResult.modifiersApplied.length > 0 && (
            <div className="mt-1">
              <small className="text-muted">Modifiers: {calcResult.modifiersApplied.map(m => `${m.name} (${m.factor}x)`).join(', ')}</small>
            </div>
          )}
        </Alert>
      )}

      {/* Package Results Table */}
      {packages.length > 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table hover responsive size="sm" className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Code</th>
                  <th>Procedure</th>
                  <th>Specialty</th>
                  <th>Base Rate</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, i) => (
                  <tr key={i}>
                    <td><code className="small">{pkg.package_code || pkg.code}</code></td>
                    <td>
                      <strong className="small">{pkg.procedure_name || pkg.name}</strong>
                      {pkg.inclusions && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{pkg.inclusions.substring(0, 60)}...</div>}
                    </td>
                    <td><Badge bg="info" className="small">{pkg.specialty}</Badge></td>
                    <td className="fw-bold text-success">₹{Number(pkg.base_rate || pkg.baseRate || 0).toLocaleString('en-IN')}</td>
                    <td><Badge bg={pkg.procedure_type === 'surgical' ? 'danger' : 'primary'} className="small">{pkg.procedure_type || 'N/A'}</Badge></td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-success"
                        className="py-0 px-1 me-1"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => handleCalculateRate(pkg)}
                        title="Calculate rate with modifiers"
                      >
                        <Calculator size={12} /> Calc
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ) : !loading && (
        <div className="text-center p-4 text-muted bg-light rounded">
          <Shield size={48} className="mb-3 opacity-25" />
          <h6>Select a specialty or search to view {schemeInfo?.name} packages</h6>
          <small>298 packages available across 24 specialties</small>
        </div>
      )}
    </div>
  );
};

export default GovtSchemePanel;
