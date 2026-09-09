import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Midwestern Peptides accessibility statement — our conformance target, known limitations, and how to report a barrier.",
}

const LAST_UPDATED = "September 8, 2026"

export default function AccessibilityPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-sand-900">Accessibility</h1>
      <p className="mt-2 text-sm text-sand-600">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 prose prose-gray max-w-none">
        <p>
          We want this store to be usable by everyone, including people who
          browse with a screen reader, navigate by keyboard, or rely on
          magnification or high-contrast settings.
        </p>

        <h2>Conformance target</h2>
        <p>
          We aim to meet <strong>WCAG 2.1 Level AA</strong>. That is a target we
          work toward rather than a certification we hold — no automated tool or
          single audit can guarantee conformance across every page and assistive
          technology.
        </p>

        <h2>What we have done</h2>
        <ul>
          <li>
            Text and interface colours are checked against the 4.5:1 contrast
            minimum, including button labels and small print
          </li>
          <li>Every image carries alternative text, or is marked decorative where it adds nothing</li>
          <li>The site works at any window width, and text scales without breaking the layout</li>
          <li>Interactive controls are reachable and operable by keyboard, with a visible focus indicator</li>
          <li>Form fields have real labels, and errors are described in text rather than by colour alone</li>
        </ul>

        <h2>Known limitations</h2>
        <p>
          We would rather name these than imply the site is flawless:
        </p>
        <ul>
          <li>
            Some pages animate content as you scroll. Motion is reduced if your
            device requests it, but the effect is not removed entirely everywhere.
          </li>
          <li>
            Certificates of analysis are supplied by email as supplier-provided
            PDFs, which may not be tagged for screen readers. Ask us and we will
            send the results as plain text.
          </li>
        </ul>

        <h2>Tell us about a barrier</h2>
        <p>
          If something on this site is difficult or impossible for you to use, we
          want to hear about it — it is the fastest way for us to find problems
          our own testing missed. Email{" "}
          <a href="mailto:support@midwesternpeptides.com?subject=Accessibility" className="text-brand-700">
            support@midwesternpeptides.com
          </a>{" "}
          with the page address and what went wrong. We aim to respond within two
          business days and will tell you what we can fix and when.
        </p>
        <p>
          If you cannot complete an order because of an accessibility barrier,
          say so in your message and we will take the order by email instead.
        </p>
      </div>
    </main>
  )
}
