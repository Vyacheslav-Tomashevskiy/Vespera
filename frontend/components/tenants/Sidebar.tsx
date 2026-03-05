import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Construction,
  Contact,
  Home,
  HousePlus,
  Settings,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import React, { SetStateAction } from 'react';

const NavigationMenuLinks = [
  {
    label: 'Overview',
    url: '/tenant',
    icon: <Home size={14} />,
  },
  {
    label: 'My Rentals',
    url: '/tenant/my-rentals',
    icon: <HousePlus size={14} />,
  },
  {
    label: ' My Contacts',
    url: '/tenant/my-contacts',
    icon: <Contact size={14} />,
  },
  {
    label: 'Updates & Maintenance',
    url: '/tenant/updates-and-maintenance',
    icon: <Construction size={14} />,
  },
  {
    label: 'Wallet',
    url: '/tenant/wallet',
    icon: <Wallet size={14} />,
  },
  {
    label: 'Settings',
    url: '/tenant/settings',
    icon: <Settings size={14} />,
  },
];

interface SidebarProps {
  collapseNav: boolean;
  setCollapseNav: React.Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ collapseNav, setCollapseNav }: SidebarProps) {
  return (
    <div className="w-full bg-brand-blue h-full overflow-y-auto pb-10 pt-4 px-[6%] flex flex-col items-start justify-between gap-20 mb-10 font-sans  ">
      <button
        className="bg-white p-2 rounded-sm flex items-center justify-center cursor-pointer ml-auto border-none outline-none  "
        onClick={() => setCollapseNav((prev) => !prev)}
      >
        {collapseNav ? (
          <ArrowRightFromLine size={10} />
        ) : (
          <ArrowLeftFromLine size={10} />
        )}
      </button>

      <Link href={'/'}>
        <span
          className={` ${collapseNav ? 'hidden' : 'block'} text-2xl font-bold tracking-tight transition-colors text-white `}
        >
          Chioma
        </span>
      </Link>

      <ul
        className={`w-full ${collapseNav ? 'hidden' : 'flex'} flex-col items-start gap-6  `}
      >
        {NavigationMenuLinks.map((link, i) => (
          <li key={i}>
            <Link
              href={link.url}
              className="text-white hover:text-gray-300 duration-200 transition-all ease-in-out font-medium text-sm flex items-center justify-center gap-2  "
            >
              {link.icon} {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        className={`${collapseNav ? 'hidden' : 'block'} bg-white text-nowrap w-full text-red-600 text-sm font-medium px-5 py-2 rounded-sm hover:bg-red-400 hover:text-white duration-200 transition-all ease-in-out cursor-pointer font-sans `}
      >
        Sign Out
      </button>
    </div>
  );
}
