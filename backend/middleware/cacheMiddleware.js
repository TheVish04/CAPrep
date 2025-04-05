const NodeCache = require('node-cache');

// Initialize cache with a standard TTL (time-to-live) of 10 minutes (600 seconds)
// and checkperiod every 2 minutes (120 seconds)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const cacheMiddleware = (duration) => (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    console.error('Cannot cache non-GET methods!');
    return next();
  }

  // Use the request URL as the cache key. Include query params for uniqueness.
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log(`Cache hit for key: ${key}`);
    res.send(cachedResponse);
  } else {
    console.log(`Cache miss for key: ${key}`);
    // Monkey patch res.send to cache the response before sending it
    res.originalSend = res.send;
    res.send = (body) => {
      cache.set(key, body, duration); // Use the specific duration for this route
      res.originalSend(body);
    };
    next();
  }
};

// Function to clear the cache for specific routes (e.g., after POST, PUT, DELETE)
const clearCache = (keys) => {
  if (Array.isArray(keys)) {
    keys.forEach(key => {
      if (cache.has(key)) {
        cache.del(key);
        console.log(`Cache cleared for key: ${key}`);
      }
    });
  } else if (typeof keys === 'string') {
    // Clear all keys starting with the base path (e.g., '/api/resources')
    const cacheKeys = cache.keys();
    const keysToDelete = cacheKeys.filter(k => k.startsWith(keys));
    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
        console.log(`Cache cleared for keys starting with: ${keys}`);
    }
  }
};


module.exports = { cacheMiddleware, clearCache }; 