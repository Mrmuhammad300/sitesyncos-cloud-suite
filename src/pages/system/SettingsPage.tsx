import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { User, Bell, Palette } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "sitesyncos-appearance";

function loadAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { darkMode: boolean; compactTables: boolean; landingPage: string };
  } catch {
    /* ignore malformed storage */
  }
  return { darkMode: document.documentElement.classList.contains("dark"), compactTables: false, landingPage: "dashboard" };
}

export default function SettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [appearance, setAppearance] = useState(loadAppearance);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    document.documentElement.classList.toggle("dark", appearance.darkMode);
    document.documentElement.dataset.compactTables = appearance.compactTables ? "true" : "false";
  }, [appearance]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await import("@/integrations/supabase/client").then(m =>
      m.supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    );
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent — check your inbox");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform configuration and user preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-3.5 w-3.5 mr-1.5" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription className="text-xs">Your personal information and role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={user?.email ?? ""} disabled className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <div><Badge variant="outline">{profile?.role ?? "field_staff"}</Badge></div>
                <p className="text-xs text-muted-foreground">Role changes must be made by an administrator.</p>
              </div>
              <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription className="text-xs">Password and authentication settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button size="sm" variant="outline" onClick={handleChangePassword}>
                Send Password Reset Email
              </Button>
              <p className="text-xs text-muted-foreground">
                A reset link will be sent to {user?.email ?? "your email"}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Choose which notifications you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "RFI Updates", desc: "When an RFI is assigned to you or updated" },
                { label: "Draw Request Approvals", desc: "When a draw is approved or rejected" },
                { label: "Budget Alerts", desc: "When a budget line exceeds threshold" },
                { label: "Daily Report Reminders", desc: "Reminder to file end-of-day reports" },
                { label: "System Announcements", desc: "Platform updates and maintenance" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme & Display</CardTitle>
              <CardDescription className="text-xs">Preferences are saved locally to this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Use dark theme across the platform</p>
                </div>
                <Switch
                  checked={appearance.darkMode}
                  onCheckedChange={(v) => setAppearance((p) => ({ ...p, darkMode: v }))}
                />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs">Default Landing Page</Label>
                <Select
                  value={appearance.landingPage}
                  onValueChange={(v) => setAppearance((p) => ({ ...p, landingPage: v }))}
                >
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="notifications">Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Compact Tables</p>
                  <p className="text-xs text-muted-foreground">Reduce row height in data tables</p>
                </div>
                <Switch
                  checked={appearance.compactTables}
                  onCheckedChange={(v) => setAppearance((p) => ({ ...p, compactTables: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
