import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Plus,
  Save,
  Trash2,
  Check,
  Download,
  Upload,
  RotateCcw,
  ArrowLeft,
  Edit2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import {
  loadAllPresets,
  savePreset,
  setActivePreset,
  deletePreset,
  resetToFactoryDefaults,
  exportPresetsToJSON,
  importPresetsFromJSON,
  getFactoryDefaults,
  InvoiceSeedDefaultsPreset,
  InvoiceSeedDefaultsConfig,
} from '../services/invoiceSeedDefaultsService';

const InvoiceSeedDefaultsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [presets, setPresets] = useState<InvoiceSeedDefaultsPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<InvoiceSeedDefaultsPreset | null>(null);
  const [editingConfig, setEditingConfig] = useState<InvoiceSeedDefaultsConfig>(
    getFactoryDefaults()
  );
  const [presetName, setPresetName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const data = await loadAllPresets(user!.id);
      setPresets(data);
    } catch (error) {
      console.error('Error loading presets:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error(t('settings.presetName'));
      return;
    }

    try {
      await savePreset(user!.id, presetName, editingConfig, editingPreset?.id);
      toast.success(editingPreset ? t('common.success') : t('common.success'));
      await loadPresets();
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error(t('common.error'));
    }
  };

  const handleSetActive = async (presetId: string) => {
    try {
      await setActivePreset(user!.id, presetId);
      toast.success(t('common.success'));
      await loadPresets();
    } catch (error) {
      console.error('Error setting active preset:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (presetId: string) => {
    if (!window.confirm(t('common.confirm'))) {
      return;
    }

    try {
      await deletePreset(user!.id, presetId);
      toast.success(t('invoices.deleted'));
      await loadPresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (preset: InvoiceSeedDefaultsPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setEditingConfig(preset.config);
    setShowForm(true);
  };

  const handleNewPreset = () => {
    setEditingPreset(null);
    setPresetName('');
    setEditingConfig(getFactoryDefaults());
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingPreset(null);
    setPresetName('');
    setEditingConfig(getFactoryDefaults());
  };

  const handleResetToFactory = async () => {
    if (
      !window.confirm(
        t('settings.factoryDefaults')
      )
    ) {
      return;
    }

    try {
      await resetToFactoryDefaults(user!.id);
      toast.success(t('common.success'));
      await loadPresets();
    } catch (error) {
      console.error('Error resetting to factory:', error);
      toast.error(t('common.error'));
    }
  };

  const handleExport = () => {
    try {
      const json = exportPresetsToJSON(presets);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-presets-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('common.success'));
    } catch (error) {
      console.error('Error exporting presets:', error);
      toast.error(t('common.error'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importPresetsFromJSON(user!.id, text);
      toast.success(t('common.success'));
      await loadPresets();
    } catch (error: any) {
      console.error('Error importing presets:', error);
      toast.error(error.message || t('common.error'));
    }
    e.target.value = '';
  };

  const handleDuplicate = (preset: InvoiceSeedDefaultsPreset) => {
    setEditingPreset(null);
    setPresetName(`${preset.name} (Copy)`);
    setEditingConfig(preset.config);
    setShowForm(true);
  };

  const activePreset = presets.find((p) => p.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/invoices')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back to invoices"
            title="Back to invoices"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
         
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="import-presets">
            <input
              type="file"
              id="import-presets"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <div className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              <span>{t('settings.import')}</span>
            </div>
          </label>

          <button
            onClick={handleExport}
            disabled={presets.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>{t('settings.export')}</span>
          </button>

          <button
            onClick={handleResetToFactory}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('settings.factoryDefaults')}</span>
          </button>

          <button
            onClick={handleNewPreset}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>{t('settings.newPreset')}</span>
          </button>
        </div>
      </div>

      {activePreset && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              {t('settings.activeDefaults')}: {activePreset.name} ({activePreset.config.defaultCurrency}, {t('settings.defaultTaxRate')}: {activePreset.config.defaultTaxRate}%)
            </span>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {editingPreset ? t('settings.editPreset') : t('settings.newPreset')}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.presetName')}
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., India, US, UAE"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.defaultCurrency')}
                </label>
                <select
                  value={editingConfig.defaultCurrency}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      defaultCurrency: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    aria-label="Default Currency"
                    title="Default Currency"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.defaultTaxRate')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingConfig.defaultTaxRate}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      defaultTaxRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Default tax rate"
                  title="Default tax rate"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
                {t('settings.defaultBillFrom')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.companyName')}
                  </label>
                  <input
                    type="text"
                    value={editingConfig.defaultBillFrom.company}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        defaultBillFrom: {
                          ...editingConfig.defaultBillFrom,
                          company: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    aria-label="Company name"
                    title="Company name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.email')}
                    </label>
                    <input
                      type="email"
                      value={editingConfig.defaultBillFrom.email}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          defaultBillFrom: {
                            ...editingConfig.defaultBillFrom,
                            email: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      aria-label="Company email"
                      title="Company email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('settings.phone')}
                    </label>
                    <input
                      type="tel"
                      value={editingConfig.defaultBillFrom.phone}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          defaultBillFrom: {
                            ...editingConfig.defaultBillFrom,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      aria-label="Company phone"
                      title="Company phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('settings.address')}
                  </label>
                  <textarea
                    value={editingConfig.defaultBillFrom.address}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        defaultBillFrom: {
                          ...editingConfig.defaultBillFrom,
                          address: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                       aria-label="Company address"
                       title="Company address"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.invoiceNumberPattern')}
                </label>
                <input
                  type="text"
                  value={editingConfig.invoiceNumberPattern}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      invoiceNumberPattern: e.target.value,
                    })
                  }
                  placeholder="INV-YYYYMM-###"
                       aria-label="Invoice number pattern"
title="Invoice number pattern"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  YYYY=year, MM=month, ###=counter
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.startingCounter')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingConfig.startingCounter}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      startingCounter: parseInt(e.target.value) || 1,
                    })
                  }
                   aria-label="Starting counter"
title="Starting counter"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeNotes"
                  checked={editingConfig.includeNotesByDefault}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      includeNotesByDefault: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeNotes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.includeNotes')}
                </label>
              </div>
              {editingConfig.includeNotesByDefault && (
                <textarea
                  value={editingConfig.defaultNotes}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      defaultNotes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Default notes text..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeTerms"
                  checked={editingConfig.includeTermsByDefault}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      includeTermsByDefault: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeTerms" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.includeTerms')}
                </label>
              </div>
              {editingConfig.includeTermsByDefault && (
                <textarea
                  value={editingConfig.defaultTerms}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      defaultTerms: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Default terms & conditions text..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="includeSignature"
                checked={editingConfig.includeSignatureByDefault}
                onChange={(e) =>
                  setEditingConfig({
                    ...editingConfig,
                    includeSignatureByDefault: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeSignature" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.includeSignature')}
              </label>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSavePreset}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>{editingPreset ? t('settings.updatePreset') : t('settings.savePreset')}</span>
              </button>

              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
                preset.is_active
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">
                    {preset.name}
                  </h3>
                  {preset.is_active && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      <Check className="h-3 w-3 mr-1" />
                      {t('settings.active')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div>{t('settings.defaultCurrency')}: {preset.config.defaultCurrency}</div>
                <div>{t('settings.defaultTaxRate')}: {preset.config.defaultTaxRate}%</div>
                <div>{t('settings.invoiceNumberPattern')}: {preset.config.invoiceNumberPattern}</div>
              </div>

              <div className="flex items-center space-x-2">
                {!preset.is_active && (
                  <button
                    onClick={() => handleSetActive(preset.id)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm"
                  >
                    <Check className="h-3 w-3" />
                    <span>{t('settings.apply')}</span>
                  </button>
                )}

                <button
                  onClick={() => handleEdit(preset)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{t('settings.edit')}</span>
                </button>

                <button
                  onClick={() => handleDuplicate(preset)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={t('settings.duplicate')}
                >
                  <Copy className="h-3 w-3" />
                </button>

                <button
                  onClick={() => handleDelete(preset.id)}
                  disabled={preset.is_active}
                  className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('settings.delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {presets.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('settings.noPresetsMessage')}</p>
              <button
                onClick={handleNewPreset}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span>{t('settings.createYourFirstPreset')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceSeedDefaultsPage;
