import axios from "axios";

type Item = [number, number] | number;
type LineItem = { productId: number; id: string };
type LineItems = { physicalItems: LineItem[]; digitalItems: LineItem[] };

const api = axios.create({
	baseURL: "/api/storefront/"
});

/**
 * Maps the productId with the actual product id from BigCommerce.
 * @param lineItems The lineItems from the cart.
 * @param productId The product id to map.
 */
const mapProductIdToId = ({ digitalItems = [], physicalItems = [] }: LineItems, productId: number) => {
	return [...digitalItems, ...physicalItems].filter(it => it.productId === productId).map(it => it.id);
};

const transformItemIntoDTO = (items: Item[]) =>
	items.map(item => {
		let productId = 0;
		let quantity = 1;
		if (item as number) {
			productId = item as number;
		} else if (item as [number, number]) {
			const [pId, qty = 1] = item as [number, number];
			productId = pId;
			quantity = qty;
		}
		return { productId, quantity };
	});

export default new (class {
	/**
	 * Returns the cart data from BigCommerce.
	 */
	async getCart() {
		const res = await api.get("cart", {
			params: {
				include: ["lineItems.digitalItems.options", "lineItems.physicalItems.options"].join(",")
			}
		});

		return res.data[0] || null;
	}

	/**
	 * Add item(s) to the cart.
	 * @param items The items to be added.
	 */
	async addItem(...items: Item[]) {
		const lineItems = transformItemIntoDTO(items);
		try {
			const cart = await this.getCart();
			const response = await api.post(cart && cart.id ? `carts/${cart.id}/items` : "cart", { lineItems });
			return response.data;
		} catch (err) {
			console.error(`BC API: Failed to add items to cart. [${lineItems.map(it => it.productId).join(", ")}]`);
			throw err;
		}
	}

	/**
	 * Update item(s) to the cart.
	 * @param items The items to be updated.
	 */
	async updateItem(...items: Item[]) {}

	/**
	 * Remove item(s) from the cart.
	 * @param items The items to be removed.
	 */
	async removeItem(...items: Item[]) {
        const lineItems = transformItemIntoDTO(items)
		try {
            const cart = await this.getCart();
            const productIds = lineItems.map(it => mapProductIdToId(cart.lineItems, it.productId))
            return await productIds.map(async id => {
                const response = await api.delete(`carts/${cart.id}/items/${id}`)
                return response.data
            }).pop()
		} catch (err) {
			console.error(`BC API: Could not remove items from the cart: [${lineItems.map(it => it.productId).join(', ')}]`);
			throw err;
		}
	}
})();
