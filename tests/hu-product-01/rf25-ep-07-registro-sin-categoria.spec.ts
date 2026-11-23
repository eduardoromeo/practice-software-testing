import { test, expect } from '@playwright/test';
import {
  ADMIN, API_URL, CLIENTE, Limpieza, URL_CATEGORIAS, URL_PRODUCTOS, abrirAltaCategoria, abrirAltaProducto,
  abrirEdicionCategoria, abrirEdicionProducto, anotar, buscarCategoria, buscarProducto, categoriaDeApi,
  categoriaPorNombre, categoriasDeApi, cerrarSesion, eliminarCategoriaEnLista, eliminarProductoEnLista,
  filaCategoria, filaProducto, guardarCategoria, guardarProducto, iniciarSesion, irACategorias, irAProductos,
  limpiarBusquedaCategoria, llenarCategoria, llenarProducto, nombreQa, nombresDeCategorias, productoDeApi,
  productoPorNombre, slugDe, tokenDe, uniq, vigilarErrores5xx,
} from '../../../support/admin';

// HU-25 · RF25-EP-07: Registro sin categoría
// Caso de Jira: RF25-TC-07. Criterios: CA-25.2.
test.describe('RF25-EP-07 · Registro sin categoría', () => {

  test('RF25-TC-07 · Registro sin categoría', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    anotar(test.info(), 'Regla pendiente (¿categoría obligatoria?): en la interfaz el campo es requerido, por lo que se comprueba que no se crea el producto.');
    const nombre = nombreQa('Taladro QA Sin Categoria 01');
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    // Navegación: abrir la pantalla funcional que se evaluará en este caso.
    await abrirAltaProducto(page);
    // Ejecución: realizar la operación o introducir los datos que activan el escenario.
    await llenarProducto(page, { name: nombre, price: '12.50' }, true);
    const resp = await guardarProducto(page);
    // Limpiar exclusivamente el ID creado por esta petici?n.
    if (resp?.status() === 201) {
      const creadoQA = await resp.json();
      if (!creadoQA?.id) throw new Error('Creaci?n sin ID para limpieza');
      lim.vigilarProducto(creadoQA.id);
    }
    // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
    expect(resp).toBeNull();
    // Angular bloquea el envío cuando falta la categoría obligatoria.
// No se exige una alerta de servidor si no hubo petición HTTP.
await expect(page.locator('[data-test="category-id"]')).toHaveValue('');
    expect(await productoPorNombre(request, nombre)).toHaveLength(0);
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
