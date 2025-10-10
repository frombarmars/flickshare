import { NextRequest, NextResponse } from 'next/server';
import { eventListenerService } from '@/lib/event-listener-service';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    switch (action) {
      case 'start':
        await eventListenerService.start();
        return NextResponse.json({ 
          success: true, 
          message: 'Event listener service started',
          isRunning: eventListenerService.isServiceRunning()
        });

      case 'stop':
        await eventListenerService.stop();
        return NextResponse.json({ 
          success: true, 
          message: 'Event listener service stopped',
          isRunning: eventListenerService.isServiceRunning()
        });

      case 'status':
        return NextResponse.json({ 
          success: true, 
          isRunning: eventListenerService.isServiceRunning()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use start, stop, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Event listener API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage event listener service',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      isRunning: eventListenerService.isServiceRunning()
    });
  } catch (error) {
    console.error('Event listener status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check event listener status' },
      { status: 500 }
    );
  }
}