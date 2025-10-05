import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../shared.css';
import MapView from './MapView';
import './MapView.css';

const ChildStatus = ({ accessibilityMode }) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const [lastFallTime, setLastFallTime] = useState(null);
  const [proximityZone, setProximityZone] = useState('very_close');
  const [zoneColor, setZoneColor] = useState('#00ff00');
  const [previousZone, setPreviousZone] = useState('very_close');
  const [alertSpoken, setAlertSpoken] = useState({
    far: false,
    out_of_range: false
  });
  
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

  // Listen for server-sent events (location, fall, presence)
  useEffect(() => {
    const es = new EventSource('/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'location') {
          // update last known location and mark as connected
          if (data.lat && data.lng) {
            setLastKnownLocation(prev => ({ ...prev, lat: data.lat, lng: data.lng, address: data.address || prev.address }));
          }
          // Estimate distance from RSSI (very rough): max 200m mapping
          if (typeof data.rssi === 'number') {
            const est = Math.min(200, Math.max(0, 200 - Math.abs(data.rssi) * 2));
            setDistance(Math.round(est));
          }
          setIsConnected(true);
        } else if (data.type === 'fall') {
          setFallDetected(true);
          setLastFallTime(new Date());
          // clear fall state after 8s
          setTimeout(() => setFallDetected(false), 8000);
        } else if (data.type === 'presence') {
          setIsConnected(true);
        }
      } catch (err) {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      // If SSE fails, mark disconnected after a timeout
      setTimeout(() => setIsConnected(false), 3000);
    };

    return () => es.close();
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

  // Fetch device status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/status');
        const data = await response.json();
        
        if (data.device) {
          // Update connection status
          setIsConnected(data.device.connected);
          
          // Update proximity zone
          if (data.device.proximity_zone) {
            const newZone = data.device.proximity_zone;
            
            // Always update current zone and color first
            setProximityZone(newZone);
            setZoneColor(data.device.zone_color);
            
            // Only trigger alert if zone ACTUALLY CHANGED
            if (newZone !== previousZone) {
              console.log(`Zone changed: ${previousZone} → ${newZone}`);
              
              // Reset alert flags when returning to closer zones
              if (newZone === 'very_close' || newZone === 'near') {
                setAlertSpoken({ far: false, out_of_range: false });
                console.log('Reset alert flags');
              }
              
              // Check if entering FAR or OUT_OF_RANGE for the first time
              if (newZone === 'far' || newZone === 'out_of_range') {
                console.log(`Checking alert for ${newZone}, spoken:`, alertSpoken[newZone]);
                
                if (!alertSpoken[newZone]) {
                  console.log(`Playing alert for ${newZone}`);
                  
                  // Trigger audio alert ONCE
                  if ('speechSynthesis' in window) {
                    // Cancel any ongoing speech first
                    speechSynthesis.cancel();
                    
                    // Small delay to ensure cancel completes
                    setTimeout(() => {
                      const alertMessage = newZone === 'out_of_range' 
                        ? 'Alert! Child is out of range!' 
                        : 'Warning! Child is far away!';
                      const utterance = new SpeechSynthesisUtterance(alertMessage);
                      utterance.rate = 0.9;
                      utterance.volume = 1;
                      speechSynthesis.speak(utterance);
                      console.log('Alert spoken:', alertMessage);
                    }, 100);
                  }
                  
                  // Mark this alert as spoken
                  setAlertSpoken(prev => ({
                    ...prev,
                    [newZone]: true
                  }));
                }
              }
              
              // Update previous zone
              setPreviousZone(newZone);
            }
          }
          
          // Update location if available
          if (data.device.location && data.device.location.lat) {
            setLastKnownLocation({
              lat: data.device.location.lat,
              lng: data.device.location.lng,
              address: data.device.location.address || lastKnownLocation.address
            });
          }
          
          // Update distance and direction (even though we're using zones now)
          if (data.device.distance !== null) {
            setDistance(data.device.distance);
          }
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        // If backend is not reachable, mark as disconnected
        setIsConnected(false);
      }
    };
    
    // Fetch immediately
    fetchStatus();
    
    // Then fetch every 500ms for faster updates
    const interval = setInterval(fetchStatus, 500);
    
    return () => clearInterval(interval);
  }, [lastKnownLocation.address]);

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

        {/* Location Panel - Always show */}
        <div className="status-card location-card">
          <h2>Location</h2>
          
          {!isConnected && (
            <div className="location-alert">
              <span className="alert-text">Device Disconnected</span>
              <span className="alert-subtext">Showing last known location</span>
            </div>
          )}

          <div className="map-container" style={{ position: 'relative' }}>
            <iframe
              width="100%"
              height="400"
              frameBorder="0"
              style={{ border: 0, borderRadius: '8px' }}
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${lastKnownLocation.lat},${lastKnownLocation.lng}&zoom=15`}
              allowFullScreen
              title="Child Location Map"
            />
            {/* Proximity radius overlay */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: proximityZone === 'very_close' ? '40px' : 
                       proximityZone === 'near' ? '80px' : 
                       proximityZone === 'far' ? '120px' : '160px',
                height: proximityZone === 'very_close' ? '40px' : 
                        proximityZone === 'near' ? '80px' : 
                        proximityZone === 'far' ? '120px' : '160px',
                borderRadius: '50%',
                border: `4px solid ${zoneColor}`,
                backgroundColor: `${zoneColor}33`,
                pointerEvents: 'none',
                transition: 'all 0.5s ease'
              }}
            />
          </div>
          
          <div className="location-details">
            <div className="detail-item">
              <span className="label">Address:</span>
              <span className="value">{lastKnownLocation.address}</span>
            </div>
            <div className="detail-item">
              <span className="label">Proximity:</span>
              <span 
                className="value" 
                style={{ 
                  backgroundColor: zoneColor,
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontWeight: 'bold'
                }}
              >
                {proximityZone.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Direction:</span>
              <span className="value">{Math.round(direction)}°</span>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              onClick={handleSpeakLocation}
              onMouseEnter={() => handleHover('Tap to hear location details')}
              className="action-button speak-button" 
              title="Tap to hear location details"
            >
              Speak Location Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildStatus;