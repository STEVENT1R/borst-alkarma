import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, BellOff } from 'lucide-react';

const PushNotification = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');

  useEffect(() => {
    // هل المتصفح يدعم Service Worker و Push؟
    if (typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    try {
      setLoading(true);

      // 1. طلب الإذن
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      if (permResult !== 'granted') {
        return;
      }

      // 2. جلب المفتاح العام
      const keyRes = await api.get('/push/vapid-key');
      const vapidPublicKey = keyRes.data.publicKey;

      // 3. استنى لما الـ Service Worker يخلص تسجيل (مسجل بالفعل من main.jsx)
      const registration = await navigator.serviceWorker.ready;


      // 4. الاشتراك في الـ Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 5. حفظ الاشتراك في السيرفر
      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('Error subscribing:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/push/unsubscribe', {
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Error unsubscribing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell size={24} className="text-green-600" />
          ) : (
            <BellOff size={24} className="text-gray-400" />
          )}
          <div>
            <h4 className="font-bold text-gray-800">إشعارات الموبايل</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSubscribed 
                ? 'الإشعارات مفعلة ✅' 
                : permission === 'denied' 
                  ? 'الإشعارات مرفوضة - افتح إعدادات المتصفح وسمح بها'
                  : 'فعل الإشعارات عشان يوصلك كل جديد'}
            </p>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isSubscribed
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          } disabled:opacity-50`}
        >
          {loading ? '...' : isSubscribed ? 'إلغاء' : 'تفعيل'}
        </button>
      </div>
    </div>
  );
};

export default PushNotification;
