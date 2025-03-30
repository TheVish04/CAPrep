import { inject } from '@vercel/analytics';

// Manually enable Vercel Analytics with specific configuration
inject({
  mode: 'production',
  debug: true,
  beforeSend: (event) => {
    // You can modify events before they're sent
    return event;
  }
}); 