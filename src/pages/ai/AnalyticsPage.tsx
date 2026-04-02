import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";

const budgetData = [
  { month: "Jan", budget: 120, actual: 110 },
  { month: "Feb", budget: 150, actual: 145 },
  { month: "Mar", budget: 180, actual: 195 },
  { month: "Apr", budget: 200, actual: 188 },
  { month: "May", budget: 220, actual: 210 },
  { month: "Jun", budget: 250, actual: 235 },
];

const riskData = [
  { month: "Jan", score: 35 }, { month: "Feb", score: 42 }, { month: "Mar", score: 58 },
  { month: "Apr", score: 45 }, { month: "May", score: 38 }, { month: "Jun", score: 32 },
];

const categoryData = [
  { name: "Labor", value: 42, color: "hsl(var(--primary))" },
  { name: "Materials", value: 28, color: "hsl(var(--accent))" },
  { name: "Equipment", value: 18, color: "hsl(221, 83%, 73%)" },
  { name: "Overhead", value: 12, color: "hsl(var(--muted-foreground))" },
];

const chartConfig = {
  budget: { label: "Budget", color: "hsl(var(--muted-foreground))" },
  actual: { label: "Actual", color: "hsl(var(--primary))" },
  score: { label: "Risk Score", color: "hsl(0, 84%, 60%)" },
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered insights and performance analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" />Budget Efficiency</div><p className="text-2xl font-bold">94.2%</p><p className="text-xs text-emerald-500">+2.1% from last month</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3.5 w-3.5" />Risk Score</div><p className="text-2xl font-bold">32</p><p className="text-xs text-emerald-500">-6 pts improvement</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Activity className="h-3.5 w-3.5" />Active Issues</div><p className="text-2xl font-bold">14</p><p className="text-xs text-amber-500">3 critical</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="h-3.5 w-3.5" />On-Time Rate</div><p className="text-2xl font-bold">87%</p><p className="text-xs text-emerald-500">Above target</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget vs Actual ($K)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="budget" fill="var(--color-budget)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="var(--color-actual)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Score Trend</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <LineChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Cost Breakdown by Category</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <div className="h-[250px] w-full max-w-[400px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
