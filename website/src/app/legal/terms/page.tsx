import Link from "next/link";
import { PageHero, PageShell } from "@/components/PageShell";

export const metadata = {
  title: "Terms of use",
  description:
    "YTMP terms of use: license subscription, acceptable use, payments, liability, and termination.",
};

const lastUpdated = "August 4, 2026";

export default function TermsPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Legal"
        title="Terms of use"
        lead="These terms govern your use of the YTMP Windows application, website, and related license services. By requesting a license, activating a key, or using the software, you agree to this agreement."
      />
      <p className="legal-meta">Last updated: {lastUpdated}</p>

      <div className="prose-panel">
        <h2>1. Who we are</h2>
        <p>
          “YTMP,” “we,” “us,” and “our” refer to the operators of the YTMP product, website, and
          license API. “You” means the individual or entity that subscribes to or uses YTMP.
          Contact options are listed on our{" "}
          <Link href="/support">Support</Link> page.
        </p>

        <h2>2. The product</h2>
        <p>
          YTMP is a desktop toolkit for Windows that can download media from supported public web
          sources (including but not limited to YouTube, Spotify link resolution flows, SoundCloud,
          and other sites supported by the application), convert local files with bundled tools such
          as ffmpeg, and manage a local library of exports. Features may change over time as we
          release updates.
        </p>
        <p>
          YTMP is provided as a licensed application. Access to protected functions (such as
          download and convert) requires a valid, non-revoked subscription key subject to online
          verification and offline grace rules described in the product.
        </p>

        <h2>3. Accounts, orders, and licenses</h2>
        <h3>3.1 Orders</h3>
        <p>
          Plans (for example trial, monthly, yearly) and prices are shown on the pricing page and
          may change for new purchases. Submitting a request does not guarantee fulfillment until
          payment is confirmed according to our process and an administrator issues a license.
        </p>
        <h3>3.2 License grant</h3>
        <p>
          Subject to these terms and timely payment, we grant you a limited, non-exclusive,
          non-transferable, revocable license to install and use YTMP on permitted devices for the
          duration of your active subscription. The license is personal to you (or your
          organization if purchased for that purpose) and may not be sublicensed, rented, or
          resold.
        </p>
        <h3>3.3 Seat and device controls</h3>
        <p>
          We may use device fingerprints, IP-related signals, and server-side license records to
          enforce subscription limits and prevent abuse. Circumventing license checks, sharing keys
          publicly, or operating key generators is prohibited.
        </p>
        <h3>3.4 Term, renewal, and termination</h3>
        <p>
          Your license remains valid only while the subscription period is active and not revoked.
          We may suspend or revoke licenses for non-payment, chargeback abuse, fraud, violation of
          these terms, or technical risk to the service. On expiry or revocation, you must stop
          using protected features; the installer or residual files on disk do not extend rights.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree to use YTMP only for lawful purposes. Without limitation, you must not:</p>
        <ul>
          <li>
            Download, copy, or redistribute content if you lack the rights, permissions, or
            applicable legal exceptions under copyright and related laws in your jurisdiction
          </li>
          <li>
            Violate the terms of service, technical measures, or acceptable-use rules of YouTube,
            Spotify, SoundCloud, or any other third-party platform
          </li>
          <li>
            Use YTMP to infringe privacy, commit fraud, distribute malware, or attack our API or
            third-party systems
          </li>
          <li>
            Reverse engineer, decompile, or modify the software except where mandatory law
            prohibits this restriction
          </li>
          <li>
            Resell license keys, operate multi-tenant hosting of a single key, or automate mass
            harvesting in a way that abuses source platforms or our infrastructure
          </li>
        </ul>
        <p>
          You alone are responsible for the content you process and for compliance with platform
          rules and local law. YTMP does not grant any copyright in third-party media.
        </p>

        <h2>5. Third-party services</h2>
        <p>
          Downloads depend on third-party websites and extractors that can change or fail without
          notice. Spotify-related workflows may resolve metadata and match audio from alternate
          sources rather than official Spotify streams. We do not control availability of external
          sites and are not responsible for their content, downtime, or policy changes.
        </p>

        <h2>6. Payments, coupons, and refunds</h2>
        <p>
          Payment instructions may be provided after you request access. Until an order is marked
          paid in our systems, no permanent license is owed. Coupons, free days, and discounts are
          optional promotions that may be limited in time or by plan.
        </p>
        <p>
          Refund eligibility, if any, is decided case by case after you contact support with your
          order ID, unless a mandatory consumer law in your jurisdiction provides stronger rights.
          Trial periods may be free; abuse of free trials (duplicate accounts to re-trial
          indefinitely) may lead to denial of service.
        </p>

        <h2>7. Software updates and support</h2>
        <p>
          We may provide updates, installer rebuilds, or configuration changes at our discretion.
          Support for license and payment issues is offered as described on the Support page; it
          is not a guaranteed SLA unless separately contracted. We may discontinue features or the
          product with reasonable notice when feasible.
        </p>

        <h2>8. Intellectual property</h2>
        <p>
          YTMP software, branding, website design, and documentation are owned by us or our
          licensors. These terms do not transfer ownership of the software. Third-party components
          (such as open-source libraries bundled in the installer) remain subject to their own
          licenses.
        </p>

        <h2>9. Disclaimer of warranties</h2>
        <p>
          The product and services are provided “as is” and “as available” to the fullest extent
          permitted by law. We disclaim all warranties, express or implied, including merchantability,
          fitness for a particular purpose, and non-infringement. We do not warrant uninterrupted
          downloads, perpetual compatibility with third-party sites, or error-free conversion.
        </p>

        <h2>10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental,
          special, consequential, or punitive damages, or for lost profits, lost data, business
          interruption, or cost of substitute software, arising from your use of YTMP or inability
          to use it, even if advised of the possibility of such damages.
        </p>
        <p>
          Our aggregate liability for claims relating to the product or these terms is limited to
          the amounts you paid us for the subscription period in which the claim arose, or fifty
          US dollars (USD $50) if you paid nothing, whichever is greater, unless mandatory law
          requires otherwise.
        </p>

        <h2>11. Indemnity</h2>
        <p>
          You agree to defend and indemnify us against claims, damages, and expenses (including
          reasonable legal fees) arising from your misuse of YTMP, your violation of these terms,
          or your infringement of third-party rights — including copyright claims related to
          media you download or redistribute.
        </p>

        <h2>12. Privacy</h2>
        <p>
          How we collect and use personal data is described in our{" "}
          <Link href="/legal/privacy">Privacy policy</Link>. By using the service you also
          acknowledge that policy.
        </p>

        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms by posting a revised version with a new “Last updated” date.
          Continued use after changes become effective constitutes acceptance of the revised terms
          for subsequent use and renewals. Material changes may also be communicated by email when
          we have a workable address on file.
        </p>

        <h2>14. Governing law & disputes</h2>
        <p>
          Unless mandatory local consumer law requires otherwise, these terms are governed by the
          laws of the jurisdiction in which the YTMP operator primarily conducts business, without
          regard to conflict-of-law rules. Courts in that jurisdiction will have exclusive venue
          for disputes, subject to any non-waivable consumer forum rights.
        </p>

        <h2>15. Contact</h2>
        <p>
          Questions about these terms: use{" "}
          <Link href="/support">Support</Link> with the subject line “Terms of use”.
        </p>
      </div>
    </PageShell>
  );
}
