import { nanoid } from 'nanoid'
import type { UserBehaviorPattern, UserInteraction } from '../types/api'

export interface ThemePreferences {
  id: string
  userId: string
  primaryTheme: 'light' | 'dark' | 'auto' | 'system'
  accentColor: string
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  fontFamily: 'system' | 'mono' | 'serif'
  contrast: 'normal' | 'high' | 'low'
  reducedMotion: boolean
  colorBlindnessSupport: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
  customColors?: {
    background: string
    foreground: string
    accent: string
    muted: string
  }
  lastUpdated: Date
}

export interface AdaptiveThemeConfig {
  theme: ThemePreferences
  contextualAdaptations: {
    timeBasedTheme: boolean
    environmentalAdjustments: boolean
    accessibilityEnhancements: boolean
    focusModeOptimizations: boolean
  }
  behaviorDrivenChanges: {
    autoFontSize: boolean
    autoContrast: boolean
    autoColorScheme: boolean
  }
  adaptationHistory: Array<{
    timestamp: Date
    adaptation: string
    reason: string
    effectiveness?: number
  }>
}

export class AdaptiveThemeService {
  private themes: Map<string, AdaptiveThemeConfig> = new Map()
  private readonly STORAGE_KEY = 'adaptive_theme_configs'
  
  constructor() {
    this.loadFromStorage()
    this.setupTimeBasedAdaptation()
    this.setupEnvironmentalListeners()
  }

  /**
   * Initialize adaptive theme for a user
   */
  initializeUserTheme(userId: string, initialPreferences?: Partial<ThemePreferences>): AdaptiveThemeConfig {
    const defaultTheme: ThemePreferences = {
      id: nanoid(),
      userId,
      primaryTheme: 'system',
      accentColor: '#3b82f6',
      fontSize: 'medium',
      fontFamily: 'system',
      contrast: 'normal',
      reducedMotion: false,
      colorBlindnessSupport: 'none',
      lastUpdated: new Date(),
      ...initialPreferences,
    }

    const config: AdaptiveThemeConfig = {
      theme: defaultTheme,
      contextualAdaptations: {
        timeBasedTheme: true,
        environmentalAdjustments: true,
        accessibilityEnhancements: true,
        focusModeOptimizations: false,
      },
      behaviorDrivenChanges: {
        autoFontSize: false,
        autoContrast: false,
        autoColorScheme: false,
      },
      adaptationHistory: [],
    }

    this.themes.set(userId, config)
    this.saveToStorage()
    return config
  }

  /**
   * Update user theme preferences
   */
  updateThemePreferences(userId: string, updates: Partial<ThemePreferences>): ThemePreferences {
    const config = this.themes.get(userId)
    if (!config) {
      return this.initializeUserTheme(userId, updates).theme
    }

    config.theme = {
      ...config.theme,
      ...updates,
      lastUpdated: new Date(),
    }

    this.recordAdaptation(userId, 'manual_update', 'User manually updated preferences')
    this.saveToStorage()
    return config.theme
  }

