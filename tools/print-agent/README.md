# Printing order labels on the Zebra ZD421C

When an order is paid, the storefront renders a 4×6 packing label as ZPL and
queues it in `print_jobs`. This file covers the two ways that queue reaches the
printer, and how to set each one up.

## Why the site can't just print to 192.168.1.74

The printer's Wi-Fi address is private to the shop's network. The storefront
runs on Vercel, so there is no route from a server function to that address —
and opening one is not an option: port 9100 has no authentication at all, so
anyone who found it could print, empty the ribbon, or rewrite the printer's
configuration.

Both options below work the same way round: something at the shop opens the
connection **outward**, and the label travels back down it.

---

## Option A — Zebra Data Services (recommended, nothing runs at the shop)

The printer holds an outbound connection to Zebra's cloud, and the site posts
labels to `api.zebra.com`. No computer at the shop, no agent to keep running.

**1. Get an enrollment code.** Sign in at
<https://developer.zebra.com/my-devices> and press **Add Device**. Add the
**SendFileToPrinter** package to the account (there is a free tier) and
generate an API key; note the API key and the tenant id.

**2. Point the printer at Zebra's cloud.** Save this as `weblink.json`, with
your own enrollment code in place of the one below — it must be lowercase:

```json
{
  "weblink.logging.max_entries": "500",
  "weblink.ip.conn1.location": "https://savanna-device.zpc.zebra.com/weblink/connect?r=YOUR_ENROLLMENT_CODE",
  "device.reset": "1"
}
```

Send it with **Zebra Printer Setup Utility** → select the ZD421 → *Open Printer
Tools* → *Settings* → *Send file*. The printer resets after a few seconds.

**3. Check it connected.** In Printer Tools, send `! U1 getvar "weblink"` and
confirm the log shows an established channel. The device should now appear on
the My Devices page.

**4. Configure the site.** In `.env.local` (and in Vercel's environment
variables for production):

```
ZEBRA_API_KEY=…
ZEBRA_TENANT=…
```

Then in **/admin/settings → Order label printing**, enter the printer's serial
number, print a test label from the Orders page, and only then switch on
*Print a label for every paid order*.

Notes:

- Only one Weblink connection per printer, so this and a self-hosted Weblink
  server are mutually exclusive.
- Zebra rate-limits SendFileToPrinter to 5 requests/second and 10 MB per file.
  A label is a couple of KB.
- If a label fails to deliver — printer asleep, connection down — the job stays
  queued and `/api/cron/print-retry` re-sends it every 15 minutes.

---

## Option B — Local agent (no Zebra account needed)

`agent.mjs` polls the site for queued labels and writes them straight to the
printer's RAW 9100 port. Run it on any machine at the shop that stays on — the
Windows PC that already has the ZD421 set up is the obvious one. It does not
use the ZDesigner driver, so nothing about the existing Windows printer setup
matters to it.

**1. Set a shared token.** Generate one and put it in the site's environment
(`.env.local` and Vercel) as `PRINT_AGENT_TOKEN`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Configure the agent.** Copy `.env.example` to `.env` next to `agent.mjs`
and fill it in. The printer address can also be left blank here and set in
/admin/settings instead, which is the easier place to fix it if DHCP moves the
printer.

**3. Run it.**

```
node --env-file=.env agent.mjs
```

**4. Keep it running.** As a Windows scheduled task that starts at logon and
restarts on failure:

```powershell
$action  = New-ScheduledTaskAction -Execute "node.exe" `
  -Argument "--env-file=.env agent.mjs" `
  -WorkingDirectory "C:\midwestern-peptides\tools\print-agent"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -RestartInterval (New-TimeSpan -Minutes 1) `
  -RestartCount 999 -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "Midwestern Peptides print agent" `
  -Action $action -Trigger $trigger -Settings $settings
```

Give the printer a DHCP reservation on the router so its address does not move.

---

## Testing without an order

From the Orders page in admin, **Print label** on any order queues it
immediately, regardless of whether auto-print is on.

To check the printer itself is reachable before involving the site at all, from
a machine on the shop's network:

```powershell
$client = New-Object System.Net.Sockets.TcpClient("192.168.1.74", 9100)
$stream = $client.GetStream()
$zpl = "^XA^CI28^PW1200^LL1800^FO40,80^A0N,60,60^FDTest label^FS^XZ"
$bytes = [Text.Encoding]::UTF8.GetBytes($zpl)
$stream.Write($bytes, 0, $bytes.Length); $stream.Close(); $client.Close()
```

A label should come out. If the connection is refused, the printer is not on
that network or is not listening on 9100.

---

## When a label doesn't appear

- **Nothing queued** — auto-print is off in /admin/settings, or the payment
  webhook never fired. Check `print_jobs` for a row against the order.
- **Queued, never printed** — with Option A, the serial is wrong or the printer
  lost its Weblink connection; the reason is in `print_jobs.last_error`. With
  Option B, the agent isn't running or can't reach the printer.
- **Printed but blank or garbled** — the media is loaded wrong way up, or the
  label size doesn't match the 4×6 the ZPL assumes.
- **Delivered but no label** — the printer accepts a job while out of media and
  prints it when reloaded. Check for a paused or out-of-media state on the
  printer itself.
