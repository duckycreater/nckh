import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Gift, Plus, Trash, LogOut, BarChart3, Search, Shield, AlertTriangle, RefreshCw, UserCog, FlaskConical, Eye, Trash2, Ban, Zap, Activity } from 'lucide-react';
import { User, RewardItem } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

interface AdminStats {
  total: number;
  admins: number;
  activeUsers: number;
  researchActive7d?: number;
  researchActive1d?: number;
  experimentCount?: number;
}

interface UserDetail {
  nick: string;
  name: string;
  account_id: string;
  points: number;
  role?: string;
  profile?: any;
  interventions?: any[];
  decay?: any;
}

export function AdminDashboard({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'users' | 'experiments'>('overview');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // User management
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Experiments
  const [experiments, setExperiments] = useState<any[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [newExp, setNewExp] = useState({ id: '', name: '', description: '', groups: [{ name: 'control', description: 'No intervention', ratio: 0.25 }] });
  const [showNewExp, setShowNewExp] = useState(false);

  // New reward state
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({
    name: '', desc: '', cost: 1000, imageUrl: '',
    ingredients: 'Quà tặng,E-Voucher',
    color: 'from-amber-400 to-orange-500',
    bgClass: 'bg-amber-50', borderClass: 'border-amber-200'
  });

  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    loadStats();
    fetchRewards();
    fetchUsers();
    fetchExperiments();
  }, []);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', authHeaders());
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchRewards = async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const res = await fetch('/api/rewards');
      if (!res.ok) throw new Error("Không thể tải danh sách quà");
      setRewards(await res.json());
    } catch (e: unknown) {
      setLoadingError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', authHeaders());
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExperiments = async () => {
    setExpLoading(true);
    try {
      const res = await fetch('/api/experiments', authHeaders());
      if (res.ok) setExperiments(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setExpLoading(false);
    }
  };

  const fetchUserDetail = async (u: User) => {
    setUserDetailLoading(true);
    setSelectedUser(null);
    try {
      const accountId = u.account_id;
      const [profileRes, decayRes, interventionsRes] = await Promise.all([
        fetch(`/api/profile/${accountId}`, authHeaders()),
        fetch(`/api/decay/${accountId}`, authHeaders()),
        fetch(`/api/interventions/${accountId}`, authHeaders()),
      ]);
      const profile = profileRes.ok ? await profileRes.json() : null;
      const decay = decayRes.ok ? await decayRes.json() : null;
      const interventions = interventionsRes.ok ? await interventionsRes.json() : [];
      setSelectedUser({ ...u, profile, decay, interventions });
    } catch (e) {
      setSelectedUser({ ...u, profile: null, decay: null, interventions: [] });
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    try {
      const res = await fetch("/api/upload", { ...authHeaders(), method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setNewReward(prev => ({ ...prev, imageUrl: data.url }));
      else alert("Upload failed: " + (data.error || "Unknown error"));
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Lỗi upload ảnh");
    }
    setUploading(false);
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: RewardItem = {
        id: Date.now().toString(), name: newReward.name, desc: newReward.desc,
        cost: Number(newReward.cost), imageUrl: newReward.imageUrl,
        ingredients: newReward.ingredients.split(',').map(s => s.trim()),
        color: newReward.color, bgClass: newReward.bgClass, borderClass: newReward.borderClass,
      };
      await fetch('/api/rewards', { ...authHeaders(), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setShowAddReward(false);
      fetchRewards();
    } catch (error) {
      console.error("Failed to add reward", error);
    }
  };

  const handleDeleteReward = async (id: string | number) => {
    if (!confirm('Bạn có chắc muốn xóa quà này?')) return;
    await fetch(`/api/rewards/${id}`, { ...authHeaders(), method: 'DELETE' });
    fetchRewards();
  };

  const handleRoleChange = async (nick: string, newRole: string) => {
    await fetch(`/api/admin/users/${nick}/role`, { ...authHeaders(), method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) });
    fetchUsers();
  };

  const handlePointsAdjust = async (nick: string, delta: number, reason: string) => {
    await fetch(`/api/admin/users/${nick}/adjust-points`, { ...authHeaders(), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta, reason }) });
    fetchUsers();
    if (selectedUser?.nick === nick) {
      const updated = users.find(u => u.nick === nick);
      if (updated) fetchUserDetail(updated);
    }
  };

  const handleSuspend = async (nick: string, suspended: boolean) => {
    await fetch(`/api/admin/users/${nick}/suspend`, { ...authHeaders(), method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suspended }) });
    fetchUsers();
    setSelectedUser(null);
  };

  const handleResetProgress = async (nick: string) => {
    if (!confirm(`CẢNH BÁO: Reset toàn bộ tiến độ của "${nick}"? Hành động này không thể hoàn tác!`)) return;
    await fetch(`/api/admin/users/${nick}/reset-progress?confirm=true`, { ...authHeaders(), method: 'POST' });
    fetchUsers();
    setSelectedUser(null);
  };

  const handleTriggerDecay = async (accountId: string) => {
    await fetch(`/api/admin/decay/${accountId}/detect`, { ...authHeaders(), method: 'POST' });
    if (selectedUser) fetchUserDetail(selectedUser);
  };

  const handleCreateExp = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/experiments', {
      ...authHeaders(), method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newExp, metrics: ['engagement', 'retention'] })
    });
    setShowNewExp(false);
    setNewExp({ id: '', name: '', description: '', groups: [{ name: 'control', description: 'No intervention', ratio: 0.25 }] });
    fetchExperiments();
  };

  const handleExpAction = async (expId: string, action: 'pause' | 'activate' | 'delete') => {
    await fetch(`/api/experiments/${expId}/${action}`, { ...authHeaders(), method: 'POST' });
    fetchExperiments();
  };

  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.nick || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.account_id || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Xin chào, {user.name}</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200 transition-colors">
            <LogOut size={18} /> Đăng xuất
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'overview', icon: Activity, label: 'Tổng quan' },
            { id: 'rewards', icon: Gift, label: 'Quà tặng' },
            { id: 'users', icon: Users, label: 'Người chơi' },
            { id: 'experiments', icon: FlaskConical, label: 'Experiments' },
            { id: 'research', icon: BarChart3, label: 'Research' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={id === 'research' ? () => window.location.href = '/research' : () => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm ${
                activeTab === id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tổng người dùng', value: stats?.total || '—', color: 'bg-blue-50 text-blue-700', icon: Users },
              { label: 'Admin accounts', value: stats?.admins || '—', color: 'bg-purple-50 text-purple-700', icon: Shield },
              { label: 'Hoạt động (7 ngày)', value: stats?.activeUsers || '—', color: 'bg-emerald-50 text-emerald-700', icon: Activity },
              { label: 'Research users (7d)', value: stats?.researchActive7d || '—', color: 'bg-amber-50 text-amber-700', icon: BarChart3 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={`${color} rounded-2xl p-5 border-0`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={20} />
                  <span className="text-sm font-medium opacity-70">{label}</span>
                </div>
                <p className="text-3xl font-black">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Danh sách quà tặng</h2>
              <button onClick={() => setShowAddReward(!showAddReward)}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors text-sm">
                <Plus size={16} /> {showAddReward ? 'Hủy' : 'Thêm quà mới'}
              </button>
            </div>

            {showAddReward && (
              <form onSubmit={handleAddReward} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tên quà tặng</label>
                  <input required type="text" className="w-full border p-2 rounded-lg" value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                  <input required type="text" className="w-full border p-2 rounded-lg" value={newReward.desc} onChange={e => setNewReward({...newReward, desc: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giá điểm (EXP)</label>
                  <input required type="number" className="w-full border p-2 rounded-lg" value={newReward.cost} onChange={e => setNewReward({...newReward, cost: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ảnh (upload lên Cloudinary)</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 rounded-lg text-sm" disabled={uploading} />
                  {uploading && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Đang upload...</p>}
                  {newReward.imageUrl && <img src={newReward.imageUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border mt-1" />}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Thành phần (cách nhau bởi dấu phẩy)</label>
                  <input type="text" className="w-full border p-2 rounded-lg" value={newReward.ingredients} onChange={e => setNewReward({...newReward, ingredients: e.target.value})} />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Lưu</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map(r => (
                <div key={r.id} className="flex gap-4 border border-gray-100 p-4 rounded-xl bg-gray-50 items-center">
                  <img src={r.imageUrl} alt={r.name} className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{r.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{r.desc}</p>
                    <p className="text-sm font-bold text-amber-600 mt-1">{r.cost} EXP</p>
                  </div>
                  <button onClick={() => handleDeleteReward(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex gap-4 items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Danh sách người chơi ({filteredUsers.length})</h2>
              <div className="relative flex-1 max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Tìm tài khoản, tên..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm" />
              </div>
              <button onClick={() => { fetchUsers(); loadStats(); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl"><RefreshCw size={18} /></button>
            </div>

            <div className="flex gap-6">
              {/* User list */}
              <div className="flex-1 min-w-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="p-2 border-b font-bold">Tài khoản</th>
                        <th className="p-2 border-b font-bold">Tên</th>
                        <th className="p-2 border-b font-bold">EXP</th>
                        <th className="p-2 border-b font-bold">Role</th>
                        <th className="p-2 border-b font-bold">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.account_id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${selectedUser?.account_id === u.account_id ? 'bg-emerald-50' : ''}`}
                          onClick={() => fetchUserDetail(u)}>
                          <td className="p-2 truncate max-w-[120px]" title={u.account_id}>{u.nick}</td>
                          <td className="p-2 font-medium truncate max-w-[120px]">{u.name}</td>
                          <td className="p-2 text-amber-600 font-bold">{u.points}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="p-2">
                            <button onClick={(e) => { e.stopPropagation(); fetchUserDetail(u); }} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Eye size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User detail panel */}
              {selectedUser && (
                <div className="w-96 border-l border-gray-100 pl-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Chi tiết: {selectedUser.name}</h3>
                    <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  {userDetailLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-gray-500 text-xs">Tài khoản</p>
                          <p className="font-bold">{selectedUser.nick}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-gray-500 text-xs">EXP</p>
                          <p className="font-bold text-amber-600">{selectedUser.points}</p>
                        </div>
                      </div>

                      {/* Behavioral profile */}
                      {selectedUser.profile && selectedUser.profile.scores && (
                        <div className="bg-emerald-50 rounded-xl p-4">
                          <p className="font-bold text-emerald-700 mb-2 text-sm flex items-center gap-1"><Activity size={14} /> Behavioral Profile</p>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            {Object.entries(selectedUser.profile.scores).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="capitalize text-gray-600">{k.replace('_', ' ')}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(v as number) * 100}%` }} />
                                  </div>
                                  <span className="font-bold w-8 text-right">{Math.round((v as number) * 100)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-emerald-600 mt-2">Confidence: {Math.round(selectedUser.profile.confidence * 100)}%</p>
                        </div>
                      )}

                      {/* Decay state */}
                      {selectedUser.decay && (
                        <div className="bg-amber-50 rounded-xl p-4">
                          <p className="font-bold text-amber-700 mb-2 text-sm">Novelty Decay</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-gray-500">Engagement:</span> <span className="font-bold">{Math.round((selectedUser.decay.engagementScore || 0) * 100)}%</span></div>
                            <div><span className="text-gray-500">Severity:</span> <span className="font-bold">{selectedUser.decay.decaySeverity || 'none'}</span></div>
                            <div><span className="text-gray-500">Streak:</span> <span className="font-bold">{selectedUser.decay.streakStability?.toFixed(2) || '—'}</span></div>
                            <div><span className="text-gray-500">Days since login:</span> <span className="font-bold">{selectedUser.decay.daysSinceLogin || '—'}</span></div>
                          </div>
                          <button onClick={() => handleTriggerDecay(selectedUser.account_id)} className="mt-2 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-bold hover:bg-amber-200">
                            Trigger Detection
                          </button>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="space-y-2">
                        <p className="font-bold text-gray-700 text-sm">Hành động nhanh</p>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handlePointsAdjust(selectedUser.nick, 100, "Admin bonus")}
                            className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200">
                            <Zap size={12} /> +100 EXP
                          </button>
                          <button onClick={() => handlePointsAdjust(selectedUser.nick, -100, "Admin deduction")}
                            className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">
                            <Zap size={12} /> -100 EXP
                          </button>
                          <button onClick={() => handleRoleChange(selectedUser.nick, selectedUser.role === 'admin' ? 'user' : 'admin')}
                            className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-200">
                            <Shield size={12} /> {selectedUser.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button onClick={() => handleSuspend(selectedUser.nick, selectedUser.role !== 'suspended')}
                            className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-200">
                            <Ban size={12} /> {selectedUser.role === 'suspended' ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button onClick={() => handleResetProgress(selectedUser.nick)}
                            className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">
                            <Trash2 size={12} /> Reset Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPERIMENTS TAB */}
        {activeTab === 'experiments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">A/B Experiments ({experiments.length})</h2>
              <button onClick={() => setShowNewExp(!showNewExp)}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 text-sm">
                <Plus size={16} /> {showNewExp ? 'Hủy' : 'Tạo Experiment'}
              </button>
            </div>

            {showNewExp && (
              <form onSubmit={handleCreateExp} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="Experiment ID (e.g. rewards_v2)" className="border p-2 rounded-lg text-sm" value={newExp.id} onChange={e => setNewExp({...newExp, id: e.target.value})} />
                  <input required placeholder="Tên experiment" className="border p-2 rounded-lg text-sm" value={newExp.name} onChange={e => setNewExp({...newExp, name: e.target.value})} />
                </div>
                <input placeholder="Mô tả" className="w-full border p-2 rounded-lg text-sm" value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} />
                <div className="flex gap-2">
                  <input placeholder="Control group ratio (0.25)" type="number" step="0.05" min="0" max="1" className="border p-2 rounded-lg text-sm w-40" defaultValue="0.25" />
                  <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Tạo</button>
                </div>
              </form>
            )}

            {expLoading ? (
              <p className="text-gray-400 text-sm">Đang tải...</p>
            ) : (
              <div className="space-y-3">
                {experiments.map(exp => (
                  <div key={exp.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800">{exp.name || exp.id}</h4>
                        <p className="text-xs text-gray-500">{exp.description}</p>
                        <div className="flex gap-2 mt-2">
                          {(exp.groups || []).map((g: any) => (
                            <span key={g.name} className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              g.name.includes('control') ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                            }`}>{g.name} ({Math.round(g.ratio * 100)}%)</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          exp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : exp.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>{exp.status}</span>
                        {exp.status === 'active' ? (
                          <button onClick={() => handleExpAction(exp.id, 'pause')} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold hover:bg-amber-200">Pause</button>
                        ) : (
                          <button onClick={() => handleExpAction(exp.id, 'activate')} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200">Activate</button>
                        )}
                        <button onClick={() => handleExpAction(exp.id, 'delete')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
                {experiments.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">Chưa có experiment nào. Tạo experiment đầu tiên!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
