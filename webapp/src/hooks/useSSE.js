import { useEffect, useRef } from 'react';

export default function useSSE(onMessage) {
  const esRef = useRef(null);

  useEffect(() => {
    if (esRef.current) return;
    const es = new EventSource('/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage && onMessage(data);
      } catch (err) {
        // ignore
      }
    };
    es.onerror = () => {
      // noop
    };
    esRef.current = es;
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [onMessage]);
}
