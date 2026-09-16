# Employee Workflow QA Report

## 1. Employee Dashboard
**Status:** PASS
- Today's Hours matches actual TimeEntry data (Verified: Date matched to local `getTodayString`).
- Current Timesheet Status matches actual current-week Timesheet (Verified).
- Recent entries correctly display the last 5 entries with valid project names.
- Reuse action correctly sets URL parameter for `TimeEntryForm`.
- No duplicate requests; `useEffect` dependencies correctly isolated.

## 2. Quick Log Time
**Status:** FIXED
- **Fixed:** Added verification to ensure `projectId`, `taskId`, and `activityId` are actively available before blindly applying defaults from `reuse` or `localStorage`.
- **Fixed:** Changed initial `date` state to use local time extraction (`getFullYear()`, etc.) instead of `.toISOString().split('T')[0]` which caused UTC timezone drift.
- Smart defaults save to and load from `localStorage` correctly.
- After successful submit, only hours and remarks clear, retaining project/task/activity contexts.
- Invalid combinations are properly blocked.

## 3. Recent Time Entries
**Status:** PASS
- 14-day calendar reflects actual logged dates without timezone drift.
- Reuse creates a NEW entry by passing data to the Time Entry form.

## 4. Weekly Timesheet Matrix
**Status:** PASS
- Monday-Sunday columns successfully group entries.
- Daily totals and row totals compute correctly from grouped entries.
- Weekly total reconciles with actual TimeEntry totals.
- Multiple entries for the same activity on the same day aggregate cleanly.
- Status behavior (DRAFT/SUBMITTED/REJECTED/APPROVED) remains exact.

## 5. Submission Readiness
**Status:** PASS
- Empty timesheet displays an explicit amber alert blocking submission.
- Valid timesheet enables the submit action.
- Submitted/Approved timesheets lock the UI as expected.

## 6. Rejected Timesheet
**Status:** PASS
- Rejection comment appears visibly.
- Resubmit transitions the timesheet back to SUBMITTED.

## 7. Employee Summary
**Status:** PASS
- Visual progress bars accurately reflect percentages.
- Date filtering relies entirely on local YYYY-MM-DD.

## 8. Error Handling
**Status:** FIXED
- Genuine API errors (e.g., 400/500) are properly trapped and displayed in reporting screens and the Time Entry form.
- *Dashboard:* Dashboard handles partial data failures gracefully via `Promise.allSettled`, showing a non-blocking warning ("Some dashboard data could not be loaded. Retry.") instead of silently ignoring failures.

## 11. Dev Mode & Dashboard Reliability
**Status:** FIXED
- **Original Issue:** The application opened, but Dev Mode failed to load employees, showing "Failed to fetch" in the console (`ERR_CONNECTION_REFUSED`) and a misleading "No User Selected" on the Dashboard.
- **Root Cause:** When the backend API is unavailable or connection is refused, `apiClient` threw a generic "Failed to load employees for dev selector". This unhandled error led `useCurrentEmployee` to return a null employee, causing the Dashboard to mistakenly think no user was selected.
- **Fix:** 
  - `DevUserContext` now specifically catches the "Failed to fetch" error and provides a clear, actionable message: "Backend unavailable — start the API server on port 3000."
  - The connection error is now surfaced through `useCurrentEmployee` and displayed prominently on the Dashboard as a "Connection Error" rather than defaulting to "No User Selected".
  - Added a "Retry" button to `DevUserSelector` for simple, user-triggered recovery when the backend becomes available again.
- **Backend Availability Behavior:** If the backend is unreachable, the application shows a clear connection error and asks the user to start the API server on port 3000.
- **Dashboard Optional-Request Behavior:** Replaced `Promise.all` with `Promise.allSettled` and removed `.catch(() => [])` silent errors. The dashboard now preserves successful data while showing a small, non-blocking warning for any failed secondary requests.
- **Test Result:** 238 / 238 backend tests passing.
- **Build Result:** Frontend build compiled successfully.
- **Remaining Limitations:** None.

## 9. Date Handling
**Status:** PASS
- No UTC shifting exists in the Employee workflow forms or reports. Dates like 2026-08-16 reliably remain exact through input → state → API request → backend → UI.

## 10. Testing Results
**Status:** PASS

**Backend Tests:**
```
 Test Files  22 passed (22)
      Tests  238 passed (238)
   Duration  5.26s
```

**Frontend Build:**
```
✓ 1894 modules transformed.
dist/index.html                   0.47 kB │ gzip:   0.30 kB
dist/assets/index-CtzP3iVL.css   43.23 kB │ gzip:   8.13 kB
dist/assets/index-CxV0nR5M.js   422.89 kB │ gzip: 112.10 kB
✓ built in 464ms
```

## BLOCKED
- None

## REMAINING ISSUES
- None
