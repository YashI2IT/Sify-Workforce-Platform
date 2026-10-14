import React, { useState } from 'react';
import { Plus, Trash2, Sliders, AlertCircle, ArrowUp, ArrowDown, X, AlertTriangle } from 'lucide-react';

export type VersatileFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'DROPDOWN'
  | 'TEXT_AREA'
  | 'NUMBER'
  | 'DATE'
  | 'CHECKBOX';

export const SUPPORTED_FIELD_TYPES = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'DROPDOWN', label: 'Dropdown' },
] as const;

export const isLegacyType = (type: string): boolean => {
  return ['NUMBER', 'DATE', 'CHECKBOX'].includes(type);
};

export const formatFieldTypeLabel = (type: string): string => {
  switch (type) {
    case 'SHORT_TEXT': return 'Short Text';
    case 'LONG_TEXT':
    case 'TEXT_AREA': return 'Long Text';
    case 'DROPDOWN': return 'Dropdown';
    case 'NUMBER': return 'Number';
    case 'DATE': return 'Date';
    case 'CHECKBOX': return 'Checkbox';
    default: return type;
  }
};

export interface VersatileCustomField {
  id: string;
  name: string;
  type: VersatileFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  previousNames?: string[];
}

export interface VersatileFieldBuilderProps {
  fields: VersatileCustomField[];
  onChange: (fields: VersatileCustomField[]) => void;
  error?: string | null;
  existingTasks?: any[];
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  showSaveButton?: boolean;
}

export const validateCustomFields = (fields: VersatileCustomField[]): string | null => {
  const seenNames = new Set<string>();

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const trimmedName = f.name.trim();

    if (!trimmedName) {
      return `Field #${i + 1}: Field label is required.`;
    }

    const lower = trimmedName.toLowerCase();
    if (seenNames.has(lower)) {
      return `Duplicate field label "${trimmedName}". Each field must have a unique label.`;
    }
    seenNames.add(lower);

    if (f.type === 'DROPDOWN') {
      const validOptions = (f.options || []).map(o => o.trim()).filter(Boolean);
      if (validOptions.length === 0) {
        return `Dropdown field "${trimmedName}" must have at least one valid option.`;
      }
      const seenOpts = new Set<string>();
      for (const opt of validOptions) {
        const lowerOpt = opt.toLowerCase();
        if (seenOpts.has(lowerOpt)) {
          return `Dropdown field "${trimmedName}" contains duplicate option "${opt}".`;
        }
        seenOpts.add(lowerOpt);
      }
    }
  }

  return null;
};

