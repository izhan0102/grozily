# Grozily Vendor Portal Development Prompt

## Project Overview
Create a complementary vendor portal for the Grozily grocery shopping application. This portal will allow vendors to manage their products, track orders, and interact with customers.

## Tech Stack Requirements
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: Firebase Firestore (to maintain consistency with the consumer app)
- **Authentication**: Firebase Authentication
- **Cloud Functions**: Firebase Cloud Functions for serverless operations
- **Styling**: Tailwind CSS for consistent styling
- **State Management**: React Context API or Redux Toolkit

## Core Features to Implement

### Authentication System
- Vendor registration with email verification
- Login with email/password
- Password reset functionality
- Role-based authentication (admin vendors vs staff accounts)
- Session management with secure JWT

### Dashboard
- Overview statistics (total sales, pending orders, revenue metrics)
- Quick action buttons (add product, view orders, etc.)
- Notification center for new orders, low stock alerts, etc.
- Daily/weekly/monthly sales charts

### Product Management
- Add/edit/delete products with images, descriptions, pricing
- Bulk product import/export via CSV
- Inventory tracking with low stock alerts
- Category and tag management
- Product variants (size, packaging options)
- Special offers and discounts management

### Order Management
- Real-time order notifications
- Order status tracking (new, processing, shipped, delivered)
- Order details view with customer information
- Batch order processing
- Order history with search and filter options

### Customer Interaction
- Respond to product reviews and questions
- Direct messaging with customers
- Promotional announcements
- Custom notification sending to customers

### Analytics
- Sales performance by product/category
- Customer behavior insights
- Inventory turnover analysis
- Peak sales time identification

### Settings & Configuration
- Store profile management
- Operating hours
- Delivery zones
- Payment preferences
- Staff account management

## Integration Points with Consumer App
- Ensure the vendor portal connects to the same Firebase instance as the consumer app
- Products added in the vendor portal should appear in the consumer app
- Orders placed in the consumer app should trigger notifications in the vendor portal
- Customer accounts should be accessible (in a limited way) to vendors for communication

## Technical Implementation Details
- Implement real-time data synchronization using Firebase Realtime Database or Firestore
- Set up proper security rules in Firebase to protect vendor and customer data
- Create a responsive design that works on desktop primarily but also functions on tablets
- Implement proper error handling and logging
- Set up automated testing for critical functionality

## Data Structure Guidelines
Follow this Firestore structure to ensure compatibility with the consumer app:

```
/vendors/{vendorId}/
  - basic info (name, address, contact)
  - operatingHours
  - deliveryZones
  
/products/{productId}/
  - name, description, images
  - price, discountPrice
  - categoryId
  - vendorId (reference)
  - inventory
  
/orders/{orderId}/
  - customerId
  - vendorId
  - products (array of product references with quantity)
  - status
  - timestamps (created, updated, delivered)
  
/categories/{categoryId}/
  - name
  - image
```

## Key UI/UX Considerations
- Clean, professional interface with Grozily brand colors
- Intuitive navigation with sidebar for main features
- Mobile-responsive design with priority for desktop users
- Clear notifications for new orders and customer interactions
- Simplified workflows for common tasks (especially order processing)

## Development Approach
1. Set up the project scaffold with Create React App or Next.js
2. Configure Firebase integration and authentication
3. Implement core dashboard with placeholder data
4. Build product management CRUD operations
5. Develop order management with status workflow
6. Add analytics and reporting features
7. Implement customer interaction tools
8. Add settings and configuration options
9. Polish UI/UX and responsive design
10. Implement comprehensive testing

## Deployment Guidelines
- Set up CI/CD pipeline with GitHub Actions
- Configure Firebase Hosting for the frontend
- Set up proper environment configurations (dev, staging, production)
- Implement proper error logging and monitoring

This vendor portal should feel like a natural extension of the Grozily ecosystem while providing powerful tools for vendors to manage their relationship with customers and products. 