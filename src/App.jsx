import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, MapPin, History, Check, Trash2 } from 'lucide-react';

const LuckyRadius = () => {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState([46.2396, 14.3569]);
  const [radius, setRadius] = useState(1000);
  const [marker, setMarker] = useState(null);
  const [luckyMarker, setLuckyMarker] = useState(null);
  const [circle, setCircle] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [challengeMarkers, setChallengeMarkers] = useState([]);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || map) return;

    const L = window.L;
    const newMap = L.map(mapRef.current).setView(center, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(newMap);

    const newMarker = L.marker(center, { 
      draggable: false,
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    }).addTo(newMap);

    const newCircle = L.circle(center, {
      radius: radius,
      color: '#3B82F6',
      fillColor: '#60A5FA',
      fillOpacity: 0.2,
      weight: 3
    }).addTo(newMap);

    setMap(newMap);
    setMarker(newMarker);
    setCircle(newCircle);

    try {
      const saved = localStorage.getItem('luckyRadiusChallenges');
      if (saved) {
        setChallenges(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading:', e);
    }

    return () => newMap.remove();
  }, [leafletLoaded]);

  useEffect(() => {
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
    }

    if (!isLocationLocked) {
      const handler = (e) => {
        const { lat, lng } = e.latlng;
        setCenter([lat, lng]);
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setIsLocationLocked(true);
      };
      
      clickHandlerRef.current = handler;
      map.on('click', handler);
    }

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current);
      }
    };
  }, [map, isLocationLocked, marker, circle]);

  const saveToStorage = (data) => {
    try {
      localStorage.setItem('luckyRadiusChallenges', JSON.stringify(data));
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useEffect(() => {
    if (circle) circle.setRadius(radius);
  }, [radius, circle]);

  useEffect(() => {
    if (marker && circle) {
      marker.setLatLng(center);
      circle.setLatLng(center);
    }
  }, [center, marker, circle]);

  useEffect(() => {
    if (!map || !window.L) return;

    const L = window.L;
    challengeMarkers.forEach(m => map.removeLayer(m));

    const newMarkers = challenges.map(challenge => {
      const iconUrl = challenge.completed 
        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';

      const markerIcon = L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const distance = challenge.distanceFromCenter;
      const distanceText = distance < 1000 
        ? `${Math.round(distance)}m` 
        : `${(distance / 1000).toFixed(2)}km`;

      const marker = L.marker([challenge.lat, challenge.lng], { icon: markerIcon })
        .bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 13px;">
            <strong style="color: ${challenge.completed ? '#10b981' : '#f59e0b'};">
              ${challenge.completed ? '✓ Completed' : '○ Pending'}
            </strong><br/>
            <strong>Distance:</strong> ${distanceText}<br/>
            <strong>Coordinates:</strong> ${challenge.lat.toFixed(6)}, ${challenge.lng.toFixed(6)}<br/>
            <small>${new Date(challenge.timestamp).toLocaleString()}</small>
          </div>
        `)
        .addTo(map);

      return marker;
    });

    setChallengeMarkers(newMarkers);
  }, [challenges, map, center]);

  const generateRandomPoint = () => {
    const radiusInDegrees = radius / 111320;
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * radiusInDegrees;
    const lat = center[0] + (r * Math.cos(angle));
    const lng = center[1] + (r * Math.sin(angle)) / Math.cos(center[0] * Math.PI / 180);
    return [lat, lng];
  };

  const handleImFeelingLucky = async () => {
    if (!map || !window.L) return;
    
    const L = window.L;
    const [lat, lng] = generateRandomPoint();
    
    if (luckyMarker) map.removeLayer(luckyMarker);
    
    const newLuckyMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    }).addTo(map);
    
    setLuckyMarker(newLuckyMarker);
    map.setView([lat, lng], 15);
    
    const distance = calculateDistance(center[0], center[1], lat, lng);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      const newChallenge = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        lat: lat,
        lng: lng,
        address: data.display_name || 'Unknown location',
        radius: radius,
        centerLat: center[0],
        centerLng: center[1],
        distanceFromCenter: distance,
        completed: false
      };
      
      const updated = [newChallenge, ...challenges];
      setChallenges(updated);
      saveToStorage(updated);
      
    } catch (error) {
      const newChallenge = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        lat: lat,
        lng: lng,
        address: 'Unknown location',
        radius: radius,
        centerLat: center[0],
        centerLng: center[1],
        distanceFromCenter: distance,
        completed: false
      };
      
      const updated = [newChallenge, ...challenges];
      setChallenges(updated);
      saveToStorage(updated);
    }
  };

  const completeChallenge = (id) => {
    const updated = challenges.map(ch => 
      ch.id === id ? { ...ch, completed: true } : ch
    );
    setChallenges(updated);
    saveToStorage(updated);
  };

  const deleteChallenge = (id) => {
    const updated = challenges.filter(ch => ch.id !== id);
    setChallenges(updated);
    saveToStorage(updated);
  };

  const toggleLocation = () => {
    setIsLocationLocked(!isLocationLocked);
  };

  if (!leafletLoaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#22c55e',
          borderRadius: '12px',
          padding: '24px',
          fontSize: '16px',
          fontWeight: '900',
          color: '#000',
          letterSpacing: '1px'
        }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        background: '#000',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #22c55e'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              background: '#fff',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#000'
            }}
          >
            {showPanel ? <X size={18} /> : <Menu size={18} />}
          </button>
          <MapPin size={20} />
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Lucky Radius</span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: '#22c55e',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#000',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={16} />
          {challenges.length}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {showPanel && (
          <div style={{
            width: window.innerWidth < 768 ? '100%' : '280px',
            position: window.innerWidth < 768 ? 'absolute' : 'relative',
            zIndex: 1000,
            height: '100%',
            background: '#000',
            borderRight: '2px solid #22c55e',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            gap: '12px',
            overflowY: 'auto'
          }}>
            <div style={{
              background: '#1a1a1a',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                marginBottom: '10px',
                color: '#fff',
                letterSpacing: '0.5px'
              }}>
                📍 LOCATION
              </div>
              <div style={{
                background: isLocationLocked ? '#1a1a1a' : '#0a2f1a',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '12px',
                fontWeight: '700',
                textAlign: 'center',
                color: isLocationLocked ? '#fff' : '#22c55e',
                border: `1px solid ${isLocationLocked ? '#555' : '#22c55e'}`
              }}>
                {isLocationLocked ? '🔒 LOCKED' : '🔓 CLICK MAP'}
              </div>
              <button
                onClick={toggleLocation}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: isLocationLocked ? '#fff' : '#22c55e',
                  color: isLocationLocked ? '#000' : '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.5px'
                }}
              >
                {isLocationLocked ? '🔓 UNLOCK' : '🔒 LOCK'}
              </button>
            </div>

            <div style={{
              background: '#1a1a1a',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                marginBottom: '10px',
                color: '#fff',
                letterSpacing: '0.5px'
              }}>
                ⭕ RADIUS: {radius}m
              </div>
              <input
                type="range"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                min="100"
                max="10000"
                step="100"
                style={{ 
                  width: '100%', 
                  marginBottom: '10px',
                  accentColor: '#22c55e'
                }}
              />
              <div style={{ 
                background: '#0a2f1a',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '11px',
                textAlign: 'center',
                color: '#22c55e',
                fontWeight: '700',
                border: '1px solid #22c55e'
              }}>
                AREA: {((Math.PI * radius * radius) / 1000000).toFixed(2)} km²
              </div>
            </div>

            <button
              onClick={handleImFeelingLucky}
              disabled={!isLocationLocked}
              style={{
                padding: '14px',
                background: isLocationLocked ? '#22c55e' : '#333',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '900',
                cursor: !isLocationLocked ? 'not-allowed' : 'pointer',
                opacity: isLocationLocked ? 1 : 0.5,
                letterSpacing: '1px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                🍀 I'M FEELING LUCKY! 🍀
              </div>
            </button>

            <div style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#999',
              border: '1px solid #333'
            }}>
              <div style={{ fontWeight: '700', marginBottom: '8px', color: '#fff' }}>LEGEND:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '11px' }}>Center</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '11px' }}>Lucky</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '11px' }}>Pending</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '11px' }}>Done</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {showHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '85vh',
            background: '#000',
            borderRadius: '12px',
            border: '2px solid #22c55e',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#22c55e',
              color: '#000',
              padding: '14px 16px',
              fontSize: '16px',
              fontWeight: '900',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              letterSpacing: '0.5px'
            }}>
              <span>📋 CHALLENGE HISTORY</span>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: '#000',
                  border: 'none',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ 
              padding: '16px',
              overflow: 'auto',
              flex: 1,
              background: '#000'
            }}>
              {challenges.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666',
                  fontSize: '13px'
                }}>
                  No challenges yet.<br/>Click "I'M FEELING LUCKY!" 🍀
                </div>
              ) : (
                [...challenges]
                  .sort((a, b) => {
                    if (a.completed === b.completed) return 0;
                    return a.completed ? 1 : -1;
                  })
                  .map((challenge) => {
                    const distance = challenge.distanceFromCenter;
                    const distanceText = distance < 1000 
                      ? `${Math.round(distance)}m` 
                      : `${(distance / 1000).toFixed(2)}km`;
                    
                    return (
                      <div
                        key={challenge.id}
                        style={{
                          background: '#1a1a1a',
                          borderRadius: '8px',
                          border: `2px solid ${challenge.completed ? '#22c55e' : '#fff'}`,
                          marginBottom: '12px',
                          padding: '14px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          marginBottom: '10px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <strong style={{ fontSize: '12px', color: '#fff' }}>
                            {new Date(challenge.timestamp).toLocaleString()}
                          </strong>
                          <span style={{
                            background: challenge.completed ? '#22c55e' : '#fff',
                            padding: '4px 10px',
                            fontSize: '10px',
                            borderRadius: '4px',
                            fontWeight: '900',
                            color: '#000',
                            letterSpacing: '0.5px'
                          }}>
                            {challenge.completed ? '✓ DONE' : '○ PENDING'}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          marginBottom: '12px',
                          color: '#999'
                        }}>
                          <strong style={{ color: '#fff' }}>Distance:</strong> {distanceText}<br />
                          <strong style={{ color: '#fff' }}>Radius:</strong> {challenge.radius}m
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {!challenge.completed && (
                            <button
                              onClick={() => completeChallenge(challenge.id)}
                              style={{
                                flex: 1,
                                minWidth: '100px',
                                padding: '10px',
                                background: '#22c55e',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '900',
                                color: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                letterSpacing: '0.5px'
                              }}
                            >
                              <Check size={14} />
                              COMPLETE
                            </button>
                          )}
                          <button
                            onClick={() => deleteChallenge(challenge.id)}
                            style={{
                              padding: '10px 14px',
                              background: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '900',
                              color: '#000',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              letterSpacing: '0.5px'
                            }}
                          >
                            <Trash2 size={14} />
                            DELETE
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyRadius;