import { vi } from 'vitest'
import { ConversationContextService } from '../conversationContextService'
import type { Message, ConversationContext, ContextAnalysisResult } from '../../types/api'

// Mock AI service
vi.mock('../aiService', () => ({
  AIService: {
    analyzeConversationContext: vi.fn(),
    generateSmartSuggestions: vi.fn(),
    extractTopics: vi.fn(),
    analyzeSentiment: vi.fn(),
  },
}))

describe('ConversationContextService', () => {
  let service: ConversationContextService

  beforeEach(() => {
    service = new ConversationContextService()
    vi.clearAllMocks()
  })

  describe('conversation context analysis', () => {
    it('should analyze conversation context from message history', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'I need help with my React project',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'What specific issues are you facing?',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'The state management is getting complex',
          role: 'user',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      const mockAnalysisResult: ContextAnalysisResult = {
        topics: ['React', 'state management', 'frontend development'],
        sentiment: 'seeking_help',
        complexity: 'medium',
        expertise_level: 'intermediate',
        conversation_flow: 'problem_solving',
        key_entities: ['React project', 'state management'],
        user_intent: 'technical_assistance',
        confidence: 0.85,
      }

      vi.mocked(service['aiService'].analyzeConversationContext).mockResolvedValue(mockAnalysisResult)

      const context = await service.analyzeContext(messages)

      expect(context).toEqual(expect.objectContaining({
        topics: expect.arrayContaining(['React', 'state management']),
        sentiment: 'seeking_help',
        userIntent: 'technical_assistance',
        complexityLevel: 'medium',
        expertiseLevel: 'intermediate',
      }))
    })

    it('should track conversation topics over time', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'How do I set up TypeScript with React?',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'Here are the steps...',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Now I need help with testing',
          role: 'user',
          timestamp: new Date('2024-01-01T10:05:00Z'),
        },
      ]

      const mockTopicProgression = [
        { topic: 'TypeScript setup', timeRange: '10:00-10:02', relevance: 0.9 },
        { topic: 'React configuration', timeRange: '10:00-10:02', relevance: 0.8 },
        { topic: 'Testing', timeRange: '10:05-10:05', relevance: 0.95 },
      ]

      vi.mocked(service['aiService'].extractTopics).mockResolvedValue(mockTopicProgression)

      const topicProgression = await service.getTopicProgression(messages)

      expect(topicProgression).toHaveLength(3)
      expect(topicProgression[0]).toEqual(expect.objectContaining({
        topic: 'TypeScript setup',
        relevance: expect.any(Number),
      }))
      expect(topicProgression[2].topic).toBe('Testing')
    })

    it('should identify conversation patterns and user behavior', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'Quick question about CSS',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'What specifically?',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:00:30Z'),
        },
        {
          id: '3',
          content: 'Never mind, figured it out',
          role: 'user',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
      ]

      const patterns = await service.identifyConversationPatterns(messages)

      expect(patterns).toEqual(expect.objectContaining({
        communicationStyle: expect.any(String),
        responsePatterns: expect.any(Object),
        questionTypes: expect.any(Array),
        resolutionSpeed: expect.any(String),
        independenceLevel: expect.any(String),
      }))
    })

    it('should analyze sentiment and emotional context', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'I\'m really struggling with this bug',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'Let me help you solve this step by step',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Thank you! That worked perfectly!',
          role: 'user',
          timestamp: new Date('2024-01-01T10:05:00Z'),
        },
      ]

      const mockSentimentAnalysis = {
        overallSentiment: 'positive_progression',
        sentimentJourney: [
          { timestamp: '10:00:00Z', sentiment: 'frustrated', confidence: 0.8 },
          { timestamp: '10:01:00Z', sentiment: 'supportive', confidence: 0.9 },
          { timestamp: '10:05:00Z', sentiment: 'grateful', confidence: 0.95 },
        ],
        emotionalArc: 'problem_resolution',
      }

      vi.mocked(service['aiService'].analyzeSentiment).mockResolvedValue(mockSentimentAnalysis)

      const sentiment = await service.analyzeSentiment(messages)

      expect(sentiment.overallSentiment).toBe('positive_progression')
      expect(sentiment.sentimentJourney).toHaveLength(3)
      expect(sentiment.emotionalArc).toBe('problem_resolution')
    })
  })

  describe('context persistence and retrieval', () => {
    it('should persist conversation context between sessions', async () => {
      const conversationId = 'conv-123'
      const context: ConversationContext = {
        id: conversationId,
        topics: ['React', 'TypeScript'],
        sentiment: 'positive',
        userIntent: 'learning',
        complexityLevel: 'intermediate',
        expertiseLevel: 'beginner',
        lastAnalyzed: new Date(),
      }

      await service.persistContext(conversationId, context)
      const retrievedContext = await service.getPersistedContext(conversationId)

      expect(retrievedContext).toEqual(expect.objectContaining({
        id: conversationId,
        topics: expect.arrayContaining(['React', 'TypeScript']),
        sentiment: 'positive',
      }))
    })

    it('should merge context from multiple conversation sessions', async () => {
      const userId = 'user-456'
      const contexts: ConversationContext[] = [
        {
          id: 'conv-1',
          topics: ['React', 'JavaScript'],
          sentiment: 'curious',
          userIntent: 'learning',
          complexityLevel: 'beginner',
          expertiseLevel: 'beginner',
          lastAnalyzed: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'conv-2',
          topics: ['TypeScript', 'React'],
          sentiment: 'focused',
          userIntent: 'implementation',
          complexityLevel: 'intermediate',
          expertiseLevel: 'intermediate',
          lastAnalyzed: new Date('2024-01-02T10:00:00Z'),
        },
      ]

      const mergedContext = await service.mergeUserContexts(userId, contexts)

      expect(mergedContext).toEqual(expect.objectContaining({
        dominantTopics: expect.arrayContaining(['React']),
        expertiseProgression: expect.objectContaining({
          from: 'beginner',
          to: 'intermediate',
        }),
        learningPattern: expect.any(String),
        preferredComplexity: expect.any(String),
      }))
    })
  })

  describe('real-time context updates', () => {
    it('should update context in real-time as conversation progresses', async () => {
      const conversationId = 'conv-realtime'
      const newMessage: Message = {
        id: '4',
        content: 'Actually, I think I need help with Redux instead',
        role: 'user',
        timestamp: new Date(),
      }

      const initialContext: ConversationContext = {
        id: conversationId,
        topics: ['React', 'state management'],
        sentiment: 'neutral',
        userIntent: 'technical_assistance',
        complexityLevel: 'medium',
        expertiseLevel: 'intermediate',
        lastAnalyzed: new Date(),
      }

      service.setCurrentContext(conversationId, initialContext)
      await service.updateContextWithNewMessage(conversationId, newMessage)

      const updatedContext = service.getCurrentContext(conversationId)
      expect(updatedContext?.topics).toContain('Redux')
    })

    it('should detect context shifts and conversation pivots', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'Help me with CSS styling',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'What CSS properties are you working with?',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Actually, I think this is a JavaScript logic issue',
          role: 'user',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      const contextShifts = await service.detectContextShifts(messages)

      expect(contextShifts).toEqual(expect.arrayContaining([
        expect.objectContaining({
          fromTopic: 'CSS styling',
          toTopic: 'JavaScript logic',
          shiftType: 'pivot',
          confidence: expect.any(Number),
          messageIndex: 2,
        }),
      ]))
    })
  })

  describe('context-aware features', () => {
    it('should adapt response style based on conversation context', async () => {
      const context: ConversationContext = {
        id: 'conv-adapt',
        topics: ['React', 'debugging'],
        sentiment: 'frustrated',
        userIntent: 'problem_solving',
        complexityLevel: 'high',
        expertiseLevel: 'advanced',
        lastAnalyzed: new Date(),
      }

      const adaptedStyle = await service.getAdaptedResponseStyle(context)

      expect(adaptedStyle).toEqual(expect.objectContaining({
        tone: 'supportive',
        detailLevel: 'comprehensive',
        codeExamples: 'advanced',
        explanationStyle: 'step_by_step',
        encouragement: true,
      }))
    })

    it('should provide context-aware learning recommendations', async () => {
      const userContextHistory: ConversationContext[] = [
        {
          id: 'conv-1',
          topics: ['HTML', 'CSS'],
          expertiseLevel: 'beginner',
          complexityLevel: 'low',
          userIntent: 'learning',
          sentiment: 'curious',
          lastAnalyzed: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'conv-2',
          topics: ['JavaScript', 'DOM'],
          expertiseLevel: 'beginner',
          complexityLevel: 'medium',
          userIntent: 'learning',
          sentiment: 'focused',
          lastAnalyzed: new Date('2024-01-02T10:00:00Z'),
        },
      ]

      const recommendations = await service.generateLearningRecommendations(userContextHistory)

      expect(recommendations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          topic: expect.any(String),
          reason: expect.any(String),
          difficulty: expect.any(String),
          priority: expect.any(Number),
        }),
      ]))
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle empty conversation gracefully', async () => {
      const emptyMessages: Message[] = []

      const context = await service.analyzeContext(emptyMessages)

      expect(context).toEqual(expect.objectContaining({
        topics: [],
        sentiment: 'neutral',
        complexityLevel: 'unknown',
        expertiseLevel: 'unknown',
      }))
    })

    it('should handle AI service failures gracefully', async () => {
      const messages: Message[] = [
        {
          id: '1',
          content: 'Test message',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      vi.mocked(service['aiService'].analyzeConversationContext).mockRejectedValue(
        new Error('AI service unavailable')
      )

      const context = await service.analyzeContext(messages)

      expect(context).toEqual(expect.objectContaining({
        topics: [],
        sentiment: 'neutral',
        error: 'analysis_failed',
        fallbackUsed: true,
      }))
    })

    it('should validate context data before persistence', async () => {
      const invalidContext = {
        id: '',
        topics: null,
        sentiment: 'invalid_sentiment',
      } as any

      await expect(service.persistContext('conv-invalid', invalidContext)).rejects.toThrow(
        'Invalid context data'
      )
    })
  })
})