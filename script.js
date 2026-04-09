// Smart Dustbin Monitor - Real-time IoT Dashboard
// Implements all features specified in README.md

// Global variables
let espIP = '192.168.1.100';
let alertThreshold = 80;
let refreshRate = 5;
let refreshInterval;
let totalReadings = 0;
let alertsSent = 0;
let startTime = Date.now();
let levelHistory = [];
let map, unifiedMap, routingControl;
let dustbinMarker, vehicleMarker;
let isDispatchActive = false;
let connectionStatus = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadSettings();
    initializeMaps();
    startDataRefresh();
    setupEventListeners();
    updateStatistics();
    addNotification('System initialized successfully', 'success');
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('dustbinSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        espIP = settings.espIP || '192.168.1.100';
        alertThreshold = settings.alertThreshold || 80;
        refreshRate = settings.refreshRate || 5;
        
        // Update UI elements
        document.getElementById('esp-ip').value = espIP;
        document.getElementById('alert-threshold').value = alertThreshold;
        document.getElementById('refresh-rate').value = refreshRate;
        document.getElementById('threshold-display').textContent = alertThreshold + '%';
    }
}

// Initialize Leaflet maps
function initializeMaps() {
    // Main tracking map
    map = L.map('map').setView([28.6139, 77.2090], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Unified route map
    unifiedMap = L.map('unified-map').setView([28.6139, 77.2090], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(unifiedMap);

    // Add markers
    dustbinMarker = L.marker([28.6139, 77.2090], {
        icon: L.divIcon({
            html: '<i class="fas fa-trash" style="color: #f44336; font-size: 20px;"></i>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        })
    }).addTo(map).bindPopup('Dustbin Location');

    vehicleMarker = L.marker([28.7041, 77.1025], {
        icon: L.divIcon({
            html: '<i class="fas fa-truck" style="color: #4caf50; font-size: 20px;"></i>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        })
    }).addTo(map).bindPopup('Vehicle Location');

    // Add markers to unified map
    dustbinMarker.clone = L.marker([28.6139, 77.2090], {
        icon: L.divIcon({
            html: '<i class="fas fa-trash" style="color: #f44336; font-size: 20px;"></i>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        })
    }).addTo(unifiedMap).bindPopup('Dustbin Location');

    vehicleMarker.clone = L.marker([28.7041, 77.1025], {
        icon: L.divIcon({
            html: '<i class="fas fa-truck" style="color: #4caf50; font-size: 20px;"></i>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        })
    }).addTo(unifiedMap).bindPopup('Vehicle Location');
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', function() {
        fetchSensorData();
        addNotification('Data refreshed manually', 'info');
    });

    // Clear notifications
    document.getElementById('clear-btn').addEventListener('click', function() {
        document.getElementById('notifications').innerHTML = '';
        addNotification('Notifications cleared', 'info');
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', function() {
        document.getElementById('settings-modal').style.display = 'block';
    });

    // Route calculation buttons
    document.getElementById('calculate-route').addEventListener('click', calculateRoute);
    document.getElementById('dispatch-vehicle').addEventListener('click', dispatchVehicle);
    document.getElementById('clear-route').addEventListener('click', clearRoute);

    // Map control buttons
    document.getElementById('zoom-in').addEventListener('click', () => unifiedMap.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => unifiedMap.zoomOut());
    document.getElementById('center-route').addEventListener('click', centerRoute);
    document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);

    // Dispatch buttons
    document.getElementById('dispatch-btn').addEventListener('click', dispatchVehicle);
    document.getElementById('complete-btn').addEventListener('click', completeDispatch);
    document.getElementById('cancel-btn').addEventListener('click', cancelDispatch);
}

// Start automatic data refresh
function startDataRefresh() {
    fetchSensorData();
    refreshInterval = setInterval(fetchSensorData, refreshRate * 1000);
}

// Fetch sensor data from ESP8266
async function fetchSensorData() {
    try {
        const response = await fetch(`http://${espIP}/data`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        updateDashboard(data);
        updateConnectionStatus(true);
        
        totalReadings++;
        levelHistory.push(data.level);
        if (levelHistory.length > 100) levelHistory.shift(); // Keep last 100 readings
        
        updateStatistics();
        checkAlerts(data);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus(false);
        // Fallback to simulation mode
        simulateData();
    }
}

// Update dashboard with sensor data
function updateDashboard(data) {
    // Update dustbin level visualization
    const levelPercentage = Math.round(data.level);
    document.getElementById('level-percentage').textContent = levelPercentage + '%';
    document.getElementById('level-progress').style.width = levelPercentage + '%';
    document.getElementById('dustbin-fill').style.height = levelPercentage + '%';
    
    // Update sensor data
    document.getElementById('distance-value').textContent = data.distance.toFixed(1) + ' cm';
    document.getElementById('fill-value').textContent = levelPercentage + '%';
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    
    // Update status
    let status = 'Empty';
    let statusClass = 'empty';
    if (levelPercentage >= 80) {
        status = 'Full';
        statusClass = 'full';
    } else if (levelPercentage >= 60) {
        status = 'Moderate';
        statusClass = 'moderate';
    } else if (levelPercentage >= 30) {
        status = 'Low';
        statusClass = 'low';
    }
    
    document.getElementById('level-status').textContent = status;
    document.getElementById('level-status').className = 'status ' + statusClass;
    
    // Update GPS locations if available
    if (data.dustbinLat && data.dustbinLng) {
        updateLocation('dustbin', data.dustbinLat, data.dustbinLng);
        document.getElementById('dustbin-location-input').value = `${data.dustbinLat.toFixed(4)}, ${data.dustbinLng.toFixed(4)}`;
        document.getElementById('dustbin-location').textContent = `${data.dustbinLat.toFixed(4)}, ${data.dustbinLng.toFixed(4)}`;
    }
    
    if (data.vehicleLat && data.vehicleLng) {
        updateLocation('vehicle', data.vehicleLat, data.vehicleLng);
        document.getElementById('vehicle-location-input').value = `${data.vehicleLat.toFixed(4)}, ${data.vehicleLng.toFixed(4)}`;
        document.getElementById('vehicle-location').textContent = `${data.vehicleLat.toFixed(4)}, ${data.vehicleLng.toFixed(4)}`;
    }
}

// Update location markers on maps
function updateLocation(type, lat, lng) {
    if (type === 'dustbin') {
        dustbinMarker.setLatLng([lat, lng]);
        if (dustbinMarker.clone) dustbinMarker.clone.setLatLng([lat, lng]);
    } else if (type === 'vehicle') {
        vehicleMarker.setLatLng([lat, lng]);
        if (vehicleMarker.clone) vehicleMarker.clone.setLatLng([lat, lng]);
    }
}

// Update connection status
function updateConnectionStatus(connected) {
    connectionStatus = connected;
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (connected) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Online';
    } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline';
    }
}

// Simulate data when ESP is not available
function simulateData() {
    const simulatedData = {
        distance: Math.random() * 25,
        level: Math.random() * 100,
        timestamp: Date.now(),
        dustbinLat: 28.6139,
        dustbinLng: 77.2090,
        vehicleLat: 28.7041,
        vehicleLng: 77.1025,
        gpsAvailable: true,
        status: 'Normal',
        alert: false
    };
    updateDashboard(simulatedData);
}

// Check for alerts
function checkAlerts(data) {
    const currentLevel = data.level;
    const alertIndicator = document.getElementById('alert-indicator');
    
    if (currentLevel >= alertThreshold) {
        alertIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Alert: Dustbin Full!</span>';
        alertIndicator.className = 'alert-indicator alert';
        
        if (!data.alert || data.alert === 'false') {
            addNotification('Dustbin is full! Dispatch required.', 'warning');
            alertsSent++;
        }
    } else {
        alertIndicator.innerHTML = '<i class="fas fa-check-circle"></i><span>Normal Operation</span>';
        alertIndicator.className = 'alert-indicator normal';
    }
}

// Update statistics
function updateStatistics() {
    document.getElementById('total-readings').textContent = totalReadings;
    
    if (levelHistory.length > 0) {
        const avgLevel = levelHistory.reduce((a, b) => a + b, 0) / levelHistory.length;
        document.getElementById('avg-level').textContent = Math.round(avgLevel) + '%';
    }
    
    document.getElementById('alerts-count').textContent = alertsSent;
    
    const uptime = Math.floor((Date.now() - startTime) / 3600000);
    document.getElementById('uptime').textContent = uptime + 'h';
}

// Add notification
function addNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification-item ${type}`;
    
    const icon = type === 'warning' ? 'exclamation-triangle' : 
                 type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'times-circle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    `;
    
    notifications.insertBefore(notification, notifications.firstChild);
    
    // Keep only last 10 notifications
    while (notifications.children.length > 10) {
        notifications.removeChild(notifications.lastChild);
    }
}

// Calculate route between vehicle and dustbin
function calculateRoute() {
    const vehicleLat = parseFloat(document.getElementById('vehicle-lat').value) || 28.7041;
    const vehicleLng = parseFloat(document.getElementById('vehicle-lng').value) || 77.1025;
    const dustbinLat = parseFloat(document.getElementById('dustbin-lat').value) || 28.6139;
    const dustbinLng = parseFloat(document.getElementById('dustbin-lng').value) || 77.2090;
    
    if (routingControl) {
        unifiedMap.removeControl(routingControl);
    }
    
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(vehicleLat, vehicleLng),
            L.latLng(dustbinLat, dustbinLng)
        ],
        routeWhileDragging: true,
        addWaypoints: false,
        createMarker: function(i, waypoint, n) {
            const marker = L.marker(waypoint.latLng, {
                icon: L.divIcon({
                    html: i === 0 ? 
                        '<i class="fas fa-truck" style="color: #4caf50; font-size: 20px;"></i>' :
                        '<i class="fas fa-trash" style="color: #f44336; font-size: 20px;"></i>',
                    iconSize: [20, 20],
                    className: 'custom-div-icon'
                })
            });
            return marker;
        }
    }).on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        // Update route summary
        document.getElementById('total-distance').textContent = (summary.totalDistance / 1000).toFixed(1) + ' km';
        document.getElementById('estimated-time').textContent = Math.round(summary.totalTime / 60) + ' min';
        document.getElementById('average-speed').textContent = Math.round((summary.totalDistance / 1000) / (summary.totalTime / 3600)) + ' km/h';
        
        // Show route details
        document.getElementById('route-details').style.display = 'block';
        document.getElementById('route-progress').style.display = 'block';
        
        addNotification('Route calculated successfully', 'success');
    }).addTo(unifiedMap);
}

