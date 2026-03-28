import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertySearchFilters from './PropertySearchFilters';

const meta: Meta<typeof PropertySearchFilters> = {
  title: 'Components/Properties/PropertySearchFilters',
  component: PropertySearchFilters,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertySearchFilters>;

export const Default: Story = {};
