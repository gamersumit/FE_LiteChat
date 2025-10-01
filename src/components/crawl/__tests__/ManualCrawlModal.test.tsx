import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualCrawlModal from '../ManualCrawlModal';
import * as useCrawlHook from '../../../hooks/useCrawl';

// Mock the useCrawl hook
jest.mock('../../../hooks/useCrawl');
const mockUseCrawl = useCrawlHook.useCrawl as jest.MockedFunction<typeof useCrawlHook.useCrawl>;

const mockWebsite = {
  id: 'website-123',
  name: 'Test Website',
  domain: 'test.com',
  url: 'https://test.com',
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

describe('ManualCrawlModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCrawl.mockReturnValue(defaultUseCrawlReturn);
  });

  it('should not render when closed', () => {
    render(
      <ManualCrawlModal
        isOpen={false}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.queryByText('Manual Crawl')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.getByText('Manual Crawl')).toBeInTheDocument();
    expect(screen.getByText('Test Website')).toBeInTheDocument();
    expect(screen.getByText('Domain: test.com')).toBeInTheDocument();
    expect(screen.getByText('URL: https://test.com')).toBeInTheDocument();
  });

  it('should display warning information', () => {
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.getByText('Before starting the crawl:')).toBeInTheDocument();
    expect(screen.getByText(/This will crawl your website content for the chatbot/)).toBeInTheDocument();
    expect(screen.getByText(/Existing content will be updated with new information/)).toBeInTheDocument();
  });

  it('should close when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={onClose}
        website={mockWebsite}
      />
    );

    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should close when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={onClose}
        website={mockWebsite}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should start crawl with default options', async () => {
    const mockTriggerCrawl = jest.fn().mockResolvedValue({
      success: true,
      data: { task_id: 'task-123' },
    });
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      triggerCrawl: mockTriggerCrawl,
    });

    const onCrawlStarted = jest.fn();
    const onClose = jest.fn();

    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={onClose}
        website={mockWebsite}
        onCrawlStarted={onCrawlStarted}
      />
    );

    fireEvent.click(screen.getByText('Start Crawl'));

    await waitFor(() => {
      expect(mockTriggerCrawl).toHaveBeenCalledWith('website-123', {
        maxPages: 100,
        maxDepth: 3,
      });
    });

    expect(onCrawlStarted).toHaveBeenCalledWith('task-123');
    expect(onClose).toHaveBeenCalled();
  });

  it('should show advanced options when toggled', async () => {
    const user = userEvent.setup();
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Advanced options should not be visible initially
    expect(screen.queryByLabelText('Maximum Pages')).not.toBeInTheDocument();

    // Click to show advanced options
    await user.click(screen.getByText('Advanced Options'));

    // Advanced options should now be visible
    expect(screen.getByLabelText('Maximum Pages')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Depth')).toBeInTheDocument();
  });

  it('should use custom advanced options', async () => {
    const user = userEvent.setup();
    const mockTriggerCrawl = jest.fn().mockResolvedValue({
      success: true,
      data: { task_id: 'task-123' },
    });
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      triggerCrawl: mockTriggerCrawl,
    });

    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Show advanced options
    await user.click(screen.getByText('Advanced Options'));

    // Change max pages
    const maxPagesInput = screen.getByLabelText('Maximum Pages');
    await user.clear(maxPagesInput);
    await user.type(maxPagesInput, '50');

    // Change max depth
    const maxDepthInput = screen.getByLabelText('Maximum Depth');
    await user.clear(maxDepthInput);
    await user.type(maxDepthInput, '2');

    // Start crawl
    await user.click(screen.getByText('Start Crawl'));

    await waitFor(() => {
      expect(mockTriggerCrawl).toHaveBeenCalledWith('website-123', {
        maxPages: 50,
        maxDepth: 2,
      });
    });
  });

  it('should show estimated duration in advanced options', async () => {
    const user = userEvent.setup();
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Show advanced options
    await user.click(screen.getByText('Advanced Options'));

    // Should show estimated duration
    expect(screen.getByText(/Estimated Duration:/)).toBeInTheDocument();
    expect(screen.getByText(/Approximately .+ minutes for 100 pages/)).toBeInTheDocument();
  });

  it('should disable buttons when loading', () => {
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      isLoading: true,
    });

    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    expect(screen.getByText('Starting Crawl...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('should handle crawl start error gracefully', async () => {
    const mockTriggerCrawl = jest.fn().mockResolvedValue({
      success: false,
      error: 'No healthy workers available',
    });
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      triggerCrawl: mockTriggerCrawl,
      error: 'No healthy workers available',
    });

    const onCrawlStarted = jest.fn();
    const onClose = jest.fn();

    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={onClose}
        website={mockWebsite}
        onCrawlStarted={onCrawlStarted}
      />
    );

    fireEvent.click(screen.getByText('Start Crawl'));

    await waitFor(() => {
      expect(mockTriggerCrawl).toHaveBeenCalled();
    });

    // Should not call success callbacks when crawl fails
    expect(onCrawlStarted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should validate input ranges', async () => {
    const user = userEvent.setup();
    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Show advanced options
    await user.click(screen.getByText('Advanced Options'));

    const maxPagesInput = screen.getByLabelText('Maximum Pages');
    const maxDepthInput = screen.getByLabelText('Maximum Depth');

    // Check input constraints
    expect(maxPagesInput).toHaveAttribute('min', '1');
    expect(maxPagesInput).toHaveAttribute('max', '1000');
    expect(maxDepthInput).toHaveAttribute('min', '1');
    expect(maxDepthInput).toHaveAttribute('max', '10');
  });

  it('should handle invalid input values gracefully', async () => {
    const user = userEvent.setup();
    const mockTriggerCrawl = jest.fn().mockResolvedValue({
      success: true,
      data: { task_id: 'task-123' },
    });
    mockUseCrawl.mockReturnValue({
      ...defaultUseCrawlReturn,
      triggerCrawl: mockTriggerCrawl,
    });

    render(
      <ManualCrawlModal
        isOpen={true}
        onClose={jest.fn()}
        website={mockWebsite}
      />
    );

    // Show advanced options
    await user.click(screen.getByText('Advanced Options'));

    // Enter invalid value
    const maxPagesInput = screen.getByLabelText('Maximum Pages');
    await user.clear(maxPagesInput);
    await user.type(maxPagesInput, 'invalid');

    // Start crawl
    await user.click(screen.getByText('Start Crawl'));

    await waitFor(() => {
      // Should fallback to default value (100) when invalid input is provided
      expect(mockTriggerCrawl).toHaveBeenCalledWith('website-123', {
        maxPages: 100, // Default fallback
        maxDepth: 3,
      });
    });
  });
});