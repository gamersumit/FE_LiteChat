import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserPreferences, PrivacySettings } from '../../types/api'

interface PersonalizationContextType {
  userPreferences: UserPreferences | null
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  learnedPreferences: {
    preferredTheme?: string
    preferredFontSize?: string
    preferredLanguage?: string
    communicationStyle?: string
    frequentlyUsedFeatures?: string[]
  } | null
  isLearning: boolean
  adaptiveSettings: {
    fontSize?: string
    colorScheme?: string
    animationLevel?: string
    interactionMode?: string
    layoutDensity?: string
  } | null
  updateAdaptiveSettings: (settings: Record<string, any>) => void
  privacySettings: PrivacySettings | null
  anonymizedUserId: string | null
}

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined)

interface PersonalizationProviderProps {
  userId: string
  children: ReactNode
  initialPreferences?: UserPreferences
  initialAdaptiveSettings?: Record<string, any>
  privacySettings?: PrivacySettings
  enableLearning?: boolean
  mockLearnedPreferences?: any
  onPreferencesUpdate?: (preferences: UserPreferences) => void
}

export function PersonalizationProvider({
  userId,
  children,
  initialPreferences,
  initialAdaptiveSettings,
  privacySettings,
  enableLearning = false,
  mockLearnedPreferences,
  onPreferencesUpdate,
}: PersonalizationProviderProps) {
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(
    initialPreferences || {
      user_id: userId,
      theme: 'system',
      language: 'en',
      notifications: true,
      accessibility_mode: false,
      font_size: 'medium',
      high_contrast: false,
      reduced_motion: false,
      conversation_style: 'casual',
      custom_settings: {},
    }
  )

  const [learnedPreferences, setLearnedPreferences] = useState(mockLearnedPreferences)
  const [isLearning] = useState(enableLearning)
  const [adaptiveSettings, setAdaptiveSettings] = useState(initialAdaptiveSettings || null)
  const [currentPrivacySettings] = useState<PrivacySettings | null>(
    privacySettings || {
      dataCollection: false,
      analytics: false,
      personalization: true,
      anonymizeData: true,
    }
  )

  const anonymizedUserId = `anon-${userId.substring(0, 8)}`

  const updatePreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
    if (!userPreferences) return

    const updated = { ...userPreferences, ...preferences }
    setUserPreferences(updated)
    onPreferencesUpdate?.(updated)
  }

  const updateAdaptiveSettings = (settings: Record<string, any>): void => {
    setAdaptiveSettings(prev => ({ ...prev, ...settings }))
  }

  // Mock learning effect
  useEffect(() => {
    if (mockLearnedPreferences) {
      const timer = setTimeout(() => {
        setLearnedPreferences(mockLearnedPreferences)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [mockLearnedPreferences])

  const contextValue: PersonalizationContextType = {
    userPreferences,
    updatePreferences,
    learnedPreferences,
    isLearning,
    adaptiveSettings,
    updateAdaptiveSettings,
    privacySettings: currentPrivacySettings,
    anonymizedUserId,
  }

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  )
}

export function usePersonalizationContext(): PersonalizationContextType {
  const context = useContext(PersonalizationContext)
  if (context === undefined) {
    throw new Error('usePersonalizationContext must be used within PersonalizationProvider')
  }
  return context
}