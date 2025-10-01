import { useState, useEffect, useCallback, useRef } from 'react'
import { AdaptiveThemeService, type ThemePreferences, type AdaptiveThemeConfig } from '../services/adaptiveThemeService'
import { useBehaviorTracking } from './useBehaviorTracking'
import { usePersonalizationContext } from '../components/personalization/PersonalizationProvider'

interface ThemeContextualData {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  ambientLight?: 'bright' | 'dim' | 'dark'
  focusMode?: boolean
  readingMode?: boolean
}

interface AdaptiveThemeState {
  config: AdaptiveThemeConfig | null
  cssVariables: Record<string, string>
  isAdapting: boolean
  adaptationHistory: Array<{
    timestamp: Date
    adaptation: string
    reason: string
    effectiveness?: number
  }>
  error: string | null
}

export function useAdaptiveTheme(userId: string) {
  const { patterns, trackThemeChange } = useBehaviorTracking(userId)
  const { userPreferences, updatePreferences } = usePersonalizationContext()
  const themeServiceRef = useRef<AdaptiveThemeService | null>(null)
  
  const [state, setState] = useState<AdaptiveThemeState>({
    config: null,
    cssVariables: {},
    isAdapting: false,
    adaptationHistory: [],
    error: null,
  })

  const [contextualData, setContextualData] = useState<ThemeContextualData>({})

  // Initialize theme service
  useEffect(() => {
    if (!themeServiceRef.current) {
      themeServiceRef.current = new AdaptiveThemeService()
    }

    // Load or initialize user theme config
    const loadThemeConfig = () => {
      try {
        let config = themeServiceRef.current!.getUserThemeConfig(userId)
        if (!config) {
          const initialPreferences: Partial<ThemePreferences> = {
            primaryTheme: userPreferences?.theme as ThemePreferences['primaryTheme'] || 'system',
            fontSize: userPreferences?.font_size as ThemePreferences['fontSize'] || 'medium',
            reducedMotion: userPreferences?.reduced_motion || false,
          }
          config = themeServiceRef.current!.initializeUserTheme(userId, initialPreferences)
        }

        const cssVariables = themeServiceRef.current!.generateThemeCSS(config)
        
        setState(prev => ({
          ...prev,
          config,
          cssVariables,
          adaptationHistory: config.adaptationHistory,
          error: null,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to load theme configuration',
        }))
      }
    }

    loadThemeConfig()
  }, [userId, userPreferences])

  // Apply CSS variables to document
  useEffect(() => {
    const root = document.documentElement
    Object.entries(state.cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Cleanup function to remove variables if component unmounts
    return () => {
      Object.keys(state.cssVariables).forEach(property => {
        root.style.removeProperty(property)
      })
    }
  }, [state.cssVariables])

  // Auto-detect time of day
  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours()
      let timeOfDay: ThemeContextualData['timeOfDay']
      
      if (hour >= 5 && hour < 12) timeOfDay = 'morning'
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening'
      else timeOfDay = 'night'

      setContextualData(prev => ({ ...prev, timeOfDay }))
    }

    updateTimeOfDay()
    const interval = setInterval(updateTimeOfDay, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Auto-detect ambient light (using device ambient light sensor if available)
  useEffect(() => {
    const handleAmbientLight = (event: any) => {
      let ambientLight: ThemeContextualData['ambientLight']
      
      if (event.value > 100) ambientLight = 'bright'
      else if (event.value > 10) ambientLight = 'dim'
      else ambientLight = 'dark'

      setContextualData(prev => ({ ...prev, ambientLight }))
    }

    // @ts-ignore - DeviceAmbientLightEvent may not be available in all browsers
    if ('DeviceAmbientLightEvent' in window) {
      // @ts-ignore
      window.addEventListener('devicelight', handleAmbientLight)
      return () => {
        // @ts-ignore
        window.removeEventListener('devicelight', handleAmbientLight)
      }
    }
  }, [])

  // Adapt theme based on user behavior patterns
  useEffect(() => {
    if (!themeServiceRef.current || !state.config || patterns.length === 0) return

    const adaptTheme = async () => {
      if (state.isAdapting) return

      setState(prev => ({ ...prev, isAdapting: true }))

      try {
        const updatedConfig = await themeServiceRef.current!.adaptThemeFromBehavior(userId, patterns)
        const cssVariables = themeServiceRef.current!.generateThemeCSS(updatedConfig)

        setState(prev => ({
          ...prev,
          config: updatedConfig,
          cssVariables,
          adaptationHistory: updatedConfig.adaptationHistory,
          isAdapting: false,
          error: null,
        }))

        // Track theme changes
        if (updatedConfig.theme.primaryTheme !== state.config?.theme.primaryTheme) {
          await trackThemeChange(updatedConfig.theme.primaryTheme, 'auto_adapt')
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isAdapting: false,
          error: 'Failed to adapt theme based on behavior',
        }))
      }
    }

    // Debounce adaptation
    const timeoutId = setTimeout(adaptTheme, 2000)
    return () => clearTimeout(timeoutId)
  }, [patterns, userId, trackThemeChange, state.config?.theme.primaryTheme])

  /**
   * Manually update theme preferences
   */
  const updateTheme = useCallback(async (updates: Partial<ThemePreferences>) => {
    if (!themeServiceRef.current) return

    try {
      const updatedTheme = themeServiceRef.current.updateThemePreferences(userId, updates)
      const config = themeServiceRef.current.getUserThemeConfig(userId)!
      const cssVariables = themeServiceRef.current.generateThemeCSS(config)

      setState(prev => ({
        ...prev,
        config,
        cssVariables,
        adaptationHistory: config.adaptationHistory,
      }))

      // Update personalization context
      if (updates.primaryTheme) {
        await updatePreferences({ theme: updates.primaryTheme as 'light' | 'dark' | 'system' })
        await trackThemeChange(updates.primaryTheme, 'user_preference')
      }

      if (updates.fontSize) {
        await updatePreferences({ font_size: updates.fontSize })
      }

      if (updates.reducedMotion !== undefined) {
        await updatePreferences({ reduced_motion: updates.reducedMotion })
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update theme preferences',
      }))
    }
  }, [userId, updatePreferences, trackThemeChange])

  /**
   * Apply contextual adaptations
   */
  const applyContextualAdaptations = useCallback(async (context: Partial<ThemeContextualData>) => {
    if (!themeServiceRef.current) return

    try {
      const updatedConfig = themeServiceRef.current.applyContextualAdaptations(userId, context)
      const cssVariables = themeServiceRef.current.generateThemeCSS(updatedConfig)

      setState(prev => ({
        ...prev,
        config: updatedConfig,
        cssVariables,
        adaptationHistory: updatedConfig.adaptationHistory,
      }))

      // Update contextual data
      setContextualData(prev => ({ ...prev, ...context }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to apply contextual adaptations',
      }))
    }
  }, [userId])

  /**
   * Toggle focus mode
   */
  const toggleFocusMode = useCallback(async (enabled?: boolean) => {
    const newFocusMode = enabled !== undefined ? enabled : !contextualData.focusMode
    await applyContextualAdaptations({ focusMode: newFocusMode })
  }, [contextualData.focusMode, applyContextualAdaptations])

  /**
   * Toggle reading mode
   */
  const toggleReadingMode = useCallback(async (enabled?: boolean) => {
    const newReadingMode = enabled !== undefined ? enabled : !contextualData.readingMode
    await applyContextualAdaptations({ readingMode: newReadingMode })
  }, [contextualData.readingMode, applyContextualAdaptations])

  /**
   * Enable/disable auto-adaptations
   */
  const toggleAutoAdaptation = useCallback((type: keyof AdaptiveThemeConfig['behaviorDrivenChanges'], enabled: boolean) => {
    if (!state.config) return

    const updatedConfig = {
      ...state.config,
      behaviorDrivenChanges: {
        ...state.config.behaviorDrivenChanges,
        [type]: enabled,
      },
    }

    setState(prev => ({
      ...prev,
      config: updatedConfig,
    }))
  }, [state.config])

  /**
   * Get theme recommendations based on current context
   */
  const getThemeRecommendations = useCallback(() => {
    if (!state.config) return []

    const recommendations: Array<{
      type: 'theme' | 'font' | 'contrast' | 'accessibility'
      suggestion: string
      reason: string
      confidence: number
    }> = []

    // Time-based recommendations
    if (contextualData.timeOfDay === 'night' && state.config.theme.primaryTheme === 'light') {
      recommendations.push({
        type: 'theme',
        suggestion: 'Switch to dark theme',
        reason: 'Dark themes are easier on the eyes during nighttime',
        confidence: 0.8,
      })
    }

    // Reading patterns
    const hasLongReadingSessions = patterns.some(p => 
      p.type === 'temporal_pattern' && p.data.sessionDuration > 30 * 60 * 1000
    )
    if (hasLongReadingSessions && state.config.theme.fontSize === 'small') {
      recommendations.push({
        type: 'font',
        suggestion: 'Increase font size',
        reason: 'Larger fonts reduce eye strain during long reading sessions',
        confidence: 0.7,
      })
    }

    // Accessibility recommendations
    const hasAccessibilityNeeds = patterns.some(p => 
      p.type === 'accessibility_action' || p.data.usesTabNavigation
    )
    if (hasAccessibilityNeeds && state.config.theme.contrast === 'normal') {
      recommendations.push({
        type: 'contrast',
        suggestion: 'Enable high contrast mode',
        reason: 'High contrast improves readability for accessibility users',
        confidence: 0.9,
      })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }, [state.config, contextualData, patterns])

  /**
   * Reset theme to defaults
   */
  const resetTheme = useCallback(async () => {
    if (!themeServiceRef.current) return

    const defaultPreferences: Partial<ThemePreferences> = {
      primaryTheme: 'system',
      accentColor: '#3b82f6',
      fontSize: 'medium',
      fontFamily: 'system',
      contrast: 'normal',
      reducedMotion: false,
      colorBlindnessSupport: 'none',
    }

    await updateTheme(defaultPreferences)
  }, [updateTheme])

  /**
   * Export theme configuration
   */
  const exportThemeConfig = useCallback(() => {
    if (!state.config) return null

    return {
      theme: state.config.theme,
      adaptationSettings: state.config.contextualAdaptations,
      behaviorSettings: state.config.behaviorDrivenChanges,
      exportDate: new Date().toISOString(),
    }
  }, [state.config])

  /**
   * Import theme configuration
   */
  const importThemeConfig = useCallback(async (configData: any) => {
    try {
      if (configData.theme) {
        await updateTheme(configData.theme)
      }
      if (configData.adaptationSettings && state.config) {
        const updatedConfig = {
          ...state.config,
          contextualAdaptations: configData.adaptationSettings,
        }
        setState(prev => ({ ...prev, config: updatedConfig }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to import theme configuration',
      }))
    }
  }, [updateTheme, state.config])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    theme: state.config?.theme || null,
    cssVariables: state.cssVariables,
    isAdapting: state.isAdapting,
    adaptationHistory: state.adaptationHistory,
    contextualData,
    error: state.error,

    // Theme controls
    updateTheme,
    resetTheme,

    // Contextual adaptations
    applyContextualAdaptations,
    toggleFocusMode,
    toggleReadingMode,

    // Auto-adaptation controls
    toggleAutoAdaptation,

    // Recommendations
    getThemeRecommendations,

    // Import/Export
    exportThemeConfig,
    importThemeConfig,

    // Utility
    clearError,

    // Computed properties
    isDarkMode: state.config?.theme.primaryTheme === 'dark' || 
                (state.config?.theme.primaryTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
                ((state.config?.theme.primaryTheme as string) === 'auto' && (new Date().getHours() < 7 || new Date().getHours() >= 19)),
    
    currentTheme: state.config?.theme.primaryTheme || 'system',
    currentFontSize: state.config?.theme.fontSize || 'medium',
    currentContrast: state.config?.theme.contrast || 'normal',
    hasReducedMotion: state.config?.theme.reducedMotion || false,
  }
}