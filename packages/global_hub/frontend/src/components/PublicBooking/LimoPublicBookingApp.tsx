import React, { useState } from 'react';
import { BookingState } from './types';
import { RideSelectionPage } from './pages/RideSelectionPage';
import { PassengerDetailsPage } from './pages/PassengerDetailsPage';
import { ReviewAndCheckoutPage } from './pages/ReviewAndCheckoutPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import { FindBookingLookupPage } from './pages/FindBookingLookupPage';
import { CustomerBookingsHubPage } from './pages/CustomerBookingsHubPage';
import { LiveRideTelemetryPage } from './pages/LiveRideTelemetryPage';
import { HelpAndConciergeSupportPage } from './pages/HelpAndConciergeSupportPage';
import { BookingHomeView } from './views/BookingHomeView';
import { SharedBookingHeader } from './pages/SharedBookingHeader';
import { SharedBookingFooter } from './pages/SharedBookingFooter';

interface LimoAppProps {
  onOpenOperationsPortal?: (blade?: string) => void;
  isAuthenticatedAsAdmin?: boolean;
}

export type PublicPageIdentifier = 
  | 'HOME'
  | 'RIDE_DETAILS'
  | 'PASSENGER_DETAILS'
  | 'REVIEW_PAY'
  | 'BOOKING_CONFIRMED'
  | 'SIGN_IN_FIND_BOOKING'
  | 'MY_BOOKINGS'
  | 'MANAGE_TRACK_RIDE'
  | 'HELP_CONTACT';

