import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

// Import your components here
// import Home from './pages/Home'
// import Login from './pages/Login'
// import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      <div className="App">
        <header className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Livestream Platform</h1>
        </header>
        
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Welcome to Livestream Platform</h2>
                <p className="text-gray-600">Built with Vite + React + TypeScript + Tailwind</p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-100 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">⚡ Vite</h3>
                    <p>Lightning fast development</p>
                  </div>
                  <div className="bg-green-100 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">🎥 LiveKit</h3>
                    <p>Real-time video streaming</p>
                  </div>
                  <div className="bg-purple-100 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">🚀 WebRTC</h3>
                    <p>Million user capacity</p>
                  </div>
                </div>
              </div>
            } />
            {/* Add more routes here */}
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
