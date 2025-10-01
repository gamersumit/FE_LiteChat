import '@testing-library/jest-dom'

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock navigator
Object.defineProperty(navigator, 'language', {
  writable: true,
  value: 'en-US',
})

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

// Mock Intl.DateTimeFormat
Object.defineProperty(Intl, 'DateTimeFormat', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: 'UTC' }),
    format: (date: Date) => date.toISOString(),
  })),
})

// Mock DeviceAmbientLightEvent (not widely supported)
global.DeviceAmbientLightEvent = class DeviceAmbientLightEvent extends Event {
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict)
  }
}

// Mock crypto for nanoid
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockImplementation((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
})