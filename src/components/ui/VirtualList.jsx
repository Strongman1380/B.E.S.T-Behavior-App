import { useState, useEffect, useRef, useMemo } from 'react';

// Virtual scrolling component for large lists
export function VirtualList({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = "",
  onScroll,
  ...props
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef();

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
          style: {
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }
        });
      }
    }
    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = (e) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(e);
  };

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Optimized table with virtual scrolling
export function VirtualTable({
  data = [],
  columns = [],
  rowHeight = 50,
  headerHeight = 40,
  maxHeight = 600,
  className = "",
  onRowClick,
  ...props
}) {
  const containerHeight = Math.min(maxHeight, (data.length * rowHeight) + headerHeight);

  const renderRow = (row, index) => (
    <div
      className={`flex border-b hover:bg-gray-50 cursor-pointer ${
        onRowClick ? 'hover:bg-blue-50' : ''
      }`}
      onClick={() => onRowClick?.(row, index)}
      style={{ height: rowHeight, alignItems: 'center' }}
    >
      {columns.map((column, colIndex) => (
        <div
          key={colIndex}
          className={`px-4 py-2 ${column.className || ''}`}
          style={{ 
            width: column.width || `${100 / columns.length}%`,
            minWidth: column.minWidth || 'auto'
          }}
        >
          {column.render ? column.render(row[column.key], row, index) : row[column.key]}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`border rounded-lg ${className}`} {...props}>
      {/* Header */}
      <div 
        className="flex bg-gray-50 border-b font-medium"
        style={{ height: headerHeight, alignItems: 'center' }}
      >
        {columns.map((column, index) => (
          <div
            key={index}
            className={`px-4 py-2 ${column.headerClassName || ''}`}
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.minWidth || 'auto'
            }}
          >
            {column.title}
          </div>
        ))}
      </div>

      {/* Virtual scrolling body */}
      <VirtualList
        items={data}
        itemHeight={rowHeight}
        containerHeight={containerHeight - headerHeight}
        renderItem={renderRow}
        className="bg-white"
      />
    </div>
  );
}

// Hook for managing virtual list state
export function useVirtualList(items, itemHeight = 50, containerHeight = 400) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  return {
    visibleItems,
    visibleRange,
    scrollTop,
    setScrollTop,
    totalHeight: items.length * itemHeight
  };
}

export default VirtualList;