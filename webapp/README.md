# GuardianLink - Children Safety Bracelet Dashboard

A comprehensive React-based web application for monitoring children's safety through a connected bracelet device.

## Features

### 🧒 Child Status Dashboard
- Real-time connection status monitoring
- Live audio detection with waveform visualization
- Distress detection with audio alerts
- Fall detection with accelerometer data
- Battery level and signal strength monitoring

### 📍 Map & Location View
- Last known location display when disconnected
- Navigation integration with Google Maps
- Distance and direction indicators
- Accessibility features for different user needs

### ⚙️ Settings & Configuration
- Bluetooth device pairing
- Alert preference customization
- Sensitivity controls for detection algorithms
- Accessibility mode toggles

### 🧠 Accessibility Features
- **Visual Mode**: Enhanced visual indicators, flashing alerts, progress animations
- **Audio Mode**: Text-to-speech alerts, directional sound cues, voice feedback
- **Haptic Mode**: Vibration patterns for notifications and proximity cues

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the webapp directory:
```bash
cd webapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Project Structure

```
webapp/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Header.css
│   │   ├── ChildStatus.js
│   │   ├── ChildStatus.css
│   │   ├── MapView.js
│   │   ├── MapView.css
│   │   ├── Settings.js
│   │   └── Settings.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Accessibility Features

### For Visually Impaired Parents
- Text-to-speech announcements for all alerts
- Audio navigation cues
- Voice feedback for location information
- High contrast mode support

### For Deaf Parents
- Visual flashing alerts
- Waveform displays for audio detection
- Progress animations and distance indicators
- Haptic vibration feedback

### For Parents with Both Impairments
- Comprehensive haptic feedback system
- Vibration patterns for different alert types
- Intensity controls for vibration strength

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Technologies Used

- React 18
- React Router
- Lucide React (icons)
- CSS3 with modern features
- Web APIs (Speech Synthesis, Vibration)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
