import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { CustomFieldType } from '@/types';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSettings } from '@/context/settings/SettingsContext';

/**
 * Hook React `useSettingsController` que encapsula uma lógica reutilizável.
 * @returns {{ defaultRoute: string; setDefaultRoute: Dispatch<SetStateAction<string>>; customFieldDefinitions: CustomFieldDefinition[]; newFieldLabel: string; ... 14 more ...; removeTag: (tag: string) => void; }} Retorna um valor do tipo `{ defaultRoute: string; setDefaultRoute: Dispatch<SetStateAction<string>>; customFieldDefinitions: CustomFieldDefinition[]; newFieldLabel: string; ... 14 more ...; removeTag: (tag: string) => void; }`.
 */
export const useSettingsController = () => {
  const { addToast } = useToast();
  const {
    customFieldDefinitions,
    addCustomField,
    updateCustomField,
    removeCustomField,
  } = useSettings();

  // General Settings
  const [defaultRoute, setDefaultRoute] = usePersistedState<string>('crm_default_route', '/boards');

  // Custom Fields form state
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tags State (local - TODO: migrate to Supabase)
  const [availableTags, setAvailableTags] = usePersistedState<string[]>('crm_tags', []);
  const [newTagName, setNewTagName] = useState('');

  // Custom Fields Logic
  const startEditingField = (field: { id: string; label: string; type: CustomFieldType; options?: string[] }) => {
    setEditingId(field.id);
    setNewFieldLabel(field.label);
    setNewFieldType(field.type);
    setNewFieldOptions(field.options ? field.options.join(', ') : '');
  };

  const cancelEditingField = () => {
    setEditingId(null);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
  };

  const handleSaveField = async () => {
    if (!newFieldLabel.trim()) return;

    const optionsArray =
      newFieldType === 'select'
        ? newFieldOptions
          .split(',')
          .map(opt => opt.trim())
          .filter(opt => opt !== '')
        : undefined;

    if (editingId) {
      // UPDATE EXISTING
      await updateCustomField(editingId, { label: newFieldLabel, type: newFieldType, options: optionsArray });
      addToast('Campo personalizado atualizado com sucesso!', 'success');
      cancelEditingField();
    } else {
      // CREATE NEW
      const key = newFieldLabel
        .toLowerCase()
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');

      await addCustomField({ key, label: newFieldLabel, type: newFieldType, options: optionsArray });
      addToast('Campo personalizado criado com sucesso!', 'success');
      setNewFieldLabel('');
      setNewFieldOptions('');
    }
  };

  const handleRemoveField = async (id: string) => {
    await removeCustomField(id);
    addToast('Campo personalizado removido.', 'info');
  };

  // Tags Logic
  const handleAddTag = () => {
    if (newTagName.trim()) {
      setAvailableTags(prev => [...prev, newTagName.trim()]);
      addToast(`Tag "${newTagName}" adicionada!`, 'success');
      setNewTagName('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setAvailableTags(prev => prev.filter(t => t !== tag));
    addToast(`Tag "${tag}" removida.`, 'info');
  };

  return {
    // General Settings
    defaultRoute,
    setDefaultRoute,

    // Custom Fields
    customFieldDefinitions,
    newFieldLabel,
    setNewFieldLabel,
    newFieldType,
    setNewFieldType,
    newFieldOptions,
    setNewFieldOptions,
    editingId,
    startEditingField,
    cancelEditingField,
    handleSaveField,
    removeCustomField: handleRemoveField,

    // Tags
    availableTags,
    newTagName,
    setNewTagName,
    handleAddTag,
    removeTag: handleRemoveTag,
  };
};

