import { useState, useEffect } from 'react';

export interface BreakpointValues {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  '2xl': boolean;
}

export interface ResponsiveState extends BreakpointValues {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = (): ResponsiveState => {
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Call handler right away to get initial size
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;

  const breakpointValues: BreakpointValues = {
    xs: width >= breakpoints.xs,
    sm: width >= breakpoints.sm,
    md: width >= breakpoints.md,
    lg: width >= breakpoints.lg,
    xl: width >= breakpoints.xl,
    '2xl': width >= breakpoints['2xl'],
  };

  return {
    ...breakpointValues,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    width,
    height,
  };
};

export const useBreakpoint = (breakpoint: keyof typeof breakpoints): boolean => {
  const responsive = useResponsive();
  return responsive[breakpoint];
};

export const useMobile = (): boolean => {
  const responsive = useResponsive();
  return responsive.isMobile;
};

export const useTablet = (): boolean => {
  const responsive = useResponsive();
  return responsive.isTablet;
};

export const useDesktop = (): boolean => {
  const responsive = useResponsive();
  return responsive.isDesktop;
};