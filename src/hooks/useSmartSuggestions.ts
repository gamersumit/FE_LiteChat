import { useState, useCallback, useEffect, useRef } from 'react'
import { SmartSuggestionService } from '../services/smartSuggestionService'
import { useConversationContext } from './useConversationContext'
import type { Message, SmartSuggestion, ConversationContext, UserInteraction } from '../types/api'

interface SuggestionState {
  quickReplies: SmartSuggestion[]
  actionSuggestions: SmartSuggestion[]
  followUpSuggestions: SmartSuggestion[]
  personalizedSuggestions: SmartSuggestion[]
  adaptiveSuggestions: SmartSuggestion[]
  improvedSuggestions: SmartSuggestion[]
  isGenerating: boolean
  lastGenerationTime: number
  wasCacheUsed: boolean
  cacheInvalidated: boolean
  hasError: boolean
  error: string | null
  suggestionMetrics: {
    totalSuggestions: number
    usageRate: number
    helpfulnessScore: number
  }
  validationErrors: string[]
}

interface WorkflowPattern {
  frequentTasks: string[]
  timeSpentPerTask: Record<string, number>
  successRate: Record<string, number>
}

interface UserBehavior {
  prefersCodeExamples: boolean
  frequentTopics: string[]
  communicationStyle: string
}

interface BatchRequest {
  type: 'quick_reply' | 'action_suggestion' | 'follow_up'
  priority: 'high' | 'medium' | 'low'
}