  /**
   * Adapt theme based on user behavior patterns
   */
  async adaptThemeFromBehavior(userId: string, patterns: UserBehaviorPattern[]): Promise<AdaptiveThemeConfig> {
    const config = this.themes.get(userId) || this.initializeUserTheme(userId)
    
    if (!config.behaviorDrivenChanges.autoFontSize && 
        !config.behaviorDrivenChanges.autoContrast && 
        !config.behaviorDrivenChanges.autoColorScheme) {
      return config
    }

    let adaptationsMade = false

    // Analyze communication patterns for font size adaptation
    const communicationPattern = patterns.find(p => p.type === 'communication_style')
    if (communicationPattern && config.behaviorDrivenChanges.autoFontSize) {
      const newFontSize = this.adaptFontSizeFromCommunication(communicationPattern)
      if (newFontSize && newFontSize !== config.theme.fontSize) {
        config.theme.fontSize = newFontSize
        this.recordAdaptation(userId, 'auto_font_size', `Adapted to ${newFontSize} based on communication patterns`)
        adaptationsMade = true
      }
    }

    // Analyze temporal patterns for theme adaptation
    const temporalPattern = patterns.find(p => p.type === 'temporal_pattern')
    if (temporalPattern && config.behaviorDrivenChanges.autoColorScheme) {
      const newTheme = this.adaptThemeFromTemporal(temporalPattern)
      if (newTheme && newTheme !== config.theme.primaryTheme) {
        config.theme.primaryTheme = newTheme
        this.recordAdaptation(userId, 'auto_theme', `Adapted to ${newTheme} based on usage patterns`)
        adaptationsMade = true
      }
    }

    // Analyze accessibility patterns
    const accessibilityNeeds = this.detectAccessibilityNeeds(patterns)
    if (accessibilityNeeds.length > 0 && config.contextualAdaptations.accessibilityEnhancements) {
      const accessibilityAdaptations = this.applyAccessibilityAdaptations(config.theme, accessibilityNeeds)
      if (accessibilityAdaptations) {
        Object.assign(config.theme, accessibilityAdaptations)
        this.recordAdaptation(userId, 'accessibility_enhancement', `Applied accessibility adaptations: ${accessibilityNeeds.join(', ')}`)
        adaptationsMade = true
      }
    }

    if (adaptationsMade) {
      config.theme.lastUpdated = new Date()
      this.saveToStorage()
    }

    return config
  }

  /**
   * Get current theme configuration for a user
   */
  getUserThemeConfig(userId: string): AdaptiveThemeConfig | null {
    return this.themes.get(userId) || null
  }

