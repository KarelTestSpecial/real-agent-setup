#!/usr/bin/env bash
# Read-only dump of a Firestore collection in the kdc-apps project.
# The firebase CLI has no simple "read document" command; this uses
# a gcloud OAuth token against the Firestore REST API.
#
# Usage:  firestore-read.sh <collection> [pageSize]
#           RAW=1 firestore-read.sh <collection>      # rauwe JSON i.p.v. tabel
#           FIRESTORE_PROJECT=ander-project firestore-read.sh <collection>
#
# Auth: gcloud user-creds (<je-gcloud-email>) met toegang tot kdc-apps.
#       Read-only. Writing (PATCH/DELETE) deliberately NOT in this script (HITL).
set -euo pipefail
PROJECT="${FIRESTORE_PROJECT:-kdc-apps}"
COLL="${1:?Usage: firestore-read.sh <collection> [pageSize]}"
SIZE="${2:-300}"
URL="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLL}?pageSize=${SIZE}"
RAW_JSON="$(curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" "$URL")"
if [[ -n "${RAW:-}" ]]; then echo "$RAW_JSON"; exit 0; fi
printf '%s' "$RAW_JSON" | python3 -c '
import json,sys
d=json.load(sys.stdin)
if "error" in d: sys.exit("ERROR: "+d["error"].get("message","?"))
docs=d.get("documents",[])
print("# %d document(en) in collectie %s\n" % (len(docs), sys.argv[1]))
for doc in docs:
    print("###", doc["name"].split("/")[-1])
    for k in sorted(doc.get("fields",{})):
        print("   %s: %s" % (k, next(iter(doc["fields"][k].values()))))
    print()
' "$COLL"
