import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/lms',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if this is the login request itself
      if (!err.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('lms_token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
    const message = err.response?.data?.message || 'Something went wrong'
    if (err.response?.status !== 404) {
      toast.error(message)
    }
    return Promise.reject(err)
  }
)

export default api
