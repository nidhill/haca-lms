import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, Award, Loader2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import api from '../services/api'
import { formatDate } from '../lib/utils'
import type { CertificateVerification } from '../types'

export default function VerifyCertificate() {
  const { certId } = useParams()
  const [data, setData] = useState<CertificateVerification | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/certificates/verify/${certId}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ isValid: false, studentName: '', courseTitle: '', issuedAt: '', certificateId: certId! }))
      .finally(() => setLoading(false))
  }, [certId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">H</div>
          <h1 className="text-xl font-bold">HACA LMS</h1>
          <p className="text-sm text-muted-foreground">Certificate Verification</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying certificate…</p>
              </div>
            ) : data?.isValid ? (
              <div className="space-y-6 text-center">
                <div className="h-2 -mx-8 -mt-8 rounded-t-lg bg-gradient-to-r from-yellow-400 to-amber-500 mb-8" />
                <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
                <div>
                  <Badge variant="success" className="mb-3">Valid Certificate</Badge>
                  <h2 className="text-xl font-bold">{data.studentName}</h2>
                  <p className="text-muted-foreground text-sm mt-1">has successfully completed</p>
                  <h3 className="text-lg font-semibold mt-2 text-primary">{data.courseTitle}</h3>
                </div>
                <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
                  <p>Issued on {formatDate(data.issuedAt)}</p>
                  <p className="font-mono">Certificate ID: {data.certificateId}</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  Issued by HACA — Harisandco Academy
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <XCircle className="mx-auto h-14 w-14 text-red-500" />
                <h2 className="font-semibold text-lg">Certificate Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  This certificate ID is invalid or does not exist in our records.
                </p>
                <p className="text-xs font-mono text-muted-foreground">{certId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
