import { vi } from 'vitest'
import { SmartSuggestionService } from '../smartSuggestionService'
import type { Message, ConversationContext, SmartSuggestion, UserInteraction } from '../../types/api'

// Mock dependencies
vi.mock('../aiService', () => ({
  AIService: {
    generateSmartSuggestions: vi.fn(),
    analyzeMessageIntent: vi.fn(),
    predictUserNeeds: vi.fn(),
  },
}))

vi.mock('../conversationContextService', () => ({
  ConversationContextService: vi.fn().mockImplementation(() => ({
    getCurrentContext: vi.fn(),
    analyzeContext: vi.fn(),
  })),
}))

describe('SmartSuggestionService', () => {
  let service: SmartSuggestionService

  beforeEach(() => {
    service = new SmartSuggestionService()
    vi.clearAllMocks()
  })

  describe('quick reply suggestions', () => {
    it('should generate contextually relevant quick replies', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'How do I deploy my React app to production?',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const context: ConversationContext = {
        id: 'conv-1',
        topics: ['React', 'deployment', 'production'],
        userIntent: 'implementation',
        complexityLevel: 'intermediate',
        expertiseLevel: 'intermediate',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      const mockSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Show me deployment options for React',
          confidence: 0.9,
          reason: 'Follow-up question about deployment methods',
          category: 'clarification',
        },
        {
          id: 'suggestion-2',
          type: 'quick_reply',
          content: 'I prefer cloud platforms like Vercel',
          confidence: 0.8,
          reason: 'Common preference for React deployments',
          category: 'preference',
        },
        {
          id: 'suggestion-3',
          type: 'quick_reply',
          content: 'What about build optimization?',
          confidence: 0.85,
          reason: 'Related concern for production deployment',
          category: 'related_topic',
        },
      ]

      vi.mocked(service['aiService'].generateSmartSuggestions).mockResolvedValue(mockSuggestions)
      vi.mocked(service['contextService'].getCurrentContext).mockReturnValue(context)

      const suggestions = await service.generateQuickReplies(messages, 'conv-1')

      expect(suggestions).toHaveLength(3)
      expect(suggestions[0]).toEqual(expect.objectContaining({
        type: 'quick_reply',
        content: 'Show me deployment options for React',
        confidence: expect.any(Number),
        category: 'clarification',
      }))
    })

    it('should personalize suggestions based on user behavior patterns', async () => {
      const userInteractions: UserInteraction[] = [
        {
          type: 'quick_reply_used',
          timestamp: new Date(),
          data: { replyType: 'code_example', frequency: 'high' },
        },
        {
          type: 'feature_usage',
          timestamp: new Date(),
          data: { feature: 'file_upload', success: true },
        },
      ]

      const messages: Message[] = [
        {
          id: '1',
          content: 'I need help with API integration',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const personalizedSuggestions = await service.generatePersonalizedSuggestions(
        messages,
        'user-123',
        userInteractions
      )

      expect(personalizedSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'quick_reply',
          content: expect.stringContaining('code example'),
          personalizationReason: 'user_prefers_code_examples',
        }),
      ]))
    })

    it('should filter suggestions based on conversation flow', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'What is React?',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'React is a JavaScript library...',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Can you show me a simple example?',
          role: 'user',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      const filteredSuggestions = await service.getFlowAwareSuggestions(messages)

      expect(filteredSuggestions).not.toContain(
        expect.objectContaining({
          content: expect.stringContaining('What is React'),
        })
      )
      expect(filteredSuggestions).toContain(
        expect.objectContaining({
          content: expect.stringContaining('more examples'),
        })
      )
    })

    it('should rank suggestions by relevance and user preference', async () => {
      const mockUnrankedSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Tell me more about hooks',
          confidence: 0.7,
          reason: 'Related to React',
          category: 'learning',
        },
        {
          id: 'suggestion-2',
          type: 'quick_reply',
          content: 'Show me a code example',
          confidence: 0.9,
          reason: 'User prefers examples',
          category: 'code_example',
        },
        {
          id: 'suggestion-3',
          type: 'quick_reply',
          content: 'What about performance?',
          confidence: 0.6,
          reason: 'Advanced topic',
          category: 'advanced',
        },
      ]

      const userPreferences = {
        prefersCodeExamples: true,
        expertiseLevel: 'intermediate',
        learningStyle: 'practical',
      }

      const rankedSuggestions = await service.rankSuggestions(
        mockUnrankedSuggestions,
        userPreferences
      )

      expect(rankedSuggestions[0].content).toContain('code example')
      expect(rankedSuggestions[0].confidence).toBe(0.9)
    })
  })

  describe('smart action suggestions', () => {
    it('should suggest relevant actions based on conversation content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'I have a file with component code that needs review',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const actionSuggestions = await service.generateActionSuggestions(messages)

      expect(actionSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'action_suggestion',
          action: 'file_upload',
          description: 'Upload your component file for review',
          confidence: expect.any(Number),
        }),
      ]))
    })

    it('should suggest workflow improvements based on user patterns', async () => {
      const userWorkflowData = {
        commonTasks: ['code_review', 'debugging', 'optimization'],
        timeSpentPerTask: { debugging: 45, code_review: 30, optimization: 20 },
        frequentQuestions: ['how to debug', 'performance tips'],
      }

      const workflowSuggestions = await service.generateWorkflowSuggestions(userWorkflowData)

      expect(workflowSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'workflow_suggestion',
          category: 'efficiency',
          suggestion: expect.any(String),
          expectedBenefit: expect.any(String),
        }),
      ]))
    })

    it('should suggest learning resources based on knowledge gaps', async () => {
      const context: ConversationContext = {
        id: 'conv-learning',
        topics: ['React', 'useState'],
        userIntent: 'learning',
        complexityLevel: 'beginner',
        expertiseLevel: 'beginner',
        sentiment: 'confused',
        lastAnalyzed: new Date(),
      }

      const knowledgeGaps = ['useEffect', 'custom hooks', 'context API']

      const learningSuggestions = await service.generateLearningSuggestions(
        context,
        knowledgeGaps
      )

      expect(learningSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'learning_suggestion',
          topic: expect.any(String),
          difficulty: 'beginner',
          reason: expect.any(String),
        }),
      ]))
    })
  })

  describe('contextual follow-up suggestions', () => {
    it('should generate follow-up questions based on incomplete information', async () => {
      const lastMessage: Message = {
        id: '1',
        content: 'My component is not rendering',
        role: 'user',
        timestamp: new Date(),
      }

      const followUpSuggestions = await service.generateFollowUpSuggestions(lastMessage)

      expect(followUpSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'follow_up',
          content: expect.stringContaining('error message'),
          reason: 'gather_debugging_info',
        }),
        expect.objectContaining({
          type: 'follow_up',
          content: expect.stringContaining('console'),
          reason: 'debugging_assistance',
        }),
      ]))
    })

    it('should suggest clarifying questions when user intent is ambiguous', async () => {
      const ambiguousMessage: Message = {
        id: '1',
        content: 'It\'s not working',
        role: 'user',
        timestamp: new Date(),
      }

      const clarificationSuggestions = await service.generateClarificationSuggestions(
        ambiguousMessage
      )

      expect(clarificationSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'clarification',
          content: expect.stringContaining('specifically'),
          priority: 'high',
        }),
      ]))
    })

    it('should adapt suggestion complexity based on user expertise', async () => {
      const beginnerContext: ConversationContext = {
        id: 'conv-beginner',
        topics: ['React basics'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'curious',
        lastAnalyzed: new Date(),
      }

      const advancedContext: ConversationContext = {
        id: 'conv-advanced',
        topics: ['React performance'],
        expertiseLevel: 'expert',
        complexityLevel: 'high',
        userIntent: 'optimization',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      const beginnerSuggestions = await service.getAdaptiveSuggestions(beginnerContext)
      const advancedSuggestions = await service.getAdaptiveSuggestions(advancedContext)

      expect(beginnerSuggestions[0].complexity).toBe('simple')
      expect(advancedSuggestions[0].complexity).toBe('advanced')
    })
  })

  describe('suggestion feedback and learning', () => {
    it('should track suggestion usage and effectiveness', async () => {
      const suggestionId = 'suggestion-123'
      const feedback = {
        used: true,
        helpful: true,
        followUpAction: 'generated_more_examples',
        timestamp: new Date(),
      }

      await service.trackSuggestionFeedback(suggestionId, feedback)

      const effectiveness = await service.getSuggestionEffectiveness(suggestionId)
      expect(effectiveness).toEqual(expect.objectContaining({
        usageRate: expect.any(Number),
        helpfulnessScore: expect.any(Number),
        improvementSuggestions: expect.any(Array),
      }))
    })

    it('should improve suggestion quality based on user feedback', async () => {
      const feedbackData = [
        { suggestionType: 'code_example', rating: 5, used: true },
        { suggestionType: 'code_example', rating: 5, used: true },
        { suggestionType: 'theoretical', rating: 2, used: false },
      ]

      await service.learnFromFeedback('user-456', feedbackData)

      const improvedSuggestions = await service.generateImprovedSuggestions('user-456', [
        {
          id: '1',
          content: 'Can you explain React state?',
          role: 'user',
          timestamp: new Date(),
        },
      ])

      expect(improvedSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'quick_reply',
          category: 'code_example',
          adaptationReason: 'user_prefers_practical_examples',
        }),
      ]))
    })
  })

  describe('suggestion caching and performance', () => {
    it('should cache frequently requested suggestions', async () => {
      const cacheKey = 'react-basics-beginner'
      const cachedSuggestions: SmartSuggestion[] = [
        {
          id: 'cached-1',
          type: 'quick_reply',
          content: 'Show me React components',
          confidence: 0.9,
          reason: 'Cached suggestion',
          category: 'learning',
        },
      ]

      service.setCachedSuggestions(cacheKey, cachedSuggestions)
      const retrieved = service.getCachedSuggestions(cacheKey)

      expect(retrieved).toEqual(cachedSuggestions)
    })

    it('should invalidate cache when context significantly changes', async () => {
      const oldContext: ConversationContext = {
        id: 'conv-1',
        topics: ['HTML'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'curious',
        lastAnalyzed: new Date(),
      }

      const newContext: ConversationContext = {
        id: 'conv-1',
        topics: ['React', 'advanced patterns'],
        expertiseLevel: 'expert',
        complexityLevel: 'high',
        userIntent: 'implementation',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      const shouldInvalidate = service.shouldInvalidateCache(oldContext, newContext)
      expect(shouldInvalidate).toBe(true)
    })

    it('should batch suggestion requests for performance', async () => {
      const multipleRequests = [
        { messages: [{ id: '1', content: 'React help', role: 'user' as const, timestamp: new Date() }], conversationId: 'conv-1' },
        { messages: [{ id: '2', content: 'Vue help', role: 'user' as const, timestamp: new Date() }], conversationId: 'conv-2' },
        { messages: [{ id: '3', content: 'Angular help', role: 'user' as const, timestamp: new Date() }], conversationId: 'conv-3' },
      ]

      const batchedResults = await service.batchGenerateSuggestions(multipleRequests)

      expect(batchedResults).toHaveLength(3)
      expect(batchedResults[0].conversationId).toBe('conv-1')
      expect(batchedResults[1].conversationId).toBe('conv-2')
      expect(batchedResults[2].conversationId).toBe('conv-3')
    })
  })

  describe('error handling and fallbacks', () => {
    it('should provide fallback suggestions when AI service fails', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'Help with React',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      vi.mocked(service['aiService'].generateSmartSuggestions).mockRejectedValue(
        new Error('AI service unavailable')
      )

      const fallbackSuggestions = await service.generateQuickReplies(messages, 'conv-1')

      expect(fallbackSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'quick_reply',
          content: expect.any(String),
          isFallback: true,
        }),
      ]))
    })

    it('should handle edge cases with minimal message context', async () => {
      const minimalMessages: Message[] = [
        {
          id: '1',
          content: 'Hi',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const suggestions = await service.generateQuickReplies(minimalMessages, 'conv-minimal')

      expect(suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'quick_reply',
          category: 'greeting',
          content: expect.any(String),
        }),
      ]))
    })

    it('should validate suggestion data before returning', async () => {
      const invalidSuggestion = {
        id: null,
        content: '',
        confidence: -1,
      } as any

      const validationResult = service.validateSuggestion(invalidSuggestion)
      expect(validationResult.isValid).toBe(false)
      expect(validationResult.errors).toEqual(expect.arrayContaining([
        'Invalid suggestion ID',
        'Empty content',
        'Invalid confidence score',
      ]))
    })
  })
})