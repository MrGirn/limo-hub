import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BookOpen, Search, X, ExternalLink, Calculator, DollarSign, 
  Car, Clock, ShieldCheck, MapPin, Plane, Award, Sparkles, 
  HelpCircle, ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, Layers, 
  Printer, Copy, Check, Zap, Sliders, AlertTriangle, Users, 
  Mail, Phone, CreditCard, Building2, Radio, Headphones, FileText,
  TrendingUp, Shield, Navigation, Terminal, Inbox, Globe
} from 'lucide-react';

export interface VendorCommercialGuideModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

interface ChapterSection {
  id: string;
  title: string;
  category: string;
  badge: string;
  icon: React.ReactNode;
  summary: string;
  content: React.ReactNode;
  keywords: string[];
}

export const VendorCommercialGuideModal: React.FC<VendorCommercialGuideModalProps> = ({
  isOpen,
  onClose,
  isStandalone = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string>('pillars');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to top of content area on chapter switch
  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTop = 0;
    }
  }, [activeChapterId]);

  // Live Interactive Simulator State inside the Guide
  const [simType, setSimType] = useState<'POINT_TO_POINT' | 'HOURLY'>('POINT_TO_POINT');
  const [simBaseFare, setSimBaseFare] = useState<number>(45);
  const [simPerMile, setSimPerMile] = useState<number>(3.85);
  const [simMinFare, setSimMinFare] = useState<number>(95);
  const [simMiles, setSimMiles] = useState<number>(25);
  const [simHourlyRate, setSimHourlyRate] = useState<number>(125);
  const [simHourlyHours, setSimHourlyHours] = useState<number>(4);
  const [simMinHours, setSimMinHours] = useState<number>(3);
  const [simDeadheadMiles, setSimDeadheadMiles] = useState<number>(12);
  const [simDeadheadRate, setSimDeadheadRate] = useState<number>(2.50);
  const [simAirportFee, setSimAirportFee] = useState<number>(20);
  const [simIsAirport, setSimIsAirport] = useState<boolean>(true);
  const [simMeetGreetFee, setSimMeetGreetFee] = useState<number>(35);
  const [simHasMeetGreet, setSimHasMeetGreet] = useState<boolean>(false);
  const [simGratuityPct, setSimGratuityPct] = useState<number>(20);
  const [simTaxPct, setSimTaxPct] = useState<number>(7.5);

  // Compute Simulator Results
  const simCalculations = useMemo(() => {
    let subtotalNet = 0;
    let distanceCharge = 0;
    let hourlyCharge = 0;
    let deadheadCharge = 0;
    let airportCharge = simIsAirport ? simAirportFee : 0;
    let meetGreetCharge = simHasMeetGreet ? simMeetGreetFee : 0;
    let floorApplied = false;

    if (simType === 'POINT_TO_POINT') {
      distanceCharge = simMiles * simPerMile;
      deadheadCharge = simDeadheadMiles * simDeadheadRate;
      const rawSubtotal = simBaseFare + distanceCharge + deadheadCharge + airportCharge + meetGreetCharge;
      if (rawSubtotal < simMinFare) {
        subtotalNet = simMinFare;
        floorApplied = true;
      } else {
        subtotalNet = rawSubtotal;
      }
    } else {
      const billableHours = Math.max(simHourlyHours, simMinHours);
      hourlyCharge = billableHours * simHourlyRate;
      deadheadCharge = simDeadheadMiles * simDeadheadRate;
      subtotalNet = hourlyCharge + deadheadCharge + airportCharge + meetGreetCharge;
    }

    const gratuityAmt = (subtotalNet * simGratuityPct) / 100;
    const taxAmt = (subtotalNet * simTaxPct) / 100;
    const totalGross = subtotalNet + gratuityAmt + taxAmt;

    return {
      distanceCharge,
      hourlyCharge,
      deadheadCharge,
      airportCharge,
      meetGreetCharge,
      subtotalNet,
      floorApplied,
      gratuityAmt,
      taxAmt,
      totalGross
    };
  }, [
    simType, simBaseFare, simPerMile, simMinFare, simMiles, 
    simHourlyRate, simHourlyHours, simMinHours, simDeadheadMiles, 
    simDeadheadRate, simAirportFee, simIsAirport, simMeetGreetFee, 
    simHasMeetGreet, simGratuityPct, simTaxPct
  ]);

  const handleOpenInNewTab = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'commercial-guide');
    window.open(url.toString(), '_blank');
  };

  // Chapter Content Definition with strict 2-color styling (White & Black) and NO dark mode cards
  const chapters: ChapterSection[] = [
    // --- SECTION 1: PRICING & TARIFF ECONOMICS ---
    {
      id: 'pillars',
      title: '1. The Four Pricing Pillars',
      category: 'PRICING & TARIFFS',
      badge: 'Core Economics',
      icon: <DollarSign size={18} color="#0F172A" />,
      summary: 'Base Fare, Per-Mile/KM, Hourly Charters, and Minimum Fare Floor mechanics.',
      keywords: ['base fare', 'per mile', 'hourly rate', 'minimum fare', 'distance', 'flag drop', 'charter'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              💡 Executive Summary: Why Every Chauffeur Company Uses These 4 Levers
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              In premium chauffeured ground transportation, quotes are never a random guess. Every quote is built from four foundational building blocks that guarantee vehicle mobilization costs, driver compensation, and profit margins are secured before the wheels turn.
            </p>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 900, fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                PILLAR 1
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Base Fare (The "Flag Drop" / Mobilization Fee)
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              <strong>What it is:</strong> A fixed entry fee applied to every point-to-point booking regardless of trip distance.
            </p>
            <div style={{ background: '#FFFFFF', borderLeft: '4px solid #0F172A', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#0F172A' }}>
                <strong>When to adjust it:</strong> Raise your Base Fare if fuel prices surge, if vehicle detailing costs increase, or if city congestion increases the time your chauffeur spends staging before passenger boarding.
              </p>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>Industry Standard Example:</span>
              <span>Executive Sedan: $35–$55 • Luxury SUV (Escalade): $45–$75 • Executive Sprinter: $75–$120</span>
            </div>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 900, fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                PILLAR 2
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Per-Mile / Per-KM Rate (Active In-Service Transit)
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              <strong>What it is:</strong> The variable rate charged for every unit of distance the passenger is actively in the vehicle between Pickup and Dropoff.
            </p>
            <div style={{ background: '#FFFFFF', borderLeft: '4px solid #0F172A', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#0F172A' }}>
                <strong>Calculation:</strong> <code style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px' }}>In-Service Distance × Per-Mile Rate</code>
              </p>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>Typical Range:</span>
              <span>Executive Sedan: $3.25–$4.50/mi • SUV: $4.25–$5.75/mi • Executive Van: $5.50–$7.50/mi</span>
            </div>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 900, fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                PILLAR 3
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Hourly Charter Rate & Minimum Charter Duration
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              <strong>What it is:</strong> Used whenever a customer books "As Directed" (roadshows, weddings, diplomatic escorts, concerts, sporting events) where the chauffeur remains continuously dedicated on standby.
            </p>
            <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
              <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                ⚠️ The "Minimum Hours Rule" (Protection Against Opportunity Cost):
              </h5>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                If you set a 3-hour or 4-hour minimum, even if the passenger releases the vehicle in 90 minutes, the booking engine bills the full minimum duration. This protects your fleet from losing a full evening's revenue on short charters.
              </p>
            </div>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ background: '#0F172A', color: '#FFFFFF', fontWeight: 900, fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                PILLAR 4
              </span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Minimum Fare Floor (The Safety Net)
              </h3>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              <strong>What it is:</strong> The guaranteed lowest price any point-to-point booking can cost, preventing 1-mile or 2-mile trips from generating uneconomical $15 quotes.
            </p>
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '4px', fontSize: '12px', color: '#0F172A' }}>
              <strong>Rule logic:</strong> <code style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '4px' }}>Final Net Fare = MAX(Minimum Fare, Base Fare + Distance Charges + Deadhead)</code>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'deadhead',
      title: '2. Deadhead & The 3-Leg Luxury Journey',
      category: 'PRICING & TARIFFS',
      badge: 'Chauffeur Physics',
      icon: <MapPin size={18} color="#0F172A" />,
      summary: 'How garage-to-pickup and dropoff-to-garage mileage is calculated to ensure out-of-town trips stay profitable.',
      keywords: ['deadhead', '3-leg', 'garage', 'dispatch', 'empty miles', 'repositioning', 'staging'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🗺️ The Anatomy of a Chauffeur Trip (Why 10 Passenger Miles ≠ 10 Total Miles)
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Unlike rideshare where drivers wander on the street, executive limousines operate from verified base depots and garages. Every executive dispatch consists of 3 distinct legs.
            </p>
          </div>

          {/* Clean White Card (No Dark Mode) */}
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              The 3-Leg Dispatch Life-Cycle
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Leg 1: Mobilization</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Garage → Pickup Location</div>
                <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                  Chauffeur pre-trip inspection, vehicle sanitization, staging 15 minutes before scheduled pickup.
                </p>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Leg 2: In-Service</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Passenger Onboard Transit</div>
                <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                  Billed via Per-Mile / Per-KM rate or Hourly Charter Rate. Chauffeur maintains white-glove service.
                </p>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Leg 3: Repositioning</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Dropoff → Home Base</div>
                <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                  <strong>Deadhead Return.</strong> When dropoff is outside your metro core, deadhead rate recovers driver wages and fuel.
                </p>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              When and How Deadhead is Charged
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              If your client books a one-way trip from downtown Boston to Cape Cod (70 miles), the client leaves the vehicle at Cape Cod. Your chauffeur must drive 70 empty miles back to Boston.
            </p>
            <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Formula:</div>
              <code style={{ fontSize: '13px', color: '#0F172A', fontWeight: 800 }}>
                Deadhead Fee = Empty Repositioning Miles × Deadhead Rate ($/mi)
              </code>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#475569' }}>
                Example: 70 Deadhead Miles × $2.50/mi = $175.00 Deadhead Staging Surcharge added to net subtotal.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'hierarchy',
      title: '3. Vehicle vs. Class Price Overrides',
      category: 'PRICING & TARIFFS',
      badge: 'System Logic',
      icon: <Car size={18} color="#0F172A" />,
      summary: 'How specific vehicle rates take precedence over class defaults, and how the algorithm resolves quotes.',
      keywords: ['override', 'class', 'vehicle', 'escalade', 'sedan', 'hierarchy', 'profile', 'custom rate'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              👑 The 2-Tier Pricing Inheritance Hierarchy
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Our platform allows you to set default pricing for an entire category (e.g. all First Class Sedans) while giving premium flagship vehicles (e.g. a brand-new 2024 Cadillac Escalade ESV or Rolls-Royce Ghost) their own custom hourly and mileage rates.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Layers size={18} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Level 1: Class-Level Rule (Default)
                </h4>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Configured in <strong>Pricing Rules & Tariffs</strong>. Applied when a customer books a generic category (e.g. "Executive SUV") or when no vehicle-specific rate is set.
              </p>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#0F172A' }}>
                • Base Fare: $45.00<br/>
                • Per Mile: $3.85<br/>
                • Hourly Rate: $125.00/hr
              </div>
            </div>

            <div style={{ border: '2px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Level 2: Vehicle-Level Override (High Priority)
                </h4>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Configured on the individual <strong>Vehicle Card</strong>. When a customer selects this exact vehicle, its custom rate completely overrides the class rate.
              </p>
              <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#0F172A' }}>
                • 2024 Escalade Custom: $165.00/hr<br/>
                • Per Mile Custom: $4.95<br/>
                • <strong>Result: System bills $165/hr instead of $125/hr!</strong>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tax_tip',
      title: '4. Tax, Tip & All-Inclusive Pricing Modes',
      category: 'PRICING & TARIFFS',
      badge: 'Client Presentation',
      icon: <ShieldCheck size={18} color="#0F172A" />,
      summary: 'Itemized vs. All-Inclusive display modes, mandatory chauffeur gratuities, and regulatory sales taxes.',
      keywords: ['tax', 'tip', 'gratuity', 'all inclusive', 'itemized', 'surcharges', 'receipt', 'display mode'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              💎 Itemized Breakdown vs. All-Inclusive Luxury Pricing
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              High-Net-Worth individuals, corporate travel managers, and VIP bookers despise surprise fees at checkout. Our engine supports two distinct commercial display modes:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '2px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#0F172A', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px' }}>
                MODE A: ALL-INCLUSIVE (RECOMMENDED)
              </span>
              <h4 style={{ margin: '8px 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Transparent Upfront Rate
              </h4>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                The customer sees one final, complete price with 20% Chauffeur Gratuity, Fuel, and Taxes pre-calculated into the headline rate.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#FFFFFF', color: '#0F172A', border: '1px solid #0F172A', padding: '3px 8px', borderRadius: '4px' }}>
                MODE B: ITEMIZED
              </span>
              <h4 style={{ margin: '8px 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Itemized Line-by-Line Receipt
              </h4>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                Subtotal is displayed first, followed by separate line items for Gratuity (20%), State Sales Tax, and Airport Staging fees.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'airport_wait',
      title: '5. Airport Surcharges & Meet-and-Greet',
      category: 'PRICING & TARIFFS',
      badge: 'Aviation Ops',
      icon: <Plane size={18} color="#0F172A" />,
      summary: 'Flight tracking grace periods, curbside vs baggage claim meet & greet, and wait-time billing per minute.',
      keywords: ['airport', 'meet and greet', 'flight', 'wait time', 'baggage claim', 'curbside', 'grace period', 'delay'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              ✈️ Aviation Operations & Airport Staging
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Airports enforce strict staging lot permits, toll barriers, and security parking fees. The platform provides automated tools to capture these costs and manage flight delays smoothly.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Plane size={16} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Airport Access Surcharge
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                Covers airport port authority commercial entrance fees and staging lot parking tickets (Typically $15–$25).
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Award size={16} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Meet & Greet (Baggage Claim Escort)
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                Chauffeur parks vehicle in short-term garage, enters terminal with customized digital iPad nameboard, assists with luggage at baggage carousel (Typically $30–$50).
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'calculator',
      title: '6. Interactive Dispatch Sandbox & Math Simulator',
      category: 'PRICING & TARIFFS',
      badge: 'Live Simulator',
      icon: <Calculator size={18} color="#0F172A" />,
      summary: 'Test any custom scenario live. Slide distance, hours, deadhead, and taxes to see the exact formula execution.',
      keywords: ['calculator', 'simulator', 'test', 'math', 'formula', 'sandbox', 'estimate', 'live'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🧮 Interactive Tariff Testing Sandbox
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Use the controls below to test any pricing scenario. See the math calculated step-by-step so your dispatchers can explain any quote to clients with 100% confidence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {/* Controls */}
            <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Trip Type:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSimType('POINT_TO_POINT')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #0F172A',
                      background: simType === 'POINT_TO_POINT' ? '#0F172A' : '#FFFFFF',
                      color: simType === 'POINT_TO_POINT' ? '#FFFFFF' : '#0F172A'
                    }}
                  >
                    Point-to-Point
                  </button>
                  <button
                    onClick={() => setSimType('HOURLY')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #0F172A',
                      background: simType === 'HOURLY' ? '#0F172A' : '#FFFFFF',
                      color: simType === 'HOURLY' ? '#FFFFFF' : '#0F172A'
                    }}
                  >
                    Hourly Charter
                  </button>
                </div>
              </div>

              {simType === 'POINT_TO_POINT' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                      <span>Trip Distance:</span>
                      <span style={{ fontWeight: 800 }}>{simMiles} Miles</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="150" 
                      value={simMiles} 
                      onChange={(e) => setSimMiles(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#0F172A' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Base Fare ($):</label>
                      <input 
                        type="number" 
                        value={simBaseFare} 
                        onChange={(e) => setSimBaseFare(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Per-Mile Rate ($):</label>
                      <input 
                        type="number" 
                        step="0.25" 
                        value={simPerMile} 
                        onChange={(e) => setSimPerMile(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Minimum Fare Floor ($):</label>
                    <input 
                      type="number" 
                      value={simMinFare} 
                      onChange={(e) => setSimMinFare(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                      <span>Charter Duration:</span>
                      <span style={{ fontWeight: 800 }}>{simHourlyHours} Hours</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="16" 
                      value={simHourlyHours} 
                      onChange={(e) => setSimHourlyHours(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#0F172A' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Hourly Rate ($/hr):</label>
                      <input 
                        type="number" 
                        value={simHourlyRate} 
                        onChange={(e) => setSimHourlyRate(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Minimum Hours Floor:</label>
                      <input 
                        type="number" 
                        value={simMinHours} 
                        onChange={(e) => setSimMinHours(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Deadhead & Addons */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Deadhead Miles:</label>
                    <input 
                      type="number" 
                      value={simDeadheadMiles} 
                      onChange={(e) => setSimDeadheadMiles(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Deadhead Rate ($/mi):</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={simDeadheadRate} 
                      onChange={(e) => setSimDeadheadRate(Number(e.target.value))}
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0F172A', fontSize: '12px', background: '#FFFFFF', color: '#0F172A' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={simIsAirport} 
                      onChange={(e) => setSimIsAirport(e.target.checked)} 
                    />
                    Airport Staging (+${simAirportFee})
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={simHasMeetGreet} 
                      onChange={(e) => setSimHasMeetGreet(e.target.checked)} 
                    />
                    Meet & Greet (+${simMeetGreetFee})
                  </label>
                </div>
              </div>
            </div>

            {/* Receipt Breakdown: Clean White Card (No Dark Mode) */}
            <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #0F172A', paddingBottom: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    📄 Step-by-Step Quote Breakdown
                  </span>
                  <span style={{ fontSize: '11px', background: '#0F172A', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    {simType}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
                  {simType === 'POINT_TO_POINT' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Base Mobilization Fare:</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>${simBaseFare.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Distance ({simMiles} mi × ${simPerMile.toFixed(2)}):</span>
                        <span style={{ color: '#0F172A', fontWeight: 800 }}>${simCalculations.distanceCharge.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hourly ({Math.max(simHourlyHours, simMinHours)} hrs × ${simHourlyRate.toFixed(2)}):</span>
                      <span style={{ color: '#0F172A', fontWeight: 800 }}>${simCalculations.hourlyCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {simCalculations.deadheadCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Deadhead Repositioning ({simDeadheadMiles} mi):</span>
                      <span style={{ color: '#0F172A', fontWeight: 800 }}>+${simCalculations.deadheadCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {simCalculations.airportCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Airport Access Staging Fee:</span>
                      <span style={{ color: '#0F172A', fontWeight: 800 }}>+${simCalculations.airportCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {simCalculations.meetGreetCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Meet & Greet Terminal Escort:</span>
                      <span style={{ color: '#0F172A', fontWeight: 800 }}>+${simCalculations.meetGreetCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {simCalculations.floorApplied && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', padding: '6px 8px', borderRadius: '4px', color: '#0F172A', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                      🛡️ Minimum Fare Floor applied (${simMinFare.toFixed(2)})
                    </div>
                  )}

                  <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Net Subtotal:</span>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>${simCalculations.subtotalNet.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Chauffeur Gratuity ({simGratuityPct}%):</span>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>+${simCalculations.gratuityAmt.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Sales Tax ({simTaxPct}%):</span>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>+${simCalculations.taxAmt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '6px', padding: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#0F172A', fontWeight: 800, textTransform: 'uppercase' }}>
                    Total All-Inclusive Quote
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>Guaranteed Upfront Total</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                  ${simCalculations.totalGross.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // --- SECTION 2: DISPATCH & LIVE RIDE OPERATIONS ---
    {
      id: 'dispatch_ops',
      title: '7. Live Dispatch Console & Booking Management',
      category: 'OPERATIONS & FLEET',
      badge: 'Daily Workflow',
      icon: <Radio size={18} color="#0F172A" />,
      summary: 'How to manage live ride states, auto-assign chauffeurs, track GPS en-route, and phone bookings.',
      keywords: ['dispatch', 'trips', 'bookings', 'auto assign', 'status', 'scheduled', 'en route', 'phone booking'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              📡 How to Run Your Daily Dispatch Desk
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              The Dispatch Console is where your dispatchers spend 80% of their day. It provides real-time oversight of all incoming reservations from your direct website, corporate accounts, phone bookings, and global network referrals.
            </p>
          </div>

          {/* Ride Status Life Cycle */}
          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              The 6 Core Ride Statuses Explained
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>1. UNASSIGNED</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Booking confirmed by client, awaiting driver dispatch or auto-assign trigger.
                </p>
              </div>

              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>2. DISPATCHED / SCHEDULED</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Chauffeur confirmed. Push notification sent to driver mobile app.
                </p>
              </div>

              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>3. EN ROUTE (MOBILIZATION)</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Driver left garage and is driving to pickup location. Live GPS active.
                </p>
              </div>

              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>4. ON LOCATION / STAGED</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Vehicle parked at pickup point (15 min early). Automated SMS sent to passenger.
                </p>
              </div>

              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>5. PASSENGER ONBOARD</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Wheels rolling. Trip timer and live mileage tracker actively recording.
                </p>
              </div>

              <div style={{ border: '1px solid #0F172A', padding: '8px 12px', background: '#FFFFFF', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>6. COMPLETED & SETTLED</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>
                  Passenger safely dropped off. Digital receipt emailed; driver payout accrued.
                </p>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '18px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              📞 Manual Phone Booking ("Take a Call" Modal)
            </h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              When a VIP or hotel concierge calls dispatch, click <strong>"+ New Phone Booking"</strong> in the top header. The modal calculates the exact tariff automatically while you type the addresses, allows you to enter passenger and flight details, and immediately dispatches the ride.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'fleet_ops',
      title: '8. Fleet Inventory & AI Photo Studio',
      category: 'OPERATIONS & FLEET',
      badge: 'Asset Management',
      icon: <Car size={18} color="#0F172A" />,
      summary: 'Registering vehicles, VIN tracking, luxury amenities checklist, and AI lighting photo compressor.',
      keywords: ['fleet', 'inventory', 'vehicle', 'vin', 'amenities', 'wifi', 'lighting', 'photo studio', 'cadillac', 'mercedes'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🚘 Managing Your Fleet & Vehicle Showcase
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Your fleet is your most valuable asset. The Fleet tab lets you manage vehicles, define passenger capacities, showcase luxury amenities, and set custom rates per vehicle.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  AI Luxury Amenities Library
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                Tag your vehicle with verified features: 5G High-Speed WiFi, Chilled Bottled Water, Privacy Partition, Rear Reclining Executive Captain Chairs, and 110V Laptop Outlets.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={16} color="#0F172A" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  AI Studio Lighting & Image Compressor
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                Upload raw camera photos. Our client-side WebAssembly studio optimizer balances contrast, applies studio gloss lighting, and compresses high-res files for instant page loading.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'drivers_payroll',
      title: '9. Chauffeur Management & Payroll Engine',
      category: 'OPERATIONS & FLEET',
      badge: 'Workforce & Pay',
      icon: <Users size={18} color="#0F172A" />,
      summary: 'Managing 1099 Contractor Commissions, W2 Hourly shifts, instant tip payouts, and driver compliance.',
      keywords: ['chauffeur', 'drivers', 'payroll', '1099', 'w2', 'commission', 'hourly shift', 'tips', 'instant payout'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              👔 Chauffeur Compensation Models & Payroll Ledger
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Different limousine companies use different driver compensation structures. Our platform natively supports all three standard industry models:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#0F172A', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>MODEL 1</span>
              <h4 style={{ margin: '6px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>1099 Contractor Commission</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Driver receives a set percentage of the net ride fare (e.g. 70%–80%) + 100% of customer tips and tolls.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#0F172A', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>MODEL 2</span>
              <h4 style={{ margin: '6px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>W2 Hourly Shift Employee</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Driver clocks in/out for shifts (e.g. $22–$30/hr) + pooled or direct tips. System tracks shift hours and overtime automatically.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, background: '#0F172A', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>MODEL 3</span>
              <h4 style={{ margin: '6px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Salaried Fleet Chauffeur</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Dedicated full-time executive drivers on fixed weekly or monthly salaries with performance bonus tracking.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // --- SECTION 3: NETWORK & BUSINESS INTEGRATIONS ---
    {
      id: 'affiliate_network',
      title: '10. Global Affiliate Network (Farm-In & Farm-Out)',
      category: 'GROWTH & NETWORK',
      badge: 'B2B Revenue',
      icon: <Globe size={18} color="#0F172A" />,
      summary: 'Farming out rides to certified partners in other cities, accepting incoming rides, and 10%/85% revenue splits.',
      keywords: ['affiliate', 'farm in', 'farm out', 'network', 'commission', 'referral', 'smart matcher', 'exchange'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🌐 Never Turn Down Out-of-Town Business Again
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              When your VIP Boston client flies to London or Miami, you can book their entire journey. The Global Affiliate Exchange connects you with vetted, certified limousine operators worldwide.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>📤</span>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Farming Out (10% Referral Commission)
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                You originate the booking for a trip happening in another city. The local partner performs the ride. <strong>You earn a clean 10% referral commission</strong> without moving a single vehicle.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>📥</span>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Farming In (85% Performing Payout)
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                Global partners send rides into your home market. Your chauffeurs execute the service. <strong>You receive 85% of the gross fare</strong> settled directly into your bank account.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'email_rfq',
      title: '11. BYOE Email Gateway & AI Inbound RFQ Parser',
      category: 'GROWTH & NETWORK',
      badge: 'Automation',
      icon: <Mail size={18} color="#0F172A" />,
      summary: 'Connecting custom SMTP/IMAP servers, SPF/DKIM verification, and AI converting email RFQs into instant quotes.',
      keywords: ['email', 'rfq', 'smtp', 'imap', 'ai parser', 'quote generator', 'inbox', 'spf', 'dkim'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              📧 Bring Your Own Email (BYOE) & AI RFQ Ingestion
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Corporate travel managers constantly send raw quote requests via email. This module connects your domain email server and uses AI to turn messy email text into structured bookings automatically.
            </p>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              How the AI RFQ Parser Works:
            </h4>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#334155', lineHeight: '1.7' }}>
              <li>Customer emails: <em>"Need an SUV for CEO Ms. Thorne tomorrow 3pm PHL to Ritz Carlton DL1984"</em></li>
              <li>The system extracts: Date/Time, Pickup (PHL Airport), Dropoff (Ritz-Carlton), Flight (DL1984), Vehicle (Luxury SUV).</li>
              <li>The pricing engine calculates the quote based on your saved tariffs.</li>
              <li>Generates an official formatted PDF quote response with a 1-click confirmation link.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'omnichannel_ai',
      title: '12. Omnichannel Desk, SMS 10DLC & AI Softphone',
      category: 'GROWTH & NETWORK',
      badge: 'Communications',
      icon: <Phone size={18} color="#0F172A" />,
      summary: 'A2P 10DLC SMS compliance, WhatsApp messaging, AI Voice softphone, and BYOK Twilio/AWS keys.',
      keywords: ['omnichannel', 'sms', '10dlc', 'whatsapp', 'voice ai', 'softphone', 'twilio', 'aws', 'byok', 'tcpa'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              📱 Unified Messaging & 10DLC Telecom Compliance
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Communicate with passengers and chauffeurs across SMS, WhatsApp, and Voice from one unified screen. Fully compliant with US Carrier A2P 10DLC regulations and TCPA opt-out rules.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '14px', background: '#FFFFFF' }}>
              <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>A2P 10DLC Compliance</h5>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Automated STOP / UNSTOP handling. Ensures your dispatch SMS messages never get filtered or blocked by Verizon, AT&T, and T-Mobile.
              </p>
            </div>

            <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '14px', background: '#FFFFFF' }}>
              <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>AI Voice Receptionist</h5>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                Answers after-hours calls, provides live quotes, takes phone reservations, and transfers urgent VIP calls to the on-call dispatcher.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'corporate_accounts',
      title: '13. Corporate Booker Accounts & Direct Billing',
      category: 'GROWTH & NETWORK',
      badge: 'B2B Accounts',
      icon: <Building2 size={18} color="#0F172A" />,
      summary: 'Managing corporate client portals, expense billing codes, Net-30 invoicing, and negotiated corporate rates.',
      keywords: ['corporate', 'booker', 'direct billing', 'net 30', 'invoicing', 'expense code', 'travel manager'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🏢 Corporate Booker & Expense Management Hub
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Executive assistants and corporate travel managers can be granted their own secure portal to book rides for executive team members, track monthly spending, and require mandatory Cost Center / Expense codes on every booking.
            </p>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Corporate Account Capabilities:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: '#334155' }}>
              <div>• <strong>Custom Corporate Tariffs:</strong> Assign 5%–15% negotiated contract discounts.</div>
              <div>• <strong>Monthly Net-30 Invoicing:</strong> Consolidated monthly billing via ACH/Wire.</div>
              <div>• <strong>Expense Code Enforcement:</strong> Require project codes or employee IDs.</div>
              <div>• <strong>Executive Assistant Delegations:</strong> Assistants book on behalf of C-level executives.</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'payouts_stripe',
      title: '14. Payouts & Stripe Connect Express',
      category: 'ADMIN & SECURITY',
      badge: 'Financials',
      icon: <CreditCard size={18} color="#0F172A" />,
      summary: 'Managing Stripe Connect Express onboarding, direct deposits, payout schedules, and complete fee transparency.',
      keywords: ['payouts', 'stripe', 'connect', 'direct deposit', 'ledger', 'bank', 'earnings', 'settlement'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              💳 Automated Bank Payouts via Stripe Connect
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              All credit card and corporate card payments are processed securely via Stripe. Funds are routed directly into your operating bank account according to your payout schedule (Daily, Weekly, or Monthly).
            </p>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Stripe Connect Integration Lifecycle:
            </h4>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#334155', lineHeight: '1.7' }}>
              <li><strong>Connect Bank:</strong> Click "Connect with Stripe" to securely link your checking account.</li>
              <li><strong>Card Charges:</strong> Customers pay upfront during web or phone booking.</li>
              <li><strong>Ledger Tracking:</strong> Every ride's gross fare, processing fees, and net amount are recorded in real-time.</li>
              <li><strong>Automatic Transfer:</strong> Net earnings are deposited directly to your bank with zero manual wire paperwork.</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'team_rbac',
      title: '15. Team Roles & RBAC Security Matrix',
      category: 'ADMIN & SECURITY',
      badge: 'Access Control',
      icon: <Shield size={18} color="#0F172A" />,
      summary: 'User roles (Vendor Admin, Dispatcher, Fleet Manager, Accountant) and secure staff impersonation tokens.',
      keywords: ['team', 'roles', 'rbac', 'dispatcher', 'manager', 'accountant', 'permissions', 'impersonate'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              🛡️ Role-Based Access Control (RBAC)
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Keep your financial data and pricing settings protected by assigning granular roles to your team members.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
              <strong style={{ fontSize: '13px', color: '#0F172A' }}>👑 Vendor Admin (Owner)</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Full access to pricing, banking, team management, and global affiliate policies.</p>
            </div>
            <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
              <strong style={{ fontSize: '13px', color: '#0F172A' }}>📡 Dispatcher</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Manages live rides, assigns drivers, takes phone bookings, and messages passengers.</p>
            </div>
            <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
              <strong style={{ fontSize: '13px', color: '#0F172A' }}>🚘 Fleet Manager</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Manages vehicle registrations, maintenance logs, inspection certificates, and amenities.</p>
            </div>
            <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
              <strong style={{ fontSize: '13px', color: '#0F172A' }}>📊 Accountant / Bookkeeper</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Views financial ledgers, payout summaries, and chauffeur commission settlement records.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'saas_subscription',
      title: '16. SaaS Subscription & Global Support Desk',
      category: 'ADMIN & SECURITY',
      badge: 'Account Standing',
      icon: <Headphones size={18} color="#0F172A" />,
      summary: 'Tier plans (Starter, Growth, Autonomous Tier 1), Stripe Billing Portal, and 24/7 Operations Escort.',
      keywords: ['subscription', 'billing portal', 'tier', 'plan', 'support desk', 'concierge', 'dunning', 'standing'],
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '2px solid #0F172A', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
              ⭐ Platform Subscription & Enterprise Support Desk
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
              Manage your software subscription tier, update billing credit cards via the Stripe Customer Portal, and access 24/7 Global Hub technical and dispatch operations support.
            </p>
          </div>

          <div style={{ border: '1px solid #0F172A', borderRadius: '8px', padding: '16px', background: '#FFFFFF' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Available Subscription Tiers:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>🌱 Starter Tier</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Up to 5 vehicles, standard web booking engine, direct Stripe payouts.</p>
              </div>
              <div style={{ border: '1px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>🚀 Growth Tier</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569' }}>Up to 25 vehicles, AI RFQ parser, Omnichannel SMS/WhatsApp, Affiliate Farm-Out.</p>
              </div>
              <div style={{ border: '2px solid #0F172A', padding: '12px', borderRadius: '6px', background: '#FFFFFF' }}>
                <strong style={{ fontSize: '13px', color: '#0F172A' }}>👑 Autonomous Tier 1 (Enterprise)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#334155' }}>Unlimited fleet, AI Voice softphone, 24/7 Support Desk Escort, Dedicated Sovereign Cell.</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Categories list
  const categories = useMemo(() => {
    return ['ALL', 'PRICING & TARIFFS', 'OPERATIONS & FLEET', 'GROWTH & NETWORK', 'ADMIN & SECURITY'];
  }, []);

  // Filter Chapters based on search query and category
  const filteredChapters = useMemo(() => {
    return chapters.filter(ch => {
      const matchesCategory = selectedCategory === 'ALL' || ch.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ch.title.toLowerCase().includes(q) ||
        ch.summary.toLowerCase().includes(q) ||
        ch.keywords.some(k => k.toLowerCase().includes(q))
      );
    });
  }, [chapters, searchQuery, selectedCategory]);

  // Handle Category Select with Automatic Selection of First Matching Chapter
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const matching = chapters.filter(ch => {
      const matchesCategory = cat === 'ALL' || ch.category === cat;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ch.title.toLowerCase().includes(q) ||
        ch.summary.toLowerCase().includes(q) ||
        ch.keywords.some(k => k.toLowerCase().includes(q))
      );
    });
    if (matching.length > 0) {
      setActiveChapterId(matching[0].id);
    }
  };

  const activeChapterIndex = useMemo(() => {
    return filteredChapters.findIndex(c => c.id === activeChapterId);
  }, [filteredChapters, activeChapterId]);

  const activeChapter = useMemo(() => {
    if (activeChapterIndex >= 0) return filteredChapters[activeChapterIndex];
    return filteredChapters[0] || chapters[0];
  }, [filteredChapters, activeChapterIndex, chapters]);

  // Sequential Navigation Handlers
  const handlePrevChapter = () => {
    if (activeChapterIndex > 0) {
      setActiveChapterId(filteredChapters[activeChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (activeChapterIndex < filteredChapters.length - 1) {
      setActiveChapterId(filteredChapters[activeChapterIndex + 1].id);
    }
  };

  if (!isOpen && !isStandalone) return null;

  return (
    <div
      style={
        isStandalone
          ? { minHeight: '100vh', backgroundColor: '#FFFFFF', padding: '24px', fontFamily: 'var(--font-family, sans-serif)' }
          : {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }
      }
    >
      <div
        style={{
          width: '100%',
          maxWidth: isStandalone ? '1440px' : '1160px',
          height: isStandalone ? 'auto' : '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: isStandalone ? '12px' : '16px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '2px solid #0F172A',
          margin: isStandalone ? '0 auto' : undefined
        }}
      >
        {/* Modal Top Header (Strict 2-Color: Pure White & Black) */}
        <div
          style={{
            background: '#FFFFFF',
            color: '#0F172A',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #0F172A'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#0F172A', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <BookOpen size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
                  Commercial Operations & Platform Playbook
                </h2>
                <span style={{ background: '#0F172A', color: '#FFFFFF', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                  ALL 16 MODULES
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                Complete operational guide for vendor owners, managers, dispatchers, and accountants.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isStandalone && (
              <button
                onClick={handleOpenInNewTab}
                title="Open in new browser tab for dual-monitor dispatcher setup"
                style={{
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #0F172A',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <ExternalLink size={14} />
                <span>Open in Separate Tab</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              title="Print Playbook"
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #0F172A',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Printer size={14} />
            </button>

            {!isStandalone && onClose && (
              <button
                onClick={onClose}
                aria-label="Close Playbook"
                style={{
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #0F172A',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter & Search Bar */}
        <div style={{ padding: '12px 24px', background: '#FFFFFF', borderBottom: '1px solid #0F172A', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Tabs: Active = Solid Black (#0F172A), Inactive = White with Black Border */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 800 : 700,
                    cursor: 'pointer',
                    border: '1px solid #0F172A',
                    background: isSelected ? '#0F172A' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#0F172A',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat === 'ALL' ? '🌟 All Chapters (16)' : cat}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="#0F172A" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search concepts (e.g. 'deadhead', 'Escalade override', 'dispatch status', '1099 payroll')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 36px',
                borderRadius: '6px',
                border: '1px solid #0F172A',
                fontSize: '12px',
                outline: 'none',
                background: '#FFFFFF',
                color: '#0F172A'
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Main Body: Two-Column Layout */}
        <div className="guide-modal-body">
          {/* Left Navigation Sidebar */}
          <div className="guide-modal-sidebar">
            <div style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>
              Chapters ({filteredChapters.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px', gap: '4px' }}>
              {filteredChapters.map(chapter => {
                const isActive = chapter.id === activeChapterId;
                return (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapterId(chapter.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                      background: isActive ? '#0F172A' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#0F172A',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      {React.cloneElement(chapter.icon as React.ReactElement, {
                        color: isActive ? '#FFFFFF' : '#0F172A'
                      })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: isActive ? 900 : 700, color: isActive ? '#FFFFFF' : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chapter.title}
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: isActive ? '#E2E8F0' : '#64748B', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {chapter.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div ref={contentAreaRef} className="guide-modal-content">
            {activeChapter ? (
              <div>
                {/* Chapter Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '14px', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ background: '#0F172A', color: '#FFFFFF', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                        {activeChapter.category}
                      </span>
                      <span style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #0F172A', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        {activeChapter.badge}
                      </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>
                      {activeChapter.title}
                    </h1>
                  </div>
                </div>

                {/* Chapter Body */}
                {activeChapter.content}

                {/* Bottom Automatic Next / Prev Menu Item Navigation */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '32px',
                    paddingTop: '20px',
                    borderTop: '2px solid #0F172A'
                  }}
                >
                  <button
                    onClick={handlePrevChapter}
                    disabled={activeChapterIndex <= 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #0F172A',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: activeChapterIndex <= 0 ? 'not-allowed' : 'pointer',
                      opacity: activeChapterIndex <= 0 ? 0.3 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Previous Chapter</span>
                  </button>

                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                    Chapter {activeChapterIndex + 1} of {filteredChapters.length}
                  </div>

                  <button
                    onClick={handleNextChapter}
                    disabled={activeChapterIndex >= filteredChapters.length - 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #0F172A',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: activeChapterIndex >= filteredChapters.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: activeChapterIndex >= filteredChapters.length - 1 ? 0.3 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Next Chapter</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#0F172A' }}>
                No chapter matches the selected filter or search query.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Strict 2-Color) */}
        <div style={{ padding: '12px 24px', background: '#FFFFFF', borderTop: '2px solid #0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#0F172A' }}>
          <div>
            🔒 <strong>Authoritative Real Data Standard</strong> • No hardcoded mocks • Live calculation mirrors backend PricingService.
          </div>
          {!isStandalone && onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid #0F172A',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Close Playbook
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
