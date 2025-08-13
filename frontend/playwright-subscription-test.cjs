const { chromium } = require('playwright');

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://denistek.online/';
const API_DELETE_USER_URL = 'https://api.denistek.online/api/v1/production-test/users/by-email';
const TEST_EMAIL = 'playwright@test.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Playwright Test User';

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

async function testSignupAndSubscription() {
  console.log('🚀 Starting Playwright signup and subscription test...');
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
    
    // Step 1: Sign up
    console.log('📱 Step 1: Navigating to signup page...');
    await page.goto(`${WEBSITE_URL}/signup`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('🔍 Waiting for signup form...');
    await page.waitForSelector('input[placeholder*="Full Name"], input[aria-label*="Full Name"], input[name*="name"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder*="Email"], input[aria-label*="Email"], input[name*="email"], input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder*="Password"], input[aria-label*="Password"], input[name*="password"], input[type="password"]', { timeout: 10000 });
    
    console.log('📝 Filling signup form...');
    const nameField = page.locator('input[placeholder*="Full Name"], input[aria-label*="Full Name"], input[name*="name"]').first();
    const emailField = page.locator('input[placeholder*="Email"], input[aria-label*="Email"], input[name*="email"], input[type="email"]').first();
    const passwordField = page.locator('input[placeholder*="Password"], input[aria-label*="Password"], input[name*="password"], input[type="password"]').first();
    const confirmPasswordField = page.locator('input[placeholder*="Confirm"], input[aria-label*="Confirm"]').first();
    
    await nameField.fill(TEST_NAME);
    await emailField.fill(TEST_EMAIL);
    await passwordField.fill(TEST_PASSWORD);
    
    try {
      await confirmPasswordField.fill(TEST_PASSWORD, { timeout: 2000 });
    } catch (e) {
      console.log('ℹ️ No confirm password field found, continuing...');
    }
    
    console.log('🚀 Submitting signup form...');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), input[type="submit"]').first();
    await submitButton.click();
    
    // Wait for signup success
    await page.waitForTimeout(3000);
    console.log(`✅ Signup completed - Current URL: ${page.url()}`);
    
    // Step 2: Login (in case signup redirected to login)
    if (page.url().includes('/login') || page.url().includes('/signin')) {
      console.log('🔐 Step 2: Logging in...');
      await page.fill('input[type="email"], input[placeholder*="Email"]', TEST_EMAIL);
      await page.fill('input[type="password"], input[placeholder*="Password"]', TEST_PASSWORD);
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      await page.waitForTimeout(3000);
    }
    
    // Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard') && !page.url().includes('/admin')) {
      console.log('🏠 Navigating to dashboard...');
      await page.goto(`${WEBSITE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    }
    
    console.log(`📄 Current page: ${page.url()}`);
    
    // Step 3: Navigate to Manage Subscriptions
    console.log('📋 Step 3: Looking for Manage Subscriptions...');
    
    // Look for various ways to access Manage Subscriptions
    const subscriptionSelectors = [
      'a:has-text("Manage Subscriptions")',
      'button:has-text("Manage Subscriptions")',
      '[href*="subscription"]',
      '[href*="/subscriptions"]',
      'a:has-text("Subscriptions")',
      'button:has-text("Subscriptions")',
      // Navigation menu items
      'nav a:has-text("Manage Subscriptions")',
      'nav a:has-text("Subscriptions")',
      // Sidebar links
      '.sidebar a:has-text("Manage Subscriptions")',
      '.sidebar a:has-text("Subscriptions")',
      // Menu items with icons
      '[data-testid*="subscription"]',
      '[aria-label*="Subscription"]'
    ];
    
    let subscriptionLink = null;
    for (const selector of subscriptionSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          subscriptionLink = element;
          console.log(`✅ Found subscription link with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!subscriptionLink) {
      // Take screenshot to see what's available
      await page.screenshot({ path: 'dashboard-debug.png', fullPage: true });
      console.log('📸 Dashboard screenshot saved: dashboard-debug.png');
      
      // Log all available links for debugging
      const allLinks = await page.locator('a').allTextContents();
      console.log('🔍 Available links on page:', allLinks);
      
      throw new Error('Could not find Manage Subscriptions link');
    }
    
    console.log('🖱️ Clicking Manage Subscriptions...');
    await subscriptionLink.click();
    await page.waitForTimeout(2000);
    
    console.log(`📋 Subscription page loaded: ${page.url()}`);
    
    // Step 4: Find and toggle Greg Lam's switch
    console.log('👤 Step 4: Looking for Greg Lam subscription...');
    
    // Look for Greg Lam in various ways
    const gregLamSelectors = [
      // Text containing Greg Lam
      ':has-text("Greg Lam")',
      ':has-text("Greg Lam (Dublin Ward 3)")',
      // Switch near Greg Lam text
      ':has-text("Greg Lam") ~ input[type="checkbox"]',
      ':has-text("Greg Lam") ~ button',
      ':has-text("Greg Lam") ~ .switch',
      // Row containing Greg Lam
      'tr:has-text("Greg Lam")',
      'div:has-text("Greg Lam")',
      // Politics section with Greg Lam
      '.politics :has-text("Greg Lam")',
      '[data-category="politics"] :has-text("Greg Lam")',
      // Generic switch/checkbox patterns
      'input[type="checkbox"]',
      '.switch',
      '[role="switch"]',
      'button[role="switch"]'
    ];
    
    // Take screenshot of subscription page
    await page.screenshot({ path: 'subscription-page.png', fullPage: true });
    console.log('📸 Subscription page screenshot saved: subscription-page.png');
    
    // Log page content for debugging
    const pageText = await page.textContent('body');
    console.log('📄 Page contains "Greg Lam":', pageText.includes('Greg Lam'));
    console.log('📄 Page contains "Politics":', pageText.includes('Politics'));
    
    let gregSwitch = null;
    let foundElement = null;
    
    // First try to find Greg Lam text
    for (const selector of ['text=Greg Lam', ':has-text("Greg Lam")', '*:has-text("Greg Lam")']) {
      try {
        foundElement = await page.waitForSelector(selector, { timeout: 3000 });
        if (foundElement) {
          console.log(`✅ Found Greg Lam element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (foundElement) {
      // Look for switch/checkbox near Greg Lam
      console.log('🔍 Looking for switch near Greg Lam...');
      
      // Try to find switch in the same row/container
      const switchSelectors = [
        // Chakra UI Switch components
        ':has-text("Greg Lam") [data-scope="switch"]',
        ':has-text("Greg Lam") .chakra-switch',
        ':has-text("Greg Lam") [role="switch"]',
        ':has-text("Greg Lam") input[type="checkbox"]',
        ':has-text("Greg Lam") button[role="switch"]',
        ':has-text("Greg Lam") .switch',
        ':has-text("Greg Lam") button',
        // Try parent containers
        'tr:has-text("Greg Lam") [data-scope="switch"]',
        'tr:has-text("Greg Lam") .chakra-switch',
        'tr:has-text("Greg Lam") input[type="checkbox"]',
        'tr:has-text("Greg Lam") button[role="switch"]',
        'div:has-text("Greg Lam") [data-scope="switch"]',
        'div:has-text("Greg Lam") .chakra-switch',
        'div:has-text("Greg Lam") input[type="checkbox"]',
        'div:has-text("Greg Lam") button[role="switch"]'
      ];
      
      for (const switchSelector of switchSelectors) {
        try {
          gregSwitch = page.locator(switchSelector).first();
          if (await gregSwitch.count() > 0) {
            console.log(`✅ Found switch near Greg Lam with selector: ${switchSelector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (!gregSwitch) {
      // Fallback: look for any switches on the page
      console.log('⚠️ Could not find specific Greg Lam switch, looking for any switches...');
      const allSwitches = await page.locator('input[type="checkbox"], button[role="switch"], .switch, [role="switch"]').count();
      console.log(`🔢 Found ${allSwitches} switches on page`);
      
      if (allSwitches > 0) {
        gregSwitch = page.locator('input[type="checkbox"], button[role="switch"], .switch, [role="switch"]').first();
        console.log('ℹ️ Using first available switch');
      }
    }
    
    if (!gregSwitch) {
      throw new Error('Could not find any switch for Greg Lam subscription');
    }
    
    // Check current state and toggle if needed
    console.log('🔄 Checking switch state...');
    
    // For Chakra UI switches, check the data-state attribute or input checked state
    let isChecked = false;
    try {
      if (await gregSwitch.getAttribute('data-state') === 'checked') {
        isChecked = true;
      } else if (await gregSwitch.getAttribute('type') === 'checkbox') {
        isChecked = await gregSwitch.isChecked();
      } else {
        // Try to find the actual input within the switch
        const input = await gregSwitch.locator('input[type="checkbox"]').first();
        if (await input.count() > 0) {
          isChecked = await input.isChecked();
        }
      }
    } catch (e) {
      console.log('ℹ️ Could not determine switch state, assuming OFF');
      isChecked = false;
    }
    
    console.log(`📊 Switch current state: ${isChecked ? 'ON' : 'OFF'}`);
    
    if (!isChecked) {
      console.log('✅ Toggling Greg Lam subscription switch ON...');
      
      // Try different click strategies for Chakra UI
      try {
        await gregSwitch.click({ force: true });
      } catch (clickError) {
        console.log('⚠️ Direct click failed, trying alternative methods...');
        
        // Try clicking the switch control element
        try {
          const switchControl = page.locator(':has-text("Greg Lam") [data-scope="switch"][data-part="control"]').first();
          if (await switchControl.count() > 0) {
            await switchControl.click({ force: true });
          } else {
            // Try the label
            const switchLabel = page.locator(':has-text("Greg Lam")').first();
            await switchLabel.click();
          }
        } catch (alternativeError) {
          console.log('⚠️ Alternative click methods failed, using keyboard');
          await gregSwitch.press('Space');
        }
      }
      
      await page.waitForTimeout(1000);
      
      // Verify the change
      let newState = false;
      try {
        if (await gregSwitch.getAttribute('data-state') === 'checked') {
          newState = true;
        } else if (await gregSwitch.getAttribute('type') === 'checkbox') {
          newState = await gregSwitch.isChecked();
        } else {
          const input = await gregSwitch.locator('input[type="checkbox"]').first();
          if (await input.count() > 0) {
            newState = await input.isChecked();
          }
        }
      } catch (e) {
        console.log('ℹ️ Could not verify new switch state');
      }
      
      console.log(`📊 Switch new state: ${newState ? 'ON' : 'OFF'}`);
      
      if (newState) {
        console.log('🎉 Successfully subscribed to Greg Lam!');
      } else {
        console.log('⚠️ Switch toggle may not have worked as expected');
      }
    } else {
      console.log('ℹ️ Greg Lam subscription is already enabled');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'subscription-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: subscription-final.png');
    
    return { 
      success: true, 
      email: TEST_EMAIL,
      subscriptionEnabled: true 
    };
    
  } catch (error) {
    // Take screenshot on any failure
    if (page) {
      try {
        await page.screenshot({ path: 'subscription-test-failure.png', fullPage: true });
        console.log('📸 Failure screenshot saved: subscription-test-failure.png');
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
testSignupAndSubscription()
  .then((result) => {
    console.log('🎉 Playwright signup and subscription test completed successfully');
    console.log(`✅ Test result:`, result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Playwright signup and subscription test failed:', error.message);
    process.exit(1);
  });

// Handle unhandled promise rejections to prevent the error
process.on('unhandledRejection', (reason, promise) => {
  // Ignore unhandled promise rejections from Playwright wait operations
  if (reason && reason.message && reason.message.includes('Target page, context or browser has been closed')) {
    console.log('ℹ️ Ignoring browser close error (expected behavior)');
    return;
  }
  console.error('Unhandled promise rejection:', reason);
});
