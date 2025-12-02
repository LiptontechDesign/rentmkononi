import { PublicPageLayout } from '@/components/layout/PublicPageLayout'

export default function PrivacyPolicyPage() {
  return (
    <PublicPageLayout 
      title="Privacy Policy" 
      subtitle="Last updated: January 1, 2025"
    >
      <p>
        At RentMkononi, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our property management services.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We collect information that you provide directly to us when you register for an account, create or modify your profile, set up properties, add tenants, and communicate with us. This information may include:
      </p>
      <ul>
        <li>Name, email address, and phone number</li>
        <li>Property details and rental agreements</li>
        <li>Tenant information (names, contacts, rent amounts)</li>
        <li>Payment records and transaction history</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>
        We use the information we collect to:
      </p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process rent payments and generate reports</li>
        <li>Send you technical notices, updates, and support messages</li>
        <li>Respond to your comments and questions</li>
        <li>Protect against fraud and unauthorized transactions</li>
      </ul>

      <h2>3. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect the security of your personal information. Your data is encrypted in transit and at rest using industry-standard protocols.
      </p>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell your personal data. We may share your information with:
      </p>
      <ul>
        <li>Service providers who perform services on our behalf (e.g., payment processing, hosting)</li>
        <li>Law enforcement or government bodies when required by law</li>
      </ul>

      <h2>5. Your Rights</h2>
      <p>
        You have the right to access, correct, or delete your personal information. You can manage most of your data directly within your RentMkononi dashboard. For other requests, please contact us.
      </p>

      <h2>6. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at privacy@rentmkononi.com.
      </p>
    </PublicPageLayout>
  )
}
