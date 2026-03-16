import { useState } from 'react'
import Register from './pages/Register'
import Log from './pages/Log'
import Header from './components/Header'
import './styles/App.css'

function App() {
  const [isRegister, setIsRegister] = useState(true)

  return (
    <div className="App">
      <Header />
      <main className="main-content">
        {isRegister ? (
          <Register onToggle={() => setIsRegister(false)} />
        ) : (
          <Log onToggle={() => setIsRegister(true)} />
        )}
      </main>
    </div>
  )
}

export default App