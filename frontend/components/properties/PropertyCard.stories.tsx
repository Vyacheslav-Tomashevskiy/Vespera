import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyCard from './PropertyCard';

const meta: Meta<typeof PropertyCard> = {
  title: 'Components/Properties/PropertyCard',
  component: PropertyCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyCard>;

const mockProperty = {
  id: 1,
  price: '$2,500',
  title: 'Modern Luxury Penthouse',
  location: '123 Skyview Dr, Manhattan, NY',
  beds: 3,
  baths: 2,
  sqft: 1500,
  manager: 'Alex Johnson',
  image:
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  verified: true,
};

export const Grid: Story = {
  args: {
    property: mockProperty,
    variant: 'grid',
  },
};

export const List: Story = {
  args: {
    property: mockProperty,
    variant: 'list',
  },
};

export const Unverified: Story = {
  args: {
    property: {
      ...mockProperty,
      verified: false,
    },
    variant: 'grid',
  },
};
