export interface InvoiceSeedDefaultsConfig {
  defaultCurrency: 'INR' | 'USD' | 'AED';
  defaultTaxRate: number;
  defaultDiscountType?: 'flat' | 'percent';
  defaultDiscountValue?: number;
  defaultBillFrom: {
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  defaultDateFormat: 'DD-MM-YYYY' | 'MM/DD/YYYY';
  defaultNumberFormat: 'indian' | 'western';
  defaultTemplateColor?: string;
  defaultLogoPath?: string;
  invoiceNumberPattern: string;
  startingCounter: number;
  includeNotesByDefault: boolean;
  defaultNotes: string;
  includeTermsByDefault: boolean;
  defaultTerms: string;
  includeSignatureByDefault: boolean;
}

export interface InvoiceSeedDefaultsPreset {
  id: string;
  owner_id: string;
  name: string;
  config: InvoiceSeedDefaultsConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const FACTORY_DEFAULTS: InvoiceSeedDefaultsConfig = {
  defaultCurrency: 'INR',
  defaultTaxRate: 6,
  defaultDiscountType: undefined,
  defaultDiscountValue: 0,
  defaultBillFrom: {
    company: 'Apna Invoice',
    email: 'info@shivohinitechai.com',
    phone: '+91 7688929473',
    address: 'Bangalore, Karnataka, India',
  },
  defaultDateFormat: 'MM/DD/YYYY',
  defaultNumberFormat: 'indian',
  defaultTemplateColor: '#0B2D5B',
  defaultLogoPath: '/Logo_withoutBG.png',
  invoiceNumberPattern: 'INV-YYYYMM-###',
  startingCounter: 1,
  includeNotesByDefault: true,
  defaultNotes: 'Thank you for your business! Payment is due within the specified due date.',
  includeTermsByDefault: true,
  defaultTerms:
    'Payment is due within 7 days of invoice date.\nLate payments may incur additional charges.\nAll prices are in the specified currency.',
  includeSignatureByDefault: false,
};

const getKey = (userId: string) => `invoice_seed_defaults_${userId}`;

function getStoredPresets(userId: string): InvoiceSeedDefaultsPreset[] {
  const raw = localStorage.getItem(getKey(userId));
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredPresets(userId: string, presets: InvoiceSeedDefaultsPreset[]) {
  localStorage.setItem(getKey(userId), JSON.stringify(presets));
}

export async function loadAllPresets(userId: string): Promise<InvoiceSeedDefaultsPreset[]> {
  return getStoredPresets(userId);
}

export async function loadActivePreset(userId: string): Promise<InvoiceSeedDefaultsConfig> {
  const presets = getStoredPresets(userId);
  const active = presets.find((p) => p.is_active);
  return active?.config || FACTORY_DEFAULTS;
}

export async function savePreset(
  userId: string,
  name: string,
  config: InvoiceSeedDefaultsConfig,
  id?: string
): Promise<InvoiceSeedDefaultsPreset> {
  const presets = getStoredPresets(userId);

  if (id) {
    const updated = presets.map((p) =>
      p.id === id
        ? {
            ...p,
            name,
            config,
            updated_at: new Date().toISOString(),
          }
        : p
    );

    saveStoredPresets(userId, updated);
    return updated.find((p) => p.id === id)!;
  }

  const newPreset: InvoiceSeedDefaultsPreset = {
    id: crypto.randomUUID(),
    owner_id: userId,
    name,
    config,
    is_active: presets.length === 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [newPreset, ...presets];
  saveStoredPresets(userId, updated);

  return newPreset;
}

export async function setActivePreset(userId: string, presetId: string): Promise<void> {
  const presets = getStoredPresets(userId);

  const updated = presets.map((p) => ({
    ...p,
    is_active: p.id === presetId,
    updated_at: p.id === presetId ? new Date().toISOString() : p.updated_at,
  }));

  saveStoredPresets(userId, updated);
}

export async function deletePreset(userId: string, presetId: string): Promise<void> {
  const presets = getStoredPresets(userId);
  const updated = presets.filter((p) => p.id !== presetId);
  saveStoredPresets(userId, updated);
}

export async function resetToFactoryDefaults(userId: string): Promise<InvoiceSeedDefaultsPreset> {
  const presets = getStoredPresets(userId).map((p) => ({
    ...p,
    is_active: false,
  }));

  const factoryPreset: InvoiceSeedDefaultsPreset = {
    id: crypto.randomUUID(),
    owner_id: userId,
    name: 'Factory Defaults',
    config: FACTORY_DEFAULTS,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveStoredPresets(userId, [factoryPreset, ...presets]);

  return factoryPreset;
}

export function exportPresetsToJSON(presets: InvoiceSeedDefaultsPreset[]): string {
  const exportData = presets.map((preset) => ({
    name: preset.name,
    config: preset.config,
  }));

  return JSON.stringify(exportData, null, 2);
}

export async function importPresetsFromJSON(
  userId: string,
  jsonString: string
): Promise<number> {
  let importedPresets: any;

  try {
    importedPresets = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (!Array.isArray(importedPresets)) {
    throw new Error('JSON must be an array of presets');
  }

  const oldPresets = getStoredPresets(userId);

  const newPresets: InvoiceSeedDefaultsPreset[] = importedPresets
    .filter((p) => p.name && p.config)
    .map((p) => ({
      id: crypto.randomUUID(),
      owner_id: userId,
      name: p.name,
      config: p.config,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  saveStoredPresets(userId, [...newPresets, ...oldPresets]);

  return newPresets.length;
}

export function getFactoryDefaults(): InvoiceSeedDefaultsConfig {
  return { ...FACTORY_DEFAULTS };
}

export function clearCache(): void {}