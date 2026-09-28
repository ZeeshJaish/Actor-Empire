import React, { createContext, useContext } from 'react';
import {
  resolvePerformanceCapabilities,
  toPerformanceCapabilityAttributes,
  toPerformanceCapabilityCssVariables,
  type PerformanceCapabilities,
} from '../services/performanceCapabilities';
import '../styles/performance-capabilities.css';

const DEFAULT_PERFORMANCE_CAPABILITIES = resolvePerformanceCapabilities({ legacySmoothMode: false });

const PerformanceCapabilitiesContext = createContext<PerformanceCapabilities>(
  DEFAULT_PERFORMANCE_CAPABILITIES
);

export type PerformanceCapabilitiesRootProps = {
  capabilities: PerformanceCapabilities;
  className?: string;
  children: React.ReactNode;
};

export const usePerformanceCapabilities = (): PerformanceCapabilities => (
  useContext(PerformanceCapabilitiesContext)
);

export const PerformanceCapabilitiesRoot: React.FC<PerformanceCapabilitiesRootProps> = ({
  capabilities,
  className = '',
  children,
}) => {
  const attributes = toPerformanceCapabilityAttributes(capabilities);
  const cssVariables = toPerformanceCapabilityCssVariables(capabilities) as React.CSSProperties;
  const rootClassName = `${className} ae-performance-root`.trim();

  return (
    <PerformanceCapabilitiesContext.Provider value={capabilities}>
      <div className={rootClassName} style={cssVariables} {...attributes}>
        {children}
      </div>
    </PerformanceCapabilitiesContext.Provider>
  );
};
