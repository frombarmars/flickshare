// Notification translations

export const notificationTranslations = {
  en: {
    notifications: "Notifications",
    noNotifications: "No notifications yet",
    noNotificationsDescription: "You'll see notifications here when someone interacts with your content",
    markAllAsRead: "Mark all as read",
    markAsRead: "Mark as read",
    clearAll: "Clear all",
    newNotification: "New notification",
    
    // Notification types
    like: "liked your review",
    comment: "commented on your review",
    follow: "started following you",
    support: "supported your review with",
    system: "System notification",
    
    // Actions
    tapToViewReview: "Tap to view review",
    tapToViewProfile: "Tap to view profile",
    
    // Time
    justNow: "Just now",
    minutesAgo: "{{count}}m ago",
    hoursAgo: "{{count}}h ago",
    daysAgo: "{{count}}d ago",
    weeksAgo: "{{count}}w ago",
    
    // Status
    unread: "Unread",
    read: "Read",
    loading: "Loading notifications...",
    loadingMore: "Loading more...",
    noMore: "No more notifications",
    
    // Errors
    failedToLoad: "Failed to load notifications",
    failedToMark: "Failed to mark as read",
    failedToClear: "Failed to clear notifications",
    
    // Pull to refresh
    pullToRefresh: "Pull to refresh",
    releaseToRefresh: "Release to refresh",
    refreshing: "Refreshing...",
  },
  th: {
    notifications: "การแจ้งเตือน",
    noNotifications: "ยังไม่มีการแจ้งเตือน",
    noNotificationsDescription: "คุณจะเห็นการแจ้งเตือนที่นี่เมื่อมีคนโต้ตอบกับเนื้อหาของคุณ",
    markAllAsRead: "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว",
    markAsRead: "ทำเครื่องหมายว่าอ่านแล้ว",
    clearAll: "ลบทั้งหมด",
    newNotification: "การแจ้งเตือนใหม่",
    
    // Notification types
    like: "กดไลค์รีวิวของคุณ",
    comment: "แสดงความคิดเห็นในรีวิวของคุณ",
    follow: "เริ่มติดตามคุณ",
    support: "สนับสนุนรีวิวของคุณด้วย",
    system: "การแจ้งเตือนระบบ",
    
    // Actions
    tapToViewReview: "แตะเพื่อดูรีวิว",
    tapToViewProfile: "แตะเพื่อดูโปรไฟล์",
    
    // Time
    justNow: "เมื่อสักครู่",
    minutesAgo: "{{count}} นาทีที่แล้ว",
    hoursAgo: "{{count}} ชั่วโมงที่แล้ว",
    daysAgo: "{{count}} วันที่แล้ว",
    weeksAgo: "{{count}} สัปดาห์ที่แล้ว",
    
    // Status
    unread: "ยังไม่ได้อ่าน",
    read: "อ่านแล้ว",
    loading: "กำลังโหลดการแจ้งเตือน...",
    loadingMore: "กำลังโหลดเพิ่มเติม...",
    noMore: "ไม่มีการแจ้งเตือนเพิ่มเติม",
    
    // Errors
    failedToLoad: "โหลดการแจ้งเตือนไม่สำเร็จ",
    failedToMark: "ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ",
    failedToClear: "ลบการแจ้งเตือนไม่สำเร็จ",
    
    // Pull to refresh
    pullToRefresh: "ดึงลงเพื่อรีเฟรช",
    releaseToRefresh: "ปล่อยเพื่อรีเฟรช",
    refreshing: "กำลังรีเฟรช...",
  },
};

export type NotificationTranslationKey = keyof typeof notificationTranslations.en;

export const getNotificationTranslation = (
  locale: string,
  key: NotificationTranslationKey,
  params?: Record<string, string | number>
): string => {
  const translations = locale === 'th' ? notificationTranslations.th : notificationTranslations.en;
  let text = translations[key] || notificationTranslations.en[key];
  
  if (params) {
    Object.keys(params).forEach((param) => {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
    });
  }
  
  return text;
};
