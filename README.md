# DApp Authentication Server

This project is a simple server for handling DApp authentication using nonces and signatures. It provides two main endpoints: `getNonce` and `login`.

## Features

- **Nonce Generation**: Generates a unique nonce for each address, valid for 5 minutes.
- **Signature Verification**: Verifies the signature against the stored nonce to authenticate the user.
- **In-Memory Storage**: Uses an in-memory store for nonce management with automatic expiration.

## Prerequisites

- Node.js (version 14 or higher)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/webeautiful/dapp_auth_server.git
   cd dapp_auth_server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node index.mjs
   ```

## Endpoints

### GET /getNonce

- **Description**: Generates a nonce for the provided address.
- **Request**:
  - Method: GET
  - Query Parameter: `address` (required)
- **Response**: JSON object containing the nonce and expiration time.

**Example**:
```bash
curl -i 'http://localhost:8000/getNonce?address=0x03e3efAE3a4DD09C997a043Ebf7F244f33bEcadd'
```

### POST /login

- **Description**: Verifies the signature using the stored nonce.
- **Request**:
  - Method: POST
  - Body: JSON object containing `signature` and `address`
- **Response**: JSON object indicating success or failure.

**Example**:
```bash
curl -X POST http://localhost:8000/login -H "Content-Type: application/json" -d '{"signature": "0x77ce7aaf18f716fc7f22094dcaf9a208d7985e7549270679c468381cb5c97fa03c0d8448a552c969ca2a0e732073b5f39e2dcac0ac1f003b7099a4204e1456451c", "address": "0x03e3efAE3a4DD09C997a043Ebf7F244f33bEcadd"}'
```

## Generating a Signature with MetaMask

To test the login endpoint, you can use a browser wallet plugin like MetaMask to generate a signature. Here's a sample code snippet to do this:

```javascript
ethereum.request({ method: 'eth_requestAccounts' })
  .then((accounts) => {
    const account = accounts[0];
    console.log(account);
    // Generate the message to be signed
    const message = 'Please sign : KXWFEJjRhv9LGKjNUq';
    // Sign the message using the personal_sign method
    return ethereum.request({ method: 'personal_sign', params: [message, account] });
  })
  .then((signature) => {
    console.log('Signature:', signature);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Explanation

- **eth_requestAccounts**: Requests the user's Ethereum account from the wallet.
- **personal_sign**: Signs a message with the user's private key.
- **accounts[0]**: The first account in the list of accounts returned by the wallet.

## Notes

- The nonce is valid for 5 minutes. After expiration, a new nonce must be requested.
- This implementation uses in-memory storage for nonces. For production, consider using a persistent storage solution like Redis.

## License

This project is licensed under the MIT License.