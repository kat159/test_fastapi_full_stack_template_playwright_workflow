const { chromium } = require('playwright');

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://denistek.online/';
const TEST_EMAIL = 'playwright@test.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Playwright Test User';

async function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  // Use playwright@test.com pattern but make it unique
  return `playwright-${timestamp}-${random}@test.com`;
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
    
    // Navigate to signup page
    console.log('📱 Navigating to signup page...');
    await page.goto(`${WEBSITE_URL}/signup`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for form elements
    console.log('🔍 Waiting for signup form...');
    await page.waitForSelector('input[placeholder="Full Name"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Email"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Password"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder="Confirm Password"]', { timeout: 10000 });
    
    console.log('✅ Signup form loaded successfully');
    
    // Generate unique test email
    const uniqueEmail = await generateUniqueEmail();
    console.log(`📧 Testing with email: ${uniqueEmail}`);
    
    // Fill out the form
    console.log('📝 Filling signup form...');
    await page.fill('input[placeholder="Full Name"]', TEST_NAME);
    await page.fill('input[placeholder="Email"]', uniqueEmail);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.fill('input[placeholder="Confirm Password"]', TEST_PASSWORD);
    
    console.log('✅ Form filled successfully');
    
    // Submit the form
    console.log('🚀 Submitting signup form...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for response
    console.log('⏳ Waiting for signup response...');
    
    try {
      // Wait for success indicators
      await Promise.race([
        page.waitForURL('**/dashboard*', { timeout: 15000 }),
        page.waitForURL('**/', { timeout: 15000 }),
        page.waitForSelector('[data-testid="success"]', { timeout: 15000 }),
        page.waitForText('success', { timeout: 15000 }),
        page.waitForText('welcome', { timeout: 15000 })
      ]);
      
      console.log('✅ SIGNUP TEST PASSED - Registration successful!');
      console.log(`📧 Email: ${uniqueEmail}`);
      console.log(`🕐 Time: ${new Date().toISOString()}`);
      
      return { success: true, email: uniqueEmail };
      
    } catch (timeoutError) {
      // Check for error messages
      const errorSelectors = [
        'text=already exists',
        'text=error',
        'text=Error',
        '[role="alert"]',
        '.error'
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
        console.error('❌ SIGNUP FAILED: Timeout waiting for response');
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
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Playwright signup monitoring failed:', error.message);
    process.exit(1);
  });
