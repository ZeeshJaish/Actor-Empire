import React, { useMemo, useState } from 'react';
import { Player, Transaction } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  Landmark,
  CreditCard,
  ChevronDown,
  Shield,
  AlertCircle,
  BadgeDollarSign,
  Clock3,
} from 'lucide-react';
import {
  calculateWeeklyLoanPayment,
  createPlayerLoan,
  getAbsoluteBorrowingCeiling,
  getAverageWeeklyCashFlow,
  getCreditScore,
  getCreditTier,
  getEstimatedNetWorth,
  getLoanAnnualRate,
  getLoanApprovalOdds,
  getLoanDecisionLabel,
  getOutstandingLoanBalance,
  getSafeBorrowingCapacity,
  getWeeklyDebtBurden,
} from '../../services/loanLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';

interface BankAppProps {
  player: Player;
  onBack: () => void;
  onUpdatePlayer: (player: Player) => void;
}

const TERM_OPTIONS = [
  { label: '3 Mo', weeks: 12 },
  { label: '6 Mo', weeks: 26 },
  { label: '12 Mo', weeks: 52 },
  { label: '24 Mo', weeks: 104 },
] as const;

const INCOME_CATEGORIES = ['SALARY', 'ROYALTY', 'SPONSORSHIP', 'DIVIDEND', 'BUSINESS', 'AD_REVENUE'] as const;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const BankApp: React.FC<BankAppProps> = ({ player, onBack, onUpdatePlayer }) => {
  const [tab, setTab] = useState<'OVERVIEW' | 'BREAKDOWN' | 'HISTORY'>('OVERVIEW');
  const [selectedYear, setSelectedYear] = useState<number>(player.age);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [requestedAmountInput, setRequestedAmountInput] = useState('2000000');
  const [selectedTermWeeks, setSelectedTermWeeks] = useState<number>(26);
  const [loanFeedback, setLoanFeedback] = useState<{ text: string; tone: 'success' | 'error' | 'neutral' } | null>(null);

  const availableYears = useMemo(() => {
    const historyYears = player.finance.yearly.map(y => y.year);
    return [player.age, ...historyYears].sort((a, b) => b - a);
  }, [player.age, player.finance.yearly]);

  const yearData = useMemo(() => {
    if (selectedYear === player.age) {
      const ytdTx = player.finance.history.filter(t => t.year === selectedYear);
      const income = ytdTx.filter(t => t.amount > 0 && t.category !== 'LOAN').reduce((sum, t) => sum + t.amount, 0);
      const expense = ytdTx.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const breakdown = INCOME_CATEGORIES.map(cat => {
        const amount = ytdTx.filter(t => t.amount > 0 && t.category === cat).reduce((sum, t) => sum + t.amount, 0);
        return { label: cat, amount, percent: income > 0 ? (amount / income) * 100 : 0 };
      }).sort((a, b) => b.amount - a.amount);

      return { income, expense, breakdown, history: ytdTx };
    }

    const record = player.finance.yearly.find(y => y.year === selectedYear);
    const income = record?.totalIncome || 0;
    const expense = record?.totalExpenses || 0;
    const breakdown = INCOME_CATEGORIES.map(cat => {
      const amount = record?.incomeByCategory[cat] || 0;
      return { label: cat, amount, percent: income > 0 ? (amount / income) * 100 : 0 };
    }).sort((a, b) => b.amount - a.amount);
    const history = player.finance.history.filter(t => t.year === selectedYear);
    return { income, expense, breakdown, history };
  }, [selectedYear, player.finance, player.age]);

  const requestedAmount = useMemo(() => {
    const parsed = Math.floor(Number(requestedAmountInput.replace(/[^0-9]/g, '')));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [requestedAmountInput]);

  const activeLoans = useMemo(
    () => (player.finance.loans || []).filter(loan => loan.status === 'ACTIVE'),
    [player.finance.loans]
  );
  const financeCredit = player.finance.credit || {
    successfulPayments: 0,
    missedPayments: 0,
    defaults: 0,
    totalBorrowed: 0,
    totalRepaid: 0,
  };

  const creditScore = useMemo(() => getCreditScore(player), [player]);
  const creditTier = getCreditTier(creditScore);
  const creditColor =
    creditTier === 'Elite'
      ? 'text-emerald-400'
      : creditTier === 'Strong'
        ? 'text-sky-400'
        : creditTier === 'Fair'
          ? 'text-amber-400'
          : 'text-rose-400';

  const safeBorrowingCapacity = useMemo(() => getSafeBorrowingCapacity(player), [player]);
  const absoluteBorrowingCeiling = useMemo(() => getAbsoluteBorrowingCeiling(player), [player]);
  const outstandingDebt = useMemo(() => getOutstandingLoanBalance(player), [player]);
  const weeklyDebtBurden = useMemo(() => getWeeklyDebtBurden(player), [player]);
  const weeklyCashFlow = useMemo(() => getAverageWeeklyCashFlow(player), [player]);
  const estimatedNetWorth = useMemo(() => getEstimatedNetWorth(player), [player]);

  const annualRate = useMemo(
    () => getLoanAnnualRate(player, Math.max(1, requestedAmount), selectedTermWeeks),
    [player, requestedAmount, selectedTermWeeks]
  );
  const weeklyPayment = useMemo(
    () => calculateWeeklyLoanPayment(Math.max(1, requestedAmount), annualRate, selectedTermWeeks),
    [requestedAmount, annualRate, selectedTermWeeks]
  );
  const approvalOdds = useMemo(
    () => getLoanApprovalOdds(player, requestedAmount, selectedTermWeeks),
    [player, requestedAmount, selectedTermWeeks]
  );

  const requestTooSmall = requestedAmount < 50000;
  const requestTooLarge = requestedAmount > absoluteBorrowingCeiling;
  const totalRepayment = weeklyPayment * selectedTermWeeks;
  const approvalLabel = getLoanDecisionLabel(approvalOdds);
  const nextTermLabel = TERM_OPTIONS.find(option => option.weeks === selectedTermWeeks)?.label || `${selectedTermWeeks}w`;
  const netIncome = yearData.income - yearData.expense;
  const savingsRate = yearData.income > 0 ? ((yearData.income - yearData.expense) / yearData.income) * 100 : 0;

  const transactionHistory = useMemo(() => {
    const loansForHistory = player.finance.history.filter(tx => tx.category === 'LOAN');
    const generalHistory = yearData.history.filter(tx => tx.category !== 'LOAN');
    return selectedYear === player.age ? [...loansForHistory, ...generalHistory] : yearData.history;
  }, [player.finance.history, yearData.history, selectedYear, player.age]);

  const handleApplyForLoan = () => {
    if (requestTooSmall) {
      setLoanFeedback({ tone: 'error', text: 'Request at least $50k so the bank can underwrite it properly.' });
      return;
    }
    if (requestTooLarge || approvalOdds <= 0) {
      setLoanFeedback({ tone: 'error', text: 'That request is outside your current lending ceiling. Try a smaller amount or improve your credit.' });
      return;
    }

    const loan = createPlayerLoan(player, requestedAmount, selectedTermWeeks);
    const updatedPlayer: Player = {
      ...player,
      money: player.money + requestedAmount,
      finance: {
        ...player.finance,
        loans: [...(player.finance.loans || []), loan],
        credit: {
          ...financeCredit,
          totalBorrowed: (financeCredit.totalBorrowed || 0) + requestedAmount,
          lastLoanAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        },
        history: [
          {
            id: `tx_loan_issue_${Date.now()}`,
            week: player.currentWeek,
            year: player.age,
            amount: requestedAmount,
            category: 'LOAN',
            description: `${loan.lenderName} personal loan funded`,
          },
          ...player.finance.history,
        ].slice(0, 200),
      },
      logs: [
        ...player.logs,
        {
          week: player.currentWeek,
          year: player.age,
          type: 'neutral',
          message: `🏦 Approved ${formatMoney(requestedAmount)} from ${loan.lenderName}. Weekly payment: ${formatMoney(loan.weeklyPayment)} for ${selectedTermWeeks} weeks.`,
        },
      ],
    };

    onUpdatePlayer(updatedPlayer);
    setLoanFeedback({
      tone: 'success',
      text: `${loan.lenderName} approved ${formatMoney(requestedAmount)}. First repayment is ${formatMoney(loan.weeklyPayment)} next week.`,
    });
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-zinc-950 font-sans text-white animate-in slide-in-from-right duration-300">
      <div className="relative shrink-0 overflow-hidden bg-[#004b87] p-4 pb-6 pt-12 shadow-xl transition-all">
        <div className="relative z-20 mb-4 flex items-start justify-between">
          <button onClick={onBack} className="rounded-full bg-black/10 p-1 text-white/80 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-end">
            <button
              onClick={() => setShowYearMenu(!showYearMenu)}
              className="flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-xs font-bold transition-colors hover:bg-black/30"
            >
              {selectedYear === player.age ? `Current Year (${selectedYear})` : `Year ${selectedYear}`} <ChevronDown size={14} />
            </button>
            {showYearMenu && (
              <div className="absolute right-0 top-10 z-50 flex w-32 flex-col gap-1 rounded-xl bg-white py-2 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {availableYears.map(y => (
                  <button
                    key={y}
                    onClick={() => {
                      setSelectedYear(y);
                      setShowYearMenu(false);
                    }}
                    className={`px-4 py-2 text-left text-xs font-bold hover:bg-slate-100 ${selectedYear === y ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    {y === player.age ? `Current (${y})` : `Year ${y}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">Total Liquid Assets</div>
          <div className={`font-mono leading-none tracking-tight text-white ${player.money > 99999999 ? 'text-3xl' : 'text-4xl'} font-bold`}>
            {formatMoney(player.money)}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/75">
            <BadgeDollarSign size={14} />
            <span>Safe borrowing room: {formatMoney(safeBorrowingCapacity)}</span>
          </div>
        </div>

        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
      </div>

      <div className="sticky top-0 z-30 flex border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <button
          onClick={() => setTab('OVERVIEW')}
          className={`flex flex-1 items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-wider ${tab === 'OVERVIEW' ? 'border-b-2 border-blue-400 bg-zinc-900 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Wallet size={14} />
          Overview
        </button>
        <button
          onClick={() => setTab('BREAKDOWN')}
          className={`flex flex-1 items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-wider ${tab === 'BREAKDOWN' ? 'border-b-2 border-blue-400 bg-zinc-900 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <PieChart size={14} />
          Breakdown
        </button>
        <button
          onClick={() => setTab('HISTORY')}
          className={`flex flex-1 items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-wider ${tab === 'HISTORY' ? 'border-b-2 border-blue-400 bg-zinc-900 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <CreditCard size={14} />
          Passbook
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-black p-4">
        {tab === 'OVERVIEW' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Credit Rating</div>
                  <div className={`text-lg font-bold ${creditColor}`}>
                    {creditScore} <span className="text-sm font-normal text-zinc-500">• {creditTier}</span>
                  </div>
                </div>
              </div>
              <div className="relative h-10 w-10">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className={creditTier === 'Elite' ? 'text-emerald-500' : creditTier === 'Strong' ? 'text-sky-500' : creditTier === 'Fair' ? 'text-amber-500' : 'text-rose-500'}
                    strokeDasharray={`${(creditScore / 850) * 100}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Outstanding Debt" value={formatMoney(outstandingDebt)} tone="text-amber-300" icon={<Landmark size={42} className="absolute -bottom-2 -right-2 text-amber-500/10" />} />
              <MetricCard label="Weekly Debt Load" value={formatMoney(weeklyDebtBurden)} tone="text-rose-300" icon={<Clock3 size={42} className="absolute -bottom-2 -right-2 text-rose-500/10" />} />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Personal Loan Request</div>
                  <div className="mt-1 text-xs text-zinc-400">Custom amount, dynamic underwriting, automatic weekly repayment.</div>
                </div>
                <div className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  {approvalLabel}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Requested Amount</label>
                  <input
                    value={requestedAmountInput}
                    onChange={(e) => setRequestedAmountInput(e.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-lg font-bold text-white outline-none ring-0 transition-colors focus:border-blue-500"
                    placeholder="2500000"
                  />
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Safe range: up to {formatMoney(safeBorrowingCapacity)}</span>
                    <span>Hard ceiling: {formatMoney(absoluteBorrowingCeiling)}</span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Term</div>
                  <div className="grid grid-cols-4 gap-2">
                    {TERM_OPTIONS.map(option => (
                      <button
                        key={option.weeks}
                        onClick={() => setSelectedTermWeeks(option.weeks)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${selectedTermWeeks === option.weeks ? 'border-blue-400 bg-blue-500/10 text-blue-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DetailChip label="Rate" value={formatPercent(annualRate)} />
                  <DetailChip label="Weekly Payment" value={formatMoney(weeklyPayment)} />
                  <DetailChip label="Total Repayment" value={formatMoney(totalRepayment)} />
                  <DetailChip label="Approval" value={`${Math.round(approvalOdds * 100)}%`} />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Net worth</span>
                    <span className="font-mono text-zinc-200">{formatMoney(estimatedNetWorth)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Avg weekly free cash flow</span>
                    <span className={`font-mono ${weeklyCashFlow.freeCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatMoney(Math.round(weeklyCashFlow.freeCashFlow))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Debt after this loan</span>
                    <span className="font-mono text-zinc-200">{formatMoney(outstandingDebt + requestedAmount)}</span>
                  </div>
                </div>

                {(requestTooSmall || requestTooLarge) && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      {requestTooSmall
                        ? 'Banks will not underwrite a request that small here. Raise it above $50k.'
                        : 'This request is above your current absolute ceiling. Lower the amount or improve your credit standing first.'}
                    </span>
                  </div>
                )}

                {loanFeedback && (
                  <div className={`rounded-xl border p-3 text-xs ${
                    loanFeedback.tone === 'success'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                      : loanFeedback.tone === 'error'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                  }`}>
                    {loanFeedback.text}
                  </div>
                )}

                <button
                  onClick={handleApplyForLoan}
                  disabled={requestTooSmall || requestTooLarge || approvalOdds <= 0}
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-zinc-950 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  Apply for {formatMoney(requestedAmount || 0)} • {nextTermLabel}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">Active Loans</div>
                  <div className="text-[11px] text-zinc-500">Debt never beats premium cash because it always comes back for you weekly.</div>
                </div>
                <div className="text-sm font-bold text-white">{activeLoans.length}</div>
              </div>

              {activeLoans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                    <Landmark size={20} />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-white">No Active Loans</h3>
                  <p className="text-xs text-zinc-500">You are debt-free right now. Borrow only if the growth is worth the pressure.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLoans.map(loan => (
                    <div key={loan.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-white">{loan.lenderName}</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">{formatPercent(loan.annualInterestRate)} APR • {loan.weeksRemaining} weeks left</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">Balance</div>
                          <div className="font-mono text-sm font-bold text-amber-200">{formatMoney(loan.principal)}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <LoanMiniStat label="Weekly" value={formatMoney(loan.weeklyPayment)} />
                        <LoanMiniStat label="Original" value={formatMoney(loan.originalPrincipal)} />
                        <LoanMiniStat label="Missed" value={`${loan.missedPayments}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard label={`Income (${selectedYear})`} value={formatMoney(yearData.income)} tone="text-emerald-400" icon={<TrendingUp size={48} className="absolute -bottom-2 -right-2 text-emerald-500/5" />} />
              <MetricCard label={`Expenses (${selectedYear})`} value={`-${formatMoney(yearData.expense)}`} tone="text-rose-400" icon={<TrendingDown size={48} className="absolute -bottom-2 -right-2 text-rose-500/5" />} />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">Net Income</div>
                <div className={`font-mono font-bold ${netIncome >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  {netIncome >= 0 ? '+' : ''}{formatMoney(netIncome)}
                </div>
              </div>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className={`h-full ${netIncome >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(savingsRate))}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Savings Rate</span>
                <span>{savingsRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'BREAKDOWN' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Income Sources ({selectedYear})</h3>
              <div className="font-mono text-xs font-bold text-emerald-400">+{formatMoney(yearData.income)}</div>
            </div>

            <div className="space-y-3">
              {yearData.breakdown.map(cat => (
                <div key={cat.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <div className="mb-2 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${cat.amount > 0 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
                      <span className="text-sm font-bold capitalize text-zinc-300">{cat.label.toLowerCase().replace('_', ' ')}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">{formatMoney(cat.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-950">
                    <div
                      className={`h-full ${
                        cat.label === 'ROYALTY'
                          ? 'bg-amber-500'
                          : cat.label === 'SALARY'
                            ? 'bg-blue-500'
                            : cat.label === 'SPONSORSHIP'
                              ? 'bg-emerald-500'
                              : cat.label === 'BUSINESS'
                                ? 'bg-violet-500'
                                : 'bg-cyan-500'
                      }`}
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {yearData.income === 0 && <div className="py-10 text-center text-sm text-zinc-600">No operating income recorded for {selectedYear}.</div>}
          </div>
        )}

        {tab === 'HISTORY' && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
            <div className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Passbook • {selectedYear}</div>
            {transactionHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 py-10 text-center text-sm text-zinc-600">
                No transaction history available for this period.
              </div>
            ) : (
              transactionHistory.map(tx => (
                <div key={tx.id} className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-full p-2 ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {tx.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="max-w-[170px] truncate text-sm font-bold text-white sm:max-w-[220px]">{tx.description}</div>
                      <div className="text-[10px] text-zinc-500">Wk {tx.week} • {tx.category}</div>
                    </div>
                  </div>
                  <div className={`font-mono text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
    <div className="relative z-10">
      <div className="mb-1 text-[10px] font-bold uppercase text-zinc-500">{label}</div>
      <div className={`truncate text-lg font-bold ${tone}`}>{value}</div>
    </div>
    {icon}
  </div>
);

const DetailChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    <div className="mt-1 font-mono text-sm font-bold text-white">{value}</div>
  </div>
);

const LoanMiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    <div className="mt-1 font-mono font-bold text-white">{value}</div>
  </div>
);
