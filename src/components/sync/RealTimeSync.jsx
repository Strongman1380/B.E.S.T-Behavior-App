/* eslint react-refresh/only-export-components: off */
/* eslint react-hooks/exhaustive-deps: off */
import { useEffect, useState } from 'react';
import { getStorageType } from '@/api/entities';
import { Badge } from '@/components/ui/badge';
import { Cloud, Users, Database } from 'lucide-react';

export default function RealTimeSync() {
  const [storageType, setStorageType] = useState('postgresql');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    // Verify PostgreSQL connection
    getStorageType().then(type => {
      setStorageType(type);
    }).catch(error => {
      console.error('PostgreSQL connection failed:', error);
      setStorageType('error');
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync time periodically
    const syncInterval = setInterval(() => {
      // periodic no-op to keep badge responsive in future
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  const getSyncStatus = () => {
    // Supabase browser client
    if (storageType === 'supabase') {
      return {
        icon: <Database className="w-3 h-3" />,
        text: 'Supabase',
        color: isOnline
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: isOnline ? 'Connected to Supabase' : 'Supabase unavailable (offline)'
      };
    }

    // Legacy PostgreSQL direct (server)
    if (storageType === 'postgresql') {
      return {
        icon: <Cloud className="w-3 h-3" />,
        text: isOnline ? 'PostgreSQL' : 'PostgreSQL (Offline)',
        color: isOnline
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: isOnline ? 'Connected to PostgreSQL database' : 'PostgreSQL connection unavailable'
      };
    }

    // Error / unknown
    if (storageType === 'error') {
      return {
        icon: <Cloud className="w-3 h-3" />,
        text: 'Database Error',
        color: 'bg-red-100 text-red-800 border-red-200',
        description: 'Database connection failed'
      };
    }

    // Fallback label
    return {
      icon: <Cloud className="w-3 h-3" />,
      text: 'Database',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Checking database connection'
    };
  };

  const status = getSyncStatus();

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${status.color} flex items-center gap-1 text-xs`}>
        {status.icon}
        {status.text}
      </Badge>
      
      {(storageType === 'postgresql' || storageType === 'supabase') && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3 h-3" />
          <span>{storageType === 'supabase' ? 'Supabase' : 'Database'}</span>
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
  }, [entity, filters]);

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
