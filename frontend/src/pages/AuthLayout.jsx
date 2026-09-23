/* eslint-disable react/prop-types -- layout wrapper */
import { Logo } from '../components/ui';

function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Logo light />
        <div>
          <h2>See who would take the bait — before an attacker does.</h2>
          <p>
            Run realistic phishing and smishing simulations, score each employee&apos;s
            susceptibility, and close the gaps with targeted training.
          </p>
          <ul className="auth-points">
            <li>M-Pesa, Safaricom, KRA and invoice-fraud templates built for Kenyan teams</li>
            <li>Logistic-regression risk scores for every employee</li>
            <li>Training assigned automatically when someone clicks</li>
          </ul>
        </div>
        <span className="auth-footnote">Security awareness simulation platform</span>
      </aside>
      <main className="auth-panel">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}

export default AuthLayout;
