import axios from 'axios'
import { toast } from 'sonner'

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace('/api/lms', '/api/admin') || 'https://sho-lms-production-server.onrender.com/api/admin',
  timeout: 30000,
})

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
      return Promise.reject(err)
    }
    const message = err.response?.data?.message || 'Something went wrong'
    if (err.response?.status !== 404) toast.error(message)
    return Promise.reject(err)
  }
)

export default adminApi
