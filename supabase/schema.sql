-- Kipu Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members (for future multi-user support)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- ============================================
-- CONNECTIONS (Platform OAuth Connections)
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Using user_id as team for MVP
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'twitter', 'linkedin', 'facebook', 'threads')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT,
    platform_display_name TEXT,
    platform_avatar_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, platform, platform_user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_connections_team_platform ON connections(team_id, platform);
CREATE INDEX IF NOT EXISTS idx_connections_active ON connections(is_active) WHERE is_active = true;

-- ============================================
-- WORKFLOWS
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    trigger_connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
    trigger_action TEXT NOT NULL DEFAULT 'on_new_post' CHECK (trigger_action IN ('on_new_post', 'on_schedule', 'manual')),
    trigger_config JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_team ON workflows(team_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active) WHERE is_active = true;

-- ============================================
-- WORKFLOW STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('publish', 'ai_rewrite', 'delay', 'condition', 'webhook')),
    target_connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);

-- ============================================
-- WORKFLOW EXECUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_post_id TEXT, -- External post ID that triggered this
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);

-- ============================================
-- EXECUTION STEP RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS execution_step_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    output JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_results_execution ON execution_step_results(execution_id);

-- ============================================
-- SCHEDULED POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[] DEFAULT '{}',
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
    published_post_id TEXT, -- External post ID after publishing
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_team ON scheduled_posts(team_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_for) WHERE status = 'scheduled';

-- ============================================
-- MEDIA LIBRARY
-- ============================================
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER, -- For videos
    thumbnail_path TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_files_team ON media_files(team_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(mime_type);

-- ============================================
-- CONTENT TRACKING (For trigger detection)
-- ============================================
CREATE TABLE IF NOT EXISTS tracked_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    external_post_id TEXT NOT NULL,
    post_type TEXT, -- 'post', 'reel', 'story', 'video', etc.
    content_url TEXT,
    media_urls TEXT[] DEFAULT '{}',
    caption TEXT,
    posted_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    UNIQUE(connection_id, external_post_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_content_connection ON tracked_content(connection_id);
CREATE INDEX IF NOT EXISTS idx_tracked_content_unprocessed ON tracked_content(processed) WHERE processed = false;

-- ============================================
-- POSTS (Content posted through Kipu)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_post_id TEXT, -- External post ID on the platform
    content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'image', 'text', 'carousel')),
    title TEXT,
    caption TEXT,
    media_urls TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    platform_url TEXT, -- URL to the post on the platform
    source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- If this was cross-posted from another post
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_team ON posts(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_connection ON posts(connection_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at) WHERE status = 'published';

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'content_detected', 'cross_post_started', 'cross_post_completed', 'cross_post_failed',
        'workflow_triggered', 'connection_added', 'connection_removed', 'post_scheduled', 'post_published'
    )),
    source_platform TEXT,
    target_platform TEXT,
    source_connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
    target_connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    content_title TEXT,
    content_preview TEXT,
    content_thumbnail_url TEXT,
    source_url TEXT,
    target_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_team ON activity_log(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Users can view their own connections"
    ON connections FOR SELECT
    USING (auth.uid() = team_id);

CREATE POLICY "Users can create their own connections"
    ON connections FOR INSERT
    WITH CHECK (auth.uid() = team_id);

CREATE POLICY "Users can update their own connections"
    ON connections FOR UPDATE
    USING (auth.uid() = team_id);

CREATE POLICY "Users can delete their own connections"
    ON connections FOR DELETE
    USING (auth.uid() = team_id);

-- Workflows policies
CREATE POLICY "Users can view their own workflows"
    ON workflows FOR SELECT
    USING (auth.uid() = team_id);

CREATE POLICY "Users can create their own workflows"
    ON workflows FOR INSERT
    WITH CHECK (auth.uid() = team_id);

CREATE POLICY "Users can update their own workflows"
    ON workflows FOR UPDATE
    USING (auth.uid() = team_id);

CREATE POLICY "Users can delete their own workflows"
    ON workflows FOR DELETE
    USING (auth.uid() = team_id);

-- Workflow steps policies
CREATE POLICY "Users can view their workflow steps"
    ON workflow_steps FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workflows
        WHERE workflows.id = workflow_steps.workflow_id
        AND workflows.team_id = auth.uid()
    ));

CREATE POLICY "Users can manage their workflow steps"
    ON workflow_steps FOR ALL
    USING (EXISTS (
        SELECT 1 FROM workflows
        WHERE workflows.id = workflow_steps.workflow_id
        AND workflows.team_id = auth.uid()
    ));

-- Workflow executions policies
CREATE POLICY "Users can view their workflow executions"
    ON workflow_executions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workflows
        WHERE workflows.id = workflow_executions.workflow_id
        AND workflows.team_id = auth.uid()
    ));

-- Scheduled posts policies
CREATE POLICY "Users can manage their scheduled posts"
    ON scheduled_posts FOR ALL
    USING (auth.uid() = team_id);

-- Media files policies
CREATE POLICY "Users can manage their media files"
    ON media_files FOR ALL
    USING (auth.uid() = team_id);

-- Tracked content policies
CREATE POLICY "Users can view their tracked content"
    ON tracked_content FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM connections
        WHERE connections.id = tracked_content.connection_id
        AND connections.team_id = auth.uid()
    ));

-- Posts policies
CREATE POLICY "Users can view their own posts"
    ON posts FOR SELECT
    USING (auth.uid() = team_id);

CREATE POLICY "Users can manage their own posts"
    ON posts FOR ALL
    USING (auth.uid() = team_id);

-- Activity log policies
CREATE POLICY "Users can view their own activity"
    ON activity_log FOR SELECT
    USING (auth.uid() = team_id);

CREATE POLICY "Users can create their own activity"
    ON activity_log FOR INSERT
    WITH CHECK (auth.uid() = team_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
    BEFORE UPDATE ON workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in separate queries or via Supabase Dashboard

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('media', 'media', true);

-- CREATE POLICY "Users can upload media"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--         bucket_id = 'media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Users can view their media"
--     ON storage.objects FOR SELECT
--     USING (
--         bucket_id = 'media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );

-- CREATE POLICY "Users can delete their media"
--     ON storage.objects FOR DELETE
--     USING (
--         bucket_id = 'media' AND
--         auth.uid()::text = (storage.foldername(name))[1]
--     );
