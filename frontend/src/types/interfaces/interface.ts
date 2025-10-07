
export interface INotification {
  id: string;
  recipientId: string;
  triggeredById: string;
  type: string;
  entityId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  triggeredBy: {
    username: string;
    profilePicture: string;
  };
}
