import { createContext, useContext, useRef, useCallback, useEffect } from 'react';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const refreshFnRef = useRef(null);

  const registerRefresh = useCallback((fn) => {
    refreshFnRef.current = fn;
  }, []);

  const unregisterRefresh = useCallback(() => {
    refreshFnRef.current = null;
  }, []);

  const executeRefresh = useCallback(async () => {
    if (refreshFnRef.current) {
      await refreshFnRef.current();
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ registerRefresh, unregisterRefresh, executeRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used within RefreshProvider');
  return ctx;
};

// هوك لتسجيل دالة التحديث الخاصة بكل صفحة
export const useRegisterRefresh = (fetchFn) => {
  const { registerRefresh, unregisterRefresh } = useRefresh();

  useEffect(() => {
    registerRefresh(fetchFn);
    return () => unregisterRefresh();
  }, [fetchFn, registerRefresh, unregisterRefresh]);
};
