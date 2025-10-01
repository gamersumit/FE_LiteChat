import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { usePersonalization } from '../usePersonalization'
import { PersonalizationProvider } from '../../components/personalization/PersonalizationProvider'
import type { UserPreferences, UserInteraction } from '../../types/api'

// Mock the personalization service
vi.mock('../../services/personalizationService', () => ({
  PersonalizationService: {
    trackInteraction: vi.fn(),
    updatePreferences: vi.fn(),
    getPersonalizedSuggestions: vi.fn(),
    analyzeUserBehavior: vi.fn(),
    predictPreferences: vi.fn(),
  },
}))

// Mock wrapper component
const MockPersonalizationProvider = ({ children }: { children: React.ReactNode }) => (
  <PersonalizationProvider userId="test-user">
    {children}
  </PersonalizationProvider>
)

describe('usePersonalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('user preference learning', () => {
    it('should track user interactions and update preferences', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      const interaction: UserInteraction = {
        type: 'message_sent',
        timestamp: new Date(),
        data: {
          messageLength: 50,
          containsEmoji: true,
          responseTime: 2000,
        },
      }

      await act(async () => {
        await result.current.trackInteraction(interaction)
      })

      expect(result.current.interactions).toContain(interaction)
    })

    it('should learn from user behavior patterns', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // Simulate multiple interactions
      const interactions: UserInteraction[] = [
        {
          type: 'theme_change',
          timestamp: new Date(),
          data: { theme: 'dark', reason: 'user_preference' },
        },
        {
          type: 'font_size_change',
          timestamp: new Date(),
          data: { fontSize: 'large', reason: 'accessibility' },
        },
        {
          type: 'message_reaction',
          timestamp: new Date(),
          data: { emoji: '👍', frequency: 'high' },
        },
      ]

      await act(async () => {
        for (const interaction of interactions) {
          await result.current.trackInteraction(interaction)
        }
        await result.current.analyzeAndUpdatePreferences()
      })

      expect(result.current.learnedPreferences).toBeDefined()
      expect(result.current.learnedPreferences.preferredTheme).toBe('dark')
      expect(result.current.learnedPreferences.preferredFontSize).toBe('large')
    })

    it('should predict user preferences based on usage patterns', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // Simulate user behavior indicating preference for quick responses
      const quickResponseInteractions = Array(5).fill(null).map((_, i) => ({
        type: 'quick_reply_used' as const,
        timestamp: new Date(Date.now() - i * 1000),
        data: { responseTime: Math.random() * 1000 + 500 },
      }))

      await act(async () => {
        for (const interaction of quickResponseInteractions) {
          await result.current.trackInteraction(interaction)
        }
      })

      const predictions = await act(async () => {
        return result.current.predictUserPreferences()
      })

      expect(predictions).toEqual(
        expect.objectContaining({
          prefersQuickReplies: true,
          suggestedResponseTime: expect.any(Number),
        })
      )
    })

    it('should adapt to changing user preferences over time', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // Initial preference: light theme
      await act(async () => {
        await result.current.trackInteraction({
          type: 'theme_change',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          data: { theme: 'light', reason: 'user_preference' },
        })
      })

      expect(result.current.learnedPreferences.preferredTheme).toBe('light')

      // Recent preference: dark theme (should override)
      await act(async () => {
        await result.current.trackInteraction({
          type: 'theme_change',
          timestamp: new Date(),
          data: { theme: 'dark', reason: 'user_preference' },
        })
        await result.current.analyzeAndUpdatePreferences()
      })

      expect(result.current.learnedPreferences.preferredTheme).toBe('dark')
    })
  })

  describe('adaptive interface functionality', () => {
    it('should provide adaptive interface suggestions based on user behavior', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // Simulate user struggling with small font
      const smallFontInteractions = [
        {
          type: 'zoom_action',
          timestamp: new Date(),
          data: { action: 'zoom_in', frequency: 3 },
        },
        {
          type: 'scroll_behavior',
          timestamp: new Date(),
          data: { scrollSpeed: 'slow', pattern: 'careful_reading' },
        },
      ]

      await act(async () => {
        for (const interaction of smallFontInteractions) {
          await result.current.trackInteraction(interaction)
        }
      })

      const adaptiveSuggestions = await act(async () => {
        return result.current.getAdaptiveInterfaceSuggestions()
      })

      expect(adaptiveSuggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'font_size',
            suggestion: 'increase',
            reason: 'user_accessibility_behavior',
            confidence: expect.any(Number),
          }),
        ])
      )
    })

    it('should adapt UI components based on usage patterns', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // User frequently uses file upload
      const fileUploadInteractions = Array(10).fill(null).map((_, i) => ({
        type: 'feature_usage' as const,
        timestamp: new Date(Date.now() - i * 3600000), // Hourly usage
        data: { feature: 'file_upload', success: true },
      }))

      await act(async () => {
        for (const interaction of fileUploadInteractions) {
          await result.current.trackInteraction(interaction)
        }
      })

      const adaptiveLayout = await act(async () => {
        return result.current.getAdaptiveLayoutConfig()
      })

      expect(adaptiveLayout.featuredComponents).toContain('file_upload')
      expect(adaptiveLayout.quickAccessFeatures).toContain('file_upload')
    })

    it('should personalize component positioning based on user interactions', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // User consistently clicks on specific areas
      const clickPatterns = [
        {
          type: 'ui_interaction',
          timestamp: new Date(),
          data: { 
            element: 'chat_button',
            position: 'bottom-right',
            clickTime: 500,
            successful: true,
          },
        },
        {
          type: 'ui_interaction',
          timestamp: new Date(),
          data: {
            element: 'file_upload_button',
            position: 'input_area',
            clickTime: 300,
            successful: true,
          },
        },
      ]

      await act(async () => {
        for (const interaction of clickPatterns) {
          await result.current.trackInteraction(interaction)
        }
      })

      const personalizedLayout = await act(async () => {
        return result.current.getPersonalizedUILayout()
      })

      expect(personalizedLayout.chatButtonPosition).toBe('bottom-right')
      expect(personalizedLayout.priorityFeatures).toContain('file_upload')
    })

    it('should provide accessibility adaptations based on user needs', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      // Simulate accessibility-indicating behavior
      const accessibilityInteractions = [
        {
          type: 'keyboard_navigation',
          timestamp: new Date(),
          data: { usesTabNavigation: true, frequency: 'high' },
        },
        {
          type: 'screen_reader_usage',
          timestamp: new Date(),
          data: { detected: true, ariaUsage: 'extensive' },
        },
      ]

      await act(async () => {
        for (const interaction of accessibilityInteractions) {
          await result.current.trackInteraction(interaction)
        }
      })

      const accessibilityAdaptations = await act(async () => {
        return result.current.getAccessibilityAdaptations()
      })

      expect(accessibilityAdaptations).toEqual(
        expect.objectContaining({
          enabledFeatures: expect.arrayContaining(['keyboard_navigation', 'screen_reader_support']),
          focusManagement: 'enhanced',
          ariaLabels: 'verbose',
        })
      )
    })
  })

  describe('privacy compliance', () => {
    it('should respect user privacy settings for data collection', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      await act(async () => {
        result.current.updatePrivacySettings({
          dataCollection: false,
          analytics: false,
          personalization: true, // Only personalization allowed
        })
      })

      await act(async () => {
        await result.current.trackInteraction({
          type: 'message_sent',
          timestamp: new Date(),
          data: { content: 'sensitive data' },
        })
      })

      // Should not store sensitive data when data collection is disabled
      expect(result.current.interactions).toHaveLength(0)
      expect(result.current.privacySettings.dataCollection).toBe(false)
    })

    it('should anonymize user data when required', async () => {
      const { result } = renderHook(() => usePersonalization(), {
        wrapper: MockPersonalizationProvider,
      })

      await act(async () => {
        result.current.updatePrivacySettings({
          dataCollection: true,
          anonymizeData: true,
        })
      })

      await act(async () => {
        await result.current.trackInteraction({
          type: 'message_sent',
          timestamp: new Date(),
          data: { content: 'Hello world', userId: 'real-user-id' },
        })
      })

      const storedInteractions = result.current.getAnonymizedInteractions()
      expect(storedInteractions[0].data.userId).toMatch(/^anon-/)
      expect(storedInteractions[0].data.content).toBeUndefined()
    })
  })
})