export const LimoPublicBookingApp: React.FC<LimoAppProps> = ({
  onOpenOperationsPortal,
  isAuthenticatedAsAdmin = false
}) => {
  const [currentPage, setCurrentPage] = useState<PublicPageIdentifier>('HOME');
  const [activeTrackReference, setActiveTrackReference] = useState<string>('LM-20481');

  const [bookingState, setBookingState] = useState<BookingState>({
    serviceType: 'ONE_WAY',
    pickupAddress: '',
    dropoffAddress: '',
    dateStr: 'Oct 15, 2026',
    timeStr: '10:00 AM',
    passengers: 2,
    hourlyDuration: 3,
    stops: [],

    vehicleClass: 'BUSINESS_CLASS',
    sourcingMode: 'AUTO_ROUTED',
    pickupMeetingPoint: 'Airport / Terminal Arrivals (Baggage Claim)',
    childSeatsCount: 0,

    passengerType: 'MYSELF',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',

    baseFare: 0,
    feesAndTaxes: 0,
    totalFare: 0,
    paymentMethod: 'CARD',
    bookingReference: '',
    invoiceNumber: ''
  });

  const handleStateChange = (updates: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top Quick Page Navigation Switcher (Clean Flow Explorer) */}
      <div style={{
        background: '#0F172A',
        color: '#94A3B8',
        padding: '6px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: '700',
        borderBottom: '1px solid #1E293B',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#38BDF8', letterSpacing: '0.05em' }}>
            PUBLIC FLOW:
          </span>

          <div style={{ display: 'flex', gap: '5px' }}>
            {[
              { id: 'HOME', label: 'Home Search' },
              { id: 'RIDE_DETAILS', label: 'Ride Details' },
              { id: 'PASSENGER_DETAILS', label: 'Passenger Details' },
              { id: 'REVIEW_PAY', label: 'Review & Pay' },
              { id: 'BOOKING_CONFIRMED', label: 'Booking Confirmed' },
              { id: 'MY_BOOKINGS', label: 'My Bookings' },
              { id: 'MANAGE_TRACK_RIDE', label: 'Manage / Track' },
              { id: 'SIGN_IN_FIND_BOOKING', label: 'Sign In / Find' },
              { id: 'HELP_CONTACT', label: 'Help & Contact' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as PublicPageIdentifier)}
                style={{
                  background: currentPage === item.id ? '#1D68FE' : 'rgba(255,255,255,0.08)',
                  color: currentPage === item.id ? '#FFFFFF' : '#CBD5E1',
                  border: 'none',
                  padding: '3px 9px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {onOpenOperationsPortal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#64748B', fontSize: '10px' }}>ADMIN / OPS:</span>
            <button
              onClick={() => onOpenOperationsPortal('cells')}
              style={{
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Vendor Network & Lifecycle Management"
            >
              🏢 Vendor Network
            </button>
            <button
              onClick={() => onOpenOperationsPortal('rules')}
              style={{
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Marketplace Configuration & Clearinghouse Rules"
            >
              ⚙️ Marketplace Rules
            </button>
            <button
              onClick={() => onOpenOperationsPortal('financials')}
              style={{
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Financial Reports & Escrow Ledger"
            >
              📊 Escrow Ledger
            </button>
            <button
              onClick={() => onOpenOperationsPortal('sourcing')}
              style={{
                background: '#002050',
                color: '#38BDF8',
                border: '1px solid #0284C7',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '11px'
              }}
            >
              🔒 Azure Operations Hub
            </button>
          </div>
        )}
      </div>

      {/* Render Selected Public Page */}
      {currentPage === 'HOME' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <SharedBookingHeader
            onOpenMyBookings={() => setCurrentPage('MY_BOOKINGS')}
            onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
            onHomeClick={() => setCurrentPage('HOME')}
          />
          <main style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', padding: '36px 24px', flex: 1 }}>
            <BookingHomeView
              state={bookingState}
              onChange={handleStateChange}
              onProceed={() => setCurrentPage('RIDE_DETAILS')}
            />
          </main>
          <SharedBookingFooter onOpenHelp={() => setCurrentPage('HELP_CONTACT')} />
        </div>
      )}

      {currentPage === 'RIDE_DETAILS' && (
        <RideSelectionPage
          state={bookingState}
          onChange={handleStateChange}
          onContinue={() => setCurrentPage('PASSENGER_DETAILS')}
          onEditTrip={() => setCurrentPage('HOME')}
          onOpenMyBookings={() => setCurrentPage('MY_BOOKINGS')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
        />
      )}

      {currentPage === 'PASSENGER_DETAILS' && (
        <PassengerDetailsPage
          state={bookingState}
          onChange={handleStateChange}
          onContinueToPayment={() => setCurrentPage('REVIEW_PAY')}
          onBackToRideDetails={() => setCurrentPage('RIDE_DETAILS')}
          onOpenMyBookings={() => setCurrentPage('MY_BOOKINGS')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
        />
      )}

      {currentPage === 'REVIEW_PAY' && (
        <ReviewAndCheckoutPage
          state={bookingState}
          onChange={handleStateChange}
          onPaySuccess={() => setCurrentPage('BOOKING_CONFIRMED')}
          onEditTrip={() => setCurrentPage('RIDE_DETAILS')}
          onEditPassenger={() => setCurrentPage('PASSENGER_DETAILS')}
          onOpenMyBookings={() => setCurrentPage('MY_BOOKINGS')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
        />
      )}

      {currentPage === 'BOOKING_CONFIRMED' && (
        <BookingConfirmationPage
          state={bookingState}
          onViewBooking={() => setCurrentPage('MY_BOOKINGS')}
          onNewBooking={() => setCurrentPage('HOME')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
        />
      )}

      {currentPage === 'SIGN_IN_FIND_BOOKING' && (
        <FindBookingLookupPage
          onFindBooking={(ref) => {
            setActiveTrackReference(ref);
            setCurrentPage('MANAGE_TRACK_RIDE');
          }}
          onSignInSuccess={() => setCurrentPage('MY_BOOKINGS')}
          onNavigateHome={() => setCurrentPage('HOME')}
          onOpenHelp={() => setCurrentPage('HELP_CONTACT')}
        />
      )}

      {currentPage === 'MY_BOOKINGS' && (
        <CustomerBookingsHubPage
          userEmail={bookingState.email}
          onNewBookingClick={() => setCurrentPage('HOME')}
          onTrackRideClick={(ref) => {
            setActiveTrackReference(ref);
            setCurrentPage('MANAGE_TRACK_RIDE');
          }}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
          onOpenHelp={() => setCurrentPage('HELP_CONTACT')}
          onHomeClick={() => setCurrentPage('HOME')}
        />
      )}

      {currentPage === 'MANAGE_TRACK_RIDE' && (
        <LiveRideTelemetryPage
          bookingRef={activeTrackReference}
          onBackToMyBookings={() => setCurrentPage('MY_BOOKINGS')}
          onOpenHelp={() => setCurrentPage('HELP_CONTACT')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
          onHomeClick={() => setCurrentPage('HOME')}
        />
      )}

      {currentPage === 'HELP_CONTACT' && (
        <HelpAndConciergeSupportPage
          onBackToMyBookings={() => setCurrentPage('MY_BOOKINGS')}
          onOpenSignIn={() => setCurrentPage('SIGN_IN_FIND_BOOKING')}
          onHomeClick={() => setCurrentPage('HOME')}
        />
      )}

    </div>
  );
};
