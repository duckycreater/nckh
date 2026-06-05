import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Award, Flame, Library, CheckCircle, Pencil, X, Save, RefreshCw } from 'lucide-react';
import { Skeleton, ErrorRetry } from '../lib/ui';
import { RewardHistory } from './RewardHistory';

const AVATARS = [
  { id: "av1", emoji: "🌱", name: "Mầm Xanh" },
  { id: "av2", emoji: "💧", name: "Chiến Binh Nước" },
  { id: "av3", emoji: "🦁", name: "Thủ Lĩnh Rừng" },
];

const FRAMES = [
  { id: "fr1", name: "Khung Gỗ", style: "border-4 border-amber-700" },
  { id: "fr2", name: "Khung Băng", style: "border-4 border-cyan-400" },
  { id: "fr3", name: "Hào Quang Đất", style: "border-4 border-emerald-500 shadow-[0_0_12px_#10b981]" },
];

interface Props {
  nickname: string;
  onClose: () => void;
}

export function ProfileView({ nickname, onClose }: Props) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editFrame, setEditFrame] = useState("");
  const [editPass, setEditPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const loadProfile = () => {
    setLoading(true);
    fetch(`/api/user/${nickname}`)
      .then(res => {
        if (!res.ok) throw new Error("Không thể tải hồ sơ");
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setEditName(data.name || "");
        setEditAvatar(data.selectedAvatar || "");
        setEditFrame(data.selectedFrame || "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, [nickname]);

  const handleSave = async () => {
    if (!editName.trim()) {
      setEditMsg({ type: "error", text: "Tên không được để trống" });
      return;
    }
    setSaving(true);
    setEditMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          name: editName.trim(),
          selectedAvatar: editAvatar || undefined,
          selectedFrame: editFrame || undefined,
          pass: editPass || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditMsg({ type: "success", text: "Lưu thành công!" });
        setEditing(false);
        setEditPass("");
        loadProfile();
      } else {
        setEditMsg({ type: "error", text: data.message || "Lưu thất bại" });
      }
    } catch {
      setEditMsg({ type: "error", text: "Lỗi kết nối" });
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (profile) {
      setEditName(profile.name || "");
      setEditAvatar(profile.selectedAvatar || "");
      setEditFrame(profile.selectedFrame || "");
    }
    setEditPass("");
    setEditMsg(null);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 z-40 bg-white p-4 pt-20 space-y-4 animate-pulse">
        <Skeleton className="h-10 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          <Skeleton className="h-24 rounded-2xl col-span-2" />
          <Skeleton className="h-24 rounded-2xl col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="absolute inset-0 z-40 bg-white p-4 text-center pt-20">
        <ErrorRetry message={error || "Người chơi không tồn tại"} onRetry={loadProfile} />
        <button onClick={onClose} className="mt-4 text-emerald-500 font-bold">Quay lại</button>
      </div>
    );
  }

  const selectedAvatarData = AVATARS.find(a => a.id === profile.selectedAvatar);
  const selectedFrameData = FRAMES.find(f => f.id === profile.selectedFrame);
  const avatarEmoji = selectedAvatarData?.emoji || profile.name[0];
  const frameStyle = selectedFrameData?.style || "";

  return (
    <div className="bg-white absolute inset-0 z-40 p-4 pb-20 overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
       <div className="flex items-center justify-between mb-6">
         <button onClick={onClose} className="flex items-center text-gray-500 hover:text-gray-800 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-full">
           <ArrowLeft className="w-4 h-4 mr-1"/> Quay lại
         </button>
         <button
           onClick={() => setEditing(e => !e)}
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
             editing ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
           }`}
         >
           {editing ? <><X size={14}/> Hủy</> : <><Pencil size={14}/> Chỉnh sửa</>}
         </button>
       </div>

       {/* EDIT FORM */}
       {editing && (
         <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-200 space-y-4">
           <h3 className="font-black text-gray-700 text-sm uppercase tracking-wide">Chỉnh sửa hồ sơ</h3>

           <div>
             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên hiển thị</label>
             <input
               value={editName}
               onChange={e => setEditName(e.target.value)}
               maxLength={30}
               className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
               placeholder="Nhập tên mới..."
             />
           </div>

           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Avatar</label>
             <div className="flex gap-3">
               {AVATARS.map(av => (
                 <button
                   key={av.id}
                   onClick={() => setEditAvatar(editAvatar === av.id ? "" : av.id)}
                   className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black transition-all ${
                     editAvatar === av.id
                       ? "ring-2 ring-emerald-500 ring-offset-2 scale-110"
                       : "bg-gray-100 hover:bg-gray-200 opacity-60 hover:opacity-100"
                   }`}
                   title={av.name}
                 >
                   {av.emoji}
                 </button>
               ))}
             </div>
             <p className="text-xs text-gray-400 mt-1">{selectedAvatarData?.name || "Mặc định"}</p>
           </div>

           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Khung avatar</label>
             <div className="flex gap-3">
               {FRAMES.map(fr => (
                 <button
                   key={fr.id}
                   onClick={() => setEditFrame(editFrame === fr.id ? "" : fr.id)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                     editFrame === fr.id
                       ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                       : "border-gray-200 bg-gray-100 text-gray-500 hover:border-gray-300"
                   }`}
                   title={fr.name}
                 >
                   {fr.name}
                 </button>
               ))}
             </div>
           </div>

           <div>
             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
               Mật khẩu xác nhận <span className="text-red-400">(bắt buộc)</span>
             </label>
             <input
               type="password"
               value={editPass}
               onChange={e => setEditPass(e.target.value)}
               className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
               placeholder="Nhập mật khẩu để xác nhận..."
             />
           </div>

           {editMsg && (
             <div className={`text-sm font-bold px-3 py-2 rounded-xl ${
               editMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
             }`}>
               {editMsg.text}
             </div>
           )}

           <div className="flex gap-3">
             <button
               onClick={handleSave}
               disabled={saving}
               className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
             >
               {saving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
               {saving ? "Đang lưu..." : "Lưu thay đổi"}
             </button>
             <button onClick={handleCancel} className="px-4 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all">
               Hủy
             </button>
           </div>
         </div>
       )}

       {/* HEADER */}
       <div className="flex items-center gap-4 mb-4">
         <div
           className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 shadow-sm border-2 border-emerald-200 ${frameStyle}`}
         >
           {avatarEmoji}
         </div>
         <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">{profile.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Cống hiến: <span className="font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded bg-emerald-100">{profile.points} EXP</span>
            </p>
         </div>
       </div>

       {/* TABS */}
       <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
         {[
           { id: 'overview', label: 'Tổng quan' },
           { id: 'history', label: 'Lịch sử giao dịch' },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as typeof activeTab)}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
               activeTab === tab.id ? "bg-white shadow-sm text-emerald-600" : "text-gray-500 hover:text-gray-700"
             }`}
           >
             {tab.label}
           </button>
         ))}
       </div>

       {/* OVERVIEW TAB */}
       {activeTab === 'overview' && (
         <>
           <div className="grid grid-cols-2 gap-3 mb-6">
             <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center shadow-sm">
               <Flame className="text-orange-500 mb-2 fill-current" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Chuỗi ngày</span>
               <span className="text-2xl font-black text-orange-600">{profile.progress?.streakDays || 1}</span>
               {(profile.progress?.streakDays ?? 1) > 1 && (
                 <span className="text-[10px] font-black text-orange-400 mt-0.5 flex items-center gap-0.5">
                   x{Math.min(1 + ((profile.progress?.streakDays ?? 1) - 1) * 0.1, 2).toFixed(1)} EXP
                 </span>
               )}
             </div>
             <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center shadow-sm">
               <Award className="text-blue-500 mb-2" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Cấp</span>
               <span className="text-2xl font-black text-blue-600">{Math.floor(profile.points / 200) + 1}</span>
             </div>
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center shadow-sm">
               <CheckCircle className="text-emerald-500 mb-2" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Thẻ đã mở</span>
               <span className="text-2xl font-black text-emerald-600">{profile.progress?.flashcardsRead?.length || 0}</span>
             </div>
             <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col items-center shadow-sm">
               <Award className="text-purple-500 mb-2" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Số lần checkin</span>
               <span className="text-2xl font-black text-purple-600">{profile.progress?.checkins?.length || 0}</span>
             </div>
             <div className="col-span-2 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center shadow-sm">
               <Award className="text-blue-500 mb-2" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Danh hiệu</span>
               <span className="text-lg font-black text-blue-600 text-center uppercase tracking-tighter leading-none mt-1">
                 {profile.points > 200 ? 'Hiệp sĩ môi trường' : (profile.points > 50 ? 'Người bảo vệ' : 'Mầm non')}
               </span>
             </div>
             <div className="col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center shadow-sm">
               <Library className="text-indigo-500 mb-2" size={28} />
               <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Bộ sưu tập</span>
               <span className="text-2xl font-black text-indigo-600">
                 {profile.progress?.flashcardsRead?.length || 0}
                 <span className="text-sm font-bold text-indigo-400">/300</span>
               </span>
             </div>
          </div>

          <h3 className="font-black text-gray-800 mb-4 border-b-4 border-emerald-400 inline-block text-sm uppercase tracking-wider">Hoạt Động / Thành Tích</h3>
          <div className="space-y-3 text-sm mb-6">
            <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100 shadow-sm">
              <span className="font-bold text-gray-600">Thử thách đã hoàn thành</span>
              <span className="font-black text-xl text-emerald-600">{profile.progress?.challengesCompleted?.length || 0}</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100 shadow-sm">
              <span className="font-bold text-gray-600">Quà đã đổi</span>
              <span className="font-black text-xl text-amber-500">{profile.progress?.crafted?.length || 0}</span>
            </div>
          </div>
         </>
       )}

       {/* HISTORY TAB */}
       {activeTab === 'history' && (
         <div className="mt-2">
           <RewardHistory userId={nickname} currentBalance={profile.points} />
         </div>
       )}
    </div>
  );
}
