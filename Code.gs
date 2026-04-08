// Google Apps Script entry points
function doGet(e) {
  return ContentService.createTextOutput("Paisa Flow Database Backend is Active.");
}

function doPost(e) {
  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(err) {
      throw new Error("Invalid JSON payload.");
    }
    const action = payload.action;
    const args = payload.args || [];
    
    let result;
    
    // AUTHENTICATION
    if (action === 'requestSignupOTP') result = requestSignupOTP(args[0], args[1], args[2]);
    else if (action === 'completeSignup') result = completeSignup(args[0], args[1], args[2], args[3]);
    else if (action === 'loginUser') result = loginUser(args[0], args[1], args[2]);
    else if (action === 'completeLogin') result = completeLogin(args[0], args[1]);
    
    // DATA & CALCS
    else if (action === 'pullInitialData') result = pullInitialData(args[0]);
    else if (action === 'syncData') result = syncData(args[0]);
    else if (action === 'saveCalculation') result = saveCalculation(args[0]);
    
    // ADMIN ACTIONS
    else if (action === 'adminGetTelemetry') result = adminGetTelemetry(args[0], args[1]);
    else if (action === 'adminGetUsers') result = adminGetUsers(args[0], args[1]);
    else if (action === 'adminDeleteUser') result = adminDeleteUser(args[0], args[1], args[2]);
    else if (action === 'adminAddUser') result = adminAddUser(args[0], args[1], args[2], args[3]);
    else throw new Error("Unknown action: " + action);

    return ContentService.createTextOutput(JSON.stringify({ result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ADMIN_EMAIL = "richbabets1@gmail.com";
const ADMIN_PASSCODE = "arafuckusuckb00bs";

function getSheetByName(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Transactions') {
      sheet.appendRow(['UserEmail', 'TransactionID', 'Date', 'Category', 'Amount', 'Type', 'Event Name', 'Notes']);
      sheet.setFrozenRows(1);
    } else if (name === 'Daily Calculator') {
      sheet.appendRow(['UserEmail', 'Timestamp', 'Calculation Type', 'Result', 'Notes']);
      sheet.setFrozenRows(1);
    } else if (name === 'Users') {
      // 1:Email, 2:Name, 3:PasswordHash, 4:OTP_Temp, 5:OTPExpiry, 6:CreatedAt
      sheet.appendRow(['Email', 'Name', 'PasswordHash', 'OTP_Temp', 'OTPExpiry', 'CreatedAt']);
      sheet.setFrozenRows(1);
      // Pre-add Admin
      sheet.appendRow([ADMIN_EMAIL, 'Super Admin', hashPassword('Pass123'), '', '', new Date()]);
    } else if (name === 'Events') {
      sheet.appendRow(['UserEmail', 'EventName', 'Budget', 'TotalAmountWeHave']);
      sheet.setFrozenRows(1);
    } else if (name === 'PendingSignups') {
      sheet.appendRow(['Email', 'Name', 'OTP', 'Expiry']);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// Basic hash for visual obfuscation of password in backend
function hashPassword(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; 
  }
  return String(hash);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

/* =========================================================
   DUAL-AUTH SYSTEM (V3)
   ========================================================= */

// STEP 1: Request Signup OTP
function requestSignupOTP(email, name = "User", locationStr = "Unknown") {
  if (!email) throw new Error("Credential mismatch: Email address is required.");
  email = email.toLowerCase().trim();
  
  // 1. Check if user exists
  const userSheet = getSheetByName('Users');
  const userData = userSheet.getDataRange().getValues();
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === email) throw new Error("Email already registered. Please login.");
  }
  
  // 2. Generate OTP
  const pendingSheet = getSheetByName('PendingSignups');
  const pendingData = pendingSheet.getDataRange().getValues();
  const otp = generateOTP();
  const expiry = new Date(new Date().getTime() + 10 * 60000).toISOString(); // 10 mins
  
  let rowToUpdate = -1;
  for (let i = 1; i < pendingData.length; i++) {
    if (pendingData[i][0] === email) { rowToUpdate = i + 1; break; }
  }
  
  if (rowToUpdate > -1) {
    pendingSheet.getRange(rowToUpdate, 2).setValue(name);
    pendingSheet.getRange(rowToUpdate, 3).setValue(otp);
    pendingSheet.getRange(rowToUpdate, 4).setValue(expiry);
  } else {
    pendingSheet.appendRow([email, name, otp, expiry]);
  }
  
  // 3. Send Email
  try {
     MailApp.sendEmail({
       to: email,
       subject: "Paisa Flow - Verify Your Email",
       htmlBody: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; background-color: #f3f6f8; border-radius: 12px;">
            <h2 style="color: #0b1d3a; margin-bottom: 24px;">Welcome to Paisa Flow, ${name}!</h2>
            <div style="margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 8px; border: 2px solid #59d9c8;">
               <span style="font-size: 14px; color: #0b1d3a; font-weight: bold; text-transform: uppercase;">Your Verification Code</span>
               <div style="font-size: 42px; letter-spacing: 8px; color: #59d9c8; font-weight: bold; margin-top: 10px;">${otp}</div>
            </div>
            <p style="color: #64748b; font-size: 12px;">Location: ${locationStr}</p>
         </div>
       `
     });
     return { success: true, message: "OTP Sent" };
  } catch(e) {
     throw new Error("Failed to send OTP.");
  }
}

// STEP 2: Complete Signup
function completeSignup(email, password, name, otpStr) {
  if (!email || !password || !name || !otpStr) throw new Error("Registration fields incomplete.");
  email = email.toLowerCase().trim();
  const pendingSheet = getSheetByName('PendingSignups');
  const pendingData = pendingSheet.getDataRange().getValues();
  
  for (let i = 1; i < pendingData.length; i++) {
    if (pendingData[i][0] === email) {
      if (String(pendingData[i][2]) === String(otpStr)) {
        if (new Date() > new Date(pendingData[i][3])) throw new Error("OTP Expired.");
        
        const userSheet = getSheetByName('Users');
        userSheet.appendRow([email, name, hashPassword(password), '', '', new Date()]);
        pendingSheet.deleteRow(i + 1);
        return { success: true, email: email, name: name };
      }
    }
  }
  throw new Error("Invalid Code.");
}

// STEP 3: Login (Initial Stage - Verify Password + Send OTP)
function loginUser(email, password, locationStr = "Unknown Location") {
  if (!email || !password) throw new Error("Credentials required for Vault Access.");
  email = email.toLowerCase().trim();
  const userSheet = getSheetByName('Users');
  const userData = userSheet.getDataRange().getValues();
  const hashed = hashPassword(password);
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === email && String(userData[i][2]) === String(hashed)) {
      const name = userData[i][1];
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(new Date().getTime() + 10 * 60000); // 10 mins
      
      const pendingLoginSheet = getSheetByName('PendingLogins');
      pendingLoginSheet.appendRow([email, name, otp, expiry, password]); // Storing pass temporarily to return in step 2 if needed
      
      // Send Security MFA OTP Email
      try {
        MailApp.sendEmail({
           to: email,
           subject: `${otp} is your Paisa Flow Authorization Override`,
           htmlBody: `
             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-top: 4px solid #2dd4bf; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <h3 style="color: #0b1d3a;">Authorization Required</h3>
                <p style="color: #0f172a; font-size: 16px;">Hi ${name},</p>
                <p style="color: #64748b; font-size: 16px; line-height: 1.5;">A login attempt was initiated from the following location:</p>
                <div style="background-color: #f3f6f8; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                   <p style="margin: 5px 0; color: #0b1d3a; font-size: 14px;"><b>Location / IP:</b> ${locationStr}</p>
                </div>
                <p style="color: #64748b; font-size: 16px;">Enter the following Access Override code to continue:</p>
                <div style="font-size: 36px; font-weight: 800; color: #2dd4bf; text-align: center; letter-spacing: 12px; margin: 30px 0; padding: 20px; background: #f0fdfa; border-radius: 12px; border: 1px dashed #2dd4bf;">
                   ${otp}
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 20px;">If this was not you, please secure your account immediately.</p>
             </div>
           `
        });
      } catch(e) { throw new Error("Could not send verification email. Please try again later."); }
      
      return { success: true, mfaRequired: true, email: email };
    }
  }
  throw new Error("Invalid email or password.");
}

function completeLogin(email, otpStr) {
  if (!email || !otpStr) throw new Error("Secure token missing.");
  email = email.toLowerCase().trim();
  const pendingSheet = getSheetByName('PendingLogins');
  const pendingData = pendingSheet.getDataRange().getValues();
  
  for (let i = pendingData.length - 1; i >= 1; i--) {
    if (pendingData[i][0] === email) {
      if (String(pendingData[i][2]) === String(otpStr)) {
        if (new Date() > new Date(pendingData[i][3])) throw new Error("MFA Code Expired.");
        
        const name = pendingData[i][1];
        pendingSheet.deleteRow(i + 1);
        return { success: true, email: email, name: name };
      }
    }
  }
  throw new Error("Invalid or incorrect code.");
}


/* =========================================================
   ADMIN PANEL SYSTEM
   ========================================================= */

function verifyAdmin(email, passcode) {
   if (email !== ADMIN_EMAIL || passcode !== ADMIN_PASSCODE) {
      throw new Error("Unauthorized Admin Access.");
   }
}

function adminGetTelemetry(email, passcode) {
   verifyAdmin(email, passcode);
   return {
      totalUsers: Math.max(0, getSheetByName('Users').getLastRow() - 1),
      totalPending: Math.max(0, getSheetByName('PendingSignups').getLastRow() - 1),
      totalTx: Math.max(0, getSheetByName('Transactions').getLastRow() - 1),
      totalEvents: Math.max(0, getSheetByName('Events').getLastRow() - 1)
   };
}

function adminGetUsers(email, passcode) {
   verifyAdmin(email, passcode);
   const sheet = getSheetByName('Users');
   const data = sheet.getDataRange().getValues();
   const users = [];
   for(let i = 1; i < data.length; i++) {
      users.push({
         email: data[i][0],
         name: data[i][1],
         joined: data[i][5]
      });
   }
   return { users: users };
}

function adminDeleteUser(email, passcode, targetEmail) {
   verifyAdmin(email, passcode);
   if (targetEmail === ADMIN_EMAIL) throw new Error("Cannot delete super admin.");
   const sheet = getSheetByName('Users');
   const data = sheet.getDataRange().getValues();
   for(let i = data.length - 1; i >= 1; i--) {
      if(data[i][0] === targetEmail) {
         sheet.deleteRow(i + 1);
         return { success: true, message: `Deleted ${targetEmail}` };
      }
   }
   throw new Error("User not found.");
}

function adminAddUser(email, passcode, newEmail, newName) {
   verifyAdmin(email, passcode);
   newEmail = newEmail.toLowerCase().trim();
   const sheet = getSheetByName('Users');
   const data = sheet.getDataRange().getValues();
   for(let i = 1; i < data.length; i++) {
      if(data[i][0] === newEmail) throw new Error("Email already registered.");
   }
   // Adds user with default password 'Reset123'
   sheet.appendRow([newEmail, newName, hashPassword('Reset123'), '', '', new Date()]);
   return { success: true, message: `Created user ${newEmail}. Assigned temp password 'Reset123'` };
}

/* =========================================================
   CORE DATA SYSTEMS (History & Sync)
   ========================================================= */

function pullInitialData(email) {
  if(!email) throw new Error("Not logged in");
  const txSheet = getSheetByName('Transactions');
  const evSheet = getSheetByName('Events');
  const txData = txSheet.getDataRange().getValues();
  const evData = evSheet.getDataRange().getValues();
  
  const events = []; const transactions = [];

  for(let i=1; i<evData.length; i++) {
    if(evData[i][0] === email) events.push({ name: evData[i][1], budget: evData[i][2], totalAmountWeHave: evData[i][3], synced: true });
  }
  for(let i=1; i<txData.length; i++) {
    if(txData[i][0] === email) {
      let id = txData[i][1];
      let dateField = txData[i][2];
      if (!id) id = 'legacy_' + i; 
      transactions.push({ id: id, date: dateField, category: txData[i][3], amount: txData[i][4], type: txData[i][5], eventName: txData[i][6], notes: txData[i][7], method: txData[i][8] || 'Cash', synced: true });
    }
  }
  return { events, transactions };
}

function syncData(payload) {
  const email = payload.userEmail;
  if (!email) throw new Error("Not logged in");
  
  const txSheet = getSheetByName('Transactions');
  const evSheet = getSheetByName('Events');
  const txData = txSheet.getDataRange().getValues();
  const evData = evSheet.getDataRange().getValues();
  
  const syncedTxIds = []; const syncedEvNames = [];

  // DELETE
  if (payload.deletedTxIds && payload.deletedTxIds.length > 0) {
      for(let i = txData.length - 1; i >= 1; i--) {
          if(txData[i][0] === email && payload.deletedTxIds.includes(String(txData[i][1]))) {
             txSheet.deleteRow(i + 1);
          }
      }
  }

  // EVENTS
  if (payload.events && payload.events.length > 0) {
    payload.events.forEach(ev => {
      let rowIndex = -1;
      for(let i = 1; i < evData.length; i++) {
        if(evData[i][0] === email && evData[i][1] === ev.name) { rowIndex = i + 1; break; }
      }
      if (rowIndex > -1) {
        evSheet.getRange(rowIndex, 3).setValue(Number(ev.budget));
        evSheet.getRange(rowIndex, 4).setValue(Number(ev.totalAmountWeHave));
      } else {
        evSheet.appendRow([email, ev.name, Number(ev.budget), Number(ev.totalAmountWeHave)]);
      }
      syncedEvNames.push(ev.name);
    });
  }

  // TRANSACTIONS
  if (payload.transactions && payload.transactions.length > 0) {
    payload.transactions.forEach(tx => {
      let isUpdate = false;
      for(let i = 1; i < txData.length; i++) {
         if(txData[i][0] === email && String(txData[i][1]) === String(tx.id)) {
            txSheet.getRange(i+1, 3).setValue(new Date(tx.date));
            txSheet.getRange(i+1, 4).setValue(tx.category);
            txSheet.getRange(i+1, 5).setValue(Number(tx.amount));
            txSheet.getRange(i+1, 6).setValue(tx.type);
            txSheet.getRange(i+1, 7).setValue(tx.eventName || '');
            txSheet.getRange(i+1, 8).setValue(tx.notes || '');
            txSheet.getRange(i+1, 9).setValue(tx.method || '');
            txSheet.getRange(i+1, 10).setValue(payload.location || 'Unknown');
            isUpdate = true;
            break;
         }
      }
      if(!isUpdate) {
        txSheet.appendRow([ email, tx.id, new Date(tx.date), tx.category, Number(tx.amount), tx.type, tx.eventName || '', tx.notes || '', tx.method || 'Cash', payload.location || 'Unknown' ]);
      }
      syncedTxIds.push(tx.id);
    });
  }
  return { success: true, syncedTxIds: syncedTxIds, syncedEvNames: syncedEvNames };
}

function saveCalculation(calcObject) {
  if(!calcObject.userEmail) throw new Error("Not logged in");
  getSheetByName('Daily Calculator').appendRow([ calcObject.userEmail, new Date(), 'Manual Calc', Number(calcObject.result), '' ]);
  return "Calculations exported.";
}

/* =========================================================
   VAULT SECURITY: PIN RECOVERY
   ========================================================= */

function sendPINResetOTP(email) {
   if (!email) throw new Error("Email required for recovery.");
   const otp = Math.floor(100000 + Math.random() * 900000).toString();
   const ss = SpreadsheetApp.getActiveSpreadsheet();
   const sheet = getSheetByName('PendingSignups');
   
   // Expiry 10 mins
   const expiry = new Date(new Date().getTime() + 10 * 60000);
   sheet.appendRow([email, otp, otp, expiry]); 

   try {
      MailApp.sendEmail({
         to: email,
         subject: "Paisa Flow - Vault Recovery Code",
         htmlBody: `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-top: 4px solid #ef4444; border-radius: 8px;">
              <h3 style="color: #0b1d3a;">Vault Security Recovery</h3>
              <p>Someone requested to reset the Vault Lock on your Paisa Flow account. Use the code below to register a new local PIN.</p>
              <div style="font-size: 32px; font-weight: bold; color: #ef4444; margin: 20px 0; letter-spacing: 5px; text-align: center;">${otp}</div>
              <p style="color: #64748B; font-size: 14px;">This code will expire in 10 minutes.</p>
              <p style="color: #718096; font-size: 13px;">If you did not request this, please ensure your account password is secure.</p>
           </div>
         `
      });
      return { success: true };
   } catch (e) {
      throw new Error("Unable to dispatch recovery code.");
   }
}

function verifyPINResetOTP(email, otp) {
   if (!email || !otp) throw new Error("Missing recovery details.");
   const sheet = getSheetByName('PendingSignups');
   const data = sheet.getDataRange().getValues();

   for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === email && String(data[i][2]) === String(otp)) {
         if (new Date() > new Date(data[i][3])) throw new Error("Recovery Code Expired.");
         sheet.deleteRow(i + 1);
         return { success: true };
      }
   }
   throw new Error("Invalid recovery code.");
}
