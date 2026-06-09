# Buenos Aires Barbershop

Rediseño one-page luxury de [buenosairesbarbershop.com](https://buenosairesbarbershop.com).

**Concepto:** *"El último ritual masculino"* — barbería clásica de Buenos Aires presentada con estética editorial oscura, detalles dorados y animaciones cinematográficas al scroll.

## Stack

- HTML + CSS + JavaScript vanilla
- [three.js](https://threejs.org/) r160 — escenas WebGL en hero y pullquote
- [GSAP](https://gsap.com/) + ScrollTrigger — reveals, parallax, contadores
- Tipografía: Cormorant Garamond + Inter (Google Fonts)

Sin paso de build. Listo para servir como estático.

## Estructura

```
index.html      One page con todas las secciones
styles.css      Sistema de diseño luxury dark
script.js       three.js + GSAP + interacciones
server.js       Mini-server local (Node) para desarrollo
```

## Desarrollo local

```bash
node server.js
# luego abrir http://localhost:5173
```

## Secciones

1. Hero con partículas WebGL doradas
2. La Barbería — historia y servicios
3. Stats animados
4. Equipo — 7 barberos
5. Colecciones — Summer / Spring / Winter / Autumn / Clientes
6. Pullquote con malla de olas WebGL
7. Prensa — carrusel infinito
8. Reseñas Google
9. Amigos de la casa
10. Contacto + mapa
11. Footer

## Paleta

| Token   | Hex       | Uso                  |
|---------|-----------|----------------------|
| bg      | `#0a0908` | Fondo principal      |
| bg-2    | `#111110` | Fondo secundario     |
| ink     | `#f4ede4` | Texto principal      |
| ink-dim | `#a89e91` | Texto secundario     |
| gold    | `#c9a96a` | Acento luxury        |

## Licencia

Proyecto personal — todos los assets de imagen pertenecen a buenosairesbarbershop.com.