// Dispatch vehicle
function dispatchVehicle() {
    if (isDispatchActive) {
        addNotification('Vehicle already dispatched', 'warning');
        return;
    }
    
    isDispatchActive = true;
    document.getElementById('dispatch-btn').disabled = true;
    document.getElementById('complete-btn').disabled = false;
    document.getElementById('cancel-btn').disabled = false;
    document.getElementById('active-dispatch').textContent = 'En Route';
    document.getElementById('dispatch-status').textContent = 'Active';
    document.getElementById('dispatch-status').className = 'status-value active';
    
    addNotification('Vehicle dispatched to dustbin location', 'success');
    
    // Simulate vehicle movement
    simulateVehicleMovement();
}

// Simulate vehicle movement along route
function simulateVehicleMovement() {
    let progress = 0;
    const interval = setInterval(() => {
        if (!isDispatchActive || progress >= 100) {
            clearInterval(interval);
            return;
        }
        
        progress += 5;
        document.getElementById('progress-percentage').textContent = progress + '%';
        document.getElementById('progress-fill').style.width = progress + '%';
        
        // Update vehicle position (simplified)
        const vehicleLat = parseFloat(document.getElementById('vehicle-lat').value) || 28.7041;
        const vehicleLng = parseFloat(document.getElementById('vehicle-lng').value) || 77.1025;
        const dustbinLat = parseFloat(document.getElementById('dustbin-lat').value) || 28.6139;
        const dustbinLng = parseFloat(document.getElementById('dustbin-lng').value) || 77.2090;
        
        const newLat = vehicleLat + (dustbinLat - vehicleLat) * (progress / 100);
        const newLng = vehicleLng + (dustbinLng - vehicleLng) * (progress / 100);
        
        updateLocation('vehicle', newLat, newLng);
        
    }, 1000);
}

