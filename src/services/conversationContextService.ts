import { nanoid } from 'nanoid'
import type { Message, ConversationContext, ContextAnalysisResult, UserInteraction } from '../types/api'

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

interface MergedUserContext {
  dominantTopics: string[]
  expertiseProgression: {
    from: string
    to: string
    trajectory: 'improving' | 'stable' | 'declining'
  }
  learningPattern: 'sequential' | 'exploratory' | 'problem_driven' | 'mixed'
  preferredComplexity: 'beginner' | 'intermediate' | 'advanced'
  communicationStyle: 'direct' | 'conversational' | 'detailed' | 'minimal'
}

export class ConversationContextService {
  private contextCache: Map<string, ConversationContext> = new Map()
  private contextHistory: Map<string, ConversationContext[]> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_HISTORY_SIZE = 50

  constructor() {
    this.setupCacheCleanup()
  }

  /**
   * Analyze conversation context from message history
   */
  async analyzeContext(messages: Message[]): Promise<ConversationContext> {
    if (messages.length === 0) {
      return this.getFallbackContext()
    }

    try {
      // Generate cache key based on messages
      const cacheKey = this.generateCacheKey(messages)
      const cachedContext = this.contextCache.get(cacheKey)
      
      if (cachedContext && this.isCacheValid(cachedContext)) {
        return cachedContext
      }

      const analysisResult = await this.performContextAnalysis(messages)
      const context = this.createConversationContext(analysisResult, messages)

      // Cache the result
      this.contextCache.set(cacheKey, context)
      
      return context
    } catch (error) {
      console.error('Context analysis failed:', error)
      return {
        ...this.getFallbackContext(),
        error: 'analysis_failed',
        fallbackUsed: true,
      }
    }
  }

  /**
   * Update context with a new message in real-time
   */
  async updateContextWithNewMessage(conversationId: string, newMessage: Message): Promise<ConversationContext> {
    const currentContext = this.getCurrentContext(conversationId)
    
    if (!currentContext) {
      // If no current context, analyze just this message
      return await this.analyzeContext([newMessage])
    }

    try {
      // Incremental update based on new message
      const updatedContext = await this.incrementalContextUpdate(currentContext, newMessage)
      this.setCurrentContext(conversationId, updatedContext)
      
      return updatedContext
    } catch (error) {
      console.error('Failed to update context with new message:', error)
      return currentContext
    }
  }

  /**
   * Get current context for a conversation
   */
  getCurrentContext(conversationId: string): ConversationContext | null {
    return this.contextCache.get(conversationId) || null
  }

  /**
   * Set current context for a conversation
   */
  setCurrentContext(conversationId: string, context: ConversationContext): void {
    this.contextCache.set(conversationId, context)
    this.addToContextHistory(conversationId, context)
  }

  /**
   * Detect context shifts in conversation
   */
  async detectContextShifts(messages: Message[]): Promise<ContextShift[]> {
    if (messages.length < 3) return []

    const shifts: ContextShift[] = []
    const windowSize = 3

    for (let i = windowSize; i < messages.length; i++) {
      const prevWindow = messages.slice(i - windowSize, i)
      const currentMessage = messages[i]

      try {
        const prevTopics = await this.extractTopicsFromMessages(prevWindow)
        const currentTopics = await this.extractTopicsFromMessage(currentMessage)

        const shift = this.identifyContextShift(prevTopics, currentTopics, i)
        if (shift) {
          shifts.push(shift)
        }
      } catch (error) {
        console.warn('Failed to detect context shift at message', i, error)
      }
    }

    return shifts
  }

  /**
   * Get conversation insights for adaptive responses
   */
  getConversationInsights(context: ConversationContext): ConversationInsights {
    return {
      dominantTopics: this.identifyDominantTopics(context.topics || []),
      userEmotionalState: context.sentiment || 'neutral',
      recommendedApproach: this.getRecommendedApproach(context),
      suggestedTone: this.getSuggestedTone(context),
      estimatedResolutionComplexity: this.estimateComplexity(context),
      learningOpportunities: this.identifyLearningOpportunities(context),
    }
  }

