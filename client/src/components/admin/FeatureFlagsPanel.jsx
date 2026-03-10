/**
 * Feature Flags Panel
 * [TITAN] Phase 4 Frontend - Admin Feature Management
 * 
 * Allows admins to toggle modules and apply subscription tiers
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Badge, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import { 
  Settings, 
  Lock, 
  Unlock, 
  Sparkles, 
  Smartphone, 
  Link, 
  Package,
  Save,
  RefreshCw,
  Crown,
  Building
} from 'lucide-react';
import adminService from '../../services/adminService';

const FeatureFlagsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState({});
  const [definitions, setDefinitions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getFeatures();
      if (response.success && response.data) {
        setFeatures(response.data.features || {});
        setDefinitions(response.data.definitions || []);
      } else {
        setFeatures(response.features || response);
        setDefinitions(response.definitions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (featureKey) => {
    setFeatures(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey]
    }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminService.updateFeatures(features);
      setSuccess('Features updated successfully!');
      setHasChanges(false);
    } catch (err) {
      setError(err.message || 'Failed to save features');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTier = async (tier) => {
    if (!window.confirm(`Apply ${tier} tier settings? This will update multiple features.`)) return;
    
    setSaving(true);
    try {
      const response = await adminService.applyTier(tier);
      if (response.success && response.data) {
        setFeatures(response.data);
      } else {
        setFeatures(response);
      }
      setSuccess(`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier applied!`);
      setHasChanges(false);
    } catch (err) {
      setError(err.message || 'Failed to apply tier');
    } finally {
      setSaving(false);
    }
  };

  // Group definitions by category
  const grouped = definitions.reduce((acc, def) => {
    const cat = def.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(def);
    return acc;
  }, {});

  const getCategoryIcon = (category) => {
    const icons = {
      Core: <Building size={18} />,
      Modules: <Package size={18} />,
      AI: <Sparkles size={18} />,
      Integrations: <Link size={18} />,
      Mobile: <Smartphone size={18} />
    };
    return icons[category] || <Settings size={18} />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      Core: '#6366f1',
      Modules: '#8b5cf6',
      AI: '#ec4899',
      Integrations: '#14b8a6',
      Mobile: '#f59e0b'
    };
    return colors[category] || '#64748b';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading features...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <Settings size={24} className="me-2" />
            Feature Management
          </h4>
          <p className="text-muted mb-0">
            Toggle modules and features for this hospital
          </p>
        </div>
        <ButtonGroup>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={fetchFeatures}
            disabled={saving}
          >
            <RefreshCw size={16} />
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? <Spinner size="sm" /> : <Save size={16} className="me-1" />}
            Save Changes
          </Button>
        </ButtonGroup>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tier Quick Apply */}
      <Card className="mb-4" style={{ borderLeft: '4px solid #f59e0b' }}>
        <Card.Body className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Crown size={20} color="#f59e0b" />
            <span className="fw-semibold">Quick Apply Subscription Tier</span>
          </div>
          <ButtonGroup>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => handleApplyTier('basic')}
              disabled={saving}
            >
              Basic
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => handleApplyTier('professional')}
              disabled={saving}
            >
              Professional
            </Button>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={() => handleApplyTier('enterprise')}
              disabled={saving}
            >
              Enterprise
            </Button>
          </ButtonGroup>
        </Card.Body>
      </Card>

      {/* Feature Grid by Category */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} className="mb-3" style={{ borderLeft: `4px solid ${getCategoryColor(category)}` }}>
          <Card.Header className="bg-white d-flex align-items-center gap-2">
            {getCategoryIcon(category)}
            <span className="fw-semibold">{category}</span>
            <Badge bg="light" text="dark" className="ms-auto">
              {items.filter(d => features[d.key]).length}/{items.length} enabled
            </Badge>
          </Card.Header>
          <Card.Body>
            <Row>
              {items.map(def => (
                <Col key={def.key} md={4} className="mb-3">
                  <div 
                    className="d-flex align-items-center justify-content-between p-2 rounded"
                    style={{ 
                      background: features[def.key] ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${features[def.key] ? '#86efac' : '#e2e8f0'}`
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      {def.locked ? (
                        <Lock size={14} color="#94a3b8" />
                      ) : (
                        <Unlock size={14} color="#22c55e" />
                      )}
                      <span className={def.locked ? 'text-muted' : ''}>
                        {def.name}
                      </span>
                    </div>
                    <Form.Check
                      type="switch"
                      checked={features[def.key] || false}
                      onChange={() => !def.locked && handleToggle(def.key)}
                      disabled={def.locked}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      ))}

      {/* If no definitions loaded, show raw features */}
      {definitions.length === 0 && Object.keys(features).length > 0 && (
        <Card>
          <Card.Header className="bg-white">
            <Settings size={18} className="me-2" />
            All Features
          </Card.Header>
          <Card.Body>
            <Row>
              {Object.entries(features).map(([key, value]) => (
                <Col key={key} md={4} className="mb-2">
                  <div className="d-flex align-items-center justify-content-between p-2 border rounded">
                    <span>{key}</span>
                    <Form.Check
                      type="switch"
                      checked={value || false}
                      onChange={() => handleToggle(key)}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default FeatureFlagsPanel;
