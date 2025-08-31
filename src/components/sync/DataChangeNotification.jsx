/* eslint react-refresh/only-export-components: off */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getStorageType } from '@/api/entities';
import { Users, UserPlus, FileEdit, AlertTriangle, Trash2 } from 'lucide-react';

// Global state to track data changes
let lastDataSnapshot = {};
let isInitialized = false;

export function useDataChangeNotifications(entity, entityName, currentUserId = 'current-user') {
  const [isFirebase] = useState(getStorageType() === 'firebase');

  useEffect(() => {
    if (!isFirebase) return;

    const unsubscribe = entity.onSnapshot((newData) => {
      // Skip notifications on initial load
      if (!isInitialized) {
        lastDataSnapshot[entityName] = newData;
        isInitialized = true;
        return;
      }

      const previousData = lastDataSnapshot[entityName] || [];
      
      // Detect changes
      const changes = detectChanges(previousData, newData, entityName);
      
      // Show notifications for changes made by other users
      changes.forEach(change => {
        if (change.userId !== currentUserId) {
          showChangeNotification(change);
        }
      });

      // Update snapshot
      lastDataSnapshot[entityName] = newData;
    });

    return unsubscribe;
  }, [entity, entityName, currentUserId, isFirebase]);
}

function detectChanges(oldData, newData, entityName) {
  const changes = [];
  
  // Create maps for easier comparison
  const oldMap = new Map(oldData.map(item => [item.id, item]));
  const newMap = new Map(newData.map(item => [item.id, item]));

  // Detect additions
  newData.forEach(item => {
    if (!oldMap.has(item.id)) {
      changes.push({
        type: 'added',
        entityName,
        item,
        userId: item.updated_by || 'another-user'
      });
    }
  });

  // Detect updates
  newData.forEach(item => {
    const oldItem = oldMap.get(item.id);
    if (oldItem && hasChanged(oldItem, item)) {
      changes.push({
        type: 'updated',
        entityName,
        item,
        oldItem,
        userId: item.updated_by || 'another-user'
      });
    }
  });

  // Detect deletions
  oldData.forEach(item => {
    if (!newMap.has(item.id)) {
      changes.push({
        type: 'deleted',
        entityName,
        item,
        userId: 'another-user'
      });
    }
  });

  return changes;
}

function hasChanged(oldItem, newItem) {
  // Simple comparison - in production you might want more sophisticated comparison
  const oldStr = JSON.stringify(oldItem);
  const newStr = JSON.stringify(newItem);
  return oldStr !== newStr;
}

function showChangeNotification(change) {
  const { type, entityName, item } = change;
  
  const getEntityDisplayName = (name) => {
    const names = {
      'students': 'Student',
      'daily_evaluations': 'Evaluation',
      'incident_reports': 'Incident Report',
      'behavior_summaries': 'Behavior Summary',
      'contact_logs': 'Contact Log',
      'settings': 'Settings'
    };
    return names[name] || name;
  };

  const getItemName = (item, entityName) => {
    if (entityName === 'students') return item.student_name;
    if (entityName === 'daily_evaluations') return `${item.student_name || 'Student'} - ${item.date}`;
    if (entityName === 'incident_reports') return `${item.student_name} - ${item.incident_type}`;
    if (entityName === 'behavior_summaries') return `${item.student_name || 'Student'} Summary`;
    if (entityName === 'contact_logs') return `Contact: ${item.student_name}`;
    return 'Item';
  };

  const entityDisplay = getEntityDisplayName(entityName);
  const itemName = getItemName(item, entityName);

  const getIcon = (type, entityName) => {
    if (type === 'added') return <UserPlus className="w-4 h-4" />;
    if (type === 'updated') return <FileEdit className="w-4 h-4" />;
    if (type === 'deleted') return <Trash2 className="w-4 h-4" />;
    if (entityName === 'incident_reports') return <AlertTriangle className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  const getToastType = (type) => {
    if (type === 'added') return 'success';
    if (type === 'updated') return 'info';
    if (type === 'deleted') return 'warning';
    return 'info';
  };

  const getMessage = (type, entityDisplay, itemName) => {
    if (type === 'added') return `New ${entityDisplay}: ${itemName}`;
    if (type === 'updated') return `Updated ${entityDisplay}: ${itemName}`;
    if (type === 'deleted') return `Deleted ${entityDisplay}: ${itemName}`;
    return `${entityDisplay} changed: ${itemName}`;
  };

  const toastType = getToastType(type);
  const message = getMessage(type, entityDisplay, itemName);
  const icon = getIcon(type, entityName);

  // Show toast notification
  toast[toastType](message, {
    icon,
    description: 'Changes made by another user',
    duration: 4000,
  });
}

// Component to set up notifications for multiple entities
export default function DataChangeNotificationProvider({ children }) {
  // This would be set up in your main app component
  // For now, it's just a placeholder
  return children;
}
