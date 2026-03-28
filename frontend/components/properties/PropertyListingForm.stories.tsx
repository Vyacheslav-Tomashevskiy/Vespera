import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyListingForm from './PropertyListingForm';

const meta: Meta<typeof PropertyListingForm> = {
  title: 'Components/Properties/PropertyListingForm',
  component: PropertyListingForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyListingForm>;

export const Default: Story = {};
