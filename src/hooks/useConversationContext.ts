import { useState, useCallback, useEffect, useRef } from 'react'
import { ConversationContextService } from '../services/conversationContextService'
import type { Message, ConversationContext } from '../types/api'

interface ContextShift {
  fromTopic: string
  toTopic: string
  shiftType: 'pivot' | 'expansion' | 'clarification' | 'progression'
  confidence: number
  messageIndex: number
  timestamp: Date
}

interface ConversationInsights {
  dominantTopics: string[]
  userEmotionalState: string
  recommendedApproach: string
  suggestedTone: string
  estimatedResolutionComplexity: 'low' | 'medium' | 'high'
  learningOpportunities: string[]
}

interface LearningProgression {
  skillProgression: {
    from: string
    to: string
  }
  topicEvolution: string[]
  complexityGrowth: string
  confidenceImprovement: boolean
}

interface ConversationContextState {
  currentContext: ConversationContext | null
  contextHistory: ConversationContext[]
  contextShifts: ContextShift[]
  isAnalyzing: boolean
  analysisCount: number
  wasCacheUsed: boolean
  hasError: boolean
  error: string | null
}

export function useConversationContext(conversationId: string) {
  const contextServiceRef = useRef<ConversationContextService | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [state, setState] = useState<ConversationContextState>({
    currentContext: null,
    contextHistory: [],
    contextShifts: [],
    isAnalyzing: false,
    analysisCount: 0,
    wasCacheUsed: false,
    hasError: false,
    error: null,
  })

  // Initialize service
  useEffect(() => {
    if (!contextServiceRef.current) {
      contextServiceRef.current = new ConversationContextService()
    }

    // Load any persisted context
    const loadPersistedContext = async () => {
      try {
        const persistedContext = await contextServiceRef.current!.getPersistedContext(conversationId)
        if (persistedContext) {
          setState(prev => ({
            ...prev,
            currentContext: persistedContext,
          }))
        }
      } catch (error) {
      }
    }

    loadPersistedContext()
  }, [conversationId])

  /**
   * Analyze messages to extract conversation context
   */
  const analyzeMessages = useCallback(async (messages: Message[]) => {
    if (!contextServiceRef.current) return

    setState(prev => ({ ...prev, isAnalyzing: true, hasError: false, error: null }))

    try {
      const context = await contextServiceRef.current.analyzeContext(messages)
      
      setState(prev => ({
        ...prev,
        currentContext: context,
        isAnalyzing: false,
        analysisCount: prev.analysisCount + 1,
        wasCacheUsed: !!(context as any).cached,
      }))

      // Persist context
      await contextServiceRef.current.persistContext(conversationId, context)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        hasError: true,
        error: 'Failed to analyze conversation context',
      }))
    }
  }, [conversationId])

  /**
   * Update context with a new message
   */
  const updateWithNewMessage = useCallback(async (newMessage: Message) => {
    if (!contextServiceRef.current) return

    // Debounce updates to prevent excessive analysis
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const updatedContext = await contextServiceRef.current!.updateContextWithNewMessage(
          conversationId,
          newMessage
        )
        
        setState(prev => ({
          ...prev,
          currentContext: updatedContext,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          hasError: true,
          error: 'Failed to update context with new message',
        }))
      }
    }, 1000)
  }, [conversationId])

  /**
   * Analyze context shifts in conversation
   */
  const analyzeContextShifts = useCallback(async (messages: Message[]) => {
    if (!contextServiceRef.current) return

    try {
      const shifts = await contextServiceRef.current.detectContextShifts(messages)
      setState(prev => ({
        ...prev,
        contextShifts: shifts,
      }))
    } catch (error) {
    }
  }, [])

  /**
   * Get conversation insights for adaptive responses
   */
  const getConversationInsights = useCallback((): ConversationInsights | null => {
    if (!contextServiceRef.current || !state.currentContext) return null

    return contextServiceRef.current.getConversationInsights(state.currentContext)
  }, [state.currentContext])

  /**
   * Get adapted response style based on current context
   */
  const getAdaptedResponseStyle = useCallback(async () => {
    if (!contextServiceRef.current || !state.currentContext) return null

    try {
      return await contextServiceRef.current.getAdaptedResponseStyle(state.currentContext)
    } catch (error) {
      return null
    }
  }, [state.currentContext])

  /**
   * Get adapted communication style
   */
  const getAdaptedCommunicationStyle = useCallback(() => {
    if (!state.currentContext) return null

    const style = {
      vocabulary: 'moderate',
      pacing: 'medium',
      examples: 'balanced',
      encouragement: 'normal',
      assumptions: 'basic_knowledge',
    }

    switch (state.currentContext.expertiseLevel) {
      case 'beginner':
        return {
          vocabulary: 'simple',
          pacing: 'slow',
          examples: 'basic',
          encouragement: 'high',
          assumptions: 'minimal_knowledge',
        }
      case 'expert':
        return {
          vocabulary: 'technical',
          pacing: 'fast',
          examples: 'advanced',
          encouragement: 'minimal',
          assumptions: 'expert_knowledge',
        }
      default:
        return style
    }
  }, [state.currentContext])

  /**
   * Add context to history
   */
  const addToHistory = useCallback((context: ConversationContext) => {
    setState(prev => ({
      ...prev,
      contextHistory: [...prev.contextHistory, context].slice(-50), // Keep last 50
    }))
  }, [])

  /**
   * Get context history
   */
  const getContextHistory = useCallback(() => {
    return state.contextHistory
  }, [state.contextHistory])

  /**
   * Analyze learning progression from history
   */
  const analyzeLearningProgression = useCallback((): LearningProgression | null => {
    if (state.contextHistory.length < 2) return null

    const contexts = state.contextHistory
    const expertiseLevels = contexts.map(c => c.expertiseLevel).filter(Boolean)
    const allTopics = contexts.flatMap(c => c.topics || [])
    const complexityLevels = contexts.map(c => c.complexityLevel).filter(Boolean)

    // Skill progression
    const skillProgression = {
      from: expertiseLevels[0] || 'unknown',
      to: expertiseLevels[expertiseLevels.length - 1] || 'unknown',
    }

    // Topic evolution
    const topicEvolution = Array.from(new Set(allTopics)).slice(0, 10)

    // Complexity growth
    const complexityGrowth = complexityLevels.length > 1
      ? complexityLevels[complexityLevels.length - 1] > complexityLevels[0] 
        ? 'increasing' 
        : 'stable'
      : 'unknown'

    // Confidence improvement (based on sentiment progression)
    const sentiments = contexts.map(c => c.sentiment).filter(Boolean)
    const confidenceImprovement = sentiments.length > 1 &&
      (sentiments[sentiments.length - 1] === 'confident' || 
       sentiments[sentiments.length - 1] === 'positive')

    return {
      skillProgression,
      topicEvolution,
      complexityGrowth,
      confidenceImprovement,
    }
  }, [state.contextHistory])

  /**
   * Get next topic recommendations
   */
  const getNextTopicRecommendations = useCallback(() => {
    if (!state.currentContext) return []

    const currentTopics = state.currentContext.topics || []
    const recommendations: Array<{
      topic: string
      reason: string
      difficulty: string
      relevance: number
    }> = []

    // Simple recommendation logic based on current topics
    const topicMap = {
      'React': [
        { topic: 'useEffect', reason: 'Essential React hook', difficulty: 'beginner', relevance: 0.9 },
        { topic: 'Props', reason: 'Component communication', difficulty: 'beginner', relevance: 0.85 },
        { topic: 'State management', reason: 'Advanced React patterns', difficulty: 'intermediate', relevance: 0.8 },
      ],
      'JavaScript': [
        { topic: 'Async/Await', reason: 'Modern JavaScript', difficulty: 'intermediate', relevance: 0.9 },
        { topic: 'Array methods', reason: 'Functional programming', difficulty: 'beginner', relevance: 0.8 },
        { topic: 'Closures', reason: 'Advanced concepts', difficulty: 'intermediate', relevance: 0.7 },
      ],
      'CSS': [
        { topic: 'Flexbox', reason: 'Layout fundamentals', difficulty: 'beginner', relevance: 0.9 },
        { topic: 'Grid', reason: 'Advanced layouts', difficulty: 'intermediate', relevance: 0.8 },
        { topic: 'Animations', reason: 'Enhanced UX', difficulty: 'intermediate', relevance: 0.6 },
      ],
    }

    currentTopics.forEach(topic => {
      const topicRecs = topicMap[topic as keyof typeof topicMap]
      if (topicRecs) {
        recommendations.push(...topicRecs)
      }
    })

    return recommendations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
  }, [state.currentContext])

  /**
   * Get conversation direction suggestions
   */
  const getConversationDirectionSuggestions = useCallback(() => {
    if (!state.currentContext) return []

    const suggestions: Array<{
      direction: string
      approach: string
      expectedOutcome: string
    }> = []

    switch (state.currentContext.sentiment) {
      case 'frustrated':
        suggestions.push({
          direction: 'step_by_step_guidance',
          approach: 'Break down the problem into smaller parts',
          expectedOutcome: 'Reduced frustration and clearer understanding',
        })
        break
      case 'curious':
        suggestions.push({
          direction: 'exploratory_learning',
          approach: 'Encourage questions and provide examples',
          expectedOutcome: 'Deeper understanding and engagement',
        })
        break
      case 'confident':
        suggestions.push({
          direction: 'advanced_concepts',
          approach: 'Introduce more complex topics',
          expectedOutcome: 'Skill advancement and new challenges',
        })
        break
    }

    switch (state.currentContext.userIntent) {
      case 'problem_solving':
        suggestions.push({
          direction: 'diagnostic_approach',
          approach: 'Identify root cause and provide solutions',
          expectedOutcome: 'Problem resolution and learning',
        })
        break
      case 'learning':
        suggestions.push({
          direction: 'structured_education',
          approach: 'Provide comprehensive explanations and practice',
          expectedOutcome: 'Skill development and confidence building',
        })
        break
    }

    return suggestions.slice(0, 3)
  }, [state.currentContext])

  /**
   * Set current context (for testing or manual override)
   */
  const setCurrentContext = useCallback((context: ConversationContext) => {
    setState(prev => ({
      ...prev,
      currentContext: context,
    }))
    
    if (contextServiceRef.current) {
      contextServiceRef.current.setCurrentContext(conversationId, context)
    }
  }, [conversationId])

  /**
   * Check if service is unavailable
   */
  const setServiceUnavailable = useCallback((unavailable: boolean) => {
    setState(prev => ({
      ...prev,
      hasError: unavailable,
      error: unavailable ? 'Context service unavailable' : null,
    }))
  }, [])

  /**
   * Get fallback context when service is unavailable
   */
  const getFallbackContext = useCallback((): ConversationContext => {
    return {
      id: `fallback-${conversationId}`,
      topics: [],
      sentiment: 'neutral',
      userIntent: 'unknown',
      complexityLevel: 'medium',
      expertiseLevel: 'intermediate',
      lastAnalyzed: new Date(),
      isFallback: true,
    }
  }, [conversationId])

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

  return {
    // State
    currentContext: state.currentContext,
    contextHistory: state.contextHistory,
    contextShifts: state.contextShifts,
    isAnalyzing: state.isAnalyzing,
    analysisCount: state.analysisCount,
    wasCacheUsed: state.wasCacheUsed,
    hasError: state.hasError,
    error: state.error,

    // Analysis methods
    analyzeMessages,
    updateWithNewMessage,
    analyzeContextShifts,

    // Insights and adaptations
    getConversationInsights,
    getAdaptedResponseStyle,
    getAdaptedCommunicationStyle,

    // History management
    addToHistory,
    getContextHistory,
    analyzeLearningProgression,

    // Recommendations
    getNextTopicRecommendations,
    getConversationDirectionSuggestions,

    // Context management
    setCurrentContext,
    setServiceUnavailable,
    getFallbackContext,
    clearError,

    // Service reference (for testing)
    contextService: contextServiceRef.current,
  }
}