import type { Meta, StoryObj } from '@storybook/nextjs';
import PropertyDetailView from './PropertyDetailView';

const meta: Meta<typeof PropertyDetailView> = {
  title: 'Components/Properties/PropertyDetailView',
  component: PropertyDetailView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PropertyDetailView>;

export const Default: Story = {
  args: {
    property: {
      id: 1,
      title: 'Oceanfront Modern Villa',
      description:
        'Experience luxury living in this stunning oceanfront villa. Featuring floor-to-ceiling windows, a private infinity pool, and direct beach access. \n\nThe open-concept living area flows seamlessly into a gourmet kitchen with top-of-the-line appliances. Each bedroom offers panoramic views of the coast.',
      price: '$12,000',
      location: 'Malibu, CA',
      beds: 5,
      baths: 4.5,
      sqft: 4200,
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      ],
      verified: true,
      amenities: [
        { name: 'Private Pool' },
        { name: 'Ocean View' },
        { name: 'Smart Home' },
        { name: 'Wifi' },
        { name: 'Parking' },
        { name: 'Air Conditioning' },
        { name: 'Gym' },
      ],
      manager: {
        name: 'Sarah Waters',
        verified: true,
        responseTime: 'within 1 hour',
      },
      category: 'Villa',
      listedDate: '2026-03-20',
    },
  },
};
