import { useState, useEffect, useCallback, useRef } from 'react'
import { SessionManagerService, type UserSession } from '../services/sessionManagerService'
import { usePersonalizationContext } from '../components/personalization/PersonalizationProvider'
import { useBehaviorTracking } from './useBehaviorTracking'
import type { UserPreferences, ConversationContext, UserBehaviorPattern } from '../types/api'

interface SessionState {
  currentSession: UserSession | null
  sessionHistory: UserSession[]
  isSessionActive: boolean
  sessionMetrics: {
    averageSessionDuration: number
    totalSessions: number
    activeSessionsCount: number
    mostActiveTimeOfDay: string
    frequentDeviceType: string
    sessionConsistency: number
  }
  isLoading: boolean
  error: string | null
}

interface SessionRestorationData {
  preferences: UserPreferences
  conversationContexts: Map<string, ConversationContext>
  behaviorPatterns: UserBehaviorPattern[]
  personalizations: Record<string, any>
}

export function useSessionManager(userId: string) {
  const { updatePreferences } = usePersonalizationContext()
  const { patterns } = useBehaviorTracking(userId)
  const sessionServiceRef = useRef<SessionManagerService | null>(null)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<SessionState>({
    currentSession: null,
    sessionHistory: [],
    isSessionActive: false,
    sessionMetrics: {
      averageSessionDuration: 0,
      totalSessions: 0,
      activeSessionsCount: 0,
      mostActiveTimeOfDay: 'unknown',
      frequentDeviceType: 'unknown',
      sessionConsistency: 0,
    },
    isLoading: true,
    error: null,
  })

  // Initialize session service
  useEffect(() => {
    if (!sessionServiceRef.current) {
      sessionServiceRef.current = new SessionManagerService()
    }

    // Load existing session or create new one
    const initializeSession = async () => {
      try {
        let session = sessionServiceRef.current!.getActiveSession(userId)
        
        if (!session) {
          // Try to restore from most recent session
          const history = sessionServiceRef.current!.getSessionHistory(userId, 1)
          if (history.length > 0) {
            const lastSession = history[history.length - 1]
            session = await sessionServiceRef.current!.resumeSession(userId, lastSession.id)
          } else {
            // Create new session
            session = await sessionServiceRef.current!.createSession(userId)
          }
        }

        const sessionHistory = sessionServiceRef.current!.getSessionHistory(userId)
        const metrics = sessionServiceRef.current!.getSessionMetrics(userId)

        setState(prev => ({
          ...prev,
          currentSession: session,
          sessionHistory,
          sessionMetrics: metrics,
          isSessionActive: session?.isActive || false,
          isLoading: false,
        }))

        // Restore session data to context
        if (session) {
          await restoreSessionData(session)
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize session',
          isLoading: false,
        }))
      }
    }

    initializeSession()

    // Cleanup on unmount
    return () => {
      if (sessionServiceRef.current) {
        sessionServiceRef.current.destroy()
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [userId])

  // Update session with behavior patterns
  useEffect(() => {
    if (!state.currentSession || patterns.length === 0) return

    patterns.forEach(pattern => {
      sessionServiceRef.current!.addBehaviorPattern(userId, pattern)
    })

    // Update current session reference
    const updatedSession = sessionServiceRef.current!.getActiveSession(userId)
    if (updatedSession) {
      setState(prev => ({
        ...prev,
        currentSession: updatedSession,
      }))
    }
  }, [patterns, userId, state.currentSession])

  /**
   * Start a new session
   */
  const startSession = useCallback(async (initialPreferences?: Partial<UserPreferences>) => {
    if (!sessionServiceRef.current) return null

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const session = await sessionServiceRef.current.createSession(userId, initialPreferences)
      const metrics = sessionServiceRef.current.getSessionMetrics(userId)

      setState(prev => ({
        ...prev,
        currentSession: session,
        sessionMetrics: metrics,
        isSessionActive: true,
        isLoading: false,
      }))

      return session
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to start session',
        isLoading: false,
      }))
      return null
    }
  }, [userId])

  /**
   * End current session
   */
  const endSession = useCallback(async () => {
    if (!sessionServiceRef.current) return

    try {
      await sessionServiceRef.current.endActiveSession(userId)
      const sessionHistory = sessionServiceRef.current.getSessionHistory(userId)
      const metrics = sessionServiceRef.current.getSessionMetrics(userId)

      setState(prev => ({
        ...prev,
        currentSession: null,
        sessionHistory,
        sessionMetrics: metrics,
        isSessionActive: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to end session',
      }))
    }
  }, [userId])

  /**
   * Resume a previous session
   */
  const resumeSession = useCallback(async (sessionId: string) => {
    if (!sessionServiceRef.current) return null

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const session = await sessionServiceRef.current.resumeSession(userId, sessionId)
      if (!session) {
        setState(prev => ({
          ...prev,
          error: 'Session not found',
          isLoading: false,
        }))
        return null
      }

      const metrics = sessionServiceRef.current.getSessionMetrics(userId)
      
      setState(prev => ({
        ...prev,
        currentSession: session,
        sessionMetrics: metrics,
        isSessionActive: true,
        isLoading: false,
      }))

      // Restore session data
      await restoreSessionData(session)

      return session
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to resume session',
        isLoading: false,
      }))
      return null
    }
  }, [userId])

  /**
   * Track user activity to keep session alive
   */
  const trackActivity = useCallback((interactionType?: string) => {
    if (!sessionServiceRef.current || !state.isSessionActive) return

    sessionServiceRef.current.updateSessionActivity(userId, interactionType)
    
    // Update session reference
    const updatedSession = sessionServiceRef.current.getActiveSession(userId)
    if (updatedSession) {
      setState(prev => ({
        ...prev,
        currentSession: updatedSession,
      }))
    }

    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }

    // Set timeout for session inactivity
    activityTimeoutRef.current = setTimeout(() => {
      endSession()
    }, 30 * 60 * 1000) // 30 minutes
  }, [userId, state.isSessionActive, endSession])

  /**
   * Update session preferences
   */
  const updateSessionPreferences = useCallback((preferences: Partial<UserPreferences>) => {
    if (!sessionServiceRef.current) return

    sessionServiceRef.current.updateSessionPreferences(userId, preferences)
    trackActivity('preference_update')

    // Update personalization context
    updatePreferences(preferences)
  }, [userId, trackActivity, updatePreferences])

  /**
   * Add conversation context to session
   */
  const addConversationContext = useCallback((conversationId: string, context: ConversationContext) => {
    if (!sessionServiceRef.current) return

    sessionServiceRef.current.addConversationContext(userId, conversationId, context)
    trackActivity('conversation_context')
  }, [userId, trackActivity])

  /**
   * Update session personalizations
   */
  const updatePersonalizations = useCallback((personalizations: Partial<UserSession['personalizations']>) => {
    if (!sessionServiceRef.current) return

    sessionServiceRef.current.updatePersonalizations(userId, personalizations)
    trackActivity('personalization_update')
  }, [userId, trackActivity])

  /**
   * Get session history with optional filtering
   */
  const getSessionHistory = useCallback((limit?: number, deviceType?: string) => {
    if (!sessionServiceRef.current) return []

    let history = sessionServiceRef.current.getSessionHistory(userId, limit)
    
    if (deviceType) {
      history = history.filter(session => session.metadata.deviceType === deviceType)
    }

    return history
  }, [userId])

  /**
   * Merge sessions from different devices
   */
  const mergeSessions = useCallback(async (sessionData: UserSession[]) => {
    if (!sessionServiceRef.current) return null

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const mergedSession = await sessionServiceRef.current.mergeSessions(userId, sessionData)
      const metrics = sessionServiceRef.current.getSessionMetrics(userId)

      setState(prev => ({
        ...prev,
        currentSession: mergedSession,
        sessionMetrics: metrics,
        isLoading: false,
      }))

      return mergedSession
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to merge sessions',
        isLoading: false,
      }))
      return null
    }
  }, [userId])

  /**
   * Export session data for backup or transfer
   */
  const exportSessionData = useCallback(() => {
    if (!sessionServiceRef.current) return null

    return sessionServiceRef.current.exportSessionData(userId)
  }, [userId])

  /**
   * Import session data from backup
   */
  const importSessionData = useCallback(async (sessionData: {
    activeSessions: UserSession[]
    sessionHistory: UserSession[]
  }) => {
    if (!sessionServiceRef.current) return false

    try {
      // If there are active sessions in the import, merge them
      if (sessionData.activeSessions.length > 0) {
        await mergeSessions(sessionData.activeSessions)
      }

      // Add history sessions
      if (sessionData.sessionHistory.length > 0) {
        // This would need to be implemented in the service
        // For now, we'll just refresh the current data
        const sessionHistory = sessionServiceRef.current.getSessionHistory(userId)
        const metrics = sessionServiceRef.current.getSessionMetrics(userId)

        setState(prev => ({
          ...prev,
          sessionHistory,
          sessionMetrics: metrics,
        }))
      }

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to import session data',
      }))
      return false
    }
  }, [userId, mergeSessions])

  /**
   * Delete all session data (GDPR compliance)
   */
  const deleteAllSessions = useCallback(() => {
    if (!sessionServiceRef.current) return false

    const deleted = sessionServiceRef.current.deleteUserSessions(userId)
    
    if (deleted) {
      setState(prev => ({
        ...prev,
        currentSession: null,
        sessionHistory: [],
        isSessionActive: false,
        sessionMetrics: {
          averageSessionDuration: 0,
          totalSessions: 0,
          activeSessionsCount: 0,
          mostActiveTimeOfDay: 'unknown',
          frequentDeviceType: 'unknown',
          sessionConsistency: 0,
        },
      }))
    }

    return deleted
  }, [userId])

  /**
   * Get session insights for analytics
   */
  const getSessionInsights = useCallback(() => {
    if (!state.currentSession && state.sessionHistory.length === 0) return null

    const allSessions = state.currentSession 
      ? [...state.sessionHistory, state.currentSession]
      : state.sessionHistory

    const insights = {
      usagePatterns: {
        mostProductiveTime: state.sessionMetrics.mostActiveTimeOfDay,
        averageSessionLength: Math.round(state.sessionMetrics.averageSessionDuration / (1000 * 60)), // minutes
        sessionConsistency: state.sessionMetrics.sessionConsistency,
      },
      devicePreferences: {
        primaryDevice: state.sessionMetrics.frequentDeviceType,
        crossDeviceUsage: new Set(allSessions.map(s => s.metadata.deviceType)).size > 1,
      },
      engagementMetrics: {
        totalSessions: state.sessionMetrics.totalSessions,
        activeSessionTime: allSessions.reduce((sum, session) => sum + session.sessionDuration, 0),
        averageInteractionsPerSession: allSessions.length > 0 
          ? allSessions.reduce((sum, session) => sum + session.interactionCount, 0) / allSessions.length 
          : 0,
      },
      temporalPatterns: {
        sessionFrequency: this.calculateSessionFrequency(allSessions),
        longestStreak: this.calculateLongestStreak(allSessions),
        recentActivity: allSessions.filter(session => 
          Date.now() - session.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000
        ).length,
      },
    }

    return insights
  }, [state.currentSession, state.sessionHistory, state.sessionMetrics])

  /**
   * Helper function to calculate session frequency
   */
  const calculateSessionFrequency = (sessions: UserSession[]) => {
    if (sessions.length < 2) return 0

    const sortedSessions = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const timeSpan = sortedSessions[sortedSessions.length - 1].startTime.getTime() - sortedSessions[0].startTime.getTime()
    const days = timeSpan / (24 * 60 * 60 * 1000)
    
    return days > 0 ? sessions.length / days : 0
  }

  /**
   * Helper function to calculate longest streak of consecutive days with sessions
   */
  const calculateLongestStreak = (sessions: UserSession[]) => {
    if (sessions.length === 0) return 0

    const sessionDates = new Set(
      sessions.map(session => session.startTime.toDateString())
    )
    
    const sortedDates = Array.from(sessionDates).sort()
    let longestStreak = 1
    let currentStreak = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currentDate = new Date(sortedDates[i])
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)

      if (daysDiff === 1) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    return longestStreak
  }

  /**
   * Restore session data to various contexts
   */
  const restoreSessionData = useCallback(async (session: UserSession): Promise<void> => {
    try {
      // Restore preferences to personalization context
      await updatePreferences(session.preferences)

      // Restore personalizations (theme, adaptive settings, etc.)
      // This would need to be integrated with other hooks/contexts
      
      // Note: Conversation contexts and behavior patterns are already
      // stored in the session and will be available through the session object
    } catch (error) {
    }
  }, [updatePreferences])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Auto-track user activity
  useEffect(() => {
    const handleUserActivity = () => {
      trackActivity('user_interaction')
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity)
      })
    }
  }, [trackActivity])

  return {
    // State
    currentSession: state.currentSession,
    sessionHistory: state.sessionHistory,
    isSessionActive: state.isSessionActive,
    sessionMetrics: state.sessionMetrics,
    isLoading: state.isLoading,
    error: state.error,

    // Session management
    startSession,
    endSession,
    resumeSession,
    trackActivity,

    // Session data management
    updateSessionPreferences,
    addConversationContext,
    updatePersonalizations,

    // History and insights
    getSessionHistory,
    getSessionInsights,

    // Cross-device functionality
    mergeSessions,

    // Data export/import (GDPR compliance)
    exportSessionData,
    importSessionData,
    deleteAllSessions,

    // Utility
    clearError,

    // Computed properties
    hasActiveSession: !!state.currentSession && state.isSessionActive,
    sessionDuration: state.currentSession?.sessionDuration || 0,
    interactionCount: state.currentSession?.interactionCount || 0,
    deviceType: state.currentSession?.metadata.deviceType || 'unknown',

    // Service reference (for testing)
    sessionService: sessionServiceRef.current,
  }
}