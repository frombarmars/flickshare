'use client';

// Simplified API utilities for all API calls
export class ApiClient {
  private static async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // GET request
  static get(endpoint: string) {
    return this.request(endpoint);
  }

  // POST request
  static post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  static put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  static delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Notification API calls
export const NotificationApi = {
  getSummary: (userId: string) => 
    ApiClient.get(`/api/notifications/summary/${userId}`),
  
  getUnreadCount: (userId: string) => 
    ApiClient.get(`/api/notifications/unread-count/${userId}`),
  
  markAsRead: (notificationIds: string[], userId: string) => 
    ApiClient.post('/api/notifications/read', { notificationIds, userId }),
};

// Points API calls
export const PointsApi = {
  getSummary: (userId: string) => 
    ApiClient.get(`/api/points/summary/${userId}`),
  
  performAction: (action: string) => 
    ApiClient.post(`/api/points/${action}`, {}),
};

// Profile API calls
export const ProfileApi = {
  update: (username: string, data: any) => 
    ApiClient.put(`/api/profile/${username}`, data),
  
  get: (username: string) => 
    ApiClient.get(`/api/profile/${username}`),
};

// Simplified contract utilities
export class ContractClient {
  static async sendTransaction(config: any) {
    try {
      const { MiniKit } = await import('@worldcoin/minikit-js');
      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [config]
      });
      
      if (result.finalPayload.status === 'error') {
        throw new Error('Transaction failed');
      }
      
      return result.finalPayload.transaction_id;
    } catch (error) {
      console.error('Contract transaction failed:', error);
      throw error;
    }
  }

  static async verify(action: string, signal: string) {
    try {
      const { MiniKit, VerificationLevel } = await import('@worldcoin/minikit-js');
      const result = await MiniKit.commandsAsync.verify({
        action,
        verification_level: VerificationLevel.Orb,
        signal,
      });

      if (result.finalPayload.status === 'error') {
        throw new Error('Verification failed');
      }

      return result.finalPayload;
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    }
  }
}