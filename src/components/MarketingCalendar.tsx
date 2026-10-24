import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarTask = {
  id: string;
  title: string;
  post_date: string;
  status: string;
};

type MarketingCalendarProps = {
  tasks: CalendarTask[];
  onSelectTask?: (id: string) => void;
};

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': 'bg-pq-ink-muted',
  'En Revisión': 'bg-blue-500',
  'Observado': 'bg-pq-marku',
  'Publicado': 'bg-pq-teal',
};

// Evita los líos de zona horaria de Date#toISOString: siempre formamos
// la clave "YYYY-MM-DD" a partir de los componentes locales de la fecha,
// igual que las fechas de Supabase (post_date) llegan como texto plano.
const pad = (n: number) => n.toString().padStart(2, '0');
const toDateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

export default function MarketingCalendar({ tasks, onSelectTask }: MarketingCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: { day: number; key: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) result.push({ day: d, key: toDateKey(year, month, d) });
    return { startOffset, days: result };
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    tasks.forEach(t => {
      if (!map[t.post_date]) map[t.post_date] = [];
      map[t.post_date].push(t);
    });
    return map;
  }, [tasks]);

  const now = new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const changeMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-pq-teal-deep flex items-center gap-2">
          {capitalizedMonthLabel} <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-xl bg-pq-cream hover:bg-pq-cream-dark text-pq-teal-deep transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => setViewDate(new Date())} className="px-3 rounded-xl bg-pq-cream hover:bg-pq-cream-dark text-pq-teal-deep font-bold text-xs uppercase tracking-wider transition-colors">
            Hoy
          </button>
          <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-xl bg-pq-cream hover:bg-pq-cream-dark text-pq-teal-deep transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-[10px] font-black text-pq-teal-dark uppercase tracking-widest py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: cells.startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 md:h-24" />
        ))}

        {cells.days.map(({ day, key }) => {
          const dayTasks = tasksByDate[key] || [];
          const isToday = key === todayKey;

          return (
            <div key={key} className={`h-16 md:h-24 rounded-xl border-2 p-1.5 flex flex-col overflow-hidden ${
              isToday ? 'border-pq-teal bg-pq-teal/5' : 'border-pq-cream-dark bg-white'
            }`}>
              <span className={`text-[10px] font-black mb-1 ${isToday ? 'text-pq-teal' : 'text-pq-ink/50'}`}>{day}</span>
              <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
                {dayTasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTask?.(t.id)}
                    title={t.title}
                    className={`text-[9px] md:text-[10px] font-bold text-white rounded px-1 py-0.5 text-left truncate shrink-0 hover:opacity-80 transition-opacity ${STATUS_COLOR[t.status] || 'bg-pq-teal-dark'}`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t-2 border-dashed border-pq-cream-dark">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-[10px] font-bold text-pq-ink/60 uppercase tracking-wider">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span> {status}
          </span>
        ))}
      </div>
    </div>
  );
}