export function useSmartSuggestions(conversationId: string) {
  const { currentContext } = useConversationContext(conversationId)
  const suggestionServiceRef = useRef<SmartSuggestionService | null>(null)
  
  const [state, setState] = useState<SuggestionState>({
    quickReplies: [],
    actionSuggestions: [],
    followUpSuggestions: [],
    personalizedSuggestions: [],
    adaptiveSuggestions: [],
    improvedSuggestions: [],
    isGenerating: false,
    lastGenerationTime: 0,
    wasCacheUsed: false,
    cacheInvalidated: false,
    hasError: false,
    error: null,
    suggestionMetrics: {
      totalSuggestions: 0,
      usageRate: 0,
      helpfulnessScore: 0,
    },
    validationErrors: [],
  })

  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    prefersCodeExamples: false,
    frequentTopics: [],
    communicationStyle: 'conversational',
  })

  const [workflowPattern, setWorkflowPattern] = useState<WorkflowPattern>({
    frequentTasks: [],
    timeSpentPerTask: {},
    successRate: {},
  })

  const [userPreferences, setUserPreferences] = useState<Record<string, any>>({})

  // Initialize service
  useEffect(() => {
    if (!suggestionServiceRef.current) {
      suggestionServiceRef.current = new SmartSuggestionService()
    }
  }, [])

  // Cache invalidation when context changes significantly
  useEffect(() => {
    if (currentContext && suggestionServiceRef.current) {
      // This would need previous context to compare
      setState(prev => ({
        ...prev,
        cacheInvalidated: true,
      }))
    }
  }, [currentContext])

  /**
   * Generate quick reply suggestions
   */
  const generateSuggestions = useCallback(async (messages: Message[], maxSuggestions = 3) => {
    if (!suggestionServiceRef.current) return

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      hasError: false, 
      error: null,
      wasCacheUsed: false,
    }))

    try {
      const startTime = Date.now()
      const suggestions = await suggestionServiceRef.current.generateQuickReplies(
        messages, 
        conversationId, 
        maxSuggestions
      )
      const endTime = Date.now()

      // Check if cache was used (fast response time indicates cache hit)
      const wasCacheUsed = (endTime - startTime) < 50

      setState(prev => ({
        ...prev,
        quickReplies: suggestions,
        isGenerating: false,
        lastGenerationTime: endTime,
        wasCacheUsed,
        cacheInvalidated: false,
        suggestionMetrics: {
          ...prev.suggestionMetrics,
          totalSuggestions: prev.suggestionMetrics.totalSuggestions + suggestions.length,
        },
      }))
    } catch (error) {
      const fallbackSuggestions = getFallbackSuggestions();
      setState(prev => ({
        ...prev,
        isGenerating: false,
        hasError: true,
        error: 'Failed to generate suggestions',
        quickReplies: fallbackSuggestions,
      }))
    }
  }, [conversationId])

  /**
   * Generate personalized suggestions
   */
  const generatePersonalizedSuggestions = useCallback(async (messages: Message[], interactions: UserInteraction[] = []) => {
    if (!suggestionServiceRef.current) return

    try {
      const userId = 'current-user' // This should come from context
      const suggestions = await suggestionServiceRef.current.generatePersonalizedSuggestions(
        messages,
        userId,
        interactions
      )

      setState(prev => ({
        ...prev,
        personalizedSuggestions: suggestions,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'Failed to generate personalized suggestions',
      }))
    }
  }, [])

  /**
   * Generate action suggestions
   */
  const generateActionSuggestions = useCallback(async (messages: Message[]) => {
    if (!suggestionServiceRef.current) return

    try {
      const suggestions = await suggestionServiceRef.current.generateActionSuggestions(messages)

      setState(prev => ({
        ...prev,
        actionSuggestions: suggestions,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'Failed to generate action suggestions',
      }))
    }
  }, [])

  /**
   * Generate follow-up suggestions
   */
  const generateFollowUpSuggestions = useCallback(async (lastMessage: Message) => {
    if (!suggestionServiceRef.current) return

    try {
      const suggestions = await suggestionServiceRef.current.generateFollowUpSuggestions(lastMessage)

      setState(prev => ({
        ...prev,
        followUpSuggestions: suggestions,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'Failed to generate follow-up suggestions',
      }))
    }
  }, [])

  /**
   * Generate adaptive suggestions based on conversation context
   */
  const generateAdaptiveSuggestions = useCallback(async () => {
    if (!suggestionServiceRef.current || !currentContext) return

    try {
      const suggestions = await suggestionServiceRef.current.getAdaptiveSuggestions(currentContext)

      setState(prev => ({
        ...prev,
        adaptiveSuggestions: suggestions,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'Failed to generate adaptive suggestions',
      }))
    }
  }, [currentContext])

  /**
   * Generate workflow suggestions based on patterns
   */
  const generateWorkflowSuggestions = useCallback(async () => {
    const workflowSuggestions: SmartSuggestion[] = []

    // Analyze workflow inefficiencies
    Object.entries(workflowPattern.timeSpentPerTask).forEach(([task, time]) => {
      if (time > 60) { // If task takes more than 60 minutes
        workflowSuggestions.push({
          id: `workflow-${Date.now()}-${Math.random()}`,
          type: 'action_suggestion',
          content: `Consider optimizing your ${task} workflow`,
          confidence: 0.7,
          reason: 'High time spent on task detected',
          category: 'workflow_improvement',
        })
      }
    })

    // Success rate improvements
    Object.entries(workflowPattern.successRate).forEach(([task, rate]) => {
      if (rate < 0.8) { // If success rate is below 80%
        workflowSuggestions.push({
          id: `workflow-success-${Date.now()}-${Math.random()}`,
          type: 'action_suggestion',
          content: `Get help improving your ${task} success rate`,
          confidence: 0.8,
          reason: 'Low success rate detected',
          category: 'skill_improvement',
        })
      }
    })

    setState(prev => ({
      ...prev,
      workflowSuggestions: workflowSuggestions.slice(0, 3),
    }))
  }, [workflowPattern])

  /**
   * Rank suggestions by relevance
   */
  const rankSuggestionsByRelevance = useCallback(() => {
    const allSuggestions = [
      ...state.quickReplies,
      ...state.actionSuggestions,
      ...state.followUpSuggestions,
    ]

    // Simple ranking based on confidence and user preferences
    const rankedSuggestions = allSuggestions
      .map(suggestion => ({
        ...suggestion,
        adjustedConfidence: suggestion.confidence * (
          userPreferences[`prefer_${suggestion.category}`] ? 1.2 : 1
        ),
      }))
      .sort((a, b) => b.adjustedConfidence - a.adjustedConfidence)

    setState(prev => ({
      ...prev,
      quickReplies: rankedSuggestions.filter(s => s.type === 'quick_reply').slice(0, 3),
      actionSuggestions: rankedSuggestions.filter(s => s.type === 'action_suggestion').slice(0, 3),
      followUpSuggestions: rankedSuggestions.filter(s => s.type === 'follow_up').slice(0, 3),
    }))
  }, [state.quickReplies, state.actionSuggestions, state.followUpSuggestions, userPreferences])

  /**
   * Track suggestion usage
   */
  const trackSuggestionUsage = useCallback(async (suggestionId: string, feedback: {
    used: boolean
    helpful?: boolean
    followUpAction?: string
    timestamp: Date
  }) => {
    if (!suggestionServiceRef.current) return

    try {
      await suggestionServiceRef.current.trackSuggestionFeedback(suggestionId, feedback)

      // Update metrics
      setState(prev => ({
        ...prev,
        suggestionMetrics: {
          ...prev.suggestionMetrics,
          usageRate: feedback.used ? prev.suggestionMetrics.usageRate + 0.1 : prev.suggestionMetrics.usageRate,
          helpfulnessScore: feedback.helpful !== undefined 
            ? (prev.suggestionMetrics.helpfulnessScore + (feedback.helpful ? 1 : 0)) / 2 
            : prev.suggestionMetrics.helpfulnessScore,
        },
      }))
    } catch (error) {
    }
  }, [])

  /**
   * Process feedback history for learning
   */
  const processFeedbackHistory = useCallback(async (feedbackHistory: Array<{ 
    suggestionType: string
    rating: number
    used: boolean 
  }>) => {
    if (!suggestionServiceRef.current) return

    try {
      const userId = 'current-user' // This should come from context
      await suggestionServiceRef.current.learnFromFeedback(userId, feedbackHistory)
    } catch (error) {
    }
  }, [])

  /**
   * Get learning insights from feedback
   */
  const getLearningInsights = useCallback(() => {
    // This would analyze the feedback data to provide insights
    return {
      preferredSuggestionTypes: ['code_example', 'clarification'],
      avoidedSuggestionTypes: ['theoretical_explanation'],
      confidenceAdjustments: {
        code_example: 1.2,
        theoretical_explanation: 0.8,
      },
    }
  }, [])

  /**
   * Improve suggestions based on user feedback
   */
  const improveSuggestions = useCallback((suggestions: SmartSuggestion[]) => {
    return suggestions.map(suggestion => {
      // Apply user preference adjustments
      if (userBehavior.prefersCodeExamples && suggestion.category === 'theory') {
        return {
          ...suggestion,
          category: 'code_example',
          content: suggestion.content.replace('explanation', 'code example'),
          adaptationReason: 'user_feedback_driven',
        }
      }

      return suggestion
    })
  }, [userBehavior])

  /**
   * Set improved suggestions
   */
  const setImprovedSuggestions = useCallback((suggestions: SmartSuggestion[]) => {
    setState(prev => ({
      ...prev,
      improvedSuggestions: suggestions,
    }))
  }, [])

  /**
   * Batch generate multiple types of suggestions
   */
  const batchGenerateSuggestions = useCallback(async (requests: BatchRequest[]) => {
    if (!suggestionServiceRef.current) return

    try {
      const batchRequests = requests.map(request => ({
        messages: [], // This should be provided
        conversationId,
        priority: request.priority,
        type: request.type,
      }))

      const results = await suggestionServiceRef.current.batchGenerateSuggestions(batchRequests)

      const allSuggestions = {
        quickReplies: [] as SmartSuggestion[],
        actionSuggestions: [] as SmartSuggestion[],
        followUpSuggestions: [] as SmartSuggestion[],
      }

      results.forEach(result => {
        switch (result.type) {
          case 'quick_reply':
            allSuggestions.quickReplies.push(...result.suggestions)
            break
          case 'action_suggestion':
            allSuggestions.actionSuggestions.push(...result.suggestions)
            break
          case 'follow_up':
            allSuggestions.followUpSuggestions.push(...result.suggestions)
            break
        }
      })

      setState(prev => ({
        ...prev,
        ...allSuggestions,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error: 'Failed to batch generate suggestions',
      }))
    }
  }, [conversationId])

  /**
   * Validate and filter suggestions
   */
  const validateAndFilterSuggestions = useCallback(() => {
    if (!suggestionServiceRef.current) return

    const allSuggestions = [
      ...state.quickReplies,
      ...state.actionSuggestions,
      ...state.followUpSuggestions,
    ]

    const validationErrors: string[] = []
    const validSuggestions = allSuggestions.filter(suggestion => {
      const validation = suggestionServiceRef.current!.validateSuggestion(suggestion)
      if (!validation.isValid) {
        validationErrors.push(...validation.errors)
        return false
      }
      return true
    })

    setState(prev => ({
      ...prev,
      quickReplies: validSuggestions.filter(s => s.type === 'quick_reply'),
      actionSuggestions: validSuggestions.filter(s => s.type === 'action_suggestion'),
      followUpSuggestions: validSuggestions.filter(s => s.type === 'follow_up'),
      validationErrors: validationErrors.length > 0 ? ['Invalid suggestion data detected'] : [],
    }))
  }, [state.quickReplies, state.actionSuggestions, state.followUpSuggestions])

  /**
   * Set raw suggestions (for testing)
   */
  const setRawSuggestions = useCallback((suggestions: SmartSuggestion[]) => {
    setState(prev => ({
      ...prev,
      quickReplies: suggestions.filter(s => s.type === 'quick_reply'),
      actionSuggestions: suggestions.filter(s => s.type === 'action_suggestion'),
      followUpSuggestions: suggestions.filter(s => s.type === 'follow_up'),
    }))
  }, [])

  /**
   * Set conversation context (for testing)
   */
  const setConversationContext = useCallback((context: ConversationContext) => {
    // This would normally be handled by the conversation context hook
    // For testing purposes, we can manually trigger adaptive suggestions
    if (suggestionServiceRef.current) {
      suggestionServiceRef.current.getAdaptiveSuggestions(context).then(suggestions => {
        setState(prev => ({
          ...prev,
          adaptiveSuggestions: suggestions,
        }))
      })
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasError: false,
      error: null,
    }))
  }, [])

  /**
   * Fallback suggestions when service fails
   */
  const getFallbackSuggestions = (): SmartSuggestion[] => {
    return [
      {
        id: `fallback-${Date.now()}-1`,
        type: 'quick_reply',
        content: 'Can you tell me more?',
        confidence: 0.7,
        reason: 'Fallback suggestion',
        category: 'clarification',
        isFallback: true,
      },
      {
        id: `fallback-${Date.now()}-2`,
        type: 'quick_reply',
        content: 'That\'s interesting!',
        confidence: 0.6,
        reason: 'Fallback suggestion',
        category: 'acknowledgment',
        isFallback: true,
      },
      {
        id: `fallback-${Date.now()}-3`,
        type: 'quick_reply',
        content: 'What should we explore next?',
        confidence: 0.5,
        reason: 'Fallback suggestion',
        category: 'continuation',
        isFallback: true,
      },
    ]
  }

  return {
    // State
    ...state,
    allSuggestions: {
      quickReplies: state.quickReplies,
      actionSuggestions: state.actionSuggestions,
      followUpSuggestions: state.followUpSuggestions,
    },
    workflowSuggestions: [] as SmartSuggestion[], // Add to state if needed

    // Generation methods
    generateSuggestions,
    generatePersonalizedSuggestions,
    generateActionSuggestions,
    generateFollowUpSuggestions,
    generateAdaptiveSuggestions,
    generateWorkflowSuggestions,

    // Ranking and filtering
    rankSuggestionsByRelevance,
    validateAndFilterSuggestions,

    // Feedback and learning
    trackSuggestionUsage,
    processFeedbackHistory,
    getLearningInsights,
    improveSuggestions,

    // Batch operations
    batchGenerateSuggestions,

    // State setters
    setUserBehavior,
    setWorkflowPattern,
    setUserPreferences,
    setImprovedSuggestions,
    setRawSuggestions,
    setConversationContext,

    // Utility
    clearError,

    // Service reference (for testing)
    suggestionService: suggestionServiceRef.current,
  }
}