'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlRequest } from '../../lib/axios';
import { Package, ArrowLeft, ShoppingCart, CheckCircle2, AlertCircle, Plus, Minus } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface OrderItemView {
  productName: string;
  unitPrice: number;
  quantity: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<{ id: string; total: number; items: OrderItemView[] } | null>(null);
  const router = useRouter();

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await graphqlRequest<{ products: Product[] }>(
        '/products/graphql',
        `query { products { id name description price stock } }`,
      );
      setProducts(data.products);
    } catch {
      setError('No se pudo cargar el catálogo (products-service). Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const setQty = (id: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const placeOrder = async () => {
    const rawUser = sessionStorage.getItem('user');
    const userId = rawUser ? JSON.parse(rawUser).id : 'guest';

    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity }));

    if (items.length === 0) {
      setError('Selecciona al menos un producto con cantidad mayor a 0.');
      return;
    }

    setPlacing(true);
    setError('');
    setOrder(null);
    try {
      const data = await graphqlRequest<{
        createOrder: { id: string; total: number; items: OrderItemView[] };
      }>(
        '/orders/graphql',
        `mutation($input: CreateOrderInput!) {
          createOrder(input: $input) { id total items { productName unitPrice quantity } }
        }`,
        { input: { userId, items } },
      );
      setOrder(data.createOrder);
      setQuantities({});
      loadProducts();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la orden (orders-service).');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Package size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Catálogo de productos</h1>
              <p className="text-sm text-zinc-500">GraphQL · products-service (Python/FastAPI) vía API Gateway</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {order && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-green-700 text-sm">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Orden creada en orders-service (id: {order.id.slice(0, 8)}…)</p>
              <ul className="mt-1 space-y-0.5">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.quantity} × {item.productName} (${item.unitPrice.toFixed(2)} c/u)
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-semibold">Total: ${order.total.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {products.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-zinc-900">{product.name}</p>
                    <p className="text-sm text-zinc-500">{product.description}</p>
                    <p className="text-sm text-zinc-500">
                      ${product.price.toFixed(2)} · stock: {product.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 0) - 1)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-zinc-900">
                      {quantities[product.id] || 0}
                    </span>
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 0) + 1)}
                      disabled={(quantities[product.id] || 0) >= product.stock}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={placeOrder}
          disabled={placing || loading}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {placing ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingCart size={16} />
              <span>Crear orden (orders-service)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
