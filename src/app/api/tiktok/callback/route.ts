
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')

    if (!code) {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/tiktok?error=no_code`)
    }

    // Redirect to the dashboard with the code to handle exchange on client-side
    // This avoids "session lost" issues with SameSite cookies during server-side redirects
    return NextResponse.redirect(`${requestUrl.origin}/dashboard/tiktok?auth_code=${code}&state=${state || ''}`)
}
