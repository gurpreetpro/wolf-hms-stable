/**
 * BillingWorkspace.jsx - Split Billing Editor
 * Line-item splitting with Indian Finance Rules (TDS, NME, Disallowances)
 * 
 * WOLF HMS - Beyond Gold Standard Architecture
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Split, Lock, AlertCircle, ShieldCheck, Save, RefreshCw, 
  Calculator, FileText, IndianRupee, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import api from '../../utils/axiosInstance';

// NME Items that cannot be billed to insurance (PMJAY/IRDAI Guidelines)
const NME_ITEMS = [
  'gloves', 'syringe', 'cotton', 'bandage', 'gauze', 'plaster',
  'registration', 'admission kit', 'room charges', 'diet charges',
  'attendant charges', 'food', 'nursing', 'documentation'
];

// Check if an item is NME
const isNME = (description) => {
  const lower = (description || '').toLowerCase();
  return NME_ITEMS.some(nme => lower.includes(nme));
};

export default function BillingWorkspace({ invoiceId, onSave, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [splitEntries, setSplitEntries] = useState([]);
  const [auditResult, setAuditResult] = useState(null);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch invoice and existing splits
  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/finance/invoice/${invoiceId}/split`);
      setInvoice(response.data.invoice);
      setLineItems(response.data.items || []);
      setSplitEntries(response.data.splits || []);
      setAuditResult(response.data.audit);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load invoice data' });
      // Mock data for development
      setInvoice({
        id: invoiceId || 1,
        invoice_number: 'INV-2026-001',
        patient_name: 'Rajesh Kumar',
        total_amount: 140000
      });
      setLineItems([
        { id: 1, description: 'Private Ward (Day 1-3)', quantity: 3, unit_price: 6000, total_price: 18000 },
        { id: 2, description: 'ICU Charges (Day 1-2)', quantity: 2, unit_price: 15000, total_price: 30000 },
        { id: 3, description: 'Surgeon Fee - Cardiac', quantity: 1, unit_price: 50000, total_price: 50000 },
        { id: 4, description: 'Anaesthesia', quantity: 1, unit_price: 15000, total_price: 15000 },
        { id: 5, description: 'Medicines & Consumables', quantity: 1, unit_price: 12000, total_price: 12000 },
        { id: 6, description: 'Nitrile Gloves (Box)', quantity: 2, unit_price: 400, total_price: 800 },
        { id: 7, description: 'Diet Charges', quantity: 3, unit_price: 500, total_price: 1500 },
        { id: 8, description: 'Registration & Documentation', quantity: 1, unit_price: 700, total_price: 700 },
        { id: 9, description: 'Lab Tests - Cardiac Panel', quantity: 1, unit_price: 8000, total_price: 8000 },
        { id: 10, description: 'ECG & Monitoring', quantity: 1, unit_price: 4000, total_price: 4000 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize splits from line items
  useEffect(() => {
    if (lineItems.length > 0 && splitEntries.length === 0) {
      const initialSplits = lineItems.map(item => {
        const nme = isNME(item.description);
        return {
          itemId: item.id,
          description: item.description,
          totalCost: item.total_price,
          patientShare: nme ? item.total_price : 0,
          insuranceShare: nme ? 0 : item.total_price,
          status: nme ? 'NME' : 'COVERED',
          reason: nme ? 'Non-Medical Expense' : '',
          locked: nme
        };
      });
      setSplitEntries(initialSplits);
    }
  }, [lineItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const insurance = splitEntries.reduce((acc, item) => acc + (item.insuranceShare || 0), 0);
    const patient = splitEntries.reduce((acc, item) => acc + (item.patientShare || 0), 0);
    const tds = insurance * 0.10; // 10% TDS
    const netReceivable = insurance - tds;
    const nmeTotal = splitEntries.filter(s => s.status === 'NME').reduce((acc, s) => acc + s.patientShare, 0);
    
    return { insurance, patient, tds, netReceivable, nmeTotal };
  }, [splitEntries]);

  // Handle patient share change - auto-calculate insurance share
  const handlePatientShareChange = (itemId, newValue) => {
    setSplitEntries(entries => entries.map(entry => {
      if (entry.itemId !== itemId || entry.locked) return entry;
      
      const parsedValue = Math.max(0, Math.min(entry.totalCost, Number(newValue) || 0));
      return {
        ...entry,
        patientShare: parsedValue,
        insuranceShare: entry.totalCost - parsedValue,
        status: parsedValue === entry.totalCost ? 'PATIENT_PAY' : 
                parsedValue > 0 ? 'PARTIAL' : 'COVERED'
      };
    }));
  };

  // Handle insurance share change - auto-calculate patient share
  const handleInsuranceShareChange = (itemId, newValue) => {
    setSplitEntries(entries => entries.map(entry => {
      if (entry.itemId !== itemId || entry.locked) return entry;
      
      const parsedValue = Math.max(0, Math.min(entry.totalCost, Number(newValue) || 0));
      return {
        ...entry,
        insuranceShare: parsedValue,
        patientShare: entry.totalCost - parsedValue,
        status: parsedValue === 0 ? 'PATIENT_PAY' : 
                parsedValue < entry.totalCost ? 'PARTIAL' : 'COVERED'
      };
    }));
  };

  // Run AI audit
  const handleRunAudit = async () => {
    try {
      const response = await api.post('/finance/invoice/audit', {
        invoiceId,
        items: splitEntries,
        totalAmount: totals.insurance
      });
      setAuditResult(response.data);
      setShowAuditDetails(true);
    } catch (error) {
      // Mock audit result for development
      setAuditResult({
        riskScore: 0.25,
        recommendation: 'REVIEW',
        flags: [
          { type: 'NME_VIOLATION', description: 'Diet Charges should not be billed to insurance' },
          { type: 'HIGH_VALUE', description: 'Total claim exceeds ₹1L - manual review recommended' }
        ],
        summary: '2 issues detected. Recommend manual review before submission.'
      });
      setShowAuditDetails(true);
    }
  };

  // Save split configuration
  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post(`/finance/invoice/${invoiceId}/split`, {
        splits: splitEntries,
        totals: {
          insuranceShare: totals.insurance,
          patientShare: totals.patient,
          tdsDeducted: totals.tds,
          netReceivable: totals.netReceivable
        }
      });
      setMessage({ type: 'success', text: 'Split configuration saved successfully' });
      onSave?.();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save split configuration' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white h-full flex items-center justify-center">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Split className="text-blue-600" /> Split Billing Editor
          </h2>
          <div className="text-xs text-slate-500 mt-1">
            {invoice?.patient_name} • {invoice?.invoice_number}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAudit}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 flex items-center gap-2"
          >
            <ShieldCheck size={14} /> WolfGuard Audit
          </button>
          <div className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded border">
            REF: {invoice?.invoice_number}
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {message.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Audit Result */}
      {auditResult && showAuditDetails && (
        <div className={`mx-4 mt-4 p-4 rounded-lg border ${
          auditResult.riskScore > 0.5 ? 'bg-rose-50 border-rose-200' :
          auditResult.riskScore > 0.2 ? 'bg-amber-50 border-amber-200' :
          'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className={
                auditResult.riskScore > 0.5 ? 'text-rose-600' :
                auditResult.riskScore > 0.2 ? 'text-amber-600' : 'text-emerald-600'
              } />
              <span className="font-bold text-sm">
                WolfGuard Audit - Risk Score: {Math.round(auditResult.riskScore * 100)}%
              </span>
            </div>
            <button onClick={() => setShowAuditDetails(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronUp size={16} />
            </button>
          </div>
          {auditResult.flags?.length > 0 && (
            <ul className="space-y-1 text-sm">
              {auditResult.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 text-amber-600" />
                  <span><strong>{flag.type}:</strong> {flag.description}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-sm">
            <strong>Recommendation:</strong> {auditResult.recommendation}
          </div>
        </div>
      )}

      {/* Split Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0">
            <tr>
              <th className="p-3 text-left border-b">Service / Item</th>
              <th className="p-3 text-right border-b w-28">Total</th>
              <th className="p-3 text-right bg-emerald-50 text-emerald-700 border-b border-emerald-100 border-l border-white w-32">
                Patient Pay
              </th>
              <th className="p-3 text-right bg-blue-50 text-blue-700 border-b border-blue-100 border-l border-white w-32">
                Insurer Pay
              </th>
              <th className="p-3 text-center border-b w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {splitEntries.map((entry) => (
              <tr key={entry.itemId} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-medium text-slate-700">
                  {entry.description}
                  {entry.status === 'CAPPED' && (
                    <div className="text-[10px] text-rose-500 flex items-center gap-1 mt-0.5">
                      <AlertCircle size={10} /> {entry.reason}
                    </div>
                  )}
                  {entry.status === 'NME' && (
                    <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded border">
                      NME
                    </span>
                  )}
                </td>
                <td className="p-3 text-right font-mono font-bold text-slate-700">
                  ₹{entry.totalCost.toLocaleString('en-IN')}
                </td>

                {/* Patient Input */}
                <td className="p-3 text-right bg-emerald-50/30 font-mono text-emerald-700 border-l border-slate-100">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-emerald-400">₹</span>
                    <input
                      type="number"
                      className="w-20 text-right bg-transparent border-b border-emerald-200 focus:border-emerald-500 outline-none transition-colors"
                      value={entry.patientShare}
                      onChange={(e) => handlePatientShareChange(entry.itemId, e.target.value)}
                      disabled={entry.locked}
                    />
                  </div>
                </td>

                {/* Insurance Input */}
                <td className="p-3 text-right bg-blue-50/30 font-mono text-blue-700 border-l border-slate-100">
                  {entry.locked ? (
                    <div className="flex justify-end opacity-50">
                      <Lock size={14} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-blue-400">₹</span>
                      <input
                        type="number"
                        className="w-20 text-right bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none transition-colors"
                        value={entry.insuranceShare}
                        onChange={(e) => handleInsuranceShareChange(entry.itemId, e.target.value)}
                      />
                    </div>
                  )}
                </td>

                {/* Status */}
                <td className="p-3 text-center">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    entry.status === 'NME' ? 'bg-slate-100 text-slate-600' :
                    entry.status === 'COVERED' ? 'bg-blue-100 text-blue-700' :
                    entry.status === 'PATIENT_PAY' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer with Totals */}
          <tfoot className="bg-slate-50 text-slate-700 font-bold border-t-2 border-slate-200">
            <tr>
              <td className="p-3 text-right" colSpan={2}>SUBTOTAL</td>
              <td className="p-3 text-right text-emerald-700 font-mono">
                ₹{totals.patient.toLocaleString('en-IN')}
              </td>
              <td className="p-3 text-right text-blue-700 font-mono">
                ₹{totals.insurance.toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
            <tr className="text-xs text-slate-500">
              <td className="p-2 text-right" colSpan={2}>
                <span className="flex items-center justify-end gap-1">
                  <Info size={12} /> NME (Non-Medical Expenses)
                </span>
              </td>
              <td className="p-2 text-right text-slate-500 font-mono">
                ₹{totals.nmeTotal.toLocaleString('en-IN')}
              </td>
              <td className="p-2 text-right text-slate-400">—</td>
              <td></td>
            </tr>
            <tr className="text-xs text-slate-500">
              <td className="p-2 text-right" colSpan={3}>Less: Estimated TDS (10%)</td>
              <td className="p-2 text-right text-rose-600 font-mono">
                - ₹{totals.tds.toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
            <tr className="bg-blue-50/50">
              <td className="p-4 text-right font-bold" colSpan={3}>NET RECEIVABLE (Insurer)</td>
              <td className="p-4 text-right text-blue-800 text-lg font-mono">
                ₹{totals.netReceivable.toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          <span className="font-bold">{splitEntries.length}</span> line items •
          <span className="text-emerald-600 font-bold ml-2">Patient: ₹{totals.patient.toLocaleString('en-IN')}</span> •
          <span className="text-blue-600 font-bold ml-2">Insurance: ₹{totals.netReceivable.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Split Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
