import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = ({ accessibilityMode, setAccessibilityMode }) => {
  const navigate = useNavigate();
  const [deviceSettings, setDeviceSettings] = useState({
    isPaired: false,
    batteryLevel: 85,
    signalStrength: 'Strong'
  });

  const [alertSettings, setAlertSettings] = useState({
    audio: true,
    vibration: true,
    visual: true,
    screamThreshold: 75,
    fallSensitivity: 50
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState({
    voiceSpeed: 0.8,
    vibrationIntensity: 5,
    highContrast: false
  });

  // Announce page on load
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const pairStatus = deviceSettings.isPaired ? 'paired' : 'not paired';
      const utterance = new SpeechSynthesisUtterance(`Settings page. Device is ${pairStatus}. Press Back to return to home.`);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, []);

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

  const handlePairDevice = () => {
    const newPairStatus = !deviceSettings.isPaired;
    setDeviceSettings(prev => ({
      ...prev,
      isPaired: newPairStatus
    }));
    
    if (accessibilityMode?.audio) {
      const message = newPairStatus ? 'Device connected successfully' : 'Device disconnected';
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = accessibilitySettings.voiceSpeed;
        speechSynthesis.speak(utterance);
      }
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(newPairStatus ? [100, 50, 100] : 200);
    }
  };

  const handleRecalibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Accelerometer recalibrated');
      utterance.rate = accessibilitySettings.voiceSpeed;
      speechSynthesis.speak(utterance);
    }
  };

  const handleAlertToggle = (setting) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSliderChange = (setting, value) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: parseInt(value)
    }));
  };

  const handleAccessibilityToggle = (mode) => {
    setAccessibilityMode(prev => ({
      ...prev,
      [mode]: !prev[mode]
    }));
    
    if ('speechSynthesis' in window) {
      const status = !accessibilityMode[mode] ? 'enabled' : 'disabled';
      const utterance = new SpeechSynthesisUtterance(`${mode} mode ${status}`);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleAccessibilitySettingChange = (setting, value) => {
    setAccessibilitySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="settings">
      <button onClick={handleBack} className="back-button" aria-label="Go back to home">
        <span className="back-text">← Back to Home</span>
      </button>

      <h1 className="page-title">Settings</h1>

      <div className="settings-grid">
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
          </div>

          <div className="device-actions">
            <button 
              onClick={handlePairDevice}
              className={`action-button pair-button ${deviceSettings.isPaired ? 'connected' : 'disconnected'}`}
            >
              {deviceSettings.isPaired ? 'Disconnect Device' : 'Connect via Bluetooth'}
            </button>
            
            <button 
              onClick={handleRecalibrate}
              className="action-button recalibrate-button"
              disabled={!deviceSettings.isPaired}
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
                  checked={alertSettings.vibration}
                  onChange={() => handleAlertToggle('vibration')}
                />
                <span className="toggle-label">Vibration Alerts</span>
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

          <div className="sensitivity-controls">
            <div className="slider-control">
              <label className="slider-label">
                Scream Detection: {alertSettings.screamThreshold} dB
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={alertSettings.screamThreshold}
                onChange={(e) => handleSliderChange('screamThreshold', e.target.value)}
                className="slider"
              />
            </div>
            
            <div className="slider-control">
              <label className="slider-label">
                Fall Sensitivity: {alertSettings.fallSensitivity}%
              </label>
              <input
                type="range"
                min="20"
                max="80"
                value={alertSettings.fallSensitivity}
                onChange={(e) => handleSliderChange('fallSensitivity', e.target.value)}
                className="slider"
              />
            </div>
          </div>
        </div>

        {/* Accessibility Customization Section */}
        <div className="settings-card">
          <h2>Accessibility</h2>
          
          <div className="accessibility-modes">
            <button
              className={`mode-button ${accessibilityMode?.visual ? 'active' : ''}`}
              onClick={() => handleAccessibilityToggle('visual')}
            >
              Visual Mode
            </button>
            
            <button
              className={`mode-button ${accessibilityMode?.audio ? 'active' : ''}`}
              onClick={() => handleAccessibilityToggle('audio')}
            >
              Audio Mode
            </button>
            
            <button
              className={`mode-button ${accessibilityMode?.haptic ? 'active' : ''}`}
              onClick={() => handleAccessibilityToggle('haptic')}
            >
              Haptic Mode
            </button>
          </div>

          <div className="accessibility-settings">
            <div className="slider-control">
              <label className="slider-label">
                Voice Speed: {accessibilitySettings.voiceSpeed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={accessibilitySettings.voiceSpeed}
                onChange={(e) => handleAccessibilitySettingChange('voiceSpeed', parseFloat(e.target.value))}
                className="slider"
              />
            </div>
            
            <div className="slider-control">
              <label className="slider-label">
                Vibration Intensity: {accessibilitySettings.vibrationIntensity}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={accessibilitySettings.vibrationIntensity}
                onChange={(e) => handleAccessibilitySettingChange('vibrationIntensity', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            
            <div className="toggle-item">
              <label>
                <input
                  type="checkbox"
                  checked={accessibilitySettings.highContrast}
                  onChange={(e) => handleAccessibilitySettingChange('highContrast', e.target.checked)}
                />
                <span className="toggle-label">High Contrast Mode</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;