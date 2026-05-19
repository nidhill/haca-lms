import { useEffect, useState } from 'react'
import { Award, Download, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { formatDate } from '../lib/utils'
import api from '../services/api'
import type { Certificate } from '../types'

export default function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/certificates')
      .then((r) => setCerts(r.data.certificates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-muted-foreground">Awarded on 100% course completion</p>
      </div>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Award className="h-14 w-14 text-muted-foreground/40" />
            <p className="font-medium">No certificates yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Complete 100% of a course to earn your certificate. Keep going!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((cert) => (
            <Card key={cert._id} className="overflow-hidden">
              {/* Gold gradient header */}
              <div className="h-2 bg-gradient-to-r from-yellow-400 to-amber-500" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-5 w-5 text-amber-500" />
                      <Badge variant="success" className="text-xs">Certified</Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{cert.courseTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {formatDate(cert.issuedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      ID: {cert.certificateId}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-2">
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                  </a>
                  <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Verify
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
