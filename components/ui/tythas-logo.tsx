import React from 'react';
import Image from 'next/image';

interface TythasLogoProps {
  variant?: 'icon' | 'full';
  themeMode?: 'light' | 'dark' | 'auto'; // 'light' means light artwork for dark backgrounds, 'dark' means dark artwork for light backgrounds
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  width?: number;
  height?: number;
  alt?: string;
  priority?: boolean;
}

const SIZES = {
  xs: { icon: 20, full: 80 },
  sm: { icon: 28, full: 110 },
  md: { icon: 36, full: 140 },
  lg: { icon: 48, full: 180 },
  xl: { icon: 64, full: 240 },
};

export const TythasLogo: React.FC<TythasLogoProps> = ({
  variant = 'icon',
  themeMode = 'auto',
  className = '',
  size = 'md',
  width,
  height,
  alt = 'Tythas Logo',
  priority = false,
}) => {
  if (variant === 'icon') {
    const dim = width || SIZES[size].icon;

    if (themeMode === 'light') {
      // Light icon specifically for dark backgrounds (white T + blue accent)
      return (
        <Image
          src="/logo-icon-light.png"
          alt={alt}
          width={dim}
          height={dim}
          className={`object-contain ${className}`}
          priority={priority}
        />
      );
    }

    if (themeMode === 'dark') {
      // Dark icon specifically for light backgrounds (dark slate T + blue accent)
      return (
        <Image
          src="/logo-icon.png"
          alt={alt}
          width={dim}
          height={dim}
          className={`object-contain ${className}`}
          priority={priority}
        />
      );
    }

    // Auto / Responsive to CSS dark mode
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <Image
          src="/logo-icon.png"
          alt={alt}
          width={dim}
          height={dim}
          className="object-contain dark:hidden"
          priority={priority}
        />
        <Image
          src="/logo-icon-light.png"
          alt={alt}
          width={dim}
          height={dim}
          className="object-contain hidden dark:block"
          priority={priority}
        />
      </div>
    );
  }

  // Full stacked logo (Monogram + TYTHAS + RESULTS THAT MATTER)
  const fullWidth = width || SIZES[size].full;
  const fullHeight = height || Math.round(fullWidth * (217 / 366));

  if (themeMode === 'light') {
    return (
      <Image
        src="/logo-white.png"
        alt={alt}
        width={fullWidth}
        height={fullHeight}
        className={`object-contain ${className}`}
        priority={priority}
      />
    );
  }

  if (themeMode === 'dark') {
    return (
      <Image
        src="/logo.png"
        alt={alt}
        width={fullWidth}
        height={fullHeight}
        className={`object-contain ${className}`}
        priority={priority}
      />
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <Image
        src="/logo.png"
        alt={alt}
        width={fullWidth}
        height={fullHeight}
        className="object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src="/logo-white.png"
        alt={alt}
        width={fullWidth}
        height={fullHeight}
        className="object-contain hidden dark:block"
        priority={priority}
      />
    </div>
  );
};
