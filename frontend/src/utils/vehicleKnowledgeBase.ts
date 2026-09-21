/**
 * AI Vehicle Knowledge Base & Luxury Amenities Auto-Completer.
 * Intelligently suggests exact vehicle class, realistic passenger/luggage capacities,
 * standard market charter tariffs, curated amenity badges, and luxury marketing descriptions.
 */

export interface VehicleSpecProfile {
  make: string;
  model: string;
  vehicleClass: string;
  classNameLabel: string;
  passengerCapacity: number;
  luggageCapacity: number;
  hourlyRateUsd: number;
  perKmRateUsd: number;
  perMileRateUsd: number;
  exteriorColor: string;
  interiorColor: string;
  tagline: string;
  description: string;
  recommendedAmenities: string[];
  stockShowroomPhotos: Array<{
    url: string;
    caption: string;
    photoType: 'EXTERIOR' | 'CABIN' | 'COCKPIT' | 'TRUNK' | 'AMENITY';
    isPrimary: boolean;
  }>;
}

export const ALL_LUXURY_AMENITIES_LIBRARY = [
  '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
  '❄️ Tri-Zone / Quad-Zone Executive Climate',
  '💺 Heated, Ventilated & Massaging Seats',
  '📺 Dual 4K Rear OLED Entertainment Displays',
  '🍾 Illuminated Champagne Chiller & Flutes',
  '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
  '🔇 Whisper-Quiet Acoustic Laminated Privacy Glass',
  '🔌 Dual 110V AC Power Inverters & 100W USB-C PD',
  '💼 Executive Fold-Out Work Tables',
  '✨ Panoramic Starlight Ambient Ceiling',
  '👶 Child Safety Seat / Booster Ready (ISOFIX/LATCH)',
  '🛄 Massive Dedicated Cargo Bay (6+ Suitcases)',
  '🚪 Power Retractable Illuminated Boarding Steps',
  '🎧 Active Noise Cancellation Sound Architecture',
  '☂️ Built-in Executive Umbrella Compartment',
  '🛡️ Rear Privacy Partition & Electric Window Blinds'
];

