import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import OfflineSchedulePlanner from './OfflineSchedulePlanner';
import type { OfflineSchedulePlannerItem } from './OfflineSchedulePlanner';

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderOfflineSchedulePlanner = (
  initialSchedules: OfflineSchedulePlannerItem[] = [
    {
      date: '2026-06-01',
      endTime: '',
      location: '',
      notes: '',
      startTime: '',
    },
  ],
) => {
  const queryClient = createTestQueryClient();

  const PlannerHarness = () => {
    const [schedules, setSchedules] = useState<OfflineSchedulePlannerItem[]>(initialSchedules);

    return (
      <OfflineSchedulePlanner
        maxDate='2026-06-30'
        minDate='2026-06-01'
        onSchedulesChange={setSchedules}
        schedules={schedules}
      />
    );
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <PlannerHarness />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
});

describe('OfflineSchedulePlanner', () => {
  it('keeps the selected start time while the end time is still empty', async () => {
    renderOfflineSchedulePlanner();

    const startTimeSelect = screen.getByLabelText('시작 시간');
    const endTimeSelect = screen.getByLabelText('종료 시간');

    await waitFor(() => {
      expect(startTimeSelect).toBeEnabled();
    });

    fireEvent.change(startTimeSelect, { target: { value: '09:00' } });

    await waitFor(() => {
      expect(startTimeSelect).toHaveValue('09:00');
      expect(endTimeSelect).toBeEnabled();
    });
  });

  it('normalizes persisted time values that include seconds', async () => {
    renderOfflineSchedulePlanner([
      {
        date: '2026-06-01',
        endTime: '11:00:00',
        location: '',
        notes: '',
        startTime: '09:00:00',
      },
    ]);

    const startTimeSelect = screen.getByLabelText('시작 시간');
    const endTimeSelect = screen.getByLabelText('종료 시간');

    await waitFor(() => {
      expect(startTimeSelect).toHaveValue('09:00');
      expect(endTimeSelect).toHaveValue('11:00');
    });
  });
});
