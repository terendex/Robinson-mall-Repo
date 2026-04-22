import { useEffect, useRef } from 'react';

/**
 * IdleTimer Component
 * Monitor users' activity (mouse, keyboard, etc) and triggers a callback
 * if the user remains inactive for a specified duration.
 */
const IdleTimer = ({ onLogout, timeout = 300000 }) => { // Default 5 minutes (300,000ms)
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      console.log('User idle for 5 minutes. Logging out.');
      onLogout();
    }, timeout);
  };

  useEffect(() => {
    // Events that count as 'activity'
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer
    resetTimer();

    // Add listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [onLogout, timeout]);

  return null; // This is a utility component, does not render UI
};

export default IdleTimer;
