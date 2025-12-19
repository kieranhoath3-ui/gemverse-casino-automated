import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock crash history for demonstration
    // In a real implementation, this would fetch from a game service
    const history = [
      { round_id: 'round_1', crash_point: 2.34, timestamp: Date.now() - 60000 },
      { round_id: 'round_2', crash_point: 1.87, timestamp: Date.now() - 120000 },
      { round_id: 'round_3', crash_point: 5.12, timestamp: Date.now() - 180000 },
      { round_id: 'round_4', crash_point: 1.23, timestamp: Date.now() - 240000 },
      { round_id: 'round_5', crash_point: 3.45, timestamp: Date.now() - 300000 }
    ]

    return NextResponse.json({
      history: history.slice(-50) // Last 50 rounds
    })

  } catch (error) {
    console.error('Failed to get crash history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}