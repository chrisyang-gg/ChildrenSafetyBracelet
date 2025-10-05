import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../shared.css';

const Home = () => {
  const navigate = useNavigate();

  // Announce page once on load
  useEffect(() => {
    let spoken = false;
    
    if ('speechSynthesis' in window && !spoken) {
      spoken = true;
      // Small delay to prevent double speech in StrictMode
      const timer = setTimeout(() => {
        speechSynthesis.cancel(); // Clear any pending speech
        const utterance = new SpeechSynthesisUtterance('GuardianLink Home. Select Child Status or Settings.');
        utterance.rate = 0.8;
        utterance.volume = 1;
        speechSynthesis.speak(utterance);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        speechSynthesis.cancel();
      };
    }
  }, []);

  const handleNavigation = (path) => {
    // Haptic feedback only
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    navigate(path);
  };

  const handleHover = (message) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="home">
      <div className="header-container">
        <img 
          src="/guardianlink.png" 
          alt="GuardianLink Logo" 
          className="app-logo-small"
        />
        <h1 className="app-title">GuardianLink</h1>
      </div>
      
      <div className="home-grid">
        <button
          className="home-button child-status-button"
          onClick={() => handleNavigation('/child-status')}
          onMouseEnter={() => handleHover('Tap to continue to Child Status')}
          aria-label="Child Status - Monitor your child's safety and location"
          title="Tap to continue to Child Status"
        >
          <span className="button-text">Child Status</span>
          <span className="button-description">Monitor your child's safety and location</span>
        </button>

        <button
          className="home-button settings-button"
          onClick={() => handleNavigation('/settings')}
          onMouseEnter={() => handleHover('Tap to continue to Settings')}
          aria-label="Settings - Configure device and alerts"
          title="Tap to continue to Settings"
        >
          <span className="button-text">Settings</span>
          <span className="button-description">Configure device and alerts</span>
        </button>
      </div>
    </div>
  );
};

export default Home;