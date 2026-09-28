import React from 'react';

type DivProps = React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode };

function classNames(base: string, additional?: string) {
  return [base, additional].filter(Boolean).join(' ');
}

export function GameViewport({ className, ...props }: DivProps) {
  return <div {...props} className={classNames('ae-layout-viewport', className)} />;
}

export function ContentRegion({ className, ...props }: DivProps) {
  return <main {...props} className={classNames('ae-layout-content', className)} />;
}

export function AdaptiveHeader({ title, actions, className, ...props }: Omit<DivProps, 'children'> & { title: React.ReactNode; actions?: React.ReactNode }) {
  return <header {...props} className={classNames('ae-layout-header', className)}>
    <div className="ae-layout-header__title">{title}</div>
    {actions && <div className="ae-layout-header__actions">{actions}</div>}
  </header>;
}

export function SheetActionFooter({ className, ...props }: DivProps) {
  return <footer {...props} className={classNames('ae-layout-footer', className)} />;
}
