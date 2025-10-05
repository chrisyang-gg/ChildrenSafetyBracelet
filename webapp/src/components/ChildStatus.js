import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../shared.css';

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
  
  // Location data - will be set to user's current location
  const [lastKnownLocation, setLastKnownLocation] = useState({
    lat: 37.7749,
    lng: -122.4194,
    address: "Locating..." // Will be updated with reverse geocoding
  });
  const [distance, setDistance] = useState(0); // 0 when not connected
  const [direction, setDirection] = useState(0); // 0 when not connected

  // Get user's current location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLastKnownLocation(prev => ({
            ...prev,
            lat: latitude,
            lng: longitude
          }));
          
          // Reverse geocode to get address
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`)
            .then(res => res.json())
            .then(data => {
              if (data.results && data.results[0]) {
                setLastKnownLocation(prev => ({
                  ...prev,
                  address: data.results[0].formatted_address
                }));
              }
            })
            .catch(err => {
              console.error('Geocoding error:', err);
              setLastKnownLocation(prev => ({
                ...prev,
                address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              }));
            });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLastKnownLocation(prev => ({
            ...prev,
            address: "Location access denied"
          }));
        }
      );
    }
  }, []);

  // Announce page once on load
  useEffect(() => {
    let spoken = false;
    
    if ('speechSynthesis' in window && !spoken) {
      spoken = true;
      const status = isConnected ? 'connected' : 'disconnected';
      // Small delay to prevent double speech in StrictMode
      const timer = setTimeout(() => {
        speechSynthesis.cancel(); // Clear any pending speech
        const utterance = new SpeechSynthesisUtterance(`Child Status page. Device is ${status}.`);
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        speechSynthesis.cancel();
      };
    }
  }, []); // Only on mount, not when connection changes

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



  const handleHover = (message) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleReplayAccelerometer = () => {
    // Replay accelerometer data
  };

  const handleSpeakLocation = () => {
    if ('speechSynthesis' in window) {
      const distanceRounded = Math.round(distance);
      const directionRounded = Math.round(direction);
      
      // Convert direction to more natural language
      let directionText = '';
      if (directionRounded >= 337.5 || directionRounded < 22.5) directionText = 'north';
      else if (directionRounded >= 22.5 && directionRounded < 67.5) directionText = 'northeast';
      else if (directionRounded >= 67.5 && directionRounded < 112.5) directionText = 'east';
      else if (directionRounded >= 112.5 && directionRounded < 157.5) directionText = 'southeast';
      else if (directionRounded >= 157.5 && directionRounded < 202.5) directionText = 'south';
      else if (directionRounded >= 202.5 && directionRounded < 247.5) directionText = 'southwest';
      else if (directionRounded >= 247.5 && directionRounded < 292.5) directionText = 'west';
      else directionText = 'northwest';
      
      // Break into separate lines with pauses
      const line1 = `Child last seen at ${lastKnownLocation.address}.`;
      const line2 = `${distanceRounded} meters away from you.`;
      const line3 = `Heading ${directionText}.`;
      
      // Speak first line
      const utterance1 = new SpeechSynthesisUtterance(line1);
      utterance1.rate = 0.8;
      speechSynthesis.speak(utterance1);
      
      // Wait for first line to finish + 500ms pause, then speak second line
      utterance1.onend = () => {
        setTimeout(() => {
          const utterance2 = new SpeechSynthesisUtterance(line2);
          utterance2.rate = 0.8;
          speechSynthesis.speak(utterance2);
          
          // Wait for second line to finish + 500ms pause, then speak third line
          utterance2.onend = () => {
            setTimeout(() => {
              const utterance3 = new SpeechSynthesisUtterance(line3);
              utterance3.rate = 0.8;
              speechSynthesis.speak(utterance3);
            }, 500);
          };
        }, 500);
      };
    }
  };

  return (
    <div className="child-status">
      <button 
        onClick={handleBack} 
        onMouseEnter={() => handleHover('Tap to go back to Home')}
        className="back-button" 
        aria-label="Go back to home" 
        title="Tap to go back to Home"
      >
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
                {fallDetected ? 'Possible Fall Detected' : 'Normal Activity'}
              </span>
            </div>
            
            {lastFallTime && (
              <div className="fall-timestamp">
                <span className="label">Last fall:</span>
                <span className="value">{lastFallTime.toLocaleTimeString()}</span>
              </div>
            )}
            
            <button 
              onClick={handleReplayAccelerometer}
              onMouseEnter={() => handleHover('Tap to replay fall data')}
              className="action-button" 
              title="Tap to replay fall data"
            >
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