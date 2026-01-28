/**
 * Test fixtures - sample data for testing
 */

export const testUsers = {
  developer: {
    email: 'developer@test.com',
    password: 'DevPassword123!',
    role: 'DEVELOPER'
  },
  projectManager: {
    email: 'pm@test.com',
    password: 'PMPassword123!',
    role: 'PROJECT_MANAGER'
  },
  admin: {
    email: 'admin@test.com',
    password: 'AdminPassword123!',
    role: 'ADMIN'
  }
};

export const testSites = {
  staticHtml: {
    name: 'Static HTML Site',
    liveUrl: 'https://example.com',
    connectionType: 'crawl-only',
    platformType: 'static'
  },
  wordpress: {
    name: 'WordPress Site',
    liveUrl: 'https://wordpress-example.com',
    connectionType: 'sftp',
    platformType: 'wordpress'
  },
  reactSpa: {
    name: 'React SPA',
    liveUrl: 'https://react-spa.com',
    connectionType: 'crawl-only',
    platformType: 'react'
  }
};

export const testCredentials = {
  sftp: {
    type: 'sftp',
    host: 'test.example.com',
    port: 22,
    username: 'testuser',
    password: 'testpass123',
    remotePath: '/public_html'
  },
  ssh: {
    type: 'ssh',
    host: 'test.example.com',
    port: 22,
    username: 'testuser',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest-key-data\n-----END RSA PRIVATE KEY-----',
    remotePath: '/var/www/html'
  }
};

export const testBackupSchedules = {
  daily: {
    frequency: 'daily',
    time: '02:00',
    dayOfWeek: null,
    dayOfMonth: null
  },
  weekly: {
    frequency: 'weekly',
    time: '03:00',
    dayOfWeek: 0, // Sunday
    dayOfMonth: null
  },
  monthly: {
    frequency: 'monthly',
    time: '04:00',
    dayOfWeek: null,
    dayOfMonth: 1 // First day of month
  }
};

export const testEvaluationResults = {
  staticSite: {
    url: 'https://example.com',
    success: true,
    summary: {
      title: 'Example Domain',
      loadTime: '1.2s',
      pageSize: '2.5MB',
      internalLinks: 15,
      estimatedPages: 15,
      estimatedSize: '37.5MB',
      platform: 'Unknown',
      hasDynamicContent: false,
      accuracyScore: 100,
      crawlStrategy: 'static'
    },
    resources: {
      html: 1,
      css: 2,
      javascript: 3,
      images: 10,
      fonts: 2,
      other: 1,
      failed: 0,
      total: 19
    },
    warnings: [],
    recommendations: []
  },
  reactSpa: {
    url: 'https://react-spa.com',
    success: true,
    summary: {
      title: 'React App',
      loadTime: '2.5s',
      pageSize: '5.2MB',
      internalLinks: 25,
      estimatedPages: 25,
      estimatedSize: '130MB',
      platform: 'react',
      hasDynamicContent: true,
      accuracyScore: 80,
      crawlStrategy: 'javascript'
    },
    resources: {
      html: 1,
      css: 3,
      javascript: 15,
      images: 20,
      fonts: 3,
      other: 2,
      failed: 0,
      total: 44
    },
    warnings: [
      {
        type: 'dynamic_content',
        severity: 'medium',
        message: 'Site appears to use client-side rendering (React/Vue/Angular)',
        impact: 'Static HTML crawling may not capture dynamic content'
      }
    ],
    recommendations: [
      {
        type: 'crawler_type',
        message: 'Consider using JavaScript-enabled crawler for better accuracy',
        action: 'Enable JavaScript rendering in pull settings'
      }
    ]
  }
};

export const testDiffResults = {
  noChanges: {
    summary: {
      added: 0,
      modified: 0,
      deleted: 0,
      unchanged: 10,
      totalFiles: 10,
      totalAdded: 0,
      totalModified: 0,
      totalDeleted: 0
    },
    files: {
      added: [],
      modified: [],
      deleted: []
    }
  },
  withChanges: {
    summary: {
      added: 2,
      modified: 3,
      deleted: 1,
      unchanged: 4,
      totalFiles: 10,
      totalAdded: 2048,
      totalModified: 15360,
      totalDeleted: 1024
    },
    files: {
      added: [
        { path: 'new-page.html', size: 1024 },
        { path: 'assets/new-image.png', size: 1024 }
      ],
      modified: [
        { path: 'index.html', size: 5120 },
        { path: 'style.css', size: 5120 },
        { path: 'script.js', size: 5120 }
      ],
      deleted: [
        { path: 'old-page.html', size: 1024 }
      ]
    }
  }
};

export const testFileDiff = {
  path: 'index.html',
  type: 'modified',
  oldSize: 1024,
  newSize: 2048,
  diff: [
    { type: 'unchanged', line: 1, content: '<html>' },
    { type: 'unchanged', line: 2, content: '<head>' },
    { type: 'deleted', line: 3, oldContent: '  <title>Old Title</title>' },
    { type: 'added', line: 3, newContent: '  <title>New Title</title>' },
    { type: 'unchanged', line: 4, content: '</head>' },
    { type: 'unchanged', line: 5, content: '<body>' },
    { type: 'added', line: 6, newContent: '  <h1>Welcome</h1>' },
    { type: 'unchanged', line: 7, content: '</body>' },
    { type: 'unchanged', line: 8, content: '</html>' }
  ]
};
