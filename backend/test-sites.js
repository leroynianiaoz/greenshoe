import 'dotenv/config';

const API_URL = 'http://localhost:8080/api';

async function testSiteCRUD() {
  console.log('Testing Site CRUD Operations...\n');

  try {
    // Step 1: Login to get token
    console.log('Step 1: Login as admin');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@greenshoe.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const { token } = await loginResponse.json();
    console.log('✅ Logged in successfully\n');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Step 2: Create a site with SFTP credentials
    console.log('Step 2: Create a site with SFTP credentials');
    const createResponse = await fetch(`${API_URL}/sites`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Client Website',
        liveUrl: 'https://testclient.com',
        connectionType: 'sftp',
        credentials: {
          host: 'ftp.testclient.com',
          port: 22,
          username: 'testuser',
          password: 'secretpassword123'
        }
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Create failed: ${error.message}`);
    }

    const { site: createdSite } = await createResponse.json();
    console.log('✅ Site created');
    console.log('  ID:', createdSite.id);
    console.log('  Name:', createdSite.name);
    console.log('  Slug:', createdSite.slug);
    console.log('  Status:', createdSite.status);
    console.log('  Connection Type:', createdSite.connectionType);
    console.log('  Encrypted Credentials:', createdSite.encryptedCredentials ? '(hidden)' : 'none');
    console.log();

    const siteId = createdSite.id;

    // Step 3: Get all sites
    console.log('Step 3: Get all sites');
    const getSitesResponse = await fetch(`${API_URL}/sites`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!getSitesResponse.ok) {
      throw new Error('Get sites failed');
    }

    const { sites, total } = await getSitesResponse.json();
    console.log(`✅ Retrieved ${total} site(s)`);
    sites.forEach(s => {
      console.log(`  - ${s.name} (${s.slug}) - ${s.status}`);
    });
    console.log();

    // Step 4: Get single site by ID
    console.log('Step 4: Get single site by ID');
    const getSiteResponse = await fetch(`${API_URL}/sites/${siteId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!getSiteResponse.ok) {
      throw new Error('Get site failed');
    }

    const { site } = await getSiteResponse.json();
    console.log('✅ Retrieved site:', site.name);
    console.log();

    // Step 5: Update site
    console.log('Step 5: Update site name and platform type');
    const updateResponse = await fetch(`${API_URL}/sites/${siteId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Client Website - Updated',
        platformType: 'wordpress'
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Update failed: ${error.message}`);
    }

    const { site: updatedSite } = await updateResponse.json();
    console.log('✅ Site updated');
    console.log('  New Name:', updatedSite.name);
    console.log('  New Slug:', updatedSite.slug);
    console.log('  Platform Type:', updatedSite.platformType);
    console.log();

    // Step 6: Create a crawl-only site
    console.log('Step 6: Create a crawl-only site (no credentials)');
    const createCrawlResponse = await fetch(`${API_URL}/sites`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Public Website',
        liveUrl: 'https://publicwebsite.com',
        connectionType: 'crawl-only'
      })
    });

    if (!createCrawlResponse.ok) {
      const error = await createCrawlResponse.json();
      throw new Error(`Create crawl-only failed: ${error.message}`);
    }

    const { site: crawlSite } = await createCrawlResponse.json();
    console.log('✅ Crawl-only site created');
    console.log('  Name:', crawlSite.name);
    console.log('  Connection Type:', crawlSite.connectionType);
    console.log();

    // Step 7: Delete site (admin only)
    console.log('Step 7: Delete crawl-only site');
    const deleteResponse = await fetch(`${API_URL}/sites/${crawlSite.id}`, {
      method: 'DELETE',
      headers: authHeaders
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('✅ Site deleted successfully');
    console.log();

    // Step 8: Verify site is deleted
    console.log('Step 8: Verify deletion');
    const verifyResponse = await fetch(`${API_URL}/sites/${crawlSite.id}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (verifyResponse.ok) {
      console.log('❌ Site still exists (should be deleted)');
    } else {
      console.log('✅ Site properly deleted (returns 404)');
    }
    console.log();

    console.log('All site CRUD tests completed successfully! ✅');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testSiteCRUD();