export const LUXURY_VEHICLE_PROFILES: Record<string, VehicleSpecProfile> = {
  escalade: {
    make: 'Cadillac',
    model: 'Escalade ESV Sport Platinum',
    vehicleClass: 'LUXURY_SUV',
    classNameLabel: 'Luxury SUV (Escalade, Navigator)',
    passengerCapacity: 6,
    luggageCapacity: 6,
    hourlyRateUsd: 145.0,
    perKmRateUsd: 3.95,
    perMileRateUsd: 4.85,
    exteriorColor: 'Obsidian Black Metallic',
    interiorColor: 'Jet Black Semi-Aniline Leather with Diamond Stitching',
    tagline: 'The Undisputed American Executive Standard in Chauffeur Luxury',
    description: 'Extended wheelbase delivering presidential stature, 142.8 cubic feet of cargo capacity for oversized luggage, AKG Studio Reference 36-speaker sound, and tri-zone climate comfort.',
    recommendedAmenities: [
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '🛄 Massive Dedicated Cargo Bay (6+ Suitcases)',
      '📺 Dual 4K Rear OLED Entertainment Displays',
      '💺 Heated, Ventilated & Massaging Seats',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🚪 Power Retractable Illuminated Boarding Steps',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD',
      '🔇 Whisper-Quiet Acoustic Laminated Privacy Glass'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
        caption: 'Exterior Stature - Obsidian Black Escalade ESV',
        photoType: 'EXTERIOR',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80',
        caption: 'Rear Passenger Lounge with Dual HD Displays',
        photoType: 'CABIN',
        isPrimary: false
      },
      {
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
        caption: 'Executive OLED Chauffeur Cockpit',
        photoType: 'COCKPIT',
        isPrimary: false
      }
    ]
  },
  sclass: {
    make: 'Mercedes-Benz',
    model: 'S-Class S580 4MATIC Sedan',
    vehicleClass: 'FIRST_CLASS',
    classNameLabel: 'First Class (S-Class, 7-Series)',
    passengerCapacity: 3,
    luggageCapacity: 3,
    hourlyRateUsd: 135.0,
    perKmRateUsd: 3.85,
    perMileRateUsd: 4.95,
    exteriorColor: 'Onyx Black',
    interiorColor: 'Exclusive Nappa Leather in Carmine Red / Black',
    tagline: 'The Definitive Global Benchmark in First-Class Chauffeur Engineering',
    description: 'First-class rear executive seating with 43.5 degrees of recline, active road noise cancellation, Burmester 4D High-End Surround Sound, and Energizing Comfort wellness programs.',
    recommendedAmenities: [
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '💺 Heated, Ventilated & Massaging Seats',
      '✨ Panoramic Starlight Ambient Ceiling',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🛡️ Rear Privacy Partition & Electric Window Blinds',
      '🎧 Active Noise Cancellation Sound Architecture',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80',
        caption: 'Mercedes-Benz S580 Executive Profile',
        photoType: 'EXTERIOR',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
        caption: 'Executive First-Class Rear Reclining Lounge',
        photoType: 'CABIN',
        isPrimary: false
      }
    ]
  },
  maybach: {
    make: 'Mercedes-Maybach',
    model: 'S680 4MATIC V12',
    vehicleClass: 'ULTRA_LUXURY',
    classNameLabel: 'Ultra Luxury (Maybach, Rolls-Royce)',
    passengerCapacity: 3,
    luggageCapacity: 3,
    hourlyRateUsd: 225.0,
    perKmRateUsd: 5.50,
    perMileRateUsd: 7.50,
    exteriorColor: 'Two-Tone Obsidian Black / High-Tech Silver',
    interiorColor: 'Manufaktur Crystal White Exclusive Nappa Leather',
    tagline: 'The Pinnacle of Sovereign Executive Transport & Royal Presence',
    description: 'Handcrafted 6.0L Biturbo V12 powerplant, champagne chiller with silver-plated Robbe & Berking flutes, electronically powered comfort doors, and active road noise attenuation.',
    recommendedAmenities: [
      '🍾 Illuminated Champagne Chiller & Flutes',
      '💺 Heated, Ventilated & Massaging Seats',
      '💼 Executive Fold-Out Work Tables',
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '✨ Panoramic Starlight Ambient Ceiling',
      '🛡️ Rear Privacy Partition & Electric Window Blinds',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
        caption: 'Mercedes-Maybach S680 Sovereign Stature',
        photoType: 'EXTERIOR',
        isPrimary: true
      }
    ]
  },
  navigator: {
    make: 'Lincoln',
    model: 'Navigator L Black Label',
    vehicleClass: 'LUXURY_SUV',
    classNameLabel: 'Luxury SUV (Escalade, Navigator)',
    passengerCapacity: 6,
    luggageCapacity: 6,
    hourlyRateUsd: 135.0,
    perKmRateUsd: 3.75,
    perMileRateUsd: 4.75,
    exteriorColor: 'Chroma Caviar Dark Gray Metallic',
    interiorColor: 'Yacht Club Venetian Leather & Bleached Teak',
    tagline: 'Presidential Sanctuary of Rejuvenating Luxury and Massive Luggage Utility',
    description: 'Perfect 30-way Perfect Position front and second-row captain chairs, Revel Ultima 28-speaker 3D sound, and extended cargo compartment for luxury group transfers.',
    recommendedAmenities: [
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '🛄 Massive Dedicated Cargo Bay (6+ Suitcases)',
      '💺 Heated, Ventilated & Massaging Seats',
      '🚪 Power Retractable Illuminated Boarding Steps',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        caption: 'Lincoln Navigator L Black Label Stature',
        photoType: 'EXTERIOR',
        isPrimary: true
      }
    ]
  },
  sprinter: {
    make: 'Mercedes-Benz',
    model: 'Sprinter 3500 VIP JetVan Executive',
    vehicleClass: 'BUSINESS_VAN',
    classNameLabel: 'Executive Sprinter VIP',
    passengerCapacity: 12,
    luggageCapacity: 12,
    hourlyRateUsd: 185.0,
    perKmRateUsd: 4.50,
    perMileRateUsd: 5.95,
    exteriorColor: 'Jet Black Metallic',
    interiorColor: 'Custom Aviation Diamond-Quilted Italian Leather',
    tagline: 'Private Aviation Jet Luxury on Wheels for Delegations and VIP Groups',
    description: 'Full standing height cabin with aircraft-style power reclining captain suites, 43-inch smart 4K streaming monitors, Apple TV, motorized privacy divider, and walk-in luggage bay.',
    recommendedAmenities: [
      '📺 Dual 4K Rear OLED Entertainment Displays',
      '🍾 Illuminated Champagne Chiller & Flutes',
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '🛄 Massive Dedicated Cargo Bay (6+ Suitcases)',
      '🛡️ Rear Privacy Partition & Electric Window Blinds',
      '💼 Executive Fold-Out Work Tables',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD',
      '✨ Panoramic Starlight Ambient Ceiling'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
        caption: 'Mercedes Sprinter VIP JetVan Exterior',
        photoType: 'EXTERIOR',
        isPrimary: true
      }
    ]
  },
  bmwi7: {
    make: 'BMW',
    model: 'i7 xDrive60 All-Electric Flagship',
    vehicleClass: 'ELECTRIC_VIP',
    classNameLabel: 'Electric VIP (Lucid Air, BMW i7)',
    passengerCapacity: 3,
    luggageCapacity: 3,
    hourlyRateUsd: 140.0,
    perKmRateUsd: 3.90,
    perMileRateUsd: 4.85,
    exteriorColor: 'Mineral White Metallic / Sapphire Black Two-Tone',
    interiorColor: 'BMW Individual Smoke White Merino Leather & Cashmere',
    tagline: 'Next-Generation Zero-Emission Sustainable Executive Chauffeur Excellence',
    description: 'Whisper-quiet zero emissions with the revolutionary 31.3-inch 8K BMW Theater Screen, Bowers & Wilkins Diamond 4D sound, and Executive Lounge rear seating.',
    recommendedAmenities: [
      '📺 Dual 4K Rear OLED Entertainment Displays',
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '💺 Heated, Ventilated & Massaging Seats',
      '✨ Panoramic Starlight Ambient Ceiling',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🎧 Active Noise Cancellation Sound Architecture'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
        caption: 'BMW i7 All-Electric Flagship Sedan',
        photoType: 'EXTERIOR',
        isPrimary: true
      }
    ]
  },
  eclass: {
    make: 'Mercedes-Benz',
    model: 'E-Class E350 Executive Sedan',
    vehicleClass: 'BUSINESS_SEDAN',
    classNameLabel: 'Business Sedan (E-Class, 5-Series)',
    passengerCapacity: 3,
    luggageCapacity: 2,
    hourlyRateUsd: 95.0,
    perKmRateUsd: 3.25,
    perMileRateUsd: 3.85,
    exteriorColor: 'Polar White / Obsidian Black',
    interiorColor: 'Nappa Leather Black',
    tagline: 'Reliable, Pristine Business Class Chauffeur Comfort for Corporate Transfers',
    description: 'Smooth and agile executive sedan featuring wireless charging, Apple CarPlay, ambient lighting, and dedicated climate control.',
    recommendedAmenities: [
      '⚡ Ultra-Fast 5G Wi-Fi Hotspot',
      '❄️ Tri-Zone / Quad-Zone Executive Climate',
      '🥤 Complimentary Chilled Fiji Artesian Water & Mints',
      '🔌 Dual 110V AC Power Inverters & 100W USB-C PD'
    ],
    stockShowroomPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
        caption: 'Mercedes-Benz E-Class Executive Sedan',
        photoType: 'EXTERIOR',
        isPrimary: true
      }
    ]
  }
};

