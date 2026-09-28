const authService = require('./auth.service')
const { success, error } = require('../../utils/response')

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login exitoso')
  } catch (err) {
    next(err)
  }
}

async function register(req, res, next) {
  try {
    const { nombre, email, password, rol, documento, telefono } = req.body
    const result = await authService.register({ nombre, email, password, rol, documento, telefono })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Usuario registrado exitosamente', 201)
  } catch (err) {
    next(err)
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken
    const result = await authService.refresh(refreshToken)

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Token renovado')
  } catch (err) {
    next(err)
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken
    await authService.logout(refreshToken)

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return success(res, null, 'Logout exitoso')
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.sub)
    return success(res, user, 'Perfil obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  me,
}