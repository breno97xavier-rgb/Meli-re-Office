import type { PrimaryChannel } from './contents';

export type EditorialPlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface ClientStrategy {
  id: string;
  client_id: string;
  positioning?: string | null;
  value_proposition?: string | null;
  target_audience?: string | null;
  brand_voice_tone?: string | null;
  communication_guidelines?: string | null;
  do_donts?: string | null;
  business_goals?: string | null;
  priority_channels: PrimaryChannel[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientPillar {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EditorialPlan {
  id: string;
  client_id: string;
  title: string;
  start_date: string;
  end_date: string;
  primary_goal?: string | null;
  secondary_goals: string[];
  core_message?: string | null;
  target_posts_count: number;
  status: EditorialPlanStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  pillars?: EditorialPlanPillar[];
}

export interface EditorialPlanPillar {
  id: string;
  client_id: string;
  editorial_plan_id: string;
  pillar_id: string;
  target_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations
  pillar?: ClientPillar;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  objective?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: CampaignStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientStrategyInput {
  client_id: string;
  positioning?: string | null;
  value_proposition?: string | null;
  target_audience?: string | null;
  brand_voice_tone?: string | null;
  communication_guidelines?: string | null;
  do_donts?: string | null;
  business_goals?: string | null;
  priority_channels?: PrimaryChannel[];
}

export interface UpdateClientStrategyInput {
  positioning?: string | null;
  value_proposition?: string | null;
  target_audience?: string | null;
  brand_voice_tone?: string | null;
  communication_guidelines?: string | null;
  do_donts?: string | null;
  business_goals?: string | null;
  priority_channels?: PrimaryChannel[];
}

export interface CreateClientPillarInput {
  client_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateClientPillarInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateEditorialPlanInput {
  client_id: string;
  title: string;
  start_date: string;
  end_date: string;
  primary_goal?: string | null;
  secondary_goals?: string[];
  core_message?: string | null;
  target_posts_count?: number;
  status?: EditorialPlanStatus;
  notes?: string | null;
}

export interface UpdateEditorialPlanInput {
  title?: string;
  start_date?: string;
  end_date?: string;
  primary_goal?: string | null;
  secondary_goals?: string[];
  core_message?: string | null;
  target_posts_count?: number;
  status?: EditorialPlanStatus;
  notes?: string | null;
}

export interface CreateCampaignInput {
  client_id: string;
  name: string;
  objective?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: CampaignStatus;
  notes?: string | null;
}

export interface UpdateCampaignInput {
  name?: string;
  objective?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: CampaignStatus;
  notes?: string | null;
}

export interface EditorialPlanPillarAllocationInput {
  pillar_id: string;
  target_count: number;
}

export interface EditorialPlanMetrics {
  target_posts_count: number;
  allocated_posts_count: number;
  unallocated_posts_count: number;
  overallocated: boolean;
  pillar_count: number;
}

export interface GetEditorialPlansOptions {
  status?: EditorialPlanStatus;
  includeArchived?: boolean;
}

export interface GetCampaignsOptions {
  status?: CampaignStatus;
  includeArchived?: boolean;
}
