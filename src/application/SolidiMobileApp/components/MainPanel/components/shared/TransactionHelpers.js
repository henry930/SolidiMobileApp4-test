/**
 * Helper functions for transaction and order list management
 */

/**
 * Parse date string in various formats to Date object
 * Supports: "DD MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
 */
const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'Unknown Date') {
    return null;
  }

  // Try "DD MMM YYYY" format (e.g., "09 Nov 2025")
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = dateStr.split(' ');
  
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthIndex = monthNames.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    
    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      return new Date(year, monthIndex, day);
    }
  }
  
  // Try "DD/MM/YYYY" format
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  
  // Try "YYYY-MM-DD" format
  if (dateStr.includes('-')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

/**
 * Group transactions or orders by date in descending order
 * @param {Array} items - Array of transaction or order objects
 * @returns {Array} Array of objects with date and items: [{date: 'DD MMM YYYY', items: [...]}]
 */
export const groupByDate = (items) => {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  // Group items by date
  const grouped = items.reduce((acc, item) => {
    const date = item.date || 'Unknown Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  // Convert to array and sort by date in descending order
  const groupedArray = Object.keys(grouped).map(date => ({
    date,
    items: grouped[date]
  }));

  // Sort by date (most recent first)
  groupedArray.sort((a, b) => {
    if (a.date === 'Unknown Date') return 1;
    if (b.date === 'Unknown Date') return -1;
    
    try {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      
      if (!dateA || !dateB) return 0;
      
      return dateB - dateA; // Descending order (newest first)
    } catch (err) {
      return 0;
    }
  });

  return groupedArray;
};

/**
 * Format date for display in section header
 * @param {string} dateStr - Date string in various formats (DD MMM YYYY, DD/MM/YYYY, YYYY-MM-DD)
 * @returns {string} Formatted date string (e.g., "Today", "Yesterday", or "15 January 2024")
 */
export const formatDateHeader = (dateStr) => {
  if (!dateStr || dateStr === 'Unknown Date') {
    return 'Unknown Date';
  }

  try {
    const date = parseDate(dateStr);
    
    if (!date) {
      return dateStr;
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "15 January 2024"
      const day = date.getDate();
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch (err) {
    console.log('Error formatting date header:', err);
    return dateStr;
  }
};
