import { useEffect, useState } from 'react';
import { getStorageType } from '@/api/entities';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Cloud, HardDrive, Users, RefreshCw } from 'lucide-react';

export default function RealTimeSync() {
  const [storageType, setStorageType] = useState(getStorageType());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync time periodically
    const syncInterval = setInterval(() => {
      setLastSync(new Date());
    }, 30000); // Update every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const getSyncStatus = () => {
    if (storageType === 'firebase' && isOnline) {
      return {
        icon: <Cloud className="w-3 h-3" />,
        text: 'Multi-User Sync',
        color: 'bg-green-100 text-green-800 border-green-200',
        description: 'Real-time collaboration enabled'
      };
    } else if (storageType === 'firebase' && !isOnline) {
      return {
        icon: <WifiOff className="w-3 h-3" />,
        text: 'Offline Mode',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Changes will sync when online'
      };
    } else {
      return {
        icon: <HardDrive className="w-3 h-3" />,
        text: 'Local Only',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Data stored locally on this device'
      };
    }
  };

  const status = getSyncStatus();

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${status.color} flex items-center gap-1 text-xs`}>
        {status.icon}
        {status.text}
      </Badge>
      
      {storageType === 'firebase' && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3 h-3" />
          <span>Shared</span>
        </div>
      )}
    </div>
  );
}

// Hook for components that need real-time data updates
export function useRealTimeData(entity, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time listener
        unsubscribe = entity.onSnapshot((newData) => {
          setData(newData);
          setLoading(false);
        }, filters);

      } catch (err) {
        console.error('Error setting up real-time data:', err);
        setError(err.message);
        setLoading(false);
        
        // Fallback to regular data loading
        try {
          const fallbackData = await entity.list();
          setData(fallbackData);
        } catch (fallbackErr) {
          console.error('Fallback data loading failed:', fallbackErr);
        }
      }
    };

    loadData();

    return () => {
      unsubscribe();
    };
  }, [entity, JSON.stringify(filters)]);

  return { data, loading, error };
}

// Hook for real-time document updates
export function useRealTimeDocument(entity, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time listener for document
        unsubscribe = entity.onDocSnapshot(id, (newData) => {
          setData(newData);
          setLoading(false);
        });

      } catch (err) {
        console.error('Error setting up real-time document:', err);
        setError(err.message);
        setLoading(false);
        
        // Fallback to regular document loading
        try {
          const fallbackData = await entity.get(id);
          setData(fallbackData);
        } catch (fallbackErr) {
          console.error('Fallback document loading failed:', fallbackErr);
        }
      }
    };

    loadDocument();

    return () => {
      unsubscribe();
    };
  }, [entity, id]);

  return { data, loading, error };
}