"use client";

import { useState, useTransition } from "react";
import { scheduleMatchAction, deleteMatchAction } from "@/lib/actions/matches_schedule";

interface Team {
  id: string;
  name: string;
  group_name: string | null;
}

interface Match {
  id: string;
  stage: string;
  status: string;
  match_time: string | null;
  home_team: Team;
  away_team: Team;
}

export default function SchedulerManager({ matches }: { matches: Match[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await scheduleMatchAction(fd);
      if ("error" in res) {
        setError(res.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Ești sigur că vrei să ștergi acest meci? Această acțiune va goli poziția meciului în arborele eliminatoriu.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMatchAction(id);
      if ("error" in res) {
        setError(res.error);
      }
    });
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Toate meciurile au fost programate</h3>
        <p className="text-sm">Nu există niciun meci care să necesite programare momentan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-b border-gray-200">
              <th className="py-3 px-4 text-left font-bold text-xs uppercase">Echipe</th>
              <th className="py-3 px-4 text-center font-bold text-xs uppercase">Grupă / Fază</th>
              <th className="py-3 px-4 text-right font-bold text-xs uppercase">Data & Ora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {matches.map(match => (
              <tr key={match.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{match.home_team.name}</span>
                    <span className="text-xs font-black text-gray-400 px-2 py-0.5 rounded bg-gray-100">VS</span>
                    <span className="font-semibold text-gray-900">{match.away_team.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
                    {match.stage === "group" ? `Grupa ${match.home_team.group_name || '?'}` : ({ ro16: "Optimi", quarter: "Sferturi", semi: "Semifinale", final: "Finala", third_place: "Finala Mică" } as Record<string, string>)[match.stage] || "Eliminatoriu"}
                  </span>
                </td>
                <td className="py-4 px-4 text-right flex items-center justify-end gap-3">
                  <form onSubmit={handleSchedule} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={match.id} />
                    <input 
                      type="datetime-local" 
                      name="datetime" 
                      required 
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button 
                      type="submit" 
                      disabled={isPending}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "..." : "Salvează"}
                    </button>
                  </form>
                  <button 
                    onClick={() => handleDelete(match.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-1"
                    title="Șterge meci"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
