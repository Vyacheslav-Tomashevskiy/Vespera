import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyComparison from './PropertyComparison';

const meta: Meta<typeof PropertyComparison> = {
  title: 'Components/Properties/PropertyComparison',
  component: PropertyComparison,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyComparison>;

export const Default: Story = {
  args: {
    properties: [
      {
        id: 1,
        title: 'Modern Penthouse',
        price: '$3,500',
        location: 'Downtown, NY',
        beds: 2,
        baths: 2,
        sqft: 1200,
        image:
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
        amenities: ['Wifi', 'Gym', 'Parking', 'Security'],
      },
      {
        id: 2,
        title: 'Cozy Loft',
        price: '$2,800',
        location: 'Brooklyn, NY',
        beds: 1,
        baths: 1,
        sqft: 850,
        image:
          'https://images.unsplash.com/photo-1536376074432-8d2a817536b3?auto=format&fit=crop&w=600&q=80',
        amenities: ['Wifi', 'Laundry', 'Security'],
      },
      {
        id: 3,
        title: 'Luxury Estate',
        price: '$8,000',
        location: 'Hamptons, NY',
        beds: 5,
        baths: 4,
        sqft: 4500,
        image:
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80',
        amenities: ['Wifi', 'Pool', 'Parking', 'Gym', 'Security', 'Garden'],
      },
    ],
  },
};
