import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, LeadCounters, LeadStatus } from '../types/leads';
import { fetchLeads, updateLeadStatus } from '../services/leadsService';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [updateStatusError, setUpdateStatusError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLeads();
      setLeads(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao carregar leads.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  const counters: LeadCounters = useMemo(() => {
    return {
      total: leads.length,
      newCount: leads.filter((l) => l.status === 'new').length,
      contactedCount: leads.filter((l) => l.status === 'contacted').length,
      qualifiedCount: leads.filter((l) => l.status === 'qualified').length,
    };
  }, [leads]);

  const handleUpdateStatus = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      try {
        setIsUpdatingStatus(true);
        setUpdateStatusError(null);
        const updated = await updateLeadStatus(leadId, newStatus);
        
        // Update local leads list
        setLeads((prev) =>
          prev.map((lead) => (lead.id === leadId ? updated : lead))
        );
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao atualizar o status.';
        setUpdateStatusError(message);
        return false;
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    []
  );

  const handleSelectLead = useCallback((lead: Lead | null) => {
    setSelectedLeadId(lead ? lead.id : null);
    setUpdateStatusError(null);
  }, []);

  const handleLeadConverted = useCallback((leadId: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: 'converted' as LeadStatus,
              updated_at: new Date().toISOString(),
            }
          : lead
      )
    );
  }, []);

  return {
    leads,
    loading,
    error,
    selectedLead,
    counters,
    isUpdatingStatus,
    updateStatusError,
    loadLeads,
    handleSelectLead,
    handleUpdateStatus,
    handleLeadConverted,
  };
}
