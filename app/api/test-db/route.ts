import { testConnection } from '@/lib/db/test-connection'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const isConnected = await testConnection()
    return NextResponse.json({ 
      success: isConnected,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 