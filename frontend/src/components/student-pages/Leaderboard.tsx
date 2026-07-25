import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Loader2, Users, Globe } from 'lucide-react';
import api from '../../api';

interface LeagueInfo {
  name: string;
  emoji: string;
  color: string;
}

interface LeaderEntry {
  rank: number;
  student_id: number;
  display_name: string;
  xp: number;
  level: number;
  league: LeagueInfo;
  is_me: boolean;
}

interface LeaderboardData {
  scope: 'global' | 'class';
  course_id: number | null;
  total_players: number;
  entries: LeaderEntry[];
  me: LeaderEntry | null;
}

const medal = (rank: number) =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

const avatarColors = ['bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-emerald-400', 'bg-amber-400', 'bg-cyan-400'];

const EntryRow: React.FC<{ e: LeaderEntry }> = ({ e }) => (
  <div
    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl transition-colors ${
      e.is_me ? 'bg-amber-50 border-2 border-amber-200 ring-1 ring-amber-200' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-7 text-center shrink-0">
        {medal(e.rank) ? (
          <span className="text-lg">{medal(e.rank)}</span>
        ) : (
          <span className="text-xs font-black text-gray-400">{e.rank}</span>
        )}
      </div>
      <div
        className={`w-9 h-9 rounded-full ${avatarColors[e.student_id % avatarColors.length]} border-2 border-white shadow-sm flex items-center justify-center text-white font-black shrink-0`}
      >
        {e.display_name[0]?.toUpperCase() || '?'}
      </div>
      <div className="min-w-0">
        <h4 className="font-black text-gray-800 text-sm truncate leading-tight">
          {e.display_name} {e.is_me && <span className="text-amber-500">(Sen)</span>}
        </h4>
        <span className="text-[11px] font-bold text-gray-400">
          {e.league.emoji} {e.league.name} · Lv {e.level}
        </span>
      </div>
    </div>
    <span className="text-sm font-black text-gray-700 font-mono shrink-0">{e.xp.toLocaleString()} XP</span>
  </div>
);

const Leaderboard: React.FC<{ defaultScope?: 'global' | 'class' }> = ({ defaultScope = 'global' }) => {
  const [scope, setScope] = useState<'global' | 'class'>(defaultScope);
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sınıf sekmesi için kayıtlı kursları bir kez yükle
  useEffect(() => {
    api
      .get('/my-content')
      .then((res) => {
        const cs = (res.data || []).map((c: any) => ({ id: c.id, title: c.title }));
        setCourses(cs);
        setCourseId((prev) => prev ?? (cs[0]?.id ?? null));
      })
      .catch(() => {});
  }, []);

  const fetchBoard = useCallback(async () => {
    if (scope === 'class' && !courseId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q =
        scope === 'class'
          ? `?scope=class&course_id=${courseId}&limit=10`
          : `?scope=global&limit=10`;
      const res = await api.get(`/leaderboard${q}`);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Liderlik tablosu yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [scope, courseId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const meInList = data?.entries.some((e) => e.is_me);

  return (
    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black text-gray-800 font-display flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" /> Liderlik
        </h3>
        {/* Scope sekmeleri */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setScope('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              scope === 'global' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Globe size={13} /> Global
          </button>
          <button
            onClick={() => setScope('class')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              scope === 'class' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users size={13} /> Sınıf
          </button>
        </div>
      </div>

      {/* Sınıf sekmesinde birden fazla kurs varsa seçici */}
      {scope === 'class' && courses.length > 1 && (
        <select
          value={courseId ?? ''}
          onChange={(e) => setCourseId(Number(e.target.value))}
          className="w-full mb-3 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-amber-400"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="py-10 flex justify-center text-gray-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs font-bold text-gray-400">{error}</div>
      ) : scope === 'class' && !courseId ? (
        <div className="py-8 text-center text-xs font-bold text-gray-400">
          Sıralama için kayıtlı bir kursun olması gerekir.
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="py-8 text-center text-xs font-bold text-gray-400">
          Henüz sıralama verisi yok. XP kazanmaya başla! 🚀
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {data.entries.map((e) => (
              <EntryRow key={e.student_id} e={e} />
            ))}
          </div>

          {/* Kendi sıram listede yoksa altta sabitle */}
          {data.me && !meInList && (
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
              <EntryRow e={data.me} />
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 text-center text-[11px] font-bold text-gray-400">
            {scope === 'global' ? 'Tüm platform' : 'Bu sınıf'} · {data.total_players} oyuncu
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
