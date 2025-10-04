import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../shared.css';

const ChildStatus = ({ accessibilityMode }) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const [lastFallTime, setLastFallTime] = useState(null);
  
  // Location data
  const [lastKnownLocation, setLastKnownLocation] = useState({
    lat: 37.7749,
    lng: -122.4194,
    address: "123 Main Street, San Francisco, California"
  });
  const [distance, setDistance] = useState(150);
  const [direction, setDirection] = useState(45);

  // Announce page on load
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const status = isConnected ? 'connected' : 'disconnected';
      const utterance = new SpeechSynthesisUtterance(`Child Status page. Device is ${status}. Press Back to return to home.`);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Simulate location updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDistance(prev => Math.max(0, prev + (Math.random() - 0.5) * 10));
      setDirection(prev => (prev + (Math.random() - 0.5) * 20) % 360);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Audio feedback for location when disconnected
  useEffect(() => {
    if (accessibilityMode?.audio && !isConnected) {
      const speakLocation = () => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            `Child last seen at ${lastKnownLocation.address}. Distance: ${Math.round(distance)} meters. Direction: ${Math.round(direction)} degrees.`
          );
          utterance.rate = 0.8;
          speechSynthesis.speak(utterance);
        }
      };

      const interval = setInterval(speakLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [accessibilityMode, isConnected, lastKnownLocation.address, distance, direction]);

  // Haptic feedback when disconnected
  useEffect(() => {
    if (accessibilityMode?.haptic && !isConnected) {
      const vibratePattern = () => {
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      };

      const interval = setInterval(vibratePattern, 5000);
      return () => clearInterval(interval);
    }
  }, [accessibilityMode, isConnected]);

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

  const handleNavigate = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Opening navigation to child location');
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lastKnownLocation.lat},${lastKnownLocation.lng}`;
    window.open(url, '_blank');
  };

  const handleSpeakLocation = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Child last seen at ${lastKnownLocation.address}. Coordinates: ${lastKnownLocation.lat.toFixed(4)}, ${lastKnownLocation.lng.toFixed(4)}. Distance: ${Math.round(distance)} meters. Direction: ${Math.round(direction)} degrees.`
      );
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

        {/* Location Panel - Only show when disconnected */}
        {!isConnected && (
          <>
            <div className="status-card location-card">
              <h2>Last Known Location</h2>
              
              <div className="location-alert">
                <span className="alert-text">⚠️ Device Disconnected</span>
                <span className="alert-subtext">Showing last known location</span>
              </div>

              <div className="map-placeholder">
                <span className="map-emoji">📍</span>
                <span className="map-label">Child Last Seen Here</span>
              </div>
              
              <div className="location-details">
                <div className="detail-item">
                  <span className="label">Address:</span>
                  <span className="value">{lastKnownLocation.address}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Coordinates:</span>
                  <span className="value">{lastKnownLocation.lat.toFixed(4)}, {lastKnownLocation.lng.toFixed(4)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Distance:</span>
                  <span className="value">{Math.round(distance)} meters</span>
                </div>
                <div className="detail-item">
                  <span className="label">Direction:</span>
                  <span className="value">{Math.round(direction)}°</span>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={handleNavigate} className="action-button navigate-button">
                  Navigate to Location
                </button>
                
                <button onClick={handleSpeakLocation} className="action-button speak-button">
                  Speak Location Details
                </button>
              </div>
            </div>

            <div className="status-card distance-card">
              <h2>Distance Indicator</h2>
              <div className="distance-bar">
                <div 
                  className="distance-fill" 
                  style={{ width: `${Math.min(100, (distance / 200) * 100)}%` }}
                />
              </div>
              <div className="distance-text">
                {Math.round(distance)}m away
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChildStatus;