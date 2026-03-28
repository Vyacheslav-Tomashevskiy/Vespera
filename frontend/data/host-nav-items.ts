import { navItems } from '@/types/sidebar-items';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BookOpen,
  DollarSign,
  Star,
} from 'lucide-react';

export const hostNavItems: navItems[] = [
  { name: 'Dashboard', href: '/host', icon: LayoutDashboard },
  { name: 'Listings', href: '/host/listings', icon: Building2 },
  { name: 'Calendar', href: '/host/calendar', icon: CalendarDays },
  { name: 'Bookings', href: '/host/bookings', icon: BookOpen },
  { name: 'Earnings', href: '/host/earnings', icon: DollarSign },
  { name: 'Reviews', href: '/host/reviews', icon: Star },
];
