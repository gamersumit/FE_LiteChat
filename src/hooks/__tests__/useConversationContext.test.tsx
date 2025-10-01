import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useConversationContext } from '../useConversationContext'
import { PersonalizationProvider } from '../../components/personalization/PersonalizationProvider'
import type { Message, ConversationContext } from '../../types/api'

// Mock conversation context service
vi.mock('../../services/conversationContextService', () => ({
  ConversationContextService: vi.fn().mockImplementation(() => ({
    analyzeContext: vi.fn(),
    updateContextWithNewMessage: vi.fn(),
    getCurrentContext: vi.fn(),
    detectContextShifts: vi.fn(),
    getAdaptedResponseStyle: vi.fn(),
  })),
}))

// Mock wrapper component
const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <PersonalizationProvider userId="test-user">
    {children}
  </PersonalizationProvider>
)

describe('useConversationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('context analysis and tracking', () => {
    it('should analyze conversation context from messages', async () => {
      const { result } = renderHook(() => useConversationContext('conv-123'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'I need help with React hooks',
          role: 'user',
          timestamp: new Date(),
        },
        {
          id: '2',
          content: 'Which hooks are you working with?',
          role: 'assistant',
          timestamp: new Date(),
        },
      ]

      const mockAnalysisResult: ConversationContext = {
        id: 'conv-123',
        topics: ['React', 'hooks'],
        sentiment: 'seeking_help',
        userIntent: 'technical_assistance',
        complexityLevel: 'intermediate',
        expertiseLevel: 'intermediate',
        lastAnalyzed: new Date(),
      }

      vi.mocked(result.current['contextService'].analyzeContext).mockResolvedValue(mockAnalysisResult)

      await act(async () => {
        await result.current.analyzeMessages(messages)
      })

      expect(result.current.currentContext).toEqual(expect.objectContaining({
        topics: expect.arrayContaining(['React', 'hooks']),
        sentiment: 'seeking_help',
        userIntent: 'technical_assistance',
      }))
    })

    it('should update context in real-time as new messages arrive', async () => {
      const { result } = renderHook(() => useConversationContext('conv-realtime'), {
        wrapper: MockWrapper,
      })

      const initialContext: ConversationContext = {
        id: 'conv-realtime',
        topics: ['JavaScript'],
        sentiment: 'neutral',
        userIntent: 'learning',
        complexityLevel: 'beginner',
        expertiseLevel: 'beginner',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(initialContext)

      const newMessage: Message = {
        id: '3',
        content: 'Actually, I want to focus on React components now',
        role: 'user',
        timestamp: new Date(),
      }

      const updatedContext: ConversationContext = {
        ...initialContext,
        topics: ['JavaScript', 'React', 'components'],
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      vi.mocked(result.current['contextService'].updateContextWithNewMessage).mockResolvedValue(updatedContext)

      await act(async () => {
        await result.current.updateWithNewMessage(newMessage)
      })

      expect(result.current.currentContext?.topics).toContain('React')
      expect(result.current.currentContext?.topics).toContain('components')
    })

    it('should detect and track context shifts in conversations', async () => {
      const { result } = renderHook(() => useConversationContext('conv-shifts'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'Help me with CSS grid layout',
          role: 'user',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'Here\'s how CSS grid works...',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Actually, I think I need to understand flexbox first',
          role: 'user',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      const mockContextShifts = [
        {
          fromTopic: 'CSS grid',
          toTopic: 'flexbox',
          shiftType: 'pivot',
          confidence: 0.9,
          messageIndex: 2,
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      vi.mocked(result.current['contextService'].detectContextShifts).mockResolvedValue(mockContextShifts)

      await act(async () => {
        await result.current.analyzeContextShifts(messages)
      })

      expect(result.current.contextShifts).toHaveLength(1)
      expect(result.current.contextShifts[0]).toEqual(expect.objectContaining({
        fromTopic: 'CSS grid',
        toTopic: 'flexbox',
        shiftType: 'pivot',
      }))
    })

    it('should provide context-aware conversation insights', async () => {
      const { result } = renderHook(() => useConversationContext('conv-insights'), {
        wrapper: MockWrapper,
      })

      const context: ConversationContext = {
        id: 'conv-insights',
        topics: ['React', 'debugging', 'performance'],
        sentiment: 'frustrated',
        userIntent: 'problem_solving',
        complexityLevel: 'high',
        expertiseLevel: 'intermediate',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(context)

      const insights = result.current.getConversationInsights()

      expect(insights).toEqual(expect.objectContaining({
        dominantTopics: expect.arrayContaining(['React']),
        userEmotionalState: 'frustrated',
        recommendedApproach: expect.any(String),
        suggestedTone: expect.any(String),
        estimatedResolutionComplexity: 'high',
      }))
    })
  })

  describe('adaptive response styling', () => {
    it('should provide adapted response style based on current context', async () => {
      const { result } = renderHook(() => useConversationContext('conv-styling'), {
        wrapper: MockWrapper,
      })

      const context: ConversationContext = {
        id: 'conv-styling',
        topics: ['React', 'advanced patterns'],
        sentiment: 'confident',
        userIntent: 'implementation',
        complexityLevel: 'high',
        expertiseLevel: 'expert',
        lastAnalyzed: new Date(),
      }

      const mockAdaptedStyle = {
        tone: 'professional',
        detailLevel: 'comprehensive',
        codeExamples: 'advanced',
        explanationStyle: 'concise',
        assumptions: 'expert_knowledge',
      }

      vi.mocked(result.current['contextService'].getAdaptedResponseStyle).mockResolvedValue(mockAdaptedStyle)

      await act(async () => {
        result.current.setCurrentContext(context)
      })

      const adaptedStyle = await result.current.getAdaptedResponseStyle()

      expect(adaptedStyle).toEqual(expect.objectContaining({
        tone: 'professional',
        detailLevel: 'comprehensive',
        codeExamples: 'advanced',
      }))
    })

    it('should adapt communication style for different expertise levels', async () => {
      const { result } = renderHook(() => useConversationContext('conv-expertise'), {
        wrapper: MockWrapper,
      })

      const beginnerContext: ConversationContext = {
        id: 'conv-beginner',
        topics: ['HTML basics'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'curious',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(beginnerContext)
      const beginnerStyle = result.current.getAdaptedCommunicationStyle()

      expect(beginnerStyle).toEqual(expect.objectContaining({
        vocabulary: 'simple',
        pacing: 'slow',
        examples: 'basic',
        encouragement: 'high',
      }))

      const expertContext: ConversationContext = {
        id: 'conv-expert',
        topics: ['React internals'],
        expertiseLevel: 'expert',
        complexityLevel: 'high',
        userIntent: 'optimization',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(expertContext)
      const expertStyle = result.current.getAdaptedCommunicationStyle()

      expect(expertStyle).toEqual(expect.objectContaining({
        vocabulary: 'technical',
        pacing: 'fast',
        examples: 'advanced',
        assumptions: 'expert_knowledge',
      }))
    })
  })

  describe('context persistence and history', () => {
    it('should maintain context history across conversation sessions', async () => {
      const { result } = renderHook(() => useConversationContext('conv-history'), {
        wrapper: MockWrapper,
      })

      const context1: ConversationContext = {
        id: 'conv-history',
        topics: ['JavaScript'],
        sentiment: 'curious',
        userIntent: 'learning',
        complexityLevel: 'beginner',
        expertiseLevel: 'beginner',
        lastAnalyzed: new Date('2024-01-01T10:00:00Z'),
      }

      const context2: ConversationContext = {
        id: 'conv-history',
        topics: ['React', 'components'],
        sentiment: 'focused',
        userIntent: 'implementation',
        complexityLevel: 'intermediate',
        expertiseLevel: 'intermediate',
        lastAnalyzed: new Date('2024-01-01T11:00:00Z'),
      }

      await act(async () => {
        result.current.addToHistory(context1)
        result.current.addToHistory(context2)
      })

      const history = result.current.getContextHistory()
      expect(history).toHaveLength(2)
      expect(history[0].topics).toContain('JavaScript')
      expect(history[1].topics).toContain('React')
    })

    it('should analyze learning progression from context history', async () => {
      const { result } = renderHook(() => useConversationContext('conv-progression'), {
        wrapper: MockWrapper,
      })

      const progressionContexts: ConversationContext[] = [
        {
          id: 'conv-1',
          topics: ['HTML'],
          expertiseLevel: 'beginner',
          complexityLevel: 'low',
          userIntent: 'learning',
          sentiment: 'curious',
          lastAnalyzed: new Date('2024-01-01T09:00:00Z'),
        },
        {
          id: 'conv-2',
          topics: ['CSS'],
          expertiseLevel: 'beginner',
          complexityLevel: 'low',
          userIntent: 'learning',
          sentiment: 'focused',
          lastAnalyzed: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'conv-3',
          topics: ['JavaScript'],
          expertiseLevel: 'intermediate',
          complexityLevel: 'medium',
          userIntent: 'implementation',
          sentiment: 'confident',
          lastAnalyzed: new Date('2024-01-01T11:00:00Z'),
        },
      ]

      progressionContexts.forEach(context => {
        result.current.addToHistory(context)
      })

      const progression = result.current.analyzeLearningProgression()

      expect(progression).toEqual(expect.objectContaining({
        skillProgression: expect.objectContaining({
          from: 'beginner',
          to: 'intermediate',
        }),
        topicEvolution: expect.arrayContaining(['HTML', 'CSS', 'JavaScript']),
        complexityGrowth: expect.any(String),
        confidenceImprovement: expect.any(Boolean),
      }))
    })
  })

  describe('context-driven recommendations', () => {
    it('should generate next topic recommendations based on context', async () => {
      const { result } = renderHook(() => useConversationContext('conv-recommendations'), {
        wrapper: MockWrapper,
      })

      const context: ConversationContext = {
        id: 'conv-recommendations',
        topics: ['React', 'useState'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'curious',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(context)
      const recommendations = result.current.getNextTopicRecommendations()

      expect(recommendations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          topic: expect.any(String),
          reason: expect.any(String),
          difficulty: expect.any(String),
          relevance: expect.any(Number),
        }),
      ]))
      expect(recommendations[0].topic).toMatch(/(useEffect|props|components)/)
    })

    it('should suggest conversation direction based on user patterns', async () => {
      const { result } = renderHook(() => useConversationContext('conv-direction'), {
        wrapper: MockWrapper,
      })

      const context: ConversationContext = {
        id: 'conv-direction',
        topics: ['debugging', 'React errors'],
        sentiment: 'frustrated',
        userIntent: 'problem_solving',
        complexityLevel: 'high',
        expertiseLevel: 'intermediate',
        lastAnalyzed: new Date(),
      }

      result.current.setCurrentContext(context)
      const directionSuggestions = result.current.getConversationDirectionSuggestions()

      expect(directionSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          direction: expect.any(String),
          approach: expect.any(String),
          expectedOutcome: expect.any(String),
        }),
      ]))
    })
  })

  describe('performance and optimization', () => {
    it('should debounce context updates to prevent excessive analysis', async () => {
      const { result } = renderHook(() => useConversationContext('conv-debounce'), {
        wrapper: MockWrapper,
      })

      const messages = [
        { id: '1', content: 'Message 1', role: 'user' as const, timestamp: new Date() },
        { id: '2', content: 'Message 2', role: 'user' as const, timestamp: new Date() },
        { id: '3', content: 'Message 3', role: 'user' as const, timestamp: new Date() },
      ]

      await act(async () => {
        for (const message of messages) {
          result.current.updateWithNewMessage(message)
        }
      })

      // Should only trigger analysis once due to debouncing
      expect(result.current.analysisCount).toBe(1)
    })

    it('should cache context analysis results for performance', async () => {
      const { result } = renderHook(() => useConversationContext('conv-cache'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'Same message for caching test',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      // First analysis
      await act(async () => {
        await result.current.analyzeMessages(messages)
      })

      const firstAnalysisTime = Date.now()

      // Second analysis of same messages should use cache
      await act(async () => {
        await result.current.analyzeMessages(messages)
      })

      const secondAnalysisTime = Date.now()

      expect(result.current.wasCacheUsed).toBe(true)
      expect(secondAnalysisTime - firstAnalysisTime).toBeLessThan(50) // Should be much faster
    })
  })

  describe('error handling', () => {
    it('should handle context analysis failures gracefully', async () => {
      const { result } = renderHook(() => useConversationContext('conv-error'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'Test message',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      vi.mocked(result.current['contextService'].analyzeContext).mockRejectedValue(
        new Error('Analysis service failed')
      )

      await act(async () => {
        await result.current.analyzeMessages(messages)
      })

      expect(result.current.currentContext).toEqual(expect.objectContaining({
        topics: [],
        sentiment: 'neutral',
        error: 'analysis_failed',
        fallbackUsed: true,
      }))
      expect(result.current.hasError).toBe(true)
    })

    it('should provide fallback context when service is unavailable', async () => {
      const { result } = renderHook(() => useConversationContext('conv-fallback'), {
        wrapper: MockWrapper,
      })

      result.current.setServiceUnavailable(true)

      const fallbackContext = result.current.getFallbackContext()

      expect(fallbackContext).toEqual(expect.objectContaining({
        topics: [],
        sentiment: 'neutral',
        userIntent: 'unknown',
        complexityLevel: 'medium',
        expertiseLevel: 'intermediate',
        isFallback: true,
      }))
    })
  })
})