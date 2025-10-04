import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ChildStatus from './components/ChildStatus';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [accessibilityMode, setAccessibilityMode] = useState({
    visual: true,
    audio: true,
    haptic: true
  });

  return (
    <Router>
      <div className="App">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/child-status" element={<ChildStatus accessibilityMode={accessibilityMode} />} />
            <Route path="/settings" element={<Settings accessibilityMode={accessibilityMode} setAccessibilityMode={setAccessibilityMode} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;