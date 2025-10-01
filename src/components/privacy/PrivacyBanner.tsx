import { useState, useEffect } from 'react'
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking'

interface PrivacyBannerProps {
  userId: string
  onConsentUpdate?: (hasConsent: boolean) => void
}

export function PrivacyBanner({ userId, onConsentUpdate }: PrivacyBannerProps) {
  const { consentStatus, updateConsent, error } = useBehaviorTracking(userId)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Show banner if user hasn't given consent yet
    const hasGivenConsent = consentStatus.consentDate !== undefined
    setIsVisible(!hasGivenConsent)
  }, [consentStatus.consentDate])

  const handleAcceptAll = async () => {
    setIsAnimating(true)
    try {
      await updateConsent({
        dataCollection: true,
        analytics: true,
        personalization: true,
      })
      onConsentUpdate?.(true)
      setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
      }, 300)
    } catch (error) {
      setIsAnimating(false)
      console.error('Failed to update consent:', error)
    }
  }

  const handleAcceptEssential = async () => {
    setIsAnimating(true)
    try {
      await updateConsent({
        dataCollection: false,
        analytics: false,
        personalization: true,
      })
      onConsentUpdate?.(false)
      setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
      }, 300)
    } catch (error) {
      setIsAnimating(false)
      console.error('Failed to update consent:', error)
    }
  }

  const handleCustomize = () => {
    // This would open the ConsentManager component
    // The parent component should handle this
    const event = new CustomEvent('openConsentManager', { detail: { userId } })
    window.dispatchEvent(event)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 transform transition-transform duration-300 ${
        isAnimating ? 'translate-y-full' : 'translate-y-0'
      }`}
      role="banner"
      aria-label="Privacy consent banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Content */}
          <div className="flex-1 pr-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Your Privacy Matters
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  We use cookies and similar technologies to enhance your experience, 
                  provide personalized features, and analyze usage patterns. All data 
                  is processed locally and anonymized for your privacy.
                </p>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Error: {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 lg:flex-shrink-0">
            <button
              onClick={handleCustomize}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Customize Settings
            </button>
            <button
              onClick={handleAcceptEssential}
              disabled={isAnimating}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Essential Only
            </button>
            <button
              onClick={handleAcceptAll}
              disabled={isAnimating}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnimating ? 'Saving...' : 'Accept All'}
            </button>
          </div>
        </div>

        {/* Privacy Policy Link */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By continuing to use this application, you agree to our use of technologies
            as described in our{' '}
            <a
              href="#privacy-policy"
              className="underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="#cookie-policy"
              className="underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cookie Policy
            </a>
            . You can change your preferences at any time.
          </p>
        </div>
      </div>
    </div>
  )
}