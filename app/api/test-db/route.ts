import { testConnection } from '@/lib/db/test-connection'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const isConnected = await testConnection()
    return NextResponse.json({ 
      success: isConnected,
      timestamp: new Date().toISOString()
    })
<<<<<<< HEAD
  } catch (error: any) {
=======
  } catch (error: unknown) {
>>>>>>> e11681c39053f84811f97f42f714604db87abfc9
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 