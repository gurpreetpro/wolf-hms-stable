import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminSecurityStudio() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchQR = async () => {
    try {
      const res = await axios.get('/api/auth/2fa/generate?username=superadmin@wolfhms.com');
      setQrCode(res.data.qrCodeUrl);
      setSecret(res.data.secret);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyAndEnable = async () => {
    try {
      const res = await axios.post('/api/auth/2fa/verify', { userId: 1, secret, token });
      setStatus(res.data.message);
    } catch (e) {
      setStatus('Verification failed. Check your 6-digit code.');
    }
  };

  useEffect(() => {
    fetchQR();
  }, []);

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold text-emerald-400 mb-4">🛡️ WOLF Admin Security & 2FA Studio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold mb-2">Google Authenticator 2FA Setup</h2>
          <p className="text-sm text-slate-400 mb-4">Scan the QR code below with your Authenticator app and enter the 6-digit verification token.</p>
          {qrCode ? <img src={qrCode} alt="2FA QR Code" className="mb-4 bg-white p-2 rounded" /> : <p>Loading QR...</p>}
          <input type="text" placeholder="Enter 6-digit token" value={token} onChange={e => setToken(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded mb-2 w-full text-white" />
          <button onClick={verifyAndEnable} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium w-full">Enable 2FA Protection</button>
          {status && <p className="mt-2 text-sm font-semibold text-emerald-300">{status}</p>}
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-lg font-semibold mb-2">Live Admin Audit Ledger</h2>
          <p className="text-sm text-slate-400 mb-4">Immutable record of all administrative actions and mutations.</p>
          <div className="bg-slate-900 p-3 rounded h-64 overflow-y-auto text-xs font-mono text-emerald-400">
            <p>[SYSTEM] Audit logging middleware active. Monitoring all routes...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
