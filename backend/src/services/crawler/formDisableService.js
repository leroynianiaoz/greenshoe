import { logger } from '../../utils/logger.js';

/**
 * CSS styles for disabled interactive elements
 */
const DISABLED_STYLES = `
<style id="greenshoe-staging-styles">
  /* Disabled form styles */
  .greenshoe-disabled-form {
    position: relative;
    pointer-events: none;
    opacity: 0.6;
  }
  .greenshoe-disabled-form::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(128, 128, 128, 0.1);
    cursor: not-allowed;
    pointer-events: auto;
  }
  .greenshoe-disabled-form input,
  .greenshoe-disabled-form button,
  .greenshoe-disabled-form select,
  .greenshoe-disabled-form textarea {
    cursor: not-allowed !important;
  }

  /* Disabled button styles */
  .greenshoe-disabled-button {
    pointer-events: none;
    opacity: 0.6;
    cursor: not-allowed !important;
  }

  /* Staging notice tooltip */
  .greenshoe-staging-notice {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e40af;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 99999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .greenshoe-staging-notice a {
    color: #93c5fd;
    text-decoration: underline;
  }

  /* Tooltip for disabled elements */
  [data-greenshoe-disabled]::before {
    content: attr(data-greenshoe-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #374151;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 99998;
  }
  [data-greenshoe-disabled]:hover::before {
    opacity: 1;
  }
</style>
`;

/**
 * Staging notice banner HTML
 */
const STAGING_NOTICE = `
<div class="greenshoe-staging-notice" id="greenshoe-staging-notice">
  <strong>Staging Preview</strong> - Forms and interactive features are disabled.
</div>
`;

/**
 * Process HTML to disable forms and interactive elements
 * @param {string} html - Original HTML content
 * @param {object} options - Processing options
 * @returns {string} Processed HTML with disabled forms
 */
export function disableForms(html, options = {}) {
  const {
    disableAllForms = true,
    disableSearchForms = true,
    disableLoginForms = true,
    disableContactForms = true,
    disableCartButtons = true,
    showStagingNotice = true,
    preserveFormIds = [] // Array of form IDs to keep enabled
  } = options;

  let processedHtml = html;

  try {
    // Add disabled styles to head
    if (processedHtml.includes('</head>')) {
      processedHtml = processedHtml.replace('</head>', `${DISABLED_STYLES}</head>`);
    } else if (processedHtml.includes('<body')) {
      processedHtml = processedHtml.replace('<body', `${DISABLED_STYLES}<body`);
    }

    // Process forms
    if (disableAllForms) {
      processedHtml = processFormElements(processedHtml, {
        disableSearch: disableSearchForms,
        disableLogin: disableLoginForms,
        disableContact: disableContactForms,
        preserveIds: preserveFormIds
      });
    }

    // Disable cart/checkout buttons
    if (disableCartButtons) {
      processedHtml = disableCartElements(processedHtml);
    }

    // Add staging notice banner
    if (showStagingNotice) {
      if (processedHtml.includes('</body>')) {
        processedHtml = processedHtml.replace('</body>', `${STAGING_NOTICE}</body>`);
      }
    }

    logger.info('Forms and interactive elements disabled for staging');

    return processedHtml;

  } catch (error) {
    logger.error('Error disabling forms:', error.message);
    return html; // Return original on error
  }
}

/**
 * Process and disable form elements
 */
function processFormElements(html, options) {
  const { disableSearch, disableLogin, disableContact, preserveIds } = options;

  // Regex to match form tags
  const formRegex = /<form([^>]*)>/gi;

  return html.replace(formRegex, (match, attributes) => {
    // Check if form should be preserved
    const idMatch = attributes.match(/id=["']([^"']+)["']/i);
    if (idMatch && preserveIds.includes(idMatch[1])) {
      return match;
    }

    // Detect form type
    const isSearchForm = /search|query|q=/i.test(attributes) || /type=["']search["']/i.test(match);
    const isLoginForm = /login|signin|auth/i.test(attributes);
    const isContactForm = /contact|message|inquiry|feedback/i.test(attributes);

    // Apply type-specific rules
    if (isSearchForm && !disableSearch) return match;
    if (isLoginForm && !disableLogin) return match;
    if (isContactForm && !disableContact) return match;

    // Determine tooltip message
    let tooltip = 'This form is disabled on staging';
    if (isSearchForm) tooltip = 'Search is disabled on staging';
    if (isLoginForm) tooltip = 'Login is disabled on staging';
    if (isContactForm) tooltip = 'Contact form is disabled on staging';

    // Disable the form
    // Remove action attribute and add disabled class
    let disabledAttributes = attributes
      .replace(/action=["'][^"']*["']/gi, 'action="#"')
      .replace(/method=["'][^"']*["']/gi, 'method="get"');

    // Add disabled class
    if (disabledAttributes.includes('class="')) {
      disabledAttributes = disabledAttributes.replace(
        /class="([^"]*)"/i,
        'class="$1 greenshoe-disabled-form"'
      );
    } else if (disabledAttributes.includes("class='")) {
      disabledAttributes = disabledAttributes.replace(
        /class='([^']*)'/i,
        "class='$1 greenshoe-disabled-form'"
      );
    } else {
      disabledAttributes += ' class="greenshoe-disabled-form"';
    }

    // Add data attributes for tooltip
    disabledAttributes += ` data-greenshoe-disabled="true" data-greenshoe-tooltip="${tooltip}"`;

    return `<form${disabledAttributes} onsubmit="return false;">`;
  });
}

