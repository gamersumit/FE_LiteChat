import { useState, useCallback } from 'react'
import { usePersonalizationContext } from '../components/personalization/PersonalizationProvider'
import type { UserInteraction, UserBehaviorPattern, PrivacySettings } from '../types/api'

interface PersonalizationState {
  interactions: UserInteraction[]
  learnedPreferences: {
    preferredTheme?: string
    preferredFontSize?: string
    frequentlyUsedFeatures?: string[]
  }
  privacySettings: PrivacySettings
}

export function usePersonalization() {
  const { userPreferences, updatePreferences, privacySettings } = usePersonalizationContext()
  
  const [state, setState] = useState<PersonalizationState>({
    interactions: [],
    learnedPreferences: {},
    privacySettings: privacySettings || {
      dataCollection: false,
      analytics: false,
      personalization: true,
      anonymizeData: true,
    },
  })

  const trackInteraction = useCallback(async (interaction: Omit<UserInteraction, 'id' | 'anonymizedUserId'>) => {
    if (!state.privacySettings.dataCollection) return

    const newInteraction: UserInteraction = {
      id: `interaction-${Date.now()}`,
      anonymizedUserId: 'anon-user',
      ...interaction,
    }

    setState(prev => ({
      ...prev,
      interactions: [...prev.interactions, newInteraction],
    }))
  }, [state.privacySettings.dataCollection])

  const analyzeAndUpdatePreferences = useCallback(async () => {
    // Simulate preference learning from interactions
    const themeInteractions = state.interactions.filter(i => i.type === 'theme_change')
    const fontInteractions = state.interactions.filter(i => i.type === 'font_size_change')
    
    const learned = {
      preferredTheme: themeInteractions.length > 0 ? 
        themeInteractions[themeInteractions.length - 1].data.theme as string : undefined,
      preferredFontSize: fontInteractions.length > 0 ?
        fontInteractions[fontInteractions.length - 1].data.fontSize as string : undefined,
    }

    setState(prev => ({
      ...prev,
      learnedPreferences: learned,
    }))
  }, [state.interactions])

  const predictUserPreferences = useCallback(async () => {
    const quickReplyInteractions = state.interactions.filter(i => i.type === 'quick_reply_used')
    
    return {
      prefersQuickReplies: quickReplyInteractions.length >= 3,
      suggestedResponseTime: quickReplyInteractions.length > 0 ? 
        quickReplyInteractions.reduce((sum, i) => sum + (i.data.responseTime as number || 0), 0) / quickReplyInteractions.length :
        0,
    }
  }, [state.interactions])

  const getAdaptiveInterfaceSuggestions = useCallback(async () => {
    const zoomInteractions = state.interactions.filter(i => i.type === 'zoom_action')
    const suggestions = []

    if (zoomInteractions.some(i => i.data.action === 'zoom_in')) {
      suggestions.push({
        type: 'font_size',
        suggestion: 'increase',
        reason: 'user_accessibility_behavior',
        confidence: 0.8,
      })
    }

    return suggestions
  }, [state.interactions])

  const getAdaptiveLayoutConfig = useCallback(async () => {
    const featureUsage = state.interactions.filter(i => i.type === 'feature_usage')
    const featuredComponents = []
    const quickAccessFeatures = []

    featureUsage.forEach(interaction => {
      const feature = interaction.data.feature as string
      if (feature) {
        featuredComponents.push(feature)
        quickAccessFeatures.push(feature)
      }
    })

    return {
      featuredComponents: [...new Set(featuredComponents)],
      quickAccessFeatures: [...new Set(quickAccessFeatures)],
    }
  }, [state.interactions])

  const getPersonalizedUILayout = useCallback(async () => {
    const uiInteractions = state.interactions.filter(i => i.type === 'ui_interaction')
    
    let chatButtonPosition = 'bottom-right'
    const priorityFeatures = []

    uiInteractions.forEach(interaction => {
      if (interaction.data.element === 'chat_button') {
        chatButtonPosition = interaction.data.position as string
      }
      if (interaction.data.element === 'file_upload_button') {
        priorityFeatures.push('file_upload')
      }
    })

    return {
      chatButtonPosition,
      priorityFeatures,
    }
  }, [state.interactions])

  const getAccessibilityAdaptations = useCallback(async () => {
    const keyboardNav = state.interactions.some(i => 
      i.type === 'keyboard_navigation' && i.data.usesTabNavigation
    )
    const screenReader = state.interactions.some(i => 
      i.type === 'screen_reader_usage' && i.data.detected
    )

    const enabledFeatures = []
    if (keyboardNav) enabledFeatures.push('keyboard_navigation')
    if (screenReader) enabledFeatures.push('screen_reader_support')

    return {
      enabledFeatures,
      focusManagement: enabledFeatures.length > 0 ? 'enhanced' : 'standard',
      ariaLabels: screenReader ? 'verbose' : 'standard',
    }
  }, [state.interactions])

  const updatePrivacySettings = useCallback((settings: Partial<PrivacySettings>) => {
    setState(prev => ({
      ...prev,
      privacySettings: { ...prev.privacySettings, ...settings },
      interactions: settings.dataCollection === false ? [] : prev.interactions,
    }))
  }, [])

  const getAnonymizedInteractions = useCallback(() => {
    return state.interactions.map(interaction => ({
      ...interaction,
      data: { ...interaction.data, userId: undefined, content: undefined },
    }))
  }, [state.interactions])

  return {
    // State
    interactions: state.interactions,
    learnedPreferences: state.learnedPreferences,
    privacySettings: state.privacySettings,

    // Methods
    trackInteraction,
    analyzeAndUpdatePreferences,
    predictUserPreferences,
    getAdaptiveInterfaceSuggestions,
    getAdaptiveLayoutConfig,
    getPersonalizedUILayout,
    getAccessibilityAdaptations,
    updatePrivacySettings,
    getAnonymizedInteractions,
  }
}