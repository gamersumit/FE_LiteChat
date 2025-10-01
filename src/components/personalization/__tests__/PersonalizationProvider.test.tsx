import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PersonalizationProvider, usePersonalizationContext } from '../PersonalizationProvider'
import type { UserPreferences } from '../../../types/api'

// Mock child component to test context
const TestComponent = () => {
  const {
    userPreferences,
    updatePreferences,
    learnedPreferences,
    isLearning,
    adaptiveSettings,
  } = usePersonalizationContext()

  return (
    <div>
      <div data-testid="current-theme">{userPreferences?.theme}</div>
      <div data-testid="learned-theme">{learnedPreferences?.preferredTheme}</div>
      <div data-testid="is-learning">{isLearning ? 'learning' : 'not-learning'}</div>
      <div data-testid="font-size">{adaptiveSettings?.fontSize}</div>
      <button
        onClick={() => updatePreferences({ theme: 'dark' })}
        data-testid="update-theme"
      >
        Update Theme
      </button>
    </div>
  )
}

describe('PersonalizationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('context provider functionality', () => {
    it('should provide initial user preferences', () => {
      const initialPreferences: UserPreferences = {
        user_id: 'test-user',
        theme: 'light',
        language: 'en',
        notifications: true,
        accessibility_mode: false,
        font_size: 'medium',
        high_contrast: false,
        reduced_motion: false,
        conversation_style: 'casual',
        custom_settings: {},
      }

      render(
        <PersonalizationProvider 
          userId="test-user" 
          initialPreferences={initialPreferences}
        >
          <TestComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      expect(screen.getByTestId('font-size')).toHaveTextContent('medium')
    })

    it('should update user preferences when requested', async () => {
      const user = userEvent.setup()

      render(
        <PersonalizationProvider userId="test-user">
          <TestComponent />
        </PersonalizationProvider>
      )

      await user.click(screen.getByTestId('update-theme'))

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })

    it('should start learning mode when user interactions begin', async () => {
      render(
        <PersonalizationProvider userId="test-user" enableLearning={true}>
          <TestComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('is-learning')).toHaveTextContent('learning')
    })

    it('should provide learned preferences after analysis', async () => {
      const mockLearnedPreferences = {
        preferredTheme: 'dark',
        preferredFontSize: 'large',
        preferredLanguage: 'en',
        communicationStyle: 'formal',
        frequentlyUsedFeatures: ['file_upload', 'reactions'],
      }

      // Mock the learning analysis
      const MockProviderWithLearning = ({ children }: { children: React.ReactNode }) => {
        const [learnedPrefs, setLearnedPrefs] = React.useState(null)

        React.useEffect(() => {
          // Simulate learning completion
          setTimeout(() => {
            setLearnedPrefs(mockLearnedPreferences)
          }, 100)
        }, [])

        return (
          <PersonalizationProvider 
            userId="test-user"
            enableLearning={true}
            mockLearnedPreferences={learnedPrefs}
          >
            {children}
          </PersonalizationProvider>
        )
      }

      render(
        <MockProviderWithLearning>
          <TestComponent />
        </MockProviderWithLearning>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      expect(screen.getByTestId('learned-theme')).toHaveTextContent('dark')
    })

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('usePersonalizationContext must be used within PersonalizationProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('adaptive settings', () => {
    it('should provide adaptive interface settings based on user behavior', () => {
      const adaptiveSettings = {
        fontSize: 'large',
        colorScheme: 'high-contrast',
        animationLevel: 'reduced',
        interactionMode: 'keyboard-friendly',
        layoutDensity: 'comfortable',
      }

      render(
        <PersonalizationProvider 
          userId="test-user" 
          initialAdaptiveSettings={adaptiveSettings}
        >
          <TestComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('large')
    })

    it('should update adaptive settings based on real-time user behavior', async () => {
      const TestAdaptiveComponent = () => {
        const { adaptiveSettings, updateAdaptiveSettings } = usePersonalizationContext()

        return (
          <div>
            <div data-testid="interaction-mode">{adaptiveSettings?.interactionMode}</div>
            <button
              onClick={() => updateAdaptiveSettings({ interactionMode: 'touch-friendly' })}
              data-testid="update-interaction"
            >
              Update Interaction
            </button>
          </div>
        )
      }

      const user = userEvent.setup()

      render(
        <PersonalizationProvider userId="test-user">
          <TestAdaptiveComponent />
        </PersonalizationProvider>
      )

      await user.click(screen.getByTestId('update-interaction'))

      expect(screen.getByTestId('interaction-mode')).toHaveTextContent('touch-friendly')
    })
  })

  describe('privacy and data handling', () => {
    it('should respect privacy settings for data collection', () => {
      const privacySettings = {
        dataCollection: false,
        analytics: false,
        personalization: true,
        anonymizeData: true,
      }

      const TestPrivacyComponent = () => {
        const { privacySettings: currentSettings } = usePersonalizationContext()

        return (
          <div>
            <div data-testid="data-collection">
              {currentSettings?.dataCollection ? 'enabled' : 'disabled'}
            </div>
            <div data-testid="anonymize-data">
              {currentSettings?.anonymizeData ? 'enabled' : 'disabled'}
            </div>
          </div>
        )
      }

      render(
        <PersonalizationProvider 
          userId="test-user" 
          privacySettings={privacySettings}
        >
          <TestPrivacyComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('data-collection')).toHaveTextContent('disabled')
      expect(screen.getByTestId('anonymize-data')).toHaveTextContent('enabled')
    })

    it('should provide anonymized user ID when privacy is enabled', () => {
      const TestAnonymousComponent = () => {
        const { anonymizedUserId } = usePersonalizationContext()

        return (
          <div data-testid="user-id">{anonymizedUserId}</div>
        )
      }

      render(
        <PersonalizationProvider 
          userId="real-user-123" 
          privacySettings={{ anonymizeData: true }}
        >
          <TestAnonymousComponent />
        </PersonalizationProvider>
      )

      const anonymizedId = screen.getByTestId('user-id').textContent
      expect(anonymizedId).toMatch(/^anon-/)
      expect(anonymizedId).not.toContain('real-user-123')
    })
  })

  describe('performance and optimization', () => {
    it('should memoize preferences to prevent unnecessary re-renders', () => {
      let renderCount = 0

      const TestMemoComponent = () => {
        renderCount++
        const { userPreferences } = usePersonalizationContext()

        return (
          <div data-testid="render-count">{renderCount}</div>
        )
      }

      const { rerender } = render(
        <PersonalizationProvider userId="test-user">
          <TestMemoComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('render-count')).toHaveTextContent('1')

      // Re-render with same props should not cause child re-render
      rerender(
        <PersonalizationProvider userId="test-user">
          <TestMemoComponent />
        </PersonalizationProvider>
      )

      expect(screen.getByTestId('render-count')).toHaveTextContent('1')
    })

    it('should debounce preference updates to avoid excessive API calls', async () => {
      const user = userEvent.setup()
      const mockUpdateAPI = vi.fn()

      const TestDebounceComponent = () => {
        const { updatePreferences } = usePersonalizationContext()

        return (
          <div>
            <button
              onClick={() => {
                updatePreferences({ theme: 'dark' })
                updatePreferences({ theme: 'light' })
                updatePreferences({ theme: 'auto' })
              }}
              data-testid="rapid-updates"
            >
              Rapid Updates
            </button>
          </div>
        )
      }

      render(
        <PersonalizationProvider 
          userId="test-user" 
          onPreferencesUpdate={mockUpdateAPI}
        >
          <TestDebounceComponent />
        </PersonalizationProvider>
      )

      await user.click(screen.getByTestId('rapid-updates'))

      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
      })

      // Should only call API once with final value
      expect(mockUpdateAPI).toHaveBeenCalledTimes(1)
      expect(mockUpdateAPI).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'auto' })
      )
    })
  })
})