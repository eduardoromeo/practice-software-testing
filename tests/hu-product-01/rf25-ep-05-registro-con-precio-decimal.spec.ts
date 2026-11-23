import { test, expect } from '@playwright/test';
import {
  ADMIN, API_URL, CLIENTE, Limpieza, URL_CATEGORIAS, URL_PRODUCTOS, abrirAltaCategoria, abrirAltaProducto,
  abrirEdicionCategoria, abrirEdicionProducto, anotar, buscarCategoria, buscarProducto, categoriaDeApi,
  categoriaPorNombre, categoriasDeApi, cerrarSesion, eliminarCategoriaEnLista, eliminarProductoEnLista,
  filaCategoria, filaProducto, guardarCategoria, guardarProducto, iniciarSesion, irACategorias, irAProductos,
  limpiarBusquedaCategoria, llenarCategoria, llenarProducto, nombreQa, nombresDeCategorias, productoDeApi,
  productoPorNombre, slugDe, tokenDe, uniq, vigilarErrores5xx,
} from '../../../support/admin';

// HU-25 · RF25-EP-05: Registro con precio decimal
// Caso de Jira: RF25-TC-05. Criterios: CA-25.1.
test.describe('RF25-EP-05 · Registro con precio decimal', () => {

  test('RF25-TC-05 · Registro con precio decimal', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    const cat1 = await lim.categoria(nombreQa('Herramientas QA 001'));
    const nombre = nombreQa('Taladro QA Decimal 01');
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    // Navegación: abrir la pantalla funcional que se evaluará en este caso.
    await abrirAltaProducto(page);
    // Ejecución: realizar la operación o introducir los datos que activan el escenario.
    await llenarProducto(page, { name: nombre, price: '12.50', categoryId: cat1.id }, true);
    const resp = await guardarProducto(page);
    // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
    expect(resp?.status()).toBe(201);
    const creadoPorUI = resp?.status() === 201 ? await resp.json() : null;

    // Registrar únicamente el ID devuelto por esta creación.
    if (creadoPorUI?.id) {
      lim.vigilarProducto(creadoPorUI.id);
    } else {
      throw new Error('No se obtuvo el ID del producto creado');
    }
    const [creado] = await productoPorNombre(request, nombre);
    expect(Number(creado.price)).toBe(12.5);
    const { body } = await productoDeApi(request, creado.id);
    expect(Number(body.price)).toBe(12.5);
    await page.goto(`/product/${creado.id}`);
    await expect(page.locator('[data-test="unit-price"]')).toContainText('12.50');
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
