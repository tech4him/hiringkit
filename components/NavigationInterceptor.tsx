"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationInterceptor() {
  const pathname = usePathname();

  useEffect(() => {
    console.log('🔍 Navigation to:', pathname, {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    });

    // Log if we detect the problematic undefined pattern
    if (pathname.includes('/undefined')) {
      console.error('❌ UNDEFINED NAVIGATION DETECTED:', {
        pathname,
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Intercept all navigation methods
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function(state, title, url) {
        console.log('🔄 history.pushState:', { state, title, url, timestamp: new Date().toISOString() });
        if (typeof url === 'string' && url.includes('/undefined')) {
          console.error('❌ UNDEFINED in pushState URL:', { url, stack: new Error().stack });
        }
        return originalPushState.call(this, state, title, url);
      };
      
      window.history.replaceState = function(state, title, url) {
        console.log('🔄 history.replaceState:', { state, title, url, timestamp: new Date().toISOString() });
        if (typeof url === 'string' && url.includes('/undefined')) {
          console.error('❌ UNDEFINED in replaceState URL:', { url, stack: new Error().stack });
        }
        return originalReplaceState.call(this, state, title, url);
      };

      // Monitor for location changes via href assignments
      let currentHref = window.location.href;
      const checkLocationChanges = () => {
        if (window.location.href !== currentHref) {
          console.log('🔄 Location changed:', { 
            from: currentHref, 
            to: window.location.href, 
            timestamp: new Date().toISOString() 
          });
          if (window.location.href.includes('/undefined')) {
            console.error('❌ UNDEFINED in location URL:', { 
              url: window.location.href, 
              stack: new Error().stack 
            });
          }
          currentHref = window.location.href;
        }
      };
      
      const locationInterval = setInterval(checkLocationChanges, 100);

      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
        clearInterval(locationInterval);
      };
    }
  }, []);

  return null;
}