  /**
   * Apply contextual theme adaptations
   */
  applyContextualAdaptations(userId: string, context: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
    ambientLight?: 'bright' | 'dim' | 'dark'
    focusMode?: boolean
    readingMode?: boolean
  }): AdaptiveThemeConfig {
    const config = this.themes.get(userId) || this.initializeUserTheme(userId)
    const originalTheme = { ...config.theme }

    // Time-based adaptations
    if (context.timeOfDay && config.contextualAdaptations.timeBasedTheme) {
      const timeBasedTheme = this.getTimeBasedTheme(context.timeOfDay)
      if (timeBasedTheme !== config.theme.primaryTheme) {
        config.theme.primaryTheme = timeBasedTheme
        this.recordAdaptation(userId, 'time_based', `Switched to ${timeBasedTheme} theme for ${context.timeOfDay}`)
      }
    }

    // Ambient light adaptations
    if (context.ambientLight && config.contextualAdaptations.environmentalAdjustments) {
      const adjustments = this.getAmbientLightAdjustments(context.ambientLight)
      Object.assign(config.theme, adjustments)
      this.recordAdaptation(userId, 'ambient_light', `Adjusted for ${context.ambientLight} lighting`)
    }

    // Focus mode optimizations
    if (context.focusMode && config.contextualAdaptations.focusModeOptimizations) {
      const focusOptimizations = this.getFocusModeOptimizations()
      Object.assign(config.theme, focusOptimizations)
      this.recordAdaptation(userId, 'focus_mode', 'Applied focus mode optimizations')
    }

    // Reading mode optimizations
    if (context.readingMode) {
      const readingOptimizations = this.getReadingModeOptimizations()
      Object.assign(config.theme, readingOptimizations)
      this.recordAdaptation(userId, 'reading_mode', 'Applied reading mode optimizations')
    }

    if (JSON.stringify(originalTheme) !== JSON.stringify(config.theme)) {
      config.theme.lastUpdated = new Date()
      this.saveToStorage()
    }

    return config
  }

  /**
   * Generate CSS custom properties from theme config
   */
  generateThemeCSS(config: AdaptiveThemeConfig): Record<string, string> {
    const { theme } = config
    const isDark = theme.primaryTheme === 'dark' || 
                   (theme.primaryTheme === 'system' && this.isSystemDark()) ||
                   (theme.primaryTheme === 'auto' && this.isAutoThemeDark())

    const baseColors = this.getBaseColorPalette(isDark, theme.accentColor)
    const fontSizes = this.getFontSizeScale(theme.fontSize)
    const contrastAdjustments = this.getContrastAdjustments(theme.contrast)

    return {
      // Color scheme
      '--color-background': theme.customColors?.background || baseColors.background,
      '--color-foreground': theme.customColors?.foreground || baseColors.foreground,
      '--color-accent': theme.customColors?.accent || theme.accentColor,
      '--color-muted': theme.customColors?.muted || baseColors.muted,
      '--color-border': baseColors.border,
      '--color-input': baseColors.input,
      '--color-ring': baseColors.ring,
      
      // Typography
      '--font-size-xs': fontSizes.xs,
      '--font-size-sm': fontSizes.sm,
      '--font-size-base': fontSizes.base,
      '--font-size-lg': fontSizes.lg,
      '--font-size-xl': fontSizes.xl,
      '--font-size-2xl': fontSizes['2xl'],
      '--font-family-base': this.getFontFamily(theme.fontFamily),
      
      // Contrast and accessibility
      '--contrast-multiplier': contrastAdjustments.multiplier,
      '--shadow-strength': contrastAdjustments.shadowStrength,
      '--border-strength': contrastAdjustments.borderStrength,
      
      // Motion preferences
      '--motion-duration': theme.reducedMotion ? '0ms' : '150ms',
      '--motion-easing': theme.reducedMotion ? 'step-end' : 'ease-out',
      
      // Color blindness support
      ...this.getColorBlindnessAdjustments(theme.colorBlindnessSupport),
    }
  }

  /**
   * Learn from user interactions to improve theme adaptations
   */
  learnFromInteractions(userId: string, interactions: UserInteraction[]): void {
    const config = this.themes.get(userId)
    if (!config) return

    // Track theme-related interactions
    const themeInteractions = interactions.filter(i => 
      i.type === 'theme_change' || 
      i.type === 'accessibility_action' ||
      i.type === 'font_size_change'
    )

    // Analyze successful adaptations
    themeInteractions.forEach(interaction => {
      if (interaction.data.success !== false) {
        this.recordAdaptationEffectiveness(userId, interaction.type, 1.0)
      }
    })

    // Look for patterns indicating user dissatisfaction
    const frequentManualChanges = themeInteractions.filter(i => 
      i.data.reason === 'user_preference'
    ).length

    if (frequentManualChanges > 3) {
      // User is frequently overriding adaptations - reduce auto-adaptations
      config.behaviorDrivenChanges.autoColorScheme = false
      this.recordAdaptation(userId, 'learning_adjustment', 'Disabled auto-adaptations due to frequent manual overrides')
    }
  }

  private adaptFontSizeFromCommunication(pattern: UserBehaviorPattern): ThemePreferences['fontSize'] | null {
    const avgMessageLength = pattern.data.averageMessageLength as number
    const avgResponseTime = pattern.data.averageResponseTime as number
    
    // Longer messages with slow response times might indicate difficulty reading
    if (avgMessageLength > 200 && avgResponseTime > 5000) {
      return 'large'
    }
    
    // Very short messages might indicate preference for compact view
    if (avgMessageLength < 20 && avgResponseTime < 1000) {
      return 'small'
    }
    
    return null
  }

  private adaptThemeFromTemporal(pattern: UserBehaviorPattern): ThemePreferences['primaryTheme'] | null {
    const userType = pattern.data.userType as string
    const peakHour = pattern.data.peakActivityHour as number
    
    if (userType === 'night_owl' || peakHour >= 20 || peakHour <= 6) {
      return 'dark'
    }
    
    if (userType === 'early_bird' || (peakHour >= 6 && peakHour <= 10)) {
      return 'light'
    }
    
    return null
  }

  private detectAccessibilityNeeds(patterns: UserBehaviorPattern[]): string[] {
    const needs: string[] = []
    
    patterns.forEach(pattern => {
      if (pattern.type === 'accessibility_action' || 
          (pattern.data.usesTabNavigation && pattern.data.frequency === 'high')) {
        needs.push('keyboard_navigation')
      }
      
      if (pattern.data.detected && pattern.data.ariaUsage === 'extensive') {
        needs.push('screen_reader')
      }
      
      if (pattern.data.action === 'zoom_in' && pattern.data.frequency > 2) {
        needs.push('visual_impairment')
      }
    })
    
    return Array.from(new Set(needs))
  }

  private applyAccessibilityAdaptations(theme: ThemePreferences, needs: string[]): Partial<ThemePreferences> | null {
    const adaptations: Partial<ThemePreferences> = {}
    let hasChanges = false
    
    if (needs.includes('visual_impairment')) {
      adaptations.fontSize = theme.fontSize === 'small' ? 'medium' : 
                           theme.fontSize === 'medium' ? 'large' : 'extra-large'
      adaptations.contrast = 'high'
      hasChanges = true
    }
    
    if (needs.includes('screen_reader') || needs.includes('keyboard_navigation')) {
      adaptations.reducedMotion = true
      hasChanges = true
    }
    
    return hasChanges ? adaptations : null
  }

  private getTimeBasedTheme(timeOfDay: string): ThemePreferences['primaryTheme'] {
    switch (timeOfDay) {
      case 'morning': return 'light'
      case 'afternoon': return 'light'
      case 'evening': return 'dark'
      case 'night': return 'dark'
      default: return 'auto'
    }
  }

  private getAmbientLightAdjustments(ambientLight: string): Partial<ThemePreferences> {
    switch (ambientLight) {
      case 'bright':
        return { contrast: 'high', primaryTheme: 'light' }
      case 'dim':
        return { contrast: 'normal' }
      case 'dark':
        return { contrast: 'high', primaryTheme: 'dark' }
      default:
        return {}
    }
  }

  private getFocusModeOptimizations(): Partial<ThemePreferences> {
    return {
      accentColor: '#6b7280', // Muted accent
      reducedMotion: true,
    }
  }

  private getReadingModeOptimizations(): Partial<ThemePreferences> {
    return {
      fontFamily: 'serif',
      fontSize: 'large',
      contrast: 'high',
    }
  }

  private getBaseColorPalette(isDark: boolean, accentColor: string) {
    if (isDark) {
      return {
        background: '#0f172a',
        foreground: '#f8fafc',
        muted: '#64748b',
        border: '#334155',
        input: '#1e293b',
        ring: accentColor,
      }
    } else {
      return {
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#64748b',
        border: '#e2e8f0',
        input: '#ffffff',
        ring: accentColor,
      }
    }
  }

  private getFontSizeScale(baseSize: ThemePreferences['fontSize']) {
    const scales = {
      small: { multiplier: 0.875, base: '14px' },
      medium: { multiplier: 1, base: '16px' },
      large: { multiplier: 1.125, base: '18px' },
      'extra-large': { multiplier: 1.25, base: '20px' },
    }

    const scale = scales[baseSize]
    return {
      xs: `${12 * scale.multiplier}px`,
      sm: `${14 * scale.multiplier}px`,
      base: scale.base,
      lg: `${18 * scale.multiplier}px`,
      xl: `${20 * scale.multiplier}px`,
      '2xl': `${24 * scale.multiplier}px`,
    }
  }

  private getContrastAdjustments(contrast: ThemePreferences['contrast']) {
    switch (contrast) {
      case 'low':
        return { multiplier: '0.8', shadowStrength: '0.5', borderStrength: '0.5' }
      case 'high':
        return { multiplier: '1.2', shadowStrength: '1.5', borderStrength: '1.5' }
      default:
        return { multiplier: '1', shadowStrength: '1', borderStrength: '1' }
    }
  }

  private getFontFamily(fontFamily: ThemePreferences['fontFamily']): string {
    switch (fontFamily) {
      case 'mono':
        return 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      case 'serif':
        return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
      default:
        return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    }
  }

  private getColorBlindnessAdjustments(type: ThemePreferences['colorBlindnessSupport']): Record<string, string> {
    switch (type) {
      case 'deuteranopia':
        return {
          '--color-success': '#0066cc',
          '--color-warning': '#ff6600',
          '--color-danger': '#cc0000',
        }
      case 'protanopia':
        return {
          '--color-success': '#0066cc',
          '--color-warning': '#ffcc00',
          '--color-danger': '#990000',
        }
      case 'tritanopia':
        return {
          '--color-success': '#00aa00',
          '--color-warning': '#ff0066',
          '--color-danger': '#cc0000',
        }
      default:
        return {}
    }
  }

  private isSystemDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  private isAutoThemeDark(): boolean {
    const hour = new Date().getHours()
    return hour < 7 || hour >= 19
  }

  private recordAdaptation(userId: string, adaptation: string, reason: string): void {
    const config = this.themes.get(userId)
    if (!config) return

    config.adaptationHistory.push({
      timestamp: new Date(),
      adaptation,
      reason,
    })

    // Keep only last 50 adaptations
    if (config.adaptationHistory.length > 50) {
      config.adaptationHistory = config.adaptationHistory.slice(-50)
    }
  }

  private recordAdaptationEffectiveness(userId: string, adaptation: string, effectiveness: number): void {
    const config = this.themes.get(userId)
    if (!config) return

    const recentAdaptation = config.adaptationHistory
      .filter(a => a.adaptation === adaptation)
      .pop()

    if (recentAdaptation) {
      recentAdaptation.effectiveness = effectiveness
    }
  }

  private setupTimeBasedAdaptation(): void {
    setInterval(() => {
      this.themes.forEach((config, userId) => {
        if (config.contextualAdaptations.timeBasedTheme && config.theme.primaryTheme === 'auto') {
          const currentHour = new Date().getHours()
          const timeOfDay = currentHour < 7 || currentHour >= 19 ? 'night' : 
                          currentHour < 12 ? 'morning' : 
                          currentHour < 17 ? 'afternoon' : 'evening'
          
          this.applyContextualAdaptations(userId, { timeOfDay })
        }
      })
    }, 60000) // Check every minute
  }

  private setupEnvironmentalListeners(): void {
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.themes.forEach((config, userId) => {
        if (config.theme.primaryTheme === 'system') {
          this.recordAdaptation(userId, 'system_theme_change', 'System theme preference changed')
          // Trigger re-render by updating timestamp
          config.theme.lastUpdated = new Date()
          this.saveToStorage()
        }
      })
    })

    // Listen for reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.themes.forEach((config, userId) => {
        if (config.contextualAdaptations.accessibilityEnhancements) {
          config.theme.reducedMotion = e.matches
          this.recordAdaptation(userId, 'reduced_motion', 'System reduced motion preference changed')
          config.theme.lastUpdated = new Date()
          this.saveToStorage()
        }
      })
    })
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([userId, config]) => {
          this.themes.set(userId, {
            ...config as AdaptiveThemeConfig,
            theme: {
              ...(config as AdaptiveThemeConfig).theme,
              lastUpdated: new Date((config as AdaptiveThemeConfig).theme.lastUpdated),
            },
            adaptationHistory: (config as AdaptiveThemeConfig).adaptationHistory.map(h => ({
              ...h,
              timestamp: new Date(h.timestamp),
            })),
          })
        })
      }
    } catch (error) {
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.themes)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
    }
  }
}