/**
 * Disable cart and checkout related elements
 */
function disableCartElements(html) {
  // Common cart/checkout button patterns
  const cartPatterns = [
    /add.?to.?cart/i,
    /buy.?now/i,
    /checkout/i,
    /purchase/i,
    /add.?to.?bag/i,
    /add.?to.?basket/i
  ];

  let processedHtml = html;

  // Disable buttons with cart-related text
  const buttonRegex = /<(button|a|input)([^>]*)(>)([^<]*<\/(?:button|a)>|[^>]*\/>)?/gi;

  processedHtml = processedHtml.replace(buttonRegex, (match, tag, attributes, closing, content) => {
    const fullText = (attributes + (content || '')).toLowerCase();

    // Check if it's a cart-related element
    const isCartElement = cartPatterns.some(pattern => pattern.test(fullText));

    if (!isCartElement) return match;

    // Add disabled class
    let disabledAttributes = attributes;
    if (disabledAttributes.includes('class="')) {
      disabledAttributes = disabledAttributes.replace(
        /class="([^"]*)"/i,
        'class="$1 greenshoe-disabled-button"'
      );
    } else if (disabledAttributes.includes("class='")) {
      disabledAttributes = disabledAttributes.replace(
        /class='([^']*)'/i,
        "class='$1 greenshoe-disabled-button'"
      );
    } else {
      disabledAttributes += ' class="greenshoe-disabled-button"';
    }

    // Add disabled attribute for buttons
    if (tag.toLowerCase() === 'button' && !disabledAttributes.includes('disabled')) {
      disabledAttributes += ' disabled';
    }

    // Neutralize links
    if (tag.toLowerCase() === 'a') {
      disabledAttributes = disabledAttributes.replace(/href=["'][^"']*["']/gi, 'href="#"');
      disabledAttributes += ' onclick="return false;"';
    }

    // Add tooltip
    disabledAttributes += ' data-greenshoe-disabled="true" data-greenshoe-tooltip="Shopping is disabled on staging"';

    return `<${tag}${disabledAttributes}${closing}${content || ''}`;
  });

  return processedHtml;
}

/**
 * Detect interactive elements in HTML for reporting
 * @param {string} html - HTML content to analyze
 * @returns {object} Detection results
 */
export function detectInteractiveElements(html) {
  const results = {
    forms: {
      total: 0,
      search: 0,
      login: 0,
      contact: 0,
      other: 0
    },
    cartElements: 0,
    externalScripts: 0,
    iframes: 0
  };

  // Count forms
  const formMatches = html.match(/<form[^>]*>/gi) || [];
  results.forms.total = formMatches.length;

  formMatches.forEach(form => {
    if (/search|query/i.test(form)) results.forms.search++;
    else if (/login|signin|auth/i.test(form)) results.forms.login++;
    else if (/contact|message|inquiry/i.test(form)) results.forms.contact++;
    else results.forms.other++;
  });

  // Count cart elements
  const cartPatterns = /add.?to.?cart|buy.?now|checkout|purchase/gi;
  const cartMatches = html.match(cartPatterns) || [];
  results.cartElements = cartMatches.length;

  // Count external scripts
  const externalScriptMatches = html.match(/<script[^>]+src=["'][^"']+["'][^>]*>/gi) || [];
  results.externalScripts = externalScriptMatches.length;

  // Count iframes
  const iframeMatches = html.match(/<iframe[^>]*>/gi) || [];
  results.iframes = iframeMatches.length;

  return results;
}

/**
 * Generate a report of what was disabled
 * @param {object} detectionResults - Results from detectInteractiveElements
 * @returns {string} Human-readable report
 */
export function generateDisabledReport(detectionResults) {
  const lines = ['Interactive Elements Disabled:'];

  if (detectionResults.forms.total > 0) {
    lines.push(`  - ${detectionResults.forms.total} form(s):`);
    if (detectionResults.forms.search > 0) lines.push(`    - ${detectionResults.forms.search} search form(s)`);
    if (detectionResults.forms.login > 0) lines.push(`    - ${detectionResults.forms.login} login form(s)`);
    if (detectionResults.forms.contact > 0) lines.push(`    - ${detectionResults.forms.contact} contact form(s)`);
    if (detectionResults.forms.other > 0) lines.push(`    - ${detectionResults.forms.other} other form(s)`);
  }

  if (detectionResults.cartElements > 0) {
    lines.push(`  - ${detectionResults.cartElements} cart/checkout element(s)`);
  }

  if (detectionResults.iframes > 0) {
    lines.push(`  - ${detectionResults.iframes} iframe(s) (may contain interactive content)`);
  }

  return lines.join('\n');
}