// Complete dispatch
function completeDispatch() {
    isDispatchActive = false;
    document.getElementById('dispatch-btn').disabled = false;
    document.getElementById('complete-btn').disabled = true;
    document.getElementById('cancel-btn').disabled = true;
    document.getElementById('active-dispatch').textContent = 'Completed';
    document.getElementById('dispatch-status').textContent = 'Completed';
    document.getElementById('dispatch-status').className = 'status-value completed';
    document.getElementById('last-dispatch').textContent = new Date().toLocaleTimeString();
    
    addNotification('Vehicle dispatch completed successfully', 'success');
    
    // Reset progress
    document.getElementById('progress-percentage').textContent = '0%';
    document.getElementById('progress-fill').style.width = '0%';
}

// Cancel dispatch
function cancelDispatch() {
    isDispatchActive = false;
    document.getElementById('dispatch-btn').disabled = false;
    document.getElementById('complete-btn').disabled = true;
    document.getElementById('cancel-btn').disabled = true;
    document.getElementById('active-dispatch').textContent = 'Cancelled';
    document.getElementById('dispatch-status').textContent = 'Idle';
    document.getElementById('dispatch-status').className = 'status-value idle';
    
    addNotification('Vehicle dispatch cancelled', 'info');
    
    // Reset progress
    document.getElementById('progress-percentage').textContent = '0%';
    document.getElementById('progress-fill').style.width = '0%';
}

