import { navItems } from '@/types/sidebar-items';
import { LayoutDashboard, Plane, Heart, Star } from 'lucide-react';

export const guestNavItems: navItems[] = [
  { name: 'Dashboard', href: '/guest', icon: LayoutDashboard },
  { name: 'My Trips', href: '/guest/trips', icon: Plane },
  { name: 'Favorites', href: '/guest/favorites', icon: Heart },
  { name: 'Reviews', href: '/guest/reviews', icon: Star },
];
