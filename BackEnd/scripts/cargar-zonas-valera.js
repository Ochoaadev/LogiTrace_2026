// Zonas de despacho y tipos de sector de Valera (centro de referencia y radio de cobertura), según
// la delimitación territorial de la tesis. Las zonas anteriores (ZON-001…008) quedan inactivas: el
// historial las conserva, pero ya no se ofrecen en pedidos nuevos.
//
//   node scripts/cargar-zonas-valera.js             → muestra lo que haría (no cambia nada)
//   node scripts/cargar-zonas-valera.js --aplicar   → crea/actualiza y reasigna los pedidos
//
// Reasignación: los pedidos con ubicación en el mapa reciben la zona y el sector que les corresponden
// por distancia; los que no la tienen (datos demo), según la equivalencia de su zona anterior.
// Coordenadas tomadas de OpenStreetMap (Plaza Bolívar, Mercado Municipal, Hospital Central
// Dr. Pedro Emilio Carrillo, Escuela de Medicina ULA, Av. Zona Industrial); ajustables en Catálogos.
const { PrismaClient } = require('@prisma/client')
const { areaSugerida } = require('../src/utils/areas')

const prisma = new PrismaClient()
const APLICAR = process.argv.includes('--aplicar')

// Eje Plaza Bolívar – Mercado Municipal
const CENTRO = { latitudCentro: 9.3175, longitudCentro: -70.6062 }

const ZONAS = [
  {
    codigo: 'ZON-009', nombre: 'Despacho Centro', municipio: 'Valera', ...CENTRO, radioMetros: 900,
  },
  {
    // Punto intermedio de Las Acacias, El Milagro y San Antonio; su radio abarca la ciudad y el
    // Centro se impone dentro del suyo, más pequeño
    codigo: 'ZON-010', nombre: 'Despacho Periferia', municipio: 'Valera', latitudCentro: 9.309, longitudCentro: -70.615, radioMetros: 4000,
  },
  {
    // Referencia logística hacia Mendoza y La Puerta; cubre todo lo que quede fuera de la ciudad
    codigo: 'ZON-011', nombre: 'Despacho Rural', municipio: 'Valera', latitudCentro: 9.2215, longitudCentro: -70.6586, radioMetros: 30000,
  },
]

const SECTORES = [
  {
    codigo: 'SEC-01', nombre: 'Centro comercial', ...CENTRO, radioMetros: 600,
    descripcion: 'Plaza Bolívar, Plaza Sucre, avenida Bolívar y entorno inmediato; bancos, mercado y centros comerciales. Núcleo principal de comercio y servicios.',
  },
  {
    codigo: 'SEC-02', nombre: 'Residencial', latitudCentro: 9.305, longitudCentro: -70.612, radioMetros: 5000,
    descripcion: 'Las Acacias, San José, El Milagro, San Antonio, La Floresta, Las Lomas, Cienfuegos y otros sectores de vivienda unifamiliar y multifamiliar.',
  },
  {
    codigo: 'SEC-03', nombre: 'Residencial-comercial (mixta)', ...CENTRO, radioMetros: 950,
    descripcion: 'Bordes del centro (calles 1–8, avenidas 4–12): viviendas con locales comerciales en planta baja. Transición entre el núcleo comercial y lo residencial.',
  },
  {
    codigo: 'SEC-04', nombre: 'Industrial', latitudCentro: 9.341, longitudCentro: -70.5995, radioMetros: 1500,
    descripcion: 'Sector industrial del norte, sobre la Av. Zona Industrial: galpones, depósitos y talleres.',
  },
  {
    codigo: 'SEC-05', nombre: 'Equipamiento (ULA / Hospital)', latitudCentro: 9.3181, longitudCentro: -70.611, radioMetros: 450,
    descripcion: 'Hospital Central Dr. Pedro Emilio Carrillo, Escuela de Medicina ULA, ambulatorios, escuelas y terminal: equipamientos sanitarios, educativos e institucionales.',
  },
]

