import { test, expect } from '@playwright/test';
import {
  Limpieza, abrirAltaProducto, guardarProducto, iniciarSesion, llenarProducto, nombreQa, productoPorNombre,
} from '../support/admin';

// HU-25 · RF25-EP-02: Registro con campos obligatorios vacíos
// Caso de Jira: RF25-TC-02. Criterios: CA-25.2.
test.describe('RF25-EP-02 · Registro con campos obligatorios vacíos', () => {

  test('RF25-TC-02 · Registro con campos obligatorios vacíos', async ({ page, request, context }) => {
    // Preparación: crear datos QA identificables para aislar este escenario de otros registros.
    const lim = new Limpieza(request);
    try {
    const cat1 = await lim.categoria(nombreQa('Herramientas QA 001'));
    // Acceso: iniciar la sesión con el rol requerido para comprobar los permisos y la interfaz.
    await iniciarSesion(page);
    // Navegación: abrir la pantalla funcional que se evaluará en este caso.
    await abrirAltaProducto(page);
    // Ejecución: realizar la operación o introducir los datos que activan el escenario.
    await llenarProducto(page, { name: '', price: '12.50', categoryId: cat1.id }, true);
    const resp = await guardarProducto(page);
    // Verificación: contrastar el resultado observado con el criterio de aceptación del caso.
    await expect(page.getByText('Name is required')).toBeVisible();
    expect(resp).toBeNull();
    expect((await productoPorNombre(request, '')).filter(p => p.category_id === cat1.id)).toHaveLength(0);
    // Limpieza segura: eliminar únicamente los registros QA identificados durante esta prueba.
    } finally {
      await lim.todo();
    }
  });

});
