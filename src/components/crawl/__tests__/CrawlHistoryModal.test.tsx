import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrawlHistoryModal from '../CrawlHistoryModal';
import * as useCrawlHook from '../../../hooks/useCrawl';

// Mock the useCrawl hook
jest.mock('../../../hooks/useCrawl');
const mockUseCrawl = useCrawlHook.useCrawl as jest.MockedFunction<typeof useCrawlHook.useCrawl>;

const mockWebsite = {
  id: 'website-123',
  name: 'Test Website',
  domain: 'test.com',
};

const mockHistoryData = {
  history: [
    {
      crawl_id: 'crawl_123',
      started_at: '2025-09-17T08:00:00Z',
      completed_at: '2025-09-17T08:15:00Z',
      status: 'success' as const,
      pages_crawled: 45,
      trigger_type: 'manual' as const,
      error_message: undefined,
    },
    {
      crawl_id: 'crawl_122',
      started_at: '2025-09-16T08:00:00Z',
      completed_at: '2025-09-16T08:20:00Z',
      status: 'failed' as const,
      pages_crawled: 12,
      trigger_type: 'scheduled' as const,
      error_message: 'Connection timeout',
    },
  ],
  total: 25,
  has_more: true,
};

const defaultUseCrawlReturn = {
  triggerCrawl: jest.fn(),
  getCrawlStatus: jest.fn(),
  cancelCrawl: jest.fn(),
  getWebsiteStatus: jest.fn(),
  getCrawlHistory: jest.fn(),
  isLoading: false,
  error: null,
};

describe('CrawlHistoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: jest.fn().mockResolvedValue({
        success: true,
        data: mockHistoryData,
      }),
    });
  });

  it('should not render when closed', () => {
    render(
      <CrawlHistoryModal
        isOpen={false}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.queryByText('Crawl History')).not.toBeInTheDocument();
  });

  it('should render when open and load history', async () => {
    const mockGetCrawlHistory = jest.fn().mockResolvedValue({
      success: true,
      data: mockHistoryData,
    });

    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: mockGetCrawlHistory,
    });

    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.getByText('Crawl History')).toBeInTheDocument();
    expect(screen.getByText('Test Website • 25 total crawls')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetCrawlHistory).toHaveBeenCalledWith('website-123', 10, 0);
    });
  });

  it('should display history entries correctly', async () => {
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('manual')).toBeInTheDocument();
      expect(screen.getByText('scheduled')).toBeInTheDocument();
      expect(screen.getByText('45 pages')).toBeInTheDocument();
      expect(screen.getByText('12 pages')).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={onClose}
        website={mockWebsite}
      />
    );

    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should filter history by status', async () => {
    const user = userEvent.setup();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    // Filter to show only success
    await user.selectOptions(screen.getByDisplayValue('All Status'), 'success');

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('should expand and collapse history entries', async () => {
    const user = userEvent.setup();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Details')).toHaveLength(2);
    });

    // Click to expand first entry
    await user.click(screen.getAllByText('Details')[0]);

    expect(screen.getByText('Crawl ID:')).toBeInTheDocument();
    expect(screen.getByText('crawl_123')).toBeInTheDocument();
    expect(screen.getByText('Started:')).toBeInTheDocument();
  });

  it('should show error details for failed crawls', async () => {
    const user = userEvent.setup();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Details')).toHaveLength(2);
    });

    // Expand the failed entry (second one)
    await user.click(screen.getAllByText('Details')[1]);

    expect(screen.getByText('Error Details:')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('should load more history entries', async () => {
    const mockGetCrawlHistory = jest.fn()
      .mockResolvedValueOnce({
        success: true,
        data: mockHistoryData,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          history: [{
            crawl_id: 'crawl_121',
            started_at: '2025-09-15T08:00:00Z',
            completed_at: '2025-09-15T08:10:00Z',
            status: 'success' as const,
            pages_crawled: 30,
            trigger_type: 'manual' as const,
          }],
          total: 25,
          has_more: false,
        },
      });

    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: mockGetCrawlHistory,
    });

    const user = userEvent.setup();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Load More'));

    await waitFor(() => {
      expect(mockGetCrawlHistory).toHaveBeenCalledTimes(2);
      expect(mockGetCrawlHistory).toHaveBeenLastCalledWith('website-123', 10, 10);
    });
  });

  it('should refresh history when refresh button is clicked', async () => {
    const mockGetCrawlHistory = jest.fn().mockResolvedValue({
      success: true,
      data: mockHistoryData,
    });

    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: mockGetCrawlHistory,
    });

    const user = userEvent.setup();
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(mockGetCrawlHistory).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByTitle('Refresh history'));

    await waitFor(() => {
      expect(mockGetCrawlHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('should show loading state', () => {
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      isLoading: true,
      getCrawlHistory: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    });

    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.getByText('Loading crawl history...')).toBeInTheDocument();
  });

  it('should show empty state when no history', async () => {
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: jest.fn().mockResolvedValue({
        success: true,
        data: { history: [], total: 0, has_more: false },
      }),
    });

    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No crawl history')).toBeInTheDocument();
      expect(screen.getByText('No crawls have been performed yet for this website.')).toBeInTheDocument();
    });
  });

  it('should format dates and durations correctly', async () => {
    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    await waitFor(() => {
      // The exact format depends on locale, but should contain date/time info
      expect(screen.getByText(/9\/17\/2025|17\/09\/2025|2025-09-17/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      getCrawlHistory: jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to fetch history',
      }),
    });

    render(
      <CrawlHistoryModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Should handle error gracefully and show empty state
    await waitFor(() => {
      expect(screen.getByText('No crawl history')).toBeInTheDocument();
    });
  });
});