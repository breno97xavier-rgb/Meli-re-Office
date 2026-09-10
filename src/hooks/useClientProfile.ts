import { useState, useEffect, useCallback } from 'react';
import {
  Client,
  UpdateClientInput,
  ClientCommercialHistory,
} from '../types/clients';
import {
  ClientContact,
  CreateClientContactInput,
  UpdateClientContactInput,
} from '../types/contacts';
import {
  fetchClientById,
  updateClient,
  fetchClientCommercialHistory,
  formatClientError,
} from '../services/clientsService';
import {
  fetchClientContacts,
  createClientContact,
  updateClientContact,
  setPrimaryClientContact,
  deleteClientContact,
  formatContactError,
} from '../services/contactsService';

export function useClientProfile(clientId: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [commercialHistory, setCommercialHistory] =
    useState<ClientCommercialHistory>({
      opportunities: [],
      proposals: [],
      contracts: [],
    });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdatingClient, setIsUpdatingClient] = useState(false);
  const [updateClientError, setUpdateClientError] = useState<string | null>(null);

  const [isContactMutating, setIsContactMutating] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!clientId) {
      setError('ID do cliente não informado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Carrega dados do cliente
      const clientData = await fetchClientById(clientId);
      if (!clientData) {
        setError('Cliente não encontrado.');
        setClient(null);
        setLoading(false);
        return;
      }
      setClient(clientData);

      // 2. Carrega contatos e histórico comercial em paralelo
      const [contactsData, historyData] = await Promise.all([
        fetchClientContacts(clientId).catch((err) => {
          console.warn('Erro ao carregar contatos:', err);
          return [] as ClientContact[];
        }),
        fetchClientCommercialHistory(clientId, clientData).catch((err) => {
          console.warn('Erro ao carregar histórico comercial:', err);
          return {
            opportunities: [],
            proposals: [],
            contracts: [],
          };
        }),
      ]);

      setContacts(contactsData);
      setCommercialHistory(historyData);
    } catch (err) {
      console.error('Erro ao carregar perfil do cliente:', err);
      setError(formatClientError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Atualização dos dados cadastrais do cliente
  const handleUpdateClient = async (
    input: UpdateClientInput
  ): Promise<boolean> => {
    if (!clientId) return false;

    setIsUpdatingClient(true);
    setUpdateClientError(null);

    try {
      const updated = await updateClient(clientId, input);
      setClient((prev) => (prev ? { ...prev, ...updated } : updated));
      return true;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      setUpdateClientError(formatClientError(err));
      return false;
    } finally {
      setIsUpdatingClient(false);
    }
  };

  // Criação de contato
  const handleAddContact = async (
    input: Omit<CreateClientContactInput, 'client_id'>
  ): Promise<boolean> => {
    if (!clientId) return false;

    setIsContactMutating(true);
    setContactError(null);

    try {
      await createClientContact({
        ...input,
        client_id: clientId,
      });
      // Recarrega contatos para garantir ordem e is_primary atualizados
      const refreshed = await fetchClientContacts(clientId);
      setContacts(refreshed);
      return true;
    } catch (err) {
      console.error('Erro ao cadastrar contato:', err);
      setContactError(formatContactError(err));
      return false;
    } finally {
      setIsContactMutating(false);
    }
  };

  // Edição de contato
  const handleUpdateContact = async (
    contactId: string,
    input: UpdateClientContactInput
  ): Promise<boolean> => {
    if (!clientId || !contactId) return false;

    setIsContactMutating(true);
    setContactError(null);

    try {
      await updateClientContact(contactId, clientId, input);
      const refreshed = await fetchClientContacts(clientId);
      setContacts(refreshed);
      return true;
    } catch (err) {
      console.error('Erro ao atualizar contato:', err);
      setContactError(formatContactError(err));
      return false;
    } finally {
      setIsContactMutating(false);
    }
  };

  // Definir contato principal
  const handleSetPrimaryContact = async (
    contactId: string
  ): Promise<boolean> => {
    if (!clientId || !contactId) return false;

    setIsContactMutating(true);
    setContactError(null);

    try {
      await setPrimaryClientContact(clientId, contactId);
      const refreshed = await fetchClientContacts(clientId);
      setContacts(refreshed);
      return true;
    } catch (err) {
      console.error('Erro ao definir contato principal:', err);
      setContactError(formatContactError(err));
      return false;
    } finally {
      setIsContactMutating(false);
    }
  };

  // Excluir contato
  const handleDeleteContact = async (
    contactId: string
  ): Promise<boolean> => {
    if (!clientId || !contactId) return false;

    setIsContactMutating(true);
    setContactError(null);

    try {
      await deleteClientContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
      setContactError(formatContactError(err));
      return false;
    } finally {
      setIsContactMutating(false);
    }
  };

  return {
    client,
    contacts,
    commercialHistory,
    loading,
    error,
    isUpdatingClient,
    updateClientError,
    isContactMutating,
    contactError,
    loadProfile,
    handleUpdateClient,
    handleAddContact,
    handleUpdateContact,
    handleSetPrimaryContact,
    handleDeleteContact,
  };
}
