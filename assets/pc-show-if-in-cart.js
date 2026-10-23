/* Pro Cavalli: reveals <pc-show-if-in-cart> once the product is in the cart (re-checks on every cart update). */
if (!customElements.get('pc-show-if-in-cart')) {
  class PcShowIfInCart extends HTMLElement {
    connectedCallback() {
      this.productId = Number(this.dataset.productId);
      this.unsubscribe = typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined'
        ? subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.refresh())
        : null;
    }

    disconnectedCallback() {
      if (typeof this.unsubscribe === 'function') this.unsubscribe();
    }

    async refresh() {
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`, { headers: { Accept: 'application/json' } });
        const cart = await response.json();
        this.hidden = !cart.items.some((item) => item.product_id === this.productId);
      } catch (error) {
        /* leave as is */
      }
    }
  }
  customElements.define('pc-show-if-in-cart', PcShowIfInCart);
}
