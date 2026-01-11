'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function PageContainer({ children, title, description }: PageContainerProps) {
  return (
    <div className="flex-1 p-8">
      {(title || description) && (
        <div className="mb-8">
          {title && <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
