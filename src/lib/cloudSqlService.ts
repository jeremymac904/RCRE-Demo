/**
 * Cloud SQL & Firestore Bridge Service Layer
 * Region: us-west2
 * Purpose: Relational data storage and complex transaction reporting for RCRE Group.
 */

export interface CloudSqlTransactionReport {
  id: string
  propertyAddress: string
  agentName: string
  market: string
  salePrice: number
  commissionRate: number
  brokerSplit: number
  agentSplit: number
  closingDate: string
  status: 'Closed' | 'Under Contract' | 'Inspection'
}

export interface DiscrepancyReport {
  id: string
  transactionId: string
  propertyAddress: string
  discrepancyType: 'Status Mismatch' | 'Financial Split Discrepancy' | 'Missing Firestore Document'
  cloudSqlValue: string
  firestoreValue: string
  detectedAt: string
  resolved: boolean
}

export const MOCK_CLOUD_SQL_REPORTS: CloudSqlTransactionReport[] = [
  {
    id: 'rep-1',
    propertyAddress: '4821 Colonial Ave, Jacksonville, FL',
    agentName: 'Taquilla Allen',
    market: 'Jacksonville',
    salePrice: 485000,
    commissionRate: 0.03,
    brokerSplit: 4365,
    agentSplit: 10185,
    closingDate: '2026-11-12',
    status: 'Inspection'
  },
  {
    id: 'rep-2',
    propertyAddress: '1204 Magnolia St, Birmingham, AL',
    agentName: 'Julio Arango',
    market: 'Birmingham',
    salePrice: 395000,
    commissionRate: 0.03,
    brokerSplit: 3555,
    agentSplit: 8295,
    closingDate: '2026-11-24',
    status: 'Under Contract'
  },
  {
    id: 'rep-3',
    propertyAddress: '8703 Shore Dr, Ponte Vedra, FL',
    agentName: 'Marcus Webb',
    market: 'Ponte Vedra',
    salePrice: 725000,
    commissionRate: 0.025,
    brokerSplit: 5437.50,
    agentSplit: 12687.50,
    closingDate: '2026-10-15',
    status: 'Closed'
  }
]

export const MOCK_DISCREPANCIES: DiscrepancyReport[] = [
  {
    id: 'disc-1',
    transactionId: 'rep-1',
    propertyAddress: '4821 Colonial Ave, Jacksonville, FL',
    discrepancyType: 'Status Mismatch',
    cloudSqlValue: 'Inspection',
    firestoreValue: 'Under Contract',
    detectedAt: '2026-10-22 08:00 AM',
    resolved: false
  },
  {
    id: 'disc-2',
    transactionId: 'rep-2',
    propertyAddress: '1204 Magnolia St, Birmingham, AL',
    discrepancyType: 'Financial Split Discrepancy',
    cloudSqlValue: '$3,555.00',
    firestoreValue: '$3,400.00',
    detectedAt: '2026-10-22 08:00 AM',
    resolved: true
  }
]

export async function fetchCloudSqlTransactionReports(): Promise<CloudSqlTransactionReport[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_CLOUD_SQL_REPORTS), 300)
  })
}

export async function syncFirestoreToCloudSql(firestoreData: any): Promise<{ success: boolean; rowsSynced: number }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, rowsSynced: 14 }), 500)
  })
}

export async function runDailyValidationAudit(): Promise<{ success: boolean; discrepancies: DiscrepancyReport[] }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, discrepancies: MOCK_DISCREPANCIES })
    }, 800)
  })
}