// Zona anterior → [zona nueva, sector] para pedidos sin ubicación en el mapa
const EQUIVALENCIA = {
  'ZON-001': ['ZON-009', 'SEC-01'],
  'ZON-002': ['ZON-010', 'SEC-02'],
  'ZON-003': ['ZON-010', 'SEC-02'],
  'ZON-004': ['ZON-010', 'SEC-02'],
  'ZON-005': ['ZON-010', 'SEC-02'],
  'ZON-006': ['ZON-010', 'SEC-02'],
  'ZON-007': ['ZON-011', null],
  'ZON-008': ['ZON-011', null],
}
const ANTERIORES = Object.keys(EQUIVALENCIA)

async function main() {
  console.log(APLICAR ? 'Aplicando cambios…' : 'Vista previa (use --aplicar para guardar):')
  for (const z of ZONAS) console.log(`  Zona ${z.codigo} ${z.nombre}: ${z.latitudCentro}, ${z.longitudCentro} · radio ${z.radioMetros} m`)
  for (const s of SECTORES) console.log(`  Sector ${s.codigo} ${s.nombre}: ${s.latitudCentro}, ${s.longitudCentro} · radio ${s.radioMetros} m`)
  console.log(`  Zonas que pasan a inactivas: ${ANTERIORES.join(', ')}`)

  const pedidos = await prisma.pedido.findMany({
    where: { OR: [{ zonaId: null }, { zona: { codigo: { in: ANTERIORES } } }] },
    select: { id: true, latitudEntrega: true, longitudEntrega: true, zona: { select: { codigo: true } } },
  })
  const plan = pedidos.map((p) => {
    if (p.latitudEntrega != null) {
      const punto = { lat: Number(p.latitudEntrega), lng: Number(p.longitudEntrega) }
      return { id: p.id, porMapa: true, zona: areaSugerida(ZONAS, punto)?.zona.codigo || null, sector: areaSugerida(SECTORES, punto)?.zona.codigo || null }
    }
    const [zona, sector] = EQUIVALENCIA[p.zona?.codigo] || [null, null]
    return { id: p.id, porMapa: false, zona, sector }
  })
  const resumen = {}
  for (const x of plan) {
    const k = `${x.porMapa ? 'por mapa' : 'por equivalencia'} → ${x.zona || 'sin zona'} / ${x.sector || 'sin sector'}`
    resumen[k] = (resumen[k] || 0) + 1
  }
  console.log('  Reasignación de pedidos:')
  for (const [k, n] of Object.entries(resumen)) console.log(`    ${n} ${k}`)

  if (!APLICAR) return

  await prisma.$transaction(async (tx) => {
    const ids = {}
    for (const z of ZONAS) ids[z.codigo] = (await tx.zonaDespacho.upsert({ where: { codigo: z.codigo }, update: { ...z, activo: true }, create: z })).id
    for (const s of SECTORES) ids[s.codigo] = (await tx.tipoSector.upsert({ where: { codigo: s.codigo }, update: { ...s, activo: true }, create: s })).id
    await tx.zonaDespacho.updateMany({ where: { codigo: { in: ANTERIORES } }, data: { activo: false } })
    // Las rutas de una zona anterior pasan a su equivalente
    for (const [anterior, [nueva]] of Object.entries(EQUIVALENCIA)) {
      await tx.ruta.updateMany({ where: { zona: { codigo: anterior } }, data: { zonaId: ids[nueva] } })
    }
    // Agrupado por destino para no actualizar pedido por pedido
    const grupos = {}
    for (const x of plan) {
      if (!x.zona && !x.sector) continue
      const k = `${x.zona}|${x.sector}`
      ;(grupos[k] ||= []).push(x.id)
    }
    for (const [k, lista] of Object.entries(grupos)) {
      const [zona, sector] = k.split('|')
      await tx.pedido.updateMany({
        where: { id: { in: lista } },
        data: { ...(zona !== 'null' && { zonaId: ids[zona] }), ...(sector !== 'null' && { tipoSectorId: ids[sector] }) },
      })
    }
  })
  console.log('Listo.')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
