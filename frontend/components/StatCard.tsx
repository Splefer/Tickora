interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  accent?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp,
  accent = 'indigo',
}: StatCardProps) {
  const accentColors: Record<string, string> = {
    indigo: 'bg-indigo-900/40 text-indigo-400',
    green: 'bg-green-900/40 text-green-400',
    purple: 'bg-purple-900/40 text-purple-400',
    orange: 'bg-orange-900/40 text-orange-400',
    pink: 'bg-pink-900/40 text-pink-400',
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-3 text-xl ${accentColors[accent] ?? accentColors.indigo}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
