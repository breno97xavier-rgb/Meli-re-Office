export type WorkspaceStatus = 'active' | 'suspended' | 'archived';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type WorkspaceMemberStatus = 'active' | 'invited' | 'suspended';

export type ClientScope = 'assigned' | 'all';

export type PermissionKey =
  | 'commercial'
  | 'contracts'
  | 'clients'
  | 'planning'
  | 'contents'
  | 'presentations';

export type PermissionAccessLevel = 'view' | 'operation' | 'management';

export type ResponsibilityRole = 'primary' | 'collaborator';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  client_scope: ClientScope;
  status: WorkspaceMemberStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberPermission {
  id: string;
  membership_id: string;
  permission_key: PermissionKey;
  access_level: PermissionAccessLevel;
  created_at: string;
}

export interface WorkspaceMemberClientAssignment {
  id: string;
  workspace_id: string;
  membership_id: string;
  client_id: string;
  created_at: string;
}

export interface WorkspaceMemberClientResponsibility {
  id: string;
  workspace_id: string;
  membership_id: string;
  client_id: string;
  area_key: string;
  responsibility_role: ResponsibilityRole;
  created_at: string;
}

export interface WorkspaceSettings {
  id: string;
  workspace_id: string;
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
}
