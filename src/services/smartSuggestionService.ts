import { nanoid } from 'nanoid'
import type { Message, ConversationContext, SmartSuggestion, UserInteraction } from '../types/api'

interface SuggestionTemplate {
  id: string
  pattern: string
  suggestions: Array<{
    content: string
    category: string
    confidence: number
    conditions?: Record<string, any>
  }>
}

interface SuggestionFeedback {
  suggestionId: string
  used: boolean
  helpful?: boolean
  followUpAction?: string
  timestamp: Date
  context?: Record<string, any>
}

interface SuggestionMetrics {
  totalGenerated: number
  totalUsed: number
  usageRate: number
  helpfulnessScore: number
  categoryPerformance: Record<string, { usage: number; helpfulness: number }>
}

interface BatchSuggestionRequest {
  messages: Message[]
  conversationId: string
  priority: 'high' | 'medium' | 'low'
  type: 'quick_reply' | 'action_suggestion' | 'follow_up'
}

export class SmartSuggestionService {
  private suggestionCache: Map<string, { suggestions: SmartSuggestion[]; timestamp: number }> = new Map()
  private feedbackHistory: Map<string, SuggestionFeedback[]> = new Map()
  private userPreferences: Map<string, Record<string, any>> = new Map()
  private templates: SuggestionTemplate[] = []
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
  private readonly BATCH_DELAY = 100 // ms

  constructor() {
    this.initializeSuggestionTemplates()
    this.setupCacheCleanup()
  }

