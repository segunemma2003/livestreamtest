// src/App.tsx - Updated with LiveKit demo
import React, { useState } from 'react'
import './App.css'
import LiveStreamViewer from './components/LiveStreamViewer'
import LiveStreamBroadcaster from './components/LiveStreamBroadcaster'

function App() {
  const [mode, setMode] = useState<'home' | 'broadcaster' | 'viewer'>('home')
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')
  const [serverUrl, setServerUrl] = useState('ws://192.168.1.100:7880') // Your LiveKit server
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Generate token by calling your Django backend
  const generateToken = async (identity: string, roomName: string, canPublish: boolean = false) => {
    try {
      setIsLoading(true)
      
      // Call your Django API to generate token
      const response = await fetch('http://192.168.1.170:8000/api/v1/livestream/generate-token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity,
          room_name: roomName,
          role: canPublish ? 'host' : 'audience'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.token
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Token generation failed:', error)
      throw error instanceof Error ? error : new Error(String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartBroadcast = async () => {
    if (!roomName || !userName) {
      alert('Please enter room name and your name')
      return
    }

    try {
      const generatedToken = await generateToken(userName, roomName, true)
      setToken(generatedToken)
      setMode('broadcaster')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to generate broadcaster token: ${errorMessage}`)
    }
  }

  const handleJoinViewer = async () => {
    if (!roomName || !userName) {
      alert('Please enter room name and your name')
      return
    }

    try {
      const generatedToken = await generateToken(userName, roomName, false)
      setToken(generatedToken)
      setMode('viewer')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to generate viewer token: ${errorMessage}`)
    }
  }

  const handleDisconnect = () => {
    setMode('home')
    setToken('')
  }

  const testServerConnection = async () => {
    try {
      setIsLoading(true)
      
      // Test Django backend connection
      const backendResponse = await fetch('http://192.168.1.170:8000/api/v1/livestream/test-connection/')
      
      if (backendResponse.ok) {
        const data = await backendResponse.json()
        
        if (data.connection_test?.status === 'connected') {
          alert('✅ Both Django backend and LiveKit server are reachable!')
        } else {
          alert('⚠️ Django backend is reachable, but LiveKit server connection failed. Check your LiveKit server.')
        }
      } else {
        alert('❌ Cannot reach Django backend. Make sure it\'s running on http://192.168.1.170:8000')
      }
    } catch (error) {
      alert('❌ Connection test failed. Check your network and server URLs.')
    } finally {
      setIsLoading(false)
    }
  }

  if (mode === 'broadcaster') {
    return (
      <LiveStreamBroadcaster
        roomName={roomName}
        token={token}
        serverUrl={serverUrl}
        userName={userName}
        onDisconnect={handleDisconnect}
      />
    )
  }

  if (mode === 'viewer') {
    return (
      <LiveStreamViewer
        roomName={roomName}
        token={token}
        serverUrl={serverUrl}
        userName={userName}
        onDisconnect={handleDisconnect}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">LiveKit Demo</h1>
          <p className="text-gray-400">Test your LiveKit setup locally</p>
        </header>

        {/* Connection Settings */}
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">LiveKit Server URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://192.168.1.100:7880"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Your LiveKit server WebSocket URL</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="test-room"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your display name"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto space-y-4">
          <button
            onClick={handleStartBroadcast}
            disabled={!roomName || !userName || !serverUrl || isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? '🔄 Generating Token...' : '🎥 Start Broadcasting'}
          </button>

          <button
            onClick={handleJoinViewer}
            disabled={!roomName || !userName || !serverUrl || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? '🔄 Generating Token...' : '👁️ Join as Viewer'}
          </button>
        </div>

        {/* Instructions */}
        <div className="max-w-2xl mx-auto mt-12 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How to Test</h3>
          
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">1. Make sure your servers are running</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>LiveKit server at: {serverUrl}</li>
                <li>Django backend at: http://192.168.1.170:8000</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">2. Test with two browser windows</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Window 1: Start Broadcasting (this will be the streamer)</li>
                <li>Window 2: Join as Viewer (this will watch the stream)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">3. Test features</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Video/audio streaming</li>
                <li>Real-time chat</li>
                <li>Emoji reactions</li>
                <li>Viewer count</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">4. Troubleshooting</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Open browser developer tools to see any errors</li>
                <li>Check that both servers are accessible on your network</li>
                <li>Allow camera/microphone permissions when prompted</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="max-w-md mx-auto mt-8 text-center">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Connection Test</h4>
            <button
              onClick={testServerConnection}
              disabled={isLoading}
              className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 px-4 py-2 rounded text-sm"
            >
              {isLoading ? '🔄 Testing...' : '🔍 Test Server Connection'}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              This will check both Django backend and LiveKit server connectivity
            </p>
          </div>
        </div>

        {/* Quick Setup Reminder */}
        <div className="max-w-2xl mx-auto mt-8 bg-blue-900 bg-opacity-50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2">📋 Quick Setup Checklist:</h4>
          <ul className="space-y-1 text-blue-200">
            <li>✅ LiveKit server running on your network</li>
            <li>✅ Django backend: <code>python manage.py runserver 0.0.0.0:8000</code></li>
            <li>✅ React frontend: <code>npm run dev -- --host 0.0.0.0</code></li>
            <li>✅ Camera/microphone permissions enabled</li>
          </ul>
        </div>
      </div>
    </div>
  )
}



export default App