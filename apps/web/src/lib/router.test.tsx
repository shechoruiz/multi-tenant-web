import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppRouter } from "./router";
import { useAuthStore } from "../stores/auth";
import { Role } from "@shelf/shared";

// Mock fetch to avoid real network calls in tests
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      // Simula que no hay sesión: la API devuelve 401 a rutas protegidas
      // y 404/[] a rutas públicas que no importan para la aserción.
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

/** Simula una sesión de staff autenticada en el store de auth. */
function authenticateAsStaff() {
  useAuthStore.setState({
    user: {
      id: "user-1",
      name: "Staff Test",
      email: "staff@test.com",
      role: Role.staff,
      tenantId: "tenant-1",
      tenantSlug: "tienda-demo",
      isActive: true,
    },
    isAuthenticated: true,
    isLoading: false,
  });
}

function unauthenticate() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

async function renderAt(path: string) {
  window.history.pushState({}, "", path);
  render(<AppRouter />);
  // TenantLayout muestra "Cargando..." hasta que auth/tenant/theme resuelven
  await waitFor(() => {
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });
}

describe("AppRouter — rutas de productos", () => {
  it("renderiza la página pública de productos en /:tenantSlug/products", async () => {
    unauthenticate();
    await renderAt("/tienda-demo/products");

    // Texto único de la página pública de productos
    expect(
      await screen.findByText("Todos los productos disponibles en la tienda."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio mínimo")).toBeInTheDocument();

    // NO debe renderizar la página de administración
    expect(
      screen.queryByText("Catálogo de la tienda: stock, precios y estado de cada producto"),
    ).not.toBeInTheDocument();
  });

  it("renderiza la página de administración en /:tenantSlug/admin/products con sesión", async () => {
    authenticateAsStaff();
    await renderAt("/tienda-demo/admin/products");

    // Texto único de la página de administración de productos
    expect(
      await screen.findByText(
        "Catálogo de la tienda: stock, precios y estado de cada producto",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar productos")).toBeInTheDocument();

    // NO debe renderizar la página pública
    expect(
      screen.queryByText("Todos los productos disponibles en la tienda."),
    ).not.toBeInTheDocument();
  });

  it("redirige a login en /:tenantSlug/admin/products sin sesión", async () => {
    unauthenticate();

    // La aserción clave: sin sesión, admin/products NO debe servir la página pública.
    // AdminLayout redirige a /login, así que la página pública no debe aparecer.
    await renderAt("/tienda-demo/admin/products");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/tienda-demo/login");
    });

    expect(screen.queryByText("Todos los productos disponibles en la tienda.")).not.toBeInTheDocument();
  });
});