export const VersatileFieldBuilder: React.FC<VersatileFieldBuilderProps> = ({
  fields,
  onChange,
  error = null,
  existingTasks = [],
  onSave,
  isSaving = false,
  showSaveButton = false,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<{ field: VersatileCustomField; taskCount: number } | null>(null);

  const displayError = error || internalError;

  const handleAddField = () => {
    const newField: VersatileCustomField = {
      id: `fld-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      type: 'SHORT_TEXT',
      required: false,
      placeholder: '',
      options: [],
    };
    onChange([...fields, newField]);
    setInternalError(null);
  };

  const handleRequestRemove = (field: VersatileCustomField) => {
    // Check if existing tasks contain values for this field
    const tasksWithData = existingTasks.filter(t => {
      const meta = t?.metadata;
      if (!meta || typeof meta !== 'object') return false;
      if (meta[field.name] !== undefined && meta[field.name] !== '' && meta[field.name] !== null) return true;
      if (meta[field.id] !== undefined && meta[field.id] !== '' && meta[field.id] !== null) return true;
      if (field.previousNames?.some(pn => meta[pn] !== undefined && meta[pn] !== '' && meta[pn] !== null)) return true;
      return false;
    });

    if (tasksWithData.length > 0) {
      setFieldToDelete({ field, taskCount: tasksWithData.length });
    } else {
      executeRemove(field.id);
    }
  };

  const executeRemove = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
    setInternalError(null);
    setFieldToDelete(null);
  };

  const handleUpdateField = (id: string, updates: Partial<VersatileCustomField>) => {
    onChange(fields.map(f => {
      if (f.id !== id) return f;

      const previousNames = f.previousNames ? [...f.previousNames] : [];
      if (updates.name !== undefined && updates.name.trim() !== f.name.trim() && f.name.trim()) {
        if (!previousNames.includes(f.name.trim())) {
          previousNames.push(f.name.trim());
        }
      }

      const rawType = updates.type !== undefined ? updates.type : f.type;
      const normalizedType = rawType === 'TEXT_AREA' ? 'LONG_TEXT' : rawType;

      const updated: VersatileCustomField = {
        ...f,
        ...updates,
        type: normalizedType,
        previousNames,
      };

      if (updated.type === 'DROPDOWN' && (!updated.options || updated.options.length === 0)) {
        updated.options = ['Option 1'];
      }
      return updated;
    }));
    setInternalError(null);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);
    onChange(newFields);
  };

  const handleAddOption = (fieldId: string) => {
    onChange(fields.map(f => {
      if (f.id !== fieldId) return f;
      return {
        ...f,
        options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`],
      };
    }));
  };

  const handleUpdateOption = (fieldId: string, optIdx: number, val: string) => {
    onChange(fields.map(f => {
      if (f.id !== fieldId) return f;
      const newOpts = [...(f.options || [])];
      newOpts[optIdx] = val;
      return { ...f, options: newOpts };
    }));
  };

  const handleRemoveOption = (fieldId: string, optIdx: number) => {
    onChange(fields.map(f => {
      if (f.id !== fieldId) return f;
      const newOpts = (f.options || []).filter((_, idx) => idx !== optIdx);
      return { ...f, options: newOpts };
    }));
  };

  // Inspect compatibility of type change with existing tasks
  const getTypeChangeWarning = (field: VersatileCustomField): string | null => {
    if (isLegacyType(field.type)) {
      return `This field uses an unsupported legacy type (${formatFieldTypeLabel(field.type)}). Supported types are Short Text, Long Text, and Dropdown.`;
    }
    if (field.type === 'DROPDOWN') {
      const allowed = new Set((field.options || []).map(o => o.trim().toLowerCase()));
      const mismatchTasks = existingTasks.filter(t => {
        const val = t?.metadata?.[field.name] ?? (field.id ? t?.metadata?.[field.id] : undefined);
        return val !== undefined && val !== null && val !== '' && !allowed.has(String(val).trim().toLowerCase());
      });
      if (mismatchTasks.length > 0) {
        return `${mismatchTasks.length} existing task(s) have values not present in the current dropdown options.`;
      }
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-4 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/70">
        <div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-500" />
            Custom Fields
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Add custom fields for tasks in this project.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddField}
          aria-label="Add custom field"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 text-slate-600" />
          Add Field
        </button>
      </div>

      {displayError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Confirmation Dialog for removing field with existing task values */}
      {fieldToDelete && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                Existing task data warning: "{fieldToDelete.field.name}"
              </p>
              <p className="text-amber-800">
                <strong>{fieldToDelete.taskCount}</strong> existing {fieldToDelete.taskCount === 1 ? 'task contains' : 'tasks contain'} values for this field. Removing this definition will hide it from new task forms, but historical task values will be safely preserved.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFieldToDelete(null)}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => executeRemove(fieldToDelete.field.id)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Confirm Removal
            </button>
          </div>
        </div>
      )}

      {fields.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white space-y-2">
          <p className="text-xs font-bold text-slate-700">No custom fields yet</p>
          <p className="text-xs text-slate-400">
            Add fields like Short Text, Long Text, or Dropdown to collect additional information on tasks.
          </p>
          <button
            type="button"
            onClick={handleAddField}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Field
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {fields.map((field, idx) => {
            const warning = getTypeChangeWarning(field);

            return (
              <div
                key={field.id}
                className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {field.name.trim() || `Field ${idx + 1}`}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                      {field.type.replace('_', ' ')}
                    </span>
                    {field.required && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                        REQUIRED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveField(idx, 'up')}
                      title="Move field up"
                      aria-label="Move Field Up"
                      className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => handleMoveField(idx, 'down')}
                      title="Move field down"
                      aria-label="Move Field Down"
                      className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRemove(field)}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Remove field"
                      aria-label="Remove Field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>

                {warning && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}

                {/* Field Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  {/* Label Input */}
                  <div className="sm:col-span-5 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Field Label <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={e => handleUpdateField(field.id, { name: e.target.value })}
                      placeholder="e.g. Ticket Number"
                      aria-label="Field Label"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  {/* Type Selector */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Field Type
                    </label>
                    <select
                      value={field.type === 'TEXT_AREA' ? 'LONG_TEXT' : field.type}
                      onChange={e => handleUpdateField(field.id, { type: e.target.value as VersatileFieldType })}
                      aria-label="Field Type"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
                    >
                      <option value="SHORT_TEXT">Short Text</option>
                      <option value="LONG_TEXT">Long Text</option>
                      <option value="DROPDOWN">Dropdown</option>
                      {isLegacyType(field.type) && (
                        <option value={field.type} disabled>
                          {formatFieldTypeLabel(field.type)} (Legacy)
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Validation Toggle */}
                  <div className="sm:col-span-3 flex sm:flex-col justify-between sm:justify-end pb-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Validation
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => handleUpdateField(field.id, { required: e.target.checked })}
                        aria-label="Required"
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-xs font-semibold text-slate-700">Required</span>
                    </label>
                  </div>

                  {/* Adaptive Controls based on Field Type */}
                  {field.type !== 'DROPDOWN' && !isLegacyType(field.type) && (
                    <div className="sm:col-span-12 space-y-1 pt-1">
                      <label className="block text-[11px] font-bold text-slate-500">
                        Placeholder (Optional)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={e => handleUpdateField(field.id, { placeholder: e.target.value })}
                        placeholder={
                          field.type === 'LONG_TEXT' || field.type === 'TEXT_AREA'
                            ? 'e.g. Enter multi-line details...'
                            : 'e.g. Enter value...'
                        }
                        aria-label="Placeholder"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
                      />
                    </div>
                  )}

                  {field.type === 'DROPDOWN' && (
                    <div className="sm:col-span-12 space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Dropdown Options <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddOption(field.id)}
                          className="text-[11px] font-bold text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono w-4">
                              {optIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={e => handleUpdateOption(field.id, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1} name`}
                              aria-label={`Option ${optIdx + 1}`}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(field.id, optIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove option"
                              aria-label={`Remove option ${optIdx + 1}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddField}
              aria-label="Add another field"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
            {showSaveButton && onSave && (
              <button
                type="button"
                disabled={isSaving}
                onClick={onSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>{isSaving ? 'Saving Fields...' : 'Save Field Configuration'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
