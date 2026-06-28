#!/usr/bin/env python3
"""
ga-inventory.py — read-only inventaris/audit van Google Analytics (GA4).

Gebruikt een dedicated service-account key (RS256 JWT, ondertekend via openssl;
no externe Python-libs nodig) om de GA Admin API + Data API te bevragen:
  - alle accounts + properties (account summaries)
  - per property: details (aanmaakdatum, tijdzone, serviceLevel, industrie)
  - per property: data streams (web/app, measurementId, URL)
  - per property: laatste dag met data + 90d/365d activiteit (Data API)

De service account moet als (minimaal) Viewer op accountniveau in GA toegevoegd
zijn, anders ziet hij niets.

Auth: SA-key in ~/.config/maccha/secrets/sa_analytics_*.json
Scope: https://www.googleapis.com/auth/analytics.readonly

Usage:
  python3 ga-inventory.py                 # tekst-overzicht naar stdout
  python3 ga-inventory.py --json out.json # ruwe data ook als JSON wegschrijven
  python3 ga-inventory.py --key <pad>     # andere SA-key
"""
import base64
import datetime as dt
import glob
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
TOKEN_URI = "https://oauth2.googleapis.com/token"
ADMIN = "https://analyticsadmin.googleapis.com/v1beta"
DATA = "https://analyticsdata.googleapis.com/v1beta"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def find_key(explicit=None) -> str:
    if explicit:
        return explicit
    pats = sorted(glob.glob(os.path.expanduser(
        "~/.config/maccha/secrets/sa_analytics_*.json")))
    if not pats:
        sys.exit("No SA-key found in ~/.config/maccha/secrets/sa_analytics_*.json")
    return pats[0]


def rs256_sign(private_key_pem: str, signing_input: str) -> bytes:
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as kf:
        kf.write(private_key_pem)
        keypath = kf.name
    try:
        proc = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", keypath],
            input=signing_input.encode(),
            capture_output=True,
        )
        if proc.returncode != 0:
            sys.exit("openssl signing failed: " + proc.stderr.decode())
        return proc.stdout
    finally:
        os.unlink(keypath)


def get_access_token(key_path: str) -> str:
    with open(key_path) as fh:
        sa = json.load(fh)
    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": sa["client_email"],
        "scope": SCOPE,
        "aud": TOKEN_URI,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = b64url(json.dumps(header).encode()) + "." + \
        b64url(json.dumps(claims).encode())
    sig = rs256_sign(sa["private_key"], signing_input)
    assertion = signing_input + "." + b64url(sig)
    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion,
    }).encode()
    req = urllib.request.Request(TOKEN_URI, data=body)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)["access_token"]
    except urllib.error.HTTPError as e:
        sys.exit("Token-exchange faalde: %s\n%s" % (e, e.read().decode()))


def api_get(token: str, url: str):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read().decode()}


def api_post(token: str, url: str, payload: dict):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read().decode()}


def list_account_summaries(token):
    out, page = [], None
    while True:
        url = ADMIN + "/accountSummaries?pageSize=200"
        if page:
            url += "&pageToken=" + page
        data = api_get(token, url)
        if "_error" in data:
            sys.exit("accountSummaries fout %s: %s" % (data["_error"], data["_body"]))
        out += data.get("accountSummaries", [])
        page = data.get("nextPageToken")
        if not page:
            break
    return out


def property_details(token, prop):  # prop = "properties/123"
    return api_get(token, ADMIN + "/" + prop)


def data_streams(token, prop):
    data = api_get(token, ADMIN + "/" + prop + "/dataStreams?pageSize=200")
    if "_error" in data:
        return []
    return data.get("dataStreams", [])


