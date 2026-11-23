import { test, expect } from '@playwright/test';
import {
  ADMIN, API_URL, CLIENTE, Limpieza, URL_CATEGORIAS, URL_PRODUCTOS, abrirAltaCategoria, abrirAltaProducto,
  abrirEdicionCategoria, abrirEdicionProducto, anotar, buscarCategoria, buscarProducto, categoriaDeApi,
  categoriaPorNombre, categoriasDeApi, cerrarSesion, eliminarCategoriaEnLista, eliminarProductoEnLista,
  filaCategoria, filaProducto, guardarCategoria, guardarProducto, iniciarSesion, irACategorias, irAProductos,
  limpiarBusquedaCategoria, llenarCategoria, llenarProducto, nombreQa, nombresDeCategorias, productoDeApi,
  productoPorNombre, slugDe, tokenDe, uniq, vigilarErrores5xx,
} from '../../../support/admin';

// HU-25 · RF25-EP-04: Registro de producto duplicado
// Caso de Jira: RF25-TC-04. Criterios: CA-25.1, CA-25.2.
test.describe('RF25-EP-04 · Registro de producto duplicado', () => {

  test('RF25-TC-04 · Registro de producto duplicado', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    anotar(test.info(), 'Regla pendiente (campo único: nombre o SKU): se documenta el comportamiento actual con el mismo nombre.');
    const cat1 = await lim.categoria(nombreQa('Herramientas QA 001'));
    const p1 = await lim.producto(`Taladro QA ${uniq()}`, cat1.id);
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    // Navegación: abrir la pantalla funcional que se evaluará en este caso.
    await abrirAltaProducto(page);
    // Ejecución: realizar la operación o introducir los datos que activan el escenario.
    await llenarProducto(page, { name: p1.name, price: '12.50', categoryId: cat1.id }, true);
    const resp = await guardarProducto(page);
    // Limpiar exclusivamente el ID creado por esta petici?n.
    if (resp?.status() === 201) {
      const creadoQA = await resp.json();
      if (!creadoQA?.id) throw new Error('Creaci?n sin ID para limpieza');
      lim.vigilarProducto(creadoQA.id);
    }
    // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
    expect(resp?.status()).toBeLessThan(500);
    const total = (await productoPorNombre(request, p1.name)).length;
    test.info().annotations.push({ type: 'comportamiento actual', description: `${total} producto(s) con el nombre «${p1.name}»` });
    expect(total, 'unicidad de nombre').toBe(1);
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
