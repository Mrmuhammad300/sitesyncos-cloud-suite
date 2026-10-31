/**
 * Pure underwriting model for the ROI calculator. The math is a 1:1 extraction
 * of the original page logic (interest-only debt service, 85% loan balance at
 * exit, bisection IRR on [-50%, 100%]) so results are unchanged — it just also
 * returns the per-year breakdown needed for charts and sensitivity tables.
 */
export interface RoiInputs {
  purchasePrice: number;
  noi: number;
  holdPeriod: number;
  exitCapRate: number; // %
  noiGrowth: number; // %/yr
  discountRate: number; // %
  loanToValue: number; // %
  interestRate: number; // %
}

export interface RoiYear {
  year: number;
  label: string;
  noi: number;
  operating: number; // NOI − debt service
  reversion: number; // exit value − remaining loan (final year only)
  total: number;
  cumulative: number;
}

// Debt service is interest-only, so the full principal is still owed at sale.
export const EXIT_LOAN_BALANCE = 1;

export function runRoiModel(i: RoiInputs) {
  const capRate = (i.noi / i.purchasePrice) * 100;
  const equity = i.purchasePrice * (1 - i.loanToValue / 100);
  const loanAmount = i.purchasePrice * (i.loanToValue / 100);
  const annualDebtService = loanAmount * (i.interestRate / 100);
  const cashOnCash = ((i.noi - annualDebtService) / equity) * 100;

  const cashFlows: number[] = [-equity];
  const years: RoiYear[] = [
    { year: 0, label: "Close", noi: 0, operating: -equity, reversion: 0, total: -equity, cumulative: -equity },
  ];
  let currentNoi = i.noi;
  let exitValue = 0;
  const remainingLoan = loanAmount * EXIT_LOAN_BALANCE;
  for (let y = 1; y <= i.holdPeriod; y++) {
    currentNoi *= 1 + i.noiGrowth / 100;
    const cf = currentNoi - annualDebtService;
    let reversion = 0;
    if (y === i.holdPeriod) {
      exitValue = currentNoi / (i.exitCapRate / 100);
      reversion = exitValue - remainingLoan;
    }
    const total = cf + reversion;
    cashFlows.push(total);
    years.push({
      year: y,
      label: `Y${y}`,
      noi: currentNoi,
      operating: cf,
      reversion,
      total,
      cumulative: years[years.length - 1].cumulative + total,
    });
  }

  const npvAt = (rate: number) => cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
  const npv = npvAt(i.discountRate / 100);
  const equityMultiple = cashFlows.reduce((sum, cf, t) => (t > 0 ? sum + cf : sum), 0) / equity;

  let lo = -0.5;
  let hi = 1.0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (npvAt(mid) > 0) lo = mid;
    else hi = mid;
  }
  const irr = ((lo + hi) / 2) * 100;

  const totalProfit = cashFlows.reduce((s, cf) => s + cf, 0);
  const paybackYear = years.find((y) => y.year > 0 && y.cumulative >= 0)?.year ?? null;
  const dscr = annualDebtService > 0 ? i.noi / annualDebtService : null;

  return {
    capRate, equity, loanAmount, annualDebtService, cashOnCash, cashFlows, years, npv, equityMultiple, irr,
    exitValue, remainingLoan, totalProfit, paybackYear, dscr, year1CashFlow: i.noi - annualDebtService,
  };
}

export type RoiResult = ReturnType<typeof runRoiModel>;

export const finite = (n: number, digits = 1, suffix = "") =>
  Number.isFinite(n) ? `${n.toFixed(digits)}${suffix}` : "—";