def last_active(token, prop_id):
    """Geef (laatste_datum_met_data, sessies_365d, sessies_90d) of None bij no toegang."""
    today = dt.date.today()
    payload = {
        "dateRanges": [{"startDate": "365daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "date"}],
        "metrics": [{"name": "sessions"}],
        "orderBys": [{"dimension": {"dimensionName": "date"}, "desc": True}],
        "limit": 400,
    }
    res = api_post(token, DATA + "/properties/%s:runReport" % prop_id, payload)
    if "_error" in res:
        return {"error": res["_error"], "body": res["_body"][:200]}
    rows = res.get("rows", [])
    last_date, total365, total90 = None, 0, 0
    cutoff90 = today - dt.timedelta(days=90)
    for r in rows:
        d = r["dimensionValues"][0]["value"]  # YYYYMMDD
        s = int(r["metricValues"][0]["value"])
        if s > 0 and last_date is None:
            last_date = d
        total365 += s
        try:
            dd = dt.datetime.strptime(d, "%Y%m%d").date()
            if dd >= cutoff90:
                total90 += s
        except ValueError:
            pass
    return {"last_date": last_date, "sessions_365d": total365, "sessions_90d": total90}


def fmt_date(d):
    if not d:
        return "—"
    if len(d) == 8 and d.isdigit():
        return "%s-%s-%s" % (d[:4], d[4:6], d[6:])
    return d


def main():
    args = sys.argv[1:]
    key_path = None
    json_out = None
    if "--key" in args:
        key_path = args[args.index("--key") + 1]
    if "--json" in args:
        json_out = args[args.index("--json") + 1]
    key_path = find_key(key_path)

    token = get_access_token(key_path)
    print("# Google Analytics — inventaris  (%s)" % dt.date.today())
    print("SA-key: %s\n" % key_path)

    summaries = list_account_summaries(token)
    if not summaries:
        print("No accounts zichtbaar. Is de service account al als Viewer "
              "toegevoegd op accountniveau?")
        return

    report = []
    for acc in summaries:
        acc_name = acc.get("displayName", "?")
        acc_id = acc.get("account", "").replace("accounts/", "")
        props = acc.get("propertySummaries", [])
        print("=" * 70)
        print("ACCOUNT: %s  (id %s)  — %d propert%s" %
              (acc_name, acc_id, len(props), "y" if len(props) == 1 else "ies"))
        print("=" * 70)
        acc_rec = {"account": acc_name, "account_id": acc_id, "properties": []}
        for ps in props:
            prop = ps.get("property", "")
            prop_id = prop.replace("properties/", "")
            disp = ps.get("displayName", "?")
            details = property_details(token, prop)
            create = details.get("createTime", "")[:10]
            tz = details.get("timeZone", "")
            svc = details.get("serviceLevel", "")
            streams = data_streams(token, prop)
            act = last_active(token, prop_id)

            print("\n  • %-30s (id %s)" % (disp, prop_id))
            print("      aangemaakt: %-12s tz: %-22s level: %s" %
                  (create or "?", tz, svc))
            for s in streams:
                web = s.get("webStreamData", {})
                mid = web.get("measurementId", "")
                uri = web.get("defaultUri", "")
                stype = s.get("type", "").replace("_DATA_STREAM", "")
                print("      stream: %-10s %-14s %s" %
                      (stype, mid, uri))
            if isinstance(act, dict) and "error" in act:
                print("      activiteit: no Data-API-toegang (%s)" % act["error"])
            else:
                print("      LAATSTE DATA: %s   | sessies 90d: %s | 365d: %s" %
                      (fmt_date(act["last_date"]), act["sessions_90d"],
                       act["sessions_365d"]))
            acc_rec["properties"].append({
                "name": disp, "id": prop_id, "create": create,
                "timezone": tz, "serviceLevel": svc,
                "streams": streams, "activity": act,
            })
        report.append(acc_rec)
        print()

    if json_out:
        with open(json_out, "w") as fh:
            json.dump(report, fh, indent=2)
        print("\nRuwe data → %s" % json_out)


if __name__ == "__main__":
    main()
