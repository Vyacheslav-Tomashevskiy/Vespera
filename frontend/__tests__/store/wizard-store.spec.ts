import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWizardStore } from '@/store/wizard-store';
import axios from 'axios';

vi.mock('axios');

describe('Wizard Store', () => {
  beforeEach(() => {
    // Reset Zustand store state manually if needed
    // useWizardStore.setState({ draftId: null, data: {}, currentStep: 1, completedSteps: [] });
  });

  const mockDraft = {
    id: 'draft-id',
    currentStep: 1,
    completedSteps: [],
    data: { propertyType: 'apartment' },
  };

  it('should initialize draft from ID', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: mockDraft });

    await useWizardStore.getState().initDraft('draft-id');

    expect(useWizardStore.getState().draftId).toBe('draft-id');
    expect(useWizardStore.getState().data.propertyType).toBe('apartment');
    expect(useWizardStore.getState().isInitialized).toBe(true);
  });

  it('should start a new draft if no ID provided', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { ...mockDraft, data: {} },
    });

    await useWizardStore.getState().initDraft();

    expect(useWizardStore.getState().draftId).toBe('draft-id');
    expect(useWizardStore.getState().data.propertyType).toBeUndefined();
  });

  it('should update data locally', () => {
    useWizardStore.getState().updateData({ bedrooms: 2 });
    expect(useWizardStore.getState().data.bedrooms).toBe(2);
  });

  it('should save step and update sync status', async () => {
    useWizardStore.setState({ draftId: 'id', data: { bedrooms: 2 } });
    vi.mocked(axios.patch).mockResolvedValue({
      data: { completedSteps: [1], validationErrors: {} },
    });

    await useWizardStore.getState().saveStep(1);

    expect(useWizardStore.getState().syncStatus).toBe('saved');
    expect(useWizardStore.getState().completedSteps).toContain(1);
    expect(
      Object.keys(useWizardStore.getState().validationErrors),
    ).toHaveLength(0);
  });

  it('should handle save error', async () => {
    useWizardStore.setState({ draftId: 'id' });
    vi.mocked(axios.patch).mockRejectedValue(new Error('Failed'));

    await useWizardStore.getState().saveStep(1);

    expect(useWizardStore.getState().syncStatus).toBe('failed');
  });
});
