/**
 * DApp authentication related functions
 */
import { recoverMessageAddress } from 'viem';
import { generateRandomString } from "./utils.mjs"

// Enhanced in-memory storage for nonces with expiration
class NonceStore {
  constructor(expirationTimeMs = 5 * 60 * 1000) { // Default: 5 minutes
    this.store = new Map();
    this.expirationTimeMs = expirationTimeMs;
  }

  set(key, value) {
    // Clear any existing timers for this key
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key).timer);
    }

    // Create expiration timer
    const timer = setTimeout(() => {
      console.log(`Nonce for ${key} has expired and been removed`);
      this.delete(key);
    }, this.expirationTimeMs);

    // Store value with expiration timer
    this.store.set(key, {
      value,
      timer,
      createdAt: Date.now()
    });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry.value;
  }

  delete(key) {
    const entry = this.store.get(key);
    if (entry && entry.timer) {
      clearTimeout(entry.timer);
    }
    return this.store.delete(key);
  }

  // Get remaining time in seconds
  getRemainingTime(key) {
    const entry = this.store.get(key);
    if (!entry) return 0;

    const elapsed = Date.now() - entry.createdAt;
    const remaining = Math.max(0, this.expirationTimeMs - elapsed);
    return Math.floor(remaining / 1000); // Convert to seconds
  }
}

// Initialize the nonce store with 5 minute expiration
const nonceStore = new NonceStore(5 * 60 * 1000);

/**
 * Get a nonce for authentication
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * curl -i http://localhost:8000/getNonce?address=0x03e3efAE3a4DD09C997a043Ebf7F244f33bEcadd
 */
export async function getNonce(req, res) {
  try {
    // Get address from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const address = url.searchParams.get('address');

    // Validate the address parameter
    if (!address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        msg: 'Missing required parameter: address',
        data: null
      }));
      return;
    }

    console.log(`Generating nonce for address: ${address}`);

    // Generate a nonce string
    const prefix = "Please sign : ";
    const nonceStr = `${prefix}${generateRandomString(18)}`

    // Store the nonce with the address as key (will expire after 5 minutes)
    nonceStore.set(address, nonceStr);
    console.log(`Stored nonce for ${address}: ${nonceStr} (expires in 5 minutes)`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 1,
      msg: 'success',
      data: {
        nonceStr,
        expiresIn: '5 minutes'
      }
    }));
  } catch (error) {
    console.error('getNonce error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 0,
      msg: 'Internal server error',
      data: null
    }));
  }
}

/**
 * Login handler
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * curl -X POST http://localhost:8000/login -H "Content-Type: application/json" -d '{"signature": "0x77ce7aaf18f716fc7f22094dcaf9a208d7985e7549270679c468381cb5c97fa03c0d8448a552c969ca2a0e732073b5f39e2dcac0ac1f003b7099a4204e1456451c", "address": "0x03e3efAE3a4DD09C997a043Ebf7F244f33bEcadd"}'
 */
export async function login(req, res) {
  try {
    // Parse request body
    let body = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve();
      });
      req.on('error', (err) => {
        reject(err);
      });
    });

    // Parse the body as JSON
    const { signature, address } = JSON.parse(body);

    // Validate required parameters
    if (!signature || !address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        msg: 'Missing required parameters: signature and address are required',
        data: null
      }));
      return;
    }

    // Get stored nonce for the address
    const message = nonceStore.get(address);
    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        msg: 'No valid nonce found for this address. Please call getNonce first.',
        data: null
      }));
      return;
    }

    const remainingTime = nonceStore.getRemainingTime(address);
    console.log(`Using stored message: ${message} (expires in ${remainingTime} seconds)`);

    // Verify the signature
    const verifyAddress = await recoverMessageAddress({
      message,
      signature
    });

    if (address !== verifyAddress) {
      console.error(`Signature verification failed. Expected: ${address}, Got: ${verifyAddress}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        msg: 'Login Failure: Invalid signature',
        data: null
      }));
      return;
    }

    // Clear the nonce after successful verification
    nonceStore.delete(address);
    console.log(`Cleared nonce for ${address} after successful login`);

    // Return success response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 1,
      msg: 'Login successful',
      data: { address }
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 0,
      msg: 'Internal server error',
      data: null
    }));
  }
}