import React, { useState } from 'react';
import ChildStatus from './components/ChildStatus';
import './App.css';

function App() {
  const [accessibilityMode, setAccessibilityMode] = useState({
    visual: true,
    audio: true,
    haptic: true
  });

  return (
    <div className="App">
      <main className="main-content">
        <ChildStatus accessibilityMode={accessibilityMode} />
      </main>
    </div>
  );
}

export default App;