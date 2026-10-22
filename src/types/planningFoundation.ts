import type { ClientStrategy, UpdateClientStrategyInput } from './planning';
import type { PrimaryChannel } from './contents';

export interface BriefingQuestion {
  id: string;
  block: string;
  label: string;
  type: 'text' | 'select' | 'multiple';
  options: string[];
  answer: string | string[];
}
export interface ClientBriefing {
  client_id: string;
  questions: BriefingQuestion[];
  status: 'draft' | 'ready';
  revision: number;
  updated_at: string;
}
export interface PlanningRevision<T> {
  revision: number;
  snapshot: T;
  changed_at: string;
}
export interface VersionedStrategy extends ClientStrategy {
  valid_from: string | null;
  valid_until: string | null;
  review_on: string | null;
  revision: number;
}
export interface StrategyRevisionInput extends UpdateClientStrategyInput {
  valid_from?: string | null;
  valid_until?: string | null;
  review_on?: string | null;
}
export interface EditorialSeries {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  suggested_recurrence: string | null;
  channels: PrimaryChannel[];
  is_active: boolean;
  revision: number;
  pillar_ids: string[];
}
