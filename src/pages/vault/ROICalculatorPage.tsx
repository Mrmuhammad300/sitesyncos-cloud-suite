import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Percent, DollarSign, ArrowUpRight } from "lucide-react";

export default function ROICalculatorPage() {
  const [purchasePrice, setPurchasePrice] = useState(10000000);
  const [noi, setNoi] = useState(650000);
  const [holdPeriod, setHoldPeriod] = useState(7);
  const [exitCapRate, setExitCapRate] = useState(6.0);
  const [noiGrowth, setNoiGrowth] = useState(3.0);
  const [discountRate, setDiscountRate] = useState(10.0);
  const [loanToValue, setLoanToValue] = useState(70);
  const [interestRate, setInterestRate] = useState(5.5);

  const capRate = ((noi / purchasePrice) * 100).toFixed(2);
  const equity = purchasePrice * (1 - loanToValue / 100);
  const loanAmount = purchasePrice * (loanToValue / 100);
  const annualDebtService = loanAmount * (interestRate / 100);
  const cashOnCash = (((noi - annualDebtService) / equity) * 100).toFixed(2);

  // Simple NPV / IRR approximation
  const cashFlows: number[] = [-equity];
  let currentNoi = noi;
  for (let y = 1; y <= holdPeriod; y++) {
    currentNoi *= 1 + noiGrowth / 100;
    const cf = currentNoi - annualDebtService;
    if (y === holdPeriod) {
      const exitValue = currentNoi / (exitCapRate / 100);
      const remainingLoan = loanAmount * 0.85; // simplified
      cashFlows.push(cf + exitValue - remainingLoan);
    } else {
      cashFlows.push(cf);
    }
  }

  const npv = cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + discountRate / 100, i), 0);
  const equityMultiple = (cashFlows.reduce((sum, cf, i) => i > 0 ? sum + cf : sum, 0) / equity).toFixed(2);

  // Simple IRR approximation via bisection
  const calcNpvAtRate = (rate: number) => cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);
  let lo = -0.5, hi = 1.0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (calcNpvAtRate(mid) > 0) lo = mid; else hi = mid;
  }
  const irr = ((lo + hi) / 2 * 100).toFixed(1);

  const fmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">ROI Calculator</h1>
        <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">Analyze investment returns with NPV, IRR, and Cap Rate models.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Assumptions</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs">Purchase Price</Label>
              <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(+e.target.value)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Annual NOI</Label>
              <Input type="number" value={noi} onChange={(e) => setNoi(+e.target.value)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Hold Period: {holdPeriod} years</Label>
              <Slider value={[holdPeriod]} onValueChange={([v]) => setHoldPeriod(v)} min={1} max={15} step={1} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Exit Cap Rate: {exitCapRate}%</Label>
              <Slider value={[exitCapRate]} onValueChange={([v]) => setExitCapRate(v)} min={3} max={12} step={0.1} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">NOI Growth: {noiGrowth}%/yr</Label>
              <Slider value={[noiGrowth]} onValueChange={([v]) => setNoiGrowth(v)} min={0} max={8} step={0.5} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Loan-to-Value: {loanToValue}%</Label>
              <Slider value={[loanToValue]} onValueChange={([v]) => setLoanToValue(v)} min={0} max={90} step={5} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Interest Rate: {interestRate}%</Label>
              <Slider value={[interestRate]} onValueChange={([v]) => setInterestRate(v)} min={2} max={12} step={0.25} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Discount Rate: {discountRate}%</Label>
              <Slider value={[discountRate]} onValueChange={([v]) => setDiscountRate(v)} min={4} max={20} step={0.5} />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><Percent className="h-4 w-4 mx-auto mb-1 text-primary" /><p className="text-xl font-bold">{capRate}%</p><p className="text-[10px] text-muted-foreground">Going-In Cap Rate</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" /><p className="text-xl font-bold text-success">{irr}%</p><p className="text-[10px] text-muted-foreground">IRR</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><DollarSign className="h-4 w-4 mx-auto mb-1 text-accent" /><p className="text-xl font-bold">{fmt(npv)}</p><p className="text-[10px] text-muted-foreground">NPV</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><ArrowUpRight className="h-4 w-4 mx-auto mb-1 text-warning" /><p className="text-xl font-bold">{equityMultiple}x</p><p className="text-[10px] text-muted-foreground">Equity Multiple</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Deal Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                <div><p className="text-xs text-muted-foreground">Purchase Price</p><p className="text-sm font-bold">{fmt(purchasePrice)}</p></div>
                <div><p className="text-xs text-muted-foreground">Equity Required</p><p className="text-sm font-bold">{fmt(equity)}</p></div>
                <div><p className="text-xs text-muted-foreground">Loan Amount</p><p className="text-sm font-bold">{fmt(loanAmount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Annual Debt Service</p><p className="text-sm font-bold">{fmt(annualDebtService)}</p></div>
                <div><p className="text-xs text-muted-foreground">Cash-on-Cash Return</p><p className="text-sm font-bold text-success">{cashOnCash}%</p></div>
                <div><p className="text-xs text-muted-foreground">Year 1 Cash Flow</p><p className="text-sm font-bold">{fmt(noi - annualDebtService)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Projected Cash Flows</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-fit">
                  {cashFlows.map((cf, i) => (
                    <div key={i} className="text-center min-w-[80px]">
                      <p className="text-[10px] text-muted-foreground mb-1">{i === 0 ? "Initial" : `Year ${i}`}</p>
                      <p className={`text-xs font-bold ${cf >= 0 ? "text-success" : "text-destructive"}`}>{fmt(Math.abs(cf))}</p>
                      <div className={`h-1 rounded-full mt-1 ${cf >= 0 ? "bg-success/30" : "bg-destructive/30"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
