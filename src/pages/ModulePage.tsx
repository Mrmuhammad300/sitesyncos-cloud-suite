import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface ModulePageProps {
  title: string;
  description: string;
  module: string;
}

export default function ModulePage({ title, description, module }: ModulePageProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <Badge variant="outline" className="text-[10px] font-medium">
              {module}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button size="sm">
          + New
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Module Under Development</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The {title} module is part of the BuildOS platform. Connect a backend to activate full functionality including data persistence, workflows, and real-time collaboration.
          </p>
        </CardContent>
      </Card>

      {/* Mock data cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sample Item {i}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md bg-muted/50 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
