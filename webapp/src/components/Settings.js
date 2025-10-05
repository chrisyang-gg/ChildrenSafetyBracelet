import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bluetoothManager from '../utils/bluetooth';
import '../shared.css';

const Settings = ({ accessibilityMode, setAccessibilityMode }) => {
  const navigate = useNavigate();
  const [childName, setChildName] = useState('Emma');
  const [deviceSettings, setDeviceSettings] = useState({
    isPaired: false,
    batteryLevel: 85,
    signalStrength: 'Strong'
  });

  const [alertSettings, setAlertSettings] = useState({
    audio: true,
    vibration: true,
    visual: true
  });

  // Fetch device status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/status');
        const data = await response.json();
        
        if (data.device) {
          setDeviceSettings(prev => ({
            ...prev,
            isPaired: data.device.connected,
            batteryLevel: data.device.battery || 85
          }));
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };
    
    // Fetch immediately
    fetchStatus();
    
    // Then fetch every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Announce page once on load
  useEffect(() => {
    let spoken = false;
    
    if ('speechSynthesis' in window && !spoken) {
      spoken = true;
      const pairStatus = deviceSettings.isPaired ? 'connected' : 'not connected';
      // Small delay to prevent double speech in StrictMode
      const timer = setTimeout(() => {
        speechSynthesis.cancel(); // Clear any pending speech
        const utterance = new SpeechSynthesisUtterance(`Settings page. Device is ${pairStatus}.`);
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        speechSynthesis.cancel();
      };
    }
  }, []); // Only on mount

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
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    navigate('/');
  };

  const handlePairDevice = async () => {
    const currentStatus = deviceSettings.isPaired;
    
    if (!currentStatus) {
      // Connect to Bluetooth
      try {
        if (!bluetoothManager.isSupported()) {
          alert('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
          return;
        }

        // Show connection dialog
        const result = await bluetoothManager.connect();
        
        // Update state
        setDeviceSettings(prev => ({
          ...prev,
          isPaired: true
        }));
        
        // Set up RSSI monitoring
        bluetoothManager.onRSSIUpdate = (data) => {
          setDeviceSettings(prev => ({
            ...prev,
            isPaired: data.connected
          }));
        };
        
        bluetoothManager.onConnectionChange = (connected) => {
          setDeviceSettings(prev => ({
            ...prev,
            isPaired: connected
          }));
          
          if ('speechSynthesis' in window) {
            const message = connected ? 'Device connected' : 'Device disconnected';
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
          }
        };
        
        // Announce success
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Device connected successfully');
          utterance.rate = 0.8;
          speechSynthesis.speak(utterance);
        }
        
      } catch (error) {
        console.error('Bluetooth connection error:', error);
        
        // Announce error
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Connection failed. Please try again.');
          utterance.rate = 0.8;
          speechSynthesis.speak(utterance);
        }
        
        alert('Failed to connect: ' + error.message);
      }
    } else {
      // Disconnect
      bluetoothManager.disconnect();
      bluetoothManager.stopRSSIMonitoring();
      
      setDeviceSettings(prev => ({
        ...prev,
        isPaired: false
      }));
      
      // Announce disconnection
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Device disconnected');
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }
    }
  };

  const handleRecalibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  };

  const handleAlertToggle = (setting) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <div className="settings">
      <button 
        onClick={handleBack}
        onMouseEnter={() => handleHover('Tap to go back to Home')}
        className="back-button" 
        aria-label="Go back to home" 
        title="Tap to go back to Home"
      >
        <span className="back-text">← Back to Home</span>
      </button>

      <h1 className="page-title">Settings</h1>

      <div className="settings-grid">
        {/* Child Information Section */}
        <div className="settings-card">
          <h2>Child Information</h2>
          
          <div className="child-name-input">
            <label htmlFor="childName" className="input-label">
              Child's Name:
            </label>
            <input
              id="childName"
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="name-input"
              placeholder="Enter child's name"
            />
          </div>
        </div>

        {/* Device Pairing Section */}
        <div className="settings-card">
          <h2>Device Pairing</h2>
          
          <div className="device-status">
            <div className="status-item">
              <span className="label">Connection:</span>
              <span className={`value ${deviceSettings.isPaired ? 'connected' : 'disconnected'}`}>
                {deviceSettings.isPaired ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Battery:</span>
              <span className="value">{deviceSettings.batteryLevel}%</span>
            </div>
            
            <div className="status-item">
              <span className="label">Signal:</span>
              <span className="value">{deviceSettings.signalStrength}</span>
            </div>

            <div className="status-item">
              <span className="label">Bluetooth Range:</span>
              <span className="value">~30m typical</span>
            </div>
          </div>

          <div className="device-actions">
            <button 
              onClick={handlePairDevice}
              onMouseEnter={() => handleHover(deviceSettings.isPaired ? 'Tap to disconnect device' : 'Tap to connect device via Bluetooth')}
              className={`action-button pair-button ${deviceSettings.isPaired ? 'connected' : 'disconnected'}`}
              title={deviceSettings.isPaired ? 'Tap to disconnect device' : 'Tap to connect device via Bluetooth'}
            >
              {deviceSettings.isPaired ? 'Disconnect Device' : 'Connect via Bluetooth'}
            </button>
            
            <button 
              onClick={handleRecalibrate}
              onMouseEnter={() => handleHover('Tap to recalibrate fall detection sensor')}
              className="action-button recalibrate-button"
              disabled={!deviceSettings.isPaired}
              title="Tap to recalibrate fall detection sensor"
            >
              Recalibrate Accelerometer
            </button>
          </div>
        </div>

        {/* Alert Preferences Section */}
        <div className="settings-card">
          <h2>Alert Preferences</h2>
          
          <div className="alert-toggles">
            <div className="toggle-item">
              <label>
                <input
                  type="checkbox"
                  checked={alertSettings.audio}
                  onChange={() => handleAlertToggle('audio')}
                />
                <span className="toggle-label">Audio Alerts</span>
              </label>
            </div>
            
            <div className="toggle-item">
              <label>
                <input
                  type="checkbox"
                  checked={alertSettings.visual}
                  onChange={() => handleAlertToggle('visual')}
                />
                <span className="toggle-label">Visual Alerts</span>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;