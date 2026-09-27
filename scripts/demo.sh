#!/usr/bin/env bash
# Live-demo requests against the running API. Usage: scripts/demo.sh <case>
set -euo pipefail

API=${API_URL:-http://localhost:3000}/api/v1
MOCK=${MOCK_URL:-http://localhost:4010}/api/v1
AUTH="Authorization: Bearer ${DEMO_TOKEN:-demo}"

SUMMARY='{
  company: .company.name,
  invoiceDue: (.invoiceDue.status // null),
  card: (.card.status // null),
  spend: (.spend | if . then { used: .used.minor, limit: .limit.minor, remaining: .remaining.minor } else null end),
  latest: [.transactions.latest[].merchantName],
  totalCount: .transactions.totalCount,
  remainingCount: .transactions.remainingCount,
  activateCardEnabled: .actions.activateCard.enabled
}'

# call <method> <url> <jq filter> [extra curl args...]
call() {
  local method=$1 url=$2 filter=$3
  shift 3
  local response status body
  response=$(curl -s -X "$method" -w $'\n%{http_code}' "$@" "$url")
  status=${response##*$'\n'}
  body=${response%$'\n'*}
  echo "$method ${url#*://} -> $status"
  echo "$body" | jq "$filter"
  echo
}

case ${1:-help} in
  dashboard)
    call GET "$API/companies/cmp_1/dashboard" "$SUMMARY" -H "$AUTH"
    ;;
  dashboard-full)
    call GET "$API/companies/cmp_1/dashboard" . -H "$AUTH"
    ;;
  companies)
    call GET "$API/companies" . -H "$AUTH"
    ;;
  activate)
    call POST "$API/companies/cmp_1/cards/crd_1/activate" . -H "$AUTH"
    call POST "$API/companies/cmp_1/cards/crd_1/activate" . -H "$AUTH"
    call GET "$API/companies/cmp_1/dashboard" \
      '{ card: .card.status, activateCardEnabled: .actions.activateCard.enabled }' -H "$AUTH"
    ;;
  member)
    call POST "$API/companies/cmp_2/cards/crd_2/activate" . -H "$AUTH"
    ;;
  other-company)
    call GET "$API/companies/cmp_2/dashboard" "$SUMMARY" -H "$AUTH"
    ;;
  forbidden)
    call GET "$API/companies/cmp_3/dashboard" . -H "$AUTH"
    ;;
  unauthenticated)
    call GET "$API/companies/cmp_1/dashboard" .
    ;;
  isolation)
    call GET "$API/companies/cmp_1/cards/crd_2" . -H "$AUTH"
    ;;
  invoice)
    call GET "$API/companies/cmp_1/invoices/inv_1" . -H "$AUTH"
    ;;
  transactions)
    page='{ items: [.items[] | "\(.id)  \(.merchantName)  \(.amount.minor)"], nextCursor }'
    call GET "$API/companies/cmp_1/transactions?limit=5" "$page" -H "$AUTH"
    cursor=$(curl -s -H "$AUTH" "$API/companies/cmp_1/transactions?limit=5" | jq -r .nextCursor)
    call GET "$API/companies/cmp_1/transactions?limit=5&cursor=$cursor" "$page" -H "$AUTH"
    ;;
  mock)
    call GET "$MOCK/companies/cmp_1/dashboard" "$SUMMARY" -H "$AUTH"
    call GET "$MOCK/companies/cmp_1/dashboard" "$SUMMARY" -H "$AUTH" -H 'Prefer: example=empty'
    ;;
  reset)
    npm run --silent seed
    ;;
  *)
    cat <<'EOF'
Usage: scripts/demo.sh <case>

  dashboard        home screen for Company AB (key numbers)
  dashboard-full   the full dashboard payload
  companies        company switcher
  activate         activate crd_1 twice, then the dashboard
  member           a member tries to activate (403)
  other-company    dashboard for Other AB (no invoice due)
  forbidden        company without membership (403)
  unauthenticated  no token (401)
  isolation        another company's card (404)
  invoice          invoice details
  transactions     first two pages via the cursor
  mock             the same screen from the Prism mock (npm run mock)
  reset            reseed the demo data

Env: API_URL (default http://localhost:3000), MOCK_URL (default http://localhost:4010)
EOF
    ;;
esac
