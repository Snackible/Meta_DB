'use client'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-6 w-80">
        <div className="text-2xl font-semibold tracking-tight">Meta Ads Viewer</div>
        <p className="text-sm text-gray-400 text-center">Sign in with your Google account to continue.</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full bg-white text-gray-900 font-medium py-2.5 rounded-lg hover:bg-gray-100 transition text-sm"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
