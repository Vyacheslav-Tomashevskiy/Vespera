import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyAmenities from './PropertyAmenities';

const meta: Meta<typeof PropertyAmenities> = {
  title: 'Components/Properties/PropertyAmenities',
  component: PropertyAmenities,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyAmenities>;

export const ManyAmenities: Story = {
  args: {
    amenities: [
      { name: 'Wifi' },
      { name: 'Parking' },
      { name: 'Air Conditioning' },
      { name: 'Gym' },
      { name: 'Security' },
      { name: 'Kitchen' },
      { name: 'Garden' },
      { name: 'Laundry' },
      { name: 'Pool' },
    ],
    columns: 3,
  },
};

export const Grid4: Story = {
  args: {
    amenities: [
      { name: 'Wifi' },
      { name: 'Parking' },
      { name: 'AC' },
      { name: 'Gym' },
    ],
    columns: 4,
  },
};
