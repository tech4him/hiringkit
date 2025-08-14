# Comprehensive Test Plan - Hiring Kit SaaS

## Overview
This test plan covers all critical user paths, functionality, and edge cases for the hiringkit application after security fixes and improvements.

## Test Categories

### 1. Guest User Journey (Anonymous)
**Path**: Landing → Kit Creation → Preview → Payment

#### Test Cases:
- [ ] **TC1.1** - Kit Generation (Express Mode)
  - POST `/api/kits/generate` with minimal data
  - Verify 200 response with full kit artifacts
  - Validate response structure matches KitArtifacts schema

- [ ] **TC1.2** - Kit Generation (Detailed Mode) 
  - POST `/api/kits/generate` with complete intake data
  - Verify detailed artifacts generation
  - Test validation error responses for missing fields

- [ ] **TC1.3** - Kit Preview Access
  - GET `/kit/[id]/preview` without payment
  - Verify preview gating (truncated content, watermarks)
  - Ensure full content blocked until payment

### 2. Payment Flow
**Path**: Kit Preview → Checkout → Payment → Success

#### Test Cases:
- [ ] **TC2.1** - Checkout Session Creation (Solo Plan)
  - POST `/api/checkout` with solo plan
  - Verify Stripe session creation
  - Check metadata and pricing

- [ ] **TC2.2** - Checkout Session Creation (Pro Plan)
  - POST `/api/checkout` with pro plan  
  - Verify higher pricing and QA metadata
  - Check pro plan features

- [ ] **TC2.3** - Webhook Processing (Payment Success)
  - Simulate Stripe webhook for successful payment
  - Verify order status updates
  - Test email notification triggers
  - Verify idempotency (duplicate webhook handling)

- [ ] **TC2.4** - Success Page Access
  - GET `/kit/[id]/success` after payment
  - Verify order status retrieval
  - Check download button availability

### 3. PDF Download Functions
**Path**: Success Page → Download → PDF Generation

#### Test Cases:
- [ ] **TC3.1** - Combined PDF Download
  - POST `/api/kits/[id]/export` with export_type="combined_pdf"
  - Verify PDF generation process
  - Test download response headers
  - Validate PDF content and structure

- [ ] **TC3.2** - ZIP Download (Individual PDFs)
  - POST `/api/kits/[id]/export` with export_type="zip"
  - Verify ZIP file creation with individual PDFs
  - Test ZIP contents and structure
  - Validate each PDF in ZIP

- [ ] **TC3.3** - Download Authorization
  - Test download without payment (should fail)
  - Test download with invalid kit ID
  - Verify payment verification logic

- [ ] **TC3.4** - Mock vs Production PDF Strategy
  - Test PDF generation in development mode (mock)
  - Verify PDFShift integration in production mode
  - Test fallback mechanisms

### 4. Admin Functionality  
**Path**: Admin Login → Orders Management → Kit Approval

#### Test Cases:
- [ ] **TC4.1** - Admin Authentication
  - GET `/api/admin/orders` without auth (should return 401)
  - Test admin email verification logic
  - Verify admin-only access patterns

- [ ] **TC4.2** - Orders Management
  - GET `/api/admin/orders` with pagination
  - Test filtering by status
  - Verify order data completeness

- [ ] **TC4.3** - Kit Approval (Pro Plans)
  - POST `/api/admin/kits/[id]/approve`
  - Verify status updates (kit and order)
  - Test approval email notifications
  - Check audit log creation

### 5. API Validation & Error Handling
**Path**: All API endpoints with invalid data

#### Test Cases:
- [ ] **TC5.1** - Input Validation
  - Test all Zod schemas with invalid data
  - Verify error response format and codes
  - Test boundary conditions and edge cases

- [ ] **TC5.2** - Authentication Errors
  - Test protected routes without authentication
  - Verify consistent error responses
  - Test token expiration scenarios

- [ ] **TC5.3** - Database Error Handling
  - Test with invalid kit IDs
  - Test database connection failures
  - Verify graceful error responses

### 6. Email Notifications
**Path**: Payment Success → Email Delivery

#### Test Cases:
- [ ] **TC6.1** - Order Confirmation Email
  - Trigger via webhook simulation
  - Verify email content and formatting
  - Test both solo and pro plan emails

- [ ] **TC6.2** - Approval Notification Email
  - Trigger via admin approval
  - Verify pro plan completion notifications
  - Test email template rendering

### 7. Security & Rate Limiting
**Path**: Security boundaries and limits

#### Test Cases:
- [ ] **TC7.1** - Rate Limiting
  - Test API rate limits (10 req/min anonymous)
  - Verify 429 responses after threshold
  - Test authenticated vs anonymous limits

- [ ] **TC7.2** - CORS and Security Headers
  - Test cross-origin requests
  - Verify security headers in responses
  - Test CSP and other protections

- [ ] **TC7.3** - Webhook Security
  - Test webhook without valid signature
  - Verify signature validation
  - Test replay attack prevention

### 8. Performance & Edge Cases
**Path**: System limits and failure modes

#### Test Cases:
- [ ] **TC8.1** - Large Kit Generation
  - Test with maximum input sizes
  - Verify timeout handling
  - Test memory usage patterns

- [ ] **TC8.2** - Concurrent Users
  - Multiple simultaneous kit generations
  - Concurrent download requests
  - Database connection pooling

- [ ] **TC8.3** - Network Failures
  - Test OpenAI API timeouts
  - Test PDFShift service failures
  - Test email service outages

## Success Criteria

### Critical Path Success (Must Pass)
- All guest user journey tests pass
- Payment flow works end-to-end
- PDF downloads work correctly
- Admin functions operate properly
- Security controls are effective

### Performance Benchmarks
- Kit generation: < 30 seconds
- PDF generation: < 10 seconds
- API response times: < 2 seconds
- Download initiation: < 1 second

### Error Handling Standards
- All errors return proper HTTP status codes
- Error messages are user-friendly
- No sensitive data leaked in error responses
- Graceful degradation when services fail

## Test Execution Strategy

1. **Development Environment Setup**
   - Clean database state
   - Mock external services where needed
   - Enable debug logging

2. **Test Data Preparation**
   - Valid kit data samples
   - Invalid input test cases
   - Payment test scenarios
   - Admin user setup

3. **Automated vs Manual Testing**
   - Automated: API endpoints, validation
   - Manual: PDF content, email formatting, UI flows
   - Performance: Load testing tools

4. **Test Execution Order**
   - Basic functionality first
   - Complex workflows second
   - Edge cases and errors last
   - Performance testing final

## Risk Assessment

### High Risk Areas
- PDF generation (external dependencies)
- Payment processing (Stripe integration)
- Email delivery (Resend service)
- File downloads (large file handling)

### Mitigation Strategies
- Implement comprehensive mocks
- Test with real services in staging
- Monitor external service status
- Have fallback mechanisms ready

## Test Environment Requirements

### Infrastructure
- Next.js development server
- Supabase database access
- Stripe test keys
- Resend test API
- PDFShift test credentials

### Test Tools
- cURL for API testing
- Browser for UI testing
- PDF validators
- Email testing tools
- Load testing utilities

## Success Metrics

- **Functional Coverage**: 100% of critical paths tested
- **API Coverage**: All endpoints tested with valid/invalid data  
- **Error Coverage**: All error conditions tested
- **Performance**: All benchmarks met
- **Security**: All security controls verified

This comprehensive test plan ensures we validate the complete user experience and system reliability.