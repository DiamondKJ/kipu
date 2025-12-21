import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
          <CardDescription className="text-zinc-400">
            Your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-zinc-800 text-lg">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" className="border-zinc-700">
                Change avatar
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">
                Display name
              </Label>
              <Input
                id="name"
                defaultValue={user?.user_metadata?.name || ''}
                placeholder="Your name"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue={user?.email || ''}
                disabled
                className="bg-zinc-800 border-zinc-700 text-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                Contact support to change your email
              </p>
            </div>
          </div>

          <Button className="bg-teal-500 hover:bg-teal-600">
            Save changes
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Notifications</CardTitle>
          <CardDescription className="text-zinc-400">
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email notifications</p>
              <p className="text-sm text-zinc-500">
                Receive email updates about your workflows
              </p>
            </div>
            <Switch className="data-[state=checked]:bg-teal-500" />
          </div>

          <Separator className="bg-zinc-800" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Workflow failures</p>
              <p className="text-sm text-zinc-500">
                Get notified when a workflow fails to execute
              </p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-teal-500" />
          </div>

          <Separator className="bg-zinc-800" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Weekly summary</p>
              <p className="text-sm text-zinc-500">
                Receive a weekly summary of your activity
              </p>
            </div>
            <Switch className="data-[state=checked]:bg-teal-500" />
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Connected Accounts</CardTitle>
          <CardDescription className="text-zinc-400">
            Manage your authentication providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Google</p>
                <p className="text-sm text-zinc-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="border-zinc-700" disabled>
              Connected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-zinc-900 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-zinc-400">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete account</p>
              <p className="text-sm text-zinc-500">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
