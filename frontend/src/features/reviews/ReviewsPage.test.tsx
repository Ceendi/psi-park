import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/shared/ui';
import { ReviewsPage } from './ReviewsPage';
import type { MyReview } from './api';

const eligibleData = [
  {
    id: 11,
    garden: { id: 3, title: 'Łąka z agility', city: 'Kraków', price_per_hour: '38.00', cover_image: null },
    start_time: '2026-05-11T10:00:00+02:00',
    end_time: '2026-05-11T13:00:00+02:00',
  },
];

const myReviews: MyReview[] = [
  {
    review: { id: 5, garden: 3, reservation: 11, author: { id: 9, full_name: 'Kasia' }, rating: 5, comment: 'Super!', created_at: '2026-05-12T10:00:00+02:00', updated_at: '2026-05-12T10:00:00+02:00' },
    garden: { id: 3, title: 'Spokojny ogród', city: 'Kraków', price_per_hour: '34.00', cover_image: null },
  },
];

const useEligibleReviews = vi.fn();
const useMyReviews = vi.fn();
const mockDelete = vi.fn();

vi.mock('./api', () => ({
  useEligibleReviews: () => useEligibleReviews(),
  useMyReviews: () => useMyReviews(),
  useDeleteReview: () => ({ mutateAsync: mockDelete, isPending: false }),
  useSubmitReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage() {
  render(
    <ToastProvider>
      <ReviewsPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  useEligibleReviews.mockReturnValue({ data: eligibleData, isLoading: false, isError: false });
  useMyReviews.mockReturnValue({ data: myReviews, isLoading: false, isError: false });
});

describe('ReviewsPage', () => {
  it('lists stays awaiting a review with a CTA', () => {
    renderPage();
    expect(screen.getByText('Łąka z agility')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wystaw recenzję/ })).toBeInTheDocument();
  });

  it('switches to the written tab and shows my reviews with edit/delete', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Wystawione/ }));
    expect(screen.getByText('Spokojny ogród')).toBeInTheDocument();
    expect(screen.getByText('Super!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edytuj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usuń/ })).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing to review', () => {
    useEligibleReviews.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderPage();
    expect(screen.getByText('Wszystko ocenione')).toBeInTheDocument();
  });
});
