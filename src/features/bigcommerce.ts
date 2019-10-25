import axios from "axios";
import config from "./config";

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

/**
 * Console.logs the statement if the library is set to debug.
 * @param statement The variables to pass through console.log
 */
const log = (...statement: any[]) => {
	if(config.debug) {
		console.log(...statement);
	}
}

const transformItemIntoDTO = (items: Item[]) =>
	items.map(item => {
		let productId = 0;
		let quantity = 1;
		if (typeof item === 'number') {
			productId = item;
		} else {
			const [pId, qty = 1] = item;
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
	async updateItem(...items: Item[]) {
		const lineItems = transformItemIntoDTO(items)
		let newItems = lineItems.filter(it => it.quantity > 0).map(item => ([item.productId, item.quantity])) as Item[]
		try {
			const cart = await this.getCart();
			if(cart && cart.id) {
				const cartItems = [...cart.lineItems.digitalItems, ...cart.lineItems.physicalItems].map(it => it.productId)
				const existingItems = lineItems.filter(item => cartItems.includes(item.productId)).map(item => (item.productId))
				log('Removing existing items:', existingItems);
				await this.removeItem(...existingItems)
			}
		} catch(err) {
			console.error(`BC API: Could not update items in the cart`);
			throw err;
		}
		if(newItems.length) {
			log('Adding items:', newItems);
			return await this.addItem(...newItems);
		}
	}

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
