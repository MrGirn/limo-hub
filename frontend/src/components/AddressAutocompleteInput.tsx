import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

export interface PlacePrediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
  category?: 'AIRPORT' | 'HOTEL' | 'TRAIN_STATION' | 'LANDMARK' | 'GENERAL';
  airport_code?: string | null;
  lat?: number;
  lng?: number;
  country?: string;
  source?: string;
}

interface AddressAutocompleteInputProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: PlacePrediction) => void;
  countryCode?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  id,
  label,
  placeholder = "Enter street address, international airport (e.g. JFK, LHR), hotel...",
  value,
  onChange,
  onSelectPlace,
  countryCode,
  required = false,
  className = "",
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 4 Close Local Regional Hubs (Philadelphia & NYC Metro)
  const LOCAL_HUBS: PlacePrediction[] = [
    { description: 'Philadelphia International Airport (PHL), PA, USA', place_id: 'phl_air', main_text: 'Philadelphia International Airport (PHL)', secondary_text: 'Philadelphia, PA, USA', category: 'AIRPORT', airport_code: 'PHL' },
    { description: 'John F. Kennedy International Airport (JFK), Queens, NY, USA', place_id: 'jfk_air', main_text: 'John F. Kennedy International Airport (JFK)', secondary_text: 'Queens, NY, USA', category: 'AIRPORT', airport_code: 'JFK' },
    { description: 'Newark Liberty International Airport (EWR), Newark, NJ, USA', place_id: 'ewr_air', main_text: 'Newark Liberty International Airport (EWR)', secondary_text: 'Newark, NJ, USA', category: 'AIRPORT', airport_code: 'EWR' },
    { description: 'LaGuardia Airport (LGA), Queens, NY, USA', place_id: 'lga_air', main_text: 'LaGuardia Airport (LGA)', secondary_text: 'Queens, NY, USA', category: 'AIRPORT', airport_code: 'LGA' }
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSuggestions(LOCAL_HUBS);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/v1/maps/places-autocomplete?q=${encodeURIComponent(query.trim())}`;
      if (countryCode) {
        url += `&country=${encodeURIComponent(countryCode)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data: PlacePrediction[] = await res.json();
        setSuggestions(data.slice(0, 5));
        setIsOpen(data.length > 0);
      }
    } catch (err) {
      console.warn("Places autocomplete query error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newVal.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newVal);
      }, 150);
    } else {
      setSuggestions(LOCAL_HUBS);
      setIsOpen(true);
    }
  };

  const handleSelect = (place: PlacePrediction) => {
    onChange(place.description);
    setIsOpen(false);
    setSuggestions([]);
    if (onSelectPlace) {
      onSelectPlace(place);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setSuggestions(LOCAL_HUBS);
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'AIRPORT':
        return '🛫';
      case 'HOTEL':
        return '🏨';
      case 'TRAIN_STATION':
        return '🚆';
      case 'LANDMARK':
        return '🏛️';
      default:
        return '📍';
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        zIndex: isOpen ? 9999 : 1 
      }} 
      className={className}
    >
      {label && (
        <div style={{ marginBottom: '6px' }}>
          <label 
            htmlFor={id} 
            style={{ 
              fontSize: '11.5px', 
              fontWeight: 700, 
              color: '#475569',
              margin: 0
            }}
          >
            {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{ 
          position: 'absolute', 
          left: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          pointerEvents: 'none', 
          color: '#64748B',
          width: '16px',
          height: '16px',
          zIndex: 2 
        }}>
          {isLoading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#9A7B4F' }} />
          ) : (
            <MapPin size={16} style={{ color: '#64748B' }} />
          )}
        </div>

        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (!value || value.trim().length === 0) {
              setSuggestions(LOCAL_HUBS);
              setIsOpen(true);
            } else {
              fetchPredictions(value);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '10px 32px 10px 36px',
            borderRadius: '6px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#0F172A',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.15s ease'
          }}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions(LOCAL_HUBS);
              setIsOpen(true);
            }}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions List */}
      {isOpen && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 99999,
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '12px',
          boxShadow: '0 20px 35px -4px rgba(15, 23, 42, 0.25), 0 8px 16px -2px rgba(15, 23, 42, 0.1)',
          maxHeight: '280px',
          overflowY: 'auto',
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <li
                key={item.place_id || idx}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(item);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #F1F5F9',
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0, userSelect: 'none' }}>
                  {getCategoryIcon(item.category)}
                </span>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.main_text || item.description}
                    </span>
                    {item.airport_code && (
                      <span style={{ padding: '2px 6px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: '4px' }}>
                        {item.airport_code}
                      </span>
                    )}
                    {item.category === 'HOTEL' && (
                      <span style={{ padding: '2px 6px', fontSize: '9px', fontWeight: 600, background: '#F3E8FF', color: '#6B21A8', borderRadius: '4px' }}>
                        5★ Luxury
                      </span>
                    )}
                  </div>
                  {item.secondary_text && (
                    <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {item.secondary_text}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94A3B8', textTransform: 'uppercase', flexShrink: 0, marginTop: '2px' }}>
                  {item.category || 'LOC'}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
