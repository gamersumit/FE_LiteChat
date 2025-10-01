import { nanoid } from 'nanoid'
import type { UserInteraction, UserBehaviorPattern, PrivacySettings } from '../types/api'

interface BehaviorAnalytics {
  interactions: UserInteraction[]
  patterns: UserBehaviorPattern[]
  privacySettings: PrivacySettings
  anonymizedUserId: string
}

export class UserBehaviorService {
  private analytics: Map<string, BehaviorAnalytics> = new Map()
  private readonly STORAGE_KEY = 'user_behavior_analytics'
  private readonly MAX_INTERACTIONS = 1000
  private readonly ANALYTICS_RETENTION_DAYS = 30

  constructor() {
    this.loadFromStorage()
    this.setupCleanupInterval()
  }

  /**
   * Track user interaction with privacy compliance
   */
  async trackInteraction(
    userId: string,
    interaction: Omit<UserInteraction, 'id' | 'anonymizedUserId'>,
    privacySettings?: PrivacySettings
  ): Promise<void> {
    const userAnalytics = this.getOrCreateUserAnalytics(userId, privacySettings)

    // Check if data collection is enabled
    if (!userAnalytics.privacySettings.dataCollection) {
      return
    }

    // Anonymize the interaction data if required
    const processedInteraction = await this.processInteraction(interaction, userAnalytics)

    // Add interaction to analytics
    userAnalytics.interactions.push(processedInteraction)

    // Limit the number of stored interactions
    if (userAnalytics.interactions.length > this.MAX_INTERACTIONS) {
      userAnalytics.interactions = userAnalytics.interactions.slice(-this.MAX_INTERACTIONS)
    }

    // Update behavior patterns periodically
    if (userAnalytics.interactions.length % 10 === 0) {
      await this.updateBehaviorPatterns(userId)
    }

    this.saveToStorage()
  }

  /**
   * Get user behavior patterns with privacy filtering
   */
  getBehaviorPatterns(userId: string): UserBehaviorPattern[] {
    const userAnalytics = this.analytics.get(userId)
    if (!userAnalytics || !userAnalytics.privacySettings.analytics) {
      return []
    }

    return userAnalytics.patterns
  }

