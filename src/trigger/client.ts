/**
 * Trigger.dev Client Configuration
 * Handles background job processing for video-to-content pipeline
 */

import { TriggerClient } from '@trigger.dev/sdk';

// Initialize Trigger.dev client
export const triggerClient = new TriggerClient({
  id: 'clipinsight-ai',
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});

// Export for use in jobs
export { triggerClient as client };

