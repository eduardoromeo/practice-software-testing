import { test, expect } from '@playwright/test';
import {
  ADMIN, API_URL, CLIENTE, Limpieza, URL_CATEGORIAS, URL_PRODUCTOS, abrirAltaCategoria, abrirAltaProducto,
  abrirEdicionCategoria, abrirEdicionProducto, anotar, buscarCategoria, buscarProducto, categoriaDeApi,
  categoriaPorNombre, categoriasDeApi, cerrarSesion, eliminarCategoriaEnLista, eliminarProductoEnLista,
  filaCategoria, filaProducto, guardarCategoria, guardarProducto, iniciarSesion, irACategorias, irAProductos,
  limpiarBusquedaCategoria, llenarCategoria, llenarProducto, nombreQa, nombresDeCategorias, productoDeApi,
  productoPorNombre, slugDe, tokenDe, uniq, vigilarErrores5xx,
} from '../../../support/admin';

// HU-25 · RF25-EP-06: Registro con precio cero
// Caso de Jira: RF25-TC-06. Criterios: CA-25.3.
test.describe('RF25-EP-06 · Registro con precio cero', () => {

  test('RF25-TC-06 · Registro con precio cero', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    anotar(test.info(), 'Regla pendiente (¿se permite precio 0?): se documenta el comportamiento actual y se exige consistencia entre respuesta y datos guardados.');
    const cat1 = await lim.categoria(nombreQa('Herramientas QA 001'));
    const nombre = nombreQa('Taladro QA Precio Cero 01');
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    // Navegación: abrir la pantalla funcional que se evaluará en este caso.
    await abrirAltaProducto(page);
    // Ejecución: realizar la operación o introducir los datos que activan el escenario.
    await llenarProducto(page, { name: nombre, price: '0', categoryId: cat1.id }, true);
    const resp = await guardarProducto(page);
    // Limpiar exclusivamente el ID creado por esta petici?n.
    if (resp?.status() === 201) {
      const creadoQA = await resp.json();
      if (!creadoQA?.id) throw new Error('Creaci?n sin ID para limpieza');
      lim.vigilarProducto(creadoQA.id);
    }
    // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
    expect(resp?.status()).toBeLessThan(500);
    const creados = await productoPorNombre(request, nombre);
    test.info().annotations.push({ type: 'comportamiento actual', description: resp?.status() === 201 ? 'precio 0 aceptado' : `precio 0 rechazado (HTTP ${resp?.status()})` });
    expect(creados).toHaveLength(resp?.status() === 201 ? 1 : 0);
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
