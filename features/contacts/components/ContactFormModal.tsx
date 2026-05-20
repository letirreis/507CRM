import React, { useId, useMemo, useRef, useState } from 'react';
import { Building2, Plus, X } from 'lucide-react';
import { Company, Contact } from '@/types';
import { DebugFillButton } from '@/components/debug/DebugFillButton';
import { fakeContact } from '@/lib/debug';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { useSettings } from '@/context/settings/SettingsContext';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  companyName: string;
  customFields: Record<string, any>;
}

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ContactFormData;
  setFormData: (data: ContactFormData) => void;
  companies: Company[];
  onRequestCreateCompany: (companyName: string) => void;
  editingContact: Contact | null;
  createFakeContactsBatch?: (count: number) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Componente React `ContactFormModal`.
 *
 * @param {ContactFormModalProps} {
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingContact,
} - Parâmetro `{
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingContact,
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  companies,
  onRequestCreateCompany,
  editingContact,
  createFakeContactsBatch,
  isSubmitting = false,
}) => {
  const headingId = useId();
  useFocusReturn({ enabled: isOpen });
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [highlightedCompanyIndex, setHighlightedCompanyIndex] = useState(0);
  const companyFieldRef = useRef<HTMLDivElement>(null);
  const { customFieldDefinitions } = useSettings();

  const companyQuery = formData.companyName.trim().toLowerCase();
  const filteredCompanies = useMemo(() => {
    if (!companyQuery) return [];
    return companies
      .filter(company => (company.name || '').toLowerCase().includes(companyQuery))
      .slice(0, 8);
  }, [companies, companyQuery]);

  const hasExactCompanyMatch = useMemo(
    () => filteredCompanies.some(company => (company.name || '').toLowerCase() === companyQuery),
    [filteredCompanies, companyQuery]
  );
  const canCreateCompany = companyQuery.length > 0 && !hasExactCompanyMatch;

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!companyFieldRef.current?.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  React.useEffect(() => {
    setHighlightedCompanyIndex(0);
  }, [companyQuery, filteredCompanies.length, canCreateCompany]);

  if (!isOpen) return null;

  const fillWithFakeData = () => {
    const fake = fakeContact();
    setFormData({
      name: fake.name,
      email: fake.email,
      phone: fake.phone,
      role: fake.role,
      companyName: fake.companyName,
      customFields: {},
    });
  };

  const handleSelectCompany = (companyName: string) => {
    setFormData({ ...formData, companyName });
    setIsCompanyDropdownOpen(false);
  };

  const handleCreateCompany = () => {
    const nextName = formData.companyName.trim();
    if (!nextName) return;
    setIsCompanyDropdownOpen(false);
    onRequestCreateCompany(nextName);
  };

  const handleCompanyKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCompanyDropdownOpen) {
      if (event.key === 'ArrowDown' && (filteredCompanies.length > 0 || canCreateCompany)) {
        event.preventDefault();
        setIsCompanyDropdownOpen(true);
      }
      return;
    }

    const totalItems = filteredCompanies.length + (canCreateCompany ? 1 : 0);
    if (totalItems === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedCompanyIndex(prev => (prev + 1) % totalItems);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedCompanyIndex(prev => (prev - 1 + totalItems) % totalItems);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (highlightedCompanyIndex < filteredCompanies.length) {
        handleSelectCompany(filteredCompanies[highlightedCompanyIndex].name);
      } else if (canCreateCompany) {
        handleCreateCompany();
      }
      return;
    }
    if (event.key === 'Escape') {
      setIsCompanyDropdownOpen(false);
    }
  };

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div 
        className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => {
          // Close only when clicking the backdrop (outside the panel).
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 id={headingId} className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
              </h2>
              <DebugFillButton onClick={fillWithFakeData} />
              {createFakeContactsBatch && (
                <DebugFillButton
                  onClick={async () => {
                    setIsCreatingBatch(true);
                    try {
                      await createFakeContactsBatch(10);
                      onClose();
                    } finally {
                      setIsCreatingBatch(false);
                    }
                  }}
                  label={isCreatingBatch ? 'Criando...' : 'Fake x10'}
                  variant="secondary"
                  className="ml-1"
                  disabled={isCreatingBatch}
                />
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible-ring rounded"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Nome Completo
            </label>
            <input
              required
              type="text"
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Ana Souza"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input
              required
              type="email"
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="ana@empresa.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Telefone
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+5511999999999"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Gerente"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
          </div>
          <div ref={companyFieldRef} className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Empresa
            </label>
            <input
              type="text"
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nome da Empresa"
              value={formData.companyName}
              onChange={e => {
                setFormData({ ...formData, companyName: e.target.value });
                setIsCompanyDropdownOpen(true);
              }}
              onFocus={() => {
                if (formData.companyName.trim()) setIsCompanyDropdownOpen(true);
              }}
              onKeyDown={handleCompanyKeyDown}
              autoComplete="off"
            />
            {isCompanyDropdownOpen && (filteredCompanies.length > 0 || canCreateCompany) && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                {filteredCompanies.map((company, index) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelectCompany(company.name)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                      highlightedCompanyIndex === index
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Building2 size={14} />
                    <span className="truncate">{company.name}</span>
                  </button>
                ))}
                {canCreateCompany && (
                  <button
                    type="button"
                    onClick={handleCreateCompany}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 ${
                      highlightedCompanyIndex === filteredCompanies.length
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                        : 'text-primary-600 dark:text-primary-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Plus size={14} />
                    <span>Criar empresa &quot;{formData.companyName.trim()}&quot;</span>
                  </button>
                )}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {editingContact
                ? 'Edite para alterar a empresa. Deixe em branco para desvincular.'
                : 'Digite para buscar empresa existente ou criar uma nova sem sair do fluxo.'}
            </p>
          </div>

          {customFieldDefinitions.length > 0 && (
            <div className="pt-2 border-t border-slate-200/70 dark:border-white/10">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">
                Campos Personalizados
              </h3>
              <div className="space-y-3">
                {customFieldDefinitions.map(field => {
                  const fieldId = `contact-custom-field-${field.id}`;
                  const inputType =
                    field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
                  return (
                  <div key={field.id}>
                    <label
                      htmlFor={fieldId}
                      className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                    >
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={fieldId}
                        value={formData.customFields?.[field.key] || ''}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            customFields: { ...(formData.customFields || {}), [field.key]: e.target.value },
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={fieldId}
                        type={inputType}
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.customFields?.[field.key] || ''}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            customFields: { ...(formData.customFields || {}), [field.key]: e.target.value },
                          })
                        }
                      />
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          )}

            <button
            type="submit"
              disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg mt-2 shadow-lg shadow-primary-600/20 transition-all"
          >
            {isSubmitting ? 'Criando...' : (editingContact ? 'Salvar Alterações' : 'Criar Contato')}
          </button>
        </form>
        </div>
      </div>
    </FocusTrap>
  );
};
