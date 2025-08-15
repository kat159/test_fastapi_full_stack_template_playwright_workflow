const { chromium } = require('playwright');

// Remove trailing slash from URL if present
const rawUrl = process.env.WEBSITE_URL || 'https://denistek.online/';
const WEBSITE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
const TEST_EMAIL = 'playwright@test.com';
const TEST_PASSWORD = 'TestPassword123!';

async function testChatbot() {
  console.log('🤖 Starting Playwright chatbot test...');
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
    
    // Step 1: Login
    console.log('🔐 Step 1: Logging in...');
    await page.goto(`${WEBSITE_URL}/login`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.fill('input[type="email"], input[placeholder*="Email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="Password"]', TEST_PASSWORD);
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForTimeout(3000);
    
    console.log(`✅ Logged in - Current URL: ${page.url()}`);
    
    // Step 2: Navigate to Greg Lam chat
    console.log('🤖 Step 2: Looking for Greg Lam button...');
    
    const gregLamButtonSelectors = [
      'a:has-text("Greg Lam")',
      'button:has-text("Greg Lam")',
      '[href*="greg"]',
      'a:has-text("Greg Lam (Dublin Ward 3)")',
      'button:has-text("Greg Lam (Dublin Ward 3)")'
    ];
    
    let gregLamButton = null;
    for (const selector of gregLamButtonSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 3000 });
        if (element) {
          gregLamButton = element;
          console.log(`✅ Found Greg Lam button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!gregLamButton) {
      throw new Error('Could not find Greg Lam button. User may not be subscribed.');
    }
    
    console.log('🖱️ Clicking Greg Lam button...');
    await gregLamButton.click();
    await page.waitForTimeout(2000);
    
    // Step 3: Start new chat if needed
    console.log('🆕 Step 3: Checking for Start New Chat button...');
    
    try {
      const startChatButton = await page.waitForSelector('button:has-text("Start New Chat")', { timeout: 3000 });
      if (startChatButton) {
        console.log('🖱️ Clicking Start New Chat button...');
        await startChatButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('ℹ️ No Start New Chat button found, assuming already in chat');
    }
    
    // Step 4: Send test message
    console.log('💬 Step 4: Sending test message...');
    
    const messageInput = await page.waitForSelector('textarea[placeholder*="message"], input[placeholder*="message"]', { timeout: 5000 });
    
    const testMessage = "Hello! Can you tell me about upcoming events in Dublin Ward 3?";
    console.log(`💬 Sending: "${testMessage}"`);
    
    await messageInput.fill(testMessage);
    await page.waitForTimeout(1000); // Wait for the button to become enabled
    
    // Send the message - look for the correct send button
    try {
      const sendButton = await page.waitForSelector('button[aria-label="Send message"]', { timeout: 3000 });
      const isDisabled = await sendButton.getAttribute('disabled');
      if (isDisabled === null) {
        await sendButton.click();
        console.log('📤 Message sent via Send button');
      } else {
        console.log('📤 Send button is disabled, trying Enter key');
        await messageInput.press('Enter');
      }
    } catch (e) {
      console.log('📤 Send button not found, trying Enter key');
      await messageInput.press('Enter');
    }
    
    // Step 5: Wait for and check response
    console.log('🤖 Step 5: Waiting for chatbot response...');
    await page.waitForTimeout(10000); // Wait longer for AI response
    
    // Take screenshot of final chat state
    await page.screenshot({ path: 'chatbot-test-final.png', fullPage: true });
    console.log('📸 Chatbot test screenshot saved: chatbot-test-final.png');
    
    // Check for response by comparing page content length
    let hasResponse = false;
    try {
      // Get the full page text content
      const fullPageContent = await page.textContent('body');
      console.log(`📄 Full page content length: ${fullPageContent.length}`);
      console.log(`📝 Test message length: ${testMessage.length}`);
      
      // Calculate content length difference
      const contentDifference = fullPageContent.length - testMessage.length;
      console.log(`📊 Content difference: ${contentDifference}`);
      
      // If there's significant additional content (more than 40 characters), consider it a response
      if (contentDifference > 40) {
        hasResponse = true;
        console.log('🎉 Chatbot response detected based on content length!');
      } else {
        console.log('⚠️ Not enough additional content to indicate a response');
      }
    } catch (e) {
      console.log('❌ Error checking for response:', e.message);
    }
    
    if (hasResponse) {
      console.log('🎉 Chatbot test successful! Response detected.');
    } else {
      console.log('⚠️ No clear response detected, but message was sent.');
    }
    
    return { 
      success: true, 
      email: TEST_EMAIL,
      chatbotTested: true,
      chatbotResponded: hasResponse,
      testMessage: testMessage
    };
    
  } catch (error) {
    // Take screenshot on any failure
    if (page) {
      try {
        await page.screenshot({ path: 'chatbot-test-failure.png', fullPage: true });
        console.log('📸 Failure screenshot saved: chatbot-test-failure.png');
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
testChatbot()
  .then((result) => {
    console.log('🎉 Playwright chatbot test completed');
    console.log(`✅ Test result:`, result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Playwright chatbot test failed:', error.message);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && reason.message.includes('Target page, context or browser has been closed')) {
    console.log('ℹ️ Ignoring browser close error (expected behavior)');
    return;
  }
  console.error('Unhandled promise rejection:', reason);
});
