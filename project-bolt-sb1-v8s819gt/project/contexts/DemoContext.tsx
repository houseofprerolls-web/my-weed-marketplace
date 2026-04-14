"use client";

import { createContext, useContext, ReactNode } from 'react';

const demoBusinesses = {
  GreenLeaf: {
    id: 'demo-greenleaf',
    name: 'GreenLeaf Dispensary',
    logo: null,
    plan: 'Premium',
    city: 'Los Angeles',
    state: 'CA',
    verified: true,
    rating: 4.8,
    reviewCount: 342,
    email: 'greenleaf@greenzone.demo'
  },
  Sunset: {
    id: 'demo-sunset',
    name: 'Sunset Cannabis Delivery',
    logo: null,
    plan: 'Growth',
    city: 'San Diego',
    state: 'CA',
    verified: true,
    rating: 4.6,
    reviewCount: 189,
    email: 'sunset@greenzone.demo'
  },
  Highway420: {
    id: 'demo-highway420',
    name: 'Highway 420 Collective',
    logo: null,
    plan: 'Starter',
    city: 'Las Vegas',
    state: 'NV',
    verified: true,
    rating: 4.7,
    reviewCount: 276,
    email: 'highway420@greenzone.demo'
  }
};

type DemoContextType = {
  businesses: typeof demoBusinesses;
  getCurrentBusiness: () => typeof demoBusinesses.GreenLeaf;
  isDemoMode: boolean;
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const getCurrentBusiness = () => {
    return demoBusinesses.GreenLeaf;
  };

  return (
    <DemoContext.Provider value={{ businesses: demoBusinesses, getCurrentBusiness, isDemoMode: true }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    return {
      businesses: demoBusinesses,
      getCurrentBusiness: () => demoBusinesses.GreenLeaf,
      isDemoMode: true
    };
  }
  return context;
}

export { demoBusinesses };
