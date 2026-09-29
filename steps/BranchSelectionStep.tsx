
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Navigation, Loader2, MapPinOff, X } from 'lucide-react';
import { OnboardingState, Branch } from '../types';
import { BRANCHES } from '../constants';
import { branchService } from '../services/api';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Haversine distance in km */
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Format distance like mobile app: "850 m" or "3.2 km" */
const formatDistance = (km: number | undefined): string => {
  if (km === undefined) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

const BranchSelectionStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Branch list from the dashboard (admin-maintained); the built-in list is only a fallback
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);

  useEffect(() => {
    branchService.list()
      .then(res => { if (res.success && res.data?.length) setBranches(res.data); })
      .catch(err => console.log('[Branches] Using the built-in list:', err));
  }, []);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Auto-detect location on mount (like mobile app)
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable');
        } else {
          setLocationError('Location timeout');
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const sortedBranches = useMemo(() => {
    let list = branches.map(b => ({
      ...b,
      distanceKm: userLocation && b.latitude != null && b.longitude != null
        ? haversine(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
        : undefined,
    }));

    if (userLocation) {
      // Nearest first; branches without a location go last
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        b.type.toLowerCase().includes(term)
      );
    }

    return list;
  }, [branches, userLocation, searchTerm]);

  const nearestBranch = userLocation ? sortedBranches[0] : null;

  // Auto-select nearest on first location detection
  useEffect(() => {
    if (nearestBranch && !state.selectedBranch) {
      onUpdate({ selectedBranch: nearestBranch });
    }
  }, [nearestBranch]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Select Branch</h2>
        <p className="text-sm text-gray-500">Choose the bank branch for your account</p>
      </div>

      <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Location status */}
        <div className="flex items-center gap-2">
          {locationLoading ? (
            <div className="flex items-center gap-2 text-brand text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Detecting your location...</span>
            </div>
          ) : userLocation ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              <span>Location detected — showing nearest branches</span>
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <MapPinOff className="w-4 h-4" />
                <span>{locationError}</span>
              </div>
              <button
                onClick={detectLocation}
                className="flex items-center gap-1.5 text-brand text-sm font-medium hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <button
              onClick={detectLocation}
              className="flex items-center gap-2 text-brand text-sm font-medium hover:underline"
            >
              <Navigation className="w-4 h-4" />
              Detect My Location
            </button>
          )}
        </div>

        {/* Recommended nearest branch card */}
        {nearestBranch && !searchTerm && (
          <div
            onClick={() => onUpdate({ selectedBranch: nearestBranch })}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand-200 ${
              state.selectedBranch?.id === nearestBranch.id ? 'ring-2 ring-offset-2 ring-brand' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">Recommended</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{formatDistance(nearestBranch.distanceKm)}</span>
            </div>
            <h3 className="font-bold text-lg">{nearestBranch.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs opacity-80">Nearest branch to you</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{nearestBranch.type}</span>
            </div>
          </div>
        )}

        {/* Branch count */}
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {sortedBranches.length} branches {searchTerm ? 'found' : 'available'}
        </div>

        {/* Branch list — show ~10 items, rest scrollable */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
          {sortedBranches
            .filter(b => !nearestBranch || searchTerm || b.id !== nearestBranch.id)
            .map(branch => (
            <div
              key={branch.id}
              onClick={() => onUpdate({ selectedBranch: branch })}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer group ${
                state.selectedBranch?.id === branch.id
                  ? 'border-brand bg-brand-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{branch.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      branch.type === 'Sub-branch' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {branch.type}
                    </span>
                    {branch.distanceKm !== undefined && (
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(branch.distanceKm)}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-colors ${
                  state.selectedBranch?.id === branch.id ? 'border-brand bg-brand' : 'border-gray-200'
                }`}>
                  {state.selectedBranch?.id === branch.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedBranches.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No branches match "{searchTerm}"</p>
            <button onClick={() => setSearchTerm('')} className="text-brand text-sm mt-2 hover:underline">Clear search</button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          disabled={!state.selectedBranch}
          onClick={onNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${
            state.selectedBranch ? 'bg-brand shadow-lg shadow-brand-200' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default BranchSelectionStep;
