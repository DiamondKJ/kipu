'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Zap } from 'lucide-react';
import type { Platform } from '@/types';

type Step = 'name' | 'trigger' | 'actions' | 'review';

const triggerPlatforms: { id: Platform; name: string; icon: string }[] = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'twitter', name: 'Twitter / X', icon: '𝕏' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
];

const actionPlatforms: { id: Platform; name: string; icon: string }[] = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'twitter', name: 'Twitter / X', icon: '𝕏' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'threads', name: 'Threads', icon: '🧵' },
];

export default function NewWorkflowPage() {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerPlatform, setTriggerPlatform] = useState<Platform | null>(null);
  const [selectedActions, setSelectedActions] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

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
        return triggerPlatform !== null;
      case 'actions':
        return selectedActions.length > 0;
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

  const toggleAction = (platform: Platform) => {
    setSelectedActions((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleCreate = async () => {
    if (!triggerPlatform || selectedActions.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's team (for now, use user_id as team_id placeholder)
      const teamId = user.id;

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({
          team_id: teamId,
          name,
          description: description || null,
          is_active: false,
          trigger_action: 'on_new_post',
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create workflow steps for each action
      const steps = selectedActions.map((platform, index) => ({
        workflow_id: workflow.id,
        step_order: index + 1,
        step_type: 'publish' as const,
        config: { platform },
      }));

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(steps);

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
              {triggerPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setTriggerPlatform(platform.id)}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                    triggerPlatform === platform.id
                      ? 'bg-teal-500/10 border-teal-500'
                      : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl">
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{platform.name}</p>
                    <p className="text-sm text-zinc-500">
                      Trigger when new content is posted
                    </p>
                  </div>
                  {triggerPlatform === platform.id && (
                    <Check className="h-5 w-5 text-teal-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 'actions' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {actionPlatforms
                .filter((p) => p.id !== triggerPlatform)
                .map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => toggleAction(platform.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-colors text-left ${
                      selectedActions.includes(platform.id)
                        ? 'bg-teal-500/10 border-teal-500'
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xl">
                      {platform.icon}
                    </div>
                    <p className="font-medium text-white flex-1">{platform.name}</p>
                    {selectedActions.includes(platform.id) && (
                      <Check className="h-4 w-4 text-teal-400" />
                    )}
                  </button>
                ))}
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
                    {triggerPlatforms.find((p) => p.id === triggerPlatform)?.name}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-800/50 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Publish to
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedActions.map((action) => {
                    const platform = actionPlatforms.find((p) => p.id === action);
                    return (
                      <Badge
                        key={action}
                        variant="outline"
                        className="border-zinc-700 text-zinc-300"
                      >
                        {platform?.icon} {platform?.name}
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
