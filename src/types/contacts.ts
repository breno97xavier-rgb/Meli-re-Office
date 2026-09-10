export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientContactInput {
  client_id: string;
  name: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}

export interface UpdateClientContactInput {
  name?: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  notes?: string | null;
}
