'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-forest text-paper hover:bg-forest-dark',
      secondary: 'bg-ink text-paper hover:bg-ink-soft',
      outline: 'border border-rule-strong bg-transparent text-ink hover:bg-sheet',
      ghost: 'text-ink-soft hover:bg-sheet hover:text-ink',
      danger: 'bg-seal text-paper hover:opacity-90'
    };
    
    const sizes = {
      sm: 'min-h-9 px-3 text-sm',
      md: 'min-h-11 px-4 text-sm',
      lg: 'min-h-12 px-5 text-base'
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
