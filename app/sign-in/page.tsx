'use client'
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50">
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-10 flex flex-col items-center gap-6 w-80">
        <div className="text-2xl font-semibold tracking-tight text-indigo-700">Meta Ads Viewer</div>
        <p className="text-sm text-gray-500 text-center">Sign in with your Google account to continue.</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
