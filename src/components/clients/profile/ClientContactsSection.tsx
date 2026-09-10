import React, { useState } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Star,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  X,
  FileText,
} from 'lucide-react';
import { Client } from '../../../types/clients';
import {
  ClientContact,
  CreateClientContactInput,
  UpdateClientContactInput,
} from '../../../types/contacts';
import { formatDate } from '../ClientStatusBadge';

interface ClientContactsSectionProps {
  client: Client;
  contacts: ClientContact[];
  isMutating: boolean;
  error: string | null;
  onAddContact: (input: Omit<CreateClientContactInput, 'client_id'>) => Promise<boolean>;
  onUpdateContact: (contactId: string, input: UpdateClientContactInput) => Promise<boolean>;
  onSetPrimaryContact: (contactId: string) => Promise<boolean>;
  onDeleteContact: (contactId: string) => Promise<boolean>;
}

export const ClientContactsSection: React.FC<ClientContactsSectionProps> = ({
  client,
  contacts,
  isMutating,
  error,
  onAddContact,
  onUpdateContact,
  onSetPrimaryContact,
  onDeleteContact,
}) => {
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    role_title: string;
    email: string;
    phone: string;
    is_primary: boolean;
    notes: string;
  }>({
    name: '',
    role_title: '',
    email: '',
    phone: '',
    is_primary: false,
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = (prefillWithClient = false) => {
    setEditingContact(null);
    setFormData({
      name: '',
      role_title: '',
      email: prefillWithClient ? client.email || '' : '',
      phone: prefillWithClient ? client.phone || '' : '',
      // Se não houver nenhum contato ainda, sugere torná-lo principal
      is_primary: contacts.length === 0,
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: ClientContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      role_title: contact.role_title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      is_primary: contact.is_primary,
      notes: contact.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('O nome do contato é obrigatório.');
      return;
    }

    setFormError(null);

    if (editingContact) {
      const success = await onUpdateContact(editingContact.id, {
        name: formData.name.trim(),
        role_title: formData.role_title.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        is_primary: formData.is_primary,
        notes: formData.notes.trim() || null,
      });
      if (success) closeModal();
    } else {
      const success = await onAddContact({
        name: formData.name.trim(),
        role_title: formData.role_title.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        is_primary: formData.is_primary,
        notes: formData.notes.trim() || null,
      });
      if (success) closeModal();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E9EA]">
        <div>
          <h2 className="text-base font-bold text-[#1D1D1D] tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F15A3C]" />
            <span>Equipe e Contatos do Cliente</span>
          </h2>
          <p className="text-xs text-[#666668] mt-0.5">
            Pessoas de contato chave, responsáveis operacionais e tomadores de decisão.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-client-contact"
          onClick={() => openAddModal(false)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Contato</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Contacts List or Empty State */}
      {contacts.length === 0 ? (
        <div className="bg-[#FAFAFA] border border-dashed border-[#E8E9EA] rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E8E9EA] text-[#666668] flex items-center justify-center mx-auto shadow-2xs">
            <Users className="w-6 h-6 text-[#9E9EA0]" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-[#1D1D1D]">
              Nenhum contato cadastrado ainda
            </h3>
            <p className="text-xs text-[#666668] leading-relaxed">
              Cadastre as pessoas de contato deste cliente para facilitar a comunicação da equipe e centralizar as informações.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar primeiro contato</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => {
            const isPrimary = contact.is_primary;

            return (
              <div
                key={contact.id}
                className={`bg-white rounded-xl border p-5 space-y-4 transition-all flex flex-col justify-between ${
                  isPrimary
                    ? 'border-[#1D1D1D] shadow-xs ring-1 ring-[#1D1D1D]/5'
                    : 'border-[#E8E9EA] hover:border-[#D1D2D4] shadow-2xs'
                }`}
              >
                {/* Header: Name + Role + Primary Badge */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#1D1D1D] truncate">
                        {contact.name}
                      </h4>
                      {contact.role_title ? (
                        <p className="text-xs font-medium text-[#666668] truncate flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-[#9E9EA0] shrink-0" />
                          <span>{contact.role_title}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-[#9E9EA0] italic mt-0.5">Cargo não especificado</p>
                      )}
                    </div>

                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D1D1D] text-white shrink-0">
                        <Star className="w-3 h-3 fill-current text-[#F15A3C]" />
                        Principal
                      </span>
                    ) : null}
                  </div>

                  {/* Contact Channels */}
                  <div className="space-y-1.5 pt-2 border-t border-[#F2F3F3] text-xs">
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-[#1D1D1D] hover:underline truncate"
                        >
                          {contact.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#9E9EA0] italic text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-[#D1D2D4] shrink-0" />
                        <span>Sem e-mail cadastrado</span>
                      </div>
                    )}

                    {contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-[#1D1D1D] hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#9E9EA0] italic text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-[#D1D2D4] shrink-0" />
                        <span>Sem telefone</span>
                      </div>
                    )}
                  </div>

                  {/* Notes if any */}
                  {contact.notes && (
                    <div className="p-2 bg-[#F7F7F8] rounded-lg text-[11px] text-[#666668] leading-relaxed border border-[#E8E9EA]">
                      <span className="font-semibold text-[#1D1D1D] block mb-0.5">Observações:</span>
                      {contact.notes}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[#F2F3F3] flex items-center justify-between gap-2 text-xs">
                  <div>
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => onSetPrimaryContact(contact.id)}
                        disabled={isMutating}
                        className="text-[11px] font-semibold text-[#666668] hover:text-[#1D1D1D] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Definir como contato principal deste cliente"
                      >
                        <Star className="w-3 h-3 text-[#9E9EA0]" />
                        <span>Tornar Principal</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#9E9EA0]">Contato Principal</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-md transition-colors cursor-pointer"
                      title="Editar contato"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja remover o contato "${contact.name}"?`)) {
                          onDeleteContact(contact.id);
                        }
                      }}
                      className="p-1.5 text-[#9E9EA0] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Excluir contato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Contato */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#1D1D1D]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E9EA] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E8E9EA] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1D1D1D] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F15A3C]" />
                <span>
                  {editingContact ? 'Editar Contato' : 'Adicionar Novo Contato'}
                </span>
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Cargo / Função
                </label>
                <input
                  type="text"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="Ex: Diretor de Marketing, Gerente de Projetos"
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1D1D1D] block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="carlos@empresa.com"
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1D1D1D] block">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white border border-[#E8E9EA] rounded-lg px-3 py-2 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Checkbox Contato Principal */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E8E9EA] bg-[#FAFAFA] cursor-pointer hover:bg-[#F7F7F8] transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="mt-0.5 rounded text-[#1D1D1D] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[#1D1D1D] block">
                      Definir como contato principal
                    </span>
                    <span className="text-[11px] text-[#666668] block mt-0.5">
                      Este contato será exibido com destaque e será a referência padrão para comunicações.
                    </span>
                  </div>
                </label>
              </div>

              {/* Notas do contato */}
              <div className="space-y-1">
                <label className="font-semibold text-[#1D1D1D] block">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Horários preferenciais, preferências de contato..."
                  className="w-full bg-white border border-[#E8E9EA] rounded-lg p-2.5 text-xs text-[#1D1D1D] focus:border-[#D1D2D4] focus:outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isMutating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingContact ? 'Salvar Alterações' : 'Cadastrar Contato'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
