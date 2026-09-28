const usuarioService = require('./usuario.service')
const { success, error } = require('../../utils/response')

async function listUsuarios(req, res, next) {
  try {
    const result = await usuarioService.listUsuarios(req.query)
    return success(res, result.usuarios, 'Usuarios obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getUsuarioById(req, res, next) {
  try {
    const { id } = req.params
    const usuario = await usuarioService.getUsuarioById(id)
    return success(res, usuario, 'Usuario obtenido')
  } catch (err) {
    next(err)
  }
}

async function createUsuario(req, res, next) {
  try {
    const usuario = await usuarioService.createUsuario(req.body)
    return success(res, usuario, 'Usuario creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateUsuario(req, res, next) {
  try {
    const { id } = req.params
    const usuario = await usuarioService.updateUsuario(id, req.body, req.user)
    return success(res, usuario, 'Usuario actualizado')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { id } = req.params
    const { activo } = req.body
    const usuario = await usuarioService.changeEstado(id, activo, req.user)
    return success(res, usuario, activo ? 'Usuario activado' : 'Usuario desactivado')
  } catch (err) {
    next(err)
  }
}

async function changeRol(req, res, next) {
  try {
    const { id } = req.params
    const { rol } = req.body
    const usuario = await usuarioService.changeRol(id, rol, req.user)
    return success(res, usuario, 'Rol actualizado')
  } catch (err) {
    next(err)
  }
}

async function changePassword(req, res, next) {
  try {
    await usuarioService.changePassword(req.user.sub, req.body)
    return success(res, null, 'Contraseña actualizada')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  changeEstado,
  changeRol,
  changePassword,
}