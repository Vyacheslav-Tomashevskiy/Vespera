import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyMap from './PropertyMap';

const meta: Meta<typeof PropertyMap> = {
  title: 'Components/Properties/PropertyMap',
  component: PropertyMap,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyMap>;

export const Default: Story = {
  args: {
    properties: [
      {
        id: 1,
        price: '$2,500',
        title: 'Modern Penthouse',
        lat: 40.7128,
        lng: -74.006,
      },
      {
        id: 2,
        price: '$1,800',
        title: 'Cozy Loft',
        lat: 40.7306,
        lng: -73.9352,
      },
      {
        id: 3,
        price: '$4,200',
        title: 'Luxury Estate',
        lat: 40.6782,
        lng: -73.9442,
      },
    ],
  },
};