/**
 * Matches input text (make and model) to the best vehicle profile.
 */
export function matchVehicleProfile(query: string): VehicleSpecProfile {
  const q = query.toLowerCase();

  if (q.includes('maybach') || q.includes('s680') || q.includes('ghost') || q.includes('phantom') || q.includes('rolls')) {
    return LUXURY_VEHICLE_PROFILES.maybach;
  }
  if (q.includes('sprinter') || q.includes('van') || q.includes('transit') || q.includes('jetvan')) {
    return LUXURY_VEHICLE_PROFILES.sprinter;
  }
  if (q.includes('navigator') || q.includes('aviator') || q.includes('lincoln')) {
    return LUXURY_VEHICLE_PROFILES.navigator;
  }
  if (q.includes('bmw') || q.includes('i7') || q.includes('760') || q.includes('750') || q.includes('lucid') || q.includes('taycan')) {
    return LUXURY_VEHICLE_PROFILES.bmwi7;
  }
  if (q.includes('e-class') || q.includes('e350') || q.includes('e450') || q.includes('5-series') || q.includes('530i') || q.includes('a6')) {
    return LUXURY_VEHICLE_PROFILES.eclass;
  }
  if (q.includes('s-class') || q.includes('s580') || q.includes('s500') || q.includes('mercedes') || q.includes('benz') || q.includes('a8')) {
    return LUXURY_VEHICLE_PROFILES.sclass;
  }
  
  // Default to Escalade ESV for general luxury SUV queries
  return LUXURY_VEHICLE_PROFILES.escalade;
}

/**
 * AI Tagline Generator: Produces dynamic, high-converting luxury marketing taglines
 * tailored to vehicle make, model, class tier, and selected onboard amenities.
 */
