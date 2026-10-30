// Print agent — drains the storefront's label queue onto a Zebra printer.
//
// Only needed when Zebra Data Services is not in use. Run it on any machine
// that can reach the printer; it needs no inbound port, because it polls.
//
// Node 20+, no dependencies:  node agent.mjs
// See README.md for running it as a Windows service.

import net from "node:net"
import process from "node:process"

const SITE_URL = requireEnv("SITE_URL").replace(/\/$/, "")
const TOKEN = requireEnv("PRINT_AGENT_TOKEN")
const FALLBACK_HOST = process.env.PRINTER_HOST ?? ""
const PRINTER_PORT = Number(process.env.PRINTER_PORT ?? 9100)
const POLL_MS = Math.max(Number(process.env.POLL_SECONDS ?? 5), 2) * 1000
const SOCKET_TIMEOUT_MS = 10_000

const ENDPOINT = `${SITE_URL}/api/print/jobs`
const AUTH = { authorization: `Bearer ${TOKEN}` }

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`[print-agent] ${name} is not set — see .env.example`)
    process.exit(1)
  }
  return value
}

function log(...args) {
  console.log(new Date().toISOString(), ...args)
}

/**
 * Writes raw ZPL to the printer's RAW 9100 port. No driver involved — this is
 * the same channel Zebra Setup Utilities uses.
 *
 * Resolving means the printer accepted the bytes, which is not the same as a
 * label coming out: a printer that is out of media still accepts a job and
 * prints it once reloaded. That is why the queue treats this as delivery.
 */
function sendZpl(host, zpl) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: PRINTER_PORT })
    socket.setTimeout(SOCKET_TIMEOUT_MS)

    socket.on("connect", () => socket.end(zpl))
    socket.on("timeout", () => socket.destroy(new Error("printer timed out")))
    socket.on("error", reject)
    socket.on("close", (hadError) => {
      if (!hadError) resolve()
    })
  })
}

/**
 * Opens and closes a connection without sending anything. Checked before
 * claiming, so a printer that is off or asleep leaves receipts waiting in the
 * queue instead of burning their attempts against a closed port.
 */
function printerReachable(host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: PRINTER_PORT })
    socket.setTimeout(3000)
    socket.on("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.on("timeout", () => {
      socket.destroy()
      resolve(false)
    })
    socket.on("error", () => resolve(false))
  })
}

// Last address in use, so the reachability check has a target before the
// first claim. Updated from the site's setting on every claim.
let lastHost = FALLBACK_HOST
let printerDown = false

async function claimJobs() {
  const response = await fetch(ENDPOINT, { headers: AUTH })
  if (!response.ok) {
    throw new Error(`claim failed: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function acknowledge(printed, failed) {
  if (printed.length === 0 && failed.length === 0) return

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { ...AUTH, "content-type": "application/json" },
    body: JSON.stringify({ printed, failed }),
  })
  if (!response.ok) {
    // Unacknowledged jobs are reclaimed by the queue after a couple of minutes,
    // so the labels are not lost — they may just print twice.
    throw new Error(`ack failed: ${response.status}`)
  }
}

async function tick() {
  if (lastHost) {
    const up = await printerReachable(lastHost)
    if (up !== !printerDown) {
      // Logged on change only, so a printer off overnight is one line.
      log(up ? `printer ${lastHost} is back` : `printer ${lastHost} unreachable, holding the queue`)
      printerDown = !up
    }
    if (!up) return
  }

  const { jobs, printerHost } = await claimJobs()
  lastHost = printerHost || FALLBACK_HOST
  if (jobs.length === 0) return

  // The site's setting wins, so the printer's address can be corrected from
  // /admin/settings without editing anything on this machine.
  const host = printerHost || FALLBACK_HOST
  if (!host) {
    throw new Error("no printer address — set PRINTER_HOST or the admin setting")
  }

  const printed = []
  const failed = []

  for (const job of jobs) {
    try {
      await sendZpl(host, job.payload)
      printed.push(job.id)
      log(`printed ${job.id}`)
    } catch (error) {
      failed.push({ id: job.id, error: String(error.message ?? error).slice(0, 300) })
      log(`failed ${job.id}: ${error.message ?? error}`)
    }
  }

  await acknowledge(printed, failed)
}

async function main() {
  log(`polling ${ENDPOINT} every ${POLL_MS / 1000}s, printing to :${PRINTER_PORT}`)

  for (;;) {
    try {
      await tick()
    } catch (error) {
      // Never exit on a bad poll: the network drops, the site redeploys, the
      // printer sleeps. Log it and try again on the next tick.
      log(`error: ${error.message ?? error}`)
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

main()
