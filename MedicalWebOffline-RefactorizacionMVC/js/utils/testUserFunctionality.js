/**
 * Test file to validate user management and display functionality
 * Run this in the browser console after loading any protected page
 */

// Test user display functionality
function testUserDisplay() {
    console.log('🧪 Testing user display functionality...');
    
    // Check if user display elements exist
    const userName = document.getElementById('userName');
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    
    console.log('✅ Element checks:');
    console.log('  - userName element:', !!userName, userName?.textContent);
    console.log('  - userIcon element:', !!userIcon);
    console.log('  - userDropdown element:', !!userDropdown);
    console.log('  - logoutBtn element:', !!logoutBtn);
    
    // Check current user
    try {
        const currentUser = authModel.getCurrentUser();
        console.log('✅ Current user:', currentUser);
    } catch (error) {
        console.error('❌ Error getting current user:', error);
    }
    
    // Test dropdown toggle
    if (userIcon && userDropdown) {
        console.log('🧪 Testing dropdown toggle...');
        userIcon.click();
        setTimeout(() => {
            const isVisible = userDropdown.style.display === 'block';
            console.log('  - Dropdown visible after click:', isVisible);
            
            // Close dropdown
            if (isVisible) {
                document.body.click();
                setTimeout(() => {
                    const isClosed = userDropdown.style.display === 'none' || userDropdown.style.display === '';
                    console.log('  - Dropdown closed after outside click:', isClosed);
                }, 100);
            }
        }, 100);
    }
    
    console.log('🏁 User display tests completed');
}

// Test user management functionality (only for usuarios-personal page)
function testUserManagement() {
    console.log('🧪 Testing user management functionality...');
    
    const userList = document.getElementById('user-list');
    const editButtons = document.querySelectorAll('.edit-user');
    const deleteButtons = document.querySelectorAll('.delete-user');
    
    console.log('✅ User management elements:');
    console.log('  - User list element:', !!userList);
    console.log('  - Edit buttons found:', editButtons.length);
    console.log('  - Delete buttons found:', deleteButtons.length);
    
    // Test user list rendering
    try {
        if (window.userView && typeof window.userView.renderUserList === 'function') {
            console.log('✅ userView.renderUserList function available');
        } else {
            console.log('⚠️ userView.renderUserList not found');
        }
    } catch (error) {
        console.error('❌ Error checking user view:', error);
    }
    
    console.log('🏁 User management tests completed');
}

// Test Event Bus functionality
function testEventBus() {
    console.log('🧪 Testing Event Bus functionality...');
    
    try {
        // Test event emission
        eventBus.emit('test_event', { message: 'Test event data' });
        
        // Test event subscription
        const testListener = eventBus.on('test_event_2', (data) => {
            console.log('✅ Event Bus listener triggered:', data);
        });
        
        eventBus.emit('test_event_2', { test: 'successful' });
        
        // Clean up
        eventBus.off('test_event_2', testListener);
        
        console.log('✅ Event Bus is working correctly');
    } catch (error) {
        console.error('❌ Event Bus error:', error);
    }
    
    console.log('🏁 Event Bus tests completed');
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting comprehensive functionality tests...');
    console.log('═'.repeat(50));
    
    testUserDisplay();
    console.log('─'.repeat(30));
    
    testUserManagement();
    console.log('─'.repeat(30));
    
    testEventBus();
    console.log('═'.repeat(50));
    console.log('🎯 All tests completed. Check console output for results.');
}

// Export test functions to window for easy access
window.TestSuite = {
    runAll: runAllTests,
    testUserDisplay,
    testUserManagement,
    testEventBus
};

console.log('🧪 Test suite loaded. Run TestSuite.runAll() to execute all tests.');