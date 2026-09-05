import { BrandMark } from "../constants.js";

export function Footer() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div>
        <div class="footer-brand">${BrandMark()}<span>Saathi</span></div>
        <div class="footer-links">
          <a href="#/browse">Find a caregiver</a>
          <a href="#/list-your-services">List your services</a>
          <a href="#/how-it-works">How it works</a>
          <a href="#/privacy">Privacy</a>
          <a href="#/admin/login">Admin login</a>
        </div>
      </div>
      <p class="footer-disclaimer">Saathi is a listings directory for the Dallas–Fort Worth area, not a caregiving agency. Background-check status shown on a profile reflects Saathi's own admin review, not a licensed third-party background check provider. Families and caregivers arrange scheduling and payment directly.</p>
    </div>
  </footer>`;
}
