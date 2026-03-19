import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useCompanyConfig } from '@/hooks/useCompanyConfig';

type QuinzenaValue = `Q${number}` | 'todos' | 'custom';

interface DateRange {
  inicio: Date;
  fim: Date;
}

interface QuinzenaContextType {
  quinzenaAtiva: QuinzenaValue;
  periodoCustom: DateRange | null;
  setQuinzena: (q: QuinzenaValue) => void;
  setPeriodoCustom: (range: DateRange | null) => void;
  getDateRange: () => DateRange | null;
}

const QuinzenaContext = createContext<QuinzenaContextType | null>(null);

export function QuinzenaProvider({ children }: { children: ReactNode }) {
  const { data: company } = useCompanyConfig();
  const defaultQ = (company?.config?.quinzena_atual as QuinzenaValue) ?? 'Q1';

  const [quinzenaAtiva, setQuinzenaAtiva] = useState<QuinzenaValue>(defaultQ);
  const [periodoCustom, setPeriodoCustom] = useState<DateRange | null>(null);

  const setQuinzena = useCallback((q: QuinzenaValue) => {
    setQuinzenaAtiva(q);
    if (q !== 'custom') setPeriodoCustom(null);
  }, []);

  const getDateRange = useCallback((): DateRange | null => {
    if (quinzenaAtiva === 'custom' && periodoCustom) return periodoCustom;
    if (quinzenaAtiva === 'todos') return null;
    // Q-based: return null (filtering is index-based in dashboard)
    return null;
  }, [quinzenaAtiva, periodoCustom]);

  return (
    <QuinzenaContext.Provider value={{ quinzenaAtiva, periodoCustom, setQuinzena, setPeriodoCustom, getDateRange }}>
      {children}
    </QuinzenaContext.Provider>
  );
}

export function useQuinzena() {
  const ctx = useContext(QuinzenaContext);
  if (!ctx) throw new Error('useQuinzena must be used within QuinzenaProvider');
  return ctx;
}
