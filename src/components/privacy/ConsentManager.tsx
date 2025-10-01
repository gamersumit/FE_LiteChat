import { useState, useEffect } from 'react'
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking'

interface ConsentManagerProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onConsentUpdate?: (consent: {
    dataCollection: boolean
    analytics: boolean
    personalization: boolean
  }) => void
}

export function ConsentManager({ 
  userId, 
  isOpen, 
  onClose, 
  onConsentUpdate 
}: ConsentManagerProps) {
  const {
    consentStatus,
    privacySettings,
    updateConsent,
    updatePrivacySettings,
    exportUserData,
    deleteUserData,
    error,
    clearError,
  } = useBehaviorTracking(userId)

  const [localConsent, setLocalConsent] = useState(consentStatus)
  const [localPrivacy, setLocalPrivacy] = useState(privacySettings)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setLocalConsent(consentStatus)
    setLocalPrivacy(privacySettings)
  }, [consentStatus, privacySettings])

  const handleSaveConsent = async () => {
    try {
      await updateConsent(localConsent)
      updatePrivacySettings(localPrivacy)
      onConsentUpdate?.(localConsent)
      onClose()
    } catch (error) {
      console.error('Failed to save consent:', error)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const data = exportUserData()
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `user-data-${userId}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteData = async () => {
    if (!window.confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const deleted = deleteUserData()
      if (deleted) {
        alert('Your data has been successfully deleted.')
        setLocalConsent({
          dataCollection: false,
          analytics: false,
          personalization: true,
        })
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete data:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Privacy & Data Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close privacy settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Data Collection Consent */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Collection
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={localConsent.dataCollection}
                  onChange={(e) => setLocalConsent(prev => ({
                    ...prev,
                    dataCollection: e.target.checked,
                    analytics: e.target.checked ? prev.analytics : false,
                  }))}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Allow data collection
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable collection of your interactions to improve your experience.
                    All data is anonymized and stored locally.
                  </p>
                </div>
              </label>

              <label className={`flex items-start space-x-3 ${!localConsent.dataCollection ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={localConsent.analytics}
                  disabled={!localConsent.dataCollection}
                  onChange={(e) => setLocalConsent(prev => ({
                    ...prev,
                    analytics: e.target.checked,
                  }))}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Analytics & insights
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow analysis of your behavior patterns to provide personalized insights
                    and recommendations.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={localConsent.personalization}
                  onChange={(e) => setLocalConsent(prev => ({
                    ...prev,
                    personalization: e.target.checked,
                  }))}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    Personalization
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow the application to adapt its interface and suggestions based on
                    your preferences.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Advanced Privacy Settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Advanced Settings
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transform transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={localPrivacy.anonymizeData}
                    onChange={(e) => setLocalPrivacy(prev => ({
                      ...prev,
                      anonymizeData: e.target.checked,
                    }))}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      Anonymize data
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Remove personally identifiable information from stored data.
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data retention period (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={localPrivacy.retentionPeriod || 30}
                    onChange={(e) => setLocalPrivacy(prev => ({
                      ...prev,
                      retentionPeriod: parseInt(e.target.value) || 30,
                    }))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Data older than this will be automatically deleted.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Data Rights (GDPR) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Your Data Rights
            </h3>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export My Data'}
              </button>

              <button
                onClick={handleDeleteData}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete All Data'}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              You have the right to access, export, and delete your personal data at any time.
            </p>
          </div>

          {/* Consent History */}
          {consentStatus.consentDate && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Last consent given:</strong>{' '}
                {consentStatus.consentDate.toLocaleDateString()} at{' '}
                {consentStatus.consentDate.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveConsent}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}