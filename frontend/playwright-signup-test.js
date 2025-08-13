import { chromium } from 'playwright';

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://denistek.online/';
const API_DELETE_USER_URL = 'https://api.denistek.online/api/v1/production-test/users/by-email';
const TEST_EMAIL = 'playwright@test.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Playwright Test User';

async function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  // Use playwright@test.com pattern but make it unique
  return `playwright-${timestamp}-${random}@test.com`;
}

async function deleteTestUser(page) {
  console.log('🗑️ Deleting test user before signup...');
  console.log(`🎯 Target email: ${TEST_EMAIL}`);
  console.log(`🔗 Delete URL: ${API_DELETE_USER_URL}/${TEST_EMAIL}`);
  
  try {
    // Use page.request to avoid CORS issues
    const deleteResponse = await page.request.delete(`${API_DELETE_USER_URL}/${TEST_EMAIL}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await deleteResponse.text();
    console.log(`📡 Delete response: ${deleteResponse.status()} - ${responseText}`);
    
    if (deleteResponse.ok()) {
      console.log('✅ Test user deleted successfully');
      return true;
    } else if (deleteResponse.status() === 404) {
      console.log('ℹ️ Test user not found - nothing to delete');
      return true;
    } else {
      console.log(`❌ Failed to delete user: ${deleteResponse.status()} ${deleteResponse.statusText()} - ${responseText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error during user deletion: ${error.message}`);
    return false;
  }
}

async function testSignup() {
  console.log('🚀 Starting Playwright signup test...');
  console.log(`Target: ${WEBSITE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let page = null;
  
  try {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Delete test user first
    await deleteTestUser(page);
    
    // Navigate to signup page
    console.log('📱 Navigating to signup page...');
    try {
      await page.goto(`${WEBSITE_URL}/signup`, { 
        waitUntil: 'domcontentloaded',  // Changed from 'networkidle' to be less strict
        timeout: 30000 
      });
      console.log('✅ Page loaded successfully');
    } catch (gotoError) {
      console.log('⚠️ Initial navigation failed, trying with different strategy...');
      await page.goto(`${WEBSITE_URL}/signup`, { 
        waitUntil: 'load',
        timeout: 20000 
      });
    }
    
    // Debug: Print page title and URL
    console.log(`📄 Page title: ${await page.title()}`);
    console.log(`🔗 Current URL: ${page.url()}`);
    
    // Debug: Count input fields
    const inputCount = await page.locator('input').count();
    console.log(`🔢 Found ${inputCount} input fields on page`);
    
    // Wait for form elements - using more flexible selectors
    console.log('🔍 Waiting for signup form...');
    await page.waitForSelector('input[placeholder*="Full Name"], input[aria-label*="Full Name"], input[name*="name"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder*="Email"], input[aria-label*="Email"], input[name*="email"], input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder*="Password"], input[aria-label*="Password"], input[name*="password"], input[type="password"]', { timeout: 10000 });
    
    // Also wait for the submit button to ensure form is fully loaded
    await page.waitForSelector('button[type="submit"], button:has-text("Sign Up"), input[type="submit"]', { timeout: 10000 });
    
    console.log('✅ Signup form loaded successfully');
    
    // Use fixed test email
    const testEmail = TEST_EMAIL;
    console.log(`📧 Testing with email: ${testEmail}`);
    
    // Fill out the form using more flexible selectors
    console.log('📝 Filling signup form...');
    
    // Try multiple selector strategies for each field
    const nameField = page.locator('input[placeholder*="Full Name"], input[aria-label*="Full Name"], input[name*="name"]').first();
    const emailField = page.locator('input[placeholder*="Email"], input[aria-label*="Email"], input[name*="email"], input[type="email"]').first();
    const passwordField = page.locator('input[placeholder*="Password"], input[aria-label*="Password"], input[name*="password"], input[type="password"]').first();
    const confirmPasswordField = page.locator('input[placeholder*="Confirm"], input[aria-label*="Confirm"]').first();
    
    await nameField.fill(TEST_NAME);
    await emailField.fill(testEmail);
    await passwordField.fill(TEST_PASSWORD);
    
    // Handle confirm password field if it exists
    try {
      await confirmPasswordField.fill(TEST_PASSWORD, { timeout: 2000 });
    } catch (e) {
      console.log('ℹ️ No confirm password field found, continuing...');
    }
    
    console.log('✅ Form filled successfully');
    
    // Submit the form and wait for response
    console.log('🚀 Submitting signup form...');
    
    // Listen for network responses
    let signupResponseReceived = false;
    let signupSuccess = false;
    
    page.on('response', async (response) => {
      if (response.url().includes('/signup') || response.url().includes('/register') || response.url().includes('/auth')) {
        console.log(`📡 Response: ${response.status()} ${response.url()}`);
        signupResponseReceived = true;
        
        if (response.status() === 200 || response.status() === 201) {
          signupSuccess = true;
          console.log('✅ Signup API call successful!');
        } else if (response.status() >= 400) {
          try {
            const responseBody = await response.text();
            console.log(`❌ Error response body: ${responseBody}`);
          } catch (e) {
            console.log('❌ Could not read error response body');
          }
        }
      }
    });
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), input[type="submit"]').first();
    
    // Click submit and wait for response
    await submitButton.click();
    
    // Wait for response
    console.log('⏳ Waiting for signup response...');
    
    try {
      // Wait for various possible success scenarios OR successful API response
      await Promise.race([
        // Navigation-based success
        page.waitForURL('**/dashboard*', { timeout: 8000 }),
        page.waitForURL('**/login*', { timeout: 8000 }),  // Sometimes redirects to login after signup
        
        // Content-based success  
        page.waitForSelector('[data-testid="success"]', { timeout: 8000 }),
        page.waitForText('success', { timeout: 8000 }),
        page.waitForText('welcome', { timeout: 8000 }),
        page.waitForText('account created', { timeout: 8000 }),
        page.waitForText('registration successful', { timeout: 8000 }),
        
        // Form disappears or changes
        page.waitForFunction(() => !document.querySelector('input[type="submit"], button[type="submit"]'), { timeout: 8000 }),
        
        // Wait for successful API response + any page change
        page.waitForFunction(() => window.location.href !== 'https://denistek.online/signup', { timeout: 8000 })
      ]);
      
      console.log('✅ SIGNUP TEST PASSED - Registration successful!');
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🕐 Time: ${new Date().toISOString()}`);
      console.log(`🔗 Final URL: ${page.url()}`);
      
      return { success: true, email: testEmail };
      
    } catch (timeoutError) {
      console.log('⚠️ No immediate success detected, checking for API response and current state...');
      
      // Wait a moment for any pending network requests
      await page.waitForTimeout(2000);
      
      // Take a screenshot to see current state
      await page.screenshot({ path: 'signup-debug.png', fullPage: true });
      console.log('📸 Debug screenshot saved: signup-debug.png');
      
      // Check if we got a successful API response
      if (signupSuccess) {
        console.log('✅ SIGNUP SUCCESS: API returned success status');
        console.log(`🔗 Current URL: ${page.url()}`);
        console.log(`📧 Email: ${testEmail}`);
        return { success: true, email: testEmail };
      }
      
      // Check if we're no longer on the signup page (common success indicator)
      if (!page.url().includes('/signup')) {
        console.log('✅ SIGNUP SUCCESS: Redirected away from signup page');
        console.log(`🔗 Current URL: ${page.url()}`);
        console.log(`📧 Email: ${testEmail}`);
        return { success: true, email: testEmail };
      }
      
      // Check for error messages
      const errorSelectors = [
        'text=already exists',
        'text=error',
        'text=Error',
        'text=invalid',
        'text=failed',
        '[role="alert"]',
        '.error',
        '.alert-error',
        '.error-message'
      ];
      
      let errorFound = false;
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.waitForSelector(selector, { timeout: 2000 });
          if (errorElement) {
            const errorText = await errorElement.textContent();
            console.error(`❌ SIGNUP FAILED: ${errorText}`);
            errorFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!errorFound) {
        // Check if we're still on the same page with the form
        const stillHasForm = await page.locator('button[type="submit"], input[type="submit"]').count() > 0;
        if (stillHasForm) {
          console.error('❌ SIGNUP FAILED: Form still present, likely validation error');
        } else {
          console.log('✅ Form disappeared - signup might have succeeded but no clear success indicator found');
          console.log(`🔗 Current URL: ${page.url()}`);
          
          // If form is gone and we're not on the original signup page, consider it success
          if (!page.url().includes('/signup')) {
            console.log('🎉 Signup appears successful (redirected away from signup page)');
            return { success: true, email: testEmail };
          }
        }
      }
      
      throw new Error('Signup test failed');
    }
    
  } catch (error) {
    // Take screenshot on any failure
    if (page) {
      try {
        await page.screenshot({ path: 'signup-failure.png', fullPage: true });
        console.log('📸 Screenshot saved: signup-failure.png');
      } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError.message);
      }
    }
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testSignup()
  .then((result) => {
    console.log('🎉 Playwright signup monitoring completed successfully');
    console.log(`✅ Test result:`, result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Playwright signup monitoring failed:', error.message);
    process.exit(1);
  });
