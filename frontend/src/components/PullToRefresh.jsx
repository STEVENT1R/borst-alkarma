import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefresh } from '../context/RefreshContext';

const PullToRefresh = ({ children, className = '' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | pulling | ready | refreshing
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const currentPull = useRef(0);

  const { executeRefresh } = useRefresh();

  const THRESHOLD = 80; // المسافة المطلوبة لتفعيل التحديث
  const MAX_PULL = 120; // أقصى مسافة سحب

  const doRefresh = useCallback(async () => {
    setPhase('refreshing');
    setRefreshing(true);
    setPullDistance(THRESHOLD);
    try {
      await executeRefresh();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
      setPhase('idle');
      currentPull.current = 0;
      isPulling.current = false;
    }
  }, [executeRefresh]);

  const handleTouchStart = useCallback((e) => {
    if (refreshing) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
    currentPull.current = 0;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (refreshing) return;
    const container = containerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    const scrollTop = container.scrollTop;

    if (diff > 0 && scrollTop <= 0) {
      isPulling.current = true;
      const distance = Math.min(diff * 0.5, MAX_PULL);
      currentPull.current = distance;
      setPullDistance(distance);
      setPhase(distance >= THRESHOLD ? 'ready' : 'pulling');
    } else if (scrollTop <= 0 && isPulling.current && diff <= 0) {
      // السحب لأعلى بعد السحب لأسفل - إلغاء
      isPulling.current = false;
      currentPull.current = 0;
      setPullDistance(0);
      setPhase('idle');
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (currentPull.current >= THRESHOLD && !refreshing) {
      doRefresh();
    } else {
      setPullDistance(0);
      setPhase('idle');
      currentPull.current = 0;
    }
  }, [refreshing, doRefresh]);

  const indicatorScale = Math.min(pullDistance / THRESHOLD, 1);
  const isReady = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto pb-20 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* مؤشر السحب / التحديث */}
      <div
        className="flex justify-center items-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{
          height: pullDistance > 5 ? `${Math.min(pullDistance, THRESHOLD)}px` : '0px',
          opacity: pullDistance > 5 ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-2 text-green-600 font-bold text-sm"
          style={{
            transform: `scale(${indicatorScale})`,
            transition: refreshing ? 'transform 0.3s ease' : 'none',
          }}
        >
          <RefreshCw
            size={20}
            className={`${refreshing ? 'animate-spin' : ''}`}
            style={{
              transform: refreshing
                ? 'none'
                : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
              transition: 'transform 0.1s linear',
            }}
          />
          <span>
            {refreshing
              ? 'جاري التحديث...'
              : isReady
              ? 'أفلت للتحديث'
              : 'اسحب للتحديث'}
          </span>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
