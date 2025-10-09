
export interface INotification {
  id: string;
  recipientId: string;
  triggeredById: string;
  type: 'like' | 'comment' | 'follow' | 'review' | 'support' | 'mention' | 'achievement' | 'system';
  entityId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  triggeredBy: {
    username: string;
    profilePicture: string;
  };
  entityType?: 'review' | 'user' | 'movie' | 'comment';
  actionUrl?: string; // URL to navigate when notification is clicked
}
