import { expect, type APIRequestContext, type Page, type Response, type TestInfo } from '@playwright/test';

export const API_URL = 'http://localhost:8091';

const adminCredentials = {
  email: 'admin@practicesoftwaretesting.com',
  password: 'welcome01',
};

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  category_id: string;
  category?: { id: string };
}

interface ApiCategory {
  id: string;
  name: string;
}

interface HttpResponse {
  ok(): boolean;
  status(): number;
  text(): Promise<string>;
}

function getItems<T>(body: unknown, endpoint: string): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }

  if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
    return body.data as T[];
  }

  throw new Error(`Unexpected response from ${endpoint}`);
}

async function assertOk(response: HttpResponse, action: string): Promise<void> {
  if (!response.ok()) {
    throw new Error(`${action} failed: HTTP ${response.status()} ${await response.text()}`);
  }
}

export function uniq(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nombreQa(name: string): string {
  return `${name} ${uniq()}`;
}

function slugDe(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniq()}`
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export class Limpieza {
  private readonly productIds: string[] = [];
  private readonly categoryIds: string[] = [];
  private accessToken?: string;

  constructor(private readonly request: APIRequestContext) {}

  async categoria(name: string): Promise<ApiCategory> {
    const response = await this.request.post(`${API_URL}/categories`, {
      data: { name, slug: slugDe(name) },
    });
    await assertOk(response, 'Creating QA category');
    const category = await response.json() as ApiCategory;
    this.categoryIds.push(category.id);
    return category;
  }

  async producto(name: string, categoryId: string): Promise<ApiProduct> {
    const [brandResponse, imageResponse] = await Promise.all([
      this.request.get(`${API_URL}/brands`),
      this.request.get(`${API_URL}/images`),
    ]);
    await assertOk(brandResponse, 'Loading brands');
    await assertOk(imageResponse, 'Loading product images');
    const [brand] = getItems<{ id: string }>(await brandResponse.json(), '/brands');
    const [image] = getItems<{ id: string }>(await imageResponse.json(), '/images');
    if (!brand || !image) {
      throw new Error('Cannot create a QA product without a brand and product image');
    }

    const response = await this.request.post(`${API_URL}/products`, {
      data: {
        name,
        description: 'QA product created for Playwright tests',
        price: 12.5,
        category_id: categoryId,
        brand_id: brand.id,
        product_image_id: image.id,
        is_location_offer: false,
        is_rental: false,
        stock: 10,
      },
    });
    await assertOk(response, 'Creating QA product');
    const product = await response.json() as ApiProduct;
    this.vigilarProducto(product.id);
    return product;
  }

  vigilarProducto(id: string | number): void {
    const productId = String(id);
    if (!this.productIds.includes(productId)) {
      this.productIds.push(productId);
    }
  }

  async todo(): Promise<void> {
    const headers = { Authorization: `Bearer ${await this.token()}` };
    for (const id of this.productIds.reverse()) {
      const response = await this.request.delete(`${API_URL}/products/${id}`, { headers });
      await assertOk(response, `Deleting QA product ${id}`);
    }
    for (const id of this.categoryIds.reverse()) {
      const response = await this.request.delete(`${API_URL}/categories/${id}`, { headers });
      await assertOk(response, `Deleting QA category ${id}`);
    }
  }

  private async token(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const response = await this.request.post(`${API_URL}/users/login`, { data: adminCredentials });
    await assertOk(response, 'Authenticating admin for QA cleanup');
    const body = await response.json() as { access_token?: string };
    if (!body.access_token) {
      throw new Error('Admin login response did not contain an access token');
    }
    this.accessToken = body.access_token;
    return this.accessToken;
  }
}

export async function iniciarSesion(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('[data-test="email"]').fill(adminCredentials.email);
  await page.locator('[data-test="password"]').fill(adminCredentials.password);
  await page.locator('[data-test="login-submit"]').click();
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/);
}

export async function abrirAltaProducto(page: Page): Promise<void> {
  await page.goto('/admin/products/add');
  await expect(page.locator('[data-test="product-submit"]')).toBeVisible();
}

export async function llenarProducto(
  page: Page,
  product: { name: string; price: string; categoryId?: string },
  _selectDefaults = true,
): Promise<void> {
  await page.locator('[data-test="name"]').fill(product.name);
  await page.locator('[data-test="description"]').fill('QA product created for Playwright tests');
  await page.locator('[data-test="stock"]').fill('10');
  await page.locator('[data-test="price"]').fill(product.price);

  const brand = page.locator('[data-test="brand-id"]');
  await brand.selectOption({ index: 1 });
  if (product.categoryId) {
    await page.locator('[data-test="category-id"]').selectOption(product.categoryId);
  }
  await page.locator('[data-test="product-image-id"]').selectOption({ index: 1 });
}

export async function guardarProducto(page: Page): Promise<Response | null> {
  const response = page.waitForResponse(
    result => result.url() === `${API_URL}/products` && result.request().method() === 'POST',
    { timeout: 2000 },
  ).catch((error: unknown) => {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return null;
    }
    throw error;
  });

  await page.locator('[data-test="product-submit"]').click();
  return response;
}

export async function productoPorNombre(
  request: APIRequestContext,
  name: string,
): Promise<ApiProduct[]> {
  if (!name) {
    return [];
  }

  const firstPageResponse = await request.get(`${API_URL}/products?page=1`);
  await assertOk(firstPageResponse, 'Loading products');
  const firstPage = await firstPageResponse.json() as { data: ApiProduct[]; last_page?: number };
  const products = [...getItems<ApiProduct>(firstPage, '/products')];
  const lastPage = firstPage.last_page ?? 1;

  for (let page = 2; page <= lastPage; page++) {
    const response = await request.get(`${API_URL}/products?page=${page}`);
    await assertOk(response, `Loading products page ${page}`);
    products.push(...getItems<ApiProduct>(await response.json(), '/products'));
  }

  return products.filter(product => product.name === name);
}

export async function productoDeApi(
  request: APIRequestContext,
  id: string,
): Promise<{ body: ApiProduct }> {
  const response = await request.get(`${API_URL}/products/${id}`);
  await assertOk(response, `Loading product ${id}`);
  return { body: await response.json() as ApiProduct };
}

export async function irAProductos(page: Page): Promise<void> {
  await page.goto('/admin/products');
  await expect(page.locator('[data-test="product-search-query"]')).toBeVisible();
}

export async function buscarProducto(page: Page, name: string): Promise<void> {
  await page.locator('[data-test="product-search-query"]').fill(name);
  await page.locator('[data-test="product-search-submit"]').click();
}

export function filaProducto(page: Page, name: string) {
  return page.locator('tbody tr').filter({ hasText: name });
}

export function anotar(testInfo: TestInfo, description: string): void {
  testInfo.annotations.push({ type: 'context', description });
}
