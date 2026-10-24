import type { EditorialTemplate } from './editorialTemplates';
export interface EditorialApplication {
  id: string; client_id: string; editorial_plan_id: string; template_id: string;
  template_revision: number; snapshot: EditorialTemplate; created_at: string;
}
export interface EditorialContentLink {
  application_id: string; client_id: string; slot_id: string; unit_index: number; content_id: string;
}