  /**
   * Get adapted response style based on context
   */
  async getAdaptedResponseStyle(context: ConversationContext): Promise<{
    tone: string
    detailLevel: string
    codeExamples: string
    explanationStyle: string
    encouragement?: boolean
    assumptions?: string
  }> {
    const style = {
      tone: 'neutral',
      detailLevel: 'medium',
      codeExamples: 'moderate',
      explanationStyle: 'balanced',
      encouragement: false,
      assumptions: 'none',
    }

    // Adapt based on expertise level
    switch (context.expertiseLevel) {
      case 'beginner':
        style.tone = 'supportive'
        style.detailLevel = 'comprehensive'
        style.codeExamples = 'basic'
        style.explanationStyle = 'step_by_step'
        style.encouragement = true
        break
      case 'intermediate':
        style.tone = 'collaborative'
        style.detailLevel = 'balanced'
        style.codeExamples = 'practical'
        style.explanationStyle = 'contextual'
        break
      case 'expert':
        style.tone = 'professional'
        style.detailLevel = 'concise'
        style.codeExamples = 'advanced'
        style.explanationStyle = 'direct'
        style.assumptions = 'expert_knowledge'
        break
    }

    // Adapt based on sentiment
    switch (context.sentiment) {
      case 'frustrated':
        style.tone = 'supportive'
        style.explanationStyle = 'step_by_step'
        style.encouragement = true
        break
      case 'confused':
        style.detailLevel = 'comprehensive'
        style.explanationStyle = 'clarifying'
        break
      case 'confident':
        style.tone = 'collaborative'
        style.detailLevel = 'concise'
        break
    }

    // Adapt based on complexity level
    if (context.complexityLevel === 'high') {
      style.detailLevel = 'comprehensive'
      style.codeExamples = 'advanced'
    } else if (context.complexityLevel === 'low') {
      style.explanationStyle = 'simple'
      style.codeExamples = 'basic'
    }

    return style
  }

  /**
   * Persist context for later retrieval
   */
  async persistContext(conversationId: string, context: ConversationContext): Promise<void> {
    try {
      const contextData = {
        id: conversationId,
        context,
        timestamp: new Date().toISOString(),
      }
      
      localStorage.setItem(`context_${conversationId}`, JSON.stringify(contextData))
    } catch (error) {
      console.error('Failed to persist context:', error)
    }
  }

