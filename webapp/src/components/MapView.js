import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../shared.css';
import './MapView.css';

const childIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ lat, lng }) {
  const center = [lat || 37.7749, lng || -122.4194];
  return (
    <div className="map-container">
      <MapContainer center={center} zoom={15} scrollWheelZoom={false} style={{ height: '240px', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lat && lng && (
          <Marker position={[lat, lng]} icon={childIcon}>
            <Popup>Child last seen here</Popup>
          </Marker>
        )}
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
