/**
 * Web Bluetooth API utilities for GuardianLink
 * Connects directly to ESP32 bracelet from browser
 */

class BluetoothManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.rssi = null;
    this.isConnected = false;
    this.onRSSIUpdate = null;
    this.onConnectionChange = null;
  }

  /**
   * Check if Web Bluetooth is supported
   */
  isSupported() {
    if (!navigator.bluetooth) {
      console.error('Web Bluetooth API is not supported in this browser.');
      return false;
    }
    return true;
  }

  /**
   * Connect to GuardianLink bracelet
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth not supported');
    }

    try {
      console.log('Requesting Bluetooth Device...');
      
      // Request device with name filter
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'GuardianLink' },
          { namePrefix: 'Guardian' }
        ],
        optionalServices: ['battery_service'] // Add any services you need
      });

      console.log('Device found:', this.device.name);

      // Listen for disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        this.isConnected = false;
        if (this.onConnectionChange) {
          this.onConnectionChange(false);
        }
      });

      // Connect to GATT server
      console.log('Connecting to GATT Server...');
      this.server = await this.device.gatt.connect();
      
      this.isConnected = true;
      console.log('Connected to GATT Server');

      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }

      // Start RSSI monitoring
      this.startRSSIMonitoring();

      return {
        success: true,
        device: this.device.name,
        id: this.device.id
      };

    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from device
   */
  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
      console.log('Disconnected from device');
    }
    this.isConnected = false;
    this.device = null;
    this.server = null;
  }

  /**
   * Monitor RSSI (signal strength)
   * Note: Web Bluetooth API doesn't directly expose RSSI
   * This is a workaround using the backend API
   */
  startRSSIMonitoring() {
    // Poll RSSI from backend every 2 seconds
    this.rssiInterval = setInterval(async () => {
      if (this.isConnected) {
        try {
          const response = await fetch('http://localhost:5001/api/status');
          const data = await response.json();
          
          if (data.device.rssi) {
            this.rssi = data.device.rssi;
            
            if (this.onRSSIUpdate) {
              this.onRSSIUpdate({
                rssi: data.device.rssi,
                distance: data.device.distance,
                connected: data.device.connected
              });
            }
          }
        } catch (error) {
          console.error('Error fetching RSSI:', error);
        }
      }
    }, 2000);
  }

  /**
   * Stop RSSI monitoring
   */
  stopRSSIMonitoring() {
    if (this.rssiInterval) {
      clearInterval(this.rssiInterval);
    }
  }

  /**
   * Get current RSSI value
   */
  getRSSI() {
    return this.rssi;
  }

  /**
   * Check if device is connected
   */
  getConnectionStatus() {
    return this.isConnected && this.device && this.device.gatt.connected;
  }
}

// Export singleton instance
export const bluetoothManager = new BluetoothManager();
export default bluetoothManager;
