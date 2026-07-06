#!/usr/bin/env bash
# Guarded delete of ONE Firestore document in the kdc-apps project.
# Same auth as firestore-read.sh: gcloud user OAuth token against the Firestore
# REST API. An IAM/gcloud token bypasses the client security rules, so this
# works with User's own gcloud creds — no service account needed.
#
# Usage:
#   firestore-delete.sh <collection> <docId>          # DRY RUN: toont het doc, verwijdert NIETS
#   firestore-delete.sh <collection> <docId> --yes    # voert de verwijdering ECHT uit
#
# HITL-guardrail: without --yes nothing destructive happens. The agent shows first
#   de dry-run, User bevestigt in de chat, pas daarna volgt de --yes-uitvoering.
set -euo pipefail
PROJECT="${FIRESTORE_PROJECT:-kdc-apps}"
COLL="${1:?Usage: firestore-delete.sh <collection> <docId> [--yes]}"
DOCID="${2:?Usage: firestore-delete.sh <collection> <docId> [--yes]}"
CONFIRM="${3:-}"
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents"
URL="${BASE}/${COLL}/${DOCID}"
TOKEN="$(gcloud auth print-access-token)"

echo "== Doeldocument: ${PROJECT}/${COLL}/${DOCID} =="
DOC="$(curl -s -H "Authorization: Bearer ${TOKEN}" "$URL")"
printf '%s' "$DOC" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if "error" in d:
    sys.exit("ERROR: doc not found or no access: "+d["error"].get("message","?"))
f=d.get("fields",{})
if not f: print("   (no fields)")
for k in sorted(f):
    print("   %s: %s" % (k, next(iter(f[k].values()))))
'

if [[ "$CONFIRM" != "--yes" ]]; then
  echo
  echo ">> DRY RUN — NOTHING was deleted."
  echo ">> Uitvoeren met:  firestore-delete.sh ${COLL} ${DOCID} --yes"
  exit 0
fi

echo
echo ">> DELETING..."
RESP="$(curl -s -w '\n%{http_code}' -X DELETE -H "Authorization: Bearer ${TOKEN}" "$URL")"
CODE="$(printf '%s' "$RESP" | tail -n1)"
BODY="$(printf '%s' "$RESP" | sed '$d')"
if [[ "$CODE" == "200" ]]; then
  echo ">> OK: document deleted (HTTP ${CODE})."
else
  echo ">> FOUT (HTTP ${CODE}): ${BODY}"
  exit 1
fi
