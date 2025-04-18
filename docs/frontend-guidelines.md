# Frontend Guidelines: Duve Competitor Web App (Modern Edition)

This document outlines updated frontend guidelines to infuse the Duve Competitor Web App with a modern, polished feel. It introduces subtle animations, hover effects, and a clean, minimalist design to create a "new app" experience. Built with vanilla JavaScript, HTML5, and CSS3, the app remains lightweight and efficient.

---

## Fonts

Modern, sleek fonts set the tone for a contemporary look.

- **Primary Font**: "Inter" – A clean, sans-serif font optimized for screens. Use regular weight (400) for body text and medium weight (500) for buttons and labels. Source: [Google Fonts - Inter](https://fonts.google.com/specimen/Inter).
- **Secondary Font**: "Playfair Display" – A stylish serif font with elegance, ideal for hospitality headings. Use bold weight (700) for page titles and section headers. Source: [Google Fonts - Playfair Display](https://fonts.google.com/specimen/Playfair+Display).

**Font Sizes** (based on a 16px root):
- Body text: 1rem (16px)
- Buttons/labels: 1.125rem (18px)
- Subheadings: 1.5rem (24px)
- Main headings: 2.25rem (36px)

---

## Color Palette

A professional blue theme with modern accents adds depth and vibrancy.

- **Primary Blue**: `#1E40AF` – Deep blue for navigation, buttons, and headings.
- **Secondary Blue**: `#3B82F6` – Bright blue for hover states, links, and accents.
- **Light Gray**: `#F9FAFB` – Clean background for pages and guest chat messages.
- **White**: `#FFFFFF` – Text on dark backgrounds, card backgrounds, and staff/AI chat messages.
- **Accent Gradient**: Linear gradient from `#60A5FA` to `#3B82F6` – Adds depth to buttons or key elements.
- **Success Green**: `#10B981` – For success messages (e.g., "Booking confirmed!").
- **Error Red**: `#EF4444` – For error messages (e.g., "Invalid input").

**Usage**: Buttons use Primary Blue with a gradient and White text, shifting to Secondary Blue on hover. Text on Light Gray uses `#111827` (near-black) for contrast.

---

## Spacing & Layout Rules

A minimalist layout with ample spacing creates an open, modern feel. Measurements use rem units (16px root).

- **Page Padding**: 2rem (32px) on desktop, 1rem (16px) on mobile.
- **Section Spacing**: 3rem (48px) between sections (e.g., navigation and content).
- **Element Spacing**: 1.5rem (24px) between form elements or cards; 0.75rem (12px) for smaller gaps (e.g., label to input).
- **Navigation Menu**: Sticky at the top, 3.5rem (56px) tall, Primary Blue background. Links in White, Inter medium (1.125rem), spaced 2rem (32px) apart.
- **Cards**: For chat messages or bookings – White background, 1.25rem (20px) padding, 0.5rem (8px) rounded corners, subtle shadow (`box-shadow: 0 2px 4px rgba(0,0,0,0.05)`), 1.5rem (24px) margin between.
- **Chat Layout**: Fills the page below navigation; message history scrolls if needed.
- **Grid Layout**: Booking options in a two-column grid on desktop (2rem gap), one-column on mobile.

Align to an 8px grid (e.g., padding/margins in multiples of 0.5rem).

---

## Animations & Hover Effects

Subtle animations and hover effects enhance interactivity and modernity.

- **Button Hover**: Transition to Secondary Blue (0.3s), scale up to 1.05, add shadow (`box-shadow: 0 4px 8px rgba(0,0,0,0.1)`).
- **Button Click**: Scale down to 0.95 (0.1s) for feedback.
- **Navigation Hover**: Links get a Secondary Blue underline (0.2s transition).
- **Chat Messages**: New messages fade in and slide up (0.3s animation).
- **Form Focus**: Inputs gain a Secondary Blue border and glow (`box-shadow: 0 0 0 2px rgba(59,130,246,0.5)`).
- **Loading Spinner**: Simple rotating spinner (1s animation) for data fetches.
- **Toast Notifications**: Slide in from the bottom (0.5s), auto-hide after 3s (e.g., "Order placed!").

**Example CSS**:
```css
@keyframes slideIn {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.message { animation: slideIn 0.3s ease-in; }