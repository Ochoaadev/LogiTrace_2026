// Módulo 10 (Administración): indicadores de la cabecera y parámetros de planta (solo lectura;
// se configuran en el .env del servidor, ver src/config/parametros.js).
const express = require('express')
const router = express.Router()

const prisma = require('../../config/database')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const { success } = require('../../utils/response')
const { PARAMETROS } = require('../../config/parametros')
const { jwtExpiresIn } = require('../../config/env')
const { getResumenAuditoria } = require('../auditoria/auditoria.service')

router.use(authMiddleware, roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'))

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR']

router.get('/resumen', async (req, res, next) => {
  try {
    const [porRol, enRuta, cava, catalogos, auditoria] = await Promise.all([
      prisma.usuario.groupBy({ by: ['rol', 'activo'], _count: { _all: true } }),
      prisma.despacho.findMany({
        where: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } },
        select: { vehiculo: { select: { tipo: true } } },
      }),
      prisma.registroTemperatura.findFirst({
        where: { tipoRegistro: 'CAVA' },
        orderBy: { fechaHora: 'desc' },
        select: { temperaturaC: true, fechaHora: true, ubicacion: { select: { codigo: true, nombre: true } } },
      }),
      Promise.all([
        ['tiposIncidencia', 'Causas de incidencias en ruta', prisma.tipoIncidencia],
        ['motivosDevolucion', 'Causas de retorno / devolución', prisma.motivoDevolucion],
        ['tiposResiduo', 'Tipos de residuos ambientales', prisma.tipoResiduo],
        ['zonas', 'Zonas de despacho', prisma.zonaDespacho],
      ].map(async ([clave, nombre, modelo]) => ({ clave, nombre, total: await modelo.count(), activos: await modelo.count({ where: { activo: true } }) }))),
      getResumenAuditoria(),
    ])

    const cuentas = ROLES.map((rol) => ({
      rol,
      total: porRol.filter((g) => g.rol === rol).reduce((s, g) => s + g._count._all, 0),
      activos: porRol.find((g) => g.rol === rol && g.activo)?._count._all || 0,
    }))
    const vehiculos = {}
    enRuta.forEach((d) => { const t = d.vehiculo?.tipo || 'SIN_VEHICULO'; vehiculos[t] = (vehiculos[t] || 0) + 1 })

    return success(res, {
      cuentas: {
        total: cuentas.reduce((s, c) => s + c.total, 0),
        activas: cuentas.reduce((s, c) => s + c.activos, 0),
        porRol: cuentas,
      },
      enRuta: { despachos: enRuta.length, vehiculos },
      cava: cava && {
        temperaturaC: Number(cava.temperaturaC),
        fechaHora: cava.fechaHora,
        ubicacion: cava.ubicacion,
        objetivoC: PARAMETROS.temperaturaObjetivoCavaC,
        limiteC: PARAMETROS.limiteCriticoC,
      },
      catalogos,
      auditoria,
    }, 'Resumen de administración obtenido')
  } catch (err) {
    next(err)
  }
})

router.get('/parametros', async (req, res, next) => {
  try {
    const [{ version }] = await prisma.$queryRawUnsafe('SELECT version()')
    return success(res, {
      ...PARAMETROS,
      baseDatos: version.split(',')[0],
      expiracionSesion: jwtExpiresIn,
    }, 'Parámetros de planta obtenidos')
  } catch (err) {
    next(err)
  }
})

module.exports = router