  /**
   * Generate quick reply suggestions based on conversation context
   */
  async generateQuickReplies(messages: Message[], conversationId: string, maxSuggestions = 3): Promise<SmartSuggestion[]> {
    try {
      const cacheKey = this.generateCacheKey(messages, 'quick_reply')
      const cached = this.suggestionCache.get(cacheKey)
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.suggestions.slice(0, maxSuggestions)
      }

      const suggestions = await this.generateContextualSuggestions(messages, 'quick_reply', conversationId)
      const rankedSuggestions = this.rankSuggestionsByRelevance(suggestions, conversationId)
      const filteredSuggestions = rankedSuggestions.slice(0, maxSuggestions)

      // Cache the results
      this.suggestionCache.set(cacheKey, {
        suggestions: filteredSuggestions,
        timestamp: Date.now(),
      })

      return filteredSuggestions
    } catch (error) {
      console.error('Failed to generate quick replies:', error)
      return this.getFallbackQuickReplies()
    }
  }

  /**
   * Generate personalized suggestions based on user behavior
   */
  async generatePersonalizedSuggestions(
    messages: Message[],
    userId: string,
    userInteractions: UserInteraction[] = []
  ): Promise<SmartSuggestion[]> {
    try {
      // Update user preferences based on interactions
      this.updateUserPreferences(userId, userInteractions)
      
      const baseSuggestions = await this.generateContextualSuggestions(messages, 'quick_reply', userId)
      const personalizedSuggestions = this.applyPersonalization(baseSuggestions, userId)
      
      return personalizedSuggestions.slice(0, 5)
    } catch (error) {
      console.error('Failed to generate personalized suggestions:', error)
      return []
    }
  }

  /**
   * Generate action suggestions based on message content
   */
  async generateActionSuggestions(messages: Message[]): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = []
    const lastMessage = messages[messages.length - 1]
    
    if (!lastMessage) return suggestions

    const content = lastMessage.content.toLowerCase()

    // File-related actions
    if (content.includes('file') || content.includes('code') || content.includes('review')) {
      suggestions.push({
        id: nanoid(),
        type: 'action_suggestion',
        content: 'Upload file for review',
        confidence: 0.8,
        reason: 'User mentioned file or code',
        category: 'file_action',
        action: 'file_upload',
      })
    }

    // Code sharing
    if (content.includes('code') || content.includes('snippet') || content.includes('example')) {
      suggestions.push({
        id: nanoid(),
        type: 'action_suggestion',
        content: 'Share code snippet',
        confidence: 0.7,
        reason: 'Code sharing context detected',
        category: 'code_sharing',
        action: 'paste_code',
      })
    }

    // Documentation
    if (content.includes('documentation') || content.includes('docs') || content.includes('reference')) {
      suggestions.push({
        id: nanoid(),
        type: 'action_suggestion',
        content: 'Search documentation',
        confidence: 0.6,
        reason: 'Documentation reference detected',
        category: 'documentation',
        action: 'search_docs',
      })
    }

    // Screen sharing
    if (content.includes('screen') || content.includes('show') || content.includes('visual')) {
      suggestions.push({
        id: nanoid(),
        type: 'action_suggestion',
        content: 'Share screenshot',
        confidence: 0.5,
        reason: 'Visual context may be helpful',
        category: 'visual_aid',
        action: 'screenshot',
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }

  /**
   * Generate follow-up suggestions for incomplete information
   */
  async generateFollowUpSuggestions(lastMessage: Message): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = []
    const content = lastMessage.content.toLowerCase()

    // Error-related follow-ups
    if (content.includes('error') || content.includes('not working') || content.includes('broken')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'What error message do you see?',
          confidence: 0.9,
          reason: 'Need specific error information',
          category: 'error_details',
        },
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'Can you check the browser console?',
          confidence: 0.8,
          reason: 'Console may have additional error info',
          category: 'debugging',
        },
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'What were you trying to do when this happened?',
          confidence: 0.7,
          reason: 'Understanding the context is important',
          category: 'context_gathering',
        }
      )
    }

    // Vague descriptions
    if (content.includes('not working') || content.includes('issue') || content.includes('problem')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'Can you be more specific about what\'s happening?',
          confidence: 0.8,
          reason: 'Need more specific information',
          category: 'clarification',
        },
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'What exactly did you expect to happen?',
          confidence: 0.7,
          reason: 'Understanding expectations helps diagnosis',
          category: 'expectation_clarification',
        }
      )
    }

    // Implementation questions
    if (content.includes('how to') || content.includes('how do i') || content.includes('how can i')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'What\'s your current approach?',
          confidence: 0.8,
          reason: 'Understanding current method helps provide better guidance',
          category: 'approach_understanding',
        },
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'Are there any constraints I should know about?',
          confidence: 0.6,
          reason: 'Constraints affect the solution approach',
          category: 'constraint_identification',
        }
      )
    }

    // Learning context
    if (content.includes('learn') || content.includes('understand') || content.includes('explain')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'What\'s your current level with this technology?',
          confidence: 0.7,
          reason: 'Tailoring explanation to experience level',
          category: 'experience_assessment',
        },
        {
          id: nanoid(),
          type: 'follow_up',
          content: 'Would you prefer a simple overview or detailed explanation?',
          confidence: 0.6,
          reason: 'Understanding preferred learning style',
          category: 'learning_style',
        }
      )
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 4)
  }

  /**
   * Generate clarification suggestions for ambiguous messages
   */
  async generateClarificationSuggestions(ambiguousMessage: Message): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = []
    const content = ambiguousMessage.content.toLowerCase()

    // Very short or vague messages
    if (content.length < 20 || content.includes('it') || content.includes('this') || content.includes('that')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'clarification',
          content: 'Can you be more specific about what you\'re referring to?',
          confidence: 0.9,
          reason: 'Message contains ambiguous references',
          category: 'reference_clarification',
          priority: 'high',
        },
        {
          id: nanoid(),
          type: 'clarification',
          content: 'What specifically are you trying to achieve?',
          confidence: 0.8,
          reason: 'Goal clarification needed',
          category: 'goal_clarification',
          priority: 'high',
        }
      )
    }

    // Emotional but unclear
    if (content.includes('frustrated') || content.includes('confused') || content.includes('stuck')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'clarification',
          content: 'What part is causing the most difficulty?',
          confidence: 0.8,
          reason: 'Identify specific pain point',
          category: 'problem_identification',
          priority: 'high',
        }
      )
    }

    // Multiple possible interpretations
    if (content.includes('or') || content.includes('maybe') || content.includes('might')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'clarification',
          content: 'Which option are you leaning towards?',
          confidence: 0.7,
          reason: 'Multiple options mentioned',
          category: 'option_selection',
          priority: 'medium',
        }
      )
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Rank suggestions by relevance and user preference
   */
  rankSuggestionsByRelevance(suggestions: SmartSuggestion[], userId: string): SmartSuggestion[] {
    const userPrefs = this.userPreferences.get(userId) || {}
    const feedback = this.feedbackHistory.get(userId) || []

    return suggestions
      .map(suggestion => ({
        ...suggestion,
        adjustedConfidence: this.calculateAdjustedConfidence(suggestion, userPrefs, feedback),
      }))
      .sort((a, b) => b.adjustedConfidence - a.adjustedConfidence)
  }

  /**
   * Get adaptive suggestions based on context complexity
   */
  async getAdaptiveSuggestions(context: ConversationContext): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = []
    
    const baseComplexity = context.expertiseLevel === 'beginner' ? 'simple' :
                          context.expertiseLevel === 'expert' ? 'advanced' : 'moderate'

    // Topic-specific suggestions
    if (context.topics?.includes('React')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'quick_reply',
          content: baseComplexity === 'simple' ? 
            'Show me a basic React example' : 
            'Explain React best practices',
          confidence: 0.8,
          reason: 'React topic detected',
          category: 'topic_continuation',
          complexity: baseComplexity,
        }
      )
    }

    if (context.topics?.includes('JavaScript')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'quick_reply',
          content: baseComplexity === 'simple' ? 
            'What are JavaScript basics?' : 
            'Advanced JavaScript patterns',
          confidence: 0.8,
          reason: 'JavaScript topic detected',
          category: 'topic_continuation',
          complexity: baseComplexity,
        }
      )
    }

    // Sentiment-based suggestions
    if (context.sentiment === 'confused') {
      suggestions.push(
        {
          id: nanoid(),
          type: 'quick_reply',
          content: 'Can you explain that differently?',
          confidence: 0.9,
          reason: 'User appears confused',
          category: 'clarification_request',
          complexity: 'simple',
        }
      )
    }

    return suggestions.slice(0, 4)
  }

  /**
   * Track suggestion usage and effectiveness
   */
  async trackSuggestionFeedback(suggestionId: string, feedback: Omit<SuggestionFeedback, 'suggestionId'>): Promise<void> {
    try {
      // In a real implementation, this might extract userId from context
      const userId = 'current-user' // This should come from context
      
      const existingFeedback = this.feedbackHistory.get(userId) || []
      existingFeedback.push({ suggestionId, ...feedback })
      
      // Keep only last 100 feedback entries per user
      if (existingFeedback.length > 100) {
        existingFeedback.splice(0, existingFeedback.length - 100)
      }
      
      this.feedbackHistory.set(userId, existingFeedback)
      
      // Update user preferences based on feedback
      this.updatePreferencesFromFeedback(userId, feedback)
    } catch (error) {
      console.error('Failed to track suggestion feedback:', error)
    }
  }

  /**
   * Get suggestion effectiveness metrics
   */
  async getSuggestionEffectiveness(suggestionId?: string): Promise<SuggestionMetrics | { usageRate: number; helpfulnessScore: number; improvementSuggestions: string[] }> {
    if (suggestionId) {
      // Return specific suggestion effectiveness
      const allFeedback = Array.from(this.feedbackHistory.values()).flat()
      const suggestionFeedback = allFeedback.filter(f => f.suggestionId === suggestionId)
      
      if (suggestionFeedback.length === 0) {
        return { usageRate: 0, helpfulnessScore: 0, improvementSuggestions: [] }
      }
      
      const usageRate = suggestionFeedback.filter(f => f.used).length / suggestionFeedback.length
      const helpfulFeedback = suggestionFeedback.filter(f => f.helpful !== undefined)
      const helpfulnessScore = helpfulFeedback.length > 0 ? 
        helpfulFeedback.filter(f => f.helpful).length / helpfulFeedback.length : 0
      
      return {
        usageRate,
        helpfulnessScore,
        improvementSuggestions: this.generateImprovementSuggestions(suggestionFeedback),
      }
    }

    // Return overall metrics
    const allFeedback = Array.from(this.feedbackHistory.values()).flat()
    const totalGenerated = allFeedback.length
    const totalUsed = allFeedback.filter(f => f.used).length
    const usageRate = totalGenerated > 0 ? totalUsed / totalGenerated : 0
    
    const helpfulFeedback = allFeedback.filter(f => f.helpful !== undefined)
    const helpfulnessScore = helpfulFeedback.length > 0 ? 
      helpfulFeedback.filter(f => f.helpful).length / helpfulFeedback.length : 0

    const categoryPerformance: Record<string, { usage: number; helpfulness: number }> = {}
    
    // Calculate category performance (this would need category info from suggestions)
    // For now, return empty object
    
    return {
      totalGenerated,
      totalUsed,
      usageRate,
      helpfulnessScore,
      categoryPerformance,
    }
  }

  /**
   * Learn from feedback to improve suggestions
   */
  async learnFromFeedback(userId: string, feedbackData: Array<{ suggestionType: string; rating: number; used: boolean }>): Promise<void> {
    const preferences = this.userPreferences.get(userId) || {}
    
    // Analyze preference patterns
    const typePreferences: Record<string, { totalRating: number; count: number; usageRate: number }> = {}
    
    feedbackData.forEach(feedback => {
      if (!typePreferences[feedback.suggestionType]) {
        typePreferences[feedback.suggestionType] = { totalRating: 0, count: 0, usageRate: 0 }
      }
      
      typePreferences[feedback.suggestionType].totalRating += feedback.rating
      typePreferences[feedback.suggestionType].count++
      if (feedback.used) {
        typePreferences[feedback.suggestionType].usageRate++
      }
    })
    
    // Update preferences based on analysis
    Object.entries(typePreferences).forEach(([type, data]) => {
      const avgRating = data.totalRating / data.count
      const usageRate = data.usageRate / data.count
      
      preferences[`prefer_${type}`] = avgRating > 3 && usageRate > 0.5
      preferences[`${type}_preference_strength`] = avgRating * usageRate
    })
    
    this.userPreferences.set(userId, preferences)
  }

  /**
   * Generate improved suggestions based on learning
   */
  async generateImprovedSuggestions(userId: string, messages: Message[]): Promise<SmartSuggestion[]> {
    const baseSuggestions = await this.generateContextualSuggestions(messages, 'quick_reply', userId)
    const preferences = this.userPreferences.get(userId) || {}
    
    return baseSuggestions.map(suggestion => {
      const categoryPref = preferences[`prefer_${suggestion.category}`]
      const strengthPref = preferences[`${suggestion.category}_preference_strength`] || 0.5
      
      if (categoryPref) {
        return {
          ...suggestion,
          confidence: Math.min(suggestion.confidence * (1 + strengthPref), 1),
          adaptationReason: 'user_feedback_driven',
        }
      }
      
      return suggestion
    }).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Batch generate suggestions for performance
   */
  async batchGenerateSuggestions(requests: BatchSuggestionRequest[]): Promise<Array<{
    conversationId: string
    suggestions: SmartSuggestion[]
    type: string
  }>> {
    // Sort by priority
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    const results: Array<{
      conversationId: string
      suggestions: SmartSuggestion[]
      type: string
    }> = []

    // Process requests with small delay to allow batching
    for (const request of sortedRequests) {
      await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY))
      
      let suggestions: SmartSuggestion[] = []
      
      switch (request.type) {
        case 'quick_reply':
          suggestions = await this.generateQuickReplies(request.messages, request.conversationId)
          break
        case 'action_suggestion':
          suggestions = await this.generateActionSuggestions(request.messages)
          break
        case 'follow_up':
          const lastMessage = request.messages[request.messages.length - 1]
          if (lastMessage) {
            suggestions = await this.generateFollowUpSuggestions(lastMessage)
          }
          break
      }
      
      results.push({
        conversationId: request.conversationId,
        suggestions,
        type: request.type,
      })
    }

    return results
  }

  /**
   * Cache management methods
   */
  setCachedSuggestions(key: string, suggestions: SmartSuggestion[]): void {
    this.suggestionCache.set(key, { suggestions, timestamp: Date.now() })
  }

  getCachedSuggestions(key: string): SmartSuggestion[] | null {
    const cached = this.suggestionCache.get(key)
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.suggestions
    }
    return null
  }

  shouldInvalidateCache(oldContext: ConversationContext, newContext: ConversationContext): boolean {
    // Check for significant context changes
    const topicChange = JSON.stringify(oldContext.topics) !== JSON.stringify(newContext.topics)
    const expertiseChange = oldContext.expertiseLevel !== newContext.expertiseLevel
    const complexityChange = oldContext.complexityLevel !== newContext.complexityLevel
    const intentChange = oldContext.userIntent !== newContext.userIntent

    return topicChange || expertiseChange || complexityChange || intentChange
  }

  /**
   * Validation methods
   */
  validateSuggestion(suggestion: SmartSuggestion): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!suggestion.id || suggestion.id.length === 0) {
      errors.push('Invalid suggestion ID')
    }
    
    if (!suggestion.content || suggestion.content.trim().length === 0) {
      errors.push('Empty content')
    }
    
    if (typeof suggestion.confidence !== 'number' || suggestion.confidence < 0 || suggestion.confidence > 1) {
      errors.push('Invalid confidence score')
    }
    
    if (!suggestion.type || !['quick_reply', 'action_suggestion', 'follow_up', 'clarification'].includes(suggestion.type)) {
      errors.push('Invalid suggestion type')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Fallback suggestions when service fails
   */
  private getFallbackQuickReplies(): SmartSuggestion[] {
    return [
      {
        id: nanoid(),
        type: 'quick_reply',
        content: 'Can you provide more details?',
        confidence: 0.7,
        reason: 'Fallback suggestion',
        category: 'clarification',
        isFallback: true,
      },
      {
        id: nanoid(),
        type: 'quick_reply',
        content: 'That\'s helpful, thank you!',
        confidence: 0.6,
        reason: 'Fallback suggestion',
        category: 'acknowledgment',
        isFallback: true,
      },
      {
        id: nanoid(),
        type: 'quick_reply',
        content: 'Could you show me an example?',
        confidence: 0.5,
        reason: 'Fallback suggestion',
        category: 'example_request',
        isFallback: true,
      },
    ]
  }

  /**
   * Private helper methods
   */
  private async generateContextualSuggestions(messages: Message[], type: string, conversationId: string): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = []
    const lastMessage = messages[messages.length - 1]
    
    if (!lastMessage) return suggestions

    const content = lastMessage.content.toLowerCase()

    // Pattern-based suggestions
    this.templates.forEach(template => {
      if (content.includes(template.pattern)) {
        template.suggestions.forEach(suggestion => {
          suggestions.push({
            id: nanoid(),
            type: type as SmartSuggestion['type'],
            content: suggestion.content,
            confidence: suggestion.confidence,
            reason: `Matched pattern: ${template.pattern}`,
            category: suggestion.category,
          })
        })
      }
    })

    // Context-aware suggestions based on message content
    if (content.includes('react')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'quick_reply',
          content: 'Tell me more about React components',
          confidence: 0.8,
          reason: 'React context detected',
          category: 'topic_exploration',
        },
        {
          id: nanoid(),
          type: 'quick_reply',
          content: 'Show me React hooks examples',
          confidence: 0.7,
          reason: 'React context detected',
          category: 'example_request',
        }
      )
    }

    if (content.includes('javascript') || content.includes('js')) {
      suggestions.push(
        {
          id: nanoid(),
          type: 'quick_reply',
          content: 'Explain JavaScript fundamentals',
          confidence: 0.8,
          reason: 'JavaScript context detected',
          category: 'educational',
        }
      )
    }

    return suggestions
  }

  private initializeSuggestionTemplates(): void {
    this.templates = [
      {
        id: 'help-pattern',
        pattern: 'help',
        suggestions: [
          { content: 'What specifically do you need help with?', category: 'clarification', confidence: 0.8 },
          { content: 'I\'m here to help! What\'s the challenge?', category: 'supportive', confidence: 0.7 },
        ],
      },
      {
        id: 'error-pattern',
        pattern: 'error',
        suggestions: [
          { content: 'Can you share the exact error message?', category: 'debugging', confidence: 0.9 },
          { content: 'What steps led to this error?', category: 'context_gathering', confidence: 0.8 },
        ],
      },
      {
        id: 'thanks-pattern',
        pattern: 'thank',
        suggestions: [
          { content: 'You\'re welcome! Anything else I can help with?', category: 'polite_continuation', confidence: 0.9 },
          { content: 'Glad I could help!', category: 'acknowledgment', confidence: 0.8 },
        ],
      },
    ]
  }

  private applyPersonalization(suggestions: SmartSuggestion[], userId: string): SmartSuggestion[] {
    const preferences = this.userPreferences.get(userId) || {}
    
    return suggestions.map(suggestion => {
      const categoryPref = preferences[`prefer_${suggestion.category}`]
      
      if (categoryPref) {
        return {
          ...suggestion,
          confidence: Math.min(suggestion.confidence * 1.2, 1),
          personalizationReason: 'user_prefers_category',
        }
      }
      
      return suggestion
    })
  }

  private updateUserPreferences(userId: string, interactions: UserInteraction[]): void {
    const preferences = this.userPreferences.get(userId) || {}
    
    // Analyze quick reply usage patterns
    const quickReplyUsage = interactions.filter(i => i.type === 'quick_reply_used')
    if (quickReplyUsage.length > 0) {
      preferences.prefersQuickReplies = true
      preferences.quickReplyFrequency = quickReplyUsage.length
    }

    // Analyze feature usage
    const featureUsage = interactions.filter(i => i.type === 'feature_usage')
    featureUsage.forEach(interaction => {
      const feature = interaction.data.feature as string
      preferences[`uses_${feature}`] = true
    })

    this.userPreferences.set(userId, preferences)
  }

  private calculateAdjustedConfidence(
    suggestion: SmartSuggestion,
    userPrefs: Record<string, any>,
    feedback: SuggestionFeedback[]
  ): number {
    let adjustedConfidence = suggestion.confidence

    // Adjust based on user preferences
    if (userPrefs[`prefer_${suggestion.category}`]) {
      adjustedConfidence *= 1.2
    }

    // Adjust based on historical feedback for this category
    const categoryFeedback = feedback.filter(f => 
      // This would need category info from the original suggestion
      f.helpful !== undefined
    )

    if (categoryFeedback.length > 0) {
      const positiveRate = categoryFeedback.filter(f => f.helpful).length / categoryFeedback.length
      adjustedConfidence *= (0.5 + positiveRate * 0.5)
    }

    return Math.min(adjustedConfidence, 1)
  }

  private updatePreferencesFromFeedback(userId: string, feedback: Omit<SuggestionFeedback, 'suggestionId'>): void {
    const preferences = this.userPreferences.get(userId) || {}
    
    if (feedback.helpful === true) {
      preferences.positiveInteractions = (preferences.positiveInteractions || 0) + 1
    } else if (feedback.helpful === false) {
      preferences.negativeInteractions = (preferences.negativeInteractions || 0) + 1
    }

    if (feedback.followUpAction) {
      preferences.commonFollowUpActions = preferences.commonFollowUpActions || []
      preferences.commonFollowUpActions.push(feedback.followUpAction)
    }

    this.userPreferences.set(userId, preferences)
  }

  private generateImprovementSuggestions(feedback: SuggestionFeedback[]): string[] {
    const improvements: string[] = []
    
    const usageRate = feedback.filter(f => f.used).length / feedback.length
    const helpfulRate = feedback.filter(f => f.helpful).length / feedback.filter(f => f.helpful !== undefined).length

    if (usageRate < 0.3) {
      improvements.push('Consider making suggestions more relevant to user context')
    }

    if (helpfulRate < 0.5) {
      improvements.push('Focus on providing more actionable suggestions')
    }

    const commonFollowUps = feedback.map(f => f.followUpAction).filter(Boolean)
    if (commonFollowUps.length > 0) {
      improvements.push(`Consider incorporating common follow-up actions: ${Array.from(new Set(commonFollowUps)).join(', ')}`)
    }

    return improvements.slice(0, 3)
  }

  private generateCacheKey(messages: Message[], type: string): string {
    const content = messages.slice(-3).map(m => m.content.substring(0, 100)).join('|')
    return `${type}_${this.hashString(content)}`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION
  }

  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.suggestionCache.entries()) {
        if (now - value.timestamp > this.CACHE_DURATION) {
          this.suggestionCache.delete(key)
        }
      }
    }, this.CACHE_DURATION)
  }
}