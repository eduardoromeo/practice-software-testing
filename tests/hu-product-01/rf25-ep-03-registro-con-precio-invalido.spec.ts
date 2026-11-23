import { test, expect } from '@playwright/test';
import {
  Limpieza, abrirAltaProducto, guardarProducto, iniciarSesion, llenarProducto, nombreQa, productoPorNombre,
  uniq,
} from '../support/admin';

// HU-25 · RF25-EP-03: Registro con precio inválido
// Caso de Jira: RF25-TC-03. Criterios: CA-25.3.
test.describe('RF25-EP-03 · Registro con precio inválido', () => {

  test('RF25-TC-03 · Registro con precio inválido', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    const cat1 = await lim.categoria(nombreQa('Herramientas QA 001'));
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    for (const precio of ['-5', 'abc']) {
      const nombre = nombreQa(`Taladro QA Precio ${precio === 'abc' ? 'Texto' : 'Negativo'}`);
      // Navegación: abrir la pantalla funcional que se evaluará en este caso.
      await abrirAltaProducto(page);
      // Ejecución: realizar la operación o introducir los datos que activan el escenario.
      await llenarProducto(page, { name: nombre, price: precio, categoryId: cat1.id }, true);
      const resp = await guardarProducto(page);
      // Limpiar exclusivamente el ID creado por esta petici?n.
      if (resp?.status() === 201) {
        const creadoQA = await resp.json();
        if (!creadoQA?.id) throw new Error('Creaci?n sin ID para limpieza');
        lim.vigilarProducto(creadoQA.id);
      }
      // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
      if (resp) expect(resp.status(), `precio «${precio}»`).toBe(422);
      expect(await productoPorNombre(request, nombre), `precio «${precio}»`).toHaveLength(0);
    }
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