// Clear route
function clearRoute() {
    if (routingControl) {
        unifiedMap.removeControl(routingControl);
        routingControl = null;
    }
    
    document.getElementById('route-details').style.display = 'none';
    document.getElementById('route-progress').style.display = 'none';
    document.getElementById('total-distance').textContent = '-- km';
    document.getElementById('estimated-time').textContent = '-- min';
    document.getElementById('average-speed').textContent = '-- km/h';
    
    addNotification('Route cleared', 'info');
}

// Center route on map
function centerRoute() {
    if (routingControl) {
        unifiedMap.fitBounds(routingControl.getBounds());
    } else {
        unifiedMap.setView([28.6139, 77.2090], 13);
    }
}

// Toggle fullscreen
function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container-unified');
    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Settings functions
function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
    espIP = document.getElementById('esp-ip').value;
    alertThreshold = parseInt(document.getElementById('alert-threshold').value);
    refreshRate = parseInt(document.getElementById('refresh-rate').value);
    
    const settings = {
        espIP: espIP,
        alertThreshold: alertThreshold,
        refreshRate: refreshRate
    };
    
    localStorage.setItem('dustbinSettings', JSON.stringify(settings));
    
    // Update UI
    document.getElementById('threshold-display').textContent = alertThreshold + '%';
    
    // Restart data refresh with new rate
    clearInterval(refreshInterval);
    startDataRefresh();
    
    closeSettings();
    addNotification('Settings saved successfully', 'success');
}

// Test ESP connection
async function testESPConnection() {
    const statusDiv = document.getElementById('esp-status');
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing connection...';
    statusDiv.className = 'connection-status-message testing';
    
    try {
        const response = await fetch(`http://${espIP}/status`, { timeout: 5000 });
        if (response.ok) {
            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Connection successful!';
            statusDiv.className = 'connection-status-message success';
            addNotification('ESP8266 connection test successful', 'success');
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        statusDiv.innerHTML = '<i class="fas fa-times-circle"></i> Connection failed. Check IP address.';
        statusDiv.className = 'connection-status-message error';
        addNotification('ESP8266 connection test failed', 'error');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSettings();
    } else if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        fetchSensorData();
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (map) map.invalidateSize();
    if (unifiedMap) unifiedMap.invalidateSize();
});
