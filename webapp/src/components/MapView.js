import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MapView.css';

const MapView = ({ accessibilityMode }) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
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
      const status = isConnected ? 'connected and nearby' : `disconnected. Last seen at ${lastKnownLocation.address}. Distance: ${Math.round(distance)} meters`;
      const utterance = new SpeechSynthesisUtterance(`Map and Location page. Child is ${status}. Press Back to return to home.`);
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

  // Audio feedback for blind parents
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

  // Haptic feedback for deaf parents
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
    <div className="map-view">
      <button onClick={handleBack} className="back-button" aria-label="Go back to home">
        <span className="back-text">← Back to Home</span>
      </button>

      <h1 className="page-title">Map & Location</h1>

      {!isConnected ? (
        <div className="disconnected-view">
          <div className="alert-banner">
            <h2>Child Device Disconnected</h2>
            <p>Showing last known location</p>
          </div>

          <div className="map-card">
            <h3>Last Known Location</h3>
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

          <div className="distance-card">
            <h3>Distance Indicator</h3>
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
        </div>
      ) : (
        <div className="connected-view">
          <div className="connected-card">
            <h2>Child is Connected</h2>
            <p className="connected-message">Real-time location tracking is active</p>
            <div className="connected-emoji">✅</div>
            <div className="status-details">
              <div className="detail-item">
                <span className="label">Signal Strength:</span>
                <span className="value">Strong</span>
              </div>
              <div className="detail-item">
                <span className="label">Battery Level:</span>
                <span className="value">85%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;