  /**
   * Analyze user interactions to identify patterns
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorPattern[]> {
    const userAnalytics = this.analytics.get(userId)
    if (!userAnalytics || userAnalytics.interactions.length < 5) {
      return []
    }

    const patterns: UserBehaviorPattern[] = []

    // Analyze communication patterns
    patterns.push(await this.analyzeCommunicationPatterns(userAnalytics.interactions))

    // Analyze feature usage patterns
    patterns.push(await this.analyzeFeatureUsage(userAnalytics.interactions))

    // Analyze temporal patterns
    patterns.push(await this.analyzeTemporalPatterns(userAnalytics.interactions))

    // Analyze preference patterns
    patterns.push(await this.analyzePreferencePatterns(userAnalytics.interactions))

    // Filter out null patterns
    const validPatterns = patterns.filter(pattern => pattern !== null)

    // Update stored patterns
    userAnalytics.patterns = validPatterns
    this.saveToStorage()

    return validPatterns
  }

  /**
   * Update privacy settings for user
   */
  updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): void {
    const userAnalytics = this.getOrCreateUserAnalytics(userId)
    userAnalytics.privacySettings = { ...userAnalytics.privacySettings, ...settings }

    // If data collection is disabled, clear existing interactions
    if (!settings.dataCollection) {
      userAnalytics.interactions = []
      userAnalytics.patterns = []
    }

    this.saveToStorage()
  }

  /**
   * Get anonymized user interactions for analysis
   */
  getAnonymizedInteractions(userId: string): UserInteraction[] {
    const userAnalytics = this.analytics.get(userId)
    if (!userAnalytics || !userAnalytics.privacySettings.anonymizeData) {
      return []
    }

    return userAnalytics.interactions.map(interaction => ({
      ...interaction,
      data: this.anonymizeInteractionData(interaction.data),
    }))
  }

  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(userId: string): {
    interactions: UserInteraction[]
    patterns: UserBehaviorPattern[]
    privacySettings: PrivacySettings
  } | null {
    const userAnalytics = this.analytics.get(userId)
    if (!userAnalytics) {
      return null
    }

    return {
      interactions: userAnalytics.interactions,
      patterns: userAnalytics.patterns,
      privacySettings: userAnalytics.privacySettings,
    }
  }

  /**
   * Delete user data (GDPR compliance)
   */
  deleteUserData(userId: string): boolean {
    const existed = this.analytics.has(userId)
    this.analytics.delete(userId)
    this.saveToStorage()
    return existed
  }

  /**
   * Get user consent status
   */
  getConsentStatus(userId: string): {
    dataCollection: boolean
    analytics: boolean
    personalization: boolean
    consentDate?: Date
  } {
    const userAnalytics = this.analytics.get(userId)
    return {
      dataCollection: userAnalytics?.privacySettings.dataCollection ?? false,
      analytics: userAnalytics?.privacySettings.analytics ?? false,
      personalization: userAnalytics?.privacySettings.personalization ?? true,
      consentDate: userAnalytics?.privacySettings.consentDate,
    }
  }

  /**
   * Update user consent
   */
  updateConsent(userId: string, consent: {
    dataCollection: boolean
    analytics: boolean
    personalization: boolean
  }): void {
    const settings: PrivacySettings = {
      ...consent,
      anonymizeData: true,
      consentDate: new Date(),
      retentionPeriod: this.ANALYTICS_RETENTION_DAYS,
    }

    this.updatePrivacySettings(userId, settings)
  }

  private getOrCreateUserAnalytics(userId: string, privacySettings?: PrivacySettings): BehaviorAnalytics {
    if (!this.analytics.has(userId)) {
      const defaultPrivacySettings: PrivacySettings = {
        dataCollection: false,
        analytics: false,
        personalization: true,
        anonymizeData: true,
        retentionPeriod: this.ANALYTICS_RETENTION_DAYS,
        ...privacySettings,
      }

      this.analytics.set(userId, {
        interactions: [],
        patterns: [],
        privacySettings: defaultPrivacySettings,
        anonymizedUserId: this.generateAnonymizedId(userId),
      })
    }

    return this.analytics.get(userId)!
  }

  private async processInteraction(
    interaction: Omit<UserInteraction, 'id' | 'anonymizedUserId'>,
    userAnalytics: BehaviorAnalytics
  ): Promise<UserInteraction> {
    const processedInteraction: UserInteraction = {
      id: nanoid(),
      anonymizedUserId: userAnalytics.anonymizedUserId,
      ...interaction,
    }

    // Anonymize data if required
    if (userAnalytics.privacySettings.anonymizeData) {
      processedInteraction.data = this.anonymizeInteractionData(processedInteraction.data)
    }

    return processedInteraction
  }

  private anonymizeInteractionData(data: Record<string, unknown>): Record<string, unknown> {
    const anonymized = { ...data }

    // Remove or hash sensitive data
    const sensitiveKeys = ['userId', 'email', 'name', 'ip', 'content', 'message']
    sensitiveKeys.forEach(key => {
      if (anonymized[key]) {
        if (typeof anonymized[key] === 'string') {
          anonymized[key] = this.hashString(anonymized[key] as string)
        } else {
          delete anonymized[key]
        }
      }
    })

    return anonymized
  }

  private generateAnonymizedId(userId: string): string {
    return `anon-${this.hashString(userId).substring(0, 8)}`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private async analyzeCommunicationPatterns(interactions: UserInteraction[]): Promise<UserBehaviorPattern> {
    const messageInteractions = interactions.filter(i => i.type === 'message_sent')
    
    if (messageInteractions.length < 3) {
      return null!
    }

    const avgMessageLength = messageInteractions.reduce((sum, i) => 
      sum + (i.data.messageLength as number || 0), 0) / messageInteractions.length

    const responseTimeData = messageInteractions
      .map(i => i.data.responseTime as number)
      .filter(t => typeof t === 'number')

    const avgResponseTime = responseTimeData.length > 0 
      ? responseTimeData.reduce((sum, t) => sum + t, 0) / responseTimeData.length 
      : 0

    return {
      id: nanoid(),
      type: 'communication_style',
      pattern: avgMessageLength > 100 ? 'detailed' : 'concise',
      confidence: 0.8,
      data: {
        averageMessageLength: avgMessageLength,
        averageResponseTime: avgResponseTime,
        preferredStyle: avgMessageLength > 100 ? 'verbose' : 'brief',
      },
      lastUpdated: new Date(),
    }
  }

  private async analyzeFeatureUsage(interactions: UserInteraction[]): Promise<UserBehaviorPattern> {
    const featureUsage = new Map<string, number>()
    
    interactions.forEach(interaction => {
      const feature = interaction.data.feature as string
      if (feature) {
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1)
      }
    })

    if (featureUsage.size === 0) {
      return null!
    }

    const mostUsedFeatures = Array.from(featureUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([feature]) => feature)

    return {
      id: nanoid(),
      type: 'feature_usage',
      pattern: 'frequent_features',
      confidence: 0.9,
      data: {
        mostUsedFeatures,
        featureUsageCount: Object.fromEntries(featureUsage),
      },
      lastUpdated: new Date(),
    }
  }

  private async analyzeTemporalPatterns(interactions: UserInteraction[]): Promise<UserBehaviorPattern> {
    if (interactions.length < 5) {
      return null!
    }

    const hourCounts = new Array(24).fill(0)
    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours()
      hourCounts[hour]++
    })

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
    const isNightOwl = peakHour >= 22 || peakHour <= 6
    const isEarlyBird = peakHour >= 5 && peakHour <= 9

    return {
      id: nanoid(),
      type: 'temporal_pattern',
      pattern: isNightOwl ? 'night_owl' : isEarlyBird ? 'early_bird' : 'regular',
      confidence: 0.7,
      data: {
        peakActivityHour: peakHour,
        activityDistribution: hourCounts,
        userType: isNightOwl ? 'night_owl' : isEarlyBird ? 'early_bird' : 'regular',
      },
      lastUpdated: new Date(),
    }
  }

  private async analyzePreferencePatterns(interactions: UserInteraction[]): Promise<UserBehaviorPattern> {
    const preferences = {
      theme: new Map<string, number>(),
      language: new Map<string, number>(),
      responseStyle: new Map<string, number>(),
    }

    interactions.forEach(interaction => {
      if (interaction.data.theme) {
        const theme = interaction.data.theme as string
        preferences.theme.set(theme, (preferences.theme.get(theme) || 0) + 1)
      }
      if (interaction.data.language) {
        const language = interaction.data.language as string
        preferences.language.set(language, (preferences.language.get(language) || 0) + 1)
      }
      if (interaction.data.responseStyle) {
        const style = interaction.data.responseStyle as string
        preferences.responseStyle.set(style, (preferences.responseStyle.get(style) || 0) + 1)
      }
    })

    const getTopPreference = (map: Map<string, number>) => {
      if (map.size === 0) return null
      return Array.from(map.entries()).sort(([, a], [, b]) => b - a)[0][0]
    }

    const topTheme = getTopPreference(preferences.theme)
    const topLanguage = getTopPreference(preferences.language)
    const topResponseStyle = getTopPreference(preferences.responseStyle)

    if (!topTheme && !topLanguage && !topResponseStyle) {
      return null!
    }

    return {
      id: nanoid(),
      type: 'preference_pattern',
      pattern: 'user_preferences',
      confidence: 0.85,
      data: {
        preferredTheme: topTheme,
        preferredLanguage: topLanguage,
        preferredResponseStyle: topResponseStyle,
      },
      lastUpdated: new Date(),
    }
  }

  private async updateBehaviorPatterns(userId: string): Promise<void> {
    await this.analyzeUserBehavior(userId)
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([userId, analytics]) => {
          this.analytics.set(userId, {
            ...analytics as BehaviorAnalytics,
            // Convert string dates back to Date objects
            interactions: (analytics as BehaviorAnalytics).interactions.map(i => ({
              ...i,
              timestamp: new Date(i.timestamp),
            })),
            patterns: (analytics as BehaviorAnalytics).patterns.map(p => ({
              ...p,
              lastUpdated: new Date(p.lastUpdated),
            })),
          })
        })
      }
    } catch (error) {
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.analytics)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
    }
  }

  private setupCleanupInterval(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData()
    }, 60 * 60 * 1000)
  }

  private cleanupOldData(): void {
    const now = new Date()
    
    this.analytics.forEach((userAnalytics, userId) => {
      const retentionMs = userAnalytics.privacySettings.retentionPeriod! * 24 * 60 * 60 * 1000
      
      // Remove old interactions
      userAnalytics.interactions = userAnalytics.interactions.filter(
        interaction => now.getTime() - interaction.timestamp.getTime() < retentionMs
      )

      // Remove old patterns
      userAnalytics.patterns = userAnalytics.patterns.filter(
        pattern => now.getTime() - pattern.lastUpdated.getTime() < retentionMs
      )

      // If no data remains, remove the user entirely
      if (userAnalytics.interactions.length === 0 && userAnalytics.patterns.length === 0) {
        this.analytics.delete(userId)
      }
    })

    this.saveToStorage()
  }
}