import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChildStatus.css';

const ChildStatus = ({ accessibilityMode }) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(true);
  const [audioLevel, setAudioLevel] = useState(45);
  const [distressDetected, setDistressDetected] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const [lastFallTime, setLastFallTime] = useState(null);

  // Announce page on load
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const status = isConnected ? 'connected' : 'disconnected';
      const utterance = new SpeechSynthesisUtterance(`Child Status page. Device is ${status}. Press Back to return to home.`);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Simulate real-time audio levels
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(prev => Math.max(20, Math.min(100, prev + (Math.random() - 0.5) * 10)));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Simulate distress detection
  useEffect(() => {
    if (audioLevel > 80) {
      setDistressDetected(true);
      if (accessibilityMode?.audio) {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Warning! Distress detected!');
          utterance.rate = 0.9;
          utterance.volume = 1;
          speechSynthesis.speak(utterance);
        }
      }
      if (accessibilityMode?.haptic && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } else {
      setDistressDetected(false);
    }
  }, [audioLevel, accessibilityMode]);

  const handleBack = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Going back to home');
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    navigate('/');
  };

  const handlePlayAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Playing last 10 seconds of audio');
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleReplayAccelerometer = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Replaying accelerometer data');
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="child-status">
      <button onClick={handleBack} className="back-button" aria-label="Go back to home">
        <span className="back-text">← Back to Home</span>
      </button>

      <h1 className="page-title">Child Status</h1>

      <div className="status-grid">
        {/* Connection Status */}
        <div className="status-card connection-card">
          <h2>Device Connection</h2>
          <div className="connection-info">
            <div className="child-name">
              <span className="label">Child:</span>
              <span className="value">Emma</span>
            </div>
            <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-light"></div>
              <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="battery-status">
              <span className="label">Battery:</span>
              <span className="value">85%</span>
            </div>
          </div>
        </div>

        {/* Audio Detection Panel */}
        <div className={`status-card audio-card ${distressDetected ? 'alert' : ''}`}>
          <h2>Audio Detection</h2>
          
          <div className="audio-visualizer">
            <div className="waveform">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    height: `${Math.max(10, audioLevel * 0.3 + Math.random() * 20)}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="audio-info">
              <div className="info-item">
                <span className="label">Sound Level:</span>
                <span className="value">{Math.round(audioLevel)} dB</span>
              </div>
              <div className="info-item">
                <span className="label">Frequency:</span>
                <span className="value">{Math.round(audioLevel * 2.5)} Hz</span>
              </div>
            </div>
          </div>

          {distressDetected && (
            <div className="distress-alert">
              <span className="alert-text">⚠️ DISTRESS DETECTED</span>
              <button onClick={handlePlayAudio} className="action-button alert-button">
                Play Last 10 Seconds
              </button>
            </div>
          )}
        </div>

        {/* Fall Detection Panel */}
        <div className="status-card fall-card">
          <h2>Fall Detection</h2>
          
          <div className="fall-status">
            <div className={`status-indicator ${fallDetected ? 'alert' : 'normal'}`}>
              <span className="status-text">
                {fallDetected ? '🔴 Possible Fall Detected' : '🟢 Normal Activity'}
              </span>
            </div>
            
            {lastFallTime && (
              <div className="fall-timestamp">
                <span className="label">Last fall:</span>
                <span className="value">{lastFallTime.toLocaleTimeString()}</span>
              </div>
            )}
            
            <button onClick={handleReplayAccelerometer} className="action-button">
              Replay Accelerometer Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildStatus;