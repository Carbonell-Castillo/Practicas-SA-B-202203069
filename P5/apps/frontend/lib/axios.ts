import axios from 'axios';

// Todas las peticiones REST del frontend pasan por el API Gateway, nunca
// hablan directo con un microservicio.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api',
  withCredentials: true, // IMPORTANT: Para enviar y recibir cookies
});

export default api;

export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';

/** Cliente mínimo para los endpoints GraphQL expuestos por el gateway. */
export async function graphqlRequest<T = any>(
  path: '/products/graphql' | '/orders/graphql',
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await axios.post(
    `${GATEWAY_URL}${path}`,
    { query, variables },
    { withCredentials: true },
  );
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
}