export function generateAiTaglines(
  make: string,
  model: string,
  vehicleClass?: string,
  amenities?: string[],
  countryOrCity?: string
): string[] {
  const q = `${make} ${model} ${vehicleClass || ''}`.toLowerCase();
  const suggestions: string[] = [];

  const hasWifi = amenities?.some(a => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('5g'));
  const hasMassage = amenities?.some(a => a.toLowerCase().includes('massage') || a.toLowerCase().includes('heated'));
  const hasChampagne = amenities?.some(a => a.toLowerCase().includes('champagne') || a.toLowerCase().includes('chiller'));
  const hasDisplays = amenities?.some(a => a.toLowerCase().includes('oled') || a.toLowerCase().includes('displays'));
  const hasStarlight = amenities?.some(a => a.toLowerCase().includes('starlight') || a.toLowerCase().includes('ambient'));

  if (q.includes('maybach') || q.includes('rolls') || q.includes('s680') || vehicleClass === 'ULTRA_LUXURY') {
    suggestions.push('The Pinnacle of Sovereign Executive Transport & Royal Presence');
    suggestions.push('Ultra-Exclusive VIP First-Class Cabin with Handcrafted Refinement');
    suggestions.push('Presidential Dignitary Transport with Sovereign Road Composure');
    suggestions.push('Unmatched Sovereign Stature, Champagne Lounge & Absolute Privacy');
  } else if (q.includes('sprinter') || q.includes('van') || q.includes('jetvan') || vehicleClass === 'BUSINESS_VAN' || vehicleClass === 'PRESTIGE_VAN') {
    suggestions.push('Private Aviation Jet Luxury on Wheels for Delegations and VIP Groups');
    suggestions.push('High-Volume Executive Mobile Boardroom with 4K Streaming & Privacy');
    suggestions.push('First-Class Group Travel Standard with Full Standing Recline Suites');
    suggestions.push('VIP Delegation & Corporate Roadshow Excellence with Walk-In Luggage Bay');
  } else if (q.includes('escalade') || q.includes('navigator') || q.includes('suburban') || vehicleClass === 'LUXURY_SUV') {
    suggestions.push('The Undisputed American Executive Standard in Chauffeur Luxury');
    suggestions.push('Presidential Sanctuary of Rejuvenating Luxury and Massive Luggage Utility');
    suggestions.push('Sovereign Airport FBO Transfer Standard with Commanding Stature');
    suggestions.push('Unrivaled Luxury SUV Comfort for Family & Executive Airport Transfers');
  } else if (q.includes('bmw') || q.includes('i7') || q.includes('electric') || vehicleClass === 'ELECTRIC_VIP' || vehicleClass === 'ELECTRIC_FLAGSHIP') {
    suggestions.push('Next-Generation Zero-Emission Sustainable Executive Chauffeur Excellence');
    suggestions.push('Revolutionary 8K Theater Lounge with Whisper-Quiet Electric Comfort');
    suggestions.push('Modern Eco-Conscious Executive Luxury with Ultra-Fast 5G Connectivity');
    suggestions.push('Future-Forward VIP Electric Flagship with Diamond 4D Acoustics');
  } else if (q.includes('s-class') || q.includes('s580') || q.includes('s500') || vehicleClass === 'FIRST_CLASS') {
    suggestions.push('The Definitive Global Benchmark in First-Class Chauffeur Engineering');
    suggestions.push('Impeccable Curbside Presence & First-Class Reclining Executive Lounge');
    suggestions.push('Active Acoustic Attenuation & Whisper-Quiet Cabin Serenity');
    suggestions.push('Priority Aviation & Diplomatic FBO Transfer Benchmark');
  } else {
    // General Business Sedan or Other
    suggestions.push('Reliable, Pristine Business Class Chauffeur Comfort for Corporate Transfers');
    suggestions.push('Seamless Airport FBO & City Transfers with Impeccable Punctuality');
    suggestions.push('Modern Executive Mobile Sanctuary with Dedicated Climate & Power');
    suggestions.push('First-Class Executive Curbside Reliability & Roadshow Excellence');
  }

  // Add amenity-specific dynamic variations
  if (hasChampagne) {
    suggestions.push('Bespoke VIP Gala & Evening Experience with Chilled Champagne Service');
  }
  if (hasMassage) {
    suggestions.push('Therapeutic Massaging Executive Lounges for Restorative Long-Distance Travel');
  }
  if (hasDisplays) {
    suggestions.push('Mobile Executive Media Suite with Dual 4K Rear OLED Cinema Displays');
  }
  if (hasStarlight) {
    suggestions.push('Starlight Ambient Ceiling Sanctuary for Late-Night & Event Transfers');
  }

  // Return deduplicated array
  return Array.from(new Set(suggestions));
}

