import React from 'react';
import { ACTION_GROUP_POLICY, ColumnPolicy, STAT_GROUP_POLICY, chooseColumnCount } from './policy';
import { useContainerWidth } from './useContainerWidth';

export type ResponsiveGridProps = React.HTMLAttributes<HTMLDivElement> & {
  policy: ColumnPolicy;
  children: React.ReactNode;
};

export function ResponsiveGrid({ policy, children, className, style, ...rest }: ResponsiveGridProps) {
  const { ref, widthPx } = useContainerWidth<HTMLDivElement>();
  const columns = chooseColumnCount(widthPx, policy);
  return <div {...rest} ref={ref} data-layout-columns={columns}
    className={['ae-layout-grid', className].filter(Boolean).join(' ')}
    style={{ ...style, display: 'grid', gap: policy.gapPx, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {children}
  </div>;
}

export function InformationGrid(props: Omit<ResponsiveGridProps, 'policy'>) {
  return <ResponsiveGrid {...props} policy={STAT_GROUP_POLICY} />;
}

export function ActionGroup(props: Omit<ResponsiveGridProps, 'policy'>) {
  return <ResponsiveGrid {...props} policy={ACTION_GROUP_POLICY} />;
}
