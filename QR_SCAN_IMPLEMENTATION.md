# QR Scan Implementation - Enhanced Functionality

## Overview
The Scan QR functionality has been enhanced to support both credential import and issuer addition based on QR code validation rules.

## New Validation Logic

### 1. QR Data Requirements
When a QR code is scanned, the system parses the data and validates it according to these rules:

- **Must have either `introductionURL` OR `proofValue`**
  - If neither is present, the QR code is considered invalid
  - If either is present, the QR code is considered valid for further processing

### 2. IntroductionURL Parameter Validation
If the QR code contains an `introductionURL`:

- **Maximum 1 parameter allowed**
  - If the URL has more than one parameter, the QR code is considered invalid
  - If it has 0 or 1 parameter, it's valid

### 3. Processing Flow

#### For Valid QR Codes with `introductionURL`:
1. **Parse JSON** from QR code data
2. **Validate required fields** for issuer addition:
   - `name` (defaults to "Unknown Issuer" if missing)
   - `introductionURL` (required)
   - `publicKey` (required)
3. **Prompt user for OTP** verification
4. **Verify with introductionURL** using same logic as Add Issuer screen:
   - POST request to `introductionURL`
   - Body: `{ "nonce": "user_otp", "bitcoinAddress": "user_wallet_address" }`
5. **Save issuer** to local storage if verification succeeds

#### For Valid QR Codes with `proofValue`:
- Process as credential import (existing functionality)

#### For URLs in QR Codes:
1. **Fetch data** from the URL
2. **Parse as JSON**
3. **Apply same validation rules** as above
4. **Process accordingly**

## Example Valid QR Codes

### 1. Issuer QR Code (Minimal)
```json
{
  "name": "University One",
  "introductionURL": "https://example.com/verify",
  "publicKey": "ecdsa-koblitz-pubkey:0x123..."
}
```

### 2. Issuer QR Code (With one parameter - Valid)
```json
{
  "name": "University One", 
  "introductionURL": "https://example.com/verify?version=1",
  "publicKey": "ecdsa-koblitz-pubkey:0x123..."
}
```

### 3. Credential QR Code
```json
{
  "proofValue": "some_proof_value",
  "issuer": "...",
  "credentialSubject": "..."
}
```

## Example Invalid QR Codes

### 1. Missing both required fields
```json
{
  "name": "University One",
  "publicKey": "ecdsa-koblitz-pubkey:0x123..."
}
```
**Error**: "Invalid QR code: Must contain either introductionURL or proofValue"

### 2. IntroductionURL with too many parameters
```json
{
  "name": "University One",
  "introductionURL": "https://example.com/verify?param1=value1&param2=value2",
  "publicKey": "ecdsa-koblitz-pubkey:0x123..."
}
```
**Error**: "Invalid QR code: introductionURL must have at most one parameter"

### 3. Invalid introductionURL format
```json
{
  "name": "University One", 
  "introductionURL": "not-a-valid-url",
  "publicKey": "ecdsa-koblitz-pubkey:0x123..."
}
```
**Error**: "Invalid QR code: introductionURL is not a valid URL"

## User Experience Flow

1. **User scans QR code** with camera
2. **System validates** the QR data
3. **If valid issuer data**:
   - Shows OTP prompt
   - User enters OTP
   - System verifies with issuer
   - Shows success/error message
4. **If valid credential data**:
   - Imports credential directly
5. **If invalid**:
   - Shows appropriate error message
   - User can scan again

## Technical Implementation

### Key Functions

1. **`validateQRData(data)`**: Validates QR data against rules
2. **`handleAddIssuerFromQR(qrData)`**: Processes issuer addition flow
3. **`handleBarCodeRead(barcode)`**: Main QR processing handler

### Integration Points

- **StorageService**: For saving issuer data
- **WalletService**: For getting user's wallet address
- **Same OTP verification logic** as AddIssuerScreen

## Error Handling

- Network errors during URL fetch
- JSON parsing errors
- Missing required fields
- OTP verification failures
- Invalid URL format validation

## Security Features

- OTP verification prevents unauthorized issuer addition
- Wallet address validation ensures proper user authentication
- Same security model as manual issuer addition
- URL parameter validation prevents potential security issues

## Testing

To test the new functionality:

1. Create QR codes with the example JSON data above
2. Scan with the app's QR scanner
3. Verify proper validation and error handling
4. Test both valid and invalid scenarios
5. Confirm issuer is properly saved and appears in issuer list

The implementation follows the exact same logic as the existing "Add Issuer" screen but triggered through QR code scanning.
