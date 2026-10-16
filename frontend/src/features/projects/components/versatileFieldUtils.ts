export type VersatileFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'DROPDOWN'
  | 'TEXT_AREA'
  | 'NUMBER'
  | 'DATE'
  | 'CHECKBOX';

export interface VersatileCustomField {
  id: string;
  name: string;
  type: VersatileFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  previousNames?: string[];
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
