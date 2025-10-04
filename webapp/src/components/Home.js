import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigation = (path, label) => {
    // Audio feedback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Opening ${label}`);
      utterance.rate = 0.8;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    navigate(path);
  };

  // Announce page on load
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('GuardianLink. Select an option. Child Status, Map and Location, or Settings.');
      utterance.rate = 0.8;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
  }, []);

  return (
    <div className="home">
      <h1 className="app-title">GuardianLink</h1>
      
      <div className="home-grid">
        <button
          className="home-button child-status-button"
          onClick={() => handleNavigation('/child-status', 'Child Status')}
          aria-label="Child Status - Monitor your child's safety in real-time"
        >
          <span className="button-text">Child Status</span>
          <span className="button-description">Monitor your child's safety in real-time</span>
        </button>

        <button
          className="home-button map-button"
          onClick={() => handleNavigation('/map', 'Map and Location')}
          aria-label="Map and Location - View your child's location"
        >
          <span className="button-text">Map & Location</span>
          <span className="button-description">View your child's location</span>
        </button>

        <button
          className="home-button settings-button"
          onClick={() => handleNavigation('/settings', 'Settings')}
          aria-label="Settings - Configure device and alerts"
        >
          <span className="button-text">Settings</span>
          <span className="button-description">Configure device and alerts</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
