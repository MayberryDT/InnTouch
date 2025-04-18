// Test script for the Cloudbeds data sync button

// Simulate the DOM elements
const mockElements = {
    syncButton: {
        innerHTML: '<i class="fas fa-sync-alt"></i> Sync Cloudbeds Data',
        disabled: false
    },
    syncSuccess: {
        style: { display: 'none' },
        textContent: ''
    },
    syncError: {
        style: { display: 'none' },
        textContent: ''
    }
};

// Mock the document.getElementById function
global.document = {
    getElementById: (id) => {
        switch (id) {
            case 'sync-button':
                return mockElements.syncButton;
            case 'sync-success':
                return mockElements.syncSuccess;
            case 'sync-error':
                return mockElements.syncError;
            default:
                return null;
        }
    }
};

// Mock the fetch function
global.fetch = async (url, options) => {
    console.log(`Mocked fetch called with URL: ${url}`);
    console.log('Options:', JSON.stringify(options, null, 2));
    
    // For testing, let's simulate a successful response
    return {
        ok: true,
        json: async () => ({ 
            success: true, 
            message: 'Data synced successfully',
            imported: 15
        })
    };
};

// Mock localStorage
global.localStorage = {
    getItem: (key) => {
        if (key === 'staffToken') {
            return 'mock-jwt-token';
        }
        return null;
    }
};

// Mock console.error for cleaner output
const originalConsoleError = console.error;
console.error = (message) => {
    console.log(`Error logged: ${message}`);
};

// Helper function to get authentication headers
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const authToken = localStorage.getItem('staffToken');
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return headers;
}

// The syncCloudbedsData function to test
async function syncCloudbedsData() {
    const syncButton = document.getElementById('sync-button');
    const syncSuccess = document.getElementById('sync-success');
    const syncError = document.getElementById('sync-error');
    
    // Hide any previous messages
    if (syncSuccess) syncSuccess.style.display = 'none';
    if (syncError) syncError.style.display = 'none';
    
    // Show loading state on button
    if (syncButton) {
        const originalHtml = syncButton.innerHTML;
        syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        syncButton.disabled = true;
        
        try {
            const response = await fetch('/api/staff/import-cloudbeds', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to sync Cloudbeds data');
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (syncSuccess) {
                    syncSuccess.style.display = 'block';
                    // If imported count is available, show it, otherwise show a generic message
                    if (data.imported !== undefined) {
                        syncSuccess.textContent = `${data.message || 'Data synced successfully!'} (${data.imported} guests)`;
                    } else {
                        syncSuccess.textContent = data.message || 'Data synced successfully!';
                    }
                }
                
                // In a real environment, this would reload dashboard data
                console.log('Dashboard data would be reloaded here');
            } else {
                throw new Error(data.message || 'Failed to sync Cloudbeds data');
            }
        } catch (error) {
            console.error('Error syncing Cloudbeds data: ' + error.message);
            if (syncError) {
                syncError.style.display = 'block';
                syncError.textContent = error.message;
            }
        } finally {
            // Reset button
            if (syncButton) {
                syncButton.innerHTML = originalHtml;
                syncButton.disabled = false;
                
                // Hide the message after 3 seconds (simulate using immediate callback for testing)
                console.log('Messages would be hidden after 3 seconds');
            }
        }
    }
}

// Run the test
async function runTest() {
    console.log('=== Testing Cloudbeds Data Sync Button ===');
    console.log('Initial state:');
    console.log('- Sync button HTML:', mockElements.syncButton.innerHTML);
    console.log('- Sync button disabled:', mockElements.syncButton.disabled);
    console.log('- Success message display:', mockElements.syncSuccess.style.display);
    console.log('- Error message display:', mockElements.syncError.style.display);
    
    console.log('\nCalling syncCloudbedsData()...');
    await syncCloudbedsData();
    
    console.log('\nFinal state:');
    console.log('- Sync button HTML:', mockElements.syncButton.innerHTML);
    console.log('- Sync button disabled:', mockElements.syncButton.disabled);
    console.log('- Success message display:', mockElements.syncSuccess.style.display);
    console.log('- Success message text:', mockElements.syncSuccess.textContent);
    console.log('- Error message display:', mockElements.syncError.style.display);
    
    console.log('\nTest completed!');
}

// Execute the test
runTest().catch(err => {
    console.error('Test failed:', err);
}); 