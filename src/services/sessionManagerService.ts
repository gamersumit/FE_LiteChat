import { nanoid } from 'nanoid'
import type { UserPreferences, ConversationContext, UserBehaviorPattern } from '../types/api'

export interface UserSession {
  id: string
  userId: string
  startTime: Date
  lastActivity: Date
  endTime?: Date
  preferences: UserPreferences
  conversationContexts: Map<string, ConversationContext>
  behaviorPatterns: UserBehaviorPattern[]
  personalizations: {
    theme: string
    adaptiveSettings: Record<string, any>
    learnedPreferences: Record<string, any>
  }
  metadata: {
    deviceType: 'desktop' | 'mobile' | 'tablet'
    browser: string
    userAgent: string
    timezone: string
    language: string
  }
  isActive: boolean
  sessionDuration: number
  interactionCount: number
}

interface SessionBackup {
  sessions: UserSession[]
  createdAt: Date
  version: string
}

interface SessionMetrics {
  averageSessionDuration: number
  totalSessions: number
  activeSessionsCount: number
  mostActiveTimeOfDay: string
  frequentDeviceType: string
  sessionConsistency: number
}

export class SessionManagerService {
  private activeSessions: Map<string, UserSession> = new Map()
  private sessionHistory: Map<string, UserSession[]> = new Map()
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_SESSION_HISTORY = 50
  private readonly STORAGE_KEY = 'user_sessions'
  private readonly BACKUP_KEY = 'session_backups'
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.loadSessionsFromStorage()
    this.setupSessionCleanup()
    this.setupBeforeUnloadHandler()
  }

  /**
   * Create a new user session
   */
  async createSession(userId: string, initialPreferences?: Partial<UserPreferences>): Promise<UserSession> {
    // End any existing active session for this user
    await this.endActiveSession(userId)

    const session: UserSession = {
      id: nanoid(),
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      preferences: {
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
        ...initialPreferences,
      },
      conversationContexts: new Map(),
      behaviorPatterns: [],
      personalizations: {
        theme: initialPreferences?.theme || 'system',
        adaptiveSettings: {},
        learnedPreferences: {},
      },
      metadata: {
        deviceType: this.detectDeviceType(),
        browser: this.detectBrowser(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      },
      isActive: true,
      sessionDuration: 0,
      interactionCount: 0,
    }

    this.activeSessions.set(userId, session)
    this.saveSessionsToStorage()

    return session
  }

  /**
   * Get active session for user
   */
  getActiveSession(userId: string): UserSession | null {
    const session = this.activeSessions.get(userId)
    
    if (!session) return null

    // Check if session has timed out
    if (Date.now() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      this.endSession(userId)
      return null
    }

    return session
  }

  /**
   * Update session activity
   */
  updateSessionActivity(userId: string, interactionType?: string): void {
    const session = this.activeSessions.get(userId)
    if (!session) return

    session.lastActivity = new Date()
    session.sessionDuration = session.lastActivity.getTime() - session.startTime.getTime()
    session.interactionCount++

    this.activeSessions.set(userId, session)
    this.saveSessionsToStorage()
  }

  /**
   * Update session preferences
   */
  updateSessionPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const session = this.activeSessions.get(userId)
    if (!session) return

    session.preferences = { ...session.preferences, ...preferences }
    this.updateSessionActivity(userId, 'preference_update')
  }

  /**
   * Add conversation context to session
   */
  addConversationContext(userId: string, conversationId: string, context: ConversationContext): void {
    const session = this.activeSessions.get(userId)
    if (!session) return

    session.conversationContexts.set(conversationId, context)
    this.updateSessionActivity(userId, 'conversation_context')
  }

  /**
   * Add behavior pattern to session
   */
  addBehaviorPattern(userId: string, pattern: UserBehaviorPattern): void {
    const session = this.activeSessions.get(userId)
    if (!session) return

    // Avoid duplicates
    const existingIndex = session.behaviorPatterns.findIndex(p => p.type === pattern.type)
    if (existingIndex >= 0) {
      session.behaviorPatterns[existingIndex] = pattern
    } else {
      session.behaviorPatterns.push(pattern)
    }

    this.updateSessionActivity(userId, 'behavior_pattern')
  }

  /**
   * Update session personalizations
   */
  updatePersonalizations(userId: string, personalizations: Partial<UserSession['personalizations']>): void {
    const session = this.activeSessions.get(userId)
    if (!session) return

    session.personalizations = { ...session.personalizations, ...personalizations }
    this.updateSessionActivity(userId, 'personalization_update')
  }

  /**
   * End active session for user
   */
  async endActiveSession(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId)
    if (!session) return

    await this.endSession(userId)
  }

  /**
   * End session and move to history
   */
  private async endSession(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId)
    if (!session) return

    session.endTime = new Date()
    session.isActive = false
    session.sessionDuration = session.endTime.getTime() - session.startTime.getTime()

    // Move to history
    const history = this.sessionHistory.get(userId) || []
    history.push(session)

    // Keep only the most recent sessions
    if (history.length > this.MAX_SESSION_HISTORY) {
      history.splice(0, history.length - this.MAX_SESSION_HISTORY)
    }

    this.sessionHistory.set(userId, history)
    this.activeSessions.delete(userId)

    this.saveSessionsToStorage()
  }

  /**
   * Get session history for user
   */
  getSessionHistory(userId: string, limit?: number): UserSession[] {
    const history = this.sessionHistory.get(userId) || []
    return limit ? history.slice(-limit) : history
  }

  /**
   * Resume session from previous state
   */
  async resumeSession(userId: string, sessionId: string): Promise<UserSession | null> {
    const history = this.sessionHistory.get(userId) || []
    const previousSession = history.find(s => s.id === sessionId)

    if (!previousSession) return null

    // Create new session based on previous session data
    const resumedSession = await this.createSession(userId, previousSession.preferences)
    
    // Restore previous session data
    resumedSession.conversationContexts = previousSession.conversationContexts
    resumedSession.behaviorPatterns = previousSession.behaviorPatterns
    resumedSession.personalizations = previousSession.personalizations

    return resumedSession
  }

  /**
   * Merge sessions across devices
   */
  async mergeSessions(userId: string, sessions: UserSession[]): Promise<UserSession> {
    const currentSession = this.getActiveSession(userId) || await this.createSession(userId)

    // Merge preferences (latest wins)
    const latestSession = sessions.reduce((latest, session) => 
      session.lastActivity > latest.lastActivity ? session : latest
    )
    currentSession.preferences = latestSession.preferences

    // Merge conversation contexts
    sessions.forEach(session => {
      session.conversationContexts.forEach((context, conversationId) => {
        const existingContext = currentSession.conversationContexts.get(conversationId)
        if (!existingContext || context.lastAnalyzed > existingContext.lastAnalyzed) {
          currentSession.conversationContexts.set(conversationId, context)
        }
      })
    })

    // Merge behavior patterns (avoid duplicates, keep latest)
    const patternMap = new Map<string, UserBehaviorPattern>()
    
    // Add current session patterns
    currentSession.behaviorPatterns.forEach(pattern => {
      patternMap.set(pattern.type, pattern)
    })

    // Add patterns from other sessions
    sessions.forEach(session => {
      session.behaviorPatterns.forEach(pattern => {
        const existing = patternMap.get(pattern.type)
        if (!existing || pattern.lastUpdated > existing.lastUpdated) {
          patternMap.set(pattern.type, pattern)
        }
      })
    })

    currentSession.behaviorPatterns = Array.from(patternMap.values())

    // Merge personalizations
    sessions.forEach(session => {
      Object.entries(session.personalizations).forEach(([key, value]) => {
        if (typeof value === 'object') {
          currentSession.personalizations[key as keyof typeof currentSession.personalizations] = {
            ...currentSession.personalizations[key as keyof typeof currentSession.personalizations] as any,
            ...value,
          }
        } else {
          (currentSession.personalizations as any)[key] = value
        }
      })
    })

    this.activeSessions.set(userId, currentSession)
    this.saveSessionsToStorage()

    return currentSession
  }

  /**
   * Get session metrics for user
   */
  getSessionMetrics(userId: string): SessionMetrics {
    const history = this.sessionHistory.get(userId) || []
    const activeSession = this.activeSessions.get(userId)
    
    const allSessions = activeSession ? [...history, activeSession] : history

    if (allSessions.length === 0) {
      return {
        averageSessionDuration: 0,
        totalSessions: 0,
        activeSessionsCount: 0,
        mostActiveTimeOfDay: 'unknown',
        frequentDeviceType: 'unknown',
        sessionConsistency: 0,
      }
    }

    const averageSessionDuration = allSessions.reduce((sum, session) => 
      sum + session.sessionDuration, 0) / allSessions.length

    // Analyze activity patterns by hour
    const hourCounts = new Array(24).fill(0)
    allSessions.forEach(session => {
      const hour = session.startTime.getHours()
      hourCounts[hour]++
    })
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Device type frequency
    const deviceCounts = allSessions.reduce((counts, session) => {
      counts[session.metadata.deviceType] = (counts[session.metadata.deviceType] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    const frequentDeviceType = Object.entries(deviceCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'

    // Session consistency (how regular the user's sessions are)
    const sessionGaps = []
    for (let i = 1; i < allSessions.length; i++) {
      const gap = allSessions[i].startTime.getTime() - 
                  (allSessions[i - 1].endTime?.getTime() || allSessions[i - 1].lastActivity.getTime())
      sessionGaps.push(gap)
    }
    
    const avgGap = sessionGaps.length > 0 ? 
      sessionGaps.reduce((sum, gap) => sum + gap, 0) / sessionGaps.length : 0
    const consistency = avgGap > 0 ? Math.max(0, 1 - (avgGap / (7 * 24 * 60 * 60 * 1000))) : 1 // Weekly baseline

    return {
      averageSessionDuration,
      totalSessions: allSessions.length,
      activeSessionsCount: activeSession ? 1 : 0,
      mostActiveTimeOfDay: this.formatHour(mostActiveHour),
      frequentDeviceType,
      sessionConsistency: consistency,
    }
  }

  /**
   * Export session data (GDPR compliance)
   */
  exportSessionData(userId: string): {
    activeSessions: UserSession[]
    sessionHistory: UserSession[]
    exportDate: string
  } {
    const activeSession = this.activeSessions.get(userId)
    const history = this.sessionHistory.get(userId) || []

    return {
      activeSessions: activeSession ? [activeSession] : [],
      sessionHistory: history,
      exportDate: new Date().toISOString(),
    }
  }

  /**
   * Delete all session data for user (GDPR compliance)
   */
  deleteUserSessions(userId: string): boolean {
    const hadActive = this.activeSessions.has(userId)
    const hadHistory = this.sessionHistory.has(userId)

    this.activeSessions.delete(userId)
    this.sessionHistory.delete(userId)
    
    this.saveSessionsToStorage()
    
    return hadActive || hadHistory
  }

  /**
   * Create session backup
   */
  async createBackup(): Promise<void> {
    const backup: SessionBackup = {
      sessions: [
        ...Array.from(this.activeSessions.values()),
        ...Array.from(this.sessionHistory.values()).flat(),
      ],
      createdAt: new Date(),
      version: '1.0.0',
    }

    try {
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup))
    } catch (error) {
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.BACKUP_KEY)
      if (!stored) return false

      const backup: SessionBackup = JSON.parse(stored)
      
      // Group sessions by user
      const userSessions = new Map<string, UserSession[]>()
      backup.sessions.forEach(session => {
        const sessions = userSessions.get(session.userId) || []
        sessions.push(session)
        userSessions.set(session.userId, sessions)
      })

      // Restore sessions
      userSessions.forEach((sessions, userId) => {
        const activeSessions = sessions.filter(s => s.isActive)
        const historySessions = sessions.filter(s => !s.isActive)

        if (activeSessions.length > 0) {
          // Restore most recent active session
          const latestActive = activeSessions.reduce((latest, session) => 
            session.lastActivity > latest.lastActivity ? session : latest
          )
          this.activeSessions.set(userId, latestActive)
        }

        if (historySessions.length > 0) {
          this.sessionHistory.set(userId, historySessions.slice(-this.MAX_SESSION_HISTORY))
        }
      })

      this.saveSessionsToStorage()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get all active sessions (for admin/debugging)
   */
  getAllActiveSessions(): UserSession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Check if user has any session data
   */
  hasSessionData(userId: string): boolean {
    return this.activeSessions.has(userId) || this.sessionHistory.has(userId)
  }

  /**
   * Private helper methods
   */
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipod|blackberry|iemobile/.test(userAgent)) {
      return 'mobile'
    } else if (/tablet|ipad/.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('chrome')) return 'Chrome'
    if (userAgent.includes('firefox')) return 'Firefox'
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari'
    if (userAgent.includes('edge')) return 'Edge'
    return 'Unknown'
  }

  private formatHour(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        
        // Restore active sessions
        Object.entries(data.activeSessions || {}).forEach(([userId, sessionData]) => {
          const session = this.deserializeSession(sessionData as any)
          if (session) {
            this.activeSessions.set(userId, session)
          }
        })

        // Restore session history
        Object.entries(data.sessionHistory || {}).forEach(([userId, sessions]) => {
          const deserializedSessions = (sessions as any[])
            .map(sessionData => this.deserializeSession(sessionData))
            .filter(Boolean) as UserSession[]
          
          if (deserializedSessions.length > 0) {
            this.sessionHistory.set(userId, deserializedSessions)
          }
        })
      }
    } catch (error) {
    }
  }

  private saveSessionsToStorage(): void {
    try {
      const data = {
        activeSessions: Object.fromEntries(
          Array.from(this.activeSessions.entries()).map(([userId, session]) => [
            userId,
            this.serializeSession(session)
          ])
        ),
        sessionHistory: Object.fromEntries(
          Array.from(this.sessionHistory.entries()).map(([userId, sessions]) => [
            userId,
            sessions.map(session => this.serializeSession(session))
          ])
        ),
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
    }
  }

  private serializeSession(session: UserSession): any {
    return {
      ...session,
      startTime: session.startTime.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      endTime: session.endTime?.toISOString(),
      conversationContexts: Object.fromEntries(
        Array.from(session.conversationContexts.entries()).map(([key, context]) => [
          key,
          {
            ...context,
            lastAnalyzed: context.lastAnalyzed.toISOString(),
          }
        ])
      ),
      behaviorPatterns: session.behaviorPatterns.map(pattern => ({
        ...pattern,
        lastUpdated: pattern.lastUpdated.toISOString(),
      })),
    }
  }

  private deserializeSession(sessionData: any): UserSession | null {
    try {
      return {
        ...sessionData,
        startTime: new Date(sessionData.startTime),
        lastActivity: new Date(sessionData.lastActivity),
        endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
        conversationContexts: new Map(
          Object.entries(sessionData.conversationContexts || {}).map(([key, context]: [string, any]) => [
            key,
            {
              ...context,
              lastAnalyzed: new Date(context.lastAnalyzed),
            }
          ])
        ),
        behaviorPatterns: (sessionData.behaviorPatterns || []).map((pattern: any) => ({
          ...pattern,
          lastUpdated: new Date(pattern.lastUpdated),
        })),
      }
    } catch (error) {
      return null
    }
  }

  private setupSessionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions()
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now()
    
    for (const [userId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.endSession(userId)
      }
    }
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // End all active sessions gracefully
      for (const userId of this.activeSessions.keys()) {
        this.endSession(userId)
      }
      
      // Create backup
      this.createBackup()
    })
  }

  /**
   * Cleanup method for component unmount
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}