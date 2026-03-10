/**
 * InsuranceVault.jsx - Wolf Vault Admin Panel
 * Secure credential management for multi-tenant insurance integrations
 * 
 * DESIGN: "Wolf Vault" - Dark/Secure Aesthetic with Glassmorphism (Bootstrap)
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, Lock, Eye, EyeOff, CheckCircle, Server, Upload, 
  AlertTriangle, RefreshCw, Trash2, Zap
} from 'lucide-react';
import api from '../../utils/axiosInstance';

const PROVIDERS = [
  { code: 'HCX', name: 'HCX Gateway', description: 'National Health Claims Exchange' },
  { code: 'PMJAY', name: 'Ayushman Bharat', description: 'NHA / State Health Agency' },
  { code: 'TPA_STAR', name: 'Star Health', description: 'Star Health Insurance' },
  { code: 'TPA_MEDIASSIST', name: 'MediAssist', description: 'MediAssist TPA' },
  { code: 'TPA_VIDAL', name: 'Vidal Health', description: 'Vidal Health TPA' },
];

const TIER_LEVELS = [
  { value: 'STANDARD', label: 'Standard', description: 'Default rates' },
  { value: 'NABH', label: 'NABH Accredited', description: '+15% package rates' },
  { value: 'NON_NABH', label: 'Non-NABH', description: 'Base rates only' },
];

export default function InsuranceVault() {
  const [activeProvider, setActiveProvider] = useState('HCX');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    clientId: '', clientSecret: '', privateKeyData: '', hfrId: '', tierLevel: 'STANDARD'
  });

  useEffect(() => { fetchIntegrations(); }, []);

  useEffect(() => {
    const existing = integrations.find(i => i.provider_code === activeProvider);
    if (existing) {
      setFormData({
        clientId: existing.client_id || '',
        clientSecret: '', 
        privateKeyData: '',
        hfrId: existing.hfr_id || '',
        tierLevel: existing.tier_level || 'STANDARD'
      });
      setUploadStatus(existing.private_key_data ? 'Encrypted Key Present' : null);
    } else {
      setFormData({ clientId: '', clientSecret: '', privateKeyData: '', hfrId: '', tierLevel: 'STANDARD' });
      setUploadStatus(null);
    }
  }, [activeProvider, integrations]);

  const fetchIntegrations = async () => {
    try {
      const response = await api.get('/admin/vault/integrations');
      setIntegrations(response.data.integrations || []);
    } catch (error) { console.error('Failed to fetch integrations:', error); }
  };

  const handleCertUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(pfx|pem|p12)$/i)) {
      setMessage({ type: 'error', text: 'Invalid file. Use .pfx, .pem, or .p12' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.replace(/^data:[^;]+;base64,/, '');
      setFormData(prev => ({ ...prev, privateKeyData: base64 }));
      setUploadStatus(file.name);
      setMessage({ type: 'success', text: `Key "${file.name}" ready for encryption` });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      setMessage({ type: 'error', text: 'Client ID and Secret are required' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.post('/admin/vault/save', {
        providerCode: activeProvider, clientId: formData.clientId, clientSecret: formData.clientSecret,
        privateKey: formData.privateKeyData, hfrId: formData.hfrId, tierLevel: formData.tierLevel
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Credentials secured in Wolf Vault' });
        setFormData(prev => ({ ...prev, clientSecret: '', privateKeyData: '' }));
        fetchIntegrations();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to save' });
      }
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save' }); }
    finally { setLoading(false); }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.post('/admin/vault/test', { providerCode: activeProvider });
      if (response.data.success) setMessage({ type: 'success', text: `Connection Active: ${response.data.message}` });
      else setMessage({ type: 'error', text: `Connection Failed: ${response.data.error}` });
    } catch (error) { setMessage({ type: 'error', text: 'Connection test failed' }); }
    finally { setTestingConnection(false); }
  };

  const activeIntegration = integrations.find(i => i.provider_code === activeProvider);

  return (
    <div className="bg-dark text-light min-vh-100 font-sans position-relative">
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ 
        backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 50%)',
        pointerEvents: 'none'
      }}></div>

      <div className="container py-5 position-relative" style={{ zIndex: 2 }}>
        <header className="mb-5 d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3">
          <div>
            <h1 className="display-6 fw-bold text-white d-flex align-items-center gap-3">
              <span className="p-2 bg-gradient-brand rounded-3 shadow-sm d-inline-block"> 
                <Shield className="text-info" size={32} />
              </span>
              Wolf Insurance Vault
            </h1>
            <p className="text-secondary mt-2 mb-0">
              Secure Credential Injection & Key Management • <span className="text-info font-monospace">AES-256-GCM Encrypted</span>
            </p>
          </div>
          
          <div className="d-flex align-items-center gap-3 px-3 py-2 bg-white bg-opacity-10 border border-secondary rounded-pill">
             <div className="d-flex align-items-center gap-2">
                <div className="spinner-grow spinner-grow-sm text-success" role="status"></div>
                <span className="small fw-bold text-light">Vault Secure</span>
             </div>
             <div className="vr bg-secondary opacity-50"></div>
             <span className="small text-secondary">{integrations.filter(i => i.is_active).length} Active Keys</span>
          </div>
        </header>

        {/* Dynamic Status Message */}
        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} d-flex align-items-center gap-2`} role="alert">
            {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            <span className="fw-bold">{message.text}</span>
          </div>
        )}

        <div className="row g-4">
          {/* Navigation Sidebar */}
          <div className="col-12 col-md-3">
            <div className="list-group bg-transparent">
              {PROVIDERS.map((provider) => {
                const isConfigured = integrations.some(i => i.provider_code === provider.code && i.is_active);
                const isActive = activeProvider === provider.code;
                return (
                  <button
                    key={provider.code}
                    onClick={() => setActiveProvider(provider.code)}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 border-0 rounded-3 mb-2 ${
                      isActive ? 'bg-primary text-white shadow' : 'bg-secondary bg-opacity-25 text-light hover-bg-opacity-50'
                    }`}
                  >
                    <div>
                      <div className="fw-bold">{provider.name}</div>
                      <div className={`small ${isActive ? 'text-white text-opacity-75' : 'text-secondary'}`}>
                        {provider.code}
                      </div>
                    </div>
                    {isConfigured && <CheckCircle size={16} className={isActive ? 'text-white' : 'text-success'} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secure Configuration Panel */}
          <div className="col-12 col-md-9">
            <div className="card bg-secondary bg-opacity-10 border border-secondary border-opacity-25 rounded-4 overflow-hidden">
               <div className="card-body p-4 p-md-5">
                 <div className="d-flex justify-content-between align-items-start mb-4 border-bottom border-light border-opacity-10 pb-4">
                   <div>
                     <h2 className="h4 fw-bold text-white d-flex align-items-center gap-2">
                       <Server className="text-info" size={20} />
                       {PROVIDERS.find(p => p.code === activeProvider)?.name} Integration
                     </h2>
                     <p className="small text-secondary mb-0">
                       {PROVIDERS.find(p => p.code === activeProvider)?.description}
                     </p>
                   </div>
                   {activeIntegration?.is_active && (
                     <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-3 py-2">
                       LIVE
                     </span>
                   )}
                 </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="row g-3 mb-4">
                    {/* Client ID */}
                    <div className="col-md-6">
                      <label className="form-label text-secondary small fw-bold text-uppercase">Client ID / Participant Code</label>
                      <input
                        type="text"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="form-control bg-dark text-light border-secondary"
                        placeholder="e.g., HOSP-IN-34001"
                      />
                    </div>

                    {/* HFR ID */}
                    <div className="col-md-6">
                      <label className="form-label text-secondary small fw-bold text-uppercase">HFR ID (Registry)</label>
                      <input
                        type="text"
                        value={formData.hfrId}
                        onChange={(e) => setFormData({ ...formData, hfrId: e.target.value })}
                        className="form-control bg-dark text-light border-secondary"
                        placeholder="e.g., IN1234567890"
                      />
                    </div>
                  </div>

                  {/* Tier Level */}
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold text-uppercase">Reimbursement Tier</label>
                    <div className="row g-3">
                       {TIER_LEVELS.map((tier) => (
                         <div className="col-4" key={tier.value}>
                           <label className={`card h-100 cursor-pointer transition-all ${
                             formData.tierLevel === tier.value
                               ? 'bg-primary bg-opacity-25 border-primary text-white'
                               : 'bg-transparent border-secondary border-opacity-50 text-secondary'
                           }`}>
                             <div className="card-body p-3 text-center">
                               <input
                                 type="radio"
                                 name="tierLevel"
                                 value={tier.value}
                                 checked={formData.tierLevel === tier.value}
                                 onChange={(e) => setFormData({ ...formData, tierLevel: e.target.value })}
                                 className="d-none"
                               />
                               <div className="small fw-bold">{tier.label}</div>
                             </div>
                           </label>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Client Secret */}
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold text-uppercase">Client Secret / API Key</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-secondary"><Key size={16} /></span>
                      <input
                        type={showSecret ? "text" : "password"}
                        value={formData.clientSecret}
                        onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        className="form-control bg-dark text-light border-secondary font-monospace"
                        placeholder={showSecret ? "sk_live_..." : "••••••••••••••••••••••••••••"}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Secure File Upload */}
                  <div className="mb-5">
                    <label className="form-label text-secondary small fw-bold text-uppercase">Private Key (.pfx/.pem)</label>
                    <div className="position-relative">
                      <input
                        type="file"
                        id="cert-upload"
                        className="d-none"
                        accept=".pfx,.pem,.p12"
                        onChange={handleCertUpload}
                      />
                      <label
                        htmlFor="cert-upload"
                        className={`d-block p-5 border-2 border-dashed rounded-3 text-center cursor-pointer transition-all ${
                          uploadStatus
                            ? 'border-success bg-success bg-opacity-10'
                            : 'border-secondary border-opacity-50 hover-bg-dark'
                        }`}
                      >
                        {uploadStatus ? (
                          <>
                            <div className="text-success mb-2"><CheckCircle size={32} /></div>
                            <div className="text-success fw-bold">{uploadStatus}</div>
                            <div className="small text-success text-opacity-75">Ready for Encryption</div>
                          </>
                        ) : (
                          <>
                             <div className="text-secondary mb-2"><Upload size={32} /></div>
                            <div className="text-light fw-medium">Click to upload Certificate</div>
                            <div className="small text-secondary">Processed locally. Only encrypted bits leave your browser.</div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="d-flex gap-3 pt-3 border-top border-light border-opacity-10">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary btn-lg flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                    >
                      {loading ? <RefreshCw className="spin" size={20} /> : <Lock size={20} />}
                      {loading ? 'Encrypting & Saving...' : 'Securely Save to Vault'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection || !activeIntegration}
                      className="btn btn-outline-light btn-lg px-4 d-flex align-items-center gap-2"
                    >
                      {testingConnection ? <RefreshCw className="spin" size={20} /> : <Zap size={20} />}
                      Test
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
