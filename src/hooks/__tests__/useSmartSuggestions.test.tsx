import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useSmartSuggestions } from '../useSmartSuggestions'
import { PersonalizationProvider } from '../../components/personalization/PersonalizationProvider'
import type { Message, SmartSuggestion, ConversationContext } from '../../types/api'

// Mock smart suggestion service
vi.mock('../../services/smartSuggestionService', () => ({
  SmartSuggestionService: vi.fn().mockImplementation(() => ({
    generateQuickReplies: vi.fn(),
    generatePersonalizedSuggestions: vi.fn(),
    generateActionSuggestions: vi.fn(),
    generateFollowUpSuggestions: vi.fn(),
    trackSuggestionFeedback: vi.fn(),
    batchGenerateSuggestions: vi.fn(),
  })),
}))

// Mock conversation context hook
vi.mock('../useConversationContext', () => ({
  useConversationContext: vi.fn().mockReturnValue({
    currentContext: {
      id: 'conv-123',
      topics: ['React'],
      sentiment: 'curious',
      userIntent: 'learning',
      complexityLevel: 'intermediate',
      expertiseLevel: 'intermediate',
      lastAnalyzed: new Date(),
    },
    getConversationInsights: vi.fn().mockReturnValue({
      dominantTopics: ['React'],
      userEmotionalState: 'curious',
    }),
  }),
}))

// Mock wrapper component
const MockWrapper = ({ children }: { children: React.ReactNode }) => (
  <PersonalizationProvider userId="test-user">
    {children}
  </PersonalizationProvider>
)

