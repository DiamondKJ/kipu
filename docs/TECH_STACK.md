# Socialaize Tech Stack (Confirmed)

## Frontend
- **Framework**: Vue.js
- **Animation**: Custom `webAnimation` plugin
- **Icons**: Iconify API (dynamically loaded)

## Backend
- **BaaS**: Appwrite (self-hosted at `appwrite.socialaize.com`)
- **Auth**: Appwrite Auth (`/api/auth/verify.json`)
- **Database**: Appwrite Databases (tablesdb)
- **Teams**: Appwrite Teams API

## Analytics
- **Microsoft Clarity** (multiple tags causing errors)

## Domain Structure
```
socialaize.com           → Frontend (Vue app)
appwrite.socialaize.com  → Backend (Appwrite instance)
```

---

## Database Schema (from API calls)

### Tables Identified

| Database | Table ID | Purpose |
|----------|----------|---------|
| `oauth` | `01J51ZG3MJYJCB978QBEZAJ1W1` | OAuth connections (all platforms) |
| `oauth` | `01JHNKQV0HQ4ZQ4KX9365W82CJ` | Account sharing/requests |
| `tiktok` | `01J5EZPWSA4K8ZMF0KW0WK0TQ8` | TikTok account data |
| `google` | `01J7KHNSVCEAT5FC2QY267SV0D` | Google/YouTube account data |
| `workflows` | `01J6R275ASN26QAATPNT4Q4YVJ` | Workflow steps/actions |
| `workflows` | `01JF1BCWJWK70CZ3F3T16AYX4W` | Workflow executions/history |
| `socialaize_data` | `01J6N3KFVBVHFFAVQCC01ZV5G3` | General app data |
| `socialaize_data` | `01J8FVDSXB7Y1KF1ABK6T7NX1Y` | User/team settings |
| `socialaize_data` | `01JJQ7RRQZ0N00QAPKB3V05HQB` | Billing data |
| `artificial_int` | `01JHH42HTX28Z14JN68SVG1YKH` | AI credit usage |
| `fileMetadata` | `66db9453002466af1700` | Media library metadata |

---

## API Patterns

### Auth
```
GET /api/auth/verify.json
```

### Chat/Support
```
GET /api/chat/list?limit=10&status=active
```

### Appwrite Queries
Uses Appwrite's query syntax:
```javascript
queries[0] = {"method":"equal","attribute":"teamIds","values":["TEAM_ID"]}
queries[1] = {"method":"orderDesc","attribute":"$createdAt"}
queries[2] = {"method":"limit","values":[500]}
```

Common query methods:
- `equal` - exact match
- `contains` - array contains
- `greaterThan` / `lessThan` - range queries
- `orderDesc` - sorting
- `limit` - pagination
- `or` - compound queries

### Example: Get workflows for a team
```
GET /v1/tablesdb/workflows/tables/{TABLE_ID}/rows
  ?queries[0]={"method":"equal","attribute":"workflowId","values":["WORKFLOW_ID"]}
  &queries[1]={"method":"limit","values":[1000]}
```

---

## ID Format
Using ULIDs (Universally Unique Lexicographically Sortable Identifiers):
- Example: `01KCZ2BJMG1E9A5YWWRNTM6WEM`
- 26 characters, base32 encoded
- Time-sortable

---

## Routes
```
/dashboard              → Main dashboard
/dashboard/accounts     → Connected accounts
/dashboard/settings     → User settings
/dashboard/automate     → Automation list
/dashboard/automate/workflows/{id} → Workflow detail
/dashboard/calendar     → Content calendar
/dashboard/media        → Media library
```

---

## Known Issues (from console)
1. Multiple Clarity tags causing `CL001` errors
2. `postMessage` origin mismatch errors (likely OAuth popups)
3. Password field not in form (accessibility warning)
