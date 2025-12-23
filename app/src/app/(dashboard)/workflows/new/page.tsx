'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Zap, Loader2 } from 'lucide-react';
import type { Platform } from '@/types';

type Step = 'name' | 'trigger' | 'actions' | 'review';

interface Connection {
  id: string;
  platform: Platform;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string | null;
  is_active: boolean;
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; logo?: string; color: string }> = {
  youtube: { name: 'YouTube', icon: '▶️', logo: '/youtube-logo.webp', color: '#FF0000' },
  linkedin: { name: 'LinkedIn', icon: '💼', logo: '/linkedin-logo.webp', color: '#0A66C2' },
  instagram: { name: 'Instagram', icon: '📸', color: '#E4405F' },
  twitter: { name: 'Twitter / X', icon: '𝕏', color: '#1DA1F2' },
  tiktok: { name: 'TikTok', icon: '🎵', color: '#000000' },
  facebook: { name: 'Facebook', icon: '📘', color: '#1877F2' },
  threads: { name: 'Threads', icon: '🧵', color: '#000000' },
};

export default function NewWorkflowPage() {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerConnectionId, setTriggerConnectionId] = useState<string | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const router = useRouter();
  const supabase = createClient();

  // Fetch user's connections
  useEffect(() => {
    async function fetchConnections() {
      setLoadingConnections(true);
      const { data, error } = await supabase
        .from('connections')
        .select('id, platform, platform_username, platform_display_name, platform_avatar_url, is_active')
        .eq('is_active', true)
        .in('platform', ['youtube', 'linkedin']); // Only YouTube and LinkedIn for now

      if (!error && data) {
        setConnections(data as Connection[]);
      }
      setLoadingConnections(false);
    }

    fetchConnections();
  }, [supabase]);

  // Get the selected trigger connection
  const triggerConnection = connections.find((c) => c.id === triggerConnectionId);

  // Get available action connections (exclude trigger)
  const actionConnections = connections.filter((c) => c.id !== triggerConnectionId);

  const steps: { id: Step; label: string }[] = [
    { id: 'name', label: 'Name' },
    { id: 'trigger', label: 'Trigger' },
    { id: 'actions', label: 'Actions' },
    { id: 'review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const canProceed = () => {
    switch (step) {
      case 'name':
        return name.trim().length > 0;
      case 'trigger':
        return triggerConnectionId !== null;
      case 'actions':
        return selectedActionIds.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  };

  const toggleAction = (connectionId: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(connectionId)
        ? prev.filter((id) => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const handleCreate = async () => {
    if (!triggerConnectionId || selectedActionIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's team (for now, use user_id as team_id placeholder)
      const teamId = user.id;

      // Create workflow with trigger connection
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({
          team_id: teamId,
          name,
          description: description || null,
          is_active: false,
          trigger_connection_id: triggerConnectionId,
          trigger_action: 'on_new_post',
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create workflow steps for each target connection
      const workflowSteps = selectedActionIds.map((connectionId, index) => {
        const connection = connections.find((c) => c.id === connectionId);
        return {
          workflow_id: workflow.id,
          step_order: index + 1,
          step_type: 'publish' as const,
          target_connection_id: connectionId,
          config: {
            type: 'publish',
            platform: connection?.platform,
            use_original_caption: true,
          },
        };
      });

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(workflowSteps);

      if (stepsError) throw stepsError;

      router.push(`/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workflows">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Workflow</h1>
          <p className="text-zinc-400">Set up a new automation</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < currentStepIndex
                  ? 'bg-teal-500 text-white'
                  : i === currentStepIndex
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  i < currentStepIndex ? 'bg-teal-500' : 'bg-zinc-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">
            {step === 'name' && 'Name your workflow'}
            {step === 'trigger' && 'Choose a trigger'}
            {step === 'actions' && 'Select actions'}
            {step === 'review' && 'Review & create'}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {step === 'name' && 'Give your workflow a memorable name'}
            {step === 'trigger' && 'Select the platform that will trigger this workflow'}
            {step === 'actions' && 'Choose where to publish content'}
            {step === 'review' && 'Review your workflow configuration'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Workflow name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Instagram to YouTube"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="What does this workflow do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 'trigger' && (
            <div className="grid gap-3">
              {loadingConnections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-zinc-400">No accounts connected</p>
                  <Button asChild variant="outline" className="border-zinc-700">
                    <Link href="/accounts">Connect YouTube or LinkedIn</Link>
                  </Button>
                </div>
              ) : (
                connections.map((connection) => {
                  const info = PLATFORM_INFO[connection.platform];
                  return (
                    <button
                      key={connection.id}
                      onClick={() => setTriggerConnectionId(connection.id)}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                        triggerConnectionId === connection.id
                          ? 'bg-teal-500/10 border-teal-500'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className="h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: `${info?.color}20` }}
                      >
                        {info?.logo ? (
                          <img
                            src={info.logo}
                            alt={info.name}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <span className="text-2xl">{info?.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {connection.platform_display_name || connection.platform_username}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {info?.name} • Trigger on new content
                        </p>
                      </div>
                      {triggerConnectionId === connection.id && (
                        <Check className="h-5 w-5 text-teal-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {step === 'actions' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {actionConnections.length === 0 ? (
                <div className="col-span-2 text-center py-8 space-y-3">
                  <p className="text-zinc-400">No other accounts to publish to</p>
                  <Button asChild variant="outline" className="border-zinc-700">
                    <Link href="/accounts">Connect more accounts</Link>
                  </Button>
                </div>
              ) : (
                actionConnections.map((connection) => {
                  const info = PLATFORM_INFO[connection.platform];
                  return (
                    <button
                      key={connection.id}
                      onClick={() => toggleAction(connection.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
                        selectedActionIds.includes(connection.id)
                          ? 'bg-teal-500/10 border-teal-500'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: `${info?.color}20` }}
                      >
                        {info?.logo ? (
                          <img
                            src={info.logo}
                            alt={info.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <span className="text-xl">{info?.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {connection.platform_display_name || connection.platform_username}
                        </p>
                        <p className="text-xs text-zinc-500">{info?.name}</p>
                      </div>
                      {selectedActionIds.includes(connection.id) && (
                        <Check className="h-4 w-4 text-teal-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-800/50 space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Name
                  </p>
                  <p className="text-white font-medium">{name}</p>
                </div>
                {description && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">
                      Description
                    </p>
                    <p className="text-zinc-300">{description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-800/50">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-teal-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Trigger
                  </p>
                  <p className="text-white">
                    {triggerConnection?.platform_display_name || triggerConnection?.platform_username}
                    <span className="text-zinc-500 ml-2">
                      ({PLATFORM_INFO[triggerConnection?.platform || '']?.name})
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-800/50 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Publish to
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedActionIds.map((actionId) => {
                    const connection = connections.find((c) => c.id === actionId);
                    const info = PLATFORM_INFO[connection?.platform || ''];
                    return (
                      <Badge
                        key={actionId}
                        variant="outline"
                        className="border-zinc-700 text-zinc-300"
                      >
                        {info?.icon} {connection?.platform_display_name || connection?.platform_username}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="border-zinc-700 text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step === 'review' ? (
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-600"
          >
            {loading ? 'Creating...' : 'Create Workflow'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-teal-500 hover:bg-teal-600"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
