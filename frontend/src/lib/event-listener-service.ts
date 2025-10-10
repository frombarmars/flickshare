import { contractEventListener } from '@/lib/contract-event-listener';

export class EventListenerService {
  private static instance: EventListenerService;
  private isRunning = false;

  static getInstance(): EventListenerService {
    if (!EventListenerService.instance) {
      EventListenerService.instance = new EventListenerService();
    }
    return EventListenerService.instance;
  }

  async start() {
    if (this.isRunning) {
      console.log('Event listener service is already running');
      return;
    }

    try {
      console.log('Starting event listener service...');
      
      // Start listening to new events
      await contractEventListener.startListening();
      
      // Optionally sync missed events from a specific block
      // You might want to store the last processed block in database
      const lastProcessedBlock = await this.getLastProcessedBlock();
      if (lastProcessedBlock) {
        console.log(`Syncing events from block ${lastProcessedBlock}...`);
        await contractEventListener.syncEventsFromBlock(lastProcessedBlock);
      }
      
      this.isRunning = true;
      console.log('Event listener service started successfully');
    } catch (error) {
      console.error('Failed to start event listener service:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) return;

    try {
      console.log('Stopping event listener service...');
      await contractEventListener.stopListening();
      this.isRunning = false;
      console.log('Event listener service stopped');
    } catch (error) {
      console.error('Error stopping event listener service:', error);
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }

  private async getLastProcessedBlock(): Promise<number | null> {
    // You might want to store this in your database
    // For now, return null to skip syncing old events
    return null;
    
    // Example implementation:
    // try {
    //   const lastBlock = await prisma.eventProcessing.findFirst({
    //     orderBy: { blockNumber: 'desc' }
    //   });
    //   return lastBlock?.blockNumber || null;
    // } catch (error) {
    //   console.error('Error getting last processed block:', error);
    //   return null;
    // }
  }
}

export const eventListenerService = EventListenerService.getInstance();