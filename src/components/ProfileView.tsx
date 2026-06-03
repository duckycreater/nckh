import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { ArrowLeft, Award, Flame, Library, CheckCircle } from 'lucide-react';
import { Skeleton, ErrorRetry } from '../lib/ui';

interface Props {
  nickname: string;
  onClose: () => void;
}

export function ProfileView({ nickname, onClose }: Props) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/user/${nickname}`)
      .then(res => {
        if (!res.ok) throw new Error("Không thể tải hồ sơ");
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        setLoading(false);
      });
  }, [nickname]);

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
        <ErrorRetry message={error || "Người chơi không tồn tại"} onRetry={() => window.location.reload()} />
        <button onClick={onClose} className="mt-4 text-emerald-500 font-bold">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="bg-white absolute inset-0 z-40 p-4 pb-20 overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
       <button onClick={onClose} className="mb-6 flex items-center text-gray-500 hover:text-gray-800 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-full"><ArrowLeft className="w-4 h-4 mr-1"/> Quay lại</button>
       <div className="flex items-center gap-4 mb-8">
         {profile.selectedAvatar ? (
           <div
             className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 shadow-sm border-2 border-emerald-200 ${
               profile.selectedFrame === "fr1" ? "border-4 border-amber-700" :
               profile.selectedFrame === "fr2" ? "border-4 border-cyan-400" :
               profile.selectedFrame === "fr3" ? "border-4 border-emerald-500 shadow-[0_0_12px_#10b981]" : ""
             }`}
           >
             {profile.selectedAvatar === "av1" ? "🌱" : profile.selectedAvatar === "av2" ? "💧" : profile.selectedAvatar === "av3" ? "🦁" : profile.name[0]}
           </div>
         ) : (
           <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black uppercase shadow-sm border border-emerald-200">
             {profile.name[0]}
           </div>
         )}
         <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">{profile.name}</h2>
            <p className="text-gray-500 text-sm mt-1">Cống hiến: <span className="font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded bg-emerald-100">{profile.points} EXP</span></p>
         </div>
       </div>

       <div className="grid grid-cols-2 gap-3 mb-8">
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
            <span className="text-lg font-black text-blue-600 text-center uppercase tracking-tighter leading-none mt-1">{profile.points > 200 ? 'Hiệp sĩ môi trường' : (profile.points > 50 ? 'Người bảo vệ' : 'Mầm non')}</span>
          </div>
          <div className="col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center shadow-sm">
            <Library className="text-indigo-500 mb-2" size={28} />
            <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wide">Bộ sưu tập</span>
            <span className="text-2xl font-black text-indigo-600">{profile.progress?.flashcardsRead?.length || 0}<span className="text-sm font-bold text-indigo-400">/300</span></span>
          </div>
       </div>

      <h3 className="font-black text-gray-800 mb-4 border-b-4 border-emerald-400 inline-block text-sm uppercase tracking-wider">Hoạt Động / Thành Tích</h3>
      <div className="space-y-3 text-sm">
        <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100 shadow-sm">
          <span className="font-bold text-gray-600">Thử thách đã hoàn thành</span>
          <span className="font-black text-xl text-emerald-600">{profile.progress?.challengesCompleted?.length || 0}</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center border border-gray-100 shadow-sm">
          <span className="font-bold text-gray-600">Bộ sưu tập / Quà đã đổi</span>
          <span className="font-black text-xl text-amber-500">{profile.progress?.crafted?.length || 0}</span>
        </div>
      </div>
    </div>
  )
}
