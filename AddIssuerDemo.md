/**
 * AddIssuerDemo.md
 * 
 * This document explains how the new Add Issuer functionality works:
 * 
 * ## Process Flow:
 * 
 * 1. **User Input**: 
 *    - Issuer URL (required): The URL that returns JSON data about the issuer
 *    - OTP (required): One-time password for verification
 * 
 * 2. **URL Validation and Data Fetch**:
 *    - Validates URL format
 *    - Fetches data from the issuer URL as text (handles GitHub raw files)
 *    - Parses the text response as JSON
 * 
 * 3. **JSON Structure Validation**:
 *    Required fields in the JSON response:
 *    - `name`: Issuer name
 *    - `introductionURL`: URL for OTP verification
 *    - `publicKey`: Issuer's public key (can be string or array)
 *    
 *    Optional fields:
 *    - `email`: Contact email
 *    - `description`: Issuer description
 * 
 * 4. **OTP Verification**:
 *    - Makes POST request to `introductionURL`
 *    - Sends JSON payload:
 *      ```json
 *      {
 *        "nonce": "user_otp",
 *        "bitcoinAddress": "user_wallet_address"
 *      }
 *      ```
 * 
 * 5. **Storage**:
 *    - If verification successful, stores issuer data locally
 *    - Displays issuer name in the issuers list
 * 
 * ## Example Test with Your JSON:
 * 
 * **URL**: https://raw.githubusercontent.com/sreenivasmalae/seaside/refs/heads/main/univone.json
 * 
 * **JSON Structure** (matches your file):
 * ```json
 * {
 *   "name": "Univ One",
 *   "url": "https://www.univone.com/",
 *   "introductionURL": "https://pcmvhgzsdifhdciacide.supabase.co/functions/v1/store-wallet-address",
 *   "publicKey": [
 *     {
 *       "id": "ecdsa-koblitz-pubkey:0x42196b6DDde5Fbc29fb184C40E451d53b023f27F",
 *       "created": "2021-06-23T19:06:58.980071+00:00"
 *     }
 *   ],
 *   "email": "help_info@univone.com"
 * }
 * ```
 * 
 * **Process**:
 * 1. Fetches JSON from GitHub raw URL (handles text/plain content-type)
 * 2. Extracts `name`: "Univ One"
 * 3. Extracts `introductionURL`: "https://pcmvhgzsdifhdciacide.supabase.co/functions/v1/store-wallet-address"
 * 4. Extracts `publicKey`: "ecdsa-koblitz-pubkey:0x42196b6DDde5Fbc29fb184C40E451d53b023f27F" (from array)
 * 5. Makes POST to introduction URL with OTP and wallet address
 * 6. Stores issuer as "Univ One" if verification succeeds
 * 
 * ## Security Features:
 * - OTP verification prevents unauthorized issuer addition
 * - JSON validation ensures proper issuer data structure
 * - User wallet address is used in verification process
 * - Handles both text/plain and application/json content types
 * - Supports publicKey as both string and array formats
 * - All network requests include proper error handling
 * 
 * ## Error Handling:
 * - Network connectivity issues
 * - Invalid JSON format
 * - Missing required fields
 * - Empty publicKey arrays
 * - OTP verification failures
 * - Wallet not found errors
 */