  /**
   * Retrieve persisted context
   */
  async getPersistedContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      const stored = localStorage.getItem(`context_${conversationId}`)
      if (stored) {
        const contextData = JSON.parse(stored)
        return {
          ...contextData.context,
          lastAnalyzed: new Date(contextData.context.lastAnalyzed),
        }
      }
    } catch (error) {
      console.error('Failed to retrieve persisted context:', error)
    }
    return null
  }

  /**
   * Merge contexts from multiple conversation sessions
   */
  async mergeUserContexts(userId: string, contexts: ConversationContext[]): Promise<MergedUserContext> {
    if (contexts.length === 0) {
      return this.getDefaultMergedContext()
    }

    // Analyze topic progression
    const allTopics = contexts.flatMap(c => c.topics || [])
    const topicFrequency = new Map<string, number>()
    allTopics.forEach(topic => {
      topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1)
    })

    const dominantTopics = Array.from(topicFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)

    // Analyze expertise progression
    const expertiseLevels = contexts.map(c => c.expertiseLevel).filter(Boolean)
    const expertiseProgression = this.analyzeExpertiseProgression(expertiseLevels)

    // Analyze learning patterns
    const learningPattern = this.analyzeLearningPattern(contexts)

    // Determine preferred complexity
    const complexityLevels = contexts.map(c => c.complexityLevel).filter(Boolean)
    const preferredComplexity = this.getPreferredComplexity(complexityLevels)

    // Analyze communication style
    const communicationStyle = this.analyzeCommunicationStyle(contexts)

    return {
      dominantTopics,
      expertiseProgression,
      learningPattern,
      preferredComplexity,
      communicationStyle,
    }
  }

  /**
   * Add context to history
   */
  private addToContextHistory(conversationId: string, context: ConversationContext): void {
    const history = this.contextHistory.get(conversationId) || []
    history.push(context)

    // Keep only the most recent contexts
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift()
    }

    this.contextHistory.set(conversationId, history)
  }

  /**
   * Simulate AI-powered context analysis
   */
  private async performContextAnalysis(messages: Message[]): Promise<ContextAnalysisResult> {
    // In a real implementation, this would call an AI service
    // For now, we'll simulate the analysis
    
    const topics = await this.extractTopicsFromMessages(messages)
    const sentiment = this.analyzeSentiment(messages)
    const complexity = this.analyzeComplexity(messages)
    const expertiseLevel = this.inferExpertiseLevel(messages)
    const userIntent = this.inferUserIntent(messages)
    const keyEntities = this.extractKeyEntities(messages)

    return {
      topics,
      sentiment,
      complexity,
      expertise_level: expertiseLevel,
      conversation_flow: this.analyzeConversationFlow(messages),
      key_entities: keyEntities,
      user_intent: userIntent,
      confidence: 0.85,
    }
  }

  private createConversationContext(analysis: ContextAnalysisResult, messages: Message[]): ConversationContext {
    return {
      id: nanoid(),
      topics: analysis.topics,
      sentiment: analysis.sentiment,
      userIntent: analysis.user_intent,
      complexityLevel: analysis.complexity,
      expertiseLevel: analysis.expertise_level,
      lastAnalyzed: new Date(),
    }
  }

  private async extractTopicsFromMessages(messages: Message[]): Promise<string[]> {
    const text = messages.map(m => m.content).join(' ').toLowerCase()
    const topics: string[] = []

    // Simple keyword-based topic extraction
    const topicKeywords = {
      'React': ['react', 'jsx', 'component', 'hook', 'state', 'props'],
      'JavaScript': ['javascript', 'js', 'function', 'variable', 'array', 'object'],
      'TypeScript': ['typescript', 'ts', 'interface', 'type', 'generic'],
      'CSS': ['css', 'style', 'flexbox', 'grid', 'animation'],
      'HTML': ['html', 'element', 'tag', 'attribute'],
      'Node.js': ['node', 'npm', 'express', 'server'],
      'Testing': ['test', 'unit', 'integration', 'jest', 'vitest'],
      'Performance': ['performance', 'optimization', 'speed', 'memory'],
      'Debugging': ['debug', 'error', 'bug', 'console', 'troubleshoot'],
      'API': ['api', 'rest', 'graphql', 'fetch', 'axios'],
    }

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic)
      }
    })

    return topics.slice(0, 5) // Limit to top 5 topics
  }

  private async extractTopicsFromMessage(message: Message): Promise<string[]> {
    return this.extractTopicsFromMessages([message])
  }

  private analyzeSentiment(messages: Message[]): string {
    const userMessages = messages.filter(m => m.type === 'user')
    const text = userMessages.map(m => m.content).join(' ').toLowerCase()

    // Simple sentiment analysis
    const positiveWords = ['great', 'awesome', 'perfect', 'excellent', 'love', 'amazing', 'fantastic']
    const negativeWords = ['terrible', 'awful', 'hate', 'frustrated', 'confused', 'difficult', 'stuck']
    const questionWords = ['how', 'what', 'why', 'when', 'where', 'help']

    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length
    const questionCount = questionWords.filter(word => text.includes(word)).length

    if (negativeCount > positiveCount) return 'frustrated'
    if (questionCount > 2) return 'seeking_help'
    if (positiveCount > 0) return 'positive'
    return 'neutral'
  }

  private analyzeComplexity(messages: Message[]): 'low' | 'medium' | 'high' {
    const text = messages.map(m => m.content).join(' ')
    const avgWordLength = text.split(' ').reduce((sum, word) => sum + word.length, 0) / text.split(' ').length
    const technicalTerms = ['async', 'await', 'promise', 'callback', 'closure', 'prototype', 'constructor']
    const technicalCount = technicalTerms.filter(term => text.toLowerCase().includes(term)).length

    if (avgWordLength > 6 || technicalCount > 3) return 'high'
    if (avgWordLength > 4 || technicalCount > 1) return 'medium'
    return 'low'
  }

  private inferExpertiseLevel(messages: Message[]): 'beginner' | 'intermediate' | 'expert' {
    const userMessages = messages.filter(m => m.type === 'user')
    const text = userMessages.map(m => m.content).join(' ').toLowerCase()

    const beginnerIndicators = ['how do i', 'what is', 'i\'m new', 'beginner', 'basic', 'simple']
    const expertIndicators = ['optimize', 'performance', 'architecture', 'scalability', 'best practices', 'advanced']

    const beginnerScore = beginnerIndicators.filter(indicator => text.includes(indicator)).length
    const expertScore = expertIndicators.filter(indicator => text.includes(indicator)).length

    if (expertScore > beginnerScore) return 'expert'
    if (beginnerScore > 0) return 'beginner'
    return 'intermediate'
  }

  private inferUserIntent(messages: Message[]): string {
    const userMessages = messages.filter(m => m.type === 'user')
    const text = userMessages.map(m => m.content).join(' ').toLowerCase()

    if (text.includes('learn') || text.includes('understand')) return 'learning'
    if (text.includes('fix') || text.includes('debug') || text.includes('error')) return 'problem_solving'
    if (text.includes('build') || text.includes('create') || text.includes('implement')) return 'implementation'
    if (text.includes('optimize') || text.includes('improve')) return 'optimization'
    if (text.includes('review') || text.includes('feedback')) return 'code_review'
    return 'general_assistance'
  }

  private extractKeyEntities(messages: Message[]): string[] {
    const text = messages.map(m => m.content).join(' ')
    const entities: string[] = []

    // Simple entity extraction
    const codePatterns = [
      /\b[A-Z][a-zA-Z]+Component\b/g, // React components
      /\buse[A-Z][a-zA-Z]+\b/g, // React hooks
      /\b[a-zA-Z]+\(\)/g, // Functions
      /\b[A-Z_]+\b/g, // Constants
    ]

    codePatterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      entities.push(...matches.slice(0, 3))
    })

    return Array.from(new Set(entities)).slice(0, 5)
  }

  private analyzeConversationFlow(messages: Message[]): string {
    if (messages.length < 2) return 'initial'
    
    const userMessages = messages.filter(m => m.type === 'user')
    const avgMessageLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length

    if (avgMessageLength > 200) return 'detailed_discussion'
    if (messages.length > 10) return 'extended_conversation'
    if (userMessages.some(m => m.content.includes('?'))) return 'q_and_a'
    return 'problem_solving'
  }

  private identifyContextShift(prevTopics: string[], currentTopics: string[], messageIndex: number): ContextShift | null {
    const commonTopics = prevTopics.filter(topic => currentTopics.includes(topic))
    const newTopics = currentTopics.filter(topic => !prevTopics.includes(topic))

    if (newTopics.length > 0 && commonTopics.length === 0) {
      return {
        fromTopic: prevTopics[0] || 'unknown',
        toTopic: newTopics[0],
        shiftType: 'pivot',
        confidence: 0.8,
        messageIndex,
        timestamp: new Date(),
      }
    }

    if (newTopics.length > 0 && commonTopics.length > 0) {
      return {
        fromTopic: prevTopics[0] || 'unknown',
        toTopic: newTopics[0],
        shiftType: 'expansion',
        confidence: 0.6,
        messageIndex,
        timestamp: new Date(),
      }
    }

    return null
  }

  private async incrementalContextUpdate(currentContext: ConversationContext, newMessage: Message): Promise<ConversationContext> {
    const newTopics = await this.extractTopicsFromMessage(newMessage)
    const newSentiment = this.analyzeSentiment([newMessage])

    // Merge topics
    const mergedTopics = Array.from(new Set([...(currentContext.topics || []), ...newTopics])).slice(0, 5)

    // Update sentiment with recency bias
    const updatedSentiment = newSentiment !== 'neutral' ? newSentiment : currentContext.sentiment

    return {
      ...currentContext,
      topics: mergedTopics,
      sentiment: updatedSentiment,
      lastAnalyzed: new Date(),
    }
  }

  private identifyDominantTopics(topics: string[]): string[] {
    return topics.slice(0, 3)
  }

  private getRecommendedApproach(context: ConversationContext): string {
    if (context.sentiment === 'frustrated') return 'step_by_step_guidance'
    if (context.expertiseLevel === 'beginner') return 'educational_explanation'
    if (context.userIntent === 'problem_solving') return 'diagnostic_approach'
    return 'collaborative_discussion'
  }

  private getSuggestedTone(context: ConversationContext): string {
    if (context.sentiment === 'frustrated') return 'supportive'
    if (context.expertiseLevel === 'expert') return 'professional'
    if (context.userIntent === 'learning') return 'encouraging'
    return 'friendly'
  }

  private estimateComplexity(context: ConversationContext): 'low' | 'medium' | 'high' {
    return context.complexityLevel || 'medium'
  }

  private identifyLearningOpportunities(context: ConversationContext): string[] {
    const opportunities: string[] = []
    
    if (context.topics?.includes('React') && context.expertiseLevel === 'beginner') {
      opportunities.push('React fundamentals', 'Component lifecycle', 'State management')
    }
    
    if (context.userIntent === 'problem_solving') {
      opportunities.push('Debugging techniques', 'Error handling', 'Testing strategies')
    }

    return opportunities.slice(0, 3)
  }

  private analyzeExpertiseProgression(expertiseLevels: string[]) {
    if (expertiseLevels.length < 2) {
      return { from: 'unknown', to: 'unknown', trajectory: 'stable' as const }
    }

    const levels = { beginner: 1, intermediate: 2, expert: 3 }
    const first = levels[expertiseLevels[0] as keyof typeof levels] || 2
    const last = levels[expertiseLevels[expertiseLevels.length - 1] as keyof typeof levels] || 2

    return {
      from: expertiseLevels[0] || 'unknown',
      to: expertiseLevels[expertiseLevels.length - 1] || 'unknown',
      trajectory: (last > first ? 'improving' : last < first ? 'declining' : 'stable') as 'improving' | 'stable' | 'declining',
    }
  }

  private analyzeLearningPattern(contexts: ConversationContext[]): 'sequential' | 'exploratory' | 'problem_driven' | 'mixed' {
    const intents = contexts.map(c => c.userIntent).filter(Boolean)
    const problemSolvingCount = intents.filter(i => i === 'problem_solving').length
    const learningCount = intents.filter(i => i === 'learning').length
    
    if (problemSolvingCount > learningCount * 2) return 'problem_driven'
    if (learningCount > problemSolvingCount * 2) return 'sequential'
    return 'mixed'
  }

  private getPreferredComplexity(complexityLevels: string[]): 'beginner' | 'intermediate' | 'advanced' {
    const counts = complexityLevels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommon = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0]
    return (mostCommon as 'beginner' | 'intermediate' | 'advanced') || 'intermediate'
  }

  private analyzeCommunicationStyle(contexts: ConversationContext[]): 'direct' | 'conversational' | 'detailed' | 'minimal' {
    // This would analyze message patterns in a real implementation
    return 'conversational'
  }

  private getDefaultMergedContext(): MergedUserContext {
    return {
      dominantTopics: [],
      expertiseProgression: { from: 'unknown', to: 'unknown', trajectory: 'stable' },
      learningPattern: 'mixed',
      preferredComplexity: 'intermediate',
      communicationStyle: 'conversational',
    }
  }

  private getFallbackContext(): ConversationContext {
    return {
      id: nanoid(),
      topics: [],
      sentiment: 'neutral',
      userIntent: 'general_assistance',
      complexityLevel: 'medium',
      expertiseLevel: 'intermediate',
      lastAnalyzed: new Date(),
    }
  }

  private generateCacheKey(messages: Message[]): string {
    const content = messages.map(m => `${m.type}:${m.content.substring(0, 50)}`).join('|')
    return `context_${this.hashString(content)}`
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

  private isCacheValid(context: ConversationContext): boolean {
    const age = Date.now() - context.lastAnalyzed.getTime()
    return age < this.CACHE_DURATION
  }

  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, context] of this.contextCache.entries()) {
        if (now - context.lastAnalyzed.getTime() > this.CACHE_DURATION) {
          this.contextCache.delete(key)
        }
      }
    }, this.CACHE_DURATION)
  }
}