# Booking Engine PRD

A comprehensive booking system that allows users to manage bookings with flexible pricing, quantity controls, and calendar integration.

**Experience Qualities**:
1. **Intuitive** - Users should immediately understand how to create and manage bookings without training
2. **Reliable** - All booking data persists securely and calendar integration works seamlessly  
3. **Flexible** - Supports various booking scenarios from simple appointments to complex multi-day events with quantities

**Complexity Level**: Light Application (multiple features with basic state)
- Manages bookings, pricing, and calendar data with persistent storage across sessions

## Essential Features

### Calendar Management
- **Functionality**: Interactive calendar view showing available dates with pricing and quantity information
- **Purpose**: Central hub for viewing and managing all booking availability
- **Trigger**: User navigates to main calendar view
- **Progression**: Load calendar → Display month view → Show daily availability → Allow date selection → Show booking form
- **Success criteria**: Calendar loads quickly, displays accurate availability, and responds to date selections

### Booking Creation
- **Functionality**: Create new bookings with date/time selection, quantity, and pricing
- **Purpose**: Core revenue-generating function allowing customers to reserve services
- **Trigger**: User clicks on available date/time slot
- **Progression**: Select date → Choose time (if hourly) → Set quantity → Review pricing → Confirm booking → Generate confirmation
- **Success criteria**: Bookings save correctly, reduce available quantity, and generate proper confirmations

### Pricing & Quantity Management
- **Functionality**: Set daily/hourly prices and manage inventory quantities per time slot
- **Purpose**: Dynamic pricing control and inventory management to maximize revenue
- **Trigger**: Admin accesses pricing configuration or inventory management
- **Progression**: Navigate to admin → Select date range → Set base price → Configure quantity limits → Apply changes → Validate settings
- **Success criteria**: Pricing updates reflect immediately, quantity limits prevent overbooking

### iCal Integration
- **Functionality**: Import external calendars and export bookings as iCal files
- **Purpose**: Synchronize with external calendar systems and provide calendar file downloads
- **Trigger**: User imports .ics file or requests export of current bookings
- **Progression**: Import: Upload file → Parse events → Map to booking format → Merge with existing → Export: Select date range → Generate iCal → Download file
- **Success criteria**: iCal files parse correctly, external events appear in calendar, exported files work in standard calendar apps

### Time Slot Configuration
- **Functionality**: Toggle between date-only and hourly booking modes with configurable time slots
- **Purpose**: Accommodate different business models from full-day rentals to hourly appointments
- **Trigger**: Admin configures booking type and available hours
- **Progression**: Access settings → Choose booking mode → Configure available hours → Set slot duration → Save configuration
- **Success criteria**: Time slots display correctly, booking forms adapt to chosen mode

## Edge Case Handling

- **Overbooking Prevention**: Quantity validation prevents booking more than available inventory
- **Past Date Booking**: System blocks booking attempts for dates in the past
- **Invalid iCal Import**: Graceful error handling with specific feedback for malformed calendar files
- **Timezone Conflicts**: All times stored in consistent timezone with user display adjustments
- **Partial Availability**: Handle cases where requested quantity exceeds remaining availability
- **Concurrent Bookings**: Prevent race conditions when multiple users book simultaneously

## Design Direction

The design should feel professional and trustworthy like established booking platforms (Airbnb, Booking.com) while maintaining a clean, modern aesthetic that instills confidence in users making reservations.

## Color Selection

Complementary (opposite colors) - Using a calming blue-green primary with warm accent colors to create trust while highlighting important booking actions.

- **Primary Color**: Deep Teal (`oklch(0.45 0.15 180)`) - Communicates reliability and professionalism
- **Secondary Colors**: Soft Blue-Gray (`oklch(0.85 0.02 220)`) for backgrounds and Light Teal (`oklch(0.92 0.05 180)`) for subtle highlights
- **Accent Color**: Warm Orange (`oklch(0.65 0.15 45)`) for call-to-action buttons and booking confirmations
- **Foreground/Background Pairings**: 
  - Background (White `oklch(1 0 0)`): Dark Gray text (`oklch(0.2 0 0)`) - Ratio 15.8:1 ✓
  - Primary (Deep Teal `oklch(0.45 0.15 180)`): White text (`oklch(1 0 0)`) - Ratio 8.2:1 ✓
  - Accent (Warm Orange `oklch(0.65 0.15 45)`): White text (`oklch(1 0 0)`) - Ratio 4.9:1 ✓
  - Card (Light Gray `oklch(0.98 0 0)`): Dark Gray text (`oklch(0.2 0 0)`) - Ratio 14.1:1 ✓

## Font Selection

Typography should convey professionalism and clarity, essential for users making important booking decisions and reviewing pricing information.

- **Typographic Hierarchy**:
  - H1 (Page Titles): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal spacing
  - H3 (Card Titles): Inter Medium/18px/normal spacing
  - Body (Content): Inter Regular/16px/relaxed line height
  - Caption (Dates/Times): Inter Medium/14px/tight spacing
  - Price Display: Inter Bold/20px/tight spacing

## Animations

Subtle and functional animations that guide user attention through the booking process while maintaining the professional feel - no flashy effects that might undermine trust.

- **Purposeful Meaning**: Gentle transitions between calendar views and smooth form progressions that guide users confidently through booking steps
- **Hierarchy of Movement**: Calendar date hover effects (subtle), booking form step transitions (smooth), and confirmation animations (satisfying but restrained)

## Component Selection

- **Components**: 
  - Calendar: Custom calendar component built with shadcn Button and Card components
  - Dialog: For booking forms and confirmations
  - Form: React Hook Form with shadcn Input, Select, and Button components
  - Tabs: For switching between calendar views (month/week/day)
  - Badge: For availability status and pricing display
  - Progress: For multi-step booking forms
  - Alert: For booking confirmations and error states

- **Customizations**: 
  - Calendar grid component with hover states and availability indicators
  - Time slot picker with visual availability representation
  - Price display component with quantity calculations

- **States**: 
  - Available dates: Hover effect with pricing preview
  - Unavailable dates: Muted appearance with clear unavailable indication
  - Selected dates: Highlighted with primary color
  - Booking buttons: Loading states during submission
  - Form inputs: Clear validation states with helpful error messages

- **Icon Selection**: Calendar, Clock, DollarSign, Download, Upload from Phosphor Icons for booking-related actions

- **Spacing**: Consistent 4px grid system using Tailwind's spacing scale (p-4, gap-6, mb-8)

- **Mobile**: 
  - Calendar adapts from monthly grid to weekly swipe view on mobile
  - Booking forms use full-screen dialogs on small screens
  - Touch-friendly button sizes (minimum 44px hit targets)
  - Simplified navigation with bottom sheet patterns for mobile booking flow