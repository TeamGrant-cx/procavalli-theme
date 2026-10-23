/* Pro Cavalli: shows "1 pc · EGP 12,000.00" (quantity and line total) on the Add to cart button.
   Mirrors the theme's subtotal block (global.js keeps its price current), so it follows quantity and variant changes. */
if (!customElements.get('pc-atc-summary')) {
  class PcAtcSummary extends HTMLElement {
    connectedCallback() {
      this.form = this.closest('product-form-component');
      this.button = this.form?.querySelector('[name="add"] > .add-to-cart-text');
      this.price = this.closest('[data-product-subtotal]')?.querySelector('[data-subtotal-price]');
      this.quantity = this.form?.querySelector('.quantity__input');
      if (!this.button || !this.price) return;

      this.update = this.update.bind(this);
      this.observer = new MutationObserver(this.update);
      this.observer.observe(this.price, { childList: true, characterData: true, subtree: true });
      this.quantity?.addEventListener('input', this.update);
      this.quantity?.addEventListener('change', this.update);
      this.update();
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.quantity?.removeEventListener('input', this.update);
      this.quantity?.removeEventListener('change', this.update);
      this.button?.removeAttribute('data-pc-summary');
    }

    update() {
      const quantity = Math.max(1, Number(this.quantity?.value) || 1);
      const unit = this.dataset.unit ? ` ${this.dataset.unit}` : '';
      this.button.dataset.pcSummary = `${quantity}${unit} · ${this.price.textContent.trim()}`;
    }
  }
  customElements.define('pc-atc-summary', PcAtcSummary);
}
