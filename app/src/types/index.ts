// Platform types
export type Platform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'threads';

// Platforms managed via n8n (no direct OAuth needed)
export type N8nManagedPlatform = 'youtube' | 'linkedin';

export type TriggerPlatform = 'instagram' | 'twitter' | 'facebook';
export type PublishPlatform = Platform;

// n8n Integration Types
export type N8nWebhookConfig = {
  baseUrl: string;
  webhooks: {
    linkedin: {
      post: string;
    };
    youtube: {
      uploadVideo: string;
    };
  };
}

export type N8nPostPayload = {
  platform: N8nManagedPlatform;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  // LinkedIn specific
  linkedin?: {
    visibility: 'PUBLIC' | 'CONNECTIONS';
  };
  // YouTube specific
  youtube?: {
    title: string;
    description: string;
    privacy: 'public' | 'unlisted' | 'private';
    tags?: string[];
    categoryId?: number;
  };
  // Metadata for tracking
  metadata?: {
    workflowRunId?: string;
    postId?: string;
    userId?: string;
  };
}

export type N8nWebhookResponse = {
  success: boolean;
  platform: N8nManagedPlatform;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

// Database types
export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export type Team = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export type TeamMember = {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export type Connection = {
  id: string;
  team_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username: string;
  platform_display_name: string;
  platform_avatar_url: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  is_active: boolean;
  last_polled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type Workflow = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_connection_id: string;
  trigger_action: 'on_new_post';
  created_at: string;
  updated_at: string;
}

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  order_index: number;
  step_type: 'publish' | 'ai_rewrite' | 'delay';
  target_connection_id: string | null;
  config: PublishConfig | AIRewriteConfig | DelayConfig;
  created_at: string;
}

export type PublishConfig = {
  type: 'publish';
  platform: Platform;
  use_original_caption: boolean;
  custom_caption?: string;
  schedule_at?: string;
  // Platform-specific
  youtube?: {
    privacy: 'public' | 'unlisted' | 'private';
    category_id: number;
    tags: string[];
    made_for_kids: boolean;
    notify_subscribers: boolean;
  };
  instagram?: {
    share_to_feed: boolean;
  };
  tiktok?: {
    privacy_level: 'public' | 'friends' | 'private';
    allow_comments: boolean;
    allow_duet: boolean;
    allow_stitch: boolean;
  };
  linkedin?: {
    visibility: 'PUBLIC' | 'CONNECTIONS';
  };
  twitter?: {
    reply_settings: 'everyone' | 'following' | 'mentionedUsers';
  };
}

export type AIRewriteConfig = {
  type: 'ai_rewrite';
  target_platform: Platform;
  tone: 'professional' | 'casual' | 'funny' | 'educational';
  max_length: number;
  include_hashtags: boolean;
  include_emojis: boolean;
  custom_instructions?: string;
}

export type DelayConfig = {
  type: 'delay';
  duration_minutes: number;
}

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trigger_data: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export type WorkflowStepRun = {
  id: string;
  run_id: string;
  step_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export type Post = {
  id: string;
  team_id: string;
  workflow_run_id: string | null;
  connection_id: string;
  platform: Platform;
  platform_post_id: string | null;
  content_type: 'video' | 'image' | 'text' | 'carousel';
  caption: string | null;
  media_urls: string[];
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduled_at: string | null;
  published_at: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Media = {
  id: string;
  team_id: string;
  folder_id: string | null;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type MediaFolder = {
  id: string;
  team_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

// Platform-specific profile types
export type InstagramProfile = {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  account_type: 'BUSINESS' | 'CREATOR';
}

export type YouTubeChannel = {
  id: string;
  title: string;
  description: string;
  custom_url: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
}

export type TikTokProfile = {
  open_id: string;
  union_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export type TwitterProfile = {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
}

export type LinkedInProfile = {
  id: string;
  name: string;
  headline: string;
  profile_picture_url: string;
}

export type FacebookPage = {
  id: string;
  name: string;
  picture_url: string;
  followers_count: number;
  category: string;
}
