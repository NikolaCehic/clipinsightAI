/**
 * Trigger.dev Webhook Route
 * Handles Trigger.dev webhook callbacks
 */

import { createAppRoute } from '@trigger.dev/nextjs';
import { triggerClient } from '@/trigger/client';

// Import jobs to register them
import '@/trigger/jobs/process-video';

// Create and export the route handlers
export const { POST, dynamic } = createAppRoute(triggerClient);