describe('useSmartSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quick reply suggestions', () => {
    it('should generate quick reply suggestions based on message context', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-123'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'How do I use React hooks?',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const mockSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Show me useState examples',
          confidence: 0.9,
          reason: 'Common follow-up for React hooks',
          category: 'example_request',
        },
        {
          id: 'suggestion-2',
          type: 'quick_reply',
          content: 'What about useEffect?',
          confidence: 0.85,
          reason: 'Related hook concept',
          category: 'related_question',
        },
      ]

      vi.mocked(result.current['suggestionService'].generateQuickReplies).mockResolvedValue(mockSuggestions)

      await act(async () => {
        await result.current.generateSuggestions(messages)
      })

      expect(result.current.quickReplies).toHaveLength(2)
      expect(result.current.quickReplies[0]).toEqual(expect.objectContaining({
        content: 'Show me useState examples',
        category: 'example_request',
      }))
    })

    it('should personalize suggestions based on user behavior', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-personalized'), {
        wrapper: MockWrapper,
      })

      const userBehavior = {
        prefersCodeExamples: true,
        frequentTopics: ['React', 'TypeScript'],
        communicationStyle: 'direct',
      }

      const messages: Message[] = [
        {
          id: '1',
          content: 'I need help with TypeScript interfaces',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const personalizedSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Show me interface code examples',
          confidence: 0.95,
          reason: 'User prefers code examples',
          category: 'code_example',
          personalizationReason: 'matches_user_preference',
        },
      ]

      vi.mocked(result.current['suggestionService'].generatePersonalizedSuggestions).mockResolvedValue(personalizedSuggestions)

      await act(async () => {
        result.current.setUserBehavior(userBehavior)
        await result.current.generatePersonalizedSuggestions(messages)
      })

      expect(result.current.personalizedSuggestions[0]).toEqual(expect.objectContaining({
        content: 'Show me interface code examples',
        personalizationReason: 'matches_user_preference',
      }))
    })

    it('should filter and rank suggestions by relevance', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-ranking'), {
        wrapper: MockWrapper,
      })

      const unrankedSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Tell me more about advanced patterns',
          confidence: 0.6,
          reason: 'Advanced topic',
          category: 'advanced',
        },
        {
          id: 'suggestion-2',
          type: 'quick_reply',
          content: 'Show me a simple example',
          confidence: 0.9,
          reason: 'Matches user level',
          category: 'example',
        },
        {
          id: 'suggestion-3',
          type: 'quick_reply',
          content: 'What are the basics?',
          confidence: 0.85,
          reason: 'Foundational knowledge',
          category: 'basics',
        },
      ]

      result.current.setRawSuggestions(unrankedSuggestions)
      
      await act(async () => {
        result.current.rankSuggestionsByRelevance()
      })

      const rankedSuggestions = result.current.quickReplies
      expect(rankedSuggestions[0].confidence).toBeGreaterThan(rankedSuggestions[1].confidence)
      expect(rankedSuggestions[0].content).toContain('simple example')
    })
  })

  describe('action suggestions', () => {
    it('should generate contextual action suggestions', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-actions'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'I have a component file that needs review',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      const actionSuggestions: SmartSuggestion[] = [
        {
          id: 'action-1',
          type: 'action_suggestion',
          content: 'Upload file for code review',
          confidence: 0.95,
          reason: 'User mentioned file review',
          category: 'file_action',
          action: 'file_upload',
        },
        {
          id: 'action-2',
          type: 'action_suggestion',
          content: 'Share code snippet instead',
          confidence: 0.8,
          reason: 'Alternative to file upload',
          category: 'code_sharing',
          action: 'paste_code',
        },
      ]

      vi.mocked(result.current['suggestionService'].generateActionSuggestions).mockResolvedValue(actionSuggestions)

      await act(async () => {
        await result.current.generateActionSuggestions(messages)
      })

      expect(result.current.actionSuggestions).toHaveLength(2)
      expect(result.current.actionSuggestions[0]).toEqual(expect.objectContaining({
        action: 'file_upload',
        category: 'file_action',
      }))
    })

    it('should suggest workflow improvements based on patterns', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-workflow'), {
        wrapper: MockWrapper,
      })

      const workflowPattern = {
        frequentTasks: ['debugging', 'code_review'],
        timeSpent: { debugging: 60, code_review: 30 },
        successRate: { debugging: 0.7, code_review: 0.9 },
      }

      await act(async () => {
        result.current.setWorkflowPattern(workflowPattern)
        result.current.generateWorkflowSuggestions()
      })

      const workflowSuggestions = result.current.workflowSuggestions
      expect(workflowSuggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'workflow_improvement',
          category: expect.any(String),
          expectedBenefit: expect.any(String),
        }),
      ]))
    })
  })

  describe('follow-up suggestions', () => {
    it('should generate follow-up questions for incomplete information', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-followup'), {
        wrapper: MockWrapper,
      })

      const lastMessage: Message = {
        id: '1',
        content: 'My component is not working',
        role: 'user',
        timestamp: new Date(),
      }

      const followUpSuggestions: SmartSuggestion[] = [
        {
          id: 'followup-1',
          type: 'follow_up',
          content: 'What error message do you see?',
          confidence: 0.9,
          reason: 'Need debugging information',
          category: 'clarification',
        },
        {
          id: 'followup-2',
          type: 'follow_up',
          content: 'Can you share the component code?',
          confidence: 0.85,
          reason: 'Need code context',
          category: 'code_request',
        },
      ]

      vi.mocked(result.current['suggestionService'].generateFollowUpSuggestions).mockResolvedValue(followUpSuggestions)

      await act(async () => {
        await result.current.generateFollowUpSuggestions(lastMessage)
      })

      expect(result.current.followUpSuggestions).toHaveLength(2)
      expect(result.current.followUpSuggestions[0].category).toBe('clarification')
    })

    it('should adapt follow-up complexity based on user expertise', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-adaptive'), {
        wrapper: MockWrapper,
      })

      const beginnerContext: ConversationContext = {
        id: 'conv-beginner',
        topics: ['React basics'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'confused',
        lastAnalyzed: new Date(),
      }

      const expertContext: ConversationContext = {
        id: 'conv-expert',
        topics: ['React performance'],
        expertiseLevel: 'expert',
        complexityLevel: 'high',
        userIntent: 'optimization',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      await act(async () => {
        result.current.setConversationContext(beginnerContext)
        result.current.generateAdaptiveSuggestions()
      })

      const beginnerSuggestions = result.current.adaptiveSuggestions

      await act(async () => {
        result.current.setConversationContext(expertContext)
        result.current.generateAdaptiveSuggestions()
      })

      const expertSuggestions = result.current.adaptiveSuggestions

      expect(beginnerSuggestions[0].complexity).toBe('simple')
      expect(expertSuggestions[0].complexity).toBe('advanced')
    })
  })

  describe('suggestion feedback and learning', () => {
    it('should track suggestion usage and effectiveness', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-feedback'), {
        wrapper: MockWrapper,
      })

      const suggestion: SmartSuggestion = {
        id: 'suggestion-track',
        type: 'quick_reply',
        content: 'Show me examples',
        confidence: 0.8,
        reason: 'User requested examples',
        category: 'example_request',
      }

      await act(async () => {
        await result.current.trackSuggestionUsage(suggestion.id, {
          used: true,
          helpful: true,
          followUpAction: 'requested_more_examples',
          timestamp: new Date(),
        })
      })

      expect(result.current.suggestionMetrics).toEqual(expect.objectContaining({
        totalSuggestions: expect.any(Number),
        usageRate: expect.any(Number),
        helpfulnessScore: expect.any(Number),
      }))
    })

    it('should learn from feedback to improve future suggestions', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-learning'), {
        wrapper: MockWrapper,
      })

      const feedbackHistory = [
        { suggestionType: 'code_example', rating: 5, used: true },
        { suggestionType: 'code_example', rating: 5, used: true },
        { suggestionType: 'theoretical_explanation', rating: 2, used: false },
        { suggestionType: 'theoretical_explanation', rating: 1, used: false },
      ]

      await act(async () => {
        result.current.processFeedbackHistory(feedbackHistory)
      })

      const learningInsights = result.current.getLearningInsights()
      expect(learningInsights).toEqual(expect.objectContaining({
        preferredSuggestionTypes: expect.arrayContaining(['code_example']),
        avoidedSuggestionTypes: expect.arrayContaining(['theoretical_explanation']),
        confidenceAdjustments: expect.any(Object),
      }))
    })

    it('should provide feedback-based recommendation improvements', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-improvements'), {
        wrapper: MockWrapper,
      })

      const currentSuggestions: SmartSuggestion[] = [
        {
          id: 'suggestion-1',
          type: 'quick_reply',
          content: 'Here\'s a theoretical explanation',
          confidence: 0.7,
          reason: 'Educational content',
          category: 'theory',
        },
      ]

      const userPreferences = {
        prefersCodeExamples: true,
        prefersShortAnswers: true,
        avoidedCategories: ['theory'],
      }

      await act(async () => {
        result.current.setUserPreferences(userPreferences)
        const improvedSuggestions = result.current.improveSuggestions(currentSuggestions)
        result.current.setImprovedSuggestions(improvedSuggestions)
      })

      const improved = result.current.improvedSuggestions
      expect(improved[0]).toEqual(expect.objectContaining({
        category: 'code_example',
        adaptationReason: 'user_feedback_driven',
      }))
    })
  })

  describe('performance and caching', () => {
    it('should cache suggestions to improve performance', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-cache'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'React component help',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      // First generation
      await act(async () => {
        await result.current.generateSuggestions(messages)
      })

      const firstGenerationTime = result.current.lastGenerationTime

      // Second generation with same messages should use cache
      await act(async () => {
        await result.current.generateSuggestions(messages)
      })

      const secondGenerationTime = result.current.lastGenerationTime

      expect(result.current.wasCacheUsed).toBe(true)
      expect(secondGenerationTime - firstGenerationTime).toBeLessThan(50)
    })

    it('should batch multiple suggestion requests efficiently', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-batch'), {
        wrapper: MockWrapper,
      })

      const batchRequests = [
        { type: 'quick_reply', priority: 'high' },
        { type: 'action_suggestion', priority: 'medium' },
        { type: 'follow_up', priority: 'low' },
      ]

      await act(async () => {
        await result.current.batchGenerateSuggestions(batchRequests)
      })

      expect(result.current.allSuggestions).toEqual(expect.objectContaining({
        quickReplies: expect.any(Array),
        actionSuggestions: expect.any(Array),
        followUpSuggestions: expect.any(Array),
      }))
    })

    it('should invalidate cache when context changes significantly', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-invalidate'), {
        wrapper: MockWrapper,
      })

      const initialContext: ConversationContext = {
        id: 'conv-invalidate',
        topics: ['HTML'],
        expertiseLevel: 'beginner',
        complexityLevel: 'low',
        userIntent: 'learning',
        sentiment: 'curious',
        lastAnalyzed: new Date(),
      }

      const changedContext: ConversationContext = {
        id: 'conv-invalidate',
        topics: ['React', 'advanced patterns'],
        expertiseLevel: 'expert',
        complexityLevel: 'high',
        userIntent: 'implementation',
        sentiment: 'focused',
        lastAnalyzed: new Date(),
      }

      await act(async () => {
        result.current.setConversationContext(initialContext)
        result.current.setConversationContext(changedContext)
      })

      expect(result.current.cacheInvalidated).toBe(true)
    })
  })

  describe('error handling and fallbacks', () => {
    it('should provide fallback suggestions when service fails', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-error'), {
        wrapper: MockWrapper,
      })

      const messages: Message[] = [
        {
          id: '1',
          content: 'Help with React',
          role: 'user',
          timestamp: new Date(),
        },
      ]

      vi.mocked(result.current['suggestionService'].generateQuickReplies).mockRejectedValue(
        new Error('Suggestion service unavailable')
      )

      await act(async () => {
        await result.current.generateSuggestions(messages)
      })

      expect(result.current.quickReplies).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'quick_reply',
          isFallback: true,
          content: expect.any(String),
        }),
      ]))
      expect(result.current.hasError).toBe(true)
    })

    it('should handle empty message context gracefully', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-empty'), {
        wrapper: MockWrapper,
      })

      const emptyMessages: Message[] = []

      await act(async () => {
        await result.current.generateSuggestions(emptyMessages)
      })

      expect(result.current.quickReplies).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'greeting',
          type: 'quick_reply',
        }),
      ]))
    })

    it('should validate suggestions before returning them', async () => {
      const { result } = renderHook(() => useSmartSuggestions('conv-validate'), {
        wrapper: MockWrapper,
      })

      const invalidSuggestions: SmartSuggestion[] = [
        {
          id: '',
          type: 'quick_reply',
          content: '',
          confidence: -1,
          reason: '',
          category: '',
        } as SmartSuggestion,
      ]

      await act(async () => {
        result.current.setRawSuggestions(invalidSuggestions)
        result.current.validateAndFilterSuggestions()
      })

      expect(result.current.quickReplies).toHaveLength(0)
      expect(result.current.validationErrors).toEqual(expect.arrayContaining([
        'Invalid suggestion data detected',
      ]))
    })
  })
})