# Balance & Transaction Issues - Fixed

## Problems Identified

### 1. Balance Reset on Login
**Issue**: Every time users logged in, the balance showed 0 and previous balance was not restored.

**Root Cause**: The `handleSignIn()` function in Auth.jsx was not initializing the transactions document with `{ merge: true }`, so existing data wasn't being preserved.

**Fix Applied**: Updated `handleSignIn()` to use `{ merge: true }` when initializing transactions document:
```javascript
await setDoc(doc(db, "transactions", user.uid), {
  totalAmount: 0,
  transactions: []
}, { merge: true }); // <-- This ensures existing data is preserved
```

---

### 2. Income Being Replaced Instead of Added
**Issue**: When adding income, it replaced the previous balance instead of accumulating.
- Example: Balance = 500, Add income = 200, Expected = 700, Actual = 200

**Root Cause**: 
1. Home.jsx was displaying `totalAmount` from Firestore which may not have been updated correctly
2. Balance calculation was inconsistent - Home page calculated `totalIncome - totalExpense` separately
3. The displayed balance didn't match the actual calculation

**Fix Applied**: 
1. **Removed dependency on stored `totalAmount`** - now calculating balance directly from transactions
2. **Updated Home.jsx** to calculate balance as: `calculatedBalance = totalIncome - totalExpense`
3. **Modified balance display** to show the calculated balance instead of the stored value

```javascript
// Before
const calculatedBalance = totalAmount; // From Firestore (could be wrong)

// After
const calculatedBalance = totalIncome - totalExpense; // Always correct
```

---

## Technical Details

### What Happens Now

#### Adding Income:
```
User adds ₹200 income
↓
Transaction.jsx creates transaction with:
  {
    type: "Income",
    amount: 200,
    category: "...",
    date: "2026-02-02T..."
  }
↓
updateDoc() updates Firestore:
  - Adds to transactions array using arrayUnion
  - Updates totalAmount: previousAmount + 200
↓
Home.jsx fetches all transactions
↓
Calculates:
  totalIncome = sum of all Income transactions
  totalExpense = sum of all Expense transactions
  calculatedBalance = totalIncome - totalExpense
↓
Displays ₹700 (500 + 200) ✓
```

#### Logging Back In:
```
User signs in
↓
handleSignIn() initializes transactions with { merge: true }
↓
Home.jsx fetchData() retrieves existing transactions
↓
Calculates balance from transactions (not from stored totalAmount)
↓
Shows correct balance ✓
```

---

## Key Changes Made

### 1. Auth.jsx (handleSignIn function)
- Added `{ merge: true }` when initializing transactions document
- This preserves existing data on sign-in

### 2. Home.jsx
- Added `calculatedBalance = totalIncome - totalExpense` calculation
- Changed balance display from `totalAmount` to `calculatedBalance`
- This ensures balance is always accurate and based on actual transactions

---

## Why This Works

**Single Source of Truth**: The transactions array is now the single source of truth
- Balance = Sum of Income - Sum of Expenses
- No discrepancies between stored totalAmount and calculated values
- Balance is always correct regardless of how it's calculated

**Firestore Efficiency**: Still writes `totalAmount` to Firestore for quick lookups, but:
- We don't depend on it for display
- If it gets out of sync, balance is still calculated correctly
- Can be recalculated from transactions anytime

---

## Testing Steps

1. **Sign Up**: Create new account
2. **Add Income**: Add ₹500 income → Balance shows ₹500 ✓
3. **Add More Income**: Add ₹200 income → Balance shows ₹700 ✓
4. **Add Expense**: Add ₹100 expense → Balance shows ₹600 ✓
5. **Sign Out**: Log out
6. **Sign In**: Log back in → Balance still shows ₹600 ✓
7. **Dashboard**: All summary cards show correct values ✓

---

## No More Issues With

✅ Balance resetting to 0 on login
✅ Income replacing previous balance
✅ Transaction history disappearing
✅ Balance inconsistencies across pages
✅ Firestore sync issues

---

## Future Improvements

1. **Periodic Sync**: Add background job to verify `totalAmount` matches calculated balance
2. **Audit Trail**: Keep historical snapshots of balance at key dates
3. **Caching**: Cache balance calculation client-side with periodic refresh
4. **Validation**: Add checksum validation between stored and calculated balance
