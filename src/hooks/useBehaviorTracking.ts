import { useState, useCallback, useEffect, useRef } from 'react'
import { UserBehaviorService } from '../services/userBehaviorService'
import { usePersonalizationContext } from '../components/personalization/PersonalizationProvider'
import type { UserInteraction, UserBehaviorPattern, PrivacySettings } from '../types/api'

interface BehaviorTrackingState {
  isTracking: boolean
  patterns: UserBehaviorPattern[]
  privacySettings: PrivacySettings
  consentStatus: {
    dataCollection: boolean
    analytics: boolean
    personalization: boolean
    consentDate?: Date
  }
  error: string | null
}

export function useBehaviorTracking(userId: string) {
  const { privacySettings: contextPrivacySettings } = usePersonalizationContext()
  const behaviorServiceRef = useRef<UserBehaviorService | null>(null)
  
  const [state, setState] = useState<BehaviorTrackingState>({
    isTracking: false,
    patterns: [],
    privacySettings: {
      dataCollection: false,
      analytics: false,
      personalization: true,
      anonymizeData: true,
      retentionPeriod: 30,
    },
    consentStatus: {
      dataCollection: false,
      analytics: false,
      personalization: true,
    },
    error: null,
  })

  // Initialize service
  useEffect(() => {
    if (!behaviorServiceRef.current) {
      behaviorServiceRef.current = new UserBehaviorService()
    }

    // Load existing privacy settings and consent status
    const loadUserSettings = async () => {
      try {
        const consentStatus = behaviorServiceRef.current!.getConsentStatus(userId)
        const patterns = behaviorServiceRef.current!.getBehaviorPatterns(userId)
        
        setState(prev => ({
          ...prev,
          consentStatus,
          patterns,
          isTracking: consentStatus.dataCollection,
          privacySettings: {
            ...prev.privacySettings,
            ...contextPrivacySettings,
          },
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to load user behavior settings',
        }))
      }
    }

    loadUserSettings()
  }, [userId, contextPrivacySettings])

  /**
   * Track a user interaction
   */
  const trackInteraction = useCallback(async (
    interaction: Omit<UserInteraction, 'id' | 'anonymizedUserId'>
  ) => {
    if (!behaviorServiceRef.current || !state.consentStatus.dataCollection) {
      return
    }

    try {
      await behaviorServiceRef.current.trackInteraction(
        userId,
        interaction,
        state.privacySettings
      )

      // Update patterns periodically
      if (Math.random() < 0.1) { // 10% chance to update patterns
        const updatedPatterns = await behaviorServiceRef.current.analyzeUserBehavior(userId)
        setState(prev => ({
          ...prev,
          patterns: updatedPatterns,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to track interaction',
      }))
    }
  }, [userId, state.consentStatus.dataCollection, state.privacySettings])

  /**
   * Track message interactions
   */
  const trackMessage = useCallback(async (
    content: string,
    messageType: 'sent' | 'received' = 'sent',
    metadata?: Record<string, unknown>
  ) => {
    await trackInteraction({
      type: messageType === 'sent' ? 'message_sent' : 'message_received',
      timestamp: new Date(),
      data: {
        messageLength: content.length,
        containsEmoji: /[\p{Emoji}]/u.test(content),
        wordCount: content.split(/\s+/).length,
        ...metadata,
      },
    })
  }, [trackInteraction])

  /**
   * Track feature usage
   */
  const trackFeatureUsage = useCallback(async (
    feature: string,
    success: boolean = true,
    metadata?: Record<string, unknown>
  ) => {
    await trackInteraction({
      type: 'feature_usage',
      timestamp: new Date(),
      data: {
        feature,
        success,
        ...metadata,
      },
    })
  }, [trackInteraction])

  /**
   * Track UI interactions
   */
  const trackUIInteraction = useCallback(async (
    element: string,
    action: string,
    metadata?: Record<string, unknown>
  ) => {
    await trackInteraction({
      type: 'ui_interaction',
      timestamp: new Date(),
      data: {
        element,
        action,
        timestamp: Date.now(),
        ...metadata,
      },
    })
  }, [trackInteraction])

  /**
   * Track theme changes
   */
  const trackThemeChange = useCallback(async (
    newTheme: string,
    reason: 'user_preference' | 'auto_adapt' | 'time_based' = 'user_preference'
  ) => {
    await trackInteraction({
      type: 'theme_change',
      timestamp: new Date(),
      data: {
        theme: newTheme,
        reason,
      },
    })
  }, [trackInteraction])

  /**
   * Track accessibility interactions
   */
  const trackAccessibilityAction = useCallback(async (
    action: string,
    metadata?: Record<string, unknown>
  ) => {
    await trackInteraction({
      type: 'accessibility_action',
      timestamp: new Date(),
      data: {
        action,
        ...metadata,
      },
    })
  }, [trackInteraction])

  /**
   * Update user consent
   */
  const updateConsent = useCallback(async (consent: {
    dataCollection: boolean
    analytics: boolean
    personalization: boolean
  }) => {
    try {
      behaviorServiceRef.current!.updateConsent(userId, consent)
      
      setState(prev => ({
        ...prev,
        consentStatus: {
          ...consent,
          consentDate: new Date(),
        },
        isTracking: consent.dataCollection,
        error: null,
      }))

      // If data collection was disabled, clear patterns
      if (!consent.dataCollection) {
        setState(prev => ({
          ...prev,
          patterns: [],
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update consent',
      }))
    }
  }, [userId])

  /**
   * Update privacy settings
   */
  const updatePrivacySettings = useCallback((settings: Partial<PrivacySettings>) => {
    try {
      behaviorServiceRef.current!.updatePrivacySettings(userId, settings)
      
      setState(prev => ({
        ...prev,
        privacySettings: {
          ...prev.privacySettings,
          ...settings,
        },
        error: null,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update privacy settings',
      }))
    }
  }, [userId])

  /**
   * Refresh behavior patterns
   */
  const refreshPatterns = useCallback(async () => {
    if (!behaviorServiceRef.current || !state.consentStatus.analytics) {
      return
    }

    try {
      const patterns = await behaviorServiceRef.current.analyzeUserBehavior(userId)
      setState(prev => ({
        ...prev,
        patterns,
        error: null,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to refresh behavior patterns',
      }))
    }
  }, [userId, state.consentStatus.analytics])

  /**
   * Export user data (GDPR compliance)
   */
  const exportUserData = useCallback(() => {
    if (!behaviorServiceRef.current) {
      return null
    }

    return behaviorServiceRef.current.exportUserData(userId)
  }, [userId])

  /**
   * Delete user data (GDPR compliance)
   */
  const deleteUserData = useCallback(() => {
    if (!behaviorServiceRef.current) {
      return false
    }

    const deleted = behaviorServiceRef.current.deleteUserData(userId)
    if (deleted) {
      setState(prev => ({
        ...prev,
        patterns: [],
        isTracking: false,
        consentStatus: {
          dataCollection: false,
          analytics: false,
          personalization: true,
        },
      }))
    }

    return deleted
  }, [userId])

  /**
   * Get anonymized interactions for analysis
   */
  const getAnonymizedData = useCallback(() => {
    if (!behaviorServiceRef.current) {
      return []
    }

    return behaviorServiceRef.current.getAnonymizedInteractions(userId)
  }, [userId])

  /**
   * Get behavior insights for UI adaptation
   */
  const getBehaviorInsights = useCallback(() => {
    const insights = {
      communicationStyle: 'unknown' as 'verbose' | 'brief' | 'unknown',
      preferredTheme: 'unknown' as string,
      mostUsedFeatures: [] as string[],
      activityPattern: 'unknown' as 'night_owl' | 'early_bird' | 'regular' | 'unknown',
      expertiseLevel: 'unknown' as string,
    }

    state.patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'communication_style':
          insights.communicationStyle = pattern.data.preferredStyle as typeof insights.communicationStyle
          break
        case 'preference_pattern':
          insights.preferredTheme = pattern.data.preferredTheme as string || 'unknown'
          break
        case 'feature_usage':
          insights.mostUsedFeatures = pattern.data.mostUsedFeatures as string[] || []
          break
        case 'temporal_pattern':
          insights.activityPattern = pattern.data.userType as typeof insights.activityPattern
          break
      }
    })

    return insights
  }, [state.patterns])

  /**
   * Start tracking (with consent)
   */
  const startTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTracking: true,
    }))
  }, [])

  /**
   * Stop tracking
   */
  const stopTracking = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTracking: false,
    }))
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  return {
    // State
    isTracking: state.isTracking,
    patterns: state.patterns,
    privacySettings: state.privacySettings,
    consentStatus: state.consentStatus,
    error: state.error,

    // Tracking methods
    trackInteraction,
    trackMessage,
    trackFeatureUsage,
    trackUIInteraction,
    trackThemeChange,
    trackAccessibilityAction,

    // Privacy and consent
    updateConsent,
    updatePrivacySettings,
    exportUserData,
    deleteUserData,
    getAnonymizedData,

    // Analysis and insights
    refreshPatterns,
    getBehaviorInsights,

    // Control
    startTracking,
    stopTracking,
    clearError,
  }
}