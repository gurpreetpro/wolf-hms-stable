import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Activity, Plus, MoreVertical, 
  Shield, Play, Globe, Server, Database, LogOut
} from 'lucide-react';
import axios from 'axios';

const PlatformDashboard = () => {
  const [activeTab, setActiveTab] = useState('fleet');
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deployModal, setDeployModal] = useState(false);
  const [deployForm, setDeployForm] = useState({
    hospital_name: '',
    hospital_domain: '',
    admin_email: '',
    admin_password: '', // In real app, auto-generate or email link
    plan: 'standard'
  });

  // Define fetchData first
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (activeTab === 'fleet') {
        const res = await axios.get('/api/platform/tenants', config);
        setTenants(res.data.data || []);
      }
      
      // Always fetch health stats
      const healthRes = await axios.get('/api/platform/health', config);
      setStats(healthRes.data.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch platform data', err);
      setLoading(false);
    }
  };

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, [activeTab]); // fetchData is stable (or could be wrapped in useCallback, but this is fine for now)

  const handleDeploy = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/platform/deploy', deployForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Deployment Successful!');
      setDeployModal(false);
      fetchData();
    } catch (err) {
      alert('Deployment Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleTeleport = async (hospitalId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/platform/teleport', { target_hospital_id: hospitalId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // In a real scenario, we might redirect to the tenant's domain with a token in URL
      // For this MVP (all on one domain diff hospitals), we just verify getting the token
      console.log('Teleport Token:', res.data.data.token);
      alert(`Teleport Ready! Token generated for ${res.data.data.redirect_domain}. (Check Console)`);
    } catch (err) {
      alert('Teleport Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="p-10 text-white">Loading Command Centre...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Bar */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <Shield className="text-emerald-400 h-8 w-8" />
            <div>
                <h1 className="text-xl font-bold tracking-tight">Wolf Platform <span className="text-emerald-400">Command Centre</span></h1>
                <p className="text-xs text-slate-400">Master Control Plane v1.0</p>
            </div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>RPM: {stats?.active_requests_rpm || 0}</span>
            </div>
             <div className="flex gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                <Database className="h-4 w-4 text-blue-500" />
                <span>DB Connections: {stats?.db_connections || 0}</span>
            </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-2">
            <button 
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fleet' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-slate-900 text-slate-400'}`}
            >
                <Globe className="h-4 w-4" /> Global Fleet
            </button>
            <button 
                onClick={() => setActiveTab('health')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'health' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-slate-900 text-slate-400'}`}
            >
                <Server className="h-4 w-4" /> System Health
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-slate-900 text-slate-400'}`}
            >
                <Activity className="h-4 w-4" /> Live Logs
            </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-900">
            
            {/* Fleet View */}
            {activeTab === 'fleet' && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-emerald-400" /> Active Tenants
                            <span className="text-sm font-normal text-slate-500 ml-2">({stats?.total_hospitals} deployed)</span>
                        </h2>
                        <button 
                            onClick={() => setDeployModal(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <Plus className="h-4 w-4" /> Deploy New Hospital
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tenants.map(tenant => (
                            <div key={tenant.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className=" bg-slate-900/50 p-3 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
                                        <Building2 className="h-6 w-6 text-indigo-400" />
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {tenant.status.toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-100">{tenant.hospital_name}</h3>
                                <p className="text-sm text-slate-500 mb-4">{tenant.hospital_domain}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-900 rounded p-2 text-center">
                                        <div className="text-xs text-slate-500">Users</div>
                                        <div className="text-lg font-bold text-slate-300">{tenant.user_count}</div>
                                    </div>
                                    <div className="bg-slate-900 rounded p-2 text-center">
                                        <div className="text-xs text-slate-500">Patients</div>
                                        <div className="text-lg font-bold text-slate-300">{tenant.patient_count}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <button 
                                        onClick={() => handleTeleport(tenant.id)}
                                        className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-2 rounded-lg text-sm font-medium border border-indigo-500/20 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" /> Access Dashboard
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Health Tab - System Metrics */}
            {activeTab === 'health' && (
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                        <Server className="h-6 w-6 text-emerald-400" /> System Health
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hospitals</div>
                            <div className="text-3xl font-bold text-white">{stats?.total_hospitals || 0}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Users</div>
                            <div className="text-3xl font-bold text-white">{stats?.total_users || 0}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Patients</div>
                            <div className="text-3xl font-bold text-white">{stats?.total_patients || 0}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Uptime</div>
                            <div className="text-3xl font-bold text-emerald-400">
                                {stats?.server_uptime ? Math.floor(stats.server_uptime / 60) + 'm' : '0m'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-sm font-medium text-slate-400 mb-4">Request Throughput</h3>
                            <div className="flex items-end gap-4">
                                <div className="text-4xl font-bold text-blue-400">{stats?.active_requests_rpm || 0}</div>
                                <div className="text-sm text-slate-500 pb-1">req/min</div>
                            </div>
                            <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width: `${Math.min((stats?.active_requests_rpm || 0) / 20, 100)}%`}}></div>
                            </div>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-sm font-medium text-slate-400 mb-4">Database Connections</h3>
                            <div className="flex items-end gap-4">
                                <div className="text-4xl font-bold text-indigo-400">{stats?.db_connections || 0}</div>
                                <div className="text-sm text-slate-500 pb-1">active</div>
                            </div>
                            <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{width: `${Math.min((stats?.db_connections || 0) * 10, 100)}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Tab - Placeholder */}
            {activeTab === 'logs' && (
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                        <Activity className="h-6 w-6 text-emerald-400" /> Live Logs
                    </h2>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 h-96 overflow-y-auto">
                        <p className="text-emerald-400">[INFO] Platform Command Centre initialized</p>
                        <p>[INFO] Connected to PostgreSQL database</p>
                        <p>[INFO] {stats?.total_hospitals || 0} hospitals registered</p>
                        <p>[INFO] Server uptime: {stats?.server_uptime ? Math.floor(stats.server_uptime) + 's' : '0s'}</p>
                        <p className="text-slate-600 mt-4">--- Real-time log streaming requires WebSocket integration ---</p>
                    </div>
                </div>
            )}

             {/* Deploy Modal */}
             {deployModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-950">
                            <h3 className="text-xl font-bold text-white">Deploy New Tenant</h3>
                            <p className="text-sm text-slate-400">Provision a new hospital environment</p>
                        </div>
                        <form onSubmit={handleDeploy} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Hospital Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={deployForm.hospital_name}
                                    onChange={e => setDeployForm({...deployForm, hospital_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Domain (e.g., city-hospital.wolfhms.com)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={deployForm.hospital_domain}
                                    onChange={e => setDeployForm({...deployForm, hospital_domain: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={deployForm.admin_email}
                                        onChange={e => setDeployForm({...deployForm, admin_email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Initial Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={deployForm.admin_password}
                                        onChange={e => setDeployForm({...deployForm, admin_password: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setDeployModal(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium transition-colors"
                                >
                                    Deploy Tenant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             )}

        </main>
      </div>
    </div>
  );
};

export default PlatformDashboard;
